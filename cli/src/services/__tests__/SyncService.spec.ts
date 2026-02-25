import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { SkillConfig } from '../../models/config';
import { AgentBridgeService } from '../AgentBridgeService';
import { GithubService } from '../GithubService';
import { IndexGeneratorService } from '../IndexGeneratorService';
import { SyncService } from '../SyncService';
import { MarkdownUtils } from '../utils/MarkdownUtils';

// Mock fs-extra
vi.mock('fs-extra');

// Mock IndexGeneratorService and others
vi.mock('../IndexGeneratorService');
vi.mock('../DetectionService');
vi.mock('../AgentBridgeService');
vi.mock('../utils/MarkdownUtils', () => ({
  MarkdownUtils: {
    injectIndex: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('SyncService', () => {
  let syncService: SyncService;
  let mockGithubService: Record<string, any>;
  let mockConfigService: Record<string, any>;

  // Define mock methods for IndexGenerator
  const mockGenerate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset implementations
    mockGenerate.mockResolvedValue('index content');
    vi.mocked(MarkdownUtils.injectIndex).mockReset();
    vi.mocked(MarkdownUtils.injectIndex).mockResolvedValue(undefined);

    // Setup IndexGeneratorService mock implementation
    (IndexGeneratorService as any).mockImplementation(function () {
      return {
        generate: mockGenerate,
      };
    });

    // Setup AgentBridgeService mock implementation
    (AgentBridgeService as any).mockImplementation(function () {
      return {
        bridge: vi.fn().mockResolvedValue(undefined),
      };
    });

    syncService = new SyncService();

    // Inject mocks into private fields
    mockGithubService = {
      getRepoTree: vi.fn(),
      fetchSkillFiles: vi.fn(),
      downloadFilesConcurrent: vi.fn(),
      getRawFile: vi.fn(),
      getRepoInfo: vi.fn(),
    };
    mockConfigService = {
      reconcileDependencies: vi.fn(),
      saveConfig: vi.fn(),
    };
    const mockDetectionService = {
      detectAgents: vi.fn().mockResolvedValue({}),
    };

    (syncService as any).githubService = mockGithubService;
    (syncService as any).configService = mockConfigService;
    (syncService as any).detectionService = mockDetectionService;

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('reconcileConfig', () => {
    it('should return true when dependencies are reconciled', async () => {
      const config = { skills: { test: {} } } as unknown as SkillConfig;
      const deps = new Set(['pkg']);
      mockConfigService.reconcileDependencies.mockReturnValue(['skill1']);
      const result = await syncService.reconcileConfig(config, deps);
      expect(result).toBe(true);
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
    });

    it('should handle no changes', async () => {
      const config = { skills: { test: {} } } as unknown as SkillConfig;
      mockConfigService.reconcileDependencies.mockReturnValue([]);
      const result = await syncService.reconcileConfig(config, new Set());
      expect(result).toBe(false);
    });
  });

  describe('reconcileWorkflows', () => {
    it('should discover and add new workflows from DEFAULT_WORKFLOWS if config.workflows is an array', async () => {
      const config = {
        registry: 'https://github.com/o/r',
        workflows: ['code-review'],
      } as unknown as SkillConfig;
      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'main',
      });
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [
          { path: '.agent/workflows/code-review.md' },
          { path: '.agent/workflows/plan-feature.md' },
          { path: '.agent/workflows/custom.md' },
        ],
      });

      const result = await syncService.reconcileWorkflows(config);

      expect(result).toBe(true);
      expect(config.workflows).toContain('code-review');
      expect(config.workflows).toContain('plan-feature');
      expect(config.workflows).not.toContain('custom');
    });

    it('should initialize workflows if undefined and Antigravity is enabled', async () => {
      const config = {
        registry: 'https://github.com/o/r',
        agents: [Agent.Antigravity],
      } as unknown as SkillConfig;
      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'main',
      });
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [{ path: '.agent/workflows/code-review.md' }],
      });

      const result = await syncService.reconcileWorkflows(config);

      expect(result).toBe(true);
      expect(config.workflows).toEqual(['code-review']);
    });

    it('should return false if no new workflows found', async () => {
      const config = {
        registry: 'https://github.com/o/r',
        workflows: ['w1'],
      } as unknown as SkillConfig;
      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'main',
      });
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [{ path: '.agent/workflows/w1.md' }],
      });

      const result = await syncService.reconcileWorkflows(config);

      expect(result).toBe(false);
    });
  });

  describe('assembleSkills', () => {
    it('should fail if registry is not GitHub', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi.fn().mockReturnValue(null);
      const config = { registry: 'invalid' } as unknown as SkillConfig;
      const result = await syncService.assembleSkills(['test'], config);
      expect(result).toEqual([]);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Only GitHub registries supported'),
      );
      GithubService.parseGitHubUrl = oldParse;
    });

    it('should use default ref "main" if ref is missing', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      const config = {
        registry: 'u',
        skills: { c: {} },
      } as unknown as SkillConfig;
      mockGithubService.getRepoTree.mockResolvedValue({ tree: [] });
      await syncService.assembleSkills(['c'], config);
      expect(mockGithubService.getRepoTree).toHaveBeenCalledWith(
        'o',
        'r',
        'main',
      );
      GithubService.parseGitHubUrl = oldParse;
    });

    it('should handle repo tree fetch failure', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      const config = {
        registry: 'url',
        skills: { test: { ref: 'v1' } },
      } as unknown as SkillConfig;
      mockGithubService.getRepoTree.mockResolvedValue(null);
      const result = await syncService.assembleSkills(['test'], config);
      expect(result).toEqual([]);
      GithubService.parseGitHubUrl = oldParse;
    });

    it('should assemble skills correctly including absolute and relative', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      const config = {
        registry: 'url',
        skills: { cat1: { include: ['s1', 'other/s2'] } },
      } as unknown as SkillConfig;
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [
          { path: 'skills/cat1/s1/SKILL.md', type: 'blob' },
          { path: 'skills/other/s2/SKILL.md', type: 'blob' },
        ],
      });
      mockGithubService.downloadFilesConcurrent.mockImplementation(
        (tasks: { path: string }[]) =>
          tasks.map((t) => ({ path: t.path, content: 'c' })),
      );
      const result = await syncService.assembleSkills(['cat1'], config);
      expect(result).toHaveLength(2);
      GithubService.parseGitHubUrl = oldParse;
    });
  });

  describe('identifyFoldersToSync & expandAbsoluteInclude', () => {
    it('should handle wildcard * and skip duplicates', () => {
      const tree = [
        { path: 'skills/other/s1/SKILL.md', type: 'blob' },
      ] as any[];
      const folders = ['other/s1'];
      // @ts-expect-error - private
      syncService.expandAbsoluteInclude('other/*', folders, tree);
      expect(folders).toHaveLength(1);

      const emptyFolders: string[] = [];
      // @ts-expect-error - private
      syncService.expandAbsoluteInclude('other/*', emptyFolders, tree);
      expect(emptyFolders).toContain('other/s1');
    });

    it('should exclude folder if not in include list', () => {
      const catConfig = {
        include: ['some-other-skill'],
      } as any;
      const tree = [{ path: 'skills/test/s1/', type: 'tree' }] as any[];
      // @ts-expect-error - private
      const result = syncService.identifyFoldersToSync('test', catConfig, tree);
      expect(result).not.toContain('s1');
    });

    it('should include folder if explicitly in include list', () => {
      const catConfig = { include: ['s1'] } as any;
      const tree = [{ path: 'skills/test/s1/', type: 'tree' }] as any[];
      // @ts-expect-error - private
      const result = syncService.identifyFoldersToSync('test', catConfig, tree);
      expect(result).toContain('s1');
    });

    it('should exclude folder if in exclude list', () => {
      const catConfig = { exclude: ['s1'] } as any;
      const tree = [{ path: 'skills/test/s1/', type: 'tree' }] as any[];
      // @ts-expect-error - private
      const result = syncService.identifyFoldersToSync('test', catConfig, tree);
      expect(result).not.toContain('s1');
    });

    it('should handle non-existent absolute includes', () => {
      const folders: string[] = [];
      // @ts-expect-error - private
      syncService.expandAbsoluteInclude('missing/skill', folders, []);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('not found in repository'),
      );
    });

    it('should cover include check bypass', () => {
      const catConfig = { include: undefined } as any;
      const tree = [{ path: 'skills/test/s1/', type: 'tree' }] as any[];
      // @ts-expect-error - private
      const result = syncService.identifyFoldersToSync('test', catConfig, tree);
      expect(result).toContain('s1');
    });
  });

  describe('writeSkills & isOverridden', () => {
    it('should use default agents if agents array is missing', async () => {
      const skills = [
        {
          category: 'test',
          skill: 's',
          files: [{ name: 'f', content: 'c' }],
        },
      ] as any[];
      await syncService.writeSkills(skills, {
        registry: 'u',
        skills: {},
      } as unknown as SkillConfig);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Antigravity'),
      );
    });

    it('should write skills to .kiro/skills/ when Kiro agent is configured', async () => {
      const skills = [
        {
          category: 'test',
          skill: 's',
          files: [{ name: 'SKILL.md', content: 'content' }],
        },
      ] as any[];
      const config = {
        agents: [Agent.Kiro],
        custom_overrides: [],
      } as unknown as SkillConfig;
      await syncService.writeSkills(skills, config);
      expect(fs.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('.kiro/skills'),
      );
    });

    it('should skip agent loop if agent definition is missing', async () => {
      const config = { agents: ['unknown'] } as unknown as SkillConfig;
      await syncService.writeSkills([], config);
    });

    it('should fallback to all agents if no agents are configured and none are detected (line 122 coverage)', async () => {
      (syncService as any).detectionService.detectAgents.mockResolvedValue({});
      const config = { agents: undefined, custom_overrides: [] } as any;
      const skills = [
        {
          category: 'cat',
          skill: 's',
          files: [{ name: 'f.md', content: 'c' }],
        },
      ];
      await syncService.writeSkills(skills, config);
      expect(fs.ensureDir).toHaveBeenCalled();
      // Should mention multiple agents as it falls back to all
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Cursor'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Antigravity'),
      );
    });

    it('should NOT fallback to all agents if agents is explicitly empty', async () => {
      (syncService as any).detectionService.detectAgents.mockResolvedValue({});
      const config = { agents: [], custom_overrides: [] } as any;
      const skills = [
        {
          category: 'cat',
          skill: 's',
          files: [{ name: 'f.md', content: 'c' }],
        },
      ];
      await syncService.writeSkills(skills, config);
      expect(fs.ensureDir).not.toHaveBeenCalled();
    });

    it('should sync only to detected agents if no config provided', async () => {
      (syncService as any).detectionService.detectAgents.mockResolvedValue({
        [Agent.Cursor]: true,
      });
      const config = { agents: undefined, custom_overrides: [] } as any;
      const skills = [
        {
          category: 'cat',
          skill: 's',
          files: [{ name: 'f.md', content: 'c' }],
        },
      ];
      await syncService.writeSkills(skills, config);
      expect(fs.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('.cursor/skills'),
      );
      expect(fs.ensureDir).not.toHaveBeenCalledWith(
        expect.stringContaining('.agent/skills'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Cursor'),
      );
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Antigravity'),
      );
    });

    it('should skip writing if path is not safe (line 173 coverage)', async () => {
      const skills = [
        {
          category: 'cat',
          skill: 's',
          files: [{ name: '../../unsafe.md', content: 'c' }],
        },
      ];
      const config = { agents: [Agent.Cursor] } as any;
      await syncService.writeSkills(skills, config);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Security Error'),
      );
    });

    it('should skip file if overridden', async () => {
      const skills = [
        {
          category: 'test',
          skill: 's',
          files: [{ name: 'file.md', content: 'c' }],
        },
      ] as any[];
      const config = {
        agents: ['cursor'],
        custom_overrides: ['O'],
      } as unknown as SkillConfig;
      vi.spyOn(syncService as any, 'isOverridden').mockReturnValue(true);
      await syncService.writeSkills(skills, config);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Skipping overridden'),
      );
    });

    it('isOverridden logic branches', () => {
      const normalizeSpy = vi.spyOn(syncService as any, 'normalizePath');
      normalizeSpy.mockReturnValue('a/b/c');
      // @ts-expect-error - private
      expect(syncService.isOverridden('any', ['a/b/c'])).toBe(true);
      normalizeSpy.mockReturnValue('a/b/sub/file');
      // @ts-expect-error - private
      expect(syncService.isOverridden('any', ['a/b'])).toBe(true);
      normalizeSpy.mockReturnValue('other/path');
      // @ts-expect-error - private
      expect(syncService.isOverridden('any', ['a/b'])).toBe(false);
      normalizeSpy.mockRestore();
    });

    it('should handle security error in isPathSafe', async () => {
      const skills = [
        {
          category: 'test',
          skill: 's',
          files: [{ name: '../malicious', content: 'c' }],
        },
      ] as any[];
      await syncService.writeSkills(skills, {
        agents: ['cursor'],
      } as unknown as SkillConfig);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Security Error'),
      );
    });
  });

  describe('fetchSkill Filtering', () => {
    it('should filter files correctly', async () => {
      const tree = [
        { path: 'skills/c/s/SKILL.md', type: 'blob' },
        { path: 'skills/c/s/references/f', type: 'blob' },
        { path: 'skills/c/s/scripts/f', type: 'blob' },
        { path: 'skills/c/s/assets/f', type: 'blob' },
        { path: 'skills/c/s/ignored', type: 'blob' },
      ];
      mockGithubService.downloadFilesConcurrent.mockImplementation(
        (t: { path: string }[]) =>
          t.map((x) => ({ path: x.path, content: 'c' })),
      );
      // @ts-expect-error - private
      const res = await syncService.fetchSkill(
        'o',
        'r',
        'ref',
        'c',
        's',
        tree as any,
      );
      expect(res!.files).toHaveLength(4);
    });

    it('should handle relative vs absolute skill fetch', async () => {
      const tree = [{ path: 'skills/other/s/SKILL.md', type: 'blob' }];
      mockGithubService.downloadFilesConcurrent.mockResolvedValue([
        { path: 'skills/other/s/SKILL.md', content: 'c' },
      ]);
      // @ts-expect-error - private
      const res = await syncService.fetchSkill(
        'o',
        'r',
        'ref',
        'cat',
        'other/s',
        tree as any,
      );
      expect(res!.category).toBe('other');
    });
  });

  describe('applyIndices', () => {
    it('should generate and inject index using local files (Happy Path)', async () => {
      const config = {
        registry: 'url',
        skills: { cat1: {} },
        agents: [Agent.Cursor],
      } as unknown as SkillConfig;

      await syncService.applyIndices(config, [Agent.Cursor]);

      expect(IndexGeneratorService).toHaveBeenCalled();

      // Verify methods were called on the mock instance
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.any(String), // baseDir path
        ['cat1'], // categories
      );
      expect(MarkdownUtils.injectIndex).toHaveBeenCalledWith(
        process.cwd(),
        ['AGENTS.md'],
        'index content',
      );
      // Removed mockBridge since AgentBridgeService is mocked but we didn't specify the stub in this specific block

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('index updated'),
      );
    });

    it('should handle IndexGenerator errors', async () => {
      const config = {
        registry: 'url',
        skills: { cat1: {} },
        agents: [Agent.Cursor],
      } as unknown as SkillConfig;

      // Force error on generate
      mockGenerate.mockRejectedValueOnce(new Error('Gen fail'));

      await syncService.applyIndices(config);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update index'),
      );
    });

    it('should auto-detect agents if none specified (line 294-297 coverage)', async () => {
      (syncService as any).detectionService.detectAgents.mockResolvedValue({
        [Agent.Cursor]: true,
      });
      const config = {
        agents: undefined,
        skills: { flutter: {} },
      } as any;

      await syncService.applyIndices(config);
      expect(mockGenerate).toHaveBeenCalled();
    });
  });

  describe('assembleWorkflows', () => {
    it('should return empty if workflows are disabled in config', async () => {
      const config = { workflows: false } as unknown as SkillConfig;
      const result = await syncService.assembleWorkflows(config);
      expect(result).toEqual([]);
    });

    it('should return empty if registry URL is invalid (line 215 coverage)', async () => {
      const config = {
        workflows: true,
        registry: 'https://gitlab.com',
      } as unknown as SkillConfig;
      const result = await syncService.assembleWorkflows(config);
      expect(result).toEqual([]);
    });

    it('should return empty if fetching tree fails', async () => {
      const config = {
        workflows: true,
        registry: 'https://github.com/o/r',
        skills: { c: { ref: 'main' } },
      } as unknown as SkillConfig;
      mockGithubService.getRepoTree.mockResolvedValue(null);
      const result = await syncService.assembleWorkflows(config);
      expect(result).toEqual([]);
    });

    it('should fetch all workflows if config.workflows is true and use default branch', async () => {
      const config = {
        workflows: true,
        registry: 'https://github.com/o/r',
        skills: { c: { ref: 'v1' } },
      } as unknown as SkillConfig;
      const treeData = {
        tree: [
          { path: '.agent/workflows/w1.md' },
          { path: '.agent/workflows/w2.md' },
          { path: 'other/file.md' },
        ],
      };
      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'develop',
      });
      mockGithubService.getRepoTree.mockResolvedValue(treeData);
      mockGithubService.downloadFilesConcurrent.mockResolvedValue([
        { path: '.agent/workflows/w1.md', content: 'c1' },
      ]);

      const result = await syncService.assembleWorkflows(config);

      expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith('o', 'r');
      expect(mockGithubService.getRepoTree).toHaveBeenCalledWith(
        'o',
        'r',
        'develop',
      );
      expect(result).toHaveLength(1);
      expect(result[0].skill).toBe('workflows');
    });

    it('should fetch specific workflows if config.workflows is an array', async () => {
      const config = {
        workflows: ['w1'],
        registry: 'https://github.com/o/r',
        skills: { c: { ref: 'main' } },
      } as unknown as SkillConfig;
      const treeData = {
        tree: [
          { path: '.agent/workflows/w1.md' },
          { path: '.agent/workflows/w2.md' },
        ],
      };
      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'main',
      });
      mockGithubService.getRepoTree.mockResolvedValue(treeData);
      mockGithubService.downloadFilesConcurrent.mockResolvedValue([]);

      await syncService.assembleWorkflows(config);

      expect(mockGithubService.downloadFilesConcurrent).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ path: '.agent/workflows/w1.md' }),
        ]),
      );
    });
  });

  describe('writeWorkflows', () => {
    it('should skip if no workflows provided', async () => {
      await syncService.writeWorkflows([], {} as SkillConfig);
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('should skip if skill is not "workflows" (line 284 coverage)', async () => {
      await syncService.writeWorkflows(
        [{ skill: 'invalid', files: [] }] as any,
        {} as any,
      );
      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('should write workflow files to local .agent/workflows', async () => {
      const workflows = [
        {
          skill: 'workflows',
          files: [{ name: 'test.md', content: 'content' }],
        },
      ];
      await syncService.writeWorkflows(workflows as any, {} as any);
      expect(fs.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('.agent'),
      );
      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('test.md'),
        'content',
      );
    });
  });

  describe('checkForUpdates', () => {
    it('should return null if registry is invalid', async () => {
      const config = { registry: 'invalid' } as unknown as SkillConfig;
      const result = await syncService.checkForUpdates(config);
      expect(result).toBeNull();
    });

    it('should return null if metadata.json is missing', async () => {
      const config = {
        registry: 'https://github.com/o/r',
        skills: { ts: { ref: 'v1' } },
      } as unknown as SkillConfig;
      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'main',
      });
      mockGithubService.getRawFile.mockResolvedValue(null);
      const result = await syncService.checkForUpdates(config);
      expect(result).toBeNull();
    });

    it('should return updates if versions differ', async () => {
      const config = {
        registry: 'https://github.com/o/r',
        skills: {
          ts: { ref: 'ts-v1.0.0' },
          common: { ref: 'common-v1.0.0' },
        },
      } as unknown as SkillConfig;
      const metadata = {
        categories: {
          ts: { version: '1.1.0', tag_prefix: 'ts-v' },
          common: { version: '1.0.0', tag_prefix: 'common-v' },
        },
      };

      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'main',
      });
      mockGithubService.getRawFile.mockResolvedValue(JSON.stringify(metadata));

      const result = await syncService.checkForUpdates(config);

      expect(result).toEqual({ ts: 'ts-v1.1.0' });
    });

    it('should return null if everything is up to date', async () => {
      const config = {
        registry: 'https://github.com/o/r',
        skills: { ts: { ref: 'ts-v1.0.0' } },
      } as unknown as SkillConfig;
      const metadata = {
        categories: {
          ts: { version: '1.0.0', tag_prefix: 'ts-v' },
        },
      };

      mockGithubService.getRepoInfo.mockResolvedValue({
        default_branch: 'main',
      });
      mockGithubService.getRawFile.mockResolvedValue(JSON.stringify(metadata));

      const result = await syncService.checkForUpdates(config);

      expect(result).toBeNull();
    });

    it('should handle errors and log in debug mode (line 392 coverage)', async () => {
      process.env.DEBUG = 'true';
      const config = { registry: 'https://github.com/o/r' } as any;
      mockGithubService.getRepoInfo.mockRejectedValue(new Error('Fatal'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await syncService.checkForUpdates(config);
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Update check failed'),
      );
      delete process.env.DEBUG;
    });

    it('should ignore categories not present in metadata (line 377 coverage)', async () => {
      const config = {
        registry: 'https://github.com/o/r',
        skills: { unknown: { ref: 'v1' } },
      } as any;
      mockGithubService.getRawFile.mockResolvedValue(
        JSON.stringify({ categories: {} }),
      );
      const result = await syncService.checkForUpdates(config);
      expect(result).toBeNull();
    });
  });

  describe('writeWorkflows', () => {
    it('should write workflows to .agent/workflows', async () => {
      const workflows = [
        {
          skill: 'workflows',
          files: [{ name: 'w1.md', content: 'content' }],
        },
      ] as any[];
      await syncService.writeWorkflows(workflows, {} as any);
      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('.agent/workflows/w1.md'),
        'content',
      );
    });

    it('should skip non-workflow skills and do nothing if empty', async () => {
      await syncService.writeWorkflows([], {} as any);
      await syncService.writeWorkflows(
        [{ skill: 'other', files: [], category: 'other' } as any],
        {} as any,
      );
      expect(fs.outputFile).not.toHaveBeenCalled();
    });
  });

  describe('applyIndices Edge Cases', () => {
    it('should default to all agents if no agents are enabled', async () => {
      const config = {
        registry: 'url',
        skills: {},
        agents: undefined,
      } as unknown as SkillConfig;
      await syncService.applyIndices(config);
      expect(mockGenerate).toHaveBeenCalled();
    });

    it('should NOT default to all agents if agents is explicitly empty', async () => {
      const config = {
        registry: 'url',
        skills: {},
        agents: [],
      } as unknown as SkillConfig;
      await syncService.applyIndices(config, []);
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it('should do nothing if agent definition is not found', async () => {
      const config = {
        registry: 'url',
        skills: {},
        agents: undefined,
      } as unknown as SkillConfig;
      await syncService.applyIndices(config, [
        'unknown-agent' as unknown as Agent,
      ]);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
      );
      expect(mockGenerate).not.toHaveBeenCalled();
    });
  });
});
