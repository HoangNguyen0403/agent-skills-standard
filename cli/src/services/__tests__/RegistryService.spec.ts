import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistryMetadata } from '../../models/types';
import { GithubService } from '../GithubService';
import { RegistryService } from '../RegistryService';

vi.mock('../GithubService');

describe('RegistryService', () => {
  let registryService: RegistryService;

  beforeEach(() => {
    vi.clearAllMocks();
    registryService = new RegistryService();
  });

  describe('discoverRegistry', () => {
    it('should discover categories and metadata from GitHub registry', async () => {
      const mockRepoInfo = { default_branch: 'master' };
      const mockTree = {
        tree: [
          { path: 'skills/flutter', type: 'tree' },
          { path: 'skills/nestjs', type: 'tree' },
          { path: 'README.md', type: 'blob' },
        ],
      };
      const mockMetadataObject: RegistryMetadata = {
        global: { author: 'test', repository: 'test' },
        categories: {
          flutter: { version: '1.0.0', tag_prefix: 'v' },
        },
      };
      const mockMetadata = JSON.stringify(mockMetadataObject);

      vi.mocked(GithubService.prototype.getRepoInfo).mockResolvedValue(
        mockRepoInfo,
      );
      vi.mocked(GithubService.prototype.getRepoTree).mockResolvedValue(
        mockTree as unknown as any,
      );
      vi.mocked(GithubService.prototype.getRawFile).mockResolvedValue(
        mockMetadata,
      );

      const result = await registryService.discoverRegistry(
        'https://github.com/owner/repo',
      );

      expect(result.categories).toContain('nestjs');
      expect(result.metadata.categories?.flutter?.version).toBe('1.0.0');
    });

    it('should handle repoInfo without default_branch', async () => {
      vi.mocked(GithubService.prototype.getRepoInfo).mockResolvedValue(
        {} as unknown as { default_branch: string },
      );
      vi.mocked(GithubService.prototype.getRepoTree).mockResolvedValue({
        tree: [],
      } as unknown as any);
      const result = await registryService.discoverRegistry(
        'https://github.com/o/r',
      );
      expect(result.categories).toEqual(['flutter', 'dart']);
    });

    it('should handle treeResult without tree array', async () => {
      const mockRepoInfo = { default_branch: 'main' };
      vi.mocked(GithubService.prototype.getRepoInfo).mockResolvedValue(
        mockRepoInfo,
      );
      vi.mocked(GithubService.prototype.getRepoTree).mockResolvedValue(
        {} as unknown as any,
      );
      const result = await registryService.discoverRegistry(
        'https://github.com/o/r',
      );
      expect(result.categories).toEqual(['flutter', 'dart']);
    });

    it('should handle missing metadata.json gracefully', async () => {
      const mockRepoInfo = { default_branch: 'main' };
      const mockTree = {
        tree: [{ path: 'skills/flutter', type: 'tree' }],
      };

      vi.mocked(GithubService.prototype.getRepoInfo).mockResolvedValue(
        mockRepoInfo,
      );
      vi.mocked(GithubService.prototype.getRepoTree).mockResolvedValue(
        mockTree as unknown as any,
      );
      vi.mocked(GithubService.prototype.getRawFile).mockResolvedValue(null);

      const result = await registryService.discoverRegistry(
        'https://github.com/owner/repo',
      );

      expect(result.categories).toEqual(['flutter']);
      expect(result.metadata).toEqual({});
    });

    it('should return defaults if discovery fails', async () => {
      vi.mocked(GithubService.prototype.getRepoInfo).mockRejectedValue(
        new Error('Network error'),
      );

      const result = await registryService.discoverRegistry(
        'https://github.com/owner/repo',
      );

      expect(result.categories).toEqual(['flutter', 'dart']);
      expect(result.metadata).toEqual({});
    });

    it('should return defaults if URL is invalid', async () => {
      const result = await registryService.discoverRegistry('invalid-url');

      expect(result.categories).toEqual(['flutter', 'dart']);
      // Should not call getRepoInfo if URL parsing fails
      expect(GithubService.prototype.getRepoInfo).not.toHaveBeenCalled();
    });
  });
});
