/**
 * Types for the executable task-evaluation pilot.
 *
 * This harness provides an opt-in, runnable benchmark that compares guidance arms
 * (minimal, current, candidate) on identical tasks, runtime capabilities, verifiers,
 * and starting fixtures.
 */

export type TaskSplit = "calibration" | "holdout";

export type GuidanceArm = "minimal" | "current" | "candidate";

export const GUIDANCE_ARMS: readonly GuidanceArm[] = [
  "minimal",
  "current",
  "candidate",
] as const;

export interface TaskGuidancePaths {
  minimal: string;
  current: string;
  candidate: string;
}

export interface TaskVerifierConfig {
  executable: string;
  args: string[];
  timeoutMs?: number;
  scriptHash: string;
}

export interface TaskDefinition {
  id: string;
  split: TaskSplit;
  fixtureDir: string;
  prompt: string;
  guidance: TaskGuidancePaths;
  verifier: TaskVerifierConfig;
}

export interface TaskManifest {
  schemaVersion: number;
  description?: string;
  tasks: TaskDefinition[];
}

export interface WorkerConfig {
  executable: string;
  args: string[];
  model: string;
  effort: string;
  timeoutMs: number;
}

export interface TaskRunOptions {
  manifestPath: string;
  workerConfigPath: string;
  outputDir: string;
  repeat?: number;
  split?: TaskSplit;
  keepWorkspaces?: boolean;
}

export interface ExitOutcomes {
  workerExitCode: number | null;
  workerSignal: string | null;
  verifierExitCode: number | null;
  verifierSignal: string | null;
  workerTimedOut: boolean;
  verifierTimedOut: boolean;
  timedOut: boolean;
  infrastructureError: string | null;
  verifierTampered: boolean;
  promptTampered: boolean;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
}

export interface WallTimeMs {
  workerMs: number;
  verifierMs: number;
  totalMs: number;
}

export interface EvidencePaths {
  promptFile: string;
  workerStdout: string;
  workerStderr: string;
  verifierStdout: string;
  verifierStderr: string;
}

export interface TaskRunResult {
  schemaVersion: 1;
  taskId: string;
  split: TaskSplit;
  arm: GuidanceArm;
  repetition: number;
  model: string;
  effort: string;
  configHash: string;
  promptHash: string;
  fixtureHash: string;
  guidanceHash: string;
  verifierHashBefore: string;
  verifierHashAfter: string;
  exitOutcomes: ExitOutcomes;
  wallTimeMs: WallTimeMs;
  evidencePaths: EvidencePaths;
  success: boolean;
  usage: null;
  cost: null;
  startedAt: string;
  completedAt: string;
}

export interface TaskArmSummary {
  /** All attempts for this arm, including infrastructure failures. */
  total: number;
  /** Runs with usable product-evaluation evidence. */
  evaluated: number;
  infrastructureErrors: number;
  successful: number;
  /** Product failures among evaluated runs only. */
  failed: number;
  /** Timeout outcomes, including runs that also failed infrastructure checks. */
  timedOut: number;
  /** Null when no runs for this arm produced usable evaluation evidence. */
  passRate: number | null;
  /** Average wall time among evaluated runs, or null when none were evaluated. */
  avgWallMs: number | null;
}

export interface TaskSummary {
  /** All attempts for this task, including infrastructure failures. */
  total: number;
  evaluated: number;
  infrastructureErrors: number;
  successful: number;
  /** Product failures among evaluated runs only. */
  failed: number;
  /** Timeout outcomes, including runs that also failed infrastructure checks. */
  timedOut: number;
  /** Null when no runs for this task produced usable evaluation evidence. */
  passRate: number | null;
}

export interface TaskSuiteSummary {
  schemaVersion: 1;
  manifestPath: string;
  workerConfig: {
    executable: string;
    model: string;
    effort: string;
    timeoutMs: number;
    configHash: string;
  };
  repeat: number;
  splitFilter: TaskSplit | "all";
  startedAt: string;
  completedAt: string;
  /** All runs, including infrastructure failures. */
  totalRuns: number;
  /** Runs with valid evidence for measuring product behavior. */
  evaluatedRuns: number;
  successfulRuns: number;
  /** Product failures among evaluated runs only. */
  failedRuns: number;
  /** Timed-out attempts, independent of evaluation/infrastructure classification. */
  timedOutRuns: number;
  infrastructureErrorRuns: number;
  /** Null when the suite contains no evaluable runs. */
  overallPassRate: number | null;
  byArm: Record<GuidanceArm, TaskArmSummary>;
  byTask: Record<string, TaskSummary>;
  runs: TaskRunResult[];
}
