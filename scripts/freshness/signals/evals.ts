// scripts/freshness/signals/evals.ts
import fs from "fs-extra";
import path from "path";
import { daysBetween } from "../audit";
import type { FreshnessIssue } from "../types";

/** One failed-assertion triage row from scripts/evals/quality.ts `queue`. */
export interface RemediationItem {
  category: string;
  skillName: string;
  caseId: string;
  arm: string;
  classification: string;
  evidence: string;
}

/** Shape of benchmarks/evals/remediation-queue.json. */
export interface RemediationQueueFile {
  runId: string;
  generatedAt: string;
  scope?: string;
  items: RemediationItem[];
}

/** Repo-relative path of the queue file. */
export const REMEDIATION_QUEUE_PATH = "benchmarks/evals/remediation-queue.json";

const OUTDATED = "outdated domain expectation";

/**
 * Reads the last remediation queue. Returns null when the file is absent
 * or not a valid queue, so the signal is simply empty on a fresh clone.
 */
export function readRemediationQueue(repoRoot: string): RemediationQueueFile | null {
  const file = path.join(repoRoot, REMEDIATION_QUEUE_PATH);
  if (!fs.existsSync(file)) return null;
  try {
    const data = fs.readJsonSync(file) as Partial<RemediationQueueFile>;
    if (!data || typeof data.runId !== "string" || !Array.isArray(data.items)) return null;
    return {
      runId: data.runId,
      generatedAt: typeof data.generatedAt === "string" ? data.generatedAt : "",
      scope: data.scope,
      items: data.items.filter(
        (i): i is RemediationItem =>
          !!i &&
          typeof i.category === "string" &&
          typeof i.skillName === "string" &&
          typeof i.classification === "string" &&
          typeof i.caseId === "string",
      ),
    };
  } catch {
    return null;
  }
}

/** Options for {@link evalSignalIssues}. */
export interface EvalSignalOptions {
  today: Date;
  /** Queues generated more than this many days ago are ignored. */
  windowDays: number;
}

/**
 * One `eval-remediation` (low) per skill summarising every failing
 * classification, plus one `eval-outdated` (med) per skill when the run
 * classified any case as "outdated domain expectation" (reserved: the
 * current classifier in scripts/evals/quality.ts never emits it). Queues
 * older than the window are ignored; case ids are deduped so a case with
 * several failed assertions counts once.
 */
export function evalSignalIssues(queue: RemediationQueueFile | null, options: EvalSignalOptions): FreshnessIssue[] {
  if (!queue) return [];
  const runDate = queue.generatedAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(runDate) || daysBetween(runDate, options.today) > options.windowDays) return [];
  const bySkill = new Map<string, { category: string; skillName: string; byClass: Map<string, Set<string>> }>();
  for (const item of queue.items) {
    const key = `${item.category}/${item.skillName}`;
    const entry = bySkill.get(key) ?? { category: item.category, skillName: item.skillName, byClass: new Map() };
    const cases = entry.byClass.get(item.classification) ?? new Set<string>();
    cases.add(item.caseId);
    entry.byClass.set(item.classification, cases);
    bySkill.set(key, entry);
  }
  const issues: FreshnessIssue[] = [];
  for (const { category, skillName, byClass } of bySkill.values()) {
    const outdatedCases = byClass.get(OUTDATED);
    if (outdatedCases && outdatedCases.size > 0) {
      issues.push({
        type: "eval-outdated",
        severity: "med",
        category,
        skillName,
        message: `${outdatedCases.size} eval case(s) classified "${OUTDATED}" in run ${queue.runId} (${runDate}): ${[...outdatedCases].slice(0, 3).join(", ")}`,
        file: REMEDIATION_QUEUE_PATH,
      });
    }
    const others = [...byClass.entries()].filter(([c]) => c !== OUTDATED);
    if (others.length === 0) continue;
    const total = new Set(others.flatMap(([, cases]) => [...cases])).size;
    const breakdown = others.map(([c, cases]) => `${c}×${cases.size}`).join("; ");
    issues.push({
      type: "eval-remediation",
      severity: "low",
      category,
      skillName,
      message: `${total} failing eval case(s) in run ${queue.runId} (${runDate}): ${breakdown}`,
      file: REMEDIATION_QUEUE_PATH,
    });
  }
  return issues;
}
