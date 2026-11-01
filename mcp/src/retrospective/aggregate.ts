import { constants } from "node:fs";
import { open, type FileHandle } from "node:fs/promises";
import crypto from "node:crypto";
import type { Readable } from "node:stream";
import { DEFAULT_LIMITS, type NodeKey } from "./contracts";
import { RetrospectiveError } from "./rules";

export { RetrospectiveError };

export type SideCalls = {
  calls: number;
  stopReasons: Record<string, number>;
  cost: number;
  costKnownCalls: number;
};

export type SessionAggregate = {
  node: NodeKey;
  format: "omp" | "codex";
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
  coverage: "complete" | "partial";
  partialReason?: "size-ceiling" | "time-ceiling" | "unreadable-lines";
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
};

export type TreeAggregate = {
  sessions: number;
  fullyRead: number;
  coverage: "complete" | "partial";
  partialReason?: "size-ceiling" | "time-ceiling" | "unreadable-lines";
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
  skippedLines: number;
  metricCompleteness: MetricCompleteness;
  series: JointSeries;
};

/** One session aggregate plus the joint series and per-metric completeness rollUp consumes. */
export type AggregatedSession = SessionAggregate & {
  series: JointSeries;
  metricCompleteness: MetricCompleteness;
};

export const AGGREGATE_PARSER_VERSION = "1.0.0";

const READ_FLAGS =
  constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
const MAX_IDENTIFIER_LENGTH = 128;
const MAX_MAP_KEYS = 256;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    map["other"] = (map["other"] ?? 0) + increment;
    return;
  }
  map[key] = increment;
}

function recordJointEntry(
  series: JointSeries,
  day: string,
  model: string,
  turns: number,
  errorStops: number,
  costUnits: number,
  costKnownTurns: number,
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
  });
  entry.turns += turns;
  entry.errorStops += errorStops;
  entry.costUnits += costUnits;
  entry.costKnownTurns += costKnownTurns;
}

export async function captureSnapshot(
  source: { node: NodeKey; absolutePath: string },
  maxBytes: number,
): Promise<SourceSnapshot> {
  if (!Number.isFinite(maxBytes) || maxBytes < 0) {
    throw new RangeError("maxBytes must be a nonnegative integer");
  }
  let handle: FileHandle | undefined;
  try {
    handle = await open(source.absolutePath, READ_FLAGS);
    const stats = await handle.stat();
    if (!stats.isFile()) {
      throw new RetrospectiveError(
        "SOURCE_UNAVAILABLE",
        "Source is not a regular file",
      );
    }
    const fileSize = Number(stats.size);
    const bytesCaptured = Math.max(0, Math.min(fileSize, maxBytes));
    const hash = crypto.createHash("sha256");

    if (bytesCaptured > 0) {
      const stream = handle.createReadStream({
        autoClose: false,
        start: 0,
        end: bytesCaptured - 1,
      });
      stream.on("error", () => undefined);
      for await (const chunk of stream) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        hash.update(buffer);
      }
    }

    const prefixDigest = hash.digest("hex");
    return {
      node: { ...source.node },
      bytesCaptured,
      prefixDigest,
      parserVersion: AGGREGATE_PARSER_VERSION,
    };
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

export async function aggregateSession(
  source: { node: NodeKey; format: "omp" | "codex"; absolutePath: string },
  snapshot: SourceSnapshot,
  limits: AggregateLimits,
  signal: AbortSignal,
): Promise<
  SessionAggregate & {
    series: JointSeries;
    snapshot: SourceSnapshot;
    metricCompleteness: MetricCompleteness;
  }
> {
  if (signal.aborted) {
    throw new RetrospectiveError("ABORTED", "Aggregate pass was aborted");
  }

  let handle: FileHandle | undefined;
  let stream: Readable | undefined;
  const abortHandler = (): void => {
    stream?.destroy();
  };
  signal.addEventListener("abort", abortHandler, { once: true });

  try {
    handle = await open(source.absolutePath, READ_FLAGS);
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
    let skippedLines = 0;
    const series: JointSeries = { byDayModel: {} };

    let currentModel: string | undefined;
    // Codex turn accounting is a conservative assumption pending real Codex fixtures.
    let codexTurnOpen = false;
    let codexPreviousTotal: { input: number; output: number } | null = null;
    let codexLastOnlySinceTotal = { input: 0, output: 0 };
    const seenToolCallIds = new Set<string>();

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

    const processOmpRow = (row: Record<string, unknown>): void => {
      updateTimestamps(row.timestamp);

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
        return;
      }

      if (row.type === "custom") {
        if (row.customType === "compaction") {
          compactions += 1;
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
        updateTimestamps(msg.timestamp);

        if (msg.role === "user") {
          userMessages += 1;
          return;
        }

        if (msg.role === "compaction") {
          compactions += 1;
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

          const stopReason =
            typeof msg.stopReason === "string"
              ? boundIdentifier(msg.stopReason)
              : undefined;
          if (stopReason) {
            recordBoundedMap(stopReasons, stopReason);
          }

          let turnCost: number | null = null;
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
          );

          if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if (
                isObject(part) &&
                (part.type === "toolCall" || part.type === "tool_use")
              ) {
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
            }
          }
        }
      }
    };

    const processCodexRow = (row: Record<string, unknown>): void => {
      updateTimestamps(row.timestamp);

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
            recordJointEntry(series, day, modelName, 1, 0, 0, 0);
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
            recordJointEntry(series, day, modelName, 1, 0, 0, 0);
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
      if (source.format === "omp") {
        processOmpRow(row);
      } else {
        processCodexRow(row);
      }
    };

    const processLineBuffer = (buf: Buffer): void => {
      if (timeCeiling) return;
      const text = buf.toString("utf8").trim();
      if (!text) return;
      let row: unknown;
      try {
        row = JSON.parse(text);
      } catch {
        skippedLines += 1;
        return;
      }
      processRow(row);
    };

    if (snapshot.bytesCaptured > 0) {
      stream = handle.createReadStream({
        autoClose: false,
        start: 0,
        end: snapshot.bytesCaptured - 1,
      });
      stream.on("error", () => undefined);

      let parts: Buffer[] = [];
      let currentLength = 0;
      let tooLong = false;
      const lineLimit = DEFAULT_LIMITS.lineBytes;

      for await (const chunk of stream) {
        if (signal.aborted) {
          throw new RetrospectiveError("ABORTED", "Aggregate pass was aborted");
        }
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        hash.update(buffer);

        if (!timeCeiling && Date.now() - startedAt >= limits.maxMillis) {
          timeCeiling = true;
        }

        let start = 0;
        for (let index = 0; index < buffer.length; index += 1) {
          if (buffer[index] !== 0x0a) continue;
          const segment = buffer.subarray(start, index);
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

        if (start < buffer.length) {
          const remainder = buffer.subarray(start);
          if (!tooLong) {
            if (currentLength + remainder.length > lineLimit) {
              tooLong = true;
              parts = [];
              currentLength = 0;
            } else {
              parts.push(remainder);
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

    let coverage: "complete" | "partial" = "complete";
    let partialReason:
      "size-ceiling" | "time-ceiling" | "unreadable-lines" | undefined =
      undefined;

    if (sizeCeiling) {
      coverage = "partial";
      partialReason = "size-ceiling";
    } else if (timeCeiling) {
      coverage = "partial";
      partialReason = "time-ceiling";
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
    };

    return {
      node: { ...source.node },
      format: source.format,
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
    signal.removeEventListener("abort", abortHandler);
    stream?.destroy();
    await handle?.close().catch(() => undefined);
  }
}

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
  let skippedLines = 0;
  const series: JointSeries = { byDayModel: {} };
  const metricCompleteness: MetricCompleteness = {};

  for (const agg of aggregates) {
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
      });
      entry.turns += v.turns;
      entry.errorStops += v.errorStops;
      entry.costUnits += v.costUnits;
      entry.costKnownTurns += v.costKnownTurns;
    }
  }

  let partialReason:
    "size-ceiling" | "time-ceiling" | "unreadable-lines" | undefined =
    undefined;

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
    }
  }

  return {
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
    skippedLines,
    metricCompleteness,
    series,
  };
}
