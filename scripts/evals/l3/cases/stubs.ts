import type {
  Id,
  Nat,
  ErrorCode,
  ProviderDebitPayload,
  ProviderDebitResult,
  ProviderLookupPayload,
  ProviderLookupResult,
  ProviderPayload,
  ProviderSettlementPayload,
  ProviderSettlementResult,
  SummarizerPayload,
  SummarizerResult,
} from "../contracts.js";
import {
  validateProviderPayload,
  validateProviderResult,
  validateSummarizerPayload,
  validateSummarizerResult,
} from "../contracts.js";
import type { ProviderLedgerEntry, SummarizerLedgerEntry } from "./contracts.js";
import { deferred } from "./exchange.js";

/**
 * scripts/evals/l3/cases/stubs.ts
 *
 * Trusted external-effect stubs. They run in controller-owned code (D4 wires
 * them on the controller side of the attempt), record every call in bounded
 * append-only ledgers, and never expose mutable internals.
 *
 * SRS references: "Payment operation schemas", "Overload operation schemas",
 * LLD-SSE-003 ("Controller and external-effect stub observations are not
 * derived from candidate assertions").
 */

export const MAX_STUB_LEDGER_ENTRIES = 4096;

/**
 * Hard bound on the summarizer's trusted message-id registry.
 *
 * The frozen overload workload allocates `client_count * 60 *
 * messages_per_second = 24 * 60 * 10 = 14 400` message ids, so a candidate can
 * never make more than that many ids legitimate; distinct trusted ids are
 * bounded accordingly (`cases.test.ts` asserts the derivation against
 * `OVERLOAD_WORKLOAD`).
 */
export const MAX_TRUSTED_WORKLOAD_MESSAGES = 14_400;

function assertFiniteTimestamp(value: unknown, context: string): Nat {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${context} must be a finite non-negative timestamp, got ${String(value)}`);
  }
  return Math.floor(value);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

export interface ProviderEvidenceRequest {
  readonly evidence_id: Id;
  readonly instruction_id: Id;
  readonly expected_outcome: "succeeded" | "failed";
  readonly require_final: boolean;
  readonly amount_minor?: number;
  readonly currency?: "USD";
}

export interface ProviderEvidenceVerdict {
  readonly accepted: boolean;
  readonly reason: string;
}

export type ProviderCallOutcome =
  | { readonly kind: "result"; readonly result: ProviderDebitResult | ProviderLookupResult | ProviderSettlementResult }
  | { readonly kind: "error"; readonly error: { readonly code: ErrorCode; readonly message: string } }
  | { readonly kind: "dropped" };

export interface ProviderStubOptions {
  /** Trusted monotonic clock, injected at construction. Never candidate-supplied. */
  readonly clock?: () => number;
  readonly ledgerCap?: number;
}

interface SettlementRecord {
  readonly evidence_id: Id;
  readonly final: boolean;
  readonly outcome: "succeeded" | "failed" | "absent";
}

/**
 * Trusted provider stub.
 *
 * - Commits exactly one debit per `operation_ref` unless deduplication is
 *   explicitly disabled for the changed-constraint schedule.
 * - Binds every committed effect to the exact business instruction and operation
 *   reference chosen by the candidate.
 * - Records rejected, duplicate and malformed calls as bounded observations.
 * - Exhaustion of the bounded ledger returns UNAVAILABLE; it never silently
 *   drops an observation.
 */
export class ProviderStub {
  private readonly ledger: ProviderLedgerEntry[] = [];
  private readonly committedDebits = new Map<Id, ProviderDebitResult>();
  private readonly settlements = new Map<Id, SettlementRecord>();
  private readonly pendingLookups = new Set<Id>();
  private readonly clock: () => number;
  private readonly ledgerCap: number;

  private evidenceCounter = 1;
  private entryCounter = 1;
  private lastTimestamp = -1;
  private exhausted = false;

  public lookupUnavailable = false;
  public deduplicationDisabled = false;
  public dropNextDebitReply = false;

  public constructor(
    public readonly attemptId: Id = "attempt-payment-default",
    options: ProviderStubOptions = {}
  ) {
    this.clock = options.clock ?? (() => Date.now());
    this.ledgerCap = options.ledgerCap ?? MAX_STUB_LEDGER_ENTRIES;
    if (!Number.isSafeInteger(this.ledgerCap) || this.ledgerCap <= 0) {
      throw new Error(`ProviderStub ledgerCap must be a positive safe integer, got ${String(this.ledgerCap)}`);
    }
  }

  public get isExhausted(): boolean {
    return this.exhausted;
  }

  public reset(): void {
    this.ledger.length = 0;
    this.committedDebits.clear();
    this.settlements.clear();
    this.pendingLookups.clear();
    this.evidenceCounter = 1;
    this.entryCounter = 1;
    this.lastTimestamp = -1;
    this.exhausted = false;
    this.lookupUnavailable = false;
    this.deduplicationDisabled = false;
    this.dropNextDebitReply = false;
  }

  public getLedger(): readonly ProviderLedgerEntry[] {
    const snapshot = this.ledger.map((entry) =>
      deepFreeze({
        sequence: entry.sequence,
        entry_id: entry.entry_id,
        attempt_id: entry.attempt_id,
        operation: entry.operation,
        timestamp_ms: entry.timestamp_ms,
        payload: entry.payload === null ? null : { ...entry.payload },
        result: entry.result === null ? null : { ...entry.result },
        error_code: entry.error_code,
        committed: entry.committed,
        duplicate: entry.duplicate,
        dropped_reply: entry.dropped_reply,
      })
    );
    return Object.freeze(snapshot);
  }

  public getCommittedDebits(instructionId: Id): readonly ProviderLedgerEntry[] {
    return this.getLedger().filter(
      (entry) =>
        entry.operation === "debit" &&
        entry.committed &&
        entry.payload !== null &&
        (entry.payload as ProviderDebitPayload).instruction_id === instructionId
    );
  }

  public getDebitAttempts(instructionId: Id): readonly ProviderLedgerEntry[] {
    return this.getLedger().filter(
      (entry) =>
        entry.operation === "debit" &&
        entry.payload !== null &&
        (entry.payload as ProviderDebitPayload).instruction_id === instructionId
    );
  }

  public getSettlement(instructionId: Id): SettlementRecord | null {
    const record = this.settlements.get(instructionId);
    return record === undefined ? null : { ...record };
  }

  public setPendingLookup(operationRef: Id, pending: boolean): void {
    if (pending) {
      if (!this.pendingLookups.has(operationRef) && this.pendingLookups.size >= this.ledgerCap) {
        throw new Error(`ProviderStub pending-lookup capacity (${this.ledgerCap}) exhausted`);
      }
      this.pendingLookups.add(operationRef);
    } else {
      this.pendingLookups.delete(operationRef);
    }
  }

  public setSettlement(instructionId: Id, record: SettlementRecord): void {
    validateProviderResult("settlement", {
      evidence_id: record.evidence_id,
      final: record.final,
      outcome: record.outcome,
    } as unknown as Record<string, unknown>);
    if (!this.settlements.has(instructionId) && this.settlements.size >= this.ledgerCap) {
      throw new Error(`ProviderStub settlement capacity (${this.ledgerCap}) exhausted`);
    }
    this.settlements.set(instructionId, { ...record });
  }

  /**
   * Accept an evidence ID only when the trusted ledger holds that exact ID for
   * this instruction, with a compatible outcome and the required finality.
   */
  public verifyEvidence(request: ProviderEvidenceRequest): ProviderEvidenceVerdict {
    let sawMatchingId = false;
    for (const entry of this.ledger) {
      if (entry.result === null) continue;
      if (!("evidence_id" in entry.result)) continue;
      if (entry.result.evidence_id !== request.evidence_id) continue;
      sawMatchingId = true;

      if (entry.operation === "lookup") {
        return {
          accepted: false,
          reason: `evidence '${request.evidence_id}' is a lookup observation and cannot certify an outcome`,
        };
      }
      if (entry.payload === null) {
        return {
          accepted: false,
          reason: `evidence '${request.evidence_id}' has no validated ledger payload`,
        };
      }

      if (entry.operation === "debit") {
        const payload = entry.payload as ProviderDebitPayload;
        const result = entry.result as ProviderDebitResult;
        if (payload.instruction_id !== request.instruction_id) {
          return {
            accepted: false,
            reason: `debit evidence '${request.evidence_id}' belongs to instruction '${payload.instruction_id}', not '${request.instruction_id}'`,
          };
        }
        if (!entry.committed) {
          return {
            accepted: false,
            reason: `debit evidence '${request.evidence_id}' was not committed`,
          };
        }
        if (result.outcome !== request.expected_outcome) {
          return {
            accepted: false,
            reason: `debit evidence '${request.evidence_id}' outcome '${result.outcome}' != '${request.expected_outcome}'`,
          };
        }
        if (request.amount_minor !== undefined && payload.amount_minor !== request.amount_minor) {
          return {
            accepted: false,
            reason: `debit evidence '${request.evidence_id}' amount ${payload.amount_minor} != ${request.amount_minor}`,
          };
        }
        if (request.currency !== undefined && payload.currency !== request.currency) {
          return {
            accepted: false,
            reason: `debit evidence '${request.evidence_id}' currency '${payload.currency}' != '${request.currency}'`,
          };
        }
        if (request.require_final) {
          return {
            accepted: false,
            reason: `debit evidence '${request.evidence_id}' is not final settlement evidence`,
          };
        }
        return { accepted: true, reason: "committed debit for the exact instruction" };
      }

      const payload = entry.payload as ProviderSettlementPayload;
      const result = entry.result as ProviderSettlementResult;
      if (payload.instruction_id !== request.instruction_id) {
        return {
          accepted: false,
          reason: `settlement evidence '${request.evidence_id}' belongs to instruction '${payload.instruction_id}', not '${request.instruction_id}'`,
        };
      }
      if (result.outcome !== request.expected_outcome) {
        return {
          accepted: false,
          reason: `settlement evidence '${request.evidence_id}' outcome '${result.outcome}' != '${request.expected_outcome}'`,
        };
      }
      if (request.require_final && !result.final) {
        return {
          accepted: false,
          reason: `settlement evidence '${request.evidence_id}' is non-final`,
        };
      }
      if (request.expected_outcome === "succeeded") {
        const committed = this.ledger.filter(
          (candidate) =>
            candidate.operation === "debit" &&
            candidate.committed &&
            candidate.payload !== null &&
            (candidate.payload as ProviderDebitPayload).instruction_id === request.instruction_id
        );
        if (committed.length !== 1) {
          return {
            accepted: false,
            reason: `settlement evidence '${request.evidence_id}' has ${committed.length} committed effects for '${request.instruction_id}', expected exactly 1`,
          };
        }
        const debit = committed[0].payload as ProviderDebitPayload;
        if (request.amount_minor !== undefined && debit.amount_minor !== request.amount_minor) {
          return {
            accepted: false,
            reason: `settlement evidence '${request.evidence_id}' settled amount ${debit.amount_minor} != expected ${request.amount_minor}`,
          };
        }
        if (request.currency !== undefined && debit.currency !== request.currency) {
          return {
            accepted: false,
            reason: `settlement evidence '${request.evidence_id}' settled currency '${debit.currency}' != expected '${request.currency}'`,
          };
        }
      }
      return {
        accepted: true,
        reason: result.final ? "final settlement for the exact instruction and effect" : "non-final settlement for the exact instruction",
      };
    }

    return {
      accepted: false,
      reason: sawMatchingId
        ? `evidence '${request.evidence_id}' is not usable`
        : `evidence '${request.evidence_id}' is absent from the trusted provider ledger`,
    };
  }

  public handleDebit(rawPayload: Record<string, unknown>): ProviderCallOutcome {
    const timestamp_ms = this.readClock();
    if (!this.reserve()) return this.exhaustedOutcome();
    let payload: ProviderDebitPayload;
    try {
      payload = validateProviderPayload("debit", rawPayload) as ProviderDebitPayload;
    } catch (err) {
      const recorded = this.reject("debit", null, timestamp_ms);
      return recorded
        ? { kind: "error", error: { code: "INVALID_REQUEST", message: (err as Error).message } }
        : this.exhaustedOutcome();
    }

    if (!this.deduplicationDisabled) {
      const existing = this.committedDebits.get(payload.operation_ref);
      if (existing !== undefined) {
        const recorded = this.append({
          operation: "debit",
          timestamp_ms,
          payload,
          result: existing,
          error_code: null,
          committed: false,
          duplicate: true,
          dropped_reply: false,
        });
        if (!recorded) return this.exhaustedOutcome();
        return { kind: "result", result: { ...existing } };
      }
    }

    if (!this.committedDebits.has(payload.operation_ref) && this.committedDebits.size >= this.ledgerCap) {
      this.exhausted = true;
      return this.exhaustedOutcome();
    }

    const evidence_id = `ev-debit-${this.evidenceCounter++}`;
    const result: ProviderDebitResult = { evidence_id, outcome: "succeeded" };
    validateProviderResult("debit", result as unknown as Record<string, unknown>);

    this.committedDebits.set(payload.operation_ref, result);
    const dropped = this.dropNextDebitReply;
    this.dropNextDebitReply = false;

    const recorded = this.append({
      operation: "debit",
      timestamp_ms,
      payload,
      result,
      error_code: null,
      committed: true,
      duplicate: false,
      dropped_reply: dropped,
    });
    if (!recorded) return this.exhaustedOutcome();

    return dropped ? { kind: "dropped" } : { kind: "result", result: { ...result } };
  }

  public handleLookup(rawPayload: Record<string, unknown>): ProviderCallOutcome {
    const timestamp_ms = this.readClock();
    if (!this.reserve()) return this.exhaustedOutcome();
    let payload: ProviderLookupPayload;
    try {
      payload = validateProviderPayload("lookup", rawPayload) as ProviderLookupPayload;
    } catch (err) {
      const recorded = this.reject("lookup", null, timestamp_ms);
      return recorded ? { kind: "error", error: { code: "INVALID_REQUEST", message: (err as Error).message } } : this.exhaustedOutcome();
    }

    if (this.lookupUnavailable) {
      const recorded = this.reject("lookup", payload, timestamp_ms);
      return recorded
        ? {
            kind: "error",
            error: { code: "UNAVAILABLE", message: "lookup disabled in the current constraint mode" },
          }
        : this.exhaustedOutcome();
    }

    const evidence_id = this.pendingLookups.has(payload.operation_ref)
      ? `ev-lookup-pending-${this.evidenceCounter++}`
      : `ev-lookup-${this.evidenceCounter++}`;
    const committed = this.committedDebits.get(payload.operation_ref);
    const result: ProviderLookupResult = {
      evidence_id,
      outcome: this.pendingLookups.has(payload.operation_ref)
        ? "pending"
        : committed === undefined
          ? "not_found"
          : committed.outcome,
    };
    validateProviderResult("lookup", result as unknown as Record<string, unknown>);

    const recorded = this.append({
      operation: "lookup",
      timestamp_ms,
      payload,
      result,
      error_code: null,
      committed: false,
      duplicate: false,
      dropped_reply: false,
    });
    return recorded ? { kind: "result", result } : this.exhaustedOutcome();
  }

  public handleSettlement(rawPayload: Record<string, unknown>): ProviderCallOutcome {
    const timestamp_ms = this.readClock();
    if (!this.reserve()) return this.exhaustedOutcome();
    let payload: ProviderSettlementPayload;
    try {
      payload = validateProviderPayload("settlement", rawPayload) as ProviderSettlementPayload;
    } catch (err) {
      const recorded = this.reject("settlement", null, timestamp_ms);
      return recorded ? { kind: "error", error: { code: "INVALID_REQUEST", message: (err as Error).message } } : this.exhaustedOutcome();
    }

    const known = this.settlements.get(payload.instruction_id);
    const result: ProviderSettlementResult =
      known === undefined
        ? { evidence_id: `ev-settlement-absent-${this.evidenceCounter++}`, final: false, outcome: "absent" }
        : { evidence_id: known.evidence_id, final: known.final, outcome: known.outcome };
    validateProviderResult("settlement", result as unknown as Record<string, unknown>);

    const recorded = this.append({
      operation: "settlement",
      timestamp_ms,
      payload,
      result,
      error_code: null,
      committed: known !== undefined && known.final && known.outcome === "succeeded",
      duplicate: false,
      dropped_reply: false,
    });
    return recorded ? { kind: "result", result } : this.exhaustedOutcome();
  }

  private readClock(): Nat {
    const value = assertFiniteTimestamp(this.clock(), "ProviderStub clock");
    if (value < this.lastTimestamp) {
      throw new Error(
        `ProviderStub clock moved backwards: ${value} < ${this.lastTimestamp}`
      );
    }
    this.lastTimestamp = value;
    return value;
  }

  /**
   * Reserve observation capacity *before* any externally visible effect. A full
   * ledger therefore yields UNAVAILABLE with no committed effect, never an
   * effect whose observation was lost.
   */
  private reserve(): boolean {
    if (this.ledger.length >= this.ledgerCap) {
      this.exhausted = true;
      return false;
    }
    return true;
  }

  private reject(
    operation: "debit" | "lookup" | "settlement",
    payload: ProviderPayload | null,
    timestamp_ms: Nat
  ): boolean {
    return this.append({
      operation,
      timestamp_ms,
      payload,
      result: null,
      error_code: "INVALID_REQUEST",
      committed: false,
      duplicate: false,
      dropped_reply: false,
    });
  }

  private append(
    entry: Omit<ProviderLedgerEntry, "sequence" | "entry_id" | "attempt_id">
  ): boolean {
    if (this.ledger.length >= this.ledgerCap) {
      this.exhausted = true;
      return false;
    }
    this.ledger.push({
      sequence: this.ledger.length,
      entry_id: `prov-entry-${this.entryCounter++}`,
      attempt_id: this.attemptId,
      ...entry,
    });
    return true;
  }

  private exhaustedOutcome(): ProviderCallOutcome {
    return {
      kind: "error",
      error: {
        code: "UNAVAILABLE",
        message: `provider stub ledger cap (${this.ledgerCap}) exhausted; further observations cannot be recorded`,
      },
    };
  }
}

export interface SummarizerScheduler {
  readonly nowMs: () => number;
  readonly scheduleAt: (targetMs: Nat, callback: () => void) => () => void;
  /** Required: the driver refuses a stub whose clock mode differs from its own. */
  readonly isVirtual: boolean;
}

export interface SummarizerStubOptions {
  /** Trusted monotonic clock, injected at construction. Never candidate-supplied. */
  readonly nowMs: () => number;
  readonly scheduler?: SummarizerScheduler;
  /** Deterministic service completion latency in scheduler milliseconds. */
  readonly serviceLatencyMs?: number;
  readonly ledgerCap?: number;
  readonly maxPending?: number;
}

export type SummarizerCallOutcome =
  | { readonly kind: "result"; readonly result: SummarizerResult }
  | { readonly kind: "error"; readonly error: { readonly code: ErrorCode; readonly message: string } };
export interface SummarizerCallOptions {
  readonly signal?: AbortSignal;
}

export interface SummarizerCancellation {
  readonly attempt_id: Id;
  readonly entry_id: Id;
  readonly cancelled_ms: Nat;
  readonly reason: "request_cancelled";
}

interface MutableSummarizerEntry {
  sequence: Nat;
  entry_id: Id;
  attempt_id: Id;
  arrival_ms: Nat;
  scheduled_ms: Nat | null;
  completed_ms: Nat | null;
  latency_ms: Nat | null;
  request_id: Id | null;
  connection_id: Id | null;
  message_ids: readonly Id[];
  /** How many named ids were not trusted; such calls record `message_ids: []`. */
  untrusted_message_count: Nat;
  delivered: boolean;
  error_code: ErrorCode | null;
  retry: boolean;
}

interface PendingCompletion {
  readonly entryIndex: number;
  readonly dueMs: Nat;
  readonly outcome: SummarizerCallOutcome;
  readonly resolve: (outcome: SummarizerCallOutcome) => void;
  readonly signal: AbortSignal | undefined;
  cancelTimer: (() => void) | null;
  cancelListener: (() => void) | null;
  state: "pending" | "completed" | "cancelled";
}

/**
 * Trusted summarizer stub.
 *
 * Deterministic per-second downstream capacity — 30 rps for the first 30 s, 20
 * rps for [30,45) and 12 rps from 45 s — measured from the workload origin the
 * driver declares at readiness, never from construction time. Every
 * candidate-forwarded attempt, including retries and rejections, is recorded at
 * arrival; capacity is reserved before the effect; and the completion is
 * asynchronous at exactly `serviceLatencyMs` of the injected clock.
 */
export class SummarizerStub {
  private readonly ledger: MutableSummarizerEntry[] = [];
  private readonly cancellations: SummarizerCancellation[] = [];


  private readonly callsPerSecond = new Map<number, number>();
  private readonly seenRequestIds = new Set<Id>();
  private readonly seenLogicalOffers = new Set<string>();
  /** Driver-issued workload message ids, the only ids a summary may name. */
  private readonly trustedByConnection = new Map<Id, Set<Id>>();
  private trustedMessageCount = 0;
  private readonly pending: PendingCompletion[] = [];
  public readonly nowMs: () => number;
  public readonly scheduler: SummarizerScheduler;
  private readonly serviceLatencyMs: number;
  private readonly ledgerCap: number;
  private readonly maxPending: number;
  private entryCounter = 1;
  private lastTimestamp = -1;
  private exhausted = false;
  private originMs: Nat | null = null;

  public constructor(
    public readonly attemptId: Id = "attempt-overload-default",
    options: SummarizerStubOptions
  ) {
    this.scheduler =
      options.scheduler ??
      {
        nowMs: options.nowMs,
        scheduleAt: (targetMs, callback) => {
          const timer = setTimeout(callback, Math.max(0, targetMs - options.nowMs()));
          return () => clearTimeout(timer);
        },
        isVirtual: false,
      };
    this.nowMs = this.scheduler.nowMs;
    this.serviceLatencyMs = options.serviceLatencyMs ?? 100;
    this.ledgerCap = options.ledgerCap ?? MAX_STUB_LEDGER_ENTRIES;
    this.maxPending = options.maxPending ?? this.ledgerCap;
    if (!Number.isSafeInteger(this.serviceLatencyMs) || this.serviceLatencyMs < 0) {
      throw new Error(
        `SummarizerStub serviceLatencyMs must be a finite non-negative integer, got ${String(this.serviceLatencyMs)}`
      );
    }
    if (!Number.isSafeInteger(this.ledgerCap) || this.ledgerCap <= 0) {
      throw new Error(`SummarizerStub ledgerCap must be a positive safe integer, got ${String(this.ledgerCap)}`);
    }
    if (!Number.isSafeInteger(this.maxPending) || this.maxPending <= 0) {
      throw new Error(`SummarizerStub maxPending must be a positive safe integer, got ${String(this.maxPending)}`);
    }
  }

  public get isExhausted(): boolean {
    return this.exhausted;
  }

  public get pendingCount(): number {
    return this.pending.length;
  }

  /** Configured service completion latency in scheduler milliseconds. */
  public get serviceLatency(): number {
    return this.serviceLatencyMs;
  }

  public get origin(): Nat | null {
    return this.originMs;
  }

  /**
   * Register a driver-issued workload message id on its admitted connection.
   *
   * This is the trust anchor for summarize payloads: the driver calls it for
   * every id it issues, before dispatching the send, so a candidate that
   * forwards during its send handling finds the id already trusted while a
   * fabricated or not-yet-sent id stays untrusted. Registration is driver-only
   * and bounded by the frozen workload size.
   */
  public registerWorkloadMessage(connectionId: Id, messageId: Id): void {
    const registered = this.trustedByConnection.get(connectionId);
    if (registered?.has(messageId) === true) return;
    if (this.trustedMessageCount >= MAX_TRUSTED_WORKLOAD_MESSAGES) {
      throw new Error(
        `summarizer trusted-id registry capacity (${MAX_TRUSTED_WORKLOAD_MESSAGES}) exhausted: the driver issued more workload messages than the frozen workload allocates`
      );
    }
    if (registered === undefined) {
      this.trustedByConnection.set(connectionId, new Set([messageId]));
    } else {
      registered.add(messageId);
    }
    this.trustedMessageCount += 1;
  }

  /**
   * Anchor the workload clock at readiness (workload t=0). Capacity windows are
   * relative to this origin, never to stub construction.
   */
  public beginWorkload(originMs: Nat): void {
    this.originMs = assertFiniteTimestamp(originMs, "SummarizerStub workload origin");
    this.callsPerSecond.clear();
    this.lastTimestamp = this.originMs;
  }

  public reset(): void {
    for (const completion of this.pending) {
      completion.cancelTimer?.();
      if (completion.cancelListener !== null) {
        completion.signal?.removeEventListener("abort", completion.cancelListener);
      }
      completion.state = "cancelled";
      completion.resolve({
        kind: "error",
        error: { code: "UNAVAILABLE", message: "summarizer reset cancelled pending work" },
      });
    }
    this.pending.length = 0;
    this.ledger.length = 0;
    this.cancellations.length = 0;
    this.callsPerSecond.clear();
    this.seenRequestIds.clear();
    this.seenLogicalOffers.clear();
    this.trustedByConnection.clear();
    this.trustedMessageCount = 0;
    this.entryCounter = 1;
    this.lastTimestamp = -1;
    this.exhausted = false;
    this.originMs = null;
  }


  public getLedger(): readonly SummarizerLedgerEntry[] {
    const snapshot = this.ledger.map((entry) =>
      deepFreeze({
        sequence: entry.sequence,
        entry_id: entry.entry_id,
        attempt_id: entry.attempt_id,
        arrival_ms: entry.arrival_ms,
        scheduled_ms: entry.scheduled_ms,
        completed_ms: entry.completed_ms,
        latency_ms: entry.latency_ms,
        request_id: entry.request_id,
        connection_id: entry.connection_id,
        message_ids: [...entry.message_ids],
        untrusted_message_count: entry.untrusted_message_count,
        delivered: entry.delivered,
        error_code: entry.error_code,
        retry: entry.retry,
      })
    );
    return Object.freeze(snapshot);
  }
  /** Immutable cancellation observations, bounded by the ledger cap. */
  public getCancellations(): readonly SummarizerCancellation[] {
    return Object.freeze(this.cancellations.map((cancellation) => deepFreeze({ ...cancellation })));
  }


  public getCallsForSecond(secondBucket: number): number {
    return this.callsPerSecond.get(secondBucket) ?? 0;
  }

  public getCapacityForSecond(secondBucket: number): number {
    if (!Number.isFinite(secondBucket) || secondBucket < 0) return 0;
    if (secondBucket < 30) return 30;
    if (secondBucket < 45) return 20;
    return 12;
  }

  /**
   * Pump completions up to `nowMs` of the injected clock. The controller calls
   * this after pacing the workload; in a real run its own timer performs the
   * same role. Completions are deterministic: they resolve at arrival + latency.
   */
  public advanceTo(nowMs: number): void {
    if (this.scheduler.isVirtual !== true) {
      throw new Error("SummarizerStub.advanceTo is allowed only with a virtual scheduler");
    }
    const now = assertFiniteTimestamp(nowMs, "SummarizerStub advanceTo");
    const remaining: PendingCompletion[] = [];
    for (const completion of this.pending) {
      if (completion.dueMs > now) {
        remaining.push(completion);
        continue;
      }
      this.complete(completion, now);
    }
    this.pending.length = 0;
    this.pending.push(...remaining);
  }

  private complete(completion: PendingCompletion, completedMs: Nat): void {
    if (completion.state !== "pending") return;
    completion.state = "completed";
    completion.cancelTimer?.();
    if (completion.cancelListener !== null) {
      completion.signal?.removeEventListener("abort", completion.cancelListener);
    }
    const entry = this.ledger[completion.entryIndex];
    entry.completed_ms = completedMs;
    entry.latency_ms = completedMs - entry.arrival_ms;
    if (completion.outcome.kind === "result") {
      entry.delivered = true;
      entry.error_code = null;
    } else {
      entry.delivered = false;
      entry.error_code = completion.outcome.error.code;
    }
    completion.resolve(completion.outcome);
  }

  /**
   * Accept a summary request. Capacity is reserved at arrival; the effect
   * completes asynchronously at exactly `serviceLatencyMs` of the injected
   * clock. Rejected attempts (invalid, over-capacity) are still completed and
   * recorded, so every forwarded attempt remains observable.
   */
  public async handleSummarize(
    rawPayload: Record<string, unknown>,
    options: SummarizerCallOptions = {},
  ): Promise<SummarizerCallOutcome> {
    const arrival = this.readClock();


    if (this.originMs === null) {
      return {
        kind: "error",
        error: {
          code: "UNAVAILABLE",
          message: "workload origin was not established before the first summary offer",
        },
      };
    }
    if (this.ledger.length >= this.ledgerCap || this.pending.length >= this.maxPending) {
      this.exhausted = true;
      return this.exhaustedOutcome();
    }

    const secondBucket = Math.floor((arrival - this.originMs) / 1000);

    let payload: SummarizerPayload | null = null;
    let invalidReason = "";
    try {
      payload = validateSummarizerPayload("summarize", rawPayload);
    } catch (err) {
      invalidReason = (err as Error).message;
    }

    if (payload === null) {
      const entryIndex = this.append({
        arrival_ms: arrival,
        request_id: null,
        connection_id: null,
        message_ids: [],
        untrusted_message_count: 0,
        retry: false,
      });
      if (entryIndex === null) return this.exhaustedOutcome();
      return this.schedule(
        entryIndex,
        arrival,
        { kind: "error", error: { code: "INVALID_REQUEST", message: invalidReason } },
        options.signal,
      );
    }

    // Trusted ids only: a summary may name only workload ids the driver issued
    // on this same connection. The check runs BEFORE the ledger write, so a
    // candidate cannot grow the evidence id table with invented ids: such a
    // call still gets its ledger row, capacity charge and retry identity, but
    // its id list is recorded empty and only the count is kept.
    const untrustedMessageCount = payload.message_ids.filter(
      (messageId) => this.trustedByConnection.get(payload.connection_id)?.has(messageId) !== true
    ).length;
    const recordsIds = untrustedMessageCount === 0;
    const logicalKey = recordsIds
      ? `${payload.connection_id}:${[...payload.message_ids].sort().join(",")}`
      : `${payload.connection_id}:[untrusted]`;
    const retry =
      this.seenRequestIds.has(payload.request_id) ||
      this.seenLogicalOffers.has(logicalKey);
    this.seenRequestIds.add(payload.request_id);
    this.seenLogicalOffers.add(logicalKey);

    const calls = (this.callsPerSecond.get(secondBucket) ?? 0) + 1;
    this.callsPerSecond.set(secondBucket, calls);
    const capacity = this.getCapacityForSecond(secondBucket);

    const entryIndex = this.append({
      arrival_ms: arrival,
      request_id: payload.request_id,
      connection_id: payload.connection_id,
      message_ids: recordsIds ? [...payload.message_ids] : [],
      untrusted_message_count: untrustedMessageCount,
      retry,
    });
    if (entryIndex === null) return this.exhaustedOutcome();

    // Capacity keeps precedence, so a flooding candidate is still graded as
    // flooding; an untrusted call rejected here records no ids either.
    if (calls > capacity) {
      return this.schedule(
        entryIndex,
        arrival,
        {
          kind: "error",
          error: {
            code: "OVERLOADED",
            message: `capacity ${capacity} rps exceeded in second ${secondBucket}`,
          },
        },
        options.signal,
      );
    }

    if (!recordsIds) {
      return this.schedule(
        entryIndex,
        arrival,
        {
          kind: "error",
          error: {
            code: "INVALID_REQUEST",
            message: `summarize names ${untrustedMessageCount} message id(s) never sent on this connection`,
          },
        },
        options.signal,
      );
    }

    const result: SummarizerResult = { request_id: payload.request_id, status: "completed" };
    validateSummarizerResult("summarize", result as unknown as Record<string, unknown>);
    return this.schedule(entryIndex, arrival, { kind: "result", result }, options.signal);
  }

  private schedule(
    entryIndex: number,
    arrivalMs: Nat,
    outcome: SummarizerCallOutcome,
    signal?: AbortSignal,
  ): Promise<SummarizerCallOutcome> {
    const { promise, resolve } = deferred<SummarizerCallOutcome>();
    const dueMs = arrivalMs + this.serviceLatencyMs;
    this.ledger[entryIndex].scheduled_ms = dueMs;
    const completion: PendingCompletion = {
      entryIndex,
      dueMs,
      outcome,
      resolve,
      signal,
      cancelTimer: null,
      cancelListener: null,
      state: "pending",
    };
    completion.cancelTimer = this.scheduler.scheduleAt(dueMs, () => {
      if (completion.state !== "pending") return;
      const completedMs = Math.max(dueMs, this.readClock());
      const index = this.pending.indexOf(completion);
      if (index >= 0) this.pending.splice(index, 1);
      this.complete(completion, completedMs);
    });
    this.pending.push(completion);
    if (signal !== undefined) {
      const cancel = (): void => this.cancel(completion);
      completion.cancelListener = cancel;
      if (signal.aborted) cancel();
      else signal.addEventListener("abort", cancel, { once: true });
    }
    return promise;
  }

  private cancel(completion: PendingCompletion): void {
    if (completion.state !== "pending") return;
    completion.state = "cancelled";
    completion.cancelTimer?.();
    if (completion.cancelListener !== null) {
      completion.signal?.removeEventListener("abort", completion.cancelListener);
    }
    const pendingIndex = this.pending.indexOf(completion);
    if (pendingIndex >= 0) this.pending.splice(pendingIndex, 1);
    const entry = this.ledger[completion.entryIndex];
    let cancelledMs: Nat;
    try {
      cancelledMs = this.readClock();
    } catch (error) {
      // A throwing clock must not leave the caller's promise unresolved.
      completion.resolve({
        kind: "error",
        error: {
          code: "UNAVAILABLE",
          message: `summarizer clock unavailable during cancellation: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      });
      return;
    }
    this.cancellations.push(Object.freeze({
      attempt_id: entry.attempt_id,
      entry_id: entry.entry_id,
      cancelled_ms: cancelledMs,
      reason: "request_cancelled",
    }));
    completion.resolve({
      kind: "error",
      error: { code: "UNAVAILABLE", message: "summarizer request cancelled" },
    });
  }

  private readClock(): Nat {
    const value = assertFiniteTimestamp(this.nowMs(), "SummarizerStub clock");
    if (value < this.lastTimestamp) {
      throw new Error(`SummarizerStub clock moved backwards: ${value} < ${this.lastTimestamp}`);
    }
    this.lastTimestamp = value;
    return value;
  }

  private append(entry: {
    arrival_ms: Nat;
    request_id: Id | null;
    connection_id: Id | null;
    message_ids: readonly Id[];
    untrusted_message_count: Nat;
    retry: boolean;
  }): number | null {
    if (this.ledger.length >= this.ledgerCap) {
      this.exhausted = true;
      return null;
    }
    const index = this.ledger.length;
    this.ledger.push({
      sequence: index,
      entry_id: `sum-entry-${this.entryCounter++}`,
      attempt_id: this.attemptId,
      arrival_ms: entry.arrival_ms,
      scheduled_ms: null,
      completed_ms: null,
      latency_ms: null,
      request_id: entry.request_id,
      connection_id: entry.connection_id,
      message_ids: [...entry.message_ids],
      untrusted_message_count: entry.untrusted_message_count,
      delivered: false,
      error_code: null,
      retry: entry.retry,
    });
    return index;
  }

  private exhaustedOutcome(): SummarizerCallOutcome {
    return {
      kind: "error",
      error: {
        code: "UNAVAILABLE",
        message: `summarizer stub ledger cap (${this.ledgerCap}) exhausted; further observations cannot be recorded`,
      },
    };
  }
}
