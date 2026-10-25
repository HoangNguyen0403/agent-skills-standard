import { execFile as nodeExecFile, spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs-extra';
import nodeFs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import {
  getSupervisorAsset,
  LIFECYCLE_LOCK_TIMEOUT_MS,
  SUPERVISOR_POLL_INTERVAL_MS,
  SUPERVISOR_READY_TIMEOUT_MS,
} from './RunnerAssets';
import { getSandboxUser } from './RuntimeManifest';
import {
  ExecutionContext,
  HarnessError,
  TerminationEvidence,
  TerminationEvidenceSchema,
} from './RuntimeTypes';

const DOCKER_RPC_TIMEOUT_MS = 15000;
const ATTACH_EXTRA_TIMEOUT_MS = 15000;
const SUPERVISOR_DONE_WAIT_MS = 5000;
const SAFE_COMMAND_ENV: NodeJS.ProcessEnv = {
  PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  LC_ALL: 'C',
  LANG: 'C',
};

/**
 * Docker's State object contains many fields; only these two are authoritative here.
 * A shape that is not exactly observable state must never be interpreted as "stopped".
 */
const ContainerStateSchema = z.object({
  Running: z.boolean(),
  ExitCode: z.number().int(),
});

export const CONTAINER_LABELS = {
  attemptId: 'ags.fleet.attemptId',
  generation: 'ags.fleet.generation',
  role: 'ags.fleet.role',
  runtimeDigest: 'ags.fleet.runtimeDigest',
  instance: 'ags.fleet.instance',
  managedBy: 'ags.fleet.managedBy',
} as const;

export const MANAGED_BY_LABEL = 'ags-fleet-sandbox-runner';

export interface ContainerInstanceRecord {
  schemaVersion: 1;
  attemptId: string;
  generation: number;
  role: 'task' | 'evaluator';
  runtimeDigest: string;
  instanceId: string;
  containerName: string;
  containerId?: string;
  image: string;
  status:
    'intent' | 'created' | 'running' | 'exited' | 'terminated' | 'unknown';
  deadline: number;
  createdAt: number;
  updatedAt: number;
}

export interface InstanceTerminalEvidence {
  attemptId: string;
  generation: number;
  role: 'task' | 'evaluator';
  instanceId: string;
  confirmed: boolean;
  observedAt: number;
  containerIds: string[];
  errorCode?: string;
  workerBootId: string;
}

export interface RuntimeStateReceipt {
  schemaVersion: 1;
  attemptId: string;
  generation: number;
  role: 'task' | 'evaluator';
  runtimeDigest: string;
  image: string;
  observedAt: number;
  instances: Array<{
    instanceId: string;
    containerId: string | null;
    image: string;
    confirmed: boolean;
    errorCode?: string;
  }>;
  termination: TerminationEvidence;
}

export const WorkerTerminationReceiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: z.string().uuid(),
    generation: z.number().int().positive(),
    role: z.enum(['task', 'evaluator']),
    runtimeDigest: z.string().regex(/^[a-f0-9]{64}$/),
    confirmed: z.boolean(),
    observedAt: z.number().int().positive(),
    workerBootId: z.string().min(1).max(256),
    pid: z.number().int().nonnegative(),
    pgid: z.number().int().nonnegative(),
    errorCode: z.string().min(1).max(256).optional(),
  })
  .strict();

export type WorkerTerminationReceipt = z.infer<
  typeof WorkerTerminationReceiptSchema
>;

export interface WorkerCompletionReceipt {
  schemaVersion: 1;
  attemptId: string;
  generation: number;
  role: 'task' | 'evaluator';
  runtimeDigest: string;
  workerAssetSha256: string;
  pid: number;
  pgid: number;
  exitCode: number;
  completedAt: number;
  workerBootId: string;
}
export const WorkerCompletionReceiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: z.string().uuid(),
    generation: z.number().int().positive(),
    role: z.enum(['task', 'evaluator']),
    runtimeDigest: z.string().regex(/^[a-f0-9]{64}$/),
    workerAssetSha256: z.string().regex(/^[a-f0-9]{64}$/),
    pid: z.number().int().positive(),
    pgid: z.number().int().positive(),
    exitCode: z.number().int(),
    completedAt: z.number().int().positive(),
    workerBootId: z.string().min(1).max(256),
  })
  .strict();
export const WorkerProcessRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: z.string().uuid(),
    generation: z.number().int().positive(),
    role: z.enum(['task', 'evaluator']),
    runtimeDigest: z.string().regex(/^[a-f0-9]{64}$/),
    launchNonce: z.string().regex(/^[a-f0-9]{64}$/),
    pid: z.number().int().positive(),
    pgid: z.number().int().positive(),
    workerStartTime: z.string().min(1).max(64),
    workerScriptPath: z.string().min(1).max(4096),
    workerAssetSha256: z.string().regex(/^[a-f0-9]{64}$/),
    jobFilePath: z.string().min(1).max(4096),
    releaseFilePath: z.string().min(1).max(4096),
    deadline: z.number().int().positive(),
    createdAt: z.number().int().positive(),
  })
  .strict();
export type WorkerProcessRecord = z.infer<typeof WorkerProcessRecordSchema>;
export const WorkerLaunchIntentSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: z.string().uuid(),
    generation: z.number().int().positive(),
    role: z.enum(['task', 'evaluator']),
    runtimeDigest: z.string().regex(/^[a-f0-9]{64}$/),
    launchNonce: z.string().regex(/^[a-f0-9]{64}$/),
    workerBootId: z.string().min(1).max(256),
    workerScriptPath: z.string().min(1).max(4096),
    workerAssetSha256: z.string().regex(/^[a-f0-9]{64}$/),
    jobFilePath: z.string().min(1).max(4096),
    releaseFilePath: z.string().min(1).max(4096),
    deadline: z.number().int().positive(),
    record: WorkerProcessRecordSchema.nullable(),
    createdAt: z.number().int().positive(),
  })
  .strict();
export type WorkerLaunchIntent = z.infer<typeof WorkerLaunchIntentSchema>;
export interface WorkerRoleState {
  attemptId: string;
  generation: number;
  role: 'task' | 'evaluator';
  runtimeDigest: string;
  workerBootId: string;
  state: 'absent' | 'running' | 'unknown';
  record: WorkerProcessRecord | null;
  completion: WorkerCompletionReceipt | null;
  termination: WorkerTerminationReceipt | null;
}

export interface ReadonlyMount {
  hostPath: string;
  containerPath: string;
}

export type ProcessObservation =
  | { state: 'running'; startTime: string; command: string }
  | { state: 'absent'; startTime: ''; command: '' }
  | { state: 'unknown'; startTime: ''; command: '' };

interface DockerResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  error: string;
}

export interface OwnedInspection {
  state: 'running' | 'stopped' | 'foreign' | 'unknown';
  detail: string;
}

export interface AttachResult {
  stdout: string;
  stderr: string;
  truncated: boolean;
  attachExitCode: number;
  attachTimedOut: boolean;
}

function instanceFilePrefix(context: ExecutionContext): string {
  return `instance-${context.attemptId}-${context.generation}-${context.role}-`;
}

function getContainerName(
  context: ExecutionContext,
  instanceId: string,
): string {
  return `ags-fleet-task-${context.attemptId}-${context.generation}-${context.role}-${instanceId}`;
}

export function getContainerLabels(
  context: ExecutionContext,
  instanceId: string,
): Record<string, string> {
  return {
    [CONTAINER_LABELS.attemptId]: context.attemptId,
    [CONTAINER_LABELS.generation]: String(context.generation),
    [CONTAINER_LABELS.role]: context.role,
    [CONTAINER_LABELS.runtimeDigest]: context.runtimeDigest,
    [CONTAINER_LABELS.instance]: instanceId,
    [CONTAINER_LABELS.managedBy]: MANAGED_BY_LABEL,
  };
}

export function getInstanceRecordPath(
  context: ExecutionContext,
  instanceId: string,
): string {
  return path.join(
    context.stateDir,
    `${instanceFilePrefix(context)}${instanceId}.json`,
  );
}

export function getInstanceEvidencePath(
  context: ExecutionContext,
  instanceId: string,
): string {
  return path.join(
    context.stateDir,
    `instance-termination-${context.attemptId}-${context.generation}-${context.role}-${instanceId}.json`,
  );
}

export function getFencePath(context: ExecutionContext): string {
  return path.join(
    context.stateDir,
    `fence-${context.attemptId}-${context.generation}-${context.role}.json`,
  );
}

export function getLifecycleLockPath(context: ExecutionContext): string {
  return path.join(
    context.stateDir,
    `lifecycle-${context.attemptId}-${context.generation}-${context.role}.lock`,
  );
}

/** Strict TerminationEvidence receipt handed to the ledger's runtime verifier. */
export function getTerminationReceiptPath(context: ExecutionContext): string {
  return path.join(
    context.stateDir,
    `termination-${context.attemptId}-${context.generation}-${context.role}.json`,
  );
}

/** Richer owned runtime-state receipt correlating container identity and image. */
export function getRuntimeStateReceiptPath(context: ExecutionContext): string {
  return path.join(
    context.stateDir,
    `runtime-state-${context.attemptId}-${context.generation}-${context.role}.json`,
  );
}

export function getWorkerRecordPath(context: ExecutionContext): string {
  return path.join(
    context.stateDir,
    `worker-${context.attemptId}-${context.generation}-${context.role}.json`,
  );
}
export function getWorkerLaunchIntentPath(context: ExecutionContext): string {
  return path.join(
    context.stateDir,
    `worker-launch-${context.attemptId}-${context.generation}-${context.role}.json`,
  );
}

export function getWorkerTerminationReceiptPath(
  context: ExecutionContext,
): string {
  return path.join(
    context.stateDir,
    `worker-termination-${context.attemptId}-${context.generation}-${context.role}.json`,
  );
}

export function getWorkerCompletionReceiptPath(
  context: ExecutionContext,
): string {
  return path.join(
    context.stateDir,
    `worker-completion-${context.attemptId}-${context.generation}-${context.role}.json`,
  );
}

export function getSupervisorAssetPath(context: ExecutionContext): string {
  return path.join(
    context.stateDir,
    `supervisor-${context.attemptId}-${context.generation}-${context.role}.js`,
  );
}

export function getSupervisorConfigPath(context: ExecutionContext): string {
  return path.join(
    context.stateDir,
    `supervisor-${context.attemptId}-${context.generation}-${context.role}.config.json`,
  );
}

export function getSupervisorReadyPath(context: ExecutionContext): string {
  return path.join(
    context.stateDir,
    `supervisor-${context.attemptId}-${context.generation}-${context.role}.ready.json`,
  );
}

export function getSupervisorDonePath(context: ExecutionContext): string {
  return path.join(
    context.stateDir,
    `supervisor-${context.attemptId}-${context.generation}-${context.role}.done.json`,
  );
}

export function getSupervisorStopPath(context: ExecutionContext): string {
  return path.join(
    context.stateDir,
    `supervisor-${context.attemptId}-${context.generation}-${context.role}.stop`,
  );
}

async function fsyncDirectory(directory: string): Promise<void> {
  try {
    const handle = await nodeFs.open(directory, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch {
    throw new HarnessError(
      'STORE_DIRECTORY_FSYNC_FAILED',
      `Failed to fsync state directory: ${directory}`,
    );
  }
}

async function writeJsonAtomic(
  filePath: string,
  value: unknown,
  options?: { immutable?: boolean },
): Promise<void> {
  const body = JSON.stringify(value, null, 2);
  if (options?.immutable && (await fs.pathExists(filePath))) {
    const existing = await fs.readFile(filePath, 'utf8').catch(() => null);
    if (existing !== null) {
      let equal: boolean;
      try {
        equal = JSON.stringify(JSON.parse(existing), null, 2) === body;
      } catch {
        equal = false;
      }
      if (!equal) {
        throw new HarnessError(
          'STORE_IMMUTABLE_CONFLICT',
          `Refusing to overwrite immutable runtime receipt: ${filePath}`,
        );
      }
      return;
    }
  }
  await fs.ensureDir(path.dirname(filePath));
  const tmpPath = `${filePath}.tmp.${crypto.randomBytes(6).toString('hex')}`;
  const handle = await nodeFs.open(tmpPath, 'wx', 0o600);
  try {
    await handle.writeFile(body, 'utf8');
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => undefined);
    await fs.remove(tmpPath).catch(() => undefined);
    throw error;
  }
  await handle.close();
  await fs.rename(tmpPath, filePath);
  await fsyncDirectory(path.dirname(filePath));
}

async function readJsonBounded<T>(filePath: string): Promise<T | null> {
  try {
    const stat = await fs.lstat(filePath);
    if (!stat.isFile() || stat.size > 4 * 1024 * 1024) {
      return null;
    }
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

/**
 * Instance evidence may be upgraded from unconfirmed to confirmed by a later authoritative
 * observation, but a confirmed receipt is never overwritten by a weaker one.
 */
async function writeInstanceEvidenceMonotonic(
  filePath: string,
  evidence: InstanceTerminalEvidence,
): Promise<void> {
  const existing = await readJsonBounded<InstanceTerminalEvidence>(filePath);
  if (existing?.confirmed) {
    return;
  }
  await writeJsonAtomic(filePath, evidence);
}

async function writeFirstWrite(filePath: string, body: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  const handle = await nodeFs
    .open(filePath, 'wx', 0o600)
    .catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        return null;
      }
      throw error;
    });
  if (!handle) {
    return;
  }
  try {
    await handle.writeFile(body, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fsyncDirectory(path.dirname(filePath));
}

/**
 * Obtains a durable host boot identity used to correlate runtime receipts.
 */
export async function getWorkerBootId(stateDir: string): Promise<string> {
  try {
    const kernelBootId = (
      await fs.readFile('/proc/sys/kernel/random/boot_id', 'utf8')
    ).trim();
    if (kernelBootId) {
      return kernelBootId;
    }
  } catch {
    // Non-Linux hosts fall back to the persisted host boot marker below.
  }

  const bootIdFile = path.join(stateDir, '.worker-boot-id');
  const persisted = await fs.readFile(bootIdFile, 'utf8').catch(() => '');
  if (persisted.trim()) {
    return persisted.trim();
  }

  const newBootId = crypto.randomUUID();
  await writeFirstWrite(bootIdFile, newBootId);
  return newBootId;
}

/**
 * Owns sandbox container lifecycle, worker process ownership and the independent detached
 * supervisor. One durable per-role lock serializes launch/fence transitions; every
 * destructive operation requires exact persisted identity and verified ownership.
 */
export class LocalSupervisor {
  private readonly dockerCommand: string;
  private readonly image: string;
  private readonly sandboxUser: string;

  constructor(
    dockerCommand: string,
    image: string,
    sandboxUser = getSandboxUser(),
  ) {
    this.dockerCommand = dockerCommand;
    this.image = image;
    this.sandboxUser = sandboxUser;
  }

  private async docker(args: string[]): Promise<DockerResult> {
    return new Promise<DockerResult>((resolve) => {
      nodeExecFile(
        this.dockerCommand,
        args,
        {
          encoding: 'utf8',
          timeout: DOCKER_RPC_TIMEOUT_MS,
          maxBuffer: 8 * 1024 * 1024,
          env: SAFE_COMMAND_ENV,
        },
        (error, stdout, stderr) => {
          resolve({
            ok: !error,
            stdout: String(stdout ?? ''),
            stderr: String(stderr ?? ''),
            error: error ? String(error.message) : '',
          });
        },
      );
    });
  }

  /**
   * Serializes attempt/gen/role launch and fence transitions. A live lock is never stolen;
   * acquisition failure fails closed.
   */
  async withLifecycleLock<T>(
    context: ExecutionContext,
    action: () => Promise<T>,
  ): Promise<T> {
    const lockPath = getLifecycleLockPath(context);
    const acquireDeadline = Date.now() + LIFECYCLE_LOCK_TIMEOUT_MS;
    let handle: Awaited<ReturnType<typeof nodeFs.open>> | null = null;
    while (!handle) {
      try {
        handle = await nodeFs.open(lockPath, 'wx', 0o600);
        await handle.writeFile(
          JSON.stringify({ pid: process.pid, acquiredAt: Date.now() }),
          'utf8',
        );
        await handle.sync();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
        if (Date.now() >= acquireDeadline) {
          throw new HarnessError(
            'LIFECYCLE_LOCK_UNAVAILABLE',
            'Attempt lifecycle lock is held; launch/fence transition denied.',
          );
        }
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 50);
        });
      }
    }
    try {
      return await action();
    } finally {
      await handle.close().catch(() => undefined);
      await fs.remove(lockPath).catch(() => undefined);
    }
  }

  async readInstanceState(context: ExecutionContext): Promise<{
    records: ContainerInstanceRecord[];
    corruptFiles: string[];
  }> {
    const prefix = instanceFilePrefix(context);
    const names = await fs
      .readdir(context.stateDir)
      .catch(() => [] as string[]);
    const records: ContainerInstanceRecord[] = [];
    const corruptFiles: string[] = [];
    for (const name of names.sort()) {
      if (!name.startsWith(prefix) || !name.endsWith('.json')) {
        continue;
      }
      const filePath = path.join(context.stateDir, name);
      const stat = await fs.lstat(filePath).catch(() => null);
      if (!stat?.isFile()) {
        corruptFiles.push(name);
        continue;
      }
      const record = await readJsonBounded<ContainerInstanceRecord>(filePath);
      if (
        record &&
        record.attemptId === context.attemptId &&
        record.generation === context.generation &&
        record.role === context.role &&
        typeof record.instanceId === 'string'
      ) {
        records.push(record);
      } else {
        corruptFiles.push(name);
      }
    }
    return { records, corruptFiles };
  }

  /** Authority view; corrupt records are surfaced rather than filtered away. */
  async readInstanceRecords(
    context: ExecutionContext,
  ): Promise<ContainerInstanceRecord[]> {
    const { records, corruptFiles } = await this.readInstanceState(context);
    if (corruptFiles.length > 0) {
      throw new HarnessError(
        'INSTANCE_STATE_CORRUPT',
        `Owned instance state is corrupt: ${corruptFiles.join(', ')}`,
      );
    }
    return records;
  }

  async readFence(
    context: ExecutionContext,
  ): Promise<{ reason: string; fencedAt: number } | null> {
    return readJsonBounded<{ reason: string; fencedAt: number }>(
      getFencePath(context),
    );
  }

  async writeFence(context: ExecutionContext, reason: string): Promise<void> {
    await this.withLifecycleLock(context, async () => {
      const existing = await this.readFence(context);
      if (existing) {
        return;
      }
      await writeJsonAtomic(
        getFencePath(context),
        { schemaVersion: 1, reason, fencedAt: Date.now() },
        { immutable: true },
      );
    });
  }

  async assertLaunchable(context: ExecutionContext): Promise<void> {
    if (await this.readFence(context)) {
      throw new HarnessError(
        'ATTEMPT_FENCED',
        'Attempt role is fenced; no container may be created or started.',
      );
    }
    if (Date.now() >= context.deadline) {
      throw new HarnessError(
        'DEADLINE_EXCEEDED',
        'Attempt deadline has already elapsed before launch.',
      );
    }
  }

  /**
   * Ensures exactly one live detached supervisor per attempt/generation/role. A live owner is
   * reused (its shared ready state is never replaced); a dead owner is replaced under the
   * lifecycle lock. Readiness is acknowledged before any owned work is registered.
   */
  async ensureSupervisor(
    context: ExecutionContext,
    options: { nodeCommand: string; deadline: number },
  ): Promise<{ pid: number; reused: boolean }> {
    return this.withLifecycleLock(context, async () => {
      const readyPath = getSupervisorReadyPath(context);
      const expectedAssetPath = getSupervisorAssetPath(context);
      const expectedConfigPath = getSupervisorConfigPath(context);
      const expectedBootId = await getWorkerBootId(context.stateDir);
      const existing = await readJsonBounded<{
        pid: number;
        attemptId: string;
        generation: number;
        role: string;
        armed: boolean;
        runtimeDigest: string;
        workerBootId: string;
        assetPath: string;
        configPath: string;
        processStartTime: string;
      }>(readyPath);
      if (
        existing &&
        existing.attemptId === context.attemptId &&
        existing.generation === context.generation &&
        existing.role === context.role &&
        existing.runtimeDigest === context.runtimeDigest &&
        existing.workerBootId === expectedBootId &&
        existing.armed === true &&
        existing.assetPath === expectedAssetPath &&
        existing.configPath === expectedConfigPath &&
        typeof existing.pid === 'number' &&
        typeof existing.processStartTime === 'string'
      ) {
        const observation = await this.readProcessIdentity(existing.pid);
        if (
          observation.state === 'running' &&
          observation.startTime === existing.processStartTime &&
          observation.command.includes(expectedAssetPath) &&
          observation.command.includes(expectedConfigPath)
        ) {
          return { pid: existing.pid, reused: true };
        }
        if (observation.state === 'unknown') {
          throw new HarnessError(
            'SUPERVISOR_STATE_UNKNOWN',
            'Existing detached supervisor identity could not be observed; launch denied.',
          );
        }
        if (observation.state === 'running') {
          throw new HarnessError(
            'SUPERVISOR_IDENTITY_MISMATCH',
            'Existing supervisor record points to an unrelated or recycled process.',
          );
        }
      } else if (existing) {
        throw new HarnessError(
          'SUPERVISOR_IDENTITY_MISMATCH',
          'Existing supervisor record is incomplete or bound to a different runtime.',
        );
      }

      const asset = getSupervisorAsset();
      const assetPath = getSupervisorAssetPath(context);
      const configPath = getSupervisorConfigPath(context);
      const donePath = getSupervisorDonePath(context);
      const stopPath = getSupervisorStopPath(context);

      await writeFirstWrite(assetPath, asset.source);
      const writtenHash = crypto
        .createHash('sha256')
        .update(await fs.readFile(assetPath, 'utf8'), 'utf8')
        .digest('hex');
      if (writtenHash !== asset.sha256) {
        throw new HarnessError(
          'SUPERVISOR_ASSET_MISMATCH',
          'Emitted supervisor asset bytes do not match the trusted digest.',
        );
      }

      await fs.remove(readyPath).catch(() => undefined);
      await fs.remove(donePath).catch(() => undefined);
      await fs.remove(stopPath).catch(() => undefined);
      await writeJsonAtomic(configPath, {
        schemaVersion: 1,
        attemptId: context.attemptId,
        generation: context.generation,
        role: context.role,
        runtimeDigest: context.runtimeDigest,
        dockerCommand: this.dockerCommand,
        image: this.image,
        deadline: options.deadline,
        stateDir: context.stateDir,
        stopPath,
      });

      const child = spawn(
        options.nodeCommand,
        [assetPath, configPath, readyPath, donePath],
        {
          detached: true,
          stdio: 'ignore',
          env: SAFE_COMMAND_ENV,
        },
      );

      let spawnError: string | null = null;
      child.on('error', (error) => {
        spawnError = String(error.message);
      });

      const readyDeadline = Date.now() + SUPERVISOR_READY_TIMEOUT_MS;
      for (;;) {
        if (spawnError) {
          throw new HarnessError(
            'SUPERVISOR_UNAVAILABLE',
            `Detached supervisor failed to start: ${spawnError}`,
          );
        }
        const ready = await readJsonBounded<{
          pid: number;
          attemptId: string;
          generation: number;
          role: string;
          startedAt: number;
          armed: boolean;
          runtimeDigest: string;
          workerBootId: string;
          assetPath: string;
          configPath: string;
        }>(readyPath);
        if (ready) {
          if (
            ready.pid !== child.pid ||
            ready.attemptId !== context.attemptId ||
            ready.generation !== context.generation ||
            ready.role !== context.role ||
            ready.armed !== true ||
            ready.runtimeDigest !== context.runtimeDigest ||
            ready.workerBootId !== expectedBootId ||
            ready.assetPath !== assetPath ||
            ready.configPath !== configPath
          ) {
            throw new HarnessError(
              'SUPERVISOR_IDENTITY_MISMATCH',
              'Detached supervisor acknowledged a different identity than requested.',
            );
          }
          const observation = await this.readProcessIdentity(ready.pid);
          if (
            observation.state !== 'running' ||
            !observation.command.includes(assetPath) ||
            !observation.command.includes(configPath)
          ) {
            throw new HarnessError(
              'SUPERVISOR_IDENTITY_UNVERIFIED',
              'Detached supervisor command identity could not be verified.',
            );
          }
          await writeJsonAtomic(readyPath, {
            ...ready,
            processStartTime: observation.startTime,
          });
          child.unref();
          return { pid: ready.pid, reused: false };
        }
        if (Date.now() >= readyDeadline) {
          try {
            if (child.pid) {
              process.kill(-child.pid, 'SIGKILL');
            }
          } catch {
            try {
              child.kill('SIGKILL');
            } catch {
              // Supervisor already gone.
            }
          }
          throw new HarnessError(
            'SUPERVISOR_UNAVAILABLE',
            'Detached supervisor did not acknowledge readiness; execution denied.',
          );
        }
        await new Promise<void>((resolve) => {
          setTimeout(resolve, SUPERVISOR_POLL_INTERVAL_MS);
        });
      }
    });
  }

  /** Durable stop request: the supervisor exits only after owned work is settled. */
  async requestSupervisorStop(context: ExecutionContext): Promise<void> {
    await this.withLifecycleLock(context, async () => {
      await writeFirstWrite(
        getSupervisorStopPath(context),
        JSON.stringify({ schemaVersion: 1, requestedAt: Date.now() }),
      );
    });
  }

  async waitSupervisorDone(
    context: ExecutionContext,
    timeoutMs: number = SUPERVISOR_DONE_WAIT_MS,
  ): Promise<boolean> {
    const donePath = getSupervisorDonePath(context);
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const done = await readJsonBounded<{ finishedAt: number }>(donePath);
      if (done) {
        return true;
      }
      if (Date.now() >= deadline) {
        return false;
      }
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 50);
      });
    }
  }

  /** Creates the durable owned instance under the lifecycle lock. */
  async createInstanceRecord(
    context: ExecutionContext,
  ): Promise<ContainerInstanceRecord> {
    return this.withLifecycleLock(context, async () => {
      await this.assertLaunchable(context);
      const instanceId = crypto.randomBytes(8).toString('hex');
      const now = Date.now();
      const record: ContainerInstanceRecord = {
        schemaVersion: 1,
        attemptId: context.attemptId,
        generation: context.generation,
        role: context.role,
        runtimeDigest: context.runtimeDigest,
        instanceId,
        containerName: getContainerName(context, instanceId),
        image: this.image,
        status: 'intent',
        deadline: context.deadline,
        createdAt: now,
        updatedAt: now,
      };
      await writeJsonAtomic(getInstanceRecordPath(context, instanceId), record);
      return record;
    });
  }

  private async updateInstanceRecord(
    context: ExecutionContext,
    record: ContainerInstanceRecord,
    update: Partial<ContainerInstanceRecord>,
  ): Promise<ContainerInstanceRecord> {
    const next: ContainerInstanceRecord = {
      ...record,
      ...update,
      updatedAt: Date.now(),
    };
    await writeJsonAtomic(
      getInstanceRecordPath(context, record.instanceId),
      next,
    );
    return next;
  }

  /**
   * Creates the container with full pinned-image containment flags, re-checks the fence under
   * the lifecycle lock, and records the exact container identity before any start is possible.
   */
  async createContainer(
    context: ExecutionContext,
    record: ContainerInstanceRecord,
    argv: string[],
    workspace: string,
    readonlyMounts: ReadonlyMount[],
    env: Record<string, string>,
  ): Promise<ContainerInstanceRecord> {
    return this.withLifecycleLock(context, async () => {
      await this.assertLaunchable(context);
      const args: string[] = [
        'create',
        '--pull=never',
        '--name',
        record.containerName,
        '--network',
        'none',
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges',
        '--read-only',
        '--tmpfs',
        '/tmp:rw,noexec,nosuid,size=64m',
        '--user',
        this.sandboxUser,
        '--pids-limit',
        '128',
        '--memory',
        '1g',
        '--cpus',
        '2.0',
        '-v',
        `${workspace}:/workspace:rw`,
        '-w',
        '/workspace',
      ];
      for (const mount of readonlyMounts) {
        args.push('-v', `${mount.hostPath}:${mount.containerPath}:ro`);
      }
      for (const [key, value] of Object.entries(
        getContainerLabels(context, record.instanceId),
      )) {
        args.push('--label', `${key}=${value}`);
      }
      for (const [key, value] of Object.entries(env)) {
        args.push('-e', `${key}=${value}`);
      }
      args.push('--entrypoint', '');
      args.push(this.image, ...argv);

      const created = await this.docker(args);
      const containerId = created.stdout.trim();
      if (!created.ok || !/^[a-f0-9]{64}$/.test(containerId)) {
        throw new HarnessError(
          'CONTAINER_CREATE_FAILED',
          `Docker create did not return a validated container identity: ${created.error || created.stderr}`,
        );
      }
      return this.updateInstanceRecord(context, record, {
        containerId,
        status: 'created',
      });
    });
  }

  /**
   * Dispatches the start request while the lifecycle lock is held, then releases the lock and
   * awaits a bounded attach stream. The docker client process itself has a finite lifetime.
   */
  async startContainer(
    context: ExecutionContext,
    record: ContainerInstanceRecord,
    limits: { maxStdoutBytes: number; maxStderrBytes: number },
  ): Promise<AttachResult> {
    if (!record.containerId) {
      throw new HarnessError(
        'CONTAINER_NOT_CREATED',
        'Cannot start a container without a recorded container identity.',
      );
    }
    const containerId = record.containerId;

    const pending = await this.withLifecycleLock(context, async () => {
      await this.assertLaunchable(context);
      const inspected = await this.inspectInstance(record);
      if (inspected.state === 'foreign' || inspected.state === 'unknown') {
        await this.terminateInstance(context, record);
        throw new HarnessError(
          inspected.state === 'foreign'
            ? 'CONTAINER_OWNERSHIP_MISMATCH'
            : 'DOCKER_INSPECT_UNKNOWN',
          `Refusing to start container with unverified ownership (${inspected.detail}).`,
        );
      }

      let resolveSpawn: (value: {
        spawned: boolean;
        error: string;
      }) => void = () => undefined;
      const spawnAck = new Promise<{ spawned: boolean; error: string }>(
        (resolve) => {
          resolveSpawn = resolve;
        },
      );
      let resolveAttach: (value: AttachResult) => void = () => undefined;
      const attachResult = new Promise<AttachResult>((resolve) => {
        resolveAttach = resolve;
      });

      const child = spawn(
        this.dockerCommand,
        ['start', '--attach', containerId],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: SAFE_COMMAND_ENV,
        },
      );
      const stdoutState = {
        chunks: [] as Buffer[],
        bytes: 0,
        truncated: false,
      };
      const stderrState = {
        chunks: [] as Buffer[],
        bytes: 0,
        truncated: false,
      };
      const appendChunk = (
        state: { chunks: Buffer[]; bytes: number; truncated: boolean },
        chunk: Buffer,
        maxBytes: number,
      ): void => {
        if (state.bytes >= maxBytes) {
          state.truncated = true;
          return;
        }
        const remaining = maxBytes - state.bytes;
        const slice =
          chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
        state.chunks.push(slice);
        state.bytes += slice.length;
        if (slice.length < chunk.length) {
          state.truncated = true;
        }
      };

      child.stdout?.on('data', (chunk: Buffer) => {
        appendChunk(stdoutState, chunk, limits.maxStdoutBytes);
        if (stdoutState.truncated) child.kill('SIGKILL');
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        appendChunk(stderrState, chunk, limits.maxStderrBytes);
        if (stderrState.truncated) child.kill('SIGKILL');
      });

      let timedOut = false;
      const attachTimer = setTimeout(
        () => {
          timedOut = true;
          try {
            child.kill('SIGKILL');
          } catch {
            // Client already gone.
          }
        },
        Math.max(0, context.deadline - Date.now()) + ATTACH_EXTRA_TIMEOUT_MS,
      );

      child.on('error', (error) => {
        clearTimeout(attachTimer);
        resolveSpawn({ spawned: false, error: String(error.message) });
        resolveAttach({
          stdout: '',
          stderr: String(error.message),
          truncated: false,
          attachExitCode: -1,
          attachTimedOut: timedOut,
        });
      });
      child.on('spawn', () => {
        resolveSpawn({ spawned: true, error: '' });
      });
      child.on('close', (code) => {
        clearTimeout(attachTimer);
        resolveAttach({
          stdout: Buffer.concat(stdoutState.chunks).toString('utf8'),
          stderr: Buffer.concat(stderrState.chunks).toString('utf8'),
          truncated: stdoutState.truncated || stderrState.truncated,
          attachExitCode: code ?? -1,
          attachTimedOut: timedOut,
        });
      });

      return { spawnAck, attachResult };
    });

    const ack = await pending.spawnAck;
    if (!ack.spawned) {
      const failed = await pending.attachResult;
      await this.terminateInstance(context, record);
      throw new HarnessError(
        'CONTAINER_ATTACH_FAILED',
        `Failed to attach to owned container ${containerId}: ${ack.error || failed.stderr}`,
      );
    }
    await this.updateInstanceRecord(context, record, { status: 'running' });
    return pending.attachResult;
  }

  async inspectInstance(
    record: ContainerInstanceRecord,
  ): Promise<OwnedInspection> {
    if (!record.containerId) {
      return { state: 'unknown', detail: 'no-recorded-container-id' };
    }
    const result = await this.docker(['inspect', record.containerId]);
    if (!result.ok) {
      return { state: 'unknown', detail: 'inspect-failed' };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      return { state: 'unknown', detail: 'inspect-invalid-json' };
    }
    if (!Array.isArray(parsed) || parsed.length !== 1) {
      return { state: 'unknown', detail: 'inspect-shape' };
    }
    const info = parsed[0] as {
      Id?: unknown;
      Name?: unknown;
      Config?: { Image?: unknown; Labels?: unknown };
      State?: { Running?: unknown; Status?: unknown };
    };
    if (!info || typeof info !== 'object') {
      return { state: 'unknown', detail: 'inspect-object' };
    }
    if (String(info.Id ?? '') !== record.containerId) {
      return { state: 'foreign', detail: 'id-mismatch' };
    }
    const config = info.Config ?? {};
    const labels =
      config.Labels && typeof config.Labels === 'object'
        ? (config.Labels as Record<string, unknown>)
        : {};
    const expected: Record<string, string> = {
      [CONTAINER_LABELS.attemptId]: record.attemptId,
      [CONTAINER_LABELS.generation]: String(record.generation),
      [CONTAINER_LABELS.role]: record.role,
      [CONTAINER_LABELS.runtimeDigest]: record.runtimeDigest,
      [CONTAINER_LABELS.instance]: record.instanceId,
      [CONTAINER_LABELS.managedBy]: MANAGED_BY_LABEL,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (labels[key] !== value) {
        return { state: 'foreign', detail: 'label-mismatch' };
      }
    }
    if (config.Image !== record.image) {
      return { state: 'foreign', detail: 'image-mismatch' };
    }
    if (String(info.Name ?? '') !== `/${record.containerName}`) {
      return { state: 'foreign', detail: 'name-mismatch' };
    }
    const state = info.State;
    if (
      !state ||
      typeof state.Running !== 'boolean' ||
      typeof state.Status !== 'string'
    ) {
      return { state: 'unknown', detail: 'state-shape' };
    }
    return {
      state: state.Running ? 'running' : 'stopped',
      detail: state.Status,
    };
  }

  private async proveInstanceAbsence(
    record: ContainerInstanceRecord,
  ): Promise<{ confirmed: boolean; errorCode?: string }> {
    const result = await this.docker([
      'ps',
      '-a',
      '--filter',
      `label=${CONTAINER_LABELS.instance}=${record.instanceId}`,
      '--format',
      '{{.ID}}',
    ]);
    if (!result.ok) {
      return { confirmed: false, errorCode: 'DOCKER_ABSENCE_QUERY_FAILED' };
    }
    if (result.stdout.trim() !== '') {
      return { confirmed: false, errorCode: 'CONTAINER_ABSENCE_UNPROVEN' };
    }
    return { confirmed: true };
  }

  async terminateInstance(
    context: ExecutionContext,
    record: ContainerInstanceRecord,
  ): Promise<InstanceTerminalEvidence> {
    const existing = await this.instanceEvidence(context, record);
    if (existing?.confirmed) {
      if (record.status !== 'terminated') {
        await this.updateInstanceRecord(context, record, {
          status: 'terminated',
        });
      }
      return existing;
    }
    if (existing?.errorCode === 'CONTAINER_OWNERSHIP_MISMATCH') {
      return existing;
    }

    const workerBootId = await getWorkerBootId(context.stateDir);
    const observed = await this.inspectInstance(record);

    if (observed.state === 'foreign') {
      const evidence: InstanceTerminalEvidence = {
        attemptId: record.attemptId,
        generation: record.generation,
        role: record.role,
        instanceId: record.instanceId,
        confirmed: false,
        observedAt: Date.now(),
        containerIds: record.containerId ? [record.containerId] : [],
        errorCode: 'CONTAINER_OWNERSHIP_MISMATCH',
        workerBootId,
      };
      await writeInstanceEvidenceMonotonic(
        getInstanceEvidencePath(context, record.instanceId),
        evidence,
      );
      return evidence;
    }

    if (observed.state === 'unknown') {
      return {
        attemptId: record.attemptId,
        generation: record.generation,
        role: record.role,
        instanceId: record.instanceId,
        confirmed: false,
        observedAt: Date.now(),
        containerIds: record.containerId ? [record.containerId] : [],
        errorCode: 'DOCKER_INSPECT_UNKNOWN',
        workerBootId,
      };
    }

    if (!record.containerId) {
      const absence = await this.proveInstanceAbsence(record);
      const evidence: InstanceTerminalEvidence = {
        attemptId: record.attemptId,
        generation: record.generation,
        role: record.role,
        instanceId: record.instanceId,
        confirmed: absence.confirmed,
        observedAt: Date.now(),
        containerIds: [],
        errorCode: absence.confirmed ? undefined : absence.errorCode,
        workerBootId,
      };
      await writeInstanceEvidenceMonotonic(
        getInstanceEvidencePath(context, record.instanceId),
        evidence,
      );
      await this.updateInstanceRecord(context, record, {
        status: absence.confirmed ? 'terminated' : 'unknown',
      });
      return evidence;
    }

    if (observed.state === 'running') {
      await this.docker(['kill', record.containerId]);
    }
    await this.docker(['rm', '-f', record.containerId]);
    const absence = await this.proveInstanceAbsence(record);
    const evidence: InstanceTerminalEvidence = {
      attemptId: record.attemptId,
      generation: record.generation,
      role: record.role,
      instanceId: record.instanceId,
      confirmed: absence.confirmed,
      observedAt: Date.now(),
      containerIds: [record.containerId],
      errorCode: absence.confirmed ? undefined : absence.errorCode,
      workerBootId,
    };
    await writeInstanceEvidenceMonotonic(
      getInstanceEvidencePath(context, record.instanceId),
      evidence,
    );
    await this.updateInstanceRecord(context, record, {
      status: absence.confirmed ? 'terminated' : 'unknown',
    });
    return evidence;
  }

  private async instanceEvidence(
    context: ExecutionContext,
    record: ContainerInstanceRecord,
  ): Promise<InstanceTerminalEvidence | null> {
    return readJsonBounded<InstanceTerminalEvidence>(
      getInstanceEvidencePath(context, record.instanceId),
    );
  }

  private async proveAttemptAbsence(
    context: ExecutionContext,
  ): Promise<{ confirmed: boolean; errorCode?: string }> {
    const result = await this.docker([
      'ps',
      '-a',
      '--filter',
      `label=${CONTAINER_LABELS.attemptId}=${context.attemptId}`,
      '--filter',
      `label=${CONTAINER_LABELS.generation}=${context.generation}`,
      '--filter',
      `label=${CONTAINER_LABELS.role}=${context.role}`,
      '--format',
      '{{.ID}}',
    ]);
    if (!result.ok) {
      return { confirmed: false, errorCode: 'DOCKER_ABSENCE_QUERY_FAILED' };
    }
    if (result.stdout.trim() !== '') {
      return { confirmed: false, errorCode: 'CONTAINER_ABSENCE_UNPROVEN' };
    }
    return { confirmed: true };
  }

  async inspect(context: ExecutionContext): Promise<TerminationEvidence> {
    const workerBootId = await getWorkerBootId(context.stateDir);
    const { records, corruptFiles } = await this.readInstanceState(context);
    const containerIds: string[] = [];
    let unconfirmedCode: string | undefined =
      corruptFiles.length > 0 ? 'INSTANCE_STATE_CORRUPT' : undefined;

    for (const record of records) {
      if (record.containerId) {
        containerIds.push(record.containerId);
      }
      const evidence = await this.instanceEvidence(context, record);
      if (!evidence?.confirmed && !unconfirmedCode) {
        unconfirmedCode =
          evidence?.errorCode ?? 'INSTANCE_TERMINATION_UNCONFIRMED';
      }
    }

    const absence = await this.proveAttemptAbsence(context);
    const confirmed = absence.confirmed && unconfirmedCode === undefined;
    const evidence: TerminationEvidence = {
      attemptId: context.attemptId,
      generation: context.generation,
      confirmed,
      observedAt: Date.now(),
      containerIds,
      errorCode: confirmed ? undefined : (absence.errorCode ?? unconfirmedCode),
      workerBootId,
    };
    return stripUndefined(evidence);
  }

  async terminate(context: ExecutionContext): Promise<TerminationEvidence> {
    await this.writeFence(context, 'TERMINATE_REQUESTED');
    const { records } = await this.readInstanceState(context);
    for (const record of records) {
      await this.terminateInstance(context, record);
    }
    const evidence = await this.inspect(context);
    await this.persistAuthoritativeReceipts(context, evidence);
    await this.requestSupervisorStop(context);
    return evidence;
  }

  private async persistAuthoritativeReceipts(
    context: ExecutionContext,
    termination: TerminationEvidence,
  ): Promise<void> {
    const terminationPath = getTerminationReceiptPath(context);
    const priorRaw = await readJsonBounded<unknown>(terminationPath);
    if (priorRaw === null && (await fs.pathExists(terminationPath))) {
      throw new HarnessError(
        'TERMINATION_RECEIPT_INVALID',
        'Existing termination receipt is corrupt.',
      );
    }
    if (priorRaw !== null) {
      const prior = TerminationEvidenceSchema.safeParse(priorRaw);
      if (!prior.success) {
        throw new HarnessError(
          'TERMINATION_RECEIPT_INVALID',
          'Existing termination receipt is invalid.',
        );
      }
      if (
        prior.data.attemptId !== context.attemptId ||
        prior.data.generation !== context.generation
      ) {
        throw new HarnessError(
          'TERMINATION_RECEIPT_MISMATCH',
          'Termination receipt identity mismatch.',
        );
      }
      if (prior.data.confirmed && !termination.confirmed) return;
    }
    const { records } = await this.readInstanceState(context);
    const receipt: RuntimeStateReceipt = {
      schemaVersion: 1,
      attemptId: context.attemptId,
      generation: context.generation,
      role: context.role,
      runtimeDigest: context.runtimeDigest,
      image: this.image,
      observedAt: Date.now(),
      instances: records.map((record) => {
        return {
          instanceId: record.instanceId,
          containerId: record.containerId ?? null,
          image: record.image,
          confirmed: record.status === 'terminated',
        };
      }),
      termination,
    };
    await writeJsonAtomic(getRuntimeStateReceiptPath(context), receipt);
    await writeJsonAtomic(terminationPath, termination);
  }

  async beginWorkerLaunch(
    context: ExecutionContext,
    input: {
      launchNonce: string;
      workerBootId: string;
      workerScriptPath: string;
      workerAssetSha256: string;
      jobFilePath: string;
      releaseFilePath: string;
      deadline: number;
    },
  ): Promise<WorkerLaunchIntent> {
    return this.withLifecycleLock(context, async () => {
      await this.assertLaunchable(context);
      if (await fs.pathExists(getSupervisorStopPath(context))) {
        throw new HarnessError(
          'ATTEMPT_STOP_REQUESTED',
          'Worker launch is already stopped.',
        );
      }
      for (const filePath of [
        getWorkerLaunchIntentPath(context),
        getWorkerRecordPath(context),
        getWorkerTerminationReceiptPath(context),
        getWorkerCompletionReceiptPath(context),
        input.releaseFilePath,
      ]) {
        if (await fs.pathExists(filePath)) {
          throw new HarnessError(
            'WORKER_LAUNCH_STATE_EXISTS',
            'Refusing to reuse worker launch authority for this execution context.',
          );
        }
      }
      const intent = WorkerLaunchIntentSchema.parse({
        schemaVersion: 1,
        attemptId: context.attemptId,
        generation: context.generation,
        role: context.role,
        runtimeDigest: context.runtimeDigest,
        ...input,
        record: null,
        createdAt: Date.now(),
      });
      await writeJsonAtomic(getWorkerLaunchIntentPath(context), intent, {
        immutable: true,
      });
      return intent;
    });
  }

  async recordWorkerLaunchIdentity(
    context: ExecutionContext,
    launchNonce: string,
    input: { pid: number; pgid: number; workerStartTime: string },
  ): Promise<WorkerProcessRecord> {
    return this.withLifecycleLock(context, async () => {
      const intent = await this.readWorkerLaunchIntent(context);
      if (!intent || intent.launchNonce !== launchNonce) {
        throw new HarnessError(
          'WORKER_LAUNCH_INTENT_MISSING',
          'Worker launch intent is unavailable.',
        );
      }
      const [identity, group] = await Promise.all([
        this.readProcessIdentity(input.pid),
        this.observeGroup(input.pgid),
      ]);
      if (
        identity.state !== 'running' ||
        identity.startTime !== input.workerStartTime ||
        !identity.command.includes(intent.workerScriptPath) ||
        !identity.command.includes(intent.jobFilePath) ||
        group.state !== 'observed' ||
        !group.pids.includes(String(input.pid))
      ) {
        throw new HarnessError(
          'WORKER_IDENTITY_UNCONFIRMED',
          'Spawned worker identity is not authoritative.',
        );
      }
      const record = WorkerProcessRecordSchema.parse({
        schemaVersion: 1,
        attemptId: context.attemptId,
        generation: context.generation,
        role: context.role,
        runtimeDigest: context.runtimeDigest,
        launchNonce,
        ...input,
        workerScriptPath: intent.workerScriptPath,
        workerAssetSha256: intent.workerAssetSha256,
        jobFilePath: intent.jobFilePath,
        releaseFilePath: intent.releaseFilePath,
        deadline: intent.deadline,
        createdAt: intent.createdAt,
      });
      await writeJsonAtomic(getWorkerLaunchIntentPath(context), {
        ...intent,
        record,
      });
      return record;
    });
  }

  async readWorkerLaunchIntent(
    context: ExecutionContext,
  ): Promise<WorkerLaunchIntent | null> {
    const intentPath = getWorkerLaunchIntentPath(context);
    const raw = await readJsonBounded<unknown>(intentPath);
    if (raw === null) {
      if (await fs.pathExists(intentPath)) {
        throw new HarnessError(
          'WORKER_LAUNCH_INTENT_INVALID',
          'Worker launch intent is corrupt.',
        );
      }
      return null;
    }
    const parsed = WorkerLaunchIntentSchema.safeParse(raw);
    if (
      !parsed.success ||
      parsed.data.attemptId !== context.attemptId ||
      parsed.data.generation !== context.generation ||
      parsed.data.role !== context.role ||
      parsed.data.runtimeDigest !== context.runtimeDigest
    ) {
      throw new HarnessError(
        'WORKER_LAUNCH_INTENT_INVALID',
        'Worker launch intent identity is invalid.',
      );
    }
    return parsed.data;
  }

  async releaseWorker(
    context: ExecutionContext,
    record: WorkerProcessRecord,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.withLifecycleLock(context, async () => {
      await this.assertLaunchable(context);
      if (signal?.aborted || Date.now() >= context.deadline) {
        throw new HarnessError(
          signal?.aborted ? 'OMP_WORKER_SIGNAL_ABORTED' : 'DEADLINE_EXCEEDED',
          'Worker release was cancelled or expired.',
        );
      }
      if (await fs.pathExists(getSupervisorStopPath(context))) {
        throw new HarnessError(
          'ATTEMPT_STOP_REQUESTED',
          'Worker release is fenced by supervisor stop.',
        );
      }
      const [registered, intent] = await Promise.all([
        this.readWorkerRecord(context),
        this.readWorkerLaunchIntent(context),
      ]);
      if (
        !registered ||
        !intent?.record ||
        registered.launchNonce !== record.launchNonce ||
        intent.launchNonce !== record.launchNonce ||
        JSON.stringify(registered) !== JSON.stringify(record) ||
        JSON.stringify(intent.record) !== JSON.stringify(record)
      ) {
        throw new HarnessError(
          'WORKER_RELEASE_IDENTITY_MISMATCH',
          'Worker release identity is not registered.',
        );
      }
      const [identity, group] = await Promise.all([
        this.readProcessIdentity(record.pid),
        this.observeGroup(record.pgid),
      ]);
      if (
        identity.state !== 'running' ||
        identity.startTime !== record.workerStartTime ||
        !identity.command.includes(record.workerScriptPath) ||
        !identity.command.includes(record.jobFilePath) ||
        group.state !== 'observed' ||
        !group.pids.includes(String(record.pid))
      ) {
        throw new HarnessError(
          'WORKER_RELEASE_IDENTITY_MISMATCH',
          'Worker process is no longer exactly owned.',
        );
      }
      await writeFirstWrite(
        record.releaseFilePath,
        JSON.stringify({
          schemaVersion: 1,
          attemptId: context.attemptId,
          generation: context.generation,
          role: context.role,
          runtimeDigest: context.runtimeDigest,
          launchNonce: record.launchNonce,
          pid: record.pid,
          releasedAt: Date.now(),
        }),
      );
    });
  }
  async registerWorker(
    context: ExecutionContext,
    record: Omit<WorkerProcessRecord, 'schemaVersion' | 'createdAt'>,
  ): Promise<WorkerProcessRecord> {
    return this.withLifecycleLock(context, async () => {
      await this.assertLaunchable(context);
      if (await fs.pathExists(getSupervisorStopPath(context))) {
        throw new HarnessError(
          'ATTEMPT_STOP_REQUESTED',
          'Worker registration is already stopped.',
        );
      }
      const intent = await this.readWorkerLaunchIntent(context);
      const full = intent?.record;
      if (
        !full ||
        full.launchNonce !== record.launchNonce ||
        full.attemptId !== record.attemptId ||
        full.generation !== record.generation ||
        full.role !== record.role ||
        full.runtimeDigest !== record.runtimeDigest ||
        full.pid !== record.pid ||
        full.pgid !== record.pgid ||
        full.workerStartTime !== record.workerStartTime ||
        full.workerScriptPath !== record.workerScriptPath ||
        full.workerAssetSha256 !== record.workerAssetSha256 ||
        full.jobFilePath !== record.jobFilePath ||
        full.releaseFilePath !== record.releaseFilePath ||
        full.deadline !== record.deadline
      ) {
        throw new HarnessError(
          'WORKER_REGISTRATION_IDENTITY_MISMATCH',
          'Worker registration does not match the persisted pending launch identity.',
        );
      }
      await writeJsonAtomic(getWorkerRecordPath(context), full, {
        immutable: true,
      });
      return full;
    });
  }

  async readWorkerRecord(
    context: ExecutionContext,
  ): Promise<WorkerProcessRecord | null> {
    const raw = await readJsonBounded<unknown>(getWorkerRecordPath(context));
    if (raw === null) {
      if (await fs.pathExists(getWorkerRecordPath(context))) {
        throw new HarnessError(
          'WORKER_RECORD_INVALID',
          'Owned worker record is corrupt or unsafe.',
        );
      }
      return null;
    }
    const parsed = WorkerProcessRecordSchema.safeParse(raw);
    if (!parsed.success) {
      throw new HarnessError(
        'WORKER_RECORD_INVALID',
        'Owned worker record failed strict validation.',
      );
    }
    return parsed.data;
  }

  async clearWorkerRecord(context: ExecutionContext): Promise<void> {
    await this.withLifecycleLock(context, async () => {
      const record = await this.readWorkerRecord(context);
      const intent = await this.readWorkerLaunchIntent(context);
      const receipt = await this.readWorkerTermination(context);
      const owned = record ?? intent?.record;
      if (
        !owned ||
        !intent ||
        !receipt?.confirmed ||
        receipt.attemptId !== context.attemptId ||
        receipt.generation !== context.generation ||
        receipt.role !== context.role ||
        receipt.runtimeDigest !== context.runtimeDigest ||
        receipt.workerBootId !== intent.workerBootId ||
        receipt.pid !== owned.pid ||
        receipt.pgid !== owned.pgid
      ) {
        throw new HarnessError(
          'WORKER_OWNERSHIP_CLEAR_UNCONFIRMED',
          'Worker ownership records may be cleared only after exact confirmed termination.',
        );
      }
      await fs.remove(getWorkerRecordPath(context));
      await fs.remove(getWorkerLaunchIntentPath(context));
    });
  }

  /** Strictly parsed worker termination receipt; invalid receipts are unknown (null). */
  async readWorkerTermination(
    context: ExecutionContext,
  ): Promise<WorkerTerminationReceipt | null> {
    const raw = await readJsonBounded<unknown>(
      getWorkerTerminationReceiptPath(context),
    );
    if (raw === null) {
      return null;
    }
    const parsed = WorkerTerminationReceiptSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }
  async readWorkerCompletion(
    context: ExecutionContext,
  ): Promise<WorkerCompletionReceipt | null> {
    const raw = await readJsonBounded<unknown>(
      getWorkerCompletionReceiptPath(context),
    );
    if (raw === null) return null;
    const parsed = WorkerCompletionReceiptSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }

  async inspectWorkerRole(context: ExecutionContext): Promise<WorkerRoleState> {
    return this.withLifecycleLock(context, async () => {
      const [rawRecord, rawCompletion, rawTermination, rawIntent] =
        await Promise.all([
          readJsonBounded<unknown>(getWorkerRecordPath(context)),
          readJsonBounded<unknown>(getWorkerCompletionReceiptPath(context)),
          readJsonBounded<unknown>(getWorkerTerminationReceiptPath(context)),
          readJsonBounded<unknown>(getWorkerLaunchIntentPath(context)),
        ]);
      const recordResult =
        rawRecord === null
          ? null
          : WorkerProcessRecordSchema.safeParse(rawRecord);
      const completionResult =
        rawCompletion === null
          ? null
          : WorkerCompletionReceiptSchema.safeParse(rawCompletion);
      const terminationResult =
        rawTermination === null
          ? null
          : WorkerTerminationReceiptSchema.safeParse(rawTermination);
      const intentResult =
        rawIntent === null
          ? null
          : WorkerLaunchIntentSchema.safeParse(rawIntent);
      const record = recordResult?.success ? recordResult.data : null;
      const completion = completionResult?.success
        ? completionResult.data
        : null;
      const termination = terminationResult?.success
        ? terminationResult.data
        : null;
      const intent = intentResult?.success ? intentResult.data : null;
      const state = (
        value: 'absent' | 'running' | 'unknown',
        workerBootId = '',
      ): WorkerRoleState => ({
        attemptId: context.attemptId,
        generation: context.generation,
        role: context.role,
        runtimeDigest: context.runtimeDigest,
        workerBootId,
        state: value,
        record,
        completion,
        termination,
      });
      const paths = [
        [getWorkerRecordPath(context), record],
        [getWorkerCompletionReceiptPath(context), completion],
        [getWorkerTerminationReceiptPath(context), termination],
        [getWorkerLaunchIntentPath(context), intent],
      ] as const;
      for (const [filePath, parsed] of paths) {
        if ((await fs.lstat(filePath).catch(() => null)) && !parsed) {
          return state('unknown');
        }
      }
      if (intent) {
        const intentRecord = intent.record;
        if (
          intent.attemptId !== context.attemptId ||
          intent.generation !== context.generation ||
          intent.role !== context.role ||
          intent.runtimeDigest !== context.runtimeDigest ||
          (record &&
            (!intentRecord ||
              intentRecord.launchNonce !== record.launchNonce ||
              intentRecord.pid !== record.pid ||
              intentRecord.pgid !== record.pgid)) ||
          (!record && (!intentRecord || !termination?.confirmed))
        ) {
          return state('unknown');
        }
      }
      const workerRecord = record ?? intent?.record ?? null;
      const owner = workerRecord ?? completion ?? termination;
      if (!owner) return state('unknown');
      const bootId = await fs
        .readFile('/proc/sys/kernel/random/boot_id', 'utf8')
        .catch(async () =>
          fs
            .readFile(path.join(context.stateDir, '.worker-boot-id'), 'utf8')
            .catch(() => ''),
        );
      const workerBootId = bootId.trim();
      if (
        !workerBootId ||
        owner.attemptId !== context.attemptId ||
        owner.generation !== context.generation ||
        owner.role !== context.role ||
        owner.runtimeDigest !== context.runtimeDigest ||
        ('workerBootId' in owner && owner.workerBootId !== workerBootId) ||
        (intent && intent.workerBootId !== workerBootId)
      ) {
        return state('unknown', workerBootId);
      }
      const [identity, group] = await Promise.all([
        this.readProcessIdentity(owner.pid),
        this.observeGroup(owner.pgid),
      ]);
      if (identity.state === 'unknown' || group.state !== 'observed') {
        return state('unknown', workerBootId);
      }
      if (identity.state === 'absent' && group.pids.length === 0) {
        return state('absent', workerBootId);
      }
      if (
        workerRecord &&
        identity.state === 'running' &&
        identity.startTime === workerRecord.workerStartTime &&
        identity.command.includes(workerRecord.workerScriptPath) &&
        identity.command.includes(workerRecord.jobFilePath) &&
        group.pids.includes(String(workerRecord.pid))
      ) {
        return state('running', workerBootId);
      }
      return state('unknown', workerBootId);
    });
  }

  async observeGroup(
    pgid: number,
  ): Promise<{ state: 'observed' | 'unknown'; pids: string[] }> {
    const result = await new Promise<DockerResult>((resolve) => {
      nodeExecFile(
        'ps',
        ['-eo', 'pid=,pgid='],
        {
          encoding: 'utf8',
          timeout: 5000,
          maxBuffer: 8 * 1024 * 1024,
          env: SAFE_COMMAND_ENV,
        },
        (error, stdout, stderr) => {
          resolve({
            ok: !error,
            stdout: String(stdout ?? ''),
            stderr: String(stderr ?? ''),
            error: error ? String(error.message) : '',
          });
        },
      );
    });
    if (!result.ok) {
      return { state: 'unknown', pids: [] };
    }
    const pids: string[] = [];
    for (const line of result.stdout.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2 && parts[1] === String(pgid)) {
        pids.push(parts[0]);
      }
    }
    return { state: 'observed', pids };
  }

  async readProcessIdentity(pid: number): Promise<ProcessObservation> {
    const result = await new Promise<
      DockerResult & {
        killed: boolean;
        signal: string;
        exitCode: number | null;
      }
    >((resolve) => {
      nodeExecFile(
        'ps',
        ['-p', String(pid), '-o', 'lstart=,command='],
        {
          encoding: 'utf8',
          timeout: 5000,
          maxBuffer: 1024 * 1024,
          env: SAFE_COMMAND_ENV,
        },
        (error, stdout, stderr) => {
          const typed = error as
            | (NodeJS.ErrnoException & {
                killed?: boolean;
                signal?: string;
              })
            | null;
          resolve({
            ok: !error,
            stdout: String(stdout ?? ''),
            stderr: String(stderr ?? ''),
            error: error ? String(error.message) : '',
            killed: Boolean(typed?.killed),
            signal: typed?.signal ? String(typed.signal) : '',
            exitCode:
              typed && typeof typed.code === 'number' ? typed.code : null,
          });
        },
      );
    });
    if (result.ok) {
      const line = result.stdout.trim();
      if (line === '') {
        return { state: 'absent', startTime: '', command: '' };
      }
      return {
        state: 'running',
        startTime: line.slice(0, 24).trim(),
        command: line.slice(24),
      };
    }
    if (result.exitCode === 1 && !result.killed && !result.signal) {
      return { state: 'absent', startTime: '', command: '' };
    }
    return { state: 'unknown', startTime: '', command: '' };
  }

  async terminateWorker(
    context: ExecutionContext,
  ): Promise<WorkerTerminationReceipt | null> {
    return this.withLifecycleLock(context, () =>
      this.terminateWorkerLocked(context),
    );
  }

  private async terminateWorkerLocked(
    context: ExecutionContext,
  ): Promise<WorkerTerminationReceipt | null> {
    const record =
      (await this.readWorkerRecord(context)) ??
      (await this.readWorkerLaunchIntent(context))?.record ??
      null;
    if (!record) {
      return null;
    }
    const bootId = await getWorkerBootId(context.stateDir);
    const finalize = async (
      confirmed: boolean,
      errorCode: string,
    ): Promise<WorkerTerminationReceipt> => {
      const receipt: WorkerTerminationReceipt = {
        schemaVersion: 1,
        attemptId: context.attemptId,
        generation: context.generation,
        role: context.role,
        runtimeDigest: context.runtimeDigest,
        confirmed,
        observedAt: Date.now(),
        workerBootId: bootId,
        pid: record.pid,
        pgid: record.pgid,
        errorCode,
      };
      const receiptPath = getWorkerTerminationReceiptPath(context);
      const existing = await this.readWorkerTermination(context);
      if (
        existing &&
        (existing.attemptId !== context.attemptId ||
          existing.generation !== context.generation ||
          existing.role !== context.role ||
          existing.runtimeDigest !== context.runtimeDigest ||
          existing.workerBootId !== bootId ||
          existing.pid !== record.pid ||
          existing.pgid !== record.pgid)
      ) {
        throw new HarnessError(
          'WORKER_TERMINATION_RECEIPT_MISMATCH',
          'Existing worker termination receipt belongs to a different process identity.',
        );
      }
      if (existing?.confirmed && !confirmed) return existing;
      if (!existing && (await fs.pathExists(receiptPath))) {
        throw new HarnessError(
          'WORKER_TERMINATION_RECEIPT_INVALID',
          'Existing worker termination receipt is corrupt; ownership remains unknown.',
        );
      }
      await writeJsonAtomic(receiptPath, stripUndefined(receipt));
      return receipt;
    };

    const observed = await this.readProcessIdentity(record.pid);
    if (observed.state === 'unknown') {
      return finalize(false, 'WORKER_STATE_UNKNOWN');
    }
    if (observed.state === 'absent') {
      const group = await this.observeGroup(record.pgid);
      if (group.state === 'unknown') {
        return finalize(false, 'WORKER_GROUP_STATE_UNKNOWN');
      }
      if (group.pids.length > 0) {
        return finalize(false, 'WORKER_GROUP_SURVIVED');
      }
      return finalize(true, 'WORKER_ALREADY_GONE');
    }
    if (
      observed.startTime !== record.workerStartTime ||
      !observed.command.includes(record.workerScriptPath) ||
      !observed.command.includes(record.jobFilePath)
    ) {
      return finalize(false, 'WORKER_IDENTITY_UNVERIFIED');
    }
    try {
      if (record.pgid > 0 && record.pgid === record.pid) {
        process.kill(-record.pgid, 'SIGKILL');
      } else {
        process.kill(record.pid, 'SIGKILL');
      }
    } catch {
      // Fall through to authoritative observation.
    }
    const after = await this.readProcessIdentity(record.pid);
    if (after.state === 'unknown') {
      return finalize(false, 'WORKER_STATE_UNKNOWN');
    }
    const group = await this.observeGroup(record.pgid);
    if (group.state === 'unknown') {
      return finalize(false, 'WORKER_GROUP_STATE_UNKNOWN');
    }
    if (after.state === 'running') {
      return finalize(false, 'WORKER_TERMINATION_UNVERIFIED');
    }
    if (group.pids.length > 0) {
      return finalize(false, 'WORKER_GROUP_SURVIVED');
    }
    return finalize(true, 'SUPERVISOR_DEADLINE_EXCEEDED');
  }

  /**
   * Authoritative container exit status observation. Unknown daemon results are reported as
   * unobserved rather than inferred from attach exit codes.
   */
  async readExitStatus(record: ContainerInstanceRecord): Promise<{
    observed: boolean;
    exitCode: number | null;
    running: boolean;
  }> {
    if (!record.containerId) {
      return { observed: false, exitCode: null, running: false };
    }
    const result = await this.docker([
      'inspect',
      '--format',
      '{{json .State}}',
      record.containerId,
    ]);
    if (!result.ok) {
      return { observed: false, exitCode: null, running: false };
    }
    let state: unknown;
    try {
      state = JSON.parse(result.stdout);
    } catch {
      return { observed: false, exitCode: null, running: false };
    }
    const parsedState = ContainerStateSchema.safeParse(state);
    if (!parsedState.success) {
      return { observed: false, exitCode: null, running: false };
    }
    return {
      observed: true,
      exitCode: parsedState.data.ExitCode,
      running: parsedState.data.Running,
    };
  }

  async writeWorkerCompletion(
    context: ExecutionContext,
    data: { exitCode: number; workerAssetSha256: string },
  ): Promise<void> {
    const record = await this.readWorkerRecord(context);
    const completion: WorkerCompletionReceipt = {
      schemaVersion: 1,
      attemptId: context.attemptId,
      generation: context.generation,
      role: context.role,
      runtimeDigest: context.runtimeDigest,
      workerAssetSha256: data.workerAssetSha256,
      pid: record?.pid ?? 0,
      pgid: record?.pgid ?? 0,
      exitCode: data.exitCode,
      completedAt: Date.now(),
      workerBootId: await getWorkerBootId(context.stateDir),
    };
    await writeJsonAtomic(getWorkerCompletionReceiptPath(context), completion, {
      immutable: true,
    });
  }
}

function stripUndefined<T extends object>(value: T): T {
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined && entry !== null) {
      output[key] = entry;
    }
  }
  return output as T;
}
