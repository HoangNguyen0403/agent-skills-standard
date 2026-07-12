import { randomBytes } from "node:crypto";
import fs from "fs-extra";
import * as path from "path";
import { isGuardrailApplicable } from "../benchmark/utils";
import {
  KNOWN_COMPROMISED_BASELINES,
  MANIFEST_FILENAME,
  ROOT_DIR,
  RUNS_DIR,
} from "./constants";
import { readCurrentSource, sourceKey } from "./snapshot";
import {
  Assertion,
  CompromisedSkillRecord,
  EvalCaseRef,
  Manifest,
  ManifestSkill,
  ManifestV2,
  RunScopeKind,
} from "./types";

interface SkillEvalCase {
  id: number | string;
  prompt: string;
  assertions?: Assertion[];
}

interface PressureScenario {
  prompt?: string;
}

interface EvalsJson {
  evals?: SkillEvalCase[];
  should_trigger?: string[];
  should_not_trigger?: string[];
  pressure_scenarios?: PressureScenario[];
}

export interface ManifestBuildOptions {
  repoRoot?: string;
  now?: Date;
  runId?: string;
}

function repoPath(repoRoot: string, ...parts: string[]): string {
  return path.join(repoRoot, ...parts);
}

function runDirectory(repoRoot: string): string {
  return repoRoot === ROOT_DIR
    ? RUNS_DIR
    : repoPath(repoRoot, "benchmarks", "evals", "runs");
}

function timestampPart(now: Date): string {
  return now.toISOString().replace(/[:.]/g, "-");
}

function createRunId(
  scope: string,
  version: string,
  runsDir: string,
  now: Date,
): string {
  const timestamp = timestampPart(now);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const nonce = randomBytes(4).toString("hex");
    const runId = `${scope}-v${version}-${timestamp}-${nonce}`;
    if (!fs.existsSync(path.join(runsDir, runId))) return runId;
  }
  throw new Error(`Unable to allocate a unique run id for ${scope}`);
}

function frontmatterDescription(skillMarkdown: string): string {
  const frontmatter = skillMarkdown.match(/^---\s*\n([\s\S]*?)\n---\s*$/m)?.[1];
  const rawDescription = frontmatter
    ?.match(/^description:\s*(.+)$/m)?.[1]
    .trim();
  if (!rawDescription) return "";
  if (
    (rawDescription.startsWith("'") && rawDescription.endsWith("'")) ||
    (rawDescription.startsWith('"') && rawDescription.endsWith('"'))
  ) {
    return rawDescription.slice(1, -1);
  }
  return rawDescription;
}

function triggerPromptBody(
  skillName: string,
  description: string,
  prompt: string,
): string {
  return [
    `# Trigger check for \`${skillName}\``,
    "",
    `Skill description: ${description}`,
    "",
    "Based ONLY on the skill name and one-line description above — do not open the full skill body — decide whether this skill should activate for the task below.",
    "",
    `> ${prompt}`,
    "",
    "Answer with exactly one line in the form `TRIGGER: yes` or `TRIGGER: no`, followed by a one-sentence justification on the next line.",
  ].join("\n");
}

function evalPromptBody(prompt: string): string {
  return prompt;
}

function pressurePromptBody(prompt: string): string {
  return prompt;
}

function makeCase(
  id: string,
  kind: EvalCaseRef["kind"],
  arms: EvalCaseRef["arms"],
  expectedTrigger?: "yes" | "no",
): EvalCaseRef {
  return { id, kind, arms, ...(expectedTrigger ? { expectedTrigger } : {}) };
}

function isKnownCompromised(category: string, skillName: string): boolean {
  return KNOWN_COMPROMISED_BASELINES.some(
    (record) => record.category === category && record.skillName === skillName,
  );
}

function buildSkill(
  repoRoot: string,
  runDir: string,
  scope: RunScopeKind,
  category: string,
  skillName: string,
  sourceHashes: ManifestV2["sourceHashes"],
  compromisedSkills: CompromisedSkillRecord[],
): ManifestSkill | null {
  const skillMdPath = repoPath(
    repoRoot,
    "skills",
    category,
    skillName,
    "SKILL.md",
  );
  const evalsPath = repoPath(
    repoRoot,
    "skills",
    category,
    skillName,
    "evals",
    "evals.json",
  );
  if (!fs.existsSync(skillMdPath) || !fs.existsSync(evalsPath)) return null;

  const skillMarkdown = fs.readFileSync(skillMdPath, "utf8");
  const evalsData = fs.readJSONSync(evalsPath) as EvalsJson;
  const description = frontmatterDescription(skillMarkdown);
  if (!description) {
    throw new Error(
      `Skill is missing a frontmatter description: ${skillMdPath}`,
    );
  }
  const key = sourceKey(category, skillName);
  sourceHashes[key] = readCurrentSource(repoRoot, {
    category,
    skillName,
    skillPath: `skills/${category}/${skillName}/SKILL.md`,
    guardrailApplicable: false,
    cases: [],
  }).hashes;

  const guardrailApplicable = isGuardrailApplicable(
    category,
    skillName,
    skillMarkdown,
  );
  const promptsDir = path.join(
    runDir,
    "prompts",
    ...(scope === "all" ? [category] : []),
    skillName,
  );
  const answersDir = path.join(
    runDir,
    "answers",
    ...(scope === "all" ? [category] : []),
    skillName,
  );
  fs.ensureDirSync(promptsDir);
  fs.ensureDirSync(answersDir);

  const cases: EvalCaseRef[] = [];
  for (const evaluation of evalsData.evals ?? []) {
    const id = `eval-${evaluation.id}`;
    fs.writeFileSync(
      path.join(promptsDir, `${id}.md`),
      evalPromptBody(evaluation.prompt),
    );
    cases.push(
      makeCase(id, "eval", { baseline: "pending", "with-skill": "pending" }),
    );
  }

  let triggerIndex = 0;
  for (const [field, expected] of [
    ["should_trigger", "yes"],
    ["should_not_trigger", "no"],
  ] as const) {
    (evalsData[field] ?? []).forEach((prompt) => {
      const id = `trigger-${++triggerIndex}`;
      fs.writeFileSync(
        path.join(promptsDir, `${id}.md`),
        triggerPromptBody(skillName, description, prompt),
      );
      cases.push(
        makeCase(id, "trigger", { "with-skill": "pending" }, expected),
      );
    });
  }

  if (guardrailApplicable) {
    (evalsData.pressure_scenarios ?? []).forEach((scenario, index) => {
      if (!scenario.prompt) return;
      const id = `pressure-${index + 1}`;
      fs.writeFileSync(
        path.join(promptsDir, `${id}.md`),
        pressurePromptBody(scenario.prompt),
      );
      cases.push(
        makeCase(id, "pressure", {
          baseline: "pending",
          "with-skill": "pending",
        }),
      );
    });
  }
  if (cases.length === 0) return null;

  if (isKnownCompromised(category, skillName)) {
    compromisedSkills.push({
      category,
      skillName,
      arm: "baseline",
      reason: "baseline-compromised",
    });
  }

  return {
    category,
    skillName,
    skillPath: `skills/${category}/${skillName}/SKILL.md`,
    guardrailApplicable,
    cases,
  };
}

export function buildManifest(
  category: string,
  version: string,
  options: ManifestBuildOptions = {},
): { manifest: ManifestV2; runDir: string } {
  const repoRoot = options.repoRoot ?? ROOT_DIR;
  const runsDir = runDirectory(repoRoot);
  const categories = listCategories(repoRoot);
  const scope: RunScopeKind = category === "all" ? "all" : "category";
  if (scope === "category" && !categories.includes(category)) {
    throw new Error(`Unknown category: ${category}`);
  }

  const now = options.now ?? new Date();
  const runId = options.runId ?? createRunId(category, version, runsDir, now);
  const runDir = path.join(runsDir, runId);
  if (fs.existsSync(runDir)) {
    throw new Error(`Run already exists: ${runId}; use --resume ${runId}`);
  }
  fs.ensureDirSync(runDir);

  const sourceHashes: ManifestV2["sourceHashes"] = {};
  const compromisedSkills: CompromisedSkillRecord[] = [];
  const skills: ManifestSkill[] = [];
  for (const currentCategory of scope === "all" ? categories : [category]) {
    const categoryDir = repoPath(repoRoot, "skills", currentCategory);
    const skillDirs = fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const skillName of skillDirs) {
      const skill = buildSkill(
        repoRoot,
        runDir,
        scope,
        currentCategory,
        skillName,
        sourceHashes,
        compromisedSkills,
      );
      if (skill) skills.push(skill);
    }
  }

  const manifest: ManifestV2 = {
    schemaVersion: 2,
    runId,
    category,
    version,
    createdAt: now.toISOString(),
    metadata: { startedAt: now.toISOString() },
    scope: {
      kind: scope,
      categories: scope === "all" ? categories : [category],
    },
    protocol: {
      isolation: "worker-per-arm",
      baseline: "prompt-only",
      withSkill: "prompt-plus-skill",
      trigger: "name-description-only",
    },
    sourceHashes,
    compromisedSkills,
    skills,
  };
  fs.writeJSONSync(path.join(runDir, MANIFEST_FILENAME), manifest, {
    spaces: 2,
  });
  return { manifest, runDir };
}

export function resumeManifest(
  runId: string,
  options: { repoRoot?: string } = {},
): { manifest: Manifest; runDir: string } {
  const repoRoot = options.repoRoot ?? ROOT_DIR;
  const runDir = path.join(runDirectory(repoRoot), runId);
  if (!fs.existsSync(runDir)) throw new Error(`Run not found: ${runId}`);
  return { manifest: loadManifest(runDir), runDir };
}

export function answerPath(
  runDir: string,
  manifest: Manifest,
  skill: ManifestSkill,
  caseId: string,
  arm?: "baseline" | "with-skill",
): string {
  const categoryParts = manifest.category === "all" ? [skill.category] : [];
  const filename = arm ? `${caseId}.${arm}.md` : `${caseId}.md`;
  return path.join(
    runDir,
    "answers",
    ...categoryParts,
    skill.skillName,
    filename,
  );
}

export function loadManifest(runDir: string): Manifest {
  const manifest = fs.readJSONSync(
    path.join(runDir, MANIFEST_FILENAME),
  ) as Manifest;
  if (manifest.schemaVersion === undefined) manifest.schemaVersion = 1;
  return manifest;
}

export function saveManifest(runDir: string, manifest: Manifest): void {
  fs.writeJSONSync(path.join(runDir, MANIFEST_FILENAME), manifest, {
    spaces: 2,
  });
}

export function listCategories(repoRoot = ROOT_DIR): string[] {
  const metadataPath = repoPath(repoRoot, "skills", "metadata.json");
  const metadata = fs.readJSONSync(metadataPath) as {
    categories?: Record<string, unknown>;
  };
  return Object.keys(metadata.categories ?? {})
    .filter((category) => category !== "specialists")
    .filter((category) => fs.existsSync(repoPath(repoRoot, "skills", category)))
    .sort();
}
