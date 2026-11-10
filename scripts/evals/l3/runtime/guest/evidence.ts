/**
 * scripts/evals/l3/runtime/guest/evidence.ts
 *
 * Lossless, versioned, bounded encoding of the *actual* evidence set inside an
 * existing retained artifact.
 *
 * The human decision selected full lossless export: complete permitted
 * build/run console output, the complete observation set and the exact typed
 * verdict. A separate artifact is not required, so the evidence travels as a
 * self-describing section of `events.jsonl`:
 *
 *   {"l3e":{"v":3,"k":"evidence"}}                          header
 *   {"i":{"s":seq,"t":kind,"b":<json body>}}                one item per line
 *   {"l3e":{"v":3,"k":"evidence-end","n":N,"s":digest}}     trailer
 *
 * Synthetic prefix rows (`message_id`, `verdict_timing_evidence`,
 * `verdict_reasons`) are emitted before production items. The decoder restores
 * the exact typed values: message id arrays are value-identical (object key
 * order may differ), verdict timing/reason arrays are identical, and the
 * decoded verdict body is re-validated after reassembly.
 *
 * Properties the decoder relies on and enforces:
 *
 * - every item carries a dense, ordered sequence number and a registered kind;
 *   production bodies are the JSON value produced by the observing boundary and
 *   are restored value-identically (no defaults, no truncation);
 * - every table id is referenced, every reference is in range, and every split
 *   verdict list is contiguous and reassembled before validation;
 * - the item count, per-line length, per-body size and total bytes are bounded
 *   *before* any allocation, so a hostile artifact cannot force an unbounded copy
 *   or an unbounded split;
 * - the trailer digest covers the exact item lines and the trailer must declare
 *   the true count, so a truncated, reordered or edited body is detected.
 *
 * Encoding never silently drops items: when the caller's budget is insufficient
 * the encoder reports failure, and the controller records the export as failed
 * rather than claiming a successful partial export.
 */

import { createHash } from "node:crypto";
import {
  ERROR_CODES,
  validateId,
  validatePositive,
  validateProviderPayload,
  validateProviderResult,
  validateSummarizerPayload,
  validateSummarizerResult,
} from "../../contracts.js";
import { MAX_RAW_OUTPUT_BYTES } from "./protocol.js";

export const EVIDENCE_VERSION = 3;
export const EVIDENCE_MAX_ITEMS = 524_288;
export const EVIDENCE_MAX_LINE_BYTES = 1_048_576;
export const EVIDENCE_HEADER_KIND = "evidence";
export const EVIDENCE_TRAILER_KIND = "evidence-end";

/** Evidence kinds the host is allowed to interpret. */
export const EVIDENCE_KINDS = [
  "provenance",
  "buffer_snapshot",
  "consumer_receipt",
  "disposition_history",
  "transport_disposition",
  "auxiliary_observation",
  "stub_observation",
  "process_observation",
  "termination",
  "restart",
  "phase",
  "verdict",
  "output_marker",
  "raw_output_chunk",
  "message_id",
  "verdict_timing_evidence",
  "verdict_reasons",
  "verdict_payment_checks",
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/** Static registry: membership is a lookup, not a runtime-mutated set. */
const EVIDENCE_KIND_MAP: Readonly<Record<EvidenceKind, true>> = Object.freeze({
  provenance: true,
  buffer_snapshot: true,
  consumer_receipt: true,
  disposition_history: true,
  transport_disposition: true,
  auxiliary_observation: true,
  stub_observation: true,
  process_observation: true,
  termination: true,
  restart: true,
  phase: true,
  verdict: true,
  output_marker: true,
  raw_output_chunk: true,
  message_id: true,
  verdict_timing_evidence: true,
  verdict_reasons: true,
  verdict_payment_checks: true,
});

function isEvidenceKind(value: string): value is EvidenceKind {
  return Object.prototype.hasOwnProperty.call(EVIDENCE_KIND_MAP, value);
}

const EMPTY_WIRE = Buffer.alloc(0);
const MAX_NESTED_EVIDENCE_ITEMS = 65_536;

function evidenceObject(
  raw: unknown,
  kind: EvidenceKind,
  required: readonly string[],
  optional: readonly string[] = [],
): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`${kind} body must be an object`);
  }
  const proto = Object.getPrototypeOf(raw);
  if (proto !== Object.prototype && proto !== null) throw new Error(`${kind} body must be a plain object`);
  const record = raw as Record<string, unknown>;
  for (const key of required) {
    if (!Object.hasOwn(record, key)) throw new Error(`${kind} body is missing ${key}`);
  }
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) throw new Error(`${kind} body has unknown field ${key}`);
  }
  return record;
}

function text(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
}

function natural(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative safe integer`);
  }
}

function bool(value: unknown, field: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new Error(`${field} must be a boolean`);
}

function stringArray(value: unknown, field: string): void {
  if (!Array.isArray(value) || value.length > MAX_NESTED_EVIDENCE_ITEMS || value.some((item) => typeof item !== "string")) {
    throw new Error(`${field} must be a bounded string array`);
  }
}

function boundedReasonList(value: unknown, field: string, count: unknown, countField: string): void {
  stringArray(value, field);
  const list = value as string[];
  if (list.length > MAX_VERDICT_REASONS) throw new Error(`${field} exceeds ${MAX_VERDICT_REASONS} entries`);
  for (const reason of list) {
    if (Buffer.byteLength(reason, "utf8") > MAX_REASON_BYTES) {
      throw new Error(`${field} contains a reason above ${MAX_REASON_BYTES} bytes`);
    }
  }
  natural(count, countField);
  if ((count as number) < list.length) throw new Error(`${countField} is below the retained reason count`);
}

function validateEvidenceBody(kind: EvidenceKind, raw: unknown): void {
  if ((kind === "buffer_snapshot" || kind === "verdict") && raw === null) return;
  let body: Record<string, unknown>;
  switch (kind) {
    case "provenance": {
      body = evidenceObject(raw, kind, [
        "run_id", "attempt_id", "manifest_sha256", "case_id", "phase", "process_session_id",
        "observer_refusal", "observer_mapping", "admission_refusals", "final_observation", "delivery_content_proof",
      ]);
      for (const field of ["run_id", "attempt_id", "case_id", "phase", "process_session_id", "delivery_content_proof"]) {
        text(body[field], `${kind}.${field}`);
      }
      if (!/^[0-9a-f]{64}$/.test(String(body.manifest_sha256))) throw new Error("provenance.manifest_sha256 is not canonical");
      if (body.observer_refusal !== null) text(body.observer_refusal, "provenance.observer_refusal");
      if (body.observer_mapping !== null && !/^[0-9a-f]{64}$/.test(String(body.observer_mapping))) {
        throw new Error("provenance.observer_mapping is not canonical");
      }
      stringArray(body.admission_refusals, "provenance.admission_refusals");
      const final = evidenceObject(body.final_observation, kind, ["attempted", "complete", "reason", "records"]);
      bool(final.attempted, "provenance.final_observation.attempted");
      bool(final.complete, "provenance.final_observation.complete");
      if (final.reason !== null) text(final.reason, "provenance.final_observation.reason");
      natural(final.records, "provenance.final_observation.records");
      break;
    }
    case "buffer_snapshot": {
      body = evidenceObject(raw, kind, [
        "attempt_id", "process_session_id", "observation_id", "observed_monotonic_ms", "complete", "connection_buffers",
      ]);
      for (const field of ["attempt_id", "process_session_id", "observation_id"]) text(body[field], `${kind}.${field}`);
      natural(body.observed_monotonic_ms, `${kind}.observed_monotonic_ms`);
      bool(body.complete, `${kind}.complete`);
      if (!Array.isArray(body.connection_buffers) || body.connection_buffers.length > MAX_NESTED_EVIDENCE_ITEMS) {
        throw new Error("buffer_snapshot.connection_buffers must be a bounded array");
      }
      for (const [index, rawItem] of body.connection_buffers.entries()) {
        const item = evidenceObject(rawItem, kind, ["connection_id", "buffered_bytes"]);
        text(item.connection_id, `buffer_snapshot.connection_buffers[${index}].connection_id`);
        natural(item.buffered_bytes, `buffer_snapshot.connection_buffers[${index}].buffered_bytes`);
      }
      break;
    }
    case "consumer_receipt": {
      body = evidenceObject(raw, kind, [
        "attempt_id", "process_session_id", "read_seq", "send_seq", "connection_id", "message_id",
        "observed_monotonic_ms", "bytes", "sha256", "payload_base64", "content_verified",
      ]);
      for (const field of ["attempt_id", "process_session_id", "connection_id", "message_id"]) validateId(body[field], `${kind}.${field}`);
      validatePositive(body.read_seq, `${kind}.read_seq`);
      validatePositive(body.send_seq, `${kind}.send_seq`);
      natural(body.observed_monotonic_ms, `${kind}.observed_monotonic_ms`);
      const receiptBytes = validatePositive(body.bytes, `${kind}.bytes`);
      if (receiptBytes > 1024) throw new Error("consumer_receipt exceeds the approved 1024-byte message limit");
      if (!/^[0-9a-f]{64}$/.test(String(body.sha256))) throw new Error("consumer_receipt.sha256 is not canonical");
      text(body.payload_base64, "consumer_receipt.payload_base64");
      if (body.payload_base64.length !== Math.ceil(receiptBytes / 3) * 4) {
        throw new Error("consumer_receipt base64 length does not match its bounded byte count");
      }
      const payload = Buffer.from(body.payload_base64, "base64");
      if (
        payload.toString("base64") !== body.payload_base64 ||
        payload.length !== receiptBytes ||
        createHash("sha256").update(payload).digest("hex") !== body.sha256
      ) {
        throw new Error("consumer_receipt bytes, digest, and canonical base64 do not agree");
      }
      if (body.content_verified !== true) throw new Error("consumer_receipt must record independently verified bytes");
      break;
    }
    case "disposition_history":
    case "transport_disposition": {
      body = evidenceObject(raw, kind, [
        "attempt_id", "process_session_id", "event_seq", "request_seq", "connection_id", "message_id",
        "bytes", "observed_monotonic_ms", "state",
      ], ["buffer_observation_id"]);
      for (const field of ["attempt_id", "process_session_id", "connection_id", "message_id"]) text(body[field], `${kind}.${field}`);
      for (const field of ["event_seq", "request_seq", "bytes", "observed_monotonic_ms"]) natural(body[field], `${kind}.${field}`);
      if (!["accepted", "delivered", "dropped", "retained"].includes(String(body.state))) throw new Error(`${kind}.state is invalid`);
      if (body.state === "retained") text(body.buffer_observation_id, `${kind}.buffer_observation_id`);
      else if (Object.hasOwn(body, "buffer_observation_id")) throw new Error(`${kind}.buffer_observation_id is only valid for retained`);
      break;
    }
    case "auxiliary_observation": {
      body = evidenceObject(raw, kind, ["sideband_frames", "sideband_bytes", "auxiliary"]);
      natural(body.sideband_frames, `${kind}.sideband_frames`);
      natural(body.sideband_bytes, `${kind}.sideband_bytes`);
      if (body.auxiliary !== null) {
        const auxiliary = evidenceObject(body.auxiliary, kind, [
          "attempt_id", "process_session_id", "observation_id", "observed_monotonic_ms", "offer_receipts",
        ]);
        for (const field of ["attempt_id", "process_session_id", "observation_id"]) {
          validateId(auxiliary[field], `${kind}.auxiliary.${field}`);
        }
        natural(auxiliary.observed_monotonic_ms, `${kind}.auxiliary.observed_monotonic_ms`);
        if (!Array.isArray(auxiliary.offer_receipts) || auxiliary.offer_receipts.length > MAX_NESTED_EVIDENCE_ITEMS) {
          throw new Error(`${kind}.auxiliary.offer_receipts exceeds its bounded cardinality`);
        }
        for (const [index, receiptRaw] of auxiliary.offer_receipts.entries()) {
          const receipt = evidenceObject(receiptRaw, kind, [
            "attempt_id", "process_session_id", "seq", "connection_id", "message_id", "offer_id",
            "window_index", "observed_monotonic_ms", "byte_count", "sha256",
          ]);
          for (const field of ["attempt_id", "process_session_id", "connection_id", "message_id", "offer_id"]) {
            validateId(receipt[field], `${kind}.auxiliary.offer_receipts[${index}].${field}`);
          }
          for (const field of ["seq", "window_index", "observed_monotonic_ms", "byte_count"]) {
            natural(receipt[field], `${kind}.auxiliary.offer_receipts[${index}].${field}`);
          }
          if (!/^[0-9a-f]{64}$/.test(String(receipt.sha256))) {
            throw new Error(`${kind}.auxiliary.offer_receipts[${index}].sha256 is not canonical`);
          }
        }
      }
      break;
    }
    case "stub_observation": {
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("stub_observation body must be an object");
      const candidate = raw as Record<string, unknown>;
      if (Object.hasOwn(candidate, "socket")) {
        body = evidenceObject(raw, kind, ["socket", "frames", "rejected", "succeeded", "errored", "dropped", "cancelled"]);
        text(body.socket, "stub_observation.socket");
        for (const field of ["frames", "rejected", "succeeded", "errored", "dropped", "cancelled"]) natural(body[field], `stub_observation.${field}`);
      } else {
        if (candidate.stub !== "provider" && candidate.stub !== "summarizer") throw new Error("stub_observation.stub is invalid");
        text(candidate.kind, "stub_observation.kind");
        const field = candidate.kind === "ledger_entry" ? "entry"
          : candidate.kind === "cancellation" ? "cancellation"
            : candidate.kind === "relay_attribution" ? "attribution" : null;
        if (field === null) throw new Error("stub_observation.kind is invalid");
        body = evidenceObject(raw, kind, ["stub", "kind", field]);
        if (body.stub === "provider" && body.kind !== "ledger_entry") throw new Error("provider stub observations must be ledger entries");
        if (body.kind === "ledger_entry" && body.stub === "provider") {
          const entry = evidenceObject(body.entry, kind, [
            "sequence", "entry_id", "attempt_id", "operation", "timestamp_ms", "payload", "result",
            "error_code", "committed", "duplicate", "dropped_reply",
          ]);
          natural(entry.sequence, "provider ledger sequence");
          validateId(entry.entry_id, "provider ledger entry_id");
          validateId(entry.attempt_id, "provider ledger attempt_id");
          natural(entry.timestamp_ms, "provider ledger timestamp_ms");
          if (entry.operation !== "debit" && entry.operation !== "lookup" && entry.operation !== "settlement") {
            throw new Error("provider ledger operation is invalid");
          }
          if (entry.payload !== null) {
            const payload = evidenceObject(entry.payload, kind, Object.keys(entry.payload as object));
            validateProviderPayload(entry.operation, payload);
          }
          if (entry.result !== null) {
            const result = evidenceObject(entry.result, kind, Object.keys(entry.result as object));
            validateProviderResult(entry.operation, result);
          }
          if (entry.error_code !== null && !(ERROR_CODES as readonly unknown[]).includes(entry.error_code)) {
            throw new Error("provider ledger error_code is invalid");
          }
          for (const flag of ["committed", "duplicate", "dropped_reply"]) bool(entry[flag], `provider ledger ${flag}`);
        } else if (body.kind === "ledger_entry") {
          const entry = evidenceObject(body.entry, kind, [
            "sequence", "entry_id", "attempt_id", "arrival_ms", "scheduled_ms", "completed_ms", "latency_ms",
            "request_id", "connection_id", "message_ids", "delivered", "error_code", "retry",
          ], ["untrusted_message_count"]);
          natural(entry.sequence, "summarizer ledger sequence");
          validateId(entry.entry_id, "summarizer ledger entry_id");
          validateId(entry.attempt_id, "summarizer ledger attempt_id");
          for (const field of ["arrival_ms", "scheduled_ms", "completed_ms", "latency_ms"]) {
            if (entry[field] !== null) natural(entry[field], `summarizer ledger ${field}`);
          }
          for (const field of ["request_id", "connection_id"]) {
            if (entry[field] !== null) validateId(entry[field], `summarizer ledger ${field}`);
          }
          if (!Array.isArray(entry.message_ids) || entry.message_ids.length > MAX_NESTED_EVIDENCE_ITEMS) {
            throw new Error("summarizer ledger message_ids exceeds its bounded cardinality");
          }
          for (const [index, id] of entry.message_ids.entries()) validateId(id, `summarizer ledger message_ids[${index}]`);
          const untrusted = entry.untrusted_message_count;
          natural(untrusted ?? 0, "summarizer ledger untrusted_message_count");
          if ((untrusted as number) > 256) {
            throw new Error("summarizer ledger untrusted_message_count exceeds MAX_LIST_ENTRIES");
          }
          if ((untrusted as number) > 0 && (entry.message_ids as unknown[]).length > 0) {
            throw new Error("summarizer ledger untrusted call must not retain message ids");
          }
          bool(entry.delivered, "summarizer ledger delivered");
          if (entry.error_code !== null && !(ERROR_CODES as readonly unknown[]).includes(entry.error_code)) {
            throw new Error("summarizer ledger error_code is invalid");
          }
          bool(entry.retry, "summarizer ledger retry");
        } else if (body.kind === "cancellation") {
          const cancellation = evidenceObject(body.cancellation, kind, ["attempt_id", "entry_id", "cancelled_ms", "reason"]);
          validateId(cancellation.attempt_id, "summarizer cancellation attempt_id");
          validateId(cancellation.entry_id, "summarizer cancellation entry_id");
          natural(cancellation.cancelled_ms, "summarizer cancellation cancelled_ms");
          if (cancellation.reason !== "request_cancelled") throw new Error("summarizer cancellation reason is invalid");
        } else {
          const attribution = evidenceObject(body.attribution, kind, [
            "attempt_id", "process_session_id", "relay_seq", "relay_connection_id", "exchange_id",
            "entry_id", "connection_id", "message_ids", "arrival_ms",
          ], ["untrusted_message_count"]);
          for (const field of ["attempt_id", "process_session_id", "relay_connection_id", "exchange_id", "entry_id", "connection_id"]) {
            validateId(attribution[field], `summarizer relay attribution ${field}`);
          }
          natural(attribution.relay_seq, "summarizer relay attribution relay_seq");
          natural(attribution.arrival_ms, "summarizer relay attribution arrival_ms");
          if (!Array.isArray(attribution.message_ids) || attribution.message_ids.length > MAX_NESTED_EVIDENCE_ITEMS) {
            throw new Error("summarizer relay attribution message_ids exceeds its bounded cardinality");
          }
          for (const [index, id] of attribution.message_ids.entries()) validateId(id, `summarizer relay attribution message_ids[${index}]`);
          const attributionUntrusted = attribution.untrusted_message_count;
          natural(attributionUntrusted ?? 0, "summarizer relay attribution untrusted_message_count");
          if ((attributionUntrusted as number) > 256) {
            throw new Error("summarizer relay attribution untrusted_message_count exceeds MAX_LIST_ENTRIES");
          }
          if ((attributionUntrusted as number) > 0 && (attribution.message_ids as unknown[]).length > 0) {
            throw new Error("summarizer relay attribution untrusted call must not retain message ids");
          }
        }
      }
      break;
    }
    case "process_observation": {
      body = evidenceObject(raw, kind, ["pid", "rss_bytes", "threads", "state", "memory_current_bytes", "memory_peak_bytes"]);
      for (const field of ["pid", "rss_bytes", "threads"]) natural(body[field], `${kind}.${field}`);
      text(body.state, `${kind}.state`);
      for (const field of ["memory_current_bytes", "memory_peak_bytes"]) {
        if (body[field] !== null) natural(body[field], `${kind}.${field}`);
      }
      break;
    }
    case "termination": {
      body = evidenceObject(raw, kind, ["container_state", "exit_code", "finished_at", "pid"]);
      text(body.container_state, `${kind}.container_state`);
      if (body.exit_code !== null) natural(body.exit_code, `${kind}.exit_code`);
      if (body.finished_at !== null) text(body.finished_at, `${kind}.finished_at`);
      natural(body.pid, `${kind}.pid`);
      break;
    }
    case "restart": {
      body = evidenceObject(raw, kind, ["reason", "restart_count"]);
      text(body.reason, `${kind}.reason`);
      natural(body.restart_count, `${kind}.restart_count`);
      break;
    }
    case "phase": {
      body = evidenceObject(raw, kind, ["phase", "at_ms"], ["failures"]);
      text(body.phase, `${kind}.phase`);
      natural(body.at_ms, `${kind}.at_ms`);
      if (Object.hasOwn(body, "failures")) natural(body.failures, `${kind}.failures`);
      break;
    }
    case "verdict": {
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("verdict body must be an object");
      const record = raw as Record<string, unknown>;
      if (record.phase === "build") {
        body = evidenceObject(raw, kind, ["phase", "image_id"]);
        text(body.image_id, "verdict.image_id");
        if (!/^(?:sha256:)?[0-9a-f]{64}$/.test(body.image_id as string)) {
          throw new Error("build verdict.image_id is not a canonical image digest");
        }
        break;
      }
      const keys = record.case_id === "payment"
        ? ["case_id", "base", "adverse", "changed", "negative"]
        : record.case_id === "tenant"
          ? ["case_id", "passed", "cross_tenant_leakage_detected", "revocation_linearized", "intermediate_stage_observations", "intermediate_observations_complete", "snapshot_restored_cleanly", "unauthorized_mutation_detected", "unauthorized_requests_rejected", "failure_reasons", "unverified_reasons", "failure_reason_count", "unverified_reason_count"]
          : record.case_id === "overload"
            ? ["case_id", "passed", "whole_case_pass", "coverage", "safety", "metrics", "timing_evidence", "window_diagnostics", "failure_reasons", "unverified_reasons", "failure_reason_count", "unverified_reason_count"]
            : null;
      if (keys === null) throw new Error("verdict.case_id is invalid");
      body = evidenceObject(raw, kind, keys);
      if (body.case_id === "payment") {
        const schedules = [
          ["base", "base"],
          ["adverse", "adverse"],
          ["changed", "changed_constraint"],
          ["negative", "negative_outcome_control"],
        ] as const;
        for (const [field, schedule] of schedules) {
          const item = evidenceObject(body[field], kind, [
            "case_id", "schedule", "passed", "instruction_id", "committed_debits", "duplicate_debit_attempts",
            "unknown_views_observed", "final_negative_observed", "restart_occurred", "evidence_checks",
            "failure_reasons", "unverified_reasons", "failure_reason_count", "unverified_reason_count",
          ]);
          if (item.case_id !== "payment" || item.schedule !== schedule) {
            throw new Error(`verdict.${field} has an incorrect payment schedule identity`);
          }
          bool(item.passed, `verdict.${field}.passed`);
          text(item.instruction_id, `verdict.${field}.instruction_id`);
          for (const count of ["committed_debits", "duplicate_debit_attempts", "unknown_views_observed"]) {
            natural(item[count], `verdict.${field}.${count}`);
          }
          for (const flag of ["final_negative_observed", "restart_occurred"]) bool(item[flag], `verdict.${field}.${flag}`);
          boundedReasonList(item.failure_reasons, `verdict.${field}.failure_reasons`, item.failure_reason_count, `verdict.${field}.failure_reason_count`);
          boundedReasonList(item.unverified_reasons, `verdict.${field}.unverified_reasons`, item.unverified_reason_count, `verdict.${field}.unverified_reason_count`);
          if (!Array.isArray(item.evidence_checks) || item.evidence_checks.length > MAX_NESTED_EVIDENCE_ITEMS) {
            throw new Error(`verdict.${field}.evidence_checks must be a bounded array`);
          }
          for (const [index, checkRaw] of item.evidence_checks.entries()) {
            const check = evidenceObject(checkRaw, kind, ["evidence_id", "instruction_id", "expected_outcome", "accepted", "reason"]);
            for (const name of ["evidence_id", "instruction_id", "reason"]) text(check[name], `verdict.${field}.evidence_checks[${index}].${name}`);
            if (check.expected_outcome !== "succeeded" && check.expected_outcome !== "failed") {
              throw new Error(`verdict.${field}.evidence_checks[${index}].expected_outcome is invalid`);
            }
            bool(check.accepted, `verdict.${field}.evidence_checks[${index}].accepted`);
          }
        }
        break;
      }
      if (body.case_id === "tenant") {
        bool(body.passed, "verdict.passed");
        boundedReasonList(body.failure_reasons, "verdict.failure_reasons", body.failure_reason_count, "verdict.failure_reason_count");
        boundedReasonList(body.unverified_reasons, "verdict.unverified_reasons", body.unverified_reason_count, "verdict.unverified_reason_count");
        for (const field of ["cross_tenant_leakage_detected", "revocation_linearized", "intermediate_observations_complete",
          "snapshot_restored_cleanly", "unauthorized_mutation_detected"]) bool(body[field], `verdict.${field}`);
        natural(body.unauthorized_requests_rejected, "verdict.unauthorized_requests_rejected");
        if (!Array.isArray(body.intermediate_stage_observations) || body.intermediate_stage_observations.length > MAX_NESTED_EVIDENCE_ITEMS) {
          throw new Error("verdict.intermediate_stage_observations must be a bounded array");
        }
        for (const [index, observationRaw] of body.intermediate_stage_observations.entries()) {
          const observation = evidenceObject(observationRaw, kind, [
            "stage", "observed_at_step", "snapshot_id", "record_count", "available", "correspondence_verified", "note",
          ]);
          for (const field of ["stage", "observed_at_step", "note"]) text(observation[field], `verdict.intermediate_stage_observations[${index}].${field}`);
          if (observation.snapshot_id !== null) text(observation.snapshot_id, `verdict.intermediate_stage_observations[${index}].snapshot_id`);
          natural(observation.record_count, `verdict.intermediate_stage_observations[${index}].record_count`);
          bool(observation.available, `verdict.intermediate_stage_observations[${index}].available`);
          bool(observation.correspondence_verified, `verdict.intermediate_stage_observations[${index}].correspondence_verified`);
        }
      } else {
        bool(body.whole_case_pass, "verdict.whole_case_pass");
        const coverage = evidenceObject(body.coverage, kind, [
          "preloss_admitted_streams", "post_loss1_offered_streams", "post_loss2_offered_streams",
          "reader_stalls_observed", "reader_stall_seconds", "reconnects_observed", "drain_bounded",
          "drain_duration_ms", "undelivered_bounded", "all_coverage_met",
        ]);
        for (const field of ["preloss_admitted_streams", "post_loss1_offered_streams", "post_loss2_offered_streams",
          "reader_stalls_observed", "reader_stall_seconds", "reconnects_observed", "drain_duration_ms"]) {
          natural(coverage[field], `verdict.coverage.${field}`);
        }
        for (const field of ["drain_bounded", "undelivered_bounded", "all_coverage_met"]) bool(coverage[field], `verdict.coverage.${field}`);
        const safety = evidenceObject(body.safety, kind, [
          "low12_control_rejected", "safe_shedding_qualifies", "downstream_capacity_honored",
          "dropped_not_labeled_delivered", "limits_fit_diagnostic_policy", "retries_within_declared_bound",
          "process_observation_bounded", "liveness_observed", "connection_buffers_within_limit",
          "terminated_after_drain", "transport_observation_verified", "declared_limits", "excess_forwarded_calls",
          "max_forwarded_attempts_per_second",
        ]);
        for (const field of ["low12_control_rejected", "safe_shedding_qualifies", "downstream_capacity_honored",
          "dropped_not_labeled_delivered", "limits_fit_diagnostic_policy", "retries_within_declared_bound",
          "process_observation_bounded", "liveness_observed", "connection_buffers_within_limit",
          "terminated_after_drain", "transport_observation_verified"]) bool(safety[field], `verdict.safety.${field}`);
        for (const field of ["excess_forwarded_calls", "max_forwarded_attempts_per_second"]) natural(safety[field], `verdict.safety.${field}`);
        if (safety.declared_limits !== null) {
          const declared = evidenceObject(safety.declared_limits, kind, [
            "max_connections", "max_buffer_bytes_per_connection", "drain_deadline_ms", "max_retries_per_request",
          ]);
          for (const field of Object.keys(declared)) natural(declared[field], `verdict.safety.declared_limits.${field}`);
        }
        const metrics = evidenceObject(body.metrics, kind, [
          "total_messages_allocated", "total_bytes_allocated", "total_messages_accepted", "total_messages_delivered",
          "total_bytes_delivered", "total_messages_dropped", "total_summary_offers", "forwarded_summary_attempts",
          "forwarded_summary_rejected", "max_forwarded_attempts_per_second", "stub_forwarded_calls", "stub_rejected_calls",
        ]);
        for (const field of Object.keys(metrics)) natural(metrics[field], `verdict.metrics.${field}`);
        if (!Array.isArray(body.timing_evidence) || body.timing_evidence.length > MAX_NESTED_EVIDENCE_ITEMS ||
            !Array.isArray(body.window_diagnostics) || body.window_diagnostics.length > MAX_NESTED_EVIDENCE_ITEMS) {
          throw new Error("overload verdict evidence arrays exceed their bounded cardinality");
        }
        for (const [index, itemRaw] of body.timing_evidence.entries()) {
          const item = evidenceObject(itemRaw, kind, ["entry_id", "arrival_ms", "scheduled_ms", "completed_ms", "latency_ms", "lateness_ms"]);
          text(item.entry_id, `verdict.timing_evidence[${index}].entry_id`);
          natural(item.arrival_ms, `verdict.timing_evidence[${index}].arrival_ms`);
          for (const field of ["scheduled_ms", "completed_ms", "latency_ms", "lateness_ms"]) {
            if (item[field] !== null) natural(item[field], `verdict.timing_evidence[${index}].${field}`);
          }
        }
        for (const [index, itemRaw] of body.window_diagnostics.entries()) {
          const item = evidenceObject(itemRaw, kind, [
            "window_index", "accepted_count", "accepted_bytes", "delivered_count", "delivered_bytes",
            "rejected_count", "rejected_bytes", "dropped_count", "dropped_bytes", "retained_count",
            "retained_bytes", "unresolved_count",
          ]);
          for (const field of Object.keys(item)) natural(item[field], `verdict.window_diagnostics[${index}].${field}`);
        }
        boundedReasonList(body.failure_reasons, "verdict.failure_reasons", body.failure_reason_count, "verdict.failure_reason_count");
        boundedReasonList(body.unverified_reasons, "verdict.unverified_reasons", body.unverified_reason_count, "verdict.unverified_reason_count");
      }
      break;
    }
    case "message_id": {
      body = evidenceObject(raw, kind, ["id"]);
      validateId(body.id, "message_id.id");
      break;
    }
    case "verdict_timing_evidence": {
      body = evidenceObject(raw, kind, ["case_id", "index", "values"]);
      validateId(body.case_id, "verdict_timing_evidence.case_id");
      natural(body.index, "verdict_timing_evidence.index");
      if (!Array.isArray(body.values) || body.values.length > VERDICT_TIMING_CHUNK) {
        throw new Error("verdict_timing_evidence.values exceeds its bounded chunk");
      }
      break;
    }
    case "verdict_reasons": {
      body = evidenceObject(raw, kind, ["case_id", "path", "list", "index", "values"]);
      validateId(body.case_id, "verdict_reasons.case_id");
      const path = validateId(body.path, "verdict_reasons.path");
      if (!["root", "base", "adverse", "changed", "negative"].includes(path)) {
        throw new Error("verdict_reasons.path is invalid");
      }
      if (body.list !== "failure_reasons" && body.list !== "unverified_reasons") {
        throw new Error("verdict_reasons.list is invalid");
      }
      natural(body.index, "verdict_reasons.index");
      if (!Array.isArray(body.values) || body.values.length > VERDICT_REASON_CHUNK) {
        throw new Error("verdict_reasons.values exceeds its bounded chunk");
      }
      for (const value of body.values) text(value, "verdict_reasons.value");
      break;
    }
    case "verdict_payment_checks": {
      body = evidenceObject(raw, kind, ["case_id", "path", "index", "values"]);
      validateId(body.case_id, "verdict_payment_checks.case_id");
      const path = validateId(body.path, "verdict_payment_checks.path");
      if (!["base", "adverse", "changed", "negative"].includes(path)) {
        throw new Error("verdict_payment_checks.path is invalid");
      }
      natural(body.index, "verdict_payment_checks.index");
      if (!Array.isArray(body.values) || body.values.length > VERDICT_CHECK_CHUNK) {
        throw new Error("verdict_payment_checks.values exceeds its bounded chunk");
      }
      break;
    }
    case "output_marker": {
      body = evidenceObject(raw, kind, ["reason", "failure"]);
      if (body.reason !== null) text(body.reason, `${kind}.reason`);
      if (body.failure !== null) text(body.failure, `${kind}.failure`);
      break;
    }
    case "raw_output_chunk": {
      body = evidenceObject(raw, kind, [
        "process_session_id", "stream", "stream_mask_base64", "stream_offset", "capture_order",
        "artifact_offset", "bytes", "exported_bytes", "sha256",
      ]);
      text(body.process_session_id, `${kind}.process_session_id`);
      if (body.stream !== "combined") throw new Error("raw_output_chunk.stream must be combined");
      text(body.stream_mask_base64, `${kind}.stream_mask_base64`);
      for (const field of ["stream_offset", "capture_order", "artifact_offset", "bytes", "exported_bytes"]) natural(body[field], `${kind}.${field}`);
      const streamOffset = body.stream_offset as number;
      const captureOrder = body.capture_order as number;
      const bytes = body.bytes as number;
      const exportedBytes = body.exported_bytes as number;
      const isBuildStream = (body.process_session_id as string).startsWith("build-");
      if (isBuildStream ? streamOffset !== 0 || captureOrder !== 0 : captureOrder !== streamOffset + 1) {
        throw new Error("raw_output_chunk capture order is inconsistent with its process session");
      }
      if (bytes > MAX_RAW_OUTPUT_BYTES || exportedBytes > bytes) {
        throw new Error("raw_output_chunk exceeds the approved per-process raw output ceiling");
      }
      const expectedMaskBytes = Math.ceil(exportedBytes / 8);
      if ((body.stream_mask_base64 as string).length !== Math.ceil(expectedMaskBytes / 3) * 4) {
        throw new Error("raw_output_chunk stream mask exceeds or disagrees with its bounded prefix");
      }
      const mask = Buffer.from(body.stream_mask_base64, "base64");
      if (mask.toString("base64") !== body.stream_mask_base64 || mask.length !== expectedMaskBytes) {
        throw new Error("raw_output_chunk stream mask is not canonical for its exported bytes");
      }
      const trailingBits = (body.exported_bytes as number) % 8;
      if (
        trailingBits !== 0 &&
        mask.length > 0 &&
        (mask[mask.length - 1] & ~((1 << trailingBits) - 1)) !== 0
      ) {
        throw new Error("raw_output_chunk marks bytes beyond the exported prefix");
      }
      if (!/^[0-9a-f]{64}$/.test(String(body.sha256))) throw new Error("raw_output_chunk.sha256 is not canonical");
      break;
    }
  }
  const seen: unknown[] = [raw];
  let cursor = 0;
  while (cursor < seen.length) {
    if (cursor > MAX_NESTED_EVIDENCE_ITEMS) throw new Error(`${kind} body contains too many nested values`);
    const value = seen[cursor++];
    if (typeof value === "string" || value === null || typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value))) continue;
    if (typeof value !== "object") throw new Error(`${kind} body contains a non-JSON value`);
    if (seen.length > MAX_NESTED_EVIDENCE_ITEMS) throw new Error(`${kind} body contains too many nested values`);
    if (Array.isArray(value)) {
      if (value.length > MAX_NESTED_EVIDENCE_ITEMS) throw new Error(`${kind} body contains an oversized array`);
      for (const child of value) seen.push(child);
    } else {
      if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
        throw new Error(`${kind} body contains a non-plain object`);
      }
      const entries = Object.entries(value);
      if (entries.length > MAX_NESTED_EVIDENCE_ITEMS) throw new Error(`${kind} body contains too many fields`);
      for (const [key, child] of entries) {
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
          throw new Error(`${kind} body contains a forbidden key`);
        }
        seen.push(child);
      }
    }
  }
}

export interface EvidenceItem {
  readonly seq: number;
  readonly kind: EvidenceKind;
  /** The exact JSON value the observing boundary produced. */
  readonly body: unknown;
}

export interface EvidenceSection {
  readonly ok: boolean;
  readonly reason: string | null;
  /** Exact framed wire bytes; the caller writes this once without line arrays. */
  readonly wire: Buffer;
  readonly bytes: number;
  readonly items: number;
}

export interface EvidenceLimits {
  readonly max_bytes: number;
  readonly max_line_bytes?: number;
  readonly max_items?: number;
}

/**
 * Deduplicates every message id that appears in stub ledger/attribution items.
 * Each distinct id is stored once in the stream and referenced by index, so a
 * 256-message call repeated across ledger and attribution costs one id plus
 * small numeric references instead of repeating the ids per entry.
 */
function stubPayloadRecord(body: unknown): Record<string, unknown> | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const nested = record["entry"] ?? record["attribution"];
  if (typeof nested !== "object" || nested === null || Array.isArray(nested)) return null;
  return nested as Record<string, unknown>;
}

const VERDICT_TIMING_CHUNK = 128;
const VERDICT_REASON_CHUNK = 16;
const VERDICT_CHECK_CHUNK = 64;
/** Mirrors cases/bounds.ts (D3 owner-owned); no runtime import to keep the guest tree separate. */
const MAX_VERDICT_REASONS = 64;
const MAX_REASON_BYTES = 256;
const VERDICT_PATHS = ["root", "base", "adverse", "changed", "negative"] as const;
type VerdictPath = (typeof VERDICT_PATHS)[number];

interface VerdictTimingRow {
  readonly case_id: string;
  readonly index: number;
  readonly values: readonly unknown[];
}
interface VerdictReasonRow {
  readonly case_id: string;
  readonly path: VerdictPath;
  readonly list: "failure_reasons" | "unverified_reasons";
  readonly index: number;
  readonly values: readonly string[];
}
interface VerdictCheckRow {
  readonly case_id: string;
  readonly path: VerdictPath;
  readonly index: number;
  readonly values: readonly unknown[];
}

/**
 * Splits verdict timing and reason lists into bounded evidence rows so no line
 * approaches the 1 MiB ceiling. The decoder reassembles the exact typed verdict.
 */
function splitVerdicts(items: readonly EvidenceItem[]): {
  readonly timing: readonly VerdictTimingRow[];
  readonly reasons: readonly VerdictReasonRow[];
  readonly checks: readonly VerdictCheckRow[];
  readonly bodies: ReadonlyMap<number, unknown>;
} {
  const timing: VerdictTimingRow[] = [];
  const reasons: VerdictReasonRow[] = [];
  const checks: VerdictCheckRow[] = [];
  const bodies = new Map<number, unknown>();
  for (const item of items) {
    if (item.kind !== "verdict") continue;
    const rawBody = item.body;
    if (typeof rawBody !== "object" || rawBody === null || Array.isArray(rawBody)) {
      bodies.set(item.seq, item.body);
      continue;
    }
    const record = rawBody as Record<string, unknown>;
    if (typeof record["case_id"] !== "string") {
      bodies.set(item.seq, item.body);
      continue;
    }
    const body = structuredClone(rawBody) as Record<string, unknown>;
    const caseId = validateId(body.case_id, "verdict.case_id");
    const rootTiming = body["timing_evidence"];
    if (Array.isArray(rootTiming)) {
      for (let index = 0; index * VERDICT_TIMING_CHUNK < rootTiming.length; index += 1) {
        timing.push({
          case_id: caseId,
          index,
          values: Object.freeze(rootTiming.slice(index * VERDICT_TIMING_CHUNK, (index + 1) * VERDICT_TIMING_CHUNK)),
        });
      }
      body["timing_evidence"] = [];
    }
    for (const path of VERDICT_PATHS) {
      const target = path === "root" ? body : (body[path] as Record<string, unknown> | undefined);
      if (target === undefined || typeof target !== "object" || target === null) continue;
      for (const list of ["failure_reasons", "unverified_reasons"] as const) {
        const values = target[list];
        if (!Array.isArray(values)) continue;
        for (let index = 0; index * VERDICT_REASON_CHUNK < values.length; index += 1) {
          reasons.push({
            case_id: caseId,
            path,
            list,
            index,
            values: Object.freeze(
              values.slice(index * VERDICT_REASON_CHUNK, (index + 1) * VERDICT_REASON_CHUNK) as string[],
            ),
          });
        }
        target[list] = [];
      }
      const checksValues = target["evidence_checks"];
      if (path !== "root" && Array.isArray(checksValues)) {
        for (let index = 0; index * VERDICT_CHECK_CHUNK < checksValues.length; index += 1) {
          checks.push({
            case_id: caseId,
            path,
            index,
            values: Object.freeze(checksValues.slice(index * VERDICT_CHECK_CHUNK, (index + 1) * VERDICT_CHECK_CHUNK)),
          });
        }
        target["evidence_checks"] = [];
      }
    }
    bodies.set(item.seq, body);
  }
  return { timing: Object.freeze(timing), reasons: Object.freeze(reasons), checks: Object.freeze(checks), bodies };
}

function messageIdTable(items: readonly EvidenceItem[]): { readonly ids: readonly string[]; readonly index: ReadonlyMap<string, number> } {
  const index = new Map<string, number>();
  const ids: string[] = [];
  for (const item of items) {
    if (item.kind !== "stub_observation") continue;
    const payload = stubPayloadRecord(item.body);
    const list = payload?.["message_ids"];
    if (!Array.isArray(list)) continue;
    for (const value of list) {
      if (typeof value !== "string" || index.has(value)) continue;
      index.set(value, ids.length);
      ids.push(value);
    }
  }
  return { ids: Object.freeze(ids), index };
}

/** Wire form of a stub body: nested `message_ids` becomes numeric references. */
function withMessageIdRefs(body: unknown, index: ReadonlyMap<string, number>): unknown {
  const payload = stubPayloadRecord(body);
  const list = payload?.["message_ids"];
  if (payload === null || !Array.isArray(list)) return body;
  const refs: number[] = [];
  for (const value of list) {
    if (typeof value !== "string") return body;
    const ref = index.get(value);
    if (ref === undefined) return body;
    refs.push(ref);
  }
  const clonePayload: Record<string, unknown> = { ...payload, message_id_refs: refs };
  delete clonePayload["message_ids"];
  const record = body as Record<string, unknown>;
  const key = record["entry"] === payload ? "entry" : "attribution";
  return { ...record, [key]: clonePayload };
}

/**
 * Encodes every item or nothing. `limits.max_bytes` covers header + items +
 * trailer, so the caller can pass its remaining artifact budget directly.
 */
export function encodeEvidence(items: readonly EvidenceItem[], limits: EvidenceLimits): EvidenceSection {
  if (!Number.isSafeInteger(limits.max_bytes) || limits.max_bytes <= 0) {
    throw new Error("evidence max_bytes must be a positive safe integer");
  }
  const maxLine = limits.max_line_bytes ?? EVIDENCE_MAX_LINE_BYTES;
  const maxItems = limits.max_items ?? EVIDENCE_MAX_ITEMS;
  if (!Number.isSafeInteger(maxLine) || maxLine <= 0 || !Number.isSafeInteger(maxItems) || maxItems <= 0) {
    throw new Error("evidence line and item ceilings must be positive safe integers");
  }
  const header = `${JSON.stringify({ l3e: { v: EVIDENCE_VERSION, k: EVIDENCE_HEADER_KIND } })}\n`;
  try {
    let validatedSeq = 1;
    for (const item of items) {
      if (item.seq !== validatedSeq) throw new Error(`evidence item sequence is not dense and ordered at ${validatedSeq}`);
      validatedSeq += 1;
      if (!isEvidenceKind(item.kind)) throw new Error(`evidence kind '${item.kind}' is not registered`);
      if (item.kind === "message_id" || item.kind === "verdict_timing_evidence" || item.kind === "verdict_reasons") {
        throw new Error(`evidence kind '${item.kind}' is generated by the encoder`);
      }
      validateEvidenceBody(item.kind, item.body);
    }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error), wire: EMPTY_WIRE, bytes: 0, items: 0 };
  }
  const table = messageIdTable(items);
  const split = splitVerdicts(items);
  const syntheticCount = table.ids.length + split.timing.length + split.reasons.length + split.checks.length;
  const wireCount = syntheticCount + items.length;
  if (wireCount > maxItems) {
    return { ok: false, reason: `evidence item count exceeds ${maxItems}`, wire: EMPTY_WIRE, bytes: 0, items: 0 };
  }
  let total = Buffer.byteLength(header, "utf8");
  let expectedWire = 1;
  const digest = createHash("sha256");
  const preflight = (kind: string, body: unknown): void => {
    const line = `${JSON.stringify({ i: { s: expectedWire, t: kind, b: body } })}\n`;
    const lineBytes = Buffer.byteLength(line, "utf8");
    if (lineBytes > maxLine) throw new Error(`evidence item ${expectedWire} exceeds its line ceiling`);
    if (lineBytes > limits.max_bytes - total) {
      throw new Error(`evidence set does not fit the ${limits.max_bytes}-byte budget (${wireCount} items)`);
    }
    total += lineBytes;
    digest.update(line, "utf8");
    expectedWire += 1;
  };
  try {
    for (const id of table.ids) preflight("message_id", { id });
    for (const row of split.timing) preflight("verdict_timing_evidence", row);
    for (const row of split.reasons) preflight("verdict_reasons", row);
    for (const row of split.checks) preflight("verdict_payment_checks", row);
    for (const item of items) {
      const body =
        item.kind === "stub_observation"
          ? withMessageIdRefs(item.body, table.index)
          : split.bodies.get(item.seq) ?? item.body;
      preflight(item.kind, body);
    }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error), wire: EMPTY_WIRE, bytes: 0, items: 0 };
  }
  const trailer = `${JSON.stringify({
    l3e: { v: EVIDENCE_VERSION, k: EVIDENCE_TRAILER_KIND, n: wireCount, s: digest.digest("hex") },
  })}\n`;
  const trailerBytes = Buffer.byteLength(trailer, "utf8");
  if (trailerBytes > limits.max_bytes - total) {
    return {
      ok: false,
      reason: `evidence set does not fit the ${limits.max_bytes}-byte budget including its trailer`,
      wire: EMPTY_WIRE,
      bytes: 0,
      items: 0,
    };
  }
  total += trailerBytes;
  const wire = Buffer.allocUnsafe(total);
  let offset = wire.write(header, 0, "utf8");
  let writeSeq = 0;
  const write = (kind: string, body: unknown): void => {
    writeSeq += 1;
    offset += wire.write(`${JSON.stringify({ i: { s: writeSeq, t: kind, b: body } })}\n`, offset, "utf8");
  };
  for (const id of table.ids) write("message_id", { id });
  for (const row of split.timing) write("verdict_timing_evidence", row);
  for (const row of split.reasons) write("verdict_reasons", row);
  for (const row of split.checks) write("verdict_payment_checks", row);
  for (const item of items) {
    const body =
      item.kind === "stub_observation"
        ? withMessageIdRefs(item.body, table.index)
        : split.bodies.get(item.seq) ?? item.body;
    write(item.kind, body);
  }
  offset += wire.write(trailer, offset, "utf8");
  if (offset !== total) throw new Error("evidence encoder wire-size preflight disagrees with its final write");
  return { ok: true, reason: null, wire, bytes: total, items: items.length };
}

export interface DecodedEvidence {
  readonly ok: boolean;
  readonly reason: string | null;
  readonly items: readonly EvidenceItem[];
}

function failure(reason: string): DecodedEvidence {
  return { ok: false, reason, items: Object.freeze([]) };
}

/** Locates the retained evidence section inside a combined artifact body. */
export function evidenceSectionOf(body: Buffer): Buffer | null {
  const marker = Buffer.from(`{"l3e":{"v":${EVIDENCE_VERSION},"k":"${EVIDENCE_HEADER_KIND}"`, "utf8");
  const index = body.lastIndexOf(marker);
  return index === -1 ? null : body.subarray(index);
}

/** Strict inverse of `encodeEvidence`; checks each raw line before decoding it. */
export function decodeEvidence(section: Buffer, limits: EvidenceLimits): DecodedEvidence {
  if (section.length === 0) return failure("evidence section is empty");
  if (section.length > limits.max_bytes) return failure("evidence section exceeds its byte ceiling");
  const maxItems = limits.max_items ?? EVIDENCE_MAX_ITEMS;
  const maxLineBytes = limits.max_line_bytes ?? EVIDENCE_MAX_LINE_BYTES;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const minValidItemLineBytes = Math.min(
    ...(["phase", "verdict", "buffer_snapshot"] as const).map((kind) =>
      Buffer.byteLength(
        `${JSON.stringify({ i: { s: 1, t: kind, b: kind === "phase" ? { phase: "", at_ms: 0 } : null } })}\n`,
        "utf8",
      ),
    ),
  );
  const digest = createHash("sha256");
  const items: EvidenceItem[] = [];
  const messageIds: string[] = [];
  const messageIdSeen = new Set<string>();
  const usedIds = new Set<number>();
  const timingRows: { case_id: string; index: number; values: unknown[] }[] = [];
  const reasonRows: { case_id: string; path: string; list: string; index: number; values: string[] }[] = [];
  const checkRows: { case_id: string; path: string; index: number; values: unknown[] }[] = [];
  let prefixCount = 0;
  let sawProduction = false;
  let wireCount = 0;
  let offset = 0;
  let lineIndex = 0;
  let expectedSeq = 1;
  let declaredCount: number | null = null;
  let declaredDigest: string | null = null;

  while (offset < section.length) {
    const newline = section.indexOf(0x0a, offset);
    if (newline === -1) return failure("evidence section is not newline terminated");
    const line = section.subarray(offset, newline);
    offset = newline + 1;
    if (line.length > maxLineBytes) return failure("evidence item exceeds its line ceiling");
    let parsed: unknown;
    try {
      parsed = JSON.parse(decoder.decode(line));
    } catch {
      return failure("evidence section contains invalid UTF-8 or JSON");
    }
    const parsedRecord = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
    if (lineIndex === 0) {
      if (parsedRecord === null) return failure("evidence header is not an object");
      const keys = Object.keys(parsedRecord).sort();
      if (keys.length !== 1 || keys[0] !== "l3e") return failure("evidence header has unknown fields");
      const envelope = parsedRecord["l3e"];
      if (typeof envelope !== "object" || envelope === null || Array.isArray(envelope)) {
        return failure("evidence header envelope is invalid");
      }
      const header = envelope as Record<string, unknown>;
      if (Object.keys(header).sort().join(",") !== "k,v" ||
          header["v"] !== EVIDENCE_VERSION || header["k"] !== EVIDENCE_HEADER_KIND) {
        return failure("evidence section header version/kind is unsupported");
      }
      lineIndex += 1;
      continue;
    }

    const envelope = parsedRecord !== null && typeof parsedRecord["l3e"] === "object" && parsedRecord["l3e"] !== null
      ? parsedRecord["l3e"] as Record<string, unknown>
      : undefined;

    if (envelope?.["k"] === EVIDENCE_TRAILER_KIND) {
      if (offset !== section.length) return failure("evidence trailer is not the final line");
      if (Object.keys(parsedRecord ?? {}).sort().join(",") !== "l3e" ||
          Object.keys(envelope).sort().join(",") !== "k,n,s,v" ||
          envelope["v"] !== EVIDENCE_VERSION) {
        return failure("evidence section trailer version/kind is unsupported");
      }
      const count = envelope["n"];
      if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
        return failure("evidence section trailer declares an invalid item count");
      }
      const hash = envelope["s"];
      if (typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)) {
        return failure("evidence section trailer digest is not canonical");
      }
      declaredCount = count;
      declaredDigest = hash;
      lineIndex += 1;
      break;
    }

    wireCount += 1;
    if (wireCount > maxItems || wireCount > Math.floor(section.length / minValidItemLineBytes)) {
      return failure("evidence section exceeds its item ceiling for the available wire bytes");
    }
    if (parsedRecord === null || Object.keys(parsedRecord).sort().join(",") !== "i") {
      return failure("evidence item has unknown envelope fields");
    }
    const record = parsedRecord["i"];
    if (typeof record !== "object" || record === null || Array.isArray(record)) return failure("evidence item is not an i envelope");
    const itemRecord = record as Record<string, unknown>;
    if (Object.keys(itemRecord).sort().join(",") !== "b,s,t") return failure("evidence item envelope has unknown fields");
    let seq: number;
    let kind: string;
    try {
      seq = validatePositive(itemRecord["s"], "evidence.seq");
      kind = validateId(itemRecord["t"], "evidence.kind");
    } catch {
      return failure("evidence item has an invalid sequence or kind");
    }
    if (!isEvidenceKind(kind)) return failure(`evidence item kind '${kind}' is not registered`);
    if (seq !== expectedSeq) return failure(`evidence item sequence is not dense and ordered at ${expectedSeq}`);
    expectedSeq += 1;

    if (
      kind === "message_id" || kind === "verdict_timing_evidence" ||
      kind === "verdict_reasons" || kind === "verdict_payment_checks"
    ) {
      if (sawProduction) return failure("synthetic evidence rows must precede every production item");
      try {
        validateEvidenceBody(kind, itemRecord["b"]);
      } catch (error) {
        return failure(error instanceof Error ? error.message : String(error));
      }
      if (kind === "message_id") {
        const id = validateId((itemRecord["b"] as { id: string }).id, "message_id.id");
        if (messageIdSeen.has(id)) return failure(`message id table repeats an identifier at ${seq}`);
        messageIdSeen.add(id);
        messageIds.push(id);
      } else if (kind === "verdict_timing_evidence") {
        const row = itemRecord["b"] as { case_id: string; index: number; values: unknown[] };
        timingRows.push({ case_id: row.case_id, index: row.index, values: row.values });
      } else if (kind === "verdict_reasons") {
        const row = itemRecord["b"] as { case_id: string; path: string; list: string; index: number; values: string[] };
        reasonRows.push({ case_id: row.case_id, path: row.path, list: row.list, index: row.index, values: row.values });
      } else {
        const row = itemRecord["b"] as { case_id: string; path: string; index: number; values: unknown[] };
        checkRows.push({ case_id: row.case_id, path: row.path, index: row.index, values: row.values });
      }
      prefixCount += 1;
      digest.update(line);
      digest.update("\n", "utf8");
      lineIndex += 1;
      continue;
    }

    sawProduction = true;
    let body = itemRecord["b"];
    if (kind === "stub_observation") {
      const payload = stubPayloadRecord(body);
      if (payload !== null && Object.hasOwn(payload, "message_id_refs")) {
        if (Object.hasOwn(payload, "message_ids")) {
          return failure("stub observation mixes message ids and references");
        }
        const refs = payload["message_id_refs"];
        if (!Array.isArray(refs) || refs.length > MAX_NESTED_EVIDENCE_ITEMS) {
          return failure("stub observation message id references exceed their bounded cardinality");
        }
        const restored: unknown[] = [];
        for (const ref of refs) {
          if (typeof ref !== "number" || !Number.isSafeInteger(ref) || ref < 0 || ref >= messageIds.length) {
            return failure("stub observation references an unknown message id");
          }
          usedIds.add(ref);
          restored.push(messageIds[ref]);
        }
        const clonePayload: Record<string, unknown> = { ...payload, message_ids: restored };
        delete clonePayload["message_id_refs"];
        const record = body as Record<string, unknown>;
        const key = record["entry"] === payload ? "entry" : "attribution";
        body = { ...record, [key]: clonePayload };
      }
    }
    if (kind === "verdict" && typeof body === "object" && body !== null && !Array.isArray(body)) {
      const record = body as Record<string, unknown>;
      if (typeof record["case_id"] === "string") {
        for (const list of ["failure_reasons", "unverified_reasons", "timing_evidence"]) {
          const inline = record[list];
          if (inline !== undefined && (!Array.isArray(inline) || inline.length > 0)) {
            return failure(`verdict.${list} must be empty in v3; rows carry the values`);
          }
        }
        for (const schedule of ["base", "adverse", "changed", "negative"]) {
          const item = record[schedule];
          if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
          const checks = (item as Record<string, unknown>)["evidence_checks"];
          if (checks !== undefined && (!Array.isArray(checks) || checks.length > 0)) {
            return failure(`verdict.${schedule}.evidence_checks must be empty in v3; rows carry the values`);
          }
        }
      }
    }
    try {
      validateEvidenceBody(kind, body);
    } catch (error) {
      return failure(error instanceof Error ? error.message : String(error));
    }
    digest.update(line);
    digest.update("\n", "utf8");
    items.push({ seq: seq - prefixCount, kind, body });
    lineIndex += 1;
  }

  if (lineIndex < 2 || declaredCount === null || declaredDigest === null) {
    return failure("evidence section is not framed");
  }
  if (declaredCount !== wireCount) return failure("evidence section item count does not match its trailer");
  if (digest.digest("hex") !== declaredDigest) return failure("evidence section digest does not match its trailer");
  for (const [index] of messageIds.entries()) {
    if (!usedIds.has(index)) return failure(`message id table row ${index} is unreferenced`);
  }
  if (timingRows.length > 0 || reasonRows.length > 0 || checkRows.length > 0) {
    const verdictIndex = items.findIndex((item) => item.kind === "verdict");
    if (verdictIndex < 0) return failure("verdict rows exist without a verdict item");
    const verdict = items[verdictIndex];
    const body = structuredClone(verdict.body) as Record<string, unknown>;
    const caseIds = new Set([...timingRows, ...reasonRows, ...checkRows].map((row) => row.case_id));
    if (caseIds.size !== 1 || !caseIds.has(String(body["case_id"]))) {
      return failure("verdict rows do not belong to the retained verdict");
    }
    if (timingRows.length > 0) {
      timingRows.sort((left, right) => left.index - right.index);
      const flat: unknown[] = [];
      for (const [expected, row] of timingRows.entries()) {
        if (row.index !== expected) return failure("verdict timing rows are not contiguous");
        flat.push(...row.values);
      }
      body["timing_evidence"] = flat;
    }
    const groups = new Map<string, { path: string; list: string; rows: typeof reasonRows }>();
    for (const row of reasonRows) {
      const key = `${row.path}|${row.list}`;
      const group = groups.get(key) ?? { path: row.path, list: row.list, rows: [] };
      group.rows.push(row);
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      const target = group.path === "root" ? body : body[group.path];
      if (typeof target !== "object" || target === null || Array.isArray(target)) {
        return failure(`verdict reason rows name an unknown path '${group.path}'`);
      }
      group.rows.sort((left, right) => left.index - right.index);
      const flat: string[] = [];
      for (const [expected, row] of group.rows.entries()) {
        if (row.index !== expected) return failure("verdict reason rows are not contiguous");
        flat.push(...row.values);
      }
      (target as Record<string, unknown>)[group.list] = flat;
    }
    const checkGroups = new Map<string, { path: string; rows: typeof checkRows }>();
    for (const row of checkRows) {
      const group = checkGroups.get(row.path) ?? { path: row.path, rows: [] };
      group.rows.push(row);
      checkGroups.set(row.path, group);
    }
    for (const group of checkGroups.values()) {
      const target = body[group.path];
      if (typeof target !== "object" || target === null || Array.isArray(target)) {
        return failure(`verdict check rows name an unknown path '${group.path}'`);
      }
      group.rows.sort((left, right) => left.index - right.index);
      const flat: unknown[] = [];
      for (const [expected, row] of group.rows.entries()) {
        if (row.index !== expected) return failure("verdict check rows are not contiguous");
        flat.push(...row.values);
      }
      (target as Record<string, unknown>)["evidence_checks"] = flat;
    }
    try {
      validateEvidenceBody("verdict", body);
    } catch (error) {
      return failure(error instanceof Error ? error.message : String(error));
    }
    items[verdictIndex] = { seq: verdict.seq, kind: "verdict", body };
  }
  return { ok: true, reason: null, items: Object.freeze(items) };
}
