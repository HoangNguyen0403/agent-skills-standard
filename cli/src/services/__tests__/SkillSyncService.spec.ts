import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { SkillConfig } from '../../models/config';
import { GithubService } from '../GithubService';
import { SkillSyncService } from '../SkillSyncService';

// Mock fs-extra
vi.mock('fs-extra');

describe('SkillSyncService', () => {
  let skillSyncService: SkillSyncService;
  let mockGithubService: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGithubService = {
      getRepoTree: vi.fn(),
      fetchSkillFiles: vi.fn(),
      downloadFilesConcurrent: vi.fn(),
      getRawFile: vi.fn(),
      getRepoInfo: vi.fn(),
    };

    skillSyncService = new SkillSyncService(mockGithubService as any);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('assembleSkills', () => {
    it('should fail if registry is not GitHub', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi.fn().mockReturnValue(null);
      const config = { registry: 'invalid' } as unknown as SkillConfig;
      const result = await skillSyncService.assembleSkills(['test'], config);
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
      await skillSyncService.assembleSkills(['c'], config);
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
      const result = await skillSyncService.assembleSkills(['test'], config);
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
      const result = await skillSyncService.assembleSkills(['cat1'], config);
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
      // @ts-ignore - private
      skillSyncService.expandAbsoluteInclude('other/*', folders, tree);
      expect(folders).toHaveLength(1);

      const emptyFolders: string[] = [];
      // @ts-ignore - private
      skillSyncService.expandAbsoluteInclude('other/*', emptyFolders, tree);
      expect(emptyFolders).toContain('other/s1');
    });

    it('should exclude folder if not in include list', () => {
      const catConfig = {
        include: ['some-other-skill'],
      } as any;
      const tree = [{ path: 'skills/test/s1/', type: 'tree' }] as any[];
      // @ts-ignore - private
      const result = skillSyncService.identifyFoldersToSync(
        'test',
        catConfig,
        tree,
      );
      expect(result).not.toContain('s1');
    });

    it('should include folder if explicitly in include list', () => {
      const catConfig = { include: ['s1'] } as any;
      const tree = [{ path: 'skills/test/s1/', type: 'tree' }] as any[];
      // @ts-ignore - private
      const result = skillSyncService.identifyFoldersToSync(
        'test',
        catConfig,
        tree,
      );
      expect(result).toContain('s1');
    });

    it('should exclude folder if in exclude list', () => {
      const catConfig = { exclude: ['s1'] } as any;
      const tree = [{ path: 'skills/test/s1/', type: 'tree' }] as any[];
      // @ts-ignore - private
      const result = skillSyncService.identifyFoldersToSync(
        'test',
        catConfig,
        tree,
      );
      expect(result).not.toContain('s1');
    });

    it('should handle non-existent absolute includes', () => {
      const folders: string[] = [];
      // @ts-ignore - private
      skillSyncService.expandAbsoluteInclude('missing/skill', folders, []);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('not found in repository'),
      );
    });

    it('should cover include check bypass', () => {
      const catConfig = { include: undefined } as any;
      const tree = [{ path: 'skills/test/s1/', type: 'tree' }] as any[];
      // @ts-ignore - private
      const result = skillSyncService.identifyFoldersToSync(
        'test',
        catConfig,
        tree,
      );
      expect(result).toContain('s1');
    });
  });

  describe('writeSkills & isOverridden', () => {
    it('should write skills to .kiro/skills/ when Kiro agent is configured', async () => {
      const skills = [
        {
          category: 'test',
          skill: 's',
          files: [{ name: 'SKILL.md', content: 'content' }],
        },
      ] as any[];
      const config = {
        custom_overrides: [],
      } as unknown as SkillConfig;
      await skillSyncService.writeSkills(skills, config, [Agent.Kiro]);
      expect(fs.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('.kiro/skills'),
      );
    });

    it('should prune orphaned skill directories if not overridden', async () => {
      const config = { registry: 'https://github.com/o/r', skills: { common: {} }, prune: true } as any;
      const skills = [{ category: 'common', skill: 'new-skill', files: [] }];
      const agents = [Agent.Cursor];

      vi.mocked(fs.pathExists).mockResolvedValue(true as never);
      vi.mocked(fs.readdir).mockResolvedValue(['old-skill'] as any);
      
      await skillSyncService.writeSkills(skills as any, config, agents);

      expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining('old-skill'));
    });

    it('should NOT prune directories protected by custom_overrides', async () => {
      const config = { 
        registry: 'https://github.com/o/r', 
        skills: { common: {} }, 
        prune: true,
        custom_overrides: ['common/old-skill']
      } as any;
      const skills = [{ category: 'common', skill: 'new-skill', files: [] }];
      const agents = [Agent.Cursor];

      vi.mocked(fs.pathExists).mockResolvedValue(true as never);
      vi.mocked(fs.readdir).mockResolvedValue(['old-skill'] as any);
      
      await skillSyncService.writeSkills(skills as any, config, agents);

      expect(fs.remove).not.toHaveBeenCalledWith(expect.stringContaining('old-skill'));
    });

    it('should skip agent loop if agent definition is missing', async () => {
      const config = {} as any;
      await skillSyncService.writeSkills([], config, ['unknown' as any]);
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
        custom_overrides: ['O'],
      } as unknown as SkillConfig;
      vi.spyOn(skillSyncService as any, 'isOverridden').mockReturnValue(true);
      await skillSyncService.writeSkills(skills, config, [Agent.Cursor]);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Skipping overridden'),
      );
    });

    it('isOverridden logic branches', () => {
      const normalizeSpy = vi.spyOn(skillSyncService as any, 'normalizePath');
      normalizeSpy.mockReturnValue('a/b/c');
      // @ts-ignore - private
      expect(skillSyncService.isOverridden('any', ['a/b/c'])).toBe(true);
      normalizeSpy.mockReturnValue('a/b/sub/file');
      // @ts-ignore - private
      expect(skillSyncService.isOverridden('any', ['a/b'])).toBe(true);
      normalizeSpy.mockReturnValue('other/path');
      // @ts-ignore - private
      expect(skillSyncService.isOverridden('any', ['a/b'])).toBe(false);
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
      await skillSyncService.writeSkills(skills, {} as any, [Agent.Cursor]);
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
      // @ts-ignore - private
      const res = await skillSyncService.fetchSkill(
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
      // @ts-ignore - private
      const res = await skillSyncService.fetchSkill(
        'o',
        'r',
        'ref',
        'cat',
        'other/s',
        tree as any,
      );
      expect(res!.category).toBe('other');
    });

    it('should return null if no files were downloaded', async () => {
      mockGithubService.downloadFilesConcurrent.mockResolvedValue([]);
      // @ts-ignore - private
      const res = await skillSyncService.fetchSkill(
        'o',
        'r',
        'ref',
        'cat',
        's',
        [],
      );
      expect(res).toBeNull();
    });
  });

  describe('transformSkillForKiro', () => {
    it('should transform frontmatter correctly', () => {
      const content = '---\nname: My skill\ndescription: Desc\n---\nBody';
      // @ts-ignore - private
      const res = skillSyncService.transformSkillForKiro(content, 'test');
      expect(res).toContain('name: Test - My skill');
      expect(res).toContain('Body');
    });

    it('should return original content if no frontmatter found', () => {
      const content = 'No frontmatter';
      // @ts-ignore - private
      const res = skillSyncService.transformSkillForKiro(content, 'test');
      expect(res).toBe(content);
    });

    it('should handle missing name/description in frontmatter', () => {
      const content = '---\nfoo: bar\n---\nBody';
      // @ts-ignore - private
      const res = skillSyncService.transformSkillForKiro(content, 'test');
      expect(res).toContain('name: Test -');
      expect(res).toContain('description:');
    });
  });

  describe('Utility methods', () => {
    it('isPathSafe should validate paths correctly', () => {
      const root = '/app/skills';
      // @ts-ignore - private
      expect(skillSyncService.isPathSafe('/app/skills/safe', root)).toBe(true);
      // @ts-ignore - private
      expect(skillSyncService.isPathSafe('/etc/passwd', root)).toBe(false);
    });

    it('isPathSafe should reject sibling directories that share a common prefix (Fix 2)', () => {
      const root = '/app/skills';
      // Without path.sep fix, '/app/skills-secret/foo' would pass the old startsWith check.
      // @ts-ignore - private
      expect(
        (skillSyncService as any).isPathSafe('/app/skills-secret/foo.md', root),
      ).toBe(false);
      // @ts-ignore - private
      expect(
        (skillSyncService as any).isPathSafe('/app/skillsXmalicious', root),
      ).toBe(false);
      // A valid deeply nested path must still pass.
      // @ts-ignore - private
      expect(
        (skillSyncService as any).isPathSafe(
          '/app/skills/nested/deep/file.md',
          root,
        ),
      ).toBe(true);
    });

    it('expandAbsoluteInclude should bail on invalid format', () => {
      const folders: string[] = [];
      // @ts-ignore - private
      skillSyncService.expandAbsoluteInclude('invalid', folders, []);
      expect(folders).toHaveLength(0);
    });
  });
});
