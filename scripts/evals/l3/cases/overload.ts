import { createHash } from "node:crypto";
import type { Id, Nat, OverloadLimits } from "../contracts.js";
import { validateOverloadPayload, validateOverloadResult } from "../contracts.js";
import type {
  AuxiliaryOfferReceipt,
  CandidateProcessController,
  CandidateTerminationObservation,
  CandidateTransport,
  ConnectionBufferObservation,
  ConnectionBufferSnapshot,
  MessageDispositionObservation,
  OverloadCaseVerdict,
  OverloadCoverage,
  OverloadMetrics,
  OverloadSafety,
  OverloadWindowDiagnostic,
  SummarizerLedgerEntry,
  SummarizerTimingEvidence,
  TransportObservation,
  TransportSideband,
} from "./contracts.js";
import { ExchangeFailure, StrictExchangeSession, deferred } from "./exchange.js";
import { boundReasons } from "./bounds.js";
import type { ExchangeResponse, PayloadValidator, ResultValidator } from "./exchange.js";
import { SummarizerStub } from "./stubs.js";
import type { SummarizerScheduler } from "./stubs.js";
import { generateSyntheticMessageBytes } from "./fixtures.js";

/**
 * scripts/evals/l3/cases/overload.ts
 *
 * Overload fault driver and independent oracle.
 *
 * SRS: "Overload operation schemas", "Proposed bounded workload" and "Required
 * overload coverage". The candidate owns admission, buffering, backpressure and
 * retry policy; this driver owns the schedule, the synthetic byte allocation,
 * the offer ledger, the independent stub receipts and the process observations.
 */

type OverloadOperation = "open" | "send" | "read" | "close" | "drain" | "status";

/**
 * Frozen diagnostic workload. These are the SRS revision-3 numbers; a driver
 * must not shrink them to make a run cheaper.
 */
export const OVERLOAD_WORKLOAD = {
  client_count: 24,
  message_bytes: 1024,
  message_interval_ms: 100,
  messages_per_second: 10,
  read_max_bytes: 4096,
  setup_deadline_ms: 15_000,
  attempt_deadline_ms: 90_000,
  base_window_end_ms: 30_000,
  loss1_window_end_ms: 45_000,
  loss2_window_end_ms: 60_000,
  stall_readers: 8,
  stall_from_ms: 30_000,
  stall_to_ms: 40_000,
  reconnect_streams: 8,
  reconnect_at_ms: 35_000,
  drain_at_ms: 60_000,
  drain_deadline_ms: 5_000,
  /** Coverage requires strictly more than 20 pre-loss admitted streams. */
  preloss_admitted_required: 21,
  /** Coverage requires strictly more than 20 offered streams per second. */
  post_loss1_offer_required: 21,
  /** Coverage requires strictly more than 12 offered streams per second. */
  post_loss2_offer_required: 13,
  memory_cap_bytes: 512 * 1024 * 1024,
} as const;

/**
 * Parent-set diagnostic bound: one workload grid tick.
 *
 * NOT an SRS number. It bounds how late a summarizer completion or a drain start
 * may be before the run is treated as timing-unverified, and it is the extra
 * settle time granted to the last scheduled completion before grading.
 */
const DIAGNOSTIC_BOUND_MS = 100;

/**
 * Trusted monotonic scheduler. `nowMs` is the only time source the driver uses;
 * `waitUntil` actually waits in a real run and advances a virtual clock in
 * deterministic tests. Neither implementation is a no-op.
 */
export interface MonotonicScheduler extends SummarizerScheduler {
  readonly waitUntil: (targetMs: number) => Promise<void>;
}

interface ScheduledVirtualAction {
  readonly targetMs: number;
  readonly callback: () => void;
  cancelled: boolean;
}

export class VirtualMonotonicScheduler implements MonotonicScheduler {
  public readonly isVirtual = true;
  private currentMs = 0;
  private readonly actions: ScheduledVirtualAction[] = [];

  public readonly nowMs = (): number => this.currentMs;

  public readonly scheduleAt = (targetMs: number, callback: () => void): (() => void) => {
    if (!Number.isSafeInteger(targetMs) || targetMs < this.currentMs) {
      throw new Error(`virtual scheduler target must be a safe timestamp >= ${this.currentMs}`);
    }
    const action = { targetMs, callback, cancelled: false };
    this.actions.push(action);
    return () => {
      action.cancelled = true;
    };
  };

  public readonly waitUntil = async (targetMs: number): Promise<void> => {
    if (!Number.isFinite(targetMs)) {
      throw new Error(`virtual scheduler target must be finite, got ${String(targetMs)}`);
    }
    if (targetMs > this.currentMs) this.currentMs = targetMs;
    this.runDueActions();
    await Promise.resolve();
  };

  private runDueActions(): void {
    for (;;) {
      this.actions.sort((left, right) => left.targetMs - right.targetMs);
      const next = this.actions.find(
        (action) => !action.cancelled && action.targetMs <= this.currentMs
      );
      if (next === undefined) return;
      next.cancelled = true;
      next.callback();
    }
  }
}
export class RealMonotonicScheduler implements MonotonicScheduler {
  public readonly isVirtual = false;
  private readonly originMs = performance.now();

  public readonly nowMs = (): number => Math.floor(performance.now() - this.originMs);

  public readonly scheduleAt = (targetMs: number, callback: () => void): (() => void) => {
    if (!Number.isSafeInteger(targetMs) || targetMs < 0) {
      throw new Error("real scheduler target must be a non-negative safe timestamp");
    }
    const timer = setTimeout(callback, Math.max(0, Math.ceil(targetMs - this.nowMs())));
    return () => clearTimeout(timer);
  };

  public readonly waitUntil = async (targetMs: number): Promise<void> => {
    if (!Number.isFinite(targetMs)) {
      throw new Error(`real scheduler target must be finite, got ${String(targetMs)}`);
    }
    if (targetMs <= this.nowMs()) return;
    const { promise, resolve } = deferred<void>();
    this.scheduleAt(targetMs, resolve);
    await promise;
  };
}

interface MetricsAccumulator {
  total_messages_allocated: number;
  total_bytes_allocated: number;
  total_messages_accepted: number;
  total_messages_delivered: number;
  total_bytes_delivered: number;
  total_messages_dropped: number;
  total_summary_offers: number;
  forwarded_summary_attempts: number;
  forwarded_summary_rejected: number;
  max_forwarded_attempts_per_second: number;
  stub_forwarded_calls: number;
  stub_rejected_calls: number;
}

export interface OverloadDriverOptions {
  readonly defaultTimeoutMs?: number;
  readonly drainTimeoutMs?: number;
}

interface StreamState {
  readonly connection_id: Id;
  closed: boolean;
}
interface ExpectedSummaryOffer {
  readonly seq: number;
  readonly connection_id: Id;
  readonly message_id: Id;
  readonly offer_id: Id;
  readonly window_index: number;
  readonly byte_count: number;
  readonly sha256: string;
}

interface OpenResult {
  readonly connection_id: Id;
  readonly admitted: boolean;
  readonly limits: OverloadLimits;
}

interface SendResult {
  readonly message_id: Id;
  readonly status: "accepted" | "rejected";
}

interface ReadResult {
  readonly delivered: readonly { readonly message_id: Id; readonly bytes: number }[];
  readonly closed: boolean;
}

interface DrainResult {
  readonly terminated: boolean;
  readonly undelivered_count: Nat;
}

interface StatusResult {
  readonly limits: OverloadLimits;
  readonly active_connections: Nat;
  readonly buffered_bytes: Nat;
  readonly dropped_count: Nat;
  readonly capacity_rps: Nat;
}

const PAYLOAD_VALIDATOR: PayloadValidator = (operation, payload) => {
  validateOverloadPayload(operation as OverloadOperation, payload);
};

const RESULT_VALIDATOR: ResultValidator = (operation, result) => {
  validateOverloadResult(operation as OverloadOperation, result);
};

export class OverloadCaseDriver {
  private readonly session: StrictExchangeSession;
  private readonly drainTimeoutMs: number;
  private nextRequestSequence = 1;
  private processSessionId: Id | null = null;
  private processIdentity: number | null = null;
  private readonly processObservationIds = new Set<Id>();
  private lastProcessObservedMs = -1;

  public constructor(
    private readonly transport: CandidateTransport,
    private readonly controller: CandidateProcessController,
    private readonly summarizerStub: SummarizerStub,
    private readonly scheduler: MonotonicScheduler = new RealMonotonicScheduler(),
    options: OverloadDriverOptions = {}
  ) {
    if (this.summarizerStub.nowMs !== this.scheduler.nowMs && this.summarizerStub.scheduler !== this.scheduler) {
      throw new Error("OverloadCaseDriver and SummarizerStub must share the same monotonic clock/scheduler");
    }
    if (this.summarizerStub.scheduler.isVirtual !== this.scheduler.isVirtual) {
      throw new Error(
        "OverloadCaseDriver and SummarizerStub must share the same scheduler virtual mode"
      );
    }
    this.session = new StrictExchangeSession(transport, {
      defaultTimeoutMs: options.defaultTimeoutMs,
    });
    this.drainTimeoutMs = options.drainTimeoutMs ?? 10_000;
  }

  public async runWorkload(): Promise<OverloadCaseVerdict> {
    const failures: string[] = [];
    const unverified: string[] = [];
    const metrics: MetricsAccumulator = {
      total_messages_allocated: 0,
      total_bytes_allocated: 0,
      total_messages_accepted: 0,
      total_messages_delivered: 0,
      total_bytes_delivered: 0,
      total_messages_dropped: 0,
      total_summary_offers: 0,
      forwarded_summary_attempts: 0,
      forwarded_summary_rejected: 0,
      max_forwarded_attempts_per_second: 0,
      stub_forwarded_calls: 0,
      stub_rejected_calls: 0,
    };

    const streams = new Map<Id, StreamState>();
    const candidateAcceptedIds = new Set<Id>();
    const candidateRejectedIds = new Set<Id>();
    const postAcceptanceDroppedIds = new Set<Id>();
    let statusResult: StatusResult | null = null;
    const acceptedIds = new Set<Id>();
    const droppedIds = new Set<Id>();
    const retainedIds = new Set<Id>();
    const deliveredBytesById = new Map<Id, number>();
    const candidateDeliveredBytesById = new Map<Id, number>();
    const offeredBySecond = new Map<number, Set<Id>>();
    const expectedOffers = new Map<Id, ExpectedSummaryOffer>();
    const expectedMessages = new Map<Id, {
      readonly request_seq: number;
      readonly connection_id: Id;
      readonly bytes: number;
    }>();
    const withheldBySecond = new Map<number, Set<Id>>();
    const bufferObservationIds = new Set<Id>();
    const bufferSnapshots = new Map<Id, ConnectionBufferSnapshot>();
    let lastBufferObservedMs = -1;
    const stalledStreams = new Set<Id>();
    const reconnectedStreams = new Set<Id>();
    const memorySamples: number[] = [];

    let limits: OverloadLimits | null = null;
    let limitsConflict = false;
    let deliveryIntegrity = true;
    let drainResult: DrainResult | null = null;
    let drainDurationMs = 0;
    let attemptBaseMs = 0;
    let livenessObserved = true;
    let buffersWithinLimit = true;
    let processSessionId: Id | null = null;
    let terminatedAfterDrain = false;
    let terminationMs: number | null = null;

    try {
      this.summarizerStub.reset();
      await this.controller.resetState();
      this.session.beginProcessSession();
      this.nextRequestSequence = 1;
      this.processSessionId = null;
      this.processIdentity = null;
      this.processObservationIds.clear();
      this.lastProcessObservedMs = -1;

      const setupStartMs = this.scheduler.nowMs();
      attemptBaseMs = setupStartMs;
      for (let index = 1; index <= OVERLOAD_WORKLOAD.client_count; index++) {
        const connectionId = `conn-${String(index).padStart(2, "0")}`;
        const response = await this.call("open", { connection_id: connectionId });
        if (!response.ok) {
          failures.push(`open '${connectionId}' rejected: ${response.error.code}: ${response.error.message}`);
          continue;
        }
        const result = validateOverloadResult("open", response.result) as OpenResult;
        if (result.connection_id !== connectionId) {
          failures.push(`open answered for '${result.connection_id}', expected '${connectionId}'`);
        }
        if (limits === null) {
          limits = result.limits;
        } else if (!sameLimits(limits, result.limits)) {
          limitsConflict = true;
        }
        if (result.admitted) {
          streams.set(connectionId, { connection_id: connectionId, closed: false });
        }
      }

      const setupElapsedMs = this.scheduler.nowMs() - setupStartMs;
      if (setupElapsedMs > OVERLOAD_WORKLOAD.setup_deadline_ms) {
        failures.push(
          `setup took ${setupElapsedMs}ms, exceeding the ${OVERLOAD_WORKLOAD.setup_deadline_ms}ms setup deadline`
        );
      }

      const prelossAdmitted = streams.size;
      await this.sampleProcess("setup", memorySamples, failures, unverified);

      // Workload time t=0 is readiness: every schedule bound is relative to it.
      const t0 = this.scheduler.nowMs();
      this.summarizerStub.beginWorkload(t0);

      for (let second = 0; second < 60; second++) {
        const secondStartMs = t0 + second * 1000;
        const secondEndMs = secondStartMs + 1000;
        await this.scheduler.waitUntil(secondStartMs);

        if (second === 30) {
          stalledStreams.clear();
          const active = activeConnectionIds(streams);
          for (const connectionId of active.slice(0, OVERLOAD_WORKLOAD.stall_readers)) {
            stalledStreams.add(connectionId);
          }
        }

        if (second === 35) {
          const active = activeConnectionIds(streams).slice(
            0,
            OVERLOAD_WORKLOAD.reconnect_streams
          );
          for (const connectionId of active) {
            const response = await this.call("open", { connection_id: connectionId });
            if (!response.ok) {
              failures.push(`reconnect '${connectionId}' rejected: ${response.error.code}`);
              continue;
            }
            const result = validateOverloadResult("open", response.result) as OpenResult;
            if (result.connection_id !== connectionId) {
              failures.push(`reconnect answered for '${result.connection_id}', expected '${connectionId}'`);
            }
            if (result.admitted) {
              reconnectedStreams.add(connectionId);
            } else {
              unverified.push(`reconnect of the same logical ID '${connectionId}' was not admitted`);
            }
          }
        }

        if (second === 30 || second === 45) {
          await this.sampleProcess(`t=${second}s`, memorySamples, failures, unverified);
        }

        const withheldThisSecond = new Set<Id>();

        for (let step = 0; step < OVERLOAD_WORKLOAD.messages_per_second; step++) {
          const stepTargetMs = secondStartMs + step * OVERLOAD_WORKLOAD.message_interval_ms;
          await this.scheduler.waitUntil(stepTargetMs);
          const stepNow = this.scheduler.nowMs();
          if (stepNow < secondStartMs || stepNow >= secondEndMs) {
            unverified.push(
              `workload step ${step} at second ${second} executed at ${stepNow}ms outside window [${secondStartMs}, ${secondEndMs})`
            );
          }

          for (const stream of streams.values()) {
            if (stream.closed) continue;

            const messageId = `msg-${stream.connection_id}-s${second}-i${step}`;
            // Trust anchor: the id is trusted on this connection exactly when
            // the driver issues it, before the send is dispatched, so a
            // candidate forwarding during send handling is judged on the same
            // record a real run would use.
            this.summarizerStub.registerWorkloadMessage(stream.connection_id, messageId);
            const syntheticBytes = generateSyntheticMessageBytes(
              messageId,
              OVERLOAD_WORKLOAD.message_bytes
            );
            metrics.total_messages_allocated += 1;
            metrics.total_bytes_allocated += syntheticBytes.length;

            const offer =
              step === 0
                ? {
                    offer_id: `offer-${stream.connection_id}-w${second}`,
                    window_index: second,
                  }
                : undefined;
            const expectedSeq = this.nextRequestSequence;
            expectedMessages.set(messageId, {
              request_seq: expectedSeq,
              connection_id: stream.connection_id,
              bytes: syntheticBytes.length,
            });
            if (offer !== undefined) {
              expectedOffers.set(offer.offer_id, {
                seq: expectedSeq,
                connection_id: stream.connection_id,
                message_id: messageId,
                offer_id: offer.offer_id,
                window_index: offer.window_index,
                byte_count: syntheticBytes.length,
                sha256: createHash("sha256").update(syntheticBytes).digest("hex"),
              });
            }
            const sideband: TransportSideband =
              offer === undefined
                ? { syntheticBytes }
                : { syntheticBytes, requested_summary: offer };
            const response = await this.call(
              "send",
              {
                connection_id: stream.connection_id,
                message_id: messageId,
                bytes: OVERLOAD_WORKLOAD.message_bytes,
              },
              sideband
            );
            if (!response.ok) {
              failures.push(`send '${messageId}' rejected: ${response.error.code}: ${response.error.message}`);
              continue;
            }
            const result = validateOverloadResult("send", response.result) as SendResult;
            if (result.message_id !== messageId) {
              failures.push(`send answered for '${result.message_id}', expected '${messageId}'`);
            }
            if (result.status === "accepted") {
              candidateAcceptedIds.add(messageId);
            } else {
              candidateRejectedIds.add(messageId);
            }
          }
        }

        for (const stream of streams.values()) {
          if (stream.closed) continue;
          if (
            stalledStreams.has(stream.connection_id) &&
            second >= 30 &&
            second < 40
          ) {
            withheldThisSecond.add(stream.connection_id);
            continue;
          }

          const response = await this.call("read", {
            connection_id: stream.connection_id,
            max_bytes: OVERLOAD_WORKLOAD.read_max_bytes,
          });
          if (!response.ok) {
            failures.push(
              `read '${stream.connection_id}' rejected: ${response.error.code}: ${response.error.message}`
            );
            continue;
          }
          const result = validateOverloadResult("read", response.result) as ReadResult;
          for (const delivered of result.delivered) {
            if (!candidateAcceptedIds.has(delivered.message_id)) {
              deliveryIntegrity = false;
              failures.push(
                `read '${stream.connection_id}' returned message '${delivered.message_id}' that candidate never accepted`
              );
              continue;
            }
            if (candidateDeliveredBytesById.has(delivered.message_id)) {
              deliveryIntegrity = false;
              failures.push(`message '${delivered.message_id}' was delivered more than once`);
              continue;
            }
            if (delivered.bytes !== OVERLOAD_WORKLOAD.message_bytes) {
              deliveryIntegrity = false;
              failures.push(
                `message '${delivered.message_id}' reported ${delivered.bytes} delivered bytes, expected the ${OVERLOAD_WORKLOAD.message_bytes} allocated`
              );
              continue;
            }
            candidateDeliveredBytesById.set(delivered.message_id, delivered.bytes);
          }
          if (result.closed) {
            stream.closed = true;
          }
        }

        if (!(await this.sampleProcess(`t=${second}s`, memorySamples, failures, unverified))) {
          livenessObserved = false;
        }
        const secondReadsFinishedMs = this.scheduler.nowMs();
        const snapshot = await this.controller.observeConnectionBufferSnapshot();
        if (snapshot === null) {
          buffersWithinLimit = false;
          unverified.push(`per-connection buffer observation unavailable at t=${second}s`);
        } else {
          const nowMs = this.scheduler.nowMs();
          const expectedConnections = activeConnectionIds(streams);
          const observedConnections = snapshot.connection_buffers
            .map((entry) => entry.connection_id)
            .sort();
          let snapshotValid = true;
          if (
            snapshot.attempt_id !== this.summarizerStub.attemptId ||
            (this.processSessionId !== null && snapshot.process_session_id !== this.processSessionId) ||
            snapshot.complete !== true ||
            !snapshot.observation_id ||
            bufferObservationIds.has(snapshot.observation_id) ||
            !Number.isSafeInteger(snapshot.observed_monotonic_ms) ||
            snapshot.observed_monotonic_ms < secondReadsFinishedMs ||
            snapshot.observed_monotonic_ms < lastBufferObservedMs ||
            snapshot.observed_monotonic_ms > nowMs ||
            observedConnections.length !== expectedConnections.length ||
            observedConnections.some((id, index) => id !== expectedConnections[index])
          ) {
            snapshotValid = false;
            buffersWithinLimit = false;
            unverified.push(`per-connection buffer snapshot has incomplete or invalid provenance/population at t=${second}s`);
          }
          if (snapshot.observation_id) {
            bufferObservationIds.add(snapshot.observation_id);
          }
          if (
            Number.isSafeInteger(snapshot.observed_monotonic_ms) &&
            snapshot.observed_monotonic_ms >= 0
          ) {
            lastBufferObservedMs = snapshot.observed_monotonic_ms;
          }
          if (processSessionId === null) {
            processSessionId = snapshot.process_session_id;
            this.processSessionId = snapshot.process_session_id;
          } else if (processSessionId !== snapshot.process_session_id) {
            snapshotValid = false;
            buffersWithinLimit = false;
            unverified.push(`buffer snapshot process session changed at t=${second}s`);
          }

          const seenConnections = new Set<Id>();
          const limit = limits?.max_buffer_bytes_per_connection ?? 0;
          for (const entry of snapshot.connection_buffers) {
            if (
              seenConnections.has(entry.connection_id) ||
              !Number.isSafeInteger(entry.buffered_bytes) ||
              entry.buffered_bytes < 0
            ) {
              snapshotValid = false;
              buffersWithinLimit = false;
              unverified.push(`connection '${entry.connection_id}' has duplicate or invalid buffer evidence`);
              continue;
            }
            seenConnections.add(entry.connection_id);
            if (entry.buffered_bytes > limit) {
              buffersWithinLimit = false;
              failures.push(
                `connection '${entry.connection_id}' buffered ${entry.buffered_bytes} bytes above the declared ${limit}-byte limit`
              );
            }
          }
          if (snapshotValid && snapshot.observation_id) {
            bufferSnapshots.set(snapshot.observation_id, snapshot);
          }
        }

        if (this.scheduler.isVirtual === true) {
          this.summarizerStub.advanceTo(this.scheduler.nowMs());
        }

        if (withheldThisSecond.size > 0) {
          withheldBySecond.set(second, withheldThisSecond);
        }
      }

      const statusResponse = await this.call("status", {});
      if (!statusResponse.ok) {
        unverified.push(`status rejected: ${statusResponse.error.code}; candidate counters unreconciled`);
      } else {
        statusResult = validateOverloadResult("status", statusResponse.result) as StatusResult;
      }
      await this.scheduler.waitUntil(t0 + OVERLOAD_WORKLOAD.drain_at_ms);
      await this.sampleProcess("t=60s", memorySamples, failures, unverified);
      const drainStartMs = this.scheduler.nowMs();
      // The 100 ms diagnostic bound (one grid tick, NOT an SRS number) also
      // applies to the drain start; workload steps keep the strict window.
      if (drainStartMs > t0 + OVERLOAD_WORKLOAD.drain_at_ms + DIAGNOSTIC_BOUND_MS) {
        unverified.push(
          `drain started late at ${drainStartMs}ms (target ${t0 + OVERLOAD_WORKLOAD.drain_at_ms}ms)`
        );
      }
      const drainResponse = await this.call("drain", {}, undefined, this.drainTimeoutMs);
      drainDurationMs = this.scheduler.nowMs() - drainStartMs;
      if (!drainResponse.ok) {
        failures.push(`drain rejected: ${drainResponse.error.code}: ${drainResponse.error.message}`);
      } else {
        drainResult = validateOverloadResult("drain", drainResponse.result) as DrainResult;
      }

      // Independent termination: the runtime boundary must report the candidate
      // gone within the candidate's declared drain deadline. The candidate's own
      // `terminated: true` label is not accepted as proof.
      const drainDeadlineMs = limits?.drain_deadline_ms ?? OVERLOAD_WORKLOAD.drain_deadline_ms;
      const terminationDeadlineMs = Math.min(drainStartMs + drainDeadlineMs, t0 + 65_000);
      let terminationOutcome: "exited" | "failed" | "unverified" = "unverified";
      for (;;) {
        const observation = await this.controller.getTerminationObservation();
        const nowMs = this.scheduler.nowMs();
        if (
          observation.attempt_id !== this.summarizerStub.attemptId ||
          observation.process_session_id !== processSessionId ||
          !observation.observation_id ||
          this.processObservationIds.has(observation.observation_id) ||
          !Number.isSafeInteger(observation.observed_monotonic_ms) ||
          observation.observed_monotonic_ms < drainStartMs ||
          observation.observed_monotonic_ms > nowMs
        ) {
          terminationOutcome = "unverified";
          unverified.push("post-drain process observation has invalid provenance");
          break;
        }
        this.processObservationIds.add(observation.observation_id);
        this.lastProcessObservedMs = Math.max(
          this.lastProcessObservedMs,
          observation.observed_monotonic_ms
        );
        if (observation.phase === "unknown") {
          terminationOutcome = "unverified";
          unverified.push("post-drain candidate process state is unknown");
          break;
        }
        if (observation.pid !== this.processIdentity) {
          terminationOutcome = "failed";
          failures.push("post-drain process observation PID does not match the workload PID");
          break;
        }
        if (observation.phase === "exited") {
          if (!observation.exit_receipt_id) {
            terminationOutcome = "unverified";
            unverified.push("post-drain exit receipt identity is unavailable");
            break;
          }
          terminationMs = observation.observed_monotonic_ms - drainStartMs;
          if (observation.observed_monotonic_ms <= terminationDeadlineMs) {
            terminationOutcome = "exited";
            terminatedAfterDrain = true;
          } else {
            terminationOutcome = "failed";
            failures.push(`candidate exit receipt arrived after the ${drainDeadlineMs}ms drain deadline`);
          }
          if (
            !Number.isSafeInteger(observation.last_live_memory_rss_bytes) ||
            observation.last_live_memory_rss_bytes > OVERLOAD_WORKLOAD.memory_cap_bytes
          ) {
            failures.push("candidate last-live RSS exceeded the cap or was invalid at exit");
          } else {
            memorySamples.push(observation.last_live_memory_rss_bytes);
          }
          break;
        }
        if (nowMs >= terminationDeadlineMs) {
          terminationMs = observation.observed_monotonic_ms - drainStartMs;
          terminationOutcome = "failed";
          failures.push(
            `candidate process was still live at the ${drainDeadlineMs}ms drain deadline`
          );
          break;
        }
        await this.scheduler.waitUntil(Math.min(terminationDeadlineMs, nowMs + 1));
      }
      if (terminationMs === null) {
        terminationMs = Math.max(0, this.scheduler.nowMs() - drainStartMs);
      }
      if (terminationOutcome === "failed" && !failures.some((f) => /drain deadline|PID does not match|exited|live/.test(f))) {
        failures.push(
          `candidate process was not independently confirmed exited after drain (${terminationMs}ms)`
        );
      }

      const dispositionsVerified = await this.readMessageDispositions(
        expectedMessages,
        bufferSnapshots,
        candidateAcceptedIds,
        candidateRejectedIds,
        candidateDeliveredBytesById,
        acceptedIds,
        droppedIds,
        postAcceptanceDroppedIds,
        retainedIds,
        deliveredBytesById,
        processSessionId,
        failures,
        unverified
      );
      deliveryIntegrity = deliveryIntegrity && dispositionsVerified;

      if (statusResult !== null) {
        const totalObservedDrops = droppedIds.size + postAcceptanceDroppedIds.size;
        if (statusResult.dropped_count < totalObservedDrops) {
          unverified.push(
            `candidate dropped_count ${statusResult.dropped_count} understates the independently counted ${totalObservedDrops} total drops`
          );
        }
      }

      // Settle every forwarded summary before grading. A real scheduler fires
      // its own timers, so wait out the latest due time plus the diagnostic
      // bound (capped by the attempt deadline) instead of grading a request
      // that is still in flight; anything that fires later is still observed as
      // late rather than as missing, by polling in diagnostic ticks.
      const settleDeadlineMs = attemptBaseMs + OVERLOAD_WORKLOAD.attempt_deadline_ms;
      const latestDueMs = this.summarizerStub.getLedger().reduce(
        (latest, entry) =>
          entry.scheduled_ms !== null && entry.scheduled_ms > latest ? entry.scheduled_ms : latest,
        0
      );
      await this.scheduler.waitUntil(
        Math.min(latestDueMs + DIAGNOSTIC_BOUND_MS, settleDeadlineMs)
      );
      while (this.summarizerStub.pendingCount > 0 && this.scheduler.nowMs() < settleDeadlineMs) {
        await this.scheduler.waitUntil(
          Math.min(this.scheduler.nowMs() + DIAGNOSTIC_BOUND_MS, settleDeadlineMs)
        );
      }
      if (this.scheduler.isVirtual === true) {
        this.summarizerStub.advanceTo(this.scheduler.nowMs());
      }
      const attemptElapsedMs = this.scheduler.nowMs() - attemptBaseMs;
      if (attemptElapsedMs > OVERLOAD_WORKLOAD.attempt_deadline_ms) {
        failures.push(
          `attempt took ${attemptElapsedMs}ms, exceeding the ${OVERLOAD_WORKLOAD.attempt_deadline_ms}ms wall limit`
        );
      }

      metrics.total_messages_accepted = acceptedIds.size;
      metrics.total_messages_delivered = deliveredBytesById.size;
      metrics.total_bytes_delivered = [...deliveredBytesById.values()].reduce(
        (sum, bytes) => sum + bytes,
        0
      );
      metrics.total_messages_dropped = droppedIds.size;


      const stubLedger = this.summarizerStub.getLedger();
      metrics.stub_forwarded_calls = stubLedger.length;
      metrics.forwarded_summary_attempts = stubLedger.length;
      metrics.forwarded_summary_rejected = stubLedger.filter(
        (entry) => entry.error_code === "OVERLOADED"
      ).length;
      metrics.stub_rejected_calls = metrics.forwarded_summary_rejected;

      if (this.summarizerStub.pendingCount > 0) {
        unverified.push(
          `${this.summarizerStub.pendingCount} forwarded summary attempt(s) had no completed observation`
        );
      }
      if (this.summarizerStub.isExhausted) {
        unverified.push("summarizer stub exhausted its bounded observation ledger");
      }

      const transportVerified = await this.readTransportObservation(
        metrics,
        expectedOffers,
        offeredBySecond,
        processSessionId,
        t0,
        failures,
        unverified
      );
      const timingEvidence: SummarizerTimingEvidence[] = stubLedger.map((entry) => ({
        entry_id: entry.entry_id,
        arrival_ms: entry.arrival_ms,
        scheduled_ms: entry.scheduled_ms,
        completed_ms: entry.completed_ms,
        latency_ms: entry.latency_ms,
        lateness_ms:
          entry.completed_ms !== null && entry.scheduled_ms !== null
            ? entry.completed_ms - entry.scheduled_ms
            : null,
      }));

      for (const entry of stubLedger) {
        if (entry.completed_ms === null) {
          unverified.push(`forwarded summary entry '${entry.entry_id}' had no completed observation`);
        } else {
          const expectedScheduled = entry.arrival_ms + this.summarizerStub.serviceLatency;
          if (
            entry.scheduled_ms === null ||
            entry.latency_ms === null ||
            entry.completed_ms < entry.scheduled_ms ||
            entry.scheduled_ms !== expectedScheduled ||
            entry.latency_ms < 0 ||
            entry.latency_ms !== entry.completed_ms - entry.arrival_ms
          ) {
            failures.push(`forwarded summary entry '${entry.entry_id}' has invalid timing or was backdated`);
          } else if (entry.completed_ms - entry.scheduled_ms > DIAGNOSTIC_BOUND_MS) {
            // Parent-set diagnostic bound = one workload grid tick; NOT an SRS number.
            unverified.push(
              `forwarded summary entry '${entry.entry_id}' exceeded the parent-set 100ms diagnostic timing bound (lateness ${entry.completed_ms - entry.scheduled_ms}ms)`
            );
          }
        }
      }

      const windowDiagnostics: OverloadWindowDiagnostic[] = [];
      for (let w = 0; w < 60; w++) {
        let accCount = 0;
        let accBytes = 0;
        let delCount = 0;
        let delBytes = 0;
        let rejCount = 0;
        let rejBytes = 0;
        let drpCount = 0;
        let drpBytes = 0;
        let retCount = 0;
        let retBytes = 0;
        let unresolvedCount = 0;

        // Diagnostics come from independent dispositions only: the candidate's
        // own send replies and drain label are never the source of these counts.
        for (const [msgId, meta] of expectedMessages) {
          const match = /-s(\d+)-i\d+$/.exec(msgId);
          if (match === null || Number(match[1]) !== w) continue;
          if (droppedIds.has(msgId)) {
            rejCount += 1;
            rejBytes += meta.bytes;
            continue;
          }
          if (!acceptedIds.has(msgId)) {
            unresolvedCount += 1;
            continue;
          }
          accCount += 1;
          accBytes += meta.bytes;
          if (deliveredBytesById.has(msgId)) {
            delCount += 1;
            delBytes += meta.bytes;
          } else if (postAcceptanceDroppedIds.has(msgId)) {
            drpCount += 1;
            drpBytes += meta.bytes;
          } else if (retainedIds.has(msgId)) {
            retCount += 1;
            retBytes += meta.bytes;
          } else {
            unresolvedCount += 1;
          }
        }

        windowDiagnostics.push({
          window_index: w,
          accepted_count: accCount,
          accepted_bytes: accBytes,
          delivered_count: delCount,
          delivered_bytes: delBytes,
          rejected_count: rejCount,
          rejected_bytes: rejBytes,
          dropped_count: drpCount,
          dropped_bytes: drpBytes,
          retained_count: retCount,
          retained_bytes: retBytes,
          unresolved_count: unresolvedCount,
        });
      }
      const coverage = this.buildCoverage(
        prelossAdmitted,
        offeredBySecond,
        withheldBySecond,
        stalledStreams,
        reconnectedStreams,
        drainResult,
        drainDurationMs,
        limits,
        acceptedIds.size,
        deliveredBytesById.size,
        postAcceptanceDroppedIds.size
      );

      const safety = this.buildSafety(
        prelossAdmitted,
        coverage,
        stubLedger,
        limits,
        limitsConflict,
        deliveryIntegrity,
        droppedIds,
        deliveredBytesById,
        memorySamples,
        transportVerified,
        t0,
        livenessObserved,
        buffersWithinLimit,
        terminatedAfterDrain
      );
      metrics.max_forwarded_attempts_per_second = safety.max_forwarded_attempts_per_second;

      const safetyPass =
        safety.downstream_capacity_honored &&
        safety.dropped_not_labeled_delivered &&
        safety.limits_fit_diagnostic_policy &&
        safety.retries_within_declared_bound &&
        safety.process_observation_bounded &&
        safety.liveness_observed &&
        safety.connection_buffers_within_limit &&
        safety.terminated_after_drain &&
        safety.transport_observation_verified;

      const wholeCasePass =
        coverage.all_coverage_met && safetyPass && failures.length === 0 && unverified.length === 0;
      const failureReasons = boundReasons(failures);
      const unverifiedReasons = boundReasons(unverified);

      return {
        case_id: "overload",
        passed: wholeCasePass,
        whole_case_pass: wholeCasePass,
        coverage,
        safety,
        metrics,
        timing_evidence: timingEvidence,
        window_diagnostics: windowDiagnostics,
        failure_reasons: failureReasons.reasons,
        unverified_reasons: unverifiedReasons.reasons,
        failure_reason_count: failureReasons.count,
        unverified_reason_count: unverifiedReasons.count,
      };
    } catch (err) {
      if (err instanceof ExchangeFailure) {
        failures.push(`${err.kind} failure: ${err.message}`);
      } else {
        failures.push(`driver error: ${(err as Error).message}`);
      }
      metrics.total_messages_accepted = acceptedIds.size;
      metrics.total_messages_delivered = deliveredBytesById.size;
      metrics.total_messages_dropped = droppedIds.size;
      const failureReasons = boundReasons(failures);
      const unverifiedReasons = boundReasons(unverified);
      return {
        case_id: "overload",
        passed: false,
        whole_case_pass: false,
        coverage: emptyCoverage(),
        safety: emptySafety(),
        metrics,
        timing_evidence: [],
        window_diagnostics: [],
        failure_reasons: failureReasons.reasons,
        unverified_reasons: unverifiedReasons.reasons,
        failure_reason_count: failureReasons.count,
        unverified_reason_count: unverifiedReasons.count,
      };
    }
  }

  private buildCoverage(
    prelossAdmitted: number,
    offeredBySecond: ReadonlyMap<number, ReadonlySet<Id>>,
    withheldBySecond: ReadonlyMap<number, ReadonlySet<Id>>,
    stalledStreams: ReadonlySet<Id>,
    reconnectedStreams: ReadonlySet<Id>,
    drainResult: DrainResult | null,
    drainDurationMs: number,
    limits: OverloadLimits | null,
    acceptedCount: number,
    deliveredCount: number,
    droppedAfterAcceptanceCount: number
  ): OverloadCoverage {
    const postLoss1 = minimumOffers(offeredBySecond, 30, 45);
    const postLoss2 = minimumOffers(offeredBySecond, 45, 60);

    let stalledObserved = 0;
    let stallSeconds = 0;
    for (const connectionId of stalledStreams) {
      let seconds = 0;
      for (let second = 30; second < 40; second++) {
        if (withheldBySecond.get(second)?.has(connectionId) === true) {
          seconds += 1;
        }
      }
      if (seconds === 10) {
        stalledObserved += 1;
        stallSeconds = 10;
      }
    }

    const drainDeadlineMs = limits?.drain_deadline_ms ?? OVERLOAD_WORKLOAD.drain_deadline_ms;
    const drainBounded =
      drainResult !== null && drainResult.terminated && drainDurationMs <= drainDeadlineMs;

    // D1 does not define `undelivered_count`, so this stays a cross-check, not
    // the authority (per-message reconciliation is). A candidate may report
    // either what it still retains, or retained plus what it dropped after
    // accepting; a value matching neither is a failure of the cross-check.
    const retainedByDriver = acceptedCount - deliveredCount - droppedAfterAcceptanceCount;
    const undeliveredBounded =
      drainResult !== null &&
      drainBounded &&
      (drainResult.undelivered_count === retainedByDriver ||
        drainResult.undelivered_count === acceptedCount - deliveredCount);

    const allCoverageMet =
      prelossAdmitted > 20 &&
      postLoss1 > 20 &&
      postLoss2 > 12 &&
      stalledObserved === OVERLOAD_WORKLOAD.stall_readers &&
      reconnectedStreams.size === OVERLOAD_WORKLOAD.reconnect_streams &&
      drainBounded &&
      undeliveredBounded;

    return {
      preloss_admitted_streams: prelossAdmitted,
      post_loss1_offered_streams: postLoss1,
      post_loss2_offered_streams: postLoss2,
      reader_stalls_observed: stalledObserved,
      reader_stall_seconds: stallSeconds,
      reconnects_observed: reconnectedStreams.size,
      drain_bounded: drainBounded,
      drain_duration_ms: drainDurationMs,
      undelivered_bounded: undeliveredBounded,
      all_coverage_met: allCoverageMet,
    };
  }

  private buildSafety(
    prelossAdmitted: number,
    coverage: OverloadCoverage,
    stubLedger: readonly SummarizerLedgerEntry[],
    limits: OverloadLimits | null,
    limitsConflict: boolean,
    deliveryIntegrity: boolean,
    droppedIds: ReadonlySet<Id>,
    deliveredIds: ReadonlyMap<Id, number>,
    memorySamples: readonly number[],
    transportVerified: boolean,
    originMs: number,
    livenessObserved: boolean,
    buffersWithinLimit: boolean,
    terminatedAfterDrain: boolean
  ): OverloadSafety {
    // Grade EVERY independently observed forward attempt — completed, rejected
    // and retried — against the residual capacity of the second it arrived in.
    // A candidate that floods the stub and gets rejected is still unsound.
    const attemptsBySecond = new Map<number, number>();
    let peakForwarded = 0;
    for (const entry of stubLedger) {
      const bucket = Math.floor((entry.arrival_ms - originMs) / 1000);
      const attempts = (attemptsBySecond.get(bucket) ?? 0) + 1;
      attemptsBySecond.set(bucket, attempts);
      if (attempts > peakForwarded) {
        peakForwarded = attempts;
      }
    }

    let capacityHonored = true;
    for (const [bucket, attempts] of attemptsBySecond) {
      if (attempts > this.summarizerStub.getCapacityForSecond(bucket)) {
        capacityHonored = false;
      }
    }

    let droppedNotDelivered = deliveryIntegrity;
    for (const messageId of droppedIds) {
      if (deliveredIds.has(messageId)) {
        droppedNotDelivered = false;
      }
    }

    const maxRetries = limits?.max_retries_per_request ?? 0;
    const attemptsByRequest = new Map<Id, number>();
    const attemptsByLogical = new Map<string, number>();
    for (const entry of stubLedger) {
      if (entry.request_id) {
        attemptsByRequest.set(entry.request_id, (attemptsByRequest.get(entry.request_id) ?? 0) + 1);
      }
      if (entry.connection_id && entry.message_ids.length > 0) {
        const logicalKey = `${entry.connection_id}:${[...entry.message_ids].sort().join(",")}`;
        attemptsByLogical.set(logicalKey, (attemptsByLogical.get(logicalKey) ?? 0) + 1);
      }
    }
    const retriesWithinBound =
      [...attemptsByRequest.values()].every((attempts) => attempts <= maxRetries + 1) &&
      [...attemptsByLogical.values()].every((attempts) => attempts <= maxRetries + 1);

    const processObservationBounded =
      memorySamples.length > 0 &&
      memorySamples.every(
        (bytes) => Number.isFinite(bytes) && bytes >= 0 && bytes <= OVERLOAD_WORKLOAD.memory_cap_bytes
      );

    const excessForwarded = stubLedger.filter((entry) => entry.error_code !== null).length;

    return {
      low12_control_rejected: prelossAdmitted <= 12,
      safe_shedding_qualifies:
        prelossAdmitted >= 21 && coverage.all_coverage_met,
      downstream_capacity_honored: capacityHonored,
      dropped_not_labeled_delivered: droppedNotDelivered,
      limits_fit_diagnostic_policy: limits !== null && !limitsConflict,
      retries_within_declared_bound: retriesWithinBound,
      process_observation_bounded: processObservationBounded,
      liveness_observed: livenessObserved,
      connection_buffers_within_limit: buffersWithinLimit,
      terminated_after_drain: terminatedAfterDrain,
      transport_observation_verified: transportVerified,
      declared_limits: limits,
      excess_forwarded_calls: excessForwarded,
      max_forwarded_attempts_per_second: peakForwarded,
    };
  }

  private async readMessageDispositions(
    expectedMessages: ReadonlyMap<
      Id,
      { readonly request_seq: number; readonly connection_id: Id; readonly bytes: number }
    >,
    bufferSnapshots: ReadonlyMap<Id, ConnectionBufferSnapshot>,
    candidateAcceptedIds: ReadonlySet<Id>,
    candidateRejectedIds: ReadonlySet<Id>,
    candidateDelivered: ReadonlyMap<Id, number>,
    acceptedIds: Set<Id>,
    droppedIds: Set<Id>,
    postAcceptanceDroppedIds: Set<Id>,
    retainedIds: Set<Id>,
    deliveredBytesById: Map<Id, number>,
    processSessionId: Id | null,
    failures: string[],
    unverified: string[]
  ): Promise<boolean> {
    const observations = await this.controller.observeMessageDispositions();
    if (observations === null) {
      unverified.push("independent message disposition ledger is unavailable");
      return false;
    }
    const seenEvents = new Set<number>();
    const acceptedEvents = new Set<Id>();
    const terminalEvents = new Map<Id, MessageDispositionObservation>();
    const retainedBytes = new Map<Id, Map<Id, number>>();
    let previousTime = -1;
    let valid = true;
    let expectedEventSeq = 1;
    for (const event of observations) {
      const expected = expectedMessages.get(event.message_id);
      if (
        event.attempt_id !== this.summarizerStub.attemptId ||
        event.process_session_id !== processSessionId ||
        !Number.isSafeInteger(event.event_seq) ||
        event.event_seq !== expectedEventSeq ||
        seenEvents.has(event.event_seq) ||
        !Number.isSafeInteger(event.observed_monotonic_ms) ||
        event.observed_monotonic_ms < previousTime ||
        event.observed_monotonic_ms > this.scheduler.nowMs() ||
        expected === undefined ||
        event.request_seq !== expected.request_seq ||
        event.connection_id !== expected.connection_id ||
        event.bytes !== expected.bytes
      ) {
        failures.push(`message disposition event ${event.event_seq} has invalid provenance, ordering, or message binding`);
        valid = false;
      }
      seenEvents.add(event.event_seq);
      expectedEventSeq += 1;
      previousTime = event.observed_monotonic_ms;
      if (event.state === "accepted") {
        if (acceptedEvents.has(event.message_id) || terminalEvents.has(event.message_id)) {
          failures.push(`message '${event.message_id}' has duplicate or out-of-order acceptance`);
          valid = false;
        }
        acceptedEvents.add(event.message_id);
        continue;
      }
      if (terminalEvents.has(event.message_id)) {
        failures.push(`message '${event.message_id}' has contradictory terminal dispositions`);
        valid = false;
        continue;
      }
      terminalEvents.set(event.message_id, event);
      if (event.state === "delivered" && !acceptedEvents.has(event.message_id)) {
        failures.push(`message '${event.message_id}' was delivered without independent acceptance`);
        valid = false;
      }
      if (event.state === "retained") {
        const snapshot = bufferSnapshots.get(event.buffer_observation_id);
        if (snapshot === undefined || snapshot.complete !== true) {
          failures.push(`retained message '${event.message_id}' references no complete buffer snapshot`);
          valid = false;
        } else if (snapshot.observed_monotonic_ms > event.observed_monotonic_ms) {
          failures.push(
            `retained message '${event.message_id}' references buffer snapshot from future (${snapshot.observed_monotonic_ms}ms > ${event.observed_monotonic_ms}ms)`
          );
          valid = false;
        } else {
          const byConnection = retainedBytes.get(event.buffer_observation_id) ?? new Map<Id, number>();
          byConnection.set(
            event.connection_id,
            (byConnection.get(event.connection_id) ?? 0) + event.bytes
          );
          retainedBytes.set(event.buffer_observation_id, byConnection);
        }
      }
    }
    for (const [snapshotId, byConnection] of retainedBytes) {
      const snapshot = bufferSnapshots.get(snapshotId)!;
      for (const [connectionId, bytes] of byConnection) {
        const observedBytes = snapshot.connection_buffers.find(
          (entry: ConnectionBufferObservation) => entry.connection_id === connectionId
        )?.buffered_bytes;
        if (observedBytes === undefined || observedBytes < bytes) {
          failures.push(`retained messages exceed snapshot '${snapshotId}' bytes for '${connectionId}'`);
          valid = false;
        }
      }
    }
    for (const messageId of expectedMessages.keys()) {
      const terminal = terminalEvents.get(messageId);
      const isAccepted = acceptedEvents.has(messageId);
      if (isAccepted) {
        acceptedIds.add(messageId);
      }
      if (terminal === undefined) {
        unverified.push(`message '${messageId}' has no independent terminal disposition`);
        valid = false;
      } else if (terminal.state === "delivered") {
        const expected = expectedMessages.get(messageId)!;
        deliveredBytesById.set(messageId, expected.bytes);
        if (!candidateDelivered.has(messageId)) {
          failures.push(`message '${messageId}' was independently delivered but candidate never delivered it`);
          valid = false;
        }
      } else if (terminal.state === "retained") {
        retainedIds.add(messageId);
        if (candidateDelivered.has(messageId)) {
          failures.push(`retained message '${messageId}' was also delivered by candidate`);
          valid = false;
        }
      } else if (terminal.state === "dropped") {
        if (candidateDelivered.has(messageId)) {
          failures.push(`dropped message '${messageId}' was delivered by candidate`);
          valid = false;
        }
        if (isAccepted) {
          postAcceptanceDroppedIds.add(messageId);
        } else {
          droppedIds.add(messageId);
        }
      }

      if (candidateRejectedIds.has(messageId)) {
        if (isAccepted) {
          failures.push(`candidate rejected message '${messageId}' at send time but independent disposition shows accepted`);
          valid = false;
        }
        if (terminal?.state !== "dropped") {
          failures.push(`candidate rejected message '${messageId}' at send time but terminal disposition was not dropped`);
          valid = false;
        }
      } else if (candidateAcceptedIds.has(messageId)) {
        if (!isAccepted) {
          failures.push(`candidate accepted message '${messageId}' at send time but independent disposition shows not accepted`);
          valid = false;
        }
      }
    }
    return valid;
  }

  private async readTransportObservation(
    metrics: MetricsAccumulator,
    expectedOffers: ReadonlyMap<Id, ExpectedSummaryOffer>,
    offeredBySecond: Map<number, Set<Id>>,
    processSessionId: Id | null,
    t0: number,
    failures: string[],
    unverified: string[]
  ): Promise<boolean> {
    if (this.transport.getTransportObservation === undefined) {
      unverified.push("independent transport accounting is unavailable");
      return false;
    }
    let observation: TransportObservation | null;
    try {
      observation = await this.transport.getTransportObservation();
    } catch (err) {
      unverified.push(`transport observation failed: ${(err as Error).message}`);
      return false;
    }
    if (observation === null) {
      unverified.push("independent transport accounting returned nothing");
      return false;
    }
    let valid = true;
    if (observation.sideband_frames !== metrics.total_messages_allocated) {
      failures.push(
        `transport accounted ${observation.sideband_frames} frames, driver allocated ${metrics.total_messages_allocated}`
      );
      valid = false;
    }
    if (observation.sideband_bytes !== metrics.total_bytes_allocated) {
      failures.push(
        `transport accounted ${observation.sideband_bytes} sideband bytes, driver allocated ${metrics.total_bytes_allocated}`
      );
      valid = false;
    }
    const auxiliary = observation.auxiliary;
    if (auxiliary === null) {
      unverified.push("independent auxiliary offer receipts are unavailable");
      return false;
    }
    const nowMs = this.scheduler.nowMs();
    if (
      auxiliary.attempt_id !== this.summarizerStub.attemptId ||
      processSessionId === null ||
      auxiliary.process_session_id !== processSessionId ||
      typeof auxiliary.observation_id !== "string" ||
      auxiliary.observation_id.length === 0 ||
      !Number.isSafeInteger(auxiliary.observed_monotonic_ms) ||
      auxiliary.observed_monotonic_ms < 0 ||
      auxiliary.observed_monotonic_ms > nowMs
    ) {
      failures.push("auxiliary transport observation has invalid attempt/session/identity/time provenance");
      valid = false;
    }
    const seen = new Set<Id>();
    let previousSequence = 0;
    for (const receipt of auxiliary.offer_receipts) {
      const expected = expectedOffers.get(receipt.offer_id);
      if (expected === undefined) {
        failures.push(`auxiliary receipt '${receipt.offer_id}' has no matching requested offer`);
        valid = false;
        continue;
      }
      if (seen.has(receipt.offer_id)) {
        failures.push(`auxiliary offer '${receipt.offer_id}' has duplicate delivery receipts`);
        valid = false;
        continue;
      }
      seen.add(receipt.offer_id);
      if (
        receipt.attempt_id !== this.summarizerStub.attemptId ||
        receipt.process_session_id !== processSessionId ||
        receipt.seq !== expected.seq ||
        receipt.connection_id !== expected.connection_id ||
        receipt.message_id !== expected.message_id ||
        receipt.window_index !== expected.window_index ||
        receipt.byte_count !== expected.byte_count ||
        receipt.sha256 !== expected.sha256 ||
        !Number.isSafeInteger(receipt.seq) ||
        receipt.seq <= previousSequence ||
        !Number.isSafeInteger(receipt.observed_monotonic_ms) ||
        receipt.observed_monotonic_ms < 0 ||
        receipt.observed_monotonic_ms > nowMs ||
        !/^[0-9a-f]{64}$/.test(receipt.sha256)
      ) {
        failures.push(`auxiliary receipt '${receipt.offer_id}' is misbound or has invalid sequence/bytes/hash/time`);
        valid = false;
      }
      const windowStart = t0 + receipt.window_index * 1000;
      const windowEnd = t0 + (receipt.window_index + 1) * 1000;
      if (
        receipt.observed_monotonic_ms < windowStart ||
        receipt.observed_monotonic_ms >= windowEnd
      ) {
        unverified.push(
          `auxiliary offer receipt '${receipt.offer_id}' observed at ${receipt.observed_monotonic_ms}ms outside declared window ${receipt.window_index} [${windowStart}, ${windowEnd})`
        );
        valid = false;
        continue;
      }
      previousSequence = receipt.seq;
      const offered = offeredBySecond.get(receipt.window_index) ?? new Set<Id>();
      offered.add(receipt.connection_id);
      offeredBySecond.set(receipt.window_index, offered);
    }
    for (const offerId of expectedOffers.keys()) {
      if (!seen.has(offerId)) {
        unverified.push(`requested auxiliary offer '${offerId}' has no independent receive-boundary receipt`);
        valid = false;
      }
    }
    metrics.total_summary_offers = seen.size;
    return valid;
  }

  /**
   * Sample the candidate process. A missing memory observation is *unverified*,
   * not a pass: the driver records it and the whole-case verdict is withheld.
   */
  private async sampleProcess(
    label: string,
    samples: number[],
    failures: string[],
    unverified: string[]
  ): Promise<boolean> {
    const observation = await this.controller.getTerminationObservation();
    const nowMs = this.scheduler.nowMs();
    if (
      observation.attempt_id !== this.summarizerStub.attemptId ||
      typeof observation.process_session_id !== "string" ||
      observation.process_session_id.length === 0 ||
      typeof observation.observation_id !== "string" ||
      observation.observation_id.length === 0 ||
      this.processObservationIds.has(observation.observation_id) ||
      !Number.isSafeInteger(observation.observed_monotonic_ms) ||
      observation.observed_monotonic_ms < this.lastProcessObservedMs ||
      observation.observed_monotonic_ms > nowMs
    ) {
      failures.push(`candidate process observation has invalid provenance at ${label}`);
      return false;
    }
    this.processObservationIds.add(observation.observation_id);
    this.lastProcessObservedMs = observation.observed_monotonic_ms;
    if (this.processSessionId === null) {
      this.processSessionId = observation.process_session_id;
    } else if (this.processSessionId !== observation.process_session_id) {
      failures.push(`candidate process session changed at ${label}`);
      return false;
    }
    if (observation.phase === "unknown") {
      unverified.push(`candidate process state unavailable at ${label}`);
      return false;
    }
    if (this.processIdentity === null) {
      this.processIdentity = observation.pid;
    } else if (this.processIdentity !== observation.pid) {
      failures.push(`candidate PID changed at ${label}`);
      return false;
    }
    const rss =
      observation.phase === "running"
        ? observation.memory_rss_bytes
        : observation.last_live_memory_rss_bytes;
    if (observation.phase === "exited") {
      failures.push(`candidate process exited during workload at ${label}`);
    }
    if (!Number.isSafeInteger(rss) || rss < 0) {
      unverified.push(`candidate memory observation unavailable at ${label}`);
      return false;
    }
    if (rss > OVERLOAD_WORKLOAD.memory_cap_bytes) {
      failures.push(
        `candidate memory ${rss} bytes exceeded the ${OVERLOAD_WORKLOAD.memory_cap_bytes} byte run cap at ${label}`
      );
    }
    samples.push(rss);
    return observation.phase === "running";
  }

  private call(
    operation: OverloadOperation,
    payload: Record<string, unknown>,
    sideband?: TransportSideband,
    timeoutMs?: number
  ): Promise<ExchangeResponse> {
    this.nextRequestSequence += 1;
    return this.session.call(operation, payload, {
      sideband,
      timeoutMs,
      validatePayload: PAYLOAD_VALIDATOR,
      validateResult: RESULT_VALIDATOR,
    });
  }
}

function activeConnectionIds(streams: ReadonlyMap<Id, StreamState>): Id[] {
  return [...streams.values()]
    .filter((stream) => !stream.closed)
    .map((stream) => stream.connection_id)
    .sort();
}

function minimumOffers(
  offeredBySecond: ReadonlyMap<number, ReadonlySet<Id>>,
  fromSecond: number,
  toSecond: number
): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (let second = fromSecond; second < toSecond; second++) {
    const offers = offeredBySecond.get(second)?.size ?? 0;
    if (offers < minimum) {
      minimum = offers;
    }
  }
  return Number.isFinite(minimum) ? minimum : 0;
}

function sameLimits(a: OverloadLimits, b: OverloadLimits): boolean {
  return (
    a.max_connections === b.max_connections &&
    a.max_buffer_bytes_per_connection === b.max_buffer_bytes_per_connection &&
    a.drain_deadline_ms === b.drain_deadline_ms &&
    a.max_retries_per_request === b.max_retries_per_request
  );
}

function emptyCoverage(): OverloadCoverage {
  return {
    preloss_admitted_streams: 0,
    post_loss1_offered_streams: 0,
    post_loss2_offered_streams: 0,
    reader_stalls_observed: 0,
    reader_stall_seconds: 0,
    reconnects_observed: 0,
    drain_bounded: false,
    drain_duration_ms: 0,
    undelivered_bounded: false,
    all_coverage_met: false,
  };
}

function emptySafety(): OverloadSafety {
  return {
    low12_control_rejected: false,
    safe_shedding_qualifies: false,
    downstream_capacity_honored: false,
    dropped_not_labeled_delivered: false,
    limits_fit_diagnostic_policy: false,
    retries_within_declared_bound: false,
    process_observation_bounded: false,
    liveness_observed: false,
    connection_buffers_within_limit: false,
    terminated_after_drain: false,
    transport_observation_verified: false,
    declared_limits: null,
    excess_forwarded_calls: 0,
    max_forwarded_attempts_per_second: 0,
  };
}
