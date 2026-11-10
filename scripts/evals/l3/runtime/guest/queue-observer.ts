/**
 * scripts/evals/l3/runtime/guest/queue-observer.ts
 *
 * Per-artifact independently reviewed candidate queue observer.
 *
 * The observer is admitted only when a reviewed, signed mapping for *this*
 * executable exists and every bound fact is recomputed by the controller:
 * the built image digest, the packaged observer program digest, the reviewed
 * mapping bytes, the staged run/attempt identity, and a bounded custody window
 * containing the actual clock reading. Custodian keys ship in the read-only guest
 * image; the candidate bundle cannot supply them. Admission happens before the
 * candidate exists, and a bundle that declares an observer it cannot substantiate
 * refuses the launch.
 *
 * Admitted observation has these properties:
 *
 * 1. **Reviewed semantics.** The mapping declares which record fields mean what
 *    and which candidate state token means which D1 disposition. Every field is
 *    required, so a record that omits its request sequence, byte count or payload
 *    digest makes the observation unavailable instead of inventing provenance.
 * 2. **Byte truth from the workload.** Payload bytes are read from the sink,
 *    hashed, and compared with the record *and* with the digest the trusted
 *    workload recorded for the exact bytes it handed over.
 * 3. **Independently owned consumer receipt.** A `delivered` transition is only
 *    accepted when the controller pauses the candidate and independently reads
 *    the selected bytes from the trusted consumer outbox. The receipt binds the
 *    actual bytes, digest, read sequence and accepted send to the D1 result.
 * 4. **Per-message lifecycle, not a snapshot of rows.** Each message has at most
 *    one accepted transition and one terminal (`delivered`, `dropped`, or
 *    `retained`). A `dropped` transition may be the only transition only when it
 *    matches a trusted send-time request. Accepted messages retain ordinary
 *    terminal semantics; shedding and drops are not rewritten as delivery.
 *    Historical accepted rows never count as buffered once a terminal exists,
 *    and the final observation requires every trusted send to have a queue record
 *    and every accepted message to be terminal.
 * 5. **Append-only immutable history.** Each distinct transition identity is
 *    retained once with a stable `event_seq`; re-observing an unchanged row mints
 *    no new event, and a changed byte count under the same identity is a conflict.
 */

import { strictObject, validateId, validateNat, validatePositive, type Id, type Nat } from "../../contracts.js";
import type { BundleEntry } from "../bundle.js";
import { listDirectoryBeneath, readRegularFileBeneath } from "./safe-fs.js";
import { sha256Hex, SHA256_HEX, verifyReviewCustody, type ReviewCustody, type ReviewTrustAnchor } from "./trust.js";
import type { GuestRuntime } from "./runtime.js";

/** Domain separation for the reviewed-mapping payload. */
export const OBSERVER_REVIEW_DOMAIN = "l3-queue-observer-review-v4";

export const MAX_QUEUE_RECORDS = 262_144;
export const MAX_QUEUE_RECORD_LINE_BYTES = 1024;
export const MAX_PAYLOAD_FILE_BYTES = 1024 * 1024;
export const MAX_PAYLOAD_FILES = 262_144;

/** Full configured record cardinality times the largest legal JSONL row and delimiter. */
export const MAX_QUEUE_RECORD_BYTES =
  MAX_QUEUE_RECORDS * (MAX_QUEUE_RECORD_LINE_BYTES + 1);

const D1_DISPOSITION_STATES = ["accepted", "delivered", "dropped", "retained"] as const;
type DispositionState = (typeof D1_DISPOSITION_STATES)[number];

export interface ReviewedQueueRecordFields {
  readonly connection: string;
  readonly message: string;
  readonly request_seq: string;
  readonly payload_bytes: string;
  readonly payload_sha256: string;
  readonly state: string;
}

export interface ReviewedPayloadLocation {
  readonly path: readonly string[];
  readonly file: "{message_id}.bin";
  readonly connection_directory: true;
}

export interface ReviewedObserverMapping {
  readonly version: 4;
  readonly mechanism: "file_spool";
  readonly executable_sha256: string;
  readonly observer_sha256: string;
  readonly approval_reason: string;
  readonly queue_records: { readonly path: readonly string[]; readonly encoding: "jsonl" };
  readonly record_fields: ReviewedQueueRecordFields;
  readonly state_map: Readonly<Record<DispositionState, readonly string[]>>;
  readonly queue_payloads: ReviewedPayloadLocation;
  readonly delivery_outbox: ReviewedPayloadLocation;
  readonly transition_log: "append_only";
}

export interface ConnectionBufferItem {
  readonly connection_id: Id;
  readonly buffered_bytes: Nat;
}

export interface ConnectionBufferSnapshot {
  readonly attempt_id: Id;
  readonly process_session_id: Id;
  readonly observation_id: Id;
  readonly observed_monotonic_ms: Nat;
  readonly complete: boolean;
  readonly connection_buffers: readonly ConnectionBufferItem[];
}

export type MessageDispositionObservation = {
  readonly attempt_id: Id;
  readonly process_session_id: Id;
  readonly event_seq: number;
  readonly request_seq: number;
  readonly connection_id: Id;
  readonly message_id: Id;
  readonly bytes: number;
  readonly observed_monotonic_ms: number;
} & (
  | { readonly state: "accepted" | "delivered" | "dropped" }
  | { readonly state: "retained"; readonly buffer_observation_id: Id }
);

/** Actual payload bytes independently read at the consumer outbox boundary. */
export interface ConsumerReceipt {
  readonly attempt_id: Id;
  readonly process_session_id: Id;
  readonly read_seq: number;
  readonly send_seq: number;
  readonly connection_id: Id;
  readonly message_id: Id;
  readonly observed_monotonic_ms: Nat;
  readonly bytes: Nat;
  readonly sha256: string;
  readonly payload_base64: string;
  readonly content_verified: true;
}

/** Exact payload facts recorded by the trusted workload, never by the candidate. */
export interface TrustedWorkloadEvidence {
  readonly expected: ReadonlyMap<string, { readonly bytes: number; readonly sha256: string; readonly send_seq: number }>;
  /** Message keys the trusted consumer reported, with the byte count it saw. */
  readonly consumed: ReadonlyMap<string, ConsumerReceipt>;
}

export interface ObservationRequest {
  readonly state_volume_dir: string;
  readonly attempt_id: string;
  readonly process_session_id: string;
  readonly observation_id: string;
  readonly now: () => number;
  readonly trusted: TrustedWorkloadEvidence;
  readonly final: boolean;
  /**
   * `true` when the candidate process is already gone: the state volume is frozen
   * and must not be paused or resumed. The caller is responsible for having
   * verified the stopped identity.
   */
  readonly frozen: boolean;
  readonly runtime?: GuestRuntime;
}

/** Observation could not be established. Callers must not synthesise a pass. */
export class ObserverUnavailableError extends Error {
  constructor(readonly reason: string) {
    super(`queue observation unavailable: ${reason}`);
    this.name = "ObserverUnavailableError";
  }
}

/** The candidate could not be resumed; the workflow must fail rather than continue blind. */
export class ObserverResumeError extends Error {
  constructor(readonly reason: string) {
    super(`candidate resume failed after observation: ${reason}`);
    this.name = "ObserverResumeError";
  }
}

export interface CandidateQueueObserver {
  readonly mechanism: "file_spool";
  readonly mapping_sha256: string;
  readConsumerOutbox(stateVolumeDir: string, connectionId: string, messageId: string): Promise<Buffer>;
  observeBuffers(request: ObservationRequest): Promise<ConnectionBufferSnapshot>;
  observeDispositions(request: ObservationRequest): Promise<readonly MessageDispositionObservation[]>;
}

export interface ObserverAdmission {
  readonly observer: CandidateQueueObserver | null;
  readonly refusal_reason: string | null;
}

function safeRelativePath(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 8) {
    throw new Error(`${field} must be a non-empty array of at most 8 segments`);
  }
  return Object.freeze(
    value.map((segment, index) => {
      const id = validateId(segment, `${field}[${index}]`);
      if (id === "." || id === "..") throw new Error(`${field}[${index}] must not be a traversal segment`);
      return id;
    }),
  );
}
function parsePayloadLocation(value: unknown, field: string): ReviewedPayloadLocation {
  const raw = strictObject(value, field, ["path", "file", "connection_directory"]);
  if (raw.file !== "{message_id}.bin" || raw.connection_directory !== true) {
    throw new Error(`${field} must name one message payload per connection directory`);
  }
  return Object.freeze({
    path: safeRelativePath(raw.path, `${field}.path`),
    file: "{message_id}.bin",
    connection_directory: true,
  });
}


function stateTokens(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 32) {
    throw new Error(`${field} must be a non-empty array of at most 32 state tokens`);
  }
  return Object.freeze(value.map((token, index) => validateId(token, `${field}[${index}]`)));
}

/** Strict, fail-closed parse of the reviewed mapping body. No field has a default. */
export function parseObserverMapping(entry: BundleEntry | undefined): ReviewedObserverMapping | null {
  if (entry === undefined) return null;
  try {
    const raw = JSON.parse(entry.data.toString("utf8")) as unknown;
    const obj = strictObject(raw, "queue_observer.json", [
      "version",
      "mechanism",
      "executable_sha256",
      "observer_sha256",
      "approval_reason",
      "queue_records",
      "record_fields",
      "state_map",
      "queue_payloads",
      "delivery_outbox",
      "transition_log",
    ]);
    if (obj.version !== 4) return null;
    if (obj.mechanism !== "file_spool") return null;

    const executable = String(obj.executable_sha256 ?? "");
    const observer = String(obj.observer_sha256 ?? "");
    if (!SHA256_HEX.test(executable) || !SHA256_HEX.test(observer)) return null;
    const approvalReason = validateId(obj.approval_reason, "approval_reason");

    const queue = strictObject(obj.queue_records, "queue_observer.queue_records", ["path", "encoding"]);
    if (queue.encoding !== "jsonl") return null;

    const fields = strictObject(obj.record_fields, "queue_observer.record_fields", [
      "connection",
      "message",
      "request_seq",
      "payload_bytes",
      "payload_sha256",
      "state",
    ]);
    const recordFields: ReviewedQueueRecordFields = {
      connection: validateId(fields.connection, "record_fields.connection"),
      message: validateId(fields.message, "record_fields.message"),
      request_seq: validateId(fields.request_seq, "record_fields.request_seq"),
      payload_bytes: validateId(fields.payload_bytes, "record_fields.payload_bytes"),
      payload_sha256: validateId(fields.payload_sha256, "record_fields.payload_sha256"),
      state: validateId(fields.state, "record_fields.state"),
    };
    if (new Set(Object.values(recordFields)).size !== 6) return null;

    const mapRaw = strictObject(obj.state_map, "queue_observer.state_map", [...D1_DISPOSITION_STATES]);
    const stateMap = {
      accepted: stateTokens(mapRaw.accepted, "state_map.accepted"),
      delivered: stateTokens(mapRaw.delivered, "state_map.delivered"),
      dropped: stateTokens(mapRaw.dropped, "state_map.dropped"),
      retained: stateTokens(mapRaw.retained, "state_map.retained"),
    } as const;
    const seenTokens = new Set<string>();
    for (const tokens of Object.values(stateMap)) {
      for (const token of tokens) {
        if (seenTokens.has(token)) return null;
        seenTokens.add(token);
      }
    }

    const queuePayloads = parsePayloadLocation(obj.queue_payloads, "queue_observer.queue_payloads");
    const deliveryOutbox = parsePayloadLocation(obj.delivery_outbox, "queue_observer.delivery_outbox");
    const queuePath = queuePayloads.path.join("/");
    const outboxPath = deliveryOutbox.path.join("/");
    if (queuePath === outboxPath || queuePath.startsWith(`${outboxPath}/`) || outboxPath.startsWith(`${queuePath}/`)) {
      return null;
    }
    if (obj.transition_log !== "append_only") return null;

    return Object.freeze({
      version: 4,
      mechanism: "file_spool",
      executable_sha256: executable,
      observer_sha256: observer,
      approval_reason: approvalReason,
      queue_records: Object.freeze({ path: safeRelativePath(queue.path, "queue_records.path"), encoding: "jsonl" }),
      record_fields: Object.freeze(recordFields),
      state_map: Object.freeze(stateMap),
      queue_payloads: queuePayloads,
      delivery_outbox: deliveryOutbox,
      transition_log: "append_only",
    });
  } catch {
    return null;
  }
}

/** Strict parse of the custody entry that signs the reviewed mapping bytes. */
export function parseObserverCustody(entry: BundleEntry | undefined): ReviewCustody | null {
  if (entry === undefined) return null;
  try {
    const raw = strictObject(JSON.parse(entry.data.toString("utf8")), "queue_observer_review.json", [
      "version",
      "run_id",
      "attempt_id",
      "executable_sha256",
      "program_sha256",
      "artifact_sha256",
      "custodian",
      "issued_at",
      "expires_at",
      "signature",
    ]);
    if (raw.version !== 1) return null;
    return {
      version: 1,
      run_id: String(raw.run_id ?? ""),
      attempt_id: String(raw.attempt_id ?? ""),
      executable_sha256: String(raw.executable_sha256 ?? ""),
      program_sha256: String(raw.program_sha256 ?? ""),
      artifact_sha256: String(raw.artifact_sha256 ?? ""),
      custodian: String(raw.custodian ?? ""),
      issued_at: String(raw.issued_at ?? ""),
      expires_at: String(raw.expires_at ?? ""),
      signature: String(raw.signature ?? ""),
    };
  } catch {
    return null;
  }
}

function refusal(reason: string): ObserverAdmission {
  return { observer: null, refusal_reason: reason };
}

/** Admits the observer for one executable, before the candidate launches. */
export function admitCandidateObserver(input: {
  readonly entries: readonly BundleEntry[];
  readonly executableDigest: string;
  readonly programSha256: string;
  readonly trust: ReviewTrustAnchor;
}): ObserverAdmission {
  const mappingEntry = input.entries.find(
    (entry) => entry.name === "queue_observer.json" || entry.name === "observers.json",
  );
  if (mappingEntry === undefined) return refusal("no reviewed queue observer mapping in bundle");
  const mapping = parseObserverMapping(mappingEntry);
  if (mapping === null) return refusal("reviewed queue observer mapping failed strict validation");
  const custody = parseObserverCustody(input.entries.find((entry) => entry.name === "queue_observer_review.json"));
  if (custody === null) return refusal("no signed review custody entry accompanies the mapping");

  const normalized = input.executableDigest.startsWith("sha256:")
    ? input.executableDigest.slice(7)
    : input.executableDigest;
  if (!SHA256_HEX.test(normalized)) return refusal(`executable digest is not canonical: ${normalized.slice(0, 80)}`);
  if (mapping.executable_sha256 !== normalized) {
    return refusal(`mapping executable digest mismatch: reviewed ${mapping.executable_sha256}, actual ${normalized}`);
  }
  if (!SHA256_HEX.test(input.programSha256)) {
    return refusal(`packaged observer program digest is unavailable: ${input.programSha256.slice(0, 80)}`);
  }
  if (mapping.observer_sha256 !== input.programSha256) {
    return refusal(
      `mapping observer digest mismatch: reviewed ${mapping.observer_sha256}, actual packaged observer ${input.programSha256}`,
    );
  }
  const mappingSha256 = sha256Hex(mappingEntry.data);
  if (custody.artifact_sha256 !== mappingSha256) {
    return refusal(
      `custody artifact digest mismatch: reviewed ${custody.artifact_sha256}, actual mapping bytes ${mappingSha256}`,
    );
  }
  if (input.trust.custodian_keys.size === 0) {
    return refusal("no trusted custodian keys are provisioned in the packaged guest image");
  }
  const verification = verifyReviewCustody(custody, input.trust, {
    executable_sha256: normalized,
    program_sha256: input.programSha256,
    artifact_sha256: mappingSha256,
    approval_reason: mapping.approval_reason,
  });
  if (!verification.valid) return refusal(verification.reason ?? "review custody was refused");

  return { observer: createFileSpoolObserver(mapping, mappingSha256), refusal_reason: null };
}

interface QueueRecord {
  readonly key: string;
  readonly connection: string;
  readonly message: string;
  readonly request_seq: number;
  readonly bytes: number;
  readonly sha256: string;
  readonly state: DispositionState;
}

interface MessageLifecycle {
  accepted: QueueRecord | null;
  /** Non-final retained observation; may be followed by at most one final state. */
  retained: QueueRecord | null;
  /** Final delivery or drop; never followed by another transition. */
  final: QueueRecord | null;
}

interface RetainedTransition {
  readonly observation: MessageDispositionObservation;
}

function createFileSpoolObserver(mapping: ReviewedObserverMapping, mappingSha256: string): CandidateQueueObserver {
  const tokenToState = new Map<string, DispositionState>();
  for (const state of D1_DISPOSITION_STATES) {
    for (const token of mapping.state_map[state]) tokenToState.set(token, state);
  }
  const history = new Map<string, RetainedTransition>();
  // One-way progression across observations: an observed message never vanishes,
  // a final state never changes or disappears, and a retained state may only
  // progress to a final state.
  const observedAccepted = new Map<string, QueueRecord>();
  const observedFinal = new Map<string, QueueRecord>();
  const observedRetained = new Map<string, QueueRecord>();
  let eventSequence = 0;

  const recordKey = (connection: string, message: string): string => `${connection}|${message}`;

  const enforceObservedHistory = (lifecycles: ReadonlyMap<string, MessageLifecycle>): void => {
    // The mapping declares append_only: a message once observed must still have
    // a lifecycle row. Deleting every row (and moving its payload) must fail
    // closed instead of shrinking the observed population.
    const indexed = new Set([...observedAccepted.keys(), ...observedRetained.keys(), ...observedFinal.keys()]);
    for (const key of indexed) {
      if (!lifecycles.has(key)) {
        throw new ObserverUnavailableError(`message ${key} disappeared from the candidate records`);
      }
    }
    for (const [key, lifecycle] of lifecycles) {
      const priorFinal = observedFinal.get(key);
      const priorRetained = observedRetained.get(key);
      const final = lifecycle.final;
      const retained = lifecycle.retained;
      if (priorFinal !== undefined) {
        if (final === null) {
          throw new ObserverUnavailableError(`message ${key} final state disappeared from the candidate records`);
        }
        if (
          final.state !== priorFinal.state ||
          final.request_seq !== priorFinal.request_seq ||
          final.bytes !== priorFinal.bytes ||
          final.sha256 !== priorFinal.sha256
        ) {
          throw new ObserverUnavailableError(`message ${key} final state changed after it was observed`);
        }
      }
      if (priorRetained !== undefined && retained === null && final === null) {
        throw new ObserverUnavailableError(`message ${key} retained state disappeared from the candidate records`);
      }
      if (priorRetained !== undefined && retained !== null && retained.request_seq !== priorRetained.request_seq) {
        throw new ObserverUnavailableError(`message ${key} retained state changed after it was observed`);
      }
    }
  };

  const commitObservedHistory = (lifecycles: ReadonlyMap<string, MessageLifecycle>): void => {
    for (const [key, lifecycle] of lifecycles) {
      if (lifecycle.accepted !== null) observedAccepted.set(key, lifecycle.accepted);
      if (lifecycle.final !== null) observedFinal.set(key, lifecycle.final);
      if (lifecycle.retained !== null) observedRetained.set(key, lifecycle.retained);
    }
  };

  const withPausedCandidate = async <T>(request: ObservationRequest, body: () => Promise<T>): Promise<T> => {
    const runtime = request.runtime;
    if (request.frozen || runtime === undefined) return await body();
    try {
      await runtime.pauseCandidate();
    } catch (error) {
      throw new ObserverUnavailableError(`candidate could not be paused: ${reasonOf(error)}`);
    }
    try {
      return await body();
    } finally {
      try {
        await runtime.resumeCandidate();
      } catch (error) {
        throw new ObserverResumeError(reasonOf(error));
      }
    }
  };

  const readRecords = async (request: ObservationRequest): Promise<readonly QueueRecord[]> => {
    const body = await readRegularFileBeneath(
      request.state_volume_dir,
      mapping.queue_records.path,
      MAX_QUEUE_RECORD_BYTES,
    );
    const records: QueueRecord[] = [];
    let offset = 0;
    while (offset < body.length) {
      const newline = body.indexOf(0x0a, offset);
      const end = newline < 0 ? body.length : newline;
      const lineBytes = end - offset;
      if (lineBytes > MAX_QUEUE_RECORD_LINE_BYTES) {
        throw new ObserverUnavailableError(`queue record line exceeds ${MAX_QUEUE_RECORD_LINE_BYTES} bytes`);
      }
      if (lineBytes > 0) {
        if (records.length >= MAX_QUEUE_RECORDS) {
          throw new ObserverUnavailableError(`queue record count exceeds ${MAX_QUEUE_RECORDS}`);
        }
        let raw: unknown;
        try {
          raw = JSON.parse(body.toString("utf8", offset, end));
        } catch {
          throw new ObserverUnavailableError("queue record is not valid JSON");
        }
        const record = strictObject(raw, "queue record", Object.values(mapping.record_fields));
        const connection = validateId(record[mapping.record_fields.connection], "connection_id");
        const message = validateId(record[mapping.record_fields.message], "message_id");
        const requestSeq = validatePositive(record[mapping.record_fields.request_seq], "request_seq");
        const bytes = validatePositive(record[mapping.record_fields.payload_bytes], "payload_bytes");
        const digest = record[mapping.record_fields.payload_sha256];
        if (typeof digest !== "string" || !SHA256_HEX.test(digest)) {
          throw new ObserverUnavailableError("queue record payload digest is missing or not canonical");
        }
        const token = validateId(record[mapping.record_fields.state], "state");
        const mapped = tokenToState.get(token);
        if (mapped === undefined) {
          throw new ObserverUnavailableError(`queue record state '${token}' is not in the reviewed state map`);
        }
        records.push({
          key: recordKey(connection, message),
          connection,
          message,
          request_seq: requestSeq,
          bytes,
          sha256: digest,
          state: mapped,
        });
      }
      offset = newline < 0 ? body.length : newline + 1;
    }
    if (records.length === 0) throw new ObserverUnavailableError("queue records file contains no records");
    return records;
  };

  const readPayloadLocation = async (
    request: ObservationRequest,
    location: ReviewedPayloadLocation,
    label: string,
  ): Promise<Set<string>> => {
    const payloads = new Set<string>();
    const base = [...location.path];
    const entries = await listDirectoryBeneath(request.state_volume_dir, base, { max_entries: MAX_PAYLOAD_FILES });
    if (entries === null) return payloads;
    let connectionCount = 0;
    for (const connectionEntry of entries) {
      if (!connectionEntry.is_directory) {
        throw new ObserverUnavailableError(`${label} entry is not a connection directory: ${connectionEntry.name}`);
      }
      if (++connectionCount > MAX_PAYLOAD_FILES) {
        throw new ObserverUnavailableError(`${label} connection count exceeds ${MAX_PAYLOAD_FILES}`);
      }
      const connection = validateId(connectionEntry.name, "connection_id");
      const files = await listDirectoryBeneath(request.state_volume_dir, [...base, connection], {
        max_entries: MAX_PAYLOAD_FILES,
      });
      if (files === null) throw new ObserverUnavailableError(`${label} connection directory disappeared`);
      for (const file of files) {
        if (!file.is_file) throw new ObserverUnavailableError(`${label} entry is not a regular file: ${file.name}`);
        const message = file.name.endsWith(".bin") ? file.name.slice(0, -".bin".length) : "";
        if (message.length === 0) {
          throw new ObserverUnavailableError(`${label} file name is not '<message_id>.bin': ${file.name}`);
        }
        if (payloads.size >= MAX_PAYLOAD_FILES) {
          throw new ObserverUnavailableError(`${label} file count exceeds ${MAX_PAYLOAD_FILES}`);
        }
        const key = recordKey(connection, validateId(message, "message_id"));
        if (payloads.has(key)) throw new ObserverUnavailableError(`${label} holds duplicate payload for ${key}`);
        payloads.add(key);
      }
    }
    return payloads;
  };

  const readPayload = async (
    request: ObservationRequest,
    location: ReviewedPayloadLocation,
    key: string,
  ): Promise<Buffer> => {
    const separator = key.indexOf("|");
    if (separator <= 0 || separator === key.length - 1) throw new ObserverUnavailableError("invalid payload identity");
    const connection = validateId(key.slice(0, separator), "connection_id");
    const message = validateId(key.slice(separator + 1), "message_id");
    return await readRegularFileBeneath(
      request.state_volume_dir,
      [...location.path, connection, `${message}.bin`],
      MAX_PAYLOAD_FILE_BYTES,
    );
  };

  /** Reconstructs each message's lifecycle from its validated transition history. */
  const reconstruct = (records: readonly QueueRecord[]): Map<string, MessageLifecycle> => {
    const lifecycles = new Map<string, MessageLifecycle>();
    for (const record of records) {
      const lifecycle = lifecycles.get(record.key) ?? { accepted: null, retained: null, final: null };
      if (record.state === "accepted") {
        if (lifecycle.accepted !== null || lifecycle.retained !== null || lifecycle.final !== null) {
          throw new ObserverUnavailableError(`message ${record.key} acceptance is duplicated or follows a transition`);
        }
        lifecycle.accepted = record;
      } else if (record.state === "retained") {
        // One-way: retained may follow acceptance once and may still progress to
        // exactly one final delivery/drop, but never regress or repeat.
        if (lifecycle.retained !== null || lifecycle.final !== null) {
          throw new ObserverUnavailableError(`message ${record.key} retained transition is repeated or follows a final state`);
        }
        lifecycle.retained = record;
      } else {
        if (lifecycle.final !== null) {
          throw new ObserverUnavailableError(
            `message ${record.key} has more than one final transition (${lifecycle.final.state} then ${record.state})`,
          );
        }
        lifecycle.final = record;
      }
      lifecycles.set(record.key, lifecycle);
    }
    for (const [key, lifecycle] of lifecycles) {
      const last = lifecycle.final ?? lifecycle.retained;
      if (lifecycle.accepted === null && last?.state !== "dropped") {
        throw new ObserverUnavailableError(
          `message ${key} has a transition but was never accepted as an allowed send-time drop`,
        );
      }
      for (const transition of [lifecycle.retained, lifecycle.final]) {
        if (
          transition !== null &&
          lifecycle.accepted !== null &&
          transition.request_seq !== lifecycle.accepted.request_seq
        ) {
          throw new ObserverUnavailableError(`message ${key} transition does not match its accepted request`);
        }
      }
    }
    return lifecycles;
  };

  /** Current buffered bytes per connection: only messages still held count. */
  const bufferedByConnection = (
    lifecycles: ReadonlyMap<string, MessageLifecycle>,
  ): { readonly connection: string; readonly bytes: number }[] => {
    const totals = new Map<string, number>();
    for (const lifecycle of lifecycles.values()) {
      const record = lifecycle.accepted;
      if (record === null) continue;
      const terminal = lifecycle.final;
      if (terminal !== null) {
        if (!totals.has(record.connection)) totals.set(record.connection, 0);
        continue;
      }
      totals.set(record.connection, (totals.get(record.connection) ?? 0) + record.bytes);
    }
    return [...totals.entries()].map(([connection, bytes]) => ({ connection, bytes }));
  };

  const observeOnce = async (
    request: ObservationRequest,
  ): Promise<{
    readonly records: readonly QueueRecord[];
    readonly lifecycles: Map<string, MessageLifecycle>;
    readonly closed_at: number;
  }> =>
    await withPausedCandidate(request, async () => {
      // Freeze: the record file is read into one immutable buffer while the
      // candidate is paused (or provably stopped), then the sink is enumerated.
      const records = await readRecords(request);
      const lifecycles = reconstruct(records);
      enforceObservedHistory(lifecycles);
      const queuePayloadKeys = await readPayloadLocation(request, mapping.queue_payloads, "queue payload store");
      const outboxPayloadKeys = await readPayloadLocation(request, mapping.delivery_outbox, "consumer delivery outbox");

      for (const record of records) {
        const expected = request.trusted.expected.get(record.key);
        if (
          expected === undefined ||
          expected.bytes !== record.bytes ||
          expected.sha256 !== record.sha256 ||
          expected.send_seq !== record.request_seq
        ) {
          throw new ObserverUnavailableError(`queue transition lacks matching trusted send provenance: ${record.key}`);
        }
      }

      const heldKeys = new Set<string>();
      const deliveredKeys = new Set<string>();
      for (const [key, lifecycle] of lifecycles) {
        const accepted = lifecycle.accepted;
        if (accepted === null) continue;
        if (lifecycle.final === null) heldKeys.add(key);
        if (lifecycle.final?.state === "delivered") deliveredKeys.add(key);
      }

      for (const key of queuePayloadKeys) {
        if (!heldKeys.has(key)) {
          throw new ObserverUnavailableError(`queue payload store contains a non-held message: ${key}`);
        }
        const accepted = lifecycles.get(key)?.accepted;
        const expected = request.trusted.expected.get(key);
        if (accepted === null || accepted === undefined || expected === undefined) {
          throw new ObserverUnavailableError(`held queue payload has no accepted trusted send: ${key}`);
        }
        const payload = await readPayload(request, mapping.queue_payloads, key);
        const payloadSha256 = sha256Hex(payload);
        if (
          payload.length !== accepted.bytes ||
          payloadSha256 !== accepted.sha256 ||
          payload.length !== expected.bytes ||
          payloadSha256 !== expected.sha256
        ) {
          throw new ObserverUnavailableError(`held queue payload does not match the accepted trusted send: ${key}`);
        }
      }
      for (const key of heldKeys) {
        if (!queuePayloadKeys.has(key)) {
          throw new ObserverUnavailableError(`held queue message has no payload in the reviewed queue store: ${key}`);
        }
      }
      for (const key of queuePayloadKeys) {
        if (!lifecycles.has(key)) {
          throw new ObserverUnavailableError(`queue payload store holds bytes with no lifecycle record: ${key}`);
        }
      }

      // A delivered transition is verified against both the reviewed consumer
      // outbox bytes and the receipt retained from the actual D1 read boundary.
      for (const key of outboxPayloadKeys) {
        if (!deliveredKeys.has(key)) {
          throw new ObserverUnavailableError(`consumer delivery outbox contains an unselected message: ${key}`);
        }
        const receipt = request.trusted.consumed.get(key);
        const expected = request.trusted.expected.get(key);
        if (receipt === undefined || expected === undefined) {
          throw new ObserverUnavailableError(`consumer delivery outbox bytes lack an exact trusted read receipt: ${key}`);
        }
        const payload = await readPayload(request, mapping.delivery_outbox, key);
        const payloadSha256 = sha256Hex(payload);
        if (
          payload.length !== expected.bytes ||
          payloadSha256 !== expected.sha256 ||
          receipt.content_verified !== true ||
          receipt.bytes !== payload.length ||
          receipt.sha256 !== payloadSha256 ||
          receipt.payload_base64 !== payload.toString("base64")
        ) {
          throw new ObserverUnavailableError(`consumer delivery outbox bytes lack an exact trusted read receipt: ${key}`);
        }
      }
      for (const key of deliveredKeys) {
        // A delivered message only needs its retained read receipt to remain
        // valid: the candidate is allowed to remove the outbox file after
        // delivery. A file that is still present is byte-compared above.
        const lifecycle = lifecycles.get(key);
        const terminal = lifecycle?.final;
        const receipt = request.trusted.consumed.get(key);
        const accepted = lifecycle?.accepted;
        const expected = request.trusted.expected.get(key);
        if (
          lifecycle === undefined ||
          terminal === null ||
          terminal === undefined ||
          receipt === undefined ||
          accepted === null ||
          accepted === undefined ||
          expected === undefined
        ) {
          throw new ObserverUnavailableError(`delivered transition lacks complete accepted/read provenance: ${key}`);
        }
        validateId(receipt.process_session_id, "receipt.process_session_id");
        const receiptReadSeq = validatePositive(receipt.read_seq, "receipt.read_seq");
        const receiptSendSeq = validatePositive(receipt.send_seq, "receipt.send_seq");
        const receiptTime = validateNat(receipt.observed_monotonic_ms, "receipt.observed_monotonic_ms");
        const receiptBytes = validateNat(receipt.bytes, "receipt.bytes");
        if (
          receipt.content_verified !== true ||
          receipt.attempt_id !== request.attempt_id ||

          receipt.connection_id !== terminal.connection ||
          receipt.message_id !== terminal.message ||
          receiptSendSeq !== accepted.request_seq ||
          receiptReadSeq <= receiptSendSeq ||
          receiptBytes !== terminal.bytes ||
          receiptBytes !== expected.bytes ||
          receipt.sha256 !== expected.sha256 ||
          receiptTime > request.now()
        ) {
          throw new ObserverUnavailableError(
            `consumer outbox receipt does not match the accepted send and delivered transition for ${key}`,
          );
        }
      }
      if (request.final) {
        for (const key of request.trusted.expected.keys()) {
          if (!lifecycles.has(key)) {
            throw new ObserverUnavailableError(`final observation is missing a queue record for trusted send ${key}`);
          }
        }
      }

      if (request.final) {
        for (const [key, lifecycle] of lifecycles) {
          if (lifecycle.final === null && lifecycle.retained === null) {
            throw new ObserverUnavailableError(
              `final observation: message ${key} was accepted but has no final or retained transition`,
            );
          }
        }
      }
      commitObservedHistory(lifecycles);
      return { records, lifecycles, closed_at: request.now() };
    });

  // Persistent accepting-session index; the first accepted observation wins so a
  // terminal seen after a restart keeps the accepting session.
  const acceptedSessions = new Map<string, string>();

  const retainTransitions = (
    request: ObservationRequest,
    lifecycles: ReadonlyMap<string, MessageLifecycle>,
    closedAt: number,
  ): void => {
    const currentSession = validateId(request.process_session_id, "process_session_id");
    for (const lifecycle of lifecycles.values()) {
      for (const record of [lifecycle.accepted, lifecycle.retained, lifecycle.final]) {
        if (record === null) continue;
        const session = acceptedSessions.get(record.key) ?? currentSession;
        if (record.state === "accepted" && !acceptedSessions.has(record.key)) {
          acceptedSessions.set(record.key, session);
        }
        // A transition identity is the exact (message, request sequence, state) it
        // describes: re-reading an unchanged row must not mint a new event.
        const identity = `${record.key}|${record.request_seq}|${record.state}`;
        const existing = history.get(identity);
        if (existing !== undefined) {
          if (existing.observation.bytes !== record.bytes) {
            throw new ObserverUnavailableError(`retained transition ${identity} changed its byte count`);
          }
          continue;
        }
        eventSequence += 1;
        const base = {
          attempt_id: validateId(request.attempt_id, "attempt_id"),
          process_session_id: session,
          event_seq: eventSequence,
          request_seq: record.request_seq,
          connection_id: validateId(record.connection, "connection_id"),
          message_id: validateId(record.message, "message_id"),
          bytes: record.bytes,
          observed_monotonic_ms: validateNat(closedAt, "observed_monotonic_ms"),
        };
        const observation: MessageDispositionObservation =
          record.state === "retained"
            ? Object.freeze({
                ...base,
                state: "retained" as const,
                buffer_observation_id: validateId(request.observation_id, "observation_id"),
              })
            : Object.freeze({ ...base, state: record.state });
        history.set(identity, Object.freeze({ observation }));
      }
    }
  };

  return {
    mechanism: "file_spool",
    mapping_sha256: mappingSha256,
    async readConsumerOutbox(
      stateVolumeDir: string,
      connectionId: string,
      messageId: string,
    ): Promise<Buffer> {
      const connection = validateId(connectionId, "connection_id");
      const message = validateId(messageId, "message_id");
      return await readRegularFileBeneath(
        stateVolumeDir,
        [...mapping.delivery_outbox.path, connection, `${message}.bin`],
        MAX_PAYLOAD_FILE_BYTES,
      );
    },

    async observeBuffers(request: ObservationRequest): Promise<ConnectionBufferSnapshot> {
      validateId(request.observation_id, "observation_id");
      const { lifecycles, closed_at } = await observeOnce(request);
      retainTransitions(request, lifecycles, closed_at);
      return Object.freeze({
        attempt_id: validateId(request.attempt_id, "attempt_id"),
        process_session_id: validateId(request.process_session_id, "process_session_id"),
        observation_id: validateId(request.observation_id, "observation_id"),
        observed_monotonic_ms: validateNat(closed_at, "observed_monotonic_ms"),
        complete: true,
        connection_buffers: Object.freeze(
          bufferedByConnection(lifecycles)
            .sort((left, right) => left.connection.localeCompare(right.connection))
            .map((entry) => ({
              connection_id: validateId(entry.connection, "connection_id"),
              buffered_bytes: validateNat(entry.bytes, "buffered_bytes"),
            })),
        ),
      });
    },

    async observeDispositions(request: ObservationRequest): Promise<readonly MessageDispositionObservation[]> {
      validateId(request.observation_id, "observation_id");
      const { lifecycles, closed_at } = await observeOnce(request);
      retainTransitions(request, lifecycles, closed_at);
      return Object.freeze([...history.values()].map((entry) => entry.observation));
    },
  };
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
