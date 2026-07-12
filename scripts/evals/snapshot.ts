import { createHash } from "node:crypto";
import fs from "fs-extra";
import * as path from "path";
import { INPUTS_FILENAME, ROOT_DIR, SKILLS_DIR } from "./constants";
import {
  Manifest,
  ManifestSkill,
  RunInputSource,
  RunInputsV2,
  SourceHash,
} from "./types";

export interface SnapshotOptions {
  repoRoot?: string;
  capturedAt?: string;
}

export function sourceKey(category: string, skillName: string): string {
  return `${category}/${skillName}`;
}

export function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function evalsPath(repoRoot: string, skill: ManifestSkill): string {
  return path.join(
    repoRoot,
    "skills",
    skill.category,
    skill.skillName,
    "evals",
    "evals.json",
  );
}

function skillMarkdownPath(repoRoot: string, skill: ManifestSkill): string {
  return path.join(repoRoot, skill.skillPath);
}

export function readCurrentSource(
  repoRoot: string,
  skill: ManifestSkill,
): RunInputSource {
  const skillPath = skillMarkdownPath(repoRoot, skill);
  const evalsFilePath = evalsPath(repoRoot, skill);
  const skillMarkdown = fs.readFileSync(skillPath, "utf8");
  const evalsText = fs.readFileSync(evalsFilePath, "utf8");
  const hashes: SourceHash = {
    skill: sha256(skillMarkdown),
    evals: sha256(evalsText),
  };

  return {
    category: skill.category,
    skillName: skill.skillName,
    skillPath: path.relative(repoRoot, skillPath),
    evalsPath: path.relative(repoRoot, evalsFilePath),
    hashes,
    skillMarkdown,
    evals: JSON.parse(evalsText) as Record<string, unknown>,
  };
}

function readInputs(runDir: string): RunInputsV2 | null {
  const inputsPath = path.join(runDir, INPUTS_FILENAME);
  if (!fs.existsSync(inputsPath)) return null;
  return fs.readJSONSync(inputsPath) as RunInputsV2;
}

export function loadRunInputs(runDir: string): RunInputsV2 | null {
  return readInputs(runDir);
}

export function writeInputsSnapshot(
  runDir: string,
  manifest: Manifest,
  options: SnapshotOptions = {},
): RunInputsV2 {
  const existing = readInputs(runDir);
  if (existing) {
    if (existing.runId !== manifest.runId || existing.schemaVersion !== 2) {
      throw new Error(
        `Invalid immutable inputs snapshot for ${manifest.runId}`,
      );
    }
    return existing;
  }

  const repoRoot = options.repoRoot ?? ROOT_DIR;
  const sources: Record<string, RunInputSource> = {};
  for (const skill of manifest.skills) {
    const source = readCurrentSource(repoRoot, skill);
    const expected =
      manifest.schemaVersion === 2
        ? manifest.sourceHashes[sourceKey(skill.category, skill.skillName)]
        : undefined;
    if (
      expected &&
      (expected.skill !== source.hashes.skill ||
        expected.evals !== source.hashes.evals)
    ) {
      throw new Error(
        `Source drift detected for ${sourceKey(skill.category, skill.skillName)}; resume from the manifest created from the current sources`,
      );
    }
    sources[sourceKey(skill.category, skill.skillName)] = source;
  }

  const inputs: RunInputsV2 = {
    schemaVersion: 2,
    runId: manifest.runId,
    capturedAt: options.capturedAt ?? new Date().toISOString(),
    sources,
  };
  const inputsPath = path.join(runDir, INPUTS_FILENAME);
  fs.ensureDirSync(runDir);
  try {
    fs.writeFileSync(inputsPath, `${JSON.stringify(inputs, null, 2)}\n`, {
      flag: "wx",
    });
  } catch (error) {
    if (!fs.existsSync(inputsPath)) throw error;
    const raced = readInputs(runDir);
    if (!raced || JSON.stringify(raced) !== JSON.stringify(inputs)) {
      throw new Error(
        `Immutable inputs snapshot already exists for ${manifest.runId}`,
      );
    }
    return raced;
  }
  return inputs;
}

export function resolveEvalData(
  runDir: string,
  repoRoot: string,
  skill: ManifestSkill,
): Record<string, unknown> {
  const inputs = readInputs(runDir);
  if (inputs) {
    const source = inputs.sources[sourceKey(skill.category, skill.skillName)];
    if (!source) {
      throw new Error(
        `Inputs snapshot is missing ${sourceKey(skill.category, skill.skillName)}`,
      );
    }
    return source.evals;
  }

  const source = readCurrentSource(repoRoot, skill);
  return source.evals;
}

export function defaultSkillsDir(repoRoot = ROOT_DIR): string {
  return path.join(repoRoot, path.relative(ROOT_DIR, SKILLS_DIR));
}
