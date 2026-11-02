import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NodeKey } from "../src/retrospective/contracts";
import {
  collectIndex,
  INDEX_DEFAULT_DAYS,
  INDEX_MAX_ROWS,
  INDEX_MAX_WINDOW_DAYS,
  parseIndexQuery,
  renderIndexHtml,
  writeIndex,
  type IndexQuery,
  type IndexResult,
} from "../src/retrospective/index-report";
import {
  assertStoreCapacity,
  claimRun,
  listPublished,
  publishRun,
  resolveArtifact,
  type PublishArtifact,
} from "../src/retrospective/store";

const roots: string[] = [];

async function newRoot(): Promise<string> {
  const realTmp = await fs.realpath(os.tmpdir());
  const dir = await fs.mkdtemp(path.join(realTmp, "ags-retro-index-"));
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

function makeMinimalLedger(options: {
  session?: string | null;
  label?: string | null;
  folder?: { name: string; parent: string | null } | null;
  from?: string;
  to?: string;
  outcome?:
    | {
        source: "git";
        branch: string | null;
        commits: number;
      }
    | {
        source: "unavailable";
        reason: "folder-missing" | "not-a-repo" | "git-error" | "not-measured";
      };
  turns?: number;
  costCents?: number;
  denied?: number;
  improvements?: Array<{
    rule: string;
    level: "act" | "watch";
    destination?: string;
    audience?: "manager" | "maintainer";
  }>;
}) {
  const from = options.from ?? "2026-10-01T00:00:00.000Z";
  const to = options.to ?? "2026-10-05T12:00:00.000Z";
  const session = options.session !== undefined ? options.session : "sess-001";
  const turns = options.turns ?? 10;
  const costCents = options.costCents ?? 150;

  const claims: Array<{
    template: string;
    values: Record<string, number | string>;
    scope: { nodes: NodeKey[]; from: string; to: string };
  }> = [
    {
      template: "coverage",
      values: {},
      scope: {
        nodes: [{ hostId: "test-host", sessionId: session ?? "anon" }],
        from,
        to,
      },
    },
    {
      template: "cost-drivers",
      values: {
        turnsMain: turns,
        turnsOthers: 0,
        costCentsMain: costCents,
        costCentsOthers: 0,
      },
      scope: {
        nodes: [{ hostId: "test-host", sessionId: session ?? "anon" }],
        from,
        to,
      },
    },
  ];

  if (options.denied !== undefined) {
    claims.push({
      template: "permission-answers",
      values: {
        answers: options.denied + 5,
        deny: options.denied,
      },
      scope: {
        nodes: [{ hostId: "test-host", sessionId: session ?? "anon" }],
        from,
        to,
      },
    });
  }

  return {
    schemaVersion: 1,
    cutoff: to,
    session,
    label: options.label ?? null,
    folder:
      options.folder !== undefined
        ? options.folder
        : { name: "test-repo", parent: "workspace" },
    claims,
    agents: [{ turns, costCents }],
    improvements: options.improvements ?? [],
    outcome: options.outcome ?? {
      source: "git",
      branch: "main",
      commits: 2,
    },
  };
}

async function publishTestLedger(
  root: string,
  sessionId: string,
  checkpointId: string,
  ledgerContent: string,
  htmlContent: string = "<!doctype html><html><body>Report</body></html>",
) {
  const main: NodeKey = { hostId: "test-host", sessionId };
  const claim = await claimRun(root, main, checkpointId, { layout: "v2" });
  const summaryId = `${claim.runId}.summary`;
  const ledgerId = `${claim.runId}.ledger`;
  const htmlId = `${claim.runId}.html`;
  const artifacts: PublishArtifact[] = [
    { artifactId: summaryId, kind: "summary", content: "# Summary" },
    { artifactId: ledgerId, kind: "ledger", content: ledgerContent },
    { artifactId: htmlId, kind: "html", content: htmlContent },
  ];
  return await publishRun(claim, artifacts, {
    status: "complete",
    layout: "v2",
    schemaVersion: 2,
  });
}

describe("parseIndexQuery", () => {
  const fixedNow = new Date("2026-10-15T12:00:00.000Z");

  it("applies defaults when input is empty or fields are omitted", () => {
    const result = parseIndexQuery({}, fixedNow);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.query.until).toBe("2026-10-15");
    expect(result.query.since).toBe("2026-09-16");
    expect(result.query.folder).toBeNull();
  });

  it("uses fixed now for until when only since is provided", () => {
    const result = parseIndexQuery({ since: "2026-10-01" }, fixedNow);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.query.since).toBe("2026-10-01");
    expect(result.query.until).toBe("2026-10-15");
    expect(result.query.folder).toBeNull();
  });

  it("derives since 29 days before until when only until is provided", () => {
    const result = parseIndexQuery({ until: "2026-05-30" }, fixedNow);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.query.until).toBe("2026-05-30");
    expect(result.query.since).toBe("2026-05-01");
  });

  it("accepts both since and until when valid", () => {
    const result = parseIndexQuery(
      { since: "2026-01-01", until: "2026-01-10", folder: "  my-app  " },
      fixedNow,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.query.since).toBe("2026-01-01");
    expect(result.query.until).toBe("2026-01-10");
    expect(result.query.folder).toBe("my-app");
  });

  describe("table-test: date validity, leap days, and month ends", () => {
    const cases: Array<{
      desc: string;
      since?: unknown;
      until?: unknown;
      expectedOk: boolean;
      expectedCode?: string;
    }> = [
      {
        desc: "valid leap day Feb 29 in leap year 2024",
        since: "2024-02-29",
        until: "2024-03-01",
        expectedOk: true,
      },
      {
        desc: "invalid leap day Feb 29 in non-leap year 2025",
        since: "2025-02-29",
        expectedOk: false,
        expectedCode: "INVALID_DATE",
      },
      {
        desc: "invalid Feb 30",
        since: "2026-02-30",
        expectedOk: false,
        expectedCode: "INVALID_DATE",
      },
      {
        desc: "valid month end April 30",
        since: "2026-04-30",
        until: "2026-05-01",
        expectedOk: true,
      },
      {
        desc: "invalid month end April 31",
        since: "2026-04-31",
        expectedOk: false,
        expectedCode: "INVALID_DATE",
      },
      {
        desc: "bad format single-digit month 2026-2-1",
        since: "2026-2-1",
        expectedOk: false,
        expectedCode: "INVALID_DATE",
      },
      {
        desc: "bad format invalid month 13 2026-13-01",
        since: "2026-13-01",
        expectedOk: false,
        expectedCode: "INVALID_DATE",
      },
      {
        desc: "bad format non-date string",
        since: "not-a-date",
        expectedOk: false,
        expectedCode: "INVALID_DATE",
      },
      {
        desc: "non-string type for since",
        since: 20261015,
        expectedOk: false,
        expectedCode: "INVALID_DATE",
      },
      {
        desc: "non-string type for until",
        until: true,
        expectedOk: false,
        expectedCode: "INVALID_DATE",
      },
    ];

    for (const c of cases) {
      it(c.desc, () => {
        const result = parseIndexQuery(
          { since: c.since, until: c.until },
          fixedNow,
        );
        expect(result.ok).toBe(c.expectedOk);
        if (!result.ok && c.expectedCode) {
          expect(result.code).toBe(c.expectedCode);
        }
      });
    }
  });

  describe("table-test: window length and range order", () => {
    it("rejects since > until as INVALID_RANGE", () => {
      const result = parseIndexQuery(
        { since: "2026-10-15", until: "2026-10-14" },
        fixedNow,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_RANGE");
      }
    });

    it("accepts a window of exactly 366 days in a leap year", () => {
      const result = parseIndexQuery(
        { since: "2024-01-01", until: "2024-12-31" },
        fixedNow,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.query.since).toBe("2024-01-01");
        expect(result.query.until).toBe("2024-12-31");
      }
    });

    it("rejects a window of 367 days as INVALID_RANGE", () => {
      const result = parseIndexQuery(
        { since: "2023-01-01", until: "2024-01-02" },
        fixedNow,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_RANGE");
      }
    });

    it("handles non-leap month-end rollbacks correctly", () => {
      const nowMarch = new Date("2026-03-01T00:00:00.000Z");
      const result = parseIndexQuery({}, nowMarch);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.query.until).toBe("2026-03-01");
        expect(result.query.since).toBe("2026-01-31");
      }
    });

    it("handles leap year month-end rollbacks across Feb 29 correctly", () => {
      const nowMarchLeap = new Date("2024-03-01T00:00:00.000Z");
      const result = parseIndexQuery({}, nowMarchLeap);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.query.until).toBe("2024-03-01");
        expect(result.query.since).toBe("2024-02-01");
      }
    });
  });

  describe("folder validation", () => {
    it("treats undefined and empty string as null folder", () => {
      expect(parseIndexQuery({ folder: undefined }, fixedNow)).toEqual({
        ok: true,
        query: { since: "2026-09-16", until: "2026-10-15", folder: null },
      });
      expect(parseIndexQuery({ folder: "" }, fixedNow)).toEqual({
        ok: true,
        query: { since: "2026-09-16", until: "2026-10-15", folder: null },
      });
      expect(parseIndexQuery({ folder: null }, fixedNow)).toEqual({
        ok: true,
        query: { since: "2026-09-16", until: "2026-10-15", folder: null },
      });
    });

    it("rejects non-string folder", () => {
      const res = parseIndexQuery({ folder: 123 }, fixedNow);
      expect(res).toEqual({ ok: false, code: "INVALID_FOLDER" });
    });

    it("rejects whitespace-only folder", () => {
      const res = parseIndexQuery({ folder: "   " }, fixedNow);
      expect(res).toEqual({ ok: false, code: "INVALID_FOLDER" });
    });

    it("rejects folder with control characters", () => {
      const resNull = parseIndexQuery({ folder: "proj\x00ect" }, fixedNow);
      expect(resNull).toEqual({ ok: false, code: "INVALID_FOLDER" });
      const resEsc = parseIndexQuery({ folder: "proj\x1fpad" }, fixedNow);
      expect(resEsc).toEqual({ ok: false, code: "INVALID_FOLDER" });
      const resDel = parseIndexQuery({ folder: "proj\x7fpad" }, fixedNow);
      expect(resDel).toEqual({ ok: false, code: "INVALID_FOLDER" });
    });

    it("rejects folder exceeding 120 characters after trim", () => {
      const longName = "a".repeat(121);
      const res = parseIndexQuery({ folder: longName }, fixedNow);
      expect(res).toEqual({ ok: false, code: "INVALID_FOLDER" });
    });

    it("accepts valid folder up to 120 characters and trims leading/trailing spaces", () => {
      const name = "  valid-proj/nested  ";
      const res = parseIndexQuery({ folder: name }, fixedNow);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.query.folder).toBe("valid-proj/nested");
      }
    });
  });
});

describe("collectIndex", () => {
  it("keeps only the latest generation for a session and counts total generations", async () => {
    const root = await newRoot();
    const sessionId = "session-multi-gen";

    const ledgerGen1 = makeMinimalLedger({
      session: sessionId,
      label: "Gen 1 Title",
      to: "2026-10-01T10:00:00.000Z",
      turns: 15,
      costCents: 200,
    });
    await publishTestLedger(
      root,
      sessionId,
      "cp-1",
      JSON.stringify(ledgerGen1),
    );

    const ledgerGen2 = makeMinimalLedger({
      session: sessionId,
      label: "Gen 2 Title",
      to: "2026-10-05T12:00:00.000Z",
      turns: 30,
      costCents: 450,
    });
    await publishTestLedger(
      root,
      sessionId,
      "cp-2",
      JSON.stringify(ledgerGen2),
    );

    const query: IndexQuery = {
      since: "2026-09-01",
      until: "2026-10-31",
      folder: null,
    };
    const result = await collectIndex(root, query);

    expect(result.rows).toHaveLength(1);
    expect(result.matched).toBe(1);
    expect(result.omitted).toBe(0);
    expect(result.storeSessions).toBe(1);

    const row = result.rows[0];
    expect(row.session).toBe(sessionId);
    expect(row.title).toBe("Gen 2 Title");
    expect(row.to).toBe("2026-10-05T12:00:00.000Z");
    expect(row.day).toBe("2026-10-05");
    expect(row.turns).toBe(30);
    expect(row.costCents).toBe(450);
    expect(row.generations).toBe(2);
  });

  it("breaks ties by greatest artifactId when to is identical", async () => {
    const root = await newRoot();
    const sessionId = "session-tie";

    const ledgerA = makeMinimalLedger({
      session: sessionId,
      label: "Tie 1",
      to: "2026-10-05T12:00:00.000Z",
      turns: 10,
    });
    await publishTestLedger(root, sessionId, "cp-a", JSON.stringify(ledgerA));

    const ledgerB = makeMinimalLedger({
      session: sessionId,
      label: "Tie 2",
      to: "2026-10-05T12:00:00.000Z",
      turns: 20,
    });
    await publishTestLedger(root, sessionId, "cp-b", JSON.stringify(ledgerB));

    const query: IndexQuery = {
      since: "2026-09-01",
      until: "2026-10-31",
      folder: null,
    };
    const result = await collectIndex(root, query);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].generations).toBe(2);

    // Artifact ids are not ordered by publish time: the winner is the greatest id.
    const page = await listPublished(root, {});
    const ledgerIds = page.entries
      .filter((entry) => entry.kind === "ledger")
      .map((entry) => entry.artifactId)
      .sort();
    expect(ledgerIds).toHaveLength(2);
    const resolved = await resolveArtifact(root, ledgerIds[1]);
    const winnerText = await fs.readFile(resolved.absolutePath, "utf8");
    const winnerLabel = winnerText.includes('"Tie 2"') ? "Tie 2" : "Tie 1";
    expect(result.rows[0].title).toBe(winnerLabel);
    expect(result.rows[0].turns).toBe(winnerLabel === "Tie 2" ? 20 : 10);
  });

  it("treats every null-session report as its own distinct row with generations 1", async () => {
    const root = await newRoot();

    const ledger1 = makeMinimalLedger({
      session: null,
      label: "Null Session 1",
      to: "2026-10-02T10:00:00.000Z",
    });
    await publishTestLedger(
      root,
      "host-sess-a",
      "cp-1",
      JSON.stringify(ledger1),
    );

    const ledger2 = makeMinimalLedger({
      session: null,
      label: "Null Session 2",
      to: "2026-10-03T10:00:00.000Z",
    });
    await publishTestLedger(
      root,
      "host-sess-b",
      "cp-2",
      JSON.stringify(ledger2),
    );

    const query: IndexQuery = {
      since: "2026-09-01",
      until: "2026-10-31",
      folder: null,
    };
    const result = await collectIndex(root, query);

    expect(result.rows).toHaveLength(2);
    expect(result.storeSessions).toBe(2);
    expect(result.rows[0].session).toBeNull();
    expect(result.rows[0].sessionShort).toBe("unknown");
    expect(result.rows[0].generations).toBe(1);
    expect(result.rows[1].session).toBeNull();
    expect(result.rows[1].sessionShort).toBe("unknown");
    expect(result.rows[1].generations).toBe(1);
  });

  it("enforces window inclusive edges strictly", async () => {
    const root = await newRoot();

    const ledgerBefore = makeMinimalLedger({
      session: "sess-before",
      to: "2026-09-30T23:59:59.000Z",
    });
    await publishTestLedger(
      root,
      "sess-before",
      "cp-1",
      JSON.stringify(ledgerBefore),
    );

    const ledgerSince = makeMinimalLedger({
      session: "sess-since",
      to: "2026-10-01T00:00:00.000Z",
    });
    await publishTestLedger(
      root,
      "sess-since",
      "cp-2",
      JSON.stringify(ledgerSince),
    );

    const ledgerMid = makeMinimalLedger({
      session: "sess-mid",
      to: "2026-10-05T12:00:00.000Z",
    });
    await publishTestLedger(
      root,
      "sess-mid",
      "cp-3",
      JSON.stringify(ledgerMid),
    );

    const ledgerUntil = makeMinimalLedger({
      session: "sess-until",
      to: "2026-10-10T23:59:59.000Z",
    });
    await publishTestLedger(
      root,
      "sess-until",
      "cp-4",
      JSON.stringify(ledgerUntil),
    );

    const ledgerAfter = makeMinimalLedger({
      session: "sess-after",
      to: "2026-10-11T00:00:00.000Z",
    });
    await publishTestLedger(
      root,
      "sess-after",
      "cp-5",
      JSON.stringify(ledgerAfter),
    );

    const query: IndexQuery = {
      since: "2026-10-01",
      until: "2026-10-10",
      folder: null,
    };
    const result = await collectIndex(root, query);

    expect(result.storeSessions).toBe(5);
    expect(result.newestDay).toBe("2026-10-11");
    expect(result.matched).toBe(3);
    const sessionIds = result.rows.map((r) => r.session);
    expect(sessionIds).toContain("sess-since");
    expect(sessionIds).toContain("sess-mid");
    expect(sessionIds).toContain("sess-until");
    expect(sessionIds).not.toContain("sess-before");
    expect(sessionIds).not.toContain("sess-after");
  });

  it("filters folders matching folder.name or parent/name exactly", async () => {
    const root = await newRoot();

    const ledgerA = makeMinimalLedger({
      session: "sess-a",
      folder: { name: "frontend", parent: "web" },
      to: "2026-10-05T10:00:00.000Z",
    });
    await publishTestLedger(root, "sess-a", "cp-1", JSON.stringify(ledgerA));

    const ledgerB = makeMinimalLedger({
      session: "sess-b",
      folder: { name: "backend", parent: "api" },
      to: "2026-10-05T10:00:00.000Z",
    });
    await publishTestLedger(root, "sess-b", "cp-2", JSON.stringify(ledgerB));

    const queryByName: IndexQuery = {
      since: "2026-10-01",
      until: "2026-10-10",
      folder: "frontend",
    };
    const resByName = await collectIndex(root, queryByName);
    expect(resByName.rows).toHaveLength(1);
    expect(resByName.rows[0].session).toBe("sess-a");

    const queryByParentName: IndexQuery = {
      since: "2026-10-01",
      until: "2026-10-10",
      folder: "web/frontend",
    };
    const resByParentName = await collectIndex(root, queryByParentName);
    expect(resByParentName.rows).toHaveLength(1);
    expect(resByParentName.rows[0].session).toBe("sess-a");

    const queryMismatched: IndexQuery = {
      since: "2026-10-01",
      until: "2026-10-10",
      folder: "other/frontend",
    };
    const resMismatched = await collectIndex(root, queryMismatched);
    expect(resMismatched.rows).toHaveLength(0);
  });

  it("handles unreadable stored reports (corrupted JSON, oversized, wrong schema)", async () => {
    const root = await newRoot();

    const validLedger = makeMinimalLedger({
      session: "sess-valid",
      to: "2026-10-05T10:00:00.000Z",
    });
    await publishTestLedger(
      root,
      "sess-valid",
      "cp-valid",
      JSON.stringify(validLedger),
    );

    await publishTestLedger(
      root,
      "sess-bad-json",
      "cp-bad-json",
      "not valid json {{{",
    );

    const badSchema = {
      schemaVersion: 99,
      session: "sess-old",
    };
    await publishTestLedger(
      root,
      "sess-bad-schema",
      "cp-bad-schema",
      JSON.stringify(badSchema),
    );

    const query: IndexQuery = {
      since: "2026-10-01",
      until: "2026-10-10",
      folder: null,
    };
    const result = await collectIndex(root, query);

    expect(result.unreadable).toBe(2);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].session).toBe("sess-valid");
  });

  it("counts ledgers without a usable end date or without a schema version as unreadable", async () => {
    const root = await newRoot();
    await publishTestLedger(
      root,
      "sess-valid-shape",
      "cp-1",
      JSON.stringify(
        makeMinimalLedger({
          session: "sess-valid-shape",
          to: "2026-10-05T10:00:00.000Z",
        }),
      ),
    );
    await publishTestLedger(
      root,
      "sess-bad-shape",
      "cp-2",
      JSON.stringify({ schemaVersion: 1 }),
    );
    await publishTestLedger(
      root,
      "sess-no-version",
      "cp-3",
      JSON.stringify({ hello: "world" }),
    );

    const result = await collectIndex(root, {
      since: "2026-09-01",
      until: "2026-10-31",
      folder: null,
    });

    expect(result.unreadable).toBe(2);
    expect(result.matched).toBe(1);
    expect(result.rows.map((r) => r.session)).toEqual(["sess-valid-shape"]);
    expect(result.storeSessions).toBe(1);
  });

  it("orders rows newest first and breaks equal end times by session id", async () => {
    const root = await newRoot();
    const entries: Array<[string, string]> = [
      ["sess-b", "2026-10-03T10:00:00.000Z"],
      ["sess-c", "2026-10-05T10:00:00.000Z"],
      ["sess-a", "2026-10-03T10:00:00.000Z"],
      ["sess-d", "2026-10-01T10:00:00.000Z"],
    ];
    let n = 0;
    for (const [session, to] of entries) {
      n += 1;
      await publishTestLedger(
        root,
        session,
        `cp-${n}`,
        JSON.stringify(makeMinimalLedger({ session, to })),
      );
    }

    const result = await collectIndex(root, {
      since: "2026-09-01",
      until: "2026-10-31",
      folder: null,
    });

    expect(result.rows.map((r) => r.session)).toEqual([
      "sess-c",
      "sess-a",
      "sess-b",
      "sess-d",
    ]);
  });

  it("lists recurring rules with equal counts in alphabetical order", async () => {
    const root = await newRoot();
    await publishTestLedger(
      root,
      "sess-r1",
      "cp-1",
      JSON.stringify(
        makeMinimalLedger({
          session: "sess-r1",
          to: "2026-10-02T10:00:00.000Z",
          improvements: [
            { rule: "lookup-misses", level: "watch" },
            { rule: "coverage-gap", level: "watch" },
          ],
        }),
      ),
    );

    const result = await collectIndex(root, {
      since: "2026-09-01",
      until: "2026-10-31",
      folder: null,
    });

    expect(result.recurring.map((r) => r.rule)).toEqual([
      "coverage-gap",
      "lookup-misses",
    ]);
  });

  it("shows at most the row cap newest first, reports the rest as omitted, and totals cover every match", async () => {
    expect(INDEX_MAX_ROWS).toBe(200);
    const root = await newRoot();
    const total = 5;
    for (let i = 0; i < total; i++) {
      const session = `sess-cap-${i}`;
      await publishTestLedger(
        root,
        session,
        `cp-${i}`,
        JSON.stringify(
          makeMinimalLedger({
            session,
            to: `2026-10-0${i + 1}T10:00:00.000Z`,
            turns: 10,
          }),
        ),
      );
    }

    const result = await collectIndex(
      root,
      { since: "2026-09-01", until: "2026-10-31", folder: null },
      { maxRows: 3 },
    );

    expect(result.matched).toBe(total);
    expect(result.rows.map((r) => r.session)).toEqual([
      "sess-cap-4",
      "sess-cap-3",
      "sess-cap-2",
    ]);
    expect(result.omitted).toBe(2);
    expect(result.totals.sessions).toBe(total);
    expect(result.totals.turns).toBe(50);
  });

  it("counts recurring improvement rules once per session and tracks act levels", async () => {
    const root = await newRoot();

    const ledger1 = makeMinimalLedger({
      session: "sess-1",
      to: "2026-10-02T10:00:00.000Z",
      improvements: [
        {
          rule: "cost-concentration",
          level: "watch",
          destination: "orchestration-config",
        },
        {
          rule: "cost-concentration",
          level: "act",
          destination: "orchestration-config",
        },
        {
          rule: "guardrail-answers",
          level: "watch",
          destination: "permission-setup",
        },
      ],
    });
    await publishTestLedger(root, "sess-1", "cp-1", JSON.stringify(ledger1));

    const ledger2 = makeMinimalLedger({
      session: "sess-2",
      to: "2026-10-03T10:00:00.000Z",
      improvements: [
        {
          rule: "cost-concentration",
          level: "watch",
          destination: "orchestration-config",
        },
      ],
    });
    await publishTestLedger(root, "sess-2", "cp-2", JSON.stringify(ledger2));

    const query: IndexQuery = {
      since: "2026-10-01",
      until: "2026-10-10",
      folder: null,
    };
    const result = await collectIndex(root, query);

    expect(result.recurring).toHaveLength(2);
    expect(result.recurring[0]).toEqual({
      rule: "cost-concentration",
      destination: "orchestration-config",
      sessions: 2,
      actSessions: 1,
    });
    expect(result.recurring[1]).toEqual({
      rule: "guardrail-answers",
      destination: "permission-setup",
      sessions: 1,
      actSessions: 0,
    });
  });

  it("calculates totals over all matched sessions before row cap", async () => {
    const root = await newRoot();

    const ledger1 = makeMinimalLedger({
      session: "sess-t1",
      to: "2026-10-02T10:00:00.000Z",
      turns: 20,
      costCents: 300,
      denied: 2,
      improvements: [{ rule: "guardrail-answers", level: "act" }],
    });
    await publishTestLedger(root, "sess-t1", "cp-1", JSON.stringify(ledger1));

    const ledger2 = makeMinimalLedger({
      session: "sess-t2",
      to: "2026-10-03T10:00:00.000Z",
      turns: 15,
      costCents: 250,
      denied: 1,
      improvements: [
        { rule: "guardrail-answers", level: "act" },
        { rule: "cost-concentration", level: "watch" },
      ],
    });
    await publishTestLedger(root, "sess-t2", "cp-2", JSON.stringify(ledger2));

    const query: IndexQuery = {
      since: "2026-10-01",
      until: "2026-10-10",
      folder: null,
    };
    const result = await collectIndex(root, query);

    expect(result.totals).toEqual({
      sessions: 2,
      turns: 35,
      costCents: 550,
      act: 2,
      denied: 3,
    });
  });

  it("resolves relative reportHref safely without path traversal", async () => {
    const root = await newRoot();
    const ledger = makeMinimalLedger({
      session: "sess-href",
      to: "2026-10-05T10:00:00.000Z",
    });
    await publishTestLedger(
      root,
      "sess-href",
      "cp-1",
      JSON.stringify(ledger),
      "<!doctype html><html><body>Report Body</body></html>",
    );

    const query: IndexQuery = {
      since: "2026-10-01",
      until: "2026-10-10",
      folder: null,
    };
    const result = await collectIndex(root, query);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.reportHref).not.toBeNull();
    expect(row.reportHref).toMatch(
      /^sessions\/[a-f0-9]{32}\/generations\/[0-9]{6}-[a-f0-9]{12}\/report\.html$/,
    );
    expect(row.reportHref?.includes("..")).toBe(false);
  });
});

describe("renderIndexHtml", () => {
  it("escapes hostile titles, folders, and inputs against XSS and prohibits script tags and external URLs", () => {
    const hostileResult: IndexResult = {
      query: {
        since: "2026-10-01",
        until: "2026-10-10",
        folder: "<script>alert('folder')</script>",
      },
      rows: [
        {
          session: "sess-hostile-12345",
          sessionShort: "sess-hos",
          day: "2026-10-05",
          from: "2026-10-01T00:00:00Z",
          to: "2026-10-05T12:00:00Z",
          folderName: "<img src=x onerror=alert(1)>",
          folderParent: "<script>hack()</script>",
          branch: "feat/<xss>",
          title: "<script>alert('title')</script>",
          outcome: "2 commits",
          turns: 10,
          costCents: 100,
          act: 1,
          watch: 0,
          denied: 0,
          generations: 3,
          reportHref: "sessions/abc/generations/000001/report.html",
        },
      ],
      matched: 1,
      omitted: 0,
      storeSessions: 1,
      newestDay: "2026-10-05",
      unreadable: 0,
      totals: {
        sessions: 1,
        turns: 10,
        costCents: 100,
        act: 1,
        denied: 0,
      },
      recurring: [
        {
          rule: "guardrail-answers",
          destination: "permission-setup",
          sessions: 1,
          actSessions: 1,
        },
      ],
    };

    const html = renderIndexHtml(hostileResult);

    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("http://");
    expect(html).not.toContain("https://");

    expect(html).toContain(
      "&lt;script&gt;alert(&#39;title&#39;)&lt;/script&gt;",
    );
    expect(html).toContain(
      "&lt;script&gt;hack()&lt;/script&gt;/&lt;img src=x onerror=alert(1)&gt;",
    );
    expect(html).toContain("feat/&lt;xss&gt;");
    expect(html).toContain(
      "<i>&lt;script&gt;alert(&#39;title&#39;)&lt;/script&gt;</i> (+2 earlier)",
    );
  });

  it("renders only the newest month as open and older months collapsed", () => {
    const multiMonthResult: IndexResult = {
      query: { since: "2026-08-01", until: "2026-10-31", folder: null },
      rows: [
        {
          session: "s-oct",
          sessionShort: "s-oct",
          day: "2026-10-02",
          from: "2026-10-01",
          to: "2026-10-02T12:00:00Z",
          folderName: "repo",
          folderParent: null,
          branch: "main",
          title: "Oct Session",
          outcome: "1 commit",
          turns: 5,
          costCents: 50,
          act: 0,
          watch: 0,
          denied: 0,
          generations: 1,
          reportHref: null,
        },
        {
          session: "s-sep",
          sessionShort: "s-sep",
          day: "2026-09-15",
          from: "2026-09-01",
          to: "2026-09-15T12:00:00Z",
          folderName: "repo",
          folderParent: null,
          branch: "main",
          title: "Sep Session",
          outcome: "1 commit",
          turns: 5,
          costCents: 50,
          act: 0,
          watch: 0,
          denied: 0,
          generations: 1,
          reportHref: null,
        },
      ],
      matched: 2,
      omitted: 0,
      storeSessions: 2,
      newestDay: "2026-10-02",
      unreadable: 0,
      totals: { sessions: 2, turns: 10, costCents: 100, act: 0, denied: 0 },
      recurring: [],
    };

    const html = renderIndexHtml(multiMonthResult);

    expect(html).toContain(
      '<details class="sec" open>\n<summary><h3>2026-10</h3>',
    );
    expect(html).toContain('<details class="sec">\n<summary><h3>2026-09</h3>');
    expect(html).not.toContain(
      '<details class="sec" open>\n<summary><h3>2026-09</h3>',
    );
  });

  it("renders empty range text with store status when no rows match", () => {
    const emptyResult: IndexResult = {
      query: { since: "2026-10-01", until: "2026-10-10", folder: null },
      rows: [],
      matched: 0,
      omitted: 0,
      storeSessions: 4,
      newestDay: "2026-09-20",
      unreadable: 1,
      totals: { sessions: 0, turns: 0, costCents: 0, act: 0, denied: 0 },
      recurring: [],
    };

    const html = renderIndexHtml(emptyResult);

    expect(html).toContain(
      "No reports in this range. The store holds 4 sessions; the newest ended on 2026-09-20.",
    );
    expect(html).toContain("<b>0</b>");
    expect(html).toContain("<b>$0.00 est.</b>");
    expect(html).toContain(
      "1 stored report could not be read (older format or damaged).",
    );
    expect(html).toContain(
      "Narrow or widen with: ags retrospective index --since YYYY-MM-DD --until YYYY-MM-DD --folder NAME",
    );
    expect(html).not.toContain('<details class="sec"');
  });

  it("displays omitted notice when matched exceeds displayed rows", () => {
    const omittedResult: IndexResult = {
      query: { since: "2026-10-01", until: "2026-10-10", folder: null },
      rows: [
        {
          session: "s1",
          sessionShort: "s1",
          day: "2026-10-05",
          from: "2026-10-01",
          to: "2026-10-05T12:00:00Z",
          folderName: "repo",
          folderParent: null,
          branch: "main",
          title: "S1",
          outcome: "1 commit",
          turns: 5,
          costCents: 50,
          act: 0,
          watch: 0,
          denied: 0,
          generations: 1,
          reportHref: null,
        },
      ],
      matched: 250,
      omitted: 249,
      storeSessions: 300,
      newestDay: "2026-10-05",
      unreadable: 0,
      totals: {
        sessions: 250,
        turns: 1000,
        costCents: 50000,
        act: 10,
        denied: 5,
      },
      recurring: [],
    };

    const html = renderIndexHtml(omittedResult);
    expect(html).toContain(
      "Showing 1 of 250 sessions in this range, newest first. Narrow the range to see the rest.",
    );
  });

  it("is purely deterministic given identical inputs", () => {
    const sampleResult: IndexResult = {
      query: { since: "2026-10-01", until: "2026-10-10", folder: "repo" },
      rows: [
        {
          session: "sess-abc",
          sessionShort: "sess-abc",
          day: "2026-10-05",
          from: "2026-10-01T00:00:00Z",
          to: "2026-10-05T12:00:00Z",
          folderName: "repo",
          folderParent: "workspace",
          branch: "feat",
          title: "My Feature",
          outcome: "3 commits",
          turns: 12,
          costCents: 240,
          act: 1,
          watch: 2,
          denied: 1,
          generations: 2,
          reportHref: "sessions/abc/generations/000002/report.html",
        },
      ],
      matched: 1,
      omitted: 0,
      storeSessions: 1,
      newestDay: "2026-10-05",
      unreadable: 0,
      totals: { sessions: 1, turns: 12, costCents: 240, act: 1, denied: 1 },
      recurring: [
        {
          rule: "cost-concentration",
          destination: "orchestration-config",
          sessions: 1,
          actSessions: 1,
        },
      ],
    };

    const run1 = renderIndexHtml(sampleResult);
    const run2 = renderIndexHtml(sampleResult);
    expect(run1).toBe(run2);
  });
});

describe("writeIndex", () => {
  it("writes index.html privately and atomically without disturbing store listings or limits", async () => {
    const root = await newRoot();
    const ledger = makeMinimalLedger({
      session: "sess-write-check",
      to: "2026-10-05T10:00:00.000Z",
    });
    await publishTestLedger(
      root,
      "sess-write-check",
      "cp-1",
      JSON.stringify(ledger),
    );

    const beforeListing = await listPublished(root);
    expect(beforeListing.entries).toHaveLength(3); // summary, ledger, html

    await assertStoreCapacity(root, 0);

    const htmlContent = "<!doctype html><html><body>Index File</body></html>";
    const writtenPath = await writeIndex(root, htmlContent);

    expect(path.isAbsolute(writtenPath)).toBe(true);
    expect(writtenPath).toBe(path.join(root, "index.html"));

    const content = await fs.readFile(writtenPath, "utf8");
    expect(content).toBe(htmlContent);

    const stats = await fs.stat(writtenPath);
    if (process.platform !== "win32") {
      const mode = stats.mode & 0o777;
      expect(mode & 0o077).toBe(0); // owner-only
    }

    const afterListing = await listPublished(root);
    expect(afterListing.entries).toEqual(beforeListing.entries);

    // Generations count and store operations remain unaffected
    await assertStoreCapacity(root, 0);

    // Overwriting atomically works
    const newHtml = "<!doctype html><html><body>Updated Index</body></html>";
    const rewrittenPath = await writeIndex(root, newHtml);
    expect(rewrittenPath).toBe(writtenPath);
    expect(await fs.readFile(rewrittenPath, "utf8")).toBe(newHtml);
  });
});
