import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncCommand } from '../sync';

vi.mock('fs-extra');

vi.mock('../../services/ConfigService', () => {
  const Mock = vi.fn().mockImplementation(function (this: any) {
    this.loadConfig = vi.fn();
    this.saveConfig = vi.fn();
    this.reconcileDependencies = vi.fn().mockReturnValue([]);
  });
  return { ConfigService: Mock };
});

vi.mock('../../services/GithubService', () => {
  const Mock = vi.fn().mockImplementation(function (this: any) {
    this.getRepoTree = vi.fn();
    this.downloadFilesConcurrent = vi.fn();
  });
  (Mock as any).parseGitHubUrl = vi
    .fn()
    .mockReturnValue({ owner: 'owner', repo: 'repo' });
  return { GithubService: Mock };
});

vi.mock('../../services/DetectionService', () => {
  const Mock = vi.fn().mockImplementation(function (this: any) {
    this.getProjectDeps = vi.fn().mockResolvedValue(new Set());
  });
  return { DetectionService: Mock };
});

describe('SyncCommand', () => {
  let syncCommand: SyncCommand;
  let mockConfigService: any;
  let mockGithubService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    syncCommand = new SyncCommand();

    mockConfigService = (syncCommand as any).configService;
    mockGithubService = (syncCommand as any).githubService;

    // Default mocks
    mockGithubService.getRepoTree.mockResolvedValue({
      tree: [
        { path: 'skills/react-native/architecture/SKILL.md', type: 'blob' },
        { path: 'skills/react-native/navigation/SKILL.md', type: 'blob' },
        { path: 'skills/react/hooks/SKILL.md', type: 'blob' },
        { path: 'skills/react/component-patterns/SKILL.md', type: 'blob' },
        { path: 'skills/common/security/SKILL.md', type: 'blob' },
      ],
    });

    mockGithubService.downloadFilesConcurrent.mockImplementation(
      async (tasks: any[]) => {
        return tasks.map((t) => ({
          path: t.path,
          content: `Content of ${t.path}`,
        }));
      },
    );
  });

  describe('assembleFromRemote', () => {
    it('should handle relative skill include', async () => {
      const config: any = {
        registry: 'https://github.com/owner/repo',
        skills: {
          'react-native': {
            include: ['architecture'],
          },
        },
      };

      const result = await (syncCommand as any).assembleFromRemote(
        ['react-native'],
        config,
      );

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('react-native');
      expect(result[0].skill).toBe('architecture');
    });

    it('should handle absolute cross-category skill include (category/skill)', async () => {
      const config: any = {
        registry: 'https://github.com/owner/repo',
        skills: {
          'react-native': {
            include: ['architecture', 'react/hooks'],
          },
        },
      };

      const result = await (syncCommand as any).assembleFromRemote(
        ['react-native'],
        config,
      );

      expect(result).toHaveLength(2);

      const rnSkill = result.find((r: any) => r.category === 'react-native');
      const reactSkill = result.find((r: any) => r.category === 'react');

      expect(rnSkill.skill).toBe('architecture');
      expect(reactSkill.skill).toBe('hooks');
    });

    it('should handle absolute cross-category glob include (category/*)', async () => {
      const config: any = {
        registry: 'https://github.com/owner/repo',
        skills: {
          'react-native': {
            include: ['architecture', 'react/*'],
          },
        },
      };

      const result = await (syncCommand as any).assembleFromRemote(
        ['react-native'],
        config,
      );

      // architecture (rn), hooks (react), component-patterns (react)
      expect(result).toHaveLength(3);

      const reactSkills = result.filter((r: any) => r.category === 'react');
      expect(reactSkills).toHaveLength(2);
      expect(reactSkills.map((r: any) => r.skill)).toContain('hooks');
      expect(reactSkills.map((r: any) => r.skill)).toContain(
        'component-patterns',
      );
    });

    it('should warn and skip if absolute include not found', async () => {
      const config: any = {
        registry: 'https://github.com/owner/repo',
        skills: {
          'react-native': {
            include: ['react/non-existent'],
          },
        },
      };

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await (syncCommand as any).assembleFromRemote(
        ['react-native'],
        config,
      );

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found in repository tree'),
      );
      consoleSpy.mockRestore();
    });
  });
});
