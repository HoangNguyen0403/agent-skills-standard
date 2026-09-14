// scripts/freshness/signals/evals.ts
import fs from "fs-extra";
import path from "path";
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
          !!i && typeof i.category === "string" && typeof i.skillName === "string" && typeof i.classification === "string",
      ),
    };
  } catch {
    return null;
  }
}

/**
 * One issue per (category, skill, classification). "outdated domain
 * expectation" is the eval runner's own stale-content verdict and is
 * reported at med; every other classification is a low "this skill is
 * weak" signal.
 */
export function evalSignalIssues(queue: RemediationQueueFile | null): FreshnessIssue[] {
  if (!queue) return [];
  const groups = new Map<string, { item: RemediationItem; cases: string[] }>();
  for (const item of queue.items) {
    const key = `${item.category}:${item.skillName}:${item.classification}`;
    const group = groups.get(key);
    if (group) group.cases.push(item.caseId);
    else groups.set(key, { item, cases: [item.caseId] });
  }
  const issues: FreshnessIssue[] = [];
  for (const { item, cases } of groups.values()) {
    const outdated = item.classification === OUTDATED;
    const shown = cases.slice(0, 3).join(", ") + (cases.length > 3 ? ", …" : "");
    issues.push({
      type: outdated ? "eval-outdated" : "eval-remediation",
      severity: outdated ? "med" : "low",
      category: item.category,
      skillName: item.skillName,
      message: `${cases.length} failing eval case(s) classified "${item.classification}" in run ${queue.runId} (${shown})`,
      file: REMEDIATION_QUEUE_PATH,
    });
  }
  return issues;
}
