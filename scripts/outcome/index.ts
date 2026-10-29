// scripts/outcome/index.ts
import fs from "fs-extra";
import path from "path";
import pc from "picocolors";
import { validateRunRecord } from "./schema";
import type { ValidationIssue } from "./schema";
import { validateOutcomeReportTemplates } from "./template";
import { CORE_SDLC_CHAIN } from "../workflow-chain";

const ROOT = path.join(__dirname, "..", "..");
const DEFAULT_RUNS_DIR = path.join(ROOT, "artifacts", "runs");
const USAGE_EXIT_CODE = 2;

/**
 * Assurance reported by a successful record audit. Schema and scope validity
 * only: it never claims approval, current revision, or human authorization.
 */
export const RUN_RECORD_ASSURANCE = "record-schema-and-scope-valid" as const;
export type RunRecordAssurance = typeof RUN_RECORD_ASSURANCE;

/** The exact run identity a caller requires to exist, matched by record content. */
export interface RequiredRunScope {
  slug: string;
  workflow: string;
  run_id: string;
}

export interface RunRecordAudit {
  issues: ValidationIssue[];
  /** Every `.json` file inspected, valid or not. */
  checked: number;
  /** Schema-valid records whose content matches `requiredScope`; always 0 without a scope. */
  matched: number;
}

class UsageError extends Error {}

/** Reads a flag value, rejecting absent, empty, and flag-shaped values. */
function readFlag(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (value === undefined || value.trim() === "" || value.startsWith("-")) {
    throw new UsageError(`${name} requires a non-empty, non-flag value`);
  }
  return value;
}

interface OutcomeArgs {
  templates: boolean;
  records: boolean;
  json: boolean;
  dir?: string;
  scope?: RequiredRunScope;
}

/**
 * Parses CLI arguments. Required scope (contract B) is exactly
 * `--records --required --slug S --workflow W --run-id R`; selectors outside
 * that mode, a partial scope, and `--templates` combined with it are usage errors.
 */
function parseArgs(argv: string[]): OutcomeArgs {
  const templates = argv.includes("--templates");
  const records = argv.includes("--records");
  const json = argv.includes("--json");
  const required = argv.includes("--required");
  const dir = readFlag(argv, "--dir");
  const slug = readFlag(argv, "--slug");
  const workflow = readFlag(argv, "--workflow");
  const runId = readFlag(argv, "--run-id");
  const selectorCount = [slug, workflow, runId].filter((value) => value !== undefined).length;

  if (required) {
    if (templates) throw new UsageError("--templates cannot be combined with required record scope");
    if (!records) throw new UsageError("required record scope needs --records");
    if (slug === undefined || workflow === undefined || runId === undefined) {
      throw new UsageError("required record scope needs --slug, --workflow and --run-id");
    }
    return { templates, records, json, dir, scope: { slug, workflow, run_id: runId } };
  }

  if (selectorCount > 0) {
    throw new UsageError("--slug, --workflow and --run-id require --required");
  }
  return { templates, records, json, dir };
}

/** Recursively lists every `.json` file under `dir`; returns `[]` when `dir` does not exist. */
async function listRunRecordFiles(dir: string): Promise<string[]> {
  if (!(await fs.pathExists(dir))) return [];
  const files: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(entryPath);
      }
    }
  }
  return files.sort();
}

/** Identity match by record content; directory names and file names are never consulted. */
function matchesScope(parsed: unknown, scope: RequiredRunScope): boolean {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return false;
  const record = parsed as Record<string, unknown>;
  return record.slug === scope.slug && record.workflow === scope.workflow && record.run_id === scope.run_id;
}

function scopeLabel(scope: RequiredRunScope): string {
  return `slug=${scope.slug} workflow=${scope.workflow} run_id=${scope.run_id}`;
}

/**
 * Validates every run record under `runsDir`. Malformed JSON is always a
 * validation failure, even when the record's scope cannot be determined.
 *
 * With `requiredScope`, exactly one schema-valid record must match that
 * identity by content: no match, multiple matches, or a single matching
 * record that fails the schema all produce error issues.
 */
export async function validateRunRecords(runsDir: string, requiredScope?: RequiredRunScope): Promise<RunRecordAudit> {
  const files = await listRunRecordFiles(runsDir);
  const issues: ValidationIssue[] = [];
  const identityMatches: string[] = [];
  let matched = 0;

  for (const file of files) {
    const relPath = path.relative(ROOT, file);
    let parsed: unknown;
    try {
      parsed = JSON.parse(await fs.readFile(file, "utf8"));
    } catch (error) {
      issues.push({ severity: "error", file: relPath, message: `failed to parse JSON: ${(error as Error).message}` });
      continue;
    }
    const recordIssues = validateRunRecord(parsed, relPath);
    issues.push(...recordIssues);
    if (!requiredScope || !matchesScope(parsed, requiredScope)) continue;
    identityMatches.push(relPath);
    if (recordIssues.length === 0) matched += 1;
  }

  if (requiredScope) {
    const scopeDir = path.relative(ROOT, runsDir);
    if (identityMatches.length === 0) {
      issues.push({
        severity: "error",
        file: scopeDir,
        message: `no run record matches required scope ${scopeLabel(requiredScope)}`,
      });
    } else if (identityMatches.length > 1) {
      issues.push({
        severity: "error",
        file: scopeDir,
        message: `duplicate run record identity for ${scopeLabel(requiredScope)}: ${identityMatches.join(", ")}`,
      });
    } else if (matched === 0) {
      issues.push({
        severity: "error",
        file: identityMatches[0],
        message: `run record matches required scope ${scopeLabel(requiredScope)} but is not schema-valid`,
      });
    }
  }

  return { issues, checked: files.length, matched };
}

function formatIssues(issues: ValidationIssue[]): string[] {
  return issues.map((issue) =>
    issue.severity === "error"
      ? pc.red(`  ✗ [${issue.file}] ${issue.message}`)
      : pc.yellow(`  ! [${issue.file}] ${issue.message}`),
  );
}

/**
 * Runs the outcome audit. Returns the rendered report and exit code:
 * 0 valid, 1 validation failure, 2 usage error.
 */
export async function run(argv: string[] = process.argv.slice(2)): Promise<{ exitCode: number; output: string }> {
  let args: OutcomeArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    if (argv.includes("--json")) {
      const payload = {
        ok: false,
        usageError: true,
        issues: [{ severity: "error", file: "<cli>", message: error.message }],
        recordsChecked: 0,
        recordsMatched: 0,
      };
      return { exitCode: USAGE_EXIT_CODE, output: `${JSON.stringify(payload, null, 2)}\n` };
    }
    return { exitCode: USAGE_EXIT_CODE, output: pc.red(`❌ Outcome audit usage error: ${error.message}`) };
  }

  const runsDir = args.dir ? (path.isAbsolute(args.dir) ? args.dir : path.join(ROOT, args.dir)) : DEFAULT_RUNS_DIR;
  const runBoth = !args.templates && !args.records;
  const lines: string[] = [];
  const allIssues: ValidationIssue[] = [];
  let recordsChecked = 0;
  let recordsMatched = 0;
  let recordsValidated = false;

  if (runBoth || args.templates) {
    if (!args.json) lines.push(pc.blue("🔍 Validating Outcome Report templates...\n"));
    const templateIssues = await validateOutcomeReportTemplates(CORE_SDLC_CHAIN);
    allIssues.push(...templateIssues);
    if (!args.json) {
      if (templateIssues.length === 0) {
        lines.push(pc.green(`  ✓ all ${CORE_SDLC_CHAIN.length} Outcome Report templates declare the schema`));
      } else {
        lines.push(...formatIssues(templateIssues));
      }
      lines.push("");
    }
  }

  if (runBoth || args.records) {
    recordsValidated = true;
    if (!args.json) lines.push(pc.blue("🔍 Validating run records...\n"));
    const { issues: recordIssues, checked, matched } = await validateRunRecords(runsDir, args.scope);
    recordsChecked = checked;
    recordsMatched = matched;
    allIssues.push(...recordIssues);
    if (!args.json) {
      if (args.scope) {
        if (recordIssues.length === 0) {
          lines.push(pc.green(`  ✓ exactly one run record matches ${scopeLabel(args.scope)}`));
        } else {
          lines.push(...formatIssues(recordIssues));
        }
      } else if (checked === 0) {
        lines.push(pc.green(`  ✓ no run records found under ${path.relative(ROOT, runsDir)}`));
      } else if (recordIssues.length === 0) {
        lines.push(pc.green(`  ✓ all ${checked} run records valid`));
      } else {
        lines.push(...formatIssues(recordIssues));
      }
      lines.push("");
    }
  }

  const hasErrors = allIssues.some((issue) => issue.severity === "error");
  const ok = !hasErrors;

  if (args.json) {
    const payload: Record<string, unknown> = {
      ok,
      issues: allIssues,
      recordsChecked,
      recordsMatched,
    };
    if (recordsValidated) payload.assurance = RUN_RECORD_ASSURANCE;
    return { exitCode: ok ? 0 : 1, output: `${JSON.stringify(payload, null, 2)}\n` };
  }

  lines.push(hasErrors ? pc.red("❌ Outcome audit failed.") : pc.green("✅ Outcome audit passed."));
  return { exitCode: ok ? 0 : 1, output: lines.join("\n") };
}

/** CLI wrapper: prints the rendered report and sets the process exit code. */
export async function main(): Promise<void> {
  const { exitCode, output } = await run();
  console.log(output);
  process.exitCode = exitCode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
