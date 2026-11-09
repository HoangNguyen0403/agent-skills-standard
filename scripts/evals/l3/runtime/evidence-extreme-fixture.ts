/**
 * Maximum-cardinality evidence fixture for the frozen diagnostic workload.
 *
 * This is the *source algebra*, not a measured run: every cardinality is derived
 * from trusted ceilings, and every variable field is written at its widest legal
 * value (64-character ids, safe-integer maxima, 1024-byte payloads, 4 MiB raw).
 *
 * Derivation (trusted ceilings, not a compliant candidate's declared retries):
 *   messages          24 clients x 10 msg/s x 60 s                  = 14,400
 *   consumer receipts reads 1,440 x (4,096 / 1,024 = 4)             =  5,760
 *   transport         1 accepted + 1 terminal per message           = 28,800
 *   history           one-way lifecycle: accepted + optional
 *                     retained + at most one final per message      = 43,200
 *   offers            24 eligible streams x 60 windows              =  1,440
 *   forwarded         relay MAX_FRAMES / summarizer ledgerCap 4,096 =  4,096
 *   message ids       distinct ids across ledger/attribution
 *                     (256 ids per call, stored once)               = 14,400
 *   stub observations ledger + cancellation + attribution
 *                     + one socket stats row per relay             = 12,289
 *   buffer snapshots  one per workload second, 24 trusted conns     =     60
 *   process           sampling 62 + one observe_process per drain
 *                     poll (5,001)                                  =  5,063
 *   termination polls drain deadline 5,000 ms at >=1 ms per poll
 *                     + the initial poll                           =  5,001
 *   raw chunks        build 4 MiB + overload run 4 MiB              =      2
 */

import { createHash } from "node:crypto";
import type { EvidenceItem } from "./guest/evidence.js";

export const MAX_SAFE = Number.MAX_SAFE_INTEGER;
export const MESSAGES = 24 * 10 * 60;
/** Reads x messages per read: 1,440 reads x (4,096 / 1,024 = 4). */
export const DELIVERED = 1_440 * (4_096 / 1_024);
export const DISPOSITIONS = 2 * MESSAGES;
/** accepted + retained + final, one-way lifecycle, up to three rows/message. */
export const HISTORY = 3 * MESSAGES;
export const OFFERS = 24 * 60;
export const FORWARDED = 4_096;
export const IDS_PER_CALL = 256;
export const CONNECTIONS = 24;
export const SNAPSHOTS = 60;
export const PROCESS_SAMPLES = 62;
export const TERMINATION_POLLS = 5_001;
export const PROCESS_OBSERVATIONS = PROCESS_SAMPLES + TERMINATION_POLLS;
export const RAW_CHUNK_BYTES = 4 * 1024 * 1024;

/** Expected totals for the fixture; change only with the algebra. */
export const EXPECTED_ITEMS = 100_181;
export const EXPECTED_WIRE_BYTES = 74_837_921;
export const EXPECTED_MAX_LINE_BYTES = 865_887;

const id = (prefix: string): string => `${prefix}${"-x".repeat(64)}`.slice(0, 64);
const digest = "a".repeat(64);

export function extremeEvidence(): EvidenceItem[] {
  const attempt_id = id("att");
  const process_session_id = id("ps");
  const payload = Buffer.alloc(1024, 0x41);
  const payload_base64 = payload.toString("base64");
  const payloadSha = createHash("sha256").update(payload).digest("hex");
  const items: EvidenceItem[] = [];
  let seq = 0;
  const push = (kind: EvidenceItem["kind"], body: unknown): void => {
    seq += 1;
    items.push({ seq, kind, body });
  };

  push("provenance", {
    run_id: id("run"), attempt_id, manifest_sha256: digest, case_id: "overload", phase: "run",
    process_session_id, observer_refusal: "r".repeat(240), observer_mapping: digest,
    admission_refusals: Array.from({ length: SNAPSHOTS + 2 }, (_, index) => `${index}:${"r".repeat(480)}`),
    final_observation: { attempted: true, complete: true, reason: null, records: DISPOSITIONS },
    delivery_content_proof: "trusted_outbox_bytes_exact_match",
  });

  for (let snapshot = 0; snapshot < SNAPSHOTS; snapshot += 1) {
    push("buffer_snapshot", {
      attempt_id, process_session_id, observation_id: id(`buf-${snapshot}`),
      observed_monotonic_ms: MAX_SAFE, complete: true,
      connection_buffers: Array.from({ length: CONNECTIONS }, (_, index) => ({
        connection_id: id(`conn-${index}`), buffered_bytes: MAX_SAFE,
      })),
    });
  }

  for (let message = 0; message < DELIVERED; message += 1) {
    push("consumer_receipt", {
      attempt_id, process_session_id, read_seq: MAX_SAFE, send_seq: MAX_SAFE - 1,
      connection_id: id(`conn-${message % CONNECTIONS}`), message_id: id(`msg-${message}`),
      observed_monotonic_ms: MAX_SAFE, bytes: 1024, sha256: payloadSha,
      payload_base64, content_verified: true,
    });
  }

  for (let index = 0; index < DISPOSITIONS; index += 1) {
    const shared = {
      attempt_id, process_session_id, event_seq: MAX_SAFE, request_seq: MAX_SAFE,
      connection_id: id(`conn-${index % CONNECTIONS}`), message_id: id(`msg-${index % MESSAGES}`), bytes: 1024,
      observed_monotonic_ms: MAX_SAFE,
    };
    push("transport_disposition", { ...shared, state: index % 2 === 0 ? "accepted" : "delivered" });
  }

  // One-way lifecycle: accepted, optional retained, at most one final per message.
  for (let index = 0; index < HISTORY; index += 1) {
    const message = index % MESSAGES;
    const stage = Math.floor(index / MESSAGES);
    const base = {
      attempt_id, process_session_id, event_seq: MAX_SAFE, request_seq: MAX_SAFE,
      connection_id: id(`conn-${message % CONNECTIONS}`), message_id: id(`msg-${message}`), bytes: 1024,
      observed_monotonic_ms: MAX_SAFE,
    };
    if (stage === 0) push("disposition_history", { ...base, state: "accepted" });
    else if (stage === 1) push("disposition_history", { ...base, state: "retained", buffer_observation_id: id(`buf-${message}`) });
    else push("disposition_history", { ...base, state: "delivered" });
  }

  push("auxiliary_observation", {
    sideband_frames: MAX_SAFE, sideband_bytes: MAX_SAFE,
    auxiliary: {
      attempt_id, process_session_id, observation_id: id("aux-1"), observed_monotonic_ms: MAX_SAFE,
      offer_receipts: Array.from({ length: OFFERS }, (_, index) => ({
        attempt_id, process_session_id, seq: MAX_SAFE, connection_id: id(`conn-${index % CONNECTIONS}`),
        message_id: id(`msg-${index}`), offer_id: id(`offer-${index}`), window_index: MAX_SAFE,
        observed_monotonic_ms: MAX_SAFE, byte_count: 1024, sha256: payloadSha,
      })),
    },
  });

  for (let forwarded = 0; forwarded < FORWARDED; forwarded += 1) {
    const messageIds = Array.from({ length: IDS_PER_CALL }, (_, slot) =>
      id(`msg-${(forwarded * IDS_PER_CALL + slot) % MESSAGES}`),
    );
    push("stub_observation", {
      stub: "summarizer", kind: "ledger_entry",
      entry: {
        sequence: MAX_SAFE, entry_id: id(`entry-${forwarded}`), attempt_id, arrival_ms: MAX_SAFE,
        scheduled_ms: MAX_SAFE, completed_ms: MAX_SAFE, latency_ms: MAX_SAFE, request_id: id(`req-${forwarded}`),
        connection_id: id(`conn-${forwarded % CONNECTIONS}`), message_ids: messageIds,
        untrusted_message_count: 0,
        delivered: true, error_code: null, retry: true,
      },
    });
    push("stub_observation", {
      stub: "summarizer", kind: "cancellation",
      cancellation: { attempt_id, entry_id: id(`entry-${forwarded}`), cancelled_ms: MAX_SAFE, reason: "request_cancelled" },
    });
    push("stub_observation", {
      stub: "summarizer", kind: "relay_attribution",
      attribution: {
        attempt_id, process_session_id, relay_seq: MAX_SAFE, relay_connection_id: id("summarizer-conn"),
        exchange_id: id("summarizer-conn-seq-1"), entry_id: id(`entry-${forwarded}`),
        connection_id: id(`conn-${forwarded % CONNECTIONS}`), message_ids: messageIds,
        untrusted_message_count: 0,
        arrival_ms: MAX_SAFE,
      },
    });
  }
  push("stub_observation", {
    socket: "/run/l3/summarizer.sock", frames: MAX_SAFE, rejected: MAX_SAFE, succeeded: MAX_SAFE,
    errored: MAX_SAFE, dropped: MAX_SAFE, cancelled: MAX_SAFE,
  });

  for (let sample = 0; sample < PROCESS_OBSERVATIONS; sample += 1) {
    push("process_observation", {
      pid: MAX_SAFE, rss_bytes: MAX_SAFE, threads: MAX_SAFE, state: "R",
      memory_current_bytes: MAX_SAFE, memory_peak_bytes: MAX_SAFE,
    });
  }
  for (let poll = 0; poll < TERMINATION_POLLS; poll += 1) {
    push("termination", {
      container_state: "exited", exit_code: MAX_SAFE,
      finished_at: "2026-11-07T00:00:00.000000000Z", pid: MAX_SAFE,
    });
  }
  push("restart", { reason: "retain_state", restart_count: MAX_SAFE });
  push("phase", { phase: "resumed", at_ms: MAX_SAFE });

  const emptySha = createHash("sha256").update(Buffer.alloc(0)).digest("hex");
  const fullMask = Buffer.alloc(RAW_CHUNK_BYTES / 8).toString("base64");
  for (const session of ["build", "ps-1"] as const) {
    push("raw_output_chunk", {
      process_session_id: `${session}-${"b".repeat(48)}`.slice(0, 64), stream: "combined",
      stream_mask_base64: fullMask, stream_offset: 0, capture_order: session === "build" ? 0 : 1,
      artifact_offset: 0, bytes: RAW_CHUNK_BYTES, exported_bytes: RAW_CHUNK_BYTES, sha256: emptySha,
    });
  }
  push("output_marker", { reason: null, failure: null });

  push("verdict", {
    case_id: "overload", passed: true, whole_case_pass: true,
    coverage: {
      preloss_admitted_streams: MAX_SAFE, post_loss1_offered_streams: MAX_SAFE,
      post_loss2_offered_streams: MAX_SAFE, reader_stalls_observed: MAX_SAFE,
      reader_stall_seconds: MAX_SAFE, reconnects_observed: MAX_SAFE, drain_bounded: true,
      drain_duration_ms: MAX_SAFE, undelivered_bounded: true, all_coverage_met: true,
    },
    safety: {
      low12_control_rejected: true, safe_shedding_qualifies: true, downstream_capacity_honored: true,
      dropped_not_labeled_delivered: true, limits_fit_diagnostic_policy: true,
      retries_within_declared_bound: true, process_observation_bounded: true, liveness_observed: true,
      connection_buffers_within_limit: true, terminated_after_drain: true, transport_observation_verified: true,
      declared_limits: {
        max_connections: MAX_SAFE, max_buffer_bytes_per_connection: MAX_SAFE,
        drain_deadline_ms: MAX_SAFE, max_retries_per_request: MAX_SAFE,
      },
      excess_forwarded_calls: MAX_SAFE, max_forwarded_attempts_per_second: MAX_SAFE,
    },
    metrics: {
      total_messages_allocated: MAX_SAFE, total_bytes_allocated: MAX_SAFE, total_messages_accepted: MAX_SAFE,
      total_messages_delivered: MAX_SAFE, total_bytes_delivered: MAX_SAFE, total_messages_dropped: MAX_SAFE,
      total_summary_offers: MAX_SAFE, forwarded_summary_attempts: MAX_SAFE, forwarded_summary_rejected: MAX_SAFE,
      max_forwarded_attempts_per_second: MAX_SAFE, stub_forwarded_calls: MAX_SAFE, stub_rejected_calls: MAX_SAFE,
    },
    timing_evidence: Array.from({ length: FORWARDED }, (_, forwarded) => ({
      entry_id: id(`entry-${forwarded}`), arrival_ms: MAX_SAFE, scheduled_ms: MAX_SAFE,
      completed_ms: MAX_SAFE, latency_ms: MAX_SAFE, lateness_ms: MAX_SAFE,
    })),
    window_diagnostics: Array.from({ length: 60 }, (_, window) => ({
      window_index: window, accepted_count: MAX_SAFE, accepted_bytes: MAX_SAFE, delivered_count: MAX_SAFE,
      delivered_bytes: MAX_SAFE, rejected_count: MAX_SAFE, rejected_bytes: MAX_SAFE, dropped_count: MAX_SAFE,
      dropped_bytes: MAX_SAFE, retained_count: MAX_SAFE, retained_bytes: MAX_SAFE, unresolved_count: MAX_SAFE,
    })),
    failure_reasons: Array.from({ length: 64 }, (_, index) => `f${index}-${"x".repeat(256 - String(index).length - 2)}`),
    unverified_reasons: Array.from({ length: 64 }, (_, index) => `u${index}-${"x".repeat(256 - String(index).length - 2)}`),
    failure_reason_count: Number.MAX_SAFE_INTEGER,
    unverified_reason_count: Number.MAX_SAFE_INTEGER,
  });

  return items;
}
