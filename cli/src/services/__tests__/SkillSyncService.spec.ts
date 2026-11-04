import fs from 'fs-extra';
import { createHash } from 'node:crypto';
import type { Stats } from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { SkillConfig } from '../../models/config';
import { GithubService, IntegrityError } from '../GithubService';
import type { GitHubTreeItem } from '../../models/types';
import { SkillAssemblyError, SkillSyncService } from '../SkillSyncService';
import type { InstallWriter } from '../install/OwnershipWriter';
import { ManifestVerifier } from '../install/ManifestVerifier';
import {
  buildAttributionCatalog,
  validateAttributionCatalog,
} from '../AttributionService';

// Mock fs-extra
vi.mock('fs-extra');

describe('SkillSyncService', () => {
  let skillSyncService: SkillSyncService;
  let mockGithubService: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.lstat as (path: string) => Promise<Stats>).mockResolvedValue({
      isSymbolicLink: () => false,
    } as Stats);

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

    // Test intent: a release-manifest rejection of any package file (not just
    // SKILL.md) is an integrity failure that reaches the command as a typed
    // IntegrityError, carrying the exact file/path diagnostic, so a tampered
    // reference never installs beside a valid SKILL.md.
    it('rejects the whole package with IntegrityError when the verifier rejects a reference file', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      const config = {
        registry: 'https://github.com/o/r',
        skills: { cat1: {} },
      } as unknown as SkillConfig;
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [
          { path: 'skills/cat1/s1/SKILL.md', type: 'blob' },
          { path: 'skills/cat1/s1/references/guide.md', type: 'blob' },
        ],
      });
      mockGithubService.downloadFilesConcurrentBytes.mockResolvedValue({
        ok: [
          {
            path: 'skills/cat1/s1/SKILL.md',
            content: Buffer.from('skill content'),
          },
          {
            path: 'skills/cat1/s1/references/guide.md',
            content: Buffer.from('bad guide'),
          },
        ],
        failed: [],
      });

      const fakeVerifier = {
        check: vi
          .fn()
          .mockImplementation((path: string) =>
            path.includes('references/guide.md')
              ? 'sha256 does not match release MANIFEST.json'
              : null,
          ),
      };

      const failure = await skillSyncService
        .assembleSkills(['cat1'], config, {
          cat1: fakeVerifier as unknown as ManifestVerifier,
        })
        .catch((error: unknown) => error);
      GithubService.parseGitHubUrl = oldParse;

      expect(failure).toBeInstanceOf(IntegrityError);
      expect((failure as Error).message).toContain(
        'skills/cat1/s1/references/guide.md',
      );
      expect((failure as Error).message).toContain(
        'sha256 does not match release MANIFEST.json',
      );
      expect(failure).not.toBeInstanceOf(SkillAssemblyError);
    });

    it('rejects the package with IntegrityError when the verifier rejects SKILL.md', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      const config = {
        registry: 'https://github.com/o/r',
        skills: { cat1: {} },
      } as unknown as SkillConfig;
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [{ path: 'skills/cat1/s1/SKILL.md', type: 'blob' }],
      });
      mockGithubService.downloadFilesConcurrentBytes.mockResolvedValue({
        ok: [
          {
            path: 'skills/cat1/s1/SKILL.md',
            content: Buffer.from('tampered skill'),
          },
        ],
        failed: [],
      });

      const fakeVerifier = {
        check: vi
          .fn()
          .mockReturnValue('sha256 does not match release MANIFEST.json'),
      };

      const failure = await skillSyncService
        .assembleSkills(['cat1'], config, {
          cat1: fakeVerifier as unknown as ManifestVerifier,
        })
        .catch((error: unknown) => error);
      GithubService.parseGitHubUrl = oldParse;

      expect(failure).toBeInstanceOf(IntegrityError);
      expect((failure as Error).message).toContain('skills/cat1/s1/SKILL.md');
    });

    // Test intent: a package that is merely incomplete (no SKILL.md) or a
    // plain missing download stays an assembly failure, not an integrity one.
    it('keeps a package without SKILL.md as an assembly failure', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      const config = {
        registry: 'https://github.com/o/r',
        skills: { cat1: {} },
      } as unknown as SkillConfig;
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [
          { path: 'skills/cat1/s1/references/guide.md', type: 'blob' },
          { path: 'LICENSE', type: 'blob' },
        ],
      });
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        (tasks: { path: string }[]) => ({
          ok: tasks.map((task) => ({
            path: task.path,
            content: Buffer.from('resource'),
          })),
          failed: [],
        }),
      );

      const failure = await skillSyncService
        .assembleSkills(['cat1'], config)
        .catch((error: unknown) => error);
      GithubService.parseGitHubUrl = oldParse;

      expect(failure).toBeInstanceOf(SkillAssemblyError);
      expect(failure).not.toBeInstanceOf(IntegrityError);
      expect((failure as Error).message).toContain('cat1/s1');
    });

    // Test intent: a typed integrity failure raised by the download batch is
    // not reclassified or wrapped by assembly; it reaches the caller intact.
    it('propagates a typed download integrity failure unchanged', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      const config = {
        registry: 'https://github.com/o/r',
        skills: { cat1: {} },
      } as unknown as SkillConfig;
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [{ path: 'skills/cat1/s1/SKILL.md', type: 'blob' }],
      });
      const typed = new IntegrityError(
        'blob sha1 mismatch for skills/cat1/s1/SKILL.md',
      );
      mockGithubService.downloadFilesConcurrentBytes.mockRejectedValue(typed);

      const failure = await skillSyncService
        .assembleSkills(['cat1'], config)
        .catch((error: unknown) => error);
      GithubService.parseGitHubUrl = oldParse;

      expect(failure).toBe(typed);
    });

    // Test intent: repo-root LICENSE is copied into each package but is outside
    // the category manifest scope; a legacy manifest without the root
    // attribution namespace must not reject it, while package files stay
    // checked against the scope manifest.
    it('does not manifest-check repo-root LICENSE while still checking package files', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      const config = {
        registry: 'https://github.com/o/r',
        skills: { cat1: {} },
      } as unknown as SkillConfig;
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [
          { path: 'skills/cat1/s1/SKILL.md', type: 'blob' },
          { path: 'LICENSE', type: 'blob' },
        ],
      });
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        (tasks: { path: string }[]) => ({
          ok: tasks.map((t) => ({ path: t.path, content: Buffer.from('c') })),
          failed: [],
        }),
      );
      const fakeVerifier = {
        check: vi
          .fn()
          .mockImplementation((p: string) =>
            p === 'skills/cat1/s1/SKILL.md'
              ? null
              : 'not listed in release MANIFEST.json',
          ),
        checkRootAttribution: vi.fn().mockReturnValue(null),
        hasManifestEntry: vi.fn().mockReturnValue(false),
      };

      const result = await skillSyncService.assembleSkills(['cat1'], config, {
        cat1: fakeVerifier as unknown as ManifestVerifier,
      });

      expect(result[0].files.map((f) => f.name).sort()).toEqual([
        'LICENSE',
        'SKILL.md',
      ]);
      expect(fakeVerifier.check).not.toHaveBeenCalledWith(
        'LICENSE',
        expect.anything(),
      );
      GithubService.parseGitHubUrl = oldParse;
    });
  });

  describe('shared selection resolution', () => {
    it('applies a qualified exclusion after imported wildcard expansion', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      const config = {
        registry: 'https://github.com/o/r',
        skills: {
          react: {
            include: ['common/*'],
            exclude: ['common/common-tdd'],
          },
        },
      } as unknown as SkillConfig;
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [
          { path: 'skills/react/hooks/SKILL.md', type: 'blob' },
          { path: 'skills/common/common-tdd/SKILL.md', type: 'blob' },
          { path: 'skills/common/api-design/SKILL.md', type: 'blob' },
        ],
      });
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        (tasks: { path: string }[]) => ({
          ok: tasks.map((t) => ({ path: t.path, content: Buffer.from('c') })),
          failed: [],
        }),
      );

      const result = await skillSyncService.assembleSkills(['react'], config);

      expect(result.map((s) => `${s.category}/${s.skill}`)).toEqual([
        'common/api-design',
      ]);
      GithubService.parseGitHubUrl = oldParse;
    });

    it('does not let an imported qualified exclusion remove a local skill with the same name', async () => {
      const oldParse = GithubService.parseGitHubUrl;
      GithubService.parseGitHubUrl = vi
        .fn()
        .mockReturnValue({ owner: 'o', repo: 'r' });
      const config = {
        registry: 'https://github.com/o/r',
        skills: { react: { exclude: ['common/common-tdd'] } },
      } as unknown as SkillConfig;
      mockGithubService.getRepoTree.mockResolvedValue({
        tree: [
          { path: 'skills/react/common-tdd/SKILL.md', type: 'blob' },
          { path: 'skills/react/hooks/SKILL.md', type: 'blob' },
        ],
      });
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        (tasks: { path: string }[]) => ({
          ok: tasks.map((t) => ({ path: t.path, content: Buffer.from('c') })),
          failed: [],
        }),
      );

      const result = await skillSyncService.assembleSkills(['react'], config);

      expect(result.map((s) => s.skill)).toEqual(['common-tdd', 'hooks']);
      GithubService.parseGitHubUrl = oldParse;
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
      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('.kiro/skills'),
        expect.any(String),
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
        custom_overrides: ['O'],
      } as unknown as SkillConfig;
      vi.spyOn(skillSyncService as any, 'isOverridden').mockReturnValue(true);
      await expect(
        skillSyncService.writeSkills(skills, config, [Agent.Cursor]),
      ).resolves.toEqual({});
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

  describe('attribution provenance', () => {
    const COMMIT_A = 'a'.repeat(40);
    const COMMIT_B = 'b'.repeat(40);
    const SKILL_BLOB = '3'.repeat(40);
    const LICENSE_BLOB = '4'.repeat(40);
    const NOTICE_BLOB = '5'.repeat(40);

    function githubTree(items: Array<{ path: string; sha: string }>) {
      return {
        tree: items.map((item) => ({
          ...item,
          type: 'blob',
          url: `${item.path}-url`,
        })),
      };
    }

    function bytesFor(contents: Record<string, string>) {
      return (tasks: { path: string }[]) => ({
        ok: tasks.map((task) => ({
          path: task.path,
          content: Buffer.from(contents[task.path] ?? ''),
        })),
        failed: [],
      });
    }

    /**
     * Writer that records exactly the bytes it accepted and makes the
     * post-write installed-bytes verification read them back.
     */
    function recordingWriter(
      stored: Map<string, string | Buffer>,
    ): InstallWriter {
      const readFile = fs.readFile as unknown as (
        target: string,
      ) => Promise<Buffer>;
      vi.mocked(readFile).mockImplementation(async (target) => {
        const value = stored.get(String(target));
        if (value === undefined) throw new Error(`ENOENT: ${target}`);
        return Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
      });
      return {
        write: async (absPath, content) => {
          stored.set(absPath, content);
        },
      };
    }

    beforeEach(() => {
      vi.spyOn(GithubService, 'parseGitHubUrl').mockReturnValue({
        owner: 'o',
        repo: 'r',
      });
    });

    afterEach(() => {
      vi.mocked(GithubService.parseGitHubUrl).mockRestore();
    });

    function provenanceConfig() {
      return {
        registry: 'https://github.com/o/r',
        skills: { c: { ref: 'c-v1.0.0' } },
      } as unknown as SkillConfig;
    }

    // Test intent: every attribution byte carries the declaring source's
    // requested ref, resolved commit, real Git blob SHA-1 from the pinned tree,
    // and SHA-256 of the exact downloaded bytes. License and notice file
    // families keep distinct physical identities.
    it('records source identity and exact digests for package and root attribution', async () => {
      mockGithubService.getRepoTree.mockResolvedValue(
        githubTree([
          { path: 'skills/c/s/SKILL.md', sha: SKILL_BLOB },
          { path: 'skills/c/s/NOTICE', sha: NOTICE_BLOB },
          { path: 'LICENSE', sha: LICENSE_BLOB },
        ]),
      );
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        bytesFor({
          'skills/c/s/SKILL.md': 'skill',
          'skills/c/s/NOTICE': 'package notice',
          LICENSE: 'MIT text',
        }),
      );

      const result = await skillSyncService.assembleSkills(
        ['c'],
        provenanceConfig(),
        {},
        {},
        { c: { ref: 'c-v1.0.0', commit: COMMIT_A } },
      );

      expect(mockGithubService.getRepoTree).toHaveBeenCalledWith(
        'o',
        'r',
        'c-v1.0.0',
        { commit: COMMIT_A },
      );
      expect(
        mockGithubService.downloadFilesConcurrentBytes.mock.calls[0][0].map(
          (task: { commit?: string }) => task.commit,
        ),
      ).toEqual([COMMIT_A, COMMIT_A, COMMIT_A]);

      const byName = Object.fromEntries(
        result[0].files.map((file) => [file.name, file]),
      );
      expect(byName['SKILL.md'].attribution).toBeUndefined();
      expect(byName.NOTICE.attribution).toEqual({
        sourcePath: 'skills/c/s/NOTICE',
        sourceKind: 'package',
        requestedRef: 'c-v1.0.0',
        resolvedCommit: COMMIT_A,
        blobSha1: NOTICE_BLOB,
        sha256: createHash('sha256').update('package notice').digest('hex'),
        basis: 'commit-tree-blob',
      });
      expect(byName.LICENSE.attribution).toEqual({
        sourcePath: 'LICENSE',
        sourceKind: 'root',
        requestedRef: 'c-v1.0.0',
        resolvedCommit: COMMIT_A,
        blobSha1: LICENSE_BLOB,
        sha256: createHash('sha256').update('MIT text').digest('hex'),
        basis: 'commit-tree-blob',
      });
    });

    it('marks files-map-verified scope and root files with the manifest basis', async () => {
      mockGithubService.getRepoTree.mockResolvedValue(
        githubTree([
          { path: 'skills/c/s/SKILL.md', sha: SKILL_BLOB },
          { path: 'skills/c/s/LICENSE', sha: '6'.repeat(40) },
          { path: 'NOTICE', sha: NOTICE_BLOB },
        ]),
      );
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        bytesFor({
          'skills/c/s/SKILL.md': 'skill',
          'skills/c/s/LICENSE': 'apache text',
          NOTICE: 'notice text',
        }),
      );
      const verifier = new ManifestVerifier({
        schema_version: 1,
        tag: 'c-v1.0.0',
        commit: COMMIT_A,
        files: {
          'skills/c/s/SKILL.md': createHash('sha256')
            .update('skill')
            .digest('hex'),
          'skills/c/s/LICENSE': createHash('sha256')
            .update('apache text')
            .digest('hex'),
          NOTICE: createHash('sha256')
            .update('notice text')
            .digest('hex'),
        },
      });

      const result = await skillSyncService.assembleSkills(
        ['c'],
        provenanceConfig(),
        { c: verifier },
        {},
        { c: { ref: 'c-v1.0.0', commit: COMMIT_A } },
      );

      const byName = Object.fromEntries(
        result[0].files.map((file) => [file.name, file]),
      );
      expect(byName.LICENSE.attribution?.basis).toBe('release-manifest');
      expect(byName.NOTICE.attribution?.basis).toBe('release-manifest');
    });

    // Test intent: a legacy manifest that does not bind root attribution keeps
    // the honest commit-tree/blob basis instead of failing or claiming a
    // manifest verification that did not happen.
    it('records the commit-tree basis for root files a legacy manifest does not bind', async () => {
      mockGithubService.getRepoTree.mockResolvedValue(
        githubTree([
          { path: 'skills/c/s/SKILL.md', sha: SKILL_BLOB },
          { path: 'LICENSE', sha: LICENSE_BLOB },
        ]),
      );
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        bytesFor({
          'skills/c/s/SKILL.md': 'skill',
          LICENSE: 'MIT text',
        }),
      );
      const verifier = new ManifestVerifier({
        schema_version: 1,
        tag: 'c-v1.0.0',
        commit: COMMIT_A,
        files: {
          'skills/c/s/SKILL.md': createHash('sha256')
            .update('skill')
            .digest('hex'),
        },
      });

      const result = await skillSyncService.assembleSkills(
        ['c'],
        provenanceConfig(),
        { c: verifier },
        {},
        { c: { ref: 'c-v1.0.0', commit: COMMIT_A } },
      );

      const byName = Object.fromEntries(
        result[0].files.map((file) => [file.name, file]),
      );
      expect(byName.LICENSE.attribution?.basis).toBe('commit-tree-blob');
    });

    // Test intent: a manifest that names a different commit than the resolved
    // source is an integrity failure, never a silently disabled verification.
    it('rejects a release manifest whose commit differs from the resolved commit', async () => {
      mockGithubService.getRepoTree.mockResolvedValue(
        githubTree([{ path: 'skills/c/s/SKILL.md', sha: SKILL_BLOB }]),
      );
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        bytesFor({ 'skills/c/s/SKILL.md': 'skill' }),
      );
      const verifier = new ManifestVerifier({
        schema_version: 1,
        tag: 'c-v1.0.0',
        commit: COMMIT_B,
        files: {},
      });

      const failure = await skillSyncService
        .assembleSkills(
          ['c'],
          provenanceConfig(),
          { c: verifier },
          {},
          { c: { ref: 'c-v1.0.0', commit: COMMIT_A } },
        )
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(IntegrityError);
      expect((failure as Error).message).toMatch(
        /does not match the resolved source commit/i,
      );
    });

    // Test intent: a manifest that DOES bind root attribution is enforced; a
    // conflicting root digest is a typed integrity failure, not a generic
    // assembly failure.
    it('rejects root attribution bytes that conflict with a manifest root entry', async () => {
      mockGithubService.getRepoTree.mockResolvedValue(
        githubTree([
          { path: 'skills/c/s/SKILL.md', sha: SKILL_BLOB },
          { path: 'LICENSE', sha: LICENSE_BLOB },
        ]),
      );
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        bytesFor({
          'skills/c/s/SKILL.md': 'skill',
          LICENSE: 'MIT text',
        }),
      );
      const verifier = new ManifestVerifier({
        schema_version: 1,
        tag: 'c-v1.0.0',
        commit: COMMIT_A,
        files: {
          LICENSE: createHash('sha256').update('Apache text').digest('hex'),
        },
      });

      const failure = await skillSyncService
        .assembleSkills(
          ['c'],
          provenanceConfig(),
          { c: verifier },
          {},
          { c: { ref: 'c-v1.0.0', commit: COMMIT_A } },
        )
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(IntegrityError);
      expect((failure as Error).message).toContain('LICENSE');
      expect((failure as Error).message).toMatch(/root attribution/);
    });

    // Test intent: LICENSE extension variants are one family, so a
    // package-local LICENSE.md suppresses the repository-root LICENSE instead
    // of installing two contradictory license texts.
    it('treats package-local LICENSE variants as one family overriding root LICENSE', async () => {
      const tree = [
        { path: 'LICENSE', type: 'blob', sha: LICENSE_BLOB, url: 'root' },
        { path: 'NOTICE', type: 'blob', sha: NOTICE_BLOB, url: 'notice' },
        {
          path: 'skills/c/s/LICENSE.md',
          type: 'blob',
          sha: '6'.repeat(40),
          url: 'local',
        },
        { path: 'skills/c/s/SKILL.md', type: 'blob', sha: SKILL_BLOB, url: 's' },
      ];
      mockGithubService.getRepoTree.mockResolvedValue({ tree });
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        bytesFor({
          'skills/c/s/LICENSE.md': 'local license',
          NOTICE: 'notice text',
          'skills/c/s/SKILL.md': 'skill',
        }),
      );

      const result = await skillSyncService.assembleSkills(
        ['c'],
        provenanceConfig(),
        {},
        {},
        { c: { ref: 'c-v1.0.0', commit: COMMIT_A } },
      );

      expect(result[0].files.map((file) => file.name).sort()).toEqual([
        'LICENSE.md',
        'NOTICE',
        'SKILL.md',
      ]);
      expect(
        mockGithubService.downloadFilesConcurrentBytes.mock.calls[0][0].map(
          (task: { path: string }) => task.path,
        ),
      ).not.toContain('LICENSE');
    });

    // Test intent: NOTICE and LICENSE are separate families; a package NOTICE
    // must not suppress the selected source's root LICENSE.
    it('treats NOTICE as a separate family from LICENSE', async () => {
      const tree = [
        { path: 'LICENSE', type: 'blob', sha: LICENSE_BLOB, url: 'root' },
        { path: 'NOTICE', type: 'blob', sha: NOTICE_BLOB, url: 'notice' },
        {
          path: 'skills/c/s/NOTICE.txt',
          type: 'blob',
          sha: '7'.repeat(40),
          url: 'local-notice',
        },
        { path: 'skills/c/s/SKILL.md', type: 'blob', sha: SKILL_BLOB, url: 's' },
      ];
      mockGithubService.getRepoTree.mockResolvedValue({ tree });
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        bytesFor({
          LICENSE: 'MIT text',
          'skills/c/s/NOTICE.txt': 'local notice',
          'skills/c/s/SKILL.md': 'skill',
        }),
      );

      const result = await skillSyncService.assembleSkills(
        ['c'],
        provenanceConfig(),
        {},
        {},
        { c: { ref: 'c-v1.0.0', commit: COMMIT_A } },
      );

      expect(result[0].files.map((file) => file.name).sort()).toEqual([
        'LICENSE',
        'NOTICE.txt',
        'SKILL.md',
      ]);
    });

    // Test intent: a qualified include binds the imported package's bytes to
    // its declaring source, not to the physical category or its release
    // manifest.
    it('binds imported package attribution to the declaring source', async () => {
      const importedConfig = {
        registry: 'https://github.com/o/r',
        skills: { c: { ref: 'c-v1.0.0', include: ['other/s'] } },
      } as unknown as SkillConfig;
      mockGithubService.getRepoTree.mockResolvedValue(
        githubTree([
          { path: 'skills/other/s/SKILL.md', sha: SKILL_BLOB },
          { path: 'skills/other/s/NOTICE.md', sha: NOTICE_BLOB },
        ]),
      );
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        bytesFor({
          'skills/other/s/SKILL.md': 'skill',
          'skills/other/s/NOTICE.md': 'notice',
        }),
      );

      const result = await skillSyncService.assembleSkills(
        ['c'],
        importedConfig,
        {},
        {},
        { c: { ref: 'c-v1.0.0', commit: COMMIT_A } },
      );

      expect(result[0]).toMatchObject({
        category: 'other',
        skill: 's',
        origin: { category: 'c', ref: 'c-v1.0.0', commit: COMMIT_A },
      });
      const notice = result[0].files.find(
        (file) => file.name === 'NOTICE.md',
      );
      expect(notice?.attribution).toMatchObject({
        sourcePath: 'skills/other/s/NOTICE.md',
        sourceKind: 'package',
        requestedRef: 'c-v1.0.0',
        resolvedCommit: COMMIT_A,
        blobSha1: NOTICE_BLOB,
      });
    });

    it('does not invent provenance when no resolved commit is known', async () => {
      mockGithubService.getRepoTree.mockResolvedValue(
        githubTree([
          { path: 'skills/c/s/SKILL.md', sha: SKILL_BLOB },
          { path: 'LICENSE', sha: LICENSE_BLOB },
        ]),
      );
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        bytesFor({
          'skills/c/s/SKILL.md': 'skill',
          LICENSE: 'MIT text',
        }),
      );

      const result = await skillSyncService.assembleSkills(
        ['c'],
        provenanceConfig(),
      );

      expect(result[0].origin).toBeUndefined();
      expect(
        result[0].files.every((file) => file.attribution === undefined),
      ).toBe(true);
      expect(mockGithubService.getRepoTree).toHaveBeenCalledWith(
        'o',
        'r',
        'c-v1.0.0',
      );
    });

    // Test intent: a LICENSE nested under a package resource directory is an
    // ordinary resource. It must not count as a package-local attribution
    // family member, must not suppress the root fallback, and must not be
    // recorded as a top-level attribution file.
    it('treats nested resource LICENSE as an ordinary file and keeps the root fallback', async () => {
      const nestedBlob = '8'.repeat(40);
      mockGithubService.getRepoTree.mockResolvedValue(
        githubTree([
          { path: 'LICENSE', sha: LICENSE_BLOB },
          { path: 'skills/c/s/references/LICENSE', sha: nestedBlob },
          { path: 'skills/c/s/SKILL.md', sha: SKILL_BLOB },
        ]),
      );
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        bytesFor({
          LICENSE: 'MIT text',
          'skills/c/s/references/LICENSE': 'third party license',
          'skills/c/s/SKILL.md': 'skill',
        }),
      );

      const result = await skillSyncService.assembleSkills(
        ['c'],
        provenanceConfig(),
        {},
        {},
        { c: { ref: 'c-v1.0.0', commit: COMMIT_A } },
      );

      const byName = Object.fromEntries(
        result[0].files.map((file) => [file.name, file]),
      );
      expect(Object.keys(byName).sort()).toEqual([
        'LICENSE',
        'SKILL.md',
        'references/LICENSE',
      ]);
      expect(byName.LICENSE.attribution).toMatchObject({
        sourcePath: 'LICENSE',
        sourceKind: 'root',
        blobSha1: LICENSE_BLOB,
      });
      // A nested LICENSE is not attribution: no family override, no record.
      expect(byName['references/LICENSE'].attribution).toBeUndefined();
    });

    // Test intent: the catalog a run publishes must validate; a nested
    // resource LICENSE may never leak into the attribution record after the
    // files have already been installed.
    it('publishes a catalog that excludes nested resource files', async () => {
      const nestedBlob = '8'.repeat(40);
      mockGithubService.getRepoTree.mockResolvedValue(
        githubTree([
          { path: 'LICENSE', sha: LICENSE_BLOB },
          { path: 'skills/c/s/references/LICENSE', sha: nestedBlob },
          { path: 'skills/c/s/SKILL.md', sha: SKILL_BLOB },
        ]),
      );
      mockGithubService.downloadFilesConcurrentBytes.mockImplementation(
        bytesFor({
          LICENSE: 'MIT text',
          'skills/c/s/references/LICENSE': 'third party license',
          'skills/c/s/SKILL.md': 'skill',
        }),
      );

      const [collected] = await skillSyncService.assembleSkills(
        ['c'],
        provenanceConfig(),
        {},
        {},
        { c: { ref: 'c-v1.0.0', commit: COMMIT_A } },
      );
      const stored = new Map<string, string | Buffer>();
      const packages = await skillSyncService.writeSkills(
        [collected],
        { registry: 'https://github.com/o/r' } as unknown as SkillConfig,
        [Agent.Cursor],
        recordingWriter(stored),
      );

      const record = packages['c/s'];
      expect(record.declaringCategory).toBe('c');
      expect(record.files.map((file) => file.name)).toEqual(['LICENSE']);
      expect(validateAttributionCatalog(buildAttributionCatalog(packages))).toEqual(
        buildAttributionCatalog(packages),
      );
    });

    // Test intent: qualified metadata binds the exact installed destination
    // bytes per agent, including adapter transforms; an overridden file is not
    // published and therefore never stamped. The record keeps the declaring
    // category for an imported package.
    it('binds installed destinations and digests from the bytes actually written', async () => {
      const original = [
        '---',
        'name: My skill',
        'description: Desc',
        '---',
        'Body',
      ].join('\n');
      const skill = {
        category: 'other',
        skill: 's',
        origin: { category: 'c', ref: 'c-v1.0.0', commit: COMMIT_A },
        files: [
          {
            name: 'SKILL.md',
            content: original,
            attribution: {
              sourcePath: 'skills/other/s/SKILL.md',
              sourceKind: 'package' as const,
              requestedRef: 'c-v1.0.0',
              resolvedCommit: COMMIT_A,
              blobSha1: SKILL_BLOB,
              sha256: createHash('sha256').update(original).digest('hex'),
              basis: 'release-manifest' as const,
            },
          },
          {
            name: 'LICENSE',
            content: 'MIT text',
            attribution: {
              sourcePath: 'LICENSE',
              sourceKind: 'root' as const,
              requestedRef: 'c-v1.0.0',
              resolvedCommit: COMMIT_A,
              blobSha1: LICENSE_BLOB,
              sha256: createHash('sha256').update('MIT text').digest('hex'),
              basis: 'commit-tree-blob' as const,
            },
          },
          {
            name: 'NOTICE',
            content: 'notice text',
            attribution: {
              sourcePath: 'NOTICE',
              sourceKind: 'root' as const,
              requestedRef: 'c-v1.0.0',
              resolvedCommit: COMMIT_A,
              blobSha1: NOTICE_BLOB,
              sha256: createHash('sha256').update('notice text').digest('hex'),
              basis: 'commit-tree-blob' as const,
            },
          },
        ],
      };

      const stored = new Map<string, string | Buffer>();
      const packages = await skillSyncService.writeSkills(
        [skill],
        {
          registry: 'https://github.com/o/r',
          custom_overrides: ['NOTICE'],
        } as unknown as SkillConfig,
        [Agent.Cursor, Agent.Kiro],
        recordingWriter(stored),
      );

      const record = packages['other/s'];
      expect(record.registry).toBe('https://github.com/o/r');
      expect(record.declaringCategory).toBe('c');
      expect(record.requestedRef).toBe('c-v1.0.0');
      expect(record.resolvedCommit).toBe(COMMIT_A);
      const byName = Object.fromEntries(
        record.files.map((file) => [file.name, file]),
      );
      expect(byName.NOTICE).toBeUndefined();
      expect(byName.LICENSE.destinations).toEqual([
        {
          agent: Agent.Cursor,
          path: '.cursor/skills/other/s/LICENSE',
          sha256: createHash('sha256').update('MIT text').digest('hex'),
        },
        {
          agent: Agent.Kiro,
          path: '.kiro/skills/other-s/LICENSE',
          sha256: createHash('sha256').update('MIT text').digest('hex'),
        },
      ]);
      const kiroSkill = byName['SKILL.md'].destinations.find(
        (binding) => binding.agent === Agent.Kiro,
      );
      const cursorSkill = byName['SKILL.md'].destinations.find(
        (binding) => binding.agent === Agent.Cursor,
      );
      expect(cursorSkill?.sha256).toBe(
        createHash('sha256').update(original).digest('hex'),
      );
      expect(kiroSkill?.sha256).not.toBe(cursorSkill?.sha256);
      expect(kiroSkill?.path).toBe('.kiro/skills/other-s/SKILL.md');
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
  });
});
