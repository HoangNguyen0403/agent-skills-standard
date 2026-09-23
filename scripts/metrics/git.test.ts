// scripts/metrics/git.test.ts
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { attributionFromGit, readFlowMetrics } from "./git";

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

test("readFlowMetrics computes lead time and change failure rate from a tagged release history", () => {
  const root = tmpRoot();
  initRepo(root);
  commit(root, "a.txt", "1", "feat: add a");
  commit(root, "b.txt", "1", "fix: a regression");
  git(root, ["tag", "app-v1.0.0"]);
  const flow = readFlowMetrics(root, undefined, new Date());

  assert.equal(flow.deploymentFrequency.available, true);
  if (flow.deploymentFrequency.available) assert.match(flow.deploymentFrequency.value, /^1 deploy tag/);

  assert.equal(flow.leadTimeForChanges.available, true);
  assert.equal(flow.changeFailureRate.available, true);
  if (flow.changeFailureRate.available) {
    assert.match(flow.changeFailureRate.value, /^100% \(1\/1 deploys/);
  }
});

test("attributionFromGit classifies commit authors into agent vs human classes, never by name", () => {
  const root = tmpRoot();
  initRepo(root);
  commit(root, "a.txt", "1", "feat: from agent", "claude-agent");
  commit(root, "b.txt", "1", "feat: from a person", "Jane Doe");
  const now = new Date();
  const period = readFlowMetrics(root, undefined, now).period;
  const counts = attributionFromGit(root, period);
  const agent = counts.find((c) => c.identityClass === "agent");
  const human = counts.find((c) => c.identityClass === "human");
  assert.equal(agent?.changes, 1);
  assert.equal(human?.changes, 1);
});
