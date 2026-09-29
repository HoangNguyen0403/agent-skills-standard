/**
 * Path matching utilities for policy rules.
 *
 * Rules:
 * - '/' separator (Windows '\\' normalized)
 * - Leading './' is stripped
 * - Case-sensitive
 * - '*' and '?' match within one segment
 * - '**' matches zero or more whole segments
 * - A pattern without '/' matches the basename in any directory (e.g. '.env*' matches 'a/b/.env.local')
 * - '**' alone matches everything
 */

export function normalizePath(p: string): string {
  let normalized = p.replace(/\\/g, '/');
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  return normalized;
}

function segmentToRegex(seg: string): string {
  let res = '';
  for (let i = 0; i < seg.length; i++) {
    const c = seg[i];
    if (c === '*') {
      res += '[^/]*';
    } else if (c === '?') {
      res += '[^/]';
    } else {
      res += '-\\^$*+?.()|[]{}'.includes(c) ? '\\' + c : c;
    }
  }
  return res;
}

export function matchesPattern(pattern: string, relPath: string): boolean {
  const normPat = normalizePath(pattern);
  const normPath = normalizePath(relPath);

  if (normPat === '**') {
    return true;
  }

  if (!normPat.includes('/')) {
    const base = normPath.includes('/')
      ? normPath.slice(normPath.lastIndexOf('/') + 1)
      : normPath;
    const re = new RegExp(`^${segmentToRegex(normPat)}$`);
    return re.test(base);
  }

  let reStr = '^';
  let i = 0;
  while (i < normPat.length) {
    if (normPat.startsWith('/**/', i)) {
      reStr += '(?:/.+)?/';
      i += 4;
    } else if (i === 0 && normPat.startsWith('**/', i)) {
      reStr += '(?:.+/)?';
      i += 3;
    } else if (normPat.startsWith('/**', i) && i + 3 === normPat.length) {
      reStr += '(?:/.*)?';
      i += 3;
    } else {
      const c = normPat[i];
      if (c === '*') {
        reStr += '[^/]*';
      } else if (c === '?') {
        reStr += '[^/]';
      } else {
        reStr += '-\\^$*+?.()|[]{}'.includes(c) ? '\\' + c : c;
      }
      i++;
    }
  }
  reStr += '$';

  return new RegExp(reStr).test(normPath);
}
