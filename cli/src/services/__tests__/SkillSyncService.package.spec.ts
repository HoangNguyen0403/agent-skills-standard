import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { CollectedSkill } from '../../models/types';
import { GithubService } from '../GithubService';
import { SkillSyncService } from '../SkillSyncService';

interface SkillSyncServiceInternals {
  writeSkillForAgent(
    agentId: string,
    skill: CollectedSkill,
    overrides: string[],
    basePath: string,
  ): Promise<boolean>;
}

const temporaryRoots: string[] = [];

async function createRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-skill-package-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => fs.remove(root)));
  vi.restoreAllMocks();
});

// Test intent: installed packages retain an explicitly overridden local file while
// atomically replacing all non-overridden files with byte-identical downloaded resources.
describe('SkillSyncService package installation', () => {
  it('replaces a complete package while retaining a user override and binary resource bytes', async () => {
    const root = await createRoot();
    const skillPath = path.join(root, 'cybersecurity', 'cyber-evidence');
    const overridePath = path.join(skillPath, 'references', 'local.md');
    await fs.outputFile(path.join(skillPath, 'SKILL.md'), 'old skill');
    await fs.outputFile(path.join(skillPath, 'stale.md'), 'stale resource');
    await fs.outputFile(overridePath, 'user content');

    const service = new SkillSyncService(
      new GithubService(),
    ) as unknown as SkillSyncServiceInternals;
    const asset = Buffer.from([0, 255, 17, 128]);
    const skill: CollectedSkill = {
      category: 'cybersecurity',
      skill: 'cyber-evidence',
      files: [
        { name: 'SKILL.md', content: 'new skill' },
        { name: 'LICENSE.md', content: 'license text' },
        { name: 'NOTICE', content: 'notice text' },
        { name: 'assets/payload.bin', content: '', bytes: asset },
      ],
    };
    const override = path
      .relative(process.cwd(), overridePath)
      .replace(/\\/g, '/');

    await service.writeSkillForAgent(Agent.Cursor, skill, [override], root);

    await expect(
      fs.readFile(path.join(skillPath, 'SKILL.md'), 'utf8'),
    ).resolves.toBe('new skill');
    await expect(fs.readFile(overridePath, 'utf8')).resolves.toBe(
      'user content',
    );
    await expect(
      fs.readFile(path.join(skillPath, 'assets', 'payload.bin')),
    ).resolves.toEqual(asset);
    await expect(fs.pathExists(path.join(skillPath, 'stale.md'))).resolves.toBe(
      false,
    );
  });

  it('leaves an existing package intact when staging a downloaded file fails', async () => {
    const root = await createRoot();
    const skillPath = path.join(root, 'cybersecurity', 'cyber-evidence');
    const existingSkill = path.join(skillPath, 'SKILL.md');
    await fs.outputFile(existingSkill, 'old skill');

    const service = new SkillSyncService(
      new GithubService(),
    ) as unknown as SkillSyncServiceInternals;
    const originalOutputFile = fs.outputFile;
    vi.spyOn(fs, 'outputFile').mockImplementation(
      async (file, data, options) => {
        if (String(file).endsWith('broken.md')) {
          throw new Error('disk full');
        }
        return originalOutputFile(file, data, options);
      },
    );

    await expect(
      service.writeSkillForAgent(
        Agent.Cursor,
        {
          category: 'cybersecurity',
          skill: 'cyber-evidence',
          files: [
            { name: 'SKILL.md', content: 'new skill' },
            { name: 'references/broken.md', content: 'cannot write' },
          ],
        },
        [],
        root,
      ),
    ).rejects.toThrow('disk full');

    await expect(fs.readFile(existingSkill, 'utf8')).resolves.toBe('old skill');
  });

  // Test intent: deterministic recovery names must not erase operator-created
  // recovery data; a pre-existing backup rejects replacement without mutation.
  it('refuses to replace a package when its backup path already exists', async () => {
    const root = await createRoot();
    const skillPath = path.join(root, 'cybersecurity', 'cyber-evidence');
    const backupPath = `${skillPath}.ags-backup`;
    await fs.outputFile(
      path.join(backupPath, 'recovery.txt'),
      'operator recovery',
    );

    const service = new SkillSyncService(
      new GithubService(),
    ) as unknown as SkillSyncServiceInternals;
    await expect(
      service.writeSkillForAgent(
        Agent.Cursor,
        {
          category: 'cybersecurity',
          skill: 'cyber-evidence',
          files: [{ name: 'SKILL.md', content: 'new skill' }],
        },
        [],
        root,
      ),
    ).rejects.toThrow('backup path already exists');

    await expect(
      fs.readFile(path.join(backupPath, 'recovery.txt'), 'utf8'),
    ).resolves.toBe('operator recovery');
  });

  // Test intent: an installed package symlink must never be traversed while
  // copying overrides, otherwise sync could read from outside its installation root.
  it('does not follow a symlinked package while copying overrides', async () => {
    const root = await createRoot();
    const skillPath = path.join(root, 'cybersecurity', 'cyber-evidence');
    const externalPath = path.join(root, 'outside-installation');
    const externalOverride = path.join(externalPath, 'references', 'local.md');
    await fs.outputFile(externalOverride, 'outside user content');
    await fs.ensureSymlink(externalPath, skillPath, 'dir');

    const service = new SkillSyncService(
      new GithubService(),
    ) as unknown as SkillSyncServiceInternals;
    const override = path
      .relative(process.cwd(), path.join(skillPath, 'references', 'local.md'))
      .replace(/\\/g, '/');
    await service.writeSkillForAgent(
      Agent.Cursor,
      {
        category: 'cybersecurity',
        skill: 'cyber-evidence',
        files: [{ name: 'SKILL.md', content: 'new skill' }],
      },
      [override],
      root,
    );

    await expect(fs.readFile(externalOverride, 'utf8')).resolves.toBe(
      'outside user content',
    );
    await expect(
      fs.pathExists(path.join(skillPath, 'references', 'local.md')),
    ).resolves.toBe(false);
  });
});
