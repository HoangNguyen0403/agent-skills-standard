import { describe, expect, it } from 'vitest';
import {
  GithubRequestError,
  classifyGithubStatus,
  sanitizeEndpoint,
} from '../GithubRequestError';

const ENDPOINT = 'https://api.github.com/repos/o/r/commits/main';

function response(
  status: number,
  headers: Record<string, string> = {},
  statusText = '',
): Response {
  return new Response(null, { status, statusText, headers });
}

function classify(res: Response, authenticated = false): GithubRequestError {
  const verdict = classifyGithubStatus(res, ENDPOINT, authenticated);
  if (verdict === 'ambiguous') throw new Error('unexpected ambiguous verdict');
  return verdict;
}

describe('sanitizeEndpoint', () => {
  it('drops credentials, query string, and fragment from a valid URL', () => {
    expect(
      sanitizeEndpoint(
        'https://user:ghp_secret@api.github.com/r/x?token=abc#f',
      ),
    ).toBe('https://api.github.com/r/x');
  });

  it('drops the query and fragment even when the URL cannot be parsed', () => {
    expect(sanitizeEndpoint('not a url?token=abc#frag')).toBe('not a url');
  });
});

describe('classifyGithubStatus', () => {
  it('classifies 404 as not-found', () => {
    const error = classify(response(404, {}, 'Not Found'));
    expect(error.kind).toBe('not-found');
    expect(error.message).toContain('404 Not Found');
  });

  it('classifies 401 as access-denied and keeps a valid reset time', () => {
    const error = classify(
      response(401, { 'x-ratelimit-reset': '1893456000' }),
      true,
    );
    expect(error.kind).toBe('access-denied');
    expect(error.authenticated).toBe(true);
    expect(error.resetAt).toBe('2030-01-01T00:00:00.000Z');
  });

  it('treats remaining=0 on a 403 as primary exhaustion', () => {
    const error = classify(
      response(403, {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1893456000',
      }),
    );
    expect(error.kind).toBe('rate-limited');
    expect(error.rateLimitKind).toBe('primary');
    expect(error.resetAt).toBe('2030-01-01T00:00:00.000Z');
  });

  it('treats Retry-After on a 403 as secondary throttling', () => {
    const error = classify(response(403, { 'retry-after': '30' }));
    expect(error.kind).toBe('rate-limited');
    expect(error.rateLimitKind).toBe('secondary');
    expect(error.retryAfterSeconds).toBe(30);
  });

  it('treats a bare 429 as secondary throttling without timing', () => {
    const error = classify(response(429));
    expect(error.kind).toBe('rate-limited');
    expect(error.rateLimitKind).toBe('secondary');
    expect(error.retryAfterSeconds).toBeUndefined();
    expect(error.resetAt).toBeUndefined();
  });

  it('leaves a 403 with no throttle evidence for body inspection', () => {
    expect(
      classifyGithubStatus(
        response(403, { 'x-ratelimit-remaining': '1234' }),
        ENDPOINT,
        false,
      ),
    ).toBe('ambiguous');
  });

  it('classifies any other failure status as transport', () => {
    const error = classify(response(500, {}, 'Internal Server Error'));
    expect(error.kind).toBe('transport');
    expect(error.status).toBe(500);
  });

  it('does not let a quota remaining value on a 404 change its kind', () => {
    expect(classify(response(404, { 'x-ratelimit-remaining': '0' })).kind).toBe(
      'not-found',
    );
  });

  describe('malformed timing headers never become delays', () => {
    it.each([
      ['non-numeric', 'soon'],
      ['negative', '-5'],
      ['fractional', '1.5'],
      ['beyond the safe integer range', '9007199254740993'],
    ])('ignores a %s Retry-After', (_label, value) => {
      const error = classify(response(429, { 'retry-after': value }));
      expect(error.retryAfterSeconds).toBeUndefined();
    });

    it.each([
      ['non-numeric', 'tomorrow'],
      ['zero', '0'],
      ['beyond the safe integer range', '9007199254740993'],
      ['an epoch that overflows Date', '9007199254740991'],
      ['a year past 2100', '9999999999'],
    ])('ignores a %s reset timestamp', (_label, value) => {
      const error = classify(response(429, { 'x-ratelimit-reset': value }));
      expect(error.resetAt).toBeUndefined();
    });

    it.each([
      ['non-numeric', 'many'],
      ['beyond the safe integer range', '9007199254740993'],
    ])('does not read a %s remaining count as exhaustion', (_label, value) => {
      const verdict = classifyGithubStatus(
        response(403, { 'x-ratelimit-remaining': value }),
        ENDPOINT,
        false,
      );
      expect(verdict).toBe('ambiguous');
    });
  });

  it('tolerates a response without a readable headers object', () => {
    const bare = { status: 429, statusText: 'Too Many Requests' } as Response;
    const error = classify(bare);
    expect(error.kind).toBe('rate-limited');
    expect(error.retryAfterSeconds).toBeUndefined();
  });

  it('reports an unknown status label when the status is not an integer', () => {
    const odd = {
      status: 'oops',
      statusText: undefined,
      headers: new Headers(),
    } as unknown as Response;
    const error = classify(odd);
    expect(error.kind).toBe('transport');
    expect(error.message).toContain('unknown');
  });
});
