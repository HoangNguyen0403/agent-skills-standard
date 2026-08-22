import fetch from 'cross-fetch';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubService } from '../GithubService';

vi.mock('cross-fetch', () => ({
  default: vi.fn(),
}));

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
    function mockOkResponse(content: string) {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from(content, 'utf8')),
      } as unknown as Response);
    }

    it('should return file content as text', async () => {
      mockOkResponse('hello world');

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

    it('should return content when the blob sha matches', async () => {
      mockOkResponse('hello world');
      // Precomputed: git hash-object for content "hello world"
      const result = await githubService.getRawFile(
        'owner',
        'repo',
        'main',
        'file.txt',
        { expectedSha: '95d09f2b10159347eece71399a7e2e907ea3df4f' },
      );
      expect(result).toBe('hello world');
    });

    it('should throw IntegrityError when the blob sha does not match', async () => {
      mockOkResponse('hello world');
      await expect(
        githubService.getRawFile('owner', 'repo', 'main', 'file.txt', {
          expectedSha: 'deadbeef00000000000000000000000000000000',
        }),
      ).rejects.toThrow(/blob sha mismatch/);
    });

    it('should throw IntegrityError when the file exceeds maxBytes', async () => {
      mockOkResponse('x'.repeat(100));
      await expect(
        githubService.getRawFile('owner', 'repo', 'main', 'file.txt', {
          maxBytes: 10,
        }),
      ).rejects.toThrow(/exceeds the 10-byte limit/);
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
      process.env.DEBUG = 'true';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(fetch).mockRejectedValue(new Error('API Error'));
      const tag = await githubService.getLatestReleaseTag('o', 'r');
      expect(tag).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      delete process.env.DEBUG;
    });
  });

  describe('downloadFilesConcurrent', () => {
    it('should hit concurrency limit', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('ok', 'utf8')),
      } as unknown as Response);

      const tasks = Array(5).fill({
        owner: 'o',
        repo: 'r',
        ref: 'm',
        path: 'file',
      });
      const { ok } = await githubService.downloadFilesConcurrent(tasks, 2);
      expect(ok).toHaveLength(5);
    });
    it('should download multiple files concurrently', async () => {
      vi.mocked(fetch).mockImplementation((url: RequestInfo | URL) => {
        const content = url.toString().includes('file1')
          ? 'content1'
          : 'content2';
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(Buffer.from(content, 'utf8')),
        } as unknown as Response);
      });

      const tasks = [
        { owner: 'o', repo: 'r', ref: 'm', path: 'file1' },
        { owner: 'o', repo: 'r', ref: 'm', path: 'file2' },
      ];

      const { ok, failed } = await githubService.downloadFilesConcurrent(tasks);
      expect(ok).toHaveLength(2);
      expect(failed).toHaveLength(0);
      expect(ok).toContainEqual({ path: 'file1', content: 'content1' });
      expect(ok).toContainEqual({ path: 'file2', content: 'content2' });
    });

    it('should collect partial failures instead of dropping them silently', async () => {
      vi.mocked(fetch).mockImplementation((url: RequestInfo | URL) => {
        if (url.toString().includes('fail')) {
          return Promise.resolve({ ok: false } as Response);
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(Buffer.from('ok', 'utf8')),
        } as unknown as Response);
      });

      const tasks = [
        { owner: 'o', repo: 'r', ref: 'm', path: 'ok-file' },
        { owner: 'o', repo: 'r', ref: 'm', path: 'fail-file' },
      ];

      const { ok, failed } = await githubService.downloadFilesConcurrent(tasks);
      expect(ok).toHaveLength(1);
      expect(ok[0].path).toBe('ok-file');
      expect(failed).toEqual([{ path: 'fail-file', reason: 'not found' }]);
    });

    it('should collect an integrity-check failure without aborting the rest of the batch', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('hello world', 'utf8')),
      } as unknown as Response);

      const tasks = [
        { owner: 'o', repo: 'r', ref: 'm', path: 'tampered', sha: 'deadbeef' },
        { owner: 'o', repo: 'r', ref: 'm', path: 'untracked' },
      ];

      const { ok, failed } = await githubService.downloadFilesConcurrent(tasks);
      expect(ok).toEqual([{ path: 'untracked', content: 'hello world' }]);
      expect(failed).toHaveLength(1);
      expect(failed[0].path).toBe('tampered');
      expect(failed[0].reason).toMatch(/blob sha mismatch/);
    });

    it('should handle empty task list', async () => {
      const { ok, failed } = await githubService.downloadFilesConcurrent([]);
      expect(ok).toEqual([]);
      expect(failed).toEqual([]);
    });

    it('should handle undefined task if shift returns nothing (line 104 coverage)', async () => {
      // @ts-expect-error - testing defensive logic
      const { ok, failed } = await githubService.downloadFilesConcurrent([
        undefined,
      ]);
      expect(ok).toEqual([]);
      expect(failed).toEqual([]);
    });
  });

  describe('parseGitHubUrl', () => {
    it('should correctly parse valid GitHub URLs', () => {
      const result = GithubService.parseGitHubUrl(
        'https://github.com/HoangNguyen0403/agent-skills-standard',
      );
      expect(result).toEqual({
        owner: 'HoangNguyen0403',
        repo: 'agent-skills-standard',
      });
    });

    it('should handle .git suffix', () => {
      const result = GithubService.parseGitHubUrl(
        'https://github.com/owner/repo.git',
      );
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should return null for invalid URLs', () => {
      expect(GithubService.parseGitHubUrl('invalid-url')).toBeNull();
      expect(
        GithubService.parseGitHubUrl('https://gitlab.com/owner/repo'),
      ).toBeNull();
    });

    it('should reject a URL that only contains "github.com/owner/repo" as a substring', () => {
      // Previously unanchored — this would have resolved to { owner: 'a', repo: 'b' }
      // and driven real requests to the actual github.com API, even though the
      // registry URL's real host is evil.com.
      expect(
        GithubService.parseGitHubUrl('https://evil.com/?x=github.com/a/b'),
      ).toBeNull();
      expect(
        GithubService.parseGitHubUrl(
          'https://not-github.com.evil.com/owner/repo',
        ),
      ).toBeNull();
    });
  });
});
