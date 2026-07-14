import fs from "fs-extra";
import * as path from "path";
import { RESULTS_FILENAME, ROOT_DIR, TRIGGER_MARKER_REGEX } from "./constants";
import { answerPath, loadManifest, saveManifest } from "./manifest";
import {
  loadRunInputs,
  resolveEvalData,
  writeInputsSnapshot,
} from "./snapshot";
import {
  Assertion,
  ArmName,
  ArmRates,
  CaseScore,
  EvalCaseRef,
  Manifest,
  ManifestSkill,
  RunMetadata,
  RunResults,
  SkillResult,
  TriggerDecision,
  AssertionSemanticsVersion,
} from "./types";

interface SkillEvalCase {
  id: number | string;
  assertions?: Assertion[];
  expected_output?: string;
}

interface PressureScenario {
  behavior_assertions?: string[];
}

interface EvalsJson {
  evals?: SkillEvalCase[];
  pressure_scenarios?: PressureScenario[];
}

export interface ScoreOptions {
  repoRoot?: string;
  writeResults?: boolean;
  writeManifest?: boolean;
}

const SEMANTIC_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "use",
  "via",
  "with",
]);

function normalizedText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u0060*_~]/g, "")
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value: string): string {
  return normalizedText(value).replace(/\s+/g, "");
}

function semanticTokens(value: string): string[] {
  return (
    normalizedText(value)
      .replace(/[-_/]/g, " ")
      .match(/@[a-z][a-z0-9]*|[a-z][a-z0-9]*|\d+/g) ?? []
  ).filter((token) => !SEMANTIC_STOP_WORDS.has(token) && token.length > 2);
}

function tokenVariants(value: string): Set<string> {
  const variants = new Set([value]);
  const stemmed = value.replace(/(ing|ed|es|s)$/, "");
  variants.add(stemmed);
  if (value.endsWith("ing")) variants.add(`${stemmed}e`);
  if (stemmed.endsWith("e")) variants.add(stemmed.slice(0, -1));
  return variants;
}

function containsV2(value: string, transcript: string): boolean {
  const needle = normalizedText(value);
  const haystack = normalizedText(transcript);
  if (haystack.includes(needle)) return true;

  // Markdown and line wrapping must not change the meaning of a code example.
  if (/[{}\[\]@/:?<>$%()]/.test(value)) {
    if (compactText(transcript).includes(compactText(value))) return true;
  }

  // Concrete literals (status codes, versions, amounts, paths) remain exact.
  if (/\d/.test(value)) return false;

  // Syntax-specific equivalence for examples whose placeholder names vary.
  if (/[{}\[\]@/:?<>$%()]/.test(value)) {
    const genericFunction = value.match(
      /^([a-z_$][a-z0-9_$]*)\s*<[^>]+>\s*\(\s*\)$/i,
    );
    if (genericFunction)
      return new RegExp(
        `${genericFunction[1]}\\s*(?:<[^>]+>)?\\s*\\(`,
        "i",
      ).test(transcript);

    const constructorShape = value.match(
      /\b([A-Z][A-Za-z0-9_]*)\s*\(\s*val\s+([A-Za-z_][A-Za-z0-9_]*)/,
    );
    if (constructorShape)
      return new RegExp(
        `${constructorShape[1]}\\s*\\([\\s\\S]*?${constructorShape[2]}`,
        "i",
      ).test(transcript);

    // Angular control-flow examples use arbitrary variable names; preserve
    // the stable syntax and tracking identity instead of the placeholder names.
    if (/^@for\s*\(/i.test(value))
      return (
        /@for\s*\(/i.test(transcript) &&
        /\btrack\b/i.test(transcript) &&
        /(?:\.\s*id|\bid\b)/i.test(transcript)
      );
    if (/^@if\s*\(/i.test(value)) return /@if\s*\(/i.test(transcript);
    if (/^@empty\b/i.test(value)) return /@empty\b/i.test(transcript);
    // A function name is the stable contract when the answer supplies a
    // concrete argument rather than the empty example's parentheses.
    const functionName = value.match(/^([a-z_$][a-z0-9_$]*)\(\s*\)$/i)?.[1];
    if (functionName)
      return new RegExp(`${functionName}\\s*\\(`, "i").test(transcript);
  }

  const required = semanticTokens(value);
  const available = new Set(
    semanticTokens(transcript).flatMap((token) => [...tokenVariants(token)]),
  );
  if (required.length === 1) {
    const variants = tokenVariants(required[0]);
    return [...variants].some((variant) => available.has(variant));
  }
  if (required.length === 0) return false;
  return required.every((token) => {
    const variants = tokenVariants(token);
    return [...variants].some(
      (variant) =>
        available.has(variant) ||
        [...available].some(
          (candidate) =>
            candidate.startsWith(variant) || variant.startsWith(candidate),
        ),
    );
  });
}

export function checkAssertion(
  assertion: Assertion,
  transcript: string,
  semanticsVersion: AssertionSemanticsVersion = 1,
): boolean {
  const haystack = transcript.toLowerCase();
  switch (assertion.type) {
    case "contains":
      return semanticsVersion === 2
        ? containsV2(String(assertion.value), transcript)
        : haystack.includes(String(assertion.value).toLowerCase());
    case "contains_any": {
      const values = Array.isArray(assertion.value)
        ? assertion.value
        : [assertion.value];
      return values.some((value) =>
        semanticsVersion === 2
          ? containsV2(value, transcript)
          : haystack.includes(value.toLowerCase()),
      );
    }
    case "not_contains":
      return !haystack.includes(String(assertion.value).toLowerCase());
    case "regex": {
      try {
        return new RegExp(String(assertion.value), "i").test(transcript);
      } catch {
        return false;
      }
    }
    case "file_reference": {
      const value = String(assertion.value).toLowerCase();
      return (
        haystack.includes(value) || haystack.includes(path.basename(value))
      );
    }
    default:
      return false;
  }
}

function readAnswer(
  runDir: string,
  manifest: Manifest,
  skill: ManifestSkill,
  currentCase: EvalCaseRef,
  arm?: ArmName,
): string | null {
  const filePath = answerPath(runDir, manifest, skill, currentCase.id, arm);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

function detectSuspicious(
  transcript: string,
  expectedOutput?: string,
): string[] {
  const flags: string[] = [];
  if (
    expectedOutput &&
    expectedOutput.length > 30 &&
    transcript.toLowerCase().includes(expectedOutput.toLowerCase())
  ) {
    flags.push("transcript reproduces expected_output verbatim");
  }
  return flags;
}

function assertionCount(assertions: Assertion[]): number {
  return assertions.length;
}

function scoreOutcomeCase(
  transcript: string,
  assertions: Assertion[],
  expectedOutput: string | undefined,
  arm: ArmName,
  currentCase: EvalCaseRef,
  kind: "eval" | "pressure",
  semanticsVersion: AssertionSemanticsVersion,
): CaseScore {
  const failedAssertions = assertions
    .filter(
      (assertion) => !checkAssertion(assertion, transcript, semanticsVersion),
    )
    .map((assertion) => `${assertion.type}:${String(assertion.value)}`);
  return {
    id: currentCase.id,
    kind,
    arm,
    passed: failedAssertions.length === 0,
    missingAnswer: false,
    suspicious: detectSuspicious(transcript, expectedOutput),
    failedAssertions,
    passedAssertions: assertions.length - failedAssertions.length,
    totalAssertions: assertionCount(assertions),
  };
}

function triggerDecision(transcript: string): TriggerDecision | undefined {
  const match = transcript.match(TRIGGER_MARKER_REGEX);
  return match?.[1].toLowerCase() as TriggerDecision | undefined;
}

function scoreTriggerCase(
  transcript: string,
  currentCase: EvalCaseRef,
  requireCaseToken: boolean,
): CaseScore {
  const actual = triggerDecision(transcript);
  const expected = currentCase.expectedTrigger ?? "no";
  const hasCaseToken = transcript.includes(`CASE: ${currentCase.id}`);
  const failedAssertions = [
    ...(actual === expected ? [] : [`trigger marker expected ${expected}`]),
    ...(!requireCaseToken || hasCaseToken
      ? []
      : [`trigger case token expected ${currentCase.id}`]),
  ];
  const passed = failedAssertions.length === 0;
  return {
    id: currentCase.id,
    kind: "trigger",
    arm: "with-skill",
    passed,
    missingAnswer: false,
    suspicious: [
      ...(actual
        ? []
        : ['answer missing required "TRIGGER: yes|no" marker line']),
      ...(!requireCaseToken || hasCaseToken
        ? []
        : ["answer missing required CASE token"]),
    ],
    failedAssertions,
    expectedTrigger: expected,
    actualTrigger: actual,
    passedAssertions: (requireCaseToken ? 2 : 1) - failedAssertions.length,
    totalAssertions: requireCaseToken ? 2 : 1,
  };
}

function evalDataFor(
  runDir: string,
  repoRoot: string,
  skill: ManifestSkill,
): EvalsJson {
  return resolveEvalData(runDir, repoRoot, skill) as EvalsJson;
}

function missingAnswers(runDir: string, manifest: Manifest): string[] {
  const missing: string[] = [];
  for (const skill of manifest.skills) {
    for (const currentCase of skill.cases) {
      const arms =
        currentCase.kind === "trigger"
          ? ["with-skill" as const]
          : (["baseline", "with-skill"] as const).filter(
              (arm) => arm in currentCase.arms,
            );
      for (const arm of arms) {
        if (
          !readAnswer(
            runDir,
            manifest,
            skill,
            currentCase,
            arm === "with-skill" && currentCase.kind === "trigger"
              ? undefined
              : arm,
          )
        ) {
          const answerFile = answerPath(
            runDir,
            manifest,
            skill,
            currentCase.id,
            currentCase.kind === "trigger" ? undefined : arm,
          );
          missing.push(path.relative(runDir, answerFile));
        }
      }
    }
  }
  return missing;
}

function passRate(scores: CaseScore[]): number {
  return scores.length > 0
    ? scores.filter((score) => score.passed).length / scores.length
    : 0;
}

function assertionRate(scores: CaseScore[]): number {
  const total = scores.reduce(
    (sum, score) => sum + (score.totalAssertions ?? 0),
    0,
  );
  const passed = scores.reduce(
    (sum, score) => sum + (score.passedAssertions ?? 0),
    0,
  );
  return total > 0 ? passed / total : 0;
}

function metricPair(
  baseline: number,
  withSkill: number,
  baselineCompromised: boolean,
): ArmRates {
  return {
    baseline: baselineCompromised ? "n/a" : baseline,
    withSkill,
  };
}

function triggerMetrics(scores: CaseScore[]): {
  recall: number | null;
  specificity: number | null;
  balanced: number | null;
} {
  const positives = scores.filter((score) => score.expectedTrigger === "yes");
  const negatives = scores.filter((score) => score.expectedTrigger === "no");
  const recall =
    positives.length > 0
      ? positives.filter((score) => score.actualTrigger === "yes").length /
        positives.length
      : null;
  const specificity =
    negatives.length > 0
      ? negatives.filter((score) => score.actualTrigger === "no").length /
        negatives.length
      : null;
  const balanced =
    recall === null || specificity === null ? null : (recall + specificity) / 2;
  return { recall, specificity, balanced };
}

function isBaselineCompromised(
  manifest: Manifest,
  skill: ManifestSkill,
): boolean {
  return (
    manifest.schemaVersion === 2 &&
    manifest.compromisedSkills.some(
      (record) =>
        record.category === skill.category &&
        record.skillName === skill.skillName &&
        record.arm === "baseline",
    )
  );
}

function scoreSkill(
  runDir: string,
  manifest: Manifest,
  skill: ManifestSkill,
  repoRoot: string,
): SkillResult {
  const evalsData = evalDataFor(runDir, repoRoot, skill);
  const evalById = new Map(
    (evalsData.evals ?? []).map((evaluation) => [
      String(evaluation.id),
      evaluation,
    ]),
  );
  const pressureByIndex = evalsData.pressure_scenarios ?? [];
  const provenance =
    manifest.schemaVersion === 2
      ? manifest.provenance?.[`${skill.category}/${skill.skillName}`]
      : undefined;
  const semanticsVersion =
    manifest.schemaVersion === 2
      ? (provenance?.assertionSemanticsVersion ??
        manifest.assertionSemanticsVersion ??
        1)
      : 1;
  const activationEvidenceTrusted =
    manifest.schemaVersion === 2
      ? provenance?.activationEvidenceVersion !== undefined
        ? provenance.activationEvidenceVersion === 3
        : manifest.activationEvidenceVersion === 3
      : false;
  const scores: CaseScore[] = [];

  for (const currentCase of skill.cases) {
    if (currentCase.kind === "trigger") {
      const transcript = readAnswer(runDir, manifest, skill, currentCase);
      if (transcript === null)
        throw new Error(
          `Missing answer after completeness check: ${currentCase.id}`,
        );
      scores.push(
        scoreTriggerCase(transcript, currentCase, activationEvidenceTrusted),
      );
      continue;
    }

    for (const arm of ["baseline", "with-skill"] as const) {
      if (!(arm in currentCase.arms)) continue;
      const transcript = readAnswer(runDir, manifest, skill, currentCase, arm);
      if (transcript === null)
        throw new Error(
          `Missing answer after completeness check: ${currentCase.id}.${arm}`,
        );
      const assertions =
        currentCase.kind === "eval"
          ? (evalById.get(currentCase.id.replace("eval-", ""))?.assertions ??
            [])
          : (
              pressureByIndex[
                Number(currentCase.id.replace("pressure-", "")) - 1
              ]?.behavior_assertions ?? []
            ).map((value) => ({ type: "contains" as const, value }));
      const expectedOutput = evalById.get(
        currentCase.id.replace("eval-", ""),
      )?.expected_output;
      scores.push(
        scoreOutcomeCase(
          transcript,
          assertions,
          expectedOutput,
          arm,
          currentCase,
          currentCase.kind,
          semanticsVersion,
        ),
      );
    }
  }

  const outcomeScores = scores.filter((score) => score.kind !== "trigger");
  const baselineScores = outcomeScores.filter(
    (score) => score.arm === "baseline",
  );
  const withSkillScores = outcomeScores.filter(
    (score) => score.arm === "with-skill",
  );
  const baselinePassRate = passRate(baselineScores);
  const withSkillPassRate = passRate(withSkillScores);
  const baselineCompromised = isBaselineCompromised(manifest, skill);
  const triggers = triggerMetrics(
    scores.filter((score) => score.kind === "trigger"),
  );
  const delta = baselineCompromised
    ? "n/a"
    : withSkillPassRate - baselinePassRate;

  return {
    category: skill.category,
    skillName: skill.skillName,
    guardrailApplicable: skill.guardrailApplicable,
    totalEvalCases: outcomeScores.length / 2,
    baselinePassRate: baselineCompromised ? "n/a" : baselinePassRate,
    withSkillPassRate,
    delta,
    triggerPrecision: triggers.specificity,
    casePassRate: metricPair(
      baselinePassRate,
      withSkillPassRate,
      baselineCompromised,
    ),
    assertionPassRate: metricPair(
      assertionRate(baselineScores),
      assertionRate(withSkillScores),
      baselineCompromised,
    ),
    triggerRecall: triggers.recall,
    triggerSpecificity: triggers.specificity,
    balancedTriggerAccuracy: triggers.balanced,
    scores,
    incompleteArms: [],
  };
}

function legacySkillResult(
  skill: SkillResult,
  manifestSkill: ManifestSkill,
): SkillResult {
  return {
    category: skill.category,
    skillName: skill.skillName,
    guardrailApplicable: skill.guardrailApplicable,
    totalEvalCases: manifestSkill.cases.length,
    baselinePassRate:
      typeof skill.baselinePassRate === "number" ? skill.baselinePassRate : 0,
    withSkillPassRate: skill.withSkillPassRate,
    delta:
      typeof skill.delta === "number" ? skill.delta : skill.withSkillPassRate,
    triggerPrecision: skill.triggerPrecision,
    scores: skill.scores.map((score) => ({
      id: score.id,
      kind: score.kind,
      arm: score.arm,
      passed: score.passed,
      missingAnswer: score.missingAnswer,
      suspicious: score.suspicious,
      failedAssertions:
        score.kind === "trigger" && !score.passed
          ? ['trigger marker did not say "no"']
          : score.failedAssertions,
    })),
    incompleteArms: skill.incompleteArms,
  };
}

export function scoreRun(
  runDir: string,
  options: ScoreOptions = {},
): RunResults {
  const repoRoot = options.repoRoot ?? ROOT_DIR;
  const manifest = loadManifest(runDir);
  const missing = missingAnswers(runDir, manifest);
  if (missing.length > 0) {
    throw new Error(
      `Run is incomplete; pending answers: ${missing.join(", ")}`,
    );
  }

  const hasSnapshot = loadRunInputs(runDir) !== null;
  if (manifest.schemaVersion === 2 && !hasSnapshot) {
    if (options.writeResults === false) {
      throw new Error(`Run ${manifest.runId} has no immutable inputs snapshot`);
    }
    writeInputsSnapshot(runDir, manifest, { repoRoot });
  }

  const scoredSkills = manifest.skills.map((skill) =>
    scoreSkill(runDir, manifest, skill, repoRoot),
  );
  const skills =
    manifest.schemaVersion === 2
      ? scoredSkills
      : scoredSkills.map((skill, index) =>
          legacySkillResult(skill, manifest.skills[index]),
        );
  const metadata: RunMetadata = { ...manifest.metadata };
  if (manifest.schemaVersion === 2 && !metadata.completedAt) {
    metadata.completedAt = new Date().toISOString();
    manifest.metadata = metadata;
  }
  const results: RunResults = {
    ...(manifest.schemaVersion === 2 ? { schemaVersion: 2 as const } : {}),
    runId: manifest.runId,
    category: manifest.category,
    version: manifest.version,
    scoredAt: new Date().toISOString(),
    metadata,
    ...(manifest.schemaVersion === 2 ? { scope: manifest.scope } : {}),
    ...(manifest.schemaVersion === 2
      ? { compromisedSkills: manifest.compromisedSkills }
      : {}),
    ...(manifest.schemaVersion === 2 && manifest.provenance
      ? { provenance: manifest.provenance }
      : {}),
    skills,
  };

  if (options.writeManifest !== false && manifest.schemaVersion === 2)
    saveManifest(runDir, manifest);
  if (options.writeResults !== false) {
    fs.writeJSONSync(path.join(runDir, RESULTS_FILENAME), results, {
      spaces: 2,
    });
  }
  return results;
}
