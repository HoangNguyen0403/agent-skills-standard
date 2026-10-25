import crypto from 'crypto';
import { z } from 'zod';
import { resolveLogicalProjectId } from './FleetPolicyService';
import { RuntimeStore } from './RuntimeStore';
import {
  Attempt,
  AttemptSchema,
  BudgetEpoch,
  BudgetEpochRequest,
  BudgetEpochSchema,
  canonicalJSON,
  canonicalDigest,
  evaluationRuntimeDigest,
  ExecutionBinding,
  ExecutionBindingSchema,
  FleetConfig,
  FleetEvidenceVerifier,
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
  TerminationEvidence,
  TerminationEvidenceSchema,
} from './RuntimeTypes';

const LEDGER_RECORD_NAME = 'fleet-ledger';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Immutable committed Git revision: lowercase SHA-1 (40) or SHA-256 (64) hex. */
const SOURCE_REVISION_REGEX = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;

const ACTIVE_STATES: ReadonlyArray<Attempt['state']> = [
  'admitted',
  'running',
  'unknown',
];
const TERMINAL_STATES: ReadonlyArray<Attempt['state']> = [
  'completed',
  'failed',
  'cancelled',
  'fenced',
];

export interface LedgerState {
  epochs: Record<string, BudgetEpoch>;
  attempts: Record<string, Attempt>;
}

const LedgerStateSchema = z
  .object({
    epochs: z.record(z.string().min(1), BudgetEpochSchema),
    attempts: z.record(z.string().min(1), AttemptSchema),
  })
  .strict();

function createInitialLedgerState(): LedgerState {
  return {
    epochs: {},
    attempts: {},
  };
}

function formatIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => {
      const pathStr = issue.path.join('.');
      return pathStr ? `at "${pathStr}": ${issue.message}` : issue.message;
    })
    .join('; ');
}

function isActive(state: Attempt['state']): boolean {
  return ACTIVE_STATES.includes(state);
}

function effectiveLimit(epochValue: number, configValue: number): number {
  return Math.min(epochValue, configValue);
}

export class FleetLedger {
  constructor(
    private readonly store: RuntimeStore,
    private readonly evidenceVerifier?: FleetEvidenceVerifier,
  ) {}

  private parseBinding(raw: ExecutionBinding): ExecutionBinding {
    const result = ExecutionBindingSchema.safeParse(raw);
    if (!result.success) {
      throw new HarnessError(
        'INVALID_BINDING',
        `ExecutionBinding validation failed: ${formatIssues(result.error.issues)}`,
      );
    }
    return result.data;
  }

  private parseResult(raw: RunResult): RunResult {
    const result = RunResultSchema.safeParse(raw);
    if (!result.success) {
      throw new HarnessError(
        'INVALID_RESULT',
        `RunResult validation failed: ${formatIssues(result.error.issues)}`,
      );
    }
    return result.data;
  }

  private parseEvidence(raw: TerminationEvidence): TerminationEvidence {
    const result = TerminationEvidenceSchema.safeParse(raw);
    if (!result.success) {
      throw new HarnessError(
        'INVALID_EVIDENCE',
        `TerminationEvidence validation failed: ${formatIssues(result.error.issues)}`,
      );
    }
    return result.data;
  }

  private async readState(): Promise<LedgerState> {
    const raw = await this.store.read<unknown>(LEDGER_RECORD_NAME, null);
    if (raw === null) {
      return createInitialLedgerState();
    }
    const parsed = LedgerStateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new HarnessError(
        'STATE_CORRUPT',
        `Ledger state validation failed: ${formatIssues(parsed.error.issues)}`,
      );
    }
    return parsed.data;
  }

  /**
   * Authoritatively creates and persists a new budget epoch.
   * The current strict policy and its scoped limits are frozen into the epoch so
   * later reconfiguration can never widen this epoch's authority.
   */
  async createBudget(
    epoch: BudgetEpochRequest,
    config: FleetConfig,
  ): Promise<BudgetEpoch> {
    if (!epoch || typeof epoch !== 'object') {
      throw new HarnessError('INVALID_BUDGET', 'Budget must be an object');
    }

    for (const derived of [
      'reservedAttempts',
      'reservedToolCalls',
      'policyDigest',
      'policyGeneration',
      'frozenLimits',
    ]) {
      if (derived in (epoch as unknown as Record<string, unknown>)) {
        throw new HarnessError(
          'INVALID_BUDGET',
          `Budget input cannot supply derived field "${derived}"`,
        );
      }
    }

    if (!epoch.id || typeof epoch.id !== 'string') {
      throw new HarnessError(
        'INVALID_BUDGET',
        'Budget id must be a non-empty string',
      );
    }

    if (!epoch.runId || typeof epoch.runId !== 'string') {
      throw new HarnessError(
        'INVALID_BUDGET',
        'Budget runId must be a non-empty string',
      );
    }

    if (!Number.isFinite(epoch.createdAt) || epoch.createdAt <= 0) {
      throw new HarnessError(
        'INVALID_BUDGET',
        'Budget createdAt must be a positive timestamp',
      );
    }

    if (!Number.isFinite(epoch.deadline) || epoch.deadline <= epoch.createdAt) {
      throw new HarnessError(
        'INVALID_BUDGET',
        'Budget deadline must be an absolute timestamp strictly greater than createdAt',
      );
    }

    for (const field of [
      'maxAttempts',
      'maxConcurrent',
      'maxToolCalls',
    ] as const) {
      if (!Number.isInteger(epoch[field]) || epoch[field] <= 0) {
        throw new HarnessError(
          'INVALID_BUDGET',
          `${field} must be a positive integer`,
        );
      }
    }

    const validatedConfig = parseFleetConfig(config);

    const now = Date.now();
    if (
      !Number.isSafeInteger(epoch.createdAt) ||
      epoch.createdAt > now ||
      !Number.isFinite(epoch.deadline) ||
      epoch.deadline <= now
    ) {
      throw new HarnessError(
        'INVALID_BUDGET',
        `Budget createdAt must be a safe integer not after the current time and deadline must be finite and still in the future`,
      );
    }

    const limits = validatedConfig.limits;
    if (epoch.maxAttempts > limits.maxAttempts) {
      throw new HarnessError(
        'INVALID_BUDGET',
        `epoch.maxAttempts (${epoch.maxAttempts}) exceeds configured limit (${limits.maxAttempts})`,
      );
    }
    if (epoch.maxConcurrent > limits.maxConcurrent) {
      throw new HarnessError(
        'INVALID_BUDGET',
        `epoch.maxConcurrent (${epoch.maxConcurrent}) exceeds configured limit (${limits.maxConcurrent})`,
      );
    }
    if (epoch.maxToolCalls > limits.maxToolCalls) {
      throw new HarnessError(
        'INVALID_BUDGET',
        `epoch.maxToolCalls (${epoch.maxToolCalls}) exceeds configured limit (${limits.maxToolCalls})`,
      );
    }
    if (epoch.deadline - epoch.createdAt > limits.maxDurationMs) {
      throw new HarnessError(
        'INVALID_BUDGET',
        `epoch campaign duration (${epoch.deadline - epoch.createdAt}ms) exceeds configured maxDurationMs (${limits.maxDurationMs}ms)`,
      );
    }

    const frozenAuthority = {
      policyDigest: policyDigest(validatedConfig),
      policyGeneration: validatedConfig.generation,
      frozenLimits: {
        maxAttempts: limits.maxAttempts,
        maxConcurrent: limits.maxConcurrent,
        maxToolCalls: limits.maxToolCalls,
        maxDurationMs: limits.maxDurationMs,
        perHost: limits.perHost,
        perProject: limits.perProject,
        perAccount: limits.perAccount,
      },
    };

    const state = await this.store.transaction<LedgerState>(
      LEDGER_RECORD_NAME,
      createInitialLedgerState(),
      (current) => {
        if (current.epochs[epoch.id]) {
          throw new HarnessError(
            'BUDGET_ALREADY_EXISTS',
            `Budget epoch with ID "${epoch.id}" already exists`,
          );
        }

        current.epochs[epoch.id] = {
          ...epoch,
          reservedAttempts: 0,
          reservedToolCalls: 0,
          ...frozenAuthority,
        };
        return current;
      },
    );

    return state.epochs[epoch.id];
  }

  /**
   * Reserves an execution attempt under an authorized budget and intersecting limits.
   * Validates every derivable immutable binding before any model work is admitted.
   */
  async reserve(
    rawTask: FleetTask,
    accountId: string,
    config: FleetConfig,
    rawBinding: ExecutionBinding,
    plannedAttemptId?: string,
  ): Promise<Attempt> {
    const task = parseFleetTask(rawTask);
    const validatedConfig = parseFleetConfig(config);
    const binding = this.parseBinding(rawBinding);

    if (!task.replaySafe) {
      throw new HarnessError(
        'REPLAY_UNSAFE',
        `Task "${task.id}" has replaySafe=false. Unsafe experiments are denied.`,
      );
    }

    if (plannedAttemptId !== undefined && !UUID_REGEX.test(plannedAttemptId)) {
      throw new HarnessError(
        'INVALID_ATTEMPT_ID',
        `plannedAttemptId "${plannedAttemptId}" must be a valid UUID`,
      );
    }

    if (!SOURCE_REVISION_REGEX.test(task.sourceRef)) {
      throw new HarnessError(
        'SOURCE_NOT_IMMUTABLE',
        `Task sourceRef "${task.sourceRef}" must be an immutable 40 or 64 character lowercase hex commit SHA`,
      );
    }

    if (binding.sourceRevision !== task.sourceRef) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `binding.sourceRevision ("${binding.sourceRevision}") does not match task.sourceRef ("${task.sourceRef}")`,
      );
    }

    const taskDigest = canonicalDigest(task);
    if (binding.taskDigest !== taskDigest) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `binding.taskDigest does not match canonical task digest`,
      );
    }

    const account = validatedConfig.accounts.find((a) => a.id === accountId);
    if (!account) {
      throw new HarnessError(
        'ACCOUNT_NOT_FOUND',
        `Account "${accountId}" is not configured`,
      );
    }

    if (binding.accountId !== account.id) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `binding.accountId ("${binding.accountId}") does not match accountId ("${account.id}")`,
      );
    }

    if (
      binding.provider !== account.provider ||
      binding.model !== account.model
    ) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `binding provider/model ("${binding.provider}/${binding.model}") does not match account "${account.id}" ("${account.provider}/${account.model}")`,
      );
    }

    const domainEligible =
      account.allowedDomains.includes(binding.domain) ||
      account.allowedDomains.includes('*');
    if (!domainEligible) {
      throw new HarnessError(
        'ACCOUNT_DOMAIN_INELIGIBLE',
        `Account "${account.id}" is not authorized for binding domain "${binding.domain}"`,
      );
    }

    if (binding.projectId !== task.project.projectId) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `binding.projectId ("${binding.projectId}") does not match task.project.projectId ("${task.project.projectId}")`,
      );
    }

    if (binding.hostId !== task.project.hostId) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `binding.hostId ("${binding.hostId}") does not match task.project.hostId ("${task.project.hostId}")`,
      );
    }

    if (binding.logicalProjectId !== task.project.logicalProjectId) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `binding.logicalProjectId ("${binding.logicalProjectId}") does not match task.project.logicalProjectId ("${task.project.logicalProjectId}")`,
      );
    }

    const canonicalLogicalId = resolveLogicalProjectId(
      task.project,
      validatedConfig,
    );
    if (binding.logicalProjectId !== canonicalLogicalId) {
      throw new HarnessError(
        'PROJECT_IDENTITY_MISMATCH',
        `logicalProjectId "${binding.logicalProjectId}" is not the trusted identity "${canonicalLogicalId}" for project "${task.project.projectId}" on host "${task.project.hostId}"`,
      );
    }

    if (binding.phase !== task.phase) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `binding.phase ("${binding.phase}") does not match task.phase ("${task.phase}")`,
      );
    }

    const expectedPolicyDigest = policyDigest(validatedConfig);
    if (binding.policyDigest !== expectedPolicyDigest) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `binding.policyDigest does not match current configuration policy digest`,
      );
    }

    const expectedRuntimeDigest = resolveHostRuntime(
      validatedConfig,
      task.project.hostId,
    ).manifestDigest;
    if (binding.runtimeDigest !== expectedRuntimeDigest) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `binding.runtimeDigest does not match the enrolled host runtime identity`,
      );
    }

    const expectedEvaluatorDigest = canonicalDigest(task.verification);
    if (binding.evaluatorDigest !== expectedEvaluatorDigest) {
      throw new HarnessError(
        'BINDING_MISMATCH',
        `binding.evaluatorDigest does not match canonical task verification digest`,
      );
    }

    if (binding.stage === 'baseline') {
      const baselineDigest = canonicalDigest(task.baseline);
      if (binding.harnessDigest !== baselineDigest) {
        throw new HarnessError(
          'BINDING_MISMATCH',
          `binding.harnessDigest does not match canonical baseline harness digest for stage "baseline"`,
        );
      }
    }

    if (task.phase === 'heldout' && !plannedAttemptId) {
      throw new HarnessError(
        'HELDOUT_PLAN_REQUIRED',
        'Heldout attempts require a preallocated plannedAttemptId bound to the frozen plan',
      );
    }

    const attemptId = plannedAttemptId ?? crypto.randomUUID();

    const taskKey = crypto
      .createHash('sha256')
      .update(
        canonicalJSON([
          task.project.hostId,
          task.project.projectId,
          task.project.logicalProjectId,
          task.sourceRef,
          task.id,
          binding.harnessDigest,
          binding.phase,
        ]),
        'utf8',
      )
      .digest('hex');

    const now = Date.now();
    const token = crypto.randomUUID();

    let createdAttempt: Attempt | null = null;

    await this.store.transaction<LedgerState>(
      LEDGER_RECORD_NAME,
      createInitialLedgerState(),
      async (state) => {
        if (state.attempts[attemptId]) {
          throw new HarnessError(
            'ATTEMPT_ALREADY_EXISTS',
            `Attempt with ID "${attemptId}" already exists in ledger`,
          );
        }

        for (const existing of Object.values(state.attempts)) {
          if (existing.taskKey === taskKey && isActive(existing.state)) {
            throw new HarnessError(
              'DUPLICATE_TASK_EXECUTION',
              `Active or unknown attempt already exists for task key "${taskKey}" (attempt "${existing.id}" in state "${existing.state}")`,
            );
          }
        }

        const epoch = state.epochs[binding.budgetId];
        if (!epoch) {
          throw new HarnessError(
            'BUDGET_NOT_FOUND',
            `Budget epoch with ID "${binding.budgetId}" not found`,
          );
        }

        if (binding.runId !== epoch.runId) {
          throw new HarnessError(
            'BINDING_MISMATCH',
            `binding.runId ("${binding.runId}") does not match epoch.runId ("${epoch.runId}")`,
          );
        }

        // Frozen authority: any policy change requires a newly authorized epoch.
        if (binding.policyDigest !== epoch.policyDigest) {
          throw new HarnessError(
            'EPOCH_POLICY_AUTHORITY_MISMATCH',
            `binding.policyDigest does not match the policy authority frozen at budget creation (generation ${epoch.policyGeneration})`,
          );
        }

        if (now > epoch.deadline) {
          throw new HarnessError(
            'BUDGET_EXHAUSTED',
            `Budget epoch "${epoch.id}" wall-clock deadline has expired`,
          );
        }

        if (task.phase === 'heldout') {
          await this.verifyHeldoutCase(
            state,
            task,
            binding,
            attemptId,
            taskDigest,
            validatedConfig,
          );
        }

        const maxAttempts = Math.min(
          epoch.maxAttempts,
          epoch.frozenLimits.maxAttempts,
          validatedConfig.limits.maxAttempts,
        );
        if (epoch.reservedAttempts + 1 > maxAttempts) {
          throw new HarnessError(
            'BUDGET_EXHAUSTED',
            `Budget epoch "${epoch.id}" maxAttempts (${maxAttempts}) exhausted`,
          );
        }

        const requestedToolCalls = task.toolCallAllowance;
        const maxToolCalls = Math.min(
          epoch.maxToolCalls,
          epoch.frozenLimits.maxToolCalls,
          validatedConfig.limits.maxToolCalls,
        );
        if (epoch.reservedToolCalls + requestedToolCalls > maxToolCalls) {
          throw new HarnessError(
            'TOOL_CALL_BUDGET_EXHAUSTED',
            `Budget epoch "${epoch.id}" maxToolCalls (${maxToolCalls}) exceeded by request of ${requestedToolCalls} calls (already reserved: ${epoch.reservedToolCalls})`,
          );
        }

        const activeAttempts = Object.values(state.attempts).filter((a) =>
          isActive(a.state),
        );

        const epochConcurrency = Math.min(
          epoch.maxConcurrent,
          epoch.frozenLimits.maxConcurrent,
          validatedConfig.limits.maxConcurrent,
        );
        const epochActive = activeAttempts.filter(
          (a) => a.binding.budgetId === epoch.id,
        ).length;
        if (epochActive + 1 > epochConcurrency) {
          throw new HarnessError(
            'CONCURRENCY_LIMIT_EXCEEDED',
            `Epoch concurrency limit of ${epochConcurrency} reached for budget "${epoch.id}" (active: ${epochActive})`,
          );
        }

        if (activeAttempts.length + 1 > validatedConfig.limits.maxConcurrent) {
          throw new HarnessError(
            'CONCURRENCY_LIMIT_EXCEEDED',
            `Global concurrency limit of ${validatedConfig.limits.maxConcurrent} reached (active: ${activeAttempts.length})`,
          );
        }

        const perHost = effectiveLimit(
          epoch.frozenLimits.perHost,
          validatedConfig.limits.perHost,
        );
        const hostActive = activeAttempts.filter(
          (a) => a.hostId === task.project.hostId,
        ).length;
        if (hostActive + 1 > perHost) {
          throw new HarnessError(
            'CONCURRENCY_LIMIT_EXCEEDED',
            `Per-host concurrency limit of ${perHost} reached for host "${task.project.hostId}" (active: ${hostActive})`,
          );
        }

        const perProject = effectiveLimit(
          epoch.frozenLimits.perProject,
          validatedConfig.limits.perProject,
        );
        const projectActive = activeAttempts.filter(
          (a) => a.binding.logicalProjectId === canonicalLogicalId,
        ).length;
        if (projectActive + 1 > perProject) {
          throw new HarnessError(
            'CONCURRENCY_LIMIT_EXCEEDED',
            `Logical-project concurrency limit of ${perProject} reached for "${canonicalLogicalId}" (active: ${projectActive})`,
          );
        }

        const perAccount = effectiveLimit(
          epoch.frozenLimits.perAccount,
          validatedConfig.limits.perAccount,
        );
        const accountActive = activeAttempts.filter(
          (a) => a.accountId === accountId,
        ).length;
        if (accountActive + 1 > perAccount) {
          throw new HarnessError(
            'CONCURRENCY_LIMIT_EXCEEDED',
            `Per-account concurrency limit of ${perAccount} reached for account "${accountId}" (active: ${accountActive})`,
          );
        }

        const attemptMaxDuration = Math.min(
          task.deadlineMs,
          validatedConfig.limits.maxDurationMs,
          epoch.frozenLimits.maxDurationMs,
        );
        const attemptDeadline = Math.min(
          now + attemptMaxDuration,
          epoch.deadline,
        );

        epoch.reservedAttempts += 1;
        epoch.reservedToolCalls += requestedToolCalls;

        createdAttempt = {
          id: attemptId,
          taskKey,
          projectId: task.project.projectId,
          hostId: task.project.hostId,
          accountId,
          token,
          state: 'admitted',
          deadline: attemptDeadline,
          createdAt: now,
          binding,
          generation: epoch.policyGeneration,
          reservedToolCalls: requestedToolCalls,
        };

        state.attempts[attemptId] = createdAttempt;
        return state;
      },
    );

    if (!createdAttempt) {
      throw new HarnessError(
        'RESERVATION_FAILED',
        'Failed to create attempt in ledger',
      );
    }

    return createdAttempt;
  }

  /**
   * Validates an immutable frozen plan and the exact preallocated case/role identity
   * before any heldout execution is admitted.
   */
  private async verifyHeldoutCase(
    state: LedgerState,
    task: FleetTask,
    binding: ExecutionBinding,
    attemptId: string,
    taskDigest: string,
    validatedConfig: FleetConfig,
  ): Promise<string> {
    const rawPlan = await this.store.read<unknown>(
      `plan-${binding.planDigest}`,
      null,
    );

    if (rawPlan === null) {
      throw new HarnessError(
        'HELDOUT_PLAN_REQUIRED',
        `No frozen evaluation plan exists for planDigest "${binding.planDigest}"`,
      );
    }

    const parsedPlan = FrozenEvaluationPlanSchema.safeParse(rawPlan);
    if (!parsedPlan.success) {
      throw new HarnessError(
        'FROZEN_PLAN_INVALID',
        `Frozen plan validation failed: ${formatIssues(parsedPlan.error.issues)}`,
      );
    }

    const plan: FrozenEvaluationPlan = parsedPlan.data;
    if (canonicalDigest(plan) !== binding.planDigest) {
      throw new HarnessError(
        'FROZEN_PLAN_DIGEST_MISMATCH',
        `Frozen plan content does not match planDigest "${binding.planDigest}"`,
      );
    }

    if (plan.policyDigest !== binding.policyDigest) {
      throw new HarnessError(
        'FROZEN_PLAN_MISMATCH',
        'Frozen plan policyDigest does not match binding authority',
      );
    }

    const expectedPlanRuntimeDigest = evaluationRuntimeDigest(
      validatedConfig,
      plan.cases,
    );
    if (plan.runtimeDigest !== expectedPlanRuntimeDigest) {
      throw new HarnessError(
        'FROZEN_PLAN_MISMATCH',
        'Frozen plan runtimeDigest does not match the aggregate enrolled host runtime identities',
      );
    }

    let role: 'candidate' | 'baseline' | null = null;
    let matchedCase = plan.cases.find(
      (c) => c.candidateAttemptId === attemptId,
    );
    if (matchedCase) {
      role = 'candidate';
    } else {
      matchedCase = plan.cases.find((c) => c.baselineAttemptId === attemptId);
      if (matchedCase) {
        role = 'baseline';
      }
    }

    if (!matchedCase || role === null) {
      throw new HarnessError(
        'HELDOUT_CASE_MISMATCH',
        `Attempt "${attemptId}" is not a preallocated case attempt in frozen plan "${binding.planDigest}"`,
      );
    }

    if (state.attempts[attemptId]) {
      throw new HarnessError(
        'ATTEMPT_ALREADY_EXISTS',
        `Planned case attempt "${attemptId}" is already reserved`,
      );
    }

    // Both heldout roles are evaluation-stage attempts; the role is distinguished
    // by the exact case attempt ID plus the plan's baseline/candidate harness digest.
    if (binding.stage !== 'evaluation') {
      throw new HarnessError(
        'HELDOUT_STAGE_MISMATCH',
        `Heldout role "${role}" requires stage "evaluation", got "${binding.stage}"`,
      );
    }

    const expectedHarnessDigest =
      role === 'candidate' ? plan.releaseDigest : plan.baselineDigest;
    if (binding.harnessDigest !== expectedHarnessDigest) {
      throw new HarnessError(
        'FROZEN_PLAN_MISMATCH',
        `Heldout role "${role}" harness digest does not match frozen plan`,
      );
    }

    const identityChecks: Array<[string, string, string]> = [
      ['taskDigest', matchedCase.taskDigest, taskDigest],
      ['hostId', matchedCase.hostId, task.project.hostId],
      ['projectId', matchedCase.projectId, task.project.projectId],
      [
        'logicalProjectId',
        matchedCase.logicalProjectId,
        binding.logicalProjectId,
      ],
      ['accountId', matchedCase.accountId, binding.accountId],
      ['sourceRevision', matchedCase.sourceRevision, binding.sourceRevision],
      ['evaluatorDigest', matchedCase.evaluatorDigest, binding.evaluatorDigest],
      ['runtimeDigest', matchedCase.runtimeDigest, binding.runtimeDigest],
    ];

    for (const [field, planned, actual] of identityChecks) {
      if (planned !== actual) {
        throw new HarnessError(
          'FROZEN_PLAN_MISMATCH',
          `Heldout case ${field} ("${planned}") does not match admission value ("${actual}")`,
        );
      }
    }

    return matchedCase.id;
  }

  /**
   * Starts an admitted attempt, binding its PID and moving it to running state.
   */
  async start(id: string, token: string, pid: number): Promise<Attempt> {
    if (!Number.isInteger(pid) || pid <= 0) {
      throw new HarnessError('INVALID_PID', 'PID must be a positive integer');
    }

    let updatedAttempt: Attempt | null = null;

    await this.store.transaction<LedgerState>(
      LEDGER_RECORD_NAME,
      createInitialLedgerState(),
      (state) => {
        const attempt = state.attempts[id];
        if (!attempt) {
          throw new HarnessError(
            'ATTEMPT_NOT_FOUND',
            `Attempt "${id}" not found in ledger`,
          );
        }

        if (attempt.token !== token) {
          throw new HarnessError(
            'INVALID_TOKEN',
            `Authentication token mismatch for attempt "${id}"`,
          );
        }

        if (attempt.state !== 'admitted') {
          throw new HarnessError(
            'INVALID_STATE_TRANSITION',
            `Cannot start attempt "${id}" from state "${attempt.state}" (must be "admitted")`,
          );
        }

        if (Date.now() > attempt.deadline) {
          throw new HarnessError(
            'DEADLINE_EXCEEDED',
            `Cannot start attempt "${id}"; deadline has already passed`,
          );
        }

        attempt.state = 'running';
        attempt.pid = pid;
        updatedAttempt = attempt;
        return state;
      },
    );

    if (!updatedAttempt) {
      throw new HarnessError(
        'START_FAILED',
        `Failed to transition attempt "${id}" to running`,
      );
    }

    return updatedAttempt;
  }

  /**
   * Records a terminal outcome. Every capacity-releasing terminal state requires
   * trusted runtime evidence; otherwise the attempt is preserved as unknown.
   * Reconciliation from unknown is allowed only with genuine verified authority.
   */
  async finish(
    id: string,
    token: string,
    rawResult: RunResult,
    rawTerminationEvidence?: TerminationEvidence,
  ): Promise<Attempt> {
    const result = this.parseResult(rawResult);
    const evidence =
      rawTerminationEvidence === undefined
        ? undefined
        : this.parseEvidence(rawTerminationEvidence);

    let updatedAttempt: Attempt | null = null;

    await this.store.transaction<LedgerState>(
      LEDGER_RECORD_NAME,
      createInitialLedgerState(),
      async (state) => {
        const attempt = state.attempts[id];
        if (!attempt) {
          throw new HarnessError(
            'ATTEMPT_NOT_FOUND',
            `Attempt "${id}" not found in ledger`,
          );
        }

        if (attempt.token !== token) {
          throw new HarnessError(
            'INVALID_TOKEN',
            `Authentication token mismatch for attempt "${id}"`,
          );
        }

        if (attempt.state !== 'running' && attempt.state !== 'unknown') {
          throw new HarnessError(
            'INVALID_STATE_TRANSITION',
            `Cannot finish attempt "${id}" in state "${attempt.state}" (must be "running" or "unknown")`,
          );
        }

        if (result.attemptId !== attempt.id) {
          throw new HarnessError(
            'RESULT_MISMATCH',
            `result.attemptId ("${result.attemptId}") does not match attempt.id ("${attempt.id}")`,
          );
        }

        if (result.generation !== attempt.generation) {
          throw new HarnessError(
            'RESULT_MISMATCH',
            `result.generation (${result.generation}) does not match attempt.generation (${attempt.generation})`,
          );
        }

        if (canonicalJSON(result.binding) !== canonicalJSON(attempt.binding)) {
          throw new HarnessError(
            'RESULT_MISMATCH',
            'result.binding does not match attempt.binding',
          );
        }

        const digestsMatch =
          result.harnessDigest === attempt.binding.harnessDigest &&
          result.sourceRevision === attempt.binding.sourceRevision &&
          result.evaluatorDigest === attempt.binding.evaluatorDigest;
        if (!digestsMatch) {
          throw new HarnessError(
            'RESULT_MISMATCH',
            'result digests do not match the immutable attempt binding',
          );
        }

        let nextState: Attempt['state'] = 'unknown';
        let retainedEvidence: TerminationEvidence | undefined;

        if (result.status === 'completed') {
          if (this.evidenceVerifier) {
            const verified = await this.evidenceVerifier.verifyCompletion(
              attempt,
              result,
            );
            if (verified) {
              nextState = 'completed';
            }
          }
        } else if (
          result.status === 'failed' ||
          result.status === 'cancelled'
        ) {
          if (this.evidenceVerifier && evidence) {
            const evidenceBound =
              evidence.attemptId === attempt.id &&
              evidence.generation === attempt.generation &&
              evidence.observedAt >= attempt.createdAt &&
              evidence.confirmed === true;
            if (evidenceBound) {
              const verified = await this.evidenceVerifier.verifyTermination(
                attempt,
                evidence,
              );
              if (verified) {
                nextState = result.status;
                retainedEvidence = evidence;
              }
            }
          }
        }

        // A non-verified outcome is authoritative only as unknown: never retain
        // a caller-claimed pass or terminal status for an unverified attempt.
        const storedResult: RunResult =
          nextState === 'unknown'
            ? { ...result, status: 'unknown', passed: false }
            : result;

        attempt.state = nextState;
        attempt.result = storedResult;
        if (retainedEvidence) {
          attempt.terminationEvidence = retainedEvidence;
        }
        updatedAttempt = attempt;
        return state;
      },
    );

    if (!updatedAttempt) {
      throw new HarnessError(
        'FINISH_FAILED',
        `Failed to record finish for attempt "${id}"`,
      );
    }

    return updatedAttempt;
  }

  /**
   * Marks an attempt as unknown when status or communication is uncertain.
   * Unknown holds budget reservation until verified fence.
   */
  async markUnknown(id: string, token: string): Promise<Attempt> {
    let updatedAttempt: Attempt | null = null;

    await this.store.transaction<LedgerState>(
      LEDGER_RECORD_NAME,
      createInitialLedgerState(),
      (state) => {
        const attempt = state.attempts[id];
        if (!attempt) {
          throw new HarnessError(
            'ATTEMPT_NOT_FOUND',
            `Attempt "${id}" not found in ledger`,
          );
        }

        if (attempt.token !== token) {
          throw new HarnessError(
            'INVALID_TOKEN',
            `Authentication token mismatch for attempt "${id}"`,
          );
        }

        if (TERMINAL_STATES.includes(attempt.state)) {
          throw new HarnessError(
            'INVALID_STATE_TRANSITION',
            `Cannot mark attempt "${id}" as unknown: terminal state "${attempt.state}" is retained`,
          );
        }

        attempt.state = 'unknown';
        updatedAttempt = attempt;
        return state;
      },
    );

    if (!updatedAttempt) {
      throw new HarnessError(
        'MARK_UNKNOWN_FAILED',
        `Failed to mark attempt "${id}" as unknown`,
      );
    }

    return updatedAttempt;
  }

  /**
   * Fences an attempt using authoritative verified termination evidence.
   */
  async fence(
    id: string,
    token: string,
    rawEvidence: TerminationEvidence,
  ): Promise<Attempt> {
    const evidence = this.parseEvidence(rawEvidence);

    if (evidence.confirmed !== true) {
      throw new HarnessError(
        'FENCE_REJECTED',
        'Termination evidence is unconfirmed (confirmed=false); fence requires confirmed runner termination',
      );
    }

    let updatedAttempt: Attempt | null = null;

    await this.store.transaction<LedgerState>(
      LEDGER_RECORD_NAME,
      createInitialLedgerState(),
      async (state) => {
        const attempt = state.attempts[id];
        if (!attempt) {
          throw new HarnessError(
            'ATTEMPT_NOT_FOUND',
            `Attempt "${id}" not found in ledger`,
          );
        }

        if (attempt.token !== token) {
          throw new HarnessError(
            'INVALID_TOKEN',
            `Authentication token mismatch for attempt "${id}"`,
          );
        }

        if (evidence.attemptId !== attempt.id) {
          throw new HarnessError(
            'FENCE_REJECTED',
            `evidence.attemptId ("${evidence.attemptId}") does not match attempt.id ("${attempt.id}")`,
          );
        }

        if (evidence.generation !== attempt.generation) {
          throw new HarnessError(
            'FENCE_REJECTED',
            `evidence.generation (${evidence.generation}) does not match attempt.generation (${attempt.generation})`,
          );
        }

        if (evidence.observedAt < attempt.createdAt) {
          throw new HarnessError(
            'FENCE_REJECTED',
            `evidence.observedAt (${evidence.observedAt}) cannot precede attempt.createdAt (${attempt.createdAt})`,
          );
        }

        if (attempt.state === 'fenced') {
          updatedAttempt = attempt;
          return state;
        }

        if (TERMINAL_STATES.includes(attempt.state)) {
          throw new HarnessError(
            'INVALID_STATE_TRANSITION',
            `Cannot fence attempt "${id}": already in terminal state "${attempt.state}"`,
          );
        }

        if (!this.evidenceVerifier) {
          throw new HarnessError(
            'UNVERIFIED_EVIDENCE',
            'No trusted evidence verifier configured; unverified termination cannot fence attempt',
          );
        }

        const verified = await this.evidenceVerifier.verifyTermination(
          attempt,
          evidence,
        );
        if (!verified) {
          throw new HarnessError(
            'UNVERIFIED_EVIDENCE',
            'Termination evidence verification failed',
          );
        }

        attempt.state = 'fenced';
        attempt.terminationEvidence = evidence;
        updatedAttempt = attempt;
        return state;
      },
    );

    if (!updatedAttempt) {
      throw new HarnessError('FENCE_FAILED', `Failed to fence attempt "${id}"`);
    }

    return updatedAttempt;
  }

  /**
   * Returns all attempts in the ledger.
   */
  async list(): Promise<Attempt[]> {
    const state = await this.readState();
    return Object.values(state.attempts);
  }

  /**
   * Retrieves an attempt by ID, or null if not found.
   */
  async getAttempt(id: string): Promise<Attempt | null> {
    const state = await this.readState();
    return state.attempts[id] ?? null;
  }

  /**
   * Retrieves a budget epoch by ID, or null if not found.
   */
  async getBudget(id: string): Promise<BudgetEpoch | null> {
    const state = await this.readState();
    return state.epochs[id] ?? null;
  }

  /**
   * Returns isolated snapshots of every durably stored budget epoch.
   */
  async listBudgets(): Promise<BudgetEpoch[]> {
    const state = await this.readState();
    return Object.values(state.epochs).map((epoch) => structuredClone(epoch));
  }
}
