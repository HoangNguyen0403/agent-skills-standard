import fs from "fs-extra";
import * as path from "node:path";
import { ROOT_DIR } from "./constants";
import {
  answerPath,
  buildManifest,
  loadManifest,
  listCategories,
} from "./manifest";
import { loadRunInputs, readCurrentSource, sourceKey } from "./snapshot";
import type { ManifestSkill, ManifestV2, RunInputSource } from "./types";

const CURRENT_INSTRUCTION_VERSION = "governing-skill-v3" as const;

export type EvidenceAction = "reuse" | "generate" | "regrade";

export interface SkillImpact {
  key: string;
  category: string;
  skillName: string;
  reason: string;
  outcome: EvidenceAction;
  activation: EvidenceAction;
  /** Prompt-only answers are reusable only when the outcome prompt text is identical. */
  reuseBaselineOutcome: boolean;
}

export interface BaselinePlan {
  schemaVersion: 1;
  baselineRunId: string;
  category: string;
  createdAt: string;
  impacts: SkillImpact[];
  reusedLanes: number;
  generatedLanes: number;
  regradedLanes: number;
}

interface BaselineRun {
  runDir: string;
  manifest: ManifestV2;
  sources: Record<string, RunInputSource>;
}

function frontmatter(markdown: string): string {
  return markdown.match(/^---\s*\n([\s\S]*?)\n---\s*/)?.[0] ?? "";
}

function description(markdown: string): string {
  return (
    frontmatter(markdown)
      .match(/^description:\s*(.+)$/m)?.[1]
      ?.trim() ?? ""
  );
}

function body(markdown: string): string {
  return markdown.slice(frontmatter(markdown).length);
}

function json(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function evalParts(evals: Record<string, unknown>) {
  const cases = Array.isArray(evals.evals) ? evals.evals : [];
  const pressure = Array.isArray(evals.pressure_scenarios)
    ? evals.pressure_scenarios
    : [];
  return {
    outcomePrompts: json([
      cases.map((item) => {
        const value = item as Record<string, unknown>;
        return [value.id, value.prompt];
      }),
      pressure.map((item) => (item as Record<string, unknown>).prompt),
    ]),
    assertions: json([
      cases.map((item) => (item as Record<string, unknown>).assertions),
      pressure.map(
        (item) => (item as Record<string, unknown>).behavior_assertions,
      ),
    ]),
    triggers: json([evals.should_trigger, evals.should_not_trigger]),
  };
}

function currentSkills(repoRoot: string, category: string): ManifestSkill[] {
  const categories = category === "all" ? listCategories(repoRoot) : [category];
  return categories.flatMap((currentCategory) => {
    const categoryDir = path.join(repoRoot, "skills", currentCategory);
    if (!fs.existsSync(categoryDir))
      throw new Error(`Unknown category: ${currentCategory}`);
    return fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter(
        (entry) =>
          fs.existsSync(path.join(categoryDir, entry.name, "SKILL.md")) &&
          fs.existsSync(
            path.join(categoryDir, entry.name, "evals", "evals.json"),
          ),
      )
      .map((entry) => ({
        category: currentCategory,
        skillName: entry.name,
        skillPath: `skills/${currentCategory}/${entry.name}/SKILL.md`,
        guardrailApplicable: false,
        cases: [],
      }));
  });
}

function completeBaselineRuns(repoRoot: string): BaselineRun[] {
  if (!fs.existsSync(path.join(repoRoot, "benchmarks", "evals", "runs")))
    return [];
  return fs
    .readdirSync(path.join(repoRoot, "benchmarks", "evals", "runs"), {
      withFileTypes: true,
    })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const runDir = path.join(
        repoRoot,
        "benchmarks",
        "evals",
        "runs",
        entry.name,
      );
      if (!fs.existsSync(path.join(runDir, "results.json"))) return [];
      const inputs = loadRunInputs(runDir);
      if (!inputs) return [];
      const manifest = loadManifest(runDir);
      if (manifest.schemaVersion !== 2) return [];
      return [
        { runDir, manifest: manifest as ManifestV2, sources: inputs.sources },
      ];
    })
    .sort((a, b) => b.runDir.localeCompare(a.runDir));
}

function incompleteRuns(repoRoot: string): BaselineRun[] {
  const runsDir = path.join(repoRoot, "benchmarks", "evals", "runs");
  if (!fs.existsSync(runsDir)) return [];
  return fs
    .readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const runDir = path.join(runsDir, entry.name);
      if (fs.existsSync(path.join(runDir, "results.json"))) return [];
      const manifestPath = path.join(runDir, "manifest.json");
      if (!fs.existsSync(manifestPath)) return [];
      const manifest = loadManifest(runDir);
      if (manifest.schemaVersion !== 2) return [];
      return [{ runDir, manifest: manifest as ManifestV2, sources: {} }];
    })
    .sort((a, b) => b.runDir.localeCompare(a.runDir));
}

function chooseBaseline(
  repoRoot: string,
  category: string,
  requested?: string,
): BaselineRun {
  const runs = completeBaselineRuns(repoRoot);
  const promotedRunId = (() => {
    if (category === "all" || requested) return undefined;
    const registryPath = path.join(
      repoRoot,
      "benchmarks",
      "evals",
      "baselines.json",
    );
    if (!fs.existsSync(registryPath)) return undefined;
    return (
      fs.readJSONSync(registryPath) as {
        categories?: Record<string, { runId?: string }>;
      }
    ).categories?.[category]?.runId;
  })();
  const selected = requested
    ? runs.find((run) => run.manifest.runId === requested)
    : promotedRunId
      ? runs.find((run) => run.manifest.runId === promotedRunId)
      : runs.sort(
          (a, b) =>
            Object.keys(b.sources).length - Object.keys(a.sources).length ||
            b.runDir.localeCompare(a.runDir),
        )[0];
  if (!selected)
    throw new Error(
      "No complete v2 baseline found; run one full catalog eval first.",
    );
  return selected;
}

function compatibleEvidenceRun(
  repoRoot: string,
  skill: ManifestSkill,
): BaselineRun | undefined {
  const current = readCurrentSource(repoRoot, skill);
  const currentParts = evalParts(current.evals);
  return completeBaselineRuns(repoRoot).find((run) => {
    if (
      run.manifest.protocol.instructionVersion !== CURRENT_INSTRUCTION_VERSION
    )
      return false;
    const source = run.sources[sourceKey(skill.category, skill.skillName)];
    if (!source || source.hashes.skill !== current.hashes.skill) return false;
    const sourceParts = evalParts(source.evals);
    return (
      sourceParts.outcomePrompts === currentParts.outcomePrompts &&
      sourceParts.triggers === currentParts.triggers
    );
  });
}

function compatibleActivationEvidenceRun(
  repoRoot: string,
  skill: ManifestSkill,
): BaselineRun | undefined {
  const current = readCurrentSource(repoRoot, skill);
  const currentParts = evalParts(current.evals);
  return completeBaselineRuns(repoRoot).find((run) => {
    if (
      run.manifest.protocol.instructionVersion !== CURRENT_INSTRUCTION_VERSION
    )
      return false;
    if (run.manifest.activationEvidenceVersion !== 3) return false;
    const source = run.sources[sourceKey(skill.category, skill.skillName)];
    if (
      !source ||
      description(source.skillMarkdown) !== description(current.skillMarkdown)
    )
      return false;
    return evalParts(source.evals).triggers === currentParts.triggers;
  });
}

export function planBaseline(
  category = "all",
  options: { repoRoot?: string; baselineRunId?: string; now?: Date } = {},
): BaselinePlan {
  const repoRoot = options.repoRoot ?? ROOT_DIR;
  const baseline = chooseBaseline(repoRoot, category, options.baselineRunId);
  const impacts: SkillImpact[] = [];
  const baselineKeys = new Set(Object.keys(baseline.sources));
  const scopedSkills = currentSkills(repoRoot, category).filter(
    (skill) =>
      !options.baselineRunId ||
      baselineKeys.has(sourceKey(skill.category, skill.skillName)),
  );
  const protocolChanged =
    baseline.manifest.protocol.instructionVersion !==
    CURRENT_INSTRUCTION_VERSION;
  for (const skill of scopedSkills) {
    const key = sourceKey(skill.category, skill.skillName);
    const previous = baseline.sources[key];
    if (!previous) {
      impacts.push({
        key,
        category: skill.category,
        skillName: skill.skillName,
        reason: "new skill",
        outcome: "generate",
        activation: "generate",
        reuseBaselineOutcome: false,
      });
      continue;
    }
    const current = readCurrentSource(repoRoot, skill);
    const previousParts = evalParts(previous.evals);
    const currentParts = evalParts(current.evals);
    const skillBodyChanged =
      body(previous.skillMarkdown) !== body(current.skillMarkdown);
    const descriptionChanged =
      description(previous.skillMarkdown) !==
      description(current.skillMarkdown);
    const promptsChanged =
      previousParts.outcomePrompts !== currentParts.outcomePrompts;
    const assertionsChanged =
      previousParts.assertions !== currentParts.assertions;
    const triggersChanged = previousParts.triggers !== currentParts.triggers;
    if (
      !protocolChanged &&
      !skillBodyChanged &&
      !descriptionChanged &&
      !promptsChanged &&
      !assertionsChanged &&
      !triggersChanged
    )
      continue;
    const outcome: EvidenceAction =
      protocolChanged || promptsChanged
        ? "generate"
        : skillBodyChanged || descriptionChanged
          ? "generate"
          : assertionsChanged
            ? "regrade"
            : "reuse";
    const activation: EvidenceAction =
      protocolChanged || descriptionChanged || triggersChanged
        ? "generate"
        : "reuse";
    const reason = [
      protocolChanged ? "generation protocol" : "",
      skillBodyChanged ? "skill body" : "",
      descriptionChanged ? "description" : "",
      promptsChanged ? "outcome prompts" : "",
      assertionsChanged ? "assertions" : "",
      triggersChanged ? "activation corpus" : "",
    ]
      .filter(Boolean)
      .join(", ");
    const compatible = compatibleEvidenceRun(repoRoot, skill);
    const activationCompatible = compatibleActivationEvidenceRun(
      repoRoot,
      skill,
    );
    impacts.push({
      key,
      category: skill.category,
      skillName: skill.skillName,
      reason,
      outcome:
        assertionsChanged &&
        compatible &&
        !protocolChanged &&
        !skillBodyChanged &&
        !descriptionChanged &&
        !promptsChanged
          ? "regrade"
          : compatible && !protocolChanged && !promptsChanged
            ? "reuse"
            : outcome,
      activation: activationCompatible ? "reuse" : "generate",
      reuseBaselineOutcome: !protocolChanged && !promptsChanged,
    });
  }
  const counts = impacts.reduce(
    (total, impact) => {
      for (const action of [impact.outcome, impact.activation])
        total[action] += 1;
      return total;
    },
    { reuse: 0, generate: 0, regrade: 0 },
  );
  return {
    schemaVersion: 1,
    baselineRunId: baseline.manifest.runId,
    category,
    createdAt: (options.now ?? new Date()).toISOString(),
    impacts,
    reusedLanes: counts.reuse,
    generatedLanes: counts.generate,
    regradedLanes: counts.regrade,
  };
}

function copyIfPresent(source: string, target: string): boolean {
  if (!fs.existsSync(source)) return false;
  fs.ensureDirSync(path.dirname(target));
  fs.copyFileSync(source, target);
  return true;
}

/** Builds a small run and materializes only evidence proved compatible with its source baseline. */
export function createBaselineRun(
  category = "all",
  version = "0.0.0",
  options: { repoRoot?: string; baselineRunId?: string; now?: Date } = {},
): {
  plan: BaselinePlan;
  runId?: string;
  runDir?: string;
  reusedAnswers: number;
  resumed?: boolean;
} {
  const repoRoot = options.repoRoot ?? ROOT_DIR;
  const plan = planBaseline(category, options);
  if (plan.impacts.length === 0) return { plan, reusedAnswers: 0 };
  const baseline = chooseBaseline(repoRoot, category, plan.baselineRunId);
  const expectedKeys = plan.impacts.map((impact) => impact.key).sort();
  const resumable = incompleteRuns(repoRoot).find((candidate) => {
    if (
      candidate.manifest.category !== category ||
      candidate.manifest.baselineRunId !== plan.baselineRunId ||
      candidate.manifest.scope?.kind !== "selective"
    ) {
      return false;
    }
    const keys = Object.keys(candidate.manifest.sourceHashes).sort();
    if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) return false;
    return candidate.manifest.skills.every((skill) => {
      const expected =
        candidate.manifest.sourceHashes[
          sourceKey(skill.category, skill.skillName)
        ];
      const current = readCurrentSource(repoRoot, skill);
      return (
        expected?.skill === current.hashes.skill &&
        expected.evals === current.hashes.evals
      );
    });
  });
  if (resumable) {
    return {
      plan,
      runId: resumable.manifest.runId,
      runDir: resumable.runDir,
      reusedAnswers: 0,
      resumed: true,
    };
  }
  const { manifest, runDir } = buildManifest(category, version, {
    repoRoot,
    now: options.now,
    selectedSkills: new Set(plan.impacts.map((impact) => impact.key)),
    baselineRunId: plan.baselineRunId,
  });
  const byKey = new Map(plan.impacts.map((impact) => [impact.key, impact]));
  let reusedAnswers = 0;
  for (const skill of manifest.skills) {
    const impact = byKey.get(sourceKey(skill.category, skill.skillName));
    const outcomeEvidenceRun =
      compatibleEvidenceRun(repoRoot, skill) ?? baseline;
    const activationEvidenceRun =
      compatibleActivationEvidenceRun(repoRoot, skill) ?? baseline;
    if (!impact) continue;
    for (const currentCase of skill.cases) {
      if (currentCase.kind === "trigger" && impact.activation === "generate")
        continue;
      const evidenceRun =
        currentCase.kind === "trigger"
          ? activationEvidenceRun
          : outcomeEvidenceRun;
      const caseSourceSkill = evidenceRun.manifest.skills.find(
        (candidate) =>
          candidate.category === skill.category &&
          candidate.skillName === skill.skillName,
      );
      if (!caseSourceSkill) continue;
      for (const arm of currentCase.kind === "trigger"
        ? [undefined]
        : (["baseline", "with-skill"] as const)) {
        if (currentCase.kind !== "trigger") {
          if (arm === "baseline" && !impact.reuseBaselineOutcome) continue;
          if (arm === "with-skill" && impact.outcome === "generate") continue;
        }
        const source = answerPath(
          evidenceRun.runDir,
          evidenceRun.manifest,
          caseSourceSkill,
          currentCase.id,
          arm,
        );
        const target = answerPath(runDir, manifest, skill, currentCase.id, arm);
        if (copyIfPresent(source, target)) reusedAnswers += 1;
      }
    }
  }
  const regradeOnly =
    plan.impacts.length > 0 &&
    plan.impacts.every(
      (impact) => impact.outcome === "regrade" && impact.activation === "reuse",
    );
  manifest.metadata = {
    ...manifest.metadata,
    evidenceMode: regradeOnly ? "regraded" : "incremental",
    freshAnswerCount: manifest.metadata.freshAnswerCount ?? 0,
    reusedAnswerCount: reusedAnswers,
  };
  fs.writeJSONSync(path.join(runDir, "manifest.json"), manifest, {
    spaces: 2,
  });
  fs.writeJSONSync(path.join(runDir, "baseline-plan.json"), plan, {
    spaces: 2,
  });
  return { plan, runId: manifest.runId, runDir, reusedAnswers };
}
