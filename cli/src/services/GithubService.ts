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

interface RawFileOptions {
  expectedSha?: string;
  maxBytes?: number;
}

interface DownloadTask {
  owner: string;
  repo: string;
  ref: string;
  path: string;
  sha?: string;
}

interface DownloadResult<T> {
  ok: { path: string; content: T }[];
  failed: { path: string; reason: string }[];
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
   * Fetches raw file bytes from GitHub and validates their Git blob identity.
   * Text callers should use getRawFile; package callers use this byte-preserving path.
   */
  async getRawFileBytes(
    owner: string,
    repo: string,
    ref: string,
    path: string,
    options?: RawFileOptions,
  ): Promise<Buffer | null> {
    const url = `${this.rawBaseUrl}/${owner}/${repo}/${ref}/${path}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const content = Buffer.from(await res.arrayBuffer());

      const maxBytes = options?.maxBytes ?? MAX_RAW_FILE_BYTES;
      if (content.byteLength > maxBytes) {
        throw new IntegrityError(
          `${path}: ${content.byteLength} bytes exceeds the ${maxBytes}-byte limit`,
        );
      }

      if (options?.expectedSha) {
        const actualSha = gitBlobSha1(content);
        if (actualSha !== options.expectedSha) {
          throw new IntegrityError(
            `${path}: blob sha mismatch (expected ${options.expectedSha}, got ${actualSha}) — download may be corrupted or tampered with`,
          );
        }
      }

      return content;
    } catch (error) {
      if (error instanceof IntegrityError) throw error;
      console.error(pc.red(`Failed to fetch file ${path}: ${error}`));
      return null;
    }
  }

  /**
   * Fetches raw file content as UTF-8 for established text-only callers.
   */
  async getRawFile(
    owner: string,
    repo: string,
    ref: string,
    path: string,
    options?: RawFileOptions,
  ): Promise<string | null> {
    const content = await this.getRawFileBytes(owner, repo, ref, path, options);
    return content?.toString('utf8') ?? null;
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
   * Downloads multiple text files concurrently with a limit. Existing text
   * consumers retain UTF-8 strings; package sync uses the byte variant below.
   */
  async downloadFilesConcurrent(
    tasks: DownloadTask[],
    concurrency: number = 10,
  ): Promise<DownloadResult<string>> {
    return this.downloadFilesConcurrentWith(tasks, concurrency, (task) =>
      this.getRawFile(task.owner, task.repo, task.ref, task.path, {
        expectedSha: task.sha,
      }),
    );
  }

  /**
   * Downloads multiple files without decoding their response bytes.
   */
  async downloadFilesConcurrentBytes(
    tasks: DownloadTask[],
    concurrency: number = 10,
  ): Promise<DownloadResult<Buffer>> {
    return this.downloadFilesConcurrentWith(tasks, concurrency, (task) =>
      this.getRawFileBytes(task.owner, task.repo, task.ref, task.path, {
        expectedSha: task.sha,
      }),
    );
  }

  private async downloadFilesConcurrentWith<T>(
    tasks: DownloadTask[],
    concurrency: number,
    download: (task: DownloadTask) => Promise<T | null>,
  ): Promise<DownloadResult<T>> {
    const outcomes: (
      | { kind: 'ok'; path: string; content: T }
      | { kind: 'failed'; path: string; reason: string }
      | undefined
    )[] = Array(tasks.length);
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < tasks.length) {
        const index = nextIndex++;
        const task = tasks[index];
        if (!task) continue;

        try {
          const content = await download(task);
          outcomes[index] =
            content === null
              ? { kind: 'failed', path: task.path, reason: 'not found' }
              : { kind: 'ok', path: task.path, content };
        } catch (error) {
          outcomes[index] = {
            kind: 'failed',
            path: task.path,
            reason: error instanceof Error ? error.message : String(error),
          };
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, tasks.length) }, worker),
    );

    const ok: { path: string; content: T }[] = [];
    const failed: { path: string; reason: string }[] = [];
    for (const outcome of outcomes) {
      if (!outcome) continue;
      if (outcome.kind === 'ok') {
        ok.push({ path: outcome.path, content: outcome.content });
      } else {
        failed.push({ path: outcome.path, reason: outcome.reason });
      }
    }
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
