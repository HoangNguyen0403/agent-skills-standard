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

function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  if (index + 1 >= process.argv.length) {
    throw new Error(`${name} requires a value`);
  }
  return process.argv[index + 1];
}

/** Recursively lists every `.json` file under `dir`; returns `[]` when `dir` does not exist. */
async function listRunRecordFiles(dir: string): Promise<string[]> {
  if (!(await fs.pathExists(dir))) return [];
  const files: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
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
  return files;
}

export async function validateRunRecords(runsDir: string): Promise<{ issues: ValidationIssue[]; checked: number }> {
  const files = await listRunRecordFiles(runsDir);
  const issues: ValidationIssue[] = [];
  for (const file of files) {
    const relPath = path.relative(ROOT, file);
    let parsed: unknown;
    try {
      parsed = JSON.parse(await fs.readFile(file, "utf8"));
    } catch (error) {
      issues.push({ severity: "error", file: relPath, message: `failed to parse JSON: ${(error as Error).message}` });
      continue;
    }
    issues.push(...validateRunRecord(parsed, relPath));
  }
  return { issues, checked: files.length };
}

function printIssues(issues: ValidationIssue[]): void {
  for (const issue of issues) {
    if (issue.severity === "error") {
      console.log(pc.red(`  ✗ [${issue.file}] ${issue.message}`));
    } else {
      console.log(pc.yellow(`  ! [${issue.file}] ${issue.message}`));
    }
  }
}

export async function main(): Promise<void> {
  const wantTemplates = process.argv.includes("--templates");
  const wantRecords = process.argv.includes("--records");
  const wantJson = process.argv.includes("--json");
  const dirFlag = flagValue("--dir");
  const runsDir = dirFlag ? (path.isAbsolute(dirFlag) ? dirFlag : path.join(ROOT, dirFlag)) : DEFAULT_RUNS_DIR;
  const runBoth = !wantTemplates && !wantRecords;

  const allIssues: ValidationIssue[] = [];
  let recordsChecked = 0;

  if (runBoth || wantTemplates) {
    if (!wantJson) console.log(pc.blue("🔍 Validating Outcome Report templates...\n"));
    const templateIssues = await validateOutcomeReportTemplates(CORE_SDLC_CHAIN);
    allIssues.push(...templateIssues);
    if (!wantJson) {
      if (templateIssues.length === 0) {
        console.log(pc.green(`  ✓ all ${CORE_SDLC_CHAIN.length} Outcome Report templates declare the schema`));
      } else {
        printIssues(templateIssues);
      }
      console.log();
    }
  }

  if (runBoth || wantRecords) {
    if (!wantJson) console.log(pc.blue("🔍 Validating run records...\n"));
    const { issues: recordIssues, checked } = await validateRunRecords(runsDir);
    recordsChecked = checked;
    allIssues.push(...recordIssues);
    if (!wantJson) {
      if (checked === 0) {
        console.log(pc.green(`  ✓ no run records found under ${path.relative(ROOT, runsDir)}`));
      } else if (recordIssues.length === 0) {
        console.log(pc.green(`  ✓ all ${checked} run records valid`));
      } else {
        printIssues(recordIssues);
      }
      console.log();
    }
  }

  const hasErrors = allIssues.some((issue) => issue.severity === "error");

  if (wantJson) {
    console.log(
      JSON.stringify(
        {
          ok: !hasErrors,
          issues: allIssues,
          recordsChecked,
        },
        null,
        2,
      ),
    );
  } else if (hasErrors) {
    console.log(pc.red("❌ Outcome audit failed."));
  } else {
    console.log(pc.green("✅ Outcome audit passed."));
  }

  if (hasErrors) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
