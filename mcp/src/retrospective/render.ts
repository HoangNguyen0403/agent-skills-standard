import {
  type Analysis,
  type EvidencePacket,
  type Finding,
  type NodeKey,
  type SafeEvent,
  type SourceRef,
} from "./contracts";
import { CRITERIA, MAX_SOURCES_PER_FINDING } from "./rules";

export type ReportStatus = "complete" | "partial" | "failed";

/** Row caps keep artifacts bounded; truncation is always stated in the text. */
export const RENDER_LIMITS = Object.freeze({
  eventRows: 400,
  gapRows: 50,
  nodeRows: 128,
  modelRows: 32,
});

/** Marks the bounded summary emitted instead of an oversized full report. */
export const OUTPUT_LIMIT_CODE = "OUTPUT_LIMIT";

const MAX_FIELD_LENGTH = 160;

/**
 * Terminal control characters and line separators replaced by spaces. Built
 * from code points so CI's `no-control-regex` does not reject the literal.
 */
const CONTROL_CHARACTERS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(0x1f)}` +
    `${String.fromCharCode(0x7f)}-${String.fromCharCode(0x9f)}` +
    `${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}]`,
  "g",
);

/**
 * Strip terminal control sequences and markup-significant characters. Values
 * reaching this helper are already schema-validated identifiers or numbers, so
 * this is defence in depth, not a sanitizer for transcript text.
 */
export function stripControls(value: string): string {
  const stripped = value
    .replace(CONTROL_CHARACTERS, " ")
    .replace(/[`<>]/g, "'")
    .trim();
  return stripped.length > MAX_FIELD_LENGTH
    ? `${stripped.slice(0, MAX_FIELD_LENGTH)}...`
    : stripped;
}

function code(value: string): string {
  return `\`${stripControls(value)}\``;
}

function nodeLabel(node: NodeKey): string {
  return `${node.hostId}/${node.sessionId}`;
}

/** Inert, encoded source reference. Never a link, image, or shell-openable path. */
function reference(source: SourceRef): string {
  const line = source.line === undefined ? "" : `:line-${source.line}`;
  return `src:${source.node.hostId}/${source.node.sessionId}#${source.eventId}${line}`;
}

function references(sources: readonly SourceRef[]): string {
  if (sources.length === 0) return "(no event identity; node-level gap)";
  const rendered = sources.map((source) => code(reference(source)));
  return sources.length === MAX_SOURCES_PER_FINDING
    ? `${rendered.join(", ")} (citation cap reached)`
    : rendered.join(", ");
}

function countBy(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function eventCountLine(event: SafeEvent): string {
  const parts = [code(event.at), code(event.kind)];
  if (event.outcome !== undefined) parts.push(code(event.outcome));
  if (event.tool !== undefined) parts.push(`tool ${code(event.tool)}`);
  if (event.model !== undefined) parts.push(`model ${code(event.model)}`);
  if (event.provider !== undefined)
    parts.push(`provider ${code(event.provider)}`);
  if (event.counts !== undefined) {
    const input =
      event.counts.inputTokens === null
        ? "unknown"
        : String(event.counts.inputTokens);
    const output =
      event.counts.outputTokens === null
        ? "unknown"
        : String(event.counts.outputTokens);
    const cost =
      event.counts.cost === null
        ? "unknown"
        : event.counts.currency === null
          ? `${event.counts.cost} (currency unknown)`
          : `${event.counts.cost} ${event.counts.currency}`;
    parts.push(`tokens ${input}/${output}`, `cost ${cost}`);
  }
  parts.push(`source ${code(reference(event.source))}`);
  return `- ${parts.join(" · ")}`;
}

function findingHeading(finding: Finding): string {
  return `### Criterion ${finding.criterion} · ${code(finding.claimCode)} (${finding.classification})`;
}

function findingBody(finding: Finding): string {
  const lines = [
    `- Rule: ${code(finding.ruleId)}`,
    `- Cited events: ${references(finding.sources)}`,
  ];
  if (finding.classification === "candidate") {
    lines.push(
      "- Status: candidate diagnostic signal only. It is not a finding of misconduct, it does not establish a root cause, and missing evidence is not treated as proof of failure.",
    );
  } else {
    lines.push(
      "- Status: the cited event is directly observed. Any conclusion about cause, intent, or missing guidance still requires semantic review.",
    );
  }
  return lines.join("\n");
}

/**
 * Plain Markdown built only from fixed templates, validated enums, numbers and
 * encoded source references. No transcript text, link, image, HTML or path is
 * copied into the report.
 */
export function renderReport(
  packet: EvidencePacket,
  analysis: Analysis,
  status: ReportStatus,
): string {
  const kinds = countBy(packet.events.map((event) => event.kind));
  const completions = packet.events.filter(
    (event) => event.kind === "completion",
  );
  const completionCounts = countBy(
    completions.map((event) => event.outcome ?? "unknown"),
  );
  const observed = analysis.findings.filter(
    (finding) => finding.classification === "observed",
  );
  const candidates = analysis.findings.filter(
    (finding) => finding.classification === "candidate",
  );
  const findingCriteria = [
    ...new Set(analysis.findings.map((finding) => finding.criterion)),
  ].sort((left, right) => left - right);

  const lines: string[] = [];
  lines.push("# Session retrospective", "");
  lines.push(`- Run: ${code(packet.runId)}`);
  lines.push(`- Session: ${code(nodeLabel(packet.main))}`);
  lines.push(`- Cutoff: ${code(packet.cutoff)}`);
  lines.push(`- Report status: ${code(status)}`, "");

  lines.push("## Summary", "");
  lines.push(
    `- Findings: ${observed.length} observed, ${candidates.length} candidate.`,
  );
  lines.push(
    findingCriteria.length > 0
      ? `- Criteria with findings: ${findingCriteria.join(", ")}.`
      : "- Criteria with findings: none.",
  );
  lines.push(
    analysis.proposals.length === 0
      ? "- Proposed changes: none. A clean session produces no improvement work."
      : `- Proposed changes: ${analysis.proposals.length}, all ${code(
          "proposed",
        )} and awaiting human review.`,
  );
  lines.push("");

  lines.push("## Outcome", "");
  lines.push(
    `- Completion events: ${completionCounts.get("claimed-complete") ?? 0} claimed complete, ${
      completionCounts.get("canceled") ?? 0
    } canceled, ${completionCounts.get("failed") ?? 0} failed, ${
      completionCounts.get("unknown") ?? 0
    } unknown outcome.`,
  );
  lines.push(`- Sessions in tree: ${packet.nodes.length}.`);
  lines.push(
    `- Observed events: ${packet.events.length} (launch ${kinds.get("launch") ?? 0}, permission ${
      kinds.get("permission") ?? 0
    }, check ${kinds.get("check") ?? 0}, completion ${
      kinds.get("completion") ?? 0
    }, usage ${kinds.get("usage") ?? 0}, gap ${kinds.get("gap") ?? 0}).`,
  );
  lines.push(
    "- A later success does not erase an earlier failure; both remain listed.",
    "",
  );

  lines.push("## Evidence coverage", "");
  lines.push("| Session | Parent | Disposition | Coverage |");
  lines.push("| --- | --- | --- | --- |");
  const nodeRows = packet.nodes.slice(0, RENDER_LIMITS.nodeRows);
  for (const node of nodeRows) {
    lines.push(
      `| ${code(nodeLabel(node.key))} | ${
        node.parent === null ? "(root)" : code(nodeLabel(node.parent))
      } | ${code(node.disposition)} | ${code(node.coverage)} |`,
    );
  }
  if (packet.nodes.length > nodeRows.length)
    lines.push(
      `| ${packet.nodes.length - nodeRows.length} more sessions | | | |`,
    );
  lines.push("");

  if (packet.gaps.length > 0) {
    lines.push("Recorded gaps:", "");
    for (const gap of packet.gaps.slice(0, RENDER_LIMITS.gapRows))
      lines.push(
        `- ${code(gap.code)}${
          gap.node === undefined ? "" : ` · ${code(nodeLabel(gap.node))}`
        }`,
      );
    if (packet.gaps.length > RENDER_LIMITS.gapRows)
      lines.push(
        `- ${packet.gaps.length - RENDER_LIMITS.gapRows} more gaps not listed.`,
      );
    lines.push("");
  }

  lines.push("## Material findings", "");
  if (analysis.findings.length === 0) {
    lines.push("No material deterministic findings were observed.", "");
  } else {
    for (const finding of analysis.findings) {
      lines.push(findingHeading(finding), "", findingBody(finding), "");
    }
  }

  lines.push("## Recorded practices and limits", "");
  lines.push(
    "- Check outcomes are listed as primitive observations. Without an approved acceptance-target binding, this report cannot establish task acceptance, remediation, or recovery.",
  );
  if (analysis.findings.length === 0)
    lines.push(
      "- No material deterministic findings were observed; no improvement work was manufactured.",
    );
  if (packet.nodes.some((node) => node.disposition !== "local-allowed"))
    lines.push(
      "- Restricted or unavailable sources were inventoried without being read.",
    );
  lines.push("");
  lines.push("## Metric limitations", "");
  lines.push(
    "- No cost or latency is inferred from model names or calendar duration.",
  );
  lines.push(
    "- Missing telemetry is unknown; no value is estimated, backfilled, or rounded.",
  );
  lines.push(
    "- Absence of an event is not evidence that the event did not occur.",
  );
  if (
    analysis.findings.some(
      (finding) => finding.claimCode === "usage-incomplete",
    )
  )
    lines.push(
      "- Usage or cost telemetry is incomplete for at least one recorded event.",
    );
  if (analysis.findings.some((finding) => finding.claimCode === "coverage-gap"))
    lines.push("- Evidence coverage is partial for at least one session.");
  lines.push(
    "- Provider exhaustion, eligibility, and routing intent are not classified locally.",
    "",
  );

  lines.push("## Proposed changes", "");
  if (analysis.proposals.length === 0) {
    lines.push(
      "No proposals: no allowlisted intervention is supported by this structured evidence.",
      "",
    );
  } else {
    for (const proposal of analysis.proposals) {
      const detail = proposalReview(proposal.mechanism);
      lines.push(
        `### ${code(proposal.id)} (${code(proposal.revision)}, ${code(proposal.status)})`,
        "",
      );
      lines.push(
        `- Evidence: ${proposal.findingIds.map(code).join(", ") || "(none)"}`,
      );
      lines.push("- Cause classification: unknown; requires human review.");
      lines.push(`- Scope: ${detail.scope}`);
      lines.push(`- Specific proposed change: ${detail.change}`);
      lines.push(`- Preservation constraints: ${detail.preserve}`);
      lines.push(`- Observable success criterion: ${detail.success}`);
      lines.push(`- Baseline/candidate comparison: ${detail.comparison}`);
      lines.push(`- Next decision: ${detail.decision}`, "");
    }
    lines.push(
      "- No patch was prepared and no guidance, memory, or routing state changed.",
      "",
    );
  }

  lines.push("## Next decisions", "");
  lines.push(
    "- Human review decides whether any candidate finding or proposal is actionable.",
  );
  lines.push(
    "- Implementation, independent review, evaluation and adoption remain separate authorized steps.",
    "",
  );

  lines.push("## Appendix: criteria", "");
  lines.push("| Criterion | State | Reason |");
  lines.push("| --- | --- | --- |");
  for (const criterion of analysis.criteria)
    lines.push(
      `| ${criterion.criterion} | ${code(criterion.state)} | ${code(
        criterion.reasonCode,
      )} |`,
    );
  if (analysis.criteria.length !== CRITERIA.length)
    lines.push(
      `| - | ${code("not-assessable")} | ${code(
        "criteria-coverage-incomplete",
      )} |`,
    );
  lines.push("");

  lines.push("## Appendix: observed events", "");
  if (packet.events.length === 0) {
    lines.push("No structured events were observed.", "");
  } else {
    for (const event of packet.events.slice(0, RENDER_LIMITS.eventRows))
      lines.push(eventCountLine(event));
    if (packet.events.length > RENDER_LIMITS.eventRows)
      lines.push(
        `- ${packet.events.length - RENDER_LIMITS.eventRows} more events not listed.`,
      );
    lines.push("");
  }

  return lines.join("\n");
}

type ProposalReview = {
  readonly scope: string;
  readonly change: string;
  readonly preserve: string;
  readonly success: string;
  readonly comparison: string;
  readonly decision: string;
};

const PROPOSAL_REVIEW: Readonly<Record<string, ProposalReview>> = Object.freeze(
  {
    "permission-recovery-guidance": {
      scope: "Review only the existing common-agent-guardrails guidance.",
      change:
        "Consider clarifying that a denied action remains denied and any alternative requires its own explicit authorization.",
      preserve:
        "Keep the denial visible; do not relabel it as success or remove unrelated valid permissions.",
      success:
        "A held-out denied-then-completion case still reports the denial and does not treat completion as authorization.",
      comparison:
        "Compare the current guidance with a candidate edit on that case and a neighboring valid-permission case.",
      decision:
        "Human reviewer decides whether the source evidence justifies this exact guidance change.",
    },
    "verification-failure-triage": {
      scope: "Review only the existing common-debugging guidance.",
      change:
        "Consider clarifying that each failed check and any other check outcome must remain separately recorded.",
      preserve:
        "Retain the original failure and all unrelated successful checks; do not infer remediation from co-occurrence.",
      success:
        "A failure remains visible when another check passes, including when event order or session differs.",
      comparison:
        "Compare baseline and candidate guidance using failed-only, pass-only, and mixed-outcome cases.",
      decision:
        "Human reviewer decides whether the guidance needs this clarification or the signal is adequately handled.",
    },
    "completion-evidence-guidance": {
      scope: "Review only the existing common-session-retrospective guidance.",
      change:
        "Consider requiring explicit acceptance-target binding before structured checks are used as completion evidence.",
      preserve:
        "Do not infer missing evidence, acceptance, or failure from an unbound completion/check pair.",
      success:
        "Unbound events leave task-acceptance status not-assessable; bound evidence is evaluated only by an approved contract.",
      comparison:
        "Compare baseline and candidate wording on unrelated-node, reversed-order, and missing-binding cases.",
      decision:
        "Human reviewer must first approve a structured binding contract; this proposal alone cannot establish one.",
    },
  },
);

function proposalReview(mechanism: string): ProposalReview {
  return (
    PROPOSAL_REVIEW[mechanism] ?? {
      scope: "No allowlisted guidance scope is available.",
      change:
        "No specific change is proposed until a reviewed mechanism is selected.",
      preserve: "Preserve all existing guidance and behavior.",
      success:
        "Not assessable until a mechanism and independent oracle are approved.",
      comparison: "No comparison is authorized or defined.",
      decision: "Human review must reject or defer this unresolved mechanism.",
    }
  );
}

/** Fixed-heading proposal ledger; states explicitly that nothing was applied. */
export function renderProposalList(analysis: Analysis): string {
  const lines = ["# Proposed changes", ""];
  lines.push(
    `- Status: ${analysis.proposals.length} proposal(s), all ${code(
      "proposed",
    )}. No proposal is approved, applied, or adopted.`,
  );
  lines.push(
    "- Cause classification and owner are unknown unless independently established; these signals do not prove a reusable root cause.",
    "",
  );
  if (analysis.proposals.length === 0) {
    lines.push(
      "No proposals. A clean session does not manufacture improvement work.",
      "",
    );
    return lines.join("\n");
  }
  for (const proposal of analysis.proposals) {
    const detail = proposalReview(proposal.mechanism);
    lines.push(
      `## ${code(proposal.id)} · revision ${code(proposal.revision)}`,
      "",
    );
    lines.push(
      `- Status: ${code(proposal.status)}; authorization: none; owner: unknown.`,
    );
    lines.push(
      `- Evidence: ${proposal.findingIds.map(code).join(", ") || "(none)"}`,
    );
    lines.push(
      `- Candidate guidance: ${proposal.candidateGuidanceIds.map(code).join(", ") || "(none)"}`,
    );
    lines.push("- Cause classification: unknown; requires human review.");
    lines.push(`- Scope: ${detail.scope}`);
    lines.push(`- Specific proposed change: ${detail.change}`);
    lines.push(`- Preservation constraints: ${detail.preserve}`);
    lines.push(`- Observable success criterion: ${detail.success}`);
    lines.push(`- Baseline/candidate comparison: ${detail.comparison}`);
    lines.push(`- Next decision: ${detail.decision}`);
    lines.push(
      `- Verification codes: ${proposal.verificationCodes.map(code).join(", ") || "(none)"}`,
    );
    lines.push(
      "- No executable patch is included. Human approval, implementation, independent review and adoption are separate steps.",
      "",
    );
  }
  return lines.join("\n");
}

/**
 * Bounded proposal record for an output-limited generation. The artifact is
 * always written: omitting it would misrepresent the generation as having no
 * proposals, and silence is not allowed to look like "nothing to report".
 */
export function renderLimitedProposalList(
  analysis: Analysis,
  limitingCode: string,
): string {
  const lines = ["# Proposed changes", ""];
  lines.push(`- Status: ${code("limited")}`);
  lines.push(`- Limiting code: ${code(limitingCode)}`);
  lines.push(
    "- The full proposal ledger exceeded the configured output budget, so only this bounded record was written.",
  );
  lines.push(
    `- Proposals recorded by analysis: ${analysis.proposals.length} (${
      analysis.proposals
        .map((proposal) => proposal.id)
        .map(code)
        .join(", ") || "none"
    }).`,
  );
  lines.push(
    "- Evidence references, mechanisms and verification codes were omitted from this generation; the analysis itself did not fail.",
  );
  lines.push("- No proposal is approved, applied, or adopted.", "");
  return lines.join("\n");
}

export type SessionRecordInput = {
  checkpointId: string;
  status: ReportStatus;
  artifactIds: readonly string[];
};

/**
 * Machine-readable local record. Structured identifiers and counters only;
 * no absolute paths, excerpts, or free text.
 */
export function renderSessionRecord(
  packet: EvidencePacket,
  analysis: Analysis,
  input: SessionRecordInput,
): string {
  const models = new Map<
    string,
    { provider: string | null; model: string | null }
  >();
  for (const event of packet.events) {
    if (event.provider === undefined && event.model === undefined) continue;
    const key = `${event.provider ?? ""}\u0000${event.model ?? ""}`;
    if (!models.has(key))
      models.set(key, {
        provider: event.provider ?? null,
        model: event.model ?? null,
      });
  }
  const record = {
    schemaVersion: 1 as const,
    runId: packet.runId,
    checkpointId: input.checkpointId,
    main: packet.main,
    cutoff: packet.cutoff,
    status: input.status,
    modelCalls: 0 as const,
    outboundRequests: 0 as const,
    artifactIds: [...input.artifactIds],
    evidence: {
      sessions: packet.nodes.map((node) => ({
        key: node.key,
        parent: node.parent,
        disposition: node.disposition,
        coverage: node.coverage,
      })),
      eventCount: packet.events.length,
      gaps: packet.gaps.map((gap) => ({
        code: gap.code,
        node: gap.node ?? null,
      })),
    },
    models: [...models.values()].slice(0, RENDER_LIMITS.modelRows),
    modelCount: models.size,
    criteria: analysis.criteria.map((criterion) => ({ ...criterion })),
    findings: analysis.findings.map((finding) => ({
      id: finding.id,
      claimCode: finding.claimCode,
      criterion: finding.criterion,
      classification: finding.classification,
      citedEvents: finding.sources.length,
    })),
    proposals: analysis.proposals.map((proposal) => ({
      id: proposal.id,
      revision: proposal.revision,
      status: proposal.status,
    })),
  };
  return `${JSON.stringify(record, null, 2)}\n`;
}

/**
 * Minimal local record for an output-limited generation: fixed fields plus the
 * ten criteria, no session table. The generation stays marked partial.
 */
export function renderLimitedSessionRecord(
  packet: EvidencePacket,
  analysis: Analysis,
  input: SessionRecordInput,
  limitingCode: string,
): string {
  const record = {
    schemaVersion: 1 as const,
    runId: packet.runId,
    checkpointId: input.checkpointId,
    main: packet.main,
    cutoff: packet.cutoff,
    status: input.status,
    modelCalls: 0 as const,
    outboundRequests: 0 as const,
    limited: {
      code: limitingCode,
      sessionCount: packet.nodes.length,
      eventCount: packet.events.length,
      gapCount: packet.gaps.length,
      findingCount: analysis.findings.length,
      proposalIds: analysis.proposals.map((proposal) => proposal.id),
    },
    criteria: analysis.criteria.map((criterion) => ({ ...criterion })),
  };
  return `${JSON.stringify(record, null, 2)}\n`;
}

/**
 * Minimal, fixed-size report used when the full artifacts would exceed the
 * output budget. It never presents the generation as complete.
 */
export function renderPartialSummary(
  packet: EvidencePacket,
  analysis: Analysis,
  limitingCode: string,
): string {
  const lines = ["# Session retrospective (partial report)", ""];
  lines.push(`- Run: ${code(packet.runId)}`);
  lines.push(`- Session: ${code(nodeLabel(packet.main))}`);
  lines.push(`- Report status: ${code("partial")}`);
  lines.push(`- Limiting code: ${code(limitingCode)}`, "");
  lines.push("## Summary", "");
  lines.push(
    `- The full report exceeded the configured output budget, so only this bounded summary was written.`,
  );
  lines.push(
    `- Findings: ${analysis.findings.length} (${
      analysis.findings
        .map((finding) => finding.claimCode)
        .map(code)
        .join(", ") || "none"
    }).`,
  );
  lines.push(
    `- Proposals: ${analysis.proposals.length} (${
      analysis.proposals
        .map((proposal) => proposal.id)
        .map(code)
        .join(", ") || "none"
    }).`,
  );
  lines.push(`- Sessions in tree: ${packet.nodes.length}.`);
  lines.push(`- Observed events: ${packet.events.length}.`);
  lines.push("");
  lines.push("## Criteria", "");
  lines.push("| Criterion | State | Reason |");
  lines.push("| --- | --- | --- |");
  for (const criterion of analysis.criteria)
    lines.push(
      `| ${criterion.criterion} | ${code(criterion.state)} | ${code(
        criterion.reasonCode,
      )} |`,
    );
  lines.push("");
  lines.push(
    "No event ledger, session table, or proposal detail was written. Nothing here is truncated silently: the generation is marked partial.",
  );
  lines.push("");
  return lines.join("\n");
}

/** Stable artifact identity (deterministic per run and kind). */
export function artifactIdFor(runId: string, kind: string): string {
  return `${runId}.${kind}`;
}
