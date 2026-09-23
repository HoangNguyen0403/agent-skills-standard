// scripts/metrics/runs.ts
//
// REQ-001/SRS-002: reads `artifacts/runs/<slug>/*.json` run records (schema from
// `scripts/outcome/schema.ts`, imported and never edited here). A malformed record
// is reported and skipped, never thrown (AC contract: "a malformed run record is
// reported without crashing the run"). An absent `artifacts/runs/` directory yields
// an unavailable Build-stage indicator, never a guessed zero.

import fs from "fs";
import path from "path";
import { validateRunRecord, type RunRecord } from "../outcome/schema";
import type { Metric, StageIndicatorRow } from "./types";

export interface MalformedRunRecord {
  file: string;
  problems: string[];
}

export interface RunRecordsResult {
  records: { file: string; record: RunRecord }[];
  malformed: MalformedRunRecord[];
}

function listJsonFiles(dir: string): string[] {
  const files: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(entryPath);
      else if (entry.isFile() && entry.name.endsWith(".json")) files.push(entryPath);
    }
  }
  return files;
}

/** Reads every run record under `<root>/artifacts/runs/`. `[]`-shaped when the directory is absent. */
export function readRunRecords(root: string): RunRecordsResult {
  const runsDir = path.join(root, "artifacts", "runs");
  if (!fs.existsSync(runsDir)) return { records: [], malformed: [] };

  const records: { file: string; record: RunRecord }[] = [];
  const malformed: MalformedRunRecord[] = [];
  for (const file of listJsonFiles(runsDir)) {
    const relPath = path.relative(root, file);
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      malformed.push({ file: relPath, problems: [`failed to parse JSON: ${(error as Error).message}`] });
      continue;
    }
    const issues = validateRunRecord(parsed, relPath);
    const errors = issues.filter((i) => i.severity === "error");
    if (errors.length > 0) {
      malformed.push({ file: relPath, problems: errors.map((i) => i.message) });
      continue;
    }
    records.push({ file: relPath, record: parsed as RunRecord });
  }
  return { records, malformed };
}

const TERMINAL_STATUSES: Record<string, true> = { implemented: true, verified: true, released: true };

/** Build-stage lagging indicator: share of `implement-feature` runs that reached a terminal `feature_status`. */
export function buildStageIndicator(result: RunRecordsResult): StageIndicatorRow {
  const source = "artifacts/runs/<slug>/*.json (`feature_status`, `workflow`)";
  const implementRuns = result.records.filter((r) => r.record.workflow === "implement-feature");
  let metric: Metric;
  if (result.records.length === 0) {
    metric = { available: false, reason: "no run records found under artifacts/runs/", source };
  } else if (implementRuns.length === 0) {
    metric = { available: false, reason: "run records exist, but none for workflow \"implement-feature\"", source };
  } else {
    const terminal = implementRuns.filter((r) => TERMINAL_STATUSES[r.record.feature_status]).length;
    metric = {
      available: true,
      value: `${terminal}/${implementRuns.length} implement-feature runs reached a terminal status`,
      trend: "n/a (single-period derivation; no comparable prior-period run set persisted)",
      source,
    };
  }
  return { stage: "Build", indicator: "plan adherence (run-record completion)", metric_result: metric };
}
