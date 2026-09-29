import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackupService } from '../BackupService';

describe('BackupService', () => {
  let root: string;
  let fakeDate: Date;
  let service: BackupService;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-backup-test-'));
    fakeDate = new Date('2026-09-27T10:00:00.000Z');
    service = new BackupService(3, () => fakeDate);
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  it('begin creates .ags/.gitignore containing backups/ and policy-candidates.json', async () => {
    await service.begin(root, 'test-begin');
    const gitignorePath = path.join(root, '.ags', '.gitignore');
    expect(await fs.pathExists(gitignorePath)).toBe(true);
    expect(await fs.readFile(gitignorePath, 'utf8')).toBe(
      'backups/\npolicy-candidates.json\n',
    );
  });

  it('migrates existing *\\n in .ags/.gitignore to new default', async () => {
    const agsDir = path.join(root, '.ags');
    await fs.ensureDir(agsDir);
    const gitignorePath = path.join(agsDir, '.gitignore');
    await fs.writeFile(gitignorePath, '*\n', 'utf8');

    await service.begin(root, 'test-migration');
    expect(await fs.readFile(gitignorePath, 'utf8')).toBe(
      'backups/\npolicy-candidates.json\n',
    );
  });

  it('leaves custom .ags/.gitignore untouched', async () => {
    const agsDir = path.join(root, '.ags');
    await fs.ensureDir(agsDir);
    const gitignorePath = path.join(agsDir, '.gitignore');
    const customContent = 'backups/\ncustom-ignored\n';
    await fs.writeFile(gitignorePath, customContent, 'utf8');

    await service.begin(root, 'test-custom');
    expect(await fs.readFile(gitignorePath, 'utf8')).toBe(customContent);
  });

  it('add of a file and commit produces backed-up file and manifest.json', async () => {
    const fileRel = 'a/b.md';
    const originalContent = 'hello world';
    await fs.outputFile(path.join(root, fileRel), originalContent);

    const session = await service.begin(root, 'sync-change');
    await session.add(fileRel);
    const id = await session.commit();

    const backupDir = path.join(root, '.ags', 'backups', id);
    const backedUpFile = path.join(backupDir, 'files', fileRel);
    expect(await fs.pathExists(backedUpFile)).toBe(true);
    expect(await fs.readFile(backedUpFile, 'utf8')).toBe(originalContent);

    const manifestPath = path.join(backupDir, 'manifest.json');
    expect(await fs.pathExists(manifestPath)).toBe(true);
    const manifest = await fs.readJson(manifestPath);
    expect(manifest).toEqual({
      id,
      createdAt: '2026-09-27T10:00:00.000Z',
      reason: 'sync-change',
      files: ['a/b.md'],
    });
  });

  it('add of a non-existent rel is ignored and not listed in manifest', async () => {
    const session = await service.begin(root, 'non-existent');
    await session.add('missing/file.txt');
    const id = await session.commit();

    const manifest = await fs.readJson(
      path.join(root, '.ags', 'backups', id, 'manifest.json'),
    );
    expect(manifest.files).toEqual([]);
  });

  it('keeps only the newest 3 backups after 4 commits and list returns them newest first', async () => {
    // Commit 4 backups with increasing dates
    for (let i = 1; i <= 4; i++) {
      fakeDate = new Date(`2026-09-27T10:00:0${i}.000Z`);
      const fileRel = `file${i}.txt`;
      await fs.outputFile(path.join(root, fileRel), `content ${i}`);
      const session = await service.begin(root, `backup-${i}`);
      await session.add(fileRel);
      await session.commit();
    }

    const backups = await service.list(root);
    expect(backups.length).toBe(3);
    expect(backups.map((b) => b.reason)).toEqual([
      'backup-4',
      'backup-3',
      'backup-2',
    ]);

    const backupDirs = await fs.readdir(path.join(root, '.ags', 'backups'));
    expect(backupDirs.length).toBe(3);
  });

  it('restore restores modified and deleted files byte-identical and preserves new files', async () => {
    const fileA = 'dir/a.txt';
    const fileB = 'dir/b.txt';
    const fileC = 'dir/new.txt';

    await fs.outputFile(path.join(root, fileA), 'original-a');
    await fs.outputFile(path.join(root, fileB), 'original-b');

    const session = await service.begin(root, 'pre-edit');
    await session.add(fileA);
    await session.add(fileB);
    const id = await session.commit();

    // Modify fileA, delete fileB, create fileC
    await fs.outputFile(path.join(root, fileA), 'modified-a');
    await fs.remove(path.join(root, fileB));
    await fs.outputFile(path.join(root, fileC), 'brand-new');

    const restoredRels = await service.restore(root, id);
    expect(restoredRels.sort()).toEqual(['dir/a.txt', 'dir/b.txt']);
    expect(await fs.readFile(path.join(root, fileA), 'utf8')).toBe(
      'original-a',
    );
    expect(await fs.readFile(path.join(root, fileB), 'utf8')).toBe(
      'original-b',
    );
    expect(await fs.readFile(path.join(root, fileC), 'utf8')).toBe('brand-new');
  });

  it('restore with invalid id rejects with Backup nope not found', async () => {
    await expect(service.restore(root, 'nope')).rejects.toThrow(
      'Backup nope not found',
    );
  });

  it('two begin calls in the same second produce distinct ids', async () => {
    const session1 = await service.begin(root, 'first');
    const session2 = await service.begin(root, 'second');
    expect(session1.id).not.toBe(session2.id);
    expect(session2.id).toBe(`${session1.id}-2`);
  });
});
