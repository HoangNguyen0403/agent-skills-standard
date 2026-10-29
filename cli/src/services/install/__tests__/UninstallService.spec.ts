import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../../constants';
import { SkillConfig } from '../../../models/config';
import {
  LOCKFILE_NAME,
  LockfileService,
  SkillsLockFile,
  sha256,
  type WorkflowCatalog,
} from '../../LockfileService';
import { BackupService } from '../BackupService';
import { UninstallDeps, UninstallService } from '../UninstallService';
import { SyncService } from '../../SyncService';
import { CollectedSkill } from '../../../models/types';

describe('UninstallService', () => {
  let tempDir: string;
  let lockfileService: LockfileService;
  let backupService: BackupService;
  let mockDeps: UninstallDeps;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-uninstall-test-'));
    lockfileService = new LockfileService();
    backupService = new BackupService(5);
    mockDeps = {
      mcpUninstall: vi.fn().mockResolvedValue(undefined),
      hooksUninstall: vi.fn().mockResolvedValue(undefined),
      clearAgentsIndex: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('1. --category typescript removes skill and index files for every agent, keeps common, calls no integrations', async () => {
    const config: SkillConfig = {
      registry: 'https://github.com/owner/repo',
      agents: [Agent.Claude, Agent.Codex],
      skills: { typescript: { ref: 'v1' }, common: { ref: 'v1' } },
    };

    const files = {
      '.claude/skills/typescript/SKILL.md': 'claude ts skill',
      '.claude/skills/typescript/_INDEX.md': 'claude ts index',
      '.claude/skills/common/SKILL.md': 'claude common skill',
      '.codex/skills/typescript/SKILL.md': 'codex ts skill',
      '.codex/skills/typescript/_INDEX.md': 'codex ts index',
      '.codex/skills/common/SKILL.md': 'codex common skill',
    };

    for (const [rel, content] of Object.entries(files)) {
      await fs.outputFile(path.join(tempDir, rel), content);
    }

    const lock: SkillsLockFile = {
      version: 2,
      registry: config.registry,
      generatedAt: new Date().toISOString(),
      sources: {},
      entries: {
        '.claude/skills/typescript/SKILL.md': {
          owner: 'skill',
          source: 'skill:typescript/core@v1',
          agent: Agent.Claude,
          sha256: sha256(files['.claude/skills/typescript/SKILL.md']),
        },
        '.claude/skills/typescript/_INDEX.md': {
          owner: 'index',
          source: 'index:typescript',
          agent: Agent.Claude,
          sha256: sha256(files['.claude/skills/typescript/_INDEX.md']),
        },
        '.claude/skills/common/SKILL.md': {
          owner: 'skill',
          source: 'skill:common/core@v1',
          agent: Agent.Claude,
          sha256: sha256(files['.claude/skills/common/SKILL.md']),
        },
        '.codex/skills/typescript/SKILL.md': {
          owner: 'skill',
          source: 'skill:typescript/core@v1',
          agent: Agent.Codex,
          sha256: sha256(files['.codex/skills/typescript/SKILL.md']),
        },
        '.codex/skills/typescript/_INDEX.md': {
          owner: 'index',
          source: 'index:typescript',
          agent: Agent.Codex,
          sha256: sha256(files['.codex/skills/typescript/_INDEX.md']),
        },
        '.codex/skills/common/SKILL.md': {
          owner: 'skill',
          source: 'skill:common/core@v1',
          agent: Agent.Codex,
          sha256: sha256(files['.codex/skills/common/SKILL.md']),
        },
      },
    };
    await lockfileService.write(tempDir, lock);

    const svc = new UninstallService(mockDeps, lockfileService, backupService);
    const plan = await svc.plan(tempDir, config, {
      categories: ['typescript'],
    });

    expect(plan.remove.sort()).toEqual([
      '.claude/skills/typescript/SKILL.md',
      '.claude/skills/typescript/_INDEX.md',
      '.codex/skills/typescript/SKILL.md',
      '.codex/skills/typescript/_INDEX.md',
    ]);
    expect(plan.integrations.mcpAgents).toEqual([]);
    expect(plan.integrations.hookAgents).toEqual([]);
    expect(plan.integrations.clearAgentsIndex).toBe(false);
    expect(plan.deleteLock).toBe(false);

    const res = await svc.apply(tempDir, config, plan);
    expect(res.removed.length).toBe(4);
    expect(res.backupId).toBeTruthy();

    expect(mockDeps.mcpUninstall).not.toHaveBeenCalled();
    expect(mockDeps.hooksUninstall).not.toHaveBeenCalled();
    expect(mockDeps.clearAgentsIndex).not.toHaveBeenCalled();

    // Verify removed files are gone
    for (const rel of plan.remove) {
      expect(await fs.pathExists(path.join(tempDir, rel))).toBe(false);
    }
    // Verify common files still exist
    expect(
      await fs.pathExists(path.join(tempDir, '.claude/skills/common/SKILL.md')),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(tempDir, '.codex/skills/common/SKILL.md')),
    ).toBe(true);

    // Verify lockfile retained common entries
    const loaded = await lockfileService.load(tempDir, config.agents);
    expect(Object.keys(loaded.lock!.entries).sort()).toEqual([
      '.claude/skills/common/SKILL.md',
      '.codex/skills/common/SKILL.md',
    ]);
  });

  it('2. --agent claude removes only claude entries; codex untouched; calls integrations', async () => {
    const config: SkillConfig = {
      registry: 'https://github.com/owner/repo',
      agents: [Agent.Claude, Agent.Codex],
      skills: { typescript: { ref: 'v1' } },
    };

    const files = {
      '.claude/skills/typescript/SKILL.md': 'claude ts skill',
      '.codex/skills/typescript/SKILL.md': 'codex ts skill',
    };
    for (const [rel, content] of Object.entries(files)) {
      await fs.outputFile(path.join(tempDir, rel), content);
    }

    const lock: SkillsLockFile = {
      version: 2,
      registry: config.registry,
      generatedAt: new Date().toISOString(),
      sources: {},
      entries: {
        '.claude/skills/typescript/SKILL.md': {
          owner: 'skill',
          source: 'skill:typescript/core@v1',
          agent: Agent.Claude,
          sha256: sha256(files['.claude/skills/typescript/SKILL.md']),
        },
        '.codex/skills/typescript/SKILL.md': {
          owner: 'skill',
          source: 'skill:typescript/core@v1',
          agent: Agent.Codex,
          sha256: sha256(files['.codex/skills/typescript/SKILL.md']),
        },
      },
    };
    await lockfileService.write(tempDir, lock);

    const svc = new UninstallService(mockDeps, lockfileService, backupService);
    const plan = await svc.plan(tempDir, config, { agents: [Agent.Claude] });

    expect(plan.remove).toEqual(['.claude/skills/typescript/SKILL.md']);
    expect(plan.integrations.mcpAgents).toEqual([Agent.Claude]);
    expect(plan.integrations.hookAgents).toEqual([Agent.Claude]);
    expect(plan.integrations.clearAgentsIndex).toBe(false);

    await svc.apply(tempDir, config, plan);

    expect(mockDeps.mcpUninstall).toHaveBeenCalledWith(tempDir, [Agent.Claude]);
    expect(mockDeps.hooksUninstall).toHaveBeenCalledWith(tempDir, [
      Agent.Claude,
    ]);
    expect(mockDeps.clearAgentsIndex).not.toHaveBeenCalled();

    expect(
      await fs.pathExists(
        path.join(tempDir, '.claude/skills/typescript/SKILL.md'),
      ),
    ).toBe(false);
    expect(
      await fs.pathExists(
        path.join(tempDir, '.codex/skills/typescript/SKILL.md'),
      ),
    ).toBe(true);

    const loaded = await lockfileService.load(tempDir, config.agents);
    expect(Object.keys(loaded.lock!.entries)).toEqual([
      '.codex/skills/typescript/SKILL.md',
    ]);
  });

  it('3. edited owned file -> in keepEdited, byte-identical after apply, dropped from lock', async () => {
    const config: SkillConfig = {
      registry: 'https://github.com/owner/repo',
      agents: [Agent.Claude],
      skills: { typescript: { ref: 'v1' } },
    };

    const filePath = path.join(tempDir, '.claude/skills/typescript/SKILL.md');
    const editedContent = 'user modified this skill content';
    await fs.outputFile(filePath, editedContent);

    const lock: SkillsLockFile = {
      version: 2,
      registry: config.registry,
      generatedAt: new Date().toISOString(),
      sources: {},
      entries: {
        '.claude/skills/typescript/SKILL.md': {
          owner: 'skill',
          source: 'skill:typescript/core@v1',
          agent: Agent.Claude,
          sha256: sha256('original unmodified content'),
        },
      },
    };
    await lockfileService.write(tempDir, lock);

    const svc = new UninstallService(mockDeps, lockfileService, backupService);
    const plan = await svc.plan(tempDir, config, { all: true });

    expect(plan.remove).toEqual([]);
    expect(plan.keepEdited).toEqual(['.claude/skills/typescript/SKILL.md']);

    await svc.apply(tempDir, config, plan);

    expect(await fs.pathExists(filePath)).toBe(true);
    expect(await fs.readFile(filePath, 'utf8')).toBe(editedContent);

    // With --all, lockfile is deleted
    expect(await fs.pathExists(path.join(tempDir, LOCKFILE_NAME))).toBe(false);
  });

  it('4. entry whose file is gone -> in missing, dropped from lock, no error', async () => {
    const config: SkillConfig = {
      registry: 'https://github.com/owner/repo',
      agents: [Agent.Claude],
      skills: { typescript: { ref: 'v1' } },
    };

    const lock: SkillsLockFile = {
      version: 2,
      registry: config.registry,
      generatedAt: new Date().toISOString(),
      sources: {},
      entries: {
        '.claude/skills/typescript/SKILL.md': {
          owner: 'skill',
          source: 'skill:typescript/core@v1',
          agent: Agent.Claude,
          sha256: sha256('original content'),
        },
      },
    };
    await lockfileService.write(tempDir, lock);

    const svc = new UninstallService(mockDeps, lockfileService, backupService);
    const plan = await svc.plan(tempDir, config, { agents: [Agent.Claude] });

    expect(plan.remove).toEqual([]);
    expect(plan.missing).toEqual(['.claude/skills/typescript/SKILL.md']);

    await svc.apply(tempDir, config, plan);

    const loaded = await lockfileService.load(tempDir, config.agents);
    expect(Object.keys(loaded.lock!.entries)).toEqual([]);
  });

  it('5. --all removes all owned-unchanged files, deletes lock, calls clearAgentsIndex, backup contains lock and files; second plan is empty', async () => {
    const config: SkillConfig = {
      registry: 'https://github.com/owner/repo',
      agents: [Agent.Claude, Agent.Codex],
      skills: { typescript: { ref: 'v1' } },
    };

    const rel = '.claude/skills/typescript/SKILL.md';
    const content = 'claude content';
    await fs.outputFile(path.join(tempDir, rel), content);

    const lock: SkillsLockFile = {
      version: 2,
      registry: config.registry,
      generatedAt: new Date().toISOString(),
      sources: {},
      entries: {
        [rel]: {
          owner: 'skill',
          source: 'skill:typescript/core@v1',
          agent: Agent.Claude,
          sha256: sha256(content),
        },
      },
    };
    await lockfileService.write(tempDir, lock);

    const svc = new UninstallService(mockDeps, lockfileService, backupService);
    const plan = await svc.plan(tempDir, config, { all: true });

    expect(plan.remove).toEqual([rel]);
    expect(plan.deleteLock).toBe(true);
    expect(plan.integrations.clearAgentsIndex).toBe(true);

    const res = await svc.apply(tempDir, config, plan);
    expect(res.backupId).toBeTruthy();

    expect(await fs.pathExists(path.join(tempDir, rel))).toBe(false);
    expect(await fs.pathExists(path.join(tempDir, LOCKFILE_NAME))).toBe(false);
    expect(mockDeps.clearAgentsIndex).toHaveBeenCalledWith(tempDir);

    // Verify backup contains lockfile and removed file
    const backups = await backupService.list(tempDir);
    expect(backups.length).toBe(1);
    expect(backups[0].files).toContain(rel);
    expect(backups[0].files).toContain(LOCKFILE_NAME);

    // Running plan again
    const plan2 = await svc.plan(tempDir, config, { all: true });
    expect(plan2.remove).toEqual([]);
    expect(plan2.keepEdited).toEqual([]);
    expect(plan2.missing).toEqual([]);
  });
  it('keeps repository-generation authority and scoped metadata through --all uninstall', async () => {
    const config: SkillConfig = {
      registry: 'https://github.com/owner/repo',
      agents: [Agent.Copilot],
      skills: {},
    };
    const hostPath = '.github/skills/common/core/SKILL.md';
    const hostBytes = 'host skill';
    const routerBytes = '# Agents\n<!-- generated -->\n';
    const metadataBytes = JSON.stringify({
      categories: { common: { token_metrics: { tokens: 17 } } },
    });
    const metadataPath = 'skills/metadata.json';
    const metadataScope = {
      kind: 'category-token-metrics' as const,
      sha256: sha256('owned token metrics'),
    };
    await fs.outputFile(path.join(tempDir, hostPath), hostBytes);
    await fs.outputFile(path.join(tempDir, 'AGENTS.md'), routerBytes);
    await fs.outputFile(path.join(tempDir, metadataPath), metadataBytes);
    const sources = {
      'skills/common': { ref: 'common-v1', commit: 'a'.repeat(40) },
    };
    const lock: SkillsLockFile = {
      version: 2,
      registry: config.registry,
      generatedAt: 'before',
      sources,
      entries: {
        [hostPath]: {
          owner: 'skill',
          source: 'skill:common/core@v1',
          agent: Agent.Copilot,
          sha256: sha256(hostBytes),
        },
      },
      generation: {
        version: 1,
        entries: {
          'AGENTS.md': {
            source: 'index:AGENTS.md',
            sha256: sha256(routerBytes),
          },
          [metadataPath]: {
            source: 'index:skills/metadata.json',
            sha256: sha256(metadataBytes),
            scope: metadataScope,
          },
        },
      },
      disclosed: { copilot: ['capabilities'] },
    };
    await lockfileService.write(tempDir, lock);

    const svc = new UninstallService(mockDeps, lockfileService, backupService);
    const plan = await svc.plan(tempDir, config, { all: true });
    expect(plan.remove).toEqual([hostPath]);
    expect(plan.deleteLock).toBe(false);
    expect(plan.integrations.clearAgentsIndex).toBe(false);
    await svc.apply(tempDir, config, plan);

    expect(await fs.pathExists(path.join(tempDir, hostPath))).toBe(false);
    expect(await fs.readFile(path.join(tempDir, 'AGENTS.md'), 'utf8')).toBe(
      routerBytes,
    );
    expect(await fs.readFile(path.join(tempDir, metadataPath), 'utf8')).toBe(
      metadataBytes,
    );
    const loaded = await lockfileService.load(tempDir, config.agents);
    expect(loaded.lock?.entries).toEqual({});
    expect(loaded.lock?.generation).toEqual(lock.generation);
    expect(loaded.lock?.sources).toEqual(sources);
    expect(loaded.lock?.disclosed).toEqual({ copilot: ['capabilities'] });
  });
  it.each([
    {
      scenario: 'malformed metadata scope',
      scope: { kind: 'future-kind', sha256: sha256('metrics') },
      error:
        'Invalid repository-generation ownership entry: skills/metadata.json',
    },
    {
      scenario: 'new supported metadata authority',
      scope: {
        kind: 'category-token-metrics',
        sha256: sha256('owned metrics'),
      },
      error:
        'Uninstall plan is stale: repository-generation authority now exists',
    },
  ])(
    'refuses a stale --all plan before effects when $scenario appears',
    async ({ scope, error }) => {
      const config: SkillConfig = {
        registry: 'https://github.com/owner/repo',
        agents: [Agent.Copilot],
        skills: {},
      };
      const ownedPath = '.github/skills/common/core/SKILL.md';
      const ownedBytes = 'owned host output';
      await fs.outputFile(path.join(tempDir, ownedPath), ownedBytes);
      await lockfileService.write(tempDir, {
        version: 2,
        registry: config.registry,
        generatedAt: 'before',
        sources: {},
        entries: {
          [ownedPath]: {
            owner: 'skill',
            source: 'skill:common/core@v1',
            agent: Agent.Copilot,
            sha256: sha256(ownedBytes),
          },
        },
      });

      const svc = new UninstallService(
        mockDeps,
        lockfileService,
        backupService,
      );
      const plan = await svc.plan(tempDir, config, { all: true });
      expect(plan.remove).toEqual([ownedPath]);
      expect(plan.deleteLock).toBe(true);

      const metadataBytes = '{"categories":{"common":{"token_metrics":1}}}';
      const lockPath = path.join(tempDir, LOCKFILE_NAME);
      const rawLock = await fs.readJson(lockPath);
      rawLock.generation = {
        version: 1,
        entries: {
          'skills/metadata.json': {
            source: 'index:skills/metadata.json',
            sha256: sha256(metadataBytes),
            scope,
          },
        },
      };
      await fs.writeJson(lockPath, rawLock, { spaces: 2 });
      const lockBeforeApply = await fs.readFile(lockPath);
      const metadataPath = path.join(tempDir, 'skills/metadata.json');
      await fs.outputFile(metadataPath, metadataBytes);

      await expect(svc.apply(tempDir, config, plan)).rejects.toThrow(error);

      expect(await fs.readFile(path.join(tempDir, ownedPath), 'utf8')).toBe(
        ownedBytes,
      );
      expect(await fs.readFile(metadataPath, 'utf8')).toBe(metadataBytes);
      expect(await fs.readFile(lockPath)).toEqual(lockBeforeApply);
      expect(await backupService.list(tempDir)).toHaveLength(0);
      expect(mockDeps.mcpUninstall).not.toHaveBeenCalled();
      expect(mockDeps.hooksUninstall).not.toHaveBeenCalled();
      expect(mockDeps.clearAgentsIndex).not.toHaveBeenCalled();
    },
  );

  it('6. --agent antigravity with configured [antigravity, kiro] and workflow entry at .agents/workflows/sdlc.md -> sharedKept, file kept', async () => {
    const config: SkillConfig = {
      registry: 'https://github.com/owner/repo',
      agents: [Agent.Antigravity, Agent.Kiro],
      skills: {},
    };

    const rel = '.agents/workflows/sdlc.md';
    const content = 'shared workflow content';
    await fs.outputFile(path.join(tempDir, rel), content);

    const lock: SkillsLockFile = {
      version: 2,
      registry: config.registry,
      generatedAt: new Date().toISOString(),
      sources: {},
      entries: {
        [rel]: {
          owner: 'workflow',
          source: 'workflow:sdlc',
          agent: Agent.Antigravity,
          sha256: sha256(content),
        },
      },
    };
    await lockfileService.write(tempDir, lock);

    const svc = new UninstallService(mockDeps, lockfileService, backupService);
    const plan = await svc.plan(tempDir, config, {
      agents: [Agent.Antigravity],
    });

    expect(plan.sharedKept).toEqual([rel]);
    expect(plan.remove).toEqual([]);

    await svc.apply(tempDir, config, plan);

    expect(await fs.pathExists(path.join(tempDir, rel))).toBe(true);
    const loaded = await lockfileService.load(tempDir, config.agents);
    expect(loaded.lock!.entries[rel]).toBeDefined();
  });

  it('7. empty selection and all + agents/categories throw documented errors', async () => {
    const config: SkillConfig = {
      registry: 'https://github.com/owner/repo',
      agents: [Agent.Claude],
      skills: {},
    };
    const svc = new UninstallService(mockDeps, lockfileService, backupService);

    await expect(svc.plan(tempDir, config, {})).rejects.toThrow(
      'Choose --all, --agent <agent>, or --category <category>',
    );
    await expect(
      svc.plan(tempDir, config, { all: true, agents: [Agent.Claude] }),
    ).rejects.toThrow('--all cannot be combined with --agent or --category');
    await expect(
      svc.plan(tempDir, config, { all: true, categories: ['typescript'] }),
    ).rejects.toThrow('--all cannot be combined with --agent or --category');
  });

  it('8. empty skill directory after removal is removed; .claude/skills stays', async () => {
    const config: SkillConfig = {
      registry: 'https://github.com/owner/repo',
      agents: [Agent.Claude],
      skills: { typescript: { ref: 'v1' } },
    };

    const rel = '.claude/skills/typescript/SKILL.md';
    const content = 'claude ts';
    await fs.outputFile(path.join(tempDir, rel), content);

    const lock: SkillsLockFile = {
      version: 2,
      registry: config.registry,
      generatedAt: new Date().toISOString(),
      sources: {},
      entries: {
        [rel]: {
          owner: 'skill',
          source: 'skill:typescript/core@v1',
          agent: Agent.Claude,
          sha256: sha256(content),
        },
      },
    };
    await lockfileService.write(tempDir, lock);

    const svc = new UninstallService(mockDeps, lockfileService, backupService);
    const plan = await svc.plan(tempDir, config, {
      categories: ['typescript'],
    });
    await svc.apply(tempDir, config, plan);

    // .claude/skills/typescript directory is removed
    expect(
      await fs.pathExists(path.join(tempDir, '.claude/skills/typescript')),
    ).toBe(false);
    // .claude/skills remains
    expect(await fs.pathExists(path.join(tempDir, '.claude/skills'))).toBe(
      true,
    );
  });

  // Test intent: removes only entries matching both agent and category when both are specified
  it('removes only entries matching both agent and category when both are selected', async () => {
    const config: SkillConfig = {
      registry: 'https://github.com/owner/repo',
      agents: [Agent.Claude, Agent.Codex],
      skills: { typescript: { ref: 'v1' }, common: { ref: 'v1' } },
    };

    const claudeTs = '.claude/skills/typescript/SKILL.md';
    const claudeCommon = '.claude/skills/common/SKILL.md';
    const codexTs = '.codex/skills/typescript/SKILL.md';

    await fs.outputFile(path.join(tempDir, claudeTs), 'c ts');
    await fs.outputFile(path.join(tempDir, claudeCommon), 'c common');
    await fs.outputFile(path.join(tempDir, codexTs), 'x ts');

    const lock: SkillsLockFile = {
      version: 2,
      registry: config.registry,
      generatedAt: new Date().toISOString(),
      sources: {},
      entries: {
        [claudeTs]: {
          owner: 'skill',
          source: 'skill:typescript/core@v1',
          agent: Agent.Claude,
          sha256: sha256('c ts'),
        },
        [claudeCommon]: {
          owner: 'skill',
          source: 'skill:common/rules@v1',
          agent: Agent.Claude,
          sha256: sha256('c common'),
        },
        [codexTs]: {
          owner: 'skill',
          source: 'skill:typescript/core@v1',
          agent: Agent.Codex,
          sha256: sha256('x ts'),
        },
      },
    };
    await lockfileService.write(tempDir, lock);

    const svc = new UninstallService(mockDeps, lockfileService, backupService);
    const plan = await svc.plan(tempDir, config, {
      agents: [Agent.Claude],
      categories: ['typescript'],
    });

    expect(plan.remove).toEqual([claudeTs]);
    expect(plan.integrations.mcpAgents).toEqual([]);
    expect(plan.integrations.hookAgents).toEqual([]);
    expect(plan.integrations.clearAgentsIndex).toBe(false);

    await svc.apply(tempDir, config, plan);

    expect(await fs.pathExists(path.join(tempDir, claudeTs))).toBe(false);
    expect(await fs.pathExists(path.join(tempDir, claudeCommon))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, codexTs))).toBe(true);
  });

  // Test intent: handles config with undefined agents property gracefully
  it('handles config with undefined agents property gracefully', async () => {
    const config = {
      registry: 'https://github.com/owner/repo',
      skills: {},
    } as unknown as SkillConfig;

    const svc = new UninstallService(mockDeps, lockfileService, backupService);
    const plan = await svc.plan(tempDir, config, { all: true });

    expect(plan.remove).toEqual([]);
    expect(plan.deleteLock).toBe(false);
  });

  // Test intent: instantiates with default constructor and performs uninstallation
  it('instantiates and operates with default dependencies', async () => {
    const svc = new UninstallService();
    const config: SkillConfig = {
      registry: 'https://github.com/owner/repo',
      agents: [Agent.Claude],
      skills: {},
    };

    const plan = await svc.plan(tempDir, config, { all: true });
    expect(plan.deleteLock).toBe(false);

    const result = await svc.apply(tempDir, config, plan);
    expect(result.removed).toEqual([]);
  });

  // Test intent: ignores unselected agents without definitions when checking shared paths
  it('ignores unselected agents without definitions when checking shared paths', async () => {
    const config = {
      registry: 'https://github.com/owner/repo',
      agents: [Agent.Claude, 'unknown-agent' as unknown as Agent],
      skills: { typescript: { ref: 'v1' } },
    } as SkillConfig;

    const rel = '.claude/skills/typescript/SKILL.md';
    await fs.outputFile(path.join(tempDir, rel), 'content');

    const lock: SkillsLockFile = {
      version: 2,
      registry: config.registry,
      generatedAt: new Date().toISOString(),
      sources: {},
      entries: {
        [rel]: {
          owner: 'skill',
          source: 'skill:typescript/core@v1',
          agent: Agent.Claude,
          sha256: sha256('content'),
        },
      },
    };
    await lockfileService.write(tempDir, lock);

    const svc = new UninstallService(mockDeps, lockfileService, backupService);
    const plan = await svc.plan(tempDir, config, { agents: [Agent.Claude] });

    expect(plan.remove).toEqual([rel]);
    expect(plan.sharedKept).toEqual([]);
  });

  describe('shared canonical workflow bodies', () => {
    const CANONICAL = '.agents/workflows/dev-fix.md';
    const CLAUDE_NATIVE = '.claude/commands/dev-fix.md';
    const CODEX_NATIVE = '.codex/skills/dev-fix/SKILL.md';
    const DEV_FIX_RAW =
      '---\ndescription: Unified bug fixing procedure\n---\n# Dev Fix\nStep 1.\n';

    /** Installs the workflow through the real sync writer in tempDir. */
    async function installWorkflow(agents: Agent[]): Promise<SkillConfig> {
      const config: SkillConfig = {
        registry: 'https://github.com/owner/repo',
        agents,
        skills: {},
        workflows: ['dev-fix'],
        workflows_ref: 'workflows-v1.0.0',
      };
      const fixture: CollectedSkill = {
        category: '.agents',
        skill: 'workflows',
        files: [{ name: 'dev-fix.md', content: DEV_FIX_RAW }],
      };
      const cwd = process.cwd();
      process.chdir(tempDir);
      try {
        const sync = new SyncService();
        await sync.beginInstall(config, { dryRun: false, force: [] });
        await sync.writeWorkflows([fixture], config);
        await sync.completeInstall(config, {
          skills: [],
          workflows: [fixture],
          specialistsOk: true,
        });
      } finally {
        process.chdir(cwd);
      }
      return config;
    }

    /** Re-runs sync after a provider-native export has been edited. */
    async function resyncWorkflow(config: SkillConfig): Promise<void> {
      const fixture: CollectedSkill = {
        category: '.agents',
        skill: 'workflows',
        files: [{ name: 'dev-fix.md', content: DEV_FIX_RAW }],
      };
      const cwd = process.cwd();
      process.chdir(tempDir);
      try {
        const sync = new SyncService();
        await sync.beginInstall(config, { dryRun: false, force: [] });
        await sync.writeWorkflows([fixture], config);
        await sync.completeInstall(config, {
          skills: [],
          workflows: [fixture],
          specialistsOk: true,
        });
      } finally {
        process.chdir(cwd);
      }
    }

    it('retains canonical body while an edited native conflict survives', async () => {
      const config = await installWorkflow([Agent.Claude, Agent.Codex]);
      await fs.writeFile(
        path.join(tempDir, CLAUDE_NATIVE),
        'edited Claude workflow export',
      );
      await resyncWorkflow(config);
      const { lock } = await lockfileService.load(tempDir, []);
      const workflow = lock?.workflowCatalog?.workflows['dev-fix'];
      expect(workflow?.nativeConflicts).toContainEqual({
        agent: Agent.Claude,
        path: CLAUDE_NATIVE,
      });

      const svc = new UninstallService(
        mockDeps,
        lockfileService,
        backupService,
      );
      const plan = await svc.plan(tempDir, config, {
        agents: [Agent.Codex],
      });

      expect(plan.remove).not.toContain(CANONICAL);
      await svc.apply(tempDir, config, plan);

      expect(await fs.pathExists(path.join(tempDir, CANONICAL))).toBe(true);
      expect(await fs.readFile(path.join(tempDir, CLAUDE_NATIVE), 'utf8')).toBe(
        'edited Claude workflow export',
      );
      const { lock: updatedLock } = await lockfileService.load(tempDir, []);
      expect(
        updatedLock?.workflowCatalog?.workflows['dev-fix']?.nativeConflicts,
      ).toContainEqual({ agent: Agent.Claude, path: CLAUDE_NATIVE });
    });

    it('removes a native conflict when its provider is uninstalled', async () => {
      const config = await installWorkflow([Agent.Claude, Agent.Codex]);
      await fs.writeFile(
        path.join(tempDir, CLAUDE_NATIVE),
        'edited Claude workflow export',
      );
      await resyncWorkflow(config);
      const svc = new UninstallService(
        mockDeps,
        lockfileService,
        backupService,
      );

      const plan = await svc.plan(tempDir, config, {
        agents: [Agent.Claude],
      });
      expect(plan.remove).not.toContain(CANONICAL);
      await svc.apply(tempDir, config, plan);

      expect(await fs.pathExists(path.join(tempDir, CANONICAL))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, CODEX_NATIVE))).toBe(true);
      expect(await fs.readFile(path.join(tempDir, CLAUDE_NATIVE), 'utf8')).toBe(
        'edited Claude workflow export',
      );
      const { lock } = await lockfileService.load(tempDir, []);
      const updatedWorkflow = lock?.workflowCatalog?.workflows['dev-fix'];
      expect(updatedWorkflow?.nativeConflicts).toEqual([]);
      expect(
        updatedWorkflow?.nativeBindings.map((binding) => binding.agent),
      ).toEqual([Agent.Codex]);
    });

    it('partial uninstall removes one native binding but keeps the shared body for survivors', async () => {
      const config = await installWorkflow([Agent.Claude, Agent.Codex]);
      const svc = new UninstallService(
        mockDeps,
        lockfileService,
        backupService,
      );

      const plan = await svc.plan(tempDir, config, {
        agents: [Agent.Claude],
      });

      expect(plan.remove).toContain(CLAUDE_NATIVE);
      expect(plan.remove).not.toContain(CANONICAL);
      expect(plan.keepEdited).not.toContain(CANONICAL);

      await svc.apply(tempDir, config, plan);

      expect(await fs.pathExists(path.join(tempDir, CANONICAL))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, CODEX_NATIVE))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, CLAUDE_NATIVE))).toBe(
        false,
      );

      const { lock } = await lockfileService.load(tempDir, []);
      // The installed lock may carry the D4 catalog extension.
      const lockWithCatalog = lock as
        (SkillsLockFile & { workflowCatalog?: WorkflowCatalog }) | null;
      const catalog = lockWithCatalog?.workflowCatalog;
      expect(catalog?.workflows['dev-fix']).toBeDefined();
      const bindingPaths =
        catalog?.workflows['dev-fix'].nativeBindings.map((b) => b.path) ?? [];
      expect(bindingPaths).toEqual([CODEX_NATIVE]);
    });

    it('keeps the shared body when one of several aliased providers is removed', async () => {
      const config = await installWorkflow([Agent.Antigravity, Agent.Kiro]);
      const svc = new UninstallService(
        mockDeps,
        lockfileService,
        backupService,
      );

      const plan = await svc.plan(tempDir, config, {
        agents: [Agent.Antigravity],
      });

      expect(plan.remove).not.toContain(CANONICAL);

      await svc.apply(tempDir, config, plan);

      expect(await fs.pathExists(path.join(tempDir, CANONICAL))).toBe(true);

      const { lock } = await lockfileService.load(tempDir, []);
      // The installed lock may carry the D4 catalog extension.
      const lockWithCatalog = lock as
        (SkillsLockFile & { workflowCatalog?: WorkflowCatalog }) | null;
      const bindings =
        lockWithCatalog?.workflowCatalog?.workflows['dev-fix'].nativeBindings ??
        [];
      expect(bindings.map((binding) => binding.agent)).toEqual([Agent.Kiro]);
    });

    it('removes the shared body once no surviving native binding needs it', async () => {
      const config = await installWorkflow([Agent.Codex]);
      const svc = new UninstallService(
        mockDeps,
        lockfileService,
        backupService,
      );

      const plan = await svc.plan(tempDir, config, {
        agents: [Agent.Codex],
      });

      expect(plan.remove).toContain(CODEX_NATIVE);
      expect(plan.remove).toContain(CANONICAL);

      await svc.apply(tempDir, config, plan);

      expect(await fs.pathExists(path.join(tempDir, CODEX_NATIVE))).toBe(false);
      expect(await fs.pathExists(path.join(tempDir, CANONICAL))).toBe(false);

      const { lock } = await lockfileService.load(tempDir, []);
      // The installed lock may carry the D4 catalog extension.
      const lockWithCatalog = lock as
        (SkillsLockFile & { workflowCatalog?: WorkflowCatalog }) | null;
      expect(
        lockWithCatalog?.workflowCatalog?.workflows['dev-fix'],
      ).toBeUndefined();
    });

    it('full uninstall discloses an edited shared body instead of deleting it', async () => {
      const config = await installWorkflow([Agent.Claude]);
      const canonicalPath = path.join(tempDir, CANONICAL);
      await fs.writeFile(canonicalPath, 'edited canonical body');

      const svc = new UninstallService(
        mockDeps,
        lockfileService,
        backupService,
      );
      const plan = await svc.plan(tempDir, config, { all: true });

      expect(plan.keepEdited).toContain(CANONICAL);
      expect(plan.deleteLock).toBe(true);

      await svc.apply(tempDir, config, plan);

      expect(await fs.readFile(canonicalPath, 'utf8')).toBe(
        'edited canonical body',
      );
      expect(await fs.pathExists(path.join(tempDir, LOCKFILE_NAME))).toBe(
        false,
      );
    });
  });
});
