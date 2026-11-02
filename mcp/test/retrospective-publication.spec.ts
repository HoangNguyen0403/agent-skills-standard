import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  artifactReceiptSchema,
  type NodeKey,
} from "../src/retrospective/contracts";
import { prepareV2, type V2Content } from "../src/retrospective/prepare";
import {
  ensurePrivateDirectory,
  writePrivateFileAtomic,
} from "../src/retrospective/platform-private";
import {
  acquirePreparation,
  claimRun,
  deleteSession,
  listPublished,
  prepareStore,
  publishRun,
  resolveArtifact,
  sessionToken,
} from "../src/retrospective/store";

const MAIN: NodeKey = { hostId: "host-main", sessionId: "main-session" };
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

function signal(): AbortSignal {
  return new AbortController().signal;
}

describe("v2 publication and versioned layouts", () => {
  it("v2 publish of kinds summary + ledger + html: generation readable, private mode, and dedupes on second identical publish", async () => {
    const root = await newRoot();
    const checkpointId = "cp-v2-dedupe";
    const v2Content: V2Content = {
      summary: "# Session retrospective summary\n\n- Status: complete\n",
      ledger: JSON.stringify({ schemaVersion: 1, status: "complete" }) + "\n",
      reportHtml: "<!doctype html><html><body>Report</body></html>\n",
      status: "complete",
    };
    const { receipt: receipt1 } = await prepareV2(
      { root, main: MAIN, checkpointId },
      v2Content,
      signal(),
    );
    expect(artifactReceiptSchema.safeParse(receipt1).success).toBe(true);
    expect(receipt1.status).toBe("complete");
    expect(receipt1.artifactId).toBe(`${receipt1.runId}.summary`);

    const resolvedSummary = await resolveArtifact(root, receipt1.artifactId);
    expect(resolvedSummary.kind).toBe("summary");
    expect(resolvedSummary.absolutePath.endsWith("summary.md")).toBe(true);
    const summaryContent = await fs.readFile(
      resolvedSummary.absolutePath,
      "utf8",
    );
    expect(summaryContent).toContain("Session retrospective summary");

    const resolvedLedger = await resolveArtifact(
      root,
      `${receipt1.runId}.ledger`,
    );
    expect(resolvedLedger.kind).toBe("ledger");
    expect(resolvedLedger.absolutePath.endsWith("ledger.json")).toBe(true);

    const resolvedHtml = await resolveArtifact(root, `${receipt1.runId}.html`);
    expect(resolvedHtml.kind).toBe("html");
    expect(resolvedHtml.absolutePath.endsWith("report.html")).toBe(true);
    const htmlContent = await fs.readFile(resolvedHtml.absolutePath, "utf8");
    expect(htmlContent).toContain("<!doctype html>");

    if (process.platform !== "win32") {
      const summaryStats = await fs.stat(resolvedSummary.absolutePath);
      const ledgerStats = await fs.stat(resolvedLedger.absolutePath);
      const htmlStats = await fs.stat(resolvedHtml.absolutePath);
      expect(summaryStats.mode & 0o077).toBe(0);
      expect(ledgerStats.mode & 0o077).toBe(0);
      expect(htmlStats.mode & 0o077).toBe(0);
    }

    const page1 = await listPublished(root);
    expect(page1.entries).toHaveLength(3);
    expect(page1.entries.map((entry) => entry.artifactId).sort()).toEqual(
      [
        `${receipt1.runId}.html`,
        `${receipt1.runId}.ledger`,
        `${receipt1.runId}.summary`,
      ].sort(),
    );

    const { receipt: receipt2 } = await prepareV2(
      { root, main: MAIN, checkpointId },
      v2Content,
      signal(),
    );
    expect(receipt2).toEqual(receipt1);

    const page2 = await listPublished(root);
    expect(page2.entries).toHaveLength(3);

    const generationsDir = path.join(
      root,
      "sessions",
      sessionToken(MAIN),
      "generations",
    );
    const generations = await fs.readdir(generationsDir);
    expect(generations).toHaveLength(1);
    const onlyGeneration = generations[0];
    if (!onlyGeneration) throw new Error("expected a published generation");
    const generationMeta = JSON.parse(
      await fs.readFile(
        path.join(generationsDir, onlyGeneration, "generation.json"),
        "utf8",
      ),
    ) as { layout?: string; schemaVersion?: number };
    expect(generationMeta).toMatchObject({ layout: "v2", schemaVersion: 2 });
  });

  it("v1 publish writes exactly the four legacy artifact files plus metadata and no generation record", async () => {
    const root = await newRoot();
    const claim = await claimRun(root, MAIN, "cp-v1-exact-files");
    await publishRun(claim, [
      {
        artifactId: `${claim.runId}.report`,
        kind: "report",
        content: "# Report\n",
      },
      {
        artifactId: `${claim.runId}.proposals`,
        kind: "proposals",
        content: "# Proposals\n",
      },
      {
        artifactId: `${claim.runId}.session`,
        kind: "session",
        content: "{}\n",
      },
      {
        artifactId: `${claim.runId}.receipt`,
        kind: "receipt",
        content: "{}\n",
      },
    ]);

    const report = await resolveArtifact(root, `${claim.runId}.report`);
    const generationDir = path.dirname(report.absolutePath);
    expect((await fs.readdir(generationDir)).sort()).toEqual([
      "proposals.md",
      "receipt.json",
      "report.md",
      "session.json",
    ]);

    // Neither the claim nor the index entries of a v1 publish may gain the
    // version fields this slice introduced for v2.
    const claimRecord = JSON.parse(
      await fs.readFile(
        path.join(root, "claims", `${sessionToken(MAIN)}.json`),
        "utf8",
      ),
    ) as Record<string, unknown>;
    expect(claimRecord).not.toHaveProperty("layout");
    const pointer = (
      await fs.readFile(path.join(root, "index", "current"), "utf8")
    ).trim();
    const currentIndex = JSON.parse(
      await fs.readFile(
        path.join(root, "index", "generations", pointer),
        "utf8",
      ),
    ) as { entries: Array<{ runId?: string }> };
    expect(currentIndex.entries).toHaveLength(4);
    for (const entry of currentIndex.entries) {
      expect(entry).not.toHaveProperty("layout");
      expect(entry).not.toHaveProperty("schemaVersion");
    }
  });

  it("hand-built v1 generation without a recorded layout is listed, readable, deletable and stays byte-identical after a v2 publish", async () => {
    const root = await newRoot();
    const layout = await prepareStore(root);
    const token = sessionToken(MAIN);
    const runId = "legacy-run";
    const generationId = "000001-legacy";
    const sessionDir = path.join(layout.sessionsDir, token);
    const generationsDir = path.join(sessionDir, "generations");
    const generationDir = path.join(generationsDir, generationId);
    const sessionIdentity = await ensurePrivateDirectory(sessionDir);
    const generationsIdentity = await ensurePrivateDirectory(generationsDir);
    await ensurePrivateDirectory(path.join(sessionDir, "staging"));
    await ensurePrivateDirectory(generationDir);

    // Hand-built v1: no generation.json, and index entries that predate the
    // layout/schemaVersion fields. The store must treat these as v1.
    const legacyKinds = ["report", "proposals", "session", "receipt"] as const;
    const legacyFiles = {
      report: "report.md",
      proposals: "proposals.md",
      session: "session.json",
      receipt: "receipt.json",
    } as const;
    const legacyContents: Record<(typeof legacyKinds)[number], string> = {
      report: "# Legacy V1 Report\n",
      proposals: "# Legacy V1 Proposals\n",
      session: `${JSON.stringify({ schemaVersion: 1, runId })}\n`,
      receipt: `${JSON.stringify({ schemaVersion: 1, status: "complete" })}\n`,
    };
    const at = "2026-10-01T09:00:00.000Z";
    await writePrivateFileAtomic(
      path.join(sessionDir, "meta.json"),
      JSON.stringify({
        schemaVersion: 1,
        main: { ...MAIN },
        createdAt: at,
        updatedAt: at,
        generationCount: 1,
        lastGenerationId: generationId,
        dev: sessionIdentity.dev.toString(),
        ino: sessionIdentity.ino.toString(),
        generations: {
          dev: generationsIdentity.dev.toString(),
          ino: generationsIdentity.ino.toString(),
        },
      }),
    );
    await writePrivateFileAtomic(
      path.join(sessionDir, "current"),
      generationId,
    );
    const legacyEntries = legacyKinds.map((kind) => ({
      artifactId: `${runId}.${kind}`,
      sessionToken: token,
      generationId,
      runId,
      checkpointId: "cp-legacy",
      kind,
      status: "complete",
      publishedAt: at,
      bytes: Buffer.byteLength(legacyContents[kind], "utf8"),
      fence: null,
    }));
    for (const kind of legacyKinds)
      await writePrivateFileAtomic(
        path.join(generationDir, legacyFiles[kind]),
        legacyContents[kind],
      );
    await writePrivateFileAtomic(
      path.join(layout.indexGenerationsDir, "legacy.json"),
      JSON.stringify({
        schemaVersion: 1,
        generation: 1,
        updatedAt: at,
        counts: { artifacts: 4, sessions: 1 },
        entries: legacyEntries,
      }),
    );
    await writePrivateFileAtomic(layout.indexPointer, "legacy.json");

    const pageBefore = await listPublished(root);
    expect(pageBefore.entries).toHaveLength(4);
    expect(pageBefore.entries.map((entry) => entry.kind).sort()).toEqual([
      "proposals",
      "receipt",
      "report",
      "session",
    ]);
    const bytesBefore = new Map<string, Buffer>();
    for (const kind of legacyKinds) {
      const resolved = await resolveArtifact(root, `${runId}.${kind}`);
      expect(resolved.kind).toBe(kind);
      bytesBefore.set(kind, await fs.readFile(resolved.absolutePath));
    }
    expect(bytesBefore.get("report")?.toString("utf8")).toBe(
      legacyContents.report,
    );

    const v2Content: V2Content = {
      summary: "# Session retrospective summary\n\n- Status: complete\n",
      ledger: JSON.stringify({ schemaVersion: 1, status: "complete" }) + "\n",
      reportHtml: "<!doctype html><html><body>Report</body></html>\n",
      status: "complete",
    };
    const { receipt: v2Receipt } = await prepareV2(
      { root, main: MAIN, checkpointId: "cp-legacy-v2" },
      v2Content,
      signal(),
    );
    expect(v2Receipt.artifactId).toBe(`${v2Receipt.runId}.summary`);

    const pageAfter = await listPublished(root);
    expect(pageAfter.entries).toHaveLength(7);
    expect(
      pageAfter.entries
        .filter((entry) => entry.artifactId.startsWith(`${runId}.`))
        .map((entry) => entry.kind)
        .sort(),
    ).toEqual(["proposals", "receipt", "report", "session"]);
    expect(pageAfter.entries.map((entry) => entry.kind)).toContain("summary");
    for (const kind of legacyKinds) {
      const resolved = await resolveArtifact(root, `${runId}.${kind}`);
      const before = bytesBefore.get(kind);
      if (!before) throw new Error(`missing captured bytes for ${kind}`);
      expect(await fs.readFile(resolved.absolutePath)).toEqual(before);
    }
    // Never rewritten or reinterpreted: the v1 generation still carries no
    // generation record, so it cannot be read as v2.
    await expect(
      fs.lstat(path.join(generationDir, "generation.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });

    const deleted = await deleteSession(root, MAIN);
    expect(deleted.deleted).toBe(true);
    expect(deleted.removedArtifacts).toBe(7);
    expect((await listPublished(root)).entries).toEqual([]);
    await expect(
      resolveArtifact(root, `${runId}.report`),
    ).rejects.toMatchObject({ code: "ARTIFACT_NOT_FOUND" });
  });

  it("refuses unknown schemaVersion in index or generation with coded error and deletes nothing", async () => {
    const root = await newRoot();
    const claim = await claimRun(root, MAIN, "cp-unknown-version", {
      layout: "v2",
    });
    await publishRun(
      claim,
      [
        {
          artifactId: "art-summary-probe",
          kind: "summary",
          content: "# Valid Summary\n",
        },
        {
          artifactId: "art-ledger-probe",
          kind: "ledger",
          content: "{}\n",
        },
      ],
      { layout: "v2" },
    );

    const resolved = await resolveArtifact(root, "art-summary-probe");
    const genDir = path.dirname(resolved.absolutePath);
    const genMetaPath = path.join(genDir, "generation.json");

    await fs.writeFile(
      genMetaPath,
      JSON.stringify({ schemaVersion: 99, layout: "v99" }),
      { mode: 0o600 },
    );
    await fs.chmod(genMetaPath, 0o600);

    await expect(
      resolveArtifact(root, "art-summary-probe"),
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_SCHEMA_VERSION",
    });
    await expect(deleteSession(root, MAIN)).rejects.toMatchObject({
      code: "UNSUPPORTED_SCHEMA_VERSION",
    });
    // Fail closed before the tombstone: no fence, no unlink.
    await expect(
      fs.lstat(path.join(root, "fences", `${sessionToken(MAIN)}.json`)),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect((await fs.lstat(genDir)).isDirectory()).toBe(true);

    expect(await fs.readFile(resolved.absolutePath, "utf8")).toBe(
      "# Valid Summary\n",
    );

    await fs.writeFile(
      genMetaPath,
      JSON.stringify({ schemaVersion: 2, layout: "v2" }),
      { mode: 0o600 },
    );
    await fs.chmod(genMetaPath, 0o600);
    expect((await resolveArtifact(root, "art-summary-probe")).kind).toBe(
      "summary",
    );

    const pointerName = (
      await fs.readFile(path.join(root, "index", "current"), "utf8")
    ).trim();
    const indexPath = path.join(root, "index", "generations", pointerName);
    const originalIndexContent = await fs.readFile(indexPath, "utf8");
    const corruptedIndex = {
      ...JSON.parse(originalIndexContent),
      schemaVersion: 99,
    };
    await fs.writeFile(indexPath, JSON.stringify(corruptedIndex), {
      mode: 0o600,
    });
    await fs.chmod(indexPath, 0o600);

    await expect(listPublished(root)).rejects.toMatchObject({
      code: "UNSUPPORTED_SCHEMA_VERSION",
    });
    await expect(deleteSession(root, MAIN)).rejects.toMatchObject({
      code: "UNSUPPORTED_SCHEMA_VERSION",
    });

    await fs.writeFile(indexPath, originalIndexContent, { mode: 0o600 });
    await fs.chmod(indexPath, 0o600);
    expect((await resolveArtifact(root, "art-summary-probe")).kind).toBe(
      "summary",
    );

    // An unsupported version recorded on an index entry is refused the same
    // way, and still before any deletion.
    const entryCorruptIndex = JSON.parse(originalIndexContent) as {
      entries: Array<Record<string, unknown>>;
    };
    const firstEntry = entryCorruptIndex.entries[0];
    if (!firstEntry) throw new Error("expected an index entry");
    firstEntry.schemaVersion = 99;
    await fs.writeFile(indexPath, JSON.stringify(entryCorruptIndex), {
      mode: 0o600,
    });
    await fs.chmod(indexPath, 0o600);
    await expect(listPublished(root)).rejects.toMatchObject({
      code: "UNSUPPORTED_SCHEMA_VERSION",
    });
    await expect(deleteSession(root, MAIN)).rejects.toMatchObject({
      code: "UNSUPPORTED_SCHEMA_VERSION",
    });
    await expect(
      fs.lstat(path.join(root, "fences", `${sessionToken(MAIN)}.json`)),
    ).rejects.toMatchObject({ code: "ENOENT" });

    await fs.writeFile(indexPath, originalIndexContent, { mode: 0o600 });
    await fs.chmod(indexPath, 0o600);
    expect((await resolveArtifact(root, "art-summary-probe")).kind).toBe(
      "summary",
    );
  });

  it("deleting a session with one v1 (4 artifacts) and one v2 (3 artifacts) removes both and reports 7 removed artifacts", async () => {
    const root = await newRoot();
    const v1Claim = await claimRun(root, MAIN, "cp-del-v1");
    await publishRun(v1Claim, [
      {
        artifactId: `${v1Claim.runId}.report`,
        kind: "report",
        content: "# Report\n",
      },
      {
        artifactId: `${v1Claim.runId}.proposals`,
        kind: "proposals",
        content: "# Proposals\n",
      },
      {
        artifactId: `${v1Claim.runId}.session`,
        kind: "session",
        content: "{}\n",
      },
      {
        artifactId: `${v1Claim.runId}.receipt`,
        kind: "receipt",
        content: "{}\n",
      },
    ]);

    const v2Claim = await claimRun(root, MAIN, "cp-del-v2", {
      layout: "v2",
    });
    await publishRun(
      v2Claim,
      [
        {
          artifactId: `${v2Claim.runId}.summary`,
          kind: "summary",
          content: "# Summary\n",
        },
        {
          artifactId: `${v2Claim.runId}.ledger`,
          kind: "ledger",
          content: "{}\n",
        },
        {
          artifactId: `${v2Claim.runId}.html`,
          kind: "html",
          content: "<!doctype html><html></html>\n",
        },
      ],
      { layout: "v2" },
    );

    const beforePage = await listPublished(root);
    expect(beforePage.entries).toHaveLength(7);

    const v1Generation = await resolveArtifact(root, `${v1Claim.runId}.report`);
    const v1GenerationDir = path.dirname(v1Generation.absolutePath);
    // A v1 generation carries no layout record at all.
    await expect(
      fs.lstat(path.join(v1GenerationDir, "generation.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const v2Summary = await resolveArtifact(root, `${v2Claim.runId}.summary`);
    const v2GenerationMeta = JSON.parse(
      await fs.readFile(
        path.join(path.dirname(v2Summary.absolutePath), "generation.json"),
        "utf8",
      ),
    ) as { layout?: string; schemaVersion?: number };
    expect(v2GenerationMeta).toMatchObject({ layout: "v2", schemaVersion: 2 });

    // The version fields live on v2 index entries only; a v1 entry stays
    // byte-compatible with what the store wrote before layouts existed.
    const pointer = (
      await fs.readFile(path.join(root, "index", "current"), "utf8")
    ).trim();
    const currentIndex = JSON.parse(
      await fs.readFile(
        path.join(root, "index", "generations", pointer),
        "utf8",
      ),
    ) as { entries: Array<{ runId?: string }> };
    const v1Entries = currentIndex.entries.filter(
      (entry) => entry.runId === v1Claim.runId,
    );
    expect(v1Entries).toHaveLength(4);
    for (const entry of v1Entries) {
      expect(entry).not.toHaveProperty("layout");
      expect(entry).not.toHaveProperty("schemaVersion");
    }
    const v2Entries = currentIndex.entries.filter(
      (entry) => entry.runId === v2Claim.runId,
    );
    expect(v2Entries).toHaveLength(3);
    for (const entry of v2Entries)
      expect(entry).toMatchObject({ layout: "v2", schemaVersion: 2 });

    const result = await deleteSession(root, MAIN);
    expect(result.deleted).toBe(true);
    expect(result.removedArtifacts).toBe(7);
    const afterPage = await listPublished(root);
    expect(afterPage.entries).toHaveLength(0);
  });

  it("primary-kind dedupe: v2 layout does not dedupe against v1 report of the same checkpoint", async () => {
    const root = await newRoot();
    const checkpointId = "cp-same-checkpoint";

    const v1Claim = await claimRun(root, MAIN, checkpointId, { layout: "v1" });
    await publishRun(v1Claim, [
      {
        artifactId: `${v1Claim.runId}.report`,
        kind: "report",
        content: "# Report\n",
      },
      {
        artifactId: `${v1Claim.runId}.proposals`,
        kind: "proposals",
        content: "# Proposals\n",
      },
      {
        artifactId: `${v1Claim.runId}.session`,
        kind: "session",
        content: "{}\n",
      },
      {
        artifactId: `${v1Claim.runId}.receipt`,
        kind: "receipt",
        content: "{}\n",
      },
    ]);

    const v2Content: V2Content = {
      summary: "# Session retrospective summary\n\n- Status: complete\n",
      ledger: JSON.stringify({ schemaVersion: 1, status: "complete" }) + "\n",
      reportHtml: "<!doctype html><html></html>\n",
      status: "complete",
    };
    const { receipt: v2Receipt } = await prepareV2(
      { root, main: MAIN, checkpointId },
      v2Content,
      signal(),
    );
    expect(v2Receipt.artifactId).toBe(`${v2Receipt.runId}.summary`);
    expect(v2Receipt.runId).not.toBe(v1Claim.runId);

    const page = await listPublished(root);
    expect(page.entries).toHaveLength(7);
    const { receipt: v2Repeat } = await prepareV2(
      { root, main: MAIN, checkpointId },
      v2Content,
      signal(),
    );
    expect(v2Repeat).toEqual(v2Receipt);

    const v1Access = await acquirePreparation(root, MAIN, checkpointId, {
      layout: "v1",
    });
    expect(v1Access.role).toBe("join");
    if (v1Access.role === "join") {
      expect(v1Access.runId).toBe(v1Claim.runId);
    }
  });

  it("mid-publish failure leaves no visible v2 generation", async () => {
    const root = await newRoot();
    const v2Claim = await claimRun(root, MAIN, "cp-mid-failure", {
      layout: "v2",
    });

    const renameSpy = vi
      .spyOn(fs, "rename")
      .mockRejectedValueOnce(new Error("injected mid-publish failure"));

    await expect(
      publishRun(
        v2Claim,
        [
          {
            artifactId: "art-midfail-summary",
            kind: "summary",
            content: "# Summary\n",
          },
          {
            artifactId: "art-midfail-ledger",
            kind: "ledger",
            content: "{}\n",
          },
        ],
        { layout: "v2" },
      ),
    ).rejects.toThrow("injected mid-publish failure");

    renameSpy.mockRestore();

    const page = await listPublished(root);
    expect(page.entries).toHaveLength(0);

    const sessionDir = path.join(root, "sessions", sessionToken(MAIN));
    const genDir = path.join(sessionDir, "generations");
    const genChildren = await fs.readdir(genDir).catch(() => []);
    expect(genChildren).toHaveLength(0);

    const stagingDir = path.join(sessionDir, "staging");
    const stagingChildren = await fs.readdir(stagingDir).catch(() => []);
    expect(stagingChildren).toHaveLength(0);
  });

  it("older two-file v2 generation lacking report.html fails closed on resolveArtifact with ARTIFACT_MISSING", async () => {
    const root = await newRoot();
    const v2Claim = await claimRun(root, MAIN, "cp-old-two-file", {
      layout: "v2",
    });
    // Publish only summary and ledger (legacy 2-file v2)
    await publishRun(
      v2Claim,
      [
        {
          artifactId: `${v2Claim.runId}.summary`,
          kind: "summary",
          content: "# Old Summary\n",
        },
        {
          artifactId: `${v2Claim.runId}.ledger`,
          kind: "ledger",
          content: "{}\n",
        },
      ],
      { layout: "v2" },
    );

    // Reading the missing html artifact fails closed with ARTIFACT_NOT_FOUND (not indexed)
    await expect(
      resolveArtifact(root, `${v2Claim.runId}.html`),
    ).rejects.toMatchObject({
      code: "ARTIFACT_NOT_FOUND",
    });

    // If an index entry exists for an artifact whose file was never written,
    // resolveArtifact fails closed with ARTIFACT_MISSING
    const summaryArtifact = await resolveArtifact(
      root,
      `${v2Claim.runId}.summary`,
    );
    const genDir = path.dirname(summaryArtifact.absolutePath);
    // Delete summary.md to simulate an incomplete/missing file in generation
    await fs.unlink(summaryArtifact.absolutePath);
    await expect(
      resolveArtifact(root, `${v2Claim.runId}.summary`),
    ).rejects.toMatchObject({
      code: "ARTIFACT_MISSING",
    });

    // Cleanup via deleteSession still succeeds and cleanly removes the generation directory
    const delResult = await deleteSession(root, MAIN);
    expect(delResult.deleted).toBe(true);
    await expect(fs.access(genDir)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
