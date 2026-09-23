// scripts/metrics/report.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { collectUnavailable, renderMarkdown, toAttributionRows } from "./report";
import type { MetricsReport } from "./types";

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
    "## Unavailable",
    "## Follow-Ups",
  ]) {
    assert.ok(output.includes(heading), `missing ${heading}`);
  }
});

test("renderMarkdown cites a source for every available metric row (AC-002)", () => {
  const report = emptyReport({
    deliveryHealth: [
      { metric: "Deployment frequency", metric_result: { available: true, value: "3", trend: "flat", source: "git tags" } },
    ],
    stageIndicators: [
      { stage: "Test", indicator: "eval pass rate", metric_result: { available: true, value: "80%", trend: "up", source: "benchmarks/evals/history.json" } },
    ],
  });
  const output = renderMarkdown(report);
  assert.match(output, /\| Deployment frequency \| 3 \| flat \| git tags \|/);
  assert.match(output, /\| Test \| eval pass rate \| 80% \| up \| benchmarks\/evals\/history\.json \|/);
});

test("renderMarkdown never emits a composite productivity score (AC-003)", () => {
  const report = emptyReport({
    deliveryHealth: [
      { metric: "Deployment frequency", metric_result: { available: true, value: "3", trend: "flat", source: "git tags" } },
    ],
    stageIndicators: [
      { stage: "Test", indicator: "eval pass rate", metric_result: { available: true, value: "80%", trend: "up", source: "s" } },
    ],
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

test("toAttributionRows preserves per-class counts without naming individuals", () => {
  const rows = toAttributionRows([
    { identityClass: "agent", changes: 4 },
    { identityClass: "human", changes: 0 },
  ]);
  assert.equal(rows[0].notes, "");
  assert.match(rows[1].notes, /no commits attributed/);
});
