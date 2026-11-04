import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Agent, SUPPORTED_AGENTS } from '../../constants';
import { SkillConfig } from '../../models/config';
import {
  AttributionPackageRecord,
  CollectedSkill,
} from '../../models/types';
import { GithubService } from '../GithubService';
import { BackupService } from '../install/BackupService';
import {
  InstallWriter,
  OwnershipWriter,
  PassthroughWriter,
} from '../install/OwnershipWriter';
import { sha256 } from '../LockfileService';
import { SkillSyncService } from '../SkillSyncService';

interface SkillSyncServiceInternals {
  writeSkillForAgent(
    agentId: string,
    skill: CollectedSkill,
    overrides: string[],
    basePath: string,
    writer: InstallWriter,
    config: SkillConfig,
  ): Promise<unknown>;
  writeSkills(
    skills: CollectedSkill[],
    config: SkillConfig,
    agents: Agent[],
    writer: InstallWriter,
    rootDir?: string,
  ): Promise<Record<string, AttributionPackageRecord>>;
}

const CONFIG = {
  skills: { cybersecurity: { ref: 'v1.0.0' } },
} as unknown as SkillConfig;
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
    const override = path
      .relative(process.cwd(), overridePath)
      .replace(/\\/g, '/');

    await service().writeSkillForAgent(
      Agent.Cursor,
      skill,
      [override],
      root,
      new PassthroughWriter(root),
      CONFIG,
    );

    expect(await fs.readFile(path.join(skillPath, 'SKILL.md'), 'utf8')).toBe(
      'new skill',
    );
    expect(await fs.readFile(path.join(skillPath, 'NOTICE'), 'utf8')).toBe(
      'notice text',
    );
    expect(await fs.readFile(overridePath, 'utf8')).toBe('user content');
    expect(
      await fs.readFile(path.join(skillPath, 'assets', 'payload.bin')),
    ).toEqual(asset);
    expect(await fs.readFile(path.join(skillPath, 'notes.md'), 'utf8')).toBe(
      'user notes',
    );
  });

  // Test intent: every path is validated before the first write, so an unsafe
  // file later in the package leaves the installed package untouched.
  it('writes nothing when any package file path escapes the skill directory', async () => {
    const root = await createRoot();
    const existingSkill = path.join(
      root,
      'cybersecurity',
      'cyber-evidence',
      'SKILL.md',
    );
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

  it('leaves an existing package untouched when a later resource traverses a symlink', async () => {
    const root = await createRoot();
    const skillPath = path.join(root, 'cybersecurity', 'cyber-evidence');
    const existingSkill = path.join(skillPath, 'SKILL.md');
    const outsideDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'ags-pkg-outside-'),
    );
    try {
      await fs.outputFile(existingSkill, 'old skill');
      await fs.symlink(outsideDir, path.join(skillPath, 'references'));
      await expect(
        service().writeSkillForAgent(
          Agent.Cursor,
          {
            category: 'cybersecurity',
            skill: 'cyber-evidence',
            files: [
              { name: 'SKILL.md', content: 'new skill' },
              { name: 'references/evidence.md', content: 'unsafe resource' },
            ],
          },
          [],
          root,
          new PassthroughWriter(root),
          CONFIG,
        ),
      ).rejects.toThrow(/symlink/i);
      expect(await fs.readFile(existingSkill, 'utf8')).toBe('old skill');
      expect(await fs.readdir(outsideDir)).toEqual([]);
    } finally {
      await fs.remove(outsideDir);
    }
  });

  it('does not update an earlier agent when another agent has a linked package resource', async () => {
    const root = await createRoot();
    const outsideDir = await createRoot();
    const claude = SUPPORTED_AGENTS.find((agent) => agent.id === Agent.Claude)!;
    const cursor = SUPPORTED_AGENTS.find((agent) => agent.id === Agent.Cursor)!;
    const oldClaudePath = claude.path;
    const oldCursorPath = cursor.path;
    claude.path = path.join(root, '.claude', 'skills');
    cursor.path = path.join(root, '.cursor', 'skills');
    try {
      const claudeSkill = path.join(
        claude.path,
        'cybersecurity',
        'cyber-evidence',
        'SKILL.md',
      );
      const cursorSkill = path.join(
        cursor.path,
        'cybersecurity',
        'cyber-evidence',
        'SKILL.md',
      );
      await fs.outputFile(claudeSkill, 'old Claude skill');
      await fs.outputFile(cursorSkill, 'old Cursor skill');
      await fs.symlink(
        outsideDir,
        path.join(path.dirname(cursorSkill), 'references'),
      );
      await expect(
        service().writeSkills(
          [
            {
              category: 'cybersecurity',
              skill: 'cyber-evidence',
              files: [
                { name: 'SKILL.md', content: 'new skill' },
                { name: 'references/evidence.md', content: 'unsafe resource' },
              ],
            },
          ],
          CONFIG,
          [Agent.Claude, Agent.Cursor],
          new PassthroughWriter(root),
          root,
        ),
      ).rejects.toThrow(/symlink/i);
      expect(await fs.readFile(claudeSkill, 'utf8')).toBe('old Claude skill');
      expect(await fs.readFile(cursorSkill, 'utf8')).toBe('old Cursor skill');
      expect(await fs.readdir(outsideDir)).toEqual([]);
    } finally {
      claude.path = oldClaudePath;
      cursor.path = oldCursorPath;
    }
  });

  it('preflights agent base directories before writing another agent', async () => {
    const root = await createRoot();
    const outsideDir = await createRoot();
    const claude = SUPPORTED_AGENTS.find((agent) => agent.id === Agent.Claude)!;
    const cursor = SUPPORTED_AGENTS.find((agent) => agent.id === Agent.Cursor)!;
    const oldClaudePath = claude.path;
    const oldCursorPath = cursor.path;
    claude.path = path.join(root, '.claude', 'skills');
    cursor.path = path.join(root, '.cursor', 'skills');
    try {
      const firstSkill = path.join(
        claude.path,
        'cybersecurity',
        'cyber-evidence',
        'SKILL.md',
      );
      await fs.outputFile(firstSkill, 'old Claude skill');
      await fs.ensureDir(path.dirname(cursor.path));
      await fs.symlink(outsideDir, cursor.path);
      await expect(
        service().writeSkills(
          [
            {
              category: 'cybersecurity',
              skill: 'cyber-evidence',
              files: [{ name: 'SKILL.md', content: 'new skill' }],
            },
          ],
          CONFIG,
          [Agent.Claude, Agent.Cursor],
          new PassthroughWriter(root),
          root,
        ),
      ).rejects.toThrow(/symlink/i);
      expect(await fs.readFile(firstSkill, 'utf8')).toBe('old Claude skill');
      expect(await fs.readdir(outsideDir)).toEqual([]);
    } finally {
      claude.path = oldClaudePath;
      cursor.path = oldCursorPath;
    }
  });

  // Test intent: the ownership writer keeps user-edited owned files and
  // unknown files. Qualification must never stamp provenance for bytes the
  // writer refused; only the final accepted bytes are bound.
  it('does not bind attribution for files the ownership writer refused', async () => {
    const root = await createRoot();
    const claude = SUPPORTED_AGENTS.find((agent) => agent.id === Agent.Claude)!;
    const oldClaudePath = claude.path;
    claude.path = path.join(root, '.claude', 'skills');
    const skillDir = path.join(claude.path, 'cybersecurity', 'cyber-evidence');
    const licenseRel = '.claude/skills/cybersecurity/cyber-evidence/LICENSE';
    const noticeRel = '.claude/skills/cybersecurity/cyber-evidence/NOTICE';
    const noticeMdRel = '.claude/skills/cybersecurity/cyber-evidence/NOTICE.md';
    try {
      await fs.outputFile(path.join(skillDir, 'LICENSE'), 'old upstream license');
      await fs.outputFile(path.join(skillDir, 'NOTICE'), 'user notice');
      await fs.outputFile(path.join(skillDir, 'NOTICE.md'), 'user notice md');

      const writer = new OwnershipWriter({
        rootDir: root,
        previous: {
          [licenseRel]: {
            owner: 'skill',
            source: 'skill:cybersecurity/cyber-evidence@v1',
            agent: Agent.Claude,
            sha256: sha256('old upstream license'),
          },
          [noticeRel]: {
            owner: 'skill',
            source: 'skill:cybersecurity/cyber-evidence@v1',
            agent: Agent.Claude,
            sha256: sha256('old upstream notice'),
          },
        },
        dryRun: false,
        force: new Set(),
        adoptUnknown: false,
        overrides: [],
        backups: new BackupService(),
      });

      const commit = 'a'.repeat(40);
      const source = (path: string) => ({
        sourcePath: path,
        sourceKind: 'package' as const,
        requestedRef: 'v1',
        resolvedCommit: commit,
        blobSha1: 'b'.repeat(40),
        sha256: sha256('incoming'),
        basis: 'release-manifest' as const,
      });
      const packages = await service().writeSkills(
        [
          {
            category: 'cybersecurity',
            skill: 'cyber-evidence',
            origin: { category: 'cybersecurity', ref: 'v1', commit },
            files: [
              {
                name: 'LICENSE',
                content: 'new upstream license',
                attribution: source('skills/cybersecurity/cyber-evidence/LICENSE'),
              },
              {
                name: 'NOTICE',
                content: 'new upstream notice',
                attribution: source('skills/cybersecurity/cyber-evidence/NOTICE'),
              },
              {
                name: 'NOTICE.md',
                content: 'new upstream notice md',
                attribution: source(
                  'skills/cybersecurity/cyber-evidence/NOTICE.md',
                ),
              },
            ],
          },
        ],
        CONFIG,
        [Agent.Claude],
        writer,
        root,
      );

      expect(writer.plan.updated).toEqual([licenseRel]);
      expect(writer.plan.kept).toEqual([noticeRel]);
      expect(writer.plan.unknown).toEqual([noticeMdRel]);
      const record = packages['cybersecurity/cyber-evidence'];
      expect(record.files.map((file) => file.name)).toEqual(['LICENSE']);
      expect(record.files[0].destinations).toEqual([
        {
          agent: Agent.Claude,
          path: licenseRel,
          sha256: sha256('new upstream license'),
        },
      ]);
      expect(await fs.readFile(path.join(skillDir, 'NOTICE'), 'utf8')).toBe(
        'user notice',
      );
      expect(await fs.readFile(path.join(skillDir, 'NOTICE.md'), 'utf8')).toBe(
        'user notice md',
      );
    } finally {
      claude.path = oldClaudePath;
    }
  });

  it('refuses to write when destination contains a symlink component under root', async () => {
    const root = await createRoot();
    const outsideDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'ags-pkg-outside-'),
    );
    try {
      const targetDir = path.join(outsideDir, 'target');
      await fs.ensureDir(targetDir);
      const victimFile = path.join(targetDir, 'SKILL.md');
      await fs.writeFile(victimFile, 'safe victim', 'utf8');

      // Symlink the skill directory out to outsideDir
      const skillParent = path.join(root, 'cybersecurity');
      await fs.ensureDir(skillParent);
      await fs.symlink(targetDir, path.join(skillParent, 'cyber-evidence'));

      await expect(
        service().writeSkillForAgent(
          Agent.Cursor,
          {
            category: 'cybersecurity',
            skill: 'cyber-evidence',
            files: [{ name: 'SKILL.md', content: 'malicious payload' }],
          },
          [],
          root,
          new PassthroughWriter(root),
          CONFIG,
        ),
      ).rejects.toThrow(/symlink/i);

      expect(await fs.readFile(victimFile, 'utf8')).toBe('safe victim');
    } finally {
      await fs.remove(outsideDir);
    }
  });
});
