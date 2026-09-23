// Regression gate: applies readiness.ts thresholds to a scored run and
// reports pass/breach direction against the last recorded history baseline
// for the same category. See docs/EVALS.md "Regression gate" for the
// end-to-end contract and why the frozen absolute promotion snapshot in
// benchmarks/evals/history.json is not itself the gate target.
import fs from "fs-extra";
import * as path from "node:path";
import { RESULTS_FILENAME } from "./constants";
import { evaluateSkillReadiness } from "./readiness";
import type { EvalsHistory, EvalsHistoryRecord, RunResults } from "./types";

export interface GateSkillBreach {
  category: string;
  skillName: string;
  failures: string[];
}

export type GateTrendDirection =
  | "improved"
  | "regressed"
  | "unchanged"
  | "no-prior-data";

export interface GateTrend {
  metric: "avgWithSkillPassRate";
  previousRunId: string | null;
  previousValue: number | null;
  currentValue: number;
  direction: GateTrendDirection;
}

export interface GateRunOutcome {
  runId: string;
  category: string;
  ready: boolean;
  skillCount: number;
  breachedCount: number;
  breaches: GateSkillBreach[];
  trend: GateTrend;
}

export interface GateReport {
  ok: boolean;
  message: string;
  runs: GateRunOutcome[];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Most recent history record for `category`, strictly before `beforeDate`, excluding `excludeRunId`. */
export function findPreviousHistoryRecord(
  history: EvalsHistory,
  category: string,
  excludeRunId: string,
  beforeDate?: string,
): EvalsHistoryRecord | null {
  const candidates = history.records
    .filter(
      (record) =>
        record.runId !== excludeRunId &&
        record.category === category &&
        (beforeDate ? record.date < beforeDate : true),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return candidates[0] ?? null;
}

/** Apply readiness thresholds to one scored run's results.json and diff against prior history. */
export function gateResults(
  results: RunResults,
  history: EvalsHistory,
): GateRunOutcome {
  const breaches: GateSkillBreach[] = [];
  for (const skill of results.skills) {
    const compromised =
      results.compromisedSkills?.some(
        (record) =>
          record.category === skill.category &&
          record.skillName === skill.skillName &&
          record.arm === "baseline",
      ) ?? false;
    const readiness = evaluateSkillReadiness(skill, { compromised });
    if (!readiness.ready) {
      breaches.push({
        category: skill.category,
        skillName: skill.skillName,
        failures: readiness.failures,
      });
    }
  }
  const currentValue = average(results.skills.map((s) => s.withSkillPassRate));
  const previous = findPreviousHistoryRecord(
    history,
    results.category,
    results.runId,
    results.scoredAt,
  );
  const trend: GateTrend = previous
    ? {
        metric: "avgWithSkillPassRate",
        previousRunId: previous.runId,
        previousValue: previous.avgWithSkillPassRate,
        currentValue,
        direction:
          currentValue > previous.avgWithSkillPassRate + 1e-9
            ? "improved"
            : currentValue < previous.avgWithSkillPassRate - 1e-9
              ? "regressed"
              : "unchanged",
      }
    : {
        metric: "avgWithSkillPassRate",
        previousRunId: null,
        previousValue: null,
        currentValue,
        direction: "no-prior-data",
      };
  return {
    runId: results.runId,
    category: results.category,
    ready: breaches.length === 0,
    skillCount: results.skills.length,
    breachedCount: breaches.length,
    breaches,
    trend,
  };
}

/** Physical run directories with a results.json that history.json has not already recorded. */
export function pendingGateRunIds(
  runsDir: string,
  history: EvalsHistory,
): string[] {
  if (!fs.existsSync(runsDir)) return [];
  const historyRunIds = new Set(history.records.map((record) => record.runId));
  return fs
    .readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((runId) => {
      if (historyRunIds.has(runId)) return false;
      return fs.existsSync(path.join(runsDir, runId, RESULTS_FILENAME));
    })
    .sort();
}

export function loadResults(runsDir: string, runId: string): RunResults | null {
  const resultsPath = path.join(runsDir, runId, RESULTS_FILENAME);
  if (!fs.existsSync(resultsPath)) return null;
  return fs.readJSONSync(resultsPath) as RunResults;
}

/**
 * Gate every pending run (a scored run not yet recorded in history.json).
 * A canonical/promoted run already present in history is not re-gated here;
 * it was already reviewed through `evals:promote`. Nothing pending is a
 * pass, not a failure, so CI can wire this in immediately.
 */
export function gateAll(
  runsDir: string,
  history: EvalsHistory,
): GateReport {
  const pending = pendingGateRunIds(runsDir, history);
  if (pending.length === 0) {
    return {
      ok: true,
      message:
        "No scored run available to gate: every run under benchmarks/evals/runs is already recorded in history.json.",
      runs: [],
    };
  }
  const runs = pending.map((runId) => {
    const results = loadResults(runsDir, runId);
    if (!results) {
      throw new Error(`Expected results.json for pending run ${runId}`);
    }
    return gateResults(results, history);
  });
  return {
    ok: runs.every((run) => run.ready),
    message: `Gated ${runs.length} pending run(s).`,
    runs,
  };
}

/** Gate one explicit run id. Missing results.json is reported as nothing to gate, not an error. */
export function gateOne(
  runsDir: string,
  runId: string,
  history: EvalsHistory,
): GateReport {
  const results = loadResults(runsDir, runId);
  if (!results) {
    return {
      ok: true,
      message: `No scored run available: ${runId} has no results.json.`,
      runs: [],
    };
  }
  const outcome = gateResults(results, history);
  return {
    ok: outcome.ready,
    message: `Gated ${runId}.`,
    runs: [outcome],
  };
}
