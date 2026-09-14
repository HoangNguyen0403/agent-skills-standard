// scripts/freshness/signals/evals.test.ts
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import fs from "fs-extra";
import { evalSignalIssues, readRemediationQueue } from "./evals";

const queue = {
  runId: "all-v2.6.0-final-136",
  generatedAt: "2026-07-14T11:08:42.740Z",
  scope: "strict-release-blockers",
  items: [
    { category: "android", skillName: "android-resources", caseId: "eval-3", arm: "with-skill", classification: "guidance present but insufficiently actionable", evidence: "contains:density" },
    { category: "android", skillName: "android-resources", caseId: "eval-3", arm: "with-skill", classification: "guidance present but insufficiently actionable", evidence: "contains:dp" },
    { category: "android", skillName: "android-resources", caseId: "eval-5", arm: "with-skill", classification: "guidance present but insufficiently actionable", evidence: "contains:sp" },
    { category: "nextjs", skillName: "nextjs-caching", caseId: "eval-1", arm: "with-skill", classification: "outdated domain expectation", evidence: "contains:unstable_cache" },
    { category: "nextjs", skillName: "nextjs-caching", caseId: "eval-2", arm: "with-skill", classification: "missing skill guidance", evidence: "contains:cacheLife" },
  ],
};

test("readRemediationQueue returns null when the file is missing or invalid", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ags-evals-sig-"));
  try {
    assert.equal(readRemediationQueue(root), null);
    await fs.outputFile(path.join(root, "benchmarks", "evals", "remediation-queue.json"), "{not json");
    assert.equal(readRemediationQueue(root), null);
    await fs.writeJson(path.join(root, "benchmarks", "evals", "remediation-queue.json"), queue);
    assert.equal(readRemediationQueue(root)?.items.length, 5);
  } finally {
    await fs.remove(root);
  }
});

const opts = { today: new Date("2026-07-20T00:00:00Z"), windowDays: 90 };

test("evalSignalIssues: one remediation issue per skill, deduped cases, outdated separate", () => {
  const issues = evalSignalIssues(queue, opts);
  const keys = issues.map((i) => `${i.type}:${i.category}:${i.skillName}:${i.severity}`).sort();
  assert.deepEqual(keys, [
    "eval-outdated:nextjs:nextjs-caching:med",
    "eval-remediation:android:android-resources:low",
    "eval-remediation:nextjs:nextjs-caching:low",
  ]);
  const android = issues.find((i) => i.category === "android");
  assert.match(android?.message ?? "", /^2 failing eval case\(s\)/); // eval-3 counted once, eval-5
  assert.match(android?.message ?? "", /guidance present but insufficiently actionable×2/);
  assert.match(android?.message ?? "", /2026-07-14/);
  const caching = issues.find((i) => i.type === "eval-remediation" && i.category === "nextjs");
  assert.match(caching?.message ?? "", /^1 failing eval case\(s\)/);
  assert.match(caching?.message ?? "", /missing skill guidance×1/);
  assert.deepEqual(evalSignalIssues(null, opts), []);
});

test("evalSignalIssues ignores a queue older than the window", () => {
  assert.deepEqual(evalSignalIssues(queue, { today: new Date("2026-12-01T00:00:00Z"), windowDays: 90 }), []);
  assert.equal(evalSignalIssues(queue, { today: new Date("2026-12-01T00:00:00Z"), windowDays: 200 }).length, 3);
});
