import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NodeKey } from "../src/retrospective/contracts";
import type { LedgerFolder } from "../src/retrospective/ledger";
import {
  claimRun,
  publishRun,
  type PublishArtifact,
} from "../src/retrospective/store";
import {
  computeRates,
  loadPreviousReports,
  type ComputableLedger,
} from "../src/retrospective/trend";

const roots: string[] = [];

async function newRoot(): Promise<string> {
  const realTmp = await fs.realpath(os.tmpdir());
  const dir = await fs.mkdtemp(path.join(realTmp, "ags-trend-"));
  roots.push(dir);
  return dir;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const dir of roots.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

function makeSampleLedger(
  session: string | null,
  folder: LedgerFolder | null,
  to: string,
  extra: {
    turnsMain?: number;
    turnsOthers?: number;
    costCentsMain?: number;
    costCentsOthers?: number;
    compactionsMain?: number;
    answers?: number;
    errorStops?: number;
    toolCalls?: number;
    failedToolCalls?: number;
    lookupCalls?: number;
    lookupNoMatch?: number;
    editEpisodesMain?: number;
    editEpisodesOthers?: number;
    unguardedEditsMain?: number;
    unguardedEditsOthers?: number;
    agents?: Array<{ turns: number }>;
  } = {},
) {
  const claims: Array<{
    template: string;
    values: Record<string, number | string>;
    scope: { nodes: NodeKey[]; from: string; to: string };
  }> = [
    {
      template: "coverage",
      values: {},
      scope: {
        nodes: [{ hostId: "h", sessionId: "s" }],
        from: "2026-10-01T00:00:00Z",
        to,
      },
    },
  ];

  if (
    extra.turnsMain !== undefined ||
    extra.costCentsMain !== undefined ||
    extra.compactionsMain !== undefined
  ) {
    claims.push({
      template: "cost-drivers",
      values: {
        turnsMain: extra.turnsMain ?? 50,
        turnsOthers: extra.turnsOthers ?? 50,
        costCentsMain: extra.costCentsMain ?? 100,
        costCentsOthers: extra.costCentsOthers ?? 100,
        compactionsMain: extra.compactionsMain ?? 0,
      },
      scope: {
        nodes: [{ hostId: "h", sessionId: "s" }],
        from: "2026-10-01T00:00:00Z",
        to,
      },
    });
  }

  if (extra.answers !== undefined) {
    claims.push({
      template: "permission-answers",
      values: { answers: extra.answers },
      scope: {
        nodes: [{ hostId: "h", sessionId: "s" }],
        from: "2026-10-01T00:00:00Z",
        to,
      },
    });
  }

  if (extra.errorStops !== undefined) {
    claims.push({
      template: "error-stop-exposure",
      values: { errorStops: extra.errorStops },
      scope: {
        nodes: [{ hostId: "h", sessionId: "s" }],
        from: "2026-10-01T00:00:00Z",
        to,
      },
    });
  }

  if (extra.toolCalls !== undefined || extra.failedToolCalls !== undefined) {
    claims.push({
      template: "tool-errors",
      values: {
        toolCalls: extra.toolCalls ?? 0,
        failedToolCalls: extra.failedToolCalls ?? 0,
      },
      scope: {
        nodes: [{ hostId: "h", sessionId: "s" }],
        from: "2026-10-01T00:00:00Z",
        to,
      },
    });
  }

  if (extra.lookupCalls !== undefined || extra.lookupNoMatch !== undefined) {
    claims.push({
      template: "ags-lookups",
      values: {
        calls: extra.lookupCalls ?? 0,
        noMatchCalls: extra.lookupNoMatch ?? 0,
      },
      scope: {
        nodes: [{ hostId: "h", sessionId: "s" }],
        from: "2026-10-01T00:00:00Z",
        to,
      },
    });
  }

  if (
    extra.editEpisodesMain !== undefined ||
    extra.unguardedEditsMain !== undefined
  ) {
    claims.push({
      template: "routing-order",
      values: {
        editEpisodesMain: extra.editEpisodesMain ?? 0,
        editEpisodesOthers: extra.editEpisodesOthers ?? 0,
        unguardedEditsMain: extra.unguardedEditsMain ?? 0,
        unguardedEditsOthers: extra.unguardedEditsOthers ?? 0,
      },
      scope: {
        nodes: [{ hostId: "h", sessionId: "s" }],
        from: "2026-10-01T00:00:00Z",
        to,
      },
    });
  }

  return {
    schemaVersion: 1,
    session,
    folder,
    claims,
    agents: extra.agents ?? [{ turns: 100 }],
  };
}

async function publishTestLedger(
  root: string,
  sessionId: string,
  checkpointId: string,
  ledgerContent: string,
) {
  const main: NodeKey = { hostId: "test-host", sessionId };
  const claim = await claimRun(root, main, checkpointId, { layout: "v2" });
  const summaryId = `${claim.runId}.summary`;
  const ledgerId = `${claim.runId}.ledger`;
  const htmlId = `${claim.runId}.html`;
  const artifacts: PublishArtifact[] = [
    { artifactId: summaryId, kind: "summary", content: "# Summary" },
    { artifactId: ledgerId, kind: "ledger", content: ledgerContent },
    {
      artifactId: htmlId,
      kind: "html",
      content: "<!doctype html><html></html>",
    },
  ];
  return await publishRun(claim, artifacts, {
    status: "complete",
    layout: "v2",
    schemaVersion: 2,
  });
}

describe("computeRates", () => {
  it("calculates all rate metrics with positive values and rounds appropriately", () => {
    const ledger: ComputableLedger = {
      session: "sess-1234",
      claims: [
        {
          template: "coverage",
          values: {},
          scope: { to: "2026-10-01T15:30:00Z" },
        },
        {
          template: "cost-drivers",
          values: {
            turnsMain: 60,
            turnsOthers: 40,
            costCentsMain: 120,
            costCentsOthers: 80,
            compactionsMain: 2,
          },
        },
        {
          template: "permission-answers",
          values: {
            answers: 5,
          },
        },
        {
          template: "error-stop-exposure",
          values: {
            errorStops: 3,
          },
        },
        {
          template: "tool-errors",
          values: {
            failedToolCalls: 4,
            toolCalls: 50,
          },
        },
        {
          template: "ags-lookups",
          values: {
            noMatchCalls: 6,
            calls: 20,
          },
        },
        {
          template: "routing-order",
          values: {
            editEpisodesMain: 12,
            editEpisodesOthers: 8,
            unguardedEditsMain: 3,
            unguardedEditsOthers: 2,
          },
        },
      ],
      agents: [{ turns: 100 }],
    };

    const rates = computeRates(ledger);
    expect(rates).toEqual({
      session: "sess-1234",
      to: "2026-10-01T15:30:00Z",
      turns: 100,
      costCentsPer100Turns: 200,
      permissionAnswersPer100TurnsTenths: 50,
      errorStopsPer100TurnsTenths: 30,
      toolErrorsPer100CallsTenths: 80,
      lookupMissPercent: 30,
      compactionsPer100TurnsTenths: 20,
      unguardedEditPercent: 25,
    });
  });

  it("returns turns 0 and all null rates when total assistant turns is 0", () => {
    const ledger: ComputableLedger = {
      session: "sess-zero",
      claims: [
        {
          template: "coverage",
          values: {},
          scope: { to: "2026-10-02T10:00:00Z" },
        },
        {
          template: "cost-drivers",
          values: {
            turnsMain: 0,
            turnsOthers: 0,
            costCentsMain: 500,
            costCentsOthers: 0,
            compactionsMain: 1,
          },
        },
        {
          template: "permission-answers",
          values: { answers: 10 },
        },
        {
          template: "error-stop-exposure",
          values: { errorStops: 5 },
        },
      ],
      agents: [{ turns: 0 }],
    };

    const rates = computeRates(ledger);
    expect(rates).toEqual({
      session: "sess-zero",
      to: "2026-10-02T10:00:00Z",
      turns: 0,
      costCentsPer100Turns: null,
      permissionAnswersPer100TurnsTenths: null,
      errorStopsPer100TurnsTenths: null,
      toolErrorsPer100CallsTenths: null,
      lookupMissPercent: null,
      compactionsPer100TurnsTenths: null,
      unguardedEditPercent: null,
    });
  });

  it("falls back to summing agents turns when cost-drivers claim is absent", () => {
    const ledger: ComputableLedger = {
      session: "sess-no-cost-drivers",
      claims: [
        {
          template: "coverage",
          values: {},
          scope: { to: "2026-10-03T12:00:00Z" },
        },
        {
          template: "permission-answers",
          values: { answers: 2 },
        },
      ],
      agents: [{ turns: 25 }, { turns: 15 }],
    };

    const rates = computeRates(ledger);
    expect(rates.turns).toBe(40);
    expect(rates.costCentsPer100Turns).toBeNull();
    expect(rates.compactionsPer100TurnsTenths).toBeNull();
    expect(rates.permissionAnswersPer100TurnsTenths).toBe(50);
  });

  it("returns null for individual rates when their claims are absent", () => {
    const ledger: ComputableLedger = {
      session: "sess-minimal",
      claims: [
        {
          template: "coverage",
          values: {},
          scope: { to: "2026-10-04T12:00:00Z" },
        },
        {
          template: "cost-drivers",
          values: {
            turnsMain: 50,
            turnsOthers: 50,
            costCentsMain: 200,
            costCentsOthers: 100,
          },
        },
      ],
      agents: [{ turns: 100 }],
    };

    const rates = computeRates(ledger);
    expect(rates.costCentsPer100Turns).toBe(300);
    expect(rates.permissionAnswersPer100TurnsTenths).toBeNull();
    expect(rates.errorStopsPer100TurnsTenths).toBeNull();
    expect(rates.toolErrorsPer100CallsTenths).toBeNull();
    expect(rates.lookupMissPercent).toBeNull();
    expect(rates.compactionsPer100TurnsTenths).toBeNull();
    expect(rates.unguardedEditPercent).toBeNull();
  });

  it("returns null for rate metrics when denominators are zero", () => {
    const ledger: ComputableLedger = {
      session: "sess-zero-denominators",
      claims: [
        {
          template: "coverage",
          values: {},
          scope: { to: "2026-10-05T12:00:00Z" },
        },
        {
          template: "cost-drivers",
          values: {
            turnsMain: 20,
            turnsOthers: 0,
          },
        },
        {
          template: "tool-errors",
          values: {
            failedToolCalls: 0,
            toolCalls: 0,
          },
        },
        {
          template: "ags-lookups",
          values: {
            noMatchCalls: 0,
            calls: 0,
          },
        },
        {
          template: "routing-order",
          values: {
            editEpisodesMain: 0,
            editEpisodesOthers: 0,
            unguardedEditsMain: 0,
            unguardedEditsOthers: 0,
          },
        },
      ],
      agents: [{ turns: 20 }],
    };

    const rates = computeRates(ledger);
    expect(rates.turns).toBe(20);
    expect(rates.toolErrorsPer100CallsTenths).toBeNull();
    expect(rates.lookupMissPercent).toBeNull();
    expect(rates.unguardedEditPercent).toBeNull();
  });

  it("falls back to empty string when coverage claim is absent", () => {
    const ledger: ComputableLedger = {
      session: "sess-no-coverage",
      claims: [
        {
          template: "cost-drivers",
          values: { turnsMain: 10, turnsOthers: 0 },
        },
      ],
      agents: [{ turns: 10 }],
    };

    const rates = computeRates(ledger);
    expect(rates.to).toBe("");
  });
});

describe("loadPreviousReports", () => {
  const TARGET_FOLDER: LedgerFolder = {
    name: "my-repo",
    parent: "workspace-a",
  };

  it("returns empty array when folder is null or limit is non-positive", async () => {
    const root = await newRoot();
    expect(await loadPreviousReports(root, null, "sess-1", 5)).toEqual([]);
    expect(await loadPreviousReports(root, TARGET_FOLDER, "sess-1", 0)).toEqual(
      [],
    );
    expect(
      await loadPreviousReports(root, TARGET_FOLDER, "sess-1", -1),
    ).toEqual([]);
  });

  it("filters reports by same folder name and parent", async () => {
    const root = await newRoot();
    const matchingLedger = makeSampleLedger(
      "sess-match",
      TARGET_FOLDER,
      "2026-10-01T10:00:00Z",
      {
        turnsMain: 50,
        turnsOthers: 50,
        costCentsMain: 100,
        costCentsOthers: 100,
      },
    );
    const differentNameLedger = makeSampleLedger(
      "sess-diff-name",
      { name: "other-repo", parent: "workspace-a" },
      "2026-10-01T11:00:00Z",
    );
    const differentParentLedger = makeSampleLedger(
      "sess-diff-parent",
      { name: "my-repo", parent: "workspace-b" },
      "2026-10-01T12:00:00Z",
    );

    await publishTestLedger(
      root,
      "sess-match",
      "cp-1",
      JSON.stringify(matchingLedger),
    );
    await publishTestLedger(
      root,
      "sess-diff-name",
      "cp-1",
      JSON.stringify(differentNameLedger),
    );
    await publishTestLedger(
      root,
      "sess-diff-parent",
      "cp-1",
      JSON.stringify(differentParentLedger),
    );

    const reports = await loadPreviousReports(
      root,
      TARGET_FOLDER,
      "sess-current",
      10,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0].session).toBe("sess-match");
  });

  it("excludes reports matching currentSession", async () => {
    const root = await newRoot();
    const currentLedger = makeSampleLedger(
      "sess-current",
      TARGET_FOLDER,
      "2026-10-01T10:00:00Z",
    );
    const olderLedger = makeSampleLedger(
      "sess-older",
      TARGET_FOLDER,
      "2026-10-01T08:00:00Z",
    );

    await publishTestLedger(
      root,
      "sess-current",
      "cp-1",
      JSON.stringify(currentLedger),
    );
    await publishTestLedger(
      root,
      "sess-older",
      "cp-1",
      JSON.stringify(olderLedger),
    );

    const reports = await loadPreviousReports(
      root,
      TARGET_FOLDER,
      "sess-current",
      10,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0].session).toBe("sess-older");
  });

  it("orders reports by coverage to descending", async () => {
    const root = await newRoot();
    const ledgerA = makeSampleLedger(
      "sess-a",
      TARGET_FOLDER,
      "2026-10-01T10:00:00Z",
    );
    const ledgerB = makeSampleLedger(
      "sess-b",
      TARGET_FOLDER,
      "2026-10-05T10:00:00Z",
    );
    const ledgerC = makeSampleLedger(
      "sess-c",
      TARGET_FOLDER,
      "2026-10-03T10:00:00Z",
    );

    await publishTestLedger(root, "sess-a", "cp-1", JSON.stringify(ledgerA));
    await publishTestLedger(root, "sess-b", "cp-1", JSON.stringify(ledgerB));
    await publishTestLedger(root, "sess-c", "cp-1", JSON.stringify(ledgerC));

    const reports = await loadPreviousReports(
      root,
      TARGET_FOLDER,
      "sess-current",
      10,
    );
    expect(reports.map((r) => r.to)).toEqual([
      "2026-10-05T10:00:00Z",
      "2026-10-03T10:00:00Z",
      "2026-10-01T10:00:00Z",
    ]);
  });

  it("respects the limit argument", async () => {
    const root = await newRoot();
    const ledgerA = makeSampleLedger(
      "sess-a",
      TARGET_FOLDER,
      "2026-10-01T10:00:00Z",
    );
    const ledgerB = makeSampleLedger(
      "sess-b",
      TARGET_FOLDER,
      "2026-10-05T10:00:00Z",
    );
    const ledgerC = makeSampleLedger(
      "sess-c",
      TARGET_FOLDER,
      "2026-10-03T10:00:00Z",
    );

    await publishTestLedger(root, "sess-a", "cp-1", JSON.stringify(ledgerA));
    await publishTestLedger(root, "sess-b", "cp-1", JSON.stringify(ledgerB));
    await publishTestLedger(root, "sess-c", "cp-1", JSON.stringify(ledgerC));

    const reports = await loadPreviousReports(
      root,
      TARGET_FOLDER,
      "sess-current",
      2,
    );
    expect(reports).toHaveLength(2);
    expect(reports.map((r) => r.session)).toEqual(["sess-b", "sess-c"]);
  });

  it("deduplicates reports by session keeping only the newest", async () => {
    const root = await newRoot();
    const olderRepeat = makeSampleLedger(
      "sess-repeat",
      TARGET_FOLDER,
      "2026-10-01T10:00:00Z",
    );
    const newerRepeat = makeSampleLedger(
      "sess-repeat",
      TARGET_FOLDER,
      "2026-10-04T10:00:00Z",
    );
    const otherSession = makeSampleLedger(
      "sess-other",
      TARGET_FOLDER,
      "2026-10-02T10:00:00Z",
    );

    await publishTestLedger(
      root,
      "sess-repeat",
      "cp-older",
      JSON.stringify(olderRepeat),
    );
    await publishTestLedger(
      root,
      "sess-repeat",
      "cp-newer",
      JSON.stringify(newerRepeat),
    );
    await publishTestLedger(
      root,
      "sess-other",
      "cp-other",
      JSON.stringify(otherSession),
    );

    const reports = await loadPreviousReports(
      root,
      TARGET_FOLDER,
      "sess-current",
      10,
    );
    expect(reports).toHaveLength(2);
    expect(reports.map((r) => ({ session: r.session, to: r.to }))).toEqual([
      { session: "sess-repeat", to: "2026-10-04T10:00:00Z" },
      { session: "sess-other", to: "2026-10-02T10:00:00Z" },
    ]);
  });

  it("skips corrupt, oversized, and older-shape entries", async () => {
    const root = await newRoot();
    const validLedger = makeSampleLedger(
      "sess-valid",
      TARGET_FOLDER,
      "2026-10-01T10:00:00Z",
    );
    const olderShape = { legacy: true, status: "complete" };
    const corruptJson = "{ malformed json content ...";
    const oversizedPayload = JSON.stringify({
      ...makeSampleLedger(
        "sess-oversized",
        TARGET_FOLDER,
        "2026-10-02T10:00:00Z",
      ),
      padding: "x".repeat(2.1 * 1024 * 1024),
    });

    await publishTestLedger(
      root,
      "sess-valid",
      "cp-1",
      JSON.stringify(validLedger),
    );
    await publishTestLedger(
      root,
      "sess-older-shape",
      "cp-1",
      JSON.stringify(olderShape),
    );
    await publishTestLedger(root, "sess-corrupt", "cp-1", corruptJson);
    await publishTestLedger(root, "sess-oversized", "cp-1", oversizedPayload);

    const reports = await loadPreviousReports(
      root,
      TARGET_FOLDER,
      "sess-current",
      10,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0].session).toBe("sess-valid");
  });

  it("never throws on a missing root directory", async () => {
    const missingRoot = path.join(
      os.tmpdir(),
      "ags-missing-root-" + Date.now(),
    );
    await expect(
      loadPreviousReports(missingRoot, TARGET_FOLDER, "sess-1", 5),
    ).resolves.toEqual([]);
  });
});
