import { createReadStream } from "node:fs";
import {
  boundedLines,
  nativeSessionHeader,
  type NativeSessionHeader,
} from "./SessionJournal";

/**
 * Turn-level orchestrator reader (SRS-007 "Supervision through
 * OrchestratorTrace"). One transcript is streamed in order; entries before the
 * window are replayed only to set the attribution pointer, never charged.
 *
 * The attribution rule is fixed: each in-window assistant turn is charged whole
 * to the dispatch it last addressed by agent id, otherwise to the dispatch whose
 * notification arrived last; a plain user message clears the pointer. Turns with
 * no pointer are reported as unattributed and never assigned.
 */

/** Fixed identifier of the attribution rule, written into every `dispatch-usage` (SRS-007). */
export const SUPERVISION_METHOD_REF = "last-addressed-v1";

export interface TraceUsage {
  /** `null` only when the transcript could not be read at all. */
  turns: number | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  cacheWriteTokens: number | null;
  outputTokens: number | null;
  recordedCost: number | null;
}

export type TraceStatus = "resolved" | "unresolved" | "identity-mismatch";

export interface OrchestratorTraceInput {
  path: string;
  /** The orchestrator's expected native identity; every transcript is bound to its own (SRS-010). */
  expectedSessionId: string;
  /** Agent ids that may receive a charge: the dispatches recorded for this import. */
  dispatchIds: readonly string[];
  startedAt: string;
  completedAt: string;
}

export interface OrchestratorTraceResult {
  status: TraceStatus;
  usage: Map<string, TraceUsage>;
  unattributed: TraceUsage;
  /** Agent ids the orchestrator created inside the window (SRS-008 inventory input). */
  createdAgentIds: string[];
  malformedLines: number;
}

const NOTIFICATION =
  /<paseo-system[^>]*kind="agent-notification"[^>]*source-agent-id="([^"]+)"[^>]*event="([^"]+)"/;

const COUNTER_FIELDS = ["input", "cacheRead", "cacheWrite", "output"] as const;
type CounterField = (typeof COUNTER_FIELDS)[number];

interface ChargedTurn {
  counters: Record<CounterField, number | null>;
  cost: number | null;
  agentIds: string[];
}

interface Accumulator {
  turns: number;
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  recordedCost: number;
  inputKnown: boolean;
  cacheKnown: boolean;
  cacheWriteKnown: boolean;
  outputKnown: boolean;
  costKnown: boolean;
}

function emptyAccumulator(): Accumulator {
  return {
    turns: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    recordedCost: 0,
    inputKnown: true,
    cacheKnown: true,
    cacheWriteKnown: true,
    outputKnown: true,
    costKnown: true,
  };
}

function unknownUsage(): TraceUsage {
  return {
    turns: null,
    inputTokens: null,
    cachedInputTokens: null,
    cacheWriteTokens: null,
    outputTokens: null,
    recordedCost: null,
  };
}

function finish(accumulator: Accumulator): TraceUsage {
  return {
    turns: accumulator.turns,
    inputTokens: accumulator.inputKnown ? accumulator.inputTokens : null,
    cachedInputTokens: accumulator.cacheKnown
      ? accumulator.cachedInputTokens
      : null,
    cacheWriteTokens: accumulator.cacheWriteKnown
      ? accumulator.cacheWriteTokens
      : null,
    outputTokens: accumulator.outputKnown ? accumulator.outputTokens : null,
    recordedCost: accumulator.costKnown ? accumulator.recordedCost : null,
  };
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A non-negative finite integer, or `null` when the host did not report it. */
function counter(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function textOf(content: unknown): string {
  if (!Array.isArray(content))
    return typeof content === "string" ? content : "";
  return content
    .map((part) =>
      object(part) && typeof part.text === "string" ? part.text : "",
    )
    .join(" ");
}

function chargedTurn(message: Record<string, unknown>): ChargedTurn {
  const usage = object(message.usage) ? message.usage : {};
  const cost = object(usage.cost) ? usage.cost.total : undefined;
  const counters = {
    input: null,
    cacheRead: null,
    cacheWrite: null,
    output: null,
  } as Record<CounterField, number | null>;
  for (const field of COUNTER_FIELDS) counters[field] = counter(usage[field]);
  const agentIds: string[] = [];
  if (Array.isArray(message.content)) {
    for (const block of message.content) {
      if (!object(block) || block.type !== "toolCall") continue;
      const args = object(block.arguments) ? block.arguments : {};
      if (typeof args.agentId === "string" && args.agentId)
        agentIds.push(args.agentId);
    }
  }
  return {
    counters,
    cost:
      typeof cost === "number" && Number.isFinite(cost) && cost >= 0
        ? cost
        : null,
    agentIds,
  };
}

function charge(accumulator: Accumulator, turn: ChargedTurn): void {
  accumulator.turns += 1;
  if (turn.counters.input === null) accumulator.inputKnown = false;
  else if (accumulator.inputKnown)
    accumulator.inputTokens += turn.counters.input;
  if (turn.counters.cacheRead === null) accumulator.cacheKnown = false;
  else if (accumulator.cacheKnown)
    accumulator.cachedInputTokens += turn.counters.cacheRead;
  if (turn.counters.cacheWrite === null) accumulator.cacheWriteKnown = false;
  else if (accumulator.cacheWriteKnown)
    accumulator.cacheWriteTokens += turn.counters.cacheWrite;
  if (turn.counters.output === null) accumulator.outputKnown = false;
  else if (accumulator.outputKnown)
    accumulator.outputTokens += turn.counters.output;
  if (turn.cost === null) accumulator.costKnown = false;
  else if (accumulator.costKnown) accumulator.recordedCost += turn.cost;
}

/** Reads one orchestrator transcript. Never throws for content: a broken read is a status. */
export async function readOrchestratorTrace(
  input: OrchestratorTraceInput,
): Promise<OrchestratorTraceResult> {
  const registry = new Set(input.dispatchIds);
  const perDispatch = new Map<string, Accumulator>();
  const unattributed = emptyAccumulator();
  const createdAgentIds: string[] = [];
  const result: OrchestratorTraceResult = {
    status: "resolved",
    usage: new Map(),
    unattributed: finish(unattributed),
    createdAgentIds,
    malformedLines: 0,
  };

  const startedAt = Date.parse(input.startedAt);
  const completedAt = Date.parse(input.completedAt);
  const stream = createReadStream(input.path);
  const pendingCreates = new Set<string>();
  let headerSeen = false;
  let pointer: string | null = null;

  try {
    for await (const { line, tooLong } of boundedLines(stream)) {
      if (tooLong) {
        result.malformedLines += 1;
        break;
      }
      if (line === null || !line.trim()) continue;
      let row: unknown;
      try {
        row = JSON.parse(line);
      } catch {
        result.malformedLines += 1;
        continue;
      }
      if (!object(row)) {
        result.malformedLines += 1;
        continue;
      }
      if (!headerSeen && row.type === "title") continue;
      if (!headerSeen) {
        headerSeen = true;
        let header: NativeSessionHeader;
        try {
          header = nativeSessionHeader(row, "omp");
        } catch {
          return {
            ...result,
            status: "unresolved",
            usage: new Map(),
            unattributed: unknownUsage(),
          };
        }
        if (header.id !== input.expectedSessionId) {
          return {
            ...result,
            status: "identity-mismatch",
            usage: new Map(),
            unattributed: unknownUsage(),
          };
        }
        continue;
      }
      if (row.type !== "message" || !object(row.message)) continue;
      const message = row.message;
      const time =
        typeof row.timestamp === "string" ? Date.parse(row.timestamp) : NaN;
      if (!Number.isFinite(time)) {
        result.malformedLines += 1;
        continue;
      }
      if (time >= completedAt) break;
      const inWindow = time >= startedAt;
      const role = message.role;

      if (role === "assistant") {
        const turn = chargedTurn(message);
        for (const block of Array.isArray(message.content)
          ? message.content
          : []) {
          if (!object(block) || block.type !== "toolCall") continue;
          if (block.name !== "create_agent" || typeof block.id !== "string")
            continue;
          pendingCreates.add(block.id);
        }
        // The pointer follows the identity actually addressed last, recorded or
        // not: an unrecorded target must stop the charge, not be filtered away.
        const target: string | null =
          turn.agentIds.length > 0
            ? turn.agentIds[turn.agentIds.length - 1]
            : pointer;
        pointer = target;
        if (!inWindow) continue;
        if (target === null || !registry.has(target)) {
          charge(unattributed, turn);
          continue;
        }
        const accumulator = perDispatch.get(target) ?? emptyAccumulator();
        charge(accumulator, turn);
        perDispatch.set(target, accumulator);
        continue;
      }

      if (role === "toolResult" && message.toolName === "create_agent") {
        const details = object(message.details) ? message.details : {};
        const toolCallId =
          typeof message.toolCallId === "string" ? message.toolCallId : null;
        const agentId =
          typeof details.agentId === "string" ? details.agentId : null;
        if (
          !inWindow ||
          !agentId ||
          toolCallId === null ||
          !pendingCreates.delete(toolCallId)
        )
          continue;
        createdAgentIds.push(agentId);
        continue;
      }

      if (role === "user") {
        // A notification points at its own agent id, recorded or not; a plain user
        // message clears the pointer.
        const found = NOTIFICATION.exec(textOf(message.content));
        pointer = found ? found[1] : null;
      }
    }
  } catch {
    return {
      ...result,
      status: "unresolved",
      usage: new Map(),
      unattributed: unknownUsage(),
    };
  } finally {
    stream.destroy();
  }

  if (!headerSeen) {
    return {
      ...result,
      status: "unresolved",
      usage: new Map(),
      unattributed: unknownUsage(),
    };
  }
  return {
    ...result,
    usage: new Map(
      [...perDispatch].map(([id, accumulator]) => [id, finish(accumulator)]),
    ),
    unattributed: finish(unattributed),
  };
}
