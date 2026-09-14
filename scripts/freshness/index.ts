// scripts/freshness/index.ts
import fs from "fs-extra";
import path from "path";
import { ROOT_DIR } from "../evals/constants";
import { auditFreshness } from "./audit";
import { buildReport, renderMarkdown } from "./report";
import type { FreshnessReport } from "./types";

/** Output directory for freshness reports (gitignored). */
export const FRESHNESS_DIR = path.join(ROOT_DIR, "benchmarks", "freshness");
/** JSON report path. */
export const FRESHNESS_JSON = path.join(FRESHNESS_DIR, "freshness-report.json");
/** Markdown report path. */
export const FRESHNESS_MD = path.join(FRESHNESS_DIR, "freshness-report.md");

const DEFAULT_STALE_DAYS = 120;

function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function writeReport(report: FreshnessReport): void {
  fs.ensureDirSync(FRESHNESS_DIR);
  fs.writeJSONSync(FRESHNESS_JSON, report, { spaces: 2 });
  fs.writeFileSync(FRESHNESS_MD, renderMarkdown(report));
}

/**
 * CLI entry. Actions:
 * - `audit` (default): offline rules; prints a summary; `--write` saves the
 *   report; `--strict` exits 1 on any claim-* or missing-pin issue.
 * - `report`: re-renders Markdown from the last JSON report.
 * Flags: `--stale-days <n>` (default 120).
 */
export function main(): void {
  const action = process.argv[2] ?? "audit";
  const staleDays = Number(flagValue("--stale-days") ?? DEFAULT_STALE_DAYS);
  if (!Number.isFinite(staleDays) || staleDays <= 0) {
    throw new Error("--stale-days must be a positive number");
  }

  if (action === "audit") {
    const issues = auditFreshness(ROOT_DIR, { staleDays });
    const report = buildReport("audit", staleDays, issues, []);
    const strict = process.argv.includes("--strict");
    if (process.argv.includes("--write")) writeReport(report);
    const s = report.summary.bySeverity;
    console.log(
      `Freshness audit: ${issues.length} issues (high ${s.high}, med ${s.med}, low ${s.low}, warn ${s.warn})` +
        (process.argv.includes("--write") ? ` → ${FRESHNESS_JSON}` : ""),
    );
    for (const issue of report.issues) {
      const loc = issue.file ? ` [${issue.file}${issue.line ? `:${issue.line}` : ""}]` : "";
      console.log(`  ${issue.severity.padEnd(4)} ${issue.type.padEnd(20)} ${issue.category}/${issue.skillName || "-"}${loc}: ${issue.message}`);
    }
    const blocking = issues.filter((i) => i.type.startsWith("claim-") || i.type === "missing-pin");
    if (strict && blocking.length > 0) {
      console.error(`Strict mode: ${blocking.length} blocking issue(s)`);
      process.exitCode = 1;
    }
    return;
  }

  if (action === "report") {
    if (!fs.existsSync(FRESHNESS_JSON)) {
      throw new Error(`No report at ${FRESHNESS_JSON}; run "freshness:audit --write" first`);
    }
    const report = fs.readJSONSync(FRESHNESS_JSON) as FreshnessReport;
    fs.writeFileSync(FRESHNESS_MD, renderMarkdown(report));
    console.log(`Freshness report rendered → ${FRESHNESS_MD}`);
    return;
  }

  throw new Error(`Unknown action: ${action}; use audit or report`);
}

try {
  if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
    main();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
