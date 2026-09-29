import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { BackupService } from '../../services/install/BackupService';
import { RestoreCommand } from '../restore';

describe('RestoreCommand', () => {
  let tempDir: string;
  let originalCwd: string;
  let logSpy: MockInstance;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-restore-test-'));
    process.chdir(tempDir);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tempDir);
    logSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('prints both ids newest first with reason and file count on --list with backups', async () => {
    let currentTime = new Date('2026-09-27T10:00:00Z');
    const backups = new BackupService(10, () => currentTime);

    // Create file A and backup 1
    await fs.outputFile(path.join(tempDir, 'fileA.txt'), 'contentA');
    const s1 = await backups.begin(tempDir, 'sync');
    await s1.add('fileA.txt');
    const id1 = await s1.commit();

    // Create file B and backup 2 at later time
    currentTime = new Date('2026-09-27T11:00:00Z');
    await fs.outputFile(path.join(tempDir, 'fileB.txt'), 'contentB');
    const s2 = await backups.begin(tempDir, 'uninstall');
    await s2.add('fileA.txt');
    await s2.add('fileB.txt');
    const id2 = await s2.commit();

    const cmd = new RestoreCommand(backups);
    await cmd.run(undefined, { list: true });

    expect(process.exitCode).toBeUndefined();
    const calls = logSpy.mock.calls.map((c) => c.join(' '));
    const fullOutput = calls.join('\n');
    expect(fullOutput).toContain(id1);
    expect(fullOutput).toContain(id2);
    expect(fullOutput).toContain('sync');
    expect(fullOutput).toContain('uninstall');
    expect(fullOutput).toContain('1 file');
    expect(fullOutput).toContain('2 file');

    // id2 must appear before id1 (newest first)
    const pos1 = fullOutput.indexOf(id1);
    const pos2 = fullOutput.indexOf(id2);
    expect(pos2).toBeLessThan(pos1);
  });

  it('prints "No backups found in .ags/backups" and leaves exitCode undefined when no backups', async () => {
    const backups = new BackupService();
    const cmd = new RestoreCommand(backups);
    await cmd.run(undefined, { list: true });

    expect(process.exitCode).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No backups found in .ags/backups'));
  });

  it('restores a deleted file byte-identical and prints confirmation', async () => {
    const fixedDate = new Date('2026-09-27T12:00:00Z');
    const backups = new BackupService(5, () => fixedDate);

    const filePath = path.join(tempDir, 'sub/demo.txt');
    const originalContent = 'hello world original';
    await fs.outputFile(filePath, originalContent);

    const session = await backups.begin(tempDir, 'manual');
    await session.add('sub/demo.txt');
    const id = await session.commit();

    // Now delete the file
    await fs.remove(filePath);
    expect(await fs.pathExists(filePath)).toBe(false);

    const cmd = new RestoreCommand(backups);
    await cmd.run(id, {});

    expect(process.exitCode).toBeUndefined();
    expect(await fs.pathExists(filePath)).toBe(true);
    expect(await fs.readFile(filePath, 'utf8')).toBe(originalContent);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(`Restored 1 file(s) from ${id}`));
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Run ags verify to compare with .skills-lock.json'),
    );
  });

  it('prints error and sets exitCode = 1 when backup id does not exist', async () => {
    const backups = new BackupService();
    const cmd = new RestoreCommand(backups);
    await cmd.run('nope', {});

    expect(process.exitCode).toBe(1);
    const calls = logSpy.mock.calls.map((c) => c.join(' '));
    expect(calls.join('\n')).toContain('Backup nope not found');
  });

  it('behaves like --list when run(undefined, {}) is called', async () => {
    const fixedDate = new Date('2026-09-27T12:00:00Z');
    const backups = new BackupService(5, () => fixedDate);

    await fs.outputFile(path.join(tempDir, 'file.txt'), 'content');
    const session = await backups.begin(tempDir, 'sync');
    await session.add('file.txt');
    const id = await session.commit();

    const cmd = new RestoreCommand(backups);
    await cmd.run(undefined, {});

    expect(process.exitCode).toBeUndefined();
    const calls = logSpy.mock.calls.map((c) => c.join(' '));
    expect(calls.join('\n')).toContain(id);
  });
});
