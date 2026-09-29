import fs from 'fs-extra';
import path from 'path';
import { ManifestEntry, Owner, sha256 } from '../LockfileService';
import { BackupService, BackupSession } from './BackupService';
import { removeEmptyParents } from './fsUtil';
import { isOverriddenRel, toPosixRel } from './pathMatch';

export interface WriteMeta {
  owner: Owner;
  source: string;
  agent: string;
}

export interface InstallWriter {
  write(absPath: string, content: string | Buffer, meta: WriteMeta): Promise<void>;
}

export class PassthroughWriter implements InstallWriter {
  async write(absPath: string, content: string | Buffer): Promise<void> {
    await fs.outputFile(absPath, content);
  }
}

export interface InstallPlan {
  added: string[];
  updated: string[];
  unchanged: string[];
  kept: string[]; // owned but edited by the user -> not overwritten
  unknown: string[]; // exists, not owned -> not overwritten
  pruned: string[]; // owned, unchanged, no longer desired -> deleted (backed up)
  keptOrphans: string[]; // owned, edited, no longer desired -> left in place, record dropped
  backupId: string | null;
}

export interface OwnershipWriterOptions {
  rootDir: string;
  previous: Record<string, ManifestEntry>;
  dryRun: boolean;
  force: Set<string>;
  adoptUnknown: boolean;
  overrides: string[];
  backups: BackupService;
}

export class OwnershipWriter implements InstallWriter {
  readonly plan: InstallPlan = {
    added: [],
    updated: [],
    unchanged: [],
    kept: [],
    unknown: [],
    pruned: [],
    keptOrphans: [],
    backupId: null,
  };
  private next: Record<string, ManifestEntry> = {};
  private touched = new Set<string>();
  private session: BackupSession | null = null;

  constructor(private opts: OwnershipWriterOptions) {}

  async write(absPath: string, content: string | Buffer, meta: WriteMeta): Promise<void> {
    const rel = toPosixRel(this.opts.rootDir, absPath);
    this.touched.add(rel);
    const incoming = sha256(content);
    const entry: ManifestEntry = { ...meta, sha256: incoming };
    const prev = this.opts.previous[rel];

    if (!(await fs.pathExists(absPath))) {
      await this.put(absPath, content);
      this.plan.added.push(rel);
      this.next[rel] = entry;
      return;
    }
    const current = sha256(await fs.readFile(absPath));
    if (current === incoming) {
      this.plan.unchanged.push(rel);
      this.next[rel] = entry;
      return;
    }
    if (prev && current === prev.sha256) {
      await this.put(absPath, content);
      this.plan.updated.push(rel);
      this.next[rel] = entry;
      return;
    }
    if (this.opts.force.has(rel)) {
      await this.backup(rel);
      await this.put(absPath, content);
      this.plan.updated.push(rel);
      this.next[rel] = entry;
      return;
    }
    if (prev) {
      this.plan.kept.push(rel);
      this.next[rel] = prev;
      return;
    }
    if (this.opts.adoptUnknown) {
      await this.put(absPath, content);
      this.plan.updated.push(rel);
      this.next[rel] = entry;
      return;
    }
    this.plan.unknown.push(rel);
  }

  async finalize(shouldPrune: (rel: string, entry: ManifestEntry) => boolean) {
    for (const rel of Object.keys(this.opts.previous).sort()) {
      if (this.touched.has(rel)) continue;
      const prev = this.opts.previous[rel];
      if (isOverriddenRel(rel, this.opts.overrides) || !shouldPrune(rel, prev)) {
        this.next[rel] = prev;
        continue;
      }
      const abs = path.join(this.opts.rootDir, rel);
      if (!(await fs.pathExists(abs))) continue;
      if (sha256(await fs.readFile(abs)) !== prev.sha256) {
        this.plan.keptOrphans.push(rel);
        continue;
      }
      if (!this.opts.dryRun) {
        await this.backup(rel);
        await fs.remove(abs);
        await removeEmptyParents(this.opts.rootDir, path.dirname(abs));
      }
      this.plan.pruned.push(rel);
    }
    if (this.session) this.plan.backupId = await this.session.commit();
    const entries = Object.fromEntries(
      Object.keys(this.next)
        .sort()
        .map((k) => [k, this.next[k]]),
    );
    return { plan: this.plan, entries };
  }

  private async put(absPath: string, content: string | Buffer): Promise<void> {
    if (!this.opts.dryRun) await fs.outputFile(absPath, content);
  }

  private async backup(rel: string): Promise<void> {
    if (this.opts.dryRun) return;
    this.session ??= await this.opts.backups.begin(this.opts.rootDir, 'sync');
    await this.session.add(rel);
  }

}
