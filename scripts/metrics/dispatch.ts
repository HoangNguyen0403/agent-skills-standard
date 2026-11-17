// scripts/metrics/dispatch.ts
//
// Dispatch-scoped observations (SRS-001 to SRS-008, SRS-010 reader rules). These
// events live in the same delivery observation file as the change-level kinds but
// form a separate cohort: no legacy indicator reads them, and no dispatch metric
// reads a legacy kind (isolation invariant, VER-6). The only link is `change_id`.
//
// The reader is the authoritative validator. Every free string is a reference
// string (SRS-010): no path, home marker, or whitespace reaches output.

import type {
  DeliveryEvent,
  DeliveryEventKind,
  DeliveryObservationSet,
  DispatchActor,
  DispatchCapabilityHint,
  DispatchEndEvent,
  DispatchEndState,
  DispatchEvent,
  DispatchInventoryEvent,
  DispatchOutcomeRow,
  DispatchOutcomes,
  DispatchRoundEvent,
  DispatchScopedEvent,
  DispatchUsageEvent,
  DispatchUsageSummary,
} from "./types";
import type { GitPeriod } from "./git";

export const DISPATCH_KINDS = [
  "dispatch",
  "dispatch-round",
  "dispatch-verdict",
  "dispatch-acceptance",
  "dispatch-end",
  "dispatch-usage",
  "dispatch-inventory",
] as const;

/** The five recorded kinds a coverage entry must list for a covered dispatch (SRS-008). */
export const DISPATCH_RECORDED_KINDS: DeliveryEventKind[] = [
  "dispatch",
  "dispatch-round",
  "dispatch-verdict",
  "dispatch-acceptance",
  "dispatch-end",
];

/** SRS-010: closed charset, no `/`, `\`, `~`, or whitespace; a leading alphanumeric. */
const REFERENCE_STRING_RE = /^[A-Za-z0-9][A-Za-z0-9._:@#-]{0,127}$/;

const CAPABILITY_HINTS: readonly DispatchCapabilityHint[] = ["fast", "standard", "strong", "unknown"];
const END_STATES: readonly DispatchEndState[] = ["completed", "cancelled", "failed", "errored"];
const ACTORS: readonly DispatchActor[] = ["worker", "supervision"];
const UNAVAILABLE_CODES: readonly DispatchUsageEvent["unavailable_code"][] = [
  "no-adapter",
  "unresolved",
  "identity-mismatch",
];
const TOKEN_FIELDS = ["input_tokens", "cached_input_tokens", "cache_write_tokens", "output_tokens"] as const;

export type TimestampParser = (value: unknown) => Date | undefined;

/** Spans a change/kind/revision interval, injected so coverage rules have one implementation (delivery.ts). */
export type IntervalCovered = (
  changeId: string,
  kind: DeliveryEventKind,
  revision: string,
  startMs: number,
  endMs: number,
) => boolean;

export function isDispatchKind(kind: string): kind is DispatchScopedEvent["kind"] {
  return (DISPATCH_KINDS as readonly string[]).includes(kind);
}

export function isDispatchEvent(event: DeliveryEvent): event is DispatchScopedEvent {
  return isDispatchKind(event.kind);
}

function referenceString(value: unknown): value is string {
  return typeof value === "string" && REFERENCE_STRING_RE.test(value);
}

function nonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled dispatch event kind: ${String(value)}`);
}

// ---------------------------------------------------------------------------
// Field validation (SRS-001 to SRS-008, SRS-010)
// ---------------------------------------------------------------------------

/**
 * Validates one dispatch-scoped event, including its base fields. Returns
 * `undefined` when the event is not dispatch-scoped, so the caller keeps owning
 * the legacy kinds.
 */
export function validateDispatchEvent(
  raw: Record<string, unknown>,
  parseTimestamp: TimestampParser,
): string[] | undefined {
  if (typeof raw.kind !== "string" || !isDispatchKind(raw.kind)) return undefined;
  const problems: string[] = [];
  const reference = (field: string, value: unknown = raw[field]): void => {
    if (!referenceString(value)) problems.push(`${field} must be a reference string`);
  };
  const timestamp = (field: string): Date | undefined => {
    const parsed = parseTimestamp(raw[field]);
    if (!parsed) problems.push(`${field} must be a valid UTC ISO timestamp`);
    return parsed;
  };
  const window = (): void => {
    const from = timestamp("window_from");
    const to = timestamp("window_to");
    if (from && to && from.getTime() > to.getTime()) problems.push("window_from must not be after window_to");
  };

  for (const field of ["id", "change_id", "revision", "source_ref"]) reference(field);
  timestamp("observed_at");

  switch (raw.kind) {
    case "dispatch": {
      for (const field of ["dispatch_id", "role", "authority_ref", "orchestrator_model", "orchestrator_ref"]) {
        reference(field);
      }
      if (!CAPABILITY_HINTS.includes(raw.capability_hint as DispatchCapabilityHint)) {
        problems.push(`capability_hint must be one of: ${CAPABILITY_HINTS.join(", ")}`);
      }
      const actual =
        typeof raw.actual === "object" && raw.actual !== null && !Array.isArray(raw.actual)
          ? (raw.actual as Record<string, unknown>)
          : undefined;
      if (!actual) {
        problems.push("actual must be an object with provider, model and effort");
      } else {
        for (const field of ["provider", "model", "effort"]) reference(`actual.${field}`, actual[field]);
      }
      break;
    }
    case "dispatch-round": {
      reference("dispatch_id");
      if (!positiveInteger(raw.round)) problems.push("round must be a positive integer");
      break;
    }
    case "dispatch-verdict": {
      reference("dispatch_id");
      if (!positiveInteger(raw.round)) problems.push("round must be a positive integer");
      if (raw.verdict !== "approved" && raw.verdict !== "changes_requested") {
        problems.push('verdict must be "approved" or "changes_requested"');
      }
      reference("reviewer_ref");
      break;
    }
    case "dispatch-acceptance": {
      reference("dispatch_id");
      if (!positiveInteger(raw.round)) problems.push("round must be a positive integer");
      if (raw.decision !== "accepted" && raw.decision !== "rejected") {
        problems.push('decision must be "accepted" or "rejected"');
      }
      reference("authority_ref");
      break;
    }
    case "dispatch-end": {
      reference("dispatch_id");
      if (!END_STATES.includes(raw.state as DispatchEndState)) {
        problems.push(`state must be one of: ${END_STATES.join(", ")}`);
      }
      break;
    }
    case "dispatch-usage": {
      reference("dispatch_id");
      if (!ACTORS.includes(raw.actor as DispatchActor)) problems.push(`actor must be one of: ${ACTORS.join(", ")}`);
      window();
      if (raw.turns !== null && !nonNegativeInteger(raw.turns)) {
        problems.push("turns must be a non-negative integer or null");
      }
      for (const field of TOKEN_FIELDS) {
        if (raw[field] !== null && !nonNegativeInteger(raw[field])) {
          problems.push(`${field} must be a non-negative integer or null`);
        }
      }
      if (raw.recorded_cost !== null && !finiteNonNegative(raw.recorded_cost)) {
        problems.push("recorded_cost must be a finite non-negative number or null");
      }
      if (raw.cost_basis !== "host-recorded-estimate") problems.push('cost_basis must be "host-recorded-estimate"');
      if (typeof raw.coverage_complete !== "boolean") problems.push("coverage_complete must be a boolean");
      reference("method_ref");
      if (raw.unavailable_code !== undefined) {
        if (!UNAVAILABLE_CODES.includes(raw.unavailable_code as never)) {
          problems.push(`unavailable_code must be one of: ${UNAVAILABLE_CODES.join(", ")}`);
        } else if (
          raw.turns !== null ||
          raw.recorded_cost !== null ||
          TOKEN_FIELDS.some((field) => raw[field] !== null) ||
          raw.coverage_complete !== false
        ) {
          problems.push(
            "unavailable_code requires null turns, null token counters, null recorded_cost and coverage_complete false",
          );
        }
      }
      break;
    }
    case "dispatch-inventory": {
      reference("orchestrator_ref");
      window();
      if (!nonNegativeInteger(raw.unrecorded_count)) problems.push("unrecorded_count must be a non-negative integer");
      break;
    }
    default:
      assertNever(raw.kind);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export function dispatchDomainIdentity(event: DispatchScopedEvent): { key: string; label: string } {
  switch (event.kind) {
    case "dispatch":
      return { key: `dispatch|${event.dispatch_id}`, label: `dispatch "${event.dispatch_id}"` };
    case "dispatch-round":
      return {
        key: `dispatch-round|${event.dispatch_id}|${event.round}`,
        label: `round ${event.round} of dispatch "${event.dispatch_id}"`,
      };
    case "dispatch-verdict":
      return {
        key: `dispatch-verdict|${event.dispatch_id}|${event.round}|${event.reviewer_ref}`,
        label: `verdict on round ${event.round} of dispatch "${event.dispatch_id}" by reviewer "${event.reviewer_ref}"`,
      };
    case "dispatch-acceptance":
      return {
        key: `dispatch-acceptance|${event.dispatch_id}`,
        label: `acceptance of dispatch "${event.dispatch_id}"`,
      };
    case "dispatch-end":
      return { key: `dispatch-end|${event.dispatch_id}`, label: `end of dispatch "${event.dispatch_id}"` };
    case "dispatch-usage":
      return {
        key: `dispatch-usage|${event.dispatch_id}|${event.actor}|${event.window_from}|${event.window_to}`,
        label: `usage of dispatch "${event.dispatch_id}" for actor "${event.actor}" over ${event.window_from}/${event.window_to}`,
      };
    case "dispatch-inventory":
      return {
        key: `dispatch-inventory|${event.change_id}|${event.orchestrator_ref}|${event.window_from}|${event.window_to}`,
        label: `inventory of change "${event.change_id}" for orchestrator "${event.orchestrator_ref}" over ${event.window_from}/${event.window_to}`,
      };
    default:
      return assertNever(event);
  }
}

/**
 * Canonicalizes `window_from` and `window_to` to `Date.toISOString()` form
 * (SRS-007). Identity, replay comparison, overlap and the unrecorded total all
 * see one spelling, so `...T00:00:00Z` and `...T00:00:00.000Z` are one window.
 * Call only after the timestamps validated.
 */
export function canonicalizeDispatchEvent(event: DeliveryEvent): DeliveryEvent {
  if (!isDispatchEvent(event)) return event;
  if (event.kind !== "dispatch-usage" && event.kind !== "dispatch-inventory") return event;
  return {
    ...event,
    window_from: new Date(event.window_from).toISOString(),
    window_to: new Date(event.window_to).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Referential, chronology and consistency invariants (SRS-002 to SRS-008)
// ---------------------------------------------------------------------------

/** True when two half-open `[from, to)` windows share any instant. */
function windowsOverlap(aFrom: number, aTo: number, bFrom: number, bTo: number): boolean {
  return aFrom < bTo && bFrom < aTo;
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

function checkReferences(events: DispatchScopedEvent[], dispatches: Map<string, DispatchEvent>): string[] {
  const problems: string[] = [];
  for (const event of events) {
    if (event.kind === "dispatch" || event.kind === "dispatch-inventory") continue;
    const dispatch = dispatches.get(event.dispatch_id);
    if (!dispatch) {
      problems.push(`event ${event.id}: ${event.kind} references unknown dispatch_id ${event.dispatch_id}`);
      continue;
    }
    if (dispatch.change_id !== event.change_id) {
      problems.push(
        `event ${event.id}: ${event.kind} change_id ${event.change_id} does not match dispatch ${event.dispatch_id} change ${dispatch.change_id}`,
      );
    }
    if (Date.parse(event.observed_at) < Date.parse(dispatch.observed_at)) {
      problems.push(
        `event ${event.id}: ${event.kind} observed at ${event.observed_at} precedes dispatch ${event.dispatch_id} at ${dispatch.observed_at}`,
      );
    }
  }
  return problems;
}

function checkRounds(roundsByDispatch: Map<string, DispatchRoundEvent[]>, ends: Map<string, DispatchEndEvent>): string[] {
  const problems: string[] = [];
  for (const [dispatchId, rounds] of roundsByDispatch) {
    const ordered = [...rounds].sort((a, b) => a.round - b.round);
    const expected = ordered.map((_, index) => index + 1);
    if (ordered.some((event, index) => event.round !== expected[index])) {
      problems.push(
        `dispatch ${dispatchId}: rounds must be numbered 1..n with no gaps; found ${ordered.map((event) => event.round).join(",")}`,
      );
    }
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      if (Date.parse(current.observed_at) <= Date.parse(previous.observed_at)) {
        problems.push(
          `event ${current.id}: round ${current.round} at ${current.observed_at} must be observed strictly after round ${previous.round} at ${previous.observed_at}`,
        );
      }
    }
    const end = ends.get(dispatchId);
    if (end) {
      for (const round of ordered) {
        if (Date.parse(round.observed_at) > Date.parse(end.observed_at)) {
          problems.push(
            `event ${round.id}: round ${round.round} at ${round.observed_at} is observed after dispatch-end ${end.id} at ${end.observed_at}`,
          );
        }
      }
    }
  }
  return problems;
}

function checkRoundReferences(events: DispatchScopedEvent[]): string[] {
  const problems: string[] = [];
  const rounds = new Map<string, Map<number, DispatchRoundEvent>>();
  for (const event of events) {
    if (event.kind !== "dispatch-round") continue;
    const byRound = rounds.get(event.dispatch_id) ?? new Map<number, DispatchRoundEvent>();
    byRound.set(event.round, event);
    rounds.set(event.dispatch_id, byRound);
  }
  for (const event of events) {
    if (event.kind !== "dispatch-verdict" && event.kind !== "dispatch-acceptance") continue;
    const round = rounds.get(event.dispatch_id)?.get(event.round);
    if (!round) {
      problems.push(
        `event ${event.id}: ${event.kind} references round ${event.round} of dispatch ${event.dispatch_id}, which has no matching round`,
      );
      continue;
    }
    if (Date.parse(event.observed_at) < Date.parse(round.observed_at)) {
      problems.push(
        `event ${event.id}: ${event.kind} at ${event.observed_at} precedes its round ${event.round} at ${round.observed_at}`,
      );
    }
    if (event.kind === "dispatch-acceptance") {
      const lastRound = Math.max(...[...(rounds.get(event.dispatch_id)?.keys() ?? [])]);
      if (event.round !== lastRound) {
        problems.push(
          `event ${event.id}: dispatch acceptance references round ${event.round} of dispatch ${event.dispatch_id}, which is not its last round (${lastRound})`,
        );
      }
    }
  }
  return problems;
}

/** SRS-005: the permitted `dispatch-end` × `dispatch-acceptance` combinations. */
function checkCombinations(
  acceptances: Map<string, { decision: "accepted" | "rejected"; id: string }>,
  ends: Map<string, DispatchEndEvent>,
): string[] {
  const problems: string[] = [];
  for (const [dispatchId, acceptance] of acceptances) {
    const end = ends.get(dispatchId);
    if (!end) {
      problems.push(
        `event ${acceptance.id}: dispatch acceptance of ${dispatchId} requires a dispatch-end; an absent terminal state permits no acceptance decision`,
      );
      continue;
    }
    if (acceptance.decision === "accepted" && end.state !== "completed") {
      problems.push(
        `event ${acceptance.id}: dispatch ${dispatchId} cannot be accepted after dispatch-end state "${end.state}"`,
      );
    }
  }
  return problems;
}

function checkUsageWindows(usage: DispatchUsageEvent[]): string[] {
  const problems: string[] = [];
  for (const [key, group] of groupBy(usage, (event) => `${event.dispatch_id}\n${event.actor}`)) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const left = group[i];
        const right = group[j];
        const from1 = Date.parse(left.window_from);
        const to1 = Date.parse(left.window_to);
        const from2 = Date.parse(right.window_from);
        const to2 = Date.parse(right.window_to);
        if (from1 === from2 && to1 === to2) continue;
        if (windowsOverlap(from1, to1, from2, to2)) {
          problems.push(
            `event ${right.id}: usage window ${right.window_from}/${right.window_to} overlaps ${left.window_from}/${left.window_to} for actor ${right.actor} of dispatch ${right.dispatch_id}; only identical replays are permitted`,
          );
        }
      }
    }
  }
  return problems;
}

function checkInventory(inventory: DispatchInventoryEvent[]): string[] {
  const problems: string[] = [];
  for (const [key, group] of groupBy(inventory, (event) => `${event.orchestrator_ref}\n${event.window_from}\n${event.window_to}`)) {
    const counts = new Set(group.map((event) => event.unrecorded_count));
    if (counts.size > 1) {
      problems.push(
        `event ${group[group.length - 1].id}: unrecorded_count for orchestrator ${key.replace(/\n/g, " ")} must be identical across every change it serves; found ${[...counts].join(", ")}`,
      );
    }
  }
  for (const [orchestrator, group] of groupBy(inventory, (event) => event.orchestrator_ref)) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const left = group[i];
        const right = group[j];
        const from1 = Date.parse(left.window_from);
        const to1 = Date.parse(left.window_to);
        const from2 = Date.parse(right.window_from);
        const to2 = Date.parse(right.window_to);
        if (from1 === from2 && to1 === to2) continue;
        if (windowsOverlap(from1, to1, from2, to2)) {
          problems.push(
            `event ${right.id}: inventory window ${right.window_from}/${right.window_to} overlaps ${left.window_from}/${left.window_to} for orchestrator ${orchestrator}; only identical replays are permitted`,
          );
        }
      }
    }
  }
  return problems;
}

/** SRS-002 to SRS-008 cross-event checks. A violation rejects the whole file. */
export function validateDispatchInvariants(events: DeliveryEvent[]): string[] {
  const scoped = events.filter(isDispatchEvent);
  if (scoped.length === 0) return [];

  const dispatches = new Map<string, DispatchEvent>();
  const ends = new Map<string, DispatchEndEvent>();
  const acceptances = new Map<string, { decision: "accepted" | "rejected"; id: string }>();
  const roundsByDispatch = new Map<string, DispatchRoundEvent[]>();
  for (const event of scoped) {
    switch (event.kind) {
      case "dispatch":
        dispatches.set(event.dispatch_id, event);
        break;
      case "dispatch-end":
        ends.set(event.dispatch_id, event);
        break;
      case "dispatch-acceptance":
        acceptances.set(event.dispatch_id, { decision: event.decision, id: event.id });
        break;
      case "dispatch-round":
        roundsByDispatch.set(event.dispatch_id, [...(roundsByDispatch.get(event.dispatch_id) ?? []), event]);
        break;
      default:
        break;
    }
  }

  return [
    ...checkReferences(scoped, dispatches),
    ...checkRounds(roundsByDispatch, ends),
    ...checkRoundReferences(scoped),
    ...checkCombinations(acceptances, ends),
    ...checkUsageWindows(scoped.filter((event): event is DispatchUsageEvent => event.kind === "dispatch-usage")),
    ...checkInventory(scoped.filter((event): event is DispatchInventoryEvent => event.kind === "dispatch-inventory")),
  ];
}

// ---------------------------------------------------------------------------
// Report aggregation (SRS-006, SRS-007 "Aggregation", SRS-008)
// ---------------------------------------------------------------------------

export interface DispatchOutcomeOptions {
  period: GitPeriod;
  observationsPath: string;
  intervalCovered: IntervalCovered;
}

function emptyUsage(): DispatchUsageSummary {
  return {
    events: 0,
    turns: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    recordedCost: 0,
    unknown: { turns: 0, inputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 0, recordedCost: 0 },
    missingPairs: 0,
    coverage: "complete",
  };
}

function addKnown(summary: DispatchUsageSummary, event: DispatchUsageEvent): void {
  summary.events += 1;
  if (event.turns === null) summary.unknown.turns += 1;
  else summary.turns += event.turns;
  const counters = [
    ["inputTokens", "input_tokens"],
    ["cachedInputTokens", "cached_input_tokens"],
    ["cacheWriteTokens", "cache_write_tokens"],
    ["outputTokens", "output_tokens"],
  ] as const;
  for (const [summaryKey, eventKey] of counters) {
    const value = event[eventKey];
    if (value === null) summary.unknown[summaryKey] += 1;
    else summary[summaryKey] += value;
  }
  if (event.recorded_cost === null) summary.unknown.recordedCost += 1;
  else summary.recordedCost += event.recorded_cost;
  if (!event.coverage_complete) summary.coverage = "partial";
}

/** Every column sums only known values and reports how many observations were unknown (SRS-007). */
function summarizeUsage(
  dispatches: DispatchEvent[],
  usageByDispatch: Map<string, DispatchUsageEvent[]>,
  actor: DispatchActor,
): DispatchUsageSummary {
  const summary = emptyUsage();
  const measured = new Set<string>();
  for (const dispatch of dispatches) {
    for (const event of usageByDispatch.get(dispatch.dispatch_id) ?? []) {
      if (event.actor !== actor) continue;
      addKnown(summary, event);
      // An unavailable event records the failure, not a measurement: the pair stays missing.
      if (event.unavailable_code === undefined) measured.add(dispatch.dispatch_id);
    }
  }
  summary.missingPairs = dispatches.filter((dispatch) => !measured.has(dispatch.dispatch_id)).length;
  if (summary.missingPairs > 0) summary.coverage = "partial";
  return summary;
}

function medianOrNull(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

interface RowAccumulator {
  role: string;
  model: string;
  dispatches: DispatchEvent[];
  rounds: number[];
  states: Record<DispatchEndState, number>;
  open: number;
  accepted: number;
  rejected: number;
  acceptanceUnknown: number;
  firstRoundAccepted: number;
}

function emptyRow(role: string, model: string): RowAccumulator {
  return {
    role,
    model,
    dispatches: [],
    rounds: [],
    states: { completed: 0, cancelled: 0, failed: 0, errored: 0 },
    open: 0,
    accepted: 0,
    rejected: 0,
    acceptanceUnknown: 0,
    firstRoundAccepted: 0,
  };
}

function accumulate(
  accumulator: RowAccumulator,
  dispatch: DispatchEvent,
  end: DispatchEndEvent | undefined,
  rounds: number,
  acceptance: { decision: "accepted" | "rejected"; round: number } | undefined,
): void {
  accumulator.dispatches.push(dispatch);
  if (!end) {
    accumulator.open += 1;
    return;
  }
  accumulator.states[end.state] += 1;
  accumulator.rounds.push(rounds);
  if (!acceptance) accumulator.acceptanceUnknown += 1;
  else if (acceptance.decision === "rejected") accumulator.rejected += 1;
  else {
    accumulator.accepted += 1;
    if (acceptance.round === 1) accumulator.firstRoundAccepted += 1;
  }
}

function finishRow(
  accumulator: RowAccumulator,
  usageByDispatch: Map<string, DispatchUsageEvent[]>,
  covered: boolean,
): DispatchOutcomeRow {
  const ended = accumulator.rounds.length;
  const roundsTotal = accumulator.rounds.reduce((sum, value) => sum + value, 0);
  return {
    role: accumulator.role,
    model: accumulator.model,
    dispatches: accumulator.dispatches.length,
    open: accumulator.open,
    completed: accumulator.states.completed,
    cancelled: accumulator.states.cancelled,
    failed: accumulator.states.failed,
    errored: accumulator.states.errored,
    ended,
    roundsMean: ended === 0 ? null : roundsTotal / ended,
    roundsMedian: ended >= 2 ? medianOrNull(accumulator.rounds) : null,
    accepted: accumulator.accepted,
    rejected: accumulator.rejected,
    acceptanceUnknown: accumulator.acceptanceUnknown,
    firstRoundAccepted: accumulator.firstRoundAccepted,
    coverage: covered ? "complete" : "partial",
    worker: summarizeUsage(accumulator.dispatches, usageByDispatch, "worker"),
    supervision: summarizeUsage(accumulator.dispatches, usageByDispatch, "supervision"),
  };
}

/**
 * Builds the dispatch cohort for `period` (SRS-006). Rows are keyed by
 * (`role`, `actual.model`); `unknown` is its own model value, never dropped and
 * never reassigned to the requested capability.
 */
export function buildDispatchOutcomes(input: DeliveryObservationSet, options: DispatchOutcomeOptions): DispatchOutcomes {
  const observations = input.observations;
  if (!observations) {
    const reason =
      input.issues.length > 0
        ? `delivery observations rejected: ${input.issues.map((issue) => issue.message).join("; ")}`
        : `no ${options.observationsPath} supplied`;
    return { available: false, reason };
  }

  const sinceMs = options.period.currentSince.getTime();
  const untilMs = options.period.currentUntil.getTime();
  const dispatchesInPeriod = observations.events.filter(
    (event): event is DispatchEvent =>
      event.kind === "dispatch" &&
      Date.parse(event.observed_at) >= sinceMs &&
      Date.parse(event.observed_at) < untilMs,
  );
  if (dispatchesInPeriod.length === 0) {
    return { available: false, reason: `no dispatch observation falls inside ${options.period.label}` };
  }

  const ends = new Map<string, DispatchEndEvent>();
  const roundsByDispatch = new Map<string, number>();
  const acceptances = new Map<string, { decision: "accepted" | "rejected"; round: number }>();
  const usageByDispatch = new Map<string, DispatchUsageEvent[]>();
  const inventory: DispatchInventoryEvent[] = [];
  for (const event of observations.events) {
    if (!isDispatchEvent(event)) continue;
    switch (event.kind) {
      case "dispatch-end":
        ends.set(event.dispatch_id, event);
        break;
      case "dispatch-round":
        roundsByDispatch.set(event.dispatch_id, (roundsByDispatch.get(event.dispatch_id) ?? 0) + 1);
        break;
      case "dispatch-acceptance":
        acceptances.set(event.dispatch_id, { decision: event.decision, round: event.round });
        break;
      case "dispatch-usage":
        usageByDispatch.set(event.dispatch_id, [...(usageByDispatch.get(event.dispatch_id) ?? []), event]);
        break;
      case "dispatch-inventory":
        inventory.push(event);
        break;
      default:
        break;
    }
  }

  const inventoryInPeriod = inventory.filter((event) =>
    windowsOverlap(Date.parse(event.window_from), Date.parse(event.window_to), sinceMs, untilMs),
  );
  const dispatchCovered = (dispatch: DispatchEvent): boolean => {
    const start = Date.parse(dispatch.observed_at);
    const end = ends.has(dispatch.dispatch_id)
      ? Date.parse(ends.get(dispatch.dispatch_id)?.observed_at ?? dispatch.observed_at)
      : untilMs;
    const spansRecordedKinds = DISPATCH_RECORDED_KINDS.every((kind) =>
      options.intervalCovered(dispatch.change_id, kind, dispatch.revision, start, end),
    );
    const conflicted = inventoryInPeriod.some(
      (event) => event.change_id === dispatch.change_id && event.unrecorded_count > 0,
    );
    return spansRecordedKinds && !conflicted;
  };

  const rows = new Map<string, RowAccumulator>();
  for (const dispatch of dispatchesInPeriod) {
    const key = `${dispatch.role}\n${dispatch.actual.model}`;
    const accumulator = rows.get(key) ?? emptyRow(dispatch.role, dispatch.actual.model);
    accumulate(
      accumulator,
      dispatch,
      ends.get(dispatch.dispatch_id),
      roundsByDispatch.get(dispatch.dispatch_id) ?? 0,
      acceptances.get(dispatch.dispatch_id),
    );
    rows.set(key, accumulator);
  }

  const unrecordedKeys = new Set<string>();
  let unrecorded = 0;
  for (const event of inventoryInPeriod) {
    const key = `${event.orchestrator_ref}\n${event.window_from}\n${event.window_to}`;
    if (unrecordedKeys.has(key)) continue;
    unrecordedKeys.add(key);
    unrecorded += event.unrecorded_count;
  }

  const finished: DispatchOutcomeRow[] = [];
  for (const accumulator of rows.values()) {
    const covered = accumulator.dispatches.every(dispatchCovered);
    finished.push(finishRow(accumulator, usageByDispatch, covered));
  }
  finished.sort((a, b) => a.role.localeCompare(b.role) || a.model.localeCompare(b.model));

  const missingPairs = finished.reduce((sum, row) => sum + row.worker.missingPairs + row.supervision.missingPairs, 0);
  const limitations = [
    `Source label "${observations.source_kind}" is attribution, not an authenticated origin.`,
    "Row coverage describes recorded dispatch events only; usage completeness is reported per actor.",
    ...(missingPairs > 0
      ? [`${missingPairs} expected dispatch/actor usage pair(s) have no dispatch-usage event; they are unknown, never zero.`]
      : []),
    ...(unrecorded > 0
      ? [
          `${unrecorded} host agent(s) created by a recording orchestrator had no dispatch event; every dispatch row for an affected change is partial.`,
        ]
      : []),
  ];

  return { available: true, source: options.observationsPath, rows: finished, unrecorded, limitations };
}
