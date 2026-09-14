// scripts/freshness/versions.ts

/**
 * Parses "15.3.0", "v20", "3.27+" into numeric parts. Returns null for
 * anything that is not 1-3 dot-separated integers.
 */
export function parseVersion(raw: string): number[] | null {
  const cleaned = raw.trim().replace(/^v/i, "").replace(/\+$/, "");
  if (!/^\d+(\.\d+){0,2}$/.test(cleaned)) return null;
  return cleaned.split(".").map((p) => Number(p));
}

/** Numeric compare; shorter arrays are padded with zeros. */
export function compareVersions(a: number[], b: number[]): -1 | 0 | 1 {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

/**
 * Truncates to the part that matters for drift: "major" → [M],
 * "minor" → [M, m] (for Go/Flutter/PHP-style versioning where the
 * minor number carries the breaking changes).
 */
export function significantPart(
  parts: number[],
  significance: "major" | "minor",
): number[] {
  if (significance === "major") return [parts[0] ?? 0];
  return [parts[0] ?? 0, parts[1] ?? 0];
}
