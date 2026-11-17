// scripts/metrics/dispatch-parity.test.ts
//
// Parity between the recording helper (skills/.../record_dispatch.py) and the
// authoritative reader in ./dispatch.ts and ./delivery.ts. A full lifecycle is
// written by the helper alone; the reader must accept every byte of it and the
// aggregated row must match values computed by hand here.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildDispatchOutcomes } from "./dispatch";
import { intervalCovered, readDeliveryObservations } from "./delivery";
import type { GitPeriod } from "./git";
import type { DispatchOutcomeRow } from "./types";

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const HELPER = path.join(
  REPO_ROOT,
  "skills",
  "common",
  "common-subagent-driven-development",
  "scripts",
  "record_dispatch.py",
);

const CHANGE = "chg-parity";
const REVISION = "r1";
const OBSERVATIONS = path.join("artifacts", "metrics", "delivery-observations.json");

function periodOf(since: string, through: string): GitPeriod {
  const currentSince = new Date(since);
  const currentUntil = new Date(through);
  const windowMs = Math.max(currentUntil.getTime() - currentSince.getTime(), 1);
  return {
    currentSince,
    currentUntil,
    previousSince: new Date(currentSince.getTime() - windowMs),
    previousUntil: currentSince,
    label: "parity window",
  };
}

const PERIOD = periodOf("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z");

/** Runs the helper and fails with its stderr, so a writer refusal is never mistaken for a fixture bug. */
function record(file: string, args: string[]): string {
  return execFileSync("python3", [HELPER, ...args, "--observations", file], { encoding: "utf8" }).trim();
}

interface LifecycleOptions {
  file: string;
}

function writeLifecycle({ file }: LifecycleOptions): void {
  const common = ["--change", CHANGE, "--revision", REVISION];

  record(file, [
    "dispatch",
    ...common,
    "--dispatch-id", "d-a",
    "--role", "implementer",
    "--capability-hint", "standard",
    "--provider", "provider-a",
    "--model", "model-a",
    "--effort", "medium",
    "--authority-ref", "plan-1",
    "--orchestrator-ref", "orch-1",
    "--observed-at", "2026-01-05T10:00:00Z",
  ]);
  record(file, ["round", ...common, "--dispatch-id", "d-a", "--round", "1", "--observed-at", "2026-01-05T10:30:00Z"]);
  record(file, [
    "verdict", ...common,
    "--dispatch-id", "d-a",
    "--round", "1",
    "--verdict", "changes_requested",
    "--reviewer-ref", "reviewer-1",
    "--observed-at", "2026-01-05T10:45:00Z",
  ]);
  record(file, ["round", ...common, "--dispatch-id", "d-a", "--round", "2", "--observed-at", "2026-01-05T11:00:00Z"]);
  record(file, [
    "verdict", ...common,
    "--dispatch-id", "d-a",
    "--round", "2",
    "--verdict", "approved",
    "--reviewer-ref", "reviewer-1",
    "--observed-at", "2026-01-05T11:15:00Z",
  ]);
  record(file, ["end", ...common, "--dispatch-id", "d-a", "--state", "completed", "--observed-at", "2026-01-05T12:00:00Z"]);
  record(file, [
    "acceptance", ...common,
    "--dispatch-id", "d-a",
    "--round", "2",
    "--decision", "accepted",
    "--authority-ref", "maintainer-1",
    "--observed-at", "2026-01-05T12:30:00Z",
  ]);

  record(file, [
    "dispatch",
    ...common,
    "--dispatch-id", "d-b",
    "--role", "implementer",
    "--capability-hint", "fast",
    "--provider", "provider-a",
    "--model", "model-a",
    "--effort", "low",
    "--authority-ref", "plan-1",
    "--orchestrator-ref", "orch-1",
    "--observed-at", "2026-01-05T13:00:00Z",
  ]);
  record(file, ["round", ...common, "--dispatch-id", "d-b", "--round", "1", "--observed-at", "2026-01-05T13:30:00Z"]);
  record(file, [
    "verdict", ...common,
    "--dispatch-id", "d-b",
    "--round", "1",
    "--verdict", "approved",
    "--reviewer-ref", "reviewer-1",
    "--observed-at", "2026-01-05T13:45:00Z",
  ]);
  record(file, ["end", ...common, "--dispatch-id", "d-b", "--state", "completed", "--observed-at", "2026-01-05T14:00:00Z"]);

  record(file, [
    "coverage", ...common,
    "--from", "2026-01-01T00:00:00Z",
    "--through", "2026-01-10T00:00:00Z",
    "--complete",
  ]);
}

test("the helper's full lifecycle is accepted by the reader with no issues", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "metrics-dispatch-parity-"));
  const file = path.join(root, OBSERVATIONS);
  writeLifecycle({ file });

  const onDisk = JSON.parse(fs.readFileSync(file, "utf8")) as {
    source_kind: string;
    events: { id: string; kind: string }[];
    coverage: { complete: boolean }[];
  };
  assert.equal(onDisk.source_kind, "operator-recorded");
  assert.equal(onDisk.events.length, 11, "two dispatches, three rounds, three verdicts, two ends, one acceptance");
  assert.deepEqual(
    onDisk.events.map((event) => event.kind).sort(),
    [
      "dispatch",
      "dispatch",
      "dispatch-acceptance",
      "dispatch-end",
      "dispatch-end",
      "dispatch-round",
      "dispatch-round",
      "dispatch-round",
      "dispatch-verdict",
      "dispatch-verdict",
      "dispatch-verdict",
    ],
  );
  for (const event of onDisk.events) {
    assert.ok(!event.id.includes("|"), `id ${event.id} must not carry the identity separator`);
  }
  assert.equal(onDisk.coverage.length, 1);

  const set = readDeliveryObservations(root);
  assert.deepEqual(set.issues.map((issue) => issue.message), [], "the reader must accept every helper write");
  assert.ok(set.observations);
  assert.equal(set.observations.events.length, 11);
  assert.deepEqual(
    set.observations.coverage[0].kinds,
    ["dispatch", "dispatch-round", "dispatch-verdict", "dispatch-acceptance", "dispatch-end"],
  );
});

test("the reader aggregates the helper's dispatches into hand-computed values", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "metrics-dispatch-parity-"));
  writeLifecycle({ file: path.join(root, OBSERVATIONS) });
  const set = readDeliveryObservations(root);
  assert.deepEqual(set.issues.map((issue) => issue.message), []);
  assert.ok(set.observations);
  const observations = set.observations;

  const outcomes = buildDispatchOutcomes(set, {
    period: PERIOD,
    observationsPath: OBSERVATIONS,
    intervalCovered: (changeId, kind, revision, startMs, endMs) =>
      intervalCovered(observations, changeId, kind, revision, startMs, endMs),
  });

  assert.equal(outcomes.available, true);
  if (!outcomes.available) return;
  assert.equal(outcomes.rows.length, 1, "one (role, model) row");
  const [row] = outcomes.rows as [DispatchOutcomeRow];

  assert.deepEqual(
    {
      role: row.role,
      model: row.model,
      dispatches: row.dispatches,
      open: row.open,
      completed: row.completed,
      cancelled: row.cancelled,
      failed: row.failed,
      errored: row.errored,
      ended: row.ended,
      roundsMean: row.roundsMean,
      roundsMedian: row.roundsMedian,
      accepted: row.accepted,
      rejected: row.rejected,
      acceptanceUnknown: row.acceptanceUnknown,
      firstRoundAccepted: row.firstRoundAccepted,
      coverage: row.coverage,
    },
    {
      role: "implementer",
      model: "model-a",
      dispatches: 2,
      open: 0,
      completed: 2,
      cancelled: 0,
      failed: 0,
      errored: 0,
      ended: 2,
      // d-a has two rounds, d-b one: 3 rounds over 2 ended dispatches.
      roundsMean: 1.5,
      roundsMedian: 1.5,
      // d-a was accepted on round 2, so it is not a first-round acceptance.
      accepted: 1,
      rejected: 0,
      acceptanceUnknown: 1,
      firstRoundAccepted: 0,
      coverage: "complete",
    },
  );

  // No dispatch-usage events were written: both expected pairs per actor are unknown, never zero.
  assert.equal(row.worker.missingPairs, 2);
  assert.equal(row.supervision.missingPairs, 2);
  assert.equal(row.worker.coverage, "partial");
  assert.equal(row.worker.inputTokens, 0);
  assert.equal(outcomes.unrecorded, 0);
});

test("the helper derives collision-free ids for a 128-character id and the former collision pair", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "metrics-dispatch-parity-"));
  const file = path.join(root, OBSERVATIONS);
  const common = ["--change", CHANGE, "--revision", REVISION];
  const longId = "a".repeat(128);

  record(file, [
    "dispatch", ...common,
    "--dispatch-id", longId,
    "--role", "implementer",
    "--capability-hint", "standard",
    "--authority-ref", "plan-1",
    "--observed-at", "2026-01-05T10:00:00Z",
  ]);
  // The pair that collided under `|`-to-`#` substitution: (d#1,1,r) versus (d,1,1#r).
  for (const [dispatchId, reviewerRef] of [
    ["d#1", "r"],
    ["d", "1#r"],
  ]) {
    record(file, [
      "dispatch", ...common,
      "--dispatch-id", dispatchId,
      "--role", "implementer",
      "--capability-hint", "standard",
      "--authority-ref", "plan-1",
      "--observed-at", "2026-01-05T10:05:00Z",
    ]);
    record(file, ["round", ...common, "--dispatch-id", dispatchId, "--round", "1", "--observed-at", "2026-01-05T10:10:00Z"]);
    record(file, [
      "verdict", ...common,
      "--dispatch-id", dispatchId,
      "--round", "1",
      "--verdict", "approved",
      "--reviewer-ref", reviewerRef,
      "--observed-at", "2026-01-05T10:15:00Z",
    ]);
  }

  const set = readDeliveryObservations(root);
  assert.deepEqual(set.issues.map((issue) => issue.message), [], "the reader must accept every derived id");
  assert.ok(set.observations);

  const ids = set.observations.events.map((event) => event.id);
  assert.equal(new Set(ids).size, ids.length, "every id must be distinct");
  for (const id of ids) assert.ok(id.length <= 60, `${id} must stay within the reference-string bound`);

  const verdictIds = set.observations.events
    .filter((event) => event.kind === "dispatch-verdict")
    .map((event) => event.id);
  assert.equal(verdictIds.length, 2);
  assert.notEqual(verdictIds[0], verdictIds[1], "the former collision pair must not collapse");
  const longDispatch = set.observations.events.find(
    (event) => event.kind === "dispatch" && event.dispatch_id === longId,
  );
  assert.ok(longDispatch, "the 128-character dispatch id must survive the round trip");
});
