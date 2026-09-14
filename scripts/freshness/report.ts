// scripts/freshness/report.ts
import type {
  FreshnessIssue,
  FreshnessReport,
  Severity,
  UpstreamStatus,
} from "./types";

const SEVERITY_ORDER: Severity[] = ["high", "med", "low", "warn"];

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
  };
}

/** Renders the Markdown twin of the JSON report (also used as CI step summary). */
export function renderMarkdown(report: FreshnessReport): string {
  const lines: string[] = [];
  lines.push("# Skill Freshness Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt} · action: \`${report.action}\` · stale after ${report.staleDays} days`);
  lines.push("");
  lines.push("| severity | count |");
  lines.push("|---|---|");
  for (const sev of SEVERITY_ORDER) lines.push(`| ${sev} | ${report.summary.bySeverity[sev]} |`);
  lines.push("");

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
