import fs from "fs-extra";
import path from "path";
import os from "os";
import crypto from "crypto";
import { spawn } from "child_process";
import * as yaml from "js-yaml";
import {
  parseGenerationLedger,
  sha256,
  type GenerationEntry,
  type ManifestEntry,
  type SkillsLockFile,
} from "../../cli/src/services/LockfileService";
import { assertNoSymlinksUnderRoot } from "../../cli/src/services/install/safePath";
import { isOverriddenRel } from "../../cli/src/services/install/pathMatch";
import {
  Agent,
  SUPPORTED_AGENTS,
  type AgentDefinition,
} from "../../cli/src/constants";
import { WorkflowTransformer } from "../../cli/src/services/utils/WorkflowTransformer";
import { SpecialistTransformer } from "../../cli/src/services/utils/SpecialistTransformer";
import { render as renderCapabilitiesDoc } from "../generate-capabilities-doc";

export interface IsolatedStageOptions {
  repoRoot: string;
  checkOnly?: boolean;
  attemptId?: string;
  logDir?: string;
  adoptBase?: string;
}

export interface IsolatedStageResult {
  success: boolean;
  attemptId: string;
  checkOnly: boolean;
  /** Files renamed into place by this invocation (partial on failure). */
  copiedBackFiles: string[];
  /** Renamed files whose published bytes verified against the staged digest. */
  verifiedFiles: string[];
  logPath: string;
  receiptPath: string;
  error?: string;
}

export interface CategoryIndexTarget {
  relPath: string;
  category: string;
  /** Category-local skill ids the producer must advertise. */
  skillNames: string[];
}

export interface MirrorFileTarget {
  relPath: string;
  /** Repository path of the authoritative bytes (package file or inherited root license). */
  canonicalRelPath: string;
  /** Canonical skill that owns the mirrored bytes, including inherited root resources. */
  sourceSkillId: string;
  /** Kiro rewrites SKILL.md, so only its presence can be asserted. */
  transformed: boolean;
}

export interface WorkflowTarget {
  relPath: string;
  sourceRelPath: string;
  agentId: Agent;
}

export interface SpecialistTarget {
  relPath: string;
  canonicalRelPath: string;
  agentId: Agent;
}

export interface GenerationPlan {
  targetAgents: Agent[];
  configuredCategories: string[];
  selectedSkillIds: string[];
  skillRefs: Record<string, string>;
  declaredFiles: string[];
  canonicalCategoryIndexes: CategoryIndexTarget[];
  hostCategoryIndexes: CategoryIndexTarget[];
  indexJsonCategories: Array<{ category: string; skillIds: string[] }>;
  mirrorFiles: MirrorFileTarget[];
  ruleFiles: string[];
  workflowOutputs: WorkflowTarget[];
  specialistOutputs: SpecialistTarget[];
  missingWorkflowSources: string[];
}

interface LoadedRepoConfig {
  agents: string[];
  skills: Record<
    string,
    { ref?: string; include?: string[]; exclude?: string[] }
  >;
  workflows: string[] | true;
  overrides: string[];
}

interface SkillFile {
  /** File name inside the mirrored package directory. */
  name: string;
  /** Authoritative repository path for the bytes. */
  sourceRelPath: string;
}

const CONFIG_FILE_CANDIDATES = [".skillsrc", ".skillsrc.yaml"];
const MIRRORED_RESOURCE_PREFIXES = ["references/", "scripts/", "assets/"];
const MIRRORED_ROOT_FILES = /^(LICENSE|NOTICE)(?:\.(?:md|txt))?$/i;
const QUALIFIED_ROW_PATTERN = /^\s*-\s+\*\*\[([^\]]+)\]\*\*\s*:/;
const ATTEMPT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
const TABLE_SEPARATOR_PATTERN = /^:?-{3,}:?$/;
const LOCAL_SKILL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function computeSha256(content: Buffer | string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function fileSha256(filePath: string): Promise<string | null> {
  if (!(await fs.pathExists(filePath))) return null;
  const buf = await fs.readFile(filePath);
  return computeSha256(buf);
}
type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function orderedJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(orderedJsonValue);
  if (!isJsonRecord(value)) return value;
  const ordered: JsonRecord = {};
  for (const key of Object.keys(value).sort()) {
    ordered[key] = orderedJsonValue(value[key]);
  }
  return ordered;
}

function parseMetadataDocument(bytes: Buffer, label: string): JsonRecord {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(
      `${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!isJsonRecord(value) || !isJsonRecord(value.categories)) {
    throw new Error(`${label} must contain a categories object.`);
  }
  for (const [category, details] of Object.entries(value.categories)) {
    if (!isJsonRecord(details)) {
      throw new Error(`${label} category "${category}" must be an object.`);
    }
  }
  return value;
}

function tokenMetricsProjection(metadata: JsonRecord): JsonRecord {
  const categories = metadata.categories as JsonRecord;
  const projection: JsonRecord = {};
  for (const category of Object.keys(categories).sort()) {
    const details = categories[category] as JsonRecord;
    projection[category] = Object.prototype.hasOwnProperty.call(
      details,
      "token_metrics",
    )
      ? { present: true, value: orderedJsonValue(details.token_metrics) }
      : { present: false };
  }
  return projection;
}

function tokenMetricsDigest(metadata: JsonRecord): string {
  return computeSha256(JSON.stringify(tokenMetricsProjection(metadata)));
}

function jsonValueEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => jsonValueEqual(value, right[index]))
    );
  }
  if (!isJsonRecord(left) || !isJsonRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] && jsonValueEqual(left[key], right[key]),
    )
  );
}

function metadataNonMetricsEqual(
  active: JsonRecord,
  generated: JsonRecord,
): boolean {
  const activeCategories = active.categories as JsonRecord;
  const generatedCategories = generated.categories as JsonRecord;
  const activeRoot = { ...active };
  const generatedRoot = { ...generated };
  delete activeRoot.categories;
  delete generatedRoot.categories;
  if (!jsonValueEqual(activeRoot, generatedRoot)) return false;
  const categories = Object.keys(activeCategories).sort();
  if (!jsonValueEqual(categories, Object.keys(generatedCategories).sort())) {
    return false;
  }
  return categories.every((category) => {
    const activeDetails = { ...(activeCategories[category] as JsonRecord) };
    const generatedDetails = {
      ...(generatedCategories[category] as JsonRecord),
    };
    delete activeDetails.token_metrics;
    delete generatedDetails.token_metrics;
    return jsonValueEqual(activeDetails, generatedDetails);
  });
}

function canonicalMetadataBytes(metadata: JsonRecord): Buffer {
  return Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

function composeMetadataMetrics(
  active: JsonRecord,
  generated: JsonRecord,
): Buffer {
  if (!metadataNonMetricsEqual(active, generated)) {
    throw new Error(
      "Token producer changed non-metric metadata; refusing to publish outside the category token_metrics scope.",
    );
  }
  const composed = JSON.parse(JSON.stringify(active)) as JsonRecord;
  const composedCategories = composed.categories as JsonRecord;
  const generatedCategories = generated.categories as JsonRecord;
  for (const category of Object.keys(composedCategories)) {
    const activeDetails = composedCategories[category] as JsonRecord;
    const generatedDetails = generatedCategories[category] as JsonRecord;
    if (
      Object.prototype.hasOwnProperty.call(generatedDetails, "token_metrics")
    ) {
      activeDetails.token_metrics = generatedDetails.token_metrics;
    } else {
      delete activeDetails.token_metrics;
    }
  }
  return canonicalMetadataBytes(composed);
}

async function physicalPath(target: string): Promise<string> {
  const resolved = path.resolve(target);
  try {
    return await fs.realpath(resolved);
  } catch {
    return resolved;
  }
}

function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function errorCode(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    typeof err.code === "string"
  ) {
    return err.code;
  }
  return "";
}

/**
 * Mirrors the file selection used by `collectLocalSkill` in generate-indices,
 * excluding volatile Python bytecode caches: they are build artefacts of the
 * skill's own scripts, not declaration-worthy package resources.
 */
export function isMirroredPackageFile(relativePath: string): boolean {
  if (relativePath.endsWith(".pyc")) return false;
  if (relativePath.split("/").includes("__pycache__")) return false;
  if (relativePath === "SKILL.md") return true;
  if (MIRRORED_ROOT_FILES.test(relativePath)) return true;
  return MIRRORED_RESOURCE_PREFIXES.some((prefix) =>
    relativePath.startsWith(prefix),
  );
}

async function listPackageFiles(skillDir: string): Promise<string[]> {
  const files: string[] = [];

  const walk = async (current: string): Promise<void> => {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const rel = toPosix(path.relative(skillDir, fullPath));
      if (isMirroredPackageFile(rel)) files.push(rel);
    }
  };

  await walk(skillDir);
  files.sort();
  return files;
}

async function isRegistrySkill(skillDir: string): Promise<boolean> {
  const skillPath = path.join(skillDir, "SKILL.md");
  if (!(await fs.pathExists(skillPath))) return false;
  if (!(await fs.stat(skillPath)).isFile()) return false;
  const content = await fs.readFile(skillPath, "utf8");
  return FRONTMATTER_PATTERN.test(content);
}

/**
 * Enumerates categories with `fs.stat` (follows links), matching the producer in
 * generate-indices/IndexGeneratorService; a symlinked category is therefore
 * discovered and its generated output is declared and preflighted.
 */
async function listCategories(skillsDir: string): Promise<string[]> {
  if (!(await fs.pathExists(skillsDir))) return [];
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  const categories: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const stats = await fs.stat(path.join(skillsDir, entry.name));
    if (!stats.isDirectory()) continue;
    categories.push(entry.name);
  }
  categories.sort();
  return categories;
}

async function listSkillDirectories(categoryDir: string): Promise<string[]> {
  if (!(await fs.pathExists(categoryDir))) return [];
  const entries = await fs.readdir(categoryDir);
  const skills: string[] = [];
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    if (await isRegistrySkill(path.join(categoryDir, entry))) {
      skills.push(entry);
    }
  }
  skills.sort();
  return skills;
}

async function loadRepoConfig(
  repoRoot: string,
): Promise<LoadedRepoConfig | null> {
  for (const candidate of CONFIG_FILE_CANDIDATES) {
    const configPath = path.join(repoRoot, candidate);
    if (!(await fs.pathExists(configPath))) continue;

    const raw = yaml.load(await fs.readFile(configPath, "utf8")) as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;

    const agents = Array.isArray(record.agents)
      ? record.agents.filter((item): item is string => typeof item === "string")
      : [];

    const skills: LoadedRepoConfig["skills"] = {};
    const rawSkills = record.skills;
    if (
      rawSkills &&
      typeof rawSkills === "object" &&
      !Array.isArray(rawSkills)
    ) {
      for (const [category, value] of Object.entries(
        rawSkills as Record<string, unknown>,
      )) {
        if (category === "include" || category === "exclude") continue;
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          skills[category] = {};
          continue;
        }
        const entry = value as Record<string, unknown>;
        const ref = typeof entry.ref === "string" ? entry.ref : undefined;
        const include = Array.isArray(entry.include)
          ? entry.include.filter((i): i is string => typeof i === "string")
          : undefined;
        const exclude = Array.isArray(entry.exclude)
          ? entry.exclude.filter((i): i is string => typeof i === "string")
          : undefined;
        skills[category] = {
          ...(ref !== undefined ? { ref } : {}),
          ...(include ? { include } : {}),
          ...(exclude ? { exclude } : {}),
        };
      }
    }

    const rawWorkflows = record.workflows;
    const workflows: string[] | true =
      rawWorkflows === true
        ? true
        : Array.isArray(rawWorkflows)
          ? rawWorkflows.filter(
              (item): item is string => typeof item === "string",
            )
          : [];

    const overrides = Array.isArray(record.custom_overrides)
      ? record.custom_overrides.filter(
          (item): item is string => typeof item === "string",
        )
      : [];

    return { agents, skills, workflows, overrides };
  }

  return null;
}

function findAgentDefinition(agentId: string): AgentDefinition | undefined {
  return SUPPORTED_AGENTS.find((definition) => definition.id === agentId);
}

function skillMirrorDirectory(
  definition: AgentDefinition,
  category: string,
  skill: string,
): string {
  return definition.id === Agent.Kiro
    ? path.join(definition.path, `${category}-${skill}`)
    : path.join(definition.path, category, skill);
}

/**
 * Package files mirrored for one skill: the package's own resources plus the
 * repository-root LICENSE/NOTICE fallback used by `collectLocalSkill` when the
 * package has no case-insensitive same-name resource.
 */
async function collectMirrorFiles(
  repoRoot: string,
  category: string,
  skill: string,
): Promise<SkillFile[]> {
  const skillRel = path.posix.join("skills", category, skill);
  const packageFiles = await listPackageFiles(path.join(repoRoot, skillRel));
  const files: SkillFile[] = packageFiles.map((name) => ({
    name,
    sourceRelPath: path.posix.join(skillRel, name),
  }));

  const rootResources = await fs.readdir(repoRoot);
  for (const rootName of rootResources) {
    const rootMatch = rootName.match(MIRRORED_ROOT_FILES);
    if (!rootMatch) continue;
    const rootPath = path.join(repoRoot, rootName);
    const rootStat = await fs.lstat(rootPath);
    if (!rootStat.isFile() || rootStat.isSymbolicLink()) continue;
    if (
      files.some((file) => file.name.toLowerCase() === rootName.toLowerCase())
    ) {
      continue;
    }
    files.push({ name: rootName, sourceRelPath: rootName });
  }

  files.sort((left, right) => left.name.localeCompare(right.name));
  return files;
}

/**
 * Builds the bounded, configuration-derived inventory of generated surfaces,
 * reusing the producer's actual resource collection, selection and naming rules.
 */
export async function buildGenerationPlan(
  repoRoot: string,
): Promise<GenerationPlan> {
  const skillsDir = path.join(repoRoot, "skills");
  const config = await loadRepoConfig(repoRoot);
  const overrides = config?.overrides ?? [];

  const targetAgents: Agent[] = [];
  for (const agentId of config?.agents ?? []) {
    if (findAgentDefinition(agentId)) targetAgents.push(agentId as Agent);
  }

  const categories = await listCategories(skillsDir);
  const canonicalFilesBySkill = new Map<string, SkillFile[]>();
  const canonicalCategoryIndexes: CategoryIndexTarget[] = [];
  const indexJsonCategories: GenerationPlan["indexJsonCategories"] = [];

  for (const category of categories) {
    const skillNames = await listSkillDirectories(
      path.join(skillsDir, category),
    );
    if (skillNames.length === 0) continue;

    canonicalCategoryIndexes.push({
      relPath: path.posix.join("skills", category, "_INDEX.md"),
      category,
      skillNames,
    });
    indexJsonCategories.push({
      category,
      skillIds: skillNames.map((skill) => `${category}/${skill}`),
    });

    for (const skill of skillNames) {
      canonicalFilesBySkill.set(
        `${category}/${skill}`,
        await collectMirrorFiles(repoRoot, category, skill),
      );
    }
  }

  const configuredCategories: string[] = [];
  const selectedSkillIds: string[] = [];
  if (config) {
    for (const [category, selection] of Object.entries(config.skills)) {
      if (!categories.includes(category)) continue;
      configuredCategories.push(category);

      const skillNames = await listSkillDirectories(
        path.join(skillsDir, category),
      );
      const selected = skillNames.filter((skill) => {
        if (selection.include && !selection.include.includes(skill)) {
          return false;
        }
        if (selection.exclude && selection.exclude.includes(skill)) {
          return false;
        }
        return true;
      });
      for (const skill of selected) {
        const id = `${category}/${skill}`;
        selectedSkillIds.push(id);
        if (!canonicalFilesBySkill.has(id)) {
          canonicalFilesBySkill.set(
            id,
            await collectMirrorFiles(repoRoot, category, skill),
          );
        }
      }
    }
  }
  selectedSkillIds.sort();
  configuredCategories.sort();

  const declared = new Set<string>();
  declared.add("skills/metadata.json");
  declared.add("skills/index.json");
  for (const rel of ["README.md", "skills/README.md", "cli/README.md"]) {
    if (await fs.pathExists(path.join(repoRoot, rel))) declared.add(rel);
  }
  declared.add("AGENTS.md");
  if (await fs.pathExists(path.join(repoRoot, "server"))) {
    declared.add("server/AGENTS.md");
  }
  declared.add("docs/agent-capabilities.md");
  for (const target of canonicalCategoryIndexes) declared.add(target.relPath);

  const hostCategoryIndexes: CategoryIndexTarget[] = [];
  const mirrorFiles: MirrorFileTarget[] = [];
  const ruleFiles: string[] = [];
  const workflowOutputs: WorkflowTarget[] = [];
  const specialistOutputs: SpecialistTarget[] = [];
  const ruleFileCandidates: Array<{
    relPath: string;
    detected: boolean;
    detectionFiles: string[];
  }> = [];

  const workflowSourceDir = path.join(repoRoot, ".agents", "workflows");
  const allWorkflowNames = (await fs.pathExists(workflowSourceDir))
    ? (await fs.readdir(workflowSourceDir))
        .filter((file) => file.endsWith(".md"))
        .map((file) => file.replace(/\.md$/, ""))
        .sort()
    : [];
  let workflowNames = allWorkflowNames;
  const missingWorkflowSources: string[] = [];
  if (config && config.workflows !== true) {
    workflowNames = config.workflows;
    for (const name of workflowNames) {
      if (!allWorkflowNames.includes(name)) missingWorkflowSources.push(name);
    }
  }

  const specialistDir = path.join(skillsDir, "specialists");
  const specialistNames = (await fs.pathExists(specialistDir))
    ? (await fs.readdir(specialistDir, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];

  for (const agentId of targetAgents) {
    const definition = findAgentDefinition(agentId);
    if (!definition) continue;

    let detected = false;
    for (const detectionFile of definition.detectionFiles) {
      if (await fs.pathExists(path.join(repoRoot, detectionFile))) {
        detected = true;
        break;
      }
    }

    const ruleFile = toPosix(
      path.normalize(
        path.join(
          definition.ruleFile,
          definition.ruleFileName ||
            `agent-skill-standard-rule${definition.ruleExtension}`,
        ),
      ),
    );
    ruleFileCandidates.push({
      relPath: ruleFile,
      detected,
      detectionFiles: definition.detectionFiles,
    });

    for (const category of configuredCategories) {
      const skillNames = selectedSkillIds
        .filter((id) => id.startsWith(`${category}/`))
        .map((id) => id.split("/")[1]);
      if (skillNames.length === 0) continue;
      const relPath = path.posix.join(definition.path, category, "_INDEX.md");
      if (isOverriddenRel(relPath, overrides)) continue;
      hostCategoryIndexes.push({ relPath, category, skillNames });
      declared.add(relPath);
    }

    for (const skillId of selectedSkillIds) {
      const [category, skill] = skillId.split("/");
      const files = canonicalFilesBySkill.get(skillId) ?? [];
      const mirrorDir = toPosix(
        skillMirrorDirectory(definition, category, skill),
      );
      for (const file of files) {
        const relPath = path.posix.join(mirrorDir, file.name);
        if (isOverriddenRel(relPath, overrides)) continue;
        declared.add(relPath);
        mirrorFiles.push({
          relPath,
          canonicalRelPath: file.sourceRelPath,
          sourceSkillId: skillId,
          transformed: definition.id === Agent.Kiro && file.name === "SKILL.md",
        });
      }
    }

    if (definition.workflowFormat !== "none") {
      for (const name of workflowNames) {
        const sourceRelPath = path.posix.join(
          ".agents",
          "workflows",
          `${name}.md`,
        );
        if (!(await fs.pathExists(path.join(repoRoot, sourceRelPath))))
          continue;
        const content = await fs.readFile(
          path.join(repoRoot, sourceRelPath),
          "utf8",
        );
        const parsed = WorkflowTransformer.parse({
          name: `${name}.md`,
          content,
        });
        const transformed = WorkflowTransformer.transformParsed(
          parsed,
          definition.workflowFormat,
        );
        if (!transformed) continue;
        const outputDir = definition.workflowPath;
        const relPath =
          definition.workflowFormat === "skill"
            ? path.posix.join(outputDir, name, transformed.name)
            : path.posix.join(outputDir, transformed.name);
        // `native` agents read the canonical source in place; it is an input.
        if (relPath === sourceRelPath) continue;
        if (isOverriddenRel(relPath, overrides)) continue;
        declared.add(relPath);
        workflowOutputs.push({
          relPath,
          sourceRelPath,
          agentId: definition.id,
        });
      }
    }

    if (definition.agentPath && definition.specialistFormat) {
      for (const specialistName of specialistNames) {
        const canonicalRelPath = path.posix.join(
          "skills",
          "specialists",
          specialistName,
          "SKILL.md",
        );
        const skillPath = path.join(repoRoot, canonicalRelPath);
        if (!(await fs.pathExists(skillPath))) continue;
        const transformed = SpecialistTransformer.transform(
          {
            name: specialistName,
            content: await fs.readFile(skillPath, "utf8"),
          },
          definition.id,
        );
        if (!transformed) continue;
        const relPath = path.posix.join(definition.agentPath, transformed.name);
        if (isOverriddenRel(relPath, overrides)) continue;
        declared.add(relPath);
        specialistOutputs.push({
          relPath,
          canonicalRelPath,
          agentId: definition.id,
        });
      }
    }
  }
  for (const candidate of ruleFileCandidates) {
    const plannedDetection = candidate.detectionFiles.some((detectionFile) =>
      Array.from(declared).some(
        (relPath) =>
          relPath === detectionFile || relPath.startsWith(`${detectionFile}/`),
      ),
    );
    if (
      (candidate.detected || plannedDetection) &&
      !candidate.relPath.startsWith("..") &&
      candidate.relPath !== "." &&
      !isOverriddenRel(candidate.relPath, overrides)
    ) {
      ruleFiles.push(candidate.relPath);
      declared.add(candidate.relPath);
    }
  }

  return {
    targetAgents,
    configuredCategories,
    selectedSkillIds,
    skillRefs: Object.fromEntries(
      Object.entries(config?.skills ?? {}).map(([category, setting]) => [
        category,
        setting.ref ?? "main",
      ]),
    ),
    declaredFiles: Array.from(declared).sort(),
    canonicalCategoryIndexes,
    hostCategoryIndexes,
    indexJsonCategories,
    mirrorFiles,
    ruleFiles: ruleFiles.sort(),
    workflowOutputs: workflowOutputs.sort((left, right) =>
      left.relPath.localeCompare(right.relPath),
    ),
    specialistOutputs: specialistOutputs.sort((left, right) =>
      left.relPath.localeCompare(right.relPath),
    ),
    missingWorkflowSources,
  };
}

/**
 * Fail-closed preflight: configured categories, include targets and workflow
 * sources must exist and contain registry skills.
 */
export async function validateCategorySelections(
  repoRoot: string,
): Promise<{ valid: boolean; missing: string[]; error?: string }> {
  const skillsDir = path.join(repoRoot, "skills");
  const metadataPath = path.join(skillsDir, "metadata.json");

  if (!(await fs.pathExists(metadataPath))) {
    return { valid: false, missing: ["skills/metadata.json"] };
  }

  const metadata = (await fs.readJson(metadataPath)) as {
    categories?: Record<string, unknown>;
  };
  const metadataCategories = Object.keys(metadata.categories ?? {});
  const diskCategories = await listCategories(skillsDir);

  const missingCategories = metadataCategories.filter(
    (id) => !diskCategories.includes(id),
  );
  if (missingCategories.length > 0) {
    return {
      valid: false,
      missing: missingCategories,
      error: "metadata categories missing on disk",
    };
  }

  const config = await loadRepoConfig(repoRoot);
  if (!config) return { valid: true, missing: [] };

  const missing: string[] = [];
  for (const [category, selection] of Object.entries(config.skills)) {
    if (!diskCategories.includes(category)) {
      missing.push(`configured category ${category}`);
      continue;
    }
    const skillNames = await listSkillDirectories(
      path.join(skillsDir, category),
    );
    const selected = skillNames.filter((skill) => {
      if (selection.include && !selection.include.includes(skill)) return false;
      if (selection.exclude && selection.exclude.includes(skill)) return false;
      return true;
    });
    if (selected.length === 0) {
      missing.push(`no selected registry skills in ${category}`);
      continue;
    }
    for (const skill of selection.include ?? []) {
      if (!skillNames.includes(skill)) {
        missing.push(`${category}/${skill} (include target absent on disk)`);
      }
    }
  }

  const plan = await buildGenerationPlan(repoRoot);
  for (const name of plan.missingWorkflowSources) {
    missing.push(`workflow source .agents/workflows/${name}.md`);
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Rejects source symlinks at every location the generators traverse or write
 * through, before any child process runs. Package-internal resource links are
 * read-only for the producers and are not write ancestors.
 */
export async function assertNoSourceSymlinks(repoRoot: string): Promise<void> {
  const checkEntries = async (relativeDir: string): Promise<void> => {
    const fullPath = path.join(repoRoot, relativeDir);
    const stats = await fs.lstat(fullPath).catch((err: unknown) => {
      if (errorCode(err) === "ENOENT") return null;
      throw err;
    });
    if (!stats) return;
    if (stats.isSymbolicLink()) {
      throw new Error(
        `Source symlink not permitted for generated writes: "${fullPath}"`,
      );
    }
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        throw new Error(
          `Source symlink not permitted for generated writes: "${path.join(fullPath, entry.name)}"`,
        );
      }
    }
  };

  await checkEntries("skills");
  await checkEntries(".agents/workflows");
  await checkEntries("skills/specialists");

  const skillsDir = path.join(repoRoot, "skills");
  if (!(await fs.pathExists(skillsDir))) return;
  for (const category of await listCategories(skillsDir)) {
    await checkEntries(path.join("skills", category));
  }
}

interface IndexRows {
  ids: string[];
  duplicates: string[];
  malformed: string[];
}

function pushUnique(ids: string[], duplicates: string[], id: string): void {
  if (ids.includes(id)) {
    duplicates.push(id);
    return;
  }
  ids.push(id);
}

/**
 * Parses the producer's real `_INDEX.md` table: `| skillId | files | keywords |`
 * in File Match, `| skillId | keywords |` in Keyword Match, with optional `**`
 * priority markers. Skill ids are category-local.
 */
export function parseCategoryIndexRows(content: string): IndexRows {
  const ids: string[] = [];
  const duplicates: string[] = [];
  const malformed: string[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 2) continue;
    const first = cells[0];
    if (!first || TABLE_SEPARATOR_PATTERN.test(first) || first === "Skill") {
      continue;
    }
    const id = first.replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
    if (!LOCAL_SKILL_ID_PATTERN.test(id)) {
      malformed.push(first);
      continue;
    }
    pushUnique(ids, duplicates, id);
  }

  return { ids, duplicates, malformed };
}

/**
 * Parses `skills/index.json` values: qualified `- **[category/skill]**: …` rows.
 */
export function parseQualifiedRows(
  content: string,
  category: string,
): IndexRows {
  const ids: string[] = [];
  const duplicates: string[] = [];
  const malformed: string[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const match = QUALIFIED_ROW_PATTERN.exec(rawLine);
    if (!match) continue;
    const id = match[1].trim();
    const [rowCategory, skillName, ...rest] = id.split("/");
    if (
      rest.length > 0 ||
      rowCategory !== category ||
      !LOCAL_SKILL_ID_PATTERN.test(skillName ?? "")
    ) {
      malformed.push(id);
      continue;
    }
    pushUnique(ids, duplicates, id);
  }

  return { ids, duplicates, malformed };
}

function describeIndexErrors(
  label: string,
  actual: IndexRows,
  expectedIds: string[],
): string[] {
  const errors: string[] = [];
  if (actual.malformed.length > 0) {
    errors.push(`${label} has malformed ids: ${actual.malformed.join(", ")}`);
  }
  if (actual.duplicates.length > 0) {
    errors.push(
      `${label} has duplicate ids: ${[...new Set(actual.duplicates)].join(", ")}`,
    );
  }
  const actualSet = new Set(actual.ids);
  const expectedSet = new Set(expectedIds);
  const missing = expectedIds.filter((id) => !actualSet.has(id));
  const unexpected = actual.ids.filter((id) => !expectedSet.has(id));
  if (missing.length > 0) {
    errors.push(`${label} omits ids: ${missing.join(", ")}`);
  }
  if (unexpected.length > 0) {
    errors.push(`${label} advertises unexpected ids: ${unexpected.join(", ")}`);
  }
  return errors;
}

async function expectedWorkflowContent(
  stageRoot: string,
  target: WorkflowTarget,
): Promise<Buffer | null> {
  const definitionAgent = findAgentDefinition(target.agentId);
  if (!definitionAgent || definitionAgent.workflowFormat === "none")
    return null;
  const sourcePath = path.join(stageRoot, target.sourceRelPath);
  if (!(await fs.pathExists(sourcePath))) return null;
  const parsed = WorkflowTransformer.parse({
    name: path.basename(target.sourceRelPath),
    content: await fs.readFile(sourcePath, "utf8"),
  });
  const transformed = WorkflowTransformer.transformParsed(
    parsed,
    definitionAgent.workflowFormat,
  );
  return transformed ? Buffer.from(transformed.content, "utf8") : null;
}

/**
 * Verifies the regenerated surface before any copy-back, using each producer's
 * actual output contract and exact owned/configured ID sets. When the ownership
 * writer preserved a differing destination, the divergence is reported as an
 * explicit conflict instead of being silently overwritten.
 */
type CandidateSourceInventory = Map<string, string>;
interface PrivatePublicationTemp {
  directoryRelPath: string;
  directoryIdentity: string;
  fileRelPath: string;
  fileIdentity: string;
  digest: string;
}

type OwnedOutputDirectories = Map<string, string | null>;

function filesystemIdentity(stats: { dev: number; ino: number }): string {
  return `${stats.dev}:${stats.ino}`;
}

async function captureCandidateSourceInventory(
  rootDir: string,
  plan: GenerationPlan,
): Promise<CandidateSourceInventory> {
  const inventory: CandidateSourceInventory = new Map();
  const declaredOutputs = new Set(plan.declaredFiles);
  const capture = async (relPath: string, recurse: boolean): Promise<void> => {
    let parent = path.posix.dirname(relPath);
    while (parent !== ".") {
      const parentPath = path.join(rootDir, parent);
      const parentStat = await fs.lstat(parentPath).catch((error: unknown) => {
        if (errorCode(error) === "ENOENT") return null;
        throw error;
      });
      if (!parentStat) break;
      if (parentStat.isSymbolicLink() || !parentStat.isDirectory()) {
        throw new Error(
          `Candidate source inventory has unsafe parent "${parent}".`,
        );
      }
      parent = path.posix.dirname(parent);
    }
    const absolutePath = path.join(rootDir, relPath);
    const stat = await fs.lstat(absolutePath).catch((error: unknown) => {
      if (errorCode(error) === "ENOENT") return null;
      throw error;
    });
    if (!stat) {
      inventory.set(relPath, "absent");
      return;
    }
    if (stat.isSymbolicLink()) {
      throw new Error(
        `Candidate source inventory contains symlink "${relPath}".`,
      );
    }
    if (stat.isDirectory()) {
      inventory.set(relPath, "directory");
      if (!recurse) return;
      const children = (await fs.readdir(absolutePath)).sort();
      for (const name of children) {
        const childRelPath = path.posix.join(relPath, name);
        const isTestPath =
          (childRelPath.startsWith("cli/src/") ||
            childRelPath.startsWith("scripts/")) &&
          (name === "__tests__" || /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(name));
        if (isTestPath || declaredOutputs.has(childRelPath)) continue;
        await capture(childRelPath, true);
      }
      return;
    }
    if (!stat.isFile()) {
      throw new Error(
        `Candidate source inventory contains non-regular path "${relPath}".`,
      );
    }
    if (!declaredOutputs.has(relPath)) {
      inventory.set(relPath, computeSha256(await fs.readFile(absolutePath)));
    }
  };

  await capture("skills", true);
  await capture(".agents/workflows", true);
  await capture("cli/src", true);
  await capture("scripts", true);
  for (const producerPath of [
    "package.json",
    "cli/package.json",
    "tsconfig.json",
    "cli/tsconfig.json",
  ]) {
    await capture(producerPath, false);
  }
  for (const configPath of CONFIG_FILE_CANDIDATES) {
    await capture(configPath, false);
  }
  for (const entry of await fs.readdir(rootDir)) {
    if (MIRRORED_ROOT_FILES.test(entry)) await capture(entry, false);
  }
  for (const agentId of plan.targetAgents) {
    const definition = findAgentDefinition(agentId);
    if (!definition) continue;
    for (const detectionPath of definition.detectionFiles) {
      await capture(detectionPath, false);
    }
  }
  for (const relPath of plan.declaredFiles) {
    let parent = path.posix.dirname(relPath);
    while (parent !== ".") {
      await capture(parent, false);
      parent = path.posix.dirname(parent);
    }
  }
  return inventory;
}

function sourceInventoryDifferences(
  expected: CandidateSourceInventory,
  actual: CandidateSourceInventory,
  exactOwnEffects: Map<string, string> = new Map(),
): string[] {
  const paths = new Set([...expected.keys(), ...actual.keys()]);
  return Array.from(paths)
    .filter((relPath) => {
      const before = expected.get(relPath);
      const current = actual.get(relPath);
      if (before === current) return false;
      const ownExpected = exactOwnEffects.get(relPath);
      return !(
        ownExpected !== undefined &&
        (before === undefined || before === "absent") &&
        current === ownExpected
      );
    })
    .sort();
}

async function assertOwnedSourceEffects(
  repoRoot: string,
  before: CandidateSourceInventory,
  current: CandidateSourceInventory,
  declaredPaths: string[],
  ownedDirectories: OwnedOutputDirectories,
  privateTemps: Map<string, PrivatePublicationTemp>,
): Promise<Map<string, string>> {
  const exactEffects = new Map<string, string>();
  const isPlannedChild = (childRelPath: string): boolean => {
    for (const declaredPath of declaredPaths) {
      if (
        declaredPath === childRelPath ||
        declaredPath.startsWith(`${childRelPath}/`)
      ) {
        return true;
      }
    }
    for (const directoryRelPath of ownedDirectories.keys()) {
      if (
        directoryRelPath === childRelPath ||
        directoryRelPath.startsWith(`${childRelPath}/`)
      ) {
        return true;
      }
    }
    for (const temp of privateTemps.values()) {
      if (
        temp.directoryRelPath === childRelPath ||
        temp.directoryRelPath.startsWith(`${childRelPath}/`)
      ) {
        return true;
      }
    }
    return false;
  };
  for (const [relPath, identity] of ownedDirectories) {
    if (!identity) {
      throw new Error(
        `Owned publication directory "${relPath}" has no verified filesystem identity.`,
      );
    }
    const absolutePath = path.join(repoRoot, relPath);
    const stat = await fs.lstat(absolutePath).catch((error: unknown) => {
      if (errorCode(error) === "ENOENT") return null;
      throw error;
    });
    if (
      !stat ||
      stat.isSymbolicLink() ||
      !stat.isDirectory() ||
      filesystemIdentity(stat) !== identity
    ) {
      throw new Error(
        `Owned publication directory "${relPath}" changed identity during generation.`,
      );
    }
    for (const child of await fs.readdir(absolutePath)) {
      const childRelPath = path.posix.join(relPath, child);
      if (!isPlannedChild(childRelPath)) {
        throw new Error(
          `Foreign path "${childRelPath}" appeared inside an invocation-owned output directory.`,
        );
      }
    }
    if (
      current.get(relPath) === "directory" &&
      (before.get(relPath) === undefined || before.get(relPath) === "absent")
    ) {
      exactEffects.set(relPath, "directory");
    }
  }

  for (const temp of privateTemps.values()) {
    await assertPrivatePublicationTemp(repoRoot, temp);
    if (
      current.get(temp.directoryRelPath) === "directory" &&
      (before.get(temp.directoryRelPath) === undefined ||
        before.get(temp.directoryRelPath) === "absent")
    ) {
      exactEffects.set(temp.directoryRelPath, "directory");
    }
    if (
      current.get(temp.fileRelPath) === temp.digest &&
      (before.get(temp.fileRelPath) === undefined ||
        before.get(temp.fileRelPath) === "absent")
    ) {
      exactEffects.set(temp.fileRelPath, temp.digest);
    }
  }
  return exactEffects;
}

async function assertPrivatePublicationTemp(
  repoRoot: string,
  temp: PrivatePublicationTemp,
): Promise<void> {
  const directoryPath = path.join(repoRoot, temp.directoryRelPath);
  const directoryStat = await fs
    .lstat(directoryPath)
    .catch((error: unknown) => {
      if (errorCode(error) === "ENOENT") return null;
      throw error;
    });
  const directoryEntries =
    directoryStat &&
    !directoryStat.isSymbolicLink() &&
    directoryStat.isDirectory()
      ? (await fs.readdir(directoryPath)).sort()
      : [];
  const filePath = path.join(repoRoot, temp.fileRelPath);
  const fileStat = await fs.lstat(filePath).catch((error: unknown) => {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  });
  if (
    !directoryStat ||
    directoryStat.isSymbolicLink() ||
    !directoryStat.isDirectory() ||
    filesystemIdentity(directoryStat) !== temp.directoryIdentity ||
    directoryEntries.length !== 1 ||
    directoryEntries[0] !== path.posix.basename(temp.fileRelPath) ||
    !fileStat ||
    fileStat.isSymbolicLink() ||
    !fileStat.isFile() ||
    filesystemIdentity(fileStat) !== temp.fileIdentity ||
    (await fileSha256(filePath)) !== temp.digest
  ) {
    throw new Error(
      `Private publication temporary "${temp.fileRelPath}" changed during generation.`,
    );
  }
}

export async function validateGeneratedSurface(
  stageRoot: string,
  plan: GenerationPlan,
  baselineDigests: Map<string, string | null>,
): Promise<string[]> {
  const errors: string[] = [];
  const conflictDigest = async (
    relPath: string,
    stageBuffer: Buffer,
  ): Promise<boolean> => {
    const stageDigest = computeSha256(stageBuffer);
    return baselineDigests.get(relPath) === stageDigest;
  };

  const checkCategoryIndex = async (
    target: CategoryIndexTarget,
    label: string,
  ): Promise<void> => {
    const fullPath = path.join(stageRoot, target.relPath);
    if (!(await fs.pathExists(fullPath))) {
      errors.push(`missing generated index ${target.relPath}`);
      return;
    }
    const content = await fs.readFile(fullPath, "utf8");
    const rows = parseCategoryIndexRows(content);
    const rowErrors = describeIndexErrors(
      `${label} ${target.relPath}`,
      rows,
      target.skillNames,
    );
    if (rowErrors.length === 0) return;
    if (await conflictDigest(target.relPath, Buffer.from(content, "utf8"))) {
      errors.push(
        `[conflict] ${rowErrors.join("; ")} (destination preserved by ownership writer; edited-owned or unknown content differs from the required generated index)`,
      );
      return;
    }
    errors.push(...rowErrors);
  };

  for (const target of plan.canonicalCategoryIndexes) {
    await checkCategoryIndex(target, "canonical");
  }
  for (const target of plan.hostCategoryIndexes) {
    await checkCategoryIndex(target, "host");
  }

  const indexJsonPath = path.join(stageRoot, "skills", "index.json");
  if (!(await fs.pathExists(indexJsonPath))) {
    errors.push("missing generated index skills/index.json");
  } else {
    const indexJson = (await fs.readJson(indexJsonPath)) as Record<
      string,
      string
    >;
    const expectedCategories = plan.indexJsonCategories.map(
      (target) => target.category,
    );
    const actualCategories = Object.keys(indexJson);
    const missingCategories = expectedCategories.filter(
      (category) => !actualCategories.includes(category),
    );
    const unexpectedCategories = actualCategories.filter(
      (category) => !expectedCategories.includes(category),
    );
    if (missingCategories.length > 0) {
      errors.push(
        `skills/index.json omits categories: ${missingCategories.join(", ")}`,
      );
    }
    if (unexpectedCategories.length > 0) {
      errors.push(
        `skills/index.json advertises unexpected categories: ${unexpectedCategories.join(", ")}`,
      );
    }
    for (const target of plan.indexJsonCategories) {
      const rows = parseQualifiedRows(
        indexJson[target.category] ?? "",
        target.category,
      );
      errors.push(
        ...describeIndexErrors(
          `skills/index.json[${target.category}]`,
          rows,
          target.skillIds,
        ),
      );
    }
  }

  const compareOwnedOutput = async (
    relPath: string,
    expected: Buffer,
    label: string,
  ): Promise<void> => {
    const fullPath = path.join(stageRoot, relPath);
    if (!(await fs.pathExists(fullPath))) {
      errors.push(`missing ${label} ${relPath}`);
      return;
    }
    const actual = await fs.readFile(fullPath);
    if (computeSha256(expected) === computeSha256(actual)) return;
    if (await conflictDigest(relPath, actual)) {
      errors.push(
        `[conflict] ${label} ${relPath} differs from required generated content and was preserved by the ownership writer (edited-owned or unknown destination)`,
      );
      return;
    }
    errors.push(
      `${label} ${relPath} does not match required generated content`,
    );
  };

  await compareOwnedOutput(
    "docs/agent-capabilities.md",
    Buffer.from(renderCapabilitiesDoc(), "utf8"),
    "agent capability table",
  );

  for (const mirror of plan.mirrorFiles) {
    if (mirror.transformed) {
      if (!(await fs.pathExists(path.join(stageRoot, mirror.relPath)))) {
        errors.push(`missing mirrored package file ${mirror.relPath}`);
      }
      continue;
    }
    const canonicalPath = path.join(stageRoot, mirror.canonicalRelPath);
    if (!(await fs.pathExists(canonicalPath))) {
      errors.push(`missing canonical source ${mirror.canonicalRelPath}`);
      continue;
    }
    await compareOwnedOutput(
      mirror.relPath,
      await fs.readFile(canonicalPath),
      "mirrored package file",
    );
  }

  for (const target of plan.workflowOutputs) {
    const expected = await expectedWorkflowContent(stageRoot, target);
    if (!expected) {
      errors.push(`cannot derive expected workflow content ${target.relPath}`);
      continue;
    }
    await compareOwnedOutput(target.relPath, expected, "workflow wrapper");
  }

  for (const target of plan.specialistOutputs) {
    const canonicalPath = path.join(stageRoot, target.canonicalRelPath);
    if (!(await fs.pathExists(canonicalPath))) {
      errors.push(`missing specialist source ${target.canonicalRelPath}`);
      continue;
    }
    const transformed = SpecialistTransformer.transform(
      {
        name: path.basename(path.dirname(target.canonicalRelPath)),
        content: await fs.readFile(canonicalPath, "utf8"),
      },
      target.agentId,
    );
    if (!transformed) {
      errors.push(`cannot derive expected specialist export ${target.relPath}`);
      continue;
    }
    await compareOwnedOutput(
      target.relPath,
      Buffer.from(transformed.content, "utf8"),
      "specialist export",
    );
  }

  for (const ruleFile of plan.ruleFiles) {
    if (!(await fs.pathExists(path.join(stageRoot, ruleFile)))) {
      errors.push(`missing agent rule wrapper ${ruleFile}`);
    }
  }

  return errors;
}

/**
 * Copies source directory to stage excluding top-level .git, .agent, artifacts,
 * node_modules, and preserves complete mirror inventory. Nested directories with
 * those names (e.g. skills/x/artifacts/) are ordinary content and stay staged.
 */
export async function copySourceToStage(
  srcDir: string,
  destDir: string,
): Promise<void> {
  const excludePatterns = [".git", ".agent", "artifacts", "node_modules"];

  await fs.ensureDir(destDir);
  await fs.copy(srcDir, destDir, {
    filter: (src: string) => {
      const rel = path.relative(srcDir, src);
      if (!rel) return true;
      const topLevel = rel.split(path.sep)[0];
      return !excludePatterns.includes(topLevel);
    },
    dereference: false,
    preserveTimestamps: true,
  });
}

/**
 * Explicitly links existing node_modules from repoRoot into staged directory
 * so dependencies are reused without npm/pnpm install in the temporary stage.
 */
export async function linkDependencies(
  repoRoot: string,
  stageDir: string,
): Promise<void> {
  const rootNodeModules = path.join(repoRoot, "node_modules");
  const stageNodeModules = path.join(stageDir, "node_modules");

  if (await fs.pathExists(rootNodeModules)) {
    if (!(await fs.pathExists(stageNodeModules))) {
      await fs.symlink(rootNodeModules, stageNodeModules, "junction");
    }
  }

  const cliNodeModules = path.join(repoRoot, "cli", "node_modules");
  const stageCliNodeModules = path.join(stageDir, "cli", "node_modules");
  if (await fs.pathExists(cliNodeModules)) {
    await fs.ensureDir(path.join(stageDir, "cli"));
    if (!(await fs.pathExists(stageCliNodeModules))) {
      await fs.symlink(cliNodeModules, stageCliNodeModules, "junction");
    }
  }
}

/**
 * Runs an isolated command inside a stage working directory.
 * Compatible with Node 20 (no Promise.withResolvers).
 */
export function runInStage(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, CI: "true" },
      shell: false,
    });

    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    child.on("close", (code: number | null) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
    child.on("error", (err: Error) => {
      stderr += `\nProcess error: ${err.message}`;
      resolve({ exitCode: 1, stdout, stderr });
    });
  });
}

async function runProcess(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ code: number; stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false });
    const stdout: Buffer[] = [];
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) =>
      resolve({ code: code ?? 1, stdout: Buffer.concat(stdout), stderr }),
    );
  });
}

function assertSafeDeclaredPath(relPath: string): void {
  if (
    path.posix.isAbsolute(relPath) ||
    relPath.split("/").some((part) => !part || part === "." || part === "..") ||
    relPath.includes("\\")
  ) {
    throw new Error(`Unsafe declared output path "${relPath}".`);
  }
}

interface GitFileEntry {
  mode: string;
  objectId: string;
}

async function gitTreeEntry(
  repoRoot: string,
  treeish: string,
  relPath: string,
): Promise<GitFileEntry | null> {
  const result = await runProcess(
    "git",
    ["ls-tree", "-z", treeish, "--", relPath],
    repoRoot,
  );
  if (result.code !== 0) {
    throw new Error(`Cannot inspect Git tree "${treeish}": ${result.stderr}`);
  }
  const records = result.stdout.toString("utf8").split("\0").filter(Boolean);
  if (records.length === 0) return null;
  if (records.length !== 1) {
    throw new Error(`Git tree has ambiguous entries for "${relPath}".`);
  }
  const [metadata = "", indexedPath = ""] = records[0].split("\t", 2);
  const [mode = "", type = "", objectId = ""] = metadata.split(" ");
  if (
    indexedPath !== relPath ||
    type !== "blob" ||
    (mode !== "100644" && mode !== "100755") ||
    !/^[0-9a-f]{40,64}$/.test(objectId)
  ) {
    return null;
  }
  return { mode, objectId };
}

async function gitIndexEntry(
  repoRoot: string,
  relPath: string,
): Promise<GitFileEntry | null> {
  const result = await runProcess(
    "git",
    ["ls-files", "--stage", "-z", "--", relPath],
    repoRoot,
  );
  if (result.code !== 0) {
    throw new Error(
      `Cannot inspect Git index for "${relPath}": ${result.stderr}`,
    );
  }
  const records = result.stdout.toString("utf8").split("\0").filter(Boolean);
  if (records.length === 0) return null;
  if (records.length !== 1) {
    throw new Error(`Git index has ambiguous stages for "${relPath}".`);
  }
  const [metadata = "", indexedPath = ""] = records[0].split("\t", 2);
  const [mode = "", objectId = "", stage = ""] = metadata.split(" ");
  if (
    indexedPath !== relPath ||
    stage !== "0" ||
    (mode !== "100644" && mode !== "100755") ||
    !/^[0-9a-f]{40,64}$/.test(objectId)
  ) {
    return null;
  }
  return { mode, objectId };
}

async function gitBlob(
  repoRoot: string,
  base: string,
  relPath: string,
): Promise<Buffer> {
  assertSafeDeclaredPath(relPath);
  const treeEntry = await gitTreeEntry(repoRoot, base, relPath);
  if (!treeEntry) {
    throw new Error(
      `Base ${base} does not contain tracked regular output "${relPath}".`,
    );
  }
  const blob = await runProcess(
    "git",
    ["cat-file", "blob", treeEntry.objectId],
    repoRoot,
  );
  if (blob.code !== 0) {
    throw new Error(`Cannot read base blob "${relPath}": ${blob.stderr}`);
  }
  return blob.stdout;
}

async function gitBlobForEntry(
  repoRoot: string,
  entry: GitFileEntry,
): Promise<Buffer> {
  const blob = await runProcess(
    "git",
    ["cat-file", "blob", entry.objectId],
    repoRoot,
  );
  if (blob.code !== 0) {
    throw new Error(
      `Cannot read Git index blob ${entry.objectId}: ${blob.stderr}`,
    );
  }
  return blob.stdout;
}

interface GitPathIdentity {
  tree: GitFileEntry | null;
  index: GitFileEntry | null;
}

interface GitInvocationIdentity {
  head: string | null;
  paths: Map<string, GitPathIdentity>;
}

function sameGitEntry(
  left: GitFileEntry | null,
  right: GitFileEntry | null,
): boolean {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left.mode === right.mode &&
      left.objectId === right.objectId)
  );
}

interface GitTreeRecord extends GitFileEntry {
  type: string;
}

interface GitIndexRecord extends GitFileEntry {
  stage: string;
}

/**
 * One read-only view of the immutable HEAD tree plus the live index.
 * Both listings are complete and NUL-delimited, so requested paths are filtered
 * in memory instead of being passed to Git as escaped pathspecs.
 */
interface GitListingSnapshot {
  treeRecords: Map<string, GitTreeRecord[]>;
  indexRecords: Map<string, GitIndexRecord[]>;
  /** Count of index records nested below each directory-shaped prefix. */
  indexPrefixCounts: Map<string, number>;
}

/** Splits at the FIRST tab so tabs inside a path stay part of the path. */
function splitGitListingRecord(record: string): {
  metadata: string;
  indexedPath: string;
} {
  const tab = record.indexOf("\t");
  if (tab < 0) return { metadata: "", indexedPath: "" };
  return {
    metadata: record.slice(0, tab),
    indexedPath: record.slice(tab + 1),
  };
}

async function captureGitListingSnapshot(
  repoRoot: string,
  treeish: string | null,
): Promise<GitListingSnapshot> {
  const treeRecords = new Map<string, GitTreeRecord[]>();
  if (treeish) {
    const tree = await runProcess(
      "git",
      ["ls-tree", "-r", "-z", treeish],
      repoRoot,
    );
    if (tree.code !== 0) {
      throw new Error(`Cannot inspect Git tree "${treeish}": ${tree.stderr}`);
    }
    const treeListing = tree.stdout
      .toString("utf8")
      .split("\0")
      .filter(Boolean);
    for (const record of treeListing) {
      const { metadata, indexedPath } = splitGitListingRecord(record);
      if (!indexedPath) continue;
      const [mode = "", type = "", objectId = ""] = metadata.split(" ");
      const entries = treeRecords.get(indexedPath) ?? [];
      entries.push({ mode, type, objectId });
      treeRecords.set(indexedPath, entries);
    }
  }

  const index = await runProcess(
    "git",
    ["ls-files", "--stage", "-z"],
    repoRoot,
  );
  if (index.code !== 0) {
    throw new Error(`Cannot inspect Git index: ${index.stderr}`);
  }
  const indexListing = index.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const indexRecords = new Map<string, GitIndexRecord[]>();
  for (const record of indexListing) {
    const { metadata, indexedPath } = splitGitListingRecord(record);
    if (!indexedPath) continue;
    const [mode = "", objectId = "", stage = ""] = metadata.split(" ");
    const entries = indexRecords.get(indexedPath) ?? [];
    entries.push({ mode, objectId, stage });
    indexRecords.set(indexedPath, entries);
  }

  // Reproduce the old pathspec behavior for a requested directory path, which
  // matched its children's RECORDS (including every unmerged stage) instead of
  // the directory itself. Counting records, not distinct paths, preserves the
  // old ambiguity for a directory prefix with one path carrying several stages.
  const indexPrefixCounts = new Map<string, number>();
  for (const [indexedPath, records] of indexRecords) {
    let slash = indexedPath.indexOf("/");
    while (slash !== -1) {
      const prefix = indexedPath.slice(0, slash);
      indexPrefixCounts.set(
        prefix,
        (indexPrefixCounts.get(prefix) ?? 0) + records.length,
      );
      slash = indexedPath.indexOf("/", slash + 1);
    }
  }

  return { treeRecords, indexRecords, indexPrefixCounts };
}

function gitTreeEntryFromSnapshot(
  snapshot: GitListingSnapshot,
  relPath: string,
): GitFileEntry | null {
  const records = snapshot.treeRecords.get(relPath);
  if (!records || records.length === 0) return null;
  if (records.length !== 1) {
    throw new Error(`Git tree has ambiguous entries for "${relPath}".`);
  }
  const record = records[0];
  if (
    record.type !== "blob" ||
    (record.mode !== "100644" && record.mode !== "100755") ||
    !/^[0-9a-f]{40,64}$/.test(record.objectId)
  ) {
    return null;
  }
  return { mode: record.mode, objectId: record.objectId };
}

function gitIndexEntryFromSnapshot(
  snapshot: GitListingSnapshot,
  relPath: string,
): GitFileEntry | null {
  const records = snapshot.indexRecords.get(relPath);
  if (!records || records.length === 0) {
    const nested = snapshot.indexPrefixCounts.get(relPath) ?? 0;
    if (nested > 1) {
      throw new Error(`Git index has ambiguous stages for "${relPath}".`);
    }
    return null;
  }
  if (records.length !== 1) {
    throw new Error(`Git index has ambiguous stages for "${relPath}".`);
  }
  const record = records[0];
  if (
    record.stage !== "0" ||
    (record.mode !== "100644" && record.mode !== "100755") ||
    !/^[0-9a-f]{40,64}$/.test(record.objectId)
  ) {
    return null;
  }
  return { mode: record.mode, objectId: record.objectId };
}

async function currentGitHead(repoRoot: string): Promise<string | null> {
  const result = await runProcess(
    "git",
    ["rev-parse", "--verify", "HEAD"],
    repoRoot,
  );
  return result.code === 0 ? result.stdout.toString("utf8").trim() : null;
}

async function captureGitInvocationIdentity(
  repoRoot: string,
  relPaths: string[],
): Promise<GitInvocationIdentity | null> {
  const root = await runProcess(
    "git",
    ["rev-parse", "--show-toplevel"],
    repoRoot,
  );
  if (root.code !== 0) return null;
  if ((await physicalPath(root.stdout.toString("utf8").trim())) !== repoRoot) {
    throw new Error("Git root differs from the authorized repository root.");
  }
  const head = await currentGitHead(repoRoot);
  const snapshot = await captureGitListingSnapshot(repoRoot, head);
  const paths = new Map<string, GitPathIdentity>();
  for (const relPath of relPaths) {
    paths.set(relPath, {
      tree: gitTreeEntryFromSnapshot(snapshot, relPath),
      index: gitIndexEntryFromSnapshot(snapshot, relPath),
    });
  }
  return { head, paths };
}

async function assertGitInvocationIdentity(
  repoRoot: string,
  identity: GitInvocationIdentity | null,
  relPaths: string[],
): Promise<void> {
  if (!identity) return;
  const head = await currentGitHead(repoRoot);
  if (head !== identity.head) {
    throw new Error(
      "Git HEAD changed during generation; refusing publication.",
    );
  }
  const snapshot = await captureGitListingSnapshot(repoRoot, identity.head);
  for (const relPath of relPaths) {
    const expected = identity.paths.get(relPath);
    if (!expected) {
      throw new Error(`Missing Git snapshot identity for "${relPath}".`);
    }
    const actualTree = gitTreeEntryFromSnapshot(snapshot, relPath);
    const actualIndex = gitIndexEntryFromSnapshot(snapshot, relPath);
    if (
      !sameGitEntry(expected.tree, actualTree) ||
      !sameGitEntry(expected.index, actualIndex)
    ) {
      throw new Error(
        `Git tree/index identity drifted for "${relPath}"; refusing publication.`,
      );
    }
  }
}

async function assertNoSymlinksRecursively(rootDir: string): Promise<void> {
  const visit = async (absolute: string, relative: string): Promise<void> => {
    for (const entry of await fs.readdir(absolute, { withFileTypes: true })) {
      const child = path.join(absolute, entry.name);
      const childRelative = path.posix.join(relative, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(
          `Adoption snapshot contains symlink "${childRelative}".`,
        );
      }
      if (entry.isDirectory()) await visit(child, childRelative);
      else if (!entry.isFile()) {
        throw new Error(
          `Adoption snapshot contains non-regular entry "${childRelative}".`,
        );
      }
    }
  };
  await visit(rootDir, "");
}

async function prepareBaseProofInputs(
  snapshotRoot: string,
  oldPlan: GenerationPlan,
  outputPaths: string[],
): Promise<void> {
  const clearableOutputs = new Set([
    ...oldPlan.canonicalCategoryIndexes.map((item) => item.relPath),
    ...oldPlan.hostCategoryIndexes.map((item) => item.relPath),
    ...oldPlan.mirrorFiles.map((item) => item.relPath),
    ...oldPlan.ruleFiles,
    ...oldPlan.workflowOutputs.map((item) => item.relPath),
    ...oldPlan.specialistOutputs.map((item) => item.relPath),
    "skills/index.json",
    "docs/agent-capabilities.md",
  ]);
  const markerStart = "<!-- SKILLS_INDEX_START -->";
  const markerEnd = "<!-- SKILLS_INDEX_END -->";
  for (const relPath of outputPaths) {
    if (clearableOutputs.has(relPath)) continue;
    if (relPath === "skills/metadata.json") continue;
    if (relPath === "AGENTS.md" || relPath === "server/AGENTS.md") {
      if (oldPlan.targetAgents.length === 0) {
        throw new Error(
          `Adoption refused for "${relPath}": pinned-base producer has no configured agent index phase.`,
        );
      }
      const filePath = path.join(snapshotRoot, relPath);
      const content = await fs.readFile(filePath, "utf8");
      const start = content.indexOf(markerStart);
      const end = content.indexOf(markerEnd);
      if (start < 0 || end < 0 || start >= end) {
        throw new Error(
          `Adoption refused for "${relPath}": pinned-base producer cannot prove a writable generated section.`,
        );
      }
      const prefix = content.slice(0, start + markerStart.length);
      const suffix = content.slice(end);
      await fs.writeFile(
        filePath,
        `${prefix}\n<!-- AGS-BASE-PROOF:${relPath} -->\n${suffix}`,
      );
      continue;
    }
    if (relPath === "skills/README.md") {
      const filePath = path.join(snapshotRoot, relPath);
      const content = await fs.readFile(filePath, "utf8");
      const start = content.indexOf(markerStart);
      const end = content.indexOf(markerEnd);
      if (start < 0 || end < 0 || start >= end) {
        throw new Error(
          `Adoption refused for "${relPath}": pinned-base producer cannot prove a writable generated section.`,
        );
      }
      await fs.writeFile(
        filePath,
        `${content.slice(0, end)}\n<!-- AGS-BASE-PROOF:${relPath} -->\n${content.slice(end)}`,
      );
      continue;
    }
    if (relPath === "README.md" || relPath === "cli/README.md") {
      const filePath = path.join(snapshotRoot, relPath);
      const lines = (await fs.readFile(filePath, "utf8")).split("\n");
      const metadata = (await fs.readJson(
        path.join(snapshotRoot, "skills/metadata.json"),
      )) as {
        categories?: Record<string, { version?: unknown }>;
      };
      const badgeCategories = Object.entries(metadata.categories ?? {});
      let poisoned = false;
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        for (const [category, details] of badgeCategories) {
          if (
            !details ||
            typeof details !== "object" ||
            Array.isArray(details) ||
            typeof details.version !== "string" ||
            details.version.length === 0 ||
            !new RegExp(`^\\[!\\[${category}\\]`).test(line)
          ) {
            continue;
          }
          const badge = line.replace(
            new RegExp(`${category}-v\\d+\\.\\d+\\.\\d+`, "g"),
            `${category}-v0.0.0`,
          );
          if (badge !== line) {
            lines[i] = badge;
            poisoned = true;
          }
        }
        const cells = lines[i].split("|");
        const firstCell = cells[1]?.trim() ?? "";
        if (
          cells.length >= 8 &&
          /^\*\*[^*]+\*\*$/.test(firstCell) &&
          firstCell.toLowerCase() !== "**stack**"
        ) {
          for (const index of [3, 4, 6, 7]) {
            cells[index] = " AGS-BASE-PROOF ";
          }
          lines[i] = cells.join("|");
          poisoned = true;
        }
      }
      if (!poisoned) {
        throw new Error(
          `Adoption refused for "${relPath}": pinned-base producer has no independently poisonable metrics section.`,
        );
      }
      await fs.writeFile(filePath, lines.join("\n"));
      continue;
    }
  }
  if (outputPaths.includes("skills/metadata.json")) {
    const metadataPath = path.join(snapshotRoot, "skills/metadata.json");
    const metadata = (await fs.readJson(metadataPath)) as {
      categories?: Record<string, Record<string, unknown>>;
    };
    if (!metadata.categories || typeof metadata.categories !== "object") {
      throw new Error(
        'Adoption refused for "skills/metadata.json": pinned-base producer input has no categories map.',
      );
    }
    for (const [category, value] of Object.entries(metadata.categories)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(
          `Adoption refused for "skills/metadata.json": invalid pinned-base category "${category}".`,
        );
      }
      value.token_metrics = { __ags_base_proof__: category };
    }
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });
  }

  for (const relPath of clearableOutputs) {
    const outputPath = path.join(snapshotRoot, relPath);
    const stat = await fs.lstat(outputPath).catch(() => null);
    if (!stat) continue;
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`Pinned-base output "${relPath}" is not a regular file.`);
    }
    await fs.remove(outputPath);
  }
  await fs.remove(path.join(snapshotRoot, ".skills-lock.json"));
}

interface BaseOutputProof {
  /** Full immutable base blob digest. */
  sha256: string;
  /** Full current worktree digest captured when the field scope was proved. */
  currentSha256: string;
  /** Present only for metadata's field-scoped adoption proof. */
  scopeSha256?: string;
}

async function proveBaseProducerOutputs(
  repoRoot: string,
  base: string,
  outputPaths: string[],
  appendLog: (text: string) => Promise<void>,
): Promise<Map<string, BaseOutputProof>> {
  const baselineRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ags-base-"));
  let failed = false;
  try {
    const archivePath = path.join(baselineRoot, "source.tar");
    const snapshotRoot = path.join(baselineRoot, "snapshot");
    await fs.ensureDir(snapshotRoot);
    const archive = await runProcess(
      "git",
      ["archive", "--format=tar", "-o", archivePath, base],
      repoRoot,
    );
    if (archive.code !== 0) {
      throw new Error(
        `Cannot archive adoption base ${base}: ${archive.stderr}`,
      );
    }
    const extract = await runProcess(
      "tar",
      ["-xf", archivePath, "-C", snapshotRoot],
      repoRoot,
    );
    if (extract.code !== 0) {
      throw new Error(`Cannot unpack adoption base ${base}: ${extract.stderr}`);
    }
    await assertNoSymlinksRecursively(snapshotRoot);
    const oldPlan = await buildGenerationPlan(snapshotRoot);
    const oldDeclared = new Set(oldPlan.declaredFiles);
    for (const relPath of outputPaths) {
      assertSafeDeclaredPath(relPath);
      if (!oldDeclared.has(relPath)) {
        throw new Error(
          `Adoption refused for "${relPath}": pinned-base producer did not declare this output.`,
        );
      }
    }
    for (const configPath of CONFIG_FILE_CANDIDATES) {
      const currentPath = path.join(repoRoot, configPath);
      const currentExists = await fs.pathExists(currentPath);
      const baseEntry = await gitTreeEntry(repoRoot, base, configPath);
      const indexEntry = await gitIndexEntry(repoRoot, configPath);
      if (
        currentExists !== Boolean(baseEntry) ||
        Boolean(indexEntry) !== Boolean(baseEntry) ||
        (baseEntry &&
          indexEntry &&
          (indexEntry.mode !== baseEntry.mode ||
            indexEntry.objectId !== baseEntry.objectId))
      ) {
        throw new Error(
          `Adoption refused: source/custom-overrides mismatch at "${configPath}".`,
        );
      }
      if (currentExists) {
        const currentStat = await fs.lstat(currentPath);
        if (!currentStat.isFile() || currentStat.isSymbolicLink()) {
          throw new Error(
            `Adoption config "${configPath}" is not a regular file.`,
          );
        }
        if (
          !(await fs.readFile(currentPath)).equals(
            await gitBlob(repoRoot, base, configPath),
          )
        ) {
          throw new Error(
            `Adoption refused: source/custom-overrides mismatch at "${configPath}".`,
          );
        }
      }
    }
    await linkDependencies(repoRoot, snapshotRoot);

    await prepareBaseProofInputs(snapshotRoot, oldPlan, outputPaths);

    for (const phase of [
      "scripts/calculate-tokens.ts",
      "scripts/generate-indices.ts",
      "scripts/generate-capabilities-doc.ts",
    ]) {
      const result = await runInStage(
        "node",
        ["--import", "tsx", path.join(snapshotRoot, phase)],
        snapshotRoot,
      );
      if (result.exitCode !== 0) {
        throw new Error(
          `Prior producer ${phase} failed for base ${base}: ${result.stderr || result.stdout}`,
        );
      }
    }

    const baseOutputProofs = new Map<string, BaseOutputProof>();
    for (const relPath of outputPaths) {
      const baseEntry = await gitTreeEntry(repoRoot, base, relPath);
      const indexEntry = await gitIndexEntry(repoRoot, relPath);
      if (!baseEntry || !indexEntry) {
        throw new Error(
          `Adoption refused for "${relPath}": current index or recorded base lacks a regular output.`,
        );
      }
      const baseBytes = await gitBlob(repoRoot, base, relPath);
      const currentPath = path.join(repoRoot, relPath);
      const currentStat = await fs.lstat(currentPath).catch(() => null);
      if (!currentStat?.isFile() || currentStat.isSymbolicLink()) {
        throw new Error(
          `Adoption target "${relPath}" is not a tracked regular file.`,
        );
      }
      const currentBytes = await fs.readFile(currentPath);
      const generatedPath = path.join(snapshotRoot, relPath);
      const stat = await fs.lstat(generatedPath).catch(() => null);
      if (!stat?.isFile() || stat.isSymbolicLink()) {
        throw new Error(
          `Prior producer did not create regular output "${relPath}".`,
        );
      }
      const produced = await fs.readFile(generatedPath);
      if (relPath === "skills/metadata.json") {
        if (indexEntry.mode !== baseEntry.mode) {
          throw new Error(
            'Adoption refused for "skills/metadata.json": Git index mode differs from the recorded base.',
          );
        }
        const baseScope = tokenMetricsDigest(
          parseMetadataDocument(baseBytes, "Pinned-base skills/metadata.json"),
        );
        const producedScope = tokenMetricsDigest(
          parseMetadataDocument(produced, "Pinned-base producer metadata"),
        );
        const currentScope = tokenMetricsDigest(
          parseMetadataDocument(currentBytes, "Current skills/metadata.json"),
        );
        const indexScope = tokenMetricsDigest(
          parseMetadataDocument(
            await gitBlobForEntry(repoRoot, indexEntry),
            "Git index skills/metadata.json",
          ),
        );
        if (
          baseScope !== producedScope ||
          currentScope !== producedScope ||
          indexScope !== producedScope
        ) {
          throw new Error(
            'Adoption refused for "skills/metadata.json": pinned-base, worktree, and Git index token_metrics projections must match.',
          );
        }
        baseOutputProofs.set(relPath, {
          sha256: sha256(baseBytes),
          currentSha256: sha256(currentBytes),
          scopeSha256: producedScope,
        });
        continue;
      }
      if (
        indexEntry.mode !== baseEntry.mode ||
        indexEntry.objectId !== baseEntry.objectId
      ) {
        throw new Error(
          `Adoption refused for "${relPath}": current index is untracked or differs from the recorded base.`,
        );
      }
      if (!currentBytes.equals(baseBytes)) {
        throw new Error(
          `Adoption refused for "${relPath}": current bytes do not match the recorded base blob.`,
        );
      }
      if (!produced.equals(baseBytes)) {
        throw new Error(
          `Pinned-base producer output differs from base blob for "${relPath}"; adoption refused.`,
        );
      }
      baseOutputProofs.set(relPath, {
        sha256: sha256(baseBytes),
        currentSha256: sha256(currentBytes),
      });
    }
    await appendLog(
      `Pinned-base producer outputs reconstructed and verified for ${outputPaths.length} paths at ${base}.\n`,
    );
    return baseOutputProofs;
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      await fs.remove(baselineRoot);
    } catch (cleanupError) {
      if (!failed) throw cleanupError;
    }
  }
}

function outputOwnership(
  relPath: string,
  plan: GenerationPlan,
): GenerationEntry {
  if (relPath === "skills/metadata.json") {
    return { source: "index:skills/metadata.json", sha256: "" };
  }
  const mirror = plan.mirrorFiles.find((item) => item.relPath === relPath);
  if (mirror) return { source: `skill:${mirror.sourceSkillId}`, sha256: "" };
  const workflow = plan.workflowOutputs.find(
    (item) => item.relPath === relPath,
  );
  if (workflow) {
    return { source: `workflow:${workflow.sourceRelPath}`, sha256: "" };
  }
  const specialist = plan.specialistOutputs.find(
    (item) => item.relPath === relPath,
  );
  if (specialist) {
    return {
      source: `specialist:${specialist.canonicalRelPath}`,
      sha256: "",
    };
  }
  const isBridge = plan.ruleFiles.includes(relPath);
  return {
    source: `${isBridge ? "bridge" : "index"}:${relPath}`,
    sha256: "",
  };
}

function ruleAgentForPath(
  relPath: string,
  plan: GenerationPlan,
): Agent | undefined {
  return plan.targetAgents.find((agentId) => {
    const definition = findAgentDefinition(agentId);
    if (!definition) return false;
    const expected = toPosix(
      path.normalize(
        path.join(
          definition.ruleFile,
          definition.ruleFileName ||
            `agent-skill-standard-rule${definition.ruleExtension}`,
        ),
      ),
    );
    return expected === relPath;
  });
}

function cliOutputOwnership(
  relPath: string,
  plan: GenerationPlan,
): Omit<ManifestEntry, "sha256"> {
  const mirror = plan.mirrorFiles.find((item) => item.relPath === relPath);
  if (mirror) {
    const agent = SUPPORTED_AGENTS.find((item) =>
      relPath.startsWith(`${item.path}/`),
    );
    if (!agent) throw new Error(`No host owns mirrored output "${relPath}".`);
    const [category, skill] = mirror.sourceSkillId.split("/");
    return {
      owner: "skill",
      source: `skill:${category}/${skill}@${plan.skillRefs[category] ?? "main"}`,
      agent: agent.id,
    };
  }
  const workflow = plan.workflowOutputs.find(
    (item) => item.relPath === relPath,
  );
  if (workflow) {
    return {
      owner: "workflow",
      source: `workflow:${path.posix.basename(workflow.sourceRelPath).replace(/\.md$/, "")}`,
      agent: workflow.agentId,
    };
  }
  const specialist = plan.specialistOutputs.find(
    (item) => item.relPath === relPath,
  );
  if (specialist) {
    return {
      owner: "specialist",
      source: `specialist:${path.posix.basename(path.posix.dirname(specialist.canonicalRelPath))}`,
      agent: specialist.agentId,
    };
  }
  const ruleAgent = ruleAgentForPath(relPath, plan);
  if (ruleAgent && ruleAgent !== Agent.Claude) {
    return { owner: "bridge", source: `bridge:${ruleAgent}`, agent: ruleAgent };
  }
  const hostIndex = plan.hostCategoryIndexes.find(
    (item) => item.relPath === relPath,
  );
  if (hostIndex) {
    const agent = SUPPORTED_AGENTS.find((item) =>
      relPath.startsWith(`${item.path}/`),
    );
    if (!agent) throw new Error(`No host owns index output "${relPath}".`);
    return {
      owner: "index",
      source: `index:${hostIndex.category}`,
      agent: agent.id,
    };
  }
  throw new Error(`No CLI producer owns generated output "${relPath}".`);
}

function isCliManagedOutputPath(
  relPath: string,
  plan: GenerationPlan,
): boolean {
  const ruleAgent = ruleAgentForPath(relPath, plan);
  return (
    plan.mirrorFiles.some((item) => item.relPath === relPath) ||
    plan.workflowOutputs.some((item) => item.relPath === relPath) ||
    plan.specialistOutputs.some((item) => item.relPath === relPath) ||
    (Boolean(ruleAgent) && ruleAgent !== Agent.Claude) ||
    plan.hostCategoryIndexes.some((item) => item.relPath === relPath)
  );
}
function isTrustedCliOutput(
  relPath: string,
  entry: ManifestEntry | undefined,
  plan: GenerationPlan,
): boolean {
  if (!entry || !isCliManagedOutputPath(relPath, plan)) return false;
  const expected = cliOutputOwnership(relPath, plan);
  return (
    entry.owner === expected.owner &&
    entry.source === expected.source &&
    entry.agent === expected.agent
  );
}

/**
 * Resolves the ordinary ownership entry a changed CLI-managed output must carry.
 *
 * The stage manifest is pre-seeded only for outputs that already exist before the
 * producers run. An absent planned specialist export is written by
 * `SpecialistSyncService` with its default passthrough writer, which emits the
 * transformed bytes without recording an ordinary manifest entry. Such a creation
 * is still a supported planned output, so its candidate metadata is derived from
 * the existing ownership factory plus the digest of the bytes that already passed
 * the exact `SpecialistTransformer` parity comparison. A present entry is never
 * replaced by derived metadata, and no other producer gains this fallback.
 */
function resolveChangedCliStageEntry(
  relPath: string,
  plan: GenerationPlan,
  stagedEntry: ManifestEntry | undefined,
  digest: string,
): ManifestEntry | null {
  if (stagedEntry) {
    return isTrustedCliOutput(relPath, stagedEntry, plan) &&
      stagedEntry.sha256 === digest
      ? stagedEntry
      : null;
  }
  if (!plan.specialistOutputs.some((item) => item.relPath === relPath)) {
    return null;
  }
  return { ...cliOutputOwnership(relPath, plan), sha256: digest };
}

async function readGenerationLock(
  repoRoot: string,
): Promise<SkillsLockFile | null> {
  const lockPath = path.join(repoRoot, ".skills-lock.json");
  if (!(await fs.pathExists(lockPath))) return null;
  const stat = await fs.lstat(lockPath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(
      "Refusing non-regular .skills-lock.json ownership manifest.",
    );
  }
  const raw = (await fs.readJson(lockPath)) as Partial<SkillsLockFile>;
  if (
    raw.version !== 2 ||
    !raw.entries ||
    typeof raw.entries !== "object" ||
    Array.isArray(raw.entries) ||
    !raw.sources ||
    typeof raw.sources !== "object"
  ) {
    throw new Error(
      "Existing .skills-lock.json is not a valid v2 ownership manifest.",
    );
  }
  for (const [relPath, entry] of Object.entries(raw.entries)) {
    assertSafeDeclaredPath(relPath);
    if (
      !entry ||
      !["skill", "workflow", "specialist", "bridge", "index"].includes(
        entry.owner,
      ) ||
      typeof entry.source !== "string" ||
      typeof entry.agent !== "string" ||
      !/^[0-9a-f]{64}$/i.test(entry.sha256)
    ) {
      throw new Error(
        `Existing .skills-lock.json has an invalid entry for "${relPath}".`,
      );
    }
  }
  const generation = parseGenerationLedger(raw.generation);
  return {
    ...(raw as SkillsLockFile),
    ...(generation ? { generation } : {}),
  };
}

function withSortedEntries(lock: SkillsLockFile): SkillsLockFile {
  const generation = parseGenerationLedger(lock.generation);
  return {
    ...lock,
    entries: Object.fromEntries(
      Object.keys(lock.entries)
        .sort()
        .map((key) => [key, lock.entries[key]]),
    ),
    ...(generation
      ? {
          generation: {
            version: 1,
            entries: Object.fromEntries(
              Object.keys(generation.entries)
                .sort()
                .map((key) => [key, generation.entries[key]]),
            ),
          },
        }
      : {}),
  };
}

function lockContentIdentity(lock: SkillsLockFile): string {
  const normalized = withSortedEntries(lock);
  return JSON.stringify({
    registry: normalized.registry,
    sources: normalized.sources,
    entries: normalized.entries,
    ...(normalized.generation ? { generation: normalized.generation } : {}),
    ...(normalized.disclosed ? { disclosed: normalized.disclosed } : {}),
  });
}

async function archiveAdoptions(
  logDir: string,
  base: string,
  repoRoot: string,
  paths: string[],
  baseProofs: Map<string, BaseOutputProof>,
): Promise<void> {
  const records: Array<{
    path: string;
    sha256: string;
    baseSha256: string;
    scopeSha256?: string;
  }> = [];
  for (const relPath of paths) {
    assertSafeDeclaredPath(relPath);
    const beforePath = path.join(repoRoot, relPath);
    const bytes = await fs.readFile(beforePath);
    const digest = sha256(bytes);
    const proof = baseProofs.get(relPath);
    if (!proof || digest !== proof.currentSha256) {
      throw new Error(
        `Adoption bytes changed before evidence capture: "${relPath}".`,
      );
    }
    const archivedPath = path.join(logDir, "adoption", "before", relPath);
    await fs.ensureDir(path.dirname(archivedPath));
    await fs.writeFile(archivedPath, bytes, { flag: "wx", mode: 0o444 });
    records.push({
      path: relPath,
      sha256: digest,
      baseSha256: proof.sha256,
      ...(proof.scopeSha256 ? { scopeSha256: proof.scopeSha256 } : {}),
    });
  }
  const proofPath = path.join(logDir, "adoption", "proof.json");
  await fs.writeJson(
    proofPath,
    { base, producer: "git archive + real generator phases", adopted: records },
    { spaces: 2, flag: "wx", mode: 0o444 },
  );
}

async function archivePublicationBeforeState(
  logDir: string,
  repoRoot: string,
  outputPaths: string[],
  baselineDigests: Map<string, string | null>,
  lockDigest: string | null,
): Promise<void> {
  const records: Array<{ path: string; sha256: string | null }> = [];
  for (const relPath of [...outputPaths, ".skills-lock.json"]) {
    const expected =
      relPath === ".skills-lock.json"
        ? lockDigest
        : (baselineDigests.get(relPath) ?? null);
    const actual = await currentDestinationDigest(repoRoot, relPath);
    if (actual !== expected) {
      throw new Error(
        `Destination "${relPath}" drifted before before-state archival.`,
      );
    }
    if (actual === null) {
      records.push({ path: relPath, sha256: null });
      continue;
    }
    const bytes = await fs.readFile(path.join(repoRoot, relPath));
    const digest = sha256(bytes);
    if (digest !== actual) {
      throw new Error(
        `Destination "${relPath}" changed during before-state archival.`,
      );
    }
    const archivePath = path.join(logDir, "publication-before", relPath);
    await fs.ensureDir(path.dirname(archivePath));
    await fs.writeFile(archivePath, bytes, { flag: "wx", mode: 0o444 });
    records.push({ path: relPath, sha256: digest });
  }
  await fs.writeJson(
    path.join(logDir, "publication-before", "proof.json"),
    { records },
    { spaces: 2, flag: "wx", mode: 0o444 },
  );
}

async function writeStageOwnership(
  stageRoot: string,
  currentLock: SkillsLockFile | null,
  plan: GenerationPlan,
): Promise<void> {
  const stagedLock = (await readGenerationLock(stageRoot)) ?? {
    version: 2 as const,
    registry: currentLock?.registry ?? "",
    generatedAt: currentLock?.generatedAt ?? new Date(0).toISOString(),
    sources: currentLock?.sources ?? {},
    entries: { ...(currentLock?.entries ?? {}) },
    ...(currentLock?.generation ? { generation: currentLock.generation } : {}),
    ...(currentLock?.disclosed ? { disclosed: currentLock.disclosed } : {}),
  };
  const entries = { ...stagedLock.entries };
  for (const relPath of plan.declaredFiles) {
    if (!isCliManagedOutputPath(relPath, plan)) continue;
    const digest = await fileSha256(path.join(stageRoot, relPath));
    if (!digest) continue;
    entries[relPath] = {
      ...cliOutputOwnership(relPath, plan),
      sha256: digest,
    };
  }
  await fs.writeJson(
    path.join(stageRoot, ".skills-lock.json"),
    withSortedEntries({ ...stagedLock, entries }),
    { spaces: 2 },
  );
}

async function updateStageMetadataOwnership(stageRoot: string): Promise<void> {
  const metadataPath = path.join(stageRoot, "skills/metadata.json");
  const bytes = await fs.readFile(metadataPath);
  const metadata = parseMetadataDocument(bytes, "Staged skills/metadata.json");
  const lock = (await readGenerationLock(stageRoot)) ?? {
    version: 2 as const,
    registry: "",
    generatedAt: new Date(0).toISOString(),
    sources: {},
    entries: {},
  };
  const generationEntries = { ...(lock.generation?.entries ?? {}) };
  generationEntries["skills/metadata.json"] = {
    source:
      generationEntries["skills/metadata.json"]?.source ??
      "index:skills/metadata.json",
    sha256: sha256(bytes),
    scope: {
      kind: "category-token-metrics",
      sha256: tokenMetricsDigest(metadata),
    },
  };
  await fs.writeJson(
    path.join(stageRoot, ".skills-lock.json"),
    withSortedEntries({
      ...lock,
      generation: { version: 1, entries: generationEntries },
    }),
    { spaces: 2 },
  );
}

async function prepareMetadataCandidate(
  stageRoot: string,
  activeBytes: Buffer | null,
): Promise<void> {
  const stagedPath = path.join(stageRoot, "skills/metadata.json");
  const generatedBytes = await fs.readFile(stagedPath);
  const generated = parseMetadataDocument(
    generatedBytes,
    "Token producer output skills/metadata.json",
  );
  if (!generatedBytes.equals(canonicalMetadataBytes(generated))) {
    throw new Error(
      "Token producer output skills/metadata.json is not canonical two-space JSON with a final newline.",
    );
  }
  if (!activeBytes) return;

  const active = parseMetadataDocument(
    activeBytes,
    "Current skills/metadata.json",
  );
  if (!metadataNonMetricsEqual(active, generated)) {
    throw new Error(
      "Token producer changed non-metric metadata; refusing to publish outside the category token_metrics scope.",
    );
  }
  if (tokenMetricsDigest(active) === tokenMetricsDigest(generated)) {
    await fs.writeFile(stagedPath, activeBytes);
    return;
  }
  if (!activeBytes.equals(canonicalMetadataBytes(active))) {
    throw new Error(
      "Token metrics changed but active skills/metadata.json is not canonical two-space JSON with a final newline; refusing reserialization.",
    );
  }
  await fs.writeFile(stagedPath, composeMetadataMetrics(active, generated));
}

function sourceKeysForChangedOutputs(
  changedPaths: string[],
  plan: GenerationPlan,
): Set<string> {
  const keys = new Set<string>();
  for (const relPath of changedPaths) {
    const mirror = plan.mirrorFiles.find((item) => item.relPath === relPath);
    if (mirror) {
      keys.add(`skills/${mirror.sourceSkillId.split("/")[0]}`);
      continue;
    }
    if (plan.workflowOutputs.some((item) => item.relPath === relPath)) {
      keys.add("workflows");
    } else if (
      plan.specialistOutputs.some((item) => item.relPath === relPath)
    ) {
      keys.add("specialists");
    }
  }
  return keys;
}

async function persistVerifiedOwnership(
  repoRoot: string,
  stageRoot: string,
  plan: GenerationPlan,
  ownershipPaths: string[],
  stagedDigests: Map<string, string | null>,
  resolvedCliEntries: Map<string, ManifestEntry>,
  previous: SkillsLockFile | null,
  stagedLock: SkillsLockFile | null,
  previousDigest: string | null,
  beforeRename: () => Promise<void>,
  onRenamed: () => void,
): Promise<boolean> {
  if (!previous && ownershipPaths.length === 0) return false;
  const generationEntries = { ...(previous?.generation?.entries ?? {}) };
  const entries = { ...(previous?.entries ?? {}) };
  for (const relPath of ownershipPaths) {
    const digest = stagedDigests.get(relPath);
    if (!digest)
      throw new Error(`Cannot record missing generated output "${relPath}".`);
    if (isCliManagedOutputPath(relPath, plan)) {
      // The validated candidate entry resolved before publication is the only
      // source of CLI ownership here; it is never re-derived after copy-back.
      const hostEntry = resolvedCliEntries.get(relPath);
      if (!hostEntry || hostEntry.sha256 !== digest) {
        throw new Error(
          `Staged host output "${relPath}" lacks matching CLI ownership metadata.`,
        );
      }
      entries[relPath] = hostEntry;
      delete generationEntries[relPath];
      continue;
    }
    const ownership = outputOwnership(relPath, plan);
    if (relPath === "skills/metadata.json") {
      const metadata = parseMetadataDocument(
        await fs.readFile(path.join(stageRoot, relPath)),
        "Staged skills/metadata.json",
      );
      ownership.scope = {
        kind: "category-token-metrics",
        sha256: tokenMetricsDigest(metadata),
      };
    }
    generationEntries[relPath] = { ...ownership, sha256: digest };
    delete entries[relPath];
  }

  const sources = { ...(previous?.sources ?? {}) };
  for (const sourceKey of sourceKeysForChangedOutputs(ownershipPaths, plan)) {
    const source = stagedLock?.sources[sourceKey];
    if (source) sources[sourceKey] = source;
  }
  const next = withSortedEntries({
    version: 2,
    registry: previous?.registry ?? stagedLock?.registry ?? "",
    generatedAt: new Date().toISOString(),
    sources,
    entries,
    ...(previous?.generation ||
    ownershipPaths.some((relPath) => !isCliManagedOutputPath(relPath, plan))
      ? { generation: { version: 1, entries: generationEntries } }
      : {}),
    ...((previous?.disclosed ?? stagedLock?.disclosed)
      ? { disclosed: previous?.disclosed ?? stagedLock?.disclosed }
      : {}),
  });
  if (previous && lockContentIdentity(previous) === lockContentIdentity(next)) {
    return false;
  }

  const lockPath = path.join(repoRoot, ".skills-lock.json");
  if (
    (await currentDestinationDigest(repoRoot, ".skills-lock.json")) !==
    previousDigest
  ) {
    throw new Error(
      "Ownership manifest drifted during publication; refusing lock update.",
    );
  }
  const tempPath = `${lockPath}.ags-tmp-${crypto.randomBytes(6).toString("hex")}`;
  let failed = false;
  try {
    await fs.writeJson(tempPath, next, { spaces: 2, flag: "wx" });
    const expectedBytes = await fs.readFile(tempPath);
    if (
      (await currentDestinationDigest(repoRoot, ".skills-lock.json")) !==
      previousDigest
    ) {
      throw new Error(
        "Ownership manifest drifted before atomic lock replacement.",
      );
    }
    await beforeRename();
    await fs.rename(tempPath, lockPath);
    onRenamed();
    const persistedBytes = await fs.readFile(lockPath);
    if (!persistedBytes.equals(expectedBytes)) {
      throw new Error(
        "Ownership manifest bytes differ after atomic replacement.",
      );
    }
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      await fs.remove(tempPath);
    } catch (cleanupError) {
      if (!failed) throw cleanupError;
    }
  }
  return true;
}

async function currentDestinationDigest(
  rootDir: string,
  relPath: string,
): Promise<string | null> {
  const fullPath = path.join(rootDir, relPath);
  if (!(await fs.pathExists(fullPath))) return null;
  const stats = await fs.lstat(fullPath);
  if (!stats.isFile()) {
    throw new Error(
      `Declared destination is not a regular file: "${fullPath}" is ${stats.isSymbolicLink() ? "a symlink" : "not a file"}`,
    );
  }
  return fileSha256(fullPath);
}

async function ensureOutputDirectoryChain(
  repoRoot: string,
  destinationParent: string,
  ownedDirectories: OwnedOutputDirectories,
): Promise<void> {
  const relativeParent = path.relative(repoRoot, destinationParent);
  if (
    path.isAbsolute(relativeParent) ||
    relativeParent === ".." ||
    relativeParent.startsWith(`..${path.sep}`)
  ) {
    throw new Error("Declared output parent escapes the repository root.");
  }
  let currentPath = repoRoot;
  for (const segment of relativeParent.split(path.sep).filter(Boolean)) {
    currentPath = path.join(currentPath, segment);
    let created = false;
    try {
      await fs.mkdir(currentPath);
      created = true;
    } catch (error: unknown) {
      if (errorCode(error) !== "EEXIST") throw error;
    }
    const relPath = path
      .relative(repoRoot, currentPath)
      .split(path.sep)
      .join("/");
    if (created) ownedDirectories.set(relPath, null);
    const stat = await fs.lstat(currentPath).catch((error: unknown) => {
      if (errorCode(error) === "ENOENT") return null;
      throw error;
    });
    if (!stat || stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`Output parent "${relPath}" is not a safe directory.`);
    }
    if (created) ownedDirectories.set(relPath, filesystemIdentity(stat));
  }
}

async function cleanupOwnedOutputDirectories(
  repoRoot: string,
  ownedDirectories: OwnedOutputDirectories,
): Promise<string[]> {
  const retained: string[] = [];
  const entries = Array.from(ownedDirectories.entries()).sort(
    ([left], [right]) => right.split("/").length - left.split("/").length,
  );
  for (const [relPath, identity] of entries) {
    const absolutePath = path.join(repoRoot, relPath);
    const stat = await fs.lstat(absolutePath).catch((error: unknown) => {
      if (errorCode(error) === "ENOENT") return null;
      throw error;
    });
    if (!stat) {
      ownedDirectories.delete(relPath);
      continue;
    }
    if (
      !identity ||
      stat.isSymbolicLink() ||
      !stat.isDirectory() ||
      filesystemIdentity(stat) !== identity
    ) {
      retained.push(`${relPath} (identity changed)`);
      continue;
    }
    if ((await fs.readdir(absolutePath)).length > 0) {
      retained.push(`${relPath} (nonempty)`);
      continue;
    }
    const beforeRemove = await fs.lstat(absolutePath);
    if (
      beforeRemove.isSymbolicLink() ||
      !beforeRemove.isDirectory() ||
      filesystemIdentity(beforeRemove) !== identity
    ) {
      retained.push(`${relPath} (identity changed before cleanup)`);
      continue;
    }
    try {
      await fs.rmdir(absolutePath);
      ownedDirectories.delete(relPath);
    } catch {
      retained.push(`${relPath} (could not remove empty directory)`);
    }
  }
  return retained;
}

async function cleanupPrivatePublicationTemp(
  directoryPath: string,
  directoryIdentity: string | null,
  filePath: string,
  fileIdentity: string | null,
  expectedDigest: string,
  fileCreated: boolean,
  fileVerified: boolean,
): Promise<void> {
  const directoryStat = await fs
    .lstat(directoryPath)
    .catch((error: unknown) => {
      if (errorCode(error) === "ENOENT") return null;
      throw error;
    });
  if (!directoryStat) return;
  if (
    !directoryIdentity ||
    directoryStat.isSymbolicLink() ||
    !directoryStat.isDirectory() ||
    filesystemIdentity(directoryStat) !== directoryIdentity
  ) {
    throw new Error(
      `Private publication directory changed identity: ${directoryPath}`,
    );
  }
  const entries = (await fs.readdir(directoryPath)).sort();
  if (fileCreated && entries.length > 0) {
    if (
      !fileVerified ||
      !fileIdentity ||
      entries.length !== 1 ||
      entries[0] !== path.basename(filePath)
    ) {
      throw new Error(
        `Private publication temp is not safe to clean: ${directoryPath}`,
      );
    }
    const fileStat = await fs.lstat(filePath);
    if (
      fileStat.isSymbolicLink() ||
      !fileStat.isFile() ||
      filesystemIdentity(fileStat) !== fileIdentity ||
      (await fileSha256(filePath)) !== expectedDigest
    ) {
      throw new Error(
        `Private publication temp changed before cleanup: ${filePath}`,
      );
    }
    await fs.unlink(filePath);
  } else if (!fileCreated && entries.length !== 0) {
    throw new Error(
      `Unverified private publication temp remains: ${directoryPath}`,
    );
  }
  if ((await fs.readdir(directoryPath)).length !== 0) {
    throw new Error(
      `Private publication directory is not empty: ${directoryPath}`,
    );
  }
  const beforeRemove = await fs.lstat(directoryPath);
  if (
    beforeRemove.isSymbolicLink() ||
    !beforeRemove.isDirectory() ||
    filesystemIdentity(beforeRemove) !== directoryIdentity
  ) {
    throw new Error(
      `Private publication directory changed before cleanup: ${directoryPath}`,
    );
  }
  await fs.rmdir(directoryPath);
}

/**
 * Publishes a staged file with a private same-filesystem temporary directory.
 * The rename effect is recorded immediately; cleanup never removes foreign paths.
 */
async function publishStagedFile(
  stageRoot: string,
  repoRoot: string,
  relPath: string,
  expectedDigest: string,
  ownedDirectories: OwnedOutputDirectories,
  privateTemps: Map<string, PrivatePublicationTemp>,
  beforeRename: () => Promise<void>,
  onRenamed: () => void,
): Promise<void> {
  const sourcePath = path.join(stageRoot, relPath);
  const destinationPath = path.join(repoRoot, relPath);
  await assertNoSymlinksUnderRoot(stageRoot, sourcePath);
  await assertNoSymlinksUnderRoot(repoRoot, destinationPath);

  const currentStageDigest = await fileSha256(sourcePath);
  if (currentStageDigest !== expectedDigest) {
    throw new Error(
      `Staged bytes for "${relPath}" changed after hashing (expected ${expectedDigest}, found ${currentStageDigest}). Aborting.`,
    );
  }

  const destinationParent = path.dirname(destinationPath);
  await ensureOutputDirectoryChain(
    repoRoot,
    destinationParent,
    ownedDirectories,
  );
  await assertNoSymlinksUnderRoot(repoRoot, destinationPath);
  let tempDirectoryPath: string | null = null;
  let tempDirectoryIdentity: string | null = null;
  let tempFilePath: string | null = null;
  let tempFileIdentity: string | null = null;
  let tempFileCreated = false;
  let tempFileVerified = false;
  let tempLease: PrivatePublicationTemp | null = null;
  let operationFailed = false;
  let operationError: unknown;

  try {
    tempDirectoryPath = await fs.mkdtemp(
      path.join(destinationParent, ".ags-tmp-"),
    );
    tempFilePath = path.join(tempDirectoryPath, "payload");
    const tempDirectoryStat = await fs.lstat(tempDirectoryPath);
    if (
      tempDirectoryStat.isSymbolicLink() ||
      !tempDirectoryStat.isDirectory()
    ) {
      throw new Error(
        `Private publication path is not a directory: ${tempDirectoryPath}`,
      );
    }
    tempDirectoryIdentity = filesystemIdentity(tempDirectoryStat);
    await fs.copyFile(sourcePath, tempFilePath, fs.constants.COPYFILE_EXCL);
    tempFileCreated = true;
    const copiedDirectoryStat = await fs.lstat(tempDirectoryPath);
    const tempFileStat = await fs.lstat(tempFilePath);
    tempFileIdentity = filesystemIdentity(tempFileStat);
    const tempDigest = await fileSha256(tempFilePath);
    if (
      copiedDirectoryStat.isSymbolicLink() ||
      !copiedDirectoryStat.isDirectory() ||
      filesystemIdentity(copiedDirectoryStat) !== tempDirectoryIdentity ||
      tempFileStat.isSymbolicLink() ||
      !tempFileStat.isFile() ||
      tempDigest !== expectedDigest
    ) {
      throw new Error(
        `Private atomic temp for "${relPath}" differs from the staged digest or identity.`,
      );
    }
    tempFileVerified = true;
    const directoryRelPath = path
      .relative(repoRoot, tempDirectoryPath)
      .split(path.sep)
      .join("/");
    const fileRelPath = path
      .relative(repoRoot, tempFilePath)
      .split(path.sep)
      .join("/");
    tempLease = {
      directoryRelPath,
      directoryIdentity: tempDirectoryIdentity,
      fileRelPath,
      fileIdentity: tempFileIdentity,
      digest: expectedDigest,
    };
    privateTemps.set(directoryRelPath, tempLease);
    await beforeRename();
    await assertPrivatePublicationTemp(repoRoot, tempLease);
    await fs.rename(tempFilePath, destinationPath);
    onRenamed();
    tempFileCreated = false;
    privateTemps.delete(directoryRelPath);
  } catch (error: unknown) {
    operationFailed = true;
    operationError = error;
  }

  if (tempDirectoryPath && tempFilePath) {
    try {
      await cleanupPrivatePublicationTemp(
        tempDirectoryPath,
        tempDirectoryIdentity,
        tempFilePath,
        tempFileIdentity,
        expectedDigest,
        tempFileCreated,
        tempFileVerified,
      );
      if (tempLease) privateTemps.delete(tempLease.directoryRelPath);
    } catch (cleanupError: unknown) {
      const detail = `Private publication temporary cleanup failed at "${tempDirectoryPath}": ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`;
      if (operationFailed) {
        operationError = new Error(
          `${operationError instanceof Error ? operationError.message : String(operationError)}; ${detail}`,
          { cause: operationError },
        );
      } else {
        operationFailed = true;
        operationError = new Error(detail, { cause: cleanupError });
      }
    }
  }
  if (operationFailed) throw operationError;

  const publishedDigest = await fileSha256(destinationPath);
  if (publishedDigest !== expectedDigest) {
    throw new Error(
      `Post-copy verification failed for "${relPath}": expected ${expectedDigest}, found ${publishedDigest}.`,
    );
  }
}

function pathsOverlap(left: string, right: string): boolean {
  const isAtOrBelow = (relativePath: string): boolean =>
    relativePath === "" ||
    (!path.isAbsolute(relativePath) &&
      relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`));
  return (
    isAtOrBelow(path.relative(left, right)) ||
    isAtOrBelow(path.relative(right, left))
  );
}

async function assertEvidenceDirectoryIsIsolated(
  repoRoot: string,
  logDir: string,
  plan: GenerationPlan | null,
): Promise<void> {
  const absoluteLogDir = path.resolve(logDir);
  let probePath = absoluteLogDir;
  while (true) {
    const probeStat = await fs.lstat(probePath).catch((error: unknown) => {
      if (errorCode(error) === "ENOENT") return null;
      throw error;
    });
    if (probeStat && (probeStat.isSymbolicLink() || !probeStat.isDirectory())) {
      throw new Error(
        `Evidence directory path has an unsafe existing ancestor "${probePath}".`,
      );
    }
    const parentPath = path.dirname(probePath);
    if (parentPath === probePath) break;
    probePath = parentPath;
  }
  const isAtOrBelow = (root: string, candidate: string): boolean => {
    const relative = path.relative(root, candidate);
    return (
      relative === "" ||
      (!path.isAbsolute(relative) &&
        relative !== ".." &&
        !relative.startsWith(`..${path.sep}`))
    );
  };
  const allowedEvidenceRoot = path.join(
    repoRoot,
    "artifacts",
    "generation-logs",
  );
  if (
    isAtOrBelow(repoRoot, absoluteLogDir) &&
    !isAtOrBelow(allowedEvidenceRoot, absoluteLogDir)
  ) {
    throw new Error(
      `Evidence directory "${absoluteLogDir}" must be outside the repository or under artifacts/generation-logs.`,
    );
  }
  const hashedInputs = [
    "skills",
    ".agents/workflows",
    "cli/src",
    "scripts",
    "docs/agent-capabilities.md",
    ...CONFIG_FILE_CANDIDATES,
    ...(plan?.declaredFiles ?? []),
    ".skills-lock.json",
  ];
  for (const entry of await fs.readdir(repoRoot)) {
    if (MIRRORED_ROOT_FILES.test(entry)) hashedInputs.push(entry);
  }
  for (const relPath of hashedInputs) {
    if (pathsOverlap(absoluteLogDir, path.join(repoRoot, relPath))) {
      throw new Error(
        `Evidence directory "${absoluteLogDir}" overlaps hashed input or output "${relPath}".`,
      );
    }
  }
}

/**
 * Seeds declared but absent mirror files into the throwaway stage from canonical
 * input, so index bootstrapping sees the complete selected package inventory.
 * Existing stage content is never overwritten.
 */
async function seedMissingStageMirrors(
  stageRoot: string,
  plan: GenerationPlan,
): Promise<number> {
  let seeded = 0;
  for (const mirror of plan.mirrorFiles) {
    if (mirror.transformed) continue;
    const destination = path.join(stageRoot, mirror.relPath);
    if (await fs.pathExists(destination)) continue;
    const source = path.join(stageRoot, mirror.canonicalRelPath);
    if (!(await fs.pathExists(source))) continue;
    await fs.ensureDir(path.dirname(destination));
    await fs.copyFile(source, destination, fs.constants.COPYFILE_EXCL);
    seeded += 1;
  }
  return seeded;
}

/**
 * Main coordinator for safe staged generation.
 */
export async function runIsolatedGeneration(
  options: IsolatedStageOptions,
): Promise<IsolatedStageResult> {
  const repoRoot = await physicalPath(options.repoRoot);
  const physicalCwd = await physicalPath(process.cwd());

  if (physicalCwd !== repoRoot) {
    throw new Error(
      `Refusing isolated generation from foreign working directory: cwd is "${physicalCwd}", repoRoot is "${repoRoot}".`,
    );
  }
  if (options.adoptBase && !/^[0-9a-f]{40,64}$/i.test(options.adoptBase)) {
    throw new Error("--adopt-base requires a full commit SHA.");
  }
  if (options.adoptBase && options.checkOnly) {
    throw new Error(
      "--adopt-base is apply-only; --check never adopts ownership.",
    );
  }

  const checkOnly = Boolean(options.checkOnly);
  const attemptId =
    options.attemptId ||
    `attempt-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}-${crypto.randomBytes(3).toString("hex")}`;
  if (!ATTEMPT_ID_PATTERN.test(attemptId)) {
    throw new Error(
      `Invalid attempt id "${attemptId}". Use letters, digits, dot, underscore or hyphen.`,
    );
  }

  let logDir = options.logDir;
  if (!logDir) {
    if (checkOnly) {
      // Check mode is read-only for the repository: evidence goes to a fresh
      // temp directory instead of an untracked path under artifacts/. The temp
      // root is resolved because the evidence guard rejects symlinked ancestors
      // (macOS /var -> private/var).
      logDir = path.join(
        await fs.realpath(os.tmpdir()),
        `ags-generation-check-${attemptId}`,
      );
      console.log(`[Isolated Generation Check] evidence directory: ${logDir}`);
    } else {
      logDir = path.join(repoRoot, "artifacts", "generation-logs", attemptId);
    }
  }
  let preflightPlan: GenerationPlan | null = null;
  let preflightPlanFailed = false;
  let preflightPlanError: unknown;
  try {
    await assertNoSourceSymlinks(repoRoot);
    preflightPlan = await buildGenerationPlan(repoRoot);
  } catch (error: unknown) {
    preflightPlanFailed = true;
    preflightPlanError = error;
  }
  await assertEvidenceDirectoryIsIsolated(repoRoot, logDir, preflightPlan);
  await fs.ensureDir(path.dirname(logDir));
  try {
    await fs.mkdir(logDir);
  } catch (err: unknown) {
    if (errorCode(err) === "EEXIST") {
      throw new Error(
        `Attempt directory already exists at "${logDir}". Refusing to reuse or overwrite prior attempt evidence.`,
      );
    }
    throw err;
  }

  const logPath = path.join(logDir, "generation.log");
  const receiptPath = path.join(logDir, "receipt.json");

  await fs.writeFile(
    logPath,
    `[Isolated Generation Run] attempt=${attemptId} checkOnly=${checkOnly}\n`,
    { flag: "wx" },
  );
  const appendLog = async (text: string): Promise<void> => {
    try {
      await fs.appendFile(logPath, text);
    } catch {
      // Logging failures must not replace the authoritative operation result.
    }
  };

  const staleFiles: string[] = [];
  const stagedDigests = new Map<string, string | null>();
  const resolvedCliEntries = new Map<string, ManifestEntry>();
  const appliedFiles: string[] = [];
  const verifiedFiles: string[] = [];
  const ownedOutputDirectories: OwnedOutputDirectories = new Map();
  const privatePublicationTemps = new Map<string, PrivatePublicationTemp>();
  let stageRoot: string | null = null;
  let currentLock: SkillsLockFile | null = null;
  let stagedLock: SkillsLockFile | null = null;
  let lockBaselineDigest: string | null = null;
  let baseProofs = new Map<string, BaseOutputProof>();
  let adoptionBase: string | null = null;
  let adoptedPaths: string[] = [];

  try {
    await assertNoSourceSymlinks(repoRoot);
    if (preflightPlanFailed) throw preflightPlanError;
    if (!preflightPlan) {
      throw new Error("Generation planning did not produce a plan.");
    }
    const plan = await buildGenerationPlan(repoRoot);
    if (!jsonValueEqual(preflightPlan, plan)) {
      throw new Error(
        "Generation plan changed while preparing evidence; refusing to continue.",
      );
    }
    await assertEvidenceDirectoryIsIsolated(repoRoot, logDir, plan);
    const categoryCheck = await validateCategorySelections(repoRoot);
    if (!categoryCheck.valid) {
      throw new Error(
        `Configured selections are invalid: ${categoryCheck.missing.join(", ")}`,
      );
    }
    const candidateInventory = await captureCandidateSourceInventory(
      repoRoot,
      plan,
    );

    for (const relPath of plan.declaredFiles) {
      assertSafeDeclaredPath(relPath);
      await assertNoSymlinksUnderRoot(repoRoot, path.join(repoRoot, relPath));
    }
    const baselineDigests = new Map<string, string | null>();
    for (const relPath of plan.declaredFiles) {
      baselineDigests.set(
        relPath,
        await currentDestinationDigest(repoRoot, relPath),
      );
    }
    const expectedDestinationDigests = new Map(baselineDigests);
    lockBaselineDigest = await currentDestinationDigest(
      repoRoot,
      ".skills-lock.json",
    );
    currentLock = await readGenerationLock(repoRoot);
    if (
      (await currentDestinationDigest(repoRoot, ".skills-lock.json")) !==
      lockBaselineDigest
    ) {
      throw new Error(
        "Ownership manifest changed while its baseline was captured.",
      );
    }
    const metadataDigest = baselineDigests.get("skills/metadata.json") ?? null;
    const metadataBaselineBytes =
      metadataDigest === null
        ? null
        : await fs.readFile(path.join(repoRoot, "skills/metadata.json"));
    if (
      metadataBaselineBytes &&
      sha256(metadataBaselineBytes) !== metadataDigest
    ) {
      throw new Error(
        "skills/metadata.json changed while its baseline was captured.",
      );
    }
    for (const relPath of plan.declaredFiles) {
      const digest = baselineDigests.get(relPath);
      if (digest === null || digest === undefined) continue;
      const previous = currentLock?.generation?.entries[relPath];
      const cliEntry = currentLock?.entries[relPath];
      if (previous && cliEntry) {
        throw new Error(
          `Output "${relPath}" has conflicting CLI and repository-generation ownership.`,
        );
      }
      if (previous) {
        const scopedMetadata =
          relPath === "skills/metadata.json" && previous.scope !== undefined;
        if (scopedMetadata) {
          const metadata = parseMetadataDocument(
            metadataBaselineBytes as Buffer,
            "Current skills/metadata.json",
          );
          if (tokenMetricsDigest(metadata) !== previous.scope?.sha256) {
            throw new Error(
              'Edited-owned output "skills/metadata.json" differs from its category token_metrics ownership digest; refusing publication.',
            );
          }
        } else if (previous.sha256 !== digest) {
          throw new Error(
            `Edited-owned output "${relPath}" differs from its repository-generation digest; refusing publication.`,
          );
        }
      } else if (
        isTrustedCliOutput(relPath, cliEntry, plan) &&
        cliEntry?.sha256 !== digest
      ) {
        throw new Error(
          `Edited-owned output "${relPath}" differs from its CLI ownership digest; refusing publication.`,
        );
      }
    }

    const unknownExisting = plan.declaredFiles.filter((relPath) => {
      const digest = baselineDigests.get(relPath);
      if (digest === null || digest === undefined) return false;
      if (currentLock?.generation?.entries[relPath]) return false;
      const cliEntry = currentLock?.entries[relPath];
      return (
        !isTrustedCliOutput(relPath, cliEntry, plan) ||
        cliEntry?.sha256 !== digest
      );
    });
    const gitIdentityPaths = Array.from(
      new Set([
        ...plan.declaredFiles,
        ...CONFIG_FILE_CANDIDATES,
        ".skills-lock.json",
      ]),
    );
    const gitIdentity = await captureGitInvocationIdentity(
      repoRoot,
      gitIdentityPaths,
    );
    const assertStableState = async (): Promise<void> => {
      if (
        (await currentDestinationDigest(repoRoot, ".skills-lock.json")) !==
        lockBaselineDigest
      ) {
        throw new Error(
          "Ownership manifest drifted during generation; refusing publication.",
        );
      }
      const currentSources = await captureCandidateSourceInventory(
        repoRoot,
        plan,
      );
      const exactOwnEffects = await assertOwnedSourceEffects(
        repoRoot,
        candidateInventory,
        currentSources,
        plan.declaredFiles,
        ownedOutputDirectories,
        privatePublicationTemps,
      );
      const sourceDrift = sourceInventoryDifferences(
        candidateInventory,
        currentSources,
        exactOwnEffects,
      );
      if (sourceDrift.length > 0) {
        throw new Error(
          `Candidate source inventory drifted during generation: ${sourceDrift.join(", ")}.`,
        );
      }
      for (const relPath of plan.declaredFiles) {
        const current = await currentDestinationDigest(repoRoot, relPath);
        if (current !== expectedDestinationDigests.get(relPath)) {
          throw new Error(
            `Concurrent drift detected on destination "${relPath}": expected ${expectedDestinationDigests.get(relPath)}, current ${current}. Refusing publication.`,
          );
        }
      }
      await assertGitInvocationIdentity(
        repoRoot,
        gitIdentity,
        gitIdentityPaths,
      );
    };
    await assertStableState();

    await appendLog(
      `Snapshot captured for ${plan.declaredFiles.length} declared targets across ${plan.targetAgents.length} configured host(s).\n`,
    );

    stageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ags-stage-"));
    await copySourceToStage(repoRoot, stageRoot);
    await linkDependencies(repoRoot, stageRoot);
    const stagedSourceInventory = await captureCandidateSourceInventory(
      stageRoot,
      plan,
    );
    const stageSourceDrift = sourceInventoryDifferences(
      candidateInventory,
      stagedSourceInventory,
    );
    if (stageSourceDrift.length > 0) {
      throw new Error(
        `Staged candidate sources differ from the captured repository inventory: ${stageSourceDrift.join(", ")}.`,
      );
    }
    await appendLog(`Staged workspace prepared at: ${stageRoot}\n`);

    for (const relPath of plan.declaredFiles) {
      await assertNoSymlinksUnderRoot(stageRoot, path.join(stageRoot, relPath));
    }

    await writeStageOwnership(stageRoot, currentLock, plan);
    const seeded = await seedMissingStageMirrors(stageRoot, plan);
    await appendLog(
      `Seeded ${seeded} absent mirror resources in stage from canonical input.\n`,
    );

    const phases: Array<{ name: string; script: string }> = [
      { name: "calculate-tokens", script: "scripts/calculate-tokens.ts" },
      { name: "generate-indices", script: "scripts/generate-indices.ts" },
      {
        name: "generate-capabilities-doc",
        script: "scripts/generate-capabilities-doc.ts",
      },
    ];

    for (const phase of phases) {
      const run = await runInStage(
        "node",
        ["--import", "tsx", path.join(stageRoot, phase.script)],
        stageRoot,
      );
      await appendLog(
        `[${phase.name}] exitCode=${run.exitCode}\nSTDOUT:\n${run.stdout}\nSTDERR:\n${run.stderr}\n`,
      );
      if (run.exitCode !== 0) {
        throw new Error(
          `${phase.name} failed in stage with exit code ${run.exitCode}:\n${run.stderr || run.stdout}`,
        );
      }
      if (phase.name === "calculate-tokens") {
        await prepareMetadataCandidate(stageRoot, metadataBaselineBytes);
        await updateStageMetadataOwnership(stageRoot);
      }
    }
    stagedLock = await readGenerationLock(stageRoot);

    const parityErrors = await validateGeneratedSurface(
      stageRoot,
      plan,
      baselineDigests,
    );
    if (parityErrors.length > 0) {
      throw new Error(
        `Generated surface failed canonical/host parity checks:\n- ${parityErrors.join("\n- ")}`,
      );
    }
    await appendLog("Canonical and host parity checks passed.\n");

    const outOfDateFiles: string[] = [];
    for (const relPath of plan.declaredFiles) {
      const stagedPath = path.join(stageRoot, relPath);
      if (await fs.pathExists(stagedPath)) {
        await assertNoSymlinksUnderRoot(stageRoot, stagedPath);
      }
      const stagedDigest = await fileSha256(stagedPath);
      stagedDigests.set(relPath, stagedDigest);
      if (stagedDigest !== baselineDigests.get(relPath)) {
        outOfDateFiles.push(relPath);
      }
    }
    for (const relPath of outOfDateFiles) {
      if (!isCliManagedOutputPath(relPath, plan)) continue;
      const digest = stagedDigests.get(relPath);
      const entry = digest
        ? resolveChangedCliStageEntry(
            relPath,
            plan,
            stagedLock?.entries[relPath],
            digest,
          )
        : null;
      if (!digest || !entry) {
        throw new Error(
          `Staged host output "${relPath}" lacks matching CLI ownership metadata.`,
        );
      }
      resolvedCliEntries.set(relPath, entry);
    }
    const metadataStageDigest = stagedDigests.get("skills/metadata.json");
    const metadataEntry =
      stagedLock?.generation?.entries["skills/metadata.json"];
    const stagedMetadata = parseMetadataDocument(
      await fs.readFile(path.join(stageRoot, "skills/metadata.json")),
      "Staged skills/metadata.json",
    );
    if (
      !metadataStageDigest ||
      !metadataEntry?.scope ||
      metadataEntry.sha256 !== metadataStageDigest ||
      metadataEntry.scope.kind !== "category-token-metrics" ||
      metadataEntry.scope.sha256 !== tokenMetricsDigest(stagedMetadata)
    ) {
      throw new Error(
        "Staged ownership manifest does not bind skills/metadata.json bytes and category token_metrics scope.",
      );
    }
    const changedUnknownExisting = unknownExisting.filter((relPath) =>
      outOfDateFiles.includes(relPath),
    );
    adoptedPaths = [];
    if (options.adoptBase && changedUnknownExisting.length > 0) {
      const base = options.adoptBase.toLowerCase();
      if (!/^[0-9a-f]{40,64}$/.test(base)) {
        throw new Error(
          `Adoption base "${options.adoptBase}" is not a full commit SHA.`,
        );
      }
      const resolvedBase = await runProcess(
        "git",
        ["rev-parse", "--verify", `${base}^{commit}`],
        repoRoot,
      );
      if (
        resolvedBase.code !== 0 ||
        resolvedBase.stdout.toString("utf8").trim().toLowerCase() !== base
      ) {
        throw new Error(
          `Adoption base "${base}" is not an available full commit.`,
        );
      }
      await assertStableState();
      baseProofs = await proveBaseProducerOutputs(
        repoRoot,
        base,
        changedUnknownExisting,
        appendLog,
      );
      for (const relPath of changedUnknownExisting) {
        const proof = baseProofs.get(relPath);
        if (!proof || baselineDigests.get(relPath) !== proof.currentSha256) {
          throw new Error(
            `Adoption refused for "${relPath}": current destination changed during pinned-base proof.`,
          );
        }
      }
      adoptionBase = base;
      adoptedPaths = changedUnknownExisting;
      await assertStableState();
    }
    const unapprovedExisting = changedUnknownExisting.filter(
      (relPath) => !adoptedPaths.includes(relPath),
    );

    staleFiles.push(...outOfDateFiles);
    if (unapprovedExisting.length > 0) {
      throw new Error(
        `${checkOnly ? "Prepared generator outputs are stale; " : ""}differing generated outputs lack trusted ownership or explicit base proof: ${unapprovedExisting.join(", ")}.`,
      );
    }

    for (const relPath of outOfDateFiles) {
      if (
        stagedDigests.get(relPath) === null &&
        baselineDigests.get(relPath) !== null
      ) {
        throw new Error(
          `Declared output "${relPath}" exists in the destination but not in the stage; refusing automatic deletion.`,
        );
      }
    }
    await assertStableState();

    if (checkOnly) {
      if (outOfDateFiles.length > 0) {
        throw new Error(
          `Prepared generator outputs are stale: ${outOfDateFiles.join(", ")}. Run isolated generation in apply mode.`,
        );
      }
      await appendLog(
        "Check passed: prepared outputs match declared targets.\n",
      );
      await fs.writeJson(
        receiptPath,
        {
          attemptId,
          timestamp: new Date().toISOString(),
          checkOnly: true,
          status: "PASS",
          declaredFiles: plan.declaredFiles,
        },
        { spaces: 2, flag: "wx" },
      );
      return {
        success: true,
        attemptId,
        checkOnly: true,
        copiedBackFiles: [],
        verifiedFiles: [],
        logPath,
        receiptPath,
      };
    }

    if (adoptedPaths.length > 0 && adoptionBase) {
      await archiveAdoptions(
        logDir,
        adoptionBase,
        repoRoot,
        adoptedPaths,
        baseProofs,
      );
    }
    if (outOfDateFiles.length > 0) {
      await archivePublicationBeforeState(
        logDir,
        repoRoot,
        outOfDateFiles,
        baselineDigests,
        lockBaselineDigest,
      );
    }
    for (const relPath of outOfDateFiles) {
      const stageDigest = stagedDigests.get(relPath);
      if (!stageDigest) continue;
      await publishStagedFile(
        stageRoot,
        repoRoot,
        relPath,
        stageDigest,
        ownedOutputDirectories,
        privatePublicationTemps,
        assertStableState,
        () => appliedFiles.push(relPath),
      );
      expectedDestinationDigests.set(relPath, stageDigest);
      verifiedFiles.push(relPath);
      await appendLog(`Published & verified: ${relPath}\n`);
    }

    const ownershipChanged = await persistVerifiedOwnership(
      repoRoot,
      stageRoot,
      plan,
      outOfDateFiles,
      stagedDigests,
      resolvedCliEntries,
      currentLock,
      stagedLock,
      lockBaselineDigest,
      assertStableState,
      () => appliedFiles.push(".skills-lock.json"),
    );
    const ownershipDigest = await currentDestinationDigest(
      repoRoot,
      ".skills-lock.json",
    );
    if ((ownershipChanged || currentLock) && !ownershipDigest) {
      throw new Error(
        "Verified output publication did not produce an ownership manifest.",
      );
    }
    if (ownershipDigest && outOfDateFiles.length > 0) {
      const verifiedLock = await readGenerationLock(repoRoot);
      for (const relPath of outOfDateFiles) {
        const persistedDigest = isCliManagedOutputPath(relPath, plan)
          ? verifiedLock?.entries[relPath]?.sha256
          : verifiedLock?.generation?.entries[relPath]?.sha256;
        if (persistedDigest !== stagedDigests.get(relPath)) {
          throw new Error(
            `Ownership digest verification failed for "${relPath}".`,
          );
        }
        if (relPath === "skills/metadata.json") {
          const persistedScope =
            verifiedLock?.generation?.entries[relPath]?.scope;
          if (
            persistedScope?.kind !== "category-token-metrics" ||
            persistedScope.sha256 !== tokenMetricsDigest(stagedMetadata)
          ) {
            throw new Error(
              "Ownership scope verification failed for skills/metadata.json.",
            );
          }
        }
      }
    }
    if (ownershipChanged) verifiedFiles.push(".skills-lock.json");
    await fs.writeJson(
      receiptPath,
      {
        attemptId,
        timestamp: new Date().toISOString(),
        checkOnly: false,
        status: "APPLIED",
        copiedBackFiles: appliedFiles,
        verifiedFiles,
        declaredFiles: plan.declaredFiles,
      },
      { spaces: 2, flag: "wx" },
    );

    return {
      success: true,
      attemptId,
      checkOnly: false,
      copiedBackFiles: appliedFiles,
      verifiedFiles,
      logPath,
      receiptPath,
    };
  } catch (error: unknown) {
    let errorMsg = error instanceof Error ? error.message : String(error);
    try {
      const retainedDirectories = await cleanupOwnedOutputDirectories(
        repoRoot,
        ownedOutputDirectories,
      );
      if (retainedDirectories.length > 0) {
        errorMsg += `; newly created output directories retained: ${retainedDirectories.join(", ")}`;
      }
    } catch (cleanupError: unknown) {
      errorMsg += `; newly created output directory cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`;
    }
    await appendLog(`\nFAILURE: ${errorMsg}\n`);
    try {
      await fs.writeJson(
        receiptPath,
        {
          attemptId,
          timestamp: new Date().toISOString(),
          checkOnly,
          status: "FAILED",
          error: errorMsg,
          appliedFiles,
          verifiedFiles,
          stagedOutOfDateFiles: staleFiles,
        },
        { spaces: 2, flag: "wx" },
      );
    } catch {
      // A pre-existing receipt means this attempt never owned the directory.
    }
    return {
      success: false,
      attemptId,
      checkOnly,
      copiedBackFiles: appliedFiles,
      verifiedFiles,
      logPath,
      receiptPath,
      error: errorMsg,
    };
  } finally {
    if (stageRoot) {
      await fs.remove(stageRoot).catch(() => undefined);
    }
  }
}
