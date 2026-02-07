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
  async run() {
    try {
      // 1. Load Config
      let config = await this.configService.loadConfig();
      if (!config) {
        console.log(pc.red('❌ Error: .skillsrc not found. Run `init` first.'));
        return;
      }

      // 2. Dynamic Update Configuration (Re-detection)
      const projectDeps = await this.detectionService.getProjectDeps();
      await this.syncService.reconcileConfig(config, projectDeps);

      // 3. Check for updates (Simplified for now)
      config = await this.syncService.checkForUpdates(config);

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
      await this.syncService.writeWorkflows(workflows);

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
