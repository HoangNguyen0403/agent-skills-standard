import type { LedgerImprovement } from "../improvements";
import type { Claim, Ledger, LedgerAgent } from "../ledger";
import { computeRates, type ReportContext, type SessionRates } from "../trend";
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

export type LedgerToolRow = {
  tool: string;
  calls: number;
  errors: number;
};

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

export type { ReportContext, SessionRates };

export type LedgerPermissionRow = {
  name: string;
  asked: number;
  allow: number;
  deny: number;
  other: number;
  unanswered: number;
};

export type LedgerPermissionCommand = {
  text: string;
  tool: string;
  kind: string;
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
  commands: LedgerPermissionCommand[];
  distinctCommands: number;
  commandsOmitted: number;
};

type ViewLedger = Ledger & {
  label?: string | null;
  models?: LedgerModel[];
  days?: LedgerDay[];
  toolRows?: LedgerToolRow[];
  outcome?: LedgerOutcome;
  folder?: LedgerFolder | null;
  lookups?: LedgerLookups | null;
  otherAgents?: { count: number; turns: number; costCents: number } | null;
  permissionRequests?: LedgerPermissionRequests | null;
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

const DECISION_BY_RULE: Record<string, string> = {
  "guardrail-answers":
    "Decide: allowlist the repeated safe requests, or tighten what workers may ask for?",
  "cost-concentration":
    "Decide: split the orchestrator session and hand reads and edits to workers, or accept the cost?",
  "unguarded-edits":
    "Decide: require a file lookup before edits in the worker brief?",
  "human-intervention":
    "Decide: which asks and aborts the setup should answer without a human?",
  "agent-error-concentration":
    "Decide: check the provider route before the next run?",
  "lookup-misses":
    "Decide: fix the trigger words and file patterns of the skills these lookups missed?",
};

const UNKNOWN_BY_RULE: Record<string, string> = {
  "guardrail-answers":
    "whether each command was safe: read the commands in Permission requests",
  "cost-concentration":
    "why the main kept the work and whether the spend was worth it",
  "unguarded-edits": "whether the edited files needed a skill",
  "human-intervention": "what each ask or abort was about",
  "agent-error-concentration": "the error category behind each stop",
  "lookup-misses": "which file types the empty lookups were for",
};

export function formatTokensCompact(tokens: number): string {
  if (!Number.isFinite(tokens) || tokens <= 0) return "0";
  if (tokens >= 1_000_000) {
    const val = tokens / 1_000_000;
    const str =
      val >= 100
        ? Math.round(val).toString()
        : (Math.round(val * 10) / 10).toString();
    return `${str}M`;
  }
  if (tokens >= 1_000) {
    const val = tokens / 1_000;
    const str =
      val >= 100
        ? Math.round(val).toString()
        : (Math.round(val * 10) / 10).toString();
    return `${str}k`;
  }
  return String(tokens);
}

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

  let branchText: string;
  if (ledger.outcome && ledger.outcome.source === "git") {
    if (ledger.outcome.branch === null) {
      branchText = "Branch now: detached HEAD";
    } else {
      branchText = `Branch now: ${escapeHtml(ledger.outcome.branch)}`;
    }
  } else {
    branchText = "branch not recorded";
  }
  metaParts.push(branchText);

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

  let titleHtml = "";
  if (ledger.label !== null && ledger.label !== undefined) {
    titleHtml = `<p class="title">Title: ${escapeHtml(ledger.label)} <span class="soft">(agent-supplied, unverified)</span></p>\n`;
  }

  return `<h1>Agent retrospective</h1>\n${titleHtml}<p class="meta">${metaParts.join(" &middot; ")}</p>`;
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
  let coverageFormatted = "n/a";
  let coverageDetailText = "not measured";

  if (coverageClaim) {
    const created = countOf(coverageClaim.values, "agentsCreated");
    const observed = countOf(coverageClaim.values, "agentsRead");
    if (created > 0) {
      coverageFormatted = `${observed} of ${created}`;
      coverageDetailText = "created agents observed";
    } else {
      coverageFormatted = "none created";
      coverageDetailText = "no agents to observe";
    }
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

function renderDecisions(
  improvements: LedgerImprovement[] | undefined,
): string {
  const managerImps = (improvements ?? []).filter(
    (imp) => imp.audience === "manager",
  );
  const bullets: string[] = [];

  for (const imp of managerImps) {
    const text = DECISION_BY_RULE[imp.rule];
    if (text) {
      bullets.push(`<li>${escapeHtml(text)}</li>`);
    }
  }

  if (bullets.length === 0) return "";
  return `<h3>Decisions for you</h3>\n<ul>\n${bullets.join("\n")}\n</ul>`;
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
  const unknownText = UNKNOWN_BY_RULE[imp.rule] ?? "";

  return `<div class="card ${chipClass}"><h4><span class="chip ${chipClass}">${escapeHtml(level.toUpperCase())}</span>${escapeHtml(title)}</h4><p><b>Saw:</b> ${escapeHtml(saw)}</p><p class="chg">Change (${escapeHtml(destLabel)}): ${escapeHtml(change)}.</p><p>Next time: ${escapeHtml(metric)} (now ${escapeHtml(valueStr)}).</p><p>Unknown: ${escapeHtml(unknownText)}.</p></div>`;
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

  return body;
}

function wrapCollapsed(
  titleHtml: string,
  headline: string | null,
  innerHtml: string,
): string {
  const sumHtml =
    headline !== null ? `<span class="sum">${escapeHtml(headline)}</span>` : "";
  return `<details class="sec"><summary>${titleHtml}${sumHtml}</summary>\n${innerHtml}</details>`;
}

function renderMaintainerImprovements(
  improvements: LedgerImprovement[] | undefined,
): string {
  const maintainerImps = (improvements ?? []).filter(
    (imp) => imp.audience === "maintainer",
  );
  if (maintainerImps.length === 0) return "";

  let body = '<ul class="mt">\n';
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

  const headline = plural(maintainerImps.length, "item");
  return wrapCollapsed(
    '<h3 class="mt">For the maintainer</h3>',
    headline,
    body,
  );
}

function renderPermissionRequests(
  permissionRequests: LedgerPermissionRequests | null | undefined,
  permissionRequestsClaim: Claim | undefined,
): string {
  if (!permissionRequests) return "";

  const asked = permissionRequestsClaim
    ? countOf(permissionRequestsClaim.values, "asked")
    : permissionRequests.asked;
  const agentsAsked = permissionRequestsClaim
    ? countOf(permissionRequestsClaim.values, "agentsAsked")
    : permissionRequests.agentsAsked;
  const answered = permissionRequestsClaim
    ? countOf(permissionRequestsClaim.values, "answered")
    : permissionRequests.answered;
  const allowed = permissionRequestsClaim
    ? countOf(permissionRequestsClaim.values, "allowed")
    : permissionRequests.tools.reduce((sum, r) => sum + r.allow, 0);
  const denied = permissionRequestsClaim
    ? countOf(permissionRequestsClaim.values, "denied")
    : permissionRequests.tools.reduce((sum, r) => sum + r.deny, 0);
  const unanswered = permissionRequestsClaim
    ? countOf(permissionRequestsClaim.values, "unanswered")
    : permissionRequests.unanswered;
  const answeredWithoutRequest = permissionRequestsClaim
    ? countOf(permissionRequestsClaim.values, "answeredWithoutRequest")
    : permissionRequests.answeredWithoutRequest;

  let body =
    "<p>What agents asked permission for, and what was answered. Commands are shown as recorded, after best-effort removal of secrets (tokens, keys, passwords, credentials in URLs). Review before sharing this report.</p>\n";
  body += `<p>${plural(asked, "request")} from ${plural(agentsAsked, "agent")}; ${answered} answered (${allowed} allowed, ${denied} denied), ${unanswered} unanswered.</p>\n`;
  body += `<h4>By tool</h4>
<table>
<thead>
<tr>
<th>Tool</th>
<th>Asked</th>
<th>Allowed</th>
<th>Denied</th>
<th>Other</th>
<th>Unanswered</th>
</tr>
</thead>
<tbody>\n`;
  for (const r of permissionRequests.tools) {
    body += `<tr><td>${escapeHtml(r.name)}</td><td>${r.asked}</td><td>${r.allow}</td><td>${r.deny}</td><td>${r.other}</td><td>${r.unanswered}</td></tr>\n`;
  }
  body += `</tbody>
</table>\n`;

  body += `<h4>By program (bash)</h4>
<table>
<thead>
<tr>
<th>Program</th>
<th>Asked</th>
<th>Allowed</th>
<th>Denied</th>
<th>Other</th>
<th>Unanswered</th>
<th>Allowed share %</th>
</tr>
</thead>
<tbody>\n`;
  for (const r of permissionRequests.programs) {
    const sharePct = r.asked > 0 ? Math.round((r.allow * 100) / r.asked) : 0;
    body += `<tr><td>${escapeHtml(r.name)}</td><td>${r.asked}</td><td>${r.allow}</td><td>${r.deny}</td><td>${r.other}</td><td>${r.unanswered}</td><td>${sharePct}%</td></tr>\n`;
  }
  body += `</tbody>
</table>\n`;
  const allowlistCandidates: string[] = [];
  for (const r of permissionRequests.programs) {
    if (r.asked >= 5 && r.deny === 0 && r.allow > 0) {
      allowlistCandidates.push(r.name);
      if (allowlistCandidates.length === 5) break;
    }
  }
  if (allowlistCandidates.length > 0) {
    const listStr = allowlistCandidates
      .map((name) => escapeHtml(name))
      .join(", ");
    body += `<p>Programs with repeated allowed requests (5 or more, none denied) are allowlist candidates: ${listStr}.</p>\n`;
  }

  const deniedPrograms: string[] = [];
  for (const r of permissionRequests.programs) {
    if (r.deny > 0) {
      deniedPrograms.push(r.name);
      if (deniedPrograms.length === 5) break;
    }
  }
  if (deniedPrograms.length > 0) {
    const listStr = deniedPrograms.map((name) => escapeHtml(name)).join(", ");
    body += `<p>Denied requests show where the setup said no; read them before widening the allowlist: ${listStr}.</p>\n`;
  }
  if (permissionRequests.commands && permissionRequests.commands.length > 0) {
    body += `<h4>Requests to review</h4>
<table>
<thead>
<tr>
<th>Verdicts</th>
<th>Asked</th>
<th>Tool</th>
<th>Command</th>
</tr>
</thead>
<tbody>\n`;
    for (const r of permissionRequests.commands) {
      let verdicts = `${r.allow} allowed, ${r.deny} denied`;
      if (r.other > 0) {
        verdicts += `, ${r.other} other`;
      }
      if (r.unanswered > 0) {
        verdicts += `, ${r.unanswered} unanswered`;
      }
      const toolText =
        r.kind !== "tool"
          ? `${escapeHtml(r.tool)} (${escapeHtml(r.kind)})`
          : escapeHtml(r.tool);
      const trClass = r.deny > 0 ? ' class="denied"' : "";
      body += `<tr${trClass}><td>${escapeHtml(verdicts)}</td><td>${r.asked}</td><td>${toolText}</td><td><pre class="cmd">${escapeHtml(r.text)}</pre></td></tr>\n`;
    }
    body += `</tbody>
</table>\n`;

    if (
      permissionRequests.distinctCommands > permissionRequests.commands.length
    ) {
      body += `<p>Showing ${permissionRequests.commands.length} of ${permissionRequests.distinctCommands} distinct requests; denied ones come first.</p>\n`;
    }
    if (permissionRequests.commandsOmitted > 0) {
      body += `<p>${permissionRequests.commandsOmitted} requests had no command text recorded.</p>\n`;
    }
  }

  if (answeredWithoutRequest > 0) {
    body += `<p>${answeredWithoutRequest} answers had no matching request in this session file (answered through a pending-permissions list).</p>\n`;
  }

  body +=
    "<p>Programs are the first word of the command (after wrappers such as rtk proxy and env). Redaction is best effort: check the commands before sharing this report.</p>\n";

  const headline = `${plural(asked, "request")}, ${denied} denied, ${unanswered} unanswered`;
  return wrapCollapsed("<h3>Permission requests</h3>", headline, body);
}

function renderOutcome(outcome: LedgerOutcome | undefined): string {
  const effectiveOutcome: LedgerOutcome = outcome ?? {
    source: "unavailable",
    reason: "not-measured",
  };

  let body: string;
  let headline: string;

  if (effectiveOutcome.source === "unavailable") {
    let sentence: string;
    switch (effectiveOutcome.reason) {
      case "folder-missing":
        sentence =
          "The session's folder no longer exists, so no git outcome could be read.";
        break;
      case "not-a-repo":
        sentence = "The folder is not a git repository.";
        break;
      case "git-error":
        sentence = "Git could not be read safely for this folder.";
        break;
      case "not-measured":
      default:
        sentence = "Outcome was not measured for this run.";
        break;
    }
    body = `<p>${sentence}</p>\n`;
    headline = sentence.length <= 80 ? sentence : "see section";
  } else {
    const windowStr = `${escapeHtml(effectiveOutcome.windowFrom)} to ${escapeHtml(effectiveOutcome.windowTo)}`;
    body = `<table>
<thead>
<tr>
<th>Commits</th>
<th>Merge commits</th>
<th>Reverts</th>
<th>Files changed</th>
<th>Insertions (+)</th>
<th>Deletions (-)</th>
<th>Window</th>
</tr>
</thead>
<tbody>
<tr>
<td>${effectiveOutcome.commits}</td>
<td>${effectiveOutcome.mergeCommits}</td>
<td>${effectiveOutcome.revertCommits}</td>
<td>${effectiveOutcome.filesChanged}</td>
<td>+${effectiveOutcome.insertions}</td>
<td>-${effectiveOutcome.deletions}</td>
<td>${windowStr}</td>
</tr>
</tbody>
</table>
<p class="mt">Commits are counted across all branches of the repository in the session window and may include other work; the branch is the current one, not necessarily the session's.</p>\n`;
    headline = `${plural(effectiveOutcome.commits, "commit")}, ${plural(effectiveOutcome.filesChanged, "file")} changed`;
  }

  return wrapCollapsed("<h3>Outcome</h3>", headline, body);
}

function renderTimeline(days: LedgerDay[] | undefined): string {
  if (!days || days.length === 0) {
    return wrapCollapsed(
      "<h3>Timeline</h3>",
      null,
      "<p>No timeline recorded.</p>\n",
    );
  }

  const maxTurns = Math.max(1, ...days.map((d) => d.turns));

  let note = "";
  if (days.length > 31) {
    note = `<p class="mt">Session spans ${days.length} days (more than 31 days; all rows shown).</p>\n`;
  }

  let rows = "";
  for (const d of days) {
    const pct = maxTurns > 0 ? Math.round((d.turns * 100) / maxTurns) : 0;
    rows += `<tr><td>${escapeHtml(d.day)}</td><td>${d.turns} <span class="bar" style="width:${pct}%"></span></td><td>${escapeHtml(formatMoney(d.costCents))} est.</td><td>${d.errorStops}</td></tr>\n`;
  }

  const body = `<table>
<thead>
<tr>
<th>Day</th>
<th>Turns</th>
<th>Cost</th>
<th>Error stops</th>
</tr>
</thead>
<tbody>
${rows}</tbody>
</table>
${note}`;

  const headline = plural(days.length, "day");
  return wrapCollapsed("<h3>Timeline</h3>", headline, body);
}

function renderCostAndModels(
  ledger: ViewLedger,
  costDriversClaim: Claim | undefined,
): string {
  const models = ledger.models ?? [];
  if (!costDriversClaim && models.length === 0) return "";

  let body = "";
  let totalCostCents = 0;

  if (costDriversClaim) {
    const turnsMain = countOf(costDriversClaim.values, "turnsMain");
    const costCentsMain = countOf(costDriversClaim.values, "costCentsMain");
    const costCentsOthers = countOf(costDriversClaim.values, "costCentsOthers");
    totalCostCents += costCentsMain + costCentsOthers;
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

    body += `<table>
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

  if (models.length > 0) {
    let rows = "";
    let totalTurns = 0;
    let modelsTotalCostCents = 0;
    let totalInput = 0;
    let totalOutput = 0;
    let totalCached = 0;
    let totalErrorStops = 0;

    for (const m of models) {
      totalTurns += m.turns;
      modelsTotalCostCents += m.costCents;
      totalInput += m.inputTokens;
      totalOutput += m.outputTokens;
      totalCached += m.cacheReadTokens;
      totalErrorStops += m.errorStops;

      rows += `<tr><td>${escapeHtml(m.model)}</td><td>${m.turns}</td><td>${escapeHtml(formatMoney(m.costCents))} est.</td><td>${formatTokensCompact(m.inputTokens)}</td><td>${formatTokensCompact(m.outputTokens)}</td><td>${formatTokensCompact(m.cacheReadTokens)}</td><td>${m.errorStops}</td></tr>\n`;
    }

    if (!costDriversClaim) {
      totalCostCents = modelsTotalCostCents;
    }

    body += `<table>
<thead>
<tr>
<th>Model</th>
<th>Turns</th>
<th>Cost</th>
<th>Input tokens</th>
<th>Output tokens</th>
<th>Cached tokens</th>
<th>Error stops</th>
</tr>
</thead>
<tbody>
${rows}<tr class="total"><td>Total</td><td>${totalTurns}</td><td>${escapeHtml(formatMoney(modelsTotalCostCents))} est.</td><td>${formatTokensCompact(totalInput)}</td><td>${formatTokensCompact(totalOutput)}</td><td>${formatTokensCompact(totalCached)}</td><td>${totalErrorStops}</td></tr>
</tbody>
</table>\n`;
  }

  const headline = `${formatMoney(totalCostCents)} est., ${plural(models.length, "model")}`;
  return wrapCollapsed("<h3>Cost and models</h3>", headline, body);
}

function renderToolFailures(
  toolRows: LedgerToolRow[] | undefined,
  claims: Claim[] | undefined,
): string {
  if (!toolRows || toolRows.length === 0) return "";

  const toolErrorsClaim = (claims ?? []).find(
    (c) => c.template === "tool-errors",
  );
  const failed = toolErrorsClaim
    ? countOf(toolErrorsClaim.values, "failedToolCalls")
    : toolRows.reduce((sum, r) => sum + r.errors, 0);
  const calls = toolErrorsClaim
    ? countOf(toolErrorsClaim.values, "toolCalls")
    : toolRows.reduce((sum, r) => sum + r.calls, 0);

  let rows = "";
  for (const r of toolRows) {
    const rate = r.calls > 0 ? (r.errors * 100) / r.calls : 0;
    rows += `<tr><td>${escapeHtml(r.tool)}</td><td>${r.calls}</td><td>${r.errors}</td><td>${rate.toFixed(1)}%</td></tr>\n`;
  }

  const body = `<p>${failed} of ${calls} tool calls returned an error.</p>
<table>
<thead>
<tr>
<th>Tool</th>
<th>Calls</th>
<th>Failures</th>
<th>Failure rate</th>
</tr>
</thead>
<tbody>
${rows}</tbody>
</table>\n`;

  const headline = `${failed} of ${plural(calls, "tool call")} failed`;
  return wrapCollapsed("<h3>Tool failures</h3>", headline, body);
}

function renderErrorStops(cells: Ledger["cells"] | undefined): string {
  const errorCells = (cells ?? []).filter((c) => c.errorStops > 0);
  if (errorCells.length === 0) return "";

  const sorted = [...errorCells]
    .sort((a, b) => b.errorStops - a.errorStops)
    .slice(0, 10);

  const eligibleForRate = sorted.filter((c) => c.turns >= 5);
  let highestRateCell: (typeof sorted)[0] | null = null;
  let highestRate = -1;
  for (const c of eligibleForRate) {
    const rate = c.turns > 0 ? c.errorStops / c.turns : 0;
    if (rate > highestRate) {
      highestRate = rate;
      highestRateCell = c;
    }
  }

  let mostStopsCell: (typeof sorted)[0] | null = null;
  let mostStops = -1;
  for (const c of sorted) {
    if (c.errorStops > mostStops) {
      mostStops = c.errorStops;
      mostStopsCell = c;
    }
  }

  let rows = "";
  let totalStops = 0;
  for (const c of errorCells) {
    totalStops += c.errorStops;
  }
  for (const c of sorted) {
    const pipeIdx = c.key.indexOf("|");
    const day = pipeIdx >= 0 ? c.key.slice(0, pipeIdx) : c.key;
    const model = pipeIdx >= 0 ? c.key.slice(pipeIdx + 1) : "unknown";
    const rate = c.turns > 0 ? (c.errorStops * 100) / c.turns : 0;

    const chips: string[] = [];
    if (c === mostStopsCell) {
      chips.push('<span class="chip act">most stops</span>');
    }
    if (c === highestRateCell) {
      chips.push('<span class="chip watch">highest rate</span>');
    }
    const chipsHtml = chips.length > 0 ? ` ${chips.join(" ")}` : "";

    rows += `<tr><td>${escapeHtml(day)}</td><td>${escapeHtml(model)}${chipsHtml}</td><td>${c.errorStops}</td><td>${c.turns}</td><td>${rate.toFixed(1)}%</td></tr>\n`;
  }

  const body = `<p>Error stops are turns that ended in an error; the file records that, not why.</p>
<table>
<thead>
<tr>
<th>Day</th>
<th>Model</th>
<th>Error stops</th>
<th>Turns</th>
<th>Rate</th>
</tr>
</thead>
<tbody>
${rows}</tbody>
</table>\n`;

  const headline = plural(totalStops, "error stop");
  return wrapCollapsed("<h3>Error stops</h3>", headline, body);
}

function renderLookups(
  lookups: LedgerLookups | null | undefined,
  claims: Claim[] | undefined,
): string {
  if (!lookups) {
    const body =
      "<p>AGS lookups were not measured (no session files read).</p>\n";
    return wrapCollapsed("<h3>AGS lookups</h3>", null, body);
  }

  let body =
    "<p>What AGS returned for lookups made in this session. Returned is not followed: the file shows what AGS sent, not what the agent did.</p>\n";
  body += `<table>
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

  let totalCalls = 0;
  let totalNoMatch = 0;
  for (const toolName of LOOKUP_TOOLS) {
    const t = lookups.tools.find((item) => item.tool === toolName);
    const label = TOOL_LABELS[toolName] ?? toolName;
    if (!t) {
      body += `<tr><td>${escapeHtml(label)}</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0/0</td></tr>\n`;
      continue;
    }
    totalCalls += t.calls;
    totalNoMatch += t.noMatchCalls;
    body += `<tr><td>${escapeHtml(label)}</td><td>${t.calls}</td><td>${t.noMatchCalls}</td><td>${t.bodiesReturned}</td><td>${t.reusedBodies}</td><td>${t.errorCalls}</td><td>${t.mainCalls}/${t.workerCalls}</td></tr>\n`;
  }

  body += `</tbody>
</table>\n`;

  if (lookups.skills.length > 0) {
    body += `<table>
<thead>
<tr>
<th>Skill id</th>
<th>Returned</th>
<th>Main/Workers</th>
</tr>
</thead>
<tbody>\n`;
    for (const s of lookups.skills) {
      body += `<tr><td>${escapeHtml(s.id)}</td><td>${s.returns}</td><td>${s.mainReturns}/${s.workerReturns}</td></tr>\n`;
    }
    body += `</tbody>
</table>\n`;
  }

  const cappedSentence = lookups.capped
    ? "; the session hit the top-30 skill cap"
    : "";
  body += `<p class="mt">${lookups.distinctSkills} distinct skills; ${lookups.otherSkillReturns} more deliveries outside this list; ${lookups.unvalidatedReturns} deliveries with an unreadable id.${cappedSentence}</p>\n`;

  const timingClaim = (claims ?? []).find(
    (c) => c.template === "skill-trigger-timing",
  );
  if (timingClaim) {
    const mainCallsBeforeFirstSkillLoad = countOf(
      timingClaim.values,
      "mainCallsBeforeFirstSkillLoad",
    );
    const sessionsWithSkillLoad = countOf(
      timingClaim.values,
      "sessionsWithSkillLoad",
    );
    const measuredSessions = countOf(timingClaim.values, "measuredSessions");
    body += `<p class="mt">The main session made ${mainCallsBeforeFirstSkillLoad} other tool calls before its first skill lookup; ${sessionsWithSkillLoad} of ${measuredSessions} sessions looked a skill up.</p>\n`;
  }

  const headline = `${plural(totalCalls, "lookup")}, ${totalNoMatch} matched nothing`;
  return wrapCollapsed("<h3>AGS lookups</h3>", headline, body);
}

function renderTrend(ledger: Ledger, context?: ReportContext): string {
  if (!context || !context.previous || context.previous.length === 0) {
    return "";
  }

  const current = computeRates(ledger);
  const prevList = context.previous.slice(0, 3);

  const prevHeaders = prevList
    .map((p) => {
      const id8 = p.session ? p.session.slice(0, 8) : "unknown";
      const date = p.to
        ? p.to.includes("T")
          ? p.to.slice(0, 10)
          : p.to
        : "unknown";
      return `<th>session ${escapeHtml(id8)} ending ${escapeHtml(date)}</th>`;
    })
    .join("\n");

  type MetricRow = {
    label: string;
    formatter: (r: SessionRates) => string;
  };

  const metrics: MetricRow[] = [
    {
      label: "Cost per 100 turns",
      formatter: (r) =>
        r.costCentsPer100Turns === null || r.costCentsPer100Turns === undefined
          ? "n/a"
          : formatMoney(r.costCentsPer100Turns),
    },
    {
      label: "Permission answers per 100 turns",
      formatter: (r) =>
        r.permissionAnswersPer100TurnsTenths === null ||
        r.permissionAnswersPer100TurnsTenths === undefined
          ? "n/a"
          : formatRate(r.permissionAnswersPer100TurnsTenths),
    },
    {
      label: "Error stops per 100 turns",
      formatter: (r) =>
        r.errorStopsPer100TurnsTenths === null ||
        r.errorStopsPer100TurnsTenths === undefined
          ? "n/a"
          : formatRate(r.errorStopsPer100TurnsTenths),
    },
    {
      label: "Tool errors per 100 calls",
      formatter: (r) =>
        r.toolErrorsPer100CallsTenths === null ||
        r.toolErrorsPer100CallsTenths === undefined
          ? "n/a"
          : formatRate(r.toolErrorsPer100CallsTenths),
    },
    {
      label: "Lookups matching nothing",
      formatter: (r) =>
        r.lookupMissPercent === null || r.lookupMissPercent === undefined
          ? "n/a"
          : `${r.lookupMissPercent}%`,
    },
    {
      label: "Compactions per 100 turns",
      formatter: (r) =>
        r.compactionsPer100TurnsTenths === null ||
        r.compactionsPer100TurnsTenths === undefined
          ? "n/a"
          : formatRate(r.compactionsPer100TurnsTenths),
    },
    {
      label: "Unguarded edits",
      formatter: (r) =>
        r.unguardedEditPercent === null || r.unguardedEditPercent === undefined
          ? "n/a"
          : `${r.unguardedEditPercent}%`,
    },
  ];

  let rows = "";
  for (const m of metrics) {
    const curVal = m.formatter(current);
    const prevVals = prevList
      .map((p) => `<td>${escapeHtml(m.formatter(p))}</td>`)
      .join("");
    rows += `<tr><td>${escapeHtml(m.label)}</td><td>${escapeHtml(curVal)}</td>${prevVals}</tr>\n`;
  }

  const body = `<p>Earlier reports for the same folder; not necessarily the same task.</p>
<table>
<thead>
<tr>
<th>Metric</th>
<th>This session</th>
${prevHeaders}
</tr>
</thead>
<tbody>
${rows}</tbody>
</table>\n`;

  const headline = `compared with ${plural(prevList.length, "earlier report")}`;
  return wrapCollapsed(
    "<h3>Compared with earlier reports for this folder</h3>",
    headline,
    body,
  );
}

function renderAgentsTable(
  agents: LedgerAgent[] | undefined,
  otherAgents: ViewLedger["otherAgents"],
  coverageClaim: Claim | undefined,
): string {
  if (!agents || agents.length === 0) return "";

  let body = `<table>
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
    body += `<tr${trClass}><td>${escapeHtml(a.label)}</td><td>${escapeHtml(a.kind)}</td><td>${escapeHtml(a.model)}</td><td>${a.turns}</td><td>${escapeHtml(formatMoney(a.costCents))}</td><td>${escapeHtml(formatTokensK(a.cacheReadPerTurn))}</td><td>${a.compactions}</td><td>${a.toolErrors}/${a.toolCalls}</td><td>${a.permissionAnswers}</td></tr>\n`;
  }

  if (otherAgents && otherAgents.count > 0) {
    body += `<tr><td>${otherAgents.count} more agents</td><td>-</td><td>-</td><td>${otherAgents.turns}</td><td>${escapeHtml(formatMoney(otherAgents.costCents))}</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>\n`;
  }

  body += `</tbody>
</table>\n`;

  let headline: string | null = null;
  if (
    coverageClaim &&
    coverageClaim.values.agentsRead !== undefined &&
    coverageClaim.values.agentsCreated !== undefined
  ) {
    const observed = countOf(coverageClaim.values, "agentsRead");
    const created = countOf(coverageClaim.values, "agentsCreated");
    headline =
      created > 0
        ? `${observed} of ${plural(created, "agent")} observed`
        : null;
  }

  return wrapCollapsed("<h3>Agents</h3>", headline, body);
}

function renderLimits(): string {
  const body = `<ul>
<li>Counts show where to look, not why.</li>
<li>Cost is a price-table estimate; call-share attribution is an estimate.</li>
<li>Agents without a read session file are not covered.</li>
<li>The root session is not verified against the host.</li>
<li>AGS lookups are counted, not whether the rules were followed.</li>
<li>Commit counts and the branch come from git at report time.</li>
</ul>\n`;

  return wrapCollapsed("<h3>Limits</h3>", null, body);
}

export const REPORT_CSS = `:root{--red:#c62828;--amber:#b26a00;--ink:#1b1f24;--mute:#5b6570;--line:#e3e7eb;--bg:#f6f8fa}
*{box-sizing:border-box}
body{font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:var(--ink);margin:0;background:#fff}
.wrap{max-width:1000px;margin:0 auto;padding:20px}
.meta{color:var(--mute);font-size:13px;margin:6px 0 14px}
.title{font-size:14px;margin:4px 0}
.soft{color:var(--mute);font-size:12px}
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
.bar{display:inline-block;height:8px;background:var(--mute);border-radius:2px;margin-left:6px;vertical-align:middle}
table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}
th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:right}
th:first-child,td:first-child{text-align:left}
th{font-size:11px;color:var(--mute);text-transform:uppercase}
tr.main td{font-weight:700;background:#fff8e1}
tr.total td{font-weight:700;border-top:1px solid var(--line)}
ul{margin:8px 0;padding-left:20px}
li{margin:4px 0;font-size:14px}
@media(max-width:820px){.tiles{grid-template-columns:1fr}}
pre.cmd{white-space:pre-wrap;word-break:break-word;margin:0;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;max-width:70ch;text-align:left}
tr.denied{border-left:3px solid var(--red)}
tr.denied td:first-child{border-left:3px solid var(--red)}
details.sec{border-top:1px solid var(--line, #ddd);margin:0}
details.sec>summary{cursor:pointer;list-style:none;display:flex;gap:12px;align-items:baseline;padding:10px 0}
details.sec>summary::-webkit-details-marker{display:none}
details.sec>summary::before{content:"\\25B8";color:#666}
details.sec[open]>summary::before{content:"\\25BE"}
details.sec>summary h3{margin:0}
.sum{color:#555;font-size:13px}
.hint{color:var(--mute);font-size:13px;margin:12px 0}
@media print{details.sec>summary{break-after:avoid}}`;

export function renderReportHtml(
  ledger: Ledger,
  context?: ReportContext,
): string {
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
  const permissionRequestsClaim = ledger.claims.find(
    (c) => c.template === ("permission-requests" as Claim["template"]),
  );
  const permReqs =
    "permissionRequests" in vLedger ? vLedger.permissionRequests : null;
  const permissionRequestsHtml = renderPermissionRequests(
    permReqs,
    permissionRequestsClaim,
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
  const decisionsHtml = renderDecisions(vLedger.improvements);
  const doNextHtml = renderDoNext(vLedger.improvements);
  const outcomeHtml = renderOutcome(vLedger.outcome);
  const timelineHtml = renderTimeline(vLedger.days);
  const costAndModelsHtml = renderCostAndModels(vLedger, costDriversClaim);
  const toolFailuresHtml = renderToolFailures(vLedger.toolRows, ledger.claims);
  const errorStopsHtml = renderErrorStops(ledger.cells);
  const lookupsHtml = renderLookups(vLedger.lookups, ledger.claims);
  const trendHtml = renderTrend(ledger, context);
  const agentsHtml = renderAgentsTable(
    vLedger.agents,
    vLedger.otherAgents,
    coverageClaim,
  );
  const limitsHtml = renderLimits();
  const maintainerHtml = renderMaintainerImprovements(vLedger.improvements);

  const collapsedSections = [
    permissionRequestsHtml,
    outcomeHtml,
    timelineHtml,
    costAndModelsHtml,
    toolFailuresHtml,
    errorStopsHtml,
    lookupsHtml,
    trendHtml,
    agentsHtml,
    limitsHtml,
    maintainerHtml,
  ].filter((p) => p.length > 0);

  const hintHtml =
    collapsedSections.length > 0
      ? '<p class="hint">Sections below are collapsed. Click a title to expand it.</p>'
      : "";

  const parts = [
    headerHtml,
    bottomLineHtml,
    tilesHtml,
    decisionsHtml,
    doNextHtml,
    hintHtml,
    ...collapsedSections,
  ].filter((p) => p.length > 0);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>Agent retrospective</title>
<style>
${REPORT_CSS}
</style>
</head>
<body>
<div class="wrap">
${parts.join("\n")}
</div>
</body>
</html>\n`;
}
