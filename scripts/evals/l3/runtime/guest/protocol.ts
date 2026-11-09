/**
 * scripts/evals/l3/runtime/guest/protocol.ts
 *
 * Controller protocol shared by the host, the in-guest controller and the
 * trusted in-guest driver.
 *
 * Every operation has a strict request payload AND a strict effect/result
 * schema. A generic `{}` success is not accepted: results carry the observed
 * effect (bytes, exit codes, container identity, digests) so a caller cannot
 * transition state from an untyped acknowledgement.
 */

import {
  ERROR_CODES,
  assertNoExtraKeys,
  parseRequestEnvelope,
  strictObject,
  validateId,
  validateNat,
  validatePositive,
  validateStringBound,
  MAX_FRAME_BYTES,
  type ErrorCode,
  type RequestEnvelope,
} from "../../contracts.js";
import type { RawChannelOutput } from "./channel.js";

export const CONTROLLER_OPERATIONS = [
  "build",
  "run",
  "exchange_candidate",
  "observe_process",
  "termination",
  "reset_state",
  "restart_candidate",
  "pause_candidate",
  "resume_candidate",
  "stop_candidate",
  "status",
] as const;

export type ControllerOperation = (typeof CONTROLLER_OPERATIONS)[number];

export const OBSERVATION_KINDS = [
  "build_started",
  "build_finished",
  "run_started",
  "run_finished",
  "candidate_frame_in",
  "candidate_frame_out",
  "process_sample",
  "stage_read",
  "state_reset",
  "restart",
  "paused",
  "resumed",
  "stopped",
  "observation_unavailable",
] as const;

export type ObservationKind = (typeof OBSERVATION_KINDS)[number];

export const MAX_CONTROLLER_FRAME_BYTES = MAX_FRAME_BYTES;
/** Cap on a single string payload/result body (bounded by the frame cap anyway). */
export const MAX_EXCHANGE_FRAME_BYTES = 16_384;
export const MAX_BUFFERED_BYTES = 65_536;
/** One candidate capture is bounded by the largest admitted build/run output limit. */
export const MAX_RAW_OUTPUT_BYTES = 4_194_304;
/** One response drain plus one final drain can cross a single exchange. */
export const MAX_RAW_OUTPUT_RECORDS_PER_EXCHANGE = 2;

const SHA256_HEX = /^[0-9a-f]{64}$/;
const GUEST_PATH = /^\/[A-Za-z0-9._/-]{1,200}$/;
const DOCKER_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export interface ControllerObservation {
  readonly kind: ObservationKind;
  readonly at_ms: number;
  readonly subject: string;
  readonly value: number;
  readonly flag: boolean;
}

export type Payload = Readonly<Record<string, unknown>>;
export type EffectResult = Readonly<Record<string, unknown>>;

function stringField(value: unknown, field: string, maxBytes: number): string {
  return validateStringBound(value, field, maxBytes);
}

function pathField(value: unknown, field: string): string {
  const text = stringField(value, field, 200);
  if (!GUEST_PATH.test(text) || text.includes("..")) {
    throw new Error(`${field} must be an absolute guest path without traversal: ${text}`);
  }
  return text;
}

function sha256Field(value: unknown, field: string): string {
  const text = stringField(value, field, 64);
  if (!SHA256_HEX.test(text)) throw new Error(`${field} must be 64 lowercase hex characters`);
  return text;
}

/** Strict request payload validation, one schema per operation. */
export function validatePayload(operation: ControllerOperation, payload: unknown): Payload {
  switch (operation) {
    case "build": {
      const record = strictObject(payload, "build.payload", [
        "workspace_ref",
        "offline_bundle_ref",
        "build_spec_sha256",
      ]);
      return {
        workspace_ref: pathField(record.workspace_ref, "workspace_ref"),
        offline_bundle_ref: pathField(record.offline_bundle_ref, "offline_bundle_ref"),
        build_spec_sha256: sha256Field(record.build_spec_sha256, "build_spec_sha256"),
      };
    }
    case "run": {
      const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
      if (record === null) throw new Error("run.payload must be an object");
      for (const key of Object.keys(record)) {
        if (key !== "entrypoint" && key !== "state_volume" && key !== "image_id") {
          throw new Error(`Unknown field '${key}' in run.payload`);
        }
      }
      const entrypoint = pathField(record.entrypoint, "entrypoint");
      const stateVolume = validateId(record.state_volume, "state_volume");
      const imageId = typeof record.image_id === "string" ? record.image_id : undefined;
      return {
        entrypoint,
        state_volume: stateVolume,
        ...(imageId ? { image_id: imageId } : {}),
      };
    }
    case "exchange_candidate": {
      const record = assertNoExtraKeys(
        payload,
        ["frame", "deadline_ms", "deadline_at_ms", "message_bytes", "payload_sha256", "payload_bytes"],
        "exchange_candidate.payload",
      );
      const messageBytes = record.message_bytes;
      if (
        messageBytes !== undefined &&
        (typeof messageBytes !== "number" || !Number.isSafeInteger(messageBytes) || messageBytes <= 0)
      ) {
        throw new Error("message_bytes must be a positive safe integer when present");
      }
      // The exact payload the trusted workload handed over must be declared, so
      // the observer can compare candidate-held bytes against workload bytes.
      const payloadSha256 = sha256Field(record.payload_sha256, "payload_sha256");
      const payloadBytes = validatePositive(record.payload_bytes, "payload_bytes");
      return {
        frame: stringField(record.frame, "frame", MAX_EXCHANGE_FRAME_BYTES),
        deadline_ms: validatePositive(record.deadline_ms, "deadline_ms"),
        ...(record.deadline_at_ms === undefined
          ? {}
          : { deadline_at_ms: validatePositive(record.deadline_at_ms, "deadline_at_ms") }),
        payload_sha256: payloadSha256,
        payload_bytes: payloadBytes,
        ...(messageBytes === undefined ? {} : { message_bytes: messageBytes as number }),
      };
    }
    case "reset_state":
      return {
        state_volume: validateId(
          strictObject(payload, "reset_state.payload", ["state_volume"]).state_volume,
          "state_volume",
        ),
      };
    case "restart_candidate":
      return {
        reason: validateId(
          strictObject(payload, "restart_candidate.payload", ["reason"]).reason,
          "reason",
        ),
      };
    case "observe_process":
    case "termination":
    case "pause_candidate":
    case "resume_candidate":
    case "stop_candidate":
    case "status":
      strictObject(payload, `${operation}.payload`, []);
      return {};
    default: {
      const unreachable: never = operation;
      throw new Error(`Unhandled controller operation: ${String(unreachable)}`);
    }
  }
}

function intField(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`${field} must be a safe integer`);
  }
  return value;
}

function boolField(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${field} must be boolean`);
  return value;
}

/**
 * Strict effect/result validation. Called by the controller before it answers
 * and by every consumer, so a transition can only follow a typed effect.
 */
export function validateResult(operation: ControllerOperation, raw: unknown): EffectResult {
  switch (operation) {
    case "build": {
      const record = strictObject(raw, "build.result", [
        "image_id",
        "exit_code",
        "duration_ms",
        "stdout_bytes",
        "stderr_bytes",
        "timed_out",
        "output_truncated",
        "entrypoint_sha256",
        "artifact_count",
        "stream_mask_base64",
        "stream_capture_bytes",
        "output_container_id",
        "output_container_pid",
        "cleanup_failures",
        "failure_class",
      ]);
      const failureClass = record.failure_class;
      if (
        failureClass !== "normal" && failureClass !== "timeout" && failureClass !== "overflow" &&
        failureClass !== "persistence" && failureClass !== "policy" && failureClass !== "infrastructure"
      ) {
        throw new Error("failure_class must be one of normal|timeout|overflow|persistence|policy|infrastructure");
      }
      const imageId = stringField(record.image_id, "image_id", 128);
      if (!DOCKER_ID.test(imageId)) throw new Error("image_id must be a docker image identity");
      const exitCode = intField(record.exit_code, "exit_code");
      if (exitCode < 0 || exitCode > 255) throw new Error("exit_code must be 0..255");
      const streamMaskBase64 = stringField(record.stream_mask_base64, "stream_mask_base64", 699_052);
      const streamCaptureBytes = validateNat(record.stream_capture_bytes, "stream_capture_bytes");
      if (streamCaptureBytes > MAX_RAW_OUTPUT_BYTES) throw new Error("stream_capture_bytes exceeds the build output ceiling");
      const streamMask = Buffer.from(streamMaskBase64, "base64");
      if (
        streamMask.toString("base64") !== streamMaskBase64 ||
        streamMask.length !== Math.ceil(streamCaptureBytes / 8)
      ) {
        throw new Error("stream_mask_base64 is not a canonical mask for stream_capture_bytes");
      }
      const unusedMaskBits = streamCaptureBytes % 8;
      if (
        unusedMaskBits !== 0 &&
        (streamMask[streamMask.length - 1] & ~((1 << unusedMaskBits) - 1)) !== 0
      ) {
        throw new Error("stream_mask_base64 marks bytes beyond the captured prefix");
      }
      const streamEvidence = {
        stream_mask_base64: streamMaskBase64,
        stream_capture_bytes: streamCaptureBytes,
      };
      const stdoutBytes = validateNat(record.stdout_bytes, "stdout_bytes");
      const stderrBytes = validateNat(record.stderr_bytes, "stderr_bytes");
      if (stdoutBytes > Number.MAX_SAFE_INTEGER - stderrBytes || streamCaptureBytes > stdoutBytes + stderrBytes) {
        throw new Error("stream capture length exceeds the observed stdout/stderr totals");
      }
      const outputContainerId = stringField(record.output_container_id, "output_container_id", 128);
      const outputContainerPid = validateNat(record.output_container_pid, "output_container_pid");
      if ((outputContainerId.length === 0) !== (outputContainerPid === 0)) {
        throw new Error("output container identity and pid must be present together");
      }
      if (outputContainerId.length > 0 && !/^[0-9a-f]{64}$/.test(outputContainerId)) {
        throw new Error("output_container_id must be a canonical Docker identity");
      }
      if (streamCaptureBytes > 0 && outputContainerId.length === 0) {
        throw new Error("captured build bytes have no observed container process identity");
      }
      const outputIdentity = {
        output_container_id: outputContainerId,
        output_container_pid: outputContainerPid,
      };
      const entrypointSha256 = record.entrypoint_sha256;
      if (exitCode === 0) {
        if (typeof entrypointSha256 !== "string" || !SHA256_HEX.test(entrypointSha256)) {
          throw new Error("a successful build must report the compiled entrypoint digest");
        }
        const artifactCount = validatePositive(record.artifact_count, "artifact_count");
        return {
          image_id: imageId,
          exit_code: exitCode,
          duration_ms: validateNat(record.duration_ms, "duration_ms"),
          stdout_bytes: validateNat(record.stdout_bytes, "stdout_bytes"),
          stderr_bytes: validateNat(record.stderr_bytes, "stderr_bytes"),
          ...streamEvidence,
          ...outputIdentity,
          timed_out: boolField(record.timed_out, "timed_out"),
          output_truncated: boolField(record.output_truncated, "output_truncated"),
          failure_class: failureClass,
          entrypoint_sha256: entrypointSha256,
          artifact_count: artifactCount,
          cleanup_failures: validateNat(record.cleanup_failures, "cleanup_failures"),
        };
      }
      return {
        image_id: imageId,
        exit_code: exitCode,
        duration_ms: validateNat(record.duration_ms, "duration_ms"),
        stdout_bytes: validateNat(record.stdout_bytes, "stdout_bytes"),
        stderr_bytes: validateNat(record.stderr_bytes, "stderr_bytes"),
        ...streamEvidence,
        timed_out: boolField(record.timed_out, "timed_out"),
        output_truncated: boolField(record.output_truncated, "output_truncated"),
        failure_class: failureClass,
        ...outputIdentity,
        entrypoint_sha256: "",
        artifact_count: 0,
        cleanup_failures: validateNat(record.cleanup_failures, "cleanup_failures"),
      };
    }
    case "run": {
      const record = strictObject(raw, "run.result", ["container_id", "pid"]);
      const containerId = stringField(record.container_id, "container_id", 128);
      if (!DOCKER_ID.test(containerId)) throw new Error("container_id must be a docker container identity");
      return { container_id: containerId, pid: validatePositive(record.pid, "pid") };
    }
    case "exchange_candidate": {
      const record = strictObject(raw, "exchange_candidate.result", [
        "response_frame",
        "observed_bytes",
        "deadline_exceeded",
        "raw_output",
        "raw_output_truncated",
      ]);
      let rawOutput: readonly RawChannelOutput[] | undefined;
      const rawOutputTruncated = boolField(record.raw_output_truncated, "raw_output_truncated");
      if (record.raw_output !== undefined) {
        if (!Array.isArray(record.raw_output) || record.raw_output.length > MAX_RAW_OUTPUT_RECORDS_PER_EXCHANGE) {
          throw new Error(`raw_output exceeds ${MAX_RAW_OUTPUT_RECORDS_PER_EXCHANGE} bounded drains per exchange`);
        }
        const streamOffsets = new Map<string, number>();
        let totalRawBytes = 0;
        rawOutput = record.raw_output.map((rawChunk, index) => {
          const chunk = strictObject(rawChunk, `raw_output[${index}]`, [
            "stream",
            "stream_offset",
            "capture_order",
            "process_session_id",
            "bytes",
            "stream_mask",
          ]);
          if (chunk.stream !== "combined") throw new Error(`raw_output[${index}].stream must be combined`);
          const processSessionId = validateId(chunk.process_session_id, `raw_output[${index}].process_session_id`);
          const streamOffset = validateNat(chunk.stream_offset, `raw_output[${index}].stream_offset`);
          const captureOrder = validatePositive(chunk.capture_order, `raw_output[${index}].capture_order`);
          if (captureOrder !== streamOffset + 1) throw new Error("raw_output capture_order must equal its byte offset + 1");
          if (!Buffer.isBuffer(chunk.bytes) || chunk.bytes.length === 0) {
            throw new Error(`raw_output[${index}].bytes must be a nonempty Buffer`);
          }
          if (streamOffset !== (streamOffsets.get(processSessionId) ?? 0)) {
            throw new Error(`raw_output offsets for ${processSessionId} must be contiguous`);
          }
          if (!Buffer.isBuffer(chunk.stream_mask) || chunk.stream_mask.length !== Math.ceil(chunk.bytes.length / 8)) {
            throw new Error(`raw_output[${index}].stream_mask must map every captured byte`);
          }
          const unusedBits = chunk.bytes.length % 8;
          if (
            unusedBits !== 0 &&
            (chunk.stream_mask[chunk.stream_mask.length - 1] & ~((1 << unusedBits) - 1)) !== 0
          ) {
            throw new Error(`raw_output[${index}].stream_mask marks bytes beyond its captured prefix`);
          }
          totalRawBytes += chunk.bytes.length;
          if (totalRawBytes > MAX_RAW_OUTPUT_BYTES) {
            throw new Error("raw_output exceeds the admitted candidate output ceiling");
          }
          streamOffsets.set(processSessionId, streamOffset + chunk.bytes.length);
          return {
            stream: "combined" as const,
            stream_offset: streamOffset,
            capture_order: captureOrder,
            process_session_id: processSessionId,
            bytes: chunk.bytes,
            stream_mask: chunk.stream_mask,
          };
        });
      }
      return {
        response_frame: stringField(record.response_frame, "response_frame", MAX_EXCHANGE_FRAME_BYTES),
        observed_bytes: validateNat(record.observed_bytes, "observed_bytes"),
        deadline_exceeded: boolField(record.deadline_exceeded, "deadline_exceeded"),
        ...(rawOutput === undefined ? {} : { raw_output: rawOutput }),
        ...(rawOutputTruncated === undefined ? {} : { raw_output_truncated: rawOutputTruncated }),
      };
    }
    case "observe_process": {
      const record = strictObject(raw, "observe_process.result", [
        "pid",
        "rss_bytes",
        "threads",
        "state",
        "memory_current_bytes",
        "memory_peak_bytes",
      ]);
      const nullableNat = (value: unknown, field: string): number | null =>
        value === null ? null : validateNat(value, field);
      return {
        pid: validatePositive(record.pid, "pid"),
        rss_bytes: validateNat(record.rss_bytes, "rss_bytes"),
        threads: validateNat(record.threads, "threads"),
        state: validateId(record.state, "state"),
        memory_current_bytes: nullableNat(record.memory_current_bytes, "memory_current_bytes"),
        memory_peak_bytes: nullableNat(record.memory_peak_bytes, "memory_peak_bytes"),
      };
    }
    case "termination": {
      const record = strictObject(raw, "termination.result", [
        "container_state",
        "exit_code",
        "finished_at",
        "pid",
        "process_session_id",
      ]);
      const finishedAt = record.finished_at;
      if (finishedAt !== null && typeof finishedAt !== "string") {
        throw new Error("finished_at must be a string or null");
      }
      const exitCode = record.exit_code;
      if (exitCode !== null && (typeof exitCode !== "number" || !Number.isSafeInteger(exitCode) || exitCode < 0 || exitCode > 255)) {
        throw new Error("exit_code must be null or 0..255");
      }
      return {
        container_state: validateId(record.container_state, "container_state"),
        exit_code: exitCode as number | null,
        finished_at: finishedAt as string | null,
        pid: validateNat(record.pid, "pid"),
        process_session_id: validateId(record.process_session_id, "process_session_id"),
      };
    }
    case "reset_state":
      return { state_volume: validateId(strictObject(raw, "reset_state.result", ["state_volume"]).state_volume, "state_volume") };
    case "restart_candidate":
      return {
        restart_count: validateNat(
          strictObject(raw, "restart_candidate.result", ["restart_count"]).restart_count,
          "restart_count",
        ),
      };
    case "pause_candidate":
    case "resume_candidate": {
      const record = strictObject(raw, `${operation}.result`, ["state"]);
      const state = validateId(record.state, "state");
      const expected = operation === "pause_candidate" ? "paused" : "running";
      if (state !== expected) throw new Error(`${operation} must report state ${expected}, got ${state}`);
      return { state };
    }
    case "stop_candidate": {
      const record = strictObject(raw, "stop_candidate.result", ["terminated", "exit_code"]);
      const exitCode = intField(record.exit_code, "exit_code");
      const terminated = boolField(record.terminated, "terminated");
      if (!terminated) throw new Error("stop_candidate must not report an un-terminated candidate");
      if (exitCode < 0 || exitCode > 255) throw new Error("exit_code must be 0..255");
      return { terminated, exit_code: exitCode };
    }
    case "status": {
      const record = strictObject(raw, "status.result", [
        "container_state",
        "restart_count",
        "observed_write_bytes",
        "buffered_bytes",
        "process_session_id",
      ]);
      const buffered = validateNat(record.buffered_bytes, "buffered_bytes");
      if (buffered > MAX_BUFFERED_BYTES) throw new Error("buffered_bytes exceeds the declared buffer ceiling");
      return {
        container_state: validateId(record.container_state, "container_state"),
        restart_count: validateNat(record.restart_count, "restart_count"),
        observed_write_bytes: validateNat(record.observed_write_bytes, "observed_write_bytes"),
        buffered_bytes: buffered,
        process_session_id: validateId(record.process_session_id, "process_session_id"),
      };
    }
    default: {
      const unreachable: never = operation;
      throw new Error(`Unhandled controller operation: ${String(unreachable)}`);
    }
  }
}

/** Parses an incoming request envelope and its payload. */
export function parseControllerRequest(raw: unknown): RequestEnvelope<Payload> {
  const envelope = parseRequestEnvelope(raw);
  if (!(CONTROLLER_OPERATIONS as readonly string[]).includes(envelope.operation)) {
    throw new Error(`Unknown controller operation: ${envelope.operation}`);
  }
  const operation = envelope.operation as ControllerOperation;
  return { ...envelope, payload: validatePayload(operation, envelope.payload) };
}

export function parseObservationFrame(raw: unknown): ControllerObservation {
  const outer = strictObject(raw, "ControllerFrame", ["version", "observation"]);
  if (outer.version !== 1) throw new Error("Observation frame version must be 1");
  const inner = strictObject(outer.observation, "ControllerObservation", [
    "kind",
    "at_ms",
    "subject",
    "value",
    "flag",
  ]);
  const kind = validateId(inner.kind, "observation.kind");
  if (!(OBSERVATION_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`Unknown observation kind: ${kind}`);
  }
  if (typeof inner.flag !== "boolean") throw new Error("observation.flag must be boolean");
  return {
    kind: kind as ObservationKind,
    at_ms: validateNat(inner.at_ms, "observation.at_ms"),
    subject: validateId(inner.subject, "observation.subject"),
    value: validateNat(inner.value, "observation.value"),
    flag: inner.flag,
  };
}

export function isObservationFrame(raw: unknown): boolean {
  return typeof raw === "object" && raw !== null && Object.prototype.hasOwnProperty.call(raw, "observation");
}

export function errorCodeOf(value: unknown): ErrorCode | null {
  return typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value)
    ? (value as ErrorCode)
    : null;
}
