import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubService } from '../GithubService';
import { SyncService } from '../SyncService';

vi.mock('fs-extra');

vi.mock('../ConfigService', () => {
  const Mock = vi.fn().mockImplementation(function (this: any) {
    this.loadConfig = vi.fn();
    this.saveConfig = vi.fn();
    this.reconcileDependencies = vi.fn().mockReturnValue([]);
  });
  return { ConfigService: Mock };
});

vi.mock('../GithubService', () => {
  const Mock = vi.fn().mockImplementation(function (this: any) {
    this.getRepoTree = vi.fn();
    this.downloadFilesConcurrent = vi.fn();
  });
  (Mock as any).parseGitHubUrl = vi.fn();
  return { GithubService: Mock };
});

describe('SyncService', () => {
  let syncService: SyncService;
  let mockConfigService: any;
  let mockGithubService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    syncService = new SyncService();

    mockConfigService = (syncService as any).configService;
    mockGithubService = (syncService as any).githubService;

    // Default mocks
    (GithubService.parseGitHubUrl as any).mockReturnValue({
      owner: 'owner',
      repo: 'repo',
    });

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

  describe('reconcileConfig', () => {
    it('should reconcile dependencies and save config if changed', async () => {
      const config: any = { skills: { flutter: {} } };
      const deps = new Set(['dep1']);
      mockConfigService.reconcileDependencies.mockReturnValue(['skill1']);

      const changed = await syncService.reconcileConfig(config, deps);

      expect(changed).toBe(true);
      expect(mockConfigService.reconcileDependencies).toHaveBeenCalled();
      expect(mockConfigService.saveConfig).toHaveBeenCalledWith(config);
    });

    it('should return false if no changes', async () => {
      const config: any = { skills: { flutter: {} } };
      mockConfigService.reconcileDependencies.mockReturnValue([]);

      const changed = await syncService.reconcileConfig(config, new Set());

      expect(changed).toBe(false);
      expect(mockConfigService.saveConfig).not.toHaveBeenCalled();
    });
  });

  describe('assembleSkills', () => {
    it('should handle relative skill include', async () => {
      const config: any = {
        registry: 'https://github.com/owner/repo',
        skills: {
          'react-native': {
            include: ['architecture'],
          },
        },
      };

      const result = await syncService.assembleSkills(['react-native'], config);

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

      const result = await syncService.assembleSkills(['react-native'], config);

      expect(result).toHaveLength(2);

      const rnSkill =
        result.find((r: any) => r.category === 'react-native') || undefined;
      const reactSkill =
        result.find((r: any) => r.category === 'react') || undefined;

      expect(rnSkill?.skill).toBe('architecture');
      expect(reactSkill?.skill).toBe('hooks');
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

      const result = await syncService.assembleSkills(['react-native'], config);

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
      const result = await syncService.assembleSkills(['react-native'], config);

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found in repository'),
      );
      consoleSpy.mockRestore();
    });

    it('should fail if registry is not GitHub', async () => {
      const config: any = { registry: 'https://gitlab.com/owner/repo' };
      (GithubService.parseGitHubUrl as any).mockReturnValue(null);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await syncService.assembleSkills([], config);

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Only GitHub registries supported'),
      );
      consoleSpy.mockRestore();
    });

    it('should handle repo tree fetch failure', async () => {
      mockGithubService.getRepoTree.mockResolvedValue(null);
      const config: any = {
        registry: 'https://github.com/owner/repo',
        skills: { flutter: {} },
      };
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await syncService.assembleSkills(['flutter'], config);

      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch flutter'),
      );
      consoleSpy.mockRestore();
    });

    it('should handle exclude filter', async () => {
      const config: any = {
        registry: 'https://github.com/owner/repo',
        skills: {
          'react-native': {
            exclude: ['navigation'],
          },
        },
      };

      const result = await syncService.assembleSkills(['react-native'], config);

      expect(result).toHaveLength(1);
      expect(result[0].skill).toBe('architecture');
    });
  });

  describe('writeSkills', () => {
    it('should write skills to disk for enabled agents', async () => {
      const skills = [
        {
          category: 'flutter',
          skill: 'bloc',
          files: [{ name: 'SKILL.md', content: 'test content' }],
        },
      ];
      const config: any = { agents: ['cursor'] };

      await syncService.writeSkills(skills, config);

      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('.cursor/skills/flutter/bloc/SKILL.md'),
        'test content',
      );
    });

    it('should skip overridden files', async () => {
      const skills = [
        {
          category: 'flutter',
          skill: 'bloc',
          files: [{ name: 'SKILL.md', content: 'test content' }],
        },
      ];
      const config: any = {
        agents: ['cursor'],
        custom_overrides: ['.cursor/skills/flutter/bloc/SKILL.md'],
      };

      await syncService.writeSkills(skills, config);

      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('should prevent path traversal', async () => {
      const skills = [
        {
          category: 'flutter',
          skill: 'bloc',
          files: [{ name: '../../TRAVERSAL.md', content: 'evil' }],
        },
      ];
      const config: any = { agents: ['cursor'] };
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await syncService.writeSkills(skills, config);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security Error: Invalid path'),
      );
      expect(fs.outputFile).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should skip unknown agents', async () => {
      const skills = [
        {
          category: 'flutter',
          skill: 'bloc',
          files: [{ name: 'SKILL.md', content: 'test' }],
        },
      ];
      const config: any = { agents: ['unknown-agent'] };

      await syncService.writeSkills(skills, config);

      expect(fs.ensureDir).not.toHaveBeenCalled();
    });

    it('should use default agents if not specified', async () => {
      const skills: any[] = [];
      const config: any = {}; // missing agents
      await syncService.writeSkills(skills, config);
      // Should loop through all default agents
      expect(fs.ensureDir).toHaveBeenCalled();
    });
  });
});
