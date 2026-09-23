// scripts/trace/index.ts
import path from "path";
import { buildTraceGraph, type TraceIssue } from "./graph";
import { hasNoRequirementSources, parseRepo } from "./parse";
import type { IdKind, SlugTrace } from "./types";

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  if (index + 1 >= argv.length) throw new Error(`${name} requires a value`);
  return argv[index + 1];
}

function countByKind(trace: SlugTrace, kind: IdKind): number {
  return trace.declared.get(kind)?.size ?? 0;
}

/** Per-AC status for the human coverage table: cheap, slug-scoped heuristic (not asserted by tests). */
function acStatuses(trace: SlugTrace, issues: TraceIssue[]): Map<string, "Covered" | "Partial" | "Missing"> {
  const missing = new Set(issues.filter((i) => i.code === "orphan-ac" && i.slug === trace.slug).map((i) => i.id));
  const slugHasUpstreamGap = issues.some(
    (i) => i.slug === trace.slug && (i.code === "orphan-req" || i.code === "unlinked-req"),
  );
  const statuses = new Map<string, "Covered" | "Partial" | "Missing">();
  for (const id of trace.declared.get("AC") ?? []) {
    if (missing.has(id)) statuses.set(id, "Missing");
    else statuses.set(id, slugHasUpstreamGap ? "Partial" : "Covered");
  }
  return statuses;
}

function renderCoverageTable(slugs: SlugTrace[], issues: TraceIssue[]): string {
  const lines: string[] = [];
  for (const trace of slugs) {
    lines.push(`\n## ${trace.slug}`);
    lines.push(
      `  BRD-OBJ: ${countByKind(trace, "BRD-OBJ")}  REQ: ${countByKind(trace, "REQ")}  AC: ${countByKind(trace, "AC")}  SRS: ${countByKind(trace, "SRS")}`,
    );
    const statuses = acStatuses(trace, issues);
    for (const [id, status] of [...statuses.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`  ${id.padEnd(10)} ${status}`);
    }
  }
  return lines.join("\n");
}

function renderIssues(issues: TraceIssue[]): string {
  if (issues.length === 0) return "\nNo issues found.";
  const lines = ["\n## Issues"];
  for (const iss of issues) {
    const loc = iss.file ? ` [${iss.file}${iss.line ? `:${iss.line}` : ""}]` : "";
    lines.push(`  ${iss.severity.padEnd(5)} ${iss.code.padEnd(20)} ${iss.slug}${loc}: ${iss.message}`);
  }
  return lines.join("\n");
}

/**
 * CLI entry for `tsx scripts/trace/index.ts [--slug <slug>] [--json] [--strict] [--root <dir>]`.
 * Mints no ids; deterministically validates the BRD-OBJ -> REQ -> AC -> SRS
 * chain per slug under `docs/brd/`, `docs/prd/`, `docs/srs/`.
 * Fail-open: exits 0 with an explanation when `docs/brd/` and `docs/prd/`
 * are both absent. Fail-closed: exits 1 whenever an error-severity issue is
 * found (or any warn issue under `--strict`).
 */
export function run(argv: string[] = process.argv.slice(2)): { exitCode: number; output: string } {
  const root = path.resolve(flagValue(argv, "--root") ?? ".");
  const slugFilter = flagValue(argv, "--slug");
  const json = argv.includes("--json");
  const strict = argv.includes("--strict");

  if (hasNoRequirementSources(root)) {
    const message = "no requirement sources found: docs/brd/ and docs/prd/ are absent (nothing to mint or audit yet)";
    const output = json ? JSON.stringify({ ok: true, slugs: [], issues: [] }) : message;
    return { exitCode: 0, output };
  }

  const allSlugs = parseRepo(root);
  const slugs = slugFilter ? allSlugs.filter((s) => s.slug === slugFilter) : allSlugs;
  const allIssues = buildTraceGraph(allSlugs);
  const issues = slugFilter ? allIssues.filter((i) => i.slug === slugFilter) : allIssues;

  const hasError = issues.some((i) => i.severity === "error");
  const hasWarn = issues.some((i) => i.severity === "warn");
  const ok = !hasError && !(strict && hasWarn);

  if (json) {
    return {
      exitCode: ok ? 0 : 1,
      output: JSON.stringify({
        ok,
        slugs: slugs.map((s) => s.slug),
        issues: issues.map((i) => ({
          code: i.code,
          severity: i.severity,
          slug: i.slug,
          id: i.id,
          file: i.file,
          line: i.line,
          message: i.message,
        })),
      }),
    };
  }

  const output = `${renderCoverageTable(slugs, issues)}\n${renderIssues(issues)}`;
  return { exitCode: ok ? 0 : 1, output };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const { exitCode, output } = run();
  console.log(output);
  process.exitCode = exitCode;
}
