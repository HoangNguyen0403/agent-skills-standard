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

test("every available metric declares its measurement basis and at least one limitation", () => {
  const root = tmpRoot();
  initRepo(root);
  git(root, ["commit", "--allow-empty", "-q", "-m", "feat: seed"]);
  git(root, ["tag", "app-v1.0.0"]);
  const report = buildReport(root, undefined, new Date());
  for (const row of [...report.deliveryHealth, ...report.stageIndicators]) {
    if (!row.metric_result.available) continue;
    const label = "metric" in row ? row.metric : `${row.stage}: ${row.indicator}`;
    assert.ok(["measured", "proxy"].includes(row.metric_result.basis), `${label} missing basis`);
    assert.ok(row.metric_result.limitations.length > 0, `${label} missing limitations`);
  }
});

test("Git-only input produces labeled proxies and cannot populate a measured change failure rate", () => {
  const root = tmpRoot();
  initRepo(root);
  git(root, ["commit", "--allow-empty", "-q", "-m", "feat: seed"]);
  git(root, ["commit", "--allow-empty", "-q", "-m", "fix: a regression"]);
  git(root, ["tag", "app-v1.0.0"]);

  const report = buildReport(root, undefined, new Date());
  const proxy = report.deliveryHealth.find((row) => row.metric === "Revert/fix-commit tag share (git proxy)");
  assert.ok(proxy);
  assert.equal(proxy.metric_result.available, true);
  if (proxy.metric_result.available) assert.equal(proxy.metric_result.basis, "proxy");

  assert.equal(report.deliveryHealth.some((row) => row.metric === "Change failure rate"), false);
  const measured = report.deliveryHealth.find((row) => row.metric === "Change failure rate (observed)");
  assert.ok(measured);
  assert.equal(measured.metric_result.available, false);
});

test("a complete observation fixture reaches the report with expected values and sample sizes", () => {
  const root = tmpRoot();
  initRepo(root);
  const now = new Date("2026-01-20T00:00:00Z");
  const dir = path.join(root, "artifacts", "metrics");
  fs.mkdirSync(dir, { recursive: true });
  const coverage = (changeId: string) => ({
    change_id: changeId,
    revisions: ["r1"],
    from: "2025-12-21T00:00:00Z",
    through: "2026-01-20T00:00:00Z",
    kinds: ["review", "submission", "acceptance", "cost", "correction", "deployment", "defect", "decision-wait"],
    complete: true,
  });
  const event = (id: string, changeId: string, kind: string, observedAt: string, extra: Record<string, unknown>) => ({
    id,
    change_id: changeId,
    revision: "r1",
    observed_at: observedAt,
    source_ref: "operator-export",
    kind,
    ...extra,
  });
  fs.writeFileSync(
    path.join(dir, "delivery-observations.json"),
    JSON.stringify({
      schema_version: 1,
      source_kind: "operator-recorded",
      coverage: [coverage("change-a"), coverage("change-b")],
      events: [
        event("s1", "change-a", "submission", "2026-01-02T00:00:00Z", { attempt: 1 }),
        event("s2", "change-b", "submission", "2026-01-02T00:00:00Z", { attempt: 1 }),
        event("s3", "change-b", "submission", "2026-01-03T00:00:00Z", { attempt: 2 }),
        event("a1", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok-1" }),
        event("a2", "change-b", "acceptance", "2026-01-11T00:00:00Z", { attempt: 2, decision: "accepted", authority_ref: "ok-2" }),
        event("r1", "change-a", "review", "2026-01-05T00:00:00Z", { session_id: "sess-a", active_seconds: 600 }),
        event("r2", "change-b", "review", "2026-01-06T00:00:00Z", { session_id: "sess-b", active_seconds: 1200 }),
        event("c1", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "ca-1", currency: "USD", amount: 1, component: "agent" }),
        event("c2", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "ca-2", currency: "USD", amount: 0.5, component: "human" }),
        event("c3", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "ca-3", currency: "USD", amount: 0.5, component: "tooling" }),
        event("c4", "change-b", "cost", "2026-01-09T00:00:00Z", { charge_id: "cb-1", currency: "USD", amount: 2, component: "agent" }),
        event("c5", "change-b", "cost", "2026-01-09T00:00:00Z", { charge_id: "cb-2", currency: "USD", amount: 1, component: "human" }),
        event("c6", "change-b", "cost", "2026-01-09T00:00:00Z", { charge_id: "cb-3", currency: "USD", amount: 1, component: "tooling" }),
      ],
    }),
    "utf8",
  );

  const report = buildReport(root, undefined, now);
  const review = report.stageIndicators.find((row) => row.indicator.includes("human review effort"));
  assert.ok(review);
  assert.equal(review.metric_result.available, true);
  if (review.metric_result.available) {
    assert.equal(review.metric_result.value, "median 15.0 min/accepted change");
    assert.equal(review.metric_result.sampleSize, 2);
    assert.equal(review.metric_result.basis, "measured");
  }
  const firstPass = report.stageIndicators.find((row) => row.indicator.includes("first-pass acceptance"));
  assert.ok(firstPass);
  if (firstPass.metric_result.available) assert.equal(firstPass.metric_result.value, "1/2 accepted on attempt 1");
  const cost = report.stageIndicators.find((row) => row.indicator.includes("cost per accepted change (USD)"));
  assert.ok(cost);
  if (cost.metric_result.available) {
    assert.equal(cost.metric_result.value, "USD 3.00/accepted change");
    assert.equal(cost.metric_result.sampleSize, 2);
  }
});
