// scripts/metrics/bands.ts
//
// REQ-003 / SRS-003: load `docs/ops/bands.yaml` (schema: common-sdlc-metrics
// `references/bands-template.yaml`), resolve each band's declared `source` to a
// numeric series, and detect a breach deterministically before anything
// interprets the signal. A band absent entirely is not an error — the file is
// optional. A band present but missing an owner IS a config error (SKILL
// anti-pattern: "no band with no owner") and is surfaced, never silently accepted.
//
// Two `rules` are supported, matching what `docs/ops/bands.yaml` actually declares:
//   - "fixed_gate_threshold": a bespoke deterministic script already gates this
//     metric (`scripts/benchmark/gate.ts`, imported read-only here, never edited).
//     Baseline "rolling_release" means "vs. the most recent different-version
//     history record" (`findPreviousGateRecord`), not a sigma baseline.
//   - "western_electric" (default): the SPC ladder in `spc.ts`. Baseline
//     "rolling_all_runs" means every recorded point is the baseline; a bare
//     `rolling_<N>` or `rolling_<N>d` names a point-count or calendar-day window.

import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";
import {
  DEFAULT_MAX_QUALITY_DROP,
  DEFAULT_MAX_SAVINGS_DROP_PTS,
  DEFAULT_MAX_TOKEN_GROWTH_PCT,
  findPreviousGateRecord,
} from "../benchmark/gate";
import type { BenchmarkHistoryRecord } from "../benchmark/types";
import { detectWesternElectricBreach } from "./spc";
import { readJsonRecordSeries, readJsonRecords } from "./json-series";
import type { BandBreach, BandConfigError } from "./types";

interface TierDef {
  action?: string;
  tools?: string[];
  routes?: string[];
}

interface BandDef {
  metric?: string;
  source?: string;
  baseline?: string;
  owner?: string;
  rules?: string;
  tiers?: Record<string, TierDef>;
}

interface BandsFile {
  version?: number;
  defaults?: { baseline?: string; owner?: string; rules?: string };
  bands?: BandDef[];
}

export interface BandEvaluation {
  breaches: BandBreach[];
  configErrors: BandConfigError[];
  unavailable: { metric: string; reason: string }[];
}

/** Extracts `<path>.json` and `<field>` from prose like `"benchmarks/history.json (avgTokens field), ..."`. */
function parseJsonSource(source: string): { relativePath: string; field: string } | undefined {
  const match = /^([^\s(]+\.json)\s*\((\w+)\s+field\)/.exec(source);
  return match ? { relativePath: match[1], field: match[2] } : undefined;
}

/** `rolling_<N>` (point count) or `rolling_<N>d` (calendar days, resolved against each point's date). */
function resolveFixedWindowPoints(
  baseline: string,
  points: { date: Date | undefined }[],
  tailSize: number,
): number | undefined {
  const pointsMatch = /^rolling_(\d+)$/.exec(baseline);
  if (pointsMatch) return Number(pointsMatch[1]);

  const daysMatch = /^rolling_(\d+)d$/.exec(baseline);
  if (daysMatch && points.length > tailSize) {
    const days = Number(daysMatch[1]);
    const tailStart = points[points.length - tailSize].date;
    if (!tailStart) return undefined;
    const cutoff = tailStart.getTime() - days * 24 * 60 * 60 * 1000;
    return points.slice(0, points.length - tailSize).filter((p) => (p.date?.getTime() ?? -Infinity) >= cutoff).length;
  }
  return undefined;
}

function routeForTier(tierDef: TierDef | undefined, owner: string): string {
  if (tierDef?.routes && tierDef.routes.length > 0) return tierDef.routes.join(", ");
  if (tierDef?.tools && tierDef.tools.length > 0) return `${owner} (${tierDef.tools.join(", ")})`;
  return owner;
}

/** One `fixed_gate_threshold` check per metric name, backed by the real `scripts/benchmark/gate.ts` thresholds. */
const FIXED_GATE_CHECKS: Record<string, (current: number, previous: number) => { breached: boolean; delta: string }> = {
  avgTokens: (current, previous) => {
    const pct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    return { breached: pct > DEFAULT_MAX_TOKEN_GROWTH_PCT, delta: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` };
  },
  savingsPctHeavy: (current, previous) => {
    const delta = current - previous;
    return { breached: delta < -DEFAULT_MAX_SAVINGS_DROP_PTS, delta: `${delta >= 0 ? "+" : ""}${delta} pts` };
  },
  avgQuality: (current, previous) => {
    const delta = current - previous;
    return { breached: delta < -DEFAULT_MAX_QUALITY_DROP, delta: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}` };
  },
};

/** Evaluates a `rules: fixed_gate_threshold` band: current record vs. the most recent different-version record. */
function evaluateFixedGateBand(
  root: string,
  band: BandDef,
  metricName: string,
  jsonSource: { relativePath: string; field: string },
  owner: string,
): { breach?: BandBreach; unavailable?: string; configError?: string } {
  const check = FIXED_GATE_CHECKS[metricName];
  if (!check) {
    return { configError: `rules: fixed_gate_threshold declared for unknown metric "${metricName}": no gate check registered` };
  }
  const records = readJsonRecords(root, jsonSource.relativePath) as unknown as BenchmarkHistoryRecord[] | undefined;
  if (!records || records.length === 0) {
    return { unavailable: `no records found at ${jsonSource.relativePath}` };
  }
  const current = records[records.length - 1];
  const previous = findPreviousGateRecord(records, current.version);
  if (!previous) {
    return { unavailable: "no previous different-version record to gate against yet (first release)" };
  }
  const currentValue = current[jsonSource.field as keyof BenchmarkHistoryRecord] as unknown as number;
  const previousValue = previous[jsonSource.field as keyof BenchmarkHistoryRecord] as unknown as number;
  if (typeof currentValue !== "number" || typeof previousValue !== "number") {
    return { unavailable: `field "${jsonSource.field}" is not numeric on the compared records` };
  }
  const result = check(currentValue, previousValue);
  if (!result.breached) {
    return { unavailable: `gate passed: ${metricName} ${result.delta} vs v${previous.version} (within threshold)` };
  }
  return {
    breach: {
      metric: metricName,
      baselineWindow: `rolling_release (vs v${previous.version})`,
      tier: "3sigma",
      action: (band.tiers?.["3sigma"]?.action as BandBreach["action"]) ?? "propose",
      routedTo: routeForTier(band.tiers?.["3sigma"], owner),
    },
  };
}

/** Evaluates a `rules: western_electric` band over the full numeric series named by `source`. */
function evaluateWesternElectricBand(
  root: string,
  band: BandDef,
  metricName: string,
  baseline: string,
  jsonSource: { relativePath: string; field: string },
  owner: string,
): { breach?: BandBreach; unavailable?: string; configError?: string } {
  const points = readJsonRecordSeries(root, jsonSource.relativePath, jsonSource.field);
  if (!points) {
    return { unavailable: `no numeric history found at ${jsonSource.relativePath} field "${jsonSource.field}"` };
  }

  const tailSize = 8;
  let baselineWindow: number | undefined;
  if (baseline === "rolling_all_runs") {
    baselineWindow = points.length > tailSize ? points.length - tailSize : undefined;
  } else {
    baselineWindow = resolveFixedWindowPoints(baseline, points, tailSize);
  }
  if (baselineWindow === undefined) {
    return { unavailable: `insufficient history for a ${baseline} baseline plus an 8-point detection tail (have ${points.length} point(s))` };
  }

  const series = points.map((p) => p.value);
  const detected = detectWesternElectricBreach(series, baselineWindow);
  if (!detected) {
    return { unavailable: `no breach detected against ${baseline} baseline (${points.length} point(s) at ${jsonSource.relativePath}:${jsonSource.field})` };
  }
  return {
    breach: {
      metric: metricName,
      baselineWindow: baseline,
      tier: detected.tier,
      action: (band.tiers?.[detected.tier]?.action as BandBreach["action"]) ?? "log",
      routedTo: routeForTier(band.tiers?.[detected.tier], owner),
    },
  };
}

/** REQ-003/SRS-003: loads and evaluates `docs/ops/bands.yaml` under `root`. `[]`-shaped result when absent. */
export function evaluateBands(root: string): BandEvaluation {
  const bandsPath = path.join(root, "docs", "ops", "bands.yaml");
  if (!fs.existsSync(bandsPath)) {
    return { breaches: [], configErrors: [], unavailable: [] };
  }

  let parsed: BandsFile;
  try {
    parsed = (yaml.load(fs.readFileSync(bandsPath, "utf8")) ?? {}) as BandsFile;
  } catch (error) {
    return {
      breaches: [],
      configErrors: [{ band: "docs/ops/bands.yaml", problem: `failed to parse YAML: ${(error as Error).message}` }],
      unavailable: [],
    };
  }

  const breaches: BandBreach[] = [];
  const configErrors: BandConfigError[] = [];
  const unavailable: { metric: string; reason: string }[] = [];

  for (const band of parsed.bands ?? []) {
    const metricName = band.metric ?? "(unnamed band)";
    const owner = band.owner ?? parsed.defaults?.owner;
    if (!owner) {
      configErrors.push({ band: metricName, problem: "no owner declared (band-level or defaults); breaches would have no one to route to" });
      continue;
    }

    const baseline = band.baseline ?? parsed.defaults?.baseline;
    if (!baseline) {
      configErrors.push({ band: metricName, problem: "no baseline window declared (band-level or defaults)" });
      continue;
    }

    if (!band.source) {
      unavailable.push({ metric: metricName, reason: "band declares no `source`" });
      continue;
    }
    const jsonSource = parseJsonSource(band.source);
    if (!jsonSource) {
      unavailable.push({
        metric: metricName,
        reason: `source "${band.source}" does not name a "<file>.json (<field> field)" reference`,
      });
      continue;
    }

    const rules = band.rules ?? parsed.defaults?.rules ?? "western_electric";
    const result =
      rules === "fixed_gate_threshold"
        ? evaluateFixedGateBand(root, band, metricName, jsonSource, owner)
        : rules === "western_electric"
          ? evaluateWesternElectricBand(root, band, metricName, baseline, jsonSource, owner)
          : { configError: `unrecognized rules "${rules}" (expected western_electric or fixed_gate_threshold)` };

    if (result.configError) configErrors.push({ band: metricName, problem: result.configError });
    else if (result.unavailable) unavailable.push({ metric: metricName, reason: result.unavailable });
    else if (result.breach) breaches.push(result.breach);
  }

  return { breaches, configErrors, unavailable };
}
