// Pre-flight cost estimate for a manifest's remaining lanes. Derived strictly
// from observed usage on prior runs of the same model; never fabricated from
// a token-count guess. See docs/EVALS.md "Pre-flight cost estimate".
import fs from "fs-extra";
import * as path from "node:path";
import { MANIFEST_FILENAME } from "./constants";
import { evalWorkerConfig, missingAnswerCount } from "./execute";
import { loadManifest } from "./manifest";
import type { Manifest } from "./types";

export interface UsageProjection {
  sampleLanes: number;
  meanTokensPerLane: number;
  projectedTokens: { low: number; high: number };
  /** `null` when no sampled run resolved a price for this model. */
  projectedUsd: { low: number; high: number } | null;
}

export interface EstimateReport {
  runId: string;
  lanesToExecute: number;
  model: string;
  reasoningEffort: string;
  projection: UsageProjection | null;
  message: string;
}

interface LaneUsageSample {
  tokensPerLane: number;
  usdPerLane: number | null;
}

/** Observed per-lane usage from every prior run's manifest that used the same model. */
export function collectPriorLaneUsage(
  runsDir: string,
  model: string,
): LaneUsageSample[] {
  if (!fs.existsSync(runsDir)) return [];
  const samples: LaneUsageSample[] = [];
  for (const entry of fs.readdirSync(runsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(runsDir, entry.name, MANIFEST_FILENAME);
    if (!fs.existsSync(manifestPath)) continue;
    let manifest: Manifest;
    try {
      manifest = loadManifest(path.join(runsDir, entry.name));
    } catch {
      continue;
    }
    const usage = manifest.metadata.usage;
    if (!usage || usage.overall.lanesMetered <= 0) continue;
    if (manifest.metadata.model !== model) continue;
    samples.push({
      tokensPerLane: usage.overall.totalTokens / usage.overall.lanesMetered,
      usdPerLane:
        usage.overall.estimatedUsd === null
          ? null
          : usage.overall.estimatedUsd / usage.overall.lanesMetered,
    });
  }
  return samples;
}

export function estimateRun(
  runDir: string,
  options: { runsDir: string },
): EstimateReport {
  const manifest = loadManifest(runDir);
  const workerConfig = evalWorkerConfig();
  const lanesToExecute = missingAnswerCount(runDir);
  const samples = collectPriorLaneUsage(options.runsDir, workerConfig.model);
  if (samples.length === 0) {
    return {
      runId: manifest.runId,
      lanesToExecute,
      model: workerConfig.model,
      reasoningEffort: workerConfig.reasoningEffort,
      projection: null,
      message:
        "Cost projection unavailable: no prior run recorded usage for this model. Lanes and model are still reported below.",
    };
  }
  const tokensPerLane = samples.map((s) => s.tokensPerLane);
  const usdPerLane = samples
    .map((s) => s.usdPerLane)
    .filter((value): value is number => value !== null);
  const meanTokensPerLane =
    tokensPerLane.reduce((sum, value) => sum + value, 0) /
    tokensPerLane.length;
  const projectedTokens = {
    low: Math.min(...tokensPerLane) * lanesToExecute,
    high: Math.max(...tokensPerLane) * lanesToExecute,
  };
  const projectedUsd =
    usdPerLane.length > 0
      ? {
          low: Math.min(...usdPerLane) * lanesToExecute,
          high: Math.max(...usdPerLane) * lanesToExecute,
        }
      : null;
  return {
    runId: manifest.runId,
    lanesToExecute,
    model: workerConfig.model,
    reasoningEffort: workerConfig.reasoningEffort,
    projection: {
      sampleLanes: samples.length,
      meanTokensPerLane,
      projectedTokens,
      projectedUsd,
    },
    message: projectedUsd
      ? `Projected from ${samples.length} historical run(s) with usage data for ${workerConfig.model}.`
      : `Token range projected from ${samples.length} historical run(s); dollar estimate unavailable because ${workerConfig.model} is not in the pricing table.`,
  };
}
