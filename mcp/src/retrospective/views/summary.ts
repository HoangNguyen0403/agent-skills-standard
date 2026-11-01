import type { Claim, Ledger } from "../ledger";

const MAX_SUMMARY_LINES = 40;
const MAX_SUMMARY_BYTES = 4096;
const MAX_TOP_SKILLS = 5;
const MAX_LEADS = 5;
/** Registry ids are printed verbatim, so anything else is dropped rather than echoed. */
const SAFE_SKILL_ID_REGEX = /^[A-Za-z0-9._:/@+-]{1,96}$/;
/** Below this many turns a cell's rate is noise, so the ledger only ranks bigger ones. */
const MIN_RANKED_TURNS = 5;

type SkillSectionOptions = {
  /** How many top-skill entries to print. */
  topSkills: number;
  /** How many top host-read skill entries to print. */
  topHostSkills: number;
  /** Whether the skill-timing line is printed. */
  timing: boolean;
};

/** `1 session` / `2 sessions`; pass a plural form for nouns that do not take `s`. */
function plural(n: number, singular: string, pluralForm?: string): string {
  if (n === 1) return `1 ${singular}`;
  return `${n} ${pluralForm ?? `${singular}s`}`;
}

/** Verb form that agrees with `n`. */
function verb(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function countOf(values: Claim["values"], key: string): number {
  const value = values[key];
  return typeof value === "number" ? value : 0;
}

function stringOf(values: Claim["values"], key: string): string | null {
  const value = values[key];
  return typeof value === "string" ? value : null;
}

/**
 * Fixed wording for the delegation numbers. Counts of read and created agents
 * are observations; the sentence never says why a session was not read.
 */
function renderAgentsClause(
  agentsRead: number,
  agentsCreated: number,
  unlinkedAgents: number,
): string {
  if (agentsCreated === 0) {
    return "no agents were created.";
  }
  return `${agentsRead} of ${plural(agentsCreated, "created agent")} ${verb(
    agentsRead,
    "has",
    "have",
  )} a session file that was read, ${unlinkedAgents} ${verb(
    unlinkedAgents,
    "has",
    "have",
  )} none.`;
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
  return `${agentsRead} of ${agentsCreated} created agents read`;
}

/** The skipped-line caveat a claim carries when its metric may undercount. */
function renderUndercount(completeness: unknown, skippedLines: number): string {
  if (completeness !== "may-undercount-by-skipped-lines") return "";
  return ` (may undercount: ${plural(skippedLines, "line")} ${verb(
    skippedLines,
    "was",
    "were",
  )} skipped)`;
}

function renderTimingLine(claim: Claim): string {
  const values = claim.values;
  const measuredSessions = countOf(values, "measuredSessions");
  const text = `[${claim.id}] Skill timing: ${countOf(
    values,
    "sessionsWithSkillLoad",
  )} of ${plural(measuredSessions, "session")} called a skill-loading tool`;
  if (typeof values.mainCallsBeforeFirstSkillLoad === "number") {
    return `${text}; the main session made ${plural(
      values.mainCallsBeforeFirstSkillLoad,
      "other tool call",
    )} before its first one.`;
  }
  if (countOf(values, "mainSkillLoadCalls") === 0) {
    return `${text}; the main session called none.`;
  }
  return `${text}.`;
}

function renderHostLine(claim: Claim): string {
  const values = claim.values;
  const readCalls = countOf(values, "readCalls");
  if (readCalls === 0) {
    return `[${claim.id}] Host skill reads: none (0 reads; measured on OMP sessions).`;
  }
  const measuredSessions = countOf(values, "measuredSessions");
  const text = `[${claim.id}] Host skill reads: ${plural(
    readCalls,
    "read",
  )} of ${plural(
    countOf(values, "uniqueSkills"),
    "skill",
  )} (ids derived from the read path, not checked against the registry); ${countOf(
    values,
    "sessionsWithAnySkillAccess",
  )} of ${plural(
    measuredSessions,
    "session",
  )} accessed a skill by either route`;
  if (typeof values.mainCallsBeforeFirstSkillAccess === "number") {
    return `${text}; the main session made ${plural(
      values.mainCallsBeforeFirstSkillAccess,
      "other tool call",
    )} before its first skill access.`;
  }
  return `${text}.`;
}

/** `read:2,write:1` becomes `read x 2, write x 1`; anything unparseable is dropped. */
function renderTopErrorTools(raw: string): string {
  const entries: string[] = [];
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    const separator = trimmed.lastIndexOf(":");
    if (separator <= 0) continue;
    const tool = trimmed.slice(0, separator).trim();
    const count = trimmed.slice(separator + 1).trim();
    if (tool === "" || !/^\d+$/.test(count)) continue;
    entries.push(`${tool} x ${count}`);
  }
  return entries.join(", ");
}

function renderSkillSection(
  ledger: Ledger,
  options: SkillSectionOptions,
): string[] {
  const skillClaim = ledger.claims.find(
    (claim) => claim.template === "skill-usage",
  );
  const timingClaim = ledger.claims.find(
    (claim) => claim.template === "skill-trigger-timing",
  );
  const hostClaim = ledger.claims.find(
    (claim) => claim.template === "host-skill-reads",
  );
  if (!skillClaim && !timingClaim && !hostClaim) return [];

  const lines: string[] = ["## Skills"];
  if (skillClaim) {
    const values = skillClaim.values;
    const window =
      values.trackerWindow === "matches-session"
        ? "the whole session"
        : `this server process since ${skillClaim.scope.from}`;
    const bodyReturns = countOf(values, "bodyReturns");
    const workflows = countOf(values, "workflows");
    const guides = countOf(values, "guides");
    let text = `[${skillClaim.id}] Skill lookups: ${plural(
      countOf(values, "loadCalls"),
      "call",
    )} to skill-loading tools; ${countOf(
      values,
      "noMatchCalls",
    )} matched nothing; ${plural(
      bodyReturns,
      "skill body",
      "skill bodies",
    )} ${verb(bodyReturns, "was", "were")} returned (${plural(
      countOf(values, "skillsTotal"),
      "unique skill",
    )}, ${countOf(values, "dedupedReturns")} reused from context).`;
    if (workflows > 0 || guides > 0) {
      text += ` ${plural(workflows, "workflow")}, ${plural(
        guides,
        "guide",
      )} loaded.`;
    }
    lines.push(`${text} Window: ${window}.`);

    const top =
      ledger.skillUsage === null
        ? []
        : ledger.skillUsage.skills
            .filter((skill) => SAFE_SKILL_ID_REGEX.test(skill.id))
            .slice(0, options.topSkills);
    if (top.length > 0) {
      lines.push(
        `Top skills: ${top
          .map((skill) => `${skill.id} x${skill.returns}`)
          .join(", ")}`,
      );
    }
  }
  if (timingClaim && options.timing) {
    lines.push(renderTimingLine(timingClaim));
  }
  if (hostClaim) {
    lines.push(renderHostLine(hostClaim));
    if (countOf(hostClaim.values, "readCalls") > 0) {
      const hostTop = (ledger.hostSkills?.top ?? [])
        .filter((entry) => SAFE_SKILL_ID_REGEX.test(entry.id))
        .slice(0, options.topHostSkills);
      if (hostTop.length > 0) {
        lines.push(
          `Top host-read skills: ${hostTop
            .map((entry) => `${entry.id} x${entry.reads}`)
            .join(", ")}`,
        );
      }
    }
  }
  return lines;
}

function renderLines(ledger: Ledger, options: SkillSectionOptions): string[] {
  const lines: string[] = [];

  const evidenceStr =
    ledger.evidenceMode === "tracker-only"
      ? "tracker only (no session files read)"
      : "native session files";
  const rootStr =
    ledger.rootVerification === "unverified-root" ? "unverified root" : "n/a";

  const coverageClaim = ledger.claims.find((c) => c.template === "coverage");
  const agentsCreated = coverageClaim
    ? countOf(coverageClaim.values, "agentsCreated")
    : ledger.counts.agentsCreated;
  const agentsRead = coverageClaim
    ? countOf(coverageClaim.values, "agentsRead")
    : 0;
  const unlinkedAgents = coverageClaim
    ? countOf(coverageClaim.values, "unlinkedAgents")
    : ledger.counts.agentsCreated - ledger.counts.sessionsLinked;

  lines.push(
    `Coverage: ${ledger.coverage} | Evidence: ${evidenceStr} | Root: ${rootStr} | Delegation: ${renderDelegationSegment(
      ledger,
      coverageClaim,
    )} | Cutoff: ${ledger.cutoff}`,
  );
  if (coverageClaim) {
    const sessionPart =
      ledger.session === null ? "" : `session ${ledger.session} | `;
    lines.push(
      `Scope: ${sessionPart}${coverageClaim.scope.from} to ${coverageClaim.scope.to}`,
    );
  }
  lines.push("");

  lines.push("## What the numbers say");

  if (coverageClaim) {
    const val = coverageClaim.values;
    const sessions = countOf(val, "sessions");
    const skippedLines = countOf(val, "skippedLines");
    const skippedClause = `${plural(skippedLines, "line")} ${verb(
      skippedLines,
      "was",
      "were",
    )} skipped`;
    if (ledger.evidenceMode === "tracker-only") {
      // No session file is read on this path, so no read count can be claimed.
      const trackerAgents =
        agentsCreated === 0
          ? "no agents were created."
          : `none of the ${plural(
              agentsCreated,
              "created agent",
            )} has a session file that was read.`;
      lines.push(
        `[${coverageClaim.id}] Tracker-only observation: no session files were read; ${trackerAgents}`,
      );
    } else {
      const agentsClause = renderAgentsClause(
        agentsRead,
        agentsCreated,
        unlinkedAgents,
      );
      lines.push(
        `[${coverageClaim.id}] Coverage: ${plural(
          sessions,
          "session",
        )} read in full (${skippedClause}); ${agentsClause}`,
      );
    }
  }

  const errorStopClaim = ledger.claims.find(
    (c) => c.template === "error-stop-exposure",
  );
  const skippedLinesTotal = coverageClaim
    ? countOf(coverageClaim.values, "skippedLines")
    : 0;
  const errorStopUndercount = errorStopClaim
    ? renderUndercount(errorStopClaim.values.completeness, skippedLinesTotal)
    : "";
  if (errorStopClaim) {
    const val = errorStopClaim.values;
    const errorStops = countOf(val, "errorStops");
    const turns = countOf(val, "turns");
    const cellCount = countOf(val, "cellCount");
    const topCell = stringOf(val, "topCell");
    const busiestCell = stringOf(val, "busiestCell");

    let text = `[${errorStopClaim.id}] Error-stop exposure: ${plural(
      errorStops,
      "error stop",
    )} across ${plural(turns, "assistant turn")} (${plural(
      cellCount,
      "day-model cell",
    )}).`;
    if (topCell !== null) {
      text += ` Highest rate: ${topCell} (${countOf(
        val,
        "topCellErrorStops",
      )} of ${plural(countOf(val, "topCellTurns"), "turn")}).`;
    }
    if (busiestCell !== null) {
      text += ` Most stops: ${busiestCell} (${countOf(
        val,
        "busiestCellErrorStops",
      )} of ${plural(countOf(val, "busiestCellTurns"), "turn")}).`;
    }
    if (topCell === null && errorStops > 0) {
      text += ` Cells with fewer than ${MIN_RANKED_TURNS} turns are not ranked by rate.`;
    }
    lines.push(text + errorStopUndercount);
  }

  const toolErrorClaim = ledger.claims.find(
    (c) => c.template === "tool-errors",
  );
  if (toolErrorClaim) {
    const val = toolErrorClaim.values;
    const failedToolCalls = countOf(val, "failedToolCalls");
    const toolCalls = countOf(val, "toolCalls");
    const topErrorTools = stringOf(val, "topErrorTools");
    let text = `[${toolErrorClaim.id}] Tool calls: ${failedToolCalls} of ${plural(
      toolCalls,
      "tool call",
    )} returned an error`;
    if (topErrorTools !== null) {
      const rendered = renderTopErrorTools(topErrorTools);
      if (rendered !== "") {
        text += ` (most: ${rendered})`;
      }
    }
    lines.push(
      `${text}.${renderUndercount(val.completeness, skippedLinesTotal)}`,
    );
  }

  lines.push("");

  const skillSection = renderSkillSection(ledger, options);
  if (skillSection.length > 0) {
    lines.push(...skillSection);
    lines.push("");
  }

  lines.push("## Leads");
  const leads: string[] = [];
  // Zero stops is a number for the observation line above, not a reason to look
  // further: a lead only earns its place when the evidence shows something.
  const errorStopLeadStops = errorStopClaim
    ? countOf(errorStopClaim.values, "errorStops")
    : 0;
  if (errorStopClaim && errorStopLeadStops > 0) {
    const val = errorStopClaim.values;
    const turns = countOf(val, "turns");
    const busiestCell = stringOf(val, "busiestCell");
    const topCell = stringOf(val, "topCell");
    const evId =
      busiestCell !== null
        ? `agg:cell:${busiestCell}:errorStops`
        : topCell !== null
          ? `agg:cell:${topCell}:errorStops`
          : "agg:tree:errorStops";

    leads.push(
      `- [${errorStopClaim.id}] Error-stop concentration: ${plural(
        errorStopLeadStops,
        "stop",
      )} in ${plural(turns, "turn")}. Evidence: ${evId}. Check: open the ledger entries named here and the cells list in ledger.json; this does not say why the stops happened.${errorStopUndercount}`,
    );
  }
  const timingClaim = ledger.claims.find(
    (c) => c.template === "skill-trigger-timing",
  );
  const hostClaim = ledger.claims.find(
    (c) => c.template === "host-skill-reads",
  );
  if (hostClaim) {
    const measuredSessions = countOf(hostClaim.values, "measuredSessions");
    const sessionsWithAnySkillAccess = countOf(
      hostClaim.values,
      "sessionsWithAnySkillAccess",
    );
    const sessionsWithoutAnySkillAccess =
      measuredSessions - sessionsWithAnySkillAccess;
    if (sessionsWithoutAnySkillAccess > 0) {
      leads.push(
        `- [${hostClaim.id}] ${sessionsWithoutAnySkillAccess} of ${plural(
          measuredSessions,
          "session",
        )} never accessed a skill by either route. Check: open ledger entries agg:hostSkills:sessionsWithAnySkillAccess and agg:skills:measuredSessions; a session without a skill access is not proof a skill was needed.`,
      );
    }
  } else {
    const sessionsWithoutSkillLoad = timingClaim
      ? countOf(timingClaim.values, "sessionsWithoutSkillLoad")
      : 0;
    if (timingClaim && sessionsWithoutSkillLoad > 0) {
      leads.push(
        `- [${timingClaim.id}] ${sessionsWithoutSkillLoad} of ${plural(
          countOf(timingClaim.values, "measuredSessions"),
          "session",
        )} never called a skill-loading tool. Check: open ledger entries agg:skills:measuredSessions and agg:skills:sessionsWithSkillLoad; a session without a skill call is not proof a skill was needed.`,
      );
    }
  }
  if (leads.length === 0) {
    leads.push("- No leads identified from available evidence.");
  }
  lines.push(...leads.slice(0, MAX_LEADS));

  lines.push("");

  lines.push("## What this cannot tell you");
  lines.push("- Counts show where to look, not why.");
  lines.push("- Partial reads can undercount.");
  lines.push("- The root session is not verified against the host.");
  if (skillSection.length > 0) {
    lines.push(
      "- Loaded is not the same as followed: the report counts skill lookups, not whether the agent applied them.",
    );
    if (hostClaim) {
      lines.push(
        "- Host skill reads are counted for OMP sessions only; other hosts are not measured.",
      );
    } else {
      lines.push(
        "- Skills read through the host's own skill mechanism (not this server) are not counted.",
      );
    }
  }

  return lines;
}

function fitsBudget(text: string): boolean {
  return (
    text.split("\n").length <= MAX_SUMMARY_LINES &&
    Buffer.byteLength(text, "utf8") <= MAX_SUMMARY_BYTES
  );
}

export function renderSummary(ledger: Ledger): string {
  const hasSkillSection = ledger.claims.some(
    (claim) =>
      claim.template === "skill-usage" ||
      claim.template === "skill-trigger-timing" ||
      claim.template === "host-skill-reads",
  );
  if (!hasSkillSection) {
    return renderLines(ledger, {
      topSkills: 0,
      topHostSkills: 0,
      timing: false,
    }).join("\n");
  }

  // Deterministic degradation: drop server top-skill entries first, then host
  // top-skill entries, then the timing line. Line 1, line 2, the coverage,
  // error and tool lines, the leads and the limits block always stay.
  const candidates: SkillSectionOptions[] = [];
  for (let topSkills = MAX_TOP_SKILLS; topSkills >= 0; topSkills -= 1) {
    candidates.push({
      topSkills,
      topHostSkills: MAX_TOP_SKILLS,
      timing: true,
    });
  }
  for (
    let topHostSkills = MAX_TOP_SKILLS - 1;
    topHostSkills >= 0;
    topHostSkills -= 1
  ) {
    candidates.push({ topSkills: 0, topHostSkills, timing: true });
  }
  for (
    let topHostSkills = MAX_TOP_SKILLS;
    topHostSkills >= 0;
    topHostSkills -= 1
  ) {
    candidates.push({ topSkills: 0, topHostSkills, timing: false });
  }

  let last = "";
  for (const candidate of candidates) {
    const text = renderLines(ledger, candidate).join("\n");
    last = text;
    if (fitsBudget(text)) return text;
  }
  return last;
}
