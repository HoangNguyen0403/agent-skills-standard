import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CollectedSkill } from '../../models/types';
import { LockfileService, LOCKFILE_NAME } from '../LockfileService';

describe('LockfileService', () => {
  let service: LockfileService;
  let root: string;

  beforeEach(async () => {
    service = new LockfileService();
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'lockfile-svc-'));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  function skill(overrides: Partial<CollectedSkill> = {}): CollectedSkill {
    return {
      category: 'typescript',
      skill: 'typescript-core',
      files: [{ name: 'SKILL.md', content: '# TS Core\ninstructions' }],
      ...overrides,
    };
  }

  it('returns null when no lockfile exists yet', async () => {
    expect(await service.read(root)).toBeNull();
  });

  it('writes a lockfile with a sha256 per file and a skill-level contentHash', async () => {
    await service.write(root, 'https://github.com/o/r', [skill()], {
      typescript: 'typescript-v1.3.4',
    });

    const lock = await service.read(root);
    expect(lock).not.toBeNull();
    expect(lock!.version).toBe(1);
    expect(lock!.registry).toBe('https://github.com/o/r');

    const entry = lock!.skills['typescript/typescript-core'];
    expect(entry.ref).toBe('typescript-v1.3.4');
    expect(entry.files['SKILL.md']).toMatch(/^[0-9a-f]{64}$/);
    expect(entry.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is a no-op when there are no skills to lock', async () => {
    await service.write(root, 'https://github.com/o/r', [], {});
    expect(await fs.pathExists(path.join(root, LOCKFILE_NAME))).toBe(false);
  });

  it('reports ok:true when installed files match the lockfile', async () => {
    await service.write(root, 'https://github.com/o/r', [skill()], {
      typescript: 'typescript-v1.3.4',
    });

    const installedPath = path.join(root, 'installed');
    await fs.outputFile(
      path.join(installedPath, 'typescript/typescript-core/SKILL.md'),
      '# TS Core\ninstructions',
    );

    const result = await service.verify(root, installedPath);
    expect(result).toEqual({ ok: true, mismatches: [], missing: [] });
  });

  it('reports a mismatch when the installed file content diverged', async () => {
    await service.write(root, 'https://github.com/o/r', [skill()], {
      typescript: 'typescript-v1.3.4',
    });

    const installedPath = path.join(root, 'installed');
    await fs.outputFile(
      path.join(installedPath, 'typescript/typescript-core/SKILL.md'),
      '# TS Core\nTAMPERED',
    );

    const result = await service.verify(root, installedPath);
    expect(result.ok).toBe(false);
    expect(result.mismatches).toEqual(['typescript/typescript-core/SKILL.md']);
    expect(result.missing).toEqual([]);
  });

  it('reports a missing file when it was deleted after sync', async () => {
    await service.write(root, 'https://github.com/o/r', [skill()], {
      typescript: 'typescript-v1.3.4',
    });

    const installedPath = path.join(root, 'installed');
    // Directory exists but the file itself doesn't.
    await fs.ensureDir(installedPath);

    const result = await service.verify(root, installedPath);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(['typescript/typescript-core/SKILL.md']);
  });

  it('reports not-ok with a helpful message when no lockfile exists', async () => {
    const result = await service.verify(root, path.join(root, 'installed'));
    expect(result.ok).toBe(false);
    expect(result.missing[0]).toContain(LOCKFILE_NAME);
  });

  it('produces the same lockfile content on repeated writes of the same skills (idempotent modulo timestamp)', async () => {
    await service.write(root, 'https://github.com/o/r', [skill()], {
      typescript: 'typescript-v1.3.4',
    });
    const first = await service.read(root);

    await service.write(root, 'https://github.com/o/r', [skill()], {
      typescript: 'typescript-v1.3.4',
    });
    const second = await service.read(root);

    expect(second!.skills).toEqual(first!.skills);
  });
});
