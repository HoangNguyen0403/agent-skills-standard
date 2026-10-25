import crypto from 'crypto';
import { resolveLogicalProjectId } from './FleetPolicyService';
import { FleetLedger } from './FleetLedger';
import { RuntimeStore } from './RuntimeStore';
import {
  Attempt,
  canonicalDigest,
  canonicalJSON,
  EvaluationRecord,
  ExecutionBinding,
  evaluationRuntimeDigest,
  FleetConfig,
  FleetTask,
  FrozenEvaluationPlan,
  FrozenEvaluationPlanSchema,
  HarnessError,
  parseFleetConfig,
  parseFleetTask,
  policyDigest,
  resolveHostRuntime,
  RunResult,
  RunResultSchema,
} from './RuntimeTypes';

export interface StrictEvidenceSummary {
  attemptId: string;
  runId: string;
  budgetId: string;
  taskDigest: string;
  hostId: string;
  projectId: string;
  logicalProjectId: string;
  domain: string;
  accountId: string;
  provider: string;
  model: string;
  sourceRevision: string;
  harnessDigest: string;
  evaluatorDigest: string;
  runtimeDigest: string;
  policyDigest: string;
  phase: 'train' | 'heldout';
  stage: 'baseline' | 'proposal' | 'probe' | 'compose' | 'evaluation';
  planDigest: string;
  status: 'completed' | 'failed' | 'cancelled' | 'unknown';
  passed: boolean;
  criticalFailures: string[];
  toolCalls: number;
  durationMs: number;
  costUsd: number | null;
  artifactDigest: string;
  errorCode?: string;
  recordedAt: number;
}

export interface StoredEvidence {
  attemptId: string;
  task: FleetTask;
  result: RunResult;
  recordedAt: number;
  transcriptDigest?: string;
}

export interface EvidenceIndexEntry {
  attemptId: string;
  /** Immutable result revisions, insertion ordered. Current authority is the ledger result. */
  revisions: string[];
  firstRecordedAt: number;
  lastRecordedAt: number;
}

interface EvidenceIndexState {
  schemaVersion: 1;
  entries: Record<string, EvidenceIndexEntry>;
}

/**
 * Ledger-derived status for an attempt that produced no authoritative RunResult.
 * Denormalizes an attempt into the denominator without inventing measurements.
 */
export interface UnresolvedAttemptSummary {
  attemptId: string;
  state: Attempt['state'];
  generation: number;
  taskDigest: string;
  budgetId: string;
  hostId: string;
  projectId: string;
  logicalProjectId: string;
  accountId: string;
  phase: ExecutionBinding['phase'];
  stage: ExecutionBinding['stage'];
  createdAt: number;
  deadline: number;
}

const EVIDENCE_INDEX_NAME = 'evidence-index';
const PLANS_INDEX_NAME = 'plans-index';
const EVALUATIONS_INDEX_NAME = 'evaluations-index';

const EMPTY_EVIDENCE_INDEX: EvidenceIndexState = {
  schemaVersion: 1,
  entries: {},
};

const CASE_REF_WIDTH = 64;

function caseCode(code: string, caseId: string): string {
  return `${code}:${caseId.slice(0, CASE_REF_WIDTH)}`;
}

/**
 * Record naming contract shared with release/canary provenance checks.
 */
export function evidenceRevisionRecordName(
  attemptId: string,
  resultDigest: string,
): string {
  return `evidence-${attemptId}-${resultDigest}`;
}

export function evidenceTranscriptRecordName(
  attemptId: string,
  resultDigest: string,
): string {
  return `transcript-${attemptId}-${resultDigest}`;
}

export class EvidenceService {
  private readonly ledger: FleetLedger;

  constructor(
    private readonly store: RuntimeStore,
    ledger?: FleetLedger,
  ) {
    this.ledger = ledger ?? new FleetLedger(store);
  }

  private parseResult(result: RunResult): RunResult {
    const parsed = RunResultSchema.safeParse(result);
    if (!parsed.success) {
      throw new HarnessError(
        'INVALID_RESULT',
        `RunResult schema validation failed: ${parsed.error.issues
          .map((i) => i.message)
          .join('; ')}`,
      );
    }
    return parsed.data;
  }

  /**
   * Validates everything the caller's own claim can contradict: the result must be
   * internally consistent with the task and its binding before any ledger lookup.
   */
  private assertSelfConsistent(task: FleetTask, result: RunResult): void {
    if (result.status === 'completed') {
      const digests = [
        result.harnessDigest,
        result.sourceRevision,
        result.evaluatorDigest,
        result.artifactDigest,
      ];
      if (digests.some((digest) => digest.trim().length === 0)) {
        throw new HarnessError(
          'INVALID_RESULT',
          'Completed result must have non-empty harnessDigest, sourceRevision, evaluatorDigest, and artifactDigest',
        );
      }
    }

    if (result.harnessDigest !== result.binding.harnessDigest) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `result.harnessDigest ("${result.harnessDigest}") does not match binding.harnessDigest ("${result.binding.harnessDigest}")`,
      );
    }
    if (result.sourceRevision !== result.binding.sourceRevision) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `result.sourceRevision ("${result.sourceRevision}") does not match binding.sourceRevision ("${result.binding.sourceRevision}")`,
      );
    }
    if (result.evaluatorDigest !== result.binding.evaluatorDigest) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `result.evaluatorDigest ("${result.evaluatorDigest}") does not match binding.evaluatorDigest ("${result.binding.evaluatorDigest}")`,
      );
    }

    const expectedTaskDigest = canonicalDigest(task);
    if (result.binding.taskDigest !== expectedTaskDigest) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `result.binding.taskDigest ("${result.binding.taskDigest}") does not match computed task digest ("${expectedTaskDigest}")`,
      );
    }

    const pairs: Array<[string, string, string]> = [
      ['projectId', result.binding.projectId, task.project.projectId],
      ['hostId', result.binding.hostId, task.project.hostId],
      [
        'logicalProjectId',
        result.binding.logicalProjectId,
        task.project.logicalProjectId,
      ],
      ['phase', result.binding.phase, task.phase],
      ['sourceRevision', result.binding.sourceRevision, task.sourceRef],
    ];

    for (const [field, actual, expected] of pairs) {
      if (actual !== expected) {
        throw new HarnessError(
          'BINDING_MISMATCH',
          `result.binding.${field} ("${actual}") does not match task.${field} ("${expected}")`,
        );
      }
    }
  }

  /**
   * The single authority for a recorded outcome: the ledger attempt's own result.
   * An attempt without a result cannot authenticate any caller-supplied outcome.
   */
  private async requireAuthoritativeAttempt(
    result: RunResult,
  ): Promise<Attempt> {
    const attempt = await this.ledger.getAttempt(result.attemptId);
    if (!attempt) {
      throw new HarnessError(
        'ATTEMPT_NOT_FOUND',
        `Attempt "${result.attemptId}" not found in authoritative ledger`,
      );
    }
    if (!attempt.result) {
      throw new HarnessError(
        'ATTEMPT_RESULT_MISSING',
        `Attempt "${result.attemptId}" has no authoritative result in the ledger (state "${attempt.state}"); unresolved attempts are reported separately, never as invented outcomes`,
      );
    }
    if (attempt.state !== result.status) {
      throw new HarnessError(
        'INVALID_STATE_TRANSITION',
        `Cannot record evidence for attempt "${result.attemptId}": ledger state is "${attempt.state}" but result status is "${result.status}"`,
      );
    }
    if (canonicalJSON(attempt.result) !== canonicalJSON(result)) {
      throw new HarnessError(
        'RESULT_MISMATCH',
        'Supplied RunResult does not match the authoritative ledger attempt result',
      );
    }
    if (attempt.generation !== result.generation) {
      throw new HarnessError(
        'GENERATION_MISMATCH',
        `result.generation (${result.generation}) does not match attempt.generation (${attempt.generation})`,
      );
    }
    if (canonicalJSON(attempt.binding) !== canonicalJSON(result.binding)) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        'result.binding does not match the recorded attempt binding in the ledger',
      );
    }
    return attempt;
  }

  private async publishIndexEntry(
    attemptId: string,
    resultDigest: string,
  ): Promise<void> {
    await this.store.transaction<EvidenceIndexState>(
      EVIDENCE_INDEX_NAME,
      EMPTY_EVIDENCE_INDEX,
      (index) => {
        const now = Date.now();
        const existing = index.entries[attemptId];
        if (!existing) {
          index.entries[attemptId] = {
            attemptId,
            revisions: [resultDigest],
            firstRecordedAt: now,
            lastRecordedAt: now,
          };
          return index;
        }
        if (!existing.revisions.includes(resultDigest)) {
          existing.revisions.push(resultDigest);
        }
        existing.lastRecordedAt = now;
        return index;
      },
    );
  }

  /**
   * Persists an immutable execution result against its authoritative ledger attempt.
   * Every outcome requires the exact ledger result; nothing is synthesized.
   */
  async record(
    task: FleetTask,
    result: RunResult,
    transcript?: string,
  ): Promise<void> {
    const validatedTask = parseFleetTask(task);
    const validatedResult = this.parseResult(result);

    this.assertSelfConsistent(validatedTask, validatedResult);
    const attempt = await this.requireAuthoritativeAttempt(validatedResult);

    const resultDigest = canonicalDigest(validatedResult);
    let transcriptDigest: string | undefined;

    if (transcript !== undefined) {
      transcriptDigest = crypto
        .createHash('sha256')
        .update(transcript, 'utf8')
        .digest('hex');
      await this.store.createImmutable(
        evidenceTranscriptRecordName(attempt.id, resultDigest),
        {
          attemptId: attempt.id,
          transcript,
          transcriptDigest,
          recordedAt: attempt.createdAt,
        },
      );
    }

    const storedEvidence: StoredEvidence = {
      attemptId: attempt.id,
      task: validatedTask,
      result: validatedResult,
      recordedAt: attempt.createdAt,
      ...(transcriptDigest !== undefined ? { transcriptDigest } : {}),
    };

    await this.store.createImmutable(
      evidenceRevisionRecordName(attempt.id, resultDigest),
      storedEvidence,
    );
    await this.publishIndexEntry(attempt.id, resultDigest);
  }

  /**
   * Reports attempts that hold a budget reservation but no authoritative result.
   * These preserve the denominator without fabricating an evaluator outcome.
   */
  async unresolvedAttempts(): Promise<UnresolvedAttemptSummary[]> {
    const attempts = await this.ledger.list();
    return attempts
      .filter((attempt) => !attempt.result)
      .map((attempt) => ({
        attemptId: attempt.id,
        state: attempt.state,
        generation: attempt.generation,
        taskDigest: attempt.binding.taskDigest,
        budgetId: attempt.binding.budgetId,
        hostId: attempt.hostId,
        projectId: attempt.projectId,
        logicalProjectId: attempt.binding.logicalProjectId,
        accountId: attempt.accountId,
        phase: attempt.binding.phase,
        stage: attempt.binding.stage,
        createdAt: attempt.createdAt,
        deadline: attempt.deadline,
      }))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  private async readAuthoritativeRevision(
    attempt: Attempt,
  ): Promise<StoredEvidence | null> {
    if (!attempt.result) {
      return null;
    }
    const resultDigest = canonicalDigest(attempt.result);
    const index = await this.store.read<EvidenceIndexState>(
      EVIDENCE_INDEX_NAME,
      EMPTY_EVIDENCE_INDEX,
    );
    const entry = index.entries[attempt.id];
    if (!entry || !entry.revisions.includes(resultDigest)) {
      return null;
    }
    const stored = await this.store.read<StoredEvidence | null>(
      evidenceRevisionRecordName(attempt.id, resultDigest),
      null,
    );
    if (!stored) {
      return null;
    }
    // Stale or tampered revisions are never exported.
    if (canonicalJSON(stored.result) !== canonicalJSON(attempt.result)) {
      return null;
    }
    return stored;
  }

  /**
   * Exports strict allowlisted summaries for the authoritative revision of each attempt.
   */
  async exportSummaries(): Promise<StrictEvidenceSummary[]> {
    const index = await this.store.read<EvidenceIndexState>(
      EVIDENCE_INDEX_NAME,
      EMPTY_EVIDENCE_INDEX,
    );
    const summaries: StrictEvidenceSummary[] = [];

    for (const attemptId of Object.keys(index.entries)) {
      const attempt = await this.ledger.getAttempt(attemptId);
      if (!attempt) {
        continue;
      }
      const stored = await this.readAuthoritativeRevision(attempt);
      if (!stored) {
        continue;
      }

      const res = stored.result;
      const b = res.binding;
      summaries.push({
        attemptId: res.attemptId,
        runId: b.runId,
        budgetId: b.budgetId,
        taskDigest: b.taskDigest,
        hostId: b.hostId,
        projectId: b.projectId,
        logicalProjectId: b.logicalProjectId,
        domain: b.domain,
        accountId: b.accountId,
        provider: b.provider,
        model: b.model,
        sourceRevision: b.sourceRevision,
        harnessDigest: b.harnessDigest,
        evaluatorDigest: b.evaluatorDigest,
        runtimeDigest: b.runtimeDigest,
        policyDigest: b.policyDigest,
        phase: b.phase,
        stage: b.stage,
        planDigest: b.planDigest,
        status: res.status,
        passed: res.passed,
        criticalFailures: [...res.criticalFailures],
        toolCalls: res.toolCalls,
        durationMs: res.durationMs,
        costUsd: res.costUsd,
        artifactDigest: res.artifactDigest,
        errorCode: res.errorCode,
        recordedAt: stored.recordedAt,
      });
    }

    return summaries;
  }

  /**
   * Freezes an evaluation plan before any heldout attempt admission.
   * Expected case attempt IDs must be preallocated, globally distinct, and bound.
   */
  async freezePlan(plan: FrozenEvaluationPlan): Promise<{ digest: string }> {
    const parsed = FrozenEvaluationPlanSchema.safeParse(plan);
    if (!parsed.success) {
      throw new HarnessError(
        'INVALID_PLAN',
        `FrozenEvaluationPlan validation failed: ${parsed.error.issues
          .map((i) => i.message)
          .join('; ')}`,
      );
    }
    const planData = parsed.data;

    this.assertPlanCaseIdentity(planData);

    const digest = canonicalDigest(planData);

    for (const attemptId of this.collectPlannedAttemptIds(planData)) {
      const existing = await this.ledger.getAttempt(attemptId);
      if (existing) {
        throw new HarnessError(
          'PLAN_ATTEMPT_ALREADY_RESERVED',
          `Frozen plan cannot reference attempt "${attemptId}" that was already admitted; freeze must precede admission`,
        );
      }
    }

    await this.store.createImmutable(`plan-${digest}`, planData);

    await this.store.transaction<string[]>(PLANS_INDEX_NAME, [], (index) =>
      index.includes(digest) ? index : [...index, digest],
    );

    return { digest };
  }

  private collectPlannedAttemptIds(plan: FrozenEvaluationPlan): Set<string> {
    const ids = new Set<string>();
    for (const entry of plan.cases) {
      ids.add(entry.baselineAttemptId);
      ids.add(entry.candidateAttemptId);
    }
    return ids;
  }

  private assertPlanCaseIdentity(plan: FrozenEvaluationPlan): void {
    const caseIds = new Set<string>();
    const attemptIds = new Set<string>();
    const required = new Set<string>();

    for (const requiredProject of plan.requiredProjects) {
      if (required.has(requiredProject)) {
        throw new HarnessError(
          'INVALID_PLAN',
          `Duplicate required project "${requiredProject}" in frozen evaluation plan`,
        );
      }
      required.add(requiredProject);
    }

    for (const entry of plan.cases) {
      if (caseIds.has(entry.id)) {
        throw new HarnessError(
          'INVALID_PLAN',
          `Duplicate case ID "${entry.id}" in frozen evaluation plan`,
        );
      }
      caseIds.add(entry.id);

      for (const attemptId of [
        entry.baselineAttemptId,
        entry.candidateAttemptId,
      ]) {
        if (attemptIds.has(attemptId)) {
          throw new HarnessError(
            'INVALID_PLAN',
            `Attempt "${attemptId}" is planned more than once across case roles`,
          );
        }
        attemptIds.add(attemptId);
      }

      if (entry.baselineAttemptId === entry.candidateAttemptId) {
        throw new HarnessError(
          'INVALID_PLAN',
          `Case "${entry.id}" uses identical attempt ID for both baseline and candidate`,
        );
      }
    }

    const hostRuntime = new Map<string, string>();
    for (const entry of plan.cases) {
      const seen = hostRuntime.get(entry.hostId);
      if (seen !== undefined && seen !== entry.runtimeDigest) {
        throw new HarnessError(
          'INVALID_PLAN',
          `Cases for host "${entry.hostId}" declare conflicting runtime digests`,
        );
      }
      hostRuntime.set(entry.hostId, entry.runtimeDigest);
    }

    const covered = new Set(plan.cases.map((entry) => entry.logicalProjectId));
    for (const requiredProject of required) {
      if (!covered.has(requiredProject)) {
        throw new HarnessError(
          'INVALID_PLAN',
          `Required project "${requiredProject}" is not covered by any case in the evaluation plan`,
        );
      }
    }
  }

  private async loadFrozenPlan(
    planDigest: string,
  ): Promise<FrozenEvaluationPlan> {
    const raw = await this.store.read<unknown>(`plan-${planDigest}`, null);
    if (raw === null) {
      throw new HarnessError(
        'PLAN_NOT_FOUND',
        `Frozen evaluation plan with digest "${planDigest}" not found in store`,
      );
    }
    const parsed = FrozenEvaluationPlanSchema.safeParse(raw);
    if (!parsed.success) {
      throw new HarnessError(
        'INVALID_PLAN',
        `Frozen evaluation plan "${planDigest}" failed strict validation`,
      );
    }
    if (canonicalDigest(parsed.data) !== planDigest) {
      throw new HarnessError(
        'PLAN_DIGEST_MISMATCH',
        `Frozen evaluation plan content does not match digest "${planDigest}"`,
      );
    }
    return parsed.data;
  }

  private verifyCaseAuthority(
    entry: FrozenEvaluationPlan['cases'][number],
    config: FleetConfig,
    admitted: { domain: string; provider: string; model: string },
  ): string[] {
    const issues: string[] = [];
    const account = config.accounts.find(
      (candidate) => candidate.id === entry.accountId,
    );

    if (!account) {
      return ['CASE_ACCOUNT_UNKNOWN'];
    }

    if (
      account.provider !== admitted.provider ||
      account.model !== admitted.model
    ) {
      issues.push('CASE_ACCOUNT_CONFIG_MISMATCH');
    }

    const domainExists = config.domains.some(
      (domain) =>
        domain.id === admitted.domain &&
        (domain.hostIds.includes(entry.hostId) || domain.hostIds.includes('*')),
    );
    const domainEligible =
      account.allowedDomains.includes(admitted.domain) ||
      account.allowedDomains.includes('*');
    const ruleAuthorized = config.rules.some(
      (rule) =>
        rule.domain === admitted.domain &&
        (rule.hostIds.includes(entry.hostId) || rule.hostIds.includes('*')) &&
        rule.accountId === account.id &&
        rule.enabled &&
        rule.allowModelData === true,
    );
    const alias = config.projectAliases.find(
      (candidate) =>
        candidate.hostId === entry.hostId &&
        candidate.projectId === entry.projectId,
    );
    const canonicalLogicalId = resolveLogicalProjectId(
      {
        hostId: entry.hostId,
        projectId: entry.projectId,
        rootPath: '',
        logicalProjectId: entry.logicalProjectId,
      },
      config,
    );

    if (!domainExists) {
      issues.push('CASE_DOMAIN_UNKNOWN');
    }
    if (!domainEligible) {
      issues.push('CASE_DOMAIN_INELIGIBLE');
    }
    if (!ruleAuthorized) {
      issues.push('CASE_RULE_NOT_AUTHORIZED');
    }
    if (canonicalLogicalId !== entry.logicalProjectId) {
      issues.push('CASE_LOGICAL_IDENTITY_MISMATCH');
    }
    if (
      alias &&
      (alias.domain !== admitted.domain || alias.accountId !== account.id)
    ) {
      issues.push('CASE_ALIAS_AUTHORITY_MISMATCH');
    }
    return issues;
  }

  private async loadCaseResult(
    attemptId: string,
    role: 'BASELINE' | 'CANDIDATE',
  ): Promise<{ result: RunResult } | { reason: string }> {
    const attempt = await this.ledger.getAttempt(attemptId);
    if (!attempt) {
      return { reason: `MISSING_${role}_ATTEMPT` };
    }
    if (!attempt.result) {
      return { reason: `${role}_UNRESOLVED` };
    }
    if (
      attempt.generation !== attempt.result.generation ||
      canonicalJSON(attempt.result.binding) !== canonicalJSON(attempt.binding)
    ) {
      return { reason: `${role}_ATTEMPT_INCONSISTENT` };
    }
    const stored = await this.readAuthoritativeRevision(attempt);
    if (!stored) {
      return { reason: `MISSING_${role}_EVIDENCE` };
    }
    return { result: stored.result };
  }

  /**
   * Evaluates a frozen evaluation plan against authoritative ledger results.
   * Never accepts caller-provided pass objects.
   */
  async evaluate(
    planDigest: string,
    config: FleetConfig,
  ): Promise<EvaluationRecord> {
    const validatedConfig = parseFleetConfig(config);
    const plan = await this.loadFrozenPlan(planDigest);

    const reasonCodes = this.planAuthorityReasons(plan, validatedConfig);
    const criticalRegressions: string[] = [];

    const outcomes = await this.collectOutcomes(
      plan,
      planDigest,
      validatedConfig,
      reasonCodes,
      criticalRegressions,
    );

    this.assertThresholds(plan, outcomes, reasonCodes, criticalRegressions);

    const evaluationRecord: EvaluationRecord = {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      releaseDigest: plan.releaseDigest,
      planDigest,
      eligible: reasonCodes.length === 0,
      reasonCodes: Array.from(new Set(reasonCodes)),
      projects: [...plan.requiredProjects],
      baselinePassed: outcomes.baselinePassed,
      candidatePassed: outcomes.candidatePassed,
      criticalRegressions,
    };

    const evalDigest = canonicalDigest(evaluationRecord);
    await this.store.createImmutable(`eval-${evalDigest}`, evaluationRecord);
    await this.store.transaction<string[]>(
      EVALUATIONS_INDEX_NAME,
      [],
      (index) => (index.includes(evalDigest) ? index : [...index, evalDigest]),
    );

    return evaluationRecord;
  }

  private planAuthorityReasons(
    plan: FrozenEvaluationPlan,
    config: FleetConfig,
  ): string[] {
    const reasons: string[] = [];
    if (plan.policyDigest !== policyDigest(config)) {
      reasons.push('POLICY_DIGEST_MISMATCH');
    }
    if (plan.runtimeDigest !== evaluationRuntimeDigest(config, plan.cases)) {
      reasons.push('RUNTIME_DIGEST_MISMATCH');
    }
    if (
      plan.minImprovement !== config.evaluation.minImprovement ||
      plan.maxRegressions !== config.evaluation.maxRegressions
    ) {
      reasons.push('EVALUATION_CONFIG_MUTATED');
    }
    if (plan.minImprovement < 0 || plan.maxRegressions < 0) {
      reasons.push('INVALID_EVALUATION_THRESHOLDS');
    }
    return reasons;
  }

  private async collectOutcomes(
    plan: FrozenEvaluationPlan,
    planDigest: string,
    config: FleetConfig,
    reasonCodes: string[],
    criticalRegressions: string[],
  ): Promise<{
    baselinePassed: number;
    candidatePassed: number;
    regressions: number;
  }> {
    const covered = new Set<string>();
    const outcomes = { baselinePassed: 0, candidatePassed: 0, regressions: 0 };

    for (const entry of plan.cases) {
      covered.add(entry.logicalProjectId);
      const outcome = await this.evaluateCase(
        entry,
        plan,
        planDigest,
        config,
        reasonCodes,
      );
      if (!outcome) {
        continue;
      }
      if (outcome.basePass) {
        outcomes.baselinePassed += 1;
      }
      if (outcome.candPass) {
        outcomes.candidatePassed += 1;
      }
      if (outcome.basePass && !outcome.candPass) {
        outcomes.regressions += 1;
      }
      if (
        outcome.candidateCritical &&
        !criticalRegressions.includes(entry.logicalProjectId)
      ) {
        criticalRegressions.push(entry.logicalProjectId);
      }
    }

    for (const requiredProject of plan.requiredProjects) {
      if (!covered.has(requiredProject)) {
        reasonCodes.push(
          `MISSING_REQUIRED_PROJECT_COVERAGE:${requiredProject}`,
        );
      }
    }

    return outcomes;
  }

  private assertThresholds(
    plan: FrozenEvaluationPlan,
    outcomes: {
      baselinePassed: number;
      candidatePassed: number;
      regressions: number;
    },
    reasonCodes: string[],
    criticalRegressions: string[],
  ): void {
    if (
      outcomes.candidatePassed - outcomes.baselinePassed <
      plan.minImprovement
    ) {
      reasonCodes.push('INSUFFICIENT_IMPROVEMENT');
    }
    if (outcomes.candidatePassed <= outcomes.baselinePassed) {
      reasonCodes.push('NO_PROVEN_GAIN');
    }
    if (outcomes.regressions > plan.maxRegressions) {
      reasonCodes.push('REGRESSIONS_EXCEEDED');
    }
    if (criticalRegressions.length > 0) {
      reasonCodes.push('CRITICAL_REGRESSION_DETECTED');
    }
  }

  /**
   * Evaluates one frozen case. Returns null when the pair is unusable, after
   * recording the specific denial reason; unusable pairs never count as passes.
   */
  private async evaluateCase(
    entry: FrozenEvaluationPlan['cases'][number],
    plan: FrozenEvaluationPlan,
    planDigest: string,
    config: FleetConfig,
    reasonCodes: string[],
  ): Promise<{
    basePass: boolean;
    candPass: boolean;
    candidateCritical: boolean;
  } | null> {
    const code = (suffix: string): string => caseCode(suffix, entry.id);

    const hostRuntime = resolveHostRuntime(config, entry.hostId);
    if (entry.runtimeDigest !== hostRuntime.manifestDigest) {
      reasonCodes.push(code('CASE_RUNTIME_MISMATCH'));
    }
    const base = await this.loadCaseResult(entry.baselineAttemptId, 'BASELINE');
    const cand = await this.loadCaseResult(
      entry.candidateAttemptId,
      'CANDIDATE',
    );

    if ('reason' in base) {
      reasonCodes.push(code(base.reason));
    }
    if ('reason' in cand) {
      reasonCodes.push(code(cand.reason));
    }
    if ('reason' in base || 'reason' in cand) {
      return null;
    }

    const baseResult = base.result;
    const candResult = cand.result;

    // The evaluation plan carries no domain/provider/model: derive them from the
    // admitted pair, require the pair to agree, then check independent authority.
    const pairChecks: Array<[string, string, string]> = [
      [
        'PAIR_DOMAIN_MISMATCH',
        baseResult.binding.domain,
        candResult.binding.domain,
      ],
      [
        'PAIR_PROVIDER_MISMATCH',
        baseResult.binding.provider,
        candResult.binding.provider,
      ],
      [
        'PAIR_MODEL_MISMATCH',
        baseResult.binding.model,
        candResult.binding.model,
      ],
      [
        'PAIR_ACCOUNT_MISMATCH',
        baseResult.binding.accountId,
        candResult.binding.accountId,
      ],
    ];
    for (const [issue, left, right] of pairChecks) {
      if (left !== right) {
        reasonCodes.push(code(issue));
      }
    }
    for (const issue of this.verifyCaseAuthority(
      entry,
      config,
      candResult.binding,
    )) {
      reasonCodes.push(code(issue));
    }

    reasonCodes.push(
      ...this.compareCaseResult(
        baseResult,
        entry,
        plan,
        planDigest,
        'baseline',
      ).map(code),
    );
    reasonCodes.push(
      ...this.compareCaseResult(
        candResult,
        entry,
        plan,
        planDigest,
        'candidate',
      ).map(code),
    );

    const basePass =
      baseResult.status === 'completed' && baseResult.passed === true;
    const candPass =
      candResult.status === 'completed' && candResult.passed === true;

    if (baseResult.status !== 'completed') {
      reasonCodes.push(code('BASELINE_NOT_COMPLETED'));
    }
    if (candResult.status !== 'completed') {
      reasonCodes.push(code('CANDIDATE_NOT_COMPLETED'));
    }

    return {
      basePass,
      candPass,
      candidateCritical: candResult.criticalFailures.length > 0,
    };
  }

  private compareCaseResult(
    result: RunResult,
    entry: FrozenEvaluationPlan['cases'][number],
    plan: FrozenEvaluationPlan,
    planDigest: string,
    role: 'baseline' | 'candidate',
  ): string[] {
    const binding = result.binding;
    const issues: string[] = [];

    // Heldout pairs are both evaluator runs; baseline vs candidate role is
    // established by the planned case attempt ID and harness digest, never by stage.
    if (binding.stage !== 'evaluation') {
      issues.push('STAGE_MISMATCH');
    }
    if (binding.phase !== 'heldout') {
      issues.push('PHASE_MISMATCH');
    }
    if (binding.planDigest !== planDigest) {
      issues.push('PLAN_DIGEST_MISMATCH');
    }
    if (binding.policyDigest !== plan.policyDigest) {
      issues.push('RESULT_POLICY_DIGEST_MISMATCH');
    }
    if (binding.runtimeDigest !== entry.runtimeDigest) {
      issues.push('RESULT_RUNTIME_DIGEST_MISMATCH');
    }
    if (binding.projectId !== entry.projectId) {
      issues.push('PROJECT_MISMATCH');
    }
    if (binding.logicalProjectId !== entry.logicalProjectId) {
      issues.push('LOGICAL_PROJECT_MISMATCH');
    }
    if (binding.hostId !== entry.hostId) {
      issues.push('HOST_MISMATCH');
    }
    if (binding.accountId !== entry.accountId) {
      issues.push('ACCOUNT_MISMATCH');
    }
    if (binding.sourceRevision !== entry.sourceRevision) {
      issues.push('SOURCE_REVISION_MISMATCH');
    }
    if (binding.evaluatorDigest !== entry.evaluatorDigest) {
      issues.push('EVALUATOR_DIGEST_MISMATCH');
    }
    if (binding.taskDigest !== entry.taskDigest) {
      issues.push('TASK_DIGEST_MISMATCH');
    }
    if (result.sourceRevision !== entry.sourceRevision) {
      issues.push('RESULT_SOURCE_REVISION_MISMATCH');
    }
    if (
      binding.harnessDigest !==
      (role === 'candidate' ? plan.releaseDigest : plan.baselineDigest)
    ) {
      issues.push(
        role === 'candidate'
          ? 'CANDIDATE_RELEASE_DIGEST_MISMATCH'
          : 'BASELINE_RELEASE_DIGEST_MISMATCH',
      );
    }
    return issues;
  }
}
