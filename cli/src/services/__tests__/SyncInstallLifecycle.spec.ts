import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Agent } from '../../constants';
import { SkillConfig } from '../../models/config';
import { CollectedSkill } from '../../models/types';
import { LOCKFILE_NAME, sha256 } from '../LockfileService';
import { SyncService } from '../SyncService';

describe('SyncInstallLifecycle', () => {
  let syncService: SyncService;
  let tempDir: string;
  let originalCwd: string;

  const skillFixture: CollectedSkill = {
    category: 'typescript',
    skill: 'ts-core',
    files: [
      { name: 'SKILL.md', content: 'original-skill' },
      { name: 'references/guide.md', content: 'original-guide' },
    ],
  };

  function makeConfig(overrides: Partial<SkillConfig> = {}): SkillConfig {
    return {
      registry: 'https://github.com/example/repo',
      agents: [Agent.Claude],
      skills: { typescript: { ref: 'v1' } },
      workflows: [],
      custom_overrides: [],
      ...overrides,
    };
  }

  async function runSync(
    config: SkillConfig,
    skills: CollectedSkill[],
    opts: {
      dryRun?: boolean;
      force?: string[];
      workflows?: CollectedSkill[];
      specialistsOk?: boolean;
    } = {},
  ) {
    await syncService.beginInstall(config, {
      dryRun: Boolean(opts.dryRun),
      force: opts.force ?? [],
    });
    await syncService.writeSkills(skills, config);
    if (opts.workflows && opts.workflows.length > 0) {
      await syncService.writeWorkflows(opts.workflows, config);
    }
    const plan = await syncService.completeInstall(config, {
      skills,
      workflows: opts.workflows ?? [],
      specialistsOk: opts.specialistsOk ?? true,
    });
    return plan;
  }

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-lifecycle-test-'));
    process.chdir(tempDir);
    syncService = new SyncService();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tempDir);
  });

  it('1. first run writes files and a v2 lock with skill entries', async () => {
    const config = makeConfig();
    const plan = await runSync(config, [skillFixture]);

    expect(plan.added.length).toBe(2);
    const skillPath = path.join(
      tempDir,
      '.claude/skills/typescript/ts-core/SKILL.md',
    );
    const guidePath = path.join(
      tempDir,
      '.claude/skills/typescript/ts-core/references/guide.md',
    );

    expect(await fs.pathExists(skillPath)).toBe(true);
    expect(await fs.readFile(skillPath, 'utf8')).toBe('original-skill');
    expect(await fs.pathExists(guidePath)).toBe(true);
    expect(await fs.readFile(guidePath, 'utf8')).toBe('original-guide');

    const lockPath = path.join(tempDir, LOCKFILE_NAME);
    expect(await fs.pathExists(lockPath)).toBe(true);
    const lock = await fs.readJson(lockPath);
    expect(lock.version).toBe(2);
    expect(lock.sources['skills/typescript']).toEqual({
      ref: 'v1',
      commit: null,
    });
    expect(
      lock.entries['.claude/skills/typescript/ts-core/SKILL.md'],
    ).toBeDefined();
    expect(
      lock.entries['.claude/skills/typescript/ts-core/SKILL.md'].owner,
    ).toBe('skill');
  });

  it('2. second run with changed upstream content after user edited one file keeps edit and updates other', async () => {
    const config = makeConfig();
    await runSync(config, [skillFixture]);

    // User edits SKILL.md
    const skillPath = path.join(
      tempDir,
      '.claude/skills/typescript/ts-core/SKILL.md',
    );
    await fs.outputFile(skillPath, 'user-edited-skill');

    // Upstream has new versions for both files
    const updatedSkillFixture: CollectedSkill = {
      category: 'typescript',
      skill: 'ts-core',
      files: [
        { name: 'SKILL.md', content: 'upstream-skill-v2' },
        { name: 'references/guide.md', content: 'upstream-guide-v2' },
      ],
    };

    const plan = await runSync(config, [updatedSkillFixture]);

    expect(plan.kept).toContain('.claude/skills/typescript/ts-core/SKILL.md');
    expect(plan.updated).toContain(
      '.claude/skills/typescript/ts-core/references/guide.md',
    );

    // Disk checks
    expect(await fs.readFile(skillPath, 'utf8')).toBe('user-edited-skill');
    const guidePath = path.join(
      tempDir,
      '.claude/skills/typescript/ts-core/references/guide.md',
    );
    expect(await fs.readFile(guidePath, 'utf8')).toBe('upstream-guide-v2');
  });

  it('3. category removed from config prunes unchanged files and creates backup', async () => {
    const config = makeConfig();
    await runSync(config, [skillFixture]);

    // Remove typescript category
    const emptyConfig = makeConfig({ skills: {} });
    const plan = await runSync(emptyConfig, []);

    expect(plan.pruned.length).toBe(2);
    expect(plan.pruned).toContain('.claude/skills/typescript/ts-core/SKILL.md');
    expect(plan.pruned).toContain(
      '.claude/skills/typescript/ts-core/references/guide.md',
    );
    expect(plan.backupId).toBeTruthy();

    const skillPath = path.join(
      tempDir,
      '.claude/skills/typescript/ts-core/SKILL.md',
    );
    expect(await fs.pathExists(skillPath)).toBe(false);

    const backupDir = path.join(tempDir, '.ags/backups', plan.backupId!);
    expect(await fs.pathExists(backupDir)).toBe(true);
  });

  it('4. category still configured but zero skills assembled does not prune', async () => {
    const config = makeConfig();
    await runSync(config, [skillFixture]);

    // Simulated network/fetch failure: typescript category configured but empty skills returned
    const plan = await runSync(config, []);

    expect(plan.pruned.length).toBe(0);
    const skillPath = path.join(
      tempDir,
      '.claude/skills/typescript/ts-core/SKILL.md',
    );
    expect(await fs.pathExists(skillPath)).toBe(true);
  });

  it('5. config.workflows undefined and zero workflows assembled retains existing workflow entries', async () => {
    const config = makeConfig();
    await runSync(config, [skillFixture]);

    // Seed lock with one workflow entry and put the file on disk
    const lockPath = path.join(tempDir, LOCKFILE_NAME);
    const lock = await fs.readJson(lockPath);
    const wfRel = '.claude/commands/sdlc.md';
    const wfContent = '# SDLC Workflow';
    await fs.outputFile(path.join(tempDir, wfRel), wfContent);
    lock.entries[wfRel] = {
      owner: 'workflow',
      source: 'workflow:sdlc',
      agent: 'claude',
      sha256: sha256(wfContent),
    };
    await fs.writeJson(lockPath, lock, { spaces: 2 });

    // config with workflows undefined and zero workflows assembled
    const cfgWithoutWf = makeConfig({ workflows: undefined });
    const plan = await runSync(cfgWithoutWf, [skillFixture], { workflows: [] });

    expect(plan.pruned).not.toContain(wfRel);
    expect(await fs.pathExists(path.join(tempDir, wfRel))).toBe(true);

    const updatedLock = await fs.readJson(lockPath);
    expect(updatedLock.entries[wfRel]).toBeDefined();
  });

  it('6. prune: false leaves files intact when category is removed', async () => {
    const config = makeConfig();
    await runSync(config, [skillFixture]);

    const noPruneConfig = makeConfig({ skills: {}, prune: false });
    const plan = await runSync(noPruneConfig, []);

    expect(plan.pruned.length).toBe(0);
    const skillPath = path.join(
      tempDir,
      '.claude/skills/typescript/ts-core/SKILL.md',
    );
    expect(await fs.pathExists(skillPath)).toBe(true);
  });

  it('7. dry-run of category removal reports same plan.pruned, files still present, lockfile unchanged', async () => {
    const config = makeConfig();
    await runSync(config, [skillFixture]);

    const lockPath = path.join(tempDir, LOCKFILE_NAME);
    const lockContentBefore = await fs.readFile(lockPath, 'utf8');

    const emptyConfig = makeConfig({ skills: {} });
    const plan = await runSync(emptyConfig, [], { dryRun: true });

    expect(plan.pruned.length).toBe(2);
    const skillPath = path.join(
      tempDir,
      '.claude/skills/typescript/ts-core/SKILL.md',
    );
    expect(await fs.pathExists(skillPath)).toBe(true);

    const lockContentAfter = await fs.readFile(lockPath, 'utf8');
    expect(lockContentAfter).toBe(lockContentBefore);
  });

  it('8. v1 lock migration honors skill entries and adopts unknown workflow file', async () => {
    const v1Lock = {
      version: 1,
      registry: 'https://github.com/example/repo',
      generatedAt: '2026-09-27T00:00:00.000Z',
      skills: {
        'typescript/ts-core': {
          ref: 'v1',
          files: {
            'SKILL.md': sha256('original-skill'),
            'references/guide.md': sha256('original-guide'),
          },
          contentHash: 'some-hash',
        },
      },
    };
    await fs.writeJson(path.join(tempDir, LOCKFILE_NAME), v1Lock, {
      spaces: 2,
    });

    // Write edited SKILL.md, matching guide.md
    const skillPath = path.join(
      tempDir,
      '.claude/skills/typescript/ts-core/SKILL.md',
    );
    const guidePath = path.join(
      tempDir,
      '.claude/skills/typescript/ts-core/references/guide.md',
    );
    await fs.outputFile(skillPath, 'user-edited-content');
    await fs.outputFile(guidePath, 'original-guide');

    // Unknown existing workflow file
    const wfRel = '.claude/commands/review.md';
    const wfPath = path.join(tempDir, wfRel);
    await fs.outputFile(wfPath, 'old-review-content');

    const workflowFixture: CollectedSkill = {
      category: 'workflows',
      skill: 'workflows',
      files: [{ name: 'review.md', content: 'new-review-content' }],
    };

    const config = makeConfig({ workflows: ['review'] });
    const plan = await runSync(config, [skillFixture], {
      workflows: [workflowFixture],
    });

    // Edited skill file kept
    expect(plan.kept).toContain('.claude/skills/typescript/ts-core/SKILL.md');
    expect(await fs.readFile(skillPath, 'utf8')).toBe('user-edited-content');

    // Workflow file was adopted and updated
    expect(plan.updated).toContain(wfRel);
    expect(await fs.readFile(wfPath, 'utf8')).toContain('new-review-content');

    // Lock file upgraded to v2
    const lock = await fs.readJson(path.join(tempDir, LOCKFILE_NAME));
    expect(lock.version).toBe(2);
  });
});
