/**
 * Slice B2: Pure, deterministic improvement recommendation engine.
 * Derives actionable manager and maintainer improvements from retrospective claims and agent tables.
 */

export type ImprovementRuleId =
  | "guardrail-answers"
  | "cost-concentration"
  | "unguarded-edits"
  | "lookup-misses"
  | "human-intervention"
  | "agent-error-concentration"
  | "coverage-gap"
  | "tracker-not-measured";

export type ImprovementDestination =
  | "permission-setup"
  | "orchestration-config"
  | "agent-routing"
  | "provider-route-monitoring"
  | "session-linkage"
  | "tracker-binding";

export type LedgerImprovement = {
  rule: ImprovementRuleId;
  level: "act" | "watch";
  destination: ImprovementDestination;
  audience: "manager" | "maintainer";
  /** claim ids the numbers come from (strings, all must exist in the input claims) */
  claimIds: string[];
  /** evidence ids that exist in the ledger (see per-rule list) */
  evidence: string[];
  /** integers only; rates are stored in TENTHS (e.g. 12.7 per 100 -> 127) */
  values: Record<string, number>;
};

export type ImprovementInput = {
  claims: Array<{
    id: string;
    template: string;
    values: Record<string, number | string>;
  }>;
  agents: Array<{ label: string; turns: number; errorStops: number }>;
  agentsCreated: number;
  unlinkedAgents: number;
  /** from the skill-usage claim's trackerWindow value, or null when there is no skill-usage claim */
  trackerWindow: "matches-session" | "process-only" | null;
};

/**
 * Thresholds for improvement rule evaluation.
 * All numbers used in rule triggers and level switches are centralized here.
 */
export const IMPROVEMENT_THRESHOLDS = Object.freeze({
  /** guardrail-answers: minimum answers per 100 turns for "act" level */
  GUARDRAIL_ANSWERS_ACT_PER_100_TURNS: 5,
  /** cost-concentration: multiplier on costCentsMain vs total cost (costCentsMain * 2 >= total -> >= 50%) */
  COST_CONCENTRATION_COST_SHARE_MULTIPLIER: 2,
  /** cost-concentration: cacheReadPerTurnMain multiplier vs cacheReadPerTurnOthers (>= 2x) */
  COST_CONCENTRATION_CACHE_READ_MULTIPLIER: 2,
  /** cost-concentration: compactionsMain threshold for "act" level */
  COST_CONCENTRATION_ACT_COMPACTIONS_MAIN: 10,
  /** unguarded-edits: minimum total edit episodes required to fire */
  UNGUARDED_EDITS_MIN_EPISODES: 10,
  /** unguarded-edits: unguarded multiplier vs total edit episodes (unguarded * 2 >= total -> >= 50%) */
  UNGUARDED_EDITS_SHARE_MULTIPLIER: 2,
  /** lookup-misses: minimum lookup calls required to fire */
  LOOKUP_MISSES_MIN_CALLS: 10,
  /** lookup-misses: noMatchCalls multiplier vs calls (noMatchCalls * 4 >= calls -> >= 25%) */
  LOOKUP_MISSES_NO_MATCH_MULTIPLIER: 4,
  /** human-intervention: (askCalls + abortedStops) per 100 turns threshold (>= 1 per 100 turns) */
  HUMAN_INTERVENTION_PER_100_TURNS: 1,
  /** agent-error-concentration: minimum agent turns to qualify */
  AGENT_ERROR_CONCENTRATION_MIN_TURNS: 5,
  /** agent-error-concentration: errorStops multiplier vs turns (errorStops * 2 >= turns -> >= 50%) */
  AGENT_ERROR_CONCENTRATION_ERROR_SHARE_MULTIPLIER: 2,
  /** coverage-gap: unlinkedAgents multiplier vs agentsCreated (unlinkedAgents * 4 >= agentsCreated -> >= 25%) */
  COVERAGE_GAP_UNLINKED_MULTIPLIER: 4,
} as const);

function getNumber(
  values: Record<string, number | string>,
  key: string,
): number {
  const val = values[key];
  if (typeof val === "number") {
    return Number.isFinite(val) ? Math.trunc(val) : 0;
  }
  if (typeof val === "string") {
    const parsed = parseInt(val, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function deriveImprovements(
  input: ImprovementInput,
): LedgerImprovement[] {
  const managerImprovements: LedgerImprovement[] = [];
  const maintainerImprovements: LedgerImprovement[] = [];

  // Index claims by template (first match if multiple, though templates are typically unique)
  const claimsByTemplate = new Map<
    string,
    { id: string; template: string; values: Record<string, number | string> }
  >();
  for (const c of input.claims) {
    if (!claimsByTemplate.has(c.template)) {
      claimsByTemplate.set(c.template, c);
    }
  }

  // 1. guardrail-answers
  // Audience: manager, Destination: permission-setup
  // Fires when claim 'permission-answers' exists and answers > 0.
  // level 'act' when deny > 0 OR targetsAtLeast3 > 0 OR answersPer100Turns >= 5 (answers*100/turns; compare with integer math: answers*100 >= 5*turns)
  // else 'watch'.
  // values: answers, allow, deny, targetsAtLeast3, per100Tenths (round(answers*1000/turns))
  // evidence: agg:claim:permission-answers:answers, agg:claim:permission-answers:deny
  const permClaim = claimsByTemplate.get("permission-answers");
  if (permClaim) {
    const answers = getNumber(permClaim.values, "answers");
    if (answers > 0) {
      const turns = getNumber(permClaim.values, "turns");
      const allow = getNumber(permClaim.values, "allow");
      const deny = getNumber(permClaim.values, "deny");
      const targetsAtLeast3 = getNumber(permClaim.values, "targetsAtLeast3");

      // Zero-division guard on turns: if turns <= 0, rate condition cannot trigger act
      const rateExceeded =
        turns > 0 &&
        answers * 100 >=
          IMPROVEMENT_THRESHOLDS.GUARDRAIL_ANSWERS_ACT_PER_100_TURNS * turns;
      const isAct = deny > 0 || targetsAtLeast3 > 0 || rateExceeded;
      const per100Tenths = turns > 0 ? Math.round((answers * 1000) / turns) : 0;

      managerImprovements.push({
        rule: "guardrail-answers",
        level: isAct ? "act" : "watch",
        destination: "permission-setup",
        audience: "manager",
        claimIds: [permClaim.id],
        evidence: [
          "agg:claim:permission-answers:answers",
          "agg:claim:permission-answers:deny",
        ],
        values: {
          answers,
          allow,
          deny,
          targetsAtLeast3,
          per100Tenths,
        },
      });
    }
  }

  // 2. cost-concentration
  // Audience: manager, Destination: orchestration-config
  // Fires when claim 'cost-drivers' exists,
  // costCentsMain*2 >= costCentsMain+costCentsOthers (main >= 50% of observed cost),
  // turnsOthers > 0, and cacheReadPerTurnMain >= 2*cacheReadPerTurnOthers (others > 0).
  // level 'act' when compactionsMain >= 10 else 'watch'.
  // values: sharePercent (round(costCentsMain*100/(main+others))), cacheReadPerTurnMain, cacheReadPerTurnOthers,
  //         compactionsMain, mainReadCalls, mainEditCalls, mainCoordinationCalls, costCentsMain,
  //         costCentsMainReads, costCentsMainCoordination.
  // evidence: agg:claim:cost-drivers:costCentsMain, ...:cacheReadPerTurnMain, ...:compactionsMain
  const costClaim = claimsByTemplate.get("cost-drivers");
  if (costClaim) {
    const costCentsMain = getNumber(costClaim.values, "costCentsMain");
    const costCentsOthers = getNumber(costClaim.values, "costCentsOthers");
    const turnsOthers = getNumber(costClaim.values, "turnsOthers");
    const cacheReadPerTurnMain = getNumber(
      costClaim.values,
      "cacheReadPerTurnMain",
    );
    const cacheReadPerTurnOthers = getNumber(
      costClaim.values,
      "cacheReadPerTurnOthers",
    );

    const totalCost = costCentsMain + costCentsOthers;
    const isCostShareQualified =
      costCentsMain *
        IMPROVEMENT_THRESHOLDS.COST_CONCENTRATION_COST_SHARE_MULTIPLIER >=
      totalCost;
    const isTurnsOthersQualified = turnsOthers > 0;
    const isCacheReadQualified =
      cacheReadPerTurnOthers > 0 &&
      cacheReadPerTurnMain >=
        IMPROVEMENT_THRESHOLDS.COST_CONCENTRATION_CACHE_READ_MULTIPLIER *
          cacheReadPerTurnOthers;

    if (
      isCostShareQualified &&
      isTurnsOthersQualified &&
      isCacheReadQualified
    ) {
      const compactionsMain = getNumber(costClaim.values, "compactionsMain");
      const mainReadCalls = getNumber(costClaim.values, "mainReadCalls");
      const mainEditCalls = getNumber(costClaim.values, "mainEditCalls");
      const mainCoordinationCalls = getNumber(
        costClaim.values,
        "mainCoordinationCalls",
      );
      const costCentsMainReads = getNumber(
        costClaim.values,
        "costCentsMainReads",
      );
      const costCentsMainCoordination = getNumber(
        costClaim.values,
        "costCentsMainCoordination",
      );

      const isAct =
        compactionsMain >=
        IMPROVEMENT_THRESHOLDS.COST_CONCENTRATION_ACT_COMPACTIONS_MAIN;
      const sharePercent =
        totalCost > 0 ? Math.round((costCentsMain * 100) / totalCost) : 0;

      managerImprovements.push({
        rule: "cost-concentration",
        level: isAct ? "act" : "watch",
        destination: "orchestration-config",
        audience: "manager",
        claimIds: [costClaim.id],
        evidence: [
          "agg:claim:cost-drivers:costCentsMain",
          "agg:claim:cost-drivers:cacheReadPerTurnMain",
          "agg:claim:cost-drivers:compactionsMain",
        ],
        values: {
          sharePercent,
          cacheReadPerTurnMain,
          cacheReadPerTurnOthers,
          compactionsMain,
          mainReadCalls,
          mainEditCalls,
          mainCoordinationCalls,
          costCentsMain,
          costCentsMainReads,
          costCentsMainCoordination,
        },
      });
    }
  }

  // 3. unguarded-edits
  // Audience: manager, Destination: agent-routing
  // Fires when claim 'routing-order' exists,
  // editEpisodes = editEpisodesMain + editEpisodesOthers >= 10 and unguarded*2 >= editEpisodes (unguarded = unguardedEditsMain + unguardedEditsOthers).
  // level 'act'.
  // values: editEpisodes, unguardedEdits, unguardedPercent, byFilesTotal, getSkillTotal.
  // evidence: agg:claim:routing-order:editEpisodesMain, agg:claim:routing-order:unguardedEditsMain.
  const routingClaim = claimsByTemplate.get("routing-order");
  if (routingClaim) {
    const editEpisodesMain = getNumber(routingClaim.values, "editEpisodesMain");
    const editEpisodesOthers = getNumber(
      routingClaim.values,
      "editEpisodesOthers",
    );
    const unguardedEditsMain = getNumber(
      routingClaim.values,
      "unguardedEditsMain",
    );
    const unguardedEditsOthers = getNumber(
      routingClaim.values,
      "unguardedEditsOthers",
    );

    const editEpisodes = editEpisodesMain + editEpisodesOthers;
    const unguardedEdits = unguardedEditsMain + unguardedEditsOthers;

    if (
      editEpisodes >= IMPROVEMENT_THRESHOLDS.UNGUARDED_EDITS_MIN_EPISODES &&
      unguardedEdits *
        IMPROVEMENT_THRESHOLDS.UNGUARDED_EDITS_SHARE_MULTIPLIER >=
        editEpisodes
    ) {
      const byFilesTotal = getNumber(routingClaim.values, "byFilesTotal");
      const getSkillTotal = getNumber(routingClaim.values, "getSkillTotal");
      const unguardedPercent =
        editEpisodes > 0
          ? Math.round((unguardedEdits * 100) / editEpisodes)
          : 0;

      managerImprovements.push({
        rule: "unguarded-edits",
        level: "act",
        destination: "agent-routing",
        audience: "manager",
        claimIds: [routingClaim.id],
        evidence: [
          "agg:claim:routing-order:editEpisodesMain",
          "agg:claim:routing-order:unguardedEditsMain",
        ],
        values: {
          editEpisodes,
          unguardedEdits,
          unguardedPercent,
          byFilesTotal,
          getSkillTotal,
        },
      });
    }
  }

  // 4. lookup-misses
  // Audience: manager, Destination: agent-routing
  // Fires when claim 'ags-lookups' exists, calls >= 10 and noMatchCalls * 4 >= calls.
  // level 'watch'.
  // values: calls, noMatchCalls, percent (round(noMatchCalls*100/calls)), filesNoMatch, keywordsNoMatch.
  // evidence: agg:claim:ags-lookups:calls, agg:claim:ags-lookups:noMatchCalls.
  const lookupsClaim = claimsByTemplate.get("ags-lookups");
  if (lookupsClaim) {
    const calls = getNumber(lookupsClaim.values, "calls");
    const noMatchCalls = getNumber(lookupsClaim.values, "noMatchCalls");
    if (
      calls >= IMPROVEMENT_THRESHOLDS.LOOKUP_MISSES_MIN_CALLS &&
      noMatchCalls * IMPROVEMENT_THRESHOLDS.LOOKUP_MISSES_NO_MATCH_MULTIPLIER >=
        calls
    ) {
      const filesNoMatch = getNumber(lookupsClaim.values, "filesNoMatch");
      const keywordsNoMatch = getNumber(lookupsClaim.values, "keywordsNoMatch");
      const percent = calls > 0 ? Math.round((noMatchCalls * 100) / calls) : 0;

      managerImprovements.push({
        rule: "lookup-misses",
        level: "watch",
        destination: "agent-routing",
        audience: "manager",
        claimIds: [lookupsClaim.id],
        evidence: [
          "agg:claim:ags-lookups:calls",
          "agg:claim:ags-lookups:noMatchCalls",
        ],
        values: {
          calls,
          noMatchCalls,
          percent,
          filesNoMatch,
          keywordsNoMatch,
        },
      });
    }
  }

  // 5. human-intervention
  // Audience: manager, Destination: orchestration-config
  // Fires when claim 'permission-answers' exists and (askCalls + abortedStops)*100 >= turns (>= 1 per 100 turns).
  // level 'watch'.
  // values: askCalls, abortedStops, per100Tenths.
  // evidence: agg:claim:permission-answers:askCalls, agg:claim:permission-answers:abortedStops.
  if (permClaim) {
    const turns = getNumber(permClaim.values, "turns");
    const askCalls = getNumber(permClaim.values, "askCalls");
    const abortedStops = getNumber(permClaim.values, "abortedStops");
    const interventions = askCalls + abortedStops;

    if (
      turns > 0 &&
      interventions * 100 >=
        IMPROVEMENT_THRESHOLDS.HUMAN_INTERVENTION_PER_100_TURNS * turns
    ) {
      const per100Tenths = Math.round((interventions * 1000) / turns);
      managerImprovements.push({
        rule: "human-intervention",
        level: "watch",
        destination: "orchestration-config",
        audience: "manager",
        claimIds: [permClaim.id],
        evidence: [
          "agg:claim:permission-answers:askCalls",
          "agg:claim:permission-answers:abortedStops",
        ],
        values: {
          askCalls,
          abortedStops,
          per100Tenths,
        },
      });
    }
  }

  // 6. agent-error-concentration
  // Audience: manager, Destination: provider-route-monitoring
  // Fires when at least one entry of `agents` has turns >= 5 and errorStops*2 >= turns.
  // level 'watch'.
  // values: agents (how many such), worstErrorStops, worstTurns (of the worst by errorStops/turns, ties by label).
  // evidence: agg:agent:<worstLabel>:errorStops, agg:agent:<worstLabel>:turns. claimIds: [] (no claim).
  let qualifyingAgentsCount = 0;
  type QualifiedAgent = { label: string; turns: number; errorStops: number };
  let worstAgent: QualifiedAgent | null = null;

  for (const agent of input.agents) {
    if (
      agent.turns >=
        IMPROVEMENT_THRESHOLDS.AGENT_ERROR_CONCENTRATION_MIN_TURNS &&
      agent.errorStops *
        IMPROVEMENT_THRESHOLDS.AGENT_ERROR_CONCENTRATION_ERROR_SHARE_MULTIPLIER >=
        agent.turns
    ) {
      qualifyingAgentsCount++;
      if (worstAgent === null) {
        worstAgent = agent;
      } else {
        // Compare errorStops / turns via cross multiplication:
        // agent.errorStops / agent.turns vs worstAgent.errorStops / worstAgent.turns
        // agent is worse if agent.errorStops * worstAgent.turns > worstAgent.errorStops * agent.turns
        const diff =
          agent.errorStops * worstAgent.turns -
          worstAgent.errorStops * agent.turns;
        if (diff > 0) {
          worstAgent = agent;
        } else if (diff === 0) {
          // Tie-break by label ascending
          if (agent.label.localeCompare(worstAgent.label) < 0) {
            worstAgent = agent;
          }
        }
      }
    }
  }

  if (qualifyingAgentsCount > 0 && worstAgent !== null) {
    managerImprovements.push({
      rule: "agent-error-concentration",
      level: "watch",
      destination: "provider-route-monitoring",
      audience: "manager",
      claimIds: [],
      evidence: [
        `agg:agent:${worstAgent.label}:errorStops`,
        `agg:agent:${worstAgent.label}:turns`,
      ],
      values: {
        agents: qualifyingAgentsCount,
        worstErrorStops: worstAgent.errorStops,
        worstTurns: worstAgent.turns,
      },
    });
  }

  // 7. coverage-gap
  // Audience: maintainer, Destination: session-linkage, level: 'watch'
  // Fires when agentsCreated > 0 and unlinkedAgents*4 >= agentsCreated.
  // values: agentsCreated, unlinkedAgents. evidence: []; claimIds: the coverage claim id when present.
  if (
    input.agentsCreated > 0 &&
    input.unlinkedAgents *
      IMPROVEMENT_THRESHOLDS.COVERAGE_GAP_UNLINKED_MULTIPLIER >=
      input.agentsCreated
  ) {
    const coverageClaim = claimsByTemplate.get("coverage");
    maintainerImprovements.push({
      rule: "coverage-gap",
      level: "watch",
      destination: "session-linkage",
      audience: "maintainer",
      claimIds: coverageClaim ? [coverageClaim.id] : [],
      evidence: [],
      values: {
        agentsCreated: input.agentsCreated,
        unlinkedAgents: input.unlinkedAgents,
      },
    });
  }

  // 8. tracker-not-measured
  // Audience: maintainer, Destination: tracker-binding, level: 'watch'
  // Fires when trackerWindow === "process-only".
  // values: {}. claimIds: the skill-usage claim id when present.
  if (input.trackerWindow === "process-only") {
    const skillUsageClaim = claimsByTemplate.get("skill-usage");
    maintainerImprovements.push({
      rule: "tracker-not-measured",
      level: "watch",
      destination: "tracker-binding",
      audience: "maintainer",
      claimIds: skillUsageClaim ? [skillUsageClaim.id] : [],
      evidence: [],
      values: {},
    });
  }

  // Ordering:
  // All manager rules first, in order of rules 1..6:
  // Stable sort: 'act' before 'watch'
  const managerAct: LedgerImprovement[] = [];
  const managerWatch: LedgerImprovement[] = [];
  for (const imp of managerImprovements) {
    if (imp.level === "act") {
      managerAct.push(imp);
    } else {
      managerWatch.push(imp);
    }
  }

  // Then maintainer rules in order 6..7
  return [...managerAct, ...managerWatch, ...maintainerImprovements];
}
