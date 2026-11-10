import type {
  Id,
  Nat,
  Positive,
  ErrorCode,
  TenantItem,
  ProviderPayload,
  ProviderResult,
  OverloadLimits,
} from "../contracts.js";

/**
 * scripts/evals/l3/cases/contracts.ts
 *
 * Injected observation boundaries and immutable verdict formats for the three
 * independent L3 case drivers.
 *
 * Authoritative source: docs/srs/srs-skill-system-effectiveness.md Revision 3,
 * LLD-SSE-003 ("Candidate operation protocol and case ownership").
 *
 * Every interface here is supplied by the integration/runtime owner (D4/D2).
 * The drivers never invent runtime capabilities, never open host paths owned by
 * the candidate, and never read candidate-provided counters as an oracle.
 */

/**
 * A logical summary offer: the driver's independent demand event for one
 * admitted stream in one 1-second workload window. It is transport metadata on
 * the existing sideband, never a change to the frozen D1 wire schema. The
 * candidate's forwarding policy decides what to do with it.
 */
export interface RequestedSummaryOffer {
  readonly offer_id: Id;
  readonly window_index: Nat;
}

/**
 * Sideband message payload for Overload synthetic allocation/transport testing.
 * The wire request carries the frozen D1 JSON schema with the declared byte
 * count; the sideband transfers the actual Buffer and the logical offer across
 * the same candidate boundary so that candidate allocation/transport and summary
 * demand are exercised without changing the frozen wire schema.
 */
export interface TransportSideband {
  readonly syntheticBytes?: Buffer;
  readonly requested_summary?: RequestedSummaryOffer;
}


export interface AuxiliaryOfferReceipt {
  readonly attempt_id: Id;
  readonly process_session_id: Id;
  readonly seq: Positive;
  readonly connection_id: Id;
  readonly message_id: Id;
  readonly offer_id: Id;
  readonly window_index: Nat;
  readonly observed_monotonic_ms: Nat;
  readonly byte_count: Positive;
  readonly sha256: string;
}

export interface AuxiliaryTransportObservation {
  readonly attempt_id: Id;
  readonly process_session_id: Id;
  readonly observation_id: Id;
  readonly observed_monotonic_ms: Nat;
  readonly offer_receipts: readonly AuxiliaryOfferReceipt[];
}

export interface ConnectionBufferSnapshot {
  readonly attempt_id: Id;
  readonly process_session_id: Id;
  readonly observation_id: Id;
  readonly observed_monotonic_ms: Nat;
  readonly complete: boolean;
  readonly connection_buffers: readonly ConnectionBufferObservation[];
}

export interface CandidateProcessObservationBase {
  readonly attempt_id: Id;
  readonly process_session_id: Id;
  readonly observation_id: Id;
  readonly observed_monotonic_ms: Nat;
}

export type CandidateTerminationObservation =
  | (CandidateProcessObservationBase & {
      readonly phase: "running";
      readonly pid: Positive;
      readonly memory_rss_bytes: Nat;
    })
  | (CandidateProcessObservationBase & {
      readonly phase: "exited";
      readonly pid: Positive;
      readonly exit_receipt_id: Id;
      readonly last_live_memory_rss_bytes: Nat;
    })
  | (CandidateProcessObservationBase & { readonly phase: "unknown" });

export interface MessageDispositionBase {
  readonly attempt_id: Id;
  readonly process_session_id: Id;
  readonly event_seq: Positive;
  readonly request_seq: Positive;
  readonly connection_id: Id;
  readonly message_id: Id;
  readonly bytes: Positive;
  readonly observed_monotonic_ms: Nat;
}

export type MessageDispositionObservation =
  | (MessageDispositionBase & { readonly state: "accepted" })
  | (MessageDispositionBase & { readonly state: "delivered" })
  | (MessageDispositionBase & { readonly state: "dropped" })
  | (MessageDispositionBase & {
      readonly state: "retained";
      readonly buffer_observation_id: Id;
    });
export interface TransportObservation {
  readonly sideband_frames: Nat;
  readonly sideband_bytes: Nat;
  readonly auxiliary: AuxiliaryTransportObservation | null;
}



/**
 * Case execution transport. Requests are dispatched as bounded JSON frames.
 * `timeoutMs` is the transport deadline contract that the adapter must honor;
 * the session additionally bounds completion itself.
 */
export interface CandidateTransport {
  sendRawRequest(
    envelopeJson: string,
    sideband?: TransportSideband,
    timeoutMs?: number
  ): Promise<string>;
  /** Required independent counters and auxiliary receive-boundary receipts; null is unverified. */
  getTransportObservation(): Promise<TransportObservation | null>;
}


/**
 * Handle for a frozen intermediate snapshot. The driver receives only the
 * snapshot identity. It never receives a host path and never opens candidate
 * disk; the stage reader owns the isolated-boundary read.
 */
export interface CandidateSnapshotHandle {
  readonly snapshot_id: Id;
}

/**
 * Independent observation of one stream's buffered bytes, taken by the runtime
 * adapter at its boundary. `null` from `observeConnectionBuffers()` means the
 * runtime could not establish the observation; the driver records unverified.
 */
export interface ConnectionBufferObservation {
  readonly connection_id: Id;
  readonly buffered_bytes: Nat;
}

/**
 * Target candidate process controller.
 *
 * `resetState()` establishes the explicit fresh candidate state required at the
 * start of every fault schedule. `restartRetainingState()` is the payment
 * within-attempt restart (state volume preserved, process sequence reset).
 * `freezeAndSnapshot()`/`resume()` implement the tenant pause-freeze observation
 * of the SAME process, with no restart and no inspection fallback.
 */
export interface CandidateProcessController {
  resetState(): Promise<void>;
  restartRetainingState(): Promise<void>;
  freezeAndSnapshot(): Promise<CandidateSnapshotHandle | null>;
  resume(): Promise<void>;
  observeConnectionBufferSnapshot(): Promise<ConnectionBufferSnapshot | null>;
  getTerminationObservation(): Promise<CandidateTerminationObservation>;
  observeMessageDispositions(): Promise<readonly MessageDispositionObservation[] | null>;
}
export type TenantStageName = "retrieval" | "rerank" | "cache";

export const TENANT_STAGE_NAMES = ["retrieval", "rerank", "cache"] as const;

/**
 * One independently established intermediate stage record set, emitted by the
 * isolated snapshot reader (D2 collector boundary). The driver treats every
 * field as untrusted data and compares it against its own trusted dataset.
 */
export interface TenantFrozenStage {
  readonly stage: TenantStageName;
  readonly sequence: Nat;
  readonly records: readonly TenantItem[];
  readonly source_document_ids: readonly Id[];
}

/**
 * Independent stage reader. `isStageCorrespondenceAccepted` is the reviewed
 * attestation that the declared artifact location really is the candidate's
 * named stage; it can only be supplied by an independent reviewer, never by the
 * candidate. `readFrozenStages` reads the frozen snapshot by identity and
 * returns bounded records; `null` means the observation could not be
 * established.
 */
export interface TenantStageReader {
  isStageCorrespondenceAccepted(stage: TenantStageName): boolean;
  readFrozenStages(snapshotId: Id): Promise<readonly TenantFrozenStage[] | null>;
}

/**
 * One trusted provider call, recorded outside candidate custody.
 * `payload === null` means the request failed strict validation; the raw request
 * is still counted as an observed attempt.
 */
export interface ProviderLedgerEntry {
  readonly sequence: Nat;
  readonly entry_id: Id;
  readonly attempt_id: Id;
  readonly operation: "debit" | "lookup" | "settlement";
  readonly timestamp_ms: Nat;
  readonly payload: ProviderPayload | null;
  readonly result: ProviderResult | null;
  readonly error_code: ErrorCode | null;
  readonly committed: boolean;
  readonly duplicate: boolean;
  readonly dropped_reply: boolean;
}

/**
 * One trusted summarizer call, including retries and rejected attempts.
 * `arrival_ms` is the injected-clock arrival of the request; `completed_ms`
 * (null while pending) is the deterministic completion instant.
 */
export interface SummarizerLedgerEntry {
  readonly sequence: Nat;
  readonly entry_id: Id;
  readonly attempt_id: Id;
  readonly arrival_ms: Nat;
  readonly scheduled_ms: Nat | null;
  readonly completed_ms: Nat | null;
  readonly latency_ms: Nat | null;
  readonly request_id: Id | null;
  readonly connection_id: Id | null;
  readonly message_ids: readonly Id[];
  /**
   * Count of named ids that were not trusted workload ids. Such calls record an
   * empty `message_ids` so candidate-invented ids never enter the evidence id
   * table; the count preserves the observable fact without the payload.
   */
  readonly untrusted_message_count: Nat;
  readonly delivered: boolean;
  readonly error_code: ErrorCode | null;
  readonly retry: boolean;
}

/**
 * Evidence binding check performed against the trusted provider ledger.
 * A candidate-returned evidence ID is accepted only when the ledger holds that
 * exact ID for this instruction, with a compatible outcome and finality.
 */
export interface PaymentEvidenceCheck {
  readonly evidence_id: Id;
  readonly instruction_id: Id;
  readonly expected_outcome: "succeeded" | "failed";
  readonly accepted: boolean;
  readonly reason: string;
}

export interface PaymentCaseVerdict {
  readonly case_id: "payment";
  readonly schedule: "base" | "adverse" | "changed_constraint" | "negative_outcome_control";
  readonly passed: boolean;
  readonly instruction_id: Id;
  readonly committed_debits: Nat;
  readonly duplicate_debit_attempts: Nat;
  readonly unknown_views_observed: Nat;
  readonly final_negative_observed: boolean;
  readonly restart_occurred: boolean;
  readonly evidence_checks: readonly PaymentEvidenceCheck[];
  /** At most `MAX_VERDICT_REASONS` entries, each at most `MAX_REASON_BYTES` UTF-8 bytes. */
  readonly failure_reasons: readonly string[];
  readonly unverified_reasons: readonly string[];
  /** Exact totals before capping; always >= `failure_reasons.length`. */
  readonly failure_reason_count: Nat;
  readonly unverified_reason_count: Nat;
}

export interface TenantStageObservation {
  readonly stage: TenantStageName | "snapshot";
  readonly observed_at_step: string;
  readonly snapshot_id: Id | null;
  readonly record_count: Nat;
  readonly available: boolean;
  readonly correspondence_verified: boolean;
  readonly note: string;
}

export interface TenantCaseVerdict {
  readonly case_id: "tenant";
  readonly passed: boolean;
  readonly cross_tenant_leakage_detected: boolean;
  readonly revocation_linearized: boolean;
  readonly intermediate_stage_observations: readonly TenantStageObservation[];
  readonly intermediate_observations_complete: boolean;
  readonly snapshot_restored_cleanly: boolean;
  readonly unauthorized_mutation_detected: boolean;
  readonly unauthorized_requests_rejected: Nat;
  /** At most `MAX_VERDICT_REASONS` entries, each at most `MAX_REASON_BYTES` UTF-8 bytes. */
  readonly failure_reasons: readonly string[];
  readonly unverified_reasons: readonly string[];
  /** Exact totals before capping; always >= `failure_reasons.length`. */
  readonly failure_reason_count: Nat;
  readonly unverified_reason_count: Nat;
}

export interface OverloadCoverage {
  readonly preloss_admitted_streams: Nat;
  readonly post_loss1_offered_streams: Nat;
  readonly post_loss2_offered_streams: Nat;
  readonly reader_stalls_observed: Nat;
  readonly reader_stall_seconds: Nat;
  readonly reconnects_observed: Nat;
  readonly drain_bounded: boolean;
  readonly drain_duration_ms: Nat;
  readonly undelivered_bounded: boolean;
  readonly all_coverage_met: boolean;
}

export interface OverloadSafety {
  readonly low12_control_rejected: boolean;
  readonly safe_shedding_qualifies: boolean;
  readonly downstream_capacity_honored: boolean;
  readonly dropped_not_labeled_delivered: boolean;
  readonly limits_fit_diagnostic_policy: boolean;
  readonly retries_within_declared_bound: boolean;
  readonly process_observation_bounded: boolean;
  readonly liveness_observed: boolean;
  readonly connection_buffers_within_limit: boolean;
  readonly terminated_after_drain: boolean;
  readonly transport_observation_verified: boolean;
  readonly declared_limits: OverloadLimits | null;
  readonly excess_forwarded_calls: Nat;
  readonly max_forwarded_attempts_per_second: Nat;
}

export interface OverloadMetrics {
  readonly total_messages_allocated: Nat;
  readonly total_bytes_allocated: Nat;
  readonly total_messages_accepted: Nat;
  readonly total_messages_delivered: Nat;
  readonly total_bytes_delivered: Nat;
  readonly total_messages_dropped: Nat;
  readonly total_summary_offers: Nat;
  readonly forwarded_summary_attempts: Nat;
  readonly forwarded_summary_rejected: Nat;
  readonly max_forwarded_attempts_per_second: Nat;
  readonly stub_forwarded_calls: Nat;
  readonly stub_rejected_calls: Nat;
}
export interface SummarizerTimingEvidence {
  readonly entry_id: Id;
  readonly arrival_ms: Nat;
  readonly scheduled_ms: Nat | null;
  readonly completed_ms: Nat | null;
  readonly latency_ms: Nat | null;
  readonly lateness_ms: Nat | null;
}

export interface OverloadWindowDiagnostic {
  readonly window_index: Nat;
  readonly accepted_count: Nat;
  readonly accepted_bytes: Nat;
  readonly delivered_count: Nat;
  readonly delivered_bytes: Nat;
  readonly rejected_count: Nat;
  readonly rejected_bytes: Nat;
  readonly dropped_count: Nat;
  readonly dropped_bytes: Nat;
  readonly retained_count: Nat;
  readonly retained_bytes: Nat;
  /** Expected messages in this window with neither an independent acceptance nor a never-accepted drop. */
  readonly unresolved_count: Nat;
}

export interface OverloadCaseVerdict {
  readonly case_id: "overload";
  readonly passed: boolean;
  readonly whole_case_pass: boolean;
  readonly coverage: OverloadCoverage;
  readonly safety: OverloadSafety;
  readonly metrics: OverloadMetrics;
  readonly timing_evidence: readonly SummarizerTimingEvidence[];
  readonly window_diagnostics: readonly OverloadWindowDiagnostic[];
  /** At most `MAX_VERDICT_REASONS` entries, each at most `MAX_REASON_BYTES` UTF-8 bytes. */
  readonly failure_reasons: readonly string[];
  readonly unverified_reasons: readonly string[];
  /** Exact totals before capping; always >= `failure_reasons.length`. */
  readonly failure_reason_count: Nat;
  readonly unverified_reason_count: Nat;
}

export type CaseVerdict = PaymentCaseVerdict | TenantCaseVerdict | OverloadCaseVerdict;
