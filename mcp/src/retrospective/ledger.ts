import { createHash } from "node:crypto";
import type { SkillUsageSnapshot } from "../services/SessionTracker";
import type { NodeSkillLoad, TreeAggregate } from "./aggregate";
import type { NodeKey } from "./contracts";

export type EvidenceId = string;
export type ClaimTemplateId =
  | "correction-concentration"
  | "approval-friction"
  | "error-stop-exposure"
  | "delegation-accounting"
  | "coordination-wait"
  | "skill-usage"
  | "skill-trigger-timing"
  | "host-skill-reads"
  | "coverage";

export type Claim = {
  id: string;
  type: "observation" | "hypothesis" | "recommendation";
  template: ClaimTemplateId;
  values: Record<string, number | string>;
  scope: { nodes: NodeKey[]; from: string; to: string };
  denominator?: { count: number; unit: string };
  coverage: "complete" | "partial";
  supporting: EvidenceId[];
  contradicting: EvidenceId[];
  basedOn: string[];
};

export type LedgerInput = {
  tree: TreeAggregate | null;
  cutoff: string;
  evidenceMode: "native-files" | "tracker-only";
  rootVerification: "unverified-root" | "not-applicable";
  unlinkedAgents: number;
  agentsCreated: number;
  sessionsLinked: number;
  /** Counts-only skill lookup snapshot from this server process. */
  skillUsage: SkillUsageSnapshot | null;
};

export type LedgerCounts = {
  agentsCreated: number;
  sessionsLinked: number;
  failedToolCalls: number;
  errorStops: number;
  claims: number;
  hypotheses: number;
};

/**
 * Host-mechanism skill reads (`read skill://<name>`) summed over the tree.
 * Ids are derived from the read path and are NOT checked against the registry.
 */
export type HostSkillSummary = {
  total: number;
  unique: number;
  top: Array<{ id: string; reads: number }>;
};

export type Ledger = {
  schemaVersion: 1;
  cutoff: string;
  evidenceMode: LedgerInput["evidenceMode"];
  rootVerification: LedgerInput["rootVerification"];
  coverage: "complete" | "partial";
  counts: LedgerCounts;
  /** Copy of the tracker snapshot the skill claims were built from. */
  skillUsage: SkillUsageSnapshot | null;
  /** Copy of the host-mechanism skill reads the host claim was built from. */
  hostSkills: HostSkillSummary | null;
  claims: Claim[];
  evidence: Record<EvidenceId, { kind: "aggregate"; value: number | string }>;
};

export type LedgerProblemCode =
  | "DANGLING_EVIDENCE"
  | "NUMBER_MISMATCH"
  | "MISSING_SCOPE"
  | "MIXED_CUTOFF"
  | "PARTIAL_RECOMMENDATION"
  | "RECOMMENDATION_WITHOUT_BASIS"
  | "BAD_COVERAGE"
  | "UNSAFE_VALUE";

const SAFE_MODEL_REGEX = /^[A-Za-z0-9._:/@+-]{1,64}$/;
const SAFE_DAY_REGEX = /^(\d{4}-\d{2}-\d{2}|unknown-day)$/;
/** Registry skill ids are `category/skill`; the tracker emits the same shape. */
const SAFE_SKILL_ID_REGEX = /^[A-Za-z0-9._:/@+-]{1,96}$/;
/** Host skill ids are path-derived; anything outside this shape is hashed. */
const SAFE_HOST_SKILL_ID_REGEX = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,95}$/;
/** Host skill ids carried in `hostSkills.top`. */
const MAX_TOP_HOST_SKILLS = 20;

const COUNT_KEYS: ReadonlyArray<keyof LedgerCounts> = [
  "agentsCreated",
  "sessionsLinked",
  "failedToolCalls",
  "errorStops",
  "claims",
  "hypotheses",
];

const DEFAULT_MAIN_NODE: NodeKey = {
  hostId: "local",
  sessionId: "main",
};

export function sanitizeModel(model: string): string {
  if (SAFE_MODEL_REGEX.test(model)) {
    return model;
  }
  const hash = createHash("sha256")
    .update(model, "utf8")
    .digest("hex")
    .slice(0, 8);
  return `model-${hash}`;
}

export function sanitizeDay(day: string): string {
  if (SAFE_DAY_REGEX.test(day)) {
    return day;
  }
  return "unknown-day";
}

export function sanitizeCellKey(rawKey: string): string {
  const pipeIdx = rawKey.indexOf("|");
  if (pipeIdx === -1) {
    return `unknown-day|${sanitizeModel(rawKey)}`;
  }
  const rawDay = rawKey.slice(0, pipeIdx);
  const rawModel = rawKey.slice(pipeIdx + 1);
  return `${sanitizeDay(rawDay)}|${sanitizeModel(rawModel)}`;
}

function resolveNodes(input: LedgerInput): NodeKey[] {
  const anyTree = input.tree as unknown as {
    nodes?: NodeKey[];
    node?: NodeKey;
  } | null;
  if (anyTree && Array.isArray(anyTree.nodes) && anyTree.nodes.length > 0) {
    return anyTree.nodes;
  }
  if (anyTree && anyTree.node) {
    return [anyTree.node];
  }
  const anyInput = input as unknown as {
    mainNode?: NodeKey;
    main?: NodeKey;
    node?: NodeKey;
  };
  if (anyInput.mainNode) {
    return [anyInput.mainNode];
  }
  if (anyInput.main) {
    return [anyInput.main];
  }
  if (anyInput.node) {
    return [anyInput.node];
  }
  return [DEFAULT_MAIN_NODE];
}

function computeClaimId(
  template: ClaimTemplateId,
  scope: { nodes: NodeKey[]; from: string; to: string },
  evidenceIds: string[],
): string {
  const sortedEvidence = [...evidenceIds].sort();
  const sortedNodes = [...scope.nodes].sort((a, b) => {
    if (a.hostId !== b.hostId) {
      return a.hostId < b.hostId ? -1 : 1;
    }
    return a.sessionId < b.sessionId ? -1 : a.sessionId > b.sessionId ? 1 : 0;
  });
  const payload = JSON.stringify({
    template,
    scope: {
      from: scope.from,
      nodes: sortedNodes,
      to: scope.to,
    },
    evidence: sortedEvidence,
  });
  return createHash("sha256")
    .update(payload, "utf8")
    .digest("hex")
    .slice(0, 16);
}

/** Deterministic copy: fixed key order, no shared references with the tracker. */
function copySkillUsage(
  snapshot: SkillUsageSnapshot | null,
): SkillUsageSnapshot | null {
  if (snapshot === null) return null;
  return {
    since: snapshot.since,
    events: snapshot.events,
    loadCalls: snapshot.loadCalls,
    noMatchCalls: snapshot.noMatchCalls,
    bodyReturns: snapshot.bodyReturns,
    dedupedReturns: snapshot.dedupedReturns,
    estimatedTokens: snapshot.estimatedTokens,
    selectedNotLoaded: snapshot.selectedNotLoaded,
    workflows: snapshot.workflows,
    guides: snapshot.guides,
    skillsTotal: snapshot.skillsTotal,
    skills: snapshot.skills.map((skill) => ({
      id: skill.id,
      returns: skill.returns,
      firstAt: skill.firstAt,
      via: [...skill.via],
    })),
  };
}

/**
 * Host ids are path-derived and never checked against the registry, so an id
 * that is not plainly safe is replaced by a stable hash of itself.
 */
function sanitizeHostSkillId(rawId: string): string {
  if (SAFE_HOST_SKILL_ID_REGEX.test(rawId)) {
    return rawId;
  }
  const hash = createHash("sha256")
    .update(rawId, "utf8")
    .digest("hex")
    .slice(0, 8);
  return `skill-${hash}`;
}

function compareHostSkillEntries(
  a: { id: string; reads: number },
  b: { id: string; reads: number },
): number {
  if (a.reads !== b.reads) {
    return b.reads - a.reads;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Deterministic copy of the tree's host-mechanism skill reads. Null when the
 * tree is null, when nothing was read, or when no node was measured.
 */
function buildHostSkills(tree: TreeAggregate | null): HostSkillSummary | null {
  if (tree === null) return null;
  const measuredNodes = tree.skillLoad.nodes.filter((node) => node.measured);
  if (measuredNodes.length === 0) return null;

  const perSkill = new Map<string, number>();
  let total = 0;
  for (const [rawId, count] of Object.entries(tree.hostSkillReads)) {
    if (!Number.isFinite(count) || count <= 0) continue;
    const id = sanitizeHostSkillId(rawId);
    perSkill.set(id, (perSkill.get(id) ?? 0) + count);
    total += count;
  }
  if (total === 0) return null;

  const top = Array.from(perSkill.entries())
    .map(([id, reads]) => ({ id, reads }))
    .sort(compareHostSkillEntries)
    .slice(0, MAX_TOP_HOST_SKILLS);

  return { total, unique: perSkill.size, top };
}

function sameHostSkills(
  a: HostSkillSummary | null,
  b: HostSkillSummary | null,
): boolean {
  if (a === null || b === null) return a === b;
  if (!Array.isArray(a.top) || !Array.isArray(b.top)) return false;
  if (a.total !== b.total || a.unique !== b.unique) return false;
  if (a.top.length !== b.top.length) return false;
  for (let index = 0; index < a.top.length; index += 1) {
    const left = a.top[index];
    const right = b.top[index];
    if (!left || !right) return false;
    if (left.id !== right.id || left.reads !== right.reads) return false;
  }
  return true;
}

export function buildLedger(input: LedgerInput): Ledger {
  const tree = input.tree;
  const isPartial =
    tree === null ||
    tree.coverage === "partial" ||
    input.evidenceMode === "tracker-only";
  const overallCoverage: "complete" | "partial" = isPartial
    ? "partial"
    : "complete";

  const from = tree?.first ?? input.cutoff;
  const to = tree?.last ?? input.cutoff;
  const nodes = resolveNodes(input);
  const scope = { nodes, from, to };

  const claims: Claim[] = [];
  const evidence: Record<
    EvidenceId,
    { kind: "aggregate"; value: number | string }
  > = {};

  const sessions = tree ? tree.sessions : 0;
  const fullyRead = tree ? tree.fullyRead : 0;
  const skippedLines = tree ? tree.skippedLines : 0;
  const agentsCreated = input.agentsCreated;
  const sessionsLinked = input.sessionsLinked;
  const unlinkedAgents = input.unlinkedAgents;
  const skillUsage = copySkillUsage(input.skillUsage);
  const hostSkills = buildHostSkills(tree);
  const mainSkillNode: NodeSkillLoad | null =
    tree === null || tree.skillLoad.nodes.length === 0
      ? null
      : tree.skillLoad.nodes[0];

  const coverageValues: Record<string, number | string> = {
    sessions,
    fullyRead,
    skippedLines,
    agentsCreated,
    sessionsLinked,
    unlinkedAgents,
  };

  const treeErrorStops =
    tree === null
      ? 0
      : (tree.stopReasons["error"] ??
        Object.values(tree.series.byDayModel).reduce(
          (sum, cell) => sum + cell.errorStops,
          0,
        ));

  let failedToolCalls = 0;
  if (tree !== null) {
    for (const count of Object.values(tree.toolErrors)) {
      failedToolCalls += count;
    }
  }

  // Metrics the error-stop claim is projected from; any undercounting one flags the claim.
  const errorStopCompleteness =
    tree !== null &&
    (["assistantTurns", "byDayModel", "toolErrors"] as const).some(
      (key) =>
        tree.metricCompleteness[key] === "may-undercount-by-skipped-lines",
    )
      ? "may-undercount-by-skipped-lines"
      : "complete";

  claims.push({
    id: computeClaimId("coverage", scope, []),
    type: "observation",
    template: "coverage",
    values: coverageValues,
    scope,
    coverage: overallCoverage,
    supporting: [],
    contradicting: [],
    basedOn: [],
  });

  if (tree !== null && tree.assistantTurns > 0) {
    const turns = tree.assistantTurns;
    const cellCount = Object.keys(tree.series.byDayModel).length;

    const supporting: EvidenceId[] = [
      "agg:tree:errorStops",
      "agg:tree:assistantTurns",
    ];

    evidence["agg:tree:errorStops"] = {
      kind: "aggregate",
      value: treeErrorStops,
    };
    evidence["agg:tree:assistantTurns"] = {
      kind: "aggregate",
      value: turns,
    };

    const errorStopValues: Record<string, number | string> = {
      errorStops: treeErrorStops,
      turns,
      cellCount,
      completeness: errorStopCompleteness,
    };

    const eligibleCells: Array<{
      rawKey: string;
      turns: number;
      errorStops: number;
      rate: number;
    }> = [];

    for (const [rawKey, cell] of Object.entries(tree.series.byDayModel)) {
      if (cell.turns >= 5) {
        eligibleCells.push({
          rawKey,
          turns: cell.turns,
          errorStops: cell.errorStops,
          rate: cell.errorStops / cell.turns,
        });
      }
    }

    if (eligibleCells.length > 0) {
      eligibleCells.sort((a, b) => {
        if (b.rate !== a.rate) {
          return b.rate - a.rate;
        }
        if (b.turns !== a.turns) {
          return b.turns - a.turns;
        }
        return a.rawKey < b.rawKey ? -1 : a.rawKey > b.rawKey ? 1 : 0;
      });

      const top = eligibleCells[0];
      const sanitizedKey = sanitizeCellKey(top.rawKey);

      errorStopValues.topCell = sanitizedKey;
      errorStopValues.topCellErrorStops = top.errorStops;
      errorStopValues.topCellTurns = top.turns;

      const cellErrorEvId = `agg:cell:${sanitizedKey}:errorStops`;
      const cellTurnsEvId = `agg:cell:${sanitizedKey}:turns`;

      supporting.push(cellErrorEvId);
      supporting.push(cellTurnsEvId);

      evidence[cellErrorEvId] = { kind: "aggregate", value: top.errorStops };
      evidence[cellTurnsEvId] = { kind: "aggregate", value: top.turns };
    }

    claims.push({
      id: computeClaimId("error-stop-exposure", scope, supporting),
      type: "observation",
      template: "error-stop-exposure",
      values: errorStopValues,
      scope,
      denominator: { count: turns, unit: "assistant turns" },
      coverage: overallCoverage,
      supporting,
      contradicting: [],
      basedOn: [],
    });
  }

  if (skillUsage !== null && skillUsage.loadCalls > 0) {
    const skillScope = {
      nodes,
      from: skillUsage.since,
      to: input.cutoff,
    };
    const skillSupporting: EvidenceId[] = [
      "agg:skills:loadCalls",
      "agg:skills:bodyReturns",
    ];
    evidence["agg:skills:loadCalls"] = {
      kind: "aggregate",
      value: skillUsage.loadCalls,
    };
    evidence["agg:skills:bodyReturns"] = {
      kind: "aggregate",
      value: skillUsage.bodyReturns,
    };

    // The tracker only sees this process, so its count equals the session total
    // only when the main session's bound calls match it exactly.
    const trackerWindow =
      mainSkillNode !== null &&
      mainSkillNode.skillLoadCalls === skillUsage.loadCalls
        ? "matches-session"
        : "process-only";

    claims.push({
      id: computeClaimId("skill-usage", skillScope, skillSupporting),
      type: "observation",
      template: "skill-usage",
      values: {
        loadCalls: skillUsage.loadCalls,
        skillsTotal: skillUsage.skillsTotal,
        bodyReturns: skillUsage.bodyReturns,
        dedupedReturns: skillUsage.dedupedReturns,
        estimatedTokens: skillUsage.estimatedTokens,
        noMatchCalls: skillUsage.noMatchCalls,
        selectedNotLoaded: skillUsage.selectedNotLoaded,
        workflows: skillUsage.workflows,
        guides: skillUsage.guides,
        trackerWindow,
      },
      scope: skillScope,
      denominator: { count: skillUsage.loadCalls, unit: "skill lookup calls" },
      coverage: overallCoverage,
      supporting: skillSupporting,
      contradicting: [],
      basedOn: [],
    });
  }

  if (tree !== null) {
    const measuredNodes = tree.skillLoad.nodes.filter((node) => node.measured);
    if (measuredNodes.length > 0) {
      const sessionsWithSkillLoad = measuredNodes.filter(
        (node) => node.skillLoadCalls > 0,
      ).length;
      const timingSupporting: EvidenceId[] = [
        "agg:skills:measuredSessions",
        "agg:skills:sessionsWithSkillLoad",
      ];
      evidence["agg:skills:measuredSessions"] = {
        kind: "aggregate",
        value: measuredNodes.length,
      };
      evidence["agg:skills:sessionsWithSkillLoad"] = {
        kind: "aggregate",
        value: sessionsWithSkillLoad,
      };

      const timingValues: Record<string, number | string> = {
        sessions: tree.skillLoad.nodes.length + tree.skillLoad.omittedNodes,
        measuredSessions: measuredNodes.length,
        sessionsWithSkillLoad,
        sessionsWithoutSkillLoad: measuredNodes.length - sessionsWithSkillLoad,
        mainSkillLoadCalls:
          mainSkillNode === null ? 0 : mainSkillNode.skillLoadCalls,
        completeness:
          tree.metricCompleteness.skillLoad ===
          "may-undercount-by-skipped-lines"
            ? "may-undercount-by-skipped-lines"
            : "complete",
      };
      if (
        mainSkillNode !== null &&
        mainSkillNode.measured &&
        mainSkillNode.callsBeforeFirstSkillLoad !== null
      ) {
        timingValues.mainCallsBeforeFirstSkillLoad =
          mainSkillNode.callsBeforeFirstSkillLoad;
      }

      claims.push({
        id: computeClaimId("skill-trigger-timing", scope, timingSupporting),
        type: "observation",
        template: "skill-trigger-timing",
        values: timingValues,
        scope,
        denominator: {
          count: measuredNodes.length,
          unit: "measured sessions",
        },
        coverage: overallCoverage,
        supporting: timingSupporting,
        contradicting: [],
        basedOn: [],
      });
    }
  }

  if (tree !== null && hostSkills !== null) {
    const measuredNodes = tree.skillLoad.nodes.filter((node) => node.measured);
    const sessionsWithHostRead = measuredNodes.filter(
      (node) => node.hostSkillReadCalls > 0,
    ).length;
    const sessionsWithAnySkillAccess = measuredNodes.filter(
      (node) => node.callsBeforeFirstSkillAccess !== null,
    ).length;

    const hostSupporting: EvidenceId[] = [
      "agg:hostSkills:readCalls",
      "agg:hostSkills:sessionsWithAnySkillAccess",
    ];
    evidence["agg:hostSkills:readCalls"] = {
      kind: "aggregate",
      value: hostSkills.total,
    };
    evidence["agg:hostSkills:sessionsWithAnySkillAccess"] = {
      kind: "aggregate",
      value: sessionsWithAnySkillAccess,
    };

    const hostValues: Record<string, number | string> = {
      readCalls: hostSkills.total,
      uniqueSkills: hostSkills.unique,
      sessionsWithHostRead,
      sessionsWithAnySkillAccess,
      measuredSessions: measuredNodes.length,
      completeness:
        tree.metricCompleteness.skillLoad === "may-undercount-by-skipped-lines"
          ? "may-undercount-by-skipped-lines"
          : "complete",
    };
    if (
      mainSkillNode !== null &&
      mainSkillNode.measured &&
      mainSkillNode.callsBeforeFirstSkillAccess !== null
    ) {
      hostValues.mainCallsBeforeFirstSkillAccess =
        mainSkillNode.callsBeforeFirstSkillAccess;
    }

    claims.push({
      id: computeClaimId("host-skill-reads", scope, hostSupporting),
      type: "observation",
      template: "host-skill-reads",
      values: hostValues,
      scope,
      denominator: {
        count: measuredNodes.length,
        unit: "measured sessions",
      },
      coverage: overallCoverage,
      supporting: hostSupporting,
      contradicting: [],
      basedOn: [],
    });
  }

  const sortedEvidence: Record<
    EvidenceId,
    { kind: "aggregate"; value: number | string }
  > = {};
  for (const k of Object.keys(evidence).sort()) {
    sortedEvidence[k] = evidence[k];
  }

  const counts: LedgerCounts = {
    agentsCreated,
    sessionsLinked,
    failedToolCalls,
    errorStops: treeErrorStops,
    claims: claims.length,
    hypotheses: claims.filter((claim) => claim.type === "hypothesis").length,
  };

  return {
    schemaVersion: 1,
    cutoff: input.cutoff,
    evidenceMode: input.evidenceMode,
    rootVerification: input.rootVerification,
    coverage: overallCoverage,
    counts,
    skillUsage,
    hostSkills,
    claims,
    evidence: sortedEvidence,
  };
}
export function checkClaimRules(ledger: Ledger): LedgerProblemCode[] {
  const problems = new Set<LedgerProblemCode>();

  for (const claim of ledger.claims) {
    for (const evId of [...claim.supporting, ...claim.contradicting]) {
      if (ledger.evidence[evId] === undefined) {
        problems.add("DANGLING_EVIDENCE");
      }
    }
  }

  for (const claim of ledger.claims) {
    if (
      !claim.scope ||
      typeof claim.scope.from !== "string" ||
      claim.scope.from.trim() === "" ||
      typeof claim.scope.to !== "string" ||
      claim.scope.to.trim() === ""
    ) {
      problems.add("MISSING_SCOPE");
    }

    if (
      claim.template === "error-stop-exposure" ||
      claim.template === "skill-usage" ||
      claim.template === "skill-trigger-timing" ||
      claim.template === "host-skill-reads"
    ) {
      if (
        !claim.denominator ||
        typeof claim.denominator.count !== "number" ||
        typeof claim.denominator.unit !== "string" ||
        claim.denominator.unit.trim() === ""
      ) {
        problems.add("MISSING_SCOPE");
      }
    }
  }

  const hypothesisIds = new Set(
    ledger.claims.filter((c) => c.type === "hypothesis").map((c) => c.id),
  );

  for (const claim of ledger.claims) {
    if (claim.coverage !== ledger.coverage) {
      problems.add("BAD_COVERAGE");
    }
    if (claim.type === "recommendation") {
      if (claim.coverage === "partial" || ledger.coverage === "partial") {
        problems.add("PARTIAL_RECOMMENDATION");
      }
      if (
        !Array.isArray(claim.basedOn) ||
        claim.basedOn.length === 0 ||
        !claim.basedOn.every((id) => hypothesisIds.has(id))
      ) {
        problems.add("RECOMMENDATION_WITHOUT_BASIS");
      }
    }
  }

  for (const claim of ledger.claims) {
    for (const [key, val] of Object.entries(claim.values)) {
      if (typeof val === "string") {
        if (key === "completeness") {
          if (val !== "complete" && val !== "may-undercount-by-skipped-lines") {
            problems.add("UNSAFE_VALUE");
          }
        } else if (key === "topCell") {
          const pipeIdx = val.indexOf("|");
          if (pipeIdx === -1) {
            problems.add("UNSAFE_VALUE");
          } else {
            const day = val.slice(0, pipeIdx);
            const model = val.slice(pipeIdx + 1);
            if (!SAFE_DAY_REGEX.test(day) || !SAFE_MODEL_REGEX.test(model)) {
              problems.add("UNSAFE_VALUE");
            }
          }
        } else {
          if (!SAFE_MODEL_REGEX.test(val)) {
            problems.add("UNSAFE_VALUE");
          }
        }
      }
    }
  }

  return Array.from(problems).sort() as LedgerProblemCode[];
}

export function verifyLedger(
  ledger: Ledger,
  input: LedgerInput,
): { ok: true } | { ok: false; problems: LedgerProblemCode[] } {
  const problems = new Set<LedgerProblemCode>(checkClaimRules(ledger));

  if (ledger.cutoff !== input.cutoff) {
    problems.add("MIXED_CUTOFF");
  }

  const expected = buildLedger(input);

  if (ledger.coverage !== expected.coverage) {
    problems.add("BAD_COVERAGE");
  }

  for (const claim of ledger.claims) {
    const expClaim = expected.claims.find((c) => c.template === claim.template);
    if (!expClaim) {
      for (const val of Object.values(claim.values)) {
        if (typeof val === "number") {
          problems.add("NUMBER_MISMATCH");
          break;
        }
      }
    } else {
      for (const [k, v] of Object.entries(claim.values)) {
        if (typeof v === "number" && expClaim.values[k] !== v) {
          problems.add("NUMBER_MISMATCH");
        }
      }
      for (const [k, v] of Object.entries(expClaim.values)) {
        if (typeof v === "number" && claim.values[k] !== v) {
          problems.add("NUMBER_MISMATCH");
        }
      }
      if (expClaim.values.completeness !== claim.values.completeness) {
        problems.add("NUMBER_MISMATCH");
      }
      if (
        claim.template === "skill-usage" &&
        expClaim.values.trackerWindow !== claim.values.trackerWindow
      ) {
        problems.add("NUMBER_MISMATCH");
      }
    }
  }

  const actualCounts: Partial<LedgerCounts> | undefined =
    typeof ledger.counts === "object" && ledger.counts !== null
      ? ledger.counts
      : undefined;
  for (const key of COUNT_KEYS) {
    if (actualCounts?.[key] !== expected.counts[key]) {
      problems.add("NUMBER_MISMATCH");
    }
  }

  for (const [k, ev] of Object.entries(ledger.evidence)) {
    const expEv = expected.evidence[k];
    if (expEv !== undefined && expEv.value !== ev.value) {
      problems.add("NUMBER_MISMATCH");
    }
  }
  for (const [k, expEv] of Object.entries(expected.evidence)) {
    const actEv = ledger.evidence[k];
    if (actEv !== undefined && actEv.value !== expEv.value) {
      problems.add("NUMBER_MISMATCH");
    }
  }

  if (
    JSON.stringify(ledger.skillUsage) !== JSON.stringify(expected.skillUsage)
  ) {
    problems.add("NUMBER_MISMATCH");
  }

  const storedHostSkills: HostSkillSummary | null = ledger.hostSkills ?? null;
  if (storedHostSkills !== null) {
    if (!Array.isArray(storedHostSkills.top)) {
      problems.add("NUMBER_MISMATCH");
    } else {
      for (const entry of storedHostSkills.top) {
        if (
          typeof entry?.id !== "string" ||
          !SAFE_HOST_SKILL_ID_REGEX.test(entry.id)
        ) {
          problems.add("UNSAFE_VALUE");
        }
      }
    }
  }
  if (!sameHostSkills(storedHostSkills, expected.hostSkills)) {
    problems.add("NUMBER_MISMATCH");
  }

  if (ledger.skillUsage !== null && Array.isArray(ledger.skillUsage.skills)) {
    for (const skill of ledger.skillUsage.skills) {
      if (
        typeof skill?.id !== "string" ||
        !SAFE_SKILL_ID_REGEX.test(skill.id)
      ) {
        problems.add("UNSAFE_VALUE");
      }
    }
  }

  for (const claim of ledger.claims) {
    if (expected.coverage === "partial" && claim.coverage !== "partial") {
      problems.add("BAD_COVERAGE");
    }
  }

  if (problems.size === 0) {
    return { ok: true };
  }
  return {
    ok: false,
    problems: Array.from(problems).sort() as LedgerProblemCode[],
  };
}
