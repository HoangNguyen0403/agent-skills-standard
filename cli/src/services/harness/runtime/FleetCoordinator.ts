import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import { z } from 'zod';
import {
  getProjectCheckoutPaths,
  HarnessDiscoveryService,
  HarnessInventory,
  isValidWorkspacePath,
} from '../HarnessDiscoveryService';
import { HarnessConfig, HarnessSetupService } from '../HarnessSetupService';
import { PaseoConnectionFactory } from '../PaseoSdkConnection';
import { EvidenceService } from './EvidenceService';
import { FleetLedger } from './FleetLedger';
import {
  FleetPolicyService,
  resolveLogicalProjectId,
  resolveProjectAuthority,
} from './FleetPolicyService';
import { FleetRemoteDispatcher } from './FleetRemoteDispatcher';
import {
  getRuntimeStateReceiptPath,
  getTerminationReceiptPath,
  getWorkerBootId,
  getWorkerCompletionReceiptPath,
  getWorkerRecordPath,
  getWorkerTerminationReceiptPath,
  RuntimeStateReceipt,
  WorkerCompletionReceipt,
  WorkerProcessRecord,
  WorkerTerminationReceipt,
} from './LocalSupervisor';
import {
  OmpExecutionError,
  OmpSdkExecutor,
  OmpUsageSnapshotSchema,
} from './OmpSdkExecutor';
import { ReleaseService } from './ReleaseService';
import {
  decodePayloadBase64,
  loadPrivateKey,
  loadPublicKey,
  signExecutionRequest,
  signWorkerReceipt,
  validateControlRequest,
  validateExecutionRequest,
  validateWorkerReceipt,
} from './remoteWorkerProtocol';
import { RuntimeStore } from './RuntimeStore';
import { EVALUATION_WORKSPACE_DIRNAME, SandboxRunner } from './SandboxRunner';
import {
  Attempt,
  BudgetEpoch,
  BudgetEpochRequest,
  BudgetEpochSchema,
  canonicalDigest,
  canonicalJSON,
  EvaluationRecord,
  ExecutionBinding,
  ExecutionBindingSchema,
  ExecutionContext,
  FleetAccount,
  FleetConfig,
  FleetEvidenceVerifier,
  FleetHost,
  FleetProject,
  FleetRuntimeConfig,
  FleetTask,
  FrozenEvaluationPlan,
  FrozenEvaluationPlanSchema,
  HarnessBundle,
  HarnessBundleSchema,
  HarnessError,
  ProjectAuthority,
  ProjectAuthoritySchema,
  RunResult,
  RunResultSchema,
  SignedExecutionRequest,
  SignedWorkerReceipt,
  SignedWorkerReceiptSchema,
  TerminationEvidence,
  TerminationEvidenceSchema,
  evaluationRuntimeDigest,
  parseFleetTask,
  policyDigest,
  resolveHostRuntime,
} from './RuntimeTypes';

const LAST_KNOWN_INVENTORY_RECORD = 'last-known-inventory';
const POLICY_REJECTIONS_RECORD = 'policy-rejections';
const REMOTE_REQUEST_STATE_RECORD = 'remote-request-state';
const REMOTE_CONTROL_STATE_RECORD = 'remote-control-state';
const REMOTE_RECEIPT_RECORD = 'remote-receipts';
const BOOT_ID_FILE = '.worker-boot-id';
const ARTIFACTS_DIRNAME = 'artifacts';
const COORDINATOR_KEY_ENV = 'AGS_COORDINATOR_KEY_FILE';
const COORDINATOR_KEY_FILENAME = 'coordinator-key.pem';
const ACCEPTED_RECEIPT_PREFIX = 'accepted-';
const EVAL_INPUT_PREFIX = 'eval-input-';
const EVAL_INTENT_PREFIX = 'evaluation-intent-';

const SOURCE_REVISION_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ARTIFACT_LIMITS = {
  MAX_FILES: 2000,
  MAX_BYTES: 32 * 1024 * 1024,
  MAX_DEPTH: 16,
} as const;

const MAX_EVALUATION_CASES = 64;

/**
 * Execution proof types produced by the standard runner owner. Canonical names/shapes are
 * implemented in SandboxRunner/OmpSdkExecutor; the coordinator only consumes them.
 */
export interface ModelWorkerProof {
  kind: 'completion' | 'termination';
  digest: string;
  attemptId: string;
  generation: number;
  role: 'task';
  runtimeDigest: string;
  workerBootId: string;
  exitCode: number | null;
  confirmed: boolean;
}

export interface RoleStopProof {
  context: {
    attemptId: string;
    generation: number;
    role: ExecutionContext['role'];
    runtimeDigest: string;
  };
  termination: TerminationEvidence;
  runtimeState: RuntimeStateReceipt;
  modelWorker: ModelWorkerProof | null;
  wholeGroupStopped: boolean;
}

export interface WorkerRoleState {
  attemptId: string;
  generation: number;
  role: ExecutionContext['role'];
  runtimeDigest: string;
  workerBootId: string;
  state: 'absent' | 'running' | 'unknown';
  record: WorkerProcessRecord | null;
  completion: WorkerCompletionReceipt | null;
  termination: WorkerTerminationReceipt | null;
}

type PrepareEvaluationSignature = (
  snapshotDir: string,
  deliverableDir: string,
  verification: FleetTask['verification'],
  destination: string,
  taskStopProof: RoleStopProof,
) => Promise<void>;

type SandboxRunnerCapability = Pick<
  SandboxRunner,
  'doctor' | 'verifyRuntime' | 'snapshot' | 'execute' | 'terminate' | 'inspect'
> & {
  readonly runtime: FleetRuntimeConfig;
  prepareEvaluation: PrepareEvaluationSignature;
  stopRole(context: ExecutionContext): Promise<RoleStopProof>;
  inspectRole(context: ExecutionContext): Promise<RoleStopProof>;
  validateVerification(verification: FleetTask['verification']): {
    ok: boolean;
    reasonCodes: string[];
  };
};

type OmpExecutorCapability = Pick<
  OmpSdkExecutor,
  'health' | 'run' | 'terminateWorker' | 'readWorkerTermination'
> & {
  readonly runtime: FleetRuntimeConfig;
  inspectWorkerRole(context: ExecutionContext): Promise<WorkerRoleState>;
};

export interface ResolvedPolicyContext {
  domain: string;
  account: FleetAccount;
  config: FleetConfig;
  policyDigest: string;
}

export interface FreshProjectEntry {
  hostId: string;
  projectId: string;
  rootPath: string;
  status: 'reachable' | 'unreachable';
}

export interface FleetPlanResult {
  ready: boolean;
  status: 'ready' | 'denied';
  reasonCodes: string[];
  resolvedDomain?: string;
  resolvedAccountId?: string;
  resolvedAccountProvider?: string;
  resolvedAccountModel?: string;
  policyDigest?: string;
  project: FleetProject;
  taskDigest: string;
  executionTarget: 'local' | 'remote';
  localHostId: string | null;
  remoteHostId?: string;
}

export interface FleetRunSummary {
  runId: string;
  budgetId: string;
  passed: boolean;
  baselinePassed: boolean;
  candidatePassed: boolean;
  bestDigest: string;
  proposedReleaseDigest?: string;
  planDigest?: string;
  attemptsCount: number;
  toolCalls: number | null;
  durationMs: number | null;
  costUsd: number | null;
  outcome:
    | 'baseline_retained'
    | 'candidate_proposed'
    | 'evaluation_complete'
    | 'failed'
    | 'denied';
  reasonCodes: string[];
  evaluation?: EvaluationRecord;
}

export interface FleetEvaluationCaseSummary {
  caseId?: string;
  taskDigest: string;
  hostId: string;
  projectId: string;
  logicalProjectId: string;
  /** Present only for an authoritative frozen plan, never in a draft preview. */
  baselineAttemptId?: string;
  candidateAttemptId?: string;
}

export interface FleetEvaluationAttemptSummary {
  logicalProjectId: string;
  baselinePassed: boolean;
  candidatePassed: boolean;
  attemptIds: [string, string];
  state: 'completed' | 'unresolved' | 'blocked' | 'recovered';
}

export interface FleetEvaluationTasksResult {
  mode: 'preview' | 'executed' | 'resumed';
  /** Present only after an authoritative plan is frozen. */
  planDigest?: string;
  /** Draft description digest; not a plan digest and not resumable. */
  draftDigest?: string;
  cases: FleetEvaluationCaseSummary[];
  /** True for a read-only draft: identifiers are intentionally omitted. */
  draft: boolean;
  evaluation?: EvaluationRecord;
  attemptsSummary?: FleetEvaluationAttemptSummary[];
}

export interface FleetEvaluationPlanResult {
  mode: 'preview' | 'executed';
  planDigest: string;
  plan: FrozenEvaluationPlan;
  evaluation?: EvaluationRecord;
  attemptsSummary?: FleetEvaluationAttemptSummary[];
}

export interface FleetEvaluationTasksInput {
  schemaVersion: 1;
  id: string;
  tasks: FleetTask[];
  releaseDigest: string;
  runId?: string;
  budgetId?: string;
}

export interface FleetCancelResult {
  attemptId: string;
  status: 'cancelled' | 'terminated' | 'already_terminal' | 'unknown';
  terminationConfirmed: boolean;
  evidence?: TerminationEvidence;
  errorCode?: string;
}

export interface FleetReconcileResult {
  reconciledAttempts: number;
  fencedAttempts: number;
  unknownAttempts: number;
  activeAttempts: number;
  /** Attempts closed from their durable full outcome instead of being fenced. */
  recoveredAttempts: number;
}

export interface FleetStatusSummary {
  projects: Array<{
    logicalProjectId: string;
    hostId: string;
    status: 'reachable' | 'unreachable' | 'stale';
  }>;
  hosts: Array<{
    serverId: string;
    status: 'reachable' | 'unreachable' | 'configured';
  }>;
  budgets: { epochsCount: number; activeEpochsCount: number };
  attempts: {
    total: number;
    admitted: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    unknown: number;
    fenced: number;
  };
  resources: {
    toolCalls: number | null;
    durationMs: number;
    costUsd: number | null;
  };
  policyRejections: Record<string, number>;
  rollout: {
    activePinsCount: number;
    canariesCount: number;
    withdrawnCount: number;
  };
}

export interface FleetDoctorReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  supported: boolean;
  reasonCodes: string[];
  localHostId: string | null;
  checks: {
    policy: { ok: boolean; reasonCodes: string[] };
    sandbox: { supported: boolean; reasonCodes: string[] };
    ompSdk: { supported: boolean; reasonCodes: string[] };
    inventory: { ok: boolean; reasonCodes: string[] };
  };
}

export interface FleetCoordinatorRunOptions {
  runId?: string;
  budgetId?: string;
  /** Immutable digest of the selected candidate release for heldout evaluation. */
  releaseDigest?: string;
  /** Resume an already frozen plan; requires the persisted exact input. */
  planDigest?: string;
  /** Optional IDs, valid only when they match roles in the explicit frozen planDigest. */
  plannedAttemptId?: string;
  candidateAttemptId?: string;
}

export interface FleetCoordinatorDependencies {
  policyService?: FleetPolicyService;
  ledger?: FleetLedger;
  runner?: SandboxRunnerCapability;
  ompExecutor?: OmpExecutorCapability;
  evidenceService?: EvidenceService;
  releaseService?: ReleaseService;
  dispatcher?: FleetRemoteDispatcher;
  discoveryService?: HarnessDiscoveryService;
  connectionFactory?: PaseoConnectionFactory;
}

interface StageModelWorkerProofRecord {
  kind: 'completion' | 'termination';
  digest: string;
  exitCode: number | null;
}

interface StageRoleEvidence {
  role: ExecutionContext['role'];
  containerIds: string[];
  confirmed: boolean;
  observedAt: number;
  workerBootId: string;
  terminationReceiptDigest: string;
  runtimeStateDigest: string;
  modelWorker?: StageModelWorkerProofRecord;
}

interface StageArtifactEntry {
  path: string;
  sha256: string;
  size: number;
}

const StageRoleEvidenceSchema = z
  .object({
    role: z.enum(['task', 'evaluator']),
    containerIds: z.array(z.string().min(1)),
    confirmed: z.boolean(),
    observedAt: z.number().int().positive(),
    workerBootId: z.string().min(1),
    terminationReceiptDigest: z.string().min(1),
    runtimeStateDigest: z.string().min(1),
    modelWorker: z
      .object({
        kind: z.enum(['completion', 'termination']),
        digest: z.string().min(1),
        exitCode: z.number().int().nullable(),
      })
      .strict()
      .optional(),
  })
  .strict();

const StageArtifactEntrySchema = z
  .object({
    path: z.string().min(1),
    sha256: z.string().min(1),
    size: z.number().int().nonnegative(),
  })
  .strict();

const StageReceiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: z.string().uuid(),
    generation: z.number().int().positive(),
    bindingDigest: z.string().min(1),
    taskDigest: z.string().min(1),
    bundleDigest: z.string().min(1),
    evaluatorDigest: z.string().min(1),
    runtimeDigest: z.string().min(1),
    projectAuthority: z
      .object({
        canonicalRootPath: z.string().min(1),
        stackIds: z.array(z.string().min(1)),
      })
      .strict()
      .optional(),
    resultDigest: z.string().min(1),
    artifactDigest: z.string().min(1),
    roles: z.array(z.enum(['task', 'evaluator'])),
    roleEvidence: z.array(StageRoleEvidenceSchema),
    artifacts: z.array(StageArtifactEntrySchema),
    workerBootId: z.string().min(1),
    startedAt: z.number().int().positive(),
    completedAt: z.number().int().positive(),
  })
  .strict();

type StageReceipt = z.infer<typeof StageReceiptSchema>;

const RuntimeStateReceiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: z.string(),
    generation: z.number().int().positive(),
    role: z.enum(['task', 'evaluator']),
    runtimeDigest: z.string().min(1),
    image: z.string().min(1),
    observedAt: z.number().int().positive(),
    instances: z.array(
      z
        .object({
          instanceId: z.string(),
          containerId: z.string().nullable(),
          image: z.string(),
          confirmed: z.boolean(),
          errorCode: z.string().optional(),
        })
        .strict(),
    ),
    termination: TerminationEvidenceSchema,
  })
  .strict();

const WorkerCompletionReceiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: z.string(),
    generation: z.number().int().positive(),
    role: z.enum(['task', 'evaluator']),
    runtimeDigest: z.string().min(1),
    workerAssetSha256: z.string().min(1),
    pid: z.number().int().nonnegative(),
    pgid: z.number().int().nonnegative(),
    exitCode: z.number().int(),
    completedAt: z.number().int().positive(),
    workerBootId: z.string().min(1),
  })
  .strict();

const WorkerTerminationReceiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: z.string(),
    generation: z.number().int().positive(),
    role: z.enum(['task', 'evaluator']),
    runtimeDigest: z.string().min(1),
    confirmed: z.boolean(),
    observedAt: z.number().int().positive(),
    workerBootId: z.string().min(1),
    pid: z.number().int().positive(),
    pgid: z.number().int().nonnegative(),
    errorCode: z.string().min(1).optional(),
  })
  .strict();

/**
 * Immutable complete stage outcome. Persisted before cleanup/ack so a crash between
 * durable proof and ledger settlement can be recovered without rerunning paid work.
 */
const StageOutcomeRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: z.string().uuid(),
    generation: z.number().int().positive(),
    binding: ExecutionBindingSchema,
    task: z.unknown(),
    result: RunResultSchema,
    termination: TerminationEvidenceSchema.optional(),
    projectAuthority: ProjectAuthoritySchema.optional(),
  })
  .strict();

type StageOutcomeRecord = z.infer<typeof StageOutcomeRecordSchema>;

interface StageOutcome {
  result: RunResult;
  termination?: TerminationEvidence;
  bundle: HarnessBundle;
  /**
   * Populated when execution itself faulted (runner/executor/auth/isolation). Such an
   * outcome is settled for accounting, then the campaign aborts; it never feeds
   * proposer/composer/probe selection.
   */
  fatal?: HarnessError;
}

interface StageWorkspaces {
  snapshot: string;
  deliverable: string;
  evaluation: string;
}

interface RemoteRequestRecord {
  nonce: string;
  payloadDigest: string;
  attemptId: string;
  generation: number;
  acceptedAt: number;
  status:
    | 'accepted'
    | 'running'
    | 'completed'
    | 'failed'
    | 'unknown'
    | 'denied'
    | 'terminated';
  phase?: 'admission' | 'launch' | 'settled' | 'denied';
  receiptName: string;
  ownerPid?: number;
  ownerBootId?: string;
  denial?: { code: string; message: string };
}

interface RemoteRequestState {
  requests: Record<string, RemoteRequestRecord>;
  nonces: Record<string, string>;
}

interface RemoteControlRecord {
  nonce: string;
  payloadDigest: string;
  attemptId?: string;
  receiptName?: string;
  phase: 'claimed' | 'executing' | 'settled' | 'denied';
  ownerPid?: number;
  ownerBootId?: string;
  denial?: { code: string; message: string };
}

interface RemoteControlState {
  requests: Record<string, RemoteControlRecord>;
  nonces: Record<string, string>;
}
function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH';
  }
}

function ownerIsAlive(
  ownerPid: number | undefined,
  ownerBootId: string | undefined,
  bootId: string,
): boolean {
  if (!ownerPid || !ownerBootId) return true;
  return ownerBootId === bootId && processIsAlive(ownerPid);
}

interface RemoteReceiptIndex {
  entries: Record<string, string[]>;
}

interface EvaluationInputRecord {
  schemaVersion: 1;
  planDigest: string;
  releaseDigest: string;
  tasks: FleetTask[];
  /** Original campaign epoch authority; resume reuses it and never replenishes credits. */
  runId: string;
  budgetId: string;
}

const EVALUATION_PLAN_INTENT_SCHEMA = z
  .object({
    schemaVersion: z.literal(1),
    draftDigest: z.string().regex(/^[a-f0-9]{64}$/),
    planDigest: z.string().regex(/^[a-f0-9]{64}$/),
    releaseDigest: z.string().regex(/^[a-f0-9]{64}$/),
    tasks: z.array(z.unknown()).min(1).max(MAX_EVALUATION_CASES),
    plan: FrozenEvaluationPlanSchema,
    epoch: z.discriminatedUnion('kind', [
      z
        .object({
          kind: z.literal('existing'),
          runId: BudgetEpochSchema.shape.runId,
          budgetId: BudgetEpochSchema.shape.id,
        })
        .strict(),
      z
        .object({
          kind: z.literal('new'),
          request: BudgetEpochSchema.omit({
            reservedAttempts: true,
            reservedToolCalls: true,
            policyDigest: true,
            policyGeneration: true,
            frozenLimits: true,
          }).strict(),
        })
        .strict(),
    ]),
  })
  .strict();

type EvaluationPlanIntent = z.infer<typeof EVALUATION_PLAN_INTENT_SCHEMA>;

type EvaluationPlanCaseDraft = Omit<
  FrozenEvaluationPlan['cases'][number],
  'id' | 'baselineAttemptId' | 'candidateAttemptId'
>;

interface EvaluationPlanDraft {
  id: string;
  releaseDigest: string;
  baselineDigest: string;
  policyDigest: string;
  runtimeDigest: string;
  minImprovement: number;
  maxRegressions: number;
  draftDigest: string;
  skeleton: EvaluationPlanCaseDraft[];
  cases: FleetEvaluationCaseSummary[];
}

interface TaskExecutionContext {
  task: FleetTask;
  resolved: ResolvedPolicyContext;
  hostRuntime: FleetRuntimeConfig;
  isRemote: boolean;
  snapshotDir: string | null;
  sourceRootPath: string;
}

/**
 * Authoritative evidence verifier injected into FleetLedger.
 *
 * Locality is decided by authenticated host identity (signing-key custody), never by a
 * magic host string. Local lanes re-read durable runner/model-worker receipts and bounded
 * artifact manifests; remote lanes require durable, signature-revalidated host receipts.
 */
export class CoordinatorEvidenceVerifier implements FleetEvidenceVerifier {
  constructor(
    private readonly store: RuntimeStore,
    private readonly policyService: FleetPolicyService,
  ) {}

  async recordVerifiedReceipt(receipt: SignedWorkerReceipt): Promise<void> {
    const parsed = SignedWorkerReceiptSchema.parse(receipt);
    const name = remoteReceiptName(parsed);
    await this.store.createImmutable(name, parsed);
    await this.store.transaction<RemoteReceiptIndex>(
      REMOTE_RECEIPT_RECORD,
      { entries: {} },
      (state) => {
        const existing = state.entries[parsed.payload.attemptId] ?? [];
        if (!existing.includes(name)) {
          state.entries[parsed.payload.attemptId] = [...existing, name];
        }
        return state;
      },
    );
  }

  async verifyCompletion(
    attempt: Attempt,
    result: RunResult,
  ): Promise<boolean> {
    if (attempt.id !== result.attemptId) return false;
    if (attempt.generation !== result.generation) return false;
    if (canonicalJSON(attempt.binding) !== canonicalJSON(result.binding))
      return false;
    if (result.harnessDigest !== attempt.binding.harnessDigest) return false;
    if (result.sourceRevision !== attempt.binding.sourceRevision) return false;
    if (result.evaluatorDigest !== attempt.binding.evaluatorDigest)
      return false;
    if (!result.artifactDigest || result.artifactDigest.trim().length === 0)
      return false;
    if (result.status !== 'completed') return false;

    let config: FleetConfig;
    try {
      config = await this.policyService.load();
    } catch {
      return false;
    }
    const localHostId = (await resolveAuthenticatedLocalHost(config)).hostId;

    if (attempt.hostId !== localHostId) {
      return this.verifyRemoteCompletion(attempt, result, config);
    }

    const receipt = await this.readStageReceipt(attempt);
    if (!receipt) return false;
    if (
      receipt.attemptId !== attempt.id ||
      receipt.generation !== attempt.generation
    )
      return false;
    if (receipt.bindingDigest !== canonicalDigest(attempt.binding))
      return false;
    if (receipt.taskDigest !== attempt.binding.taskDigest) return false;
    if (receipt.bundleDigest !== attempt.binding.harnessDigest) return false;
    if (receipt.evaluatorDigest !== attempt.binding.evaluatorDigest)
      return false;
    if (receipt.runtimeDigest !== attempt.binding.runtimeDigest) return false;
    if (receipt.resultDigest !== canonicalDigest(result)) return false;
    if (receipt.artifactDigest !== result.artifactDigest) return false;
    if (
      receipt.roles.length === 0 ||
      receipt.roles.length !== receipt.roleEvidence.length
    ) {
      return false;
    }
    if (!authorityMatches(receipt.projectAuthority, result.projectAuthority))
      return false;
    if (!result.projectAuthority) return false;

    // Full recoverable outcome must exist before this completion can be accepted.
    const outcomeRaw = await this.store.read<unknown>(
      outcomeRecordName(attempt),
      null,
    );
    if (outcomeRaw === null) return false;
    const outcomeParsed = StageOutcomeRecordSchema.safeParse(outcomeRaw);
    if (!outcomeParsed.success) return false;
    if (outcomeParsed.data.attemptId !== attempt.id) return false;
    if (outcomeParsed.data.generation !== attempt.generation) return false;
    if (
      canonicalJSON(outcomeParsed.data.binding) !==
      canonicalJSON(attempt.binding)
    )
      return false;
    if (canonicalDigest(outcomeParsed.data.result) !== canonicalDigest(result))
      return false;

    const durableBootId = await this.readDurableBootId();
    if (!durableBootId) return false;
    if (receipt.workerBootId !== durableBootId) return false;

    for (const role of receipt.roles) {
      const recorded = receipt.roleEvidence.find(
        (entry) => entry.role === role,
      );
      if (!recorded) return false;
      if (
        !(await this.verifyLocalRoleEvidence(
          attempt,
          role,
          recorded,
          durableBootId,
          true,
        ))
      ) {
        return false;
      }
    }

    return this.verifyArtifacts(attempt, receipt.artifacts);
  }

  async verifyTermination(
    attempt: Attempt,
    evidence: TerminationEvidence,
  ): Promise<boolean> {
    if (evidence.attemptId !== attempt.id) return false;
    if (evidence.generation !== attempt.generation) return false;
    if (evidence.confirmed !== true) return false;
    if (!evidence.observedAt || evidence.observedAt <= 0) return false;
    if (!evidence.workerBootId || evidence.workerBootId.trim().length === 0)
      return false;

    let config: FleetConfig;
    try {
      config = await this.policyService.load();
    } catch {
      return false;
    }
    const localHostId = (await resolveAuthenticatedLocalHost(config)).hostId;
    if (attempt.hostId !== localHostId) {
      return this.verifyRemoteTermination(attempt, evidence, config);
    }

    const durableBootId = await this.readDurableBootId();
    if (!durableBootId) return false;
    if (evidence.workerBootId !== durableBootId) return false;

    const observedContainers = new Set<string>();
    for (const role of ['task', 'evaluator'] as const) {
      const context = attemptContext(this.store.stateDir, attempt, role);
      const runtimeState = await readRuntimeStateReceipt(context);
      if (!runtimeState) return false;
      if (
        runtimeState.attemptId !== attempt.id ||
        runtimeState.generation !== attempt.generation
      ) {
        return false;
      }
      if (runtimeState.role !== role) return false;
      if (runtimeState.runtimeDigest !== attempt.binding.runtimeDigest)
        return false;
      if (runtimeState.termination.confirmed !== true) return false;
      if (runtimeState.termination.workerBootId !== durableBootId) return false;

      const termination = await readTerminationReceiptFile(context);
      if (!termination) return false;
      if (termination.confirmed !== true) return false;
      if (
        termination.attemptId !== attempt.id ||
        termination.generation !== attempt.generation
      ) {
        return false;
      }
      if (termination.workerBootId !== durableBootId) return false;
      for (const containerId of termination.containerIds) {
        observedContainers.add(containerId);
      }
    }

    if (!(await this.modelWorkerNotLive(attempt, durableBootId))) return false;

    if (observedContainers.size !== new Set(evidence.containerIds).size)
      return false;
    for (const containerId of evidence.containerIds) {
      if (!observedContainers.has(containerId)) return false;
    }
    return true;
  }

  private async verifyLocalRoleEvidence(
    attempt: Attempt,
    role: ExecutionContext['role'],
    recorded: StageRoleEvidence,
    durableBootId: string,
    requireSuccessfulModelWorker: boolean,
  ): Promise<boolean> {
    if (!recorded.confirmed) return false;
    if (!recorded.observedAt || recorded.observedAt <= 0) return false;
    if (recorded.workerBootId !== durableBootId) return false;

    const context = attemptContext(this.store.stateDir, attempt, role);

    const runtimeState = await readRuntimeStateReceipt(context);
    if (!runtimeState) return false;
    if (
      runtimeState.attemptId !== attempt.id ||
      runtimeState.generation !== attempt.generation
    ) {
      return false;
    }
    if (runtimeState.role !== role) return false;
    if (runtimeState.runtimeDigest !== attempt.binding.runtimeDigest)
      return false;
    if (runtimeState.termination.confirmed !== true) return false;
    if (runtimeState.termination.workerBootId !== durableBootId) return false;
    if (canonicalDigest(runtimeState) !== recorded.runtimeStateDigest)
      return false;

    const termination = await readTerminationReceiptFile(context);
    if (!termination) return false;
    if (termination.confirmed !== true) return false;
    if (
      termination.attemptId !== attempt.id ||
      termination.generation !== attempt.generation
    ) {
      return false;
    }
    if (termination.workerBootId !== durableBootId) return false;
    if (canonicalDigest(termination) !== recorded.terminationReceiptDigest)
      return false;

    const recordedContainers = new Set(recorded.containerIds);
    if (recordedContainers.size !== new Set(termination.containerIds).size)
      return false;
    for (const containerId of termination.containerIds) {
      if (!recordedContainers.has(containerId)) return false;
    }

    if (role === 'task') {
      const proof = recorded.modelWorker;
      if (!proof) return false;
      const workerProof = await readModelWorkerProof(
        this.store.stateDir,
        attempt,
        durableBootId,
      );
      if (!workerProof) return false;
      if (workerProof.kind !== proof.kind) return false;
      if (workerProof.digest !== proof.digest) return false;
      if (workerProof.exitCode !== proof.exitCode) return false;
      if (proof.kind === 'completion' && requireSuccessfulModelWorker) {
        if (proof.exitCode !== 0) return false;
      }
      if (proof.kind === 'termination' && !workerProof.confirmed) return false;
    } else if (recorded.modelWorker) {
      // Evaluator roles never own a model worker.
      return false;
    }

    return true;
  }

  private async modelWorkerNotLive(
    attempt: Attempt,
    durableBootId: string,
  ): Promise<boolean> {
    const context = attemptContext(this.store.stateDir, attempt, 'task');
    const record = await readJsonBoundedSafe(getWorkerRecordPath(context));
    if (record) return false;
    const completion = await readWorkerCompletion(context);
    if (completion) {
      if (
        completion.attemptId !== attempt.id ||
        completion.generation !== attempt.generation
      ) {
        return false;
      }
      if (completion.runtimeDigest !== attempt.binding.runtimeDigest)
        return false;
      if (completion.workerBootId !== durableBootId) return false;
      return true;
    }
    const termination = await readWorkerTermination(context);
    if (termination) {
      if (
        termination.attemptId !== attempt.id ||
        termination.generation !== attempt.generation
      ) {
        return false;
      }
      if (termination.runtimeDigest !== attempt.binding.runtimeDigest)
        return false;
      if (termination.workerBootId !== durableBootId) return false;
      return termination.confirmed === true;
    }
    // No owned worker was ever registered for this role.
    return true;
  }

  private async verifyArtifacts(
    attempt: Attempt,
    artifacts: StageArtifactEntry[],
  ): Promise<boolean> {
    const root = artifactRootFor(this.store.stateDir, attempt);
    if (artifacts.length > ARTIFACT_LIMITS.MAX_FILES) return false;
    let totalBytes = 0;
    for (const entry of artifacts) {
      totalBytes += entry.size;
      if (totalBytes > ARTIFACT_LIMITS.MAX_BYTES) return false;
      const target = path.resolve(root, entry.path);
      if (!isInside(root, target)) return false;
      let stat: fs.Stats;
      try {
        stat = await fs.lstat(target);
      } catch {
        return false;
      }
      if (!stat.isFile() || stat.isSymbolicLink()) return false;
      if (stat.size !== entry.size) return false;
      if ((await sha256File(target)) !== entry.sha256) return false;
    }
    return true;
  }

  private async verifyRemoteCompletion(
    attempt: Attempt,
    result: RunResult,
    config: FleetConfig,
  ): Promise<boolean> {
    const receipts = await this.loadRemoteReceipts(attempt, config);
    for (const receipt of receipts) {
      if (receipt.payload.status !== result.status) continue;
      if (receipt.payload.attemptId !== attempt.id) continue;
      if (receipt.payload.generation !== attempt.generation) continue;
      if (
        canonicalJSON(receipt.payload.binding) !==
        canonicalJSON(attempt.binding)
      )
        continue;
      if (receipt.payload.terminationConfirmed !== true) continue;
      if (!receipt.payload.result) continue;
      if (canonicalDigest(receipt.payload.result) !== canonicalDigest(result))
        continue;
      if (receipt.payload.artifactDigest !== result.artifactDigest) continue;
      if (receipt.payload.resultDigest !== canonicalDigest(result)) continue;
      const stage = attempt.binding.stage;
      if (stage === 'proposal' || stage === 'compose') {
        const outputBundle = HarnessBundleSchema.safeParse(
          receipt.payload.outputBundle,
        );
        const inputRaw = await this.store.read<unknown>(
          remoteInputBundleName(attempt),
          null,
        );
        const inputBundle = HarnessBundleSchema.safeParse(inputRaw);
        if (!outputBundle.success || !inputBundle.success) continue;
        try {
          assertCandidateMetadataUnchanged(inputBundle.data, outputBundle.data);
        } catch {
          continue;
        }
      }
      return true;
    }
    return false;
  }

  private async verifyRemoteTermination(
    attempt: Attempt,
    evidence: TerminationEvidence,
    config: FleetConfig,
  ): Promise<boolean> {
    const receipts = await this.loadRemoteReceipts(attempt, config);
    for (const receipt of receipts) {
      if (receipt.payload.attemptId !== attempt.id) continue;
      if (receipt.payload.generation !== attempt.generation) continue;
      if (
        canonicalJSON(receipt.payload.binding) !==
        canonicalJSON(attempt.binding)
      )
        continue;
      if (receipt.payload.terminationConfirmed !== true) continue;
      if (
        attempt.state === 'failed' &&
        (receipt.payload.status !== 'failed' ||
          !attempt.result ||
          canonicalJSON(receipt.payload.result) !==
            canonicalJSON(attempt.result))
      ) {
        continue;
      }
      if (attempt.state === 'fenced' && receipt.payload.status !== 'terminated')
        continue;
      if (receipt.payload.workerBootId !== evidence.workerBootId) continue;
      if (receipt.payload.observedAt < attempt.createdAt) continue;
      const reported = new Set(receipt.payload.containerIds);
      if (reported.size !== new Set(evidence.containerIds).size) continue;
      let match = true;
      for (const containerId of evidence.containerIds) {
        if (!reported.has(containerId)) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  }

  private async loadRemoteReceipts(
    attempt: Attempt,
    config: FleetConfig,
  ): Promise<SignedWorkerReceipt[]> {
    const host = config.hosts.find(
      (entry) => entry.serverId === attempt.hostId,
    );
    if (!host) return [];
    const index = await this.store.read<RemoteReceiptIndex>(
      REMOTE_RECEIPT_RECORD,
      { entries: {} },
    );
    const names = index.entries[attempt.id] ?? [];
    const receipts: SignedWorkerReceipt[] = [];
    for (const name of names) {
      const raw = await this.store.read<unknown>(name, null);
      if (raw === null) continue;
      const parsed = SignedWorkerReceiptSchema.safeParse(raw);
      if (!parsed.success) continue;
      try {
        receipts.push(
          validateWorkerReceipt(
            parsed.data,
            host.serverId,
            host.workerPublicKey,
          ),
        );
      } catch {
        // Receipts that no longer validate under configured trust are not proof.
      }
    }
    return receipts;
  }

  private async readStageReceipt(
    attempt: Attempt,
  ): Promise<StageReceipt | null> {
    const raw = await this.store.read<unknown>(stageReceiptName(attempt), null);
    if (raw === null) return null;
    const parsed = StageReceiptSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }

  private async readDurableBootId(): Promise<string | null> {
    try {
      const kernel = (
        await fs.readFile('/proc/sys/kernel/random/boot_id', 'utf8')
      ).trim();
      if (kernel) return kernel;
    } catch {
      // Non-Linux hosts use the durable persisted marker only.
    }
    const persisted = await fs
      .readFile(path.join(this.store.stateDir, BOOT_ID_FILE), 'utf8')
      .catch(() => '');
    return persisted.trim() ? persisted.trim() : null;
  }
}

export class FleetCoordinator {
  readonly store: RuntimeStore;
  readonly policyService: FleetPolicyService;
  readonly ledger: FleetLedger;
  readonly runner?: SandboxRunnerCapability;
  readonly ompExecutor?: OmpExecutorCapability;
  readonly evidenceService: EvidenceService;
  readonly releaseService: ReleaseService;
  readonly dispatcher: FleetRemoteDispatcher;
  readonly discoveryService: HarnessDiscoveryService;
  readonly evidenceVerifier: CoordinatorEvidenceVerifier;

  constructor(
    store: RuntimeStore,
    dependencies?: FleetCoordinatorDependencies,
  ) {
    this.store = store;
    this.runner = dependencies?.runner;
    this.ompExecutor = dependencies?.ompExecutor;
    this.policyService =
      dependencies?.policyService ?? new FleetPolicyService(store);
    this.evidenceVerifier = new CoordinatorEvidenceVerifier(
      store,
      this.policyService,
    );
    this.ledger =
      dependencies?.ledger ?? new FleetLedger(store, this.evidenceVerifier);
    this.evidenceService =
      dependencies?.evidenceService ?? new EvidenceService(store, this.ledger);
    this.releaseService =
      dependencies?.releaseService ??
      new ReleaseService(store, this.policyService);
    this.dispatcher =
      dependencies?.dispatcher ??
      new FleetRemoteDispatcher({
        store,
        policyService: this.policyService,
        connectionFactory: dependencies?.connectionFactory,
      });
    this.discoveryService =
      dependencies?.discoveryService ??
      new HarnessDiscoveryService(undefined, dependencies?.connectionFactory);
  }

  /**
   * Zero-model health check: verified setup, policy, executing-host identity, sandbox/closure,
   * OMP SDK, and fresh inventory. Gate on `supported`, never on `status`.
   */
  async doctor(): Promise<FleetDoctorReport> {
    const reasonCodes: string[] = [];
    const policyReasons: string[] = [];
    const sandboxReasons: string[] = [];
    const ompReasons: string[] = [];
    const inventoryReasons: string[] = [];

    let policyOk = false;
    let config: FleetConfig | null = null;
    try {
      config = await this.policyService.load();
      policyOk = true;
    } catch (err: unknown) {
      policyReasons.push(reasonCodeOf(err, 'POLICY_LOAD_FAILED'));
    }

    const localHostId = config
      ? (await resolveAuthenticatedLocalHost(config)).hostId
      : null;
    let sandboxSupported = false;
    let ompSupported = false;

    if (localHostId) {
      if (this.runner) {
        try {
          const res = await this.runner.doctor();
          sandboxSupported = res.supported;
          sandboxReasons.push(...res.reasonCodes);
        } catch (err: unknown) {
          sandboxReasons.push(reasonCodeOf(err, 'RUNNER_DOCTOR_FAILED'));
        }
      } else {
        sandboxReasons.push('NO_RUNNER_CONFIGURED');
      }
      if (this.ompExecutor) {
        try {
          const res = await this.ompExecutor.health();
          ompSupported = res.supported;
          ompReasons.push(...res.reasonCodes);
        } catch (err: unknown) {
          ompReasons.push(reasonCodeOf(err, 'OMP_HEALTH_FAILED'));
        }
      } else {
        ompReasons.push('NO_OMP_EXECUTOR_CONFIGURED');
      }
    } else {
      sandboxReasons.push('LOCAL_HOST_UNIDENTIFIED');
      ompReasons.push('LOCAL_HOST_UNIDENTIFIED');
    }
    if (!sandboxSupported) reasonCodes.push(...sandboxReasons);
    if (!ompSupported) reasonCodes.push(...ompReasons);

    let inventoryOk = true;
    if (config) {
      try {
        await this.syncInventory();
      } catch (err: unknown) {
        inventoryOk = false;
        inventoryReasons.push(reasonCodeOf(err, 'INVENTORY_SYNC_FAILED'));
        reasonCodes.push(...inventoryReasons);
      }
    } else {
      inventoryOk = false;
      inventoryReasons.push('POLICY_UNAVAILABLE');
    }

    const supported =
      policyOk && (!localHostId || (sandboxSupported && ompSupported));
    const status: FleetDoctorReport['status'] = !supported
      ? 'unhealthy'
      : reasonCodes.length > 0
        ? 'degraded'
        : 'healthy';

    return {
      status,
      supported,
      reasonCodes: Array.from(new Set(reasonCodes)),
      localHostId,
      checks: {
        policy: { ok: policyOk, reasonCodes: policyReasons },
        sandbox: { supported: sandboxSupported, reasonCodes: sandboxReasons },
        ompSdk: { supported: ompSupported, reasonCodes: ompReasons },
        inventory: { ok: inventoryOk, reasonCodes: inventoryReasons },
      },
    };
  }

  /**
   * Readiness/authorization evaluation without reservation or model work.
   */
  async plan(taskInput: FleetTask): Promise<FleetPlanResult> {
    const task = parseFleetTask(taskInput);
    const reasonCodes: string[] = [];
    const taskDigest = canonicalDigest(task);

    if (!task.replaySafe) {
      await this.recordPolicyRejection('REASON_REPLAY_UNSAFE');
      return {
        ready: false,
        status: 'denied',
        reasonCodes: ['REASON_REPLAY_UNSAFE'],
        project: task.project,
        taskDigest,
        executionTarget: 'local',
        localHostId: null,
      };
    }

    let config: FleetConfig;
    try {
      config = await this.policyService.load();
    } catch (err: unknown) {
      const code = reasonCodeOf(err, 'POLICY_LOAD_FAILED');
      await this.recordPolicyRejection(code);
      return {
        ready: false,
        status: 'denied',
        reasonCodes: [code],
        project: task.project,
        taskDigest,
        executionTarget: 'local',
        localHostId: null,
      };
    }

    const localHostId = (await resolveAuthenticatedLocalHost(config)).hostId;
    const enrolled = config.hosts.some(
      (host) => host.serverId === task.project.hostId,
    );
    if (!enrolled) {
      await this.recordPolicyRejection('UNKNOWN_HOST');
      return {
        ready: false,
        status: 'denied',
        reasonCodes: ['UNKNOWN_HOST'],
        project: task.project,
        taskDigest,
        executionTarget: 'local',
        localHostId,
      };
    }
    const isRemote = task.project.hostId !== localHostId;

    let canonicalProject: FleetProject | null = null;
    let resolved: ResolvedPolicyContext | null = null;
    try {
      if (isRemote) {
        await this.assertRemoteProjectInventoryAssociation(task.project);
        const identity = this.resolveProvisionalRemoteIdentity(
          config,
          task.project,
        );
        canonicalProject = {
          ...task.project,
          logicalProjectId: identity.logicalProjectId,
        };
        resolved = {
          config,
          domain: identity.domain,
          account: identity.account,
          policyDigest: policyDigest(config),
        };
      } else {
        canonicalProject = await this.resolveCanonicalProject(
          task.project,
          config,
        );
        resolved = await this.policyService.resolve(canonicalProject);
        const verification = this.requireRunnerFor(
          config,
          task.project.hostId,
        ).validateVerification(task.verification);
        if (!verification.ok) {
          reasonCodes.push(
            'EVALUATOR_CONTRACT_INVALID',
            ...verification.reasonCodes,
          );
        }
      }
    } catch (err: unknown) {
      const code = reasonCodeOf(err, 'POLICY_RESOLUTION_FAILED');
      await this.recordPolicyRejection(code);
      reasonCodes.push(code);
    }

    if (isRemote) {
      try {
        await this.loadVerifiedSetup();
        await this.resolveCoordinatorSigner(config);
      } catch (err: unknown) {
        reasonCodes.push(reasonCodeOf(err, 'REMOTE_PREREQUISITE_MISSING'));
      }
    } else {
      const doctorReport = await this.doctor();
      if (!doctorReport.supported) {
        reasonCodes.push(...doctorReport.reasonCodes);
      }
    }

    const ready = reasonCodes.length === 0;
    return {
      ready,
      status: ready ? 'ready' : 'denied',
      reasonCodes: Array.from(new Set(reasonCodes)),
      resolvedDomain: resolved?.domain,
      resolvedAccountId: resolved?.account.id,
      resolvedAccountProvider: resolved?.account.provider,
      resolvedAccountModel: resolved?.account.model,
      policyDigest: resolved?.policyDigest,
      project: canonicalProject ?? task.project,
      taskDigest,
      executionTarget: isRemote ? 'remote' : 'local',
      localHostId,
      remoteHostId: isRemote ? task.project.hostId : undefined,
    };
  }

  /**
   * Executes one bounded Propose/Probe/Compose campaign, or a frozen heldout evaluation.
   */
  async run(
    taskInput: FleetTask,
    options: FleetCoordinatorRunOptions = {},
  ): Promise<FleetRunSummary> {
    const task = parseFleetTask(taskInput);
    if (!task.replaySafe) {
      await this.recordPolicyRejection('REASON_REPLAY_UNSAFE');
      throw new HarnessError(
        'REPLAY_UNSAFE',
        `Task "${task.id}" has replaySafe=false. Unsafe experiments are denied.`,
      );
    }

    const config = await this.policyService.load();
    const localHostId = (await resolveAuthenticatedLocalHost(config)).hostId;
    if (!config.hosts.some((host) => host.serverId === task.project.hostId)) {
      throw new HarnessError(
        'UNKNOWN_REMOTE_HOST',
        `Host "${task.project.hostId}" is not enrolled in fleet hosts. Execution denied.`,
      );
    }

    if (task.phase === 'heldout') {
      const planDigest = options.planDigest;
      if (planDigest) {
        if (
          options.plannedAttemptId !== undefined ||
          options.candidateAttemptId !== undefined
        ) {
          const selectedPlan = await this.executePlanByDigest(
            planDigest,
            config,
            undefined,
            undefined,
            true,
          );
          const plannedCase = selectedPlan.plan.cases.find(
            (entry) => entry.taskDigest === canonicalDigest(task),
          );
          if (
            !plannedCase ||
            (options.plannedAttemptId !== undefined &&
              options.plannedAttemptId !== plannedCase.baselineAttemptId) ||
            (options.candidateAttemptId !== undefined &&
              options.candidateAttemptId !== plannedCase.candidateAttemptId)
          ) {
            throw new HarnessError(
              'PLANNED_ATTEMPT_ID_CONFLICT',
              'Caller-supplied attempt identifiers do not match the selected frozen plan roles',
            );
          }
        }
        const result = await this.executePlanByDigest(
          planDigest,
          config,
          options.runId,
          options.budgetId,
        );
        return await this.toRunSummary(
          {
            planDigest: result.planDigest,
            cases: planCaseSummaries(result.plan),
            evaluation: result.evaluation,
          },
          result.runId ?? '',
          result.budgetId ?? '',
        );
      }
      if (
        options.plannedAttemptId !== undefined ||
        options.candidateAttemptId !== undefined
      ) {
        throw new HarnessError(
          'PLAN_DIGEST_REQUIRED_FOR_ATTEMPT_IDS',
          'Caller-supplied attempt identifiers are valid only when resuming an explicit frozen plan digest',
        );
      }
      if (!options.releaseDigest) {
        throw new HarnessError(
          'RELEASE_DIGEST_REQUIRED',
          'Heldout execution requires the immutable digest of the selected candidate release',
        );
      }
      const context = await this.prepareTaskContext(task, config, localHostId);
      try {
        const planResult = await this.executeEvaluationPlan({
          id: task.id,
          contexts: [context],
          releaseDigest: options.releaseDigest,
          config,
          runId: options.runId,
          budgetId: options.budgetId,
          mode: 'execute',
        });
        const planDigest = planResult.planDigest;
        if (planResult.mode !== 'executed' || typeof planDigest !== 'string') {
          throw new HarnessError(
            'EVALUATION_NOT_EXECUTED',
            'Heldout execution did not produce a frozen plan',
          );
        }
        const rawInput = await this.store.read<unknown>(
          `${EVAL_INPUT_PREFIX}${planDigest}`,
          null,
        );
        if (rawInput === null) {
          throw new HarnessError(
            'PLAN_EPOCH_MISSING',
            'Frozen evaluation input is missing after execution',
          );
        }
        const evaluationInput = parseEvaluationInput(rawInput);
        return await this.toRunSummary(
          {
            planDigest,
            cases: planResult.cases,
            ...(planResult.evaluation
              ? { evaluation: planResult.evaluation }
              : {}),
          },
          evaluationInput.runId,
          evaluationInput.budgetId,
        );
      } finally {
        await this.releaseTaskContext(context);
      }
    }

    const context = await this.prepareTaskContext(task, config, localHostId);
    try {
      const { runId, budgetId } = await this.establishBudget(config, options);
      return await this.runTraining(context, config, runId, budgetId);
    } finally {
      await this.releaseTaskContext(context);
    }
  }

  /**
   * Read-only preview by default; explicit execution freezes one common-baseline
   * multi-project/host plan before any admission and executes both evaluation sides.
   */
  async evaluateTasks(
    input: FleetEvaluationTasksInput,
    options: { execute?: boolean } = {},
  ): Promise<FleetEvaluationTasksResult> {
    if (input.schemaVersion !== 1) {
      throw new HarnessError(
        'INVALID_EVALUATION_INPUT',
        'schemaVersion must be 1',
      );
    }
    if (!Array.isArray(input.tasks) || input.tasks.length === 0) {
      throw new HarnessError(
        'INVALID_EVALUATION_INPUT',
        'tasks must be a non-empty array',
      );
    }
    if (input.tasks.length > MAX_EVALUATION_CASES) {
      throw new HarnessError(
        'HELDOUT_CASE_LIMIT_EXCEEDED',
        `At most ${MAX_EVALUATION_CASES} evaluation tasks are supported`,
      );
    }

    const config = await this.policyService.load();
    const localHostId = (await resolveAuthenticatedLocalHost(config)).hostId;
    const tasks = input.tasks.map((entry) => parseFleetTask(entry));
    for (const task of tasks) {
      if (task.phase !== 'heldout') {
        throw new HarnessError(
          'INVALID_EVALUATION_INPUT',
          `Task "${task.id}" must be phase 'heldout' for representative evaluation`,
        );
      }
    }

    const contexts: TaskExecutionContext[] = [];
    const execute = options.execute === true;
    try {
      for (const task of tasks) {
        contexts.push(
          await this.prepareTaskContext(task, config, localHostId, {
            createSnapshot: execute,
          }),
        );
      }

      const planResult = await this.executeEvaluationPlan({
        id: input.id,
        contexts,
        releaseDigest: input.releaseDigest,
        config,
        runId: input.runId,
        budgetId: input.budgetId,
        mode: execute ? 'execute' : 'preview',
      });
      return planResult;
    } finally {
      for (const context of contexts) {
        await this.releaseTaskContext(context);
      }
    }
  }

  /**
   * Aggregation-only preview or explicit resume of an already frozen plan.
   */
  async evaluatePlan(
    planDigest: string,
    options: { execute?: boolean } = {},
  ): Promise<FleetEvaluationPlanResult> {
    const config = await this.policyService.load();
    const result = await this.executePlanByDigest(
      planDigest,
      config,
      undefined,
      undefined,
      options.execute !== true,
    );
    return {
      mode: options.execute ? 'executed' : 'preview',
      planDigest: result.planDigest,
      plan: result.plan,
      evaluation: result.evaluation,
      attemptsSummary: result.attemptsSummary,
    };
  }

  async cancel(attemptId: string): Promise<FleetCancelResult> {
    const attempt = await this.ledger.getAttempt(attemptId);
    if (!attempt) {
      throw new HarnessError(
        'ATTEMPT_NOT_FOUND',
        `Attempt "${attemptId}" not found in ledger`,
      );
    }
    if (
      attempt.state === 'completed' ||
      attempt.state === 'failed' ||
      attempt.state === 'cancelled' ||
      attempt.state === 'fenced'
    ) {
      return {
        attemptId,
        status: 'already_terminal',
        terminationConfirmed: true,
      };
    }

    const config = await this.policyService.load();
    const localHostId = (await resolveAuthenticatedLocalHost(config)).hostId;

    if (attempt.hostId === localHostId) {
      try {
        const evidence = await this.terminateAllRoles(attempt);
        await this.ledger.fence(attempt.id, attempt.token, evidence);
        return {
          attemptId,
          status: 'terminated',
          terminationConfirmed: true,
          evidence,
        };
      } catch (err: unknown) {
        if (attempt.state !== 'unknown') {
          await this.ledger
            .markUnknown(attempt.id, attempt.token)
            .catch(() => undefined);
        }
        return {
          attemptId,
          status: 'unknown',
          terminationConfirmed: false,
          errorCode: reasonCodeOf(err, 'TERMINATION_UNCONFIRMED'),
        };
      }
    }

    const host = config.hosts.find(
      (entry) => entry.serverId === attempt.hostId,
    );
    if (!host) {
      await this.ledger.markUnknown(attempt.id, attempt.token);
      return {
        attemptId,
        status: 'unknown',
        terminationConfirmed: false,
        errorCode: 'HOST_NOT_CONFIGURED',
      };
    }

    try {
      const signer = await this.resolveCoordinatorSigner(config);
      const receipt = await this.dispatcher.cancel(
        host,
        attempt.id,
        attempt.generation,
        attempt.binding,
        signer.id,
        signer.privateKey,
      );
      await this.evidenceVerifier.recordVerifiedReceipt(receipt);
      if (receipt.payload.terminationConfirmed) {
        const remoteEvidence: TerminationEvidence = {
          attemptId: attempt.id,
          generation: attempt.generation,
          confirmed: true,
          observedAt: receipt.payload.observedAt,
          containerIds: receipt.payload.containerIds,
          workerBootId: receipt.payload.workerBootId,
        };
        await this.ledger.fence(attempt.id, attempt.token, remoteEvidence);
        return {
          attemptId,
          status: 'terminated',
          terminationConfirmed: true,
          evidence: remoteEvidence,
        };
      }
    } catch {
      // Fall through to unknown; reservations stay held.
    }

    if (attempt.state !== 'unknown') {
      await this.ledger
        .markUnknown(attempt.id, attempt.token)
        .catch(() => undefined);
    }
    return { attemptId, status: 'unknown', terminationConfirmed: false };
  }

  /**
   * Observation-first reconciliation. Healthy in-flight work is never force-terminated;
   * only proven absence fences, and only an expired owned deadline triggers termination.
   */
  async reconcile(): Promise<FleetReconcileResult> {
    const attempts = await this.ledger.list();
    const config = await this.policyService.load();
    const localHostId = (await resolveAuthenticatedLocalHost(config)).hostId;

    let reconciled = 0;
    let fenced = 0;
    let unknownCount = 0;
    let active = 0;
    let recoveredCount = 0;

    for (const listed of attempts) {
      const attempt = await this.ledger.getAttempt(listed.id);
      if (!attempt) continue;
      const terminal =
        attempt.state === 'completed' ||
        attempt.state === 'failed' ||
        attempt.state === 'cancelled' ||
        attempt.state === 'fenced';
      if (terminal) {
        if (attempt.state === 'completed' || attempt.state === 'failed') {
          if (!attempt.result) {
            throw new HarnessError(
              'RECOVERY_RESULT_MISSING',
              `Terminal attempt "${attempt.id}" has no result`,
            );
          }
          if (attempt.hostId === localHostId) {
            const repaired = await this.recoverLocalOutcome(attempt);
            if (!repaired?.result) {
              throw new HarnessError(
                'RECOVERY_OUTCOME_MISSING',
                `Terminal local attempt "${attempt.id}" has no verifiable durable outcome`,
              );
            }
          } else {
            await this.repairTerminalEvidence(attempt);
          }
          recoveredCount++;
        }
        continue;
      }
      reconciled++;

      if (attempt.hostId === localHostId) {
        try {
          // Durable full outcome wins over absence fencing: never lose completed work.
          const recovered = await this.recoverLocalOutcome(attempt);
          if (recovered?.result) {
            recoveredCount++;
            continue;
          }
          const inspection = await this.inspectAllRoles(attempt);
          if (inspection.confirmed) {
            await this.ledger.fence(attempt.id, attempt.token, inspection);
            fenced++;
            continue;
          }
          if (Date.now() >= attempt.deadline) {
            const evidence = await this.terminateAllRoles(attempt);
            await this.ledger.fence(attempt.id, attempt.token, evidence);
            fenced++;
            continue;
          }
          active++;
          continue;
        } catch (err: unknown) {
          if (
            err instanceof HarnessError &&
            err.code === 'EVIDENCE_RECOVERY_FAILED'
          )
            throw err;
          // Retain unknown while observation is inconclusive.
        }
      } else {
        const host = config.hosts.find(
          (entry) => entry.serverId === attempt.hostId,
        );
        if (host) {
          try {
            const signer = await this.resolveCoordinatorSigner(config);
            const receipt = await this.dispatcher.status(
              host,
              attempt.id,
              attempt.generation,
              attempt.binding,
              signer.id,
              signer.privateKey,
            );
            await this.evidenceVerifier.recordVerifiedReceipt(receipt);

            if (
              receipt.payload.result &&
              (receipt.payload.status === 'completed' ||
                receipt.payload.status === 'failed')
            ) {
              let recoveredBundle: HarnessBundle | undefined;
              if (
                receipt.payload.status === 'completed' &&
                (attempt.binding.stage === 'proposal' ||
                  attempt.binding.stage === 'compose')
              ) {
                const inputRaw = await this.store.read<unknown>(
                  remoteInputBundleName(attempt),
                  null,
                );
                const inputBundle = HarnessBundleSchema.safeParse(inputRaw);
                if (!inputBundle.success) {
                  throw new HarnessError(
                    'RECOVERY_INPUT_UNAVAILABLE',
                    `Admitted input bundle for remote attempt "${attempt.id}" is unavailable`,
                  );
                }
                recoveredBundle = requireRemoteOutputBundle(
                  receipt,
                  inputBundle.data,
                );
              }
              let settlementAttempt = attempt;
              if (settlementAttempt.state === 'admitted') {
                settlementAttempt = await this.ledger.markUnknown(
                  settlementAttempt.id,
                  settlementAttempt.token,
                );
              }
              const termination =
                receipt.payload.status === 'failed'
                  ? {
                      attemptId: attempt.id,
                      generation: attempt.generation,
                      confirmed: receipt.payload.terminationConfirmed === true,
                      observedAt: receipt.payload.observedAt,
                      containerIds: receipt.payload.containerIds,
                      workerBootId: receipt.payload.workerBootId,
                    }
                  : undefined;
              if (
                receipt.payload.status === 'failed' &&
                !termination?.confirmed
              ) {
                throw new HarnessError(
                  'REMOTE_TERMINATION_UNCONFIRMED',
                  `Failed remote result for "${attempt.id}" lacks confirmed termination`,
                );
              }
              const settled = await this.ledger.finish(
                settlementAttempt.id,
                settlementAttempt.token,
                receipt.payload.result,
                termination,
              );
              const taskRaw = await this.store.read<unknown>(
                `remote-task-${attempt.id}`,
                null,
              );
              if (taskRaw === null || !settled.result) {
                throw new HarnessError(
                  'RECOVERY_TASK_MISSING',
                  `Persisted task or result for remote attempt "${attempt.id}" is unavailable`,
                );
              }
              try {
                const task = parseFleetTask(taskRaw);
                await this.evidenceService.record(task, settled.result);
              } catch (err: unknown) {
                throw new HarnessError('EVIDENCE_RECOVERY_FAILED', String(err));
              }
              if (recoveredBundle && settled.state === 'completed') {
                await this.releaseService.propose(recoveredBundle);
              }
              recoveredCount++;
              continue;
            }
            if (receipt.payload.terminationConfirmed) {
              const remoteEvidence: TerminationEvidence = {
                attemptId: attempt.id,
                generation: attempt.generation,
                confirmed: true,
                observedAt: receipt.payload.observedAt,
                containerIds: receipt.payload.containerIds,
                workerBootId: receipt.payload.workerBootId,
              };
              await this.ledger.fence(
                attempt.id,
                attempt.token,
                remoteEvidence,
              );
              fenced++;
              continue;
            }
          } catch (err: unknown) {
            if (
              err instanceof HarnessError &&
              (err.code === 'EVIDENCE_RECOVERY_FAILED' ||
                err.code === 'RECOVERY_TASK_MISSING')
            ) {
              throw err;
            }
            // Retain unknown; nothing is inferred from a failed status query.
          }
        }
      }

      if (Date.now() >= attempt.deadline) {
        if (attempt.state !== 'unknown') {
          await this.ledger.markUnknown(attempt.id, attempt.token);
        }
        unknownCount++;
      } else {
        active++;
      }
    }

    return {
      reconciledAttempts: reconciled,
      fencedAttempts: fenced,
      unknownAttempts: unknownCount,
      activeAttempts: active,
      recoveredAttempts: recoveredCount,
    };
  }

  async status(): Promise<FleetStatusSummary> {
    const projects = await this.getMergedProjectInventory();

    let config: FleetConfig | null;
    try {
      config = await this.policyService.load();
    } catch {
      config = null;
    }
    const localHostId = config
      ? (await resolveAuthenticatedLocalHost(config)).hostId
      : null;

    const hosts: FleetStatusSummary['hosts'] = [];
    let fresh: FreshProjectEntry[];
    try {
      fresh = await this.getFreshProjectInventory();
    } catch {
      fresh = [];
    }
    if (config) {
      const freshByHost = new Map(
        fresh.map((entry) => [entry.hostId, entry.status]),
      );
      for (const host of config.hosts) {
        const status = freshByHost.get(host.serverId);
        hosts.push({
          serverId: host.serverId,
          status:
            status === 'reachable'
              ? 'reachable'
              : status === 'unreachable'
                ? 'unreachable'
                : host.serverId === localHostId
                  ? 'configured'
                  : 'unreachable',
        });
      }
    }

    const attempts = await this.ledger.list();
    const counts = {
      total: attempts.length,
      admitted: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      unknown: 0,
      fenced: 0,
    };

    let totalToolCalls = 0;
    let totalDurationMs = 0;
    let costKnown = true;
    let totalCostUsd = 0;
    let resourceTotalsKnown = true;

    for (const attempt of attempts) {
      counts[attempt.state] += 1;
      if (
        attempt.state === 'admitted' ||
        attempt.state === 'running' ||
        attempt.state === 'unknown' ||
        !attempt.result
      ) {
        resourceTotalsKnown = false;
      }
      if (attempt.result) {
        totalToolCalls += attempt.result.toolCalls;
        totalDurationMs += attempt.result.durationMs;
        if (attempt.result.costUsd === null) {
          costKnown = false;
        } else {
          totalCostUsd += attempt.result.costUsd;
        }
      }
    }

    const budgets = await this.ledger.listBudgets();
    const now = Date.now();
    const activeBudgetIds = new Set(
      attempts
        .filter(
          (attempt) =>
            attempt.state === 'admitted' ||
            attempt.state === 'running' ||
            attempt.state === 'unknown',
        )
        .map((attempt) => attempt.binding.budgetId),
    );

    const policyRejections = await this.store.read<Record<string, number>>(
      POLICY_REJECTIONS_RECORD,
      {},
    );

    let rollout = { activePinsCount: 0, canariesCount: 0, withdrawnCount: 0 };
    try {
      const relStatus = await this.releaseService.status();
      rollout = {
        activePinsCount: relStatus.activePinsCount,
        canariesCount: relStatus.canariesCount,
        withdrawnCount: relStatus.withdrawnCount,
      };
    } catch {
      // Release service has no state yet.
    }

    return {
      projects,
      hosts,
      budgets: {
        epochsCount: budgets.length,
        activeEpochsCount: budgets.filter(
          (epoch) => epoch.deadline > now || activeBudgetIds.has(epoch.id),
        ).length,
      },
      attempts: counts,
      resources: {
        toolCalls: resourceTotalsKnown ? totalToolCalls : null,
        durationMs: totalDurationMs,
        costUsd: resourceTotalsKnown && costKnown ? totalCostUsd : null,
      },
      policyRejections,
      rollout,
    };
  }

  // -------------------------------------------------------------------------
  // Remote worker entry points
  // -------------------------------------------------------------------------

  async handleRemoteRequest(encoded: string): Promise<SignedWorkerReceipt> {
    const rawRequest = decodePayloadBase64(encoded);
    const config = await this.policyService.load();
    const localHost = this.requireWorkerHost(config);

    const request = validateExecutionRequest(
      rawRequest,
      localHost.serverId,
      config.coordinators,
      Date.now(),
    );
    const payloadDigest = canonicalDigest(request.payload);

    const acceptedName = `${ACCEPTED_RECEIPT_PREFIX}${request.payload.requestId}`;
    const acceptedBootId = await getWorkerBootId(this.store.stateDir);
    await this.ensureAcceptedReceipt(acceptedName, () =>
      signWorkerReceipt(
        localHost.serverId,
        {
          purpose: 'ags-fleet-receipt-v1',
          requestId: request.payload.requestId,
          attemptId: request.payload.attemptId,
          generation: request.payload.generation,
          binding: request.payload.binding,
          workerBootId: acceptedBootId,
          observedAt: Date.now(),
          status: 'accepted',
          containerIds: [],
        },
        localHost.signingKeyFile,
      ),
    );

    const decision = await this.consumeRequest(
      request.payload.requestId,
      request.payload.nonce,
      payloadDigest,
      request.payload.attemptId,
      request.payload.generation,
      config.generation,
      acceptedName,
      acceptedBootId,
      process.pid,
    );

    let resumeAdmittedAttempt: Attempt | undefined;
    if (decision.replay) {
      if (decision.denial) {
        throw new HarnessError(decision.denial.code, decision.denial.message);
      }
      if (decision.phase === 'denied') {
        throw new HarnessError(
          'REQUEST_DENIED',
          'The request was durably denied',
        );
      }
      if (decision.phase === 'settled' && decision.status !== 'unknown') {
        const terminalAttempt = await this.ledger.getAttempt(
          request.payload.attemptId,
        );
        if (
          !terminalAttempt ||
          terminalAttempt.generation !== request.payload.generation ||
          canonicalJSON(terminalAttempt.binding) !==
            canonicalJSON(request.payload.binding)
        ) {
          throw new HarnessError(
            'ATTEMPT_BINDING_CONFLICT',
            'Settled request has no matching ledger attempt and binding',
          );
        }
        const recovered = await this.buildRecoveryReceipt(
          terminalAttempt,
          request,
          localHost,
        );
        await this.persistReceipt(recovered);
        const status = recovered.payload.status;
        await this.markRequestReceipt(
          request.payload.requestId,
          remoteReceiptName(recovered),
          status === 'completed' ||
            status === 'failed' ||
            status === 'terminated'
            ? status
            : 'unknown',
        );
        return recovered;
      }
      if (
        decision.ownerAlive !== false &&
        decision.receiptName === acceptedName
      ) {
        throw new HarnessError(
          'REQUEST_IN_PROGRESS',
          'Another live worker owner is processing this request',
        );
      }
      const alreadyAdmitted = await this.ledger.getAttempt(
        request.payload.attemptId,
      );
      if (alreadyAdmitted) {
        const sameAttempt =
          alreadyAdmitted.generation === request.payload.generation &&
          canonicalJSON(alreadyAdmitted.binding) ===
            canonicalJSON(request.payload.binding) &&
          alreadyAdmitted.binding.budgetId === request.payload.budget.id &&
          alreadyAdmitted.binding.runId === request.payload.budget.runId;
        if (!sameAttempt) {
          throw new HarnessError(
            'ATTEMPT_BINDING_CONFLICT',
            'Existing attempt does not match the signed request binding and original epoch',
          );
        }
        if (
          decision.phase === 'admission' &&
          decision.ownerAlive === false &&
          alreadyAdmitted.state === 'admitted'
        ) {
          // The durable phase is still admission: the previous owner never crossed
          // the launch fence. consumeRequest has atomically transferred ownership,
          // so this exact signed request may launch once under its original attempt.
          resumeAdmittedAttempt = alreadyAdmitted;
        } else {
          const recovered = await this.buildRecoveryReceipt(
            alreadyAdmitted,
            request,
            localHost,
          );
          await this.persistReceipt(recovered);
          const status = recovered.payload.status;
          await this.markRequestReceipt(
            request.payload.requestId,
            remoteReceiptName(recovered),
            status === 'completed' ||
              status === 'failed' ||
              status === 'terminated'
              ? status
              : 'unknown',
          );
          return recovered;
        }
      }
      if (decision.receiptName !== acceptedName && !resumeAdmittedAttempt) {
        return this.loadPersistedReceipt(decision.receiptName);
      }
    }
    let attempt!: Attempt;
    let localResolved: ResolvedPolicyContext;
    let canonicalProject: FleetProject;
    try {
      canonicalProject = await this.resolveCanonicalProject(
        request.payload.task.project,
        config,
      );
      if (
        canonicalProject.hostId !== request.payload.task.project.hostId ||
        canonicalProject.projectId !== request.payload.task.project.projectId ||
        canonicalProject.logicalProjectId !==
          request.payload.task.project.logicalProjectId
      ) {
        throw new HarnessError(
          'WORKER_PROJECT_IDENTITY_MISMATCH',
          "Signed project identity does not match this host's fresh inventory authority",
        );
      }
      localResolved = await this.policyService.resolve(canonicalProject);
      this.assertWorkerAuthority(request, localResolved, localHost);
      const workerRunner = this.requireRunnerFor(
        localResolved.config,
        localHost.serverId,
      );
      const verificationContract = workerRunner.validateVerification(
        request.payload.task.verification,
      );
      if (!verificationContract.ok) {
        throw new HarnessError(
          'EVALUATOR_CONTRACT_INVALID',
          `Trusted evaluator contract is invalid: ${verificationContract.reasonCodes.join(', ')}`,
        );
      }
      await this.persistSignedHeldoutPlan(request, localResolved.config);
      await this.ensureMirrorBudget(
        request.payload.budget,
        localResolved.config,
      );

      await this.assertRequestNotDenied(request.payload.requestId);
      if (resumeAdmittedAttempt) {
        const resumed = await this.ledger.getAttempt(request.payload.attemptId);
        if (
          !resumed ||
          resumed.generation !== resumeAdmittedAttempt.generation ||
          canonicalJSON(resumed.binding) !==
            canonicalJSON(resumeAdmittedAttempt.binding)
        ) {
          throw new HarnessError(
            'ATTEMPT_BINDING_CONFLICT',
            'Admitted request changed binding before its one permitted launch recovery',
          );
        }
        if (resumed.state !== 'admitted') {
          const recovered = await this.buildRecoveryReceipt(
            resumed,
            request,
            localHost,
          );
          await this.persistReceipt(recovered);
          await this.markRequestReceipt(
            request.payload.requestId,
            remoteReceiptName(recovered),
            recovered.payload.status === 'completed' ||
              recovered.payload.status === 'failed' ||
              recovered.payload.status === 'terminated'
              ? recovered.payload.status
              : 'unknown',
          );
          return recovered;
        }
        attempt = resumed;
      } else {
        try {
          attempt = await this.ledger.reserve(
            request.payload.task,
            localResolved.account.id,
            localResolved.config,
            request.payload.binding,
            request.payload.attemptId,
          );
        } catch (err: unknown) {
          if (
            err instanceof HarnessError &&
            err.code === 'ATTEMPT_ALREADY_EXISTS'
          ) {
            const concurrent = await this.ledger.getAttempt(
              request.payload.attemptId,
            );
            if (concurrent) {
              if (
                concurrent.generation !== request.payload.generation ||
                canonicalJSON(concurrent.binding) !==
                  canonicalJSON(request.payload.binding) ||
                concurrent.binding.budgetId !== request.payload.budget.id ||
                concurrent.binding.runId !== request.payload.budget.runId
              ) {
                throw new HarnessError(
                  'ATTEMPT_BINDING_CONFLICT',
                  'Existing attempt does not match the signed request binding and original epoch',
                );
              }
              const recovered = await this.buildRecoveryReceipt(
                concurrent,
                request,
                localHost,
              );
              await this.persistReceipt(recovered);
              await this.markRequestReceipt(
                request.payload.requestId,
                remoteReceiptName(recovered),
                recovered.payload.status === 'completed' ||
                  recovered.payload.status === 'failed' ||
                  recovered.payload.status === 'terminated'
                  ? recovered.payload.status
                  : 'unknown',
              );
              return recovered;
            }
          }
          throw err;
        }
      }
      if (attempt.generation !== request.payload.generation) {
        throw new HarnessError(
          'AUTHORITY_GENERATION_MISMATCH',
          `Ledger admitted generation ${attempt.generation} but the signed request authorizes ${request.payload.generation}`,
        );
      }
    } catch (err: unknown) {
      const code = reasonCodeOf(err, 'WORKER_ADMISSION_FAILED');
      // Pre-admission failures, including transient capacity, are terminal for this signed
      // request. A retry requires a new request under an explicitly authorized epoch.
      await this.markRequestDenied(
        request.payload.requestId,
        code,
        String(err),
      );
      throw err;
    }

    await this.markRequestReceipt(
      request.payload.requestId,
      acceptedName,
      'running',
    );
    try {
      const stage = request.payload.binding.stage;
      const isModelStage = stage === 'proposal' || stage === 'compose';
      const context: TaskExecutionContext = {
        task: request.payload.task,
        resolved: localResolved,
        hostRuntime: resolveHostRuntime(
          localResolved.config,
          request.payload.task.project.hostId,
        ),
        isRemote: false,
        snapshotDir: null,
        sourceRootPath: canonicalProject.rootPath,
      };
      const outcome = isModelStage
        ? await this.executeModelStage(
            context,
            request.payload.bundle,
            attempt,
            localResolved.config,
          )
        : await this.executeEvaluationStage(
            context,
            request.payload.bundle,
            attempt,
            localResolved.config,
          );

      const settled = await this.settle(attempt, outcome, request.payload.task);
      const confirmed = outcome.termination?.confirmed === true;
      // A settled execution fault (auth/config/isolation) is not verifier evidence: the
      // worker reports unknown so the campaign aborts instead of treating it as regression.
      const terminalStatus: RemoteRequestRecord['status'] =
        outcome.fatal !== undefined
          ? 'unknown'
          : confirmed && settled.state === 'completed'
            ? 'completed'
            : confirmed && settled.state === 'failed'
              ? 'failed'
              : 'unknown';

      const outputBundle =
        terminalStatus === 'completed' && isModelStage
          ? outcome.bundle
          : undefined;

      const terminalReceipt = signWorkerReceipt(
        localHost.serverId,
        {
          purpose: 'ags-fleet-receipt-v1',
          requestId: request.payload.requestId,
          attemptId: attempt.id,
          generation: attempt.generation,
          binding: attempt.binding,
          workerBootId:
            outcome.termination?.workerBootId ??
            (await getWorkerBootId(this.store.stateDir)),
          observedAt: Date.now(),
          status: terminalStatus,
          ...((terminalStatus === 'completed' || terminalStatus === 'failed') &&
          confirmed
            ? {
                resultDigest: canonicalDigest(outcome.result),
                artifactDigest: outcome.result.artifactDigest,
                result: outcome.result,
                terminationConfirmed: true,
              }
            : {}),
          ...(outputBundle ? { outputBundle } : {}),
          containerIds: outcome.termination?.containerIds ?? [],
        },
        localHost.signingKeyFile,
      );
      await this.persistReceipt(terminalReceipt);
      await this.markRequestReceipt(
        request.payload.requestId,
        remoteReceiptName(terminalReceipt),
        terminalStatus,
      );
      return terminalReceipt;
    } catch {
      await this.ledger
        .markUnknown(attempt.id, attempt.token)
        .catch(() => undefined);
      const unknownReceipt = signWorkerReceipt(
        localHost.serverId,
        {
          purpose: 'ags-fleet-receipt-v1',
          requestId: request.payload.requestId,
          attemptId: attempt.id,
          generation: attempt.generation,
          binding: attempt.binding,
          workerBootId: await getWorkerBootId(this.store.stateDir),
          observedAt: Date.now(),
          status: 'unknown',
          containerIds: [],
        },
        localHost.signingKeyFile,
      );
      await this.persistReceipt(unknownReceipt);
      await this.markRequestReceipt(
        request.payload.requestId,
        remoteReceiptName(unknownReceipt),
        'unknown',
      );
      return unknownReceipt;
    }
  }

  /**
   * Builds a truthful receipt for an already-admitted attempt (replay/status recovery).
   * Completed model stages re-emit the persisted bounded output bundle so a lost
   * acknowledgment never requires another paid model execution.
   */
  private async buildRecoveryReceipt(
    attempt: Attempt,
    request: SignedExecutionRequest | null,
    localHost: FleetHost,
    controlRequestId?: string,
  ): Promise<SignedWorkerReceipt> {
    const recovered = await this.recoverLocalOutcome(attempt);
    if (recovered) {
      attempt = recovered;
    } else if (attempt.state === 'completed' || attempt.state === 'failed') {
      throw new HarnessError(
        'RECOVERY_OUTCOME_MISSING',
        `Terminal attempt "${attempt.id}" has no verifiable durable outcome`,
      );
    } else if (attempt.state === 'admitted' || attempt.state === 'running') {
      const inspection = await this.inspectAllRoles(attempt);
      const current = await this.ledger.getAttempt(attempt.id);
      if (
        inspection.confirmed &&
        current &&
        current.state !== 'completed' &&
        current.state !== 'failed' &&
        current.state !== 'cancelled' &&
        current.state !== 'fenced'
      ) {
        attempt = await this.ledger.fence(
          attempt.id,
          attempt.token,
          inspection,
        );
      }
    }
    const isModelStage =
      attempt.binding.stage === 'proposal' ||
      attempt.binding.stage === 'compose';
    const requestId =
      controlRequestId ?? request?.payload.requestId ?? crypto.randomUUID();

    let status: SignedWorkerReceipt['payload']['status'];
    let result: RunResult | undefined;
    let terminationConfirmed = false;
    let containerIds: string[] = [];

    if (attempt.state === 'completed' && attempt.result) {
      status = 'completed';
      result = attempt.result;
      terminationConfirmed = true;
      containerIds = attempt.terminationEvidence?.containerIds ?? [];
    } else if (
      attempt.state === 'failed' &&
      attempt.result &&
      attempt.terminationEvidence
    ) {
      status = 'failed';
      result = attempt.result;
      terminationConfirmed = attempt.terminationEvidence.confirmed === true;
      containerIds = attempt.terminationEvidence.containerIds;
    } else if (attempt.state === 'fenced') {
      status = 'terminated';
      terminationConfirmed = attempt.terminationEvidence?.confirmed === true;
      containerIds = attempt.terminationEvidence?.containerIds ?? [];
    } else {
      status =
        attempt.state === 'admitted'
          ? 'unknown'
          : attempt.state === 'running'
            ? 'running'
            : 'unknown';
    }

    let outputBundle: HarnessBundle | undefined;
    if (status === 'completed' && isModelStage) {
      const recovered = await this.readPersistedOutputBundle(attempt);
      if (!recovered) {
        throw new HarnessError(
          'RECOVERY_OUTPUT_UNAVAILABLE',
          'Completed model stage has no durable persisted output bundle',
        );
      }
      outputBundle = recovered;
    }

    return signWorkerReceipt(
      localHost.serverId,
      {
        purpose: 'ags-fleet-receipt-v1',
        requestId,
        attemptId: attempt.id,
        generation: attempt.generation,
        binding: attempt.binding,
        workerBootId: await getWorkerBootId(this.store.stateDir),
        observedAt: Date.now(),
        status,
        ...((status === 'completed' || status === 'failed') && result
          ? {
              resultDigest: canonicalDigest(result),
              artifactDigest: result.artifactDigest,
              result,
            }
          : {}),
        ...(outputBundle ? { outputBundle } : {}),
        containerIds,
        ...(terminationConfirmed &&
        (status === 'completed' ||
          status === 'failed' ||
          status === 'terminated')
          ? { terminationConfirmed: true }
          : {}),
      },
      localHost.signingKeyFile,
    );
  }

  async handleRemoteControl(encoded: string): Promise<SignedWorkerReceipt> {
    const rawControl = decodePayloadBase64(encoded);
    const config = await this.policyService.load();
    const localHost = this.requireWorkerHost(config);

    const controlRequest = validateControlRequest(
      rawControl,
      localHost.serverId,
      config.coordinators,
      Date.now(),
    );
    const payloadDigest = canonicalDigest(controlRequest.payload);

    const ownerBootId = await getWorkerBootId(this.store.stateDir);
    const decision = await this.consumeControl(
      controlRequest.payload.requestId,
      controlRequest.payload.nonce,
      payloadDigest,
      controlRequest.payload.attemptId,
      ownerBootId,
      process.pid,
    );
    if (decision.denial) {
      throw new HarnessError(decision.denial.code, decision.denial.message);
    }
    if (decision.replay && decision.receiptName) {
      const existingAttempt = await this.ledger.getAttempt(
        controlRequest.payload.attemptId,
      );
      if (
        !existingAttempt ||
        existingAttempt.generation !== controlRequest.payload.generation ||
        canonicalDigest(existingAttempt.binding) !==
          controlRequest.payload.bindingDigest
      ) {
        throw new HarnessError(
          'CONTROL_BINDING_MISMATCH',
          'Persisted control receipt has no matching current ledger attempt',
        );
      }
      const recovered = await this.buildRecoveryReceipt(
        existingAttempt,
        null,
        localHost,
        controlRequest.payload.requestId,
      );
      await this.persistReceipt(recovered);
      await this.markControlReceipt(
        controlRequest.payload.requestId,
        remoteReceiptName(recovered),
      );
      return recovered;
    }
    if (
      decision.replay &&
      decision.ownerAlive !== false &&
      decision.phase !== 'settled' &&
      decision.phase !== 'denied'
    ) {
      throw new HarnessError(
        'CONTROL_IN_PROGRESS',
        'Another live worker owner is processing this control request',
      );
    }
    if (decision.replay && decision.phase === 'settled') {
      throw new HarnessError(
        'CONTROL_RECEIPT_MISSING',
        'A settled control journal entry has no durable signed receipt',
      );
    }
    if (decision.replay && decision.phase === 'denied') {
      throw new HarnessError(
        'CONTROL_DENIED',
        'The control request was durably denied',
      );
    }

    let attempt = await this.ledger.getAttempt(
      controlRequest.payload.attemptId,
    );
    if (!attempt) {
      await this.markControlDenied(
        controlRequest.payload.requestId,
        'ATTEMPT_NOT_FOUND',
        `Attempt "${controlRequest.payload.attemptId}" not found in ledger`,
      );
      throw new HarnessError(
        'ATTEMPT_NOT_FOUND',
        `Attempt "${controlRequest.payload.attemptId}" not found in ledger`,
      );
    }

    if (controlRequest.payload.generation !== attempt.generation) {
      const code =
        controlRequest.payload.generation < attempt.generation
          ? 'STALE_GENERATION'
          : 'FUTURE_GENERATION';
      await this.markControlDenied(
        controlRequest.payload.requestId,
        code,
        code,
      );
      throw new HarnessError(
        code,
        `Control generation ${controlRequest.payload.generation} does not equal current attempt generation ${attempt.generation}`,
      );
    }
    if (
      controlRequest.payload.bindingDigest !== canonicalDigest(attempt.binding)
    ) {
      await this.markControlDenied(
        controlRequest.payload.requestId,
        'CONTROL_BINDING_MISMATCH',
        'Control binding digest does not match the stored attempt binding',
      );
      throw new HarnessError(
        'CONTROL_BINDING_MISMATCH',
        'Control binding digest does not match the stored attempt binding',
      );
    }
    await this.recoverLocalOutcome(attempt);
    const currentAttempt = await this.ledger.getAttempt(attempt.id);
    if (!currentAttempt) {
      throw new HarnessError(
        'ATTEMPT_NOT_FOUND',
        `Attempt "${attempt.id}" disappeared after recovery`,
      );
    }
    attempt = currentAttempt;
    if (
      attempt.state === 'completed' ||
      attempt.state === 'failed' ||
      attempt.state === 'cancelled' ||
      attempt.state === 'fenced'
    ) {
      const terminalReceipt = await this.buildRecoveryReceipt(
        attempt,
        null,
        localHost,
        controlRequest.payload.requestId,
      );
      await this.persistReceipt(terminalReceipt);
      await this.markControlReceipt(
        controlRequest.payload.requestId,
        remoteReceiptName(terminalReceipt),
      );
      return terminalReceipt;
    }

    let termination: TerminationEvidence;
    let status: SignedWorkerReceipt['payload']['status'];

    await this.markControlExecuting(controlRequest.payload.requestId);
    if (controlRequest.payload.action === 'cancel') {
      try {
        termination = await this.inspectAllRoles(attempt);
        let current = await this.ledger.getAttempt(attempt.id);
        if (!current)
          throw new HarnessError(
            'ATTEMPT_NOT_FOUND',
            `Attempt "${attempt.id}" disappeared`,
          );
        await this.recoverLocalOutcome(current);
        const currentAfterRecovery = await this.ledger.getAttempt(attempt.id);
        if (!currentAfterRecovery) {
          throw new HarnessError(
            'ATTEMPT_NOT_FOUND',
            `Attempt "${attempt.id}" disappeared after recovery`,
          );
        }
        current = currentAfterRecovery;
        if (
          current.state === 'completed' ||
          current.state === 'failed' ||
          current.state === 'cancelled' ||
          current.state === 'fenced'
        ) {
          const terminalReceipt = await this.buildRecoveryReceipt(
            current,
            null,
            localHost,
            controlRequest.payload.requestId,
          );
          await this.persistReceipt(terminalReceipt);
          await this.markControlReceipt(
            controlRequest.payload.requestId,
            remoteReceiptName(terminalReceipt),
          );
          return terminalReceipt;
        }
        attempt = current;
        if (!termination.confirmed) {
          termination = await this.terminateAllRoles(attempt);
        }
        const latest = await this.ledger.getAttempt(attempt.id);
        if (!latest)
          throw new HarnessError(
            'ATTEMPT_NOT_FOUND',
            `Attempt "${attempt.id}" disappeared`,
          );
        const settledState =
          latest.state === 'admitted' ||
          latest.state === 'running' ||
          latest.state === 'unknown'
            ? await this.ledger.fence(latest.id, latest.token, termination)
            : latest;
        const terminalReceipt = await this.buildRecoveryReceipt(
          settledState,
          null,
          localHost,
          controlRequest.payload.requestId,
        );
        await this.persistReceipt(terminalReceipt);
        await this.markControlReceipt(
          controlRequest.payload.requestId,
          remoteReceiptName(terminalReceipt),
        );
        return terminalReceipt;
      } catch {
        termination = await this.inspectAllRoles(attempt);
        status = 'unknown';
      }
    } else {
      termination = await this.inspectAllRoles(attempt);
      const inspected = await this.ledger.getAttempt(attempt.id);
      if (!inspected)
        throw new HarnessError(
          'ATTEMPT_NOT_FOUND',
          `Attempt "${attempt.id}" disappeared`,
        );
      await this.recoverLocalOutcome(inspected);
      const currentAfterRecovery = await this.ledger.getAttempt(attempt.id);
      if (!currentAfterRecovery) {
        throw new HarnessError(
          'ATTEMPT_NOT_FOUND',
          `Attempt "${attempt.id}" disappeared after recovery`,
        );
      }
      const current = currentAfterRecovery;
      if (
        current.state === 'completed' ||
        current.state === 'failed' ||
        current.state === 'cancelled' ||
        current.state === 'fenced'
      ) {
        const terminalReceipt = await this.buildRecoveryReceipt(
          current,
          null,
          localHost,
          controlRequest.payload.requestId,
        );
        await this.persistReceipt(terminalReceipt);
        await this.markControlReceipt(
          controlRequest.payload.requestId,
          remoteReceiptName(terminalReceipt),
        );
        return terminalReceipt;
      }
      attempt = current;
      if (
        current.result &&
        (current.state === 'admitted' ||
          current.state === 'running' ||
          current.state === 'unknown')
      ) {
        throw new HarnessError(
          'RECOVERY_OUTCOME_MISSING',
          `Nonterminal attempt "${current.id}" unexpectedly has a result`,
        );
      }
      status = termination.confirmed
        ? current.state === 'admitted'
          ? 'accepted'
          : 'running'
        : 'unknown';
    }

    const receipt = signWorkerReceipt(
      localHost.serverId,
      {
        purpose: 'ags-fleet-receipt-v1',
        requestId: controlRequest.payload.requestId,
        attemptId: attempt.id,
        generation: attempt.generation,
        binding: attempt.binding,
        workerBootId: termination.workerBootId,
        observedAt: Date.now(),
        status,
        containerIds: termination.containerIds,
      },
      localHost.signingKeyFile,
    );

    await this.persistReceipt(receipt);
    await this.markControlReceipt(
      controlRequest.payload.requestId,
      remoteReceiptName(receipt),
    );
    return receipt;
  }

  // -------------------------------------------------------------------------
  // Campaign lifecycles
  // -------------------------------------------------------------------------

  private async runTraining(
    context: TaskExecutionContext,
    config: FleetConfig,
    runId: string,
    budgetId: string,
  ): Promise<FleetRunSummary> {
    const { task, resolved, hostRuntime } = context;
    const taskDigest = canonicalDigest(task);
    const logicalProjectId = resolveLogicalProjectId(task.project, config);
    const planDigest = canonicalDigest({ runId, budgetId, taskDigest });
    const baseBinding: ExecutionBinding = {
      runId,
      budgetId,
      taskDigest,
      hostId: task.project.hostId,
      projectId: task.project.projectId,
      logicalProjectId,
      domain: resolved.domain,
      accountId: resolved.account.id,
      provider: resolved.account.provider,
      model: resolved.account.model,
      sourceRevision: task.sourceRef,
      harnessDigest: canonicalDigest(task.baseline),
      evaluatorDigest: canonicalDigest(task.verification),
      runtimeDigest: hostRuntime.manifestDigest,
      policyDigest: resolved.policyDigest,
      phase: task.phase,
      stage: 'baseline',
      planDigest,
    };

    const baselineAttempt = await this.ledger.reserve(
      task,
      resolved.account.id,
      config,
      baseBinding,
    );
    const baseline = await this.executeStage(
      context,
      task.baseline,
      baselineAttempt,
      config,
    );
    await this.settle(baselineAttempt, baseline, task);
    assertVerifierOutcome(baseline);

    const baselinePassed = baseline.result.passed;
    let candidatePassed = false;
    let bestBundle = task.baseline;
    let bestDigest = canonicalDigest(task.baseline);
    let attemptsCount = 1;
    let toolCalls = baseline.result.toolCalls;
    let durationMs = baseline.result.durationMs;
    let costKnown = baseline.result.costUsd !== null;
    let totalCost = baseline.result.costUsd ?? 0;

    const evaluated: Array<{
      bundle: HarnessBundle;
      digest: string;
      result: RunResult;
    }> = [];
    const k = Math.max(0, Math.min(task.k, 5));
    const limitations: string[] = [];

    for (let index = 0; index < k; index += 1) {
      const proposalTask = buildStageTask(
        task,
        [
          'You are the fleet harness proposer.',
          'Produce only text guidance that would help an autonomous coding agent complete the task below.',
          'Do not include code fences, tool definitions, permissions, model selection, or file paths.',
          `Baseline verifier outcome: ${baselinePassed ? 'passed' : 'failed'}.`,
          baseline.result.criticalFailures.length > 0
            ? `Observed failures: ${baseline.result.criticalFailures.join(', ')}`
            : 'No verifier failures were reported.',
          '',
          `Task: ${task.prompt}`,
        ].join('\n'),
      );

      const proposalBinding: ExecutionBinding = {
        ...bindingForStage(baseBinding, proposalTask, resolved),
        stage: 'proposal',
        harnessDigest: canonicalDigest(task.baseline),
      };

      let proposalAttempt: Attempt;
      try {
        proposalAttempt = await this.ledger.reserve(
          proposalTask,
          resolved.account.id,
          config,
          proposalBinding,
        );
      } catch (err: unknown) {
        if (isCapacityError(err)) break;
        throw err;
      }
      attemptsCount += 1;

      const proposalOutcome = await this.executeModelStage(
        { ...context, task: proposalTask },
        task.baseline,
        proposalAttempt,
        config,
      );
      toolCalls += proposalOutcome.result.toolCalls;
      durationMs += proposalOutcome.result.durationMs;
      costKnown = costKnown && proposalOutcome.result.costUsd !== null;
      totalCost += proposalOutcome.result.costUsd ?? 0;
      await this.settle(proposalAttempt, proposalOutcome, proposalTask);
      assertVerifierOutcome(proposalOutcome);

      const candidateBundle = proposalOutcome.bundle;
      const candidateDigest = canonicalDigest(candidateBundle);

      const probeBinding: ExecutionBinding = {
        ...bindingForStage(baseBinding, task, resolved),
        stage: 'probe',
        harnessDigest: candidateDigest,
      };

      let probeAttempt: Attempt;
      try {
        probeAttempt = await this.ledger.reserve(
          task,
          resolved.account.id,
          config,
          probeBinding,
        );
      } catch (err: unknown) {
        if (isCapacityError(err)) break;
        throw err;
      }
      attemptsCount += 1;

      const probeOutcome = await this.executeStage(
        { ...context, task },
        candidateBundle,
        probeAttempt,
        config,
      );
      toolCalls += probeOutcome.result.toolCalls;
      durationMs += probeOutcome.result.durationMs;
      costKnown = costKnown && probeOutcome.result.costUsd !== null;
      totalCost += probeOutcome.result.costUsd ?? 0;
      await this.settle(probeAttempt, probeOutcome, task);
      assertVerifierOutcome(probeOutcome);

      evaluated.push({
        bundle: candidateBundle,
        digest: candidateDigest,
        result: probeOutcome.result,
      });
      if (probeOutcome.result.passed) {
        candidatePassed = true;
        bestBundle = candidateBundle;
        bestDigest = candidateDigest;
        break;
      }
    }

    if (evaluated.length > 0 && !candidatePassed) {
      const composeTask = buildStageTask(
        task,
        [
          'You are the fleet harness composer.',
          'Synthesize one unified text guidance bundle from the evaluated candidates below.',
          'Emit only the guidance text. No code fences, tools, permissions, or configuration.',
          ...evaluated.map(
            (entry, index) =>
              `Candidate ${index + 1} (passed=${entry.result.passed}): ${entry.bundle.guidance}`,
          ),
        ].join('\n'),
      );

      const composeBinding: ExecutionBinding = {
        ...bindingForStage(baseBinding, composeTask, resolved),
        stage: 'compose',
        harnessDigest: canonicalDigest(evaluated[0].bundle),
      };

      try {
        const composeAttempt = await this.ledger.reserve(
          composeTask,
          resolved.account.id,
          config,
          composeBinding,
        );
        attemptsCount += 1;
        const composeOutcome = await this.executeModelStage(
          { ...context, task: composeTask },
          evaluated[0].bundle,
          composeAttempt,
          config,
        );
        toolCalls += composeOutcome.result.toolCalls;
        durationMs += composeOutcome.result.durationMs;
        costKnown = costKnown && composeOutcome.result.costUsd !== null;
        totalCost += composeOutcome.result.costUsd ?? 0;
        await this.settle(composeAttempt, composeOutcome, composeTask);
        assertVerifierOutcome(composeOutcome);

        const composedDigest = canonicalDigest(composeOutcome.bundle);
        const composedBinding: ExecutionBinding = {
          ...bindingForStage(baseBinding, task, resolved),
          stage: 'probe',
          harnessDigest: composedDigest,
        };
        const composedAttempt = await this.ledger.reserve(
          task,
          resolved.account.id,
          config,
          composedBinding,
        );
        attemptsCount += 1;
        const composedOutcome = await this.executeStage(
          { ...context, task },
          composeOutcome.bundle,
          composedAttempt,
          config,
        );
        toolCalls += composedOutcome.result.toolCalls;
        durationMs += composedOutcome.result.durationMs;
        costKnown = costKnown && composedOutcome.result.costUsd !== null;
        totalCost += composedOutcome.result.costUsd ?? 0;
        await this.settle(composedAttempt, composedOutcome, task);
        assertVerifierOutcome(composedOutcome);

        if (composedOutcome.result.passed) {
          candidatePassed = true;
          bestBundle = composeOutcome.bundle;
          bestDigest = composedDigest;
        }
      } catch (err: unknown) {
        if (!isCapacityError(err)) throw err;
      }
    }

    let proposedReleaseDigest: string | undefined;
    if (candidatePassed) {
      proposedReleaseDigest = (await this.releaseService.propose(bestBundle))
        .digest;
    }

    const passed = candidatePassed || baselinePassed;
    return {
      runId,
      budgetId,
      passed,
      baselinePassed,
      candidatePassed,
      bestDigest,
      proposedReleaseDigest,
      attemptsCount,
      toolCalls,
      durationMs,
      costUsd: costKnown ? totalCost : null,
      outcome: candidatePassed
        ? 'candidate_proposed'
        : baselinePassed
          ? 'baseline_retained'
          : 'failed',
      reasonCodes: passed
        ? limitations
        : [...limitations, 'ALL_STAGES_FAILED_OR_REGRESSED'],
    };
  }

  // -------------------------------------------------------------------------
  // Evaluation plans
  // -------------------------------------------------------------------------

  private async executeEvaluationPlan(input: {
    id: string;
    contexts: TaskExecutionContext[];
    releaseDigest: string;
    config: FleetConfig;
    runId?: string;
    budgetId?: string;
    mode: 'preview' | 'execute';
  }): Promise<FleetEvaluationTasksResult> {
    const candidateBundle = await this.loadProposedBundle(input.releaseDigest);
    if (
      canonicalDigest(input.contexts[0].task.baseline) === input.releaseDigest
    ) {
      throw new HarnessError(
        'HELDOUT_IDENTICAL_BUNDLES',
        'Heldout candidate release is identical to the baseline bundle',
      );
    }
    for (const context of input.contexts) {
      if (!SOURCE_REVISION_PATTERN.test(context.task.sourceRef)) {
        throw new HarnessError(
          'SOURCE_REVISION_REQUIRED',
          'Heldout evaluation requires an immutable 40/64 character lowercase hex source revision',
        );
      }
    }
    const draft = this.buildPlanDraft(input);

    if (input.mode === 'preview') {
      return {
        mode: 'preview',
        draftDigest: draft.draftDigest,
        cases: draft.cases,
        draft: true,
      };
    }

    const intent = await this.getOrCreateEvaluationIntent(input, draft);
    const inputName = `${EVAL_INPUT_PREFIX}${intent.planDigest}`;
    const existingInputRaw = await this.store.read<unknown>(inputName, null);
    let resolvedEpoch: { runId: string; budgetId: string };

    if (existingInputRaw !== null) {
      this.assertEvaluationInputMatchesIntent(existingInputRaw, intent);
      resolvedEpoch = await this.resolveIntentEpoch(
        intent,
        input.config,
        false,
      );
    } else {
      resolvedEpoch = await this.resolveIntentEpoch(intent, input.config, true);
      const evaluationInput: EvaluationInputRecord = {
        schemaVersion: 1,
        planDigest: intent.planDigest,
        releaseDigest: intent.releaseDigest,
        tasks: this.parseIntentTasks(intent),
        runId: resolvedEpoch.runId,
        budgetId: resolvedEpoch.budgetId,
      };
      await this.store.createImmutable(inputName, evaluationInput);
    }

    const planName = `plan-${intent.planDigest}`;
    const existingPlan = await this.store.read<unknown>(planName, null);
    if (existingPlan === null) {
      await this.evidenceService.freezePlan(intent.plan);
    } else {
      const parsedExisting = FrozenEvaluationPlanSchema.safeParse(existingPlan);
      if (!parsedExisting.success) {
        throw new HarnessError(
          'FROZEN_PLAN_INVALID',
          'Stored frozen plan failed strict validation',
        );
      }
      if (canonicalJSON(parsedExisting.data) !== canonicalJSON(intent.plan)) {
        throw new HarnessError(
          'FROZEN_PLAN_CONFLICT',
          'A different immutable plan already exists for this plan digest',
        );
      }
    }

    const { attemptsSummary, evaluation } = await this.executePlanSides(
      intent.plan,
      intent.planDigest,
      input.contexts,
      candidateBundle,
      input.config,
      resolvedEpoch.runId,
      resolvedEpoch.budgetId,
    );

    return {
      mode: 'executed',
      planDigest: intent.planDigest,
      cases: planCaseSummaries(intent.plan),
      draft: false,
      evaluation,
      attemptsSummary,
    };
  }

  private async executePlanByDigest(
    planDigest: string,
    config: FleetConfig,
    runId: string | undefined,
    budgetId: string | undefined,
    previewOnly = false,
  ): Promise<{
    mode: 'preview' | 'executed';
    planDigest: string;
    plan: FrozenEvaluationPlan;
    runId?: string;
    budgetId?: string;
    evaluation?: EvaluationRecord;
    attemptsSummary?: FleetEvaluationAttemptSummary[];
  }> {
    const rawPlan = await this.store.read<unknown>(`plan-${planDigest}`, null);
    if (rawPlan === null) {
      throw new HarnessError(
        'HELDOUT_PLAN_NOT_FOUND',
        `No frozen evaluation plan exists for digest "${planDigest}"`,
      );
    }
    const parsedPlan = FrozenEvaluationPlanSchema.safeParse(rawPlan);
    if (!parsedPlan.success) {
      throw new HarnessError(
        'FROZEN_PLAN_INVALID',
        'Stored frozen plan failed strict validation',
      );
    }
    const plan = parsedPlan.data;

    const rawInput = await this.store.read<unknown>(
      `${EVAL_INPUT_PREFIX}${planDigest}`,
      null,
    );
    if (rawInput === null) {
      throw new HarnessError(
        'PLAN_INPUT_NOT_FOUND',
        `Persisted evaluation input for plan "${planDigest}" is missing; execution/resume is denied`,
      );
    }
    const parsedInput = parseEvaluationInput(rawInput);
    if (parsedInput.planDigest !== planDigest) {
      throw new HarnessError(
        'PLAN_INPUT_MISMATCH',
        'Persisted evaluation input does not match the plan',
      );
    }

    if (previewOnly) {
      return { mode: 'preview', planDigest, plan };
    }

    const localHostId = (await resolveAuthenticatedLocalHost(config)).hostId;
    const contexts: TaskExecutionContext[] = [];
    try {
      for (const task of parsedInput.tasks) {
        contexts.push(await this.prepareTaskContext(task, config, localHostId));
      }
      const candidateBundle = await this.loadProposedBundle(
        parsedInput.releaseDigest,
      );
      if (
        (runId !== undefined && runId !== parsedInput.runId) ||
        (budgetId !== undefined && budgetId !== parsedInput.budgetId)
      ) {
        throw new HarnessError(
          'PLAN_EPOCH_CONFLICT',
          'Requested campaign epoch differs from the frozen evaluation plan authority',
        );
      }
      const epoch = await this.ledger.getBudget(parsedInput.budgetId);
      if (!epoch || epoch.runId !== parsedInput.runId) {
        throw new HarnessError(
          'PLAN_EPOCH_MISSING',
          'Original campaign epoch for this frozen plan is missing; resume is denied',
        );
      }
      if (Date.now() >= epoch.deadline) {
        throw new HarnessError(
          'PLAN_EPOCH_EXPIRED',
          'Original campaign epoch has expired; resume is denied',
        );
      }
      const executed = await this.executePlanSides(
        plan,
        planDigest,
        contexts,
        candidateBundle,
        config,
        epoch.runId,
        epoch.id,
      );
      return {
        mode: 'executed',
        planDigest,
        plan,
        runId: epoch.runId,
        budgetId: epoch.id,
        evaluation: executed.evaluation,
        attemptsSummary: executed.attemptsSummary,
      };
    } finally {
      for (const context of contexts) {
        await this.releaseTaskContext(context);
      }
    }
  }

  private buildPlanDraft(input: {
    id: string;
    contexts: TaskExecutionContext[];
    releaseDigest: string;
    config: FleetConfig;
  }): EvaluationPlanDraft {
    const { contexts, config, releaseDigest } = input;
    if (contexts.length === 0 || contexts.length > MAX_EVALUATION_CASES) {
      throw new HarnessError(
        'INVALID_EVALUATION_INPUT',
        `Evaluation plans require between 1 and ${MAX_EVALUATION_CASES} tasks`,
      );
    }
    const baselineDigest = canonicalDigest(contexts[0].task.baseline);
    const seen = new Set<string>();
    const skeleton: EvaluationPlanCaseDraft[] = contexts.map((context) => {
      const taskDigest = canonicalDigest(context.task);
      if (seen.has(taskDigest)) {
        throw new HarnessError(
          'HELDOUT_DUPLICATE_TASK',
          `Duplicate evaluation task digest "${taskDigest}" in one plan`,
        );
      }
      seen.add(taskDigest);
      if (canonicalDigest(context.task.baseline) !== baselineDigest) {
        throw new HarnessError(
          'HELDOUT_BASELINE_DIGEST_MISMATCH',
          'Representative evaluation requires one common canonical baseline bundle across all tasks',
        );
      }
      return {
        taskDigest,
        hostId: context.task.project.hostId,
        projectId: context.task.project.projectId,
        logicalProjectId: resolveLogicalProjectId(context.task.project, config),
        accountId: context.resolved.account.id,
        sourceRevision: context.task.sourceRef,
        evaluatorDigest: canonicalDigest(context.task.verification),
        runtimeDigest: context.hostRuntime.manifestDigest,
      };
    });
    skeleton.sort((left, right) =>
      left.taskDigest.localeCompare(right.taskDigest),
    );

    const planPolicyDigest = policyDigest(config);
    const runtimeDigest = evaluationRuntimeDigest(config, skeleton);
    const minImprovement = config.evaluation.minImprovement;
    const maxRegressions = config.evaluation.maxRegressions;
    const draftDigest = canonicalDigest({
      schemaVersion: 1,
      id: input.id,
      releaseDigest,
      baselineDigest,
      policyDigest: planPolicyDigest,
      runtimeDigest,
      minImprovement,
      maxRegressions,
      taskDigests: skeleton.map((entry) => entry.taskDigest),
    });

    return {
      id: input.id,
      releaseDigest,
      baselineDigest,
      policyDigest: planPolicyDigest,
      runtimeDigest,
      minImprovement,
      maxRegressions,
      draftDigest,
      skeleton,
      cases: skeleton.map((entry) => ({
        caseId: undefined,
        taskDigest: entry.taskDigest,
        hostId: entry.hostId,
        projectId: entry.projectId,
        logicalProjectId: entry.logicalProjectId,
        baselineAttemptId: undefined,
        candidateAttemptId: undefined,
      })),
    };
  }

  private freezePlanFromDraft(draft: EvaluationPlanDraft): {
    plan: FrozenEvaluationPlan;
    planDigest: string;
  } {
    const cases = draft.skeleton.map((entry) => ({
      ...entry,
      id: crypto.randomUUID(),
      baselineAttemptId: crypto.randomUUID(),
      candidateAttemptId: crypto.randomUUID(),
    }));
    const attemptIds = new Set<string>();
    for (const entry of cases) {
      for (const attemptId of [
        entry.id,
        entry.baselineAttemptId,
        entry.candidateAttemptId,
      ]) {
        if (!UUID_PATTERN.test(attemptId) || attemptIds.has(attemptId)) {
          throw new HarnessError(
            'INVALID_ATTEMPT_ID',
            'Generated plan identifiers must be unique UUIDs',
          );
        }
        attemptIds.add(attemptId);
      }
    }
    const plan = FrozenEvaluationPlanSchema.parse({
      schemaVersion: 1,
      id: draft.id,
      releaseDigest: draft.releaseDigest,
      baselineDigest: draft.baselineDigest,
      policyDigest: draft.policyDigest,
      runtimeDigest: draft.runtimeDigest,
      requiredProjects: [
        ...new Set(cases.map((entry) => entry.logicalProjectId)),
      ].sort(),
      minImprovement: draft.minImprovement,
      maxRegressions: draft.maxRegressions,
      cases,
    });
    return { plan, planDigest: canonicalDigest(plan) };
  }

  private async getOrCreateEvaluationIntent(
    input: {
      id: string;
      contexts: TaskExecutionContext[];
      releaseDigest: string;
      config: FleetConfig;
      runId?: string;
      budgetId?: string;
    },
    draft: EvaluationPlanDraft,
  ): Promise<EvaluationPlanIntent> {
    const name = `${EVAL_INTENT_PREFIX}${draft.draftDigest}`;
    const existingRaw = await this.store.read<unknown>(name, null);
    if (existingRaw !== null) {
      const existing = this.parseEvaluationPlanIntent(existingRaw);
      this.assertEvaluationIntentMatchesDraft(existing, input, draft);
    }
    const requestedEpoch =
      existingRaw === null
        ? await this.resolveRequestedEpoch(input.runId, input.budgetId)
        : null;
    const createdAt = Date.now();
    const selected = await this.store.transaction<EvaluationPlanIntent | null>(
      name,
      null,
      (current) => {
        if (current !== null) {
          const existing = this.parseEvaluationPlanIntent(current);
          this.assertEvaluationIntentMatchesDraft(existing, input, draft);
          return existing;
        }

        const frozen = this.freezePlanFromDraft(draft);
        const epoch: EvaluationPlanIntent['epoch'] = requestedEpoch
          ? {
              kind: 'existing',
              runId: requestedEpoch.runId,
              budgetId: requestedEpoch.budgetId,
            }
          : {
              kind: 'new',
              request: {
                id: crypto.randomUUID(),
                runId: crypto.randomUUID(),
                createdAt,
                deadline: createdAt + input.config.limits.maxDurationMs,
                maxAttempts: input.config.limits.maxAttempts,
                maxConcurrent: input.config.limits.maxConcurrent,
                maxToolCalls: input.config.limits.maxToolCalls,
              },
            };
        return EVALUATION_PLAN_INTENT_SCHEMA.parse({
          schemaVersion: 1,
          draftDigest: draft.draftDigest,
          planDigest: frozen.planDigest,
          releaseDigest: draft.releaseDigest,
          tasks: this.sortedEvaluationTasks(input.contexts),
          plan: frozen.plan,
          epoch,
        });
      },
    );
    if (!selected) {
      throw new HarnessError(
        'EVALUATION_INTENT_MISSING',
        'Evaluation plan intent was not committed',
      );
    }
    const intent = this.parseEvaluationPlanIntent(selected);
    this.assertEvaluationIntentMatchesDraft(intent, input, draft);
    return intent;
  }

  private parseEvaluationPlanIntent(value: unknown): EvaluationPlanIntent {
    const parsed = EVALUATION_PLAN_INTENT_SCHEMA.safeParse(value);
    if (!parsed.success) {
      throw new HarnessError(
        'EVALUATION_INTENT_INVALID',
        'Persisted evaluation intent failed strict validation',
      );
    }
    for (const task of parsed.data.tasks) parseFleetTask(task);
    return parsed.data;
  }

  private parseIntentTasks(intent: EvaluationPlanIntent): FleetTask[] {
    const tasks = intent.tasks.map((task) => parseFleetTask(task));
    const sorted = [...tasks].sort((left, right) =>
      canonicalDigest(left).localeCompare(canonicalDigest(right)),
    );
    if (canonicalJSON(tasks) !== canonicalJSON(sorted)) {
      throw new HarnessError(
        'EVALUATION_INTENT_INVALID',
        'Persisted evaluation tasks are not canonically ordered',
      );
    }
    return sorted;
  }

  private sortedEvaluationTasks(contexts: TaskExecutionContext[]): FleetTask[] {
    return contexts
      .map((context) => context.task)
      .sort((left, right) =>
        canonicalDigest(left).localeCompare(canonicalDigest(right)),
      );
  }

  private assertEvaluationIntentMatchesDraft(
    intent: EvaluationPlanIntent,
    input: {
      contexts: TaskExecutionContext[];
      config: FleetConfig;
      runId?: string;
      budgetId?: string;
    },
    draft: EvaluationPlanDraft,
  ): void {
    const planCases: EvaluationPlanCaseDraft[] = intent.plan.cases.map(
      (entry) => ({
        taskDigest: entry.taskDigest,
        hostId: entry.hostId,
        projectId: entry.projectId,
        logicalProjectId: entry.logicalProjectId,
        accountId: entry.accountId,
        sourceRevision: entry.sourceRevision,
        evaluatorDigest: entry.evaluatorDigest,
        runtimeDigest: entry.runtimeDigest,
      }),
    );
    const intentRunId =
      intent.epoch.kind === 'existing'
        ? intent.epoch.runId
        : intent.epoch.request.runId;
    const intentBudgetId =
      intent.epoch.kind === 'existing'
        ? intent.epoch.budgetId
        : intent.epoch.request.id;
    const identifiers = intent.plan.cases.flatMap((entry) => [
      entry.id,
      entry.baselineAttemptId,
      entry.candidateAttemptId,
    ]);
    const expectedProjects = [
      ...new Set(draft.skeleton.map((entry) => entry.logicalProjectId)),
    ].sort();
    const newEpochAuthorityValid =
      intent.epoch.kind === 'existing' ||
      (intent.epoch.request.deadline ===
        intent.epoch.request.createdAt + input.config.limits.maxDurationMs &&
        intent.epoch.request.maxAttempts === input.config.limits.maxAttempts &&
        intent.epoch.request.maxConcurrent ===
          input.config.limits.maxConcurrent &&
        intent.epoch.request.maxToolCalls === input.config.limits.maxToolCalls);
    if (
      intent.draftDigest !== draft.draftDigest ||
      intent.releaseDigest !== draft.releaseDigest ||
      intent.planDigest !== canonicalDigest(intent.plan) ||
      intent.plan.id !== draft.id ||
      intent.plan.releaseDigest !== draft.releaseDigest ||
      intent.plan.baselineDigest !== draft.baselineDigest ||
      intent.plan.policyDigest !== draft.policyDigest ||
      intent.plan.runtimeDigest !== draft.runtimeDigest ||
      intent.plan.minImprovement !== draft.minImprovement ||
      intent.plan.maxRegressions !== draft.maxRegressions ||
      canonicalJSON(intent.plan.requiredProjects) !==
        canonicalJSON(expectedProjects) ||
      canonicalJSON(planCases) !== canonicalJSON(draft.skeleton) ||
      canonicalJSON(this.parseIntentTasks(intent)) !==
        canonicalJSON(this.sortedEvaluationTasks(input.contexts)) ||
      identifiers.some((identifier) => !UUID_PATTERN.test(identifier)) ||
      new Set(identifiers).size !== identifiers.length ||
      !newEpochAuthorityValid
    ) {
      throw new HarnessError(
        'EVALUATION_INTENT_CONFLICT',
        'Persisted evaluation intent does not match the requested frozen plan',
      );
    }
    if (
      (input.runId !== undefined && input.runId !== intentRunId) ||
      (input.budgetId !== undefined && input.budgetId !== intentBudgetId)
    ) {
      throw new HarnessError(
        'PLAN_EPOCH_CONFLICT',
        'Requested campaign epoch differs from the frozen evaluation intent',
      );
    }
  }

  private async resolveRequestedEpoch(
    runId: string | undefined,
    budgetId: string | undefined,
  ): Promise<{ runId: string; budgetId: string } | null> {
    if (runId === undefined && budgetId === undefined) return null;
    const requestedId = budgetId ?? runId;
    if (!requestedId) {
      throw new HarnessError(
        'PLAN_EPOCH_MISSING',
        'Requested campaign epoch identifier is missing',
      );
    }
    const epoch = await this.ledger.getBudget(requestedId);
    if (!epoch) {
      throw new HarnessError(
        'PLAN_EPOCH_MISSING',
        'Requested campaign epoch does not exist',
      );
    }
    if (
      (runId !== undefined && runId !== epoch.runId) ||
      (budgetId !== undefined && budgetId !== epoch.id)
    ) {
      throw new HarnessError(
        'PLAN_EPOCH_CONFLICT',
        'Requested run and budget identifiers do not match',
      );
    }
    if (Date.now() >= epoch.deadline) {
      throw new HarnessError(
        'PLAN_EPOCH_EXPIRED',
        'Requested campaign epoch has expired',
      );
    }
    return { runId: epoch.runId, budgetId: epoch.id };
  }

  private assertBudgetMatchesIntent(
    epoch: BudgetEpoch,
    request: BudgetEpochRequest,
    config: FleetConfig,
  ): void {
    const expectedLimits = {
      maxAttempts: config.limits.maxAttempts,
      maxConcurrent: config.limits.maxConcurrent,
      maxToolCalls: config.limits.maxToolCalls,
      maxDurationMs: config.limits.maxDurationMs,
      perHost: config.limits.perHost,
      perProject: config.limits.perProject,
      perAccount: config.limits.perAccount,
    };
    if (
      epoch.id !== request.id ||
      epoch.runId !== request.runId ||
      epoch.createdAt !== request.createdAt ||
      epoch.deadline !== request.deadline ||
      epoch.maxAttempts !== request.maxAttempts ||
      epoch.maxConcurrent !== request.maxConcurrent ||
      epoch.maxToolCalls !== request.maxToolCalls ||
      epoch.policyDigest !== policyDigest(config) ||
      epoch.policyGeneration !== config.generation ||
      canonicalJSON(epoch.frozenLimits) !== canonicalJSON(expectedLimits)
    ) {
      throw new HarnessError(
        'PLAN_EPOCH_CONFLICT',
        'Persisted campaign epoch does not match the immutable evaluation intent authority',
      );
    }
  }

  private async resolveIntentEpoch(
    intent: EvaluationPlanIntent,
    config: FleetConfig,
    allowCreate: boolean,
  ): Promise<{ runId: string; budgetId: string }> {
    if (intent.epoch.kind === 'existing') {
      const epoch = await this.ledger.getBudget(intent.epoch.budgetId);
      if (!epoch || epoch.runId !== intent.epoch.runId) {
        throw new HarnessError(
          'PLAN_EPOCH_MISSING',
          'Original campaign epoch is missing; resume is denied',
        );
      }
      if (Date.now() >= epoch.deadline) {
        throw new HarnessError(
          'PLAN_EPOCH_EXPIRED',
          'Original campaign epoch has expired; resume is denied',
        );
      }
      return { runId: epoch.runId, budgetId: epoch.id };
    }

    const request = intent.epoch.request;
    let epoch = await this.ledger.getBudget(request.id);
    if (!epoch) {
      if (!allowCreate) {
        throw new HarnessError(
          'PLAN_EPOCH_MISSING',
          'Original campaign epoch is missing; resume is denied',
        );
      }
      if (Date.now() >= request.deadline) {
        throw new HarnessError(
          'PLAN_EPOCH_EXPIRED',
          'Original campaign epoch request has expired',
        );
      }
      try {
        epoch = await this.ledger.createBudget(request, config);
      } catch (err: unknown) {
        if (
          !(err instanceof HarnessError) ||
          err.code !== 'BUDGET_ALREADY_EXISTS'
        )
          throw err;
        epoch = await this.ledger.getBudget(request.id);
        if (!epoch) throw err;
      }
    } else if (
      allowCreate &&
      (epoch.reservedAttempts !== 0 || epoch.reservedToolCalls !== 0)
    ) {
      throw new HarnessError(
        'PLAN_EPOCH_CONFLICT',
        'Campaign epoch has reservations but its immutable evaluation input is missing',
      );
    }
    if (Date.now() >= epoch.deadline) {
      throw new HarnessError(
        'PLAN_EPOCH_EXPIRED',
        'Original campaign epoch has expired; resume is denied',
      );
    }
    this.assertBudgetMatchesIntent(epoch, request, config);
    return { runId: epoch.runId, budgetId: epoch.id };
  }

  private assertEvaluationInputMatchesIntent(
    value: unknown,
    intent: EvaluationPlanIntent,
  ): void {
    const persisted = parseEvaluationInput(value);
    const runId =
      intent.epoch.kind === 'existing'
        ? intent.epoch.runId
        : intent.epoch.request.runId;
    const budgetId =
      intent.epoch.kind === 'existing'
        ? intent.epoch.budgetId
        : intent.epoch.request.id;
    if (
      persisted.planDigest !== intent.planDigest ||
      persisted.releaseDigest !== intent.releaseDigest ||
      persisted.runId !== runId ||
      persisted.budgetId !== budgetId ||
      canonicalJSON(persisted.tasks) !==
        canonicalJSON(this.parseIntentTasks(intent))
    ) {
      throw new HarnessError(
        'PLAN_INPUT_MISMATCH',
        'Persisted evaluation input does not match the immutable evaluation intent',
      );
    }
  }

  private async executePlanSides(
    plan: FrozenEvaluationPlan,
    planDigest: string,
    contexts: TaskExecutionContext[],
    candidateBundle: HarnessBundle,
    config: FleetConfig,
    runId: string,
    budgetId: string,
  ): Promise<{
    attemptsSummary: FleetEvaluationAttemptSummary[];
    evaluation: EvaluationRecord;
  }> {
    const byTaskDigest = new Map(
      contexts.map((context) => [canonicalDigest(context.task), context]),
    );
    const attemptsSummary: FleetEvaluationAttemptSummary[] = [];

    for (const entry of plan.cases) {
      const context = byTaskDigest.get(entry.taskDigest);
      if (!context) {
        throw new HarnessError(
          'HELDOUT_CASE_MISMATCH',
          `Frozen plan case "${entry.id}" has no matching provided task`,
        );
      }
      const sides: Array<['baseline' | 'candidate', string, HarnessBundle]> = [
        ['baseline', entry.baselineAttemptId, context.task.baseline],
        ['candidate', entry.candidateAttemptId, candidateBundle],
      ];
      const passed: Record<'baseline' | 'candidate', boolean> = {
        baseline: false,
        candidate: false,
      };
      let state: FleetEvaluationAttemptSummary['state'] = 'completed';

      for (const [role, attemptId, bundle] of sides) {
        const binding = buildHeldoutBinding({
          entry,
          role,
          context,
          planDigest,
          runId,
          budgetId,
          harnessDigest:
            role === 'baseline' ? plan.baselineDigest : plan.releaseDigest,
        });
        const existing = await this.ledger.getAttempt(attemptId);
        if (existing) {
          // Reuse only an attempt with the exact expected identity/binding for this plan.
          const consistent =
            existing.binding.taskDigest === binding.taskDigest &&
            existing.binding.planDigest === binding.planDigest &&
            existing.binding.harnessDigest === binding.harnessDigest &&
            existing.binding.runId === binding.runId &&
            existing.binding.budgetId === binding.budgetId &&
            existing.binding.hostId === binding.hostId &&
            existing.binding.projectId === binding.projectId &&
            existing.binding.sourceRevision === binding.sourceRevision &&
            existing.binding.evaluatorDigest === binding.evaluatorDigest &&
            existing.binding.runtimeDigest === binding.runtimeDigest &&
            existing.binding.policyDigest === binding.policyDigest;
          if (!consistent) {
            throw new HarnessError(
              'HELDOUT_PLAN_ATTEMPT_CONFLICT',
              `Planned attempt "${attemptId}" exists with a different plan/binding identity`,
            );
          }
          if (existing.state === 'completed' || existing.state === 'failed') {
            const repaired = await this.repairTerminalEvidence(existing);
            passed[role] = repaired.result?.passed === true;
            continue;
          }
          const recovered = await this.recoverLocalOutcome(existing);
          if (recovered) {
            passed[role] = recovered.result?.passed === true;
            state = state === 'blocked' ? 'blocked' : 'recovered';
            continue;
          }
          state = 'blocked';
          continue;
        }
        const attempt = await this.ledger.reserve(
          context.task,
          context.resolved.account.id,
          config,
          binding,
          attemptId,
        );
        const outcome = await this.executeStage(
          context,
          bundle,
          attempt,
          config,
          plan,
        );
        const settled = await this.settle(attempt, outcome, context.task);
        assertVerifierOutcome(outcome);
        if (settled.state !== 'completed' && settled.state !== 'failed') {
          state = 'unresolved';
        }
        passed[role] = settled.result?.passed === true;
      }

      attemptsSummary.push({
        logicalProjectId: entry.logicalProjectId,
        baselinePassed: passed.baseline,
        candidatePassed: passed.candidate,
        attemptIds: [entry.baselineAttemptId, entry.candidateAttemptId],
        state,
      });
    }

    const evaluation = await this.evidenceService.evaluate(planDigest, config);
    return { attemptsSummary, evaluation };
  }

  private async toRunSummary(
    result: {
      planDigest: string;
      cases: FleetEvaluationCaseSummary[];
      evaluation?: EvaluationRecord;
    },
    runId: string,
    budgetId: string,
  ): Promise<FleetRunSummary> {
    const evaluation = result.evaluation;
    const resources = await this.readHeldoutRunResources(
      result,
      runId,
      budgetId,
    );
    if (!evaluation) {
      return {
        runId,
        budgetId,
        passed: false,
        baselinePassed: false,
        candidatePassed: false,
        bestDigest: '',
        planDigest: result.planDigest,
        attemptsCount: 0,
        ...resources,
        outcome: 'denied',
        reasonCodes: ['EVALUATION_NOT_EXECUTED'],
      };
    }
    return {
      runId,
      budgetId,
      passed: evaluation.eligible,
      baselinePassed: evaluation.baselinePassed > 0,
      candidatePassed: evaluation.candidatePassed > 0,
      bestDigest: '',
      planDigest: result.planDigest,
      attemptsCount: result.cases.length * 2,
      ...resources,
      outcome: 'evaluation_complete',
      reasonCodes: evaluation.reasonCodes,
      evaluation,
    };
  }

  private async readHeldoutRunResources(
    result: { planDigest: string; cases: FleetEvaluationCaseSummary[] },
    runId: string,
    budgetId: string,
  ): Promise<{
    toolCalls: number | null;
    durationMs: number | null;
    costUsd: number | null;
  }> {
    const rawPlan = await this.store.read<unknown>(
      `plan-${result.planDigest}`,
      null,
    );
    const parsedPlan = FrozenEvaluationPlanSchema.safeParse(rawPlan);
    if (
      !parsedPlan.success ||
      canonicalDigest(parsedPlan.data) !== result.planDigest
    ) {
      throw new HarnessError(
        'FROZEN_PLAN_INVALID',
        'Stored run-summary plan is missing or mismatched',
      );
    }
    const plan = parsedPlan.data;
    const rawInput = await this.store.read<unknown>(
      `${EVAL_INPUT_PREFIX}${result.planDigest}`,
      null,
    );
    if (rawInput === null) {
      throw new HarnessError(
        'PLAN_INPUT_NOT_FOUND',
        'Stored run-summary input is missing',
      );
    }
    const input = parseEvaluationInput(rawInput);
    const epoch = await this.ledger.getBudget(budgetId);
    const inputTaskDigests = input.tasks
      .map((task) => canonicalDigest(task))
      .sort();
    const planTaskDigests = plan.cases.map((entry) => entry.taskDigest).sort();
    if (
      input.planDigest !== result.planDigest ||
      input.runId !== runId ||
      input.budgetId !== budgetId ||
      input.releaseDigest !== plan.releaseDigest ||
      !epoch ||
      epoch.id !== budgetId ||
      epoch.runId !== runId ||
      epoch.policyDigest !== plan.policyDigest ||
      canonicalJSON(planCaseSummaries(plan)) !== canonicalJSON(result.cases) ||
      canonicalJSON(inputTaskDigests) !== canonicalJSON(planTaskDigests)
    ) {
      throw new HarnessError(
        'PLAN_INPUT_MISMATCH',
        'Run-summary plan, input, or original epoch differs',
      );
    }
    return this.readPlanAttemptResources(
      plan,
      result.planDigest,
      runId,
      budgetId,
    );
  }

  private async readPlanAttemptResources(
    plan: FrozenEvaluationPlan,
    planDigest: string,
    runId: string,
    budgetId: string,
  ): Promise<{
    toolCalls: number | null;
    durationMs: number | null;
    costUsd: number | null;
  }> {
    let toolCalls = 0;
    let durationMs = 0;
    let costUsd = 0;
    let measurementComplete = true;
    let costComplete = true;

    for (const entry of plan.cases) {
      for (const role of ['baseline', 'candidate'] as const) {
        const attemptId =
          role === 'baseline'
            ? entry.baselineAttemptId
            : entry.candidateAttemptId;
        const attempt = await this.ledger.getAttempt(attemptId);
        if (!attempt) {
          measurementComplete = false;
          continue;
        }
        this.assertRunSummaryAttempt(
          attempt,
          entry,
          role,
          plan,
          planDigest,
          runId,
          budgetId,
        );
        const attemptResult = attempt.result;
        const terminal =
          (attempt.state === 'completed' &&
            attemptResult?.status === 'completed') ||
          (attempt.state === 'failed' && attemptResult?.status === 'failed');
        if (!attemptResult || !terminal) {
          measurementComplete = false;
          continue;
        }
        if (
          attemptResult.attemptId !== attempt.id ||
          attemptResult.generation !== attempt.generation ||
          canonicalJSON(attemptResult.binding) !==
            canonicalJSON(attempt.binding) ||
          attemptResult.harnessDigest !== attempt.binding.harnessDigest ||
          attemptResult.sourceRevision !== attempt.binding.sourceRevision ||
          attemptResult.evaluatorDigest !== attempt.binding.evaluatorDigest
        ) {
          throw new HarnessError(
            'RUN_SUMMARY_ATTEMPT_CONFLICT',
            'Persisted attempt result binding differs',
          );
        }
        const nextToolCalls = toolCalls + attemptResult.toolCalls;
        const nextDurationMs = durationMs + attemptResult.durationMs;
        if (
          !Number.isSafeInteger(nextToolCalls) ||
          !Number.isSafeInteger(nextDurationMs)
        ) {
          measurementComplete = false;
          continue;
        }
        toolCalls = nextToolCalls;
        durationMs = nextDurationMs;
        if (attemptResult.costUsd === null) {
          costComplete = false;
        } else {
          const nextCostUsd = costUsd + attemptResult.costUsd;
          if (!Number.isFinite(nextCostUsd)) costComplete = false;
          else costUsd = nextCostUsd;
        }
      }
    }

    if (!measurementComplete) {
      return { toolCalls: null, durationMs: null, costUsd: null };
    }
    return { toolCalls, durationMs, costUsd: costComplete ? costUsd : null };
  }

  private assertRunSummaryAttempt(
    attempt: Attempt,
    entry: FrozenEvaluationPlan['cases'][number],
    role: 'baseline' | 'candidate',
    plan: FrozenEvaluationPlan,
    planDigest: string,
    runId: string,
    budgetId: string,
  ): void {
    const binding = attempt.binding;
    const expectedHarnessDigest =
      role === 'baseline' ? plan.baselineDigest : plan.releaseDigest;
    const expectedAttemptId =
      role === 'baseline' ? entry.baselineAttemptId : entry.candidateAttemptId;
    if (
      attempt.id !== expectedAttemptId ||
      binding.planDigest !== planDigest ||
      binding.runId !== runId ||
      binding.budgetId !== budgetId ||
      binding.taskDigest !== entry.taskDigest ||
      binding.hostId !== entry.hostId ||
      binding.projectId !== entry.projectId ||
      binding.logicalProjectId !== entry.logicalProjectId ||
      binding.accountId !== entry.accountId ||
      binding.sourceRevision !== entry.sourceRevision ||
      binding.evaluatorDigest !== entry.evaluatorDigest ||
      binding.runtimeDigest !== entry.runtimeDigest ||
      binding.policyDigest !== plan.policyDigest ||
      binding.phase !== 'heldout' ||
      binding.stage !== 'evaluation' ||
      binding.harnessDigest !== expectedHarnessDigest ||
      attempt.hostId !== entry.hostId ||
      attempt.projectId !== entry.projectId ||
      attempt.accountId !== entry.accountId
    ) {
      throw new HarnessError(
        'RUN_SUMMARY_ATTEMPT_CONFLICT',
        'Attempt is not bound to the frozen run plan',
      );
    }
  }

  // -------------------------------------------------------------------------
  // Stage execution
  // -------------------------------------------------------------------------

  private async executeStage(
    context: TaskExecutionContext,
    bundle: HarnessBundle,
    attempt: Attempt,
    config: FleetConfig,
    plan?: FrozenEvaluationPlan,
  ): Promise<StageOutcome> {
    if (context.isRemote) {
      return this.dispatchRemoteStage(context, bundle, attempt, config, plan);
    }
    return this.executeEvaluationStage(context, bundle, attempt, config);
  }

  private async dispatchRemoteStage(
    context: TaskExecutionContext,
    bundle: HarnessBundle,
    attempt: Attempt,
    config: FleetConfig,
    plan?: FrozenEvaluationPlan,
  ): Promise<StageOutcome> {
    const host = config.hosts.find(
      (entry) => entry.serverId === attempt.hostId,
    );
    if (!host) {
      throw new HarnessError(
        'HOST_NOT_ENROLLED',
        `Host "${attempt.hostId}" is not configured`,
      );
    }
    const signer = await this.resolveCoordinatorSigner(config);
    const budget = await this.ledger.getBudget(attempt.binding.budgetId);
    if (!budget) {
      throw new HarnessError(
        'BUDGET_NOT_FOUND',
        `Budget epoch "${attempt.binding.budgetId}" is missing from the ledger`,
      );
    }
    if (isHeldoutBinding(attempt.binding) && !plan) {
      throw new HarnessError(
        'HELDOUT_PLAN_REQUIRED',
        'Heldout remote dispatch requires the frozen evaluation plan in the signed request',
      );
    }

    const payload: SignedExecutionRequest['payload'] = {
      purpose: 'ags-fleet-execute-v1',
      requestId: crypto.randomUUID(),
      attemptId: attempt.id,
      generation: attempt.generation,
      binding: attempt.binding,
      hostId: host.serverId,
      expiresAt: attempt.deadline,
      nonce: crypto.randomBytes(16).toString('hex'),
      task: context.task,
      bundle,
      budget,
      ...(plan ? { evaluationPlan: plan } : {}),
    };

    try {
      const stage = attempt.binding.stage;
      if (stage === 'proposal' || stage === 'compose') {
        await this.store.createImmutable(
          remoteInputBundleName(attempt),
          bundle,
        );
      }
      await this.store.createImmutable(
        `remote-task-${attempt.id}`,
        context.task,
      );
      const signed = signExecutionRequest(
        signer.id,
        payload,
        signer.privateKey,
      );
      const beforeDispatch = await this.ledger.getAttempt(attempt.id);
      if (!beforeDispatch || beforeDispatch.token !== attempt.token) {
        throw new HarnessError(
          'ATTEMPT_BINDING_CONFLICT',
          'Remote attempt changed before dispatch',
        );
      }
      if (
        beforeDispatch.state === 'admitted' ||
        beforeDispatch.state === 'running'
      ) {
        await this.ledger.markUnknown(attempt.id, attempt.token);
      } else {
        throw new HarnessError(
          'REMOTE_STAGE_UNKNOWN',
          `Remote attempt "${attempt.id}" is already "${beforeDispatch.state}" and cannot be dispatched again`,
        );
      }
      const receipt = await this.dispatcher.dispatch(host, signed);
      await this.evidenceVerifier.recordVerifiedReceipt(receipt);

      if (receipt.payload.result && receipt.payload.status === 'completed') {
        const stage = attempt.binding.stage;
        const returnedBundle =
          stage === 'proposal' || stage === 'compose'
            ? requireRemoteOutputBundle(receipt, bundle)
            : bundle;
        return { result: receipt.payload.result, bundle: returnedBundle };
      }
      if (receipt.payload.result && receipt.payload.status === 'failed') {
        const termination: TerminationEvidence = {
          attemptId: attempt.id,
          generation: attempt.generation,
          confirmed: receipt.payload.terminationConfirmed === true,
          observedAt: receipt.payload.observedAt,
          containerIds: receipt.payload.containerIds,
          workerBootId: receipt.payload.workerBootId,
        };
        return { result: receipt.payload.result, termination, bundle };
      }
      throw new HarnessError(
        'REMOTE_STAGE_UNKNOWN',
        `Remote worker did not return a verified terminal result for attempt "${attempt.id}" (status "${receipt.payload.status}")`,
      );
    } catch (err: unknown) {
      const fresh = await this.ledger.getAttempt(attempt.id);
      if (fresh && (fresh.state === 'admitted' || fresh.state === 'running')) {
        await this.ledger
          .markUnknown(attempt.id, attempt.token)
          .catch(() => undefined);
      }
      throw err;
    }
  }

  private async executeEvaluationStage(
    context: TaskExecutionContext,
    bundle: HarnessBundle,
    attempt: Attempt,
    config: FleetConfig,
  ): Promise<StageOutcome> {
    const runner = this.requireRunnerFor(config, attempt.hostId);
    const omp = this.requireOmpFor(config, attempt.hostId);
    const { task } = context;

    const startedAt = Date.now();
    const base = stageWorkspaceRoots(this.store.stateDir, attempt);
    await fs.ensureDir(base.deliverable);
    await fs.ensureDir(base.evaluation);

    const taskContext = attemptContext(this.store.stateDir, attempt, 'task');
    const evalContext = attemptContext(
      this.store.stateDir,
      attempt,
      'evaluator',
    );
    const bootId = await getWorkerBootId(this.store.stateDir);
    let safeToClean = false;
    let measuredToolCalls = 0;
    let measuredCost: number | null = null;
    let measuredUsageReported = false;

    try {
      await this.ledger.start(attempt.id, attempt.token, process.pid);
      const seedRoot = await this.resolveSeedSnapshot(
        context,
        attempt,
        base,
        runner,
      );
      await fs.copy(seedRoot, base.deliverable);

      const ompResult = await omp.run(
        task,
        bundle,
        attempt,
        context.resolved.account,
        base.deliverable,
        {
          maxToolCalls: Math.min(
            attempt.reservedToolCalls,
            task.toolCallAllowance,
          ),
          context: taskContext,
        },
      );
      assertOmpResultIdentity(ompResult, attempt, 'task');
      measuredToolCalls = ompResult.toolCalls;
      measuredCost = ompResult.costUsd;
      measuredUsageReported = true;

      // Freeze the writer set before any trusted export.
      const taskProof = await this.requireRoleStopProof(
        config,
        attempt,
        'task',
        bootId,
        true,
      );

      await runner.prepareEvaluation(
        seedRoot,
        base.deliverable,
        task.verification,
        base.evaluation,
        taskProof,
      );

      const execution = await runner.execute(
        path.join(base.evaluation, EVALUATION_WORKSPACE_DIRNAME),
        task.verification.argv,
        { deadline: attempt.deadline, context: evalContext },
      );

      const evalProof = await this.requireRoleStopProof(
        config,
        attempt,
        'evaluator',
        bootId,
        false,
      );

      const artifacts = await this.persistArtifacts(attempt, base.evaluation);
      const artifactDigest = canonicalDigest({
        artifacts,
        exitCode: execution.exitCode,
        stdoutSha256: sha256Text(execution.stdout),
        stderrSha256: sha256Text(execution.stderr),
      });
      const projectAuthority = await resolveProjectAuthority(
        { ...task.project, rootPath: context.sourceRootPath },
        config,
      );
      const passed = execution.exitCode === 0;

      const result: RunResult = {
        attemptId: attempt.id,
        status: 'completed',
        harnessDigest: attempt.binding.harnessDigest,
        sourceRevision: attempt.binding.sourceRevision,
        evaluatorDigest: attempt.binding.evaluatorDigest,
        passed,
        criticalFailures: passed
          ? []
          : [`VERIFICATION_FAILED:${execution.exitCode}`],
        toolCalls: measuredToolCalls,
        durationMs: Date.now() - startedAt,
        costUsd: measuredCost,
        artifactDigest,
        binding: attempt.binding,
        generation: attempt.generation,
        projectAuthority,
      };

      await this.writeStageReceipt({
        attempt,
        proofs: [taskProof, evalProof],
        result,
        projectAuthority,
        artifacts,
        bootId,
        startedAt,
      });
      const termination = aggregateProofTermination(attempt, bootId, [
        taskProof,
        evalProof,
      ]);
      await this.persistStageOutcome({
        attempt,
        task,
        result,
        termination,
        projectAuthority,
      });

      safeToClean = true;
      return {
        result,
        termination,
        bundle,
      };
    } catch (err: unknown) {
      const fresh = await this.ledger.getAttempt(attempt.id);
      if (!fresh || (fresh.state !== 'running' && fresh.state !== 'unknown')) {
        if (fresh && fresh.state !== 'unknown') {
          await this.ledger
            .markUnknown(attempt.id, attempt.token)
            .catch(() => undefined);
        }
        throw err instanceof HarnessError
          ? err
          : new HarnessError('STAGE_EXECUTION_FAILED', String(err));
      }
      let termination: TerminationEvidence | null;
      try {
        termination = await this.terminateAllRoles(attempt);
      } catch {
        termination = null;
      }
      if (!termination) {
        await this.ledger
          .markUnknown(attempt.id, attempt.token)
          .catch(() => undefined);
        throw err instanceof HarnessError
          ? err
          : new HarnessError('STAGE_EXECUTION_FAILED', String(err));
      }
      const fatal =
        err instanceof HarnessError
          ? err
          : new HarnessError('STAGE_EXECUTION_FAILED', String(err));
      const errorUsage =
        err instanceof OmpExecutionError
          ? await this.persistOmpUsage(
              attempt,
              err.usage,
              Math.min(attempt.reservedToolCalls, task.toolCallAllowance),
            )
          : null;
      let usageProofValid = false;
      if (errorUsage) {
        try {
          usageProofValid = await this.verifyOmpUsageStopProof(
            attempt,
            errorUsage,
          );
        } catch {
          usageProofValid = false;
        }
      }
      if (errorUsage?.complete && usageProofValid) {
        measuredToolCalls = errorUsage.toolCalls;
        measuredCost = errorUsage.costUsd;
        measuredUsageReported = true;
      }
      if (!measuredUsageReported) {
        await this.ledger.markUnknown(attempt.id, attempt.token);
        throw fatal;
      }
      const errorCode = reasonCodeOf(err, 'STAGE_EXECUTION_FAILED');
      const result: RunResult = {
        attemptId: attempt.id,
        status: 'failed',
        harnessDigest: attempt.binding.harnessDigest,
        sourceRevision: attempt.binding.sourceRevision,
        evaluatorDigest: attempt.binding.evaluatorDigest,
        passed: false,
        criticalFailures: [errorCode],
        toolCalls: measuredToolCalls,
        durationMs: Date.now() - startedAt,
        costUsd: measuredCost,
        artifactDigest: canonicalDigest({ error: errorCode }),
        errorCode,
        binding: attempt.binding,
        generation: attempt.generation,
      };
      const projectAuthority = await resolveProjectAuthority(
        { ...task.project, rootPath: context.sourceRootPath },
        config,
      );
      await this.persistStageOutcome({
        attempt,
        task,
        result,
        termination,
        projectAuthority,
      });
      return { result, termination, bundle, fatal };
    } finally {
      if (safeToClean) {
        await this.cleanupStageWorkspaces(base);
      }
    }
  }

  private async executeModelStage(
    context: TaskExecutionContext,
    inputBundle: HarnessBundle,
    attempt: Attempt,
    config: FleetConfig,
  ): Promise<StageOutcome> {
    if (context.isRemote) {
      return this.dispatchRemoteStage(context, inputBundle, attempt, config);
    }
    const runner = this.requireRunnerFor(config, attempt.hostId);
    const omp = this.requireOmpFor(config, attempt.hostId);
    const { task } = context;

    const startedAt = Date.now();
    const base = stageWorkspaceRoots(this.store.stateDir, attempt);
    await fs.ensureDir(base.deliverable);
    const taskContext = attemptContext(this.store.stateDir, attempt, 'task');
    const bootId = await getWorkerBootId(this.store.stateDir);
    await this.store.createImmutable(
      stageInputBundleName(attempt),
      inputBundle,
    );
    let safeToClean = false;

    try {
      await this.ledger.start(attempt.id, attempt.token, process.pid);
      const seedRoot = await this.resolveSeedSnapshot(
        context,
        attempt,
        base,
        runner,
      );
      await fs.copy(seedRoot, base.deliverable);

      const ompResult = await omp.run(
        task,
        inputBundle,
        attempt,
        context.resolved.account,
        base.deliverable,
        {
          maxToolCalls: Math.min(
            attempt.reservedToolCalls,
            task.toolCallAllowance,
          ),
          context: taskContext,
        },
      );
      assertOmpResultIdentity(ompResult, attempt, 'task');

      const taskProof = await this.requireRoleStopProof(
        config,
        attempt,
        'task',
        bootId,
        true,
      );

      const guidance = ompResult.text.trim();
      if (guidance.length === 0) {
        throw new HarnessError(
          'STAGE_EMPTY_OUTPUT',
          'Restricted model stage produced no guidance text',
        );
      }

      // Text-only candidate: scope/platforms/OMP compatibility are copied from the admitted
      // input bundle and can never be model-selected.
      const produced = HarnessBundleSchema.parse({
        schemaVersion: 1,
        id: crypto.randomUUID(),
        scope: inputBundle.scope,
        guidance,
        platforms: [...inputBundle.platforms],
        ompVersions: [...inputBundle.ompVersions],
      });
      assertCandidateMetadataUnchanged(inputBundle, produced);

      const artifactRoot = artifactRootFor(this.store.stateDir, attempt);
      await fs.ensureDir(artifactRoot);
      const serialized = canonicalJSON(produced);
      await fs.writeFile(path.join(artifactRoot, 'bundle.json'), serialized, {
        mode: 0o600,
        flag: 'wx',
      });
      const artifacts: StageArtifactEntry[] = [
        {
          path: 'bundle.json',
          sha256: sha256Text(serialized),
          size: Buffer.byteLength(serialized, 'utf8'),
        },
      ];
      const projectAuthority = await resolveProjectAuthority(
        { ...task.project, rootPath: context.sourceRootPath },
        config,
      );

      const result: RunResult = {
        attemptId: attempt.id,
        status: 'completed',
        harnessDigest: attempt.binding.harnessDigest,
        sourceRevision: attempt.binding.sourceRevision,
        evaluatorDigest: attempt.binding.evaluatorDigest,
        passed: false,
        criticalFailures: [],
        toolCalls: ompResult.toolCalls,
        durationMs: Date.now() - startedAt,
        costUsd: ompResult.costUsd,
        artifactDigest: canonicalDigest({ artifacts, scope: 'bundle' }),
        binding: attempt.binding,
        generation: attempt.generation,
        projectAuthority,
      };

      await this.writeStageReceipt({
        attempt,
        proofs: [taskProof],
        result,
        projectAuthority,
        artifacts,
        bootId,
        startedAt,
      });
      const termination = aggregateProofTermination(attempt, bootId, [
        taskProof,
      ]);
      await this.persistStageOutcome({
        attempt,
        task,
        result,
        termination,
        projectAuthority,
      });

      safeToClean = true;
      return {
        result,
        termination,
        bundle: produced,
      };
    } catch (err: unknown) {
      const fatal =
        err instanceof HarnessError
          ? err
          : new HarnessError('MODEL_STAGE_FAILED', String(err));
      const usage =
        err instanceof OmpExecutionError
          ? await this.persistOmpUsage(
              attempt,
              err.usage,
              Math.min(attempt.reservedToolCalls, task.toolCallAllowance),
            )
          : null;
      let termination: TerminationEvidence;
      try {
        termination = await this.terminateAllRoles(attempt);
      } catch {
        await this.ledger
          .markUnknown(attempt.id, attempt.token)
          .catch(() => undefined);
        throw fatal;
      }
      if (!termination.confirmed) {
        await this.ledger
          .markUnknown(attempt.id, attempt.token)
          .catch(() => undefined);
        throw fatal;
      }
      let usageProofValid = false;
      if (usage) {
        try {
          usageProofValid = await this.verifyOmpUsageStopProof(attempt, usage);
        } catch {
          usageProofValid = false;
        }
      }
      if (!usage?.complete || !usageProofValid) {
        await this.ledger
          .markUnknown(attempt.id, attempt.token)
          .catch(() => undefined);
        throw fatal;
      }
      const errorCode = reasonCodeOf(err, 'MODEL_STAGE_FAILED');
      const result: RunResult = {
        attemptId: attempt.id,
        status: 'failed',
        harnessDigest: attempt.binding.harnessDigest,
        sourceRevision: attempt.binding.sourceRevision,
        evaluatorDigest: attempt.binding.evaluatorDigest,
        passed: false,
        criticalFailures: [errorCode],
        toolCalls: usage.toolCalls,
        durationMs: Date.now() - startedAt,
        costUsd: usage.costUsd,
        artifactDigest: canonicalDigest({ error: errorCode }),
        errorCode,
        binding: attempt.binding,
        generation: attempt.generation,
      };
      const projectAuthority = await resolveProjectAuthority(
        { ...task.project, rootPath: context.sourceRootPath },
        config,
      );
      await this.persistStageOutcome({
        attempt,
        task,
        result,
        termination,
        projectAuthority,
      });
      safeToClean = true;
      return { result, termination, bundle: inputBundle, fatal };
    } finally {
      if (safeToClean) {
        await this.cleanupStageWorkspaces(base);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Authoritative stop proofs and receipts
  // -------------------------------------------------------------------------

  private async requireRoleStopProof(
    config: FleetConfig,
    attempt: Attempt,
    role: ExecutionContext['role'],
    bootId: string,
    requireModelWorker: boolean,
  ): Promise<RoleStopProof> {
    const runner = this.requireRunnerFor(config, attempt.hostId);
    const omp = this.requireOmpFor(config, attempt.hostId);
    const context = attemptContext(this.store.stateDir, attempt, role);
    const proof = await runner.stopRole(context);

    assertProofContext(proof, context);
    if (!proof.wholeGroupStopped) {
      throw new HarnessError(
        'STOP_PROOF_INCOMPLETE',
        `Role "${role}" stop proof did not confirm whole-group writer absence`,
      );
    }
    if (!proof.termination.confirmed) {
      throw new HarnessError(
        'STOP_PROOF_UNCONFIRMED',
        `Role "${role}" stop proof termination is unconfirmed`,
      );
    }
    if (
      proof.runtimeState.attemptId !== attempt.id ||
      proof.runtimeState.generation !== attempt.generation
    ) {
      throw new HarnessError(
        'STOP_PROOF_MISMATCH',
        'Stop proof runtime state identity mismatch',
      );
    }
    if (proof.runtimeState.role !== role) {
      throw new HarnessError(
        'STOP_PROOF_MISMATCH',
        'Stop proof runtime state role mismatch',
      );
    }
    if (proof.runtimeState.runtimeDigest !== attempt.binding.runtimeDigest) {
      throw new HarnessError(
        'STOP_PROOF_MISMATCH',
        'Stop proof runtime digest mismatch',
      );
    }
    if (proof.runtimeState.termination.confirmed !== true) {
      throw new HarnessError(
        'STOP_PROOF_UNCONFIRMED',
        'Stop proof runtime state is unconfirmed',
      );
    }
    if (proof.termination.workerBootId !== bootId) {
      throw new HarnessError(
        'STOP_PROOF_BOOT_MISMATCH',
        'Stop proof boot identity mismatch',
      );
    }

    const durableTermination = await readTerminationReceiptFile(context);
    if (
      !durableTermination ||
      canonicalDigest(durableTermination) !== canonicalDigest(proof.termination)
    ) {
      throw new HarnessError(
        'STOP_PROOF_NOT_DURABLE',
        `Durable termination receipt for role "${role}" is missing or does not match the proof`,
      );
    }
    const durableRuntimeState = await readRuntimeStateReceipt(context);
    if (
      !durableRuntimeState ||
      canonicalDigest(durableRuntimeState) !==
        canonicalDigest(proof.runtimeState)
    ) {
      throw new HarnessError(
        'STOP_PROOF_NOT_DURABLE',
        `Durable runtime-state receipt for role "${role}" is missing or does not match the proof`,
      );
    }

    if (role === 'task') {
      if (requireModelWorker) {
        if (!proof.modelWorker) {
          throw new HarnessError(
            'MODEL_WORKER_PROOF_REQUIRED',
            'Task-role stop proof lacks the owned model-worker completion/termination proof',
          );
        }
        assertModelWorkerProof(proof.modelWorker, attempt, bootId);
        const durableWorker = await readModelWorkerProof(
          this.store.stateDir,
          attempt,
          bootId,
        );
        if (!durableWorker) {
          throw new HarnessError(
            'MODEL_WORKER_PROOF_NOT_DURABLE',
            'Durable model-worker completion/termination receipt is missing',
          );
        }
        if (durableWorker.kind === 'completion') {
          if (durableWorker.exitCode !== 0) {
            throw new HarnessError(
              'MODEL_WORKER_FAILED',
              `Owned model worker exited with code ${String(durableWorker.exitCode)}`,
            );
          }
          if (
            proof.modelWorker.kind === 'completion' &&
            proof.modelWorker.exitCode !== durableWorker.exitCode
          ) {
            throw new HarnessError(
              'MODEL_WORKER_PROOF_MISMATCH',
              'Completion proof exit code does not match the durable completion receipt',
            );
          }
        } else if (!durableWorker.confirmed) {
          throw new HarnessError(
            'MODEL_WORKER_TERMINATION_UNCONFIRMED',
            'Owned model-worker termination could not be authoritatively confirmed',
          );
        }
      } else {
        const workerState = await omp.inspectWorkerRole(context);
        if (
          workerState.state === 'running' ||
          workerState.state === 'unknown'
        ) {
          throw new HarnessError(
            'MODEL_WORKER_NOT_STOPPED',
            `Owned model worker is "${workerState.state}" and its absence cannot be proven`,
          );
        }
      }
    } else if (proof.modelWorker) {
      throw new HarnessError(
        'STOP_PROOF_MISMATCH',
        'Evaluator role must not carry a model-worker proof',
      );
    }

    return proof;
  }

  private async terminateAllRoles(
    attempt: Attempt,
  ): Promise<TerminationEvidence> {
    const config = await this.policyService.load();
    const runner = this.requireRunnerFor(config, attempt.hostId);
    const omp = this.requireOmpFor(config, attempt.hostId);
    const bootId = await getWorkerBootId(this.store.stateDir);

    const taskContext = attemptContext(this.store.stateDir, attempt, 'task');
    const workerTermination = await omp.terminateWorker(taskContext);
    if (workerTermination && !workerTermination.confirmed) {
      throw new HarnessError(
        'MODEL_WORKER_TERMINATION_UNCONFIRMED',
        'Owned model-worker termination could not be confirmed; reservation stays held',
      );
    }
    if (workerTermination) {
      if (
        workerTermination.attemptId !== attempt.id ||
        workerTermination.generation !== attempt.generation ||
        workerTermination.runtimeDigest !== attempt.binding.runtimeDigest ||
        workerTermination.workerBootId !== bootId
      ) {
        throw new HarnessError(
          'MODEL_WORKER_TERMINATION_MISMATCH',
          'Owned model-worker termination receipt identity does not match the attempt',
        );
      }
    }

    const containerIds = new Set<string>();
    let observedAt = 0;

    for (const role of ['task', 'evaluator'] as const) {
      const context = attemptContext(this.store.stateDir, attempt, role);
      const evidence = await runner.terminate(context);
      if (!evidence.confirmed) {
        throw new HarnessError(
          'TERMINATION_UNCONFIRMED',
          `Aggregate termination could not be confirmed for role "${role}" (${evidence.errorCode ?? 'UNKNOWN'})`,
        );
      }
      if (
        evidence.attemptId !== attempt.id ||
        evidence.generation !== attempt.generation
      ) {
        throw new HarnessError(
          'TERMINATION_MISMATCH',
          'Termination evidence identity mismatch',
        );
      }
      if (evidence.workerBootId !== bootId) {
        throw new HarnessError(
          'TERMINATION_BOOT_MISMATCH',
          'Termination evidence boot identity mismatch',
        );
      }
      const runtimeState = await readRuntimeStateReceipt(context);
      if (!runtimeState) {
        throw new HarnessError(
          'TERMINATION_NOT_DURABLE',
          `Missing runtime-state receipt for role "${role}"`,
        );
      }
      if (runtimeState.runtimeDigest !== attempt.binding.runtimeDigest) {
        throw new HarnessError(
          'TERMINATION_MISMATCH',
          'Runtime-state digest mismatch',
        );
      }
      for (const containerId of evidence.containerIds) {
        containerIds.add(containerId);
      }
      observedAt = Math.max(observedAt, evidence.observedAt);
    }

    return {
      attemptId: attempt.id,
      generation: attempt.generation,
      confirmed: true,
      observedAt: observedAt > 0 ? observedAt : Date.now(),
      containerIds: [...containerIds],
      workerBootId: bootId,
    };
  }

  private async inspectAllRoles(
    attempt: Attempt,
  ): Promise<TerminationEvidence> {
    const config = await this.policyService.load();
    const runner = this.requireRunnerFor(config, attempt.hostId);
    const omp = this.requireOmpFor(config, attempt.hostId);
    const bootId = await getWorkerBootId(this.store.stateDir);

    const workerState = await omp.inspectWorkerRole(
      attemptContext(this.store.stateDir, attempt, 'task'),
    );
    const containerIds = new Set<string>();
    let observedAt = 0;
    let confirmed = workerState.state === 'absent';
    let errorCode: string | undefined = confirmed
      ? undefined
      : `MODEL_WORKER_${workerState.state.toUpperCase()}`;

    for (const role of ['task', 'evaluator'] as const) {
      const evidence = await runner.inspect(
        attemptContext(this.store.stateDir, attempt, role),
      );
      if (!evidence.confirmed) {
        confirmed = false;
        errorCode =
          errorCode ?? evidence.errorCode ?? 'CONTAINER_ABSENCE_UNPROVEN';
      }
      if (evidence.workerBootId !== bootId) {
        confirmed = false;
        errorCode = errorCode ?? 'BOOT_IDENTITY_MISMATCH';
      }
      for (const containerId of evidence.containerIds) {
        containerIds.add(containerId);
      }
      observedAt = Math.max(observedAt, evidence.observedAt);
    }

    return {
      attemptId: attempt.id,
      generation: attempt.generation,
      confirmed,
      observedAt: observedAt > 0 ? observedAt : Date.now(),
      containerIds: [...containerIds],
      workerBootId: bootId,
      ...(errorCode ? { errorCode } : {}),
    };
  }

  private async writeStageReceipt(input: {
    attempt: Attempt;
    proofs: RoleStopProof[];
    result: RunResult;
    projectAuthority: ProjectAuthority;
    artifacts: StageArtifactEntry[];
    bootId: string;
    startedAt: number;
  }): Promise<void> {
    const roleEvidence: StageRoleEvidence[] = [];
    for (const proof of input.proofs) {
      const context = attemptContext(
        this.store.stateDir,
        input.attempt,
        proof.context.role,
      );
      const termination = await readTerminationReceiptFile(context);
      const runtimeState = await readRuntimeStateReceipt(context);
      if (!termination || !runtimeState) {
        throw new HarnessError(
          'STOP_PROOF_NOT_DURABLE',
          `Missing durable receipts for role "${proof.context.role}" while writing the stage receipt`,
        );
      }
      let modelWorker: StageModelWorkerProofRecord | undefined;
      if (proof.context.role === 'task') {
        const durableWorker = await readModelWorkerProof(
          this.store.stateDir,
          input.attempt,
          input.bootId,
        );
        if (!durableWorker) {
          throw new HarnessError(
            'MODEL_WORKER_PROOF_NOT_DURABLE',
            'Durable model-worker outcome is missing while writing the stage receipt',
          );
        }
        modelWorker = {
          kind: durableWorker.kind,
          digest: durableWorker.digest,
          exitCode: durableWorker.exitCode,
        };
      }
      roleEvidence.push({
        role: proof.context.role,
        containerIds: [...termination.containerIds],
        confirmed: true,
        observedAt: termination.observedAt,
        workerBootId: termination.workerBootId,
        terminationReceiptDigest: canonicalDigest(termination),
        runtimeStateDigest: canonicalDigest(runtimeState),
        ...(modelWorker ? { modelWorker } : {}),
      });
    }

    const receipt: StageReceipt = {
      schemaVersion: 1,
      attemptId: input.attempt.id,
      generation: input.attempt.generation,
      bindingDigest: canonicalDigest(input.attempt.binding),
      taskDigest: input.attempt.binding.taskDigest,
      bundleDigest: input.attempt.binding.harnessDigest,
      evaluatorDigest: input.attempt.binding.evaluatorDigest,
      runtimeDigest: input.attempt.binding.runtimeDigest,
      projectAuthority: {
        canonicalRootPath: input.projectAuthority.canonicalRootPath,
        stackIds: [...input.projectAuthority.stackIds],
      },
      resultDigest: canonicalDigest(input.result),
      artifactDigest: input.result.artifactDigest,
      roles: input.proofs.map((proof) => proof.context.role),
      roleEvidence,
      artifacts: input.artifacts,
      workerBootId: input.bootId,
      startedAt: input.startedAt,
      completedAt: Date.now(),
    };

    await this.store.createImmutable(stageReceiptName(input.attempt), receipt);
  }

  private async persistOmpUsage(
    attempt: Attempt,
    usage: OmpExecutionError['usage'],
    maxToolCalls: number,
  ): Promise<NonNullable<OmpExecutionError['usage']> | null> {
    if (!usage) return null;
    const parsed = OmpUsageSnapshotSchema.safeParse(usage);
    if (!parsed.success) return null;
    const snapshot = parsed.data;
    if (
      snapshot.attemptId !== attempt.id ||
      snapshot.generation !== attempt.generation ||
      snapshot.role !== 'task' ||
      snapshot.runtimeDigest !== attempt.binding.runtimeDigest ||
      snapshot.toolCalls > maxToolCalls ||
      snapshot.observedAt > Date.now()
    ) {
      return null;
    }
    const context = attemptContext(this.store.stateDir, attempt, 'task');
    const completion = await readWorkerCompletion(context);
    const termination = await readWorkerTermination(context);
    if (
      completion?.pid !== snapshot.workerPid &&
      termination?.pid !== snapshot.workerPid
    ) {
      return null;
    }
    const digest = canonicalDigest(snapshot);
    await this.store.createImmutable(
      `usage-${attempt.id}-${attempt.generation}-${digest}`,
      snapshot,
    );
    return snapshot;
  }
  private async verifyOmpUsageStopProof(
    attempt: Attempt,
    usage: NonNullable<OmpExecutionError['usage']>,
  ): Promise<boolean> {
    const context = attemptContext(this.store.stateDir, attempt, 'task');
    const config = await this.policyService.load();
    const runner = this.requireRunnerFor(config, attempt.hostId);
    const omp = this.requireOmpFor(config, attempt.hostId);
    const proof = await runner.stopRole(context);
    const bootId = await getWorkerBootId(this.store.stateDir);
    if (
      !proof.wholeGroupStopped ||
      !proof.termination.confirmed ||
      proof.termination.attemptId !== attempt.id ||
      proof.termination.generation !== attempt.generation ||
      proof.context.attemptId !== attempt.id ||
      proof.context.generation !== attempt.generation ||
      proof.context.role !== 'task' ||
      proof.context.runtimeDigest !== attempt.binding.runtimeDigest ||
      proof.runtimeState.attemptId !== attempt.id ||
      proof.runtimeState.generation !== attempt.generation ||
      proof.runtimeState.role !== 'task' ||
      proof.runtimeState.runtimeDigest !== attempt.binding.runtimeDigest ||
      proof.runtimeState.termination.workerBootId !== bootId ||
      proof.termination.workerBootId !== bootId ||
      canonicalJSON(proof.runtimeState.termination) !==
        canonicalJSON(proof.termination)
    ) {
      return false;
    }
    const durableTermination = await readTerminationReceiptFile(context);
    const runtimeState = await readRuntimeStateReceipt(context);
    const workerTermination = await readWorkerTermination(context);
    if (
      !durableTermination ||
      !runtimeState ||
      !workerTermination ||
      canonicalJSON(durableTermination) !== canonicalJSON(proof.termination) ||
      canonicalJSON(runtimeState) !== canonicalJSON(proof.runtimeState) ||
      workerTermination.attemptId !== attempt.id ||
      workerTermination.generation !== attempt.generation ||
      workerTermination.role !== 'task' ||
      workerTermination.runtimeDigest !== attempt.binding.runtimeDigest ||
      workerTermination.workerBootId !== bootId ||
      workerTermination.pid !== usage.workerPid ||
      !workerTermination.confirmed
    ) {
      return false;
    }
    const workerState = await omp.inspectWorkerRole(context);
    if (workerState.state !== 'absent') return false;

    const completion = await readWorkerCompletion(context);
    if (completion) {
      if (
        completion.attemptId !== attempt.id ||
        completion.generation !== attempt.generation ||
        completion.role !== 'task' ||
        completion.runtimeDigest !== attempt.binding.runtimeDigest ||
        completion.pid !== workerTermination.pid ||
        completion.pgid !== workerTermination.pgid ||
        completion.workerBootId !== workerTermination.workerBootId
      ) {
        return false;
      }
      if (completion.exitCode === 0) {
        return (
          proof.modelWorker?.kind === 'completion' &&
          proof.modelWorker.attemptId === completion.attemptId &&
          proof.modelWorker.generation === completion.generation &&
          proof.modelWorker.role === 'task' &&
          proof.modelWorker.runtimeDigest === completion.runtimeDigest &&
          proof.modelWorker.workerBootId === completion.workerBootId &&
          proof.modelWorker.exitCode === 0 &&
          proof.modelWorker.confirmed &&
          proof.modelWorker.digest === canonicalDigest(completion)
        );
      }
      return (
        proof.modelWorker?.kind === 'completion' &&
        proof.modelWorker.attemptId === completion.attemptId &&
        proof.modelWorker.generation === completion.generation &&
        proof.modelWorker.role === 'task' &&
        proof.modelWorker.runtimeDigest === completion.runtimeDigest &&
        proof.modelWorker.workerBootId === completion.workerBootId &&
        proof.modelWorker.exitCode === completion.exitCode &&
        !proof.modelWorker.confirmed &&
        proof.modelWorker.digest === canonicalDigest(completion)
      );
    }
    return (
      proof.modelWorker?.kind === 'termination' &&
      proof.modelWorker.attemptId === workerTermination.attemptId &&
      proof.modelWorker.generation === workerTermination.generation &&
      proof.modelWorker.role === 'task' &&
      proof.modelWorker.runtimeDigest === workerTermination.runtimeDigest &&
      proof.modelWorker.workerBootId === workerTermination.workerBootId &&
      proof.modelWorker.exitCode === null &&
      proof.modelWorker.confirmed &&
      proof.modelWorker.digest === canonicalDigest(workerTermination)
    );
  }
  /**
   * Persists the immutable complete outcome before cleanup or acknowledgement so a crash
   * before ledger settlement is recoverable without rerunning paid work.
   */
  private async persistStageOutcome(input: {
    attempt: Attempt;
    task: FleetTask;
    result: RunResult;
    termination?: TerminationEvidence;
    projectAuthority?: ProjectAuthority;
  }): Promise<void> {
    const record: StageOutcomeRecord = {
      schemaVersion: 1,
      attemptId: input.attempt.id,
      generation: input.attempt.generation,
      binding: input.attempt.binding,
      task: input.task,
      result: input.result,
      ...(input.termination ? { termination: input.termination } : {}),
      ...(input.projectAuthority
        ? { projectAuthority: input.projectAuthority }
        : {}),
    };
    await this.store.createImmutable(outcomeRecordName(input.attempt), record);
  }

  /**
   * Recovers a durably completed local stage that crashed before ledger settlement.
   * Returns null when no exact recoverable outcome exists (caller keeps unknown/blocked).
   */
  private async recoverLocalOutcome(attempt: Attempt): Promise<Attempt | null> {
    const terminal =
      attempt.state === 'completed' ||
      attempt.state === 'failed' ||
      attempt.state === 'cancelled' ||
      attempt.state === 'fenced';
    const raw = await this.store.read<unknown>(
      outcomeRecordName(attempt),
      null,
    );
    if (raw === null) {
      if (
        terminal &&
        (attempt.state === 'cancelled' || attempt.state === 'fenced')
      )
        return attempt;
      return null;
    }
    const parsed = StageOutcomeRecordSchema.safeParse(raw);
    if (!parsed.success) return null;
    const record = parsed.data;
    if (
      record.attemptId !== attempt.id ||
      record.generation !== attempt.generation
    )
      return null;
    if (canonicalJSON(record.binding) !== canonicalJSON(attempt.binding))
      return null;

    let task: FleetTask;
    try {
      task = parseFleetTask(record.task);
    } catch {
      return null;
    }
    if (canonicalDigest(task) !== attempt.binding.taskDigest) return null;

    let settled: Attempt;
    if (terminal) {
      if (
        (attempt.state !== 'completed' && attempt.state !== 'failed') ||
        !attempt.result ||
        canonicalJSON(attempt.result) !== canonicalJSON(record.result)
      ) {
        throw new HarnessError(
          'RECOVERY_OUTCOME_CONFLICT',
          `Persisted outcome for terminal attempt "${attempt.id}" does not match its ledger result`,
        );
      }
      settled = attempt;
    } else {
      settled = record.termination
        ? await this.ledger.finish(
            attempt.id,
            attempt.token,
            record.result,
            record.termination,
          )
        : await this.ledger.finish(attempt.id, attempt.token, record.result);
      if (settled.state !== 'completed' && settled.state !== 'failed') {
        throw new HarnessError(
          'RECOVERY_UNVERIFIED',
          `Durable outcome for attempt "${attempt.id}" could not be verified by the ledger`,
        );
      }
    }
    if (!settled.result) return null;
    try {
      if (settled.result.status === 'completed') {
        if (
          !(await this.evidenceVerifier.verifyCompletion(
            settled,
            settled.result,
          ))
        ) {
          throw new HarnessError(
            'RECOVERY_UNVERIFIED',
            `Completed outcome for attempt "${attempt.id}" no longer has valid durable proof`,
          );
        }
      } else if (
        !settled.terminationEvidence ||
        !(await this.evidenceVerifier.verifyTermination(
          settled,
          settled.terminationEvidence,
        ))
      ) {
        throw new HarnessError(
          'RECOVERY_UNVERIFIED',
          `Failed outcome for attempt "${attempt.id}" no longer has valid durable termination proof`,
        );
      }
      await this.evidenceService.record(task, settled.result);
    } catch (err: unknown) {
      if (err instanceof HarnessError && err.code === 'RECOVERY_UNVERIFIED')
        throw err;
      throw new HarnessError('EVIDENCE_RECOVERY_FAILED', String(err));
    }
    return settled;
  }

  private async repairTerminalEvidence(attempt: Attempt): Promise<Attempt> {
    if (
      (attempt.state !== 'completed' && attempt.state !== 'failed') ||
      !attempt.result
    ) {
      throw new HarnessError(
        'RECOVERY_RESULT_MISSING',
        `Attempt "${attempt.id}" has no terminal result to repair`,
      );
    }
    const config = await this.policyService.load();
    const localHostId = (await resolveAuthenticatedLocalHost(config)).hostId;
    if (attempt.hostId === localHostId) {
      const repaired = await this.recoverLocalOutcome(attempt);
      if (!repaired?.result) {
        throw new HarnessError(
          'RECOVERY_OUTCOME_MISSING',
          `Terminal local attempt "${attempt.id}" has no verifiable durable outcome`,
        );
      }
      return repaired;
    }

    const rawTask = await this.store.read<unknown>(
      `remote-task-${attempt.id}`,
      null,
    );
    if (rawTask === null) {
      throw new HarnessError(
        'RECOVERY_TASK_MISSING',
        `Terminal remote attempt "${attempt.id}" has no persisted task for evidence repair`,
      );
    }
    const task = parseFleetTask(rawTask);
    if (canonicalDigest(task) !== attempt.binding.taskDigest) {
      throw new HarnessError(
        'RECOVERY_TASK_MISMATCH',
        `Persisted task for remote attempt "${attempt.id}" does not match its signed binding`,
      );
    }
    const proofValid =
      attempt.result.status === 'completed'
        ? await this.evidenceVerifier.verifyCompletion(attempt, attempt.result)
        : !!attempt.terminationEvidence &&
          (await this.evidenceVerifier.verifyTermination(
            attempt,
            attempt.terminationEvidence,
          ));
    if (!proofValid) {
      throw new HarnessError(
        'EVIDENCE_RECOVERY_FAILED',
        `Remote terminal attempt "${attempt.id}" has no verifiable signed receipt`,
      );
    }
    await this.evidenceService.record(task, attempt.result);
    return attempt;
  }

  /** Reads a persisted candidate bundle only when its outcome and admitted metadata match. */
  private async readPersistedOutputBundle(
    attempt: Attempt,
  ): Promise<HarnessBundle | null> {
    const root = artifactRootFor(this.store.stateDir, attempt);
    const filePath = path.join(root, 'bundle.json');
    if (!isInside(root, filePath)) return null;
    const raw = await readJsonBoundedSafe(filePath);
    if (raw === null) return null;
    const parsed = HarnessBundleSchema.safeParse(raw);
    if (!parsed.success) return null;

    const inputRaw = await this.store.read<unknown>(
      stageInputBundleName(attempt),
      null,
    );
    const inputBundle = HarnessBundleSchema.safeParse(inputRaw);
    if (
      !inputBundle.success ||
      canonicalDigest(inputBundle.data) !== attempt.binding.harnessDigest
    ) {
      return null;
    }
    try {
      assertCandidateMetadataUnchanged(inputBundle.data, parsed.data);
    } catch {
      return null;
    }

    const receiptRaw = await this.store.read<unknown>(
      stageReceiptName(attempt),
      null,
    );
    if (receiptRaw === null) return null;
    const receipt = StageReceiptSchema.safeParse(receiptRaw);
    if (
      !receipt.success ||
      receipt.data.attemptId !== attempt.id ||
      receipt.data.generation !== attempt.generation ||
      receipt.data.bindingDigest !== canonicalDigest(attempt.binding) ||
      receipt.data.bundleDigest !== attempt.binding.harnessDigest
    ) {
      return null;
    }
    const outcomeRaw = await this.store.read<unknown>(
      outcomeRecordName(attempt),
      null,
    );
    const outcome = StageOutcomeRecordSchema.safeParse(outcomeRaw);
    if (
      !outcome.success ||
      outcome.data.attemptId !== attempt.id ||
      outcome.data.generation !== attempt.generation ||
      canonicalJSON(outcome.data.binding) !== canonicalJSON(attempt.binding) ||
      outcome.data.result.status !== 'completed' ||
      receipt.data.resultDigest !== canonicalDigest(outcome.data.result) ||
      receipt.data.artifactDigest !== outcome.data.result.artifactDigest
    ) {
      return null;
    }
    const entry = receipt.data.artifacts.find(
      (artifact) => artifact.path === 'bundle.json',
    );
    if (
      !entry ||
      receipt.data.artifacts.length !== 1 ||
      canonicalDigest({
        artifacts: receipt.data.artifacts,
        scope: 'bundle',
      }) !== outcome.data.result.artifactDigest
    ) {
      return null;
    }
    let stat: fs.Stats;
    try {
      stat = await fs.lstat(filePath);
    } catch {
      return null;
    }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== entry.size)
      return null;
    if ((await sha256File(filePath)) !== entry.sha256) return null;
    return parsed.data;
  }

  private async settle(
    attempt: Attempt,
    outcome: StageOutcome,
    task: FleetTask,
  ): Promise<Attempt> {
    const settled =
      outcome.result.status === 'completed'
        ? await this.ledger.finish(attempt.id, attempt.token, outcome.result)
        : outcome.termination
          ? await this.ledger.finish(
              attempt.id,
              attempt.token,
              outcome.result,
              outcome.termination,
            )
          : await this.ledger.markUnknown(attempt.id, attempt.token);

    if (settled.state !== 'completed' && settled.state !== 'failed') {
      throw new HarnessError(
        'STAGE_PROOF_UNVERIFIED',
        `Stage "${attempt.binding.stage}" for attempt "${attempt.id}" could not be settled with authoritative proof (state "${settled.state}")`,
      );
    }
    if (!settled.result) {
      throw new HarnessError(
        'STAGE_RESULT_MISSING',
        `Stage "${attempt.binding.stage}" for attempt "${attempt.id}" has no authoritative result`,
      );
    }
    await this.evidenceService.record(task, settled.result);
    return settled;
  }

  private async persistArtifacts(
    attempt: Attempt,
    sourceDir: string,
  ): Promise<StageArtifactEntry[]> {
    const root = artifactRootFor(this.store.stateDir, attempt);
    await fs.ensureDir(root);
    const entries: StageArtifactEntry[] = [];
    let totalBytes = 0;

    const walk = async (relativeDir: string, depth: number): Promise<void> => {
      if (depth > ARTIFACT_LIMITS.MAX_DEPTH) {
        throw new HarnessError(
          'ARTIFACT_LIMIT_EXCEEDED',
          'Artifact tree exceeds the bounded depth',
        );
      }
      const absoluteDir = path.join(sourceDir, relativeDir);
      const listing = await fs.readdir(absoluteDir, { withFileTypes: true });
      for (const entry of listing.sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        const nextRelative = relativeDir
          ? path.join(relativeDir, entry.name)
          : entry.name;
        const absolute = path.join(sourceDir, nextRelative);
        if (entry.isSymbolicLink()) {
          throw new HarnessError(
            'ARTIFACT_SPECIAL_FILE',
            `Artifact is a symbolic link: ${nextRelative}`,
          );
        }
        if (entry.isDirectory()) {
          await walk(nextRelative, depth + 1);
          continue;
        }
        if (!entry.isFile()) {
          throw new HarnessError(
            'ARTIFACT_SPECIAL_FILE',
            `Artifact is not a regular file: ${nextRelative}`,
          );
        }
        const stat = await fs.lstat(absolute);
        totalBytes += stat.size;
        if (
          entries.length + 1 > ARTIFACT_LIMITS.MAX_FILES ||
          totalBytes > ARTIFACT_LIMITS.MAX_BYTES
        ) {
          throw new HarnessError(
            'ARTIFACT_LIMIT_EXCEEDED',
            'Artifact tree exceeds the bounded size',
          );
        }
        const target = path.join(root, nextRelative);
        await fs.ensureDir(path.dirname(target));
        await fs.copyFile(absolute, target, fs.constants.COPYFILE_EXCL);
        entries.push({
          path: nextRelative,
          sha256: await sha256File(target),
          size: stat.size,
        });
      }
    };

    await walk('', 0);
    return entries;
  }

  private async resolveSeedSnapshot(
    context: TaskExecutionContext,
    attempt: Attempt,
    base: StageWorkspaces,
    runner: SandboxRunnerCapability,
  ): Promise<string> {
    if (context.snapshotDir) {
      return context.snapshotDir;
    }
    await fs.ensureDir(base.snapshot);
    const commit = await runner.snapshot(
      context.sourceRootPath,
      context.task.sourceRef,
      base.snapshot,
    );
    if (commit !== context.task.sourceRef) {
      throw new HarnessError(
        'SOURCE_REVISION_MISMATCH',
        `Resolved snapshot commit "${commit}" does not match the bound source revision "${context.task.sourceRef}"`,
      );
    }
    return base.snapshot;
  }

  private async cleanupStageWorkspaces(base: StageWorkspaces): Promise<void> {
    await fs.remove(base.deliverable).catch(() => undefined);
    await fs.remove(base.evaluation).catch(() => undefined);
    await fs.remove(base.snapshot).catch(() => undefined);
  }

  // -------------------------------------------------------------------------
  // Context, budget, policy and inventory helpers
  // -------------------------------------------------------------------------

  private async prepareTaskContext(
    taskInput: FleetTask,
    config: FleetConfig,
    localHostId: string | null,
    options: { createSnapshot?: boolean } = {},
  ): Promise<TaskExecutionContext> {
    const task = parseFleetTask(taskInput);
    const isRemote = task.project.hostId !== localHostId;

    if (isRemote) {
      if (!SOURCE_REVISION_PATTERN.test(task.sourceRef)) {
        throw new HarnessError(
          'SOURCE_REVISION_REQUIRED',
          'Remote execution requires an immutable 40/64 character lowercase hex source revision',
        );
      }
      await this.assertRemoteProjectInventoryAssociation(task.project);
      const identity = this.resolveProvisionalRemoteIdentity(
        config,
        task.project,
      );
      return {
        task: {
          ...task,
          project: {
            ...task.project,
            logicalProjectId: identity.logicalProjectId,
          },
        },
        resolved: {
          config,
          domain: identity.domain,
          account: identity.account,
          policyDigest: policyDigest(config),
        },
        hostRuntime: resolveHostRuntime(config, task.project.hostId),
        isRemote: true,
        snapshotDir: null,
        sourceRootPath: task.project.rootPath,
      };
    }

    const canonicalProject = await this.resolveCanonicalProject(
      task.project,
      config,
    );
    const resolved = await this.policyService.resolve(canonicalProject);

    if (options.createSnapshot === false) {
      return {
        task: { ...task, project: canonicalProject },
        resolved,
        hostRuntime: resolveHostRuntime(config, task.project.hostId),
        isRemote: false,
        snapshotDir: null,
        sourceRootPath: canonicalProject.rootPath,
      };
    }

    const runner = this.requireRunnerFor(config, task.project.hostId);
    const verification = runner.validateVerification(task.verification);
    if (!verification.ok) {
      throw new HarnessError(
        'EVALUATOR_CONTRACT_INVALID',
        `Trusted evaluator contract is invalid: ${verification.reasonCodes.join(', ')}`,
      );
    }
    const snapshotDir = path.join(
      this.store.stateDir,
      `temp-snapshot-${crypto.randomUUID()}`,
    );
    await fs.ensureDir(snapshotDir);
    try {
      const commit = await runner.snapshot(
        canonicalProject.rootPath,
        task.sourceRef,
        snapshotDir,
      );
      if (!SOURCE_REVISION_PATTERN.test(commit)) {
        throw new HarnessError(
          'SOURCE_NOT_IMMUTABLE',
          `Snapshot resolved source "${commit}" is not an immutable commit SHA`,
        );
      }
      if (
        SOURCE_REVISION_PATTERN.test(task.sourceRef) &&
        commit !== task.sourceRef
      ) {
        throw new HarnessError(
          'SOURCE_REVISION_MISMATCH',
          `Snapshot resolved commit "${commit}" does not match the requested immutable revision`,
        );
      }
      return {
        task: { ...task, project: canonicalProject, sourceRef: commit },
        resolved,
        hostRuntime: resolveHostRuntime(config, task.project.hostId),
        isRemote: false,
        snapshotDir,
        sourceRootPath: canonicalProject.rootPath,
      };
    } catch (err: unknown) {
      await fs.remove(snapshotDir).catch(() => undefined);
      throw err;
    }
  }

  private async releaseTaskContext(
    context: TaskExecutionContext,
  ): Promise<void> {
    if (context.snapshotDir) {
      await fs.remove(context.snapshotDir).catch(() => undefined);
    }
  }

  private async establishBudget(
    config: FleetConfig,
    options: FleetCoordinatorRunOptions,
  ): Promise<{ runId: string; budgetId: string }> {
    return this.establishBudgetFor(config, options.runId, options.budgetId);
  }

  private async establishBudgetFor(
    config: FleetConfig,
    runId: string | undefined,
    budgetId: string | undefined,
  ): Promise<{ runId: string; budgetId: string }> {
    const requested = budgetId ?? runId;
    if (requested) {
      const existing = await this.ledger.getBudget(requested);
      if (!existing) {
        throw new HarnessError(
          'BUDGET_NOT_FOUND',
          `Specified budget epoch "${requested}" does not exist in ledger`,
        );
      }
      return { runId: existing.runId, budgetId: existing.id };
    }

    const now = Date.now();
    const epoch: BudgetEpochRequest = {
      id: crypto.randomUUID(),
      runId: crypto.randomUUID(),
      createdAt: now,
      deadline: now + config.limits.maxDurationMs,
      maxAttempts: config.limits.maxAttempts,
      maxConcurrent: config.limits.maxConcurrent,
      maxToolCalls: config.limits.maxToolCalls,
    };
    const created = await this.ledger.createBudget(epoch, config);
    return { runId: created.runId, budgetId: created.id };
  }

  private requireRunnerFor(
    config: FleetConfig,
    hostId: string,
  ): SandboxRunnerCapability {
    if (!this.runner) {
      throw new HarnessError(
        'RUNNER_UNAVAILABLE',
        'No sandbox runner configured for this executing host',
      );
    }
    const expected = resolveHostRuntime(config, hostId).manifestDigest;
    if (this.runner.runtime.manifestDigest !== expected) {
      throw new HarnessError(
        'RUNNER_RUNTIME_MISMATCH',
        'Injected runner runtime does not match the executing host runtime closure',
      );
    }
    return this.runner;
  }

  private requireOmpFor(
    config: FleetConfig,
    hostId: string,
  ): OmpExecutorCapability {
    if (!this.ompExecutor) {
      throw new HarnessError(
        'OMP_EXECUTOR_UNAVAILABLE',
        'No restricted OMP executor configured for this executing host',
      );
    }
    const expected = resolveHostRuntime(config, hostId).manifestDigest;
    if (this.ompExecutor.runtime.manifestDigest !== expected) {
      throw new HarnessError(
        'OMP_EXECUTOR_RUNTIME_MISMATCH',
        'Injected OMP executor runtime does not match the executing host runtime closure',
      );
    }
    return this.ompExecutor;
  }

  private requireWorkerHost(config: FleetConfig): FleetHost {
    const identity = resolveAuthenticatedLocalHostSync(config);
    if (identity.status !== 'resolved') {
      throw new HarnessError(
        'WORKER_HOST_UNIDENTIFIED',
        `Worker requires an authenticated local host identity (${identity.status})`,
      );
    }
    return identity.host;
  }

  private async resolveCanonicalProject(
    project: FleetProject,
    config: FleetConfig,
  ): Promise<FleetProject> {
    const inventory = await this.getFreshInventory();
    if (!inventory.complete) {
      throw new HarnessError(
        'INVENTORY_INCOMPLETE',
        'Checkout authorization requires complete fresh inventory',
      );
    }
    const hostEntries = inventory.hosts.filter(
      (host) => (host.serverId ?? host.hostKey) === project.hostId,
    );
    if (hostEntries.length !== 1) {
      throw new HarnessError(
        'PROJECT_UNREACHABLE',
        `Host "${project.hostId}" is absent or ambiguous in fresh inventory`,
      );
    }
    const hostEntry = hostEntries[0];
    if (hostEntry.status !== 'reachable') {
      throw new HarnessError(
        'PROJECT_UNREACHABLE',
        `Host "${project.hostId}" is "${hostEntry.status}" in fresh inventory`,
      );
    }
    const matchingProjects = hostEntry.projects.filter(
      (entry) => entry.projectId === project.projectId,
    );
    if (
      matchingProjects.length !== 1 ||
      matchingProjects[0].checkouts === undefined
    ) {
      throw new HarnessError(
        'CHECKOUT_INVENTORY_INVALID',
        `Registered checkout inventory for project "${project.projectId}" is absent or ambiguous`,
      );
    }

    const declaredRoot = await this.realpathProjectRoot(project.rootPath);
    const canonicalByProject = new Map<string, Set<string>>();
    for (const entry of hostEntry.projects) {
      if (entry.checkouts === undefined) {
        throw new HarnessError(
          'CHECKOUT_INVENTORY_INVALID',
          `Checkout inventory is incomplete for registered project "${entry.projectId}"`,
        );
      }
      const roots = new Set<string>();
      for (const registeredPath of getProjectCheckoutPaths(entry)) {
        if (!isValidWorkspacePath(registeredPath)) {
          throw new HarnessError(
            'CHECKOUT_INVENTORY_INVALID',
            `Registered project "${entry.projectId}" contains an invalid checkout path`,
          );
        }
        roots.add(await this.realpathProjectRoot(registeredPath));
      }
      canonicalByProject.set(entry.projectId, roots);
    }
    const rootOwners = [...canonicalByProject.entries()]
      .filter(([, roots]) => roots.has(declaredRoot))
      .map(([projectId]) => projectId);
    if (!canonicalByProject.get(project.projectId)?.has(declaredRoot)) {
      throw new HarnessError(
        'INVENTORY_ROOT_MISMATCH',
        `Physical root "${declaredRoot}" is not an enrolled checkout for project "${project.projectId}"`,
      );
    }
    if (rootOwners.length !== 1) {
      throw new HarnessError(
        'CHECKOUT_ROOT_AMBIGUOUS',
        `Physical root "${declaredRoot}" is associated with multiple registered projects`,
      );
    }

    return {
      hostId: project.hostId,
      projectId: project.projectId,
      rootPath: declaredRoot,
      logicalProjectId: resolveLogicalProjectId(
        {
          hostId: project.hostId,
          projectId: project.projectId,
          rootPath: declaredRoot,
          logicalProjectId: project.logicalProjectId,
        },
        config,
      ),
    };
  }

  private async realpathProjectRoot(root: string): Promise<string> {
    if (!isValidWorkspacePath(root)) {
      throw new HarnessError('INVALID_PROJECT', 'Project root path is invalid');
    }
    try {
      return await fs.realpath(root);
    } catch {
      throw new HarnessError(
        'PROJECT_UNREACHABLE',
        'Trusted or declared project root does not exist on this host',
      );
    }
  }

  private async assertRemoteProjectInventoryAssociation(
    project: FleetProject,
  ): Promise<void> {
    const inventory = await this.getFreshInventory();
    if (!inventory.complete) {
      throw new HarnessError(
        'INVENTORY_INCOMPLETE',
        'Remote checkout authorization requires complete fresh inventory',
      );
    }
    const hosts = inventory.hosts.filter(
      (host) => (host.serverId ?? host.hostKey) === project.hostId,
    );
    if (hosts.length !== 1 || hosts[0].status !== 'reachable') {
      throw new HarnessError(
        'PROJECT_UNREACHABLE',
        `Remote host "${project.hostId}" is absent, ambiguous, or unreachable in fresh inventory`,
      );
    }
    const entries = hosts[0].projects.filter(
      (entry) => entry.projectId === project.projectId,
    );
    if (entries.length !== 1 || entries[0].checkouts === undefined) {
      throw new HarnessError(
        'CHECKOUT_INVENTORY_INVALID',
        `Remote checkout inventory for project "${project.projectId}" is absent or ambiguous`,
      );
    }
    if (!isValidWorkspacePath(project.rootPath)) {
      throw new HarnessError(
        'INVALID_PROJECT',
        'Remote project rootPath must be a valid absolute path',
      );
    }
    for (const entry of hosts[0].projects) {
      if (entry.checkouts === undefined) {
        throw new HarnessError(
          'CHECKOUT_INVENTORY_INVALID',
          `Remote checkout inventory is incomplete for project "${entry.projectId}"`,
        );
      }
      for (const registeredPath of getProjectCheckoutPaths(entry)) {
        if (!isValidWorkspacePath(registeredPath)) {
          throw new HarnessError(
            'CHECKOUT_INVENTORY_INVALID',
            `Remote checkout inventory has an invalid path for project "${entry.projectId}"`,
          );
        }
      }
    }
    const owners = hosts[0].projects
      .filter((entry) =>
        getProjectCheckoutPaths(entry).some((registeredPath) =>
          sameRemotePath(registeredPath, project.rootPath),
        ),
      )
      .map((entry) => entry.projectId);
    if (owners.length !== 1 || owners[0] !== project.projectId) {
      throw new HarnessError(
        'INVENTORY_ROOT_MISMATCH',
        `Declared remote root is not uniquely enrolled for project "${project.projectId}"`,
      );
    }
  }

  /**
   * Lexical-only provisional identity for a remote declaration. This is never authority:
   * the executing host re-resolves canonically before admission and denies any mismatch.
   * No coordinator filesystem canonicalization is applied to a remote path.
   */
  private resolveProvisionalRemoteIdentity(
    config: FleetConfig,
    project: FleetProject,
  ): { domain: string; account: FleetAccount; logicalProjectId: string } {
    const root = project.rootPath;
    if (!isAbsoluteForAnyPlatform(root)) {
      throw new HarnessError(
        'INVALID_PROJECT',
        'Remote project rootPath must be absolute',
      );
    }
    const remoteRoot = parseRemotePath(root);
    if (remoteRoot.segments.some((segment) => segment === '..')) {
      throw new HarnessError(
        'INVALID_PROJECT',
        'Remote project rootPath must not contain ".."',
      );
    }

    const prefixSpecificity = (prefix: string): number => {
      const parsedPrefix = parseRemotePath(prefix);
      if (
        parsedPrefix.flavor !== remoteRoot.flavor ||
        parsedPrefix.volume !== remoteRoot.volume ||
        parsedPrefix.segments.some((segment) => segment === '..')
      ) {
        return -1;
      }
      if (
        parsedPrefix.segments.length === 0 ||
        parsedPrefix.segments.length > remoteRoot.segments.length
      ) {
        return -1;
      }
      const normalize =
        remoteRoot.flavor === 'windows'
          ? (segment: string) => segment.toLowerCase()
          : (segment: string) => segment;
      for (let index = 0; index < parsedPrefix.segments.length; index += 1) {
        if (
          normalize(parsedPrefix.segments[index]) !==
          normalize(remoteRoot.segments[index])
        )
          return -1;
      }
      return parsedPrefix.segments.length;
    };
    const hostMatches = (hostIds: string[]): boolean =>
      hostIds.includes(project.hostId) || hostIds.includes('*');
    const domainCandidates = config.domains.flatMap((domain) => {
      if (!hostMatches(domain.hostIds)) return [];
      const specificity = Math.max(
        -1,
        ...domain.pathPrefixes.map(prefixSpecificity),
      );
      return specificity < 0 ? [] : [{ domain, specificity }];
    });
    if (domainCandidates.length === 0) {
      throw new HarnessError(
        'DOMAIN_NOT_FOUND',
        `No domain configured for declared remote root "${root}"`,
      );
    }
    const bestDomainSpecificity = Math.max(
      ...domainCandidates.map((entry) => entry.specificity),
    );
    const bestDomains = domainCandidates.filter(
      (entry) => entry.specificity === bestDomainSpecificity,
    );
    if (new Set(bestDomains.map((entry) => entry.domain.id)).size !== 1) {
      throw new HarnessError(
        'AMBIGUOUS_DOMAIN',
        `Conflicting domains tie for most-specific remote root "${root}"`,
      );
    }
    const domain = bestDomains[0].domain;

    const ruleCandidates = config.rules.flatMap((rule) => {
      if (rule.domain !== domain.id || !hostMatches(rule.hostIds)) return [];
      const specificity = Math.max(
        -1,
        ...rule.pathPrefixes.map(prefixSpecificity),
      );
      return specificity < 0 ? [] : [{ rule, specificity }];
    });
    if (ruleCandidates.length === 0) {
      throw new HarnessError(
        'RULE_NOT_FOUND',
        `No rule matches declared remote root "${root}" in domain "${domain.id}"`,
      );
    }
    const bestRuleSpecificity = Math.max(
      ...ruleCandidates.map((entry) => entry.specificity),
    );
    const bestRules = ruleCandidates
      .filter((entry) => entry.specificity === bestRuleSpecificity)
      .map((entry) => entry.rule);
    if (bestRules.some((rule) => !rule.enabled)) {
      throw new HarnessError(
        'RULE_DISABLED',
        `The most-specific rule for remote root "${root}" is disabled`,
      );
    }
    if (
      new Set(bestRules.map((rule) => rule.accountId)).size !== 1 ||
      new Set(bestRules.map((rule) => rule.allowModelData)).size !== 1
    ) {
      throw new HarnessError(
        'AMBIGUOUS_RULE',
        `Conflicting rules tie for remote root "${root}"`,
      );
    }
    const rule = bestRules[0];
    if (!rule.enabled) {
      throw new HarnessError('RULE_DISABLED', `Rule "${rule.id}" is disabled`);
    }
    if (!rule.allowModelData) {
      throw new HarnessError(
        'MODEL_DATA_DENIED',
        `Rule "${rule.id}" does not authorize model data transmission`,
      );
    }
    const account = config.accounts.find(
      (entry) => entry.id === rule.accountId,
    );
    if (!account) {
      throw new HarnessError(
        'ACCOUNT_NOT_FOUND',
        `Account "${rule.accountId}" is not configured`,
      );
    }
    if (
      !account.allowedDomains.includes(domain.id) &&
      !account.allowedDomains.includes('*')
    ) {
      throw new HarnessError(
        'ACCOUNT_DOMAIN_INELIGIBLE',
        `Account "${account.id}" is not authorized for domain "${domain.id}"`,
      );
    }

    return {
      domain: domain.id,
      account,
      logicalProjectId: resolveLogicalProjectId(project, config),
    };
  }

  private assertWorkerAuthority(
    request: SignedExecutionRequest,
    localResolved: ResolvedPolicyContext,
    localHost: FleetHost,
  ): void {
    const binding = request.payload.binding;
    if (
      request.payload.hostId !== localHost.serverId ||
      binding.hostId !== localHost.serverId
    ) {
      throw new HarnessError(
        'WORKER_HOST_MISMATCH',
        'Signed host does not match this worker host',
      );
    }
    if (binding.domain !== localResolved.domain) {
      throw new HarnessError(
        'WORKER_DOMAIN_MISMATCH',
        `Signed domain "${binding.domain}" does not match locally resolved domain "${localResolved.domain}"`,
      );
    }
    if (binding.accountId !== localResolved.account.id) {
      throw new HarnessError(
        'WORKER_ACCOUNT_MISMATCH',
        `Signed account "${binding.accountId}" does not match locally resolved account "${localResolved.account.id}"`,
      );
    }
    if (
      binding.provider !== localResolved.account.provider ||
      binding.model !== localResolved.account.model
    ) {
      throw new HarnessError(
        'WORKER_ACCOUNT_MISMATCH',
        'Signed provider/model does not match the local account',
      );
    }
    if (binding.policyDigest !== localResolved.policyDigest) {
      throw new HarnessError(
        'WORKER_POLICY_MISMATCH',
        'Signed policy digest does not match local policy authority',
      );
    }
    if (localResolved.account.allowedProviderEndpoints.length === 0) {
      throw new HarnessError(
        'ACCOUNT_ENDPOINT_INELIGIBLE',
        'Resolved account has no authorized provider endpoints',
      );
    }
    const expectedRuntime = resolveHostRuntime(
      localResolved.config,
      binding.hostId,
    ).manifestDigest;
    if (binding.runtimeDigest !== expectedRuntime) {
      throw new HarnessError(
        'WORKER_RUNTIME_MISMATCH',
        'Signed runtime digest does not match the local enrolled runtime closure',
      );
    }
    if (request.payload.generation !== localResolved.config.generation) {
      throw new HarnessError(
        'WORKER_GENERATION_MISMATCH',
        `Signed generation ${request.payload.generation} does not match local policy generation ${localResolved.config.generation}`,
      );
    }
  }

  private async persistSignedHeldoutPlan(
    request: SignedExecutionRequest,
    config: FleetConfig,
  ): Promise<void> {
    if (!isHeldoutBinding(request.payload.binding)) {
      return;
    }
    const plan = request.payload.evaluationPlan;
    if (!plan) {
      throw new HarnessError(
        'HELDOUT_PLAN_REQUIRED',
        'Heldout execution request is missing the frozen evaluation plan',
      );
    }
    const parsed = FrozenEvaluationPlanSchema.parse(plan);
    if (canonicalDigest(parsed) !== request.payload.binding.planDigest) {
      throw new HarnessError(
        'FROZEN_PLAN_DIGEST_MISMATCH',
        'Frozen plan content does not match the signed planDigest',
      );
    }
    if (parsed.policyDigest !== request.payload.binding.policyDigest) {
      throw new HarnessError(
        'FROZEN_PLAN_MISMATCH',
        'Frozen plan policyDigest does not match the binding',
      );
    }
    if (parsed.policyDigest !== policyDigest(config)) {
      throw new HarnessError(
        'FROZEN_PLAN_MISMATCH',
        'Frozen plan policyDigest does not match local policy',
      );
    }
    if (
      parsed.runtimeDigest !== evaluationRuntimeDigest(config, parsed.cases)
    ) {
      throw new HarnessError(
        'FROZEN_PLAN_MISMATCH',
        'Frozen plan runtimeDigest does not match the enrolled host runtime aggregate',
      );
    }

    const attemptId = request.payload.attemptId;
    const matchedCase = parsed.cases.find(
      (entry) =>
        entry.baselineAttemptId === attemptId ||
        entry.candidateAttemptId === attemptId,
    );
    if (!matchedCase) {
      throw new HarnessError(
        'HELDOUT_CASE_MISMATCH',
        `Signed attempt "${attemptId}" is not a planned case attempt in the frozen plan`,
      );
    }
    const role =
      matchedCase.candidateAttemptId === attemptId ? 'candidate' : 'baseline';
    const expectedHarnessDigest =
      role === 'candidate' ? parsed.releaseDigest : parsed.baselineDigest;
    if (request.payload.binding.harnessDigest !== expectedHarnessDigest) {
      throw new HarnessError(
        'HELDOUT_HARNESS_MISMATCH',
        'Signed harness digest does not match the planned role',
      );
    }
    if (matchedCase.runtimeDigest !== request.payload.binding.runtimeDigest) {
      throw new HarnessError(
        'FROZEN_PLAN_MISMATCH',
        'Case runtimeDigest does not match the signed binding',
      );
    }

    const name = `plan-${request.payload.binding.planDigest}`;
    const existing = await this.store.read<unknown>(name, null);
    if (existing !== null) {
      const parsedExisting = FrozenEvaluationPlanSchema.safeParse(existing);
      if (
        !parsedExisting.success ||
        canonicalJSON(parsedExisting.data) !== canonicalJSON(parsed)
      ) {
        throw new HarnessError(
          'FROZEN_PLAN_CONFLICT',
          'A different immutable plan already exists for this planDigest',
        );
      }
      return;
    }
    await this.store.createImmutable(name, parsed);
  }

  private async ensureMirrorBudget(
    signedBudget: BudgetEpoch,
    localConfig: FleetConfig,
  ): Promise<void> {
    const existing = await this.ledger.getBudget(signedBudget.id);
    if (existing) {
      const identical =
        existing.runId === signedBudget.runId &&
        existing.policyDigest === signedBudget.policyDigest &&
        existing.policyGeneration === signedBudget.policyGeneration &&
        existing.deadline === signedBudget.deadline &&
        existing.maxAttempts === signedBudget.maxAttempts &&
        existing.maxConcurrent === signedBudget.maxConcurrent &&
        existing.maxToolCalls === signedBudget.maxToolCalls;
      if (!identical) {
        throw new HarnessError(
          'BUDGET_AUTHORITY_MISMATCH',
          `Local mirror epoch "${signedBudget.id}" no longer matches the signed campaign authority`,
        );
      }
      return;
    }
    await this.ledger.createBudget(
      {
        id: signedBudget.id,
        runId: signedBudget.runId,
        createdAt: signedBudget.createdAt,
        deadline: signedBudget.deadline,
        maxAttempts: signedBudget.maxAttempts,
        maxConcurrent: signedBudget.maxConcurrent,
        maxToolCalls: signedBudget.maxToolCalls,
      },
      localConfig,
    );
  }

  private async loadProposedBundle(
    releaseDigest: string,
  ): Promise<HarnessBundle> {
    const raw = await this.store.read<unknown>(`bundle-${releaseDigest}`, null);
    if (raw === null) {
      throw new HarnessError(
        'RELEASE_NOT_FOUND',
        `No proposed release bundle exists for digest "${releaseDigest}"`,
      );
    }
    const parsed = HarnessBundleSchema.safeParse(raw);
    if (!parsed.success) {
      throw new HarnessError(
        'INVALID_BUNDLE',
        'Stored release bundle failed strict validation',
      );
    }
    if (canonicalDigest(parsed.data) !== releaseDigest) {
      throw new HarnessError(
        'RELEASE_DIGEST_MISMATCH',
        'Stored release bundle content does not match the requested digest',
      );
    }
    return parsed.data;
  }

  private async resolveCoordinatorSigner(
    config: FleetConfig,
  ): Promise<{ id: string; privateKey: string }> {
    const keyPath =
      process.env[COORDINATOR_KEY_ENV] ??
      path.join(this.store.stateDir, COORDINATOR_KEY_FILENAME);
    if (!(await fs.pathExists(keyPath))) {
      throw new HarnessError(
        'MISSING_COORDINATOR_KEY',
        `Coordinator machine private key not found at "${keyPath}"`,
      );
    }
    const privateKey = await fs.readFile(keyPath, 'utf8');
    const derived = publicDerFromPrivate(loadPrivateKey(privateKey));
    const matches = config.coordinators.filter((entry) =>
      publicDerFromConfigured(entry.publicKey).equals(derived),
    );
    if (matches.length !== 1) {
      throw new HarnessError(
        'COORDINATOR_KEY_UNTRUSTED',
        `Configured coordinator private key must match exactly one trusted coordinator identity (matched ${matches.length})`,
      );
    }
    return { id: matches[0].id, privateKey };
  }

  private async loadVerifiedSetup(): Promise<HarnessConfig> {
    return new HarnessSetupService(this.store.stateDir).load();
  }

  private async getFreshInventory(): Promise<HarnessInventory> {
    const setup = await this.loadVerifiedSetup();
    const inventory = await this.discoveryService.discover(setup);
    if (!inventory || inventory.schemaVersion !== 1) {
      throw new HarnessError(
        'INVENTORY_INVALID',
        'Fresh inventory payload is invalid',
      );
    }
    return inventory;
  }

  private async getFreshProjectInventory(): Promise<FreshProjectEntry[]> {
    const inventory = await this.getFreshInventory();
    return inventory.hosts.flatMap((host) => {
      const hostId = host.serverId ?? host.hostKey;
      return host.projects.map((project) => ({
        hostId,
        projectId: project.projectId,
        rootPath: project.path,
        status:
          host.status === 'reachable'
            ? ('reachable' as const)
            : ('unreachable' as const),
      }));
    });
  }

  private async syncInventory(): Promise<void> {
    const inventory = await this.getFreshInventory();
    await this.store.write(
      LAST_KNOWN_INVENTORY_RECORD,
      inventory.hosts.flatMap((host) =>
        host.projects.map((project) => ({
          logicalProjectId: project.projectKey ?? project.projectId,
          hostId: host.serverId ?? host.hostKey,
          projectId: project.projectId,
          rootPath: project.path,
          lastSeenAt: Date.now(),
        })),
      ),
    );
  }

  private async getMergedProjectInventory(): Promise<
    FleetStatusSummary['projects']
  > {
    const lastKnown = await this.store.read<
      Array<{
        logicalProjectId: string;
        hostId: string;
        projectId: string;
        rootPath: string;
        lastSeenAt: number;
      }>
    >(LAST_KNOWN_INVENTORY_RECORD, []);

    let fresh: FreshProjectEntry[];
    try {
      fresh = await this.getFreshProjectInventory();
    } catch {
      fresh = [];
    }
    const freshMap = new Map(
      fresh.map((entry) => [
        `${entry.hostId}::${entry.projectId}`,
        entry.status,
      ]),
    );

    const merged: FleetStatusSummary['projects'] = [];
    const seen = new Set<string>();
    for (const item of lastKnown) {
      const key = `${item.hostId}::${item.projectId}`;
      seen.add(key);
      merged.push({
        logicalProjectId: item.logicalProjectId,
        hostId: item.hostId,
        status: freshMap.get(key) === 'reachable' ? 'reachable' : 'unreachable',
      });
    }
    for (const entry of fresh) {
      const key = `${entry.hostId}::${entry.projectId}`;
      if (!seen.has(key)) {
        merged.push({
          logicalProjectId: entry.projectId,
          hostId: entry.hostId,
          status: entry.status,
        });
      }
    }
    return merged;
  }

  // -------------------------------------------------------------------------
  // Durable remote replay state
  // -------------------------------------------------------------------------

  private async ensureAcceptedReceipt(
    name: string,
    factory: () => SignedWorkerReceipt,
  ): Promise<SignedWorkerReceipt> {
    const existing = await this.store.read<unknown>(name, null);
    if (existing !== null) {
      return SignedWorkerReceiptSchema.parse(existing);
    }
    const receipt = factory();
    try {
      await this.store.createImmutable(name, receipt);
      return receipt;
    } catch (err: unknown) {
      const reread = await this.store.read<unknown>(name, null);
      if (reread !== null) {
        return SignedWorkerReceiptSchema.parse(reread);
      }
      throw err;
    }
  }

  private async consumeRequest(
    requestId: string,
    nonce: string,
    payloadDigest: string,
    attemptId: string,
    generation: number,
    localGeneration: number,
    acceptedReceiptName: string,
    ownerBootId: string,
    ownerPid: number,
  ): Promise<{
    replay: boolean;
    receiptName?: string;
    denial?: { code: string; message: string };
    ownerAlive?: boolean;
    phase?: RemoteRequestRecord['phase'];
    status?: RemoteRequestRecord['status'];
  }> {
    if (generation !== localGeneration) {
      throw new HarnessError(
        'WORKER_GENERATION_MISMATCH',
        `Signed request generation ${generation} does not match local policy generation ${localGeneration}`,
      );
    }

    let outcome: {
      replay: boolean;
      receiptName?: string;
      denial?: { code: string; message: string };
      ownerAlive?: boolean;
      phase?: RemoteRequestRecord['phase'];
      status?: RemoteRequestRecord['status'];
    } = { replay: false, receiptName: acceptedReceiptName };

    await this.store.transaction<RemoteRequestState>(
      REMOTE_REQUEST_STATE_RECORD,
      { requests: {}, nonces: {} },
      (state) => {
        const existing = state.requests[requestId];
        if (existing) {
          if (existing.payloadDigest !== payloadDigest) {
            throw new HarnessError(
              'REQUEST_PAYLOAD_CONFLICT',
              `Request "${requestId}" was already consumed with a different signed payload`,
            );
          }
          const phase = existing.phase ?? 'admission';
          const inProgress =
            phase !== 'settled' && phase !== 'denied' && !existing.denial;
          const liveOwner =
            inProgress &&
            ownerIsAlive(existing.ownerPid, existing.ownerBootId, ownerBootId);
          if (inProgress && !liveOwner) {
            existing.ownerPid = ownerPid;
            existing.ownerBootId = ownerBootId;
          }
          outcome = {
            replay: true,
            receiptName: existing.receiptName,
            denial: existing.denial,
            ownerAlive: liveOwner,
            phase,
            status: existing.status,
          };
          return state;
        }
        const nonceOwner = state.nonces[nonce];
        if (nonceOwner && nonceOwner !== requestId) {
          throw new HarnessError(
            'NONCE_REPLAY',
            `Nonce was already consumed by request "${nonceOwner}"`,
          );
        }
        const activeOwners = Object.entries(state.requests).filter(
          ([otherId, record]) =>
            otherId !== requestId &&
            record.attemptId === attemptId &&
            record.phase !== 'settled' &&
            record.phase !== 'denied' &&
            !record.denial,
        );
        const liveOwner = activeOwners.some(([, record]) =>
          ownerIsAlive(record.ownerPid, record.ownerBootId, ownerBootId),
        );
        if (liveOwner) {
          const denial = {
            code: 'ATTEMPT_ALREADY_ACTIVE',
            message: `Attempt "${attemptId}" already has a live request owner`,
          };
          state.nonces[nonce] = requestId;
          state.requests[requestId] = {
            nonce,
            payloadDigest,
            attemptId,
            generation,
            acceptedAt: Date.now(),
            status: 'denied',
            phase: 'denied',
            receiptName: acceptedReceiptName,
            ownerPid,
            ownerBootId,
            denial,
          };
          outcome = { replay: true, denial, phase: 'denied' };
          return state;
        }
        if (activeOwners.length > 0) {
          for (const record of Object.values(state.requests)) {
            if (
              record.attemptId === attemptId &&
              record.phase !== 'settled' &&
              record.phase !== 'denied' &&
              !record.denial
            ) {
              record.ownerPid = ownerPid;
              record.ownerBootId = ownerBootId;
            }
          }
        }
        state.nonces[nonce] = requestId;
        state.requests[requestId] = {
          nonce,
          payloadDigest,
          attemptId,
          generation,
          acceptedAt: Date.now(),
          status: 'accepted',
          phase: 'admission',
          receiptName: acceptedReceiptName,
          ownerPid,
          ownerBootId,
        };
        return state;
      },
    );

    return outcome;
  }

  private async assertRequestNotDenied(requestId: string): Promise<void> {
    const state = await this.store.read<RemoteRequestState>(
      REMOTE_REQUEST_STATE_RECORD,
      { requests: {}, nonces: {} },
    );
    const request = state.requests[requestId];
    if (!request) {
      throw new HarnessError(
        'REQUEST_STATE_MISSING',
        `Request "${requestId}" was not consumed`,
      );
    }
    if (request.status === 'denied' || request.denial) {
      throw new HarnessError(
        request.denial?.code ?? 'REQUEST_ADMISSION_INTERRUPTED',
        request.denial?.message ?? 'Remote request was denied before launch',
      );
    }
  }
  private async markRequestDenied(
    requestId: string,
    code: string,
    message: string,
  ): Promise<void> {
    await this.store.transaction<RemoteRequestState>(
      REMOTE_REQUEST_STATE_RECORD,
      { requests: {}, nonces: {} },
      (state) => {
        const existing = state.requests[requestId];
        if (!existing) return state;
        existing.status = 'denied';
        existing.phase = 'denied';
        existing.denial = { code, message };
        return state;
      },
    );
  }

  private async markRequestReceipt(
    requestId: string,
    receiptName: string,
    status: RemoteRequestRecord['status'],
  ): Promise<void> {
    await this.store.transaction<RemoteRequestState>(
      REMOTE_REQUEST_STATE_RECORD,
      { requests: {}, nonces: {} },
      (state) => {
        const existing = state.requests[requestId];
        if (!existing) {
          throw new HarnessError(
            'REQUEST_STATE_MISSING',
            `Request "${requestId}" was not consumed`,
          );
        }
        if (existing.status === 'denied' || existing.denial) {
          throw new HarnessError(
            existing.denial?.code ?? 'REQUEST_ADMISSION_INTERRUPTED',
            existing.denial?.message ??
              'Remote request was denied before launch',
          );
        }
        existing.receiptName = receiptName;
        existing.status = status;
        existing.phase =
          status === 'running' || status === 'accepted' ? 'launch' : 'settled';
        return state;
      },
    );
  }

  private async consumeControl(
    requestId: string,
    nonce: string,
    payloadDigest: string,
    attemptId: string,
    ownerBootId: string,
    ownerPid: number,
  ): Promise<{
    replay: boolean;
    receiptName?: string;
    denial?: { code: string; message: string };
    ownerAlive?: boolean;
    phase?: RemoteControlRecord['phase'];
  }> {
    let outcome: {
      replay: boolean;
      receiptName?: string;
      denial?: { code: string; message: string };
      ownerAlive?: boolean;
      phase?: RemoteControlRecord['phase'];
    } = { replay: false };

    await this.store.transaction<RemoteControlState>(
      REMOTE_CONTROL_STATE_RECORD,
      { requests: {}, nonces: {} },
      (state) => {
        const existing = state.requests[requestId];
        if (existing) {
          if (existing.payloadDigest !== payloadDigest) {
            throw new HarnessError(
              'CONTROL_PAYLOAD_CONFLICT',
              `Control request "${requestId}" was already consumed with a different signed payload`,
            );
          }
          const inProgress =
            existing.phase === 'claimed' || existing.phase === 'executing';
          const liveOwner =
            inProgress &&
            ownerIsAlive(existing.ownerPid, existing.ownerBootId, ownerBootId);
          if (inProgress && !liveOwner) {
            existing.ownerPid = ownerPid;
            existing.ownerBootId = ownerBootId;
            existing.phase = 'claimed';
          }
          outcome = {
            replay: true,
            receiptName: existing.receiptName,
            denial: existing.denial,
            ownerAlive: liveOwner,
            phase: existing.phase,
          };
          return state;
        }
        const nonceOwner = state.nonces[nonce];
        if (nonceOwner && nonceOwner !== requestId) {
          throw new HarnessError(
            'NONCE_REPLAY',
            `Control nonce was already consumed by request "${nonceOwner}"`,
          );
        }
        const activeControls = Object.entries(state.requests).filter(
          ([otherId, record]) =>
            otherId !== requestId &&
            record.attemptId === attemptId &&
            (record.phase === 'claimed' || record.phase === 'executing'),
        );
        const liveControl = activeControls.some(([, record]) =>
          ownerIsAlive(record.ownerPid, record.ownerBootId, ownerBootId),
        );
        if (liveControl) {
          const denial = {
            code: 'CONTROL_ALREADY_ACTIVE',
            message: `Attempt "${attemptId}" already has a live control owner`,
          };
          state.nonces[nonce] = requestId;
          state.requests[requestId] = {
            nonce,
            payloadDigest,
            attemptId,
            phase: 'denied',
            ownerPid,
            ownerBootId,
            denial,
          };
          outcome = { replay: true, denial, phase: 'denied' };
          return state;
        }
        for (const record of Object.values(state.requests)) {
          if (
            record.attemptId === attemptId &&
            (record.phase === 'claimed' || record.phase === 'executing')
          ) {
            record.ownerPid = ownerPid;
            record.ownerBootId = ownerBootId;
          }
        }
        state.nonces[nonce] = requestId;
        state.requests[requestId] = {
          nonce,
          payloadDigest,
          attemptId,
          phase: 'claimed',
          ownerPid,
          ownerBootId,
        };
        return state;
      },
    );

    return outcome;
  }

  private async markControlDenied(
    requestId: string,
    code: string,
    message: string,
  ): Promise<void> {
    await this.store.transaction<RemoteControlState>(
      REMOTE_CONTROL_STATE_RECORD,
      { requests: {}, nonces: {} },
      (state) => {
        const existing = state.requests[requestId];
        if (!existing) return state;
        existing.denial = { code, message };
        existing.phase = 'denied';
        return state;
      },
    );
  }

  private async markControlExecuting(requestId: string): Promise<void> {
    await this.store.transaction<RemoteControlState>(
      REMOTE_CONTROL_STATE_RECORD,
      { requests: {}, nonces: {} },
      (state) => {
        const existing = state.requests[requestId];
        if (!existing || existing.phase !== 'claimed') {
          throw new HarnessError(
            'CONTROL_STATE_CONFLICT',
            `Control "${requestId}" is not the unique claimed action`,
          );
        }
        existing.phase = 'executing';
        return state;
      },
    );
  }

  private async markControlReceipt(
    requestId: string,
    receiptName: string,
  ): Promise<void> {
    await this.store.transaction<RemoteControlState>(
      REMOTE_CONTROL_STATE_RECORD,
      { requests: {}, nonces: {} },
      (state) => {
        const existing = state.requests[requestId];
        if (!existing) {
          throw new HarnessError(
            'CONTROL_STATE_MISSING',
            `Control "${requestId}" was not consumed`,
          );
        }
        existing.receiptName = receiptName;
        existing.phase = 'settled';
        return state;
      },
    );
  }

  private async persistReceipt(receipt: SignedWorkerReceipt): Promise<void> {
    const parsed = SignedWorkerReceiptSchema.parse(receipt);
    await this.store.createImmutable(remoteReceiptName(parsed), parsed);
  }

  private async loadPersistedReceipt(
    name: string | undefined,
  ): Promise<SignedWorkerReceipt> {
    if (!name) {
      throw new HarnessError(
        'RECEIPT_STATE_INCOMPLETE',
        'Request was consumed but no durable receipt was recorded yet; retry the bounded worker step',
      );
    }
    const raw = await this.store.read<unknown>(name, null);
    if (raw === null) {
      throw new HarnessError(
        'RECEIPT_NOT_FOUND',
        `Durable receipt "${name}" is missing`,
      );
    }
    return SignedWorkerReceiptSchema.parse(raw);
  }

  private async recordPolicyRejection(reasonCode: string): Promise<void> {
    await this.store.transaction(
      POLICY_REJECTIONS_RECORD,
      {},
      (state: Record<string, number>) => {
        state[reasonCode] = (state[reasonCode] ?? 0) + 1;
        return state;
      },
    );
  }
}

export interface LocalHostIdentity {
  hostId: string | null;
  runtime: FleetRuntimeConfig | null;
  reasonCodes: string[];
}

type LocalHostSyncResolution =
  | { status: 'resolved'; host: FleetHost }
  | { status: 'unidentified' }
  | { status: 'ambiguous' };

function publicDerFromPrivate(privateKey: crypto.KeyObject): Buffer {
  return crypto
    .createPublicKey(privateKey)
    .export({ type: 'spki', format: 'der' }) as Buffer;
}

function publicDerFromConfigured(configuredPublicKey: string): Buffer {
  return loadPublicKey(configuredPublicKey).export({
    type: 'spki',
    format: 'der',
  }) as Buffer;
}

function resolveAuthenticatedLocalHostSync(
  config: FleetConfig,
): LocalHostSyncResolution {
  const matches: FleetHost[] = [];
  for (const host of config.hosts) {
    try {
      const pem = fs.readFileSync(host.signingKeyFile, 'utf8');
      const derived = publicDerFromPrivate(loadPrivateKey(pem));
      if (derived.equals(publicDerFromConfigured(host.workerPublicKey))) {
        matches.push(host);
      }
    } catch {
      // Not this host: absent/unreadable/invalid key material is not fatal.
    }
  }
  if (matches.length === 1) return { status: 'resolved', host: matches[0] };
  if (matches.length === 0) return { status: 'unidentified' };
  return { status: 'ambiguous' };
}

/**
 * Authenticated local host identity by signing-key custody.
 * Never derives identity from array order, display labels, or shared stateDir layouts.
 */
export async function resolveAuthenticatedLocalHost(
  config: FleetConfig,
): Promise<LocalHostIdentity> {
  const resolution = resolveAuthenticatedLocalHostSync(config);
  if (resolution.status === 'resolved') {
    return {
      hostId: resolution.host.serverId,
      runtime: resolveHostRuntime(config, resolution.host.serverId),
      reasonCodes: [],
    };
  }
  return {
    hostId: null,
    runtime: null,
    reasonCodes: [
      resolution.status === 'ambiguous'
        ? 'AMBIGUOUS_LOCAL_HOST'
        : 'LOCAL_HOST_UNIDENTIFIED',
    ],
  };
}

function attemptContext(
  stateDir: string,
  attempt: Attempt,
  role: ExecutionContext['role'],
): ExecutionContext {
  return {
    attemptId: attempt.id,
    generation: attempt.generation,
    role,
    deadline: attempt.deadline,
    runtimeDigest: attempt.binding.runtimeDigest,
    stateDir,
  };
}

function stageWorkspaceRoots(
  stateDir: string,
  attempt: Attempt,
): StageWorkspaces {
  const suffix = `${attempt.id}-${attempt.generation}`;
  return {
    snapshot: path.join(stateDir, `temp-snapshot-${suffix}`),
    deliverable: path.join(stateDir, `temp-deliverable-${suffix}`),
    evaluation: path.join(stateDir, `temp-eval-${suffix}`),
  };
}

function stageReceiptName(attempt: Attempt): string {
  return `stage-${attempt.id}-${attempt.generation}`;
}

function outcomeRecordName(attempt: Attempt): string {
  return `outcome-${attempt.id}-${attempt.generation}`;
}
function stageInputBundleName(attempt: Attempt): string {
  return `stage-input-${attempt.id}-${attempt.generation}`;
}
function remoteInputBundleName(attempt: Attempt): string {
  return `remote-input-bundle-${attempt.id}-${attempt.generation}`;
}

function artifactRootFor(stateDir: string, attempt: Attempt): string {
  return path.join(
    stateDir,
    ARTIFACTS_DIRNAME,
    `${attempt.id}-${attempt.generation}`,
  );
}

function remoteReceiptName(receipt: SignedWorkerReceipt): string {
  return `receipt-${receipt.payload.attemptId}-${receipt.payload.generation}-${canonicalDigest(receipt)}`;
}

function isInside(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return (
    relative.length > 0 &&
    !relative.startsWith('..') &&
    !path.isAbsolute(relative)
  );
}

function sha256Text(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

async function sha256File(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
}

function isAbsoluteForAnyPlatform(value: string): boolean {
  return (
    value.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.startsWith('\\\\')
  );
}
function sameRemotePath(left: string, right: string): boolean {
  const parsedLeft = parseRemotePath(left);
  const parsedRight = parseRemotePath(right);
  if (
    parsedLeft.flavor !== parsedRight.flavor ||
    parsedLeft.volume !== parsedRight.volume ||
    parsedLeft.segments.some((segment) => segment === '..') ||
    parsedRight.segments.some((segment) => segment === '..') ||
    parsedLeft.segments.length !== parsedRight.segments.length
  ) {
    return false;
  }
  const normalize =
    parsedLeft.flavor === 'windows'
      ? (segment: string) => segment.toLowerCase()
      : (segment: string) => segment;
  return parsedLeft.segments.every(
    (segment, index) =>
      normalize(segment) === normalize(parsedRight.segments[index]!),
  );
}

function parseRemotePath(value: string): {
  flavor: 'posix' | 'windows';
  volume: string;
  segments: string[];
} {
  const drive = /^([A-Za-z]:)[\\/]/.exec(value);
  if (drive) {
    return {
      flavor: 'windows',
      volume: drive[1].toLowerCase(),
      segments: value
        .slice(drive[0].length)
        .split(/[\\/]+/)
        .filter(Boolean),
    };
  }
  const unc = /^(?:\\\\|\/\/)([^\\/]+)[\\/]+([^\\/]+)(?:[\\/]+|$)/.exec(value);
  if (unc) {
    return {
      flavor: 'windows',
      volume: `//${unc[1].toLowerCase()}/${unc[2].toLowerCase()}`,
      segments: value
        .slice(unc[0].length)
        .split(/[\\/]+/)
        .filter(Boolean),
    };
  }
  if (value.startsWith('\\\\')) {
    return { flavor: 'windows', volume: 'invalid-unc', segments: [] };
  }
  if (value.startsWith('/')) {
    return {
      flavor: 'posix',
      volume: '/',
      segments: value.slice(1).split('/').filter(Boolean),
    };
  }
  return { flavor: 'posix', volume: '', segments: [] };
}

function reasonCodeOf(err: unknown, fallback: string): string {
  if (err instanceof HarnessError) {
    return err.code;
  }
  if (err instanceof Error) {
    const match = /^([A-Z][A-Z0-9_]{2,}):/.exec(err.message);
    if (match) {
      return match[1];
    }
  }
  return fallback;
}

function isCapacityError(err: unknown): boolean {
  if (!(err instanceof HarnessError)) return false;
  return (
    err.code === 'BUDGET_EXHAUSTED' ||
    err.code === 'TOOL_CALL_BUDGET_EXHAUSTED' ||
    err.code === 'CONCURRENCY_LIMIT_EXCEEDED'
  );
}

/**
 * Only a completed evaluator run (passed true or false) may feed proposer/composer/probe
 * selection. Execution faults abort the campaign after their accounting is settled.
 */
function assertVerifierOutcome(outcome: StageOutcome): void {
  if (outcome.result.status !== 'completed') {
    throw (
      outcome.fatal ??
      new HarnessError(
        'STAGE_EXECUTION_FAILED',
        `Stage ended in status "${outcome.result.status}" without verified evaluator evidence`,
      )
    );
  }
}

function assertOmpResultIdentity(
  result: {
    attemptId: string;
    generation: number;
    role: ExecutionContext['role'];
    runtimeDigest: string;
  },
  attempt: Attempt,
  role: ExecutionContext['role'],
): void {
  if (
    result.attemptId !== attempt.id ||
    result.generation !== attempt.generation
  ) {
    throw new HarnessError(
      'OMP_RESULT_IDENTITY_MISMATCH',
      'Restricted OMP result identity does not match the admitted attempt',
    );
  }
  if (result.role !== role) {
    throw new HarnessError(
      'OMP_RESULT_ROLE_MISMATCH',
      'Restricted OMP result role does not match the stage role',
    );
  }
  if (result.runtimeDigest !== attempt.binding.runtimeDigest) {
    throw new HarnessError(
      'OMP_RESULT_RUNTIME_MISMATCH',
      'Restricted OMP result runtime digest does not match the admitted runtime binding',
    );
  }
}

function assertCandidateMetadataUnchanged(
  input: HarnessBundle,
  output: HarnessBundle,
): void {
  if (canonicalJSON(input.scope) !== canonicalJSON(output.scope)) {
    throw new HarnessError(
      'CANDIDATE_SCOPE_MUTATED',
      'Candidate output must not change the bundle scope',
    );
  }
  if (canonicalJSON(input.platforms) !== canonicalJSON(output.platforms)) {
    throw new HarnessError(
      'CANDIDATE_SCOPE_MUTATED',
      'Candidate output must not change bundle platform compatibility',
    );
  }
  if (canonicalJSON(input.ompVersions) !== canonicalJSON(output.ompVersions)) {
    throw new HarnessError(
      'CANDIDATE_SCOPE_MUTATED',
      'Candidate output must not change OMP version compatibility',
    );
  }
}

function isHeldoutBinding(binding: ExecutionBinding): boolean {
  return binding.phase === 'heldout' && binding.stage === 'evaluation';
}

function bindingForStage(
  base: ExecutionBinding,
  task: FleetTask,
  resolved: ResolvedPolicyContext,
): ExecutionBinding {
  return {
    ...base,
    taskDigest: canonicalDigest(task),
    domain: resolved.domain,
    accountId: resolved.account.id,
    provider: resolved.account.provider,
    model: resolved.account.model,
    sourceRevision: task.sourceRef,
    evaluatorDigest: canonicalDigest(task.verification),
  };
}

function buildHeldoutBinding(input: {
  entry: FrozenEvaluationPlan['cases'][number];
  role: 'baseline' | 'candidate';
  context: TaskExecutionContext;
  planDigest: string;
  runId: string;
  budgetId: string;
  harnessDigest: string;
}): ExecutionBinding {
  const { entry, context, planDigest, runId, budgetId, harnessDigest } = input;
  return {
    runId,
    budgetId,
    taskDigest: entry.taskDigest,
    hostId: entry.hostId,
    projectId: entry.projectId,
    logicalProjectId: entry.logicalProjectId,
    domain: context.resolved.domain,
    accountId: entry.accountId,
    provider: context.resolved.account.provider,
    model: context.resolved.account.model,
    sourceRevision: entry.sourceRevision,
    harnessDigest,
    evaluatorDigest: entry.evaluatorDigest,
    runtimeDigest: entry.runtimeDigest,
    policyDigest: context.resolved.policyDigest,
    phase: 'heldout',
    stage: 'evaluation',
    planDigest,
  };
}

function requireRemoteOutputBundle(
  receipt: SignedWorkerReceipt,
  inputBundle: HarnessBundle,
): HarnessBundle {
  const output = receipt.payload.outputBundle;
  if (!output) {
    throw new HarnessError(
      'REMOTE_OUTPUT_BUNDLE_MISSING',
      'Completed remote proposal/compose receipt must carry the bounded output bundle',
    );
  }
  const parsed = HarnessBundleSchema.parse(output);
  assertCandidateMetadataUnchanged(inputBundle, parsed);
  return parsed;
}

function assertProofContext(
  proof: RoleStopProof,
  context: ExecutionContext,
): void {
  if (proof.context.attemptId !== context.attemptId) {
    throw new HarnessError(
      'STOP_PROOF_MISMATCH',
      'Stop proof attempt identity mismatch',
    );
  }
  if (proof.context.generation !== context.generation) {
    throw new HarnessError(
      'STOP_PROOF_MISMATCH',
      'Stop proof generation mismatch',
    );
  }
  if (proof.context.role !== context.role) {
    throw new HarnessError('STOP_PROOF_MISMATCH', 'Stop proof role mismatch');
  }
  if (proof.context.runtimeDigest !== context.runtimeDigest) {
    throw new HarnessError(
      'STOP_PROOF_MISMATCH',
      'Stop proof runtime digest mismatch',
    );
  }
}

function assertModelWorkerProof(
  proof: ModelWorkerProof,
  attempt: Attempt,
  bootId: string,
): void {
  if (
    proof.attemptId !== attempt.id ||
    proof.generation !== attempt.generation
  ) {
    throw new HarnessError(
      'MODEL_WORKER_PROOF_MISMATCH',
      'Model-worker proof identity mismatch',
    );
  }
  if (proof.role !== 'task') {
    throw new HarnessError(
      'MODEL_WORKER_PROOF_MISMATCH',
      'Model-worker proof role must be "task"',
    );
  }
  if (proof.runtimeDigest !== attempt.binding.runtimeDigest) {
    throw new HarnessError(
      'MODEL_WORKER_PROOF_MISMATCH',
      'Model-worker proof runtime digest mismatch',
    );
  }
  if (proof.workerBootId !== bootId) {
    throw new HarnessError(
      'MODEL_WORKER_PROOF_MISMATCH',
      'Model-worker proof boot identity mismatch',
    );
  }
}

function aggregateProofTermination(
  attempt: Attempt,
  bootId: string,
  proofs: RoleStopProof[],
): TerminationEvidence {
  const containerIds = new Set<string>();
  let observedAt = 0;
  for (const proof of proofs) {
    for (const containerId of proof.termination.containerIds) {
      containerIds.add(containerId);
    }
    observedAt = Math.max(observedAt, proof.termination.observedAt);
  }
  return {
    attemptId: attempt.id,
    generation: attempt.generation,
    confirmed: true,
    observedAt: observedAt > 0 ? observedAt : Date.now(),
    containerIds: [...containerIds],
    workerBootId: bootId,
  };
}

function authorityMatches(
  recorded: { canonicalRootPath: string; stackIds: string[] } | undefined,
  actual: ProjectAuthority | undefined,
): boolean {
  if (!recorded || !actual) return false;
  if (recorded.canonicalRootPath !== actual.canonicalRootPath) return false;
  const left = [...recorded.stackIds].sort();
  const right = [...actual.stackIds].sort();
  return canonicalJSON(left) === canonicalJSON(right);
}

async function readJsonBoundedSafe(filePath: string): Promise<unknown | null> {
  try {
    const stat = await fs.lstat(filePath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) {
      return null;
    }
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

async function readRuntimeStateReceipt(
  context: ExecutionContext,
): Promise<RuntimeStateReceipt | null> {
  const raw = await readJsonBoundedSafe(getRuntimeStateReceiptPath(context));
  if (raw === null) return null;
  const parsed = RuntimeStateReceiptSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function readTerminationReceiptFile(
  context: ExecutionContext,
): Promise<TerminationEvidence | null> {
  const raw = await readJsonBoundedSafe(getTerminationReceiptPath(context));
  if (raw === null) return null;
  const parsed = TerminationEvidenceSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function readWorkerCompletion(
  context: ExecutionContext,
): Promise<WorkerCompletionReceipt | null> {
  const raw = await readJsonBoundedSafe(
    getWorkerCompletionReceiptPath(context),
  );
  if (raw === null) return null;
  const parsed = WorkerCompletionReceiptSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function readWorkerTermination(
  context: ExecutionContext,
): Promise<WorkerTerminationReceipt | null> {
  const raw = await readJsonBoundedSafe(
    getWorkerTerminationReceiptPath(context),
  );
  if (raw === null) return null;
  const parsed = WorkerTerminationReceiptSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Durable owned model-worker outcome for the task role. A completion receipt takes
 * precedence; otherwise an authoritative termination receipt is used.
 */
async function readModelWorkerProof(
  stateDir: string,
  attempt: Attempt,
  bootId: string,
): Promise<ModelWorkerProof | null> {
  const context = attemptContext(stateDir, attempt, 'task');
  const completion = await readWorkerCompletion(context);
  if (completion) {
    if (
      completion.attemptId !== attempt.id ||
      completion.generation !== attempt.generation ||
      completion.runtimeDigest !== attempt.binding.runtimeDigest ||
      completion.workerBootId !== bootId
    ) {
      return null;
    }
    return {
      kind: 'completion',
      digest: canonicalDigest(completion),
      attemptId: completion.attemptId,
      generation: completion.generation,
      role: 'task',
      runtimeDigest: completion.runtimeDigest,
      workerBootId: completion.workerBootId,
      exitCode: completion.exitCode,
      confirmed: true,
    };
  }
  const termination = await readWorkerTermination(context);
  if (termination) {
    if (
      termination.attemptId !== attempt.id ||
      termination.generation !== attempt.generation ||
      termination.runtimeDigest !== attempt.binding.runtimeDigest ||
      termination.workerBootId !== bootId
    ) {
      return null;
    }
    return {
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
  return null;
}

function planCaseSummaries(
  plan: FrozenEvaluationPlan,
): FleetEvaluationCaseSummary[] {
  return plan.cases.map((entry) => ({
    caseId: entry.id,
    taskDigest: entry.taskDigest,
    hostId: entry.hostId,
    projectId: entry.projectId,
    logicalProjectId: entry.logicalProjectId,
    baselineAttemptId: entry.baselineAttemptId,
    candidateAttemptId: entry.candidateAttemptId,
  }));
}

function buildStageTask(task: FleetTask, prompt: string): FleetTask {
  return { ...task, prompt };
}

function parseEvaluationInput(raw: unknown): EvaluationInputRecord {
  const schema = z
    .object({
      schemaVersion: z.literal(1),
      planDigest: z.string().min(1),
      releaseDigest: z.string().min(1),
      tasks: z.array(z.unknown()).min(1),
      runId: z.string().min(1),
      budgetId: z.string().min(1),
    })
    .strict();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HarnessError(
      'PLAN_INPUT_INVALID',
      'Persisted evaluation input failed strict validation',
    );
  }
  return {
    schemaVersion: 1,
    planDigest: parsed.data.planDigest,
    releaseDigest: parsed.data.releaseDigest,
    tasks: parsed.data.tasks.map((entry) => parseFleetTask(entry)),
    runId: parsed.data.runId,
    budgetId: parsed.data.budgetId,
  };
}
