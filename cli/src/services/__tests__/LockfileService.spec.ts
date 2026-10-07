import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Agent } from '../../constants';
import {
  LockfileService,
  LOCKFILE_NAME,
  ManifestEntry,
  SkillsLockFile,
  sha256,
} from '../LockfileService';

describe('LockfileService v2', () => {
  let service: LockfileService;
  let root: string;

  beforeEach(async () => {
    service = new LockfileService();
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-lock-test-'));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  it('load with no file returns lock: null, migratedFromV1: false', async () => {
    const loaded = await service.load(root, [Agent.Claude]);
    expect(loaded).toEqual({ lock: null, migratedFromV1: false });
  });

  it('load of a v1 file migrates to v2 format with entries and sources', async () => {
    const v1Content = {
      version: 1,
      registry: 'r',
      generatedAt: 't',
      skills: {
        'typescript/typescript-core': {
          ref: 'typescript-v1.0.0',
          files: {
            'SKILL.md': 'h1',
            'references/a.md': 'h2',
          },
          contentHash: 'x',
        },
      },
    };
    await fs.writeJson(path.join(root, LOCKFILE_NAME), v1Content);

    const loaded = await service.load(root, [Agent.Claude, Agent.Kiro]);
    expect(loaded.migratedFromV1).toBe(true);
    expect(loaded.lock).toBeDefined();
    expect(loaded.lock?.version).toBe(2);
    expect(loaded.lock?.registry).toBe('r');
    expect(loaded.lock?.generatedAt).toBe('t');
    expect(loaded.lock?.sources).toEqual({
      'skills/typescript': { ref: 'typescript-v1.0.0', commit: null },
    });

    const entries = loaded.lock?.entries ?? {};
    expect(Object.keys(entries).sort()).toEqual([
      '.claude/skills/typescript/typescript-core/SKILL.md',
      '.claude/skills/typescript/typescript-core/references/a.md',
    ]);
    expect(
      entries['.claude/skills/typescript/typescript-core/SKILL.md'],
    ).toEqual({
      owner: 'skill',
      source: 'skill:typescript/typescript-core@typescript-v1.0.0',
      agent: 'claude',
      sha256: 'h1',
    });
    expect(
      entries['.claude/skills/typescript/typescript-core/references/a.md'],
    ).toEqual({
      owner: 'skill',
      source: 'skill:typescript/typescript-core@typescript-v1.0.0',
      agent: 'claude',
      sha256: 'h2',
    });
  });

  it('write then load round-trips a v2 lock with sorted entry keys', async () => {
    const lock: SkillsLockFile = {
      version: 2,
      registry: 'https://github.com/test/repo',
      generatedAt: '2026-09-27T00:00:00.000Z',
      sources: {
        'skills/typescript': { ref: 'v1.0.0', commit: null },
      },
      entries: {
        'z/file.md': {
          owner: 'skill',
          source: 'skill:typescript/z@v1.0.0',
          agent: 'claude',
          sha256: 'hz',
        },
        'a/file.md': {
          owner: 'skill',
          source: 'skill:typescript/a@v1.0.0',
          agent: 'claude',
          sha256: 'ha',
        },
      },
    };

    await service.write(root, lock);
    const loaded = await service.load(root, [Agent.Claude]);
    expect(loaded.migratedFromV1).toBe(false);
    expect(loaded.lock).toEqual(lock);

    // Verify raw JSON keys are written in sorted order
    const raw = await fs.readJson(path.join(root, LOCKFILE_NAME));
    expect(Object.keys(raw.entries)).toEqual(['a/file.md', 'z/file.md']);
  });

  it('disclosed handling: write preserves existing disclosed, writeDisclosed behavior', async () => {
    // writeDisclosed on missing file creates nothing
    await service.writeDisclosed(root, { claude: ['hooks'] });
    expect(await fs.pathExists(path.join(root, LOCKFILE_NAME))).toBe(false);
    expect(await service.readDisclosed(root)).toBeUndefined();

    // writeDisclosed on a v1 file keeps version: 1 content and adds disclosed
    const v1Content = {
      version: 1,
      registry: 'r',
      generatedAt: 't',
      skills: {},
    };
    await fs.writeJson(path.join(root, LOCKFILE_NAME), v1Content);
    await service.writeDisclosed(root, { claude: ['hooks'] });
    const rawV1 = await fs.readJson(path.join(root, LOCKFILE_NAME));
    expect(rawV1.version).toBe(1);
    expect(rawV1.disclosed).toEqual({ claude: ['hooks'] });
    expect(await service.readDisclosed(root)).toEqual({ claude: ['hooks'] });

    // write keeps existing disclosed when new lock has none
    const lock: SkillsLockFile = {
      version: 2,
      registry: 'r',
      generatedAt: 't2',
      sources: {},
      entries: {},
    };
    await service.write(root, lock);
    const rawV2 = await fs.readJson(path.join(root, LOCKFILE_NAME));
    expect(rawV2.disclosed).toEqual({ claude: ['hooks'] });
  });

  it('verifyEntries checks matching, edited, and missing files, filtering by agent', async () => {
    const fileA = 'a.md';
    const fileB = 'b.md';
    const fileC = 'c.md';
    const fileD = 'd.md';

    await fs.outputFile(path.join(root, fileA), 'content-a');
    await fs.outputFile(path.join(root, fileB), 'content-b-edited');
    await fs.outputFile(path.join(root, fileD), 'content-d');
    // fileC is not created -> missing

    const hashA = sha256('content-a');
    const hashBOrig = sha256('content-b-original');
    const hashC = sha256('content-c');
    const hashD = sha256('content-d');

    const entries: Record<string, ManifestEntry> = {
      [fileA]: { owner: 'skill', source: 's', agent: 'claude', sha256: hashA },
      [fileB]: {
        owner: 'skill',
        source: 's',
        agent: 'claude',
        sha256: hashBOrig,
      },
      [fileC]: { owner: 'skill', source: 's', agent: 'claude', sha256: hashC },
      [fileD]: { owner: 'skill', source: 's', agent: 'cursor', sha256: hashD },
    };

    // All agents
    const resultAll = await service.verifyEntries(root, entries);
    expect(resultAll.ok).toBe(false);
    expect(resultAll.mismatches).toEqual([fileB]);
    expect(resultAll.missing).toEqual([fileC]);

    // Filtered to cursor: only fileD which matches
    const resultCursor = await service.verifyEntries(
      root,
      entries,
      Agent.Cursor,
    );
    expect(resultCursor.ok).toBe(true);
    expect(resultCursor.mismatches).toEqual([]);
    expect(resultCursor.missing).toEqual([]);

    // Filtered to claude: fileB mismatches, fileC missing
    const resultClaude = await service.verifyEntries(
      root,
      entries,
      Agent.Claude,
    );
    expect(resultClaude.ok).toBe(false);
    expect(resultClaude.mismatches).toEqual([fileB]);
    expect(resultClaude.missing).toEqual([fileC]);
  });

  // Test intent: raw resource bytes, not UTF-8 replacement characters, define
  // lock integrity; 0xff and 0xfe must produce a real tamper mismatch.
  it('reports a binary resource mismatch when only an invalid UTF-8 byte changes', async () => {
    const rel = '.claude/skills/typescript/typescript-core/assets/payload.bin';
    const entries: Record<string, ManifestEntry> = {
      [rel]: {
        owner: 'skill',
        source: 's',
        agent: 'claude',
        sha256: sha256(Buffer.from([0xff])),
      },
    };
    await fs.outputFile(path.join(root, rel), Buffer.from([0xfe]));

    await expect(service.verifyEntries(root, entries)).resolves.toEqual({
      ok: false,
      mismatches: [rel],
      missing: [],
    });
  });
});
