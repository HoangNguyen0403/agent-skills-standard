import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  decodePayloadBase64,
  encodePayloadBase64,
  extractReceiptFromStdout,
  formatReceiptMarker,
  hasCompleteReceiptMarker,
  loadPrivateKey,
  loadPublicKey,
  SignedControlRequest,
  signControlRequest,
  signExecutionRequest,
  signWorkerReceipt,
  validateControlRequest,
  validateExecutionRequest,
  validateWorkerReceipt,
  verifyControlRequestSignature,
  verifyExecutionRequestSignature,
  verifyWorkerReceiptSignature,
} from '../remoteWorkerProtocol';
import {
  BudgetEpoch,
  canonicalDigest,
  ExecutionBinding,
  FleetTask,
  HarnessError,
  RunResult,
  SignedExecutionRequest,
  SignedWorkerReceipt,
} from '../RuntimeTypes';

describe('remoteWorkerProtocol', () => {
  let coordKeyPair: {
    publicKey: crypto.KeyObject;
    privateKey: crypto.KeyObject;
  };
  let coordPubBase64: string;
  let coordPrivPem: string;

  let hostKeyPair: {
    publicKey: crypto.KeyObject;
    privateKey: crypto.KeyObject;
  };
  let hostPubBase64: string;
  let hostPrivPem: string;

  let tempDir: string;
  let hostKeyFile: string;

  beforeEach(async () => {
    coordKeyPair = crypto.generateKeyPairSync('ed25519');
    coordPubBase64 = coordKeyPair.publicKey
      .export({ type: 'spki', format: 'der' })
      .subarray(12)
      .toString('base64');
    coordPrivPem = coordKeyPair.privateKey.export({
      type: 'pkcs8',
      format: 'pem',
    }) as string;

    hostKeyPair = crypto.generateKeyPairSync('ed25519');
    hostPubBase64 = hostKeyPair.publicKey
      .export({ type: 'spki', format: 'der' })
      .subarray(12)
      .toString('base64');
    hostPrivPem = hostKeyPair.privateKey.export({
      type: 'pkcs8',
      format: 'pem',
    }) as string;

    tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'ags-proto-test-'),
    );
    hostKeyFile = path.join(tempDir, 'host-key.pem');
    await fs.writeFile(hostKeyFile, hostPrivPem, { mode: 0o600 });
  });

  function createSampleBinding(): ExecutionBinding {
    return {
      runId: 'run-1',
      budgetId: 'budget-1',
      taskDigest: 'task-digest-1',
      hostId: 'host-1',
      projectId: 'proj-1',
      logicalProjectId: 'proj-1',
      domain: 'domain-a',
      accountId: 'acc-1',
      provider: 'codex',
      model: 'gpt-5.4',
      sourceRevision: '0123456789abcdef0123456789abcdef01234567',
      harnessDigest: 'harness-digest-1',
      evaluatorDigest: 'eval-digest-1',
      runtimeDigest: 'runtime-digest-1',
      policyDigest: 'policy-digest-1',
      phase: 'train',
      stage: 'baseline',
      planDigest: 'plan-digest-1',
    };
  }

  function createSampleBudget(overrides?: Partial<BudgetEpoch>): BudgetEpoch {
    const now = Date.now();
    return {
      id: 'budget-1',
      runId: 'run-1',
      createdAt: now - 1000,
      deadline: now + 600000,
      maxAttempts: 10,
      maxConcurrent: 4,
      maxToolCalls: 200,
      reservedAttempts: 1,
      reservedToolCalls: 0,
      policyDigest: 'policy-digest-1',
      policyGeneration: 1,
      frozenLimits: {
        maxAttempts: 10,
        maxConcurrent: 4,
        maxToolCalls: 200,
        maxDurationMs: 600000,
        perHost: 4,
        perProject: 4,
        perAccount: 4,
      },
      ...overrides,
    };
  }

  function createSampleTask(): FleetTask {
    return {
      schemaVersion: 1,
      id: 'task-1',
      project: {
        hostId: 'host-1',
        projectId: 'proj-1',
        rootPath: '/workspace/proj-1',
        logicalProjectId: 'proj-1',
      },
      sourceRef: '0123456789abcdef0123456789abcdef01234567',
      prompt: 'Execute task',
      replaySafe: true,
      phase: 'train',
      deadlineMs: 30000,
      k: 1,
      baseline: {
        schemaVersion: 1,
        id: 'bundle-1',
        scope: { kind: 'project', key: 'proj-1' },
        guidance: 'Base guidance',
        platforms: ['darwin'],
        ompVersions: ['0.13.0'],
      },
      verification: {
        argv: ['npm', 'test'],
        files: { 'test.js': 'true;' },
      },
      toolCallAllowance: 5,
    };
  }

  function createExecutionPayload(): SignedExecutionRequest['payload'] {
    const task = createSampleTask();
    const binding: ExecutionBinding = {
      ...createSampleBinding(),
      taskDigest: canonicalDigest(task),
      harnessDigest: canonicalDigest(task.baseline),
      evaluatorDigest: canonicalDigest(task.verification),
    };
    return {
      purpose: 'ags-fleet-execute-v1',
      requestId: crypto.randomUUID(),
      attemptId: crypto.randomUUID(),
      generation: 1,
      binding,
      budget: createSampleBudget(),
      hostId: 'host-1',
      expiresAt: Date.now() + 60000,
      nonce: 'nonce-1',
      task,
      bundle: task.baseline,
    };
  }

  describe('Key Loading & Validation', () => {
    it('loads raw 32-byte Ed25519 public key in base64', () => {
      const pubKey = loadPublicKey(coordPubBase64);
      expect(pubKey.type).toBe('public');
      expect(pubKey.asymmetricKeyType).toBe('ed25519');
    });

    it('loads SPKI DER base64 Ed25519 public key', () => {
      const spkiDerBase64 = coordKeyPair.publicKey
        .export({ type: 'spki', format: 'der' })
        .toString('base64');
      const pubKey = loadPublicKey(spkiDerBase64);
      expect(pubKey.type).toBe('public');
      expect(pubKey.asymmetricKeyType).toBe('ed25519');
    });

    it('loads private key from PEM string and from file path', () => {
      const privFromPem = loadPrivateKey(hostPrivPem);
      expect(privFromPem.type).toBe('private');
      expect(privFromPem.asymmetricKeyType).toBe('ed25519');

      const privFromFile = loadPrivateKey(hostKeyFile);
      expect(privFromFile.type).toBe('private');
      expect(privFromFile.asymmetricKeyType).toBe('ed25519');
    });

    it('rejects non-Ed25519 keys', () => {
      const rsaKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const rsaPem = rsaKey.publicKey.export({
        type: 'spki',
        format: 'pem',
      }) as string;
      expect(() => loadPublicKey(rsaPem)).toThrow(HarnessError);
    });
  });

  describe('Execution Request Protocol', () => {
    it('signs and verifies valid SignedExecutionRequest', () => {
      const payload = createExecutionPayload();
      const signed = signExecutionRequest('coord-1', payload, coordPrivPem);
      expect(signed.schemaVersion).toBe(1);
      expect(signed.coordinatorId).toBe('coord-1');
      expect(verifyExecutionRequestSignature(signed, coordPubBase64)).toBe(
        true,
      );
    });

    it('fails verification if payload is tampered', () => {
      const signed = signExecutionRequest(
        'coord-1',
        createExecutionPayload(),
        coordPrivPem,
      );
      signed.payload.hostId = 'malicious-host';
      expect(verifyExecutionRequestSignature(signed, coordPubBase64)).toBe(
        false,
      );
    });

    it('validateExecutionRequest checks target host, expiry, and coordinator trust', () => {
      const signed = signExecutionRequest(
        'coord-1',
        createExecutionPayload(),
        coordPrivPem,
      );
      const coordinators = [{ id: 'coord-1', publicKey: coordPubBase64 }];

      expect(() =>
        validateExecutionRequest(signed, 'host-1', coordinators, Date.now()),
      ).not.toThrow();

      expect(() =>
        validateExecutionRequest(
          signed,
          'other-host',
          coordinators,
          Date.now(),
        ),
      ).toThrow(HarnessError);

      expect(() =>
        validateExecutionRequest(
          signed,
          'host-1',
          coordinators,
          Date.now() + 100000,
        ),
      ).toThrow(HarnessError);

      expect(() =>
        validateExecutionRequest(signed, 'host-1', [
          { id: 'coord-2', publicKey: coordPubBase64 },
        ]),
      ).toThrow(HarnessError);
    });

    it('rejects a signed request whose budget authority disagrees with the binding', () => {
      const payload = createExecutionPayload();
      payload.budget = createSampleBudget({ runId: 'other-run' });
      const signed = signExecutionRequest('coord-1', payload, coordPrivPem);
      const coordinators = [{ id: 'coord-1', publicKey: coordPubBase64 }];

      expect(() =>
        validateExecutionRequest(signed, 'host-1', coordinators),
      ).toThrow(HarnessError);
    });

    it('rejects a signed request whose generation is not the signed epoch generation', () => {
      const payload = createExecutionPayload();
      payload.generation = 2;
      const signed = signExecutionRequest('coord-1', payload, coordPrivPem);
      const coordinators = [{ id: 'coord-1', publicKey: coordPubBase64 }];

      expect(() =>
        validateExecutionRequest(signed, 'host-1', coordinators),
      ).toThrow(HarnessError);
    });

    it('rejects a signed request whose admitted bundle digest was rewritten', () => {
      const payload = createExecutionPayload();
      payload.bundle = { ...payload.bundle, guidance: 'swapped after signing' };
      const signed = signExecutionRequest('coord-1', payload, coordPrivPem);
      const coordinators = [{ id: 'coord-1', publicKey: coordPubBase64 }];

      expect(() =>
        validateExecutionRequest(signed, 'host-1', coordinators),
      ).toThrow(HarnessError);
    });
  });

  describe('Worker Receipt Protocol & Cross-Field Coherence (O11)', () => {
    function createReceiptPayload(
      attemptId: string,
      binding: ExecutionBinding,
      overrides?: Partial<SignedWorkerReceipt['payload']>,
    ): SignedWorkerReceipt['payload'] {
      const result: RunResult = {
        attemptId,
        status: 'completed',
        harnessDigest: binding.harnessDigest,
        sourceRevision: binding.sourceRevision,
        evaluatorDigest: binding.evaluatorDigest,
        passed: true,
        criticalFailures: [],
        toolCalls: 3,
        durationMs: 1500,
        costUsd: null,
        artifactDigest: 'art-digest-1',
        binding,
        generation: 1,
      };

      return {
        purpose: 'ags-fleet-receipt-v1',
        requestId: 'req-1',
        attemptId,
        generation: 1,
        binding,
        workerBootId: 'boot-1',
        observedAt: Date.now(),
        status: 'completed',
        resultDigest: canonicalDigest(result),
        artifactDigest: 'art-digest-1',
        containerIds: ['cid-1'],
        terminationConfirmed: true,
        result,
        ...overrides,
      };
    }

    it('signs and strictly verifies valid completed SignedWorkerReceipt with result object', () => {
      const binding = createSampleBinding();
      const attemptId = crypto.randomUUID();
      const payload = createReceiptPayload(attemptId, binding);

      const signed = signWorkerReceipt('host-1', payload, hostPrivPem);
      expect(signed.schemaVersion).toBe(1);
      expect(verifyWorkerReceiptSignature(signed, hostPubBase64)).toBe(true);

      expect(() =>
        validateWorkerReceipt(signed, 'host-1', hostPubBase64, {
          requestId: 'req-1',
          attemptId,
          generation: 1,
          binding,
          bindingDigest: canonicalDigest(binding),
        }),
      ).not.toThrow();
    });

    it('rejects receipt if resultDigest does not match actual result object', () => {
      const binding = createSampleBinding();
      const payload = createReceiptPayload(crypto.randomUUID(), binding, {
        resultDigest: 'tampered-digest',
      });
      const signed = signWorkerReceipt('host-1', payload, hostPrivPem);
      expect(() =>
        validateWorkerReceipt(signed, 'host-1', hostPubBase64),
      ).toThrow(HarnessError);
    });

    it('rejects an outer status that disagrees with the nested result status', () => {
      const binding = createSampleBinding();
      const attemptId = crypto.randomUUID();
      const payload = createReceiptPayload(attemptId, binding, {
        status: 'failed',
      });
      const signed = signWorkerReceipt('host-1', payload, hostPrivPem);

      expect(() =>
        validateWorkerReceipt(signed, 'host-1', hostPubBase64),
      ).toThrow(HarnessError);
    });

    it('rejects a terminal receipt that omits the artifact digest', () => {
      const binding = createSampleBinding();
      const { artifactDigest: _omitted, ...payload } = createReceiptPayload(
        crypto.randomUUID(),
        binding,
      );
      const signed = signWorkerReceipt('host-1', payload, hostPrivPem);

      expect(() =>
        validateWorkerReceipt(signed, 'host-1', hostPubBase64),
      ).toThrow(HarnessError);
    });

    it('rejects a non-terminal receipt that asserts confirmed termination', () => {
      const binding = createSampleBinding();
      const payload: SignedWorkerReceipt['payload'] = {
        purpose: 'ags-fleet-receipt-v1',
        requestId: 'req-1',
        attemptId: crypto.randomUUID(),
        generation: 1,
        binding,
        workerBootId: 'boot-1',
        observedAt: Date.now(),
        status: 'accepted',
        containerIds: [],
        terminationConfirmed: true,
      };
      const signed = signWorkerReceipt('host-1', payload, hostPrivPem);

      expect(() =>
        validateWorkerReceipt(signed, 'host-1', hostPubBase64),
      ).toThrow(HarnessError);
    });

    it('rejects a receipt whose binding digest does not match the expected execution', () => {
      const binding = createSampleBinding();
      const payload = createReceiptPayload(crypto.randomUUID(), binding);
      const signed = signWorkerReceipt('host-1', payload, hostPrivPem);

      expect(() =>
        validateWorkerReceipt(signed, 'host-1', hostPubBase64, {
          bindingDigest: 'other-binding-digest',
        }),
      ).toThrow(HarnessError);
    });

    it('rejects a non-canonical (base64url) signature encoding', () => {
      const binding = createSampleBinding();
      const payload = createReceiptPayload(crypto.randomUUID(), binding);
      const signed = signWorkerReceipt('host-1', payload, hostPrivPem);
      signed.signature = signed.signature
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      expect(() =>
        validateWorkerReceipt(signed, 'host-1', hostPubBase64),
      ).toThrow(HarnessError);
    });
  });

  describe('Control Request Protocol', () => {
    function createControlPayload(): SignedControlRequest['payload'] {
      return {
        purpose: 'ags-fleet-control-v1',
        requestId: crypto.randomUUID(),
        attemptId: crypto.randomUUID(),
        generation: 1,
        action: 'cancel',
        hostId: 'host-1',
        bindingDigest: 'binding-digest-1',
        expiresAt: Date.now() + 30000,
        nonce: 'nonce-control',
      };
    }

    it('signs and verifies SignedControlRequest', () => {
      const payload = createControlPayload();
      const signed = signControlRequest('coord-1', payload, coordPrivPem);
      expect(signed.schemaVersion).toBe(1);
      expect(verifyControlRequestSignature(signed, coordPubBase64)).toBe(true);

      expect(() =>
        validateControlRequest(signed, 'host-1', [
          { id: 'coord-1', publicKey: coordPubBase64 },
        ]),
      ).not.toThrow();
    });

    it('rejects a control request whose binding digest was tampered after signing', () => {
      const signed = signControlRequest(
        'coord-1',
        createControlPayload(),
        coordPrivPem,
      );
      signed.payload.bindingDigest = 'rewritten-binding';

      expect(() =>
        validateControlRequest(signed, 'host-1', [
          { id: 'coord-1', publicKey: coordPubBase64 },
        ]),
      ).toThrow(HarnessError);
    });
  });

  describe('Receipt Markers in Stdout (O12)', () => {
    it('formats and extracts receipt marker cleanly from stdout with surrounding noise', () => {
      const binding = createSampleBinding();
      const payload: SignedWorkerReceipt['payload'] = {
        purpose: 'ags-fleet-receipt-v1',
        requestId: 'req-1',
        attemptId: crypto.randomUUID(),
        generation: 1,
        binding,
        workerBootId: 'boot-1',
        observedAt: Date.now(),
        status: 'running',
        containerIds: ['c-1'],
      };

      const signed = signWorkerReceipt('host-1', payload, hostPrivPem);
      const markerText = formatReceiptMarker(signed);

      const stdout = `Some random output line\n${markerText}\nSome closing line`;
      const extracted = extractReceiptFromStdout(stdout);

      expect(hasCompleteReceiptMarker(stdout)).toBe(true);
      expect(extracted).not.toBeNull();
      expect(extracted?.payload.requestId).toBe('req-1');
      expect(extracted?.payload.status).toBe('running');
    });

    it('returns null if no receipt marker present', () => {
      expect(extractReceiptFromStdout('arbitrary output')).toBeNull();
      expect(hasCompleteReceiptMarker('arbitrary output')).toBe(false);
    });

    it('throws HarnessError if receipt marker is truncated or missing end marker', () => {
      const truncated = '---BEGIN AGS FLEET WORKER RECEIPT---\nbase64data';
      expect(() => extractReceiptFromStdout(truncated)).toThrow(HarnessError);
    });
  });

  describe('Base64 encoding/decoding and bounds (O12)', () => {
    it('round-trips arbitrary JSON objects canonically', () => {
      const obj = { z: 1, a: [3, 2, 1], b: { x: 'test' } };
      const encoded = encodePayloadBase64(obj);
      const decoded = decodePayloadBase64(encoded);
      expect(decoded).toEqual(obj);
    });
  });
});
