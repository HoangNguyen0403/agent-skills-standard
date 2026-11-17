/**
 * Slice: pure, deterministic permission friction summary.
 *
 * Reports only what the aggregate observed: request identities deduplicated at
 * their full actor+request boundary, answers joined even when their request was
 * captured in another session node, and wait time measured only where both
 * structured timestamps exist. Unknown provenance, unknown actor identity and
 * unknown timing stay null; nothing is inferred from tool-category repeats or
 * from a response call alone.
 */
import crypto from "node:crypto";
import type { TreeAggregate } from "./aggregate";

export type PermissionFrictionAgent = {
  /** Generated report alias, never a native agent identifier. */
  label: string;
  requests: number;
  answered: number;
  unanswered: number;
  /** Requests for a tool this actor had already requested. */
  repeatedRequests: number;
};

export type PermissionFrictionTool = {
  tool: string;
  requests: number;
  repeatedRequests: number;
};

export type PermissionFriction = {
  requests: number;
  answered: number;
  unanswered: number;
  /** Requests whose tool category repeats one this actor already requested. */
  repeatedRequests: number;
  /** Always null: no structured evidence identifies a human approver. */
  humanAnswers: number | null;
  /** Always null: no structured evidence identifies the answering caller. */
  orchestratorAnswers: number | null;
  /** Summed request-wait milliseconds, not session wall time; null when unmeasured. */
  waitMs: number | null;
  waitMeasuredRequests: number;
  coverage: "complete" | "partial";
  limitations: string[];
  byAgent: PermissionFrictionAgent[];
  byTool: PermissionFrictionTool[];
};

/** Maximum reported actors and tools; extras are only described in limitations. */
const MAX_BREAKDOWN_ROWS = 20;

export type DeduplicatedPermissionEvent = {
  requestKey: string;
  actorKey: string;
  observedRequest: boolean;
  tool: string;
  program: string | null;
  kind: string;
  requestedAtMs: number | null;
  answeredAtMs: number | null;
  verdict: "allow" | "deny" | "other" | null;
};

type MergedPermissionEvent = DeduplicatedPermissionEvent;

/** Stable report alias for an actor key: generated, not a native identifier. */
function actorAlias(actorKey: string): string {
  const digest = crypto
    .createHash("sha256")
    .update(actorKey)
    .digest("hex")
    .slice(0, 8);
  return `actor-${digest}`;
}

function mergeEvent(
  target: MergedPermissionEvent,
  incoming: MergedPermissionEvent,
): void {
  if (incoming.observedRequest && !target.observedRequest) {
    target.observedRequest = true;
    target.tool = incoming.tool;
    target.program = incoming.program;
    target.kind = incoming.kind;
  }
  if (
    incoming.requestedAtMs !== null &&
    (target.requestedAtMs === null ||
      incoming.requestedAtMs < target.requestedAtMs)
  ) {
    target.requestedAtMs = incoming.requestedAtMs;
  }
  if (incoming.verdict !== null) {
    const replace =
      target.verdict === null ||
      (incoming.answeredAtMs !== null &&
        (target.answeredAtMs === null ||
          incoming.answeredAtMs < target.answeredAtMs));
    if (replace) {
      target.verdict = incoming.verdict;
      target.answeredAtMs = incoming.answeredAtMs;
    }
  }
}

export function deduplicatePermissionEvents(
  tree: TreeAggregate | null,
): DeduplicatedPermissionEvent[] {
  if (tree === null) return [];
  const merged = new Map<string, MergedPermissionEvent>();
  for (const node of tree.nodes) {
    for (const event of node.permissionRequestEvents ?? []) {
      const incoming: MergedPermissionEvent = { ...event };
      const existing = merged.get(event.requestKey);
      if (existing === undefined) {
        merged.set(event.requestKey, incoming);
      } else {
        mergeEvent(existing, incoming);
      }
    }
  }
  return [...merged.values()];
}

type ActorTally = {
  requests: number;
  answered: number;
  repeatedRequests: number;
};

type ToolTally = {
  requests: number;
  repeatedRequests: number;
};

export function buildPermissionFriction(
  tree: TreeAggregate | null,
  options: { scopeIncomplete?: boolean } = {},
): PermissionFriction | null {
  if (tree === null) {
    return null;
  }

  const merged = deduplicatePermissionEvents(tree);
  let coverage: "complete" | "partial" =
    tree.coverage === "partial" || options.scopeIncomplete === true
      ? "partial"
      : "complete";
  let unsupportedCaptureNodes = 0;
  let unknownCaptureNodes = 0;
  let nodesWithoutEvents = 0;
  let nodesWithTruncatedEvents = 0;

  for (const node of tree.nodes) {
    if (node.permissionCapture !== "captured") {
      if (node.permissionCapture === "unsupported") {
        unsupportedCaptureNodes += 1;
      } else {
        unknownCaptureNodes += 1;
      }
      coverage = "partial";
    }
    const events = node.permissionRequestEvents;
    if (events === undefined) {
      if (
        node.permissionRequests.asked > 0 ||
        node.permissionRequests.answeredWithoutRequest > 0
      ) {
        nodesWithoutEvents += 1;
        coverage = "partial";
      }
      continue;
    }
    const observedCount =
      node.permissionRequests.asked +
      node.permissionRequests.answeredWithoutRequest;
    if (events.length < observedCount) {
      nodesWithTruncatedEvents += 1;
      coverage = "partial";
    }
  }

  const omittedNodes = Math.max(0, tree.sessions - tree.nodes.length);
  if (omittedNodes > 0) {
    coverage = "partial";
  }

  const actorTallies = new Map<string, ActorTally>();
  const toolTallies = new Map<string, ToolTally>();
  const toolsByActor = new Map<string, Set<string>>();
  let requests = 0;
  let answered = 0;
  let repeatedRequests = 0;
  let unresolvedAnswers = 0;
  let unknownActorRequests = 0;

  for (const event of merged) {
    if (!event.observedRequest) {
      if (event.verdict !== null) {
        unresolvedAnswers += 1;
      }
      continue;
    }
    requests += 1;
    if (event.actorKey.startsWith("unknown-")) {
      unknownActorRequests += 1;
    }

    const actor = actorTallies.get(event.actorKey) ?? {
      requests: 0,
      answered: 0,
      repeatedRequests: 0,
    };
    actorTallies.set(event.actorKey, actor);
    actor.requests += 1;
    if (event.verdict !== null) {
      answered += 1;
      actor.answered += 1;
    }

    const tool = toolTallies.get(event.tool) ?? {
      requests: 0,
      repeatedRequests: 0,
    };
    toolTallies.set(event.tool, tool);
    tool.requests += 1;

    const seenTools = toolsByActor.get(event.actorKey) ?? new Set<string>();
    toolsByActor.set(event.actorKey, seenTools);
    if (seenTools.has(event.tool)) {
      repeatedRequests += 1;
      actor.repeatedRequests += 1;
      tool.repeatedRequests += 1;
    } else {
      seenTools.add(event.tool);
    }
  }

  let waitSum = 0;
  let waitMeasuredRequests = 0;
  let nonMonotonicAnswers = 0;
  let waitOverflowed = false;
  for (const event of merged.values()) {
    if (!event.observedRequest || event.verdict === null) continue;
    if (event.requestedAtMs === null || event.answeredAtMs === null) continue;
    const delta = event.answeredAtMs - event.requestedAtMs;
    if (!Number.isSafeInteger(delta) || delta < 0) {
      nonMonotonicAnswers += 1;
      continue;
    }
    if (!Number.isSafeInteger(waitSum + delta)) {
      waitOverflowed = true;
      break;
    }
    waitSum += delta;
    waitMeasuredRequests += 1;
  }

  const byAgent: PermissionFrictionAgent[] = [...actorTallies.entries()]
    .map(([actorKey, tally]) => ({
      label: actorAlias(actorKey),
      requests: tally.requests,
      answered: tally.answered,
      unanswered: tally.requests - tally.answered,
      repeatedRequests: tally.repeatedRequests,
    }))
    .sort((a, b) => b.requests - a.requests || a.label.localeCompare(b.label))
    .slice(0, MAX_BREAKDOWN_ROWS);

  const byTool: PermissionFrictionTool[] = [...toolTallies.entries()]
    .map(([tool, tally]) => ({
      tool,
      requests: tally.requests,
      repeatedRequests: tally.repeatedRequests,
    }))
    .sort((a, b) => b.requests - a.requests || a.tool.localeCompare(b.tool))
    .slice(0, MAX_BREAKDOWN_ROWS);

  const waitMs = waitMeasuredRequests > 0 && !waitOverflowed ? waitSum : null;

  const limitations: string[] = [];
  if (options.scopeIncomplete === true) {
    limitations.push(
      "Declared actor inventory has missing, restricted, unavailable, remote, unlinked, or unknown scope; permission counts exclude actors without readable evidence.",
    );
  }
  if (coverage === "partial") {
    limitations.push(
      "Permission coverage is partial; counts are lower bounds over readable evidence.",
    );
  }
  if (unsupportedCaptureNodes > 0) {
    limitations.push(
      `${unsupportedCaptureNodes} node(s) use a format without permission event capture; their permission counts are unknown, not zero.`,
    );
  }
  if (unknownCaptureNodes > 0) {
    limitations.push(
      `${unknownCaptureNodes} node(s) predate permission capture support; their permission counts are unknown, not zero.`,
    );
  }
  if (omittedNodes > 0) {
    limitations.push(
      `The aggregate omitted ${omittedNodes} session node(s); their permission requests are not counted.`,
    );
  }
  if (nodesWithoutEvents > 0) {
    limitations.push(
      `${nodesWithoutEvents} node(s) with permission activity had no event-level records; those observations are not counted.`,
    );
  }
  if (nodesWithTruncatedEvents > 0) {
    limitations.push(
      `${nodesWithTruncatedEvents} node(s) exceeded the event record cap; counts are lower bounds.`,
    );
  }
  if (unresolvedAnswers > 0) {
    limitations.push(
      `${unresolvedAnswers} answer record(s) did not match any observed request; they are not counted as answered requests.`,
    );
  }
  if (unknownActorRequests > 0) {
    limitations.push(
      `${unknownActorRequests} request(s) had no resolvable agent id; their identity is limited to the observation scope and is never joined across session nodes.`,
    );
  }
  if (nonMonotonicAnswers > 0) {
    limitations.push(
      `${nonMonotonicAnswers} answered request(s) had non-monotonic timestamps and were excluded from wait time.`,
    );
  }
  if (waitOverflowed) {
    limitations.push(
      "Wait total exceeded the safe integer range; waitMs is withheld.",
    );
  }
  if (answered > 0 && waitMeasuredRequests < answered) {
    limitations.push(
      `Wait time is measured for ${waitMeasuredRequests} of ${answered} answered requests with both structured request and answer timestamps.`,
    );
  }
  if (waitMs !== null) {
    limitations.push(
      "waitMs sums request wait duration, not total session wall time.",
    );
  }
  if (actorTallies.size > MAX_BREAKDOWN_ROWS) {
    limitations.push(
      `Actor breakdown lists ${MAX_BREAKDOWN_ROWS} of ${actorTallies.size} actors.`,
    );
  }
  if (toolTallies.size > MAX_BREAKDOWN_ROWS) {
    limitations.push(
      `Tool breakdown lists ${MAX_BREAKDOWN_ROWS} of ${toolTallies.size} tools.`,
    );
  }
  limitations.push(
    "Repeated requests count the same tool category requested again by the same actor; they do not prove identical commands or that a request was avoidable.",
  );
  limitations.push(
    "Answers are observed respond_to_permission tool-call records; no structured provenance identifies the approving agent or a human, and application of the permission is not verified.",
  );
  if (requests > 0) {
    limitations.push(
      "No structured evidence identifies a human approver; humanAnswers is null rather than zero.",
    );
  }

  return {
    requests,
    answered,
    unanswered: requests - answered,
    repeatedRequests,
    humanAnswers: null,
    orchestratorAnswers: null,
    waitMs,
    waitMeasuredRequests,
    coverage,
    limitations,
    byAgent,
    byTool,
  };
}
