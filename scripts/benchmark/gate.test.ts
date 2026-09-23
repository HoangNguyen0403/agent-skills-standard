import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_MAX_QUALITY_DROP,
  DEFAULT_MAX_SAVINGS_DROP_PTS,
  DEFAULT_MAX_TOKEN_GROWTH_PCT,
  evaluateGate,
  findPreviousGateRecord,
  parseGateThresholds,
} from "./gate";
import type { BenchmarkHistoryRecord } from "./types";

function record(over: Partial<BenchmarkHistoryRecord>): BenchmarkHistoryRecord {
  return {
    version: "2.6.0",
    date: "2026-07-10T03:24:45.951Z",
    totalSkills: 264,
    avgTokens: 528,
    savingsPctHeavy: 85,
    avgQuality: 9.8,
    reportPath: "benchmarks/archive/v2.6.0.md",
    ...over,
  };
}

test("evaluateGate passes with no previous record and says so", () => {
  const result = evaluateGate(
    { avgTokensWithSkill: 500, avgSavingsPctHeavy: 80, avgQualityScore: 9.5 },
    undefined,
  );
  assert.equal(result.passed, true);
  assert.equal(result.hasPrevious, false);
  assert.match(result.summaryLines[0], /No previous record/);
});

test("evaluateGate fails on a fabricated savingsPctHeavy collapse (mirrors the v2.4.7->v2.6.0 39pt drop)", () => {
  const previous = record({ version: "2.4.7", date: "2026-06-15T15:52:13.558Z", savingsPctHeavy: 85 });
  const result = evaluateGate(
    { avgTokensWithSkill: 528, avgSavingsPctHeavy: 46, avgQualityScore: 9.8 },
    previous,
  );
  assert.equal(result.passed, false);
  const savingsCheck = result.checks.find((c) => c.metric === "savingsPctHeavy");
  assert.equal(savingsCheck?.breached, true);
  assert.match(savingsCheck?.reason ?? "", /dropped 39 pts/);
  assert.match(savingsCheck?.direction ?? "", /vs v2\.4\.7 \(2026-06-15\)/);
});

test("evaluateGate fails on any avgQuality drop and on token growth beyond default threshold", () => {
  const previous = record({});
  const qualityDrop = evaluateGate(
    { avgTokensWithSkill: 528, avgSavingsPctHeavy: 85, avgQualityScore: 9.7 },
    previous,
  );
  assert.equal(qualityDrop.passed, false);
  assert.equal(qualityDrop.checks.find((c) => c.metric === "avgQuality")?.breached, true);

  const tokenGrowth = evaluateGate(
    { avgTokensWithSkill: 600, avgSavingsPctHeavy: 85, avgQualityScore: 9.8 },
    previous,
  );
  assert.equal(tokenGrowth.passed, false);
  const tokenCheck = tokenGrowth.checks.find((c) => c.metric === "avgTokens");
  assert.equal(tokenCheck?.breached, true);
  assert.match(tokenCheck?.direction ?? "", /^\+13\.6% vs/);
});

test("evaluateGate passes on a clean delta within all default thresholds", () => {
  const previous = record({});
  const result = evaluateGate(
    { avgTokensWithSkill: 540, avgSavingsPctHeavy: 84, avgQualityScore: 9.8 },
    previous,
  );
  assert.equal(result.passed, true);
  assert.equal(result.checks.every((c) => !c.breached), true);
  assert.equal(result.summaryLines.length, 3);
  for (const line of result.summaryLines) {
    assert.match(line, /source: v2\.6\.0 \(2026-07-10\)/);
  }
});

test("evaluateGate respects overridden thresholds", () => {
  const previous = record({});
  const strict = evaluateGate(
    { avgTokensWithSkill: 540, avgSavingsPctHeavy: 84, avgQualityScore: 9.8 },
    previous,
    { maxTokenGrowthPct: 1, maxSavingsDropPts: DEFAULT_MAX_SAVINGS_DROP_PTS, maxQualityDrop: DEFAULT_MAX_QUALITY_DROP },
  );
  assert.equal(strict.passed, false);
  assert.equal(strict.checks.find((c) => c.metric === "avgTokens")?.breached, true);
});

test("findPreviousGateRecord skips a same-version record and returns the last differing-version one", () => {
  const records = [
    record({ version: "2.4.6" }),
    record({ version: "2.4.7" }),
    record({ version: "2.6.0" }),
    record({ version: "2.6.1", date: "2026-09-23T00:00:00.000Z" }), // re-run of current version
  ];
  const found = findPreviousGateRecord(records, "2.6.1");
  assert.equal(found?.version, "2.6.0");

  assert.equal(findPreviousGateRecord([], "2.6.1"), undefined);
  assert.equal(
    findPreviousGateRecord([record({ version: "2.6.1" })], "2.6.1"),
    undefined,
  );
});

test("parseGateThresholds falls back to named defaults and parses CLI overrides", () => {
  assert.deepEqual(parseGateThresholds([]), {
    maxTokenGrowthPct: DEFAULT_MAX_TOKEN_GROWTH_PCT,
    maxSavingsDropPts: DEFAULT_MAX_SAVINGS_DROP_PTS,
    maxQualityDrop: DEFAULT_MAX_QUALITY_DROP,
  });
  assert.deepEqual(
    parseGateThresholds(["--gate", "--max-token-growth-pct=5", "--max-savings-drop-pts=20", "--max-quality-drop=0.5"]),
    { maxTokenGrowthPct: 5, maxSavingsDropPts: 20, maxQualityDrop: 0.5 },
  );
  // malformed override falls back to the default rather than NaN
  assert.equal(parseGateThresholds(["--max-token-growth-pct=notanumber"]).maxTokenGrowthPct, DEFAULT_MAX_TOKEN_GROWTH_PCT);
});
