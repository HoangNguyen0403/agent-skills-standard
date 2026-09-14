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
    { category: "android", skillName: "android-resources", caseId: "eval-5", arm: "with-skill", classification: "guidance present but insufficiently actionable", evidence: "contains:dp" },
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
    assert.equal(readRemediationQueue(root)?.items.length, 4);
  } finally {
    await fs.remove(root);
  }
});

test("evalSignalIssues groups by skill and classification with the right severities", () => {
  const issues = evalSignalIssues(queue);
  const keys = issues.map((i) => `${i.type}:${i.category}:${i.skillName}:${i.severity}`).sort();
  assert.deepEqual(keys, [
    "eval-outdated:nextjs:nextjs-caching:med",
    "eval-remediation:android:android-resources:low",
    "eval-remediation:nextjs:nextjs-caching:low",
  ]);
  const android = issues.find((i) => i.category === "android");
  assert.match(android?.message ?? "", /2 failing eval case\(s\)/);
  assert.match(android?.message ?? "", /eval-3, eval-5/);
  assert.match(android?.message ?? "", /all-v2\.6\.0-final-136/);
  assert.equal(android?.file, "benchmarks/evals/remediation-queue.json");
  assert.deepEqual(evalSignalIssues(null), []);
});
