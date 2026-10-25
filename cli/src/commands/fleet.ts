import crypto from 'crypto';
import { Command } from 'commander';
import { constants as fsConstants } from 'fs';
import { z } from 'zod';
import fs from 'fs-extra';
import path from 'path';
import { isDarwinSystemAliasPath } from '../services/harness/runtime/IntegrationService';
import { HarnessSetupService } from '../services/harness/HarnessSetupService';
import {
  FleetCoordinator,
  resolveAuthenticatedLocalHost,
} from '../services/harness/runtime/FleetCoordinator';
import { OmpSdkExecutor } from '../services/harness/runtime/OmpSdkExecutor';
import { SandboxRunner } from '../services/harness/runtime/SandboxRunner';
import { FleetPolicyService } from '../services/harness/runtime/FleetPolicyService';
import { IntegrationService } from '../services/harness/runtime/IntegrationService';
import type { IntegrationPlanOptions } from '../services/harness/runtime/IntegrationService';
import { ReleaseService } from '../services/harness/runtime/ReleaseService';
import { formatReceiptMarker } from '../services/harness/runtime/remoteWorkerProtocol';
import { RuntimeStore } from '../services/harness/runtime/RuntimeStore';
import {
  computeRuntimeManifestDigest,
  createRuntimeManifest,
  RUNTIME_CLOSURE_LIMITS,
  RuntimeClosureManifestSchema,
  RuntimeManifestInputSchema,
} from '../services/harness/runtime/RuntimeManifest';
import type {
  RuntimeManifestInput,
  RuntimeClosureManifest,
} from '../services/harness/runtime/RuntimeManifest';
import {
  EvaluationRecordSchema,
  FleetConfig,
  FleetRuntimeConfig,
  FleetRuntimeConfigSchema,
  FleetTask,
  FrozenEvaluationPlanSchema,
  HarnessBundle,
  HarnessBundleSchema,
  HarnessError,
  parseFleetConfig,
  parseFleetTask,
  policyDigest,
  SignedApproval,
  SignedApprovalSchema,
} from '../services/harness/runtime/RuntimeTypes';

import { sanitizeError } from './harness';

export interface FleetCommonOptions {
  stateDir?: string;
}

export interface FleetConfigureOptions extends FleetCommonOptions {
  file: string;
}

export interface FleetRunOptions extends FleetCommonOptions {
  file: string;
  execute?: boolean;
  releaseDigest?: string;
}

export interface FleetCancelOptions extends FleetCommonOptions {
  attemptId: string;
}

export interface FleetEvaluateOptions extends FleetCommonOptions {
  planDigest?: string;
  file?: string;
  execute?: boolean;
}

export interface FleetFileOptions extends FleetCommonOptions {
  file: string;
}

export interface FleetIntegrationOptions extends FleetCommonOptions {
  apply?: boolean;
  paseoHome?: string;
  ompBinary?: string;
  cliPath?: string;
  nodeCommand?: string;
  ompRuntimeCommand?: string;
  ompVersion?: string;
}

export interface FleetContextOptions extends FleetCommonOptions {
  cwd?: string;
  platform?: string;
  ompVersion?: string;
  /** Metadata-only canonical scope lookup; never reads release pins. */
  scopeOnly?: boolean;
}

export interface FleetRuntimePinOptions extends FleetCommonOptions {
  file: string;
  apply?: boolean;
}

export interface FleetRuntimePinResult {
  applied: boolean;
  manifestFile: string;
  manifestDigest?: string;
  runtime?: FleetRuntimeConfig;
  existingManifestDigest?: string | null;
  expectedManifestDigest?: string | null;
  action?: 'create' | 'replace' | 'noop';
}

export interface FleetWorkerOptions extends FleetCommonOptions {
  request?: string;
  control?: string;
}

export interface FleetCommandDependencies {
  storeFactory?: (stateDir?: string) => RuntimeStore;
  policyServiceFactory?: (store: RuntimeStore) => FleetPolicyService;
  coordinatorFactory?: (store: RuntimeStore) => FleetCoordinator;
  releaseServiceFactory?: (store: RuntimeStore) => ReleaseService;
  integrationServiceFactory?: (store: RuntimeStore) => IntegrationService;
  runtimeManifestFactory?: (input: RuntimeManifestInput) => Promise<{
    manifest: RuntimeClosureManifest;
    runtime: FleetRuntimeConfig;
    manifestDigest: string;
  }>;
  exitFn?: (code: number) => void;
  printFn?: (msg: string) => void;
}

export const MAX_FLEET_INPUT_SIZE = 10 * 1024 * 1024; // 10 MiB limit
export const MAX_WORKER_ENCODED_SIZE = 2 * 1024 * 1024; // 2 MiB encoded argv limit

function integrationOptionsFrom(
  options: FleetIntegrationOptions,
): Pick<
  IntegrationPlanOptions,
  | 'paseoHome'
  | 'ompBinary'
  | 'cliPath'
  | 'nodeCommand'
  | 'ompRuntimeCommand'
  | 'ompVersion'
> {
  return {
    paseoHome: options.paseoHome,
    ompBinary: options.ompBinary,
    cliPath: options.cliPath,
    nodeCommand: options.nodeCommand,
    ompRuntimeCommand: options.ompRuntimeCommand,
    ompVersion: options.ompVersion,
  };
}

/**
 * Reads and parses a bounded regular JSON file from its opened descriptor.
 * Rejects symlinks, non-regular files (FIFOs, sockets), oversized content, and
 * invalid JSON without echoing input excerpts. The descriptor metadata is
 * authoritative, so a path swapped after a precheck cannot block on a FIFO.
 */
export async function readBoundedJsonFile<T = unknown>(
  inputPath: string,
  maxBytes = MAX_FLEET_INPUT_SIZE,
): Promise<T> {
  const resolved = path.resolve(inputPath);
  let handle: fs.promises.FileHandle;
  try {
    // O_NONBLOCK prevents a FIFO from blocking at open; the descriptor check is
    // authoritative and runs before any read.
    handle = await fs.promises.open(
      resolved,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK,
    );
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
    if (code === 'ENOENT') {
      throw new HarnessError('FILE_NOT_FOUND', `File not found: "${resolved}"`);
    }
    throw new HarnessError(
      'INVALID_INPUT',
      `Path must be a regular file: "${resolved}"`,
    );
  }

  try {
    const stat = await handle.stat();
    if (!stat.isFile()) {
      throw new HarnessError(
        'INVALID_INPUT',
        `Path must be a regular file: "${resolved}"`,
      );
    }
    if (stat.size > maxBytes) {
      throw new HarnessError(
        'INPUT_TOO_LARGE',
        `File exceeds maximum allowed size of ${maxBytes} bytes (size: ${stat.size})`,
      );
    }
    const chunks: Buffer[] = [];
    let total = 0;
    const buffer = Buffer.alloc(Math.min(64 * 1024, maxBytes + 1));
    for (;;) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) {
        break;
      }
      total += bytesRead;
      if (total > maxBytes) {
        throw new HarnessError(
          'INPUT_TOO_LARGE',
          `File exceeds maximum allowed size of ${maxBytes} bytes`,
        );
      }
      chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
    }
    try {
      return JSON.parse(Buffer.concat(chunks, total).toString('utf8')) as T;
    } catch {
      throw new HarnessError(
        'INVALID_JSON',
        `File "${resolved}" is not valid JSON`,
      );
    }
  } finally {
    await handle.close();
  }
}

interface ExistingRuntimeManifest {
  manifest: RuntimeClosureManifest;
  bytes: Buffer;
  mode: number;
}

async function readOwnedRuntimeManifest(
  manifestPath: string,
): Promise<ExistingRuntimeManifest | null> {
  let handle: fs.promises.FileHandle;
  try {
    handle = await fs.promises.open(
      manifestPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK,
    );
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      err.code === 'ENOENT'
    )
      return null;
    throw new HarnessError(
      'UNOWNED_RUNTIME_MANIFEST',
      'Existing runtime manifest is not safely readable.',
    );
  }
  try {
    const stat = await handle.stat();
    if (
      !stat.isFile() ||
      stat.uid !== process.getuid?.() ||
      (stat.mode & 0o777) !== 0o600
    ) {
      throw new HarnessError(
        'UNOWNED_RUNTIME_MANIFEST',
        'Existing manifest must be an owned private regular file.',
      );
    }
    if (stat.size > RUNTIME_CLOSURE_LIMITS.maxManifestBytes) {
      throw new HarnessError(
        'INVALID_RUNTIME_MANIFEST',
        'Existing runtime manifest exceeds the size limit.',
      );
    }
    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const remaining = RUNTIME_CLOSURE_LIMITS.maxManifestBytes + 1 - total;
      const buffer = Buffer.alloc(Math.min(64 * 1024, remaining));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > RUNTIME_CLOSURE_LIMITS.maxManifestBytes) {
        throw new HarnessError(
          'INVALID_RUNTIME_MANIFEST',
          'Existing runtime manifest exceeds the size limit.',
        );
      }
      chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
    }
    const bytes = Buffer.concat(chunks, total);
    let manifest: RuntimeClosureManifest;
    try {
      manifest = RuntimeClosureManifestSchema.parse(
        JSON.parse(bytes.toString('utf8')),
      );
    } catch {
      throw new HarnessError(
        'INVALID_RUNTIME_MANIFEST',
        'Existing runtime manifest is invalid.',
      );
    }
    if (computeRuntimeManifestDigest(manifest) !== manifest.runtimeDigest) {
      throw new HarnessError(
        'INVALID_RUNTIME_MANIFEST',
        'Existing runtime manifest digest is invalid.',
      );
    }
    return { manifest, bytes, mode: stat.mode & 0o777 };
  } finally {
    await handle.close();
  }
}

async function writeRuntimeManifestCas(
  manifestPath: string,
  manifestBytes: Buffer,
  expectedDigest: string | null,
  previous: ExistingRuntimeManifest | null,
): Promise<void> {
  if (manifestBytes.byteLength > RUNTIME_CLOSURE_LIMITS.maxManifestBytes) {
    throw new HarnessError(
      'INVALID_RUNTIME_MANIFEST',
      'Runtime manifest exceeds the size limit.',
    );
  }
  const lockPath = `${manifestPath}.ags-lock`;
  let lock: fs.promises.FileHandle;
  try {
    lock = await fs.promises.open(lockPath, 'wx', 0o600);
  } catch {
    throw new HarnessError(
      'MANIFEST_WRITE_LOCKED',
      'Runtime manifest is being updated by another process.',
    );
  }
  const tempPath = `${manifestPath}.${crypto.randomBytes(16).toString('hex')}.tmp`;
  try {
    const current = await readOwnedRuntimeManifest(manifestPath);
    if (
      (previous === null && current !== null) ||
      (previous !== null &&
        (!current ||
          current.manifest.runtimeDigest !== expectedDigest ||
          !current.bytes.equals(previous.bytes) ||
          current.mode !== previous.mode))
    ) {
      throw new HarnessError(
        'MANIFEST_DIGEST_MISMATCH',
        'Runtime manifest changed after planning.',
      );
    }
    const file = await fs.promises.open(tempPath, 'wx', 0o600);
    try {
      await file.writeFile(manifestBytes);
      await file.sync();
    } finally {
      await file.close();
    }
    if (previous === null) {
      await fs.promises.link(tempPath, manifestPath);
      await fs.promises.unlink(tempPath);
    } else {
      const latest = await readOwnedRuntimeManifest(manifestPath);
      if (
        !latest ||
        !latest.bytes.equals(previous.bytes) ||
        latest.manifest.runtimeDigest !== expectedDigest
      ) {
        throw new HarnessError(
          'MANIFEST_DIGEST_MISMATCH',
          'Runtime manifest changed before replacement.',
        );
      }
      await fs.promises.rename(tempPath, manifestPath);
    }
    const directory = await fs.promises.open(
      path.dirname(manifestPath),
      fsConstants.O_RDONLY,
    );
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  } finally {
    await fs.promises.unlink(tempPath).catch(() => undefined);
    await lock.close();
    await fs.promises.unlink(lockPath).catch(() => undefined);
  }
}

export interface FleetEvaluationInput {
  schemaVersion: 1;
  id: string;
  tasks: FleetTask[];
  releaseDigest: string;
  runId?: string;
  budgetId?: string;
}

const EvaluationInputEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).max(256),
    tasks: z.array(z.unknown()).min(1).max(64),
    releaseDigest: z.string().min(1).max(256),
    runId: z.string().min(1).max(256).optional(),
    budgetId: z.string().min(1).max(256).optional(),
  })
  .strict();

/**
 * Parses the multi-task heldout evaluation input envelope and every task with
 * the strict FleetTask schema.
 */
export function parseFleetEvaluationInput(raw: unknown): FleetEvaluationInput {
  const envelope = EvaluationInputEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    throw new HarnessError(
      'INVALID_EVALUATION_INPUT',
      'Evaluation input must be {schemaVersion:1,id,tasks[],releaseDigest,runId?,budgetId?}',
    );
  }
  return {
    schemaVersion: 1,
    id: envelope.data.id,
    releaseDigest: envelope.data.releaseDigest,
    ...(envelope.data.runId !== undefined
      ? { runId: envelope.data.runId }
      : {}),
    ...(envelope.data.budgetId !== undefined
      ? { budgetId: envelope.data.budgetId }
      : {}),
    tasks: envelope.data.tasks.map((task) => parseFleetTask(task)),
  };
}

const EvaluationFieldsSchema = z
  .object({
    eligible: z.boolean(),
    reasonCodes: z.array(z.string().max(256)).max(256).default([]),
    criticalRegressions: z.array(z.string().max(256)).max(256).optional(),
    projects: z.array(z.string().max(256)).max(256).optional(),
  })
  .passthrough();

const EvaluationAttemptSummarySchema = z
  .object({
    logicalProjectId: z.string().min(1).max(256),
    state: z.enum(['completed', 'unresolved', 'blocked', 'recovered']),
    baselinePassed: z.boolean(),
    candidatePassed: z.boolean(),
    attemptIds: z.tuple([
      z.string().min(1).max(256),
      z.string().min(1).max(256),
    ]),
  })
  .strict();

const EvaluationCaseSchema = z
  .object({
    caseId: z.string().min(1).max(256).optional(),
    taskDigest: z.string().min(1).max(256),
    hostId: z.string().min(1).max(256),
    projectId: z.string().min(1).max(256),
    logicalProjectId: z.string().min(1).max(256),
    baselineAttemptId: z.string().min(1).max(256).optional(),
    candidateAttemptId: z.string().min(1).max(256).optional(),
  })
  .strict();

interface SanitizedEvaluationFields {
  eligible: boolean;
  reasonCodes: string[];
  criticalRegressions: string[];
  projects: string[];
}

function sanitizeEvaluationFields(
  value: unknown,
): SanitizedEvaluationFields | null {
  const parsed = EvaluationFieldsSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }
  return {
    eligible: parsed.data.eligible,
    reasonCodes: parsed.data.reasonCodes,
    criticalRegressions: parsed.data.criticalRegressions ?? [],
    projects: parsed.data.projects ?? [],
  };
}

interface SanitizedAttemptSummary {
  logicalProjectId: string;
  state: string;
  baselinePassed: boolean | null;
  candidatePassed: boolean | null;
  attemptIds: string[];
}

function sanitizeAttemptSummary(
  value: unknown,
): SanitizedAttemptSummary | null {
  const parsed = EvaluationAttemptSummarySchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }
  return {
    logicalProjectId: parsed.data.logicalProjectId,
    state: parsed.data.state,
    baselinePassed: parsed.data.baselinePassed,
    candidatePassed: parsed.data.candidatePassed,
    attemptIds: parsed.data.attemptIds,
  };
}

interface SanitizedEvaluationCase {
  caseId?: string;
  taskDigest: string;
  hostId: string;
  projectId: string;
  logicalProjectId: string;
  baselineAttemptId?: string;
  candidateAttemptId?: string;
}

function sanitizeEvaluationCase(
  value: unknown,
): SanitizedEvaluationCase | null {
  const parsed = EvaluationCaseSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }
  return {
    ...(parsed.data.caseId ? { caseId: parsed.data.caseId } : {}),
    taskDigest: parsed.data.taskDigest,
    hostId: parsed.data.hostId,
    projectId: parsed.data.projectId,
    logicalProjectId: parsed.data.logicalProjectId,
    ...(parsed.data.baselineAttemptId
      ? { baselineAttemptId: parsed.data.baselineAttemptId }
      : {}),
    ...(parsed.data.candidateAttemptId
      ? { candidateAttemptId: parsed.data.candidateAttemptId }
      : {}),
  };
}

const EvaluationTasksResultSchema = z
  .object({
    mode: z.enum(['preview', 'executed', 'resumed']),
    planDigest: z.string().min(1).max(256).optional(),
    draftDigest: z.string().min(1).max(256).optional(),
    draft: z.boolean(),
    cases: z.array(EvaluationCaseSchema).min(1).max(256),
    evaluation: EvaluationRecordSchema.optional(),
    attemptsSummary: z
      .array(EvaluationAttemptSummarySchema)
      .min(1)
      .max(256)
      .optional(),
  })
  .strict()
  .superRefine((result, ctx) => {
    if (result.mode === 'preview') {
      if (
        !result.draft ||
        !result.draftDigest ||
        result.planDigest !== undefined ||
        result.evaluation !== undefined ||
        result.attemptsSummary !== undefined ||
        result.cases.some(
          (entry) =>
            entry.baselineAttemptId !== undefined ||
            entry.candidateAttemptId !== undefined,
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid draft evaluation result',
        });
      }
      return;
    }
    if (
      result.draft ||
      !result.planDigest ||
      result.draftDigest !== undefined ||
      !result.evaluation ||
      !result.attemptsSummary ||
      result.cases.some(
        (entry) =>
          !entry.caseId ||
          !entry.baselineAttemptId ||
          !entry.candidateAttemptId,
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid executed evaluation result',
      });
    }
  });
const EvaluatePlanResultSchema = z
  .object({
    mode: z.enum(['preview', 'executed']),
    planDigest: z.string().min(1).max(256),
    plan: FrozenEvaluationPlanSchema,
    evaluation: EvaluationRecordSchema.optional(),
    attemptsSummary: z
      .array(EvaluationAttemptSummarySchema)
      .min(1)
      .max(256)
      .optional(),
  })
  .strict()
  .superRefine((result, ctx) => {
    if (result.mode === 'preview') {
      if (
        result.evaluation !== undefined ||
        result.attemptsSummary !== undefined
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Preview plan result cannot contain execution results',
        });
      }
      return;
    }
    if (!result.evaluation || !result.attemptsSummary) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Executed plan result is incomplete',
      });
    }
  });
function isUnresolvedEvaluationAttempt(
  attempt: SanitizedAttemptSummary,
): boolean {
  return attempt.state === 'unresolved' || attempt.state === 'blocked';
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

function configureCommandOutput(
  cmd: Command,
  printFn: (msg: string) => void,
  exitFn: (code: number) => void,
): void {
  cmd.exitOverride((err) => {
    if (
      err.code === 'commander.helpDisplayed' ||
      err.code === 'commander.version'
    ) {
      return;
    }
    exitFn(err.exitCode || 1);
    throw err;
  });

  cmd.configureOutput({
    writeOut: (str) => {
      process.stdout.write(str);
    },
    writeErr: () => {
      // Suppress duplicate text on stderr
    },
    outputError: (str) => {
      const cleaned = str.replace(/^error:\s*/i, '').trim();
      printFn(JSON.stringify({ error: sanitizeError(cleaned) }, null, 2));
      exitFn(1);
    },
  });
}

export class FleetCommand {
  private readonly storeFactory: (stateDir?: string) => RuntimeStore;
  private readonly policyServiceFactory: (
    store: RuntimeStore,
  ) => FleetPolicyService;
  private readonly coordinatorFactory: (
    store: RuntimeStore,
  ) => FleetCoordinator;
  private readonly coordinatorFactoryInjected: boolean;
  private readonly releaseServiceFactory: (
    store: RuntimeStore,
  ) => ReleaseService;
  private readonly integrationServiceFactory: (
    store: RuntimeStore,
  ) => IntegrationService;
  private readonly runtimeManifestFactory: (
    input: RuntimeManifestInput,
  ) => Promise<{
    manifest: RuntimeClosureManifest;
    runtime: FleetRuntimeConfig;
    manifestDigest: string;
  }>;
  private readonly exitFn: (code: number) => void;
  private readonly printFn: (msg: string) => void;

  constructor(deps?: FleetCommandDependencies) {
    this.storeFactory =
      deps?.storeFactory ??
      ((stateDir) => {
        const setup = new HarnessSetupService(stateDir);
        return new RuntimeStore(setup.stateDir, setup);
      });
    this.policyServiceFactory =
      deps?.policyServiceFactory ?? ((store) => new FleetPolicyService(store));
    this.coordinatorFactoryInjected = deps?.coordinatorFactory !== undefined;
    this.coordinatorFactory =
      deps?.coordinatorFactory ?? ((store) => new FleetCoordinator(store));
    this.releaseServiceFactory =
      deps?.releaseServiceFactory ?? ((store) => new ReleaseService(store));
    this.integrationServiceFactory =
      deps?.integrationServiceFactory ??
      ((store) => new IntegrationService(store));
    this.runtimeManifestFactory =
      deps?.runtimeManifestFactory ?? createRuntimeManifest;
    this.exitFn =
      deps?.exitFn ??
      ((code) => {
        process.exitCode = code;
      });
    this.printFn =
      deps?.printFn ??
      ((msg) => {
        console.log(msg);
      });
  }

  private async createCoordinator(
    store: RuntimeStore,
  ): Promise<FleetCoordinator> {
    if (this.coordinatorFactoryInjected) return this.coordinatorFactory(store);
    const policyService = this.policyServiceFactory(store);
    const config = await policyService.load();
    const identity = await resolveAuthenticatedLocalHost(config);
    const dependencies = identity.runtime
      ? {
          policyService,
          runner: new SandboxRunner(identity.runtime),
          ompExecutor: new OmpSdkExecutor(identity.runtime),
        }
      : { policyService };
    return new FleetCoordinator(store, dependencies);
  }

  printJson(data: unknown): void {
    this.printFn(JSON.stringify(data, null, 2));
  }

  exit(code: number): void {
    this.exitFn(code);
  }

  private handleError(err: unknown): void {
    this.exit(1);
    if (err instanceof z.ZodError) {
      // Never echo received values: report stable issue paths only.
      const paths = err.issues
        .map((issue) => issue.path.join('.'))
        .filter((pathValue) => pathValue.length > 0)
        .join(', ');
      this.printJson({
        success: false,
        error: paths ? `Invalid input for: ${paths}` : 'Invalid input',
        code: 'INVALID_INPUT',
      });
      return;
    }
    const isHarnessError = err instanceof HarnessError;
    const message = isHarnessError
      ? sanitizeError(err)
      : 'Unexpected failure during fleet command execution';
    const code = isHarnessError ? err.code : 'UNKNOWN_ERROR';
    this.printJson({ success: false, error: message, code });
  }

  async configure(options: FleetConfigureOptions): Promise<void> {
    if (!options.file) {
      this.exit(1);
      this.printJson({ error: 'Missing required option: --file <path>' });
      return;
    }

    try {
      const data = await readBoundedJsonFile(options.file);
      const config: FleetConfig = parseFleetConfig(data);
      const store = this.storeFactory(options.stateDir);
      const policyService = this.policyServiceFactory(store);

      await policyService.configure(config);

      this.printJson({
        success: true,
        generation: config.generation,
        policyDigest: policyDigest(config),
      });
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async doctor(options: FleetCommonOptions): Promise<void> {
    try {
      const store = this.storeFactory(options.stateDir);
      const coordinator = await this.createCoordinator(store);
      const report = await coordinator.doctor();
      this.printJson(report);
      if (!report.supported) {
        this.exit(1);
      }
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async status(options: FleetCommonOptions): Promise<void> {
    try {
      const store = this.storeFactory(options.stateDir);
      const coordinator = await this.createCoordinator(store);
      const report = await coordinator.status();
      this.printJson(report);
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async run(options: FleetRunOptions): Promise<void> {
    if (!options.file) {
      this.exit(1);
      this.printJson({ error: 'Missing required option: --file <path>' });
      return;
    }

    try {
      const data = await readBoundedJsonFile(options.file);
      const task: FleetTask = parseFleetTask(data);
      const store = this.storeFactory(options.stateDir);
      const coordinator = await this.createCoordinator(store);

      if (options.execute) {
        const result = await coordinator.run(
          task,
          options.releaseDigest ? { releaseDigest: options.releaseDigest } : {},
        );
        this.printJson(result);
        if (
          ('passed' in result && result.passed === false) ||
          ('outcome' in result && result.outcome === 'denied')
        ) {
          this.exit(1);
        }
      } else {
        const plan = await coordinator.plan(task);
        this.printJson(plan);
        if (
          plan &&
          typeof plan === 'object' &&
          'ready' in plan &&
          !plan.ready
        ) {
          this.exit(1);
        }
      }
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async cancel(options: FleetCancelOptions): Promise<void> {
    if (!options.attemptId) {
      this.exit(1);
      this.printJson({ error: 'Missing required option: --attempt-id <id>' });
      return;
    }

    try {
      const store = this.storeFactory(options.stateDir);
      const coordinator = await this.createCoordinator(store);
      const result = await coordinator.cancel(options.attemptId);
      this.printJson(result);
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async reconcile(options: FleetCommonOptions): Promise<void> {
    try {
      const store = this.storeFactory(options.stateDir);
      const coordinator = await this.createCoordinator(store);
      const result = await coordinator.reconcile();
      this.printJson(result);
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async evaluate(options: FleetEvaluateOptions): Promise<void> {
    const filePath = options.file;
    const planDigest = options.planDigest;
    const hasFile = typeof filePath === 'string' && filePath.length > 0;
    const hasDigest = typeof planDigest === 'string' && planDigest.length > 0;

    if (hasFile === hasDigest) {
      this.exit(1);
      this.printJson({
        success: false,
        code: 'INVALID_ARGUMENTS',
        error:
          'Provide exactly one of --file <input.json> or --plan-digest <digest>',
      });
      return;
    }

    try {
      const store = this.storeFactory(options.stateDir);
      let coordinator: FleetCoordinator;
      const execute = Boolean(options.execute);

      if (typeof filePath === 'string' && filePath.length > 0) {
        const rawInput = await readBoundedJsonFile(filePath);
        const input = parseFleetEvaluationInput(rawInput);
        coordinator = await this.createCoordinator(store);
        const rawResult: unknown = await coordinator.evaluateTasks(input, {
          execute,
        });
        const parsed = EvaluationTasksResultSchema.safeParse(rawResult);
        if (!parsed.success) {
          throw new HarnessError(
            'INVALID_COORDINATOR_RESULT',
            'evaluateTasks returned an unexpected result shape',
          );
        }

        const cases = parsed.data.cases
          .map(sanitizeEvaluationCase)
          .filter(isPresent);
        const attempts = (parsed.data.attemptsSummary ?? [])
          .map(sanitizeAttemptSummary)
          .filter(isPresent);
        const evaluation = sanitizeEvaluationFields(parsed.data.evaluation);

        if (parsed.data.mode === 'preview') {
          this.printJson({
            mode: 'preview',
            draft: true,
            draftDigest: parsed.data.draftDigest,
            cases: cases.map((entry) => ({
              ...(entry.caseId ? { caseId: entry.caseId } : {}),
              taskDigest: entry.taskDigest,
              hostId: entry.hostId,
              projectId: entry.projectId,
              logicalProjectId: entry.logicalProjectId,
            })),
          });
          return;
        }

        this.printJson({
          mode: parsed.data.mode,
          planDigest: parsed.data.planDigest,
          cases,
          evaluation,
          attemptsSummary: attempts,
        });

        if (
          evaluation?.eligible === false ||
          attempts.some(isUnresolvedEvaluationAttempt)
        ) {
          this.exit(1);
        }
        return;
      }

      coordinator = await this.createCoordinator(store);
      if (typeof planDigest === 'string' && planDigest.length > 0) {
        const rawResult: unknown = await coordinator.evaluatePlan(planDigest, {
          execute,
        });
        const parsed = EvaluatePlanResultSchema.safeParse(rawResult);
        if (!parsed.success) {
          throw new HarnessError(
            'INVALID_COORDINATOR_RESULT',
            'evaluatePlan returned an unexpected result shape',
          );
        }
        const evaluation = sanitizeEvaluationFields(parsed.data.evaluation);
        const cases = parsed.data.plan.cases
          .map((entry) =>
            sanitizeEvaluationCase({
              caseId: entry.id,
              taskDigest: entry.taskDigest,
              hostId: entry.hostId,
              projectId: entry.projectId,
              logicalProjectId: entry.logicalProjectId,
              baselineAttemptId: entry.baselineAttemptId,
              candidateAttemptId: entry.candidateAttemptId,
            }),
          )
          .filter(isPresent);
        if (parsed.data.mode === 'preview') {
          this.printJson({
            mode: 'preview',
            planDigest: parsed.data.planDigest,
            cases: cases.map(
              ({
                caseId,
                taskDigest,
                hostId,
                projectId,
                logicalProjectId,
              }) => ({
                caseId,
                taskDigest,
                hostId,
                projectId,
                logicalProjectId,
              }),
            ),
          });
          return;
        }

        const attempts = (parsed.data.attemptsSummary ?? [])
          .map(sanitizeAttemptSummary)
          .filter(isPresent);
        this.printJson({
          mode: parsed.data.mode,
          planDigest: parsed.data.planDigest,
          cases,
          evaluation,
          attemptsSummary: attempts,
        });
        if (
          evaluation?.eligible === false ||
          attempts.some(isUnresolvedEvaluationAttempt)
        ) {
          this.exit(1);
        }
      }
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async releasePropose(options: FleetFileOptions): Promise<void> {
    if (!options.file) {
      this.exit(1);
      this.printJson({ error: 'Missing required option: --file <path>' });
      return;
    }

    try {
      const data = await readBoundedJsonFile(options.file);
      const bundle: HarnessBundle = HarnessBundleSchema.parse(data);

      const store = this.storeFactory(options.stateDir);
      const releaseService = this.releaseServiceFactory(store);
      const result = await releaseService.propose(bundle);
      this.printJson(result);
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async releaseActivate(options: FleetFileOptions): Promise<void> {
    if (!options.file) {
      this.exit(1);
      this.printJson({ error: 'Missing required option: --file <path>' });
      return;
    }

    try {
      const data = await readBoundedJsonFile(options.file);
      const approval: SignedApproval = SignedApprovalSchema.parse(data);

      if (approval.payload.action !== 'activate') {
        throw new HarnessError(
          'INVALID_APPROVAL_ACTION',
          `Approval action must be "activate", got "${approval.payload.action}"`,
        );
      }

      const store = this.storeFactory(options.stateDir);
      const releaseService = this.releaseServiceFactory(store);
      await releaseService.activate(approval);
      this.printJson({
        success: true,
        action: 'activate',
        releaseDigest: approval.payload.releaseDigest,
        rollout: approval.payload.rollout,
      });
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async releaseRollback(options: FleetFileOptions): Promise<void> {
    if (!options.file) {
      this.exit(1);
      this.printJson({ error: 'Missing required option: --file <path>' });
      return;
    }

    try {
      const data = await readBoundedJsonFile(options.file);
      const approval: SignedApproval = SignedApprovalSchema.parse(data);

      if (approval.payload.action !== 'rollback') {
        throw new HarnessError(
          'INVALID_APPROVAL_ACTION',
          `Approval action must be "rollback", got "${approval.payload.action}"`,
        );
      }

      const store = this.storeFactory(options.stateDir);
      const releaseService = this.releaseServiceFactory(store);
      await releaseService.rollback(approval);
      this.printJson({
        success: true,
        action: 'rollback',
        releaseDigest: approval.payload.releaseDigest,
      });
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async releaseWithdraw(options: FleetFileOptions): Promise<void> {
    if (!options.file) {
      this.exit(1);
      this.printJson({ error: 'Missing required option: --file <path>' });
      return;
    }

    try {
      const data = await readBoundedJsonFile(options.file);
      const approval: SignedApproval = SignedApprovalSchema.parse(data);

      if (approval.payload.action !== 'withdraw') {
        throw new HarnessError(
          'INVALID_APPROVAL_ACTION',
          `Approval action must be "withdraw", got "${approval.payload.action}"`,
        );
      }

      const store = this.storeFactory(options.stateDir);
      const releaseService = this.releaseServiceFactory(store);
      await releaseService.withdraw(approval);
      this.printJson({
        success: true,
        action: 'withdraw',
        releaseDigest: approval.payload.releaseDigest,
      });
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async releaseStatus(options: FleetCommonOptions): Promise<void> {
    try {
      const store = this.storeFactory(options.stateDir);
      const releaseService = this.releaseServiceFactory(store);
      const status = await releaseService.status();
      this.printJson(status);
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async runtimePin(options: FleetRuntimePinOptions): Promise<void> {
    if (!options.file) {
      this.exit(1);
      this.printJson({
        error: 'Missing required option: --file <runtime-spec>',
      });
      return;
    }

    try {
      const input = RuntimeManifestInputSchema.parse(
        await readBoundedJsonFile(options.file),
      );
      const store = this.storeFactory(options.stateDir);
      const stateRoot = path.resolve(store.stateDir);
      const manifestPath = path.resolve(input.manifestFile);
      if (
        manifestPath === stateRoot ||
        !manifestPath.startsWith(`${stateRoot}${path.sep}`)
      ) {
        throw new HarnessError(
          'INVALID_MANIFEST_PATH',
          'manifestFile must be inside the private fleet state directory.',
        );
      }
      const rootStat = await fs.promises.lstat(stateRoot);
      if (
        !rootStat.isDirectory() ||
        rootStat.isSymbolicLink() ||
        rootStat.uid !== process.getuid?.() ||
        (rootStat.mode & 0o077) !== 0
      ) {
        throw new HarnessError(
          'UNSAFE_STATE_DIRECTORY',
          'Fleet state directory must be a private owned real directory.',
        );
      }
      const parentPath = path.dirname(manifestPath);
      const realRoot = await fs.realpath(stateRoot);
      const realParent = await fs.realpath(parentPath);
      const rootAliasAllowed = isDarwinSystemAliasPath(stateRoot, realRoot);
      const parentAliasAllowed = isDarwinSystemAliasPath(
        parentPath,
        realParent,
      );
      if (
        (realRoot !== stateRoot && !rootAliasAllowed) ||
        (realParent !== parentPath && !parentAliasAllowed) ||
        (realParent !== realRoot &&
          !realParent.startsWith(`${realRoot}${path.sep}`))
      ) {
        throw new HarnessError(
          'INVALID_MANIFEST_PATH',
          'Manifest path must not traverse symlinks.',
        );
      }
      const parentStat = await fs.promises.lstat(parentPath);
      if (
        !parentStat.isDirectory() ||
        parentStat.isSymbolicLink() ||
        parentStat.uid !== process.getuid?.() ||
        (parentStat.mode & 0o077) !== 0
      ) {
        throw new HarnessError(
          'UNSAFE_MANIFEST_DIRECTORY',
          'Manifest parent must be a private owned real directory.',
        );
      }

      const prior = await readOwnedRuntimeManifest(manifestPath);
      const existingDigest = prior?.manifest.runtimeDigest ?? null;
      const expectedDigest = input.expectedManifestDigest ?? null;
      const action = existingDigest === null ? 'create' : 'replace';

      if (
        (existingDigest === null && expectedDigest !== null) ||
        (existingDigest !== null && existingDigest !== expectedDigest)
      ) {
        throw new HarnessError(
          'MANIFEST_DIGEST_MISMATCH',
          'Existing runtime manifest requires an exact expectedManifestDigest before repinning.',
        );
      }
      if (!options.apply) {
        this.printJson({
          applied: false,
          manifestFile: manifestPath,
          action,
          existingManifestDigest: existingDigest,
          expectedManifestDigest: expectedDigest,
        });
        return;
      }

      const built = await this.runtimeManifestFactory(input);
      const manifest = RuntimeClosureManifestSchema.parse(built.manifest);
      const runtime = FleetRuntimeConfigSchema.parse(built.runtime);
      if (
        computeRuntimeManifestDigest(manifest) !== manifest.runtimeDigest ||
        manifest.runtimeDigest !== built.manifestDigest ||
        runtime.manifestDigest !== built.manifestDigest ||
        runtime.sdkDigest !== manifest.sdk.moduleSha256 ||
        path.resolve(runtime.manifestFile) !== manifestPath
      ) {
        throw new HarnessError(
          'INVALID_RUNTIME_MANIFEST',
          'Runtime manifest digest validation failed.',
        );
      }
      const manifestBytes = Buffer.from(
        `${JSON.stringify(manifest, null, 2)}\n`,
        'utf8',
      );
      await writeRuntimeManifestCas(
        manifestPath,
        manifestBytes,
        existingDigest,
        prior,
      );
      this.printJson({
        applied: true,
        action,
        manifestFile: manifestPath,
        manifestDigest: built.manifestDigest,
        runtime,
      });
    } catch (err: unknown) {
      this.handleError(err);
    }
  }
  async integrationPlan(options: FleetIntegrationOptions): Promise<void> {
    try {
      const store = this.storeFactory(options.stateDir);
      const integrationService = this.integrationServiceFactory(store);
      const plan = await integrationService.plan(
        integrationOptionsFrom(options),
      );
      this.printJson(plan);
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async integrationInstall(options: FleetIntegrationOptions): Promise<void> {
    try {
      const store = this.storeFactory(options.stateDir);
      const integrationService = this.integrationServiceFactory(store);
      const result = await integrationService.install({
        ...integrationOptionsFrom(options),
        apply: Boolean(options.apply),
      });
      this.printJson(result);
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async integrationUninstall(options: FleetIntegrationOptions): Promise<void> {
    try {
      const store = this.storeFactory(options.stateDir);
      const integrationService = this.integrationServiceFactory(store);
      const result = await integrationService.uninstall({
        apply: Boolean(options.apply),
      });
      this.printJson(result);
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async context(options: FleetContextOptions): Promise<void> {
    try {
      const store = this.storeFactory(options.stateDir);
      const integrationService = this.integrationServiceFactory(store);
      const targetCwd = options.cwd ?? process.cwd();

      if (options.scopeOnly) {
        const scope = await integrationService.resolveScope(targetCwd);
        if (scope) {
          this.printJson({ success: true, scope });
        } else {
          this.printJson({
            success: false,
            scope: null,
            reason: 'NO_LOCAL_SCOPE',
          });
        }
        return;
      }

      const targetPlatform = options.platform ?? process.platform;
      const targetOmpVersion = options.ompVersion;
      if (!targetOmpVersion) {
        this.exit(1);
        this.printJson({
          success: false,
          context: null,
          reason: 'MISSING_OMP_VERSION',
        });
        return;
      }

      const result = await integrationService.context(
        targetCwd,
        targetPlatform,
        targetOmpVersion,
      );
      if (result) {
        this.printJson({ success: true, context: result });
      } else {
        this.printJson({
          success: false,
          context: null,
          reason: 'NO_COMPATIBLE_RELEASE_OR_UNAUTHORIZED',
        });
      }
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  async worker(options: FleetWorkerOptions): Promise<void> {
    if (!options.stateDir) {
      this.exit(1);
      this.printJson({ error: 'Missing required option: --state-dir <path>' });
      return;
    }

    // Require strict XOR between request and control
    if (
      (options.request && options.control) ||
      (!options.request && !options.control)
    ) {
      this.exit(1);
      this.printJson({
        success: false,
        error:
          'Worker requires exactly one of --request <encoded> or --control <encoded>',
        code: 'INVALID_WORKER_ARGS',
      });
      return;
    }

    const encoded = options.request ?? options.control ?? '';
    if (encoded.length === 0 || encoded.length > MAX_WORKER_ENCODED_SIZE) {
      this.exit(1);
      this.printJson({
        success: false,
        error: `Encoded worker message must be 1..${MAX_WORKER_ENCODED_SIZE} characters`,
        code: 'INVALID_WORKER_ARGS',
      });
      return;
    }

    try {
      const store = this.storeFactory(options.stateDir);
      const coordinator = await this.createCoordinator(store);

      if (options.request) {
        const receipt = await coordinator.handleRemoteRequest(options.request);
        // Emit exactly ONE signed receipt marker on stdout for Paseo terminal capture, NO duplicate JSON
        this.printFn(formatReceiptMarker(receipt));
      } else if (options.control) {
        const receipt = await coordinator.handleRemoteControl(options.control);
        this.printFn(formatReceiptMarker(receipt));
      }
    } catch (err: unknown) {
      this.handleError(err);
    }
  }
}

export function registerFleetCommands(
  harnessCmd: Command,
  commandInstance?: FleetCommand,
  exitFn?: (code: number) => void,
  printFn?: (msg: string) => void,
): Command {
  const effectiveExit =
    exitFn ??
    ((code) => {
      process.exitCode = code;
    });
  const effectivePrint =
    printFn ??
    ((msg) => {
      console.log(msg);
    });

  const fleetCmd = harnessCmd
    .command('fleet')
    .description(
      'Manage fleet-wide harness configuration, execution, evaluation, and global OMP integration',
    );

  const fleetCommand =
    commandInstance ??
    new FleetCommand({
      exitFn: effectiveExit,
      printFn: effectivePrint,
    });

  configureCommandOutput(fleetCmd, effectivePrint, effectiveExit);

  // 1. configure
  const configureCmd = fleetCmd
    .command('configure')
    .description('Configure global fleet policy in the user state store')
    .requiredOption(
      '-f, --file <path>',
      'Path to JSON file containing FleetConfig',
    )
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetConfigureOptions) => {
      await fleetCommand.configure(opts);
    });
  configureCommandOutput(configureCmd, effectivePrint, effectiveExit);

  // 2. doctor
  const doctorCmd = fleetCmd
    .command('doctor')
    .description(
      'Check fleet runtime, SDK, Docker sandbox, and policy health without model prompts',
    )
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetCommonOptions) => {
      await fleetCommand.doctor(opts);
    });
  configureCommandOutput(doctorCmd, effectivePrint, effectiveExit);

  // 3. status
  const statusCmd = fleetCmd
    .command('status')
    .description('Display fleet run, budget, attempt, and host status summary')
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetCommonOptions) => {
      await fleetCommand.status(opts);
    });
  configureCommandOutput(statusCmd, effectivePrint, effectiveExit);

  // 4. run
  const runCmd = fleetCmd
    .command('run')
    .description(
      'Plan or execute a bounded fleet task across configured host/account rules',
    )
    .requiredOption(
      '-f, --file <path>',
      'Path to JSON file containing FleetTask',
    )
    .option('--execute', 'Execute task (default is dry-run plan only)')
    .option(
      '--release-digest <digest>',
      'Candidate release digest for a heldout task; the attempt pair is allocated by the coordinator',
    )
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetRunOptions) => {
      await fleetCommand.run(opts);
    });
  configureCommandOutput(runCmd, effectivePrint, effectiveExit);

  // 5. cancel
  const cancelCmd = fleetCmd
    .command('cancel')
    .description('Terminate an active attempt with owned generation proof')
    .requiredOption('--attempt-id <id>', 'Strict UUID of attempt to cancel')
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetCancelOptions) => {
      await fleetCommand.cancel(opts);
    });
  configureCommandOutput(cancelCmd, effectivePrint, effectiveExit);

  // 6. reconcile
  const reconcileCmd = fleetCmd
    .command('reconcile')
    .description(
      'Reconcile running attempts against local container states and authenticated remote receipts',
    )
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetCommonOptions) => {
      await fleetCommand.reconcile(opts);
    });
  configureCommandOutput(reconcileCmd, effectivePrint, effectiveExit);

  // 7. evaluate
  const evaluateCmd = fleetCmd
    .command('evaluate')
    .description(
      'Preview, execute, or aggregate a heldout evaluation from an input file or a frozen plan digest',
    )
    .option(
      '-f, --file <path>',
      'Path to JSON file containing the multi-task evaluation input',
    )
    .option(
      '--plan-digest <digest>',
      'Canonical SHA-256 digest of a frozen evaluation plan',
    )
    .option('--execute', 'Execute or resume (default is read-only preview)')
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetEvaluateOptions) => {
      await fleetCommand.evaluate(opts);
    });
  configureCommandOutput(evaluateCmd, effectivePrint, effectiveExit);

  // 8. release (group)
  const releaseCmd = fleetCmd
    .command('release')
    .description(
      'Manage harness release bundles and cryptographically signed promotions/rollbacks',
    );
  configureCommandOutput(releaseCmd, effectivePrint, effectiveExit);

  const releaseProposeCmd = releaseCmd
    .command('propose')
    .description('Propose a new candidate HarnessBundle')
    .requiredOption(
      '-f, --file <path>',
      'Path to JSON file containing HarnessBundle',
    )
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetFileOptions) => {
      await fleetCommand.releasePropose(opts);
    });
  configureCommandOutput(releaseProposeCmd, effectivePrint, effectiveExit);

  const releaseActivateCmd = releaseCmd
    .command('activate')
    .description(
      'Activate an approved release using an externally signed approval',
    )
    .requiredOption(
      '-f, --file <path>',
      'Path to JSON file containing SignedApproval',
    )
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetFileOptions) => {
      await fleetCommand.releaseActivate(opts);
    });
  configureCommandOutput(releaseActivateCmd, effectivePrint, effectiveExit);

  const releaseRollbackCmd = releaseCmd
    .command('rollback')
    .description(
      'Roll back to a previously approved release using an externally signed approval',
    )
    .requiredOption(
      '-f, --file <path>',
      'Path to JSON file containing SignedApproval',
    )
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetFileOptions) => {
      await fleetCommand.releaseRollback(opts);
    });
  configureCommandOutput(releaseRollbackCmd, effectivePrint, effectiveExit);

  const releaseWithdrawCmd = releaseCmd
    .command('withdraw')
    .description(
      'Withdraw an active or canary release using an externally signed approval',
    )
    .requiredOption(
      '-f, --file <path>',
      'Path to JSON file containing SignedApproval',
    )
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetFileOptions) => {
      await fleetCommand.releaseWithdraw(opts);
    });
  configureCommandOutput(releaseWithdrawCmd, effectivePrint, effectiveExit);

  const releaseStatusCmd = releaseCmd
    .command('status')
    .description('Show active pins, canaries, and release status')
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetCommonOptions) => {
      await fleetCommand.releaseStatus(opts);
    });
  configureCommandOutput(releaseStatusCmd, effectivePrint, effectiveExit);

  // 9. integration (group)
  const integrationCmd = fleetCmd
    .command('integration')
    .description(
      'Manage global OMP launch integration with CAS checks and backup ownership',
    );
  configureCommandOutput(integrationCmd, effectivePrint, effectiveExit);

  const addIntegrationSourceOptions = (cmd: Command): void => {
    cmd
      .option('--paseo-home <path>', 'Custom Paseo home directory')
      .option(
        '--omp-binary <path>',
        'Explicit trusted OMP binary for entries without a command',
      )
      .option('--cli-path <path>', 'Explicit trusted built AGS CLI entrypoint')
      .option(
        '--node-command <path>',
        'Explicit trusted Node runtime for the loader',
      )
      .option(
        '--omp-runtime-command <absolute-path>',
        'Trusted Node or Bun interpreter required by an OMP env shebang when not available from the loader runtime',
      )
      .option(
        '--omp-version <version>',
        'Expected OMP version; checked against the detected binary version',
      );
  };

  const integrationPlanCmd = integrationCmd
    .command('plan')
    .description(
      'Dry-run inspection of Paseo provider and terminal command changes',
    );
  addIntegrationSourceOptions(integrationPlanCmd);
  integrationPlanCmd
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetIntegrationOptions) => {
      await fleetCommand.integrationPlan(opts);
    });
  configureCommandOutput(integrationPlanCmd, effectivePrint, effectiveExit);

  const integrationInstallCmd = integrationCmd
    .command('install')
    .description(
      'Install global OMP wrapper and trusted loader (dry-run unless --apply is passed)',
    );
  addIntegrationSourceOptions(integrationInstallCmd);
  integrationInstallCmd
    .option('--apply', 'Apply changes (default is dry-run)')
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetIntegrationOptions) => {
      await fleetCommand.integrationInstall(opts);
    });
  configureCommandOutput(integrationInstallCmd, effectivePrint, effectiveExit);

  const integrationUninstallCmd = integrationCmd
    .command('uninstall')
    .description(
      'Uninstall global OMP wrapper and restore Paseo configuration (dry-run unless --apply is passed)',
    )
    .option('--apply', 'Apply changes (default is dry-run)')
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetIntegrationOptions) => {
      await fleetCommand.integrationUninstall(opts);
    });
  configureCommandOutput(
    integrationUninstallCmd,
    effectivePrint,
    effectiveExit,
  );
  // 10. runtime pin
  const runtimeCmd = fleetCmd
    .command('runtime')
    .description('Manage the globally pinned fleet runtime closure');
  configureCommandOutput(runtimeCmd, effectivePrint, effectiveExit);
  const runtimePinCmd = runtimeCmd
    .command('pin')
    .description(
      'Build and pin the installed runtime closure (metadata-only unless --apply)',
    )
    .requiredOption(
      '-f, --file <path>',
      'Path to JSON file containing RuntimeManifestInput',
    )
    .option(
      '--apply',
      'Build and atomically write the validated closure manifest',
    )
    .option('--state-dir <path>', 'Custom absolute private state directory')
    .action(async (opts: FleetRuntimePinOptions) => {
      await fleetCommand.runtimePin(opts);
    });
  configureCommandOutput(runtimePinCmd, effectivePrint, effectiveExit);

  // 10. context
  const contextCmd = fleetCmd
    .command('context')
    .description(
      'Resolve approved release guidance for an OMP session based on cwd and policy',
    )
    .option('--cwd <path>', 'Current working directory')
    .option('--platform <platform>', 'Operating system platform')
    .option(
      '--omp-version <version>',
      'Actual OMP version pinned by the installed integration (required unless --scope-only)',
    )
    .option(
      '--scope-only',
      'Resolve canonical local project scope identity without reading release pins',
    )
    .option('--state-dir <path>', 'Custom absolute state directory')
    .action(async (opts: FleetContextOptions) => {
      await fleetCommand.context(opts);
    });
  configureCommandOutput(contextCmd, effectivePrint, effectiveExit);

  // 11. worker (internal remote entry)
  const workerCmd = fleetCmd
    .command('worker')
    .description(
      'Internal execution worker entry for remote Paseo terminal dispatch',
    )
    .requiredOption('--state-dir <path>', 'State directory for worker')
    .option('--request <encoded>', 'Base64 JSON signed execution request')
    .option('--control <encoded>', 'Base64 JSON signed control request')
    .action(async (opts: FleetWorkerOptions) => {
      await fleetCommand.worker(opts);
    });
  configureCommandOutput(workerCmd, effectivePrint, effectiveExit);

  return fleetCmd;
}
