/**
 * scripts/evals/l3/runtime/guest/controller.ts
 *
 * Autonomous in-guest controller.
 *
 * It runs inside the fresh guest with no host channel. It owns the offline
 * build, the candidate container, the trusted stubs, and the bounded protocol
 * served to the trusted in-guest driver over a permission-restricted Unix
 * socket. Every request payload and every effect is validated strictly before it
 * is accepted or reported.
 *
 * The controller is also the only independent observer of the candidate
 * boundary: it records per-message dispositions from its own channel, snapshots
 * the buffer it can actually see, and reports `null` wherever no independent
 * observation exists instead of inventing zeroes.
 */

import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  MAX_FRAME_BYTES,
  MAX_LIST_ENTRIES,
  validateId,
  validateNat,
  validateOverloadPayload,
  validateOverloadResult,
} from "../../contracts.js";
import {
  CONTROLLER_OPERATIONS,
  isObservationFrame,
  parseControllerRequest,
  validatePayload,
  validateResult,
  type ControllerOperation,
  type ObservationKind,
} from "./protocol.js";
import type { GuestRuntime, GuestLimits } from "./runtime.js";
import type { AttemptInvocation } from "./invocation.js";
import type { BundleEntry } from "../bundle.js";
import type { AuxiliaryChannel } from "./auxiliary.js";
import { createBundleStageReader, type BundleStageReader, type FrozenStageManifestEntry } from "./stage-reader.js";
import {
  ObserverResumeError,
  ObserverUnavailableError,
  admitCandidateObserver,
  type CandidateQueueObserver,
  type ConnectionBufferSnapshot,
  type ConsumerReceipt,
  type MessageDispositionObservation,
  type TrustedWorkloadEvidence,
} from "./queue-observer.js";
import { encodeEvidence, type EvidenceItem, type EvidenceKind } from "./evidence.js";
import type { ReviewTrustAnchor } from "./trust.js";
const MAX_EVENTS_BYTES = 81_788_928;
/** One accepted + one terminal event per exchange; the session cap is 32,768. */
const MAX_DISPOSITION_EVENTS = 65_536;
const MAX_TRACKED_CONNECTIONS = 64;
const RESPONSE_DEADLINE_MS = 5_000;

export interface ProviderStubLike {
  handleDebit(payload: Record<string, unknown>): unknown;
  handleLookup(payload: Record<string, unknown>): unknown;
  handleSettlement(payload: Record<string, unknown>): unknown;
}

export interface SummarizerStubLike {
  handleSummarize(
    payload: Record<string, unknown>,
    options?: { readonly signal?: AbortSignal },
  ): Promise<unknown>;
}

export interface ControllerPorts {
  readonly runtime: GuestRuntime;
  readonly nowMs: () => number;
  readonly stateDir: string;
  /** Absolute workflow ceiling (build + run) from the frozen manifest. */
  readonly deadlineAtMs: number;
  readonly attempt: AttemptInvocation;
  readonly limits: GuestLimits;
  /** Reviewer-approved evidence budget; absent uses the disabled production cap. */
  readonly evidenceMaxBytes?: number;
  readonly bundle: readonly BundleEntry[];
  readonly buildContext?: { readonly workspace_ref: string; readonly offline_bundle_ref: string };
  readonly drivers?: CaseDrivers;
  readonly scheduler?: unknown;
  readonly providerStub?: ProviderStubLike;
  readonly summarizerStub?: SummarizerStubLike;
  readonly auxChannel?: AuxiliaryChannel;
  /** One-way console phase marker; the host times phases from its own arrival clock. */
  readonly emitStatus?: (phase: string) => void;
  /**
   * Review custody for per-artifact observers, supplied from the packaged guest
   * image. Absent means no observer can be admitted.
   */
  readonly observerTrust?: {
    readonly anchor: ReviewTrustAnchor;
    readonly program_sha256: string;
  };
  /** Abort unfinished relay effects before final evidence is snapshotted. */
  readonly settleStubEffects?: () => Promise<void>;
  /** Relay/stub observations retained after unfinished effects are cancelled. */
  readonly collectStubObservations?: () => readonly unknown[];
  /** Review custody for tenant stage correspondence, same provisioned keys. */
  readonly stageTrust?: {
    readonly anchor: ReviewTrustAnchor;
    readonly program_sha256: string;
  };
}

export type CaseDriverConstructor = new (...args: unknown[]) => {
  runBaseSchedule?(): Promise<unknown>;
  runAdverseSchedule?(): Promise<unknown>;
  runChangedConstraintSchedule?(): Promise<unknown>;
  runNegativeOutcomeControl?(): Promise<unknown>;
  runSchedule?(): Promise<unknown>;
  runWorkload?(): Promise<unknown>;
};

export interface CaseDrivers {
  readonly PaymentCaseDriver?: CaseDriverConstructor;
  readonly TenantCaseDriver?: CaseDriverConstructor;
  readonly OverloadCaseDriver?: CaseDriverConstructor;
}

export interface ControllerResponse {
  readonly version: 1;
  readonly seq: number;
  readonly ok: boolean;
  readonly result?: Record<string, unknown>;
  readonly error?: { readonly code: string; readonly message: string };
  readonly [key: string]: unknown;
}

interface DispositionEvent {
  readonly attempt_id: string;
  readonly process_session_id: string;
  readonly event_seq: number;
  readonly request_seq: number;
  readonly connection_id: string;
  readonly message_id: string;
  readonly bytes: number;
  readonly observed_monotonic_ms: number;
  readonly state: "accepted" | "delivered" | "dropped";
}

interface EnvelopeIdentity {
  readonly seq: number;
  readonly connection_id: string;
  readonly message_id: string;
}
interface CandidateOutputEvidenceRange {
  readonly process_session_id: string;
  readonly artifact_offset: number;
  readonly stream_mask: Buffer;
  stream_offset: number;
  capture_order: number;
  bytes: number;
  exported_bytes: number;
}

export class ControllerApp {
  private readonly ports: ControllerPorts;
  private readonly eventsPath: string;
  private stageReader: BundleStageReader | null = null;
  private eventsBytes = 0;
  private sequence = 0;
  private readonly dispositions: DispositionEvent[] = [];
  private dispositionSeq = 0;
  private readonly liveConnections = new Set<string>();
  private readonly pendingBySeq = new Map<number, { connection_id: string; bytes: number; processSessionId: string }>();
  private readonly bufferObservationIds = new Set<string>();
  private readonly snapshots = new Map<string, readonly FrozenStageManifestEntry[]>();
  private lastLivePid = 0;
  private lastLiveRss = 0;
  private snapshotCounter = 0;
  private queueObserver: CandidateQueueObserver | null = null;
  private observerRefusal: string | null = null;
  /** A resume failure leaves the candidate paused; the workflow must stop. */
  private fatalResumeFailure: Error | null = null;
  private finalObservation: {
    readonly attempted: boolean;
    readonly complete: boolean;
    readonly reason: string | null;
    readonly records: number;
  } = { attempted: false, complete: false, reason: "not attempted", records: 0 };
  private readonly expectedPayloads = new Map<string, { bytes: number; sha256: string; send_seq: number }>();
  private readonly consumedReceipts = new Map<string, ConsumerReceipt>();
  /**
   * The independently established evidence set the drivers act on. Retained
   * verbatim; the transport ledger is kept as a separately labelled kind.
   */
  private readonly evidenceBuffers: unknown[] = [];
  private readonly evidenceAuxiliary: unknown[] = [];
  private readonly evidenceStubs: unknown[] = [];
  private readonly evidenceProcess: unknown[] = [];
  private readonly evidenceTermination: unknown[] = [];
  private readonly evidenceRestarts: unknown[] = [];
  private readonly evidencePhases: unknown[] = [];
  private readonly evidenceRawOutput: unknown[] = [];
  private readonly candidateOutputRanges = new Map<string, CandidateOutputEvidenceRange>();
  private readonly evidenceMarkers: unknown[] = [];
  private dispositionHistory: readonly MessageDispositionObservation[] = [];
  private verdictValue: unknown = null;
  private evidenceExportFailure: string | null = null;
  private readonly admissionRefusals: string[] = [];
  private outputBytes: number | null = null;
  private outputTruncated = false;
  constructor(ports: ControllerPorts) {
    this.ports = ports;
    this.eventsPath = path.join(ports.stateDir, "events.jsonl");
  }

  /** Exact payload facts the trusted workload handed to the candidate. */
  private trustedWorkload(): TrustedWorkloadEvidence {
    return { expected: this.expectedPayloads, consumed: this.consumedReceipts };
  }

  private recordEvidence(kind: EvidenceKind, body: unknown): void {
    switch (kind) {
      case "buffer_snapshot":
        this.evidenceBuffers.push(body);
        return;
      case "auxiliary_observation":
        this.evidenceAuxiliary.push(body);
        return;
      case "stub_observation":
        this.evidenceStubs.push(body);
        return;
      case "process_observation":
        this.evidenceProcess.push(body);
        return;
      case "termination":
        this.evidenceTermination.push(body);
        return;
      case "restart":
        this.evidenceRestarts.push(body);
        return;
      case "phase":
        this.evidencePhases.push(body);
        return;
      case "raw_output_chunk":
        this.evidenceRawOutput.push(body);
        return;
      case "output_marker":
        this.evidenceMarkers.push(body);
        return;
      default:
        return;
    }
  }

  /**
   * Appends raw guest output bytes into the bounded retained `output.log`.
   */
  private async appendOutput(body: Buffer | string): Promise<{ readonly offset: number; readonly bytes: number }> {
    const bytes = typeof body === "string" ? Buffer.from(body, "utf8") : body;
    const outputPath = path.join(this.ports.stateDir, "output.log");
    if (this.outputBytes === null) {
      const info = await stat(outputPath).catch(() => null);
      this.outputBytes = info === null ? 0 : info.size;
    }
    const offset = this.outputBytes;
    if (bytes.length === 0) return { offset, bytes: 0 };
    const cap = this.ports.limits.build.max_output_bytes + this.ports.limits.run.max_output_bytes;
    const room = cap - this.outputBytes;
    if (room <= 0) {
      this.outputTruncated = true;
      return { offset, bytes: 0 };
    }
    const slice = bytes.length <= room ? bytes : bytes.subarray(0, room);
    if (slice.length < bytes.length) this.outputTruncated = true;
    this.outputBytes += slice.length;
    await appendFile(outputPath, slice, { mode: 0o600 });
    return { offset, bytes: slice.length };
  }
  private async retainRawOutput(
    chunks: readonly {
      readonly process_session_id: string;
      readonly stream: "combined";
      readonly stream_offset: number;
      readonly capture_order: number;
      readonly bytes: Buffer;
      readonly stream_mask: Buffer;
    }[],
  ): Promise<void> {
    for (const chunk of chunks) {
      const written = await this.appendOutput(chunk.bytes);
      if (written.bytes === 0) continue;
      let range = this.candidateOutputRanges.get(chunk.process_session_id);
      if (range === undefined) {
        const maxSessions = this.ports.attempt.case_id === "payment" ? 2 : 1;
        if (this.candidateOutputRanges.size >= maxSessions) {
          throw new Error("candidate output has more process sessions than the frozen case lifecycle permits");
        }
        range = {
          process_session_id: chunk.process_session_id,
          artifact_offset: written.offset,
          stream_mask: Buffer.alloc(Math.ceil(this.ports.limits.run.max_output_bytes / 8)),
          stream_offset: chunk.stream_offset,
          capture_order: chunk.capture_order,
          bytes: 0,
          exported_bytes: 0,
        };
        this.candidateOutputRanges.set(chunk.process_session_id, range);
      }
      if (
        range.stream_offset + range.bytes !== chunk.stream_offset ||
        range.artifact_offset + range.exported_bytes !== written.offset
      ) {
        throw new Error("candidate output session bytes are not contiguous in the retained artifact");
      }
      for (let index = 0; index < written.bytes; index += 1) {
        if ((chunk.stream_mask[index >>> 3] & (1 << (index & 7))) !== 0) {
          const bit = range.exported_bytes + index;
          range.stream_mask[bit >>> 3] |= 1 << (bit & 7);
        }
      }
      range.bytes += chunk.bytes.length;
      range.exported_bytes += written.bytes;
    }
  }

  private eventsBudget(): number {
    return this.ports.evidenceMaxBytes ?? MAX_EVENTS_BYTES;
  }

  private async appendEvent(
    kind: ObservationKind,
    subject: string,
    value: number,
    flag: boolean,
  ): Promise<void> {
    const frame = `${JSON.stringify({
      version: 1,
      observation: { kind, at_ms: this.ports.nowMs(), subject, value, flag },
    })}\n`;
    const bytes = Buffer.byteLength(frame, "utf8");
    if (this.eventsBytes + bytes > this.eventsBudget()) {
      throw new Error("controller event log exceeded its byte ceiling");
    }
    this.eventsBytes += bytes;
    await appendFile(this.eventsPath, frame, { mode: 0o600 });
  }

  /** Validates the request payload, performs the operation, validates the effect. */
  async dispatch(raw: unknown): Promise<ControllerResponse> {
    let operation: ControllerOperation;
    let seq: number;
    let payload: Record<string, unknown>;
    try {
      const request = parseControllerRequest(raw);
      operation = request.operation as ControllerOperation;
      seq = request.seq;
      payload = request.payload;
    } catch (error) {
      return {
        version: 1,
        seq: 1,
        ok: false,
        error: { code: "INVALID_REQUEST", message: reasonOf(error) },
      };
    }

    try {
      const result = await this.execute(operation, payload);
      const checked = validateResult(operation, result);
      if (operation === "exchange_candidate") {
        const { raw_output: _rawOutput, ...wireResult } = checked;
        return { version: 1, seq, ok: true, result: wireResult };
      }
      return { version: 1, seq, ok: true, result: checked };
    } catch (error) {
      if (error instanceof ObserverResumeError || operation === "resume_candidate") {
        this.fatalResumeFailure = error instanceof Error ? error : new Error(String(error));
      }
      return {
        version: 1,
        seq,
        ok: false,
        error: { code: "UNAVAILABLE", message: reasonOf(error) },
      };
    }
  }

  private async execute(
    operation: ControllerOperation,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const runtime = this.ports.runtime;
    switch (operation) {
      case "build": {
        await this.appendEvent("build_started", "workspace", 0, false);
        const effect = await runtime.build({
          workspace_ref: payload.workspace_ref as string,
          offline_bundle_ref: payload.offline_bundle_ref as string,
          build_spec_sha256: payload.build_spec_sha256 as string,
        });
        if (effect.stream_capture_bytes > 0) {
          const output = await readFile(path.join(this.ports.stateDir, "output.log"));
          const bytes = output.subarray(0, effect.stream_capture_bytes);
          if (bytes.length !== effect.stream_capture_bytes) {
            throw new Error("build raw output is shorter than its typed stream capture");
          }
          this.recordEvidence("raw_output_chunk", {
            process_session_id: `build-${effect.output_container_id}-${effect.output_container_pid}`,
            stream: "combined",
            stream_mask_base64: effect.stream_mask_base64,
            stream_offset: 0,
            capture_order: 0,
            artifact_offset: 0,
            bytes: bytes.length,
            exported_bytes: bytes.length,
            sha256: createHash("sha256").update(bytes).digest("hex"),
          });
        }
        if (effect.cleanup_failures > 0) {
          // Container cleanup is part of the stage: its failure is recorded, not
          // swallowed, because a surviving container keeps the guest dirty.
          this.recordEvidence("phase", {
            phase: "build_cleanup_failed",
            failures: effect.cleanup_failures,
            at_ms: this.ports.nowMs(),
          });
        }
        await this.appendEvent("build_finished", "build", effect.exit_code, effect.output_truncated);
        return { ...effect };
      }
      case "run": {
        const imageId = payload.image_id as string;
        // Admission is decided from facts the controller recomputes for itself,
        // and it happens BEFORE the candidate exists. A bundle that declares an
        // observer it cannot substantiate refuses the launch instead of running
        // unobserved and calling the result verified.
        const mappingEntry = this.ports.bundle.find(
          (entry) => entry.name === "queue_observer.json" || entry.name === "observers.json",
        );
        const trust = this.ports.observerTrust;
        if (mappingEntry !== undefined) {
          if (trust === undefined) {
            this.observerRefusal = "no trusted review custody is provisioned for the observer";
            this.admissionRefusals.push(this.observerRefusal);
            await this.appendEvent("observation_unavailable", "observer", 0, true);
            throw new Error(this.observerRefusal);
          }
          const admission = admitCandidateObserver({
            entries: this.ports.bundle,
            executableDigest: imageId,
            programSha256: trust.program_sha256,
            trust: trust.anchor,
          });
          if (admission.observer === null) {
            this.observerRefusal = admission.refusal_reason ?? "observer admission was refused";
            this.admissionRefusals.push(this.observerRefusal);
            await this.appendEvent("observation_unavailable", "observer", 0, true);
            throw new Error(this.observerRefusal);
          }
          this.queueObserver = admission.observer;
          this.observerRefusal = null;
        }
        // Stage correspondence custody is bound to the same executable identity.
        this.stageReader = createBundleStageReader(
          this.ports.bundle,
          path.join(this.ports.stateDir, "snapshots"),
          this.ports.stageTrust === undefined
            ? {
                anchor: {
                  domain: "l3-stage-correspondence-review-v1",
                  run_id: this.ports.attempt.run_id,
                  attempt_id: this.ports.attempt.attempt_id,
                  custodian_keys: new Map(),
                  now_epoch_ms: () => this.ports.nowMs(),
                },
                executable_sha256: imageId,
                program_sha256: "",
              }
            : {
                anchor: this.ports.stageTrust.anchor,
                executable_sha256: imageId.startsWith("sha256:") ? imageId.slice(7) : imageId,
                program_sha256: this.ports.stageTrust.program_sha256,
              },
        );
        const effect = await runtime.run(payload.entrypoint as string, payload.state_volume as string, imageId);
        if (runtime.candidateOutputTruncated?.() === true) this.outputTruncated = true;
        await this.retainRawOutput(runtime.drainCandidateOutput?.() ?? []);
        this.lastLivePid = effect.pid;
        this.lastLiveRss = 0;
        return { ...effect };
      }
      case "exchange_candidate": {
        const frame = payload.frame as string;
        const deadline =
          typeof payload.deadline_at_ms === "number"
            ? (payload.deadline_at_ms as number)
            : this.ports.nowMs() + (payload.deadline_ms as number);
        const identity = this.envelopeIdentity(frame);
        let written: { observed_bytes: number };
        written = await runtime.writeCandidate(frame, deadline);
        const connection = this.envelopeConnection(frame);
        if (connection !== null && this.liveConnections.size < MAX_TRACKED_CONNECTIONS) {
          this.liveConnections.add(connection.connection_id);
        }
        const trustedSend =
          identity !== null && connection?.operation === "send"
            ? this.trustedSendOf(frame, identity, payload.payload_bytes as number)
            : null;
        if (trustedSend !== null) {
          this.expectedPayloads.set(`${trustedSend.connection_id}|${trustedSend.message_id}`, {
            bytes: payload.payload_bytes as number,
            sha256: payload.payload_sha256 as string,
            send_seq: trustedSend.seq,
          });
        }
        let effect: Awaited<ReturnType<GuestRuntime["readCandidate"]>> | null = null;
        try {
          effect = await runtime.readCandidate(deadline);
        } finally {
          if (runtime.candidateOutputTruncated?.() === true) this.outputTruncated = true;
          await this.retainRawOutput([
            ...(effect?.raw_output ?? []),
            ...(runtime.drainCandidateOutput?.() ?? []),
          ]);
        }
        if (effect === null) throw new Error("candidate read completed without an effect");
        if (
          trustedSend !== null &&
          !effect.deadline_exceeded &&
          this.acceptedSendOf(trustedSend, effect.response_frame)
        ) {
          this.noteAccepted(trustedSend, payload.payload_bytes as number);
        }
        if (!effect.deadline_exceeded) {
          const receipts = await this.consumerReceiptsOf(frame, effect.response_frame, deadline);
          for (const [key, receipt] of receipts) this.consumedReceipts.set(key, receipt);
        }
        if (
          connection?.operation === "read" &&
          this.isClosedReadResult(frame, effect.response_frame)
        ) {
          this.noteConnectionClosed(connection.connection_id);
        }
        if (effect.raw_output_truncated === true) this.outputTruncated = true;
        // Candidate output is represented only by raw bytes above. The decoded
        // frame remains in the protocol ledger and is never duplicated in output.log.
        await this.appendEvent(
          "candidate_frame_in",
          "candidate",
          written.observed_bytes + effect.observed_bytes,
          effect.deadline_exceeded,
        );
        return {
          response_frame: effect.response_frame,
          observed_bytes: effect.observed_bytes,
          deadline_exceeded: effect.deadline_exceeded,
          raw_output: effect.raw_output ?? [],
          raw_output_truncated: effect.raw_output_truncated === true,
        };
      }
      case "observe_process": {
        const effect = await runtime.observeProcess();
        this.recordEvidence("process_observation", effect);
        await this.appendEvent("process_sample", "candidate", effect.rss_bytes, false);
        return { ...effect };
      }
      case "termination": {
        const effect = await runtime.termination();
        this.recordEvidence("termination", effect);
        return { ...effect, process_session_id: runtime.processSessionId() };
      }
      case "reset_state": {
        await runtime.resetState(payload.state_volume as string);
        if (runtime.candidateOutputTruncated?.() === true) this.outputTruncated = true;
        await this.retainRawOutput(runtime.drainCandidateOutput?.() ?? []);
        return { state_volume: payload.state_volume as string };
      }
      case "restart_candidate": {
        let effect: Awaited<ReturnType<GuestRuntime["restartCandidate"]>>;
        try {
          effect = await runtime.restartCandidate(payload.reason as string);
        } finally {
          if (runtime.candidateOutputTruncated?.() === true) this.outputTruncated = true;
          await this.retainRawOutput(runtime.drainCandidateOutput?.() ?? []);
        }
        this.recordEvidence("restart", { reason: payload.reason as string, restart_count: effect.restart_count });
        await this.appendEvent("restart", payload.reason as string, effect.restart_count, false);
        return { restart_count: effect.restart_count };
      }
      case "pause_candidate": {
        await runtime.pauseCandidate();
        this.recordEvidence("phase", { phase: "paused", at_ms: this.ports.nowMs() });
        await this.appendEvent("paused", "candidate", 0, false);
        return { state: "paused" };
      }
      case "resume_candidate": {
        await runtime.resumeCandidate();
        this.recordEvidence("phase", { phase: "resumed", at_ms: this.ports.nowMs() });
        await this.appendEvent("resumed", "candidate", 0, false);
        return { state: "running" };
      }
      case "stop_candidate": {
        const effect = await runtime.stopCandidate();
        await this.appendEvent("stopped", "candidate", effect.exit_code, effect.terminated);
        return { ...effect };
      }
      case "status": {
        const effect = await runtime.status();
        return { ...effect, process_session_id: runtime.processSessionId() };
      }
      default: {
        const unreachable: never = operation;
        throw new Error(`Unhandled operation: ${String(unreachable)}`);
      }
    }
  }

  /**
   * Candidate `read` IDs are only a cross-check. Receipt bytes come from the
   * reviewed consumer outbox and must match the trusted workload's sent bytes.
   */
  private acceptedSendOf(identity: EnvelopeIdentity, responseFrame: string): boolean {
    if (responseFrame.length === 0 || Buffer.byteLength(responseFrame, "utf8") > MAX_FRAME_BYTES) {
      return false;
    }
    let response: unknown;
    try {
      response = JSON.parse(responseFrame);
    } catch {
      return false;
    }
    if (typeof response !== "object" || response === null || Array.isArray(response)) return false;
    const envelope = response as Record<string, unknown>;
    if (
      envelope["version"] !== 1 ||
      envelope["seq"] !== identity.seq ||
      envelope["ok"] !== true ||
      typeof envelope["result"] !== "object" ||
      envelope["result"] === null ||
      Array.isArray(envelope["result"])
    ) return false;
    try {
      const result = validateOverloadResult("send", envelope["result"] as Record<string, unknown>);
      return "status" in result && result.status === "accepted" && result.message_id === identity.message_id;
    } catch {
      return false;
    }
  }

  private trustedSendOf(
    frame: string,
    identity: EnvelopeIdentity,
    actualBytes: number,
  ): EnvelopeIdentity | null {
    let raw: unknown;
    try {
      raw = JSON.parse(frame);
    } catch {
      return null;
    }
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
    const request = raw as Record<string, unknown>;
    if (
      request["version"] !== 1 ||
      request["seq"] !== identity.seq ||
      request["operation"] !== "send" ||
      typeof request["payload"] !== "object" ||
      request["payload"] === null ||
      Array.isArray(request["payload"])
    ) return null;
    try {
      const send = validateOverloadPayload("send", request["payload"] as Record<string, unknown>);
      if (
        !("message_id" in send) ||
        send.connection_id !== identity.connection_id ||
        send.message_id !== identity.message_id ||
        send.bytes !== actualBytes
      ) return null;
      return identity;
    } catch {
      return null;
    }
  }

  private async consumerReceiptsOf(
    requestFrame: string,
    responseFrame: string,
    deadlineAtMs: number,
  ): Promise<ReadonlyMap<string, ConsumerReceipt>> {
    const receipts = new Map<string, ConsumerReceipt>();
    if (responseFrame.length === 0 || Buffer.byteLength(responseFrame, "utf8") > MAX_FRAME_BYTES) {
      return receipts;
    }
    let request: unknown;
    let response: unknown;
    try {
      request = JSON.parse(requestFrame);
      response = JSON.parse(responseFrame);
    } catch {
      return receipts;
    }
    if (typeof request !== "object" || request === null || Array.isArray(request)) return receipts;
    const requestRecord = request as Record<string, unknown>;
    if (
      requestRecord["version"] !== 1 ||
      requestRecord["operation"] !== "read" ||
      typeof requestRecord["seq"] !== "number" ||
      !Number.isSafeInteger(requestRecord["seq"]) ||
      requestRecord["seq"] <= 0 ||
      typeof requestRecord["payload"] !== "object" ||
      requestRecord["payload"] === null ||
      Array.isArray(requestRecord["payload"])
    ) return receipts;
    let readPayload;
    try {
      readPayload = validateOverloadPayload("read", requestRecord["payload"] as Record<string, unknown>);
    } catch {
      return receipts;
    }
    if (!("max_bytes" in readPayload)) return receipts;
    if (typeof response !== "object" || response === null || Array.isArray(response)) return receipts;
    const responseRecord = response as Record<string, unknown>;
    if (
      responseRecord["version"] !== 1 ||
      responseRecord["seq"] !== requestRecord["seq"] ||
      responseRecord["ok"] !== true ||
      typeof responseRecord["result"] !== "object" ||
      responseRecord["result"] === null ||
      Array.isArray(responseRecord["result"])
    ) return receipts;
    let readResult;
    try {
      readResult = validateOverloadResult("read", responseRecord["result"] as Record<string, unknown>);
    } catch {
      return receipts;
    }
    if (!("delivered" in readResult)) return receipts;
    const outbox = this.queueObserver;
    if (outbox === null) return receipts;
    if (this.ports.nowMs() >= deadlineAtMs) {
      throw new Error("consumer read response arrived after the absolute D1 exchange deadline");
    }
    if (readResult.delivered.length === 0) return receipts;
    if (readResult.delivered.length > MAX_LIST_ENTRIES) {
      throw new Error("read selection exceeds the frozen D1 list limit");
    }
    const receiptSendSequences = new Map<string, number>();
    let selectedBytes = 0;
    for (const item of readResult.delivered) {
      selectedBytes += item.bytes;
      if (selectedBytes > readPayload.max_bytes || selectedBytes > MAX_FRAME_BYTES) {
        throw new Error("read selected bytes exceed the requested D1 read ceiling");
      }
      const key = `${readPayload.connection_id}|${item.message_id}`;
      if (receiptSendSequences.has(key)) throw new Error(`read result selects message more than once: ${key}`);
      const expected = this.expectedPayloads.get(key);
      if (
        expected === undefined ||
        expected.send_seq >= requestRecord["seq"] ||
        expected.bytes !== item.bytes ||
        this.consumedReceipts.has(key)
      ) {
        throw new Error(`read result does not match an outstanding trusted send for ${key}`);
      }
      receiptSendSequences.set(key, expected.send_seq);
    }
    if (this.ports.nowMs() >= deadlineAtMs) {
      throw new Error("consumer outbox inspection exceeded the absolute D1 exchange deadline");
    }
    let pauseAttempted = false;
    try {
      pauseAttempted = true;
      await this.ports.runtime.pauseCandidate(deadlineAtMs);
      for (const item of readResult.delivered) {
        if (this.ports.nowMs() >= deadlineAtMs) {
          throw new Error("consumer outbox inspection exceeded the absolute D1 exchange deadline");
        }
        const key = `${readPayload.connection_id}|${item.message_id}`;
        const expected = this.expectedPayloads.get(key);
        if (expected === undefined || receiptSendSequences.get(key) !== expected.send_seq) {
          throw new Error(`read selection lost its outstanding trusted send for ${key}`);
        }
        const bytes = await outbox.readConsumerOutbox(
          path.join(this.ports.stateDir, "volumes", stateVolumeOf(this.ports.attempt)),
          readPayload.connection_id,
          item.message_id,
        );
        const observedAt = this.ports.nowMs();
        if (observedAt >= deadlineAtMs) {
          throw new Error("consumer outbox read completed after the absolute D1 exchange deadline");
        }
        const sha256 = createHash("sha256").update(bytes).digest("hex");
        if (bytes.length !== expected.bytes || sha256 !== expected.sha256) {
          throw new Error(`consumer outbox bytes do not match trusted send ${key}`);
        }
        receipts.set(key, Object.freeze({
          attempt_id: validateId(this.ports.attempt.attempt_id, "attempt_id"),
          process_session_id: validateId(this.ports.runtime.processSessionId(), "process_session_id"),
          read_seq: requestRecord["seq"],
          send_seq: expected.send_seq,
          connection_id: validateId(readPayload.connection_id, "connection_id"),
          message_id: validateId(item.message_id, "message_id"),
          observed_monotonic_ms: validateNat(observedAt, "observed_monotonic_ms"),
          bytes: validateNat(bytes.length, "consumer_bytes"),
          sha256,
          payload_base64: bytes.toString("base64"),
          content_verified: true,
        }));
      }
    } finally {
      if (pauseAttempted) {
        try {
          await this.ports.runtime.resumeCandidate(deadlineAtMs);
        } catch (error) {
          throw new ObserverResumeError(reasonOf(error));
        }
      }
    }
    if (this.ports.nowMs() >= deadlineAtMs) {
      throw new Error("consumer outbox receipt was not retained before the absolute D1 exchange deadline");
    }
    for (const item of readResult.delivered) {
      const key = `${readPayload.connection_id}|${item.message_id}`;
      const sendSeq = receiptSendSequences.get(key);
      if (sendSeq === undefined) throw new Error(`read receipt lost its originating send sequence for ${key}`);
      this.noteTerminal({ seq: sendSeq, connection_id: readPayload.connection_id, message_id: item.message_id }, false);
    }
    return receipts;
  }

  /** Every D1 operation carries a connection id; admission is the controller's observation. */
  private envelopeConnection(frame: string): { connection_id: string; operation: string } | null {
    let raw: unknown;
    try {
      raw = JSON.parse(frame);
    } catch {
      return null;
    }
    if (typeof raw !== "object" || raw === null) return null;
    if (!("operation" in raw) || typeof raw.operation !== "string") return null;
    if (!("payload" in raw) || typeof raw.payload !== "object" || raw.payload === null) return null;
    if (!("connection_id" in raw.payload) || typeof raw.payload.connection_id !== "string") return null;
    return { connection_id: raw.payload.connection_id, operation: raw.operation };
  }

  private envelopeIdentity(frame: string): EnvelopeIdentity | null {
    let raw: unknown;
    try {
      raw = JSON.parse(frame);
    } catch {
      return null;
    }
    if (typeof raw !== "object" || raw === null) return null;
    if (!("version" in raw) || raw.version !== 1) return null;
    if (!("seq" in raw) || typeof raw.seq !== "number" || !Number.isSafeInteger(raw.seq) || raw.seq <= 0) {
      return null;
    }
    if (!("payload" in raw) || typeof raw.payload !== "object" || raw.payload === null) return null;
    const payload = raw.payload;
    if (!("connection_id" in payload) || typeof payload.connection_id !== "string") return null;
    if (!("message_id" in payload) || typeof payload.message_id !== "string") return null;
    return { seq: raw.seq, connection_id: payload.connection_id, message_id: payload.message_id };
  }

  private pushDisposition(
    identity: EnvelopeIdentity,
    bytes: number,
    state: DispositionEvent["state"],
    processSessionId: string,
  ): void {
    if (this.dispositions.length >= MAX_DISPOSITION_EVENTS) {
      throw new Error("disposition ledger exceeded its observation ceiling");
    }
    if (!this.liveConnections.has(identity.connection_id) && this.liveConnections.size >= MAX_TRACKED_CONNECTIONS) {
      throw new Error("admitted connection population exceeded its ceiling");
    }
    this.liveConnections.add(identity.connection_id);
    this.dispositionSeq += 1;
    this.dispositions.push(
      Object.freeze({
        attempt_id: this.ports.attempt.attempt_id,
        process_session_id: processSessionId,
        event_seq: this.dispositionSeq,
        request_seq: identity.seq,
        connection_id: identity.connection_id,
        message_id: identity.message_id,
        bytes,
        observed_monotonic_ms: this.ports.nowMs(),
        state,
      }),
    );
  }

  private noteAccepted(identity: EnvelopeIdentity, bytes: number): void {
    if (this.pendingBySeq.has(identity.seq)) throw new Error("duplicate outbound sequence in disposition ledger");
    const processSessionId = validateId(this.ports.runtime.processSessionId(), "process_session_id");
    this.pendingBySeq.set(identity.seq, { connection_id: identity.connection_id, bytes, processSessionId });
    this.pushDisposition(identity, bytes, "accepted", processSessionId);
  }

  private noteTerminal(identity: EnvelopeIdentity, dropped: boolean): void {
    const pending = this.pendingBySeq.get(identity.seq);
    this.pendingBySeq.delete(identity.seq);
    if (pending === undefined) {
      // A terminal event without its accepted event would be invented provenance.
      throw new Error(`terminal disposition has no accepted event for sequence ${identity.seq}`);
    }
    // A terminal observation keeps the session that accepted the message, even
    // when the process was restarted between acceptance and delivery/drop.
    this.pushDisposition(identity, pending.bytes, dropped ? "dropped" : "delivered", pending.processSessionId);
  }

  /** A D1 `read` result with `closed: true` retires that logical connection. */
  private noteConnectionClosed(connectionId: string): void {
    this.liveConnections.delete(connectionId);
  }

  private isClosedReadResult(requestFrame: string, responseFrame: string): boolean {
    if (responseFrame.length === 0) return false;
    let request: unknown;
    let response: unknown;
    try {
      request = JSON.parse(requestFrame);
      response = JSON.parse(responseFrame);
    } catch {
      return false;
    }
    if (typeof request !== "object" || request === null || Array.isArray(request)) return false;
    const requestRecord = request as Record<string, unknown>;
    if (
      requestRecord["operation"] !== "read" ||
      typeof requestRecord["payload"] !== "object" ||
      requestRecord["payload"] === null ||
      Array.isArray(requestRecord["payload"])
    ) return false;
    try {
      validateOverloadPayload("read", requestRecord["payload"] as Record<string, unknown>);
    } catch {
      return false;
    }
    if (typeof response !== "object" || response === null || Array.isArray(response)) return false;
    const responseRecord = response as Record<string, unknown>;
    if (
      responseRecord["version"] !== 1 ||
      responseRecord["seq"] !== requestRecord["seq"] ||
      responseRecord["ok"] !== true ||
      typeof responseRecord["result"] !== "object" ||
      responseRecord["result"] === null ||
      Array.isArray(responseRecord["result"])
    ) return false;
    try {
      const result = validateOverloadResult("read", responseRecord["result"] as Record<string, unknown>);
      return "closed" in result && result.closed;
    } catch {
      return false;
    }
  }

  /**
   * Retains the complete evidence set the attempt actually produced: provenance,
   * the independently established observer observations, buffer snapshots, all
   * auxiliary/stub/process/termination/restart/phase observations, the exact typed
   * verdict and the controller's own transport ledger (labelled as such).
   *
   * The encoder is all-or-nothing: when the artifact budget cannot hold the whole
   * set the export is recorded as failed and the workflow reason changes. A
   * partial export is never reported as a successful one.
   */
  private async retainEvidence(): Promise<{
    readonly items: number;
    readonly bytes: number;
    readonly failure: string | null;
  }> {
    const items: EvidenceItem[] = [];
    let seq = 0;
    const push = (kind: EvidenceKind, body: unknown): void => {
      seq += 1;
      items.push({ seq, kind, body });
    };
    push("provenance", {
      run_id: this.ports.attempt.run_id,
      attempt_id: this.ports.attempt.attempt_id,
      manifest_sha256: this.ports.attempt.manifest_sha256,
      case_id: this.ports.attempt.case_id,
      phase: this.ports.attempt.phase,
      process_session_id: this.ports.runtime.processSessionId(),
      observer_refusal: this.observerRefusal,
      observer_mapping: this.queueObserver === null ? null : this.queueObserver.mapping_sha256,
      admission_refusals: [...this.admissionRefusals],
      final_observation: this.finalObservation,
      delivery_content_proof: "trusted_outbox_bytes_exact_match",
    });
    for (const snapshot of this.evidenceBuffers) push("buffer_snapshot", snapshot);
    for (const disposition of this.dispositionHistory) push("disposition_history", disposition);
    for (const receipt of this.consumedReceipts.values()) push("consumer_receipt", receipt);
    for (const disposition of this.dispositions) push("transport_disposition", disposition);
    for (const observation of this.evidenceAuxiliary) push("auxiliary_observation", observation);
    for (const observation of this.evidenceStubs) push("stub_observation", observation);
    for (const observation of this.evidenceProcess) push("process_observation", observation);
    for (const observation of this.evidenceTermination) push("termination", observation);
    for (const observation of this.evidenceRestarts) push("restart", observation);
    for (const observation of this.evidencePhases) push("phase", observation);
    if (this.candidateOutputRanges.size > 0) {
      const outputPath = path.join(this.ports.stateDir, "output.log");
      const output = await readFile(outputPath);
      for (const range of this.candidateOutputRanges.values()) {
        const end = range.artifact_offset + range.exported_bytes;
        if (end > output.length) {
          throw new Error("candidate output evidence points beyond the retained artifact");
        }
        const exported = output.subarray(range.artifact_offset, end);
        const maskBytes = Math.ceil(range.exported_bytes / 8);
        push("raw_output_chunk", {
          process_session_id: range.process_session_id,
          stream: "combined",
          stream_offset: range.stream_offset,
          capture_order: range.capture_order,
          artifact_offset: range.artifact_offset,
          bytes: range.bytes,
          exported_bytes: range.exported_bytes,
          stream_mask_base64: range.stream_mask.subarray(0, maskBytes).toString("base64"),
          sha256: createHash("sha256").update(exported).digest("hex"),
        });
      }
    }
    for (const output of this.evidenceRawOutput) push("raw_output_chunk", output);
    for (const marker of this.evidenceMarkers) push("output_marker", marker);
    for (const observation of this.ports.collectStubObservations?.() ?? []) {
      push("stub_observation", observation);
    }
    push("verdict", this.verdictValue);

    const section = encodeEvidence(items, { max_bytes: this.eventsBudget() - this.eventsBytes });
    if (!section.ok) {
      this.evidenceExportFailure = section.reason ?? "evidence set could not be retained";
      return { items: items.length, bytes: 0, failure: this.evidenceExportFailure };
    }
    await appendFile(this.eventsPath, section.wire, { mode: 0o600 });
    this.eventsBytes += section.bytes;
    return { items: section.items, bytes: section.bytes, failure: null };
  }

  /**
   * Runs one observer round. Unavailable observation is recorded and reported as
   * `null`; a candidate that cannot be resumed is a workflow error, because the
   * attempt would otherwise continue with the candidate suspended.
   */
  /** True when the candidate process is already gone and its state is frozen. */
  private async isProcessStopped(): Promise<boolean> {
    try {
      const status = await this.ports.runtime.termination();
      return status.container_state === "exited" || status.container_state === "dead" || status.container_state === "absent";
    } catch {
      return false;
    }
  }

  private async observeDispositionHistory(
    final: boolean,
  ): Promise<readonly MessageDispositionObservation[] | null> {
    const observer = this.queueObserver;
    if (observer === null) return null;
    if (final) this.finalObservation = { attempted: true, complete: false, reason: "in progress", records: 0 };
    this.snapshotCounter += 1;
    const observationId = validateId(`disp-${this.ports.runtime.processSessionId()}-${this.snapshotCounter}`, "observation_id");
    try {
      const records = await observer.observeDispositions({
        state_volume_dir: path.join(this.ports.stateDir, "volumes", stateVolumeOf(this.ports.attempt)),
        attempt_id: this.ports.attempt.attempt_id,
        process_session_id: this.ports.runtime.processSessionId(),
        observation_id: observationId,
        now: () => this.ports.nowMs(),
        trusted: this.trustedWorkload(),
        final,
        frozen: await this.isProcessStopped(),
        runtime: this.ports.runtime,
      });
      this.dispositionHistory = records;
      if (final) {
        this.finalObservation = { attempted: true, complete: true, reason: null, records: records.length };
      }
      return records;
    } catch (error) {
      const reason = await this.recordObservationFailure(error);
      if (final) this.finalObservation = { attempted: true, complete: false, reason, records: 0 };
      if (error instanceof ObserverResumeError) {
        this.fatalResumeFailure = error;
        throw error;
      }
      return null;
    }
  }

  /** Records why an observation is unavailable; never converts it into a pass. */
  private async recordObservationFailure(error: unknown): Promise<string> {
    const reason = error instanceof Error ? error.message : String(error);
    await this.appendEvent("observation_unavailable", "queue_observer", 0, true).catch(() => undefined);
    this.admissionRefusals.push(reason);
    return reason;
  }

  private buildPorts(): {
    transport: unknown;
    processController: unknown;
    stageReader: unknown;
  } {
    const self = this;
    const runtime = this.ports.runtime;
    const attemptId = this.ports.attempt.attempt_id;

    const transport = {
      async sendRawRequest(envelopeJson: string, sideband?: unknown, timeoutMs?: number): Promise<string> {
        const startedAt = self.ports.nowMs();
        const deadline = startedAt + (timeoutMs ?? RESPONSE_DEADLINE_MS);
        const identity = self.envelopeIdentity(envelopeJson);
        if (sideband !== undefined && sideband !== null) {
          if (typeof sideband !== "object") throw new Error("sideband must be an object");
          if (!("syntheticBytes" in sideband) || !(sideband.syntheticBytes instanceof Buffer)) {
            throw new Error("sideband.syntheticBytes must be a Buffer");
          }
          if (identity === null) throw new Error("sideband send has no D1 envelope identity");
          const channel = self.ports.auxChannel;
          if (channel === undefined) throw new Error("auxiliary channel is unavailable");
          const requested =
            "requested_summary" in sideband &&
            typeof sideband.requested_summary === "object" &&
            sideband.requested_summary !== null &&
            "offer_id" in sideband.requested_summary &&
            "window_index" in sideband.requested_summary
              ? {
                  offer_id: validateId(sideband.requested_summary.offer_id, "offer_id"),
                  window_index: validateNat(sideband.requested_summary.window_index, "window_index"),
                }
              : undefined;
          const receipt = await channel.sendFrame(
            {
              seq: identity.seq,
              connection_id: identity.connection_id,
              message_id: identity.message_id,
              payload: sideband.syntheticBytes,
              ...(requested === undefined ? {} : { requested_summary: requested }),
            },
            deadline,
          );
          if (requested !== undefined && receipt === null) {
            throw new Error("auxiliary summary offer was not delivered to an authenticated candidate boundary");
          }
        }
        const sidebandBytes =
          sideband !== undefined && sideband !== null && "syntheticBytes" in sideband &&
          sideband.syntheticBytes instanceof Buffer
            ? sideband.syntheticBytes.length
            : undefined;
        const exactPayload =
          sideband !== undefined && sideband !== null && "syntheticBytes" in sideband &&
          sideband.syntheticBytes instanceof Buffer
            ? sideband.syntheticBytes
            : Buffer.from(envelopeJson, "utf8");
        const response = await self.dispatch({
          version: 1,
          seq: ++self.sequence,
          operation: "exchange_candidate",
          payload: {
            frame: envelopeJson,
            deadline_ms: Math.max(1, deadline - self.ports.nowMs()),
            deadline_at_ms: deadline,
            payload_sha256: createHash("sha256").update(exactPayload).digest("hex"),
            payload_bytes: exactPayload.length,
            ...(sidebandBytes === undefined ? {} : { message_bytes: sidebandBytes }),
          },
        });
        if (!response.ok) {
          if (self.fatalResumeFailure !== null) throw self.fatalResumeFailure;
          throw new Error(`Transport exchange failed: ${response.error?.message ?? "unknown"}`);
        }
        const frame = response.result?.response_frame;
        if (typeof frame !== "string") throw new Error("transport response frame is missing");
        return frame;
      },
      async getTransportObservation() {
        const aux = self.ports.auxChannel;
        if (aux === undefined) {
          const empty = { sideband_frames: 0, sideband_bytes: 0, auxiliary: null };
          self.recordEvidence("auxiliary_observation", empty);
          return empty;
        }
        const stats = aux.getStats();
        const observation = {
          sideband_frames: stats.frames,
          sideband_bytes: stats.raw_bytes,
          auxiliary: aux.getObservation(),
        };
        self.recordEvidence("auxiliary_observation", observation);
        return observation;
      },
    };

    const processController = {
      async resetState(): Promise<void> {
        const response = await self.dispatch({
          version: 1,
          seq: ++self.sequence,
          operation: "reset_state",
          payload: { state_volume: stateVolumeOf(self.ports.attempt) },
        });
        if (!response.ok) throw new Error(`resetState failed: ${response.error?.message ?? "unknown"}`);
      },
      async restartRetainingState(): Promise<void> {
        const response = await self.dispatch({
          version: 1,
          seq: ++self.sequence,
          operation: "restart_candidate",
          payload: { reason: "payment_adverse_restart" },
        });
        if (!response.ok) throw new Error(`restartRetainingState failed: ${response.error?.message ?? "unknown"}`);
      },
      async freezeAndSnapshot() {
        const reader = self.stageReader;
        if (reader === null) return null;
        const locations = reader.reviewedLocations();
        if (locations.length === 0) return null;
        const paused = await self.dispatch({
          version: 1,
          seq: ++self.sequence,
          operation: "pause_candidate",
          payload: {},
        });
        if (!paused.ok) return null;
        self.snapshotCounter += 1;
        const snapshotId = `snap-${runtime.processSessionId()}-${self.snapshotCounter}`;
        let manifest: readonly FrozenStageManifestEntry[] | null;
        try {
          manifest = await runtime.snapshotState(
            snapshotId,
            stateVolumeOf(self.ports.attempt),
            locations,
          );
        } catch {
          manifest = null;
        }
        if (manifest === null) return null;
        self.snapshots.set(snapshotId, manifest);
        return { snapshot_id: snapshotId };
      },
      async resume(): Promise<void> {
        const response = await self.dispatch({
          version: 1,
          seq: ++self.sequence,
          operation: "resume_candidate",
          payload: {},
        });
        if (!response.ok) {
          if (self.fatalResumeFailure !== null) throw self.fatalResumeFailure;
          throw new Error(`resume failed: ${response.error?.message ?? "unknown"}`);
        }
      },
      async observeConnectionBufferSnapshot(): Promise<ConnectionBufferSnapshot | null> {
        const observer = self.queueObserver;
        if (observer === null) {
          // No reviewed, admitted observer: there is no independent observation
          // of candidate buffers. The transport-side ledger is not that
          // observation, so nothing is reported rather than fabricated zeroes.
          return null;
        }
        self.snapshotCounter += 1;
        const observationId = validateId(`buf-${runtime.processSessionId()}-${self.snapshotCounter}`, "observation_id");
        if (self.bufferObservationIds.has(observationId)) return null;
        self.bufferObservationIds.add(observationId);
        try {
          const snapshot = await observer.observeBuffers({
            state_volume_dir: path.join(self.ports.stateDir, "volumes", stateVolumeOf(self.ports.attempt)),
            attempt_id: attemptId,
            process_session_id: runtime.processSessionId(),
            observation_id: observationId,
            now: () => self.ports.nowMs(),
            trusted: self.trustedWorkload(),
            final: false,
            frozen: await self.isProcessStopped(),
            runtime,
          });
          self.recordEvidence("buffer_snapshot", snapshot);
          return snapshot;
        } catch (error) {
          await self.recordObservationFailure(error);
          if (error instanceof ObserverResumeError) {
            self.fatalResumeFailure = error;
            throw error;
          }
          return null;
        }
      },
      async getTerminationObservation() {
        const termination = await self.dispatch({
          version: 1,
          seq: ++self.sequence,
          operation: "termination",
          payload: {},
        });
        const sessionId = runtime.processSessionId();
        const phase = termination.result?.container_state;
        const exitCode = termination.result?.exit_code;
        const termPid = typeof termination.result?.pid === "number" && termination.result.pid > 0
          ? termination.result.pid
          : self.lastLivePid;

        if (phase === "exited" || phase === "dead") {
          // An exit receipt is only issued for a real observed exit: a valid exit
          // code from the runtime and the pid that actually owned the container.
          if (typeof exitCode === "number" && Number.isSafeInteger(exitCode) && exitCode >= 0 && exitCode <= 255) {
            const effectivePid = termPid > 0 ? termPid : self.lastLivePid;
            if (effectivePid > 0) {
              return {
                attempt_id: attemptId,
                process_session_id: sessionId,
                observation_id: `obs-term-${self.sequence}`,
                observed_monotonic_ms: self.ports.nowMs(),
                phase: "exited" as const,
                pid: effectivePid,
                exit_receipt_id: `rcpt-${sessionId}-${String(exitCode)}`,
                last_live_memory_rss_bytes: self.lastLiveRss,
              };
            }
          }
          return {
            attempt_id: attemptId,
            process_session_id: sessionId,
            observation_id: `obs-term-${self.sequence}`,
            observed_monotonic_ms: self.ports.nowMs(),
            phase: "unknown" as const,
          };
        }

        const proc = await self.dispatch({
          version: 1,
          seq: ++self.sequence,
          operation: "observe_process",
          payload: {},
        });
        const pid = typeof proc.result?.pid === "number" && proc.result.pid > 0 ? proc.result.pid : termPid;
        if (typeof pid !== "number" || pid <= 0) {
          return {
            attempt_id: attemptId,
            process_session_id: sessionId,
            observation_id: `obs-term-${self.sequence}`,
            observed_monotonic_ms: self.ports.nowMs(),
            phase: "unknown" as const,
          };
        }

        self.lastLivePid = pid;
        const rss = proc.result?.rss_bytes;
        if (typeof rss === "number" && rss > 0) self.lastLiveRss = rss;

        return {
          attempt_id: attemptId,
          process_session_id: sessionId,
          observation_id: `obs-term-${self.sequence}`,
          observed_monotonic_ms: self.ports.nowMs(),
          phase: "running" as const,
          pid,
          memory_rss_bytes: typeof rss === "number" ? rss : 0,
        };
      },
      async observeMessageDispositions(): Promise<readonly MessageDispositionObservation[] | null> {
        return await self.observeDispositionHistory(false);
      },
    };

    const stageReader = {
      isStageCorrespondenceAccepted: (stage: string): boolean => {
        const reader = self.stageReader;
        return reader !== null && reader.isStageCorrespondenceAccepted(stage as never);
      },
      readFrozenStages: async (snapshotId: string) => {
        const manifest = self.snapshots.get(snapshotId);
        const reader = self.stageReader;
        if (manifest === undefined || reader === null) return null;
        return await reader.readFrozenStages(snapshotId, manifest);
      },
    };
    return { transport, processController, stageReader };
  }

  /**
   * Autonomous attempt: verify inputs, offline build, run the candidate with the
   * selected D3 driver, stop, write a receipt and shut the guest down. A missing
   * driver is a recorded outcome, never a mid-run throw.
   */
  async runAutonomous(): Promise<void> {
    const attempt = this.ports.attempt;
    await mkdir(this.ports.stateDir, { recursive: true, mode: 0o700 });

    let build: Record<string, unknown> | null = null;
    let run: Record<string, unknown> | null = null;
    let stop: Record<string, unknown> | null = null;
    let verdict: unknown = null;
    let reason = "deadline";
    let failure: string | null = null;

    try {
      this.ports.emitStatus?.("build_started");
      const buildSpecSha256 = attempt.manifest_sha256;
      build = {
        version: 1,
        seq: ++this.sequence,
        operation: "build",
        payload: {
          workspace_ref: this.ports.buildContext?.workspace_ref ?? path.join(this.ports.stateDir, "build"),
          offline_bundle_ref: this.ports.buildContext?.offline_bundle_ref ?? path.join(this.ports.stateDir, "build", "deps"),
          build_spec_sha256: buildSpecSha256,
        },
      };
      const buildResponse = await this.dispatch(build);
      build = { ...buildResponse };
      this.ports.emitStatus?.(buildResponse.ok ? "build_finished" : "build_failed");

      const buildResult = buildResponse.ok ? buildResponse.result ?? {} : {};
      const buildExit = typeof buildResult.exit_code === "number" ? buildResult.exit_code : null;
      const buildTruncated = buildResult.output_truncated === true;
      const buildCleanupFailed =
        typeof buildResult.cleanup_failures === "number" && buildResult.cleanup_failures > 0;
      const buildOk = buildResponse.ok && buildExit === 0 && !buildTruncated && !buildCleanupFailed;

      if (!buildOk) {
        reason = "build_failed";
        failure = buildResponse.error?.message ??
          (buildCleanupFailed ? "build cleanup could not be confirmed" : "build exited nonzero or truncated");
      } else if (attempt.phase === "build") {
        reason = "build_completed";
        verdict = { phase: "build", image_id: buildResult.image_id ?? null };
      } else {
        const imageId = buildResult.image_id;
        if (typeof imageId !== "string") throw new Error("build result has no verified image identity");
        const stateVolume = stateVolumeOf(attempt);
        await this.ports.runtime.prepareStateVolume(stateVolume);
        // The run clock starts before readiness: container start is part of the
        // run budget, and expiry settles the workflow instead of just asking.
        const runDeadline = Math.min(
          this.ports.deadlineAtMs,
          this.ports.nowMs() + this.ports.limits.run.wall_time_seconds * 1000,
        );
        let expired = false;
        const runTimer = setTimeout(() => {
          expired = true;
          void this.stopCandidate().catch(() => undefined);
        }, Math.max(1, runDeadline - this.ports.nowMs()));
        this.ports.emitStatus?.("run_started");
        try {
          run = {
            version: 1,
            seq: ++this.sequence,
            operation: "run",
            payload: {
              entrypoint: "/workspace/app/index.js",
              state_volume: stateVolume,
              image_id: imageId,
            },
          };
          const runResponse = await this.dispatch(run);
          run = { ...runResponse };

          if (!runResponse.ok) {
            reason = "run_launch_failed";
            failure = runResponse.error?.message ?? "run launch failed";
          } else {
            const drivers = this.ports.drivers;
            const outcome = await this.runCaseDriver(drivers, runDeadline);
            if (this.fatalResumeFailure !== null) {
              // The driver may have swallowed the exchange error; a candidate
              // that could not be resumed must still fail the workflow.
              throw this.fatalResumeFailure;
            }
            verdict = outcome.verdict;
            this.verdictValue = outcome.verdict;
            reason = expired || outcome.reason === "run_deadline_exceeded" ? "run_deadline_exceeded" : outcome.reason;
            failure = outcome.failure;
            // The final observation happens while the candidate may already have
            // exited (D3 drains and the process settles). Observe the frozen state
            // in that case instead of pausing a dead process.
            try {
              await this.observeDispositionHistory(true);
            } catch (error) {
              reason = "observation_failed";
              failure = reasonOf(error);
            }
            stop = await this.stopCandidate();
          }
        } finally {
          clearTimeout(runTimer);
          this.ports.emitStatus?.("run_finished");
        }
      }
    } catch (error) {
      failure = reasonOf(error);
      reason = reason === "deadline" ? "controller_error" : reason;
      stop = await this.stopCandidate().catch(() => null);
    } finally {
      try {
        await this.ports.settleStubEffects?.();
      } catch (error) {
        failure = failure === null ? reasonOf(error) : `${failure}; ${reasonOf(error)}`;
        reason = "stub_settlement_failed";
      }
      if (this.outputTruncated && failure === null) {
        reason = "output_truncated";
        failure = "raw output capture exceeded an existing output ceiling";
      }
      this.recordEvidence("output_marker", { reason, failure });
      this.verdictValue = verdict;
      const evidence = await this.retainEvidence();
      if (evidence.failure !== null) {
        failure = failure === null ? evidence.failure : `${failure}; ${evidence.failure}`;
        reason = "evidence_export_failed";
      }
      const receipt = {
        schema_version: 1,
        run_id: attempt.run_id,
        attempt,
        build,
        run,
        stop,
        verdict,
        reason,
        failure,
        completed_at_ms: this.ports.nowMs(),
        events: this.eventsBytes,
        evidence_artifact: "events.jsonl#evidence",
        evidence,
        transport_disposition_count: this.dispositions.length,
        disposition_history_count: this.dispositionHistory.length,
        queue_observation: {
          observer_refusal: this.observerRefusal,
          final: this.finalObservation,
          refusals: Object.freeze([...this.admissionRefusals]),
          expected_messages: this.expectedPayloads.size,
          consumer_receipts: this.consumedReceipts.size,
          delivery_content_proof: "trusted_outbox_bytes_exact_match",
        },
        output: { bytes: this.outputBytes ?? 0, truncated: this.outputTruncated },
        operations: [...CONTROLLER_OPERATIONS],
      };
      await writeFile(path.join(this.ports.stateDir, "receipt.json"), JSON.stringify(receipt, null, 2), {
        mode: 0o600,
      });
      await this.ports.runtime.shutdownGuest();
    }
  }

  private async stopCandidate(): Promise<Record<string, unknown> | null> {
    const response = await this.dispatch({
      version: 1,
      seq: ++this.sequence,
      operation: "stop_candidate",
      payload: {},
    });
    if (this.ports.runtime.candidateOutputTruncated?.() === true) this.outputTruncated = true;
    await this.retainRawOutput(this.ports.runtime.drainCandidateOutput?.() ?? []);
    return { ...response };
  }

  private async runCaseDriver(
    drivers: CaseDrivers | undefined,
    runDeadlineMs: number,
  ): Promise<{ verdict: unknown; reason: string; failure: string | null }> {
    const attempt = this.ports.attempt;
    const attemptId = attempt.attempt_id;
    if (drivers === undefined) {
      return { verdict: null, reason: "driver_missing", failure: "packaged D3 driver tree was not provided" };
    }
    const ports = this.buildPorts();
    const deadline = this.deadlineRejection(runDeadlineMs);

    try {
      if (attempt.case_id === "payment") {
        const driver = drivers.PaymentCaseDriver;
        if (driver === undefined || this.ports.providerStub === undefined) {
          return { verdict: null, reason: "driver_missing", failure: "payment driver or provider stub is missing" };
        }
        const instance = new driver(
          ports.transport,
          ports.processController,
          this.ports.providerStub,
          {},
        );
        const base = await Promise.race([instance.runBaseSchedule?.(), deadline.promise]);
        const adverse = await Promise.race([instance.runAdverseSchedule?.(), deadline.promise]);
        const changed = await Promise.race([instance.runChangedConstraintSchedule?.(), deadline.promise]);
        const negative = await Promise.race([instance.runNegativeOutcomeControl?.(), deadline.promise]);
        return {
          verdict: { case_id: "payment", base, adverse, changed, negative },
          reason: "payment_completed",
          failure: null,
        };
      }
      if (attempt.case_id === "tenant") {
        const driver = drivers.TenantCaseDriver;
        if (driver === undefined) {
          return { verdict: null, reason: "driver_missing", failure: "tenant driver is missing" };
        }
        const instance = new driver(ports.transport, ports.processController, ports.stageReader, {});
        const verdict = await Promise.race([instance.runSchedule?.(), deadline.promise]);
        return { verdict, reason: "tenant_completed", failure: null };
      }
      if (attempt.case_id === "overload") {
        const driver = drivers.OverloadCaseDriver;
        const scheduler = this.ports.scheduler;
        if (driver === undefined || this.ports.summarizerStub === undefined || scheduler === undefined) {
          return { verdict: null, reason: "driver_missing", failure: "overload driver, summarizer or scheduler is missing" };
        }
        const instance = new driver(
          ports.transport,
          ports.processController,
          this.ports.summarizerStub,
          scheduler,
          {},
        );
        const verdict = await Promise.race([instance.runWorkload?.(), deadline.promise]);
        return { verdict, reason: "overload_completed", failure: null };
      }
      return { verdict: null, reason: "driver_missing", failure: `no driver for case ${attempt.case_id}` };
    } catch (error) {
      if (error instanceof ObserverResumeError) throw error;
      return {
        verdict: null,
        reason: deadline.expired() ? "run_deadline_exceeded" : "driver_error",
        failure: reasonOf(error),
      };
    } finally {
      deadline.cancel();
    }
  }

  /**
   * One rejection armed at the absolute run deadline. It settles the workflow
   * even when the driver never returns and its transports would keep retrying.
   */
  private deadlineRejection(deadlineAtMs: number): {
    readonly promise: Promise<never>;
    expired: () => boolean;
    cancel: () => void;
  } {
    let expired = false;
    let timer: NodeJS.Timeout | undefined;
    const promise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        expired = true;
        reject(new Error("run deadline exceeded"));
      }, Math.max(1, deadlineAtMs - this.ports.nowMs()));
    });
    return {
      promise,
      expired: () => expired,
      cancel: () => clearTimeout(timer),
    };
  }
}

function stateVolumeOf(attempt: AttemptInvocation): string {
  return `vol-${attempt.attempt_index}`;
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export { isObservationFrame, validatePayload };
