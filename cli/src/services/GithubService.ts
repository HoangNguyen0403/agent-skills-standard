import { createHash } from 'node:crypto';
import fetch from 'cross-fetch';
import pc from 'picocolors';
import { GitHubTreeResponse } from '../models/types';

/** A downloaded file failed its integrity or size check. */
export class IntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrityError';
  }
}

/** Default cap on a single downloaded file; skill/workflow/reference files are prose, not payloads. */
export const MAX_RAW_FILE_BYTES = 1024 * 1024; // 1 MiB

/** Computes the same blob SHA-1 git itself would (`git hash-object`), for comparison against a tree API `sha`. */
function gitBlobSha1(content: Buffer): string {
  const header = Buffer.from(`blob ${content.byteLength}\0`, 'utf8');
  return createHash('sha1')
    .update(Buffer.concat([header, content]))
    .digest('hex');
}

/**
 * Service for interacting with the GitHub API and fetching raw file content.
 * Handles repository tree discovery, file downloads, and URL parsing.
 */
export class GithubService {
  private baseUrl = 'https://api.github.com';
  private rawBaseUrl = 'https://raw.githubusercontent.com';

  constructor(private token?: string) {}

  private get headers() {
    const h: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (this.token) {
      h.Authorization = `token ${this.token}`;
    }
    return h;
  }

  /**
   * Fetches the recursive Git tree for a repository.
   * @param owner Repository owner
   * @param repo Repository name
   * @param ref Git reference (branch, tag, or commit SHA)
   * @returns The tree data or null if not found
   */
  async getRepoTree(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<GitHubTreeResponse | null> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
    try {
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`GitHub API Error: ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as GitHubTreeResponse;
    } catch (error) {
      console.error(pc.red(`Failed to fetch repo tree: ${error}`));
      return null;
    }
  }

  /**
   * Fetches the raw content of a file from GitHub using raw.githubusercontent.com.
   * @param owner Repository owner
   * @param repo Repository name
   * @param ref Git reference
   * @param path Path to the file
   * @param options.expectedSha Git tree-API blob sha to verify the download against.
   * @param options.maxBytes Size cap (default 1 MiB); throws IntegrityError if exceeded.
   * @returns File content as string, or null if not found (404 or network error).
   * @throws {IntegrityError} if the download exceeds maxBytes or fails the sha check.
   */
  async getRawFile(
    owner: string,
    repo: string,
    ref: string,
    path: string,
    options?: { expectedSha?: string; maxBytes?: number },
  ): Promise<string | null> {
    const url = `${this.rawBaseUrl}/${owner}/${repo}/${ref}/${path}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());

      const maxBytes = options?.maxBytes ?? MAX_RAW_FILE_BYTES;
      if (buf.byteLength > maxBytes) {
        throw new IntegrityError(
          `${path}: ${buf.byteLength} bytes exceeds the ${maxBytes}-byte limit`,
        );
      }

      if (options?.expectedSha) {
        const actualSha = gitBlobSha1(buf);
        if (actualSha !== options.expectedSha) {
          throw new IntegrityError(
            `${path}: blob sha mismatch (expected ${options.expectedSha}, got ${actualSha}) — download may be corrupted or tampered with`,
          );
        }
      }

      return buf.toString('utf8');
    } catch (error) {
      if (error instanceof IntegrityError) throw error;
      console.error(pc.red(`Failed to fetch file ${path}: ${error}`));
      return null;
    }
  }

  /**
   * Retrieves the latest release tag name for a repository.
   * @param owner Repository owner
   * @param repo Repository name
   */
  async getLatestReleaseTag(
    owner: string,
    repo: string,
  ): Promise<string | null> {
    try {
      const res = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/releases/latest`,
        {
          headers: this.headers,
        },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { tag_name: string };
      return data.tag_name;
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn(
          `[GithubService] Failed to fetch latest release: ${error}`,
        );
      }
      return null;
    }
  }

  /**
   * Fetches basic repository information, such as the default branch.
   * @param owner Repository owner
   * @param repo Repository name
   */
  async getRepoInfo(
    owner: string,
    repo: string,
  ): Promise<{ default_branch: string } | null> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}`;
    try {
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) return null;
      return (await res.json()) as { default_branch: string };
    } catch (error) {
      console.error(pc.red(`Failed to fetch repo info: ${error}`));
      return null;
    }
  }

  /**
   * Downloads multiple files concurrently with a limit. `sha` (from the tree
   * API) is verified per-file when provided. Failures — including integrity
   * mismatches — are collected in `failed` rather than silently dropped, so
   * callers can decide whether a partial result is acceptable.
   */
  async downloadFilesConcurrent(
    tasks: {
      owner: string;
      repo: string;
      ref: string;
      path: string;
      sha?: string;
    }[],
    concurrency: number = 10,
  ): Promise<{
    ok: { path: string; content: string }[];
    failed: { path: string; reason: string }[];
  }> {
    const ok: { path: string; content: string }[] = [];
    const failed: { path: string; reason: string }[] = [];
    const pool = [...tasks];
    const executing: Promise<void>[] = [];

    const worker = async () => {
      while (pool.length > 0) {
        const task = pool.shift();
        if (!task) break;

        try {
          const content = await this.getRawFile(
            task.owner,
            task.repo,
            task.ref,
            task.path,
            { expectedSha: task.sha },
          );
          if (content !== null) {
            ok.push({ path: task.path, content });
          } else {
            failed.push({ path: task.path, reason: 'not found' });
          }
        } catch (error) {
          failed.push({
            path: task.path,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };

    // Spawn workers
    for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
      executing.push(worker());
    }

    await Promise.all(executing);
    return { ok, failed };
  }

  /**
   * Parses a GitHub URL into owner and repository name. Anchored to the
   * start of the string so a URL like `https://evil.com/?x=github.com/a/b`
   * — where "github.com/owner/repo" only appears as a substring, not as the
   * actual host — is correctly rejected instead of silently resolving to
   * `a/b` on the real github.com API.
   * @param url The GitHub URL to parse
   * @returns Object containing owner and repo, or null if invalid
   */
  static parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    const m = url.match(
      /^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+)/i,
    );
    if (!m) return null;
    return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
  }
}
