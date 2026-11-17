import type { LedgerImprovement } from "../improvements";
import type { Claim, Ledger, LedgerAgent } from "../ledger";
import type { CoverageInventory } from "../contracts";
import type { PermissionFriction } from "../permission-friction";
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
  unmatchedObservations?: number;
  /** Accepted only when rendering a historical ledger from the prior schema. */
  unanswered?: number;
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
  commandCountsBasis?: "raw-observations-may-duplicate";
  requestCountsBasis?: "deduplicated-events" | "raw-observations-may-duplicate";
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

type NavItem = {
  id: string;
  label: string;
  badge?: string;
  alert?: boolean;
};

type RenderedSection = {
  html: string;
  nav: NavItem;
};

const CONTROL_CHARS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(0x1f)}${String.fromCharCode(
    0x7f,
  )}]`,
);

function isSafeEncodedSegment(segment: string): boolean {
  if (
    segment.length === 0 ||
    /^[.]+$/.test(segment) ||
    segment.includes("..") ||
    !/^[A-Za-z0-9._~%-]+$/.test(segment)
  ) {
    return false;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return false;
  }
  return (
    decoded.length > 0 &&
    decoded !== "." &&
    decoded !== ".." &&
    !decoded.includes("..") &&
    !decoded.includes("/") &&
    !decoded.includes("\\") &&
    !decoded.includes(":") &&
    !CONTROL_CHARS.test(decoded)
  );
}

function sanitizeSafeRelativeHref(
  href: string | null | undefined,
): string | null {
  if (typeof href !== "string" || href.length === 0) {
    return null;
  }
  if (
    CONTROL_CHARS.test(href) ||
    /[\s\\?#:]/.test(href) ||
    href.startsWith("/") ||
    href.includes("//")
  ) {
    return null;
  }
  if (href === "../../../../index.html") {
    return href;
  }
  if (href.startsWith("../../../") && href.endsWith("/report.html")) {
    const middle = href.slice("../../../".length, -"/report.html".length);
    const parts = middle.split("/");
    if (
      parts.length === 3 &&
      parts[1] === "generations" &&
      isSafeEncodedSegment(parts[0]) &&
      isSafeEncodedSegment(parts[2])
    ) {
      return href;
    }
    return null;
  }
  const segments = href.split("/");
  if (
    segments.length > 0 &&
    segments[segments.length - 1].endsWith(".html") &&
    segments.every((seg) => isSafeEncodedSegment(seg))
  ) {
    return href;
  }
  return null;
}

function renderTopNav(
  indexHref: string | null | undefined,
  navItems: NavItem[],
): string {
  const safeIndexHref = sanitizeSafeRelativeHref(indexHref);
  if (safeIndexHref === null && navItems.length === 0) {
    return "";
  }
  const backLink =
    safeIndexHref !== null
      ? `<a class="nav-back" href="${escapeHtml(safeIndexHref)}">← All sessions</a>`
      : "";
  const pills = navItems
    .map((item) => {
      const text = item.badge ? `${item.label} (${item.badge})` : item.label;
      const cls = item.alert ? "nav-pill alert" : "nav-pill";
      return `<a class="${cls}" href="#${escapeHtml(item.id)}">${escapeHtml(text)}</a>`;
    })
    .join("\n");
  const pillsHtml = pills ? `<div class="nav-pills">\n${pills}\n</div>` : "";
  return `<nav class="top-nav" aria-label="Report navigation">\n${backLink}${backLink && pillsHtml ? "\n" : ""}${pillsHtml}\n</nav>`;
}

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
  "tool-setup": "tool setup",
  "decision-review": "decision review",
};

const DECISION_BY_RULE: Record<string, string> = {
  "guardrail-answers":
    "Decide: review repeated requests under the existing approval policy; counts alone do not establish safety or justify allowlisting?",
  "cost-concentration":
    "Decide: split the orchestrator session and hand reads and edits to workers, or accept the cost?",
  "unguarded-edits":
    "Decide: require a file lookup before edits in the worker brief?",
  "human-intervention":
    "Decide: review ask-tool calls and aborted-stop observations before changing setup?",
  "repeated-permission-requests":
    "Decide: review repeated requests against the existing approval policy?",
  "agent-error-concentration":
    "Decide: check the provider route before the next run?",
  "lookup-misses":
    "Decide: fix the trigger words and file patterns of the skills these lookups missed?",
  "failure-run":
    "Decide: inspect and fix the repeated tool failure source?",
  "decision-review-backlog":
    "Decide: who reviews the agent-declared pending decisions before action?",
};

const UNKNOWN_BY_RULE: Record<string, string> = {
  "guardrail-answers":
    "whether each command was safe: read the commands in Permission requests",
  "cost-concentration":
    "why the main kept the work and whether the spend was worth it",
  "unguarded-edits": "whether the edited files needed a skill",
  "human-intervention": "what each ask or abort was about",
  "repeated-permission-requests":
    "whether the repeated safe-category requests were the same command or were avoidable",
  "agent-error-concentration": "the error category behind each stop",
  "lookup-misses": "which file types the empty lookups were for",
  "failure-run": "whether repeated tool failures share a root cause",
  "decision-review-backlog": "whether a decision is approved or whether the label is accurate",
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

function renderDelegationSegment(ledger: Ledger): string {
  const treeCoverage = ledger.treeCoverage;
  if (treeCoverage.state === "not-measured") return "tree not measured";
  const taskProvenance =
    "task counts are observed task-call attempts (not guaranteed successful)";
  const hostProvenance =
    treeCoverage.hostAgents.source === "agent-records"
      ? "host counts are observed descendant agent records"
      : "host counts are observed create_agent call attempts (not guaranteed successful)";
  return `${treeCoverage.state} (${treeCoverage.agentsRead} of ${plural(
    treeCoverage.agentsCreated,
    "counted agent item",
  )} read; ${taskProvenance}; ${hostProvenance})`;
}

function renderCoverageWarningHtml(ledger: ViewLedger): string {
  const inventory = ledger.inventory ?? null;
  if (inventory === null) {
    return ledger.coverage === "partial"
      ? '<p class="coverage-warning" role="status"><strong>Coverage warning:</strong> evidence coverage is partial; no session-file delegation completeness is claimed.</p>\n'
      : "";
  }
  const gaps =
    inventory.missing +
    inventory.restricted +
    inventory.unavailable +
    inventory.remote +
    inventory.unlinked;
  if (
    ledger.coverage === "complete" &&
    gaps === 0 &&
    inventory.read >= inventory.expected
  ) {
    return "";
  }
  const details: string[] = [];
  if (inventory.missing > 0) details.push(`${inventory.missing} missing`);
  if (inventory.restricted > 0)
    details.push(`${inventory.restricted} restricted`);
  if (inventory.unavailable > 0)
    details.push(`${inventory.unavailable} unavailable`);
  if (inventory.remote > 0) details.push(`${inventory.remote} remote`);
  if (inventory.unlinked > 0)
    details.push(`${inventory.unlinked} unlinked or unproven`);
  const detailText = details.length > 0 ? ` (${details.join(", ")})` : "";
  return `<p class="coverage-warning" role="status"><strong>Coverage warning:</strong> ${inventory.read} of ${plural(
    inventory.expected,
    "declared actor",
  )} read${escapeHtml(detailText)}. Delegation completeness is not claimed.</p>\n`;
}

const ACTOR_STATE_LABELS: Record<string, string> = {
  read: "read",
  missing: "missing source",
  restricted: "restricted",
  unavailable: "unavailable",
  "remote-not-authorized": "remote (not authorized)",
  unlinked: "unlinked",
};

function renderDelegationRoster(
  inventory: CoverageInventory | null,
): RenderedSection | null {
  if (inventory === null) return null;
  let body =
    "<p>Every declared actor, including ones that could not be read. A declared parent link is not host-authenticated lineage, and an unread actor's turns are unknown rather than zero.</p>\n";
  body += `<p>Declaration: ${escapeHtml(inventory.provenance.replace(/-/g, " "))} (unverified) &middot; ${inventory.linked} linked &middot; ${inventory.read} read &middot; ${inventory.missing} missing &middot; ${inventory.restricted} restricted &middot; ${inventory.unavailable} unavailable &middot; ${inventory.remote} remote &middot; ${inventory.unlinked} unlinked.</p>\n`;
  body += `<div class="table-wrap">
<table>
<thead>
<tr><th>Actor</th><th>Declared parent</th><th>State</th><th>Turns</th></tr>
</thead>
<tbody>\n`;
  for (const actor of inventory.actors) {
    const state = ACTOR_STATE_LABELS[actor.state] ?? actor.state;
    const turns = actor.turns === null ? "unknown" : String(actor.turns);
    body += `<tr><td>${escapeHtml(actor.label)}</td><td>${escapeHtml(actor.parentLabel ?? "root")}</td><td>${escapeHtml(state)}</td><td>${escapeHtml(turns)}</td></tr>\n`;
  }
  body += `</tbody>
</table>
</div>\n`;
  return {
    html: wrapCollapsed("<h3>Delegation roster</h3>", null, body, {
      id: "sec-roster",
      open: inventory.read < inventory.expected,
    }),
    nav: {
      id: "sec-roster",
      label: "Roster",
      badge: `${inventory.read}/${inventory.expected}`,
      alert: inventory.read < inventory.expected,
    },
  };
}

function renderPermissionFriction(
  friction: PermissionFriction | null | undefined,
): RenderedSection | null {
  if (!friction) return null;
  const optional = (value: number | null, unit: string): string =>
    value === null ? "not measured" : `${value} ${unit}`;
  let body = `<p>${plural(friction.requests, "request")} observed; ${friction.answered} answered, ${friction.unanswered} unanswered, ${plural(friction.repeatedRequests, "repeat request")} in the same tool category; safety and avoidability are unknown. Coverage: ${escapeHtml(friction.coverage)}.</p>\n`;
  body += `<p>Human answers: ${escapeHtml(optional(friction.humanAnswers, ""))} &middot; orchestrator answers: ${escapeHtml(optional(friction.orchestratorAnswers, ""))} &middot; wait: ${escapeHtml(optional(friction.waitMs, "ms"))} across ${plural(friction.waitMeasuredRequests, "measured request")}.</p>\n`;
  if (friction.byTool.length > 0) {
    body += `<h4>By tool</h4>
<div class="table-wrap">
<table><thead><tr><th>Tool</th><th>Requests</th><th>Repeated</th></tr></thead><tbody>\n`;
    for (const row of friction.byTool.slice(0, 15)) {
      body += `<tr><td>${escapeHtml(row.tool)}</td><td>${row.requests}</td><td>${row.repeatedRequests}</td></tr>\n`;
    }
    body += `</tbody></table>
</div>\n`;
  }
  if (friction.byAgent.length > 0) {
    body += `<h4>By actor</h4>
<div class="table-wrap">
<table><thead><tr><th>Actor</th><th>Requests</th><th>Answered</th><th>Unanswered</th><th>Repeated</th></tr></thead><tbody>\n`;
    for (const row of friction.byAgent.slice(0, 20)) {
      body += `<tr><td>${escapeHtml(row.label)}</td><td>${row.requests}</td><td>${row.answered}</td><td>${row.unanswered}</td><td>${row.repeatedRequests}</td></tr>\n`;
    }
    body += `</tbody></table>
</div>\n`;
  }
  if (friction.limitations.length > 0) {
    body += `<h4>Limitations</h4>\n<ul>\n`;
    for (const limitation of friction.limitations.slice(0, 10)) {
      body += `<li>${escapeHtml(limitation)}</li>\n`;
    }
    body += `</ul>\n`;
  }
  return {
    html: wrapCollapsed("<h3>Permission friction</h3>", null, body, {
      id: "sec-friction",
      open: false,
    }),
    nav: {
      id: "sec-friction",
      label: "Friction",
      badge: String(friction.requests),
      alert: friction.unanswered > 0,
    },
  };
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
    `Tree: ${escapeHtml(renderDelegationSegment(ledger))}`,
  );
  metaParts.push(`Cutoff: ${escapeHtml(ledger.cutoff)}`);

  let titleHtml = "";
  if (ledger.label !== null && ledger.label !== undefined) {
    titleHtml = `<p class="title">Title: ${escapeHtml(ledger.label)} <span class="soft">(agent-supplied, unverified)</span></p>\n`;
  }

  const warning = renderCoverageWarningHtml(ledger);
  return `<h1>Agent retrospective</h1>\n${warning}${titleHtml}<p class="meta">${metaParts.join(" &middot; ")}</p>`;
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
    const workerLabel =
      ledger.inventory?.known === true ? "declared worker" : "estimated worker";
    const agentDetail = `${observed} worker files read of ${plural(
      created,
      workerLabel,
    )}`;
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
      `${plural(answers, "recorded permission response attempt")} (${deny} requested deny).`,
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

  // 2. Permission response attempts
  let permTileClass = "";
  let permAnswersFormatted = "0";
  let permDetailText = "none observed";

  if (permClaim) {
    const answers = countOf(permClaim.values, "answers");
    const deny = countOf(permClaim.values, "deny");
    const other =
      typeof permClaim.values.other === "number"
        ? permClaim.values.other
        : Math.max(
            0,
            answers -
              countOf(permClaim.values, "allow") -
              deny,
          );
    const asks = countOf(permClaim.values, "askCalls");
    permAnswersFormatted = String(answers);
    if (answers === 0) {
      permDetailText = "none observed";
    } else {
      permDetailText = `${deny} requested deny, ${other} other, ${plural(
        asks,
        "ask-tool call",
      )}`;
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
    const workerLabel =
      ledger.inventory?.known === true ? "declared worker" : "estimated worker";
    if (created > 0) {
      coverageFormatted = `${observed} of ${created}`;
      coverageDetailText = `worker files read of ${plural(created, workerLabel)}`;
    } else {
      coverageFormatted = "n/a";
      coverageDetailText =
        ledger.inventory?.known === true
          ? "no declared workers"
          : "no estimated workers";
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
<div class="tile${permClassAttr}"><span>Permission response attempts</span><b>${escapeHtml(permAnswersFormatted)}</b><small>${escapeHtml(permDetailText)}</small></div>
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
      // Older ledgers carry no `other` value on this improvement; derive it from
      // the recorded partition so the category is not silently reported as zero.
      const other =
        typeof val.other === "number"
          ? val.other
          : Math.max(
              0,
              (val.answers ?? 0) - (val.allow ?? 0) - (val.deny ?? 0),
            );
      title = `Permission response attempts: ${val.answers ?? 0} (${val.allow ?? 0} requested allow, ${val.deny ?? 0} requested deny, ${other} other)`;
      saw = `the report recorded ${val.answers ?? 0} respond_to_permission call attempts; answering actor and human provenance are not measured, and host application is not recorded; ${val.targetsAtLeast3 ?? 0} agents were the target of 3 or more recorded attempts; ${val.deny ?? 0} were requested denials.`;
      change =
        "review repeated requested-allow entries and inspect each requested-deny entry under the existing approval policy; counts alone do not establish safety or justify allowlisting";
      metric = "permission response attempts per 100 turns";
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
      title = `Ask-tool calls: ${val.askCalls ?? 0} recorded calls, ${plural(val.abortedStops ?? 0, "aborted stop")}`;
      saw = `combined ask-tool and aborted-stop observations were ${per100} per 100 turns.`;
      change =
        "review ask-tool call and aborted-stop observations before changing setup";
      metric = "combined ask-tool and aborted-stop observations per 100 turns";
      valueStr = per100;
      break;
    }
    case "repeated-permission-requests": {
      title = `${val.repeatedRequests ?? 0} of ${val.requests ?? 0} permission requests repeated a tool category`;
      saw = `${val.answered ?? 0} were answered and ${val.unanswered ?? 0} unanswered; repeated requests share a tool category, not proven-identical commands; safety and avoidability are unknown.`;
      change =
        "review repeated requests against the existing approval policy; counts alone do not establish safety or justify allowlisting";
      metric = "repeated tool-category request share";
      valueStr = `${val.repeatedPercent ?? 0}%`;
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
    case "failure-run": {
      title = `${val.runs ?? 0} same-tool failure runs; longest ${val.longest ?? 0}`;
      saw = `the longest consecutive error-result streak was ${val.longest ?? 0} for ${val.tool ?? "an unknown tool"}.`;
      change = "inspect the tool setup and error category before changing routing";
      metric = "longest same-tool error run";
      valueStr = `${val.longest ?? 0}`;
      break;
    }
    case "decision-review-backlog": {
      title = `${val.defaultPendingReview ?? 0} agent-declared decisions pending review`;
      saw = `${val.highImpactDefaultPendingReview ?? 0} were marked high impact. These records do not establish authorization.`;
      change = "review the declared defaults before taking consequential action";
      metric = "high-impact pending decisions";
      valueStr = `${val.highImpactDefaultPendingReview ?? 0}`;
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
  options?: { id?: string; open?: boolean },
): string {
  const sumHtml =
    headline !== null ? `<span class="sum">${escapeHtml(headline)}</span>` : "";
  const idAttr = options?.id ? ` id="${escapeHtml(options.id)}"` : "";
  const openAttr = options?.open ? " open" : "";
  return `<details class="sec"${idAttr}${openAttr}><summary>${titleHtml}${sumHtml}</summary>\n${innerHtml}</details>`;
}

function renderMaintainerImprovements(
  improvements: LedgerImprovement[] | undefined,
  inventoryKnown: boolean,
): RenderedSection | null {
  const maintainerImps = (improvements ?? []).filter(
    (imp) => imp.audience === "maintainer",
  );
  if (maintainerImps.length === 0) return null;

  let body = '<ul class="mt">\n';
  for (const imp of maintainerImps) {
    if (imp.rule === "coverage-gap") {
      const inventoryGaps = imp.values.inventoryGaps ?? 0;
      const unlinkedAgents = imp.values.unlinkedAgents ?? 0;
      const agentsCreated = imp.values.agentsCreated ?? 0;
      const workerLabel = inventoryKnown ? "declared worker" : "estimated worker";
      const text =
        inventoryGaps > 0
          ? `Declared inventory gap: ${plural(inventoryGaps, "entry unread or unlinked")}; created-agent linkage lower bound: ${unlinkedAgents} of ${agentsCreated} (session-linkage).`
          : `${unlinkedAgents} of ${plural(agentsCreated, workerLabel)} have no session file read; Paseo agent sessions cannot be linked from the session file alone (session-linkage).`;
      body += `<li>${escapeHtml(text)}</li>\n`;
    } else if (imp.rule === "tracker-not-measured") {
      const text =
        "Server tracker numbers cover this process only, so lookups that matched nothing and bodies returned are not measured for this session (tracker-binding).";
      body += `<li>${escapeHtml(text)}</li>\n`;
    } else if (imp.rule === "permission-timing-unmeasured") {
      const text = `${imp.values.answered ?? 0} permission requests were answered but no structured request/answer timestamp pair supports a wait measurement; wait time remains unknown, not zero (tracker-binding).`;
      body += `<li>${escapeHtml(text)}</li>\n`;
    }
  }
  body += "</ul>\n";

  const headline = plural(maintainerImps.length, "item");
  return {
    html: wrapCollapsed(
      '<h3 class="mt">For the maintainer</h3>',
      headline,
      body,
      { id: "sec-maintainer", open: false },
    ),
    nav: {
      id: "sec-maintainer",
      label: "Maintainer",
      badge: String(maintainerImps.length),
    },
  };
}

function renderPermissionRequests(
  permissionRequests: LedgerPermissionRequests | null | undefined,
  permissionRequestsClaim: Claim | undefined,
  hasGuardrailAct: boolean,
): RenderedSection | null {
  if (!permissionRequests) return null;

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
  const other = permissionRequestsClaim
    ? countOf(permissionRequestsClaim.values, "otherVerdict")
    : permissionRequests.tools.reduce((sum, r) => sum + r.other, 0);

  let body =
    "<p>Captured permission requests and their recorded response categories. Categories are observed request/response intents, not verified host enforcement. Commands are shown after best-effort removal of secrets (tokens, keys, passwords, credentials in URLs). Review before sharing this report.</p>\n";
  if (permissionRequests.requestCountsBasis !== undefined) {
    const requestBasis =
      permissionRequests.requestCountsBasis === "deduplicated-events"
        ? "With complete event capture, request totals and tool/program breakdowns deduplicate actor+request identities across nodes; the earliest valid timestamped response supplies each category (ties keep the first observed response)."
        : "Event capture was incomplete, so request totals and tool/program breakdowns use raw observations and may include duplicates; cross-node matching is unavailable.";
    body += `<p>${escapeHtml(requestBasis)}</p>\n`;
  }
  body += `<p>${plural(asked, "request")} from ${plural(agentsAsked, "agent")}; ${answered} with recorded responses (${allowed} requested allow, ${denied} requested deny, ${other} other), ${unanswered} unanswered.</p>\n`;
  body += `<h4>By tool</h4>
<div class="table-wrap">
<table>
<thead>
<tr>
<th>Tool</th>
<th>Asked</th>
<th>Requested allow</th>
<th>Requested deny</th>
<th>Other</th>
<th>Unanswered</th>
</tr>
</thead>
<tbody>\n`;
  for (const r of permissionRequests.tools) {
    body += `<tr><td>${escapeHtml(r.name)}</td><td>${r.asked}</td><td>${r.allow}</td><td>${r.deny}</td><td>${r.other}</td><td>${r.unanswered}</td></tr>\n`;
  }
  body += `</tbody>
</table>
</div>\n`;

  body += `<h4>By program (bash)</h4>
<div class="table-wrap">
<table>
<thead>
<tr>
<th>Program</th>
<th>Asked</th>
<th>Requested allow</th>
<th>Requested deny</th>
<th>Other</th>
<th>Unanswered</th>
<th>Requested allow share %</th>
</tr>
</thead>
<tbody>\n`;
  for (const r of permissionRequests.programs) {
    const sharePct = r.asked > 0 ? Math.round((r.allow * 100) / r.asked) : 0;
    body += `<tr><td>${escapeHtml(r.name)}</td><td>${r.asked}</td><td>${r.allow}</td><td>${r.deny}</td><td>${r.other}</td><td>${r.unanswered}</td><td>${sharePct}%</td></tr>\n`;
  }
  body += `</tbody>
</table>
</div>\n`;
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
    body += `<p>Programs with at least 5 requests, some requested allow entries, and no requested-deny entries are review candidates under the existing approval policy; counts alone do not establish safety or justify allowlisting: ${listStr}.</p>\n`;
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
    body += `<p>Programs with recorded requested-deny entries identify commands to inspect before any allowlist change; whether the host enforced a denial is not recorded: ${listStr}.</p>\n`;
  }
  if (permissionRequests.commands && permissionRequests.commands.length > 0) {
    body += `<h4>Raw command observations</h4>
<p>These per-node command rows always show raw observations and may differ from aggregate request totals. Unmatched counts describe observations, not unique unanswered requests.</p>
<div class="table-wrap nowrap-first">
<table>
<thead>
<tr>
<th>Verdicts</th>
<th>Asked observations</th>
<th>Tool</th>
<th>Command</th>
</tr>
</thead>
<tbody>\n`;
    for (const r of permissionRequests.commands) {
      let verdicts = `${r.allow} allow, ${r.deny} deny`;
      if (r.other > 0) {
        verdicts += `, ${r.other} other`;
      }
      const unmatchedObservations =
        r.unmatchedObservations ?? r.unanswered ?? 0;
      if (unmatchedObservations > 0) {
        verdicts += `, ${unmatchedObservations} unmatched observations`;
      }
      const toolText =
        r.kind !== "tool"
          ? `${escapeHtml(r.tool)} (${escapeHtml(r.kind)})`
          : escapeHtml(r.tool);
      const trClass = r.deny > 0 ? ' class="denied"' : "";
      body += `<tr${trClass}><td>${escapeHtml(verdicts)}</td><td>${r.asked}</td><td>${toolText}</td><td><pre class="cmd">${escapeHtml(r.text)}</pre></td></tr>\n`;
    }
    body += `</tbody>
</table>
</div>\n`;

    if (
      permissionRequests.distinctCommands > permissionRequests.commands.length
    ) {
      body += `<p>Showing ${permissionRequests.commands.length} of ${permissionRequests.distinctCommands} distinct raw command observations; denied ones come first.</p>\n`;
    }
    if (permissionRequests.commandsOmitted > 0) {
      body += `<p>${permissionRequests.commandsOmitted} requests had no command text recorded.</p>\n`;
    }
  }

  if (answeredWithoutRequest > 0) {
    const basisDescription =
      permissionRequests.requestCountsBasis === "deduplicated-events"
        ? "deduplicated request-count basis"
        : permissionRequests.requestCountsBasis === "raw-observations-may-duplicate"
          ? "raw observation basis (duplicates possible)"
          : "reported request-count basis";
    body += `<p>${plural(answeredWithoutRequest, "unmatched response request-ID entry", "unmatched response request-ID entries")} on the same ${basisDescription}; these do not represent unique unanswered requests.</p>\n`;
  }

  body +=
    "<p>Programs are the first word of the command (after wrappers such as rtk proxy and env). Redaction is best effort: check the commands before sharing this report.</p>\n";

  const headline = `${plural(
    asked,
    "request",
  )}, ${denied} requested deny, ${other} other, ${unanswered} unanswered`;
  const shouldOpen = denied > 0 || unanswered > 0 || hasGuardrailAct;
  const badge =
    denied > 0
      ? `${denied} requested deny`
      : unanswered > 0
        ? `${unanswered} unanswered`
        : String(asked);
  return {
    html: wrapCollapsed("<h3>Permission requests</h3>", headline, body, {
      id: "sec-permissions",
      open: shouldOpen,
    }),
    nav: {
      id: "sec-permissions",
      label: "Permissions",
      badge,
      alert: denied > 0 || unanswered > 0,
    },
  };
}

function renderSessionSignals(ledger: Ledger): RenderedSection | null {
  const sections: string[] = [];
  if (ledger.activity !== null) {
    const activity = ledger.activity;
    const attribution = activity.userRows.byAttribution.length > 0
      ? `<ul>${activity.userRows.byAttribution.map((entry) => `<li>${escapeHtml(entry.key)}: ${entry.count}</li>`).join("")}</ul>`
      : "<p>No attribution keys recorded.</p>";
    const stops = activity.stopReasons.length > 0
      ? `<ul>${activity.stopReasons.map((entry) => `<li>${escapeHtml(entry.reason)}: ${entry.count}</li>`).join("")}</ul>`
      : "<p>No stop reasons recorded.</p>";
    const activityRate =
      activity.userRowsPer100TurnsTenths === null
        ? "not measured"
        : `${formatRate(activity.userRowsPer100TurnsTenths)} per 100 main turns`;
    sections.push(
      `<h4>Main-session user rows</h4><p>${activity.userRows.total} total; ${activity.userRows.steering} steering; ${activity.userRows.permissionNotifications} permission notifications. ${activityRate}.</p>${attribution}<h4>Tree stop reasons</h4>${stops}`,
    );
  } else {
    sections.push("<h4>Main-session user rows</h4><p>Not measured.</p>");
  }
  if (ledger.failureRuns !== null) {
    const rows = ledger.failureRuns.tools.map(
      (entry) => `<tr><td>${escapeHtml(entry.tool)}</td><td>${entry.runs}</td><td>${entry.longest}</td></tr>`,
    ).join("");
    const truncationNote = ledger.failureRuns.truncated
      ? " Partial measurement: counts are observed lower bounds."
      : "";
    sections.push(
      `<h4>Consecutive same-tool failures</h4><p>Runs require at least ${ledger.failureRuns.minLength} consecutive error results. ${ledger.failureRuns.runs} runs total; longest ${ledger.failureRuns.longest === null ? "none" : `${ledger.failureRuns.longest.length} for ${escapeHtml(ledger.failureRuns.longest.tool)} (${escapeHtml(ledger.failureRuns.longest.agent)})`}.${truncationNote}</p><div class="table-wrap"><table><thead><tr><th>Tool</th><th>Runs</th><th>Longest</th></tr></thead><tbody>${rows}</tbody></table></div>`,
    );
  }
  if (ledger.time !== null) {
    const time = ledger.time;
    const wall = time.wallSeconds === null ? "not measured" : `${time.wallSeconds}s`;
    const latency = time.permissionLatency === null
      ? "Not measured: no valid matched request/response pairs."
      : `${time.permissionLatency.timed} matched pairs; median ${time.permissionLatency.medianSeconds}s; max ${time.permissionLatency.maxSeconds}s.`;
    const mainTime = time.main === null
      ? "Main-session idle timing: not measured."
      : `Main-session idle gaps of at least ${time.main.idleGapMinSeconds}s: ${time.main.idleGaps}, ${time.main.idleSeconds}s total, longest ${time.main.longestGapSeconds}s.`;
    sections.push(
      `<h4>Time and waits</h4><p>${wall} wall time. ${mainTime} Permission response latency: ${latency}</p>`,
    );
  } else {
    sections.push("<h4>Time and waits</h4><p>Not measured.</p>");
  }
  if (sections.length === 0) return null;
  return {
    html: wrapCollapsed(
      "<h3>Session signals</h3>",
      "activity, failures, and timing",
      sections.join("\\n"),
      { id: "sec-signals", open: false },
    ),
    nav: { id: "sec-signals", label: "Session signals" },
  };
}

function renderDecisionRecords(ledger: Ledger): RenderedSection | null {
  const decisions = ledger.decisions;
  if (decisions === null) {
    return {
      html: wrapCollapsed(
        "<h3>Decision records</h3>",
        "not measured",
        "<p>Decision recording was not measured for this session.</p>",
        { id: "sec-decisions", open: false },
      ),
      nav: {
        id: "sec-decisions",
        label: "Decisions",
        badge: "not measured",
        alert: false,
      },
    };
  }
  const impacts = ["high", "medium", "low"] as const;
  const rows = impacts.map((impact) => {
    const count = decisions.byImpact[impact];
    return `<tr><td>${impact}</td><td>${count.rule}</td><td>${count.defaultPendingReview}</td></tr>`;
  }).join("");
  const refs = decisions.ruleRefs
    .map((entry) => `<tr><td>${escapeHtml(entry.ref)}</td><td>${entry.count}</td></tr>`)
    .join("");
  const impactRank = { high: 0, medium: 1, low: 2 } as const;
  const pendingItems = [...decisions.items]
    .filter((item) => item.basis === "default-pending-review")
    .sort(
      (a, b) =>
        impactRank[a.impact] - impactRank[b.impact] || a.at.localeCompare(b.at),
    )
    .slice(0, 50)
    .map((item) => `<li><strong>${escapeHtml(item.impact)}</strong>, ${escapeHtml(item.agent)}, ${escapeHtml(item.at)}: ${escapeHtml(item.label)}</li>`)
    .join("");
  const highPending = decisions.byImpact.high.defaultPendingReview;
  const body = `<p>Agent-declared and unverified records. The tool does not approve actions or prove authorization. ${decisions.total} recorded; ${decisions.irreversible} marked irreversible; ${decisions.rejected} rejected; ${decisions.unconfirmed} unconfirmed.</p>
<h4>Basis by impact</h4><div class="table-wrap"><table><thead><tr><th>Impact</th><th>Named rule</th><th>Pending-review default</th></tr></thead><tbody>${rows}</tbody></table></div>
<h4>Named rules</h4>${refs.length > 0 ? `<div class="table-wrap"><table><thead><tr><th>Rule reference</th><th>Count</th></tr></thead><tbody>${refs}</tbody></table></div>` : "<p>No named-rule decisions.</p>"}
<h4>Pending-review defaults (first 50)</h4>${pendingItems.length > 0 ? `<ol>${pendingItems}</ol>` : "<p>None recorded; unrecorded decisions are not counted.</p>"}<p>${decisions.itemsOmitted} decision items omitted by storage cap.</p>`;
  return {
    html: wrapCollapsed(
      "<h3>Decision records</h3>",
      `${decisions.total} agent-declared, unverified`,
      body,
      { id: "sec-decisions", open: highPending > 0 },
    ),
    nav: {
      id: "sec-decisions",
      label: "Decisions",
      badge: String(decisions.total),
      alert: highPending > 0,
    },
  };
}

function renderOutcome(outcome: LedgerOutcome | undefined): RenderedSection {
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
    body = `<div class="table-wrap">
<table>
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
</div>
<p class="mt">Commits are counted across all branches of the repository in the session window and may include other work; the branch is the current one, not necessarily the session's.</p>\n`;
    headline = `${plural(effectiveOutcome.commits, "commit")}, ${plural(effectiveOutcome.filesChanged, "file")} changed`;
  }

  return {
    html: wrapCollapsed("<h3>Outcome</h3>", headline, body, {
      id: "sec-outcome",
      open: false,
    }),
    nav: {
      id: "sec-outcome",
      label: "Outcome",
      ...(effectiveOutcome.source === "git"
        ? { badge: plural(effectiveOutcome.commits, "commit") }
        : {}),
    },
  };
}

function renderTimeline(days: LedgerDay[] | undefined): RenderedSection {
  if (!days || days.length === 0) {
    return {
      html: wrapCollapsed(
        "<h3>Timeline</h3>",
        null,
        "<p>No timeline recorded.</p>\n",
        { id: "sec-timeline", open: false },
      ),
      nav: { id: "sec-timeline", label: "Timeline" },
    };
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
  const body = `<div class="table-wrap nowrap-first">
<table>
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
</div>
${note}`;

  const headline = plural(days.length, "day");
  return {
    html: wrapCollapsed("<h3>Timeline</h3>", headline, body, {
      id: "sec-timeline",
      open: false,
    }),
    nav: { id: "sec-timeline", label: "Timeline", badge: headline },
  };
}

function renderCostAndModels(
  ledger: ViewLedger,
  costDriversClaim: Claim | undefined,
  hasCostAct: boolean,
): RenderedSection | null {
  const models = ledger.models ?? [];
  if (!costDriversClaim && models.length === 0) return null;

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

    body += `<div class="table-wrap">
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
</div>
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

    body += `<div class="table-wrap">
<table>
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
</table>
</div>\n`;
  }

  const headline = `${formatMoney(totalCostCents)} est., ${plural(models.length, "model")}`;
  return {
    html: wrapCollapsed("<h3>Cost and models</h3>", headline, body, {
      id: "sec-cost",
      open: hasCostAct,
    }),
    nav: {
      id: "sec-cost",
      label: "Cost",
      badge: formatMoney(totalCostCents),
    },
  };
}

function renderToolFailures(
  toolRows: LedgerToolRow[] | undefined,
  claims: Claim[] | undefined,
  hasAnyAct: boolean,
): RenderedSection | null {
  if (!toolRows || toolRows.length === 0) return null;

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
<div class="table-wrap">
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
</table>
</div>\n`;

  const totalToolErrors = Math.max(
    failed,
    toolRows.reduce((sum, r) => sum + r.errors, 0),
  );
  const shouldOpen = totalToolErrors > 0 && hasAnyAct;
  const headline = `${failed} of ${plural(calls, "tool call")} failed`;
  return {
    html: wrapCollapsed("<h3>Tool failures</h3>", headline, body, {
      id: "sec-tools",
      open: shouldOpen,
    }),
    nav: {
      id: "sec-tools",
      label: "Tool failures",
      badge: `${failed}/${calls}`,
      alert: shouldOpen,
    },
  };
}

function renderErrorStops(
  cells: Ledger["cells"] | undefined,
  hasAgentErrorAct: boolean,
): RenderedSection | null {
  const errorCells = (cells ?? []).filter((c) => c.errorStops > 0);
  if (errorCells.length === 0) return null;
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
<div class="table-wrap nowrap-first">
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
</table>
</div>\n`;

  const headline = plural(totalStops, "error stop");
  const shouldOpen = totalStops > 0 || hasAgentErrorAct;
  return {
    html: wrapCollapsed("<h3>Error stops</h3>", headline, body, {
      id: "sec-errors",
      open: shouldOpen,
    }),
    nav: {
      id: "sec-errors",
      label: "Error stops",
      badge: String(totalStops),
      alert: shouldOpen,
    },
  };
}

function renderLookups(
  lookups: LedgerLookups | null | undefined,
  claims: Claim[] | undefined,
  hasLookupsAct: boolean,
): RenderedSection {
  if (!lookups) {
    const body =
      "<p>AGS lookups were not measured (no session files read).</p>\n";
    return {
      html: wrapCollapsed("<h3>AGS lookups</h3>", null, body, {
        id: "sec-lookups",
        open: hasLookupsAct,
      }),
      nav: { id: "sec-lookups", label: "Lookups" },
    };
  }

  let body =
    "<p>What AGS returned for lookups made in this session. Returned is not followed: the file shows what AGS sent, not what the agent did.</p>\n";
  body += `<div class="table-wrap">
<table>
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
</table>
</div>\n`;

  if (lookups.skills.length > 0) {
    body += `<div class="table-wrap">
<table>
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
</table>
</div>\n`;
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
  return {
    html: wrapCollapsed("<h3>AGS lookups</h3>", headline, body, {
      id: "sec-lookups",
      open: hasLookupsAct,
    }),
    nav: {
      id: "sec-lookups",
      label: "Lookups",
      badge: String(totalCalls),
    },
  };
}

function renderTrend(
  ledger: Ledger,
  context?: ReportContext,
): RenderedSection | null {
  if (!context || !context.previous || context.previous.length === 0) {
    return null;
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
      const label = `session ${escapeHtml(id8)} ending ${escapeHtml(date)}`;
      const safeHref = sanitizeSafeRelativeHref(p.reportHref);
      if (safeHref !== null) {
        return `<th><a href="${escapeHtml(safeHref)}">${label}</a></th>`;
      }
      return `<th>${label}</th>`;
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
      label: "Permission response attempts per 100 turns",
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
<div class="table-wrap">
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
</table>
</div>\n`;

  const headline = `compared with ${plural(prevList.length, "earlier report")}`;
  return {
    html: wrapCollapsed(
      "<h3>Compared with earlier reports for this folder</h3>",
      headline,
      body,
      { id: "sec-trend", open: false },
    ),
    nav: {
      id: "sec-trend",
      label: "Trend",
      badge: `${prevList.length} earlier`,
    },
  };
}

function renderAgentsTable(
  agents: LedgerAgent[] | undefined,
  otherAgents: ViewLedger["otherAgents"],
  coverageClaim: Claim | undefined,
  hasAgentsAct: boolean,
): RenderedSection | null {
  if (!agents || agents.length === 0) return null;

  let body = `<div class="table-wrap">
<table>
<thead>
<tr>
<th>Agent</th>
<th>Kind</th>
<th>Model</th>
<th>Turns</th>
<th>Active span</th>
<th>Cost</th>
<th>Cached/turn</th>
<th>Compactions</th>
<th>Tool errors/calls</th>
<th>Permission response attempts</th>
</tr>
</thead>
<tbody>\n`;

  const displayed = agents.slice(0, 12);
  for (const a of displayed) {
    const trClass = a.label === "main" ? ' class="main"' : "";
    const activeSpan =
      a.activeSeconds === null ? "n/a" : `${a.activeSeconds}s`;
    body += `<tr${trClass}><td>${escapeHtml(a.label)}</td><td>${escapeHtml(a.kind)}</td><td>${escapeHtml(a.model)}</td><td>${a.turns}</td><td>${escapeHtml(activeSpan)}</td><td>${escapeHtml(formatMoney(a.costCents))}</td><td>${escapeHtml(formatTokensK(a.cacheReadPerTurn))}</td><td>${a.compactions}</td><td>${a.toolErrors}/${a.toolCalls}</td><td>${a.permissionAnswers}</td></tr>\n`;
  }

  if (otherAgents && otherAgents.count > 0) {
    body += `<tr><td>${otherAgents.count} more agents</td><td>-</td><td>-</td><td>${otherAgents.turns}</td><td>-</td><td>${escapeHtml(formatMoney(otherAgents.costCents))}</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>\n`;
  }

  body += `</tbody>
</table>
</div>\n`;

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

  const totalAgentsCount = agents.length + (otherAgents?.count ?? 0);
  return {
    html: wrapCollapsed("<h3>Agents</h3>", headline, body, {
      id: "sec-agents",
      open: hasAgentsAct,
    }),
    nav: {
      id: "sec-agents",
      label: "Agents",
      badge: String(totalAgentsCount),
    },
  };
}

function renderLimits(
  inventory: CoverageInventory | null,
  friction: PermissionFriction | null,
): RenderedSection {
  let body = `<ul>
<li>Counts show where to look, not why.</li>
<li>Cost is a price-table estimate; call-share attribution is an estimate.</li>
<li>Agents without a read session file are not covered.</li>`;
  if (inventory !== null) {
    body += `
<li>Unread declared actors are gaps: their turns, usage and timing are unknown, not zero.</li>`;
  }
  if (friction !== null) {
    if (friction.humanAnswers === null || friction.waitMs === null) {
      body += `
<li>Answerer provenance and wait time are shown only where structured evidence supports them; null means unknown.</li>`;
    }
    body += `
<li>Repeated requests share a tool category, not proven-identical commands; safety and avoidability are unknown.</li>`;
  }
  body += `
<li>The root session is not verified against the host.</li>
<li>AGS lookups are counted, not whether the rules were followed.</li>
<li>Commit counts and the branch come from git at report time.</li>
</ul>\n`;

  return {
    html: wrapCollapsed("<h3>Limits</h3>", null, body, {
      id: "sec-limits",
      open: false,
    }),
    nav: { id: "sec-limits", label: "Limits" },
  };
}

export const REPORT_CSS = `:root{--red:#c62828;--amber:#b26a00;--ink:#1b1f24;--mute:#5b6570;--line:#e3e7eb;--bg:#f6f8fa}
*{box-sizing:border-box}
body{font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:var(--ink);margin:0;background:#fff}
.wrap{max-width:1200px;margin:0 auto;padding:20px}
a{color:#0969da;text-decoration:none}
a:hover{text-decoration:underline}
.top-nav{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;margin:0 0 14px;background:var(--bg);border:1px solid var(--line);border-radius:8px;font-size:13px}
.nav-back{font-weight:600;white-space:nowrap;padding:3px 10px 3px 0;margin-right:4px;border-right:1px solid var(--line)}
.nav-pills{display:flex;flex-wrap:wrap;gap:6px}
.nav-pill{display:inline-block;padding:2px 9px;border:1px solid var(--line);border-radius:99px;background:#fff;color:var(--ink);white-space:nowrap;font-size:12px}
.nav-pill:hover{border-color:#0969da;color:#0969da;text-decoration:none}
.nav-pill.alert{border-color:var(--red);color:var(--red);font-weight:600}
.meta{color:var(--mute);font-size:13px;margin:6px 0 14px}
.coverage-warning{background:#fff4e5;border:1px solid var(--amber);border-radius:8px;padding:8px 12px;margin:8px 0 14px;color:#5a3600;font-size:14px}
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
.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:8px 0}
.table-wrap table{margin:0}
table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}
th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:right}
th:first-child,td:first-child{text-align:left}
th{font-size:11px;color:var(--mute);text-transform:uppercase;white-space:nowrap}
td:not(:first-child){white-space:nowrap}
.table-wrap.nowrap-first td:first-child{white-space:nowrap}
tr.main td{font-weight:700;background:#fff8e1}
tr.total td{font-weight:700;border-top:1px solid var(--line)}
ul{margin:8px 0;padding-left:20px}
li{margin:4px 0;font-size:14px}
@media(max-width:820px){.tiles{grid-template-columns:1fr}}
pre.cmd{white-space:pre-wrap;word-break:break-word;margin:0;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;max-width:70ch;text-align:left}
tr.denied{border-left:3px solid var(--red)}
tr.denied td:first-child{border-left:3px solid var(--red)}
details.sec{border-top:1px solid var(--line, #ddd);margin:0}
details.sec:target{outline:2px solid #0969da;border-radius:6px;padding-left:6px;padding-right:6px}
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
  const inventory = vLedger.inventory ?? null;
  const friction = vLedger.permissionFriction ?? null;
  const improvements = vLedger.improvements ?? [];
  const hasAct = (rule: string): boolean =>
    improvements.some((imp) => imp.rule === rule && imp.level === "act");
  const hasAnyAct = improvements.some((imp) => imp.level === "act");

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

  const sections = [
    renderDelegationRoster(inventory),
    renderPermissionRequests(
      permReqs,
      permissionRequestsClaim,
      hasAct("guardrail-answers"),
    ),
    renderPermissionFriction(friction),
    renderSessionSignals(ledger),
    renderDecisionRecords(ledger),
    renderOutcome(vLedger.outcome),
    renderTimeline(vLedger.days),
    renderCostAndModels(
      vLedger,
      costDriversClaim,
      hasAct("cost-concentration"),
    ),
    renderToolFailures(vLedger.toolRows, ledger.claims, hasAnyAct),
    renderErrorStops(ledger.cells, hasAct("agent-error-concentration")),
    renderLookups(
      vLedger.lookups,
      ledger.claims,
      hasAct("unguarded-edits") || hasAct("lookup-misses"),
    ),
    renderTrend(ledger, context),
    renderAgentsTable(
      vLedger.agents,
      vLedger.otherAgents,
      coverageClaim,
      hasAct("agent-error-concentration") || hasAct("human-intervention"),
    ),
    renderLimits(inventory, friction),
    renderMaintainerImprovements(
      vLedger.improvements,
      vLedger.inventory?.known === true,
    ),
  ].filter((sec): sec is RenderedSection => sec !== null);

  const topNavHtml = renderTopNav(
    context?.indexHref,
    sections.map((sec) => sec.nav),
  );
  const collapsedSections = sections.map((sec) => sec.html);

  const hintHtml =
    collapsedSections.length > 0
      ? '<p class="hint">Flagged sections are expanded automatically; jump to any section above or click a title to expand or collapse.</p>'
      : "";

  const parts = [
    topNavHtml,
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
