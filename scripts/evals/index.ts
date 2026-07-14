#!/usr/bin/env node
/**
 * Live eval-run CLI. See docs/EVALS.md for the full protocol.
 *
 * Subcommands:
 *   manifest --category <cat>   Build a blinded eval manifest + prompt files for a category.
 *   manifest --all              Build one manifest spanning every category.
 *   manifest --skills-file <f>  Build a selective manifest from category/skill keys.
 *   manifest --resume <runId>   Resume an existing run explicitly.
 *   manifest ... --execute      Execute missing arms, score, and regenerate the report.
 *   score --run <runId>         Score committed answer transcripts for a run, write results.json.
 *   report                      Aggregate all runs into evals-report.md (+ history + archive).
 *   verify [--run <runId>|--all] Re-score committed transcripts and diff against committed results.json.
 */
import fs from "fs-extra";
import * as path from "path";
import { RUNS_DIR, ROOT_DIR } from "./constants";
import {
  buildManifest,
  listCategories,
  loadManifest,
  resolveRunId,
  resumeManifest,
} from "./manifest";
import { generateReport, generateRunReport } from "./reporter";
import { scoreRun } from "./scorer";
import { verifyAllRuns, verifyRun } from "./verify";
import { createBaselineRun, planBaseline } from "./impact";
import { promoteCategoryBaseline } from "./promote";
import { composeRuns } from "./compose";
import { pruneV2Runs } from "./prune";
import { finalManifestShapeErrors } from "./readiness";
import { auditAssertionAlignment } from "./quality";
import {
  EvalQuotaPausedError,
  evalWorkerConfig,
  executeMissingAnswers,
  missingAnswerCount,
} from "./execute";

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function selectedSkillsFromFile(filePath: string): ReadonlySet<string> {
  const entries = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      if (line.includes("/")) return line;
      const [skillName, category] = line
        .split("|", 2)
        .map((part) => part.trim());
      if (!skillName || !category) {
        throw new Error(
          `Invalid selected skill '${line}'. Use category/skill or skill|category.`,
        );
      }
      return `${category}/${skillName}`;
    });
  if (entries.length === 0)
    throw new Error(`Selected skills file is empty: ${filePath}`);
  return new Set(entries);
}

async function executeRun(runDir: string, runId: string): Promise<void> {
  const initialManifest = loadManifest(runDir);
  const selectedSkills = new Set(
    initialManifest.skills.map(
      (skill) => `${skill.category}/${skill.skillName}`,
    ),
  );
  const preflightIssues = auditAssertionAlignment(ROOT_DIR, selectedSkills);
  if (preflightIssues.length > 0) {
    throw new Error(
      `Paid eval blocked by assertion preflight (${preflightIssues.length} issues). Run pnpm evals:preflight and repair the task contracts before using --execute.`,
    );
  }
  if (
    initialManifest.scope?.kind === "selective" &&
    initialManifest.skills.length === 136
  ) {
    const shapeErrors = finalManifestShapeErrors(initialManifest);
    if (shapeErrors.length > 0)
      throw new Error(
        `Final remediation manifest rejected:\n- ${shapeErrors.join("\n- ")}`,
      );
  }
  const workerConfig = evalWorkerConfig();
  const configuredConcurrency = Number(process.env.EVALS_CONCURRENCY ?? 1);
  const concurrency = Math.max(1, Math.min(4, configuredConcurrency || 1));
  const plannedWorkers = missingAnswerCount(runDir);
  console.log(
    `   Worker configuration: ${workerConfig.model}; reasoning ${workerConfig.reasoningEffort}; concurrency ${concurrency}.`,
  );
  console.log(`   Fresh isolated answers to generate: ${plannedWorkers}.`);
  const generated = await executeMissingAnswers(runDir, {
    repoRoot: ROOT_DIR,
    concurrency,
    workerConfig,
  });
  scoreRun(runDir);
  generateReport();
  console.log(
    `✅ Completed ${generated} fresh isolated answers, scored ${runId}, and regenerated evals-report.md.`,
  );
}

async function main() {
  const subcommand = process.argv[2];
  const pkg = fs.readJSONSync(path.join(ROOT_DIR, "package.json"));
  const version = pkg.version || "0.0.0";

  switch (subcommand) {
    case "manifest": {
      const category = arg("category");
      const all = hasFlag("all");
      const resume = arg("resume");
      const skillsFile = arg("skills-file");
      const requestedRunId = arg("run-id") ?? arg("name");
      if (resume && requestedRunId) {
        console.error("❌ Use either --resume or --run-id/--name, not both.");
        process.exit(1);
      }
      if (!resume && !category && !all && !skillsFile) {
        console.error(
          `❌ --category, --all, or --skills-file is required. Available categories:\n${listCategories()
            .map((c) => `  - ${c}`)
            .join("\n")}`,
        );
        process.exit(1);
      }
      const resumed = resume ? resumeManifest(resume) : undefined;
      const selectedSkills = skillsFile
        ? selectedSkillsFromFile(path.resolve(skillsFile))
        : undefined;
      const { manifest, runDir } =
        resumed ??
        buildManifest(
          all || selectedSkills ? "all" : (category as string),
          version,
          requestedRunId || selectedSkills
            ? {
                ...(selectedSkills ? { selectedSkills } : {}),
                runId: requestedRunId,
              }
            : undefined,
        );
      if (selectedSkills && manifest.skills.length !== selectedSkills.size) {
        const found = new Set(
          manifest.skills.map(
            (skill) => `${skill.category}/${skill.skillName}`,
          ),
        );
        const missing = [...selectedSkills].filter((key) => !found.has(key));
        throw new Error(
          `Selected skills not found or missing evals: ${missing.join(", ")}`,
        );
      }
      const relDir = path.relative(ROOT_DIR, runDir);
      console.log(`✅ Manifest ${resumed ? "resumed" : "built"}: ${relDir}`);
      console.log(`   Physical run ID: ${manifest.runId}`);
      console.log(
        `   Verify this run: pnpm evals:verify -- --run ${manifest.runId}`,
      );
      console.log(
        `   Friendly verification: pnpm evals:verify -- --run latest --version ${version} --category ${manifest.category}`,
      );
      console.log(
        `   ${manifest.skills.length} skills, ${manifest.skills.reduce((s, sk) => s + sk.cases.length, 0)} cases`,
      );
      if (hasFlag("execute")) {
        await executeRun(runDir, manifest.runId);
        break;
      }
      console.log(
        `\nNext: review prompts under ${relDir}/prompts/ and rerun with --resume ${manifest.runId} --execute`,
      );
      console.log(
        `Then run: pnpm evals:manifest -- --resume ${manifest.runId} --execute`,
      );
      break;
    }

    case "baseline": {
      const category = arg("category") ?? "all";
      const baselineRunId = arg("baseline");
      if (hasFlag("plan")) {
        const plan = planBaseline(category, { baselineRunId });
        console.log(JSON.stringify(plan, null, 2));
        break;
      }
      const run = createBaselineRun(category, version, { baselineRunId });
      if (!run.runId || !run.runDir) {
        console.log(
          `✅ Baseline is current (${run.plan.baselineRunId}); no live evals required.`,
        );
        break;
      }
      console.log(
        `✅ Incremental baseline run: ${path.relative(ROOT_DIR, run.runDir)}`,
      );
      console.log(`   Reference: ${run.plan.baselineRunId}`);
      if (run.resumed)
        console.log("   Resuming the existing compatible incomplete run.");
      console.log(
        `   ${run.plan.impacts.length} changed skills; ${run.reusedAnswers} compatible answers reused.`,
      );
      const plannedWorkers = missingAnswerCount(run.runDir);
      console.log(`   Fresh isolated answers to generate: ${plannedWorkers}.`);
      if (!hasFlag("execute")) {
        console.log(
          "   No workers started. This is a quota-consuming operation; rerun with --execute only after reviewing this plan.",
        );
        console.log(
          `   Run: pnpm evals:baseline -- --execute${category === "all" ? "" : ` --category ${category}`}`,
        );
        break;
      }
      await executeRun(run.runDir, run.runId as string);
      break;
    }

    case "score": {
      const requestedRunId = arg("run");
      if (!requestedRunId) {
        console.error("❌ --run <runId> is required.");
        process.exit(1);
      }
      const runId = resolveRunId(requestedRunId, {
        version: arg("version") ?? version,
        category: arg("category") ?? "all",
      });
      const runDir = path.join(RUNS_DIR, runId);
      if (!fs.existsSync(runDir)) {
        console.error(`❌ Run not found: ${runDir}`);
        process.exit(1);
      }
      const results = scoreRun(runDir);
      for (const s of results.skills) {
        const flag = s.incompleteArms.length > 0 ? "⚠️ incomplete" : "✅";
        const baseline =
          typeof s.baselinePassRate === "number"
            ? `${(s.baselinePassRate * 100).toFixed(0)}%`
            : s.baselinePassRate;
        const delta =
          typeof s.delta === "number"
            ? `${(s.delta * 100).toFixed(0)}%`
            : s.delta;
        console.log(
          `${flag} ${s.skillName}: baseline ${baseline} | with-skill ${(s.withSkillPassRate * 100).toFixed(0)}% | delta ${delta}` +
            (s.triggerPrecision !== null
              ? ` | trigger ${(s.triggerPrecision * 100).toFixed(0)}%`
              : ""),
        );
        if (s.incompleteArms.length > 0) {
          console.log(`   missing: ${s.incompleteArms.join(", ")}`);
        }
      }
      console.log(
        `\n✅ Scored: ${path.relative(ROOT_DIR, runDir)}/results.json`,
      );
      break;
    }

    case "promote": {
      const requestedRunId = arg("run");
      const category = arg("category");
      const reviewer = arg("reviewer");
      const reason = arg("reason");
      if (!requestedRunId || !category || !reviewer || !reason) {
        console.error(
          "❌ --run, --category, --reviewer, and --reason are required.",
        );
        process.exit(1);
      }
      const runId = resolveRunId(requestedRunId, {
        version: arg("version") ?? version,
        category,
      });
      const promoted = promoteCategoryBaseline(
        runId,
        category,
        reviewer,
        reason,
      );
      generateReport();
      console.log(
        `✅ Promoted ${promoted.category} baseline: ${promoted.runId} (${promoted.tag})`,
      );
      break;
    }

    case "compose": {
      const baseRunId = arg("base");
      const overlayRunId = arg("overlay");
      const composeVersion = arg("version") ?? version;
      const outputRunId = arg("output") ?? `all-v${composeVersion}`;
      const expectedSkillCountValue = arg("expected-skills");
      const expectedSkillCount = expectedSkillCountValue
        ? Number(expectedSkillCountValue)
        : undefined;
      if (!baseRunId || !overlayRunId) {
        console.error("❌ --base and --overlay are required.");
        process.exit(1);
      }
      if (
        expectedSkillCountValue &&
        (!Number.isInteger(expectedSkillCount) || expectedSkillCount <= 0)
      ) {
        console.error("❌ --expected-skills must be a positive integer.");
        process.exit(1);
      }
      const composed = composeRuns({
        baseRunId,
        overlayRunId,
        version: composeVersion,
        outputRunId,
        expectedSkillCount,
      });
      console.log(
        `✅ Composed ${composed.manifest.skills.length} skills into ${path.relative(ROOT_DIR, composed.runDir)}.`,
      );
      break;
    }

    case "prune": {
      const pruneVersion = arg("version") ?? version;
      const keepRunId = arg("keep");
      if (!keepRunId) {
        console.error("❌ --keep <runId> is required.");
        process.exit(1);
      }
      const plan = pruneV2Runs({
        version: pruneVersion,
        keepRunId,
        apply: hasFlag("apply"),
      });
      console.log(JSON.stringify(plan, null, 2));
      if (!plan.applied)
        console.log(
          "Dry run only. Re-run with --apply after canonical verification.",
        );
      break;
    }

    case "report": {
      const requestedRunId = arg("run");
      if (requestedRunId) {
        const runId = resolveRunId(requestedRunId, {
          version: arg("version") ?? version,
          category: arg("category") ?? "all",
        });
        const reportPath = generateRunReport(runId);
        console.log(`✅ ${reportPath} generated.`);
      } else {
        generateReport();
        console.log("✅ evals-report.md generated.");
      }
      break;
    }

    case "verify": {
      const all = hasFlag("all");
      const requestedRunId = arg("run");
      if (!all && !requestedRunId) {
        console.error("❌ Pass --run <runId> or --all.");
        process.exit(1);
      }
      const runId = requestedRunId
        ? resolveRunId(requestedRunId, {
            version: arg("version") ?? version,
            category: arg("category") ?? "all",
          })
        : undefined;
      if (runId && runId !== requestedRunId)
        console.log(`ℹ️ Resolved ${requestedRunId} → ${runId}`);
      const outcomes = all ? verifyAllRuns() : [verifyRun(runId as string)];
      let failed = false;
      for (const o of outcomes) {
        if (o.ok) {
          console.log(`✅ ${o.runId}: verified`);
        } else {
          failed = true;
          console.log(`❌ ${o.runId}: ${o.reason}`);
          for (const d of o.diffs || []) console.log(`   - ${d}`);
        }
      }
      if (failed) process.exit(1);
      break;
    }

    default:
      console.error(
        "Usage: tsx scripts/evals/index.ts <manifest|baseline|score|report|verify|promote|compose|prune> [options] (manifest/baseline require --execute to start workers)",
      );
      process.exit(1);
  }
}

main().catch((err) => {
  if (err instanceof EvalQuotaPausedError) {
    console.error(`⏸️ Eval execution paused: ${err.message}`);
    process.exit(1);
  }
  console.error("❌ Eval run failed:", err);
  process.exit(1);
});
