import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import path from 'path';
import { CollectedSkill } from '../models/types';

export const LOCKFILE_NAME = '.skills-lock.json';

export interface LockedSkillEntry {
  /** Git ref (tag/branch/sha) this skill was fetched at. */
  ref: string;
  /** relative file path -> sha256 hex of its content, as written to disk. */
  files: Record<string, string>;
  /** sha256 over the sorted `path\0hash\n` lines of `files` — one hash for the whole skill. */
  contentHash: string;
}

export interface SkillsLockFile {
  version: 1;
  registry: string;
  generatedAt: string;
  skills: Record<string, LockedSkillEntry>;
}

export interface VerifyResult {
  ok: boolean;
  /** Files present on disk whose content hash no longer matches the lockfile. */
  mismatches: string[];
  /** Files the lockfile expects but that are missing on disk. */
  missing: string[];
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function contentHashOf(files: Record<string, string>): string {
  const lines = Object.keys(files)
    .sort()
    .map((p) => `${p}\0${files[p]}\n`)
    .join('');
  return sha256(lines);
}

/**
 * Records the sha256 of every file `ags sync` writes for a skill, so a later
 * `ags verify` can detect drift between what was fetched and what's actually
 * on disk — tampering, a partial write, or a manual edit that silently
 * diverged from the registry. This is deliberately scoped to local
 * tamper-detection: it does not (yet) resolve refs to commits or detect a
 * moved tag on the registry side — see docs/SECURITY.md's OWASP AST table
 * (AST07) for that follow-up.
 */
export class LockfileService {
  private lockfilePath(rootDir: string): string {
    return path.join(rootDir, LOCKFILE_NAME);
  }

  buildEntries(
    skills: CollectedSkill[],
    refByCategory: Record<string, string>,
  ): Record<string, LockedSkillEntry> {
    const entries: Record<string, LockedSkillEntry> = {};
    for (const skill of skills) {
      const files: Record<string, string> = {};
      for (const file of skill.files) {
        files[file.name] = sha256(file.content);
      }
      entries[`${skill.category}/${skill.skill}`] = {
        ref: refByCategory[skill.category] || 'unknown',
        files,
        contentHash: contentHashOf(files),
      };
    }
    return entries;
  }

  async write(
    rootDir: string,
    registry: string,
    skills: CollectedSkill[],
    refByCategory: Record<string, string>,
  ): Promise<void> {
    if (skills.length === 0) return;
    const lock: SkillsLockFile = {
      version: 1,
      registry,
      generatedAt: new Date().toISOString(),
      skills: this.buildEntries(skills, refByCategory),
    };
    await fs.writeJson(this.lockfilePath(rootDir), lock, { spaces: 2 });
  }

  async read(rootDir: string): Promise<SkillsLockFile | null> {
    const file = this.lockfilePath(rootDir);
    if (!(await fs.pathExists(file))) return null;
    return fs.readJson(file);
  }

  /**
   * Recomputes the sha256 of every file the lockfile knows about, under
   * `installedPath/<category>/<skill>/<relPath>` (the standard, non-Kiro
   * layout `SkillSyncService.writeSkillForAgent` uses), and compares.
   */
  async verify(rootDir: string, installedPath: string): Promise<VerifyResult> {
    const lock = await this.read(rootDir);
    if (!lock) {
      return {
        ok: false,
        mismatches: [],
        missing: [`${LOCKFILE_NAME} not found — run 'ags sync' first`],
      };
    }

    const mismatches: string[] = [];
    const missing: string[] = [];

    for (const [skillKey, entry] of Object.entries(lock.skills)) {
      for (const [relPath, expectedHash] of Object.entries(entry.files)) {
        const label = `${skillKey}/${relPath}`;
        const filePath = path.join(installedPath, skillKey, relPath);
        if (!(await fs.pathExists(filePath))) {
          missing.push(label);
          continue;
        }
        const content = await fs.readFile(filePath, 'utf8');
        if (sha256(content) !== expectedHash) {
          mismatches.push(label);
        }
      }
    }

    return {
      ok: mismatches.length === 0 && missing.length === 0,
      mismatches,
      missing,
    };
  }
}
