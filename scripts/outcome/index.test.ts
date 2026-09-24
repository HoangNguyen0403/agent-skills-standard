// scripts/outcome/index.test.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateRunRecords } from "./index";

function tempRunsDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "outcome-runs-"));
}

test("validateRunRecords exits clean (zero issues, zero checked) when the runs dir does not exist", async () => {
  const missingDir = path.join(os.tmpdir(), `outcome-missing-${Date.now()}-${Math.random()}`);
  const result = await validateRunRecords(missingDir);
  assert.deepEqual(result, { issues: [], checked: 0 });
});

test("validateRunRecords validates every nested *.json file and reports zero issues for a valid record", async () => {
  const dir = tempRunsDir();
  const slugDir = path.join(dir, "checkout-retry");
  fs.mkdirSync(slugDir);
  fs.writeFileSync(
    path.join(slugDir, "20260922T104500Z-plan-feature.json"),
    JSON.stringify({
      schema_version: 1,
      run_id: "20260922T104500Z-plan-feature",
      slug: "checkout-retry",
      workflow: "plan-feature",
      feature_status: "requirements_ready",
      started_at: "2026-09-22T10:41:00Z",
      completed_at: "2026-09-22T10:45:00Z",
      requirement_trace: {
        brd_objectives: ["BRD-OBJ-001"],
        requirements: ["REQ-001"],
        acceptance_criteria: ["AC-001"],
        srs: ["SRS-001"],
      },
      completed_evidence: ["docs/prd/prd-checkout-retry.md"],
      missing_evidence: [],
      decision_needed: [],
      recommended_next_workflow: null,
      cost: { source: "unavailable" },
      agent: { identity: "omp/anthropic/claude-sonnet-5", model: "claude-sonnet-5" },
    }),
  );

  const result = await validateRunRecords(dir);
  assert.equal(result.checked, 1);
  assert.deepEqual(result.issues, []);
});

test("validateRunRecords reports malformed JSON as a single error issue without throwing", async () => {
  const dir = tempRunsDir();
  fs.writeFileSync(path.join(dir, "broken.json"), "{ not valid json");

  const result = await validateRunRecords(dir);
  assert.equal(result.checked, 1);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].severity, "error");
  assert.match(result.issues[0].message, /failed to parse JSON/);
});
