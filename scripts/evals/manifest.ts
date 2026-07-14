import { randomBytes } from "node:crypto";
import fs from "fs-extra";
import * as path from "path";
import { isGuardrailApplicable } from "../benchmark/utils";
import {
  MANIFEST_FILENAME,
  RESULTS_FILENAME,
  ROOT_DIR,
  RUNS_DIR,
} from "./constants";
import { readCurrentSource, sourceKey } from "./snapshot";
import {
  Assertion,
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
  /** Restrict a selective manifest to these category/skill keys. */
  selectedSkills?: ReadonlySet<string>;
  baselineRunId?: string;
}

export interface RunReferenceOptions {
  repoRoot?: string;
  version: string;
  category?: string;
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

function validateRunId(runId: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(runId)) {
    throw new Error(
      `Invalid run ID '${runId}'. Use letters, numbers, dots, hyphens, and underscores only.`,
    );
  }
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
  caseId: string,
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
    `Start with exactly \`CASE: ${caseId}\`, then answer with exactly one line in the form \`TRIGGER: yes\` or \`TRIGGER: no\`, followed by a one-sentence justification on the next line.`,
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

function buildSkill(
  repoRoot: string,
  runDir: string,
  isAggregate: boolean,
  category: string,
  skillName: string,
  sourceHashes: ManifestV2["sourceHashes"],
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
    ...(isAggregate ? [category] : []),
    skillName,
  );
  const answersDir = path.join(
    runDir,
    "answers",
    ...(isAggregate ? [category] : []),
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
        triggerPromptBody(skillName, description, id, prompt),
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
  const scope: RunScopeKind = options.selectedSkills
    ? "selective"
    : category === "all"
      ? "all"
      : "category";
  if (scope === "category" && !categories.includes(category)) {
    throw new Error(`Unknown category: ${category}`);
  }

  const now = options.now ?? new Date();
  const runId = options.runId ?? createRunId(category, version, runsDir, now);
  validateRunId(runId);
  const runDir = path.join(runsDir, runId);
  if (fs.existsSync(runDir)) {
    throw new Error(`Run already exists: ${runId}; use --resume ${runId}`);
  }
  fs.ensureDirSync(runDir);

  const sourceHashes: ManifestV2["sourceHashes"] = {};
  const compromisedSkills = [];
  const skills: ManifestSkill[] = [];
  for (const currentCategory of category === "all" ? categories : [category]) {
    const categoryDir = repoPath(repoRoot, "skills", currentCategory);
    const skillDirs = fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const skillName of skillDirs) {
      if (
        options.selectedSkills &&
        !options.selectedSkills.has(sourceKey(currentCategory, skillName))
      ) {
        continue;
      }
      const skill = buildSkill(
        repoRoot,
        runDir,
        category === "all",
        currentCategory,
        skillName,
        sourceHashes,
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
    metadata: {
      startedAt: now.toISOString(),
      evidenceMode: options.baselineRunId ? "incremental" : "fresh",
      freshAnswerCount: 0,
      reusedAnswerCount: 0,
    },
    scope: {
      kind: scope,
      categories: category === "all" ? categories : [category],
    },
    protocol: {
      instructionVersion: "governing-skill-v3",
      isolation: "worker-per-arm",
      baseline: "prompt-only",
      withSkill: "prompt-plus-skill",
      trigger: "name-description-only",
    },
    sourceHashes,
    compromisedSkills,
    activationEvidenceVersion: 3,
    assertionSemanticsVersion: 2,
    ...(options.baselineRunId ? { baselineRunId: options.baselineRunId } : {}),
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

/**
 * Resolve a human-friendly run reference without changing immutable run IDs.
 * `latest` selects the newest completed run for the requested version/scope;
 * exact physical IDs and canonical IDs continue to work unchanged.
 */
export function resolveRunId(
  runReference: string,
  options: RunReferenceOptions,
): string {
  const repoRoot = options.repoRoot ?? ROOT_DIR;
  const runsDir = runDirectory(repoRoot);
  const exactDir = path.join(runsDir, runReference);
  if (fs.existsSync(exactDir)) return runReference;

  if (runReference !== "latest") {
    throw new Error(
      `Run not found: ${runReference}. Use the full run ID or --run latest --version ${options.version} --category ${options.category ?? "all"}.`,
    );
  }

  const category = options.category ?? "all";
  const canonicalId = `${category}-v${options.version}`;
  const canonicalDir = path.join(runsDir, canonicalId);
  if (fs.existsSync(path.join(canonicalDir, MANIFEST_FILENAME))) {
    const canonical = loadManifest(canonicalDir);
    if (
      canonical.version === options.version &&
      canonical.category === category &&
      fs.existsSync(path.join(canonicalDir, RESULTS_FILENAME))
    )
      return canonicalId;
  }

  const candidates = fs
    .readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .flatMap((runId) => {
      const runDir = path.join(runsDir, runId);
      try {
        const manifest = loadManifest(runDir);
        if (
          manifest.version !== options.version ||
          manifest.category !== category ||
          !manifest.metadata.completedAt ||
          !fs.existsSync(path.join(runDir, RESULTS_FILENAME))
        )
          return [];
        return [{ runId, createdAt: manifest.createdAt ?? "" }];
      } catch {
        return [];
      }
    })
    .sort((a, b) =>
      a.createdAt === b.createdAt
        ? a.runId.localeCompare(b.runId)
        : a.createdAt.localeCompare(b.createdAt),
    );

  const latest = candidates.at(-1);
  if (!latest)
    throw new Error(
      `No completed ${category} run found for version ${options.version}.`,
    );
  return latest.runId;
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
