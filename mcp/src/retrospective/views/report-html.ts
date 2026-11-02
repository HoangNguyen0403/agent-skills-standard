import type { LedgerImprovement } from "../improvements";
import type { Claim, Ledger, LedgerAgent } from "../ledger";
import {
  escapeHtml,
  formatMoney,
  formatRate,
  formatTokensK,
  plural,
} from "./format";

export type LedgerFolder = { name: string; parent: string | null };

export type LedgerLookupTool = {
  tool: string;
  calls: number;
  noMatchCalls: number;
  errorCalls: number;
  bodiesReturned: number;
  reusedBodies: number;
  mainCalls: number;
  workerCalls: number;
};

export type LedgerLookupSkill = {
  id: string;
  returns: number;
  mainReturns: number;
  workerReturns: number;
};

export type LedgerLookups = {
  tools: LedgerLookupTool[];
  skills: LedgerLookupSkill[];
  distinctSkills: number;
  otherSkillReturns: number;
  unvalidatedReturns: number;
  capped: boolean;
};

type ViewLedger = Ledger & {
  folder?: LedgerFolder | null;
  lookups?: LedgerLookups | null;
  otherAgents?: { count: number; turns: number; costCents: number } | null;
};

const LOOKUP_TOOLS = [
  "load_skills_for_files",
  "load_skills_for_keywords",
  "get_skill",
  "get_workflow",
  "get_category_guide",
] as const;

const TOOL_LABELS: Record<string, string> = {
  load_skills_for_files: "by file",
  load_skills_for_keywords: "by keyword",
  get_skill: "by name (get_skill)",
  get_workflow: "workflow",
  get_category_guide: "category guide",
};

const DESTINATION_LABELS: Record<string, string> = {
  "permission-setup": "permission setup",
  "orchestration-config": "orchestration config",
  "agent-routing": "AGS routing",
  "provider-route-monitoring": "provider route monitoring",
  "session-linkage": "session linkage",
  "tracker-binding": "tracker binding",
};

function countOf(values: Claim["values"] | undefined, key: string): number {
  if (!values) return 0;
  const value = values[key];
  return typeof value === "number" && !Number.isNaN(value) ? value : 0;
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

function renderHeader(
  ledger: ViewLedger,
  coverageClaim: Claim | undefined,
): string {
  const metaParts: string[] = [];

  if (ledger.folder) {
    const folderText = ledger.folder.parent
      ? `${ledger.folder.parent}/${ledger.folder.name}`
      : ledger.folder.name;
    metaParts.push(`Folder: ${escapeHtml(folderText)}`);
  } else {
    metaParts.push("Folder: folder not recorded");
  }

  metaParts.push("Branch: branch not recorded");

  if (ledger.session !== null && ledger.session !== undefined) {
    metaParts.push(`Session ${escapeHtml(ledger.session)}`);
  }

  if (coverageClaim) {
    metaParts.push(
      `${escapeHtml(coverageClaim.scope.from)} to ${escapeHtml(coverageClaim.scope.to)}`,
    );
  }

  const evidenceStr =
    ledger.evidenceMode === "tracker-only"
      ? "tracker only (no session files read)"
      : "native session files";

  metaParts.push(`Coverage: ${escapeHtml(ledger.coverage)}`);
  metaParts.push(`Evidence: ${escapeHtml(evidenceStr)}`);
  metaParts.push(
    `Delegation: ${escapeHtml(renderDelegationSegment(ledger, coverageClaim))}`,
  );
  metaParts.push(`Cutoff: ${escapeHtml(ledger.cutoff)}`);

  return `<h1>Agent retrospective</h1>\n<p class="meta">${metaParts.join(" &middot; ")}</p>`;
}

function renderBottomLine(
  ledger: ViewLedger,
  coverageClaim: Claim | undefined,
  costDriversClaim: Claim | undefined,
  permClaim: Claim | undefined,
  routingClaim: Claim | undefined,
): string {
  const bottomLineParts: string[] = [];

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

  if (permClaim) {
    const answers = countOf(permClaim.values, "answers");
    const deny = countOf(permClaim.values, "deny");
    bottomLineParts.push(
      `${plural(answers, "permission answer")} (${deny} denied).`,
    );
  }

  if (routingClaim) {
    const lookupsMain = countOf(routingClaim.values, "lookupsMain");
    const lookupsOthers = countOf(routingClaim.values, "lookupsOthers");
    bottomLineParts.push(
      `AGS lookups: ${lookupsMain} by main, ${lookupsOthers} by workers.`,
    );
  }

  if (bottomLineParts.length === 0) return "";
  return `<p class="bl">${escapeHtml(bottomLineParts.join(" "))}</p>`;
}

function renderTiles(
  ledger: ViewLedger,
  coverageClaim: Claim | undefined,
  costDriversClaim: Claim | undefined,
  permClaim: Claim | undefined,
): string {
  // 1. Estimated cost
  let costTileClass = "";
  let costTotalFormatted = "$0.00";
  let costShareText = "none recorded";

  if (costDriversClaim) {
    const costCentsMain = countOf(costDriversClaim.values, "costCentsMain");
    const costCentsOthers = countOf(costDriversClaim.values, "costCentsOthers");
    const totalCostCents = costCentsMain + costCentsOthers;
    const share =
      totalCostCents > 0
        ? Math.round((costCentsMain * 100) / totalCostCents)
        : 0;
    costTotalFormatted = formatMoney(totalCostCents);
    costShareText = `${share}% is the main agent`;
    if (share >= 90 && totalCostCents > 5000) {
      costTileClass = "amber";
    }
  }

  // 2. Permission answers
  let permTileClass = "";
  let permAnswersFormatted = "0";
  let permDetailText = "none observed";

  if (permClaim) {
    const answers = countOf(permClaim.values, "answers");
    const deny = countOf(permClaim.values, "deny");
    const asks = countOf(permClaim.values, "askCalls");
    permAnswersFormatted = String(answers);
    if (answers === 0) {
      permDetailText = "none observed";
    } else {
      permDetailText = `${deny} denied, ${asks} asks to a human`;
    }
    if (deny > 0) {
      permTileClass = "red";
    }
  }

  // 3. AGS lookups
  let lookupsCallsFormatted = "0";
  let lookupsDetailText = "not measured";

  if (ledger.lookups) {
    const totalCalls = ledger.lookups.tools.reduce(
      (sum, t) => sum + t.calls,
      0,
    );
    const noMatchCalls = ledger.lookups.tools.reduce(
      (sum, t) => sum + t.noMatchCalls,
      0,
    );
    const distinctSkills = ledger.lookups.distinctSkills;
    lookupsCallsFormatted = String(totalCalls);
    lookupsDetailText = `${noMatchCalls} matched nothing, ${distinctSkills} distinct skills`;
  } else {
    const agsClaim = ledger.claims.find((c) => c.template === "ags-lookups");
    if (agsClaim) {
      const calls = countOf(agsClaim.values, "calls");
      const noMatch = countOf(agsClaim.values, "noMatchCalls");
      const skills = countOf(agsClaim.values, "distinctSkills");
      lookupsCallsFormatted = String(calls);
      lookupsDetailText = `${noMatch} matched nothing, ${skills} distinct skills`;
    }
  }

  // 4. Coverage
  let coverageTileClass = "";
  let coverageFormatted = "0 of 0";
  let coverageDetailText = "not measured";

  if (coverageClaim) {
    const created = countOf(coverageClaim.values, "agentsCreated");
    const observed = countOf(coverageClaim.values, "agentsRead");
    coverageFormatted = `${observed} of ${created}`;
    coverageDetailText = "created agents observed";
    if (created > 0 && observed * 4 < created) {
      coverageTileClass = "red";
    }
  }

  const costClassAttr = costTileClass ? ` ${costTileClass}` : "";
  const permClassAttr = permTileClass ? ` ${permTileClass}` : "";
  const covClassAttr = coverageTileClass ? ` ${coverageTileClass}` : "";

  return `<div class="tiles">
<div class="tile${costClassAttr}"><span>Estimated cost</span><b>${escapeHtml(costTotalFormatted)}</b><small>${escapeHtml(costShareText)}</small></div>
<div class="tile${permClassAttr}"><span>Permission answers</span><b>${escapeHtml(permAnswersFormatted)}</b><small>${escapeHtml(permDetailText)}</small></div>
<div class="tile"><span>AGS lookups</span><b>${escapeHtml(lookupsCallsFormatted)}</b><small>${escapeHtml(lookupsDetailText)}</small></div>
<div class="tile${covClassAttr}"><span>Coverage</span><b>${escapeHtml(coverageFormatted)}</b><small>${escapeHtml(coverageDetailText)}</small></div>
</div>`;
}

function renderManagerImprovementCard(imp: LedgerImprovement): string {
  const val = imp.values;
  let title: string;
  let saw: string;
  let change: string;
  let metric: string;
  let valueStr: string;
  const destLabel = DESTINATION_LABELS[imp.destination] ?? imp.destination;

  switch (imp.rule) {
    case "guardrail-answers": {
      const per100 = formatRate(val.per100Tenths ?? 0);
      title = `Permission answers: ${val.answers ?? 0} (${val.allow ?? 0} allowed, ${val.deny ?? 0} denied)`;
      saw = `the orchestrator answered ${val.answers ?? 0} permission requests; ${val.targetsAtLeast3 ?? 0} agents were answered 3 or more times; ${val.deny ?? 0} were denials.`;
      change =
        "add repeated safe requests to the allowlist (allowed answers show setup gaps) and check what each denial asked for (denials show rule violations)";
      metric = "permission answers per 100 turns";
      valueStr = per100;
      break;
    }
    case "cost-concentration": {
      const ctxMain = formatTokensK(val.cacheReadPerTurnMain ?? 0);
      const ctxOthers = formatTokensK(val.cacheReadPerTurnOthers ?? 0);
      title = `Main agent carries ${val.sharePercent ?? 0}% of observed cost`;
      saw = `main runs at ${ctxMain} cached tokens per turn (workers ${ctxOthers}) with ${val.compactionsMain ?? 0} compactions; it made ${val.mainReadCalls ?? 0} reads, ${val.mainEditCalls ?? 0} edits and ${val.mainCoordinationCalls ?? 0} coordination calls itself.`;
      change =
        "check whether those reads and edits could be delegated; consider a turn limit per session and a cost alert";
      metric = "cached tokens per main turn";
      valueStr = ctxMain;
      break;
    }
    case "unguarded-edits": {
      title = `${val.unguardedEdits ?? 0} of ${val.editEpisodes ?? 0} edits ran without a file lookup`;
      saw = `edit and file-write calls with no load_skills_for_files by the same agent since its last compaction; ${val.byFilesTotal ?? 0} file lookups vs ${val.getSkillTotal ?? 0} lookups by name.`;
      change =
        "check the router trigger and the brief given to agents that edit files";
      metric = "unguarded edit share";
      valueStr = `${val.unguardedPercent ?? 0}%`;
      break;
    }
    case "lookup-misses": {
      title = `${val.noMatchCalls ?? 0} of ${val.calls ?? 0} lookups matched nothing`;
      saw = `AGS returned no skill for ${val.percent ?? 0}% of lookups (${val.filesNoMatch ?? 0} by file, ${val.keywordsNoMatch ?? 0} by keyword).`;
      change =
        "check the trigger words and file patterns of the skills these lookups should have found, and the file types the lookups were for";
      metric = "lookups that matched nothing";
      valueStr = `${val.percent ?? 0}%`;
      break;
    }
    case "human-intervention": {
      const per100 = formatRate(val.per100Tenths ?? 0);
      title = `Human interventions: ${val.askCalls ?? 0} asks, ${val.abortedStops ?? 0} aborted stops`;
      saw = `the agents asked a human or were stopped by one ${per100} times per 100 turns.`;
      change =
        "check which of those decisions the setup could take without asking";
      metric = "asks and aborts per 100 turns";
      valueStr = per100;
      break;
    }
    case "agent-error-concentration": {
      const agentsCount = val.agents ?? 0;
      title = `${plural(agentsCount, "agent")} ended at least half their turns in an error`;
      saw = `the worst: ${val.worstErrorStops ?? 0} of ${val.worstTurns ?? 0} turns.`;
      change =
        "read the error category of those records before changing any routing";
      metric = "agents above half error turns";
      valueStr = `${agentsCount}`;
      break;
    }
    default:
      return "";
  }

  const level = imp.level;
  const chipClass = level === "act" ? "act" : "watch";

  return `<div class="card ${chipClass}"><h4><span class="chip ${chipClass}">${escapeHtml(level.toUpperCase())}</span>${escapeHtml(title)}</h4><p><b>Saw:</b> ${escapeHtml(saw)}</p><p class="chg">Change (${escapeHtml(destLabel)}): ${escapeHtml(change)}. Next time: ${escapeHtml(metric)} (now ${escapeHtml(valueStr)}).</p></div>`;
}

function renderDoNext(improvements: LedgerImprovement[] | undefined): string {
  const managerImps = (improvements ?? []).filter(
    (imp) => imp.audience === "manager",
  );

  let body = "<h3>Do next</h3>\n";
  if (managerImps.length === 0) {
    body += `<div class="card none"><h4><span class="chip none">NONE</span>No actions suggested from the measured signals</h4><p>This is not a judgment of session quality.</p></div>\n`;
  } else {
    for (const imp of managerImps) {
      body += `${renderManagerImprovementCard(imp)}\n`;
    }
  }

  const maintainerImps = (improvements ?? []).filter(
    (imp) => imp.audience === "maintainer",
  );
  if (maintainerImps.length > 0) {
    body += `<h3 class="mt">For the maintainer</h3>\n<ul class="mt">\n`;
    for (const imp of maintainerImps) {
      if (imp.rule === "coverage-gap") {
        const text = `${imp.values.unlinkedAgents ?? 0} of ${imp.values.agentsCreated ?? 0} created agents have no session file read; Paseo agent sessions cannot be linked from the session file alone (session-linkage).`;
        body += `<li>${escapeHtml(text)}</li>\n`;
      } else if (imp.rule === "tracker-not-measured") {
        const text =
          "Server tracker numbers cover this process only, so lookups that matched nothing and bodies returned are not measured for this session (tracker-binding).";
        body += `<li>${escapeHtml(text)}</li>\n`;
      }
    }
    body += "</ul>\n";
  }

  return body;
}

function renderLookups(lookups: LedgerLookups | null | undefined): string {
  let html = "<h3>AGS lookups</h3>\n";
  if (!lookups) {
    html += "<p>AGS lookups were not measured (no session files read).</p>\n";
    return html;
  }

  html +=
    "<p>What AGS returned for lookups made in this session. Returned is not followed: the file shows what AGS sent, not what the agent did.</p>\n";
  html += `<table>
<thead>
<tr>
<th>Tool</th>
<th>Calls</th>
<th>Matched nothing</th>
<th>Bodies returned</th>
<th>Already loaded</th>
<th>Errors</th>
<th>Main/Workers split</th>
</tr>
</thead>
<tbody>\n`;

  const toolMap = new Map<string, LedgerLookupTool>();
  for (const t of lookups.tools) {
    toolMap.set(t.tool, t);
  }

  let totCalls = 0;
  let totNoMatch = 0;
  let totBodies = 0;
  let totReused = 0;
  let totErrors = 0;
  let totMain = 0;
  let totWorkers = 0;

  for (const toolName of LOOKUP_TOOLS) {
    const t = toolMap.get(toolName) ?? {
      tool: toolName,
      calls: 0,
      noMatchCalls: 0,
      errorCalls: 0,
      bodiesReturned: 0,
      reusedBodies: 0,
      mainCalls: 0,
      workerCalls: 0,
    };
    totCalls += t.calls;
    totNoMatch += t.noMatchCalls;
    totBodies += t.bodiesReturned;
    totReused += t.reusedBodies;
    totErrors += t.errorCalls;
    totMain += t.mainCalls;
    totWorkers += t.workerCalls;

    const label = TOOL_LABELS[toolName] ?? toolName;
    html += `<tr><td>${escapeHtml(label)}</td><td>${t.calls}</td><td>${t.noMatchCalls}</td><td>${t.bodiesReturned}</td><td>${t.reusedBodies}</td><td>${t.errorCalls}</td><td>${t.mainCalls}/${t.workerCalls}</td></tr>\n`;
  }

  html += `<tr class="total"><td>Total</td><td>${totCalls}</td><td>${totNoMatch}</td><td>${totBodies}</td><td>${totReused}</td><td>${totErrors}</td><td>${totMain}/${totWorkers}</td></tr>
</tbody>
</table>\n`;

  html += `<h4>Skills AGS returned</h4>\n<table>
<thead>
<tr>
<th>Skill id</th>
<th>Delivered</th>
<th>By main</th>
<th>By workers</th>
</tr>
</thead>
<tbody>\n`;

  const topSkills = (lookups.skills ?? []).slice(0, 30);
  for (const s of topSkills) {
    html += `<tr><td>${escapeHtml(s.id)}</td><td>${s.returns}</td><td>${s.mainReturns}</td><td>${s.workerReturns}</td></tr>\n`;
  }

  html += `</tbody>
</table>\n`;

  const cappedSentence = lookups.capped
    ? " Some agents returned more than 100 distinct skills; counts for the rest are grouped."
    : "";
  html += `<p class="mt">${lookups.distinctSkills} distinct skills; ${lookups.otherSkillReturns} more deliveries outside this list; ${lookups.unvalidatedReturns} deliveries with an unreadable id.${cappedSentence}</p>\n`;

  return html;
}

function renderCostAndContext(
  ledger: ViewLedger,
  costDriversClaim: Claim | undefined,
): string {
  if (!costDriversClaim) return "";

  const turnsMain = countOf(costDriversClaim.values, "turnsMain");
  const costCentsMain = countOf(costDriversClaim.values, "costCentsMain");
  const costCentsOthers = countOf(costDriversClaim.values, "costCentsOthers");
  const turnsOthers = countOf(costDriversClaim.values, "turnsOthers");
  const cacheReadPerTurnMain = countOf(
    costDriversClaim.values,
    "cacheReadPerTurnMain",
  );
  const cacheReadPerTurnOthers = countOf(
    costDriversClaim.values,
    "cacheReadPerTurnOthers",
  );
  const compactionsMain = countOf(costDriversClaim.values, "compactionsMain");
  const compactionsOthers = (ledger.agents ?? [])
    .filter((a) => a.label !== "main")
    .reduce((sum, a) => sum + (a.compactions ?? 0), 0);

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

  return `<h3>Cost and context</h3>
<table>
<thead>
<tr>
<th>Metric</th>
<th>Main</th>
<th>Workers</th>
</tr>
</thead>
<tbody>
<tr><td>Turns</td><td>${turnsMain}</td><td>${turnsOthers}</td></tr>
<tr><td>Cost</td><td>${escapeHtml(formatMoney(costCentsMain))} est.</td><td>${escapeHtml(formatMoney(costCentsOthers))} est.</td></tr>
<tr><td>Cached tokens per turn</td><td>${escapeHtml(formatTokensK(cacheReadPerTurnMain))}</td><td>${escapeHtml(turnsOthers > 0 ? formatTokensK(cacheReadPerTurnOthers) : "none")}</td></tr>
<tr><td>Compactions</td><td>${compactionsMain}</td><td>${compactionsOthers}</td></tr>
</tbody>
</table>
<p>Main made ${escapeHtml(plural(reads, "read"))}, ${escapeHtml(plural(edits, "edit"))}, ${bash} bash and ${escapeHtml(plural(coord, "coordination call"))} itself; call-share estimate: reads ${escapeHtml(costReads)}, coordination ${escapeHtml(costCoord)} (estimate).</p>\n`;
}

function renderAgentsTable(
  agents: LedgerAgent[] | undefined,
  otherAgents: ViewLedger["otherAgents"],
): string {
  if (!agents || agents.length === 0) return "";

  let html = `<h3>Agents</h3>
<table>
<thead>
<tr>
<th>Agent</th>
<th>Kind</th>
<th>Model</th>
<th>Turns</th>
<th>Cost</th>
<th>Cached/turn</th>
<th>Compactions</th>
<th>Tool errors/calls</th>
<th>Permission answers</th>
</tr>
</thead>
<tbody>\n`;

  const displayed = agents.slice(0, 12);
  for (const a of displayed) {
    const trClass = a.label === "main" ? ' class="main"' : "";
    html += `<tr${trClass}><td>${escapeHtml(a.label)}</td><td>${escapeHtml(a.kind)}</td><td>${escapeHtml(a.model)}</td><td>${a.turns}</td><td>${escapeHtml(formatMoney(a.costCents))}</td><td>${escapeHtml(formatTokensK(a.cacheReadPerTurn))}</td><td>${a.compactions}</td><td>${a.toolErrors}/${a.toolCalls}</td><td>${a.permissionAnswers}</td></tr>\n`;
  }

  if (otherAgents && otherAgents.count > 0) {
    html += `<tr><td>${otherAgents.count} more agents</td><td>-</td><td>-</td><td>${otherAgents.turns}</td><td>${escapeHtml(formatMoney(otherAgents.costCents))}</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>\n`;
  }

  html += `</tbody>
</table>\n`;

  return html;
}

function renderLimits(): string {
  return `<h3>Limits</h3>
<ul>
<li>Counts show where to look, not why.</li>
<li>Cost is a price-table estimate; call-share attribution is an estimate.</li>
<li>Agents without a read session file are not covered.</li>
<li>The root session is not verified against the host.</li>
<li>AGS lookups are counted, not whether the rules were followed.</li>
</ul>\n`;
}

export function renderReportHtml(ledger: Ledger): string {
  const vLedger = ledger as ViewLedger;

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

  const headerHtml = renderHeader(vLedger, coverageClaim);
  const bottomLineHtml = renderBottomLine(
    vLedger,
    coverageClaim,
    costDriversClaim,
    permClaim,
    routingClaim,
  );
  const tilesHtml = renderTiles(
    vLedger,
    coverageClaim,
    costDriversClaim,
    permClaim,
  );
  const doNextHtml = renderDoNext(vLedger.improvements);
  const lookupsHtml = renderLookups(vLedger.lookups);
  const costHtml = renderCostAndContext(vLedger, costDriversClaim);
  const agentsHtml = renderAgentsTable(vLedger.agents, vLedger.otherAgents);
  const limitsHtml = renderLimits();

  const parts = [
    headerHtml,
    bottomLineHtml,
    tilesHtml,
    doNextHtml,
    lookupsHtml,
    costHtml,
    agentsHtml,
    limitsHtml,
  ].filter((p) => p.length > 0);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>Agent retrospective</title>
<style>
:root{--red:#c62828;--amber:#b26a00;--ink:#1b1f24;--mute:#5b6570;--line:#e3e7eb;--bg:#f6f8fa}
*{box-sizing:border-box}
body{font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:var(--ink);margin:0;background:#fff}
.wrap{max-width:1000px;margin:0 auto;padding:20px}
.meta{color:var(--mute);font-size:13px;margin:6px 0 14px}
h1{font-size:22px;margin:6px 0}
h2{font-size:19px;border-top:2px solid var(--line);padding-top:16px;margin-top:30px}
h3{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:var(--mute);margin:20px 0 8px}
h4{margin:0 0 6px;font-size:15px}
.bl{background:var(--bg);border-radius:8px;padding:10px 14px;margin:8px 0;font-size:14px;line-height:1.5}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}
.tile{border:1px solid var(--line);border-radius:8px;padding:10px 12px;background:#fff}
.tile span{font-size:12px;color:var(--mute);text-transform:uppercase;letter-spacing:.05em}
.tile b{display:block;font-size:26px;line-height:1.15;margin:4px 0}
.tile small{color:var(--mute);font-size:12px}
.tile.red{border-color:var(--red)}
.tile.red b{color:var(--red)}
.tile.amber{border-color:#e0a030}
.tile.amber b{color:var(--amber)}
.card{border:1px solid var(--line);border-left-width:6px;border-radius:8px;padding:10px 14px;margin:10px 0;background:#fff}
.card.act{border-left-color:var(--red)}
.card.watch{border-left-color:#e0a030}
.card.none{border-left-color:#9aa5b1}
.card p{margin:4px 0;font-size:14px}
.card p.chg{color:#34404c}
.chip{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.05em;padding:2px 8px;border-radius:99px;color:#fff;margin-right:8px;vertical-align:2px}
.chip.act{background:var(--red)}
.chip.watch{background:#d98a00}
.chip.none{background:#7b8794}
.mt,.mt li{font-size:13px;color:var(--mute)}
table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}
th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:right}
th:first-child,td:first-child{text-align:left}
th{font-size:11px;color:var(--mute);text-transform:uppercase}
tr.main td{font-weight:700;background:#fff8e1}
tr.total td{font-weight:700;border-top:1px solid var(--line)}
ul{margin:8px 0;padding-left:20px}
li{margin:4px 0;font-size:14px}
@media(max-width:820px){.tiles{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
${parts.join("\n")}
</div>
</body>
</html>\n`;
}
