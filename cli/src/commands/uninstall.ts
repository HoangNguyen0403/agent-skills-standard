import inquirer from 'inquirer';
import pc from 'picocolors';
import { Agent } from '../constants';
import { ConfigService } from '../services/ConfigService';
import {
  UninstallPlan,
  UninstallService,
} from '../services/install/UninstallService';

export interface UninstallOptions {
  all?: boolean;
  agent?: string[];
  category?: string[];
  yes?: boolean;
  dryRun?: boolean;
}

export class UninstallCommand {
  private service: UninstallService;
  private configService: ConfigService;
  private isTTY: () => boolean;
  private confirm: (message: string) => Promise<boolean>;

  constructor(
    service?: UninstallService,
    configService?: ConfigService,
    isTTY?: () => boolean,
    confirm?: (m: string) => Promise<boolean>,
  ) {
    this.service = service || new UninstallService();
    this.configService = configService || new ConfigService();
    this.isTTY = isTTY || (() => !!process.stdin.isTTY);
    this.confirm =
      confirm ||
      (async (message: string) => {
        const res = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'ok',
            message,
            default: false,
          },
        ]);
        return res.ok;
      });
  }

  async run(options: UninstallOptions): Promise<void> {
    const config = await this.configService.loadConfig();
    if (!config) {
      console.log(pc.red('❌ Error: .skillsrc not found. Run `init` first.'));
      process.exitCode = 1;
      return;
    }

    if (options.agent && options.agent.length > 0) {
      const validAgents = Object.values(Agent);
      const invalid = options.agent.filter(
        (a) => !validAgents.includes(a as Agent),
      );
      if (invalid.length > 0) {
        console.log(
          pc.red(
            `Invalid agent: ${invalid.join(', ')}. Valid agents: ${validAgents.join(', ')}`,
          ),
        );
        process.exitCode = 1;
        return;
      }
    }

    let plan: UninstallPlan;
    try {
      plan = await this.service.plan(process.cwd(), config, {
        all: options.all,
        agents: options.agent as Agent[] | undefined,
        categories: options.category,
      });
    } catch (err: unknown) {
      console.log(pc.red(err instanceof Error ? err.message : String(err)));
      process.exitCode = 1;
      return;
    }

    const hasIntegrations =
      plan.integrations.mcpAgents.length > 0 ||
      plan.integrations.hookAgents.length > 0 ||
      plan.integrations.clearAgentsIndex ||
      plan.deleteLock;

    if (plan.remove.length === 0 && !hasIntegrations) {
      console.log('Nothing to uninstall.');
      return;
    }

    console.log(
      `Uninstall: ${plan.remove.length} file(s) to remove, ${plan.keepEdited.length} edited file(s) kept, ${plan.sharedKept.length} shared path(s) kept`,
    );

    if (plan.integrations.mcpAgents.length > 0) {
      console.log(`  MCP entries: ${plan.integrations.mcpAgents.join(', ')}`);
    }
    if (plan.integrations.hookAgents.length > 0) {
      console.log(`  Hook registrations: ${plan.integrations.hookAgents.join(', ')}`);
    }
    if (plan.integrations.clearAgentsIndex) {
      console.log('  AGENTS.md index block: cleared');
    }

    const displayPaths = plan.remove.slice(0, 10);
    for (const p of displayPaths) {
      console.log(`  - ${p}`);
    }
    if (plan.remove.length > 10) {
      console.log(`  +${plan.remove.length - 10} more`);
    }

    if (options.dryRun) {
      return;
    }

    if (!this.isTTY() && !options.yes) {
      console.log(pc.yellow('Re-run with --yes to apply'));
      process.exitCode = 1;
      return;
    }

    if (!options.yes) {
      const ok = await this.confirm('Proceed with uninstall?');
      if (!ok) {
        return;
      }
    }

    const { removed, backupId } = await this.service.apply(
      process.cwd(),
      config,
      plan,
    );
    console.log(pc.green(`Removed ${removed.length} file(s)`));
    if (backupId) {
      console.log(
        pc.gray(
          `   Backup: .ags/backups/${backupId} (undo with ags restore ${backupId})`,
        ),
      );
    }
    console.log(
      pc.yellow(
        'Remove the matching entries from .skillsrc or the next ags sync reinstalls them.',
      ),
    );
    if (options.all) {
      console.log(pc.gray('CLAUDE.md was left unchanged.'));
    }
  }
}
