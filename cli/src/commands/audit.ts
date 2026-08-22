import pc from 'picocolors';
import { LockfileService } from '../services/LockfileService';

/**
 * Prints the skill inventory recorded in .skills-lock.json — the AST09
 * "skill inventory" governance control: what's installed, from which ref,
 * and how many files each skill carries.
 */
export class AuditCommand {
  private lockfileService: LockfileService;

  constructor(lockfileService?: LockfileService) {
    this.lockfileService = lockfileService || new LockfileService();
  }

  async run(): Promise<void> {
    const lock = await this.lockfileService.read(process.cwd());
    if (!lock) {
      console.log(
        pc.yellow(
          'No .skills-lock.json found. Run `ags sync` first to generate one.',
        ),
      );
      process.exitCode = 1;
      return;
    }

    const entries = Object.entries(lock.skills).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    console.log(pc.cyan(`📋 Skill inventory (${lock.registry})`));
    console.log(pc.gray(`   Generated: ${lock.generatedAt}\n`));

    if (entries.length === 0) {
      console.log(pc.gray('  (no skills recorded)'));
      return;
    }

    for (const [skillKey, entry] of entries) {
      const fileCount = Object.keys(entry.files).length;
      console.log(
        `  ${pc.bold(skillKey.padEnd(40))} ${pc.gray(entry.ref.padEnd(24))} ${fileCount} file${fileCount === 1 ? '' : 's'}`,
      );
    }

    console.log(pc.gray(`\n  ${entries.length} skill(s) total`));
  }
}
