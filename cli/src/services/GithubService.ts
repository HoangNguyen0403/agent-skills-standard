import { createHash } from 'node:crypto';
import fetch from 'cross-fetch';
import pc from 'picocolors';
import { GitHubTreeResponse } from '../models/types';
import {
  GithubRequestError,
  abandonResponseBody,
  classifyAmbiguous403,
  classifyGithubStatus,
} from './github/GithubRequestError';

export { GithubRequestError };
export type {
  GithubFailureKind,
  GithubRateLimitKind,
  GithubRequestErrorProjection,
} from './github/GithubRequestError';

/** A downloaded file failed its integrity or size check. */
export class IntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrityError';
  }
}

/** Release manifest attached to a release tag asset. */
export interface ReleaseManifest {
  schema_version: 1;
  tag: string;
  commit: string;
  files: Record<string, string>;
}

/** Basic repository information. Visibility fields are additive and may be absent. */
export interface GithubRepoInfo {
  default_branch: string;
  private?: boolean;
  visibility?: 'public' | 'private' | 'internal';
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
 * Detaches a cached value from the caller that receives it. Buffers are
 * copied; plain objects are structured-cloned. The session cache therefore
 * never shares mutable state with consumers.
 */
function detachValue<T>(value: T): T {
  if (Buffer.isBuffer(value)) {
    return Buffer.from(value) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    return structuredClone(value);
  }
  return value;
}

interface RawFileOptions {
  expectedSha?: string;
  maxBytes?: number;
  /** Resolved commit; when supplied it becomes the immutable request identity. */
  commit?: string;
}

interface TreeRequestOptions {
  /** Resolved commit. Trees are shared only for the same commit, never across refs. */
  commit?: string;
}

interface DownloadTask {
  owner: string;
  repo: string;
  ref: string;
  path: string;
  sha?: string;
  commit?: string;
}

interface DownloadResult<T> {
  ok: { path: string; content: T }[];
  failed: { path: string; reason: string }[];
  /** Present when the operation-wide throttle latch stopped further scheduling. */
  rateLimited?: GithubRequestError;
}

/**
 * Service for interacting with the GitHub API and fetching raw file content.
 * Handles repository tree discovery, file downloads, and URL parsing.
 *
 * One instance is operation-scoped: identical requests are coalesced and
 * reused for the lifetime of the operation, the first confirmed throttling
 * response latches the whole operation, and `resetOperation()` clears both
 * when a client is reused for another command.
 */
export class GithubService {
  private baseUrl = 'https://api.github.com';
  private rawBaseUrl = 'https://raw.githubusercontent.com';

  private readonly sessionCache = new Map<string, unknown>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private rateLimitError: GithubRequestError | null = null;
  private operationEpoch = 0;

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

  /** True once this operation has observed confirmed throttling. */
  get rateLimited(): boolean {
    return this.rateLimitError !== null;
  }

  /** The first throttling failure that latched this operation, if any. */
  get rateLimitFailure(): GithubRequestError | null {
    return this.rateLimitError;
  }

  /**
   * Clears session caches and the throttle latch. Call only between commands
   * that reuse the same client. Requests already in flight settle normally,
   * but their results are not retained.
   */
  resetOperation(): void {
    this.sessionCache.clear();
    this.inFlight.clear();
    this.rateLimitError = null;
    this.operationEpoch += 1;
  }

  /**
   * Single-flight per request identity: concurrent callers share one pending
   * request, completed values are reused within the operation, and failures
   * are never cached (so a recovered request can be retried).
   */
  private async sessionRequest<T>(
    key: string,
    run: () => Promise<T>,
  ): Promise<T> {
    const cached = this.sessionCache.get(key);
    if (cached !== undefined) {
      return detachValue(cached as T);
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      return detachValue((await pending) as T);
    }

    const epoch = this.operationEpoch;
    const promise = this.runSessionRequest(key, epoch, run);
    this.inFlight.set(key, promise);
    return promise;
  }

  private async runSessionRequest<T>(
    key: string,
    epoch: number,
    run: () => Promise<T>,
  ): Promise<T> {
    try {
      const value = await run();
      if (
        epoch === this.operationEpoch &&
        value !== null &&
        value !== undefined
      ) {
        this.sessionCache.set(key, detachValue(value));
      }
      return value;
    } finally {
      if (epoch === this.operationEpoch) {
        this.inFlight.delete(key);
      }
    }
  }

  /**
   * Performs one HTTP request, rejecting with a typed failure for any non-2xx
   * response or transport error.
   *
   * - `authenticated` reflects the Authorization header actually attached to
   *   this request, never a constructor assumption.
   * - A status/header-decidable throttle latches synchronously; only an
   *   ambiguous 403 awaits its bounded body, and that latch is guarded by the
   *   epoch captured before the request started.
   * - Transport messages are fixed text; the raw error (which may contain
   *   credentials in a URL) stays internal to `cause`.
   */
  private async request(url: string, init?: RequestInit): Promise<Response> {
    if (this.rateLimitError) throw this.rateLimitError;

    const epoch = this.operationEpoch;
    const authenticated = GithubService.hasAttachedAuthorization(init);

    let res: Response;
    try {
      res = init === undefined ? await fetch(url) : await fetch(url, init);
    } catch (error) {
      throw new GithubRequestError({
        kind: 'transport',
        message: 'GitHub request failed before a response was received',
        endpoint: url,
        authenticated,
        cause: error,
      });
    }

    if (!res.ok) {
      const verdict = classifyGithubStatus(res, url, authenticated);
      if (verdict !== 'ambiguous') {
        if (
          verdict.kind === 'rate-limited' &&
          epoch === this.operationEpoch &&
          !this.rateLimitError
        ) {
          this.rateLimitError = verdict;
        }
        // Latch first, then release a body nobody will read. Neither step
        // awaits anything, so a stalled body cannot delay the failure.
        abandonResponseBody(res);
        throw verdict;
      }
      const failure = await classifyAmbiguous403(res, url, authenticated);
      if (
        failure.kind === 'rate-limited' &&
        epoch === this.operationEpoch &&
        !this.rateLimitError
      ) {
        this.rateLimitError = failure;
      }
      throw failure;
    }
    return res;
  }

  /** True only when this request's headers actually carry an Authorization value. */
  private static hasAttachedAuthorization(
    init: RequestInit | undefined,
  ): boolean {
    const headers = init?.headers;
    if (!headers) return false;
    if (Array.isArray(headers)) {
      return headers.some(
        (entry) =>
          entry[0]?.toLowerCase() === 'authorization' && Boolean(entry[1]),
      );
    }
    if (typeof Headers !== 'undefined' && headers instanceof Headers) {
      return Boolean(headers.get('authorization'));
    }
    return Object.entries(headers).some(
      ([name, value]) =>
        name.toLowerCase() === 'authorization' &&
        typeof value === 'string' &&
        value.length > 0,
    );
  }

  /** Rate-limit and access-denial failures are actionable; never flatten them to null. */
  private static isActionable(error: unknown): boolean {
    return (
      GithubRequestError.isRateLimit(error) ||
      GithubRequestError.isAccessDenial(error)
    );
  }

  private static isAbsence(error: unknown): boolean {
    return error instanceof GithubRequestError && error.kind === 'not-found';
  }

  /**
   * Fetches the recursive Git tree for a repository.
   * @param owner Repository owner
   * @param repo Repository name
   * @param ref Git reference (branch, tag, or commit SHA)
   * @param options.commit Resolved commit; keys the shared tree by immutable identity
   * @returns The tree data, or null when the object or reference does not exist
   */
  async getRepoTree(
    owner: string,
    repo: string,
    ref: string,
    options?: TreeRequestOptions,
  ): Promise<GitHubTreeResponse | null> {
    const identity = options?.commit ?? ref;
    const key = options?.commit
      ? `tree-commit:${owner}/${repo}@${options.commit}`
      : `tree-ref:${owner}/${repo}@${ref}`;
    const url = `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${identity}?recursive=1`;

    return this.sessionRequest(key, async () => {
      try {
        const res = await this.request(url, { headers: this.headers });
        return (await res.json()) as GitHubTreeResponse;
      } catch (error) {
        if (GithubService.isActionable(error)) throw error;
        if (GithubService.isAbsence(error)) return null;
        console.error(pc.red(`Failed to fetch repo tree: ${error}`));
        return null;
      }
    });
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
    const identity = options?.commit ?? ref;
    const maxBytes = options?.maxBytes ?? MAX_RAW_FILE_BYTES;
    const key = `raw:${owner}/${repo}@${identity}:${path}#${options?.expectedSha ?? ''}#${maxBytes}`;
    const url = `${this.rawBaseUrl}/${owner}/${repo}/${identity}/${path}`;

    return this.sessionRequest(key, async () => {
      try {
        const res = await this.request(url);
        const content = Buffer.from(await res.arrayBuffer());

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
        if (GithubService.isActionable(error)) throw error;
        if (GithubService.isAbsence(error)) return null;
        console.error(pc.red(`Failed to fetch file ${path}: ${error}`));
        return null;
      }
    });
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
    const key = `latest-release:${owner}/${repo}`;
    const url = `${this.baseUrl}/repos/${owner}/${repo}/releases/latest`;

    return this.sessionRequest(key, async () => {
      try {
        const res = await this.request(url, { headers: this.headers });
        const data = (await res.json()) as { tag_name: string };
        return data.tag_name;
      } catch (error) {
        if (GithubService.isActionable(error)) throw error;
        if (process.env.DEBUG) {
          console.warn(
            `[GithubService] Failed to fetch latest release: ${error}`,
          );
        }
        return null;
      }
    });
  }

  /**
   * Fetches basic repository information, such as the default branch.
   * @param owner Repository owner
   * @param repo Repository name
   */
  async getRepoInfo(
    owner: string,
    repo: string,
  ): Promise<GithubRepoInfo | null> {
    const key = `repo-info:${owner}/${repo}`;
    const url = `${this.baseUrl}/repos/${owner}/${repo}`;

    return this.sessionRequest(key, async () => {
      try {
        const res = await this.request(url, { headers: this.headers });
        return (await res.json()) as GithubRepoInfo;
      } catch (error) {
        if (GithubService.isActionable(error)) throw error;
        console.error(pc.red(`Failed to fetch repo info: ${error}`));
        return null;
      }
    });
  }

  /**
   * Downloads multiple text files concurrently with a limit. Existing text
   * consumers retain UTF-8 strings; package sync uses the byte variant below.
   *
   * Rejects with the first known `IntegrityError` or access-denied
   * `GithubRequestError` in input-task order after every started worker
   * settles, unless a throttle latch owns the terminal `rateLimited` result.
   */
  async downloadFilesConcurrent(
    tasks: DownloadTask[],
    concurrency: number = 10,
  ): Promise<DownloadResult<string>> {
    return this.downloadFilesConcurrentWith(tasks, concurrency, (task) =>
      this.getRawFile(task.owner, task.repo, task.ref, task.path, {
        expectedSha: task.sha,
        commit: task.commit,
      }),
    );
  }

  /**
   * Downloads multiple files without decoding their response bytes.
   *
   * Same terminal-failure contract as `downloadFilesConcurrent`, so package
   * callers cannot treat verification or authorization failure as absence.
   */
  async downloadFilesConcurrentBytes(
    tasks: DownloadTask[],
    concurrency: number = 10,
  ): Promise<DownloadResult<Buffer>> {
    return this.downloadFilesConcurrentWith(tasks, concurrency, (task) =>
      this.getRawFileBytes(task.owner, task.repo, task.ref, task.path, {
        expectedSha: task.sha,
        commit: task.commit,
      }),
    );
  }

  /**
   * Runs the batch, settles every started worker, then decides the terminal
   * outcome:
   * - a throttle latch keeps priority (`rateLimited` result, as before);
   * - otherwise the first `IntegrityError` or access-denied failure in
   *   input-task order is rethrown, so callers never mistake verification or
   *   authorization failure for missing data;
   * - a genuine missing file (404) stays a `failed` result.
   */
  private async downloadFilesConcurrentWith<T>(
    tasks: DownloadTask[],
    concurrency: number,
    download: (task: DownloadTask) => Promise<T | null>,
  ): Promise<DownloadResult<T>> {
    const outcomes: (
      | { kind: 'ok'; path: string; content: T }
      | { kind: 'failed'; path: string; reason: string; error?: unknown }
      | undefined
    )[] = Array(tasks.length);
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < tasks.length) {
        // Once throttling is confirmed, queued work is never scheduled; the
        // requests already handed to fetch settle on their own.
        if (this.rateLimitError) return;
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
            error,
          };
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, tasks.length) }, worker),
    );

    const ok: { path: string; content: T }[] = [];
    const failed: { path: string; reason: string }[] = [];
    for (let index = 0; index < tasks.length; index += 1) {
      const outcome = outcomes[index];
      const task = tasks[index];
      if (outcome?.kind === 'ok') {
        ok.push({ path: outcome.path, content: outcome.content });
      } else if (outcome?.kind === 'failed') {
        failed.push({ path: outcome.path, reason: outcome.reason });
      } else if (task && this.rateLimitError) {
        failed.push({
          path: task.path,
          reason: `not attempted: ${this.rateLimitError.message}`,
        });
      }
    }

    if (this.rateLimitError) {
      return { ok, failed, rateLimited: this.rateLimitError };
    }

    // All workers have settled; choose by input order, not completion order.
    for (let index = 0; index < outcomes.length; index += 1) {
      const outcome = outcomes[index];
      if (outcome?.kind !== 'failed' || outcome.error === undefined) continue;
      const error = outcome.error;
      if (
        error instanceof IntegrityError ||
        GithubRequestError.isAccessDenial(error)
      ) {
        throw error;
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

  /**
   * Resolves a Git reference (tag, branch, commit) to a full 40-character commit SHA.
   * Returns null on non-200, invalid response, or network failure.
   */
  async resolveCommit(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<string | null> {
    const key = `commit:${owner}/${repo}@${ref}`;
    const url = `${this.baseUrl}/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`;

    return this.sessionRequest(key, async () => {
      try {
        const res = await this.request(url, {
          headers: {
            ...this.headers,
            Accept: 'application/vnd.github.sha',
          },
        });
        const text = (await res.text()).trim();
        return /^[0-9a-f]{40}$/i.test(text) ? text : null;
      } catch (error) {
        if (GithubService.isActionable(error)) throw error;
        return null;
      }
    });
  }

  /**
   * Fetches and validates a release MANIFEST.json for a release tag.
   * Release assets are public and downloaded without authentication headers.
   *
   * Returns null ONLY when the release genuinely has no MANIFEST.json (404),
   * which keeps registries that publish no manifests usable. Transport, HTTP,
   * malformed-payload, schema, and digest-shape problems throw instead: a
   * failed verification must never look like "nothing to verify".
   */
  async getReleaseManifest(
    owner: string,
    repo: string,
    tag: string,
  ): Promise<ReleaseManifest | null> {
    const key = `release-manifest:${owner}/${repo}@${tag}`;
    const url = `https://github.com/${owner}/${repo}/releases/download/${tag}/MANIFEST.json`;

    return this.sessionRequest(key, async () => {
      let res: Response;
      try {
        res = await this.request(url);
      } catch (error) {
        if (GithubService.isAbsence(error)) return null;
        // Typed failures already carry a sanitized message; wrapping them would
        // re-expose arbitrary cause text (possible credentials/URLs).
        throw error;
      }

      let data: unknown;
      try {
        data = await res.json();
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new IntegrityError(`Invalid MANIFEST.json for ${tag}: ${detail}`);
      }
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new IntegrityError(
          `Invalid MANIFEST.json for ${tag}: expected an object`,
        );
      }
      const record = data as Record<string, unknown>;
      if (record.schema_version !== 1) {
        throw new IntegrityError(
          `Invalid MANIFEST.json for ${tag}: unsupported schema_version`,
        );
      }
      if (record.tag !== tag) {
        throw new IntegrityError(
          `Invalid MANIFEST.json for ${tag}: tag does not match`,
        );
      }
      if (
        typeof record.commit !== 'string' ||
        !/^[0-9a-f]{40}$/i.test(record.commit)
      ) {
        throw new IntegrityError(
          `Invalid MANIFEST.json for ${tag}: invalid commit`,
        );
      }
      if (
        typeof record.files !== 'object' ||
        record.files === null ||
        Array.isArray(record.files)
      ) {
        throw new IntegrityError(
          `Invalid MANIFEST.json for ${tag}: missing files map`,
        );
      }
      const files = record.files as Record<string, unknown>;
      for (const [entry, value] of Object.entries(files)) {
        if (typeof entry !== 'string' || typeof value !== 'string') {
          throw new IntegrityError(
            `Invalid MANIFEST.json for ${tag}: non-string entry ${entry}`,
          );
        }
        if (!/^[0-9a-f]{64}$/i.test(value)) {
          throw new IntegrityError(
            `Invalid MANIFEST.json for ${tag}: invalid digest for ${entry}`,
          );
        }
      }
      return record as unknown as ReleaseManifest;
    });
  }
}
