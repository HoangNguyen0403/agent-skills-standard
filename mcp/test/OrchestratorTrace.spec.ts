import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readOrchestratorTrace } from "../src/services/OrchestratorTrace";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots
      .splice(0)
      .map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

async function transcript(
  rows: Array<Record<string, unknown>>,
): Promise<{ root: string; file: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-trace-"));
  roots.push(root);
  const file = path.join(root, "orchestrator.jsonl");
  await fs.writeFile(
    file,
    `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
  );
  return { root, file };
}

const header = (id: string) => ({
  type: "session",
  version: 3,
  id,
  cwd: "/synthetic/workspace",
  timestamp: "2026-10-01T00:00:00.000Z",
});

const turn = (
  timestamp: string,
  id: string,
  body: { input: number; output: number; cost: number; agents?: string[] },
) => ({
  type: "message",
  id,
  timestamp,
  message: {
    role: "assistant",
    model: "orch-model",
    usage: {
      input: body.input,
      output: body.output,
      totalTokens: body.input + body.output,
      cost: { total: body.cost },
    },
    content: (body.agents ?? []).map((agentId, index) => ({
      type: "toolCall",
      id: `${id}-call-${index}`,
      name: "send_agent_prompt",
      arguments: { agentId },
    })),
  },
});

const user = (timestamp: string, id: string, text: string) => ({
  type: "message",
  id,
  timestamp,
  message: { role: "user", content: [{ type: "text", text }] },
});

const notification = (timestamp: string, id: string, agentId: string) =>
  user(
    timestamp,
    id,
    `<paseo-system version="1" kind="agent-notification" source-agent-id="${agentId}" event="finished">done</paseo-system>`,
  );

const WINDOW = {
  from: "2026-10-02T00:00:00.000Z",
  to: "2026-10-03T00:00:00.000Z",
};

describe("readOrchestratorTrace", () => {
  it("replays entries before the window to set the pointer and charges in-window turns whole", async () => {
    const { file } = await transcript([
      header("sess-orch"),
      user("2026-10-01T09:00:00.000Z", "u-1", "start"),
      turn("2026-10-01T10:00:00.000Z", "t-0", {
        input: 900,
        output: 90,
        cost: 9,
        agents: ["agent-a"],
      }),
      notification("2026-10-01T23:00:00.000Z", "n-1", "agent-b"),
      turn("2026-10-01T23:30:00.000Z", "t-1", {
        input: 700,
        output: 70,
        cost: 7,
      }),
      turn("2026-10-02T00:10:00.000Z", "t-2", {
        input: 100,
        output: 10,
        cost: 1,
      }),
      turn("2026-10-02T00:20:00.000Z", "t-3", {
        input: 200,
        output: 20,
        cost: 2,
        agents: ["agent-a"],
      }),
      turn("2026-10-02T00:30:00.000Z", "t-4", {
        input: 300,
        output: 30,
        cost: 3,
      }),
      turn("2026-10-03T00:30:00.000Z", "t-5", {
        input: 400,
        output: 40,
        cost: 4,
      }),
    ]);
    const trace = await readOrchestratorTrace({
      path: file,
      expectedSessionId: "sess-orch",
      dispatchIds: ["agent-a", "agent-b"],
      startedAt: WINDOW.from,
      completedAt: WINDOW.to,
    });

    expect(trace.status).toBe("resolved");
    expect(trace.malformedLines).toBe(0);
    // The 23:00 notification set the pointer during replay, so t-2 is charged to
    // agent-b; t-3 re-aims it at agent-a and t-4 keeps it; t-5 is outside.
    // No turn was charged without a pointer: a measured zero, not an unknown.
    expect(trace.unattributed).toEqual({
      turns: 0,
      inputTokens: 0,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      recordedCost: 0,
    });
    expect(trace.usage.get("agent-a")).toEqual({
      turns: 2,
      inputTokens: 500,
      cachedInputTokens: null,
      cacheWriteTokens: null,
      outputTokens: 50,
      recordedCost: 5,
    });
    expect(trace.usage.get("agent-b")).toEqual({
      turns: 1,
      inputTokens: 100,
      cachedInputTokens: null,
      cacheWriteTokens: null,
      outputTokens: 10,
      recordedCost: 1,
    });
    // Pre-window turns (t-0, t-1) are replayed for the pointer only.
    expect(trace.usage.get("agent-a")?.turns).toBe(2);
  });

  it("clears the pointer on a plain user message and charges a notified dispatch otherwise", async () => {
    const { file } = await transcript([
      header("sess-orch"),
      turn("2026-10-02T01:00:00.000Z", "t-1", {
        input: 10,
        output: 1,
        cost: 1,
        agents: ["agent-a"],
      }),
      notification("2026-10-02T01:10:00.000Z", "n-1", "agent-b"),
      turn("2026-10-02T01:20:00.000Z", "t-2", {
        input: 20,
        output: 2,
        cost: 2,
      }),
      user("2026-10-02T01:30:00.000Z", "u-1", "plain user message"),
      turn("2026-10-02T01:40:00.000Z", "t-3", {
        input: 30,
        output: 3,
        cost: 3,
      }),
    ]);
    const trace = await readOrchestratorTrace({
      path: file,
      expectedSessionId: "sess-orch",
      dispatchIds: ["agent-a", "agent-b"],
      startedAt: WINDOW.from,
      completedAt: WINDOW.to,
    });

    expect(trace.usage.get("agent-a")).toMatchObject({
      turns: 1,
      recordedCost: 1,
    });
    expect(trace.usage.get("agent-b")).toMatchObject({
      turns: 1,
      recordedCost: 2,
    });
    expect(trace.unattributed).toMatchObject({ turns: 1, recordedCost: 3 });
  });

  it("keeps unknown counters unknown instead of zero for a charged turn", async () => {
    const { file } = await transcript([
      header("sess-orch"),
      turn("2026-10-02T01:00:00.000Z", "t-1", {
        input: 10,
        output: 1,
        cost: 1,
        agents: ["agent-a"],
      }),
      {
        type: "message",
        id: "t-2",
        timestamp: "2026-10-02T01:10:00.000Z",
        message: {
          role: "assistant",
          model: "m",
          usage: { input: 5, output: 1, totalTokens: 6 },
          content: [],
        },
      },
    ]);
    const trace = await readOrchestratorTrace({
      path: file,
      expectedSessionId: "sess-orch",
      dispatchIds: ["agent-a"],
      startedAt: WINDOW.from,
      completedAt: WINDOW.to,
    });
    expect(trace.usage.get("agent-a")).toEqual({
      turns: 2,
      inputTokens: 15,
      cachedInputTokens: null,
      cacheWriteTokens: null,
      outputTokens: 2,
      recordedCost: null,
    });
  });

  it("counts only agents created inside the window", async () => {
    const createTurn = (timestamp: string, id: string, callId: string) => ({
      type: "message",
      id,
      timestamp,
      message: {
        role: "assistant",
        model: "m",
        usage: { input: 1, output: 1, totalTokens: 2, cost: { total: 0.01 } },
        content: [
          { type: "toolCall", id: callId, name: "create_agent", arguments: {} },
        ],
      },
    });
    const created = (
      timestamp: string,
      id: string,
      callId: string,
      agentId: string,
    ) => ({
      type: "message",
      id,
      timestamp,
      message: {
        role: "toolResult",
        toolCallId: callId,
        toolName: "create_agent",
        details: { agentId },
        content: [],
      },
    });
    const { file } = await transcript([
      header("sess-orch"),
      createTurn("2026-10-01T10:00:00.000Z", "t-1", "call-1"),
      created("2026-10-01T10:01:00.000Z", "r-1", "call-1", "agent-old"),
      createTurn("2026-10-02T01:00:00.000Z", "t-2", "call-2"),
      created("2026-10-02T01:01:00.000Z", "r-2", "call-2", "agent-new"),
    ]);
    const trace = await readOrchestratorTrace({
      path: file,
      expectedSessionId: "sess-orch",
      dispatchIds: [],
      startedAt: WINDOW.from,
      completedAt: WINDOW.to,
    });
    expect(trace.createdAgentIds).toEqual(["agent-new"]);
  });

  it("keeps the last addressed identity including unrecorded agents", async () => {
    const { file } = await transcript([
      header("sess-orch"),
      turn("2026-10-02T01:00:00.000Z", "t-1", {
        input: 10,
        output: 1,
        cost: 1,
        agents: ["agent-a"],
      }),
      turn("2026-10-02T01:10:00.000Z", "t-2", {
        input: 20,
        output: 2,
        cost: 2,
        agents: ["agent-a", "unrecorded-agent"],
      }),
      turn("2026-10-02T01:20:00.000Z", "t-3", {
        input: 30,
        output: 3,
        cost: 3,
      }),
    ]);
    const trace = await readOrchestratorTrace({
      path: file,
      expectedSessionId: "sess-orch",
      dispatchIds: ["agent-a"],
      startedAt: WINDOW.from,
      completedAt: WINDOW.to,
    });

    // Only t-1 addressed agent-a alone; the pointer then belongs to an agent with
    // no recorded dispatch, so t-2 and t-3 are unattributed.
    expect(trace.usage.get("agent-a")).toMatchObject({
      turns: 1,
      recordedCost: 1,
    });
    expect(trace.unattributed).toMatchObject({ turns: 2, recordedCost: 5 });
  });

  it("points at an unknown notifying agent instead of the previous dispatch", async () => {
    const { file } = await transcript([
      header("sess-orch"),
      turn("2026-10-02T01:00:00.000Z", "t-1", {
        input: 10,
        output: 1,
        cost: 1,
        agents: ["agent-a"],
      }),
      notification("2026-10-02T01:10:00.000Z", "n-1", "unrecorded-agent"),
      turn("2026-10-02T01:20:00.000Z", "t-2", {
        input: 20,
        output: 2,
        cost: 2,
      }),
    ]);
    const trace = await readOrchestratorTrace({
      path: file,
      expectedSessionId: "sess-orch",
      dispatchIds: ["agent-a"],
      startedAt: WINDOW.from,
      completedAt: WINDOW.to,
    });

    expect(trace.usage.get("agent-a")).toMatchObject({
      turns: 1,
      recordedCost: 1,
    });
    expect(trace.unattributed).toMatchObject({ turns: 1, recordedCost: 2 });
  });

  it("reports an identity mismatch without charging anything", async () => {
    const { file } = await transcript([
      header("sess-other"),
      turn("2026-10-02T01:00:00.000Z", "t-1", {
        input: 10,
        output: 1,
        cost: 1,
        agents: ["agent-a"],
      }),
    ]);
    const trace = await readOrchestratorTrace({
      path: file,
      expectedSessionId: "sess-orch",
      dispatchIds: ["agent-a"],
      startedAt: WINDOW.from,
      completedAt: WINDOW.to,
    });
    expect(trace.status).toBe("identity-mismatch");
    expect(trace.usage.size).toBe(0);
    expect(trace.unattributed.recordedCost).toBeNull();
  });

  it("reports an unresolved transcript when it cannot be read or has no header", async () => {
    const missing = await readOrchestratorTrace({
      path: path.join(os.tmpdir(), "ags-trace-does-not-exist.jsonl"),
      expectedSessionId: "sess-orch",
      dispatchIds: [],
      startedAt: WINDOW.from,
      completedAt: WINDOW.to,
    });
    expect(missing.status).toBe("unresolved");

    const { file } = await transcript([
      { type: "session", version: 3, id: "sess-orch" },
    ]);
    const headerless = await readOrchestratorTrace({
      path: file,
      expectedSessionId: "sess-orch",
      dispatchIds: [],
      startedAt: WINDOW.from,
      completedAt: WINDOW.to,
    });
    expect(headerless.status).toBe("unresolved");
  });
});
