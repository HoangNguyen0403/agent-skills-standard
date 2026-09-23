// scripts/metrics/docs.test.ts
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { brdSurvivalRate, requirementCommitDeltas, requirementRework } from "./docs";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "metrics-docs-"));
}

function git(root: string, args: string[], env?: NodeJS.ProcessEnv): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore", env: env ? { ...process.env, ...env } : process.env });
}

function initRepo(root: string): void {
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
}

function commitFile(root: string, relativePath: string, content: string, isoDate?: string): void {
  const full = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  git(root, ["add", relativePath]);
  const env = isoDate ? { GIT_AUTHOR_DATE: isoDate, GIT_COMMITTER_DATE: isoDate } : undefined;
  git(root, ["commit", "-q", "-m", `add ${relativePath}`], env);
}

test("brdSurvivalRate reports unavailable when docs/brd has no files", () => {
  const root = tmpRoot();
  const row = brdSurvivalRate(root);
  assert.equal(row.metric_result.available, false);
});

test("brdSurvivalRate counts BRD slugs that reached a committed PRD", () => {
  const root = tmpRoot();
  fs.mkdirSync(path.join(root, "docs", "brd"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs", "prd"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "brd", "brd-alpha.md"), "alpha");
  fs.writeFileSync(path.join(root, "docs", "brd", "brd-beta.md"), "beta");
  fs.writeFileSync(path.join(root, "docs", "prd", "prd-alpha.md"), "alpha prd");

  const row = brdSurvivalRate(root);
  assert.equal(row.metric_result.available, true);
  if (row.metric_result.available) {
    assert.equal(row.metric_result.value, "1/2 BRDs reached a committed PRD");
  }
});

test("requirementCommitDeltas reports unavailable without a .git directory", () => {
  const root = tmpRoot();
  fs.mkdirSync(path.join(root, "docs", "brd"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "brd", "brd-x.md"), "x");
  const row = requirementCommitDeltas(root);
  assert.equal(row.metric_result.available, false);
  assert.match((row.metric_result as { reason: string }).reason, /no `.git` directory/);
});

test("requirementCommitDeltas measures the commit-date gap between a slug's BRD and PRD", () => {
  const root = tmpRoot();
  initRepo(root);
  commitFile(root, "docs/brd/brd-checkout.md", "brd");
  commitFile(root, "docs/prd/prd-checkout.md", "prd");

  const row = requirementCommitDeltas(root);
  assert.equal(row.metric_result.available, true);
  if (row.metric_result.available) {
    assert.match(row.metric_result.value, /avg BRD.+PRD.+\(n=1\)/);
  }
});

test("requirementRework reports unavailable when no srs-task-list files exist", () => {
  const root = tmpRoot();
  initRepo(root);
  const row = requirementRework(root);
  assert.equal(row.metric_result.available, false);
});

test("requirementRework counts PRD/SRS commits after the first task-list commit for a slug", () => {
  const root = tmpRoot();
  initRepo(root);
  commitFile(root, "docs/srs/srs-task-list-checkout.md", "v1", "2026-01-01T00:00:00");
  commitFile(root, "docs/prd/prd-checkout.md", "v1", "2026-01-01T00:00:00");
  commitFile(root, "docs/prd/prd-checkout.md", "v2 — reworked after task list", "2026-01-02T00:00:00");

  const row = requirementRework(root);
  assert.equal(row.metric_result.available, true);
  if (row.metric_result.available) {
    assert.match(row.metric_result.value, /1 rework commit\(s\) across 1 task-listed slug\(s\)/);
  }
});
