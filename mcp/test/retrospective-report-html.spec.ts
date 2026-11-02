import { describe, expect, it } from "vitest";
import type { LedgerImprovement } from "../src/retrospective/improvements";
import type { Claim, Ledger, LedgerAgent } from "../src/retrospective/ledger";
import {
  escapeHtml,
  formatMoney,
  formatRate,
  formatTokensK,
  plural,
} from "../src/retrospective/views/format";
import {
  type LedgerFolder,
  type LedgerLookups,
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
    id: `claim-${template}`,
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
    folder?: LedgerFolder | null;
    lookups?: LedgerLookups | null;
  } = {},
): Ledger {
  return {
    schemaVersion: 1,
    cutoff: "2026-10-01T12:00:00.000Z",
    session: "01a167e1",
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
    ...overrides,
  } as Ledger;
}

describe("format helpers", () => {
  it("plural handles standard nouns and custom irregular plurals", () => {
    expect(plural(1, "apple")).toBe("1 apple");
    expect(plural(2, "apple")).toBe("2 apples");
    expect(plural(0, "apple")).toBe("0 apples");
    expect(plural(1, "child", "children")).toBe("1 child");
    expect(plural(5, "child", "children")).toBe("5 children");
  });

  it("formatMoney formats cents to dollars", () => {
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(25)).toBe("$0.25");
    expect(formatMoney(1234)).toBe("$12.34");
    expect(formatMoney(50000)).toBe("$500.00");
  });

  it("formatTokensK rounds to thousands with k suffix", () => {
    expect(formatTokensK(0)).toBe("0k");
    expect(formatTokensK(499)).toBe("0k");
    expect(formatTokensK(500)).toBe("1k");
    expect(formatTokensK(28123)).toBe("28k");
    expect(formatTokensK(155400)).toBe("155k");
  });

  it("formatRate divides tenths by 10 with 1 decimal place", () => {
    expect(formatRate(0)).toBe("0.0");
    expect(formatRate(4)).toBe("0.4");
    expect(formatRate(127)).toBe("12.7");
  });

  it("escapeHtml replaces &, <, >, \", and '", () => {
    expect(escapeHtml("&")).toBe("&amp;");
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml(">")).toBe("&gt;");
    expect(escapeHtml('"')).toBe("&quot;");
    expect(escapeHtml("'")).toBe("&#39;");
    expect(escapeHtml('<script>alert("x & y")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x &amp; y&quot;)&lt;/script&gt;",
    );
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

  it("escapes hostile strings in folder, model, skill id, and agent label", () => {
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
      folder: hostileFolder,
      agents: [hostileAgent],
      lookups: hostileLookups,
    });

    const html = renderReportHtml(ledger);
    expect(html).not.toMatch(/<script>/i);
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

  describe("section presence and omission per absent claim", () => {
    it("omits scope and coverage details in bottom line when coverage claim is absent", () => {
      const ledger = createLedgerFixture({
        claims: [],
      });
      const html = renderReportHtml(ledger);
      expect(html).not.toContain("Observed: main");
      expect(html).toContain("Coverage: complete");
    });

    it("omits cost and context section when cost-drivers claim is absent", () => {
      const ledger = createLedgerFixture({
        claims: [],
      });
      const html = renderReportHtml(ledger);
      expect(html).not.toContain("Cost and context");
      expect(html).not.toContain("Cached tokens per turn");
    });

    it("renders unmeasured message when lookups is null", () => {
      const ledger = createLedgerFixture({
        lookups: null,
      });
      const html = renderReportHtml(ledger);
      expect(html).toContain(
        "AGS lookups were not measured (no session files read).",
      );
    });

    it("renders neutral card when no manager improvements exist", () => {
      const ledger = createLedgerFixture({
        improvements: [],
      });
      const html = renderReportHtml(ledger);
      expect(html).toContain("No actions suggested from the measured signals");
      expect(html).toContain("This is not a judgment of session quality.");
      expect(html).toContain('<span class="chip none">NONE</span>');
    });

    it("omits maintainer section when no maintainer improvements exist", () => {
      const ledger = createLedgerFixture({
        improvements: [],
      });
      const html = renderReportHtml(ledger);
      expect(html).not.toContain("For the maintainer");
    });
  });

  describe("AGS lookups table and skills ranking", () => {
    it("renders tools in LOOKUP_TOOLS order with totals row and skills ranking", () => {
      const lookups: LedgerLookups = {
        tools: [
          {
            tool: "load_skills_for_files",
            calls: 10,
            noMatchCalls: 2,
            errorCalls: 0,
            bodiesReturned: 8,
            reusedBodies: 1,
            mainCalls: 6,
            workerCalls: 4,
          },
          {
            tool: "load_skills_for_keywords",
            calls: 5,
            noMatchCalls: 1,
            errorCalls: 0,
            bodiesReturned: 4,
            reusedBodies: 0,
            mainCalls: 3,
            workerCalls: 2,
          },
          {
            tool: "get_skill",
            calls: 2,
            noMatchCalls: 0,
            errorCalls: 0,
            bodiesReturned: 2,
            reusedBodies: 0,
            mainCalls: 2,
            workerCalls: 0,
          },
          {
            tool: "get_workflow",
            calls: 1,
            noMatchCalls: 0,
            errorCalls: 0,
            bodiesReturned: 1,
            reusedBodies: 0,
            mainCalls: 1,
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
            id: "common/common-tdd",
            returns: 5,
            mainReturns: 3,
            workerReturns: 2,
          },
          {
            id: "typescript/typescript-language",
            returns: 3,
            mainReturns: 3,
            workerReturns: 0,
          },
        ],
        distinctSkills: 2,
        otherSkillReturns: 4,
        unvalidatedReturns: 1,
        capped: true,
      };

      const ledger = createLedgerFixture({ lookups });
      const html = renderReportHtml(ledger);

      expect(html).toContain("by file");
      expect(html).toContain("by keyword");
      expect(html).toContain("by name (get_skill)");
      expect(html).toContain("workflow");
      expect(html).toContain("category guide");

      // Verify order: by file comes before by keyword, before by name, etc.
      const idxFile = html.indexOf("by file");
      const idxKeywords = html.indexOf("by keyword");
      const idxName = html.indexOf("by name (get_skill)");
      const idxWorkflow = html.indexOf("workflow");
      const idxGuide = html.indexOf("category guide");
      expect(idxFile).toBeLessThan(idxKeywords);
      expect(idxKeywords).toBeLessThan(idxName);
      expect(idxName).toBeLessThan(idxWorkflow);
      expect(idxWorkflow).toBeLessThan(idxGuide);

      // Verify totals row: total calls = 10+5+2+1+0 = 18; noMatch = 2+1 = 3; bodies = 8+4+2+1 = 15; reused = 1; main = 6+3+2+1=12; workers = 4+2=6
      expect(html).toContain(
        '<tr class="total"><td>Total</td><td>18</td><td>3</td><td>15</td><td>1</td><td>0</td><td>12/6</td></tr>',
      );

      // Skills ranking table
      expect(html).toContain("common/common-tdd");
      expect(html).toContain("typescript/typescript-language");

      // Below text
      expect(html).toContain(
        "2 distinct skills; 4 more deliveries outside this list; 1 deliveries with an unreadable id. Some agents returned more than 100 distinct skills; counts for the rest are grouped.",
      );
    });

    it("omits capped sentence when lookups.capped is false", () => {
      const lookups: LedgerLookups = {
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
        skills: [],
        distinctSkills: 0,
        otherSkillReturns: 0,
        unvalidatedReturns: 0,
        capped: false,
      };

      const ledger = createLedgerFixture({ lookups });
      const html = renderReportHtml(ledger);
      expect(html).not.toContain(
        "Some agents returned more than 100 distinct skills; counts for the rest are grouped.",
      );
    });
  });

  describe("improvement cards exact wording", () => {
    it("renders guardrail-answers improvement card", () => {
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
        "Change (permission setup): add repeated safe requests to the allowlist (allowed answers show setup gaps) and check what each denial asked for (denials show rule violations). Next time: permission answers per 100 turns (now 1.5).",
      );
    });

    it("renders cost-concentration improvement card", () => {
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
        "Change (orchestration config): check whether those reads and edits could be delegated; consider a turn limit per session and a cost alert. Next time: cached tokens per main turn (now 120k).",
      );
    });

    it("renders unguarded-edits improvement card", () => {
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
        "Change (AGS routing): check the router trigger and the brief given to agents that edit files. Next time: unguarded edit share (now 50%).",
      );
    });

    it("renders lookup-misses improvement card", () => {
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
        "Change (AGS routing): check the trigger words and file patterns of the skills these lookups should have found, and the file types the lookups were for. Next time: lookups that matched nothing (now 40%).",
      );
    });

    it("renders human-intervention improvement card", () => {
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
        "Change (permission setup): check which of those decisions the setup could take without asking. Next time: asks and aborts per 100 turns (now 2.0).",
      );
    });

    it("renders agent-error-concentration improvement card", () => {
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
        "Change (provider route monitoring): read the error category of those records before changing any routing. Next time: agents above half error turns (now 2).",
      );
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
      expect(html).toContain("<td>3</td>"); // permission answers for main
    });
  });

  describe("limits section", () => {
    it("renders all five limits bullets verbatim", () => {
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
    });
  });
});
