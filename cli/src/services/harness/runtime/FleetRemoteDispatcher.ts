import { execFile as nodeExecFile } from 'child_process';
import crypto from 'crypto';
import { setTimeout as sleep } from 'timers/promises';
import { HarnessSetupService } from '../HarnessSetupService';
import {
  ConnectedPaseoOrigin,
  ConnectOriginOptions,
  DefaultPaseoConnectionFactory,
  DISCOVERY_LIMITS,
  ExecFileFn,
  normalizeTargetForComparison,
  PaseoConnectionFactory,
  PaseoRemoteApi,
  PaseoSdkTerminalCaptureResult,
  PaseoSdkTerminalHandle,
  resolveOriginTarget,
} from '../PaseoSdkConnection';
import { FleetPolicyService } from './FleetPolicyService';
import {
  extractReceiptFromStdout,
  hasCompleteReceiptMarker,
  loadPublicKey,
  PROTOCOL_LIMITS,
  signControlRequest,
  SignedControlRequest,
  validateWorkerReceipt,
} from './remoteWorkerProtocol';
import { RuntimeStore } from './RuntimeStore';
import {
  canonicalDigest,
  canonicalJSON,
  ExecutionBinding,
  FleetHost,
  HarnessError,
  SignedExecutionRequest,
  SignedWorkerReceipt,
} from './RuntimeTypes';

const defaultExecFileFn: ExecFileFn = (file, args, options) =>
  new Promise((resolve, reject) => {
    nodeExecFile(
      file,
      args,
      {
        cwd: options.cwd,
        env: options.env,
        timeout: options.timeout,
        maxBuffer: options.maxBuffer,
        encoding: 'utf8',
      },
      (err, stdout, stderr) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
      },
    );
  });

export interface FleetRemoteDispatcherOptions {
  store: RuntimeStore;
  policyService: FleetPolicyService;
  connectionFactory?: PaseoConnectionFactory;
  /** Trusted subprocess runner used only for verified daemon status resolution. */
  execFileFn?: ExecFileFn;
  /**
   * Optional assertion that the resolved origin matches an expected endpoint. It never
   * bypasses daemon or credential resolution.
   */
  originTarget?: string;
}

interface VerifiedOrigin {
  target: string;
  localCredential?: string;
  password?: string;
}
interface LateTerminalOwnership {
  handle: PaseoSdkTerminalHandle | null;
  routedApi: PaseoRemoteApi;
  connectedOrigin: ConnectedPaseoOrigin;
  terminalConfirmed: boolean;
}

export class FleetRemoteDispatcher {
  readonly store: RuntimeStore;
  readonly policyService: FleetPolicyService;
  private readonly connectionFactory: PaseoConnectionFactory;
  private readonly execFileFn: ExecFileFn;
  private readonly originTarget?: string;
  private readonly lateTerminalOwners = new Map<
    string,
    LateTerminalOwnership[]
  >();

  constructor(options: FleetRemoteDispatcherOptions) {
    this.store = options.store;
    this.policyService = options.policyService;
    this.connectionFactory =
      options.connectionFactory ?? new DefaultPaseoConnectionFactory();
    this.execFileFn = options.execFileFn ?? defaultExecFileFn;
    this.originTarget = options.originTarget;
  }

  /**
   * Captures bounded terminal scrollback until a signed receipt is verified. Unknown or
   * late terminal handles remain owned until authenticated status permits cleanup.
   */
  async dispatch(
    host: FleetHost,
    request: SignedExecutionRequest,
  ): Promise<SignedWorkerReceipt> {
    this.validateHostConfig(host);

    const encodedRequest = encodeArgvPayload(request);
    const argv = buildWorkerArgv(host, '--request', encodedRequest);

    const receipt = await this.executeRemoteTerminal(host, argv, {
      deadline: request.payload.expiresAt,
      ownershipKey: terminalOwnershipKey(
        host.serverId,
        request.payload.attemptId,
        request.payload.generation,
      ),
      validate: (text) =>
        validateWorkerReceipt(
          requireMarker(text),
          host.serverId,
          host.workerPublicKey,
          {
            requestId: request.payload.requestId,
            attemptId: request.payload.attemptId,
            generation: request.payload.generation,
            binding: request.payload.binding,
            allowedStatuses: ['completed', 'failed', 'unknown'],
          },
        ),
    });

    return receipt;
  }

  /**
   * Dispatches an authenticated control request (status, cancel) to a configured remote worker host.
   */
  async control(
    host: FleetHost,
    controlRequest: SignedControlRequest,
    expectedBinding: ExecutionBinding,
  ): Promise<SignedWorkerReceipt> {
    this.validateHostConfig(host);

    const encodedControl = encodeArgvPayload(controlRequest);
    const argv = buildWorkerArgv(host, '--control', encodedControl);

    const receipt = await this.executeRemoteTerminal(host, argv, {
      deadline: controlRequest.payload.expiresAt,
      ownershipKey: terminalOwnershipKey(
        host.serverId,
        controlRequest.payload.attemptId,
        controlRequest.payload.generation,
      ),
      validate: (text) =>
        validateWorkerReceipt(
          requireMarker(text),
          host.serverId,
          host.workerPublicKey,
          {
            requestId: controlRequest.payload.requestId,
            attemptId: controlRequest.payload.attemptId,
            generation: controlRequest.payload.generation,
            binding: expectedBinding,
            bindingDigest: canonicalDigest(expectedBinding),
            allowedStatuses: [
              'accepted',
              'running',
              'completed',
              'failed',
              'unknown',
              'terminated',
            ],
          },
        ),
    });
    if (
      receipt.payload.terminationConfirmed === true &&
      (receipt.payload.status === 'completed' ||
        receipt.payload.status === 'failed' ||
        receipt.payload.status === 'terminated')
    ) {
      await this.releaseLateTerminalOwners(
        terminalOwnershipKey(
          host.serverId,
          controlRequest.payload.attemptId,
          controlRequest.payload.generation,
        ),
      );
    }
    return receipt;
  }

  /**
   * Issues an authenticated cancellation request to a remote host.
   */
  async cancel(
    host: FleetHost,
    attemptId: string,
    generation: number,
    binding: ExecutionBinding,
    coordinatorId: string,
    coordinatorPrivateKeyInput: string | Buffer,
  ): Promise<SignedWorkerReceipt> {
    return this.control(
      host,
      this.buildControlRequest(
        'cancel',
        host,
        attemptId,
        generation,
        binding,
        coordinatorId,
        coordinatorPrivateKeyInput,
      ),
      binding,
    );
  }

  /**
   * Queries authenticated execution status from a remote host.
   */
  async status(
    host: FleetHost,
    attemptId: string,
    generation: number,
    binding: ExecutionBinding,
    coordinatorId: string,
    coordinatorPrivateKeyInput: string | Buffer,
  ): Promise<SignedWorkerReceipt> {
    return this.control(
      host,
      this.buildControlRequest(
        'status',
        host,
        attemptId,
        generation,
        binding,
        coordinatorId,
        coordinatorPrivateKeyInput,
      ),
      binding,
    );
  }

  private buildControlRequest(
    action: 'status' | 'cancel',
    host: FleetHost,
    attemptId: string,
    generation: number,
    binding: ExecutionBinding,
    coordinatorId: string,
    coordinatorPrivateKeyInput: string | Buffer,
  ): SignedControlRequest {
    const requestId = crypto.randomUUID();
    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + PROTOCOL_LIMITS.MAX_RPC_TIMEOUT_MS;

    return signControlRequest(
      coordinatorId,
      {
        purpose: 'ags-fleet-control-v1',
        requestId,
        attemptId,
        generation,
        action,
        hostId: host.serverId,
        bindingDigest: canonicalDigest(binding),
        expiresAt,
        nonce,
      },
      coordinatorPrivateKeyInput,
    );
  }

  /**
   * Validates that the configured FleetHost has all required paths, keys, and identifiers.
   */
  private validateHostConfig(host: FleetHost): void {
    if (!host || typeof host !== 'object') {
      throw new HarnessError('INVALID_HOST_CONFIG', 'Host must be an object');
    }

    for (const field of [
      'serverId',
      'nodeCommand',
      'cliPath',
      'stateDir',
      'workspaceId',
    ] as const) {
      if (!host[field] || typeof host[field] !== 'string') {
        throw new HarnessError(
          'INVALID_HOST_CONFIG',
          `Host ${field} must be non-empty`,
        );
      }
    }

    if (!host.workerPublicKey || typeof host.workerPublicKey !== 'string') {
      throw new HarnessError(
        'INVALID_HOST_CONFIG',
        'Host workerPublicKey must be configured',
      );
    }

    loadPublicKey(host.workerPublicKey);
  }
  private retainLateTerminal(key: string, owner: LateTerminalOwnership): void {
    const owners = this.lateTerminalOwners.get(key) ?? [];
    if (owners.includes(owner)) return;
    this.lateTerminalOwners.set(key, [...owners, owner]);
  }

  private async releaseLateTerminalOwners(key: string): Promise<void> {
    const owners = this.lateTerminalOwners.get(key);
    if (!owners) return;

    for (const owner of owners) {
      owner.terminalConfirmed = true;
    }
    const retained = owners.filter((owner) => !owner.handle);
    const ready = owners.filter(
      (
        owner,
      ): owner is LateTerminalOwnership & { handle: PaseoSdkTerminalHandle } =>
        owner.handle !== null,
    );
    if (retained.length > 0) {
      this.lateTerminalOwners.set(key, retained);
    } else {
      this.lateTerminalOwners.delete(key);
    }
    for (const owner of ready) {
      await boundedCleanup(() => owner.handle.kill());
      await boundedCleanup(() => owner.routedApi.dispose());
      await boundedCleanup(() => owner.connectedOrigin.api.dispose());
      await boundedCleanup(() => owner.connectedOrigin.driver.close());
    }
  }

  private forgetLateTerminal(key: string, owner: LateTerminalOwnership): void {
    const retained = (this.lateTerminalOwners.get(key) ?? []).filter(
      (entry) => entry !== owner,
    );
    if (retained.length > 0) {
      this.lateTerminalOwners.set(key, retained);
    } else {
      this.lateTerminalOwners.delete(key);
    }
  }

  /**
   * Resolves the verified local daemon origin and authentication material using the
   * authoritative setup configuration, never a hardcoded endpoint.
   */
  private async resolveVerifiedOrigin(
    remainingMs: number,
  ): Promise<VerifiedOrigin> {
    const setup = await new HarnessSetupService(this.store.stateDir).load();
    const resolution = await resolveOriginTarget(
      setup,
      this.execFileFn,
      Math.max(
        1,
        Math.min(DISCOVERY_LIMITS.SUBPROCESS_TIMEOUT_MS, remainingMs),
      ),
    );

    if (!resolution.ok) {
      throw new HarnessError(
        'ORIGIN_UNRESOLVED',
        `Verified Paseo origin could not be resolved: ${resolution.error}`,
      );
    }
    if (
      this.originTarget &&
      normalizeTargetForComparison(this.originTarget) !==
        normalizeTargetForComparison(resolution.value.target)
    ) {
      throw new HarnessError(
        'ORIGIN_UNRESOLVED',
        'Explicit Paseo origin does not match the authenticated configured origin',
      );
    }

    return {
      target: resolution.value.target,
      ...(resolution.value.localCredential
        ? { localCredential: resolution.value.localCredential }
        : {}),
      ...(resolution.value.password
        ? { password: resolution.value.password }
        : {}),
    };
  }

  /**
   * Executes a worker command on a remote Paseo terminal. Capture is bounded by line,
   * byte, and RPC deadline. A terminal is killed only after its signed receipt verifies.
   */
  private async executeRemoteTerminal(
    host: FleetHost,
    argv: string[],
    options: {
      deadline: number;
      ownershipKey: string;
      validate: (capturedText: string) => SignedWorkerReceipt;
    },
  ): Promise<SignedWorkerReceipt> {
    let connectedOrigin: ConnectedPaseoOrigin | null = null;
    let routedApi: PaseoRemoteApi | null = null;
    let terminalHandle: PaseoSdkTerminalHandle | null = null;
    let terminalOwner: LateTerminalOwnership | null = null;
    let safeToKillTerminal = false;
    let preserveLateResources = false;

    try {
      if (options.deadline <= Date.now()) {
        throw new HarnessError(
          'DEADLINE_EXCEEDED',
          'Worker response deadline already elapsed',
        );
      }

      const origin = await this.resolveVerifiedOrigin(
        options.deadline - Date.now(),
      );
      assertBeforeDeadline(options.deadline, 'origin connection');
      const connectOptions: ConnectOriginOptions = {
        connection: origin.target,
        clientId: 'ags-fleet-dispatcher',
        clientType: 'cli',
        connectTimeoutMs: Math.max(
          1,
          Math.min(
            DISCOVERY_LIMITS.CONNECT_TIMEOUT_MS,
            options.deadline - Date.now(),
          ),
        ),
        reconnect: { enabled: false },
        ...(origin.localCredential
          ? { localCredential: () => origin.localCredential ?? null }
          : {}),
        ...(origin.password ? { password: origin.password } : {}),
      };

      assertBeforeDeadline(options.deadline, 'origin connection');
      const connectPromise =
        this.connectionFactory.connectOrigin(connectOptions);
      const lateOrigin: {
        abandoned: boolean;
        cleaned: boolean;
        resolved?: ConnectedPaseoOrigin;
      } = { abandoned: false, cleaned: false };
      const cleanupOriginOnce = async (
        resolved: ConnectedPaseoOrigin,
      ): Promise<void> => {
        if (lateOrigin.cleaned) return;
        lateOrigin.cleaned = true;
        await boundedCleanup(() => resolved.api.dispose());
        await boundedCleanup(() => resolved.driver.close());
      };
      connectPromise.then(
        (lateResolved) => {
          lateOrigin.resolved = lateResolved;
          if (!lateOrigin.abandoned && Date.now() < options.deadline) return;
          lateOrigin.abandoned = true;
          void cleanupOriginOnce(lateResolved);
        },
        () => undefined,
      );
      try {
        const resolvedOrigin = await withRpcDeadline(
          connectPromise,
          options.deadline,
          'CONNECT_FAILED',
        );
        if (Date.now() >= options.deadline) {
          lateOrigin.abandoned = true;
          await cleanupOriginOnce(resolvedOrigin);
          throw new HarnessError(
            'DEADLINE_EXCEEDED',
            'Worker response deadline elapsed during origin connection',
          );
        }
        connectedOrigin = resolvedOrigin;
      } catch (err: unknown) {
        lateOrigin.abandoned = true;
        if (lateOrigin.resolved) await cleanupOriginOnce(lateOrigin.resolved);
        throw err;
      }

      assertBeforeDeadline(options.deadline, 'routed host client');
      const clientPromise = connectedOrigin.api.hosts.client(host.serverId);
      const lateClient: {
        abandoned: boolean;
        cleaned: boolean;
        resolved?: PaseoRemoteApi;
      } = { abandoned: false, cleaned: false };
      const cleanupClientOnce = async (
        resolved: PaseoRemoteApi,
      ): Promise<void> => {
        if (lateClient.cleaned) return;
        lateClient.cleaned = true;
        await boundedCleanup(() => resolved.dispose());
      };
      clientPromise.then(
        (lateResolved) => {
          lateClient.resolved = lateResolved;
          if (!lateClient.abandoned && Date.now() < options.deadline) return;
          lateClient.abandoned = true;
          void cleanupClientOnce(lateResolved);
        },
        () => undefined,
      );
      try {
        const resolvedClient = await withRpcDeadline(
          clientPromise,
          options.deadline,
          'HOST_CLIENT_FAILED',
        );
        if (Date.now() >= options.deadline) {
          lateClient.abandoned = true;
          await cleanupClientOnce(resolvedClient);
          throw new HarnessError(
            'DEADLINE_EXCEEDED',
            'Worker response deadline elapsed during routed client acquisition',
          );
        }
        routedApi = resolvedClient;
      } catch (err: unknown) {
        lateClient.abandoned = true;
        if (lateClient.resolved) await cleanupClientOnce(lateClient.resolved);
        throw err;
      }
      if (!routedApi || !connectedOrigin) {
        throw new HarnessError(
          'ORIGIN_UNRESOLVED',
          'Paseo origin or routed client is unavailable',
        );
      }
      const remoteApi = routedApi;
      const originConnection = connectedOrigin;

      const terminals = remoteApi.terminals;
      if (!terminals || typeof terminals.create !== 'function') {
        throw new HarnessError(
          'SDK_TERMINAL_UNSUPPORTED',
          `Routed host client for "${host.serverId}" exposes no terminal capability`,
        );
      }

      assertBeforeDeadline(options.deadline, 'remote terminal creation');
      const createPromise = terminals.create({
        workspaceId: host.workspaceId,
        command: host.nodeCommand,
        args: argv,
        name: 'ags-fleet-worker',
      });
      const lateTerminal = { abandoned: false, rejected: false };
      const lateOwner: LateTerminalOwnership = {
        handle: null,
        routedApi: remoteApi,
        connectedOrigin: originConnection,
        terminalConfirmed: false,
      };
      terminalOwner = lateOwner;
      createPromise.then(
        (lateHandle) => {
          lateOwner.handle = lateHandle;
          if (!lateTerminal.abandoned && Date.now() < options.deadline) return;
          lateTerminal.abandoned = true;
          preserveLateResources = true;
          this.retainLateTerminal(options.ownershipKey, lateOwner);
          if (lateOwner.terminalConfirmed) {
            void this.releaseLateTerminalOwners(options.ownershipKey);
          }
        },
        () => {
          lateTerminal.rejected = true;
          if (!lateTerminal.abandoned && Date.now() < options.deadline) return;
          lateTerminal.abandoned = true;
          if (!preserveLateResources) return;
          this.forgetLateTerminal(options.ownershipKey, lateOwner);
          void (async () => {
            await boundedCleanup(() => remoteApi.dispose());
            await boundedCleanup(() => originConnection.api.dispose());
            await boundedCleanup(() => originConnection.driver.close());
          })();
        },
      );
      try {
        terminalHandle = await withRpcDeadline(
          createPromise,
          options.deadline,
          'TERMINAL_CREATE_FAILED',
        );
        if (Date.now() >= options.deadline) {
          lateTerminal.abandoned = true;
          preserveLateResources = true;
          lateOwner.handle = terminalHandle;
          this.retainLateTerminal(options.ownershipKey, lateOwner);
          throw new HarnessError(
            'DEADLINE_EXCEEDED',
            'Worker response deadline elapsed during terminal creation',
          );
        }
      } catch (err: unknown) {
        lateTerminal.abandoned = true;
        if (!lateTerminal.rejected) {
          preserveLateResources = true;
          this.retainLateTerminal(options.ownershipKey, lateOwner);
        }
        throw err;
      }

      const pollIntervalMs = 250;
      let cursorLine = 0;
      let captured = '';

      while (Date.now() < options.deadline) {
        const capture: PaseoSdkTerminalCaptureResult = await withRpcDeadline(
          terminalHandle.capture({ start: cursorLine, stripAnsi: true }),
          options.deadline,
          'TERMINAL_CAPTURE_FAILED',
        );

        if (
          capture.totalLines - cursorLine >
          PROTOCOL_LIMITS.MAX_CAPTURE_LINES
        ) {
          // Bounded failure: stop consuming, but never kill owned work we cannot authenticate.
          throw new HarnessError(
            'TERMINAL_OUTPUT_TOO_LARGE',
            `Worker terminal emitted ${capture.totalLines - cursorLine} unread lines, exceeding the bounded capture window`,
          );
        }

        if (capture.lines.length > 0) {
          captured = appendBounded(
            captured,
            capture.lines.join('\n'),
            PROTOCOL_LIMITS.MAX_STDOUT_CAPTURE_BYTES,
          );
          cursorLine = capture.totalLines;
        }

        if (hasCompleteReceiptMarker(captured)) {
          const receipt = options.validate(captured);
          safeToKillTerminal =
            receipt.payload.terminationConfirmed === true &&
            (receipt.payload.status === 'completed' ||
              receipt.payload.status === 'failed' ||
              receipt.payload.status === 'terminated');
          return receipt;
        }

        await sleep(pollIntervalMs);
      }

      throw new HarnessError(
        'REMOTE_RECEIPT_MISSING',
        `Remote worker on host "${host.serverId}" did not emit a verified signed receipt before deadline`,
      );
    } catch (err: unknown) {
      if (err instanceof HarnessError) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new HarnessError(
        'REMOTE_EXECUTION_FAILED',
        `Failed to execute remote worker command on host "${host.serverId}": ${msg}`,
      );
    } finally {
      const finalTerminalHandle = terminalHandle;
      const finalTerminalOwner = terminalOwner;
      const finalRoutedApi = routedApi;
      const finalConnectedOrigin = connectedOrigin;
      if (finalTerminalHandle && safeToKillTerminal) {
        await boundedCleanup(() => finalTerminalHandle.kill());
      } else if (
        finalTerminalHandle &&
        finalTerminalOwner &&
        finalRoutedApi &&
        finalConnectedOrigin
      ) {
        finalTerminalOwner.handle = finalTerminalHandle;
        this.retainLateTerminal(options.ownershipKey, finalTerminalOwner);
        preserveLateResources = true;
      }
      if (!preserveLateResources && finalRoutedApi) {
        await boundedCleanup(() => finalRoutedApi.dispose());
      }
      if (!preserveLateResources && finalConnectedOrigin) {
        await boundedCleanup(() => finalConnectedOrigin.api.dispose());
        await boundedCleanup(() => finalConnectedOrigin.driver.close());
      }
    }
  }
}
function terminalOwnershipKey(
  hostId: string,
  attemptId: string,
  generation: number,
): string {
  return `${hostId}\0${attemptId}\0${generation}`;
}

async function boundedCleanup(operation: () => Promise<void>): Promise<void> {
  const timeout = new Promise<void>((resolve) => {
    setTimeout(resolve, 2000).unref?.();
  });
  await Promise.race([operation().catch(() => undefined), timeout]);
}

function encodeArgvPayload(value: unknown): string {
  const json = canonicalJSON(value);
  const bytes = Buffer.byteLength(json, 'utf8');
  if (bytes > PROTOCOL_LIMITS.MAX_PAYLOAD_BYTES) {
    throw new HarnessError(
      'PAYLOAD_TOO_LARGE',
      `Serialized protocol payload (${bytes} bytes) exceeds the bounded worker transport limit`,
    );
  }
  const encoded = Buffer.from(json, 'utf8').toString('base64');
  if (encoded.length > PROTOCOL_LIMITS.MAX_ARGV_BYTES) {
    throw new HarnessError(
      'PAYLOAD_TOO_LARGE',
      'Encoded worker argument exceeds the bounded argv limit',
    );
  }
  return encoded;
}

function buildWorkerArgv(
  host: FleetHost,
  flag: '--request' | '--control',
  payload: string,
): string[] {
  const argv = [
    host.cliPath,
    'harness',
    'fleet',
    'worker',
    '--state-dir',
    host.stateDir,
    flag,
    payload,
  ];
  const totalBytes = argv.reduce(
    (sum, entry) => sum + Buffer.byteLength(entry, 'utf8'),
    0,
  );
  if (totalBytes > PROTOCOL_LIMITS.MAX_ARGV_BYTES) {
    throw new HarnessError(
      'PAYLOAD_TOO_LARGE',
      'Worker argv exceeds the bounded transport limit',
    );
  }
  return argv;
}

function requireMarker(text: string): SignedWorkerReceipt {
  const receipt = extractReceiptFromStdout(text);
  if (!receipt) {
    throw new HarnessError(
      'REMOTE_RECEIPT_MISSING',
      'Captured terminal output has no receipt marker',
    );
  }
  return receipt;
}

function appendBounded(
  existing: string,
  chunk: string,
  maxBytes: number,
): string {
  const combined = existing + chunk;
  const bytes = Buffer.byteLength(combined, 'utf8');
  if (bytes <= maxBytes) {
    return combined;
  }
  // Keep the bounded tail; markers are emitted at the end of the worker output.
  const buf = Buffer.from(combined, 'utf8');
  return buf.subarray(buf.length - maxBytes).toString('utf8');
}

async function withRpcDeadline<T>(
  promise: Promise<T>,
  deadline: number,
  code: string,
): Promise<T> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    throw new HarnessError(
      'DEADLINE_EXCEEDED',
      `RPC deadline elapsed before ${code}`,
    );
  }
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new HarnessError(
          'RPC_TIMEOUT',
          `RPC ${code} exceeded the remaining bounded deadline`,
        ),
      );
    }, remaining);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
function assertBeforeDeadline(deadline: number, acquisition: string): void {
  if (Date.now() >= deadline) {
    throw new HarnessError(
      'DEADLINE_EXCEEDED',
      `Worker response deadline elapsed before ${acquisition}`,
    );
  }
}
