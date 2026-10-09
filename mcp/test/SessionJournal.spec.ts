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
  cacheWrite: number = 0,
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
          cache_write_input_tokens: cacheWrite,
          output_tokens: output,
          reasoning_output_tokens: 0,
          total_tokens: input + output,
        },
      },
    },
  };
}

function codexEvent(
  timestamp: string,
  output: number,
  includeCacheWrite = true,
) {
  return {
    timestamp,
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        last_token_usage: {
          input_tokens: 0,
          cached_input_tokens: 0,
          ...(includeCacheWrite ? { cache_write_input_tokens: 0 } : {}),
          output_tokens: output,
          reasoning_output_tokens: 0,
          total_tokens: output,
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
              cache_write_input_tokens: 0,
              output_tokens: 15,
              reasoning_output_tokens: 0,
              total_tokens: 165,
            },
            last_token_usage: {
              input_tokens: 50,
              cached_input_tokens: 10,
              cache_write_input_tokens: 0,
              output_tokens: 5,
              reasoning_output_tokens: 0,
              total_tokens: 55,
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
              reasoningTokens: 5,
              cacheRead: 40,
              cacheWrite: 10,
              totalTokens: 170,
              cost: { total: 0.0035 },
            },
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
    await fs.writeFile(
      ompPath,
      [session, response, response].map(JSON.stringify).join("\n") + "\n",
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
    conflict.message.usage.totalTokens = 13;
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
        type: "event_msg",
        payload: { type: "turn_aborted", reason: "interrupted" },
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

  it("accepts OMP input and cache-read buckets independently", async () => {
    const f = await fixture();
    const ompPath = path.join(f.root, "disjoint-cache.jsonl");
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
            model: "model-omp",
            usage: { input: 10, output: 2, cacheRead: 40, totalTokens: 52 },
          },
        },
      ]
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    const result = await collectSessionJournal(f.manifestPath);
    expect(result.groups[0]).toMatchObject({
      uncachedInputTokens: 10,
      cachedInputTokens: 40,
      outputTokens: 2,
    });
    expect(result.coverage.complete).toBe(true);
  });

  it("marks present malformed provider counters incomplete", async () => {
    const f = await fixture();
    const ompPath = path.join(f.root, "malformed-omp.jsonl");
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
            model: "model-omp",
            usage: { input: 10, output: 2, cacheRead: "4" },
          },
        },
      ]
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    const result = await collectSessionJournal(f.manifestPath);
    expect(result.coverage).toMatchObject({
      complete: false,
      invalidUsageRecords: 1,
    });
  });

  it("does not bill identity-less OMP final usage", async () => {
    const f = await fixture();
    const ompPath = path.join(f.root, "missing-response-id.jsonl");
    f.manifest.sessions[0] = {
      path: ompPath,
      format: "omp",
      role: "review",
      attemptOutcome: "completed",
    };
    f.manifest.expectedSessionIds = ["omp-1"];
    const header = {
      type: "session",
      version: 3,
      id: "omp-1",
      cwd: f.workspace,
      timestamp: "2026-10-01T10:00:00.000Z",
    };
    const response = {
      type: "message",
      timestamp: "2026-10-01T10:02:00.000Z",
      message: {
        role: "assistant",
        model: "model-omp",
        usage: { input: 10, output: 2, cacheRead: 4, totalTokens: 16 },
      },
    };
    await fs.writeFile(
      ompPath,
      [header, response, response].map(JSON.stringify).join("\n") + "\n",
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    const result = await collectSessionJournal(f.manifestPath);
    expect(result.coverage).toMatchObject({
      complete: false,
      invalidUsageRecords: 2,
    });
    expect(result.groups).toEqual([]);
  });

  it("keeps the last valid Codex cumulative baseline after a decrease", async () => {
    const f = await fixture();
    f.manifest.startedAt = "2026-10-01T10:00:00.000Z";
    f.manifest.completedAt = "2026-10-01T10:05:00.000Z";
    f.manifest.phaseWindows = [];
    await save(f, [
      {
        timestamp: "2026-10-01T09:58:00.000Z",
        type: "session_meta",
        payload: { id: "session-1", cwd: f.workspace },
      },
      codexCumulative("2026-10-01T09:59:00.000Z", 100, 20, 10),
      codexCumulative("2026-10-01T10:01:00.000Z", 150, 30, 15),
      codexCumulative("2026-10-01T10:02:00.000Z", 100, 20, 10),
      codexCumulative("2026-10-01T10:03:00.000Z", 150, 30, 15),
    ]);
    const result = await collectSessionJournal(f.manifestPath);
    expect(result.groups[0]).toMatchObject({
      uncachedInputTokens: 40,
      cachedInputTokens: 10,
      outputTokens: 5,
    });
    expect(result.coverage.invalidUsageRecords).toBe(1);
  });
  it("rejects a cache-invalid Codex delta and recovers from the prior baseline", async () => {
    const f = await fixture();
    f.manifest.startedAt = "2026-10-01T10:00:00.000Z";
    f.manifest.completedAt = "2026-10-01T10:05:00.000Z";
    await save(f, [
      {
        timestamp: "2026-10-01T09:58:00.000Z",
        type: "session_meta",
        payload: { id: "session-1", cwd: f.workspace },
      },
      codexCumulative("2026-10-01T09:59:00.000Z", 100, 20, 10, 5),
      codexCumulative("2026-10-01T10:01:00.000Z", 150, 80, 15, 8),
      codexCumulative("2026-10-01T10:02:00.000Z", 160, 30, 17, 9),
    ]);

    const report = await collectSessionJournal(f.manifestPath);

    expect(report.coverage).toMatchObject({
      complete: false,
      invalidUsageRecords: 1,
    });
    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]).toMatchObject({
      messages: 1,
      uncachedInputTokens: 50,
      cachedInputTokens: 10,
      cacheWriteTokens: 4,
      outputTokens: 7,
    });
    expect(report.groups[0]?.uncachedInputTokens).toBeGreaterThanOrEqual(0);
  });

  it("marks malformed Codex token-count envelopes incomplete", async () => {
    const f = await fixture();
    await save(f, [
      {
        timestamp: "2026-10-01T09:58:00.000Z",
        type: "session_meta",
        payload: { id: "session-1", cwd: f.workspace },
      },
      codexEvent("2026-10-01T10:01:00.000Z", 3),
      {
        timestamp: "2026-10-01T10:02:00.000Z",
        type: "event_msg",
        payload: { type: "token_count", info: null },
      },
    ]);
    const result = await collectSessionJournal(f.manifestPath);
    expect(result.coverage).toMatchObject({
      complete: false,
      invalidUsageRecords: 1,
    });
  });

  it("does not export path-like model metadata", async () => {
    const f = await fixture();
    await save(f, [
      {
        timestamp: "2026-10-01T09:58:00.000Z",
        type: "session_meta",
        payload: { id: "session-1", cwd: f.workspace },
      },
      {
        timestamp: "2026-10-01T09:59:00.000Z",
        type: "turn_context",
        payload: { model: "/private/review-secret" },
      },
      codexEvent("2026-10-01T10:01:00.000Z", 3),
    ]);
    const result = await collectSessionJournal(f.manifestPath);
    expect(JSON.stringify(result)).not.toContain("/private/review-secret");
    expect(result.groups[0]?.model).toBe("unreported");
    expect(result.coverage.complete).toBe(false);
  });

  it("recognizes provider-native abort records as incomplete", async () => {
    const f = await fixture();
    await save(f, [
      {
        timestamp: "2026-10-01T09:58:00.000Z",
        type: "session_meta",
        payload: { id: "session-1", cwd: f.workspace },
      },
      codexEvent("2026-10-01T10:01:00.000Z", 3),
      {
        timestamp: "2026-10-01T10:02:00.000Z",
        type: "event_msg",
        payload: { type: "turn_aborted", reason: "interrupted" },
      },
    ]);
    const codexResult = await collectSessionJournal(f.manifestPath);
    expect(codexResult.coverage.abortedSessions).toBe(1);
    expect(codexResult.coverage.complete).toBe(false);

    const ompPath = path.join(f.root, "aborted-omp.jsonl");
    f.manifest.sessions[0] = {
      path: ompPath,
      format: "omp",
      role: "review",
      attemptOutcome: "interrupted",
    };
    f.manifest.expectedSessionIds = ["omp-1"];
    await fs.writeFile(
      ompPath,
      [
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
            model: "model-omp",
            stopReason: "aborted",
            usage: { input: 10, output: 2, cacheRead: 4, totalTokens: 16 },
          },
        },
      ]
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    const ompResult = await collectSessionJournal(f.manifestPath);
    expect(ompResult.coverage.abortedSessions).toBe(1);
    expect(ompResult.coverage.complete).toBe(false);
  });

  it("loads OMP recorded cost from its native usage field", async () => {
    const f = await fixture();
    const ompPath = path.join(f.root, "usage-cost.jsonl");
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
            model: "model-omp",
            usage: {
              input: 10,
              output: 2,
              cacheRead: 4,
              totalTokens: 16,
              cost: { total: 0.001 },
            },
          },
        },
      ]
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    const result = await collectSessionJournal(f.manifestPath);
    expect(result.groups[0]?.recordedCostEstimate).toBe(0.001);
  });

  it("reports oversized newline-free records and identity-cap truncation", async () => {
    const f = await fixture();
    await save(f, [
      {
        timestamp: "2026-10-01T09:58:00.000Z",
        type: "session_meta",
        payload: { id: "session-1", cwd: f.workspace },
      },
    ]);
    await fs.appendFile(f.session, `${"x".repeat(1_000_001)}`);
    const oversized = await collectSessionJournal(f.manifestPath);
    expect(oversized.coverage).toMatchObject({
      malformedLines: 1,
      resourceLimitReached: true,
      complete: false,
    });

    f.manifest.sessions[0] = {
      path: f.session,
      format: "omp",
      role: "implementation",
      attemptOutcome: "completed",
    };
    f.manifest.expectedSessionIds = ["omp-1"];
    await save(f, [
      {
        type: "session",
        version: 3,
        id: "omp-1",
        cwd: f.workspace,
        timestamp: "2026-10-01T10:00:00.000Z",
      },
      ...Array.from({ length: 10_001 }, (_, index) => ({
        type: "message",
        id: `response-${index}`,
        parentId: null,
        timestamp: "2026-10-01T10:01:00.000Z",
        message: {
          role: "assistant",
          api: "openai-responses",
          provider: "provider-x",
          model: "model-omp",
          timestamp: 1790858460000,
          stopReason: "stop",
          usage: {
            input: 1,
            output: 1,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 2,
            cost: { total: 0 },
          },
        },
      })),
    ]);
    const identityLimited = await collectSessionJournal(f.manifestPath);
    expect(identityLimited.coverage).toMatchObject({
      resourceLimitReached: true,
      complete: false,
    });
    expect(
      identityLimited.groups.reduce((sum, group) => sum + group.messages, 0),
    ).toBe(10_000);
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
  it("accounts OMP model_usage separately with native identity and provenance", async () => {
    const f = await fixture();
    const ompPath = path.join(f.root, "model-usage.jsonl");
    f.manifest.sessions[0] = {
      path: ompPath,
      format: "omp",
      role: "review",
      attemptOutcome: "completed",
    };
    f.manifest.expectedSessionIds = ["omp-1"];
    const header = {
      type: "session",
      version: 3,
      id: "omp-1",
      cwd: f.workspace,
      timestamp: "2026-10-01T10:00:00.000Z",
    };
    const assistant = {
      type: "message",
      id: "response-1",
      parentId: null,
      timestamp: "2026-10-01T10:01:00.000Z",
      message: {
        role: "assistant",
        api: "openai-responses",
        provider: "provider-x",
        model: "provider/main",
        timestamp: 1790858460000,
        stopReason: "stop",
        usage: {
          input: 10,
          output: 4,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 14,
          cost: { total: 0.001 },
        },
      },
    };
    const modelUsage = {
      type: "model_usage",
      id: "usage-1",
      parentId: "response-1",
      timestamp: "2026-10-01T10:02:00.000Z",
      purpose: "title",
      role: "tiny",
      api: "openai-responses",
      provider: "provider-x",
      model: "provider/tiny",
      stopReason: "stop",
      usage: {
        input: 7,
        cacheRead: 3,
        cacheWrite: 0,
        output: 2,
        totalTokens: 12,
        cost: { total: 0.0005 },
      },
    };
    await fs.writeFile(
      ompPath,
      [header, assistant, modelUsage, modelUsage]
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    const report = await collectSessionJournal(f.manifestPath);
    expect(report.coverage).toMatchObject({
      complete: true,
      invalidUsageRecords: 0,
    });
    expect(report.groups).toHaveLength(2);
    expect(report.groups).toContainEqual(
      expect.objectContaining({
        role: "review",
        model: "provider/main",
        messages: 1,
        outputTokens: 4,
        recordedCostEstimate: 0.001,
      }),
    );
    expect(report.groups).toContainEqual(
      expect.objectContaining({
        role: "review",
        usageKind: "auxiliary",
        nativePurpose: "title",
        model: "provider/tiny",
        messages: 0,
        uncachedInputTokens: 7,
        cachedInputTokens: 3,
        outputTokens: 2,
        recordedCostEstimate: 0.0005,
      }),
    );
    const conflict = structuredClone(modelUsage);
    conflict.usage.output = 3;
    conflict.usage.totalTokens = 13;
    await fs.writeFile(
      ompPath,
      [header, assistant, modelUsage, conflict].map(JSON.stringify).join("\n") +
        "\n",
    );
    const conflicted = await collectSessionJournal(f.manifestPath);
    expect(conflicted.coverage).toMatchObject({
      complete: false,
      invalidUsageRecords: 1,
    });
    expect(
      conflicted.groups.find((group) => group.model === "provider/tiny")
        ?.outputTokens,
    ).toBe(2);
  });
  it("redacts selected and cross-row identities from native model-usage labels", async () => {
    const f = await fixture();
    const firstPath = path.join(f.root, "first-usage.jsonl");
    const secondPath = path.join(f.root, "second-usage.jsonl");
    f.manifest.sessions = [
      {
        path: firstPath,
        format: "omp",
        role: "review",
        attemptOutcome: "completed",
      },
      {
        path: secondPath,
        format: "omp",
        role: "review",
        attemptOutcome: "completed",
      },
    ];
    f.manifest.expectedSessionIds = ["omp-1", "omp-2"];
    const header = (id: string) => ({
      type: "session",
      version: 3,
      id,
      cwd: f.workspace,
      timestamp: "2026-10-01T10:00:00.000Z",
    });
    const modelUsage = (
      id: string,
      purpose: string,
      role: string,
      input: number,
    ) => ({
      type: "model_usage",
      id,
      parentId: null,
      timestamp: "2026-10-01T10:01:00.000Z",
      purpose,
      role,
      api: "openai-responses",
      provider: "provider-x",
      model: "provider/tiny",
      stopReason: "stop",
      usage: {
        input,
        cacheRead: 0,
        cacheWrite: 0,
        output: 2,
        totalTokens: input + 2,
        cost: { total: 0.001 },
      },
    });
    await fs.writeFile(
      firstPath,
      [
        header("omp-1"),
        modelUsage("usage-1", "omp-1", "usage-1", 10),
        modelUsage("usage-2", "usage-1", "tiny", 20),
        modelUsage("usage-3", "omp-2", "tiny", 30),
        modelUsage("usage-4", "later-row-id", "tiny", 40),
      ]
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    await fs.writeFile(
      secondPath,
      [header("omp-2"), modelUsage("later-row-id", "title", "tiny", 50)]
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));

    const report = await collectSessionJournal(f.manifestPath);
    const serialized = JSON.stringify(report);

    expect(report.coverage).toMatchObject({
      complete: true,
      invalidUsageRecords: 0,
    });
    expect(report.groups).toHaveLength(3);
    for (const identity of [
      "omp-1",
      "omp-2",
      "usage-1",
      "usage-2",
      "usage-3",
      "usage-4",
      "later-row-id",
    ])
      expect(serialized).not.toContain(identity);
    expect(report.groups).toContainEqual(
      expect.objectContaining({
        usageKind: "auxiliary",
        nativePurpose: null,
        nativeModelRole: null,
        uncachedInputTokens: 10,
        outputTokens: 2,
        recordedCostEstimate: 0.001,
      }),
    );
    expect(report.groups).toContainEqual(
      expect.objectContaining({
        usageKind: "auxiliary",
        nativePurpose: null,
        nativeModelRole: "tiny",
        uncachedInputTokens: 90,
        outputTokens: 6,
        recordedCostEstimate: 0.003,
      }),
    );
    expect(report.groups).toContainEqual(
      expect.objectContaining({
        usageKind: "auxiliary",
        nativePurpose: "title",
        nativeModelRole: "tiny",
        uncachedInputTokens: 50,
        outputTokens: 2,
        recordedCostEstimate: 0.001,
      }),
    );
    await fs.appendFile(firstPath, "{malformed\n");
    const incompleteReport = await collectSessionJournal(f.manifestPath);
    expect(incompleteReport.coverage).toMatchObject({
      complete: false,
      malformedLines: 1,
    });
    expect(incompleteReport.groups).toHaveLength(1);
    expect(incompleteReport.groups[0]).toMatchObject({
      nativePurpose: null,
      nativeModelRole: null,
      uncachedInputTokens: 150,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 10,
      recordedCostEstimate: 0.005,
    });
    for (const identity of ["omp-1", "omp-2", "usage-1", "later-row-id"])
      expect(JSON.stringify(incompleteReport)).not.toContain(identity);
  });
  it("redacts row identities from later provenance regardless of journal order", async () => {
    const f = await fixture();
    const firstPath = path.join(f.root, "past-identity.jsonl");
    const secondPath = path.join(f.root, "later-provenance.jsonl");
    const header = (id: string) => ({
      type: "session",
      version: 3,
      id,
      cwd: f.workspace,
      timestamp: "2026-10-01T10:00:00.000Z",
    });
    const modelUsage = (
      id: string,
      purpose: string,
      role: string,
      input: number,
    ) => ({
      type: "model_usage",
      id,
      parentId: null,
      timestamp: "2026-10-01T10:01:00.000Z",
      purpose,
      role,
      api: "openai-responses",
      provider: "provider-x",
      model: "provider/tiny",
      stopReason: "stop",
      usage: {
        input,
        cacheRead: 0,
        cacheWrite: 0,
        output: 2,
        totalTokens: input + 2,
        cost: { total: 0.001 },
      },
    });
    await fs.writeFile(
      firstPath,
      [header("omp-1"), modelUsage("past-row-id", "title", "tiny", 10)]
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    await fs.writeFile(
      secondPath,
      [
        header("omp-2"),
        modelUsage("later-row-id", "past-row-id", "past-row-id", 20),
      ]
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    f.manifest.sessions = [
      {
        path: firstPath,
        format: "omp",
        role: "review",
        attemptOutcome: "completed",
      },
      {
        path: secondPath,
        format: "omp",
        role: "review",
        attemptOutcome: "completed",
      },
    ];
    f.manifest.expectedSessionIds = ["omp-1", "omp-2"];
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));

    for (const sessions of [
      f.manifest.sessions,
      [...f.manifest.sessions].reverse(),
    ]) {
      f.manifest.sessions = sessions;
      await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
      const report = await collectSessionJournal(f.manifestPath);

      expect(report.coverage).toMatchObject({
        complete: true,
        invalidUsageRecords: 0,
        resourceLimitReached: false,
      });
      expect(JSON.stringify(report)).not.toContain("past-row-id");
      expect(
        report.groups.reduce(
          (sum, group) => sum + (group.uncachedInputTokens ?? 0),
          0,
        ),
      ).toBe(30);
      expect(report.groups).toContainEqual(
        expect.objectContaining({
          nativePurpose: "title",
          nativeModelRole: "tiny",
          uncachedInputTokens: 10,
        }),
      );
      expect(report.groups).toContainEqual(
        expect.objectContaining({
          nativePurpose: null,
          nativeModelRole: null,
          uncachedInputTokens: 20,
        }),
      );
    }
  });

  it("continues accounting but withholds provenance when global identity membership exceeds its cap", async () => {
    const f = await fixture();
    const firstPath = path.join(f.root, "identity-cap.jsonl");
    const secondPath = path.join(f.root, "after-identity-cap.jsonl");
    const header = (id: string) => ({
      type: "session",
      version: 3,
      id,
      cwd: f.workspace,
      timestamp: "2026-10-01T10:00:00.000Z",
    });
    const identities = Array.from({ length: 10_000 }, (_, index) => ({
      type: "custom",
      id: `row-${index}`,
      timestamp: "2026-10-01T10:01:00.000Z",
    }));
    const usage = {
      type: "model_usage",
      id: "over-cap-row",
      parentId: null,
      timestamp: "2026-10-01T10:01:00.000Z",
      purpose: "title",
      role: "tiny",
      api: "openai-responses",
      provider: "provider-x",
      model: "provider/tiny",
      stopReason: "stop",
      usage: {
        input: 10,
        cacheRead: 0,
        cacheWrite: 0,
        output: 2,
        totalTokens: 12,
        cost: { total: 0.001 },
      },
    };
    await fs.writeFile(
      firstPath,
      [header("omp-1"), ...identities].map(JSON.stringify).join("\n") + "\n",
    );
    await fs.writeFile(
      secondPath,
      [header("omp-2"), usage].map(JSON.stringify).join("\n") + "\n",
    );
    f.manifest.sessions = [
      {
        path: firstPath,
        format: "omp",
        role: "review",
        attemptOutcome: "completed",
      },
      {
        path: secondPath,
        format: "omp",
        role: "review",
        attemptOutcome: "completed",
      },
    ];
    f.manifest.expectedSessionIds = ["omp-1", "omp-2"];
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));

    const report = await collectSessionJournal(f.manifestPath);

    expect(report.coverage).toMatchObject({
      complete: false,
      invalidUsageRecords: 0,
      resourceLimitReached: true,
      sessionsWithUsage: 1,
    });
    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]).toMatchObject({
      nativePurpose: null,
      nativeModelRole: null,
      messages: 0,
      uncachedInputTokens: 10,
      outputTokens: 2,
      recordedCostEstimate: 0.001,
    });
  });

  it("accepts valid usage after an invalid reserved ID, deduplicates replay, and rejects valid conflicts", async () => {
    const f = await fixture();
    const ompPath = path.join(f.root, "invalid-then-valid.jsonl");
    f.manifest.sessions[0] = {
      path: ompPath,
      format: "omp",
      role: "review",
      attemptOutcome: "completed",
    };
    f.manifest.expectedSessionIds = ["omp-1"];
    const header = {
      type: "session",
      version: 3,
      id: "omp-1",
      cwd: f.workspace,
      timestamp: "2026-10-01T10:00:00.000Z",
    };
    const response = (output: number, cacheRead: number | string = 40) => ({
      type: "message",
      id: "retry-row-id",
      parentId: null,
      timestamp: "2026-10-01T10:02:00.000Z",
      message: {
        role: "assistant",
        api: "openai-responses",
        provider: "provider-x",
        model: "model-omp",
        timestamp: 1790858520000,
        stopReason: "stop",
        usage: {
          input: 10,
          output,
          cacheRead,
          cacheWrite: 10,
          reasoningTokens: 1,
          totalTokens: 50 + output,
          cost: { total: 0.001 },
        },
      },
    });
    const malformed = response(2, "40");
    await fs.writeFile(
      ompPath,
      [header, malformed, response(2), response(2), response(3)]
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));

    const report = await collectSessionJournal(f.manifestPath);

    expect(report.coverage).toMatchObject({
      complete: false,
      invalidUsageRecords: 2,
      sessionsWithUsage: 1,
    });
    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]).toMatchObject({
      messages: 1,
      uncachedInputTokens: 10,
      cachedInputTokens: 40,
      cacheWriteTokens: 10,
      outputTokens: 2,
      reasoningTokens: 1,
      recordedCostEstimate: 0.001,
    });
  });

  it("preserves OMP orchestration buckets without mixing conversation counters", async () => {
    const f = await fixture();
    const ompPath = path.join(f.root, "orchestration.jsonl");
    f.manifest.sessions[0] = {
      path: ompPath,
      format: "omp",
      role: "review",
      attemptOutcome: "completed",
    };
    f.manifest.expectedSessionIds = ["omp-1"];
    const header = {
      type: "session",
      version: 3,
      id: "omp-1",
      cwd: f.workspace,
      timestamp: "2026-10-01T10:00:00.000Z",
    };
    const response = {
      type: "message",
      id: "response-1",
      parentId: null,
      timestamp: "2026-10-01T10:02:00.000Z",
      message: {
        role: "assistant",
        api: "openai-responses",
        provider: "provider-x",
        model: "model-omp",
        timestamp: 1790858520000,
        stopReason: "stop",
        usage: {
          input: 10,
          output: 2,
          cacheRead: 40,
          cacheWrite: 0,
          totalTokens: 64,
          cost: { total: 0.001 },
          orchestration: { input: 7, cacheRead: 3, output: 2 },
        },
      },
    };
    await fs.writeFile(
      ompPath,
      [header, response, response].map(JSON.stringify).join("\n") + "\n",
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    const report = await collectSessionJournal(f.manifestPath);
    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]).toMatchObject({
      uncachedInputTokens: 10,
      cachedInputTokens: 40,
      outputTokens: 2,
      orchestrationInputTokens: 7,
      orchestrationCacheReadTokens: 3,
      orchestrationOutputTokens: 2,
    });
    const conflict = structuredClone(response);
    conflict.message.usage.orchestration.input = 8;
    await fs.writeFile(
      ompPath,
      [header, response, conflict].map(JSON.stringify).join("\n") + "\n",
    );
    const conflicted = await collectSessionJournal(f.manifestPath);
    expect(conflicted.coverage).toMatchObject({
      complete: false,
      invalidUsageRecords: 1,
    });
    expect(conflicted.groups[0]?.orchestrationInputTokens).toBe(7);
  });

  it("keeps absent OMP orchestration submetrics unknown", async () => {
    const f = await fixture();
    const ompPath = path.join(f.root, "unknown-orchestration.jsonl");
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
          parentId: null,
          timestamp: "2026-10-01T10:02:00.000Z",
          message: {
            role: "assistant",
            api: "openai-responses",
            provider: "provider-x",
            model: "model-omp",
            timestamp: 1790858520000,
            stopReason: "stop",
            usage: {
              input: 10,
              output: 2,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 19,
              cost: { total: 0.001 },
              orchestration: { input: 7 },
            },
          },
        },
      ]
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    const result = await collectSessionJournal(f.manifestPath);
    expect(result.groups[0]).toMatchObject({
      orchestrationInputTokens: 7,
      orchestrationCacheReadTokens: null,
      orchestrationOutputTokens: null,
    });
  });

  it("deltas Codex cache-write snapshots and preserves distinct per-event usage", async () => {
    const f = await fixture();
    const cumulative = (
      timestamp: string,
      input: number,
      cached: number,
      output: number,
      cacheWrite: number,
    ) => ({
      ...codexCumulative(timestamp, input, cached, output),
      payload: {
        type: "token_count",
        info: {
          total_token_usage: {
            input_tokens: input,
            cached_input_tokens: cached,
            cache_write_input_tokens: cacheWrite,
            output_tokens: output,
            reasoning_output_tokens: 0,
            total_tokens: input + output,
          },
        },
      },
    });
    const perEvent = (timestamp: string, cacheWrite: number) => ({
      ...codexEvent(timestamp, 2),
      payload: {
        type: "token_count",
        info: {
          last_token_usage: {
            input_tokens: 0,
            cached_input_tokens: 0,
            cache_write_input_tokens: cacheWrite,
            output_tokens: 2,
            reasoning_output_tokens: 0,
            total_tokens: 2,
          },
        },
      },
    });
    await save(f, [
      {
        timestamp: "2026-10-01T09:58:00.000Z",
        type: "session_meta",
        payload: { id: "session-1", cwd: f.workspace },
      },
      cumulative("2026-10-01T09:59:00.000Z", 100, 20, 10, 5),
      cumulative("2026-10-01T10:01:00.000Z", 150, 30, 15, 8),
      cumulative("2026-10-01T10:02:00.000Z", 150, 30, 15, 8),
      perEvent("2026-10-01T10:03:00.000Z", 4),
      perEvent("2026-10-01T10:04:00.000Z", 4),
    ]);
    const report = await collectSessionJournal(f.manifestPath);
    expect(report.groups[0]).toMatchObject({
      uncachedInputTokens: 40,
      cachedInputTokens: 10,
      cacheWriteTokens: 11,
      outputTokens: 9,
    });
  });

  it("includes native OMP cache-write usage in replay conflict detection", async () => {
    const f = await fixture();
    const ompPath = path.join(f.root, "cache-write-conflict.jsonl");
    f.manifest.sessions[0] = {
      path: ompPath,
      format: "omp",
      role: "review",
      attemptOutcome: "completed",
    };
    f.manifest.expectedSessionIds = ["omp-1"];
    const header = {
      type: "session",
      version: 3,
      id: "omp-1",
      cwd: f.workspace,
      timestamp: "2026-10-01T10:00:00.000Z",
    };
    const response = (cacheWrite: number) => ({
      type: "message",
      id: "response-1",
      parentId: null,
      timestamp: "2026-10-01T10:02:00.000Z",
      message: {
        role: "assistant",
        api: "openai-responses",
        provider: "provider-x",
        model: "model-omp",
        timestamp: 1790858520000,
        stopReason: "stop",
        usage: {
          input: 10,
          output: 2,
          cacheRead: 40,
          cacheWrite,
          totalTokens: 52 + cacheWrite,
          cost: { total: 0.001 },
        },
      },
    });
    await fs.writeFile(
      ompPath,
      [header, response(10), response(10), response(11)]
        .map(JSON.stringify)
        .join("\n") + "\n",
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    const report = await collectSessionJournal(f.manifestPath);
    expect(report.coverage).toMatchObject({
      complete: false,
      invalidUsageRecords: 1,
    });
    expect(report.groups[0]).toMatchObject({
      cacheWriteTokens: 10,
      messages: 1,
    });
  });
  it("leaves absent native Codex cache-write metrics unknown", async () => {
    const f = await fixture();
    await save(f, [
      {
        timestamp: "2026-10-01T09:58:00.000Z",
        type: "session_meta",
        payload: { id: "session-1", cwd: f.workspace },
      },
      codexEvent("2026-10-01T10:01:00.000Z", 3, false),
    ]);
    const report = await collectSessionJournal(f.manifestPath);
    expect(report.coverage.complete).toBe(true);
    expect(report.groups[0]).toMatchObject({
      outputTokens: 3,
      cacheWriteTokens: null,
    });
  });

  it("stops the selected journal after an oversized middle record", async () => {
    const f = await fixture();
    const ompPath = path.join(f.root, "oversized-middle.jsonl");
    f.manifest.sessions[0] = {
      path: ompPath,
      format: "omp",
      role: "review",
      attemptOutcome: "completed",
    };
    f.manifest.expectedSessionIds = ["omp-1"];
    const header = {
      type: "session",
      version: 3,
      id: "omp-1",
      cwd: f.workspace,
      timestamp: "2026-10-01T10:00:00.000Z",
    };
    const response = (id: string, t: string) => ({
      type: "message",
      id,
      parentId: null,
      timestamp: t,
      message: {
        role: "assistant",
        api: "openai-responses",
        provider: "provider-x",
        model: "model-omp",
        timestamp: Date.parse(t),
        stopReason: "stop",
        usage: {
          input: 10,
          output: 2,
          cacheRead: 40,
          cacheWrite: 0,
          totalTokens: 52,
          cost: { total: 0.001 },
        },
      },
    });
    await fs.writeFile(
      ompPath,
      `${[header, response("response-a", "2026-10-01T10:01:00.000Z")]
        .map(JSON.stringify)
        .join("\n")}\n${"x".repeat(1_000_001)}\n${JSON.stringify(
        response("response-b", "2026-10-01T10:03:00.000Z"),
      )}\n`,
    );
    await fs.writeFile(f.manifestPath, JSON.stringify(f.manifest));
    const report = await collectSessionJournal(f.manifestPath);
    expect(report.coverage).toMatchObject({
      malformedLines: 1,
      resourceLimitReached: true,
      complete: false,
    });
    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]).toMatchObject({
      messages: 1,
      uncachedInputTokens: 10,
      cachedInputTokens: 40,
      outputTokens: 2,
    });
  });
});
