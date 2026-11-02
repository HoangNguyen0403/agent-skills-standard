import type { LedgerImprovement } from "../improvements";
import type { Claim, Ledger } from "../ledger";
import { formatMoney, formatRate, formatTokensK, plural } from "./format";
const MAX_SUMMARY_LINES = 80;
const MAX_SUMMARY_BYTES = 8192;

export type LedgerAgent = {
  label: string;
  kind: "read-only" | "editing";
  turns: number;
  costCents: number;
  compactions: number;
  cacheReadPerTurn: number;
  errorStops: number;
  toolCalls: number;
  toolErrors: number;
  editCalls: number;
  bashCalls: number;
  readCalls: number;
  agsLookups: number;
  permissionAnswers: number;
  model: string;
};

export type OtherAgentsSummary = {
  count: number;
  turns: number;
  costCents: number;
};

export type LedgerFolder = { name: string; parent: string | null };

export type LedgerModel = {
  model: string;
  turns: number;
  costCents: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  errorStops: number;
};

export type LedgerDay = {
  day: string;
  turns: number;
  costCents: number;
  errorStops: number;
};

export type LedgerToolRow = { tool: string; calls: number; errors: number };

export type LedgerOutcome =
  | {
      source: "git";
      branch: string | null;
      commits: number;
      revertCommits: number;
      mergeCommits: number;
      filesChanged: number;
      insertions: number;
      deletions: number;
      windowFrom: string;
      windowTo: string;
    }
  | {
      source: "unavailable";
      reason: "folder-missing" | "not-a-repo" | "git-error" | "not-measured";
    };

export type LedgerPermissionRow = {
  name: string;
  asked: number;
  allow: number;
  deny: number;
  other: number;
  unanswered: number;
};

export type LedgerPermissionRequests = {
  asked: number;
  answered: number;
  unanswered: number;
  answeredWithoutRequest: number;
  agentsAsked: number;
  tools: LedgerPermissionRow[];
  programs: LedgerPermissionRow[];
  distinctPrograms: number;
};

type ViewLedger = Ledger & {
  folder?: LedgerFolder | null;
  lookups?: unknown;
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

type RenderOptions = {
  maxManagerImprovements: number;
  maxMaintainerImprovements: number;
};

const DESTINATION_LABELS: Record<string, string> = {
  "permission-setup": "permission setup",
  "orchestration-config": "orchestration config",
  "agent-routing": "AGS routing",
  "provider-route-monitoring": "provider route monitoring",
  "session-linkage": "session linkage",
  "tracker-binding": "tracker binding",
};
const OUTCOME_UNAVAILABLE_REASONS: Record<
  "folder-missing" | "not-a-repo" | "git-error" | "not-measured",
  string
> = {
  "folder-missing": "session folder missing",
  "not-a-repo": "not a git repository",
  "git-error": "git could not be read safely",
  "not-measured": "not measured for this run",
};

function countOf(values: Claim["values"] | undefined, key: string): number {
  if (!values) return 0;
  const value = values[key];
  return typeof value === "number" ? value : 0;
}

function stringOf(
  values: Claim["values"] | undefined,
  key: string,
): string | null {
  if (!values) return null;
  const value = values[key];
  return typeof value === "string" ? value : null;
}

function renderDelegationSegment(
  ledger: Ledger,
  coverageClaim: Claim | undefined,
): string {
  if (ledger.evidenceMode === "tracker-only") return "n/a";
  const agentsCreated = coverageClaim
    ? countOf(coverageClaim.values, "agentsCreated")
    : ledger.counts.agentsCreated;
  if (agentsCreated === 0) return "none created";
  const agentsRead = coverageClaim
    ? countOf(coverageClaim.values, "agentsRead")
    : 0;
  return `${agentsRead} of ${plural(agentsCreated, "created agent")} read`;
}

function renderManagerImprovement(imp: LedgerImprovement, k: number): string[] {
  const levelStr = imp.level.toUpperCase();
  const destLabel = DESTINATION_LABELS[imp.destination] ?? imp.destination;
  const val = imp.values;

  let title: string;
  let saw: string;
  let change: string;
  let metric: string;
  let valueStr: string;

  switch (imp.rule) {
    case "guardrail-answers": {
      const per100 = formatRate(val.per100Tenths ?? 0);
      title = `Permission answers: ${val.answers ?? 0} (${val.allow ?? 0} allowed, ${val.deny ?? 0} denied)`;
      saw = `the orchestrator answered ${val.answers ?? 0} permission requests; ${val.targetsAtLeast3 ?? 0} agents were answered 3 or more times; ${val.deny ?? 0} were denials.`;
      change = `add repeated safe requests to the allowlist (allowed answers show setup gaps) and check what each denial asked for (denials show rule violations)`;
      metric = "permission answers per 100 turns";
      valueStr = per100;
      break;
    }
    case "cost-concentration": {
      const ctxMain = formatTokensK(val.cacheReadPerTurnMain ?? 0);
      const ctxOthers = formatTokensK(val.cacheReadPerTurnOthers ?? 0);
      title = `Main agent carries ${val.sharePercent ?? 0}% of observed cost`;
      saw = `main runs at ${ctxMain} cached tokens per turn (workers ${ctxOthers}) with ${val.compactionsMain ?? 0} compactions; it made ${val.mainReadCalls ?? 0} reads, ${val.mainEditCalls ?? 0} edits and ${val.mainCoordinationCalls ?? 0} coordination calls itself.`;
      change = `check whether those reads and edits could be delegated; consider a turn limit per session and a cost alert`;
      metric = "cached tokens per main turn";
      valueStr = ctxMain;
      break;
    }
    case "unguarded-edits": {
      title = `${val.unguardedEdits ?? 0} of ${val.editEpisodes ?? 0} edits ran without a file lookup`;
      saw = `edit and file-write calls with no load_skills_for_files by the same agent since its last compaction; ${val.byFilesTotal ?? 0} file lookups vs ${val.getSkillTotal ?? 0} lookups by name.`;
      change = `check the router trigger and the brief given to agents that edit files`;
      metric = "unguarded edit share";
      valueStr = `${val.unguardedPercent ?? 0}%`;
      break;
    }
    case "human-intervention": {
      const per100 = formatRate(val.per100Tenths ?? 0);
      title = `Human interventions: ${val.askCalls ?? 0} asks, ${val.abortedStops ?? 0} aborted stops`;
      saw = `the agents asked a human or were stopped by one ${per100} times per 100 turns.`;
      change = `check which of those decisions the setup could take without asking`;
      metric = "asks and aborts per 100 turns";
      valueStr = per100;
      break;
    }
    case "agent-error-concentration": {
      const agentsCount = val.agents ?? 0;
      title = `${plural(agentsCount, "agent")} ended at least half their turns in an error`;
      saw = `the worst: ${val.worstErrorStops ?? 0} of ${val.worstTurns ?? 0} turns.`;
      change = `read the error category of those records before changing any routing`;
      metric = "agents above half error turns";
      valueStr = `${agentsCount}`;
      break;
    }
    case "lookup-misses": {
      title = `${val.noMatchCalls ?? 0} of ${val.calls ?? 0} lookups matched nothing`;
      saw = `AGS returned no skill for ${val.percent ?? 0}% of lookups (${val.filesNoMatch ?? 0} by file, ${val.keywordsNoMatch ?? 0} by keyword).`;
      change = `check the trigger words and file patterns of the skills these lookups should have found, and the file types the lookups were for`;
      metric = "lookups that matched nothing";
      valueStr = `${val.percent ?? 0}%`;
      break;
    }
    default: {
      return [];
    }
  }

  return [
    `${k}. [${levelStr}] ${title}`,
    `   Saw: ${saw}`,
    `   Change (${destLabel}): ${change}. Next time: ${metric} (now ${valueStr}).`,
  ];
}

function renderMaintainerImprovement(imp: LedgerImprovement): string | null {
  switch (imp.rule) {
    case "coverage-gap":
      return `- ${imp.values.unlinkedAgents ?? 0} of ${imp.values.agentsCreated ?? 0} created agents have no session file read; Paseo agent sessions cannot be linked from the session file alone (session-linkage).`;
    case "tracker-not-measured":
      return `- Server tracker numbers cover this process only, so lookups that matched nothing and bodies returned are not measured for this session (tracker-binding).`;
    default:
      return null;
  }
}
function renderAgsLookupsLine(lookupsClaim: Claim): string {
  const v = lookupsClaim.values;
  const bodiesReturned = countOf(v, "bodiesReturned");
  const distinctSkills = countOf(v, "distinctSkills");
  const calls = countOf(v, "calls");
  const noMatchCalls = countOf(v, "noMatchCalls");
  const reusedBodies = countOf(v, "reusedBodies");
  const errorCalls = countOf(v, "errorCalls");
  const filesCalls = countOf(v, "filesCalls");
  const filesNoMatch = countOf(v, "filesNoMatch");
  const keywordsCalls = countOf(v, "keywordsCalls");
  const keywordsNoMatch = countOf(v, "keywordsNoMatch");
  const nameCalls = countOf(v, "nameCalls");
  const nameNoMatch = countOf(v, "nameNoMatch");

  return `AGS lookups: ${plural(
    bodiesReturned,
    "skill body",
    "skill bodies",
  )} returned from ${plural(
    distinctSkills,
    "distinct skill",
  )}; ${noMatchCalls} of ${plural(
    calls,
    "lookup",
  )} matched nothing; ${reusedBodies} already loaded; ${plural(
    errorCalls,
    "error",
  )}. Calls by file ${filesCalls} (${filesNoMatch} matched nothing), by keyword ${keywordsCalls} (${keywordsNoMatch}), by name ${nameCalls} (${nameNoMatch}). Skill-level detail is in report.html.`;
}

function renderPermissionRequestsLine(
  ledger: ViewLedger,
  pr: LedgerPermissionRequests,
): string {
  const permReqClaim = ledger.claims.find(
    (c) => (c.template as string) === "permission-requests",
  );
  const asked = permReqClaim ? countOf(permReqClaim.values, "asked") : pr.asked;
  const agentsAsked = permReqClaim
    ? countOf(permReqClaim.values, "agentsAsked")
    : pr.agentsAsked;
  const answered = permReqClaim
    ? countOf(permReqClaim.values, "answered")
    : pr.answered;
  const unanswered = permReqClaim
    ? countOf(permReqClaim.values, "unanswered")
    : pr.unanswered;
  const allowed = permReqClaim
    ? countOf(permReqClaim.values, "allowed")
    : pr.tools.reduce((sum, t) => sum + t.allow, 0);
  const denied = permReqClaim
    ? countOf(permReqClaim.values, "denied")
    : pr.tools.reduce((sum, t) => sum + t.deny, 0);

  let line = `Permission requests: ${plural(asked, "request")} from ${plural(
    agentsAsked,
    "agent",
  )}; ${answered} answered (${allowed} allowed, ${denied} denied), ${unanswered} unanswered.`;

  if (pr.tools && pr.tools.length > 0) {
    const topTools = pr.tools.slice(0, 3);
    const toolParts = topTools.map((t) => `${t.name} ${t.asked}`);
    line += ` By tool: ${toolParts.join(", ")}.`;
  }

  if (pr.programs && pr.programs.length > 0) {
    const topPrograms = pr.programs.slice(0, 5);
    const progParts = topPrograms.map(
      (p) => `${p.name} ${p.asked} (${p.allow} allowed, ${p.deny} denied)`,
    );
    line += ` Top programs: ${progParts.join(", ")}.`;
  }

  return line;
}

function renderLines(ledger: ViewLedger, options: RenderOptions): string[] {
  const lines: string[] = [];

  const evidenceStr =
    ledger.evidenceMode === "tracker-only"
      ? "tracker only (no session files read)"
      : "native session files";
  const rootStr =
    ledger.rootVerification === "unverified-root" ? "unverified root" : "n/a";

  const coverageClaim = ledger.claims.find((c) => c.template === "coverage");
  const costDriversClaim = ledger.claims.find(
    (c) => c.template === "cost-drivers",
  );
  const permClaim = ledger.claims.find(
    (c) => c.template === "permission-answers",
  );
  const routingClaim = ledger.claims.find(
    (c) => c.template === "routing-order",
  );
  const skillUsageClaim = ledger.claims.find(
    (c) => c.template === "skill-usage",
  );
  const lookupsClaim = ledger.claims.find(
    (c) => (c.template as string) === "ags-lookups",
  );

  // Line 1: Header
  lines.push(
    `Coverage: ${ledger.coverage} | Evidence: ${evidenceStr} | Root: ${rootStr} | Delegation: ${renderDelegationSegment(
      ledger,
      coverageClaim,
    )} | Cutoff: ${ledger.cutoff}`,
  );

  // Line 2: Scope
  if (coverageClaim) {
    const sessionPart =
      ledger.session === null ? "" : `session ${ledger.session} | `;
    let folderPart = "";
    if (ledger.folder) {
      const folderStr = ledger.folder.parent
        ? `${ledger.folder.parent}/${ledger.folder.name}`
        : ledger.folder.name;
      folderPart = `folder ${folderStr} | `;
    }
    lines.push(
      `Scope: ${sessionPart}${folderPart}${coverageClaim.scope.from} to ${coverageClaim.scope.to}`,
    );
  }
  if (ledger.label != null) {
    lines.push(`Title: ${ledger.label} (agent-supplied, unverified)`);
  }

  // ## Bottom line
  lines.push("");
  lines.push("## Bottom line");

  const bottomLineParts: string[] = [];

  // Clause 1: Agent observation (coverage)
  if (coverageClaim) {
    const created = countOf(coverageClaim.values, "agentsCreated");
    const observed = countOf(coverageClaim.values, "agentsRead");
    const agentsList = ledger.agents ?? [];
    const workersCount =
      (agentsList.length > 0 ? agentsList.length - 1 : 0) +
      (ledger.otherAgents?.count ?? 0);
    const agentDetail =
      created === 0
        ? "no agents were created"
        : `${observed} of ${plural(created, "created agent")}`;
    bottomLineParts.push(
      `Observed: main + ${plural(workersCount, "worker")} (${agentDetail}).`,
    );
  }

  // Clause 2: Main cost & turns (cost-drivers)
  if (costDriversClaim) {
    const turnsMain = countOf(costDriversClaim.values, "turnsMain");
    const costCentsMain = countOf(costDriversClaim.values, "costCentsMain");
    const costCentsOthers = countOf(costDriversClaim.values, "costCentsOthers");
    const totalCost = costCentsMain + costCentsOthers;
    const share =
      totalCost > 0 ? Math.round((costCentsMain * 100) / totalCost) : 0;
    const ctxMain = formatTokensK(
      countOf(costDriversClaim.values, "cacheReadPerTurnMain"),
    );
    const turnsOthersBL = countOf(costDriversClaim.values, "turnsOthers");
    const ctxOthers =
      turnsOthersBL > 0
        ? formatTokensK(
            countOf(costDriversClaim.values, "cacheReadPerTurnOthers"),
          )
        : "none";
    bottomLineParts.push(
      `Main: ${plural(turnsMain, "turn")}, ${formatMoney(costCentsMain)} est. (${share}% of observed cost) at ${ctxMain} cached tokens per turn (workers: ${ctxOthers}).`,
    );
  }

  // Clause 3: Permission answers (permission-answers)
  if (permClaim) {
    const answers = countOf(permClaim.values, "answers");
    const deny = countOf(permClaim.values, "deny");
    bottomLineParts.push(
      `${plural(answers, "permission answer")} (${deny} denied).`,
    );
  }

  // Clause 4: AGS lookups (routing-order)
  if (routingClaim) {
    const lookupsMain = countOf(routingClaim.values, "lookupsMain");
    const lookupsOthers = countOf(routingClaim.values, "lookupsOthers");
    bottomLineParts.push(
      `AGS lookups: ${lookupsMain} by main, ${lookupsOthers} by workers.`,
    );
  }

  if (bottomLineParts.length > 0) {
    lines.push(bottomLineParts.join(" "));
  }

  // ## Scorecards
  lines.push("");
  lines.push("## Scorecards");

  // Guardrails scorecard line
  if (permClaim) {
    const answers = countOf(permClaim.values, "answers");
    const allow = countOf(permClaim.values, "allow");
    const deny = countOf(permClaim.values, "deny");
    const askCalls = countOf(permClaim.values, "askCalls");
    const abortedStops = countOf(permClaim.values, "abortedStops");
    const targetsAtLeast3 = countOf(permClaim.values, "targetsAtLeast3");
    const turns = countOf(permClaim.values, "turns");
    const per100Tenths = turns > 0 ? Math.round((answers * 1000) / turns) : 0;
    const per100 = formatRate(per100Tenths);
    lines.push(
      `Guardrails: ${plural(answers, "permission answer")} (${per100} per 100 turns; ${allow} allowed, ${deny} denied); ${plural(askCalls, "ask")} to a human; ${plural(abortedStops, "aborted stop")}; ${plural(targetsAtLeast3, "agent")} answered 3 or more times.`,
    );
  } else {
    lines.push("Guardrails: no permission answers, asks or aborts observed.");
  }

  // Permission requests scorecard line
  if (ledger.permissionRequests != null) {
    lines.push(renderPermissionRequestsLine(ledger, ledger.permissionRequests));
  }

  // Cost scorecard line
  if (costDriversClaim) {
    const turnsMain = countOf(costDriversClaim.values, "turnsMain");
    const costMain = formatMoney(
      countOf(costDriversClaim.values, "costCentsMain"),
    );
    const compactionsMain = countOf(costDriversClaim.values, "compactionsMain");
    const floor = formatTokensK(
      countOf(costDriversClaim.values, "postCompactionCacheReadPerTurnMain"),
    );
    const max = formatTokensK(
      countOf(costDriversClaim.values, "maxCacheReadMain"),
    );
    const turnsOthers = countOf(costDriversClaim.values, "turnsOthers");
    const costOthers = formatMoney(
      countOf(costDriversClaim.values, "costCentsOthers"),
    );
    const reads = countOf(costDriversClaim.values, "mainReadCalls");
    const edits = countOf(costDriversClaim.values, "mainEditCalls");
    const bash = countOf(costDriversClaim.values, "mainBashCalls");
    const coord = countOf(costDriversClaim.values, "mainCoordinationCalls");
    const costReads = formatMoney(
      countOf(costDriversClaim.values, "costCentsMainReads"),
    );
    const costCoord = formatMoney(
      countOf(costDriversClaim.values, "costCentsMainCoordination"),
    );
    lines.push(
      `Cost: main ${plural(turnsMain, "turn")}, ${costMain} est., ${plural(compactionsMain, "compaction")} (post-compaction floor ${floor}, peak ${max} cached tokens per turn); workers ${plural(turnsOthers, "turn")}, ${costOthers} est. Main made ${plural(reads, "read")}, ${plural(edits, "edit")}, ${bash} bash and ${plural(coord, "coordination call")} itself; call-share estimate: reads ${costReads}, coordination ${costCoord}.`,
    );
  }
  // Tool failures scorecard line
  const toolErrorsClaim = ledger.claims.find(
    (c) => c.template === "tool-errors",
  );
  if (toolErrorsClaim) {
    const calls = countOf(toolErrorsClaim.values, "toolCalls");
    if (calls > 0) {
      const failed = countOf(toolErrorsClaim.values, "failedToolCalls");
      const toolRows = (ledger.toolRows ?? []).slice(0, 3);
      const detail =
        toolRows.length > 0
          ? ` (${toolRows.map((r) => `${r.tool} x${r.errors}`).join(", ")})`
          : "";
      lines.push(
        `Tool failures: ${failed} of ${plural(
          calls,
          "tool call",
        )} returned an error${detail}.`,
      );
    }
  }

  // Error stops scorecard line
  const errorStopClaim = ledger.claims.find(
    (c) => c.template === "error-stop-exposure",
  );
  if (errorStopClaim) {
    const errorStops = countOf(errorStopClaim.values, "errorStops");
    if (errorStops > 0) {
      const turns = countOf(errorStopClaim.values, "turns");
      let line = `Error stops: ${errorStops} across ${plural(
        turns,
        "assistant turn",
      )}.`;
      const topCell = stringOf(errorStopClaim.values, "topCell");
      if (topCell) {
        const e = countOf(errorStopClaim.values, "topCellErrorStops");
        const t = countOf(errorStopClaim.values, "topCellTurns");
        line += ` Highest rate: ${topCell} (${e} of ${plural(t, "turn")}).`;
      }
      const busiestCell = stringOf(errorStopClaim.values, "busiestCell");
      if (busiestCell) {
        const e = countOf(errorStopClaim.values, "busiestCellErrorStops");
        const t = countOf(errorStopClaim.values, "busiestCellTurns");
        line += ` Most stops: ${busiestCell} (${e} of ${plural(t, "turn")}).`;
      }
      lines.push(line);
    }
  }

  // AGS routing scorecard lines
  if (routingClaim) {
    const lookupsMain = countOf(routingClaim.values, "lookupsMain");
    const lookupsOthers = countOf(routingClaim.values, "lookupsOthers");
    const agentsWithLookup = countOf(routingClaim.values, "agentsWithLookup");
    const agentsTotal = countOf(routingClaim.values, "agentsTotal");
    const byFilesTotal = countOf(routingClaim.values, "byFilesTotal");
    const byKeywordsTotal = countOf(routingClaim.values, "byKeywordsTotal");
    const getSkillTotal = countOf(routingClaim.values, "getSkillTotal");
    const overheadCalls = countOf(routingClaim.values, "overheadCalls");
    const hostReads = countOf(routingClaim.values, "hostSkillReadCalls");

    // Turns for main and workers
    let turnsMain = 0;
    let turnsOthers = 0;
    if (costDriversClaim) {
      turnsMain = countOf(costDriversClaim.values, "turnsMain");
      turnsOthers = countOf(costDriversClaim.values, "turnsOthers");
    } else if (ledger.agents && ledger.agents.length > 0) {
      turnsMain = ledger.agents.find((a) => a.label === "main")?.turns ?? 0;
      turnsOthers =
        ledger.agents
          .filter((a) => a.label !== "main")
          .reduce((sum, a) => sum + a.turns, 0) +
        (ledger.otherAgents?.turns ?? 0);
    }

    const mainRateTenths =
      turnsMain > 0 ? Math.round((lookupsMain * 1000) / turnsMain) : 0;
    const othersRateTenths =
      turnsOthers > 0 ? Math.round((lookupsOthers * 1000) / turnsOthers) : 0;

    lines.push(
      `AGS routing: main ${plural(lookupsMain, "lookup")} (${formatRate(
        mainRateTenths,
      )} per 100 turns), workers ${lookupsOthers} (${formatRate(
        othersRateTenths,
      )} per 100 turns); ${agentsWithLookup} of ${plural(agentsTotal, "agent")} looked something up; ${byFilesTotal} by file, ${byKeywordsTotal} by keyword, ${getSkillTotal} by name; ${plural(overheadCalls, "ceremony call")}; ${plural(hostReads, "host skill read")} (counted, not named).`,
    );

    if (lookupsClaim && countOf(lookupsClaim.values, "calls") > 0) {
      lines.push(renderAgsLookupsLine(lookupsClaim));
    }

    const editEpisodes =
      countOf(routingClaim.values, "editEpisodesMain") +
      countOf(routingClaim.values, "editEpisodesOthers");
    const unguarded =
      countOf(routingClaim.values, "unguardedEditsMain") +
      countOf(routingClaim.values, "unguardedEditsOthers");
    lines.push(
      `Edits: ${plural(editEpisodes, "edit or file-write call")}, ${unguarded} with no file lookup since the agent's last compaction.`,
    );
  } else if (lookupsClaim && countOf(lookupsClaim.values, "calls") > 0) {
    lines.push(renderAgsLookupsLine(lookupsClaim));
  }

  // Tracker line (from skill-usage claim)
  if (skillUsageClaim) {
    const trackerWindow = stringOf(skillUsageClaim.values, "trackerWindow");
    if (trackerWindow === "matches-session") {
      const noMatchCalls = countOf(skillUsageClaim.values, "noMatchCalls");
      const loadCalls = countOf(skillUsageClaim.values, "loadCalls");
      const bodyReturns = countOf(skillUsageClaim.values, "bodyReturns");
      lines.push(
        `Tracker (this session): ${noMatchCalls} of ${plural(loadCalls, "lookup")} matched nothing; ${plural(bodyReturns, "skill body", "skill bodies")} returned.`,
      );
    } else if (trackerWindow === "process-only") {
      const since =
        stringOf(skillUsageClaim.values, "since") ??
        ledger.skillUsage?.since ??
        null;
      const scopeStr = since
        ? `this process since ${since} only`
        : `this server process only`;
      lines.push(
        `Tracker: not measured for this session (the server tracker covers ${scopeStr}).`,
      );
    }
  }

  // Coverage scorecard line
  if (coverageClaim) {
    const observed = countOf(coverageClaim.values, "agentsRead");
    const created = countOf(coverageClaim.values, "agentsCreated");
    const workers = (ledger.agents ?? []).filter((a) => a.label !== "main");
    const n = workers.filter((a) => a.kind === "read-only").length;
    const m = workers.filter((a) => a.kind === "editing").length;
    const files = countOf(coverageClaim.values, "sessions");
    const skipped = countOf(coverageClaim.values, "skippedLines");
    lines.push(
      `Coverage: ${observed} of ${plural(created, "created agent")} observed; observed workers: ${n} read-only, ${m} editing; ${plural(files, "session")} read in full (${plural(skipped, "line")} skipped).`,
    );
  }
  // Outcome scorecard line
  const outcome = ledger.outcome ?? {
    source: "unavailable",
    reason: "not-measured",
  };
  if (outcome.source === "git") {
    const branchText = outcome.branch ?? "detached HEAD";
    lines.push(
      `Outcome: ${plural(outcome.commits, "commit")} in the session window (${plural(
        outcome.filesChanged,
        "file",
      )} changed, +${outcome.insertions} -${outcome.deletions}), ${plural(
        outcome.revertCommits,
        "revert",
      )}, ${plural(outcome.mergeCommits, "merge commit")}; branch now ${branchText}.`,
    );
  } else {
    const reasonText =
      OUTCOME_UNAVAILABLE_REASONS[
        outcome.reason as keyof typeof OUTCOME_UNAVAILABLE_REASONS
      ] ?? "not measured for this run";
    lines.push(`Outcome: not measured (${reasonText}).`);
  }

  // ## Do next
  lines.push("");
  lines.push("## Do next");

  const managerImps = (ledger.improvements ?? []).filter(
    (imp) => imp.audience === "manager",
  );
  const selectedManager = managerImps.slice(0, options.maxManagerImprovements);

  if (selectedManager.length === 0) {
    lines.push(
      "No actions suggested from the measured signals. This is not a judgment of session quality.",
    );
  } else {
    selectedManager.forEach((imp, idx) => {
      const block = renderManagerImprovement(imp, idx + 1);
      lines.push(...block);
    });
  }

  // ## For the maintainer
  const maintainerImps = (ledger.improvements ?? []).filter(
    (imp) => imp.audience === "maintainer",
  );
  const selectedMaintainer = maintainerImps.slice(
    0,
    options.maxMaintainerImprovements,
  );

  if (selectedMaintainer.length > 0) {
    lines.push("");
    lines.push("## For the maintainer");
    for (const imp of selectedMaintainer) {
      const bullet = renderMaintainerImprovement(imp);
      if (bullet) lines.push(bullet);
    }
  }

  // ## Limits
  lines.push("");
  lines.push("## Limits");
  lines.push("- Counts show where to look, not why.");
  lines.push(
    "- Cost is a price-table estimate; call-share attribution is an estimate.",
  );
  lines.push("- Agents without a read session file are not covered.");
  lines.push("- The root session is not verified against the host.");
  lines.push("- AGS lookups are counted, not whether the rules were followed.");

  return lines;
}

function fitsBudget(text: string): boolean {
  return (
    text.split("\n").length <= MAX_SUMMARY_LINES &&
    Buffer.byteLength(text, "utf8") <= MAX_SUMMARY_BYTES
  );
}

export function renderSummary(rawLedger: Ledger): string {
  const ledger = rawLedger as ViewLedger;

  const candidates: RenderOptions[] = [
    { maxManagerImprovements: 4, maxMaintainerImprovements: 3 },
    { maxManagerImprovements: 4, maxMaintainerImprovements: 2 },
    { maxManagerImprovements: 4, maxMaintainerImprovements: 1 },
    { maxManagerImprovements: 4, maxMaintainerImprovements: 0 },
    { maxManagerImprovements: 3, maxMaintainerImprovements: 0 },
    { maxManagerImprovements: 2, maxMaintainerImprovements: 0 },
    { maxManagerImprovements: 1, maxMaintainerImprovements: 0 },
    { maxManagerImprovements: 0, maxMaintainerImprovements: 0 },
  ];

  let last = "";
  for (const candidate of candidates) {
    const text = renderLines(ledger, candidate).join("\n");
    last = text;
    if (fitsBudget(text)) return text;
  }

  if (fitsBudget(last)) return last;
  const lines = last.split("\n");
  if (lines.length > MAX_SUMMARY_LINES) {
    return lines.slice(0, MAX_SUMMARY_LINES).join("\n");
  }
  return last;
}
