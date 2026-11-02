import { describe, expect, it } from "vitest";
import {
  deriveImprovements,
  IMPROVEMENT_THRESHOLDS,
  type ImprovementInput,
  type ImprovementRuleId,
  type LedgerImprovement,
} from "../src/retrospective/improvements";

function createEmptyInput(): ImprovementInput {
  return {
    claims: [],
    agents: [],
    agentsCreated: 0,
    unlinkedAgents: 0,
    trackerWindow: null,
  };
}

describe("retrospective improvements derivation (Slice B2)", () => {
  describe("IMPROVEMENT_THRESHOLDS constant", () => {
    it("exports frozen threshold constants with expected values", () => {
      expect(IMPROVEMENT_THRESHOLDS.GUARDRAIL_ANSWERS_ACT_PER_100_TURNS).toBe(
        5,
      );
      expect(
        IMPROVEMENT_THRESHOLDS.COST_CONCENTRATION_COST_SHARE_MULTIPLIER,
      ).toBe(2);
      expect(
        IMPROVEMENT_THRESHOLDS.COST_CONCENTRATION_CACHE_READ_MULTIPLIER,
      ).toBe(2);
      expect(
        IMPROVEMENT_THRESHOLDS.COST_CONCENTRATION_ACT_COMPACTIONS_MAIN,
      ).toBe(10);
      expect(IMPROVEMENT_THRESHOLDS.UNGUARDED_EDITS_MIN_EPISODES).toBe(10);
      expect(IMPROVEMENT_THRESHOLDS.UNGUARDED_EDITS_SHARE_MULTIPLIER).toBe(2);
      expect(IMPROVEMENT_THRESHOLDS.LOOKUP_MISSES_MIN_CALLS).toBe(10);
      expect(IMPROVEMENT_THRESHOLDS.LOOKUP_MISSES_NO_MATCH_MULTIPLIER).toBe(4);
      expect(IMPROVEMENT_THRESHOLDS.HUMAN_INTERVENTION_PER_100_TURNS).toBe(1);
      expect(IMPROVEMENT_THRESHOLDS.AGENT_ERROR_CONCENTRATION_MIN_TURNS).toBe(
        5,
      );
      expect(
        IMPROVEMENT_THRESHOLDS.AGENT_ERROR_CONCENTRATION_ERROR_SHARE_MULTIPLIER,
      ).toBe(2);
      expect(IMPROVEMENT_THRESHOLDS.COVERAGE_GAP_UNLINKED_MULTIPLIER).toBe(4);
    });
  });

  describe("Rule 1: guardrail-answers", () => {
    it("does not fire when permission-answers claim is missing", () => {
      const input = createEmptyInput();
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "guardrail-answers")).toBe(
        false,
      );
    });

    it("does not fire when answers count is 0 (boundary)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:perm:1",
        template: "permission-answers",
        values: {
          answers: 0,
          allow: 0,
          deny: 0,
          targetsAtLeast3: 0,
          turns: 100,
        },
      });
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "guardrail-answers")).toBe(
        false,
      );
    });

    it("fires with level 'watch' when answers > 0, deny === 0, targetsAtLeast3 === 0, and rate < 5 per 100 turns (just under boundary: 4 in 100)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:perm:1",
        template: "permission-answers",
        values: {
          answers: 4,
          allow: 4,
          deny: 0,
          targetsAtLeast3: 0,
          turns: 100,
        },
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "guardrail-answers");
      expect(match).toBeDefined();
      expect(match?.level).toBe("watch");
      expect(match?.audience).toBe("manager");
      expect(match?.destination).toBe("permission-setup");
      expect(match?.claimIds).toEqual(["claim:perm:1"]);
      expect(match?.evidence).toEqual([
        "agg:claim:permission-answers:answers",
        "agg:claim:permission-answers:deny",
      ]);
      expect(match?.values).toEqual({
        answers: 4,
        allow: 4,
        deny: 0,
        targetsAtLeast3: 0,
        per100Tenths: 40,
      });
    });

    it("switches to level 'act' when rate reaches boundary (5 in 100)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:perm:1",
        template: "permission-answers",
        values: {
          answers: 5,
          allow: 5,
          deny: 0,
          targetsAtLeast3: 0,
          turns: 100,
        },
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "guardrail-answers");
      expect(match).toBeDefined();
      expect(match?.level).toBe("act");
      expect(match?.values.per100Tenths).toBe(50);
    });

    it("switches to level 'act' when deny > 0 regardless of rate", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:perm:1",
        template: "permission-answers",
        values: {
          answers: 1,
          allow: 0,
          deny: 1,
          targetsAtLeast3: 0,
          turns: 100,
        },
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "guardrail-answers");
      expect(match?.level).toBe("act");
      expect(match?.values.deny).toBe(1);
    });

    it("switches to level 'act' when targetsAtLeast3 > 0 regardless of rate", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:perm:1",
        template: "permission-answers",
        values: {
          answers: 3,
          allow: 3,
          deny: 0,
          targetsAtLeast3: 1,
          turns: 100,
        },
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "guardrail-answers");
      expect(match?.level).toBe("act");
      expect(match?.values.targetsAtLeast3).toBe(1);
    });

    it("safely handles 0 turns without dividing by zero", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:perm:1",
        template: "permission-answers",
        values: { answers: 2, allow: 2, deny: 0, targetsAtLeast3: 0, turns: 0 },
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "guardrail-answers");
      expect(match).toBeDefined();
      expect(match?.level).toBe("watch");
      expect(match?.values.per100Tenths).toBe(0);
    });

    it("rounds per100Tenths correctly (e.g. 1 in 8 turns -> 125 tenths)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:perm:1",
        template: "permission-answers",
        values: { answers: 1, allow: 1, deny: 0, targetsAtLeast3: 0, turns: 8 },
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "guardrail-answers");
      expect(match?.values.per100Tenths).toBe(125); // 1000 / 8 = 125 (12.5 per 100)
    });
  });

  describe("Rule 2: cost-concentration", () => {
    it("does not fire when cost-drivers claim is missing", () => {
      const input = createEmptyInput();
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "cost-concentration")).toBe(
        false,
      );
    });

    it("does not fire when cost share is just under 50% boundary (49 vs 51)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:cost:1",
        template: "cost-drivers",
        values: {
          costCentsMain: 49,
          costCentsOthers: 51,
          turnsOthers: 10,
          cacheReadPerTurnMain: 200,
          cacheReadPerTurnOthers: 100,
          compactionsMain: 0,
        },
      });
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "cost-concentration")).toBe(
        false,
      );
    });

    it("does not fire when turnsOthers is 0", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:cost:1",
        template: "cost-drivers",
        values: {
          costCentsMain: 100,
          costCentsOthers: 0,
          turnsOthers: 0,
          cacheReadPerTurnMain: 200,
          cacheReadPerTurnOthers: 100,
          compactionsMain: 0,
        },
      });
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "cost-concentration")).toBe(
        false,
      );
    });

    it("does not fire when cacheReadPerTurnOthers is 0", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:cost:1",
        template: "cost-drivers",
        values: {
          costCentsMain: 100,
          costCentsOthers: 50,
          turnsOthers: 10,
          cacheReadPerTurnMain: 200,
          cacheReadPerTurnOthers: 0,
          compactionsMain: 0,
        },
      });
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "cost-concentration")).toBe(
        false,
      );
    });

    it("does not fire when cacheReadPerTurnMain is just under 2x boundary (199 vs 100)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:cost:1",
        template: "cost-drivers",
        values: {
          costCentsMain: 60,
          costCentsOthers: 40,
          turnsOthers: 10,
          cacheReadPerTurnMain: 199,
          cacheReadPerTurnOthers: 100,
          compactionsMain: 0,
        },
      });
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "cost-concentration")).toBe(
        false,
      );
    });

    it("fires with level 'watch' at exact 50% cost share and exact 2x cache read when compactionsMain < 10 (9 compactions boundary)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:cost:1",
        template: "cost-drivers",
        values: {
          costCentsMain: 50,
          costCentsOthers: 50,
          turnsOthers: 10,
          cacheReadPerTurnMain: 200,
          cacheReadPerTurnOthers: 100,
          compactionsMain: 9,
          mainReadCalls: 20,
          mainEditCalls: 10,
          mainCoordinationCalls: 5,
          costCentsMainReads: 25,
          costCentsMainCoordination: 12,
        },
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "cost-concentration");
      expect(match).toBeDefined();
      expect(match?.level).toBe("watch");
      expect(match?.audience).toBe("manager");
      expect(match?.destination).toBe("orchestration-config");
      expect(match?.claimIds).toEqual(["claim:cost:1"]);
      expect(match?.evidence).toEqual([
        "agg:claim:cost-drivers:costCentsMain",
        "agg:claim:cost-drivers:cacheReadPerTurnMain",
        "agg:claim:cost-drivers:compactionsMain",
      ]);
      expect(match?.values).toEqual({
        sharePercent: 50,
        cacheReadPerTurnMain: 200,
        cacheReadPerTurnOthers: 100,
        compactionsMain: 9,
        mainReadCalls: 20,
        mainEditCalls: 10,
        mainCoordinationCalls: 5,
        costCentsMain: 50,
        costCentsMainReads: 25,
        costCentsMainCoordination: 12,
      });
    });

    it("switches to level 'act' when compactionsMain reaches 10 (boundary)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:cost:1",
        template: "cost-drivers",
        values: {
          costCentsMain: 75,
          costCentsOthers: 25,
          turnsOthers: 5,
          cacheReadPerTurnMain: 300,
          cacheReadPerTurnOthers: 100,
          compactionsMain: 10,
          mainReadCalls: 10,
          mainEditCalls: 5,
          mainCoordinationCalls: 2,
          costCentsMainReads: 30,
          costCentsMainCoordination: 10,
        },
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "cost-concentration");
      expect(match?.level).toBe("act");
      expect(match?.values.sharePercent).toBe(75);
      expect(match?.values.compactionsMain).toBe(10);
    });
  });

  describe("Rule 3: unguarded-edits", () => {
    it("does not fire when routing-order claim is missing", () => {
      const input = createEmptyInput();
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "unguarded-edits")).toBe(
        false,
      );
    });

    it("does not fire when editEpisodes is just under 10 (boundary: 9 total)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:routing:1",
        template: "routing-order",
        values: {
          editEpisodesMain: 5,
          editEpisodesOthers: 4,
          unguardedEditsMain: 5,
          unguardedEditsOthers: 4,
          byFilesTotal: 0,
          getSkillTotal: 0,
        },
      });
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "unguarded-edits")).toBe(
        false,
      );
    });

    it("does not fire when unguarded share is just under 50% (4 out of 10)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:routing:1",
        template: "routing-order",
        values: {
          editEpisodesMain: 6,
          editEpisodesOthers: 4,
          unguardedEditsMain: 2,
          unguardedEditsOthers: 2,
          byFilesTotal: 10,
          getSkillTotal: 2,
        },
      });
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "unguarded-edits")).toBe(
        false,
      );
    });

    it("fires with level 'act' at boundary of 10 editEpisodes and exactly 50% unguarded (5 out of 10)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:routing:1",
        template: "routing-order",
        values: {
          editEpisodesMain: 6,
          editEpisodesOthers: 4,
          unguardedEditsMain: 3,
          unguardedEditsOthers: 2,
          byFilesTotal: 5,
          getSkillTotal: 1,
        },
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "unguarded-edits");
      expect(match).toBeDefined();
      expect(match?.level).toBe("act");
      expect(match?.audience).toBe("manager");
      expect(match?.destination).toBe("agent-routing");
      expect(match?.claimIds).toEqual(["claim:routing:1"]);
      expect(match?.evidence).toEqual([
        "agg:claim:routing-order:editEpisodesMain",
        "agg:claim:routing-order:unguardedEditsMain",
      ]);
      expect(match?.values).toEqual({
        editEpisodes: 10,
        unguardedEdits: 5,
        unguardedPercent: 50,
        byFilesTotal: 5,
        getSkillTotal: 1,
      });
    });
  });

  describe("Rule 4: lookup-misses", () => {
    it("does not fire when ags-lookups claim is missing", () => {
      const input = createEmptyInput();
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "lookup-misses")).toBe(false);
    });

    it("does not fire when calls < 10 even with 100% misses (9 calls, 9 misses boundary)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:lookups:1",
        template: "ags-lookups",
        values: {
          calls: 9,
          noMatchCalls: 9,
          filesNoMatch: 5,
          keywordsNoMatch: 4,
        },
      });
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "lookup-misses")).toBe(false);
    });

    it("does not fire when noMatchCalls * 4 < calls (10 calls, 2 misses = 20% < 25%)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:lookups:1",
        template: "ags-lookups",
        values: {
          calls: 10,
          noMatchCalls: 2,
          filesNoMatch: 1,
          keywordsNoMatch: 1,
        },
      });
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "lookup-misses")).toBe(false);
    });

    it("does not fire at 24% misses boundary (100 calls, 24 misses)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:lookups:1",
        template: "ags-lookups",
        values: {
          calls: 100,
          noMatchCalls: 24,
          filesNoMatch: 14,
          keywordsNoMatch: 10,
        },
      });
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "lookup-misses")).toBe(false);
    });

    it("fires with level 'watch' at exact 25% boundary (100 calls, 25 misses)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:lookups:1",
        template: "ags-lookups",
        values: {
          calls: 100,
          noMatchCalls: 25,
          filesNoMatch: 15,
          keywordsNoMatch: 10,
        },
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "lookup-misses");
      expect(match).toBeDefined();
      expect(match?.level).toBe("watch");
      expect(match?.audience).toBe("manager");
      expect(match?.destination).toBe("agent-routing");
      expect(match?.claimIds).toEqual(["claim:lookups:1"]);
      expect(match?.evidence).toEqual([
        "agg:claim:ags-lookups:calls",
        "agg:claim:ags-lookups:noMatchCalls",
      ]);
      expect(match?.values).toEqual({
        calls: 100,
        noMatchCalls: 25,
        percent: 25,
        filesNoMatch: 15,
        keywordsNoMatch: 10,
      });
    });

    it("fires with level 'watch' at 10 calls boundary (10 calls, 3 misses = 30%)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:lookups:2",
        template: "ags-lookups",
        values: {
          calls: 10,
          noMatchCalls: 3,
          filesNoMatch: 2,
          keywordsNoMatch: 1,
        },
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "lookup-misses");
      expect(match).toBeDefined();
      expect(match?.level).toBe("watch");
      expect(match?.audience).toBe("manager");
      expect(match?.destination).toBe("agent-routing");
      expect(match?.claimIds).toEqual(["claim:lookups:2"]);
      expect(match?.values).toEqual({
        calls: 10,
        noMatchCalls: 3,
        percent: 30,
        filesNoMatch: 2,
        keywordsNoMatch: 1,
      });
    });
  });

  describe("Rule 5: human-intervention", () => {
    it("does not fire when permission-answers claim is missing", () => {
      const input = createEmptyInput();
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "human-intervention")).toBe(
        false,
      );
    });

    it("does not fire when turns is 0 (zero-division guard)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:perm:1",
        template: "permission-answers",
        values: { askCalls: 1, abortedStops: 0, turns: 0 },
      });
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "human-intervention")).toBe(
        false,
      );
    });

    it("does not fire when interventions are just under 1 per 100 turns (e.g. 1 in 101 turns)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:perm:1",
        template: "permission-answers",
        values: { askCalls: 1, abortedStops: 0, turns: 101 },
      });
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "human-intervention")).toBe(
        false,
      );
    });

    it("fires with level 'watch' at exact boundary of 1 per 100 turns (1 in 100)", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:perm:1",
        template: "permission-answers",
        values: { askCalls: 1, abortedStops: 0, turns: 100 },
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "human-intervention");
      expect(match).toBeDefined();
      expect(match?.level).toBe("watch");
      expect(match?.audience).toBe("manager");
      expect(match?.destination).toBe("orchestration-config");
      expect(match?.claimIds).toEqual(["claim:perm:1"]);
      expect(match?.evidence).toEqual([
        "agg:claim:permission-answers:askCalls",
        "agg:claim:permission-answers:abortedStops",
      ]);
      expect(match?.values).toEqual({
        askCalls: 1,
        abortedStops: 0,
        per100Tenths: 10, // 10 tenths = 1.0 per 100
      });
    });

    it("calculates per100Tenths rounding accurately with combined askCalls and abortedStops", () => {
      const input = createEmptyInput();
      input.claims.push({
        id: "claim:perm:1",
        template: "permission-answers",
        values: { askCalls: 1, abortedStops: 2, turns: 24 }, // 3 in 24 = 12.5% -> 125 tenths
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "human-intervention");
      expect(match?.values).toEqual({
        askCalls: 1,
        abortedStops: 2,
        per100Tenths: 125,
      });
    });
  });

  describe("Rule 6: agent-error-concentration", () => {
    it("does not fire when agents list is empty", () => {
      const input = createEmptyInput();
      const improvements = deriveImprovements(input);
      expect(
        improvements.some((i) => i.rule === "agent-error-concentration"),
      ).toBe(false);
    });

    it("does not fire when turns is just under 5 (boundary: 4 turns, 2 errors)", () => {
      const input = createEmptyInput();
      input.agents = [{ label: "worker-1", turns: 4, errorStops: 2 }];
      const improvements = deriveImprovements(input);
      expect(
        improvements.some((i) => i.rule === "agent-error-concentration"),
      ).toBe(false);
    });

    it("does not fire when error share is just under 50% (5 turns, 2 errors: 2*2 < 5)", () => {
      const input = createEmptyInput();
      input.agents = [{ label: "worker-1", turns: 5, errorStops: 2 }];
      const improvements = deriveImprovements(input);
      expect(
        improvements.some((i) => i.rule === "agent-error-concentration"),
      ).toBe(false);
    });

    it("fires with level 'watch' at exact boundary of 5 turns and 3 errors (3*2 >= 5)", () => {
      const input = createEmptyInput();
      input.agents = [{ label: "worker-1", turns: 5, errorStops: 3 }];
      const improvements = deriveImprovements(input);
      const match = improvements.find(
        (i) => i.rule === "agent-error-concentration",
      );
      expect(match).toBeDefined();
      expect(match?.level).toBe("watch");
      expect(match?.audience).toBe("manager");
      expect(match?.destination).toBe("provider-route-monitoring");
      expect(match?.claimIds).toEqual([]);
      expect(match?.evidence).toEqual([
        "agg:agent:worker-1:errorStops",
        "agg:agent:worker-1:turns",
      ]);
      expect(match?.values).toEqual({
        agents: 1,
        worstErrorStops: 3,
        worstTurns: 5,
      });
    });

    it("selects the worst agent by error rate and breaks ties by label ascending", () => {
      const input = createEmptyInput();
      input.agents = [
        { label: "worker-b", turns: 10, errorStops: 6 }, // 60%
        { label: "worker-a", turns: 10, errorStops: 8 }, // 80% (worst rate)
        { label: "worker-c", turns: 8, errorStops: 2 }, // 25% (does not qualify)
      ];
      const improvements = deriveImprovements(input);
      const match = improvements.find(
        (i) => i.rule === "agent-error-concentration",
      );
      expect(match?.values).toEqual({
        agents: 2,
        worstErrorStops: 8,
        worstTurns: 10,
      });
      expect(match?.evidence).toEqual([
        "agg:agent:worker-a:errorStops",
        "agg:agent:worker-a:turns",
      ]);
    });

    it("breaks ties by label ascending when error rates are identical", () => {
      const input = createEmptyInput();
      input.agents = [
        { label: "worker-2", turns: 6, errorStops: 3 }, // 50%
        { label: "worker-1", turns: 8, errorStops: 4 }, // 50% (tie, worker-1 < worker-2)
      ];
      const improvements = deriveImprovements(input);
      const match = improvements.find(
        (i) => i.rule === "agent-error-concentration",
      );
      expect(match?.values).toEqual({
        agents: 2,
        worstErrorStops: 4,
        worstTurns: 8,
      });
      expect(match?.evidence).toEqual([
        "agg:agent:worker-1:errorStops",
        "agg:agent:worker-1:turns",
      ]);
    });
  });

  describe("Rule 7: coverage-gap", () => {
    it("does not fire when agentsCreated is 0 (boundary)", () => {
      const input = createEmptyInput();
      input.agentsCreated = 0;
      input.unlinkedAgents = 0;
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "coverage-gap")).toBe(false);
    });

    it("does not fire when unlinkedAgents is just under 25% (1 out of 5: 1*4 < 5)", () => {
      const input = createEmptyInput();
      input.agentsCreated = 5;
      input.unlinkedAgents = 1;
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "coverage-gap")).toBe(false);
    });

    it("fires with level 'watch' at exact boundary of 25% (1 out of 4: 1*4 >= 4)", () => {
      const input = createEmptyInput();
      input.agentsCreated = 4;
      input.unlinkedAgents = 1;
      input.claims.push({
        id: "claim:cov:1",
        template: "coverage",
        values: {},
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "coverage-gap");
      expect(match).toBeDefined();
      expect(match?.level).toBe("watch");
      expect(match?.audience).toBe("maintainer");
      expect(match?.destination).toBe("session-linkage");
      expect(match?.claimIds).toEqual(["claim:cov:1"]);
      expect(match?.evidence).toEqual([]);
      expect(match?.values).toEqual({
        agentsCreated: 4,
        unlinkedAgents: 1,
      });
    });

    it("emits empty claimIds when coverage claim is absent", () => {
      const input = createEmptyInput();
      input.agentsCreated = 4;
      input.unlinkedAgents = 1;
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "coverage-gap");
      expect(match?.claimIds).toEqual([]);
    });
  });

  describe("Rule 8: tracker-not-measured", () => {
    it("does not fire when trackerWindow is null", () => {
      const input = createEmptyInput();
      input.trackerWindow = null;
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "tracker-not-measured")).toBe(
        false,
      );
    });

    it("does not fire when trackerWindow is 'matches-session'", () => {
      const input = createEmptyInput();
      input.trackerWindow = "matches-session";
      const improvements = deriveImprovements(input);
      expect(improvements.some((i) => i.rule === "tracker-not-measured")).toBe(
        false,
      );
    });

    it("fires with level 'watch' when trackerWindow is 'process-only'", () => {
      const input = createEmptyInput();
      input.trackerWindow = "process-only";
      input.claims.push({
        id: "claim:usage:1",
        template: "skill-usage",
        values: {},
      });
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "tracker-not-measured");
      expect(match).toBeDefined();
      expect(match?.level).toBe("watch");
      expect(match?.audience).toBe("maintainer");
      expect(match?.destination).toBe("tracker-binding");
      expect(match?.claimIds).toEqual(["claim:usage:1"]);
      expect(match?.evidence).toEqual([]);
      expect(match?.values).toEqual({});
    });

    it("emits empty claimIds when skill-usage claim is absent", () => {
      const input = createEmptyInput();
      input.trackerWindow = "process-only";
      const improvements = deriveImprovements(input);
      const match = improvements.find((i) => i.rule === "tracker-not-measured");
      expect(match?.claimIds).toEqual([]);
    });
  });

  describe("Output ordering, determinism, and absence of free text", () => {
    it("orders all manager rules first with 'act' before 'watch' stably, followed by maintainer rules", () => {
      const input: ImprovementInput = {
        claims: [
          {
            id: "claim:perm:1",
            template: "permission-answers",
            values: {
              answers: 1,
              allow: 1,
              deny: 0,
              targetsAtLeast3: 0,
              askCalls: 1,
              abortedStops: 0,
              turns: 100,
            },
            // guardrail-answers -> watch
            // human-intervention -> watch
          },
          {
            id: "claim:cost:1",
            template: "cost-drivers",
            values: {
              costCentsMain: 80,
              costCentsOthers: 20,
              turnsOthers: 5,
              cacheReadPerTurnMain: 300,
              cacheReadPerTurnOthers: 100,
              compactionsMain: 12, // cost-concentration -> act
              mainReadCalls: 1,
              mainEditCalls: 1,
              mainCoordinationCalls: 1,
              costCentsMainReads: 1,
              costCentsMainCoordination: 1,
            },
          },
          {
            id: "claim:routing:1",
            template: "routing-order",
            values: {
              editEpisodesMain: 6,
              editEpisodesOthers: 6,
              unguardedEditsMain: 4,
              unguardedEditsOthers: 4,
              byFilesTotal: 0,
              getSkillTotal: 0,
              // unguarded-edits -> act (always act)
            },
          },
          {
            id: "claim:cov:1",
            template: "coverage",
            values: {},
          },
          {
            id: "claim:usage:1",
            template: "skill-usage",
            values: {},
          },
        ],
        agents: [
          { label: "worker-1", turns: 10, errorStops: 5 }, // agent-error-concentration -> watch
        ],
        agentsCreated: 4,
        unlinkedAgents: 1, // coverage-gap -> watch (maintainer)
        trackerWindow: "process-only", // tracker-not-measured -> watch (maintainer)
      };

      const improvements = deriveImprovements(input);
      const ruleSequence = improvements.map((i) => ({
        rule: i.rule,
        level: i.level,
        audience: i.audience,
      }));

      // Expected order:
      // Manager Act rules in order 1..5:
      //  - cost-concentration (act)
      //  - unguarded-edits (act)
      // Manager Watch rules in order 1..5:
      //  - guardrail-answers (watch)
      //  - human-intervention (watch)
      //  - agent-error-concentration (watch)
      // Maintainer rules in order 6..7:
      //  - coverage-gap (maintainer, watch)
      //  - tracker-not-measured (maintainer, watch)
      expect(ruleSequence).toEqual([
        { rule: "cost-concentration", level: "act", audience: "manager" },
        { rule: "unguarded-edits", level: "act", audience: "manager" },
        { rule: "guardrail-answers", level: "watch", audience: "manager" },
        { rule: "human-intervention", level: "watch", audience: "manager" },
        {
          rule: "agent-error-concentration",
          level: "watch",
          audience: "manager",
        },
        { rule: "coverage-gap", level: "watch", audience: "maintainer" },
        {
          rule: "tracker-not-measured",
          level: "watch",
          audience: "maintainer",
        },
      ]);
    });

    it("orders lookup-misses after unguarded-edits and among manager watch rules", () => {
      const input: ImprovementInput = {
        claims: [
          {
            id: "claim:routing:1",
            template: "routing-order",
            values: {
              editEpisodesMain: 6,
              editEpisodesOthers: 6,
              unguardedEditsMain: 4,
              unguardedEditsOthers: 3,
              byFilesTotal: 10,
              getSkillTotal: 2,
            },
          },
          {
            id: "claim:lookups:1",
            template: "ags-lookups",
            values: {
              calls: 20,
              noMatchCalls: 10,
              filesNoMatch: 6,
              keywordsNoMatch: 4,
            },
          },
        ],
        agents: [],
        agentsCreated: 0,
        unlinkedAgents: 0,
        trackerWindow: null,
      };

      const improvements = deriveImprovements(input);
      expect(improvements.map((i) => i.rule)).toEqual([
        "unguarded-edits",
        "lookup-misses",
      ]);
      expect(improvements[0].level).toBe("act");
      expect(improvements[1].level).toBe("watch");
    });

    it("contains no free text in values or output fields across all rules", () => {
      const input: ImprovementInput = {
        claims: [
          {
            id: "claim:perm:1",
            template: "permission-answers",
            values: {
              answers: 10,
              allow: 8,
              deny: 2,
              targetsAtLeast3: 1,
              askCalls: 2,
              abortedStops: 1,
              turns: 100,
            },
          },
          {
            id: "claim:cost:1",
            template: "cost-drivers",
            values: {
              costCentsMain: 60,
              costCentsOthers: 40,
              turnsOthers: 10,
              cacheReadPerTurnMain: 200,
              cacheReadPerTurnOthers: 100,
              compactionsMain: 10,
              mainReadCalls: 5,
              mainEditCalls: 5,
              mainCoordinationCalls: 5,
              costCentsMainReads: 10,
              costCentsMainCoordination: 10,
            },
          },
          {
            id: "claim:routing:1",
            template: "routing-order",
            values: {
              editEpisodesMain: 10,
              editEpisodesOthers: 0,
              unguardedEditsMain: 10,
              unguardedEditsOthers: 0,
              byFilesTotal: 1,
              getSkillTotal: 1,
            },
          },
          {
            id: "claim:cov:1",
            template: "coverage",
            values: {},
          },
          {
            id: "claim:usage:1",
            template: "skill-usage",
            values: {},
          },
        ],
        agents: [{ label: "worker-1", turns: 10, errorStops: 6 }],
        agentsCreated: 4,
        unlinkedAgents: 2,
        trackerWindow: "process-only",
      };

      const improvements = deriveImprovements(input);
      for (const imp of improvements) {
        for (const [key, val] of Object.entries(imp.values)) {
          expect(typeof val).toBe("number");
          expect(Number.isInteger(val)).toBe(true);
        }
      }
    });

    it("is strictly deterministic across multiple runs with identical input", () => {
      const input: ImprovementInput = {
        claims: [
          {
            id: "claim:perm:1",
            template: "permission-answers",
            values: {
              answers: 1,
              allow: 1,
              deny: 0,
              targetsAtLeast3: 0,
              askCalls: 1,
              abortedStops: 0,
              turns: 100,
            },
          },
        ],
        agents: [],
        agentsCreated: 0,
        unlinkedAgents: 0,
        trackerWindow: null,
      };

      const res1 = deriveImprovements(input);
      const res2 = deriveImprovements(input);
      expect(res1).toEqual(res2);
    });
  });
});
