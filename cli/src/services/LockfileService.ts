import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import path from 'path';
import { Agent, getAgentDefinition } from '../constants';

export const LOCKFILE_NAME = '.skills-lock.json';
export type Owner = 'skill' | 'workflow' | 'specialist' | 'bridge' | 'index';

export interface ManifestEntry {
  owner: Owner;
  source: string;
  agent: string;
  sha256: string;
}

export interface SourceRef {
  ref: string;
  commit: string | null;
}

export interface SkillsLockFile {
  version: 2;
  registry: string;
  generatedAt: string;
  sources: Record<string, SourceRef>;
  entries: Record<string, ManifestEntry>;
  disclosed?: Record<string, string[]>;
}

export interface LoadedLock {
  lock: SkillsLockFile | null;
  migratedFromV1: boolean;
}

export interface VerifyResult {
  ok: boolean;
  mismatches: string[];
  missing: string[];
}

export function sha256(content: Buffer | string): string {
  return createHash('sha256')
    .update(content, Buffer.isBuffer(content) ? undefined : 'utf8')
    .digest('hex');
}

export function migrateV1(v1: unknown, agents: Agent[]): SkillsLockFile {
  const old = v1 as {
    registry?: string;
    generatedAt?: string;
    disclosed?: Record<string, string[]>;
    skills?: Record<string, { ref: string; files: Record<string, string> }>;
  };
  const sources: Record<string, SourceRef> = {};
  const entries: Record<string, ManifestEntry> = {};
  for (const [key, skill] of Object.entries(old.skills ?? {})) {
    const [category, name] = key.split('/');
    sources[`skills/${category}`] = { ref: skill.ref, commit: null };
    for (const agent of agents) {
      if (agent === Agent.Kiro) continue; // v1 hashed pre-transform content; Kiro files are re-adopted
      const base = getAgentDefinition(agent).path;
      for (const [rel, hash] of Object.entries(skill.files)) {
        entries[`${base}/${category}/${name}/${rel}`] = {
          owner: 'skill',
          source: `skill:${category}/${name}@${skill.ref}`,
          agent,
          sha256: hash,
        };
      }
    }
  }
  return {
    version: 2,
    registry: old.registry ?? '',
    generatedAt: old.generatedAt ?? '',
    sources,
    entries,
    ...(old.disclosed ? { disclosed: old.disclosed } : {}),
  };
}

export class LockfileService {
  private lockfilePath(rootDir: string): string {
    return path.join(rootDir, LOCKFILE_NAME);
  }

  async load(rootDir: string, agents: Agent[]): Promise<LoadedLock> {
    const file = this.lockfilePath(rootDir);
    if (!(await fs.pathExists(file))) {
      return { lock: null, migratedFromV1: false };
    }
    const raw = await fs.readJson(file);
    if (raw.version === 2) {
      return { lock: raw as SkillsLockFile, migratedFromV1: false };
    }
    if (raw.version === 1) {
      return { lock: migrateV1(raw, agents), migratedFromV1: true };
    }
    throw new Error('Unsupported .skills-lock.json version');
  }

  async write(rootDir: string, lock: SkillsLockFile): Promise<void> {
    const file = this.lockfilePath(rootDir);
    let existingDisclosed: Record<string, string[]> | undefined;
    if (await fs.pathExists(file)) {
      try {
        const raw = await fs.readJson(file);
        existingDisclosed = raw?.disclosed;
      } catch {
        // ignore malformed existing file
      }
    }
    const disclosed = lock.disclosed ?? existingDisclosed;
    const sortedEntries: Record<string, ManifestEntry> = {};
    for (const k of Object.keys(lock.entries).sort()) {
      sortedEntries[k] = lock.entries[k];
    }
    const out: SkillsLockFile = {
      ...lock,
      entries: sortedEntries,
      ...(disclosed ? { disclosed } : {}),
    };
    if (!disclosed) {
      delete out.disclosed;
    }
    await fs.writeJson(file, out, { spaces: 2 });
  }

  async readDisclosed(rootDir: string): Promise<Record<string, string[]> | undefined> {
    const file = this.lockfilePath(rootDir);
    if (!(await fs.pathExists(file))) return undefined;
    const raw = await fs.readJson(file);
    return raw?.disclosed;
  }

  async writeDisclosed(rootDir: string, disclosed: Record<string, string[]>): Promise<void> {
    const file = this.lockfilePath(rootDir);
    if (!(await fs.pathExists(file))) return;
    const raw = await fs.readJson(file);
    await fs.writeJson(file, { ...raw, disclosed }, { spaces: 2 });
  }

  async verifyEntries(
    rootDir: string,
    entries: Record<string, ManifestEntry>,
    agent?: Agent,
  ): Promise<VerifyResult> {
    const mismatches: string[] = [];
    const missing: string[] = [];
    for (const [rel, entry] of Object.entries(entries)) {
      if (agent && entry.agent !== agent) continue;
      const absPath = path.join(rootDir, rel);
      if (!(await fs.pathExists(absPath))) {
        missing.push(rel);
        continue;
      }
      // Raw bytes, not UTF-8 decoded text, define integrity (binary resources).
      const content = await fs.readFile(absPath);
      if (sha256(content) !== entry.sha256) {
        mismatches.push(rel);
      }
    }
    return {
      ok: mismatches.length === 0 && missing.length === 0,
      mismatches,
      missing,
    };
  }
}
