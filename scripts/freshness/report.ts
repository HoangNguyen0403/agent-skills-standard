// scripts/freshness/report.ts
import type {
  FreshnessIssue,
  FreshnessReport,
  IssueType,
  Severity,
  UpstreamStatus,
} from "./types";

const SEVERITY_ORDER: Severity[] = ["high", "med", "low", "warn"];

const SEVERITY_WEIGHT: Record<Severity, number> = { high: 3, med: 2, low: 1, warn: 0 };

/** A skill (or category) ranked by the weighted sum of its issues. */
export interface ScoredTarget {
  /** `category/skill`, or `category` for category-level issues. */
  target: string;
  score: number;
  counts: Partial<Record<IssueType, number>>;
  /** Loads in the telemetry window, when known. */
  loads?: number;
}

/**
 * Ranks targets by severity weight (high 3, med 2, low 1). Warn-only
 * targets are dropped. Ties break on loads (when known), then target
 * name so output is stable.
 */
export function scoreTargets(issues: FreshnessIssue[], limit = 10, loads?: Record<string, number>): ScoredTarget[] {
  const byTarget = new Map<string, ScoredTarget>();
  for (const issue of issues) {
    const target = issue.skillName ? `${issue.category}/${issue.skillName}` : `${issue.category} (category)`;
    const entry = byTarget.get(target) ?? { target, score: 0, counts: {} };
    entry.score += SEVERITY_WEIGHT[issue.severity];
    entry.counts[issue.type] = (entry.counts[issue.type] ?? 0) + 1;
    byTarget.set(target, entry);
  }
  if (loads) for (const t of byTarget.values()) t.loads = loads[t.target] ?? 0;
  return [...byTarget.values()]
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score || (b.loads ?? 0) - (a.loads ?? 0) || a.target.localeCompare(b.target))
    .slice(0, limit);
}

/**
 * Escapes a value for a Markdown table cell: backslashes first (so an
 * escaped pipe is never re-interpreted as a literal backslash followed by
 * an unescaped pipe), then pipes, then collapses newlines.
 */
function escapeTableCell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/** Assembles the JSON report with severity and category counts. */
export function buildReport(
  action: "audit" | "check",
  staleDays: number,
  issues: FreshnessIssue[],
  upstream: UpstreamStatus[],
  generatedAt: string = new Date().toISOString(),
  telemetry?: FreshnessReport["telemetry"],
): FreshnessReport {
  const bySeverity: Record<Severity, number> = { high: 0, med: 0, low: 0, warn: 0 };
  const byCategory: Record<string, number> = {};
  for (const issue of issues) {
    bySeverity[issue.severity] += 1;
    byCategory[issue.category] = (byCategory[issue.category] ?? 0) + 1;
  }
  const sorted = [...issues].sort(
    (a, b) =>
      a.category.localeCompare(b.category) ||
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
      a.skillName.localeCompare(b.skillName),
  );
  return {
    generatedAt,
    action,
    staleDays,
    summary: { issueCount: issues.length, bySeverity, byCategory },
    issues: sorted,
    upstream,
    ...(telemetry ? { telemetry } : {}),
  };
}

/** Renders the Markdown twin of the JSON report (also used as CI step summary). */
export function renderMarkdown(report: FreshnessReport): string {
  const lines: string[] = [];
  lines.push("# Skill Freshness Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt} · action: \`${report.action}\` · stale after ${report.staleDays} days`);
  if (report.telemetry) {
    lines.push(`Telemetry: ${report.telemetry.sessions} sessions (${report.telemetry.from ?? "?"} → ${report.telemetry.to ?? "?"}), ${report.telemetry.noMatchCalls} no-match calls, from ${report.telemetry.source}`);
  }
  lines.push("");
  lines.push("| severity | count |");
  lines.push("|---|---|");
  for (const sev of SEVERITY_ORDER) lines.push(`| ${sev} | ${report.summary.bySeverity[sev]} |`);
  lines.push("");

  const top = scoreTargets(report.issues, 10, report.telemetry?.loadsByTarget);
  if (top.length > 0) {
    lines.push("## Improve next");
    lines.push("");
    if (report.telemetry) {
      lines.push("| # | target | score | loads | signals |");
      lines.push("|---|---|---|---|---|");
    } else {
      lines.push("| # | target | score | signals |");
      lines.push("|---|---|---|---|");
    }
    top.forEach((t, i) => {
      const signals = Object.entries(t.counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([type, n]) => `${type}×${n}`)
        .join(", ");
      if (report.telemetry) {
        lines.push(`| ${i + 1} | ${t.target} | ${t.score} | ${t.loads ?? 0} | ${signals} |`);
      } else {
        lines.push(`| ${i + 1} | ${t.target} | ${t.score} | ${signals} |`);
      }
    });
    const all = scoreTargets(report.issues, Number.MAX_SAFE_INTEGER, report.telemetry?.loadsByTarget);
    const hiddenOnes = all.slice(top.length).filter((t) => t.score === 1).length;
    if (hiddenOnes > 0) lines.push(`_+${hiddenOnes} more target(s) at score 1_`);
    lines.push("");
  }

  if (report.issues.length === 0) {
    lines.push("No freshness issues.");
  } else {
    const categories = Object.keys(report.summary.byCategory).sort();
    for (const category of categories) {
      lines.push(`## ${category}`);
      lines.push("");
      lines.push("| severity | type | skill | upstream | message | location |");
      lines.push("|---|---|---|---|---|---|");
      for (const issue of report.issues.filter((i) => i.category === category)) {
        const location = issue.file ? `\`${issue.file}${issue.line ? `:${issue.line}` : ""}\`` : "";
        lines.push(
          `| ${issue.severity} | ${issue.type} | ${issue.skillName || "(category)"} | ${issue.upstream ?? ""} | ${escapeTableCell(issue.message)} | ${location} |`,
        );
      }
      lines.push("");
    }
  }

  lines.push("## Upstream");
  lines.push("");
  if (report.upstream.length === 0) {
    lines.push("No upstream versions fetched (run `freshness:check` for live data).");
  } else {
    lines.push("| category | skill | upstream | pinned | latest | published | release |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const u of report.upstream) {
      lines.push(
        `| ${u.category} | ${u.skillName || "(category)"} | ${u.name} | ${u.pinned} | ${u.latest ?? "?"} | ${u.publishedAt ?? ""} | ${u.releaseUrl ? `[link](${u.releaseUrl})` : ""} |`,
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}
