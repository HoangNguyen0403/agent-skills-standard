// scripts/outcome/schema.test.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateRunRecord, type RunRecord } from "./schema";

function validRecord(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    schema_version: 1,
    run_id: "20260922T104500Z-plan-feature",
    slug: "checkout-retry",
    workflow: "plan-feature",
    feature_status: "requirements_ready",
    started_at: "2026-09-22T10:41:00Z",
    completed_at: "2026-09-22T10:45:00Z",
    requirement_trace: {
      brd_objectives: ["BRD-OBJ-001"],
      requirements: ["REQ-001", "REQ-002"],
      acceptance_criteria: ["AC-001"],
      srs: ["SRS-001"],
    },
    completed_evidence: ["docs/prd/prd-checkout-retry.md"],
    missing_evidence: [],
    decision_needed: [],
    recommended_next_workflow: "design-solution",
    cost: { source: "host", prompt_tokens: 120334, completion_tokens: 8021, estimated_usd: 1.84 },
    agent: { identity: "omp/anthropic/claude-sonnet-5", model: "claude-sonnet-5" },
    ...overrides,
  };
}

test("validateRunRecord accepts a fully valid record", () => {
  const issues = validateRunRecord(validRecord(), "fixture.json");
  assert.deepEqual(issues, []);
});

test("validateRunRecord rejects a placeholder REQ-* id in requirement_trace.requirements", () => {
  const record = validRecord({
    requirement_trace: {
      brd_objectives: ["BRD-OBJ-001"],
      requirements: ["REQ-*"],
      acceptance_criteria: ["AC-001"],
      srs: ["SRS-001"],
    },
  });
  const issues = validateRunRecord(record, "fixture.json");
  assert.ok(issues.some((issue) => /placeholder/.test(issue.message) && issue.severity === "error"));
});

test("validateRunRecord rejects a non-conforming REQ id even without wildcard", () => {
  const record = validRecord({
    requirement_trace: {
      brd_objectives: ["BRD-OBJ-001"],
      requirements: ["REQ-1"],
      acceptance_criteria: ["AC-001"],
      srs: ["SRS-001"],
    },
  });
  const issues = validateRunRecord(record, "fixture.json");
  assert.ok(issues.some((issue) => /does not match/.test(issue.message)));
});

test("validateRunRecord rejects cost.source unavailable with estimated_usd present", () => {
  const record = validRecord({ cost: { source: "unavailable", estimated_usd: 1.5 } });
  const issues = validateRunRecord(record, "fixture.json");
  assert.ok(
    issues.some((issue) => issue.message.includes("cost.estimated_usd must be absent")),
  );
});

test("validateRunRecord rejects cost.source host missing completion_tokens", () => {
  const record = validRecord({ cost: { source: "host", prompt_tokens: 100 } as RunRecord["cost"] });
  const issues = validateRunRecord(record, "fixture.json");
  assert.ok(issues.some((issue) => issue.message.includes("cost.completion_tokens is required")));
});

test("validateRunRecord rejects an unknown feature_status", () => {
  const record = validRecord({ feature_status: "in-flight" as RunRecord["feature_status"] });
  const issues = validateRunRecord(record, "fixture.json");
  assert.ok(issues.some((issue) => issue.message.startsWith("feature_status must be one of")));
});

test("validateRunRecord rejects recommended_next_workflow naming a non-existent workflow", () => {
  const record = validRecord({ recommended_next_workflow: "not-a-real-workflow" });
  const issues = validateRunRecord(record, "fixture.json");
  assert.ok(issues.some((issue) => issue.message.includes("does not name a file in .agents/workflows/")));
});

test("validateRunRecord accepts recommended_next_workflow: null", () => {
  const record = validRecord({ recommended_next_workflow: null });
  const issues = validateRunRecord(record, "fixture.json");
  assert.deepEqual(issues, []);
});

test("validateRunRecord rejects completed_at before started_at", () => {
  const record = validRecord({ started_at: "2026-09-22T10:45:00Z", completed_at: "2026-09-22T10:41:00Z" });
  const issues = validateRunRecord(record, "fixture.json");
  assert.ok(issues.some((issue) => issue.message.includes("completed_at must be greater than or equal to started_at")));
});

test("validateRunRecord rejects a non-ISO-8601 timestamp", () => {
  const record = validRecord({ started_at: "09/22/2026" });
  const issues = validateRunRecord(record, "fixture.json");
  assert.ok(issues.some((issue) => issue.message.includes("started_at must be an ISO-8601")));
});

test("validateRunRecord reports every missing required top-level field", () => {
  const issues = validateRunRecord({}, "fixture.json");
  const missing = issues.filter((issue) => issue.message.startsWith("missing required field"));
  assert.equal(missing.length, 14);
});

test("validateRunRecord rejects non-object input", () => {
  const issues = validateRunRecord("not an object", "fixture.json");
  assert.deepEqual(issues, [{ severity: "error", file: "fixture.json", message: "run record must be a JSON object" }]);
});

// Sanity check that a temp-dir fixture round-trips through JSON.parse + validateRunRecord,
// per the "fixtures written to a temp dir, never real repo paths" convention.
test("validateRunRecord validates a record read from a temp-dir fixture file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "outcome-schema-"));
  const file = path.join(dir, "run.json");
  fs.writeFileSync(file, JSON.stringify(validRecord()));
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  const issues = validateRunRecord(parsed, file);
  assert.deepEqual(issues, []);
});
