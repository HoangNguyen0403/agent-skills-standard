import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildEvalsReportMarkdown,
  extractWholeCasePass,
  loadL3AttemptOutcomes,
  summarizeL3Outcomes,
} from "../reporter";
import type { RunResults } from "../types";

function withTempDir(fn: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "l3-report-"));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeReceipt(
  runsDir: string,
  runId: string,
  attemptId: string,
  receipt: Record<string, unknown>,
): void {
  const attemptDir = path.join(runsDir, runId, attemptId);
  fs.mkdirSync(attemptDir, { recursive: true });
  fs.writeFileSync(
    path.join(attemptDir, "receipt.json"),
    JSON.stringify({ schema_version: 1, run_id: runId, arm_id: "A1", ...receipt }),
    "utf8",
  );
}

const MINIMAL_RUN: RunResults = {
  schemaVersion: 2,
  runId: "run-min",
  category: "common",
  version: "2.7.4",
  scoredAt: "2026-01-01T00:00:00.000Z",
  metadata: {},
  scope: { kind: "category", categories: ["common"] },
  compromisedSkills: [],
  skills: [],
};

test("extractWholeCasePass requires every nested whole_case_pass flag to be true", () => {
  assert.equal(
    extractWholeCasePass({
      case_id: "payment",
      base: { whole_case_pass: true },
      adverse: { whole_case_pass: true },
      changed: { whole_case_pass: true },
      negative: { whole_case_pass: true },
    }),
    true,
  );
  assert.equal(
    extractWholeCasePass({
      case_id: "payment",
      base: { whole_case_pass: true },
      adverse: { whole_case_pass: false },
    }),
    false,
  );
  assert.equal(extractWholeCasePass({ case_id: "tenant", passed: false }), null);
  assert.equal(extractWholeCasePass(null), null);
});

test("loadL3AttemptOutcomes reads terminal receipts only and never guesses a missing verdict", () => {
  withTempDir((dir) => {
    const runsDir = path.join(dir, "runs");
    writeReceipt(runsDir, "run-a", "attempt-1", {
      case_id: "payment",
      terminal_state: "passed",
      verdict: { whole_case_pass: true },
    });
    writeReceipt(runsDir, "run-a", "attempt-2", {
      case_id: "tenant",
      terminal_state: "passed",
      verdict: { passed: true },
    });
    writeReceipt(runsDir, "run-a", "attempt-3", {
      case_id: "overload",
      terminal_state: "failed",
      verdict: null,
    });
    writeReceipt(runsDir, "run-a", "attempt-4", {
      case_id: "overload",
      terminal_state: "infrastructure_error",
      verdict: null,
    });
    // Ignored: build staging, malformed receipt, stray file, non-receipt dir.
    fs.mkdirSync(path.join(runsDir, "run-a", "build"), { recursive: true });
    fs.writeFileSync(
      path.join(runsDir, "run-a", "build", "build-receipt.json"),
      JSON.stringify({ schema_version: 1, state: "succeeded" }),
      "utf8",
    );
    fs.mkdirSync(path.join(runsDir, "run-a", "attempt-5"), { recursive: true });
    fs.writeFileSync(
      path.join(runsDir, "run-a", "attempt-5", "receipt.json"),
      "{ not json",
      "utf8",
    );
    fs.writeFileSync(path.join(runsDir, "run-a", "notes.txt"), "x", "utf8");
    fs.mkdirSync(path.join(runsDir, "run-a", "empty-attempt"), { recursive: true });

    const outcomes = loadL3AttemptOutcomes(runsDir);
    assert.equal(outcomes.length, 4);

    const summary = summarizeL3Outcomes(outcomes);
    assert.deepEqual(summary, [
      {
        runId: "run-a",
        cases: ["overload", "payment", "tenant"],
        attempts: 4,
        passed: 1,
        failed: 1,
        unverified: 1,
        nonOutcome: 1,
      },
    ]);
  });
});

test("executable outcome is reported separately and unavailable evidence is not a pass", () => {
  withTempDir((dir) => {
    const emptyDir = path.join(dir, "no-runs");
    const transcriptOnly = buildEvalsReportMarkdown([MINIMAL_RUN], undefined, {
      l3RunsDir: emptyDir,
    });
    assert.match(transcriptOnly, /## 🧱 Executable \(L3\) outcome/);
    assert.match(transcriptOnly, /No L3 terminal receipts found\. Executable outcome is unavailable, not passing\./);
    const emptyGroup = transcriptOnly.indexOf("## 🧱 Executable (L3) outcome");
    assert.ok(emptyGroup > transcriptOnly.indexOf("## 🔢 Executive Summary"));
    assert.ok(emptyGroup < transcriptOnly.indexOf("## 📦 Per-Category Results"));

    const runsDir = path.join(dir, "runs");
    writeReceipt(runsDir, "run-l3", "attempt-1", {
      case_id: "payment",
      terminal_state: "passed",
      verdict: { whole_case_pass: true },
    });
    writeReceipt(runsDir, "run-l3", "attempt-2", {
      case_id: "tenant",
      terminal_state: "passed",
      verdict: { whole_case_pass: false },
    });
    const withEvidence = buildEvalsReportMarkdown([MINIMAL_RUN], undefined, {
      l3RunsDir: runsDir,
    });
    assert.match(
      withEvidence,
      /\| run-l3 \| payment, tenant \| 2 \| 1 \| 1 \| 0 \| 0 \| 50% \|/,
    );
    assert.ok(
      withEvidence.indexOf("## 🧱 Executable (L3) outcome") <
        withEvidence.indexOf("## 📦 Per-Category Results"),
    );
  });
});

test("a report with no transcript runs still reports the executable group", () => {
  withTempDir((dir) => {
    const runsDir = path.join(dir, "runs");
    writeReceipt(runsDir, "run-l3", "attempt-1", {
      case_id: "payment",
      terminal_state: "passed",
      verdict: { whole_case_pass: true },
    });
    const report = buildEvalsReportMarkdown([], undefined, {
      l3RunsDir: runsDir,
    });
    assert.match(report, /## No runs yet/);
    assert.match(
      report,
      /\| run-l3 \| payment \| 1 \| 1 \| 0 \| 0 \| 0 \| 100% \|/,
    );
  });
});
