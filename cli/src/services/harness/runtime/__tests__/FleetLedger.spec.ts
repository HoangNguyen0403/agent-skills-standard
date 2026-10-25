import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HarnessSetupService } from '../../HarnessSetupService';
import { FleetLedger } from '../FleetLedger';
import { RuntimeStore } from '../RuntimeStore';
import {
  Attempt,
  BudgetEpochRequest,
  canonicalDigest,
  evaluationRuntimeDigest,
  ExecutionBinding,
  FleetConfig,
  FleetEvidenceVerifier,
  FleetTask,
  FrozenEvaluationPlan,
  HarnessError,
  policyDigest,
  resolveHostRuntime,
  RunResult,
  TerminationEvidence,
} from '../RuntimeTypes';
import { createFleetTestConfig } from './FleetTestFixtures';

const SOURCE_SHA = 'a'.repeat(40);

function createSampleTask(
  id = 'task-1',
  overrides: Partial<FleetTask> = {},
): FleetTask {
  return {
    schemaVersion: 1,
    id,
    project: {
      hostId: 'host-local',
      projectId: 'project-default',
      rootPath: '/tmp/ags-test-workspace',
      logicalProjectId: 'logical-default',
    },
    sourceRef: SOURCE_SHA,
    prompt: 'Execute task',
    replaySafe: true,
    phase: 'train',
    deadlineMs: 30000,
    k: 1,
    baseline: {
      schemaVersion: 1,
      id: 'bundle-1',
      scope: {
        kind: 'project',
        key: 'logical-default',
      },
      guidance: 'Base guidance',
      platforms: ['darwin'],
      ompVersions: ['0.13.0'],
    },
    verification: {
      argv: ['npm', 'test'],
      files: {
        'test.js': 'true;',
      },
    },
    toolCallAllowance: 5,
    ...overrides,
  };
}

function createSampleBinding(
  config: FleetConfig,
  task: FleetTask,
  budgetId = 'budget-1',
  runId = 'run-1',
  overrides: Partial<ExecutionBinding> = {},
): ExecutionBinding {
  return {
    runId,
    budgetId,
    taskDigest: canonicalDigest(task),
    hostId: task.project.hostId,
    projectId: task.project.projectId,
    logicalProjectId: task.project.logicalProjectId,
    domain: 'domain-default',
    accountId: 'acc-test',
    provider: 'codex',
    model: 'gpt-5.4',
    sourceRevision: task.sourceRef,
    harnessDigest: canonicalDigest({ stage: 'probe' }),
    evaluatorDigest: canonicalDigest(task.verification),
    runtimeDigest: resolveHostRuntime(config, task.project.hostId)
      .manifestDigest,
    policyDigest: policyDigest(config),
    phase: task.phase,
    stage: 'probe',
    planDigest: canonicalDigest({ plan: 'train' }),
    ...overrides,
  };
}

function createTerminationEvidence(attempt: Attempt): TerminationEvidence {
  return {
    attemptId: attempt.id,
    generation: attempt.generation,
    confirmed: true,
    observedAt: Date.now(),
    containerIds: ['container-1'],
    workerBootId: 'boot-1',
  };
}

function createResult(
  attempt: Attempt,
  status: RunResult['status'] = 'completed',
  overrides: Partial<RunResult> = {},
): RunResult {
  return {
    attemptId: attempt.id,
    status,
    harnessDigest: attempt.binding.harnessDigest,
    sourceRevision: attempt.binding.sourceRevision,
    evaluatorDigest: attempt.binding.evaluatorDigest,
    passed: status === 'completed',
    criticalFailures: [],
    toolCalls: 3,
    durationMs: 500,
    costUsd: null,
    artifactDigest: canonicalDigest({ artifact: 'result' }),
    binding: attempt.binding,
    generation: attempt.generation,
    ...overrides,
  };
}

function makeBudget(
  id = 'budget-1',
  overrides: Partial<BudgetEpochRequest> = {},
): BudgetEpochRequest {
  return {
    id,
    runId: 'run-1',
    createdAt: Date.now(),
    deadline: Date.now() + 50000,
    maxAttempts: 5,
    maxConcurrent: 2,
    maxToolCalls: 20,
    ...overrides,
  };
}

describe('FleetLedger', () => {
  let tempBaseDir: string;
  let stateDir: string;
  let store: RuntimeStore;
  let ledger: FleetLedger;
  let config: FleetConfig;
  let allowCompletion: boolean;
  let allowTermination: boolean;
  let testVerifier: FleetEvidenceVerifier;

  beforeEach(async () => {
    tempBaseDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'ags-ledger-test-'),
    );
    stateDir = path.join(tempBaseDir, 'harness-state');

    const setupService = new HarnessSetupService(stateDir);
    await setupService.setup({
      schemaVersion: 1,
      paseoCommand: '/usr/local/bin/paseo',
    });

    store = new RuntimeStore(stateDir, setupService);

    allowCompletion = true;
    allowTermination = true;
    testVerifier = {
      verifyCompletion: async () => allowCompletion,
      verifyTermination: async () => allowTermination,
    };

    ledger = new FleetLedger(store, testVerifier);
    config = createFleetTestConfig(tempBaseDir, {
      limits: {
        maxConcurrent: 2,
        maxAttempts: 5,
        maxDurationMs: 60000,
        maxToolCalls: 20,
        perHost: 2,
        perProject: 2,
        perAccount: 2,
      },
    });
  });

  afterEach(async () => {
    await fs.remove(tempBaseDir);
  });

  describe('createBudget authority (C6)', () => {
    it('persists frozen policy authority and configured limits', async () => {
      const created = await ledger.createBudget(makeBudget(), config);

      expect(created.reservedAttempts).toBe(0);
      expect(created.reservedToolCalls).toBe(0);
      expect(created.policyDigest).toBe(policyDigest(config));
      expect(created.policyGeneration).toBe(config.generation);
      expect(created.frozenLimits.maxToolCalls).toBe(
        config.limits.maxToolCalls,
      );
      expect(await ledger.getBudget('budget-1')).toEqual(created);
    });
    it('lists durable budget epochs as isolated snapshots', async () => {
      const created = await ledger.createBudget(makeBudget(), config);
      const task = createSampleTask('budget-list-snapshot');
      await ledger.reserve(
        task,
        'acc-test',
        config,
        createSampleBinding(config, task),
      );

      const snapshots = await ledger.listBudgets();
      expect(snapshots).toEqual([
        expect.objectContaining({
          ...created,
          reservedAttempts: 1,
          reservedToolCalls: task.toolCallAllowance,
        }),
      ]);
      const snapshot = snapshots.find((epoch) => epoch.id === created.id);
      if (!snapshot) {
        throw new Error('Expected the persisted budget epoch in the list');
      }
      snapshot.reservedAttempts = 99;

      await expect(ledger.getBudget('budget-1')).resolves.toMatchObject({
        ...created,
        reservedAttempts: 1,
        reservedToolCalls: task.toolCallAllowance,
      });
    });

    it('rejects caller-supplied derived authority fields', async () => {
      const request = {
        ...makeBudget(),
        policyDigest: 'forged',
      } as unknown as BudgetEpochRequest;

      await expect(ledger.createBudget(request, config)).rejects.toMatchObject({
        code: 'INVALID_BUDGET',
      });
    });

    it('rejects invalid creation windows and oversized caps', async () => {
      await expect(
        ledger.createBudget(
          makeBudget('budget-skew', {
            createdAt: Date.now() + 5 * 60_000,
            deadline: Date.now() + 10 * 60_000,
          }),
          config,
        ),
      ).rejects.toMatchObject({ code: 'INVALID_BUDGET' });

      await expect(
        ledger.createBudget(
          makeBudget('budget-expired', { deadline: Date.now() - 1 }),
          config,
        ),
      ).rejects.toMatchObject({ code: 'INVALID_BUDGET' });

      await expect(
        ledger.createBudget(
          makeBudget('budget-over', { maxAttempts: 50 }),
          config,
        ),
      ).rejects.toMatchObject({ code: 'INVALID_BUDGET' });
    });

    it('ensures independent stores do not leak ledger fallback state (C9)', async () => {
      await ledger.createBudget(makeBudget(), config);

      const stateDir2 = path.join(tempBaseDir, 'harness-state-2');
      const setupService2 = new HarnessSetupService(stateDir2);
      await setupService2.setup({
        schemaVersion: 1,
        paseoCommand: '/usr/local/bin/paseo',
      });
      const store2 = new RuntimeStore(stateDir2, setupService2);
      const ledger2 = new FleetLedger(store2, testVerifier);

      expect(await ledger2.getBudget('budget-1')).toBeNull();
      await expect(
        ledger2.createBudget(
          makeBudget('budget-1', { runId: 'run-different' }),
          config,
        ),
      ).resolves.toMatchObject({ id: 'budget-1', runId: 'run-different' });
    });
  });

  describe('reserve admission', () => {
    beforeEach(async () => {
      await ledger.createBudget(makeBudget(), config);
    });

    it('reserves an execution attempt and updates budget counts', async () => {
      const task = createSampleTask();
      const binding = createSampleBinding(config, task);

      const attempt = await ledger.reserve(task, 'acc-test', config, binding);

      expect(attempt.state).toBe('admitted');
      expect(attempt.reservedToolCalls).toBe(5);
      expect(attempt.generation).toBe(config.generation);

      const updatedBudget = await ledger.getBudget(binding.budgetId);
      expect(updatedBudget?.reservedAttempts).toBe(1);
      expect(updatedBudget?.reservedToolCalls).toBe(5);
    });

    it('rejects binding with mismatched runId (C6)', async () => {
      const task = createSampleTask('task-bad-run');
      const binding = createSampleBinding(
        config,
        task,
        'budget-1',
        'wrong-run-id',
      );

      await expect(
        ledger.reserve(task, 'acc-test', config, binding),
      ).rejects.toMatchObject({ code: 'BINDING_MISMATCH' });
    });

    it('denies existing epoch admission after policy reconfiguration (C6)', async () => {
      const reconfigured: FleetConfig = {
        ...config,
        generation: config.generation + 1,
      };
      const task = createSampleTask('task-new-policy');
      const binding = createSampleBinding(reconfigured, task);

      await expect(
        ledger.reserve(task, 'acc-test', reconfigured, binding),
      ).rejects.toMatchObject({ code: 'EPOCH_POLICY_AUTHORITY_MISMATCH' });
    });

    it('rejects every forged immutable binding field before model work (C7)', async () => {
      const task = createSampleTask('task-forged');

      const forgedBindings: Array<Partial<ExecutionBinding>> = [
        { taskDigest: canonicalDigest({ task: 'other' }) },
        { provider: 'other-provider' },
        { model: 'other-model' },
        { evaluatorDigest: canonicalDigest({ verification: 'other' }) },
        { runtimeDigest: 'runtime-digest-other' },
        { logicalProjectId: 'host-local:other-project' },
        { domain: 'private' },
      ];

      for (const forged of forgedBindings) {
        const binding = createSampleBinding(
          config,
          task,
          'budget-1',
          'run-1',
          forged,
        );
        await expect(
          ledger.reserve(task, 'acc-test', config, binding),
        ).rejects.toThrow(HarnessError);
      }
    });

    it('rejects symbolic source refs and mismatched source revisions', async () => {
      const symbolicTask = createSampleTask('task-symbolic', {
        sourceRef: 'main',
      });
      await expect(
        ledger.reserve(
          symbolicTask,
          'acc-test',
          config,
          createSampleBinding(config, symbolicTask),
        ),
      ).rejects.toMatchObject({ code: 'SOURCE_NOT_IMMUTABLE' });

      const task = createSampleTask('task-source');
      const binding = createSampleBinding(config, task, 'budget-1', 'run-1', {
        sourceRevision: 'b'.repeat(40),
      });
      await expect(
        ledger.reserve(task, 'acc-test', config, binding),
      ).rejects.toMatchObject({ code: 'BINDING_MISMATCH' });
    });

    it('rejects replaySafe=false tasks with REPLAY_UNSAFE', async () => {
      const task = createSampleTask('unsafe-task', { replaySafe: false });

      await expect(
        ledger.reserve(
          task,
          'acc-test',
          config,
          createSampleBinding(config, task),
        ),
      ).rejects.toMatchObject({ code: 'REPLAY_UNSAFE' });
    });

    it('denies active or unknown duplicate task execution', async () => {
      const task = createSampleTask('task-dup');
      const binding = createSampleBinding(config, task);

      await ledger.reserve(task, 'acc-test', config, binding);

      await expect(
        ledger.reserve(task, 'acc-test', config, binding),
      ).rejects.toMatchObject({ code: 'DUPLICATE_TASK_EXECUTION' });
    });
  });

  describe('concurrency limits (C6)', () => {
    it('enforces epoch concurrency independently of tool credits', async () => {
      await ledger.createBudget(makeBudget('budget-conc'), config);

      const reserveTask = async (id: string) => {
        const task = createSampleTask(id);
        return ledger.reserve(
          task,
          'acc-test',
          config,
          createSampleBinding(config, task, 'budget-conc'),
        );
      };

      await reserveTask('task-e1');
      await reserveTask('task-e2');

      await expect(reserveTask('task-e3')).rejects.toMatchObject({
        code: 'CONCURRENCY_LIMIT_EXCEEDED',
      });
    });
    it('enforces an epoch attempt cap narrower than configured policy', async () => {
      await ledger.createBudget(
        makeBudget('budget-attempt-cap', { maxAttempts: 1, maxConcurrent: 2 }),
        config,
      );
      const reserveTask = async (id: string) => {
        const task = createSampleTask(id);
        return ledger.reserve(
          task,
          'acc-test',
          config,
          createSampleBinding(config, task, 'budget-attempt-cap'),
        );
      };

      await reserveTask('attempt-cap-first');
      await expect(reserveTask('attempt-cap-second')).rejects.toMatchObject({
        code: 'BUDGET_EXHAUSTED',
      });
    });

    it('enforces an epoch concurrency cap narrower than configured policy', async () => {
      await ledger.createBudget(
        makeBudget('budget-concurrency-cap', { maxConcurrent: 1 }),
        config,
      );
      const reserveTask = async (id: string) => {
        const task = createSampleTask(id);
        return ledger.reserve(
          task,
          'acc-test',
          config,
          createSampleBinding(config, task, 'budget-concurrency-cap'),
        );
      };

      await reserveTask('concurrency-cap-first');
      await expect(reserveTask('concurrency-cap-second')).rejects.toMatchObject(
        {
          code: 'CONCURRENCY_LIMIT_EXCEEDED',
        },
      );
    });

    it('enforces an epoch tool-call cap narrower than configured policy', async () => {
      await ledger.createBudget(
        makeBudget('budget-tool-cap', { maxToolCalls: 5 }),
        config,
      );
      const reserveTask = async (id: string) => {
        const task = createSampleTask(id, { toolCallAllowance: 3 });
        return ledger.reserve(
          task,
          'acc-test',
          config,
          createSampleBinding(config, task, 'budget-tool-cap'),
        );
      };

      await reserveTask('tool-cap-first');
      await expect(reserveTask('tool-cap-second')).rejects.toMatchObject({
        code: 'TOOL_CALL_BUDGET_EXHAUSTED',
      });
    });

    it('counts alias-linked checkouts against one logical-project cap', async () => {
      const aliasedConfig = createFleetTestConfig(tempBaseDir, {
        limits: { ...config.limits, perProject: 1 },
        projectAliases: [
          {
            hostId: 'host-local',
            projectId: 'project-default',
            logicalProjectId: 'logical-default',
            domain: 'domain-default',
            accountId: 'acc-test',
          },
          {
            hostId: 'host-local',
            projectId: 'project-second',
            logicalProjectId: 'logical-default',
            domain: 'domain-default',
            accountId: 'acc-test',
          },
        ],
      });
      await ledger.createBudget(makeBudget('budget-alias'), aliasedConfig);

      const firstTask = createSampleTask('task-a');
      await ledger.reserve(
        firstTask,
        'acc-test',
        aliasedConfig,
        createSampleBinding(aliasedConfig, firstTask, 'budget-alias'),
      );

      const secondTask = createSampleTask('task-b', {
        project: { ...firstTask.project, projectId: 'project-second' },
      });
      await expect(
        ledger.reserve(
          secondTask,
          'acc-test',
          aliasedConfig,
          createSampleBinding(aliasedConfig, secondTask, 'budget-alias'),
        ),
      ).rejects.toMatchObject({ code: 'CONCURRENCY_LIMIT_EXCEEDED' });
    });
  });

  describe('heldout frozen plan admission (C7)', () => {
    let heldoutTask: FleetTask;
    let plan: FrozenEvaluationPlan;
    let candidateId: string;
    let planDigest: string;

    beforeEach(async () => {
      await ledger.createBudget(makeBudget(), config);
      heldoutTask = createSampleTask('task-heldout', { phase: 'heldout' });
      candidateId = crypto.randomUUID();
      const baselineId = crypto.randomUUID();

      plan = {
        schemaVersion: 1,
        id: 'plan-1',
        releaseDigest: canonicalDigest({ bundle: 'candidate' }),
        baselineDigest: canonicalDigest(heldoutTask.baseline),
        policyDigest: policyDigest(config),
        runtimeDigest: evaluationRuntimeDigest(config, [
          { hostId: heldoutTask.project.hostId },
        ]),
        requiredProjects: [heldoutTask.project.projectId],
        minImprovement: 0.1,
        maxRegressions: 0,
        cases: [
          {
            id: 'case-1',
            taskDigest: canonicalDigest(heldoutTask),
            hostId: heldoutTask.project.hostId,
            projectId: heldoutTask.project.projectId,
            logicalProjectId: heldoutTask.project.logicalProjectId,
            accountId: 'acc-test',
            sourceRevision: heldoutTask.sourceRef,
            evaluatorDigest: canonicalDigest(heldoutTask.verification),
            runtimeDigest: resolveHostRuntime(
              config,
              heldoutTask.project.hostId,
            ).manifestDigest,
            baselineAttemptId: baselineId,
            candidateAttemptId: candidateId,
          },
        ],
      };
      planDigest = canonicalDigest(plan);
    });

    it('denies heldout admission without an immutable frozen plan', async () => {
      const binding = createSampleBinding(
        config,
        heldoutTask,
        'budget-1',
        'run-1',
        {
          phase: 'heldout',
          stage: 'evaluation',
          planDigest,
          harnessDigest: plan.releaseDigest,
        },
      );

      await expect(
        ledger.reserve(heldoutTask, 'acc-test', config, binding, candidateId),
      ).rejects.toMatchObject({ code: 'HELDOUT_PLAN_REQUIRED' });
    });

    it('admits only the exact preallocated candidate case and stage', async () => {
      await store.createImmutable(`plan-${planDigest}`, plan);

      const binding = createSampleBinding(
        config,
        heldoutTask,
        'budget-1',
        'run-1',
        {
          phase: 'heldout',
          stage: 'evaluation',
          planDigest,
          harnessDigest: plan.releaseDigest,
        },
      );

      const attempt = await ledger.reserve(
        heldoutTask,
        'acc-test',
        config,
        binding,
        candidateId,
      );
      expect(attempt.id).toBe(candidateId);

      // Both heldout roles are evaluation stage; the baseline role is bound by
      // its exact preallocated attempt ID and the plan baseline harness digest.
      const baselineBinding = createSampleBinding(
        config,
        heldoutTask,
        'budget-1',
        'run-1',
        {
          phase: 'heldout',
          stage: 'evaluation',
          planDigest,
          harnessDigest: plan.baselineDigest,
        },
      );
      const baselineAttempt = await ledger.reserve(
        heldoutTask,
        'acc-test',
        config,
        baselineBinding,
        plan.cases[0].baselineAttemptId,
      );
      expect(baselineAttempt.id).toBe(plan.cases[0].baselineAttemptId);

      await expect(
        ledger.reserve(
          createSampleTask('task-heldout-wrong-id', { phase: 'heldout' }),
          'acc-test',
          config,
          createSampleBinding(
            config,
            createSampleTask('task-heldout-wrong-id', { phase: 'heldout' }),
            'budget-1',
            'run-1',
            {
              phase: 'heldout',
              stage: 'evaluation',
              planDigest,
              harnessDigest: plan.releaseDigest,
            },
          ),
          crypto.randomUUID(),
        ),
      ).rejects.toMatchObject({ code: 'HELDOUT_CASE_MISMATCH' });
    });

    it('denies swapped heldout stage or harness identity', async () => {
      await store.createImmutable(`plan-${planDigest}`, plan);

      const wrongStage = createSampleBinding(
        config,
        heldoutTask,
        'budget-1',
        'run-1',
        {
          phase: 'heldout',
          stage: 'baseline',
          planDigest,
          harnessDigest: plan.baselineDigest,
        },
      );
      await expect(
        ledger.reserve(
          heldoutTask,
          'acc-test',
          config,
          wrongStage,
          candidateId,
        ),
      ).rejects.toMatchObject({ code: 'HELDOUT_STAGE_MISMATCH' });

      const wrongHarness = createSampleBinding(
        config,
        heldoutTask,
        'budget-1',
        'run-1',
        {
          phase: 'heldout',
          stage: 'evaluation',
          planDigest,
          harnessDigest: plan.baselineDigest,
        },
      );
      await expect(
        ledger.reserve(
          heldoutTask,
          'acc-test',
          config,
          wrongHarness,
          candidateId,
        ),
      ).rejects.toMatchObject({ code: 'FROZEN_PLAN_MISMATCH' });
    });

    it('requires planned attempt IDs for heldout tasks', async () => {
      await expect(
        ledger.reserve(
          heldoutTask,
          'acc-test',
          config,
          createSampleBinding(config, heldoutTask, 'budget-1', 'run-1', {
            phase: 'heldout',
            stage: 'evaluation',
            planDigest,
            harnessDigest: plan.releaseDigest,
          }),
        ),
      ).rejects.toMatchObject({ code: 'HELDOUT_PLAN_REQUIRED' });
    });
  });

  describe('terminal transitions require verified evidence (C8)', () => {
    let attempt: Attempt;

    beforeEach(async () => {
      await ledger.createBudget(makeBudget(), config);
      const task = createSampleTask('task-lifecycle');
      attempt = await ledger.reserve(
        task,
        'acc-test',
        config,
        createSampleBinding(config, task),
      );
    });

    it('rejects finish directly from admitted state', async () => {
      await expect(
        ledger.finish(attempt.id, attempt.token, createResult(attempt)),
      ).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
    });

    it('completes with verified completion evidence', async () => {
      await ledger.start(attempt.id, attempt.token, 12345);
      const finished = await ledger.finish(
        attempt.id,
        attempt.token,
        createResult(attempt),
      );

      expect(finished.state).toBe('completed');
      expect(finished.result?.passed).toBe(true);
    });

    it('preserves unknown when the verifier is absent or denies completion', async () => {
      await ledger.start(attempt.id, attempt.token, 12345);

      const unverifiedLedger = new FleetLedger(store);
      const finished = await unverifiedLedger.finish(
        attempt.id,
        attempt.token,
        createResult(attempt),
      );
      expect(finished.state).toBe('unknown');
      expect(finished.result).toMatchObject({
        status: 'unknown',
        passed: false,
      });

      expect(await ledger.getAttempt(attempt.id)).toMatchObject({
        state: 'unknown',
      });

      allowCompletion = false;
      const denied = await ledger.finish(
        attempt.id,
        attempt.token,
        createResult(attempt),
      );
      expect(denied.state).toBe('unknown');
    });

    it('does not release capacity for failed without verified termination evidence', async () => {
      await ledger.start(attempt.id, attempt.token, 12345);

      const result = createResult(attempt, 'failed', { passed: false });
      const noEvidence = await ledger.finish(attempt.id, attempt.token, result);
      expect(noEvidence.state).toBe('unknown');

      const unverifiedLedger = new FleetLedger(store);
      const noVerifier = await unverifiedLedger.finish(
        attempt.id,
        attempt.token,
        result,
        createTerminationEvidence(attempt),
      );
      expect(noVerifier.state).toBe('unknown');
    });

    it('accepts failed with verified termination evidence and retains provenance', async () => {
      await ledger.start(attempt.id, attempt.token, 12345);
      const evidence = createTerminationEvidence(attempt);

      const finished = await ledger.finish(
        attempt.id,
        attempt.token,
        createResult(attempt, 'failed', { passed: false }),
        evidence,
      );

      expect(finished.state).toBe('failed');
      expect(finished.terminationEvidence).toEqual(evidence);
    });

    it('reconciles unknown to completed only with verified authority', async () => {
      await ledger.start(attempt.id, attempt.token, 12345);
      await ledger.markUnknown(attempt.id, attempt.token);

      const finished = await ledger.finish(
        attempt.id,
        attempt.token,
        createResult(attempt),
      );
      expect(finished.state).toBe('completed');
    });

    it('retains terminal outcomes against later overwrite attempts', async () => {
      await ledger.start(attempt.id, attempt.token, 12345);
      await ledger.finish(attempt.id, attempt.token, createResult(attempt));

      await expect(
        ledger.markUnknown(attempt.id, attempt.token),
      ).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });

      await expect(
        ledger.finish(
          attempt.id,
          attempt.token,
          createResult(attempt, 'failed', { passed: false }),
          createTerminationEvidence(attempt),
        ),
      ).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
    });

    it('rejects malformed result and evidence schemas before transition', async () => {
      await ledger.start(attempt.id, attempt.token, 12345);

      const invalidResult = {
        ...createResult(attempt),
        unexpectedField: true,
      } as unknown as RunResult;
      await expect(
        ledger.finish(attempt.id, attempt.token, invalidResult),
      ).rejects.toMatchObject({ code: 'INVALID_RESULT' });

      const invalidEvidence = {
        ...createTerminationEvidence(attempt),
        confirmed: 'yes',
      } as unknown as TerminationEvidence;
      await expect(
        ledger.finish(
          attempt.id,
          attempt.token,
          createResult(attempt, 'failed', { passed: false }),
          invalidEvidence,
        ),
      ).rejects.toMatchObject({ code: 'INVALID_EVIDENCE' });
    });

    it('fences only with verified confirmed termination', async () => {
      await ledger.start(attempt.id, attempt.token, 12345);
      await ledger.markUnknown(attempt.id, attempt.token);

      const unconfirmed = {
        ...createTerminationEvidence(attempt),
        confirmed: false,
      };
      await expect(
        ledger.fence(attempt.id, attempt.token, unconfirmed),
      ).rejects.toMatchObject({ code: 'FENCE_REJECTED' });

      allowTermination = false;
      await expect(
        ledger.fence(
          attempt.id,
          attempt.token,
          createTerminationEvidence(attempt),
        ),
      ).rejects.toMatchObject({ code: 'UNVERIFIED_EVIDENCE' });

      allowTermination = true;
      const evidence = createTerminationEvidence(attempt);
      const fenced = await ledger.fence(attempt.id, attempt.token, evidence);
      expect(fenced.state).toBe('fenced');
      expect(fenced.terminationEvidence).toEqual(evidence);
    });
  });
});
