import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NodeKey } from "../src/retrospective/contracts";
import {
  decodeWindowsHelperResponse,
  encodeWindowsHelperRequest,
  ensurePrivateDirectory,
  ensurePrivateRoot,
  ensureWindowsPrivateRoot,
  ensureWindowsPrivateStoreLayout,
  resolveWindowsHelperPath,
  setWindowsHelperSpawnForTests,
  windowsPowerShellEnvironment,
  windowsPowerShellPath,
  type WindowsHelperSpawn,
} from "../src/retrospective/platform-private";
import {
  STORE_LIMITS,
  StoreError,
  acquirePreparation,
  cancelRun,
  claimRun,
  deleteSession,
  listPublished,
  prepareStore,
  publishRun,
  resolveArtifact,
  resolvePublishedPreparation,
  sessionToken,
  waitForPublishedPreparation,
  withSessionLock,
  type PublishArtifact,
  type StoreLayout,
} from "../src/retrospective/store";

const MAIN: NodeKey = { hostId: "host-main", sessionId: "main-session" };
const OTHER_MAIN: NodeKey = {
  hostId: "host-other",
  sessionId: "other-session",
};
const roots: string[] = [];
const ORIGINAL_SYSTEM_ROOT = process.env.SystemRoot;

function installFakeWindowsHelper(spawner: WindowsHelperSpawn): void {
  process.env.SystemRoot = path.parse(process.cwd()).root;
  setWindowsHelperSpawnForTests(spawner, "/fake/windows-private.ps1");
}

async function privateFixtureRoot(): Promise<string> {
  const realTmp = await fs.realpath(os.tmpdir());
  const dir = await fs.mkdtemp(path.join(realTmp, "ags-store-"));
  roots.push(dir);
  return dir;
}

async function outsideDirectory(prefix: string): Promise<string> {
  const realTmp = await fs.realpath(os.tmpdir());
  const dir = await fs.mkdtemp(path.join(realTmp, `ags-${prefix}-`));
  roots.push(dir);
  return dir;
}

afterEach(async () => {
  setWindowsHelperSpawnForTests(null);
  if (ORIGINAL_SYSTEM_ROOT === undefined) delete process.env.SystemRoot;
  else process.env.SystemRoot = ORIGINAL_SYSTEM_ROOT;
  vi.useRealTimers();
  for (const dir of roots.splice(0))
    await fs.rm(dir, { recursive: true, force: true });
});

function safeArtifacts(tag: string): PublishArtifact[] {
  return [
    {
      artifactId: `artifact-${tag}-report`,
      kind: "report",
      content: `# Retrospective ${tag}\n`,
    },
    {
      artifactId: `artifact-${tag}-session`,
      kind: "session",
      content: JSON.stringify({ schemaVersion: 1, tag }),
    },
  ];
}

async function publishedIds(root: string): Promise<string[]> {
  const page = await listPublished(root, { limit: 100 });
  return page.entries.map((entry) => entry.artifactId);
}

async function allNames(root: string): Promise<string[]> {
  const names: string[] = [];
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      names.push(entry.name);
      if (entry.isDirectory()) await walk(path.join(directory, entry.name));
    }
  };
  await walk(root);
  return names;
}

async function treeBytes(directory: string): Promise<number> {
  let total = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    const stats = await fs.lstat(full);
    if (stats.isDirectory()) total += await treeBytes(full);
    else if (stats.isFile()) total += Number(stats.size);
  }
  return total;
}

async function waitForEmptyDirectory(directory: string): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if ((await fs.readdir(directory)).length === 0) return;
    await delay(25);
  }
}

function storeErrorFrom(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return null;
}

type FakeHelperItem = {
  path: string;
  mode: string;
  itemKind?: string;
};

type FakeHelperRequest = { id: number; items: FakeHelperItem[] };

class FakeHelperChild extends EventEmitter {
  readonly stdin = new PassThrough();
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  killed = false;

  kill(): boolean {
    this.killed = true;
    this.emit("close", 0);
    return true;
  }
}

type FakeHelper = {
  readonly child: ChildProcessWithoutNullStreams;
  readonly raw: FakeHelperChild;
  readonly requests: FakeHelperRequest[];
  setResponder(responder: (request: FakeHelperRequest) => unknown | null): void;
  respondNow(response: unknown): void;
};

function fakeWindowsHelper(): FakeHelper {
  const raw = new FakeHelperChild();
  const requests: FakeHelperRequest[] = [];
  let responder: (request: FakeHelperRequest) => unknown | null = () => null;
  raw.stdin.setEncoding("utf8");
  let buffer = "";
  raw.stdin.on("data", (chunk: string) => {
    buffer += chunk;
    for (;;) {
      const newline = buffer.indexOf("\n");
      if (newline < 0) break;
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (line.length === 0) continue;
      const request = JSON.parse(line) as FakeHelperRequest;
      requests.push(request);
      const response = responder(request);
      if (response !== null) raw.stdout.write(`${JSON.stringify(response)}\n`);
    }
  });
  return {
    child: raw as unknown as ChildProcessWithoutNullStreams,
    raw,
    requests,
    setResponder(next) {
      responder = next;
    },
    respondNow(response) {
      raw.stdout.write(`${JSON.stringify(response)}\n`);
    },
  };
}

function respondOk(request: FakeHelperRequest): {
  id: number;
  results: Array<{ ok: true }>;
} {
  return {
    id: request.id,
    results: request.items.map(() => ({ ok: true as const })),
  };
}

describe("private store claims and publication", () => {
  it("creates owner-private storage and an unguessable claim", async () => {
    const root = await privateFixtureRoot();
    const claim = await claimRun(root, MAIN, "cp-1");
    expect(claim.runId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(claim.claimToken).toMatch(/^[0-9a-f]{64}$/);
    if (process.platform !== "win32")
      expect((await fs.lstat(root)).mode & 0o777).toBe(0o700);
    const sessions = await fs.readdir(path.join(root, "sessions"));
    expect(sessions).toEqual([sessionToken(MAIN)]);
    const sessionDir = path.join(root, "sessions", sessions[0]);
    if (process.platform !== "win32") {
      expect((await fs.lstat(sessionDir)).mode & 0o777).toBe(0o700);
      const claimFile = path.join(root, "claims", `${sessionToken(MAIN)}.json`);
      expect((await fs.lstat(claimFile)).mode & 0o777).toBe(0o600);
    }
  });

  it("returns the same active run to simultaneous claims", async () => {
    const root = await privateFixtureRoot();
    const [first, second] = await Promise.all([
      claimRun(root, MAIN, "cp-1"),
      claimRun(root, MAIN, "cp-1"),
    ]);
    expect(second.runId).toBe(first.runId);
    expect(second.claimToken).toBe(first.claimToken);
    await expect(claimRun(root, MAIN, "cp-2")).rejects.toMatchObject({
      code: "RUN_ACTIVE",
    });
  });

  it("publishes one immutable generation and resolves only validated paths", async () => {
    const root = await privateFixtureRoot();
    const claim = await claimRun(root, MAIN, "cp-1");
    const result = await publishRun(claim, safeArtifacts("one"));
    expect(result.status).toBe("complete");
    expect(await publishedIds(root)).toEqual(result.artifactIds);
    const resolved = await resolveArtifact(root, result.artifactIds[0]);
    expect(resolved.kind).toBe("report");
    if (process.platform !== "win32")
      expect((await fs.lstat(resolved.absolutePath)).mode & 0o777).toBe(0o600);
    expect(await fs.readFile(resolved.absolutePath, "utf8")).toContain(
      "Retrospective one",
    );
    const names = await allNames(root);
    expect(names.some((name) => name.includes(MAIN.hostId))).toBe(false);
    expect(names.some((name) => name.includes(MAIN.sessionId))).toBe(false);
    const pointer = (
      await fs.readFile(path.join(root, "index", "current"), "utf8")
    ).trim();
    const indexBody = await fs.readFile(
      path.join(root, "index", "generations", pointer),
      "utf8",
    );
    expect(indexBody).not.toContain("Retrospective one");
    await expect(
      publishRun(claim, safeArtifacts("again")),
    ).rejects.toMatchObject({ code: "CLAIM_CONSUMED" });
    await expect(claimRun(root, MAIN, "cp-1")).rejects.toMatchObject({
      code: "RUN_ALREADY_PUBLISHED",
    });
    expect(await publishedIds(root)).toEqual(result.artifactIds);
  });

  it("cancels a claim and never lets it publish", async () => {
    const root = await privateFixtureRoot();
    const claim = await claimRun(root, MAIN, "cp-1");
    await cancelRun(claim);
    await expect(
      publishRun(claim, safeArtifacts("canceled")),
    ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });
    expect(await publishedIds(root)).toEqual([]);
    const retry = await claimRun(root, MAIN, "cp-1");
    expect(retry.runId).not.toBe(claim.runId);
    const result = await publishRun(retry, safeArtifacts("retry"));
    expect(await publishedIds(root)).toEqual(result.artifactIds);
  });

  it("does not resurrect output after deletion", async () => {
    const root = await privateFixtureRoot();
    const claim = await claimRun(root, MAIN, "cp-1");
    const first = await publishRun(claim, safeArtifacts("before-delete"));
    expect(await publishedIds(root)).toEqual(first.artifactIds);
    const deleted = await deleteSession(root, MAIN);
    expect(deleted.deleted).toBe(true);
    expect(deleted.removedArtifacts).toBe(2);
    await expect(
      publishRun(claim, safeArtifacts("ghost")),
    ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });
    expect(await publishedIds(root)).toEqual([]);
    await expect(
      fs.lstat(path.join(root, "sessions", sessionToken(MAIN))),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const retry = await claimRun(root, MAIN, "cp-1");
    expect(retry.fence).toBe(deleted.tombstone);
    expect(retry.fence).not.toBe(claim.fence);
    const republished = await publishRun(retry, safeArtifacts("after-delete"));
    expect(await publishedIds(root)).toEqual(republished.artifactIds);
  });

  it("requires explicit cancellation before retrying a stale claim", async () => {
    const root = await privateFixtureRoot();
    const claim = await claimRun(root, MAIN, "cp-1");
    const claimPath = path.join(root, "claims", `${sessionToken(MAIN)}.json`);
    const record = JSON.parse(await fs.readFile(claimPath, "utf8")) as {
      createdAt: string;
      heartbeatAt: string;
    };
    const stale = new Date(Date.now() - 3_600_000).toISOString();
    record.createdAt = stale;
    record.heartbeatAt = stale;
    await fs.writeFile(claimPath, JSON.stringify(record));
    await expect(claimRun(root, MAIN, "cp-2")).rejects.toMatchObject({
      code: "STALE_CLAIM",
    });
    await expect(
      publishRun(claim, safeArtifacts("stale")),
    ).rejects.toMatchObject({ code: "CLAIM_STALE" });
    await cancelRun(claim);
    const retry = await claimRun(root, MAIN, "cp-1");
    expect(retry.runId).not.toBe(claim.runId);
    expect(await publishedIds(root)).toEqual([]);
  });

  it("keeps crashed staging invisible and publishes nothing before the index swap", async () => {
    const root = await privateFixtureRoot();
    const claim = await claimRun(root, MAIN, "cp-1");
    const sessionDir = path.join(root, "sessions", sessionToken(MAIN));
    const crashed = path.join(sessionDir, "staging", "crashed-run");
    await fs.mkdir(crashed, { mode: 0o700 });
    await fs.writeFile(path.join(crashed, "report.md"), "partial", {
      mode: 0o600,
    });
    expect(await publishedIds(root)).toEqual([]);
    const result = await publishRun(claim, safeArtifacts("after-crash"));
    expect(await publishedIds(root)).toEqual(result.artifactIds);
    expect(await fs.readdir(path.join(sessionDir, "generations"))).toHaveLength(
      1,
    );
  });

  it.skipIf(process.platform === "win32")(
    "refuses permissive roots, symlinked roots, and symlink replacement",
    async () => {
      const permissive = await privateFixtureRoot();
      await fs.chmod(permissive, 0o755);
      await expect(claimRun(permissive, MAIN, "cp-1")).rejects.toMatchObject({
        code: "ROOT_PERMISSIVE",
      });

      const base = await privateFixtureRoot();
      const dangling = path.join(base, "dangling-root");
      await fs.symlink(path.join(base, "missing-target"), dangling);
      await expect(claimRun(dangling, MAIN, "cp-1")).rejects.toMatchObject({
        code: "ROOT_SYMLINK",
      });

      const root = await privateFixtureRoot();
      const claim = await claimRun(root, MAIN, "cp-1");
      await publishRun(claim, safeArtifacts("first"));
      const sessionDir = path.join(root, "sessions", sessionToken(MAIN));
      const outside = await outsideDirectory("outside");
      const generations = path.join(sessionDir, "generations");
      await fs.rm(generations, { recursive: true, force: true });
      await fs.symlink(outside, generations);
      await expect(claimRun(root, MAIN, "cp-2")).rejects.toMatchObject({
        code: "UNSAFE_PATH",
      });
      expect(await fs.readdir(outside)).toEqual([]);
    },
  );

  it("rejects traversal artifact IDs without creating partial links", async () => {
    const root = await privateFixtureRoot();
    const claim = await claimRun(root, MAIN, "cp-1");
    await expect(
      publishRun(claim, [
        {
          artifactId: "../escape",
          kind: "report",
          content: "escape",
        },
      ]),
    ).rejects.toMatchObject({ code: "INVALID_ARTIFACT_ID" });
    await expect(resolveArtifact(root, "../escape")).rejects.toMatchObject({
      code: "INVALID_ARTIFACT_ID",
    });
    await expect(
      publishRun(claim, [
        { artifactId: "artifact-good", kind: "report", content: "ok" },
        { artifactId: "artifact-bad/../x", kind: "session", content: "{}" },
      ]),
    ).rejects.toMatchObject({ code: "INVALID_ARTIFACT_ID" });
    const sessionDir = path.join(root, "sessions", sessionToken(MAIN));
    expect(await fs.readdir(path.join(sessionDir, "staging"))).toEqual([]);
    expect(await publishedIds(root)).toEqual([]);
  });

  it("refuses a full store without deleting published output", async () => {
    const root = await privateFixtureRoot();
    const layout = await prepareStore(root);
    const firstClaim = await claimRun(root, MAIN, "cp-1");
    await publishRun(firstClaim, safeArtifacts("keep"));
    const before = await listPublished(root);
    const seedToken = "a".repeat(32);
    for (let index = 1; index < STORE_LIMITS.generations; index += 1) {
      const generation = path.join(
        layout.sessionsDir,
        seedToken,
        "generations",
        `${String(index).padStart(6, "0")}-${"b".repeat(12)}`,
      );
      await fs.mkdir(generation, { recursive: true, mode: 0o700 });
      await fs.writeFile(path.join(generation, "report.md"), "seed", {
        mode: 0o600,
      });
    }
    const next = await claimRun(root, MAIN, "cp-2");
    await expect(
      publishRun(next, safeArtifacts("overflow")),
    ).rejects.toMatchObject({ code: "STORE_GENERATION_LIMIT" });
    const after = await listPublished(root);
    expect(after.entries).toEqual(before.entries);
    const kept = await resolveArtifact(root, before.entries[0].artifactId);
    expect(kept.bytes).toBeGreaterThan(0);
  });

  it("refuses a byte-full store without deleting published output", async () => {
    const root = await privateFixtureRoot();
    await prepareStore(root);
    const claim = await claimRun(root, MAIN, "cp-1");
    const filler = path.join(root, "index", "filler.bin");
    await fs.writeFile(filler, "", { mode: 0o600 });
    await fs.truncate(filler, STORE_LIMITS.bytes);
    await expect(
      publishRun(claim, safeArtifacts("too-big")),
    ).rejects.toMatchObject({ code: "STORE_BYTE_LIMIT" });
    expect(await publishedIds(root)).toEqual([]);
  });

  it("deletes only managed session data", async () => {
    const root = await privateFixtureRoot();
    await prepareStore(root);
    const keep = path.join(root, "keep.txt");
    await fs.writeFile(keep, "keep", { mode: 0o600 });
    const claim = await claimRun(root, MAIN, "cp-1");
    await publishRun(claim, safeArtifacts("managed"));
    await deleteSession(root, MAIN);
    expect(await fs.readFile(keep, "utf8")).toBe("keep");
  });

  it("removes retained index snapshots that list a deleted session", async () => {
    const root = await privateFixtureRoot();
    await prepareStore(root);
    const first = await claimRun(root, MAIN, "cp-history-1");
    await publishRun(first, safeArtifacts("history-one"));
    const second = await claimRun(root, MAIN, "cp-history-2");
    await publishRun(second, safeArtifacts("history-two"));
    const kept = await claimRun(root, OTHER_MAIN, "cp-history-keep");
    await publishRun(kept, safeArtifacts("history-keep"));
    const generationsDir = path.join(root, "index", "generations");
    expect((await fs.readdir(generationsDir)).length).toBeGreaterThan(1);
    await deleteSession(root, MAIN);
    const remaining = await fs.readdir(generationsDir);
    expect(remaining).toHaveLength(1);
    const pointer = (
      await fs.readFile(path.join(root, "index", "current"), "utf8")
    ).trim();
    expect(remaining).toEqual([pointer]);
    for (const file of remaining) {
      const body = await fs.readFile(path.join(generationsDir, file), "utf8");
      expect(body).not.toContain(sessionToken(MAIN));
      expect(body).not.toContain("artifact-history-one");
      expect(body).not.toContain("artifact-history-two");
      expect(body).toContain("artifact-history-keep-report");
    }
    expect(
      (await resolveArtifact(root, "artifact-history-keep-report")).kind,
    ).toBe("report");
  });

  it("reports incomplete history cleanup and completes it on retry", async () => {
    const root = await privateFixtureRoot();
    await prepareStore(root);
    const claim = await claimRun(root, MAIN, "cp-history-retry");
    await publishRun(claim, safeArtifacts("history-retry"));
    const blocker = path.join(root, "index", "generations", "blocked-history");
    await fs.mkdir(blocker, { mode: 0o700 });
    await expect(deleteSession(root, MAIN)).rejects.toMatchObject({
      code: "DELETE_INDEX_HISTORY_INCOMPLETE",
    });
    await expect(
      fs.lstat(path.join(root, "sessions", sessionToken(MAIN))),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await fs.rmdir(blocker);
    const retried = await deleteSession(root, MAIN);
    expect(retried.deleted).toBe(false);
    expect(
      await fs.readdir(path.join(root, "index", "generations")),
    ).toHaveLength(1);
  });

  it("reports incomplete history cleanup when enumeration fails and retries", async () => {
    const root = await privateFixtureRoot();
    await prepareStore(root);
    const other = await claimRun(root, OTHER_MAIN, "cp-enumeration-other");
    await publishRun(other, safeArtifacts("enumeration-other"));
    const second = await claimRun(root, OTHER_MAIN, "cp-enumeration-other-2");
    await publishRun(second, safeArtifacts("enumeration-other-2"));
    await claimRun(root, MAIN, "cp-enumeration-target");
    const generationsDir = path.join(root, "index", "generations");
    const sessionDir = path.join(root, "sessions", sessionToken(MAIN));
    expect((await fs.readdir(generationsDir)).length).toBeGreaterThan(1);
    const realReaddir = fs.readdir;
    // Fail enumeration only once the target session data is gone, i.e. at the
    // final history-prune step, while capacity walks still succeed.
    const spy = vi.spyOn(fs, "readdir").mockImplementation((async (
      ...args: unknown[]
    ) => {
      if (String(args[0]) === generationsDir) {
        const sessionPresent = await fs.lstat(sessionDir).then(
          () => true,
          () => false,
        );
        if (!sessionPresent)
          throw Object.assign(new Error("EIO"), { code: "EIO" });
      }
      return (
        realReaddir as unknown as (...inner: unknown[]) => Promise<unknown>
      )(...args);
    }) as unknown as typeof fs.readdir);
    try {
      await expect(deleteSession(root, MAIN)).rejects.toMatchObject({
        code: "DELETE_INDEX_HISTORY_INCOMPLETE",
      });
    } finally {
      spy.mockRestore();
    }
    await expect(fs.lstat(sessionDir)).rejects.toMatchObject({
      code: "ENOENT",
    });
    const retried = await deleteSession(root, MAIN);
    expect(retried.deleted).toBe(false);
    expect(await fs.readdir(generationsDir)).toHaveLength(1);
  });

  it("publishes despite an unreadable fence of an unrelated session", async () => {
    const root = await privateFixtureRoot();
    await prepareStore(root);
    const other = await claimRun(root, OTHER_MAIN, "cp-unrelated-fence");
    await publishRun(other, safeArtifacts("unrelated"));
    await fs.writeFile(
      path.join(root, "fences", `${sessionToken(OTHER_MAIN)}.json`),
      JSON.stringify({
        schemaVersion: 1,
        tombstone: "c".repeat(32),
        deletedAt: new Date().toISOString(),
      }),
      { mode: 0o644 },
    );
    const claim = await claimRun(root, MAIN, "cp-independent");
    const result = await publishRun(claim, safeArtifacts("independent"));
    const pointer = (
      await fs.readFile(path.join(root, "index", "current"), "utf8")
    ).trim();
    const body = await fs.readFile(
      path.join(root, "index", "generations", pointer),
      "utf8",
    );
    for (const artifactId of result.artifactIds)
      expect(body).toContain(artifactId);
  });

  it.skipIf(process.platform === "win32")(
    "refuses the Windows ACL helper off Windows without a chmod fallback",
    async () => {
      const root = await privateFixtureRoot();
      await expect(ensureWindowsPrivateRoot(root)).rejects.toMatchObject({
        code: "WINDOWS_HELPER_UNSUPPORTED_PLATFORM",
      });
      expect((await fs.lstat(root)).mode & 0o777).toBe(0o700);
    },
  );

  it("resolves the Windows helper and shell only from trusted absolute anchors", async () => {
    const moduleDir = await privateFixtureRoot();
    let missingHelper: unknown;
    try {
      resolveWindowsHelperPath(moduleDir);
    } catch (error) {
      missingHelper = error;
    }
    expect(missingHelper).toMatchObject({ code: "WINDOWS_HELPER_MISSING" });
    const helper = path.join(moduleDir, "windows-private.ps1");
    await fs.writeFile(helper, "# fixed helper\n", { mode: 0o600 });
    expect(resolveWindowsHelperPath(moduleDir)).toBe(helper);
    const systemRoot = path.join(path.parse(process.cwd()).root, "Windows");
    expect(windowsPowerShellPath(systemRoot)).toBe(
      path.join(
        systemRoot,
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      ),
    );
    for (const invalid of [undefined, "", "relative-root"]) {
      let missingShell: unknown;
      try {
        windowsPowerShellPath(invalid);
      } catch (error) {
        missingShell = error;
      }
      expect(missingShell).toMatchObject({ code: "WINDOWS_HELPER_MISSING" });
    }
  });

  it("encodes batched Windows ACL helper requests and rejects invalid shapes", () => {
    const items = [
      { path: "C:\\root", mode: "establish", itemKind: "Directory" },
      { path: "C:\\root\\locks", mode: "verify" },
    ] as const;
    const line = encodeWindowsHelperRequest(7, items);
    expect(line.endsWith("\n")).toBe(true);
    expect(JSON.parse(line)).toEqual({ id: 7, items });
    for (const id of [0, -1, 1.5]) {
      expect(
        storeErrorFrom(() => encodeWindowsHelperRequest(id, items)),
      ).toMatchObject({ code: "WINDOWS_HELPER_FAILED" });
    }
    expect(
      storeErrorFrom(() => encodeWindowsHelperRequest(1, [])),
    ).toMatchObject({ code: "WINDOWS_HELPER_FAILED" });
    const tooMany = Array.from({ length: 65 }, (_, index) => ({
      path: `C:\\p${index}`,
      mode: "verify" as const,
    }));
    expect(
      storeErrorFrom(() => encodeWindowsHelperRequest(1, tooMany)),
    ).toMatchObject({ code: "WINDOWS_HELPER_FAILED" });
    const tooLarge = [
      { path: `C:\\${"x".repeat(1_048_576)}`, mode: "verify" as const },
    ];
    expect(
      storeErrorFrom(() => encodeWindowsHelperRequest(1, tooLarge)),
    ).toMatchObject({ code: "WINDOWS_HELPER_FAILED" });
  });

  it("strictly validates Windows ACL helper responses and refuses malformed ones", () => {
    expect(
      decodeWindowsHelperResponse(
        JSON.stringify({
          id: 3,
          results: [{ ok: true }, { ok: true }],
        }),
        3,
        2,
      ),
    ).toEqual([{ ok: true }, { ok: true }]);
    expect(
      decodeWindowsHelperResponse(
        JSON.stringify({
          id: 3,
          results: [
            { ok: true },
            { ok: false, code: "AGS-REPARSE-POINT", detail: "denied" },
          ],
        }),
        3,
        3,
      ),
    ).toEqual([
      { ok: true },
      { ok: false, code: "AGS-REPARSE-POINT", detail: "denied" },
    ]);
    const malformed = [
      JSON.stringify({ id: 4, results: [{ ok: true }] }),
      "not-json",
      JSON.stringify({ id: 3, results: [] }),
      JSON.stringify({ id: 3, results: [{ ok: true }] }),
      JSON.stringify({
        id: 3,
        results: [{ ok: true }, { ok: true }, { ok: true }],
      }),
      JSON.stringify({
        id: 3,
        results: [
          { ok: false, code: "AGS-ACL-FAILED", detail: "x" },
          { ok: true },
        ],
      }),
      JSON.stringify({
        id: 3,
        results: [{ ok: false, code: "AGS-OTHER", detail: "x" }],
      }),
      JSON.stringify({
        id: 3,
        results: [
          { ok: false, code: "AGS-ACL-FAILED", detail: "x".repeat(5_000) },
        ],
      }),
      "x".repeat(1_048_577),
    ];
    for (const line of malformed) {
      expect(
        storeErrorFrom(() => decodeWindowsHelperResponse(line, 3, 2)),
      ).toMatchObject({ code: "WINDOWS_ACL_FAILED" });
    }
  });

  it("reuses one helper, establishes the root first, and orders fresh before existing", async () => {
    const root = await privateFixtureRoot();
    const helper = fakeWindowsHelper();
    helper.setResponder(respondOk);
    let spawns = 0;
    let captured: { file: string; args: string[]; options: unknown } | null =
      null;
    installFakeWindowsHelper((file, args, options) => {
      spawns += 1;
      captured = { file, args, options };
      return helper.child;
    });
    const fresh = path.join(root, "fresh");
    const existing = path.join(root, "existing");
    await fs.mkdir(existing, { mode: 0o700 });
    await ensureWindowsPrivateStoreLayout(root, [fresh, existing]);
    expect(spawns).toBe(1);
    expect(helper.requests[0]?.items).toEqual([
      { path: root, mode: "establish", itemKind: "Directory" },
    ]);
    expect(
      (helper.requests[1]?.items ?? []).map((item) => ({
        path: path.relative(root, item.path),
        mode: item.mode,
        itemKind: item.itemKind,
      })),
    ).toEqual([
      { path: "fresh", mode: "establish", itemKind: "Directory" },
      { path: "existing", mode: "verify", itemKind: undefined },
    ]);
    if (!captured) throw new Error("Expected a helper spawn.");
    const spawnOptions = captured.options as {
      shell?: boolean;
      windowsHide?: boolean;
      env?: NodeJS.ProcessEnv;
    };
    expect(captured.args.at(-1)).toBe("-Serve");
    expect(spawnOptions.shell).toBe(false);
    expect(spawnOptions.windowsHide).toBe(true);
    expect(
      Object.keys(spawnOptions.env ?? {}).some(
        (key) => key.toLowerCase() === "psmodulepath",
      ),
    ).toBe(false);
    helper.requests.length = 0;
    await ensureWindowsPrivateStoreLayout(root, [fresh, existing]);
    expect(spawns).toBe(1);
    expect(
      (helper.requests[1]?.items ?? []).every((item) => item.mode === "verify"),
    ).toBe(true);
  });

  it("removes a directory created by a failed layout batch", async () => {
    const root = await privateFixtureRoot();
    const helper = fakeWindowsHelper();
    helper.setResponder((request) =>
      request.items.length === 1
        ? respondOk(request)
        : {
            id: request.id,
            results: [
              { ok: true },
              { ok: false, code: "AGS-ACL-FAILED", detail: "stop" },
            ],
          },
    );
    installFakeWindowsHelper(() => helper.child);
    const fresh = path.join(root, "fresh");
    const existing = path.join(root, "existing");
    await fs.mkdir(existing, { mode: 0o700 });
    await expect(
      ensureWindowsPrivateStoreLayout(root, [fresh, existing]),
    ).rejects.toMatchObject({ code: "WINDOWS_ACL_FAILED" });
    await expect(fs.lstat(fresh)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await fs.lstat(existing)).toBeTruthy();
  });

  it("poisons malformed responses and restarts on the next request", async () => {
    const root = await privateFixtureRoot();
    const first = fakeWindowsHelper();
    first.setResponder((request) => ({
      id: request.id,
      results: [{ ok: true }, { ok: true }],
    }));
    const second = fakeWindowsHelper();
    second.setResponder(respondOk);
    let spawns = 0;
    installFakeWindowsHelper(() =>
      spawns++ === 0 ? first.child : second.child,
    );
    await expect(
      ensureWindowsPrivateStoreLayout(root, []),
    ).rejects.toMatchObject({ code: "WINDOWS_ACL_FAILED" });
    expect(first.raw.killed).toBe(true);
    await ensureWindowsPrivateStoreLayout(root, []);
    expect(spawns).toBe(2);
  });

  it("poisons stdin stream errors and rejects the pending request", async () => {
    const root = await privateFixtureRoot();
    const helper = fakeWindowsHelper();
    installFakeWindowsHelper(() => helper.child);
    const pending = ensureWindowsPrivateStoreLayout(root, []);
    while (helper.requests.length === 0)
      await new Promise((resolve) => setImmediate(resolve));
    helper.raw.stdin.emit("error", new Error("EPIPE"));
    await expect(pending).rejects.toMatchObject({
      code: "WINDOWS_ACL_FAILED",
    });
    expect(helper.raw.killed).toBe(true);
  });

  it("rejects an aborted queued request without sending it", async () => {
    const root = await privateFixtureRoot();
    const helper = fakeWindowsHelper();
    installFakeWindowsHelper(() => helper.child);
    const first = ensureWindowsPrivateStoreLayout(root, [
      path.join(root, "first"),
    ]);
    while (helper.requests.length === 0)
      await new Promise((resolve) => setImmediate(resolve));
    const controller = new AbortController();
    const queued = ensureWindowsPrivateStoreLayout(
      root,
      [path.join(root, "queued")],
      {
        deadline: performance.now() + 5_000,
        signal: controller.signal,
      },
    );
    controller.abort(new Error("stop"));
    await expect(queued).rejects.toMatchObject({ code: "ABORTED" });
    expect(helper.requests).toHaveLength(1);
    helper.setResponder(respondOk);
    helper.respondNow(respondOk(helper.requests[0]));
    await first;
  });

  it("keeps a queued request behind an in-flight request after an abort", async () => {
    const root = await privateFixtureRoot();
    const helper = fakeWindowsHelper();
    installFakeWindowsHelper(() => helper.child);
    const first = ensureWindowsPrivateStoreLayout(root, [
      path.join(root, "first-dir"),
    ]);
    while (helper.requests.length === 0)
      await new Promise((resolve) => setImmediate(resolve));
    const controller = new AbortController();
    const queued = ensureWindowsPrivateStoreLayout(
      root,
      [path.join(root, "queued-dir")],
      {
        deadline: performance.now() + 5_000,
        signal: controller.signal,
      },
    );
    controller.abort(new Error("stop"));
    await expect(queued).rejects.toMatchObject({ code: "ABORTED" });
    expect(helper.requests).toHaveLength(1);
    const third = ensureWindowsPrivateStoreLayout(root, [
      path.join(root, "third-dir"),
    ]);
    // Give the queued layout enough event-loop turns to reach the helper if the
    // queue tail were released early. With the allSettled tail it must remain
    // unsent while A's root request is unanswered.
    for (let turn = 0; turn < 20; turn += 1)
      await new Promise((resolve) => setImmediate(resolve));
    expect(helper.requests).toHaveLength(1);
    helper.setResponder(respondOk);
    helper.respondNow(respondOk(helper.requests[0]));
    // A and C must both resolve with their own layout result. Any overlap
    // would be poisoned by the production guard and reject with
    // WINDOWS_ACL_FAILED, so these assertions prove no request was rejected.
    await expect(first).resolves.toBe(root);
    await expect(third).resolves.toBe(root);
    expect(helper.raw.killed).toBe(false);
    expect(helper.requests).toHaveLength(4);
    const rootRequest = helper.requests[0];
    if (!rootRequest) throw new Error("Expected the first root request.");
    const thirdRoot = helper.requests.find(
      (request) =>
        request.id > rootRequest.id &&
        request.items.length === 1 &&
        request.items[0]?.path === root,
    );
    const thirdBatch = helper.requests.find((request) =>
      request.items.some((item) => item.path === path.join(root, "third-dir")),
    );
    expect(thirdRoot).toBeDefined();
    expect(thirdBatch).toBeDefined();
    if (!thirdRoot || !thirdBatch)
      throw new Error("Expected all queued requests.");
    expect(thirdRoot.id).toBeGreaterThan(rootRequest.id);
    expect(thirdBatch.id).toBeGreaterThan(thirdRoot.id);
  });

  it("times out a pending request and restarts the helper", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const root = await privateFixtureRoot();
    const first = fakeWindowsHelper();
    const second = fakeWindowsHelper();
    second.setResponder(respondOk);
    let spawns = 0;
    installFakeWindowsHelper(() =>
      spawns++ === 0 ? first.child : second.child,
    );
    const pending = ensureWindowsPrivateStoreLayout(root, [], {
      deadline: performance.now() + 500,
      signal: new AbortController().signal,
    });
    // Attach the rejection handler before advancing fake timers, otherwise the
    // rejection is briefly unhandled and Vitest reports a handled-late warning.
    const rejection = expect(pending).rejects.toMatchObject({
      code: "DEADLINE_EXCEEDED",
    });
    while (first.requests.length === 0)
      await new Promise((resolve) => setImmediate(resolve));
    await vi.advanceTimersByTimeAsync(500);
    await rejection;
    expect(first.raw.killed).toBe(true);
    await ensureWindowsPrivateStoreLayout(root, []);
    expect(spawns).toBe(2);
  });

  it("unrefs while idle and shuts the helper down after the idle interval", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const root = await privateFixtureRoot();
    const helper = fakeWindowsHelper();
    helper.setResponder(respondOk);
    let spawns = 0;
    installFakeWindowsHelper(() => {
      spawns += 1;
      return helper.child;
    });
    await ensureWindowsPrivateStoreLayout(root, []);
    expect(spawns).toBe(1);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(helper.raw.killed).toBe(true);
    await ensureWindowsPrivateStoreLayout(root, []);
    expect(spawns).toBe(2);
  });

  it("strips inherited PowerShell module paths from the helper child environment", () => {
    const original: NodeJS.ProcessEnv = {
      Path: "C:\\bin",
      SystemRoot: "C:\\Windows",
      PSModulePath: "C:\\Program Files\\PowerShell\\7\\Modules",
      psmodulepath: "C:\\Users\\test\\Documents\\PowerShell\\Modules",
      PSMODULEPATH: "C:\\extra",
    };
    const environment = windowsPowerShellEnvironment(original);
    expect(environment).not.toBe(original);
    expect(environment).toEqual({
      Path: "C:\\bin",
      SystemRoot: "C:\\Windows",
    });
    expect(original).toEqual({
      Path: "C:\\bin",
      SystemRoot: "C:\\Windows",
      PSModulePath: "C:\\Program Files\\PowerShell\\7\\Modules",
      psmodulepath: "C:\\Users\\test\\Documents\\PowerShell\\Modules",
      PSMODULEPATH: "C:\\extra",
    });
  });

  it.skipIf(process.platform !== "win32")(
    "refuses a Windows junction root",
    async () => {
      const base = await privateFixtureRoot();
      const target = path.join(base, "target");
      await fs.mkdir(target, { mode: 0o700 });
      const junction = path.join(base, "junction-root");
      await fs.symlink(target, junction, "junction");
      await expect(claimRun(junction, MAIN, "cp-1")).rejects.toMatchObject({
        code: "WINDOWS_REPARSE_POINT",
      });
    },
  );

  it.skipIf(process.platform !== "win32")(
    "refuses an existing child directory with a permissive ACL",
    async () => {
      const root = await privateFixtureRoot();
      await ensurePrivateRoot(root);
      const child = path.join(root, "permissive-child");
      await fs.mkdir(child, { mode: 0o700 });
      const acl = spawnSync(
        "icacls.exe",
        [child, "/inheritance:r", "/grant", "*S-1-1-0:(OI)(CI)F"],
        { encoding: "utf8", windowsHide: true },
      );
      expect(acl.status).toBe(0);
      await expect(ensurePrivateDirectory(child)).rejects.toMatchObject({
        code: "WINDOWS_ACL_FAILED",
      });
    },
  );
  it.skipIf(process.platform !== "win32")(
    "establishes a verified owner ACL before publishing",
    async () => {
      const root = await privateFixtureRoot();
      await ensurePrivateRoot(root);
      const claim = await claimRun(root, MAIN, "cp-win");
      const result = await publishRun(claim, safeArtifacts("win"));
      expect(await publishedIds(root)).toEqual(result.artifactIds);
    },
  );
  it("keeps distinct concurrent session publications in the shared index", async () => {
    const root = await privateFixtureRoot();
    const first = await claimRun(root, MAIN, "cp-first");
    const second = await claimRun(root, OTHER_MAIN, "cp-second");
    const [one, two] = await Promise.all([
      publishRun(first, safeArtifacts("parallel-one")),
      publishRun(second, safeArtifacts("parallel-two")),
    ]);
    expect((await publishedIds(root)).sort()).toEqual(
      [...one.artifactIds, ...two.artifactIds].sort(),
    );
  });

  it("does not let one session deletion overwrite another publication", async () => {
    const root = await privateFixtureRoot();
    const deleted = await claimRun(root, MAIN, "cp-delete-race");
    await publishRun(deleted, safeArtifacts("delete-race"));
    const retained = await claimRun(root, OTHER_MAIN, "cp-retain-race");
    const [result] = await Promise.all([
      publishRun(retained, safeArtifacts("retain-race")),
      deleteSession(root, MAIN),
    ]);
    expect(await publishedIds(root)).toEqual(result.artifactIds);
  });
  it("rejects artifact IDs already owned by another session", async () => {
    const root = await privateFixtureRoot();
    const first = await claimRun(root, MAIN, "cp-first");
    await publishRun(first, [
      { artifactId: "global-report", kind: "report", content: "first" },
    ]);
    const second = await claimRun(root, OTHER_MAIN, "cp-second");
    await expect(
      publishRun(second, [
        { artifactId: "global-report", kind: "report", content: "second" },
      ]),
    ).rejects.toMatchObject({ code: "ARTIFACT_ID_EXISTS" });
    expect(await publishedIds(root)).toEqual(["global-report"]);
  });

  it.skipIf(process.platform === "win32")(
    "refuses a replaced leaf generation directory during artifact resolution",
    async () => {
      const root = await privateFixtureRoot();
      const claim = await claimRun(root, MAIN, "cp-generation-link");
      await publishRun(claim, safeArtifacts("generation-link"));
      const report = await resolveArtifact(
        root,
        "artifact-generation-link-report",
      );
      const outside = await outsideDirectory("generation-leaf");
      await fs.rm(path.dirname(report.absolutePath), {
        recursive: true,
        force: true,
      });
      await fs.symlink(outside, path.dirname(report.absolutePath));
      await expect(
        resolveArtifact(root, report.artifactId),
      ).rejects.toMatchObject({ code: "UNSAFE_PATH" });
      expect(await fs.readdir(outside)).toEqual([]);
    },
  );

  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "keeps a generation visible and consumes its claim after index commit",
    async () => {
      const root = await privateFixtureRoot();
      const claim = await claimRun(root, MAIN, "cp-commit-point");
      const claimsDir = path.join(root, "claims");
      await fs.chmod(claimsDir, 0o500);
      try {
        await expect(
          publishRun(claim, safeArtifacts("committed")),
        ).rejects.toMatchObject({
          code: "EACCES",
        });
      } finally {
        await fs.chmod(claimsDir, 0o700);
      }
      const ids = await publishedIds(root);
      expect(ids).toEqual([
        "artifact-committed-report",
        "artifact-committed-session",
      ]);
      await expect(
        publishRun(claim, safeArtifacts("duplicate-commit")),
      ).rejects.toMatchObject({ code: "CLAIM_CONSUMED" });
      expect(await publishedIds(root)).toEqual(ids);
    },
  );

  it("reserves serialized metadata and index growth against the byte cap", async () => {
    const root = await privateFixtureRoot();
    await prepareStore(root);
    const claim = await claimRun(root, MAIN, "cp-near-byte-cap");
    const filler = path.join(root, "index", "filler.bin");
    await fs.writeFile(filler, "", { mode: 0o600 });
    await fs.truncate(filler, STORE_LIMITS.bytes - 8_192);
    await expect(
      publishRun(claim, safeArtifacts("near-cap")),
    ).rejects.toMatchObject({
      code: "STORE_BYTE_LIMIT",
    });
    expect(await publishedIds(root)).toEqual([]);
  });

  it("does not reclaim an old lock record without an explicit safe owner", async () => {
    const root = await privateFixtureRoot();
    await prepareStore(root);
    const lock = path.join(root, "locks", "root-mutation.lock");
    await fs.writeFile(
      lock,
      JSON.stringify({
        schemaVersion: 1,
        token: "old-owner",
        pid: process.pid,
        at: "2000-01-01T00:00:00.000Z",
      }),
      { mode: 0o600 },
    );
    await expect(claimRun(root, MAIN, "cp-locked")).rejects.toMatchObject({
      code: "STORE_BUSY",
    });
    expect(await fs.readFile(lock, "utf8")).toContain("old-owner");
  }, 7_000);

  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "surfaces a lock release failure instead of swallowing it",
    async () => {
      const root = await privateFixtureRoot();
      await prepareStore(root);
      const task = async (layout: StoreLayout): Promise<void> => {
        await fs.chmod(path.join(layout.locksDir, "root-mutation.lock"), 0o000);
      };
      await expect(withSessionLock(root, MAIN, task)).rejects.toMatchObject({
        code: "EACCES",
      });
    },
  );

  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "preserves the task error when lock release also fails",
    async () => {
      const root = await privateFixtureRoot();
      await prepareStore(root);
      const taskError = new StoreError(
        "CLAIM_REVOKED",
        "synthetic task failure",
      );
      const task = async (layout: StoreLayout): Promise<void> => {
        await fs.chmod(path.join(layout.locksDir, "root-mutation.lock"), 0o000);
        throw taskError;
      };
      let failure: unknown;
      try {
        await withSessionLock(root, MAIN, task);
      } catch (error) {
        failure = error;
      }
      if (!(failure instanceof Error))
        throw new Error("Expected the task error to propagate.");
      expect(failure).toBe(taskError);
      expect(failure).toMatchObject({ code: "CLAIM_REVOKED" });
      expect(Reflect.get(failure, "cause")).toMatchObject({ code: "EACCES" });
    },
  );

  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "rethrows a frozen task error unchanged when release also fails",
    async () => {
      const root = await privateFixtureRoot();
      await prepareStore(root);
      const taskError = Object.freeze(
        new StoreError("CLAIM_REVOKED", "frozen task failure"),
      );
      const task = async (layout: StoreLayout): Promise<void> => {
        await fs.chmod(path.join(layout.locksDir, "root-mutation.lock"), 0o000);
        throw taskError;
      };
      let failure: unknown;
      try {
        await withSessionLock(root, MAIN, task);
      } catch (error) {
        failure = error;
      }
      expect(failure).toBe(taskError);
      if (!(failure instanceof Error))
        throw new Error("Expected the frozen task error to propagate.");
      expect(failure).toMatchObject({ code: "CLAIM_REVOKED" });
      expect(Reflect.get(failure, "cause")).toBeUndefined();
    },
  );

  it("grants one preparation owner and lets joiners observe the indexed receipt", async () => {
    const root = await privateFixtureRoot();
    const [first, second] = await Promise.all([
      acquirePreparation(root, MAIN, "cp-prepare-owner"),
      acquirePreparation(root, MAIN, "cp-prepare-owner"),
    ]);
    const owner = first.role === "owner" ? first : second;
    if (owner.role !== "owner") throw new Error("Expected a single owner.");
    const joiner = first === owner ? second : first;
    if (joiner.role !== "join") throw new Error("Expected a join-only result.");
    expect("claim" in joiner).toBe(false);
    const receiptArtifact: PublishArtifact = {
      artifactId: "prepared-report",
      kind: "report",
      content: "private report",
    };
    const waiting = waitForPublishedPreparation(
      root,
      MAIN,
      "cp-prepare-owner",
      {
        signal: new AbortController().signal,
        deadline: performance.now() + 2_000,
        expectedRunId: owner.claim.runId,
      },
    );
    await delay(75);
    await publishRun(owner.claim, [receiptArtifact]);
    const joinedReceipt = await waiting;
    expect(joinedReceipt).toEqual({
      schemaVersion: 1,
      artifactId: "prepared-report",
      runId: owner.claim.runId,
      status: "complete",
      modelCalls: 0,
      outboundRequests: 0,
    });
    expect(
      await resolvePublishedPreparation(root, MAIN, "cp-prepare-owner"),
    ).toEqual({ status: "published", receipt: joinedReceipt });
    const repeated = await acquirePreparation(root, MAIN, "cp-prepare-owner");
    expect(repeated).toEqual({ role: "join", runId: owner.claim.runId });
  });

  it("stops preparation observation on cancellation without retrying", async () => {
    const root = await privateFixtureRoot();
    const access = await acquirePreparation(root, MAIN, "cp-prepare-cancel");
    expect(access.role).toBe("owner");
    if (access.role !== "owner") throw new Error("Expected preparation owner.");
    await cancelRun(access.claim);
    await expect(
      waitForPublishedPreparation(root, MAIN, "cp-prepare-cancel", {
        signal: new AbortController().signal,
        deadline: performance.now() + 2_000,
        expectedRunId: access.claim.runId,
      }),
    ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });
  });
  it("refuses a replacement run instead of returning its receipt", async () => {
    const root = await privateFixtureRoot();
    const first = await acquirePreparation(root, MAIN, "cp-prepare-replaced");
    expect(first.role).toBe("owner");
    if (first.role !== "owner") throw new Error("Expected preparation owner.");
    await cancelRun(first.claim);
    const second = await acquirePreparation(root, MAIN, "cp-prepare-replaced");
    expect(second.role).toBe("owner");
    if (second.role !== "owner") throw new Error("Expected replacement owner.");
    expect(second.claim.runId).not.toBe(first.claim.runId);
    await expect(
      waitForPublishedPreparation(root, MAIN, "cp-prepare-replaced", {
        signal: new AbortController().signal,
        deadline: performance.now() + 2_000,
        expectedRunId: first.claim.runId,
      }),
    ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });
    await publishRun(second.claim, [
      { artifactId: "replacement-report", kind: "report", content: "B" },
    ]);
    await expect(
      waitForPublishedPreparation(root, MAIN, "cp-prepare-replaced", {
        signal: new AbortController().signal,
        deadline: performance.now() + 2_000,
        expectedRunId: first.claim.runId,
      }),
    ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });
  });
  it("terminates preparation observation on abort and deletion", async () => {
    const abortedRoot = await privateFixtureRoot();
    const abortedAccess = await acquirePreparation(
      abortedRoot,
      MAIN,
      "cp-prepare-abort",
    );
    expect(abortedAccess.role).toBe("owner");
    if (abortedAccess.role !== "owner")
      throw new Error("Expected preparation owner.");
    const controller = new AbortController();
    controller.abort();
    await expect(
      waitForPublishedPreparation(abortedRoot, MAIN, "cp-prepare-abort", {
        signal: controller.signal,
        deadline: performance.now() + 2_000,
        expectedRunId: abortedAccess.claim.runId,
      }),
    ).rejects.toMatchObject({ code: "PREPARATION_WAIT_ABORTED" });

    const deletedRoot = await privateFixtureRoot();
    const deletedAccess = await acquirePreparation(
      deletedRoot,
      MAIN,
      "cp-prepare-delete",
    );
    expect(deletedAccess.role).toBe("owner");
    if (deletedAccess.role !== "owner")
      throw new Error("Expected preparation owner.");
    await deleteSession(deletedRoot, MAIN);
    await expect(
      waitForPublishedPreparation(deletedRoot, MAIN, "cp-prepare-delete", {
        signal: new AbortController().signal,
        deadline: performance.now() + 2_000,
        expectedRunId: deletedAccess.claim.runId,
      }),
    ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });
  });
  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "reconciles a committed report-free publication before cancel or retry",
    async () => {
      const root = await privateFixtureRoot();
      const claim = await claimRun(root, MAIN, "cp-report-free");
      const claimsDir = path.join(root, "claims");
      await fs.chmod(claimsDir, 0o500);
      try {
        await expect(
          publishRun(claim, [
            {
              artifactId: "report-free-session",
              kind: "session",
              content: "{}",
            },
          ]),
        ).rejects.toMatchObject({ code: "EACCES" });
      } finally {
        await fs.chmod(claimsDir, 0o700);
      }
      expect(await publishedIds(root)).toEqual(["report-free-session"]);
      await expect(cancelRun(claim)).rejects.toMatchObject({
        code: "CLAIM_CONSUMED",
      });
      await expect(
        resolvePublishedPreparation(root, MAIN, "cp-report-free"),
      ).rejects.toMatchObject({ code: "PREPARATION_RECEIPT_UNAVAILABLE" });
      await expect(
        publishRun(claim, [
          { artifactId: "report-free-receipt", kind: "receipt", content: "{}" },
        ]),
      ).rejects.toMatchObject({ code: "CLAIM_CONSUMED" });
      expect(await publishedIds(root)).toEqual(["report-free-session"]);
      await expect(
        claimRun(root, MAIN, "cp-report-free"),
      ).rejects.toMatchObject({
        code: "RUN_ALREADY_PUBLISHED",
      });
      await expect(
        acquirePreparation(root, MAIN, "cp-report-free"),
      ).rejects.toMatchObject({ code: "RUN_ALREADY_PUBLISHED" });
    },
  );
  it("deletes a published session near the byte cap without eviction", async () => {
    const root = await privateFixtureRoot();
    await prepareStore(root);
    const claim = await claimRun(root, MAIN, "cp-near-cap-delete");
    await publishRun(claim, safeArtifacts("retention"));
    const filler = path.join(root, "index", "filler.bin");
    await fs.writeFile(filler, "", { mode: 0o600 });
    await fs.truncate(filler, STORE_LIMITS.bytes - 1_048_576);
    const result = await deleteSession(root, MAIN);
    expect(result.deleted).toBe(true);
    expect(result.removedArtifacts).toBe(2);
    expect(await publishedIds(root)).toEqual([]);
    expect((await fs.stat(filler)).size).toBe(STORE_LIMITS.bytes - 1_048_576);
  });
  it("bounds wait resolution by the caller deadline and abort under contention", async () => {
    const root = await privateFixtureRoot();
    const access = await acquirePreparation(root, MAIN, "cp-wait-budget");
    expect(access.role).toBe("owner");
    if (access.role !== "owner") throw new Error("Expected preparation owner.");
    const expectedRunId = access.claim.runId;
    const lock = path.join(root, "locks", "root-mutation.lock");
    await fs.writeFile(
      lock,
      JSON.stringify({
        schemaVersion: 1,
        token: "held-owner",
        pid: process.pid,
        at: new Date().toISOString(),
      }),
      { mode: 0o600 },
    );
    const started = performance.now();
    await expect(
      waitForPublishedPreparation(root, MAIN, "cp-wait-budget", {
        signal: new AbortController().signal,
        deadline: performance.now() + 100,
        expectedRunId,
      }),
    ).rejects.toMatchObject({ code: "PREPARATION_WAIT_DEADLINE" });
    expect(performance.now() - started).toBeLessThan(2_000);

    const controller = new AbortController();
    const aborter = setTimeout(() => controller.abort(), 50);
    const abortStarted = performance.now();
    try {
      await expect(
        waitForPublishedPreparation(root, MAIN, "cp-wait-budget", {
          signal: controller.signal,
          deadline: performance.now() + 5_000,
          expectedRunId,
        }),
      ).rejects.toMatchObject({ code: "PREPARATION_WAIT_ABORTED" });
    } finally {
      clearTimeout(aborter);
    }
    expect(performance.now() - abortStarted).toBeLessThan(2_000);
  });
  it("refuses a stale receipt after a partial deletion and allows a new generation", async () => {
    const root = await privateFixtureRoot();
    await prepareStore(root);
    const claim = await claimRun(root, MAIN, "cp-stale");
    await publishRun(claim, safeArtifacts("stale"));
    const kept = await claimRun(root, OTHER_MAIN, "cp-keep");
    await publishRun(kept, safeArtifacts("keep"));

    const pointerPath = path.join(root, "index", "current");
    const pointer = (await fs.readFile(pointerPath, "utf8")).trim();
    const index = JSON.parse(
      await fs.readFile(
        path.join(root, "index", "generations", pointer),
        "utf8",
      ),
    ) as { generation: number; entries: Array<Record<string, unknown>> };
    const syntheticToken = "f".repeat(32);
    const synthetic = Array.from({ length: 800 }, (_, position) => ({
      artifactId: `synthetic-${position}`,
      sessionToken: syntheticToken,
      generationId: "000001-abcdef",
      runId: `synthetic-run-${position}`,
      checkpointId: `synthetic-checkpoint-${position}`,
      kind: "session",
      status: "complete",
      publishedAt: new Date().toISOString(),
      bytes: 0,
      fence: null,
    }));
    const entries = [...index.entries, ...synthetic];
    const sessions = new Set(
      entries.map((entry) => String(entry.sessionToken)),
    );
    const nextName = "synthetic-index.json";
    await fs.writeFile(
      path.join(root, "index", "generations", nextName),
      JSON.stringify({
        schemaVersion: 1,
        generation: index.generation + 1,
        updatedAt: new Date().toISOString(),
        counts: { artifacts: entries.length, sessions: sessions.size },
        entries,
      }),
      { mode: 0o600 },
    );
    await fs.writeFile(pointerPath, nextName, { mode: 0o600 });
    await fs.writeFile(
      path.join(root, "fences", `${syntheticToken}.json`),
      JSON.stringify({
        schemaVersion: 1,
        tombstone: "b".repeat(32),
        deletedAt: new Date().toISOString(),
      }),
      { mode: 0o600 },
    );

    const used = await treeBytes(root);
    const filler = path.join(root, "retained.bin");
    await fs.writeFile(filler, "", { mode: 0o600 });
    await fs.truncate(filler, STORE_LIMITS.bytes - used - 120_000);

    await expect(deleteSession(root, MAIN)).rejects.toMatchObject({
      code: "STORE_BYTE_LIMIT",
    });
    await expect(
      fs.lstat(path.join(root, "sessions", sessionToken(MAIN))),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      fs.lstat(path.join(root, "claims", `${sessionToken(MAIN)}.json`)),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      fs.lstat(path.join(root, "fences", `${sessionToken(MAIN)}.json`)),
    ).resolves.toBeTruthy();
    await expect(
      resolveArtifact(root, "artifact-stale-report"),
    ).rejects.toMatchObject({ code: "ARTIFACT_NOT_FOUND" });
    const allPublished = await listPublished(root, { limit: 100 });
    expect(allPublished.entries.map((entry) => entry.artifactId)).toEqual([
      "artifact-keep-report",
      "artifact-keep-session",
    ]);
    const firstPage = await listPublished(root, { limit: 1 });
    expect(firstPage.entries.map((entry) => entry.artifactId)).toEqual([
      "artifact-keep-report",
    ]);
    expect(firstPage.nextCursor).toBe("artifact-keep-report");
    const pageCursor = firstPage.nextCursor;
    if (pageCursor === null) throw new Error("Expected a next page.");
    const secondPage = await listPublished(root, {
      limit: 1,
      cursor: pageCursor,
    });
    expect(secondPage.entries.map((entry) => entry.artifactId)).toEqual([
      "artifact-keep-session",
    ]);
    expect(secondPage.nextCursor).toBeNull();
    await expect(
      resolvePublishedPreparation(root, MAIN, "cp-stale"),
    ).rejects.toMatchObject({ code: "RUN_NOT_FOUND" });
    await expect(
      waitForPublishedPreparation(root, MAIN, "cp-stale", {
        signal: new AbortController().signal,
        deadline: performance.now() + 1_000,
        expectedRunId: claim.runId,
      }),
    ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });
    const replacement = await acquirePreparation(root, MAIN, "cp-stale");
    expect(replacement.role).toBe("owner");
    if (replacement.role !== "owner")
      throw new Error("Expected preparation owner.");
    expect(replacement.claim.runId).not.toBe(claim.runId);
    expect((await resolveArtifact(root, "artifact-keep-report")).kind).toBe(
      "report",
    );

    await fs.rm(filler, { force: true });
    const completed = await deleteSession(root, MAIN);
    expect(completed.removedArtifacts).toBe(2);
    await expect(
      resolvePublishedPreparation(root, MAIN, "cp-stale"),
    ).rejects.toMatchObject({ code: "RUN_NOT_FOUND" });

    const fresh = await acquirePreparation(root, MAIN, "cp-stale");
    expect(fresh.role).toBe("owner");
    if (fresh.role !== "owner") throw new Error("Expected preparation owner.");
    const published = await publishRun(
      fresh.claim,
      safeArtifacts("post-delete"),
    );
    expect(await resolvePublishedPreparation(root, MAIN, "cp-stale")).toEqual({
      status: "published",
      receipt: {
        schemaVersion: 1,
        artifactId: published.artifactIds[0],
        runId: fresh.claim.runId,
        status: "complete",
        modelCalls: 0,
        outboundRequests: 0,
      },
    });
  });
  it.skipIf(process.platform === "win32")(
    "settles a pending observation at the deadline and releases late locks",
    async () => {
      const root = await privateFixtureRoot();
      const access = await acquirePreparation(root, MAIN, "cp-pending-io");
      expect(access.role).toBe("owner");
      if (access.role !== "owner")
        throw new Error("Expected preparation owner.");
      const pointerPath = path.join(root, "index", "current");
      await fs.rm(pointerPath, { force: true });
      const fifo = spawnSync("mkfifo", [pointerPath], { encoding: "utf8" });
      expect(fifo.status).toBe(0);
      await fs.chmod(pointerPath, 0o600);

      const started = performance.now();
      await expect(
        waitForPublishedPreparation(root, MAIN, "cp-pending-io", {
          signal: new AbortController().signal,
          deadline: performance.now() + 100,
          expectedRunId: access.claim.runId,
        }),
      ).rejects.toMatchObject({ code: "PREPARATION_WAIT_DEADLINE" });
      expect(performance.now() - started).toBeLessThan(2_000);

      const writer = await fs.open(pointerPath, "w");
      await writer.close();
      await waitForEmptyDirectory(path.join(root, "locks"));
      expect(await fs.readdir(path.join(root, "locks"))).toEqual([]);
    },
  );
  it.skipIf(process.platform === "win32")(
    "settles a pending observation on abort and releases late locks",
    async () => {
      const root = await privateFixtureRoot();
      const access = await acquirePreparation(root, MAIN, "cp-pending-abort");
      expect(access.role).toBe("owner");
      if (access.role !== "owner")
        throw new Error("Expected preparation owner.");
      const pointerPath = path.join(root, "index", "current");
      await fs.rm(pointerPath, { force: true });
      const fifo = spawnSync("mkfifo", [pointerPath], { encoding: "utf8" });
      expect(fifo.status).toBe(0);
      await fs.chmod(pointerPath, 0o600);

      const controller = new AbortController();
      const aborter = setTimeout(() => controller.abort(), 50);
      const started = performance.now();
      try {
        await expect(
          waitForPublishedPreparation(root, MAIN, "cp-pending-abort", {
            signal: controller.signal,
            deadline: performance.now() + 5_000,
            expectedRunId: access.claim.runId,
          }),
        ).rejects.toMatchObject({ code: "PREPARATION_WAIT_ABORTED" });
      } finally {
        clearTimeout(aborter);
      }
      expect(performance.now() - started).toBeLessThan(2_000);

      const writer = await fs.open(pointerPath, "w");
      await writer.close();
      await waitForEmptyDirectory(path.join(root, "locks"));
      expect(await fs.readdir(path.join(root, "locks"))).toEqual([]);
    },
  );
  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "invalidates published reads when deletion fails before physical removal",
    async () => {
      const root = await privateFixtureRoot();
      await prepareStore(root);
      const claim = await claimRun(root, MAIN, "cp-tombstone-only");
      await publishRun(claim, safeArtifacts("tombstone-only"));
      const kept = await claimRun(root, OTHER_MAIN, "cp-tombstone-keep");
      await publishRun(kept, safeArtifacts("tombstone-keep"));
      const claimsDir = path.join(root, "claims");
      await fs.chmod(claimsDir, 0o500);
      try {
        await expect(deleteSession(root, MAIN)).rejects.toMatchObject({
          code: "EACCES",
        });
      } finally {
        await fs.chmod(claimsDir, 0o700);
      }
      await expect(
        fs.lstat(
          path.join(root, "sessions", sessionToken(MAIN), "generations"),
        ),
      ).resolves.toBeTruthy();
      await expect(
        resolveArtifact(root, "artifact-tombstone-only-report"),
      ).rejects.toMatchObject({ code: "ARTIFACT_NOT_FOUND" });
      const listing = await listPublished(root, { limit: 100 });
      expect(listing.entries.map((entry) => entry.artifactId)).toEqual([
        "artifact-tombstone-keep-report",
        "artifact-tombstone-keep-session",
      ]);
      await expect(
        acquirePreparation(root, MAIN, "cp-tombstone-only"),
      ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });
      await expect(
        resolvePublishedPreparation(root, MAIN, "cp-tombstone-only"),
      ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });
      const completed = await deleteSession(root, MAIN);
      expect(completed.removedArtifacts).toBe(2);
      expect(await publishedIds(root)).toEqual([
        "artifact-tombstone-keep-report",
        "artifact-tombstone-keep-session",
      ]);
    },
  );
  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "does not advertise a surviving active claim after a failed tombstone cancel write",
    async () => {
      const root = await privateFixtureRoot();
      const access = await acquirePreparation(root, MAIN, "cp-active-stale");
      expect(access.role).toBe("owner");
      if (access.role !== "owner")
        throw new Error("Expected preparation owner.");
      const staleClaim = access.claim;
      const claimsDir = path.join(root, "claims");
      await fs.chmod(claimsDir, 0o500);
      try {
        await expect(deleteSession(root, MAIN)).rejects.toMatchObject({
          code: "EACCES",
        });
      } finally {
        await fs.chmod(claimsDir, 0o700);
      }
      await expect(
        fs.lstat(path.join(root, "sessions", sessionToken(MAIN))),
      ).resolves.toBeTruthy();
      await expect(
        claimRun(root, MAIN, "cp-active-stale"),
      ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });
      await expect(
        acquirePreparation(root, MAIN, "cp-active-stale"),
      ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });
      await expect(
        resolvePublishedPreparation(root, MAIN, "cp-active-stale"),
      ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });
      await expect(
        waitForPublishedPreparation(root, MAIN, "cp-active-stale", {
          signal: new AbortController().signal,
          deadline: performance.now() + 1_000,
          expectedRunId: staleClaim.runId,
        }),
      ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });
      await expect(
        publishRun(staleClaim, safeArtifacts("revoked")),
      ).rejects.toMatchObject({ code: "CLAIM_REVOKED" });

      await cancelRun(staleClaim);
      const fresh = await acquirePreparation(root, MAIN, "cp-active-stale");
      expect(fresh.role).toBe("owner");
      if (fresh.role !== "owner")
        throw new Error("Expected preparation owner.");
      expect(fresh.claim.runId).not.toBe(staleClaim.runId);
      const published = await publishRun(
        fresh.claim,
        safeArtifacts("recovered"),
      );
      expect(published.generationId).toBeTruthy();
      expect(
        await resolvePublishedPreparation(root, MAIN, "cp-active-stale"),
      ).toEqual({
        status: "published",
        receipt: {
          schemaVersion: 1,
          artifactId: published.artifactIds[0],
          runId: fresh.claim.runId,
          status: "complete",
          modelCalls: 0,
          outboundRequests: 0,
        },
      });
    },
  );
});
