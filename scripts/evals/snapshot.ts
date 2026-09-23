import { createHash } from "node:crypto";
import fs from "fs-extra";
import * as path from "path";
import { INPUTS_FILENAME, ROOT_DIR, SKILLS_DIR } from "./constants";
import {
  Manifest,
  ManifestSkill,
  ResourceFingerprint,
  ResourceSnapshot,
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

export function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
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

function packageResources(
  repoRoot: string,
  skill: ManifestSkill,
): ResourceSnapshot {
  const packageDir = path.dirname(skillMarkdownPath(repoRoot, skill));
  const resources: ResourceSnapshot = {};
  const visit = (directory: string): void => {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const resourcePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        // Evals are committed separately through SourceHash and determine
        // scoring, not with-skill package content.
        if (entry.name !== "evals") visit(resourcePath);
        continue;
      }
      if (!entry.isFile()) continue;
      const relativePath = path
        .relative(packageDir, resourcePath)
        .split(path.sep)
        .join("/");
      resources[relativePath] = fs
        .readFileSync(resourcePath)
        .toString("base64");
    }
  };
  visit(packageDir);
  // Sync adds registry attribution only when the package does not supply it.
  const packageNames = new Set(
    Object.keys(resources).map((resourcePath) => resourcePath.toLowerCase()),
  );
  for (const entry of fs.readdirSync(repoRoot, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      /^(LICENSE|NOTICE)(?:\.(?:md|txt))?$/i.test(entry.name) &&
      !packageNames.has(entry.name.toLowerCase())
    ) {
      resources[entry.name] = fs
        .readFileSync(path.join(repoRoot, entry.name))
        .toString("base64");
    }
  }
  return resources;
}

export function resourceFingerprint(
  resources: ResourceSnapshot,
): ResourceFingerprint {
  return {
    version: 1,
    resources: Object.fromEntries(
      Object.entries(resources)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([resourcePath, encoded]) => [
          resourcePath,
          sha256(Buffer.from(encoded, "base64")),
        ]),
    ),
  };
}

function decodeResource(resourcePath: string, encoded: string): Buffer {
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64") !== encoded)
    throw new Error(`Invalid immutable resource encoding for ${resourcePath}`);
  return bytes;
}

function decodeRawSource(
  key: string,
  label: "skill" | "eval",
  encoded: string | undefined,
): Buffer {
  if (!encoded)
    throw new Error(`Immutable raw ${label} snapshot is missing for ${key}`);
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64") !== encoded)
    throw new Error(`Invalid immutable raw ${label} encoding for ${key}`);
  return bytes;
}

function assertRawSourceSnapshotIntegrity(
  key: string,
  expected: SourceHash,
  source: RunInputSource,
): void {
  const skillBytes = decodeRawSource(key, "skill", source.skillMarkdownBase64);
  if (sha256(skillBytes) !== expected.skill)
    throw new Error(`Raw skill snapshot hash mismatch for ${key}`);
  if (skillBytes.toString("utf8") !== source.skillMarkdown)
    throw new Error(`Raw skill snapshot mismatch for ${key}`);

  const evalBytes = decodeRawSource(key, "eval", source.evalsBase64);
  if (sha256(evalBytes) !== expected.evals)
    throw new Error(`Raw eval snapshot hash mismatch for ${key}`);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(evalBytes.toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid immutable raw eval JSON for ${key}`);
  }
  if (JSON.stringify(parsed) !== JSON.stringify(source.evals))
    throw new Error(`Raw eval snapshot mismatch for ${key}`);
}

function assertResourceSnapshotIntegrity(
  key: string,
  expected: ResourceFingerprint,
  resources: ResourceSnapshot | undefined,
): void {
  if (expected.version !== 1)
    throw new Error(`Unsupported resource fingerprint version for ${key}`);
  if (!resources)
    throw new Error(`Immutable resource snapshot is missing for ${key}`);
  const expectedPaths = Object.keys(expected.resources).sort();
  const actualPaths = Object.keys(resources).sort();
  if (JSON.stringify(expectedPaths) !== JSON.stringify(actualPaths))
    throw new Error(`Immutable resource path mismatch for ${key}`);
  for (const resourcePath of expectedPaths) {
    const encoded = resources[resourcePath];
    if (encoded === undefined)
      throw new Error(
        `Immutable resource is missing for ${key}/${resourcePath}`,
      );
    if (
      sha256(decodeResource(resourcePath, encoded)) !==
      expected.resources[resourcePath]
    ) {
      throw new Error(
        `Immutable resource hash mismatch for ${key}/${resourcePath}`,
      );
    }
  }
}

export function assertCurrentSourceMatchesManifest(
  manifest: Manifest,
  key: string,
  source: RunInputSource,
): void {
  if (manifest.schemaVersion !== 2) return;
  const expected = manifest.sourceHashes[key];
  if (
    !expected ||
    expected.skill !== source.hashes.skill ||
    expected.evals !== source.hashes.evals
  ) {
    throw new Error(`Current source drift for ${key}; rerun before promotion.`);
  }
  const expectedResources = manifest.resourceFingerprints?.[key];
  if (expectedResources)
    assertResourceSnapshotIntegrity(key, expectedResources, source.resources);
}

export function readCurrentSource(
  repoRoot: string,
  skill: ManifestSkill,
): RunInputSource {
  const skillPath = skillMarkdownPath(repoRoot, skill);
  const evalsFilePath = evalsPath(repoRoot, skill);
  const skillBytes = fs.readFileSync(skillPath);
  const evalsBytes = fs.readFileSync(evalsFilePath);
  const skillMarkdown = skillBytes.toString("utf8");
  const evalsText = evalsBytes.toString("utf8");
  const hashes: SourceHash = {
    skill: sha256(skillBytes),
    evals: sha256(evalsBytes),
  };

  return {
    category: skill.category,
    skillName: skill.skillName,
    skillPath: path.relative(repoRoot, skillPath),
    evalsPath: path.relative(repoRoot, evalsFilePath),
    hashes,
    skillMarkdown,
    evals: JSON.parse(evalsText) as Record<string, unknown>,
    skillMarkdownBase64: skillBytes.toString("base64"),
    evalsBase64: evalsBytes.toString("base64"),
    resources: packageResources(repoRoot, skill),
  };
}

function readInputs(runDir: string): RunInputsV2 | null {
  const inputsPath = path.join(runDir, INPUTS_FILENAME);
  if (!fs.existsSync(inputsPath)) return null;
  return fs.readJSONSync(inputsPath) as RunInputsV2;
}

export function assertInputsSnapshotIntegrity(
  manifest: Manifest,
  inputs: RunInputsV2,
): void {
  if (manifest.schemaVersion !== 2) return;
  if (inputs.schemaVersion !== 2 || inputs.runId !== manifest.runId)
    throw new Error(`Invalid immutable inputs snapshot for ${manifest.runId}`);
  for (const skill of manifest.skills) {
    const key = sourceKey(skill.category, skill.skillName);
    const expected = manifest.sourceHashes[key];
    const source = inputs.sources[key];
    const actual = source?.hashes;
    if (
      !expected ||
      !actual ||
      expected.skill !== actual.skill ||
      expected.evals !== actual.evals
    ) {
      throw new Error(`Immutable input hash mismatch for ${key}`);
    }
    const expectedResources = manifest.resourceFingerprints?.[key];
    if (expectedResources)
      assertResourceSnapshotIntegrity(key, expectedResources, source.resources);
    if (manifest.inputProvenanceVersion === 1)
      assertRawSourceSnapshotIntegrity(key, expected, source);
  }
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
    assertInputsSnapshotIntegrity(manifest, existing);
    return existing;
  }

  const repoRoot = options.repoRoot ?? ROOT_DIR;
  const sources: Record<string, RunInputSource> = {};
  for (const skill of manifest.skills) {
    const source = readCurrentSource(repoRoot, skill);
    const key = sourceKey(skill.category, skill.skillName);
    assertCurrentSourceMatchesManifest(manifest, key, source);
    sources[key] = source;
  }

  const inputs: RunInputsV2 = {
    schemaVersion: 2,
    runId: manifest.runId,
    capturedAt: options.capturedAt ?? new Date().toISOString(),
    sources,
  };
  assertInputsSnapshotIntegrity(manifest, inputs);
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
    if (source.evalsBase64) {
      const rawEvals = JSON.parse(
        decodeRawSource(
          sourceKey(skill.category, skill.skillName),
          "eval",
          source.evalsBase64,
        ).toString("utf8"),
      ) as Record<string, unknown>;
      if (JSON.stringify(rawEvals) !== JSON.stringify(source.evals))
        throw new Error(
          `Raw eval snapshot mismatch for ${sourceKey(skill.category, skill.skillName)}`,
        );
      return rawEvals;
    }
    return source.evals;
  }

  const source = readCurrentSource(repoRoot, skill);
  return source.evals;
}

export function defaultSkillsDir(repoRoot = ROOT_DIR): string {
  return path.join(repoRoot, path.relative(ROOT_DIR, SKILLS_DIR));
}
