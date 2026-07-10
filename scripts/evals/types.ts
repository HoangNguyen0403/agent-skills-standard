// Shared types for the live eval-run system (manifest -> answers -> score -> report).
// See docs/EVALS.md for the end-to-end protocol these types support.

export type ArmName = 'baseline' | 'with-skill';
export type ArmStatus = 'pending' | 'done';

export interface EvalCaseRef {
  /** Stable id within a skill, e.g. "eval-1", "trigger-2", "pressure-1". */
  id: string;
  kind: 'eval' | 'trigger' | 'pressure';
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
  startedAt?: string;
  completedAt?: string;
}

export interface Manifest {
  runId: string;
  category: string;
  version: string;
  createdAt: string;
  metadata: RunMetadata;
  skills: ManifestSkill[];
}

export type AssertionType = 'contains' | 'not_contains' | 'file_reference';

export interface Assertion {
  type: AssertionType;
  value: string;
}

export interface CaseScore {
  id: string;
  kind: 'eval' | 'trigger' | 'pressure';
  arm: ArmName;
  passed: boolean;
  missingAnswer: boolean;
  suspicious: string[]; // reasons this transcript looks copied/gamed
  failedAssertions: string[];
}

export interface SkillResult {
  category: string;
  skillName: string;
  guardrailApplicable: boolean;
  totalEvalCases: number;
  baselinePassRate: number; // 0-1, evals + pressure cases only (trigger excluded)
  withSkillPassRate: number; // 0-1
  delta: number; // withSkillPassRate - baselinePassRate
  triggerPrecision: number | null; // 0-1, null if no should_not_trigger cases
  scores: CaseScore[];
  incompleteArms: string[]; // "eval-2.baseline" etc — answers missing at score time
}

export interface RunResults {
  runId: string;
  category: string;
  version: string;
  scoredAt: string;
  metadata: RunMetadata;
  skills: SkillResult[];
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
