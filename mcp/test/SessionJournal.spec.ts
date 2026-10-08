import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectSessionJournal,
  type SessionManifest,
} from "../src/services/SessionJournal";

interface Fixture {
  root: string;
  workspace: string;
  session: string;
  manifestPath: string;
  manifest: SessionManifest;
}

const roots: string[] = [];

async function fixture(): Promise<Fixture> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-accounting-"));
  roots.push(root);
  const workspace = path.join(root, "workspace");
  await fs.mkdir(workspace);
  const session = path.join(root, "session.jsonl");
  const manifestPath = path.join(root, "manifest.json");
  const manifest = {
    workspace,
    startedAt: "2026-10-01T10:00:00.000Z",
    completedAt: "2026-10-01T10:10:00.000Z",
    sessions: [
      {
        path: session,
        format: "codex",
        role: "implementation",
        attemptOutcome: "completed",
      },
    ],
    expectedSessionIds: ["session-1"],
    phaseWindows: [],
  };
  const records = [
    {
      timestamp: "2026-10-01T09:58:00.000Z",
      type: "session_meta",
      payload: { id: "session-1", cwd: workspace },
    },
    {
      timestamp: "2026-10-01T09:58:30.000Z",
      type: "turn_context",
      payload: { model: "model-a" },
    },
  ];
  await fs.writeFile(
    session,
    records.map((record) => JSON.stringify(record)).join("\n") + "\n",
  );
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  return { root, workspace, session, manifestPath, manifest };
}

function codexCumulative(
  timestamp: string,
  input: number,
  cached: number,
  output: number,
) {
  return {
    timestamp,
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        total_token_usage: {
          input_tokens: input,
          cached_input_tokens: cached,
          output_tokens: output,
          reasoning_output_tokens: 0,
          auxiliary_tokens: 0,
        },
      },
    },
  };
}

function codexEvent(timestamp: string, output: number, id?: string) {
  return {
    timestamp,
    type: "event_msg",
    ...(id ? { id } : {}),
    payload: {
      type: "token_count",
      info: {
        last_token_usage: {
          input_tokens: 0,
          cached_input_tokens: 0,
          output_tokens: output,
          reasoning_output_tokens: 0,
          auxiliary_tokens: 0,
        },
      },
    },
  };
}

async function save(f: Fixture, records: unknown[]) {
  await fs.writeFile(
    f.session,
    records.map((record) => JSON.stringify(record)).join("\n") + "\n",
  );
  await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
}

afterEach(async () => {
  await Promise.all(
    roots
      .splice(0)
      .map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe("collectSessionJournal", () => {
  it("charges only the in-window cumulative delta across a model change", async () => {
    const f = await fixture();
    f.manifest.startedAt = "2026-10-01T10:00:00.000Z";
    f.manifest.completedAt = "2026-10-01T10:05:00.000Z";
    f.manifest.phaseWindows = [
      {
        phase: "delivery",
        startedAt: f.manifest.startedAt,
        completedAt: f.manifest.completedAt,
      },
    ];
    f.manifest.sessions[0].attemptOutcome = null;
    await save(f, [
      {
        timestamp: "2026-10-01T09:58:00.000Z",
        type: "session_meta",
        payload: { id: "session-1", cwd: f.workspace },
      },
      {
        timestamp: "2026-10-01T09:58:30.000Z",
        type: "turn_context",
        payload: { model: "model-a" },
      },
      codexCumulative("2026-10-01T09:59:00.000Z", 100, 20, 10),
      {
        timestamp: "2026-10-01T10:00:30.000Z",
        type: "turn_context",
        payload: { model: "model-b" },
      },
      codexCumulative("2026-10-01T10:01:00.000Z", 150, 30, 15),
      {
        ...codexCumulative("2026-10-01T10:02:00.000Z", 150, 30, 15),
        payload: {
          type: "token_count",
          info: {
            total_token_usage: {
              input_tokens: 150,
              cached_input_tokens: 30,
              output_tokens: 15,
              reasoning_output_tokens: 0,
              auxiliary_tokens: 0,
            },
            last_token_usage: {
              input_tokens: 50,
              cached_input_tokens: 10,
              output_tokens: 5,
              reasoning_output_tokens: 0,
              auxiliary_tokens: 0,
            },
          },
        },
      },
    ]);
    const result = await collectSessionJournal(f.manifestPath);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      role: "implementation",
      model: "model-b",
      phase: "delivery",
      attemptOutcome: null,
      uncachedInputTokens: 40,
      cachedInputTokens: 10,
      outputTokens: 5,
      recordedCostEstimate: null,
    });
  });

  it("assigns boundary usage once, preserves gaps, and counts failed and retried actors separately", async () => {
    const f = await fixture();
    const failedPath = path.join(f.root, "failed.jsonl");
    const retriedPath = path.join(f.root, "retry.jsonl");
    f.manifest.startedAt = "2026-10-01T10:00:00.000Z";
    f.manifest.completedAt = "2026-10-01T10:10:00.000Z";
    f.manifest.phaseWindows = [
      {
        phase: "planning",
        startedAt: "2026-10-01T10:00:00.000Z",
        completedAt: "2026-10-01T10:05:00.000Z",
      },
      {
        phase: "repair",
        startedAt: "2026-10-01T10:05:00.000Z",
        completedAt: "2026-10-01T10:10:00.000Z",
      },
    ];
    f.manifest.sessions.push(
      {
        path: failedPath,
        format: "codex",
        role: "implementation",
        attemptOutcome: "failed",
      },
      {
        path: retriedPath,
        format: "codex",
        role: "implementation",
        attemptOutcome: "retried",
      },
    );
    f.manifest.expectedSessionIds.push("failed-1", "retry-1");
    const rows = (id: string, out: number, t: string) => [
      {
        timestamp: "2026-10-01T09:59:00.000Z",
        type: "session_meta",
        payload: { id, cwd: f.workspace },
      },
      codexEvent(t, out),
    ];
    await fs.writeFile(
      f.session,
      rows("session-1", 3, "2026-10-01T10:04:00.000Z")
        .map(JSON.stringify)
        .join("\n") +
        "\n" +
        JSON.stringify(codexEvent("2026-10-01T10:05:00.000Z", 7)) +
        "\n",
    );
    await fs.writeFile(
      failedPath,
      rows("failed-1", 2, "2026-10-01T10:06:00.000Z")
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    await fs.writeFile(
      retriedPath,
      rows("retry-1", 4, "2026-10-01T10:07:00.000Z")
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    const result = await collectSessionJournal(f.manifestPath);
    expect(
      result.groups.reduce((sum, group) => sum + group.outputTokens, 0),
    ).toBe(16);
    expect(
      result.groups.map((group) => [
        group.phase,
        group.attemptOutcome,
        group.outputTokens,
      ]),
    ).toEqual([
      ["planning", "completed", 3],
      ["repair", "completed", 7],
      ["repair", "failed", 2],
      ["repair", "retried", 4],
    ]);
    f.manifest.sessions = [f.manifest.sessions[0]];
    f.manifest.expectedSessionIds = ["session-1"];
    f.manifest.startedAt = "2026-10-01T10:00:00.000Z";
    f.manifest.completedAt = "2026-10-01T10:05:00.000Z";
    f.manifest.phaseWindows = [
      {
        phase: "planning",
        startedAt: f.manifest.startedAt,
        completedAt: f.manifest.completedAt,
      },
    ];
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    expect(
      (await collectSessionJournal(f.manifestPath)).groups.reduce(
        (sum, group) => sum + (group.outputTokens ?? 0),
        0,
      ),
    ).toBe(3);
    f.manifest.startedAt = "2026-10-01T10:05:00.000Z";
    f.manifest.completedAt = "2026-10-01T10:10:00.000Z";
    f.manifest.phaseWindows = [
      {
        phase: "repair",
        startedAt: f.manifest.startedAt,
        completedAt: f.manifest.completedAt,
      },
    ];
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    expect(
      (await collectSessionJournal(f.manifestPath)).groups.reduce(
        (sum, group) => sum + (group.outputTokens ?? 0),
        0,
      ),
    ).toBe(7);
  });

  it("preserves OMP native input/cache buckets and recorded cost without double counting reasoning", async () => {
    const f = await fixture();
    const ompPath = path.join(f.root, "omp.jsonl");
    f.manifest.sessions[0] = {
      path: ompPath,
      format: "omp",
      role: "review",
      attemptOutcome: "completed",
    };
    f.manifest.expectedSessionIds = ["omp-1"];
    await fs.writeFile(
      ompPath,
      [
        { type: "title", title: "Synthetic test" },
        {
          type: "session",
          version: 3,
          id: "omp-1",
          cwd: f.workspace,
          timestamp: "2026-10-01T10:00:00.000Z",
        },
        {
          type: "message",
          id: "response-1",
          timestamp: "2026-10-01T10:02:00.000Z",
          message: {
            role: "assistant",
            provider: "provider-x",
            model: "model-omp",
            usage: {
              input: 100,
              output: 20,
              reasoning: 5,
              cacheRead: 40,
              cacheWrite: 10,
              totalTokens: 170,
            },
            cost: { total: 0.0035 },
          },
        },
      ]
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    const result = await collectSessionJournal(f.manifestPath);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      role: "review",
      model: "model-omp",
      uncachedInputTokens: 100,
      cachedInputTokens: 40,
      cacheWriteTokens: 10,
      outputTokens: 20,
      reasoningTokens: 5,
      auxiliaryTokens: null,
      recordedCostEstimate: 0.0035,
    });
  });

  it("deduplicates replayed native response identities and rejects conflicting final usage", async () => {
    const f = await fixture();
    const ompPath = path.join(f.root, "omp.jsonl");
    f.manifest.sessions[0] = {
      path: ompPath,
      format: "omp",
      role: "main",
      attemptOutcome: "completed",
    };
    f.manifest.expectedSessionIds = ["omp-1"];
    const session = {
      type: "session",
      version: 3,
      id: "omp-1",
      cwd: f.workspace,
      timestamp: "2026-10-01T10:00:00.000Z",
    };
    const response = {
      type: "message",
      id: "response-1",
      timestamp: "2026-10-01T10:02:00.000Z",
      message: {
        role: "assistant",
        provider: "p",
        model: "m",
        usage: { input: 10, output: 2, totalTokens: 12 },
      },
    };
    const draft = {
      type: "message",
      id: "response-1",
      timestamp: "2026-10-01T10:02:00.000Z",
      message: { role: "assistant", provider: "p", model: "m" },
    };
    await fs.writeFile(
      ompPath,
      [session, draft, response, response].map(JSON.stringify).join("\n") +
        "\n",
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    expect(
      (await collectSessionJournal(f.manifestPath)).groups[0],
    ).toMatchObject({
      outputTokens: 2,
      cachedInputTokens: null,
      recordedCostEstimate: null,
    });
    const conflict = structuredClone(response);
    conflict.message.usage.output = 3;
    await fs.writeFile(
      ompPath,
      [session, response, conflict].map(JSON.stringify).join("\n") + "\n",
    );
    const conflicted = await collectSessionJournal(f.manifestPath);
    expect(conflicted.coverage).toMatchObject({
      complete: false,
      invalidUsageRecords: 1,
    });
    expect(conflicted.groups[0]?.outputTokens).toBe(2);
  });

  it("reports missing expected actors as incomplete and rejects unlisted native identities", async () => {
    const f = await fixture();
    f.manifest.expectedSessionIds.push("missing-actor");
    await save(f, [
      {
        timestamp: "2026-10-01T10:00:00.000Z",
        type: "session_meta",
        payload: { id: "session-1", cwd: f.workspace },
      },
      {
        timestamp: "2026-10-01T10:01:00.000Z",
        type: "turn_context",
        payload: { model: "m" },
      },
      codexEvent("2026-10-01T10:02:00.000Z", 4),
    ]);
    const report = await collectSessionJournal(f.manifestPath);
    expect(report.coverage).toMatchObject({
      complete: false,
      expectedSessions: 2,
      missingSessions: 1,
    });
    f.manifest.expectedSessionIds = ["unexpected"];
    await save(f, [
      {
        timestamp: "2026-10-01T10:00:00.000Z",
        type: "session_meta",
        payload: { id: "session-1", cwd: f.workspace },
      },
      {
        timestamp: "2026-10-01T10:01:00.000Z",
        type: "turn_context",
        payload: { model: "m" },
      },
      codexEvent("2026-10-01T10:02:00.000Z", 4),
    ]);
    await expect(collectSessionJournal(f.manifestPath)).rejects.toThrow(
      /inventory|expected/i,
    );
  });
  it("rejects foreign workspace and duplicate journal selections", async () => {
    const f = await fixture();
    await save(f, [
      {
        timestamp: "2026-10-01T09:58:00.000Z",
        type: "session_meta",
        payload: { id: "session-1", cwd: f.root },
      },
      codexEvent("2026-10-01T10:01:00.000Z", 2),
    ]);
    await expect(collectSessionJournal(f.manifestPath)).rejects.toThrow(
      /workspace mismatch/i,
    );
    f.manifest.sessions.push({
      path: f.manifest.sessions[0].path,
      format: "codex",
      role: "review",
      attemptOutcome: "completed",
    });
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    await expect(collectSessionJournal(f.manifestPath)).rejects.toThrow(
      /duplicate session paths/i,
    );
  });

  it("marks malformed, invalid, and aborted native records incomplete without exposing journal contents", async () => {
    const f = await fixture();
    await save(f, [
      {
        timestamp: "2026-10-01T09:58:00.000Z",
        type: "session_meta",
        payload: { id: "session-1", cwd: f.workspace },
      },
      {
        timestamp: "2026-10-01T10:01:00.000Z",
        type: "response_item",
        payload: { content: "private prompt", credential: "secret-value" },
      },
      codexEvent("2026-10-01T10:02:00.000Z", -1),
      {
        timestamp: "2026-10-01T10:03:00.000Z",
        type: "turn_aborted",
        payload: {},
      },
    ]);
    await fs.appendFile(f.session, "{not-json}\n");
    const report = await collectSessionJournal(f.manifestPath);
    expect(report.coverage).toMatchObject({
      complete: false,
      malformedLines: 1,
      invalidUsageRecords: 1,
      abortedSessions: 1,
    });
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(f.workspace);
    expect(serialized).not.toContain(f.session);
    expect(serialized).not.toContain("private prompt");
    expect(serialized).not.toContain("secret-value");
  });

  it("rejects overlapping declared phase windows", async () => {
    const f = await fixture();
    f.manifest.phaseWindows = [
      {
        phase: "planning",
        startedAt: "2026-10-01T10:00:00.000Z",
        completedAt: "2026-10-01T10:06:00.000Z",
      },
      {
        phase: "repair",
        startedAt: "2026-10-01T10:05:00.000Z",
        completedAt: "2026-10-01T10:10:00.000Z",
      },
    ];
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    await expect(collectSessionJournal(f.manifestPath)).rejects.toThrow(
      /ordered and non-overlapping/i,
    );
  });
});
