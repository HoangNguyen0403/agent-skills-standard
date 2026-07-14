import fs from "fs-extra";
import * as path from "node:path";
import { ROOT_DIR } from "./constants";
import { loadManifest } from "./manifest";
import { loadRunInputs, readCurrentSource, sourceKey } from "./snapshot";
import type { RunResults } from "./types";
import { evaluateSkillReadiness } from "./readiness";

const REGISTRY_FILE = "baselines.json";

export interface PromotedCategoryBaseline {
  category: string;
  runId: string;
  version: string;
  tag: string;
  reviewer: string;
  reason: string;
  promotedAt: string;
}

interface BaselineRegistry {
  schemaVersion: 1;
  categories: Record<string, PromotedCategoryBaseline>;
}

function registryPath(repoRoot: string): string {
  return path.join(repoRoot, "benchmarks", "evals", REGISTRY_FILE);
}

function categoryTag(
  repoRoot: string,
  category: string,
): { version: string; tag: string } {
  const metadata = fs.readJSONSync(
    path.join(repoRoot, "skills", "metadata.json"),
  ) as {
    categories?: Record<string, { version?: string; tag_prefix?: string }>;
  };
  const config = metadata.categories?.[category];
  if (!config?.version || !config.tag_prefix)
    throw new Error(`Missing version/tag_prefix for ${category}`);
  return {
    version: config.version,
    tag: `${config.tag_prefix}${config.version}`,
  };
}

function assertGate(results: RunResults, category: string): void {
  const skills = results.skills.filter((skill) => skill.category === category);
  if (skills.length === 0)
    throw new Error(`Run ${results.runId} has no ${category} results.`);
  const failed: string[] = [];
  for (const skill of skills) {
    const readiness = evaluateSkillReadiness(skill, {
      compromised: results.compromisedSkills?.some(
        (record) =>
          record.category === skill.category &&
          record.skillName === skill.skillName &&
          record.arm === "baseline",
      ),
    });
    for (const failure of readiness.failures)
      failed.push(`${skill.skillName}: ${failure}`);
  }
  if (failed.length)
    throw new Error(`Promotion gate failed:\n- ${failed.join("\n- ")}`);
}

/** Promote only a complete, current category sweep; selective runs remain development evidence. */
export function promoteCategoryBaseline(
  runId: string,
  category: string,
  reviewer: string,
  reason: string,
  options: { repoRoot?: string; now?: Date } = {},
): PromotedCategoryBaseline {
  if (!reviewer.trim() || !reason.trim())
    throw new Error("--reviewer and --reason are required for promotion.");
  const repoRoot = options.repoRoot ?? ROOT_DIR;
  const runDir = path.join(repoRoot, "benchmarks", "evals", "runs", runId);
  if (!fs.existsSync(path.join(runDir, "results.json")))
    throw new Error(`Complete run not found: ${runId}`);
  const manifest = loadManifest(runDir);
  if (manifest.schemaVersion !== 2) {
    throw new Error(`Promotion requires a v2 run: ${runId}`);
  }
  const inputs = loadRunInputs(runDir);
  if (!inputs) throw new Error(`Run ${runId} lacks immutable inputs.json.`);
  const results = fs.readJSONSync(
    path.join(runDir, "results.json"),
  ) as RunResults;
  if (
    results.metadata.evidenceMode !== "fresh" ||
    (results.metadata.reusedAnswerCount ?? 0) !== 0
  ) {
    throw new Error(
      "Promotion requires one fresh run with zero reused answers.",
    );
  }
  const runSkills = manifest.skills.filter(
    (skill) => skill.category === category,
  );
  if (runSkills.length === 0 || manifest.scope?.kind === "selective") {
    throw new Error(
      "Promotion requires a complete category or aggregate category sweep, not a selective run.",
    );
  }
  const currentSkillNames = fs
    .readdirSync(path.join(repoRoot, "skills", category), {
      withFileTypes: true,
    })
    .filter((entry) => entry.isDirectory())
    .filter(
      (entry) =>
        fs.existsSync(
          path.join(repoRoot, "skills", category, entry.name, "SKILL.md"),
        ) &&
        fs.existsSync(
          path.join(
            repoRoot,
            "skills",
            category,
            entry.name,
            "evals",
            "evals.json",
          ),
        ),
    )
    .map((entry) => entry.name)
    .sort();
  const runSkillNames = runSkills.map((skill) => skill.skillName).sort();
  if (JSON.stringify(currentSkillNames) !== JSON.stringify(runSkillNames)) {
    throw new Error(
      `Promotion run does not cover the current ${category} catalog.`,
    );
  }
  for (const skill of runSkills) {
    const source = inputs.sources[sourceKey(skill.category, skill.skillName)];
    const current = readCurrentSource(repoRoot, skill);
    if (
      !source ||
      source.hashes.skill !== current.hashes.skill ||
      source.hashes.evals !== current.hashes.evals
    ) {
      throw new Error(
        `Current source drift for ${sourceKey(skill.category, skill.skillName)}; rerun before promotion.`,
      );
    }
  }
  assertGate(results, category);
  const info = categoryTag(repoRoot, category);
  const entry: PromotedCategoryBaseline = {
    category,
    runId,
    version: info.version,
    tag: info.tag,
    reviewer,
    reason,
    promotedAt: (options.now ?? new Date()).toISOString(),
  };
  const target = registryPath(repoRoot);
  const registry: BaselineRegistry = fs.existsSync(target)
    ? fs.readJSONSync(target)
    : { schemaVersion: 1, categories: {} };
  registry.categories[category] = entry;
  fs.writeJSONSync(target, registry, { spaces: 2 });
  return entry;
}
