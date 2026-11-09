/**
 * End-to-end evidence round-trip for verdicts produced by the REAL D3 drivers
 * (read-only import of `cases/`; this file never edits D3 source).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OverloadCaseDriver,
  PaymentCaseDriver,
  ProviderStub,
  SummarizerStub,
  TenantCaseDriver,
  VirtualMonotonicScheduler,
} from "../cases/index.js";
import { decodeEvidence, encodeEvidence } from "./guest/evidence.js";
import { summarizerAttributionFor } from "./guest/controller-main.js";

const ok = (seq: number) =>
  JSON.stringify({ version: 1, seq, ok: false, error: { code: "INVALID_REQUEST", message: "test-error" } });

function transport() {
  return {
    async sendRawRequest(frame: string) {
      const request = JSON.parse(frame) as { seq: number };
      return ok(request.seq);
    },
    async getTransportObservation() {
      return { sideband_frames: 0, sideband_bytes: 0, auxiliary: null };
    },
  };
}

function controller(nowMs: () => number) {
  let sequence = 0;
  return {
    async resetState() {},
    async restartRetainingState() {},
    async freezeAndSnapshot() {
      return null;
    },
    async resume() {},
    async observeConnectionBufferSnapshot() {
      sequence += 1;
      return {
        attempt_id: "att-e2e", process_session_id: "ps-1", observation_id: `buf-${sequence}`,
        observed_monotonic_ms: nowMs(), complete: true, connection_buffers: [],
      };
    },
    async getTerminationObservation() {
      sequence += 1;
      return {
        attempt_id: "att-e2e", process_session_id: "ps-1", observation_id: `term-${sequence}`,
        observed_monotonic_ms: nowMs(), phase: "exited" as const, pid: 42,
        exit_receipt_id: "rcpt-42", last_live_memory_rss_bytes: 1,
      };
    },
    async observeMessageDispositions() {
      return [];
    },
  };
}

function roundTrip(verdict: unknown): void {
  const section = encodeEvidence([{ seq: 1, kind: "verdict", body: verdict }], { max_bytes: 8 * 1024 * 1024 });
  assert.equal(section.ok, true, section.reason ?? "");
  const decoded = decodeEvidence(section.wire, { max_bytes: 8 * 1024 * 1024 });
  assert.equal(decoded.ok, true, decoded.reason ?? "");
  assert.equal(decoded.items.length, 1);
  assert.deepEqual(decoded.items[0]?.body, verdict);
}

describe("real D3 verdicts round-trip through evidence v3", () => {
  it("payment verdict from the real driver", async () => {
    const provider = new ProviderStub("att-e2e");
    const driver = new PaymentCaseDriver(transport(), controller(() => 1), provider);
    const verdict = {
      case_id: "payment",
      base: await driver.runBaseSchedule(),
      adverse: await driver.runAdverseSchedule(),
      changed: await driver.runChangedConstraintSchedule(),
      negative: await driver.runNegativeOutcomeControl(),
    };
    roundTrip(verdict);
  });

  it("tenant verdict from the real driver", async () => {
    const reader = {
      isStageCorrespondenceAccepted: () => true,
      async readFrozenStages() {
        return [];
      },
    };
    const driver = new TenantCaseDriver(transport(), controller(() => 1), reader);
    roundTrip(await driver.runSchedule());
  });

  it("overload verdict from the real driver", async () => {
    const scheduler = new VirtualMonotonicScheduler();
    const summarizer = new SummarizerStub("att-e2e", { nowMs: () => scheduler.nowMs(), scheduler });
    const driver = new OverloadCaseDriver(transport(), controller(() => scheduler.nowMs()), summarizer, scheduler);
    roundTrip(await driver.runWorkload());
  });

  it("round-trips a real untrusted summarizer ledger entry", async () => {
    const stub = new SummarizerStub("att-e2e", { nowMs: () => 0, serviceLatencyMs: 1 });
    stub.beginWorkload(0);
    stub.registerWorkloadMessage("conn-1", "msg-trusted");
    await stub.handleSummarize(
      { request_id: "req-untrusted", connection_id: "conn-1", message_ids: ["msg-untrusted"] },
      {},
    );
    const entry = stub.getLedger()[0];
    assert.equal(entry?.untrusted_message_count, 1);
    assert.deepEqual(entry?.message_ids, []);
    const section = encodeEvidence(
      [{ seq: 1, kind: "stub_observation", body: { stub: "summarizer", kind: "ledger_entry", entry } }],
      { max_bytes: 1024 * 1024 },
    );
    assert.equal(section.ok, true, section.reason ?? "");
    const decoded = decodeEvidence(section.wire, { max_bytes: 1024 * 1024 });
    assert.equal(decoded.ok, true, decoded.reason ?? "");
    assert.equal(
      (decoded.items[0]?.body as { entry?: { untrusted_message_count?: number } }).entry?.untrusted_message_count,
      1,
    );
  });

  it("builds untrusted relay attribution with empty ids and the exact count", () => {
    const attribution = summarizerAttributionFor({
      entry: {
        sequence: 0, entry_id: "entry-1", attempt_id: "att-e2e", connection_id: "conn-1",
        message_ids: [], untrusted_message_count: 2, arrival_ms: 5,
      },
      ledgerLength: 1,
      expectedIndex: 0,
      attemptId: "att-e2e",
      expectedConnectionId: "conn-1",
      expectedMessageIds: ["msg-untrusted-a", "msg-untrusted-b"],
      processSessionId: "ps-1",
      relaySeq: 1,
      relayConnectionId: "summarizer-conn",
      exchangeId: "summarizer-conn-seq-1",
    });
    assert.deepEqual(attribution["message_ids"], []);
    assert.equal(attribution["untrusted_message_count"], 2);
    const section = encodeEvidence(
      [{ seq: 1, kind: "stub_observation", body: { stub: "summarizer", kind: "relay_attribution", attribution } }],
      { max_bytes: 1024 * 1024 },
    );
    assert.equal(section.ok, true, section.reason ?? "");
    const decoded = decodeEvidence(section.wire, { max_bytes: 1024 * 1024 });
    assert.equal(decoded.ok, true, decoded.reason ?? "");
    assert.deepEqual(decoded.items[0]?.body, {
      stub: "summarizer", kind: "relay_attribution", attribution,
    });
  });

  it("accepts a mixed trusted/untrusted relay call with only the untrusted count", () => {
    const attribution = summarizerAttributionFor({
      entry: {
        sequence: 0, entry_id: "entry-mixed", attempt_id: "att-e2e", connection_id: "conn-1",
        message_ids: [], untrusted_message_count: 1, arrival_ms: 5,
      },
      ledgerLength: 1,
      expectedIndex: 0,
      attemptId: "att-e2e",
      expectedConnectionId: "conn-1",
      expectedMessageIds: ["msg-trusted", "msg-untrusted"],
      processSessionId: "ps-1",
      relaySeq: 1,
      relayConnectionId: "summarizer-conn",
      exchangeId: "summarizer-conn-seq-1",
    });
    assert.deepEqual(attribution["message_ids"], []);
    assert.equal(attribution["untrusted_message_count"], 1);
    const section = encodeEvidence(
      [{ seq: 1, kind: "stub_observation", body: { stub: "summarizer", kind: "relay_attribution", attribution } }],
      { max_bytes: 1024 * 1024 },
    );
    assert.equal(section.ok, true, section.reason ?? "");
    const decoded = decodeEvidence(section.wire, { max_bytes: 1024 * 1024 });
    assert.equal(decoded.ok, true, decoded.reason ?? "");
    assert.equal(
      (decoded.items[0]?.body as { attribution?: { untrusted_message_count?: number } })
        .attribution?.untrusted_message_count,
      1,
    );
  });
});
