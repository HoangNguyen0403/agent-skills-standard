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

export function checkAssertion(
  assertion: Assertion,
  transcript: string,
): boolean {
  const haystack = transcript.toLowerCase();
  switch (assertion.type) {
    case "contains":
      return haystack.includes(String(assertion.value).toLowerCase());
    case "contains_any": {
      const values = Array.isArray(assertion.value)
        ? assertion.value
        : [assertion.value];
      return values.some((value) => haystack.includes(value.toLowerCase()));
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
  if (transcript.trim().length < 10)
    flags.push("transcript is suspiciously short (<10 chars)");
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
): CaseScore {
  const failedAssertions = assertions
    .filter((assertion) => !checkAssertion(assertion, transcript))
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
  const scores: CaseScore[] = [];

  for (const currentCase of skill.cases) {
    if (currentCase.kind === "trigger") {
      const transcript = readAnswer(runDir, manifest, skill, currentCase);
      if (transcript === null)
        throw new Error(
          `Missing answer after completeness check: ${currentCase.id}`,
        );
      scores.push(
        scoreTriggerCase(
          transcript,
          currentCase,
          manifest.schemaVersion === 2 &&
            manifest.activationEvidenceVersion === 3,
        ),
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
