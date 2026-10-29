// scripts/metrics/git.test.ts
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildDeliveryIndicators, readDeliveryObservations } from "./delivery";
import { readFlowMetrics } from "./git";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "metrics-git-"));
}

function git(root: string, args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

function initRepo(root: string): void {
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
}

function commit(root: string, file: string, content: string, message: string, authorName = "Test"): void {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  git(root, ["add", file]);
  git(root, ["-c", `user.name=${authorName}`, "commit", "-q", "-m", message]);
}

test("readFlowMetrics reports every DORA metric unavailable when there is no .git directory", () => {
  const root = tmpRoot();
  const flow = readFlowMetrics(root, undefined, new Date());
  assert.equal(flow.deploymentFrequency.available, false);
  assert.equal(flow.leadTimeForChanges.available, false);
  assert.equal(flow.changeFailureRate.available, false);
  assert.equal(flow.timeToRestore.available, false);
});

test("readFlowMetrics reports zero deploys (not unavailable) for a git repo with no release tags", () => {
  const root = tmpRoot();
  initRepo(root);
  commit(root, "a.txt", "1", "feat: add a");
  const flow = readFlowMetrics(root, undefined, new Date());
  assert.equal(flow.deploymentFrequency.available, true);
  if (flow.deploymentFrequency.available) {
    assert.match(flow.deploymentFrequency.value, /^0 deploy tag/);
  }
  assert.equal(flow.leadTimeForChanges.available, false);
  assert.equal(flow.changeFailureRate.available, false);
});

test("git release history yields labeled proxies, never measured deployment or failure values", () => {
  const root = tmpRoot();
  initRepo(root);
  commit(root, "a.txt", "1", "feat: add a");
  commit(root, "b.txt", "1", "fix: a regression");
  git(root, ["tag", "app-v1.0.0"]);
  const flow = readFlowMetrics(root, undefined, new Date());

  assert.equal(flow.deploymentFrequency.available, true);
  if (flow.deploymentFrequency.available) {
    assert.match(flow.deploymentFrequency.value, /^1 deploy tag/);
    assert.equal(flow.deploymentFrequency.basis, "proxy");
    assert.equal(flow.deploymentFrequency.coverage, "unknown");
    assert.ok(flow.deploymentFrequency.limitations.length > 0);
  }

  assert.equal(flow.leadTimeForChanges.available, true);
  assert.equal(flow.changeFailureRate.available, true);
  if (flow.changeFailureRate.available) {
    assert.equal(flow.changeFailureRate.basis, "proxy");
    assert.match(flow.changeFailureRate.value, /^100% \(1\/1 deploy tags/);
    assert.match(flow.changeFailureRate.source, /^git proxy:/);
  }
});

test("Git-only input cannot populate a measured change failure rate", () => {
  const root = tmpRoot();
  initRepo(root);
  commit(root, "a.txt", "1", "feat: add a");
  commit(root, "b.txt", "1", "fix: a regression");
  git(root, ["tag", "app-v1.0.0"]);
  const flow = readFlowMetrics(root, undefined, new Date());
  const measured = buildDeliveryIndicators(readDeliveryObservations(root), flow.period);
  const row = measured.deliveryHealth.find((candidate) => candidate.metric === "Change failure rate (observed)");
  assert.ok(row);
  assert.equal(row.metric_result.available, false);
  if (!row.metric_result.available) {
    assert.match(row.metric_result.reason, /no artifacts\/metrics\/delivery-observations\.json supplied/);
  }
});
