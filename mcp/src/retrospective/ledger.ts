import { createHash } from "node:crypto";
import type { SkillUsageSnapshot } from "../services/SessionTracker";
import {
  LOOKUP_TOOLS,
  type LookupToolName,
  type NodeSkillLoad,
  type NodeUsage,
  type TreeAggregate,
} from "./aggregate";

export { LOOKUP_TOOLS, type LookupToolName };
import type { NodeKey } from "./contracts";
import {
  deriveImprovements,
  type ImprovementInput,
  type LedgerImprovement,
} from "./improvements";

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
  | "tool-errors"
  | "coverage"
  | "permission-answers"
  | "cost-drivers"
  | "routing-order"
  | "ags-lookups";

export type LedgerFolder = { name: string; parent: string | null };
export type LedgerLookupTool = {
  tool: LookupToolName;
  calls: number;
  noMatchCalls: number;
  errorCalls: number;
  bodiesReturned: number;
  reusedBodies: number;
  mainCalls: number;
  workerCalls: number;
};
export type LedgerLookupSkill = {
  id: string;
  returns: number;
  mainReturns: number;
  workerReturns: number;
};
export type LedgerLookups = {
  tools: LedgerLookupTool[]; // exactly 5, in LOOKUP_TOOLS order
  skills: LedgerLookupSkill[]; // top 30 by returns desc, then id asc
  distinctSkills: number; // distinct validated ids across all nodes (before the top-30 cut)
  otherSkillReturns: number; // delivered bodies of skills outside the top 30 + sum of node otherReturns
  unvalidatedReturns: number; // sum over nodes
  capped: boolean; // any node skillsCapped
};
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
  /** Bound main session id, or null for a tracker-only run. */
  mainSessionId: string | null;
  cutoff: string;
  evidenceMode: "native-files" | "tracker-only";
  rootVerification: "unverified-root" | "not-applicable";
  unlinkedAgents: number;
  agentsCreated: number;
  sessionsLinked: number;
  /** Counts-only skill lookup snapshot from this server process. */
  skillUsage: SkillUsageSnapshot | null;
  /** Server tracker start timestamp (`skillUsageSnapshot.since`), null when no skill usage. */
  trackerSince: string | null;
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

/** One listed day-model cell: a sanitized key plus its turn and error-stop counts. */
export type LedgerCell = {
  key: string;
  turns: number;
  errorStops: number;
};
export type LedgerAgent = {
  label: string;
  kind: "read-only" | "editing";
  turns: number;
  costCents: number;
  compactions: number;
  cacheReadPerTurn: number;
  errorStops: number;
  toolCalls: number;
  toolErrors: number;
  editCalls: number;
  bashCalls: number;
  readCalls: number;
  agsLookups: number;
  permissionAnswers: number;
  model: string;
};

export type Ledger = {
  schemaVersion: 1;
  cutoff: string;
  /**
   * First eight characters of the bound main session id, a stable hashed label
   * when it is not a safe identifier, or null for a tracker-only run.
   */
  session: string | null;
  evidenceMode: LedgerInput["evidenceMode"];
  rootVerification: LedgerInput["rootVerification"];
  coverage: "complete" | "partial";
  counts: LedgerCounts;
  folder: LedgerFolder | null;
  lookups: LedgerLookups | null;
  /** Copy of the tracker snapshot the skill claims were built from. */
  skillUsage: SkillUsageSnapshot | null;
  /** Copy of the host-mechanism skill reads the host claim was built from. */
  hostSkills: HostSkillSummary | null;
  /**
   * At most 50 day-model cells by turns desc then key asc, plus any cell a claim
   * value names (appended past the cap so the evidence keeps resolving).
   */
  cells: LedgerCell[];
  agents: LedgerAgent[];
  otherAgents: { count: number; turns: number; costCents: number } | null;
  improvements: LedgerImprovement[];
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
/** Day-model cells listed in `Ledger.cells` before claim-referenced extras. */
const MAX_CELLS = 50;
/** A bound session id this shape is printed as its first eight characters. */
const SAFE_SESSION_ID_REGEX = /^[A-Za-z0-9-]{8,128}$/;
/** Tool names are file-derived; anything outside this shape is hashed. */
const SAFE_TOOL_NAME_REGEX = /^[A-Za-z0-9._:-]{1,48}$/;
/** `topErrorTools` is `tool:count` pairs joined by commas. */
const SAFE_TOP_ERROR_TOOLS_REGEX =
  /^[A-Za-z0-9._:-]{1,48}:[0-9]+(?:,[A-Za-z0-9._:-]{1,48}:[0-9]+){0,2}$/;
const MAX_TOP_ERROR_TOOLS = 3;

export const COORDINATION_TOOLS = new Set<string>([
  "respond_to_permission",
  "wait",
  "send_agent_prompt",
  "create_agent",
  "get_agent_activity",
  "get_agent_status",
  "list_profiles",
  "update_agent",
  "list_agents",
  "cancel_agent",
  "archive_agent",
  "set_agent_mode",
  "list_pending_permissions",
  "kill_agent",
  "list_workspaces",
  "list_providers",
  "inspect_provider",
  "task",
]);

function deriveTopModel(models: Record<string, number> | undefined): string {
  if (!models) return "unknown";
  const entries = Object.entries(models).filter(([, count]) => count > 0);
  if (entries.length === 0) return "unknown";
  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });
  return sanitizeModel(entries[0][0]);
}
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
    nodes?: unknown[];
    node?: NodeKey;
  } | null;
  if (anyTree && Array.isArray(anyTree.nodes)) {
    const keys = anyTree.nodes.filter(
      (entry): entry is NodeKey =>
        typeof entry === "object" &&
        entry !== null &&
        "hostId" in entry &&
        typeof entry.hostId === "string" &&
        "sessionId" in entry &&
        typeof entry.sessionId === "string",
    );
    if (keys.length > 0) return keys;
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
 * Deterministic copy of the tree's host-mechanism skill reads. Null only when
 * the tree is null or no node was measured: a measured tree with zero reads is
 * a real zero, so it yields a zero summary and a `host-skill-reads` claim.
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

  const top = Array.from(perSkill.entries())
    .map(([id, reads]) => ({ id, reads }))
    .sort(compareHostSkillEntries)
    .slice(0, MAX_TOP_HOST_SKILLS);

  return { total, unique: perSkill.size, top };
}

/** First eight characters of a safe session id, else a stable hashed label. */
function deriveSessionLabel(mainSessionId: string | null): string | null {
  if (mainSessionId === null) return null;
  if (SAFE_SESSION_ID_REGEX.test(mainSessionId)) {
    return mainSessionId.slice(0, 8);
  }
  const hash = createHash("sha256")
    .update(mainSessionId, "utf8")
    .digest("hex")
    .slice(0, 8);
  return `session-${hash}`;
}

/** Every sanitized day-model cell, unsorted. */
function collectCells(tree: TreeAggregate | null): LedgerCell[] {
  if (tree === null) return [];
  return Object.entries(tree.series.byDayModel).map(([rawKey, cell]) => ({
    key: sanitizeCellKey(rawKey),
    turns: cell.turns,
    errorStops: cell.errorStops,
  }));
}

function compareCellTurns(a: LedgerCell, b: LedgerCell): number {
  if (b.turns !== a.turns) return b.turns - a.turns;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/** A cell named by a claim value stays in the ledger even outside the top 50. */
function ensureCellListed(
  cells: LedgerCell[],
  allCells: LedgerCell[],
  key: string,
): void {
  if (cells.some((cell) => cell.key === key)) return;
  const source = allCells.find((cell) => cell.key === key);
  if (source !== undefined) cells.push({ ...source });
}

function addCellEvidence(
  cells: LedgerCell[],
  evidence: Record<EvidenceId, { kind: "aggregate"; value: number | string }>,
): void {
  for (const cell of cells) {
    evidence[`agg:cell:${cell.key}:turns`] = {
      kind: "aggregate",
      value: cell.turns,
    };
    evidence[`agg:cell:${cell.key}:errorStops`] = {
      kind: "aggregate",
      value: cell.errorStops,
    };
  }
}

/** Tool names are file-derived; anything outside the safe shape is hashed. */
function sanitizeToolName(tool: string): string {
  if (SAFE_TOOL_NAME_REGEX.test(tool)) return tool;
  const hash = createHash("sha256")
    .update(tool, "utf8")
    .digest("hex")
    .slice(0, 8);
  return `tool-${hash}`;
}

/**
 * Every numeric claim value carries its own aggregate evidence entry, and the
 * claim's supporting list names it, so a reader can resolve the number.
 */
function addClaimValueEvidence(
  template: ClaimTemplateId,
  values: Record<string, number | string>,
  supporting: EvidenceId[],
  evidence: Record<EvidenceId, { kind: "aggregate"; value: number | string }>,
): void {
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== "number") continue;
    const id = `agg:claim:${template}:${key}`;
    evidence[id] = { kind: "aggregate", value };
    supporting.push(id);
  }
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

function buildLedgerLookups(nodes: NodeUsage[]): LedgerLookups {
  const mainNode = nodes.find((n) => n.ordinal === 0) ?? nodes[0];

  const tools: LedgerLookupTool[] = [];
  for (const toolName of LOOKUP_TOOLS) {
    let calls = 0;
    let noMatchCalls = 0;
    let errorCalls = 0;
    let bodiesReturned = 0;
    let reusedBodies = 0;
    let mainCalls = 0;
    let workerCalls = 0;

    for (const node of nodes) {
      const stats = node.lookups?.tools?.[toolName];
      if (!stats) continue;
      calls += stats.calls;
      noMatchCalls += stats.noMatchCalls;
      errorCalls += stats.errorCalls;
      bodiesReturned += stats.bodiesReturned;
      reusedBodies += stats.reusedBodies;

      const isMain = node.ordinal === 0 || node === mainNode;
      if (isMain) {
        mainCalls += stats.calls;
      } else {
        workerCalls += stats.calls;
      }
    }

    tools.push({
      tool: toolName,
      calls,
      noMatchCalls,
      errorCalls,
      bodiesReturned,
      reusedBodies,
      mainCalls,
      workerCalls,
    });
  }

  const skillMap = new Map<
    string,
    { id: string; returns: number; mainReturns: number; workerReturns: number }
  >();

  for (const node of nodes) {
    const isMain = node.ordinal === 0 || node === mainNode;
    if (!node.lookups?.skills) continue;
    for (const [id, count] of Object.entries(node.lookups.skills)) {
      if (typeof count !== "number" || count <= 0) continue;
      let entry = skillMap.get(id);
      if (!entry) {
        entry = { id, returns: 0, mainReturns: 0, workerReturns: 0 };
        skillMap.set(id, entry);
      }
      entry.returns += count;
      if (isMain) {
        entry.mainReturns += count;
      } else {
        entry.workerReturns += count;
      }
    }
  }

  const distinctSkills = skillMap.size;

  const sortedSkills = Array.from(skillMap.values()).sort((a, b) => {
    if (b.returns !== a.returns) return b.returns - a.returns;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const skills = sortedSkills.slice(0, 30);
  const overflowSkills = sortedSkills.slice(30);

  let otherSkillReturns = overflowSkills.reduce((sum, s) => sum + s.returns, 0);
  for (const node of nodes) {
    otherSkillReturns += node.lookups?.otherReturns ?? 0;
  }

  let unvalidatedReturns = 0;
  for (const node of nodes) {
    unvalidatedReturns += node.lookups?.unvalidatedReturns ?? 0;
  }

  const capped = nodes.some((node) => node.lookups?.skillsCapped === true);

  return {
    tools,
    skills,
    distinctSkills,
    otherSkillReturns,
    unvalidatedReturns,
    capped,
  };
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

  const folder: LedgerFolder | null =
    tree?.folder != null
      ? { name: tree.folder.name, parent: tree.folder.parent }
      : null;
  const lookups =
    tree !== null && Array.isArray(tree.nodes) && tree.nodes.length > 0
      ? buildLedgerLookups(tree.nodes)
      : null;

  const from = tree?.first ?? input.cutoff;
  const to = tree?.last ?? input.cutoff;
  const nodes = resolveNodes(input);
  const scope = { nodes, from, to };

  const claims: Claim[] = [];
  const evidence: Record<
    EvidenceId,
    { kind: "aggregate"; value: number | string }
  > = {};

  const session = deriveSessionLabel(input.mainSessionId);
  const allCells = collectCells(tree);
  // Claim-referenced cells may be appended past the cap before evidence is added.
  const cells = [...allCells].sort(compareCellTurns).slice(0, MAX_CELLS);

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
    agentsRead: Math.max(0, agentsCreated - unlinkedAgents),
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

  const coverageSupporting: EvidenceId[] = [];
  addClaimValueEvidence(
    "coverage",
    coverageValues,
    coverageSupporting,
    evidence,
  );

  claims.push({
    id: computeClaimId("coverage", scope, coverageSupporting),
    type: "observation",
    template: "coverage",
    values: coverageValues,
    scope,
    coverage: overallCoverage,
    supporting: coverageSupporting,
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
    }

    // The busiest cell carries the most error stops (ties: more turns, then key
    // asc). Zero stops is a real zero, so it names no cell at all.
    let busiest: LedgerCell | null = null;
    for (const cell of allCells) {
      if (cell.errorStops <= 0) continue;
      const better =
        busiest === null ||
        cell.errorStops > busiest.errorStops ||
        (cell.errorStops === busiest.errorStops &&
          (cell.turns > busiest.turns ||
            (cell.turns === busiest.turns && cell.key < busiest.key)));
      if (better) busiest = cell;
    }

    if (treeErrorStops > 0) {
      const top = eligibleCells.length > 0 ? eligibleCells[0] : null;
      // A top-rate cell with zero stops would read as a finding it is not.
      if (top !== null && top.errorStops > 0) {
        const sanitizedKey = sanitizeCellKey(top.rawKey);
        errorStopValues.topCell = sanitizedKey;
        errorStopValues.topCellErrorStops = top.errorStops;
        errorStopValues.topCellTurns = top.turns;
        ensureCellListed(cells, allCells, sanitizedKey);
        supporting.push(
          `agg:cell:${sanitizedKey}:errorStops`,
          `agg:cell:${sanitizedKey}:turns`,
        );
      }
      if (busiest !== null) {
        errorStopValues.busiestCell = busiest.key;
        errorStopValues.busiestCellErrorStops = busiest.errorStops;
        errorStopValues.busiestCellTurns = busiest.turns;
        ensureCellListed(cells, allCells, busiest.key);
        const busiestErrorEvId = `agg:cell:${busiest.key}:errorStops`;
        const busiestTurnsEvId = `agg:cell:${busiest.key}:turns`;
        if (!supporting.includes(busiestErrorEvId)) {
          supporting.push(busiestErrorEvId);
        }
        if (!supporting.includes(busiestTurnsEvId)) {
          supporting.push(busiestTurnsEvId);
        }
      }
    }

    addClaimValueEvidence(
      "error-stop-exposure",
      errorStopValues,
      supporting,
      evidence,
    );

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

    const mainNodeFirst = tree?.nodes?.[0]?.first ?? null;
    const parsedSince =
      input.trackerSince !== null ? Date.parse(input.trackerSince) : NaN;
    const parsedFirst =
      mainNodeFirst !== null ? Date.parse(mainNodeFirst) : NaN;
    const isEarlyEnough =
      Number.isFinite(parsedSince) &&
      Number.isFinite(parsedFirst) &&
      parsedSince <= parsedFirst;

    // The tracker only sees this process, so its count equals the session total
    // only when the main session's bound calls match it exactly AND trackerSince
    // is not null and is earlier than or equal to the main session's first row timestamp.
    const trackerWindow =
      mainSkillNode !== null &&
      mainSkillNode.skillLoadCalls === skillUsage.loadCalls &&
      input.trackerSince !== null &&
      isEarlyEnough
        ? "matches-session"
        : "process-only";
    const skillValues: Record<string, number | string> = {
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
    };
    addClaimValueEvidence(
      "skill-usage",
      skillValues,
      skillSupporting,
      evidence,
    );

    claims.push({
      id: computeClaimId("skill-usage", skillScope, skillSupporting),
      type: "observation",
      template: "skill-usage",
      values: skillValues,
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

      addClaimValueEvidence(
        "skill-trigger-timing",
        timingValues,
        timingSupporting,
        evidence,
      );

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

    addClaimValueEvidence(
      "host-skill-reads",
      hostValues,
      hostSupporting,
      evidence,
    );

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

  if (tree !== null) {
    let toolCallCount = 0;
    for (const count of Object.values(tree.toolCalls)) {
      toolCallCount += count;
    }
    if (toolCallCount > 0) {
      const toolSupporting: EvidenceId[] = [
        "agg:tree:toolCalls",
        "agg:tree:toolErrors",
      ];
      evidence["agg:tree:toolCalls"] = {
        kind: "aggregate",
        value: toolCallCount,
      };
      evidence["agg:tree:toolErrors"] = {
        kind: "aggregate",
        value: failedToolCalls,
      };

      const toolValues: Record<string, number | string> = {
        toolCalls: toolCallCount,
        failedToolCalls,
        completeness: (["toolCalls", "toolErrors"] as const).some(
          (key) =>
            tree.metricCompleteness[key] === "may-undercount-by-skipped-lines",
        )
          ? "may-undercount-by-skipped-lines"
          : "complete",
      };

      if (failedToolCalls > 0) {
        toolValues.topErrorTools = Object.entries(tree.toolErrors)
          .filter(([, count]) => Number.isFinite(count) && count > 0)
          .map(([tool, count]) => ({ name: sanitizeToolName(tool), count }))
          .sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
          })
          .slice(0, MAX_TOP_ERROR_TOOLS)
          .map((entry) => `${entry.name}:${entry.count}`)
          .join(",");
      }

      addClaimValueEvidence(
        "tool-errors",
        toolValues,
        toolSupporting,
        evidence,
      );

      claims.push({
        id: computeClaimId("tool-errors", scope, toolSupporting),
        type: "observation",
        template: "tool-errors",
        values: toolValues,
        scope,
        denominator: { count: toolCallCount, unit: "tool calls" },
        coverage: overallCoverage,
        supporting: toolSupporting,
        contradicting: [],
        basedOn: [],
      });
    }
  }

  const rawNodes = tree?.nodes ?? [];
  const agents: LedgerAgent[] = [];
  let otherAgents: { count: number; turns: number; costCents: number } | null =
    null;

  if (rawNodes.length > 0) {
    const mainNode = rawNodes.find((n) => n.ordinal === 0) ?? rawNodes[0];
    const workerNodes = rawNodes.filter((n) => n !== mainNode);

    const sortedWorkers = [...workerNodes].sort((a, b) => {
      const aCostCents = Math.round(a.cost * 100);
      const bCostCents = Math.round(b.cost * 100);
      if (bCostCents !== aCostCents) {
        return bCostCents - aCostCents;
      }
      return a.ordinal - b.ordinal;
    });

    const createAgent = (node: NodeUsage, label: string): LedgerAgent => {
      const editEpisodes = node.routing?.editEpisodes ?? 0;
      const bashCalls = node.toolCallsByName?.bash ?? 0;
      const isEditing = editEpisodes > 0 || bashCalls > 0;
      const turns = node.turns;
      const costCents = Math.round(node.cost * 100);
      const compactions = node.compactions;
      const cacheReadPerTurn =
        turns > 0 ? Math.round(node.tokens.cacheRead / turns) : 0;
      const errorStops = node.errorStops;
      const toolCalls = node.toolCalls;
      const toolErrors = node.toolErrors;
      const editCalls = node.toolCallsByName?.edit ?? 0;
      const readCalls = node.toolCallsByName?.read ?? 0;
      const agsLookups = node.skillLoadCalls;
      const permissionAnswers = node.permissionAnswers
        ? node.permissionAnswers.allow +
          node.permissionAnswers.deny +
          node.permissionAnswers.other
        : 0;
      const model = deriveTopModel(node.models);

      return {
        label,
        kind: isEditing ? "editing" : "read-only",
        turns,
        costCents,
        compactions,
        cacheReadPerTurn,
        errorStops,
        toolCalls,
        toolErrors,
        editCalls,
        bashCalls,
        readCalls,
        agsLookups,
        permissionAnswers,
        model,
      };
    };

    const mainAgent = createAgent(mainNode, "main");
    const listedWorkers: LedgerAgent[] = [];
    const cappedWorkers = sortedWorkers.slice(0, 50);
    for (let i = 0; i < cappedWorkers.length; i += 1) {
      listedWorkers.push(createAgent(cappedWorkers[i], `worker-${i + 1}`));
    }

    agents.push(mainAgent, ...listedWorkers);

    const remainingWorkers = sortedWorkers.slice(50);
    if (remainingWorkers.length > 0) {
      let otherTurns = 0;
      let otherCostCents = 0;
      for (const w of remainingWorkers) {
        otherTurns += w.turns;
        otherCostCents += Math.round(w.cost * 100);
      }
      otherAgents = {
        count: remainingWorkers.length,
        turns: otherTurns,
        costCents: otherCostCents,
      };
    }
  }

  for (const agent of agents) {
    evidence[`agg:agent:${agent.label}:turns`] = {
      kind: "aggregate",
      value: agent.turns,
    };
    evidence[`agg:agent:${agent.label}:costCents`] = {
      kind: "aggregate",
      value: agent.costCents,
    };
    evidence[`agg:agent:${agent.label}:errorStops`] = {
      kind: "aggregate",
      value: agent.errorStops,
    };
    evidence[`agg:agent:${agent.label}:permissionAnswers`] = {
      kind: "aggregate",
      value: agent.permissionAnswers,
    };
  }

  if (tree !== null && Array.isArray(tree.nodes) && tree.nodes.length > 0) {
    let permAllow = 0;
    let permDeny = 0;
    let permOther = 0;
    let askCalls = 0;
    let abortedStops = 0;
    const targetMap = new Map<string, number>();

    for (const node of tree.nodes) {
      if (node.permissionAnswers) {
        permAllow += node.permissionAnswers.allow;
        permDeny += node.permissionAnswers.deny;
        permOther += node.permissionAnswers.other;
        for (const [target, count] of Object.entries(
          node.permissionAnswers.byTarget,
        )) {
          targetMap.set(target, (targetMap.get(target) ?? 0) + count);
        }
      }
      askCalls += node.toolCallsByName?.ask ?? 0;
      abortedStops += node.abortedStops ?? 0;
    }

    const answers = permAllow + permDeny + permOther;
    if (answers > 0 || askCalls > 0 || abortedStops > 0) {
      const targets = targetMap.size;
      const targetCounts = Array.from(targetMap.values());
      const maxPerTarget =
        targetCounts.length > 0 ? Math.max(...targetCounts) : 0;
      const targetsAtLeast3 = targetCounts.filter((c) => c >= 3).length;
      const turns = tree.assistantTurns;

      const permValues: Record<string, number | string> = {
        answers,
        allow: permAllow,
        deny: permDeny,
        other: permOther,
        targets,
        maxPerTarget,
        targetsAtLeast3,
        askCalls,
        abortedStops,
        turns,
        completeness: (["toolCalls", "toolErrors"] as const).some(
          (key) =>
            tree.metricCompleteness[key] === "may-undercount-by-skipped-lines",
        )
          ? "may-undercount-by-skipped-lines"
          : "complete",
      };

      const permSupporting: EvidenceId[] = [];
      addClaimValueEvidence(
        "permission-answers",
        permValues,
        permSupporting,
        evidence,
      );

      claims.push({
        id: computeClaimId("permission-answers", scope, permSupporting),
        type: "observation",
        template: "permission-answers",
        values: permValues,
        scope,
        denominator: { count: turns, unit: "assistant turns" },
        coverage: overallCoverage,
        supporting: permSupporting,
        contradicting: [],
        basedOn: [],
      });
    }
  }

  if (
    tree !== null &&
    Array.isArray(tree.nodes) &&
    tree.nodes.length > 0 &&
    tree.assistantTurns > 0
  ) {
    const mainNode = tree.nodes.find((n) => n.ordinal === 0) ?? tree.nodes[0];
    const otherNodes = tree.nodes.filter((n) => n !== mainNode);

    const costCentsMain = Math.round(mainNode.cost * 100);
    const costCentsOthers = otherNodes.reduce(
      (sum, n) => sum + Math.round(n.cost * 100),
      0,
    );
    const turnsMain = mainNode.turns;
    const turnsOthers = otherNodes.reduce((sum, n) => sum + n.turns, 0);

    const cacheReadPerTurnMain =
      turnsMain > 0 ? Math.round(mainNode.tokens.cacheRead / turnsMain) : 0;
    const cacheReadOthers = otherNodes.reduce(
      (sum, n) => sum + n.tokens.cacheRead,
      0,
    );
    const cacheReadPerTurnOthers =
      turnsOthers > 0 ? Math.round(cacheReadOthers / turnsOthers) : 0;

    const compactionsMain = mainNode.compactions;
    const postCompactionTurnsMain = mainNode.context?.postCompactionTurns ?? 0;
    const postCompactionCacheReadSumMain =
      mainNode.context?.postCompactionCacheReadSum ?? 0;
    const postCompactionCacheReadPerTurnMain =
      postCompactionTurnsMain > 0
        ? Math.round(postCompactionCacheReadSumMain / postCompactionTurnsMain)
        : 0;

    const maxCacheReadMain = mainNode.context?.maxCacheRead ?? 0;
    const mainToolCalls = mainNode.toolCalls;
    const mainReadCalls = mainNode.toolCallsByName?.read ?? 0;
    const mainEditCalls = mainNode.toolCallsByName?.edit ?? 0;
    const mainBashCalls = mainNode.toolCallsByName?.bash ?? 0;

    let mainCoordinationCalls = 0;
    if (mainNode.toolCallsByName) {
      for (const [tool, count] of Object.entries(mainNode.toolCallsByName)) {
        if (COORDINATION_TOOLS.has(tool)) {
          mainCoordinationCalls += count;
        }
      }
    }

    const mainPermissionCalls =
      mainNode.toolCallsByName?.respond_to_permission ??
      (mainNode.permissionAnswers
        ? mainNode.permissionAnswers.allow +
          mainNode.permissionAnswers.deny +
          mainNode.permissionAnswers.other
        : 0);

    const costCentsMainReads =
      mainToolCalls > 0
        ? Math.round((costCentsMain * mainReadCalls) / mainToolCalls)
        : 0;
    const costCentsMainCoordination =
      mainToolCalls > 0
        ? Math.round((costCentsMain * mainCoordinationCalls) / mainToolCalls)
        : 0;

    const costDriverValues: Record<string, number | string> = {
      costCentsMain,
      costCentsOthers,
      turnsMain,
      turnsOthers,
      cacheReadPerTurnMain,
      cacheReadPerTurnOthers,
      compactionsMain,
      postCompactionCacheReadPerTurnMain,
      maxCacheReadMain,
      mainToolCalls,
      mainReadCalls,
      mainEditCalls,
      mainBashCalls,
      mainCoordinationCalls,
      mainPermissionCalls,
      costCentsMainReads,
      costCentsMainCoordination,
      completeness: (["toolCalls", "toolErrors"] as const).some(
        (key) =>
          tree.metricCompleteness[key] === "may-undercount-by-skipped-lines",
      )
        ? "may-undercount-by-skipped-lines"
        : "complete",
    };

    const costDriverSupporting: EvidenceId[] = [];
    addClaimValueEvidence(
      "cost-drivers",
      costDriverValues,
      costDriverSupporting,
      evidence,
    );

    claims.push({
      id: computeClaimId("cost-drivers", scope, costDriverSupporting),
      type: "observation",
      template: "cost-drivers",
      values: costDriverValues,
      scope,
      denominator: {
        count: tree.assistantTurns,
        unit: "assistant turns",
      },
      coverage: overallCoverage,
      supporting: costDriverSupporting,
      contradicting: [],
      basedOn: [],
    });
  }

  if (tree !== null && Array.isArray(tree.nodes) && tree.nodes.length > 0) {
    const mainNode = tree.nodes.find((n) => n.ordinal === 0) ?? tree.nodes[0];
    const otherNodes = tree.nodes.filter((n) => n !== mainNode);

    const lookupsMain = mainNode.skillLoadCalls;
    const lookupsOthers = otherNodes.reduce(
      (sum, n) => sum + n.skillLoadCalls,
      0,
    );

    let byFilesTotal = 0;
    let byKeywordsTotal = 0;
    let getSkillTotal = 0;
    let overheadCalls = 0;

    for (const node of tree.nodes) {
      if (node.serverToolCalls) {
        byFilesTotal += node.serverToolCalls["load_skills_for_files"] ?? 0;
        byKeywordsTotal +=
          node.serverToolCalls["load_skills_for_keywords"] ?? 0;
        getSkillTotal += node.serverToolCalls["get_skill"] ?? 0;
        overheadCalls +=
          (node.serverToolCalls["audit_session_compliance"] ?? 0) +
          (node.serverToolCalls["get_session_cost"] ?? 0) +
          (node.serverToolCalls["list_workflows"] ?? 0);
      }
    }

    const agentsWithLookup = tree.nodes.filter(
      (n) => n.skillLoadCalls > 0,
    ).length;
    const agentsTotal = tree.nodes.length;

    const editEpisodesMain = mainNode.routing?.editEpisodes ?? 0;
    const unguardedEditsMain = mainNode.routing?.unguardedEditEpisodes ?? 0;

    const editEpisodesOthers = otherNodes.reduce(
      (sum, n) => sum + (n.routing?.editEpisodes ?? 0),
      0,
    );
    const unguardedEditsOthers = otherNodes.reduce(
      (sum, n) => sum + (n.routing?.unguardedEditEpisodes ?? 0),
      0,
    );

    const hostSkillReadCalls = hostSkills?.total ?? 0;

    const routingValues: Record<string, number | string> = {
      lookupsMain,
      lookupsOthers,
      byFilesTotal,
      byKeywordsTotal,
      getSkillTotal,
      agentsWithLookup,
      agentsTotal,
      editEpisodesMain,
      unguardedEditsMain,
      editEpisodesOthers,
      unguardedEditsOthers,
      overheadCalls,
      hostSkillReadCalls,
      completeness: (["toolCalls", "toolErrors"] as const).some(
        (key) =>
          tree.metricCompleteness[key] === "may-undercount-by-skipped-lines",
      )
        ? "may-undercount-by-skipped-lines"
        : "complete",
    };

    const routingSupporting: EvidenceId[] = [];
    addClaimValueEvidence(
      "routing-order",
      routingValues,
      routingSupporting,
      evidence,
    );

    claims.push({
      id: computeClaimId("routing-order", scope, routingSupporting),
      type: "observation",
      template: "routing-order",
      values: routingValues,
      scope,
      denominator: {
        count: tree.assistantTurns,
        unit: "assistant turns",
      },
      coverage: overallCoverage,
      supporting: routingSupporting,
      contradicting: [],
      basedOn: [],
    });
  }

  if (lookups !== null) {
    for (const tool of lookups.tools) {
      evidence[`agg:lookups:${tool.tool}:calls`] = {
        kind: "aggregate",
        value: tool.calls,
      };
      evidence[`agg:lookups:${tool.tool}:noMatchCalls`] = {
        kind: "aggregate",
        value: tool.noMatchCalls,
      };
      evidence[`agg:lookups:${tool.tool}:errorCalls`] = {
        kind: "aggregate",
        value: tool.errorCalls,
      };
      evidence[`agg:lookups:${tool.tool}:bodiesReturned`] = {
        kind: "aggregate",
        value: tool.bodiesReturned,
      };
      evidence[`agg:lookups:${tool.tool}:reusedBodies`] = {
        kind: "aggregate",
        value: tool.reusedBodies,
      };
    }
    for (const skill of lookups.skills) {
      evidence[`agg:lookups:skill:${skill.id}:returns`] = {
        kind: "aggregate",
        value: skill.returns,
      };
    }

    const totalCalls = lookups.tools.reduce((sum, t) => sum + t.calls, 0);
    if (totalCalls > 0) {
      const filesTool = lookups.tools.find(
        (t) => t.tool === "load_skills_for_files",
      );
      const keywordsTool = lookups.tools.find(
        (t) => t.tool === "load_skills_for_keywords",
      );
      const getSkillTool = lookups.tools.find((t) => t.tool === "get_skill");
      const workflowTool = lookups.tools.find((t) => t.tool === "get_workflow");
      const guideTool = lookups.tools.find(
        (t) => t.tool === "get_category_guide",
      );

      const lookupsValues: Record<string, number | string> = {
        calls: totalCalls,
        noMatchCalls: lookups.tools.reduce((sum, t) => sum + t.noMatchCalls, 0),
        errorCalls: lookups.tools.reduce((sum, t) => sum + t.errorCalls, 0),
        bodiesReturned: lookups.tools.reduce(
          (sum, t) => sum + t.bodiesReturned,
          0,
        ),
        reusedBodies: lookups.tools.reduce((sum, t) => sum + t.reusedBodies, 0),
        distinctSkills: lookups.distinctSkills,
        mainCalls: lookups.tools.reduce((sum, t) => sum + t.mainCalls, 0),
        workerCalls: lookups.tools.reduce((sum, t) => sum + t.workerCalls, 0),
        filesCalls: filesTool?.calls ?? 0,
        filesNoMatch: filesTool?.noMatchCalls ?? 0,
        keywordsCalls: keywordsTool?.calls ?? 0,
        keywordsNoMatch: keywordsTool?.noMatchCalls ?? 0,
        nameCalls: getSkillTool?.calls ?? 0,
        nameNoMatch: getSkillTool?.noMatchCalls ?? 0,
        workflowCalls: workflowTool?.calls ?? 0,
        guideCalls: guideTool?.calls ?? 0,
        completeness:
          tree &&
          (["toolCalls", "toolErrors"] as const).some(
            (key) =>
              tree.metricCompleteness[key] ===
              "may-undercount-by-skipped-lines",
          )
            ? "may-undercount-by-skipped-lines"
            : "complete",
      };

      const lookupsSupporting: EvidenceId[] = [];
      addClaimValueEvidence(
        "ags-lookups",
        lookupsValues,
        lookupsSupporting,
        evidence,
      );

      claims.push({
        id: computeClaimId("ags-lookups", scope, lookupsSupporting),
        type: "observation",
        template: "ags-lookups",
        values: lookupsValues,
        scope,
        denominator: { count: totalCalls, unit: "lookups" },
        coverage: overallCoverage,
        supporting: lookupsSupporting,
        contradicting: [],
        basedOn: [],
      });
    }
  }

  const skillUsageClaim = claims.find((c) => c.template === "skill-usage");
  const trackerWindow =
    skillUsageClaim !== undefined &&
    (skillUsageClaim.values.trackerWindow === "matches-session" ||
      skillUsageClaim.values.trackerWindow === "process-only")
      ? skillUsageClaim.values.trackerWindow
      : null;

  const improvementInput: ImprovementInput = {
    claims: claims.map((c) => ({
      id: c.id,
      template: c.template,
      values: c.values,
    })),
    agents: agents.map((a) => ({
      label: a.label,
      turns: a.turns,
      errorStops: a.errorStops,
    })),
    agentsCreated,
    unlinkedAgents,
    trackerWindow,
  };

  const improvements = deriveImprovements(improvementInput);

  addCellEvidence(cells, evidence);

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
    session,
    evidenceMode: input.evidenceMode,
    rootVerification: input.rootVerification,
    coverage: overallCoverage,
    counts,
    folder,
    lookups,
    skillUsage,
    hostSkills,
    cells,
    agents,
    otherAgents,
    improvements,
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

  if (Array.isArray(ledger.improvements)) {
    for (const imp of ledger.improvements) {
      for (const evId of imp.evidence) {
        if (ledger.evidence[evId] === undefined) {
          problems.add("DANGLING_EVIDENCE");
        }
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
      claim.template === "host-skill-reads" ||
      claim.template === "tool-errors" ||
      claim.template === "permission-answers" ||
      claim.template === "cost-drivers" ||
      claim.template === "routing-order" ||
      claim.template === "ags-lookups"
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
        } else if (key === "topCell" || key === "busiestCell") {
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
        } else if (key === "topErrorTools") {
          if (!SAFE_TOP_ERROR_TOOLS_REGEX.test(val)) {
            problems.add("UNSAFE_VALUE");
          }
        } else {
          if (!SAFE_MODEL_REGEX.test(val)) {
            problems.add("UNSAFE_VALUE");
          }
        }
      }
    }
  }

  // Every numeric claim value must resolve to its own aggregate evidence entry
  // with the same number, and the claim's supporting list must name it.
  for (const claim of ledger.claims) {
    for (const [key, val] of Object.entries(claim.values)) {
      if (typeof val !== "number") continue;
      const evId = `agg:claim:${claim.template}:${key}`;
      const entry = ledger.evidence[evId];
      if (entry === undefined || !claim.supporting.includes(evId)) {
        problems.add("DANGLING_EVIDENCE");
        continue;
      }
      if (entry.value !== val) {
        problems.add("NUMBER_MISMATCH");
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

  if (ledger.session !== deriveSessionLabel(input.mainSessionId)) {
    problems.add("NUMBER_MISMATCH");
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

  const rawCells: unknown = ledger.cells;
  if (!Array.isArray(rawCells)) {
    problems.add("NUMBER_MISMATCH");
  } else {
    const storedCells = rawCells as LedgerCell[];
    for (const cell of storedCells) {
      if (typeof cell?.key !== "string") {
        problems.add("UNSAFE_VALUE");
        continue;
      }
      if (sanitizeCellKey(cell.key) !== cell.key) {
        problems.add("UNSAFE_VALUE");
      }
    }
    if (JSON.stringify(storedCells) !== JSON.stringify(expected.cells)) {
      problems.add("NUMBER_MISMATCH");
    }
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
  if (JSON.stringify(ledger.agents) !== JSON.stringify(expected.agents)) {
    problems.add("NUMBER_MISMATCH");
  }

  if (
    JSON.stringify(ledger.otherAgents) !== JSON.stringify(expected.otherAgents)
  ) {
    problems.add("NUMBER_MISMATCH");
  }

  if (
    JSON.stringify(ledger.improvements) !==
    JSON.stringify(expected.improvements)
  ) {
    problems.add("NUMBER_MISMATCH");
  }

  const SAFE_FOLDER_LABEL_REGEX = /^[A-Za-z0-9._ -]{1,64}$/;

  if (ledger.folder !== null && typeof ledger.folder === "object") {
    if (
      typeof ledger.folder.name !== "string" ||
      !SAFE_FOLDER_LABEL_REGEX.test(ledger.folder.name) ||
      (ledger.folder.parent !== null &&
        (typeof ledger.folder.parent !== "string" ||
          !SAFE_FOLDER_LABEL_REGEX.test(ledger.folder.parent)))
    ) {
      problems.add("UNSAFE_VALUE");
    }
  }

  if (JSON.stringify(ledger.folder) !== JSON.stringify(expected.folder)) {
    problems.add("NUMBER_MISMATCH");
  }

  if (ledger.lookups !== null && typeof ledger.lookups === "object") {
    if (Array.isArray(ledger.lookups.skills)) {
      for (const skill of ledger.lookups.skills) {
        if (
          typeof skill?.id !== "string" ||
          !SAFE_SKILL_ID_REGEX.test(skill.id)
        ) {
          problems.add("UNSAFE_VALUE");
        }
      }
    }
  }

  if (JSON.stringify(ledger.lookups) !== JSON.stringify(expected.lookups)) {
    problems.add("NUMBER_MISMATCH");
  }

  if (problems.size === 0) {
    return { ok: true };
  }
  return {
    ok: false,
    problems: Array.from(problems).sort() as LedgerProblemCode[],
  };
}
