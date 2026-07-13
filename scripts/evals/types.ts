// Shared types for the live eval-run system (manifest -> answers -> score -> report).
// See docs/EVALS.md for the end-to-end protocol these types support.

export type ArmName = "baseline" | "with-skill";
export type ArmStatus = "pending" | "done";
export type SchemaVersion = 1 | 2;
export type RunScopeKind = "category" | "all" | "selective";
export type MetricValue = number | "n/a";
export type TriggerDecision = "yes" | "no";

export interface EvalCaseRef {
  /** Stable id within a skill, e.g. "eval-1", "trigger-2", "pressure-1". */
  id: string;
  kind: "eval" | "trigger" | "pressure";
  /** The expected decision for v2 trigger cases; v1 cases default to "no". */
  expectedTrigger?: TriggerDecision;
  /** Arms that must be answered. Trigger cases are single-arm. */
  arms: Partial<Record<ArmName, ArmStatus>>;
}

export interface ManifestSkill {
  category: string;
  skillName: string;
  skillPath: string; // relative to repo root, e.g. skills/dart/dart-tooling/SKILL.md
  guardrailApplicable: boolean;
  cases: EvalCaseRef[];
}

export interface RunMetadata {
  agent?: string; // e.g. "Claude Code", "GitHub Copilot"
  model?: string; // e.g. "claude-sonnet-5"
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
  startedAt?: string;
  completedAt?: string;
}

export interface RunScope {
  kind: RunScopeKind;
  categories: string[];
}

export interface GenerationProtocol {
  isolation: "worker-per-arm";
  baseline: "prompt-only";
  withSkill: "prompt-plus-skill";
  trigger: "name-description-only";
}

export interface SourceHash {
  skill: string;
  evals: string;
}

export interface CompromisedSkillRecord {
  category: string;
  skillName: string;
  arm: ArmName;
  reason: "baseline-compromised" | "generation-protocol-violation";
}

export interface ManifestBase {
  runId: string;
  category: string;
  version: string;
  createdAt?: string;
  metadata: RunMetadata;
  skills: ManifestSkill[];
}

export interface ManifestV1 extends ManifestBase {
  schemaVersion?: 1;
}

export interface ManifestV2 extends ManifestBase {
  schemaVersion: 2;
  scope: RunScope;
  protocol: GenerationProtocol;
  sourceHashes: Record<string, SourceHash>;
  compromisedSkills: CompromisedSkillRecord[];
  /** Immutable source run used to populate reused prompt-only evidence. */
  baselineRunId?: string;
  /** Trigger transcript protocol; legacy runs are not reused for activation evidence. */
  activationEvidenceVersion?: 2 | 3;
}

export type Manifest = ManifestV1 | ManifestV2;

export type AssertionType =
  | "contains"
  | "contains_any"
  | "not_contains"
  | "regex"
  | "file_reference";

export interface Assertion {
  type: AssertionType;
  value: string | string[];
}

export interface ArmRates {
  baseline: MetricValue;
  withSkill: MetricValue;
}

export interface CaseScore {
  id: string;
  kind: "eval" | "trigger" | "pressure";
  arm: ArmName;
  passed: boolean;
  missingAnswer: boolean;
  suspicious: string[]; // reasons this transcript looks copied/gamed
  failedAssertions: string[];
  expectedTrigger?: TriggerDecision;
  actualTrigger?: TriggerDecision;
  passedAssertions?: number;
  totalAssertions?: number;
}

export interface SkillResult {
  category: string;
  skillName: string;
  guardrailApplicable: boolean;
  totalEvalCases: number;
  baselinePassRate: MetricValue; // v1-compatible alias for casePassRate.baseline
  withSkillPassRate: number; // 0-1
  delta: MetricValue; // withSkillPassRate - baselinePassRate
  triggerPrecision: number | null; // v1-compatible alias for triggerSpecificity
  casePassRate?: ArmRates;
  assertionPassRate?: ArmRates;
  triggerRecall?: number | null;
  triggerSpecificity?: number | null;
  balancedTriggerAccuracy?: number | null;
  scores: CaseScore[];
  incompleteArms: string[]; // "eval-2.baseline" etc — answers missing at score time
}

export interface RunResults {
  schemaVersion?: SchemaVersion;
  runId: string;
  category: string;
  version: string;
  scoredAt: string;
  metadata: RunMetadata;
  scope?: RunScope;
  compromisedSkills?: CompromisedSkillRecord[];
  skills: SkillResult[];
}

export interface RunInputSource {
  category: string;
  skillName: string;
  skillPath: string;
  evalsPath: string;
  hashes: SourceHash;
  skillMarkdown: string;
  evals: Record<string, unknown>;
}

export interface RunInputsV2 {
  schemaVersion: 2;
  runId: string;
  capturedAt: string;
  sources: Record<string, RunInputSource>;
}

export interface EvalsHistoryRecord {
  runId: string;
  category: string;
  version: string;
  date: string;
  skillCount: number;
  avgBaselinePassRate: number;
  avgWithSkillPassRate: number;
  avgDelta: number;
  agent?: string;
  model?: string;
}

export interface EvalsHistory {
  lastUpdated: string;
  records: EvalsHistoryRecord[];
}
