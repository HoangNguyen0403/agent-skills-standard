import {
  evidencePacketSchema,
  nodeKeyId,
  type Analysis,
  type Analyzer,
  type CriterionState,
  type EvidencePacket,
  type Finding,
  type Proposal,
  type SafeEvent,
  type SourceRef,
} from "./contracts";

/**
 * Coded failure raised by the local retrospective pipeline. Codes are stable
 * identifiers so callers can branch without parsing messages.
 */
export class RetrospectiveError extends Error {
  constructor(
    readonly code: string,
    message: string = code,
  ) {
    super(message);
    this.name = "RetrospectiveError";
  }
}

/** The ten report criteria from the design. Order is stable and binding. */
export const CRITERIA = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const);

/** Per-finding citation cap. Truncation is disclosed in the rendered report. */
export const MAX_SOURCES_PER_FINDING = 20;

export type ClaimCode =
  | "permission-denied"
  | "check-failed"
  | "completion-claim-without-check-evidence"
  | "coverage-gap"
  | "usage-incomplete";

export type RuleDefinition = {
  readonly claimCode: ClaimCode;
  readonly criterion: number;
  readonly classification: "observed" | "candidate";
  /**
   * True only when the code asserts a defect; limitation codes never turn a
   * criterion into `finding`, so partial coverage is not reported as failure.
   */
  readonly assertsDefect: boolean;
  /** Static proposal root-cause template; `null` means no reusable root cause. */
  readonly mechanism: string | null;
  readonly candidateGuidanceIds: readonly string[];
  readonly verificationCodes: readonly string[];
};

/**
 * Static catalog. Every emitted code comes from this table; no free transcript
 * text can become a claim code. These are candidate diagnostic signals, never
 * automatic findings of misconduct, missing skills, or exhaustion.
 */
export const RULE_CATALOG: Readonly<Record<ClaimCode, RuleDefinition>> =
  Object.freeze({
    "permission-denied": {
      claimCode: "permission-denied",
      criterion: 6,
      classification: "observed",
      assertsDefect: true,
      mechanism: "permission-recovery-guidance",
      candidateGuidanceIds: ["common-agent-guardrails"],
      verificationCodes: ["denied-permission-retained"],
    },
    "check-failed": {
      claimCode: "check-failed",
      criterion: 7,
      classification: "observed",
      assertsDefect: false,
      mechanism: "verification-failure-triage",
      candidateGuidanceIds: ["common-debugging"],
      verificationCodes: [
        "original-failure-retained",
        "positive-neighbor-preserved",
      ],
    },
    "completion-claim-without-check-evidence": {
      claimCode: "completion-claim-without-check-evidence",
      criterion: 7,
      classification: "candidate",
      assertsDefect: false,
      mechanism: "completion-evidence-guidance",
      candidateGuidanceIds: ["common-session-retrospective"],
      verificationCodes: ["completion-claim-bound-to-check-evidence"],
    },
    "coverage-gap": {
      claimCode: "coverage-gap",
      criterion: 9,
      classification: "observed",
      assertsDefect: false,
      mechanism: null,
      candidateGuidanceIds: [],
      verificationCodes: [],
    },
    "usage-incomplete": {
      claimCode: "usage-incomplete",
      criterion: 9,
      classification: "observed",
      assertsDefect: false,
      mechanism: null,
      candidateGuidanceIds: [],
      verificationCodes: [],
    },
  });

/** Emission order is also the report's impact order. */
export const CLAIM_ORDER: readonly ClaimCode[] = Object.freeze([
  "permission-denied",
  "check-failed",
  "completion-claim-without-check-evidence",
  "coverage-gap",
  "usage-incomplete",
]);

function hasCompleteUsage(event: SafeEvent): boolean {
  const counts = event.counts;
  if (!counts) return false;
  return (
    Number.isInteger(counts.inputTokens) &&
    Number.isInteger(counts.outputTokens) &&
    counts.cost !== null &&
    Number.isFinite(counts.cost) &&
    counts.currency !== null
  );
}

function sourceKey(source: SourceRef): string {
  const line = source.line === undefined ? "" : `:${source.line}`;
  return `${nodeKeyId(source.node)}\u0000${source.eventId}${line}`;
}

/** Distinct event identities only; duplicate projections are not recurrence. */
export function dedupeSources(events: readonly SafeEvent[]): SourceRef[] {
  const seen = new Set<string>();
  const sources: SourceRef[] = [];
  for (const event of events) {
    const key = sourceKey(event.source);
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      node: { ...event.source.node },
      eventId: event.source.eventId,
      ...(event.source.line === undefined ? {} : { line: event.source.line }),
    });
  }
  return sources;
}

type CriteriaEntry = {
  criterion: number;
  state: CriterionState;
  reasonCode: string;
};

function criteriaFor(
  findings: readonly Finding[],
  usageEvents: readonly SafeEvent[],
): CriteriaEntry[] {
  const defect = (criterion: number): Finding | undefined =>
    findings.find(
      (finding) =>
        finding.criterion === criterion &&
        RULE_CATALOG[finding.claimCode as ClaimCode]?.assertsDefect === true,
    );

  let usageState: CriterionState;
  let usageReason: string;
  if (usageEvents.length === 0) {
    usageState = "not-assessable";
    usageReason = "usage-telemetry-absent";
  } else if (!usageEvents.every(hasCompleteUsage)) {
    usageState = "not-assessable";
    usageReason = "usage-telemetry-incomplete";
  } else if (findings.some((finding) => finding.claimCode === "coverage-gap")) {
    usageState = "not-assessable";
    usageReason = "evidence-coverage-gap";
  } else {
    usageState = "met";
    usageReason = "structured-usage-complete";
  }

  const semantic = (criterion: number): CriteriaEntry => ({
    criterion,
    state: "not-assessable",
    reasonCode: "semantic-review-required",
  });

  return [
    semantic(1),
    semantic(2),
    semantic(3),
    semantic(4),
    semantic(5),
    {
      criterion: 6,
      state: defect(6) ? "finding" : "not-assessable",
      reasonCode: defect(6)
        ? `${defect(6)?.claimCode}-observed`
        : "absence-of-evidence-not-success",
    },
    {
      criterion: 7,
      state: "not-assessable",
      reasonCode: "acceptance-evidence-binding-unavailable",
    },
    semantic(8),
    { criterion: 9, state: usageState, reasonCode: usageReason },
    {
      criterion: 10,
      state: "not-assessable",
      reasonCode: "prior-proposal-linkage-unavailable",
    },
  ];
}

/**
 * Deterministic local analysis over an already-minimized evidence packet.
 * Reads only typed fields, never infers semantic causes, cost, routing intent,
 * skill absence, or adoption.
 */
export async function analyzeLocal(
  packet: EvidencePacket,
  signal: AbortSignal,
): Promise<Analysis> {
  signal.throwIfAborted();
  const validation = evidencePacketSchema.safeParse(packet);
  if (!validation.success)
    throw new RetrospectiveError(
      "INVALID_EVIDENCE_PACKET",
      "The evidence packet failed strict schema validation.",
    );
  const safe = validation.data;
  signal.throwIfAborted();

  const denied = safe.events.filter(
    (event) => event.kind === "permission" && event.outcome === "denied",
  );
  const failedChecks = safe.events.filter(
    (event) => event.kind === "check" && event.outcome === "failed",
  );
  const usageEvents = safe.events.filter((event) => event.kind === "usage");
  const incompleteUsage = usageEvents.filter(
    (event) => !hasCompleteUsage(event),
  );

  const coverageIncomplete =
    safe.nodes.some(
      (node) =>
        node.disposition !== "local-allowed" ||
        node.coverage === "partial" ||
        node.coverage === "summary-only",
    ) ||
    safe.gaps.some(
      (gap) => gap.code !== "restricted" && gap.code !== "unavailable",
    );

  const grouped: Array<[ClaimCode, SafeEvent[]]> = [
    ["permission-denied", denied],
    ["check-failed", failedChecks],
    // The frozen events carry no acceptance-target binding, so a completion
    // claim cannot be compared with a check that verifies it. The code stays in
    // the catalog but is never emitted; an unbound pass is not evidence.
    ["completion-claim-without-check-evidence", []],
    ["coverage-gap", []],
    ["usage-incomplete", incompleteUsage],
  ];

  const findings: Finding[] = [];
  for (const [claimCode, events] of grouped) {
    const definition = RULE_CATALOG[claimCode];
    if (claimCode === "coverage-gap") {
      if (!coverageIncomplete) continue;
      findings.push({
        id: `f-${claimCode}`,
        criterion: definition.criterion,
        classification: definition.classification,
        ruleId: `rule-${claimCode}`,
        sources: [],
        claimCode,
      });
      continue;
    }
    if (events.length === 0) continue;
    findings.push({
      id: `f-${claimCode}`,
      criterion: definition.criterion,
      classification: definition.classification,
      ruleId: `rule-${claimCode}`,
      sources: dedupeSources(events).slice(0, MAX_SOURCES_PER_FINDING),
      claimCode,
    });
  }

  const proposals: Proposal[] = [];
  for (const claimCode of CLAIM_ORDER) {
    const definition = RULE_CATALOG[claimCode];
    if (definition.mechanism === null) continue;
    const finding = findings.find(
      (candidate) => candidate.claimCode === claimCode,
    );
    if (!finding) continue;
    proposals.push({
      id: `p-${claimCode}`,
      revision: "r1",
      status: "proposed",
      findingIds: [finding.id],
      mechanism: definition.mechanism,
      candidateGuidanceIds: [...definition.candidateGuidanceIds],
      verificationCodes: [...definition.verificationCodes],
      semanticReviewRequired: true,
    });
  }

  return {
    schemaVersion: 1,
    findings,
    proposals,
    criteria: criteriaFor(findings, usageEvents),
  };
}

/** The only analyzer implemented here. Hosted and local-model modes do not exist. */
export const localRules: Analyzer = Object.freeze({
  mode: "local-rules" as const,
  analyze: analyzeLocal,
});
