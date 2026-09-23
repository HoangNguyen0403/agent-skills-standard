import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import * as path from 'path';

/**
 * Portable v1/v2 verifier for the separately published CLI package.
 * Keep this algorithm aligned with scripts/evals/scorer.ts and
 * mcp/src/services/EvalsIndex.ts; all three consumers verify the same
 * committed transcripts and immutable inputs snapshot.
 */

type ArmName = 'baseline' | 'with-skill';
type Metric = number | 'n/a';
type TriggerDecision = 'yes' | 'no';
import {
  checkAssertion,
  type AssertionSemanticsVersion,
} from './assertion-semantics';

type AssertionType =
  'contains' | 'contains_any' | 'not_contains' | 'regex' | 'file_reference';

interface Assertion {
  type: AssertionType;
  value: string | string[];
}

interface EvalCaseRef {
  id: string;
  kind: 'eval' | 'trigger' | 'pressure';
  expectedTrigger?: TriggerDecision;
  arms: Partial<Record<ArmName, 'pending' | 'done'>>;
}

interface ManifestSkill {
  category: string;
  skillName: string;
  cases: EvalCaseRef[];
}

interface ResourceFingerprint {
  version: 1;
  resources: Record<string, string>;
}

interface SourceHash {
  skill: string;
  evals: string;
}

interface Manifest {
  schemaVersion?: 1 | 2;
  assertionSemanticsVersion?: AssertionSemanticsVersion;
  provenance?: Record<
    string,
    { assertionSemanticsVersion?: AssertionSemanticsVersion }
  >;
  runId: string;
  category: string;
  version: string;
  metadata: Record<string, unknown>;
  scope?: { kind: 'category' | 'all'; categories: string[] };
  compromisedSkills?: Array<{
    category: string;
    skillName: string;
    arm: ArmName;
  }>;
  skills: ManifestSkill[];
  resourceFingerprints?: Record<string, ResourceFingerprint>;
  sourceHashes?: Record<string, SourceHash>;
  inputProvenanceVersion?: 1;
}

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

interface InputsSource {
  category: string;
  skillName: string;
  evals: Record<string, unknown>;
  resources?: Record<string, string>;
  skillMarkdown?: string;
  skillMarkdownBase64?: string;
  evalsBase64?: string;
}

interface InputsSnapshot {
  schemaVersion: 2;
  runId: string;
  sources: Record<string, InputsSource>;
}

interface ScoreSummary {
  baselinePassRate: Metric;
  withSkillPassRate: number;
  delta: Metric;
  casePassRate: { baseline: Metric; withSkill: number };
  assertionPassRate: { baseline: Metric; withSkill: number };
  triggerRecall: number | null;
  triggerSpecificity: number | null;
  balancedTriggerAccuracy: number | null;
}

interface CommittedSkill extends Partial<ScoreSummary> {
  category?: string;
  skillName: string;
}

export interface EvalsVerifyOutcome {
  runId: string;
  ok: boolean;
  reason?: string;
  diffs?: string[];
}

function answerPath(
  runDir: string,
  manifest: Manifest,
  skill: ManifestSkill,
  caseId: string,
  arm?: ArmName,
): string {
  const categoryParts = manifest.category === 'all' ? [skill.category] : [];
  const filename = arm ? `${caseId}.${arm}.md` : `${caseId}.md`;
  return path.join(
    runDir,
    'answers',
    ...categoryParts,
    skill.skillName,
    filename,
  );
}

function readAnswer(
  runDir: string,
  manifest: Manifest,
  skill: ManifestSkill,
  currentCase: EvalCaseRef,
  arm?: ArmName,
): string | null {
  const filePath = answerPath(runDir, manifest, skill, currentCase.id, arm);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

function readInputs(runDir: string): InputsSnapshot | null {
  const inputsPath = path.join(runDir, 'inputs.json');
  return fs.existsSync(inputsPath)
    ? (fs.readJSONSync(inputsPath) as InputsSnapshot)
    : null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === 'string')
  );
}

function isBase64(value: string): boolean {
  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
    value,
  );
}

function resourceFingerprintDiffs(
  manifest: Manifest,
  inputs: InputsSnapshot | null,
): string[] {
  if (
    manifest.schemaVersion !== 2 ||
    manifest.resourceFingerprints === undefined
  )
    return [];
  if (
    typeof manifest.resourceFingerprints !== 'object' ||
    manifest.resourceFingerprints === null ||
    Array.isArray(manifest.resourceFingerprints)
  )
    return ['Invalid immutable resource fingerprint manifest'];

  const diffs: string[] = [];
  for (const key of manifest.skills
    .map((skill) => `${skill.category}/${skill.skillName}`)
    .sort()) {
    if (!Object.hasOwn(manifest.resourceFingerprints, key))
      diffs.push(`Missing immutable resource provenance for ${key}`);
  }
  for (const key of Object.keys(manifest.resourceFingerprints).sort()) {
    const fingerprint = manifest.resourceFingerprints[key];
    if (
      !fingerprint ||
      fingerprint.version !== 1 ||
      !isStringRecord(fingerprint.resources)
    ) {
      diffs.push(`Invalid immutable resource fingerprint for ${key}`);
      continue;
    }

    const resources = inputs?.sources[key]?.resources;
    if (!isStringRecord(resources)) {
      diffs.push(`Missing immutable resource provenance for ${key}`);
      continue;
    }

    const expectedPaths = Object.keys(fingerprint.resources).sort();
    const actualPaths = Object.keys(resources).sort();
    for (const resourcePath of expectedPaths) {
      const content = resources[resourcePath];
      if (content === undefined) {
        diffs.push(
          `Missing immutable resource provenance for ${key}/${resourcePath}`,
        );
        continue;
      }
      if (
        !isBase64(content) ||
        createHash('sha256')
          .update(Buffer.from(content, 'base64'))
          .digest('hex') !== fingerprint.resources[resourcePath]
      ) {
        diffs.push(`Immutable resource mismatch for ${key}/${resourcePath}`);
      }
    }
    for (const resourcePath of actualPaths) {
      if (!(resourcePath in fingerprint.resources))
        diffs.push(`Immutable resource mismatch for ${key}/${resourcePath}`);
    }
  }
  return diffs;
}

function rawSourceDiffs(
  manifest: Manifest,
  inputs: InputsSnapshot | null,
): string[] {
  if (manifest.schemaVersion !== 2 || manifest.inputProvenanceVersion !== 1)
    return [];
  const diffs: string[] = [];
  for (const skill of manifest.skills) {
    const key = `${skill.category}/${skill.skillName}`;
    const expected = manifest.sourceHashes?.[key];
    const source = inputs?.sources[key];
    if (!expected || !source) {
      diffs.push(`Missing immutable raw source provenance for ${key}`);
      continue;
    }
    const skillBase64 = source.skillMarkdownBase64;
    if (skillBase64 === undefined || !isBase64(skillBase64)) {
      diffs.push(`Missing immutable raw skill provenance for ${key}`);
    } else {
      const skillBytes = Buffer.from(skillBase64, 'base64');
      if (
        createHash('sha256').update(skillBytes).digest('hex') !== expected.skill
      )
        diffs.push(`Raw skill snapshot hash mismatch for ${key}`);
      if (source.skillMarkdown !== skillBytes.toString('utf8'))
        diffs.push(`Raw skill snapshot mismatch for ${key}`);
    }
    const evalsBase64 = source.evalsBase64;
    if (evalsBase64 === undefined || !isBase64(evalsBase64)) {
      diffs.push(`Missing immutable raw eval provenance for ${key}`);
      continue;
    }
    const evalsBytes = Buffer.from(evalsBase64, 'base64');
    if (
      createHash('sha256').update(evalsBytes).digest('hex') !== expected.evals
    )
      diffs.push(`Raw eval snapshot hash mismatch for ${key}`);
    try {
      if (
        JSON.stringify(JSON.parse(evalsBytes.toString('utf8'))) !==
        JSON.stringify(source.evals)
      )
        diffs.push(`Raw eval snapshot mismatch for ${key}`);
    } catch {
      diffs.push(`Invalid immutable raw eval JSON for ${key}`);
    }
  }
  return diffs;
}

function evalDataFor(
  projectRoot: string,
  runDir: string,
  skill: ManifestSkill,
): EvalsJson {
  const inputs = readInputs(runDir);
  if (inputs) {
    const source = inputs.sources[`${skill.category}/${skill.skillName}`];
    if (!source)
      throw new Error(
        `inputs.json is missing ${skill.category}/${skill.skillName}`,
      );
    return source.evals as EvalsJson;
  }
  const evalsPath = path.join(
    projectRoot,
    'skills',
    skill.category,
    skill.skillName,
    'evals',
    'evals.json',
  );
  return fs.existsSync(evalsPath)
    ? (fs.readJSONSync(evalsPath) as EvalsJson)
    : {};
}

function passRate(results: boolean[]): number {
  return results.length > 0
    ? results.filter(Boolean).length / results.length
    : 0;
}

function assertionRate(
  results: Array<{ passed: number; total: number }>,
): number {
  const total = results.reduce((sum, result) => sum + result.total, 0);
  return total > 0
    ? results.reduce((sum, result) => sum + result.passed, 0) / total
    : 0;
}

function triggerDecision(transcript: string): TriggerDecision | undefined {
  return transcript
    .match(/^\s*TRIGGER:\s*(yes|no)\s*$/im)?.[1]
    .toLowerCase() as TriggerDecision | undefined;
}

function summarizeSkill(
  projectRoot: string,
  runDir: string,
  manifest: Manifest,
  skill: ManifestSkill,
): ScoreSummary {
  const evalsData = evalDataFor(projectRoot, runDir, skill);
  const evalById = new Map(
    (evalsData.evals ?? []).map((evaluation) => [
      String(evaluation.id),
      evaluation,
    ]),
  );
  const pressureByIndex = evalsData.pressure_scenarios ?? [];
  // Mirror scripts/evals/scorer.ts: v2 runs resolve the semantics per skill from
  // provenance, falling back to the manifest default. Verifying a v2 run with v1
  // semantics reports diffs that are artefacts of this verifier, not real drift.
  const semanticsVersion: AssertionSemanticsVersion =
    manifest.schemaVersion === 2
      ? (manifest.provenance?.[`${skill.category}/${skill.skillName}`]
          ?.assertionSemanticsVersion ??
        manifest.assertionSemanticsVersion ??
        1)
      : 1;
  const baseline: boolean[] = [];
  const withSkill: boolean[] = [];
  const baselineAssertions: Array<{ passed: number; total: number }> = [];
  const withSkillAssertions: Array<{ passed: number; total: number }> = [];
  const positive: boolean[] = [];
  const negative: boolean[] = [];

  for (const currentCase of skill.cases) {
    if (currentCase.kind === 'trigger') {
      const transcript = readAnswer(runDir, manifest, skill, currentCase);
      if (transcript === null)
        throw new Error(`missing answer: ${skill.skillName}/${currentCase.id}`);
      const actual = triggerDecision(transcript);
      const expected = currentCase.expectedTrigger ?? 'no';
      if (expected === 'yes') positive.push(actual === 'yes');
      else negative.push(actual === 'no');
      continue;
    }
    const assertions =
      currentCase.kind === 'eval'
        ? (evalById.get(currentCase.id.replace('eval-', ''))?.assertions ?? [])
        : (
            pressureByIndex[Number(currentCase.id.replace('pressure-', '')) - 1]
              ?.behavior_assertions ?? []
          ).map((value) => ({ type: 'contains' as const, value }));
    for (const arm of ['baseline', 'with-skill'] as const) {
      if (!(arm in currentCase.arms)) continue;
      const transcript = readAnswer(runDir, manifest, skill, currentCase, arm);
      if (transcript === null)
        throw new Error(
          `missing answer: ${skill.skillName}/${currentCase.id}.${arm}`,
        );
      const checks = assertions.map((assertion) =>
        checkAssertion(assertion, transcript, semanticsVersion),
      );
      const passed = checks.every(Boolean);
      (arm === 'baseline' ? baseline : withSkill).push(passed);
      (arm === 'baseline' ? baselineAssertions : withSkillAssertions).push({
        passed: checks.filter(Boolean).length,
        total: checks.length,
      });
    }
  }

  const baselineCompromised =
    manifest.compromisedSkills?.some(
      (record) =>
        record.category === skill.category &&
        record.skillName === skill.skillName &&
        record.arm === 'baseline',
    ) ?? false;
  const baselinePassRate = passRate(baseline);
  const withSkillPassRate = passRate(withSkill);
  const triggerRecall =
    positive.length > 0
      ? positive.filter(Boolean).length / positive.length
      : null;
  const triggerSpecificity =
    negative.length > 0
      ? negative.filter(Boolean).length / negative.length
      : null;
  const balancedTriggerAccuracy =
    triggerRecall === null || triggerSpecificity === null
      ? null
      : (triggerRecall + triggerSpecificity) / 2;
  return {
    baselinePassRate: baselineCompromised ? 'n/a' : baselinePassRate,
    withSkillPassRate,
    delta: baselineCompromised ? 'n/a' : withSkillPassRate - baselinePassRate,
    casePassRate: {
      baseline: baselineCompromised ? 'n/a' : baselinePassRate,
      withSkill: withSkillPassRate,
    },
    assertionPassRate: {
      baseline: baselineCompromised ? 'n/a' : assertionRate(baselineAssertions),
      withSkill: assertionRate(withSkillAssertions),
    },
    triggerRecall,
    triggerSpecificity,
    balancedTriggerAccuracy,
  };
}

function compareMetric(
  diffs: string[],
  name: string,
  committed: unknown,
  recomputed: unknown,
): void {
  if (JSON.stringify(committed) !== JSON.stringify(recomputed))
    diffs.push(
      `${name} committed=${JSON.stringify(committed)} recomputed=${JSON.stringify(recomputed)}`,
    );
}

export function verifyEvalRun(
  projectRoot: string,
  runId: string,
): EvalsVerifyOutcome {
  const runDir = path.join(projectRoot, 'benchmarks', 'evals', 'runs', runId);
  const resultsPath = path.join(runDir, 'results.json');
  const manifestPath = path.join(runDir, 'manifest.json');
  if (!fs.existsSync(runDir))
    return { runId, ok: false, reason: `run directory not found: ${runDir}` };
  if (!fs.existsSync(resultsPath) || !fs.existsSync(manifestPath))
    return {
      runId,
      ok: false,
      reason: 'run is missing manifest.json or results.json',
    };

  const manifest = fs.readJSONSync(manifestPath) as Manifest;
  const inputs = readInputs(runDir);
  if (manifest.schemaVersion === 2 && inputs === null)
    return {
      runId,
      ok: false,
      reason: 'v2 run is missing immutable inputs.json',
    };
  const provenanceDiffs = [
    ...resourceFingerprintDiffs(manifest, inputs),
    ...rawSourceDiffs(manifest, inputs),
  ];
  if (provenanceDiffs.length > 0)
    return {
      runId,
      ok: false,
      reason: 'immutable source provenance differs from manifest',
      diffs: provenanceDiffs,
    };
  const committed = fs.readJSONSync(resultsPath) as {
    schemaVersion?: 1 | 2;
    skills: CommittedSkill[];
  };
  const diffs: string[] = [];
  for (const skill of manifest.skills) {
    let recomputed: ScoreSummary;
    try {
      recomputed = summarizeSkill(projectRoot, runDir, manifest, skill);
    } catch (error) {
      diffs.push(
        `${skill.skillName}: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    const committedSkill = committed.skills.find(
      (entry) =>
        entry.skillName === skill.skillName &&
        (!entry.category || entry.category === skill.category),
    );
    if (!committedSkill) {
      diffs.push(`${skill.skillName}: missing from committed results.json`);
      continue;
    }
    if (manifest.schemaVersion === 2 || committed.schemaVersion === 2) {
      compareMetric(
        diffs,
        `${skill.skillName}.baselinePassRate`,
        committedSkill.baselinePassRate,
        recomputed.baselinePassRate,
      );
      compareMetric(
        diffs,
        `${skill.skillName}.withSkillPassRate`,
        committedSkill.withSkillPassRate,
        recomputed.withSkillPassRate,
      );
      compareMetric(
        diffs,
        `${skill.skillName}.delta`,
        committedSkill.delta,
        recomputed.delta,
      );
      compareMetric(
        diffs,
        `${skill.skillName}.casePassRate`,
        committedSkill.casePassRate,
        recomputed.casePassRate,
      );
      compareMetric(
        diffs,
        `${skill.skillName}.assertionPassRate`,
        committedSkill.assertionPassRate,
        recomputed.assertionPassRate,
      );
      compareMetric(
        diffs,
        `${skill.skillName}.triggerRecall`,
        committedSkill.triggerRecall,
        recomputed.triggerRecall,
      );
      compareMetric(
        diffs,
        `${skill.skillName}.triggerSpecificity`,
        committedSkill.triggerSpecificity,
        recomputed.triggerSpecificity,
      );
      compareMetric(
        diffs,
        `${skill.skillName}.balancedTriggerAccuracy`,
        committedSkill.balancedTriggerAccuracy,
        recomputed.balancedTriggerAccuracy,
      );
    } else {
      compareMetric(
        diffs,
        `${skill.skillName}.baselinePassRate`,
        committedSkill.baselinePassRate,
        recomputed.baselinePassRate,
      );
      compareMetric(
        diffs,
        `${skill.skillName}.withSkillPassRate`,
        committedSkill.withSkillPassRate,
        recomputed.withSkillPassRate,
      );
    }
  }
  return diffs.length > 0
    ? {
        runId,
        ok: false,
        reason: 'recomputed scores differ from committed results.json',
        diffs,
      }
    : { runId, ok: true };
}

export function listEvalRuns(projectRoot: string): string[] {
  const runsDir = path.join(projectRoot, 'benchmarks', 'evals', 'runs');
  if (!fs.existsSync(runsDir)) return [];
  return fs
    .readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function readEvalsReport(projectRoot: string): string | null {
  const reportPath = path.join(projectRoot, 'evals-report.md');
  return fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8') : null;
}
