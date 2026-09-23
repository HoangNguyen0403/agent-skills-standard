// scripts/metrics/types.ts
//
// Shared shapes for the SDLC metrics producer (SRS-004 output, REQ-002 unavailable
// contract). Every value that reaches the report is either `Available` (with a
// source citation and a trend) or `Unavailable` (with a reason) — never a guess.

/** A value the producer could derive, always carrying its provenance (AC-002). */
export interface AvailableMetric {
  available: true;
  value: string;
  /** Direction against the previous period, never a bare number (reporting rule: trend over snapshot). */
  trend: string;
  /** Artifact path, commit range, or pipeline run this value was read from (AC-002). */
  source: string;
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
