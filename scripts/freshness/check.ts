// scripts/freshness/check.ts
import { CLAIM_ALIASES } from "./claims";
import { GithubSource, resolveSource, type LatestRelease } from "./sources";
import type { EffectivePin, FreshnessIssue, UpstreamStatus } from "./types";
import { compareVersions, parseVersion, significantPart } from "./versions";

/** Output of the network check: drift issues plus one status row per unique pin. */
export interface CheckResult {
  issues: FreshnessIssue[];
  upstream: UpstreamStatus[];
}

interface CheckOptions {
  /** Parallel fetches; defaults to 5. */
  concurrency?: number;
}

/**
 * One entry per distinct pin. Category pins are shared by every skill in
 * the category, so they collapse to a single row (skillName ""), matching
 * the dedupe rule audit.ts uses for reviewed-stale.
 */
export function uniquePins(pins: EffectivePin[]): EffectivePin[] {
  const seen = new Map<string, EffectivePin>();
  for (const pin of pins) {
    const skillName = pin.origin === "category" ? "" : pin.skillName;
    const key = `${pin.category}:${skillName}:${pin.name}`;
    if (!seen.has(key)) seen.set(key, { ...pin, skillName });
  }
  return [...seen.values()];
}

/**
 * Compares a pin against the latest upstream version at the alias's
 * significance (major, or major.minor for Go/Flutter-style versioning;
 * unknown aliases default to major). Returns null when not behind.
 */
export function driftIssue(pin: EffectivePin, latest: LatestRelease): FreshnessIssue | null {
  const pinned = parseVersion(pin.pinned);
  const current = parseVersion(latest.version);
  if (!pinned || !current) return null;
  const significance = CLAIM_ALIASES[pin.name]?.significance ?? "major";
  const base = {
    category: pin.category,
    skillName: pin.skillName,
    upstream: pin.name,
  };
  if (compareVersions(significantPart(current, significance), significantPart(pinned, significance)) > 0) {
    return {
      ...base,
      type: "upstream-major-drift",
      severity: "high",
      message: `Upstream "${pin.name}" is at ${latest.version} (${latest.tag}); pin is ${pin.pinned}. Review the skill(s) against the new release: ${latest.url}`,
    };
  }
  if (compareVersions(current, pinned) > 0) {
    return {
      ...base,
      type: "upstream-minor-drift",
      severity: "low",
      message: `Upstream "${pin.name}" is at ${latest.version}; pin is ${pin.pinned} (same ${significance})`,
    };
  }
  return null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Fetches the latest version for every unique pin and turns the result
 * into drift issues and status rows. Transport/API errors become
 * `fetch-failed` (warn) and never throw.
 */
export async function checkUpstream(
  pins: EffectivePin[],
  github: GithubSource,
  options: CheckOptions = {},
): Promise<CheckResult> {
  const unique = uniquePins(pins);
  const issues: FreshnessIssue[] = [];
  const upstream: UpstreamStatus[] = [];

  const rows = await mapWithConcurrency(unique, options.concurrency ?? 5, async (pin) => {
    const status: UpstreamStatus = {
      category: pin.category,
      skillName: pin.skillName,
      name: pin.name,
      pinned: pin.pinned,
      latest: null,
      publishedAt: null,
      releaseUrl: null,
    };
    try {
      const latest = await resolveSource(pin, github).latest(pin);
      if (!latest) return { status, issue: null };
      status.latest = latest.version;
      status.publishedAt = latest.publishedAt;
      status.releaseUrl = latest.url;
      return { status, issue: driftIssue(pin, latest) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status,
        issue: {
          type: "fetch-failed" as const,
          severity: "warn" as const,
          category: pin.category,
          skillName: pin.skillName,
          upstream: pin.name,
          message: `Could not fetch upstream "${pin.name}" (${pin.repo ?? "manual"}): ${message}`,
        },
      };
    }
  });

  for (const row of rows) {
    upstream.push(row.status);
    if (row.issue) issues.push(row.issue);
  }
  return { issues, upstream };
}
