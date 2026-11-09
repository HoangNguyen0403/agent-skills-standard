import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PaymentCaseDriver,
  ProviderStub,
  RealMonotonicScheduler,
  StrictExchangeSession,
  SummarizerStub,
  TenantCaseDriver,
  VirtualMonotonicScheduler,
  type MonotonicScheduler,
  OverloadCaseDriver,
  OVERLOAD_WORKLOAD,
  ExchangeFailure,
  CANARY_A1,
  CANARY_B1,
  TENANT_A,
  TENANT_B,
  TENANT_UNAUTHORIZED,
  generateSyntheticMessageBytes,
  deferred,
  MAX_REASON_BYTES,
  MAX_TRUSTED_WORKLOAD_MESSAGES,
  MAX_VERDICT_REASONS,
  REASON_TRUNCATION_MARKER,
  boundReason,
  boundReasons,
} from "./index.js";
import type {
  CandidateTransport,
  TransportObservation,
  TransportSideband,
  CandidateProcessController,
  CandidateSnapshotHandle,
  TenantStageName,
  TenantStageReader,
  TenantFrozenStage,
  ConnectionBufferSnapshot,
  CandidateTerminationObservation,
  MessageDispositionObservation,
} from "./index.js";
import {
  parseRequestEnvelope,
  validatePaymentResult,
  validateTenantResult,
  validateOverloadResult,
} from "../contracts.js";
import type {
  ErrorCode,
  Id,
  Positive,
  OverloadLimits,
  RequestEnvelope,
  TenantDoc,
  TenantItem,
  TenantTrace,
} from "../contracts.js";

class CandidateError extends Error {
  public constructor(
    public readonly code: ErrorCode,
    message: string
  ) {
    super(message);
    this.name = "CandidateError";
  }
}

/**
 * Deterministic local reference candidate and faulty controls.
 *
 * This is evaluator test material, never an experiment participant and never
 * shipped driver logic: it exists to prove that the drivers detect
 * consumer-visible faults and accept a correct mechanism.
 */
class ReferenceCandidate
  implements CandidateTransport, CandidateProcessController, TenantStageReader
{
  public resets = 0;
  public restarts = 0;
  public freezes = 0;
  public resumes = 0;
  public hideTransportObservation = false;
  public memoryRssBytes: number | null = 64 * 1024 * 1024;

  private expectedSeq = 1;
  private sidebandFrames = 0;
  private sidebandBytes = 0;

  // Payment state (survives restartRetainingState, cleared by resetState)
  private readonly payment = new Map<
    Id,
    { opRef: Id; state: "unknown" | "succeeded" | "failed"; evidenceIds: Id[]; amountMinor: number }
  >();

  // Tenant state
  private readonly documents = new Map<Id, TenantDoc>();
  private readonly revoked = new Set<Id>();
  private readonly snapshots = new Map<Id, { tenant: Id; items: TenantItem[] }>();
  private readonly frozenStages = new Map<Id, TenantTrace>();
  private lastStageTrace: TenantTrace | null = null;
  private snapshotCounter = 1;

  // Overload state
  private readonly activeConnections = new Set<Id>();
  private readonly buffers = new Map<Id, { message_id: Id; bytes: number; request_seq: number }[]>();
  private readonly forwardedByWindow = new Map<number, number>();
  private readonly forwarded = new Set<Promise<unknown>>();
  private readonly offerReceipts: {
    attempt_id: Id;
    process_session_id: Id;
    seq: number;
    connection_id: Id;
    message_id: Id;
    offer_id: Id;
    window_index: number;
    observed_monotonic_ms: number;
    byte_count: number;
    sha256: string;
  }[] = [];
  private readonly dispositions: MessageDispositionObservation[] = [];
  private processSessionId = "session-1";
  private processSessionCounter = 1;
  private eventSeq = 1;
  private observationSeq = 1;
  private latestBufferObservationId: Id | null = null;
  private readonly attemptId: Id;
  private droppedCount = 0;
  private drained = false;

  public maxAdmissions: number = OVERLOAD_WORKLOAD.client_count;
  public overloadLimits: OverloadLimits = {
    max_connections: 32,
    max_buffer_bytes_per_connection: 65536,
    drain_deadline_ms: 5000,
    max_retries_per_request: 1,
  };
  public faultClosedConnections: ReadonlySet<Id> = new Set();
  public summaryRateLimit = 12;
  public ignoreOffers = false;
  public stayLiveAfterDrain = false;
  public silentDiscard = false;
  public excessReportedBuffer = false;

  // Fault controls
  public fabricateFinalityOnPending = false;
  public retryDebitOnUnknown = false;
  public returnForeignEvidence = false;
  public treatAbsentAsFailed = false;
  public ignoreProviderError = false;
  public wrongDebitAmount = false;
  public resurrectOnRestore = false;
  public mutateOnUnauthorized = false;
  public leakB1ToA = false;
  public leakRevokedInTrace = false;
  public restoreLeak = false;
  public omitStageRecords = false;
  public rejectStageCorrespondence = false;
  public traceMismatch = false;
  public refuseFreeze = false;
  public excessRetries = 0;
  public fakeDelivery = false;
  public nullBufferSnapshot = false;
  public emptyBufferSnapshot = false;
  public duplicateBufferObservationId = false;
  public staleBufferSession = false;
  public nonMonotonicBufferTime = false;
  public duplicateConnectionInBuffer = false;
  public negativeBufferBytes = false;
  public dispositionLedgerUnavailable = false;
  public candidateDisagreementOnRejection = false;
  public exitDuringWorkload = false;
  public unknownTerminationPhase = false;
  public wrongTerminationPid = false;
  public missingExitReceipt = false;
  public excessLastLiveRss = false;
  public omitOfferReceipts = false;
  public duplicateOfferReceipt = false;
  public misboundOfferReceipt = false;
  public wrongHashOfferReceipt = false;
  public earlyOfferReceipt = false;
  public hostileErrorText = false;
  public awaitSummaryOnSend = false;
  public silentDiscardWithCorrectCount = false;
  public retryWithFreshRequestId = false;
  public acceptedThenDropped = false;
  public dispositionWrongSession = false;
  public dispositionOutOfOrder = false;
  public dispositionWrongBytes = false;
  public constructor(
    private readonly provider: ProviderStub,
    private readonly summarizer: SummarizerStub,
    private readonly nowMs: () => number = () => Date.now()
  ) {
    this.attemptId = provider.attemptId;
  }


  // ---------------------------------------------------------------- transport

  public readonly sendRawRequest = async (
    envelopeJson: string,
    sideband?: TransportSideband,
    _timeoutMs?: number
  ): Promise<string> => {
    const request = parseRequestEnvelope(JSON.parse(envelopeJson));
    if (sideband?.syntheticBytes !== undefined) {
      this.sidebandFrames += 1;
      this.sidebandBytes += sideband.syntheticBytes.length;
    }

    if (request.seq !== this.expectedSeq) {
      return JSON.stringify({
        version: 1,
        seq: request.seq,
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: `expected seq ${this.expectedSeq}, got ${request.seq}`,
        },
      });
    }
    this.expectedSeq += 1;

    try {
      const result = await this.dispatch(request, sideband);
      return JSON.stringify({ version: 1, seq: request.seq, ok: true, result });
    } catch (err) {
      if (err instanceof CandidateError) {
        return JSON.stringify({
          version: 1,
          seq: request.seq,
          ok: false,
          error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  };

  public readonly getTransportObservation = async (): Promise<TransportObservation | null> => {
    if (this.hideTransportObservation) return null;
    return {
      sideband_frames: this.sidebandFrames,
      sideband_bytes: this.sidebandBytes,
      auxiliary: {
        attempt_id: this.attemptId,
        process_session_id: this.processSessionId,
        observation_id: `aux-observation-${this.observationSeq++}`,
        observed_monotonic_ms: this.nowMs(),
        offer_receipts: this.omitOfferReceipts
          ? []
          : this.duplicateOfferReceipt && this.offerReceipts.length > 0
            ? [...this.offerReceipts.map((r) => ({ ...r })), { ...this.offerReceipts[0] }]
            : this.misboundOfferReceipt && this.offerReceipts.length > 0
              ? [{ ...this.offerReceipts[0], window_index: 99 }, ...this.offerReceipts.slice(1).map((r) => ({ ...r }))]
              : this.wrongHashOfferReceipt && this.offerReceipts.length > 0
                ? [{ ...this.offerReceipts[0], sha256: "0".repeat(64) }, ...this.offerReceipts.slice(1).map((r) => ({ ...r }))]
                : this.offerReceipts.map((receipt) =>
                    this.earlyOfferReceipt
                      ? {
                          ...receipt,
                          observed_monotonic_ms: Math.max(0, receipt.observed_monotonic_ms - 1000),
                        }
                      : { ...receipt }
                  ),
      },
    };
  };

  // ---------------------------------------------------------------- controller

  public async resetState(): Promise<void> {
    this.resets += 1;
    this.expectedSeq = 1;
    this.payment.clear();
    this.documents.clear();
    this.revoked.clear();
    this.snapshots.clear();
    this.frozenStages.clear();
    this.lastStageTrace = null;
    this.activeConnections.clear();
    this.buffers.clear();
    this.forwardedByWindow.clear();
    this.forwarded.clear();
    this.offerReceipts.length = 0;
    this.dispositions.length = 0;
    this.eventSeq = 1;
    this.latestBufferObservationId = null;
    this.processSessionCounter += 1;
    this.processSessionId = `session-${this.processSessionCounter}`;
    this.droppedCount = 0;
    this.drained = false;
    this.sidebandFrames = 0;
    this.sidebandBytes = 0;
  }

  public async restartRetainingState(): Promise<void> {
    this.restarts += 1;
    this.expectedSeq = 1;
  }

  public async freezeAndSnapshot(): Promise<CandidateSnapshotHandle | null> {
    this.freezes += 1;
    if (this.refuseFreeze) return null;
    const snapshotId = `snap-freeze-${this.snapshotCounter++}`;
    const trace = this.lastStageTrace;
    if (trace !== null) {
      this.frozenStages.set(snapshotId, {
        retrieved: [...trace.retrieved],
        reranked: [...trace.reranked],
        cached: [...trace.cached],
      });
    }
    return { snapshot_id: snapshotId };
  }

  public async resume(): Promise<void> {
    this.resumes += 1;
  }

  public async observeConnectionBufferSnapshot(): Promise<ConnectionBufferSnapshot | null> {
    if (this.nullBufferSnapshot) return null;
    const observationId = this.duplicateBufferObservationId
      ? "buffer-observation-duplicate"
      : `buffer-observation-${this.observationSeq++}`;
    this.latestBufferObservationId = observationId;
    if (this.emptyBufferSnapshot) {
      return {
        attempt_id: this.attemptId,
        process_session_id: this.staleBufferSession ? "stale-session-id" : this.processSessionId,
        observation_id: observationId,
        observed_monotonic_ms: this.nonMonotonicBufferTime ? 0 : this.nowMs(),
        complete: false,
        connection_buffers: [],
      };
    }
    const connection_buffers: { connection_id: Id; buffered_bytes: number }[] = [
      ...this.activeConnections,
    ]
      .sort()
      .map((connectionId) => ({
        connection_id: connectionId,
        buffered_bytes: (this.buffers.get(connectionId) ?? []).reduce(
          (sum, entry) => sum + entry.bytes,
          0
        ),
      }));
    if (this.excessReportedBuffer) {
      const conn01 = connection_buffers.find((c) => c.connection_id === "conn-01");
      if (conn01) {
        conn01.buffered_bytes = this.overloadLimits.max_buffer_bytes_per_connection + 1024;
      }
    }
    if (this.duplicateConnectionInBuffer && connection_buffers.length > 0) {
      connection_buffers.push({
        connection_id: connection_buffers[0].connection_id,
        buffered_bytes: 1024,
      });
    }
    if (this.negativeBufferBytes && connection_buffers.length > 0) {
      connection_buffers[0].buffered_bytes = -1;
    }
    return {
      attempt_id: this.attemptId,
      process_session_id: this.staleBufferSession ? "stale-session-id" : this.processSessionId,
      observation_id: observationId,
      observed_monotonic_ms: this.nonMonotonicBufferTime ? 0 : this.nowMs(),
      complete: true,
      connection_buffers,
    };
  }

  public async getTerminationObservation(): Promise<CandidateTerminationObservation> {
    const base = {
      attempt_id: this.attemptId,
      process_session_id: this.processSessionId,
      observation_id: `process-observation-${this.observationSeq++}`,
      observed_monotonic_ms: this.nowMs(),
    };
    if (this.exitDuringWorkload) {
      return {
        ...base,
        phase: "exited",
        pid: 4242,
        exit_receipt_id: `exit-receipt-${this.processSessionCounter}`,
        last_live_memory_rss_bytes: this.memoryRssBytes ?? 64 * 1024 * 1024,
      };
    }
    if (this.drained && !this.stayLiveAfterDrain) {
      if (this.unknownTerminationPhase) return { ...base, phase: "unknown" };
      return {
        ...base,
        phase: "exited",
        pid: this.wrongTerminationPid ? 9999 : 4242,
        exit_receipt_id: this.missingExitReceipt ? "" : `exit-receipt-${this.processSessionCounter}`,
        last_live_memory_rss_bytes: this.excessLastLiveRss
          ? 600 * 1024 * 1024
          : (this.memoryRssBytes ?? 64 * 1024 * 1024),
      };
    }
    if (this.memoryRssBytes === null) return { ...base, phase: "unknown" };
    return {
      ...base,
      phase: "running",
      pid: 4242,
      memory_rss_bytes: this.memoryRssBytes,
    };
  }

  public async observeMessageDispositions(): Promise<readonly MessageDispositionObservation[] | null> {
    if (this.dispositionLedgerUnavailable) return null;
    let events = this.dispositions.map((event) => ({ ...event }));
    if (this.dispositionWrongSession && events.length > 0) {
      events = events.map((e) => ({ ...e, process_session_id: "wrong-session" as Id }));
    } else if (this.dispositionOutOfOrder && events.length > 1) {
      events = events.map((e, i) => ({ ...e, event_seq: (i === 0 ? 2 : (i === 1 ? 1 : i + 1)) as unknown as Positive }));
    } else if (this.dispositionWrongBytes && events.length > 0) {
      events = events.map((e, i) => (i === 0 ? { ...e, bytes: 9999 as unknown as Positive } : e));
    }
    return events;
  }

  // ---------------------------------------------------------------- stage reader

  public isStageCorrespondenceAccepted(_stage: TenantStageName): boolean {
    return !this.rejectStageCorrespondence;
  }

  public async readFrozenStages(snapshotId: Id): Promise<readonly TenantFrozenStage[] | null> {
    if (this.omitStageRecords) return null;
    const trace = this.frozenStages.get(snapshotId);
    if (trace === undefined) return null;
    return [
      this.frozenStage("retrieval", 0, trace.retrieved),
      this.frozenStage("rerank", 1, trace.reranked),
      this.frozenStage("cache", 2, trace.cached),
    ];
  }

  private frozenStage(
    stage: TenantStageName,
    sequence: number,
    records: readonly TenantItem[]
  ): TenantFrozenStage {
    return {
      stage,
      sequence,
      records: records.map((item) => ({ ...item })),
      source_document_ids: records.map((item) => item.document_id),
    };
  }

  // ---------------------------------------------------------------- dispatch

  private async dispatch(
    request: RequestEnvelope,
    sideband?: TransportSideband
  ): Promise<Record<string, unknown>> {
    switch (request.operation) {
      case "submit":
        return this.paymentViewResult(this.submit(request.payload));
      case "inspect":
        return this.paymentViewResult(this.inspect(request.payload.instruction_id as Id));
      case "recover":
        return this.paymentViewResult(this.recover(request.payload.instruction_id as Id));
      case "ingest":
        return this.ingest(request.payload);
      case "query":
        return this.query(request.payload.tenant as Id);
      case "reindex":
        return this.reindex(request.payload);
      case "revoke":
        return this.revoke(request.payload);
      case "export":
        return this.exportSnapshot(request.payload.tenant as Id);
      case "restore":
        return this.restore(request.payload.tenant as Id, request.payload.snapshot_id as Id);
      case "open":
        return this.open(request.payload.connection_id as Id);
      case "send":
        return await this.send(request.payload, sideband, request.seq);
      case "read":
        return this.read(request.payload.connection_id as Id, request.payload.max_bytes as number);
      case "close":
        this.activeConnections.delete(request.payload.connection_id as Id);
        this.buffers.delete(request.payload.connection_id as Id);
        return { connection_id: request.payload.connection_id, closed: true };
      case "drain":
        return this.drain();
      case "status":
        return {
          limits: this.overloadLimits,
          active_connections: this.activeConnections.size,
          buffered_bytes: this.bufferedBytes(),
          dropped_count: this.droppedCount,
          capacity_rps: 30,
        };
      default:
        throw new Error(`reference candidate received unknown operation '${request.operation}'`);
    }
  }

  // ---------------------------------------------------------------- payment

  private paymentViewResult(view: {
    instruction_id: Id;
    state: "unknown" | "succeeded" | "failed";
    evidence_ids: Id[];
  }): Record<string, unknown> {
    return {
      instruction_id: view.instruction_id,
      state: view.state,
      evidence_ids: [...view.evidence_ids],
    } as unknown as Record<string, unknown>;
  }

  private submit(payload: Record<string, unknown>): {
    instruction_id: Id;
    state: "unknown" | "succeeded" | "failed";
    evidence_ids: Id[];
  } {
    const instructionId = payload.instruction_id as Id;
    const amountMinor = payload.amount_minor as number;
    const existing = this.payment.get(instructionId);

    if (existing !== undefined) {
      if (existing.state === "succeeded") return this.viewOf(existing);
      if (this.retryDebitOnUnknown) {
        const retry = this.provider.handleDebit({
          instruction_id: instructionId,
          operation_ref: existing.opRef,
          amount_minor: existing.amountMinor,
          currency: "USD",
        });
        if (retry.kind === "result") {
          existing.state = "succeeded";
          existing.evidenceIds = [retry.result.evidence_id];
          return this.viewOf(existing);
        }
      }
      return this.recoverFromProvider(existing);
    }

    const record = {
      opRef: `op-${instructionId}`,
      state: "unknown" as "unknown" | "succeeded" | "failed",
      evidenceIds: [] as Id[],
      amountMinor,
    };
    this.payment.set(instructionId, record);

    const debit = this.provider.handleDebit({
      instruction_id: instructionId,
      operation_ref: record.opRef,
      amount_minor: this.wrongDebitAmount ? amountMinor + 100 : amountMinor,
      currency: "USD",
    });
    if (debit.kind === "result") {
      record.state = "succeeded";
      record.evidenceIds = [debit.result.evidence_id];
    } else if (debit.kind === "error" && this.ignoreProviderError) {
      record.state = "succeeded";
      record.evidenceIds = [];
    }
    return this.viewOf(record);
  }

  private inspect(instructionId: Id): {
    instruction_id: Id;
    state: "unknown" | "succeeded" | "failed";
    evidence_ids: Id[];
  } {
    const settlement = this.provider.handleSettlement({ instruction_id: instructionId });
    const finalSettlement =
      settlement.kind === "result" && "final" in settlement.result ? settlement.result : null;
    if (finalSettlement !== null && finalSettlement.final) {
      const record = this.payment.get(instructionId) ?? {
        opRef: `op-${instructionId}`,
        state: "unknown" as "unknown" | "succeeded" | "failed",
        evidenceIds: [] as Id[],
        amountMinor: 0,
      };
      record.state = finalSettlement.outcome === "failed" ? "failed" : "succeeded";
      record.evidenceIds = [finalSettlement.evidence_id];
      this.payment.set(instructionId, record);
      return this.viewOf(record);
    }
    const existing = this.payment.get(instructionId);
    if (existing !== undefined) return this.viewOf(existing);
    return { instruction_id: instructionId, state: "unknown", evidence_ids: [] };
  }

  private recover(instructionId: Id): {
    instruction_id: Id;
    state: "unknown" | "succeeded" | "failed";
    evidence_ids: Id[];
  } {
    const existing = this.payment.get(instructionId);
    if (existing !== undefined && existing.state === "succeeded") return this.viewOf(existing);
    if (existing === undefined) return this.inspect(instructionId);
    return this.recoverFromProvider(existing);
  }

  private recoverFromProvider(record: {
    opRef: Id;
    state: "unknown" | "succeeded" | "failed";
    evidenceIds: Id[];
    amountMinor: number;
  }): { instruction_id: Id; state: "unknown" | "succeeded" | "failed"; evidence_ids: Id[] } {
    const instructionId = record.opRef.replace(/^op-/, "");

    const settlement = this.provider.handleSettlement({ instruction_id: instructionId });
    const settlementResult =
      settlement.kind === "result" && "final" in settlement.result ? settlement.result : null;
    if (settlementResult !== null && settlementResult.final) {
      record.state = settlementResult.outcome === "failed" ? "failed" : "succeeded";
      record.evidenceIds = [settlementResult.evidence_id];
      return this.viewOf(record);
    }
    if (settlementResult !== null && settlementResult.outcome === "absent" && this.treatAbsentAsFailed) {
      record.state = "failed";
      return this.viewOf(record);
    }

    const lookup = this.provider.lookupUnavailable
      ? ({ kind: "error", error: { code: "UNAVAILABLE", message: "lookup disabled" } } as const)
      : this.provider.handleLookup({ operation_ref: record.opRef });

    if (lookup.kind === "result" && lookup.result.outcome === "pending") {
      if (this.fabricateFinalityOnPending) {
        record.state = "succeeded";
        record.evidenceIds = ["ev-fabricated-early"];
        return this.viewOf(record);
      }
      return this.viewOf(record);
    }
    if (lookup.kind === "result" && lookup.result.outcome === "succeeded") {
      record.state = "succeeded";
      record.evidenceIds = [lookup.result.evidence_id];
      return this.viewOf(record);
    }
    if (lookup.kind === "error" && this.ignoreProviderError) {
      record.state = "succeeded";
      record.evidenceIds = [];
    }
    return this.viewOf(record);
  }

  private viewOf(record: { state: "unknown" | "succeeded" | "failed"; evidenceIds: Id[] }): {
    instruction_id: Id;
    state: "unknown" | "succeeded" | "failed";
    evidence_ids: Id[];
  } {
    const instructionId = [...this.payment.entries()].find(([, value]) => value === record)?.[0] ?? "unknown";
    const evidenceIds = this.returnForeignEvidence && record.state === "succeeded"
      ? ["ev-fabricated-foreign"]
      : [...record.evidenceIds];
    return { instruction_id: instructionId, state: record.state, evidence_ids: evidenceIds };
  }

  // ---------------------------------------------------------------- tenant

  private ingest(payload: Record<string, unknown>): Record<string, unknown> {
    const document = payload.document as TenantDoc;
    this.documents.set(document.document_id, { ...document });
    return { document_id: document.document_id };
  }

  private query(tenant: Id): Record<string, unknown> {
    const items = this.visibleItems(tenant);
    const publicRetrieved =
      this.leakRevokedInTrace &&
      !items.some((item) => item.document_id === CANARY_A1.document_id)
        ? [...items, { ...CANARY_A1 }]
        : items;
    const base: TenantTrace = {
      retrieved: publicRetrieved,
      reranked: items,
      cached: items,
    };
    const stageTrace: TenantTrace = this.traceMismatch
      ? {
          retrieved: base.retrieved.slice(1),
          reranked: items,
          cached: items,
        }
      : base;
    this.lastStageTrace = stageTrace;
    return { items, trace: base } as unknown as Record<string, unknown>;
  }

  private visibleItems(tenant: Id): TenantItem[] {
    const items: TenantItem[] = [];
    for (const document of this.documents.values()) {
      if (document.owner !== tenant) continue;
      if (this.revoked.has(document.document_id)) continue;
      items.push({ ...document });
    }
    if (this.leakB1ToA && tenant === TENANT_A) {
      items.push({ ...CANARY_B1 });
    }
    return items;
  }

  private reindex(payload: Record<string, unknown>): Record<string, unknown> {
    const documentId = payload.document_id as Id;
    const derivedOwner = payload.derived_owner as Id;
    const document = this.documents.get(documentId);
    const status = document !== undefined && document.owner === derivedOwner ? "applied" : "quarantined";
    return { document_id: documentId, status };
  }

  private revoke(payload: Record<string, unknown>): Record<string, unknown> {
    const tenant = payload.tenant as Id;
    const documentId = payload.document_id as Id;
    if (tenant !== TENANT_A && tenant !== TENANT_B) {
      if (this.mutateOnUnauthorized) {
        this.documents.delete(documentId);
      }
      throw new CandidateError("FORBIDDEN", "unauthorized tenant");
    }
    const document = this.documents.get(documentId);
    if (document === undefined || document.owner !== tenant) {
      throw new CandidateError("FORBIDDEN", "mismatched ownership");
    }
    this.revoked.add(documentId);
    return { document_id: documentId, revocation_id: `rev-${documentId}` };
  }

  private exportSnapshot(tenant: Id): Record<string, unknown> {
    if (tenant !== TENANT_A && tenant !== TENANT_B) {
      throw new CandidateError("FORBIDDEN", "unauthorized tenant");
    }
    const items = this.visibleItems(tenant);
    const snapshotId = `snap-export-${this.snapshotCounter++}`;
    this.snapshots.set(snapshotId, { tenant, items: items.map((item) => ({ ...item })) });
    return { items, snapshot_id: snapshotId };
  }

  private restore(tenant: Id, snapshotId: Id): Record<string, unknown> {
    if (tenant !== TENANT_A && tenant !== TENANT_B) {
      throw new CandidateError("FORBIDDEN", "unauthorized tenant");
    }
    const snapshot = this.snapshots.get(snapshotId);
    if (snapshot === undefined || snapshot.tenant !== tenant) {
      throw new CandidateError("NOT_FOUND", "unknown snapshot");
    }
    if (this.resurrectOnRestore) {
      for (const item of snapshot.items) {
        this.revoked.delete(item.document_id);
      }
    }
    const items = snapshot.items.filter((item) => !this.revoked.has(item.document_id));
    const restoredItems = this.restoreLeak ? [...items, { ...CANARY_A1 }] : items;
    const trace: TenantTrace = {
      retrieved: restoredItems,
      reranked: restoredItems,
      cached: restoredItems,
    };
    return { items: restoredItems, trace } as unknown as Record<string, unknown>;
  }

  // ---------------------------------------------------------------- overload

  private open(connectionId: Id): Record<string, unknown> {
    const admitted =
      this.activeConnections.has(connectionId) ||
      this.activeConnections.size < this.maxAdmissions;
    if (admitted) {
      this.activeConnections.add(connectionId);
      if (!this.buffers.has(connectionId)) this.buffers.set(connectionId, []);
    }
    return { connection_id: connectionId, admitted, limits: this.overloadLimits };
  }

  private async send(
    payload: Record<string, unknown>,
    sideband: TransportSideband | undefined,
    requestSeq: number
  ): Promise<Record<string, unknown>> {
    const connectionId = payload.connection_id as Id;
    const messageId = payload.message_id as Id;
    const bytes = payload.bytes as number;
    if (this.hostileErrorText) {
      throw new CandidateError("INVALID_REQUEST", "candidate-controlled ".repeat(100));
    }
    if (sideband?.syntheticBytes !== undefined && sideband.syntheticBytes.length !== bytes) {
      throw new Error("reference candidate received a sideband buffer of the wrong length");
    }
    if (sideband?.requested_summary !== undefined && sideband.syntheticBytes !== undefined) {
      this.offerReceipts.push({
        attempt_id: this.attemptId,
        process_session_id: this.processSessionId,
        seq: requestSeq,
        connection_id: connectionId,
        message_id: messageId,
        offer_id: sideband.requested_summary.offer_id,
        window_index: sideband.requested_summary.window_index,
        observed_monotonic_ms: this.nowMs(),
        byte_count: sideband.syntheticBytes.length,
        sha256: createHash("sha256").update(sideband.syntheticBytes).digest("hex"),
      });
      if (this.awaitSummaryOnSend) {
        await this.summarizer.handleSummarize({
          request_id: sideband.requested_summary.offer_id,
          connection_id: connectionId,
          message_ids: [messageId],
        });
      } else {
        this.forwardOffer(sideband.requested_summary, connectionId, messageId);
      }
    }

    const buffer = this.buffers.get(connectionId) ?? [];
    const buffered = buffer.reduce((sum, entry) => sum + entry.bytes, 0);
    if (buffered + bytes > this.overloadLimits.max_buffer_bytes_per_connection) {
      this.droppedCount += 1;
      this.recordDisposition("dropped", requestSeq, connectionId, messageId, bytes);
      return {
        message_id: messageId,
        status: this.candidateDisagreementOnRejection ? "accepted" : "rejected",
      };
    }
    buffer.push({ message_id: messageId, bytes, request_seq: requestSeq });
    this.buffers.set(connectionId, buffer);
    this.recordDisposition("accepted", requestSeq, connectionId, messageId, bytes);
    return { message_id: messageId, status: "accepted" };
  }
  private recordDisposition(
    state: "accepted" | "delivered" | "dropped" | "retained",
    request_seq: number,
    connection_id: Id,
    message_id: Id,
    bytes: number
  ): void {
    const base = {
      attempt_id: this.attemptId,
      process_session_id: this.processSessionId,
      event_seq: this.eventSeq++,
      request_seq,
      connection_id,
      message_id,
      bytes,
      observed_monotonic_ms: this.nowMs(),
    };
    if (state === "retained") {
      if (this.latestBufferObservationId === null) return;
      this.dispositions.push({
        ...base,
        state,
        buffer_observation_id: this.latestBufferObservationId,
      });
    } else {
      this.dispositions.push({ ...base, state });
    }
  }

  /**
   * Candidate-owned summary forwarding policy: accept the driver's logical
   * offer only up to its own per-window admission limit, then shed the rest.
   * `excessRetries` and `summaryRateLimit` exist only as faulty controls.
   */
  private forwardOffer(
    offer: { offer_id: Id; window_index: number },
    connectionId: Id,
    messageId: Id
  ): void {
    if (this.ignoreOffers) return;

    const admitted = this.forwardedByWindow.get(offer.window_index) ?? 0;
    if (admitted >= this.summaryRateLimit) return;
    this.forwardedByWindow.set(offer.window_index, admitted + 1);

    const payload = {
      request_id: offer.offer_id,
      connection_id: connectionId,
      message_ids: [messageId],
    };
    this.forwardOne(payload);
    for (let attempt = 0; attempt < this.excessRetries; attempt++) {
      if (this.retryWithFreshRequestId) {
        this.forwardOne({
          ...payload,
          request_id: `${offer.offer_id}-fresh-${attempt}` as Id,
        });
      } else {
        this.forwardOne(payload);
      }
    }
  }

  private forwardOne(payload: {
    request_id: Id;
    connection_id: Id;
    message_ids: Id[];
  }): void {
    const promise = this.summarizer.handleSummarize(payload).catch(() => null);
    this.forwarded.add(promise);
    void promise.finally(() => this.forwarded.delete(promise));
  }

  private read(connectionId: Id, maxBytes: number): Record<string, unknown> {
    if (this.faultClosedConnections.has(connectionId)) {
      this.activeConnections.delete(connectionId);
      this.buffers.delete(connectionId);
      return { delivered: [], closed: true };
    }
    if (this.fakeDelivery) {
      return {
        delivered: [{ message_id: "msg-never-accepted", bytes: 1024 }],
        closed: false,
      };
    }
    const buffer = this.buffers.get(connectionId) ?? [];
    const delivered: { message_id: Id; bytes: number }[] = [];
    let accumulated = 0;
    while (buffer.length > 0 && accumulated + buffer[0].bytes <= maxBytes) {
      const entry = buffer.shift()!;
      if (this.acceptedThenDropped) {
        // Post-acceptance drop: the candidate's own status count must include it.
        this.droppedCount += 1;
        this.recordDisposition(
          "dropped",
          entry.request_seq,
          connectionId,
          entry.message_id,
          entry.bytes
        );
      } else {
        delivered.push({ message_id: entry.message_id, bytes: entry.bytes });
        accumulated += entry.bytes;
        this.recordDisposition(
          "delivered",
          entry.request_seq,
          connectionId,
          entry.message_id,
          entry.bytes
        );
      }
    }
    return { delivered, closed: false };
  }

  private drain(): Record<string, unknown> {
    let undelivered = 0;
    for (const [connectionId, buffer] of this.buffers) {
      undelivered += buffer.length;
      if (!this.silentDiscard && !this.silentDiscardWithCorrectCount) {
        for (const entry of buffer) {
          this.recordDisposition(
            "retained",
            entry.request_seq,
            connectionId,
            entry.message_id,
            entry.bytes
          );
        }
      }
    }
    this.activeConnections.clear();
    this.buffers.clear();
    this.drained = true;
    return {
      terminated: true,
      undelivered_count: this.silentDiscard ? 0 : undelivered,
    };
  }

  private bufferedBytes(): number {
    let total = 0;
    for (const buffer of this.buffers.values()) {
      for (const entry of buffer) total += entry.bytes;
    }
    return total;
  }
}

function buildContext(): {
  provider: ProviderStub;
  summarizer: SummarizerStub;
  scheduler: VirtualMonotonicScheduler;
  candidate: ReferenceCandidate;
} {
  const scheduler = new VirtualMonotonicScheduler();
  const provider = new ProviderStub("attempt-case-1", { clock: scheduler.nowMs });
  const summarizer = new SummarizerStub("attempt-case-1", {
    nowMs: scheduler.nowMs,
    scheduler,
  });
  const candidate = new ReferenceCandidate(provider, summarizer, scheduler.nowMs);
  return { provider, summarizer, scheduler, candidate };
}

function exchangeTransport(
  handler: (request: RequestEnvelope) => string | Promise<string>
): CandidateTransport {
  return {
    sendRawRequest: async (envelopeJson: string): Promise<string> =>
      handler(parseRequestEnvelope(JSON.parse(envelopeJson))),
    getTransportObservation: async () => null,
  };
}
describe("SRS-003 exchange: strict bounded session", () => {
  it("rejects a result that fails the operation validator and poisons the session", async () => {
    const transport = exchangeTransport((request) =>
      JSON.stringify({ version: 1, seq: request.seq, ok: true, result: { bogus: true } })
    );
    const session = new StrictExchangeSession(transport);
    session.beginProcessSession();

    await assert.rejects(
      session.call("submit", { instruction_id: "i-1", amount_minor: 1, currency: "USD" }, {
        validateResult: (_operation, result) => {
          validatePaymentResult("submit", result);
        },
      }),
      (err: unknown) => err instanceof ExchangeFailure && err.kind === "protocol"
    );

    await assert.rejects(
      session.call("inspect", { instruction_id: "i-1" }),
      (err: unknown) => err instanceof ExchangeFailure && /already failed/.test(err.message)
    );
  });

  it("bounds a hanging transport by deadline and recovers only on an explicit process session", async () => {
    const session = new StrictExchangeSession(
      { sendRawRequest: () => deferred<string>().promise, getTransportObservation: async () => null },
      { defaultTimeoutMs: 30 }
    );
    session.beginProcessSession();

    const startedAt = Date.now();
    await assert.rejects(
      session.call("status", {}),
      (err: unknown) => err instanceof ExchangeFailure && err.kind === "deadline"
    );
    const elapsed = Date.now() - startedAt;
    assert.ok(elapsed >= 20 && elapsed < 1000, `deadline enforcement took ${elapsed}ms`);

    session.beginProcessSession();
    assert.equal(session.expectedSeq, 1);
  });

  it("rejects a mismatched response sequence, an oversized frame and an exhausted exchange budget", async () => {
    const mismatched = new StrictExchangeSession(
      exchangeTransport((request) =>
        JSON.stringify({ version: 1, seq: request.seq + 1, ok: true, result: {} })
      )
    );
    mismatched.beginProcessSession();
    await assert.rejects(
      mismatched.call("status", {}),
      (err: unknown) => err instanceof ExchangeFailure && /sequence/.test(err.message)
    );

    const oversized = new StrictExchangeSession(
      { sendRawRequest: async () => "x".repeat(70000), getTransportObservation: async () => null }
    );
    oversized.beginProcessSession();
    await assert.rejects(
      oversized.call("status", {}),
      (err: unknown) => err instanceof ExchangeFailure && /inbound frame/.test(err.message)
    );

    const budgeted = new StrictExchangeSession(
      exchangeTransport((request) =>
        JSON.stringify({ version: 1, seq: request.seq, ok: true, result: {} })
      ),
      { maxExchanges: 2 }
    );
    budgeted.beginProcessSession();
    await budgeted.call("status", {});
    await budgeted.call("status", {});
    await assert.rejects(
      budgeted.call("status", {}),
      (err: unknown) => err instanceof ExchangeFailure && /exchange cap/.test(err.message)
    );
  });

  it("validates the outbound payload before dispatch (no request reaches the candidate)", async () => {
    let dispatched = 0;
    const session = new StrictExchangeSession({
      sendRawRequest: async () => {
        dispatched += 1;
        return "{}";
      },
      getTransportObservation: async () => null,
    });
    session.beginProcessSession();

    await assert.rejects(
      session.call("send", { connection_id: "c-1", message_id: "m-1", bytes: 0 }, {
        validatePayload: (_operation, payload) => {
          validateOverloadResult("send", payload as never);
        },
      }),
      (err: unknown) => err instanceof ExchangeFailure && err.kind === "protocol"
    );
    assert.equal(dispatched, 0);
  });
});

describe("SRS-003 stubs: bounded immutable independent observation", () => {
  it("exposes only deep-frozen ledger snapshots with contiguous sequence numbers", () => {
    const stub = new ProviderStub("attempt-stub");
    stub.handleDebit({
      instruction_id: "inst-1",
      operation_ref: "op-1",
      amount_minor: 100,
      currency: "USD",
    });

    const ledger = stub.getLedger();
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].sequence, 0);
    assert.equal(ledger[0].attempt_id, "attempt-stub");
    assert.ok(Object.isFrozen(ledger[0]));
    assert.equal(Reflect.set(ledger[0], "attempt_id", "mutated"), false);
    assert.equal(stub.getLedger()[0].attempt_id, "attempt-stub");
  });

  it("rejects a foreign-instruction evidence ID and a non-final settlement as final proof", () => {
    const stub = new ProviderStub("attempt-evidence");
    const debit = stub.handleDebit({
      instruction_id: "inst-1",
      operation_ref: "op-1",
      amount_minor: 500,
      currency: "USD",
    });
    assert.equal(debit.kind, "result");

    const foreign = stub.verifyEvidence({
      evidence_id: "ev-debit-1",
      instruction_id: "inst-2",
      expected_outcome: "succeeded",
      require_final: false,
    });
    assert.equal(foreign.accepted, false);

    stub.setSettlement("inst-1", {
      evidence_id: "ev-settlement-nonfinal",
      final: false,
      outcome: "succeeded",
    });
    const nonFinal = stub.verifyEvidence({
      evidence_id: "ev-settlement-nonfinal",
      instruction_id: "inst-1",
      expected_outcome: "succeeded",
      require_final: true,
    });
    assert.equal(nonFinal.accepted, false);

    const debitAsFinal = stub.verifyEvidence({
      evidence_id: "ev-debit-1",
      instruction_id: "inst-1",
      expected_outcome: "succeeded",
      require_final: true,
    });
    assert.equal(debitAsFinal.accepted, false);
  });

  it("records retries and rejects over-capacity calls under the injected clock", async () => {
    const scheduler = new VirtualMonotonicScheduler();
    const stub = new SummarizerStub("attempt-sum", { nowMs: scheduler.nowMs, scheduler });
    stub.beginWorkload(0);
    void scheduler.waitUntil(10);

    const accepted = [];
    for (let index = 0; index < 30; index++) {
      stub.registerWorkloadMessage("conn-1", `m-${index}`);
      accepted.push(
        stub.handleSummarize({
          request_id: `req-${index}`,
          connection_id: "conn-1",
          message_ids: [`m-${index}`],
        })
      );
    }
    stub.registerWorkloadMessage("conn-1", "m-overflow");
    const overflow = stub.handleSummarize({
      request_id: "req-overflow",
      connection_id: "conn-1",
      message_ids: ["m-overflow"],
    });

    stub.advanceTo(200);
    for (const outcome of await Promise.all(accepted)) {
      assert.equal(outcome.kind, "result");
    }
    const overflowOutcome = await overflow;
    assert.equal(overflowOutcome.kind, "error");
    if (overflowOutcome.kind === "error") assert.equal(overflowOutcome.error.code, "OVERLOADED");

    assert.equal(stub.getCapacityForSecond(39), 20);
    assert.equal(stub.getCapacityForSecond(50), 12);

    void scheduler.waitUntil(40_000);
    stub.registerWorkloadMessage("conn-1", "m-late");
    const first = stub.handleSummarize({
      request_id: "req-late",
      connection_id: "conn-1",
      message_ids: ["m-late"],
    });
    const retry = stub.handleSummarize({
      request_id: "req-late",
      connection_id: "conn-1",
      message_ids: ["m-late"],
    });
    stub.advanceTo(40_100);
    assert.equal((await first).kind, "result");
    assert.equal((await retry).kind, "result");
    const ledger = stub.getLedger();
    assert.equal(ledger[ledger.length - 1].retry, true);
    assert.equal(ledger[ledger.length - 1].sequence, ledger.length - 1);
    assert.equal(ledger[ledger.length - 1].latency_ms, 100);
  });

  it("completes asynchronously at exactly the service latency, not inline", async () => {
    const scheduler = new VirtualMonotonicScheduler();
    const stub = new SummarizerStub("attempt-latency", { nowMs: scheduler.nowMs, scheduler });
    stub.beginWorkload(0);
    void scheduler.waitUntil(1000);

    let settled = false;
    stub.registerWorkloadMessage("conn-1", "m-latency");
    const pending = stub.handleSummarize({
      request_id: "req-latency",
      connection_id: "conn-1",
      message_ids: ["m-latency"],
    });
    void pending.then(() => {
      settled = true;
    });

    await Promise.resolve();
    assert.equal(settled, false, "the request must not complete inline");

    stub.advanceTo(1099);
    await Promise.resolve();
    assert.equal(settled, false, "completion before arrival+latency is too early");

    stub.advanceTo(1100);
    assert.equal((await pending).kind, "result");
    const entry = stub.getLedger()[0];
    assert.equal(entry.arrival_ms, 1000);
    assert.equal(entry.scheduled_ms, 1100);
    assert.equal(entry.completed_ms, 1100);
    assert.equal(entry.latency_ms, 100);
  });

  it("resolves an awaited summary on the real timer without an external pump", async () => {
    const origin = performance.now();
    const stub = new SummarizerStub("attempt-real-timer", {
      nowMs: () => Math.floor(performance.now() - origin),
    });
    stub.beginWorkload(0);
    stub.registerWorkloadMessage("conn-real", "msg-real");

    const outcome = await stub.handleSummarize({
      request_id: "req-real-timer",
      connection_id: "conn-real",
      message_ids: ["msg-real"],
    });
    const entry = stub.getLedger()[0];

    assert.equal(outcome.kind, "result");
    assert.ok(entry.completed_ms !== null);
    assert.equal(entry.latency_ms, entry.completed_ms - entry.arrival_ms);
    assert.ok(entry.latency_ms !== null && entry.latency_ms >= 80 && entry.latency_ms < 1000);
    assert.equal(stub.pendingCount, 0);
  });
  it("resolves an awaited summary with a real candidate without external driver pump", async () => {
    const origin = performance.now();
    const clock = () => Math.floor(performance.now() - origin);
    const provider = new ProviderStub("attempt-awaited-smoke", { clock });
    const summarizer = new SummarizerStub("attempt-awaited-smoke", { nowMs: clock });
    summarizer.beginWorkload(0);
    const candidate = new ReferenceCandidate(provider, summarizer, clock);
    candidate.awaitSummaryOnSend = true;
    summarizer.registerWorkloadMessage("conn-01", "msg-01");

    const started = clock();
    const envelope = JSON.stringify({
      version: 1,
      seq: 1,
      operation: "send",
      payload: { connection_id: "conn-01", message_id: "msg-01", bytes: 1024 },
    });
    const sideband: TransportSideband = {
      syntheticBytes: generateSyntheticMessageBytes("msg-01", 1024),
      requested_summary: { offer_id: "offer-awaited-1", window_index: 0 },
    };

    const rawResponse = await candidate.sendRawRequest(envelope, sideband, 5000);
    const elapsed = clock() - started;
    const response = JSON.parse(rawResponse) as { ok: boolean };

    assert.equal(response.ok, true);
    assert.equal(summarizer.pendingCount, 0);
    const ledger = summarizer.getLedger();
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].delivered, true);
    assert.ok(ledger[0].completed_ms !== null);
    assert.ok(elapsed >= 80 && elapsed < 2000, `elapsed ${elapsed}ms`);
  });

  it("records late virtual timer advancement as observed elapsed time", async () => {
    const scheduler = new VirtualMonotonicScheduler();
    const stub = new SummarizerStub("attempt-late-timer", { nowMs: scheduler.nowMs, scheduler });
    stub.beginWorkload(0);
    await scheduler.waitUntil(1000);
    stub.registerWorkloadMessage("conn-late", "msg-late");
    const pending = stub.handleSummarize({
      request_id: "req-late-timer",
      connection_id: "conn-late",
      message_ids: ["msg-late"],
    });

    stub.advanceTo(1200);
    await pending;
    const entry = stub.getLedger()[0];
    assert.equal(entry.scheduled_ms, 1100);
    assert.equal(entry.completed_ms, 1200);
    assert.equal(entry.latency_ms, 200);
  });
  it("cancels pending summaries without refunding capacity or retry identity", async () => {
    const scheduler = new VirtualMonotonicScheduler();
    const stub = new SummarizerStub("attempt-cancel", { nowMs: scheduler.nowMs, scheduler });
    stub.beginWorkload(0);
    await scheduler.waitUntil(1000);

    const controller = new AbortController();
    stub.registerWorkloadMessage("conn-1", "msg-1");
    const pending = stub.handleSummarize(
      { request_id: "req-cancel", connection_id: "conn-1", message_ids: ["msg-1"] },
      { signal: controller.signal },
    );
    const entryId = stub.getLedger()[0].entry_id;
    await scheduler.waitUntil(1010);
    controller.abort();
    const outcome = await pending;

    assert.deepEqual(outcome, {
      kind: "error",
      error: { code: "UNAVAILABLE", message: "summarizer request cancelled" },
    });
    assert.deepEqual(stub.getLedger()[0], {
      sequence: 0,
      entry_id: entryId,
      attempt_id: "attempt-cancel",
      arrival_ms: 1000,
      scheduled_ms: 1100,
      completed_ms: null,
      latency_ms: null,
      request_id: "req-cancel",
      connection_id: "conn-1",
      message_ids: ["msg-1"],
      untrusted_message_count: 0,
      delivered: false,
      error_code: null,
      retry: false,
    });
    assert.deepEqual(stub.getCancellations(), [{
      attempt_id: "attempt-cancel",
      entry_id: entryId,
      cancelled_ms: 1010,
      reason: "request_cancelled",
    }]);

    const retry = stub.handleSummarize(
      { request_id: "req-cancel", connection_id: "conn-1", message_ids: ["msg-1"] },
    );
    assert.equal(stub.getLedger()[1].retry, true);
    assert.equal(stub.getCallsForSecond(1), 2);
    assert.equal(stub.pendingCount, 1);
    stub.advanceTo(1200);
    assert.equal((await retry).kind, "result");
    assert.equal(stub.getLedger()[0].completed_ms, null);
    assert.equal(stub.getCancellations().length, 1);
  });

  it("arbitrates completion against abort once, including a queued timer callback", async () => {
    let now = 1000;
    const queued: { callback: (() => void) | null } = { callback: null };
    const scheduler: MonotonicScheduler = {
      nowMs: () => now,
      scheduleAt: (_targetMs, callback) => {
        queued.callback = callback;
        return () => undefined;
      },
      // The test drives `now` and the queued callback by hand.
      waitUntil: async (targetMs: number) => {
        if (targetMs > now) now = targetMs;
      },
      isVirtual: true,
    };
    const stub = new SummarizerStub("attempt-race", { nowMs: scheduler.nowMs, scheduler });
    stub.beginWorkload(0);
    const controller = new AbortController();
    stub.registerWorkloadMessage("conn-1", "msg-1");
    const pending = stub.handleSummarize(
      { request_id: "req-race", connection_id: "conn-1", message_ids: ["msg-1"] },
      { signal: controller.signal },
    );
    now = 1010;
    controller.abort();
    controller.abort();
    assert.equal((await pending).kind, "error");
    queued.callback?.();
    assert.equal(stub.getLedger()[0].completed_ms, null);
    assert.equal(stub.getCancellations().length, 1);

    now = 2000;
    const completionFirst = new AbortController();
    stub.registerWorkloadMessage("conn-1", "msg-2");
    const completed = stub.handleSummarize(
      { request_id: "req-complete", connection_id: "conn-1", message_ids: ["msg-2"] },
      { signal: completionFirst.signal },
    );
    now = 2100;
    queued.callback?.();
    assert.equal((await completed).kind, "result");
    completionFirst.abort();
    assert.equal(stub.getLedger()[1].completed_ms, 2100);
    assert.equal(stub.getCancellations().length, 1);
  });

  it("cancels an already-aborted signal without losing the arrival entry", async () => {
    const scheduler = new VirtualMonotonicScheduler();
    const stub = new SummarizerStub("attempt-pre-abort", { nowMs: scheduler.nowMs, scheduler });
    stub.beginWorkload(0);
    await scheduler.waitUntil(1000);
    const controller = new AbortController();
    controller.abort();
    stub.registerWorkloadMessage("conn-1", "msg-1");
    const result = await stub.handleSummarize(
      { request_id: "req-pre", connection_id: "conn-1", message_ids: ["msg-1"] },
      { signal: controller.signal },
    );
    assert.equal(result.kind, "error");
    assert.equal(stub.getLedger().length, 1);
    assert.equal(stub.getLedger()[0].completed_ms, null);
    assert.equal(stub.getCancellations().length, 1);
  });

  it("preserves completion-first outcomes when an abort arrives later", async () => {
    const scheduler = new VirtualMonotonicScheduler();
    const stub = new SummarizerStub("attempt-complete-first", { nowMs: scheduler.nowMs, scheduler });
    stub.beginWorkload(0);
    await scheduler.waitUntil(1000);
    const controller = new AbortController();
    stub.registerWorkloadMessage("conn-1", "msg-1");
    const pending = stub.handleSummarize(
      { request_id: "req-done", connection_id: "conn-1", message_ids: ["msg-1"] },
      { signal: controller.signal },
    );
    stub.advanceTo(1100);
    assert.equal((await pending).kind, "result");
    controller.abort();
    assert.equal(stub.getLedger()[0].completed_ms, 1100);
    assert.equal(stub.getCancellations().length, 0);
  });


  it("rejects summarize ids that were never sent on that connection", async () => {
    const scheduler = new VirtualMonotonicScheduler();
    const stub = new SummarizerStub("attempt-trust", { nowMs: scheduler.nowMs, scheduler });
    stub.beginWorkload(0);
    await scheduler.waitUntil(100);
    stub.registerWorkloadMessage("conn-1", "m-trusted");

    const trusted = stub.handleSummarize({
      request_id: "req-ok",
      connection_id: "conn-1",
      message_ids: ["m-trusted"],
    });
    const fabricated = stub.handleSummarize({
      request_id: "req-fabricated",
      connection_id: "conn-1",
      message_ids: ["m-fabricated"],
    });
    const wrongConnection = stub.handleSummarize({
      request_id: "req-wrong-connection",
      connection_id: "conn-2",
      message_ids: ["m-trusted"],
    });
    const mixed = stub.handleSummarize({
      request_id: "req-mixed",
      connection_id: "conn-1",
      message_ids: ["m-trusted", "m-fabricated"],
    });

    stub.advanceTo(200);
    assert.equal((await trusted).kind, "result");
    for (const outcome of [await fabricated, await wrongConnection, await mixed]) {
      assert.equal(outcome.kind, "error");
      if (outcome.kind === "error") assert.equal(outcome.error.code, "INVALID_REQUEST");
    }

    const ledger = stub.getLedger();
    assert.equal(ledger.length, 4);
    assert.deepEqual(
      ledger.map((entry) => entry.delivered),
      [true, false, false, false]
    );
    assert.deepEqual(
      ledger.map((entry) => entry.error_code),
      [null, "INVALID_REQUEST", "INVALID_REQUEST", "INVALID_REQUEST"]
    );
    assert.deepEqual(
      ledger.map((entry) => entry.untrusted_message_count),
      [0, 1, 1, 1]
    );
    // Capacity and retry accounting still cover the rejected attempts. Untrusted
    // calls share one fixed retry key per connection, so the table stays bounded.
    assert.equal(stub.getCallsForSecond(0), 4);
    assert.equal(ledger[1].retry, false);
    assert.equal(ledger[3].retry, true);
  });

  it("bounds the trusted-id registry and keeps rejected ids inside the ledger cap", async () => {
    const scheduler = new VirtualMonotonicScheduler();
    const stub = new SummarizerStub("attempt-trust-cap", {
      nowMs: scheduler.nowMs,
      scheduler,
      ledgerCap: 2,
    });
    stub.beginWorkload(0);
    await scheduler.waitUntil(100);
    for (let index = 0; index < MAX_TRUSTED_WORKLOAD_MESSAGES; index += 1) {
      stub.registerWorkloadMessage("conn-1", `trusted-${index}`);
    }
    assert.throws(
      () => stub.registerWorkloadMessage("conn-1", "trusted-overflow"),
      /trusted-id registry capacity/
    );

    const first = stub.handleSummarize({
      request_id: "req-untrusted-1",
      connection_id: "conn-1",
      message_ids: ["fabricated-1"],
    });
    const second = stub.handleSummarize({
      request_id: "req-untrusted-2",
      connection_id: "conn-1",
      message_ids: ["fabricated-2"],
    });
    const third = stub.handleSummarize({
      request_id: "req-untrusted-3",
      connection_id: "conn-1",
      message_ids: ["fabricated-3"],
    });

    stub.advanceTo(200);
    const firstOutcome = await first;
    assert.equal(firstOutcome.kind, "error");
    if (firstOutcome.kind === "error") assert.equal(firstOutcome.error.code, "INVALID_REQUEST");
    assert.equal((await second).kind, "error");
    const thirdOutcome = await third;
    assert.equal(thirdOutcome.kind, "error");
    if (thirdOutcome.kind === "error") assert.equal(thirdOutcome.error.code, "UNAVAILABLE");

    assert.equal(stub.getLedger().length, 2, "rejected ids never grow the ledger past its cap");
    assert.equal(stub.isExhausted, true);
  });

  it("records untrusted id lists as empty so candidate ids never enter the evidence table", async () => {
    const scheduler = new VirtualMonotonicScheduler();
    const stub = new SummarizerStub("attempt-id-table", { nowMs: scheduler.nowMs, scheduler });
    stub.beginWorkload(0);
    await scheduler.waitUntil(100);
    stub.registerWorkloadMessage("conn-1", "m-trusted");

    const fabricatedIds = Array.from({ length: 256 }, (_, index) => `fabricated-${index}`);
    const fabricated = stub.handleSummarize({
      request_id: "req-fabricated",
      connection_id: "conn-1",
      message_ids: fabricatedIds,
    });
    const mixed = stub.handleSummarize({
      request_id: "req-mixed",
      connection_id: "conn-1",
      message_ids: ["m-trusted", "fabricated-mixed"],
    });
    const trusted = stub.handleSummarize({
      request_id: "req-trusted",
      connection_id: "conn-1",
      message_ids: ["m-trusted"],
    });

    stub.advanceTo(200);
    for (const outcome of [await fabricated, await mixed]) {
      assert.equal(outcome.kind, "error");
      if (outcome.kind === "error") assert.equal(outcome.error.code, "INVALID_REQUEST");
    }
    assert.equal((await trusted).kind, "result");

    const ledger = stub.getLedger();
    const recordedIds = ledger.flatMap((entry) => entry.message_ids);
    assert.deepEqual(recordedIds, ["m-trusted"], "only trusted ids reach the evidence table");
    assert.equal(new Set(recordedIds).size, 1, "256 candidate ids added zero distinct ids");

    assert.equal(ledger[0].message_ids.length, 0);
    assert.equal(ledger[0].untrusted_message_count, 256);
    assert.equal(ledger[1].message_ids.length, 0, "a mixed call records no ids at all");
    assert.equal(ledger[1].untrusted_message_count, 1);
    assert.equal(ledger[2].untrusted_message_count, 0);
    assert.deepEqual(ledger[2].message_ids, ["m-trusted"]);

    // Every forwarded attempt is still recorded and charged.
    assert.equal(ledger.length, 3);
    assert.equal(stub.getCallsForSecond(0), 3);
    assert.equal(ledger[0].retry, false);
    assert.equal(ledger[1].retry, true, "untrusted calls share one bounded retry key");
  });

  it("records no ids for an over-capacity call that names untrusted ids", async () => {
    const scheduler = new VirtualMonotonicScheduler();
    const stub = new SummarizerStub("attempt-capacity-ids", {
      nowMs: scheduler.nowMs,
      scheduler,
    });
    stub.beginWorkload(0);
    await scheduler.waitUntil(100);
    for (let index = 0; index < 30; index += 1) {
      stub.registerWorkloadMessage("conn-1", `trusted-${index}`);
    }
    const admitted = [];
    for (let index = 0; index < 30; index += 1) {
      admitted.push(
        stub.handleSummarize({
          request_id: `req-${index}`,
          connection_id: "conn-1",
          message_ids: [`trusted-${index}`],
        })
      );
    }
    const overCapacityTrusted = stub.handleSummarize({
      request_id: "req-over-trusted",
      connection_id: "conn-1",
      message_ids: ["trusted-0"],
    });
    const overCapacityUntrusted = stub.handleSummarize({
      request_id: "req-over-untrusted",
      connection_id: "conn-1",
      message_ids: ["fabricated-a", "fabricated-b"],
    });

    stub.advanceTo(200);
    for (const outcome of await Promise.all(admitted)) {
      assert.equal(outcome.kind, "result");
    }
    const trustedOverflow = await overCapacityTrusted;
    assert.equal(trustedOverflow.kind, "error");
    if (trustedOverflow.kind === "error") {
      assert.equal(trustedOverflow.error.code, "OVERLOADED");
    }
    const untrustedOverflow = await overCapacityUntrusted;
    assert.equal(untrustedOverflow.kind, "error");
    if (untrustedOverflow.kind === "error") {
      assert.equal(untrustedOverflow.error.code, "OVERLOADED");
    }

    const ledger = stub.getLedger();
    const untrustedEntry = ledger[ledger.length - 1];
    assert.equal(untrustedEntry.untrusted_message_count, 2);
    assert.equal(untrustedEntry.message_ids.length, 0);
    assert.equal(untrustedEntry.error_code, "OVERLOADED");
    const trustedEntry = ledger[ledger.length - 2];
    assert.deepEqual(
      trustedEntry.message_ids,
      ["trusted-0"],
      "trusted ids are bounded by the registry and may stay on a capacity rejection"
    );
    assert.equal(stub.getCallsForSecond(0), 32);
  });

  it("stops recording at the ledger cap and reports UNAVAILABLE instead of dropping observations", () => {
    const stub = new ProviderStub("attempt-cap", { ledgerCap: 1 });
    assert.equal(
      stub.handleDebit({
        instruction_id: "inst-1",
        operation_ref: "op-1",
        amount_minor: 10,
        currency: "USD",
      }).kind,
      "result"
    );
    const second = stub.handleDebit({
      instruction_id: "inst-2",
      operation_ref: "op-2",
      amount_minor: 10,
      currency: "USD",
    });
    assert.equal(second.kind, "error");
    if (second.kind === "error") assert.equal(second.error.code, "UNAVAILABLE");
    assert.equal(stub.isExhausted, true);
    assert.equal(stub.getLedger().length, 1);
    // Capacity is reserved before the effect: no unobserved commit exists.
    assert.equal(stub.getCommittedDebits("inst-2").length, 0);
    assert.equal(stub.getDebitAttempts("inst-2").length, 0);
  });

  it("binds a final success settlement to the exact committed amount and currency", () => {
    const stub = new ProviderStub("attempt-settlement");
    stub.handleDebit({
      instruction_id: "inst-1",
      operation_ref: "op-1",
      amount_minor: 500,
      currency: "USD",
    });
    stub.setSettlement("inst-1", {
      evidence_id: "ev-settlement-final",
      final: true,
      outcome: "succeeded",
    });
    stub.handleSettlement({ instruction_id: "inst-1" });

    const wrongAmount = stub.verifyEvidence({
      evidence_id: "ev-settlement-final",
      instruction_id: "inst-1",
      expected_outcome: "succeeded",
      require_final: true,
      amount_minor: 900,
      currency: "USD",
    });
    assert.equal(wrongAmount.accepted, false);
    assert.match(wrongAmount.reason, /settled amount/);

    const exact = stub.verifyEvidence({
      evidence_id: "ev-settlement-final",
      instruction_id: "inst-1",
      expected_outcome: "succeeded",
      require_final: true,
      amount_minor: 500,
      currency: "USD",
    });
    assert.equal(exact.accepted, true);

    const noEffect = new ProviderStub("attempt-settlement-ghost");
    noEffect.setSettlement("inst-ghost", {
      evidence_id: "ev-settlement-ghost",
      final: true,
      outcome: "succeeded",
    });
    noEffect.handleSettlement({ instruction_id: "inst-ghost" });
    const ghost = noEffect.verifyEvidence({
      evidence_id: "ev-settlement-ghost",
      instruction_id: "inst-ghost",
      expected_outcome: "succeeded",
      require_final: true,
      amount_minor: 500,
      currency: "USD",
    });
    assert.equal(ghost.accepted, false);
    assert.match(ghost.reason, /committed effects/);
  });
});

describe("SRS-003 payment driver", () => {
  it("passes the base schedule with exact instruction-bound evidence", async () => {
    const { provider, candidate } = buildContext();
    const driver = new PaymentCaseDriver(candidate, candidate, provider);
    const verdict = await driver.runBaseSchedule("inst-base");

    assert.equal(verdict.passed, true, verdict.failure_reasons.join("; "));
    assert.equal(verdict.committed_debits, 1);
    assert.equal(verdict.evidence_checks.length, 3);
    assert.ok(verdict.evidence_checks.every((check) => check.accepted));
    assert.equal(verdict.failure_reason_count, 0);
    assert.equal(verdict.unverified_reason_count, 0);
  });

  it("passes the adverse schedule: unknown, restart, pending replay, then final positive", async () => {
    const { provider, candidate } = buildContext();
    const driver = new PaymentCaseDriver(candidate, candidate, provider);
    const verdict = await driver.runAdverseSchedule("inst-adv");

    assert.equal(verdict.passed, true, verdict.failure_reasons.join("; "));
    assert.equal(verdict.restart_occurred, true);
    assert.ok(verdict.unknown_views_observed >= 2);
    assert.equal(verdict.committed_debits, 1);
    assert.equal(candidate.restarts, 1);
    assert.equal(candidate.resets, 1);
  });

  it("detects fabricated finality while the provider lookup is still pending", async () => {
    const { provider, candidate } = buildContext();
    candidate.fabricateFinalityOnPending = true;
    const verdict = await new PaymentCaseDriver(candidate, candidate, provider).runAdverseSchedule(
      "inst-adv-faulty"
    );

    assert.equal(verdict.passed, false);
    assert.ok(
      verdict.failure_reasons.some((reason) => /expected 'unknown'/.test(reason)),
      verdict.failure_reasons.join("; ")
    );
  });

  it("passes the changed-constraint schedule with deduplication disabled", async () => {
    const { provider, candidate } = buildContext();
    const verdict = await new PaymentCaseDriver(candidate, candidate, provider).runChangedConstraintSchedule(
      "inst-cc"
    );

    assert.equal(verdict.passed, true, verdict.failure_reasons.join("; "));
    assert.equal(verdict.committed_debits, 1);
    assert.equal(verdict.restart_occurred, true);
  });

  it("detects a second committed debit when the candidate blindly re-debits on unknown", async () => {
    const { provider, candidate } = buildContext();
    candidate.retryDebitOnUnknown = true;
    const verdict = await new PaymentCaseDriver(candidate, candidate, provider).runChangedConstraintSchedule(
      "inst-cc-faulty"
    );

    assert.equal(verdict.passed, false);
    assert.ok(
      verdict.failure_reasons.some((reason) => /found 2/.test(reason)),
      verdict.failure_reasons.join("; ")
    );
  });

  it("passes the fresh negative-outcome control and permits a subsequent instruction", async () => {
    const { provider, candidate } = buildContext();
    const verdict = await new PaymentCaseDriver(
      candidate,
      candidate,
      provider
    ).runNegativeOutcomeControl("inst-neg", "inst-neg-next");

    assert.equal(verdict.passed, true, verdict.failure_reasons.join("; "));
    assert.equal(verdict.final_negative_observed, true);
    assert.equal(verdict.committed_debits, 0);
    assert.equal(provider.getCommittedDebits("inst-neg-next").length, 1);
  });

  it("detects non-final absence treated as negative evidence", async () => {
    const { provider, candidate } = buildContext();
    candidate.treatAbsentAsFailed = true;
    const verdict = await new PaymentCaseDriver(
      candidate,
      candidate,
      provider
    ).runChangedConstraintSchedule("inst-cc-absent");

    assert.equal(verdict.passed, false);
    assert.ok(
      verdict.failure_reasons.some((reason) => /state 'failed'/.test(reason)),
      verdict.failure_reasons.join("; ")
    );
  });

  it("rejects evidence that is not bound to the claimed instruction", async () => {
    const { provider, candidate } = buildContext();
    candidate.returnForeignEvidence = true;
    const verdict = await new PaymentCaseDriver(candidate, candidate, provider).runBaseSchedule(
      "inst-foreign"
    );

    assert.equal(verdict.passed, false);
    assert.ok(
      verdict.failure_reasons.some((reason) => /absent from the trusted provider ledger/.test(reason)),
      verdict.failure_reasons.join("; ")
    );
  });
  it("rejects a wrong committed amount even when the settlement claims success", async () => {
    const { provider, candidate } = buildContext();
    candidate.wrongDebitAmount = true;
    const verdict = await new PaymentCaseDriver(candidate, candidate, provider).runAdverseSchedule(
      "inst-wrong-amount"
    );

    assert.equal(verdict.passed, false);
    assert.ok(
      verdict.failure_reasons.some((reason) => /settled amount/.test(reason)),
      verdict.failure_reasons.join("; ")
    );
  });

  it("withholds the pass when the trusted provider ledger is exhausted", async () => {
    const scheduler = new VirtualMonotonicScheduler();
    const provider = new ProviderStub("attempt-exhausted", {
      clock: scheduler.nowMs,
      ledgerCap: 2,
    });
    const summarizer = new SummarizerStub("attempt-exhausted", { nowMs: scheduler.nowMs });
    const candidate = new ReferenceCandidate(provider, summarizer);
    const verdict = await new PaymentCaseDriver(candidate, candidate, provider).runAdverseSchedule(
      "inst-exhausted"
    );

    assert.equal(provider.isExhausted, true);
    assert.equal(verdict.passed, false);
    assert.ok(
      verdict.unverified_reasons.some((reason) => /exhausted/.test(reason)),
      verdict.unverified_reasons.join("; ")
    );
  });
});

describe("SRS-003 tenant driver", () => {
  it("passes with independent stage observations, linearization, clean restore and no mutation", async () => {
    const { candidate } = buildContext();
    const verdict = await new TenantCaseDriver(candidate, candidate, candidate).runSchedule();

    assert.equal(verdict.passed, true, verdict.failure_reasons.concat(verdict.unverified_reasons).join("; "));
    assert.equal(verdict.cross_tenant_leakage_detected, false);
    assert.equal(verdict.revocation_linearized, true);
    assert.equal(verdict.intermediate_observations_complete, true);
    assert.equal(verdict.snapshot_restored_cleanly, true);
    assert.equal(verdict.unauthorized_mutation_detected, false);
    assert.equal(verdict.unauthorized_requests_rejected, 3);
    assert.equal(verdict.failure_reason_count, 0);
    assert.equal(verdict.unverified_reason_count, 0);
    assert.equal(candidate.freezes, 1);
    assert.equal(candidate.resumes, 1);
  });

  it("detects revocation resurrection after restoring the pre-revocation snapshot", async () => {
    const { candidate } = buildContext();
    candidate.resurrectOnRestore = true;
    const verdict = await new TenantCaseDriver(candidate, candidate, candidate).runSchedule();

    assert.equal(verdict.passed, false);
    assert.ok(
      verdict.failure_reasons.some((reason) => /resurrection/.test(reason)),
      verdict.failure_reasons.join("; ")
    );
  });

  it("detects unauthorized calls that mutate another tenant's state", async () => {
    const { candidate } = buildContext();
    candidate.mutateOnUnauthorized = true;
    const verdict = await new TenantCaseDriver(candidate, candidate, candidate).runSchedule();

    assert.equal(verdict.passed, false);
    assert.equal(verdict.unauthorized_mutation_detected, true);
  });

  it("detects cross-tenant content leakage in public query results", async () => {
    const { candidate } = buildContext();
    candidate.leakB1ToA = true;
    const verdict = await new TenantCaseDriver(candidate, candidate, candidate).runSchedule();

    assert.equal(verdict.passed, false);
    assert.equal(verdict.cross_tenant_leakage_detected, true);
  });

  it("withholds the pass when an intermediate stage is unreadable", async () => {
    const { candidate } = buildContext();
    candidate.omitStageRecords = true;
    const verdict = await new TenantCaseDriver(candidate, candidate, candidate).runSchedule();

    assert.equal(verdict.passed, false);
    assert.equal(verdict.intermediate_observations_complete, false);
    assert.ok(verdict.unverified_reasons.length > 0);
    assert.equal(candidate.resumes, 1, "the frozen process must be resumed exactly once");
  });

  it("withholds the pass when stage correspondence was never reviewed", async () => {
    const { candidate } = buildContext();
    candidate.rejectStageCorrespondence = true;
    const verdict = await new TenantCaseDriver(candidate, candidate, candidate).runSchedule();

    assert.equal(verdict.passed, false);
    assert.ok(
      verdict.unverified_reasons.some((reason) => /not independently accepted/.test(reason)),
      verdict.unverified_reasons.join("; ")
    );
  });

  it("withholds the pass when frozen stage records do not match the public trace", async () => {
    const { candidate } = buildContext();
    candidate.traceMismatch = true;
    const verdict = await new TenantCaseDriver(candidate, candidate, candidate).runSchedule();

    assert.equal(verdict.passed, false);
    assert.ok(
      verdict.unverified_reasons.some((reason) => /do not correspond/.test(reason)),
      verdict.unverified_reasons.join("; ")
    );
  });

  it("resumes the process and withholds the pass when the controller cannot freeze", async () => {
    const { candidate } = buildContext();
    candidate.refuseFreeze = true;
    const verdict = await new TenantCaseDriver(candidate, candidate, candidate).runSchedule();

    assert.equal(verdict.passed, false);
    assert.ok(
      verdict.unverified_reasons.some((reason) => /freeze\/snapshot unavailable/.test(reason)),
      verdict.unverified_reasons.join("; ")
    );
    assert.equal(candidate.resumes, 1);
  });

  it("detects revoked content leaked only through a public trace stage", async () => {
    const { candidate } = buildContext();
    candidate.leakRevokedInTrace = true;
    const verdict = await new TenantCaseDriver(candidate, candidate, candidate).runSchedule();

    assert.equal(verdict.passed, false);
    assert.ok(
      verdict.failure_reasons.some((reason) => /revoked document/.test(reason)),
      verdict.failure_reasons.join("; ")
    );
  });

  it("detects revoked content returned by the restore response", async () => {
    const { candidate } = buildContext();
    candidate.restoreLeak = true;
    const verdict = await new TenantCaseDriver(candidate, candidate, candidate).runSchedule();

    assert.equal(verdict.passed, false);
    assert.ok(
      verdict.failure_reasons.some((reason) => /restore item 0: revoked document/.test(reason)),
      verdict.failure_reasons.join("; ")
    );
  });
});

describe("SRS-003 overload driver", () => {
  it("qualifies a whole-case pass for 24 admitted streams with real coverage and bounded drain", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    const driver = new OverloadCaseDriver(candidate, candidate, summarizer, scheduler);
    const verdict = await driver.runWorkload();

    assert.equal(
      verdict.whole_case_pass,
      true,
      JSON.stringify({
        coverage: verdict.coverage,
        safety: verdict.safety,
        failures: verdict.failure_reasons,
        unverified: verdict.unverified_reasons,
      })
    );
    assert.ok(verdict.coverage.preloss_admitted_streams > 20);
    assert.ok(verdict.coverage.post_loss1_offered_streams > 20);
    assert.ok(verdict.coverage.post_loss2_offered_streams > 12);
    assert.equal(verdict.coverage.reader_stalls_observed, 8);
    assert.equal(verdict.coverage.reader_stall_seconds, 10);
    assert.equal(verdict.coverage.reconnects_observed, 8);
    assert.equal(verdict.coverage.drain_bounded, true);
    assert.equal(verdict.coverage.undelivered_bounded, true);
    assert.equal(verdict.safety.low12_control_rejected, false);
    assert.equal(verdict.safety.safe_shedding_qualifies, true);
    assert.equal(verdict.safety.transport_observation_verified, true);
    assert.equal(verdict.safety.liveness_observed, true);
    assert.equal(verdict.safety.connection_buffers_within_limit, true);
    assert.equal(verdict.safety.terminated_after_drain, true);
    assert.equal(verdict.safety.downstream_capacity_honored, true);
    assert.equal(verdict.metrics.total_summary_offers, 24 * 60);
    assert.equal(verdict.metrics.total_bytes_allocated, 24 * 60 * 10 * 1024);
    assert.ok(verdict.metrics.total_messages_dropped > 0);
    assert.ok(verdict.metrics.forwarded_summary_attempts > 0);
    assert.equal(verdict.failure_reason_count, 0);
    assert.equal(verdict.unverified_reason_count, 0);
    assert.equal(verdict.metrics.stub_rejected_calls, 0);
  });

  it("rejects a control capped at 12 admissions from a whole-case pass", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.maxAdmissions = 12;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.coverage.preloss_admitted_streams, 12);
    assert.equal(verdict.safety.low12_control_rejected, true);
    assert.equal(verdict.coverage.all_coverage_met, false);
    assert.equal(verdict.whole_case_pass, false);
  });

  it("fails coverage when admitted streams close early and the offer population shrinks", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.faultClosedConnections = new Set(["conn-01", "conn-02", "conn-03", "conn-04", "conn-05"]);
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.coverage.all_coverage_met, false);
    assert.ok(verdict.coverage.post_loss2_offered_streams <= 19);
    assert.equal(verdict.whole_case_pass, false);
  });

  it("detects a candidate that labels never-accepted data as delivered", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.fakeDelivery = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.dropped_not_labeled_delivered, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.failure_reasons.some((reason) => /never accepted/.test(reason)));
  });

  it("detects retries beyond the declared per-request bound", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.excessRetries = 3;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.retries_within_declared_bound, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.metrics.stub_rejected_calls > 0);
  });

  it("withholds the pass when independent transport accounting is unavailable", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    const transport = { sendRawRequest: candidate.sendRawRequest } as unknown as CandidateTransport;
    const verdict = await new OverloadCaseDriver(
      transport,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.transport_observation_verified, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.unverified_reasons.some((reason) => /transport accounting/.test(reason)));
  });

  it("withholds the pass when the runtime cannot observe candidate memory", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.memoryRssBytes = null;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.process_observation_bounded, false);
    assert.equal(verdict.whole_case_pass, false);
  });

  it("fails safety when the candidate floods the stub even though the stub rejects", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.summaryRateLimit = 100;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.downstream_capacity_honored, false);
    assert.ok(verdict.metrics.max_forwarded_attempts_per_second > 20);
    assert.ok(verdict.metrics.forwarded_summary_rejected > 0);
    assert.equal(verdict.whole_case_pass, false);
  });

  it("does not penalize safe shedding: forwarding nothing is not a safety failure", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.ignoreOffers = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.metrics.forwarded_summary_attempts, 0);
    assert.equal(verdict.safety.downstream_capacity_honored, true);
    assert.equal(verdict.whole_case_pass, true);
  });

  it("requires independent termination after drain", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.stayLiveAfterDrain = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.terminated_after_drain, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.failure_reasons.some((reason) => /still live/.test(reason)));
  });

  it("detects a silent discard reported as zero undelivered", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.silentDiscard = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.coverage.undelivered_bounded, false);
    assert.equal(verdict.whole_case_pass, false);
  });

  it("detects per-connection buffering above the declared limit", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.excessReportedBuffer = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.connection_buffers_within_limit, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.failure_reasons.some((reason) => /buffered .* above the declared/.test(reason)));
  });
  it("withholds the pass when per-connection buffer snapshot is missing (null)", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.nullBufferSnapshot = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.connection_buffers_within_limit, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.unverified_reasons.some((reason) => /buffer observation unavailable/.test(reason)));
  });

  it("withholds the pass when buffer snapshot is empty while connections are active", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.emptyBufferSnapshot = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.connection_buffers_within_limit, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.unverified_reasons.some((reason) => /incomplete or invalid provenance\/population/.test(reason)));
  });

  it("withholds the pass when buffer snapshot has duplicate or invalid buffer evidence", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.duplicateConnectionInBuffer = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.connection_buffers_within_limit, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.unverified_reasons.some((reason) => /duplicate or invalid buffer evidence|incomplete or invalid/.test(reason)));
  });

  it("withholds the pass when buffer snapshot has negative buffer bytes", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.negativeBufferBytes = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.connection_buffers_within_limit, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.unverified_reasons.some((reason) => /duplicate or invalid buffer evidence/.test(reason)));
  });

  it("withholds the pass when buffer snapshot has a stale process session", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.staleBufferSession = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.connection_buffers_within_limit, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.unverified_reasons.some((reason) => /incomplete or invalid provenance\/population|session changed/.test(reason)));
  });

  it("detects candidate rejection that disagrees with independent disposition", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.candidateDisagreementOnRejection = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.dropped_not_labeled_delivered, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.failure_reasons.some((reason) => /candidate accepted .* at send time but independent disposition shows not accepted|candidate rejection .* disagrees/.test(reason)));
  });

  it("withholds the pass when independent message disposition ledger is unavailable", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.dispositionLedgerUnavailable = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.unverified_reasons.some((reason) => /disposition ledger is unavailable/.test(reason)));
  });

  it("fails safety when candidate process exits during workload", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.exitDuringWorkload = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.liveness_observed, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.failure_reasons.some((reason) => /exited during workload/.test(reason)));
  });

  it("withholds the pass when post-drain candidate process state is unknown", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.unknownTerminationPhase = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.terminated_after_drain, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.equal(verdict.failure_reasons.length, 0);
    assert.ok(verdict.unverified_reasons.some((reason) => /post-drain candidate process state is unknown/.test(reason)));
  });

  it("withholds the pass when post-drain exit receipt is missing", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.missingExitReceipt = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.terminated_after_drain, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.unverified_reasons.some((reason) => /exit receipt identity is unavailable/.test(reason)));
  });

  it("fails safety when post-drain PID does not match workload PID", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.wrongTerminationPid = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.terminated_after_drain, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.failure_reasons.some((reason) => /PID does not match the workload PID/.test(reason)));
  });

  it("fails safety when last-live RSS at exit exceeds the memory cap", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.excessLastLiveRss = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.failure_reasons.some((reason) => /last-live RSS exceeded the cap/.test(reason)));
  });

  it("fails coverage when auxiliary offer delivery receipts are missing", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.omitOfferReceipts = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.coverage.all_coverage_met, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.unverified_reasons.some((reason) => /auxiliary offer .* no independent receive-boundary receipt/.test(reason)));
  });
  it("withholds the pass when buffer snapshot reuses a duplicate observation ID", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.duplicateBufferObservationId = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.connection_buffers_within_limit, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.unverified_reasons.some((reason) => /incomplete or invalid provenance\/population/.test(reason)));
  });

  it("withholds the pass when buffer snapshot has non-monotonic observation time", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.nonMonotonicBufferTime = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.connection_buffers_within_limit, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.unverified_reasons.some((reason) => /incomplete or invalid provenance\/population|before current second reads finished/.test(reason)));
  });

  it("detects a silent discard with arithmetically correct drain count", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.silentDiscardWithCorrectCount = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.unverified_reasons.some((reason) => /no independent terminal disposition/.test(reason)));
    // Per-window diagnostics are built from independent dispositions, so the
    // silently discarded messages show up as unresolved, not as retained.
    assert.ok(
      verdict.window_diagnostics.some(
        (window) => window.unresolved_count > 0 && window.retained_count === 0
      )
    );
  });

  it("fails safety when auxiliary offer delivery receipt has duplicate ID", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.duplicateOfferReceipt = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.transport_observation_verified, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.failure_reasons.some((reason) => /duplicate delivery receipts/.test(reason)));
  });

  it("fails safety when auxiliary offer delivery receipt is misbound to wrong sequence or window", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.misboundOfferReceipt = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.transport_observation_verified, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(
      verdict.failure_reasons.some(
        (reason) => /misbound or has invalid sequence\/bytes\/hash\/time/.test(reason)
      )
    );
    assert.ok(
      verdict.unverified_reasons.some((reason) => /outside declared window/.test(reason))
    );
  });

  it("fails safety when auxiliary offer delivery receipt has invalid sha256 hash", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.wrongHashOfferReceipt = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.transport_observation_verified, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.failure_reasons.some((reason) => /misbound or has invalid sequence\/bytes\/hash\/time/.test(reason)));
  });

  it("fails safety when message disposition has wrong process session", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.dispositionWrongSession = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.failure_reasons.some((reason) => /invalid provenance, ordering, or message binding/.test(reason)));
  });

  it("fails safety when message disposition events arrive out of order", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.dispositionOutOfOrder = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.failure_reasons.some((reason) => /invalid provenance, ordering, or message binding/.test(reason)));
  });

  it("fails safety when message disposition reports wrong byte count", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.dispositionWrongBytes = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.failure_reasons.some((reason) => /invalid provenance, ordering, or message binding/.test(reason)));
  });

  it("passes when candidate accepts a message and later drops it before delivery", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.acceptedThenDropped = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(
      verdict.whole_case_pass,
      true,
      JSON.stringify({
        coverage: verdict.coverage,
        safety: verdict.safety,
        failures: verdict.failure_reasons,
        unverified: verdict.unverified_reasons,
      })
    );
    assert.equal(verdict.safety.dropped_not_labeled_delivered, true);
    assert.equal(verdict.failure_reasons.length, 0);
    assert.equal(verdict.coverage.undelivered_bounded, true);
  });

  it("withholds the pass when summarizer timing exceeds the parent-set 100ms diagnostic bound", async () => {
    const baseScheduler = new VirtualMonotonicScheduler();
    const scheduler: MonotonicScheduler = {
      isVirtual: true,
      nowMs: baseScheduler.nowMs,
      waitUntil: baseScheduler.waitUntil,
      scheduleAt: (targetMs: number, callback: () => void) =>
        baseScheduler.scheduleAt(targetMs + 150, callback),
    };
    const provider = new ProviderStub("attempt-case-late", { clock: scheduler.nowMs });
    const summarizer = new SummarizerStub("attempt-case-late", {
      nowMs: scheduler.nowMs,
      scheduler,
    });
    const candidate = new ReferenceCandidate(provider, summarizer, scheduler.nowMs);
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.unverified_reasons.some((reason) => /diagnostic timing bound/.test(reason)));

    // Timing evidence carries values, not just shape: every attempt completed
    // at arrival + the configured service latency, and the late ones are
    // recorded with their measured lateness.
    assert.ok(verdict.timing_evidence.length > 0);
    for (const entry of verdict.timing_evidence) {
      assert.ok(entry.completed_ms !== null && entry.scheduled_ms !== null);
      assert.equal(entry.scheduled_ms, entry.arrival_ms + summarizer.serviceLatency);
      assert.equal(entry.latency_ms, entry.completed_ms - entry.arrival_ms);
      assert.equal(entry.lateness_ms, entry.completed_ms - entry.scheduled_ms);
    }
    const lateEntries = verdict.timing_evidence.filter(
      (entry) => (entry.lateness_ms ?? 0) > 100
    );
    assert.ok(lateEntries.length > 0);
    assert.ok(lateEntries.every((entry) => (entry.lateness_ms ?? 0) > 100));

    assert.equal(verdict.window_diagnostics.length, 60);
    assert.ok(verdict.window_diagnostics.every((window) => window.unresolved_count === 0));
  });

  it("detects retries beyond bound even when candidate uses fresh request IDs", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.excessRetries = 2;
    candidate.retryWithFreshRequestId = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.retries_within_declared_bound, false);
    assert.equal(verdict.whole_case_pass, false);
  });

  it("records a workload step executed outside its declared window as unverified", async () => {
    const base = new VirtualMonotonicScheduler();
    let delayed = false;
    const scheduler: MonotonicScheduler = {
      isVirtual: true,
      nowMs: base.nowMs,
      scheduleAt: base.scheduleAt,
      waitUntil: async (targetMs: number) => {
        if (!delayed && targetMs > 5000 && targetMs < 6000) {
          // Push exactly one mid-window step a full window late.
          delayed = true;
          await base.waitUntil(targetMs + 1000);
          return;
        }
        await base.waitUntil(targetMs);
      },
    };
    const provider = new ProviderStub("attempt-late-step", { clock: scheduler.nowMs });
    const summarizer = new SummarizerStub("attempt-late-step", {
      nowMs: scheduler.nowMs,
      scheduler,
    });
    const candidate = new ReferenceCandidate(provider, summarizer, scheduler.nowMs);
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.whole_case_pass, false);
    assert.ok(
      verdict.unverified_reasons.some((reason) =>
        /workload step \d+ at second \d+ executed at \d+ms outside window/.test(reason)
      )
    );
  });

  it("rejects an auxiliary offer receipt observed outside its declared window", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.earlyOfferReceipt = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.transport_observation_verified, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(
      verdict.unverified_reasons.some((reason) => /outside declared window/.test(reason))
    );
    assert.equal(
      verdict.failure_reasons.some((reason) =>
        /misbound or has invalid sequence\/bytes\/hash\/time/.test(reason)
      ),
      false
    );
  });

  it("records a drain that starts after the diagnostic bound as unverified", async () => {
    const base = new VirtualMonotonicScheduler();
    let delayedDrain = false;
    const scheduler: MonotonicScheduler = {
      isVirtual: true,
      nowMs: base.nowMs,
      scheduleAt: base.scheduleAt,
      waitUntil: async (targetMs: number) => {
        if (!delayedDrain && targetMs === 60000) {
          delayedDrain = true;
          await base.waitUntil(targetMs + 400);
          return;
        }
        await base.waitUntil(targetMs);
      },
    };
    const provider = new ProviderStub("attempt-late-drain", { clock: scheduler.nowMs });
    const summarizer = new SummarizerStub("attempt-late-drain", {
      nowMs: scheduler.nowMs,
      scheduler,
    });
    const candidate = new ReferenceCandidate(provider, summarizer, scheduler.nowMs);
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.whole_case_pass, false);
    assert.ok(verdict.unverified_reasons.some((reason) => /drain started late/.test(reason)));
  });

  it("caps the post-drain deadline at t0+65s over a longer derived deadline", async () => {
    const base = new VirtualMonotonicScheduler();
    let delayedDrain = false;
    const scheduler: MonotonicScheduler = {
      isVirtual: true,
      nowMs: base.nowMs,
      scheduleAt: base.scheduleAt,
      waitUntil: async (targetMs: number) => {
        if (!delayedDrain && targetMs === 60000) {
          // drainStart + declared 5000ms would end at 65400ms; the t0+65s cap wins.
          delayedDrain = true;
          await base.waitUntil(targetMs + 400);
          return;
        }
        await base.waitUntil(targetMs);
      },
    };
    const provider = new ProviderStub("attempt-deadline-cap", { clock: scheduler.nowMs });
    const summarizer = new SummarizerStub("attempt-deadline-cap", {
      nowMs: scheduler.nowMs,
      scheduler,
    });
    const candidate = new ReferenceCandidate(provider, summarizer, scheduler.nowMs);
    candidate.stayLiveAfterDrain = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.safety.terminated_after_drain, false);
    assert.equal(verdict.whole_case_pass, false);
    assert.ok(
      verdict.failure_reasons.some((reason) => /still live at the 5000ms drain deadline/.test(reason)),
      JSON.stringify({
        failures: verdict.failure_reasons,
        unverified: verdict.unverified_reasons,
      })
    );
    assert.equal(scheduler.nowMs(), 65000, "the cap bounds the wait, not the derived deadline");
  });

  it("bounds a hostile candidate's verdict reasons instead of growing the verdict", async () => {
    const { candidate, summarizer, scheduler } = buildContext();
    candidate.hostileErrorText = true;
    const verdict = await new OverloadCaseDriver(
      candidate,
      candidate,
      summarizer,
      scheduler
    ).runWorkload();

    assert.equal(verdict.whole_case_pass, false);
    assert.equal(verdict.failure_reasons.length, MAX_VERDICT_REASONS);
    assert.ok(
      verdict.failure_reason_count > MAX_VERDICT_REASONS,
      `true total ${verdict.failure_reason_count} must exceed the kept ${MAX_VERDICT_REASONS}`
    );
    assert.equal(
      verdict.unverified_reasons.length,
      Math.min(verdict.unverified_reason_count, MAX_VERDICT_REASONS)
    );
    const emitted = [...verdict.failure_reasons, ...verdict.unverified_reasons];
    for (const reason of emitted) {
      assert.ok(Buffer.byteLength(reason, "utf8") <= MAX_REASON_BYTES);
    }
    assert.ok(verdict.failure_reasons.every((reason) => reason.endsWith(REASON_TRUNCATION_MARKER)));
    const payloadBytes = emitted.reduce(
      (sum, reason) => sum + Buffer.byteLength(reason, "utf8"),
      0
    );
    assert.ok(payloadBytes <= 2 * MAX_VERDICT_REASONS * MAX_REASON_BYTES);
    assert.equal(
      emitted.some((reason) => reason.includes("candidate-controlled ".repeat(100))),
      false,
      "candidate text is never echoed past the cap"
    );
    assert.ok(
      verdict.failure_reasons.some((reason) => reason.includes("candidate-controlled")),
      "the capped reason still shows the candidate text prefix"
    );
  });

  it("rejects a driver/stub pair that does not share one clock or one virtual mode", () => {
    const virtual = new VirtualMonotonicScheduler();
    const real = new RealMonotonicScheduler();
    const provider = new ProviderStub("attempt-clock-check", { clock: virtual.nowMs });

    const foreignStub = new SummarizerStub("attempt-clock-check", {
      nowMs: real.nowMs,
      scheduler: real,
    });
    const foreignCandidate = new ReferenceCandidate(provider, foreignStub, virtual.nowMs);
    assert.throws(
      () => new OverloadCaseDriver(foreignCandidate, foreignCandidate, foreignStub, virtual),
      /same monotonic clock/
    );

    const sharedClock = new RealMonotonicScheduler();
    const mislabelledScheduler: MonotonicScheduler = {
      nowMs: sharedClock.nowMs,
      scheduleAt: sharedClock.scheduleAt,
      waitUntil: sharedClock.waitUntil,
      isVirtual: true,
    };
    const mislabelledStub = new SummarizerStub("attempt-clock-check", {
      nowMs: sharedClock.nowMs,
      scheduler: mislabelledScheduler,
    });
    const mislabelledCandidate = new ReferenceCandidate(
      provider,
      mislabelledStub,
      sharedClock.nowMs
    );
    assert.throws(
      () =>
        new OverloadCaseDriver(
          mislabelledCandidate,
          mislabelledCandidate,
          mislabelledStub,
          sharedClock
        ),
      /same scheduler virtual mode/
    );
  });
});

describe("SRS-003 overload scheduler", () => {
  it("real scheduler actually waits instead of returning immediately", async () => {
    const scheduler = new RealMonotonicScheduler();
    const start = scheduler.nowMs();
    await scheduler.waitUntil(start + 25);
    assert.ok(scheduler.nowMs() - start >= 20, `elapsed ${scheduler.nowMs() - start}ms`);
  });

  it("virtual scheduler advances deterministically and refuses non-finite targets", async () => {
    const scheduler = new VirtualMonotonicScheduler();
    await scheduler.waitUntil(1234);
    assert.equal(scheduler.nowMs(), 1234);
    await scheduler.waitUntil(200);
    assert.equal(scheduler.nowMs(), 1234, "virtual time never moves backwards");
    await assert.rejects(scheduler.waitUntil(Number.NaN), /finite/);
  });
});

describe("SRS-003 evidence bounds", () => {
  it("caps reason lists and truncates reason strings on a UTF-8 boundary", () => {
    const reasons = Array.from({ length: 70 }, (_, index) => `reason-${index}`);
    const bounded = boundReasons(reasons);
    assert.equal(bounded.count, 70);
    assert.equal(bounded.reasons.length, MAX_VERDICT_REASONS);
    assert.equal(bounded.reasons[0], "reason-0");
    assert.equal(bounded.reasons[MAX_VERDICT_REASONS - 1], `reason-${MAX_VERDICT_REASONS - 1}`);

    assert.equal(boundReason("short"), "short");

    const multiByte = boundReason("é".repeat(400));
    assert.ok(Buffer.byteLength(multiByte, "utf8") <= MAX_REASON_BYTES);
    assert.ok(multiByte.endsWith(REASON_TRUNCATION_MARKER));
    assert.equal(multiByte.includes("\uFFFD"), false, "no code point was split");

    const ascii = boundReason("x".repeat(4096));
    assert.equal(Buffer.byteLength(ascii, "utf8"), MAX_REASON_BYTES);
    assert.ok(ascii.endsWith(REASON_TRUNCATION_MARKER));
  });

  it("derives the trusted-id bound from the frozen workload", () => {
    assert.equal(
      OVERLOAD_WORKLOAD.client_count * 60 * OVERLOAD_WORKLOAD.messages_per_second,
      MAX_TRUSTED_WORKLOAD_MESSAGES
    );
  });
});

describe("SRS-003 fixtures", () => {
  it("allocates exactly the requested synthetic bytes", () => {
    const bytes = generateSyntheticMessageBytes("msg-1", 1024);
    assert.equal(bytes.length, 1024);
    assert.equal(bytes.subarray(0, 8).toString("utf8"), "MSG:msg-");
    assert.throws(() => generateSyntheticMessageBytes("msg-1", 0), /positive integer/);
  });

  it("tenant and payment contract validators accept reference shapes", () => {
    const view = validatePaymentResult("submit", {
      instruction_id: "inst-1",
      state: "succeeded",
      evidence_ids: ["ev-debit-1"],
    });
    assert.equal(view.state, "succeeded");

    const query = validateTenantResult("query", {
      items: [{ ...CANARY_A1 }],
      trace: {
        retrieved: [{ ...CANARY_A1 }],
        reranked: [],
        cached: [],
      },
    }) as { items: TenantItem[]; trace: TenantTrace };
    assert.equal(query.items[0].document_id, CANARY_A1.document_id);

    const drain = validateOverloadResult("drain", { terminated: true, undelivered_count: 0 });
    assert.ok("terminated" in drain && drain.terminated === true);
  });
});
