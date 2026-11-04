import fetch from 'cross-fetch';
import { PassThrough } from 'node:stream';
import { setImmediate as tick, setTimeout as delay } from 'node:timers/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubService, IntegrityError } from '../GithubService';
import { GithubRequestError } from '../github/GithubRequestError';

vi.mock('cross-fetch', () => ({
  default: vi.fn(),
}));

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

function okJson(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function okBytes(content: Buffer): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    arrayBuffer: () => Promise.resolve(content),
  } as unknown as Response;
}

function errorResponse(
  status: number,
  headers: Record<string, string> = {},
  body = '',
): Response {
  return {
    ok: false,
    status,
    statusText: STATUS_TEXT[status] ?? '',
    headers: new Headers(headers),
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

const TREE = { sha: 'tree-sha', url: 'https://api.github.com/x', tree: [], truncated: false };

describe('GithubService failure classification', () => {
  let service: GithubService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GithubService('mock-token');
  });

  it('classifies 403 with remaining=0 as primary throttling and keeps reset timing', async () => {
    const resetSeconds = 1_800_000_000;
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(
        403,
        {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(resetSeconds),
          'retry-after': '60',
        },
        '{"message":"API rate limit exceeded"}',
      ),
    );

    const failure = await service
      .getRepoTree('owner', 'repo', 'main')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(GithubRequestError);
    const typed = failure as GithubRequestError;
    expect(typed.kind).toBe('rate-limited');
    expect(typed.rateLimitKind).toBe('primary');
    expect(typed.status).toBe(403);
    expect(typed.authenticated).toBe(true);
    expect(typed.retryAfterSeconds).toBe(60);
    expect(typed.resetAt).toBe(new Date(resetSeconds * 1000).toISOString());
    expect(typed.endpoint).toBe('https://api.github.com/repos/owner/repo/git/trees/main');
  });

  it('keeps an ordinary 403 as access denial instead of quota exhaustion', async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(403, { 'x-ratelimit-remaining': '4999' }, '{"message":"Resource not accessible by integration"}'),
    );

    const failure = await service
      .getRepoInfo('owner', 'repo')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(GithubRequestError);
    const typed = failure as GithubRequestError;
    expect(typed.kind).toBe('access-denied');
    expect(typed.rateLimitKind).toBeUndefined();
    expect(typed.retryAfterSeconds).toBeUndefined();
  });

  it('classifies retry-after throttling as secondary when primary budget remains', async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(403, { 'x-ratelimit-remaining': '4999', 'retry-after': '30' }),
    );

    const failure = await service
      .getRepoTree('owner', 'repo', 'main')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(GithubRequestError);
    const typed = failure as GithubRequestError;
    expect(typed.kind).toBe('rate-limited');
    expect(typed.rateLimitKind).toBe('secondary');
    expect(typed.retryAfterSeconds).toBe(30);
  });

  it('treats a headerless 429 as throttling without inventing timing', async () => {
    vi.mocked(fetch).mockResolvedValue(errorResponse(429));

    const failure = await service
      .getRepoTree('owner', 'repo', 'main')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(GithubRequestError);
    const typed = failure as GithubRequestError;
    expect(typed.kind).toBe('rate-limited');
    expect(typed.retryAfterSeconds).toBeUndefined();
    expect(typed.resetAt).toBeUndefined();
  });

  it('ignores malformed timing headers instead of producing NaN or invalid dates', async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(429, {
        'retry-after': 'later',
        'x-ratelimit-reset': '999999999999999999999',
      }),
    );

    const failure = await service
      .getRepoTree('owner', 'repo', 'main')
      .catch((error: unknown) => error);

    const typed = failure as GithubRequestError;
    expect(typed).toBeInstanceOf(GithubRequestError);
    expect(typed.retryAfterSeconds).toBeUndefined();
    expect(typed.resetAt).toBeUndefined();
    expect(Number.isNaN(typed.retryAfterSeconds as number)).toBe(false);
  });

  it('projects failures without token, headers, or cause material', async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(429, {}, 'API rate limit exceeded for mock-token'),
    );

    const failure = await service
      .getRepoInfo('owner', 'repo')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(GithubRequestError);
    const projection = (failure as GithubRequestError).toJSON();
    expect(Object.keys(projection).sort()).toEqual(
      [
        'authenticated',
        'endpoint',
        'kind',
        'message',
        'name',
        'rateLimitKind',
        'resetAt',
        'retryAfterSeconds',
        'status',
      ].sort(),
    );
    const projected = JSON.stringify(projection);
    expect(projected).not.toContain('mock-token');
    expect(projected).not.toContain('Authorization');
    expect(projected).not.toContain('cause');
  });
});

describe('GithubService session request reuse', () => {
  let service: GithubService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GithubService('mock-token');
  });

  it('coalesces concurrent identical tree requests into one network call', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson(TREE));

    const [a, b] = await Promise.all([
      service.getRepoTree('owner', 'repo', 'main'),
      service.getRepoTree('owner', 'repo', 'main'),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a).toEqual(TREE);
    expect(b).toEqual(TREE);
  });

  it('reuses a completed tree for the same identity but not across commits', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson(TREE));
    const shaA = 'a'.repeat(40);
    const shaB = 'b'.repeat(40);

    await service.getRepoTree('owner', 'repo', 'v1.0.0', { commit: shaA });
    await service.getRepoTree('owner', 'repo', 'v1.0.0', { commit: shaA });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain(`/git/trees/${shaA}`);

    await service.getRepoTree('owner', 'repo', 'v1.0.0', { commit: shaB });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain(`/git/trees/${shaB}`);
  });

  it('does not cache a failure so a later identical request can recover', async () => {
    const sha = 'a'.repeat(40);
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(sha),
      } as unknown as Response);

    expect(await service.resolveCommit('owner', 'repo', 'main')).toBeNull();
    expect(await service.resolveCommit('owner', 'repo', 'main')).toBe(sha);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('returns cached results detached from consumer mutation', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okJson({ sha: 'tree-sha', url: 'u', tree: [{ path: 'a', type: 'blob', sha: 's', url: 'u' }], truncated: false }),
    );

    const first = await service.getRepoTree('owner', 'repo', 'main');
    expect(first).not.toBeNull();
    first?.tree.push({ path: 'injected', type: 'blob', sha: 's', url: 'u' });

    const second = await service.getRepoTree('owner', 'repo', 'main');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(second?.tree.map((item) => item.path)).toEqual(['a']);
  });

  it('clears caches and the throttle latch on resetOperation', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(errorResponse(429));
    await expect(service.getRepoTree('owner', 'repo', 'main')).rejects.toBeInstanceOf(
      GithubRequestError,
    );
    expect(service.rateLimited).toBe(true);

    await expect(service.getRepoInfo('owner', 'repo')).rejects.toBeInstanceOf(
      GithubRequestError,
    );
    expect(fetch).toHaveBeenCalledTimes(1);

    service.resetOperation();
    expect(service.rateLimited).toBe(false);

    vi.mocked(fetch).mockResolvedValueOnce(okJson(TREE));
    await expect(service.getRepoTree('owner', 'repo', 'main')).resolves.toEqual(TREE);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('GithubService download scheduling under throttling', () => {
  it('stops scheduling queued downloads after the rate-limit latch', async () => {
    const service = new GithubService('mock-token');
    let calls = 0;
    vi.mocked(fetch).mockImplementation(() => {
      calls += 1;
      return Promise.resolve(
        calls === 1
          ? errorResponse(429, { 'retry-after': '60' })
          : okBytes(Buffer.from('ok')),
      );
    });

    const tasks = Array.from({ length: 6 }, (_, index) => ({
      owner: 'o',
      repo: 'r',
      ref: 'm',
      path: `file-${index}.md`,
    }));

    const result = await service.downloadFilesConcurrentBytes(tasks, 1);
    expect(calls).toBe(1);
    expect(result.ok).toEqual([]);
    expect(result.failed).toHaveLength(6);
    expect(result.rateLimited).toBeInstanceOf(GithubRequestError);
  });

  it('preserves true 404 absence for trees, raw blobs, and release manifests', async () => {
    const service = new GithubService('mock-token');
    vi.mocked(fetch).mockResolvedValue(errorResponse(404));

    expect(await service.getRepoTree('o', 'r', 'missing')).toBeNull();
    expect(await service.getRawFileBytes('o', 'r', 'missing', 'a.md')).toBeNull();
    expect(await service.getReleaseManifest('o', 'r', 'missing')).toBeNull();
  });

  it('keeps release assets and raw blobs unauthenticated', async () => {
    const service = new GithubService('secret-token');
    vi.mocked(fetch).mockResolvedValue(
      okJson({
        schema_version: 1,
        tag: 'v1.0.0',
        commit: 'a'.repeat(40),
        files: { 'foo.md': 'b'.repeat(64) },
      }),
    );
    await service.getReleaseManifest('o', 'r', 'v1.0.0');
    expect(vi.mocked(fetch).mock.calls[0]).toHaveLength(1);

    vi.mocked(fetch).mockResolvedValue(okBytes(Buffer.from('x')));
    await service.getRawFileBytes('o', 'r', 'v1.0.0', 'foo.md');
    const rawCall = vi.mocked(fetch).mock.calls[1];
    expect(rawCall).toHaveLength(1);
    expect(rawCall[0]).not.toContain('secret-token');
  });
});

/**
 * A 403/429 whose response body is still open. The body hangs until the test
 * ends it or the classifier abandons it, which is exactly the stall the review
 * reported.
 */
function deferredBodyResponse(
  status: number,
  headers: Record<string, string>,
): { res: Response; body: PassThrough } {
  const body = new PassThrough();
  return {
    body,
    res: {
      ok: false,
      status,
      statusText: STATUS_TEXT[status] ?? '',
      headers: new Headers(headers),
      body,
      text: async () => {
        let text = '';
        for await (const chunk of body) text += String(chunk);
        return text;
      },
    } as unknown as Response,
  };
}

describe('GithubService corrective regressions', () => {
  let service: GithubService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GithubService('mock-token');
  });

  it('latches a status-known 429 before the response body settles', async () => {
    const { res, body } = deferredBodyResponse(429, {});
    vi.mocked(fetch).mockResolvedValue(res);

    const stale = service
      .getRepoTree('owner', 'repo', 'main')
      .catch((error: unknown) => error);
    await tick();

    expect(service.rateLimited).toBe(true);

    vi.mocked(fetch).mockResolvedValue(okJson(TREE));
    await expect(service.getRepoInfo('owner', 'repo')).rejects.toBeInstanceOf(
      GithubRequestError,
    );
    expect(fetch).toHaveBeenCalledTimes(1);

    const failure = await stale;
    expect((failure as GithubRequestError).kind).toBe('rate-limited');
  });

  it('bounds an ambiguous 403 body read and releases the response body', async () => {
    const { res, body } = deferredBodyResponse(403, {
      'x-ratelimit-remaining': '100',
    });
    vi.mocked(fetch).mockResolvedValue(res);

    const started = Date.now();
    const failure = await service
      .getRepoTree('owner', 'repo', 'main')
      .catch((error: unknown) => error);

    expect(Date.now() - started).toBeLessThan(4000);
    expect(failure).toBeInstanceOf(GithubRequestError);
    expect((failure as GithubRequestError).kind).toBe('access-denied');
    expect(body.destroyed).toBe(true);
  });

  it('does not treat rate-limit text beyond the ambiguous-body cap as evidence', async () => {
    const body = new PassThrough();
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers({ 'x-ratelimit-remaining': '100' }),
      body,
      text: async () => {
        let text = '';
        for await (const chunk of body) text += String(chunk);
        return text;
      },
    } as unknown as Response);
    body.end('x'.repeat(16 * 1024) + ' secondary rate limit');

    const failure = await service
      .getRepoTree('owner', 'repo', 'main')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(GithubRequestError);
    expect((failure as GithubRequestError).kind).toBe('access-denied');
  });

  it('reports authenticated=false when the client has no token', async () => {
    const tokenless = new GithubService();
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(403, { 'x-ratelimit-remaining': '100' }),
    );

    const failure = await tokenless
      .getRepoInfo('owner', 'repo')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(GithubRequestError);
    const typed = failure as GithubRequestError;
    expect(typed.authenticated).toBe(false);
    expect(typed.toJSON().authenticated).toBe(false);
    const init = vi.mocked(fetch).mock.calls[0][1];
    expect(JSON.stringify(init)).not.toContain('Authorization');
  });

  it('does not let a pre-reset deferred response latch the new operation', async () => {
    const { res, body } = deferredBodyResponse(403, {
      'x-ratelimit-remaining': '100',
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce(res)
      .mockResolvedValueOnce(okJson({ default_branch: 'main' }));

    const stale = service
      .getRepoTree('owner', 'repo', 'main')
      .catch((error: unknown) => error);
    await tick();

    service.resetOperation();
    const info = await service.getRepoInfo('owner', 'repo');
    expect(info?.default_branch).toBe('main');

    body.end('API rate limit exceeded');
    const failure = await stale;
    expect(failure).toBeInstanceOf(GithubRequestError);
    expect((failure as GithubRequestError).kind).toBe('rate-limited');
    expect(service.rateLimited).toBe(false);
  });

  it('keeps secret-bearing transport causes out of the public error', async () => {
    const secret = 'ghp_SYNTHETICsecret123';
    vi.mocked(fetch).mockRejectedValue(
      new Error(`connect failed: https://user:${secret}@api.github.com/repos/o/r`),
    );

    const failure = await service
      .getReleaseManifest('owner', 'repo', 'v1.0.0')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(GithubRequestError);
    const typed = failure as GithubRequestError;
    const visible = [
      typed.message,
      String(typed),
      JSON.stringify(typed.toJSON()),
    ].join('\n');
    expect(visible).not.toContain(secret);
    expect(typed.kind).toBe('transport');
    expect(typed.cause).toBeInstanceOf(Error);
  });
});

function neverSettling(): Promise<never> {
  const thenable = { then: () => thenable, catch: () => thenable };
  return thenable as unknown as Promise<never>;
}

describe('GithubService body abandonment', () => {
  let service: GithubService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GithubService('mock-token');
  });

  it('destroys a stalled known-429 Node body without the test ending it', async () => {
    const { res, body } = deferredBodyResponse(429, {});
    vi.mocked(fetch).mockResolvedValue(res);

    const failure = await service
      .getRepoTree('owner', 'repo', 'main')
      .catch((error: unknown) => error);

    expect((failure as GithubRequestError).kind).toBe('rate-limited');
    expect(body.destroyed).toBe(true);
  });

  it('starts cancellation of an unused WHATWG body for a known throttle', async () => {
    let cancelCalls = 0;
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        cancelCalls += 1;
      },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Headers(),
      body: stream,
    } as unknown as Response);

    const failure = await service
      .getRepoTree('owner', 'repo', 'main')
      .catch((error: unknown) => error);

    expect((failure as GithubRequestError).kind).toBe('rate-limited');
    expect(cancelCalls).toBe(1);
  });

  it('settles an ambiguous 403 within the deadline when WHATWG cancel never resolves', async () => {
    let cancelCalls = 0;
    const reader = {
      read: neverSettling,
      cancel: () => {
        cancelCalls += 1;
        return neverSettling();
      },
      releaseLock: () => {
        throw new TypeError('Cannot release a reader with a pending read');
      },
    };
    const stream = new ReadableStream<Uint8Array>();
    Object.defineProperty(stream, 'getReader', { value: () => reader });
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers({ 'x-ratelimit-remaining': '100' }),
      body: stream,
    } as unknown as Response);

    const started = Date.now();
    const failure = await service
      .getRepoTree('owner', 'repo', 'main')
      .catch((error: unknown) => error);

    expect(Date.now() - started).toBeLessThan(4000);
    expect((failure as GithubRequestError).kind).toBe('access-denied');
    expect(cancelCalls).toBe(1);
  });
});

describe('GithubService typed batch failures', () => {
  let service: GithubService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GithubService('mock-token');
  });

  function task(path: string, sha?: string) {
    return { owner: 'o', repo: 'r', ref: 'm', path, sha };
  }

  function deniedResponse(): Response {
    return errorResponse(
      403,
      { 'x-ratelimit-remaining': '4999' },
      '{"message":"Resource not accessible by integration"}',
    );
  }

  it('rethrows the first access denial in input order, not completion order', async () => {
    vi.mocked(fetch).mockImplementation((url: RequestInfo | URL) => {
      const target = url.toString();
      if (target.includes('denied')) {
        return delay(30).then(() => deniedResponse());
      }
      return delay(1).then(() => okBytes(Buffer.from('hello world')));
    });

    const failure = await service
      .downloadFilesConcurrentBytes([
        task('denied.md'),
        task('tampered.md', 'deadbeef'),
      ])
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(GithubRequestError);
    expect((failure as GithubRequestError).kind).toBe('access-denied');
  });

  it('rethrows a known integrity failure instead of folding it into failed data', async () => {
    vi.mocked(fetch).mockImplementation((url: RequestInfo | URL) =>
      Promise.resolve(
        okBytes(
          Buffer.from(
            url.toString().includes('tampered') ? 'tampered' : 'hello world',
          ),
        ),
      ),
    );

    const failure = await service
      .downloadFilesConcurrent([
        task('clean.md'),
        task('tampered.md', 'deadbeef'),
      ])
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(IntegrityError);
    expect((failure as IntegrityError).message).toMatch(/blob sha mismatch/);
  });

  it('waits for a sibling body before rethrowing the same integrity failure', async () => {
    const siblingBody = new PassThrough();
    const expectedError = new IntegrityError('injected body integrity failure');
    let tamperedRequested = false;
    let siblingRequested = false;

    vi.mocked(fetch).mockImplementation((url: RequestInfo | URL) => {
      const target = url.toString();
      if (target.includes('tampered')) {
        tamperedRequested = true;
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          arrayBuffer: async () => {
            throw expectedError;
          },
        } as unknown as Response);
      }
      siblingRequested = true;
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        arrayBuffer: async () => {
          const chunks: Buffer[] = [];
          for await (const chunk of siblingBody) chunks.push(Buffer.from(chunk));
          return Buffer.concat(chunks);
        },
      } as unknown as Response);
    });

    let batchSettled = false;
    const batch = service
      .downloadFilesConcurrentBytes([
        task('tampered.md'),
        task('sibling.md'),
      ])
      .then(
        (value) => {
          batchSettled = true;
          return { kind: 'value' as const, value };
        },
        (error: unknown) => {
          batchSettled = true;
          return { kind: 'error' as const, error };
        },
      );

    try {
      await tick();
      await tick();

      expect(tamperedRequested).toBe(true);
      expect(siblingRequested).toBe(true);
      expect(batchSettled).toBe(false);

      siblingBody.end('hello world');
      const outcome = await batch;

      expect(outcome.kind).toBe('error');
      if (outcome.kind !== 'error') throw new Error('expected rejection');
      expect(outcome.error).toBe(expectedError);
    } finally {
      siblingBody.destroy();
      if (!batchSettled) {
        const cleanupTimeout = new AbortController();
        await Promise.race([
          batch,
          delay(1000, undefined, { signal: cleanupTimeout.signal }),
        ]);
        cleanupTimeout.abort();
      }
    }
  });

  it('keeps the latched throttle result ahead of typed batch failures', async () => {
    vi.mocked(fetch).mockImplementation((url: RequestInfo | URL) => {
      const target = url.toString();
      if (target.includes('throttled')) {
        return Promise.resolve(errorResponse(429, { 'retry-after': '60' }));
      }
      if (target.includes('denied')) {
        return Promise.resolve(deniedResponse());
      }
      return Promise.resolve(okBytes(Buffer.from('hello world')));
    });

    const result = await service.downloadFilesConcurrentBytes([
      task('throttled.md'),
      task('denied.md'),
      task('tampered.md', 'deadbeef'),
    ]);

    expect(result.rateLimited).toBeInstanceOf(GithubRequestError);
    expect(result.failed).toHaveLength(3);
  });

  it('keeps an ordinary missing file as a failed result', async () => {
    vi.mocked(fetch).mockResolvedValue(errorResponse(404));

    const result = await service.downloadFilesConcurrentBytes([task('gone.md')]);

    expect(result.rateLimited).toBeUndefined();
    expect(result.ok).toEqual([]);
    expect(result.failed).toEqual([{ path: 'gone.md', reason: 'not found' }]);
  });
});
