import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HarnessSetupService } from '../../HarnessSetupService';
import {
  evidenceTranscriptRecordName,
  EvidenceService,
} from '../EvidenceService';
import { FleetLedger } from '../FleetLedger';
import { RuntimeStore } from '../RuntimeStore';
import {
  Attempt,
  canonicalDigest,
  ExecutionBinding,
  FleetConfig,
  FleetTask,
  FrozenEvaluationPlan,
  HarnessBundle,
  policyDigest,
  RunResult,
} from '../RuntimeTypes';
import {
  approverKeyMaterial,
  buildFrozenPlan,
  hostRuntimeDigest,
  IMMUTABLE_SOURCE_SHA,
  SyntheticReceiptVerifier,
} from './fleetEvidenceTestSupport';
import { createFleetTestConfig, generateTestKeys } from './FleetTestFixtures';

interface StagedPlan {
  planDigest: string;
  baselineAttemptId: string;
  candidateAttemptId: string;
}

describe('EvidenceService', () => {
  let tempDir: string;
  let projectRoot: string;
  let setupService: HarnessSetupService;
  let store: RuntimeStore;
  let ledger: FleetLedger;
  let verifier: SyntheticReceiptVerifier;
  let evidenceService: EvidenceService;
  let config: FleetConfig;

  const sampleBundle: HarnessBundle = {
    schemaVersion: 1,
    id: 'bundle-baseline-1',
    scope: { kind: 'fleet', key: '*' },
    guidance: 'Always follow zero-trust rules.',
    platforms: ['darwin', 'linux'],
    ompVersions: ['0.13.0'],
  };

  const candidateBundle: HarnessBundle = {
    ...sampleBundle,
    id: 'bundle-candidate-1',
    guidance: 'Candidate guidance: keep invariants explicit.',
  };

  const sampleTask: FleetTask = {
    schemaVersion: 1,
    id: 'task-1',
    project: {
      hostId: 'host-local',
      projectId: 'project-default',
      rootPath: '',
      logicalProjectId: 'logical-default',
    },
    sourceRef: IMMUTABLE_SOURCE_SHA,
    prompt: 'Fix the authentication bug with sensitive details',
    replaySafe: true,
    phase: 'heldout',
    deadlineMs: 30000,
    k: 1,
    baseline: sampleBundle,
    verification: {
      argv: ['npm', 'test'],
      files: { 'test.spec.ts': 'secret test code' },
    },
    toolCallAllowance: 5,
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-evidence-test-'));
    projectRoot = path.join(tempDir, 'repo', 'proj-1');
    await fs.ensureDir(projectRoot);
    sampleTask.project.rootPath = projectRoot;

    setupService = new HarnessSetupService(tempDir);
    await setupService.setup({
      schemaVersion: 1,
      paseoCommand: '/usr/local/bin/paseo',
    });
    store = new RuntimeStore(tempDir, setupService);

    const approver = approverKeyMaterial();
    config = createFleetTestConfig(tempDir, {
      domains: [
        {
          id: 'domain-default',
          hostIds: ['host-local', '*'],
          pathPrefixes: [tempDir],
        },
      ],
      rules: [
        {
          id: 'rule-default',
          domain: 'domain-default',
          hostIds: ['*'],
          pathPrefixes: [tempDir],
          accountId: 'acc-test',
          enabled: true,
          allowModelData: true,
        },
      ],
      approvers: [
        { id: 'approver-evidence', publicKey: approver.publicKeySpki },
      ],
      evaluation: { minImprovement: 0, maxRegressions: 5 },
    });

    verifier = new SyntheticReceiptVerifier();
    ledger = new FleetLedger(store, verifier);
    evidenceService = new EvidenceService(store, ledger);

    await ledger.createBudget(
      {
        id: 'budget-1',
        runId: 'run-1',
        createdAt: Date.now(),
        deadline: Date.now() + 120000,
        maxAttempts: 10,
        maxConcurrent: 4,
        maxToolCalls: 50,
      },
      config,
    );
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  const evaluatorDigest = (): string =>
    canonicalDigest(sampleTask.verification);
  const runtimeDigest = (): string =>
    hostRuntimeDigest(config, sampleTask.project.hostId);

  function createBinding(
    planDigest: string,
    overrides: Partial<ExecutionBinding> = {},
  ): ExecutionBinding {
    return {
      runId: 'run-1',
      budgetId: 'budget-1',
      taskDigest: canonicalDigest(sampleTask),
      hostId: sampleTask.project.hostId,
      projectId: sampleTask.project.projectId,
      logicalProjectId: sampleTask.project.logicalProjectId,
      domain: 'domain-default',
      accountId: 'acc-test',
      provider: 'codex',
      model: 'gpt-5.4',
      sourceRevision: IMMUTABLE_SOURCE_SHA,
      harnessDigest: canonicalDigest(sampleBundle),
      evaluatorDigest: evaluatorDigest(),
      runtimeDigest: runtimeDigest(),
      policyDigest: policyDigest(config),
      phase: 'heldout',
      stage: 'evaluation',
      planDigest,
      ...overrides,
    };
  }

  function createResult(
    attemptId: string,
    binding: ExecutionBinding,
    overrides: Partial<RunResult> = {},
  ): RunResult {
    return {
      attemptId,
      status: 'completed',
      harnessDigest: binding.harnessDigest,
      sourceRevision: binding.sourceRevision,
      evaluatorDigest: binding.evaluatorDigest,
      passed: true,
      criticalFailures: [],
      toolCalls: 3,
      durationMs: 1500,
      costUsd: 0.05,
      artifactDigest: 'sha256-artifact-9999',
      binding,
      generation: 1,
      ...overrides,
    };
  }

  function buildCase(
    baselineAttemptId: string,
    candidateAttemptId: string,
  ): FrozenEvaluationPlan['cases'][number] {
    return {
      id: crypto.randomUUID(),
      taskDigest: canonicalDigest(sampleTask),
      hostId: sampleTask.project.hostId,
      projectId: sampleTask.project.projectId,
      logicalProjectId: sampleTask.project.logicalProjectId,
      accountId: 'acc-test',
      sourceRevision: IMMUTABLE_SOURCE_SHA,
      evaluatorDigest: evaluatorDigest(),
      runtimeDigest: runtimeDigest(),
      baselineAttemptId,
      candidateAttemptId,
    };
  }

  function planFor(
    baselineAttemptId: string,
    candidateAttemptId: string,
    overrides: Partial<FrozenEvaluationPlan> = {},
  ): FrozenEvaluationPlan {
    const plan = buildFrozenPlan(config, {
      id: crypto.randomUUID(),
      releaseDigest: canonicalDigest(candidateBundle),
      baselineDigest: canonicalDigest(sampleBundle),
      requiredProjects: [sampleTask.project.logicalProjectId],
      minImprovement: config.evaluation.minImprovement,
      maxRegressions: config.evaluation.maxRegressions,
      cases: [buildCase(baselineAttemptId, candidateAttemptId)],
    });
    return { ...plan, ...overrides };
  }

  async function createPlan(
    overrides: Partial<FrozenEvaluationPlan> = {},
  ): Promise<StagedPlan> {
    const baselineAttemptId = crypto.randomUUID();
    const candidateAttemptId = crypto.randomUUID();
    const { digest } = await evidenceService.freezePlan(
      planFor(baselineAttemptId, candidateAttemptId, overrides),
    );
    return { planDigest: digest, baselineAttemptId, candidateAttemptId };
  }

  function bindingForRole(
    staged: StagedPlan,
    role: 'baseline' | 'candidate',
  ): ExecutionBinding {
    return createBinding(staged.planDigest, {
      stage: 'evaluation',
      harnessDigest:
        role === 'baseline'
          ? canonicalDigest(sampleBundle)
          : canonicalDigest(candidateBundle),
    });
  }

  async function admit(
    staged: StagedPlan,
    role: 'baseline' | 'candidate',
  ): Promise<{ binding: ExecutionBinding; attempt: Attempt }> {
    const attemptId =
      role === 'baseline'
        ? staged.baselineAttemptId
        : staged.candidateAttemptId;
    const binding = bindingForRole(staged, role);
    const attempt = await ledger.reserve(
      sampleTask,
      'acc-test',
      config,
      binding,
      attemptId,
    );
    const started = await ledger.start(attempt.id, attempt.token, 4321);
    return { binding, attempt: started };
  }

  async function completeStage(
    staged: StagedPlan,
    role: 'baseline' | 'candidate',
    overrides: Partial<RunResult> = {},
  ): Promise<RunResult> {
    const { binding, attempt } = await admit(staged, role);
    const result = createResult(attempt.id, binding, overrides);
    if (result.status === 'completed') {
      verifier.issueCompletion(attempt, result);
    }
    await ledger.finish(attempt.id, attempt.token, result);
    return result;
  }

  async function stagePair(
    overrides: {
      baseline?: Partial<RunResult>;
      candidate?: Partial<RunResult>;
    } = {},
  ): Promise<StagedPlan & { baseline: RunResult; candidate: RunResult }> {
    const staged = await createPlan();
    const baseline = await completeStage(
      staged,
      'baseline',
      overrides.baseline,
    );
    await evidenceService.record(sampleTask, baseline);
    const candidate = await completeStage(
      staged,
      'candidate',
      overrides.candidate,
    );
    await evidenceService.record(sampleTask, candidate);
    return { ...staged, baseline, candidate };
  }

  describe('record', () => {
    it('records an authoritative ledger result with private transcript evidence', async () => {
      const staged = await createPlan();
      const result = await completeStage(staged, 'candidate');
      await evidenceService.record(
        sampleTask,
        result,
        'Top secret raw model transcript',
      );

      const summaries = await evidenceService.exportSummaries();
      expect(summaries).toHaveLength(1);
      expect(summaries[0].attemptId).toBe(result.attemptId);
      expect(summaries[0].passed).toBe(true);
      expect(summaries[0].taskDigest).toBe(canonicalDigest(sampleTask));

      const storedTranscript = await store.read<{
        transcript: string;
        transcriptDigest: string;
      } | null>(
        evidenceTranscriptRecordName(result.attemptId, canonicalDigest(result)),
        null,
      );
      expect(storedTranscript?.transcript).toBe(
        'Top secret raw model transcript',
      );
      expect(storedTranscript?.transcriptDigest).toBe(
        crypto
          .createHash('sha256')
          .update('Top secret raw model transcript')
          .digest('hex'),
      );
    });

    it('preserves a verified failed outcome for denominator preservation', async () => {
      const staged = await createPlan();
      const { binding, attempt } = await admit(staged, 'candidate');
      const failed = createResult(attempt.id, binding, {
        status: 'failed',
        passed: false,
        criticalFailures: ['TEST_FAILURE'],
      });
      const evidence = {
        attemptId: attempt.id,
        generation: attempt.generation,
        confirmed: true,
        observedAt: Date.now(),
        containerIds: ['container-1'],
        workerBootId: 'boot-1',
      };
      verifier.issueTermination(attempt, evidence);
      const finished = await ledger.finish(
        attempt.id,
        attempt.token,
        failed,
        evidence,
      );
      expect(finished.state).toBe('failed');

      await evidenceService.record(sampleTask, failed);
      const summaries = await evidenceService.exportSummaries();
      expect(summaries[0].status).toBe('failed');
      expect(summaries[0].passed).toBe(false);
      expect(summaries[0].criticalFailures).toEqual(['TEST_FAILURE']);
    });

    it('denies caller-authored outcomes for an attempt that has no ledger result', async () => {
      const staged = await createPlan();
      const { binding, attempt } = await admit(staged, 'candidate');
      await ledger.markUnknown(attempt.id, attempt.token);

      const fabricated = createResult(attempt.id, binding, {
        status: 'unknown',
        passed: false,
        criticalFailures: ['INVENTED_FAILURE'],
      });
      await expect(
        evidenceService.record(sampleTask, fabricated),
      ).rejects.toThrowError(/ATTEMPT_RESULT_MISSING/);

      const unresolved = await evidenceService.unresolvedAttempts();
      expect(unresolved).toHaveLength(1);
      expect(unresolved[0]).toMatchObject({
        attemptId: attempt.id,
        state: 'unknown',
        logicalProjectId: 'logical-default',
      });
      expect(Object.keys(unresolved[0]).sort()).toEqual(
        [
          'accountId',
          'attemptId',
          'budgetId',
          'createdAt',
          'deadline',
          'generation',
          'hostId',
          'logicalProjectId',
          'phase',
          'projectId',
          'stage',
          'state',
          'taskDigest',
        ].sort(),
      );
      expect(await evidenceService.exportSummaries()).toHaveLength(0);
    });

    it('rejects record when ledger state does not match the result status', async () => {
      const staged = await createPlan();
      const result = await completeStage(staged, 'candidate');
      await expect(
        evidenceService.record(sampleTask, { ...result, status: 'failed' }),
      ).rejects.toThrowError(/INVALID_STATE_TRANSITION/);
    });

    it('rejects record for an attempt that was never admitted', async () => {
      const binding = createBinding('sha256-plan-unused');
      const result = createResult(crypto.randomUUID(), binding);
      await expect(
        evidenceService.record(sampleTask, result),
      ).rejects.toThrowError(/ATTEMPT_NOT_FOUND/);
    });

    it('rejects a caller result that diverges from the authoritative ledger result', async () => {
      const staged = await createPlan();
      const result = await completeStage(staged, 'candidate');
      await expect(
        evidenceService.record(sampleTask, { ...result, toolCalls: 99 }),
      ).rejects.toThrowError(/RESULT_MISMATCH/);
    });

    it('rejects record when the supplied task no longer matches the bound task digest', async () => {
      const staged = await createPlan();
      const result = await completeStage(staged, 'candidate');
      const mutatedTask: FleetTask = {
        ...sampleTask,
        prompt: 'Different prompt',
      };
      await expect(
        evidenceService.record(mutatedTask, result),
      ).rejects.toThrowError(/BINDING_MISMATCH.*taskDigest/);
    });

    it('rejects a completed result whose artifact digest is blank', async () => {
      const staged = await createPlan();
      const result = await completeStage(staged, 'candidate', {
        artifactDigest: '   ',
      });
      await expect(
        evidenceService.record(sampleTask, result),
      ).rejects.toThrowError(/INVALID_RESULT.*non-empty/);
    });

    it('is idempotent for an identical retry and refuses a later transcript association', async () => {
      const staged = await createPlan();
      const result = await completeStage(staged, 'candidate');
      await evidenceService.record(sampleTask, result);
      await expect(
        evidenceService.record(sampleTask, result),
      ).resolves.not.toThrow();
      await expect(
        evidenceService.record(sampleTask, result, 'late transcript'),
      ).rejects.toThrowError(/IMMUTABLE_RECORD_CONFLICT/);
      expect(await evidenceService.exportSummaries()).toHaveLength(1);
    });

    it('never treats a store-forged evidence revision as authoritative', async () => {
      const staged = await createPlan();
      const result = await completeStage(staged, 'candidate');
      await evidenceService.record(sampleTask, result);

      await store.createImmutable(`evidence-${result.attemptId}-forged`, {
        attemptId: result.attemptId,
        task: sampleTask,
        result: {
          ...result,
          passed: false,
          binding: { ...result.binding, stage: 'proposal' },
        },
        recordedAt: 1,
      });

      const summaries = await evidenceService.exportSummaries();
      expect(summaries).toHaveLength(1);
      expect(summaries[0].passed).toBe(true);
    });
  });

  describe('exportSummaries', () => {
    it('allowlists safe fields and omits prompt, source, root path and transcript', async () => {
      const staged = await createPlan();
      const result = await completeStage(staged, 'candidate');
      await evidenceService.record(
        sampleTask,
        result,
        'super-secret-transcript-token',
      );

      const summary = (
        await evidenceService.exportSummaries()
      )[0] as unknown as Record<string, unknown>;
      expect(summary.attemptId).toBe(result.attemptId);
      expect(summary.status).toBe('completed');
      expect(summary.taskDigest).toBe(canonicalDigest(sampleTask));
      for (const forbidden of [
        'prompt',
        'source',
        'rootPath',
        'transcript',
        'verification',
        'files',
      ]) {
        expect(summary[forbidden]).toBeUndefined();
      }
    });
  });

  describe('freezePlan', () => {
    it('persists an immutable digest-keyed plan and is idempotent', async () => {
      const staged = await createPlan();
      const plan = planFor(staged.baselineAttemptId, staged.candidateAttemptId);
      const { digest } = await evidenceService.freezePlan(plan);
      expect(digest).toBe(canonicalDigest(plan));
      const again = await evidenceService.freezePlan(plan);
      expect(again.digest).toBe(digest);
    });

    it('rejects reuse of one attempt across case roles and cases', async () => {
      const shared = crypto.randomUUID();
      const first = buildCase(shared, crypto.randomUUID());
      const second = {
        ...buildCase(crypto.randomUUID(), crypto.randomUUID()),
        id: 'case-2',
        candidateAttemptId: shared,
      };
      const plan = planFor(first.baselineAttemptId, first.candidateAttemptId, {
        cases: [first, second],
      });
      await expect(evidenceService.freezePlan(plan)).rejects.toMatchObject({
        code: 'INVALID_PLAN',
      });
      expect(await store.read<string[]>('plans-index', [])).toEqual([]);
    });

    it('rejects duplicate required projects and raw-id coverage claims', async () => {
      const duplicated = planFor(crypto.randomUUID(), crypto.randomUUID(), {
        requiredProjects: ['logical-default', 'logical-default'],
      });
      await expect(evidenceService.freezePlan(duplicated)).rejects.toThrowError(
        /INVALID_PLAN.*Duplicate required project/,
      );

      const rawOnly = planFor(crypto.randomUUID(), crypto.randomUUID(), {
        requiredProjects: ['project-default'],
      });
      await expect(evidenceService.freezePlan(rawOnly)).rejects.toThrowError(
        /INVALID_PLAN.*not covered/,
      );
    });

    it('refuses to freeze a plan referencing an already admitted attempt', async () => {
      const staged = await createPlan();
      const { attempt } = await admit(staged, 'candidate');
      const backfill = planFor(crypto.randomUUID(), attempt.id);
      await expect(evidenceService.freezePlan(backfill)).rejects.toThrowError(
        /PLAN_ATTEMPT_ALREADY_RESERVED/,
      );
    });
  });

  describe('heldout stage alignment', () => {
    it('admits both pair roles as evaluator runs distinguished by planned ID and harness digest', async () => {
      const staged = await createPlan();
      const baseline = await admit(staged, 'baseline');
      const candidate = await admit(staged, 'candidate');

      expect(baseline.binding.stage).toBe('evaluation');
      expect(candidate.binding.stage).toBe('evaluation');
      expect(baseline.binding.harnessDigest).toBe(
        canonicalDigest(sampleBundle),
      );
      expect(candidate.binding.harnessDigest).toBe(
        canonicalDigest(candidateBundle),
      );
    });

    it('rejects a heldout baseline admitted with the train-baseline stage', async () => {
      const staged = await createPlan();
      const binding = createBinding(staged.planDigest, {
        stage: 'baseline',
        harnessDigest: canonicalDigest(sampleBundle),
      });

      await expect(
        ledger.reserve(
          sampleTask,
          'acc-test',
          config,
          binding,
          staged.baselineAttemptId,
        ),
      ).rejects.toThrowError(/HELDOUT_STAGE_MISMATCH/);
    });
  });

  describe('evaluate', () => {
    it('declares a proven-gain pair eligible', async () => {
      const { planDigest } = await stagePair({ baseline: { passed: false } });

      const evaluation = await evidenceService.evaluate(planDigest, config);
      expect(evaluation.reasonCodes, JSON.stringify(evaluation)).toEqual([]);
      expect({
        baselinePassed: evaluation.baselinePassed,
        candidatePassed: evaluation.candidatePassed,
        eligible: evaluation.eligible,
        projects: evaluation.projects,
        criticalRegressions: evaluation.criticalRegressions,
      }).toEqual({
        baselinePassed: 0,
        candidatePassed: 1,
        eligible: true,
        projects: ['logical-default'],
        criticalRegressions: [],
      });
    });

    it('keeps an unresolved baseline ineligible without counting a pass', async () => {
      const { planDigest } = await stagePair({
        baseline: { status: 'unknown', passed: false },
      });

      const evaluation = await evidenceService.evaluate(planDigest, config);
      expect(evaluation.eligible).toBe(false);
      expect(evaluation.baselinePassed).toBe(0);
      expect(
        evaluation.reasonCodes.some((reason) =>
          reason.startsWith('BASELINE_NOT_COMPLETED'),
        ),
      ).toBe(true);
    });

    it('rejects precommitted thresholds that diverge from current policy', async () => {
      const { planDigest } = await createPlan({ maxRegressions: 0 });
      const evaluation = await evidenceService.evaluate(planDigest, config);
      expect(evaluation.eligible).toBe(false);
      expect(evaluation.reasonCodes).toContain('EVALUATION_CONFIG_MUTATED');
    });

    it('blocks a critical candidate regression even when aggregate gain exists', async () => {
      const { planDigest } = await stagePair({
        baseline: { passed: false },
        candidate: { criticalFailures: ['SECURITY_POLICY_VIOLATION'] },
      });

      const evaluation = await evidenceService.evaluate(planDigest, config);
      expect(evaluation.eligible).toBe(false);
      expect(evaluation.criticalRegressions).toEqual(['logical-default']);
      expect(evaluation.reasonCodes).toContain('CRITICAL_REGRESSION_DETECTED');
    });

    it('denies when the current policy no longer authorizes the case rule', async () => {
      const { planDigest } = await stagePair({ baseline: { passed: false } });
      const revoked: FleetConfig = {
        ...config,
        generation: config.generation + 1,
        rules: config.rules.map((rule) => ({ ...rule, allowModelData: false })),
      };

      const evaluation = await evidenceService.evaluate(planDigest, revoked);
      expect(evaluation.eligible).toBe(false);
      expect(
        evaluation.reasonCodes.some((reason) =>
          reason.startsWith('CASE_RULE_NOT_AUTHORIZED'),
        ),
      ).toBe(true);
    });

    it('rejects a plan whose case runtime digest differs from the resolved host runtime', async () => {
      const { planDigest } = await createPlan();
      const plan = await store.read<FrozenEvaluationPlan | null>(
        `plan-${planDigest}`,
        null,
      );
      if (!plan) {
        throw new Error('frozen plan missing');
      }
      const tampered: FrozenEvaluationPlan = {
        ...plan,
        cases: plan.cases.map((entry) => ({
          ...entry,
          runtimeDigest: 'sha256-other-runtime',
        })),
      };
      const tamperedDigest = canonicalDigest(tampered);
      await store.createImmutable(`plan-${tamperedDigest}`, tampered);

      const evaluation = await evidenceService.evaluate(tamperedDigest, config);
      expect(evaluation.eligible).toBe(false);
      expect(
        evaluation.reasonCodes.some((reason) =>
          reason.startsWith('CASE_RUNTIME_MISMATCH'),
        ),
      ).toBe(true);
    });

    it('rejects an evaluation frozen under a different aggregate host runtime map', async () => {
      const { planDigest } = await stagePair({ baseline: { passed: false } });
      const movedRuntime: FleetConfig = {
        ...config,
        generation: config.generation + 1,
        hosts: config.hosts.map((host) => ({
          ...host,
          runtime: {
            ...config.runtime,
            manifestDigest: 'sha256-runtime-reinstalled',
          },
        })),
      };

      const evaluation = await evidenceService.evaluate(
        planDigest,
        movedRuntime,
      );
      expect(evaluation.eligible).toBe(false);
      expect(evaluation.reasonCodes).toContain('RUNTIME_DIGEST_MISMATCH');
    });

    it('accepts a consistent multi-host runtime aggregate', async () => {
      const workerKeys = generateTestKeys();
      const twoHosts = createFleetTestConfig(
        tempDir,
        {
          domains: [
            {
              id: 'domain-default',
              hostIds: ['host-local', '*'],
              pathPrefixes: [tempDir],
            },
          ],
          rules: [
            {
              id: 'rule-default',
              domain: 'domain-default',
              hostIds: ['*'],
              pathPrefixes: [tempDir],
              accountId: 'acc-test',
              enabled: true,
              allowModelData: true,
            },
          ],
          approvers: config.approvers,
          evaluation: { minImprovement: 0, maxRegressions: 5 },
          hosts: [
            config.hosts[0],
            {
              serverId: 'host-remote',
              nodeCommand: '/usr/local/bin/node',
              cliPath: '/opt/ags/dist/index.js',
              stateDir: path.join(tempDir, 'remote-state'),
              workspaceId: 'ws-remote',
              workerPublicKey: workerKeys.workerPublic,
              signingKeyFile: path.join(tempDir, 'remote-worker.key'),
              runtime: {
                ...config.runtime,
                manifestDigest: 'sha256-remote-manifest',
              },
            },
          ],
        },
        workerKeys,
      );

      const plan = buildFrozenPlan(twoHosts, {
        id: 'plan-multi-host',
        releaseDigest: canonicalDigest(candidateBundle),
        baselineDigest: canonicalDigest(sampleBundle),
        requiredProjects: ['logical-default', 'host-remote:project-remote'],
        minImprovement: 0,
        maxRegressions: 5,
        cases: [
          buildCase(crypto.randomUUID(), crypto.randomUUID()),
          {
            ...buildCase(crypto.randomUUID(), crypto.randomUUID()),
            id: 'case-remote',
            hostId: 'host-remote',
            projectId: 'project-remote',
            logicalProjectId: 'host-remote:project-remote',
          },
        ],
      });
      const { digest } = await evidenceService.freezePlan(plan);

      const evaluation = await evidenceService.evaluate(digest, twoHosts);
      expect(evaluation.reasonCodes).not.toContain('RUNTIME_DIGEST_MISMATCH');
      expect(
        evaluation.reasonCodes.some((reason) =>
          reason.startsWith('CASE_RUNTIME_MISMATCH'),
        ),
      ).toBe(false);
      expect(
        evaluation.reasonCodes.some((reason) =>
          reason.startsWith('MISSING_BASELINE_ATTEMPT'),
        ),
      ).toBe(true);
    });

    it('rejects a tampered frozen plan record whose bytes do not match its digest', async () => {
      const { planDigest } = await createPlan();
      const plan = await store.read<FrozenEvaluationPlan | null>(
        `plan-${planDigest}`,
        null,
      );
      if (!plan) {
        throw new Error('frozen plan missing');
      }
      const forgedName = `plan-${planDigest}`;
      await fs.remove(path.join(store.stateDir, `${forgedName}.json`));
      await store.createImmutable(forgedName, {
        ...plan,
        requiredProjects: ['other'],
      });

      await expect(
        evidenceService.evaluate(planDigest, config),
      ).rejects.toThrowError(/PLAN_DIGEST_MISMATCH/);
    });
  });
});
