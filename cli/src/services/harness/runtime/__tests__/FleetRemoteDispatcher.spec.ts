import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HarnessSetupService } from '../../HarnessSetupService';
import {
  ConnectedPaseoOrigin,
  ConnectOriginOptions,
  ExecFileFn,
  PaseoConnectionFactory,
  PaseoOriginApi,
  PaseoRemoteApi,
  PaseoSdkTerminalCreateOptions,
  PaseoSdkTerminalHandle,
} from '../../PaseoSdkConnection';
import { FleetRemoteDispatcher } from '../FleetRemoteDispatcher';
import { FleetPolicyService } from '../FleetPolicyService';
import { PROTOCOL_LIMITS } from '../remoteWorkerProtocol';
import {
  formatReceiptMarker,
  signExecutionRequest,
  signWorkerReceipt,
} from '../remoteWorkerProtocol';
import { RuntimeStore } from '../RuntimeStore';
import {
  BudgetEpoch,
  canonicalDigest,
  ExecutionBinding,
  FleetHost,
  FleetTask,
  HarnessError,
  RunResult,
  SignedExecutionRequest,
  SignedWorkerReceipt,
} from '../RuntimeTypes';

function createTerminalHandle(
  captures: Array<{ lines: string[]; totalLines: number }>,
): PaseoSdkTerminalHandle & {
  kill: ReturnType<typeof vi.fn>;
  capture: ReturnType<typeof vi.fn>;
} {
  let index = 0;
  const handle = {
    id: 'term-mock-1',
    current: () => null,
    refresh: async () => null,
    write: () => 0,
    sendKeys: () => 0,
    capture: vi.fn(async (options?: { start?: number }) => {
      const entry = captures[Math.min(index, captures.length - 1)];
      index += 1;
      return {
        terminalId: 'term-mock-1',
        lines: entry.lines,
        totalLines: entry.totalLines,
        requestId: `req-${index}-${options?.start ?? 0}`,
      };
    }),
    kill: vi.fn(async () => undefined),
  };
  return handle;
}

function createRemoteApi(
  handle: PaseoSdkTerminalHandle,
): PaseoRemoteApi & { terminals: { create: ReturnType<typeof vi.fn> } } {
  return {
    dispose: vi.fn(async () => undefined),
    projects: {
      list: vi.fn(async () => ({ projects: [] })),
    },
    terminals: {
      create: vi.fn(async () => handle),
    },
  };
}

describe('FleetRemoteDispatcher', () => {
  let tempBaseDir: string;
  let stateDir: string;
  let store: RuntimeStore;
  let policyService: FleetPolicyService;
  let dispatcher: FleetRemoteDispatcher;

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

  let verifiedOriginExecFileFn: ExecFileFn;
  let validHost: FleetHost;

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

    tempBaseDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'ags-disp-test-'),
    );
    stateDir = path.join(tempBaseDir, 'harness-state');

    const setupService = new HarnessSetupService(stateDir);
    await setupService.setup({
      schemaVersion: 1,
      paseoCommand: '/usr/local/bin/paseo',
      origin: '127.0.0.1:4994',
    });

    store = new RuntimeStore(stateDir, setupService);
    policyService = new FleetPolicyService(store);

    validHost = {
      serverId: 'srv-remote-1',
      nodeCommand: '/usr/bin/node',
      cliPath: '/opt/ags/bin/ags.js',
      stateDir: '/var/lib/ags/state',
      workspaceId: 'ws-remote-1',
      workerPublicKey: hostPubBase64,
      signingKeyFile: path.join(tempBaseDir, 'host-key.pem'),
    };
    verifiedOriginExecFileFn = vi.fn(async () => ({
      stdout: JSON.stringify({
        localDaemon: 'running',
        listen: '127.0.0.1:4994',
      }),
      stderr: '',
    }));
  });

  function createSampleBinding(): ExecutionBinding {
    return {
      runId: 'run-1',
      budgetId: 'budget-1',
      taskDigest: 'task-digest-1',
      hostId: 'srv-remote-1',
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

  function createSampleBudget(): BudgetEpoch {
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
    };
  }

  function createSampleTask(): FleetTask {
    return {
      schemaVersion: 1,
      id: 'task-1',
      project: {
        hostId: 'srv-remote-1',
        projectId: 'proj-1',
        rootPath: '/workspace/proj-1',
        logicalProjectId: 'proj-1',
      },
      sourceRef: '0123456789abcdef0123456789abcdef01234567',
      prompt: 'Execute remote task',
      replaySafe: true,
      phase: 'train',
      deadlineMs: 30000,
      k: 1,
      baseline: {
        schemaVersion: 1,
        id: 'bundle-1',
        scope: { kind: 'project', key: 'proj-1' },
        guidance: 'Base guidance',
        platforms: ['linux'],
        ompVersions: ['0.13.0'],
      },
      verification: {
        argv: ['npm', 'test'],
        files: { 'test.js': 'true;' },
      },
      toolCallAllowance: 5,
    };
  }

  function createSampleRequest(expiresInMs = 4000): SignedExecutionRequest {
    const binding = createSampleBinding();
    const task = createSampleTask();
    const payload: SignedExecutionRequest['payload'] = {
      purpose: 'ags-fleet-execute-v1',
      requestId: crypto.randomUUID(),
      attemptId: crypto.randomUUID(),
      generation: 1,
      binding,
      budget: createSampleBudget(),
      hostId: 'srv-remote-1',
      expiresAt: Date.now() + expiresInMs,
      nonce: crypto.randomBytes(8).toString('hex'),
      task,
      bundle: task.baseline,
    };
    return signExecutionRequest('coord-1', payload, coordPrivPem);
  }

  function createCompletedReceipt(
    request: SignedExecutionRequest,
  ): SignedWorkerReceipt {
    const result: RunResult = {
      attemptId: request.payload.attemptId,
      status: 'completed',
      harnessDigest: request.payload.binding.harnessDigest,
      sourceRevision: request.payload.binding.sourceRevision,
      evaluatorDigest: request.payload.binding.evaluatorDigest,
      passed: true,
      criticalFailures: [],
      toolCalls: 2,
      durationMs: 1200,
      costUsd: null,
      artifactDigest: 'art-digest-1',
      binding: request.payload.binding,
      generation: request.payload.generation,
    };

    return signWorkerReceipt(
      'srv-remote-1',
      {
        purpose: 'ags-fleet-receipt-v1',
        requestId: request.payload.requestId,
        attemptId: request.payload.attemptId,
        generation: request.payload.generation,
        binding: request.payload.binding,
        workerBootId: 'boot-123',
        observedAt: Date.now(),
        status: 'completed',
        resultDigest: canonicalDigest(result),
        artifactDigest: result.artifactDigest,
        containerIds: ['cid-1'],
        terminationConfirmed: true,
        result,
      },
      hostPrivPem,
    );
  }

  function createConnectionFactory(
    remoteApi: PaseoRemoteApi,
    connectOptionsProbe?: (options: ConnectOriginOptions) => void,
    connectDelayMs = 0,
  ): {
    factory: PaseoConnectionFactory;
    close: ReturnType<typeof vi.fn>;
    disposeOrigin: ReturnType<typeof vi.fn>;
  } {
    const close = vi.fn(async () => undefined);
    const disposeOrigin = vi.fn(async () => undefined);
    const factory: PaseoConnectionFactory = {
      connectOrigin: vi.fn(async (options: ConnectOriginOptions) => {
        connectOptionsProbe?.(options);
        if (connectDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, connectDelayMs));
        }
        return {
          driver: { connect: vi.fn(async () => undefined), close },
          api: {
            dispose: disposeOrigin,
            hosts: {
              list: vi.fn(async () => ({ hosts: [] })),
              client: vi.fn(async () => remoteApi),
            },
            projects: {
              list: vi.fn(async () => ({ projects: [] })),
            },
          } as unknown as PaseoOriginApi,
        } satisfies ConnectedPaseoOrigin;
      }),
    };
    return { factory, close, disposeOrigin };
  }

  describe('Host Config Validation', () => {
    it('rejects host missing serverId or required paths', async () => {
      dispatcher = new FleetRemoteDispatcher({
        store,
        policyService,
        execFileFn: verifiedOriginExecFileFn,
      });
      const badHost = { ...validHost, serverId: '' };
      await expect(
        dispatcher.dispatch(badHost, createSampleRequest()),
      ).rejects.toThrow(HarnessError);
    });

    it('rejects host missing workerPublicKey', async () => {
      dispatcher = new FleetRemoteDispatcher({
        store,
        policyService,
        execFileFn: verifiedOriginExecFileFn,
      });
      const badHost = { ...validHost, workerPublicKey: '' };
      await expect(
        dispatcher.dispatch(badHost, createSampleRequest()),
      ).rejects.toThrow(HarnessError);
    });
  });

  describe('Dispatch Execution (O12, O14)', () => {
    async function authenticateStopAndCleanup(
      request: SignedExecutionRequest,
      remoteApi: ReturnType<typeof createRemoteApi>,
      handle: ReturnType<typeof createTerminalHandle>,
      close: ReturnType<typeof vi.fn>,
    ): Promise<void> {
      remoteApi.terminals.create.mockImplementationOnce(
        async (options: PaseoSdkTerminalCreateOptions) => {
          const args = options.args ?? [];
          const index = args.indexOf('--control');
          const control = JSON.parse(
            Buffer.from(args[index + 1]!, 'base64').toString('utf8'),
          );
          const receipt = signWorkerReceipt(
            validHost.serverId,
            {
              purpose: 'ags-fleet-receipt-v1',
              requestId: control.payload.requestId,
              attemptId: request.payload.attemptId,
              generation: request.payload.generation,
              binding: request.payload.binding,
              workerBootId: 'remote-boot',
              observedAt: Date.now(),
              status: 'terminated',
              containerIds: [],
              terminationConfirmed: true,
            },
            hostPrivPem,
          );
          return createTerminalHandle([
            { lines: [formatReceiptMarker(receipt)], totalLines: 1 },
          ]);
        },
      );
      const receipt = await dispatcher.cancel(
        validHost,
        request.payload.attemptId,
        request.payload.generation,
        request.payload.binding,
        'coord-1',
        coordPrivPem,
      );
      expect(receipt.payload.status).toBe('terminated');
      expect(handle.kill).toHaveBeenCalledTimes(1);
      expect(remoteApi.dispose).toHaveBeenCalled();
      expect(close).toHaveBeenCalled();
    }
    it('dispatches command via Paseo terminals with verified options and returns verified receipt', async () => {
      const request = createSampleRequest();
      const receipt = createCompletedReceipt(request);
      const handle = createTerminalHandle([
        { lines: [`noise\n${formatReceiptMarker(receipt)}`], totalLines: 1 },
      ]);
      const remoteApi = createRemoteApi(handle);
      let connectOptions: ConnectOriginOptions | null = null;
      const { factory, close } = createConnectionFactory(
        remoteApi,
        (options) => {
          connectOptions = options;
        },
      );

      dispatcher = new FleetRemoteDispatcher({
        store,
        policyService,
        connectionFactory: factory,
        execFileFn: verifiedOriginExecFileFn,
        originTarget: '127.0.0.1:4994',
      });

      const result = await dispatcher.dispatch(validHost, request);

      expect(result.payload.requestId).toBe(request.payload.requestId);
      expect(result.payload.status).toBe('completed');
      expect(verifiedOriginExecFileFn).toHaveBeenCalledTimes(1);

      expect(connectOptions!.connection).toBe('127.0.0.1:4994');
      expect(connectOptions!.connectTimeoutMs).toBeGreaterThan(0);
      expect(connectOptions!.reconnect).toEqual({ enabled: false });

      expect(remoteApi.terminals.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: validHost.workspaceId,
          command: validHost.nodeCommand,
          args: expect.arrayContaining([
            validHost.cliPath,
            'harness',
            'fleet',
            'worker',
            '--state-dir',
            validHost.stateDir,
            '--request',
          ]),
        }),
      );

      expect(handle.kill).toHaveBeenCalled();
      expect(remoteApi.dispose).toHaveBeenCalled();
      expect(close).toHaveBeenCalled();
    });
    it('does not connect when authenticated origin resolution consumes the RPC deadline', async () => {
      const request = createSampleRequest(40);
      const handle = createTerminalHandle([{ lines: [], totalLines: 0 }]);
      const remoteApi = createRemoteApi(handle);
      const { factory } = createConnectionFactory(remoteApi);
      verifiedOriginExecFileFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return {
          stdout: JSON.stringify({
            localDaemon: 'running',
            listen: '127.0.0.1:4994',
          }),
          stderr: '',
        };
      });
      dispatcher = new FleetRemoteDispatcher({
        store,
        policyService,
        connectionFactory: factory,
        execFileFn: verifiedOriginExecFileFn,
      });

      await expect(
        dispatcher.dispatch(validHost, request),
      ).rejects.toMatchObject({
        code: 'DEADLINE_EXCEEDED',
      });
      expect(factory.connectOrigin).not.toHaveBeenCalled();
      expect(remoteApi.terminals.create).not.toHaveBeenCalled();
    });
    it('retains an already-resolved terminal when its acquisition deadline expires', async () => {
      const request = createSampleRequest();
      const fakeNow = { value: Date.now() };
      const nowSpy = vi
        .spyOn(Date, 'now')
        .mockImplementation(() => fakeNow.value);
      const handle = createTerminalHandle([{ lines: [], totalLines: 0 }]);
      const remoteApi = createRemoteApi(handle);
      remoteApi.terminals.create.mockImplementation(async () => {
        fakeNow.value = request.payload.expiresAt + 1;
        return handle;
      });
      dispatcher = new FleetRemoteDispatcher({
        store,
        policyService,
        connectionFactory: createConnectionFactory(remoteApi).factory,
        execFileFn: verifiedOriginExecFileFn,
      });

      try {
        await expect(
          dispatcher.dispatch(validHost, request),
        ).rejects.toMatchObject({
          code: 'DEADLINE_EXCEEDED',
        });
        expect(handle.kill).not.toHaveBeenCalled();
        expect(remoteApi.dispose).not.toHaveBeenCalled();
      } finally {
        nowSpy.mockRestore();
      }
    });
    it('disposes a late-resolving origin exactly once after the RPC deadline', async () => {
      const request = createSampleRequest(50);
      const remoteApi = createRemoteApi(
        createTerminalHandle([{ lines: [], totalLines: 0 }]),
      );
      const { factory, close, disposeOrigin } = createConnectionFactory(
        remoteApi,
        undefined,
        100,
      );
      dispatcher = new FleetRemoteDispatcher({
        store,
        policyService,
        connectionFactory: factory,
        execFileFn: verifiedOriginExecFileFn,
      });

      await expect(
        dispatcher.dispatch(validHost, request),
      ).rejects.toMatchObject({
        code: 'RPC_TIMEOUT',
      });
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(disposeOrigin).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
      expect(remoteApi.terminals.create).not.toHaveBeenCalled();
    });

    it('uses the terminal line cursor so split captures never skip the receipt', async () => {
      const request = createSampleRequest();
      const receipt = createCompletedReceipt(request);
      const markerLine = formatReceiptMarker(receipt);
      const handle = createTerminalHandle([
        { lines: ['worker booting'], totalLines: 1 },
        { lines: [markerLine], totalLines: 2 },
      ]);
      const remoteApi = createRemoteApi(handle);

      dispatcher = new FleetRemoteDispatcher({
        store,
        policyService,
        connectionFactory: createConnectionFactory(remoteApi).factory,
        execFileFn: verifiedOriginExecFileFn,
      });

      const result = await dispatcher.dispatch(validHost, request);
      expect(result.payload.status).toBe('completed');

      const starts = handle.capture.mock.calls.map((call) => call[0]?.start);
      expect(starts[0]).toBe(0);
      expect(starts[1]).toBe(1);
    });

    it('retains terminal ownership without a signed receipt, then cleans up after authenticated stop', async () => {
      const request = createSampleRequest(80);
      const handle = createTerminalHandle([
        { lines: ['Worker exited without marker'], totalLines: 1 },
      ]);
      const remoteApi = createRemoteApi(handle);
      const { factory, close } = createConnectionFactory(remoteApi);

      dispatcher = new FleetRemoteDispatcher({
        store,
        policyService,
        connectionFactory: factory,
        execFileFn: verifiedOriginExecFileFn,
      });

      await expect(dispatcher.dispatch(validHost, request)).rejects.toThrow(
        HarnessError,
      );
      expect(handle.kill).not.toHaveBeenCalled();
      expect(remoteApi.dispose).not.toHaveBeenCalled();
      await authenticateStopAndCleanup(request, remoteApi, handle, close);
    });

    it('does not accept a forged marker and retains ownership until authenticated stop', async () => {
      const request = createSampleRequest(80);
      const forged = createCompletedReceipt(request);
      forged.payload.attemptId = crypto.randomUUID();
      const handle = createTerminalHandle([
        { lines: [formatReceiptMarker(forged)], totalLines: 1 },
      ]);
      const remoteApi = createRemoteApi(handle);
      const { factory, close } = createConnectionFactory(remoteApi);

      dispatcher = new FleetRemoteDispatcher({
        store,
        policyService,
        connectionFactory: factory,
        execFileFn: verifiedOriginExecFileFn,
      });

      await expect(
        dispatcher.dispatch(validHost, request),
      ).rejects.toMatchObject({
        code: 'INVALID_RECEIPT_SIGNATURE',
      });
      expect(handle.kill).not.toHaveBeenCalled();
      expect(remoteApi.dispose).not.toHaveBeenCalled();
      await authenticateStopAndCleanup(request, remoteApi, handle, close);
    });

    it('retains an oversized terminal until authenticated stop permits cleanup', async () => {
      const request = createSampleRequest();
      const handle = createTerminalHandle([
        {
          lines: ['x'],
          totalLines: PROTOCOL_LIMITS.MAX_CAPTURE_LINES + 1,
        },
      ]);
      const remoteApi = createRemoteApi(handle);
      const { factory, close } = createConnectionFactory(remoteApi);

      dispatcher = new FleetRemoteDispatcher({
        store,
        policyService,
        connectionFactory: factory,
        execFileFn: verifiedOriginExecFileFn,
      });

      await expect(
        dispatcher.dispatch(validHost, request),
      ).rejects.toMatchObject({
        code: 'TERMINAL_OUTPUT_TOO_LARGE',
      });
      expect(handle.kill).not.toHaveBeenCalled();
      expect(remoteApi.dispose).not.toHaveBeenCalled();
      await authenticateStopAndCleanup(request, remoteApi, handle, close);
    });
    it('retains a late terminal until authenticated status cleanup', async () => {
      const request = createSampleRequest(60);
      const handle = createTerminalHandle([]);
      const controlHandle = createTerminalHandle([
        { lines: [], totalLines: 0 },
      ]);
      const remoteApi = createRemoteApi(handle);
      let resolveCreate:
        ((terminal: PaseoSdkTerminalHandle) => void) | undefined;
      remoteApi.terminals.create.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          }),
      );
      remoteApi.terminals.create.mockImplementationOnce(
        async (options: PaseoSdkTerminalCreateOptions) => {
          const args = options.args ?? [];
          const index = args.indexOf('--control');
          const control = JSON.parse(
            Buffer.from(args[index + 1]!, 'base64').toString('utf8'),
          );
          const receipt = signWorkerReceipt(
            validHost.serverId,
            {
              purpose: 'ags-fleet-receipt-v1',
              requestId: control.payload.requestId,
              attemptId: request.payload.attemptId,
              generation: request.payload.generation,
              binding: request.payload.binding,
              workerBootId: 'remote-boot',
              observedAt: Date.now(),
              status: 'terminated',
              containerIds: [],
              terminationConfirmed: true,
            },
            hostPrivPem,
          );
          controlHandle.capture = vi.fn(async () => ({
            terminalId: 'control-terminal',
            lines: [formatReceiptMarker(receipt)],
            totalLines: 1,
            requestId: 'status-receipt',
          }));
          return controlHandle;
        },
      );
      const { factory, close } = createConnectionFactory(remoteApi);
      dispatcher = new FleetRemoteDispatcher({
        store,
        policyService,
        connectionFactory: factory,
        execFileFn: verifiedOriginExecFileFn,
      });

      await expect(
        dispatcher.dispatch(validHost, request),
      ).rejects.toMatchObject({
        code: 'RPC_TIMEOUT',
      });
      expect(remoteApi.dispose).not.toHaveBeenCalled();

      if (!resolveCreate)
        throw new Error('Expected terminal creation to be in flight');
      resolveCreate(handle);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(handle.kill).not.toHaveBeenCalled();

      const receipt = await dispatcher.cancel(
        validHost,
        request.payload.attemptId,
        request.payload.generation,
        request.payload.binding,
        'coord-1',
        coordPrivPem,
      );
      expect(receipt.payload.status).toBe('terminated');
      expect(handle.kill).toHaveBeenCalledTimes(1);
      expect(remoteApi.dispose).toHaveBeenCalled();
      expect(close).toHaveBeenCalled();
    });
  });

  describe('Control Actions (Cancel / Status)', () => {
    it('dispatches a signed cancel bound to the exact attempt binding', async () => {
      const binding = createSampleBinding();
      const attemptId = crypto.randomUUID();
      const requestIdHolder: { value: string } = { value: '' };

      const handle = createTerminalHandle([{ lines: [], totalLines: 0 }]);
      handle.capture = vi.fn(async () => {
        const receipt = signWorkerReceipt(
          'srv-remote-1',
          {
            purpose: 'ags-fleet-receipt-v1',
            requestId: requestIdHolder.value,
            attemptId,
            generation: 1,
            binding,
            workerBootId: 'boot-1',
            observedAt: Date.now(),
            status: 'terminated',
            containerIds: ['c-1'],
            terminationConfirmed: true,
          },
          hostPrivPem,
        );
        return {
          terminalId: 'term-mock-1',
          lines: [formatReceiptMarker(receipt)],
          totalLines: 1,
          requestId: 'cap-1',
        };
      });

      const remoteApi = createRemoteApi(handle);
      remoteApi.terminals.create.mockImplementation(
        async (options: PaseoSdkTerminalCreateOptions) => {
          const args = options.args ?? [];
          const index = args.indexOf('--control');
          const encoded = args[index + 1];
          const parsed = JSON.parse(
            Buffer.from(encoded, 'base64').toString('utf8'),
          );
          requestIdHolder.value = parsed.payload.requestId;
          expect(parsed.payload.bindingDigest).toBe(canonicalDigest(binding));
          return handle;
        },
      );

      dispatcher = new FleetRemoteDispatcher({
        store,
        policyService,
        connectionFactory: createConnectionFactory(remoteApi).factory,
        execFileFn: verifiedOriginExecFileFn,
      });

      const receipt = await dispatcher.cancel(
        validHost,
        attemptId,
        1,
        binding,
        'coord-1',
        coordPrivPem,
      );

      expect(receipt.payload.status).toBe('terminated');
      expect(receipt.payload.terminationConfirmed).toBe(true);
      expect(receipt.payload.attemptId).toBe(attemptId);
      expect(receipt.payload.binding).toEqual(binding);
    });

    it('rejects a control receipt that reports a different attempt binding', async () => {
      const binding = createSampleBinding();
      const attemptId = crypto.randomUUID();
      const requestIdHolder: { value: string } = { value: '' };
      const otherBinding = {
        ...binding,
        harnessDigest: 'different-harness-digest',
      };

      const handle = createTerminalHandle([{ lines: [], totalLines: 0 }]);
      handle.capture = vi.fn(async () => {
        const receipt = signWorkerReceipt(
          'srv-remote-1',
          {
            purpose: 'ags-fleet-receipt-v1',
            requestId: requestIdHolder.value,
            attemptId,
            generation: 1,
            binding: otherBinding,
            workerBootId: 'boot-1',
            observedAt: Date.now(),
            status: 'terminated',
            containerIds: ['c-1'],
            terminationConfirmed: true,
          },
          hostPrivPem,
        );
        return {
          terminalId: 'term-mock-1',
          lines: [formatReceiptMarker(receipt)],
          totalLines: 1,
          requestId: 'cap-1',
        };
      });

      const remoteApi = createRemoteApi(handle);
      remoteApi.terminals.create.mockImplementation(
        async (options: PaseoSdkTerminalCreateOptions) => {
          const args = options.args ?? [];
          const index = args.indexOf('--control');
          const encoded = args[index + 1];
          requestIdHolder.value = JSON.parse(
            Buffer.from(encoded, 'base64').toString('utf8'),
          ).payload.requestId;
          return handle;
        },
      );

      dispatcher = new FleetRemoteDispatcher({
        store,
        policyService,
        connectionFactory: createConnectionFactory(remoteApi).factory,
        execFileFn: verifiedOriginExecFileFn,
      });

      await expect(
        dispatcher.cancel(
          validHost,
          attemptId,
          1,
          binding,
          'coord-1',
          coordPrivPem,
        ),
      ).rejects.toMatchObject({ code: 'RECEIPT_BINDING_MISMATCH' });
    });
  });

  it('requires a resolvable verified origin when no explicit target is supplied', async () => {
    dispatcher = new FleetRemoteDispatcher({
      store,
      policyService,
      connectionFactory: createConnectionFactory(
        createRemoteApi(createTerminalHandle([])),
      ).factory,
      execFileFn: async () => {
        throw new Error('daemon unreachable');
      },
    });

    await expect(
      dispatcher.dispatch(validHost, createSampleRequest()),
    ).rejects.toMatchObject({
      code: 'ORIGIN_UNRESOLVED',
    });
  });
  it('rejects an explicit origin that differs from the authenticated configured origin', async () => {
    dispatcher = new FleetRemoteDispatcher({
      store,
      policyService,
      connectionFactory: createConnectionFactory(
        createRemoteApi(createTerminalHandle([])),
      ).factory,
      execFileFn: verifiedOriginExecFileFn,
      originTarget: 'other-host:4994',
    });

    await expect(
      dispatcher.dispatch(validHost, createSampleRequest()),
    ).rejects.toMatchObject({
      code: 'ORIGIN_UNRESOLVED',
    });
  });
});
