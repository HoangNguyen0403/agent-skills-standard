import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubService } from '../GithubService';
import { SyncService } from '../SyncService';

vi.mock('fs-extra');

describe('SyncService', () => {
  let syncService: SyncService;
  let mockGithubService: any;
  let mockConfigService: any;

  beforeEach(() => {
    vi.clearAllMocks();
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
    it('should filter entries by syncedSkills', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      mockGithubService.getRawFile.mockResolvedValue(
        JSON.stringify({
          cat1: '| cat1/s1 | t1 | d1\n| cat1/s2 | t2 | d2',
        }),
      );

      const config: any = { registry: 'url', skills: { cat1: {} } };
      const syncedSkills: any[] = [{ category: 'cat1', skill: 's1' }];

      await syncService.applyIndices(config, syncedSkills);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('index updated (1 skills)'),
      );
      GithubService.parseGitHubUrl = oldParse;
    });

    it('should handle no pre-generated index', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      mockGithubService.getRawFile.mockResolvedValue(null);
      const config: any = { registry: 'url', skills: { cat1: {} } };
      await syncService.applyIndices(config);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No pre-generated index found'),
      );
      GithubService.parseGitHubUrl = oldParse;
    });
  });

  describe('applyIndices Variants', () => {
    it('should include all entries if syncedSkills is missing', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      mockGithubService.getRawFile.mockResolvedValue(
        JSON.stringify({ cat1: '| cat1/s1 | t1 | d1' }),
      );

      const config: any = { registry: 'url', skills: { cat1: {} } };
      await syncService.applyIndices(config, undefined);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('index updated (1 skills)'),
      );
      GithubService.parseGitHubUrl = oldParse;
    });

    it('should skip if no entries found', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      mockGithubService.getRawFile.mockResolvedValue(
        JSON.stringify({ cat1: '' }),
      );

      const config: any = { registry: 'url', skills: { cat1: {} } };
      await syncService.applyIndices(config, []);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No matching skills'),
      );
      GithubService.parseGitHubUrl = oldParse;
    });

    it('should handle errors in applyIndices', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      mockGithubService.getRawFile.mockRejectedValue(new Error('Fetch fail'));

      const config: any = { registry: 'url', skills: { cat1: {} } };
      await syncService.applyIndices(config, []);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update index'),
      );
      GithubService.parseGitHubUrl = oldParse;
    });
  });

  describe('checkForUpdates Coverage', () => {
    it('should return config unchanged', async () => {
      const config: any = { registry: 'url' };
      const result = await syncService.checkForUpdates(config);
      expect(result).toBe(config);
    });
  });
});
