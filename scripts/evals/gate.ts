// Regression gate: applies readiness.ts thresholds to a scored run and
// reports pass/breach direction against the last recorded history baseline
// for the same category. See docs/EVALS.md "Regression gate" for the
// end-to-end contract and why the frozen absolute promotion snapshot in
// benchmarks/evals/history.json is not itself the gate target.
import fs from "fs-extra";
import * as path from "node:path";
import {
  INPUTS_FILENAME,
  MANIFEST_FILENAME,
  RESULTS_FILENAME,
} from "./constants";
import { skillProtocolVersion } from "./impact";
import {
  caseDefinitionFingerprint,
  evalCaseDefinitions,
  type EvalsJson,
} from "./manifest";
import { evaluateSkillReadiness } from "./readiness";
import {
  resolveActivationEvidenceVersion,
  resolveAssertionSemanticsVersion,
} from "./scorer";
import type {
  ArmName,
  CaseScore,
  EvalsHistory,
  EvalsHistoryRecord,
  Manifest,
  RunInputsV2,
  RunResults,
} from "./types";

export interface GateSkillBreach {
  category: string;
  skillName: string;
  failures: string[];
}

export type GateTrendDirection =
  | "improved"
  | "regressed"
  | "unchanged"
  | "no-prior-data";

export interface GateTrend {
  metric: "avgWithSkillPassRate";
  previousRunId: string | null;
  previousValue: number | null;
  currentValue: number;
  direction: GateTrendDirection;
}

export type CaseComparisonState = "compared" | "no-baseline" | "unavailable";

/** One comparable case-arm that passed in the baseline run and fails now. */
export interface CaseFlip {
  category: string;
  skillName: string;
  caseId: string;
  kind: CaseScore["kind"];
  arm: ArmName;
  failedAssertions: string[];
}

/**
 * Report-only comparison of a run's case-arms against its declared
 * `baselineRunId`. It never feeds `ready`, `ok`, breaches, trend or the exit
 * code.
 */
export interface CaseComparison {
  state: CaseComparisonState;
  baselineRunId: string | null;
  /** Why no comparison was possible; `null` unless state is `unavailable`. */
  reason: string | null;
  passToFail: CaseFlip[];
  failToPass: number;
  unchanged: number;
  excluded: number;
  protocolMismatch: number;
  protocolUnresolved: number;
  definitionChanged: number;
  added: number;
  removed: number;
}

export interface GateComparisonOptions {
  runsDir: string;
  runId?: string;
}

export interface GateRunOutcome {
  runId: string;
  category: string;
  ready: boolean;
  skillCount: number;
  breachedCount: number;
  breaches: GateSkillBreach[];
  trend: GateTrend;
  caseComparison: CaseComparison;
}

export interface GateReport {
  ok: boolean;
  message: string;
  runs: GateRunOutcome[];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function emptyComparison(
  state: CaseComparisonState,
  baselineRunId: string | null,
  reason: string | null,
): CaseComparison {
  return {
    state,
    baselineRunId,
    reason,
    passToFail: [],
    failToPass: 0,
    unchanged: 0,
    excluded: 0,
    protocolMismatch: 0,
    protocolUnresolved: 0,
    definitionChanged: 0,
    added: 0,
    removed: 0,
  };
}

/** One scored case-arm, identified by category, skill, case id and arm. */
interface CaseArm {
  category: string;
  skillName: string;
  caseId: string;
  kind: CaseScore["kind"];
  arm: ArmName;
  score: CaseScore;
}

type DefinitionMap = Map<string, Map<string, string>>;

interface ComparisonEvidence {
  currentResults: RunResults;
  baselineResults: RunResults;
  currentManifest: Manifest;
  baselineManifest: Manifest;
  currentDefinitions: DefinitionMap;
  baselineDefinitions: DefinitionMap;
}

type NotComparableReason =
  | "excluded"
  | "protocolMismatch"
  | "protocolUnresolved"
  | "definitionChanged";

function caseArmsOf(results: RunResults): Map<string, CaseArm> {
  const arms = new Map<string, CaseArm>();
  for (const skill of results.skills) {
    for (const score of skill.scores) {
      const arm: CaseArm = {
        category: skill.category,
        skillName: skill.skillName,
        caseId: score.id,
        kind: score.kind,
        arm: score.arm,
        score,
      };
      arms.set(
        [skill.category, skill.skillName, score.id, score.arm].join("\u0000"),
        arm,
      );
    }
  }
  return arms;
}

function readRunJson<T>(runsDir: string, runId: string, filename: string): T {
  const filePath = path.join(runsDir, runId, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${runId} has no ${filename}`);
  }
  try {
    return fs.readJSONSync(filePath) as T;
  } catch {
    throw new Error(`Cannot parse ${filePath}`);
  }
}

function definitionsOf(inputs: RunInputsV2): DefinitionMap {
  const definitions: DefinitionMap = new Map();
  for (const [key, source] of Object.entries(inputs.sources ?? {})) {
    const byCase = new Map<string, string>();
    try {
      for (const definition of evalCaseDefinitions(source.evals as EvalsJson)) {
        byCase.set(definition.id, caseDefinitionFingerprint(definition));
      }
    } catch {
      // Unresolvable definitions make this skill's cases definition-changed.
    }
    definitions.set(key, byCase);
  }
  return definitions;
}

/**
 * A declared baseline must be a single run-store name that resolves inside
 * `runsDir`; otherwise evidence outside the store could be presented as the
 * baseline.
 */
function assertBaselineRunId(runsDir: string, baselineRunId: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(baselineRunId)) {
    throw new Error(
      `baselineRunId ${JSON.stringify(baselineRunId)} is not a single run-store name`,
    );
  }
  const root = path.resolve(runsDir);
  if (!path.resolve(root, baselineRunId).startsWith(`${root}${path.sep}`)) {
    throw new Error(
      `baselineRunId ${baselineRunId} resolves outside the run store`,
    );
  }
}

function comparisonScoreInvalid(score: CaseScore): boolean {
  return (
    typeof score.id !== "string" ||
    typeof score.kind !== "string" ||
    typeof score.arm !== "string" ||
    typeof score.passed !== "boolean" ||
    typeof score.missingAnswer !== "boolean" ||
    !Array.isArray(score.failedAssertions) ||
    score.failedAssertions.some((entry) => typeof entry !== "string")
  );
}

/** Malformed score data makes the comparison unavailable, never a later throw. */
function assertComparisonScores(results: RunResults): void {
  if (!Array.isArray(results.skills)) {
    throw new Error(`${results.runId} has no skill results array`);
  }
  results.skills.forEach((skill, skillIndex) => {
    if (!Array.isArray(skill.scores)) {
      throw new Error(
        `${results.runId} has no score array at skills[${skillIndex}]`,
      );
    }
    skill.scores.forEach((score, scoreIndex) => {
      if (comparisonScoreInvalid(score)) {
        throw new Error(
          `${results.runId} has a malformed case score at skills[${skillIndex}].scores[${scoreIndex}]`,
        );
      }
    });
  });
}

function loadComparisonEvidence(
  runsDir: string,
  results: RunResults,
  currentRunId: string,
  baselineRunId: string,
): ComparisonEvidence {
  assertBaselineRunId(runsDir, baselineRunId);
  if (results.runId !== currentRunId) {
    throw new Error(
      `${currentRunId} declares runId ${JSON.stringify(results.runId)} in results.json`,
    );
  }
  const read = <T,>(runId: string, filename: string): T =>
    readRunJson<T>(runsDir, runId, filename);
  const baselineResults = read<RunResults>(baselineRunId, RESULTS_FILENAME);
  assertComparisonScores(results);
  assertComparisonScores(baselineResults);
  if (baselineResults.runId !== baselineRunId) {
    throw new Error(
      `${baselineRunId} declares runId ${JSON.stringify(baselineResults.runId)} in results.json`,
    );
  }
  return {
    currentResults: results,
    baselineResults,
    currentManifest: read<Manifest>(currentRunId, MANIFEST_FILENAME),
    baselineManifest: read<Manifest>(baselineRunId, MANIFEST_FILENAME),
    currentDefinitions: definitionsOf(
      read<RunInputsV2>(currentRunId, INPUTS_FILENAME),
    ),
    baselineDefinitions: definitionsOf(
      read<RunInputsV2>(baselineRunId, INPUTS_FILENAME),
    ),
  };
}

function definitionFingerprint(
  definitions: DefinitionMap,
  arm: CaseArm,
): string | undefined {
  return definitions
    .get(`${arm.category}/${arm.skillName}`)
    ?.get(arm.caseId);
}

function isCompromised(results: RunResults, arm: CaseArm): boolean {
  return (results.compromisedSkills ?? []).some(
    (record) =>
      record.category === arm.category &&
      record.skillName === arm.skillName &&
      record.arm === arm.arm,
  );
}

/**
 * Canonical effective protocol for one case-arm, or `null` when a component
 * this case kind needs is unresolved. Two unresolved values never compare
 * equal.
 */
function resolvedProtocolKey(
  manifest: Manifest,
  arm: CaseArm,
): string | null {
  const instruction =
    manifest.schemaVersion === 2
      ? skillProtocolVersion(manifest, `${arm.category}/${arm.skillName}`)
      : undefined;
  const semantics = resolveAssertionSemanticsVersion(
    manifest,
    `${arm.category}/${arm.skillName}`,
  );
  const activation = resolveActivationEvidenceVersion(
    manifest,
    `${arm.category}/${arm.skillName}`,
  );
  if (instruction === undefined || semantics === undefined) return null;
  if (arm.kind === "trigger" && activation === undefined) return null;
  return JSON.stringify([
    instruction,
    semantics,
    arm.kind === "trigger" ? activation : null,
  ]);
}

function protocolVerdict(
  evidence: ComparisonEvidence,
  current: CaseArm,
  baseline: CaseArm,
): NotComparableReason | null {
  const currentProtocol = resolvedProtocolKey(evidence.currentManifest, current);
  const baselineProtocol = resolvedProtocolKey(
    evidence.baselineManifest,
    baseline,
  );
  if (currentProtocol !== null && baselineProtocol !== null) {
    return currentProtocol === baselineProtocol ? null : "protocolMismatch";
  }
  return "protocolUnresolved";
}

function notComparableReason(
  evidence: ComparisonEvidence,
  current: CaseArm,
  baseline: CaseArm,
): NotComparableReason | null {
  if (current.score.missingAnswer || baseline.score.missingAnswer) {
    return "excluded";
  }
  if (
    isCompromised(evidence.currentResults, current) ||
    isCompromised(evidence.baselineResults, baseline)
  ) {
    return "excluded";
  }
  const protocol = protocolVerdict(evidence, current, baseline);
  if (protocol !== null) return protocol;
  const defined = definitionFingerprint(evidence.currentDefinitions, current);
  const previous = definitionFingerprint(evidence.baselineDefinitions, baseline);
  if (
    defined === undefined ||
    previous === undefined ||
    defined !== previous
  ) {
    return "definitionChanged";
  }
  return null;
}

function recordOutcome(
  comparison: CaseComparison,
  reason: NotComparableReason | null,
  baseline: CaseArm,
  current: CaseArm,
): void {
  if (reason === "excluded") comparison.excluded += 1;
  else if (reason === "protocolMismatch") comparison.protocolMismatch += 1;
  else if (reason === "protocolUnresolved") comparison.protocolUnresolved += 1;
  else if (reason === "definitionChanged") comparison.definitionChanged += 1;
  else if (baseline.score.passed && !current.score.passed) {
    comparison.passToFail.push({
      category: current.category,
      skillName: current.skillName,
      caseId: current.caseId,
      kind: current.kind,
      arm: current.arm,
      failedAssertions: [...current.score.failedAssertions],
    });
  } else if (!baseline.score.passed && current.score.passed) {
    comparison.failToPass += 1;
  } else {
    comparison.unchanged += 1;
  }
}

function compareEvidence(
  evidence: ComparisonEvidence,
  baselineRunId: string,
): CaseComparison {
  const comparison = emptyComparison("compared", baselineRunId, null);
  const currentArms = caseArmsOf(evidence.currentResults);
  const baselineArms = caseArmsOf(evidence.baselineResults);
  for (const [key, current] of currentArms) {
    const baseline = baselineArms.get(key);
    if (!baseline) {
      comparison.added += 1;
      continue;
    }
    recordOutcome(
      comparison,
      notComparableReason(evidence, current, baseline),
      baseline,
      current,
    );
  }
  for (const key of baselineArms.keys()) {
    if (!currentArms.has(key)) comparison.removed += 1;
  }
  return comparison;
}

/**
 * Compare case-arms against the run's declared baseline. Every read and
 * computation is contained: a failure becomes state `unavailable` with a
 * reason, never a thrown error and never a changed gate result.
 */
export function compareCases(
  runsDir: string,
  results: RunResults,
  currentRunId = results.runId,
): CaseComparison {
  const declaredBaseline: unknown = results.baselineRunId;
  if (declaredBaseline === undefined || declaredBaseline === null) {
    return emptyComparison("no-baseline", null, null);
  }
  if (typeof declaredBaseline !== "string") {
    return emptyComparison(
      "unavailable",
      null,
      "baselineRunId must be a string",
    );
  }
  try {
    const evidence = loadComparisonEvidence(
      runsDir,
      results,
      currentRunId,
      declaredBaseline,
    );
    return compareEvidence(evidence, declaredBaseline);
  } catch (error) {
    return emptyComparison(
      "unavailable",
      declaredBaseline,
      error instanceof Error ? error.message : String(error),
    );
  }
}

/** Text lines describing one comparison, for the human-readable gate output. */
export function formatCaseComparison(comparison: CaseComparison): string[] {
  const against = comparison.baselineRunId
    ? ` against ${comparison.baselineRunId}`
    : "";
  const reason = comparison.reason ? ` (${comparison.reason})` : "";
  const lines = [`case comparison: ${comparison.state}${against}${reason}`];
  if (comparison.state === "compared") {
    for (const flip of comparison.passToFail) {
      const failed = flip.failedAssertions.join("; ");
      lines.push(
        `- pass-to-fail ${flip.category}/${flip.skillName} ${flip.caseId} ${flip.arm}${failed ? `: ${failed}` : ""}`,
      );
    }
    lines.push(
      `- totals: ${comparison.passToFail.length} pass-to-fail, ${comparison.failToPass} fail-to-pass, ${comparison.unchanged} unchanged, ${comparison.added} added, ${comparison.removed} removed, ${comparison.excluded} excluded, ${comparison.protocolMismatch} protocol-mismatch, ${comparison.protocolUnresolved} protocol-unresolved, ${comparison.definitionChanged} definition-changed`,
    );
  }
  return lines;
}

/** Most recent history record for `category`, strictly before `beforeDate`, excluding `excludeRunId`. */
export function findPreviousHistoryRecord(
  history: EvalsHistory,
  category: string,
  excludeRunId: string,
  beforeDate?: string,
): EvalsHistoryRecord | null {
  const candidates = history.records
    .filter(
      (record) =>
        record.runId !== excludeRunId &&
        record.category === category &&
        (beforeDate ? record.date < beforeDate : true),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return candidates[0] ?? null;
}

/** Apply readiness thresholds to one scored run's results.json and diff against prior history. */
export function gateResults(
  results: RunResults,
  history: EvalsHistory,
  comparisonOptions?: GateComparisonOptions,
): GateRunOutcome {
  const breaches: GateSkillBreach[] = [];
  for (const skill of results.skills) {
    const compromised =
      results.compromisedSkills?.some(
        (record) =>
          record.category === skill.category &&
          record.skillName === skill.skillName &&
          record.arm === "baseline",
      ) ?? false;
    const readiness = evaluateSkillReadiness(skill, { compromised });
    if (!readiness.ready) {
      breaches.push({
        category: skill.category,
        skillName: skill.skillName,
        failures: readiness.failures,
      });
    }
  }
  const currentValue = average(results.skills.map((s) => s.withSkillPassRate));
  const previous = findPreviousHistoryRecord(
    history,
    results.category,
    results.runId,
    results.scoredAt,
  );
  const trend: GateTrend = previous
    ? {
        metric: "avgWithSkillPassRate",
        previousRunId: previous.runId,
        previousValue: previous.avgWithSkillPassRate,
        currentValue,
        direction:
          currentValue > previous.avgWithSkillPassRate + 1e-9
            ? "improved"
            : currentValue < previous.avgWithSkillPassRate - 1e-9
              ? "regressed"
              : "unchanged",
      }
    : {
        metric: "avgWithSkillPassRate",
        previousRunId: null,
        previousValue: null,
        currentValue,
        direction: "no-prior-data",
      };
  return {
    runId: results.runId,
    category: results.category,
    ready: breaches.length === 0,
    skillCount: results.skills.length,
    breachedCount: breaches.length,
    breaches,
    trend,
    caseComparison: comparisonOptions
      ? compareCases(
          comparisonOptions.runsDir,
          results,
          comparisonOptions.runId ?? results.runId,
        )
      : results.baselineRunId !== undefined &&
          results.baselineRunId !== null
        ? emptyComparison(
            "unavailable",
            typeof results.baselineRunId === "string"
              ? results.baselineRunId
              : null,
            "comparison needs the run directory",
          )
        : emptyComparison("no-baseline", null, null),
  };
}

/** Physical run directories with a results.json that history.json has not already recorded. */
export function pendingGateRunIds(
  runsDir: string,
  history: EvalsHistory,
): string[] {
  if (!fs.existsSync(runsDir)) return [];
  const historyRunIds = new Set(history.records.map((record) => record.runId));
  return fs
    .readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((runId) => {
      if (historyRunIds.has(runId)) return false;
      return fs.existsSync(path.join(runsDir, runId, RESULTS_FILENAME));
    })
    .sort();
}

export function loadResults(runsDir: string, runId: string): RunResults | null {
  const resultsPath = path.join(runsDir, runId, RESULTS_FILENAME);
  if (!fs.existsSync(resultsPath)) return null;
  return fs.readJSONSync(resultsPath) as RunResults;
}

/**
 * Gate every pending run (a scored run not yet recorded in history.json).
 * A canonical/promoted run already present in history is not re-gated here;
 * it was already reviewed through `evals:promote`. Nothing pending is a
 * pass, not a failure, so CI can wire this in immediately.
 */
export function gateAll(
  runsDir: string,
  history: EvalsHistory,
): GateReport {
  const pending = pendingGateRunIds(runsDir, history);
  if (pending.length === 0) {
    return {
      ok: true,
      message:
        "No scored run available to gate: every run under benchmarks/evals/runs is already recorded in history.json.",
      runs: [],
    };
  }
  const runs = pending.map((runId) => {
    const results = loadResults(runsDir, runId);
    if (!results) {
      throw new Error(`Expected results.json for pending run ${runId}`);
    }
    return gateResults(results, history, { runsDir, runId });
  });
  return {
    ok: runs.every((run) => run.ready),
    message: `Gated ${runs.length} pending run(s).`,
    runs,
  };
}

/** Gate one explicit run id. Missing results.json is reported as nothing to gate, not an error. */
export function gateOne(
  runsDir: string,
  runId: string,
  history: EvalsHistory,
): GateReport {
  const results = loadResults(runsDir, runId);
  if (!results) {
    return {
      ok: true,
      message: `No scored run available: ${runId} has no results.json.`,
      runs: [],
    };
  }
  const outcome = gateResults(results, history, { runsDir, runId });
  return {
    ok: outcome.ready,
    message: `Gated ${runId}.`,
    runs: [outcome],
  };
}
