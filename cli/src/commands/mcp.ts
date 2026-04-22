import inquirer from 'inquirer';
import path from 'path';
import pc from 'picocolors';
import { Agent } from '../constants';
import { ConfigService } from '../services/ConfigService';
import { McpConfigService, defaultMcpConfig } from '../services/McpConfigService';
import { McpScope, SkillConfig } from '../models/config';

const VALID_SCOPES: McpScope[] = ['project', 'user', 'snippets-only', 'disabled'];

/**
 * `ags mcp <action>` — manage the optional MCP server integration without
 * editing `.skillsrc` by hand.
 *
 * Sub-actions:
 *   status                 Show current scope, enabled state, and which configs are wired
 *   enable                 Set mcp.enabled=true; install configs at the configured scope
 *   disable                Set mcp.enabled=false; existing configs are NOT removed
 *   scope <scope>          Change scope: project | user | snippets-only | disabled
 *   install [--scope=...]  One-shot install at the given (or configured) scope
 *   uninstall [--from=...] Remove our entry from configs (project | user | all)
 *   snippets               Generate fresh snippet files in ./mcp-config-snippets/
 */
export class McpCommand {
  private configService: ConfigService;
  private mcpService: McpConfigService;

  constructor(configService?: ConfigService, mcpService?: McpConfigService) {
    this.configService = configService ?? new ConfigService();
    this.mcpService = mcpService ?? new McpConfigService();
  }

  async run(action: string, options: Record<string, string> = {}): Promise<void> {
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
        return this.actionEnable(config);
      case 'disable':
        return this.actionDisable(config);
      case 'scope':
        return this.actionScope(config, options);
      case 'install':
        return this.actionInstall(config, agents, cwd, options);
      case 'uninstall':
        return this.actionUninstall(config, agents, cwd, options);
      case 'snippets':
        return this.actionSnippets(config, agents, cwd);
      default:
        console.log(
          pc.red(`Unknown action: ${action}`),
          '\nValid actions: status, enable, disable, scope, install, uninstall, snippets',
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
    console.log(`  prompted: ${mcp.prompted ? 'yes' : 'no'}`);
    if (mcp.version) console.log(`  version : ${mcp.version}`);

    if (rows.length === 0) {
      console.log(pc.gray('\n  (no agents configured)'));
      return;
    }
    console.log('\n  Per-agent installation state:');
    let installedAnywhere = false;
    for (const row of rows) {
      const project =
        row.project === undefined ? '—' : row.project ? pc.green('✓') : pc.gray('✗');
      const user =
        row.user === undefined ? '—' : row.user ? pc.green('✓') : pc.gray('✗');
      if (row.project === true || row.user === true) installedAnywhere = true;
      console.log(`    ${row.agent.padEnd(12)} project: ${project}   user: ${user}`);
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

  private async actionEnable(config: SkillConfig): Promise<void> {
    const mcp = config.mcp ?? defaultMcpConfig();
    if (mcp.scope === 'disabled') {
      console.log(
        pc.yellow(
          '⚠️  scope is currently "disabled". Set a real scope first: `ags mcp scope project`',
        ),
      );
      return;
    }
    config.mcp = { ...mcp, enabled: true, prompted: true };
    await this.configService.saveConfig(config);
    console.log(pc.green('✅ MCP enabled.'));
    console.log(pc.gray('   Run `ags mcp install` to write configs now, or it happens on next `sync`.'));
  }

  private async actionDisable(config: SkillConfig): Promise<void> {
    const mcp = config.mcp ?? defaultMcpConfig();
    config.mcp = { ...mcp, enabled: false, prompted: true };
    await this.configService.saveConfig(config);
    console.log(pc.yellow('🔕 MCP disabled.'));
    console.log(pc.gray('   Existing config entries were NOT removed. Use `ags mcp uninstall` to clean them.'));
  }

  private async actionScope(
    config: SkillConfig,
    options: Record<string, string>,
  ): Promise<void> {
    const scope = options.scope ?? options._?.[0];
    if (!scope || !VALID_SCOPES.includes(scope as McpScope)) {
      console.log(
        pc.red(`Invalid scope. Valid: ${VALID_SCOPES.join(' | ')}`),
      );
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
    if (effectiveScope === 'disabled') {
      console.log(pc.yellow('Scope is "disabled" — nothing to install.'));
      return;
    }

    const userPrompt = async (agent: Agent, file: string): Promise<boolean> => {
      const { ok } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'ok',
          message: `Write user-scope MCP config for ${pc.cyan(agent)} at ${pc.gray(file)}?`,
          default: false,
        },
      ]);
      return ok;
    };

    const report = await this.mcpService.install({
      rootDir: cwd,
      agents,
      mcp: { ...mcp, enabled: true, scope: effectiveScope },
      userScopePrompt: userPrompt,
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
  ): Promise<void> {
    const mcp = config.mcp ?? defaultMcpConfig();
    const report = await this.mcpService.install({
      rootDir: cwd,
      agents,
      mcp: { ...mcp, enabled: true, scope: 'snippets-only' },
    });
    if (report.snippets.length === 0) {
      console.log(pc.gray('No snippets generated (no supported agents in .skillsrc).'));
      return;
    }
    console.log(pc.green(`✅ Generated ${report.snippets.length} snippet(s):`));
    for (const s of report.snippets) {
      console.log(`   - ${pc.cyan(s.agent)} → ${pc.gray(s.file)}`);
    }
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
        console.log(`   ${pc.green('+ wrote   ')} ${w.agent.padEnd(12)} ${pc.gray(path.relative(cwd, w.file))}`);
      }
    }
    if (report.declined.length > 0) {
      console.log(pc.bold('\n⏭  User-scope declined:'));
      for (const d of report.declined) {
        console.log(`   ${pc.gray('-')} ${d.agent.padEnd(12)} ${pc.gray(d.file)}`);
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
