import fs from 'fs-extra';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { SkillConfig } from '../../models/config';
import { GithubService } from '../GithubService';
import type { GitHubTreeItem } from '../../models/types';
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
      downloadFilesConcurrentBytes: vi.fn(),
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
      await expect(
        skillSyncService.assembleSkills(['test'], config),
      ).rejects.toThrow('Failed to assemble');
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
      await expect(
        skillSyncService.assembleSkills(['test'], config),
      ).rejects.toThrow('Failed to assemble');
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
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        (tasks: { path: string }[]) => ({
          ok: tasks.map((t) => ({ path: t.path, content: Buffer.from('c') })),
          failed: [],
        }),
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
      const config = {
        registry: 'https://github.com/o/r',
        skills: { common: {} },
        prune: true,
      } as any;
      const skills = [{ category: 'common', skill: 'new-skill', files: [] }];
      const agents = [Agent.Cursor];

      vi.mocked(fs.pathExists).mockImplementation(async (candidate) =>
        String(candidate).endsWith(path.join('.cursor', 'skills', 'common')),
      );
      vi.mocked(fs.readdir).mockResolvedValue(['old-skill'] as any);

      await skillSyncService.writeSkills(skills as any, config, agents);

      expect(fs.remove).toHaveBeenCalledWith(
        expect.stringContaining('old-skill'),
      );
    });

    it('should NOT prune directories protected by custom_overrides', async () => {
      const config = {
        registry: 'https://github.com/o/r',
        skills: { common: {} },
        prune: true,
        custom_overrides: ['common/old-skill'],
      } as any;
      const skills = [{ category: 'common', skill: 'new-skill', files: [] }];
      const agents = [Agent.Cursor];

      vi.mocked(fs.pathExists).mockImplementation(async (candidate) =>
        String(candidate).endsWith(path.join('.cursor', 'skills', 'common')),
      );
      vi.mocked(fs.readdir).mockResolvedValue(['old-skill'] as any);

      await skillSyncService.writeSkills(skills as any, config, agents);

      expect(fs.remove).not.toHaveBeenCalledWith(
        expect.stringContaining('old-skill'),
      );
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
      await expect(
        skillSyncService.writeSkills(skills, config, [Agent.Cursor]),
      ).resolves.toBeUndefined();
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

    // Test intent: unsafe downloaded paths are a terminal sync failure, never
    // a retained-package warning that permits lockfile replacement.
    it('rejects an unsafe skill resource path', async () => {
      const skills = [
        {
          category: 'test',
          skill: 's',
          files: [{ name: '../malicious', content: 'c' }],
        },
      ] as any[];
      await expect(
        skillSyncService.writeSkills(skills, {} as any, [Agent.Cursor]),
      ).rejects.toThrow('Invalid path ../malicious');
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
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        (t: { path: string }[]) => ({
          ok: t.map((x) => ({ path: x.path, content: Buffer.from('c') })),
          failed: [],
        }),
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

    // Test intent: selected package resources include root attribution files and
    // retain their source bytes; omitting any selected resource rejects the package.
    it('should fetch root attribution files and package resources as bytes', async () => {
      const tree: GitHubTreeItem[] = [
        {
          path: 'LICENSE.md',
          type: 'blob',
          sha: 'license',
          url: 'license-url',
        },
        { path: 'NOTICE', type: 'blob', sha: 'notice', url: 'notice-url' },
        {
          path: 'skills/c/s/SKILL.md',
          type: 'blob',
          sha: 'skill',
          url: 'skill-url',
        },
        {
          path: 'skills/c/s/assets/payload.bin',
          type: 'blob',
          sha: 'asset',
          url: 'asset-url',
        },
      ];
      const asset = Buffer.from([0, 255, 17]);
      mockGithubService.downloadFilesConcurrentBytes.mockResolvedValue({
        ok: [
          { path: 'LICENSE.md', content: Buffer.from('license') },
          { path: 'NOTICE', content: Buffer.from('notice') },
          { path: 'skills/c/s/SKILL.md', content: Buffer.from('skill') },
          { path: 'skills/c/s/assets/payload.bin', content: asset },
        ],
        failed: [],
      });

      // fetchSkill accepts tree data returned by the GitHub tree API.
      // @ts-expect-error - testing private package assembly boundary
      const result = await skillSyncService.fetchSkill(
        'o',
        'r',
        'ref',
        'c',
        's',
        tree,
      );

      expect(result?.files.map((file) => file.name)).toEqual([
        'LICENSE.md',
        'NOTICE',
        'SKILL.md',
        'assets/payload.bin',
      ]);
      expect(
        result?.files.find((file) => file.name === 'assets/payload.bin')?.bytes,
      ).toEqual(asset);
    });

    // Test intent: a package-specific attribution file must win over a
    // repository-root fallback with the same basename, avoiding a collision.
    it('prefers skill-root attribution over a same-named repository resource', async () => {
      const tree: GitHubTreeItem[] = [
        { path: 'LICENSE.md', type: 'blob', sha: 'global', url: 'global-url' },
        {
          path: 'skills/c/s/LICENSE.md',
          type: 'blob',
          sha: 'local',
          url: 'local-url',
        },
        {
          path: 'skills/c/s/SKILL.md',
          type: 'blob',
          sha: 'skill',
          url: 'skill-url',
        },
      ];
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        (tasks: { path: string }[]) => ({
          ok: tasks.map((task) => ({
            path: task.path,
            content: Buffer.from(
              task.path === 'skills/c/s/LICENSE.md' ? 'local license' : 'skill',
            ),
          })),
          failed: [],
        }),
      );

      // @ts-expect-error - testing private package assembly boundary
      const result = await skillSyncService.fetchSkill(
        'o',
        'r',
        'ref',
        'c',
        's',
        tree,
      );

      expect(result?.files).toEqual([
        {
          name: 'LICENSE.md',
          content: 'local license',
          bytes: Buffer.from('local license'),
        },
        { name: 'SKILL.md', content: 'skill', bytes: Buffer.from('skill') },
      ]);
      expect(
        mockGithubService.downloadFilesConcurrentBytes.mock.calls[0][0].map(
          (task: { path: string }) => task.path,
        ),
      ).toEqual(['skills/c/s/LICENSE.md', 'skills/c/s/SKILL.md']);
    });

    it('should fail closed when a selected package resource download fails', async () => {
      const tree: GitHubTreeItem[] = [
        {
          path: 'skills/c/s/SKILL.md',
          type: 'blob',
          sha: 'skill',
          url: 'skill-url',
        },
        {
          path: 'skills/c/s/references/source.md',
          type: 'blob',
          sha: 'reference',
          url: 'reference-url',
        },
      ];
      mockGithubService.downloadFilesConcurrentBytes.mockResolvedValue({
        ok: [{ path: 'skills/c/s/SKILL.md', content: Buffer.from('skill') }],
        failed: [
          { path: 'skills/c/s/references/source.md', reason: 'not found' },
        ],
      });

      mockGithubService.getRepoTree.mockResolvedValue({ tree });
      await expect(
        skillSyncService.assembleSkills(['c'], {
          registry: 'https://github.com/o/r',
          agents: [Agent.Codex],
          skills: { c: { ref: 'ref', include: ['s'] } },
        }),
      ).rejects.toThrow('Failed to assemble selected skills: c/s');
    });

    it('should handle relative vs absolute skill fetch', async () => {
      const tree = [{ path: 'skills/other/s/SKILL.md', type: 'blob' }];
      mockGithubService.downloadFilesConcurrentBytes.mockResolvedValue({
        ok: [{ path: 'skills/other/s/SKILL.md', content: Buffer.from('c') }],
        failed: [],
      });
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
      mockGithubService.downloadFilesConcurrentBytes.mockResolvedValue({
        ok: [],
        failed: [],
      });
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
      // js-yaml quotes a scalar with a trailing space ('Test - '), unlike
      // the old unquoted regex-built output — same content, safely emitted.
      expect(res).toContain("name: 'Test - '");
      expect(res).toContain('description:');
    });

    it('should preserve Kiro metadata except routing triggers', () => {
      const content = [
        '---',
        'name: My skill',
        'description: Desc',
        'version: 1.0.0',
        'risk_tier: L2',
        'metadata:',
        '  upstream:',
        '    - source: github',
        '      repo: owner/repo',
        '  triggers:',
        '    keywords: ["foo"]',
        '---',
        'Body',
      ].join('\n');
      // @ts-ignore - private
      const res = skillSyncService.transformSkillForKiro(content, 'test');
      expect(res).toContain('version: 1.0.0');
      expect(res).toContain('risk_tier: L2');
      expect(res).toContain('metadata:');
      expect(res).toContain('upstream:');
      expect(res).not.toContain('triggers:');
    });

    it('does not let a crafted description inject a new frontmatter key', () => {
      // The decoded description value contains a literal quote + newline
      // (via YAML \" / \n escapes in a properly double-quoted source
      // scalar) — exactly what the old raw-interpolation code would have
      // let "close" the description field early and start a new key.
      const content = `---\nname: My skill\ndescription: "Desc\\"\\nrisk_tier: L3"\n---\nBody`;
      // @ts-ignore - private
      const res = skillSyncService.transformSkillForKiro(content, 'test');
      const frontmatterMatch = res.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      expect(frontmatterMatch).not.toBeNull();
      const parsed = yaml.load(frontmatterMatch![1]) as Record<string, unknown>;
      expect(parsed.risk_tier).toBeUndefined();
    });

    it('should fail closed (return original content) on malformed YAML frontmatter', () => {
      const content = '---\nname: [unterminated\n---\nBody';
      // @ts-ignore - private
      const res = skillSyncService.transformSkillForKiro(content, 'test');
      expect(res).toBe(content);
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
