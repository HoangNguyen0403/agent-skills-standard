import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_LIMITS,
  type Disposition,
  type EvidenceSource,
  type LocalManifest,
  type NodeKey,
  type PrepareRequest,
  type SafeEvent,
} from "../src/retrospective/contracts";
import { collectEvidence } from "../src/retrospective/inventory";
import {
  createManifestEvidenceSource,
  loadLocalManifest,
  setNativeReaderSourceStatForTests,
} from "../src/retrospective/native-reader";

const CUTOFF = "2026-10-01T10:10:00.000Z";
const MAIN: NodeKey = { hostId: "host-main", sessionId: "main-session" };
const CHILD: NodeKey = { hostId: "host-main", sessionId: "child-session" };
const FIXTURE_PATH = fileURLToPath(
  new URL("./fixtures/retrospective/native-events.jsonl", import.meta.url),
);
const fixtureRoots: string[] = [];

function localRequest(overrides: Partial<PrepareRequest> = {}): PrepareRequest {
  return {
    main: { ...MAIN },
    checkpointId: "checkpoint-1",
    cutoff: CUTOFF,
    root: "/synthetic/diagnostics",
    consent: "local-only",
    storageRiskAcknowledged: true,
    ...overrides,
  };
}

function keyId(node: NodeKey): string {
  return `${node.hostId}/${node.sessionId}`;
}

function eventFor(
  node: NodeKey,
  id: string,
  at: string,
  extra: Partial<Omit<SafeEvent, "id" | "node" | "at" | "source">> = {},
): SafeEvent {
  return {
    id,
    node: { ...node },
    at,
    kind: "launch",
    source: { node: { ...node }, eventId: id },
    ...extra,
  };
}

function fixtureSource(
  options: {
    nodes?: Array<{
      key: NodeKey;
      parent: NodeKey | null;
      disposition: Disposition;
    }>;
    events?: Array<{ node: NodeKey; events: SafeEvent[] }>;
    childDisposition?: Disposition;
  } = {},
): EvidenceSource & { readIds: string[] } {
  const nodes = options.nodes ?? [
    { key: MAIN, parent: null, disposition: "local-allowed" as Disposition },
    {
      key: CHILD,
      parent: MAIN,
      disposition: options.childDisposition ?? "local-allowed",
    },
  ];
  const events = new Map(
    (
      options.events ?? [
        {
          node: MAIN,
          events: [eventFor(MAIN, "main-event", "2026-10-01T10:01:00.000Z")],
        },
        {
          node: CHILD,
          events: [eventFor(CHILD, "child-event", "2026-10-01T10:02:00.000Z")],
        },
      ]
    ).map((entry) => [keyId(entry.node), entry.events] as const),
  );
  const readIds: string[] = [];
  return {
    readIds,
    async *inventory(_main, _cutoff, signal) {
      for (const node of nodes) {
        signal.throwIfAborted();
        yield {
          key: { ...node.key },
          parent: node.parent === null ? null : { ...node.parent },
          disposition: node.disposition,
        };
      }
    },
    async *read(node, signal) {
      readIds.push(node.sessionId);
      for (const event of events.get(keyId(node)) ?? []) {
        signal.throwIfAborted();
        yield event;
      }
    },
  };
}

async function temporaryRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-retrospective-"));
  fixtureRoots.push(root);
  return root;
}

async function writeLines(
  directory: string,
  name: string,
  lines: string[],
): Promise<string> {
  const file = path.join(directory, name);
  await fs.writeFile(file, `${lines.join("\n")}\n`);
  return file;
}

async function writeJsonl(
  directory: string,
  name: string,
  rows: unknown[],
): Promise<string> {
  return writeLines(
    directory,
    name,
    rows.map((row) => JSON.stringify(row)),
  );
}

function ompHeader(node: NodeKey, at = "2026-10-01T10:00:00.000Z") {
  return {
    type: "session",
    version: 3,
    id: node.sessionId,
    timestamp: at,
    cwd: "/synthetic/workspace",
  };
}

function ompAssistant(id: string, at: string, input: number, output: number) {
  return {
    type: "message",
    id,
    parentId: null,
    timestamp: at,
    message: {
      role: "assistant",
      provider: "provider-x",
      model: "provider/model-a",
      usage: { input, output, cost: { total: 0.001 } },
      stopReason: "stop",
      content: [],
    },
  };
}

function manifestFor(
  nodes: LocalManifest["nodes"],
  overrides: Partial<Pick<LocalManifest, "main" | "provenance">> = {},
): LocalManifest {
  return {
    schemaVersion: 1,
    provenance: "user-supplied",
    main: { ...MAIN },
    checkpointId: "checkpoint-1",
    cutoff: CUTOFF,
    nodes,
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(
    fixtureRoots
      .splice(0)
      .map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe("collectEvidence", () => {
  it("inventories a restricted child without reading it", async () => {
    const source = fixtureSource({ childDisposition: "restricted" });
    const packet = await collectEvidence(
      localRequest(),
      source,
      new AbortController().signal,
    );
    expect(source.readIds).toEqual(["main-session"]);
    expect(
      packet.nodes.find((node) => node.key.sessionId === "child-session")
        ?.disposition,
    ).toBe("restricted");
    expect(
      packet.events.every((event) => event.node.sessionId === MAIN.sessionId),
    ).toBe(true);
  });

  it("records an unknown parent provenance gap while keeping the selected node", async () => {
    const orphan: NodeKey = {
      hostId: MAIN.hostId,
      sessionId: "orphan-session",
    };
    const source = fixtureSource({
      nodes: [
        { key: MAIN, parent: null, disposition: "local-allowed" },
        {
          key: orphan,
          parent: { hostId: MAIN.hostId, sessionId: "missing-session" },
          disposition: "local-allowed",
        },
      ],
      events: [{ node: MAIN, events: [] }],
    });
    const packet = await collectEvidence(
      localRequest(),
      source,
      new AbortController().signal,
    );
    expect(packet.nodes.map((node) => node.key.sessionId)).toEqual([
      "main-session",
      "orphan-session",
    ]);
    expect(packet.gaps).toContainEqual({
      code: "unknown-parent",
      node: orphan,
    });
  });

  it("terminates duplicate and cyclic membership without rereading a node", async () => {
    const cyclic: NodeKey = { hostId: MAIN.hostId, sessionId: "cycle-session" };
    const source = fixtureSource({
      nodes: [
        { key: MAIN, parent: null, disposition: "local-allowed" },
        { key: MAIN, parent: null, disposition: "local-allowed" },
        { key: cyclic, parent: cyclic, disposition: "local-allowed" },
      ],
      events: [{ node: MAIN, events: [] }],
    });
    const packet = await collectEvidence(
      localRequest(),
      source,
      new AbortController().signal,
    );
    expect(packet.nodes.map((node) => node.key.sessionId)).toEqual([
      "main-session",
    ]);
    expect(source.readIds).toEqual(["main-session"]);
    const codes = packet.gaps.map((gap) => gap.code);
    expect(codes).toContain("duplicate-node");
    expect(codes).toContain("cycle");
  });

  it("excludes events after the cutoff and includes the cutoff instant", async () => {
    const source = fixtureSource({
      nodes: [{ key: MAIN, parent: null, disposition: "local-allowed" }],
      events: [
        {
          node: MAIN,
          events: [
            eventFor(MAIN, "before", "2026-10-01T10:00:00.000Z"),
            eventFor(MAIN, "boundary", CUTOFF),
            eventFor(MAIN, "future", "2026-10-01T10:10:00.001Z"),
          ],
        },
      ],
    });
    const packet = await collectEvidence(
      localRequest(),
      source,
      new AbortController().signal,
    );
    expect(packet.events.map((event) => event.id)).toEqual([
      "before",
      "boundary",
    ]);
  });
  it("interrupts a pending read when the caller cancels", async () => {
    const controller = new AbortController();
    let startRead: (() => void) | undefined;
    let finishRead: (() => void) | undefined;
    const readStarted = new Promise<void>((resolve) => {
      startRead = resolve;
    });
    const readFinished = new Promise<void>((resolve) => {
      finishRead = resolve;
    });
    const source: EvidenceSource = {
      async *inventory(_main, _cutoff, signal) {
        signal.throwIfAborted();
        yield { key: MAIN, parent: null, disposition: "local-allowed" };
      },
      async *read(_node, signal) {
        startRead?.();
        try {
          await new Promise<void>((resolve) => {
            signal.addEventListener("abort", resolve, { once: true });
          });
          signal.throwIfAborted();
          yield eventFor(MAIN, "never", "2026-10-01T10:01:00.000Z");
        } finally {
          finishRead?.();
        }
      },
    };
    const collection = collectEvidence(
      localRequest(),
      source,
      controller.signal,
    );
    await readStarted;
    controller.abort(new Error("synthetic cancellation"));
    await expect(collection).rejects.toThrow("synthetic cancellation");
    await readFinished;
  });
});

describe("manifest-backed evidence source", () => {
  it("includes a child from another directory through declared parentage", async () => {
    const root = await temporaryRoot();
    const first = path.join(root, "first");
    const second = path.join(root, "second");
    await fs.mkdir(first);
    await fs.mkdir(second);
    const mainFile = await writeJsonl(first, "main.jsonl", [
      ompHeader(MAIN),
      ompAssistant("main-usage", "2026-10-01T10:01:00.000Z", 10, 4),
    ]);
    const childFile = await writeJsonl(second, "child.jsonl", [
      ompHeader(CHILD),
      ompAssistant("child-usage", "2026-10-01T10:02:00.000Z", 3, 1),
    ]);
    const manifest = manifestFor([
      {
        key: MAIN,
        parent: null,
        disposition: "local-allowed",
        source: { format: "omp", absolutePath: mainFile },
      },
      {
        key: CHILD,
        parent: MAIN,
        disposition: "local-allowed",
        source: { format: "omp", absolutePath: childFile },
      },
    ]);
    const packet = await collectEvidence(
      localRequest(),
      createManifestEvidenceSource(manifest),
      new AbortController().signal,
    );
    expect(packet.nodes.map((node) => node.key.sessionId).sort()).toEqual([
      "child-session",
      "main-session",
    ]);
    const childEvents = packet.events.filter(
      (event) => event.node.sessionId === CHILD.sessionId,
    );
    expect(childEvents.map((event) => event.id)).toEqual([
      "child-session",
      "child-usage",
    ]);
    expect(childEvents[0]).toMatchObject({
      kind: "launch",
      node: { hostId: CHILD.hostId, sessionId: CHILD.sessionId },
    });
    expect(childEvents[1]).toMatchObject({
      kind: "usage",
      node: { hostId: CHILD.hostId, sessionId: CHILD.sessionId },
      counts: {
        inputTokens: 3,
        outputTokens: 1,
        cost: 0.001,
        currency: null,
      },
    });
  });

  it("exports no private text and no source paths from the synthetic fixture", async () => {
    const root = await temporaryRoot();
    const mainFile = path.join(root, "main.jsonl");
    await fs.copyFile(FIXTURE_PATH, mainFile);
    const manifest = manifestFor([
      {
        key: MAIN,
        parent: null,
        disposition: "local-allowed",
        source: { format: "omp", absolutePath: mainFile },
      },
    ]);
    const packet = await collectEvidence(
      localRequest(),
      createManifestEvidenceSource(manifest),
      new AbortController().signal,
    );
    const serialized = JSON.stringify(packet);
    expect(serialized).not.toContain("PRIVATE_");
    expect(serialized).not.toContain(mainFile);
    expect(packet.events).toContainEqual(
      expect.objectContaining({ id: "main-session", kind: "launch" }),
    );
    expect(packet.events.some((event) => event.id === "assistant-future")).toBe(
      false,
    );
    expect(
      packet.events.every(
        (event) => Date.parse(event.at) <= Date.parse(CUTOFF),
      ),
    ).toBe(true);
    const allowed = new Set([
      "id",
      "node",
      "at",
      "kind",
      "outcome",
      "provider",
      "model",
      "tool",
      "counts",
      "source",
    ]);
    for (const event of packet.events)
      expect(Object.keys(event).every((key) => allowed.has(key))).toBe(true);
    expect(packet.events).toContainEqual(
      expect.objectContaining({
        id: "tool-result-1",
        kind: "check",
        outcome: "failed",
        tool: "bash",
      }),
    );
    expect(packet.events).toContainEqual(
      expect.objectContaining({
        id: "assistant-1",
        kind: "usage",
        counts: {
          inputTokens: 10,
          outputTokens: 4,
          cost: 0.001,
          currency: null,
        },
      }),
    );
  });

  it("marks malformed and oversized records partial while retaining later valid events", async () => {
    const root = await temporaryRoot();
    const codex: NodeKey = { hostId: "host-codex", sessionId: "codex-session" };
    const file = await writeLines(root, "codex.jsonl", [
      JSON.stringify({
        type: "session_meta",
        timestamp: "2026-10-01T10:00:00.000Z",
        payload: { id: codex.sessionId, cwd: "/synthetic/workspace" },
      }),
      "not-json",
      JSON.stringify({
        type: "event_msg",
        timestamp: "2026-10-01T10:00:30.000Z",
        payload: { type: "agent_message", message: "x".repeat(300) },
      }),
      JSON.stringify({
        type: "event_msg",
        timestamp: "2026-10-01T10:01:00.000Z",
        payload: {
          type: "token_count",
          info: {
            last_token_usage: { input_tokens: 5, output_tokens: 2 },
          },
        },
      }),
    ]);
    const manifest = manifestFor(
      [
        {
          key: codex,
          parent: null,
          disposition: "local-allowed",
          source: { format: "codex", absolutePath: file },
        },
      ],
      { main: codex },
    );
    const packet = await collectEvidence(
      localRequest({ main: codex }),
      createManifestEvidenceSource(manifest, {
        limits: {
          sourceBytes: DEFAULT_LIMITS.sourceBytes,
          lineBytes: 256,
        },
      }),
      new AbortController().signal,
    );
    expect(packet.nodes[0]?.coverage).toBe("partial");
    expect(packet.gaps.map((gap) => gap.code)).toContain("malformed-record");
    expect(packet.events.map((event) => event.kind)).toEqual([
      "launch",
      "usage",
    ]);
    expect(packet.events[1]?.counts).toEqual({
      inputTokens: 5,
      outputTokens: 2,
      cost: null,
      currency: null,
    });
  });

  it("counts rejected bytes toward the source byte limit", async () => {
    const root = await temporaryRoot();
    const codex: NodeKey = { hostId: "host-codex", sessionId: "codex-session" };
    const header = `${JSON.stringify({
      type: "session_meta",
      timestamp: "2026-10-01T10:00:00.000Z",
      payload: { id: codex.sessionId, cwd: "/synthetic/workspace" },
    })}\n`;
    const rejected = `${"x".repeat(70_000)}\n`;
    const file = path.join(root, "byte-limit.jsonl");
    await fs.writeFile(file, header + rejected);
    const totalBytes = Buffer.byteLength(header + rejected, "utf8");
    const manifest = manifestFor(
      [
        {
          key: codex,
          parent: null,
          disposition: "local-allowed",
          source: { format: "codex", absolutePath: file },
        },
      ],
      { main: codex },
    );
    const packet = await collectEvidence(
      localRequest({ main: codex }),
      createManifestEvidenceSource(manifest, {
        limits: {
          sourceBytes: totalBytes - 1,
          lineBytes: DEFAULT_LIMITS.lineBytes,
        },
      }),
      new AbortController().signal,
    );
    expect(
      packet.events.map((event) => ({
        id: event.id,
        kind: event.kind,
      })),
    ).toEqual([{ id: codex.sessionId, kind: "launch" }]);
    expect(packet.gaps.map((gap) => gap.code)).toContain("source-byte-limit");
    expect(packet.nodes[0]?.coverage).toBe("partial");
  });

  it.skipIf(process.platform === "win32")(
    "never opens a manifest source that is a symlink",
    async () => {
      const root = await temporaryRoot();
      const real = path.join(root, "real.jsonl");
      const link = path.join(root, "link.jsonl");
      await writeJsonl(root, "real.jsonl", [ompHeader(MAIN)]);
      await fs.symlink(real, link);
      const manifest = manifestFor([
        {
          key: MAIN,
          parent: null,
          disposition: "local-allowed",
          source: { format: "omp", absolutePath: link },
        },
      ]);
      const packet = await collectEvidence(
        localRequest(),
        createManifestEvidenceSource(manifest),
        new AbortController().signal,
      );
      expect(packet.nodes[0]?.disposition).toBe("unavailable");
      expect(packet.nodes[0]?.coverage).toBe("unavailable");
      expect(packet.events).toEqual([]);
      expect(packet.gaps.map((gap) => gap.code)).toContain("unavailable");
    },
  );

  it("refuses source identities that differ only above 2^53", async () => {
    const root = await temporaryRoot();
    const file = await writeJsonl(root, "main.jsonl", [ompHeader(MAIN)]);
    const manifest = manifestFor([
      {
        key: MAIN,
        parent: null,
        disposition: "local-allowed",
        source: { format: "omp", absolutePath: file },
      },
    ]);
    const real = await fs.lstat(file, { bigint: true });
    const forge = (ino: bigint): typeof real =>
      Object.assign(
        Object.create(Object.getPrototypeOf(real)) as typeof real,
        real,
        { dev: 9007199254740992n, ino },
      );
    let calls = 0;
    setNativeReaderSourceStatForTests(async () => {
      calls += 1;
      return calls === 1 ? forge(9007199254740992n) : forge(9007199254740993n);
    });
    try {
      const packet = await collectEvidence(
        localRequest(),
        createManifestEvidenceSource(manifest),
        new AbortController().signal,
      );
      expect(packet.nodes[0]?.coverage).toBe("partial");
      expect(packet.gaps.map((gap) => gap.code)).toContain(
        "source-unavailable",
      );
      expect(packet.events).toEqual([]);
    } finally {
      setNativeReaderSourceStatForTests(undefined);
    }
  });

  it("rejects manifests with unknown keys or excessive bytes", async () => {
    const root = await temporaryRoot();
    const extra = path.join(root, "extra.json");
    await fs.writeFile(
      extra,
      JSON.stringify({
        schemaVersion: 1,
        provenance: "user-supplied",
        main: MAIN,
        checkpointId: "checkpoint-1",
        cutoff: CUTOFF,
        nodes: [],
        unexpected: true,
      }),
    );
    await expect(loadLocalManifest(extra)).rejects.toThrow();
    const oversized = path.join(root, "oversized.json");
    await fs.writeFile(
      oversized,
      `{${" ".repeat(DEFAULT_LIMITS.manifestBytes)}}`,
    );
    await expect(loadLocalManifest(oversized)).rejects.toThrow();
  });
  it("reports an oversized record without losing later valid events", async () => {
    const root = await temporaryRoot();
    const codex: NodeKey = { hostId: "host-codex", sessionId: "codex-session" };
    const file = await writeLines(root, "oversized-line.jsonl", [
      JSON.stringify({
        type: "session_meta",
        timestamp: "2026-10-01T10:00:00.000Z",
        payload: { id: codex.sessionId },
      }),
      "x".repeat(300),
      JSON.stringify({
        type: "event_msg",
        timestamp: "2026-10-01T10:01:00.000Z",
        payload: {
          type: "token_count",
          info: { last_token_usage: { input_tokens: 5, output_tokens: 2 } },
        },
      }),
    ]);
    const manifest = manifestFor(
      [
        {
          key: codex,
          parent: null,
          disposition: "local-allowed",
          source: { format: "codex", absolutePath: file },
        },
      ],
      { main: codex },
    );
    const packet = await collectEvidence(
      localRequest({ main: codex }),
      createManifestEvidenceSource(manifest, {
        limits: { sourceBytes: DEFAULT_LIMITS.sourceBytes, lineBytes: 256 },
      }),
      new AbortController().signal,
    );
    expect(packet.nodes[0]?.coverage).toBe("partial");
    expect(packet.gaps.map((gap) => gap.code)).toContain("line-limit");
    expect(packet.events.map((event) => event.kind)).toEqual([
      "launch",
      "usage",
    ]);
  });

  it("reconciles last-only usage against later Codex cumulative totals", async () => {
    const root = await temporaryRoot();
    const codex: NodeKey = { hostId: "host-codex", sessionId: "codex-session" };
    const file = await writeJsonl(root, "mixed-codex.jsonl", [
      {
        type: "session_meta",
        timestamp: "2026-10-01T10:00:00.000Z",
        payload: { id: codex.sessionId },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T10:01:00.000Z",
        payload: {
          type: "token_count",
          info: {
            last_token_usage: { input_tokens: 5, output_tokens: 2 },
            total_token_usage: { input_tokens: 5, output_tokens: 2 },
          },
        },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T10:02:00.000Z",
        payload: {
          type: "token_count",
          info: { last_token_usage: { input_tokens: 2, output_tokens: 1 } },
        },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T10:03:00.000Z",
        payload: {
          type: "token_count",
          info: { total_token_usage: { input_tokens: 10, output_tokens: 4 } },
        },
      },
    ]);
    const packet = await collectEvidence(
      localRequest({ main: codex }),
      createManifestEvidenceSource(
        manifestFor(
          [
            {
              key: codex,
              parent: null,
              disposition: "local-allowed",
              source: { format: "codex", absolutePath: file },
            },
          ],
          { main: codex },
        ),
      ),
      new AbortController().signal,
    );
    expect(packet.nodes[0]?.coverage).toBe("structured-events");
    expect(
      packet.events
        .filter((event) => event.kind === "usage")
        .map((event) => event.counts),
    ).toEqual([
      { inputTokens: 5, outputTokens: 2, cost: null, currency: null },
      { inputTokens: 2, outputTokens: 1, cost: null, currency: null },
      { inputTokens: 3, outputTokens: 1, cost: null, currency: null },
    ]);
  });
  it("reconciles intervening last-only usage before a Codex total-plus-last row", async () => {
    const root = await temporaryRoot();
    const codex: NodeKey = { hostId: "host-codex", sessionId: "codex-session" };
    const file = await writeJsonl(root, "mixed-total-last.jsonl", [
      {
        type: "session_meta",
        timestamp: "2026-10-01T10:00:00.000Z",
        payload: { id: codex.sessionId },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T10:01:00.000Z",
        payload: {
          type: "token_count",
          info: { total_token_usage: { input_tokens: 5, output_tokens: 2 } },
        },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T10:02:00.000Z",
        payload: {
          type: "token_count",
          info: { last_token_usage: { input_tokens: 2, output_tokens: 1 } },
        },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T10:03:00.000Z",
        payload: {
          type: "token_count",
          info: {
            last_token_usage: { input_tokens: 3, output_tokens: 1 },
            total_token_usage: { input_tokens: 10, output_tokens: 4 },
          },
        },
      },
    ]);
    const packet = await collectEvidence(
      localRequest({ main: codex }),
      createManifestEvidenceSource(
        manifestFor(
          [
            {
              key: codex,
              parent: null,
              disposition: "local-allowed",
              source: { format: "codex", absolutePath: file },
            },
          ],
          { main: codex },
        ),
      ),
      new AbortController().signal,
    );
    expect(packet.nodes[0]?.coverage).toBe("structured-events");
    expect(
      packet.events
        .filter((event) => event.kind === "usage")
        .map((event) => event.counts),
    ).toEqual([
      { inputTokens: 5, outputTokens: 2, cost: null, currency: null },
      { inputTokens: 2, outputTokens: 1, cost: null, currency: null },
      { inputTokens: 3, outputTokens: 1, cost: null, currency: null },
    ]);
  });
  it("reconciles last-only usage before the first cumulative Codex total", async () => {
    const root = await temporaryRoot();
    const codex: NodeKey = { hostId: "host-codex", sessionId: "codex-session" };
    const file = await writeJsonl(root, "last-first-codex.jsonl", [
      {
        type: "session_meta",
        timestamp: "2026-10-01T10:00:00.000Z",
        payload: { id: codex.sessionId },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T10:01:00.000Z",
        payload: {
          type: "token_count",
          info: { last_token_usage: { input_tokens: 5, output_tokens: 2 } },
        },
      },
      {
        type: "event_msg",
        timestamp: "2026-10-01T10:02:00.000Z",
        payload: {
          type: "token_count",
          info: { total_token_usage: { input_tokens: 8, output_tokens: 3 } },
        },
      },
    ]);
    const packet = await collectEvidence(
      localRequest({ main: codex }),
      createManifestEvidenceSource(
        manifestFor(
          [
            {
              key: codex,
              parent: null,
              disposition: "local-allowed",
              source: { format: "codex", absolutePath: file },
            },
          ],
          { main: codex },
        ),
      ),
      new AbortController().signal,
    );
    expect(packet.nodes[0]?.coverage).toBe("structured-events");
    expect(
      packet.events
        .filter((event) => event.kind === "usage")
        .map((event) => event.counts),
    ).toEqual([
      { inputTokens: 5, outputTokens: 2, cost: null, currency: null },
      { inputTokens: 3, outputTokens: 1, cost: null, currency: null },
    ]);
  });
  it("keeps the serialized packet within the output budget and reports truncation", async () => {
    const events = Array.from({ length: 30_000 }, (_, index) =>
      eventFor(MAIN, `event-${index}`, "2026-10-01T10:01:00.000Z"),
    );
    const source = fixtureSource({
      nodes: [{ key: MAIN, parent: null, disposition: "local-allowed" }],
      events: [{ node: MAIN, events }],
    });
    const packet = await collectEvidence(
      localRequest(),
      source,
      new AbortController().signal,
    );
    expect(
      Buffer.byteLength(JSON.stringify(packet), "utf8"),
    ).toBeLessThanOrEqual(DEFAULT_LIMITS.outputBytes);
    expect(packet.gaps.map((gap) => gap.code)).toContain("output-limit");
    expect(packet.nodes[0]?.coverage).toBe("partial");
  });

  it("rejects timestamps without an explicit timezone", async () => {
    await expect(
      collectEvidence(
        localRequest({ cutoff: "2026-10-01T10:10:00" }),
        fixtureSource(),
        new AbortController().signal,
      ),
    ).rejects.toThrow();
  });
});
