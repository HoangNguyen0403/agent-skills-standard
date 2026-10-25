import crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import {
  canonicalDigest,
  canonicalJSON,
  FleetConfig,
  FleetTask,
  HarnessError,
  isEd25519PublicKey,
  parseFleetConfig,
  parseFleetTask,
  policyDigest,
  ProjectAuthoritySchema,
  SignedApprovalSchema,
  SignedExecutionRequestSchema,
  SignedWorkerReceiptSchema,
} from '../RuntimeTypes';
import { createFleetTestConfig, generateTestKeys } from './FleetTestFixtures';

const FIXED_KEYS = generateTestKeys();

function makeValidConfig(): FleetConfig {
  return createFleetTestConfig(
    '/tmp/ags-test-workspace',
    undefined,
    FIXED_KEYS,
  );
}

function makeValidTask(): FleetTask {
  return {
    schemaVersion: 1,
    id: 'task-101',
    project: {
      hostId: 'host-local',
      projectId: 'project-default',
      rootPath: '/tmp/ags-test-workspace',
      logicalProjectId: 'logical-default',
    },
    sourceRef: 'abc123commitsha',
    prompt: 'Implement feature X',
    replaySafe: true,
    phase: 'train',
    deadlineMs: 60000,
    k: 1,
    baseline: {
      schemaVersion: 1,
      id: 'bundle-base',
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
        'test/smoke.js': 'console.log("smoke test");',
      },
    },
    toolCallAllowance: 10,
  };
}

describe('RuntimeTypes', () => {
  describe('canonicalJSON', () => {
    it('sorts object keys recursively in lexicographical order', () => {
      const obj1 = { z: 1, a: 2, m: { y: 10, b: 20 } };
      const obj2 = { a: 2, m: { b: 20, y: 10 }, z: 1 };

      const json1 = canonicalJSON(obj1);
      const json2 = canonicalJSON(obj2);

      expect(json1).toBe('{"a":2,"m":{"b":20,"y":10},"z":1}');
      expect(json1).toBe(json2);
    });

    it('preserves array element ordering', () => {
      const arr = [3, 1, 2];
      expect(canonicalJSON(arr)).toBe('[3,1,2]');
    });

    it('rejects arrays with holes', () => {
      // eslint-disable-next-line no-sparse-arrays
      const sparseArr = [1, , 3];
      expect(() => canonicalJSON(sparseArr)).toThrow(HarnessError);
    });

    it('serializes primitives accurately', () => {
      expect(canonicalJSON('hello')).toBe('"hello"');
      expect(canonicalJSON(123.45)).toBe('123.45');
      expect(canonicalJSON(true)).toBe('true');
      expect(canonicalJSON(false)).toBe('false');
      expect(canonicalJSON(null)).toBe('null');
    });

    it('rejects non-finite numbers', () => {
      expect(() => canonicalJSON(NaN)).toThrow(HarnessError);
      expect(() => canonicalJSON(Infinity)).toThrow(HarnessError);
      expect(() => canonicalJSON(-Infinity)).toThrow(HarnessError);
    });

    it('rejects unsupported types like undefined, symbol, function, and bigint', () => {
      expect(() => canonicalJSON(undefined)).toThrow(HarnessError);
      expect(() => canonicalJSON({ a: undefined })).toThrow(HarnessError);
      expect(() => canonicalJSON([undefined])).toThrow(HarnessError);
      expect(() => canonicalJSON(Symbol('test'))).toThrow(HarnessError);
      expect(() => canonicalJSON(() => {})).toThrow(HarnessError);
      expect(() => canonicalJSON(BigInt(10))).toThrow(HarnessError);
    });

    it('rejects non-plain objects such as Map and Set', () => {
      expect(() => canonicalJSON(new Map())).toThrow(HarnessError);
      expect(() => canonicalJSON(new Set())).toThrow(HarnessError);
    });
  });

  describe('canonicalDigest', () => {
    it('produces identical SHA-256 digests for logically equivalent objects', () => {
      const o1 = { k: 'val', nested: { b: 2, a: 1 } };
      const o2 = { nested: { a: 1, b: 2 }, k: 'val' };

      expect(canonicalDigest(o1)).toBe(canonicalDigest(o2));
    });

    it('produces different digests for different content', () => {
      const o1 = { k: 'val1' };
      const o2 = { k: 'val2' };

      expect(canonicalDigest(o1)).not.toBe(canonicalDigest(o2));
    });
  });

  describe('isEd25519PublicKey and key separation', () => {
    it('validates genuine Ed25519 SPKI and raw keys', () => {
      const keys = generateTestKeys();
      expect(isEd25519PublicKey(keys.approverPublic)).toBe(true);
      expect(isEd25519PublicKey(keys.coordinatorPublic)).toBe(true);
    });

    it('rejects RSA public keys and arbitrary strings', () => {
      const rsaPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });
      const rsaPub = rsaPair.publicKey
        .export({ type: 'spki', format: 'der' })
        .toString('base64');

      expect(isEd25519PublicKey(rsaPub)).toBe(false);
      expect(isEd25519PublicKey('a')).toBe(false);
      expect(isEd25519PublicKey('invalid-base64-content!')).toBe(false);
    });
  });

  describe('parseFleetConfig', () => {
    it('successfully parses valid FleetConfig with projectAliases and stacks', () => {
      const cfg = makeValidConfig();
      const parsed = parseFleetConfig(cfg);
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.generation).toBe(1);
      expect(parsed.projectAliases.length).toBe(1);
      expect(parsed.stacks.length).toBe(1);
      expect(parsed.accounts[0].id).toBe('acc-test');
    });
    it('accepts POSIX and Windows absolute paths in one global config', () => {
      const cfg = makeValidConfig();
      const remoteKeys = generateTestKeys();
      cfg.domains.push({
        id: 'domain-windows',
        hostIds: ['host-windows'],
        pathPrefixes: ['C:\\agents\\repo'],
      });
      cfg.stacks.push({
        id: 'stack-windows',
        hostIds: ['host-windows'],
        pathPrefixes: ['D:\\repos\\service'],
      });
      cfg.rules.push({
        id: 'rule-windows',
        domain: 'domain-windows',
        hostIds: ['host-windows'],
        pathPrefixes: ['C:\\agents\\repo'],
        accountId: 'acc-test',
        enabled: true,
        allowModelData: true,
      });
      cfg.hosts.push({
        serverId: 'host-windows',
        nodeCommand: 'C:\\Program Files\\node.exe',
        cliPath: 'C:\\ags\\dist\\index.js',
        stateDir: 'D:\\ags\\state',
        workspaceId: 'ws-windows',
        workerPublicKey: remoteKeys.workerPublic,
        signingKeyFile: 'D:\\ags\\worker.key',
      });

      expect(parseFleetConfig(cfg).hosts[1].nodeCommand).toBe(
        'C:\\Program Files\\node.exe',
      );

      const driveRelative = structuredClone(cfg);
      driveRelative.hosts[1].nodeCommand = 'C:node.exe';
      expect(() => parseFleetConfig(driveRelative)).toThrow(HarnessError);
    });

    it('rejects relative paths in runtime commands and hosts', () => {
      const cfg = makeValidConfig();
      (cfg.runtime as unknown as Record<string, unknown>).nodeCommand = 'node';
      expect(() => parseFleetConfig(cfg)).toThrow(HarnessError);
    });

    it('rejects unknown / monetary-cap fields (strict mode)', () => {
      const cfg = makeValidConfig() as unknown as Record<string, unknown>;
      cfg.monetaryBudgetCapUsd = 50.0;
      expect(() => parseFleetConfig(cfg)).toThrow(HarnessError);
    });

    it('rejects duplicate IDs across authoritative collections', () => {
      const cfg = makeValidConfig();
      cfg.accounts.push({ ...cfg.accounts[0] });
      expect(() => parseFleetConfig(cfg)).toThrow(HarnessError);
    });

    it('rejects identical key reuse between human approvers and machine roles', () => {
      const cfg = makeValidConfig();
      const reusedKey = cfg.approvers[0].publicKey;
      cfg.coordinators[0].publicKey = reusedKey; // Forbidden cross-role key reuse
      expect(() => parseFleetConfig(cfg)).toThrow(HarnessError);
    });
  });

  describe('parseFleetTask', () => {
    it('successfully parses valid FleetTask', () => {
      const task = makeValidTask();
      const parsed = parseFleetTask(task);
      expect(parsed.id).toBe('task-101');
      expect(parsed.toolCallAllowance).toBe(10);
    });

    it('rejects task with negative toolCallAllowance', () => {
      const task = makeValidTask();
      task.toolCallAllowance = -5;
      expect(() => parseFleetTask(task)).toThrow(HarnessError);
    });
  });

  describe('SignedExecutionRequestSchema', () => {
    it('requires budget and only accepts a plan for heldout evaluation requests', () => {
      const config = makeValidConfig();
      const task = { ...makeValidTask(), sourceRef: 'a'.repeat(40) };
      const digest = canonicalDigest(task);
      const policyAuthority = policyDigest(config);
      const budget = {
        id: 'budget-1',
        runId: 'run-1',
        createdAt: Date.now(),
        deadline: Date.now() + 60_000,
        maxAttempts: 1,
        maxConcurrent: 1,
        maxToolCalls: 5,
        reservedAttempts: 0,
        reservedToolCalls: 0,
        policyDigest: policyAuthority,
        policyGeneration: config.generation,
        frozenLimits: config.limits,
      };
      const request = {
        schemaVersion: 1,
        coordinatorId: 'coordinator-1',
        payload: {
          purpose: 'ags-fleet-execute-v1',
          requestId: 'request-1',
          attemptId: crypto.randomUUID(),
          generation: config.generation,
          binding: {
            runId: budget.runId,
            budgetId: budget.id,
            taskDigest: digest,
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
            runtimeDigest: canonicalDigest(config.runtime),
            policyDigest: policyAuthority,
            phase: task.phase,
            stage: 'probe',
            planDigest: canonicalDigest({ plan: 'train' }),
          },
          budget,
          hostId: task.project.hostId,
          expiresAt: Date.now() + 60_000,
          nonce: 'nonce-1',
          task,
          bundle: task.baseline,
        },
        signature: 'signature',
      };

      expect(SignedExecutionRequestSchema.safeParse(request).success).toBe(
        true,
      );
      const missingBudget = structuredClone(request);
      Reflect.deleteProperty(missingBudget.payload, 'budget');
      expect(
        SignedExecutionRequestSchema.safeParse(missingBudget).success,
      ).toBe(false);

      const heldoutTask = { ...task, phase: 'heldout' as const };
      const releaseDigest = canonicalDigest({ harness: 'heldout' });
      const baselineAttemptId = crypto.randomUUID();
      const evaluationPlan = {
        schemaVersion: 1,
        id: 'plan-heldout-1',
        releaseDigest,
        baselineDigest: canonicalDigest(heldoutTask.baseline),
        policyDigest: policyAuthority,
        runtimeDigest: canonicalDigest(config.runtime),
        requiredProjects: [heldoutTask.project.logicalProjectId],
        minImprovement: 0.05,
        maxRegressions: 0,
        cases: [
          {
            id: 'case-heldout-1',
            taskDigest: canonicalDigest(heldoutTask),
            hostId: heldoutTask.project.hostId,
            projectId: heldoutTask.project.projectId,
            logicalProjectId: heldoutTask.project.logicalProjectId,
            accountId: 'acc-test',
            sourceRevision: heldoutTask.sourceRef,
            evaluatorDigest: canonicalDigest(heldoutTask.verification),
            runtimeDigest: canonicalDigest(config.runtime),
            baselineAttemptId,
            candidateAttemptId: request.payload.attemptId,
          },
        ],
      };
      const heldoutRequest = structuredClone(request);
      Reflect.set(heldoutRequest.payload, 'task', heldoutTask);
      Reflect.set(heldoutRequest.payload.binding, 'phase', 'heldout');
      Reflect.set(heldoutRequest.payload.binding, 'stage', 'evaluation');
      Reflect.set(
        heldoutRequest.payload.binding,
        'harnessDigest',
        releaseDigest,
      );
      Reflect.set(
        heldoutRequest.payload.binding,
        'taskDigest',
        canonicalDigest(heldoutTask),
      );
      Reflect.set(
        heldoutRequest.payload.binding,
        'planDigest',
        canonicalDigest(evaluationPlan),
      );
      Reflect.set(heldoutRequest.payload, 'evaluationPlan', evaluationPlan);
      expect(
        SignedExecutionRequestSchema.safeParse(heldoutRequest).success,
      ).toBe(true);

      const heldoutBaselineRequest = structuredClone(heldoutRequest);
      Reflect.set(
        heldoutBaselineRequest.payload,
        'attemptId',
        baselineAttemptId,
      );
      expect(
        SignedExecutionRequestSchema.safeParse(heldoutBaselineRequest).success,
      ).toBe(true);

      const heldoutWithoutPlan = structuredClone(heldoutRequest);
      Reflect.deleteProperty(heldoutWithoutPlan.payload, 'evaluationPlan');
      expect(
        SignedExecutionRequestSchema.safeParse(heldoutWithoutPlan).success,
      ).toBe(false);

      const trainingWithPlan = structuredClone(request);
      Reflect.set(trainingWithPlan.payload, 'evaluationPlan', evaluationPlan);
      expect(
        SignedExecutionRequestSchema.safeParse(trainingWithPlan).success,
      ).toBe(false);

      const planWithUnknownField = structuredClone(heldoutRequest);
      Reflect.set(planWithUnknownField.payload, 'evaluationPlan', {
        ...evaluationPlan,
        unexpected: true,
      });
      expect(
        SignedExecutionRequestSchema.safeParse(planWithUnknownField).success,
      ).toBe(false);
    });
  });

  describe('ProjectAuthoritySchema', () => {
    it('requires an absolute canonical root and unique bounded stack IDs', () => {
      expect(
        ProjectAuthoritySchema.safeParse({
          canonicalRootPath: '/workspace/project',
          stackIds: ['stack-a'],
        }).success,
      ).toBe(true);
      expect(
        ProjectAuthoritySchema.safeParse({
          canonicalRootPath: 'workspace/project',
          stackIds: ['stack-a'],
        }).success,
      ).toBe(false);
      expect(
        ProjectAuthoritySchema.safeParse({
          canonicalRootPath: '/workspace/project',
          stackIds: ['stack-a', 'stack-a'],
        }).success,
      ).toBe(false);
    });
  });

  describe('SignedWorkerReceiptSchema', () => {
    it('requires output bundles only for completed proposal and compose receipts', () => {
      const config = makeValidConfig();
      const task = makeValidTask();
      const makeReceipt = (
        stage: 'proposal' | 'compose' | 'evaluation',
        status: 'completed' | 'failed' | 'accepted' = 'completed',
        includeOutputBundle = false,
      ) => {
        const payload = {
          purpose: 'ags-fleet-receipt-v1',
          requestId: 'request-receipt-1',
          attemptId: crypto.randomUUID(),
          generation: 1,
          binding: {
            runId: 'run-receipt-1',
            budgetId: 'budget-receipt-1',
            taskDigest: canonicalDigest(task),
            hostId: task.project.hostId,
            projectId: task.project.projectId,
            logicalProjectId: task.project.logicalProjectId,
            domain: 'domain-default',
            accountId: 'acc-test',
            provider: 'codex',
            model: 'gpt-5.4',
            sourceRevision: task.sourceRef,
            harnessDigest: canonicalDigest({ stage }),
            evaluatorDigest: canonicalDigest(task.verification),
            runtimeDigest: canonicalDigest(config.runtime),
            policyDigest: policyDigest(config),
            phase: 'train' as const,
            stage,
            planDigest: canonicalDigest({ plan: stage }),
          },
          workerBootId: 'worker-1',
          observedAt: Date.now(),
          status,
          containerIds: [],
        };
        if (includeOutputBundle) {
          Reflect.set(payload, 'outputBundle', task.baseline);
        }
        return {
          schemaVersion: 1,
          hostId: task.project.hostId,
          payload,
          signature: 'signature',
        };
      };

      for (const stage of ['proposal', 'compose'] as const) {
        expect(
          SignedWorkerReceiptSchema.safeParse(
            makeReceipt(stage, 'completed', true),
          ).success,
        ).toBe(true);
        expect(
          SignedWorkerReceiptSchema.safeParse(makeReceipt(stage)).success,
        ).toBe(false);
      }
      expect(
        SignedWorkerReceiptSchema.safeParse(
          makeReceipt('evaluation', 'completed'),
        ).success,
      ).toBe(true);
      expect(
        SignedWorkerReceiptSchema.safeParse(makeReceipt('proposal', 'failed'))
          .success,
      ).toBe(true);
      expect(
        SignedWorkerReceiptSchema.safeParse(
          makeReceipt('proposal', 'failed', true),
        ).success,
      ).toBe(false);
      expect(
        SignedWorkerReceiptSchema.safeParse(
          makeReceipt('proposal', 'accepted', true),
        ).success,
      ).toBe(false);
    });
  });

  describe('SignedApprovalSchema', () => {
    const basePayload = {
      purpose: 'ags-fleet-release-v1' as const,
      releaseDigest: 'rel-123',
      evaluationDigest: 'eval-123',
      selectors: [{ kind: 'project' as const, key: 'proj-1' }],
      expiresAt: Date.now() + 60000,
      nonce: 'nonce-123',
      policyDigest: 'pol-123',
      expectedPinGeneration: 1,
    };

    it('accepts activate with rollout canary or active', () => {
      const canaryApproval = {
        schemaVersion: 1 as const,
        approverId: 'app-1',
        payload: {
          ...basePayload,
          action: 'activate' as const,
          rollout: 'canary' as const,
        },
        signature: 'valid-sig',
      };
      expect(SignedApprovalSchema.safeParse(canaryApproval).success).toBe(true);

      const activeApproval = {
        ...canaryApproval,
        payload: {
          ...canaryApproval.payload,
          rollout: 'active' as const,
        },
      };
      expect(SignedApprovalSchema.safeParse(activeApproval).success).toBe(true);
    });

    it('rejects activate missing rollout', () => {
      const badApproval = {
        schemaVersion: 1 as const,
        approverId: 'app-1',
        payload: {
          ...basePayload,
          action: 'activate' as const,
        },
        signature: 'valid-sig',
      };
      expect(SignedApprovalSchema.safeParse(badApproval).success).toBe(false);
    });

    it('accepts rollback and withdraw without rollout, rejecting if rollout provided', () => {
      const rollbackApproval = {
        schemaVersion: 1 as const,
        approverId: 'app-1',
        payload: {
          ...basePayload,
          action: 'rollback' as const,
        },
        signature: 'valid-sig',
      };
      expect(SignedApprovalSchema.safeParse(rollbackApproval).success).toBe(
        true,
      );

      const withdrawApproval = {
        ...rollbackApproval,
        payload: {
          ...basePayload,
          action: 'withdraw' as const,
        },
      };
      expect(SignedApprovalSchema.safeParse(withdrawApproval).success).toBe(
        true,
      );

      const badRollback = {
        ...rollbackApproval,
        payload: {
          ...rollbackApproval.payload,
          rollout: 'canary' as const,
        },
      };
      expect(SignedApprovalSchema.safeParse(badRollback).success).toBe(false);
    });
  });

  describe('policyDigest', () => {
    it('returns a stable canonical digest for a FleetConfig', () => {
      const cfg1 = makeValidConfig();
      const cfg2 = makeValidConfig();
      expect(policyDigest(cfg1)).toBe(policyDigest(cfg2));
    });
  });

  describe('config authority validation', () => {
    it('rejects identical key material even when encoded differently across roles', () => {
      const cfg = makeValidConfig();
      const spkiDer = crypto
        .createPublicKey({
          key: Buffer.from(cfg.approvers[0].publicKey, 'base64'),
          format: 'der',
          type: 'spki',
        })
        .export({ format: 'der', type: 'spki' });
      // Same Ed25519 material as the approver, but raw 32-byte base64 instead of SPKI DER.
      const rawBase64 = Buffer.from(spkiDer).subarray(12).toString('base64');
      cfg.coordinators[0].publicKey = rawBase64;
      expect(() => parseFleetConfig(cfg)).toThrow(HarnessError);
    });

    it('rejects duplicate stack IDs and duplicate alias checkouts', () => {
      const cfg = makeValidConfig();
      cfg.stacks.push({ ...cfg.stacks[0] });
      expect(() => parseFleetConfig(cfg)).toThrow(HarnessError);

      const aliasCfg = makeValidConfig();
      aliasCfg.projectAliases.push({ ...aliasCfg.projectAliases[0] });
      expect(() => parseFleetConfig(aliasCfg)).toThrow(HarnessError);
    });

    it('rejects aliases missing declared domain/account authority', () => {
      const cfg = makeValidConfig();
      delete (cfg.projectAliases[0] as unknown as Record<string, unknown>)
        .domain;
      expect(() => parseFleetConfig(cfg)).toThrow(HarnessError);
    });

    it('rejects alias groups that disagree on account or domain', () => {
      const cfg = makeValidConfig();
      cfg.accounts.push({
        ...cfg.accounts[0],
        id: 'acc-other',
        allowedDomains: ['domain-default'],
      });
      cfg.projectAliases.push({
        hostId: 'host-other',
        projectId: 'project-other',
        logicalProjectId: 'logical-default',
        domain: 'domain-default',
        accountId: 'acc-other',
      });
      expect(() => parseFleetConfig(cfg)).toThrow(HarnessError);
    });

    it('rejects accounts with no authorized provider endpoints', () => {
      const cfg = makeValidConfig();
      cfg.accounts[0].allowedProviderEndpoints = [];
      expect(() => parseFleetConfig(cfg)).toThrow(HarnessError);
    });
  });

  describe('canonicalJSON hardening', () => {
    it('rejects objects with symbol-keyed properties', () => {
      const value = { a: 1 };
      Object.defineProperty(value, Symbol('hidden'), {
        value: 2,
        enumerable: true,
      });
      expect(() => canonicalJSON(value)).toThrow(HarnessError);
    });
  });
});
