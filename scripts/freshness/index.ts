// scripts/freshness/index.ts
import fs from "fs-extra";
import path from "path";
import { ROOT_DIR } from "../evals/constants";
import { auditFreshness } from "./audit";
import { checkUpstream } from "./check";
import { effectivePins, loadCategoryPins } from "./pins";
import { buildReport, renderMarkdown } from "./report";
import { evalSignalIssues, readRemediationQueue } from "./signals/evals";
import { learningLogIssues, parseLearningLog, readLearningLog } from "./signals/learning-log";
import { walkSkills } from "./skills";
import { GithubSource } from "./sources";
import type { EffectivePin, FreshnessIssue, FreshnessReport } from "./types";

/** Output directory for freshness reports (gitignored). */
export const FRESHNESS_DIR = path.join(ROOT_DIR, "benchmarks", "freshness");
/** JSON report path. */
export const FRESHNESS_JSON = path.join(FRESHNESS_DIR, "freshness-report.json");
/** Markdown report path. */
export const FRESHNESS_MD = path.join(FRESHNESS_DIR, "freshness-report.md");

const DEFAULT_STALE_DAYS = 120;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_WINDOW_DAYS = 90;

function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  if (index + 1 >= process.argv.length) {
    throw new Error(`${name} requires a value`);
  }
  return process.argv[index + 1];
}

function positiveNumberFlag(name: string, fallback: number): number {
  const value = Number(flagValue(name) ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return value;
}

function writeReport(report: FreshnessReport): void {
  fs.ensureDirSync(FRESHNESS_DIR);
  fs.writeJSONSync(FRESHNESS_JSON, report, { spaces: 2 });
  fs.writeFileSync(FRESHNESS_MD, renderMarkdown(report));
}

function printIssues(report: FreshnessReport, label: string, suffix: string): void {
  const s = report.summary.bySeverity;
  console.log(
    `${label}: ${report.summary.issueCount} issues (high ${s.high}, med ${s.med}, low ${s.low}, warn ${s.warn})${suffix}`,
  );
  for (const issue of report.issues) {
    const loc = issue.file ? ` [${issue.file}${issue.line ? `:${issue.line}` : ""}]` : "";
    console.log(
      `  ${issue.severity.padEnd(4)} ${issue.type.padEnd(20)} ${issue.category}/${issue.skillName || "-"}${loc}: ${issue.message}`,
    );
  }
}

/** Issues that block `audit --strict`: missing pins and non-historical claim mismatches. */
export function isStrictBlocking(issue: FreshnessIssue): boolean {
  if (issue.type === "missing-pin") return true;
  return issue.type.startsWith("claim-") && issue.severity !== "low";
}

/** Effective pins for every skill in the repo (category ∪ skill), flattened. */
function collectPins(): EffectivePin[] {
  const skillsDir = path.join(ROOT_DIR, "skills");
  const categoryPins = loadCategoryPins(path.join(skillsDir, "metadata.json"));
  return walkSkills(skillsDir).flatMap((skill) => effectivePins(skill, categoryPins));
}

/**
 * Eval-queue and learning-log issues; empty when the files are absent.
 * Never throws: any parsing/IO failure becomes a single `fetch-failed`
 * (warn) issue instead of aborting the audit or check run.
 */
function internalSignals(windowDays: number): FreshnessIssue[] {
  try {
    const today = new Date();
    const evals = evalSignalIssues(readRemediationQueue(ROOT_DIR), { today, windowDays });
    const log = readLearningLog(ROOT_DIR);
    if (!log) return evals;
    const known = new Set(walkSkills(path.join(ROOT_DIR, "skills")).map((s) => `${s.category}/${s.name}`));
    const entries = parseLearningLog(log, known, (id, line) => {
      console.error(`  warn AGENTS_LEARNING.md:${line}: unknown skill id "${id}" in **Skills** line ignored`);
    });
    return [...evals, ...learningLogIssues(entries, { today, windowDays })];
  } catch (error) {
    return [{
      type: "fetch-failed",
      severity: "warn",
      category: "internal",
      skillName: "",
      message: `Internal signals skipped: ${error instanceof Error ? error.message : String(error)}`,
    }];
  }
}

/**
 * CLI entry. Actions:
 * - `audit` (default): offline rules; prints a summary; `--write` saves the
 *   report; `--strict` exits 1 on any missing-pin or non-low claim-* issue.
 * - `check`: offline rules plus the GitHub upstream check; always writes
 *   the report; exits 1 on any high issue. Reads GITHUB_TOKEN when set.
 * - `report`: re-renders Markdown from the last JSON report.
 * Flags: `--stale-days <n>` (default 120), `--concurrency <n>` (check, default 5),
 * `--internal` (adds eval-queue and learning-log signals), `--window-days <n>`
 * (default 90; bounds the learning-log window).
 */
export async function main(): Promise<void> {
  const action = process.argv[2] ?? "audit";
  const staleDays = positiveNumberFlag("--stale-days", DEFAULT_STALE_DAYS);
  const internal = process.argv.includes("--internal");
  const windowDays = positiveNumberFlag("--window-days", DEFAULT_WINDOW_DAYS);

  if (action === "audit") {
    const issues = [...auditFreshness(ROOT_DIR, { staleDays }), ...(internal ? internalSignals(windowDays) : [])];
    const report = buildReport("audit", staleDays, issues, []);
    const write = process.argv.includes("--write");
    if (write) writeReport(report);
    printIssues(report, "Freshness audit", write ? ` → ${FRESHNESS_JSON}` : "");
    const blocking = issues.filter(isStrictBlocking);
    if (process.argv.includes("--strict") && blocking.length > 0) {
      console.error(`Strict mode: ${blocking.length} blocking issue(s)`);
      process.exitCode = 1;
    }
    return;
  }

  if (action === "check") {
    const concurrency = positiveNumberFlag("--concurrency", DEFAULT_CONCURRENCY);
    const offline = auditFreshness(ROOT_DIR, { staleDays });
    const signals = internal ? internalSignals(windowDays) : [];
    const github = new GithubSource({ token: process.env.GITHUB_TOKEN || undefined });
    const { issues: drift, upstream } = await checkUpstream(collectPins(), github, { concurrency });
    const report = buildReport(
      "check",
      staleDays,
      [...offline, ...drift, ...signals],
      upstream,
    );
    writeReport(report);
    printIssues(report, "Freshness check", ` → ${FRESHNESS_JSON}`);
    if (!process.env.GITHUB_TOKEN) {
      console.log("  (no GITHUB_TOKEN set; unauthenticated GitHub API limit is 60 requests/hour)");
    }
    if (report.summary.bySeverity.high > 0) {
      console.error(`${report.summary.bySeverity.high} high-severity upstream drift issue(s)`);
      process.exitCode = 1;
    }
    return;
  }

  if (action === "report") {
    if (!fs.existsSync(FRESHNESS_JSON)) {
      throw new Error(`No report at ${FRESHNESS_JSON}; run "freshness:audit --write" or "freshness:check" first`);
    }
    const report = fs.readJSONSync(FRESHNESS_JSON) as FreshnessReport;
    fs.writeFileSync(FRESHNESS_MD, renderMarkdown(report));
    console.log(`Freshness report rendered → ${FRESHNESS_MD}`);
    return;
  }

  throw new Error(`Unknown action: ${action}; use audit, check, or report`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
