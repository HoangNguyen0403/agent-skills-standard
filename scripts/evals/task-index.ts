#!/usr/bin/env node
/**
 * CLI Entry point for the executable task-evaluation pilot.
 *
 * Usage:
 *   tsx scripts/evals/task-index.ts --manifest <json> --worker <json> --output <new-directory> [--repeat N] [--split calibration|holdout]
 *
 * Examples:
 *   tsx scripts/evals/task-index.ts --manifest benchmarks/tasks/pilot.json --worker config/worker.json --output evals/runs/pilot-run-1
 *   tsx scripts/evals/task-index.ts --manifest benchmarks/tasks/pilot.json --worker config/worker.json --output evals/runs/calibration-run --split calibration --repeat 3
 */

import { parseArgs } from "node:util";
import * as path from "node:path";
import { runTaskSuite } from "./task-runner";
import type { TaskSplit } from "./task-types";

function printUsage(): void {
  console.log(`
Executable Task-Evaluation Pilot (Model-Aware Instruction Modernization)

Usage:
  tsx scripts/evals/task-index.ts --manifest <path> --worker <path> --output <path> [options]

Required Options:
  --manifest <path>            Path to task manifest JSON file
  --worker <path>              Path to worker configuration JSON file
  --output <path>              Path to a new, non-existent output directory

Optional Options:
  --repeat <number>            Number of repetitions per task and arm (default: 1, range: 1..100)
  --split <split>              Filter tasks by split: 'calibration' or 'holdout'
  --keep-workspaces            Retain temporary fixture workspaces for inspection (default: cleaned up)
  -h, --help                   Display this help message

Security Notice:
  Local execution does NOT provide an OS-level sandbox. Worker and verifier commands
  run with host user privileges. Execute only trusted worker configurations and
  verified non-production fixtures.
`);
}

async function main(): Promise<void> {
  let values: Record<string, string | boolean | undefined>;
  try {
    const parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        manifest: { type: "string" },
        worker: { type: "string" },
        output: { type: "string" },
        repeat: { type: "string" },
        split: { type: "string" },
        "keep-workspaces": { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
      allowPositionals: false,
    });
    values = parsed.values;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`CLI argument error: ${msg}\n`);
    printUsage();
    process.exit(1);
  }

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  if (!values.manifest || typeof values.manifest !== "string") {
    console.error("Error: Missing required option '--manifest <path>'.");
    printUsage();
    process.exit(1);
  }

  if (!values.worker || typeof values.worker !== "string") {
    console.error("Error: Missing required option '--worker <path>'.");
    printUsage();
    process.exit(1);
  }

  if (!values.output || typeof values.output !== "string") {
    console.error("Error: Missing required option '--output <path>'.");
    printUsage();
    process.exit(1);
  }

  let repeat = 1;
  if (values.repeat !== undefined) {
    const repeatStr = String(values.repeat).trim();
    if (!/^\d+$/.test(repeatStr)) {
      console.error(
        `Error: Invalid --repeat value '${values.repeat}'. Must be an integer between 1 and 100.`,
      );
      process.exit(1);
    }
    const parsedRepeat = Number.parseInt(repeatStr, 10);
    if (parsedRepeat < 1 || parsedRepeat > 100) {
      console.error(
        `Error: Invalid --repeat value '${values.repeat}'. Must be an integer between 1 and 100.`,
      );
      process.exit(1);
    }
    repeat = parsedRepeat;
  }

  let split: TaskSplit | undefined;
  if (values.split) {
    const rawSplit = String(values.split);
    if (rawSplit !== "calibration" && rawSplit !== "holdout") {
      console.error(
        `Error: Invalid --split value '${rawSplit}'. Must be 'calibration' or 'holdout'.`,
      );
      process.exit(1);
    }
    split = rawSplit as TaskSplit;
  }

  console.log("================================================================");
  console.log("  Executable Task-Evaluation Pilot");
  console.log("================================================================");
  console.log(`Manifest:        ${path.resolve(values.manifest)}`);
  console.log(`Worker Config:   ${path.resolve(values.worker)}`);
  console.log(`Output:          ${path.resolve(values.output)}`);
  console.log(`Repetitions:     ${repeat}`);
  console.log(`Split Filter:    ${split ?? "all (calibration + holdout)"}`);
  console.log(`Keep Workspaces: ${Boolean(values["keep-workspaces"])}`);
  console.log("----------------------------------------------------------------");
  console.log("SECURITY NOTICE: Local execution is not an OS-level sandbox.");
  console.log("Commands run with user privileges on isolated temporary fixtures.");
  console.log("Verifier completion receipts record reported checks; they do not protect against hostile same-UID code.");
  console.log("----------------------------------------------------------------\n");

  try {
    const summary = await runTaskSuite({
      manifestPath: values.manifest,
      workerConfigPath: values.worker,
      outputDir: values.output,
      repeat,
      split,
      keepWorkspaces: Boolean(values["keep-workspaces"]),
    });

    console.log("\n================================================================");
    console.log("  Execution Summary");
    console.log("================================================================");
    console.log(`Total Runs:        ${summary.totalRuns}`);
    console.log(`Evaluated Product Runs: ${summary.evaluatedRuns}`);
    console.log(`Successful:        ${summary.successfulRuns}`);
    console.log(`Product Failures:  ${summary.failedRuns}`);
    console.log(`Timed Out:         ${summary.timedOutRuns}`);
    console.log(`Infrastructure Errors: ${summary.infrastructureErrorRuns}`);
    console.log(
      `Overall Pass Rate: ${summary.overallPassRate === null ? "N/A (no evaluated runs)" : `${summary.overallPassRate}%`}\n`,
    );

    console.log("--- Performance by Guidance Arm ---");
    for (const [arm, stats] of Object.entries(summary.byArm)) {
      const passRate =
        stats.passRate === null ? "N/A" : `${stats.passRate}%`;
      const avgWallMs = stats.avgWallMs === null ? "N/A" : `${stats.avgWallMs}ms`;
      console.log(
        `  ${arm.padEnd(10)}: Runs ${stats.total} | Evaluated ${stats.evaluated} | Pass ${stats.successful}/${stats.evaluated} (${passRate}) | Product Failures ${stats.failed} | Infra Errors ${stats.infrastructureErrors} | Timed Out ${stats.timedOut} | Avg Wall ${avgWallMs}`,
      );
    }

    console.log("\n--- Performance by Task ---");
    for (const [taskId, stats] of Object.entries(summary.byTask)) {
      const passRate =
        stats.passRate === null ? "N/A" : `${stats.passRate}%`;
      console.log(
        `  ${taskId.padEnd(22)}: Runs ${stats.total} | Evaluated ${stats.evaluated} | Pass ${stats.successful}/${stats.evaluated} (${passRate}) | Product Failures ${stats.failed} | Infra Errors ${stats.infrastructureErrors} | Timed Out ${stats.timedOut}`,
      );
    }

    console.log(`\nDetailed results and raw evidence written to: ${path.resolve(values.output)}`);
    console.log("================================================================\n");

    const hasFailures = summary.failedRuns > 0 || summary.timedOutRuns > 0 || summary.infrastructureErrorRuns > 0;
    process.exit(hasFailures ? 1 : 0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nEvaluation failed with error: ${msg}`);
    process.exit(1);
  }
}

main();
