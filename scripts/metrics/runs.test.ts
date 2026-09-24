// scripts/metrics/runs.test.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildStageIndicator, readRunRecords } from "./runs";
import type { RunRecord } from "../outcome/schema";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "metrics-runs-"));
}

function writeRun(root: string, slug: string, name: string, overrides: Partial<RunRecord> = {}): void {
  const record: RunRecord = {
    schema_version: 1,
    run_id: name,
    slug,
    workflow: "implement-feature",
    feature_status: "implemented",
    started_at: "2026-09-22T10:00:00Z",
    completed_at: "2026-09-22T10:05:00Z",
    requirement_trace: { brd_objectives: ["BRD-OBJ-001"], requirements: ["REQ-001"], acceptance_criteria: ["AC-001"], srs: ["SRS-001"] },
    completed_evidence: [],
    missing_evidence: [],
    decision_needed: [],
    recommended_next_workflow: null,
    cost: { source: "host", prompt_tokens: 100, completion_tokens: 50 },
    agent: { identity: "omp/anthropic/claude-sonnet-5", model: "claude-sonnet-5" },
    ...overrides,
  };
  const dir = path.join(root, "artifacts", "runs", slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(record), "utf8");
}

test("readRunRecords returns empty result when artifacts/runs is absent", () => {
  const root = tmpRoot();
  assert.deepEqual(readRunRecords(root), { records: [], malformed: [] });
});

test("readRunRecords reports a malformed record without crashing the run", () => {
  const root = tmpRoot();
  const dir = path.join(root, "artifacts", "runs", "broken-slug");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "bad.json"), "{ not valid json", "utf8");
  writeRun(root, "good-slug", "20260922T100000Z-implement-feature");

  const result = readRunRecords(root);
  assert.equal(result.records.length, 1);
  assert.equal(result.malformed.length, 1);
  assert.match(result.malformed[0].file, /broken-slug/);
  assert.match(result.malformed[0].problems[0], /failed to parse JSON/);
});

test("readRunRecords reports a record missing required fields as malformed, not thrown", () => {
  const root = tmpRoot();
  const dir = path.join(root, "artifacts", "runs", "incomplete");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "run.json"), JSON.stringify({ schema_version: 1 }), "utf8");

  const result = readRunRecords(root);
  assert.equal(result.records.length, 0);
  assert.equal(result.malformed.length, 1);
  assert.ok(result.malformed[0].problems.length > 0);
});

test("buildStageIndicator reports unavailable when no run records exist", () => {
  const root = tmpRoot();
  const row = buildStageIndicator(readRunRecords(root));
  assert.equal(row.metric_result.available, false);
});

test("buildStageIndicator computes the terminal-status share for implement-feature runs", () => {
  const root = tmpRoot();
  writeRun(root, "a", "run-1", { feature_status: "implemented" });
  writeRun(root, "a", "run-2", { feature_status: "partially_implemented" });
  writeRun(root, "b", "run-3", { workflow: "plan-feature", feature_status: "requirements_ready" });

  const row = buildStageIndicator(readRunRecords(root));
  assert.equal(row.metric_result.available, true);
  if (row.metric_result.available) {
    assert.equal(row.metric_result.value, "1/2 implement-feature runs reached a terminal status");
  }
});
