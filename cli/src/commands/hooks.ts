import pc from 'picocolors';
import { Agent } from '../constants';
import { ConfigService } from '../services/ConfigService';
import { HookService, HookWriteReport } from '../services/HookService';

/**
 * `ags hooks <action>` — manage the PreToolUse skill-loader hook for
 * Claude Code (and Kiro advisory hook) without editing files by hand.
 *
 * Sub-actions:
 *   status     Show which hook files are installed for each agent
 *   install    Write hook script + register in .claude/settings.json
 *   uninstall  Deregister from .claude/settings.json (preserves hook script)
 */
export class HooksCommand {
  private configService: ConfigService;
  private hookService: HookService;

  constructor(configService?: ConfigService, hookService?: HookService) {
    this.configService = configService ?? new ConfigService();
    this.hookService = hookService ?? new HookService();
  }

  async run(action: string): Promise<void> {
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
        return this.actionStatus(cwd, agents);
      case 'install':
        return this.actionInstall(cwd, agents);
      case 'uninstall':
        return this.actionUninstall(cwd, agents);
      default:
        console.log(
          pc.red(`Unknown action: ${action}`),
          '\nValid actions: status, install, uninstall',
        );
    }
  }

  // ---- actions ----

  private async actionStatus(cwd: string, agents: Agent[]): Promise<void> {
    const rows = await this.hookService.status({ rootDir: cwd, agents });

    console.log(pc.bold('\n🪝 Hook installation status\n'));

    if (rows.length === 0) {
      console.log(pc.gray('  (no agents configured)'));
      return;
    }

    for (const row of rows) {
      const badge = row.installed
        ? pc.green('✓ installed')
        : pc.gray('✗ not installed');
      console.log(`  ${row.agent.padEnd(12)} ${badge}`);
      for (const f of row.files) {
        console.log(`               ${pc.gray(f)}`);
      }
    }
  }

  private async actionInstall(cwd: string, agents: Agent[]): Promise<void> {
    console.log(pc.cyan('\n🪝 Installing skill-loader hooks...'));
    const report = await this.hookService.install({ rootDir: cwd, agents });
    this.printReport(report);
  }

  private async actionUninstall(cwd: string, agents: Agent[]): Promise<void> {
    const { removed } = await this.hookService.uninstall({
      rootDir: cwd,
      agents,
    });
    if (removed.length === 0) {
      console.log(pc.gray('Nothing to remove.'));
      return;
    }
    console.log(pc.green('✅ Removed hook files:'));
    for (const r of removed) {
      console.log(`   - ${pc.cyan(r.agent)} → ${pc.gray(r.file)}`);
    }
  }

  // ---- output ----

  private printReport(report: HookWriteReport): void {
    for (const w of report.writes) {
      const tag =
        w.action === 'added'
          ? pc.green('+ added   ')
          : w.action === 'updated'
            ? pc.cyan('~ updated ')
            : pc.gray('= up-to-date');
      console.log(`  ${tag} ${w.agent.padEnd(12)} ${pc.gray(w.file)}`);
    }
    if (report.unsupported.length > 0) {
      console.log(
        pc.gray(
          `\n(skipped — no hook support: ${report.unsupported.join(', ')})`,
        ),
      );
    }
    const added = report.writes.filter((w) => w.action !== 'skipped-existing');
    if (added.length > 0) {
      console.log(pc.green('\n✅ Hooks installed.'));
      console.log(
        pc.gray(
          '   Hooks fire before every Edit/Write — Claude will be reminded to load skills.',
        ),
      );
    }
  }
}
