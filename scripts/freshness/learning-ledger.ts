// scripts/freshness/learning-ledger.ts
import fs from "fs-extra";
import path from "path";
import { ROOT_DIR } from "../evals/constants";
import { daysBetween } from "./audit";
import { LEARNING_LOG_PATH, parseLearningLog, readLearningLog, type LearningLogEntry } from "./signals/learning-log";
import { walkSkills } from "./skills";

export const VALID_CANDIDATE_STATUSES = [
  "proposed",
  "evaluating",
  "reviewed",
  "promoted",
  "rejected",
  "rolled-back",
] as const;

export type CandidateStatus = (typeof VALID_CANDIDATE_STATUSES)[number];

const VALID_STATUSES: Record<string, true> = {
  proposed: true,
  evaluating: true,
  reviewed: true,
  promoted: true,
  rejected: true,
  "rolled-back": true,
};
const PROTECTED_STATUSES: Record<string, true> = { proposed: true, rejected: true };
const UNRESOLVED_REF_RE = /^(?:pending|none|not-run|not-applicable|n\/a)(?:$|[\s;,.—–:-])/i;
const PLACEHOLDER_REF_RE = /^\[.*\]$/;

export interface CandidateOccurrence {
  iteration: number;
  date: string;
  status: string;
  line: number;
}

export interface LearningLedgerRow {
  candidate: string;
  status: string;
  improvement: string | null;
  prevention: string | null;
  verification: string | null;
  evaluation: string | null;
  review: string | null;
  firstDate: string;
  latestDate: string;
  ageDays: number | null;
  occurrences: CandidateOccurrence[];
}

export interface LearningLedgerSummary {
  totalEntries: number;
  legacyEntries: number;
  candidateEntries: number;
  candidateCount: number;
  byStatus: Record<string, number>;
  lackingMechanism: number;
  noEvaluation: number;
}

export interface LearningLedger {
  generatedAt: string;
  rows: LearningLedgerRow[];
  summary: LearningLedgerSummary;
}

export interface LearningCheckIssue {
  candidate: string;
  iteration: number;
  line: number;
  status: string;
  reason: string;
}

export interface LearningCheckResult {
  ok: boolean;
  issues: LearningCheckIssue[];
  ledger: LearningLedger;
}

export function isValidCandidateStatus(status: string): status is CandidateStatus {
  return Object.hasOwn(VALID_STATUSES, status);
}

/** Structural check only: rejects absent, empty, pending, none, or placeholder text. */
export function hasConcreteReference(value: string | undefined | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (UNRESOLVED_REF_RE.test(trimmed)) return false;
  return !PLACEHOLDER_REF_RE.test(trimmed);
}

function toLedgerRow(candidate: string, group: LearningLogEntry[], today: Date): LearningLedgerRow {
  const sorted = [...group].sort((a, b) => a.iteration - b.iteration || a.line - b.line);
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const ageDays = first.date ? daysBetween(first.date, today) : null;
  return {
    candidate,
    status: latest.status?.trim() ?? "",
    improvement: latest.improvement?.trim() || null,
    prevention: latest.prevention?.trim() || null,
    verification: latest.verification?.trim() || null,
    evaluation: latest.evaluation?.trim() || null,
    review: latest.review?.trim() || null,
    firstDate: first.date,
    latestDate: latest.date,
    ageDays: ageDays !== null && Number.isFinite(ageDays) ? ageDays : null,
    occurrences: sorted.map((e) => ({
      iteration: e.iteration,
      date: e.date,
      status: e.status?.trim() ?? "",
      line: e.line,
    })),
  };
}

function summarizeLedger(
  entries: LearningLogEntry[],
  rows: LearningLedgerRow[],
  legacyEntries: number,
  candidateEntries: number,
): LearningLedgerSummary {
  const byStatus: Record<string, number> = {};
  let lackingMechanism = 0;
  let noEvaluation = 0;
  for (const row of rows) {
    const key = row.status || "(missing)";
    byStatus[key] = (byStatus[key] ?? 0) + 1;
    if (!hasConcreteReference(row.prevention)) lackingMechanism += 1;
    if (!hasConcreteReference(row.evaluation)) noEvaluation += 1;
  }
  return {
    totalEntries: entries.length,
    legacyEntries,
    candidateEntries,
    candidateCount: rows.length,
    byStatus,
    lackingMechanism,
    noEvaluation,
  };
}

/** Builds a deduplicated candidate ledger (one row per candidate id, latest status). */
export function buildLearningLedger(entries: LearningLogEntry[], options: { today?: Date } = {}): LearningLedger {
  const today = options.today ?? new Date();
  const grouped = new Map<string, LearningLogEntry[]>();
  let legacyEntries = 0;
  let candidateEntries = 0;
  for (const entry of entries) {
    if (entry.candidate === undefined) {
      legacyEntries += 1;
      continue;
    }
    candidateEntries += 1;
    const list = grouped.get(entry.candidate);
    if (list) list.push(entry);
    else grouped.set(entry.candidate, [entry]);
  }
  const rows = [...grouped.entries()]
    .map(([candidate, group]) => toLedgerRow(candidate, group, today))
    .sort((a, b) => a.occurrences[0].iteration - b.occurrences[0].iteration || a.candidate.localeCompare(b.candidate));
  return {
    generatedAt: today.toISOString(),
    rows,
    summary: summarizeLedger(entries, rows, legacyEntries, candidateEntries),
  };
}

function checkEntryProofReferences(
  entry: LearningLogEntry,
  candidate: string,
  status: string,
  issues: LearningCheckIssue[],
): void {
  if (!isValidCandidateStatus(status) || Object.hasOwn(PROTECTED_STATUSES, status)) return;
  const label = candidate || "(empty)";
  if (!hasConcreteReference(entry.prevention)) {
    issues.push({
      candidate: label,
      iteration: entry.iteration,
      line: entry.line,
      status,
      reason: `status "${status}" requires a concrete Prevention mechanism`,
    });
  }
  if (!hasConcreteReference(entry.verification)) {
    issues.push({
      candidate: label,
      iteration: entry.iteration,
      line: entry.line,
      status,
      reason: `status "${status}" requires a non-pending Verification reference`,
    });
  }
  if (!hasConcreteReference(entry.review)) {
    issues.push({
      candidate: label,
      iteration: entry.iteration,
      line: entry.line,
      status,
      reason: `status "${status}" requires a non-pending Review reference`,
    });
  }
}

/**
 * Checks structural integrity of candidate entries per occurrence.
 * Legacy entries (no Candidate line) are skipped and never fail.
 * Structural reference presence does not authenticate human approval.
 */
export function checkLearningLedger(entries: LearningLogEntry[], options: { today?: Date } = {}): LearningCheckResult {
  const ledger = buildLearningLedger(entries, options);
  const issues: LearningCheckIssue[] = [];
  for (const entry of entries) {
    if (entry.candidate === undefined) continue;
    const candidate = entry.candidate.trim();
    if (!candidate) {
      issues.push({
        candidate: "(empty)",
        iteration: entry.iteration,
        line: entry.line,
        status: entry.status ?? "",
        reason: "Candidate id is empty",
      });
    }
    const status = entry.status?.trim() ?? "";
    if (!isValidCandidateStatus(status)) {
      issues.push({
        candidate: candidate || "(empty)",
        iteration: entry.iteration,
        line: entry.line,
        status,
        reason: `unknown status "${status || "(missing)"}" (expected one of: ${VALID_CANDIDATE_STATUSES.join(", ")})`,
      });
      continue;
    }
    checkEntryProofReferences(entry, candidate, status, issues);
  }
  return { ok: issues.length === 0, issues, ledger };
}

function truncate(value: string | null, max = 30): string {
  if (!value) return "-";
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function formatLedgerTable(ledger: LearningLedger): string {
  const { summary, rows } = ledger;
  const statusList = Object.entries(summary.byStatus)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  const lines = [
    `Learning Ledger (${summary.candidateCount} unique candidates from ${summary.candidateEntries} candidate entries, ${summary.legacyEntries} legacy entries, ${summary.totalEntries} total entries)`,
    `Statuses: ${statusList || "none"} | Lacking mechanism: ${summary.lackingMechanism} | No evaluation: ${summary.noEvaluation}`,
    "Note: reference fields indicate structural presence only, not human approval authentication.",
  ];
  if (rows.length === 0) return lines.join("\n");
  const headers = ["Candidate", "Status", "Mechanism", "Verification", "Review", "Age(d)", "Occurrences"];
  const tableRows = rows.map((r) => [
    r.candidate || "(empty)",
    r.status || "(missing)",
    truncate(r.prevention, 18),
    truncate(r.verification, 28),
    truncate(r.review, 28),
    r.ageDays === null ? "-" : String(r.ageDays),
    r.occurrences.map((o) => `#${o.iteration}`).join(","),
  ]);
  const widths = headers.map((h, i) => Math.max(h.length, ...tableRows.map((row) => row[i].length)));
  const renderRow = (cells: string[]): string => cells.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd();
  lines.push("", renderRow(headers), renderRow(widths.map((w) => "-".repeat(w))));
  for (const row of tableRows) lines.push(renderRow(row));
  return lines.join("\n");
}

function formatCheckText(result: LearningCheckResult): string {
  const { ledger, issues } = result;
  if (result.ok) {
    return `Learning check PASS: ${ledger.summary.candidateCount} candidate(s) across ${ledger.summary.candidateEntries} candidate entries (${ledger.summary.legacyEntries} legacy skipped). Structural integrity only; does not authenticate approval.`;
  }
  const lines = [`Learning check FAIL: ${issues.length} issue(s):`];
  for (const issue of issues) {
    lines.push(`  - ${issue.candidate} [${LEARNING_LOG_PATH}:${issue.line}, Iteration #${issue.iteration}]: ${issue.reason}`);
  }
  return lines.join("\n");
}

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  if (index + 1 >= argv.length) throw new Error(`${name} requires a value`);
  return argv[index + 1];
}

function loadKnownSkills(rootDir: string): Set<string> {
  const skillsDir = path.join(rootDir, "skills");
  if (!fs.existsSync(skillsDir)) return new Set();
  return new Set(walkSkills(skillsDir).map((s) => `${s.category}/${s.name}`));
}

export function run(argv: string[] = process.argv.slice(2), today: Date = new Date()): { exitCode: number; output: string } {
  const rootDir = path.resolve(flagValue(argv, "--root") ?? ROOT_DIR);
  const wantJson = argv.includes("--json");
  const isCheck = argv.includes("--check");
  const rawLog = readLearningLog(rootDir);
  const entries = rawLog ? parseLearningLog(rawLog, loadKnownSkills(rootDir)) : [];

  if (isCheck) {
    const result = checkLearningLedger(entries, { today });
    const output = wantJson
      ? JSON.stringify({ ok: result.ok, issues: result.issues, summary: result.ledger.summary }, null, 2)
      : formatCheckText(result);
    return { exitCode: result.ok ? 0 : 1, output };
  }

  const ledger = buildLearningLedger(entries, { today });
  return { exitCode: 0, output: wantJson ? JSON.stringify(ledger, null, 2) : formatLedgerTable(ledger) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  try {
    const { exitCode, output } = run();
    console.log(output);
    process.exitCode = exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
