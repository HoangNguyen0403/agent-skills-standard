// scripts/metrics/dispatch.test.ts
//
// Dispatch observations (SRS-001 to SRS-008, SRS-010 reader rules). Every assertion
// targets a validated fact, a rejected diagnostic, or a hand-computed aggregate —
// never prose or formatting.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildReport, run } from "./index";
import { buildDispatchOutcomes } from "./dispatch";
import { intervalCovered, readDeliveryObservations } from "./delivery";
import { renderMarkdown } from "./report";
import type { GitPeriod } from "./git";
import type { DispatchEndState, DispatchOutcomeRow, DispatchOutcomes } from "./types";

const FROM = "2026-01-01T00:00:00Z";
const THROUGH = "2026-02-01T00:00:00Z";
const RECORDED_KINDS = ["dispatch", "dispatch-round", "dispatch-verdict", "dispatch-acceptance", "dispatch-end"];

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "metrics-dispatch-"));
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

function ev(
  id: string,
  changeId: string,
  kind: string,
  observedAt: string,
  extra: Record<string, unknown> = {},
  revision = "r1",
): Record<string, unknown> {
  return { id, change_id: changeId, revision, observed_at: observedAt, source_ref: "test-export", kind, ...extra };
}

function dispatchEvent(
  id: string,
  dispatchId: string,
  changeId: string,
  at: string,
  extra: Record<string, unknown> = {},
  revision = "r1",
): Record<string, unknown> {
  return ev(
    id,
    changeId,
    "dispatch",
    at,
    {
      dispatch_id: dispatchId,
      role: "implementer",
      capability_hint: "standard",
      actual: { provider: "provider-a", model: "model-a", effort: "medium" },
      authority_ref: "authority-1",
      orchestrator_model: "model-orch",
      orchestrator_ref: "orch-1",
      ...extra,
    },
    revision,
  );
}

function roundEvent(id: string, dispatchId: string, changeId: string, round: number, at: string): Record<string, unknown> {
  return ev(id, changeId, "dispatch-round", at, { dispatch_id: dispatchId, round });
}

function verdictEvent(
  id: string,
  dispatchId: string,
  changeId: string,
  round: number,
  at: string,
  verdict: "approved" | "changes_requested" = "approved",
  reviewer = "reviewer-1",
): Record<string, unknown> {
  return ev(id, changeId, "dispatch-verdict", at, {
    dispatch_id: dispatchId,
    round,
    verdict,
    reviewer_ref: reviewer,
  });
}

function acceptanceEvent(
  id: string,
  dispatchId: string,
  changeId: string,
  round: number,
  at: string,
  decision: "accepted" | "rejected" = "accepted",
  authority = "authority-1",
): Record<string, unknown> {
  return ev(id, changeId, "dispatch-acceptance", at, {
    dispatch_id: dispatchId,
    round,
    decision,
    authority_ref: authority,
  });
}

function endEvent(
  id: string,
  dispatchId: string,
  changeId: string,
  at: string,
  state: DispatchEndState = "completed",
): Record<string, unknown> {
  return ev(id, changeId, "dispatch-end", at, { dispatch_id: dispatchId, state });
}

function usageEvent(
  id: string,
  dispatchId: string,
  changeId: string,
  at: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return ev(id, changeId, "dispatch-usage", at, {
    dispatch_id: dispatchId,
    actor: "worker",
    window_from: "2026-01-02T00:00:00Z",
    window_to: "2026-01-03T00:00:00Z",
    turns: 1,
    input_tokens: 100,
    cached_input_tokens: 0,
    cache_write_tokens: 0,
    output_tokens: 50,
    recorded_cost: 1.5,
    cost_basis: "host-recorded-estimate",
    coverage_complete: true,
    method_ref: "method-v1",
    ...extra,
  });
}

function inventoryEvent(
  id: string,
  changeId: string,
  at: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return ev(id, changeId, "dispatch-inventory", at, {
    orchestrator_ref: "orch-1",
    window_from: "2026-01-01T00:00:00Z",
    window_to: "2026-01-10T00:00:00Z",
    unrecorded_count: 0,
    ...extra,
  });
}

function dispatchCoverage(
  changeId: string,
  overrides: { from?: string; through?: string; kinds?: string[]; complete?: boolean; revisions?: string[] } = {},
): Record<string, unknown> {
  return {
    change_id: changeId,
    revisions: overrides.revisions ?? ["r1"],
    from: overrides.from ?? FROM,
    through: overrides.through ?? THROUGH,
    kinds: overrides.kinds ?? RECORDED_KINDS,
    complete: overrides.complete ?? true,
  };
}

function fileWith(events: Record<string, unknown>[], coverageRows: Record<string, unknown>[] = []): Record<string, unknown> {
  return { schema_version: 1, source_kind: "operator-recorded", coverage: coverageRows, events };
}

function outcomes(file: unknown): DispatchOutcomes {
  const root = tmpRoot();
  writeObservations(root, file);
  const set = readDeliveryObservations(root);
  assert.deepEqual(
    set.issues.map((issue) => issue.message),
    [],
    "fixture should be accepted by the reader",
  );
  assert.ok(set.observations);
  const observations = set.observations;
  return buildDispatchOutcomes(set, {
    period: PERIOD,
    observationsPath: "artifacts/metrics/delivery-observations.json",
    intervalCovered: (changeId, kind, revision, startMs, endMs) =>
      intervalCovered(observations, changeId, kind, revision, startMs, endMs),
  });
}

function rejected(file: unknown): string[] {
  const root = tmpRoot();
  writeObservations(root, file);
  const set = readDeliveryObservations(root);
  assert.equal(set.observations, null, "fixture should be rejected");
  return set.issues.map((issue) => issue.message);
}

function rowsOf(result: DispatchOutcomes): DispatchOutcomeRow[] {
  assert.equal(result.available, true, result.available ? "" : result.reason);
  return result.available ? result.rows : [];
}

function row(result: DispatchOutcomes, role: string, model: string): DispatchOutcomeRow {
  const found = rowsOf(result).find((candidate) => candidate.role === role && candidate.model === model);
  assert.ok(found, `missing row for ${role}/${model}`);
  return found;
}

// --- SRS-001 / AC-001: required dispatch fields ---------------------------

test("AC-001: a dispatch omitting role is rejected with a problem naming role", () => {
  const raw = dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z") as Record<string, unknown>;
  delete raw.role;
  const problems = rejected(fileWith([raw], [dispatchCoverage("change-a")]));
  assert.ok(problems.some((problem) => problem.includes("role must be a reference string")), problems.join("; "));
});

test("AC-001: a dispatch omitting dispatch_id is rejected with a problem naming dispatch_id", () => {
  const raw = dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z") as Record<string, unknown>;
  delete raw.dispatch_id;
  const problems = rejected(fileWith([raw], [dispatchCoverage("change-a")]));
  assert.ok(problems.some((problem) => problem.includes("dispatch_id must be a reference string")), problems.join("; "));
});

test("a dispatch with an unknown capability hint or an incomplete actual tuple is rejected", () => {
  const badHint = dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z", { capability_hint: "turbo" });
  assert.ok(rejected(fileWith([badHint])).some((problem) => problem.includes("capability_hint")));

  const badActual = dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z", {
    actual: { provider: "provider-a", model: "model-a" },
  });
  assert.ok(rejected(fileWith([badActual])).some((problem) => problem.includes("actual.effort")));
});

// --- SRS-010: reference-string boundary on the reader side ----------------

test("SRS-010: a dispatch-scoped event whose source_ref or id carries a path is rejected", () => {
  const pathRef = dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z", {
    source_ref: "/Users/operator/artifacts/metrics/delivery-observations.json",
  });
  assert.ok(rejected(fileWith([pathRef])).some((problem) => problem.includes("source_ref must be a reference string")));

  const pathId = dispatchEvent("dispatch/1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z");
  assert.ok(rejected(fileWith([pathId])).some((problem) => problem.includes("id must be a reference string")));
});

test("SRS-010: a dispatch-scoped event whose free field carries whitespace or a path is rejected", () => {
  const spacedRole = dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z", { role: "senior implementer" });
  assert.ok(rejected(fileWith([spacedRole])).some((problem) => problem.includes("role must be a reference string")));

  const pathEffort = dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z", {
    actual: { provider: "provider-a", model: "model-a", effort: "~/effort.json" },
  });
  assert.ok(rejected(fileWith([pathEffort])).some((problem) => problem.includes("actual.effort")));
});

test("SRS-010: legacy kinds keep accepting their current free strings", () => {
  const legacy = ev("r1", "change-a", "review", "2026-01-02T00:00:00Z", { session_id: "session-a", active_seconds: 60 });
  const root = tmpRoot();
  writeObservations(root, fileWith([legacy]));
  assert.deepEqual(readDeliveryObservations(root).issues, []);
});

// --- SRS-002 to SRS-005: referential and chronology invariants ------------

test("a round naming an unknown dispatch rejects the file", () => {
  const problems = rejected(fileWith([roundEvent("r1", "dispatch-ghost", "change-a", 1, "2026-01-03T00:00:00Z")]));
  assert.ok(problems.some((problem) => problem.includes("unknown dispatch_id dispatch-ghost")), problems.join("; "));
});

test("a round whose change_id differs from its dispatch rejects the file", () => {
  const problems = rejected(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-b", 1, "2026-01-03T00:00:00Z"),
    ]),
  );
  assert.ok(problems.some((problem) => problem.includes("does not match dispatch dispatch-1")), problems.join("; "));
});

test("a round observed before its dispatch rejects the file", () => {
  const problems = rejected(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-05T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-03T00:00:00Z"),
    ]),
  );
  assert.ok(problems.some((problem) => problem.includes("precedes dispatch dispatch-1")), problems.join("; "));
});

test("a dispatch-end observed before its dispatch rejects the file", () => {
  const problems = rejected(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-05T00:00:00Z"),
      endEvent("e1", "dispatch-1", "change-a", "2026-01-03T00:00:00Z"),
    ]),
  );
  assert.ok(problems.some((problem) => problem.includes("precedes dispatch dispatch-1")), problems.join("; "));
});

test("a dispatch-end observed after its dispatch but before its last round rejects the file", () => {
  const problems = rejected(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-03T00:00:00Z"),
      roundEvent("r2", "dispatch-1", "change-a", 2, "2026-01-06T00:00:00Z"),
      endEvent("e1", "dispatch-1", "change-a", "2026-01-05T00:00:00Z"),
    ]),
  );
  assert.ok(problems.some((problem) => problem.includes("round 2") && problem.includes("after dispatch-end")), problems.join("; "));
});

test("round numbers with a gap reject the file", () => {
  const problems = rejected(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-03T00:00:00Z"),
      roundEvent("r3", "dispatch-1", "change-a", 3, "2026-01-04T00:00:00Z"),
    ]),
  );
  assert.ok(problems.some((problem) => problem.includes("numbered 1..n")), problems.join("; "));
});

test("round k observed before round k-1 rejects the file", () => {
  const problems = rejected(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-05T00:00:00Z"),
      roundEvent("r2", "dispatch-1", "change-a", 2, "2026-01-04T00:00:00Z"),
    ]),
  );
  assert.ok(problems.some((problem) => problem.includes("strictly after round 1")), problems.join("; "));
});

test("a verdict naming a missing round rejects the file", () => {
  const problems = rejected(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-03T00:00:00Z"),
      verdictEvent("v2", "dispatch-1", "change-a", 2, "2026-01-04T00:00:00Z"),
    ]),
  );
  assert.ok(problems.some((problem) => problem.includes("round 2") && problem.includes("no matching round")), problems.join("; "));
});

test("a verdict observed before its round rejects the file", () => {
  const problems = rejected(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-05T00:00:00Z"),
      verdictEvent("v1", "dispatch-1", "change-a", 1, "2026-01-04T00:00:00Z"),
    ]),
  );
  assert.ok(problems.some((problem) => problem.includes("precedes its round")), problems.join("; "));
});

test("a dispatch acceptance whose round is not the last round rejects the file", () => {
  const problems = rejected(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-03T00:00:00Z"),
      roundEvent("r2", "dispatch-1", "change-a", 2, "2026-01-04T00:00:00Z"),
      acceptanceEvent("a1", "dispatch-1", "change-a", 1, "2026-01-05T00:00:00Z"),
      endEvent("e1", "dispatch-1", "change-a", "2026-01-06T00:00:00Z"),
    ]),
  );
  assert.ok(problems.some((problem) => problem.includes("last round")), problems.join("; "));
});

test("a dispatch acceptance observed before its round rejects the file", () => {
  const problems = rejected(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-05T00:00:00Z"),
      acceptanceEvent("a1", "dispatch-1", "change-a", 1, "2026-01-04T00:00:00Z"),
      endEvent("e1", "dispatch-1", "change-a", "2026-01-06T00:00:00Z"),
    ]),
  );
  assert.ok(problems.some((problem) => problem.includes("precedes its round")), problems.join("; "));
});

// --- SRS-005: every permitted-combination cell ---------------------------

const COMBINATION_TABLE: { end: DispatchEndState | null; decision: "accepted" | "rejected" | null; permitted: boolean }[] = [
  { end: "completed", decision: "accepted", permitted: true },
  { end: "completed", decision: "rejected", permitted: true },
  { end: "completed", decision: null, permitted: true },
  { end: "cancelled", decision: "accepted", permitted: false },
  { end: "cancelled", decision: "rejected", permitted: true },
  { end: "cancelled", decision: null, permitted: true },
  { end: "failed", decision: "accepted", permitted: false },
  { end: "failed", decision: "rejected", permitted: true },
  { end: "failed", decision: null, permitted: true },
  { end: "errored", decision: "accepted", permitted: false },
  { end: "errored", decision: "rejected", permitted: true },
  { end: "errored", decision: null, permitted: true },
  { end: null, decision: "accepted", permitted: false },
  { end: null, decision: "rejected", permitted: false },
  { end: null, decision: null, permitted: true },
];

test("SRS-005: every dispatch-end and acceptance combination follows the permitted table", () => {
  for (const cell of COMBINATION_TABLE) {
    const events: Record<string, unknown>[] = [
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-03T00:00:00Z"),
    ];
    if (cell.end) events.push(endEvent("e1", "dispatch-1", "change-a", "2026-01-04T00:00:00Z", cell.end));
    if (cell.decision) events.push(acceptanceEvent("a1", "dispatch-1", "change-a", 1, "2026-01-05T00:00:00Z", cell.decision));

    const label = `${cell.end ?? "absent end"}/${cell.decision ?? "no acceptance"}`;
    const root = tmpRoot();
    writeObservations(root, fileWith(events));
    const set = readDeliveryObservations(root);
    if (cell.permitted) {
      assert.deepEqual(set.issues.map((issue) => issue.message), [], label);
    } else {
      assert.notDeepEqual(set.issues.map((issue) => issue.message), [], `${label} should be rejected`);
    }
  }
});

// --- SRS-007: usage windows ---------------------------------------------

test("two overlapping usage windows for one dispatch and actor reject the file", () => {
  const problems = rejected(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      usageEvent("u1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      usageEvent("u2", "dispatch-1", "change-a", "2026-01-02T00:00:00Z", {
        window_from: "2026-01-02T12:00:00Z",
        window_to: "2026-01-04T00:00:00Z",
      }),
    ]),
  );
  assert.ok(problems.some((problem) => problem.includes("overlaps")), problems.join("; "));
});

test("a non-overlapping second usage window for the same dispatch and actor is accepted", () => {
  const result = outcomes(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      usageEvent("u1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      usageEvent("u2", "dispatch-1", "change-a", "2026-01-04T00:00:00Z", {
        window_from: "2026-01-03T00:00:00Z",
        window_to: "2026-01-04T00:00:00Z",
      }),
    ]),
  );
  assert.equal(row(result, "implementer", "model-a").worker.events, 2);
  assert.equal(row(result, "implementer", "model-a").worker.inputTokens, 200);
});

test("an identical usage replay collapses to one observation", () => {
  const result = outcomes(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      usageEvent("u1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      usageEvent("u2", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
    ]),
  );
  assert.equal(row(result, "implementer", "model-a").worker.events, 1);
  assert.equal(row(result, "implementer", "model-a").worker.inputTokens, 100);
});

test("SRS-007: an unavailable usage event carries null turns and counts as a missing pair, not as zero", () => {
  const result = outcomes(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      usageEvent("u1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z", {
        turns: null,
        input_tokens: null,
        cached_input_tokens: null,
        cache_write_tokens: null,
        output_tokens: null,
        recorded_cost: null,
        coverage_complete: false,
        unavailable_code: "no-adapter",
      }),
    ]),
  );
  const summary = row(result, "implementer", "model-a").worker;
  assert.equal(summary.events, 1);
  assert.equal(summary.turns, 0);
  assert.equal(summary.unknown.turns, 1);
  assert.equal(summary.inputTokens, 0);
  assert.equal(summary.unknown.inputTokens, 1);
  assert.equal(summary.unknown.recordedCost, 1);
  assert.equal(summary.missingPairs, 1);
  assert.equal(summary.coverage, "partial");
});

test("SRS-007: an unavailable usage event with a known counter or turns rejects the file", () => {
  for (const override of [{ turns: 0 }, { input_tokens: 0 }, { recorded_cost: 0 }, { coverage_complete: true }]) {
    const raw = usageEvent("u1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z", {
      turns: null,
      input_tokens: null,
      cached_input_tokens: null,
      cache_write_tokens: null,
      output_tokens: null,
      recorded_cost: null,
      coverage_complete: false,
      unavailable_code: "unresolved",
      ...override,
    });
    const problems = rejected(fileWith([dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"), raw]));
    assert.ok(
      problems.some((problem) => problem.includes("unavailable_code")),
      `override ${JSON.stringify(override)}: ${problems.join("; ")}`,
    );
  }
});

// --- SRS-008: inventory persistence -------------------------------------

test("inventory events for one orchestrator window that disagree on the count reject the file", () => {
  const problems = rejected(
    fileWith([
      inventoryEvent("i1", "change-a", "2026-01-10T00:00:00Z", { unrecorded_count: 1 }),
      inventoryEvent("i2", "change-b", "2026-01-10T00:00:00Z", { unrecorded_count: 2 }),
    ]),
  );
  assert.ok(problems.some((problem) => problem.includes("unrecorded_count")), problems.join("; "));
});

test("two inventory windows for one orchestrator that overlap without being identical reject the file", () => {
  const problems = rejected(
    fileWith([
      inventoryEvent("i1", "change-a", "2026-01-10T00:00:00Z"),
      inventoryEvent("i2", "change-b", "2026-01-11T00:00:00Z", {
        window_from: "2026-01-05T00:00:00Z",
        window_to: "2026-01-15T00:00:00Z",
      }),
    ]),
  );
  assert.ok(problems.some((problem) => problem.includes("overlaps")), problems.join("; "));
});

test("SRS-008: one unrecorded worker is counted once across two changes and marks both rows partial", () => {
  const result = outcomes(
    fileWith(
      [
        dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
        dispatchEvent("d2", "dispatch-2", "change-b", "2026-01-02T00:00:00Z", { role: "reviewer" }),
        inventoryEvent("i1", "change-a", "2026-01-10T00:00:00Z", { unrecorded_count: 1 }),
        inventoryEvent("i2", "change-b", "2026-01-10T00:00:00Z", { unrecorded_count: 1 }),
      ],
      [dispatchCoverage("change-a"), dispatchCoverage("change-b")],
    ),
  );
  assert.equal(result.available, true);
  if (!result.available) return;
  assert.equal(result.unrecorded, 1);
  assert.equal(rowsOf(result).length, 2);
  assert.equal(row(result, "implementer", "model-a").coverage, "partial");
  assert.equal(row(result, "reviewer", "model-a").coverage, "partial");
});

test("SRS-008: one inventory window written with and without fractional seconds counts once", () => {
  const result = outcomes(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      dispatchEvent("d2", "dispatch-2", "change-b", "2026-01-02T00:00:00Z", { role: "reviewer" }),
      inventoryEvent("i1", "change-a", "2026-01-10T00:00:00Z", { unrecorded_count: 1 }),
      inventoryEvent("i2", "change-b", "2026-01-10T00:00:00Z", {
        window_from: "2026-01-01T00:00:00.000Z",
        window_to: "2026-01-10T00:00:00.000Z",
        unrecorded_count: 1,
      }),
    ]),
  );
  assert.equal(result.available, true);
  if (!result.available) return;
  assert.equal(result.unrecorded, 1);
});

test("SRS-008: one inventory window written with and without fractional seconds cannot carry two counts", () => {
  const problems = rejected(
    fileWith([
      inventoryEvent("i1", "change-a", "2026-01-10T00:00:00Z", { unrecorded_count: 1 }),
      inventoryEvent("i2", "change-b", "2026-01-10T00:00:00Z", {
        window_from: "2026-01-01T00:00:00.000Z",
        window_to: "2026-01-10T00:00:00.000Z",
        unrecorded_count: 2,
      }),
    ]),
  );
  assert.ok(problems.length > 0);
});

// --- SRS-002 / SRS-003: rounds and verdicts feed no acceptance -----------

test("two dispatches on one change each start at round 1 without colliding", () => {
  const result = outcomes(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      dispatchEvent("d2", "dispatch-2", "change-a", "2026-01-02T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-03T00:00:00Z"),
      roundEvent("r2", "dispatch-2", "change-a", 1, "2026-01-04T00:00:00Z"),
    ]),
  );
  assert.equal(row(result, "implementer", "model-a").dispatches, 2);
  assert.equal(row(result, "implementer", "model-a").open, 2);
});

test("AC-004: a submission, a correction verdict and a second submission yield 2 rounds", () => {
  const result = outcomes(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-03T00:00:00Z"),
      verdictEvent("v1", "dispatch-1", "change-a", 1, "2026-01-04T00:00:00Z", "changes_requested"),
      roundEvent("r2", "dispatch-1", "change-a", 2, "2026-01-05T00:00:00Z"),
      verdictEvent("v2", "dispatch-1", "change-a", 2, "2026-01-06T00:00:00Z", "approved"),
      endEvent("e1", "dispatch-1", "change-a", "2026-01-07T00:00:00Z"),
    ]),
  );
  const found = row(result, "implementer", "model-a");
  assert.equal(found.ended, 1);
  assert.equal(found.roundsMean, 2);
  assert.equal(found.acceptanceUnknown, 1);
});

test("AC-005: an approving verdict with no acceptance leaves acceptance unknown and first-round share at zero", () => {
  const result = outcomes(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-03T00:00:00Z"),
      verdictEvent("v1", "dispatch-1", "change-a", 1, "2026-01-04T00:00:00Z", "approved"),
      endEvent("e1", "dispatch-1", "change-a", "2026-01-05T00:00:00Z"),
    ]),
  );
  const found = row(result, "implementer", "model-a");
  assert.equal(found.accepted, 0);
  assert.equal(found.acceptanceUnknown, 1);
  assert.equal(found.firstRoundAccepted, 0);
});

test("AC-007: two dispatches on one change with a change-level acceptance only both report acceptance unknown", () => {
  const result = outcomes(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      dispatchEvent("d2", "dispatch-2", "change-a", "2026-01-02T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-03T00:00:00Z"),
      roundEvent("r2", "dispatch-2", "change-a", 1, "2026-01-04T00:00:00Z"),
      endEvent("e1", "dispatch-1", "change-a", "2026-01-05T00:00:00Z"),
      endEvent("e2", "dispatch-2", "change-a", "2026-01-05T00:00:00Z"),
      ev("s1", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1 }),
      // Change-level acceptance: it never attributes to a dispatch.
      ev("acc", "change-a", "acceptance", "2026-01-06T00:00:00Z", {
        attempt: 1,
        decision: "accepted",
        authority_ref: "authority-1",
      }),
    ]),
  );
  const found = row(result, "implementer", "model-a");
  assert.equal(found.ended, 2);
  assert.equal(found.accepted, 0);
  assert.equal(found.acceptanceUnknown, 2);
});

test("AC-008: cancelled and errored dispatches appear with their terminal state and neither counts as accepted", () => {
  const result = outcomes(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      endEvent("e1", "dispatch-1", "change-a", "2026-01-05T00:00:00Z", "cancelled"),
      dispatchEvent("d2", "dispatch-2", "change-a", "2026-01-02T00:00:00Z"),
      endEvent("e2", "dispatch-2", "change-a", "2026-01-05T00:00:00Z", "errored"),
    ]),
  );
  const found = row(result, "implementer", "model-a");
  assert.equal(found.cancelled, 1);
  assert.equal(found.errored, 1);
  assert.equal(found.accepted, 0);
  assert.equal(found.acceptanceUnknown, 2);
});

// --- AC-002 / AC-003: model row and lifecycle isolation -----------------

test("AC-002: a dispatch whose actual model is unknown is counted under an unknown model row", () => {
  const result = outcomes(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z", {
        capability_hint: "strong",
        actual: { provider: "unknown", model: "unknown", effort: "unknown" },
      }),
    ]),
  );
  assert.equal(row(result, "implementer", "unknown").dispatches, 1);
  assert.equal(rowsOf(result).length, 1);
});

test("AC-003: a legacy submission naming a dispatch never contributes a round and leaves coverage partial", () => {
  const result = outcomes(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      ev("s1", "change-a", "submission", "2026-01-03T00:00:00Z", { attempt: 1, dispatch_id: "dispatch-1" }),
      endEvent("e1", "dispatch-1", "change-a", "2026-01-05T00:00:00Z"),
    ]),
  );
  const found = row(result, "implementer", "model-a");
  assert.equal(found.ended, 1);
  assert.equal(found.roundsMean, 0);
  assert.equal(found.coverage, "partial");
});

// --- SRS-007: aggregation preserving unknowns ---------------------------

test("SRS-007: a row mixing a resolved and an unavailable dispatch is partial with one missing pair per actor", () => {
  const result = outcomes(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      dispatchEvent("d2", "dispatch-2", "change-a", "2026-01-02T00:00:00Z"),
      usageEvent("u1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      usageEvent("u2", "dispatch-1", "change-a", "2026-01-02T00:00:00Z", {
        actor: "supervision",
        input_tokens: 10,
        output_tokens: 5,
        recorded_cost: 0.25,
      }),
      usageEvent("u3", "dispatch-2", "change-a", "2026-01-02T00:00:00Z", {
        turns: null,
        input_tokens: null,
        cached_input_tokens: null,
        cache_write_tokens: null,
        output_tokens: null,
        recorded_cost: null,
        coverage_complete: false,
        unavailable_code: "no-adapter",
      }),
      usageEvent("u4", "dispatch-2", "change-a", "2026-01-02T00:00:00Z", {
        actor: "supervision",
        turns: null,
        input_tokens: null,
        cached_input_tokens: null,
        cache_write_tokens: null,
        output_tokens: null,
        recorded_cost: null,
        coverage_complete: false,
        unavailable_code: "no-adapter",
      }),
    ]),
  );
  const found = row(result, "implementer", "model-a");
  assert.equal(found.worker.missingPairs, 1);
  assert.equal(found.worker.coverage, "partial");
  assert.equal(found.worker.inputTokens, 100);
  assert.equal(found.worker.events, 2);
  assert.equal(found.supervision.missingPairs, 1);
  assert.equal(found.supervision.coverage, "partial");
  assert.equal(found.supervision.inputTokens, 10);
});

test("SRS-007: known counter values are summed and unknown counters are counted, never treated as zero", () => {
  const result = outcomes(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      usageEvent("u1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      usageEvent("u2", "dispatch-1", "change-a", "2026-01-03T00:00:00Z", {
        window_from: "2026-01-03T00:00:00Z",
        window_to: "2026-01-04T00:00:00Z",
        turns: 3,
        input_tokens: null,
        output_tokens: 25,
        recorded_cost: null,
      }),
    ]),
  );
  const summary = row(result, "implementer", "model-a").worker;
  assert.equal(summary.turns, 4);
  assert.equal(summary.inputTokens, 100);
  assert.equal(summary.unknown.inputTokens, 1);
  assert.equal(summary.outputTokens, 75);
  assert.equal(summary.recordedCost, 1.5);
  assert.equal(summary.unknown.recordedCost, 1);
});

// --- SRS-008: coverage of a dispatch lifetime --------------------------

test("SRS-008: declared coverage spanning the dispatch lifetime makes an ended dispatch row complete", () => {
  const result = outcomes(
    fileWith(
      [
        dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
        roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-03T00:00:00Z"),
        endEvent("e1", "dispatch-1", "change-a", "2026-01-05T00:00:00Z"),
      ],
      [dispatchCoverage("change-a")],
    ),
  );
  assert.equal(row(result, "implementer", "model-a").coverage, "complete");
});

test("SRS-008: coverage that stops before the dispatch lifetime leaves the row partial", () => {
  const result = outcomes(
    fileWith(
      [
        dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
        endEvent("e1", "dispatch-1", "change-a", "2026-01-20T00:00:00Z"),
      ],
      [dispatchCoverage("change-a", { through: "2026-01-10T00:00:00Z" })],
    ),
  );
  assert.equal(row(result, "implementer", "model-a").coverage, "partial");
});

test("SRS-008: an open dispatch is judged against the period end, not against its own last event", () => {
  const covered = outcomes(
    fileWith([dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z")], [dispatchCoverage("change-a")]),
  );
  assert.equal(row(covered, "implementer", "model-a").coverage, "complete");

  const uncovered = outcomes(
    fileWith([dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z")], [
      dispatchCoverage("change-a", { through: "2026-01-15T00:00:00Z" }),
    ]),
  );
  assert.equal(row(uncovered, "implementer", "model-a").coverage, "partial");
});

test("SRS-008: coverage that omits a recorded dispatch kind leaves the row partial", () => {
  const result = outcomes(
    fileWith([dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z")], [
      dispatchCoverage("change-a", { kinds: ["dispatch", "dispatch-round"] }),
    ]),
  );
  assert.equal(row(result, "implementer", "model-a").coverage, "partial");
});

// --- AC-006: acceptance authority --------------------------------------

test("AC-006: a dispatch acceptance without an authority reference is rejected", () => {
  const raw = acceptanceEvent("a1", "dispatch-1", "change-a", 1, "2026-01-05T00:00:00Z") as Record<string, unknown>;
  delete raw.authority_ref;
  const problems = rejected(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-03T00:00:00Z"),
      raw,
      endEvent("e1", "dispatch-1", "change-a", "2026-01-06T00:00:00Z"),
    ]),
  );
  assert.ok(problems.some((problem) => problem.includes("authority_ref")), problems.join("; "));
});

// --- AC-009: no observation file ---------------------------------------

test("AC-009: with no observation file the dispatch section is unavailable with a reason and the command exits 0", () => {
  const root = tmpRoot();
  const { exitCode, output } = run(["--root", root, "--json"]);
  assert.equal(exitCode, 0);
  const report = JSON.parse(output);
  assert.equal(report.dispatchOutcomes.available, false);
  assert.ok(report.dispatchOutcomes.reason.includes("delivery-observations.json"), report.dispatchOutcomes.reason);
  assert.ok(
    report.unavailable.some(
      (entry: { metric: string; reason: string }) => entry.metric === "Dispatch outcomes" && entry.reason.length > 0,
    ),
  );

  const check = run(["--root", root, "--check"]);
  assert.equal(check.exitCode, 0);
});

// --- AC-010: per-role, per-model integration rows -----------------------

test("AC-010: a fixture with two roles and two models lists hand-computed dispatch rows", () => {
  const root = tmpRoot();
  const now = new Date("2026-01-20T00:00:00Z");
  writeObservations(
    root,
    fileWith(
      [
        dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
        roundEvent("r1", "dispatch-1", "change-a", 1, "2026-01-03T00:00:00Z"),
        verdictEvent("v1", "dispatch-1", "change-a", 1, "2026-01-03T12:00:00Z", "changes_requested"),
        roundEvent("r2", "dispatch-1", "change-a", 2, "2026-01-05T00:00:00Z"),
        acceptanceEvent("a1", "dispatch-1", "change-a", 2, "2026-01-07T00:00:00Z", "accepted"),
        endEvent("e1", "dispatch-1", "change-a", "2026-01-08T00:00:00Z", "completed"),
        dispatchEvent("d2", "dispatch-2", "change-a", "2026-01-02T01:00:00Z"),
        roundEvent("r3", "dispatch-2", "change-a", 1, "2026-01-06T00:00:00Z"),
        acceptanceEvent("a2", "dispatch-2", "change-a", 1, "2026-01-09T00:00:00Z", "rejected"),
        endEvent("e2", "dispatch-2", "change-a", "2026-01-10T00:00:00Z", "failed"),
        dispatchEvent("d3", "dispatch-3", "change-b", "2026-01-03T00:00:00Z", {
          role: "reviewer",
          actual: { provider: "unknown", model: "unknown", effort: "unknown" },
        }),
        roundEvent("r4", "dispatch-3", "change-b", 1, "2026-01-04T00:00:00Z"),
        endEvent("e3", "dispatch-3", "change-b", "2026-01-05T00:00:00Z", "cancelled"),
        dispatchEvent("d4", "dispatch-4", "change-b", "2026-01-04T00:00:00Z", {
          role: "reviewer",
          actual: { provider: "provider-b", model: "model-b", effort: "low" },
        }),
      ],
      [dispatchCoverage("change-a")],
    ),
  );

  const report = buildReport(root, undefined, now);
  assert.equal(report.dispatchOutcomes.available, true);
  if (!report.dispatchOutcomes.available) return;

  const implementer = report.dispatchOutcomes.rows.find((row) => row.role === "implementer" && row.model === "model-a");
  assert.ok(implementer);
  assert.equal(implementer.dispatches, 2);
  assert.equal(implementer.open, 0);
  assert.equal(implementer.completed, 1);
  assert.equal(implementer.failed, 1);
  assert.equal(implementer.ended, 2);
  assert.equal(implementer.roundsMean, 1.5);
  assert.equal(implementer.roundsMedian, 1.5);
  assert.equal(implementer.accepted, 1);
  assert.equal(implementer.rejected, 1);
  assert.equal(implementer.acceptanceUnknown, 0);
  assert.equal(implementer.firstRoundAccepted, 0);
  assert.equal(implementer.coverage, "complete");

  const unknownReviewer = report.dispatchOutcomes.rows.find((row) => row.role === "reviewer" && row.model === "unknown");
  assert.ok(unknownReviewer);
  assert.equal(unknownReviewer.dispatches, 1);
  assert.equal(unknownReviewer.cancelled, 1);
  assert.equal(unknownReviewer.acceptanceUnknown, 1);
  assert.equal(unknownReviewer.coverage, "partial");

  const modelBReviewer = report.dispatchOutcomes.rows.find((row) => row.role === "reviewer" && row.model === "model-b");
  assert.ok(modelBReviewer);
  assert.equal(modelBReviewer.open, 1);
  assert.equal(modelBReviewer.ended, 0);
  assert.equal(modelBReviewer.roundsMean, null);

  assert.equal(report.dispatchOutcomes.rows.length, 3);
  assert.equal(report.dispatchOutcomes.unrecorded, 0);
});

// --- SRS-010: diagnostics never echo a rejected raw value ----------------

test("SRS-010: a rejected dispatch-scoped id never reaches JSON or Markdown report output", () => {
  const root = tmpRoot();
  const secret = "/Users/private/secret";
  writeObservations(root, fileWith([dispatchEvent(secret, "dispatch-1", "change-a", "2026-01-02T00:00:00Z")]));

  const json = run(["--root", root, "--json"]);
  assert.equal(json.exitCode, 0);
  assert.equal(json.output.includes(secret), false, "JSON report echoed the rejected value");
  assert.ok(json.output.includes("dispatch-scoped"), "rejection should carry a fixed dispatch-scoped code");

  assert.equal(run(["--root", root]).exitCode, 0);
  const markdown = fs.readFileSync(path.join(root, "artifacts", "sdlc-metrics.md"), "utf8");
  assert.equal(markdown.includes(secret), false, "Markdown report echoed the rejected value");
  assert.equal(markdown.includes("Users"), false);
});

// --- SRS-007: canonical window timestamps -------------------------------

test("SRS-007: a Z and a fractional-second replay of one usage window is counted once", () => {
  const result = outcomes(
    fileWith([
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      usageEvent("u1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      usageEvent("u2", "dispatch-1", "change-a", "2026-01-02T00:00:00Z", {
        window_from: "2026-01-02T00:00:00.000Z",
        window_to: "2026-01-03T00:00:00.000Z",
      }),
    ]),
  );
  const summary = row(result, "implementer", "model-a").worker;
  assert.equal(summary.events, 1);
  assert.equal(summary.inputTokens, 100);
});

// --- SRS-006: first-round acceptance share as a fraction ----------------

test("SRS-006: a mixed cohort reports a hand-computed first-round share of 1/3", () => {
  const root = tmpRoot();
  const now = new Date("2026-01-20T00:00:00Z");
  writeObservations(
    root,
    fileWith([
      // Open dispatch: outside the ended denominator.
      dispatchEvent("d1", "dispatch-1", "change-a", "2026-01-02T00:00:00Z"),
      // Ended and accepted at round 1: the only numerator.
      dispatchEvent("d2", "dispatch-2", "change-a", "2026-01-02T01:00:00Z"),
      roundEvent("r2", "dispatch-2", "change-a", 1, "2026-01-03T00:00:00Z"),
      acceptanceEvent("a2", "dispatch-2", "change-a", 1, "2026-01-04T00:00:00Z", "accepted"),
      endEvent("e2", "dispatch-2", "change-a", "2026-01-05T00:00:00Z", "completed"),
      // Ended and accepted at round 2: ended, not first-round.
      dispatchEvent("d3", "dispatch-3", "change-a", "2026-01-02T02:00:00Z"),
      roundEvent("r3a", "dispatch-3", "change-a", 1, "2026-01-03T01:00:00Z"),
      roundEvent("r3b", "dispatch-3", "change-a", 2, "2026-01-03T02:00:00Z"),
      acceptanceEvent("a3", "dispatch-3", "change-a", 2, "2026-01-04T00:00:00Z", "accepted"),
      endEvent("e3", "dispatch-3", "change-a", "2026-01-05T00:00:00Z", "completed"),
      // Ended with no acceptance: acceptance unknown.
      dispatchEvent("d4", "dispatch-4", "change-a", "2026-01-02T03:00:00Z"),
      endEvent("e4", "dispatch-4", "change-a", "2026-01-05T00:00:00Z", "completed"),
    ]),
  );

  const report = buildReport(root, undefined, now);
  assert.equal(report.dispatchOutcomes.available, true);
  if (!report.dispatchOutcomes.available) return;
  const found = report.dispatchOutcomes.rows[0];
  assert.equal(found.dispatches, 4);
  assert.equal(found.open, 1);
  assert.equal(found.ended, 3);
  assert.equal(found.accepted, 2);
  assert.equal(found.firstRoundAccepted, 1);
  assert.equal(found.acceptanceUnknown, 1);

  const markdown = renderMarkdown(report);
  assert.ok(markdown.includes("| 1/3 |"), "rendered first-round share should read 1/3");
});
