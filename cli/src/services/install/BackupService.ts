import fs from 'fs-extra';
import path from 'path';
import { assertNoSymlinksUnderRoot } from './safePath';
export interface BackupManifest {
  id: string;
  createdAt: string;
  reason: string;
  files: string[];
}

export class BackupSession {
  private added = new Set<string>();

  constructor(
    readonly id: string,
    private rootDir: string,
    private backupDir: string,
    private reason: string,
    private createdAt: string,
    private keep: number,
  ) {}

  async add(rel: string): Promise<void> {
    const normalized = rel.replace(/\\/g, '/');
    if (this.added.has(normalized)) return;
    const src = path.join(this.rootDir, normalized);
    await assertNoSymlinksUnderRoot(this.rootDir, src);
    if (!(await fs.pathExists(src))) return;

    const dest = path.join(this.backupDir, 'files', normalized);
    await assertNoSymlinksUnderRoot(this.rootDir, dest);
    await fs.copy(src, dest, { overwrite: true });
    this.added.add(normalized);
  }

  async commit(): Promise<string> {
    const manifest: BackupManifest = {
      id: this.id,
      createdAt: this.createdAt,
      reason: this.reason,
      files: Array.from(this.added),
    };
    const manifestPath = path.join(this.backupDir, 'manifest.json');
    await assertNoSymlinksUnderRoot(this.rootDir, manifestPath);
    await fs.outputJson(manifestPath, manifest, {
      spaces: 2,
    });

    // Prune old backups beyond `keep`
    const backupsDir = path.dirname(this.backupDir);
    if (await fs.pathExists(backupsDir)) {
      const entries = await fs.readdir(backupsDir, { withFileTypes: true });
      const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

      const manifests: { dir: string; createdAt: string }[] = [];
      for (const dir of dirs) {
        const mPath = path.join(backupsDir, dir, 'manifest.json');
        if (await fs.pathExists(mPath)) {
          try {
            const m = await fs.readJson(mPath);
            manifests.push({ dir, createdAt: m.createdAt ?? dir });
            continue;
          } catch {
            // fallback below
          }
        }
        manifests.push({ dir, createdAt: dir });
      }

      // Sort newest first
      manifests.sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || b.dir.localeCompare(a.dir),
      );

      const toRemove = manifests.slice(this.keep);
      for (const item of toRemove) {
        await fs.remove(path.join(backupsDir, item.dir));
      }
    }

    return this.id;
  }
}

export class BackupService {
  constructor(
    private keep: number = 3,
    private now: () => Date = () => new Date(),
  ) {}

  async begin(rootDir: string, reason: string): Promise<BackupSession> {
    const agsDir = path.join(rootDir, '.ags');
    await assertNoSymlinksUnderRoot(rootDir, agsDir);
    await fs.ensureDir(agsDir);
    const gitignorePath = path.join(agsDir, '.gitignore');
    await assertNoSymlinksUnderRoot(rootDir, gitignorePath);
    const defaultGitignore = 'backups/\npolicy-candidates.json\n';
    if (!(await fs.pathExists(gitignorePath))) {
      await fs.writeFile(gitignorePath, defaultGitignore, 'utf8');
    } else {
      const existing = await fs.readFile(gitignorePath, 'utf8');
      if (existing === '*\n') {
        await fs.writeFile(gitignorePath, defaultGitignore, 'utf8');
      }
    }

    const backupsDir = path.join(agsDir, 'backups');
    await assertNoSymlinksUnderRoot(rootDir, backupsDir);
    await fs.ensureDir(backupsDir);

    const date = this.now();
    const baseId = this.formatId(date);
    let id = baseId;
    let counter = 2;
    while (await fs.pathExists(path.join(backupsDir, id))) {
      id = `${baseId}-${counter}`;
      counter++;
    }

    const backupDir = path.join(backupsDir, id);
    await assertNoSymlinksUnderRoot(rootDir, backupDir);
    await fs.ensureDir(backupDir);

    return new BackupSession(
      id,
      rootDir,
      backupDir,
      reason,
      date.toISOString(),
      this.keep,
    );
  }

  async list(rootDir: string): Promise<BackupManifest[]> {
    const backupsDir = path.join(rootDir, '.ags', 'backups');
    if (!(await fs.pathExists(backupsDir))) return [];

    const entries = await fs.readdir(backupsDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    const manifests: BackupManifest[] = [];
    for (const dir of dirs) {
      const mPath = path.join(backupsDir, dir, 'manifest.json');
      if (await fs.pathExists(mPath)) {
        try {
          const m = await fs.readJson(mPath);
          manifests.push(m);
        } catch {
          // ignore corrupted
        }
      }
    }

    manifests.sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
    );
    return manifests;
  }

  async restore(rootDir: string, id: string): Promise<string[]> {
    const backupDir = path.join(rootDir, '.ags', 'backups', id);
    if (!(await fs.pathExists(backupDir))) {
      throw new Error(`Backup ${id} not found`);
    }

    const manifestPath = path.join(backupDir, 'manifest.json');
    if (!(await fs.pathExists(manifestPath))) {
      throw new Error(`Backup ${id} manifest not found`);
    }

    const manifest: BackupManifest = await fs.readJson(manifestPath);
    const restored: string[] = [];

    for (const rel of manifest.files) {
      const src = path.join(backupDir, 'files', rel);
      if (await fs.pathExists(src)) {
        const dest = path.join(rootDir, rel);
        await assertNoSymlinksUnderRoot(rootDir, dest);
        await fs.copy(src, dest, { overwrite: true });
        restored.push(rel);
      }
    }

    return restored;
  }

  private formatId(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const h = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    return `${y}${m}${day}-${h}${min}${s}`;
  }
}
