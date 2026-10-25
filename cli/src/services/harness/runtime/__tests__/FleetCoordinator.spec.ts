import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HarnessDiscoveryService,
  HarnessInventory,
} from '../../HarnessDiscoveryService';
import { HarnessSetupService } from '../../HarnessSetupService';
import { EvidenceService } from '../EvidenceService';
import {
  CoordinatorEvidenceVerifier,
  FleetCoordinator,
  resolveAuthenticatedLocalHost,
} from '../FleetCoordinator';
import { FleetLedger } from '../FleetLedger';
import { FleetPolicyService } from '../FleetPolicyService';
import { FleetRemoteDispatcher } from '../FleetRemoteDispatcher';
import {
  getRuntimeStateReceiptPath,
  getTerminationReceiptPath,
  getWorkerBootId,
  getWorkerCompletionReceiptPath,
  getWorkerTerminationReceiptPath,
  RuntimeStateReceipt,
  WorkerCompletionReceipt,
  WorkerCompletionReceiptSchema,
  WorkerTerminationReceipt,
  WorkerTerminationReceiptSchema,
} from '../LocalSupervisor';
import {
  signControlRequest,
  signExecutionRequest,
  signWorkerReceipt,
  verifyWorkerReceiptSignature,
} from '../remoteWorkerProtocol';
import { OmpExecutionError } from '../OmpSdkExecutor';
import type { ModelWorkerProof, RoleStopProof } from '../SandboxRunner';
import { ReleaseService } from '../ReleaseService';
import { RuntimeStore } from '../RuntimeStore';
import {
  Attempt,
  BudgetEpoch,
  canonicalDigest,
  ExecutionBinding,
  ExecutionContext,
  FleetConfig,
  FleetHost,
  FleetTask,
  FleetRuntimeConfig,
  HarnessBundle,
  HarnessError,
  policyDigest,
  RunResult,
  SignedExecutionRequest,
  SignedWorkerReceipt,
  TerminationEvidence,
  TerminationEvidenceSchema,
} from '../RuntimeTypes';

const SOURCE_REVISION = '0123456789abcdef0123456789abcdef01234567';
function immutableBudgetAuthority(
  epoch: BudgetEpoch | undefined,
): Omit<BudgetEpoch, 'reservedAttempts' | 'reservedToolCalls'> {
  if (!epoch) throw new Error('Expected persisted budget authority');
  return {
    id: epoch.id,
    runId: epoch.runId,
    createdAt: epoch.createdAt,
    deadline: epoch.deadline,
    maxAttempts: epoch.maxAttempts,
    maxConcurrent: epoch.maxConcurrent,
    maxToolCalls: epoch.maxToolCalls,
    policyDigest: epoch.policyDigest,
    policyGeneration: epoch.policyGeneration,
    frozenLimits: epoch.frozenLimits,
  };
}
const RUNTIME_DIGEST = 'a'.repeat(64);

interface RunnerFakeOptions {
  stateDir: string;
  runtime: FleetRuntimeConfig;
  exitCodes: number[];
  omitTaskModelWorkerProof?: boolean;
  workerState?: 'absent' | 'running' | 'unknown';
  modelWorkerProofKind?: 'completion' | 'termination';
  failExecutionOnce?: boolean;
  failOmpOnce?: boolean;
  usageError?: 'complete' | 'incomplete';
  usageErrorCompletionExitCode?: number;
  costUsd?: number | null;
}

function createRunnerFake(options: RunnerFakeOptions) {
  const exitCodes = [...options.exitCodes];
  const executions: Array<{ context: ExecutionContext }> = [];
  let omittedProofConsumed = false;
  let ompFailureConsumed = false;
  let usageSnapshot: OmpExecutionError['usage'];

  const bootId = async (): Promise<string> => getWorkerBootId(options.stateDir);

  const writeFirst = async (
    filePath: string,
    value: unknown,
  ): Promise<void> => {
    await fs.ensureDir(path.dirname(filePath));
    try {
      await fs.writeFile(filePath, JSON.stringify(value), {
        flag: 'wx',
        mode: 0o600,
      });
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
  };

  const ensureRoleReceipts = async (
    context: ExecutionContext,
  ): Promise<{
    evidence: TerminationEvidence;
    runtimeState: RuntimeStateReceipt;
  }> => {
    const workerBootId = await bootId();
    const evidence: TerminationEvidence = {
      attemptId: context.attemptId,
      generation: context.generation,
      confirmed: true,
      observedAt: Date.now(),
      containerIds: [`cid-${context.role}-${context.attemptId.slice(0, 8)}`],
      workerBootId,
    };
    const runtimeState: RuntimeStateReceipt = {
      schemaVersion: 1,
      attemptId: context.attemptId,
      generation: context.generation,
      role: context.role,
      runtimeDigest: context.runtimeDigest,
      image: 'img',
      observedAt: evidence.observedAt,
      instances: [],
      termination: evidence,
    };
    await writeFirst(getTerminationReceiptPath(context), evidence);
    await writeFirst(getRuntimeStateReceiptPath(context), runtimeState);
    const durable = TerminationEvidenceSchema.parse(
      JSON.parse(await fs.readFile(getTerminationReceiptPath(context), 'utf8')),
    );
    const durableRuntimeState = JSON.parse(
      await fs.readFile(getRuntimeStateReceiptPath(context), 'utf8'),
    ) as RuntimeStateReceipt;
    return { evidence: durable, runtimeState: durableRuntimeState };
  };

  const ensureWorkerTermination = async (
    context: ExecutionContext,
  ): Promise<WorkerTerminationReceipt> => {
    const workerBootId = await bootId();
    await writeFirst(getWorkerTerminationReceiptPath(context), {
      schemaVersion: 1,
      attemptId: context.attemptId,
      generation: context.generation,
      role: context.role,
      runtimeDigest: context.runtimeDigest,
      confirmed: true,
      observedAt: Date.now(),
      workerBootId,
      pid: 1234,
      pgid: 1234,
    });
    return WorkerTerminationReceiptSchema.parse(
      JSON.parse(
        await fs.readFile(getWorkerTerminationReceiptPath(context), 'utf8'),
      ),
    );
  };

  const ensureWorkerCompletion = async (
    context: ExecutionContext,
    exitCode = 0,
  ): Promise<WorkerCompletionReceipt> => {
    const workerBootId = await bootId();
    await ensureWorkerTermination(context);
    await writeFirst(getWorkerCompletionReceiptPath(context), {
      schemaVersion: 1,
      attemptId: context.attemptId,
      generation: context.generation,
      role: context.role,
      runtimeDigest: context.runtimeDigest,
      workerAssetSha256: 'b'.repeat(64),
      pid: 1234,
      pgid: 1234,
      exitCode,
      completedAt: Date.now(),
      workerBootId,
    });
    return WorkerCompletionReceiptSchema.parse(
      JSON.parse(
        await fs.readFile(getWorkerCompletionReceiptPath(context), 'utf8'),
      ),
    );
  };

  const runner = {
    runtime: options.runtime,
    doctor: vi.fn(async () => ({ supported: true, reasonCodes: [] })),
    verifyRuntime: vi.fn(async () => undefined),
    validateVerification: vi.fn(() => ({
      ok: true,
      reasonCodes: [] as string[],
    })),
    snapshot: vi.fn(
      async (_root: string, sourceRef: string, destination: string) => {
        await fs.writeFile(
          path.join(destination, 'app.js'),
          '// trusted source\n',
          { flag: 'wx' },
        );
        await fs.writeFile(path.join(destination, 'README.md'), '# project\n', {
          flag: 'wx',
        });
        return sourceRef;
      },
    ),
    prepareEvaluation: vi.fn(
      async (
        snapshotDir: string,
        _deliverableDir: string,
        verification: FleetTask['verification'],
        destination: string,
        _proof: RoleStopProof,
      ) => {
        const workspace = path.join(destination, 'workspace');
        const verifier = path.join(destination, 'verifier');
        await fs.ensureDir(workspace);
        await fs.ensureDir(verifier);
        await fs.copy(snapshotDir, workspace);
        for (const [relative, content] of Object.entries(verification.files)) {
          const target = path.join(verifier, relative);
          await fs.ensureDir(path.dirname(target));
          await fs.writeFile(target, content, { mode: 0o400 });
        }
      },
    ),
    execute: vi.fn(
      async (
        workspace: string,
        _argv: string[],
        execOptions: { context: ExecutionContext },
      ) => {
        executions.push({ context: execOptions.context });
        if (options.failExecutionOnce && executions.length === 1) {
          throw new HarnessError(
            'RUNNER_EXECUTE_FAILED',
            'trusted evaluator backend fault',
          );
        }
        await fs.writeFile(
          path.join(workspace, 'evaluation-output.txt'),
          'verified\n',
        );
        const exitCode = exitCodes.shift() ?? 0;
        return {
          exitCode,
          stdout: exitCode === 0 ? 'PASS' : 'FAIL',
          stderr: '',
        };
      },
    ),
    stopRole: vi.fn(async (context: ExecutionContext) => {
      const { evidence, runtimeState } = await ensureRoleReceipts(context);
      let modelWorker: ModelWorkerProof | null = null;
      if (context.role === 'task') {
        const failedUsage =
          options.usageError !== undefined && ompFailureConsumed;
        if (failedUsage) {
          if (options.usageErrorCompletionExitCode !== undefined) {
            const completion = await ensureWorkerCompletion(
              context,
              options.usageErrorCompletionExitCode,
            );
            modelWorker = {
              kind: 'completion',
              digest: canonicalDigest(completion),
              attemptId: completion.attemptId,
              generation: completion.generation,
              role: 'task',
              runtimeDigest: completion.runtimeDigest,
              workerBootId: completion.workerBootId,
              exitCode: completion.exitCode,
              confirmed: completion.exitCode === 0,
            };
          } else {
            const termination = await ensureWorkerTermination(context);
            modelWorker = {
              kind: 'termination',
              digest: canonicalDigest(termination),
              attemptId: termination.attemptId,
              generation: termination.generation,
              role: 'task',
              runtimeDigest: termination.runtimeDigest,
              workerBootId: termination.workerBootId,
              exitCode: null,
              confirmed: termination.confirmed,
            };
          }
        } else {
          await ensureWorkerCompletion(context);
          if (options.omitTaskModelWorkerProof && !omittedProofConsumed) {
            omittedProofConsumed = true;
          } else {
            const completion = JSON.parse(
              await fs.readFile(
                getWorkerCompletionReceiptPath(context),
                'utf8',
              ),
            ) as {
              attemptId: string;
              generation: number;
              runtimeDigest: string;
              workerBootId: string;
              exitCode: number;
            };
            const termination = await ensureWorkerTermination(context);
            const terminationKind =
              options.modelWorkerProofKind === 'termination';
            modelWorker = {
              kind: terminationKind ? 'termination' : 'completion',
              digest: terminationKind
                ? canonicalDigest(termination)
                : canonicalDigest(completion),
              attemptId: completion.attemptId,
              generation: completion.generation,
              role: 'task',
              runtimeDigest: completion.runtimeDigest,
              workerBootId: completion.workerBootId,
              exitCode: terminationKind ? null : completion.exitCode,
              confirmed: true,
            };
          }
        }
      }
      return {
        context: {
          attemptId: context.attemptId,
          generation: context.generation,
          role: context.role,
          runtimeDigest: context.runtimeDigest,
        },
        termination: evidence,
        runtimeState,
        modelWorker,
        wholeGroupStopped: true,
      };
    }),
    inspectRole: vi.fn(async (context: ExecutionContext) => {
      const { evidence, runtimeState } = await ensureRoleReceipts(context);
      return {
        context: {
          attemptId: context.attemptId,
          generation: context.generation,
          role: context.role,
          runtimeDigest: context.runtimeDigest,
        },
        termination: evidence,
        runtimeState,
        modelWorker: null,
        wholeGroupStopped: true,
      };
    }),
    terminate: vi.fn(async (context: ExecutionContext) => {
      const { evidence } = await ensureRoleReceipts(context);
      return evidence;
    }),
    inspect: vi.fn(async (context: ExecutionContext) => {
      const receiptPath = getTerminationReceiptPath(context);
      if (await fs.pathExists(receiptPath)) {
        return TerminationEvidenceSchema.parse(
          JSON.parse(await fs.readFile(receiptPath, 'utf8')),
        );
      }
      return {
        attemptId: context.attemptId,
        generation: context.generation,
        confirmed: false,
        observedAt: Date.now(),
        containerIds: [],
        workerBootId: await bootId(),
        errorCode: 'NO_OWNED_RECEIPT',
      } satisfies TerminationEvidence;
    }),
  };

  const omp = {
    runtime: options.runtime,
    health: vi.fn(async () => ({ supported: true, reasonCodes: [] })),
    run: vi.fn(
      async (
        _task: FleetTask,
        bundle: HarnessBundle,
        _attempt: Attempt,
        _account: unknown,
        workspace: string,
        ompOptions: { context: ExecutionContext },
      ) => {
        if (options.usageError && !ompFailureConsumed) {
          ompFailureConsumed = true;
          const context = ompOptions.context;
          if (options.usageErrorCompletionExitCode !== undefined) {
            await ensureWorkerCompletion(
              context,
              options.usageErrorCompletionExitCode,
            );
          } else {
            await ensureWorkerTermination(context);
          }
          usageSnapshot = {
            schemaVersion: 1,
            attemptId: context.attemptId,
            generation: context.generation,
            role: context.role,
            runtimeDigest: context.runtimeDigest,
            workerPid: 1234,
            observedAt: Date.now(),
            toolCalls: 3,
            costUsd: null,
            complete: options.usageError === 'complete',
          };
          throw new OmpExecutionError(
            'OMP_WORKER_FAILED',
            'model worker failed',
            usageSnapshot,
          );
        }
        if (options.failOmpOnce && !ompFailureConsumed) {
          ompFailureConsumed = true;
          throw new HarnessError(
            'OMP_WORKER_FAILED',
            'model usage was not reported',
          );
        }
        await fs
          .writeFile(
            path.join(workspace, 'guidance-applied.txt'),
            bundle.guidance,
            {
              flag: 'wx',
            },
          )
          .catch(() => undefined);
        return {
          schemaVersion: 1 as const,
          mode: 'run' as const,
          attemptId: ompOptions.context.attemptId,
          generation: ompOptions.context.generation,
          role: ompOptions.context.role,
          runtimeDigest: ompOptions.context.runtimeDigest,
          text: 'Improved guidance',
          toolCalls: 2,
          costUsd: options.costUsd ?? null,
          transcript: 'restricted-transcript',
        };
      },
    ),
    inspectWorkerRole: vi.fn(async (context: ExecutionContext) => ({
      attemptId: context.attemptId,
      generation: context.generation,
      role: context.role,
      runtimeDigest: context.runtimeDigest,
      workerBootId: await bootId(),
      state: options.workerState ?? ('absent' as const),
      record: null,
      completion: null,
      termination: null,
    })),
    terminateWorker: vi.fn(async () => null),
    readWorkerTermination: vi.fn(async () => null),
  };

  return {
    runner,
    omp,
    executions,
    exitCodes,
    getUsageSnapshot: () => usageSnapshot,
  };
}

function createDispatcherFake(host: FleetHost, hostPrivateKeyPem: string) {
  const outcomes: boolean[] = [];
  const dispatch = vi.fn(
    async (_host: FleetHost, request: SignedExecutionRequest) => {
      const passed = outcomes.length > 0 ? (outcomes.shift() as boolean) : true;
      const binding = request.payload.binding;
      const stage = binding.stage;
      const result: RunResult = {
        attemptId: request.payload.attemptId,
        status: 'completed',
        harnessDigest: binding.harnessDigest,
        sourceRevision: binding.sourceRevision,
        evaluatorDigest: binding.evaluatorDigest,
        passed,
        criticalFailures: passed ? [] : ['REMOTE_VERIFICATION_FAILED'],
        toolCalls: 2,
        durationMs: 10,
        costUsd: null,
        artifactDigest: `remote-artifact-${stage}-${request.payload.attemptId.slice(0, 8)}`,
        binding,
        generation: request.payload.generation,
        projectAuthority: { canonicalRootPath: '/srv/proj-r', stackIds: [] },
      };
      const outputBundle =
        stage === 'proposal' || stage === 'compose'
          ? {
              ...request.payload.bundle,
              id: crypto.randomUUID(),
              guidance: 'remote guidance',
            }
          : undefined;
      return signWorkerReceipt(
        host.serverId,
        {
          purpose: 'ags-fleet-receipt-v1',
          requestId: request.payload.requestId,
          attemptId: request.payload.attemptId,
          generation: request.payload.generation,
          binding,
          workerBootId: 'remote-boot',
          observedAt: Date.now(),
          status: 'completed',
          resultDigest: canonicalDigest(result),
          artifactDigest: result.artifactDigest,
          result,
          ...(outputBundle ? { outputBundle } : {}),
          containerIds: ['remote-container'],
          terminationConfirmed: true,
        },
        hostPrivateKeyPem,
      );
    },
  );

  return {
    dispatcher: {
      dispatch,
      cancel: vi.fn(),
      status: vi.fn(),
      control: vi.fn(),
    },
    dispatch,
    outcomes,
  };
}

describe('FleetCoordinator', () => {
  let tempBaseDir: string;
  let stateDir: string;
  let projectRoot: string;
  let store: RuntimeStore;
  let policyService: FleetPolicyService;
  let ledger: FleetLedger;
  let evidenceService: EvidenceService;
  let releaseService: ReleaseService;
  let config: FleetConfig;

  let coordPubBase64: string;
  let coordPrivPem: string;
  let localPubBase64: string;
  let localPrivPem: string;
  let remotePubBase64: string;
  let remotePrivPem: string;

  let localKeyFile: string;
  let coordKeyFile: string;
  let approverPubBase64: string;

  beforeEach(async () => {
    const coordKeyPair = crypto.generateKeyPairSync('ed25519');
    coordPubBase64 = coordKeyPair.publicKey
      .export({ type: 'spki', format: 'der' })
      .subarray(12)
      .toString('base64');
    coordPrivPem = coordKeyPair.privateKey.export({
      type: 'pkcs8',
      format: 'pem',
    }) as string;

    const localKeyPair = crypto.generateKeyPairSync('ed25519');
    localPubBase64 = localKeyPair.publicKey
      .export({ type: 'spki', format: 'der' })
      .subarray(12)
      .toString('base64');
    localPrivPem = localKeyPair.privateKey.export({
      type: 'pkcs8',
      format: 'pem',
    }) as string;

    const remoteKeyPair = crypto.generateKeyPairSync('ed25519');
    remotePubBase64 = remoteKeyPair.publicKey
      .export({ type: 'spki', format: 'der' })
      .subarray(12)
      .toString('base64');
    remotePrivPem = remoteKeyPair.privateKey.export({
      type: 'pkcs8',
      format: 'pem',
    }) as string;
    const approverKeyPair = crypto.generateKeyPairSync('ed25519');
    approverPubBase64 = approverKeyPair.publicKey
      .export({ type: 'spki', format: 'der' })
      .subarray(12)
      .toString('base64');

    tempBaseDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'ags-coord-test-'),
    );
    stateDir = path.join(tempBaseDir, 'harness-state');
    projectRoot = await fs.realpath(
      await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ags-coord-proj-')),
    );

    const setupService = new HarnessSetupService(stateDir);
    await setupService.setup({
      schemaVersion: 1,
      paseoCommand: '/usr/local/bin/paseo',
      origin: '127.0.0.1:4994',
    });

    localKeyFile = path.join(stateDir, 'host-signing-key.pem');
    await fs.writeFile(localKeyFile, localPrivPem, { mode: 0o600 });
    coordKeyFile = path.join(stateDir, 'coordinator-key.pem');
    await fs.writeFile(coordKeyFile, coordPrivPem, { mode: 0o600 });
    process.env.AGS_COORDINATOR_KEY_FILE = coordKeyFile;

    store = new RuntimeStore(stateDir, setupService);
    policyService = new FleetPolicyService(store);
    const verifier = new CoordinatorEvidenceVerifier(store, policyService);
    ledger = new FleetLedger(store, verifier);
    evidenceService = new EvidenceService(store, ledger);
    releaseService = new ReleaseService(store, policyService);

    config = {
      schemaVersion: 1,
      generation: 1,
      runtime: {
        nodeCommand: '/usr/local/bin/node',
        bunCommand: '/usr/local/bin/bun',
        sdkModule: '/opt/sdk/index.js',
        dockerCommand: '/usr/local/bin/docker',
        image: 'ags-fleet-worker:latest',
        ompVersion: '0.13.0',
        sdkDigest: 'sdk-digest-1',
        gitCommand: '/usr/bin/git',
        manifestFile: '/etc/ags/manifest.json',
        manifestDigest: RUNTIME_DIGEST,
      },
      accounts: [
        {
          id: 'acc-1',
          provider: 'codex',
          model: 'gpt-5.4',
          thinking: 'standard',
          environmentKeys: ['OPENAI_API_KEY'],
          allowedDomains: ['domain-a'],
          allowedProviderEndpoints: ['https://api.openai.com/v1'],
        },
      ],
      domains: [
        {
          id: 'domain-a',
          hostIds: ['host-1', 'host-2'],
          pathPrefixes: [projectRoot, '/srv'],
        },
      ],
      stacks: [],
      rules: [
        {
          id: 'rule-1',
          domain: 'domain-a',
          hostIds: ['*'],
          pathPrefixes: [projectRoot, '/srv'],
          accountId: 'acc-1',
          enabled: true,
          allowModelData: true,
        },
      ],
      projectAliases: [],
      limits: {
        maxConcurrent: 5,
        maxAttempts: 20,
        maxDurationMs: 600000,
        maxToolCalls: 400,
        perHost: 5,
        perProject: 5,
        perAccount: 5,
      },
      coordinators: [{ id: 'coord-1', publicKey: coordPubBase64 }],
      approvers: [{ id: 'approver-1', publicKey: approverPubBase64 }],
      hosts: [
        {
          serverId: 'host-1',
          nodeCommand: '/usr/bin/node',
          cliPath: '/opt/ags/bin/ags.js',
          stateDir,
          workspaceId: 'ws-1',
          workerPublicKey: localPubBase64,
          signingKeyFile: localKeyFile,
        },
        {
          serverId: 'host-2',
          nodeCommand: '/usr/bin/node',
          cliPath: '/opt/ags/bin/ags.js',
          stateDir: '/var/lib/ags/state-2',
          workspaceId: 'ws-2',
          workerPublicKey: remotePubBase64,
          signingKeyFile: path.join(tempBaseDir, 'absent-host-2-key.pem'),
        },
      ],
      evaluation: { minImprovement: 0.1, maxRegressions: 0 },
    };

    await policyService.configure(config);
  });

  function discoveryDouble(
    current: HarnessInventory = inventory(),
  ): HarnessDiscoveryService & { discover: ReturnType<typeof vi.fn> } {
    return {
      discover: vi.fn(async () => current),
    } as unknown as HarnessDiscoveryService & {
      discover: ReturnType<typeof vi.fn>;
    };
  }

  function inventory(
    status: 'reachable' | 'unreachable' = 'reachable',
    checkouts: Array<{ workspaceId: string; path: string }> = [],
  ): HarnessInventory {
    return {
      schemaVersion: 1,
      complete: true,
      hosts: [
        {
          hostKey: 'host-1',
          serverId: 'host-1',
          status,
          projects: [
            {
              projectId: 'proj-1',
              name: 'Project 1',
              path: projectRoot,
              kind: 'repo',
              checkouts,
            },
          ],
        },
        {
          hostKey: 'host-2',
          serverId: 'host-2',
          status: 'reachable',
          projects: [
            {
              projectId: 'proj-r',
              name: 'Remote project',
              path: '/srv/proj-r',
              kind: 'repo',
              checkouts: [],
            },
          ],
        },
      ],
    };
  }

  function createTask(overrides: Partial<FleetTask> = {}): FleetTask {
    return {
      schemaVersion: 1,
      id: 'task-1',
      project: {
        hostId: 'host-1',
        projectId: 'proj-1',
        rootPath: projectRoot,
        logicalProjectId: 'host-1:proj-1',
      },
      sourceRef: SOURCE_REVISION,
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
        argv: ['node', 'test.js'],
        files: { 'test.js': 'true;' },
      },
      toolCallAllowance: 5,
      ...overrides,
    };
  }

  function createRemoteTask(overrides: Partial<FleetTask> = {}): FleetTask {
    return {
      ...createTask(overrides),
      id: 'task-remote',
      project: {
        hostId: 'host-2',
        projectId: 'proj-r',
        rootPath: '/srv/proj-r',
        logicalProjectId: 'host-2:proj-r',
      },
    };
  }

  function buildCoordinator(
    options: {
      exitCodes?: number[];
      omitTaskModelWorkerProof?: boolean;
      workerState?: 'absent' | 'running' | 'unknown';
      modelWorkerProofKind?: 'completion' | 'termination';
      failExecutionOnce?: boolean;
      failOmpOnce?: boolean;
      usageError?: 'complete' | 'incomplete';
      usageErrorCompletionExitCode?: number;
      dispatcher?: Pick<
        FleetRemoteDispatcher,
        'dispatch' | 'status' | 'cancel' | 'control'
      >;
      costUsd?: number | null;
      inventory?: HarnessInventory;
    } = {},
  ) {
    const fake = createRunnerFake({
      stateDir,
      runtime: config.runtime,
      exitCodes: options.exitCodes ?? [0, 0, 0, 0, 0, 0],
      omitTaskModelWorkerProof: options.omitTaskModelWorkerProof,
      workerState: options.workerState,
      modelWorkerProofKind: options.modelWorkerProofKind,
      failExecutionOnce: options.failExecutionOnce,
      failOmpOnce: options.failOmpOnce,
      usageError: options.usageError,
      usageErrorCompletionExitCode: options.usageErrorCompletionExitCode,
      costUsd: options.costUsd,
    });
    const coordinator = new FleetCoordinator(store, {
      policyService,
      ledger,
      evidenceService,
      releaseService,
      runner: fake.runner,
      ompExecutor: fake.omp,
      discoveryService: discoveryDouble(
        options.inventory,
      ) as unknown as HarnessDiscoveryService,
      ...(options.dispatcher
        ? { dispatcher: options.dispatcher as unknown as FleetRemoteDispatcher }
        : {}),
    });
    return { coordinator, fake };
  }

  describe('Executing-host identity', () => {
    it('resolves the local host by signing-key custody, never array order', async () => {
      const identity = await resolveAuthenticatedLocalHost(config);
      expect(identity.hostId).toBe('host-1');
      expect(identity.runtime?.manifestDigest).toBe(RUNTIME_DIGEST);
      expect(identity.reasonCodes).toEqual([]);
    });

    it('reports null identity for a coordinator-only configuration', async () => {
      const coordinatorOnly: FleetConfig = {
        ...config,
        hosts: config.hosts.map((host) => ({
          ...host,
          signingKeyFile: path.join(tempBaseDir, `absent-${host.serverId}.pem`),
        })),
      };
      const identity = await resolveAuthenticatedLocalHost(coordinatorOnly);
      expect(identity.hostId).toBeNull();
      expect(identity.reasonCodes).toContain('LOCAL_HOST_UNIDENTIFIED');
    });
  });

  describe('Doctor and plan', () => {
    it('reports healthy with a local identity and supported runtime', async () => {
      const { coordinator } = buildCoordinator();
      const report = await coordinator.doctor();
      expect(report.supported).toBe(true);
      expect(report.status).toBe('healthy');
      expect(report.localHostId).toBe('host-1');
    });

    it('denies a caller root that differs from the trusted inventory root', async () => {
      const { coordinator } = buildCoordinator();
      const otherRoot = await fs.realpath(
        await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ags-coord-other-')),
      );
      const plan = await coordinator.plan(
        createTask({
          project: {
            hostId: 'host-1',
            projectId: 'proj-1',
            rootPath: otherRoot,
            logicalProjectId: 'host-1:proj-1',
          },
        }),
      );
      expect(plan.ready).toBe(false);
      expect(plan.reasonCodes).toContain('INVENTORY_ROOT_MISMATCH');
    });
    it('authorizes a registered checkout inside a global policy root outside the primary root', async () => {
      const checkoutRoot = path.join(tempBaseDir, 'registered-checkout');
      await fs.ensureDir(checkoutRoot);
      config = {
        ...config,
        generation: config.generation + 1,
        domains: config.domains.map((domain) => ({
          ...domain,
          pathPrefixes: [...domain.pathPrefixes, tempBaseDir],
        })),
        rules: config.rules.map((rule) => ({
          ...rule,
          pathPrefixes: [...rule.pathPrefixes, tempBaseDir],
        })),
      };
      await policyService.configure(config);

      const { coordinator } = buildCoordinator({
        inventory: inventory('reachable', [
          { workspaceId: 'ws-checkout', path: checkoutRoot },
        ]),
      });
      const plan = await coordinator.plan(
        createTask({
          project: {
            hostId: 'host-1',
            projectId: 'proj-1',
            rootPath: checkoutRoot,
            logicalProjectId: 'host-1:proj-1',
          },
        }),
      );

      expect(plan.ready).toBe(true);
      expect(plan.project.rootPath).toBe(await fs.realpath(checkoutRoot));
    });

    it('denies a checkout path associated only with another registered project', async () => {
      const checkoutRoot = path.join(tempBaseDir, 'other-project-checkout');
      await fs.ensureDir(checkoutRoot);
      const current = inventory();
      current.hosts[0].projects.push({
        projectId: 'proj-2',
        name: 'Project 2',
        path: projectRoot,
        kind: 'repo',
        checkouts: [{ workspaceId: 'ws-other', path: checkoutRoot }],
      });
      const { coordinator } = buildCoordinator({ inventory: current });
      const plan = await coordinator.plan(
        createTask({
          project: {
            hostId: 'host-1',
            projectId: 'proj-1',
            rootPath: checkoutRoot,
            logicalProjectId: 'host-1:proj-1',
          },
        }),
      );
      expect(plan.ready).toBe(false);
      expect(plan.reasonCodes).toContain('INVENTORY_ROOT_MISMATCH');
    });

    it('denies replay-unsafe tasks before any admission', async () => {
      const { coordinator } = buildCoordinator();
      const plan = await coordinator.plan(createTask({ replaySafe: false }));
      expect(plan.ready).toBe(false);
      expect(plan.reasonCodes).toContain('REASON_REPLAY_UNSAFE');
      expect(await ledger.list()).toHaveLength(0);
    });

    it('denies an evaluator contract rejected by the runner', async () => {
      const { coordinator, fake } = buildCoordinator();
      fake.runner.validateVerification.mockReturnValue({
        ok: false,
        reasonCodes: ['EVALUATOR_ENTRY_UNTRUSTED'],
      });
      const plan = await coordinator.plan(createTask());
      expect(plan.ready).toBe(false);
      expect(plan.reasonCodes).toContain('EVALUATOR_CONTRACT_INVALID');
    });
  });

  describe('Local training lifecycle', () => {
    it('executes task stages with model-only tool accounting and durable proofs', async () => {
      const { coordinator, fake } = buildCoordinator({ exitCodes: [0, 0] });
      const summary = await coordinator.run(createTask());

      expect(summary.baselinePassed).toBe(true);
      expect(summary.candidatePassed).toBe(true);
      expect(summary.outcome).toBe('candidate_proposed');
      expect(summary.attemptsCount).toBe(3);
      expect(summary.proposedReleaseDigest).toBe(summary.bestDigest);
      // Model tool calls only (2 per model stage, no evaluator increment).
      expect(summary.toolCalls).toBe(6);
      expect(fake.executions.length).toBe(2);

      const attempts = await ledger.list();
      expect(attempts).toHaveLength(3);
      expect(attempts.every((attempt) => attempt.state === 'completed')).toBe(
        true,
      );
      expect(attempts.every((attempt) => attempt.result?.toolCalls === 2)).toBe(
        true,
      );

      for (const attempt of attempts) {
        expect(
          await store.read(`stage-${attempt.id}-${attempt.generation}`, null),
        ).not.toBeNull();
      }
    });

    it('retains the baseline when candidates regress and composes once', async () => {
      const { coordinator } = buildCoordinator({ exitCodes: [0, 1, 1] });
      const summary = await coordinator.run(createTask());
      expect(summary.candidatePassed).toBe(false);
      expect(summary.outcome).toBe('baseline_retained');
      expect(summary.attemptsCount).toBe(5);
      const attempts = await ledger.list();
      expect(attempts.every((attempt) => attempt.state === 'completed')).toBe(
        true,
      );
    });

    it('accounts a missing returned model proof as failed only when independent stop evidence exists', async () => {
      const { coordinator } = buildCoordinator({
        exitCodes: [0],
        omitTaskModelWorkerProof: true,
      });
      await expect(coordinator.run(createTask())).rejects.toMatchObject({
        code: 'MODEL_WORKER_PROOF_REQUIRED',
      });
      const attempts = await ledger.list();
      expect(attempts).toHaveLength(1);
      expect(attempts[0]?.state).toBe('failed');
      expect(attempts[0]?.result?.passed).toBe(false);
      expect(
        attempts.some((attempt) => attempt.binding.stage === 'proposal'),
      ).toBe(false);
    });
    it('settles a failed stage only from complete bound OMP usage', async () => {
      const { coordinator } = buildCoordinator({ usageError: 'complete' });

      await expect(coordinator.run(createTask())).rejects.toMatchObject({
        code: 'OMP_WORKER_FAILED',
      });

      const [attempt] = await ledger.list();
      expect(attempt?.state).toBe('failed');
      expect(attempt?.result?.toolCalls).toBe(3);
      expect(attempt?.result?.costUsd).toBeNull();
    });
    it('settles failed usage with a stopped nonzero completion without treating it as successful proof', async () => {
      const { coordinator } = buildCoordinator({
        usageError: 'complete',
        usageErrorCompletionExitCode: 7,
      });

      await expect(coordinator.run(createTask())).rejects.toMatchObject({
        code: 'OMP_WORKER_FAILED',
      });

      const [attempt] = await ledger.list();
      expect(attempt?.state).toBe('failed');
      expect(attempt?.result?.toolCalls).toBe(3);
      expect(attempt?.result?.passed).toBe(false);
    });

    it('retains incomplete OMP usage privately and keeps its reservation unknown', async () => {
      const { coordinator, fake } = buildCoordinator({
        usageError: 'incomplete',
      });

      await expect(coordinator.run(createTask())).rejects.toMatchObject({
        code: 'OMP_WORKER_FAILED',
      });

      const [attempt] = await ledger.list();
      expect(attempt?.state).toBe('unknown');
      const snapshot = fake.getUsageSnapshot();
      if (!attempt || !snapshot)
        throw new Error('Expected retained incomplete usage evidence');
      expect(
        await store.read(
          `usage-${attempt.id}-${attempt.generation}-${canonicalDigest(snapshot)}`,
          null,
        ),
      ).toEqual(snapshot);
      const report = await coordinator.status();
      expect(report.resources.toolCalls).toBeNull();
      expect(report.resources.costUsd).toBeNull();
    });

    it('aborts on a fatal baseline model error before any proposal admission', async () => {
      const { coordinator, fake } = buildCoordinator({ exitCodes: [0] });
      fake.omp.run.mockRejectedValueOnce(
        new HarnessError(
          'OMP_WORKER_TERMINATION_UNCONFIRMED',
          'group not proven stopped',
        ),
      );
      await expect(coordinator.run(createTask())).rejects.toThrow(HarnessError);
      const attempts = await ledger.list();
      expect(attempts).toHaveLength(1);
      expect(attempts[0]?.binding.stage).toBe('baseline');
      expect(attempts[0]?.state).toBe('unknown');
      expect(fake.omp.run).toHaveBeenCalledTimes(1);
    });

    it('accepts a termination-kind model worker proof corroborated by durable completion', async () => {
      const { coordinator } = buildCoordinator({
        exitCodes: [0, 0],
        modelWorkerProofKind: 'termination',
      });
      const summary = await coordinator.run(createTask());
      expect(summary.candidatePassed).toBe(true);
      const attempts = await ledger.list();
      expect(attempts.every((attempt) => attempt.state === 'completed')).toBe(
        true,
      );
    });

    it('aborts after a fatal evaluator backend fault instead of probing with it', async () => {
      const { coordinator, fake } = buildCoordinator({
        failExecutionOnce: true,
      });
      await expect(coordinator.run(createTask())).rejects.toMatchObject({
        code: 'RUNNER_EXECUTE_FAILED',
      });
      const attempts = await ledger.list();
      expect(attempts).toHaveLength(1);
      expect(attempts[0]?.binding.stage).toBe('baseline');
      // Baseline model call only: no proposer/composer spend on infrastructure failure.
      expect(fake.omp.run).toHaveBeenCalledTimes(1);
      expect(
        (await evidenceService.exportSummaries()).map(
          (summary) => summary.status,
        ),
      ).toEqual(['failed']);
    });
    it('keeps the campaign epoch held when the model worker fails without usage evidence', async () => {
      const { coordinator, fake } = buildCoordinator({ failOmpOnce: true });
      const task = createTask();

      await expect(coordinator.run(task)).rejects.toMatchObject({
        code: 'OMP_WORKER_FAILED',
      });

      const attempts = await ledger.list();
      expect(attempts).toHaveLength(1);
      expect(attempts[0]?.state).toBe('unknown');
      expect(attempts[0]?.result).toBeUndefined();
      expect(fake.omp.run).toHaveBeenCalledTimes(1);
      expect(fake.executions).toHaveLength(0);
    });
  });

  describe('Heldout evaluation', () => {
    async function proposeCandidate(): Promise<string> {
      const bundle: HarnessBundle = {
        schemaVersion: 1,
        id: 'candidate',
        scope: { kind: 'project', key: 'proj-1' },
        guidance: 'Candidate guidance',
        platforms: ['darwin'],
        ompVersions: ['0.13.0'],
      };
      return (await releaseService.propose(bundle)).digest;
    }

    it('allocates IDs internally, freezes one plan and executes both sides', async () => {
      const { coordinator, fake } = buildCoordinator({
        exitCodes: [1, 0],
        costUsd: 0.25,
      });
      const releaseDigest = await proposeCandidate();
      const summary = await (async () => {
        let now = Date.now();
        const clock = vi.spyOn(Date, 'now').mockImplementation(() => now++);
        try {
          return await coordinator.run(createTask({ phase: 'heldout' }), {
            releaseDigest,
          });
        } finally {
          clock.mockRestore();
        }
      })();

      expect(summary.outcome).toBe('evaluation_complete');
      expect(summary.evaluation?.eligible).toBe(true);
      expect(summary.planDigest).toBeDefined();

      const attempts = await ledger.list();
      const planAttempts = attempts.filter(
        (attempt) => attempt.binding.planDigest === summary.planDigest,
      );
      const results = planAttempts.flatMap((attempt) =>
        attempt.result ? [attempt.result] : [],
      );
      expect(planAttempts).toHaveLength(2);
      expect(results).toHaveLength(2);
      expect(results.every((result) => result.costUsd !== null)).toBe(true);
      expect(summary.costUsd).toBe(
        results.reduce((total, result) => total + (result.costUsd ?? 0), 0),
      );
      expect(summary.toolCalls).toBe(
        results.reduce((total, result) => total + result.toolCalls, 0),
      );
      expect(summary.durationMs).toBe(
        results.reduce((total, result) => total + result.durationMs, 0),
      );
      expect(summary.toolCalls).toBeGreaterThan(0);
      expect(summary.durationMs).toBeGreaterThan(0);
      expect(attempts).toHaveLength(2);
      expect(
        attempts.every((attempt) => attempt.binding.stage === 'evaluation'),
      ).toBe(true);
      expect(
        attempts.every(
          (attempt) => attempt.binding.planDigest === summary.planDigest,
        ),
      ).toBe(true);
      expect(
        await store.read(`plan-${summary.planDigest}`, null),
      ).not.toBeNull();
      expect(
        await store.read(`eval-input-${summary.planDigest}`, null),
      ).not.toBeNull();
      expect(fake.executions.length).toBe(2);
    });
    it('reuses the original budget and reports only its measured campaign results on resume', async () => {
      const { coordinator, fake } = buildCoordinator({
        exitCodes: [1, 0],
        costUsd: 0.25,
      });
      const releaseDigest = await proposeCandidate();
      const task = createTask({ phase: 'heldout' });

      const first = await (async () => {
        let now = Date.now();
        const clock = vi.spyOn(Date, 'now').mockImplementation(() => now++);
        try {
          return await coordinator.run(task, { releaseDigest });
        } finally {
          clock.mockRestore();
        }
      })();
      const firstEpoch = await ledger.getBudget(first.budgetId);
      if (!firstEpoch) throw new Error('Expected the original campaign epoch');
      const firstPlanAttempts = (await ledger.list()).filter(
        (attempt) => attempt.binding.planDigest === first.planDigest,
      );
      const firstAttemptIds = firstPlanAttempts.map((attempt) => attempt.id);
      const firstResults = firstPlanAttempts.flatMap((attempt) =>
        attempt.result ? [attempt.result] : [],
      );
      expect(firstPlanAttempts).toHaveLength(2);
      expect(firstResults).toHaveLength(2);
      expect(firstResults.every((result) => result.costUsd !== null)).toBe(
        true,
      );
      const measuredCostUsd = firstResults.reduce(
        (total, result) => total + (result.costUsd ?? 0),
        0,
      );
      const measuredToolCalls = firstResults.reduce(
        (total, result) => total + result.toolCalls,
        0,
      );
      const measuredDurationMs = firstResults.reduce(
        (total, result) => total + result.durationMs,
        0,
      );
      expect(first.toolCalls).toBe(measuredToolCalls);
      expect(first.durationMs).toBe(measuredDurationMs);
      expect(first.toolCalls).toBeGreaterThan(0);
      expect(first.durationMs).toBeGreaterThan(0);
      expect(first.costUsd).toBe(measuredCostUsd);

      const unrelated = await coordinator.run(
        createTask({ id: 'task-unrelated', phase: 'heldout' }),
        { releaseDigest },
      );
      expect(unrelated.planDigest).not.toBe(first.planDigest);
      expect(unrelated.budgetId).not.toBe(first.budgetId);

      const resumed = await coordinator.run(task, { releaseDigest });

      expect(resumed.planDigest).toBe(first.planDigest);
      expect(resumed.runId).toBe(first.runId);
      expect(resumed.budgetId).toBe(first.budgetId);
      expect(resumed.toolCalls).toBe(measuredToolCalls);
      expect(resumed.durationMs).toBe(measuredDurationMs);
      expect(resumed.costUsd).toBe(measuredCostUsd);
      expect(await ledger.getBudget(first.budgetId)).toEqual(firstEpoch);
      const resumedPlanAttempts = (await ledger.list()).filter(
        (attempt) => attempt.binding.planDigest === first.planDigest,
      );
      expect(resumedPlanAttempts.map((attempt) => attempt.id)).toEqual(
        firstAttemptIds,
      );
      expect(resumedPlanAttempts).toHaveLength(2);
      expect(fake.omp.run).toHaveBeenCalledTimes(4);
    });
    it('reports unknown run-summary resources when a referenced attempt has unresolved accounting', async () => {
      const { coordinator, fake } = buildCoordinator({ failOmpOnce: true });
      const releaseDigest = await proposeCandidate();
      const task = createTask({ phase: 'heldout' });

      await expect(
        coordinator.run(task, { releaseDigest }),
      ).rejects.toMatchObject({
        code: 'OMP_WORKER_FAILED',
      });
      const resumed = await coordinator.run(task, { releaseDigest });

      expect(resumed.outcome).toBe('evaluation_complete');
      expect(resumed.toolCalls).toBeNull();
      expect(resumed.durationMs).toBeNull();
      expect(resumed.costUsd).toBeNull();
      const attempts = await ledger.list();
      expect(attempts).toHaveLength(2);
      expect(
        attempts.filter((attempt) => attempt.state === 'unknown'),
      ).toHaveLength(1);
      expect(fake.omp.run).toHaveBeenCalledTimes(2);
    });
    it('resumes a partially completed public heldout run under the original epoch', async () => {
      const { coordinator } = buildCoordinator({ exitCodes: [1, 0] });
      const releaseDigest = await proposeCandidate();
      const task = createTask({ phase: 'heldout' });
      const finishSpy = vi
        .spyOn(ledger, 'finish')
        .mockRejectedValueOnce(
          new HarnessError(
            'SIMULATED_CRASH',
            'crash after outcome persistence',
          ),
        );

      await expect(
        coordinator.run(task, { releaseDigest }),
      ).rejects.toMatchObject({
        code: 'SIMULATED_CRASH',
      });
      finishSpy.mockRestore();
      const budgetsAfterInterruption = await ledger.listBudgets();
      const interruptedEpoch = budgetsAfterInterruption[0];
      if (!interruptedEpoch) throw new Error('Expected original budget epoch');
      const [interruptedAttempt] = await ledger.list();
      if (!interruptedAttempt)
        throw new Error('Expected an admitted heldout attempt');
      const input = await store.read<{
        planDigest: string;
        runId: string;
        budgetId: string;
      } | null>(`eval-input-${interruptedAttempt.binding.planDigest}`, null);

      const resumed = await coordinator.run(task, { releaseDigest });

      if (!input) throw new Error('Expected persisted evaluation input');
      expect(resumed.planDigest).toBe(input.planDigest);
      expect(resumed.runId).toBe(input.runId);
      expect(resumed.budgetId).toBe(input.budgetId);
      const resumedEpoch = (await ledger.listBudgets())[0];
      expect(immutableBudgetAuthority(resumedEpoch)).toEqual(
        immutableBudgetAuthority(interruptedEpoch),
      );
      expect(resumedEpoch?.reservedAttempts).toBe(
        interruptedEpoch.reservedAttempts + 1,
      );
      expect(resumedEpoch?.reservedToolCalls).toBe(
        interruptedEpoch.reservedToolCalls + 5,
      );
      const frozenPlan = await store.read<{
        baselineDigest: string;
        releaseDigest: string;
        cases: Array<{ baselineAttemptId: string; candidateAttemptId: string }>;
      } | null>(`plan-${input.planDigest}`, null);
      if (!frozenPlan) throw new Error('Expected the frozen resumed plan');
      const plannedAttemptIds = new Set(
        frozenPlan.cases.flatMap((entry) => [
          entry.baselineAttemptId,
          entry.candidateAttemptId,
        ]),
      );
      const resumedAttempts = await ledger.list();
      expect(resumedAttempts).toHaveLength(2);
      expect(new Set(resumedAttempts.map((attempt) => attempt.id))).toEqual(
        plannedAttemptIds,
      );
      expect(new Set(resumedAttempts.map((attempt) => attempt.id)).size).toBe(
        resumedAttempts.length,
      );
      expect(
        resumedAttempts.every(
          (attempt) =>
            attempt.binding.phase === 'heldout' &&
            attempt.binding.stage === 'evaluation',
        ),
      ).toBe(true);
      for (const entry of frozenPlan.cases) {
        const baselineAttempt = resumedAttempts.find(
          (attempt) => attempt.id === entry.baselineAttemptId,
        );
        const candidateAttempt = resumedAttempts.find(
          (attempt) => attempt.id === entry.candidateAttemptId,
        );
        expect(baselineAttempt?.binding.harnessDigest).toBe(
          frozenPlan.baselineDigest,
        );
        expect(candidateAttempt?.binding.harnessDigest).toBe(
          frozenPlan.releaseDigest,
        );
      }
    });

    it('previews representative evaluation read-only and executes on request', async () => {
      const { coordinator } = buildCoordinator({ exitCodes: [1, 0, 0, 0] });
      const releaseDigest = await proposeCandidate();
      const input = {
        schemaVersion: 1 as const,
        id: 'eval-1',
        tasks: [
          createTask({ id: 't-a', phase: 'heldout' }),
          createTask({ id: 't-b', phase: 'heldout' }),
        ],
        releaseDigest,
      };

      const preview = await coordinator.evaluateTasks(input);
      expect(preview.mode).toBe('preview');
      expect(preview.draft).toBe(true);
      expect(preview.cases).toHaveLength(2);
      // Draft: no authoritative plan digest and no attempt identifiers.
      expect(preview.planDigest).toBeUndefined();
      expect(preview.draftDigest).toBeDefined();
      const draftDigest = preview.draftDigest;
      if (!draftDigest)
        throw new Error('Expected a non-authoritative draft digest');
      expect(
        preview.cases.every(
          (entry) =>
            entry.caseId === undefined &&
            entry.baselineAttemptId === undefined &&
            entry.candidateAttemptId === undefined,
        ),
      ).toBe(true);
      expect(await ledger.list()).toHaveLength(0);
      expect(await ledger.listBudgets()).toHaveLength(0);
      expect(
        await store.read(`evaluation-intent-${draftDigest}`, null),
      ).toBeNull();
      expect(await store.read(`plan-${draftDigest}`, null)).toBeNull();

      const executed = await coordinator.evaluateTasks(input, {
        execute: true,
      });
      expect(executed.mode).toBe('executed');
      expect(executed.planDigest).toBeDefined();
      expect(executed.planDigest).not.toBe(preview.draftDigest);
      expect(
        executed.cases.every((entry) => entry.baselineAttemptId !== undefined),
      ).toBe(true);
      expect(executed.evaluation?.eligible).toBe(true);
      expect(executed.attemptsSummary).toHaveLength(2);
      expect(await ledger.list()).toHaveLength(4);
    });
    it('reuses the committed plan intent and epoch after input creation but before plan freeze', async () => {
      const { coordinator } = buildCoordinator({ exitCodes: [1, 0] });
      const releaseDigest = await proposeCandidate();
      const input = {
        schemaVersion: 1 as const,
        id: 'eval-repair-plan-freeze',
        tasks: [createTask({ id: 't-plan-freeze', phase: 'heldout' })],
        releaseDigest,
      };
      const preview = await coordinator.evaluateTasks(input);
      const freezeSpy = vi
        .spyOn(evidenceService, 'freezePlan')
        .mockRejectedValueOnce(
          new HarnessError(
            'SIMULATED_CRASH',
            'crash before frozen-plan persistence',
          ),
        );

      await expect(
        coordinator.evaluateTasks(input, { execute: true }),
      ).rejects.toMatchObject({
        code: 'SIMULATED_CRASH',
      });
      freezeSpy.mockRestore();
      const intent = await store.read<{
        planDigest: string;
        epoch: {
          kind: 'new';
          request: {
            id: string;
            runId: string;
            createdAt: number;
            deadline: number;
          };
        };
      } | null>(`evaluation-intent-${preview.draftDigest}`, null);
      if (!intent) throw new Error('Expected the committed evaluation intent');
      const budgetBeforeResume = await ledger.listBudgets();
      expect(budgetBeforeResume).toHaveLength(1);
      expect(
        await store.read(`eval-input-${intent.planDigest}`, null),
      ).not.toBeNull();
      expect(await store.read(`plan-${intent.planDigest}`, null)).toBeNull();

      const resumed = await coordinator.evaluateTasks(input, { execute: true });
      expect(resumed.planDigest).toBe(intent.planDigest);
      const budgetAfterResume = await ledger.listBudgets();
      expect(budgetAfterResume.map(immutableBudgetAuthority)).toEqual(
        budgetBeforeResume.map(immutableBudgetAuthority),
      );
      expect(budgetAfterResume[0]?.reservedAttempts).toBe(
        (budgetBeforeResume[0]?.reservedAttempts ?? 0) + 2,
      );
      expect(budgetAfterResume[0]?.reservedToolCalls).toBe(
        (budgetBeforeResume[0]?.reservedToolCalls ?? 0) + 10,
      );
      expect(
        await store.read(`plan-${intent.planDigest}`, null),
      ).not.toBeNull();
      expect(await ledger.list()).toHaveLength(2);
    });

    it('retries an uncreated epoch from the original durable intent request', async () => {
      const { coordinator } = buildCoordinator({ exitCodes: [1, 0] });
      const releaseDigest = await proposeCandidate();
      const input = {
        schemaVersion: 1 as const,
        id: 'eval-repair-budget-create',
        tasks: [createTask({ id: 't-budget-create', phase: 'heldout' })],
        releaseDigest,
      };
      const preview = await coordinator.evaluateTasks(input);
      const createBudgetSpy = vi
        .spyOn(ledger, 'createBudget')
        .mockRejectedValueOnce(
          new HarnessError('SIMULATED_CRASH', 'crash after intent commit'),
        );

      await expect(
        coordinator.evaluateTasks(input, { execute: true }),
      ).rejects.toMatchObject({
        code: 'SIMULATED_CRASH',
      });
      const intent = await store.read<{
        epoch: {
          kind: 'new';
          request: {
            id: string;
            runId: string;
            createdAt: number;
            deadline: number;
          };
        };
      } | null>(`evaluation-intent-${preview.draftDigest}`, null);
      if (!intent) throw new Error('Expected the committed evaluation intent');
      const originalRequest = { ...intent.epoch.request };
      expect(await ledger.listBudgets()).toHaveLength(0);

      const resumed = await coordinator.evaluateTasks(input, { execute: true });
      createBudgetSpy.mockRestore();
      const createdEpoch = await ledger.getBudget(originalRequest.id);
      expect(resumed.planDigest).toBeDefined();
      expect(createdEpoch).toMatchObject(originalRequest);
      expect(await ledger.listBudgets()).toHaveLength(1);
    });
    it('denies retry when the original uncreated epoch deadline has expired', async () => {
      const { coordinator } = buildCoordinator();
      const releaseDigest = await proposeCandidate();
      const input = {
        schemaVersion: 1 as const,
        id: 'eval-expired-intent',
        tasks: [createTask({ id: 't-expired-intent', phase: 'heldout' })],
        releaseDigest,
      };
      const preview = await coordinator.evaluateTasks(input);
      const createBudgetSpy = vi
        .spyOn(ledger, 'createBudget')
        .mockRejectedValueOnce(
          new HarnessError('SIMULATED_CRASH', 'crash after intent commit'),
        );
      await expect(
        coordinator.evaluateTasks(input, { execute: true }),
      ).rejects.toMatchObject({
        code: 'SIMULATED_CRASH',
      });
      createBudgetSpy.mockRestore();
      const intent = await store.read<{
        epoch: {
          kind: 'new';
          request: { id: string; runId: string; deadline: number };
        };
      } | null>(`evaluation-intent-${preview.draftDigest}`, null);
      if (!intent) throw new Error('Expected the committed evaluation intent');

      const clock = vi
        .spyOn(Date, 'now')
        .mockReturnValue(intent.epoch.request.deadline);
      try {
        await expect(
          coordinator.evaluateTasks(input, { execute: true }),
        ).rejects.toMatchObject({
          code: 'PLAN_EPOCH_EXPIRED',
        });
      } finally {
        clock.mockRestore();
      }
      expect(await ledger.listBudgets()).toHaveLength(0);
    });
    it('serializes concurrent executions onto one immutable plan intent and budget epoch', async () => {
      const { coordinator } = buildCoordinator({ exitCodes: [1, 0] });
      const releaseDigest = await proposeCandidate();
      const input = {
        schemaVersion: 1 as const,
        id: 'eval-concurrent-intent',
        tasks: [createTask({ id: 't-concurrent-intent', phase: 'heldout' })],
        releaseDigest,
      };
      const preview = await coordinator.evaluateTasks(input);
      const results = await Promise.allSettled([
        coordinator.evaluateTasks(input, { execute: true }),
        coordinator.evaluateTasks(input, { execute: true }),
      ]);
      expect(results.some((result) => result.status === 'fulfilled')).toBe(
        true,
      );

      const intent = await store.read<{
        planDigest: string;
        plan: {
          cases: Array<{
            id: string;
            baselineAttemptId: string;
            candidateAttemptId: string;
          }>;
        };
        epoch:
          | { kind: 'existing'; runId: string; budgetId: string }
          | {
              kind: 'new';
              request: {
                id: string;
                runId: string;
                createdAt: number;
                deadline: number;
              };
            };
      } | null>(`evaluation-intent-${preview.draftDigest}`, null);
      if (!intent || intent.epoch.kind !== 'new') {
        throw new Error('Expected one persisted new-epoch intent');
      }
      const budgets = await ledger.listBudgets();
      expect(budgets).toHaveLength(1);
      expect(budgets[0]).toMatchObject({
        id: intent.epoch.request.id,
        runId: intent.epoch.request.runId,
        createdAt: intent.epoch.request.createdAt,
        deadline: intent.epoch.request.deadline,
      });
      const expectedAttemptIds = new Set(
        intent.plan.cases.flatMap((entry) => [
          entry.baselineAttemptId,
          entry.candidateAttemptId,
        ]),
      );
      expect(
        (await ledger.list()).every((attempt) =>
          expectedAttemptIds.has(attempt.id),
        ),
      ).toBe(true);
    });

    it('allocates fresh attempt pairs for a new evaluation of identical tasks', async () => {
      const { coordinator } = buildCoordinator({ exitCodes: [1, 0, 1, 0] });
      const releaseDigest = await proposeCandidate();
      const tasks = [createTask({ id: 't-same', phase: 'heldout' })];
      const first = await coordinator.evaluateTasks(
        { schemaVersion: 1, id: 'eval-before-canary', tasks, releaseDigest },
        { execute: true },
      );
      const second = await coordinator.evaluateTasks(
        { schemaVersion: 1, id: 'eval-after-canary', tasks, releaseDigest },
        { execute: true },
      );
      const firstIds = first.cases.flatMap((entry) => [
        entry.caseId,
        entry.baselineAttemptId,
        entry.candidateAttemptId,
      ]);
      const secondIds = second.cases.flatMap((entry) => [
        entry.caseId,
        entry.baselineAttemptId,
        entry.candidateAttemptId,
      ]);
      const uuidV4 =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(
        firstIds.every((id) => typeof id === 'string' && uuidV4.test(id)),
      ).toBe(true);
      expect(
        secondIds.every((id) => typeof id === 'string' && uuidV4.test(id)),
      ).toBe(true);
      expect(new Set(firstIds).size).toBe(firstIds.length);
      expect(new Set(secondIds).size).toBe(secondIds.length);
      expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
      expect(await ledger.list()).toHaveLength(4);
      expect(second.evaluation?.eligible).toBe(true);
    });

    it('rejects a representative set with mismatched baseline bundles', async () => {
      const { coordinator } = buildCoordinator();
      const releaseDigest = await proposeCandidate();
      await expect(
        coordinator.evaluateTasks({
          schemaVersion: 1,
          id: 'eval-bad',
          tasks: [
            createTask({ id: 't-a', phase: 'heldout' }),
            createTask({
              id: 't-b',
              phase: 'heldout',
              baseline: {
                ...createTask().baseline,
                guidance: 'different baseline',
              },
            }),
          ],
          releaseDigest,
        }),
      ).rejects.toMatchObject({ code: 'HELDOUT_BASELINE_DIGEST_MISMATCH' });
    });

    it('resumes an existing plan without duplicating paid attempts', async () => {
      const { coordinator } = buildCoordinator({ exitCodes: [1, 0] });
      const releaseDigest = await proposeCandidate();
      const input = {
        schemaVersion: 1 as const,
        id: 'eval-resume',
        tasks: [createTask({ id: 't-resume', phase: 'heldout' })],
        releaseDigest,
      };
      const task = input.tasks[0]!;
      const first = await coordinator.evaluateTasks(input, { execute: true });
      const attemptsAfterFirst = await ledger.list();
      const originalEpoch = (await ledger.listBudgets())[0];
      expect(originalEpoch).toBeDefined();

      const publicResume = await coordinator.evaluateTasks(input, {
        execute: true,
      });
      expect(publicResume.planDigest).toBe(first.planDigest);
      expect(publicResume.cases).toEqual(first.cases);
      expect(await ledger.list()).toHaveLength(attemptsAfterFirst.length);
      expect(
        (await ledger.listBudgets()).map(immutableBudgetAuthority),
      ).toEqual([immutableBudgetAuthority(originalEpoch)]);
      await expect(
        coordinator.evaluateTasks(
          { ...input, budgetId: crypto.randomUUID() },
          { execute: true },
        ),
      ).rejects.toMatchObject({ code: 'PLAN_EPOCH_CONFLICT' });
      expect(
        (await ledger.listBudgets()).map(immutableBudgetAuthority),
      ).toEqual([immutableBudgetAuthority(originalEpoch)]);

      const firstPlanDigest = first.planDigest;
      if (!firstPlanDigest) throw new Error('Expected an executed plan digest');
      const plannedCase = first.cases[0];
      if (!plannedCase?.baselineAttemptId || !plannedCase.candidateAttemptId) {
        throw new Error('Expected both frozen attempt roles');
      }
      await expect(
        coordinator.run(task, {
          releaseDigest,
          plannedAttemptId: plannedCase.baselineAttemptId,
        }),
      ).rejects.toMatchObject({ code: 'PLAN_DIGEST_REQUIRED_FOR_ATTEMPT_IDS' });
      await expect(
        coordinator.run(task, {
          planDigest: firstPlanDigest,
          plannedAttemptId: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject({ code: 'PLANNED_ATTEMPT_ID_CONFLICT' });
      const callerMatchedResume = await coordinator.run(task, {
        planDigest: firstPlanDigest,
        plannedAttemptId: plannedCase.baselineAttemptId,
        candidateAttemptId: plannedCase.candidateAttemptId,
      });
      expect(callerMatchedResume.planDigest).toBe(firstPlanDigest);
      const second = await coordinator.evaluatePlan(firstPlanDigest, {
        execute: true,
      });
      expect(second.planDigest).toBe(firstPlanDigest);
      expect(second.plan.cases.map((entry) => entry.baselineAttemptId)).toEqual(
        first.cases.map((entry) => entry.baselineAttemptId),
      );
      expect(await ledger.list()).toHaveLength(attemptsAfterFirst.length);
      // Resume never creates a replacement epoch.
      expect(await ledger.listBudgets()).toHaveLength(1);

      // A caller-chosen foreign epoch is refused rather than silently replenishing authority.
      await expect(
        coordinator.run(createTask({ phase: 'heldout' }), {
          planDigest: first.planDigest,
          budgetId: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject({ code: 'PLAN_EPOCH_CONFLICT' });
    });

    it('denies plan execution without persisted input', async () => {
      const { coordinator } = buildCoordinator();
      const releaseDigest = await proposeCandidate();
      const task = createTask({ id: 't-mi', phase: 'heldout' });
      const taskDigest = canonicalDigest(task);
      const plan = {
        schemaVersion: 1 as const,
        id: 'eval-missing-input',
        releaseDigest,
        baselineDigest: canonicalDigest(task.baseline),
        policyDigest: policyDigest(config),
        runtimeDigest: canonicalDigest({
          'host-1': config.runtime.manifestDigest,
        }),
        requiredProjects: ['host-1:proj-1'],
        minImprovement: config.evaluation.minImprovement,
        maxRegressions: config.evaluation.maxRegressions,
        cases: [
          {
            id: crypto.randomUUID(),
            taskDigest,
            hostId: 'host-1',
            projectId: 'proj-1',
            logicalProjectId: 'host-1:proj-1',
            accountId: 'acc-1',
            sourceRevision: SOURCE_REVISION,
            evaluatorDigest: canonicalDigest(task.verification),
            runtimeDigest: config.runtime.manifestDigest,
            baselineAttemptId: crypto.randomUUID(),
            candidateAttemptId: crypto.randomUUID(),
          },
        ],
      };
      const { digest } = await evidenceService.freezePlan(plan);
      await expect(
        coordinator.evaluatePlan(digest, { execute: true }),
      ).rejects.toMatchObject({ code: 'PLAN_INPUT_NOT_FOUND' });
    });
  });

  describe('Remote stages and signed plan transport', () => {
    it('uses the most-specific remote domain and rule and denies conflicting equal-specificity rules', async () => {
      config = {
        ...config,
        generation: config.generation + 1,
        accounts: [
          ...config.accounts,
          {
            ...config.accounts[0]!,
            id: 'acc-remote-specific',
            allowedDomains: ['domain-remote-specific'],
          },
        ],
        domains: [
          ...config.domains,
          {
            id: 'domain-remote-specific',
            hostIds: ['host-2'],
            pathPrefixes: ['/srv/proj-r'],
          },
        ],
        rules: [
          {
            id: 'rule-remote-broad',
            domain: 'domain-a',
            hostIds: ['host-2'],
            pathPrefixes: ['/srv'],
            accountId: 'acc-1',
            enabled: true,
            allowModelData: false,
          },
          {
            id: 'rule-remote-specific',
            domain: 'domain-remote-specific',
            hostIds: ['host-2'],
            pathPrefixes: ['/srv/proj-r'],
            accountId: 'acc-remote-specific',
            enabled: true,
            allowModelData: true,
          },
        ],
      };
      await policyService.configure(config);
      let { coordinator } = buildCoordinator();
      const task = createRemoteTask();
      expect((await coordinator.plan(task)).ready).toBe(true);

      config = {
        ...config,
        generation: config.generation + 1,
        domains: config.domains.filter((domain) => domain.id === 'domain-a'),
        rules: [
          {
            id: 'rule-remote-broad',
            domain: 'domain-a',
            hostIds: ['host-2'],
            pathPrefixes: ['/srv'],
            accountId: 'acc-1',
            enabled: true,
            allowModelData: true,
          },
          {
            id: 'rule-remote-specific-allow',
            domain: 'domain-a',
            hostIds: ['host-2'],
            pathPrefixes: ['/srv/proj-r'],
            accountId: 'acc-1',
            enabled: true,
            allowModelData: true,
          },
          {
            id: 'rule-remote-specific-deny',
            domain: 'domain-a',
            hostIds: ['host-2'],
            pathPrefixes: ['/srv/proj-r'],
            accountId: 'acc-1',
            enabled: true,
            allowModelData: false,
          },
        ],
      };
      await policyService.configure(config);
      ({ coordinator } = buildCoordinator());
      const denied = await coordinator.plan(task);
      expect(denied.ready).toBe(false);
      expect(denied.reasonCodes).toContain('AMBIGUOUS_RULE');
    });
    it('recovers a lost failed remote result with signed usage and evidence without redispatch', async () => {
      const host = config.hosts.find((entry) => entry.serverId === 'host-2')!;
      let originalRequest: SignedExecutionRequest | undefined;
      const dispatch = vi.fn(
        async (_host: FleetHost, request: SignedExecutionRequest) => {
          originalRequest = request;
          return signWorkerReceipt(
            host.serverId,
            {
              purpose: 'ags-fleet-receipt-v1',
              requestId: request.payload.requestId,
              attemptId: request.payload.attemptId,
              generation: request.payload.generation,
              binding: request.payload.binding,
              workerBootId: 'remote-boot',
              observedAt: Date.now(),
              status: 'unknown',
              containerIds: [],
            },
            remotePrivPem,
          );
        },
      );
      const status = vi.fn(async () => {
        if (!originalRequest)
          throw new Error('Expected the original dispatched request');
        const { payload } = originalRequest;
        const result: RunResult = {
          attemptId: payload.attemptId,
          status: 'failed',
          harnessDigest: payload.binding.harnessDigest,
          sourceRevision: payload.binding.sourceRevision,
          evaluatorDigest: payload.binding.evaluatorDigest,
          passed: false,
          criticalFailures: ['REMOTE_MODEL_FAILURE'],
          toolCalls: 2,
          durationMs: 12,
          costUsd: null,
          artifactDigest: canonicalDigest({ remoteFailure: payload.attemptId }),
          errorCode: 'REMOTE_MODEL_FAILURE',
          binding: payload.binding,
          generation: payload.generation,
        };
        return signWorkerReceipt(
          host.serverId,
          {
            purpose: 'ags-fleet-receipt-v1',
            requestId: crypto.randomUUID(),
            attemptId: payload.attemptId,
            generation: payload.generation,
            binding: payload.binding,
            workerBootId: 'remote-boot',
            observedAt: Date.now(),
            status: 'failed',
            resultDigest: canonicalDigest(result),
            artifactDigest: result.artifactDigest,
            result,
            containerIds: ['remote-container'],
            terminationConfirmed: true,
          },
          remotePrivPem,
        );
      });
      const { coordinator } = buildCoordinator({
        dispatcher: { dispatch, status, cancel: vi.fn(), control: vi.fn() },
      });

      await expect(coordinator.run(createRemoteTask())).rejects.toMatchObject({
        code: 'REMOTE_STAGE_UNKNOWN',
      });
      expect(await ledger.list()).toHaveLength(1);
      const reconciled = await coordinator.reconcile();

      expect(reconciled.recoveredAttempts).toBe(1);
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(status).toHaveBeenCalledTimes(1);
      const [attempt] = await ledger.list();
      expect(attempt?.state).toBe('failed');
      expect(attempt?.result?.toolCalls).toBe(2);
      expect(await evidenceService.exportSummaries()).toHaveLength(1);
    });
    it('executes remote heldout sides with the frozen plan in the signed request', async () => {
      const remoteHost = config.hosts.find(
        (host) => host.serverId === 'host-2',
      )!;
      const fakeDispatcher = createDispatcherFake(remoteHost, remotePrivPem);
      fakeDispatcher.outcomes.push(false, true);
      const { coordinator } = buildCoordinator({
        dispatcher: fakeDispatcher.dispatcher,
      });

      const candidate: HarnessBundle = {
        schemaVersion: 1,
        id: 'remote-candidate',
        scope: { kind: 'project', key: 'proj-r' },
        guidance: 'Remote candidate guidance',
        platforms: ['linux'],
        ompVersions: ['0.13.0'],
      };
      const { digest: releaseDigest } = await releaseService.propose(candidate);

      const summary = await coordinator.run(
        createRemoteTask({ phase: 'heldout' }),
        {
          releaseDigest,
        },
      );

      expect(summary.outcome).toBe('evaluation_complete');
      expect(fakeDispatcher.dispatch).toHaveBeenCalledTimes(2);
      for (const call of fakeDispatcher.dispatch.mock.calls) {
        const request = call[1] as SignedExecutionRequest;
        expect(request.payload.evaluationPlan).toBeDefined();
        expect(canonicalDigest(request.payload.evaluationPlan)).toBe(
          request.payload.binding.planDigest,
        );
      }
      const attempts = await ledger.list();
      expect(attempts).toHaveLength(2);
      expect(attempts.every((attempt) => attempt.state === 'completed')).toBe(
        true,
      );
    });

    it('runs the remote propose/probe sequence and keeps only the signed output bundle', async () => {
      const remoteHost = config.hosts.find(
        (host) => host.serverId === 'host-2',
      )!;
      const fakeDispatcher = createDispatcherFake(remoteHost, remotePrivPem);
      fakeDispatcher.outcomes.push(false, true);
      const { coordinator } = buildCoordinator({
        dispatcher: fakeDispatcher.dispatcher,
      });

      const summary = await coordinator.run(createRemoteTask());
      expect(summary.outcome).toBe('candidate_proposed');
      expect(summary.attemptsCount).toBe(3);
      expect(fakeDispatcher.dispatch).toHaveBeenCalledTimes(3);

      const proposalCall = fakeDispatcher.dispatch.mock.calls.find(
        (call) =>
          (call[1] as SignedExecutionRequest).payload.binding.stage ===
          'proposal',
      );
      expect(proposalCall).toBeDefined();
      const proposalRequest = proposalCall![1] as SignedExecutionRequest;
      expect(proposalRequest.payload.evaluationPlan).toBeUndefined();

      const probeCall = fakeDispatcher.dispatch.mock.calls.find(
        (call) =>
          (call[1] as SignedExecutionRequest).payload.binding.stage === 'probe',
      );
      const probeRequest = probeCall![1] as SignedExecutionRequest;
      expect(probeRequest.payload.bundle.guidance).toBe('remote guidance');
    });

    it('rejects a remote output bundle that changes admitted scope metadata', async () => {
      const remoteHost = config.hosts.find(
        (host) => host.serverId === 'host-2',
      )!;
      const fakeDispatcher = createDispatcherFake(remoteHost, remotePrivPem);
      const originalDispatch = fakeDispatcher.dispatcher.dispatch;
      fakeDispatcher.dispatcher.dispatch = vi.fn(
        async (host: FleetHost, request: SignedExecutionRequest) => {
          const receipt = await originalDispatch(host, request);
          if (request.payload.binding.stage === 'proposal') {
            const mutated: SignedWorkerReceipt = {
              ...receipt,
              payload: {
                ...receipt.payload,
                outputBundle: {
                  ...receipt.payload.outputBundle!,
                  scope: { kind: 'fleet', key: '*' },
                },
              },
            };
            return signWorkerReceipt(
              host.serverId,
              mutated.payload,
              remotePrivPem,
            );
          }
          return receipt;
        },
      );
      const { coordinator } = buildCoordinator({
        dispatcher: fakeDispatcher.dispatcher,
      });

      await expect(coordinator.run(createRemoteTask())).rejects.toMatchObject({
        code: 'CANDIDATE_SCOPE_MUTATED',
      });
    });
  });

  describe('Cancellation, reconciliation and status', () => {
    async function reserveLocalAttempt(): Promise<Attempt> {
      const task = createTask();
      const now = Date.now();
      await ledger.createBudget(
        {
          id: 'budget-cancel',
          runId: 'run-cancel',
          createdAt: now - 1000,
          deadline: now + 60000,
          maxAttempts: 5,
          maxConcurrent: 2,
          maxToolCalls: 20,
        },
        config,
      );
      const binding: ExecutionBinding = {
        runId: 'run-cancel',
        budgetId: 'budget-cancel',
        taskDigest: canonicalDigest(task),
        hostId: 'host-1',
        projectId: 'proj-1',
        logicalProjectId: 'host-1:proj-1',
        domain: 'domain-a',
        accountId: 'acc-1',
        provider: 'codex',
        model: 'gpt-5.4',
        sourceRevision: SOURCE_REVISION,
        harnessDigest: canonicalDigest(task.baseline),
        evaluatorDigest: canonicalDigest(task.verification),
        runtimeDigest: RUNTIME_DIGEST,
        policyDigest: policyDigest(config),
        phase: 'train',
        stage: 'baseline',
        planDigest: 'plan-digest-1',
      };
      return ledger.reserve(task, 'acc-1', config, binding);
    }

    it('fences a cancelled attempt only with dual-role and model-worker proof', async () => {
      const { coordinator } = buildCoordinator();
      const attempt = await reserveLocalAttempt();
      const result = await coordinator.cancel(attempt.id);
      expect(result.status).toBe('terminated');
      expect((await ledger.getAttempt(attempt.id))?.state).toBe('fenced');
    });
    it('executes one authenticated cancel for a replayed control payload', async () => {
      const { coordinator, fake } = buildCoordinator();
      const attempt = await reserveLocalAttempt();
      const control = signControlRequest(
        'coord-1',
        {
          purpose: 'ags-fleet-control-v1',
          requestId: crypto.randomUUID(),
          attemptId: attempt.id,
          generation: attempt.generation,
          action: 'cancel',
          hostId: attempt.hostId,
          bindingDigest: canonicalDigest(attempt.binding),
          expiresAt: Date.now() + 30000,
          nonce: crypto.randomBytes(8).toString('hex'),
        },
        coordPrivPem,
      );
      const encoded = Buffer.from(JSON.stringify(control)).toString('base64');

      const first = await coordinator.handleRemoteControl(encoded);
      const replay = await coordinator.handleRemoteControl(encoded);

      for (const receipt of [first, replay]) {
        expect(verifyWorkerReceiptSignature(receipt, localPubBase64)).toBe(
          true,
        );
        expect(receipt.hostId).toBe('host-1');
        expect(receipt.payload.requestId).toBe(control.payload.requestId);
        expect(receipt.payload.attemptId).toBe(attempt.id);
        expect(receipt.payload.generation).toBe(attempt.generation);
        expect(canonicalDigest(receipt.payload.binding)).toBe(
          control.payload.bindingDigest,
        );
        expect(receipt.payload.status).toBe('terminated');
        expect(receipt.payload.terminationConfirmed).toBe(true);
      }
      expect(replay.payload.result).toEqual(first.payload.result);
      expect(replay.payload.resultDigest).toBe(first.payload.resultDigest);
      expect(replay.payload.containerIds).toEqual(first.payload.containerIds);
      expect(fake.omp.terminateWorker).toHaveBeenCalledTimes(1);
    });
    it('denies a second control owner for an attempt while the first owner is live', async () => {
      const { coordinator, fake } = buildCoordinator();
      const attempt = await reserveLocalAttempt();
      const first = signControlRequest(
        'coord-1',
        {
          purpose: 'ags-fleet-control-v1',
          requestId: crypto.randomUUID(),
          attemptId: attempt.id,
          generation: attempt.generation,
          action: 'cancel',
          hostId: attempt.hostId,
          bindingDigest: canonicalDigest(attempt.binding),
          expiresAt: Date.now() + 30000,
          nonce: crypto.randomBytes(8).toString('hex'),
        },
        coordPrivPem,
      );
      const second = signControlRequest(
        'coord-1',
        {
          ...first.payload,
          requestId: crypto.randomUUID(),
          nonce: crypto.randomBytes(8).toString('hex'),
        },
        coordPrivPem,
      );
      const ownerBootId = await getWorkerBootId(stateDir);
      await store.write('remote-control-state', {
        requests: {
          [first.payload.requestId]: {
            nonce: first.payload.nonce,
            payloadDigest: canonicalDigest(first.payload),
            attemptId: attempt.id,
            phase: 'executing',
            ownerPid: process.pid,
            ownerBootId,
          },
        },
        nonces: { [first.payload.nonce]: first.payload.requestId },
      });

      await expect(
        coordinator.handleRemoteControl(
          Buffer.from(JSON.stringify(second)).toString('base64'),
        ),
      ).rejects.toMatchObject({ code: 'CONTROL_ALREADY_ACTIVE' });
      expect(fake.omp.terminateWorker).not.toHaveBeenCalled();
    });

    it('keeps a live worker attempt active during reconciliation', async () => {
      const { coordinator } = buildCoordinator({ workerState: 'running' });
      const attempt = await reserveLocalAttempt();
      const result = await coordinator.reconcile();
      expect(result.activeAttempts).toBe(1);
      expect(result.fencedAttempts).toBe(0);
      expect((await ledger.getAttempt(attempt.id))?.state).toBe('admitted');
    });

    it('recovers a durably completed stage that crashed before ledger settlement', async () => {
      const { coordinator } = buildCoordinator({ exitCodes: [0] });
      const finishSpy = vi
        .spyOn(ledger, 'finish')
        .mockRejectedValueOnce(
          new HarnessError('SIMULATED_CRASH', 'crash before settle'),
        );
      await expect(coordinator.run(createTask())).rejects.toThrow();
      finishSpy.mockRestore();

      const attempts = await ledger.list();
      expect(attempts).toHaveLength(1);
      expect(attempts[0]?.state).not.toBe('completed');
      expect(
        await store.read(
          `outcome-${attempts[0]!.id}-${attempts[0]!.generation}`,
          null,
        ),
      ).not.toBeNull();

      const result = await coordinator.reconcile();
      expect(result.recoveredAttempts).toBe(1);
      const recovered = await ledger.getAttempt(attempts[0]!.id);
      expect(recovered?.state).toBe('completed');
      expect(recovered?.result?.status).toBe('completed');
    });
    it('repairs evidence after the ledger committed a terminal result', async () => {
      const { coordinator } = buildCoordinator({ exitCodes: [0] });
      const recordSpy = vi
        .spyOn(evidenceService, 'record')
        .mockRejectedValueOnce(
          new HarnessError('SIMULATED_CRASH', 'crash before evidence write'),
        );

      await expect(coordinator.run(createTask())).rejects.toMatchObject({
        code: 'SIMULATED_CRASH',
      });
      recordSpy.mockRestore();

      const [attempt] = await ledger.list();
      expect(attempt?.state).toBe('completed');
      expect(await evidenceService.exportSummaries()).toHaveLength(0);

      const reconciled = await coordinator.reconcile();
      expect(reconciled.recoveredAttempts).toBe(1);
      expect(await evidenceService.exportSummaries()).toHaveLength(1);
    });

    it('reports persisted budget epochs honestly', async () => {
      const { coordinator } = buildCoordinator();
      await reserveLocalAttempt();
      const report = await coordinator.status();
      expect(report.budgets.epochsCount).toBe(1);
      expect(report.attempts.admitted).toBe(1);
      expect(report.resources.toolCalls).toBeNull();
      expect(report.resources.costUsd).toBeNull();
    });
  });

  describe('Remote worker ingress', () => {
    function createSignedRequest(
      task: FleetTask,
      overrides: Partial<SignedExecutionRequest['payload']> = {},
    ): SignedExecutionRequest {
      const now = Date.now();
      const budget: BudgetEpoch = {
        id: 'budget-worker',
        runId: 'run-worker',
        createdAt: now - 1000,
        deadline: now + 60000,
        maxAttempts: 10,
        maxConcurrent: 4,
        maxToolCalls: 200,
        reservedAttempts: 0,
        reservedToolCalls: 0,
        policyDigest: policyDigest(config),
        policyGeneration: 1,
        frozenLimits: {
          maxAttempts: 10,
          maxConcurrent: 4,
          maxToolCalls: 200,
          maxDurationMs: 60000,
          perHost: 4,
          perProject: 4,
          perAccount: 4,
        },
      };
      const binding: ExecutionBinding = {
        runId: 'run-worker',
        budgetId: 'budget-worker',
        taskDigest: canonicalDigest(task),
        hostId: 'host-1',
        projectId: 'proj-1',
        logicalProjectId: 'host-1:proj-1',
        domain: 'domain-a',
        accountId: 'acc-1',
        provider: 'codex',
        model: 'gpt-5.4',
        sourceRevision: task.sourceRef,
        harnessDigest: canonicalDigest(task.baseline),
        evaluatorDigest: canonicalDigest(task.verification),
        runtimeDigest: RUNTIME_DIGEST,
        policyDigest: policyDigest(config),
        phase: 'train',
        stage: 'baseline',
        planDigest: 'plan-digest-1',
      };
      return signExecutionRequest(
        'coord-1',
        {
          purpose: 'ags-fleet-execute-v1',
          requestId: crypto.randomUUID(),
          attemptId: crypto.randomUUID(),
          generation: 1,
          binding,
          budget,
          hostId: 'host-1',
          expiresAt: now + 60000,
          nonce: crypto.randomBytes(8).toString('hex'),
          task,
          bundle: task.baseline,
          ...overrides,
        },
        coordPrivPem,
      );
    }

    it('preserves signed identity and replays the durable terminal receipt', async () => {
      const { coordinator, fake } = buildCoordinator({ exitCodes: [0] });
      const request = createSignedRequest(createTask());
      const encoded = Buffer.from(JSON.stringify(request)).toString('base64');

      const receipt = await coordinator.handleRemoteRequest(encoded);
      expect(receipt.payload.attemptId).toBe(request.payload.attemptId);
      expect(receipt.payload.status).toBe('completed');
      expect(receipt.payload.result?.passed).toBe(true);

      const replay = await coordinator.handleRemoteRequest(encoded);
      expect(replay.payload.attemptId).toBe(request.payload.attemptId);
      expect(replay.payload.status).toBe('completed');
      expect(fake.executions).toHaveLength(1);
    });
    it('does not recover a replay while its recorded admission owner is live', async () => {
      const { coordinator } = buildCoordinator();
      const request = createSignedRequest(createTask());
      const encoded = Buffer.from(JSON.stringify(request)).toString('base64');
      const ownerBootId = await getWorkerBootId(stateDir);
      await store.write('remote-request-state', {
        requests: {
          [request.payload.requestId]: {
            nonce: request.payload.nonce,
            payloadDigest: canonicalDigest(request.payload),
            attemptId: request.payload.attemptId,
            generation: request.payload.generation,
            acceptedAt: Date.now(),
            status: 'accepted',
            phase: 'admission',
            receiptName: `accepted-${request.payload.requestId}`,
            ownerPid: process.pid,
            ownerBootId,
          },
        },
        nonces: { [request.payload.nonce]: request.payload.requestId },
      });

      await expect(
        coordinator.handleRemoteRequest(encoded),
      ).rejects.toMatchObject({
        code: 'REQUEST_IN_PROGRESS',
      });
      expect(await ledger.getAttempt(request.payload.attemptId)).toBeNull();
    });

    it('recovers a dead admission owner under the original request', async () => {
      const { coordinator, fake } = buildCoordinator({ exitCodes: [0] });
      const request = createSignedRequest(createTask());
      const encoded = Buffer.from(JSON.stringify(request)).toString('base64');
      const ownerBootId = await getWorkerBootId(stateDir);
      await store.write('remote-request-state', {
        requests: {
          [request.payload.requestId]: {
            nonce: request.payload.nonce,
            payloadDigest: canonicalDigest(request.payload),
            attemptId: request.payload.attemptId,
            generation: request.payload.generation,
            acceptedAt: Date.now(),
            status: 'accepted',
            phase: 'admission',
            receiptName: `accepted-${request.payload.requestId}`,
            ownerPid: 2_147_483_647,
            ownerBootId,
          },
        },
        nonces: { [request.payload.nonce]: request.payload.requestId },
      });

      const receipt = await coordinator.handleRemoteRequest(encoded);

      expect(receipt.payload.status).toBe('completed');
      expect(receipt.payload.requestId).toBe(request.payload.requestId);
      expect(fake.executions).toHaveLength(1);
    });
    it('launches one admitted attempt after recovering its dead admission owner', async () => {
      const { coordinator, fake } = buildCoordinator({ exitCodes: [0] });
      const request = createSignedRequest(createTask());
      const encoded = Buffer.from(JSON.stringify(request)).toString('base64');
      const {
        id,
        runId,
        createdAt,
        deadline,
        maxAttempts,
        maxConcurrent,
        maxToolCalls,
      } = request.payload.budget;
      await ledger.createBudget(
        {
          id,
          runId,
          createdAt,
          deadline,
          maxAttempts,
          maxConcurrent,
          maxToolCalls,
        },
        config,
      );
      await ledger.reserve(
        request.payload.task,
        request.payload.binding.accountId,
        config,
        request.payload.binding,
        request.payload.attemptId,
      );
      const ownerBootId = await getWorkerBootId(stateDir);
      await store.write('remote-request-state', {
        requests: {
          [request.payload.requestId]: {
            nonce: request.payload.nonce,
            payloadDigest: canonicalDigest(request.payload),
            attemptId: request.payload.attemptId,
            generation: request.payload.generation,
            acceptedAt: Date.now(),
            status: 'accepted',
            phase: 'admission',
            receiptName: `accepted-${request.payload.requestId}`,
            ownerPid: 2_147_483_647,
            ownerBootId,
          },
        },
        nonces: { [request.payload.nonce]: request.payload.requestId },
      });

      const receipt = await coordinator.handleRemoteRequest(encoded);

      expect(receipt.payload.status).toBe('completed');
      expect(receipt.payload.attemptId).toBe(request.payload.attemptId);
      expect(fake.executions).toHaveLength(1);
      expect(await ledger.getAttempt(request.payload.attemptId)).toMatchObject({
        id: request.payload.attemptId,
        state: 'completed',
      });
    });

    it('recovers a worker outcome after its ledger finish was interrupted without rerunning', async () => {
      const { coordinator, fake } = buildCoordinator({ exitCodes: [0] });
      const request = createSignedRequest(createTask());
      const encoded = Buffer.from(JSON.stringify(request)).toString('base64');
      const finishSpy = vi
        .spyOn(ledger, 'finish')
        .mockRejectedValueOnce(
          new HarnessError(
            'SIMULATED_CRASH',
            'worker crashed before ledger finish',
          ),
        );

      const interrupted = await coordinator.handleRemoteRequest(encoded);
      expect(interrupted.payload.status).toBe('unknown');
      finishSpy.mockRestore();

      const recovered = await coordinator.handleRemoteRequest(encoded);
      expect(recovered.payload.status).toBe('completed');
      expect(recovered.payload.result?.passed).toBe(true);
      expect(fake.executions).toHaveLength(1);
    });

    it('recovers the persisted proposal bundle through an authenticated status replay', async () => {
      const { coordinator } = buildCoordinator();
      const task = createTask();
      const baseRequest = createSignedRequest(task);
      const request = signExecutionRequest(
        'coord-1',
        {
          ...baseRequest.payload,
          binding: { ...baseRequest.payload.binding, stage: 'proposal' },
        },
        coordPrivPem,
      );
      const encodedRequest = Buffer.from(JSON.stringify(request)).toString(
        'base64',
      );
      const executionReceipt =
        await coordinator.handleRemoteRequest(encodedRequest);
      expect(executionReceipt.payload.status).toBe('completed');
      expect(executionReceipt.payload.outputBundle?.guidance).toBe(
        'Improved guidance',
      );

      const attempt = await ledger.getAttempt(request.payload.attemptId);
      if (!attempt)
        throw new Error('Expected the proposal attempt to be retained');
      const control = signControlRequest(
        'coord-1',
        {
          purpose: 'ags-fleet-control-v1',
          requestId: crypto.randomUUID(),
          attemptId: attempt.id,
          generation: attempt.generation,
          action: 'status',
          hostId: 'host-1',
          bindingDigest: canonicalDigest(attempt.binding),
          expiresAt: Date.now() + 30000,
          nonce: crypto.randomBytes(8).toString('hex'),
        },
        coordPrivPem,
      );
      const encodedControl = Buffer.from(JSON.stringify(control)).toString(
        'base64',
      );
      const statusReceipt =
        await coordinator.handleRemoteControl(encodedControl);
      expect(statusReceipt.payload.status).toBe('completed');
      expect(statusReceipt.payload.outputBundle?.guidance).toBe(
        'Improved guidance',
      );
      expect(statusReceipt.payload.outputBundle?.scope).toEqual(
        task.baseline.scope,
      );

      const replay = await coordinator.handleRemoteControl(encodedControl);
      expect(replay.payload.outputBundle).toEqual(
        statusReceipt.payload.outputBundle,
      );
    });

    it('records a deterministic denial and returns it on retry', async () => {
      const { coordinator } = buildCoordinator();
      const otherRoot = await fs.realpath(
        await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ags-coord-badroot-')),
      );
      const task = createTask({
        project: {
          hostId: 'host-1',
          projectId: 'proj-1',
          rootPath: otherRoot,
          logicalProjectId: 'host-1:proj-1',
        },
      });
      const request = createSignedRequest(task);
      const encoded = Buffer.from(JSON.stringify(request)).toString('base64');

      await expect(
        coordinator.handleRemoteRequest(encoded),
      ).rejects.toMatchObject({
        code: 'INVENTORY_ROOT_MISMATCH',
      });
      await expect(
        coordinator.handleRemoteRequest(encoded),
      ).rejects.toMatchObject({
        code: 'INVENTORY_ROOT_MISMATCH',
      });
      expect(await ledger.list()).toHaveLength(0);
    });

    it('durably denies capacity failures instead of retrying consumed requests', async () => {
      const { coordinator } = buildCoordinator();
      const reserve = vi
        .spyOn(ledger, 'reserve')
        .mockRejectedValue(
          new HarnessError('CONCURRENT_LIMIT', 'capacity is full'),
        );
      const encoded = Buffer.from(
        JSON.stringify(createSignedRequest(createTask())),
      ).toString('base64');

      await expect(
        coordinator.handleRemoteRequest(encoded),
      ).rejects.toMatchObject({
        code: 'CONCURRENT_LIMIT',
      });
      await expect(
        coordinator.handleRemoteRequest(encoded),
      ).rejects.toMatchObject({
        code: 'CONCURRENT_LIMIT',
      });
      expect(reserve).toHaveBeenCalledTimes(1);
      expect(await ledger.list()).toHaveLength(0);
    });

    it('rejects a reused nonce under a different request identity', async () => {
      const { coordinator } = buildCoordinator({ exitCodes: [0] });
      const first = createSignedRequest(createTask());
      await coordinator.handleRemoteRequest(
        Buffer.from(JSON.stringify(first)).toString('base64'),
      );
      const second = createSignedRequest(createTask(), {
        requestId: crypto.randomUUID(),
        nonce: first.payload.nonce,
      });
      expect(second.payload.requestId).not.toBe(first.payload.requestId);
      await expect(
        coordinator.handleRemoteRequest(
          Buffer.from(JSON.stringify(second)).toString('base64'),
        ),
      ).rejects.toMatchObject({ code: 'NONCE_REPLAY' });
    });

    it('rejects stale and future control generations before side effects', async () => {
      const { coordinator } = buildCoordinator();
      const request = createSignedRequest(createTask());
      await coordinator.handleRemoteRequest(
        Buffer.from(JSON.stringify(request)).toString('base64'),
      );
      const attempt = (await ledger.list())[0];

      const control = (generation: number) =>
        signControlRequest(
          'coord-1',
          {
            purpose: 'ags-fleet-control-v1',
            requestId: crypto.randomUUID(),
            attemptId: attempt.id,
            generation,
            action: 'cancel',
            hostId: 'host-1',
            bindingDigest: canonicalDigest(attempt.binding),
            expiresAt: Date.now() + 30000,
            nonce: crypto.randomBytes(8).toString('hex'),
          },
          coordPrivPem,
        );

      const future = control(attempt.generation + 1);
      const encodedFuture = Buffer.from(JSON.stringify(future)).toString(
        'base64',
      );
      await expect(
        coordinator.handleRemoteControl(encodedFuture),
      ).rejects.toMatchObject({
        code: 'FUTURE_GENERATION',
      });
      await expect(
        coordinator.handleRemoteControl(encodedFuture),
      ).rejects.toMatchObject({
        code: 'FUTURE_GENERATION',
      });
    });
  });
});
