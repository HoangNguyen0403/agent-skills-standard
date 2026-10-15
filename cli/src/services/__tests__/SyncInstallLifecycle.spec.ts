import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { SkillConfig } from '../../models/config';
import { CollectedSkill, RegistryMetadata } from '../../models/types';
import { GithubService } from '../GithubService';
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
    vi.restoreAllMocks();
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
  it('prunes retired members, adds PM, refreshes owned indexes, and keeps them on no-op sync', async () => {
    const skillContent = (skill: string): string =>
      [
        '---',
        `name: ${skill}`,
        `description: ${skill} test skill`,
        'metadata:',
        '  triggers:',
        '    files: []',
        '    keywords: []',
        '---',
        '## **Priority: P1**',
        '',
      ].join('\n');
    const common = (skill: string): CollectedSkill => ({
      category: 'common',
      skill,
      files: [{ name: 'SKILL.md', content: skillContent(skill) }],
    });
    const retiredSkills = [
      common('common-business-requirements'),
      common('common-product-requirements'),
      common('common-product-evidence'),
    ];
    const oldConfig = makeConfig({
      agents: [Agent.Codex],
      skills: { common: { ref: 'common-v2.0.0' } },
    });
    const repoInfoLookup = vi
      .spyOn(GithubService.prototype, 'getRepoInfo')
      .mockResolvedValue(null);
    const rawMetadataLookup = vi
      .spyOn(GithubService.prototype, 'getRawFile')
      .mockResolvedValue(null);
    const localMetadata = (await fs.readJson(
      path.resolve(originalCwd, '..', 'skills', 'metadata.json'),
    )) as RegistryMetadata;
    await syncService.beginInstall(oldConfig, { dryRun: false, force: [] });
    await syncService.writeSkills(retiredSkills, oldConfig);
    await syncService.completeInstall(oldConfig, {
      skills: retiredSkills,
      workflows: [],
      specialistsOk: true,
      refreshIndices: true,
      localMetadata,
    });
    const bridgeRel = '.codex/rules/agent-skill-standard-rule.md';
    const bridgePath = path.join(tempDir, bridgeRel);
    const originalBridgeBytes = await fs.readFile(bridgePath);
    const originalLock = await fs.readJson(path.join(tempDir, LOCKFILE_NAME));
    expect(originalLock.entries[bridgeRel].sha256).toBe(
      sha256(originalBridgeBytes),
    );
    const customPath = path.join(
      tempDir,
      '.codex/skills/common/custom/private/SKILL.md',
    );
    await fs.outputFile(customPath, 'user-owned content');
    const upgradedConfig = makeConfig({
      agents: [Agent.Codex],
      skills: {
        common: { ref: 'common-v3.0.0' },
        'product-management': { ref: 'product-management-v1.1.0' },
      },
    });
    const productManagement = (skill: string): CollectedSkill => ({
      category: 'product-management',
      skill,
      files: [{ name: 'SKILL.md', content: skillContent(skill) }],
    });

    const upgradedSkills = [
      common('common-retained'),
      productManagement('product-business-requirements'),
      productManagement('product-requirements'),
    ];
    await syncService.beginInstall(upgradedConfig, {
      dryRun: false,
      force: [],
    });
    await syncService.writeSkills(upgradedSkills, upgradedConfig);
    const plan = await syncService.completeInstall(upgradedConfig, {
      skills: upgradedSkills,
      workflows: [],
      specialistsOk: true,
      refreshIndices: true,
      localMetadata,
    });

    const commonIndexPath = path.join(
      tempDir,
      '.codex/skills/common/_INDEX.md',
    );
    const commonIndex = await fs.readFile(commonIndexPath, 'utf8');
    expect(commonIndex).toContain('common-retained');
    const productManagementIndexPath = path.join(
      tempDir,
      '.codex/skills/product-management/_INDEX.md',
    );
    const productManagementIndex = await fs.readFile(
      productManagementIndexPath,
      'utf8',
    );
    expect(productManagementIndex).toContain('product-business-requirements');
    expect(productManagementIndex).toContain('product-requirements');
    const router = await fs.readFile(path.join(tempDir, 'AGENTS.md'), 'utf8');
    expect(router).toContain(
      '| `*.json`, `*.md` | `<SKILLS>/common/_INDEX.md`, `<SKILLS>/product-management/_INDEX.md` |',
    );
    expect(router).not.toMatch(
      /common-(business-requirements|product-requirements|product-evidence)/,
    );
    const lock = await fs.readJson(path.join(tempDir, LOCKFILE_NAME));
    expect(lock.entries['.codex/skills/common/_INDEX.md'].sha256).toBe(
      sha256(await fs.readFile(commonIndexPath)),
    );
    expect(
      lock.entries['.codex/skills/product-management/_INDEX.md'].sha256,
    ).toBe(sha256(await fs.readFile(productManagementIndexPath)));
    const upgradedBridgeBytes = await fs.readFile(bridgePath);
    expect(upgradedBridgeBytes).toEqual(originalBridgeBytes);
    expect(lock.entries[bridgeRel].sha256).toBe(sha256(upgradedBridgeBytes));
    expect(plan.pruned).not.toContain(bridgeRel);
    expect(plan.added).not.toContain(bridgeRel);
    expect(plan.updated).not.toContain(bridgeRel);
    expect(repoInfoLookup).not.toHaveBeenCalled();
    expect(rawMetadataLookup).not.toHaveBeenCalled();

    for (const retired of [
      'common-business-requirements',
      'common-product-requirements',
      'common-product-evidence',
    ]) {
      expect(commonIndex).not.toContain(retired);
      expect(productManagementIndex).not.toContain(retired);
      expect(
        await fs.pathExists(
          path.join(tempDir, '.codex/skills/common', retired, 'SKILL.md'),
        ),
      ).toBe(false);
    }
    expect(plan.pruned).toHaveLength(3);
    expect(
      await fs.pathExists(
        path.join(
          tempDir,
          '.codex/skills/product-management/product-business-requirements/SKILL.md',
        ),
      ),
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(
          tempDir,
          '.codex/skills/product-management/product-requirements/SKILL.md',
        ),
      ),
    ).toBe(true);
    expect(await fs.readFile(customPath, 'utf8')).toBe('user-owned content');
    await syncService.beginInstall(upgradedConfig, {
      dryRun: false,
      force: [],
    });
    await syncService.writeSkills(upgradedSkills, upgradedConfig);
    const noOpPlan = await syncService.completeInstall(upgradedConfig, {
      skills: upgradedSkills,
      workflows: [],
      specialistsOk: true,
      refreshIndices: true,
      localMetadata,
    });
    const noOpIndexPaths = [
      '.codex/skills/common/_INDEX.md',
      '.codex/skills/product-management/_INDEX.md',
    ];
    for (const indexPath of noOpIndexPaths) {
      expect(noOpPlan.pruned).not.toContain(indexPath);
      expect(noOpPlan.added).not.toContain(indexPath);
      expect(noOpPlan.updated).not.toContain(indexPath);
    }
    expect(noOpPlan.pruned).not.toContain(bridgeRel);
    expect(noOpPlan.added).not.toContain(bridgeRel);
    expect(noOpPlan.updated).not.toContain(bridgeRel);
    const noOpBridgeBytes = await fs.readFile(bridgePath);
    expect(noOpBridgeBytes).toEqual(upgradedBridgeBytes);
    expect(noOpPlan.backupId).toBeNull();
    const noOpLock = await fs.readJson(path.join(tempDir, LOCKFILE_NAME));
    expect(noOpLock.entries[bridgeRel].sha256).toBe(sha256(noOpBridgeBytes));
    expect(noOpLock.entries[noOpIndexPaths[0]].sha256).toBe(
      sha256(await fs.readFile(commonIndexPath)),
    );
    expect(noOpLock.entries[noOpIndexPaths[1]].sha256).toBe(
      sha256(await fs.readFile(productManagementIndexPath)),
    );
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
