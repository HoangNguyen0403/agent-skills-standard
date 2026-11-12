import { execFileSync, execSync } from 'child_process';
import inquirer from 'inquirer';
import path from 'path';
import pc from 'picocolors';
import { Agent } from '../constants';
import { MCP_COMPATIBLE_VERSION } from '../constants/mcp';
import { ConfigService } from '../services/ConfigService';
import {
  McpConfigService,
  PACKAGE,
  defaultMcpConfig,
} from '../services/McpConfigService';
import { sameMcpEntry } from '../services/utils/codexTomlMcp';
import { McpScope, McpVia, SkillConfig } from '../models/config';

const VALID_SCOPES: McpScope[] = [
  'project',
  'user',
  'snippets-only',
  'disabled',
];

const VALID_VIAS: McpVia[] = ['auto', 'npx', 'global'];

function parseVia(value: unknown): McpVia | null {
  return typeof value === 'string' && VALID_VIAS.includes(value as McpVia)
    ? (value as McpVia)
    : null;
}

function defaultGlobalInstaller(spec: string): void {
  if (process.platform === 'win32') {
    execFileSync('npm.cmd', ['i', '-g', spec], {
      stdio: 'inherit',
      shell: true,
    });
    return;
  }
  execFileSync('npm', ['i', '-g', spec], { stdio: 'inherit' });
}
export type NpmVersionResolver = (
  pkgName: string,
) => string | null | Promise<string | null>;

export function compareSemver(v1: string, v2: string): number {
  const parse = (v: string): [number, number, number] => {
    const clean = v.replace(/^v/, '').split('-')[0] ?? '';
    const parts = clean.split('.');
    const major = parseInt(parts[0] ?? '', 10);
    const minor = parseInt(parts[1] ?? '', 10);
    const patch = parseInt(parts[2] ?? '', 10);
    return [
      Number.isFinite(major) ? major : 0,
      Number.isFinite(minor) ? minor : 0,
      Number.isFinite(patch) ? patch : 0,
    ];
  };
  const [maj1, min1, pat1] = parse(v1);
  const [maj2, min2, pat2] = parse(v2);
  if (maj1 !== maj2) return maj1 - maj2;
  if (min1 !== min2) return min1 - min2;
  return pat1 - pat2;
}

function defaultNpmVersionResolver(pkgName: string): string | null {
  try {
    const version = execSync(`npm view ${pkgName} version`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
    if (semverRegex.test(version)) {
      return version;
    }
  } catch {
    // Registry failure, offline, or timeout
  }
  return null;
}

function formatEntry(
  entry: { command: string; args: string[] } | null | undefined,
): string {
  if (!entry) return '(none)';
  return entry.args.length
    ? `${entry.command} ${entry.args.join(' ')}`
    : entry.command;
}

/**
 * `ags mcp <action>` — manage the optional MCP server integration without
 * editing `.skillsrc` by hand.
 *
 * Sub-actions:
 *   status                 Show scope, launch mode, resolved command, and installed configs
 *   enable [--via=...]     Set mcp.enabled=true; optionally install configs at the configured scope
 *   disable                Set mcp.enabled=false; existing configs are NOT removed
 *   scope <scope>          Change scope: project | user | snippets-only | disabled
 *   via <auto|npx|global>  Change launch mode (default: auto)
 *   install [--scope=...] [--via=...]
 *                          One-shot install at the given (or configured) scope/mode
 *   uninstall [--from=...] Remove our entry from configs (project | user | all)
 *   snippets [--via=...]   Generate fresh snippet files in ./mcp-config-snippets/
 *   upgrade [--dry-run] [--via=...]
 *                          Move the global install and enabled configs to the
 *                          effective pin (mcp.version, else the compiled pin);
 *                          no network version discovery
 *
 * `enable` also installs `agent-skills-standard-mcp@<pin>` globally and
 * verifies the reported version whenever the effective launch mode is
 * `global` (saved mode or `--via global`) — no extra flag required.
 * `--install-global` remains as an explicit trigger for the same install.
 */
export class McpCommand {
  private configService: ConfigService;
  private mcpService: McpConfigService;
  private globalInstaller: (spec: string) => void = defaultGlobalInstaller;
  private npmVersionResolver: NpmVersionResolver = defaultNpmVersionResolver;

  constructor(configService?: ConfigService, mcpService?: McpConfigService) {
    this.configService = configService ?? new ConfigService();
    this.mcpService = mcpService ?? new McpConfigService();
  }

  /** For testing: replace the global npm installer (never run real npm in unit tests). */
  setGlobalInstallerForTesting(fn: ((spec: string) => void) | null): void {
    this.globalInstaller = fn ?? defaultGlobalInstaller;
  }
  /** For testing: replace the npm version resolver (never run real npm view in unit tests). */
  setNpmVersionResolverForTesting(fn: NpmVersionResolver | null): void {
    this.npmVersionResolver = fn ?? defaultNpmVersionResolver;
  }

  /**
   * Install the pinned package globally and prove the installed binary
   * reports that exact pin. Returns false (with exit code 1) when either
   * step fails so callers can abort before persisting or writing configs.
   */
  private ensureGlobalPin(pin: string): boolean {
    const spec = `${PACKAGE}@${pin}`;
    try {
      this.globalInstaller(spec);
    } catch {
      console.log(pc.red(`❌ Global install failed. Run manually:`));
      console.log(pc.gray(`   npm i -g ${spec}`));
      process.exitCode = 1;
      return false;
    }
    const detected = this.mcpService.detectGlobalVersion();
    if (detected !== pin) {
      console.log(
        pc.red(
          `❌ Global ags-mcp reports ${detected ?? 'no version'} but the CLI pin is ${pin}.`,
        ),
      );
      if (!detected) {
        console.log(
          pc.gray(
            "   Probe found no usable version: check that npm's global bin directory is on PATH and that `ags-mcp --version` prints the expected pin.",
          ),
        );
      }
      console.log(pc.gray(`   Run manually: npm i -g ${spec}`));
      process.exitCode = 1;
      return false;
    }
    console.log(pc.green(`✅ Global ags-mcp ${pin} installed and verified.`));
    return true;
  }

  async run(
    action: string,
    options: Record<string, string> = {},
  ): Promise<void> {
    // `--dry-run` only means something for `upgrade`; silently ignoring it on
    // a mutating action would be worse than failing.
    if (options.dryRun && action !== 'upgrade') {
      console.log(
        pc.red(`--dry-run is only supported by \`ags mcp upgrade\`.`),
      );
      process.exitCode = 1;
      return;
    }

    const config = await this.configService.loadConfig();
    if (!config) {
      console.log(
        pc.red(
          '❌ .skillsrc not found. Run `agent-skills-standard init` first.',
        ),
      );
      return;
    }

    const cwd = process.cwd();
    const agents = config.agents ?? [];

    switch (action) {
      case 'status':
        return this.actionStatus(config, cwd);
      case 'enable':
        return this.actionEnable(config, agents, cwd, options);
      case 'disable':
        return this.actionDisable(config);
      case 'scope':
        return this.actionScope(config, options);
      case 'via':
        return this.actionVia(config, options);
      case 'install':
        return this.actionInstall(config, agents, cwd, options);
      case 'uninstall':
        return this.actionUninstall(config, agents, cwd, options);
      case 'snippets':
        return this.actionSnippets(config, agents, cwd, options);
      case 'upgrade':
        return this.actionUpgrade(config, agents, cwd, options);
      default:
        console.log(
          pc.red(`Unknown action: ${action}`),
          '\nValid actions: status, enable, disable, scope, via, install, uninstall, snippets, upgrade',
        );
    }
  }

  // ---- actions ----

  private async actionStatus(config: SkillConfig, cwd: string): Promise<void> {
    const mcp = config.mcp ?? defaultMcpConfig();
    const agents = config.agents ?? [];
    const rows = await this.mcpService.status({ rootDir: cwd, agents });

    console.log(pc.bold('\n🔌 MCP integration status\n'));
    console.log(`  enabled : ${mcp.enabled ? pc.green('yes') : pc.gray('no')}`);
    console.log(`  scope   : ${pc.cyan(mcp.scope)}`);
    console.log(`  via     : ${pc.cyan(mcp.via ?? 'auto')}`);
    console.log(`  prompted: ${mcp.prompted ? 'yes' : 'no'}`);
    if (mcp.version) console.log(`  version : ${mcp.version}`);

    const pin = mcp.version ?? MCP_COMPATIBLE_VERSION;
    const entry = this.mcpService.buildEntry({
      version: mcp.version,
      via: mcp.via,
    });
    const launch = entry.args.length
      ? `${entry.command} ${entry.args.join(' ')}`
      : entry.command;
    console.log(`  launch  : ${pc.gray(launch)}`);
    console.log(`  pin     : ${pin}`);
    const detected = this.mcpService.detectGlobalVersion();
    console.log(
      `  global  : ${detected ? pc.green(detected) : pc.gray('not found')}`,
    );
    if (detected && detected !== pin) {
      console.log(
        pc.yellow(
          `\n⚠️  Global ags-mcp is ${detected} but the CLI pin is ${pin}; "auto" will use npx until they match.`,
        ),
      );
      console.log(pc.gray(`   Update with: npm i -g ${PACKAGE}@${pin}`));
    }

    if (rows.length === 0) {
      console.log(pc.gray('\n  (no agents configured)'));
      return;
    }
    console.log('\n  Per-agent installation state:');
    let installedAnywhere = false;
    const drift: Array<{
      agent: Agent;
      scope: 'project' | 'user';
      configured: { command: string; args: string[] };
    }> = [];
    for (const row of rows) {
      const project =
        row.project === undefined
          ? '—'
          : `${row.project ? pc.green('✓') : pc.gray('✗')} ${formatEntry(row.projectEntry)}`;
      const user =
        row.user === undefined
          ? '—'
          : `${row.user ? pc.green('✓') : pc.gray('✗')} ${formatEntry(row.userEntry)}`;
      if (row.project === true || row.user === true) installedAnywhere = true;
      if (
        row.project === true &&
        row.projectEntry &&
        !sameMcpEntry(row.projectEntry, entry)
      ) {
        drift.push({
          agent: row.agent,
          scope: 'project',
          configured: row.projectEntry,
        });
      }
      if (
        row.user === true &&
        row.userEntry &&
        !sameMcpEntry(row.userEntry, entry)
      ) {
        drift.push({
          agent: row.agent,
          scope: 'user',
          configured: row.userEntry,
        });
      }
      console.log(
        `    ${row.agent.padEnd(12)} project: ${project}   user: ${user}`,
      );
    }
    if (drift.length > 0) {
      for (const item of drift) {
        console.log(
          pc.yellow(
            `\n⚠️  MCP pin drift: ${item.agent} ${item.scope} pins ${formatEntry(item.configured)} but this CLI expects ${launch}.`,
          ),
        );
      }
      console.log(
        pc.gray(
          '   Run `ags sync` (or `ags mcp install`) to refresh; existing agents pick it up on their next MCP start.',
        ),
      );
    }

    // Surface the consent-vs-runtime-config mismatch the user might miss.
    // The MCP block in AGENTS.md is now unconditional, so AI agents will
    // discover the MCP either way — but the consent flag is what controls
    // whether `sync` keeps the runtime configs in step.
    if (!mcp.enabled && installedAnywhere) {
      console.log(
        pc.yellow(
          '\n⚠️  Mismatch detected: .skillsrc says mcp.enabled=false, but the MCP entry IS present in at least one runtime config.',
        ),
      );
      console.log(
        pc.gray(
          '   The MCP will work, but `sync` will not keep its config in step. Consider one of:',
        ),
      );
      console.log(
        pc.gray(
          '     • `ags mcp enable`              — opt the project in (CLI keeps configs in step)',
        ),
      );
      console.log(
        pc.gray(
          '     • `ags mcp uninstall --from project` — remove the manual entry if it was unintended',
        ),
      );
    } else if (mcp.enabled && !installedAnywhere) {
      console.log(
        pc.yellow(
          '\n⚠️  Mismatch detected: .skillsrc says mcp.enabled=true, but no runtime config has the MCP registered.',
        ),
      );
      console.log(
        pc.gray(
          '   Run `ags mcp install` to write the entries, or `ags mcp disable` to clear the consent flag.',
        ),
      );
    }
  }

  /**
   * Per-file consent for user-home MCP configs. Shared by every install path
   * so `enable` (including global mode) cannot drift from `actionInstall`.
   */
  private async promptUserScopeWrite(
    agent: Agent,
    file: string,
  ): Promise<boolean> {
    const { ok } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ok',
        message: `Write user-scope MCP config for ${pc.cyan(agent)} at ${pc.gray(file)}?`,
        default: false,
      },
    ]);
    return ok;
  }

  private async actionEnable(
    config: SkillConfig,
    agents: Agent[],
    cwd: string,
    options: Record<string, string>,
  ): Promise<void> {
    const mcp = config.mcp ?? defaultMcpConfig();
    const viaOverrideRaw = options.via;
    const viaOverride = viaOverrideRaw ? parseVia(viaOverrideRaw) : undefined;
    if (viaOverrideRaw && !viaOverride) {
      console.log(
        pc.red(`Invalid --via value. Valid: ${VALID_VIAS.join(' | ')}`),
      );
      return;
    }
    if (mcp.scope === 'disabled') {
      console.log(
        pc.yellow(
          '⚠️  scope is currently "disabled". Set a real scope first: `ags mcp scope project`',
        ),
      );
      return;
    }

    // Effective launch mode: a per-run override wins, else the saved mode.
    // `global` mode is only usable with a matching global install, so enable
    // performs that install automatically instead of requiring a second flag.
    const effectiveVia: McpVia = viaOverride ?? mcp.via ?? 'auto';
    const needsGlobalInstall =
      Boolean(options.installGlobal) || effectiveVia === 'global';
    if (needsGlobalInstall) {
      const pin = mcp.version ?? MCP_COMPATIBLE_VERSION;
      if (!this.ensureGlobalPin(pin)) return;
    }

    config.mcp = { ...mcp, enabled: true, prompted: true };
    await this.configService.saveConfig(config);
    console.log(pc.green('✅ MCP enabled.'));

    if (viaOverride || effectiveVia === 'global') {
      const installVia: McpVia = viaOverride ?? 'global';
      const report = await this.mcpService.install({
        rootDir: cwd,
        agents,
        mcp: { ...config.mcp, via: installVia },
        userScopePrompt: (agent, file) =>
          this.promptUserScopeWrite(agent, file),
      });
      console.log(
        pc.gray(`   Installed configs using launch mode "${installVia}".`),
      );
      this.printReport(report, cwd);
      return;
    }

    console.log(
      pc.gray(
        '   Run `ags mcp install` to write configs now, or it happens on next `sync`.',
      ),
    );
  }

  private async actionVia(
    config: SkillConfig,
    options: Record<string, string>,
  ): Promise<void> {
    const via = options.via ?? options._?.[0];
    if (!parseVia(via)) {
      console.log(pc.red(`Invalid via. Valid: ${VALID_VIAS.join(' | ')}`));
      return;
    }
    const mcp = config.mcp ?? defaultMcpConfig();
    config.mcp = {
      ...mcp,
      via: via as McpVia,
      prompted: true,
    };
    await this.configService.saveConfig(config);
    console.log(pc.green(`✅ MCP launch mode set to "${via}".`));
    if (via === 'global') {
      console.log(
        pc.yellow(
          '⚠️  "global" requires a matching global install: `ags mcp enable` installs and verifies it automatically.',
        ),
      );
    } else if (via === 'auto') {
      console.log(
        pc.gray(
          '   "auto" uses a version-matched global ags-mcp when present, otherwise npx.',
        ),
      );
    }
  }

  private async actionDisable(config: SkillConfig): Promise<void> {
    const mcp = config.mcp ?? defaultMcpConfig();
    config.mcp = { ...mcp, enabled: false, prompted: true };
    await this.configService.saveConfig(config);
    console.log(pc.yellow('🔕 MCP disabled.'));
    console.log(
      pc.gray(
        '   Existing config entries were NOT removed. Use `ags mcp uninstall` to clean them.',
      ),
    );
  }

  private async actionScope(
    config: SkillConfig,
    options: Record<string, string>,
  ): Promise<void> {
    // Positional scope is mapped onto `options.scope` by the Commander
    // adapter, which preserves explicit `--scope` precedence.
    const scope = options.scope;
    if (!scope || !VALID_SCOPES.includes(scope as McpScope)) {
      console.log(pc.red(`Invalid scope. Valid: ${VALID_SCOPES.join(' | ')}`));
      return;
    }
    const mcp = config.mcp ?? defaultMcpConfig();
    config.mcp = { ...mcp, scope: scope as McpScope, prompted: true };
    await this.configService.saveConfig(config);
    console.log(pc.green(`✅ MCP scope set to "${scope}".`));
    if (scope === 'user') {
      console.log(
        pc.yellow(
          '⚠️  user-scope writes will be prompted per file during `sync` or `install`.',
        ),
      );
    }
  }

  private async actionInstall(
    config: SkillConfig,
    agents: Agent[],
    cwd: string,
    options: Record<string, string>,
  ): Promise<void> {
    const mcp = config.mcp ?? defaultMcpConfig();
    const scopeOverride = options.scope as McpScope | undefined;
    const effectiveScope = scopeOverride ?? mcp.scope;
    if (scopeOverride && !VALID_SCOPES.includes(scopeOverride)) {
      console.log(
        pc.red(`Invalid --scope value. Valid: ${VALID_SCOPES.join(' | ')}`),
      );
      return;
    }
    const viaOverrideRaw = options.via;
    const viaOverride = viaOverrideRaw ? parseVia(viaOverrideRaw) : undefined;
    if (viaOverrideRaw && !viaOverride) {
      console.log(
        pc.red(`Invalid --via value. Valid: ${VALID_VIAS.join(' | ')}`),
      );
      return;
    }
    if (effectiveScope === 'disabled') {
      console.log(pc.yellow('Scope is "disabled" — nothing to install.'));
      return;
    }

    const report = await this.mcpService.install({
      rootDir: cwd,
      agents,
      mcp: {
        ...mcp,
        enabled: true,
        scope: effectiveScope,
        ...(viaOverride ? { via: viaOverride } : {}),
      },
      userScopePrompt: (agent, file) => this.promptUserScopeWrite(agent, file),
    });

    this.printReport(report, cwd);
  }

  private async actionUninstall(
    config: SkillConfig,
    agents: Agent[],
    cwd: string,
    options: Record<string, string>,
  ): Promise<void> {
    const from = (options.from as 'project' | 'user' | 'all') ?? 'project';
    if (!['project', 'user', 'all'].includes(from)) {
      console.log(pc.red('--from must be: project | user | all'));
      return;
    }
    const { removed } = await this.mcpService.uninstall({
      rootDir: cwd,
      agents,
      from,
    });
    if (removed.length === 0) {
      console.log(pc.gray(`Nothing to remove at scope "${from}".`));
      return;
    }
    console.log(pc.green(`✅ Removed agent-skills MCP entry from:`));
    for (const r of removed) {
      console.log(`   - ${pc.cyan(r.agent)} → ${pc.gray(r.file)}`);
    }
  }

  private async actionSnippets(
    config: SkillConfig,
    agents: Agent[],
    cwd: string,
    options: Record<string, string>,
  ): Promise<void> {
    const mcp = config.mcp ?? defaultMcpConfig();
    const viaOverrideRaw = options.via;
    const viaOverride = viaOverrideRaw ? parseVia(viaOverrideRaw) : undefined;
    if (viaOverrideRaw && !viaOverride) {
      console.log(
        pc.red(`Invalid --via value. Valid: ${VALID_VIAS.join(' | ')}`),
      );
      return;
    }
    const report = await this.mcpService.install({
      rootDir: cwd,
      agents,
      mcp: {
        ...mcp,
        enabled: true,
        scope: 'snippets-only',
        ...(viaOverride ? { via: viaOverride } : {}),
      },
    });
    if (report.snippets.length === 0) {
      console.log(
        pc.gray('No snippets generated (no supported agents in .skillsrc).'),
      );
      return;
    }
    console.log(pc.green(`✅ Generated ${report.snippets.length} snippet(s):`));
    for (const s of report.snippets) {
      console.log(`   - ${pc.cyan(s.agent)} → ${pc.gray(s.file)}`);
    }
  }

  /**
   * `ags mcp upgrade [version]` — upgrade the MCP server integration to the
   * latest version on npm (or a specified target version), upgrade the global
   * binary if detected, and refresh configured agent integrations.
   *
   * If offline or the registry check fails, falls back cleanly to the project
   * pin or MCP_COMPATIBLE_VERSION.
   * `--via` is a per-run override only.
   */
  private async actionUpgrade(
    config: SkillConfig,
    agents: Agent[],
    cwd: string,
    options: Record<string, string>,
  ): Promise<void> {
    const mcp = config.mcp ?? defaultMcpConfig();
    const dryRun = Boolean(options.dryRun);

    const explicitTarget = options.target ?? options.version ?? options.to;
    let target: string;
    let targetSource:
      'explicit' | 'npm' | 'project-pin' | 'fallback-compatibility';
    if (explicitTarget) {
      const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
      if (!semverRegex.test(explicitTarget)) {
        console.log(pc.red(`❌ Invalid version: ${explicitTarget}`));
        process.exitCode = 1;
        return;
      }
      target = explicitTarget;
      targetSource = 'explicit';
    } else {
      let npmVersion: string | null;
      try {
        npmVersion = await this.npmVersionResolver(PACKAGE);
      } catch {
        npmVersion = null;
      }

      const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
      if (npmVersion && semverRegex.test(npmVersion)) {
        if (mcp.version && compareSemver(mcp.version, npmVersion) > 0) {
          target = mcp.version;
          targetSource = 'project-pin';
        } else {
          target = npmVersion;
          targetSource = 'npm';
        }
      } else if (mcp.version) {
        target = mcp.version;
        targetSource = 'project-pin';
      } else {
        target = MCP_COMPATIBLE_VERSION;
        targetSource = 'fallback-compatibility';
      }
    }

    const viaOverrideRaw = options.via;
    const viaOverride = viaOverrideRaw ? parseVia(viaOverrideRaw) : undefined;
    if (viaOverrideRaw && !viaOverride) {
      console.log(
        pc.red(`Invalid --via value. Valid: ${VALID_VIAS.join(' | ')}`),
      );
      return;
    }

    const effectiveVia: McpVia = viaOverride ?? mcp.via ?? 'auto';
    const detected = this.mcpService.detectGlobalVersion();
    const globalStale = Boolean(detected) && detected !== target;
    const configsInScope =
      mcp.enabled === true && (mcp.scope === 'project' || mcp.scope === 'user');
    const configsState = configsInScope
      ? `refresh (scope ${mcp.scope}, via ${effectiveVia})`
      : mcp.enabled === true
        ? `none (scope ${mcp.scope})`
        : 'none (MCP disabled)';

    console.log(pc.bold(`\n🔌 MCP upgrade (pin ${target})\n`));
    if (targetSource === 'explicit') {
      console.log(pc.gray(`  target  : ${target} (explicit override)`));
    } else if (targetSource === 'npm') {
      console.log(
        pc.gray(`  target  : ${target} (resolved from npm registry)`),
      );
    } else if (targetSource === 'project-pin') {
      console.log(pc.gray(`  target  : ${target} (resolved from project pin)`));
      console.log(
        pc.yellow(
          `  note    : project pin ${mcp.version} wins; this CLI was built against ${MCP_COMPATIBLE_VERSION}`,
        ),
      );
    } else {
      console.log(
        pc.gray(
          `  target  : ${target} (fallback compatibility pin; npm registry unavailable)`,
        ),
      );
    }
    if (!detected) {
      console.log(
        `  global  : ${pc.gray('no readable global ags-mcp detected')}`,
      );
    } else if (!globalStale) {
      console.log(`  global  : ${pc.green(detected)} ${pc.gray('(current)')}`);
    } else {
      console.log(
        `  global  : ${pc.yellow(detected)} → ${pc.cyan(`${PACKAGE}@${target}`)}`,
      );
    }
    console.log(`  configs : ${configsState}`);

    if (dryRun) {
      // Mirror the real run: an unusable "global" mode is refused, not
      // reported as a successful plan.
      if (effectiveVia === 'global' && !detected) {
        console.log(
          pc.yellow(
            '⚠️  Launch mode "global" needs a global install; refusing to write configs that would fail to start.',
          ),
        );
        console.log(pc.gray(`   Run manually: npm i -g ${PACKAGE}@${target}`));
        process.exitCode = 1;
        return;
      }
      console.log(
        pc.gray(
          '\nDry run: no global install, no config writes, no .skillsrc change.',
        ),
      );
      if (
        effectiveVia === 'auto' &&
        globalStale &&
        process.platform !== 'win32'
      ) {
        console.log(
          pc.gray(
            '   "auto" entries resolve to the global binary once it reports the pin.',
          ),
        );
      }
      return;
    }

    if (globalStale) {
      if (!this.ensureGlobalPin(target)) return;
    } else if (detected) {
      console.log(
        pc.green(`✅ Global ags-mcp already at ${target} — no install needed.`),
      );
    } else if (effectiveVia !== 'global') {
      console.log(
        pc.gray(
          `ℹ️  No readable global ags-mcp detected; install it with \`npm i -g ${PACKAGE}@${target}\` if you use "global" mode.`,
        ),
      );
    }

    if (!configsInScope) {
      console.log(
        pc.gray(
          mcp.enabled === true
            ? '   No runtime configs to refresh at this scope.'
            : '   Enable configs with `ags mcp enable` to have them refreshed on upgrade.',
        ),
      );
      if (globalStale) this.printHostRestartHint();
      if (globalStale && config.mcp?.version && config.mcp.version !== target) {
        config.mcp = { ...config.mcp, version: target };
        await this.configService.saveConfig(config);
        console.log(pc.green(`✅ Updated .skillsrc mcp.version to ${target}.`));
      }
      return;
    }

    // "global" launch mode cannot work without a matching global binary;
    // writing configs that cannot start would just move the failure.
    if (effectiveVia === 'global' && !detected) {
      console.log(
        pc.yellow(
          '⚠️  Launch mode "global" needs a global install; refusing to write configs that would fail to start.',
        ),
      );
      console.log(pc.gray(`   Run manually: npm i -g ${PACKAGE}@${target}`));
      process.exitCode = 1;
      return;
    }

    const report = await this.mcpService.install({
      rootDir: cwd,
      agents,
      mcp: {
        ...mcp,
        version: target,
        enabled: true,
        ...(viaOverride ? { via: viaOverride } : {}),
      },
      userScopePrompt: (agent, file) => this.promptUserScopeWrite(agent, file),
    });
    if (config.mcp?.version && config.mcp.version !== target) {
      config.mcp = { ...config.mcp, version: target };
      await this.configService.saveConfig(config);
      console.log(pc.green(`✅ Updated .skillsrc mcp.version to ${target}.`));
    }
    this.printReport(report, cwd);
    this.printHostRestartHint();
  }

  private printHostRestartHint(): void {
    console.log(
      pc.gray(
        '\nHosts pick up the new pin on their next MCP start (no process restart from here).',
      ),
    );
  }

  // ---- output ----

  private printReport(
    report: Awaited<ReturnType<McpConfigService['install']>>,
    cwd: string,
  ): void {
    if (report.projectWrites.length > 0) {
      console.log(pc.bold('\n📁 Project-scope writes:'));
      for (const w of report.projectWrites) {
        const tag =
          w.action === 'added'
            ? pc.green('+ added   ')
            : w.action === 'updated'
              ? pc.cyan('~ updated ')
              : pc.gray('= up-to-date');
        console.log(`   ${tag} ${w.agent.padEnd(12)} ${pc.gray(w.file)}`);
      }
    }
    if (report.userWrites.length > 0) {
      console.log(pc.bold('\n🏠 User-scope writes:'));
      for (const w of report.userWrites) {
        console.log(
          `   ${pc.green('+ wrote   ')} ${w.agent.padEnd(12)} ${pc.gray(path.relative(cwd, w.file))}`,
        );
      }
    }
    if (report.declined.length > 0) {
      console.log(pc.bold('\n⏭  User-scope declined:'));
      for (const d of report.declined) {
        console.log(
          `   ${pc.gray('-')} ${d.agent.padEnd(12)} ${pc.gray(d.file)}`,
        );
      }
    }
    if (report.snippets.length > 0) {
      console.log(pc.bold('\n📄 Snippet files:'));
      for (const s of report.snippets) {
        console.log(`   ${pc.gray(s.file)}`);
      }
    }
    if (report.unsupported.length > 0) {
      console.log(
        pc.gray(
          `\n(skipped — no MCP support yet: ${report.unsupported.join(', ')})`,
        ),
      );
    }
  }
}
