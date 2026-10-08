#!/usr/bin/env node
import { parseArgs } from "node:util";
import { collectSessionJournal } from "./services/SessionJournal";

export async function runSessionJournalCli(
  args: string[] = process.argv.slice(2),
): Promise<string> {
  let values: { manifest?: string; json: boolean };
  try {
    ({ values } = parseArgs({
      args,
      options: {
        manifest: { type: "string" },
        json: { type: "boolean", default: false },
      },
      allowPositionals: false,
      strict: true,
    }));
  } catch {
    throw new Error(
      "Usage: ags-mcp-session-report --manifest <manifest.json> [--json].",
    );
  }
  if (!values.manifest)
    throw new Error("--manifest <explicit-manifest.json> is required.");
  const report = await collectSessionJournal(values.manifest);
  if (values.json) return JSON.stringify(report, null, 2);
  const lines = [
    "# Native Session Usage (explicit manifest)",
    "",
    `Window: ${report.window.startedAt} → ${report.window.completedAt}`,
    `Coverage: ${report.coverage.complete ? "complete within supplied journals" : "incomplete / uncertain"}`,
    `Selected actors: ${report.coverage.selectedSessions}; expected: ${report.coverage.expectedSessions}; missing: ${report.coverage.missingSessions}; with usage: ${report.coverage.sessionsWithUsage}; malformed records: ${report.coverage.malformedLines}; invalid usage records: ${report.coverage.invalidUsageRecords}; aborted actors: ${report.coverage.abortedSessions}; resource limit reached: ${report.coverage.resourceLimitReached}`,
    "",
    "| Role | Usage kind | Phase | Outcome | Model | Purpose | Native role | Native purpose | Transcript messages | Uncached input | Cached input | Cache write | Output | Reasoning | Orchestration input | Orchestration cache read | Orchestration output | Recorded cost |",
    "|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...report.groups.map(
      (group) =>
        `| ${group.role} | ${group.usageKind} | ${group.phase ?? "unknown"} | ${group.attemptOutcome ?? "unknown"} | ${group.model} | ${group.auxiliaryPurpose ?? "—"} | ${group.nativeModelRole ?? "—"} | ${group.nativePurpose ?? "—"} | ${group.messages} | ${group.uncachedInputTokens ?? "unknown"} | ${group.cachedInputTokens ?? "unknown"} | ${group.cacheWriteTokens ?? "unknown"} | ${group.outputTokens} | ${group.reasoningTokens ?? "unknown"} | ${group.orchestrationInputTokens ?? "unknown"} | ${group.orchestrationCacheReadTokens ?? "unknown"} | ${group.orchestrationOutputTokens ?? "unknown"} | ${group.recordedCostEstimate ?? "unknown"} |`,
    ),
    "",
    "## Limits",
    ...report.limitations.map((limitation) => `- ${limitation}`),
  ];
  return lines.join("\n");
}

async function main(): Promise<void> {
  try {
    process.stdout.write(`${await runSessionJournalCli()}\n`);
  } catch (error) {
    const filesystemFailure = error instanceof Error && "code" in error;
    const message = filesystemFailure
      ? "A manifest-selected file could not be read."
      : error instanceof Error
        ? error.message
        : "Session journal collection failed.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
