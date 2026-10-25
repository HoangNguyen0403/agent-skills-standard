import fs from 'fs-extra';
import path from 'path';
import { RuntimeStore } from './RuntimeStore';
import {
  FleetAccount,
  FleetConfig,
  FleetProject,
  HarnessError,
  ProjectAuthority,
  ProjectAuthoritySchema,
  parseFleetConfig,
  policyDigest,
} from './RuntimeTypes';

const POLICY_RECORD_NAME = 'fleet-policy';

/**
 * Checks whether a path prefix matches a target path with strict segment boundary semantics.
 * E.g. "/a/b" matches "/a/b" and "/a/b/c", but NOT "/a/bc".
 */
export function matchesPathPrefix(targetPath: string, prefix: string): boolean {
  const normTarget = path.resolve(targetPath);
  const normPrefix = path.resolve(prefix);

  if (normTarget === normPrefix) {
    return true;
  }

  const prefixWithSep = normPrefix.endsWith(path.sep)
    ? normPrefix
    : `${normPrefix}${path.sep}`;

  return normTarget.startsWith(prefixWithSep);
}

/**
 * Derives the trusted logical project identity.
 * Default identity is host-scoped from authoritative inventory IDs; exact configured
 * aliases override it only through their declared group logical ID.
 */
export function resolveLogicalProjectId(
  project: FleetProject,
  config: FleetConfig,
): string {
  const alias = config.projectAliases.find(
    (a) => a.hostId === project.hostId && a.projectId === project.projectId,
  );
  if (alias) {
    return alias.logicalProjectId;
  }
  return `${project.hostId}:${project.projectId}`;
}

/**
 * Documented Darwin system root aliases resolve under /private without changing intent.
 */
function isDarwinSystemAlias(lexical: string, canonical: string): boolean {
  if (process.platform !== 'darwin') {
    return false;
  }
  const normalized = path.resolve(lexical);
  return ['/var', '/tmp', '/etc'].some(
    (root) =>
      (normalized === root || normalized.startsWith(`${root}${path.sep}`)) &&
      canonical === `/private${normalized}`,
  );
}

/**
 * Canonicalizes configured path prefixes through realpath.
 * Ambiguous symlinked prefixes are denied rather than widening a lexical domain;
 * unresolvable prefixes cannot authorize a canonical root.
 */
async function canonicalizePrefixes(prefixes: string[]): Promise<string[]> {
  const resolved: string[] = [];
  for (const prefix of prefixes) {
    let canonical: string;
    try {
      canonical = await fs.promises.realpath(prefix);
    } catch {
      continue;
    }
    if (
      canonical !== path.resolve(prefix) &&
      !isDarwinSystemAlias(prefix, canonical)
    ) {
      throw new HarnessError(
        'AMBIGUOUS_POLICY_PREFIX',
        `Configured policy prefix "${prefix}" is a symlink to "${canonical}"; configure canonical paths only`,
      );
    }
    resolved.push(canonical);
  }
  return resolved;
}

/**
 * Resolves stack IDs matching a canonical FleetProject based on central host/path prefix configuration.
 * Pure safe boundary matching with segment boundaries, no per-repo detection scripts.
 */
export function resolveStackIds(
  project: FleetProject,
  config: FleetConfig,
): string[] {
  if (!config.stacks || config.stacks.length === 0) {
    return [];
  }

  const matchingStackIds: string[] = [];

  for (const stack of config.stacks) {
    const hostMatches =
      stack.hostIds.includes(project.hostId) || stack.hostIds.includes('*');

    if (!hostMatches) {
      continue;
    }

    for (const prefix of stack.pathPrefixes) {
      if (matchesPathPrefix(project.rootPath, prefix)) {
        matchingStackIds.push(stack.id);
        break;
      }
    }
  }

  return Array.from(new Set(matchingStackIds));
}

/**
 * Resolves canonical root and stack membership on the executing host.
 * Callers must not use this helper for another host's paths.
 */
export async function resolveProjectAuthority(
  project: FleetProject,
  config: FleetConfig,
): Promise<ProjectAuthority> {
  if (!project.rootPath || !path.isAbsolute(project.rootPath)) {
    throw new HarnessError(
      'INVALID_PROJECT',
      `Project rootPath must be an absolute path: "${project.rootPath}"`,
    );
  }

  let canonicalRootPath: string;
  try {
    canonicalRootPath = await fs.promises.realpath(project.rootPath);
  } catch {
    throw new HarnessError(
      'PROJECT_ROOT_NOT_FOUND',
      `Project rootPath does not exist: "${project.rootPath}"`,
    );
  }
  const rootStat = await fs.promises.lstat(canonicalRootPath);
  if (!rootStat.isDirectory()) {
    throw new HarnessError(
      'PROJECT_ROOT_NOT_FOUND',
      `Project rootPath must resolve to a directory: "${project.rootPath}"`,
    );
  }

  const hostStacks = (config.stacks ?? []).filter(
    (stack) =>
      stack.hostIds.includes(project.hostId) || stack.hostIds.includes('*'),
  );
  const canonicalStacks = await Promise.all(
    hostStacks.map(async (stack) => ({
      ...stack,
      pathPrefixes: await canonicalizePrefixes(stack.pathPrefixes),
    })),
  );
  const stackIds = resolveStackIds(
    { ...project, rootPath: canonicalRootPath },
    { ...config, stacks: canonicalStacks },
  ).sort();

  return ProjectAuthoritySchema.parse({ canonicalRootPath, stackIds });
}

export class FleetPolicyService {
  constructor(private readonly store: RuntimeStore) {}

  /**
   * Configures global fleet policy in the user state store.
   * Atomic check-and-write inside transaction; generation must strictly increase.
   */
  async configure(config: FleetConfig): Promise<void> {
    const validated = parseFleetConfig(config);

    await this.store.transaction<FleetConfig | null>(
      POLICY_RECORD_NAME,
      null,
      (existing) => {
        if (existing !== null) {
          if (validated.generation <= existing.generation) {
            throw new HarnessError(
              'STALE_GENERATION',
              `New policy generation (${validated.generation}) must be strictly greater than current generation (${existing.generation})`,
            );
          }
        }
        return validated;
      },
    );
  }

  /**
   * Loads the current fleet policy configuration.
   */
  async load(): Promise<FleetConfig> {
    const raw = await this.store.read<FleetConfig | null>(
      POLICY_RECORD_NAME,
      null,
    );

    if (!raw) {
      throw new HarnessError(
        'CONFIG_NOT_FOUND',
        'Fleet policy configuration not found in store',
      );
    }

    return parseFleetConfig(raw);
  }

  /**
   * Resolves execution authorization for a discovered project.
   * Authorizes canonical realpath roots only: domain -> most-specific rule -> account,
   * then validates trusted logical identity and alias authority.
   */
  async resolve(project: FleetProject): Promise<{
    domain: string;
    account: FleetAccount;
    config: FleetConfig;
    policyDigest: string;
  }> {
    const config = await this.load();

    if (!project || typeof project !== 'object') {
      throw new HarnessError(
        'INVALID_PROJECT',
        'Project parameter must be an object',
      );
    }

    if (!project.rootPath || !path.isAbsolute(project.rootPath)) {
      throw new HarnessError(
        'INVALID_PROJECT',
        `Project rootPath must be an absolute path: "${project.rootPath}"`,
      );
    }

    // Always resolve the whole existing root: ancestor symlinks must not retain lexical authority.
    let realRoot: string;
    try {
      realRoot = await fs.promises.realpath(project.rootPath);
    } catch {
      throw new HarnessError(
        'PROJECT_ROOT_NOT_FOUND',
        `Project rootPath does not exist: "${project.rootPath}"`,
      );
    }

    const rootStat = await fs.promises.lstat(realRoot);
    if (!rootStat.isDirectory()) {
      throw new HarnessError(
        'PROJECT_ROOT_NOT_FOUND',
        `Project rootPath must resolve to a directory: "${project.rootPath}"`,
      );
    }

    // 1. Resolve independent domain exclusively on the canonical root
    const matchingDomains: Array<{
      domainId: string;
      maxPrefixLength: number;
    }> = [];

    for (const domain of config.domains) {
      const hostMatches =
        domain.hostIds.includes(project.hostId) || domain.hostIds.includes('*');

      if (!hostMatches) {
        continue;
      }

      const prefixes = await canonicalizePrefixes(domain.pathPrefixes);
      let longestPrefixLen = -1;
      for (const prefix of prefixes) {
        if (matchesPathPrefix(realRoot, prefix)) {
          if (prefix.length > longestPrefixLen) {
            longestPrefixLen = prefix.length;
          }
        }
      }

      if (longestPrefixLen >= 0) {
        matchingDomains.push({
          domainId: domain.id,
          maxPrefixLength: longestPrefixLen,
        });
      }
    }

    if (matchingDomains.length === 0) {
      throw new HarnessError(
        'DOMAIN_NOT_FOUND',
        `No domain configured for project "${project.projectId}" on host "${project.hostId}" at canonical root "${realRoot}"`,
      );
    }

    matchingDomains.sort((a, b) => b.maxPrefixLength - a.maxPrefixLength);
    const bestPrefixLength = matchingDomains[0].maxPrefixLength;
    const topDomains = matchingDomains.filter(
      (m) => m.maxPrefixLength === bestPrefixLength,
    );

    const uniqueDomainIds = Array.from(
      new Set(topDomains.map((d) => d.domainId)),
    );
    if (uniqueDomainIds.length > 1) {
      throw new HarnessError(
        'AMBIGUOUS_DOMAIN',
        `Conflicting domain mappings tied for project root "${realRoot}": ${uniqueDomainIds.join(', ')}`,
      );
    }

    const resolvedDomain = uniqueDomainIds[0];

    // 2. Match rules on the canonical root; most-specific precedence precedes disabled checks
    const candidateRules: Array<{
      rule: FleetConfig['rules'][number];
      maxPrefixLength: number;
    }> = [];

    for (const rule of config.rules) {
      if (rule.domain !== resolvedDomain) {
        continue;
      }

      const hostMatches =
        rule.hostIds.includes(project.hostId) || rule.hostIds.includes('*');

      if (!hostMatches) {
        continue;
      }

      const prefixes = await canonicalizePrefixes(rule.pathPrefixes);
      let longestPrefixLen = -1;
      for (const prefix of prefixes) {
        if (matchesPathPrefix(realRoot, prefix)) {
          if (prefix.length > longestPrefixLen) {
            longestPrefixLen = prefix.length;
          }
        }
      }

      if (longestPrefixLen >= 0) {
        candidateRules.push({
          rule,
          maxPrefixLength: longestPrefixLen,
        });
      }
    }

    if (candidateRules.length === 0) {
      throw new HarnessError(
        'RULE_NOT_FOUND',
        `No rule matches domain "${resolvedDomain}" for project at "${realRoot}"`,
      );
    }

    candidateRules.sort((a, b) => b.maxPrefixLength - a.maxPrefixLength);
    const bestRulePrefixLen = candidateRules[0].maxPrefixLength;
    const topRules = candidateRules.filter(
      (r) => r.maxPrefixLength === bestRulePrefixLen,
    );

    // Reject if any most-specific matching rule is disabled (fail-closed)
    const disabledRule = topRules.find((r) => !r.rule.enabled);
    if (disabledRule) {
      throw new HarnessError(
        'RULE_DISABLED',
        `Most specific rule "${disabledRule.rule.id}" is disabled for project at "${realRoot}"`,
      );
    }

    // Reject conflicting authorization values on a specificity tie
    const allowSet = new Set(topRules.map((r) => r.rule.allowModelData));
    if (allowSet.size > 1) {
      throw new HarnessError(
        'AMBIGUOUS_RULE',
        `Conflicting rules tied for project at "${realRoot}" with differing allowModelData`,
      );
    }

    const uniqueAccountIds = Array.from(
      new Set(topRules.map((r) => r.rule.accountId)),
    );
    if (uniqueAccountIds.length > 1) {
      throw new HarnessError(
        'AMBIGUOUS_RULE',
        `Conflicting rules tied for project root "${realRoot}": multiple accounts configured (${uniqueAccountIds.join(', ')})`,
      );
    }

    const selectedRule = topRules[0].rule;

    if (!selectedRule.allowModelData) {
      throw new HarnessError(
        'MODEL_DATA_DENIED',
        `Rule "${selectedRule.id}" does not authorize model data transmission (allowModelData is false)`,
      );
    }

    // 3. Resolve account and verify independent domain eligibility + endpoint authority
    const account = config.accounts.find(
      (a) => a.id === selectedRule.accountId,
    );
    if (!account) {
      throw new HarnessError(
        'ACCOUNT_NOT_FOUND',
        `Account "${selectedRule.accountId}" referenced by rule "${selectedRule.id}" not found in policy`,
      );
    }

    const domainEligible =
      account.allowedDomains.includes(resolvedDomain) ||
      account.allowedDomains.includes('*');

    if (!domainEligible) {
      throw new HarnessError(
        'ACCOUNT_DOMAIN_INELIGIBLE',
        `Account "${account.id}" is not authorized for domain "${resolvedDomain}". Allowed domains: [${account.allowedDomains.join(', ')}]`,
      );
    }

    if (account.allowedProviderEndpoints.length === 0) {
      throw new HarnessError(
        'ACCOUNT_ENDPOINT_INELIGIBLE',
        `Account "${account.id}" has no authorized provider endpoints configured`,
      );
    }

    // 4. Validate trusted logical identity; caller-chosen values are never authority
    const canonicalLogicalId = resolveLogicalProjectId(project, config);
    if (project.logicalProjectId !== canonicalLogicalId) {
      throw new HarnessError(
        'PROJECT_ALIAS_MISMATCH',
        `Project "${project.projectId}" declares logicalProjectId "${project.logicalProjectId}", but trusted identity is "${canonicalLogicalId}"`,
      );
    }

    const matchingAlias = config.projectAliases.find(
      (a) => a.hostId === project.hostId && a.projectId === project.projectId,
    );

    if (matchingAlias) {
      if (matchingAlias.domain !== resolvedDomain) {
        throw new HarnessError(
          'CROSS_DOMAIN_ALIAS_CONFLICT',
          `Configured alias domain "${matchingAlias.domain}" does not match resolved domain "${resolvedDomain}"`,
        );
      }
      if (matchingAlias.accountId !== account.id) {
        throw new HarnessError(
          'ALIAS_AUTHORITY_MISMATCH',
          `Configured alias account "${matchingAlias.accountId}" does not match resolved rule account "${account.id}"`,
        );
      }
    }

    return {
      domain: resolvedDomain,
      account,
      config,
      policyDigest: policyDigest(config),
    };
  }
}
