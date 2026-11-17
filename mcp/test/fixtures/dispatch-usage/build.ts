import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Dispatch-usage fixture tree (AC-011, AC-012, AC-015).
 *
 * Everything here is synthetic. Records deliberately carry titles, prompt text
 * and absolute paths so the redaction tests can prove none of them is emitted.
 * The window is `[2026-10-02T00:00:00.000Z, 2026-10-03T00:00:00.000Z)` and one
 * worker session spans its start.
 */

export const FIXTURE = {
  windowFrom: "2026-10-02T00:00:00.000Z",
  windowTo: "2026-10-03T00:00:00.000Z",
  titles: [
    "SECRET-TITLE-ORCHESTRATOR",
    "SECRET-TITLE-WORKER-A",
    "SECRET-TITLE-WORKER-B",
  ],
  prompts: ["SECRET-PROMPT-FIRST", "SECRET-PROMPT-SECOND"],
  orchestratorRef: "sess-orch",
  orchestratorAgent: "orch-1",
  dispatchA: "agent-a",
  dispatchB: "agent-b",
  sessionA: "sess-a",
  sessionB: "sess-b",
  changeA: "change-1",
  changeB: "change-2",
} as const;

export interface DispatchFixture {
  root: string;
  workspace: string;
  observationsPath: string;
  paseoHome: string;
  transcripts: { orchestrator: string; workerA: string; workerB: string };
  /** Absolute paths that must never appear in output. */
  hiddenPaths: string[];
}

function message(
  timestamp: string,
  id: string,
  body: Record<string, unknown>,
): Record<string, unknown> {
  return { type: "message", id, timestamp, message: body };
}

function usage(
  input: number,
  output: number,
  cost: number,
  cache?: { read: number; write: number },
) {
  return {
    input,
    output,
    ...(cache ? { cacheRead: cache.read, cacheWrite: cache.write } : {}),
    totalTokens: input + output,
    cost: { total: cost },
  };
}

async function writeJsonl(
  file: string,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(
    file,
    `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
  );
}

/** Drops the host-reported cost and cache counters of the named turns. */
function withoutCost(
  rows: Array<Record<string, unknown>>,
  turnIds: readonly string[],
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    if (typeof row.id !== "string" || !turnIds.includes(row.id)) return row;
    const message = row.message;
    if (typeof message !== "object" || message === null) return row;
    const body = { ...(message as Record<string, unknown>) };
    const usage = { ...(body.usage as Record<string, unknown>) };
    delete usage.cost;
    delete usage.cacheRead;
    delete usage.cacheWrite;
    return { ...row, message: { ...body, usage } };
  });
}

export async function buildDispatchFixture(
  root: string,
  options: {
    swapWorkerRecords?: boolean;
    sparseUsageTurnIds?: readonly string[];
  } = {},
): Promise<DispatchFixture> {
  const workspace = path.join(root, "workspace");
  await mkdir(workspace, { recursive: true });
  const transcripts = {
    orchestrator: path.join(root, "transcripts", "orchestrator.jsonl"),
    workerA: path.join(root, "transcripts", "worker-a.jsonl"),
    workerB: path.join(root, "transcripts", "worker-b.jsonl"),
  };
  const paseoHome = path.join(root, "paseo");

  const orchestratorRows: Array<Record<string, unknown>> = [
    { type: "title", title: FIXTURE.titles[0] },
    {
      type: "session",
      version: 3,
      id: FIXTURE.orchestratorRef,
      cwd: workspace,
      timestamp: "2026-10-01T19:00:00.000Z",
    },
    message("2026-10-01T19:30:00.000Z", "o-user-1", {
      role: "user",
      content: [{ type: "text", text: `${FIXTURE.prompts[0]} plan the work` }],
    }),
    // Before the window: replayed only to set the pointer.
    message("2026-10-01T20:00:00.000Z", "o-1", {
      role: "assistant",
      model: "orch-model",
      usage: usage(500, 100, 0.5),
      content: [
        {
          type: "toolCall",
          id: "call-1",
          name: "create_agent",
          arguments: { title: FIXTURE.titles[0] },
        },
      ],
    }),
    message("2026-10-01T20:01:00.000Z", "o-result-1", {
      role: "toolResult",
      toolCallId: "call-1",
      toolName: "create_agent",
      details: { agentId: FIXTURE.dispatchA },
      content: [{ type: "text", text: `${FIXTURE.prompts[0]}` }],
    }),
    message("2026-10-01T20:05:00.000Z", "o-2", {
      role: "assistant",
      model: "orch-model",
      usage: usage(600, 120, 0.6),
      content: [
        {
          type: "toolCall",
          id: "call-2",
          name: "send_agent_prompt",
          arguments: { agentId: FIXTURE.dispatchA },
        },
      ],
    }),
    // Notification sets the pointer, a plain user message clears it.
    message("2026-10-01T23:00:00.000Z", "o-user-2", {
      role: "user",
      content: [
        {
          type: "text",
          text: `<paseo-system version="1" kind="agent-notification" source-agent-id="${FIXTURE.dispatchB}" event="finished">${FIXTURE.prompts[0]}</paseo-system>`,
        },
      ],
    }),
    message("2026-10-01T23:30:00.000Z", "o-user-3", {
      role: "user",
      content: [{ type: "text", text: "continue" }],
    }),
    // Inside the window: no pointer yet, so this turn is unattributed.
    message("2026-10-02T00:10:00.000Z", "o-3", {
      role: "assistant",
      model: "orch-model",
      usage: usage(200, 50, 0.2, { read: 0, write: 0 }),
      content: [],
    }),
    // Inside the window: dispatches three agents and addresses agent-a.
    message("2026-10-02T00:20:00.000Z", "o-4", {
      role: "assistant",
      model: "orch-model",
      usage: usage(1000, 500, 0.3, { read: 4000, write: 0 }),
      content: [
        {
          type: "toolCall",
          id: "call-3",
          name: "create_agent",
          arguments: { title: FIXTURE.titles[1] },
        },
        {
          type: "toolCall",
          id: "call-4",
          name: "create_agent",
          arguments: { title: FIXTURE.prompts[1] },
        },
        {
          type: "toolCall",
          id: "call-5",
          name: "create_agent",
          arguments: { title: "unrecorded" },
        },
        {
          type: "toolCall",
          id: "call-6",
          name: "send_agent_prompt",
          arguments: { agentId: FIXTURE.dispatchA },
        },
      ],
    }),
    message("2026-10-02T00:22:00.000Z", "o-result-3", {
      role: "toolResult",
      toolCallId: "call-3",
      toolName: "create_agent",
      details: { agentId: FIXTURE.dispatchB },
      content: [{ type: "text", text: "created" }],
    }),
    message("2026-10-02T00:23:00.000Z", "o-result-4", {
      role: "toolResult",
      toolCallId: "call-4",
      toolName: "create_agent",
      details: { agentId: "agent-c" },
      content: [{ type: "text", text: "created" }],
    }),
    message("2026-10-02T00:24:00.000Z", "o-result-5", {
      role: "toolResult",
      toolCallId: "call-5",
      toolName: "create_agent",
      details: { agentId: "agent-d" },
      content: [{ type: "text", text: "created" }],
    }),
    message("2026-10-02T00:30:00.000Z", "o-5", {
      role: "assistant",
      model: "orch-model",
      usage: usage(500, 200, 0.25, { read: 1000, write: 0 }),
      content: [],
    }),
    message("2026-10-02T00:40:00.000Z", "o-user-4", {
      role: "user",
      content: [
        {
          type: "text",
          text: `<paseo-system version="1" kind="agent-notification" source-agent-id="${FIXTURE.dispatchB}" event="finished">done</paseo-system>`,
        },
      ],
    }),
    message("2026-10-02T00:50:00.000Z", "o-6", {
      role: "assistant",
      model: "orch-model",
      usage: usage(300, 60, 0.05, { read: 0, write: 0 }),
      content: [],
    }),
    // After the window: never charged.
    message("2026-10-03T00:20:00.000Z", "o-7", {
      role: "assistant",
      model: "orch-model",
      usage: usage(1, 1, 9),
      content: [],
    }),
  ];
  await writeJsonl(
    transcripts.orchestrator,
    options.sparseUsageTurnIds
      ? withoutCost(orchestratorRows, options.sparseUsageTurnIds)
      : orchestratorRows,
  );

  await writeJsonl(transcripts.workerA, [
    { type: "title", title: FIXTURE.titles[1] },
    {
      type: "session",
      version: 3,
      id: FIXTURE.sessionA,
      cwd: workspace,
      timestamp: "2026-10-01T21:00:00.000Z",
    },
    // Same session, before the window: must not be counted.
    message("2026-10-01T22:00:00.000Z", "a-1", {
      role: "assistant",
      model: "worker-model",
      usage: usage(999, 99, 9.99),
    }),
    message("2026-10-02T01:00:00.000Z", "a-2", {
      role: "assistant",
      model: "worker-model",
      usage: usage(100, 20, 0.0035, { read: 40, write: 10 }),
    }),
    message("2026-10-02T02:00:00.000Z", "a-3", {
      role: "assistant",
      model: "worker-model",
      usage: usage(200, 30, 0.007, { read: 0, write: 0 }),
    }),
  ]);

  await writeJsonl(transcripts.workerB, [
    { type: "title", title: FIXTURE.titles[2] },
    {
      type: "session",
      version: 3,
      id: FIXTURE.sessionB,
      cwd: workspace,
      timestamp: "2026-10-02T02:30:00.000Z",
    },
    message("2026-10-02T03:00:00.000Z", "b-1", {
      role: "assistant",
      model: "worker-model",
      usage: usage(50, 5, 0.001),
    }),
  ]);

  const agentRecords = [
    {
      id: FIXTURE.orchestratorAgent,
      createdAt: "2026-10-01T19:00:00.000Z",
      title: FIXTURE.titles[0],
      prompt: FIXTURE.prompts[0],
      persistence: {
        nativeHandle: transcripts.orchestrator,
        sessionId: FIXTURE.orchestratorRef,
      },
    },
    {
      id: FIXTURE.dispatchA,
      createdAt: "2026-10-01T20:01:00.000Z",
      title: FIXTURE.titles[1],
      prompt: FIXTURE.prompts[0],
      persistence: {
        nativeHandle: options.swapWorkerRecords
          ? transcripts.workerB
          : transcripts.workerA,
        sessionId: FIXTURE.sessionA,
      },
    },
    {
      id: FIXTURE.dispatchB,
      createdAt: "2026-10-02T00:22:00.000Z",
      title: FIXTURE.titles[2],
      prompt: FIXTURE.prompts[1],
      persistence: {
        nativeHandle: options.swapWorkerRecords
          ? transcripts.workerA
          : transcripts.workerB,
        sessionId: FIXTURE.sessionB,
      },
    },
  ];
  for (const record of agentRecords) {
    const directory = path.join(paseoHome, "agents", record.id);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "agent.json"), JSON.stringify(record));
  }

  const observationsPath = path.join(
    root,
    "artifacts",
    "metrics",
    "delivery-observations.json",
  );
  await mkdir(path.dirname(observationsPath), { recursive: true });
  await writeFile(
    observationsPath,
    JSON.stringify({
      schema_version: 1,
      source_kind: "operator-recorded",
      coverage: [],
      events: [
        {
          kind: "dispatch",
          id: "dispatch#agent-a",
          change_id: FIXTURE.changeA,
          revision: "rev-1",
          observed_at: "2026-10-02T06:00:00.000Z",
          source_ref: "operator-local",
          dispatch_id: FIXTURE.dispatchA,
          role: "implementation",
          capability_hint: "standard",
          actual: {
            provider: "provider-x",
            model: "model-a",
            effort: "medium",
          },
          authority_ref: "maintainer",
          orchestrator_model: "orch-model",
          orchestrator_ref: FIXTURE.orchestratorRef,
        },
        {
          kind: "dispatch",
          id: "dispatch#agent-b",
          change_id: FIXTURE.changeB,
          revision: "rev-2",
          observed_at: "2026-10-02T06:05:00.000Z",
          source_ref: "operator-local",
          dispatch_id: FIXTURE.dispatchB,
          role: "review",
          capability_hint: "strong",
          actual: { provider: "provider-x", model: "model-b", effort: "high" },
          authority_ref: "maintainer",
          orchestrator_model: "orch-model",
          orchestrator_ref: FIXTURE.orchestratorRef,
        },
      ],
    }),
  );

  return {
    root,
    workspace,
    observationsPath,
    paseoHome,
    transcripts,
    hiddenPaths: [
      path.join(root, "transcripts"),
      transcripts.orchestrator,
      transcripts.workerA,
      transcripts.workerB,
      paseoHome,
      observationsPath,
    ],
  };
}
