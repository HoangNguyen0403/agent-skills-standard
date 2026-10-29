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
}

/** REQ-002: an input the runtime cannot supply is reported unavailable with the reason, never guessed. */
export interface UnavailableMetric {
  available: false;
  reason: string;
  /** Source the value would have come from, when known, even though it is unavailable. */
  source?: string;
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

/** Full structured result for one `scripts/metrics/index.ts` run (also the `--json` shape). */
export interface MetricsReport {
  scope: string;
  period: string;
  generatedAt: string;
  deliveryHealth: DeliveryHealthRow[];
  stageIndicators: StageIndicatorRow[];
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

export type DeliveryEvent =
  | ReviewEvent
  | DecisionWaitEvent
  | SubmissionEvent
  | CorrectionEvent
  | AcceptanceEvent
  | DeploymentEvent
  | DefectEvent
  | CostEvent;

export type DeliveryEventKind = DeliveryEvent["kind"];

export interface DeliveryCoverage {
  change_id: string;
  revisions: string[];
  from: string;
  through: string;
  kinds: DeliveryEventKind[];
  complete: boolean;
}

export interface DeliveryObservationFile {
  schema_version: 1;
  source_kind: "host-export" | "operator-recorded";
  coverage: DeliveryCoverage[];
  events: DeliveryEvent[];
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
