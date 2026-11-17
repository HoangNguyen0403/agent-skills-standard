// scripts/metrics/delivery.test.ts
//
// Design contract D corrective cases. Every assertion targets an observable value,
// sample size, coverage state, or rejection diagnostic — never prose or formatting.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildDeliveryIndicators, readDeliveryObservations } from "./delivery";
import type { GitPeriod } from "./git";
import { renderMarkdown } from "./report";
import type { MetricsReport } from "./types";
import type { DeliveryHealthRow, DeliveryIndicators, StageIndicatorRow } from "./types";

const ALL_KINDS = ["review", "decision-wait", "submission", "correction", "acceptance", "deployment", "defect", "cost"];
const FROM = "2026-01-01T00:00:00Z";
const THROUGH = "2026-02-01T00:00:00Z";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "metrics-delivery-"));
}

function writeObservations(root: string, file: unknown): void {
  const dir = path.join(root, "artifacts", "metrics");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "delivery-observations.json"), JSON.stringify(file), "utf8");
}

function periodOf(since: string, through: string): GitPeriod {
  const currentSince = new Date(since);
  const currentUntil = new Date(through);
  const windowMs = Math.max(currentUntil.getTime() - currentSince.getTime(), 1);
  return {
    currentSince,
    currentUntil,
    previousSince: new Date(currentSince.getTime() - windowMs),
    previousUntil: currentSince,
    label: "test window",
  };
}

const PERIOD = periodOf(FROM, THROUGH);

interface CoverageOptions {
  from?: string;
  through?: string;
  kinds?: string[];
  complete?: boolean;
  revisions?: string[];
}

function coverage(changeId: string, overrides: CoverageOptions = {}): Record<string, unknown> {
  return {
    change_id: changeId,
    revisions: overrides.revisions ?? ["r1"],
    from: overrides.from ?? FROM,
    through: overrides.through ?? THROUGH,
    kinds: overrides.kinds ?? ALL_KINDS,
    complete: overrides.complete ?? true,
  };
}

function event(
  id: string,
  changeId: string,
  kind: string,
  observedAt: string,
  extra: Record<string, unknown> = {},
  revision = "r1",
): Record<string, unknown> {
  return { id, change_id: changeId, revision, observed_at: observedAt, source_ref: "test-export", kind, ...extra };
}

function fileWith(events: Record<string, unknown>[], coverageRows: Record<string, unknown>[]): Record<string, unknown> {
  return { schema_version: 1, source_kind: "operator-recorded", coverage: coverageRows, events };
}

function reads(file: unknown): DeliveryIndicators {
  const root = tmpRoot();
  writeObservations(root, file);
  const set = readDeliveryObservations(root);
  return buildDeliveryIndicators(set, PERIOD);
}

function rejected(file: unknown): string[] {
  const root = tmpRoot();
  writeObservations(root, file);
  const set = readDeliveryObservations(root);
  assert.equal(set.observations, null);
  return set.issues.map((issue) => issue.message);
}

function stageRow(result: DeliveryIndicators, needle: string): StageIndicatorRow {
  const row = result.stageIndicators.find((candidate) => candidate.indicator.includes(needle));
  assert.ok(row, `missing stage indicator containing "${needle}"`);
  return row;
}

function healthRow(result: DeliveryIndicators, needle: string): DeliveryHealthRow {
  const row = result.deliveryHealth.find((candidate) => candidate.metric.includes(needle));
  assert.ok(row, `missing delivery-health row containing "${needle}"`);
  return row;
}

function defaultCosts(): Record<string, unknown>[][] {
  return [
    [
      event("cost-a-agent", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "ca-1", currency: "USD", amount: 1, component: "agent" }),
      event("cost-a-human", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "ca-2", currency: "USD", amount: 0.5, component: "human" }),
      event("cost-a-tool", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "ca-3", currency: "USD", amount: 0.5, component: "tooling" }),
    ],
    [
      event("cost-b-agent", "change-b", "cost", "2026-01-09T00:00:00Z", { charge_id: "cb-1", currency: "USD", amount: 2, component: "agent" }),
      event("cost-b-human", "change-b", "cost", "2026-01-09T00:00:00Z", { charge_id: "cb-2", currency: "USD", amount: 1, component: "human" }),
      event("cost-b-tool", "change-b", "cost", "2026-01-09T00:00:00Z", { charge_id: "cb-3", currency: "USD", amount: 1, component: "tooling" }),
    ],
  ];
}

/** Two accepted changes: review totals 600 s and 1,200 s, attempts 1 and 2, USD 2 and USD 4. */
function arithmeticFixture(costs: Record<string, unknown>[][] = defaultCosts()): Record<string, unknown> {
  return fileWith(
    [
      event("sub-a", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("sub-b1", "change-b", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("sub-b2", "change-b", "submission", "2026-01-05T00:00:00Z", { attempt: 2 }),
      event("acc-a", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "approval-1" }),
      event("acc-b", "change-b", "acceptance", "2026-01-11T00:00:00Z", { attempt: 2, decision: "accepted", authority_ref: "approval-2" }),
      event("review-a", "change-a", "review", "2026-01-06T00:00:00Z", { session_id: "session-a", active_seconds: 600 }),
      event("review-b", "change-b", "review", "2026-01-07T00:00:00Z", { session_id: "session-b", active_seconds: 1200 }),
      ...costs[0],
      ...costs[1],
    ],
    [coverage("change-a"), coverage("change-b")],
  );
}

function deployment(
  id: string,
  changeId: string,
  deploymentId: string,
  deployedAt: string,
  firstChangeAt: string,
  revision = "r1",
): Record<string, unknown> {
  return event(
    id,
    changeId,
    "deployment",
    deployedAt,
    { deployment_id: deploymentId, environment: "production", first_change_at: firstChangeAt, deployed_at: deployedAt },
    revision,
  );
}

function defect(
  id: string,
  changeId: string,
  deploymentId: string,
  detectedAt: string,
  remediation: "hotfix" | "rollback" | "none",
  restoredAt: string | null,
  revision = "r1",
): Record<string, unknown> {
  return event(
    id,
    changeId,
    "defect",
    detectedAt,
    { deployment_id: deploymentId, remediation, detected_at: detectedAt, restored_at: restoredAt },
    revision,
  );
}

// --- Arithmetic -----------------------------------------------------------

test("two complete review totals of 600 s and 1,200 s yield a median of 15 minutes per accepted change", () => {
  const row = stageRow(reads(arithmeticFixture()), "human review effort");
  assert.equal(row.metric_result.available, true);
  if (!row.metric_result.available) return;
  assert.equal(row.metric_result.value, "median 15.0 min/accepted change");
  assert.equal(row.metric_result.basis, "measured");
  assert.equal(row.metric_result.sampleSize, 2);
  assert.equal(row.metric_result.coverage, "complete");
});

test("acceptance on attempts 1 and 2 yields first-pass acceptance 1/2", () => {
  const row = stageRow(reads(arithmeticFixture()), "first-pass acceptance");
  assert.equal(row.metric_result.available, true);
  if (!row.metric_result.available) return;
  assert.equal(row.metric_result.value, "1/2 accepted on attempt 1");
  assert.equal(row.metric_result.sampleSize, 2);
});

test("explicit USD costs 2 and 4 with complete component coverage yield USD 3 per accepted change", () => {
  const row = stageRow(reads(arithmeticFixture()), "cost per accepted change (USD)");
  assert.equal(row.metric_result.available, true);
  if (!row.metric_result.available) return;
  assert.equal(row.metric_result.value, "USD 3.00/accepted change");
  assert.equal(row.metric_result.sampleSize, 2);
  assert.equal(row.metric_result.coverage, "complete");
});

test("a missing human cost component makes total cost unavailable, not USD 3", () => {
  const complete = arithmeticFixture();
  const events = (complete.events as Record<string, unknown>[]).filter(
    (candidate) => !(candidate.kind === "cost" && candidate.component === "human"),
  );
  const result = reads(fileWith(events, complete.coverage as Record<string, unknown>[]));

  assert.equal(stageRow(result, "cost per accepted change (USD) (measured)").metric_result.available, false);
  const partial = stageRow(result, "partial components");
  assert.equal(partial.metric_result.available, true);
  if (!partial.metric_result.available) return;
  assert.match(partial.metric_result.value, /agent USD 1\.50/);
  assert.match(partial.metric_result.value, /tooling USD 0\.75/);
  assert.equal(partial.metric_result.coverage, "partial");
});

// --- M1: lifecycle isolation ---------------------------------------------

test("post-acceptance work and later revisions never change the accepted cohort totals", () => {
  const file = fileWith(
    [
      event("sub-r1", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }, "r1"),
      event("sub-r2", "change-a", "submission", "2026-01-04T00:00:00Z", { attempt: 2 }, "r2"),
      event("acc-r2", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 2, decision: "accepted", authority_ref: "ok" }, "r2"),
      event("review-r1", "change-a", "review", "2026-01-05T00:00:00Z", { session_id: "s-r1", active_seconds: 600 }, "r1"),
      event("review-r2", "change-a", "review", "2026-01-07T00:00:00Z", { session_id: "s-r2", active_seconds: 1200 }, "r2"),
      event("corr-r1", "change-a", "correction", "2026-01-06T00:00:00Z", { round_id: "round-1" }, "r1"),
      event("cost-r1-agent", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "c1", currency: "USD", amount: 1, component: "agent" }, "r1"),
      event("cost-r1-human", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "c2", currency: "USD", amount: 1, component: "human" }, "r1"),
      event("cost-r1-tool", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "c3", currency: "USD", amount: 1, component: "tooling" }, "r1"),
      // Post-acceptance work and a later revision: must not enter the closed cohort.
      event("review-r2-post", "change-a", "review", "2026-01-15T00:00:00Z", { session_id: "s-post-r2", active_seconds: 5000 }, "r2"),
      event("review-r3", "change-a", "review", "2026-01-16T00:00:00Z", { session_id: "s-r3", active_seconds: 5000 }, "r3"),
      event("corr-r3", "change-a", "correction", "2026-01-17T00:00:00Z", { round_id: "round-late" }, "r3"),
      event("cost-r3", "change-a", "cost", "2026-01-18T00:00:00Z", { charge_id: "late", currency: "USD", amount: 100, component: "agent" }, "r3"),
    ],
    [coverage("change-a", { revisions: ["r1", "r2", "r3"] })],
  );
  const result = reads(file);

  const review = stageRow(result, "human review effort");
  assert.equal(review.metric_result.available, true);
  if (review.metric_result.available) {
    assert.equal(review.metric_result.value, "median 30.0 min/accepted change");
    assert.equal(review.metric_result.sampleSize, 1);
  }
  const corrections = stageRow(result, "correction rounds");
  assert.equal(corrections.metric_result.available, true);
  if (corrections.metric_result.available) {
    assert.equal(corrections.metric_result.value, "median 1.0 correction round(s)/accepted change");
  }
  const cost = stageRow(result, "cost per accepted change (USD)");
  assert.equal(cost.metric_result.available, true);
  if (cost.metric_result.available) assert.equal(cost.metric_result.value, "USD 3.00/accepted change");
});

// --- M2: interval coverage, not point coverage ---------------------------

test("point-only review coverage cannot support a complete lifecycle total", () => {
  const file = fileWith(
    [
      event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
      event("review", "change-a", "review", "2026-01-06T00:00:00Z", { session_id: "s", active_seconds: 600 }),
    ],
    [
      coverage("change-a", { from: "2026-01-06T00:00:00Z", through: "2026-01-06T00:00:00Z", kinds: ["review"] }),
      coverage("change-a", { kinds: ["submission", "acceptance"] }),
    ],
  );
  const row = stageRow(reads(file), "human review effort");
  assert.equal(row.metric_result.available, false);
});

test("a lifecycle gap with no exported event keeps review totals unavailable", () => {
  const file = fileWith(
    [
      event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
      event("review", "change-a", "review", "2026-01-06T00:00:00Z", { session_id: "s", active_seconds: 600 }),
    ],
    [
      coverage("change-a", { from: "2026-01-03T00:00:00Z", through: "2026-01-05T00:00:00Z", kinds: ["review"] }),
      coverage("change-a", { from: "2026-01-07T00:00:00Z", through: "2026-01-10T00:00:00Z", kinds: ["review"] }),
      coverage("change-a", { kinds: ["submission", "acceptance"] }),
    ],
  );
  assert.equal(stageRow(reads(file), "human review effort").metric_result.available, false);
});

test("three covered components plus an uncovered charge keep total cost unavailable", () => {
  const file = fileWith(
    [
      event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
      event("c1", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "c1", currency: "USD", amount: 1, component: "agent" }),
      event("c2", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "c2", currency: "USD", amount: 1, component: "human" }),
      event("c3", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "c3", currency: "USD", amount: 1, component: "tooling" }),
      event("c4", "change-a", "cost", "2026-01-09T00:00:00Z", { charge_id: "c4", currency: "USD", amount: 10, component: "agent" }),
    ],
    [
      coverage("change-a", { from: "2026-01-03T00:00:00Z", through: "2026-01-08T00:00:00Z", kinds: ["cost"] }),
      coverage("change-a", { kinds: ["submission", "acceptance"] }),
    ],
  );
  const result = reads(file);
  const total = stageRow(result, "cost per accepted change (USD) (measured)");
  assert.equal(total.metric_result.available, false);
  if (!total.metric_result.available) assert.match(total.metric_result.reason, /uncovered|coverage/);
  const partial = stageRow(result, "partial components");
  assert.equal(partial.metric_result.available, true);
  if (partial.metric_result.available) assert.equal(partial.metric_result.coverage, "partial");
});

test("one uncovered wait keeps the wait row from claiming complete coverage", () => {
  const file = fileWith(
    [
      event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
      event("w1", "change-a", "decision-wait", "2026-01-04T00:00:00Z", { decision_id: "d1", opened_at: "2026-01-04T00:00:00Z", resolved_at: "2026-01-05T00:00:00Z" }),
      event("w2", "change-a", "decision-wait", "2026-01-08T00:00:00Z", { decision_id: "d2", opened_at: "2026-01-08T00:00:00Z", resolved_at: "2026-01-09T00:00:00Z" }),
    ],
    [
      coverage("change-a", { from: "2026-01-03T00:00:00Z", through: "2026-01-06T00:00:00Z", kinds: ["decision-wait"] }),
      coverage("change-a", { kinds: ["submission", "acceptance"] }),
    ],
  );
  const row = stageRow(reads(file), "decision wait");
  assert.equal(row.metric_result.available, false);
});

// --- M3: domain identity canonicalization --------------------------------

test("equivalent replays with different ids for one session count once", () => {
  const fixture = arithmeticFixture();
  const events = fixture.events as Record<string, unknown>[];
  const review = events.find((candidate) => candidate.id === "review-a")!;
  const result = reads(fileWith([...events, { ...review, id: "review-a-replay" }], fixture.coverage as Record<string, unknown>[]));
  const row = stageRow(result, "human review effort");
  assert.equal(row.metric_result.available, true);
  if (!row.metric_result.available) return;
  assert.equal(row.metric_result.sampleSize, 2);
  assert.equal(row.metric_result.value, "median 15.0 min/accepted change");
});

test("input order does not change review or cost values", () => {
  const fixture = arithmeticFixture();
  const forward = reads(fixture);
  const reversed = reads(fileWith(
    [...(fixture.events as Record<string, unknown>[])].reverse(),
    fixture.coverage as Record<string, unknown>[],
  ));
  for (const needle of ["human review effort", "cost per accepted change (USD)"]) {
    const a = stageRow(forward, needle).metric_result;
    const b = stageRow(reversed, needle).metric_result;
    assert.equal(a.available, true);
    assert.equal(b.available, true);
    if (a.available && b.available) assert.equal(a.value, b.value);
  }
});

test("conflicting domain payloads reject the export, even with distinct ids", () => {
  const fixture = arithmeticFixture();
  const events = fixture.events as Record<string, unknown>[];
  const review = events.find((candidate) => candidate.id === "review-a")!;
  const issues = rejected(
    fileWith([...events, { ...review, id: "review-conflict", active_seconds: 60 }], fixture.coverage as Record<string, unknown>[]),
  );
  assert.ok(issues.some((issue) => /conflicting payload for review session/.test(issue)));

  const cost = events.find((candidate) => candidate.id === "cost-a-agent")!;
  const costIssues = rejected(
    fileWith([...events, { ...cost, id: "cost-conflict", amount: 9 }], fixture.coverage as Record<string, unknown>[]),
  );
  assert.ok(costIssues.some((issue) => /conflicting payload for charge/.test(issue)));
});

test("conflicting acceptance decisions for one tuple reject the export", () => {
  const fixture = arithmeticFixture();
  const events = fixture.events as Record<string, unknown>[];
  const acceptance = events.find((candidate) => candidate.id === "acc-a")!;
  const issues = rejected(
    fileWith([...events, { ...acceptance, id: "acc-a-rejected", decision: "rejected" }], fixture.coverage as Record<string, unknown>[]),
  );
  assert.ok(issues.some((issue) => /conflicting payload for acceptance tuple/.test(issue)));
});

test("duplicate deployment ids are canonicalized in every DORA calculation", () => {
  const base = [
    deployment("dep1", "change-a", "deploy-1", "2026-01-11T00:00:00Z", "2026-01-02T00:00:00Z"),
    defect("def1", "change-a", "deploy-1", "2026-01-12T00:00:00Z", "hotfix", "2026-01-12T02:00:00Z"),
  ];
  const covers = [coverage("change-a")];

  const replay = reads(fileWith([...base, { ...base[0], id: "dep1-replay" }], covers));
  const frequency = healthRow(replay, "Deployment frequency");
  assert.equal(frequency.metric_result.available, true);
  if (frequency.metric_result.available) assert.match(frequency.metric_result.value, /^1 observed/);

  const conflictIssues = rejected(fileWith([...base, { ...base[0], id: "dep1-conflict", deployed_at: "2026-01-13T00:00:00Z" }], covers));
  assert.ok(conflictIssues.some((issue) => /conflicting payload for deployment/.test(issue)));
});

// --- M4: DORA population before coverage filtering -----------------------

test("an uncovered deployment lowers coverage instead of disappearing from frequency", () => {
  const file = fileWith(
    [
      deployment("dep-a", "change-a", "deploy-a", "2026-01-11T00:00:00Z", "2026-01-02T00:00:00Z"),
      deployment("dep-b", "change-b", "deploy-b", "2026-01-12T00:00:00Z", "2026-01-03T00:00:00Z"),
    ],
    [coverage("change-a")],
  );
  const result = reads(file);
  const frequency = healthRow(result, "Deployment frequency");
  assert.equal(frequency.metric_result.available, true);
  if (!frequency.metric_result.available) return;
  assert.match(frequency.metric_result.value, /^1 of 2/);
  assert.equal(frequency.metric_result.coverage, "partial");

  const cfr = healthRow(result, "Change failure rate");
  assert.equal(cfr.metric_result.available, false);
});

test("point-only deployment coverage cannot prove a complete frequency", () => {
  const file = fileWith(
    [deployment("dep", "change-a", "deploy-1", "2026-01-11T00:00:00Z", "2026-01-02T00:00:00Z")],
    [coverage("change-a", { from: "2026-01-11T00:00:00Z", through: "2026-01-11T00:00:00Z" })],
  );
  const frequency = healthRow(reads(file), "Deployment frequency");
  assert.equal(frequency.metric_result.available, true);
  if (frequency.metric_result.available) assert.equal(frequency.metric_result.coverage, "partial");
  assert.equal(healthRow(reads(file), "Change failure rate").metric_result.available, false);
});

test("an r2 deployment with incident coverage only for r1 cannot claim a failure-free rate", () => {
  const file = fileWith(
    [deployment("dep", "change-a", "deploy-2", "2026-01-11T00:00:00Z", "2026-01-02T00:00:00Z", "r2")],
    [
      coverage("change-a", { revisions: ["r1", "r2"], kinds: ["deployment"] }),
      coverage("change-a", { revisions: ["r1"], kinds: ["defect"] }),
    ],
  );
  const cfr = healthRow(reads(file), "Change failure rate");
  assert.equal(cfr.metric_result.available, false);
  if (!cfr.metric_result.available) assert.match(cfr.metric_result.reason, /incident coverage/);
});

test("acceptance-only coverage cannot prove zero escaped defects for a deployment", () => {
  const file = fileWith(
    [
      event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
      deployment("dep", "change-a", "deploy-1", "2026-01-11T00:00:00Z", "2026-01-02T00:00:00Z"),
    ],
    [
      coverage("change-a", { from: "2026-01-10T00:00:00Z", through: "2026-01-10T00:00:00Z", kinds: ["submission", "acceptance"] }),
    ],
  );
  const row = stageRow(reads(file), "escaped defects");
  assert.equal(row.metric_result.available, false);
});

test("January as-of failure and escape metrics are unchanged by future events", () => {
  const events = [
    event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
    event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
    deployment("dep-jan", "change-a", "deploy-jan", "2026-01-11T00:00:00Z", "2026-01-02T00:00:00Z"),
    defect("def-at-horizon", "change-a", "deploy-jan", "2026-02-01T00:00:00Z", "hotfix", "2026-02-01T01:00:00Z"),
    defect("def-future", "change-a", "deploy-jan", "2026-02-10T00:00:00Z", "hotfix", "2026-02-11T00:00:00Z"),
    deployment("dep-feb", "change-a", "deploy-feb", "2026-02-02T00:00:00Z", "2026-01-02T00:00:00Z"),
  ];
  const coverageRows = [coverage("change-a", { from: "2026-01-01T00:00:00Z", through: "2026-03-01T00:00:00Z" })];
  const baseline = reads(fileWith(events.slice(0, 3), coverageRows));
  const extended = reads(fileWith(events, coverageRows));

  const baselineCfr = healthRow(baseline, "Change failure rate").metric_result;
  const extendedCfr = healthRow(extended, "Change failure rate").metric_result;
  assert.deepEqual(extendedCfr, baselineCfr);
  assert.equal(extendedCfr.available, true);
  if (extendedCfr.available) {
    assert.equal(extendedCfr.sampleSize, 1);
    assert.equal(extendedCfr.coverage, "complete");
  }

  const baselineEscapes = stageRow(baseline, "escaped defects").metric_result;
  const extendedEscapes = stageRow(extended, "escaped defects").metric_result;
  assert.deepEqual(extendedEscapes, baselineEscapes);
  assert.equal(extendedEscapes.available, true);
  if (extendedEscapes.available) {
    assert.equal(extendedEscapes.sampleSize, 0);
    assert.equal(extendedEscapes.coverage, "complete");
  }
});

// --- M5: domain-time windows and censoring --------------------------------

test("a late-exported January deployment remains a January deployment", () => {
  const file = fileWith(
    [
      deployment("dep", "change-a", "deploy-1", "2026-01-11T00:00:00Z", "2026-01-02T00:00:00Z"),
      event("late-export", "change-a", "review", "2026-02-15T00:00:00Z", { session_id: "export-late", active_seconds: 60 }),
    ],
    [coverage("change-a")],
  );
  const frequency = healthRow(reads(file), "Deployment frequency");
  assert.equal(frequency.metric_result.available, true);
  if (frequency.metric_result.available) {
    assert.match(frequency.metric_result.value, /^1 observed/);
    assert.equal(frequency.metric_result.coverage, "complete");
  }
});

test("restoration beyond the report horizon is censored, not a completed duration", () => {
  const file = fileWith(
    [
      deployment("dep", "change-a", "deploy-1", "2026-01-11T00:00:00Z", "2026-01-02T00:00:00Z"),
      defect("def", "change-a", "deploy-1", "2026-01-12T00:00:00Z", "hotfix", "2026-02-10T00:00:00Z"),
    ],
    [coverage("change-a")],
  );
  const restore = healthRow(reads(file), "Time to restore");
  assert.equal(restore.metric_result.available, false);
  if (!restore.metric_result.available) assert.match(restore.metric_result.reason, /censored/);
});

test("a mixed restored/unrestored incident cohort is partial, never complete", () => {
  const file = fileWith(
    [
      deployment("dep-1", "change-a", "deploy-1", "2026-01-11T00:00:00Z", "2026-01-02T00:00:00Z"),
      deployment("dep-2", "change-a", "deploy-2", "2026-01-11T00:00:00Z", "2026-01-02T00:00:00Z"),
      defect("def-1", "change-a", "deploy-1", "2026-01-12T00:00:00Z", "hotfix", "2026-01-12T03:00:00Z"),
      defect("def-2", "change-a", "deploy-2", "2026-01-12T00:00:00Z", "none", null),
    ],
    [coverage("change-a")],
  );
  const restore = healthRow(reads(file), "Time to restore");
  assert.equal(restore.metric_result.available, true);
  if (!restore.metric_result.available) return;
  assert.equal(restore.metric_result.value, "median 3.0h (1 restored incident(s))");
  assert.equal(restore.metric_result.coverage, "partial");
});

// --- M6: chronology and calendar validation ------------------------------

test("an acceptance before its submission is rejected", () => {
  const fixture = arithmeticFixture();
  const events = (fixture.events as Record<string, unknown>[]).map((candidate) =>
    candidate.id === "acc-a" ? { ...candidate, observed_at: "2026-01-02T00:00:00Z" } : candidate,
  );
  const issues = rejected(fileWith(events, fixture.coverage as Record<string, unknown>[]));
  assert.ok(issues.some((issue) => /precedes its submission/.test(issue)));
});

test("a defect detected before its deployment is rejected", () => {
  const file = fileWith(
    [
      deployment("dep", "change-a", "deploy-1", "2026-01-11T00:00:00Z", "2026-01-02T00:00:00Z"),
      defect("def", "change-a", "deploy-1", "2026-01-05T00:00:00Z", "hotfix", null),
    ],
    [coverage("change-a")],
  );
  const issues = rejected(file);
  assert.ok(issues.some((issue) => /precedes deployment/.test(issue)));
});

test("impossible calendar dates and non-UTC strings are rejected", () => {
  const fixture = arithmeticFixture();
  const events = fixture.events as Record<string, unknown>[];
  const invalidCalendar = events.map((candidate) =>
    candidate.id === "review-a" ? { ...candidate, observed_at: "2026-02-30T00:00:00Z" } : candidate,
  );
  const first = rejected(fileWith(invalidCalendar, fixture.coverage as Record<string, unknown>[]));
  assert.ok(first.some((issue) => /observed_at must be a valid UTC ISO timestamp/.test(issue)));

  const nonUtc = events.map((candidate) =>
    candidate.id === "review-a" ? { ...candidate, observed_at: "2026-01-06 00:00:00" } : candidate,
  );
  const second = rejected(fileWith(nonUtc, fixture.coverage as Record<string, unknown>[]));
  assert.ok(second.some((issue) => /observed_at must be a valid UTC ISO timestamp/.test(issue)));
});

// --- M7: escaped defects independent of remediation ----------------------

test("a remediation:none defect remains visible as an escaped defect", () => {
  const file = fileWith(
    [
      event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
      deployment("dep", "change-a", "deploy-1", "2026-01-11T00:00:00Z", "2026-01-02T00:00:00Z"),
      defect("def", "change-a", "deploy-1", "2026-01-12T00:00:00Z", "none", "2026-01-12T01:00:00Z"),
    ],
    [coverage("change-a")],
  );
  const row = stageRow(reads(file), "escaped defects");
  assert.equal(row.metric_result.available, true);
  if (!row.metric_result.available) return;
  assert.equal(
    row.metric_result.value,
    "1 escaped defect observation(s) across 1 deployment(s); 0/1 deployment(s) with hotfix/rollback; 0 rollback(s)",
  );
});

test("multiple defects on one deployment count separately as observations but once as a failed deployment", () => {
  const file = fileWith(
    [
      event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
      deployment("dep", "change-a", "deploy-1", "2026-01-11T00:00:00Z", "2026-01-02T00:00:00Z"),
      defect("def-1", "change-a", "deploy-1", "2026-01-12T00:00:00Z", "hotfix", "2026-01-12T02:00:00Z"),
      defect("def-2", "change-a", "deploy-1", "2026-01-13T00:00:00Z", "hotfix", null),
    ],
    [coverage("change-a")],
  );
  const row = stageRow(reads(file), "escaped defects");
  assert.equal(row.metric_result.available, true);
  if (!row.metric_result.available) return;
  assert.equal(
    row.metric_result.value,
    "2 escaped defect observation(s) across 1 deployment(s); 1/1 deployment(s) with hotfix/rollback; 0 rollback(s)",
  );
  assert.equal(row.metric_result.sampleSize, 2);
});

// --- M8: zero corrections require lifecycle coverage ---------------------

test("a lifecycle wholly inside the period proves zero corrections with lifecycle-only coverage", () => {
  const file = fileWith(
    [
      event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
    ],
    [
      coverage("change-a", { from: "2026-01-03T00:00:00Z", through: "2026-01-10T00:00:00Z", kinds: ["correction"] }),
      coverage("change-a", { kinds: ["submission", "acceptance"] }),
    ],
  );
  const row = stageRow(reads(file), "correction rounds");
  assert.equal(row.metric_result.available, true);
  if (!row.metric_result.available) return;
  assert.equal(row.metric_result.value, "median 0.0 correction round(s)/accepted change");
  assert.equal(row.metric_result.coverage, "complete");
});

test("a cross-period lifecycle without its earlier correction coverage cannot claim zero", () => {
  const file = fileWith(
    [
      event("sub", "change-a", "submission", "2025-12-20T00:00:00Z", { attempt: 1 }),
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
    ],
    [
      coverage("change-a", { from: "2026-01-01T00:00:00Z", through: "2026-01-10T00:00:00Z", kinds: ["correction"] }),
      coverage("change-a", { kinds: ["submission", "acceptance"] }),
    ],
  );
  const row = stageRow(reads(file), "correction rounds");
  assert.equal(row.metric_result.available, false);
});

test("zero-duration lifecycle needs declared point coverage for zero waits and corrections", () => {
  const at = "2026-01-10T00:00:00Z";
  const events = [
    event("sub", "change-a", "submission", at, { attempt: 1 }),
    event("acc", "change-a", "acceptance", at, { attempt: 1, decision: "accepted", authority_ref: "ok" }),
  ];
  const withoutMeasurementCoverage = reads(
    fileWith(events, [coverage("change-a", { from: at, through: at, kinds: ["submission", "acceptance"] })]),
  );
  assert.equal(stageRow(withoutMeasurementCoverage, "correction rounds").metric_result.available, false);
  assert.equal(stageRow(withoutMeasurementCoverage, "decision wait").metric_result.available, false);

  const withPointCoverage = reads(
    fileWith(events, [
      coverage("change-a", { from: at, through: at, kinds: ["submission", "acceptance"] }),
      coverage("change-a", { from: at, through: at, kinds: ["correction", "decision-wait"] }),
    ]),
  );
  const corrections = stageRow(withPointCoverage, "correction rounds").metric_result;
  assert.equal(corrections.available, true);
  if (corrections.available) {
    assert.equal(corrections.value, "median 0.0 correction round(s)/accepted change");
    assert.equal(corrections.coverage, "complete");
  }
  const waits = stageRow(withPointCoverage, "decision wait").metric_result;
  assert.equal(waits.available, true);
  if (waits.available) {
    assert.equal(waits.value, "no completed decision wait; 0 pending and 0 censored");
    assert.equal(waits.coverage, "complete");
  }
});


// --- Preserved behavior --------------------------------------------------

test("an exact event replay is counted once, not twice", () => {
  const fixture = arithmeticFixture();
  const events = fixture.events as Record<string, unknown>[];
  const review = events.find((candidate) => candidate.id === "review-a")!;
  const result = reads(fileWith([...events, { ...review }], fixture.coverage as Record<string, unknown>[]));
  const row = stageRow(result, "human review effort");
  assert.equal(row.metric_result.available, true);
  if (!row.metric_result.available) return;
  assert.equal(row.metric_result.sampleSize, 2);
  assert.equal(row.metric_result.value, "median 15.0 min/accepted change");
});

test("a duplicate id with a conflicting payload rejects the export", () => {
  const fixture = arithmeticFixture();
  const events = fixture.events as Record<string, unknown>[];
  const review = events.find((candidate) => candidate.id === "review-a")!;
  const issues = rejected(fileWith([...events, { ...review, active_seconds: 60 }], fixture.coverage as Record<string, unknown>[]));
  assert.ok(issues.some((issue) => /duplicate id with a conflicting payload/.test(issue)));
});

test("negative and non-finite measurements reject the export", () => {
  const fixture = arithmeticFixture();
  const events = fixture.events as Record<string, unknown>[];
  const negative = events.map((candidate) =>
    candidate.id === "review-a" ? { ...candidate, active_seconds: -5 } : candidate,
  );
  const first = rejected(fileWith(negative, fixture.coverage as Record<string, unknown>[]));
  assert.ok(first.some((issue) => /active_seconds must be a finite non-negative number/.test(issue)));

  const nonFinite = events.map((candidate) => (candidate.id === "cost-a-agent" ? { ...candidate, amount: null } : candidate));
  const second = rejected(fileWith(nonFinite, fixture.coverage as Record<string, unknown>[]));
  assert.ok(second.some((issue) => /amount must be a finite non-negative number/.test(issue)));
});

test("an acceptance that does not match a submission's attempt and revision is rejected", () => {
  const fixture = arithmeticFixture();
  const events = (fixture.events as Record<string, unknown>[]).map((candidate) =>
    candidate.id === "acc-b" ? { ...candidate, attempt: 3 } : candidate,
  );
  const issues = rejected(fileWith(events, fixture.coverage as Record<string, unknown>[]));
  assert.ok(issues.some((issue) => /no matching submission/.test(issue)));
});

test("a defect referencing an unknown deployment is rejected", () => {
  const file = fileWith(
    [
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
      event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      defect("def", "change-a", "missing-deploy", "2026-01-12T00:00:00Z", "hotfix", null),
    ],
    [coverage("change-a")],
  );
  const issues = rejected(file);
  assert.ok(issues.some((issue) => /unknown deployment_id/.test(issue)));
});

test("invalid JSON and a missing observation file are distinct, both unavailable", () => {
  const root = tmpRoot();
  const missing = readDeliveryObservations(root);
  assert.deepEqual(missing, { observations: null, issues: [] });
  const missingResult = buildDeliveryIndicators(missing, PERIOD);
  for (const row of [...missingResult.deliveryHealth, ...missingResult.stageIndicators]) {
    assert.equal(row.metric_result.available, false);
    if (row.metric_result.available) continue;
    assert.match(row.metric_result.reason, /no artifacts\/metrics\/delivery-observations\.json supplied/);
  }

  const dir = path.join(root, "artifacts", "metrics");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "delivery-observations.json"), "{ not json", "utf8");
  const broken = readDeliveryObservations(root);
  assert.equal(broken.observations, null);
  assert.ok(broken.issues.some((issue) => /failed to parse JSON/.test(issue.message)));
});

test("missing cost coverage is not an observed zero cost", () => {
  const fixture = arithmeticFixture();
  const result = reads(
    fileWith(fixture.events as Record<string, unknown>[], [
      coverage("change-a", { kinds: ["review", "submission", "acceptance"] }),
      coverage("change-b", { kinds: ["review", "submission", "acceptance"] }),
    ]),
  );
  const total = stageRow(result, "cost per accepted change");
  assert.equal(total.metric_result.available, false);
});

test("explicitly observed zero cost is a measured zero, not unavailable", () => {
  const file = fileWith(
    [
      event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
      event("z1", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "za", currency: "USD", amount: 0, component: "agent" }),
      event("z2", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "zb", currency: "USD", amount: 0, component: "human" }),
      event("z3", "change-a", "cost", "2026-01-08T00:00:00Z", { charge_id: "zc", currency: "USD", amount: 0, component: "tooling" }),
    ],
    [coverage("change-a")],
  );
  const row = stageRow(reads(file), "cost per accepted change (USD)");
  assert.equal(row.metric_result.available, true);
  if (!row.metric_result.available) return;
  assert.equal(row.metric_result.value, "USD 0.00/accepted change");
  assert.equal(row.metric_result.coverage, "complete");
});

test("an unresolved decision wait is reported as pending, not completed", () => {
  const file = fileWith(
    [
      event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
      event("wait-1", "change-a", "decision-wait", "2026-01-04T00:00:00Z", { decision_id: "d1", opened_at: "2026-01-04T00:00:00Z", resolved_at: "2026-01-06T00:00:00Z" }),
      event("wait-2", "change-a", "decision-wait", "2026-01-05T00:00:00Z", { decision_id: "d2", opened_at: "2026-01-05T00:00:00Z", resolved_at: null }),
    ],
    [coverage("change-a")],
  );
  const row = stageRow(reads(file), "decision wait");
  assert.equal(row.metric_result.available, true);
  if (!row.metric_result.available) return;
  assert.equal(row.metric_result.value, "median 48.0h completed across 1 decision(s); 1 pending and 0 censored");
  assert.equal(row.metric_result.sampleSize, 1);
  assert.equal(row.metric_result.coverage, "partial");
});

test("review work outside the declared lifecycle coverage excludes the change", () => {
  const file = fileWith(
    [
      event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
      event("review", "change-a", "review", "2026-01-20T00:00:00Z", { session_id: "s", active_seconds: 600 }),
    ],
    [
      coverage("change-a", { through: "2026-01-15T00:00:00Z", kinds: ["review"] }),
      coverage("change-a", { kinds: ["submission", "acceptance"] }),
    ],
  );
  assert.equal(stageRow(reads(file), "human review effort").metric_result.available, false);
});

test("acceptance exactly at the period start is included; at the period end it is excluded", () => {
  const file = fileWith(
    [
      event("sub-a", "change-a", "submission", "2026-01-01T00:00:00Z", { attempt: 1 }),
      event("acc-a", "change-a", "acceptance", "2026-01-01T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "a" }),
      event("sub-b", "change-b", "submission", "2026-01-01T00:00:00Z", { attempt: 1 }),
      event("acc-b", "change-b", "acceptance", "2026-02-01T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "b" }),
    ],
    [coverage("change-a"), coverage("change-b")],
  );
  const row = stageRow(reads(file), "first-pass acceptance");
  assert.equal(row.metric_result.available, true);
  if (!row.metric_result.available) return;
  assert.equal(row.metric_result.value, "1/1 accepted on attempt 1");
  assert.equal(row.metric_result.sampleSize, 1);
});

test("mixed currencies are reported separately and never combined", () => {
  const fixture = arithmeticFixture();
  const events = (fixture.events as Record<string, unknown>[]).map((candidate) =>
    candidate.change_id === "change-b" && candidate.kind === "cost" ? { ...candidate, currency: "EUR" } : candidate,
  );
  const result = reads(fileWith(events, fixture.coverage as Record<string, unknown>[]));
  assert.equal(stageRow(result, "cost per accepted change (USD)").metric_result.available, false);
  assert.equal(stageRow(result, "cost per accepted change (EUR)").metric_result.available, false);
  for (const row of result.stageIndicators) {
    if (!row.metric_result.available) continue;
    assert.doesNotMatch(row.metric_result.value, /USD.*EUR|EUR.*USD/);
  }
});

test("deployment lead time and time to restore use domain event times", () => {
  const file = fileWith(
    [
      event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
      deployment("dep", "change-a", "deploy-1", "2026-01-11T00:00:00Z", "2026-01-09T00:00:00Z"),
      defect("def", "change-a", "deploy-1", "2026-01-12T00:00:00Z", "rollback", "2026-01-12T03:00:00Z"),
    ],
    [coverage("change-a")],
  );
  const result = reads(file);
  const lead = healthRow(result, "Lead time for changes");
  assert.equal(lead.metric_result.available, true);
  if (lead.metric_result.available) assert.equal(lead.metric_result.value, "median 48.0h");
  const restore = healthRow(result, "Time to restore");
  assert.equal(restore.metric_result.available, true);
  if (restore.metric_result.available) assert.equal(restore.metric_result.value, "median 3.0h (1 restored incident(s))");
  const defects = stageRow(result, "escaped defects");
  assert.equal(defects.metric_result.available, true);
  if (defects.metric_result.available) assert.match(defects.metric_result.value, /1 rollback\(s\)/);
});

test("a deployment without incident coverage keeps the failure rate unavailable", () => {
  const file = fileWith(
    [
      event("sub", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      event("acc", "change-a", "acceptance", "2026-01-10T00:00:00Z", { attempt: 1, decision: "accepted", authority_ref: "ok" }),
      deployment("dep", "change-a", "deploy-1", "2026-01-11T00:00:00Z", "2026-01-02T00:00:00Z"),
    ],
    [
      coverage("change-a", { kinds: ["submission", "acceptance", "deployment", "review", "cost", "correction"] }),
    ],
  );
  const result = reads(file);
  const cfr = healthRow(result, "Change failure rate");
  assert.equal(cfr.metric_result.available, false);
  if (!cfr.metric_result.available) assert.match(cfr.metric_result.reason, /incident coverage/);
  assert.equal(stageRow(result, "escaped defects").metric_result.available, false);
});

// --- VER-6: isolation invariant ------------------------------------------

test("VER-6: adding dispatch activity never changes legacy indicator output", () => {
  const base = arithmeticFixture();
  const before = reads(base);

  const withDispatch = [
    ...(base.events as Record<string, unknown>[]),
    event("d-1", "change-a", "dispatch", "2026-01-02T00:00:00Z", {
      dispatch_id: "dispatch-1",
      role: "implementer",
      capability_hint: "standard",
      actual: { provider: "provider-a", model: "model-a", effort: "medium" },
      authority_ref: "authority-1",
      orchestrator_model: "model-orch",
      orchestrator_ref: "orch-1",
    }),
    event("dr-1", "change-a", "dispatch-round", "2026-01-03T00:00:00Z", { dispatch_id: "dispatch-1", round: 1 }),
    event("dv-1", "change-a", "dispatch-verdict", "2026-01-04T00:00:00Z", {
      dispatch_id: "dispatch-1",
      round: 1,
      verdict: "approved",
      reviewer_ref: "reviewer-1",
    }),
    event("da-1", "change-a", "dispatch-acceptance", "2026-01-05T00:00:00Z", {
      dispatch_id: "dispatch-1",
      round: 1,
      decision: "accepted",
      authority_ref: "authority-1",
    }),
    event("de-1", "change-a", "dispatch-end", "2026-01-06T00:00:00Z", {
      dispatch_id: "dispatch-1",
      state: "completed",
    }),
    event("du-1", "change-a", "dispatch-usage", "2026-01-06T01:00:00Z", {
      dispatch_id: "dispatch-1",
      actor: "worker",
      window_from: "2026-01-02T00:00:00Z",
      window_to: "2026-01-06T00:00:00Z",
      turns: 4,
      input_tokens: 900,
      cached_input_tokens: 100,
      cache_write_tokens: 0,
      output_tokens: 300,
      recorded_cost: 2.5,
      cost_basis: "host-recorded-estimate",
      coverage_complete: true,
      method_ref: "method-v1",
    }),
    event("di-1", "change-a", "dispatch-inventory", "2026-01-06T02:00:00Z", {
      orchestrator_ref: "orch-1",
      window_from: "2026-01-01T00:00:00Z",
      window_to: "2026-02-01T00:00:00Z",
      unrecorded_count: 0,
    }),
  ];
  const after = reads(fileWith(withDispatch, base.coverage as Record<string, unknown>[]));

  assert.deepEqual(after, before);
});

test("trust blocks are optional for legacy exports and malformed blocks reject the full export", () => {
  const legacy = fileWith([], []);
  const root = tmpRoot();
  writeObservations(root, legacy);
  assert.equal(readDeliveryObservations(root).observations?.trust, undefined);
  const invalid = { ...legacy, trust: { schema_version: 1, records: [], populations: [], coverage: "unknown" } };
  assert.match(rejected(invalid).join(" "), /trust\.coverage must be an array/);
});
function trustFixture(includeDeployment = false): Record<string, unknown> {
  const jan = "2026-01-01T00:00:00Z";
  const feb = "2026-02-01T00:00:00Z";
  const mar = "2026-03-01T00:00:00Z";
  const records = [
    {
      id: "class-r1", kind: "revision-class", observed_at: jan, source_ref: "policy-export",
      change_id: "change-1", revision: "r1", change_class: "unknown", policy_ref: "policy",
      policy_digest: "a".repeat(64),
    },
    {
      id: "review-1", kind: "agent-review", observed_at: jan, source_ref: "review-export",
      review_id: "review-1", change_id: "change-1", revision: "r1", completed_at: "2026-01-10T00:00:00Z",
      verdict: "approved", reviewer_configuration: { provider: "unknown", model: "model-x", effort: "unknown", mode: "unknown", features: {} },
      evidence_ref: "review-output", evidence_digest: "b".repeat(64),
    },
    {
      id: "review-2", kind: "agent-review", observed_at: feb, source_ref: "review-export",
      review_id: "review-2", change_id: "change-1", revision: "r1", completed_at: "2026-02-10T00:00:00Z",
      verdict: "approved", reviewer_configuration: { provider: "provider-x", model: "model-x", effort: "high", mode: "review", features: {} },
      evidence_ref: "review-output-2", evidence_digest: "c".repeat(64),
    },
    {
      id: "finding-1", kind: "human-finding", observed_at: feb, source_ref: "finding-export",
      finding_id: "finding-1", approval_review_id: "review-1", change_id: "change-1", revision: "r1",
      detected_at: "2026-01-20T00:00:00Z", severity: "Major", evidence_ref: "finding", evidence_digest: "d".repeat(64),
    },
    {
      id: "seed-1", kind: "seed-assignment", observed_at: jan, source_ref: "seed-export",
      seed_run_id: "seed-1", package_ref: "package", package_digest: "e".repeat(64), change_class: "unknown",
      assigned_at: "2026-01-05T00:00:00Z", evaluation_cutoff: "2026-01-20T00:00:00Z",
      expected_defects: [{ id: "bug-1", severity: "Blocker" }], evidence_ref: "seed-assignment",
      evidence_digest: "f".repeat(64),
    },
    {
      id: "seed-result-1", kind: "seed-result", observed_at: feb, source_ref: "seed-export",
      seed_run_id: "seed-1", completed_at: "2026-01-19T00:00:00Z", detected_seed_ids: [],
      reviewer_configuration: { provider: "unknown", model: "unknown", effort: "unknown", mode: "unknown", features: {} },
      review_output_ref: "seed-result", review_output_digest: "1".repeat(64),
    },
    {
      id: "grant-1", kind: "grant-reference", observed_at: jan, source_ref: "grant-export",
      grant_id: "grant-1", change_class: "unknown", scope: { change_id: "change-1", revision: "r1" }, evidence_cutoff: "2026-01-10T00:00:00Z",
      effective_from: "2026-01-01T00:00:00Z", effective_until: null, revoked_at: null, suspended_at: null,
      independent_validation_ref: "validation",
    },
  ];
  if (includeDeployment) {
    const classification = records.find((record) => record.kind === "revision-class");
    const grant = records.find((record) => record.kind === "grant-reference");
    if (classification) classification.change_class = "leaf";
    if (grant) grant.change_class = "leaf";
  }
  const kinds = ["revision-class", "agent-review", "human-finding", "seed-assignment", "seed-result", "grant-reference", "deployment", "defect"];
  const coverage = kinds.map((kind) => ({
    kind, scope_ref: "all", from: jan, through: mar, complete: true, source_ref: "coverage-export",
  }));
  const populations = [
    { population_kind: "agent-review", population_id: "reviews", scope_ref: "all", inventory_digest: "2".repeat(64), from: jan, through: mar, member_ids: ["review-1", "review-2"], complete: true, first_approval_history_complete: true, source_ref: "population-export" },
    { population_kind: "seed-assignment", population_id: "seeds", scope_ref: "all", inventory_digest: "3".repeat(64), from: jan, through: mar, member_ids: ["seed-1"], complete: true, source_ref: "population-export" },
    { population_kind: "production-deployment", population_id: "deployments", scope_ref: "all", inventory_digest: "4".repeat(64), from: jan, through: mar, member_ids: includeDeployment ? ["deployment-1"] : [], complete: true, source_ref: "population-export" },
  ];
  const events = includeDeployment
    ? [deployment("deploy-event", "change-1", "deployment-1", "2026-01-15T00:00:00Z", "2026-01-01T00:00:00Z"),
      defect("defect-event", "change-1", "deployment-1", "2026-01-20T00:00:00Z", "none", null)]
    : [];
  return { ...fileWith(events, []), trust: { schema_version: 1, records, populations, coverage } };
}

test("trust metrics use first approval revision cohorts, retain unknown class, and do not move on reapproval", () => {
  const input = trustFixture();
  const result = reads(input);
  const row = stageRow(result, "agent-review approval escape rate for unknown");
  assert.equal(row.metric_result.available, true);
  if (row.metric_result.available) {
    assert.match(row.metric_result.value, /1\/1/);
    assert.equal(row.metric_result.sampleSize, 1);
    assert.equal(row.metric_result.coverage, "complete");
    assert.equal(row.metric_result.trust?.numerator, 1);
    assert.equal(row.metric_result.trust?.denominator, 1);
    assert.equal(row.metric_result.trust?.source, "artifacts/metrics/delivery-observations.json#trust");
    assert.ok(row.metric_result.trust?.limitations?.length);
  }
  const grant = stageRow(result, "post-grant escape assessment").metric_result;
  assert.equal(grant.available, false);
  assert.equal(grant.trust?.sampleSize, 1);
  assert.equal(grant.trust?.coverage, "unknown");
});

test("seed recall counts completed empty detection as a miss and reports actual unknown configuration", () => {
  const result = reads(trustFixture());
  const row = stageRow(result, "seeded-review recall for unknown");
  assert.equal(row.metric_result.available, true);
  if (row.metric_result.available) {
    assert.match(row.metric_result.value, /0\/1/);
    assert.match(row.metric_result.trust?.diagnostics?.join(" ") ?? "", /configuration.*unknown/i);
  }
});

test("trust population coverage gaps make rates unavailable rather than zero", () => {
  const input = trustFixture();
  const trust = input.trust as Record<string, unknown>;
  trust.coverage = (trust.coverage as Record<string, unknown>[]).filter((row) => row.kind !== "agent-review");
  const result = reads(input);
  const row = stageRow(result, "agent-review approval escape rate for unknown");
  assert.equal(row.metric_result.available, false);
});

test("conflicting trust domain replays reject the full export", () => {
  const input = trustFixture();
  const trust = input.trust as Record<string, unknown>;
  const records = trust.records as Record<string, unknown>[];
  records.push({ ...records[1], id: "review-conflict", verdict: "changes-requested" });
  assert.match(rejected(input).join(" "), /agent-review.*conflicting payload/i);
});
test("deployment/class rates join exact revisions, include remediation none, and diagnose escapes despite coverage gaps", () => {
  const input = trustFixture(true);
  const trust = input.trust as Record<string, unknown>;
  trust.coverage = (trust.coverage as Record<string, unknown>[]).filter((row) => row.kind !== "defect");
  const result = reads(input);
  const rate = stageRow(result, "production deployment affected share for leaf");
  assert.equal(rate.metric_result.available, false);
  const grant = stageRow(result, "post-grant escape assessment");
  assert.equal(grant.metric_result.available, true);
  if (grant.metric_result.available) assert.match(grant.metric_result.value, /SUSPENSION_REQUIRED.*grant=grant-1.*defect=defect-event/);
  const defects = stageRow(result, "production deployment escaped defects for leaf");
  assert.equal(defects.metric_result.available, true);
  if (defects.metric_result.available) {
    assert.equal(defects.metric_result.coverage, "partial");
    assert.match(defects.metric_result.value, /1 defect observation/);
  }
});

test("seed assignments without a result stay unavailable rather than becoming empty misses", () => {
  const input = trustFixture();
  const trust = input.trust as Record<string, unknown>;
  trust.records = (trust.records as Record<string, unknown>[]).filter((row) => row.kind !== "seed-result");
  const row = stageRow(reads(input), "seeded-review recall for unknown");
  assert.equal(row.metric_result.available, false);
  if (!row.metric_result.available) assert.match(row.metric_result.reason, /lack a result/);
});

test("grant expiry equality suppresses suspension and missing validation evidence keeps assessment unavailable", () => {
  const input = trustFixture(true);
  const trust = input.trust as Record<string, unknown>;
  const records = trust.records as Record<string, unknown>[];
  const grant = records.find((record) => record.kind === "grant-reference");
  assert.ok(grant);
  grant.effective_until = "2026-01-20T00:00:00Z";
  const expired = stageRow(reads(input), "post-grant escape assessment").metric_result;
  assert.equal(expired.available, true);
  if (expired.available) assert.doesNotMatch(expired.value, /SUSPENSION_REQUIRED/);

  grant.effective_until = null;
  grant.independent_validation_ref = null;
  const unknownEvidence = stageRow(reads(input), "post-grant escape assessment").metric_result;
  assert.equal(unknownEvidence.available, false);
});

test("first approval before the period excludes a later reapproval from the approval cohort", () => {
  const input = trustFixture();
  const trust = input.trust as Record<string, unknown>;
  const records = trust.records as Record<string, unknown>[];
  const firstApproval = records.find((record) => record.kind === "agent-review" && record.review_id === "review-1");
  assert.ok(firstApproval);
  firstApproval.completed_at = "2025-12-20T00:00:00Z";
  const population = (trust.populations as Record<string, unknown>[]).find((row) => row.population_kind === "agent-review");
  assert.ok(population);
  population.from = "2025-12-01T00:00:00Z";
  const reviewCoverage = (trust.coverage as Record<string, unknown>[]).find((row) => row.kind === "agent-review");
  assert.ok(reviewCoverage);
  reviewCoverage.from = "2025-12-01T00:00:00Z";
  const classCoverage = (trust.coverage as Record<string, unknown>[]).find((row) => row.kind === "revision-class");
  assert.ok(classCoverage);
  classCoverage.from = "2025-12-01T00:00:00Z";
  const metric = stageRow(reads(input), "agent-review approval escape rate for unknown").metric_result;
  assert.equal(metric.available, false);
  if (!metric.available) assert.match(metric.reason, /no first-approved revision/);
  assert.equal(metric.trust?.sampleSize, 0);
  assert.equal(metric.trust?.coverage, "complete");
});

test("identical domain replay collapses while strict nested configuration rejects extra fields", () => {
  const replay = trustFixture();
  const replayTrust = replay.trust as Record<string, unknown>;
  const review = (replayTrust.records as Record<string, unknown>[]).find((record) => record.kind === "agent-review");
  assert.ok(review);
  (replayTrust.records as Record<string, unknown>[]).push({ ...review, id: "review-replay" });
  const metric = stageRow(reads(replay), "agent-review approval escape rate for unknown").metric_result;
  assert.equal(metric.available, true);
  if (metric.available) assert.equal(metric.sampleSize, 1);

  const malformed = trustFixture();
  const malformedTrust = malformed.trust as Record<string, unknown>;
  const malformedReview = (malformedTrust.records as Record<string, unknown>[]).find((record) => record.kind === "agent-review");
  assert.ok(malformedReview);
  (malformedReview.reviewer_configuration as Record<string, unknown>).requested_profile = "not-actual";
  assert.match(rejected(malformed).join(" "), /agent-review record fields are invalid/);
  const assignment = (malformedTrust.records as Record<string, unknown>[]).find((record) => record.kind === "seed-assignment");
  assert.ok(assignment);
  delete (malformedReview.reviewer_configuration as Record<string, unknown>).requested_profile;
  (assignment.expected_defects as Record<string, unknown>[])[0].evidence = "unrecognized";
  assert.match(rejected(malformed).join(" "), /expected_defects must contain id\/severity pairs/);
});

test("trust manifests and coverage identities reject malformed digest and string values", () => {
  const cases: { collection: "population" | "coverage"; field: "inventory_digest" | "scope_ref" | "source_ref"; value: unknown }[] = [
    { collection: "population", field: "inventory_digest", value: null },
    { collection: "population", field: "inventory_digest", value: 17 },
    { collection: "population", field: "inventory_digest", value: "" },
    { collection: "population", field: "inventory_digest", value: "g".repeat(64) },
    { collection: "population", field: "inventory_digest", value: "a".repeat(63) },
    { collection: "coverage", field: "scope_ref", value: null },
    { collection: "coverage", field: "scope_ref", value: 17 },
    { collection: "coverage", field: "scope_ref", value: "" },
    { collection: "coverage", field: "source_ref", value: null },
    { collection: "coverage", field: "source_ref", value: 17 },
    { collection: "coverage", field: "source_ref", value: "" },
  ];
  for (const testCase of cases) {
    const input = trustFixture();
    const trust = input.trust as Record<string, unknown>;
    const rows = (testCase.collection === "population" ? trust.populations : trust.coverage) as Record<string, unknown>[];
    const row = rows.find((item) => testCase.collection === "population" ? item.population_kind === "agent-review" : item.kind === "agent-review");
    assert.ok(row);
    row[testCase.field] = testCase.value;
    assert.ok(rejected(input).length > 0, `${testCase.collection}.${testCase.field} should reject ${String(testCase.value)}`);
  }
});

test("grant cutoff is strict, effective start is inclusive, and revocation or suspension equality suppresses escape", () => {
  const input = trustFixture(true);
  const trust = input.trust as Record<string, unknown>;
  const grant = (trust.records as Record<string, unknown>[]).find((record) => record.kind === "grant-reference");
  assert.ok(grant);
  grant.evidence_cutoff = "2026-01-20T00:00:00Z";
  let result = stageRow(reads(input), "post-grant escape assessment").metric_result;
  assert.equal(result.available, true);
  if (result.available) assert.doesNotMatch(result.value, /SUSPENSION_REQUIRED/);

  grant.evidence_cutoff = "2026-01-19T00:00:00Z";
  grant.effective_from = "2026-01-20T00:00:00Z";
  result = stageRow(reads(input), "post-grant escape assessment").metric_result;
  assert.equal(result.available, true);
  if (result.available) assert.match(result.value, /SUSPENSION_REQUIRED/);

  grant.revoked_at = "2026-01-20T00:00:00Z";
  result = stageRow(reads(input), "post-grant escape assessment").metric_result;
  assert.equal(result.available, true);
  if (result.available) assert.doesNotMatch(result.value, /SUSPENSION_REQUIRED/);

  grant.revoked_at = null;
  grant.suspended_at = "2026-01-20T00:00:00Z";
  result = stageRow(reads(input), "post-grant escape assessment").metric_result;
  assert.equal(result.available, true);
  if (result.available) assert.doesNotMatch(result.value, /SUSPENSION_REQUIRED/);
});

test("trust joins deployment classes by exact revision and excludes findings/deployments at the half-open end", () => {
  const reviewBoundary = trustFixture();
  const reviewTrust = reviewBoundary.trust as Record<string, unknown>;
  const finding = (reviewTrust.records as Record<string, unknown>[]).find((record) => record.kind === "human-finding");
  assert.ok(finding);
  finding.detected_at = THROUGH;
  const escape = stageRow(reads(reviewBoundary), "agent-review approval escape rate for unknown").metric_result;
  assert.equal(escape.available, true);
  if (escape.available) assert.match(escape.value, /0\/1/);

  const deploymentBoundary = trustFixture(true);
  const events = deploymentBoundary.events as Record<string, unknown>[];
  events.push(deployment("deployment-boundary", "change-1", "deployment-boundary", THROUGH, "2026-01-01T00:00:00Z"));
  events.push(defect("defect-boundary", "change-1", "deployment-1", THROUGH, "none", null));
  const trust = deploymentBoundary.trust as Record<string, unknown>;
  const population = (trust.populations as Record<string, unknown>[]).find((row) => row.population_kind === "production-deployment");
  assert.ok(population);
  population.member_ids = ["deployment-1", "deployment-boundary"];
  const leafRate = stageRow(reads(deploymentBoundary), "production deployment affected share for leaf").metric_result;
  assert.equal(leafRate.available, true);
  if (leafRate.available) assert.match(leafRate.value, /^1\/1/);
  const defects = stageRow(reads(deploymentBoundary), "production deployment escaped defects for leaf").metric_result;
  assert.equal(defects.available, true);
  if (defects.available) assert.match(defects.value, /^1 defect observation/);

  const mismatchedRevision = trustFixture(true);
  const classification = (mismatchedRevision.trust as Record<string, unknown>).records as Record<string, unknown>[];
  const classRecord = classification.find((record) => record.kind === "revision-class");
  assert.ok(classRecord);
  classRecord.revision = "different-revision";
  const unknownRate = stageRow(reads(mismatchedRevision), "production deployment affected share for unknown").metric_result;
  assert.equal(unknownRate.available, true);
  if (unknownRate.available) assert.match(unknownRate.value, /^1\/1/);
});

test("empty inventories with incomplete coverage never fabricate zero counts", () => {
  const input = { ...fileWith([], []), trust: { schema_version: 1, records: [], populations: [], coverage: [] } };
  const result = reads(input);
  for (const indicator of [
    "seeded-review packages for unknown",
    "seeded-review expected defects for unknown",
    "production deployment escaped defects for unknown",
    "production deployment eligible count for unknown",
  ]) {
    const metric = stageRow(result, indicator).metric_result;
    assert.equal(metric.available, false, `${indicator} must not become a measured zero without complete inventory`);
  }
});
test("January reapproval with unknown pre-January history cannot define first approval", () => {
  const input = trustFixture();
  const trust = input.trust as Record<string, unknown>;
  const population = (trust.populations as Record<string, unknown>[]).find((row) => row.population_kind === "agent-review");
  assert.ok(population);
  delete population.first_approval_history_complete;
  const reapproval = (trust.records as Record<string, unknown>[]).find((row) => row.kind === "agent-review" && row.review_id === "review-2");
  assert.ok(reapproval);
  reapproval.completed_at = "2026-01-20T00:00:00Z";
  population.from = "2025-12-01T00:00:00Z";
  const coverage = trust.coverage as Record<string, unknown>[];
  for (const kind of ["agent-review", "revision-class"]) {
    const row = coverage.find((item) => item.kind === kind);
    assert.ok(row);
    row.from = "2025-12-01T00:00:00Z";
  }
  const metric = stageRow(reads(input), "agent-review approval escape rate for unknown").metric_result;
  assert.equal(metric.available, false, "complete report-window coverage does not establish the first-ever approval");
});

test("seed recall uses assignment-to-cutoff evidence and ignores coverage gaps after the last cutoff", () => {
  const input = trustFixture();
  const trust = input.trust as Record<string, unknown>;
  const assignment = (trust.records as Record<string, unknown>[]).find((row) => row.kind === "seed-assignment");
  assert.ok(assignment);
  assignment.assigned_at = "2025-12-20T00:00:00Z";
  const cutoff = assignment.evaluation_cutoff as string;
  const coverage = trust.coverage as Record<string, unknown>[];
  for (const kind of ["seed-assignment", "seed-result"]) {
    const row = coverage.find((item) => item.kind === kind);
    assert.ok(row);
    row.from = assignment.assigned_at;
    row.through = cutoff;
  }
  const metric = stageRow(reads(input), "seeded-review recall for unknown").metric_result;
  assert.equal(metric.available, true, "continuous evidence through cutoff suffices despite a later gap");
  if (metric.available) assert.match(metric.value, /^0\/1/);
});

test("unresolved deployment class prevents a negative grant conclusion but preserves positive findings", () => {
  const unknown = trustFixture(true);
  const unknownTrust = unknown.trust as Record<string, unknown>;
  const classification = (unknownTrust.records as Record<string, unknown>[]).find((row) => row.kind === "revision-class");
  assert.ok(classification);
  classification.revision = "unmatched";
  const noEscape = stageRow(reads(unknown), "post-grant escape assessment").metric_result;
  assert.equal(noEscape.available, false, "missing exact classification cannot establish no escape");

  const positive = trustFixture(true);
  const positiveTrust = positive.trust as Record<string, unknown>;
  const population = (positiveTrust.populations as Record<string, unknown>[]).find((row) => row.population_kind === "production-deployment");
  assert.ok(population);
  population.member_ids = [...population.member_ids as string[], "deployment-unknown"];
  (positive.events as Record<string, unknown>[]).push(
    deployment("deploy-unknown-event", "change-unknown", "deployment-unknown", "2026-01-15T00:00:00Z", "2026-01-01T00:00:00Z"),
    defect("defect-unknown-event", "change-unknown", "deployment-unknown", "2026-01-20T00:00:00Z", "none", null),
  );
  const partial = stageRow(reads(positive), "post-grant escape assessment").metric_result;
  assert.equal(partial.available, true);
  if (partial.available) {
    assert.equal(partial.coverage, "partial");
    assert.match(partial.value, /SUSPENSION_REQUIRED.*grant=grant-1.*defect=defect-event/);
  }
});

test("grant scope tuples do not collide when identifiers contain slashes", () => {
  const input = trustFixture(true);
  const trust = input.trust as Record<string, unknown>;
  const records = trust.records as Record<string, unknown>[];
  const deploymentClass = records.find((row) => row.kind === "revision-class");
  const grant = records.find((row) => row.kind === "grant-reference");
  assert.ok(deploymentClass);
  assert.ok(grant);
  deploymentClass.change_id = "a";
  deploymentClass.revision = "b/c";
  records.push({
    ...deploymentClass,
    id: "class-grant-scope",
    change_id: "a/b",
    revision: "c",
  });
  grant.scope = { change_id: "a/b", revision: "c" };
  const events = input.events as Record<string, unknown>[];
  for (const item of events) {
    if (item.kind === "deployment" || item.kind === "defect") {
      item.change_id = "a";
      item.revision = "b/c";
    }
  }
  const assessment = stageRow(reads(input), "post-grant escape assessment").metric_result;
  assert.equal(assessment.available, true);
  if (assessment.available) assert.doesNotMatch(assessment.value, /SUSPENSION_REQUIRED/);
});

test("agent-review verdict arrays reject instead of coercing to an enum string", () => {
  const input = trustFixture();
  const trust = input.trust as Record<string, unknown>;
  const records = trust.records as Record<string, unknown>[];
  const review = records.find((row) => row.kind === "agent-review");
  assert.ok(review);
  const population = (trust.populations as Record<string, unknown>[]).find((row) => row.population_kind === "agent-review");
  assert.ok(population);
  population.member_ids = [...population.member_ids as string[], "review-array-verdict"];
  records.push({
    ...review,
    id: "review-array-verdict-record",
    review_id: "review-array-verdict",
    verdict: ["approved"],
  });
  assert.match(rejected(input).join(" "), /agent-review record fields are invalid/);
});

test("missing trust population renders unknown counts while declared empty inventory renders observed zeroes", () => {
  const missingRoot = tmpRoot();
  const missing = buildDeliveryIndicators(readDeliveryObservations(missingRoot), PERIOD);
  const missingMetric = stageRow(missing, "agent-review approval escape rate for unknown").metric_result;
  assert.equal(missingMetric.available, false);
  if (missingMetric.available) return;
  assert.equal(missingMetric.trust?.numerator, undefined);
  assert.equal(missingMetric.trust?.denominator, undefined);
  assert.equal(missingMetric.trust?.sampleSize, null);

  const missingReport: MetricsReport = {
    scope: "missing-trust",
    period: PERIOD.label,
    generatedAt: "2026-01-01T00:00:00Z",
    deliveryHealth: missing.deliveryHealth,
    stageIndicators: missing.stageIndicators,
    dispatchOutcomes: { available: false, reason: "no delivery observations supplied" },
    bandBreaches: [],
    bandConfigErrors: [],
    attribution: [],
    unavailable: missing.unavailable,
    followUps: [],
  };
  const missingJson = JSON.parse(JSON.stringify(missingReport)) as MetricsReport;
  const missingSerialized = missingJson.stageIndicators.find((row) =>
    row.indicator === "agent-review approval escape rate for unknown")?.metric_result;
  assert.ok(missingSerialized && !missingSerialized.available);
  if (missingSerialized && !missingSerialized.available) {
    assert.equal(missingSerialized.trust?.numerator, undefined);
    assert.equal(missingSerialized.trust?.denominator, undefined);
    assert.equal(missingSerialized.trust?.sampleSize, null);
  }
  const missingMarkdown = renderMarkdown(missingReport);
  assert.match(missingMarkdown, /\| agent-review approval escape rate for unknown \| unavailable:/);
  assert.match(missingMarkdown, /\| agent-review approval escape rate for unknown \| unavailable:.*\| n\/a \| n\/a \| n\/a \|/);
  assert.doesNotMatch(missingMarkdown, /\| agent-review approval escape rate for unknown \| unavailable:.*\| 0 \| 0 \| 0 \|/);

  const emptyTrustExport = {
    ...fileWith([], []),
    trust: { schema_version: 1, records: [], populations: [], coverage: [] },
  };
  const emptyTrustIndicators = reads(emptyTrustExport);
  const emptyTrustMetric = stageRow(
    emptyTrustIndicators,
    "agent-review approval escape rate for unknown",
  ).metric_result;
  assert.equal(emptyTrustMetric.available, false);
  if (emptyTrustMetric.available) return;
  assert.equal(emptyTrustMetric.trust?.numerator, undefined);
  assert.equal(emptyTrustMetric.trust?.denominator, undefined);
  assert.equal(emptyTrustMetric.trust?.sampleSize, null);
  const emptyTrustReport: MetricsReport = {
    ...missingReport,
    scope: "empty-trust-export",
    deliveryHealth: emptyTrustIndicators.deliveryHealth,
    stageIndicators: emptyTrustIndicators.stageIndicators,
    unavailable: emptyTrustIndicators.unavailable,
  };
  const emptyTrustJson = JSON.parse(JSON.stringify(emptyTrustReport)) as MetricsReport;
  const emptyTrustSerialized = emptyTrustJson.stageIndicators.find((row) =>
    row.indicator === "agent-review approval escape rate for unknown")?.metric_result;
  assert.ok(emptyTrustSerialized && !emptyTrustSerialized.available);
  if (emptyTrustSerialized && !emptyTrustSerialized.available) {
    assert.equal(emptyTrustSerialized.trust?.numerator, undefined);
    assert.equal(emptyTrustSerialized.trust?.denominator, undefined);
    assert.equal(emptyTrustSerialized.trust?.sampleSize, null);
  }
  const emptyTrustMarkdown = renderMarkdown(emptyTrustReport);
  assert.match(emptyTrustMarkdown, /\| agent-review approval escape rate for unknown \| unavailable:.*\| n\/a \| n\/a \| n\/a \|/);

  const missingPopulation = trustFixture();
  const missingTrust = missingPopulation.trust as Record<string, unknown>;
  missingTrust.populations = [];
  const missingPopulationMetric = stageRow(
    reads(missingPopulation),
    "agent-review approval escape rate for unknown",
  ).metric_result;
  assert.equal(missingPopulationMetric.available, false);
  if (missingPopulationMetric.available) return;
  assert.equal(missingPopulationMetric.trust?.numerator, undefined);
  assert.equal(missingPopulationMetric.trust?.denominator, undefined);
  assert.equal(missingPopulationMetric.trust?.sampleSize, null);
  const empty = trustFixture();
  const trust = empty.trust as Record<string, unknown>;
  trust.records = (trust.records as Record<string, unknown>[]).filter((row) =>
    row.kind !== "agent-review" && row.kind !== "human-finding");
  const reviewPopulation = (trust.populations as Record<string, unknown>[]).find((row) =>
    row.population_kind === "agent-review");
  assert.ok(reviewPopulation);
  reviewPopulation.member_ids = [];
  const emptyIndicators = reads(empty);
  const emptyMetric = stageRow(emptyIndicators, "agent-review approval escape rate for unknown").metric_result;
  assert.equal(emptyMetric.available, false);
  if (emptyMetric.available) return;
  assert.equal(emptyMetric.trust?.numerator, 0);
  assert.equal(emptyMetric.trust?.denominator, 0);
  assert.equal(emptyMetric.trust?.sampleSize, 0);
  assert.equal(emptyMetric.trust?.coverage, "complete");
  const emptyReport: MetricsReport = {
    ...missingReport,
    scope: "declared-empty-trust",
    deliveryHealth: emptyIndicators.deliveryHealth,
    stageIndicators: emptyIndicators.stageIndicators,
    unavailable: emptyIndicators.unavailable,
  };
  const emptyJson = JSON.parse(JSON.stringify(emptyReport)) as MetricsReport;
  const emptySerialized = emptyJson.stageIndicators.find((row) =>
    row.indicator === "agent-review approval escape rate for unknown")?.metric_result;
  assert.ok(emptySerialized && !emptySerialized.available);
  if (emptySerialized && !emptySerialized.available) {
    assert.equal(emptySerialized.trust?.numerator, 0);
    assert.equal(emptySerialized.trust?.denominator, 0);
    assert.equal(emptySerialized.trust?.sampleSize, 0);
  }
  const emptyMarkdown = renderMarkdown(emptyReport);
  assert.match(emptyMarkdown, /\| agent-review approval escape rate for unknown \| unavailable:.*\| 0 \| 0 \| 0 \| complete \|/);
});
