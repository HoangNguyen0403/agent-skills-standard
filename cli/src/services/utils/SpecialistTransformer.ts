import * as yaml from 'js-yaml';
import { Agent, getAgentDefinition } from '../../constants';
import { escapeTomlString } from './tomlEscape';

interface SpecialistSource {
  name: string;
  content: string;
}

export interface PermissionProjection {
  /** Declared permission controls with a native equivalent in this export. */
  projected: string[];
  /**
   * Declared metadata and controls not projected into native fields, as
   * stable tokens. `risk_tier` is AGS classification metadata, not a host
   * permission; other tokens identify unprojected permission declarations or
   * tool names. Disclosure only — never an enforcement claim.
   */
  unprojected: string[];
}

interface TransformedSpecialist {
  name: string;
  content: string;
  projection: PermissionProjection;
}

// Anchored: a `---` line inside the body can no longer shift where the
// frontmatter block is believed to end.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

/**
 * Documented Copilot custom-agent tool aliases (primary alias ← accepted
 * names), from the "Tool aliases" table in GitHub's custom-agents
 * configuration reference. Names outside this table have no verified
 * Copilot meaning and are disclosed rather than copied through.
 */
const COPILOT_TOOL_ALIASES: Record<string, string> = {
  read: 'read',
  notebookread: 'read',
  edit: 'edit',
  multiedit: 'edit',
  write: 'edit',
  notebookedit: 'edit',
  execute: 'execute',
  shell: 'execute',
  bash: 'execute',
  powershell: 'execute',
  search: 'search',
  grep: 'search',
  glob: 'search',
  agent: 'agent',
  'custom-agent': 'agent',
  task: 'agent',
  web: 'web',
  websearch: 'web',
  webfetch: 'web',
  todo: 'todo',
  todowrite: 'todo',
};

/**
 * Serializes frontmatter fields via js-yaml so every value — including a
 * `description` sourced from skill content — is safely quoted/escaped.
 * Interpolating raw strings into a hand-built YAML template let a crafted
 * description inject its own top-level keys (e.g. a second `tools:`) into
 * the emitted agent file; js-yaml can't be tricked that way.
 */
function dumpFrontmatter(fields: Record<string, unknown>): string {
  return yaml.dump(fields, { lineWidth: -1 }).trimEnd();
}

/** Normalizes a declared tool list from either an array or a comma string. */
function toolNames(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
}

function declaredPermissions(
  metadata: Record<string, unknown>,
): { filesystem?: unknown; network?: unknown } | undefined {
  return metadata.permissions as
    { filesystem?: unknown; network?: unknown } | undefined;
}

/**
 * Declared controls this export cannot enforce, as stable tokens. Callers
 * suppress the fields they did project.
 */
function unprojectedControlTokens(
  metadata: Record<string, unknown>,
  projected: { allowedTools?: boolean; tools?: boolean } = {},
): string[] {
  const tokens: string[] = [];
  if (metadata.risk_tier) tokens.push('risk_tier');
  if (!projected.allowedTools && metadata['allowed-tools']) {
    tokens.push('allowed-tools');
  }
  if (!projected.tools && metadata.tools) tokens.push('tools');
  const permissions = declaredPermissions(metadata);
  if (permissions?.filesystem) tokens.push('permissions.filesystem');
  if (permissions?.network) tokens.push('permissions.network');
  return tokens;
}

/** Human-readable declaration summary used in disclosure comments. */
function permissionSummary(metadata: Record<string, unknown>): string[] {
  const parts: string[] = [];
  if (metadata.risk_tier) parts.push(`risk_tier: ${metadata.risk_tier}`);
  if (metadata['allowed-tools']) {
    parts.push(`allowed-tools: ${JSON.stringify(metadata['allowed-tools'])}`);
  }
  if (metadata.tools) {
    parts.push(`tools: ${JSON.stringify(metadata.tools)}`);
  }
  const permissions = declaredPermissions(metadata);
  if (permissions?.filesystem) {
    parts.push(
      `permissions.filesystem: ${JSON.stringify(permissions.filesystem)}`,
    );
  }
  if (permissions?.network) {
    parts.push(`permissions.network: ${JSON.stringify(permissions.network)}`);
  }
  return parts;
}

/**
 * Emits a visible disclosure for declared controls this export cannot
 * enforce. A comment is a disclosure, never an enforcement mechanism.
 */
function permissionWarning(
  agentName: string,
  declared: readonly string[],
): string {
  if (declared.length === 0) return '';
  return `<!-- ags: permissions not enforceable on ${agentName}; declared: ${declared.join('; ')} -->\n`;
}

/**
 * Emits a visible disclosure for AGS classification metadata (e.g.
 * `risk_tier`). Classification steers AGS review routing; it is not a host
 * permission, so folding it into the "not enforceable" warning would misstate
 * what the host actually enforces.
 */
function classificationWarning(
  platform: string,
  declared: readonly string[],
): string {
  if (declared.length === 0) return '';
  return `<!-- ags: AGS classification metadata (not a ${platform}-enforced permission); declared: ${declared.join('; ')} -->\n`;
}

/**
 * Transforms specialist skill markdown into platform-specific agent personas.
 */
export class SpecialistTransformer {
  static transform(
    source: SpecialistSource,
    agentId: Agent,
  ): TransformedSpecialist | null {
    const agentDef = getAgentDefinition(agentId);
    if (!agentDef) return null;

    const match = source.content.match(FRONTMATTER_RE);
    if (!match) return null;

    const metadata = yaml.load(match[1]) as Record<string, unknown>;
    const body = match[2].trim();
    const baseName = source.name.replace(/^specialist-/, '');
    const fullName = source.name;

    const description =
      (metadata.description as string | undefined) ||
      `Specialist persona for ${baseName}`;

    switch (agentDef.specialistFormat) {
      case 'claude-md': {
        const nativeTools = toolNames(metadata.tools);
        const allowedTools = toolNames(metadata['allowed-tools']);
        const fm: Record<string, unknown> = { name: baseName, description };
        const projected: string[] = [];
        if (nativeTools.length > 0) {
          fm.tools = nativeTools.join(', ');
          projected.push('tools');
        } else if (allowedTools.length > 0) {
          // Project the Universal-Skill-Format field onto Claude's native shape.
          fm.tools = allowedTools.join(', ');
          projected.push('allowed-tools');
        }
        if (metadata.model) fm.model = metadata.model;
        if (metadata.color) fm.color = metadata.color;
        const unprojected = unprojectedControlTokens(metadata, {
          allowedTools: projected.includes('allowed-tools'),
          tools: projected.includes('tools'),
        });
        const disclosed = permissionSummary(metadata).filter((part) => {
          if (projected.includes('tools') && part.startsWith('tools:')) {
            return false;
          }
          if (
            projected.includes('allowed-tools') &&
            part.startsWith('allowed-tools:')
          ) {
            return false;
          }
          return true;
        });
        // `risk_tier` is AGS classification metadata, not a permission; the
        // outward disclosure must not present it as host-enforced or as
        // something the host failed to enforce.
        const classification = disclosed.filter((part) =>
          part.startsWith('risk_tier:'),
        );
        const permissionControls = disclosed.filter(
          (part) => !part.startsWith('risk_tier:'),
        );
        return {
          name: `${baseName}.md`,
          content: `---\n${dumpFrontmatter(fm)}\n---\n${classificationWarning('Claude', classification)}${permissionWarning('Claude', permissionControls)}\n${body}`,
          projection: { projected, unprojected },
        };
      }

      case 'copilot-agent-md': {
        // Deterministic precedence: the native `tools` field wins over the
        // universal `allowed-tools` field. Presence of a field is what counts,
        // so an explicitly empty declaration stays an explicit empty allowlist.
        const hasNativeTools = metadata.tools !== undefined;
        const hasAllowedTools = metadata['allowed-tools'] !== undefined;
        const consumesNativeTools = hasNativeTools;
        const names = consumesNativeTools
          ? toolNames(metadata.tools)
          : toolNames(metadata['allowed-tools']);
        const mapped: string[] = [];
        const unknown: string[] = [];
        for (const name of names) {
          const alias = COPILOT_TOOL_ALIASES[name.toLowerCase()];
          if (alias) {
            if (!mapped.includes(alias)) mapped.push(alias);
          } else {
            unknown.push(name);
          }
        }

        const fm: Record<string, unknown> = { name: baseName, description };
        const declaredAllowlist = consumesNativeTools
          ? hasNativeTools
          : hasAllowedTools;
        if (declaredAllowlist) {
          // Documented behaviour: `tools: []` disables all tools. Omitting the
          // key would silently grant every tool, so a declared allowlist is
          // always written — including an explicitly empty one.
          fm.tools = mapped;
        }
        const honorsEmptyAllowlist = declaredAllowlist && names.length === 0;
        const projected =
          mapped.length > 0 || honorsEmptyAllowlist
            ? [consumesNativeTools ? 'tools' : 'allowed-tools']
            : [];
        const unprojected: string[] = [];
        if (metadata.risk_tier) unprojected.push('risk_tier');
        // The consumed field's names are represented by the `tool:` tokens
        // below; the unconsumed field is a whole unprojected declaration.
        if (consumesNativeTools) {
          if (hasAllowedTools) unprojected.push('allowed-tools');
        } else if (hasNativeTools) {
          unprojected.push('tools');
        }
        const permissions = declaredPermissions(metadata);
        if (permissions?.filesystem) {
          unprojected.push('permissions.filesystem');
        }
        if (permissions?.network) unprojected.push('permissions.network');
        unprojected.push(...unknown.map((name) => `tool:${name}`));

        const consumedField = consumesNativeTools ? 'tools:' : 'allowed-tools:';
        const conflictingField = consumesNativeTools
          ? 'allowed-tools:'
          : 'tools:';
        const summary = permissionSummary(metadata)
          .filter((part) => !part.startsWith(consumedField))
          .map((part) =>
            part.startsWith(conflictingField)
              ? `${part} (ignored: ${
                  consumesNativeTools ? 'native tools' : 'allowed-tools'
                } takes precedence)`
              : part,
          );
        const warning = permissionWarning('Copilot', [
          ...summary,
          ...(unknown.length > 0
            ? [`unknown tools: ${unknown.join(', ')}`]
            : []),
        ]);
        return {
          name: `${baseName}.agent.md`,
          content: `---\n${dumpFrontmatter(fm)}\n---\n${warning}${body}`,
          projection: { projected, unprojected },
        };
      }

      case 'cursor-mdc': {
        const projection = {
          projected: [] as string[],
          unprojected: unprojectedControlTokens(metadata),
        };
        return {
          name: `${fullName}.mdc`,
          content: `---\n${dumpFrontmatter({ description, globs: ['**/*'] })}\n---\n${permissionWarning('Cursor', permissionSummary(metadata))}\n# Specialist: ${baseName}\n\n${body}`,
          projection,
        };
      }

      case 'opencode-md': {
        const projection = {
          projected: [] as string[],
          unprojected: unprojectedControlTokens(metadata),
        };
        return {
          name: `${baseName}.md`,
          content: `---\n${dumpFrontmatter({ description, mode: 'subagent' })}\n---\n${permissionWarning('OpenCode', permissionSummary(metadata))}\n${body}`,
          projection,
        };
      }

      case 'gemini-md': {
        // Gemini CLI agents accept a native `tools` list (tool names such as
        // `read_file`, wildcards, MCP scopes). Project it verbatim, including
        // an explicitly empty list. Universal `allowed-tools` names belong to
        // another host vocabulary, so they are reported per name instead of
        // being silently translated.
        const hasNativeTools = metadata.tools !== undefined;
        const nativeTools = toolNames(metadata.tools);
        const crossVendorTools = toolNames(metadata['allowed-tools']);
        const fm: Record<string, unknown> = {
          name: baseName,
          description,
          kind: 'local',
        };
        const projected: string[] = [];
        if (hasNativeTools) {
          fm.tools = nativeTools;
          projected.push('tools');
        }
        const unprojected = [
          ...unprojectedControlTokens(metadata, { tools: hasNativeTools }),
          ...crossVendorTools.map((name) => `tool:${name}`),
        ];
        const disclosed = permissionSummary(metadata).filter(
          (part) => !(hasNativeTools && part.startsWith('tools:')),
        );
        return {
          name: `${baseName}.md`,
          content: `---\n${dumpFrontmatter(fm)}\n---\n${permissionWarning('Gemini', disclosed)}\n${body}`,
          projection: { projected, unprojected },
        };
      }

      case 'kiro-md': {
        const projection = {
          projected: [] as string[],
          unprojected: unprojectedControlTokens(metadata),
        };
        return {
          name: `${baseName}.md`,
          content: `---\n${dumpFrontmatter({ name: baseName, description })}\n---\n${permissionWarning('Kiro', permissionSummary(metadata))}\n${body}`,
          projection,
        };
      }

      case 'codex-toml': {
        // Codex custom-agent files inherit sandbox/approval policy and MCP
        // servers from the parent session: `sandbox_mode` here is ignored by
        // the host, so emitting it would be a false enforcement claim.
        // Declared restrictions are disclosed, never projected.
        const projection = {
          projected: [] as string[],
          unprojected: unprojectedControlTokens(metadata),
        };
        const comment =
          projection.unprojected.length > 0
            ? `# ags: declared controls are not enforced by this Codex agent file: ${projection.unprojected.join(', ')}\n`
            : '';
        return {
          name: `${baseName}.toml`,
          content: `${comment}name = "${escapeTomlString(baseName)}"\ndescription = "${escapeTomlString(description)}"\ndeveloper_instructions = """\n${escapeTomlString(body)}\n"""`,
          projection,
        };
      }

      default: {
        const projection = {
          projected: [] as string[],
          unprojected: unprojectedControlTokens(metadata),
        };
        return {
          name: `${baseName}${agentDef.ruleExtension || '.md'}`,
          content: `${permissionWarning(agentDef.name, permissionSummary(metadata))}${body}`,
          projection,
        };
      }
    }
  }
}
