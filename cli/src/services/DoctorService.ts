import fetch from 'cross-fetch';
import fs from 'fs-extra';
import path from 'path';
import pkg from '../../package.json';
import { Agent } from '../constants';
import { SkillConfig } from '../models/config';
import { ConfigService } from './ConfigService';
import { DetectionService } from './DetectionService';
import { HookService, HookStatusRow } from './HookService';
import {
  LOCKFILE_NAME,
  LockfileService,
  VerifyResult,
} from './LockfileService';
import { McpConfigService } from './McpConfigService';

export type CheckStatus = 'ok' | 'warn' | 'fail' | 'skip';
export interface DoctorFix {
  description: string;
  apply: () => Promise<void>;
}
export interface DoctorCheck {
  name: string;
  status: CheckStatus;
  evidence: string;
  fix?: DoctorFix;
}
export interface DoctorReportData {
  schema_version: 1;
  checks: Array<{
    name: string;
    status: CheckStatus;
    evidence: string;
    fixable: boolean;
    fix?: string;
  }>;
  summary: {
    total: number;
    ok: number;
    warn: number;
    fail: number;
    skip: number;
  };
  healthy: boolean;
}

export interface DoctorDeps {
  loadConfig(rootDir: string): Promise<SkillConfig | null>;
  detectAgents(): Promise<Record<string, boolean>>;
  mcpStatus(
    rootDir: string,
    agents: Agent[],
  ): Promise<Array<{ agent: Agent; project?: boolean; user?: boolean }>>;
  hookStatus(rootDir: string, agents: Agent[]): Promise<HookStatusRow[]>;
  verifyLock(
    rootDir: string,
    agents: Agent[],
  ): Promise<{ found: boolean; checked: number; result: VerifyResult }>;
  fetchLatestVersion(): Promise<string | null>;
  installMcp(rootDir: string, agent: Agent, config: SkillConfig): Promise<void>;
  installHooks(rootDir: string, agent: Agent): Promise<void>;
}

// Same marker HookService writes into generated hook scripts.
const HOOK_VERSION_MARKER_RE = /^\/\/ ags-hook-version: (\S+)$/m;
const SEMVER_RE = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
const NPM_LATEST_URL =
  'https://registry.npmjs.org/agent-skills-standard/latest';

export function defaultDoctorDeps(): DoctorDeps {
  const config = new ConfigService();
  const detection = new DetectionService();
  const mcp = new McpConfigService();
  const hooks = new HookService();
  const lock = new LockfileService();
  return {
    loadConfig: (rootDir) => config.loadConfig(rootDir),
    detectAgents: () => detection.detectAgents(),
    mcpStatus: (rootDir, agents) => mcp.status({ rootDir, agents }),
    hookStatus: (rootDir, agents) => hooks.status({ rootDir, agents }),
    verifyLock: async (rootDir, agents) => {
      const { lock: l } = await lock.load(rootDir, agents);
      if (!l) {
        return {
          found: false,
          checked: 0,
          result: { ok: false, mismatches: [], missing: [] },
        };
      }
      const result = await lock.verifyEntries(rootDir, l.entries);
      return {
        found: true,
        checked: Object.keys(l.entries).length,
        result,
      };
    },
    fetchLatestVersion: async () => {
      try {
        const res = await fetch(NPM_LATEST_URL, {
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return null;
        const body = (await res.json()) as { version?: unknown };
        return typeof body.version === 'string' && SEMVER_RE.test(body.version)
          ? body.version
          : null;
      } catch {
        return null;
      }
    },
    installMcp: async (rootDir, agent, cfg) => {
      await mcp.install({ rootDir, agents: [agent], mcp: cfg.mcp! });
    },
    installHooks: async (rootDir, agent) => {
      await hooks.install({ rootDir, agents: [agent] });
    },
  };
}

const check = (
  name: string,
  status: CheckStatus,
  evidence: string,
  fix?: DoctorFix,
): DoctorCheck =>
  fix ? { name, status, evidence, fix } : { name, status, evidence };

export class DoctorService {
  constructor(private deps: DoctorDeps = defaultDoctorDeps()) {}

  async runChecks(opts: {
    rootDir: string;
    offline: boolean;
  }): Promise<DoctorCheck[]> {
    const { rootDir } = opts;
    const checks: DoctorCheck[] = [];
    const config = await this.deps.loadConfig(rootDir);

    if (!config) {
      checks.push(
        check('config', 'fail', '.skillsrc not found — run `ags init`'),
      );
      for (const name of ['agents', 'lockfile', 'mcp', 'hooks']) {
        checks.push(check(name, 'skip', 'no .skillsrc'));
      }
    } else {
      checks.push(check('config', 'ok', '.skillsrc parsed'));
      const agents = await this.resolveAgents(config, checks);
      checks.push(await this.lockfileCheck(rootDir, agents));
      checks.push(await this.mcpCheck(rootDir, agents, config));
      checks.push(await this.hooksCheck(rootDir, agents));
    }

    checks.push(
      (await fs.pathExists(path.join(rootDir, '.agent')))
        ? check(
            'legacy_folders',
            'warn',
            'legacy .agent/ folder present — `ags sync` migrates it to .agents/',
          )
        : check('legacy_folders', 'ok', 'no legacy folders'),
    );
    checks.push(await this.versionCheck(opts.offline));
    return checks;
  }

  static toReport(checks: DoctorCheck[]): DoctorReportData {
    const summary = { total: checks.length, ok: 0, warn: 0, fail: 0, skip: 0 };
    for (const c of checks) summary[c.status]++;
    return {
      schema_version: 1,
      checks: checks.map((c) => ({
        name: c.name,
        status: c.status,
        evidence: c.evidence,
        fixable: Boolean(c.fix),
        ...(c.fix ? { fix: c.fix.description } : {}),
      })),
      summary,
      healthy: summary.fail === 0,
    };
  }

  private async resolveAgents(
    config: SkillConfig,
    checks: DoctorCheck[],
  ): Promise<Agent[]> {
    const detectedMap = await this.deps.detectAgents();
    const detected = Object.entries(detectedMap)
      .filter(([, on]) => on)
      .map(([id]) => id as Agent);
    const configured = config.agents ?? [];
    const agents = configured.length > 0 ? configured : detected;
    if (agents.length === 0) {
      checks.push(
        check(
          'agents',
          'warn',
          'no agents configured or detected — add `agents:` to .skillsrc',
        ),
      );
    } else {
      const absent = configured.filter((a) => !detected.includes(a));
      checks.push(
        absent.length > 0
          ? check(
              'agents',
              'warn',
              `configured but not on disk: ${absent.join(', ')} — run \`ags sync\``,
            )
          : check('agents', 'ok', `agents: ${agents.join(', ')}`),
      );
    }
    return agents;
  }

  private async lockfileCheck(
    rootDir: string,
    agents: Agent[],
  ): Promise<DoctorCheck> {
    const { found, checked, result } = await this.deps.verifyLock(
      rootDir,
      agents,
    );
    if (!found) {
      return check(
        'lockfile',
        'warn',
        `${LOCKFILE_NAME} not found — run \`ags sync\``,
      );
    }
    const problems: string[] = [];
    if (result.mismatches.length > 0) {
      problems.push(
        `${result.mismatches.length} file(s) differ from ${LOCKFILE_NAME} (your edits or tampering)`,
      );
    }
    if (result.missing.length > 0) {
      problems.push(
        `${result.missing.length} file(s) missing — run \`ags sync\``,
      );
    }
    if (problems.length > 0) {
      return check('lockfile', 'warn', problems.join('; '));
    }
    return check('lockfile', 'ok', `${checked} tracked file(s) match`);
  }

  private async mcpCheck(
    rootDir: string,
    agents: Agent[],
    config: SkillConfig,
  ): Promise<DoctorCheck> {
    const scope = config.mcp?.scope;
    if (!config.mcp?.enabled || (scope !== 'project' && scope !== 'user')) {
      return check('mcp', 'skip', 'MCP disabled in .skillsrc');
    }
    const rows = await this.deps.mcpStatus(rootDir, agents);
    const missing = rows
      .filter((r) =>
        scope === 'project' ? !r.project : !(r.project || r.user),
      )
      .map((r) => r.agent);
    if (missing.length === 0)
      return check(
        'mcp',
        'ok',
        `registered for ${rows.map((r) => r.agent).join(', ') || 'no MCP-capable agents'}`,
      );
    return check(
      'mcp',
      'fail',
      `MCP server not registered for: ${missing.join(', ')}`,
      {
        description: `register MCP for ${missing.join(', ')}`,
        apply: async () => {
          for (const agent of missing)
            await this.deps.installMcp(rootDir, agent, config);
        },
      },
    );
  }

  private async hooksCheck(
    rootDir: string,
    agents: Agent[],
  ): Promise<DoctorCheck> {
    const rows = await this.deps.hookStatus(rootDir, agents);
    const notInstalled = rows.filter((r) => !r.installed).map((r) => r.agent);
    const stale: string[] = [];
    const staleAgents: Agent[] = [];
    for (const row of rows.filter((r) => r.installed)) {
      const script = row.files.find((f) => f.endsWith('.js'));
      if (!script) continue;
      const abs = path.join(rootDir, script);
      if (!(await fs.pathExists(abs))) continue;
      const version = (await fs.readFile(abs, 'utf8')).match(
        HOOK_VERSION_MARKER_RE,
      )?.[1];
      if (version && version !== pkg.version) {
        stale.push(`${row.agent} (v${version})`);
        staleAgents.push(row.agent);
      }
    }
    const targets = [...notInstalled, ...staleAgents];
    if (targets.length === 0)
      return check(
        'hooks',
        'ok',
        `${rows.length} agent hook(s) installed and current`,
      );
    const parts: string[] = [];
    if (notInstalled.length > 0)
      parts.push(`not installed: ${notInstalled.join(', ')}`);
    if (stale.length > 0)
      parts.push(`stale (current v${pkg.version}): ${stale.join(', ')}`);
    return check('hooks', 'warn', parts.join('; '), {
      description: `install/refresh hooks for ${targets.join(', ')}`,
      apply: async () => {
        for (const agent of targets)
          await this.deps.installHooks(rootDir, agent);
      },
    });
  }

  private async versionCheck(offline: boolean): Promise<DoctorCheck> {
    if (offline) return check('cli_version', 'skip', 'skipped (--offline)');
    const latest = await this.deps.fetchLatestVersion();
    if (!latest)
      return check('cli_version', 'skip', 'npm registry unreachable');
    return latest === pkg.version
      ? check('cli_version', 'ok', `v${pkg.version} is the latest`)
      : check(
          'cli_version',
          'warn',
          `v${pkg.version} installed, v${latest} available — run \`ags upgrade\``,
        );
  }
}
