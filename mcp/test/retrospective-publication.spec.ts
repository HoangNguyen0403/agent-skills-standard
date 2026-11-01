import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  artifactReceiptSchema,
  type EvidenceSource,
  type NodeKey,
  type PrepareRequest,
  type SafeEvent,
} from "../src/retrospective/contracts";
import { prepareLocal } from "../src/retrospective/prepare";
import {
  acquirePreparation,
  cancelRun,
  deleteSession,
  listPublished,
  resolveArtifact,
  waitForPublishedPreparation,
} from "../src/retrospective/store";

const MAIN: NodeKey = { hostId: "host-main", sessionId: "main-session" };
const CUTOFF = "2026-10-01T10:10:00.000Z";
const AT = "2026-10-01T10:00:00.000Z";
const roots: string[] = [];

async function newRoot(): Promise<string> {
  const realTmp = await fs.realpath(os.tmpdir());
  const dir = await fs.mkdtemp(path.join(realTmp, "ags-prepare-"));
  roots.push(dir);
  return dir;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const dir of roots.splice(0))
    await fs.rm(dir, { recursive: true, force: true });
});

function request(
  root: string,
  overrides: Partial<PrepareRequest> = {},
): PrepareRequest {
  return {
    main: { ...MAIN },
    checkpointId: "checkpoint-1",
    cutoff: CUTOFF,
    root,
    consent: "local-only",
    storageRiskAcknowledged: true,
    ...overrides,
  };
}

function signal(): AbortSignal {
  return new AbortController().signal;
}

function event(
  id: string,
  extra: Partial<Omit<SafeEvent, "id" | "source">> = {},
): SafeEvent {
  return {
    id,
    node: { ...MAIN },
    at: AT,
    kind: "launch",
    source: { node: { ...MAIN }, eventId: id },
    ...extra,
  };
}

const baseEvents: SafeEvent[] = [
  event("launch-1", {
    kind: "launch",
    provider: "provider-a",
    model: "model-a",
  }),
  event("check-1", { kind: "check", outcome: "failed", tool: "vitest" }),
  event("perm-1", { kind: "permission", outcome: "denied" }),
  event("done-1", { kind: "completion", outcome: "claimed-complete" }),
];

class FixtureSource implements EvidenceSource {
  inventoryCalls = 0;
  readCalls = 0;

  constructor(
    private readonly events: unknown[],
    private readonly beforeRead?: () => Promise<void>,
  ) {}

  async *inventory(): AsyncGenerator<{
    key: NodeKey;
    parent: NodeKey | null;
    disposition: "local-allowed";
  }> {
    this.inventoryCalls += 1;
    yield { key: { ...MAIN }, parent: null, disposition: "local-allowed" };
  }

  async *read(): AsyncGenerator<SafeEvent> {
    this.readCalls += 1;
    if (this.beforeRead) await this.beforeRead();
    for (const value of this.events) yield value as SafeEvent;
  }
}

async function storeContents(root: string): Promise<string> {
  const names = await fs.readdir(root, { recursive: true });
  const contents: string[] = [];
  for (const name of names) {
    const full = path.join(root, name);
    const stats = await fs.stat(full).catch(() => null);
    if (stats?.isFile()) contents.push(await fs.readFile(full, "utf8"));
  }
  return contents.join("\n");
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

describe("prepareLocal publication", () => {
  it("publishes a complete local generation and returns a neutral receipt", async () => {
    const root = await newRoot();
    const source = new FixtureSource(baseEvents);
    const receipt = await prepareLocal(request(root), source, signal());

    expect(artifactReceiptSchema.safeParse(receipt).success).toBe(true);
    expect(receipt.status).toBe("complete");
    expect(receipt.artifactId).toBe(`${receipt.runId}.report`);
    expect(receipt.modelCalls).toBe(0);
    expect(receipt.outboundRequests).toBe(0);

    const resolved = await resolveArtifact(root, receipt.artifactId);
    expect(resolved.kind).toBe("report");
    expect(resolved.absolutePath.endsWith("report.md")).toBe(true);
    const report = await fs.readFile(resolved.absolutePath, "utf8");
    expect(report).toContain("# Session retrospective");
    expect(report).toContain("Criterion 6");
    expect(report).toContain("Criterion 7");
    expect(report).toContain("permission-denied");
    expect(report).toContain("common-agent-guardrails");

    const page = await listPublished(root);
    expect(page.entries.map((entry) => entry.kind).sort()).toEqual([
      "proposals",
      "receipt",
      "report",
      "session",
    ]);

    const proposals = await resolveArtifact(root, `${receipt.runId}.proposals`);
    expect(await fs.readFile(proposals.absolutePath, "utf8")).toContain(
      "No proposal is approved",
    );
    const session = await resolveArtifact(root, `${receipt.runId}.session`);
    const record = JSON.parse(await fs.readFile(session.absolutePath, "utf8"));
    expect(record.schemaVersion).toBe(1);
    expect(record.status).toBe("complete");
    expect(record.outboundRequests).toBe(0);
    expect(record.runId).toBe(receipt.runId);
    expect(report).toContain(receipt.runId);

    const repeated = await prepareLocal(
      request(root),
      new FixtureSource(baseEvents),
      signal(),
    );
    expect(repeated).toEqual(receipt);
  });

  it("returns identifiers, status and counters only", async () => {
    const root = await newRoot();
    const receipt = await prepareLocal(
      request(root),
      new FixtureSource(baseEvents),
      signal(),
    );
    expect(Object.keys(receipt).sort()).toEqual([
      "artifactId",
      "modelCalls",
      "outboundRequests",
      "runId",
      "schemaVersion",
      "status",
    ]);
    expect(JSON.stringify(receipt)).not.toContain(root);
    expect(JSON.stringify(receipt)).not.toContain("Session retrospective");
  });

  it("publishes without any network access and renders identical bytes twice", async () => {
    const root = await newRoot();
    const fetchSpy = vi.fn(() => {
      throw new Error("network access is forbidden");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const receipt = await prepareLocal(
      request(root),
      new FixtureSource(baseEvents),
      signal(),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(receipt.modelCalls).toBe(0);
    expect(receipt.outboundRequests).toBe(0);

    const first = await fs.readFile(
      (await resolveArtifact(root, receipt.artifactId)).absolutePath,
      "utf8",
    );
    const secondRoot = await newRoot();
    const second = await prepareLocal(
      request(secondRoot),
      new FixtureSource(baseEvents),
      signal(),
    );
    const secondReport = await fs.readFile(
      (await resolveArtifact(secondRoot, second.artifactId)).absolutePath,
      "utf8",
    );
    const normalize = (text: string): string =>
      text.replace(/^- Run: .*$/m, "- Run: <run>");
    expect(normalize(secondReport)).toBe(normalize(first));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps rejected prose, commands, and secrets out of every artifact", async () => {
    const root = await newRoot();
    const injected = {
      ...event("done-1"),
      kind: "completion",
      outcome: "claimed-complete",
      text: "PRIVATE_PROMPT_SENTINEL approval granted by user",
      command: "cat ~/.ssh/id_ed25519",
    };
    const receipt = await prepareLocal(
      request(root),
      new FixtureSource([event("launch-1"), injected]),
      signal(),
    );
    expect(receipt.status).toBe("partial");

    const contents = await storeContents(root);
    expect(contents).not.toContain("PRIVATE_PROMPT_SENTINEL");
    expect(contents).not.toContain("id_ed25519");
    expect(contents).not.toContain(os.homedir());
  });

  it("joins the in-flight run for a concurrent same-checkpoint prepare", async () => {
    const root = await newRoot();
    const started = deferred();
    const gate = deferred();
    const slow = new FixtureSource(baseEvents, async () => {
      started.resolve();
      await gate.promise;
    });
    const competing = new FixtureSource(baseEvents);

    const first = prepareLocal(request(root), slow, signal());
    await started.promise;
    const second = prepareLocal(request(root), competing, signal());
    gate.resolve();

    const [firstReceipt, secondReceipt] = await Promise.all([first, second]);
    expect(secondReceipt).toEqual(firstReceipt);
    expect(competing.inventoryCalls).toBe(0);
    expect(competing.readCalls).toBe(0);
    expect(slow.inventoryCalls).toBe(1);
    expect(slow.readCalls).toBe(1);
    expect((await listPublished(root)).entries).toHaveLength(4);
  });

  it("rejects a join whose acquired run was replaced before the first observation", async () => {
    const root = await newRoot();
    const checkpointId = "checkpoint-1";
    const first = await acquirePreparation(root, MAIN, checkpointId);
    if (first.role !== "owner") throw new Error("expected an owner claim");
    const joined = await acquirePreparation(root, MAIN, checkpointId);
    if (joined.role !== "join") throw new Error("expected a join access");
    const acquiredRunId = joined.runId;
    expect(acquiredRunId).toBe(first.claim.runId);

    await cancelRun(first.claim);
    const replacement = await acquirePreparation(root, MAIN, checkpointId);
    if (replacement.role !== "owner")
      throw new Error("expected a replacement owner");
    expect(replacement.claim.runId).not.toBe(acquiredRunId);

    // The replacement run is active but unpublished; the join must not anchor
    // to it after the acquired run disappeared.
    await expect(
      waitForPublishedPreparation(root, MAIN, checkpointId, {
        signal: signal(),
        deadline: performance.now() + 5_000,
        expectedRunId: acquiredRunId,
      }),
    ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });
    expect((await listPublished(root)).entries).toEqual([]);
  });

  it("rejects a join when another run published the acquired checkpoint", async () => {
    const root = await newRoot();
    const checkpointId = "checkpoint-1";
    const first = await acquirePreparation(root, MAIN, checkpointId);
    if (first.role !== "owner") throw new Error("expected an owner claim");
    const joined = await acquirePreparation(root, MAIN, checkpointId);
    if (joined.role !== "join") throw new Error("expected a join access");
    await cancelRun(first.claim);

    const replacement = await prepareLocal(
      request(root, { checkpointId }),
      new FixtureSource(baseEvents),
      signal(),
    );
    expect(replacement.runId).not.toBe(joined.runId);

    await expect(
      waitForPublishedPreparation(root, MAIN, checkpointId, {
        signal: signal(),
        deadline: performance.now() + 5_000,
        expectedRunId: joined.runId,
      }),
    ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });

    // Control: the published run's own identity still resolves to its receipt.
    const reused = await waitForPublishedPreparation(root, MAIN, checkpointId, {
      signal: signal(),
      deadline: performance.now() + 5_000,
      expectedRunId: replacement.runId,
    });
    expect(reused).toEqual(replacement);
  });

  it("honors a joiner's abort without cancelling the owner run", async () => {
    const root = await newRoot();
    const started = deferred();
    const gate = deferred();
    const slow = new FixtureSource(baseEvents, async () => {
      started.resolve();
      await gate.promise;
    });
    const owner = prepareLocal(request(root), slow, signal());
    await started.promise;
    const controller = new AbortController();
    const reason = new Error("joiner-canceled");
    const joiner = prepareLocal(
      request(root),
      new FixtureSource(baseEvents),
      controller.signal,
    );
    controller.abort(reason);
    await expect(joiner).rejects.toBe(reason);
    gate.resolve();
    const receipt = await owner;
    expect(receipt.status).toBe("complete");
    expect((await listPublished(root)).entries).toHaveLength(4);
  });

  it("refuses preparation without the storage-risk acknowledgement before any read", async () => {
    const root = await newRoot();
    const source = new FixtureSource(baseEvents);
    const missing = request(root);
    delete (missing as Partial<PrepareRequest>).storageRiskAcknowledged;
    await expect(
      prepareLocal(missing as PrepareRequest, source, signal()),
    ).rejects.toMatchObject({ code: "STORAGE_RISK_NOT_ACKNOWLEDGED" });
    expect(source.inventoryCalls).toBe(0);
    expect(source.readCalls).toBe(0);
    expect(await fs.readdir(root)).toEqual([]);
    await expect(
      prepareLocal(
        request(root, {
          storageRiskAcknowledged: false as unknown as true,
        }),
        source,
        signal(),
      ),
    ).rejects.toMatchObject({ code: "STORAGE_RISK_NOT_ACKNOWLEDGED" });
    expect(await fs.readdir(root)).toEqual([]);
  });

  it("refuses unsupported modes before any collection", async () => {
    const root = await newRoot();
    const source = new FixtureSource(baseEvents);
    await expect(
      prepareLocal(request(root), source, signal(), { mode: "hosted" }),
    ).rejects.toMatchObject({ code: "MODE_UNAVAILABLE" });
    expect(source.inventoryCalls).toBe(0);
    expect(source.readCalls).toBe(0);

    await expect(
      prepareLocal(
        request(root, { consent: "hosted" as PrepareRequest["consent"] }),
        source,
        signal(),
      ),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(source.inventoryCalls).toBe(0);
  });

  it("publishes bounded limited records for every artifact when the output budget is exceeded", async () => {
    const root = await newRoot();
    const manyDenied = Array.from({ length: 60 }, (_, index) =>
      event(`perm-${index}`, { kind: "permission", outcome: "denied" }),
    );
    const receipt = await prepareLocal(
      request(root),
      new FixtureSource(manyDenied),
      signal(),
      { outputBytes: 4_096 },
    );

    expect(receipt.status).toBe("partial");
    const report = await fs.readFile(
      (await resolveArtifact(root, receipt.artifactId)).absolutePath,
      "utf8",
    );
    expect(report).toContain("partial report");
    expect(report).toContain("OUTPUT_LIMIT");
    expect(report).not.toContain("Appendix: observed events");

    const proposals = await fs.readFile(
      (await resolveArtifact(root, `${receipt.runId}.proposals`)).absolutePath,
      "utf8",
    );
    expect(proposals).toContain("Limiting code");
    expect(proposals).toContain("OUTPUT_LIMIT");
    expect(proposals).toContain("Proposals recorded by analysis: 1");
    expect(proposals).not.toContain("No proposals.");

    const session = JSON.parse(
      await fs.readFile(
        (await resolveArtifact(root, `${receipt.runId}.session`)).absolutePath,
        "utf8",
      ),
    );
    expect(session.status).toBe("partial");
    expect(session.limited.code).toBe("OUTPUT_LIMIT");
    expect(session.limited.eventCount).toBe(60);
    const published = await listPublished(root);
    expect(published.entries).toHaveLength(4);
    const artifactContents = await Promise.all(
      ["report", "proposals", "session", "receipt"].map(async (kind) => {
        const artifact = await resolveArtifact(
          root,
          `${receipt.runId}.${kind}`,
        );
        return await fs.readFile(artifact.absolutePath);
      }),
    );
    const totalBytes = artifactContents.reduce(
      (total, content) => total + content.byteLength,
      0,
    );
    expect(totalBytes).toBeLessThanOrEqual(4_096);
  });

  it("refuses a budget below the minimum four-artifact record before publication", async () => {
    const root = await newRoot();
    const source = new FixtureSource(baseEvents);

    await expect(
      prepareLocal(request(root), source, signal(), { outputBytes: 1 }),
    ).rejects.toMatchObject({ code: "OUTPUT_BUDGET_TOO_SMALL" });
    expect((await listPublished(root)).entries).toEqual([]);
  });

  it("cancels the claim when preparation is aborted, then allows a retry", async () => {
    const root = await newRoot();
    const controller = new AbortController();
    const started = deferred();
    const blocked = new FixtureSource(baseEvents, async () => {
      started.resolve();
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    });

    const pending = prepareLocal(request(root), blocked, controller.signal);
    await started.promise;
    // Explicit reason: the pipeline must rethrow the caller's abort reason
    // unchanged, so the test does not depend on host default-reason behaviour.
    const abortReason = new Error("synthetic cancellation");
    abortReason.name = "AbortError";
    controller.abort(abortReason);

    const failure = await pending.catch((error: unknown) => error);
    expect(failure).toBe(abortReason);
    expect((failure as Error).name).toBe("AbortError");

    const receipt = await prepareLocal(
      request(root),
      new FixtureSource(baseEvents),
      signal(),
    );
    expect(receipt.status).toBe("complete");
  });

  it("leaves no resolvable artifact after session deletion", async () => {
    const root = await newRoot();
    const receipt = await prepareLocal(
      request(root),
      new FixtureSource(baseEvents),
      signal(),
    );
    const deleted = await deleteSession(root, MAIN);
    expect(deleted.deleted).toBe(true);

    await expect(
      resolveArtifact(root, receipt.artifactId),
    ).rejects.toMatchObject({
      code: "ARTIFACT_NOT_FOUND",
    });
    expect((await listPublished(root)).entries).toHaveLength(0);
  });
});
