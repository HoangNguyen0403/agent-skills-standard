import type { Claim, Ledger } from "../ledger";

const MAX_SUMMARY_LINES = 40;
const MAX_SUMMARY_BYTES = 4096;
const MAX_TOP_SKILLS = 5;
const MAX_LEADS = 5;
/** Registry ids are printed verbatim, so anything else is dropped rather than echoed. */
const SAFE_SKILL_ID_REGEX = /^[A-Za-z0-9._:/@+-]{1,96}$/;

type SkillSectionOptions = {
  /** How many top-skill entries to print. */
  topSkills: number;
  /** How many top host-read skill entries to print. */
  topHostSkills: number;
  /** Whether the skill-timing line is printed. */
  timing: boolean;
};

function countOf(values: Claim["values"], key: string): number {
  const value = values[key];
  return typeof value === "number" ? value : 0;
}

function renderTimingLine(claim: Claim): string {
  const values = claim.values;
  const text = `[${claim.id}] Skill timing: ${countOf(values, "sessionsWithSkillLoad")} of ${countOf(values, "measuredSessions")} sessions called a skill-loading tool`;
  if (typeof values.mainCallsBeforeFirstSkillLoad === "number") {
    return `${text}; the main session made ${values.mainCallsBeforeFirstSkillLoad} other tool calls before its first one.`;
  }
  if (countOf(values, "mainSkillLoadCalls") === 0) {
    return `${text}; the main session called none.`;
  }
  return `${text}.`;
}

function renderHostLine(claim: Claim): string {
  const values = claim.values;
  const text = `[${claim.id}] Host skill reads: ${countOf(values, "readCalls")} reads of ${countOf(values, "uniqueSkills")} skills (ids derived from the read path, not checked against the registry); ${countOf(values, "sessionsWithAnySkillAccess")} of ${countOf(values, "measuredSessions")} sessions accessed a skill by either route`;
  if (typeof values.mainCallsBeforeFirstSkillAccess === "number") {
    return `${text}; the main session made ${values.mainCallsBeforeFirstSkillAccess} other tool calls before its first skill access.`;
  }
  return `${text}.`;
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
    lines.push(
      `[${skillClaim.id}] Skill lookups: ${countOf(values, "loadCalls")} calls returned ${countOf(values, "bodyReturns")} skill bodies (${countOf(values, "skillsTotal")} unique, ${countOf(values, "dedupedReturns")} reused from context); ${countOf(values, "noMatchCalls")} lookups matched nothing; ${countOf(values, "selectedNotLoaded")} selected skills were not returned; ${countOf(values, "workflows")} workflows, ${countOf(values, "guides")} guides. Window: ${window}.`,
    );

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

  lines.push(
    `Coverage: ${ledger.coverage} | Evidence: ${evidenceStr} | Root: ${rootStr} | Cutoff: ${ledger.cutoff}`,
  );
  lines.push("");

  lines.push("## What the numbers say");

  const coverageClaim = ledger.claims.find((c) => c.template === "coverage");
  if (coverageClaim) {
    const val = coverageClaim.values;
    const agentsCreated =
      typeof val.agentsCreated === "number" ? val.agentsCreated : 0;
    const sessionsLinked =
      typeof val.sessionsLinked === "number" ? val.sessionsLinked : 0;
    const unlinkedAgents =
      typeof val.unlinkedAgents === "number" ? val.unlinkedAgents : 0;
    const sessions = typeof val.sessions === "number" ? val.sessions : 0;
    const fullyRead = typeof val.fullyRead === "number" ? val.fullyRead : 0;
    const skippedLines =
      typeof val.skippedLines === "number" ? val.skippedLines : 0;

    const delegationStr =
      agentsCreated > sessionsLinked
        ? `${sessionsLinked} sessions linked (${unlinkedAgents} unlinked agents of ${agentsCreated} created)`
        : `${sessionsLinked} sessions linked (${agentsCreated} created)`;

    if (ledger.evidenceMode === "tracker-only") {
      lines.push(
        `[${coverageClaim.id}] Tracker-only observation: no session files were read; delegation: ${delegationStr}.`,
      );
    } else {
      lines.push(
        `[${coverageClaim.id}] Coverage: ${sessions} sessions (${fullyRead} fully read, ${skippedLines} skipped lines); delegation: ${delegationStr}.`,
      );
    }
  }

  const errorStopClaim = ledger.claims.find(
    (c) => c.template === "error-stop-exposure",
  );
  const completenessFlag =
    errorStopClaim?.values.completeness === "may-undercount-by-skipped-lines";
  const skippedLinesTotal =
    coverageClaim && typeof coverageClaim.values.skippedLines === "number"
      ? coverageClaim.values.skippedLines
      : 0;
  const undercountPhrase = completenessFlag
    ? ` (may undercount: ${skippedLinesTotal} lines were skipped)`
    : "";
  if (errorStopClaim) {
    const val = errorStopClaim.values;
    const errorStops = typeof val.errorStops === "number" ? val.errorStops : 0;
    const turns = typeof val.turns === "number" ? val.turns : 0;
    const cellCount = typeof val.cellCount === "number" ? val.cellCount : 0;

    let text = `[${errorStopClaim.id}] Error-stop exposure: ${errorStops} error stops across ${turns} assistant turns (${cellCount} day-model cells).`;
    if (typeof val.topCell === "string") {
      text += ` Highest rate in cell ${val.topCell} with ${val.topCellErrorStops} error stops in ${val.topCellTurns} turns.`;
    }
    lines.push(text + undercountPhrase);
  }

  lines.push("");

  const skillSection = renderSkillSection(ledger, options);
  if (skillSection.length > 0) {
    lines.push(...skillSection);
    lines.push("");
  }

  lines.push("## Leads");
  const leads: string[] = [];
  if (errorStopClaim) {
    const val = errorStopClaim.values;
    const errorStops = typeof val.errorStops === "number" ? val.errorStops : 0;
    const turns = typeof val.turns === "number" ? val.turns : 0;
    const evId =
      typeof val.topCell === "string"
        ? `agg:cell:${val.topCell}:errorStops`
        : "agg:tree:errorStops";

    leads.push(
      `- [${errorStopClaim.id}] Error-stop concentration: ${errorStops} stops in ${turns} turns. Check: open the ledger entry ${evId} and compare per-model counts; this does not say why the stops happened.${undercountPhrase}`,
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
        `- [${hostClaim.id}] ${sessionsWithoutAnySkillAccess} of ${measuredSessions} sessions never accessed a skill by either route. Check: open ledger entries agg:hostSkills:sessionsWithAnySkillAccess and agg:skills:measuredSessions; a session without a skill access is not proof a skill was needed.`,
      );
    }
  } else {
    const sessionsWithoutSkillLoad = timingClaim
      ? countOf(timingClaim.values, "sessionsWithoutSkillLoad")
      : 0;
    if (timingClaim && sessionsWithoutSkillLoad > 0) {
      leads.push(
        `- [${timingClaim.id}] ${sessionsWithoutSkillLoad} of ${countOf(timingClaim.values, "measuredSessions")} sessions never called a skill-loading tool. Check: open ledger entries agg:skills:measuredSessions and agg:skills:sessionsWithSkillLoad; a session without a skill call is not proof a skill was needed.`,
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
  lines.push("- Token cost is shown only as recorded units elsewhere.");
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
  // top-skill entries, then the timing line. Line 1, the coverage/error lines
  // and the limits block always stay.
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
