import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ManifestEntry, sha256 } from '../../LockfileService';
import { BackupService } from '../BackupService';
import {
  OwnershipWriter,
  OwnershipWriterOptions,
  PassthroughWriter,
  WriteMeta,
} from '../OwnershipWriter';

describe('OwnershipWriter', () => {
  let root: string;
  let backups: BackupService;
  const meta: WriteMeta = {
    owner: 'skill',
    source: 'skill:c/s@v1',
    agent: 'claude',
  };
  const testRel = '.claude/skills/c/s/SKILL.md';

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-owner-test-'));
    backups = new BackupService(3, () => new Date('2026-09-27T12:00:00.000Z'));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  function makeWriter(opts: Partial<OwnershipWriterOptions> = {}) {
    return new OwnershipWriter({
      rootDir: root,
      previous: {},
      dryRun: false,
      force: new Set(),
      adoptUnknown: false,
      overrides: [],
      backups,
      ...opts,
    });
  }

  it('1. new file -> written, added, entry recorded with new hash', async () => {
    const writer = makeWriter();
    const absPath = path.join(root, testRel);
    await writer.write(absPath, 'content 1', meta);

    expect(writer.plan.added).toEqual([testRel]);
    expect(await fs.readFile(absPath, 'utf8')).toBe('content 1');

    const finalized = await writer.finalize(() => false);
    expect(finalized.entries[testRel]).toEqual({
      ...meta,
      sha256: sha256('content 1'),
    });
  });

  it('2. same content already on disk, no previous -> unchanged, adopted into entries, file untouched (mtime unchanged)', async () => {
    const absPath = path.join(root, testRel);
    await fs.outputFile(absPath, 'identical');
    // Set a known past mtime
    const past = new Date(Date.now() - 10000);
    await fs.utimes(absPath, past, past);
    const statBefore = await fs.stat(absPath);

    const writer = makeWriter({ previous: {} });
    await writer.write(absPath, 'identical', meta);

    expect(writer.plan.unchanged).toEqual([testRel]);
    const statAfter = await fs.stat(absPath);
    expect(statAfter.mtimeMs).toBe(statBefore.mtimeMs);

    const finalized = await writer.finalize(() => false);
    expect(finalized.entries[testRel]).toEqual({
      ...meta,
      sha256: sha256('identical'),
    });
  });

  it('3. owned & unchanged on disk, new content -> overwritten, updated', async () => {
    const absPath = path.join(root, testRel);
    await fs.outputFile(absPath, 'v1');
    const prevEntry: ManifestEntry = { ...meta, sha256: sha256('v1') };

    const writer = makeWriter({ previous: { [testRel]: prevEntry } });
    await writer.write(absPath, 'v2', meta);

    expect(writer.plan.updated).toEqual([testRel]);
    expect(await fs.readFile(absPath, 'utf8')).toBe('v2');

    const finalized = await writer.finalize(() => false);
    expect(finalized.entries[testRel]?.sha256).toBe(sha256('v2'));
  });

  it('4. owned but user-edited -> NOT overwritten, kept, entry keeps previous hash', async () => {
    const absPath = path.join(root, testRel);
    await fs.outputFile(absPath, 'user edited');
    const prevEntry: ManifestEntry = { ...meta, sha256: sha256('upstream v1') };

    const writer = makeWriter({ previous: { [testRel]: prevEntry } });
    await writer.write(absPath, 'upstream v2', meta);

    expect(writer.plan.kept).toEqual([testRel]);
    expect(await fs.readFile(absPath, 'utf8')).toBe('user edited');

    const finalized = await writer.finalize(() => false);
    expect(finalized.entries[testRel]?.sha256).toBe(sha256('upstream v1'));
  });

  it('5. owned but user-edited with rel in force -> backed up then overwritten, updated, backupId set after finalize', async () => {
    const absPath = path.join(root, testRel);
    await fs.outputFile(absPath, 'user edited');
    const prevEntry: ManifestEntry = { ...meta, sha256: sha256('upstream v1') };

    const writer = makeWriter({
      previous: { [testRel]: prevEntry },
      force: new Set([testRel]),
    });
    await writer.write(absPath, 'upstream v2', meta);

    expect(writer.plan.updated).toEqual([testRel]);
    expect(await fs.readFile(absPath, 'utf8')).toBe('upstream v2');

    const finalized = await writer.finalize(() => false);
    expect(finalized.plan.backupId).toBeTruthy();

    // Verify backup contains the user's version
    const backupDir = path.join(
      root,
      '.ags',
      'backups',
      finalized.plan.backupId!,
    );
    const backedUp = path.join(backupDir, 'files', testRel);
    expect(await fs.readFile(backedUp, 'utf8')).toBe('user edited');
  });

  it('6. unknown existing file, adoptUnknown: false -> untouched, unknown, no entry', async () => {
    const absPath = path.join(root, testRel);
    await fs.outputFile(absPath, 'unknown existing');

    const writer = makeWriter({ previous: {}, adoptUnknown: false });
    await writer.write(absPath, 'new content', meta);

    expect(writer.plan.unknown).toEqual([testRel]);
    expect(await fs.readFile(absPath, 'utf8')).toBe('unknown existing');

    const finalized = await writer.finalize(() => false);
    expect(finalized.entries[testRel]).toBeUndefined();
  });

  it('7. unknown existing file, adoptUnknown: true -> overwritten, updated, entry recorded', async () => {
    const absPath = path.join(root, testRel);
    await fs.outputFile(absPath, 'unknown existing');

    const writer = makeWriter({ previous: {}, adoptUnknown: true });
    await writer.write(absPath, 'new content', meta);

    expect(writer.plan.updated).toEqual([testRel]);
    expect(await fs.readFile(absPath, 'utf8')).toBe('new content');

    const finalized = await writer.finalize(() => false);
    expect(finalized.entries[testRel]?.sha256).toBe(sha256('new content'));
  });

  it('8. finalize: previous entry not written this run, unchanged on disk, shouldPrune true -> pruned, empty parents removed up to depth 3', async () => {
    const absPath = path.join(root, testRel);
    await fs.outputFile(absPath, 'file content');
    const prevEntry: ManifestEntry = {
      ...meta,
      sha256: sha256('file content'),
    };

    const writer = makeWriter({ previous: { [testRel]: prevEntry } });
    // Write nothing this run
    const finalized = await writer.finalize((_rel, _e) => true);

    expect(finalized.plan.pruned).toEqual([testRel]);
    expect(await fs.pathExists(absPath)).toBe(false);
    expect(finalized.entries[testRel]).toBeUndefined();
    expect(finalized.plan.backupId).toBeTruthy();

    // Verify backup contains the pruned file
    const backedUp = path.join(
      root,
      '.ags',
      'backups',
      finalized.plan.backupId!,
      'files',
      testRel,
    );
    expect(await fs.readFile(backedUp, 'utf8')).toBe('file content');

    // Its empty s/ and c/ directories removed
    expect(
      await fs.pathExists(path.join(root, '.claude', 'skills', 'c', 's')),
    ).toBe(false);
    expect(await fs.pathExists(path.join(root, '.claude', 'skills', 'c'))).toBe(
      false,
    );
    // .claude/skills and .claude kept
    expect(await fs.pathExists(path.join(root, '.claude', 'skills'))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(root, '.claude'))).toBe(true);
  });

  it('9. finalize: previous entry not written this run, user-edited -> file kept, keptOrphans, not in entries', async () => {
    const absPath = path.join(root, testRel);
    await fs.outputFile(absPath, 'user changed content');
    const prevEntry: ManifestEntry = {
      ...meta,
      sha256: sha256('original content'),
    };

    const writer = makeWriter({ previous: { [testRel]: prevEntry } });
    const finalized = await writer.finalize(() => true);

    expect(finalized.plan.keptOrphans).toEqual([testRel]);
    expect(await fs.readFile(absPath, 'utf8')).toBe('user changed content');
    expect(finalized.entries[testRel]).toBeUndefined();
  });

  it('10. finalize: shouldPrune false -> file kept, entry retained unchanged', async () => {
    const absPath = path.join(root, testRel);
    await fs.outputFile(absPath, 'content');
    const prevEntry: ManifestEntry = { ...meta, sha256: sha256('content') };

    const writer = makeWriter({ previous: { [testRel]: prevEntry } });
    const finalized = await writer.finalize(() => false);

    expect(finalized.plan.pruned).toEqual([]);
    expect(await fs.pathExists(absPath)).toBe(true);
    expect(finalized.entries[testRel]).toEqual(prevEntry);
  });

  it('11. finalize: rel matched by overrides -> never pruned, entry retained', async () => {
    const absPath = path.join(root, testRel);
    await fs.outputFile(absPath, 'content');
    const prevEntry: ManifestEntry = { ...meta, sha256: sha256('content') };

    const writer = makeWriter({
      previous: { [testRel]: prevEntry },
      overrides: ['c/s'],
    });
    const finalized = await writer.finalize(() => true);

    expect(finalized.plan.pruned).toEqual([]);
    expect(await fs.pathExists(absPath)).toBe(true);
    expect(finalized.entries[testRel]).toEqual(prevEntry);
  });

  it('12. finalize: previous entry whose file is already gone -> dropped silently', async () => {
    const prevEntry: ManifestEntry = { ...meta, sha256: sha256('missing') };
    const writer = makeWriter({ previous: { [testRel]: prevEntry } });
    const finalized = await writer.finalize(() => true);

    expect(finalized.plan.pruned).toEqual([]);
    expect(finalized.entries[testRel]).toBeUndefined();
  });

  it('13. dryRun: true produces same plan lists but disk is byte-identical and no .ags directory exists', async () => {
    // Setup initial disk: testRel with user edit, otherRel unchanged
    const otherRel = '.claude/skills/c/s/other.md';
    const absOther = path.join(root, otherRel);
    await fs.outputFile(absOther, 'original other');

    const absTest = path.join(root, testRel);
    await fs.outputFile(absTest, 'user test');

    const prev: Record<string, ManifestEntry> = {
      [testRel]: { ...meta, sha256: sha256('upstream test') },
      [otherRel]: { ...meta, sha256: sha256('original other') },
    };

    const writer = makeWriter({
      previous: prev,
      dryRun: true,
      force: new Set([testRel]),
    });

    const newRel = '.claude/skills/c/s/new.md';
    const absNew = path.join(root, newRel);

    // write case 1 (new)
    await writer.write(absNew, 'new file', meta);
    // write case 5 (force update of user-edited)
    await writer.write(absTest, 'updated upstream test', meta);

    // finalize case 8 (otherRel pruned)
    const finalized = await writer.finalize((rel) => rel === otherRel);

    expect(finalized.plan.added).toEqual([newRel]);
    expect(finalized.plan.updated).toEqual([testRel]);
    expect(finalized.plan.pruned).toEqual([otherRel]);

    // Verify disk has NOT been mutated
    expect(await fs.pathExists(absNew)).toBe(false);
    expect(await fs.readFile(absTest, 'utf8')).toBe('user test');
    expect(await fs.readFile(absOther, 'utf8')).toBe('original other');
    expect(await fs.pathExists(path.join(root, '.ags'))).toBe(false);
  });

  it('14. PassthroughWriter writes the file', async () => {
    const writer = new PassthroughWriter(root);
    const dest = path.join(root, 'pass', 'through.txt');
    await writer.write(dest, 'passthrough content');
    expect(await fs.readFile(dest, 'utf8')).toBe('passthrough content');
  });

  describe('SEC-01 symlink refusal', () => {
    let outsideDir: string;

    beforeEach(async () => {
      outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-outside-'));
    });

    afterEach(async () => {
      await fs.remove(outsideDir);
    });

    it('rejects write through a symlinked parent directory and leaves outside dir untouched', async () => {
      const targetDir = path.join(outsideDir, 'target');
      await fs.ensureDir(targetDir);
      const secretFile = path.join(targetDir, 'victim.txt');
      await fs.writeFile(secretFile, 'original secret', 'utf8');

      const symlinkParent = path.join(root, '.claude', 'skills');
      await fs.ensureDir(path.dirname(symlinkParent));
      await fs.symlink(targetDir, symlinkParent);

      const writer = makeWriter();
      const absPath = path.join(symlinkParent, 'payload.md');

      await expect(writer.write(absPath, 'evil payload', meta)).rejects.toThrow(
        /symlink/i,
      );
      expect(await fs.readFile(secretFile, 'utf8')).toBe('original secret');
      expect(await fs.pathExists(path.join(targetDir, 'payload.md'))).toBe(
        false,
      );
    });

    it('rejects write through a symlinked terminal file and leaves outside file untouched', async () => {
      const secretFile = path.join(outsideDir, 'victim.txt');
      await fs.writeFile(secretFile, 'original secret', 'utf8');

      const symlinkFile = path.join(root, testRel);
      await fs.ensureDir(path.dirname(symlinkFile));
      await fs.symlink(secretFile, symlinkFile);

      const writer = makeWriter();
      await expect(
        writer.write(symlinkFile, 'evil payload', meta),
      ).rejects.toThrow(/symlink/i);
      expect(await fs.readFile(secretFile, 'utf8')).toBe('original secret');
    });

    it('rejects write through a dangling terminal symlink and does not create target outside', async () => {
      const nonExistentTarget = path.join(outsideDir, 'dangling-target.txt');
      const symlinkFile = path.join(root, testRel);
      await fs.ensureDir(path.dirname(symlinkFile));
      await fs.symlink(nonExistentTarget, symlinkFile);

      const writer = makeWriter();
      await expect(
        writer.write(symlinkFile, 'evil payload', meta),
      ).rejects.toThrow(/symlink/i);
      expect(await fs.pathExists(nonExistentTarget)).toBe(false);
    });

    it('refuses symlinked path even when force or adoptUnknown is true', async () => {
      const secretFile = path.join(outsideDir, 'victim.txt');
      await fs.writeFile(secretFile, 'original secret', 'utf8');

      const symlinkFile = path.join(root, testRel);
      await fs.ensureDir(path.dirname(symlinkFile));
      await fs.symlink(secretFile, symlinkFile);

      const writer = makeWriter({
        force: new Set([testRel]),
        adoptUnknown: true,
      });
      await expect(
        writer.write(symlinkFile, 'evil payload', meta),
      ).rejects.toThrow(/symlink/i);
      expect(await fs.readFile(secretFile, 'utf8')).toBe('original secret');
    });

    it('refuses to prune through a symlinked path in finalize and leaves target untouched', async () => {
      const secretFile = path.join(outsideDir, 'victim.txt');
      await fs.writeFile(secretFile, 'original secret', 'utf8');

      const symlinkFile = path.join(root, testRel);
      await fs.ensureDir(path.dirname(symlinkFile));
      await fs.symlink(secretFile, symlinkFile);

      const writer = makeWriter({
        previous: {
          [testRel]: {
            ...meta,
            sha256: sha256('original secret'),
          },
        },
      });

      await expect(writer.finalize(() => true)).rejects.toThrow(/symlink/i);
      expect(await fs.readFile(secretFile, 'utf8')).toBe('original secret');
    });

    it('PassthroughWriter refuses write through a symlink when given rootDir', async () => {
      const secretFile = path.join(outsideDir, 'victim.txt');
      await fs.writeFile(secretFile, 'original secret', 'utf8');

      const symlinkFile = path.join(root, 'pass', 'through.txt');
      await fs.ensureDir(path.dirname(symlinkFile));
      await fs.symlink(secretFile, symlinkFile);

      const writer = new PassthroughWriter(root);
      await expect(
        writer.write(symlinkFile, 'evil passthrough'),
      ).rejects.toThrow(/symlink/i);
      expect(await fs.readFile(secretFile, 'utf8')).toBe('original secret');
    });

    it('allows valid in-root filenames starting with double-dot like ..notes.md', async () => {
      const dotDotRel = '.claude/skills/c/s/..notes.md';
      const absPath = path.join(root, dotDotRel);
      const writer = makeWriter();

      await writer.write(absPath, 'valid content', meta);
      expect(writer.plan.added).toEqual([dotDotRel]);
      expect(await fs.readFile(absPath, 'utf8')).toBe('valid content');
    });
  });
});
