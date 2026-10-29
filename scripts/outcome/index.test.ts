// scripts/outcome/index.test.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { RUN_RECORD_ASSURANCE, run, validateRunRecords } from "./index";
import type { RunRecord } from "./schema";

const SCOPE = {
  slug: "checkout-retry",
  workflow: "plan-feature",
  run_id: "20260922T104500Z-plan-feature",
} as const;

function tempRunsDir(t: TestContext): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "outcome-runs-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function validRecord(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    schema_version: 1,
    run_id: SCOPE.run_id,
    slug: SCOPE.slug,
    workflow: SCOPE.workflow,
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
    ...overrides,
  };
}

function writeJson(dir: string, relPath: string, value: unknown): void {
  const target = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value, null, 2));
}

function parsePayload(output: string): Record<string, unknown> {
  return JSON.parse(output) as Record<string, unknown>;
}

test("optional discovery tolerates a missing runs directory", async (t) => {
  const missingDir = path.join(os.tmpdir(), `outcome-missing-${Date.now()}-${Math.random()}`);
  t.after(() => fs.rmSync(missingDir, { recursive: true, force: true }));

  const result = await validateRunRecords(missingDir);
  assert.deepEqual(result, { issues: [], checked: 0, matched: 0 });
});

test("optional discovery validates nested records and matches nothing without a scope", async (t) => {
  const dir = tempRunsDir(t);
  writeJson(dir, "checkout-retry/record.json", validRecord());

  const result = await validateRunRecords(dir);
  assert.equal(result.checked, 1);
  assert.equal(result.matched, 0);
  assert.deepEqual(result.issues, []);
});

test("malformed JSON is an error issue even when the scope cannot be determined", async (t) => {
  const dir = tempRunsDir(t);
  fs.writeFileSync(path.join(dir, "broken.json"), "{ not valid json");

  const result = await validateRunRecords(dir, SCOPE);
  assert.equal(result.checked, 1);
  assert.equal(result.matched, 0);
  const parseIssues = result.issues.filter((issue) => /failed to parse JSON/.test(issue.message));
  assert.equal(parseIssues.length, 1);
  assert.equal(parseIssues[0].severity, "error");
  assert.ok(result.issues.some((issue) => issue.severity === "error"));

  const cli = await run(["--records", "--required", "--dir", dir, ...scopeArgs(), "--json"]);
  assert.equal(cli.exitCode, 1);
  assert.equal(parsePayload(cli.output).ok, false);
});

function scopeArgs(): string[] {
  return ["--slug", SCOPE.slug, "--workflow", SCOPE.workflow, "--run-id", SCOPE.run_id];
}

test("required scope fails when the runs directory is missing", async (t) => {
  const missingDir = path.join(os.tmpdir(), `outcome-missing-${Date.now()}-${Math.random()}`);
  t.after(() => fs.rmSync(missingDir, { recursive: true, force: true }));

  const result = await validateRunRecords(missingDir, SCOPE);
  assert.equal(result.matched, 0);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].severity, "error");
  assert.match(result.issues[0].message, /no run record matches required scope/);
});

test("required scope fails for another slug, workflow, or run id by content", async (t) => {
  const dir = tempRunsDir(t);
  writeJson(dir, "other/other-slug.json", validRecord({ slug: "other-feature" }));
  writeJson(dir, "other/other-workflow.json", validRecord({ workflow: "design-solution" }));
  writeJson(dir, "other/other-run.json", validRecord({ run_id: "20260923T104500Z-plan-feature" }));

  const result = await validateRunRecords(dir, SCOPE);
  assert.equal(result.checked, 3);
  assert.equal(result.matched, 0);
  const scopeIssues = result.issues.filter((issue) => /no run record matches required scope/.test(issue.message));
  assert.equal(scopeIssues.length, 1);
});

test("required scope selects by record content, not by file or directory name", async (t) => {
  const dir = tempRunsDir(t);
  writeJson(dir, "unrelated-dir/unrelated-name.json", validRecord());

  const contentMatch = await validateRunRecords(dir, SCOPE);
  assert.equal(contentMatch.matched, 1);
  assert.deepEqual(contentMatch.issues, []);

  const namedDir = tempRunsDir(t);
  writeJson(namedDir, `${SCOPE.slug}/${SCOPE.run_id}.json`, validRecord({ slug: "different" }));
  const nameOnly = await validateRunRecords(namedDir, SCOPE);
  assert.equal(nameOnly.matched, 0);
  assert.equal(nameOnly.issues.filter((issue) => issue.severity === "error").length, 1);
});

test("required scope fails on duplicate matching identities", async (t) => {
  const dir = tempRunsDir(t);
  writeJson(dir, "checkout-retry/one.json", validRecord());
  writeJson(dir, "checkout-retry/two.json", validRecord());

  const result = await validateRunRecords(dir, SCOPE);
  assert.equal(result.matched, 2);
  const duplicate = result.issues.filter((issue) => /duplicate run record identity/.test(issue.message));
  assert.equal(duplicate.length, 1);
  assert.equal(duplicate[0].severity, "error");

  const cli = await run(["--records", "--required", "--dir", dir, ...scopeArgs(), "--json"]);
  assert.equal(cli.exitCode, 1);
  assert.equal(parsePayload(cli.output).ok, false);
});

test("a schema-invalid matching record cannot satisfy required scope", async (t) => {
  const dir = tempRunsDir(t);
  writeJson(
    dir,
    "checkout-retry/invalid.json",
    validRecord({
      requirement_trace: {
        brd_objectives: ["BRD-OBJ-001"],
        requirements: ["REQ-*"],
        acceptance_criteria: ["AC-001"],
        srs: ["SRS-001"],
      },
    }),
  );

  const result = await validateRunRecords(dir, SCOPE);
  assert.equal(result.matched, 0);
  assert.ok(result.issues.some((issue) => /not schema-valid/.test(issue.message)));
  assert.ok(result.issues.some((issue) => /REQ-\*|placeholder/i.test(issue.message)));
});

test("exactly one schema-valid match exposes schema-and-scope assurance", async (t) => {
  const dir = tempRunsDir(t);
  writeJson(dir, "checkout-retry/record.json", validRecord());

  const result = await validateRunRecords(dir, SCOPE);
  assert.deepEqual(result, { issues: [], checked: 1, matched: 1 });

  const cli = await run(["--records", "--required", "--dir", dir, ...scopeArgs(), "--json"]);
  assert.equal(cli.exitCode, 0);
  const payload = parsePayload(cli.output);
  assert.equal(payload.ok, true);
  assert.equal(payload.recordsChecked, 1);
  assert.equal(payload.recordsMatched, 1);
  assert.equal(payload.assurance, RUN_RECORD_ASSURANCE);
  assert.equal(RUN_RECORD_ASSURANCE, "record-schema-and-scope-valid");
});

test("schema validity never claims approval for a record with open evidence and decisions", async (t) => {
  const dir = tempRunsDir(t);
  writeJson(
    dir,
    "checkout-retry/open.json",
    validRecord({
      missing_evidence: ["docs/srs/srs-checkout-retry.md"],
      decision_needed: ["DEC-001"],
    }),
  );

  const cli = await run(["--records", "--required", "--dir", dir, ...scopeArgs(), "--json"]);
  assert.equal(cli.exitCode, 0);
  const payload = parsePayload(cli.output);
  assert.equal(payload.ok, true);
  assert.equal(payload.assurance, RUN_RECORD_ASSURANCE);
  assert.deepEqual(
    Object.keys(payload).filter((key) => /approv|authoriz|sign-?off/i.test(key)),
    [],
  );
  assert.ok(!/approved|authorized/i.test(cli.output));
});

test("required scope success is reported in the human format too", async (t) => {
  const dir = tempRunsDir(t);
  writeJson(dir, "checkout-retry/record.json", validRecord());

  const cli = await run(["--records", "--required", "--dir", dir, ...scopeArgs()]);
  assert.equal(cli.exitCode, 0);
  assert.match(cli.output, /exactly one run record matches slug=checkout-retry/);
  assert.match(cli.output, /Outcome audit passed/);
});

test("selectors outside required mode are usage errors", async () => {
  for (const argv of [
    ["--records", "--dir", "/tmp", ...scopeArgs(), "--json"],
    ["--slug", SCOPE.slug, "--json"],
    ["--workflow", SCOPE.workflow],
    ["--run-id", SCOPE.run_id],
  ]) {
    const result = await run(argv);
    assert.equal(result.exitCode, 2, argv.join(" "));
  }
});

test("required mode without --records, without every selector, or with --templates is a usage error", async () => {
  for (const argv of [
    ["--required", ...scopeArgs()],
    ["--records", "--required", "--slug", SCOPE.slug, "--workflow", SCOPE.workflow],
    ["--records", "--required", "--slug", SCOPE.slug, "--run-id", SCOPE.run_id, "--json"],
  ]) {
    const result = await run(argv);
    assert.equal(result.exitCode, 2, argv.join(" "));
    if (argv.includes("--json")) {
      const payload = parsePayload(result.output);
      assert.equal(payload.ok, false);
      assert.equal(payload.usageError, true);
      assert.equal(payload.recordsMatched, 0);
    }
  }

  const withTemplates = await run([
    "--records",
    "--required",
    "--templates",
    ...scopeArgs(),
    "--json",
  ]);
  assert.equal(withTemplates.exitCode, 2);
});

test("empty or flag-shaped selector values are usage errors", async () => {
  for (const argv of [
    ["--records", "--required", "--slug", "", "--workflow", SCOPE.workflow, "--run-id", SCOPE.run_id],
    ["--records", "--required", "--slug", "--json", "--workflow", SCOPE.workflow, "--run-id", SCOPE.run_id],
    ["--records", "--required", "--slug", SCOPE.slug, "--workflow", SCOPE.workflow, "--run-id"],
  ]) {
    const result = await run(argv);
    assert.equal(result.exitCode, 2, argv.join(" "));
  }
});
