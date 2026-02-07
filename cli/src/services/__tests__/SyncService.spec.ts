import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { GithubService } from '../GithubService';
import { IndexGeneratorService } from '../IndexGeneratorService';
import { SyncService } from '../SyncService';

// Mock fs-extra
vi.mock('fs-extra');

// Mock IndexGeneratorService
vi.mock('../IndexGeneratorService');

describe('SyncService', () => {
  let syncService: SyncService;
  let mockGithubService: any;
  let mockConfigService: any;

  // Define mock methods for IndexGenerator
  const mockGenerate = vi.fn();
  const mockInject = vi.fn();
  const mockBridge = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset implementations
    mockGenerate.mockResolvedValue('index content');
    mockInject.mockResolvedValue(undefined);
    mockBridge.mockResolvedValue(undefined);

    // Setup IndexGeneratorService mock implementation
    // Setup IndexGeneratorService mock implementation
    (IndexGeneratorService as any).mockImplementation(function () {
      return {
        generate: mockGenerate,
        inject: mockInject,
        bridge: mockBridge,
      };
    });

    syncService = new SyncService();

    // Inject mocks into private fields
    mockGithubService = {
      getRepoTree: vi.fn(),
      fetchSkillFiles: vi.fn(),
      downloadFilesConcurrent: vi.fn(),
      getRawFile: vi.fn(),
    };
    mockConfigService = {
      reconcileDependencies: vi.fn(),
      saveConfig: vi.fn(),
    };

    (syncService as any).githubService = mockGithubService;
    (syncService as any).configService = mockConfigService;

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('reconcileConfig', () => {
    it('should reconcile dependencies and save config if changed', async () => {
      const config: any = { skills: { test: {} } };
      const deps = new Set(['pkg']);
      mockConfigService.reconcileDependencies.mockReturnValue(['skill1']);
      const result = await syncService.reconcileConfig(config, deps);
      expect(result).toBe(true);
      expect(mockConfigService.saveConfig).toHaveBeenCalled();
    });

    it('should handle no changes', async () => {
      const config: any = { skills: { test: {} } };
      mockConfigService.reconcileDependencies.mockReturnValue([]);
      const result = await syncService.reconcileConfig(config, new Set());
      expect(result).toBe(false);
    });
  });

  describe('assembleSkills', () => {
    it('should fail if registry is not GitHub', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi.fn().mockReturnValue(null);
      const config: any = { registry: 'invalid' };
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
      const config: any = { registry: 'u', skills: { c: {} } };
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
      const config: any = { registry: 'url', skills: { test: { ref: 'v1' } } };
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
      const config: any = {
        registry: 'url',
        skills: { cat1: { include: ['s1', 'other/s2'] } },
      };
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [
          { path: 'skills/cat1/s1/SKILL.md', type: 'blob' },
          { path: 'skills/other/s2/SKILL.md', type: 'blob' },
        ],
      });
      mockGithubService.downloadFilesConcurrent.mockImplementation(
        (tasks: any[]) => tasks.map((t) => ({ path: t.path, content: 'c' })),
      );
      const result = await syncService.assembleSkills(['cat1'], config);
      expect(result).toHaveLength(2);
      GithubService.parseGitHubUrl = oldParse;
    });
  });

  describe('identifyFoldersToSync & expandAbsoluteInclude', () => {
    it('should handle wildcard * and skip duplicates', () => {
      const tree: any[] = [{ path: 'skills/other/s1/SKILL.md', type: 'blob' }];
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
      const catConfig: any = { include: ['some-other-skill'] };
      const tree: any[] = [{ path: 'skills/test/s1/', type: 'tree' }];
      // @ts-expect-error - private
      const result = syncService.identifyFoldersToSync('test', catConfig, tree);
      expect(result).not.toContain('s1');
    });

    it('should include folder if explicitly in include list', () => {
      const catConfig: any = { include: ['s1'] };
      const tree: any[] = [{ path: 'skills/test/s1/', type: 'tree' }];
      // @ts-expect-error - private
      const result = syncService.identifyFoldersToSync('test', catConfig, tree);
      expect(result).toContain('s1');
    });

    it('should exclude folder if in exclude list', () => {
      const catConfig: any = { exclude: ['s1'] };
      const tree: any[] = [{ path: 'skills/test/s1/', type: 'tree' }];
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
      const catConfig: any = { include: undefined };
      const tree: any[] = [{ path: 'skills/test/s1/', type: 'tree' }];
      // @ts-expect-error - private
      const result = syncService.identifyFoldersToSync('test', catConfig, tree);
      expect(result).toContain('s1');
    });
  });

  describe('writeSkills & isOverridden', () => {
    it('should use default agents if agents array is missing', async () => {
      const skills: any[] = [
        {
          category: 'test',
          skill: 's',
          files: [{ name: 'f', content: 'c' }],
        },
      ];
      await syncService.writeSkills(skills, {
        registry: 'u',
        skills: {},
      } as any);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Antigravity'),
      );
    });

    it('should skip agent loop if agent definition is missing', async () => {
      const config: any = { agents: ['unknown'] };
      await syncService.writeSkills([], config);
    });

    it('should skip file if overridden', async () => {
      const skills: any[] = [
        {
          category: 'test',
          skill: 's',
          files: [{ name: 'file.md', content: 'c' }],
        },
      ];
      const config: any = { agents: ['cursor'], custom_overrides: ['O'] };
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
      const skills: any[] = [
        {
          category: 'test',
          skill: 's',
          files: [{ name: '../malicious', content: 'c' }],
        },
      ];
      await syncService.writeSkills(skills, { agents: ['cursor'] } as any);
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
      mockGithubService.downloadFilesConcurrent.mockImplementation((t: any[]) =>
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
      const config: any = {
        registry: 'url',
        skills: { cat1: {} },
        agents: [Agent.Cursor],
      };

      await syncService.applyIndices(config, [Agent.Cursor]);

      expect(IndexGeneratorService).toHaveBeenCalled();

      // Verify methods were called on the mock instance
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.any(String), // baseDir path
        ['cat1'], // categories
      );
      expect(mockInject).toHaveBeenCalledWith(process.cwd(), 'index content');
      expect(mockBridge).toHaveBeenCalled();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('index updated'),
      );
    });

    it('should handle IndexGenerator errors', async () => {
      const config: any = {
        registry: 'url',
        skills: { cat1: {} },
        agents: [Agent.Cursor],
      };

      // Force error on generate
      mockGenerate.mockRejectedValueOnce(new Error('Gen fail'));

      await syncService.applyIndices(config);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update index'),
      );
    });
  });

  describe('checkForUpdates Coverage', () => {
    it('should return config unchanged', async () => {
      const config: any = { registry: 'url' };
      const result = await syncService.checkForUpdates(config);
      expect(result).toBe(config);
    });
  });

  describe('assembleWorkflows', () => {
    it('should return empty if workflows are disabled in config', async () => {
      const config: any = { workflows: false };
      const result = await syncService.assembleWorkflows(config);
      expect(result).toEqual([]);
    });

    it('should return empty if registry URL is invalid', async () => {
      const config: any = { workflows: true, registry: 'invalid' };
      const result = await syncService.assembleWorkflows(config);
      expect(result).toEqual([]);
    });

    it('should return empty if fetching tree fails', async () => {
      const config: any = {
        workflows: true,
        registry: 'https://github.com/o/r',
        skills: { c: { ref: 'main' } },
      };
      (syncService as any).githubService.getRepoTree.mockResolvedValue(null);
      const result = await syncService.assembleWorkflows(config);
      expect(result).toEqual([]);
    });

    it('should fetch all workflows if config.workflows is true', async () => {
      const config: any = {
        workflows: true,
        registry: 'https://github.com/o/r',
        skills: { c: { ref: 'main' } },
      };
      const treeData = {
        tree: [
          { path: '.agent/workflows/w1.md' },
          { path: '.agent/workflows/w2.md' },
          { path: 'other/file.md' },
        ],
      };
      (syncService as any).githubService.getRepoTree.mockResolvedValue(
        treeData,
      );
      (
        syncService as any
      ).githubService.downloadFilesConcurrent.mockResolvedValue([
        { path: '.agent/workflows/w1.md', content: 'c1' },
      ]);

      const result = await syncService.assembleWorkflows(config);

      expect(result).toHaveLength(1);
      expect(result[0].skill).toBe('workflows');
    });

    it('should fetch specific workflows if config.workflows is an array', async () => {
      const config: any = {
        workflows: ['w1'],
        registry: 'https://github.com/o/r',
        skills: { c: { ref: 'main' } },
      };
      const treeData = {
        tree: [
          { path: '.agent/workflows/w1.md' },
          { path: '.agent/workflows/w2.md' },
        ],
      };
      (syncService as any).githubService.getRepoTree.mockResolvedValue(
        treeData,
      );
      (
        syncService as any
      ).githubService.downloadFilesConcurrent.mockResolvedValue([]);

      await syncService.assembleWorkflows(config);

      expect(
        (syncService as any).githubService.downloadFilesConcurrent,
      ).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ path: '.agent/workflows/w1.md' }),
        ]),
      );
    });
  });

  describe('writeWorkflows', () => {
    it('should write workflows to .agent/workflows', async () => {
      const workflows: any[] = [
        {
          skill: 'workflows',
          files: [{ name: 'w1.md', content: 'content' }],
        },
      ];
      await syncService.writeWorkflows(workflows);
      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('.agent/workflows/w1.md'),
        'content',
      );
    });

    it('should skip non-workflow skills and do nothing if empty', async () => {
      await syncService.writeWorkflows([]);
      await syncService.writeWorkflows([
        { skill: 'other', files: [], category: 'other' },
      ]);
      expect(fs.outputFile).not.toHaveBeenCalled();
    });
  });

  describe('applyIndices Edge Cases', () => {
    it('should default to all agents if no agents are enabled', async () => {
      const config: any = {
        registry: 'url',
        skills: {},
        agents: [],
      };
      await syncService.applyIndices(config, []);
      expect(mockGenerate).toHaveBeenCalled();
    });

    it('should do nothing if agent definition is not found', async () => {
      const config: any = {
        registry: 'url',
        skills: {},
        agents: [],
      };
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
