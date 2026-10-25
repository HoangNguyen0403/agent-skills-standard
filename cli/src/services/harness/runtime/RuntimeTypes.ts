import crypto from 'crypto';
import path from 'path';
import { z } from 'zod';
import { HarnessError } from '../HarnessSetupService';

export { HarnessError };

/**
 * Deterministically serializes a value into canonical JSON.
 * - Object keys are sorted lexicographically (Unicode code point order).
 * - Arrays preserve element order and reject holes or undefined entries.
 * - Primitive types (string, boolean, null) follow standard JSON encoding.
 * - Numbers must be finite; non-finite numbers (NaN, Infinity, -Infinity) throw.
 * - BigInt, symbols, functions, and undefined values are rejected.
 * - Non-plain objects (e.g. Map, Set, Promise) are rejected.
 */
export function canonicalJSON(val: unknown): string {
  if (val === null) {
    return 'null';
  }

  const type = typeof val;

  if (type === 'boolean') {
    return val ? 'true' : 'false';
  }

  if (type === 'number') {
    if (!Number.isFinite(val)) {
      throw new HarnessError(
        'CANONICAL_JSON_ERROR',
        `Non-finite number cannot be serialized to canonical JSON: ${String(val)}`,
      );
    }
    return JSON.stringify(val);
  }

  if (type === 'string') {
    return JSON.stringify(val);
  }

  if (
    type === 'bigint' ||
    type === 'symbol' ||
    type === 'function' ||
    val === undefined
  ) {
    throw new HarnessError(
      'CANONICAL_JSON_ERROR',
      `Unsupported type cannot be serialized to canonical JSON: ${type}`,
    );
  }

  if (Array.isArray(val)) {
    const len = val.length;
    const items: string[] = [];
    for (let i = 0; i < len; i++) {
      if (!(i in val) || val[i] === undefined) {
        throw new HarnessError(
          'CANONICAL_JSON_ERROR',
          'Array cannot contain holes or undefined values in canonical JSON',
        );
      }
      items.push(canonicalJSON(val[i]));
    }
    return `[${items.join(',')}]`;
  }

  if (type === 'object') {
    const proto = Object.getPrototypeOf(val);
    if (proto !== Object.prototype && proto !== null) {
      throw new HarnessError(
        'CANONICAL_JSON_ERROR',
        `Non-plain object cannot be serialized to canonical JSON: ${val.constructor?.name ?? 'unknown'}`,
      );
    }

    if (Object.getOwnPropertySymbols(val).length > 0) {
      throw new HarnessError(
        'CANONICAL_JSON_ERROR',
        'Objects with symbol-keyed properties cannot be serialized to canonical JSON',
      );
    }

    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const pairs: string[] = [];

    for (const key of keys) {
      const v = obj[key];
      if (v === undefined) {
        throw new HarnessError(
          'CANONICAL_JSON_ERROR',
          `Object property "${key}" cannot have undefined value in canonical JSON`,
        );
      }
      pairs.push(`${JSON.stringify(key)}:${canonicalJSON(v)}`);
    }

    return `{${pairs.join(',')}}`;
  }

  throw new HarnessError(
    'CANONICAL_JSON_ERROR',
    `Unrecognized type cannot be serialized to canonical JSON: ${type}`,
  );
}

/**
 * Computes the SHA-256 hex digest of a value serialized via canonical JSON.
 */
export function canonicalDigest(value: unknown): string {
  return crypto
    .createHash('sha256')
    .update(canonicalJSON(value), 'utf8')
    .digest('hex');
}

const ED25519_SPKI_HEADER = Buffer.from('302a300506032b6570032100', 'hex');
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+={0,2}$/;

function decodeCanonicalBase64(value: string): Buffer | null {
  if (BASE64_RE.test(value)) {
    const buf = Buffer.from(value, 'base64');
    return buf.toString('base64') === value ? buf : null;
  }
  if (BASE64URL_RE.test(value)) {
    const buf = Buffer.from(value, 'base64url');
    return buf.toString('base64url') === value ? buf : null;
  }
  return null;
}

/**
 * Normalizes an accepted Ed25519 public key encoding to canonical raw 32-byte hex.
 * Accepts canonical raw base64/base64url, 44-byte SPKI DER base64/base64url, or PEM.
 * Returns null when the input is not a genuine Ed25519 public key.
 */
export function normalizeEd25519PublicKey(keyStr: string): string | null {
  if (typeof keyStr !== 'string' || keyStr.trim().length === 0) {
    return null;
  }
  try {
    let key: crypto.KeyObject;
    if (keyStr.startsWith('-----BEGIN PUBLIC KEY-----')) {
      key = crypto.createPublicKey(keyStr);
    } else {
      const buf = decodeCanonicalBase64(keyStr);
      if (buf === null) {
        return null;
      }
      if (buf.length === 32) {
        key = crypto.createPublicKey({
          key: Buffer.concat([ED25519_SPKI_HEADER, buf]),
          format: 'der',
          type: 'spki',
        });
      } else if (buf.length === ED25519_SPKI_HEADER.length + 32) {
        key = crypto.createPublicKey({ key: buf, format: 'der', type: 'spki' });
      } else {
        return null;
      }
    }
    if (key.asymmetricKeyType !== 'ed25519') {
      return null;
    }
    const der = key.export({ format: 'der', type: 'spki' });
    if (
      der.length !== ED25519_SPKI_HEADER.length + 32 ||
      !der.subarray(0, ED25519_SPKI_HEADER.length).equals(ED25519_SPKI_HEADER)
    ) {
      return null;
    }
    return der.subarray(ED25519_SPKI_HEADER.length).toString('hex');
  } catch {
    return null;
  }
}

/**
 * Validates whether a public key string is a genuine Ed25519 public key.
 * Accepts raw 32-byte base64/base64url, 44-byte SPKI DER base64, or PEM format.
 */
export function isEd25519PublicKey(keyStr: string): boolean {
  return normalizeEd25519PublicKey(keyStr) !== null;
}

const MAX_ID_LENGTH = 256;
const MAX_PATH_LENGTH = 4096;
const MAX_INSTRUCTION_LENGTH = 200_000;
const MAX_FILE_CONTENT_LENGTH = 200_000;
const MAX_ENVIRONMENT_KEYS = 64;
const MAX_ENDPOINTS = 32;
const MAX_COLLECTION_ENTRIES = 256;
const MAX_VERIFICATION_FILES = 256;
const MAX_VERIFICATION_ARGV = 64;

/**
 * Helper to ensure a path string is absolute and non-empty.
 */
const absolutePathSchema = z
  .string()
  .min(1)
  .max(MAX_PATH_LENGTH)
  .refine((p) => path.posix.isAbsolute(p) || path.win32.isAbsolute(p), {
    message: 'Path must be absolute under POSIX or Windows syntax',
  });

const boundedIdSchema = z.string().min(1).max(MAX_ID_LENGTH);
const digestSchema = z.string().min(1).max(MAX_ID_LENGTH);
const timestampSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
const positiveSafeIntSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
const nonNegativeSafeIntSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);

/**
 * Strict schema for FleetConfig runtime closure.
 */
export const FleetRuntimeConfigSchema = z
  .object({
    nodeCommand: absolutePathSchema,
    bunCommand: absolutePathSchema,
    sdkModule: absolutePathSchema,
    dockerCommand: absolutePathSchema,
    image: z.string().min(1).max(MAX_PATH_LENGTH),
    ompVersion: boundedIdSchema,
    sdkDigest: digestSchema,
    gitCommand: absolutePathSchema,
    manifestFile: absolutePathSchema,
    manifestDigest: digestSchema,
  })
  .strict();

export type FleetRuntimeConfig = z.infer<typeof FleetRuntimeConfigSchema>;

/**
 * Strict schema for FleetConfig accounts.
 */
export const FleetAccountSchema = z
  .object({
    id: boundedIdSchema,
    provider: boundedIdSchema,
    model: boundedIdSchema,
    thinking: z.string().max(MAX_ID_LENGTH),
    authFile: absolutePathSchema.optional(),
    environmentKeys: z.array(boundedIdSchema).max(MAX_ENVIRONMENT_KEYS),
    allowedDomains: z.array(boundedIdSchema).max(MAX_COLLECTION_ENTRIES),
    allowedProviderEndpoints: z
      .array(
        z
          .string()
          .min(1)
          .max(MAX_PATH_LENGTH)
          .refine(
            (u) => {
              try {
                const p = new URL(u);
                return p.protocol === 'http:' || p.protocol === 'https:';
              } catch {
                return false;
              }
            },
            { message: 'Endpoint must be a valid HTTP or HTTPS URL' },
          ),
      )
      .min(1)
      .max(MAX_ENDPOINTS),
  })
  .strict();

export type FleetAccount = z.infer<typeof FleetAccountSchema>;

/**
 * Strict schema for independent domain mappings.
 */
export const FleetDomainSchema = z
  .object({
    id: boundedIdSchema,
    hostIds: z.array(boundedIdSchema).min(1).max(MAX_COLLECTION_ENTRIES),
    pathPrefixes: z
      .array(absolutePathSchema)
      .min(1)
      .max(MAX_COLLECTION_ENTRIES),
  })
  .strict();

export type FleetDomain = z.infer<typeof FleetDomainSchema>;

/**
 * Strict schema for stack mappings.
 */
export const FleetStackSchema = z
  .object({
    id: boundedIdSchema,
    hostIds: z.array(boundedIdSchema).min(1).max(MAX_COLLECTION_ENTRIES),
    pathPrefixes: z
      .array(absolutePathSchema)
      .min(1)
      .max(MAX_COLLECTION_ENTRIES),
  })
  .strict();

export type FleetStack = z.infer<typeof FleetStackSchema>;

/**
 * Strict schema for dispatch rules.
 */
export const FleetRuleSchema = z
  .object({
    id: boundedIdSchema,
    domain: boundedIdSchema,
    hostIds: z.array(boundedIdSchema).min(1).max(MAX_COLLECTION_ENTRIES),
    pathPrefixes: z
      .array(absolutePathSchema)
      .min(1)
      .max(MAX_COLLECTION_ENTRIES),
    accountId: boundedIdSchema,
    enabled: z.boolean(),
    allowModelData: z.boolean(),
  })
  .strict();

export type FleetRule = z.infer<typeof FleetRuleSchema>;

/**
 * Strict schema for project aliases across checkouts/hosts.
 * Domain and account declarations are mandatory so alias groups cannot bypass authority checks.
 */
export const FleetProjectAliasSchema = z
  .object({
    hostId: boundedIdSchema,
    projectId: boundedIdSchema,
    logicalProjectId: boundedIdSchema,
    domain: boundedIdSchema,
    accountId: boundedIdSchema,
  })
  .strict();

export type FleetProjectAlias = z.infer<typeof FleetProjectAliasSchema>;

/**
 * Strict schema for fleet execution limits.
 */
export const FleetLimitsSchema = z
  .object({
    maxConcurrent: positiveSafeIntSchema,
    maxAttempts: positiveSafeIntSchema,
    maxDurationMs: positiveSafeIntSchema,
    maxToolCalls: positiveSafeIntSchema,
    perHost: positiveSafeIntSchema,
    perProject: positiveSafeIntSchema,
    perAccount: positiveSafeIntSchema,
  })
  .strict();

export type FleetLimits = z.infer<typeof FleetLimitsSchema>;

/**
 * Strict schema for Ed25519 public keys.
 */
const ed25519KeySchema = z
  .string()
  .min(1)
  .max(MAX_PATH_LENGTH)
  .refine(isEd25519PublicKey, {
    message:
      'Public key must be a valid Ed25519 key (raw 32-byte or SPKI DER base64)',
  });

export const FleetApproverSchema = z
  .object({
    id: boundedIdSchema,
    publicKey: ed25519KeySchema,
  })
  .strict();

export type FleetApprover = z.infer<typeof FleetApproverSchema>;

export const FleetCoordinatorSchema = z
  .object({
    id: boundedIdSchema,
    publicKey: ed25519KeySchema,
  })
  .strict();

export type FleetCoordinator = z.infer<typeof FleetCoordinatorSchema>;

export const FleetHostSchema = z
  .object({
    serverId: boundedIdSchema,
    nodeCommand: absolutePathSchema,
    cliPath: absolutePathSchema,
    stateDir: absolutePathSchema,
    workspaceId: boundedIdSchema,
    workerPublicKey: ed25519KeySchema,
    signingKeyFile: absolutePathSchema,
    runtime: FleetRuntimeConfigSchema.optional(),
  })
  .strict();

export type FleetHost = z.infer<typeof FleetHostSchema>;

export const FleetEvaluationConfigSchema = z
  .object({
    minImprovement: z.number().finite().min(0).max(1),
    maxRegressions: nonNegativeSafeIntSchema,
  })
  .strict();

export type FleetEvaluationConfig = z.infer<typeof FleetEvaluationConfigSchema>;

/**
 * Strict top-level schema for FleetConfig.
 */
export const FleetConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    generation: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    runtime: FleetRuntimeConfigSchema,
    accounts: z.array(FleetAccountSchema).max(MAX_COLLECTION_ENTRIES),
    domains: z.array(FleetDomainSchema).max(MAX_COLLECTION_ENTRIES),
    stacks: z.array(FleetStackSchema).max(MAX_COLLECTION_ENTRIES).default([]),
    rules: z.array(FleetRuleSchema).max(MAX_COLLECTION_ENTRIES),
    projectAliases: z
      .array(FleetProjectAliasSchema)
      .max(MAX_COLLECTION_ENTRIES),
    limits: FleetLimitsSchema,
    approvers: z.array(FleetApproverSchema).max(MAX_COLLECTION_ENTRIES),
    coordinators: z.array(FleetCoordinatorSchema).max(MAX_COLLECTION_ENTRIES),
    hosts: z.array(FleetHostSchema).max(MAX_COLLECTION_ENTRIES),
    evaluation: FleetEvaluationConfigSchema,
  })
  .strict();

export type FleetConfig = z.infer<typeof FleetConfigSchema>;

/**
 * Strict schema for FleetProject.
 */
export const FleetProjectSchema = z
  .object({
    hostId: boundedIdSchema,
    projectId: boundedIdSchema,
    rootPath: absolutePathSchema,
    logicalProjectId: boundedIdSchema,
  })
  .strict();

export type FleetProject = z.infer<typeof FleetProjectSchema>;

/**
 * Strict schema for HarnessBundle.
 */
export const HarnessBundleSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: boundedIdSchema,
    scope: z
      .object({
        kind: z.enum(['project', 'domain', 'stack', 'fleet']),
        key: boundedIdSchema,
      })
      .strict(),
    guidance: z.string().max(MAX_INSTRUCTION_LENGTH),
    platforms: z.array(boundedIdSchema).max(MAX_COLLECTION_ENTRIES),
    ompVersions: z.array(boundedIdSchema).max(MAX_COLLECTION_ENTRIES),
  })
  .strict();

export type HarnessBundle = z.infer<typeof HarnessBundleSchema>;

/**
 * Strict schema for FleetTask.
 */
export const FleetTaskSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: boundedIdSchema,
    project: FleetProjectSchema,
    sourceRef: z.string().min(1).max(MAX_ID_LENGTH),
    prompt: z.string().min(1).max(MAX_INSTRUCTION_LENGTH),
    replaySafe: z.boolean(),
    phase: z.enum(['train', 'heldout']),
    deadlineMs: positiveSafeIntSchema,
    k: positiveSafeIntSchema,
    baseline: HarnessBundleSchema,
    verification: z
      .object({
        argv: z
          .array(z.string().min(1).max(MAX_PATH_LENGTH))
          .min(1)
          .max(MAX_VERIFICATION_ARGV),
        files: z
          .record(
            z.string().min(1).max(MAX_PATH_LENGTH),
            z.string().max(MAX_FILE_CONTENT_LENGTH),
          )
          .refine(
            (files) => Object.keys(files).length <= MAX_VERIFICATION_FILES,
            {
              message: `verification.files exceeds maximum of ${MAX_VERIFICATION_FILES} entries`,
            },
          ),
      })
      .strict(),
    toolCallAllowance: positiveSafeIntSchema,
  })
  .strict();

export type FleetTask = z.infer<typeof FleetTaskSchema>;

/**
 * Strict schema for ExecutionBinding.
 */
export const ExecutionBindingSchema = z
  .object({
    runId: boundedIdSchema,
    budgetId: boundedIdSchema,
    taskDigest: digestSchema,
    hostId: boundedIdSchema,
    projectId: boundedIdSchema,
    logicalProjectId: boundedIdSchema,
    domain: boundedIdSchema,
    accountId: boundedIdSchema,
    provider: boundedIdSchema,
    model: boundedIdSchema,
    sourceRevision: boundedIdSchema,
    harnessDigest: digestSchema,
    evaluatorDigest: digestSchema,
    runtimeDigest: digestSchema,
    policyDigest: digestSchema,
    phase: z.enum(['train', 'heldout']),
    stage: z.enum(['baseline', 'proposal', 'probe', 'compose', 'evaluation']),
    planDigest: digestSchema,
  })
  .strict();

export type ExecutionBinding = z.infer<typeof ExecutionBindingSchema>;

/**
 * Canonical project scope resolved by the executing host.
 */
export const ProjectAuthoritySchema = z
  .object({
    canonicalRootPath: absolutePathSchema,
    stackIds: z
      .array(boundedIdSchema)
      .max(MAX_COLLECTION_ENTRIES)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: 'Stack IDs must be unique',
      }),
  })
  .strict();

export type ProjectAuthority = z.infer<typeof ProjectAuthoritySchema>;

/**
 * Strict schema for the policy authority and limits frozen at budget creation.
 */
export const FrozenEpochLimitsSchema = z
  .object({
    maxAttempts: positiveSafeIntSchema,
    maxConcurrent: positiveSafeIntSchema,
    maxToolCalls: positiveSafeIntSchema,
    maxDurationMs: positiveSafeIntSchema,
    perHost: positiveSafeIntSchema,
    perProject: positiveSafeIntSchema,
    perAccount: positiveSafeIntSchema,
  })
  .strict();

export type FrozenEpochLimits = z.infer<typeof FrozenEpochLimitsSchema>;

/**
 * Strict schema for BudgetEpoch.
 * Persists immutable policy authority and frozen limits so later reconfiguration
 * can tighten but never widen an existing epoch.
 */
export const BudgetEpochSchema = z
  .object({
    id: boundedIdSchema,
    runId: boundedIdSchema,
    createdAt: timestampSchema,
    deadline: timestampSchema,
    maxAttempts: positiveSafeIntSchema,
    maxConcurrent: positiveSafeIntSchema,
    maxToolCalls: positiveSafeIntSchema,
    reservedAttempts: nonNegativeSafeIntSchema,
    reservedToolCalls: nonNegativeSafeIntSchema,
    policyDigest: digestSchema,
    policyGeneration: positiveSafeIntSchema,
    frozenLimits: FrozenEpochLimitsSchema,
  })
  .strict();

export type BudgetEpoch = z.infer<typeof BudgetEpochSchema>;

export type BudgetEpochRequest = Omit<
  BudgetEpoch,
  | 'reservedAttempts'
  | 'reservedToolCalls'
  | 'policyDigest'
  | 'policyGeneration'
  | 'frozenLimits'
>;

/**
 * Strict schema for ExecutionContext.
 */
export const ExecutionContextSchema = z
  .object({
    attemptId: z.string().uuid(),
    generation: positiveSafeIntSchema,
    role: z.enum(['task', 'evaluator']),
    deadline: timestampSchema,
    runtimeDigest: digestSchema,
    stateDir: absolutePathSchema,
  })
  .strict();

export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;

/**
 * Strict schema for TerminationEvidence.
 */
export const TerminationEvidenceSchema = z
  .object({
    attemptId: z.string().uuid(),
    generation: positiveSafeIntSchema,
    confirmed: z.boolean(),
    observedAt: timestampSchema,
    containerIds: z.array(boundedIdSchema).max(MAX_COLLECTION_ENTRIES),
    errorCode: boundedIdSchema.optional(),
    workerBootId: boundedIdSchema,
  })
  .strict();

export type TerminationEvidence = z.infer<typeof TerminationEvidenceSchema>;

/**
 * Strict schema for RunResult.
 */
export const RunResultSchema = z
  .object({
    attemptId: z.string().uuid(),
    status: z.enum(['completed', 'failed', 'cancelled', 'unknown']),
    harnessDigest: digestSchema,
    sourceRevision: boundedIdSchema,
    evaluatorDigest: digestSchema,
    passed: z.boolean(),
    criticalFailures: z
      .array(z.string().max(MAX_INSTRUCTION_LENGTH))
      .max(MAX_COLLECTION_ENTRIES),
    toolCalls: nonNegativeSafeIntSchema,
    durationMs: nonNegativeSafeIntSchema,
    costUsd: z.number().finite().nonnegative().nullable(),
    artifactDigest: digestSchema,
    transcriptDigest: digestSchema.optional(),
    errorCode: boundedIdSchema.optional(),
    binding: ExecutionBindingSchema,
    projectAuthority: ProjectAuthoritySchema.optional(),
    generation: positiveSafeIntSchema,
  })
  .strict();

export type RunResult = z.infer<typeof RunResultSchema>;

/**
 * Strict schema for Attempt.
 */
export const AttemptSchema = z
  .object({
    id: z.string().uuid(),
    taskKey: digestSchema,
    projectId: boundedIdSchema,
    hostId: boundedIdSchema,
    accountId: boundedIdSchema,
    token: z.string().uuid(),
    state: z.enum([
      'admitted',
      'running',
      'completed',
      'failed',
      'cancelled',
      'unknown',
      'fenced',
    ]),
    deadline: timestampSchema,
    createdAt: timestampSchema,
    pid: positiveSafeIntSchema.optional(),
    result: RunResultSchema.optional(),
    terminationEvidence: TerminationEvidenceSchema.optional(),
    binding: ExecutionBindingSchema,
    generation: positiveSafeIntSchema,
    reservedToolCalls: nonNegativeSafeIntSchema,
  })
  .strict();

export type Attempt = z.infer<typeof AttemptSchema>;

/**
 * Verifier interface for authoritative runtime evidence.
 */
export interface FleetEvidenceVerifier {
  verifyCompletion(attempt: Attempt, result: RunResult): Promise<boolean>;
  verifyTermination(
    attempt: Attempt,
    evidence: TerminationEvidence,
  ): Promise<boolean>;
}

/**
 * Strict schema for EvaluationRecord.
 */
export const EvaluationRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: boundedIdSchema,
    releaseDigest: digestSchema,
    planDigest: digestSchema,
    eligible: z.boolean(),
    reasonCodes: z.array(boundedIdSchema).max(MAX_COLLECTION_ENTRIES),
    projects: z.array(boundedIdSchema).max(MAX_COLLECTION_ENTRIES),
    baselinePassed: nonNegativeSafeIntSchema,
    candidatePassed: nonNegativeSafeIntSchema,
    criticalRegressions: z
      .array(z.string().max(MAX_INSTRUCTION_LENGTH))
      .max(MAX_COLLECTION_ENTRIES),
  })
  .strict();

export type EvaluationRecord = z.infer<typeof EvaluationRecordSchema>;

/**
 * Strict schema for FrozenEvaluationPlan.
 */
export const FrozenEvaluationPlanSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: boundedIdSchema,
    releaseDigest: digestSchema,
    baselineDigest: digestSchema,
    policyDigest: digestSchema,
    runtimeDigest: digestSchema,
    requiredProjects: z
      .array(boundedIdSchema)
      .min(1)
      .max(MAX_COLLECTION_ENTRIES),
    minImprovement: z.number().finite().min(0).max(1),
    maxRegressions: nonNegativeSafeIntSchema,
    cases: z
      .array(
        z
          .object({
            id: boundedIdSchema,
            taskDigest: digestSchema,
            hostId: boundedIdSchema,
            projectId: boundedIdSchema,
            logicalProjectId: boundedIdSchema,
            accountId: boundedIdSchema,
            sourceRevision: boundedIdSchema,
            evaluatorDigest: digestSchema,
            runtimeDigest: digestSchema,
            baselineAttemptId: z.string().uuid(),
            candidateAttemptId: z.string().uuid(),
          })
          .strict(),
      )
      .min(1)
      .max(MAX_COLLECTION_ENTRIES),
  })
  .strict();

export type FrozenEvaluationPlan = z.infer<typeof FrozenEvaluationPlanSchema>;

const SignedApprovalPayloadBaseSchema = z.object({
  purpose: z.literal('ags-fleet-release-v1'),
  releaseDigest: digestSchema,
  evaluationDigest: digestSchema,
  selectors: z
    .array(
      z
        .object({
          kind: z.enum(['project', 'domain', 'stack', 'fleet']),
          key: boundedIdSchema,
        })
        .strict(),
    )
    .min(1)
    .max(MAX_COLLECTION_ENTRIES),
  expiresAt: timestampSchema,
  nonce: boundedIdSchema,
  policyDigest: digestSchema,
  expectedPinGeneration: positiveSafeIntSchema,
});

export const SignedApprovalPayloadSchema = z.discriminatedUnion('action', [
  SignedApprovalPayloadBaseSchema.extend({
    action: z.literal('activate'),
    rollout: z.enum(['canary', 'active']),
  }).strict(),
  SignedApprovalPayloadBaseSchema.extend({
    action: z.literal('rollback'),
    rollout: z.undefined().optional(),
  }).strict(),
  SignedApprovalPayloadBaseSchema.extend({
    action: z.literal('withdraw'),
    rollout: z.undefined().optional(),
  }).strict(),
]);

export const SignedApprovalSchema = z
  .object({
    schemaVersion: z.literal(1),
    approverId: boundedIdSchema,
    payload: SignedApprovalPayloadSchema,
    signature: z.string().min(1).max(MAX_PATH_LENGTH),
  })
  .strict();

export type SignedApproval = z.infer<typeof SignedApprovalSchema>;

/**
 * Strict schema for SignedExecutionRequest.
 */
export const SignedExecutionRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    coordinatorId: boundedIdSchema,
    payload: z
      .object({
        purpose: z.literal('ags-fleet-execute-v1'),
        requestId: boundedIdSchema,
        attemptId: z.string().uuid(),
        generation: positiveSafeIntSchema,
        binding: ExecutionBindingSchema,
        budget: BudgetEpochSchema,
        evaluationPlan: FrozenEvaluationPlanSchema.optional(),
        hostId: boundedIdSchema,
        expiresAt: timestampSchema,
        nonce: boundedIdSchema,
        task: FleetTaskSchema,
        bundle: HarnessBundleSchema,
      })
      .strict()
      .superRefine((payload, context) => {
        const planRequired =
          payload.binding.phase === 'heldout' &&
          payload.binding.stage === 'evaluation';
        const planPresent = payload.evaluationPlan !== undefined;
        if (
          planRequired !== planPresent ||
          (payload.task.phase === 'train' && planPresent)
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['evaluationPlan'],
            message:
              'evaluationPlan is required for heldout evaluation requests and forbidden for training requests',
          });
        }
      }),
    signature: z.string().min(1).max(MAX_PATH_LENGTH),
  })
  .strict();

export type SignedExecutionRequest = z.infer<
  typeof SignedExecutionRequestSchema
>;

/**
 * Strict schema for SignedWorkerReceipt.
 */
export const SignedWorkerReceiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    hostId: boundedIdSchema,
    payload: z
      .object({
        purpose: z.literal('ags-fleet-receipt-v1'),
        requestId: boundedIdSchema,
        attemptId: z.string().uuid(),
        generation: positiveSafeIntSchema,
        binding: ExecutionBindingSchema,
        workerBootId: boundedIdSchema,
        observedAt: timestampSchema,
        status: z.enum([
          'accepted',
          'running',
          'completed',
          'failed',
          'unknown',
          'terminated',
        ]),
        resultDigest: digestSchema.optional(),
        artifactDigest: digestSchema.optional(),
        containerIds: z.array(boundedIdSchema).max(MAX_COLLECTION_ENTRIES),
        terminationConfirmed: z.boolean().optional(),
        result: RunResultSchema.optional(),
        outputBundle: HarnessBundleSchema.optional(),
      })
      .strict()
      .superRefine((payload, context) => {
        const outputBundleRequired =
          payload.status === 'completed' &&
          (payload.binding.stage === 'proposal' ||
            payload.binding.stage === 'compose');
        const outputBundlePresent = payload.outputBundle !== undefined;
        if (outputBundleRequired !== outputBundlePresent) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['outputBundle'],
            message:
              'outputBundle is required for completed proposal/compose receipts and forbidden otherwise',
          });
        }
      }),
    signature: z.string().min(1).max(MAX_PATH_LENGTH),
  })
  .strict();

export type SignedWorkerReceipt = z.infer<typeof SignedWorkerReceiptSchema>;

/**
 * Formats Zod issues into a single descriptive string.
 */
function formatZodIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => {
      const pathStr = issue.path.join('.');
      return pathStr ? `at "${pathStr}": ${issue.message}` : issue.message;
    })
    .join('; ');
}

function assertUniqueIds(items: Array<{ id: string }>, kind: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new HarnessError(
        'INVALID_CONFIG',
        `Duplicate ${kind} ID: "${item.id}"`,
      );
    }
    seen.add(item.id);
  }
}

/**
 * Strictly parses and validates a FleetConfig object.
 * Throws HarnessError('INVALID_CONFIG', ...) on failure.
 */
export function parseFleetConfig(input: unknown): FleetConfig {
  const result = FleetConfigSchema.safeParse(input);
  if (!result.success) {
    throw new HarnessError(
      'INVALID_CONFIG',
      `Failed to validate FleetConfig: ${formatZodIssues(result.error.issues)}`,
    );
  }

  const config = result.data;

  // Validate duplicate authoritative IDs
  assertUniqueIds(config.accounts, 'account');
  assertUniqueIds(config.domains, 'domain');
  assertUniqueIds(config.stacks, 'stack');
  assertUniqueIds(config.rules, 'rule');
  assertUniqueIds(config.approvers, 'approver');
  assertUniqueIds(config.coordinators, 'coordinator');

  const serverIds = new Set<string>();
  for (const host of config.hosts) {
    if (serverIds.has(host.serverId)) {
      throw new HarnessError(
        'INVALID_CONFIG',
        `Duplicate host serverId: "${host.serverId}"`,
      );
    }
    serverIds.add(host.serverId);
  }

  // Reject duplicate alias declarations for the same host/project checkout.
  const aliasCheckouts = new Set<string>();
  for (const alias of config.projectAliases) {
    const checkoutKey = `${alias.hostId}\u0000${alias.projectId}`;
    if (aliasCheckouts.has(checkoutKey)) {
      throw new HarnessError(
        'INVALID_CONFIG',
        `Duplicate project alias for checkout "${alias.hostId}/${alias.projectId}"`,
      );
    }
    aliasCheckouts.add(checkoutKey);
  }

  // Every alias group must declare one identical domain/account authority.
  const groups = new Map<string, { domain: string; accountId: string }>();
  for (const alias of config.projectAliases) {
    const current = groups.get(alias.logicalProjectId);
    if (!current) {
      groups.set(alias.logicalProjectId, {
        domain: alias.domain,
        accountId: alias.accountId,
      });
      continue;
    }
    if (current.domain !== alias.domain) {
      throw new HarnessError(
        'CROSS_DOMAIN_ALIAS_CONFLICT',
        `Alias group "${alias.logicalProjectId}" declares conflicting domains "${current.domain}" and "${alias.domain}"`,
      );
    }
    if (current.accountId !== alias.accountId) {
      throw new HarnessError(
        'ALIAS_AUTHORITY_MISMATCH',
        `Alias group "${alias.logicalProjectId}" declares conflicting accounts "${current.accountId}" and "${alias.accountId}"`,
      );
    }
  }

  // Alias declarations must reference configured domains/accounts whose eligibility agrees.
  for (const alias of config.projectAliases) {
    const domain = config.domains.find((d) => d.id === alias.domain);
    if (!domain) {
      throw new HarnessError(
        'INVALID_CONFIG',
        `Project alias for "${alias.hostId}/${alias.projectId}" references unknown domain "${alias.domain}"`,
      );
    }
    const account = config.accounts.find((a) => a.id === alias.accountId);
    if (!account) {
      throw new HarnessError(
        'INVALID_CONFIG',
        `Project alias for "${alias.hostId}/${alias.projectId}" references unknown account "${alias.accountId}"`,
      );
    }
    if (
      !account.allowedDomains.includes(alias.domain) &&
      !account.allowedDomains.includes('*')
    ) {
      throw new HarnessError(
        'ACCOUNT_DOMAIN_INELIGIBLE',
        `Alias account "${account.id}" is not authorized for declared domain "${alias.domain}"`,
      );
    }
  }

  // Cross-role key separation compares canonical key material, not encodings.
  const keyOwners = new Map<string, string>();
  const claimKey = (keyStr: string, owner: string): void => {
    const normalized = normalizeEd25519PublicKey(keyStr);
    if (normalized === null) {
      throw new HarnessError(
        'INVALID_CONFIG',
        `Invalid Ed25519 public key configured for ${owner}`,
      );
    }
    const existing = keyOwners.get(normalized);
    if (existing) {
      throw new HarnessError(
        'INVALID_CONFIG',
        `Key reuse forbidden: identical Ed25519 key material configured for ${existing} and ${owner}`,
      );
    }
    keyOwners.set(normalized, owner);
  };

  config.approvers.forEach((approver, index) =>
    claimKey(approver.publicKey, `approver "${approver.id}" (index ${index})`),
  );
  config.coordinators.forEach((coordinator, index) =>
    claimKey(
      coordinator.publicKey,
      `coordinator "${coordinator.id}" (index ${index})`,
    ),
  );
  config.hosts.forEach((host, index) =>
    claimKey(
      host.workerPublicKey,
      `host "${host.serverId}" worker (index ${index})`,
    ),
  );

  return config;
}

/**
 * Strictly parses and validates a FleetTask object.
 * Throws HarnessError('INVALID_TASK', ...) on failure.
 */
export function parseFleetTask(input: unknown): FleetTask {
  const result = FleetTaskSchema.safeParse(input);
  if (!result.success) {
    throw new HarnessError(
      'INVALID_TASK',
      `Failed to validate FleetTask: ${formatZodIssues(result.error.issues)}`,
    );
  }
  return result.data;
}

/**
 * Returns the canonical SHA-256 digest of a strictly validated FleetConfig.
 */
export function policyDigest(config: FleetConfig): string {
  const validated = parseFleetConfig(config);
  return canonicalDigest(validated);
}

/**
 * Resolves the runtime closure for an exactly enrolled execution host.
 * Hosts may carry their own binary paths/architecture manifest; the global
 * runtime remains the default for hosts without an override.
 */
export function resolveHostRuntime(
  config: FleetConfig,
  hostId: string,
): FleetRuntimeConfig {
  const validated = parseFleetConfig(config);
  const host = validated.hosts.find((h) => h.serverId === hostId);
  if (!host) {
    throw new HarnessError(
      'HOST_NOT_ENROLLED',
      `Host "${hostId}" is not enrolled in the fleet configuration`,
    );
  }
  return host.runtime ?? validated.runtime;
}

/**
 * Aggregate runtime identity for an evaluation plan: canonical digest of the
 * expected resolved manifest digest for every host referenced by its cases.
 */
export function evaluationRuntimeDigest(
  config: FleetConfig,
  cases: ReadonlyArray<{ hostId: string }>,
): string {
  const hostManifests: Record<string, string> = {};
  for (const entry of cases) {
    hostManifests[entry.hostId] = resolveHostRuntime(
      config,
      entry.hostId,
    ).manifestDigest;
  }
  return canonicalDigest(hostManifests);
}
