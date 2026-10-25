import crypto from 'crypto';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { getWorkerBootId, LocalSupervisor } from './LocalSupervisor';
import type {
  WorkerProcessRecord,
  WorkerRoleState,
  WorkerTerminationReceipt,
} from './LocalSupervisor';
import {
  OmpHealthJobSchema,
  OmpHealthResultSchema,
  OmpWorkerJobSchema,
  OmpWorkerResultSchema,
  OmpWorkerUsageCheckpointSchema,
  OMP_WORKER_LIMITS,
} from './OmpWorkerScript';
import type { OmpWorkerJobResult } from './OmpWorkerScript';
import { z } from 'zod';
import { verifyRuntimeManifest } from './RuntimeManifest';
import type { RuntimeVerificationResult } from './RuntimeManifest';
import {
  Attempt,
  canonicalDigest,
  ExecutionContext,
  FleetAccount,
  FleetRuntimeConfig,
  FleetTask,
  HarnessBundle,
  HarnessError,
} from './RuntimeTypes';

const HEALTH_PROBE_TIMEOUT_MS = 30000;

export const OmpUsageSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: z.string().min(1).max(256),
    generation: z.number().int().positive(),
    role: z.enum(['task', 'evaluator']),
    runtimeDigest: z.string().regex(/^[a-f0-9]{64}$/),
    workerPid: z.number().int().positive(),
    observedAt: z.number().int().positive(),
    toolCalls: z.number().int().nonnegative().max(100000),
    costUsd: z.number().finite().nonnegative().nullable(),
    complete: z.boolean(),
  })
  .strict();

export type OmpUsageSnapshot = z.infer<typeof OmpUsageSnapshotSchema>;

export class OmpExecutionError extends HarnessError {
  readonly usage?: OmpUsageSnapshot;

  constructor(code: string, message: string, usage?: OmpUsageSnapshot) {
    super(code, message);
    this.name = 'OmpExecutionError';
    this.usage = usage;
  }
}

const RESERVED_ENV_KEYS: Record<string, true> = {
  PATH: true,
  HOME: true,
  TMPDIR: true,
  TMP: true,
  TEMP: true,
  SHELL: true,
  USER: true,
  LOGNAME: true,
  PWD: true,
  OLDPWD: true,
  IFS: true,
  LANG: true,
  LC_ALL: true,
  ENV: true,
  BASH_ENV: true,
  ZDOTDIR: true,
};

const DENIED_ENV_PREFIXES = [
  'NODE_',
  'BUN_',
  'LD_',
  'DYLD_',
  'npm_',
  'GIT_',
  'DOCKER_',
  'OPENSSL_',
  'SSL_',
  'CURL_',
  'HTTP_',
  'HTTPS_',
  'ALL_',
  'NO_',
  'AWS_',
  'GOOGLE_',
  'AZURE_',
];

/**
 * Transport/routing tokens are never part of an approved credential name. Endpoint selection
 * belongs to the configured account/policy, not to ambient environment overrides.
 */
const DENIED_ENV_TOKENS = [
  'BASE_URL',
  'BASEURL',
  'ENDPOINT',
  'HOST',
  'PORT',
  'PROXY',
  'URL',
  'PRELOAD',
  'OPTIONS',
  'CA_BUNDLE',
  'CERT',
  'REDIRECT',
];

/**
 * Accepts only credential-shaped environment keys from the selected account. Runtime,
 * loader, routing and transport override keys are rejected rather than stripped.
 */
export function assertSafeAccountEnvironmentKey(key: string): void {
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(key)) {
    throw new HarnessError(
      'UNSAFE_ENVIRONMENT_KEY',
      `Account environment key is not an uppercase credential-shaped name: ${key}`,
    );
  }
  if (RESERVED_ENV_KEYS[key] === true) {
    throw new HarnessError(
      'UNSAFE_ENVIRONMENT_KEY',
      `Account environment key shadows a reserved worker variable: ${key}`,
    );
  }
  if (DENIED_ENV_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    throw new HarnessError(
      'UNSAFE_ENVIRONMENT_KEY',
      `Account environment key targets a runtime/transport override namespace: ${key}`,
    );
  }
  if (DENIED_ENV_TOKENS.some((token) => key.includes(token))) {
    throw new HarnessError(
      'UNSAFE_ENVIRONMENT_KEY',
      `Account environment key targets an injection/routing control: ${key}`,
    );
  }
}

function buildWorkerEnvironment(
  account: FleetAccount,
  neutralCwd: string,
): Record<string, string> {
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? '/usr/bin:/bin',
    HOME: neutralCwd,
    TMPDIR: neutralCwd,
    LANG: 'C',
    LC_ALL: 'C',
    AGS_FLEET_WORKER: '1',
  };
  for (const key of account.environmentKeys) {
    assertSafeAccountEnvironmentKey(key);
    const value = process.env[key];
    if (value === undefined) {
      continue;
    }
    if (value.includes('\0')) {
      throw new HarnessError(
        'UNSAFE_ENVIRONMENT_KEY',
        `Account environment value contains a NUL byte: ${key}`,
      );
    }
    env[key] = value;
  }
  env.AWS_EC2_METADATA_DISABLED = 'true';
  return env;
}

/**
 * Verifies every immutable admitted identity, the actual bundle digest and allowance before
 * any executable or model work.
 */
export function assertAdmittedIdentity(options: {
  attempt: Attempt;
  context: ExecutionContext;
  task: FleetTask;
  bundle: HarnessBundle;
  account: FleetAccount;
  maxToolCalls: number;
}): void {
  const { attempt, context, task, bundle, account, maxToolCalls } = options;
  if (attempt.id !== context.attemptId) {
    throw new HarnessError(
      'ADMISSION_IDENTITY_MISMATCH',
      'ExecutionContext attempt identity does not match the admitted attempt.',
    );
  }
  if (attempt.generation !== context.generation) {
    throw new HarnessError(
      'ADMISSION_IDENTITY_MISMATCH',
      'ExecutionContext generation does not match the admitted generation.',
    );
  }
  if (attempt.deadline !== context.deadline) {
    throw new HarnessError(
      'ADMISSION_IDENTITY_MISMATCH',
      'ExecutionContext deadline does not match the admitted attempt deadline.',
    );
  }
  if (attempt.state !== 'admitted' && attempt.state !== 'running') {
    throw new HarnessError(
      'ATTEMPT_NOT_EXECUTABLE',
      `Attempt state ${attempt.state} is not executable.`,
    );
  }
  const binding = attempt.binding;
  if (binding.runtimeDigest !== context.runtimeDigest) {
    throw new HarnessError(
      'ADMISSION_RUNTIME_MISMATCH',
      'ExecutionContext runtime digest does not match the admitted runtime binding.',
    );
  }
  if (binding.accountId !== account.id) {
    throw new HarnessError(
      'ADMISSION_ACCOUNT_MISMATCH',
      'Selected account does not match the admitted account binding.',
    );
  }
  if (
    binding.provider !== account.provider ||
    binding.model !== account.model
  ) {
    throw new HarnessError(
      'ADMISSION_ACCOUNT_MISMATCH',
      'Selected provider/model does not match the admitted account binding.',
    );
  }
  if (
    binding.hostId !== task.project.hostId ||
    binding.projectId !== task.project.projectId ||
    binding.logicalProjectId !== task.project.logicalProjectId
  ) {
    throw new HarnessError(
      'ADMISSION_PROJECT_MISMATCH',
      'Task project identity does not match the admitted binding.',
    );
  }
  if (binding.phase !== task.phase) {
    throw new HarnessError(
      'ADMISSION_PHASE_MISMATCH',
      'Task phase does not match the admitted binding phase.',
    );
  }
  let taskDigest: string;
  try {
    taskDigest = canonicalDigest(task);
  } catch (error) {
    throw new HarnessError(
      'ADMISSION_TASK_DIGEST_INVALID',
      `Task cannot be canonically digested: ${String(error)}`,
    );
  }
  if (binding.taskDigest !== taskDigest) {
    throw new HarnessError(
      'ADMISSION_TASK_DIGEST_MISMATCH',
      'Task canonical digest does not match the admitted task digest.',
    );
  }
  let bundleDigest: string;
  try {
    bundleDigest = canonicalDigest(bundle);
  } catch (error) {
    throw new HarnessError(
      'ADMISSION_BUNDLE_DIGEST_INVALID',
      `Bundle cannot be canonically digested: ${String(error)}`,
    );
  }
  if (binding.harnessDigest !== bundleDigest) {
    throw new HarnessError(
      'ADMISSION_BUNDLE_DIGEST_MISMATCH',
      'Actual bundle digest does not match the admitted harness binding.',
    );
  }
  if (!Number.isInteger(maxToolCalls) || maxToolCalls <= 0) {
    throw new HarnessError(
      'ADMISSION_ALLOWANCE_INVALID',
      'Per-attempt tool-call allowance must be a positive integer.',
    );
  }
  if (maxToolCalls > attempt.reservedToolCalls) {
    throw new HarnessError(
      'ADMISSION_ALLOWANCE_EXCEEDED',
      'Requested tool-call allowance exceeds the admitted reservation.',
    );
  }
  if (maxToolCalls > task.toolCallAllowance) {
    throw new HarnessError(
      'ADMISSION_ALLOWANCE_EXCEEDED',
      'Requested tool-call allowance exceeds the task allowance.',
    );
  }
  if (Date.now() >= context.deadline) {
    throw new HarnessError(
      'DEADLINE_EXCEEDED',
      'Admitted deadline already elapsed.',
    );
  }
}

interface BoundedProcessOutput {
  code: number;
  stdout: string;
  stderr: string;
  stdoutOverflow: boolean;
  stderrOverflow: boolean;
  timedOut: boolean;
}

const appendBounded = (
  state: { chunks: Buffer[]; bytes: number; overflow: boolean },
  chunk: Buffer,
  maxBytes: number,
): void => {
  if (state.bytes >= maxBytes) {
    state.overflow = true;
    return;
  }
  const remaining = maxBytes - state.bytes;
  const slice = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
  state.chunks.push(slice);
  state.bytes += slice.length;
  if (slice.length < chunk.length) {
    state.overflow = true;
  }
};

async function readWorkerUsage(
  filePath: string,
  nonce: string,
  context: ExecutionContext,
  record: WorkerProcessRecord,
  maxToolCalls: number,
): Promise<OmpUsageSnapshot | null> {
  try {
    const stat = await fs.lstat(filePath);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.size > 65536 ||
      (stat.mode & 0o077) !== 0
    ) {
      return null;
    }
    const parsed = OmpWorkerUsageCheckpointSchema.safeParse(
      JSON.parse(await fs.readFile(filePath, 'utf8')),
    );
    if (
      !parsed.success ||
      parsed.data.attemptId !== context.attemptId ||
      parsed.data.generation !== context.generation ||
      parsed.data.role !== context.role ||
      parsed.data.runtimeDigest !== context.runtimeDigest ||
      parsed.data.workerPid !== record.pid ||
      parsed.data.usageNonce !== nonce ||
      parsed.data.toolCalls > maxToolCalls
    ) {
      return null;
    }
    return OmpUsageSnapshotSchema.parse({
      schemaVersion: parsed.data.schemaVersion,
      attemptId: parsed.data.attemptId,
      generation: parsed.data.generation,
      role: parsed.data.role,
      runtimeDigest: parsed.data.runtimeDigest,
      workerPid: parsed.data.workerPid,
      observedAt: parsed.data.observedAt,
      toolCalls: parsed.data.toolCalls,
      costUsd: parsed.data.costUsd,
      complete: parsed.data.complete,
    });
  } catch {
    return null;
  }
}

export class OmpSdkExecutor {
  readonly runtime: FleetRuntimeConfig;
  private readonly supervisor: LocalSupervisor;

  constructor(runtime: FleetRuntimeConfig) {
    this.runtime = runtime;
    this.supervisor = new LocalSupervisor(runtime.dockerCommand, runtime.image);
  }

  /**
   * Authoritatively terminates the owned worker process group for a context and returns the
   * durable termination receipt (null when no owned worker was registered).
   */
  async terminateWorker(
    context: ExecutionContext,
  ): Promise<WorkerTerminationReceipt | null> {
    return this.supervisor.terminateWorker(context);
  }

  /** Reads the durable worker termination receipt without mutating state. */
  async readWorkerTermination(
    context: ExecutionContext,
  ): Promise<WorkerTerminationReceipt | null> {
    return this.supervisor.readWorkerTermination(context);
  }
  async inspectWorkerRole(context: ExecutionContext): Promise<WorkerRoleState> {
    return this.supervisor.inspectWorkerRole(context);
  }

  /**
   * Zero-model production health: verifies the installed closure and actual worker asset
   * first, then initializes the real restricted session through the shipped worker asset.
   */
  async health(): Promise<{ supported: boolean; reasonCodes: string[] }> {
    const reasonCodes: string[] = [];

    const verification = await verifyRuntimeManifest(
      this.runtime.manifestFile,
      this.runtime,
      this.runtime.manifestDigest,
    );
    if (!verification.valid) {
      return { supported: false, reasonCodes: verification.reasonCodes };
    }
    const workerAsset = this.requirePinnedWorkerAsset(verification);

    const probeRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), 'ags-omp-health-'),
    );
    try {
      const agentDir = path.join(probeRoot, 'agent');
      const neutralCwd = path.join(probeRoot, 'cwd');
      await fs.ensureDir(agentDir, 0o700);
      await fs.ensureDir(neutralCwd, 0o700);
      const jobFile = path.join(probeRoot, 'health-job.json');
      const job = OmpHealthJobSchema.parse({
        schemaVersion: 1,
        mode: 'health',
        runtime: this.runtime,
        expectedRuntimeDigest: verification.computedDigest,
        workerAssetPath: workerAsset.path,
        agentDir,
        neutralCwd,
        deadline: Date.now() + HEALTH_PROBE_TIMEOUT_MS,
      });
      await fs.writeFile(jobFile, JSON.stringify(job), {
        encoding: 'utf8',
        mode: 0o600,
        flag: 'wx',
      });

      const output = await this.spawnBounded({
        args: [
          '--no-install',
          '--no-env-file',
          workerAsset.path,
          '--health',
          jobFile,
        ],
        cwd: neutralCwd,
        env: {
          PATH: process.env.PATH ?? '/usr/bin:/bin',
          HOME: neutralCwd,
          TMPDIR: neutralCwd,
          LANG: 'C',
          LC_ALL: 'C',
          AGS_FLEET_WORKER: '1',
        },
        timeoutMs: HEALTH_PROBE_TIMEOUT_MS,
        maxStdoutBytes: 1024 * 1024,
        maxStderrBytes: 256 * 1024,
      });

      if (output.timedOut) {
        reasonCodes.push('HEALTH_PROBE_TIMEOUT');
      } else if (output.stdoutOverflow || output.stderrOverflow) {
        reasonCodes.push('HEALTH_PROBE_OUTPUT_OVERFLOW');
      } else if (output.code !== 0) {
        reasonCodes.push('HEALTH_PROBE_FAILED');
      } else {
        const parsed = OmpHealthResultSchema.safeParse(
          this.parseJson(output.stdout),
        );
        if (!parsed.success) {
          reasonCodes.push('HEALTH_PROBE_INVALID_RESULT');
        } else if (
          parsed.data.runtimeDigest !== verification.computedDigest ||
          parsed.data.activeTools[0] !== 'sandbox_exec' ||
          parsed.data.allTools[0] !== 'sandbox_exec' ||
          parsed.data.modelTokens !== 0
        ) {
          reasonCodes.push('HEALTH_PROBE_POLICY_MISMATCH');
        } else {
          return { supported: true, reasonCodes: [] };
        }
      }
    } catch (error) {
      reasonCodes.push(
        error instanceof HarnessError ? error.code : 'HEALTH_PROBE_FAILED',
      );
    } finally {
      await fs.remove(probeRoot).catch(() => undefined);
    }

    return { supported: false, reasonCodes: [...new Set(reasonCodes)] };
  }

  private requirePinnedWorkerAsset(verification: RuntimeVerificationResult): {
    path: string;
    sha256: string;
  } {
    const asset = verification.manifest?.assets.worker;
    if (!asset) {
      throw new HarnessError(
        'WORKER_ASSET_NOT_FOUND',
        'Verified runtime manifest carries no worker asset binding.',
      );
    }
    return { path: asset.path, sha256: asset.sha256 };
  }

  private parseJson(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }

  private async spawnBounded(options: {
    args: string[];
    cwd: string;
    env: Record<string, string>;
    timeoutMs: number;
    maxStdoutBytes: number;
    maxStderrBytes: number;
  }): Promise<BoundedProcessOutput> {
    const output = new Promise<BoundedProcessOutput>((resolve) => {
      const child = spawn(this.runtime.bunCommand, options.args, {
        cwd: options.cwd,
        env: options.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
      });
      const stdoutState = { chunks: [] as Buffer[], bytes: 0, overflow: false };
      const stderrState = { chunks: [] as Buffer[], bytes: 0, overflow: false };
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        try {
          if (process.platform !== 'win32' && child.pid) {
            process.kill(-child.pid, 'SIGKILL');
          } else {
            child.kill('SIGKILL');
          }
        } catch {
          // Process already gone.
        }
      }, options.timeoutMs);

      child.stdout?.on('data', (chunk: Buffer) => {
        appendBounded(stdoutState, chunk, options.maxStdoutBytes);
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        appendBounded(stderrState, chunk, options.maxStderrBytes);
      });
      child.on('error', () => {
        clearTimeout(timer);
        resolve({
          code: -1,
          stdout: '',
          stderr: 'spawn-error',
          stdoutOverflow: false,
          stderrOverflow: false,
          timedOut,
        });
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          code: code ?? -1,
          stdout: Buffer.concat(stdoutState.chunks).toString('utf8'),
          stderr: Buffer.concat(stderrState.chunks).toString('utf8'),
          stdoutOverflow: stdoutState.overflow,
          stderrOverflow: stderrState.overflow,
          timedOut,
        });
      });
    });
    return output;
  }

  /**
   * Executes a task session through the shipped restricted Bun OMP SDK worker with admitted
   * identity/bundle, verified closure/assets, supervisor ownership and a start barrier.
   */
  async run(
    task: FleetTask,
    bundle: HarnessBundle,
    attempt: Attempt,
    account: FleetAccount,
    workspace: string,
    options: {
      maxToolCalls: number;
      signal?: AbortSignal;
      context: ExecutionContext;
    },
  ): Promise<OmpWorkerJobResult> {
    const { context, signal } = options;
    assertAdmittedIdentity({
      attempt,
      context,
      task,
      bundle,
      account,
      maxToolCalls: options.maxToolCalls,
    });
    if (signal?.aborted) {
      throw new HarnessError(
        'OMP_WORKER_SIGNAL_ABORTED',
        'Execution aborted before runtime verification.',
      );
    }

    const verification = await verifyRuntimeManifest(
      this.runtime.manifestFile,
      this.runtime,
      context.runtimeDigest,
    );
    if (!verification.valid) {
      throw new HarnessError(
        'RUNTIME_CLOSURE_UNVERIFIED',
        `Installed runtime closure failed verification: ${verification.reasonCodes.join(', ')}`,
      );
    }
    const workerAsset = this.requirePinnedWorkerAsset(verification);
    if (signal?.aborted) {
      throw new HarnessError(
        'OMP_WORKER_SIGNAL_ABORTED',
        'Execution aborted during runtime verification.',
      );
    }
    if (Date.now() >= context.deadline) {
      throw new HarnessError(
        'DEADLINE_EXCEEDED',
        'Admitted deadline elapsed before worker spawn.',
      );
    }

    const neutralCwd = path.join(
      context.stateDir,
      `omp-cwd-${context.attemptId}-${context.generation}-${context.role}`,
    );
    const agentDir = path.join(
      context.stateDir,
      `omp-agent-${context.attemptId}-${context.generation}-${context.role}`,
    );
    await fs.ensureDir(neutralCwd, 0o700);
    await fs.ensureDir(agentDir, 0o700);

    const jobFile = path.join(
      context.stateDir,
      `worker-job-${context.attemptId}-${context.generation}-${context.role}.json`,
    );
    const releaseFilePath = path.join(
      context.stateDir,
      `worker-release-${context.attemptId}-${context.generation}-${context.role}.json`,
    );
    const launchNonce = crypto.randomBytes(32).toString('hex');
    const usageNonce = crypto.randomBytes(32).toString('hex');
    const usageFilePath = path.join(
      context.stateDir,
      `worker-usage-${context.attemptId}-${context.generation}-${context.role}-${usageNonce}.json`,
    );
    const job = OmpWorkerJobSchema.parse({
      context,
      schemaVersion: 1,
      mode: 'run',
      runtime: this.runtime,
      expectedRuntimeDigest: context.runtimeDigest,
      workerAssetPath: workerAsset.path,
      agentDir,
      neutralCwd,
      deadline: context.deadline,
      releaseFilePath,
      launchNonce,
      usageFilePath,
      usageNonce,
      task,
      bundle,
      account,
      workspace: path.resolve(workspace),
      maxToolCalls: options.maxToolCalls,
      ...(account.authFile ? { authDbPath: account.authFile } : {}),
    });
    await fs.writeFile(jobFile, JSON.stringify(job), {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });

    const env = buildWorkerEnvironment(account, neutralCwd);
    await this.supervisor.ensureSupervisor(context, {
      nodeCommand: this.runtime.nodeCommand,
      deadline: context.deadline,
    });

    if (signal?.aborted || Date.now() >= context.deadline) {
      await fs.remove(jobFile).catch(() => undefined);
      await fs.remove(neutralCwd).catch(() => undefined);
      await fs.remove(agentDir).catch(() => undefined);
      await this.supervisor.requestSupervisorStop(context);
      throw new HarnessError(
        signal?.aborted ? 'OMP_WORKER_SIGNAL_ABORTED' : 'DEADLINE_EXCEEDED',
        'Execution aborted or expired while the detached supervisor armed; no worker started.',
      );
    }
    await this.supervisor.beginWorkerLaunch(context, {
      launchNonce,
      workerBootId: await getWorkerBootId(context.stateDir),
      workerScriptPath: workerAsset.path,
      workerAssetSha256: workerAsset.sha256,
      jobFilePath: jobFile,
      releaseFilePath,
      deadline: context.deadline,
    });

    let resolveRun: (value: OmpWorkerJobResult) => void = () => undefined;
    let rejectRun: (reason: HarnessError) => void = () => undefined;
    const promise = new Promise<OmpWorkerJobResult>((resolve, reject) => {
      resolveRun = resolve;
      rejectRun = reject;
    });
    let settled = false;
    const stdoutState = { chunks: [] as Buffer[], bytes: 0, overflow: false };
    const stderrState = { chunks: [] as Buffer[], bytes: 0, overflow: false };

    const cleanup = async (): Promise<void> => {
      await fs.remove(jobFile).catch(() => undefined);
      await fs.remove(releaseFilePath).catch(() => undefined);
      await fs.remove(neutralCwd).catch(() => undefined);
      await fs.remove(agentDir).catch(() => undefined);
    };

    // Handlers and the admitted-deadline timer are installed synchronously around spawn so a
    // fast spawn error/exit or a mid-registration abort can never escape ownership.
    const child = spawn(
      this.runtime.bunCommand,
      ['--no-install', '--no-env-file', workerAsset.path, '--job', jobFile],
      {
        cwd: neutralCwd,
        env,
        detached: process.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    const fail = async (code: string, message: string): Promise<void> => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (signal && abortListener) {
        signal.removeEventListener('abort', abortListener);
      }
      let confirmed: boolean;
      let usage: OmpUsageSnapshot | null = null;
      try {
        await this.supervisor.writeFence(context, code);
        if (child.pid) {
          const intent = await this.supervisor.readWorkerLaunchIntent(context);
          const identity = await this.supervisor.readProcessIdentity(child.pid);
          if (intent && !intent.record && identity.state === 'running') {
            await this.supervisor.recordWorkerLaunchIdentity(
              context,
              launchNonce,
              {
                pid: child.pid,
                pgid: child.pid,
                workerStartTime: identity.startTime,
              },
            );
          }
        }
        const receipt = await this.supervisor.terminateWorker(context);
        confirmed = receipt?.confirmed === true;
        if (confirmed) {
          const record = await this.supervisor.readWorkerRecord(context);
          if (record) {
            usage = await readWorkerUsage(
              usageFilePath,
              usageNonce,
              context,
              record,
              options.maxToolCalls,
            );
            await this.supervisor.clearWorkerRecord(context);
            await this.supervisor.requestSupervisorStop(context);
          }
        }
      } catch {
        confirmed = false;
      }
      if (confirmed) {
        await cleanup();
      }
      rejectRun(
        confirmed
          ? new OmpExecutionError(code, message, usage ?? undefined)
          : new HarnessError(
              'OMP_WORKER_TERMINATION_UNCONFIRMED',
              `${message} (owned worker termination could not be authoritatively confirmed)`,
            ),
      );
    };

    const abortListener = (): void => {
      void fail(
        'OMP_WORKER_SIGNAL_ABORTED',
        'OMP worker execution aborted by signal.',
      );
    };
    if (signal) {
      signal.addEventListener('abort', abortListener, { once: true });
    }
    const timer = setTimeout(
      () => {
        void fail(
          'OMP_WORKER_DEADLINE_EXCEEDED',
          'OMP worker execution exceeded the admitted deadline.',
        );
      },
      Math.max(0, context.deadline - Date.now()),
    );

    child.stdout?.on('data', (chunk: Buffer) => {
      appendBounded(stdoutState, chunk, OMP_WORKER_LIMITS.maxStdoutBytes);
      if (stdoutState.overflow) {
        void fail(
          'OMP_WORKER_OUTPUT_LIMIT_EXCEEDED',
          'OMP worker stdout exceeded the bounded limit.',
        );
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      appendBounded(stderrState, chunk, OMP_WORKER_LIMITS.maxStderrBytes);
      if (stderrState.overflow) {
        void fail(
          'OMP_WORKER_OUTPUT_LIMIT_EXCEEDED',
          'OMP worker stderr exceeded the bounded limit.',
        );
      }
    });
    child.on('error', (error) => {
      void fail(
        'OMP_WORKER_SPAWN_FAILED',
        `Failed to spawn Bun worker: ${error.message}`,
      );
    });
    child.on('close', (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (signal && abortListener) {
        signal.removeEventListener('abort', abortListener);
      }
      void (async () => {
        let ownershipReleased = false;
        let usage: OmpUsageSnapshot | null = null;
        try {
          await this.supervisor.writeFence(context, 'WORKER_PROCESS_EXITED');
          const record = await this.supervisor.readWorkerRecord(context);
          if (!record) {
            throw new HarnessError(
              'OMP_WORKER_TERMINATION_UNCONFIRMED',
              'Worker exited before its exact registered process identity was available.',
            );
          }
          await this.supervisor.writeWorkerCompletion(context, {
            exitCode: code ?? -1,
            workerAssetSha256: workerAsset.sha256,
          });
          const stopped = await this.supervisor.terminateWorker(context);
          if (!stopped?.confirmed) {
            throw new HarnessError(
              'OMP_WORKER_TERMINATION_UNCONFIRMED',
              'Worker exited but its complete owned process group is not confirmed stopped.',
            );
          }
          usage = await readWorkerUsage(
            usageFilePath,
            usageNonce,
            context,
            record,
            options.maxToolCalls,
          );
          await this.supervisor.clearWorkerRecord(context);
          await this.supervisor.requestSupervisorStop(context);
          ownershipReleased = true;
          if (code !== 0) {
            throw new OmpExecutionError(
              'OMP_WORKER_PROCESS_FAILED',
              `OMP worker exited with code ${code}. Stderr: ${Buffer.concat(stderrState.chunks).toString('utf8')}`,
              usage ?? undefined,
            );
          }
          if (stdoutState.overflow || stderrState.overflow) {
            throw new OmpExecutionError(
              'OMP_WORKER_OUTPUT_LIMIT_EXCEEDED',
              'OMP worker output exceeded bounded limits.',
              usage ?? undefined,
            );
          }
          const parsed = OmpWorkerResultSchema.safeParse(
            this.parseJson(Buffer.concat(stdoutState.chunks).toString('utf8')),
          );
          if (!parsed.success) {
            throw new OmpExecutionError(
              'OMP_WORKER_OUTPUT_INVALID',
              `Worker result failed strict validation: ${parsed.error.issues
                .map((issue) => issue.path.join('.'))
                .join(', ')}`,
              usage ?? undefined,
            );
          }
          const result = parsed.data;
          if (
            result.attemptId !== context.attemptId ||
            result.generation !== context.generation ||
            result.role !== context.role ||
            result.runtimeDigest !== context.runtimeDigest
          ) {
            throw new OmpExecutionError(
              'OMP_WORKER_RESULT_IDENTITY_MISMATCH',
              'Worker result identity does not match the admitted execution context.',
              usage ?? undefined,
            );
          }
          if (result.toolCalls > options.maxToolCalls) {
            throw new OmpExecutionError(
              'OMP_WORKER_RESULT_ALLOWANCE_EXCEEDED',
              'Worker result exceeded the admitted tool-call allowance.',
            );
          }
          if (
            !usage?.complete ||
            usage.toolCalls !== result.toolCalls ||
            usage.costUsd !== result.costUsd
          ) {
            throw new OmpExecutionError(
              'OMP_WORKER_USAGE_INVALID',
              'Worker result does not match a final durable usage checkpoint.',
              usage ?? undefined,
            );
          }
          resolveRun(result);
        } catch (error) {
          const failure =
            error instanceof HarnessError
              ? error
              : new HarnessError('OMP_WORKER_FINALIZE_FAILED', String(error));
          rejectRun(
            ownershipReleased
              ? new OmpExecutionError(
                  failure.code,
                  failure.message,
                  usage ?? undefined,
                )
              : new HarnessError(
                  'OMP_WORKER_TERMINATION_UNCONFIRMED',
                  `Worker process group ownership could not be released (${failure.code}).`,
                ),
          );
        } finally {
          if (ownershipReleased) await cleanup();
        }
      })();
    });

    try {
      const identity = child.pid
        ? await this.supervisor.readProcessIdentity(child.pid)
        : { state: 'unknown' as const, startTime: '', command: '' };
      if (identity.state !== 'running') {
        await fail(
          'OMP_WORKER_IDENTITY_UNCONFIRMED',
          'Bun worker did not expose an observable owned process identity.',
        );
        return promise;
      }
      const record = await this.supervisor.recordWorkerLaunchIdentity(
        context,
        launchNonce,
        {
          pid: child.pid as number,
          pgid: child.pid as number,
          workerStartTime: identity.startTime,
        },
      );
      await this.supervisor.registerWorker(context, record);
      if (settled) {
        return promise;
      }
      if (signal?.aborted) {
        await fail(
          'OMP_WORKER_SIGNAL_ABORTED',
          'Execution aborted during worker registration.',
        );
        return promise;
      }
      if (Date.now() >= context.deadline) {
        await fail(
          'OMP_WORKER_DEADLINE_EXCEEDED',
          'Admitted deadline elapsed during worker registration.',
        );
        return promise;
      }
      await this.supervisor.releaseWorker(context, record, signal);
      if (settled) {
        return promise;
      }
    } catch (error) {
      await fail(
        'OMP_WORKER_REGISTRATION_FAILED',
        `Worker registration failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return promise;
    }

    return promise;
  }
}
