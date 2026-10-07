import pc from 'picocolors';
import { BackupService } from '../services/install/BackupService';

export interface RestoreOptions {
  list?: boolean;
}

export class RestoreCommand {
  private backups: BackupService;

  constructor(backups?: BackupService) {
    this.backups = backups || new BackupService();
  }

  async run(
    id: string | undefined,
    options: RestoreOptions = {},
  ): Promise<void> {
    const cwd = process.cwd();

    if (options.list || !id) {
      const backups = await this.backups.list(cwd);
      if (backups.length === 0) {
        console.log('No backups found in .ags/backups');
        return;
      }
      for (const b of backups) {
        const fileWord = b.files.length === 1 ? 'file' : 'files';
        console.log(`  ${b.id} (${b.reason}, ${b.files.length} ${fileWord})`);
      }
      return;
    }

    try {
      const restored = await this.backups.restore(cwd, id);
      console.log(pc.green(`Restored ${restored.length} file(s) from ${id}`));
      console.log(pc.gray('Run ags verify to compare with .skills-lock.json'));
    } catch (err: unknown) {
      console.log(pc.red(err instanceof Error ? err.message : String(err)));
      process.exitCode = 1;
    }
  }
}
