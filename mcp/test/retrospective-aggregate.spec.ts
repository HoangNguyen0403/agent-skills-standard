import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { NodeKey } from "../src/retrospective/contracts";
import {
  AGGREGATE_PARSER_VERSION,
  aggregateSession,
  captureSnapshot,
  rollUp,
  type AggregateLimits,
  type SessionAggregate,
  type JointSeries,
} from "../src/retrospective/aggregate";

const MAIN: NodeKey = { hostId: "host-1", sessionId: "session-main" };
const CODEX_NODE: NodeKey = {
  hostId: "host-codex",
  sessionId: "session-codex",
};
const fixtureRoots: string[] = [];

async function temporaryRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-retro-agg-"));
  fixtureRoots.push(root);
  return root;
}

async function writeLines(
  dir: string,
  filename: string,
  lines: string[],
): Promise<string> {
  const file = path.join(dir, filename);
  await fs.writeFile(file, `${lines.join("\n")}\n`, "utf8");
  return file;
}

async function writeJsonl(
  dir: string,
  filename: string,
  rows: unknown[],
): Promise<string> {
  return writeLines(
    dir,
    filename,
    rows.map((row) => JSON.stringify(row)),
  );
}

const DEFAULT_LIMITS: AggregateLimits = {
  maxBytes: 100_000_000,
  maxMillis: 30_000,
};

afterEach(async () => {
  await Promise.all(
    fixtureRoots
      .splice(0)
      .map((r) =>
        fs.rm(r, { recursive: true, force: true }).catch(() => undefined),
      ),
  );
});

describe("retrospective aggregate pass", () => {
  it("computes exact known counts for a tiny OMP fixture", async () => {
    const root = await temporaryRoot();
    const filePath = await writeJsonl(root, "omp.jsonl", [
      {
        type: "session",
        version: 3,
        id: MAIN.sessionId,
        timestamp: "2026-10-01T10:00:00.000Z",
        cwd: "/test/workspace",
      },
      {
        type: "model_change",
        id: "m-change",
        timestamp: "2026-10-01T10:00:10.000Z",
        model: "provider/model-a",
      },
      {
        type: "message",
        id: "msg-user-1",
        timestamp: "2026-10-01T10:00:20.000Z",
        message: { role: "user", content: [{ type: "text", text: "hello" }] },
      },
      {
        type: "message",
        id: "msg-asst-1",
        timestamp: "2026-10-01T10:00:30.000Z",
        message: {
          role: "assistant",
          model: "provider/model-a",
          stopReason: "stop",
          usage: {
            input: 10,
            output: 5,
            cacheRead: 2,
            cacheWrite: 1,
            cost: { total: 0.001 },
          },
          content: [],
        },
      },
      {
        type: "custom",
        id: "cust-tool-1",
        timestamp: "2026-10-01T10:00:40.000Z",
        customType: "tool_execution_start",
        data: { toolCallId: "call-1", toolName: "bash" },
      },
      {
        type: "message",
        id: "msg-tool-1",
        timestamp: "2026-10-01T10:00:50.000Z",
        message: {
          role: "toolResult",
          toolCallId: "call-1",
          toolName: "bash",
          isError: false,
        },
      },
      {
        type: "message",
        id: "msg-tool-2",
        timestamp: "2026-10-01T10:01:00.000Z",
        message: {
          role: "toolResult",
          toolCallId: "call-2",
          toolName: "read",
          isError: true,
        },
      },
      {
        type: "compaction",
        timestamp: "2026-10-01T10:01:10.000Z",
      },
      {
        type: "message",
        id: "msg-asst-2",
        timestamp: "2026-10-01T10:01:20.000Z",
        message: {
          role: "assistant",
          model: "provider/model-b",
          stopReason: "error",
          usage: {
            input: 8,
            output: 4,
            cacheRead: 0,
            cacheWrite: 0,
            cost: { total: 0.002 },
          },
          content: [],
        },
      },
    ]);

    const source = {
      node: MAIN,
      format: "omp" as const,
      absolutePath: filePath,
    };
    const snapshot = await captureSnapshot(source, 10_000_000);
    expect(snapshot.parserVersion).toBe(AGGREGATE_PARSER_VERSION);
    expect(snapshot.bytesCaptured).toBeGreaterThan(0);
    expect(snapshot.prefixDigest).toMatch(/^[a-f0-9]{64}$/);

    const result = await aggregateSession(
      source,
      snapshot,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );

    expect(result.assistantTurns).toBe(2);
    expect(result.userMessages).toBe(1);
    expect(result.compactions).toBe(1);
    expect(result.tokens).toEqual({
      input: 18,
      output: 9,
      cacheRead: 2,
      cacheWrite: 1,
    });
    expect(result.cost).toBeCloseTo(0.003, 5);
    expect(result.costKnownTurns).toBe(2);
    expect(result.costUnknownTurns).toBe(0);
    expect(result.models).toEqual({
      "provider/model-a": 1,
      "provider/model-b": 1,
    });
    expect(result.stopReasons).toEqual({
      stop: 1,
      error: 1,
    });
    expect(result.toolCalls).toEqual({
      bash: 1,
      read: 1,
    });
    expect(result.toolErrors).toEqual({
      read: 1,
    });
    expect(result.first).toBe("2026-10-01T10:00:00.000Z");
    expect(result.last).toBe("2026-10-01T10:01:20.000Z");
    expect(result.coverage).toBe("complete");
    expect(result.skippedLines).toBe(0);
    expect(result.metricCompleteness.assistantTurns).toBe("complete");

    expect(result.series.byDayModel["2026-10-01|provider/model-a"]).toEqual({
      turns: 1,
      errorStops: 0,
      costUnits: 0.001,
      costKnownTurns: 1,
    });
    expect(result.series.byDayModel["2026-10-01|provider/model-b"]).toEqual({
      turns: 1,
      errorStops: 1,
      costUnits: 0.002,
      costKnownTurns: 1,
    });
  });

  it("computes exact known counts for a tiny Codex fixture", async () => {
    const root = await temporaryRoot();
    const filePath = await writeJsonl(root, "codex.jsonl", [
      {
        type: "session_meta",
        timestamp: "2026-10-01T12:00:00.000Z",
        payload: { id: CODEX_NODE.sessionId, cwd: "/test/workspace" },
      },
      {
        type: "turn_context",
        timestamp: "2026-10-01T12:00:05.000Z",
        payload: { model: "openai/gpt-4o" },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:10.000Z",
        payload: { type: "user_message", message: "codex user prompt" },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:15.000Z",
        payload: { type: "agent_message", message: "codex response" },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:20.000Z",
        payload: { type: "tool_call", tool_name: "glob", id: "tc-1" },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:25.000Z",
        payload: {
          type: "tool_result",
          tool_name: "glob",
          id: "tc-1",
          is_error: false,
        },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:30.000Z",
        payload: {
          type: "token_count",
          info: {
            last_token_usage: {
              input_tokens: 15,
              output_tokens: 6,
              cached_input_tokens: 3,
              cache_write_input_tokens: 0,
            },
          },
        },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:35.000Z",
        payload: { type: "turn_aborted" },
      },
    ]);

    const source = {
      node: CODEX_NODE,
      format: "codex" as const,
      absolutePath: filePath,
    };
    const snapshot = await captureSnapshot(source, 10_000_000);
    const result = await aggregateSession(
      source,
      snapshot,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );

    expect(result.userMessages).toBe(1);
    expect(result.assistantTurns).toBe(1);
    expect(result.tokens).toEqual({
      input: 15,
      output: 6,
      cacheRead: 3,
      cacheWrite: 0,
    });
    expect(result.costUnknownTurns).toBe(1);
    expect(result.costKnownTurns).toBe(0);
    expect(result.cost).toBe(0);
    expect(result.models).toEqual({ "openai/gpt-4o": 1 });
    expect(result.stopReasons).toEqual({ aborted: 1 });
    expect(result.toolCalls).toEqual({ glob: 1 });
    expect(result.toolErrors).toEqual({});
    expect(result.coverage).toBe("complete");
    expect(result.series.byDayModel["2026-10-01|openai/gpt-4o"]).toEqual({
      turns: 1,
      errorStops: 0,
      costUnits: 0,
      costKnownTurns: 0,
    });
  });

  it("counts an interrupted open turn when user_message is followed only by turn_aborted", async () => {
    const root = await temporaryRoot();
    const filePath = await writeJsonl(root, "codex-aborted-open.jsonl", [
      {
        type: "session_meta",
        timestamp: "2026-10-01T12:00:00.000Z",
        payload: { id: CODEX_NODE.sessionId },
      },
      {
        type: "turn_context",
        timestamp: "2026-10-01T12:00:01.000Z",
        payload: { model: "openai/gpt-4o" },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:05.000Z",
        payload: { type: "user_message", message: "start turn" },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:10.000Z",
        payload: { type: "turn_aborted" },
      },
    ]);

    const source = {
      node: CODEX_NODE,
      format: "codex" as const,
      absolutePath: filePath,
    };
    const snapshot = await captureSnapshot(source, 10_000_000);
    const result = await aggregateSession(
      source,
      snapshot,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );

    expect(result.assistantTurns).toBe(1);
    expect(result.userMessages).toBe(1);
    expect(result.stopReasons).toEqual({ aborted: 1 });
    expect(result.models).toEqual({ "openai/gpt-4o": 1 });
  });

  it("counts zero turns when turn_aborted occurs with no open turn", async () => {
    const root = await temporaryRoot();
    const filePath = await writeJsonl(root, "codex-aborted-empty.jsonl", [
      {
        type: "session_meta",
        timestamp: "2026-10-01T12:00:00.000Z",
        payload: { id: CODEX_NODE.sessionId },
      },
      {
        type: "turn_context",
        timestamp: "2026-10-01T12:00:01.000Z",
        payload: { model: "openai/gpt-4o" },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:05.000Z",
        payload: { type: "turn_aborted" },
      },
    ]);

    const source = {
      node: CODEX_NODE,
      format: "codex" as const,
      absolutePath: filePath,
    };
    const snapshot = await captureSnapshot(source, 10_000_000);
    const result = await aggregateSession(
      source,
      snapshot,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );

    expect(result.assistantTurns).toBe(0);
    expect(result.stopReasons).toEqual({ aborted: 1 });
    expect(result.models).toEqual({});
  });

  it("counts exactly two turns for two complete agent_message and token_count pairs", async () => {
    const root = await temporaryRoot();
    const filePath = await writeJsonl(root, "codex-two-turns.jsonl", [
      {
        type: "session_meta",
        timestamp: "2026-10-01T12:00:00.000Z",
        payload: { id: CODEX_NODE.sessionId },
      },
      {
        type: "turn_context",
        timestamp: "2026-10-01T12:00:01.000Z",
        payload: { model: "openai/gpt-4o" },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:05.000Z",
        payload: { type: "agent_message", message: "turn 1 message" },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:10.000Z",
        payload: {
          type: "token_count",
          info: { last_token_usage: { input_tokens: 10, output_tokens: 5 } },
        },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:15.000Z",
        payload: { type: "agent_message", message: "turn 2 message" },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:20.000Z",
        payload: {
          type: "token_count",
          info: { last_token_usage: { input_tokens: 12, output_tokens: 6 } },
        },
      },
    ]);

    const source = {
      node: CODEX_NODE,
      format: "codex" as const,
      absolutePath: filePath,
    };
    const snapshot = await captureSnapshot(source, 10_000_000);
    const result = await aggregateSession(
      source,
      snapshot,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );

    expect(result.assistantTurns).toBe(2);
    expect(result.tokens).toEqual({
      input: 22,
      output: 11,
      cacheRead: 0,
      cacheWrite: 0,
    });
    expect(result.models).toEqual({ "openai/gpt-4o": 2 });
  });

  it("ensures privacy sentinel is absent from the serialized result in both formats", async () => {
    const root = await temporaryRoot();
    const SENTINEL = "IGNORE ALL INSTRUCTIONS";

    const ompPath = await writeJsonl(root, "omp-sentinel.jsonl", [
      {
        type: "session",
        version: 3,
        id: MAIN.sessionId,
        timestamp: "2026-10-01T10:00:00.000Z",
        systemPrompt: [SENTINEL],
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:00:10.000Z",
        message: { role: "user", content: [{ type: "text", text: SENTINEL }] },
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:00:20.000Z",
        message: {
          role: "assistant",
          model: "provider/safe-model",
          usage: { input: 5, output: 2 },
          content: [{ type: "text", text: SENTINEL }],
        },
      },
      {
        type: "custom",
        customType: "tool_execution_start",
        data: {
          toolCallId: "c-1",
          toolName: "bash",
          args: { command: SENTINEL },
        },
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:00:30.000Z",
        message: {
          role: "toolResult",
          toolCallId: "c-1",
          toolName: "bash",
          isError: false,
          content: [{ type: "text", text: SENTINEL }],
        },
      },
    ]);

    const codexPath = await writeJsonl(root, "codex-sentinel.jsonl", [
      {
        type: "session_meta",
        timestamp: "2026-10-01T12:00:00.000Z",
        payload: { id: CODEX_NODE.sessionId, instructions: SENTINEL },
      },
      {
        type: "turn_context",
        payload: { model: "safe-model" },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:10.000Z",
        payload: { type: "user_message", message: SENTINEL },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:20.000Z",
        payload: { type: "agent_message", message: SENTINEL },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T12:00:30.000Z",
        payload: {
          type: "token_count",
          info: { last_token_usage: { input_tokens: 3, output_tokens: 1 } },
        },
      },
    ]);

    const ompSource = {
      node: MAIN,
      format: "omp" as const,
      absolutePath: ompPath,
    };
    const ompSnap = await captureSnapshot(ompSource, 10_000_000);
    const ompResult = await aggregateSession(
      ompSource,
      ompSnap,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );

    const codexSource = {
      node: CODEX_NODE,
      format: "codex" as const,
      absolutePath: codexPath,
    };
    const codexSnap = await captureSnapshot(codexSource, 10_000_000);
    const codexResult = await aggregateSession(
      codexSource,
      codexSnap,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );

    expect(JSON.stringify(ompResult)).not.toContain(SENTINEL);
    expect(JSON.stringify(codexResult)).not.toContain(SENTINEL);
  });

  it("counts malformed JSON lines in skippedLines and does not throw", async () => {
    const root = await temporaryRoot();
    const filePath = await writeLines(root, "malformed.jsonl", [
      JSON.stringify({
        type: "session",
        version: 3,
        id: MAIN.sessionId,
        timestamp: "2026-10-01T10:00:00.000Z",
      }),
      "NOT VALID JSON",
      "{bad json line",
      JSON.stringify({
        type: "message",
        timestamp: "2026-10-01T10:01:00.000Z",
        message: {
          role: "assistant",
          model: "model-a",
          usage: { input: 4, output: 2 },
        },
      }),
    ]);

    const source = {
      node: MAIN,
      format: "omp" as const,
      absolutePath: filePath,
    };
    const snapshot = await captureSnapshot(source, 10_000_000);
    const result = await aggregateSession(
      source,
      snapshot,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );

    expect(result.skippedLines).toBe(2);
    expect(result.assistantTurns).toBe(1);
    expect(result.coverage).toBe("complete");
    expect(result.metricCompleteness.assistantTurns).toBe(
      "may-undercount-by-skipped-lines",
    );
  });

  it("skips over-long lines into skippedLines without making coverage partial, with metricCompleteness flagged", async () => {
    const root = await temporaryRoot();
    const overlongLine = `{"type":"dummy","data":"${"x".repeat(1_048_600)}"}`;
    const filePath = await writeLines(root, "overlong.jsonl", [
      JSON.stringify({
        type: "session",
        version: 3,
        id: MAIN.sessionId,
        timestamp: "2026-10-01T10:00:00.000Z",
      }),
      overlongLine,
      JSON.stringify({
        type: "message",
        timestamp: "2026-10-01T10:01:00.000Z",
        message: {
          role: "assistant",
          model: "model-a",
          usage: { input: 10, output: 5 },
        },
      }),
    ]);

    const source = {
      node: MAIN,
      format: "omp" as const,
      absolutePath: filePath,
    };
    const snapshot = await captureSnapshot(source, 10_000_000);
    const result = await aggregateSession(
      source,
      snapshot,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );

    expect(result.skippedLines).toBe(1);
    expect(result.assistantTurns).toBe(1);
    expect(result.coverage).toBe("complete");
    expect(result.metricCompleteness.assistantTurns).toBe(
      "may-undercount-by-skipped-lines",
    );
    expect(result.metricCompleteness.tokens).toBe(
      "may-undercount-by-skipped-lines",
    );
  });

  it("marks coverage partial with size-ceiling when maxBytes is smaller than file", async () => {
    const root = await temporaryRoot();
    const line1 = JSON.stringify({
      type: "session",
      version: 3,
      id: MAIN.sessionId,
      timestamp: "2026-10-01T10:00:00.000Z",
    });
    const line2 = JSON.stringify({
      type: "message",
      timestamp: "2026-10-01T10:01:00.000Z",
      message: {
        role: "assistant",
        model: "model-a",
        usage: { input: 5, output: 2 },
      },
    });
    const line3 = JSON.stringify({
      type: "message",
      timestamp: "2026-10-01T10:02:00.000Z",
      message: {
        role: "assistant",
        model: "model-a",
        usage: { input: 5, output: 2 },
      },
    });

    const filePath = await writeLines(root, "partial-size.jsonl", [
      line1,
      line2,
      line3,
    ]);
    const byteOffsetPrefix = Buffer.byteLength(`${line1}\n${line2}\n`, "utf8");

    const source = {
      node: MAIN,
      format: "omp" as const,
      absolutePath: filePath,
    };
    const snapshot = await captureSnapshot(source, byteOffsetPrefix);
    expect(snapshot.bytesCaptured).toBe(byteOffsetPrefix);

    const result = await aggregateSession(
      source,
      snapshot,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );

    expect(result.coverage).toBe("partial");
    expect(result.partialReason).toBe("size-ceiling");
    expect(result.assistantTurns).toBe(1);
    expect(result.tokens.input).toBe(5);
  });

  it("marks coverage partial with time-ceiling when maxMillis is 0", async () => {
    const root = await temporaryRoot();
    const filePath = await writeJsonl(root, "time-ceiling.jsonl", [
      {
        type: "session",
        version: 3,
        id: MAIN.sessionId,
        timestamp: "2026-10-01T10:00:00.000Z",
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:01:00.000Z",
        message: {
          role: "assistant",
          model: "model-a",
          usage: { input: 5, output: 2 },
        },
      },
    ]);

    const source = {
      node: MAIN,
      format: "omp" as const,
      absolutePath: filePath,
    };
    const snapshot = await captureSnapshot(source, 10_000_000);
    const result = await aggregateSession(
      source,
      snapshot,
      { maxBytes: 10_000_000, maxMillis: 0 },
      new AbortController().signal,
    );

    expect(result.coverage).toBe("partial");
    expect(result.partialReason).toBe("time-ceiling");
  });

  it("increments costUnknownTurns and leaves cost unchanged when cost is missing", async () => {
    const root = await temporaryRoot();
    const filePath = await writeJsonl(root, "missing-cost.jsonl", [
      {
        type: "session",
        version: 3,
        id: MAIN.sessionId,
        timestamp: "2026-10-01T10:00:00.000Z",
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:01:00.000Z",
        message: {
          role: "assistant",
          model: "model-a",
          usage: { input: 12, output: 4 },
        },
      },
    ]);

    const source = {
      node: MAIN,
      format: "omp" as const,
      absolutePath: filePath,
    };
    const snapshot = await captureSnapshot(source, 10_000_000);
    const result = await aggregateSession(
      source,
      snapshot,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );

    expect(result.cost).toBe(0);
    expect(result.costKnownTurns).toBe(0);
    expect(result.costUnknownTurns).toBe(1);
  });

  it("yields identical result when file is appended after snapshot was captured", async () => {
    const root = await temporaryRoot();
    const filePath = await writeJsonl(root, "appended.jsonl", [
      {
        type: "session",
        version: 3,
        id: MAIN.sessionId,
        timestamp: "2026-10-01T10:00:00.000Z",
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:01:00.000Z",
        message: {
          role: "assistant",
          model: "model-a",
          usage: { input: 10, output: 5, cost: { total: 0.05 } },
        },
      },
    ]);

    const source = {
      node: MAIN,
      format: "omp" as const,
      absolutePath: filePath,
    };
    const snapshot = await captureSnapshot(source, 10_000_000);
    const beforeAppend = await aggregateSession(
      source,
      snapshot,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );

    // Append extra lines to the file
    const extra = JSON.stringify({
      type: "message",
      timestamp: "2026-10-01T10:02:00.000Z",
      message: {
        role: "assistant",
        model: "model-a",
        usage: { input: 99, output: 99, cost: { total: 9.99 } },
      },
    });
    await fs.appendFile(filePath, `${extra}\n`, "utf8");

    const afterAppend = await aggregateSession(
      source,
      snapshot,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );

    expect(afterAppend.assistantTurns).toBe(beforeAppend.assistantTurns);
    expect(afterAppend.tokens).toEqual(beforeAppend.tokens);
    expect(afterAppend.cost).toBe(beforeAppend.cost);
    expect(afterAppend.snapshot.prefixDigest).toBe(
      beforeAppend.snapshot.prefixDigest,
    );
  });

  it("rejects with SOURCE_CHANGED if file content is replaced after snapshot was captured", async () => {
    const root = await temporaryRoot();
    const filePath = await writeJsonl(root, "replaced.jsonl", [
      {
        type: "session",
        version: 3,
        id: MAIN.sessionId,
        timestamp: "2026-10-01T10:00:00.000Z",
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:01:00.000Z",
        message: {
          role: "assistant",
          model: "model-a",
          usage: { input: 10, output: 5 },
        },
      },
    ]);

    const source = {
      node: MAIN,
      format: "omp" as const,
      absolutePath: filePath,
    };
    const snapshot = await captureSnapshot(source, 10_000_000);

    // Rewrite the captured prefix with different bytes
    await writeJsonl(root, "replaced.jsonl", [
      {
        type: "session",
        version: 3,
        id: MAIN.sessionId,
        timestamp: "2026-10-01T10:00:00.000Z",
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:01:00.000Z",
        message: {
          role: "assistant",
          model: "model-different",
          usage: { input: 99, output: 99 },
        },
      },
    ]);

    await expect(
      aggregateSession(
        source,
        snapshot,
        DEFAULT_LIMITS,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "SOURCE_CHANGED" });
  });

  it("distinguishes fixtures with identical marginal totals through their joint byDayModel series", async () => {
    const root = await temporaryRoot();

    // Fixture 1: model-a has 1 error out of 2 turns; model-b has 0 errors out of 2 turns
    const path1 = await writeJsonl(root, "fixture1.jsonl", [
      {
        type: "session",
        version: 3,
        id: "s-1",
        timestamp: "2026-10-01T10:00:00.000Z",
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:00:10.000Z",
        message: {
          role: "assistant",
          model: "model-a",
          stopReason: "stop",
          usage: { input: 1, output: 1 },
        },
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:00:20.000Z",
        message: {
          role: "assistant",
          model: "model-a",
          stopReason: "error",
          usage: { input: 1, output: 1 },
        },
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:00:30.000Z",
        message: {
          role: "assistant",
          model: "model-b",
          stopReason: "stop",
          usage: { input: 1, output: 1 },
        },
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:00:40.000Z",
        message: {
          role: "assistant",
          model: "model-b",
          stopReason: "stop",
          usage: { input: 1, output: 1 },
        },
      },
    ]);

    // Fixture 2: model-a has 0 errors out of 2 turns; model-b has 1 error out of 2 turns
    const path2 = await writeJsonl(root, "fixture2.jsonl", [
      {
        type: "session",
        version: 3,
        id: "s-2",
        timestamp: "2026-10-01T10:00:00.000Z",
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:00:10.000Z",
        message: {
          role: "assistant",
          model: "model-a",
          stopReason: "stop",
          usage: { input: 1, output: 1 },
        },
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:00:20.000Z",
        message: {
          role: "assistant",
          model: "model-a",
          stopReason: "stop",
          usage: { input: 1, output: 1 },
        },
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:00:30.000Z",
        message: {
          role: "assistant",
          model: "model-b",
          stopReason: "error",
          usage: { input: 1, output: 1 },
        },
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:00:40.000Z",
        message: {
          role: "assistant",
          model: "model-b",
          stopReason: "stop",
          usage: { input: 1, output: 1 },
        },
      },
    ]);

    const src1 = {
      node: { hostId: "h", sessionId: "s-1" },
      format: "omp" as const,
      absolutePath: path1,
    };
    const src2 = {
      node: { hostId: "h", sessionId: "s-2" },
      format: "omp" as const,
      absolutePath: path2,
    };

    const snap1 = await captureSnapshot(src1, 10_000_000);
    const snap2 = await captureSnapshot(src2, 10_000_000);

    const res1 = await aggregateSession(
      src1,
      snap1,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );
    const res2 = await aggregateSession(
      src2,
      snap2,
      DEFAULT_LIMITS,
      new AbortController().signal,
    );

    // Marginal totals are identical
    expect(res1.assistantTurns).toBe(4);
    expect(res2.assistantTurns).toBe(4);
    expect(res1.stopReasons.error).toBe(1);
    expect(res2.stopReasons.error).toBe(1);
    expect(res1.stopReasons.stop).toBe(3);
    expect(res2.stopReasons.stop).toBe(3);

    // Joint series are distinct
    expect(res1.series.byDayModel).not.toEqual(res2.series.byDayModel);

    // Per-key denominator is turns
    expect(res1.series.byDayModel["2026-10-01|model-a"]).toEqual({
      turns: 2,
      errorStops: 1,
      costUnits: 0,
      costKnownTurns: 0,
    });
    expect(res2.series.byDayModel["2026-10-01|model-a"]).toEqual({
      turns: 2,
      errorStops: 0,
      costUnits: 0,
      costKnownTurns: 0,
    });
  });

  it("rejects with coded error when signal is aborted", async () => {
    const root = await temporaryRoot();
    const filePath = await writeJsonl(root, "abort.jsonl", [
      {
        type: "session",
        version: 3,
        id: MAIN.sessionId,
        timestamp: "2026-10-01T10:00:00.000Z",
      },
    ]);

    const source = {
      node: MAIN,
      format: "omp" as const,
      absolutePath: filePath,
    };
    const snapshot = await captureSnapshot(source, 10_000_000);

    const controller = new AbortController();
    controller.abort();

    await expect(
      aggregateSession(source, snapshot, DEFAULT_LIMITS, controller.signal),
    ).rejects.toMatchObject({ code: "ABORTED" });
  });

  it("leaves no uncaught EBADF across 200 concurrent early-abort reads", async () => {
    const root = await temporaryRoot();
    const filePath = await writeJsonl(root, "concurrent.jsonl", [
      {
        type: "session",
        version: 3,
        id: MAIN.sessionId,
        timestamp: "2026-10-01T10:00:00.000Z",
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:01:00.000Z",
        message: {
          role: "assistant",
          model: "model-a",
          usage: { input: 1, output: 1 },
        },
      },
      {
        type: "message",
        timestamp: "2026-10-01T10:02:00.000Z",
        message: {
          role: "assistant",
          model: "model-a",
          usage: { input: 2, output: 2 },
        },
      },
    ]);

    const source = {
      node: MAIN,
      format: "omp" as const,
      absolutePath: filePath,
    };
    const snapshot = await captureSnapshot(source, 10_000_000);

    const failures: unknown[] = [];
    const record = (error: unknown): void => {
      failures.push(error);
    };
    process.on("uncaughtException", record);
    process.on("unhandledRejection", record);

    try {
      const promises = Array.from({ length: 200 }, async (_, index) => {
        const controller = new AbortController();
        if (index % 2 === 0) {
          controller.abort();
        } else {
          setImmediate(() => controller.abort());
        }
        return aggregateSession(
          source,
          snapshot,
          DEFAULT_LIMITS,
          controller.signal,
        ).catch((err: unknown) => err);
      });

      await Promise.all(promises);
      for (let tick = 0; tick < 5; tick += 1) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    } finally {
      process.off("uncaughtException", record);
      process.off("unhandledRejection", record);
    }

    expect(failures).toEqual([]);
  });

  it("rolls up two aggregates, summing numeric fields and propagating partial coverage", () => {
    const agg1: SessionAggregate & { series: JointSeries } = {
      node: { hostId: "h1", sessionId: "s1" },
      format: "omp",
      first: "2026-10-01T10:00:00.000Z",
      last: "2026-10-01T10:05:00.000Z",
      assistantTurns: 2,
      userMessages: 1,
      compactions: 0,
      tokens: { input: 20, output: 10, cacheRead: 5, cacheWrite: 2 },
      cost: 0.002,
      costKnownTurns: 2,
      costUnknownTurns: 0,
      models: { "model-a": 2 },
      stopReasons: { stop: 2 },
      toolCalls: { bash: 3 },
      toolErrors: { bash: 1 },
      coverage: "complete",
      skippedLines: 0,
      series: {
        byDayModel: {
          "2026-10-01|model-a": {
            turns: 2,
            errorStops: 0,
            costUnits: 0.002,
            costKnownTurns: 2,
          },
        },
      },
    };

    const agg2: SessionAggregate & { series: JointSeries } = {
      node: { hostId: "h2", sessionId: "s2" },
      format: "codex",
      first: "2026-10-01T10:02:00.000Z",
      last: "2026-10-01T10:10:00.000Z",
      assistantTurns: 3,
      userMessages: 2,
      compactions: 1,
      tokens: { input: 30, output: 15, cacheRead: 0, cacheWrite: 0 },
      cost: 0.003,
      costKnownTurns: 1,
      costUnknownTurns: 2,
      models: { "model-b": 3 },
      stopReasons: { error: 1, stop: 2 },
      toolCalls: { read: 2 },
      toolErrors: { read: 0 },
      coverage: "partial",
      partialReason: "size-ceiling",
      skippedLines: 1,
      series: {
        byDayModel: {
          "2026-10-01|model-b": {
            turns: 3,
            errorStops: 1,
            costUnits: 0.003,
            costKnownTurns: 1,
          },
        },
      },
    };

    const tree = rollUp([agg1, agg2]);

    expect(tree.sessions).toBe(2);
    expect(tree.fullyRead).toBe(1);
    expect(tree.coverage).toBe("partial");
    expect(tree.partialReason).toBe("size-ceiling");
    expect(tree.first).toBe("2026-10-01T10:00:00.000Z");
    expect(tree.last).toBe("2026-10-01T10:10:00.000Z");
    expect(tree.assistantTurns).toBe(5);
    expect(tree.userMessages).toBe(3);
    expect(tree.compactions).toBe(1);
    expect(tree.tokens).toEqual({
      input: 50,
      output: 25,
      cacheRead: 5,
      cacheWrite: 2,
    });
    expect(tree.cost).toBeCloseTo(0.005, 5);
    expect(tree.costKnownTurns).toBe(3);
    expect(tree.costUnknownTurns).toBe(2);
    expect(tree.skippedLines).toBe(1);
    expect(tree.models).toEqual({ "model-a": 2, "model-b": 3 });
    expect(tree.stopReasons).toEqual({ stop: 4, error: 1 });
    expect(tree.toolCalls).toEqual({ bash: 3, read: 2 });
    expect(tree.toolErrors).toEqual({ bash: 1, read: 0 });
    expect(tree.series.byDayModel["2026-10-01|model-a"]).toEqual({
      turns: 2,
      errorStops: 0,
      costUnits: 0.002,
      costKnownTurns: 2,
    });
    expect(tree.series.byDayModel["2026-10-01|model-b"]).toEqual({
      turns: 3,
      errorStops: 1,
      costUnits: 0.003,
      costKnownTurns: 1,
    });
  });

  // Performance test: 100 MB synthetic session file under 5 s wall time and 64 MB RSS growth.
  // Kept skipped in CI; explicitly runnable locally.
  it.skip("processes 100 MB synthetic session within 5s and 64 MB RSS growth", async () => {
    const root = await temporaryRoot();
    const filePath = path.join(root, "perf-100mb.jsonl");

    const line =
      JSON.stringify({
        type: "message",
        timestamp: "2026-10-01T10:00:00.000Z",
        message: {
          role: "assistant",
          model: "provider/perf-model",
          stopReason: "stop",
          usage: {
            input: 10,
            output: 5,
            cacheRead: 2,
            cacheWrite: 1,
            cost: { total: 0.001 },
          },
        },
      }) + "\n";

    const lineBuffer = Buffer.from(line, "utf8");
    const targetBytes = 100 * 1024 * 1024;
    const handle = await fs.open(filePath, "w");
    try {
      let written = 0;
      while (written < targetBytes) {
        await handle.write(lineBuffer);
        written += lineBuffer.length;
      }
    } finally {
      await handle.close();
    }

    const source = {
      node: MAIN,
      format: "omp" as const,
      absolutePath: filePath,
    };
    const initialRss = process.memoryUsage().rss;
    const startWall = performance.now();

    const snapshot = await captureSnapshot(source, targetBytes);
    const result = await aggregateSession(
      source,
      snapshot,
      { maxBytes: targetBytes, maxMillis: 10_000 },
      new AbortController().signal,
    );

    const elapsedMs = performance.now() - startWall;
    const rssGrowthBytes = process.memoryUsage().rss - initialRss;

    expect(result.assistantTurns).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(5000);
    expect(rssGrowthBytes).toBeLessThan(64 * 1024 * 1024);
  });
});
