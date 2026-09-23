// scripts/metrics/index.test.ts
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildReport, run } from "./index";
import { renderMarkdown } from "./report";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "metrics-index-"));
}

function git(root: string, args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

function initRepo(root: string): void {
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
}

// AC-001: Given a repo with no run records, when the producer runs, then it exits 0
// and every metric is reported unavailable with a stated reason.
test("AC-001: an empty repo exits 0 and marks every metric unavailable with a reason", () => {
  const root = tmpRoot();
  const { exitCode, output } = run(["--root", root, "--json"]);
  assert.equal(exitCode, 0);
  const report = JSON.parse(output);
  for (const row of report.deliveryHealth) {
    assert.equal(row.metric_result.available, false, `${row.metric} should be unavailable`);
    assert.ok(row.metric_result.reason && row.metric_result.reason.length > 0, `${row.metric} needs a reason`);
  }
  for (const row of report.stageIndicators) {
    assert.equal(row.metric_result.available, false, `${row.indicator} should be unavailable`);
    assert.ok(row.metric_result.reason && row.metric_result.reason.length > 0, `${row.indicator} needs a reason`);
  }
  assert.equal(report.bandBreaches.length, 0);
});

// AC-002: Given committed artifacts and git history, when the report is emitted,
// then every value cites its source artifact path or commit range.
test("AC-002: every available metric in a populated repo cites a source", () => {
  const root = tmpRoot();
  initRepo(root);
  git(root, ["commit", "--allow-empty", "-q", "-m", "feat: seed"]);
  git(root, ["tag", "app-v1.0.0"]);
  fs.mkdirSync(path.join(root, "benchmarks"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "benchmarks", "history.json"),
    JSON.stringify({ records: [{ version: "1.0.0", avgQuality: 9, date: "2026-01-01T00:00:00Z" }] }),
    "utf8",
  );

  const report = buildReport(root, undefined, new Date());
  for (const row of report.deliveryHealth) {
    if (row.metric_result.available) assert.ok(row.metric_result.source, `${row.metric} missing a source`);
  }
  for (const row of report.stageIndicators) {
    if (row.metric_result.available) assert.ok(row.metric_result.source, `${row.indicator} missing a source`);
  }
});

// AC-003: Given any input, when the report is emitted, then it contains no composite
// productivity score and no per-individual breakdown.
test("AC-003: the rendered document contains no composite score and no per-individual breakdown", () => {
  const root = tmpRoot();
  initRepo(root);
  git(root, ["-c", "user.name=Jane Doe", "commit", "--allow-empty", "-q", "-m", "feat: seed"]);
  const report = buildReport(root, undefined, new Date());
  const markdown = renderMarkdown(report);
  assert.doesNotMatch(markdown.toLowerCase(), /composite|productivity score/);
  assert.doesNotMatch(markdown, /Jane Doe/);
});

// AC-004: Given a band in docs/ops/bands.yaml whose rolling window is breached, when the
// producer runs, then the breach is reported with its tier and named owner.
test("AC-004: a seeded band breach is reported with its tier and named owner", () => {
  const root = tmpRoot();
  fs.mkdirSync(path.join(root, "docs", "ops"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "docs", "ops", "bands.yaml"),
    [
      "version: 1",
      "defaults:",
      "  owner: repo-maintainer",
      "bands:",
      "  - metric: avgTokens",
      '    source: "benchmarks/history.json (avgTokens field)"',
      "    baseline: rolling_release",
      "    rules: fixed_gate_threshold",
      "    tiers:",
      "      3sigma:",
      "        action: propose",
      "        routes: [pull_request]",
      "",
    ].join("\n"),
    "utf8",
  );
  fs.mkdirSync(path.join(root, "benchmarks"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "benchmarks", "history.json"),
    JSON.stringify({ records: [{ version: "1.0.0", avgTokens: 500 }, { version: "1.1.0", avgTokens: 700 }] }),
    "utf8",
  );

  const { exitCode, output } = run(["--root", root, "--check", "--json"]);
  assert.equal(exitCode, 1);
  const parsed = JSON.parse(output);
  assert.equal(parsed.breaches.length, 1);
  assert.equal(parsed.breaches[0].tier, "3sigma");
  assert.equal(parsed.breaches[0].routedTo, "pull_request");
});

test("a band declared without an owner is surfaced as a config error, not silently accepted", () => {
  const root = tmpRoot();
  fs.mkdirSync(path.join(root, "docs", "ops"), { recursive: true });
  fs.writeFileSync(
    root && path.join(root, "docs", "ops", "bands.yaml"),
    "version: 1\nbands:\n  - metric: avgTokens\n    source: \"benchmarks/history.json (avgTokens field)\"\n    baseline: rolling_release\n",
    "utf8",
  );
  const report = buildReport(root, undefined, new Date());
  assert.equal(report.bandBreaches.length, 0);
  assert.equal(report.bandConfigErrors.length, 1);
  assert.match(report.bandConfigErrors[0].problem, /no owner declared/);
});

test("a malformed run record is reported without crashing the run", () => {
  const root = tmpRoot();
  const dir = path.join(root, "artifacts", "runs", "broken");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "bad.json"), "{ not json", "utf8");
  const { exitCode } = run(["--root", root, "--json"]);
  assert.equal(exitCode, 0);
  const report = buildReport(root, undefined, new Date());
  assert.ok(report.unavailable.some((u) => u.reason.includes("malformed")));
});

test("run() writes artifacts/sdlc-metrics.md by default and exits 0", () => {
  const root = tmpRoot();
  const { exitCode, output } = run(["--root", root]);
  assert.equal(exitCode, 0);
  assert.match(output, /Wrote artifacts[/\\]sdlc-metrics\.md/);
  const written = fs.readFileSync(path.join(root, "artifacts", "sdlc-metrics.md"), "utf8");
  assert.match(written, /^# SDLC Metrics:/);
});

test("run() throws a descriptive error when a flag is given without its value", () => {
  assert.throws(() => run(["--since"]), /--since requires a value/);
});
