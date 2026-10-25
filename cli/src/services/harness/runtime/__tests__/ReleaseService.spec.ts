import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { setTimeout as sleep } from 'timers/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HarnessSetupService } from '../../HarnessSetupService';
import { EvidenceService } from '../EvidenceService';
import { FleetLedger } from '../FleetLedger';
import { FleetPolicyService } from '../FleetPolicyService';
import {
  FleetPinsState,
  ReleaseService,
  verifyEd25519Signature,
} from '../ReleaseService';
import { RuntimeStore } from '../RuntimeStore';
import {
  canonicalDigest,
  canonicalJSON,
  EvaluationRecord,
  ExecutionBinding,
  FleetConfig,
  FleetProject,
  FleetTask,
  HarnessBundle,
  normalizeEd25519PublicKey,
  policyDigest,
  RunResult,
  SignedApproval,
} from '../RuntimeTypes';
import {
  approverKeyMaterial,
  bindProjectAuthority,
  buildFrozenPlan,
  hostRuntimeDigest,
  IMMUTABLE_SOURCE_SHA,
  SyntheticReceiptVerifier,
} from './fleetEvidenceTestSupport';
import { createFleetTestConfig } from './FleetTestFixtures';

describe('ReleaseService', () => {
  let tempDir: string;
  let projectRoot: string;
  let setupService: HarnessSetupService;
  let store: RuntimeStore;
  let ledger: FleetLedger;
  let verifier: SyntheticReceiptVerifier;
  let evidenceService: EvidenceService;
  let policyService: FleetPolicyService;
  let releaseService: ReleaseService;
  let config: FleetConfig;

  const approverId = 'approver-sec-1';
  const approver = approverKeyMaterial();
  const approverFingerprint = normalizeEd25519PublicKey(approver.publicKeySpki);
  if (!approverFingerprint) {
    throw new Error('synthetic approver key is not Ed25519');
  }

  const sampleProject: FleetProject = {
    hostId: 'host-local',
    projectId: 'project-default',
    rootPath: '',
    logicalProjectId: 'logical-default',
  };

  const sampleBundle: HarnessBundle = {
    schemaVersion: 1,
    id: 'bundle-prod-1',
    scope: { kind: 'fleet', key: '*' },
    guidance: 'Production hardened guidance: always check invariants.',
    platforms: ['darwin', 'linux'],
    ompVersions: ['0.13.0'],
  };

  const baselineBundle: HarnessBundle = {
    ...sampleBundle,
    id: 'bundle-baseline',
    guidance: 'Baseline guidance.',
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-release-test-'));
    projectRoot = path.join(tempDir, 'repo', 'proj-1');
    await fs.ensureDir(projectRoot);
    sampleProject.rootPath = projectRoot;
    sampleProject.logicalProjectId = 'logical-default';

    setupService = new HarnessSetupService(tempDir);
    await setupService.setup({
      schemaVersion: 1,
      paseoCommand: '/usr/local/bin/paseo',
    });
    store = new RuntimeStore(tempDir, setupService);
    verifier = new SyntheticReceiptVerifier();
    ledger = new FleetLedger(store, verifier);
    evidenceService = new EvidenceService(store, ledger);
    policyService = new FleetPolicyService(store);

    config = createFleetTestConfig(tempDir, {
      domains: [
        {
          id: 'domain-default',
          hostIds: ['host-local', '*'],
          pathPrefixes: [path.join(tempDir, 'repo')],
        },
      ],
      stacks: [
        {
          id: 'node-backend',
          hostIds: ['*'],
          pathPrefixes: [projectRoot],
        },
      ],
      rules: [
        {
          id: 'rule-default',
          domain: 'domain-default',
          hostIds: ['*'],
          pathPrefixes: [path.join(tempDir, 'repo')],
          accountId: 'acc-test',
          enabled: true,
          allowModelData: true,
        },
      ],
      approvers: [{ id: approverId, publicKey: approver.publicKeySpki }],
      evaluation: { minImprovement: 1, maxRegressions: 0 },
    });

    await policyService.configure(config);
    releaseService = new ReleaseService(store, policyService);

    await ledger.createBudget(
      {
        id: 'budget-release-1',
        runId: 'run-release-1',
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

  const heldoutTask = (): FleetTask => ({
    schemaVersion: 1,
    id: 'task-canary-verify',
    project: sampleProject,
    sourceRef: IMMUTABLE_SOURCE_SHA,
    prompt: 'Canary verification task',
    replaySafe: true,
    phase: 'heldout',
    deadlineMs: 30000,
    k: 1,
    baseline: baselineBundle,
    verification: { argv: ['npm', 'test'], files: {} },
    toolCallAllowance: 5,
  });

  const evaluatorDigest = (): string =>
    canonicalDigest(heldoutTask().verification);

  function createSignedApproval(
    overrides: Partial<SignedApproval['payload']> = {},
  ): SignedApproval {
    const {
      action: overrideAction,
      rollout: overrideRollout,
      ...baseOverrides
    } = overrides;
    const basePayload = {
      purpose: 'ags-fleet-release-v1' as const,
      releaseDigest: 'release-sha-placeholder',
      evaluationDigest: 'eval-sha-placeholder',
      selectors: [{ kind: 'project' as const, key: 'logical-default' }],
      expiresAt: Date.now() + 60000,
      nonce: crypto.randomUUID(),
      policyDigest: policyDigest(config),
      expectedPinGeneration: 1,
      ...baseOverrides,
    };
    const payload: SignedApproval['payload'] =
      overrideAction === 'rollback' || overrideAction === 'withdraw'
        ? { ...basePayload, action: overrideAction }
        : {
            ...basePayload,
            action: 'activate',
            rollout: overrideRollout ?? 'canary',
          };
    return {
      schemaVersion: 1,
      approverId,
      payload,
      signature: approver.sign(payload),
    };
  }

  interface StagedEvaluation {
    evaluationDigest: string;
    planDigest: string;
    candidateAttemptId: string;
  }

  async function stageEvaluation(
    releaseDigest: string,
    logicalProjectId: string = sampleProject.logicalProjectId,
  ): Promise<StagedEvaluation> {
    const baselineAttemptId = crypto.randomUUID();
    const candidateAttemptId = crypto.randomUUID();
    const plan = buildFrozenPlan(config, {
      id: crypto.randomUUID(),
      releaseDigest,
      baselineDigest: canonicalDigest(baselineBundle),
      requiredProjects: [logicalProjectId],
      minImprovement: config.evaluation.minImprovement,
      maxRegressions: config.evaluation.maxRegressions,
      cases: [
        {
          id: crypto.randomUUID(),
          taskDigest: canonicalDigest(heldoutTask()),
          hostId: sampleProject.hostId,
          projectId: sampleProject.projectId,
          logicalProjectId,
          accountId: 'acc-test',
          sourceRevision: IMMUTABLE_SOURCE_SHA,
          evaluatorDigest: evaluatorDigest(),
          baselineAttemptId,
          candidateAttemptId,
        },
      ],
    });
    const { digest: planDigest } = await evidenceService.freezePlan(plan);

    const record: EvaluationRecord = {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      releaseDigest,
      planDigest,
      eligible: true,
      reasonCodes: [],
      projects: [logicalProjectId],
      baselinePassed: 0,
      candidatePassed: 2,
      criticalRegressions: [],
    };
    const evaluationDigest = canonicalDigest(record);
    await store.createImmutable(`eval-${evaluationDigest}`, record);
    return { evaluationDigest, planDigest, candidateAttemptId };
  }

  async function stageCanaryAttempt(
    staged: StagedEvaluation,
    releaseDigest: string,
    options: {
      budgetId?: string;
      runId?: string;
      includeProjectAuthority?: boolean;
    } = {},
  ): Promise<void> {
    const task = heldoutTask();
    const runId = options.runId ?? 'run-release-1';
    const budgetId = options.budgetId ?? 'budget-release-1';
    const binding: ExecutionBinding = {
      runId,
      budgetId,
      taskDigest: canonicalDigest(task),
      hostId: sampleProject.hostId,
      projectId: sampleProject.projectId,
      logicalProjectId: sampleProject.logicalProjectId,
      domain: 'domain-default',
      accountId: 'acc-test',
      provider: 'codex',
      model: 'gpt-5.4',
      sourceRevision: IMMUTABLE_SOURCE_SHA,
      harnessDigest: releaseDigest,
      evaluatorDigest: evaluatorDigest(),
      runtimeDigest: hostRuntimeDigest(config, sampleProject.hostId),
      policyDigest: policyDigest(config),
      phase: 'heldout',
      stage: 'evaluation',
      planDigest: staged.planDigest,
    };
    const attempt = await ledger.reserve(
      task,
      'acc-test',
      config,
      binding,
      staged.candidateAttemptId,
    );
    const started = await ledger.start(attempt.id, attempt.token, 7777);
    const baseResult: RunResult = {
      attemptId: attempt.id,
      status: 'completed',
      harnessDigest: releaseDigest,
      sourceRevision: IMMUTABLE_SOURCE_SHA,
      evaluatorDigest: binding.evaluatorDigest,
      passed: true,
      criticalFailures: [],
      toolCalls: 2,
      durationMs: 500,
      costUsd: 0.01,
      artifactDigest: 'sha256-artifact-canary',
      binding,
      generation: started.generation,
    };
    const result =
      options.includeProjectAuthority === false
        ? baseResult
        : await bindProjectAuthority(baseResult, task.project, config);
    verifier.issueCompletion(started, result);
    const finished = await ledger.finish(attempt.id, attempt.token, result);
    expect(finished.state).toBe('completed');
    await evidenceService.record(task, result);
  }

  async function seedPin(
    pinKey: string,
    releaseDigest: string,
    evaluationDigest: string,
    options: { previous?: boolean } = {},
  ): Promise<void> {
    const pinsState = await store.read<FleetPinsState>('fleet-pins', {
      schemaVersion: 1,
      pinGeneration: 1,
      pins: {},
      previousPins: {},
      usedNonces: {},
      approvals: [],
      canaries: {},
      withdrawnReleases: {},
      history: [],
    });
    if (!approverFingerprint) {
      throw new Error('synthetic approver key is not Ed25519');
    }
    const pin = {
      releaseDigest,
      evaluationDigest,
      selector: { kind: 'project' as const, key: 'logical-default' },
      approvedAt: Date.now(),
      approverId,
      approverKeyFingerprint: approverFingerprint,
      approvalDigest: 'seeded',
      nonce: crypto.randomUUID(),
    };
    const target = options.previous ? pinsState.previousPins : pinsState.pins;
    target[pinKey] = pin;
    await store.write('fleet-pins', pinsState);
  }

  describe('verifyEd25519Signature', () => {
    it('accepts canonical Ed25519 signatures and rejects non-Ed25519 or non-canonical encodings', () => {
      const payload = canonicalJSON({ a: 1, b: 'test' });
      const signature = approver.sign({ a: 1, b: 'test' });
      expect(
        verifyEd25519Signature(payload, approver.publicKeySpki, signature),
      ).toBe(true);
      expect(
        verifyEd25519Signature(
          payload,
          approver.publicKeySpki,
          `${signature}==`,
        ),
      ).toBe(false);

      const { publicKey: rsaPub } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });
      const rsaSpki = rsaPub
        .export({ type: 'spki', format: 'der' })
        .toString('base64');
      expect(verifyEd25519Signature(payload, rsaSpki, signature)).toBe(false);
    });

    it('rejects a padding-bit-mutated encoding of the same signature bytes', () => {
      const payload = canonicalJSON({ nonce: 'abc' });
      const canonical = approver.sign({ nonce: 'abc' });
      const alphabet =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const index = canonical.length - 3;
      const mutatedIndex = alphabet.indexOf(canonical[index]) ^ 1;
      const mutated =
        canonical.slice(0, index) +
        alphabet[mutatedIndex] +
        canonical.slice(index + 1);

      expect(
        Buffer.from(mutated, 'base64').equals(Buffer.from(canonical, 'base64')),
      ).toBe(true);
      expect(
        verifyEd25519Signature(payload, approver.publicKeySpki, mutated),
      ).toBe(false);
    });
  });

  describe('propose', () => {
    it('validates and stores an immutable bundle, returning its canonical digest', async () => {
      const { digest } = await releaseService.propose(sampleBundle);
      expect(digest).toBe(canonicalDigest(sampleBundle));
      expect(await store.read(`bundle-${digest}`, null)).toEqual(sampleBundle);
    });
  });

  describe('activate', () => {
    it('activates a canary with a valid signature and resolves its guidance', async () => {
      const { digest: releaseDigest } =
        await releaseService.propose(sampleBundle);
      const staged = await stageEvaluation(releaseDigest);

      await releaseService.activate(
        createSignedApproval({
          releaseDigest,
          evaluationDigest: staged.evaluationDigest,
        }),
      );

      const status = await releaseService.status();
      expect(status.pinGeneration).toBe(2);
      expect(status.activePinsCount).toBe(1);
      expect(status.canariesCount).toBe(1);
      expect(
        status.pins['project:logical-default'].approverKeyFingerprint,
      ).toBe(approverFingerprint);

      const ctx = await releaseService.context(
        sampleProject,
        'darwin',
        '0.13.0',
      );
      expect(ctx?.releaseDigest).toBe(releaseDigest);
      expect(ctx?.guidance).toBe(sampleBundle.guidance);
    });

    it('rejects a canary selector that is not an explicit project', async () => {
      const { digest: releaseDigest } =
        await releaseService.propose(sampleBundle);
      const staged = await stageEvaluation(releaseDigest);

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: staged.evaluationDigest,
            selectors: [{ kind: 'fleet', key: '*' }],
          }),
        ),
      ).rejects.toThrowError(/INVALID_ROLLOUT/);
    });

    it('rejects an evaluation frozen under a stale policy', async () => {
      const { digest: releaseDigest } =
        await releaseService.propose(sampleBundle);
      const staleConfig: FleetConfig = {
        ...config,
        generation: config.generation + 1,
        evaluation: { minImprovement: 0, maxRegressions: 1 },
      };
      const staged = await stageEvaluation(releaseDigest);
      await policyService.configure(staleConfig);
      config = staleConfig;

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: staged.evaluationDigest,
            policyDigest: policyDigest(staleConfig),
          }),
        ),
      ).rejects.toThrowError(/POLICY_DIGEST_MISMATCH/);
    });

    it('promotes only under a fresh signed active approval of a new evaluation with post-start attempts', async () => {
      const { digest: releaseDigest } =
        await releaseService.propose(sampleBundle);
      const eligibility = await stageEvaluation(releaseDigest);

      await releaseService.activate(
        createSignedApproval({
          releaseDigest,
          evaluationDigest: eligibility.evaluationDigest,
        }),
      );
      await sleep(10);

      const promotion = await stageEvaluation(releaseDigest);
      expect(promotion.evaluationDigest).not.toBe(eligibility.evaluationDigest);

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: promotion.evaluationDigest,
            rollout: 'active',
            selectors: [{ kind: 'fleet', key: '*' }],
            expectedPinGeneration: 2,
          }),
        ),
      ).rejects.toThrowError(/CANARY_VERIFICATION_FAILED/);

      await stageCanaryAttempt(promotion, releaseDigest);

      await releaseService.activate(
        createSignedApproval({
          releaseDigest,
          evaluationDigest: promotion.evaluationDigest,
          rollout: 'active',
          selectors: [{ kind: 'fleet', key: '*' }],
          expectedPinGeneration: 2,
        }),
      );

      const status = await releaseService.status();
      expect(status.pinGeneration).toBe(3);

      const pins = await store.read<FleetPinsState | null>('fleet-pins', null);
      if (!pins) {
        throw new Error('pins state missing');
      }
      const canary = pins.canaries[releaseDigest];
      expect(canary.status).toBe('promoted');
      expect(canary.evaluationDigest).toBe(eligibility.evaluationDigest);
      expect(canary.verified).toEqual([
        {
          target: 'logical-default',
          attemptId: promotion.candidateAttemptId,
          resultDigest: expect.any(String),
          generation: 1,
        },
      ]);
      expect(
        pins.approvals.some(
          (tuple) =>
            tuple.releaseDigest === releaseDigest &&
            tuple.evaluationDigest === promotion.evaluationDigest &&
            tuple.selector.kind === 'fleet' &&
            tuple.selector.key === '*' &&
            tuple.rollout === 'active',
        ),
      ).toBe(true);
    });

    it('rejects replaying the eligibility evaluation whose attempts predate the canary start', async () => {
      const { digest: releaseDigest } =
        await releaseService.propose(sampleBundle);
      const eligibility = await stageEvaluation(releaseDigest);
      await stageCanaryAttempt(eligibility, releaseDigest);

      await releaseService.activate(
        createSignedApproval({
          releaseDigest,
          evaluationDigest: eligibility.evaluationDigest,
        }),
      );
      await sleep(10);

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: eligibility.evaluationDigest,
            rollout: 'active',
            selectors: [{ kind: 'fleet', key: '*' }],
            expectedPinGeneration: 2,
          }),
        ),
      ).rejects.toThrowError(/CANARY_VERIFICATION_FAILED/);
    });

    it('rejects an active evaluation that does not cover a canary target', async () => {
      const { digest: releaseDigest } =
        await releaseService.propose(sampleBundle);
      const eligibility = await stageEvaluation(releaseDigest);
      await releaseService.activate(
        createSignedApproval({
          releaseDigest,
          evaluationDigest: eligibility.evaluationDigest,
        }),
      );
      await sleep(10);

      const disjoint = await stageEvaluation(releaseDigest, 'logical-other');
      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: disjoint.evaluationDigest,
            rollout: 'active',
            selectors: [{ kind: 'fleet', key: '*' }],
            expectedPinGeneration: 2,
          }),
        ),
      ).rejects.toThrowError(/CANARY_VERIFICATION_FAILED.*not covered/);
    });

    it('requires a canary before an active rollout', async () => {
      const { digest: releaseDigest } =
        await releaseService.propose(sampleBundle);
      const staged = await stageEvaluation(releaseDigest);

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: staged.evaluationDigest,
            rollout: 'active',
            selectors: [{ kind: 'fleet', key: '*' }],
          }),
        ),
      ).rejects.toThrowError(/CANARY_REQUIRED/);
    });

    it('rejects forged signatures and unauthorized approvers', async () => {
      const { digest: releaseDigest } =
        await releaseService.propose(sampleBundle);
      const staged = await stageEvaluation(releaseDigest);

      const forged = createSignedApproval({
        releaseDigest,
        evaluationDigest: staged.evaluationDigest,
      });
      forged.signature = Buffer.from(crypto.randomBytes(64)).toString('base64');
      await expect(releaseService.activate(forged)).rejects.toThrowError(
        /INVALID_SIGNATURE/,
      );

      const foreign = createSignedApproval({
        releaseDigest,
        evaluationDigest: staged.evaluationDigest,
      });
      foreign.approverId = 'approver-unconfigured';
      await expect(releaseService.activate(foreign)).rejects.toThrowError(
        /UNAUTHORIZED_APPROVER/,
      );
    });

    it('rejects nonce reuse and stale pin generations', async () => {
      const { digest: releaseDigest } =
        await releaseService.propose(sampleBundle);
      const staged = await stageEvaluation(releaseDigest);

      const first = createSignedApproval({
        releaseDigest,
        evaluationDigest: staged.evaluationDigest,
      });
      await releaseService.activate(first);

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: staged.evaluationDigest,
            nonce: first.payload.nonce,
            expectedPinGeneration: 2,
          }),
        ),
      ).rejects.toThrowError(/NONCE_ALREADY_USED/);

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: staged.evaluationDigest,
            expectedPinGeneration: 1,
          }),
        ),
      ).rejects.toThrowError(/PIN_GENERATION_MISMATCH/);
    });

    it('rejects an ineligible evaluation record', async () => {
      const { digest: releaseDigest } =
        await releaseService.propose(sampleBundle);
      const ineligible: EvaluationRecord = {
        schemaVersion: 1,
        id: crypto.randomUUID(),
        releaseDigest,
        planDigest: 'plan-1',
        eligible: false,
        reasonCodes: ['REGRESSIONS_EXCEEDED'],
        projects: ['logical-default'],
        baselinePassed: 2,
        candidatePassed: 1,
        criticalRegressions: [],
      };
      const evaluationDigest = canonicalDigest(ineligible);
      await store.createImmutable(`eval-${evaluationDigest}`, ineligible);

      await expect(
        releaseService.activate(
          createSignedApproval({ releaseDigest, evaluationDigest }),
        ),
      ).rejects.toThrowError(/INELIGIBLE_RELEASE/);
    });

    it('prevents scope widening from a project bundle to a domain selector', async () => {
      const projectBundle: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-proj-only',
        scope: { kind: 'project', key: 'logical-default' },
      };
      const { digest: releaseDigest } =
        await releaseService.propose(projectBundle);
      const staged = await stageEvaluation(releaseDigest);

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: staged.evaluationDigest,
            selectors: [{ kind: 'domain', key: 'domain-default' }],
          }),
        ),
      ).rejects.toThrowError(/INCOMPATIBLE_SCOPE/);
    });

    it('refuses a domain bundle narrowed to a project with no proven membership', async () => {
      const domainBundle: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-domain',
        scope: { kind: 'domain', key: 'domain-default' },
      };
      const { digest: releaseDigest } =
        await releaseService.propose(domainBundle);
      const staged = await stageEvaluation(releaseDigest);

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: staged.evaluationDigest,
            selectors: [{ kind: 'project', key: 'logical-unrelated' }],
          }),
        ),
      ).rejects.toThrowError(/INCOMPATIBLE_SCOPE.*membership/);
    });

    it('proves domain-to-project narrowing from the eligible evaluation evidence', async () => {
      const domainBundle: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-domain-member',
        scope: { kind: 'domain', key: 'domain-default' },
      };
      const { digest: releaseDigest } =
        await releaseService.propose(domainBundle);
      const staged = await stageEvaluation(releaseDigest);
      await stageCanaryAttempt(staged, releaseDigest);

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: staged.evaluationDigest,
            selectors: [{ kind: 'project', key: 'logical-default' }],
          }),
        ),
      ).resolves.toBeUndefined();
    });

    it('proves domain membership for a default host/project identity without aliases', async () => {
      config = {
        ...config,
        generation: config.generation + 1,
        projectAliases: [],
      };
      sampleProject.logicalProjectId = `${sampleProject.hostId}:${sampleProject.projectId}`;
      await policyService.configure(config);

      const runId = 'run-release-no-alias';
      const budgetId = 'budget-release-no-alias';
      await ledger.createBudget(
        {
          id: budgetId,
          runId,
          createdAt: Date.now(),
          deadline: Date.now() + 120000,
          maxAttempts: 10,
          maxConcurrent: 4,
          maxToolCalls: 50,
        },
        config,
      );

      const domainBundle: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-domain-default-project',
        scope: { kind: 'domain', key: 'domain-default' },
      };
      const { digest: releaseDigest } =
        await releaseService.propose(domainBundle);
      const staged = await stageEvaluation(releaseDigest);
      await stageCanaryAttempt(staged, releaseDigest, { budgetId, runId });

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: staged.evaluationDigest,
            selectors: [
              { kind: 'project', key: sampleProject.logicalProjectId },
            ],
          }),
        ),
      ).resolves.toBeUndefined();
    });

    it('allows only evidence-proven project narrowing from a stack bundle', async () => {
      const stackBundle: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-stack-member',
        scope: { kind: 'stack', key: 'node-backend' },
      };
      const { digest: releaseDigest } =
        await releaseService.propose(stackBundle);
      const staged = await stageEvaluation(releaseDigest);
      await stageCanaryAttempt(staged, releaseDigest);

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: staged.evaluationDigest,
            selectors: [{ kind: 'project', key: 'logical-default' }],
          }),
        ),
      ).resolves.toBeUndefined();
    });

    it('rejects a stack narrowing when the evidence root is outside the configured stack', async () => {
      const outsideStackRoot = path.join(tempDir, 'repo', 'other-project');
      await fs.ensureDir(outsideStackRoot);
      sampleProject.rootPath = outsideStackRoot;

      const stackBundle: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-stack-nonmember',
        scope: { kind: 'stack', key: 'node-backend' },
      };
      const { digest: releaseDigest } =
        await releaseService.propose(stackBundle);
      const staged = await stageEvaluation(releaseDigest);
      await stageCanaryAttempt(staged, releaseDigest);

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: staged.evaluationDigest,
            selectors: [{ kind: 'project', key: 'logical-default' }],
          }),
        ),
      ).rejects.toThrowError(/INCOMPATIBLE_SCOPE.*stack bundle scope/);
    });
  });

  describe('rollback', () => {
    async function sign(
      payload: SignedApproval['payload'],
    ): Promise<SignedApproval> {
      return {
        schemaVersion: 1,
        approverId,
        payload,
        signature: approver.sign(payload),
      };
    }

    it('returns to an exactly approved selector/evaluation tuple', async () => {
      const bundleV1: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-v1',
        guidance: 'v1',
      };
      const bundleV2: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-v2',
        guidance: 'v2',
      };
      const { digest: digestV1 } = await releaseService.propose(bundleV1);
      const { digest: digestV2 } = await releaseService.propose(bundleV2);
      const evalV1 = await stageEvaluation(digestV1);
      const evalV2 = await stageEvaluation(digestV2);

      await releaseService.activate(
        createSignedApproval({
          releaseDigest: digestV1,
          evaluationDigest: evalV1.evaluationDigest,
          expectedPinGeneration: 1,
        }),
      );
      await releaseService.activate(
        createSignedApproval({
          releaseDigest: digestV2,
          evaluationDigest: evalV2.evaluationDigest,
          expectedPinGeneration: 2,
        }),
      );
      expect(
        (await releaseService.context(sampleProject, 'darwin', '0.13.0'))
          ?.releaseDigest,
      ).toBe(digestV2);

      await releaseService.rollback(
        await sign({
          purpose: 'ags-fleet-release-v1',
          action: 'rollback',
          releaseDigest: digestV1,
          evaluationDigest: evalV1.evaluationDigest,
          selectors: [{ kind: 'project', key: 'logical-default' }],
          expiresAt: Date.now() + 60000,
          nonce: crypto.randomUUID(),
          policyDigest: policyDigest(config),
          expectedPinGeneration: 3,
        }),
      );

      const ctx = await releaseService.context(
        sampleProject,
        'darwin',
        '0.13.0',
      );
      expect(ctx?.releaseDigest).toBe(digestV1);
      expect(ctx?.guidance).toBe('v1');
    });

    it('rejects rollback scope expansion to a selector never approved', async () => {
      const { digest: releaseDigest } =
        await releaseService.propose(sampleBundle);
      const staged = await stageEvaluation(releaseDigest);
      await releaseService.activate(
        createSignedApproval({
          releaseDigest,
          evaluationDigest: staged.evaluationDigest,
        }),
      );

      await expect(
        releaseService.rollback(
          await sign({
            purpose: 'ags-fleet-release-v1',
            action: 'rollback',
            releaseDigest,
            evaluationDigest: staged.evaluationDigest,
            selectors: [{ kind: 'fleet', key: '*' }],
            expiresAt: Date.now() + 60000,
            nonce: crypto.randomUUID(),
            policyDigest: policyDigest(config),
            expectedPinGeneration: 2,
          }),
        ),
      ).rejects.toThrowError(/ROLLBACK_SCOPE_EXPANSION/);
    });

    it('rejects rollback that pairs an approved selector with a different evaluation', async () => {
      const { digest: releaseDigest } =
        await releaseService.propose(sampleBundle);
      const firstEvaluation = await stageEvaluation(releaseDigest);
      const secondEvaluation = await stageEvaluation(
        releaseDigest,
        'logical-other',
      );

      await releaseService.activate(
        createSignedApproval({
          releaseDigest,
          evaluationDigest: firstEvaluation.evaluationDigest,
        }),
      );
      await releaseService.activate(
        createSignedApproval({
          releaseDigest,
          evaluationDigest: secondEvaluation.evaluationDigest,
          selectors: [{ kind: 'project', key: 'logical-other' }],
          expectedPinGeneration: 2,
        }),
      );

      await expect(
        releaseService.rollback(
          await sign({
            purpose: 'ags-fleet-release-v1',
            action: 'rollback',
            releaseDigest,
            evaluationDigest: secondEvaluation.evaluationDigest,
            selectors: [{ kind: 'project', key: 'logical-default' }],
            expiresAt: Date.now() + 60000,
            nonce: crypto.randomUUID(),
            policyDigest: policyDigest(config),
            expectedPinGeneration: 3,
          }),
        ),
      ).rejects.toThrowError(/ROLLBACK_SCOPE_EXPANSION/);
    });
  });

  describe('withdraw', () => {
    it('withdraws a release, reverts to the previous approved context and blocks reactivation', async () => {
      const bundleV1: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-v1',
        guidance: 'v1',
      };
      const bundleV2: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-v2',
        guidance: 'v2',
      };
      const { digest: digestV1 } = await releaseService.propose(bundleV1);
      const { digest: digestV2 } = await releaseService.propose(bundleV2);
      const evalV1 = await stageEvaluation(digestV1);
      const evalV2 = await stageEvaluation(digestV2);

      await releaseService.activate(
        createSignedApproval({
          releaseDigest: digestV1,
          evaluationDigest: evalV1.evaluationDigest,
          expectedPinGeneration: 1,
        }),
      );
      await releaseService.activate(
        createSignedApproval({
          releaseDigest: digestV2,
          evaluationDigest: evalV2.evaluationDigest,
          expectedPinGeneration: 2,
        }),
      );

      const withdrawPayload: SignedApproval['payload'] = {
        purpose: 'ags-fleet-release-v1',
        action: 'withdraw',
        releaseDigest: digestV2,
        evaluationDigest: evalV2.evaluationDigest,
        selectors: [{ kind: 'project', key: 'logical-default' }],
        expiresAt: Date.now() + 60000,
        nonce: crypto.randomUUID(),
        policyDigest: policyDigest(config),
        expectedPinGeneration: 3,
      };
      await releaseService.withdraw({
        schemaVersion: 1,
        approverId,
        payload: withdrawPayload,
        signature: approver.sign(withdrawPayload),
      });

      const ctx = await releaseService.context(
        sampleProject,
        'darwin',
        '0.13.0',
      );
      expect(ctx?.releaseDigest).toBe(digestV1);
      expect(ctx?.guidance).toBe('v1');

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest: digestV2,
            evaluationDigest: evalV2.evaluationDigest,
            expectedPinGeneration: 4,
          }),
        ),
      ).rejects.toThrowError(/RELEASE_WITHDRAWN/);
    });
  });

  describe('context', () => {
    it('fails closed for a project with no matching or enabled policy rule', async () => {
      const foreign: FleetProject = {
        hostId: 'host-local',
        projectId: 'unauthorized-proj',
        rootPath: path.join(tempDir, 'unauthorized'),
        logicalProjectId: 'unauth-1',
      };
      await fs.ensureDir(foreign.rootPath);
      expect(
        await releaseService.context(foreign, 'darwin', '0.13.0'),
      ).toBeNull();
    });

    it('denies project narrowing without authenticated project authority', async () => {
      const domainBundle: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-domain-authority-required',
        scope: { kind: 'domain', key: 'domain-default' },
      };
      const { digest: releaseDigest } =
        await releaseService.propose(domainBundle);
      const staged = await stageEvaluation(releaseDigest);
      await stageCanaryAttempt(staged, releaseDigest, {
        includeProjectAuthority: false,
      });

      await expect(
        releaseService.activate(
          createSignedApproval({
            releaseDigest,
            evaluationDigest: staged.evaluationDigest,
            selectors: [
              { kind: 'project', key: sampleProject.logicalProjectId },
            ],
          }),
        ),
      ).rejects.toThrowError(/INCOMPATIBLE_SCOPE/);
    });

    it('does not match a stack through a same-domain symlink facade', async () => {
      const stackBundle: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-stack-facade',
        scope: { kind: 'stack', key: 'node-backend' },
      };
      const { digest: releaseDigest } =
        await releaseService.propose(stackBundle);
      const staged = await stageEvaluation(releaseDigest);
      await stageCanaryAttempt(staged, releaseDigest);
      await releaseService.activate(
        createSignedApproval({
          releaseDigest,
          evaluationDigest: staged.evaluationDigest,
          selectors: [{ kind: 'project', key: 'logical-default' }],
        }),
      );

      expect(
        await releaseService.context(sampleProject, 'darwin', '0.13.0'),
      ).toMatchObject({
        releaseDigest,
        guidance: stackBundle.guidance,
      });

      const otherStackRoot = path.join(tempDir, 'repo', 'other-stack-project');
      const facadePath = path.join(tempDir, 'repo', 'stack-a-facade');
      await fs.ensureDir(otherStackRoot);
      await fs.symlink(otherStackRoot, facadePath, 'dir');
      expect(
        await releaseService.context(
          { ...sampleProject, rootPath: facadePath },
          'darwin',
          '0.13.0',
        ),
      ).toBeNull();
    });

    it('falls back to the previous compatible approved pin on platform mismatch', async () => {
      const universal: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-universal',
        guidance: 'Universal guidance',
        platforms: ['darwin', 'linux', 'win32'],
      };
      const darwinOnly: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-darwin-only',
        guidance: 'Darwin-only guidance',
        platforms: ['darwin'],
      };
      const { digest: dUniversal } = await releaseService.propose(universal);
      const { digest: dDarwin } = await releaseService.propose(darwinOnly);
      const evalUniversal = await stageEvaluation(dUniversal);
      const evalDarwin = await stageEvaluation(dDarwin);

      await releaseService.activate(
        createSignedApproval({
          releaseDigest: dUniversal,
          evaluationDigest: evalUniversal.evaluationDigest,
          expectedPinGeneration: 1,
        }),
      );
      await releaseService.activate(
        createSignedApproval({
          releaseDigest: dDarwin,
          evaluationDigest: evalDarwin.evaluationDigest,
          expectedPinGeneration: 2,
        }),
      );

      const linux = await releaseService.context(
        sampleProject,
        'linux',
        '0.13.0',
      );
      expect(linux?.releaseDigest).toBe(dUniversal);
      const darwin = await releaseService.context(
        sampleProject,
        'darwin',
        '0.13.0',
      );
      expect(darwin?.releaseDigest).toBe(dDarwin);
    });

    it('returns null once the approving key is no longer configured', async () => {
      const { digest: releaseDigest } =
        await releaseService.propose(sampleBundle);
      const staged = await stageEvaluation(releaseDigest);
      await releaseService.activate(
        createSignedApproval({
          releaseDigest,
          evaluationDigest: staged.evaluationDigest,
        }),
      );
      expect(
        await releaseService.context(sampleProject, 'darwin', '0.13.0'),
      ).not.toBeNull();

      await policyService.configure({
        ...config,
        generation: config.generation + 1,
        approvers: [],
      });

      expect(
        await releaseService.context(sampleProject, 'darwin', '0.13.0'),
      ).toBeNull();
    });

    it('never returns an out-of-scope previous pin through compatibility fallback', async () => {
      const currentBundle: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-current-win32',
        guidance: 'win32 only',
        platforms: ['win32'],
      };
      const foreignBundle: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-foreign-domain',
        guidance: 'Foreign domain guidance',
        scope: { kind: 'domain', key: 'domain-foreign' },
      };
      const { digest: currentDigest } =
        await releaseService.propose(currentBundle);
      const { digest: foreignDigest } =
        await releaseService.propose(foreignBundle);
      const currentEval = await stageEvaluation(currentDigest);
      const foreignEval = await stageEvaluation(foreignDigest);

      await seedPin(
        'project:logical-default',
        currentDigest,
        currentEval.evaluationDigest,
      );
      await seedPin(
        'project:logical-default',
        foreignDigest,
        foreignEval.evaluationDigest,
        {
          previous: true,
        },
      );

      expect(
        await releaseService.context(sampleProject, 'linux', '0.13.0'),
      ).toBeNull();
    });

    it('does not include a project-specific lesson when another eligible project resolves context (AC-015)', async () => {
      const projectRootB = path.join(tempDir, 'repo', 'proj-b');
      await fs.ensureDir(projectRootB);

      const projectB: FleetProject = {
        hostId: sampleProject.hostId,
        projectId: 'project-b',
        rootPath: projectRootB,
        logicalProjectId: 'host-local:project-b',
      };

      const policyB = await policyService.resolve(projectB);
      expect(policyB.domain).toBe('domain-default');
      expect(policyB.account.id).toBe('acc-test');

      const projectABundle: HarnessBundle = {
        ...sampleBundle,
        id: 'bundle-project-a-only',
        scope: { kind: 'project', key: sampleProject.logicalProjectId },
        guidance:
          'Project A specialized guidance: strictly scoped to project A.',
      };

      const { digest: releaseDigestA } =
        await releaseService.propose(projectABundle);
      const stagedA = await stageEvaluation(releaseDigestA);
      await stageCanaryAttempt(stagedA, releaseDigestA);

      await releaseService.activate(
        createSignedApproval({
          releaseDigest: releaseDigestA,
          evaluationDigest: stagedA.evaluationDigest,
          selectors: [{ kind: 'project', key: sampleProject.logicalProjectId }],
        }),
      );

      const contextA = await releaseService.context(
        sampleProject,
        'darwin',
        '0.13.0',
      );
      expect(contextA).toEqual({
        releaseDigest: releaseDigestA,
        guidance: projectABundle.guidance,
      });

      const contextB = await releaseService.context(
        projectB,
        'darwin',
        '0.13.0',
      );
      expect(contextB).toBeNull();
    });
  });
});
