import { randomBytes } from "node:crypto";
import fs from "fs-extra";
import * as path from "path";
import { isGuardrailApplicable } from "../benchmark/utils";
import {
  CURRENT_INSTRUCTION_VERSION,
  MANIFEST_FILENAME,
  RESULTS_FILENAME,
  ROOT_DIR,
  RUNS_DIR,
} from "./constants";
import { readCurrentSource, resourceFingerprint, sourceKey } from "./snapshot";
import {
  Assertion,
  EvalCaseRef,
  InstructionVersion,
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
  behavior_assertions?: string[];
}

export interface EvalsJson {
  evals?: SkillEvalCase[];
  should_trigger?: string[];
  should_not_trigger?: string[];
  pressure_scenarios?: PressureScenario[];
}

export interface EvalCaseDefinition {
  id: string;
  kind: EvalCaseRef["kind"];
  prompt: string;
  assertions?: Assertion[];
  behaviorAssertions?: string[];
  expectedTrigger?: "yes" | "no";
}

/**
 * The single case-identity mapping for a skill: `eval-<id>`, positional
 * `trigger-<n>` counted across should_trigger then should_not_trigger, and
 * positional `pressure-<index+1>`. Manifest building and the gate's case
 * comparison both read cases through this function.
 */
export function evalCaseDefinitions(evalsData: EvalsJson): EvalCaseDefinition[] {
  const definitions: EvalCaseDefinition[] = (evalsData.evals ?? []).map(
    (evaluation) => ({
      id: `eval-${evaluation.id}`,
      kind: "eval",
      prompt: evaluation.prompt,
      assertions: evaluation.assertions ?? [],
    }),
  );
  let triggerIndex = 0;
  for (const [field, expectedTrigger] of [
    ["should_trigger", "yes"],
    ["should_not_trigger", "no"],
  ] as const) {
    for (const prompt of evalsData[field] ?? []) {
      definitions.push({
        id: `trigger-${++triggerIndex}`,
        kind: "trigger",
        prompt,
        expectedTrigger,
      });
    }
  }
  for (const [index, scenario] of (
    evalsData.pressure_scenarios ?? []
  ).entries()) {
    if (!scenario.prompt) continue;
    definitions.push({
      id: `pressure-${index + 1}`,
      kind: "pressure",
      prompt: scenario.prompt,
      behaviorAssertions: scenario.behavior_assertions ?? [],
    });
  }
  return definitions;
}

/**
 * Canonical text whose equality means the same case definition: prompt plus
 * assertions for eval cases, prompt plus expected decision for trigger cases,
 * and prompt plus behaviour assertions for pressure cases.
 */
export function caseDefinitionFingerprint(
  definition: EvalCaseDefinition,
): string {
  const assertions = (
    definition.kind === "pressure"
      ? definition.behaviorAssertions
      : definition.assertions?.map((assertion) => ({
          type: assertion.type,
          value: assertion.value,
        }))
  ) ?? [];
  return JSON.stringify([
    definition.prompt,
    assertions,
    definition.expectedTrigger ?? null,
  ]);
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

function writeCasePrompt(
  promptsDir: string,
  definition: EvalCaseDefinition,
  skillName: string,
  description: string,
): void {
  const body =
    definition.kind === "trigger"
      ? triggerPromptBody(
          skillName,
          description,
          definition.id,
          definition.prompt,
        )
      : definition.kind === "pressure"
        ? pressurePromptBody(definition.prompt)
        : evalPromptBody(definition.prompt);
  fs.writeFileSync(path.join(promptsDir, `${definition.id}.md`), body);
}

function makeManifestCase(definition: EvalCaseDefinition): EvalCaseRef {
  if (definition.kind === "trigger") {
    return makeCase(
      definition.id,
      "trigger",
      { "with-skill": "pending" },
      definition.expectedTrigger,
    );
  }
  return makeCase(definition.id, definition.kind, {
    baseline: "pending",
    "with-skill": "pending",
  });
}

function buildSkill(
  repoRoot: string,
  runDir: string,
  isAggregate: boolean,
  category: string,
  skillName: string,
  sourceHashes: ManifestV2["sourceHashes"],
  resourceFingerprints: NonNullable<ManifestV2["resourceFingerprints"]>,
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
  const source = readCurrentSource(repoRoot, {
    category,
    skillName,
    skillPath: `skills/${category}/${skillName}/SKILL.md`,
    guardrailApplicable: false,
    cases: [],
  });
  sourceHashes[key] = source.hashes;
  resourceFingerprints[key] = resourceFingerprint(source.resources ?? {});

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
  const definitions = evalCaseDefinitions(evalsData).filter(
    (definition) => definition.kind !== "pressure" || guardrailApplicable,
  );
  for (const definition of definitions) {
    writeCasePrompt(promptsDir, definition, skillName, description);
    cases.push(makeManifestCase(definition));
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
  const resourceFingerprints: NonNullable<ManifestV2["resourceFingerprints"]> =
    {};
  const compromisedSkills: ManifestV2["compromisedSkills"] = [];
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
        resourceFingerprints,
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
      instructionVersion: CURRENT_INSTRUCTION_VERSION,
      isolation: "worker-per-arm",
      baseline: "prompt-only",
      withSkill: "prompt-plus-skill",
      trigger: "name-description-only",
    },
    sourceHashes,
    resourceFingerprints,
    inputProvenanceVersion: 1,
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
  options: {
    repoRoot?: string;
    expectedInstructionVersion?: InstructionVersion;
  } = {},
): { manifest: Manifest; runDir: string } {
  const repoRoot = options.repoRoot ?? ROOT_DIR;
  const runDir = path.join(runDirectory(repoRoot), runId);
  if (!fs.existsSync(runDir)) throw new Error(`Run not found: ${runId}`);
  const manifest = loadManifest(runDir);
  const protocolVersion =
    manifest.schemaVersion === 2
      ? manifest.protocol?.instructionVersion
      : "governing-skill-v1";
  const expected =
    options.expectedInstructionVersion ?? CURRENT_INSTRUCTION_VERSION;
  if (protocolVersion !== expected) {
    throw new Error(
      `Cannot resume run ${runId}: protocol version mismatch (expected ${expected}, found ${protocolVersion ?? "unknown"}). Historical runs cannot be resumed with new answer generation.`,
    );
  }
  return { manifest, runDir };
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
