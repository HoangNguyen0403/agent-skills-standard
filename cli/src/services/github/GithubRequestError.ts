/**
 * Typed GitHub request failure shared by the HTTP boundary in
 * `GithubService`. Callers can distinguish throttling from ordinary access
 * denial without parsing free-form messages, and the printable projection is
 * an explicit allowlist so tokens, authorization headers, and internal causes
 * never leak into diagnostics.
 */
import { Readable } from 'node:stream';

export type GithubFailureKind =
  | 'rate-limited'
  | 'access-denied'
  | 'not-found'
  | 'transport'
  | 'integrity';

export type GithubRateLimitKind = 'primary' | 'secondary';

export interface GithubRequestErrorInit {
  kind: GithubFailureKind;
  message: string;
  /** Sanitized request endpoint: origin plus path only. */
  endpoint: string;
  authenticated: boolean;
  status?: number;
  statusText?: string;
  retryAfterSeconds?: number;
  /** ISO timestamp derived from `x-ratelimit-reset`, only when well formed. */
  resetAt?: string;
  rateLimitKind?: GithubRateLimitKind;
  cause?: unknown;
}

/** Safe, serializable projection. Contains no credential or cause material. */
export interface GithubRequestErrorProjection {
  name: 'GithubRequestError';
  kind: GithubFailureKind;
  status: number | null;
  endpoint: string;
  authenticated: boolean;
  retryAfterSeconds: number | null;
  resetAt: string | null;
  rateLimitKind: GithubRateLimitKind | null;
  message: string;
}

/**
 * A 403 that carries no header-level throttle evidence needs its body
 * inspected, but the body is untrusted and may never settle. Reads are capped
 * at 8 KiB and 1 second, after which the body is abandoned and released.
 */
export const AMBIGUOUS_ERROR_BODY_MAX_BYTES = 8 * 1024;
export const AMBIGUOUS_ERROR_BODY_TIMEOUT_MS = 1000;

const RATE_LIMIT_EVIDENCE =
  /rate[-_ ]?limit|abuse[-_ ]?detection|too many requests/i;

/**
 * Drops credentials, query strings, and fragments. GitHub tokens can appear in
 * query strings on some endpoints, so only origin and path are retained.
 */
export function sanitizeEndpoint(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split(/[?#]/)[0] ?? url;
  }
}

function readHeader(res: Response, name: string): string | undefined {
  const headers = res.headers;
  if (!headers || typeof headers.get !== 'function') return undefined;
  const value = headers.get(name);
  return typeof value === 'string' ? value : undefined;
}

/** `Retry-After` in seconds. Malformed, negative, or non-integer values are ignored. */
function parseRetryAfterSeconds(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const seconds = Number(trimmed);
  return Number.isSafeInteger(seconds) ? seconds : undefined;
}

/** `x-ratelimit-reset` is epoch seconds. Malformed or implausible values are ignored. */
function parseResetAt(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const seconds = Number(trimmed);
  if (!Number.isSafeInteger(seconds) || seconds <= 0) return undefined;
  const date = new Date(seconds * 1000);
  const time = date.getTime();
  if (Number.isNaN(time)) return undefined;
  const year = date.getUTCFullYear();
  if (year < 1970 || year > 2100) return undefined;
  return date.toISOString();
}

function parseRemaining(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const remaining = Number(trimmed);
  return Number.isSafeInteger(remaining) ? remaining : undefined;
}

function readNodeBody(stream: Readable): Promise<string | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    const finish = (text: string | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stream.removeListener('data', onData);
      stream.removeListener('end', onEnd);
      stream.removeListener('error', onError);
      if (text === null) {
        stream.destroy();
      } else {
        stream.pause();
      }
      resolve(text);
    };

    const onData = (chunk: Buffer | string): void => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += bytes.byteLength;
      if (total > AMBIGUOUS_ERROR_BODY_MAX_BYTES) {
        finish(null);
        return;
      }
      chunks.push(bytes);
    };
    const onEnd = (): void => finish(Buffer.concat(chunks).toString('utf8'));
    const onError = (): void => finish(null);

    const timer = setTimeout(
      () => finish(null),
      AMBIGUOUS_ERROR_BODY_TIMEOUT_MS,
    );
    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onError);
  });
}

type WebReadChunk = ReadableStreamReadResult<Uint8Array>;

function readWebChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number,
): Promise<WebReadChunk | 'timeout'> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve('timeout');
    }, timeoutMs);
    reader.read().then(
      (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve('timeout');
      },
    );
  });
}

/**
 * Abandons a WHATWG reader without waiting on `cancel()`. A cancellation
 * promise may never settle; awaiting it would extend the classification
 * deadline. The lock is released when possible, otherwise the runtime owns the
 * reader after the pending read settles.
 */
function abandonWebReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): void {
  try {
    const cancellation = reader.cancel();
    // Never awaited: rejection is observed, settlement is not required.
    void cancellation.catch(() => undefined);
  } catch {
    // A stream that is already closed or locked needs no further cleanup.
  }
  try {
    reader.releaseLock();
  } catch {
    // Pending read still holds the lock; it resolves after cancellation.
  }
}

async function readWebBody(
  stream: ReadableStream<Uint8Array>,
): Promise<string | null> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let total = 0;
  const deadline = Date.now() + AMBIGUOUS_ERROR_BODY_TIMEOUT_MS;

  try {
    for (;;) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        abandonWebReader(reader);
        return null;
      }
      const chunk = await readWebChunk(reader, remaining);
      if (chunk === 'timeout') {
        abandonWebReader(reader);
        return null;
      }
      if (chunk.done) return text + decoder.decode();
      total += chunk.value.byteLength;
      if (total > AMBIGUOUS_ERROR_BODY_MAX_BYTES) {
        abandonWebReader(reader);
        return null;
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
  } catch {
    return null;
  }
}

/**
 * Releases a response body that will never be read. Node streams are destroyed
 * synchronously; WHATWG cancellation is started with rejection handling and
 * never awaited, so a stalled cancel cannot hold up classification or latch.
 */
export function abandonResponseBody(res: Response): void {
  const body: unknown = res.body;
  if (body instanceof Readable) {
    body.destroy();
    return;
  }
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
    try {
      void body.cancel().catch(() => undefined);
    } catch {
      // Already closed or locked; nothing else to release.
    }
  }
}

/**
 * Reads only the ambiguous 403 body, bounded in bytes and time, for both the
 * Node stream that `cross-fetch` returns and a WHATWG stream. Any timeout,
 * oversize read, or stream error releases the body and returns null.
 */
export function readAmbiguousErrorBody(
  res: Response,
): Promise<string | null> {
  const body: unknown = res.body;
  if (body instanceof Readable) return readNodeBody(body);
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
    return readWebBody(body);
  }
  return Promise.resolve(null);
}

export class GithubRequestError extends Error {
  readonly kind: GithubFailureKind;
  readonly endpoint: string;
  readonly authenticated: boolean;
  readonly status?: number;
  readonly statusText?: string;
  readonly retryAfterSeconds?: number;
  readonly resetAt?: string;
  readonly rateLimitKind?: GithubRateLimitKind;

  constructor(init: GithubRequestErrorInit) {
    super(init.message, { cause: init.cause });
    this.name = 'GithubRequestError';
    this.kind = init.kind;
    this.endpoint = sanitizeEndpoint(init.endpoint);
    this.authenticated = init.authenticated;
    this.status = init.status;
    this.statusText = init.statusText;
    this.retryAfterSeconds = init.retryAfterSeconds;
    this.resetAt = init.resetAt;
    this.rateLimitKind = init.rateLimitKind;
  }

  /** Serialization allowlist: no token, no headers, no cause chain. */
  toJSON(): GithubRequestErrorProjection {
    return {
      name: 'GithubRequestError',
      kind: this.kind,
      status: this.status ?? null,
      endpoint: this.endpoint,
      authenticated: this.authenticated,
      retryAfterSeconds: this.retryAfterSeconds ?? null,
      resetAt: this.resetAt ?? null,
      rateLimitKind: this.rateLimitKind ?? null,
      message: this.message,
    };
  }

  static isRateLimit(error: unknown): error is GithubRequestError {
    return error instanceof GithubRequestError && error.kind === 'rate-limited';
  }

  static isAccessDenial(error: unknown): error is GithubRequestError {
    return error instanceof GithubRequestError && error.kind === 'access-denied';
  }
}

/**
 * Classifies every non-2xx response that is decidable from status and headers
 * alone. The result is synchronous so a known throttle can latch the operation
 * before anything awaits the response body.
 *
 * - Primary exhaustion: `x-ratelimit-remaining: 0` on 403/429.
 * - Secondary throttling: 429 or `Retry-After` on 403.
 * - A 403 with neither is `ambiguous`: its bounded body is checked separately.
 */
export type GithubStatusVerdict = GithubRequestError | 'ambiguous';

function buildFailure(res: Response): {
  status: number;
  statusText: string | undefined;
  statusLabel: string;
  retryAfterSeconds: number | undefined;
  resetAt: string | undefined;
} {
  const status =
    typeof res.status === 'number' && Number.isInteger(res.status)
      ? res.status
      : 0;
  const statusText =
    typeof res.statusText === 'string' ? res.statusText : undefined;
  return {
    status,
    statusText,
    statusLabel: `${status || 'unknown'}${statusText ? ` ${statusText}` : ''}`,
    retryAfterSeconds: parseRetryAfterSeconds(readHeader(res, 'retry-after')),
    resetAt: parseResetAt(readHeader(res, 'x-ratelimit-reset')),
  };
}

export function classifyGithubStatus(
  res: Response,
  endpoint: string,
  authenticated: boolean,
): GithubStatusVerdict {
  const { status, statusText, statusLabel, retryAfterSeconds, resetAt } =
    buildFailure(res);
  const remaining = parseRemaining(readHeader(res, 'x-ratelimit-remaining'));
  const primary = remaining === 0;

  if (status === 404) {
    return new GithubRequestError({
      kind: 'not-found',
      message: `GitHub resource not found: ${statusLabel}`,
      endpoint,
      authenticated,
      status,
      statusText,
    });
  }

  if (status === 401) {
    return new GithubRequestError({
      kind: 'access-denied',
      message: `GitHub access denied: ${statusLabel}`,
      endpoint,
      authenticated,
      status,
      statusText,
      resetAt,
    });
  }

  if (status === 403 || status === 429) {
    if (primary || status === 429 || retryAfterSeconds !== undefined) {
      const rateLimitKind: GithubRateLimitKind | undefined = primary
        ? 'primary'
        : retryAfterSeconds !== undefined || status === 429
          ? 'secondary'
          : undefined;
      return new GithubRequestError({
        kind: 'rate-limited',
        message: `GitHub rate limit exceeded (${rateLimitKind ?? 'unclassified'}): ${statusLabel}`,
        endpoint,
        authenticated,
        status,
        statusText,
        retryAfterSeconds,
        resetAt,
        rateLimitKind,
      });
    }
    return 'ambiguous';
  }

  return new GithubRequestError({
    kind: 'transport',
    message: `GitHub API Error: ${statusLabel}`,
    endpoint,
    authenticated,
    status,
    statusText,
  });
}

/** Resolves an ambiguous 403 by reading a bounded body for throttle evidence. */
export async function classifyAmbiguous403(
  res: Response,
  endpoint: string,
  authenticated: boolean,
): Promise<GithubRequestError> {
  const { status, statusText, statusLabel, resetAt } = buildFailure(res);
  const body = await readAmbiguousErrorBody(res);
  if (body !== null && RATE_LIMIT_EVIDENCE.test(body)) {
    return new GithubRequestError({
      kind: 'rate-limited',
      message: `GitHub rate limit exceeded (secondary): ${statusLabel}`,
      endpoint,
      authenticated,
      status,
      statusText,
      resetAt,
      rateLimitKind: 'secondary',
    });
  }
  return new GithubRequestError({
    kind: 'access-denied',
    message: `GitHub access denied: ${statusLabel}`,
    endpoint,
    authenticated,
    status,
    statusText,
    resetAt,
  });
}
