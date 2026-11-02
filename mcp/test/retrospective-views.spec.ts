import { describe, expect, it } from "vitest";
import type { TreeAggregate } from "../src/retrospective/aggregate";
import type { LedgerImprovement } from "../src/retrospective/improvements";
import {
  buildLedger,
  type Claim,
  type Ledger,
  type LedgerInput,
} from "../src/retrospective/ledger";
import {
  type LedgerAgent,
  type LedgerDay,
  type LedgerModel,
  type LedgerOutcome,
  type LedgerPermissionRequests,
  type LedgerPermissionRow,
  type LedgerToolRow,
  type OtherAgentsSummary,
  renderSummary,
} from "../src/retrospective/views/summary";
import type { SkillUsageSnapshot } from "../src/services/SessionTracker";

function createTreeFixture(
  overrides: Partial<TreeAggregate> = {},
): TreeAggregate {
  return {
    sessions: 2,
    fullyRead: 2,
    folder: null,
    coverage: "complete",
    first: "2026-10-01T10:00:00.000Z",
    last: "2026-10-01T11:00:00.000Z",
    assistantTurns: 20,
    userMessages: 5,
    compactions: 0,
    tokens: {
      input: 1000,
      output: 500,
      cacheRead: 200,
      cacheWrite: 100,
    },
    cost: 15,
    costKnownTurns: 20,
    costUnknownTurns: 0,
    models: {
      "model-a": 10,
      "model-b": 10,
    },
    stopReasons: {
      stop: 17,
      error: 3,
    },
    toolCalls: {
      read: 10,
      write: 5,
    },
    serverToolCalls: {},
    hostSkillReads: {},
    skillLoad: {
      nodes: [
        {
          ordinal: 0,
          isMain: true,
          measured: false,
          skillLoadCalls: 0,
          callsBeforeFirstSkillLoad: null,
          hostSkillReadCalls: 0,
          callsBeforeFirstSkillAccess: null,
        },
      ],
      omittedNodes: 0,
    },
    toolErrors: {
      read: 0,
      write: 0,
    },
    skippedLines: 0,
    metricCompleteness: {
      assistantTurns: "complete",
      byDayModel: "complete",
      toolErrors: "complete",
    },
    series: {
      byDayModel: {
        "2026-10-01|model-a": {
          turns: 10,
          errorStops: 2,
          costUnits: 8,
          costKnownTurns: 10,
        },
        "2026-10-01|model-b": {
          turns: 10,
          errorStops: 1,
          costUnits: 7,
          costKnownTurns: 10,
        },
      },
    },
    ...overrides,
  };
}

function create200CellTree(): TreeAggregate {
  const byDayModel: TreeAggregate["series"]["byDayModel"] = {};
  for (let i = 0; i < 200; i++) {
    const day = `2026-10-${String((i % 28) + 1).padStart(2, "0")}`;
    const model = `model-${i}`;
    byDayModel[`${day}|${model}`] = {
      turns: 10 + (i % 5),
      errorStops: i === 42 ? 5 : 1,
      costUnits: 5,
      costKnownTurns: 10 + (i % 5),
    };
  }

  return {
    sessions: 200,
    fullyRead: 200,
    folder: null,
    coverage: "complete",
    first: "2026-10-01T00:00:00.000Z",
    last: "2026-10-28T23:59:59.000Z",
    assistantTurns: 2400,
    userMessages: 400,
    compactions: 0,
    tokens: {
      input: 50000,
      output: 20000,
      cacheRead: 10000,
      cacheWrite: 5000,
    },
    cost: 300,
    costKnownTurns: 2400,
    costUnknownTurns: 0,
    models: {},
    stopReasons: {
      stop: 2350,
      error: 50,
    },
    toolCalls: {
      read: 100,
      write: 50,
    },
    serverToolCalls: {},
    hostSkillReads: {},
    skillLoad: {
      nodes: [
        {
          ordinal: 0,
          isMain: true,
          measured: false,
          skillLoadCalls: 0,
          callsBeforeFirstSkillLoad: null,
          hostSkillReadCalls: 0,
          callsBeforeFirstSkillAccess: null,
        },
      ],
      omittedNodes: 0,
    },
    toolErrors: {
      read: 0,
      write: 0,
    },
    skippedLines: 0,
    metricCompleteness: {
      assistantTurns: "complete",
      byDayModel: "complete",
      toolErrors: "complete",
    },
    series: { byDayModel },
  };
}

function skillsSnapshot(
  overrides: Partial<SkillUsageSnapshot> = {},
): SkillUsageSnapshot {
  return {
    since: "2026-10-01T09:00:00.000Z",
    events: 6,
    loadCalls: 3,
    noMatchCalls: 1,
    bodyReturns: 3,
    dedupedReturns: 1,
    estimatedTokens: 30,
    selectedNotLoaded: 1,
    workflows: 1,
    guides: 0,
    skillsTotal: 2,
    skills: [
      {
        id: "nextjs/app-router",
        returns: 2,
        firstAt: "2026-10-01T09:01:00.000Z",
        via: ["load_skills_for_files"],
      },
      {
        id: "typescript/strict",
        returns: 1,
        firstAt: "2026-10-01T09:02:00.000Z",
        via: ["get_skill"],
      },
    ],
    ...overrides,
  };
}

const COVERAGE_ID = "1111111111111111";
const VIEW_SCOPE = {
  nodes: [{ hostId: "local", sessionId: "main" }],
  from: "2026-10-01T10:00:00.000Z",
  to: "2026-10-01T11:00:00.000Z",
};

function viewClaim(
  id: string,
  template: Claim["template"] | "ags-lookups",
  values: Record<string, number | string>,
): Claim {
  return {
    id,
    type: "observation",
    template,
    values,
    scope: {
      nodes: VIEW_SCOPE.nodes,
      from: VIEW_SCOPE.from,
      to: VIEW_SCOPE.to,
    },
    coverage: "complete",
    supporting: [],
    contradicting: [],
    basedOn: [],
  };
}

type ViewLedgerInput = {
  coverageValues?: Record<string, number | string>;
  claims?: Claim[];
  session?: string | null;
  folder?: { name: string; parent: string | null } | null;
  lookups?: {
    tools?: Array<{
      tool: string;
      calls: number;
      noMatchCalls: number;
      errorCalls: number;
      bodiesReturned: number;
      reusedBodies: number;
      mainCalls: number;
      workerCalls: number;
    }>;
    skills?: Array<{
      id: string;
      returns: number;
      mainReturns: number;
      workerReturns: number;
    }>;
    distinctSkills?: number;
    otherSkillReturns?: number;
    unvalidatedReturns?: number;
    capped?: boolean;
  } | null;
  coverage?: "complete" | "partial";
  evidenceMode?: "native-files" | "tracker-only";
  rootVerification?: Ledger["rootVerification"];
  hostSkills?: Ledger["hostSkills"];
  skillUsage?: SkillUsageSnapshot | null;
  cells?: Ledger["cells"];
  agents?: LedgerAgent[];
  otherAgents?: OtherAgentsSummary | null;
  improvements?: LedgerImprovement[];
  label?: string | null;
  models?: LedgerModel[];
  days?: LedgerDay[];
  toolRows?: LedgerToolRow[];
  outcome?: LedgerOutcome;
  permissionRequests?: LedgerPermissionRequests | null;
};

function viewLedger(input: ViewLedgerInput = {}): Ledger {
  const coverageValues: Record<string, number | string> = {
    sessions: 2,
    fullyRead: 2,
    skippedLines: 0,
    agentsCreated: 3,
    agentsRead: 2,
    sessionsLinked: 3,
    unlinkedAgents: 1,
    ...input.coverageValues,
  };
  const claims = [
    viewClaim(COVERAGE_ID, "coverage", coverageValues),
    ...(input.claims ?? []),
  ];
  return {
    schemaVersion: 1,
    session: input.session === undefined ? "abcdef12" : input.session,
    folder: input.folder ?? null,
    lookups: input.lookups ?? null,
    cells: input.cells ?? [],
    cutoff: "2026-10-01T12:00:00.000Z",
    evidenceMode: input.evidenceMode ?? "native-files",
    rootVerification: input.rootVerification ?? "unverified-root",
    coverage: input.coverage ?? "complete",
    counts: {
      agentsCreated: Number(coverageValues.agentsCreated),
      sessionsLinked: Number(coverageValues.sessionsLinked),
      failedToolCalls: 0,
      errorStops: 0,
      claims: claims.length,
      hypotheses: 0,
    },
    skillUsage: input.skillUsage ?? null,
    hostSkills: input.hostSkills ?? null,
    claims,
    evidence: {},
    agents: input.agents ?? [],
    otherAgents: input.otherAgents ?? null,
    improvements: input.improvements ?? [],
    label: input.label ?? null,
    models: input.models ?? [],
    days: input.days ?? [],
    toolRows: input.toolRows ?? [],
    outcome: input.outcome ?? { source: "unavailable", reason: "not-measured" },
    permissionRequests: input.permissionRequests ?? null,
  } as unknown as Ledger;
}

describe("retrospective summary view v3", () => {
  it("renders summary within 80 lines and 8192 bytes on a 200-cell fixture", () => {
    const input: LedgerInput = {
      tree: create200CellTree(),
      mainSessionId: "abcdef1234567890",
      cutoff: "2026-10-28T23:59:59.000Z",
      evidenceMode: "native-files",
      rootVerification: "unverified-root",
      skillUsage: null,
      unlinkedAgents: 10,
      agentsCreated: 50,
      sessionsLinked: 40,
      trackerSince: null,
      label: null,
      outcome: { source: "unavailable", reason: "not-measured" },
    } as unknown as LedgerInput;

    const ledger = buildLedger(input);
    const summary = renderSummary(ledger);

    const lines = summary.split("\n");
    expect(lines.length).toBeLessThanOrEqual(80);
    expect(Buffer.byteLength(summary, "utf8")).toBeLessThanOrEqual(8192);
    expect(lines[0]).toBe(
      "Coverage: complete | Evidence: native session files | Root: unverified root | Delegation: 40 of 50 created agents read | Cutoff: 2026-10-28T23:59:59.000Z",
    );
    expect(lines[1]).toBe(
      "Scope: session abcdef12 | 2026-10-01T00:00:00.000Z to 2026-10-28T23:59:59.000Z",
    );
    expect(summary).toContain("## Limits");
    expect(summary).toContain("- Counts show where to look, not why.");
  });

  it("formats line 1 and line 2 with exact structure on a hand-built ledger", () => {
    const completeSummary = renderSummary(
      viewLedger({
        coverageValues: { agentsCreated: 3, agentsRead: 2, unlinkedAgents: 1 },
      }),
    );
    const completeLines = completeSummary.split("\n");
    expect(completeLines[0]).toBe(
      "Coverage: complete | Evidence: native session files | Root: unverified root | Delegation: 2 of 3 created agents read | Cutoff: 2026-10-01T12:00:00.000Z",
    );
    expect(completeLines[1]).toBe(
      "Scope: session abcdef12 | 2026-10-01T10:00:00.000Z to 2026-10-01T11:00:00.000Z",
    );

    const partialSummary = renderSummary(viewLedger({ coverage: "partial" }));
    expect(partialSummary.split("\n")[0]).toBe(
      "Coverage: partial | Evidence: native session files | Root: unverified root | Delegation: 2 of 3 created agents read | Cutoff: 2026-10-01T12:00:00.000Z",
    );

    const trackerSummary = renderSummary(
      viewLedger({
        evidenceMode: "tracker-only",
        rootVerification: "not-applicable",
        coverage: "partial",
      }),
    );
    const trackerLines = trackerSummary.split("\n");
    expect(trackerLines[0]).toBe(
      "Coverage: partial | Evidence: tracker only (no session files read) | Root: n/a | Delegation: n/a | Cutoff: 2026-10-01T12:00:00.000Z",
    );

    const noSessionSummary = renderSummary(viewLedger({ session: null }));
    const noSessionLines = noSessionSummary.split("\n");
    expect(noSessionLines[0]).toContain(
      "| Delegation: 2 of 3 created agents read |",
    );
    expect(noSessionLines[1]).toBe(
      "Scope: 2026-10-01T10:00:00.000Z to 2026-10-01T11:00:00.000Z",
    );

    const zeroCreatedSummary = renderSummary(
      viewLedger({
        coverageValues: { agentsCreated: 0, agentsRead: 0, unlinkedAgents: 0 },
      }),
    );
    expect(zeroCreatedSummary.split("\n")[0]).toBe(
      "Coverage: complete | Evidence: native session files | Root: unverified root | Delegation: none created | Cutoff: 2026-10-01T12:00:00.000Z",
    );
  });

  it("renders exact bottom line with all claims present", () => {
    const ledger = viewLedger({
      coverageValues: { agentsCreated: 5, sessionsLinked: 3 },
      agents: [
        {
          label: "main",
          kind: "editing",
          turns: 100,
          costCents: 1550,
          compactions: 2,
          cacheReadPerTurn: 25000,
          errorStops: 0,
          toolCalls: 50,
          toolErrors: 0,
          editCalls: 10,
          bashCalls: 5,
          readCalls: 30,
          agsLookups: 12,
          permissionAnswers: 5,
          model: "claude-3-5-sonnet",
        },
        {
          label: "worker-1",
          kind: "editing",
          turns: 30,
          costCents: 550,
          compactions: 0,
          cacheReadPerTurn: 5000,
          errorStops: 0,
          toolCalls: 20,
          toolErrors: 0,
          editCalls: 5,
          bashCalls: 2,
          readCalls: 10,
          agsLookups: 2,
          permissionAnswers: 0,
          model: "claude-3-5-haiku",
        },
        {
          label: "worker-2",
          kind: "read-only",
          turns: 20,
          costCents: 400,
          compactions: 0,
          cacheReadPerTurn: 5000,
          errorStops: 0,
          toolCalls: 15,
          toolErrors: 0,
          editCalls: 0,
          bashCalls: 0,
          readCalls: 15,
          agsLookups: 2,
          permissionAnswers: 0,
          model: "claude-3-5-haiku",
        },
      ],
      claims: [
        viewClaim("claim:cost", "cost-drivers", {
          turnsMain: 100,
          costCentsMain: 1550,
          turnsOthers: 50,
          costCentsOthers: 950,
          cacheReadPerTurnMain: 25000,
          cacheReadPerTurnOthers: 5000,
          compactionsMain: 2,
          postCompactionCacheReadPerTurnMain: 12000,
          maxCacheReadMain: 45000,
          mainToolCalls: 60,
          mainReadCalls: 30,
          mainEditCalls: 10,
          mainBashCalls: 5,
          mainCoordinationCalls: 15,
          costCentsMainReads: 775,
          costCentsMainCoordination: 388,
        }),
        viewClaim("claim:perm", "permission-answers", {
          answers: 5,
          allow: 4,
          deny: 1,
          other: 0,
          targets: 2,
          maxPerTarget: 3,
          targetsAtLeast3: 1,
          askCalls: 2,
          abortedStops: 1,
          turns: 150,
        }),
        viewClaim("claim:routing", "routing-order", {
          lookupsMain: 12,
          lookupsOthers: 4,
          byFilesTotal: 8,
          byKeywordsTotal: 3,
          getSkillTotal: 1,
          agentsWithLookup: 3,
          agentsTotal: 3,
          editEpisodesMain: 10,
          unguardedEditsMain: 3,
          editEpisodesOthers: 5,
          unguardedEditsOthers: 2,
          overheadCalls: 2,
          hostSkillReadCalls: 0,
        }),
      ],
    });

    const summary = renderSummary(ledger);
    const lines = summary.split("\n");
    const bottomLineIdx = lines.indexOf("## Bottom line");
    expect(bottomLineIdx).toBeGreaterThan(-1);
    expect(lines[bottomLineIdx + 1]).toBe(
      "Observed: main + 2 workers (2 of 5 created agents). Main: 100 turns, $15.50 est. (62% of observed cost) at 25k cached tokens per turn (workers: 5k). 5 permission answers (1 denied). AGS lookups: 12 by main, 4 by workers.",
    );
  });

  it("renders bottom line when no agents were created and omits absent claim clauses", () => {
    const ledger = viewLedger({
      coverageValues: { agentsCreated: 0, sessionsLinked: 1 },
      agents: [
        {
          label: "main",
          kind: "read-only",
          turns: 10,
          costCents: 100,
          compactions: 0,
          cacheReadPerTurn: 2000,
          errorStops: 0,
          toolCalls: 5,
          toolErrors: 0,
          editCalls: 0,
          bashCalls: 0,
          readCalls: 5,
          agsLookups: 0,
          permissionAnswers: 0,
          model: "claude-3-5-sonnet",
        },
      ],
      claims: [
        // Only permission-answers claim present; cost-drivers and routing-order absent
        viewClaim("claim:perm", "permission-answers", {
          answers: 2,
          allow: 2,
          deny: 0,
          other: 0,
          targets: 1,
          maxPerTarget: 2,
          targetsAtLeast3: 0,
          askCalls: 0,
          abortedStops: 0,
          turns: 10,
        }),
      ],
    });

    const summary = renderSummary(ledger);
    const lines = summary.split("\n");
    const bottomLineIdx = lines.indexOf("## Bottom line");
    expect(bottomLineIdx).toBeGreaterThan(-1);
    expect(lines[bottomLineIdx + 1]).toBe(
      "Observed: main + 0 workers (no agents were created). 2 permission answers (0 denied).",
    );
  });

  it("renders exact scorecard lines when all claims are present", () => {
    const ledger = viewLedger({
      coverageValues: {
        agentsCreated: 5,
        sessionsLinked: 3,
        sessions: 2,
        skippedLines: 0,
      },
      agents: [
        {
          label: "main",
          kind: "editing",
          turns: 100,
          costCents: 1550,
          compactions: 2,
          cacheReadPerTurn: 25000,
          errorStops: 0,
          toolCalls: 60,
          toolErrors: 0,
          editCalls: 10,
          bashCalls: 5,
          readCalls: 30,
          agsLookups: 12,
          permissionAnswers: 5,
          model: "claude-3-5-sonnet",
        },
        {
          label: "worker-1",
          kind: "editing",
          turns: 30,
          costCents: 550,
          compactions: 0,
          cacheReadPerTurn: 5000,
          errorStops: 0,
          toolCalls: 20,
          toolErrors: 0,
          editCalls: 5,
          bashCalls: 2,
          readCalls: 10,
          agsLookups: 2,
          permissionAnswers: 0,
          model: "claude-3-5-haiku",
        },
        {
          label: "worker-2",
          kind: "read-only",
          turns: 20,
          costCents: 400,
          compactions: 0,
          cacheReadPerTurn: 5000,
          errorStops: 0,
          toolCalls: 15,
          toolErrors: 0,
          editCalls: 0,
          bashCalls: 0,
          readCalls: 15,
          agsLookups: 2,
          permissionAnswers: 0,
          model: "claude-3-5-haiku",
        },
      ],
      claims: [
        viewClaim("claim:perm", "permission-answers", {
          answers: 5,
          allow: 4,
          deny: 1,
          other: 0,
          targets: 2,
          maxPerTarget: 3,
          targetsAtLeast3: 1,
          askCalls: 2,
          abortedStops: 1,
          turns: 40, // 5 * 1000 / 40 = 125 tenths -> 12.5 per 100
        }),
        viewClaim("claim:cost", "cost-drivers", {
          turnsMain: 100,
          costCentsMain: 1550,
          turnsOthers: 50,
          costCentsOthers: 950,
          cacheReadPerTurnMain: 25000,
          cacheReadPerTurnOthers: 5000,
          compactionsMain: 2,
          postCompactionCacheReadPerTurnMain: 12000,
          maxCacheReadMain: 45000,
          mainToolCalls: 60,
          mainReadCalls: 30,
          mainEditCalls: 10,
          mainBashCalls: 5,
          mainCoordinationCalls: 15,
          costCentsMainReads: 775,
          costCentsMainCoordination: 388,
        }),
        viewClaim("claim:routing", "routing-order", {
          lookupsMain: 12,
          lookupsOthers: 4,
          byFilesTotal: 8,
          byKeywordsTotal: 3,
          getSkillTotal: 1,
          agentsWithLookup: 2,
          agentsTotal: 3,
          editEpisodesMain: 10,
          unguardedEditsMain: 3,
          editEpisodesOthers: 5,
          unguardedEditsOthers: 2,
          overheadCalls: 2,
          hostSkillReadCalls: 0,
        }),
        viewClaim("claim:skill", "skill-usage", {
          trackerWindow: "matches-session",
          noMatchCalls: 1,
          loadCalls: 3,
          bodyReturns: 2,
        }),
      ],
    });

    const summary = renderSummary(ledger);
    const lines = summary.split("\n");
    const scoreIdx = lines.indexOf("## Scorecards");
    expect(scoreIdx).toBeGreaterThan(-1);

    expect(lines[scoreIdx + 1]).toBe(
      "Guardrails: 5 permission answers (12.5 per 100 turns; 4 allowed, 1 denied); 2 asks to a human; 1 aborted stop; 1 agent answered 3 or more times.",
    );
    expect(lines[scoreIdx + 2]).toBe(
      "Cost: main 100 turns, $15.50 est., 2 compactions (post-compaction floor 12k, peak 45k cached tokens per turn); workers 50 turns, $9.50 est. Main made 30 reads, 10 edits, 5 bash and 15 coordination calls itself; call-share estimate: reads $7.75, coordination $3.88.",
    );
    expect(lines[scoreIdx + 3]).toBe(
      "AGS routing: main 12 lookups (12.0 per 100 turns), workers 4 (8.0 per 100 turns); 2 of 3 agents looked something up; 8 by file, 3 by keyword, 1 by name; 2 ceremony calls; 0 host skill reads (counted, not named).",
    );
    expect(lines[scoreIdx + 4]).toBe(
      "Edits: 15 edit or file-write calls, 5 with no file lookup since the agent's last compaction.",
    );
    expect(lines[scoreIdx + 5]).toBe(
      "Tracker (this session): 1 of 3 lookups matched nothing; 2 skill bodies returned.",
    );
    expect(lines[scoreIdx + 6]).toBe(
      "Coverage: 2 of 5 created agents observed; observed workers: 1 read-only, 1 editing; 2 sessions read in full (0 lines skipped).",
    );
    expect(lines[scoreIdx + 7]).toBe(
      "Outcome: not measured (not measured for this run).",
    );
  });

  it("handles scorecard absent-claim variants", () => {
    // When permission-answers is absent, outputs fallback guardrails line
    // When cost-drivers is absent, cost line is omitted
    // When routing-order is absent, routing lines are omitted
    const ledger = viewLedger({
      coverageValues: {
        agentsCreated: 2,
        sessionsLinked: 2,
        sessions: 1,
        skippedLines: 5,
      },
      agents: [
        {
          label: "main",
          kind: "read-only",
          turns: 10,
          costCents: 100,
          compactions: 0,
          cacheReadPerTurn: 1000,
          errorStops: 0,
          toolCalls: 5,
          toolErrors: 0,
          editCalls: 0,
          bashCalls: 0,
          readCalls: 5,
          agsLookups: 0,
          permissionAnswers: 0,
          model: "claude-3-5-sonnet",
        },
      ],
      claims: [],
    });

    const summary = renderSummary(ledger);
    const lines = summary.split("\n");
    const scoreIdx = lines.indexOf("## Scorecards");
    expect(scoreIdx).toBeGreaterThan(-1);

    expect(lines[scoreIdx + 1]).toBe(
      "Guardrails: no permission answers, asks or aborts observed.",
    );
    expect(lines[scoreIdx + 2]).toBe(
      "Coverage: 2 of 2 created agents observed; observed workers: 0 read-only, 0 editing; 1 session read in full (5 lines skipped).",
    );
    expect(lines[scoreIdx + 3]).toBe(
      "Outcome: not measured (not measured for this run).",
    );
    expect(summary).not.toContain("Cost: main");
    expect(summary).not.toContain("AGS routing: main");
    expect(summary).not.toContain("Edits:");
    expect(summary).not.toContain("Tracker");
  });

  it("renders tracker line variants for process-only with and without since", () => {
    const withSince = renderSummary(
      viewLedger({
        claims: [
          viewClaim("claim:skill", "skill-usage", {
            trackerWindow: "process-only",
            since: "2026-10-01T08:00:00.000Z",
          }),
        ],
      }),
    );
    expect(withSince).toContain(
      "Tracker: not measured for this session (the server tracker covers this process since 2026-10-01T08:00:00.000Z only).",
    );

    const withoutSince = renderSummary(
      viewLedger({
        skillUsage: null,
        claims: [
          viewClaim("claim:skill", "skill-usage", {
            trackerWindow: "process-only",
          }),
        ],
      }),
    );
    expect(withoutSince).toContain(
      "Tracker: not measured for this session (the server tracker covers this server process only).",
    );
  });

  it("renders empty-state sentence in ## Do next when no manager improvements exist", () => {
    const summary = renderSummary(viewLedger({ improvements: [] }));
    const lines = summary.split("\n");
    const doNextIdx = lines.indexOf("## Do next");
    expect(doNextIdx).toBeGreaterThan(-1);
    expect(lines[doNextIdx + 1]).toBe(
      "No actions suggested from the measured signals. This is not a judgment of session quality.",
    );
  });

  it("renders each manager improvement with exact 3-line format and 3-space indentation", () => {
    const improvements: LedgerImprovement[] = [
      {
        rule: "guardrail-answers",
        level: "act",
        destination: "permission-setup",
        audience: "manager",
        claimIds: ["claim:perm"],
        evidence: ["agg:claim:permission-answers:answers"],
        values: {
          answers: 10,
          allow: 8,
          deny: 2,
          targetsAtLeast3: 1,
          per100Tenths: 127,
        },
      },
      {
        rule: "cost-concentration",
        level: "watch",
        destination: "orchestration-config",
        audience: "manager",
        claimIds: ["claim:cost"],
        evidence: ["agg:claim:cost-drivers:costCentsMain"],
        values: {
          sharePercent: 65,
          cacheReadPerTurnMain: 30000,
          cacheReadPerTurnOthers: 8000,
          compactionsMain: 4,
          mainReadCalls: 25,
          mainEditCalls: 12,
          mainCoordinationCalls: 18,
          costCentsMain: 2000,
          costCentsMainReads: 1000,
          costCentsMainCoordination: 500,
        },
      },
      {
        rule: "unguarded-edits",
        level: "act",
        destination: "agent-routing",
        audience: "manager",
        claimIds: ["claim:routing"],
        evidence: ["agg:claim:routing-order:editEpisodesMain"],
        values: {
          editEpisodes: 20,
          unguardedEdits: 10,
          unguardedPercent: 50,
          byFilesTotal: 15,
          getSkillTotal: 2,
        },
      },
    ];

    const summary = renderSummary(viewLedger({ improvements }));
    const lines = summary.split("\n");
    const doNextIdx = lines.indexOf("## Do next");
    expect(doNextIdx).toBeGreaterThan(-1);

    // Rule 1: guardrail-answers
    expect(lines[doNextIdx + 1]).toBe(
      "1. [ACT] Permission answers: 10 (8 allowed, 2 denied)",
    );
    expect(lines[doNextIdx + 2]).toBe(
      "   Saw: the orchestrator answered 10 permission requests; 1 agents were answered 3 or more times; 2 were denials.",
    );
    expect(lines[doNextIdx + 3]).toBe(
      "   Change (permission setup): add repeated safe requests to the allowlist (allowed answers show setup gaps) and check what each denial asked for (denials show rule violations). Next time: permission answers per 100 turns (now 12.7).",
    );

    // Rule 2: cost-concentration
    expect(lines[doNextIdx + 4]).toBe(
      "2. [WATCH] Main agent carries 65% of observed cost",
    );
    expect(lines[doNextIdx + 5]).toBe(
      "   Saw: main runs at 30k cached tokens per turn (workers 8k) with 4 compactions; it made 25 reads, 12 edits and 18 coordination calls itself.",
    );
    expect(lines[doNextIdx + 6]).toBe(
      "   Change (orchestration config): check whether those reads and edits could be delegated; consider a turn limit per session and a cost alert. Next time: cached tokens per main turn (now 30k).",
    );

    // Rule 3: unguarded-edits
    expect(lines[doNextIdx + 7]).toBe(
      "3. [ACT] 10 of 20 edits ran without a file lookup",
    );
    expect(lines[doNextIdx + 8]).toBe(
      "   Saw: edit and file-write calls with no load_skills_for_files by the same agent since its last compaction; 15 file lookups vs 2 lookups by name.",
    );
    expect(lines[doNextIdx + 9]).toBe(
      "   Change (AGS routing): check the router trigger and the brief given to agents that edit files. Next time: unguarded edit share (now 50%).",
    );
  });

  it("renders human-intervention and agent-error-concentration manager rules and caps at 4", () => {
    const improvements: LedgerImprovement[] = [
      {
        rule: "human-intervention",
        level: "watch",
        destination: "orchestration-config",
        audience: "manager",
        claimIds: ["claim:perm"],
        evidence: [],
        values: {
          askCalls: 3,
          abortedStops: 1,
          per100Tenths: 25,
        },
      },
      {
        rule: "agent-error-concentration",
        level: "watch",
        destination: "provider-route-monitoring",
        audience: "manager",
        claimIds: [],
        evidence: [],
        values: {
          agents: 2,
          worstErrorStops: 6,
          worstTurns: 10,
        },
      },
      {
        rule: "guardrail-answers",
        level: "watch",
        destination: "permission-setup",
        audience: "manager",
        claimIds: [],
        evidence: [],
        values: {
          answers: 2,
          allow: 2,
          deny: 0,
          targetsAtLeast3: 0,
          per100Tenths: 10,
        },
      },
      // 4th item: printed, the cap is 4
      {
        rule: "unguarded-edits",
        level: "act",
        destination: "agent-routing",
        audience: "manager",
        claimIds: [],
        evidence: [],
        values: {
          editEpisodes: 10,
          unguardedEdits: 5,
          unguardedPercent: 50,
          byFilesTotal: 5,
          getSkillTotal: 1,
        },
      },
      // 5th item: should be omitted because the cap is 4
      {
        rule: "cost-concentration",
        level: "act",
        destination: "orchestration-config",
        audience: "manager",
        claimIds: [],
        evidence: [],
        values: { sharePercent: 61 },
      },
    ];

    const summary = renderSummary(viewLedger({ improvements }));
    const lines = summary.split("\n");
    const doNextIdx = lines.indexOf("## Do next");
    expect(doNextIdx).toBeGreaterThan(-1);

    expect(lines[doNextIdx + 1]).toBe(
      "1. [WATCH] Human interventions: 3 asks, 1 aborted stops",
    );
    expect(lines[doNextIdx + 2]).toBe(
      "   Saw: the agents asked a human or were stopped by one 2.5 times per 100 turns.",
    );
    expect(lines[doNextIdx + 3]).toBe(
      "   Change (orchestration config): check which of those decisions the setup could take without asking. Next time: asks and aborts per 100 turns (now 2.5).",
    );

    expect(lines[doNextIdx + 4]).toBe(
      "2. [WATCH] 2 agents ended at least half their turns in an error",
    );
    expect(lines[doNextIdx + 5]).toBe("   Saw: the worst: 6 of 10 turns.");
    expect(lines[doNextIdx + 6]).toBe(
      "   Change (provider route monitoring): read the error category of those records before changing any routing. Next time: agents above half error turns (now 2).",
    );

    expect(lines[doNextIdx + 7]).toBe(
      "3. [WATCH] Permission answers: 2 (2 allowed, 0 denied)",
    );

    expect(lines[doNextIdx + 10]).toBe(
      "4. [ACT] 5 of 10 edits ran without a file lookup",
    );
    // 5th item must NOT be printed
    expect(summary).not.toContain("5. [ACT]");
    expect(summary).not.toContain("Main agent carries 61% of observed cost");
  });

  it("omits ## For the maintainer when no maintainer improvements exist", () => {
    const summary = renderSummary(
      viewLedger({
        improvements: [
          {
            rule: "guardrail-answers",
            level: "act",
            destination: "permission-setup",
            audience: "manager",
            claimIds: [],
            evidence: [],
            values: {
              answers: 5,
              allow: 5,
              deny: 0,
              targetsAtLeast3: 0,
              per100Tenths: 20,
            },
          },
        ],
      }),
    );
    expect(summary).not.toContain("## For the maintainer");
  });

  it("renders ## For the maintainer with bullets when present", () => {
    const improvements: LedgerImprovement[] = [
      {
        rule: "coverage-gap",
        level: "watch",
        destination: "session-linkage",
        audience: "maintainer",
        claimIds: ["claim:cov"],
        evidence: [],
        values: {
          agentsCreated: 10,
          unlinkedAgents: 4,
        },
      },
      {
        rule: "tracker-not-measured",
        level: "watch",
        destination: "tracker-binding",
        audience: "maintainer",
        claimIds: ["claim:skill"],
        evidence: [],
        values: {},
      },
    ];

    const summary = renderSummary(viewLedger({ improvements }));
    const lines = summary.split("\n");
    const maintIdx = lines.indexOf("## For the maintainer");
    expect(maintIdx).toBeGreaterThan(-1);

    expect(lines[maintIdx + 1]).toBe(
      "- 4 of 10 created agents have no session file read; Paseo agent sessions cannot be linked from the session file alone (session-linkage).",
    );
    expect(lines[maintIdx + 2]).toBe(
      "- Server tracker numbers cover this process only, so lookups that matched nothing and bodies returned are not measured for this session (tracker-binding).",
    );
  });

  it("never prints skill names anywhere in the summary", () => {
    const hostSkillId = "deep-learning/super-advanced-transformer";
    const serverSkillId = "react/complex-server-actions";

    const ledger = viewLedger({
      hostSkills: {
        total: 10,
        unique: 2,
        top: [{ id: hostSkillId, reads: 10 }],
      },
      skillUsage: skillsSnapshot({
        skills: [
          {
            id: serverSkillId,
            returns: 5,
            firstAt: "2026-10-01T09:00:00.000Z",
            via: ["load_skills_for_files"],
          },
        ],
      }),
    });

    const summary = renderSummary(ledger);

    expect(summary).not.toContain(hostSkillId);
    expect(summary).not.toContain(serverSkillId);
    expect(summary).not.toContain("## Skills");
    expect(summary).not.toContain("## Leads");
    expect(summary).not.toContain("Top skills");
    expect(summary).not.toContain("Top host-read skills");
  });

  it("formats money, k-tokens, and rates accurately", () => {
    const ledger = viewLedger({
      coverageValues: { agentsCreated: 1, sessionsLinked: 1 },
      agents: [
        {
          label: "main",
          kind: "editing",
          turns: 80,
          costCents: 1234, // $12.34
          compactions: 1,
          cacheReadPerTurn: 4567, // 5k
          errorStops: 0,
          toolCalls: 10,
          toolErrors: 0,
          editCalls: 2,
          bashCalls: 1,
          readCalls: 7,
          agsLookups: 0,
          permissionAnswers: 0,
          model: "claude-3-5-sonnet",
        },
      ],
      claims: [
        viewClaim("claim:cost", "cost-drivers", {
          turnsMain: 80,
          costCentsMain: 1234,
          turnsOthers: 0,
          costCentsOthers: 0,
          cacheReadPerTurnMain: 4567, // Math.round(4567 / 1000) = 5k
          cacheReadPerTurnOthers: 0,
          compactionsMain: 1,
          postCompactionCacheReadPerTurnMain: 999, // 1k
          maxCacheReadMain: 14999, // 15k
          mainToolCalls: 10,
          mainReadCalls: 7,
          mainEditCalls: 2,
          mainBashCalls: 1,
          mainCoordinationCalls: 0,
          costCentsMainReads: 864, // $8.64
          costCentsMainCoordination: 0, // $0.00
        }),
      ],
    });

    const summary = renderSummary(ledger);
    expect(summary).toContain("$12.34 est.");
    expect(summary).toContain("at 5k cached tokens per turn (workers: none)");
    expect(summary).toContain(
      "Cost: main 80 turns, $12.34 est., 1 compaction (post-compaction floor 1k, peak 15k cached tokens per turn); workers 0 turns, $0.00 est.",
    );
    expect(summary).toContain(
      "call-share estimate: reads $8.64, coordination $0.00.",
    );
  });

  it("handles plural forms for single items vs multiple items", () => {
    const singularSummary = renderSummary(
      viewLedger({
        coverageValues: {
          agentsCreated: 1,
          agentsRead: 1,
          unlinkedAgents: 0,
          sessionsLinked: 1,
          sessions: 1,
          skippedLines: 1,
        },
        agents: [
          {
            label: "main",
            kind: "editing",
            turns: 1,
            costCents: 10,
            compactions: 0,
            cacheReadPerTurn: 1000,
            errorStops: 0,
            toolCalls: 1,
            toolErrors: 0,
            editCalls: 1,
            bashCalls: 0,
            readCalls: 0,
            agsLookups: 0,
            permissionAnswers: 0,
            model: "claude-3-5-sonnet",
          },
          {
            label: "worker-1",
            kind: "read-only",
            turns: 1,
            costCents: 5,
            compactions: 0,
            cacheReadPerTurn: 500,
            errorStops: 0,
            toolCalls: 1,
            toolErrors: 0,
            editCalls: 0,
            bashCalls: 0,
            readCalls: 1,
            agsLookups: 0,
            permissionAnswers: 0,
            model: "claude-3-5-haiku",
          },
        ],
        claims: [
          viewClaim("claim:cov", "coverage", {
            agentsCreated: 1,
            agentsRead: 1,
            unlinkedAgents: 0,
            sessionsLinked: 1,
            sessions: 1,
            skippedLines: 1,
          }),
        ],
      }),
    );

    expect(singularSummary).toContain("Delegation: 1 of 1 created agent read");
    expect(singularSummary).toContain(
      "Observed: main + 1 worker (1 of 1 created agent).",
    );
    expect(singularSummary).toContain(
      "Coverage: 1 of 1 created agent observed; observed workers: 1 read-only, 0 editing; 1 session read in full (1 line skipped).",
    );
  });

  it("renders exact ## Limits section bullets", () => {
    const summary = renderSummary(viewLedger());
    const lines = summary.split("\n");
    const limitsIdx = lines.indexOf("## Limits");
    expect(limitsIdx).toBeGreaterThan(-1);

    expect(lines[limitsIdx + 1]).toBe("- Counts show where to look, not why.");
    expect(lines[limitsIdx + 2]).toBe(
      "- Cost is a price-table estimate; call-share attribution is an estimate.",
    );
    expect(lines[limitsIdx + 3]).toBe(
      "- Agents without a read session file are not covered.",
    );
    expect(lines[limitsIdx + 4]).toBe(
      "- The root session is not verified against the host.",
    );
    expect(lines[limitsIdx + 5]).toBe(
      "- AGS lookups are counted, not whether the rules were followed.",
    );
  });

  it("renders byte-identically when called multiple times on the same ledger", () => {
    const ledger = viewLedger({
      claims: [
        viewClaim("claim:perm", "permission-answers", {
          answers: 2,
          allow: 2,
          deny: 0,
          other: 0,
          targets: 1,
          maxPerTarget: 2,
          targetsAtLeast3: 0,
          askCalls: 0,
          abortedStops: 0,
          turns: 10,
        }),
      ],
      improvements: [
        {
          rule: "guardrail-answers",
          level: "watch",
          destination: "permission-setup",
          audience: "manager",
          claimIds: [],
          evidence: [],
          values: {
            answers: 2,
            allow: 2,
            deny: 0,
            targetsAtLeast3: 0,
            per100Tenths: 200,
          },
        },
      ],
    });

    const run1 = renderSummary(ledger);
    const run2 = renderSummary(ledger);
    expect(run1).toBe(run2);
  });

  it("never includes forbidden verdict words in rendered summary", () => {
    const forbidden = /\b(wasted|failed agent|violation by [a-zA-Z0-9_-]+)\b/i;

    const fixtures = [
      viewLedger(),
      viewLedger({ coverage: "partial" }),
      viewLedger({ evidenceMode: "tracker-only" }),
      viewLedger({
        improvements: [
          {
            rule: "guardrail-answers",
            level: "act",
            destination: "permission-setup",
            audience: "manager",
            claimIds: [],
            evidence: [],
            values: {
              answers: 5,
              allow: 3,
              deny: 2,
              targetsAtLeast3: 1,
              per100Tenths: 50,
            },
          },
        ],
      }),
    ];

    for (const fixture of fixtures) {
      const text = renderSummary(fixture);
      expect(text).not.toMatch(forbidden);
    }
  });

  it("renders Scope line variants with and without folder and parent", () => {
    // 1. folder present with parent
    const withParent = renderSummary(
      viewLedger({
        session: "abcdef12",
        folder: { parent: "ags", name: "mcp-retrospective" },
      }),
    );
    expect(withParent.split("\n")[1]).toBe(
      "Scope: session abcdef12 | folder ags/mcp-retrospective | 2026-10-01T10:00:00.000Z to 2026-10-01T11:00:00.000Z",
    );

    // 2. folder present without parent
    const withoutParent = renderSummary(
      viewLedger({
        session: "abcdef12",
        folder: { parent: null, name: "repo" },
      }),
    );
    expect(withoutParent.split("\n")[1]).toBe(
      "Scope: session abcdef12 | folder repo | 2026-10-01T10:00:00.000Z to 2026-10-01T11:00:00.000Z",
    );

    // 3. folder null with session
    const nullFolder = renderSummary(
      viewLedger({
        session: "abcdef12",
        folder: null,
      }),
    );
    expect(nullFolder.split("\n")[1]).toBe(
      "Scope: session abcdef12 | 2026-10-01T10:00:00.000Z to 2026-10-01T11:00:00.000Z",
    );

    // 4. folder present in tracker-only (session: null)
    const trackerWithFolder = renderSummary(
      viewLedger({
        session: null,
        evidenceMode: "tracker-only",
        folder: { parent: "ags", name: "mcp-retrospective" },
      }),
    );
    expect(trackerWithFolder.split("\n")[1]).toBe(
      "Scope: folder ags/mcp-retrospective | 2026-10-01T10:00:00.000Z to 2026-10-01T11:00:00.000Z",
    );

    // 5. folder null in tracker-only (session: null)
    const trackerNullFolder = renderSummary(
      viewLedger({
        session: null,
        evidenceMode: "tracker-only",
        folder: null,
      }),
    );
    expect(trackerNullFolder.split("\n")[1]).toBe(
      "Scope: 2026-10-01T10:00:00.000Z to 2026-10-01T11:00:00.000Z",
    );
  });

  it("renders AGS lookups scorecard line with exact numbers and plural forms", () => {
    const pluralLedger = viewLedger({
      claims: [
        viewClaim("claim:routing", "routing-order", {
          lookupsMain: 12,
          lookupsOthers: 4,
          byFilesTotal: 8,
          byKeywordsTotal: 3,
          getSkillTotal: 1,
          agentsWithLookup: 2,
          agentsTotal: 3,
          editEpisodesMain: 10,
          unguardedEditsMain: 3,
          editEpisodesOthers: 5,
          unguardedEditsOthers: 2,
          overheadCalls: 2,
          hostSkillReadCalls: 0,
        }),
        viewClaim("claim:lookups", "ags-lookups", {
          calls: 15,
          noMatchCalls: 3,
          errorCalls: 2,
          bodiesReturned: 8,
          reusedBodies: 4,
          distinctSkills: 5,
          filesCalls: 7,
          filesNoMatch: 2,
          keywordsCalls: 5,
          keywordsNoMatch: 1,
          nameCalls: 3,
          nameNoMatch: 0,
        }),
      ],
    });

    const pluralSummary = renderSummary(pluralLedger);
    const pluralLines = pluralSummary.split("\n");
    const scoreIdx = pluralLines.indexOf("## Scorecards");
    expect(scoreIdx).toBeGreaterThan(-1);

    expect(pluralLines[scoreIdx + 2]).toContain("AGS routing: main");
    expect(pluralLines[scoreIdx + 3]).toBe(
      "AGS lookups: 8 skill bodies returned from 5 distinct skills; 3 of 15 lookups matched nothing; 4 already loaded; 2 errors. Calls by file 7 (2 matched nothing), by keyword 5 (1), by name 3 (0). Skill-level detail is in report.html.",
    );
    expect(pluralLines[scoreIdx + 4]).toContain(
      "Edits: 15 edit or file-write calls",
    );

    const singularLedger = viewLedger({
      claims: [
        viewClaim("claim:routing", "routing-order", {
          lookupsMain: 1,
          lookupsOthers: 0,
          byFilesTotal: 1,
          byKeywordsTotal: 0,
          getSkillTotal: 0,
          agentsWithLookup: 1,
          agentsTotal: 1,
          editEpisodesMain: 1,
          unguardedEditsMain: 0,
          editEpisodesOthers: 0,
          unguardedEditsOthers: 0,
          overheadCalls: 0,
          hostSkillReadCalls: 0,
        }),
        viewClaim("claim:lookups", "ags-lookups", {
          calls: 1,
          noMatchCalls: 1,
          errorCalls: 1,
          bodiesReturned: 1,
          reusedBodies: 0,
          distinctSkills: 1,
          filesCalls: 1,
          filesNoMatch: 1,
          keywordsCalls: 0,
          keywordsNoMatch: 0,
          nameCalls: 0,
          nameNoMatch: 0,
        }),
      ],
    });

    const singularSummary = renderSummary(singularLedger);
    const singularLines = singularSummary.split("\n");
    const singScoreIdx = singularLines.indexOf("## Scorecards");
    expect(singularLines[singScoreIdx + 3]).toBe(
      "AGS lookups: 1 skill body returned from 1 distinct skill; 1 of 1 lookup matched nothing; 0 already loaded; 1 error. Calls by file 1 (1 matched nothing), by keyword 0 (0), by name 0 (0). Skill-level detail is in report.html.",
    );
  });

  it("omits AGS lookups line when calls is zero or claim is absent", () => {
    const zeroCallsSummary = renderSummary(
      viewLedger({
        claims: [
          viewClaim("claim:routing", "routing-order", {
            lookupsMain: 0,
            lookupsOthers: 0,
            byFilesTotal: 0,
            byKeywordsTotal: 0,
            getSkillTotal: 0,
            agentsWithLookup: 0,
            agentsTotal: 1,
            editEpisodesMain: 0,
            unguardedEditsMain: 0,
            editEpisodesOthers: 0,
            unguardedEditsOthers: 0,
            overheadCalls: 0,
            hostSkillReadCalls: 0,
          }),
          viewClaim("claim:lookups", "ags-lookups", {
            calls: 0,
            noMatchCalls: 0,
            errorCalls: 0,
            bodiesReturned: 0,
            reusedBodies: 0,
            distinctSkills: 0,
            filesCalls: 0,
            filesNoMatch: 0,
            keywordsCalls: 0,
            keywordsNoMatch: 0,
            nameCalls: 0,
            nameNoMatch: 0,
          }),
        ],
      }),
    );
    expect(
      zeroCallsSummary
        .split("\n")
        .some(
          (line) =>
            line.startsWith("AGS lookups: ") && line.includes("returned from"),
        ),
    ).toBe(false);

    const noClaimSummary = renderSummary(
      viewLedger({
        claims: [
          viewClaim("claim:routing", "routing-order", {
            lookupsMain: 5,
            lookupsOthers: 0,
            byFilesTotal: 5,
            byKeywordsTotal: 0,
            getSkillTotal: 0,
            agentsWithLookup: 1,
            agentsTotal: 1,
            editEpisodesMain: 0,
            unguardedEditsMain: 0,
            editEpisodesOthers: 0,
            unguardedEditsOthers: 0,
            overheadCalls: 0,
            hostSkillReadCalls: 0,
          }),
        ],
      }),
    );
    expect(
      noClaimSummary
        .split("\n")
        .some(
          (line) =>
            line.startsWith("AGS lookups: ") && line.includes("returned from"),
        ),
    ).toBe(false);
  });

  it("renders lookup-misses manager improvement card with exact wording", () => {
    const improvements: LedgerImprovement[] = [
      {
        rule: "lookup-misses" as LedgerImprovement["rule"],
        level: "watch",
        destination: "agent-routing",
        audience: "manager",
        claimIds: ["claim:lookups"],
        evidence: [
          "agg:claim:ags-lookups:calls",
          "agg:claim:ags-lookups:noMatchCalls",
        ],
        values: {
          calls: 20,
          noMatchCalls: 6,
          percent: 30,
          filesNoMatch: 4,
          keywordsNoMatch: 2,
        },
      },
    ];

    const summary = renderSummary(viewLedger({ improvements }));
    const lines = summary.split("\n");
    const doNextIdx = lines.indexOf("## Do next");
    expect(doNextIdx).toBeGreaterThan(-1);

    expect(lines[doNextIdx + 1]).toBe(
      "1. [WATCH] 6 of 20 lookups matched nothing",
    );
    expect(lines[doNextIdx + 2]).toBe(
      "   Saw: AGS returned no skill for 30% of lookups (4 by file, 2 by keyword).",
    );
    expect(lines[doNextIdx + 3]).toBe(
      "   Change (AGS routing): check the trigger words and file patterns of the skills these lookups should have found, and the file types the lookups were for. Next time: lookups that matched nothing (now 30%).",
    );
  });

  it("does not leak skill names or ids anywhere in summary.md even when ledger.lookups has skill ids", () => {
    const summary = renderSummary(
      viewLedger({
        lookups: {
          tools: [
            {
              tool: "load_skills_for_files",
              calls: 10,
              noMatchCalls: 2,
              errorCalls: 0,
              bodiesReturned: 8,
              reusedBodies: 2,
              mainCalls: 6,
              workerCalls: 4,
            },
          ],
          skills: [
            {
              id: "typescript/strict-types",
              returns: 5,
              mainReturns: 3,
              workerReturns: 2,
            },
            {
              id: "database/postgres-pool",
              returns: 3,
              mainReturns: 1,
              workerReturns: 2,
            },
          ],
          distinctSkills: 2,
          otherSkillReturns: 0,
          unvalidatedReturns: 0,
          capped: false,
        },
        claims: [
          viewClaim("claim:routing", "routing-order", {
            lookupsMain: 6,
            lookupsOthers: 4,
            byFilesTotal: 10,
            byKeywordsTotal: 0,
            getSkillTotal: 0,
            agentsWithLookup: 2,
            agentsTotal: 2,
            editEpisodesMain: 2,
            unguardedEditsMain: 0,
            editEpisodesOthers: 0,
            unguardedEditsOthers: 0,
            overheadCalls: 0,
            hostSkillReadCalls: 0,
          }),
          viewClaim("claim:lookups", "ags-lookups", {
            calls: 10,
            noMatchCalls: 2,
            errorCalls: 0,
            bodiesReturned: 8,
            reusedBodies: 2,
            distinctSkills: 2,
            filesCalls: 10,
            filesNoMatch: 2,
            keywordsCalls: 0,
            keywordsNoMatch: 0,
            nameCalls: 0,
            nameNoMatch: 0,
          }),
        ],
      }),
    );

    expect(summary).toContain(
      "AGS lookups: 8 skill bodies returned from 2 distinct skills;",
    );
    expect(summary).not.toContain("typescript/strict-types");
    expect(summary).not.toContain("strict-types");
    expect(summary).not.toContain("database/postgres-pool");
    expect(summary).not.toContain("postgres-pool");
  });

  it("fits 80-line and 8192-byte budget when AGS lookups and lookup-misses are present", () => {
    const improvements: LedgerImprovement[] = [
      {
        rule: "guardrail-answers",
        level: "act",
        destination: "permission-setup",
        audience: "manager",
        claimIds: ["claim:perm"],
        evidence: ["agg:claim:permission-answers:answers"],
        values: {
          answers: 5,
          allow: 4,
          deny: 1,
          targetsAtLeast3: 1,
          per100Tenths: 125,
        },
      },
      {
        rule: "cost-concentration",
        level: "watch",
        destination: "orchestration-config",
        audience: "manager",
        claimIds: ["claim:cost"],
        evidence: ["agg:claim:cost-drivers:costCentsMain"],
        values: {
          sharePercent: 62,
          cacheReadPerTurnMain: 25000,
          cacheReadPerTurnOthers: 5000,
          compactionsMain: 2,
          mainReadCalls: 30,
          mainEditCalls: 10,
          mainCoordinationCalls: 15,
        },
      },
      {
        rule: "unguarded-edits",
        level: "watch",
        destination: "agent-routing",
        audience: "manager",
        claimIds: ["claim:routing"],
        evidence: ["agg:claim:routing-order:unguardedEditsMain"],
        values: {
          unguardedEdits: 5,
          editEpisodes: 15,
          byFilesTotal: 8,
          getSkillTotal: 1,
          unguardedPercent: 33,
        },
      },
      {
        rule: "lookup-misses" as LedgerImprovement["rule"],
        level: "watch",
        destination: "agent-routing",
        audience: "manager",
        claimIds: ["claim:lookups"],
        evidence: ["agg:claim:ags-lookups:noMatchCalls"],
        values: {
          calls: 15,
          noMatchCalls: 3,
          percent: 20,
          filesNoMatch: 2,
          keywordsNoMatch: 1,
        },
      },
      {
        rule: "coverage-gap",
        level: "watch",
        destination: "session-linkage",
        audience: "maintainer",
        claimIds: [COVERAGE_ID],
        evidence: ["agg:claim:coverage:unlinkedAgents"],
        values: {
          unlinkedAgents: 1,
          agentsCreated: 5,
        },
      },
      {
        rule: "tracker-not-measured",
        level: "watch",
        destination: "tracker-binding",
        audience: "maintainer",
        claimIds: ["claim:skill"],
        evidence: ["agg:claim:skill-usage:trackerWindow"],
        values: {},
      },
    ];

    const ledger = viewLedger({
      coverageValues: {
        agentsCreated: 5,
        sessionsLinked: 3,
        sessions: 2,
        skippedLines: 0,
      },
      folder: { parent: "ags", name: "mcp-retrospective" },
      agents: [
        {
          label: "main",
          kind: "editing",
          turns: 100,
          costCents: 1550,
          compactions: 2,
          cacheReadPerTurn: 25000,
          errorStops: 0,
          toolCalls: 60,
          toolErrors: 0,
          editCalls: 10,
          bashCalls: 5,
          readCalls: 30,
          agsLookups: 12,
          permissionAnswers: 5,
          model: "claude-3-5-sonnet",
        },
      ],
      claims: [
        viewClaim("claim:perm", "permission-answers", {
          answers: 5,
          allow: 4,
          deny: 1,
          targetsAtLeast3: 1,
          turns: 40,
        }),
        viewClaim("claim:cost", "cost-drivers", {
          turnsMain: 100,
          costCentsMain: 1550,
          turnsOthers: 50,
          costCentsOthers: 950,
          cacheReadPerTurnMain: 25000,
          cacheReadPerTurnOthers: 5000,
          compactionsMain: 2,
          postCompactionCacheReadPerTurnMain: 12000,
          maxCacheReadMain: 45000,
          mainToolCalls: 60,
          mainReadCalls: 30,
          mainEditCalls: 10,
          mainBashCalls: 5,
          mainCoordinationCalls: 15,
          costCentsMainReads: 775,
          costCentsMainCoordination: 388,
        }),
        viewClaim("claim:routing", "routing-order", {
          lookupsMain: 12,
          lookupsOthers: 4,
          byFilesTotal: 8,
          byKeywordsTotal: 3,
          getSkillTotal: 1,
          agentsWithLookup: 2,
          agentsTotal: 3,
          editEpisodesMain: 10,
          unguardedEditsMain: 3,
          editEpisodesOthers: 5,
          unguardedEditsOthers: 2,
          overheadCalls: 2,
          hostSkillReadCalls: 0,
        }),
        viewClaim("claim:lookups", "ags-lookups", {
          calls: 15,
          noMatchCalls: 3,
          errorCalls: 2,
          bodiesReturned: 8,
          reusedBodies: 4,
          distinctSkills: 5,
          filesCalls: 7,
          filesNoMatch: 2,
          keywordsCalls: 5,
          keywordsNoMatch: 1,
          nameCalls: 3,
          nameNoMatch: 0,
        }),
        viewClaim("claim:skill", "skill-usage", {
          trackerWindow: "matches-session",
          noMatchCalls: 1,
          loadCalls: 3,
          bodyReturns: 2,
        }),
      ],
      improvements,
    });

    const summary = renderSummary(ledger);
    const lines = summary.split("\n");

    expect(lines.length).toBeLessThanOrEqual(80);
    expect(Buffer.byteLength(summary, "utf8")).toBeLessThanOrEqual(8192);
    expect(summary).toContain(
      "AGS lookups: 8 skill bodies returned from 5 distinct skills;",
    );
    expect(summary).toContain("3 of 15 lookups matched nothing");
  });
  describe("contract v3.2 summary extensions", () => {
    it("renders Title line after Scope line when ledger.label is non-null", () => {
      const ledger = viewLedger({
        label: "Refactor session retrospective MCP server",
      });
      const summary = renderSummary(ledger);
      const lines = summary.split("\n");
      expect(lines[1]).toContain("Scope:");
      expect(lines[2]).toBe(
        "Title: Refactor session retrospective MCP server (agent-supplied, unverified)",
      );
      expect(lines[3]).toBe("");
      expect(lines[4]).toBe("## Bottom line");
    });

    it("omits Title line when ledger.label is null", () => {
      const ledger = viewLedger({
        label: null,
      });
      const summary = renderSummary(ledger);
      const lines = summary.split("\n");
      expect(lines[1]).toContain("Scope:");
      expect(lines[2]).toBe("");
      expect(lines[3]).toBe("## Bottom line");
      expect(summary).not.toContain("Title:");
    });

    it("renders Tool failures scorecard line with top 3 toolRows and plural tool calls", () => {
      const ledger = viewLedger({
        claims: [
          viewClaim("claim:tool-errors", "tool-errors", {
            toolCalls: 25,
            failedToolCalls: 7,
          }),
        ],
        toolRows: [
          { tool: "bash", calls: 10, errors: 4 },
          { tool: "read", calls: 8, errors: 2 },
          { tool: "write", calls: 4, errors: 1 },
          { tool: "edit", calls: 3, errors: 1 },
        ],
      });
      const summary = renderSummary(ledger);
      expect(summary).toContain(
        "Tool failures: 7 of 25 tool calls returned an error (bash x4, read x2, write x1).",
      );
    });

    it("renders Tool failures scorecard line with singular tool call and single tool error", () => {
      const ledger = viewLedger({
        claims: [
          viewClaim("claim:tool-errors", "tool-errors", {
            toolCalls: 1,
            failedToolCalls: 1,
          }),
        ],
        toolRows: [{ tool: "bash", calls: 1, errors: 1 }],
      });
      const summary = renderSummary(ledger);
      expect(summary).toContain(
        "Tool failures: 1 of 1 tool call returned an error (bash x1).",
      );
    });

    it("renders Tool failures scorecard line with zero errors without parenthesis", () => {
      const ledger = viewLedger({
        claims: [
          viewClaim("claim:tool-errors", "tool-errors", {
            toolCalls: 5,
            failedToolCalls: 0,
          }),
        ],
        toolRows: [],
      });
      const summary = renderSummary(ledger);
      expect(summary).toContain(
        "Tool failures: 0 of 5 tool calls returned an error.",
      );
      expect(summary).not.toContain(
        "Tool failures: 0 of 5 tool calls returned an error (",
      );
    });

    it("omits Tool failures scorecard line when tool-errors claim is absent", () => {
      const ledger = viewLedger({
        claims: [],
        toolRows: [{ tool: "bash", calls: 5, errors: 2 }],
      });
      const summary = renderSummary(ledger);
      expect(summary).not.toContain("Tool failures:");
    });

    it("omits Tool failures scorecard line when toolCalls is zero", () => {
      const ledger = viewLedger({
        claims: [
          viewClaim("claim:tool-errors", "tool-errors", {
            toolCalls: 0,
            failedToolCalls: 0,
          }),
        ],
        toolRows: [],
      });
      const summary = renderSummary(ledger);
      expect(summary).not.toContain("Tool failures:");
    });

    it("renders Error stops scorecard line with both highest rate and most stops cells", () => {
      const ledger = viewLedger({
        claims: [
          viewClaim("claim:error-stops", "error-stop-exposure", {
            errorStops: 5,
            turns: 20,
            topCell: "2026-10-01|gpt-4",
            topCellErrorStops: 3,
            topCellTurns: 6,
            busiestCell: "2026-10-02|claude",
            busiestCellErrorStops: 4,
            busiestCellTurns: 10,
          }),
        ],
      });
      const summary = renderSummary(ledger);
      expect(summary).toContain(
        "Error stops: 5 across 20 assistant turns. Highest rate: 2026-10-01|gpt-4 (3 of 6 turns). Most stops: 2026-10-02|claude (4 of 10 turns).",
      );
    });

    it("renders Error stops scorecard line with singular assistant turn and turn count", () => {
      const ledger = viewLedger({
        claims: [
          viewClaim("claim:error-stops", "error-stop-exposure", {
            errorStops: 1,
            turns: 1,
            topCell: "2026-10-01|gpt-4",
            topCellErrorStops: 1,
            topCellTurns: 1,
            busiestCell: "2026-10-01|gpt-4",
            busiestCellErrorStops: 1,
            busiestCellTurns: 1,
          }),
        ],
      });
      const summary = renderSummary(ledger);
      expect(summary).toContain(
        "Error stops: 1 across 1 assistant turn. Highest rate: 2026-10-01|gpt-4 (1 of 1 turn). Most stops: 2026-10-01|gpt-4 (1 of 1 turn).",
      );
    });

    it("renders Error stops scorecard line with only most stops when topCell is absent", () => {
      const ledger = viewLedger({
        claims: [
          viewClaim("claim:error-stops", "error-stop-exposure", {
            errorStops: 2,
            turns: 4,
            busiestCell: "2026-10-01|gpt-4",
            busiestCellErrorStops: 2,
            busiestCellTurns: 4,
          }),
        ],
      });
      const summary = renderSummary(ledger);
      expect(summary).toContain(
        "Error stops: 2 across 4 assistant turns. Most stops: 2026-10-01|gpt-4 (2 of 4 turns).",
      );
      expect(summary).not.toContain("Highest rate:");
    });

    it("renders Error stops scorecard line with base count only when no cells are named", () => {
      const ledger = viewLedger({
        claims: [
          viewClaim("claim:error-stops", "error-stop-exposure", {
            errorStops: 2,
            turns: 10,
          }),
        ],
      });
      const summary = renderSummary(ledger);
      expect(summary).toContain("Error stops: 2 across 10 assistant turns.");
      expect(summary).not.toContain("Highest rate:");
      expect(summary).not.toContain("Most stops:");
    });

    it("omits Error stops scorecard line when error-stop-exposure claim is absent", () => {
      const ledger = viewLedger({
        claims: [],
      });
      const summary = renderSummary(ledger);
      expect(summary).not.toContain("Error stops:");
    });

    it("omits Error stops scorecard line when errorStops is zero", () => {
      const ledger = viewLedger({
        claims: [
          viewClaim("claim:error-stops", "error-stop-exposure", {
            errorStops: 0,
            turns: 10,
          }),
        ],
      });
      const summary = renderSummary(ledger);
      expect(summary).not.toContain("Error stops:");
    });

    it("renders Outcome scorecard line for git source with plural commits, files, reverts and merges", () => {
      const ledger = viewLedger({
        outcome: {
          source: "git",
          branch: "feat/mcp-native-retrospective",
          commits: 4,
          revertCommits: 2,
          mergeCommits: 2,
          filesChanged: 8,
          insertions: 120,
          deletions: 45,
          windowFrom: "2026-10-01T00:00:00.000Z",
          windowTo: "2026-10-01T12:00:00.000Z",
        },
      });
      const summary = renderSummary(ledger);
      expect(summary).toContain(
        "Outcome: 4 commits in the session window (8 files changed, +120 -45), 2 reverts, 2 merge commits; branch now feat/mcp-native-retrospective.",
      );
    });

    it("renders Outcome scorecard line for git source with singular commit, file, revert and merge", () => {
      const ledger = viewLedger({
        outcome: {
          source: "git",
          branch: "main",
          commits: 1,
          revertCommits: 1,
          mergeCommits: 1,
          filesChanged: 1,
          insertions: 5,
          deletions: 2,
          windowFrom: "2026-10-01T00:00:00.000Z",
          windowTo: "2026-10-01T12:00:00.000Z",
        },
      });
      const summary = renderSummary(ledger);
      expect(summary).toContain(
        "Outcome: 1 commit in the session window (1 file changed, +5 -2), 1 revert, 1 merge commit; branch now main.",
      );
    });

    it("renders Outcome scorecard line for git source with zero reverts and merge commits", () => {
      const ledger = viewLedger({
        outcome: {
          source: "git",
          branch: "main",
          commits: 2,
          revertCommits: 0,
          mergeCommits: 0,
          filesChanged: 3,
          insertions: 50,
          deletions: 10,
          windowFrom: "2026-10-01T00:00:00.000Z",
          windowTo: "2026-10-01T12:00:00.000Z",
        },
      });
      const summary = renderSummary(ledger);
      expect(summary).toContain(
        "Outcome: 2 commits in the session window (3 files changed, +50 -10), 0 reverts, 0 merge commits; branch now main.",
      );
    });

    it("renders Outcome scorecard line for git source when branch is null as detached HEAD", () => {
      const ledger = viewLedger({
        outcome: {
          source: "git",
          branch: null,
          commits: 3,
          revertCommits: 0,
          mergeCommits: 1,
          filesChanged: 2,
          insertions: 25,
          deletions: 8,
          windowFrom: "2026-10-01T00:00:00.000Z",
          windowTo: "2026-10-01T12:00:00.000Z",
        },
      });
      const summary = renderSummary(ledger);
      expect(summary).toContain(
        "Outcome: 3 commits in the session window (2 files changed, +25 -8), 0 reverts, 1 merge commit; branch now detached HEAD.",
      );
    });

    it("renders Outcome scorecard line for unavailable source with each reason variant", () => {
      const reasons = [
        {
          reason: "folder-missing",
          expected: "Outcome: not measured (session folder missing).",
        },
        {
          reason: "not-a-repo",
          expected: "Outcome: not measured (not a git repository).",
        },
        {
          reason: "git-error",
          expected: "Outcome: not measured (git could not be read safely).",
        },
        {
          reason: "not-measured",
          expected: "Outcome: not measured (not measured for this run).",
        },
      ] as const;

      for (const { reason, expected } of reasons) {
        const ledger = viewLedger({
          outcome: { source: "unavailable", reason },
        });
        const summary = renderSummary(ledger);
        expect(summary).toContain(expected);
      }
    });

    it("renders scorecard lines in exact order (Guardrails, Cost, Tool failures, Error stops, AGS routing, Coverage, Outcome)", () => {
      const ledger = viewLedger({
        claims: [
          viewClaim("claim:perm", "permission-answers", {
            answers: 2,
            allow: 2,
            deny: 0,
            other: 0,
            targets: 1,
            maxPerTarget: 2,
            targetsAtLeast3: 0,
            askCalls: 0,
            abortedStops: 0,
            turns: 20,
          }),
          viewClaim("claim:cost", "cost-drivers", {
            turnsMain: 20,
            costCentsMain: 200,
            turnsOthers: 0,
            costCentsOthers: 0,
            cacheReadPerTurnMain: 10000,
            cacheReadPerTurnOthers: 0,
            compactionsMain: 0,
            postCompactionCacheReadPerTurnMain: 0,
            maxCacheReadMain: 10000,
            mainToolCalls: 10,
            mainReadCalls: 5,
            mainEditCalls: 3,
            mainBashCalls: 2,
            mainCoordinationCalls: 0,
            costCentsMainReads: 100,
            costCentsMainCoordination: 0,
          }),
          viewClaim("claim:tool-errors", "tool-errors", {
            toolCalls: 10,
            failedToolCalls: 2,
          }),
          viewClaim("claim:error-stops", "error-stop-exposure", {
            errorStops: 1,
            turns: 20,
            busiestCell: "2026-10-01|gpt-4",
            busiestCellErrorStops: 1,
            busiestCellTurns: 20,
          }),
          viewClaim("claim:routing", "routing-order", {
            lookupsMain: 1,
            lookupsOthers: 0,
            byFilesTotal: 1,
            byKeywordsTotal: 0,
            getSkillTotal: 0,
            agentsWithLookup: 1,
            agentsTotal: 1,
            editEpisodesMain: 3,
            unguardedEditsMain: 0,
            editEpisodesOthers: 0,
            unguardedEditsOthers: 0,
            overheadCalls: 0,
            hostSkillReadCalls: 0,
          }),
        ],
        toolRows: [{ tool: "bash", calls: 2, errors: 2 }],
        outcome: {
          source: "git",
          branch: "main",
          commits: 1,
          revertCommits: 0,
          mergeCommits: 0,
          filesChanged: 1,
          insertions: 10,
          deletions: 2,
          windowFrom: "2026-10-01T00:00:00.000Z",
          windowTo: "2026-10-01T12:00:00.000Z",
        },
      });

      const summary = renderSummary(ledger);
      const lines = summary.split("\n");
      const scoreIdx = lines.indexOf("## Scorecards");
      expect(scoreIdx).toBeGreaterThan(-1);

      expect(lines[scoreIdx + 1]).toContain("Guardrails:");
      expect(lines[scoreIdx + 2]).toContain("Cost:");
      expect(lines[scoreIdx + 3]).toBe(
        "Tool failures: 2 of 10 tool calls returned an error (bash x2).",
      );
      expect(lines[scoreIdx + 4]).toBe(
        "Error stops: 1 across 20 assistant turns. Most stops: 2026-10-01|gpt-4 (1 of 20 turns).",
      );
      expect(lines[scoreIdx + 5]).toContain("AGS routing:");
      expect(lines[scoreIdx + 6]).toContain("Edits:");
      expect(lines[scoreIdx + 7]).toContain("Coverage:");
      expect(lines[scoreIdx + 8]).toBe(
        "Outcome: 1 commit in the session window (1 file changed, +10 -2), 0 reverts, 0 merge commits; branch now main.",
      );
    });

    it("enforces 80-line ceiling and truncates lines exceeding 80", () => {
      const manyImprovements: LedgerImprovement[] = Array.from(
        { length: 30 },
        (_, i) => ({
          rule: "guardrail-answers",
          level: "act",
          destination: "permission-setup",
          audience: "manager",
          claimIds: [],
          evidence: [],
          values: {
            answers: 10 + i,
            allow: 5,
            deny: 5 + i,
            targetsAtLeast3: 1,
            per100Tenths: 100 + i,
          },
        }),
      );

      const ledger = viewLedger({
        improvements: manyImprovements,
      });
      const summary = renderSummary(ledger);
      const lines = summary.split("\n");
      expect(lines.length).toBeLessThanOrEqual(80);
      expect(Buffer.byteLength(summary, "utf8")).toBeLessThanOrEqual(8192);
    });

    it("does not output any skill names in the summary", () => {
      const ledger = viewLedger({
        label: "Session testing skill anonymity",
        claims: [
          viewClaim("claim:tool-errors", "tool-errors", {
            toolCalls: 5,
            failedToolCalls: 1,
          }),
          viewClaim("claim:error-stops", "error-stop-exposure", {
            errorStops: 1,
            turns: 10,
            busiestCell: "2026-10-01|gpt-4",
            busiestCellErrorStops: 1,
            busiestCellTurns: 10,
          }),
        ],
        toolRows: [{ tool: "bash", calls: 2, errors: 1 }],
        outcome: {
          source: "git",
          branch: "main",
          commits: 1,
          revertCommits: 0,
          mergeCommits: 0,
          filesChanged: 1,
          insertions: 5,
          deletions: 1,
          windowFrom: "2026-10-01T00:00:00.000Z",
          windowTo: "2026-10-01T12:00:00.000Z",
        },
      });
      const summary = renderSummary(ledger);
      expect(summary).not.toContain("common-best-practices");
      expect(summary).not.toContain("typescript-language");
      expect(summary).not.toContain("skill://");
    });
  });

  describe("contract v3.3 permission requests (Slice G3)", () => {
    it("omits Permission requests line when permissionRequests is null", () => {
      const ledger = viewLedger({ permissionRequests: null });
      const summary = renderSummary(ledger);
      expect(summary).not.toContain("Permission requests:");
      const lines = summary.split("\n");
      const guardIdx = lines.findIndex((l) => l.startsWith("Guardrails:"));
      expect(guardIdx).toBeGreaterThan(-1);
      expect(lines[guardIdx + 1]?.startsWith("Permission requests:")).toBe(
        false,
      );
    });

    it("renders exact line with plural forms, top-3 tools, and top-5 programs", () => {
      const ledger = viewLedger({
        permissionRequests: {
          asked: 5,
          answered: 4,
          unanswered: 1,
          answeredWithoutRequest: 0,
          agentsAsked: 2,
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
              name: "read",
              asked: 1,
              allow: 0,
              deny: 0,
              other: 0,
              unanswered: 1,
            },
          ],
          programs: [
            {
              name: "git",
              asked: 3,
              allow: 2,
              deny: 1,
              other: 0,
              unanswered: 0,
            },
            {
              name: "curl",
              asked: 1,
              allow: 1,
              deny: 0,
              other: 0,
              unanswered: 0,
            },
          ],
          distinctPrograms: 2,
        },
        claims: [
          viewClaim(
            "claim:perm-req",
            "permission-requests" as unknown as Claim["template"],
            {
              asked: 5,
              answered: 4,
              unanswered: 1,
              answeredWithoutRequest: 0,
              agentsAsked: 2,
              allowed: 3,
              denied: 1,
              bashAsked: 4,
              distinctPrograms: 2,
              otherVerdict: 0,
            },
          ),
        ],
      });
      const summary = renderSummary(ledger);
      const lines = summary.split("\n");
      const guardIdx = lines.findIndex((l) => l.startsWith("Guardrails:"));
      expect(guardIdx).toBeGreaterThan(-1);
      expect(lines[guardIdx + 1]).toBe(
        "Permission requests: 5 requests from 2 agents; 4 answered (3 allowed, 1 denied), 1 unanswered. By tool: bash 4, read 1. Top programs: git 3 (2 allowed, 1 denied), curl 1 (1 allowed, 0 denied).",
      );
    });

    it("renders singular variants for 1 request and 1 agent", () => {
      const ledger = viewLedger({
        permissionRequests: {
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
          distinctPrograms: 1,
        },
        claims: [
          viewClaim(
            "claim:perm-req",
            "permission-requests" as unknown as Claim["template"],
            {
              asked: 1,
              answered: 1,
              unanswered: 0,
              answeredWithoutRequest: 0,
              agentsAsked: 1,
              allowed: 1,
              denied: 0,
              bashAsked: 1,
              distinctPrograms: 1,
              otherVerdict: 0,
            },
          ),
        ],
      });
      const summary = renderSummary(ledger);
      const lines = summary.split("\n");
      const guardIdx = lines.findIndex((l) => l.startsWith("Guardrails:"));
      expect(guardIdx).toBeGreaterThan(-1);
      expect(lines[guardIdx + 1]).toBe(
        "Permission requests: 1 request from 1 agent; 1 answered (1 allowed, 0 denied), 0 unanswered. By tool: bash 1. Top programs: git 1 (1 allowed, 0 denied).",
      );
    });

    it("renders zero plural variants when counts are zero", () => {
      const ledger = viewLedger({
        permissionRequests: {
          asked: 0,
          answered: 0,
          unanswered: 0,
          answeredWithoutRequest: 0,
          agentsAsked: 0,
          tools: [],
          programs: [],
          distinctPrograms: 0,
        },
        claims: [
          viewClaim(
            "claim:perm-req",
            "permission-requests" as unknown as Claim["template"],
            {
              asked: 0,
              answered: 0,
              unanswered: 0,
              answeredWithoutRequest: 0,
              agentsAsked: 0,
              allowed: 0,
              denied: 0,
              bashAsked: 0,
              distinctPrograms: 0,
              otherVerdict: 0,
            },
          ),
        ],
      });
      const summary = renderSummary(ledger);
      const lines = summary.split("\n");
      const guardIdx = lines.findIndex((l) => l.startsWith("Guardrails:"));
      expect(guardIdx).toBeGreaterThan(-1);
      expect(lines[guardIdx + 1]).toBe(
        "Permission requests: 0 requests from 0 agents; 0 answered (0 allowed, 0 denied), 0 unanswered.",
      );
    });

    it("omits By tool and Top programs sentences when the lists are empty", () => {
      const ledger = viewLedger({
        permissionRequests: {
          asked: 2,
          answered: 2,
          unanswered: 0,
          answeredWithoutRequest: 0,
          agentsAsked: 1,
          tools: [],
          programs: [],
          distinctPrograms: 0,
        },
        claims: [
          viewClaim(
            "claim:perm-req",
            "permission-requests" as unknown as Claim["template"],
            {
              asked: 2,
              answered: 2,
              unanswered: 0,
              answeredWithoutRequest: 0,
              agentsAsked: 1,
              allowed: 2,
              denied: 0,
              bashAsked: 0,
              distinctPrograms: 0,
              otherVerdict: 0,
            },
          ),
        ],
      });
      const summary = renderSummary(ledger);
      const lines = summary.split("\n");
      const guardIdx = lines.findIndex((l) => l.startsWith("Guardrails:"));
      expect(guardIdx).toBeGreaterThan(-1);
      expect(lines[guardIdx + 1]).toBe(
        "Permission requests: 2 requests from 1 agent; 2 answered (2 allowed, 0 denied), 0 unanswered.",
      );
      expect(lines[guardIdx + 1]).not.toContain("By tool:");
      expect(lines[guardIdx + 1]).not.toContain("Top programs:");
    });

    it("omits Top programs sentence when programs list is empty but tools list is present", () => {
      const ledger = viewLedger({
        permissionRequests: {
          asked: 1,
          answered: 1,
          unanswered: 0,
          answeredWithoutRequest: 0,
          agentsAsked: 1,
          tools: [
            {
              name: "edit",
              asked: 1,
              allow: 1,
              deny: 0,
              other: 0,
              unanswered: 0,
            },
          ],
          programs: [],
          distinctPrograms: 0,
        },
        claims: [
          viewClaim(
            "claim:perm-req",
            "permission-requests" as unknown as Claim["template"],
            {
              asked: 1,
              answered: 1,
              unanswered: 0,
              answeredWithoutRequest: 0,
              agentsAsked: 1,
              allowed: 1,
              denied: 0,
              bashAsked: 0,
              distinctPrograms: 0,
              otherVerdict: 0,
            },
          ),
        ],
      });
      const summary = renderSummary(ledger);
      const lines = summary.split("\n");
      const guardIdx = lines.findIndex((l) => l.startsWith("Guardrails:"));
      expect(guardIdx).toBeGreaterThan(-1);
      expect(lines[guardIdx + 1]).toBe(
        "Permission requests: 1 request from 1 agent; 1 answered (1 allowed, 0 denied), 0 unanswered. By tool: edit 1.",
      );
      expect(lines[guardIdx + 1]).not.toContain("Top programs:");
    });

    it("enforces top-3 cap on tools and top-5 cap on programs", () => {
      const ledger = viewLedger({
        permissionRequests: {
          asked: 30,
          answered: 28,
          unanswered: 2,
          answeredWithoutRequest: 0,
          agentsAsked: 3,
          tools: [
            {
              name: "bash",
              asked: 10,
              allow: 8,
              deny: 2,
              other: 0,
              unanswered: 0,
            },
            {
              name: "edit",
              asked: 8,
              allow: 7,
              deny: 1,
              other: 0,
              unanswered: 0,
            },
            {
              name: "read",
              asked: 6,
              allow: 6,
              deny: 0,
              other: 0,
              unanswered: 0,
            },
            {
              name: "write",
              asked: 4,
              allow: 4,
              deny: 0,
              other: 0,
              unanswered: 0,
            },
            {
              name: "other",
              asked: 2,
              allow: 0,
              deny: 0,
              other: 0,
              unanswered: 2,
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
            {
              name: "npm",
              asked: 4,
              allow: 3,
              deny: 1,
              other: 0,
              unanswered: 0,
            },
            {
              name: "cargo",
              asked: 3,
              allow: 2,
              deny: 1,
              other: 0,
              unanswered: 0,
            },
            {
              name: "python",
              asked: 2,
              allow: 1,
              deny: 1,
              other: 0,
              unanswered: 0,
            },
            {
              name: "sh",
              asked: 2,
              allow: 1,
              deny: 1,
              other: 0,
              unanswered: 0,
            },
            {
              name: "node",
              asked: 1,
              allow: 1,
              deny: 0,
              other: 0,
              unanswered: 0,
            },
            {
              name: "docker",
              asked: 1,
              allow: 0,
              deny: 1,
              other: 0,
              unanswered: 0,
            },
          ],
          distinctPrograms: 7,
        },
        claims: [
          viewClaim(
            "claim:perm-req",
            "permission-requests" as unknown as Claim["template"],
            {
              asked: 30,
              answered: 28,
              unanswered: 2,
              answeredWithoutRequest: 0,
              agentsAsked: 3,
              allowed: 25,
              denied: 3,
              bashAsked: 18,
              distinctPrograms: 7,
              otherVerdict: 0,
            },
          ),
        ],
      });
      const summary = renderSummary(ledger);
      const lines = summary.split("\n");
      const guardIdx = lines.findIndex((l) => l.startsWith("Guardrails:"));
      expect(guardIdx).toBeGreaterThan(-1);
      expect(lines[guardIdx + 1]).toBe(
        "Permission requests: 30 requests from 3 agents; 28 answered (25 allowed, 3 denied), 2 unanswered. By tool: bash 10, edit 8, read 6. Top programs: git 5 (4 allowed, 1 denied), npm 4 (3 allowed, 1 denied), cargo 3 (2 allowed, 1 denied), python 2 (1 allowed, 1 denied), sh 2 (1 allowed, 1 denied).",
      );
      expect(lines[guardIdx + 1]).not.toContain("write 4");
      expect(lines[guardIdx + 1]).not.toContain("other 2");
      expect(lines[guardIdx + 1]).not.toContain("node 1");
      expect(lines[guardIdx + 1]).not.toContain("docker 1");
    });

    it("never outputs command text, arguments, or file paths anywhere in summary", () => {
      const ledger = viewLedger({
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
              allow: 1,
              deny: 1,
              other: 0,
              unanswered: 0,
            },
          ],
          programs: [
            {
              name: "sed",
              asked: 2,
              allow: 1,
              deny: 1,
              other: 0,
              unanswered: 0,
            },
          ],
          distinctPrograms: 1,
        },
      });
      const summary = renderSummary(ledger);
      expect(summary).not.toContain("Command:");
      expect(summary).not.toContain("rm -rf");
      expect(summary).not.toContain("/Users/");
      expect(summary).not.toContain("/secret/");
      expect(summary).not.toContain("sk-test-123");
      expect(summary).toContain(
        "Permission requests: 2 requests from 1 agent; 2 answered (1 allowed, 1 denied), 0 unanswered. By tool: bash 2. Top programs: sed 2 (1 allowed, 1 denied).",
      );
    });

    it("falls back to ledger.permissionRequests values when permission-requests claim is absent", () => {
      const ledger = viewLedger({
        claims: [],
        permissionRequests: {
          asked: 3,
          answered: 2,
          unanswered: 1,
          answeredWithoutRequest: 0,
          agentsAsked: 2,
          tools: [
            {
              name: "bash",
              asked: 2,
              allow: 1,
              deny: 1,
              other: 0,
              unanswered: 0,
            },
            {
              name: "read",
              asked: 1,
              allow: 0,
              deny: 0,
              other: 0,
              unanswered: 1,
            },
          ],
          programs: [
            {
              name: "git",
              asked: 2,
              allow: 1,
              deny: 1,
              other: 0,
              unanswered: 0,
            },
          ],
          distinctPrograms: 1,
        },
      });
      const summary = renderSummary(ledger);
      const lines = summary.split("\n");
      const guardIdx = lines.findIndex((l) => l.startsWith("Guardrails:"));
      expect(guardIdx).toBeGreaterThan(-1);
      expect(lines[guardIdx + 1]).toBe(
        "Permission requests: 3 requests from 2 agents; 2 answered (1 allowed, 1 denied), 1 unanswered. By tool: bash 2, read 1. Top programs: git 2 (1 allowed, 1 denied).",
      );
    });
  });
});
