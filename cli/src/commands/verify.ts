import pc from 'picocolors';
import { Agent } from '../constants';
import { ConfigService } from '../services/ConfigService';
import { SyncService } from '../services/SyncService';

/**
 * Command that checks installed skill files against .skills-lock.json,
 * catching drift between what `ags sync` fetched and what's actually on
 * disk — a tampered file, a partial write, or a manual edit.
 */
export class VerifyCommand {
  private configService: ConfigService;
  private syncService: SyncService;

  constructor(configService?: ConfigService, syncService?: SyncService) {
    this.configService = configService || new ConfigService();
    this.syncService = syncService || new SyncService();
  }

  async run(options: { agent?: string } = {}): Promise<void> {
    const config = await this.configService.loadConfig();
    if (!config) {
      console.log(pc.red('❌ Error: .skillsrc not found. Run `init` first.'));
      process.exitCode = 1;
      return;
    }

    const { agent, result } = await this.syncService.verifyLockfile(
      config,
      options.agent as Agent | undefined,
    );

    if (!agent) {
      console.log(pc.red(`❌ ${result.missing.join(', ')}`));
      process.exitCode = 1;
      return;
    }

    console.log(pc.cyan(`🔍 Verifying skills installed for ${agent}...`));

    if (result.ok) {
      console.log(pc.green('✅ All installed skill files match the lockfile.'));
      return;
    }

    if (result.missing.length > 0) {
      console.log(pc.red(`\n❌ Missing (${result.missing.length}):`));
      for (const m of result.missing) console.log(pc.red(`  - ${m}`));
    }
    if (result.mismatches.length > 0) {
      console.log(
        pc.red(`\n❌ Content mismatch (${result.mismatches.length}):`),
      );
      for (const m of result.mismatches) console.log(pc.red(`  - ${m}`));
    }
    console.log(
      pc.yellow(
        '\nRun `ags sync` to restore the registry version, or investigate why these files diverged.',
      ),
    );
    process.exitCode = 1;
  }
}
