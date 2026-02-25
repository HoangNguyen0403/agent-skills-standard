import inquirer from 'inquirer';
import pc from 'picocolors';
import { ConfigService } from '../services/ConfigService';
import { DetectionService } from '../services/DetectionService';
import { SyncService } from '../services/SyncService';

/**
 * Command for synchronizing skills and workflows from the remote registry to the local workspace.
 * It handles configuration re-detection, fetching files, writing to disk, and updating indices.
 */
export class SyncCommand {
  private configService: ConfigService;
  private detectionService: DetectionService;
  private syncService: SyncService;

  constructor(
    configService?: ConfigService,
    detectionService?: DetectionService,
    syncService?: SyncService,
  ) {
    this.configService = configService || new ConfigService();
    this.detectionService = detectionService || new DetectionService();
    this.syncService = syncService || new SyncService();
  }

  /**
   * Executes the synchronization flow.
   * Reconciles dependencies, fetches skills and workflows from the registry, and updates AGENTS.md.
   */
  async run(options: { yes?: boolean } = {}) {
    try {
      // 1. Load Config
      const config = await this.configService.loadConfig();
      if (!config) {
        console.log(pc.red('❌ Error: .skillsrc not found. Run `init` first.'));
        return;
      }

      // 2. Dynamic Update Configuration (Re-detection)
      const projectDeps = await this.detectionService.getProjectDeps();
      const skillsChanged = await this.syncService.reconcileConfig(
        config,
        projectDeps,
      );
      const workflowsChanged =
        await this.syncService.reconcileWorkflows(config);

      if (skillsChanged || workflowsChanged) {
        await this.configService.saveConfig(config);
      }

      // 3. Check for updates
      const updates = await this.syncService.checkForUpdates(config);

      if (updates) {
        console.log(pc.yellow('\n🚀 New skill versions detected:'));
        for (const [cat, ref] of Object.entries(updates)) {
          console.log(
            pc.gray(`  - ${cat}: ${config.skills[cat].ref} -> ${ref}`),
          );
        }

        let update = options.yes;
        if (update === undefined) {
          if (!process.stdin.isTTY) {
            console.log(
              pc.cyan(
                'ℹ️  Non-interactive environment detected. Skipping version updates. Use --yes to auto-confirm.',
              ),
            );
            update = false;
          } else {
            const answer = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'update',
                message: 'Do you want to update .skillsrc with these versions?',
                default: true,
              },
            ]);
            update = answer.update;
          }
        }

        if (update) {
          for (const [cat, ref] of Object.entries(updates)) {
            config.skills[cat].ref = ref;
          }
          await this.configService.saveConfig(config);
          console.log(pc.green('✅ .skillsrc updated.'));
        } else {
          console.log(
            pc.cyan('ℹ️  Skipping version updates, staying on pinned refs.'),
          );
        }
      }

      console.log(pc.cyan(`🚀 Syncing skills from ${config.registry}...`));

      // 4. Assemble skills from remote registry
      const enabledCategories = Object.keys(config.skills);
      const skills = await this.syncService.assembleSkills(
        enabledCategories,
        config,
      );

      // 4b. Assemble workflows
      const workflows = await this.syncService.assembleWorkflows(config);

      // 5. Write skills and workflows to target
      await this.syncService.writeSkills(skills, config);
      await this.syncService.writeWorkflows(workflows, config);

      // 6. Automatically apply framework-specific indices to AGENTS.md
      await this.syncService.applyIndices(config, config.agents);

      console.log(pc.green('✅ All skills synced successfully!'));
    } catch (error) {
      if (error instanceof Error) {
        console.error(pc.red('❌ Sync failed:'), error.message);
      } else {
        console.error(pc.red('❌ Sync failed:'), String(error));
      }
    }
  }
}
