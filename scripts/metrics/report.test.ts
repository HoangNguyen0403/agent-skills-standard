// scripts/metrics/report.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { collectUnavailable, renderMarkdown } from "./report";
import type { AvailableMetric, MetricsReport } from "./types";

function available(value: string, extra: Partial<AvailableMetric> = {}): AvailableMetric {
  return {
    available: true,
    value,
    trend: "flat",
    source: "git tags",
    basis: "proxy",
    sampleSize: 3,
    coverage: "unknown",
    limitations: ["Proxy only; not an observed production event."],
    ...extra,
  };
}

function emptyReport(overrides: Partial<MetricsReport> = {}): MetricsReport {
  return {
    scope: "test-repo",
    period: "rolling 30d",
    generatedAt: "2026-01-01T00:00:00Z",
    deliveryHealth: [],
    stageIndicators: [],
    bandBreaches: [],
    bandConfigErrors: [],
    attribution: [],
    unavailable: [],
    followUps: [],
    ...overrides,
  };
}

test("renderMarkdown emits every schema section, even with no data", () => {
  const output = renderMarkdown(emptyReport());
  for (const heading of [
    "## Delivery Health",
    "## Stage Indicators",
    "## Control Bands",
    "## Attribution",
    "## Measurement Limitations",
    "## Unavailable",
    "## Follow-Ups",
  ]) {
    assert.ok(output.includes(heading), `missing ${heading}`);
  }
});

test("renderMarkdown cites a source and an explicit basis for every available metric row (AC-002)", () => {
  const report = emptyReport({
    deliveryHealth: [{ metric: "Deployment frequency", metric_result: available("3") }],
    stageIndicators: [
      {
        stage: "Test",
        indicator: "eval pass rate",
        metric_result: available("80%", {
          trend: "up",
          source: "benchmarks/evals/history.json",
          basis: "measured",
          sampleSize: 4,
          coverage: "unknown",
        }),
      },
    ],
  });
  const output = renderMarkdown(report);
  assert.match(output, /\| Deployment frequency \| 3 \| flat \| proxy \| 3 \| unknown \| git tags \|/);
  assert.match(
    output,
    /\| Test \| eval pass rate \| 80% \| up \| measured \| 4 \| unknown \| benchmarks\/evals\/history\.json \|/,
  );
});

test("renderMarkdown lists the stated limitations for measured and proxy values", () => {
  const report = emptyReport({
    deliveryHealth: [
      {
        metric: "Deployment frequency",
        metric_result: available("3", { limitations: ["Release tags are not deployments."] }),
      },
    ],
  });
  const output = renderMarkdown(report);
  assert.match(output, /## Measurement Limitations/);
  assert.match(output, /\| Deployment frequency \| Release tags are not deployments\. \|/);
});

test("renderMarkdown never emits a composite productivity score (AC-003)", () => {
  const report = emptyReport({
    deliveryHealth: [{ metric: "Deployment frequency", metric_result: available("3") }],
    stageIndicators: [{ stage: "Test", indicator: "eval pass rate", metric_result: available("80%", { source: "s" }) }],
    attribution: [{ identityClass: "agent", changes: 5, notes: "" }],
  });
  const output = renderMarkdown(report);
  assert.doesNotMatch(output.toLowerCase(), /composite|productivity score|overall score/);
});

test("renderMarkdown never emits a per-individual attribution row — identity class only", () => {
  const output = renderMarkdown(emptyReport({ attribution: [{ identityClass: "agent", changes: 2, notes: "" }] }));
  assert.match(output, /\| agent \| 2 \|/);
  assert.doesNotMatch(output, /Jane|John|@\w+/);
});

test("collectUnavailable gathers every unavailable delivery-health and stage-indicator row", () => {
  const unavailable = collectUnavailable(
    [{ metric: "Time to restore", metric_result: { available: false, reason: "no incident source" } }],
    [{ stage: "Build", indicator: "plan adherence", metric_result: { available: false, reason: "no runs" } }],
    [{ metric: "avgTokens", reason: "gate passed" }],
  );
  assert.deepEqual(unavailable, [
    { metric: "Time to restore", reason: "no incident source" },
    { metric: "Build: plan adherence", reason: "no runs" },
    { metric: "band: avgTokens", reason: "gate passed" },
  ]);
});
