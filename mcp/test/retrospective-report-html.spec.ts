import { describe, expect, it } from "vitest";
import type { LedgerImprovement } from "../src/retrospective/improvements";
import type { Claim, Ledger, LedgerAgent } from "../src/retrospective/ledger";
import type { ReportContext, SessionRates } from "../src/retrospective/trend";
import {
  escapeHtml,
  formatMoney,
  formatRate,
  formatTokensK,
  plural,
} from "../src/retrospective/views/format";
import {
  formatTokensCompact,
  type LedgerDay,
  type LedgerFolder,
  type LedgerLookups,
  type LedgerModel,
  type LedgerOutcome,
  type LedgerPermissionCommand,
  type LedgerPermissionRequests,
  type LedgerPermissionRow,
  type LedgerToolRow,
  renderReportHtml,
} from "../src/retrospective/views/report-html";

const BASE_SCOPE = {
  nodes: [{ hostId: "local", sessionId: "main" }],
  from: "2026-10-01T10:00:00.000Z",
  to: "2026-10-01T11:00:00.000Z",
};

function createClaim(
  template: Claim["template"],
  values: Record<string, number | string>,
): Claim {
  return {
    id: `c_${template}`,
    type: "observation",
    template,
    values,
    scope: BASE_SCOPE,
    coverage: "complete",
    supporting: [],
    contradicting: [],
    basedOn: [],
  };
}

function createLedgerFixture(
  overrides: Partial<Ledger> & {
    label?: string | null;
    models?: LedgerModel[];
    days?: LedgerDay[];
    toolRows?: LedgerToolRow[];
    outcome?: LedgerOutcome;
    folder?: LedgerFolder | null;
    lookups?: LedgerLookups | null;
    permissionRequests?: LedgerPermissionRequests | null;
  } = {},
): Ledger {
  return {
    schemaVersion: 1,
    cutoff: "2026-10-01T12:00:00.000Z",
    session: "01a167e1",
    label: null,
    models: [],
    days: [],
    toolRows: [],
    outcome: { source: "unavailable", reason: "not-measured" },
    evidenceMode: "native-files",
    rootVerification: "unverified-root",
    coverage: "complete",
    counts: {
      sessions: 1,
      fullyRead: 1,
      skippedLines: 0,
      agentsCreated: 0,
      sessionsLinked: 1,
      unlinkedAgents: 0,
    },
    skillUsage: null,
    hostSkills: null,
    cells: [],
    agents: [],
    otherAgents: null,
    improvements: [],
    claims: [],
    evidence: {},
    permissionRequests: null,
    ...overrides,
  } as unknown as Ledger;
}

describe("format helpers", () => {
  it("plural handles standard nouns and custom irregular plurals", () => {
    expect(plural(1, "apple")).toBe("1 apple");
    expect(plural(2, "apple")).toBe("2 apples");
    expect(plural(0, "apple")).toBe("0 apples");
    expect(plural(1, "child", "children")).toBe("1 child");
    expect(plural(3, "child", "children")).toBe("3 children");
  });

  it("formatMoney formats cents to dollars", () => {
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(1234)).toBe("$12.34");
    expect(formatMoney(50)).toBe("$0.50");
    expect(formatMoney(5000)).toBe("$50.00");
  });

  it("formatTokensK rounds to thousands with k suffix", () => {
    expect(formatTokensK(0)).toBe("0k");
    expect(formatTokensK(999)).toBe("1k");
    expect(formatTokensK(12345)).toBe("12k");
    expect(formatTokensK(50000)).toBe("50k");
  });

  it("formatRate divides tenths by 10 with 1 decimal place", () => {
    expect(formatRate(0)).toBe("0.0");
    expect(formatRate(15)).toBe("1.5");
    expect(formatRate(100)).toBe("10.0");
  });

  it("escapeHtml replaces &, <, >, \", and '", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml("<tag>")).toBe("&lt;tag&gt;");
    expect(escapeHtml('"quote"')).toBe("&quot;quote&quot;");
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("formatTokensCompact formats numbers into compact k and M strings", () => {
    expect(formatTokensCompact(0)).toBe("0");
    expect(formatTokensCompact(-5)).toBe("0");
    expect(formatTokensCompact(500)).toBe("500");
    expect(formatTokensCompact(1000)).toBe("1k");
    expect(formatTokensCompact(1500)).toBe("1.5k");
    expect(formatTokensCompact(456000)).toBe("456k");
    expect(formatTokensCompact(12300000)).toBe("12.3M");
  });
});

describe("renderReportHtml", () => {
  it("produces deterministic output for a given ledger", () => {
    const ledger = createLedgerFixture({
      folder: { name: "repo", parent: "workspace" },
      claims: [
        createClaim("coverage", { agentsCreated: 2, agentsRead: 2 }),
        createClaim("cost-drivers", {
          turnsMain: 10,
          costCentsMain: 250,
          turnsOthers: 2,
          costCentsOthers: 50,
        }),
      ],
    });

    const out1 = renderReportHtml(ledger);
    const out2 = renderReportHtml(ledger);
    expect(out1).toBe(out2);
  });

  it("includes CSP meta and doctype, and contains no raw script or external http resources", () => {
    const ledger = createLedgerFixture();
    const html = renderReportHtml(ledger);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain(
      "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'\">",
    );
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
    );
    expect(html).toContain("<title>Agent retrospective</title>");
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/https?:\/\//i);
  });

  describe("header section", () => {
    it("renders title line when label is present", () => {
      const ledger = createLedgerFixture({
        label: "Refactor database migrations",
      });
      const html = renderReportHtml(ledger);

      expect(html).toContain(
        '<p class="title">Title: Refactor database migrations <span class="soft">(agent-supplied, unverified)</span></p>',
      );
    });

    it("omits title line when label is null", () => {
      const ledger = createLedgerFixture({ label: null });
      const html = renderReportHtml(ledger);

      expect(html).not.toContain("Title:");
      expect(html).not.toContain("(agent-supplied, unverified)");
    });

    it("renders branch now with branch name when git outcome has branch", () => {
      const ledger = createLedgerFixture({
        outcome: {
          source: "git",
          branch: "feat/mcp-native-retrospective",
          commits: 3,
          revertCommits: 0,
          mergeCommits: 0,
          filesChanged: 5,
          insertions: 120,
          deletions: 30,
          windowFrom: "2026-10-01T10:00:00.000Z",
          windowTo: "2026-10-01T11:00:00.000Z",
        },
      });
      const html = renderReportHtml(ledger);
      expect(html).toContain("Branch now: feat/mcp-native-retrospective");
    });

    it("renders detached HEAD when git outcome has null branch", () => {
      const ledger = createLedgerFixture({
        outcome: {
          source: "git",
          branch: null,
          commits: 1,
          revertCommits: 0,
          mergeCommits: 0,
          filesChanged: 1,
          insertions: 5,
          deletions: 0,
          windowFrom: "2026-10-01T10:00:00.000Z",
          windowTo: "2026-10-01T11:00:00.000Z",
        },
      });
      const html = renderReportHtml(ledger);
      expect(html).toContain("Branch now: detached HEAD");
    });

    it("renders branch not recorded when outcome is unavailable", () => {
      const ledger = createLedgerFixture({
        outcome: { source: "unavailable", reason: "not-a-repo" },
      });
      const html = renderReportHtml(ledger);
      expect(html).toContain("branch not recorded");
      expect(html).not.toContain("Branch now:");
    });
  });

  describe("decisions for you section", () => {
    it("renders decisions right after tiles with exact fixed sentences per rule", () => {
      const imps: LedgerImprovement[] = [
        {
          rule: "guardrail-answers",
          level: "act",
          destination: "permission-setup",
          audience: "manager",
          claimIds: ["c1"],
          evidence: ["e1"],
          values: {},
        },
        {
          rule: "cost-concentration",
          level: "watch",
          destination: "orchestration-config",
          audience: "manager",
          claimIds: ["c2"],
          evidence: ["e2"],
          values: {},
        },
        {
          rule: "unguarded-edits",
          level: "act",
          destination: "agent-routing",
          audience: "manager",
          claimIds: ["c3"],
          evidence: ["e3"],
          values: {},
        },
        {
          rule: "human-intervention",
          level: "watch",
          destination: "permission-setup",
          audience: "manager",
          claimIds: ["c4"],
          evidence: ["e4"],
          values: {},
        },
        {
          rule: "agent-error-concentration",
          level: "act",
          destination: "provider-route-monitoring",
          audience: "manager",
          claimIds: ["c5"],
          evidence: ["e5"],
          values: {},
        },
        {
          rule: "lookup-misses",
          level: "watch",
          destination: "agent-routing",
          audience: "manager",
          claimIds: ["c6"],
          evidence: ["e6"],
          values: {},
        },
      ];
      const ledger = createLedgerFixture({ improvements: imps });
      const html = renderReportHtml(ledger);

      expect(html).toContain("<h3>Decisions for you</h3>");
      expect(html).toContain(
        "Decide: allowlist the repeated safe requests, or tighten what workers may ask for?",
      );
      expect(html).toContain(
        "Decide: split the orchestrator session and hand reads and edits to workers, or accept the cost?",
      );
      expect(html).toContain(
        "Decide: require a file lookup before edits in the worker brief?",
      );
      expect(html).toContain(
        "Decide: which asks and aborts the setup should answer without a human?",
      );
      expect(html).toContain(
        "Decide: check the provider route before the next run?",
      );
      expect(html).toContain(
        "Decide: fix the trigger words and file patterns of the skills these lookups missed?",
      );

      // Verify position: after tiles, before do next
      const tilesIdx = html.indexOf('<div class="tiles">');
      const decisionsIdx = html.indexOf("<h3>Decisions for you</h3>");
      const doNextIdx = html.indexOf("<h3>Do next</h3>");
      expect(tilesIdx).toBeGreaterThan(-1);
      expect(decisionsIdx).toBeGreaterThan(tilesIdx);
      expect(doNextIdx).toBeGreaterThan(decisionsIdx);
    });

    it("omits decisions section when no manager improvements exist", () => {
      const ledger = createLedgerFixture({ improvements: [] });
      const html = renderReportHtml(ledger);

      expect(html).not.toContain("<h3>Decisions for you</h3>");
    });
  });

  describe("tile colour rules", () => {
    it("renders plain tiles when conditions for red and amber are not met", () => {
      const ledger = createLedgerFixture({
        claims: [
          createClaim("permission-answers", {
            answers: 5,
            allow: 5,
            deny: 0,
            askCalls: 0,
          }),
          createClaim("coverage", { agentsCreated: 4, agentsRead: 4 }),
          createClaim("cost-drivers", {
            costCentsMain: 4000,
            costCentsOthers: 1000,
          }),
        ],
      });
      const html = renderReportHtml(ledger);
      expect(html).not.toContain("tile red");
      expect(html).not.toContain("tile amber");
    });

    it("marks permission tile red when deny > 0", () => {
      const ledger = createLedgerFixture({
        claims: [
          createClaim("permission-answers", {
            answers: 2,
            allow: 1,
            deny: 1,
            askCalls: 1,
          }),
        ],
      });
      const html = renderReportHtml(ledger);
      expect(html).toMatch(
        /<div class="tile red"><span>Permission answers<\/span>/,
      );
    });

    it("marks coverage tile red when observed * 4 < created (and created > 0)", () => {
      const ledger = createLedgerFixture({
        claims: [
          createClaim("coverage", {
            agentsCreated: 10,
            agentsRead: 2, // 2 * 4 = 8 < 10 -> red
          }),
        ],
      });
      const html = renderReportHtml(ledger);
      expect(html).toMatch(/<div class="tile red"><span>Coverage<\/span>/);
    });

    it("marks cost tile amber when main share >= 90% and cost > $50", () => {
      const ledger = createLedgerFixture({
        claims: [
          createClaim("cost-drivers", {
            costCentsMain: 5500, // $55.00 > $50
            costCentsOthers: 0, // 100% >= 90%
            turnsMain: 20,
            turnsOthers: 0,
          }),
        ],
      });
      const html = renderReportHtml(ledger);
      expect(html).toMatch(
        /<div class="tile amber"><span>Estimated cost<\/span>/,
      );
    });

    it("keeps cost tile plain when cost > $50 but main share < 90%", () => {
      const ledger = createLedgerFixture({
        claims: [
          createClaim("cost-drivers", {
            costCentsMain: 6000,
            costCentsOthers: 4000, // 60% < 90%
            turnsMain: 20,
            turnsOthers: 10,
          }),
        ],
      });
      const html = renderReportHtml(ledger);
      expect(html).not.toMatch(
        /<div class="tile amber"><span>Estimated cost<\/span>/,
      );
    });
  });

  describe("improvement cards exact wording and new rows", () => {
    it("renders guardrail-answers card with Change, Next time, and Unknown", () => {
      const imp: LedgerImprovement = {
        rule: "guardrail-answers",
        level: "act",
        destination: "permission-setup",
        audience: "manager",
        claimIds: ["c1"],
        evidence: ["e1"],
        values: {
          answers: 4,
          allow: 3,
          deny: 1,
          targetsAtLeast3: 1,
          per100Tenths: 15,
        },
      };
      const ledger = createLedgerFixture({ improvements: [imp] });
      const html = renderReportHtml(ledger);

      expect(html).toContain("Permission answers: 4 (3 allowed, 1 denied)");
      expect(html).toContain(
        "the orchestrator answered 4 permission requests; 1 agents were answered 3 or more times; 1 were denials.",
      );
      expect(html).toContain(
        "Change (permission setup): add repeated safe requests to the allowlist (allowed answers show setup gaps) and check what each denial asked for (denials show rule violations).",
      );
      expect(html).toContain(
        "Next time: permission answers per 100 turns (now 1.5).",
      );
      expect(html).toContain(
        "Unknown: whether each command was safe: read the commands in Permission requests.",
      );
    });

    it("renders cost-concentration card with Change, Next time, and Unknown", () => {
      const imp: LedgerImprovement = {
        rule: "cost-concentration",
        level: "watch",
        destination: "orchestration-config",
        audience: "manager",
        claimIds: ["c2"],
        evidence: ["e2"],
        values: {
          sharePercent: 85,
          cacheReadPerTurnMain: 120000,
          cacheReadPerTurnOthers: 30000,
          compactionsMain: 1,
          mainReadCalls: 50,
          mainEditCalls: 10,
          mainCoordinationCalls: 25,
        },
      };
      const ledger = createLedgerFixture({ improvements: [imp] });
      const html = renderReportHtml(ledger);

      expect(html).toContain("Main agent carries 85% of observed cost");
      expect(html).toContain(
        "main runs at 120k cached tokens per turn (workers 30k) with 1 compactions; it made 50 reads, 10 edits and 25 coordination calls itself.",
      );
      expect(html).toContain(
        "Change (orchestration config): check whether those reads and edits could be delegated; consider a turn limit per session and a cost alert.",
      );
      expect(html).toContain(
        "Next time: cached tokens per main turn (now 120k).",
      );
      expect(html).toContain(
        "Unknown: why the main kept the work and whether the spend was worth it.",
      );
    });

    it("renders unguarded-edits card with Change, Next time, and Unknown", () => {
      const imp: LedgerImprovement = {
        rule: "unguarded-edits",
        level: "act",
        destination: "agent-routing",
        audience: "manager",
        claimIds: ["c3"],
        evidence: ["e3"],
        values: {
          unguardedEdits: 5,
          editEpisodes: 10,
          byFilesTotal: 2,
          getSkillTotal: 1,
          unguardedPercent: 50,
        },
      };
      const ledger = createLedgerFixture({ improvements: [imp] });
      const html = renderReportHtml(ledger);

      expect(html).toContain("5 of 10 edits ran without a file lookup");
      expect(html).toContain(
        "edit and file-write calls with no load_skills_for_files by the same agent since its last compaction; 2 file lookups vs 1 lookups by name.",
      );
      expect(html).toContain(
        "Change (AGS routing): check the router trigger and the brief given to agents that edit files.",
      );
      expect(html).toContain("Next time: unguarded edit share (now 50%).");
      expect(html).toContain(
        "Unknown: whether the edited files needed a skill.",
      );
    });

    it("renders lookup-misses card with Change, Next time, and Unknown", () => {
      const imp: LedgerImprovement = {
        rule: "lookup-misses",
        level: "watch",
        destination: "agent-routing",
        audience: "manager",
        claimIds: ["c4"],
        evidence: ["e4"],
        values: {
          calls: 20,
          noMatchCalls: 8,
          percent: 40,
          filesNoMatch: 5,
          keywordsNoMatch: 3,
        },
      };
      const ledger = createLedgerFixture({ improvements: [imp] });
      const html = renderReportHtml(ledger);

      expect(html).toContain("8 of 20 lookups matched nothing");
      expect(html).toContain(
        "AGS returned no skill for 40% of lookups (5 by file, 3 by keyword).",
      );
      expect(html).toContain(
        "Change (AGS routing): check the trigger words and file patterns of the skills these lookups should have found, and the file types the lookups were for.",
      );
      expect(html).toContain(
        "Next time: lookups that matched nothing (now 40%).",
      );
      expect(html).toContain(
        "Unknown: which file types the empty lookups were for.",
      );
    });

    it("renders human-intervention card with Change, Next time, and Unknown", () => {
      const imp: LedgerImprovement = {
        rule: "human-intervention",
        level: "watch",
        destination: "permission-setup",
        audience: "manager",
        claimIds: ["c5"],
        evidence: ["e5"],
        values: {
          askCalls: 3,
          abortedStops: 1,
          per100Tenths: 20,
        },
      };
      const ledger = createLedgerFixture({ improvements: [imp] });
      const html = renderReportHtml(ledger);

      expect(html).toContain("Human interventions: 3 asks, 1 aborted stops");
      expect(html).toContain(
        "the agents asked a human or were stopped by one 2.0 times per 100 turns.",
      );
      expect(html).toContain(
        "Change (permission setup): check which of those decisions the setup could take without asking.",
      );
      expect(html).toContain(
        "Next time: asks and aborts per 100 turns (now 2.0).",
      );
      expect(html).toContain("Unknown: what each ask or abort was about.");
    });

    it("renders agent-error-concentration card with Change, Next time, and Unknown", () => {
      const imp: LedgerImprovement = {
        rule: "agent-error-concentration",
        level: "act",
        destination: "provider-route-monitoring",
        audience: "manager",
        claimIds: ["c6"],
        evidence: ["e6"],
        values: {
          agents: 2,
          worstErrorStops: 5,
          worstTurns: 8,
        },
      };
      const ledger = createLedgerFixture({ improvements: [imp] });
      const html = renderReportHtml(ledger);

      expect(html).toContain(
        "2 agents ended at least half their turns in an error",
      );
      expect(html).toContain("the worst: 5 of 8 turns.");
      expect(html).toContain(
        "Change (provider route monitoring): read the error category of those records before changing any routing.",
      );
      expect(html).toContain(
        "Next time: agents above half error turns (now 2).",
      );
      expect(html).toContain("Unknown: the error category behind each stop.");
    });

    it("renders maintainer improvements", () => {
      const imps: LedgerImprovement[] = [
        {
          rule: "coverage-gap",
          level: "watch",
          destination: "session-linkage",
          audience: "maintainer",
          claimIds: ["m1"],
          evidence: ["me1"],
          values: { unlinkedAgents: 4, agentsCreated: 6 },
        },
        {
          rule: "tracker-not-measured",
          level: "watch",
          destination: "tracker-binding",
          audience: "maintainer",
          claimIds: ["m2"],
          evidence: ["me2"],
          values: {},
        },
      ];
      const ledger = createLedgerFixture({ improvements: imps });
      const html = renderReportHtml(ledger);

      expect(html).toContain("For the maintainer");
      expect(html).toContain(
        "4 of 6 created agents have no session file read; Paseo agent sessions cannot be linked from the session file alone (session-linkage).",
      );
      expect(html).toContain(
        "Server tracker numbers cover this process only, so lookups that matched nothing and bodies returned are not measured for this session (tracker-binding).",
      );
    });
  });

  describe("permission requests section", () => {
    it("omits permission requests section when permissionRequests is null", () => {
      const ledger = createLedgerFixture({ permissionRequests: null });
      const html = renderReportHtml(ledger);

      expect(html).not.toContain("<h3>Permission requests</h3>");
      expect(html).not.toContain("By tool");
      expect(html).not.toContain("By program (bash)");
    });

    it("renders permission requests section between Do next and Outcome when present", () => {
      const permReqs: LedgerPermissionRequests = {
        asked: 8,
        answered: 7,
        unanswered: 1,
        answeredWithoutRequest: 0,
        agentsAsked: 2,
        tools: [
          {
            name: "bash",
            asked: 5,
            allow: 4,
            deny: 1,
            other: 0,
            unanswered: 0,
          },
          {
            name: "edit",
            asked: 3,
            allow: 2,
            deny: 0,
            other: 0,
            unanswered: 1,
          },
        ],
        programs: [
          {
            name: "git",
            asked: 5,
            allow: 4,
            deny: 1,
            other: 0,
            unanswered: 0,
          },
        ],
        distinctPrograms: 1,
        commands: [],
        distinctCommands: 0,
        commandsOmitted: 0,
      };
      const ledger = createLedgerFixture({ permissionRequests: permReqs });
      const html = renderReportHtml(ledger);

      const doNextIndex = html.indexOf("<h3>Do next</h3>");
      const permReqIndex = html.indexOf("<h3>Permission requests</h3>");
      const outcomeIndex = html.indexOf("<h3>Outcome</h3>");

      expect(doNextIndex).toBeGreaterThan(-1);
      expect(permReqIndex).toBeGreaterThan(doNextIndex);
      expect(outcomeIndex).toBeGreaterThan(permReqIndex);
    });

    it("renders intro paragraph, headline line, and footer sentence verbatim", () => {
      const permReqs: LedgerPermissionRequests = {
        asked: 10,
        answered: 9,
        unanswered: 1,
        answeredWithoutRequest: 0,
        agentsAsked: 3,
        tools: [
          {
            name: "bash",
            asked: 10,
            allow: 8,
            deny: 1,
            other: 0,
            unanswered: 1,
          },
        ],
        programs: [
          {
            name: "npm",
            asked: 10,
            allow: 8,
            deny: 1,
            other: 0,
            unanswered: 1,
          },
        ],
        distinctPrograms: 1,
        commands: [],
        distinctCommands: 0,
        commandsOmitted: 0,
      };
      const ledger = createLedgerFixture({
        permissionRequests: permReqs,
        claims: [
          createClaim("permission-requests", {
            asked: 10,
            answered: 9,
            unanswered: 1,
            answeredWithoutRequest: 0,
            agentsAsked: 3,
            bashAsked: 10,
            distinctPrograms: 1,
            allowed: 8,
            denied: 1,
            otherVerdict: 0,
          }),
        ],
      });
      const html = renderReportHtml(ledger);

      expect(html).toContain(
        "<p>What agents asked permission for, and what was answered. Commands are shown as recorded, after best-effort removal of secrets (tokens, keys, passwords, credentials in URLs). Review before sharing this report.</p>",
      );
      expect(html).toContain(
        "<p>10 requests from 3 agents; 9 answered (8 allowed, 1 denied), 1 unanswered.</p>",
      );
      expect(html).toContain(
        "<p>Programs are the first word of the command (after wrappers such as rtk proxy and env). Redaction is best effort: check the commands before sharing this report.</p>",
      );
      expect(html).not.toContain("the command text is not read");
      expect(html).not.toContain("sudo, sh and bash hide the real command");
    });

    it("pluralises headline for singular and plural counts", () => {
      const permReqsSingle: LedgerPermissionRequests = {
        asked: 1,
        answered: 1,
        unanswered: 0,
        answeredWithoutRequest: 0,
        agentsAsked: 1,
        tools: [
          {
            name: "bash",
            asked: 1,
            allow: 1,
            deny: 0,
            other: 0,
            unanswered: 0,
          },
        ],
        programs: [],
        distinctPrograms: 0,
        commands: [],
        distinctCommands: 0,
        commandsOmitted: 0,
      };
      const htmlSingle = renderReportHtml(
        createLedgerFixture({ permissionRequests: permReqsSingle }),
      );
      expect(htmlSingle).toContain(
        "<p>1 request from 1 agent; 1 answered (1 allowed, 0 denied), 0 unanswered.</p>",
      );

      const permReqsPlural: LedgerPermissionRequests = {
        asked: 2,
        answered: 2,
        unanswered: 0,
        answeredWithoutRequest: 0,
        agentsAsked: 3,
        tools: [
          {
            name: "bash",
            asked: 2,
            allow: 2,
            deny: 0,
            other: 0,
            unanswered: 0,
          },
        ],
        programs: [],
        distinctPrograms: 0,
        commands: [],
        distinctCommands: 0,
        commandsOmitted: 0,
      };
      const htmlPlural = renderReportHtml(
        createLedgerFixture({ permissionRequests: permReqsPlural }),
      );
      expect(htmlPlural).toContain(
        "<p>2 requests from 3 agents; 2 answered (2 allowed, 0 denied), 0 unanswered.</p>",
      );
    });

    it("renders By tool table with Tool, Asked, Allowed, Denied, Other, Unanswered headers and row values", () => {
      const permReqs: LedgerPermissionRequests = {
        asked: 6,
        answered: 6,
        unanswered: 0,
        answeredWithoutRequest: 0,
        agentsAsked: 1,
        tools: [
          {
            name: "bash",
            asked: 4,
            allow: 3,
            deny: 1,
            other: 0,
            unanswered: 0,
          },
          {
            name: "other",
            asked: 2,
            allow: 1,
            deny: 0,
            other: 1,
            unanswered: 0,
          },
        ],
        programs: [],
        distinctPrograms: 0,
        commands: [],
        distinctCommands: 0,
        commandsOmitted: 0,
      };
      const ledger = createLedgerFixture({ permissionRequests: permReqs });
      const html = renderReportHtml(ledger);

      expect(html).toContain("<h4>By tool</h4>");
      expect(html).toContain(
        "<tr>\n<th>Tool</th>\n<th>Asked</th>\n<th>Allowed</th>\n<th>Denied</th>\n<th>Other</th>\n<th>Unanswered</th>\n</tr>",
      );
      expect(html).toContain(
        "<tr><td>bash</td><td>4</td><td>3</td><td>1</td><td>0</td><td>0</td></tr>",
      );
      expect(html).toContain(
        "<tr><td>other</td><td>2</td><td>1</td><td>0</td><td>1</td><td>0</td></tr>",
      );
    });

    it("renders By program (bash) table with rounded Allowed share %", () => {
      const permReqs: LedgerPermissionRequests = {
        asked: 7,
        answered: 7,
        unanswered: 0,
        answeredWithoutRequest: 0,
        agentsAsked: 1,
        tools: [
          {
            name: "bash",
            asked: 7,
            allow: 5,
            deny: 2,
            other: 0,
            unanswered: 0,
          },
        ],
        programs: [
          {
            name: "git",
            asked: 3,
            allow: 2, // 2/3 = 66.666...% -> 67%
            deny: 1,
            other: 0,
            unanswered: 0,
          },
          {
            name: "curl",
            asked: 3,
            allow: 1, // 1/3 = 33.333...% -> 33%
            deny: 1,
            other: 1,
            unanswered: 0,
          },
          {
            name: "other",
            asked: 1,
            allow: 1, // 1/1 = 100%
            deny: 0,
            other: 0,
            unanswered: 0,
          },
        ],
        distinctPrograms: 3,
        commands: [],
        distinctCommands: 0,
        commandsOmitted: 0,
      };

      const ledger = createLedgerFixture({ permissionRequests: permReqs });
      const html = renderReportHtml(ledger);

      expect(html).toContain("<h4>By program (bash)</h4>");
      expect(html).toContain(
        "<tr>\n<th>Program</th>\n<th>Asked</th>\n<th>Allowed</th>\n<th>Denied</th>\n<th>Other</th>\n<th>Unanswered</th>\n<th>Allowed share %</th>\n</tr>",
      );
      expect(html).toContain(
        "<tr><td>git</td><td>3</td><td>2</td><td>1</td><td>0</td><td>0</td><td>67%</td></tr>",
      );
      expect(html).toContain(
        "<tr><td>curl</td><td>3</td><td>1</td><td>1</td><td>1</td><td>0</td><td>33%</td></tr>",
      );
      expect(html).toContain(
        "<tr><td>other</td><td>1</td><td>1</td><td>0</td><td>0</td><td>0</td><td>100%</td></tr>",
      );
    });

    it("renders allowlist candidates sentence when asked >= 5, deny === 0, and allow > 0 capped at 5 programs", () => {
      const permReqs: LedgerPermissionRequests = {
        asked: 35,
        answered: 35,
        unanswered: 0,
        answeredWithoutRequest: 0,
        agentsAsked: 2,
        tools: [],
        programs: [
          { name: "p1", asked: 5, allow: 5, deny: 0, other: 0, unanswered: 0 },
          { name: "p2", asked: 6, allow: 6, deny: 0, other: 0, unanswered: 0 },
          { name: "p3", asked: 7, allow: 7, deny: 0, other: 0, unanswered: 0 },
          { name: "p4", asked: 8, allow: 8, deny: 0, other: 0, unanswered: 0 },
          { name: "p5", asked: 9, allow: 9, deny: 0, other: 0, unanswered: 0 },
          {
            name: "p6",
            asked: 10,
            allow: 10,
            deny: 0,
            other: 0,
            unanswered: 0,
          },
        ],
        distinctPrograms: 6,
        commands: [],
        distinctCommands: 0,
        commandsOmitted: 0,
      };
      const ledger = createLedgerFixture({ permissionRequests: permReqs });
      const html = renderReportHtml(ledger);

      expect(html).toContain(
        "<p>Programs with repeated allowed requests (5 or more, none denied) are allowlist candidates: p1, p2, p3, p4, p5.</p>",
      );
      expect(html).not.toContain("p6.");
    });

    it("omits allowlist candidates sentence when no program has asked >= 5 with deny === 0 and allow > 0", () => {
      const permReqs: LedgerPermissionRequests = {
        asked: 6,
        answered: 6,
        unanswered: 0,
        answeredWithoutRequest: 0,
        agentsAsked: 1,
        tools: [],
        programs: [
          // asked < 5
          { name: "p1", asked: 4, allow: 4, deny: 0, other: 0, unanswered: 0 },
          // asked >= 5 but deny > 0
          { name: "p2", asked: 5, allow: 4, deny: 1, other: 0, unanswered: 0 },
          // asked >= 5 but allow === 0
          { name: "p3", asked: 5, allow: 0, deny: 0, other: 5, unanswered: 0 },
        ],
        distinctPrograms: 3,
        commands: [],
        distinctCommands: 0,
        commandsOmitted: 0,
      };
      const ledger = createLedgerFixture({ permissionRequests: permReqs });
      const html = renderReportHtml(ledger);

      expect(html).not.toContain("allowlist candidates");
    });

    it("renders denied requests sentence when any program has deny > 0 capped at 5 programs", () => {
      const permReqs: LedgerPermissionRequests = {
        asked: 12,
        answered: 12,
        unanswered: 0,
        answeredWithoutRequest: 0,
        agentsAsked: 2,
        tools: [],
        programs: [
          { name: "d1", asked: 2, allow: 1, deny: 1, other: 0, unanswered: 0 },
          { name: "d2", asked: 2, allow: 1, deny: 1, other: 0, unanswered: 0 },
          { name: "d3", asked: 2, allow: 1, deny: 1, other: 0, unanswered: 0 },
          { name: "d4", asked: 2, allow: 1, deny: 1, other: 0, unanswered: 0 },
          { name: "d5", asked: 2, allow: 1, deny: 1, other: 0, unanswered: 0 },
          { name: "d6", asked: 2, allow: 1, deny: 1, other: 0, unanswered: 0 },
        ],
        distinctPrograms: 6,
        commands: [],
        distinctCommands: 0,
        commandsOmitted: 0,
      };
      const ledger = createLedgerFixture({ permissionRequests: permReqs });
      const html = renderReportHtml(ledger);

      expect(html).toContain(
        "<p>Denied requests show where the setup said no; read them before widening the allowlist: d1, d2, d3, d4, d5.</p>",
      );
      expect(html).not.toContain("d6.");
    });

    it("omits denied requests sentence when no program has deny > 0", () => {
      const permReqs: LedgerPermissionRequests = {
        asked: 5,
        answered: 5,
        unanswered: 0,
        answeredWithoutRequest: 0,
        agentsAsked: 1,
        tools: [],
        programs: [
          { name: "ok1", asked: 5, allow: 5, deny: 0, other: 0, unanswered: 0 },
        ],
        distinctPrograms: 1,
        commands: [],
        distinctCommands: 0,
        commandsOmitted: 0,
      };
      const ledger = createLedgerFixture({ permissionRequests: permReqs });
      const html = renderReportHtml(ledger);

      expect(html).not.toContain(
        "Denied requests show where the setup said no; read them before widening the allowlist",
      );
    });

    it("renders answeredWithoutRequest line when > 0 and omits when 0", () => {
      const permReqsWithUnmatched: LedgerPermissionRequests = {
        asked: 2,
        answered: 2,
        unanswered: 0,
        answeredWithoutRequest: 3,
        agentsAsked: 1,
        tools: [],
        programs: [],
        distinctPrograms: 0,
        commands: [],
        distinctCommands: 0,
        commandsOmitted: 0,
      };
      const htmlWith = renderReportHtml(
        createLedgerFixture({ permissionRequests: permReqsWithUnmatched }),
      );
      expect(htmlWith).toContain(
        "<p>3 answers had no matching request in this session file (answered through a pending-permissions list).</p>",
      );

      const permReqsZero: LedgerPermissionRequests = {
        ...permReqsWithUnmatched,
        answeredWithoutRequest: 0,
      };
      const htmlWithout = renderReportHtml(
        createLedgerFixture({ permissionRequests: permReqsZero }),
      );
      expect(htmlWithout).not.toContain(
        "had no matching request in this session file",
      );
    });

    it("escapes hostile tool and program names across tables and lists", () => {
      const hostileToolName = '<b>tool<script>alert("tool")</script></b>';
      const hostileProgramCandidate = 'cand<script>alert("cand")</script>&"\'';
      const hostileProgramDenied = 'deny<script>alert("deny")</script>';

      const permReqs: LedgerPermissionRequests = {
        asked: 10,
        answered: 10,
        unanswered: 0,
        answeredWithoutRequest: 0,
        agentsAsked: 1,
        tools: [
          {
            name: hostileToolName,
            asked: 5,
            allow: 5,
            deny: 0,
            other: 0,
            unanswered: 0,
          },
        ],
        programs: [
          {
            name: hostileProgramCandidate,
            asked: 6,
            allow: 6,
            deny: 0,
            other: 0,
            unanswered: 0,
          },
          {
            name: hostileProgramDenied,
            asked: 2,
            allow: 0,
            deny: 2,
            other: 0,
            unanswered: 0,
          },
        ],
        distinctPrograms: 2,
        commands: [],
        distinctCommands: 0,
        commandsOmitted: 0,
      };
      const ledger = createLedgerFixture({ permissionRequests: permReqs });
      const html = renderReportHtml(ledger);

      expect(html).not.toMatch(/<script>/i);
      expect(html).toContain(
        "&lt;b&gt;tool&lt;script&gt;alert(&quot;tool&quot;)&lt;/script&gt;&lt;/b&gt;",
      );
      expect(html).toContain(
        "cand&lt;script&gt;alert(&quot;cand&quot;)&lt;/script&gt;&amp;&quot;&#39;",
      );
      expect(html).toContain(
        "deny&lt;script&gt;alert(&quot;deny&quot;)&lt;/script&gt;",
      );
    });
    it("omits Requests to review table when commands is empty", () => {
      const permReqs: LedgerPermissionRequests = {
        asked: 5,
        answered: 5,
        unanswered: 0,
        answeredWithoutRequest: 0,
        agentsAsked: 1,
        tools: [
          {
            name: "bash",
            asked: 5,
            allow: 5,
            deny: 0,
            other: 0,
            unanswered: 0,
          },
        ],
        programs: [],
        distinctPrograms: 0,
        commands: [],
        distinctCommands: 0,
        commandsOmitted: 0,
      };
      const html = renderReportHtml(
        createLedgerFixture({ permissionRequests: permReqs }),
      );

      expect(html).not.toContain("<h4>Requests to review</h4>");
      expect(html).not.toContain("distinct requests; denied ones come first");
      expect(html).not.toContain("had no command text recorded");
    });

    it("renders Requests to review table with Verdicts, Asked, Tool, Command columns", () => {
      const commands: LedgerPermissionCommand[] = [
        {
          text: "git status",
          tool: "bash",
          kind: "tool",
          asked: 5,
          allow: 4,
          deny: 1,
          other: 0,
          unanswered: 0,
        },
        {
          text: "npm test",
          tool: "bash",
          kind: "tool",
          asked: 3,
          allow: 2,
          deny: 0,
          other: 1,
          unanswered: 0,
        },
        {
          text: "curl https://example.com",
          tool: "bash",
          kind: "tool",
          asked: 2,
          allow: 0,
          deny: 1,
          other: 0,
          unanswered: 1,
        },
        {
          text: "Deploy to staging?",
          tool: "OMP select",
          kind: "question",
          asked: 7,
          allow: 3,
          deny: 1,
          other: 2,
          unanswered: 1,
        },
      ];

      const permReqs: LedgerPermissionRequests = {
        asked: 17,
        answered: 15,
        unanswered: 2,
        answeredWithoutRequest: 0,
        agentsAsked: 2,
        tools: [],
        programs: [],
        distinctPrograms: 0,
        commands,
        distinctCommands: 4,
        commandsOmitted: 0,
      };
      const html = renderReportHtml(
        createLedgerFixture({ permissionRequests: permReqs }),
      );

      expect(html).toContain("<h4>Requests to review</h4>");
      expect(html).toContain(
        "<tr>\n<th>Verdicts</th>\n<th>Asked</th>\n<th>Tool</th>\n<th>Command</th>\n</tr>",
      );
      // Verdicts formatting: <allow> allowed, <deny> denied plus , <other> other and , <unanswered> unanswered only when non-zero
      expect(html).toContain("<td>4 allowed, 1 denied</td>");
      expect(html).toContain("<td>2 allowed, 0 denied, 1 other</td>");
      expect(html).toContain("<td>0 allowed, 1 denied, 1 unanswered</td>");
      expect(html).toContain(
        "<td>3 allowed, 1 denied, 2 other, 1 unanswered</td>",
      );
      // Asked column
      expect(html).toContain("<td>5</td>");
      expect(html).toContain("<td>7</td>");
      // Tool column: tool when kind === "tool", tool (kind) when kind !== "tool"
      expect(html).toContain("<td>bash</td>");
      expect(html).toContain("<td>OMP select (question)</td>");
      // Command cell: <pre class="cmd"> with text
      expect(html).toContain('<pre class="cmd">git status</pre>');
      expect(html).toContain('<pre class="cmd">Deploy to staging?</pre>');
    });

    it("preserves ledger order and applies denied row styling", () => {
      const commands: LedgerPermissionCommand[] = [
        {
          text: "denied command 1",
          tool: "bash",
          kind: "tool",
          asked: 2,
          allow: 0,
          deny: 2,
          other: 0,
          unanswered: 0,
        },
        {
          text: "denied command 2",
          tool: "bash",
          kind: "tool",
          asked: 3,
          allow: 2,
          deny: 1,
          other: 0,
          unanswered: 0,
        },
        {
          text: "allowed command 3",
          tool: "bash",
          kind: "tool",
          asked: 1,
          allow: 1,
          deny: 0,
          other: 0,
          unanswered: 0,
        },
      ];

      const permReqs: LedgerPermissionRequests = {
        asked: 6,
        answered: 6,
        unanswered: 0,
        answeredWithoutRequest: 0,
        agentsAsked: 1,
        tools: [],
        programs: [],
        distinctPrograms: 0,
        commands,
        distinctCommands: 3,
        commandsOmitted: 0,
      };
      const html = renderReportHtml(
        createLedgerFixture({ permissionRequests: permReqs }),
      );

      // Ledger order preserved
      const idx1 = html.indexOf("denied command 1");
      const idx2 = html.indexOf("denied command 2");
      const idx3 = html.indexOf("allowed command 3");
      expect(idx1).toBeGreaterThan(-1);
      expect(idx2).toBeGreaterThan(idx1);
      expect(idx3).toBeGreaterThan(idx2);

      // Denied rows have class="denied", allowed row does not
      expect(html).toContain(
        '<tr class="denied"><td>0 allowed, 2 denied</td><td>2</td><td>bash</td><td><pre class="cmd">denied command 1</pre></td></tr>',
      );
      expect(html).toContain(
        '<tr class="denied"><td>2 allowed, 1 denied</td><td>3</td><td>bash</td><td><pre class="cmd">denied command 2</pre></td></tr>',
      );
      expect(html).toContain(
        '<tr><td>1 allowed, 0 denied</td><td>1</td><td>bash</td><td><pre class="cmd">allowed command 3</pre></td></tr>',
      );
    });

    it("escapes hostile command text, tool, and kind while preserving full text and newlines", () => {
      const longCommand =
        "<script>alert(1)</script> & \"test\" 'quotes' <tag>\nline2: " +
        "a".repeat(400) +
        "\nline3: done";

      const commands: LedgerPermissionCommand[] = [
        {
          text: longCommand,
          tool: '<b>tool<script>alert("t")</script></b>',
          kind: "<kind>&\"'",
          asked: 1,
          allow: 1,
          deny: 0,
          other: 0,
          unanswered: 0,
        },
      ];

      const permReqs: LedgerPermissionRequests = {
        asked: 1,
        answered: 1,
        unanswered: 0,
        answeredWithoutRequest: 0,
        agentsAsked: 1,
        tools: [],
        programs: [],
        distinctPrograms: 0,
        commands,
        distinctCommands: 1,
        commandsOmitted: 0,
      };
      const html = renderReportHtml(
        createLedgerFixture({ permissionRequests: permReqs }),
      );

      expect(html).not.toMatch(/<script>/i);
      expect(html).toContain(
        "&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;test&quot; &#39;quotes&#39; &lt;tag&gt;\nline2: " +
          "a".repeat(400) +
          "\nline3: done",
      );
      // Tool and kind escaped with kind in parentheses
      expect(html).toContain(
        "&lt;b&gt;tool&lt;script&gt;alert(&quot;t&quot;)&lt;/script&gt;&lt;/b&gt; (&lt;kind&gt;&amp;&quot;&#39;)",
      );
      // Ensure <pre class="cmd"> surrounds the command
      expect(html).toContain(
        '<pre class="cmd">&lt;script&gt;alert(1)&lt;/script&gt;',
      );
    });

    it("renders Showing n of m and no command text recorded lines when applicable and omits when not", () => {
      const commands: LedgerPermissionCommand[] = [
        {
          text: "cmd1",
          tool: "bash",
          kind: "tool",
          asked: 1,
          allow: 1,
          deny: 0,
          other: 0,
          unanswered: 0,
        },
        {
          text: "cmd2",
          tool: "bash",
          kind: "tool",
          asked: 1,
          allow: 1,
          deny: 0,
          other: 0,
          unanswered: 0,
        },
      ];

      // Case A: distinctCommands > commands.length and commandsOmitted > 0
      const permReqsA: LedgerPermissionRequests = {
        asked: 5,
        answered: 5,
        unanswered: 0,
        answeredWithoutRequest: 0,
        agentsAsked: 1,
        tools: [],
        programs: [],
        distinctPrograms: 0,
        commands,
        distinctCommands: 5,
        commandsOmitted: 3,
      };
      const htmlA = renderReportHtml(
        createLedgerFixture({ permissionRequests: permReqsA }),
      );

      expect(htmlA).toContain(
        "<p>Showing 2 of 5 distinct requests; denied ones come first.</p>",
      );
      expect(htmlA).toContain(
        "<p>3 requests had no command text recorded.</p>",
      );

      // Case B: distinctCommands === commands.length and commandsOmitted === 0
      const permReqsB: LedgerPermissionRequests = {
        asked: 2,
        answered: 2,
        unanswered: 0,
        answeredWithoutRequest: 0,
        agentsAsked: 1,
        tools: [],
        programs: [],
        distinctPrograms: 0,
        commands,
        distinctCommands: 2,
        commandsOmitted: 0,
      };
      const htmlB = renderReportHtml(
        createLedgerFixture({ permissionRequests: permReqsB }),
      );

      expect(htmlB).not.toContain("distinct requests; denied ones come first");
      expect(htmlB).not.toContain("had no command text recorded");
    });

    it("includes CSS for pre.cmd and denied row left border in style block", () => {
      const ledger = createLedgerFixture();
      const html = renderReportHtml(ledger);

      expect(html).toContain(
        "pre.cmd{white-space:pre-wrap;word-break:break-word;margin:0;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;max-width:70ch;text-align:left}",
      );
      expect(html).toContain("tr.denied{border-left:3px solid var(--red)}");
      expect(html).toContain(
        "tr.denied td:first-child{border-left:3px solid var(--red)}",
      );
    });
  });

  describe("outcome section", () => {
    it("renders git outcome table and caveat sentence when source is git", () => {
      const outcome: LedgerOutcome = {
        source: "git",
        branch: "main",
        commits: 5,
        revertCommits: 1,
        mergeCommits: 2,
        filesChanged: 14,
        insertions: 350,
        deletions: 120,
        windowFrom: "2026-10-01T08:00:00.000Z",
        windowTo: "2026-10-01T12:00:00.000Z",
      };
      const ledger = createLedgerFixture({ outcome });
      const html = renderReportHtml(ledger);

      expect(html).toContain("<h3>Outcome</h3>");
      expect(html).toContain("<th>Commits</th>");
      expect(html).toContain("<th>Merge commits</th>");
      expect(html).toContain("<th>Reverts</th>");
      expect(html).toContain("<th>Files changed</th>");
      expect(html).toContain("<th>Insertions (+)</th>");
      expect(html).toContain("<th>Deletions (-)</th>");
      expect(html).toContain("<th>Window</th>");

      expect(html).toContain("<td>5</td>");
      expect(html).toContain("<td>2</td>");
      expect(html).toContain("<td>1</td>");
      expect(html).toContain("<td>14</td>");
      expect(html).toContain("<td>+350</td>");
      expect(html).toContain("<td>-120</td>");
      expect(html).toContain(
        "<td>2026-10-01T08:00:00.000Z to 2026-10-01T12:00:00.000Z</td>",
      );
      expect(html).toContain(
        "Commits are counted across all branches of the repository in the session window and may include other work; the branch is the current one, not necessarily the session's.",
      );
    });

    it("renders exact sentence for each unavailable reason", () => {
      const reasons: Array<[LedgerOutcome["reason"], string]> = [
        [
          "folder-missing",
          "The session's folder no longer exists, so no git outcome could be read.",
        ],
        ["not-a-repo", "The folder is not a git repository."],
        ["git-error", "Git could not be read safely for this folder."],
        ["not-measured", "Outcome was not measured for this run."],
      ];

      for (const [reason, sentence] of reasons) {
        const ledger = createLedgerFixture({
          outcome: { source: "unavailable", reason },
        });
        const html = renderReportHtml(ledger);
        expect(html).toContain("<h3>Outcome</h3>");
        expect(html).toContain(`<p>${sentence}</p>`);
      }
    });
  });

  describe("timeline section", () => {
    it("renders timeline table with inline CSS bar based on max turns", () => {
      const days: LedgerDay[] = [
        { day: "2026-10-01", turns: 20, costCents: 500, errorStops: 1 },
        { day: "2026-10-02", turns: 10, costCents: 250, errorStops: 0 },
      ];
      const ledger = createLedgerFixture({ days });
      const html = renderReportHtml(ledger);

      expect(html).toContain("<h3>Timeline</h3>");
      expect(html).toContain("<th>Day</th>");
      expect(html).toContain("<th>Turns</th>");
      expect(html).toContain("<th>Cost</th>");
      expect(html).toContain("<th>Error stops</th>");

      expect(html).toContain("<td>2026-10-01</td>");
      expect(html).toContain(
        '<td>20 <span class="bar" style="width:100%"></span></td>',
      );
      expect(html).toContain("<td>$5.00 est.</td>");
      expect(html).toContain("<td>1</td>");

      expect(html).toContain("<td>2026-10-02</td>");
      expect(html).toContain(
        '<td>10 <span class="bar" style="width:50%"></span></td>',
      );
      expect(html).toContain("<td>$2.50 est.</td>");
      expect(html).toContain("<td>0</td>");
    });

    it("renders a one-line note when days count exceeds 31", () => {
      const days: LedgerDay[] = [];
      for (let i = 1; i <= 35; i++) {
        days.push({
          day: `2026-10-${String(i).padStart(2, "0")}`,
          turns: 5,
          costCents: 100,
          errorStops: 0,
        });
      }
      const ledger = createLedgerFixture({ days });
      const html = renderReportHtml(ledger);

      expect(html).toContain(
        '<p class="mt">Session spans 35 days (more than 31 days; all rows shown).</p>',
      );
    });

    it("omits the > 31 days note when days count is <= 31", () => {
      const days: LedgerDay[] = [
        { day: "2026-10-01", turns: 5, costCents: 100, errorStops: 0 },
      ];
      const ledger = createLedgerFixture({ days });
      const html = renderReportHtml(ledger);

      expect(html).not.toContain("more than 31 days");
    });
  });

  describe("cost and models section", () => {
    it("renders main-vs-workers table and models breakdown table with total row", () => {
      const models: LedgerModel[] = [
        {
          model: "claude-3-5-sonnet",
          turns: 30,
          costCents: 450,
          inputTokens: 12300000,
          outputTokens: 456000,
          cacheReadTokens: 5000000,
          errorStops: 1,
        },
        {
          model: "gemini-1.5-pro",
          turns: 10,
          costCents: 150,
          inputTokens: 2000000,
          outputTokens: 100000,
          cacheReadTokens: 1000000,
          errorStops: 0,
        },
      ];
      const ledger = createLedgerFixture({
        models,
        claims: [
          createClaim("cost-drivers", {
            turnsMain: 25,
            costCentsMain: 400,
            turnsOthers: 15,
            costCentsOthers: 200,
            cacheReadPerTurnMain: 100000,
            cacheReadPerTurnOthers: 20000,
            compactionsMain: 0,
            mainReadCalls: 10,
            mainEditCalls: 5,
            mainBashCalls: 2,
            mainCoordinationCalls: 8,
            costCentsMainReads: 150,
            costCentsMainCoordination: 100,
          }),
        ],
      });
      const html = renderReportHtml(ledger);

      expect(html).toContain("<h3>Cost and models</h3>");
      expect(html).toContain("<th>Metric</th>");
      expect(html).toContain("<th>Main</th>");
      expect(html).toContain("<th>Workers</th>");

      expect(html).toContain("<th>Model</th>");
      expect(html).toContain("<th>Input tokens</th>");
      expect(html).toContain("<th>Output tokens</th>");
      expect(html).toContain("<th>Cached tokens</th>");

      // Model 1
      expect(html).toContain("<td>claude-3-5-sonnet</td>");
      expect(html).toContain("<td>12.3M</td>");
      expect(html).toContain("<td>456k</td>");
      expect(html).toContain("<td>5M</td>");

      // Model 2
      expect(html).toContain("<td>gemini-1.5-pro</td>");
      expect(html).toContain("<td>2M</td>");
      expect(html).toContain("<td>100k</td>");
      expect(html).toContain("<td>1M</td>");

      // Total row
      expect(html).toContain(
        '<tr class="total"><td>Total</td><td>40</td><td>$6.00 est.</td><td>14.3M</td><td>556k</td><td>6M</td><td>1</td></tr>',
      );
    });
  });

  describe("tool failures section", () => {
    it("renders tool failures table and summary line from tool-errors claim", () => {
      const toolRows: LedgerToolRow[] = [
        { tool: "bash", calls: 20, errors: 4 },
        { tool: "read_file", calls: 50, errors: 2 },
      ];
      const ledger = createLedgerFixture({
        toolRows,
        claims: [
          createClaim("tool-errors", {
            failedToolCalls: 6,
            toolCalls: 70,
          }),
        ],
      });
      const html = renderReportHtml(ledger);

      expect(html).toContain("<h3>Tool failures</h3>");
      expect(html).toContain("<p>6 of 70 tool calls returned an error.</p>");
      expect(html).toContain(
        "<td>bash</td><td>20</td><td>4</td><td>20.0%</td>",
      );
      expect(html).toContain(
        "<td>read_file</td><td>50</td><td>2</td><td>4.0%</td>",
      );
    });

    it("omits tool failures section when toolRows is empty", () => {
      const ledger = createLedgerFixture({ toolRows: [] });
      const html = renderReportHtml(ledger);

      expect(html).not.toContain("<h3>Tool failures</h3>");
    });
  });

  describe("error stops section", () => {
    it("renders top cells by error stops with chips and explanation sentence", () => {
      const ledger = createLedgerFixture({
        cells: [
          {
            key: "2026-10-01|gpt-4o",
            turns: 10,
            errorStops: 4, // rate 40% (turns >= 5) -> highest rate
          },
          {
            key: "2026-10-01|claude-3-opus",
            turns: 20,
            errorStops: 6, // 6 stops -> most stops, rate 30%
          },
          {
            key: "2026-10-02|claude-3-sonnet",
            turns: 15,
            errorStops: 2,
          },
          {
            key: "2026-10-02|zero-errors-model",
            turns: 5,
            errorStops: 0, // should not be listed
          },
        ],
      });
      const html = renderReportHtml(ledger);

      expect(html).toContain("<h3>Error stops</h3>");
      expect(html).toContain(
        "<p>Error stops are turns that ended in an error; the file records that, not why.</p>",
      );
      expect(html).toContain("<th>Day</th>");
      expect(html).toContain("<th>Model</th>");
      expect(html).toContain("<th>Error stops</th>");
      expect(html).toContain("<th>Turns</th>");
      expect(html).toContain("<th>Rate</th>");

      expect(html).toContain('<span class="chip act">most stops</span>');
      expect(html).toContain('<span class="chip watch">highest rate</span>');
      expect(html).not.toContain("zero-errors-model");
    });

    it("omits error stops section when no cells have errorStops > 0", () => {
      const ledger = createLedgerFixture({
        cells: [
          {
            key: "2026-10-01|claude-3-sonnet",
            turns: 10,
            errorStops: 0,
          },
        ],
      });
      const html = renderReportHtml(ledger);

      expect(html).not.toContain("<h3>Error stops</h3>");
    });
  });

  describe("AGS lookups and timing line", () => {
    it("renders skill-trigger-timing sentence when claim is present", () => {
      const toolNames: LedgerLookups["tools"][number]["tool"][] = [
        "load_skills_for_files",
        "load_skills_for_keywords",
        "get_skill",
        "get_workflow",
        "get_category_guide",
      ];
      const ledger = createLedgerFixture({
        claims: [
          createClaim("skill-trigger-timing", {
            mainCallsBeforeFirstSkillLoad: 4,
            sessionsWithSkillLoad: 2,
            measuredSessions: 3,
          }),
        ],
        lookups: {
          tools: toolNames.map((tool) => ({
            tool,
            calls: 0,
            noMatchCalls: 0,
            errorCalls: 0,
            bodiesReturned: 0,
            reusedBodies: 0,
            mainCalls: 0,
            workerCalls: 0,
          })),
          skills: [],
          distinctSkills: 0,
          otherSkillReturns: 0,
          unvalidatedReturns: 0,
          capped: false,
        },
      });
      const html = renderReportHtml(ledger);

      expect(html).toContain(
        "The main session made 4 other tool calls before its first skill lookup; 2 of 3 sessions looked a skill up.",
      );
    });

    it("omits skill-trigger-timing sentence when claim is absent", () => {
      const ledger = createLedgerFixture({ claims: [] });
      const html = renderReportHtml(ledger);

      expect(html).not.toContain(
        "other tool calls before its first skill lookup",
      );
    });
  });

  describe("trend section", () => {
    it("omits trend section when context is undefined or previous is empty", () => {
      const ledger = createLedgerFixture();
      expect(renderReportHtml(ledger)).not.toContain(
        "Compared with earlier reports for this folder",
      );
      expect(renderReportHtml(ledger, { previous: [] })).not.toContain(
        "Compared with earlier reports for this folder",
      );
    });

    it("renders trend table with 7 metric rows and up to 3 previous sessions", () => {
      const prev1: SessionRates = {
        session: "prev0001-session",
        to: "2026-09-30T15:00:00.000Z",
        turns: 40,
        costCentsPer100Turns: 1200,
        permissionAnswersPer100TurnsTenths: 25,
        errorStopsPer100TurnsTenths: 10,
        toolErrorsPer100CallsTenths: 5,
        lookupMissPercent: 20,
        compactionsPer100TurnsTenths: 0,
        unguardedEditPercent: 15,
      };
      const prev2: SessionRates = {
        session: "prev0002-session",
        to: "2026-09-29T12:00:00.000Z",
        turns: 30,
        costCentsPer100Turns: null,
        permissionAnswersPer100TurnsTenths: null,
        errorStopsPer100TurnsTenths: null,
        toolErrorsPer100CallsTenths: null,
        lookupMissPercent: null,
        compactionsPer100TurnsTenths: null,
        unguardedEditPercent: null,
      };
      const context: ReportContext = {
        previous: [prev1, prev2],
      };

      const ledger = createLedgerFixture({
        session: "curr0001-session",
        claims: [
          createClaim("coverage", { agentsCreated: 1, agentsRead: 1 }),
          createClaim("cost-drivers", {
            turnsMain: 20,
            costCentsMain: 500,
            turnsOthers: 0,
            costCentsOthers: 0,
          }),
        ],
      });

      const html = renderReportHtml(ledger, context);

      expect(html).toContain(
        "<h3>Compared with earlier reports for this folder</h3>",
      );
      expect(html).toContain(
        "<p>Earlier reports for the same folder; not necessarily the same task.</p>",
      );
      expect(html).toContain("<th>This session</th>");
      expect(html).toContain("<th>session prev0001 ending 2026-09-30</th>");
      expect(html).toContain("<th>session prev0002 ending 2026-09-29</th>");

      // 7 metrics
      expect(html).toContain("<td>Cost per 100 turns</td>");
      expect(html).toContain("<td>Permission answers per 100 turns</td>");
      expect(html).toContain("<td>Error stops per 100 turns</td>");
      expect(html).toContain("<td>Tool errors per 100 calls</td>");
      expect(html).toContain("<td>Lookups matching nothing</td>");
      expect(html).toContain("<td>Compactions per 100 turns</td>");
      expect(html).toContain("<td>Unguarded edits</td>");

      // Formatted values from prev1
      expect(html).toContain("<td>$12.00</td>");
      expect(html).toContain("<td>2.5</td>");
      expect(html).toContain("<td>1.0</td>");
      expect(html).toContain("<td>0.5</td>");
      expect(html).toContain("<td>20%</td>");
      expect(html).toContain("<td>0.0</td>");
      expect(html).toContain("<td>15%</td>");

      // Null values from prev2 formatted as n/a
      expect(html).toContain("<td>n/a</td>");
    });
  });

  describe("agents table", () => {
    it("renders agents table with main highlighted and otherAgents row", () => {
      const agents: LedgerAgent[] = [
        {
          label: "main",
          kind: "editing",
          model: "claude-3-opus",
          turns: 50,
          costCents: 1500,
          compactions: 1,
          cacheReadPerTurn: 40000,
          errorStops: 1,
          toolCalls: 100,
          toolErrors: 2,
          editCalls: 10,
          bashCalls: 20,
          readCalls: 30,
          agsLookups: 5,
          permissionAnswers: 3,
        },
        {
          label: "worker-1",
          kind: "read-only",
          model: "gemini-flash",
          turns: 10,
          costCents: 50,
          compactions: 0,
          cacheReadPerTurn: 15000,
          errorStops: 0,
          toolCalls: 15,
          toolErrors: 0,
          editCalls: 0,
          bashCalls: 0,
          readCalls: 10,
          agsLookups: 2,
          permissionAnswers: 0,
        },
      ];
      const otherAgents = { count: 3, turns: 12, costCents: 80 };

      const ledger = createLedgerFixture({ agents, otherAgents });
      const html = renderReportHtml(ledger);

      expect(html).toContain('<tr class="main"><td>main</td>');
      expect(html).toContain("<td>worker-1</td>");
      expect(html).toContain("<td>3 more agents</td>");
      expect(html).toContain("<td>$15.00</td>");
      expect(html).toContain("<td>40k</td>");
      expect(html).toContain("<td>2/100</td>");
      expect(html).toContain("<td>3</td>");
    });
  });

  describe("limits section", () => {
    it("renders all six limits bullets verbatim", () => {
      const ledger = createLedgerFixture();
      const html = renderReportHtml(ledger);

      expect(html).toContain("<h3>Limits</h3>");
      expect(html).toContain("Counts show where to look, not why.");
      expect(html).toContain(
        "Cost is a price-table estimate; call-share attribution is an estimate.",
      );
      expect(html).toContain(
        "Agents without a read session file are not covered.",
      );
      expect(html).toContain(
        "The root session is not verified against the host.",
      );
      expect(html).toContain(
        "AGS lookups are counted, not whether the rules were followed.",
      );
      expect(html).toContain(
        "Commit counts and the branch come from git at report time.",
      );
    });
  });

  describe("hostile string escaping across all sections", () => {
    it("escapes hostile strings in folder, model, skill id, agent label, title, branch, and tool", () => {
      const hostileFolder: LedgerFolder = {
        name: '<script>alert("folder")</script>',
        parent: "<b>parent</b>",
      };
      const hostileAgent: LedgerAgent = {
        label: '<script>alert("main")</script>',
        kind: "editing",
        model: "gpt-6<script>",
        turns: 5,
        costCents: 100,
        compactions: 0,
        cacheReadPerTurn: 1000,
        errorStops: 0,
        toolCalls: 5,
        toolErrors: 0,
        editCalls: 2,
        bashCalls: 1,
        readCalls: 2,
        agsLookups: 0,
        permissionAnswers: 0,
      };
      const hostileLookups: LedgerLookups = {
        tools: [
          {
            tool: "load_skills_for_files",
            calls: 1,
            noMatchCalls: 0,
            errorCalls: 0,
            bodiesReturned: 1,
            reusedBodies: 0,
            mainCalls: 1,
            workerCalls: 0,
          },
          {
            tool: "load_skills_for_keywords",
            calls: 0,
            noMatchCalls: 0,
            errorCalls: 0,
            bodiesReturned: 0,
            reusedBodies: 0,
            mainCalls: 0,
            workerCalls: 0,
          },
          {
            tool: "get_skill",
            calls: 0,
            noMatchCalls: 0,
            errorCalls: 0,
            bodiesReturned: 0,
            reusedBodies: 0,
            mainCalls: 0,
            workerCalls: 0,
          },
          {
            tool: "get_workflow",
            calls: 0,
            noMatchCalls: 0,
            errorCalls: 0,
            bodiesReturned: 0,
            reusedBodies: 0,
            mainCalls: 0,
            workerCalls: 0,
          },
          {
            tool: "get_category_guide",
            calls: 0,
            noMatchCalls: 0,
            errorCalls: 0,
            bodiesReturned: 0,
            reusedBodies: 0,
            mainCalls: 0,
            workerCalls: 0,
          },
        ],
        skills: [
          {
            id: 'test/<script>alert("skill")</script>',
            returns: 1,
            mainReturns: 1,
            workerReturns: 0,
          },
        ],
        distinctSkills: 1,
        otherSkillReturns: 0,
        unvalidatedReturns: 0,
        capped: false,
      };

      const ledger = createLedgerFixture({
        label: '<script>alert("label")</script>',
        outcome: {
          source: "git",
          branch: '<script>alert("branch")</script>',
          commits: 1,
          revertCommits: 0,
          mergeCommits: 0,
          filesChanged: 1,
          insertions: 1,
          deletions: 0,
          windowFrom: '<script>alert("from")</script>',
          windowTo: '<script>alert("to")</script>',
        },
        days: [
          {
            day: '<script>alert("day")</script>',
            turns: 5,
            costCents: 100,
            errorStops: 1,
          },
        ],
        models: [
          {
            model: '<script>alert("model")</script>',
            turns: 5,
            costCents: 100,
            inputTokens: 1000,
            outputTokens: 500,
            cacheReadTokens: 200,
            errorStops: 1,
          },
        ],
        toolRows: [
          {
            tool: '<script>alert("tool")</script>',
            calls: 10,
            errors: 2,
          },
        ],
        cells: [
          {
            key: '<script>alert("day")</script>|<script>alert("model")</script>',
            turns: 5,
            errorStops: 1,
          },
        ],
        folder: hostileFolder,
        agents: [hostileAgent],
        lookups: hostileLookups,
      });

      const html = renderReportHtml(ledger);
      expect(html).not.toMatch(/<script>/i);
      expect(html).toContain(
        "&lt;script&gt;alert(&quot;label&quot;)&lt;/script&gt;",
      );
      expect(html).toContain(
        "&lt;script&gt;alert(&quot;branch&quot;)&lt;/script&gt;",
      );
      expect(html).toContain(
        "&lt;script&gt;alert(&quot;folder&quot;)&lt;/script&gt;",
      );
      expect(html).toContain("&lt;b&gt;parent&lt;/b&gt;");
      expect(html).toContain(
        "&lt;script&gt;alert(&quot;main&quot;)&lt;/script&gt;",
      );
      expect(html).toContain("gpt-6&lt;script&gt;");
      expect(html).toContain(
        "test/&lt;script&gt;alert(&quot;skill&quot;)&lt;/script&gt;",
      );
      expect(html).toContain(
        "&lt;script&gt;alert(&quot;day&quot;)&lt;/script&gt;",
      );
      expect(html).toContain(
        "&lt;script&gt;alert(&quot;tool&quot;)&lt;/script&gt;",
      );
    });
  });

  describe("collapsible sections (SLICE F6)", () => {
    function createRichLedger(): { ledger: Ledger; context: ReportContext } {
      const imps: LedgerImprovement[] = [
        {
          rule: "guardrail-answers",
          level: "act",
          action: "tighten-routing",
          destination: "router-configuration",
          audience: "manager",
          claimIds: ["c1"],
          evidence: ["e1"],
          values: {
            answers: 4,
            allow: 3,
            deny: 1,
            targetsAtLeast3: 1,
            per100Tenths: 25,
          },
        },
        {
          rule: "coverage-gap",
          level: "watch",
          action: "read-sessions",
          destination: "session-linkage",
          audience: "maintainer",
          claimIds: ["m1"],
          evidence: ["me1"],
          values: { unlinkedAgents: 2, agentsCreated: 4 },
        },
        {
          rule: "tracker-not-measured",
          level: "watch",
          action: "bind-tracker",
          destination: "tracker-binding",
          audience: "maintainer",
          claimIds: ["m2"],
          evidence: ["me2"],
          values: {},
        },
      ];

      const permReqs: LedgerPermissionRequests = {
        asked: 5,
        agentsAsked: 2,
        answered: 4,
        unanswered: 1,
        answeredWithoutRequest: 0,
        tools: [
          {
            name: "bash",
            asked: 4,
            allow: 3,
            deny: 1,
            other: 0,
            unanswered: 0,
          },
          {
            name: "edit",
            asked: 1,
            allow: 0,
            deny: 0,
            other: 0,
            unanswered: 1,
          },
        ],
        programs: [
          { name: "git", asked: 4, allow: 3, deny: 1, other: 0, unanswered: 0 },
        ],
        commands: [
          {
            tool: "bash",
            kind: "tool",
            text: "git push",
            allow: 0,
            deny: 1,
            other: 0,
            unanswered: 0,
            asked: 1,
          },
        ],
        distinctCommands: 1,
        commandsOmitted: 0,
      };

      const outcome: LedgerOutcome = {
        source: "git",
        branch: "main",
        commits: 3,
        mergeCommits: 0,
        revertCommits: 0,
        filesChanged: 2,
        insertions: 50,
        deletions: 10,
        windowFrom: "2026-10-01T10:00:00.000Z",
        windowTo: "2026-10-01T11:00:00.000Z",
      };

      const days: LedgerDay[] = [
        { day: "2026-10-01", turns: 10, costCents: 500, errorStops: 1 },
        { day: "2026-10-02", turns: 5, costCents: 250, errorStops: 0 },
      ];

      const models: LedgerModel[] = [
        {
          model: "gpt-5.4",
          turns: 15,
          costCents: 750,
          inputTokens: 10000,
          outputTokens: 2000,
          cacheReadTokens: 50000,
          errorStops: 1,
        },
      ];

      const toolRows: LedgerToolRow[] = [{ tool: "bash", calls: 8, errors: 2 }];

      const cells = [{ key: "2026-10-01|gpt-5.4", errorStops: 1, turns: 10 }];

      const lookups: LedgerLookups = {
        tools: [
          {
            tool: "load_skills_for_files",
            calls: 6,
            noMatchCalls: 1,
            bodiesReturned: 5,
            reusedBodies: 0,
            errorCalls: 0,
            mainCalls: 6,
            workerCalls: 0,
          },
        ],
        skills: [
          {
            id: "typescript-language",
            returns: 5,
            mainReturns: 5,
            workerReturns: 0,
          },
        ],
        distinctSkills: 1,
        otherSkillReturns: 0,
        unvalidatedReturns: 0,
        capped: false,
      };

      const agents: LedgerAgent[] = [
        {
          label: "main",
          kind: "orchestrator",
          model: "gpt-5.4",
          turns: 15,
          costCents: 750,
          compactions: 0,
          cacheReadPerTurn: 3333,
          errorStops: 1,
          toolCalls: 10,
          toolErrors: 2,
          editCalls: 2,
          bashCalls: 4,
          readCalls: 4,
          agsLookups: 6,
          permissionAnswers: 4,
        },
      ];

      const ledger = createLedgerFixture({
        improvements: imps,
        permissionRequests: permReqs,
        outcome,
        days,
        models,
        toolRows,
        cells,
        lookups,
        agents,
        claims: [
          createClaim("coverage", { agentsCreated: 2, agentsRead: 2 }),
          createClaim("cost-drivers", {
            turnsMain: 15,
            costCentsMain: 750,
            turnsOthers: 0,
            costCentsOthers: 0,
            cacheReadPerTurnMain: 3333,
            cacheReadPerTurnOthers: 0,
            compactionsMain: 0,
            mainReadCalls: 4,
            mainEditCalls: 2,
            mainBashCalls: 4,
            mainCoordinationCalls: 0,
            costCentsMainReads: 100,
            costCentsMainCoordination: 0,
          }),
        ],
      });

      const context: ReportContext = {
        previous: [
          {
            session: "prev-1",
            from: "2026-09-30T10:00:00.000Z",
            to: "2026-09-30T11:00:00.000Z",
            costCentsPer100Turns: 400,
          },
        ],
      };

      return { ledger, context };
    }

    it("(a) renders smart auto-expanded flagged sections, deterministic section IDs, top TOC, and uncollapsed preamble", () => {
      const { ledger, context } = createRichLedger();
      const html = renderReportHtml(ledger, context);

      const detailsMatches = html.match(/<details class="sec" id="sec-[^"]+"/g);
      expect(detailsMatches).toBeDefined();
      expect(detailsMatches?.length).toBe(11);

      // Flagged sections in createRichLedger: permissions (denied/unanswered/act), tool failures (errors>0 + act), error stops (>0)
      expect(html).toContain('<details class="sec" id="sec-permissions" open>');
      expect(html).toContain('<details class="sec" id="sec-tools" open>');
      expect(html).toContain('<details class="sec" id="sec-errors" open>');

      // Unflagged / secondary sections remain collapsed
      expect(html).toContain('<details class="sec" id="sec-outcome">');
      expect(html).toContain('<details class="sec" id="sec-timeline">');
      expect(html).toContain('<details class="sec" id="sec-cost">');
      expect(html).toContain('<details class="sec" id="sec-lookups">');
      expect(html).toContain('<details class="sec" id="sec-trend">');
      expect(html).toContain('<details class="sec" id="sec-agents">');
      expect(html).toContain('<details class="sec" id="sec-limits">');
      expect(html).toContain('<details class="sec" id="sec-maintainer">');

      const navIdx = html.indexOf('<nav class="top-nav"');
      const firstDetailsIdx = html.indexOf("<details");
      const headerIdx = html.indexOf("<h1>Agent retrospective</h1>");
      const tilesIdx = html.indexOf('<div class="tiles">');
      const decisionsIdx = html.indexOf("<h3>Decisions for you</h3>");
      const doNextIdx = html.indexOf("<h3>Do next</h3>");

      expect(navIdx).toBeGreaterThan(-1);
      expect(headerIdx).toBeGreaterThan(navIdx);
      expect(tilesIdx).toBeGreaterThan(headerIdx);
      expect(decisionsIdx).toBeGreaterThan(tilesIdx);
      expect(doNextIdx).toBeGreaterThan(decisionsIdx);
      expect(doNextIdx).toBeLessThan(firstDetailsIdx);
    });

    it("shows a singular git outcome headline and drops the Agents headline when no agents were created", () => {
      const mainAgent: LedgerAgent = {
        label: "main",
        kind: "orchestrator",
        model: "gpt-5.4",
        turns: 4,
        costCents: 100,
        compactions: 0,
        cacheReadPerTurn: 1000,
        errorStops: 0,
        toolCalls: 3,
        toolErrors: 0,
        editCalls: 1,
        bashCalls: 1,
        readCalls: 1,
        agsLookups: 0,
        permissionAnswers: 0,
      };
      const ledger = createLedgerFixture({
        outcome: {
          source: "git",
          branch: "main",
          commits: 1,
          mergeCommits: 0,
          revertCommits: 0,
          filesChanged: 1,
          insertions: 3,
          deletions: 1,
          windowFrom: "2026-10-01T10:00:00.000Z",
          windowTo: "2026-10-01T12:00:00.000Z",
        },
        agents: [mainAgent],
        claims: [createClaim("coverage", { agentsCreated: 0, agentsRead: 0 })],
      });

      const html = renderReportHtml(ledger);

      expect(html).toContain(
        '<details class="sec" id="sec-outcome"><summary><h3>Outcome</h3><span class="sum">1 commit, 1 file changed</span></summary>',
      );
      expect(html).toContain(
        '<details class="sec" id="sec-agents"><summary><h3>Agents</h3></summary>',
      );
      expect(html).not.toContain("0 of 0");
    });

    it("(b) each section summary contains its exact headline string with plural variants and section id", () => {
      const { ledger, context } = createRichLedger();
      const html = renderReportHtml(ledger, context);

      expect(html).toContain(
        '<details class="sec" id="sec-permissions" open><summary><h3>Permission requests</h3><span class="sum">5 requests, 1 denied, 1 unanswered</span></summary>',
      );
      expect(html).toContain(
        '<details class="sec" id="sec-outcome"><summary><h3>Outcome</h3><span class="sum">3 commits, 2 files changed</span></summary>',
      );
      expect(html).toContain(
        '<details class="sec" id="sec-timeline"><summary><h3>Timeline</h3><span class="sum">2 days</span></summary>',
      );
      expect(html).toContain(
        '<details class="sec" id="sec-cost"><summary><h3>Cost and models</h3><span class="sum">$7.50 est., 1 model</span></summary>',
      );
      expect(html).toContain(
        '<details class="sec" id="sec-tools" open><summary><h3>Tool failures</h3><span class="sum">2 of 8 tool calls failed</span></summary>',
      );
      expect(html).toContain(
        '<details class="sec" id="sec-errors" open><summary><h3>Error stops</h3><span class="sum">1 error stop</span></summary>',
      );
      expect(html).toContain(
        '<details class="sec" id="sec-lookups"><summary><h3>AGS lookups</h3><span class="sum">6 lookups, 1 matched nothing</span></summary>',
      );
      expect(html).toContain(
        '<details class="sec" id="sec-trend"><summary><h3>Compared with earlier reports for this folder</h3><span class="sum">compared with 1 earlier report</span></summary>',
      );
      expect(html).toContain(
        '<details class="sec" id="sec-agents"><summary><h3>Agents</h3><span class="sum">2 of 2 agents observed</span></summary>',
      );
      expect(html).toContain(
        '<details class="sec" id="sec-limits"><summary><h3>Limits</h3></summary>',
      );
      expect(html).not.toMatch(/<summary><h3>Limits<\/h3><span class="sum">/);
      expect(html).toContain(
        '<details class="sec" id="sec-maintainer"><summary><h3 class="mt">For the maintainer</h3><span class="sum">2 items</span></summary>',
      );

      // Test plural variants:
      // Permission requests: 1 request
      const singleReqLedger = createLedgerFixture({
        permissionRequests: {
          asked: 1,
          agentsAsked: 1,
          answered: 1,
          unanswered: 0,
          answeredWithoutRequest: 0,
          tools: [
            {
              name: "bash",
              asked: 1,
              allow: 1,
              deny: 0,
              other: 0,
              unanswered: 0,
            },
          ],
          programs: [
            {
              name: "git",
              asked: 1,
              allow: 1,
              deny: 0,
              other: 0,
              unanswered: 0,
            },
          ],
          commands: [],
          distinctCommands: 0,
          commandsOmitted: 0,
        },
      });
      const singleReqHtml = renderReportHtml(singleReqLedger);
      expect(singleReqHtml).toContain(
        '<details class="sec" id="sec-permissions"><summary><h3>Permission requests</h3><span class="sum">1 request, 0 denied, 0 unanswered</span></summary>',
      );

      // Trend: 2 earlier reports
      const multiTrendContext: ReportContext = {
        previous: [
          {
            session: "s1",
            to: "2026-09-30T10:00:00.000Z",
            costCentsPer100Turns: 100,
          },
          {
            session: "s2",
            to: "2026-09-29T10:00:00.000Z",
            costCentsPer100Turns: 200,
          },
        ],
      };
      const multiTrendHtml = renderReportHtml(ledger, multiTrendContext);
      expect(multiTrendHtml).toContain(
        '<details class="sec" id="sec-trend"><summary><h3>Compared with earlier reports for this folder</h3><span class="sum">compared with 2 earlier reports</span></summary>',
      );

      // Outcome: unavailable short sentence reused as headline
      const unavailLedger = createLedgerFixture({
        outcome: { source: "unavailable", reason: "not-measured" },
      });
      const unavailHtml = renderReportHtml(unavailLedger);
      expect(unavailHtml).toContain(
        '<details class="sec" id="sec-outcome"><summary><h3>Outcome</h3><span class="sum">Outcome was not measured for this run.</span></summary>',
      );
    });

    it("(c) a section whose data is missing renders no <details> at all", () => {
      const emptyLedger = createLedgerFixture({
        permissionRequests: null,
        models: [],
        days: [],
        toolRows: [],
        cells: [],
        lookups: null,
        agents: [],
        improvements: [],
        claims: [],
      });
      const html = renderReportHtml(emptyLedger);

      expect(html).not.toContain("<h3>Permission requests</h3>");
      expect(html).not.toContain("<h3>Tool failures</h3>");
      expect(html).not.toContain("<h3>Error stops</h3>");
      expect(html).not.toContain("<h3>Cost and models</h3>");
      expect(html).not.toContain(
        "<h3>Compared with earlier reports for this folder</h3>",
      );
      expect(html).not.toContain("<h3>Agents</h3>");
      expect(html).not.toContain("For the maintainer");
    });

    it("(d) the hint line appears iff a collapsed section exists", () => {
      const { ledger, context } = createRichLedger();
      const html = renderReportHtml(ledger, context);

      const hintText =
        '<p class="hint">Flagged sections are expanded automatically; jump to any section above or click a title to expand or collapse.</p>';
      expect(html).toContain(hintText);

      const doNextIdx = html.indexOf("<h3>Do next</h3>");
      const hintIdx = html.indexOf(hintText);
      const firstDetailsIdx = html.indexOf("<details");

      expect(hintIdx).toBeGreaterThan(doNextIdx);
      expect(hintIdx).toBeLessThan(firstDetailsIdx);
    });

    it("(e) escaping: hostile strings in summary headlines produce no unescaped <script tags", () => {
      const hostileClaim = createClaim("coverage", {
        agentsCreated: 2,
        agentsRead: 2,
      });
      const hostileLedger = createLedgerFixture({
        outcome: {
          source: "unavailable",
          reason:
            '<script>alert("outcome")</script>' as unknown as "not-measured",
        },
        claims: [hostileClaim],
      });
      const html = renderReportHtml(hostileLedger);

      expect(html).not.toMatch(/<script>/i);
      expect(html).not.toMatch(/<script\b/i);
    });

    it("(f) CSP meta tag is preserved and no <script anywhere in document", () => {
      const { ledger, context } = createRichLedger();
      const html = renderReportHtml(ledger, context);

      expect(html).toContain(
        "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'\">",
      );
      expect(html).not.toContain("<script");
    });
  });

  describe("navigation, smart auto-expand truth table, table-wrap, and link safety (REQ-001, REQ-003..REQ-006)", () => {
    function makeActImprovement(
      rule: LedgerImprovement["rule"],
      level: "act" | "watch" = "act",
    ): LedgerImprovement {
      return {
        rule,
        level,
        action: "act-now",
        destination: "orchestration-config",
        audience: "manager",
        claimIds: ["c1"],
        evidence: ["e1"],
        values: {
          answers: 2,
          allow: 1,
          deny: 1,
          targetsAtLeast3: 0,
          per100Tenths: 10,
          sharePercent: 90,
          cacheReadPerTurnMain: 50000,
          cacheReadPerTurnOthers: 0,
          compactionsMain: 1,
          mainReadCalls: 5,
          mainEditCalls: 5,
          mainCoordinationCalls: 0,
          unguardedEdits: 2,
          editEpisodes: 4,
          byFilesTotal: 1,
          getSkillTotal: 0,
          unguardedPercent: 50,
          noMatchCalls: 2,
          calls: 4,
          filesNoMatch: 2,
          keywordsNoMatch: 0,
          percent: 50,
          askCalls: 2,
          abortedStops: 1,
          agents: 1,
          worstErrorStops: 3,
          worstTurns: 4,
        },
      };
    }

    it("renders top-nav jump pills with status hints for rendered sections only and includes :target CSS", () => {
      const ledger = createLedgerFixture({
        models: [
          {
            model: "gpt-5.4",
            turns: 10,
            costCents: 350,
            inputTokens: 100,
            outputTokens: 50,
            cacheReadTokens: 1000,
            errorStops: 0,
          },
        ],
        toolRows: [],
        cells: [],
        agents: [],
        improvements: [],
      });
      const html = renderReportHtml(ledger);

      expect(html).toContain('<nav class="top-nav"');
      expect(html).not.toContain("← All sessions");
      expect(html).toContain('href="#sec-outcome"');
      expect(html).toContain('href="#sec-timeline"');
      expect(html).toContain('href="#sec-cost"');
      expect(html).toContain("Cost ($3.50)");
      expect(html).toContain('href="#sec-lookups"');
      expect(html).toContain('href="#sec-limits"');
      expect(html).not.toContain('href="#sec-permissions"');
      expect(html).not.toContain('href="#sec-errors"');
      expect(html).not.toContain('href="#sec-tools"');
      expect(html).not.toContain('href="#sec-trend"');
      expect(html).not.toContain('href="#sec-agents"');
      expect(html).not.toContain('href="#sec-maintainer"');
      expect(html).toContain(
        "details.sec:target{outline:2px solid #0969da;border-radius:6px;padding-left:6px;padding-right:6px}",
      );
    });

    it("renders back link to indexHref and clickable trend headers when valid, omitting hostile hrefs", () => {
      const ledger = createLedgerFixture({
        claims: [createClaim("coverage", { agentsCreated: 1, agentsRead: 1 })],
      });
      const html = renderReportHtml(ledger, {
        indexHref: "../../../../index.html",
        previous: [
          {
            session: "prev0001-session",
            to: "2026-09-30T15:00:00.000Z",
            turns: 10,
            costCentsPer100Turns: 100,
            permissionAnswersPer100TurnsTenths: 0,
            errorStopsPer100TurnsTenths: 0,
            toolErrorsPer100CallsTenths: 0,
            lookupMissPercent: 0,
            compactionsPer100TurnsTenths: 0,
            unguardedEditPercent: 0,
            reportHref:
              "../../../0123456789abcdef0123456789abcdef/generations/gen-1/report.html",
          },
          {
            session: "prev0002-session",
            to: "2026-09-29T15:00:00.000Z",
            turns: 10,
            costCentsPer100Turns: 200,
            permissionAnswersPer100TurnsTenths: 0,
            errorStopsPer100TurnsTenths: 0,
            toolErrorsPer100CallsTenths: 0,
            lookupMissPercent: 0,
            compactionsPer100TurnsTenths: 0,
            unguardedEditPercent: 0,
            reportHref: null,
          },
        ],
      });

      expect(html).toContain(
        '<a class="nav-back" href="../../../../index.html">← All sessions</a>',
      );
      expect(html).toContain(
        '<th><a href="../../../0123456789abcdef0123456789abcdef/generations/gen-1/report.html">session prev0001 ending 2026-09-30</a></th>',
      );
      expect(html).toContain("<th>session prev0002 ending 2026-09-29</th>");

      const hostileInputs = [
        "javascript:alert(1)",
        "https://evil.example/index.html",
        "http://evil.example/index.html",
        "data:text/html,<script>alert(1)</script>",
        "//evil.example/index.html",
        "../../../../../etc/passwd",
        "../../../../etc/passwd",
        "../../../%2e%2e/generations/g1/report.html",
        "../../../../index.html\x00",
      ];
      for (const badHref of hostileInputs) {
        const badHtml = renderReportHtml(ledger, {
          indexHref: badHref,
          previous: [
            {
              session: "prevbad1",
              to: "2026-09-30T15:00:00.000Z",
              turns: 10,
              costCentsPer100Turns: 100,
              permissionAnswersPer100TurnsTenths: 0,
              errorStopsPer100TurnsTenths: 0,
              toolErrorsPer100CallsTenths: 0,
              lookupMissPercent: 0,
              compactionsPer100TurnsTenths: 0,
              unguardedEditPercent: 0,
              reportHref: badHref,
            },
          ],
        });
        expect(badHtml).not.toContain("← All sessions");
        expect(badHtml).toContain(
          "<th>session prevbad1 ending 2026-09-30</th>",
        );
        expect(badHtml).not.toMatch(/href="(?!#sec-)/);
        expect(badHtml).not.toMatch(/https?:\/\//i);
        expect(badHtml).not.toContain("<script");
      }
    });

    it("keeps all sections collapsed for a clean ledger (zero denials, zero error stops, zero act improvements)", () => {
      const cleanLedger = createLedgerFixture({
        improvements: [makeActImprovement("cost-concentration", "watch")],
        permissionRequests: {
          asked: 2,
          answered: 2,
          unanswered: 0,
          answeredWithoutRequest: 0,
          agentsAsked: 1,
          tools: [
            {
              name: "bash",
              asked: 2,
              allow: 2,
              deny: 0,
              other: 0,
              unanswered: 0,
            },
          ],
          programs: [],
          distinctPrograms: 0,
          commands: [],
          distinctCommands: 0,
          commandsOmitted: 0,
        },
        toolRows: [{ tool: "bash", calls: 10, errors: 1 }],
        cells: [{ key: "2026-10-01|gpt-5.4", turns: 10, errorStops: 0 }],
        models: [
          {
            model: "gpt-5.4",
            turns: 10,
            costCents: 100,
            inputTokens: 100,
            outputTokens: 50,
            cacheReadTokens: 100,
            errorStops: 0,
          },
        ],
        lookups: {
          tools: [],
          skills: [],
          distinctSkills: 0,
          otherSkillReturns: 0,
          unvalidatedReturns: 0,
          capped: false,
        },
        agents: [
          {
            label: "main",
            kind: "orchestrator",
            model: "gpt-5.4",
            turns: 10,
            costCents: 100,
            compactions: 0,
            cacheReadPerTurn: 10,
            errorStops: 0,
            toolCalls: 10,
            toolErrors: 1,
            editCalls: 1,
            bashCalls: 2,
            readCalls: 7,
            agsLookups: 0,
            permissionAnswers: 2,
          },
        ],
      });
      const html = renderReportHtml(cleanLedger, {
        previous: [
          {
            session: "p1",
            to: "2026-09-29T10:00:00.000Z",
            turns: 10,
            costCentsPer100Turns: 100,
            permissionAnswersPer100TurnsTenths: 0,
            errorStopsPer100TurnsTenths: 0,
            toolErrorsPer100CallsTenths: 0,
            lookupMissPercent: 0,
            compactionsPer100TurnsTenths: 0,
            unguardedEditPercent: 0,
          },
        ],
      });

      expect(html).not.toMatch(/<details[^>]*\bopen\b/);
    });

    it("auto-opens sec-cost, sec-lookups, sec-agents, and sec-tools only per truth table", () => {
      const flaggedLedger = createLedgerFixture({
        improvements: [
          makeActImprovement("cost-concentration", "act"),
          makeActImprovement("unguarded-edits", "act"),
          makeActImprovement("human-intervention", "act"),
        ],
        models: [
          {
            model: "gpt-5.4",
            turns: 10,
            costCents: 5000,
            inputTokens: 100,
            outputTokens: 50,
            cacheReadTokens: 1000,
            errorStops: 0,
          },
        ],
        lookups: {
          tools: [],
          skills: [],
          distinctSkills: 0,
          otherSkillReturns: 0,
          unvalidatedReturns: 0,
          capped: false,
        },
        agents: [
          {
            label: "main",
            kind: "orchestrator",
            model: "gpt-5.4",
            turns: 10,
            costCents: 5000,
            compactions: 0,
            cacheReadPerTurn: 100,
            errorStops: 0,
            toolCalls: 10,
            toolErrors: 0,
            editCalls: 2,
            bashCalls: 0,
            readCalls: 8,
            agsLookups: 0,
            permissionAnswers: 0,
          },
        ],
        toolRows: [{ tool: "bash", calls: 5, errors: 0 }],
      });

      const html = renderReportHtml(flaggedLedger);
      expect(html).toContain('<details class="sec" id="sec-cost" open>');
      expect(html).toContain('<details class="sec" id="sec-lookups" open>');
      expect(html).toContain('<details class="sec" id="sec-agents" open>');
      // toolRows has 0 errors even though act improvements exist -> stays collapsed
      expect(html).toContain('<details class="sec" id="sec-tools">');
      expect(html).toContain('<details class="sec" id="sec-outcome">');
      expect(html).toContain('<details class="sec" id="sec-limits">');
    });

    it("wraps wide tables in .table-wrap and includes nowrap CSS rules", () => {
      const ledger = createLedgerFixture({
        outcome: {
          source: "git",
          branch: "main",
          commits: 2,
          mergeCommits: 0,
          revertCommits: 0,
          filesChanged: 3,
          insertions: 10,
          deletions: 4,
          windowFrom: "2026-10-01T10:00:00.000Z",
          windowTo: "2026-10-01T11:00:00.000Z",
        },
        days: [{ day: "2026-10-01", turns: 10, costCents: 100, errorStops: 1 }],
        models: [
          {
            model: "gpt-5.4",
            turns: 10,
            costCents: 100,
            inputTokens: 100,
            outputTokens: 50,
            cacheReadTokens: 200,
            errorStops: 1,
          },
        ],
        toolRows: [{ tool: "bash", calls: 5, errors: 1 }],
        cells: [{ key: "2026-10-01|gpt-5.4", turns: 10, errorStops: 1 }],
        agents: [
          {
            label: "main",
            kind: "orchestrator",
            model: "gpt-5.4",
            turns: 10,
            costCents: 100,
            compactions: 0,
            cacheReadPerTurn: 20,
            errorStops: 1,
            toolCalls: 5,
            toolErrors: 1,
            editCalls: 1,
            bashCalls: 2,
            readCalls: 2,
            agsLookups: 0,
            permissionAnswers: 0,
          },
        ],
      });
      const html = renderReportHtml(ledger, {
        previous: [
          {
            session: "p1",
            to: "2026-09-29T10:00:00.000Z",
            turns: 10,
            costCentsPer100Turns: 100,
            permissionAnswersPer100TurnsTenths: 0,
            errorStopsPer100TurnsTenths: 0,
            toolErrorsPer100CallsTenths: 0,
            lookupMissPercent: 0,
            compactionsPer100TurnsTenths: 0,
            unguardedEditPercent: 0,
          },
        ],
      });
      expect(html).toContain(".table-wrap{overflow-x:auto;");
      expect(html).toContain("white-space:nowrap");
      expect(html).toContain('<div class="table-wrap');
      // Every <table> in report.html must be inside a .table-wrap container
      const tableCount = (html.match(/<table>/g) ?? []).length;
      const wrappedTableCount = (
        html.match(/<div class="table-wrap[^"]*">\s*<table>/g) ?? []
      ).length;
      expect(tableCount).toBeGreaterThan(0);
      expect(wrappedTableCount).toBe(tableCount);
    });
  });
});
