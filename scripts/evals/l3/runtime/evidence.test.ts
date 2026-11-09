/**
 * Evidence codec and collector wire-boundary tests.
 *
 * The representative evidence records below exercise validated classes; they
 * are not a maximum-cardinality fixture or a production sizing claim.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  decodeEvidence,
  encodeEvidence,
  evidenceSectionOf,
  type EvidenceItem,
} from "./guest/evidence";
import {
  COLLECTOR_ARTIFACTS,
  COLLECTOR_MAX_FRAME_BYTES,
  runCollector,
} from "./guest/collector";
import { DEFAULT_SERIAL_EVIDENCE_LIMITS, parseSerialEvidence } from "./vz";
import { SerialCleanEOF } from "./types";

const REPRESENTATIVE_EXCHANGES = 1;
const REPRESENTATIVE_DISPOSITIONS = REPRESENTATIVE_EXCHANGES * 2;
const BUILD_OUTPUT_BYTES = 4 * 1024 * 1024;
const RUN_OUTPUT_BYTES = 4 * 1024 * 1024;

/** Longest identifier a D1 `Id` allows: 64 characters. */
function longId(prefix: string, index: number): string {
  const body = `${prefix}-${index}`;
  return `${body}${"-x".repeat(Math.ceil((64 - body.length) / 2))}`.slice(0, 64);
}

/**
 * Worst-case console bytes: NUL. Under JSON string framing a NUL escapes to six
 * bytes, so this is the byte value that maximises wire cost for a text carrier;
 * the base64 carrier removes that amplification entirely.
 */
function worstCaseConsole(size: number): Buffer {
  return Buffer.alloc(size, 0);
}

/** Mix of real console shapes, including invalid UTF-8 and unbalanced quotes. */
function mixedConsoleBytes(): Buffer {
  const parts = [
    Buffer.from("\u0000\u0001\u001f\u007f\n", "utf8"),
    Buffer.from([0xff, 0xfe, 0x80, 0x81, 0x0a]),
    Buffer.from('"unbalanced quote \\ and backslash \\" tail', "utf8"),
    Buffer.from([0x00, 0x00, 0x00]),
  ];
  return Buffer.concat(parts);
}

function representativeEvidence(): EvidenceItem[] {
  const attempt_id = longId("att", 1);
  const process_session_id = longId("ps", 1);
  const connection_id = longId("conn", 1);
  const message_id = longId("msg", 1);
  const event = (event_seq: number, state: "accepted" | "delivered") => ({
    attempt_id, process_session_id, event_seq, request_seq: 1, connection_id, message_id,
    bytes: 12, observed_monotonic_ms: 9, state,
  });
  const overload = {
    case_id: "overload", passed: true, whole_case_pass: true,
    coverage: {
      preloss_admitted_streams: 24, post_loss1_offered_streams: 24, post_loss2_offered_streams: 24,
      reader_stalls_observed: 1, reader_stall_seconds: 2, reconnects_observed: 1,
      drain_bounded: true, drain_duration_ms: 10, undelivered_bounded: true, all_coverage_met: true,
    },
    safety: {
      low12_control_rejected: true, safe_shedding_qualifies: true, downstream_capacity_honored: true,
      dropped_not_labeled_delivered: true, limits_fit_diagnostic_policy: true, retries_within_declared_bound: true,
      process_observation_bounded: true, liveness_observed: true, connection_buffers_within_limit: true,
      terminated_after_drain: true, transport_observation_verified: true, declared_limits: null,
      excess_forwarded_calls: 0, max_forwarded_attempts_per_second: 0,
    },
    metrics: {
      total_messages_allocated: 1, total_bytes_allocated: 12, total_messages_accepted: 1,
      total_messages_delivered: 1, total_bytes_delivered: 12, total_messages_dropped: 0,
      total_summary_offers: 0, forwarded_summary_attempts: 0, forwarded_summary_rejected: 0,
      max_forwarded_attempts_per_second: 0, stub_forwarded_calls: 0, stub_rejected_calls: 0,
    },
    timing_evidence: [], window_diagnostics: [], failure_reasons: [], unverified_reasons: [],
    failure_reason_count: 0, unverified_reason_count: 0,
  };
  const payload = Buffer.from("hello world!");
  const emptyDigest = createHash("sha256").update(Buffer.alloc(0)).digest("hex");
  return [
    {
      seq: 1,
      kind: "provenance",
      body: {
        run_id: longId("run", 1), attempt_id, manifest_sha256: "a".repeat(64), case_id: "overload",
        phase: "run", process_session_id, observer_refusal: null, observer_mapping: "b".repeat(64),
        admission_refusals: [], final_observation: { attempted: true, complete: true, reason: null, records: 2 },
        delivery_content_proof: "trusted_outbox_bytes_exact_match",
      },
    },
    {
      seq: 2,
      kind: "buffer_snapshot",
      body: { attempt_id, process_session_id, observation_id: "obs-1", observed_monotonic_ms: 9, complete: true, connection_buffers: [] },
    },
    {
      seq: 3,
      kind: "consumer_receipt",
      body: {
        attempt_id, process_session_id, read_seq: 2, send_seq: 1, connection_id, message_id,
        observed_monotonic_ms: 9, bytes: payload.length,
        sha256: createHash("sha256").update(payload).digest("hex"),
        payload_base64: payload.toString("base64"), content_verified: true,
      },
    },
    { seq: 4, kind: "transport_disposition", body: event(1, "accepted") },
    { seq: 5, kind: "transport_disposition", body: event(2, "delivered") },
    { seq: 6, kind: "disposition_history", body: event(1, "accepted") },
    { seq: 7, kind: "disposition_history", body: event(2, "delivered") },
    { seq: 8, kind: "auxiliary_observation", body: { sideband_frames: 0, sideband_bytes: 0, auxiliary: null } },
    {
      seq: 9,
      kind: "stub_observation",
      body: {
        stub: "summarizer",
        kind: "ledger_entry",
        entry: {
          sequence: 1, entry_id: "entry-1", attempt_id, arrival_ms: 9, scheduled_ms: 9,
          completed_ms: 10, latency_ms: 1, request_id: "req-1", connection_id,
          message_ids: [message_id], delivered: true, error_code: null, retry: false,
        },
      },
    },
    { seq: 10, kind: "process_observation", body: { pid: 100, rss_bytes: 1, threads: 1, state: "running", memory_current_bytes: null, memory_peak_bytes: null } },
    { seq: 11, kind: "termination", body: { container_state: "running", exit_code: null, finished_at: null, pid: 100 } },
    { seq: 12, kind: "restart", body: { reason: "test_restart", restart_count: 1 } },
    { seq: 13, kind: "phase", body: { phase: "resumed", at_ms: 9 } },
    {
      seq: 14,
      kind: "raw_output_chunk",
      body: {
        process_session_id: "build-container-100", stream: "combined", stream_mask_base64: "",
        stream_offset: 0, capture_order: 0, artifact_offset: 0, bytes: 0, exported_bytes: 0, sha256: emptyDigest,
      },
    },
    { seq: 15, kind: "output_marker", body: { reason: null, failure: null } },
    { seq: 16, kind: "verdict", body: overload },
  ];
}

describe("evidence codec", () => {
  it("round-trips representative typed evidence without allocating line arrays", () => {
    const items = representativeEvidence();
    const section = encodeEvidence(items, { max_bytes: 256 * 1024 });
    assert.equal(section.ok, true, section.reason ?? "");
    assert.equal(section.items, items.length);
    assert.equal(section.wire.length, section.bytes);
    const decoded = decodeEvidence(section.wire, { max_bytes: 256 * 1024 });
    assert.equal(decoded.ok, true, decoded.reason ?? "");
    assert.deepEqual(decoded.items, items, "decoded evidence equals the original set");
  });

  it("is all-or-nothing: a budget shortfall fails instead of dropping evidence", () => {
    const section = encodeEvidence(representativeEvidence(), { max_bytes: 64 });
    assert.equal(section.ok, false);
    assert.match(section.reason ?? "", /does not fit/);
    assert.equal(section.wire.length, 0, "a failed export emits no partial wire");

    const oversizedItem = encodeEvidence(
      [{ seq: 1, kind: "phase", body: { phase: "x".repeat(2_000), at_ms: 0 } }],
      { max_bytes: 4_096, max_line_bytes: 1_024 },
    );
    assert.equal(oversizedItem.ok, false);
    assert.match(oversizedItem.reason ?? "", /line ceiling/);
  });

  it("rejects truncated, reordered, duplicated, malformed-class and over-budget sections", () => {
    const section = encodeEvidence(representativeEvidence(), { max_bytes: 256 * 1024 });
    assert.equal(section.ok, true, section.reason ?? "");
    const body = section.wire;
    const lines = body.toString("utf8").split("\n").slice(0, -1).map((line) => `${line}\n`);

    assert.equal(decodeEvidence(body.subarray(0, body.length - 40), { max_bytes: 256 * 1024 }).ok, false);
    const reordered = [lines[0], lines[2], lines[1], ...lines.slice(3)].join("");
    assert.equal(decodeEvidence(Buffer.from(reordered, "utf8"), { max_bytes: 256 * 1024 }).ok, false);
    const duplicated = [lines[0], lines[1], lines[1], ...lines.slice(2)].join("");
    assert.equal(decodeEvidence(Buffer.from(duplicated, "utf8"), { max_bytes: 256 * 1024 }).ok, false);
    assert.equal(decodeEvidence(body, { max_bytes: 64 }).ok, false);

    const malformed = representativeEvidence();
    malformed[1] = {
      ...malformed[1]!,
      body: { ...(malformed[1]!.body as Record<string, unknown>), candidate_claim: true },
    };
    assert.equal(encodeEvidence(malformed, { max_bytes: 256 * 1024 }).ok, false);
    assert.equal(decodeEvidence(body, { max_bytes: 256 * 1024 }).ok, true);
    const tampered = Buffer.from(body.toString("utf8").replace("accepted", "dropped"), "utf8");
    assert.equal(decodeEvidence(tampered, { max_bytes: 256 * 1024 }).ok, false);
  });

  it("rejects malformed message id tables and reference encodings", () => {
    const section = encodeEvidence(representativeEvidence(), { max_bytes: 256 * 1024 });
    assert.equal(section.ok, true, section.reason ?? "");
    const text = section.wire.toString("utf8");
    const headerEnd = text.indexOf("\n");
    const header = text.slice(0, headerEnd + 1);
    const trailerStart = text.lastIndexOf("\n", text.length - 2) + 1;
    const trailer = text.slice(trailerStart);
    const lines = text.slice(headerEnd + 1, trailerStart).split("\n").filter(Boolean).map((line) => `${line}\n`);
    const reframe = (itemLines: readonly string[], headerLine = header): Buffer => {
      const digest = createHash("sha256");
      for (const line of itemLines) digest.update(line, "utf8");
      const end = `${JSON.stringify({
        l3e: { v: 3, k: "evidence-end", n: itemLines.length, s: digest.digest("hex") },
      })}\n`;
      return Buffer.from(`${headerLine}${itemLines.join("")}${end}`, "utf8");
    };
    const isSynthetic = (line: string) =>
      line.includes('"t":"message_id"') ||
      line.includes('"t":"verdict_timing_evidence"') ||
      line.includes('"t":"verdict_reasons"');
    const firstTable = lines.findIndex((line) => line.includes('"t":"message_id"'));
    const firstProduction = lines.findIndex((line) => !isSynthetic(line));
    const stubIndex = lines.findIndex((line) => line.includes('"t":"stub_observation"'));
    const decode = (itemLines: readonly string[], headerLine = header) =>
      decodeEvidence(reframe(itemLines, headerLine), { max_bytes: 256 * 1024 });
    const renumber = (itemLines: readonly string[]): string[] =>
      itemLines.map((line, index) => {
        const parsed = JSON.parse(line) as { i: Record<string, unknown> };
        parsed.i["s"] = index + 1;
        return `${JSON.stringify(parsed)}\n`;
      });

    // Duplicate table row (inside the prefix).
    const duplicated = [...lines];
    duplicated.splice(firstTable! + 1, 0, lines[firstTable]!);
    assert.match(decode(renumber(duplicated)).reason ?? "", /repeats an identifier/);
    // Table row after a production row.
    const moved = [...lines];
    const [tableLine] = moved.splice(firstTable!, 1);
    moved.push(tableLine!);
    assert.match(decode(renumber(moved)).reason ?? "", /must precede|unknown message id/);
    // Unreferenced table row.
    const unreferenced = renumber([
      ...lines.slice(0, firstProduction!),
      `${JSON.stringify({ i: { s: 1, t: "message_id", b: { id: "unreferenced-id" } } })}\n`,
      ...lines.slice(firstProduction!),
    ]);
    assert.match(decode(unreferenced).reason ?? "", /unreferenced/);
    // Out-of-range, negative, fractional and mixed references.
    for (const [ref, pattern] of [
      [9999, /unknown message id/],
      [-1, /unknown message id/],
      [0.5, /unknown message id/],
    ] as const) {
      const mutated = [...lines];
      const parsed = JSON.parse(mutated[stubIndex]!) as {
        i: { b: { entry: Record<string, unknown> } };
      };
      parsed.i.b.entry["message_id_refs"] = [ref];
      mutated[stubIndex] = `${JSON.stringify(parsed)}\n`;
      assert.match(decode(mutated).reason ?? "", pattern);
    }
    const mixed = [...lines];
    const parsedMixed = JSON.parse(mixed[stubIndex]!) as {
      i: { b: { entry: Record<string, unknown> } };
    };
    parsedMixed.i.b.entry["message_ids"] = ["also-an-id"];
    mixed[stubIndex] = `${JSON.stringify(parsedMixed)}\n`;
    assert.match(decode(mixed).reason ?? "", /mixes message ids and references/);
    // Only the canonical v3 header is accepted.
    assert.match(
      decode(lines, header.replace('"v":3', '"v":2')).reason ?? "",
      /version\/kind is unsupported/,
    );
  });

  it("relays representative evidence and binary console bytes through the collector", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "l3-evidence-relay-"));
    try {
      const consoleBody = Buffer.concat([
        worstCaseConsole(BUILD_OUTPUT_BYTES),
        mixedConsoleBytes(),
        worstCaseConsole(RUN_OUTPUT_BYTES - mixedConsoleBytes().length),
      ]);
      assert.equal(consoleBody.length, BUILD_OUTPUT_BYTES + RUN_OUTPUT_BYTES);
      const items = representativeEvidence();
      const section = encodeEvidence(items, { max_bytes: 256 * 1024 });
      assert.equal(section.ok, true, section.reason ?? "");
      const eventsBody = Buffer.concat([
        Buffer.from(`${JSON.stringify({ version: 1, observation: { kind: "build_finished" } })}\n`, "utf8"),
        section.wire,
      ]);
      const receiptBody = Buffer.from(`${JSON.stringify({
        schema_version: 1,
        reason: "overload_completed",
        evidence_artifact: "events.jsonl#evidence",
        disposition_history_count: REPRESENTATIVE_DISPOSITIONS,
      })}\n`, "utf8");

      await writeFile(path.join(root, "events.jsonl"), eventsBody);
      await writeFile(path.join(root, "output.log"), consoleBody);
      await writeFile(path.join(root, "receipt.json"), receiptBody);

      const sizes = await Promise.all(
        COLLECTOR_ARTIFACTS.map(async (artifact) => (await stat(path.join(root, artifact))).size),
      );
      const artifactLimit = Math.max(...sizes);

      const frames: string[] = [];
      const collected = await runCollector({
        evidenceRoot: root,
        writeFrame: async (frame) => frames.push(frame),
        limits: { artifact_bytes: artifactLimit, total_bytes: 16 * 1024 * 1024 },
      });

      // Every frame is inside the frame ceiling, including the worst-case chunk.
      for (const frame of frames) {
        assert.ok(
          Buffer.byteLength(frame, "utf8") <= COLLECTOR_MAX_FRAME_BYTES,
          "a frame exceeded the declared frame ceiling",
        );
      }

      const queue = [...frames];
      const outcome = await parseSerialEvidence(
        async () => {
          const next = queue.shift();
          if (next === undefined) throw new SerialCleanEOF();
          return next;
        },
        Date.now() + 120_000,
        {
          ...DEFAULT_SERIAL_EVIDENCE_LIMITS,
          artifact_bytes: artifactLimit,
          total_bytes: collected.bytes,
          frames: collected.frames + 1,
        },
      );
      assert.equal(outcome.available, true, outcome.available ? "" : `${outcome.reason}: ${outcome.detail}`);
      if (!outcome.available) return;

      const retained = new Map(outcome.artifacts.map((artifact) => [artifact.name, artifact]));
      assert.deepEqual(
        retained.get("output.log")?.bytes,
        consoleBody,
        "the complete raw console survives the wire byte for byte",
      );
      assert.deepEqual(retained.get("receipt.json")?.bytes, receiptBody);
      assert.equal(retained.get("output.log")?.sha256, createHash("sha256").update(consoleBody).digest("hex"));

      const retainedEvents = retained.get("events.jsonl")?.bytes;
      assert.notEqual(retainedEvents, undefined);
      const retainedSection = evidenceSectionOf(retainedEvents ?? Buffer.alloc(0));
      assert.notEqual(retainedSection, null);
      const roundTripped = decodeEvidence(retainedSection ?? Buffer.alloc(0), {
        max_bytes: 256 * 1024 * 1024,
      });
      assert.equal(roundTripped.ok, true, roundTripped.reason ?? "");
      assert.deepEqual(roundTripped.items, items, "original evidence equals the decoded evidence");

    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
