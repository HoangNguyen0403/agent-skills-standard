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

  async run(
    options: { agent?: string; strict?: boolean; attestation?: boolean } = {},
  ): Promise<void> {
    const config = await this.configService.loadConfig();
    if (!config) {
      console.log(pc.red('❌ Error: .skillsrc not found. Run `init` first.'));
      process.exitCode = 1;
      return;
    }

    const { found, checked, result } = await this.syncService.verifyInstall(
      config,
      options.agent as Agent | undefined,
    );

    if (!found) {
      console.log(
        pc.yellow('⚠️  .skills-lock.json not found — run `ags sync` first'),
      );
      process.exitCode = 1;
      return;
    }

    console.log(pc.cyan(`Checked ${checked} tracked file(s)`));

    let failed = false;

    if (result.ok) {
      console.log(pc.green('✅ All tracked files match the manifest.'));
    } else {
      failed = true;
      if (result.mismatches.length > 0) {
        for (const m of result.mismatches) {
          console.log(pc.yellow(`  ~ ${m} (edited or tampered)`));
        }
      }
      if (result.missing.length > 0) {
        for (const m of result.missing) {
          console.log(pc.red(`  - ${m}`));
        }
      }
    }

    if (options.strict) {
      const moved = await this.syncService.checkSourceCommits(config);
      if (moved.length > 0) {
        failed = true;
        for (const row of moved) {
          if (row.current === null) {
            console.log(
              pc.yellow(`? ${row.key}@${row.ref} could not be resolved`),
            );
          } else {
            console.log(
              pc.red(
                `✗ ${row.key}@${row.ref} now resolves to ${row.current.slice(0, 7)} (locked ${row.locked.slice(0, 7)})`,
              ),
            );
          }
        }
      }
    }

    if (options.attestation) {
      try {
        const attestations = await this.syncService.verifyAttestations(config);
        for (const a of attestations) {
          if (a.ok) {
            console.log(pc.green(`✓ ${a.key}@${a.ref}: ${a.detail}`));
          } else {
            failed = true;
            console.log(pc.red(`✗ ${a.key}@${a.ref}: ${a.detail}`));
          }
        }
      } catch (err) {
        failed = true;
        const msg = err instanceof Error ? err.message : String(err);
        console.log(pc.red(`✗ ${msg}`));
      }
    }

    if (failed) {
      process.exitCode = 1;
    }
  }
}
