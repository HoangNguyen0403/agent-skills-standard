import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubService } from '../GithubService';
import { RegistryService } from '../RegistryService';

vi.mock('../GithubService', () => {
  return {
    GithubService: class {
      public getRepoInfo = vi.fn();
      public getRepoTree = vi.fn();
      public getRawFile = vi.fn();
      static parseGitHubUrl = vi.fn();
    },
  };
});

describe('RegistryService', () => {
  let service: RegistryService;
  let mockGithub: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RegistryService();
    mockGithub = (service as any).githubService;

    // Default mock setup
    mockGithub.getRepoInfo.mockResolvedValue({ default_branch: 'main' });
    mockGithub.getRepoTree.mockResolvedValue({ tree: [] });
    // @ts-expect-error - static mock access
    GithubService.parseGitHubUrl.mockReturnValue({ owner: 'o', repo: 'r' });
  });

  describe('discoverRegistry', () => {
    it('should return default categories if parseGitHubUrl fails (line 19 branch)', async () => {
      // @ts-expect-error - static
      GithubService.parseGitHubUrl.mockReturnValueOnce(null);
      const result = await service.discoverRegistry('invalid');
      expect(result.categories).toEqual(['flutter', 'dart']);
    });

    it('should discover categories and metadata successfully (lines 25-36 coverage)', async () => {
      mockGithub.getRepoInfo.mockResolvedValueOnce({
        default_branch: 'develop',
      });
      mockGithub.getRepoTree.mockResolvedValue({
        tree: [{ path: 'skills/react', type: 'tree' }],
      });
      mockGithub.getRawFile.mockResolvedValueOnce(
        JSON.stringify({ categories: { react: {} } }),
      );

      const result = await service.discoverRegistry('url');
      expect(result.categories).toContain('react');
      expect(mockGithub.getRepoTree).toHaveBeenCalledWith('o', 'r', 'develop');
    });

    it('should handle missing tree field in result (line 35 branch)', async () => {
      mockGithub.getRepoTree.mockResolvedValueOnce({});
      const result = await service.discoverRegistry('url');
      expect(result.categories).toEqual(['flutter', 'dart']);
    });

    it('should handle tree being null (line 36 coverage)', async () => {
      mockGithub.getRepoTree.mockResolvedValueOnce({ tree: null });
      const result = await service.discoverRegistry('url');
      expect(result.categories).toEqual(['flutter', 'dart']);
    });

    it('should ignore deep paths or non-category paths (line 41 coverage)', async () => {
      mockGithub.getRepoTree.mockResolvedValue({
        tree: [
          { path: 'skills/flutter/extra', type: 'tree' }, // 3 parts, should be ignored
          { path: 'not-skills/react', type: 'tree' }, // wrong prefix
        ],
      });
      const result = await service.discoverRegistry('url');
      expect(result.categories).toEqual(['flutter', 'dart']);
    });

    it('should handle discovery failure with DEBUG=true', async () => {
      process.env.DEBUG = 'true';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockGithub.getRepoTree.mockRejectedValue(new Error('Fatal'));

      await service.discoverRegistry('url');
      expect(warnSpy).toHaveBeenCalled();
      delete process.env.DEBUG;
    });

    it('should handle invalid JSON in metadata (line 53 branch)', async () => {
      mockGithub.getRepoTree.mockResolvedValue({
        tree: [{ path: 'skills/react', type: 'tree' }],
      });
      mockGithub.getRawFile.mockResolvedValue('invalid json');
      const result = await service.discoverRegistry('url');
      expect(result.metadata).toEqual({});
    });

    it('should handle missing repoInfo (line 25 fallback branch)', async () => {
      mockGithub.getRepoInfo.mockResolvedValueOnce(null);
      await service.discoverRegistry('url');
      expect(mockGithub.getRepoTree).toHaveBeenCalledWith('o', 'r', 'main');
    });
  });

  describe('getFrameworkSkills', () => {
    it('should list framework skills', async () => {
      mockGithub.getRepoTree.mockResolvedValue({
        tree: [{ path: 'skills/flutter/s1/', type: 'tree' }],
      });
      const result = await service.getFrameworkSkills('url', 'flutter');
      expect(result).toEqual(['s1']);
    });

    it('should handle non-github URLs', async () => {
      // @ts-expect-error - static
      GithubService.parseGitHubUrl.mockReturnValueOnce(null);
      const result = await service.getFrameworkSkills('gitlab.com', 'flutter');
      expect(result).toEqual([]);
    });

    it('should handle error in getFrameworkSkills', async () => {
      mockGithub.getRepoTree.mockRejectedValue(new Error('Fail'));
      const result = await service.getFrameworkSkills('url', 'flutter');
      expect(result).toEqual([]);
    });

    it('should handle missing tree results (line 81 branch)', async () => {
      mockGithub.getRepoTree.mockResolvedValue(null);
      const result = await service.getFrameworkSkills('url', 'flutter');
      expect(result).toEqual([]);
    });
  });
});
