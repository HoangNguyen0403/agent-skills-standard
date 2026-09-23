// scripts/metrics/benchmarks.ts
//
// SRS-002: Test-stage indicators from the two committed history files —
// `benchmarks/history.json` (skill-benchmark quality/token gate) and
// `benchmarks/evals/history.json` (eval pass-rate gate). Fails open: an absent
// or empty history file yields `unavailable` with the reason.

import { readJsonRecordSeries } from "./json-series";
import type { Metric, StageIndicatorRow } from "./types";

function trendAgainstPrevious(points: { value: number }[], unit: string, format: (v: number) => string): string {
  if (points.length < 2) return "n/a (only one history record)";
  const current = points[points.length - 1].value;
  const previous = points[points.length - 2].value;
  const delta = current - previous;
  if (delta === 0) return `flat at ${format(current)}${unit}`;
  const direction = delta > 0 ? "up" : "down";
  return `${direction} ${format(Math.abs(delta))}${unit} vs previous record (${format(previous)}${unit} to ${format(current)}${unit})`;
}

/** Lagging Test-stage indicator: eval pass rate with skill guidance, from `benchmarks/evals/history.json`. */
export function evalPassRateIndicator(root: string): StageIndicatorRow {
  const source = "benchmarks/evals/history.json (avgWithSkillPassRate field)";
  const points = readJsonRecordSeries(root, "benchmarks/evals/history.json", "avgWithSkillPassRate");
  let metric: Metric;
  if (!points) {
    metric = { available: false, reason: "no numeric history found at benchmarks/evals/history.json", source };
  } else {
    const latest = points[points.length - 1].value;
    metric = {
      available: true,
      value: `${(latest * 100).toFixed(1)}%`,
      trend: trendAgainstPrevious(points, " pts", (v) => (v * 100).toFixed(1)),
      source,
    };
  }
  return { stage: "Test", indicator: "eval pass rate with skill guidance", metric_result: metric };
}

/** Lagging Test-stage indicator: skill-benchmark structural quality score, from `benchmarks/history.json`. */
export function benchmarkQualityIndicator(root: string): StageIndicatorRow {
  const source = "benchmarks/history.json (avgQuality field)";
  const points = readJsonRecordSeries(root, "benchmarks/history.json", "avgQuality");
  let metric: Metric;
  if (!points) {
    metric = { available: false, reason: "no numeric history found at benchmarks/history.json", source };
  } else {
    const latest = points[points.length - 1].value;
    metric = {
      available: true,
      value: `${latest.toFixed(1)}/10`,
      trend: trendAgainstPrevious(points, "", (v) => v.toFixed(1)),
      source,
    };
  }
  return { stage: "Test", indicator: "skill-benchmark structural quality score", metric_result: metric };
}
