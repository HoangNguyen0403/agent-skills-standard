import fs from "fs-extra";
import * as path from "node:path";
import {
  INPUTS_FILENAME,
  RESULTS_FILENAME,
  ROOT_DIR,
  RUNS_DIR,
} from "./constants";
import { loadManifest } from "./manifest";
import { scoreRun } from "./scorer";
import { loadRunInputs } from "./snapshot";
import { verifyRun } from "./verify";
import { evaluateSkillReadiness } from "./readiness";
import type {
  ManifestSkill,
  ManifestV2,
  RunInputsV2,
  RunResults,
  SkillProvenance,
} from "./types";

export const DEFAULT_COMPOSITE_SKILL_COUNT = 265;

export interface ComposeOptions {
  repoRoot?: string;
  baseRunId: string;
  overlayRunId: string;
  version: string;
  outputRunId?: string;
  expectedSkillCount?: number;
  now?: Date;
}

export interface ComposeResult {
  runDir: string;
  manifest: ManifestV2;
  results: RunResults;
}

function runsDirectory(repoRoot: string): string {
  return repoRoot === ROOT_DIR
    ? RUNS_DIR
    : path.join(repoRoot, "benchmarks", "evals", "runs");
}

function runDirectory(repoRoot: string, runId: string): string {
  return path.join(runsDirectory(repoRoot), runId);
}

function evidenceDirectory(
  runDir: string,
  manifest: ManifestV2,
  skill: ManifestSkill,
  kind: "prompts" | "answers",
): string {
  const categoryParts = manifest.category === "all" ? [skill.category] : [];
  return path.join(runDir, kind, ...categoryParts, skill.skillName);
}

function skillKey(skill: ManifestSkill): string {
  return `${skill.category}/${skill.skillName}`;
}

function assertUniqueSkills(manifest: ManifestV2, label: string): void {
  const keys = manifest.skills.map(skillKey);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicates.length > 0)
    throw new Error(
      `${label} contains duplicate skills: ${[...new Set(duplicates)].join(", ")}`,
    );
}

function assertV2Source(
  runId: string,
  repoRoot: string,
  expectedVersion: string,
): {
  runDir: string;
  manifest: ManifestV2;
  results: RunResults;
  inputs: RunInputsV2;
} {
  const runDir = runDirectory(repoRoot, runId);
  if (!fs.existsSync(runDir)) throw new Error(`Source run not found: ${runId}`);
  const manifest = loadManifest(runDir);
  if (manifest.schemaVersion !== 2)
    throw new Error(`Source run ${runId} must use manifest v2`);
  if (manifest.version !== expectedVersion)
    throw new Error(
      `Source run ${runId} version ${manifest.version} does not match ${expectedVersion}`,
    );
  assertUniqueSkills(manifest, `Source run ${runId}`);
  const evidenceMode = manifest.metadata.evidenceMode;
  const regradePlanPath = path.join(runDir, "baseline-plan.json");
  const regradePlan = fs.existsSync(regradePlanPath)
    ? fs.readJSONSync(regradePlanPath)
    : undefined;
  const validRegrade =
    evidenceMode === "regraded" &&
    (manifest.metadata.freshAnswerCount ?? 0) === 0 &&
    (manifest.metadata.reusedAnswerCount ?? 0) > 0 &&
    Array.isArray(regradePlan?.impacts) &&
    regradePlan.impacts.length > 0 &&
    regradePlan.impacts.every(
      (impact: { outcome?: string; activation?: string }) =>
        impact.outcome === "regrade" && impact.activation === "reuse",
    );
  // Runs created before evidenceMode was added are still valid immutable v2
  // evidence when they have no reuse counters. Verification below remains the
  // authority for completeness and integrity; this branch only preserves
  // compatibility with the historical manifest shape.
  const validHistorical =
    evidenceMode === undefined &&
    manifest.metadata.freshAnswerCount === undefined &&
    manifest.metadata.reusedAnswerCount === undefined;
  if (
    (!["fresh", "composite"].includes(evidenceMode ?? "") ||
      (manifest.metadata.reusedAnswerCount ?? 0) !== 0) &&
    !validRegrade &&
    !validHistorical
  )
    throw new Error(
      `Source run ${runId} is not fresh, historical, regraded, or composite evidence`,
    );

  const verification = verifyRun(runId, { repoRoot });
  if (!verification.ok)
    throw new Error(
      `Source run ${runId} is not verified: ${verification.reason ?? "unknown reason"}`,
    );
  const resultsPath = path.join(runDir, RESULTS_FILENAME);
  const inputs = loadRunInputs(runDir);
  if (!inputs)
    throw new Error(`Source run ${runId} is missing ${INPUTS_FILENAME}`);
  const results = fs.readJSONSync(resultsPath) as RunResults;
  if (results.skills.length !== manifest.skills.length)
    throw new Error(`Source run ${runId} manifest/results skill counts differ`);
  for (const skill of manifest.skills) {
    const key = skillKey(skill);
    if (!inputs.sources[key])
      throw new Error(`Source run ${runId} is missing immutable input ${key}`);
    const hash = manifest.sourceHashes[key];
    if (
      !hash ||
      JSON.stringify(hash) !== JSON.stringify(inputs.sources[key].hashes)
    )
      throw new Error(
        `Source run ${runId} has an immutable input hash mismatch for ${key}`,
      );
    if (!fs.existsSync(evidenceDirectory(runDir, manifest, skill, "prompts")))
      throw new Error(`Source run ${runId} is missing prompts for ${key}`);
    if (!fs.existsSync(evidenceDirectory(runDir, manifest, skill, "answers")))
      throw new Error(`Source run ${runId} is missing answers for ${key}`);
  }
  return { runDir, manifest, results, inputs };
}

function mapSkills<T extends { category: string; skillName: string }>(
  items: T[],
  label: string,
): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    const key = `${item.category}/${item.skillName}`;
    if (result.has(key))
      throw new Error(`${label} contains duplicate skills: ${key}`);
    result.set(key, item);
  }
  return result;
}

function compatibleProtocolFor(manifest: ManifestV2): string {
  // The prescribed 129-skill base predates the v3 governing instruction label.
  // Its arm-isolation and transcript protocols must still match the fresh
  // overlay, but the composite must adopt v3 as its governing protocol.
  const { instructionVersion: _instructionVersion, ...executionProtocol } =
    manifest.protocol;
  return JSON.stringify(executionProtocol);
}

export function composeRuns(options: ComposeOptions): ComposeResult {
  const repoRoot = options.repoRoot ?? ROOT_DIR;
  const outputRunId = options.outputRunId ?? `all-v${options.version}`;
  const base = assertV2Source(options.baseRunId, repoRoot, options.version);
  const overlay = assertV2Source(
    options.overlayRunId,
    repoRoot,
    options.version,
  );
  if (
    compatibleProtocolFor(base.manifest) !==
    compatibleProtocolFor(overlay.manifest)
  )
    throw new Error("Source generation protocols are incompatible");
  if (overlay.manifest.protocol.instructionVersion !== "governing-skill-v3")
    throw new Error("Overlay must use governing-skill-v3");
  if (
    (options.expectedSkillCount ?? DEFAULT_COMPOSITE_SKILL_COUNT) ===
      DEFAULT_COMPOSITE_SKILL_COUNT &&
    overlay.manifest.assertionSemanticsVersion !== 2
  )
    throw new Error("Overlay must use assertion-semantics-v2");
  const baseSkills = mapSkills(base.manifest.skills, "Base manifest");
  const overlaySkills = mapSkills(overlay.manifest.skills, "Overlay manifest");
  const baseResults = mapSkills(base.results.skills, "Base results");
  const overlayResults = mapSkills(overlay.results.skills, "Overlay results");
  const keys = new Set([...baseSkills.keys(), ...overlaySkills.keys()]);
  const expectedCount =
    options.expectedSkillCount ?? DEFAULT_COMPOSITE_SKILL_COUNT;
  if (keys.size !== expectedCount)
    throw new Error(
      `Combined catalog has ${keys.size} skills; expected exactly ${expectedCount}`,
    );
  if (expectedCount === DEFAULT_COMPOSITE_SKILL_COUNT) {
    if (overlay.manifest.skills.length === 0)
      throw new Error("Release composition requires a non-empty overlay");
    const notReady = overlay.results.skills.flatMap((skill) => {
      const readiness = evaluateSkillReadiness(skill, {
        compromised: false,
        activationEvidenceTrusted: true,
      });
      return readiness.ready
        ? []
        : [
            `${skill.category}/${skill.skillName}: ${readiness.failures.join("; ")}`,
          ];
    });
    if (notReady.length > 0)
      throw new Error(
        `Overlay is not strict-ready:\n- ${notReady.join("\n- ")}`,
      );
  }

  const outputDir = runDirectory(repoRoot, outputRunId);
  if (fs.existsSync(outputDir))
    throw new Error(`Output run already exists: ${outputRunId}`);
  fs.ensureDirSync(outputDir);
  const selectedSkills: ManifestSkill[] = [];
  const sourceRuns = new Map<string, typeof base>();
  const provenance: Record<string, SkillProvenance> = {};
  const sourceHashes: ManifestV2["sourceHashes"] = {};
  const inputSources: RunInputsV2["sources"] = {};

  for (const key of [...keys].sort()) {
    const source = overlaySkills.has(key) ? overlay : base;
    const skill = overlaySkills.get(key) ?? baseSkills.get(key);
    const result = overlaySkills.has(key)
      ? overlayResults.get(key)
      : baseResults.get(key);
    if (!skill || !result)
      throw new Error(`Combined catalog is missing ${key}`);
    const sourceIsCompromised = source.manifest.compromisedSkills.some(
      (record) =>
        record.category === skill.category &&
        record.skillName === skill.skillName,
    );
    if (sourceIsCompromised)
      throw new Error(
        `Combined catalog selects compromised evidence for ${key}`,
      );
    const input = source.inputs.sources[key];
    const hash = source.manifest.sourceHashes[key];
    if (!input || !hash)
      throw new Error(`Combined catalog is missing immutable source ${key}`);
    selectedSkills.push(skill);
    sourceRuns.set(key, source);
    sourceHashes[key] = hash;
    inputSources[key] = input;
    provenance[key] = {
      sourceRunId: source.manifest.runId,
      sourceHash: hash,
      model: source.manifest.metadata.model,
      protocol: source.manifest.protocol,
      evidenceMode: source.manifest.metadata.evidenceMode ?? "fresh",
      activationEvidenceVersion: source.manifest.activationEvidenceVersion ?? 2,
      assertionSemanticsVersion: source.manifest.assertionSemanticsVersion ?? 1,
    };
    for (const kind of ["prompts", "answers"] as const) {
      fs.copySync(
        evidenceDirectory(source.runDir, source.manifest, skill, kind),
        evidenceDirectory(
          outputDir,
          { category: "all" } as ManifestV2,
          skill,
          kind,
        ),
      );
    }
  }

  const now = options.now ?? new Date();
  const uniqueSources = [
    ...new Map(
      [...sourceRuns.values()].map((source) => [source.manifest.runId, source]),
    ).values(),
  ];
  const metadata = {
    agent: "Composite immutable evidence",
    model:
      uniqueSources
        .map((source) => source.manifest.metadata.model)
        .filter(Boolean)
        .join(" + ") || undefined,
    reasoningEffort: "high" as const,
    startedAt: now.toISOString(),
    completedAt: now.toISOString(),
    evidenceMode: "composite" as const,
    freshAnswerCount: uniqueSources.reduce(
      (sum, source) => sum + (source.manifest.metadata.freshAnswerCount ?? 0),
      0,
    ),
    reusedAnswerCount: 0,
  };
  const manifest: ManifestV2 = {
    schemaVersion: 2,
    runId: outputRunId,
    category: "all",
    version: options.version,
    createdAt: now.toISOString(),
    metadata,
    scope: {
      kind: "all",
      categories: [
        ...new Set(selectedSkills.map((skill) => skill.category)),
      ].sort(),
    },
    protocol: overlay.manifest.protocol,
    sourceHashes,
    compromisedSkills: [],
    activationEvidenceVersion: 3,
    assertionSemanticsVersion: overlay.manifest.assertionSemanticsVersion ?? 1,
    provenance,
    skills: selectedSkills,
  };
  fs.writeJSONSync(path.join(outputDir, "manifest.json"), manifest, {
    spaces: 2,
  });
  fs.writeJSONSync(
    path.join(outputDir, INPUTS_FILENAME),
    {
      schemaVersion: 2,
      runId: outputRunId,
      capturedAt: now.toISOString(),
      sources: inputSources,
    },
    { spaces: 2 },
  );
  // Re-score the assembled transcript set under the composite manifest's
  // current assertion/activation semantics. Source runs remain immutable;
  // this makes the new composite's committed results reproducible by
  // verifyRun even when a historical source used an older scorer protocol.
  const scoredResults = scoreRun(outputDir, {
    repoRoot,
    writeManifest: false,
  });
  return { runDir: outputDir, manifest, results: scoredResults };
}
