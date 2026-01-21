import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubService } from '../GithubService';

// Mock global fetch
global.fetch = vi.fn();

describe('GithubService', () => {
  let githubService: GithubService;

  beforeEach(() => {
    vi.clearAllMocks();
    githubService = new GithubService('mock-token');
  });

  describe('headers', () => {
    it('should generate headers without token if none provided', async () => {
      const publicService = new GithubService();
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      // Trigger headers via any public method
      await publicService.getRepoInfo('o', 'r');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }),
      );
    });
  });

  describe('getRepoTree', () => {
    it('should return tree data on success', async () => {
      const mockTree = { tree: [{ path: 'file.txt', type: 'blob' }] };
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTree),
      } as Response);

      const result = await githubService.getRepoTree('owner', 'repo', 'main');
      expect(result).toEqual(mockTree);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/owner/repo/git/trees/main'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token mock-token',
          }),
        }),
      );
    });

    it('should return null on 404', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const result = await githubService.getRepoTree('owner', 'repo', 'main');
      expect(result).toBeNull();
    });

    it('should throw error on other API errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      // We need to silence the console.error for this test
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const result = await githubService.getRepoTree('owner', 'repo', 'main');
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('GitHub API Error: 500'),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('getRawFile', () => {
    it('should return file content as text', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('hello world'),
      } as Response);

      const result = await githubService.getRawFile(
        'owner',
        'repo',
        'main',
        'file.txt',
      );
      expect(result).toBe('hello world');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          'raw.githubusercontent.com/owner/repo/main/file.txt',
        ),
      );
    });

    it('should return null if file fetch is not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
      } as Response);

      const result = await githubService.getRawFile(
        'owner',
        'repo',
        'main',
        'non-existent.txt',
      );
      expect(result).toBeNull();
    });

    it('should handle fetch errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network failure'));
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await githubService.getRawFile(
        'owner',
        'repo',
        'main',
        'file.txt',
      );
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch file'),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('getRepoInfo', () => {
    it('should return repo info on success', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ default_branch: 'develop' }),
      } as Response);

      const result = await githubService.getRepoInfo('owner', 'repo');
      expect(result?.default_branch).toBe('develop');
    });

    it('should return null if repo info fetch is not ok', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
      } as Response);

      const result = await githubService.getRepoInfo('owner', 'repo');
      expect(result).toBeNull();
    });

    it('should handle repo info fetch errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('API Down'));
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await githubService.getRepoInfo('owner', 'repo');
      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('getLatestReleaseTag', () => {
    it('should return tag name on success', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tag_name: 'v1.0.0' }),
      } as Response);

      const tag = await githubService.getLatestReleaseTag('owner', 'repo');
      expect(tag).toBe('v1.0.0');
    });

    it('should return null if fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
      } as Response);

      const tag = await githubService.getLatestReleaseTag('owner', 'repo');
      expect(tag).toBeNull();
    });

    it('should handle catch block in getLatestReleaseTag', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('API Error'));
      const tag = await githubService.getLatestReleaseTag('o', 'r');
      expect(tag).toBeNull();
    });
  });

  describe('downloadFilesConcurrent', () => {
    it('should hit concurrency limit', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('ok'),
      } as Response);

      const tasks = Array(5).fill({
        owner: 'o',
        repo: 'r',
        ref: 'm',
        path: 'file',
      });
      const results = await githubService.downloadFilesConcurrent(tasks, 2);
      expect(results).toHaveLength(5);
    });
    it('should download multiple files concurrently', async () => {
      vi.mocked(fetch).mockImplementation((url: RequestInfo | URL) => {
        const content = url.toString().includes('file1')
          ? 'content1'
          : 'content2';
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(content),
        } as Response);
      });

      const tasks = [
        { owner: 'o', repo: 'r', ref: 'm', path: 'file1' },
        { owner: 'o', repo: 'r', ref: 'm', path: 'file2' },
      ];

      const results = await githubService.downloadFilesConcurrent(tasks);
      expect(results).toHaveLength(2);
      expect(results).toContainEqual({ path: 'file1', content: 'content1' });
      expect(results).toContainEqual({ path: 'file2', content: 'content2' });
    });

    it('should handle partial failures in concurrent download', async () => {
      vi.mocked(fetch).mockImplementation((url: RequestInfo | URL) => {
        if (url.toString().includes('fail')) {
          return Promise.resolve({ ok: false } as Response);
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('ok'),
        } as Response);
      });

      const tasks = [
        { owner: 'o', repo: 'r', ref: 'm', path: 'ok-file' },
        { owner: 'o', repo: 'r', ref: 'm', path: 'fail-file' },
      ];

      const results = await githubService.downloadFilesConcurrent(tasks);
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('ok-file');
    });
  });
});
