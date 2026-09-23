// scripts/metrics/index.ts
//
// SRS-001 CLI: `node --import tsx scripts/metrics/index.ts [--since <rev|date>]
// [--json] [--out <path>] [--check] [--root <dir>]`.
//
// REQ-001: emits `artifacts/sdlc-metrics.md` from committed artifacts and git
// history at a workflow terminal state. Exits 0 on a repo with no inputs at all
// (AC-001) — every metric is reported `unavailable` with a stated reason, never
// guessed (REQ-002). `--check` computes without writing and exits non-zero only
// on a control-band breach (REQ-003), so CI can gate on it later.

import fs from "fs";
import path from "path";
import { attributionFromGit, readFlowMetrics } from "./git";
import { readRunRecords, buildStageIndicator } from "./runs";
import { brdSurvivalRate, requirementCommitDeltas, requirementRework } from "./docs";
import { benchmarkQualityIndicator, evalPassRateIndicator } from "./benchmarks";
import { evaluateBands } from "./bands";
import { collectUnavailable, renderMarkdown, toAttributionRows } from "./report";
import type { DeliveryHealthRow, MetricsReport } from "./types";

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  if (index + 1 >= argv.length) throw new Error(`${name} requires a value`);
  return argv[index + 1];
}

/** Builds the full `MetricsReport` for `root` (REQ-001: git history + committed artifacts). */
export function buildReport(root: string, sinceArg: string | undefined, now: Date = new Date()): MetricsReport {
  const flow = readFlowMetrics(root, sinceArg, now);
  const deliveryHealth: DeliveryHealthRow[] = [
    { metric: "Deployment frequency", metric_result: flow.deploymentFrequency },
    { metric: "Lead time for changes", metric_result: flow.leadTimeForChanges },
    { metric: "Change failure rate", metric_result: flow.changeFailureRate },
    { metric: "Time to restore", metric_result: flow.timeToRestore },
  ];

  const runRecords = readRunRecords(root);
  const stageIndicators = [
    brdSurvivalRate(root),
    requirementCommitDeltas(root),
    requirementRework(root),
    buildStageIndicator(runRecords),
    evalPassRateIndicator(root),
    benchmarkQualityIndicator(root),
    // Release stage reuses the same DORA-sourced flow metrics the SKILL table lists for it (not a
    // second measurement — same value, same source, presented under its Release-stage row too).
    { stage: "Release", indicator: "change lead time", metric_result: flow.leadTimeForChanges },
    { stage: "Release", indicator: "change failure rate", metric_result: flow.changeFailureRate },
  ];

  const bandEval = evaluateBands(root);
  const malformedUnavailable = runRecords.malformed.map((m) => ({
    metric: `run record: ${m.file}`,
    reason: `malformed, skipped: ${m.problems.join("; ")}`,
  }));

  const attribution = toAttributionRows(attributionFromGit(root, flow.period));

  return {
    scope: path.basename(root) || "repository",
    period: flow.period.label,
    generatedAt: now.toISOString(),
    deliveryHealth,
    stageIndicators,
    bandBreaches: bandEval.breaches,
    bandConfigErrors: bandEval.configErrors,
    attribution,
    unavailable: [
      ...collectUnavailable(deliveryHealth, stageIndicators, bandEval.unavailable),
      ...malformedUnavailable,
    ],
    followUps: bandEval.configErrors.map(
      (e) => `Fix \`docs/ops/bands.yaml\` band "${e.band}": ${e.problem}`,
    ),
  };
}

/**
 * CLI entry for `tsx scripts/metrics/index.ts [--since <rev|date>] [--json]
 * [--out <path>] [--check] [--root <dir>]`. AC-001: always exits 0 unless
 * `--check` finds a control-band breach.
 */
export function run(argv: string[] = process.argv.slice(2)): { exitCode: number; output: string } {
  const root = path.resolve(flagValue(argv, "--root") ?? ".");
  const sinceArg = flagValue(argv, "--since");
  const wantJson = argv.includes("--json");
  const check = argv.includes("--check");
  const outFlag = flagValue(argv, "--out");
  const outPath = outFlag ? (path.isAbsolute(outFlag) ? outFlag : path.join(root, outFlag)) : path.join(root, "artifacts", "sdlc-metrics.md");

  const report = buildReport(root, sinceArg);

  if (check) {
    const exitCode = report.bandBreaches.length > 0 ? 1 : 0;
    const output = wantJson
      ? JSON.stringify({ breaches: report.bandBreaches, configErrors: report.bandConfigErrors })
      : report.bandBreaches.length > 0
        ? `${report.bandBreaches.length} control-band breach(es) found:\n${report.bandBreaches.map((b) => `- ${b.metric}: tier ${b.tier} -> ${b.routedTo}`).join("\n")}`
        : "No control-band breaches found.";
    return { exitCode, output };
  }

  if (wantJson) {
    return { exitCode: 0, output: JSON.stringify(report) };
  }

  const markdown = renderMarkdown(report);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, markdown, "utf8");
  return { exitCode: 0, output: `Wrote ${path.relative(root, outPath)}` };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const { exitCode, output } = run();
  console.log(output);
  process.exitCode = exitCode;
}
