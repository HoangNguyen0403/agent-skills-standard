// scripts/metrics/types.ts
//
// Shared shapes for the SDLC metrics producer (SRS-004 output, REQ-002 unavailable
// contract). Every value that reaches the report is either `Available` (with a
// source citation, a trend, and an explicit measurement basis) or `Unavailable`
// (with a reason) — never a guess.

/** How a value was obtained: directly observed, or a git/document/run-history proxy. */
export type MetricBasis = "measured" | "proxy";

/** Whether the declared observation coverage backs the value. */
export type MetricCoverage = "complete" | "partial" | "unknown";

export interface TrustMetricMetadata {
  numerator?: number;
  denominator?: number;
  sampleSize?: number | null;
  coverage?: MetricCoverage;
  source?: string;
  cohort?: string;
  asOfHorizon?: string;
  limitations?: string[];
  diagnostics?: string[];
}

/** A value the producer could derive, always carrying its provenance (AC-002). */
export interface AvailableMetric {
  available: true;
  value: string;
  /** Direction against the previous period, never a bare number (reporting rule: trend over snapshot). */
  trend: string;
  /** Artifact path, commit range, or pipeline run this value was read from (AC-002). */
  source: string;
  /** `measured` only when the input is a direct observation; proxies are labeled, never promoted. */
  basis: MetricBasis;
  /** Number of observations the value rests on; `null` when the basis has no coherent sample. */
  sampleSize: number | null;
  coverage: MetricCoverage;
  /** What the value does and does not mean. Never empty: every number has a limit. */
  limitations: string[];
  trust?: TrustMetricMetadata;
}

/** REQ-002: an input the runtime cannot supply is reported unavailable with the reason, never guessed. */
export interface UnavailableMetric {
  available: false;
  reason: string;
  /** Source the value would have come from, when known, even though it is unavailable. */
  source?: string;
  trust?: TrustMetricMetadata;
}


export type Metric = AvailableMetric | UnavailableMetric;

/** One row of `## Delivery Health` (DORA four). */
export interface DeliveryHealthRow {
  metric: string;
  metric_result: Metric;
}

/** One row of `## Stage Indicators`. */
export interface StageIndicatorRow {
  stage: string;
  indicator: string;
  metric_result: Metric;
}

/** One row of `## Attribution`. Aggregated by identity *class* only — never by name (Red Flag). */
export interface AttributionRow {
  identityClass: "agent" | "human";
  changes: number;
  notes: string;
}

/** SRS-003: one control-band breach, always carrying tier and named owner (AC-004). */
export interface BandBreach {
  metric: string;
  baselineWindow: string;
  tier: "1sigma" | "2sigma" | "3sigma";
  action: "log" | "diagnose" | "propose";
  routedTo: string;
}

/** A config problem in `docs/ops/bands.yaml` itself — surfaced, never silently accepted. */
export interface BandConfigError {
  band: string;
  problem: string;
}

/** One measured usage cell: the summed known values plus how many observations were unknown. */
export interface DispatchUsageSummary {
  events: number;
  turns: number;
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  recordedCost: number;
  unknown: {
    turns: number;
    inputTokens: number;
    cachedInputTokens: number;
    cacheWriteTokens: number;
    outputTokens: number;
    recordedCost: number;
  };
  /** Expected (dispatch, actor) pairs in this row with no `dispatch-usage` event: unknown, never zero. */
  missingPairs: number;
  coverage: MetricCoverage;
}

/** One row of `## Dispatch outcomes`, keyed by (`role`, `actual.model`). */
export interface DispatchOutcomeRow {
  role: string;
  model: string;
  dispatches: number;
  open: number;
  completed: number;
  cancelled: number;
  failed: number;
  errored: number;
  /** Dispatches with a `dispatch-end`; the denominator for rounds, acceptance and first-round share. */
  ended: number;
  roundsMean: number | null;
  roundsMedian: number | null;
  accepted: number;
  rejected: number;
  acceptanceUnknown: number;
  firstRoundAccepted: number;
  coverage: MetricCoverage;
  worker: DispatchUsageSummary;
  supervision: DispatchUsageSummary;
}

/** SRS-006: the dispatch cohort, or a stated reason it cannot be shown. */
export type DispatchOutcomes =
  | {
      available: true;
      source: string;
      rows: DispatchOutcomeRow[];
      /** Distinct unrecorded workers, counted once per (orchestrator_ref, window) — never once per change. */
      unrecorded: number;
      limitations: string[];
    }
  | { available: false; reason: string };

/** Full structured result for one `scripts/metrics/index.ts` run (also the `--json` shape). */
export interface MetricsReport {
  scope: string;
  period: string;
  generatedAt: string;
  deliveryHealth: DeliveryHealthRow[];
  stageIndicators: StageIndicatorRow[];
  dispatchOutcomes: DispatchOutcomes;
  bandBreaches: BandBreach[];
  bandConfigErrors: BandConfigError[];
  attribution: AttributionRow[];
  unavailable: { metric: string; reason: string }[];
  followUps: string[];
}

// ---------------------------------------------------------------------------
// Delivery observations: an authorized local export, not a second backlog.
// Shape is fixed by the plan's design contract D. Readers never infer values
// that the export did not state.
// ---------------------------------------------------------------------------

export interface EventBase {
  id: string;
  change_id: string;
  revision: string;
  observed_at: string;
  source_ref: string;
}

export interface ReviewEvent extends EventBase {
  kind: "review";
  session_id: string;
  active_seconds: number;
}

export interface DecisionWaitEvent extends EventBase {
  kind: "decision-wait";
  decision_id: string;
  opened_at: string;
  resolved_at: string | null;
}

export interface SubmissionEvent extends EventBase {
  kind: "submission";
  attempt: number;
}

export interface CorrectionEvent extends EventBase {
  kind: "correction";
  round_id: string;
}

export interface AcceptanceEvent extends EventBase {
  kind: "acceptance";
  attempt: number;
  decision: "accepted" | "rejected";
  authority_ref: string;
}

export interface DeploymentEvent extends EventBase {
  kind: "deployment";
  deployment_id: string;
  environment: "production";
  first_change_at: string;
  deployed_at: string;
}

export interface DefectEvent extends EventBase {
  kind: "defect";
  deployment_id: string;
  remediation: "hotfix" | "rollback" | "none";
  detected_at: string;
  restored_at: string | null;
}

export interface CostEvent extends EventBase {
  kind: "cost";
  charge_id: string;
  currency: string;
  amount: number;
  component: "agent" | "human" | "tooling";
}

// ---------------------------------------------------------------------------
// Dispatch-scoped events (SRS-001 to SRS-008). A separate cohort in the same
// file, linked to a change only by `change_id`. No legacy indicator reads these
// kinds and no dispatch metric reads a legacy kind.
// ---------------------------------------------------------------------------

export type DispatchCapabilityHint = "fast" | "standard" | "strong" | "unknown";

export type DispatchEndState = "completed" | "cancelled" | "failed" | "errored";

export type DispatchActor = "worker" | "supervision";

/** Every free string is a reference string (SRS-010); `unknown` is itself one. */
export interface DispatchActual {
  provider: string;
  model: string;
  effort: string;
}

export interface DispatchEvent extends EventBase {
  kind: "dispatch";
  dispatch_id: string;
  role: string;
  capability_hint: DispatchCapabilityHint;
  actual: DispatchActual;
  authority_ref: string;
  orchestrator_model: string;
  orchestrator_ref: string;
}

export interface DispatchRoundEvent extends EventBase {
  kind: "dispatch-round";
  dispatch_id: string;
  round: number;
}

export interface DispatchVerdictEvent extends EventBase {
  kind: "dispatch-verdict";
  dispatch_id: string;
  round: number;
  verdict: "approved" | "changes_requested";
  reviewer_ref: string;
}

export interface DispatchAcceptanceEvent extends EventBase {
  kind: "dispatch-acceptance";
  dispatch_id: string;
  round: number;
  decision: "accepted" | "rejected";
  authority_ref: string;
}

export interface DispatchEndEvent extends EventBase {
  kind: "dispatch-end";
  dispatch_id: string;
  state: DispatchEndState;
}

export interface DispatchUsageEvent extends EventBase {
  kind: "dispatch-usage";
  dispatch_id: string;
  actor: DispatchActor;
  window_from: string;
  window_to: string;
  turns: number | null;
  input_tokens: number | null;
  cached_input_tokens: number | null;
  cache_write_tokens: number | null;
  output_tokens: number | null;
  recorded_cost: number | null;
  cost_basis: "host-recorded-estimate";
  coverage_complete: boolean;
  method_ref: string;
  unavailable_code?: "no-adapter" | "unresolved" | "identity-mismatch";
}

export interface DispatchInventoryEvent extends EventBase {
  kind: "dispatch-inventory";
  orchestrator_ref: string;
  window_from: string;
  window_to: string;
  unrecorded_count: number;
}

export type DispatchScopedEvent =
  | DispatchEvent
  | DispatchRoundEvent
  | DispatchVerdictEvent
  | DispatchAcceptanceEvent
  | DispatchEndEvent
  | DispatchUsageEvent
  | DispatchInventoryEvent;

export type DeliveryEvent =
  | ReviewEvent
  | DecisionWaitEvent
  | SubmissionEvent
  | CorrectionEvent
  | AcceptanceEvent
  | DeploymentEvent
  | DefectEvent
  | CostEvent
  | DispatchScopedEvent;

export type DeliveryEventKind = DeliveryEvent["kind"];

export interface DeliveryCoverage {
  change_id: string;
  revisions: string[];
  from: string;
  through: string;
  kinds: DeliveryEventKind[];
  complete: boolean;
}

export type TrustClass = "trunk" | "shared" | "leaf" | "unknown";

export interface ReviewerConfiguration {
  provider: string;
  model: string;
  effort: string;
  mode: string;
  features: Record<string, string>;
}

export interface TrustRecordBase {
  id: string;
  observed_at: string;
  source_ref: string;
}

export interface RevisionClassRecord extends TrustRecordBase {
  kind: "revision-class";
  change_id: string;
  revision: string;
  change_class: TrustClass;
  policy_ref: string;
  policy_digest: string;
}

export interface AgentReviewRecord extends TrustRecordBase {
  kind: "agent-review";
  review_id: string;
  change_id: string;
  revision: string;
  completed_at: string;
  verdict: "approved" | "changes-requested" | "blocked";
  reviewer_configuration: ReviewerConfiguration;
  evidence_ref: string;
  evidence_digest: string;
}

export interface HumanFindingRecord extends TrustRecordBase {
  kind: "human-finding";
  finding_id: string;
  approval_review_id: string;
  change_id: string;
  revision: string;
  detected_at: string;
  severity: "Blocker" | "Major" | "Nit";
  evidence_ref: string;
  evidence_digest: string;
}

export interface SeedAssignmentRecord extends TrustRecordBase {
  kind: "seed-assignment";
  seed_run_id: string;
  package_ref: string;
  package_digest: string;
  change_class: TrustClass;
  assigned_at: string;
  evaluation_cutoff: string;
  expected_defects: { id: string; severity: "Blocker" | "Major" | "Nit" }[];
  evidence_ref: string;
  evidence_digest: string;
}

export interface SeedResultRecord extends TrustRecordBase {
  kind: "seed-result";
  seed_run_id: string;
  completed_at: string;
  detected_seed_ids: string[];
  reviewer_configuration: ReviewerConfiguration;
  review_output_ref: string;
  review_output_digest: string;
}

export interface GrantReferenceRecord extends TrustRecordBase {
  kind: "grant-reference";
  grant_id: string;
  change_class: TrustClass;
  scope: { change_id: string; revision: string };
  evidence_cutoff: string;
  effective_from: string;
  effective_until: string | null;
  revoked_at: string | null;
  suspended_at: string | null;
  independent_validation_ref: string | null;
}

export type TrustRecord =
  | RevisionClassRecord
  | AgentReviewRecord
  | HumanFindingRecord
  | SeedAssignmentRecord
  | SeedResultRecord
  | GrantReferenceRecord;

export type TrustPopulationKind = "agent-review" | "seed-assignment" | "production-deployment";

export interface TrustPopulation {
  population_kind: TrustPopulationKind;
  population_id: string;
  scope_ref: string;
  inventory_digest: string;
  from: string;
  through: string;
  member_ids: string[];
  complete: boolean;
  /** Explicit exhaustive history claim; absent/false cannot establish first approval. */
  first_approval_history_complete?: boolean;
  source_ref: string;
}

export type TrustCoverageKind = TrustRecord["kind"] | "deployment" | "defect";

export interface TrustCoverage {
  kind: TrustCoverageKind;
  scope_ref: string;
  from: string;
  through: string;
  complete: boolean;
  source_ref: string;
}

export interface TrustObservationBlock {
  schema_version: 1;
  records: TrustRecord[];
  populations: TrustPopulation[];
  coverage: TrustCoverage[];
}

export interface DeliveryObservationFile {
  schema_version: 1;
  source_kind: "host-export" | "operator-recorded";
  coverage: DeliveryCoverage[];
  events: DeliveryEvent[];
  trust?: TrustObservationBlock;
}

export interface DeliveryObservationSet {
  observations: DeliveryObservationFile | null;
  issues: { file: string; message: string }[];
}

export interface DeliveryIndicators {
  deliveryHealth: DeliveryHealthRow[];
  stageIndicators: StageIndicatorRow[];
  unavailable: { metric: string; reason: string }[];
}
