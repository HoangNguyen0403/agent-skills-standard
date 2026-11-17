import type { DecisionInput } from "./decision-contract";
import { sanitizeDecisionLabel } from "./decision-contract";
import { IMPROVEMENT_THRESHOLDS } from "./improvements";
import { constants } from "node:fs";
import { open } from "node:fs/promises";
import type { ReadSource } from "./read-source";
import crypto from "node:crypto";
import { DEFAULT_LIMITS, type NodeKey } from "./contracts";
import { RetrospectiveError } from "./errors";
import {
  SERVER_HOUSEKEEPING_TOOLS,
  SKILL_LOAD_TOOLS,
  extractDecisionArgs,
  extractHostSkillId,
  extractServerToolName,
} from "./server-tools";
import { parseLookupResult } from "./lookup-results";
import { deduplicatePermissionEvents } from "./permission-friction";
import {
  parsePermissionRequestMessage,
  permissionActorKey,
  permissionRequestIdentity,
} from "./permission-requests";
const SOURCE_READ_CHUNK_BYTES = 64 * 1024;
const MAX_FAILURE_TRACKED_TOOLS = 10_000;
const MAX_NODE_DECISIONS = 500;
const MAX_TREE_DECISIONS = 200;

function retainPrioritizedDecision<
  T extends {
    at: string;
    basis: "rule" | "default-pending-review";
    impact: "high" | "medium" | "low";
  },
>(items: T[], candidate: T, limit: number): void {
  const impactRank = { high: 0, medium: 1, low: 2 } as const;
  const compare = (left: T, right: T): number => {
    const leftPending = left.basis === "default-pending-review";
    const rightPending = right.basis === "default-pending-review";
    if (leftPending !== rightPending) return leftPending ? -1 : 1;
    const impactOrder = impactRank[left.impact] - impactRank[right.impact];
    if (impactOrder !== 0) return impactOrder;
    return left.at.localeCompare(right.at);
  };
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (compare(items[middle], candidate) <= 0) low = middle + 1;
    else high = middle;
  }
  if (low >= limit && items.length >= limit) return;
  items.splice(low, 0, candidate);
  if (items.length > limit) items.pop();
}


export const LOOKUP_TOOLS = [
  "load_skills_for_files",
  "load_skills_for_keywords",
  "get_skill",
  "get_workflow",
  "get_category_guide",
] as const;

export type LookupToolName = (typeof LOOKUP_TOOLS)[number];

export type LookupToolStats = {
  calls: number;
  noMatchCalls: number;
  errorCalls: number;
  bodiesReturned: number;
  reusedBodies: number;
};

export type LookupStats = {
  tools: Record<LookupToolName, LookupToolStats>; // all five keys always present
  skills: Record<string, number>; // validated registry id -> bodies DELIVERED (reused excluded); at most 100 keys
  skillsCapped: boolean; // a delivered body's id was dropped because 100 keys existed
  otherReturns: number; // delivered bodies whose id was dropped by the cap
  unvalidatedReturns: number; // delivered bodies whose marker id failed validation
};

export type FolderLabel = { name: string; parent: string | null };

export function createEmptyLookupStats(): LookupStats {
  return {
    tools: {
      load_skills_for_files: {
        calls: 0,
        noMatchCalls: 0,
        errorCalls: 0,
        bodiesReturned: 0,
        reusedBodies: 0,
      },
      load_skills_for_keywords: {
        calls: 0,
        noMatchCalls: 0,
        errorCalls: 0,
        bodiesReturned: 0,
        reusedBodies: 0,
      },
      get_skill: {
        calls: 0,
        noMatchCalls: 0,
        errorCalls: 0,
        bodiesReturned: 0,
        reusedBodies: 0,
      },
      get_workflow: {
        calls: 0,
        noMatchCalls: 0,
        errorCalls: 0,
        bodiesReturned: 0,
        reusedBodies: 0,
      },
      get_category_guide: {
        calls: 0,
        noMatchCalls: 0,
        errorCalls: 0,
        bodiesReturned: 0,
        reusedBodies: 0,
      },
    },
    skills: {},
    skillsCapped: false,
    otherReturns: 0,
    unvalidatedReturns: 0,
  };
}

export function cloneLookupStats(stats: LookupStats): LookupStats {
  return {
    tools: {
      load_skills_for_files: { ...stats.tools.load_skills_for_files },
      load_skills_for_keywords: { ...stats.tools.load_skills_for_keywords },
      get_skill: { ...stats.tools.get_skill },
      get_workflow: { ...stats.tools.get_workflow },
      get_category_guide: { ...stats.tools.get_category_guide },
    },
    skills: { ...stats.skills },
    skillsCapped: stats.skillsCapped,
    otherReturns: stats.otherReturns,
    unvalidatedReturns: stats.unvalidatedReturns,
  };
}

/**
 * Derives bounded folder labels from session cwd per Contract v3.1 Section 0:
 * Keeps ONLY the last path segment (`name`) and the one before it (`parent`).
 * Split on `/` and `\`. A label is kept when it matches `/^[A-Za-z0-9._ -]{1,64}$/`;
 * otherwise it becomes `folder-<first 8 hex of sha256(label)>`. Never stores the full path.
 */
export function folderLabel(cwd: unknown): FolderLabel | null {
  if (typeof cwd !== "string") {
    return null;
  }
  const segments = cwd.split(/[/\\]+/).filter((s) => s.length > 0);
  if (segments.length === 0) {
    return null;
  }
  const nameRaw = segments[segments.length - 1];
  const parentRaw = segments.length >= 2 ? segments[segments.length - 2] : null;

  const sanitize = (label: string): string => {
    if (/^[A-Za-z0-9._ -]{1,64}$/.test(label)) {
      return label;
    }
    const hash = crypto
      .createHash("sha256")
      .update(label)
      .digest("hex")
      .slice(0, 8);
    return `folder-${hash}`;
  };

  return {
    name: sanitize(nameRaw),
    parent: parentRaw !== null ? sanitize(parentRaw) : null,
  };
}
export { RetrospectiveError };

export type SideCalls = {
  calls: number;
  stopReasons: Record<string, number>;
  cost: number;
  costKnownCalls: number;
};

/**
 * Skill-load accounting for one session: did the agent load project rules from
 * this MCP server, and how much work preceded the first load?
 */
export type SessionSkillLoad = {
  /** False for formats whose server tool names cannot be read (codex). */
  measured: boolean;
  /** Calls whose server tool is in `SKILL_LOAD_TOOLS`. */
  skillLoadCalls: number;
  /** Tool calls seen before the first skill-load call; null when there was none. */
  callsBeforeFirstSkillLoad: number | null;
  /** `read skill://...` calls that yielded a skill id. */
  hostSkillReadCalls: number;
  /**
   * Non-housekeeping tool calls seen before the first skill access by either
   * route (a server skill-load tool or a host `skill://` read); null when there
   * was none.
   */
  callsBeforeFirstSkillAccess: number | null;
};

/** Per-node skill-load shape carried by `TreeAggregate.skillLoad`. */
export type NodeSkillLoad = {
  ordinal: number;
  isMain: boolean;
  measured: boolean;
  skillLoadCalls: number;
  callsBeforeFirstSkillLoad: number | null;
  hostSkillReadCalls: number;
  callsBeforeFirstSkillAccess: number | null;
};
export type PermissionAnswers = {
  allow: number;
  deny: number;
  other: number;
  /** key = agentId first 8 chars when /^[A-Za-z0-9-]{8,128}$/.test(id) else `target-<sha256(id) first 8 hex>`; at most 20 keys. */
  byTarget: Record<string, number>;
  /** answers whose target key could not be added because 20 keys exist (still counted in allow/deny/other). */
  untrackedTargets: number;
};
export type PermissionRequestTally = {
  asked: number;
  allow: number;
  deny: number;
  other: number;
  unanswered: number;
};
export type PermissionCommandEntry = {
  text: string;
  tool: string;
  kind: string;
  tally: PermissionRequestTally;
};

export type PermissionRequestStats = {
  asked: number;
  answered: number;
  answeredWithoutRequest: number;
  agentsAsked: number;
  tools: Record<string, PermissionRequestTally>;
  programs: Record<string, PermissionRequestTally>;
  commands: Record<string, PermissionCommandEntry>;
  commandsOmitted: number;
};

/**
 * One observed permission request or answer with its internal join key and
 * structured timing. `requestKey` joins every observation of the same
 * actor+request, including a request seen in one session node and its answer in
 * another. `actorKey` and `requestKey` are internal dedup support and are never
 * emitted in a friction summary. No command text, prompt or path is carried
 * here; those stay in `PermissionRequestStats`.
 */
export type PermissionRequestEvent = {
  /** sha256(actorKey + "\u0000" + requestId) prefix; internal dedup key only. */
  requestKey: string;
  /** Full-id-derived or observation-scoped actor key; internal only. */
  actorKey: string;
  /** False for an answer observation whose request was not seen in its node. */
  observedRequest: boolean;
  tool: string;
  program: string | null;
  kind: string;
  /** Epoch millis of the notification row, or null when no supported timestamp exists. */
  requestedAtMs: number | null;
  /** Epoch millis of the row carrying an answer record, or null. */
  answeredAtMs: number | null;
  verdict: "allow" | "deny" | "other" | null;
};

export function createEmptyPermissionRequestStats(): PermissionRequestStats {
  return {
    asked: 0,
    answered: 0,
    answeredWithoutRequest: 0,
    agentsAsked: 0,
    tools: {},
    programs: {},
    commands: {},
    commandsOmitted: 0,
  };
}

export function clonePermissionRequestStats(
  stats: PermissionRequestStats,
): PermissionRequestStats {
  const tools: Record<string, PermissionRequestTally> = {};
  for (const [k, v] of Object.entries(stats.tools)) {
    tools[k] = { ...v };
  }
  const programs: Record<string, PermissionRequestTally> = {};
  for (const [k, v] of Object.entries(stats.programs)) {
    programs[k] = { ...v };
  }
  const commands: Record<string, PermissionCommandEntry> = {};
  for (const [k, v] of Object.entries(stats.commands)) {
    commands[k] = {
      text: v.text,
      tool: v.tool,
      kind: v.kind,
      tally: { ...v.tally },
    };
  }
  return {
    asked: stats.asked,
    answered: stats.answered,
    answeredWithoutRequest: stats.answeredWithoutRequest,
    agentsAsked: stats.agentsAsked,
    tools,
    programs,
    commands,
    commandsOmitted: stats.commandsOmitted,
  };
}

export type ContextStats = {
  /** max over assistant turns of usage.cacheRead (cacheRead ?? cachedInput) */
  maxCacheRead: number;
  /** assistant turns that directly follow a compaction row (first assistant turn after each compaction) */
  postCompactionTurns: number;
  /** sum of cacheRead over those turns */
  postCompactionCacheReadSum: number;
};

export type RoutingOrder = {
  /** assistant tool calls named `edit`, plus `write` calls whose extractServerToolName(...) is null (a file write, not an xd:// device call) */
  editEpisodes: number;
  /** edit episodes with NO `load_skills_for_files` server-tool call by this same node since its start or since its last compaction row */
  unguardedEditEpisodes: number;
};

export type SessionAggregate = {
  node: NodeKey;
  format: "omp" | "codex";
  cwdRaw: string | null;
  first: string | null;
  last: string | null;
  assistantTurns: number;
  userMessages: number;
  compactions: number;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  cost: number;
  costKnownTurns: number;
  costUnknownTurns: number;
  models: Record<string, number>;
  stopReasons: Record<string, number>;
  sideCalls: SideCalls;
  toolCalls: Record<string, number>;
  toolErrors: Record<string, number>;
  /** Bounded map: server tool name -> calls. */
  serverToolCalls: Record<string, number>;
  /** Bounded map: host skill id -> `read skill://` calls. */
  hostSkillReads: Record<string, number>;
  skillLoad: SessionSkillLoad;
  permissionAnswers: PermissionAnswers;
  permissionRequests: PermissionRequestStats;
  /**
   * Bounded event-level permission records (see `PermissionRequestEvent`).
   * Optional so older fixtures and Codex-shaped aggregates stay valid; absent
   * means no event capture, which friction reporting treats as partial.
   */
  permissionRequestEvents?: PermissionRequestEvent[];
  /**
   * Whether this format's permission ingress is measured at all. A zero count
   * is only a measured zero when this is "captured".
   */
  permissionCapture?: "captured" | "unsupported";
  activity?: {
    steering: number;
    permissionNotifications: number;
    byAttribution: Record<string, number>;
  };
  failureRuns?: Record<string, { runs: number; longest: number }>;
  failureRunsTruncated?: boolean;
  idleGaps?: number[];
  permissionLatencySeconds?: number[];
  decisions?: {
    accepted: Array<{
      at: string;
      agent?: string;
      nodeOrdinal?: number;
      basis: "rule" | "default-pending-review";
      impact: "high" | "medium" | "low";
      reversible: boolean;
      ruleRef: string | null;
      label: string;
    }>;
    total: number;
    byBasis: { rule: number; defaultPendingReview: number };
    byImpact: {
      high: { rule: number; defaultPendingReview: number };
      medium: { rule: number; defaultPendingReview: number };
      low: { rule: number; defaultPendingReview: number };
    };
    ruleRefs: Record<string, number>;
    irreversible: number;
    otherRuleRefs: number;
    rejected: number;
    unconfirmed: number;
  };
  context: ContextStats;
  routing: RoutingOrder;
  lookups: LookupStats;
  folder: FolderLabel | null;
  coverage: "complete" | "partial";
  partialReason?:
    | "size-ceiling"
    | "time-ceiling"
    | "unreadable-lines"
    | "unknown-time-exclusions";
  skippedLines: number;
};

export type SourceSnapshot = {
  node: NodeKey;
  bytesCaptured: number;
  prefixDigest: string;
  parserVersion: string;
};

export type JointSeries = {
  byDayModel: Record<
    string,
    {
      turns: number;
      errorStops: number;
      costUnits: number;
      costKnownTurns: number;
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
    }
  >;
};

export type MetricCompleteness = Record<
  string,
  "complete" | "may-undercount-by-skipped-lines"
>;

export type AggregateLimits = {
  maxBytes: number;
  maxMillis: number;
  /**
   * Optional inclusive upper bound (epoch millis). Rows carrying a parseable
   * row timestamp after it are excluded before any aggregation; activity rows
   * without one are omitted as unknown rather than assumed inside the window.
   */
  cutoffMs?: number;
};

export type NodeUsage = {
  ordinal: number; // index in the rollUp input array; 0 = main
  turns: number;
  cost: number;
  costKnownTurns: number;
  compactions: number;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  errorStops: number; // stopReasons.error ?? 0
  abortedStops: number; // stopReasons.aborted ?? 0
  toolCalls: number; // sum of toolCalls map
  toolErrors: number; // sum of toolErrors map
  toolCallsByName: Record<string, number>; // copy of the bounded map
  serverToolCalls: Record<string, number>;
  models: Record<string, number>;
  permissionAnswers: PermissionAnswers;
  permissionRequests: PermissionRequestStats;
  /** Event-level permission records for this node; absent when none were captured. */
  permissionRequestEvents?: PermissionRequestEvent[];
  /** Permission ingress support for this node; absent on older captures. */
  permissionCapture?: "captured" | "unsupported";
  context: ContextStats;
  routing: RoutingOrder;
  lookups: LookupStats;
  skillLoadCalls: number; // node.skillLoad.skillLoadCalls (0 when not measured)
  first: string | null;
  last: string | null;
  activity?: {
    userRows: number;
    steering: number;
    permissionNotifications: number;
    byAttribution: Record<string, number>;
  };
  failureRuns?: Record<string, { runs: number; longest: number }>;
  failureRunsTruncated?: boolean;
  idleGaps?: number[];
  permissionLatencySeconds?: number[];
  decisions?: NonNullable<SessionAggregate["decisions"]>;
};

export type TreeAggregate = {
  sessions: number;
  fullyRead: number;
  coverage: "complete" | "partial";
  partialReason?:
    | "size-ceiling"
    | "time-ceiling"
    | "unreadable-lines"
    | "unknown-time-exclusions";
  first: string | null;
  last: string | null;
  assistantTurns: number;
  userMessages: number;
  compactions: number;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  cost: number;
  costKnownTurns: number;
  costUnknownTurns: number;
  models: Record<string, number>;
  stopReasons: Record<string, number>;
  // Optional so out-of-scope TreeAggregate fixtures keep compiling; rollUp always emits it.
  sideCalls?: SideCalls;
  toolCalls: Record<string, number>;
  toolErrors: Record<string, number>;
  /** Summed across nodes. */
  serverToolCalls: Record<string, number>;
  /** Summed key-wise across nodes. */
  hostSkillReads: Record<string, number>;
  /** Nodes in input order (index 0 is the main session), capped. */
  skillLoad: { nodes: NodeSkillLoad[]; omittedNodes: number };
  /** Nodes in input order, capped at 64 entries. */
  nodes: NodeUsage[];
  folder: FolderLabel | null;
  skippedLines: number;
  metricCompleteness: MetricCompleteness;
  series: JointSeries;
  activity?: {
    userRows: { total: number; steering: number; permissionNotifications: number; byAttribution: Record<string, number> };
    stopReasons: Record<string, number>;
  };
  failureRuns?: Record<string, { runs: number; longest: number; agentOrdinal?: number; agent?: string }>;
  failureRunsTruncated?: boolean;
  idleGaps?: number[];
  permissionLatencySeconds?: number[];
  decisions?: NonNullable<SessionAggregate["decisions"]>;
};

/** One session aggregate plus the joint series and per-metric completeness rollUp consumes. */
export type AggregatedSession = SessionAggregate & {
  series: JointSeries;
  metricCompleteness: MetricCompleteness;
};

/** A completed aggregate pass: the session aggregate, its joint series and its snapshot. */
export type AggregatedSessionResult = AggregatedSession & {
  snapshot: SourceSnapshot;
};

export const AGGREGATE_PARSER_VERSION = "1.0.0";

const READ_FLAGS =
  constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
const MAX_IDENTIFIER_LENGTH = 128;
const MAX_MAP_KEYS = 256;
// Bounded per-node skill-load rows in a tree aggregate; extras are only counted.
const MAX_SKILL_LOAD_NODES = 256;
export const MAX_TREE_NODES = 64;
const VALID_TARGET_ID = /^[A-Za-z0-9-]{8,128}$/;
const MAX_PERMISSION_TARGET_KEYS = 20;
const MAX_REQUEST_VERDICTS_CAP = 20_000;
// Event-level records kept per node; beyond this the node reports partial friction.
const MAX_PERMISSION_EVENTS = 1_000;
const MAX_DISTINCT_AGENTS_CAP = 500;
const MAX_TOOL_TALLY_KEYS = 20;
const MAX_PROGRAM_TALLY_KEYS = 60;
const MAX_COMMAND_TALLY_KEYS = 200;
function recordPermissionTally(
  map: Record<string, PermissionRequestTally>,
  rawKey: string,
  verdict: "allow" | "deny" | "other" | "unanswered",
  maxKeys: number,
): void {
  let targetKey = rawKey;
  if (!Object.hasOwn(map, targetKey)) {
    if (Object.keys(map).length >= maxKeys) {
      targetKey = "other";
    }
  }
  const entry = (map[targetKey] ??= {
    asked: 0,
    allow: 0,
    deny: 0,
    other: 0,
    unanswered: 0,
  });
  entry.asked += 1;
  entry[verdict] += 1;

  const keys = Object.keys(map);
  if (keys.length > maxKeys) {
    const nonOther = keys.filter((k) => k !== "other");
    const lastKey = nonOther[nonOther.length - 1];
    const lastEntry = map[lastKey];
    delete map[lastKey];
    const otherEntry = (map["other"] ??= {
      asked: 0,
      allow: 0,
      deny: 0,
      other: 0,
      unanswered: 0,
    });
    otherEntry.asked += lastEntry.asked;
    otherEntry.allow += lastEntry.allow;
    otherEntry.deny += lastEntry.deny;
    otherEntry.other += lastEntry.other;
    otherEntry.unanswered += lastEntry.unanswered;
  }
}

function buildPermissionRequestStats(
  requests: Map<
    string,
    {
      tool: string;
      program: string | null;
      agent: string;
      kind: string;
      command: string | null;
    }
  >,
  verdicts: Map<
    string,
    { verdict: "allow" | "deny" | "other"; answeredAtMs: number | null }
  >,
): PermissionRequestStats {
  const tools: Record<string, PermissionRequestTally> = {};
  const programs: Record<string, PermissionRequestTally> = {};
  const commands: Record<string, PermissionCommandEntry> = {};
  let commandsOmitted = 0;
  let commandKeysCount = 0;

  let answered = 0;
  const distinctAgents = new Set<string>();

  for (const [reqId, req] of requests.entries()) {
    if (distinctAgents.size < MAX_DISTINCT_AGENTS_CAP) {
      distinctAgents.add(req.agent);
    }
    const verdict = verdicts.get(reqId);
    let verdictKey: "allow" | "deny" | "other" | "unanswered";
    if (verdict !== undefined) {
      answered += 1;
      verdictKey = verdict.verdict;
    } else {
      verdictKey = "unanswered";
    }

    recordPermissionTally(tools, req.tool, verdictKey, MAX_TOOL_TALLY_KEYS);
    if (req.program !== null) {
      recordPermissionTally(
        programs,
        req.program,
        verdictKey,
        MAX_PROGRAM_TALLY_KEYS,
      );
    }

    if (req.command === null) {
      commandsOmitted += 1;
    } else {
      const hashInput = `${req.tool}\n${req.kind}\n${req.command}`;
      const cmdKey = crypto
        .createHash("sha256")
        .update(hashInput)
        .digest("hex")
        .slice(0, 16);

      const existing = commands[cmdKey];
      if (existing !== undefined) {
        existing.tally.asked += 1;
        existing.tally[verdictKey] += 1;
      } else if (commandKeysCount < MAX_COMMAND_TALLY_KEYS) {
        commandKeysCount += 1;
        commands[cmdKey] = {
          text: req.command,
          tool: req.tool,
          kind: req.kind,
          tally: {
            asked: 1,
            allow: verdictKey === "allow" ? 1 : 0,
            deny: verdictKey === "deny" ? 1 : 0,
            other: verdictKey === "other" ? 1 : 0,
            unanswered: verdictKey === "unanswered" ? 1 : 0,
          },
        };
      } else {
        commandsOmitted += 1;
      }
    }
  }

  let answeredWithoutRequest = 0;
  for (const reqId of verdicts.keys()) {
    if (!requests.has(reqId)) {
      answeredWithoutRequest += 1;
    }
  }

  return {
    asked: requests.size,
    answered,
    answeredWithoutRequest,
    agentsAsked: distinctAgents.size,
    tools,
    programs,
    commands,
    commandsOmitted,
  };
}

function derivePermissionTargetKey(rawId: unknown): string {
  if (typeof rawId === "string" && VALID_TARGET_ID.test(rawId)) {
    return rawId.slice(0, 8);
  }
  const idStr = typeof rawId === "string" ? rawId : "";
  const digest = crypto
    .createHash("sha256")
    .update(idStr)
    .digest("hex")
    .slice(0, 8);
  return `target-${digest}`;
}

function recordPermissionTarget(
  permissionAnswers: PermissionAnswers,
  targetKey: string,
): void {
  if (Object.hasOwn(permissionAnswers.byTarget, targetKey)) {
    permissionAnswers.byTarget[targetKey] += 1;
  } else if (
    Object.keys(permissionAnswers.byTarget).length < MAX_PERMISSION_TARGET_KEYS
  ) {
    permissionAnswers.byTarget[targetKey] = 1;
  } else {
    permissionAnswers.untrackedTargets += 1;
  }
}

function isEditEpisodeCall(
  name: unknown,
  args: unknown,
  serverTool: string | null,
): boolean {
  if (name === "edit") {
    return true;
  }
  if (name === "write") {
    if (serverTool !== null) {
      return false;
    }
    if (
      isObject(args) &&
      typeof args.path === "string" &&
      args.path.startsWith("xd://")
    ) {
      return false;
    }
    return true;
  }
  return false;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const LOOKUP_TOOLS_SET = new Set<string>(LOOKUP_TOOLS);

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    let result = "";
    for (const part of content) {
      if (
        isObject(part) &&
        part.type === "text" &&
        typeof part.text === "string"
      ) {
        result += part.text;
      }
    }
    return result;
  }
  return "";
}

function boundIdentifier(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "unknown";
  return value.slice(0, MAX_IDENTIFIER_LENGTH);
}

const MAX_EPOCH_MILLIS = 8_640_000_000_000_000;
// Values below this are treated as epoch seconds, at or above as epoch millis.
const EPOCH_MILLIS_THRESHOLD = 1e11;

function toEpochMillis(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    const millis =
      value >= EPOCH_MILLIS_THRESHOLD ? value : Math.round(value * 1000);
    if (!Number.isFinite(millis) || millis > MAX_EPOCH_MILLIS) return null;
    return millis;
  }
  if (typeof value === "string" && value) {
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) return null;
    if (parsed < 0 || parsed > MAX_EPOCH_MILLIS) return null;
    return parsed;
  }
  return null;
}

function extractDay(timestamp: unknown): string {
  const millis = toEpochMillis(timestamp);
  if (millis === null) return "unknown-day";
  return new Date(millis).toISOString().slice(0, 10);
}

// A turn's day comes from the row write time (ISO string) first: message.timestamp
// is often epoch millis for when the model started streaming, which can be another day.
function deriveTurnDay(
  rowTimestamp: unknown,
  messageTimestamp: unknown,
): string {
  const rowDay = extractDay(rowTimestamp);
  if (rowDay !== "unknown-day") return rowDay;
  return extractDay(messageTimestamp);
}

function recordBoundedMap(
  map: Record<string, number>,
  rawKey: string,
  increment = 1,
): void {
  const key = boundIdentifier(rawKey);
  if (Object.hasOwn(map, key)) {
    map[key] += increment;
    return;
  }
  if (Object.keys(map).length >= MAX_MAP_KEYS) {
    const other = (Object.hasOwn(map, "other") ? map.other : 0) + increment;
    Object.defineProperty(map, "other", {
      value: other,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    return;
  }
  Object.defineProperty(map, key, {
    value: increment,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

function recordJointEntry(
  series: JointSeries,
  day: string,
  model: string,
  turns: number,
  errorStops: number,
  costUnits: number,
  costKnownTurns: number,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
): void {
  const boundedDay =
    day === "unknown-day" ? "unknown-day" : boundIdentifier(day);
  const boundedModel =
    model === "unknown-model" ? "unknown-model" : boundIdentifier(model);
  const rawKey = `${boundedDay}|${boundedModel}`;
  let targetKey = rawKey;
  if (!Object.hasOwn(series.byDayModel, rawKey)) {
    if (Object.keys(series.byDayModel).length >= MAX_MAP_KEYS) {
      targetKey = "other";
    }
  }
  const entry = (series.byDayModel[targetKey] ??= {
    turns: 0,
    errorStops: 0,
    costUnits: 0,
    costKnownTurns: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
  });
  entry.turns += turns;
  entry.errorStops += errorStops;
  entry.costUnits += costUnits;
  entry.costKnownTurns += costKnownTurns;
  entry.inputTokens += inputTokens;
  entry.outputTokens += outputTokens;
  entry.cacheReadTokens += cacheReadTokens;
}
export type SourceLocation =
  | { absolutePath: string; handle?: never }
  | { handle: ReadSource; absolutePath?: never };

export async function captureSnapshot(
  source: { node: NodeKey } & SourceLocation,
  maxBytes: number,
): Promise<SourceSnapshot> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new RangeError("maxBytes must be a nonnegative integer");
  }
  const ownsHandle = source.absolutePath !== undefined;
  const handle =
    source.absolutePath !== undefined
      ? await open(source.absolutePath, READ_FLAGS)
      : source.handle;
  if (handle === undefined) {
    throw new RetrospectiveError("SOURCE_UNAVAILABLE", "Source handle is missing");
  }
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) {
      throw new RetrospectiveError(
        "SOURCE_UNAVAILABLE",
        "Source is not a regular file",
      );
    }
    const fileSize = Number(stats.size);
    const requestedBytes = Math.max(0, Math.min(fileSize, maxBytes));
    let bytesCaptured = 0;
    const hash = crypto.createHash("sha256");
    const buffer = Buffer.allocUnsafe(
      Math.min(SOURCE_READ_CHUNK_BYTES, requestedBytes),
    );

    while (bytesCaptured < requestedBytes) {
      const length = Math.min(buffer.length, requestedBytes - bytesCaptured);
      const { bytesRead } = await handle.read(buffer, 0, length, bytesCaptured);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
      bytesCaptured += bytesRead;
    }

    const prefixDigest = hash.digest("hex");
    return {
      node: { ...source.node },
      bytesCaptured,
      prefixDigest,
      parserVersion: AGGREGATE_PARSER_VERSION,
    };
  } finally {
    if (ownsHandle) await handle?.close().catch(() => undefined);
  }
}

export async function aggregateSession(
  source: {
    node: NodeKey;
    format: "omp" | "codex";
    expectedSessionId?: string;
  } & SourceLocation,
  snapshot: SourceSnapshot,
  limits: AggregateLimits,
  signal: AbortSignal,
): Promise<AggregatedSessionResult> {
  if (signal.aborted) {
    throw new RetrospectiveError("ABORTED", "Aggregate pass was aborted");
  }
  const cutoffMs = limits.cutoffMs;
  if (cutoffMs !== undefined && (!Number.isFinite(cutoffMs) || cutoffMs < 0)) {
    throw new RangeError("cutoffMs must be a nonnegative finite number");
  }

  let ownedHandle: ReadSource | undefined;
  try {
    const handle =
      source.absolutePath !== undefined
        ? (ownedHandle = await open(source.absolutePath, READ_FLAGS))
        : source.handle;
    if (handle === undefined) {
      throw new RetrospectiveError(
        "SOURCE_UNAVAILABLE",
        "Source handle is missing",
      );
    }
    if (signal.aborted) {
      throw new RetrospectiveError("ABORTED", "Aggregate pass was aborted");
    }

    const stats = await handle.stat();
    if (!stats.isFile()) {
      throw new RetrospectiveError(
        "SOURCE_UNAVAILABLE",
        "Source is not a regular file",
      );
    }
    const fileSize = Number(stats.size);
    const sizeCeiling =
      fileSize > snapshot.bytesCaptured || fileSize > limits.maxBytes;

    const startedAt = Date.now();
    let timeCeiling = Date.now() - startedAt >= limits.maxMillis;

    const hash = crypto.createHash("sha256");
    let first: string | null = null;
    let last: string | null = null;
    let firstMillis: number | null = null;
    let lastMillis: number | null = null;
    let assistantTurns = 0;
    let userMessages = 0;
    let compactions = 0;
    const tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    let cost = 0;
    let costKnownTurns = 0;
    let costUnknownTurns = 0;
    const models: Record<string, number> = {};
    const stopReasons: Record<string, number> = {};
    const sideCalls: SideCalls = {
      calls: 0,
      stopReasons: {},
      cost: 0,
      costKnownCalls: 0,
    };
    const toolCalls: Record<string, number> = {};
    const toolErrors: Record<string, number> = {};
    const serverToolCalls: Record<string, number> = {};
    const hostSkillReads: Record<string, number> = {};
    const skillLoad: SessionSkillLoad = {
      // Codex tool naming is unverified, so its counts are a declared non-measurement.
      measured: source.format === "omp",
      skillLoadCalls: 0,
      callsBeforeFirstSkillLoad: null,
      hostSkillReadCalls: 0,
      callsBeforeFirstSkillAccess: null,
    };
    // Non-housekeeping tool calls seen so far, in file order.
    let callsSeen = 0;
    let skippedLines = 0;
    let unknownTimeExclusions = false;
    const series: JointSeries = { byDayModel: {} };
    const permissionAnswers: PermissionAnswers = {
      allow: 0,
      deny: 0,
      other: 0,
      byTarget: {},
      untrackedTargets: 0,
    };
    const permissionScope = `${source.node.hostId}\u0000${source.node.sessionId}`;
    const permissionRequestsMap = new Map<
      string,
      {
        requestId: string;
        tool: string;
        program: string | null;
        agent: string;
        actorKey: string;
        kind: string;
        command: string | null;
        requestedAtMs: number | null;
      }
    >();
    const permissionVerdictsMap = new Map<
      string,
      {
        verdict: "allow" | "deny" | "other";
        answeredAtMs: number | null;
        actorKey: string;
      }
    >();
    const permissionLatencySeconds: number[] = [];
    const activity = {
      steering: 0,
      permissionNotifications: 0,
      byAttribution: {} as Record<string, number>,
    };
    const idleGaps: number[] = [];
    let priorRowMillis: number | null = null;
    const failureRuns = new Map<
      string,
      { runs: number; longest: number; streak: number }
    >();
    const pendingDecisions = new Map<string, {
      input: DecisionInput;
      at: string;
    }>();
    const completedDecisionIds = new Set<string>();
    const decisions: NonNullable<SessionAggregate["decisions"]> = {
      accepted: [],
      total: 0,
      byBasis: { rule: 0, defaultPendingReview: 0 },
      byImpact: {
        high: { rule: 0, defaultPendingReview: 0 },
        medium: { rule: 0, defaultPendingReview: 0 },
        low: { rule: 0, defaultPendingReview: 0 },
      },
      irreversible: 0,
      ruleRefs: Object.create(null) as Record<string, number>,
      otherRuleRefs: 0,
      rejected: 0,
      unconfirmed: 0,
    };
    const context: ContextStats = {
      maxCacheRead: 0,
      postCompactionTurns: 0,
      postCompactionCacheReadSum: 0,
    };
    const routing: RoutingOrder = {
      editEpisodes: 0,
      unguardedEditEpisodes: 0,
    };
    let filesLookupSeen = false;
    let afterCompaction = false;

    let expectedSessionHeaderSeen = false;
    let expectedSessionHeaderMismatch = false;
    let currentModel: string | undefined;
    // Codex turn accounting is a conservative assumption pending real Codex fixtures.
    let codexTurnOpen = false;
    let codexPreviousTotal: { input: number; output: number } | null = null;
    let codexLastOnlySinceTotal = { input: 0, output: 0 };
    const seenToolCallIds = new Set<string>();
    const lookups = createEmptyLookupStats();
    let folder: FolderLabel | null = null;
    let cwdRaw: string | null = null;
    const lookupCallTool = new Map<string, LookupToolName>();

    const updateTimestamps = (ts: unknown): void => {
      const millis = toEpochMillis(ts);
      if (millis === null) return;
      const iso = new Date(millis).toISOString();
      if (firstMillis === null || millis < firstMillis) {
        firstMillis = millis;
        first = iso;
      }
      if (lastMillis === null || millis > lastMillis) {
        lastMillis = millis;
        last = iso;
      }
    };

    let failureRunsTruncated = false;
    const recordFailureResult = (tool: string, isError: boolean): void => {
      let summary = failureRuns.get(tool);
      if (!isError) {
        if (summary) summary.streak = 0;
        return;
      }
      if (summary === undefined) {
        if (failureRuns.size >= MAX_FAILURE_TRACKED_TOOLS) {
          failureRunsTruncated = true;
          return;
        }
        summary = { runs: 0, longest: 0, streak: 0 };
        failureRuns.set(tool, summary);
      }
      summary.streak += 1;
      summary.longest = Math.max(summary.longest, summary.streak);
      if (summary.streak === IMPROVEMENT_THRESHOLDS.FAILURE_RUN_MIN_LENGTH) {
        summary.runs += 1;
      }
    };

    const recordDecisionCall = (
      name: unknown,
      args: unknown,
      id: unknown,
      at: string | null,
    ): void => {
      if (name !== "record_decision" && extractServerToolName(name, args) !== "record_decision") {
        return;
      }
      if (typeof id !== "string" || id.length === 0 || pendingDecisions.size >= 64) {
        decisions.rejected += 1;
        return;
      }
      if (completedDecisionIds.has(id) || pendingDecisions.has(id)) return;
      const input = extractDecisionArgs(name, args);
      if (input === null || at === null) {
        decisions.rejected += 1;
        return;
      }
      pendingDecisions.set(id, { input, at });
    };

    const finishDecisionCall = (
      id: unknown,
      isError: boolean,
      at: string | null,
    ): void => {
      if (typeof id !== "string") return;
      const pending = pendingDecisions.get(id);
      if (!pending || completedDecisionIds.has(id)) return;
      pendingDecisions.delete(id);
      completedDecisionIds.add(id);
      if (completedDecisionIds.size > 64) {
        const oldest = completedDecisionIds.values().next().value;
        if (oldest !== undefined) completedDecisionIds.delete(oldest);
      }
      if (isError || at === null) {
        decisions.rejected += 1;
        return;
      }
      const label = sanitizeDecisionLabel(pending.input.label);
      if (label.length === 0) {
        decisions.rejected += 1;
        return;
      }
      decisions.total += 1;
      const basisKey =
        pending.input.basis === "rule" ? "rule" : "defaultPendingReview";
      decisions.byBasis[basisKey] += 1;
      decisions.byImpact[pending.input.impact][basisKey] += 1;
      if (!pending.input.reversible) decisions.irreversible += 1;
      if (pending.input.ruleRef !== undefined) {
        if (
          Object.hasOwn(decisions.ruleRefs, pending.input.ruleRef) ||
          Object.keys(decisions.ruleRefs).length < 500
        ) {
          decisions.ruleRefs[pending.input.ruleRef] =
            (Object.hasOwn(decisions.ruleRefs, pending.input.ruleRef)
              ? decisions.ruleRefs[pending.input.ruleRef]
              : 0) + 1;
        } else {
          decisions.otherRuleRefs += 1;
        }
      }
      retainPrioritizedDecision(
        decisions.accepted,
        {
          at,
          basis: pending.input.basis,
          impact: pending.input.impact,
          reversible: pending.input.reversible,
          ruleRef: pending.input.ruleRef ?? null,
          label,
        },
        MAX_NODE_DECISIONS,
      );
    };

    const processOmpRow = (
      row: Record<string, unknown>,
      recordTimestamps: boolean,
    ): void => {
      if (recordTimestamps) updateTimestamps(row.timestamp);
      if (row.type === "session") {
        if (typeof row.cwd === "string") {
          folder = folderLabel(row.cwd);
          cwdRaw = row.cwd.length <= 1024 ? row.cwd : null;
        } else {
          cwdRaw = null;
        }
        return;
      }

      if (row.type === "model_change") {
        if (typeof row.model === "string") {
          currentModel = boundIdentifier(row.model);
        }
        return;
      }

      if (
        row.type === "compaction" ||
        row.type === "context_compaction" ||
        row.type === "compact"
      ) {
        compactions += 1;
        afterCompaction = true;
        filesLookupSeen = false;
        return;
      }

      if (row.type === "custom") {
        if (row.customType === "compaction") {
          compactions += 1;
          afterCompaction = true;
          filesLookupSeen = false;
          return;
        }
        if (row.customType === "tool_execution_start" && isObject(row.data)) {
          const toolName =
            typeof row.data.toolName === "string"
              ? boundIdentifier(row.data.toolName)
              : undefined;
          const toolCallId =
            typeof row.data.toolCallId === "string"
              ? row.data.toolCallId
              : undefined;
          if (toolName) {
            if (toolCallId) {
              if (!seenToolCallIds.has(toolCallId)) {
                seenToolCallIds.add(toolCallId);
                recordBoundedMap(toolCalls, toolName);
              }
            } else {
              recordBoundedMap(toolCalls, toolName);
            }
          }
        }
        return;
      }

      if (row.type === "model_usage") {
        // Side calls (memory, job-widget, find, cache-warm) are not assistant turns:
        // they carry their own usage/stopReason and must stay out of turn metrics.
        sideCalls.calls += 1;
        const usage = isObject(row.usage) ? row.usage : null;
        if (
          usage &&
          isObject(usage.cost) &&
          typeof usage.cost.total === "number" &&
          Number.isFinite(usage.cost.total) &&
          usage.cost.total >= 0
        ) {
          sideCalls.cost += usage.cost.total;
          sideCalls.costKnownCalls += 1;
        }
        if (typeof row.stopReason === "string") {
          recordBoundedMap(
            sideCalls.stopReasons,
            boundIdentifier(row.stopReason),
          );
        }
        return;
      }

      if (row.type === "message" && isObject(row.message)) {
        const msg = row.message;
        if (recordTimestamps) updateTimestamps(msg.timestamp);

        if (msg.role === "user") {
          userMessages += 1;
          if (msg.steering === true) activity.steering += 1;
          const rawAttribution = typeof msg.attribution === "string" ? msg.attribution : "other";
          const attribution = /^[a-z][a-z0-9_-]{0,31}$/.test(rawAttribution) ? rawAttribution : "other";
          recordBoundedMap(activity.byAttribution, attribution);
          const text = extractTextContent(msg.content);
          if (text.includes("permission-required")) {
            const parsed = parsePermissionRequestMessage(text);
            if (parsed !== null) {
              activity.permissionNotifications += 1;
              const actorKey =
                parsed.actorKey ??
                permissionActorKey(undefined, permissionScope);
              const identity = permissionRequestIdentity(
                actorKey,
                parsed.requestId,
              );
              if (
                permissionRequestsMap.size < MAX_REQUEST_VERDICTS_CAP ||
                permissionRequestsMap.has(identity)
              ) {
                const requestedAtMs =
                  toEpochMillis(msg.timestamp) ?? toEpochMillis(row.timestamp);
                const existing = permissionRequestsMap.get(identity);
                if (existing === undefined) {
                  permissionRequestsMap.set(identity, {
                    requestId: parsed.requestId,
                    tool: parsed.tool,
                    program: parsed.program,
                    agent: parsed.agent,
                    actorKey,
                    kind: parsed.kind,
                    command: parsed.command,
                    requestedAtMs,
                  });
                } else if (
                  requestedAtMs !== null &&
                  (existing.requestedAtMs === null ||
                    requestedAtMs < existing.requestedAtMs)
                ) {
                  existing.requestedAtMs = requestedAtMs;
                }
              }
            }
          }
          return;
        }

        if (msg.role === "compaction") {
          compactions += 1;
          afterCompaction = true;
          filesLookupSeen = false;
          return;
        }

        if (msg.role === "toolResult") {
          const toolName =
            typeof msg.toolName === "string"
              ? boundIdentifier(msg.toolName)
              : undefined;
          const toolCallId =
            typeof msg.toolCallId === "string" ? msg.toolCallId : undefined;
          if (toolName) {
            if (toolCallId) {
              if (!seenToolCallIds.has(toolCallId)) {
                seenToolCallIds.add(toolCallId);
                recordBoundedMap(toolCalls, toolName);
              }
            } else {
              recordBoundedMap(toolCalls, toolName);
            }
            if (msg.isError === true) {
              recordBoundedMap(toolErrors, toolName);
            }
          }
          if (toolName) {
            recordFailureResult(toolName, msg.isError === true);
          }
          const resultMillis = toEpochMillis(msg.timestamp ?? row.timestamp);
          finishDecisionCall(
            toolCallId,
            msg.isError === true,
            resultMillis === null ? null : new Date(resultMillis).toISOString(),
          );

          if (toolCallId && lookupCallTool.has(toolCallId)) {
            const lookupTool = lookupCallTool.get(toolCallId)!;
            lookupCallTool.delete(toolCallId);
            lookups.tools[lookupTool].calls += 1;
            if (msg.isError === true) {
              lookups.tools[lookupTool].errorCalls += 1;
            } else {
              const text = extractTextContent(msg.content);
              const parsed = parseLookupResult(lookupTool, text);
              if (parsed.noMatch) {
                lookups.tools[lookupTool].noMatchCalls += 1;
              }
              for (const body of parsed.bodies) {
                if (body.reused) {
                  lookups.tools[lookupTool].reusedBodies += 1;
                } else {
                  lookups.tools[lookupTool].bodiesReturned += 1;
                  if (body.id !== null) {
                    if (body.id in lookups.skills) {
                      lookups.skills[body.id] += 1;
                    } else if (Object.keys(lookups.skills).length < 100) {
                      lookups.skills[body.id] = 1;
                    } else {
                      lookups.skillsCapped = true;
                      lookups.otherReturns += 1;
                    }
                  } else {
                    lookups.unvalidatedReturns += 1;
                  }
                }
              }
              if (parsed.workflowBodies > 0) {
                lookups.tools[lookupTool].bodiesReturned +=
                  parsed.workflowBodies;
              }
            }
          }

          return;
        }

        if (msg.role === "assistant") {
          assistantTurns += 1;

          const modelName =
            typeof msg.model === "string"
              ? boundIdentifier(msg.model)
              : typeof row.model === "string"
                ? boundIdentifier(row.model)
                : (currentModel ?? "unknown-model");
          recordBoundedMap(models, modelName);

          const rawStopReason =
            typeof msg.stopReason === "string" ? msg.stopReason : undefined;
          const stopReason =
            rawStopReason === undefined
              ? undefined
              : /^[A-Za-z0-9._:-]{1,48}$/.test(rawStopReason)
                ? rawStopReason
                : "other";
          if (stopReason) {
            recordBoundedMap(stopReasons, stopReason);
          }

          let turnCost: number | null = null;
          let turnInp = 0;
          let turnOut = 0;
          let turnCr = 0;
          if (isObject(msg.usage)) {
            const inp =
              typeof msg.usage.input === "number" &&
              Number.isSafeInteger(msg.usage.input) &&
              msg.usage.input >= 0
                ? msg.usage.input
                : 0;
            const out =
              typeof msg.usage.output === "number" &&
              Number.isSafeInteger(msg.usage.output) &&
              msg.usage.output >= 0
                ? msg.usage.output
                : 0;
            const cr =
              typeof msg.usage.cacheRead === "number" &&
              Number.isSafeInteger(msg.usage.cacheRead) &&
              msg.usage.cacheRead >= 0
                ? msg.usage.cacheRead
                : typeof msg.usage.cachedInput === "number" &&
                    Number.isSafeInteger(msg.usage.cachedInput) &&
                    msg.usage.cachedInput >= 0
                  ? msg.usage.cachedInput
                  : 0;
            const cw =
              typeof msg.usage.cacheWrite === "number" &&
              Number.isSafeInteger(msg.usage.cacheWrite) &&
              msg.usage.cacheWrite >= 0
                ? msg.usage.cacheWrite
                : 0;

            tokens.input += inp;
            tokens.output += out;
            tokens.cacheRead += cr;
            tokens.cacheWrite += cw;
            turnInp = inp;
            turnOut = out;
            turnCr = cr;
            if (cr > context.maxCacheRead) {
              context.maxCacheRead = cr;
            }
            if (afterCompaction) {
              context.postCompactionTurns += 1;
              context.postCompactionCacheReadSum += cr;
              afterCompaction = false;
            }

            if (
              isObject(msg.usage.cost) &&
              typeof msg.usage.cost.total === "number" &&
              Number.isFinite(msg.usage.cost.total) &&
              msg.usage.cost.total >= 0
            ) {
              turnCost = msg.usage.cost.total;
              cost += turnCost;
              costKnownTurns += 1;
            } else {
              costUnknownTurns += 1;
            }
          } else {
            costUnknownTurns += 1;
          }

          const day = deriveTurnDay(row.timestamp, msg.timestamp);
          const errorStops = stopReason === "error" ? 1 : 0;
          recordJointEntry(
            series,
            day,
            modelName,
            1,
            errorStops,
            turnCost ?? 0,
            turnCost !== null ? 1 : 0,
            turnInp,
            turnOut,
            turnCr,
          );

          if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if (
                isObject(part) &&
                (part.type === "toolCall" || part.type === "tool_use")
              ) {
                const serverTool = extractServerToolName(
                  part.name,
                  part.arguments,
                );
                if (serverTool === "load_skills_for_files") {
                  filesLookupSeen = true;
                }
                if (serverTool !== null) {
                  recordBoundedMap(serverToolCalls, serverTool);
                }
                const isHousekeeping =
                  serverTool !== null &&
                  SERVER_HOUSEKEEPING_TOOLS.includes(serverTool);
                if (
                  serverTool !== null &&
                  SKILL_LOAD_TOOLS.includes(serverTool)
                ) {
                  skillLoad.skillLoadCalls += 1;
                  if (skillLoad.callsBeforeFirstSkillLoad === null) {
                    skillLoad.callsBeforeFirstSkillLoad = callsSeen;
                  }
                  if (skillLoad.callsBeforeFirstSkillAccess === null) {
                    skillLoad.callsBeforeFirstSkillAccess = callsSeen;
                  }
                }
                const hostSkillId = extractHostSkillId(
                  part.name,
                  part.arguments,
                );
                if (hostSkillId !== null) {
                  skillLoad.hostSkillReadCalls += 1;
                  recordBoundedMap(hostSkillReads, hostSkillId);
                  if (skillLoad.callsBeforeFirstSkillAccess === null) {
                    skillLoad.callsBeforeFirstSkillAccess = callsSeen;
                  }
                }
                if (!isHousekeeping) {
                  callsSeen += 1;
                }

                const toolName =
                  typeof part.name === "string"
                    ? boundIdentifier(part.name)
                    : typeof part.toolName === "string"
                      ? boundIdentifier(part.toolName)
                      : undefined;
                const toolCallId =
                  typeof part.id === "string"
                    ? part.id
                    : typeof part.toolCallId === "string"
                      ? part.toolCallId
                      : undefined;
                if (serverTool !== null && LOOKUP_TOOLS_SET.has(serverTool)) {
                  if (toolCallId) {
                    if (lookupCallTool.has(toolCallId)) {
                      lookupCallTool.delete(toolCallId);
                    }
                    lookupCallTool.set(
                      toolCallId,
                      serverTool as LookupToolName,
                    );
                    if (lookupCallTool.size > 64) {
                      const oldest = lookupCallTool.keys().next().value;
                      if (oldest !== undefined) {
                        lookupCallTool.delete(oldest);
                      }
                    }
                  }
                  // calls in lookups.tools counts RESULTS seen (a call without a result row is not counted).
                }

                const isNewToolCall = toolCallId
                  ? !seenToolCallIds.has(toolCallId)
                  : true;

                if (isNewToolCall) {
                  if (toolCallId) {
                    seenToolCallIds.add(toolCallId);
                  }
                  if (toolName) {
                    recordBoundedMap(toolCalls, toolName);
                  }

                  const callName =
                    typeof part.name === "string"
                      ? part.name
                      : typeof part.toolName === "string"
                        ? part.toolName
                        : undefined;
                  const decisionMillis = toEpochMillis(msg.timestamp ?? row.timestamp);
                  recordDecisionCall(
                    callName,
                    part.arguments,
                    toolCallId,
                    decisionMillis === null ? null : new Date(decisionMillis).toISOString(),
                  );

                  if (isEditEpisodeCall(callName, part.arguments, serverTool)) {
                    routing.editEpisodes += 1;
                    if (!filesLookupSeen) {
                      routing.unguardedEditEpisodes += 1;
                    }
                  }

                  if (callName === "respond_to_permission") {
                    let args: Record<string, unknown> | null = null;
                    if (isObject(part.arguments)) {
                      args = part.arguments as Record<string, unknown>;
                    } else if (typeof part.arguments === "string") {
                      try {
                        const parsed = JSON.parse(part.arguments);
                        if (isObject(parsed)) {
                          args = parsed as Record<string, unknown>;
                        }
                      } catch {
                        args = null;
                      }
                    }

                    let behavior: "allow" | "deny" | "other" = "other";
                    if (args !== null && isObject(args.response)) {
                      if (args.response.behavior === "allow") {
                        behavior = "allow";
                      } else if (args.response.behavior === "deny") {
                        behavior = "deny";
                      }
                    }

                    if (behavior === "allow") {
                      permissionAnswers.allow += 1;
                    } else if (behavior === "deny") {
                      permissionAnswers.deny += 1;
                    } else {
                      permissionAnswers.other += 1;
                    }

                    const rawAgentId =
                      args !== null && typeof args.agentId === "string"
                        ? args.agentId
                        : "";
                    const targetKey = derivePermissionTargetKey(rawAgentId);
                    recordPermissionTarget(permissionAnswers, targetKey);
                    if (
                      args !== null &&
                      typeof args.requestId === "string" &&
                      /^[A-Za-z0-9-]{1,64}$/.test(args.requestId)
                    ) {
                      const actorKey = permissionActorKey(
                        args.agentId,
                        permissionScope,
                      );
                      const identity = permissionRequestIdentity(
                        actorKey,
                        args.requestId,
                      );
                      if (
                        permissionVerdictsMap.size < MAX_REQUEST_VERDICTS_CAP ||
                        permissionVerdictsMap.has(identity)
                      ) {
                        const answeredAtMs =
                          toEpochMillis(msg.timestamp) ??
                          toEpochMillis(row.timestamp);
                        const existing = permissionVerdictsMap.get(identity);
                        // One selection rule everywhere: the earliest valid
                        // observed answer record wins; ties keep the first seen.
                        const shouldReplace =
                          existing === undefined ||
                          (answeredAtMs !== null &&
                            (existing.answeredAtMs === null ||
                              answeredAtMs < existing.answeredAtMs));
                        if (shouldReplace) {
                          permissionVerdictsMap.set(identity, {
                            verdict: behavior,
                            answeredAtMs,
                            actorKey,
                          });
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    const processCodexRow = (
      row: Record<string, unknown>,
      recordTimestamps: boolean,
    ): void => {
      if (recordTimestamps) updateTimestamps(row.timestamp);

      if (row.type === "turn_context" && isObject(row.payload)) {
        if (typeof row.payload.model === "string") {
          currentModel = boundIdentifier(row.payload.model);
        }
        return;
      }

      if (
        row.type === "compaction" ||
        row.type === "context_compaction" ||
        row.type === "user_message"
      ) {
        if (row.type === "user_message") {
          userMessages += 1;
          codexTurnOpen = true;
        } else {
          compactions += 1;
        }
        return;
      }

      if (row.type === "event_msg" && isObject(row.payload)) {
        const payload = row.payload;

        if (payload.type === "user_message") {
          userMessages += 1;
          codexTurnOpen = true;
          return;
        }

        if (
          payload.type === "compaction" ||
          payload.type === "context_compaction"
        ) {
          compactions += 1;
          return;
        }

        if (payload.type === "turn_aborted") {
          recordBoundedMap(stopReasons, "aborted");
          if (codexTurnOpen) {
            assistantTurns += 1;
            const modelName = currentModel ?? "unknown-model";
            recordBoundedMap(models, modelName);
            costUnknownTurns += 1;
            const day = extractDay(row.timestamp);
            recordJointEntry(series, day, modelName, 1, 0, 0, 0, 0, 0, 0);
            codexTurnOpen = false;
          }
          return;
        }

        if (payload.type === "agent_message") {
          codexTurnOpen = true;
          return;
        }

        if (
          payload.type === "tool_call" ||
          payload.type === "call_tool" ||
          payload.type === "function_call"
        ) {
          codexTurnOpen = true;
          const fnObj = isObject(payload.function)
            ? payload.function
            : undefined;
          const toolName =
            typeof payload.name === "string"
              ? boundIdentifier(payload.name)
              : typeof payload.tool_name === "string"
                ? boundIdentifier(payload.tool_name)
                : fnObj && typeof fnObj.name === "string"
                  ? boundIdentifier(fnObj.name)
                  : undefined;
          const toolCallId =
            typeof payload.id === "string"
              ? payload.id
              : typeof payload.call_id === "string"
                ? payload.call_id
                : undefined;
          const callArguments =
            payload.arguments ?? payload.args ?? fnObj?.arguments;
          const decisionMillis = toEpochMillis(row.timestamp);
          recordDecisionCall(
            toolName,
            callArguments,
            toolCallId,
            decisionMillis === null ? null : new Date(decisionMillis).toISOString(),
          );
          if (toolName) {
            if (toolCallId) {
              if (!seenToolCallIds.has(toolCallId)) {
                seenToolCallIds.add(toolCallId);
                recordBoundedMap(toolCalls, toolName);
              }
            } else {
              recordBoundedMap(toolCalls, toolName);
            }
          }
          return;
        }

        if (
          payload.type === "tool_result" ||
          payload.type === "function_result"
        ) {
          codexTurnOpen = true;
          const toolName =
            typeof payload.name === "string"
              ? boundIdentifier(payload.name)
              : typeof payload.tool_name === "string"
                ? boundIdentifier(payload.tool_name)
                : undefined;
          const toolCallId =
            typeof payload.id === "string"
              ? payload.id
              : typeof payload.call_id === "string"
                ? payload.call_id
                : undefined;
          if (toolName) {
            if (toolCallId) {
              if (!seenToolCallIds.has(toolCallId)) {
                seenToolCallIds.add(toolCallId);
                recordBoundedMap(toolCalls, toolName);
              }
            } else {
              recordBoundedMap(toolCalls, toolName);
            }
            if (payload.is_error === true || payload.error !== undefined) {
              recordBoundedMap(toolErrors, toolName);
            }
          }
          const isError = payload.is_error === true || payload.error !== undefined;
          if (toolName) recordFailureResult(toolName, isError);
          const resultMillis = toEpochMillis(row.timestamp);
          finishDecisionCall(
            toolCallId,
            isError,
            resultMillis === null ? null : new Date(resultMillis).toISOString(),
          );
          return;
        }

        if (payload.type === "token_count" && isObject(payload.info)) {
          const info = payload.info;
          const lastObj = isObject(info.last_token_usage)
            ? info.last_token_usage
            : null;
          const totalObj = isObject(info.total_token_usage)
            ? info.total_token_usage
            : null;

          const parseCounters = (c: Record<string, unknown> | null) => {
            if (!c) return null;
            const inp =
              typeof c.input_tokens === "number" &&
              Number.isSafeInteger(c.input_tokens) &&
              c.input_tokens >= 0
                ? c.input_tokens
                : null;
            const out =
              typeof c.output_tokens === "number" &&
              Number.isSafeInteger(c.output_tokens) &&
              c.output_tokens >= 0
                ? c.output_tokens
                : null;
            const cr =
              typeof c.cached_input_tokens === "number" &&
              Number.isSafeInteger(c.cached_input_tokens) &&
              c.cached_input_tokens >= 0
                ? c.cached_input_tokens
                : 0;
            const cw =
              typeof c.cache_write_input_tokens === "number" &&
              Number.isSafeInteger(c.cache_write_input_tokens) &&
              c.cache_write_input_tokens >= 0
                ? c.cache_write_input_tokens
                : 0;
            if (inp === null || out === null) return null;
            return { input: inp, output: out, cacheRead: cr, cacheWrite: cw };
          };

          const totalCounters = parseCounters(totalObj);
          const lastCounters = parseCounters(lastObj);

          let counters: {
            input: number;
            output: number;
            cacheRead: number;
            cacheWrite: number;
          } | null = null;
          if (totalCounters !== null) {
            const previous = codexPreviousTotal;
            if (
              previous !== null &&
              (totalCounters.input < previous.input ||
                totalCounters.output < previous.output)
            ) {
              skippedLines += 1;
              return;
            }
            const delta =
              previous === null
                ? totalCounters
                : {
                    input: totalCounters.input - previous.input,
                    output: totalCounters.output - previous.output,
                    cacheRead: totalCounters.cacheRead,
                    cacheWrite: totalCounters.cacheWrite,
                  };
            if (
              codexLastOnlySinceTotal.input > delta.input ||
              codexLastOnlySinceTotal.output > delta.output
            ) {
              skippedLines += 1;
              return;
            }
            counters = {
              input: delta.input - codexLastOnlySinceTotal.input,
              output: delta.output - codexLastOnlySinceTotal.output,
              cacheRead: delta.cacheRead,
              cacheWrite: delta.cacheWrite,
            };
            codexPreviousTotal = totalCounters;
            codexLastOnlySinceTotal = { input: 0, output: 0 };
          } else if (lastCounters !== null) {
            counters = lastCounters;
            const accumulatedInput =
              codexLastOnlySinceTotal.input + counters.input;
            const accumulatedOutput =
              codexLastOnlySinceTotal.output + counters.output;
            if (
              !Number.isSafeInteger(accumulatedInput) ||
              !Number.isSafeInteger(accumulatedOutput)
            ) {
              skippedLines += 1;
              return;
            }
            codexLastOnlySinceTotal = {
              input: accumulatedInput,
              output: accumulatedOutput,
            };
          }

          if (counters) {
            tokens.input += counters.input;
            tokens.output += counters.output;
            tokens.cacheRead += counters.cacheRead;
            tokens.cacheWrite += counters.cacheWrite;
          }

          if (codexTurnOpen || counters !== null) {
            assistantTurns += 1;
            const modelName = currentModel ?? "unknown-model";
            recordBoundedMap(models, modelName);
            costUnknownTurns += 1;
            const day = extractDay(row.timestamp);
            recordJointEntry(
              series,
              day,
              modelName,
              1,
              0,
              0,
              0,
              counters !== null ? counters.input : 0,
              counters !== null ? counters.output : 0,
              counters !== null ? counters.cacheRead : 0,
            );
            codexTurnOpen = false;
          }
        }
      }
    };

    const processRow = (row: unknown): void => {
      if (!isObject(row)) {
        skippedLines += 1;
        return;
      }
      let recordTimestamps = true;
      if (cutoffMs !== undefined) {
        const rowMillis = toEpochMillis(row.timestamp);
        const isStructuralHeader =
          source.format === "omp"
            ? row.type === "session" || (row.type === "title" && row.v === 1)
            : row.type === "session_meta";
        if (rowMillis === null || rowMillis > cutoffMs) {
          if (!isStructuralHeader) {
            // Unknown-time activity is omitted rather than assumed inside the
            // window; after-cutoff activity is outside the authorized window.
            if (rowMillis === null) {
              skippedLines += 1;
              unknownTimeExclusions = true;
            }
            return;
          }
          recordTimestamps = false;
        }
      }
      if (recordTimestamps) {
        const timestamp =
          row.timestamp ??
          (isObject(row.message) ? row.message.timestamp : undefined);
        const millis = toEpochMillis(timestamp);
        if (millis !== null) {
          if (priorRowMillis !== null && millis >= priorRowMillis) {
            const gapSeconds = Math.floor((millis - priorRowMillis) / 1000);
            if (gapSeconds >= IMPROVEMENT_THRESHOLDS.IDLE_GAP_MIN_SECONDS) {
              idleGaps.push(gapSeconds);
            }
          }
          priorRowMillis = millis;
        }
      }
      if (source.format === "omp") {
        processOmpRow(row, recordTimestamps);
      } else {
        processCodexRow(row, recordTimestamps);
      }
    };

    const processLineBuffer = (buf: Buffer): void => {
      const text = buf.toString("utf8").trim();
      if (!text) return;
      let row: unknown;
      try {
        row = JSON.parse(text);
      } catch {
        if (!timeCeiling) skippedLines += 1;
        return;
      }
      if (
        source.format === "omp" &&
        source.expectedSessionId !== undefined &&
        isObject(row) &&
        row.type === "session"
      ) {
        if (row.id === source.expectedSessionId) {
          expectedSessionHeaderSeen = true;
        } else {
          expectedSessionHeaderMismatch = true;
        }
      }
      if (timeCeiling) return;
      processRow(row);
    };

    if (snapshot.bytesCaptured > 0) {
      let parts: Buffer[] = [];
      let currentLength = 0;
      let tooLong = false;
      const lineLimit = DEFAULT_LIMITS.lineBytes;
      const buffer = Buffer.allocUnsafe(
        Math.min(SOURCE_READ_CHUNK_BYTES, snapshot.bytesCaptured),
      );
      let position = 0;

      while (position < snapshot.bytesCaptured) {
        if (signal.aborted) {
          throw new RetrospectiveError("ABORTED", "Aggregate pass was aborted");
        }
        const length = Math.min(buffer.length, snapshot.bytesCaptured - position);
        const { bytesRead } = await handle.read(buffer, 0, length, position);
        if (bytesRead === 0) break;
        position += bytesRead;
        const chunk = buffer.subarray(0, bytesRead);
        hash.update(chunk);

        if (!timeCeiling && Date.now() - startedAt >= limits.maxMillis) {
          timeCeiling = true;
        }

        let start = 0;
        for (let index = 0; index < chunk.length; index += 1) {
          if (chunk[index] !== 0x0a) continue;
          const segment = chunk.subarray(start, index);
          start = index + 1;

          if (tooLong) {
            skippedLines += 1;
            tooLong = false;
            parts = [];
            currentLength = 0;
            continue;
          }

          if (currentLength + segment.length > lineLimit) {
            skippedLines += 1;
            tooLong = false;
            parts = [];
            currentLength = 0;
            continue;
          }

          parts.push(segment);
          const lineBuf = parts.length === 1 ? parts[0] : Buffer.concat(parts);
          parts = [];
          currentLength = 0;
          processLineBuffer(lineBuf);
        }

        if (start < chunk.length) {
          const remainder = chunk.subarray(start);
          if (!tooLong) {
            if (currentLength + remainder.length > lineLimit) {
              tooLong = true;
              parts = [];
              currentLength = 0;
            } else {
              parts.push(Buffer.from(remainder));
              currentLength += remainder.length;
            }
          }
        }
      }

      if (tooLong) {
        skippedLines += 1;
      } else if (parts.length > 0) {
        const lineBuf = parts.length === 1 ? parts[0] : Buffer.concat(parts);
        processLineBuffer(lineBuf);
      }
    }

    if (signal.aborted) {
      throw new RetrospectiveError("ABORTED", "Aggregate pass was aborted");
    }

    const computedDigest = hash.digest("hex");
    if (computedDigest !== snapshot.prefixDigest) {
      throw new RetrospectiveError(
        "SOURCE_CHANGED",
        "Source file changed after snapshot was captured",
      );
    }
    if (
      source.expectedSessionId !== undefined &&
      (!expectedSessionHeaderSeen || expectedSessionHeaderMismatch)
    ) {
      throw new RetrospectiveError(
        "SOURCE_CHANGED",
        "Source session identity does not match the expected session",
      );
    }

    let coverage: "complete" | "partial" = "complete";
    let partialReason:
      | "size-ceiling"
      | "time-ceiling"
      | "unreadable-lines"
      | "unknown-time-exclusions"
      | undefined = undefined;

    if (sizeCeiling) {
      coverage = "partial";
      partialReason = "size-ceiling";
    } else if (timeCeiling) {
      coverage = "partial";
      partialReason = "time-ceiling";
    } else if (unknownTimeExclusions) {
      coverage = "partial";
      partialReason = "unknown-time-exclusions";
    }

    decisions.unconfirmed += pendingDecisions.size;
    const permissionRequests: PermissionRequestStats =
      source.format === "codex"
        ? createEmptyPermissionRequestStats()
        : buildPermissionRequestStats(
            permissionRequestsMap,
            permissionVerdictsMap,
          );

    for (const [identity, request] of permissionRequestsMap) {
      const answeredAtMs = permissionVerdictsMap.get(identity)?.answeredAtMs;
      if (
        request.requestedAtMs !== null &&
        answeredAtMs !== undefined &&
        answeredAtMs !== null &&
        answeredAtMs >= request.requestedAtMs
      ) {
        permissionLatencySeconds.push(
          Math.round((answeredAtMs - request.requestedAtMs) / 1000),
        );
      }
    }
    // Event-level records are capped independently of the stats maps; a node
    // that exceeds the cap reports partial coverage instead of silently
    // dropping observations from friction counts. Answer observations without
    // their request are retained so another node's request can join them.
    const permissionRequestEvents: PermissionRequestEvent[] = [];
    if (source.format === "omp") {
      const requestKeys = new Set<string>();
      for (const [identity, req] of permissionRequestsMap) {
        if (permissionRequestEvents.length >= MAX_PERMISSION_EVENTS) break;
        const answer = permissionVerdictsMap.get(identity);
        const requestKey = crypto
          .createHash("sha256")
          .update(identity)
          .digest("hex")
          .slice(0, 16);
        requestKeys.add(requestKey);
        permissionRequestEvents.push({
          requestKey,
          actorKey: req.actorKey,
          observedRequest: true,
          tool: req.tool,
          program: req.program,
          kind: req.kind,
          requestedAtMs: req.requestedAtMs,
          answeredAtMs: answer?.answeredAtMs ?? null,
          verdict: answer?.verdict ?? null,
        });
      }
      for (const [identity, answer] of permissionVerdictsMap) {
        if (permissionRequestEvents.length >= MAX_PERMISSION_EVENTS) break;
        const requestKey = crypto
          .createHash("sha256")
          .update(identity)
          .digest("hex")
          .slice(0, 16);
        if (requestKeys.has(requestKey)) continue;
        permissionRequestEvents.push({
          requestKey,
          actorKey: answer.actorKey,
          observedRequest: false,
          tool: "other",
          program: null,
          kind: "other",
          requestedAtMs: null,
          answeredAtMs: answer.answeredAtMs,
          verdict: answer.verdict,
        });
      }
    }

    const completenessStatus =
      skippedLines > 0 ? "may-undercount-by-skipped-lines" : "complete";

    const metricCompleteness: MetricCompleteness = {
      assistantTurns: completenessStatus,
      tokens: completenessStatus,
      cost: completenessStatus,
      toolCalls: completenessStatus,
      toolErrors: completenessStatus,
      byDayModel: completenessStatus,
      userMessages: completenessStatus,
      compactions: completenessStatus,
      models: completenessStatus,
      stopReasons: completenessStatus,
      sideCalls: completenessStatus,
      costKnownTurns: completenessStatus,
      costUnknownTurns: completenessStatus,
      // Codex tool naming is unverified, so its skill-load numbers are a
      // documented non-measurement rather than a skipped-line undercount.
      skillLoad: source.format === "omp" ? completenessStatus : "complete",
    };
    const failureRunRecord = Object.create(null) as Record<
      string,
      { runs: number; longest: number }
    >;
    for (const [tool, value] of failureRuns) {
      failureRunRecord[tool] = { runs: value.runs, longest: value.longest };
    }

    return {
      node: { ...source.node },
      format: source.format,
      cwdRaw,
      first,
      last,
      assistantTurns,
      userMessages,
      compactions,
      tokens,
      cost,
      costKnownTurns,
      costUnknownTurns,
      models,
      stopReasons,
      sideCalls,
      toolCalls,
      toolErrors,
      serverToolCalls,
      hostSkillReads,
      skillLoad,
      permissionAnswers,
      context,
      permissionRequests,
      permissionRequestEvents,
      permissionCapture: source.format === "omp" ? "captured" : "unsupported",
      activity,
      failureRuns: failureRunRecord,
      failureRunsTruncated,
      idleGaps,
      permissionLatencySeconds,
      decisions,
      routing,
      lookups,
      folder,
      coverage,
      ...(partialReason !== undefined ? { partialReason } : {}),
      skippedLines,
      series,
      snapshot: { ...snapshot },
      metricCompleteness,
    };
  } catch (error) {
    if (
      signal.aborted ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw new RetrospectiveError("ABORTED", "Aggregate pass was aborted");
    }
    throw error;
  } finally {
    await ownedHandle?.close().catch(() => undefined);
  }
}

/**
 * Rolls per-session aggregates into one tree aggregate.
 *
 * Callers MUST pass the main session first: `skillLoad.nodes[0]` is reported as
 * the main session (`isMain`), and every later index is a child in the same
 * order.
 */
export function rollUp(aggregates: AggregatedSession[]): TreeAggregate {
  let fullyRead = 0;
  let hasPartial = false;
  let first: string | null = null;
  let last: string | null = null;
  let assistantTurns = 0;
  let userMessages = 0;
  let compactions = 0;
  const tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let cost = 0;
  let costKnownTurns = 0;
  let costUnknownTurns = 0;
  const models: Record<string, number> = {};
  const stopReasons: Record<string, number> = {};
  const sideCalls: SideCalls = {
    calls: 0,
    stopReasons: {},
    cost: 0,
    costKnownCalls: 0,
  };
  const toolCalls: Record<string, number> = {};
  const toolErrors: Record<string, number> = {};
  const serverToolCalls: Record<string, number> = {};
  const hostSkillReads: Record<string, number> = {};
  const skillLoadNodes: NodeSkillLoad[] = [];
  const nodes: NodeUsage[] = [];
  let omittedSkillLoadNodes = 0;
  let skippedLines = 0;
  const series: JointSeries = { byDayModel: {} };
  const metricCompleteness: MetricCompleteness = {};
  const failureRuns = new Map<
    string,
    { runs: number; longest: number; agentOrdinal: number }
  >();
  const idleGaps: number[] = [];
  const permissionLatencySeconds: number[] = [];
  let failureRunsTruncated = false;
  const decisions: NonNullable<SessionAggregate["decisions"]> = {
    accepted: [],
    total: 0,
    byBasis: { rule: 0, defaultPendingReview: 0 },
    byImpact: {
      high: { rule: 0, defaultPendingReview: 0 },
      medium: { rule: 0, defaultPendingReview: 0 },
      low: { rule: 0, defaultPendingReview: 0 },
    },
    irreversible: 0,
    ruleRefs: Object.create(null) as Record<string, number>,
    otherRuleRefs: 0,
    rejected: 0,
    unconfirmed: 0,
  };
  for (const [index, agg] of aggregates.entries()) {
    if (agg.coverage === "complete") {
      fullyRead += 1;
    } else {
      hasPartial = true;
    }

    if (agg.first !== null) {
      if (first === null || agg.first < first) first = agg.first;
    }
    if (agg.last !== null) {
      if (last === null || agg.last > last) last = agg.last;
    }

    assistantTurns += agg.assistantTurns;
    userMessages += agg.userMessages;
    compactions += agg.compactions;
    tokens.input += agg.tokens.input;
    tokens.output += agg.tokens.output;
    tokens.cacheRead += agg.tokens.cacheRead;
    tokens.cacheWrite += agg.tokens.cacheWrite;
    cost += agg.cost;
    costKnownTurns += agg.costKnownTurns;
    costUnknownTurns += agg.costUnknownTurns;
    skippedLines += agg.skippedLines;

    for (const [k, v] of Object.entries(agg.models)) {
      models[k] = (models[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(agg.stopReasons)) {
      stopReasons[k] = (stopReasons[k] ?? 0) + v;
    }
    if (agg.sideCalls !== undefined) {
      sideCalls.calls += agg.sideCalls.calls;
      sideCalls.cost += agg.sideCalls.cost;
      sideCalls.costKnownCalls += agg.sideCalls.costKnownCalls;
      for (const [k, v] of Object.entries(agg.sideCalls.stopReasons)) {
        sideCalls.stopReasons[k] = (sideCalls.stopReasons[k] ?? 0) + v;
      }
    }
    for (const [k, v] of Object.entries(agg.toolCalls)) {
      toolCalls[k] = (toolCalls[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(agg.toolErrors)) {
      toolErrors[k] = (toolErrors[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(agg.serverToolCalls)) {
      serverToolCalls[k] = (serverToolCalls[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(agg.hostSkillReads)) {
      hostSkillReads[k] = (hostSkillReads[k] ?? 0) + v;
    }
    if (skillLoadNodes.length < MAX_SKILL_LOAD_NODES) {
      skillLoadNodes.push({
        ordinal: index,
        isMain: index === 0,
        measured: agg.skillLoad.measured,
        skillLoadCalls: agg.skillLoad.skillLoadCalls,
        callsBeforeFirstSkillLoad: agg.skillLoad.callsBeforeFirstSkillLoad,
        hostSkillReadCalls: agg.skillLoad.hostSkillReadCalls,
        callsBeforeFirstSkillAccess: agg.skillLoad.callsBeforeFirstSkillAccess,
      });
    } else {
      omittedSkillLoadNodes += 1;
    }
    for (const [tool, value] of Object.entries(agg.failureRuns ?? {})) {
      let current = failureRuns.get(tool);
      if (current === undefined) {
        if (failureRuns.size >= MAX_FAILURE_TRACKED_TOOLS) {
          failureRunsTruncated = true;
          continue;
        }
        current = { runs: 0, longest: 0, agentOrdinal: index };
        failureRuns.set(tool, current);
      }
      current.runs += value.runs;
      if (value.longest > current.longest) {
        current.longest = value.longest;
        current.agentOrdinal = index;
      }
    }
    if (agg.failureRunsTruncated === true) failureRunsTruncated = true;
    if (index === 0) idleGaps.push(...(agg.idleGaps ?? []));
    if (agg.decisions) {
      decisions.total += agg.decisions.total;
      decisions.byBasis.rule += agg.decisions.byBasis.rule;
      decisions.byBasis.defaultPendingReview +=
        agg.decisions.byBasis.defaultPendingReview;
      for (const impact of ["high", "medium", "low"] as const) {
        decisions.byImpact[impact].rule += agg.decisions.byImpact[impact].rule;
        decisions.byImpact[impact].defaultPendingReview +=
          agg.decisions.byImpact[impact].defaultPendingReview;
      }
      decisions.irreversible += agg.decisions.irreversible;
      for (const [ref, count] of Object.entries(agg.decisions.ruleRefs)) {
        decisions.ruleRefs[ref] =
          (Object.hasOwn(decisions.ruleRefs, ref) ? decisions.ruleRefs[ref] : 0) + count;
      }
      decisions.otherRuleRefs += agg.decisions.otherRuleRefs;
      decisions.rejected += agg.decisions.rejected;
      decisions.unconfirmed += agg.decisions.unconfirmed;
      for (const item of agg.decisions.accepted) {
        retainPrioritizedDecision(
          decisions.accepted,
          { ...item, nodeOrdinal: index },
          MAX_TREE_DECISIONS,
        );
      }
    }
    if (nodes.length < MAX_TREE_NODES) {
      nodes.push({
        ordinal: index,
        turns: agg.assistantTurns,
        cost: agg.cost,
        costKnownTurns: agg.costKnownTurns,
        compactions: agg.compactions,
        tokens: { ...agg.tokens },
        errorStops: agg.stopReasons.error ?? 0,
        abortedStops: agg.stopReasons.aborted ?? 0,
        toolCalls: Object.values(agg.toolCalls).reduce(
          (sum, count) => sum + count,
          0,
        ),
        toolErrors: Object.values(agg.toolErrors).reduce(
          (sum, count) => sum + count,
          0,
        ),
        toolCallsByName: { ...agg.toolCalls },
        serverToolCalls: { ...agg.serverToolCalls },
        models: { ...agg.models },
        permissionAnswers: {
          allow: agg.permissionAnswers.allow,
          deny: agg.permissionAnswers.deny,
          other: agg.permissionAnswers.other,
          byTarget: { ...agg.permissionAnswers.byTarget },
          untrackedTargets: agg.permissionAnswers.untrackedTargets,
        },
        permissionRequests: clonePermissionRequestStats(agg.permissionRequests),
        ...(agg.permissionRequestEvents !== undefined
          ? {
              permissionRequestEvents: agg.permissionRequestEvents.map(
                (event) => ({ ...event }),
              ),
            }
          : {}),
        ...(agg.permissionCapture !== undefined
          ? { permissionCapture: agg.permissionCapture }
          : {}),
        context: { ...agg.context },
        routing: { ...agg.routing },
        lookups: cloneLookupStats(agg.lookups),
        skillLoadCalls: agg.skillLoad.measured
          ? agg.skillLoad.skillLoadCalls
          : 0,
        first: agg.first,
        last: agg.last,
        activity: {
          userRows: agg.userMessages,
          steering: agg.activity?.steering ?? 0,
          permissionNotifications: agg.activity?.permissionNotifications ?? 0,
          byAttribution: { ...(agg.activity?.byAttribution ?? {}) },
        },
        failureRuns: { ...(agg.failureRuns ?? {}) },
        idleGaps: [...(agg.idleGaps ?? [])],
        permissionLatencySeconds: [...(agg.permissionLatencySeconds ?? [])],
        decisions: agg.decisions,
      });
    }
    for (const [k, v] of Object.entries(agg.metricCompleteness)) {
      // Worst wins: one undercounting source makes the rolled-up metric undercounting.
      metricCompleteness[k] =
        v === "may-undercount-by-skipped-lines" ||
        metricCompleteness[k] === "may-undercount-by-skipped-lines"
          ? "may-undercount-by-skipped-lines"
          : "complete";
    }
    for (const [k, v] of Object.entries(agg.series.byDayModel)) {
      const entry = (series.byDayModel[k] ??= {
        turns: 0,
        errorStops: 0,
        costUnits: 0,
        costKnownTurns: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
      });
      entry.turns += v.turns;
      entry.errorStops += v.errorStops;
      entry.costUnits += v.costUnits;
      entry.costKnownTurns += v.costKnownTurns;
      entry.inputTokens += v.inputTokens;
      entry.outputTokens += v.outputTokens;
      entry.cacheReadTokens += v.cacheReadTokens;
    }
  }

  let partialReason:
    | "size-ceiling"
    | "time-ceiling"
    | "unreadable-lines"
    | "unknown-time-exclusions"
    | undefined = undefined;

  if (hasPartial) {
    const reasons = new Set(
      aggregates.map((a) => a.partialReason).filter(Boolean),
    );
    if (reasons.has("size-ceiling")) {
      partialReason = "size-ceiling";
    } else if (reasons.has("time-ceiling")) {
      partialReason = "time-ceiling";
    } else if (reasons.has("unreadable-lines")) {
      partialReason = "unreadable-lines";
    } else if (reasons.has("unknown-time-exclusions")) {
      partialReason = "unknown-time-exclusions";
    }
  }

  const failureRunRecord = Object.create(null) as Record<
    string,
    { runs: number; longest: number; agentOrdinal: number }
  >;
  for (const [tool, value] of failureRuns) {
    failureRunRecord[tool] = {
      runs: value.runs,
      longest: value.longest,
      agentOrdinal: value.agentOrdinal,
    };
  }
  const tree: TreeAggregate = {
    sessions: aggregates.length,
    fullyRead,
    coverage: hasPartial ? "partial" : "complete",
    ...(partialReason !== undefined ? { partialReason } : {}),
    first,
    last,
    assistantTurns,
    userMessages,
    compactions,
    tokens,
    cost,
    costKnownTurns,
    costUnknownTurns,
    models,
    stopReasons,
    sideCalls,
    toolCalls,
    toolErrors,
    serverToolCalls,
    hostSkillReads,
    skillLoad: { nodes: skillLoadNodes, omittedNodes: omittedSkillLoadNodes },
    nodes,
    folder: aggregates.length > 0 ? (aggregates[0].folder ?? null) : null,
    skippedLines,
    metricCompleteness,
    series,
    activity: aggregates.length > 0
      ? {
          userRows: {
            total: aggregates[0].userMessages,
            steering: aggregates[0].activity?.steering ?? 0,
            permissionNotifications: aggregates[0].activity?.permissionNotifications ?? 0,
            byAttribution: { ...(aggregates[0].activity?.byAttribution ?? {}) },
          },
          stopReasons: { ...stopReasons },
        }
      : undefined,
    failureRuns: failureRunRecord,
    failureRunsTruncated,
    idleGaps,
    permissionLatencySeconds,
    decisions,
  };
  for (const event of deduplicatePermissionEvents(tree)) {
    if (
      event.observedRequest &&
      event.verdict !== null &&
      event.requestedAtMs !== null &&
      event.answeredAtMs !== null &&
      event.answeredAtMs >= event.requestedAtMs
    ) {
      permissionLatencySeconds.push(
        Math.round((event.answeredAtMs - event.requestedAtMs) / 1000),
      );
    }
  }
  return tree;
}
