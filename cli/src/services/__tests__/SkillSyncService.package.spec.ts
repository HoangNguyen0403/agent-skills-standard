import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { SkillConfig } from '../../models/config';
import { CollectedSkill } from '../../models/types';
import { GithubService } from '../GithubService';
import { InstallWriter, PassthroughWriter } from '../install/OwnershipWriter';
import { SkillSyncService } from '../SkillSyncService';

interface SkillSyncServiceInternals {
  writeSkillForAgent(
    agentId: string,
    skill: CollectedSkill,
    overrides: string[],
    basePath: string,
    writer: InstallWriter,
    config: SkillConfig,
  ): Promise<void>;
}

const CONFIG = { skills: { cybersecurity: { ref: 'v1.0.0' } } } as unknown as SkillConfig;
const temporaryRoots: string[] = [];

async function createRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-skill-package-'));
  temporaryRoots.push(root);
  return root;
}

function service(): SkillSyncServiceInternals {
  return new SkillSyncService(
    new GithubService(),
  ) as unknown as SkillSyncServiceInternals;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => fs.remove(root)));
  vi.restoreAllMocks();
});

describe('SkillSyncService package installation', () => {
  // Test intent: package resources land byte-identical, attribution files are
  // installed, an explicit override is retained, and a file the package does
  // not own is left in place (ADR-014 preserves unknown files).
  it('writes binary resources byte-for-byte while retaining overrides and unowned files', async () => {
    const root = await createRoot();
    const skillPath = path.join(root, 'cybersecurity', 'cyber-evidence');
    const overridePath = path.join(skillPath, 'references', 'local.md');
    await fs.outputFile(path.join(skillPath, 'SKILL.md'), 'old skill');
    await fs.outputFile(path.join(skillPath, 'notes.md'), 'user notes');
    await fs.outputFile(overridePath, 'user content');

    const asset = Buffer.from([0, 255, 17, 128]);
    const skill: CollectedSkill = {
      category: 'cybersecurity',
      skill: 'cyber-evidence',
      files: [
        { name: 'SKILL.md', content: 'new skill' },
        { name: 'LICENSE.md', content: 'license text' },
        { name: 'NOTICE', content: 'notice text' },
        { name: 'references/local.md', content: 'upstream content' },
        { name: 'assets/payload.bin', content: '', bytes: asset },
      ],
    };
    const override = path.relative(process.cwd(), overridePath).replace(/\\/g, '/');

    await service().writeSkillForAgent(
      Agent.Cursor,
      skill,
      [override],
      root,
      new PassthroughWriter(),
      CONFIG,
    );

    expect(await fs.readFile(path.join(skillPath, 'SKILL.md'), 'utf8')).toBe('new skill');
    expect(await fs.readFile(path.join(skillPath, 'NOTICE'), 'utf8')).toBe('notice text');
    expect(await fs.readFile(overridePath, 'utf8')).toBe('user content');
    expect(await fs.readFile(path.join(skillPath, 'assets', 'payload.bin'))).toEqual(asset);
    expect(await fs.readFile(path.join(skillPath, 'notes.md'), 'utf8')).toBe('user notes');
  });

  // Test intent: every path is validated before the first write, so an unsafe
  // file later in the package leaves the installed package untouched.
  it('writes nothing when any package file path escapes the skill directory', async () => {
    const root = await createRoot();
    const existingSkill = path.join(root, 'cybersecurity', 'cyber-evidence', 'SKILL.md');
    await fs.outputFile(existingSkill, 'old skill');
    const writer = { write: vi.fn() };

    await expect(
      service().writeSkillForAgent(
        Agent.Cursor,
        {
          category: 'cybersecurity',
          skill: 'cyber-evidence',
          files: [
            { name: 'SKILL.md', content: 'new skill' },
            { name: '../../escape.md', content: 'malicious' },
          ],
        },
        [],
        root,
        writer,
        CONFIG,
      ),
    ).rejects.toThrow('Invalid path ../../escape.md');

    expect(writer.write).not.toHaveBeenCalled();
    expect(await fs.readFile(existingSkill, 'utf8')).toBe('old skill');
  });
});
