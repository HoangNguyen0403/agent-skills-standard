import type { Ledger } from "../ledger";

export function renderSummary(ledger: Ledger): string {
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

  lines.push("## Leads");
  if (errorStopClaim) {
    const val = errorStopClaim.values;
    const errorStops = typeof val.errorStops === "number" ? val.errorStops : 0;
    const turns = typeof val.turns === "number" ? val.turns : 0;
    const evId =
      typeof val.topCell === "string"
        ? `agg:cell:${val.topCell}:errorStops`
        : "agg:tree:errorStops";

    lines.push(
      `- [${errorStopClaim.id}] Error-stop concentration: ${errorStops} stops in ${turns} turns. Check: open the ledger entry ${evId} and compare per-model counts; this does not say why the stops happened.${undercountPhrase}`,
    );
  } else {
    lines.push("- No leads identified from available evidence.");
  }

  lines.push("");

  lines.push("## What this cannot tell you");
  lines.push("- Counts show where to look, not why.");
  lines.push("- Token cost is shown only as recorded units elsewhere.");
  lines.push("- Partial reads can undercount.");
  lines.push("- The root session is not verified against the host.");

  return lines.join("\n");
}
