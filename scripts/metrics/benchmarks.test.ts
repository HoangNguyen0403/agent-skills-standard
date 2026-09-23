// scripts/metrics/benchmarks.test.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { benchmarkQualityIndicator, evalPassRateIndicator } from "./benchmarks";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "metrics-benchmarks-"));
}

test("evalPassRateIndicator reports unavailable when benchmarks/evals/history.json is absent", () => {
  const root = tmpRoot();
  const row = evalPassRateIndicator(root);
  assert.equal(row.metric_result.available, false);
});

test("benchmarkQualityIndicator reports unavailable when benchmarks/history.json is absent", () => {
  const root = tmpRoot();
  const row = benchmarkQualityIndicator(root);
  assert.equal(row.metric_result.available, false);
});

test("benchmarkQualityIndicator reports the latest value and its trend against the previous record", () => {
  const root = tmpRoot();
  fs.mkdirSync(path.join(root, "benchmarks"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "benchmarks", "history.json"),
    JSON.stringify({ records: [{ avgQuality: 8.5, date: "2026-01-01T00:00:00Z" }, { avgQuality: 9.0, date: "2026-02-01T00:00:00Z" }] }),
    "utf8",
  );
  const row = benchmarkQualityIndicator(root);
  assert.equal(row.metric_result.available, true);
  if (row.metric_result.available) {
    assert.equal(row.metric_result.value, "9.0/10");
    assert.match(row.metric_result.trend, /up 0\.5 vs previous record/);
    assert.equal(row.metric_result.source, "benchmarks/history.json (avgQuality field)");
  }
});
