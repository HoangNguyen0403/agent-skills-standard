// scripts/trace/index.ts
import path from "path";
import { buildTraceGraph, type TraceIssue } from "./graph";
import { hasNoRequirementSources, parseRepo } from "./parse";
import type { IdKind, SlugTrace } from "./types";

/** Machine assurance label: this audit verifies document links only. */
export const ASSURANCE = "document-links-only";

/** CLI misuse: the wrapper maps this to exit code 2, distinct from an audit failure. */
export class UsageError extends Error {}

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  if (index + 1 >= argv.length) throw new UsageError(`${name} requires a value`);
  return argv[index + 1];
}

/** Absent selector is `undefined`; a present but unusable selector is a usage error. */
function slugSelector(argv: string[]): string | undefined {
  const index = argv.indexOf("--slug");
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (value === undefined || value.length === 0) throw new UsageError("--slug requires a nonempty value");
  if (value.startsWith("-")) throw new UsageError(`--slug requires a value, got flag-shaped "${value}"`);
  return value;
}

function countByKind(trace: SlugTrace, kind: IdKind): number {
  return trace.declared.get(kind)?.size ?? 0;
}

/** Human labels. A linked criterion is a document reference, never delivery evidence. */
const DOCUMENT_LINK_LABEL = {
  Covered: "Document-linked",
  Partial: "Document-link gaps",
  Missing: "Unlinked",
} as const;

/** Per-AC status for the human coverage table: cheap, slug-scoped heuristic. */
function acStatuses(
  trace: SlugTrace,
  issues: TraceIssue[],
): Map<string, (typeof DOCUMENT_LINK_LABEL)[keyof typeof DOCUMENT_LINK_LABEL]> {
  const missing = new Set(issues.filter((i) => i.code === "orphan-ac" && i.slug === trace.slug).map((i) => i.id));
  const slugHasUpstreamGap = issues.some(
    (i) => i.slug === trace.slug && (i.code === "orphan-req" || i.code === "unlinked-req"),
  );
  const statuses = new Map<string, (typeof DOCUMENT_LINK_LABEL)[keyof typeof DOCUMENT_LINK_LABEL]>();
  for (const id of trace.declared.get("AC") ?? []) {
    if (missing.has(id)) statuses.set(id, DOCUMENT_LINK_LABEL.Missing);
    else statuses.set(id, slugHasUpstreamGap ? DOCUMENT_LINK_LABEL.Partial : DOCUMENT_LINK_LABEL.Covered);
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

/** Selection failure: the requested scope is missing, or carries no requirement declarations. */
function scopeIssue(code: "missing-scope" | "empty-scope", slug: string, message: string): TraceIssue {
  return { code, severity: "error", slug, message };
}

/**
 * CLI entry for `tsx scripts/trace/index.ts [--slug <slug>] [--required] [--json] [--strict] [--root <dir>]`.
 * Mints no ids; deterministically validates the BRD-OBJ -> REQ -> AC -> SRS
 * document-link chain per slug under `docs/brd/`, `docs/prd/`, `docs/srs/`.
 *
 * Scope: an explicit `--slug` must match discovered source files, and
 * `--required` additionally demands at least one declared REQ and AC in that
 * scope. Discovery without `--slug` stays fail-open when `docs/brd/` and
 * `docs/prd/` are both absent.
 *
 * Fail-closed: exits 1 whenever an error-severity issue is found (or any warn
 * issue under `--strict`). CLI misuse throws `UsageError`, which the wrapper
 * maps to exit 2. `ok` means "document links are consistent"; it never
 * claims implementation, execution, or approval.
 */
export function run(argv: string[] = process.argv.slice(2)): { exitCode: number; output: string } {
  const root = path.resolve(flagValue(argv, "--root") ?? ".");
  const slugFilter = slugSelector(argv);
  const json = argv.includes("--json");
  const strict = argv.includes("--strict");
  const required = argv.includes("--required");

  if (required && slugFilter === undefined) {
    throw new UsageError("--required requires a --slug <slug> selector");
  }

  if (slugFilter === undefined && hasNoRequirementSources(root)) {
    const message =
      "no requirement sources found: docs/brd/ and docs/prd/ are absent (not_applicable; no requirement sources; no release assurance; nothing to mint or audit yet)";
    const output = json
      ? JSON.stringify({
          ok: true,
          assurance_kind: "document_links",
          execution_evidence: "not_evaluated",
          assurance: ASSURANCE,
          requested_scope: null,
          required,
          slugs: [],
          issues: [],
        })
      : message;
    return { exitCode: 0, output };
  }

  const allSlugs = parseRepo(root);
  const slugs = slugFilter === undefined ? allSlugs : allSlugs.filter((s) => s.slug === slugFilter);
  // Build the graph over the whole repository first: `slug-file-mismatch` needs
  // sibling slugs, so filtering before construction would lose cross-slug checks.
  const allIssues = buildTraceGraph(allSlugs);
  const issues = slugFilter === undefined ? allIssues : allIssues.filter((i) => i.slug === slugFilter);

  if (slugFilter !== undefined) {
    const [selected] = slugs;
    if (selected === undefined) {
      issues.unshift(
        scopeIssue(
          "missing-scope",
          slugFilter,
          `--slug "${slugFilter}" matched no brd/prd/srs source file under this root; requested scope cannot pass on no evidence`,
        ),
      );
    } else if (required) {
      const missing = (["REQ", "AC"] as const).filter((kind) => (selected.declared.get(kind)?.size ?? 0) === 0);
      if (missing.length > 0) {
        issues.unshift(
          scopeIssue(
            "empty-scope",
            slugFilter,
            `--required scope "${slugFilter}" declares no ${missing.join(" and no ")}; document links cannot pass an empty requirement scope`,
          ),
        );
      }
    }
  }

  const hasError = issues.some((i) => i.severity === "error");
  const hasWarn = issues.some((i) => i.severity === "warn");
  const ok = !hasError && !(strict && hasWarn);

  if (json) {
    return {
      exitCode: ok ? 0 : 1,
      output: JSON.stringify({
        ok,
        assurance_kind: "document_links",
        execution_evidence: "not_evaluated",
        assurance: ASSURANCE,
        requested_scope: slugFilter ?? null,
        required,
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

  const output = `${renderCoverageTable(slugs, issues)}\n${renderIssues(issues)}\n\nAssurance: ${ASSURANCE} — document references only; implementation, execution, and approval are not verified.`;
  return { exitCode: ok ? 0 : 1, output };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  try {
    const { exitCode, output } = run();
    console.log(output);
    process.exitCode = exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = error instanceof UsageError ? 2 : 1;
  }
}
