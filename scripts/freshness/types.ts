// scripts/freshness/types.ts

/** One upstream dependency a category or skill tracks. */
export interface UpstreamEntry {
  /** Stable key, also the key into CLAIM_ALIASES (e.g. "next", "java"). */
  name: string;
  /** "github" fetches releases/tags (P2); "manual" only checks reviewed age. */
  source: "github" | "manual";
  /** "owner/repo"; required when source is "github". */
  repo?: string;
  /** Version the skill content was reviewed against, e.g. "15.3.0" or "21". */
  pinned: string;
  /** Regex with capture groups forming the version; used by P2 check. */
  tag_pattern?: string;
  /** YYYY-MM-DD of the last human review of this pin. */
  reviewed: string;
  /**
   * Newest upstream version the maintainers already know about but have
   * not re-reviewed the skill against. Drift up to this version reports
   * at low instead of high so the weekly job stays green while the review
   * is pending.
   */
  acknowledged?: string;
}

/** A skill on disk with parsed frontmatter. */
export interface SkillRecord {
  category: string;
  name: string;
  /** Absolute skill directory. */
  dir: string;
  /** Absolute path to SKILL.md. */
  skillPath: string;
  frontmatter: Record<string, unknown>;
  body: string;
}

/** An upstream entry resolved for a specific skill, with provenance. */
export interface EffectivePin extends UpstreamEntry {
  category: string;
  skillName: string;
  /** Where the pin was declared. */
  origin: "category" | "skill";
}

/** A version string found in a skill body or reference file. */
export interface VersionClaim {
  category: string;
  skillName: string;
  /** Matches an UpstreamEntry.name. */
  name: string;
  /** Raw captured version, e.g. "15", "3.27", "8.1". */
  version: string;
  /** True when the text had a trailing "+" (a floor, not a ceiling). */
  floor: boolean;
  /**
   * "historical" when the same line reads as a reference to an older
   * version ("since Go 1.21", "pre-iOS 17", "migrating from PHP 7"),
   * "current" otherwise. Only claim-behind-pin severity depends on it.
   */
  context: "current" | "historical";
  /** Repo-relative file path. */
  file: string;
  line: number;
}

/** Kind of freshness finding; see docs/FRESHNESS.md issue table. */
export type IssueType =
  | "upstream-major-drift"
  | "upstream-minor-drift"
  | "claim-behind-pin"
  | "claim-ahead-of-pin"
  | "reviewed-stale"
  | "reviewed-mismatch"
  | "missing-pin"
  | "fetch-failed"
  | "eval-outdated"
  | "eval-remediation"
  | "learning-log-gap"
  | "unused-skill";

/** high/med/low gate severity; warn never gates. */
export type Severity = "high" | "med" | "low" | "warn";

/** One finding of the freshness audit. */
export interface FreshnessIssue {
  type: IssueType;
  severity: Severity;
  category: string;
  /** Empty string for category-level issues. */
  skillName: string;
  /** Upstream name when applicable. */
  upstream?: string;
  message: string;
  /** Repo-relative file path when applicable. */
  file?: string;
  line?: number;
}

/** Latest-known upstream state (filled by P2 check; empty in P1). */
export interface UpstreamStatus {
  category: string;
  skillName: string;
  name: string;
  pinned: string;
  latest: string | null;
  publishedAt: string | null;
  releaseUrl: string | null;
}

/** Serialized to benchmarks/freshness/freshness-report.json. */
export interface FreshnessReport {
  generatedAt: string;
  action: "audit" | "check";
  staleDays: number;
  summary: {
    issueCount: number;
    bySeverity: Record<Severity, number>;
    byCategory: Record<string, number>;
  };
  issues: FreshnessIssue[];
  upstream: UpstreamStatus[];
  /** Present when the report was built with --telemetry. */
  telemetry?: {
    source: string;
    sessions: number;
    from: string | null;
    to: string | null;
    /** `category/skill` and `category (category)` → loads in the window. */
    loadsByTarget: Record<string, number>;
  };
}
