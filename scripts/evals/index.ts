#!/usr/bin/env node
/**
 * Live eval-run CLI. See docs/EVALS.md for the full protocol.
 *
 * Subcommands:
 *   manifest --category <cat>   Build a blinded eval manifest + prompt files for a category.
 *   manifest --all              Build one manifest spanning every category.
 *   manifest --resume <runId>   Resume an existing run explicitly.
 *   score --run <runId>         Score committed answer transcripts for a run, write results.json.
 *   report                      Aggregate all runs into evals-report.md (+ history + archive).
 *   verify [--run <runId>|--all] Re-score committed transcripts and diff against committed results.json.
 */
import fs from "fs-extra";
import * as path from "path";
import { RUNS_DIR, ROOT_DIR } from "./constants";
import { buildManifest, listCategories, resumeManifest } from "./manifest";
import { generateReport } from "./reporter";
import { scoreRun } from "./scorer";
import { verifyAllRuns, verifyRun } from "./verify";

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
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
      if (resume) {
        const resumed = resumeManifest(resume);
        console.log(
          `✅ Manifest resumed: ${path.relative(ROOT_DIR, resumed.runDir)}`,
        );
        console.log(
          `   ${resumed.manifest.skills.length} skills, ${resumed.manifest.skills.reduce((sum, skill) => sum + skill.cases.length, 0)} cases`,
        );
        break;
      }
      if (!category && !all) {
        console.error(
          `❌ --category or --all is required. Available categories:\n${listCategories()
            .map((c) => `  - ${c}`)
            .join("\n")}`,
        );
        process.exit(1);
      }
      const { manifest, runDir } = buildManifest(
        all ? "all" : (category as string),
        version,
      );
      const relDir = path.relative(ROOT_DIR, runDir);
      console.log(`✅ Manifest built: ${relDir}`);
      console.log(
        `   ${manifest.skills.length} skills, ${manifest.skills.reduce((s, sk) => s + sk.cases.length, 0)} cases`,
      );
      console.log(
        `\nNext: follow .agents/workflows/evals-run.md to answer prompts under ${relDir}/prompts/`,
      );
      console.log(`then run: pnpm evals:score -- --run ${manifest.runId}`);
      break;
    }

    case "score": {
      const runId = arg("run");
      if (!runId) {
        console.error("❌ --run <runId> is required.");
        process.exit(1);
      }
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

    case "report": {
      generateReport();
      console.log("✅ evals-report.md generated.");
      break;
    }

    case "verify": {
      const all = hasFlag("all");
      const runId = arg("run");
      if (!all && !runId) {
        console.error("❌ Pass --run <runId> or --all.");
        process.exit(1);
      }
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
        "Usage: tsx scripts/evals/index.ts <manifest|score|report|verify> [options]",
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Eval run failed:", err);
  process.exit(1);
});
