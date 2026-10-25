import crypto from 'crypto';
import fs from 'fs-extra';
import { z } from 'zod';
import {
  BudgetEpoch,
  BudgetEpochSchema,
  canonicalDigest,
  canonicalJSON,
  ExecutionBinding,
  HarnessError,
  SignedExecutionRequest,
  SignedExecutionRequestSchema,
  SignedWorkerReceipt,
  SignedWorkerReceiptSchema,
} from './RuntimeTypes';

export const AGS_FLEET_RECEIPT_START = '---BEGIN AGS FLEET WORKER RECEIPT---';
export const AGS_FLEET_RECEIPT_END = '---END AGS FLEET WORKER RECEIPT---';

export const PROTOCOL_LIMITS = {
  MAX_PAYLOAD_BYTES: 4 * 1024 * 1024, // 4 MiB max payload
  MAX_STDOUT_CAPTURE_BYTES: 8 * 1024 * 1024, // 8 MiB max captured stdout
  MAX_RPC_TIMEOUT_MS: 30000,
  /** Hard ceiling on terminal scrollback lines consumed for a single worker response. */
  MAX_CAPTURE_LINES: 200_000,
  /** Maximum length of a single serialized SDK terminal argument. */
  MAX_ARGV_BYTES: 6 * 1024 * 1024,
} as const;

/**
 * Canonical Ed25519 signature encoding: exactly 64 bytes as padded standard base64.
 * base64url and non-canonical padding are rejected before verification.
 */
const ED25519_SIGNATURE_PATTERN = /^[A-Za-z0-9+/]{86}==$/;

const ed25519SignatureSchema = z
  .string()
  .regex(
    ED25519_SIGNATURE_PATTERN,
    'Signature must be canonical 64-byte base64 (Ed25519)',
  );

/**
 * Strict schema for an authenticated SignedWorkerReceipt signature value.
 */
export const Ed25519SignatureSchema = ed25519SignatureSchema;

/**
 * Strict schema for authenticated remote worker control requests (status, cancel).
 * Deliberately excludes a bare `fence` command: fencing is a central coordinator
 * decision made after validating authoritative termination evidence.
 */
export const SignedControlRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    coordinatorId: z.string().min(1),
    payload: z
      .object({
        purpose: z.literal('ags-fleet-control-v1'),
        requestId: z.string().min(1),
        attemptId: z.string().uuid(),
        generation: z.number().int().positive(),
        action: z.enum(['status', 'cancel']),
        hostId: z.string().min(1),
        bindingDigest: z.string().min(1),
        expiresAt: z.number().int().positive(),
        nonce: z.string().min(1),
      })
      .strict(),
    signature: ed25519SignatureSchema,
  })
  .strict();

export type SignedControlRequest = z.infer<typeof SignedControlRequestSchema>;

const SPKI_ED25519_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const PKCS8_ED25519_PREFIX = Buffer.from(
  '302e020100300506032b657004220420',
  'hex',
);

function assertCanonicalSignature(signature: string): Buffer {
  if (!ED25519_SIGNATURE_PATTERN.test(signature)) {
    throw new HarnessError(
      'NONCANONICAL_SIGNATURE',
      'Signature must be canonical 64-byte Ed25519 base64',
    );
  }
  const raw = Buffer.from(signature, 'base64');
  if (raw.length !== 64 || raw.toString('base64') !== signature) {
    throw new HarnessError(
      'NONCANONICAL_SIGNATURE',
      'Signature bytes do not round-trip through canonical base64',
    );
  }
  return raw;
}

/**
 * Loads and constructs a crypto.KeyObject for an Ed25519 public key.
 * Validates that the loaded key is strictly of type 'ed25519'.
 */
export function loadPublicKey(keyInput: string | Buffer): crypto.KeyObject {
  let keyObj: crypto.KeyObject;

  if (Buffer.isBuffer(keyInput)) {
    if (keyInput.length === 32) {
      keyObj = crypto.createPublicKey({
        key: Buffer.concat([SPKI_ED25519_PREFIX, keyInput]),
        format: 'der',
        type: 'spki',
      });
    } else {
      keyObj = crypto.createPublicKey({
        key: keyInput,
        format: 'der',
        type: 'spki',
      });
    }
  } else {
    const trimmed = keyInput.trim();
    if (trimmed.startsWith('-----BEGIN')) {
      keyObj = crypto.createPublicKey(trimmed);
    } else {
      const buf = Buffer.from(trimmed, 'base64');
      if (buf.length === 32) {
        keyObj = crypto.createPublicKey({
          key: Buffer.concat([SPKI_ED25519_PREFIX, buf]),
          format: 'der',
          type: 'spki',
        });
      } else {
        keyObj = crypto.createPublicKey({
          key: buf,
          format: 'der',
          type: 'spki',
        });
      }
    }
  }

  if (keyObj.asymmetricKeyType !== 'ed25519') {
    throw new HarnessError(
      'UNSUPPORTED_KEY_TYPE',
      `Expected Ed25519 public key, got "${keyObj.asymmetricKeyType}"`,
    );
  }

  return keyObj;
}

/**
 * Loads and constructs a crypto.KeyObject for an Ed25519 private key.
 * Validates that the loaded key is strictly of type 'ed25519'.
 */
export function loadPrivateKey(
  keyInputOrPath: string | Buffer,
): crypto.KeyObject {
  let keyContent: string | Buffer = keyInputOrPath;

  if (typeof keyInputOrPath === 'string') {
    const trimmed = keyInputOrPath.trim();
    if (!trimmed.startsWith('-----BEGIN') && fs.existsSync(trimmed)) {
      keyContent = fs.readFileSync(trimmed);
    } else {
      keyContent = trimmed;
    }
  }

  let keyObj: crypto.KeyObject;

  if (Buffer.isBuffer(keyContent)) {
    if (keyContent.length === 32) {
      keyObj = crypto.createPrivateKey({
        key: Buffer.concat([PKCS8_ED25519_PREFIX, keyContent]),
        format: 'der',
        type: 'pkcs8',
      });
    } else {
      const str = keyContent.toString('utf8');
      if (str.startsWith('-----BEGIN')) {
        keyObj = crypto.createPrivateKey(str);
      } else {
        keyObj = crypto.createPrivateKey({
          key: keyContent,
          format: 'der',
          type: 'pkcs8',
        });
      }
    }
  } else {
    const str = keyContent.trim();
    if (str.startsWith('-----BEGIN')) {
      keyObj = crypto.createPrivateKey(str);
    } else {
      const buf = Buffer.from(str, 'base64');
      if (buf.length === 32) {
        keyObj = crypto.createPrivateKey({
          key: Buffer.concat([PKCS8_ED25519_PREFIX, buf]),
          format: 'der',
          type: 'pkcs8',
        });
      } else {
        keyObj = crypto.createPrivateKey({
          key: buf,
          format: 'der',
          type: 'pkcs8',
        });
      }
    }
  }

  if (keyObj.asymmetricKeyType !== 'ed25519') {
    throw new HarnessError(
      'UNSUPPORTED_KEY_TYPE',
      `Expected Ed25519 private key, got "${keyObj.asymmetricKeyType}"`,
    );
  }

  return keyObj;
}

/**
 * Signs a canonical execution request with the coordinator private key.
 */
export function signExecutionRequest(
  coordinatorId: string,
  payload: SignedExecutionRequest['payload'],
  privateKeyInput: string | Buffer,
): SignedExecutionRequest {
  if (payload.purpose !== 'ags-fleet-execute-v1') {
    throw new HarnessError(
      'INVALID_REQUEST_PURPOSE',
      `Execution request purpose must be 'ags-fleet-execute-v1', got '${payload.purpose}'`,
    );
  }

  const privateKey = loadPrivateKey(privateKeyInput);
  const data = Buffer.from(canonicalJSON(payload), 'utf8');
  const signature = crypto.sign(null, data, privateKey).toString('base64');

  const signedRequest: SignedExecutionRequest = {
    schemaVersion: 1,
    coordinatorId,
    payload,
    signature,
  };

  return SignedExecutionRequestSchema.parse(signedRequest);
}

/**
 * Verifies the coordinator signature on a SignedExecutionRequest.
 */
export function verifyExecutionRequestSignature(
  request: SignedExecutionRequest,
  coordinatorPublicKeyInput: string | Buffer,
): boolean {
  try {
    const parsed = SignedExecutionRequestSchema.parse(request);
    const publicKey = loadPublicKey(coordinatorPublicKeyInput);
    const data = Buffer.from(canonicalJSON(parsed.payload), 'utf8');
    const sigBuf = assertCanonicalSignature(parsed.signature);
    return crypto.verify(null, data, publicKey, sigBuf);
  } catch {
    return false;
  }
}

/**
 * Signs a worker receipt with the host private key.
 */
export function signWorkerReceipt(
  hostId: string,
  payload: SignedWorkerReceipt['payload'],
  privateKeyInput: string | Buffer,
): SignedWorkerReceipt {
  if (payload.purpose !== 'ags-fleet-receipt-v1') {
    throw new HarnessError(
      'INVALID_RECEIPT_PURPOSE',
      `Worker receipt purpose must be 'ags-fleet-receipt-v1', got '${payload.purpose}'`,
    );
  }

  const privateKey = loadPrivateKey(privateKeyInput);
  const data = Buffer.from(canonicalJSON(payload), 'utf8');
  const signature = crypto.sign(null, data, privateKey).toString('base64');

  const signedReceipt: SignedWorkerReceipt = {
    schemaVersion: 1,
    hostId,
    payload,
    signature,
  };

  return SignedWorkerReceiptSchema.parse(signedReceipt);
}

/**
 * Verifies the host signature on a SignedWorkerReceipt.
 */
export function verifyWorkerReceiptSignature(
  receipt: SignedWorkerReceipt,
  hostPublicKeyInput: string | Buffer,
): boolean {
  try {
    const parsed = SignedWorkerReceiptSchema.parse(receipt);
    const publicKey = loadPublicKey(hostPublicKeyInput);
    const data = Buffer.from(canonicalJSON(parsed.payload), 'utf8');
    const sigBuf = assertCanonicalSignature(parsed.signature);
    return crypto.verify(null, data, publicKey, sigBuf);
  } catch {
    return false;
  }
}

/**
 * Signs a control request with the coordinator private key.
 */
export function signControlRequest(
  coordinatorId: string,
  payload: SignedControlRequest['payload'],
  privateKeyInput: string | Buffer,
): SignedControlRequest {
  if (payload.purpose !== 'ags-fleet-control-v1') {
    throw new HarnessError(
      'INVALID_CONTROL_PURPOSE',
      `Control request purpose must be 'ags-fleet-control-v1', got '${payload.purpose}'`,
    );
  }

  const privateKey = loadPrivateKey(privateKeyInput);
  const data = Buffer.from(canonicalJSON(payload), 'utf8');
  const signature = crypto.sign(null, data, privateKey).toString('base64');

  const signedRequest: SignedControlRequest = {
    schemaVersion: 1,
    coordinatorId,
    payload,
    signature,
  };

  return SignedControlRequestSchema.parse(signedRequest);
}

/**
 * Verifies the coordinator signature on a SignedControlRequest.
 */
export function verifyControlRequestSignature(
  request: SignedControlRequest,
  coordinatorPublicKeyInput: string | Buffer,
): boolean {
  try {
    const parsed = SignedControlRequestSchema.parse(request);
    const publicKey = loadPublicKey(coordinatorPublicKeyInput);
    const data = Buffer.from(canonicalJSON(parsed.payload), 'utf8');
    const sigBuf = assertCanonicalSignature(parsed.signature);
    return crypto.verify(null, data, publicKey, sigBuf);
  } catch {
    return false;
  }
}

/**
 * Encodes an object payload as a base64 canonical JSON string with size bounds.
 */
export function encodePayloadBase64(value: unknown): string {
  const jsonStr = canonicalJSON(value);
  const buf = Buffer.from(jsonStr, 'utf8');
  if (buf.length > PROTOCOL_LIMITS.MAX_PAYLOAD_BYTES) {
    throw new HarnessError(
      'PAYLOAD_TOO_LARGE',
      `Serialized payload length (${buf.length} bytes) exceeds limit (${PROTOCOL_LIMITS.MAX_PAYLOAD_BYTES} bytes)`,
    );
  }
  return buf.toString('base64');
}

/**
 * Decodes a base64 encoded JSON string into an object with size bounds.
 */
export function decodePayloadBase64<T = unknown>(encoded: string): T {
  if (!encoded || typeof encoded !== 'string') {
    throw new HarnessError(
      'INVALID_ENCODED_PAYLOAD',
      'Encoded payload must be a non-empty string',
    );
  }

  if (encoded.length > PROTOCOL_LIMITS.MAX_PAYLOAD_BYTES * 2) {
    throw new HarnessError(
      'PAYLOAD_TOO_LARGE',
      'Encoded base64 string exceeds maximum size bound',
    );
  }

  try {
    const jsonStr = Buffer.from(encoded, 'base64').toString('utf8');
    return JSON.parse(jsonStr) as T;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new HarnessError(
      'INVALID_ENCODED_PAYLOAD',
      `Failed to decode base64 JSON payload: ${msg}`,
    );
  }
}

/**
 * Formats a SignedWorkerReceipt into an allowlisted terminal stdout marker block.
 */
export function formatReceiptMarker(receipt: SignedWorkerReceipt): string {
  const encoded = encodePayloadBase64(receipt);
  return `${AGS_FLEET_RECEIPT_START}\n${encoded}\n${AGS_FLEET_RECEIPT_END}`;
}

/**
 * True when both receipt markers are present in the captured text.
 */
export function hasCompleteReceiptMarker(text: string): boolean {
  if (!text) {
    return false;
  }
  const startIndex = text.indexOf(AGS_FLEET_RECEIPT_START);
  if (startIndex === -1) {
    return false;
  }
  return (
    text.indexOf(
      AGS_FLEET_RECEIPT_END,
      startIndex + AGS_FLEET_RECEIPT_START.length,
    ) !== -1
  );
}

/**
 * Extracts and strictly parses a SignedWorkerReceipt from terminal stdout with length limits.
 */
export function extractReceiptFromStdout(
  stdout: string,
): SignedWorkerReceipt | null {
  if (!stdout || typeof stdout !== 'string') {
    return null;
  }

  const boundedStdout =
    stdout.length > PROTOCOL_LIMITS.MAX_STDOUT_CAPTURE_BYTES
      ? stdout.substring(
          stdout.length - PROTOCOL_LIMITS.MAX_STDOUT_CAPTURE_BYTES,
        )
      : stdout;

  const startIndex = boundedStdout.indexOf(AGS_FLEET_RECEIPT_START);
  if (startIndex === -1) {
    return null;
  }

  const afterStart = startIndex + AGS_FLEET_RECEIPT_START.length;
  const endIndex = boundedStdout.indexOf(AGS_FLEET_RECEIPT_END, afterStart);
  if (endIndex === -1) {
    throw new HarnessError(
      'TRUNCATED_RECEIPT_MARKER',
      'Stdout contains start marker but missing end marker for worker receipt',
    );
  }

  const encoded = boundedStdout.substring(afterStart, endIndex).trim();
  if (!encoded) {
    throw new HarnessError(
      'EMPTY_RECEIPT_MARKER',
      'Receipt marker block is empty',
    );
  }

  const parsed = decodePayloadBase64(encoded);
  const result = SignedWorkerReceiptSchema.safeParse(parsed);
  if (!result.success) {
    throw new HarnessError(
      'INVALID_WORKER_RECEIPT',
      `Parsed receipt failed schema validation: ${result.error.issues.map((i) => i.message).join('; ')}`,
    );
  }

  return result.data;
}

function formatIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
    .join('; ');
}

/**
 * Verifies that the signed request's budget authority, immutable binding and
 * task payload are one coherent unit. Rejects any field the worker cannot
 * independently re-derive from the local configuration.
 */
function assertRequestAuthority(
  request: SignedExecutionRequest,
  nowMs: number,
): void {
  const { payload } = request;
  const binding = payload.binding;
  const task = payload.task;
  const bundle = payload.bundle;
  const budgetParse = BudgetEpochSchema.safeParse(payload.budget);
  if (!budgetParse.success) {
    throw new HarnessError(
      'INVALID_BUDGET_AUTHORITY',
      `Execution request budget failed strict validation: ${formatIssues(budgetParse.error.issues)}`,
    );
  }
  const budget: BudgetEpoch = budgetParse.data;

  if (payload.generation !== budget.policyGeneration) {
    throw new HarnessError(
      'AUTHORITY_GENERATION_MISMATCH',
      `Request generation ${payload.generation} does not match signed budget policy generation ${budget.policyGeneration}`,
    );
  }
  if (budget.id !== binding.budgetId) {
    throw new HarnessError(
      'AUTHORITY_BUDGET_MISMATCH',
      'Signed budget id does not match binding.budgetId',
    );
  }
  if (budget.runId !== binding.runId) {
    throw new HarnessError(
      'AUTHORITY_BUDGET_MISMATCH',
      'Signed budget runId does not match binding.runId',
    );
  }
  if (budget.policyDigest !== binding.policyDigest) {
    throw new HarnessError(
      'AUTHORITY_POLICY_MISMATCH',
      'Signed budget policyDigest does not match binding.policyDigest',
    );
  }
  if (budget.deadline <= nowMs) {
    throw new HarnessError(
      'AUTHORITY_BUDGET_EXPIRED',
      'Signed budget epoch deadline has expired',
    );
  }
  // Central counters already include this attempt's reservation; the worker only
  // validates that the signed snapshot is internally bounded. Admission itself is
  // enforced by the worker's own mirror epoch.
  if (budget.reservedAttempts > budget.maxAttempts) {
    throw new HarnessError(
      'AUTHORITY_BUDGET_EXHAUSTED',
      'Signed budget epoch attempt counters exceed the frozen cap',
    );
  }
  if (budget.reservedToolCalls > budget.maxToolCalls) {
    throw new HarnessError(
      'AUTHORITY_BUDGET_EXHAUSTED',
      'Signed budget epoch tool-call counters exceed the frozen cap',
    );
  }
  if (task.toolCallAllowance > budget.maxToolCalls) {
    throw new HarnessError(
      'AUTHORITY_BUDGET_EXHAUSTED',
      'Per-attempt tool-call allowance exceeds the signed epoch tool-call cap',
    );
  }

  if (binding.hostId !== payload.hostId) {
    throw new HarnessError(
      'AUTHORITY_HOST_MISMATCH',
      'binding.hostId does not match payload.hostId',
    );
  }
  if (binding.hostId !== task.project.hostId) {
    throw new HarnessError(
      'AUTHORITY_PROJECT_MISMATCH',
      'binding.hostId does not match task.project.hostId',
    );
  }
  if (binding.projectId !== task.project.projectId) {
    throw new HarnessError(
      'AUTHORITY_PROJECT_MISMATCH',
      'binding.projectId does not match task.project.projectId',
    );
  }
  if (binding.phase !== task.phase) {
    throw new HarnessError(
      'AUTHORITY_PHASE_MISMATCH',
      'binding.phase does not match task.phase',
    );
  }
  if (binding.sourceRevision !== task.sourceRef) {
    throw new HarnessError(
      'AUTHORITY_SOURCE_MISMATCH',
      'binding.sourceRevision does not match task.sourceRef',
    );
  }
  const taskDigest = canonicalDigest(task);
  if (binding.taskDigest !== taskDigest) {
    throw new HarnessError(
      'AUTHORITY_TASK_MISMATCH',
      'binding.taskDigest does not match canonical task digest',
    );
  }
  if (binding.evaluatorDigest !== canonicalDigest(task.verification)) {
    throw new HarnessError(
      'AUTHORITY_EVALUATOR_MISMATCH',
      'binding.evaluatorDigest does not match canonical task verification digest',
    );
  }
  if (binding.harnessDigest !== canonicalDigest(bundle)) {
    throw new HarnessError(
      'AUTHORITY_BUNDLE_MISMATCH',
      'binding.harnessDigest does not match the canonical supplied harness bundle',
    );
  }
  if (
    binding.stage === 'baseline' &&
    binding.harnessDigest !== canonicalDigest(task.baseline)
  ) {
    throw new HarnessError(
      'AUTHORITY_BUNDLE_MISMATCH',
      'Baseline stage harnessDigest must equal the task baseline bundle digest',
    );
  }
}

/**
 * Authoritatively validates a SignedExecutionRequest on the worker host before execution.
 * Checks schema, purpose, expiry, host identity, coordinator trust, signature, and
 * full budget/binding/task authority coherence.
 */
export function validateExecutionRequest(
  requestInput: unknown,
  expectedHostId: string,
  allowedCoordinators: Array<{ id: string; publicKey: string }>,
  nowMs = Date.now(),
): SignedExecutionRequest {
  const parseResult = SignedExecutionRequestSchema.safeParse(requestInput);
  if (!parseResult.success) {
    throw new HarnessError(
      'INVALID_REQUEST_SCHEMA',
      `Execution request failed strict schema: ${formatIssues(parseResult.error.issues)}`,
    );
  }
  const request = parseResult.data;

  if (request.payload.purpose !== 'ags-fleet-execute-v1') {
    throw new HarnessError(
      'INVALID_REQUEST_PURPOSE',
      `Unexpected request purpose "${request.payload.purpose}"`,
    );
  }

  if (request.payload.hostId !== expectedHostId) {
    throw new HarnessError(
      'UNAUTHORIZED_HOST_TARGET',
      `Request targeted hostId "${request.payload.hostId}" does not match local hostId "${expectedHostId}"`,
    );
  }

  if (request.payload.expiresAt <= nowMs) {
    throw new HarnessError(
      'REQUEST_EXPIRED',
      `Request expired at ${request.payload.expiresAt}, current time is ${nowMs}`,
    );
  }

  const coordinator = allowedCoordinators.find(
    (c) => c.id === request.coordinatorId,
  );
  if (!coordinator) {
    throw new HarnessError(
      'UNTRUSTED_COORDINATOR',
      `Coordinator "${request.coordinatorId}" is not in configured trusted coordinators`,
    );
  }

  const signatureValid = verifyExecutionRequestSignature(
    request,
    coordinator.publicKey,
  );
  if (!signatureValid) {
    throw new HarnessError(
      'INVALID_REQUEST_SIGNATURE',
      `Invalid cryptographic signature on execution request from coordinator "${request.coordinatorId}"`,
    );
  }

  assertRequestAuthority(request, nowMs);

  return request;
}

/**
 * Authoritatively validates a SignedControlRequest on the worker host before control action.
 */
export function validateControlRequest(
  requestInput: unknown,
  expectedHostId: string,
  allowedCoordinators: Array<{ id: string; publicKey: string }>,
  nowMs = Date.now(),
): SignedControlRequest {
  const parseResult = SignedControlRequestSchema.safeParse(requestInput);
  if (!parseResult.success) {
    throw new HarnessError(
      'INVALID_CONTROL_SCHEMA',
      `Control request failed strict schema: ${formatIssues(parseResult.error.issues)}`,
    );
  }
  const request = parseResult.data;

  if (request.payload.purpose !== 'ags-fleet-control-v1') {
    throw new HarnessError(
      'INVALID_CONTROL_PURPOSE',
      `Unexpected control request purpose "${request.payload.purpose}"`,
    );
  }

  if (request.payload.hostId !== expectedHostId) {
    throw new HarnessError(
      'UNAUTHORIZED_HOST_TARGET',
      `Control request targeted hostId "${request.payload.hostId}" does not match local hostId "${expectedHostId}"`,
    );
  }

  if (request.payload.expiresAt <= nowMs) {
    throw new HarnessError(
      'REQUEST_EXPIRED',
      `Control request expired at ${request.payload.expiresAt}, current time is ${nowMs}`,
    );
  }

  const coordinator = allowedCoordinators.find(
    (c) => c.id === request.coordinatorId,
  );
  if (!coordinator) {
    throw new HarnessError(
      'UNTRUSTED_COORDINATOR',
      `Coordinator "${request.coordinatorId}" is not in configured trusted coordinators`,
    );
  }

  const signatureValid = verifyControlRequestSignature(
    request,
    coordinator.publicKey,
  );
  if (!signatureValid) {
    throw new HarnessError(
      'INVALID_CONTROL_SIGNATURE',
      `Invalid cryptographic signature on control request from coordinator "${request.coordinatorId}"`,
    );
  }

  return request;
}

/**
 * Authoritatively validates a SignedWorkerReceipt returned from a remote execution host.
 * Enforces terminal status/result/digest/termination coherence, strict canonical
 * Ed25519 signatures, and full correlation against the expected execution.
 */
export function validateWorkerReceipt(
  receiptInput: unknown,
  expectedHostId: string,
  hostPublicKey: string,
  expectedCorrelation?: {
    requestId?: string;
    attemptId?: string;
    generation?: number;
    binding?: ExecutionBinding;
    bindingDigest?: string;
    allowedStatuses?: SignedWorkerReceipt['payload']['status'][];
  },
): SignedWorkerReceipt {
  const parseResult = SignedWorkerReceiptSchema.safeParse(receiptInput);
  if (!parseResult.success) {
    throw new HarnessError(
      'INVALID_RECEIPT_SCHEMA',
      `Receipt failed schema validation: ${formatIssues(parseResult.error.issues)}`,
    );
  }
  const receipt = parseResult.data;

  if (receipt.payload.purpose !== 'ags-fleet-receipt-v1') {
    throw new HarnessError(
      'INVALID_RECEIPT_PURPOSE',
      `Unexpected receipt purpose "${receipt.payload.purpose}"`,
    );
  }

  if (receipt.hostId !== expectedHostId) {
    throw new HarnessError(
      'UNEXPECTED_HOST_RECEIPT',
      `Receipt hostId "${receipt.hostId}" does not match expected hostId "${expectedHostId}"`,
    );
  }

  const signatureValid = verifyWorkerReceiptSignature(receipt, hostPublicKey);
  if (!signatureValid) {
    throw new HarnessError(
      'INVALID_RECEIPT_SIGNATURE',
      `Invalid cryptographic signature on receipt from host "${receipt.hostId}"`,
    );
  }

  const payload = receipt.payload;
  const isTerminalResultStatus =
    payload.status === 'completed' || payload.status === 'failed';

  if (isTerminalResultStatus) {
    if (!payload.result) {
      throw new HarnessError(
        'INCOHERENT_RECEIPT',
        `Receipt with status "${payload.status}" must include a result object`,
      );
    }
    if (!payload.resultDigest) {
      throw new HarnessError(
        'INCOHERENT_RECEIPT',
        `Receipt with status "${payload.status}" must include resultDigest`,
      );
    }
    if (!payload.artifactDigest) {
      throw new HarnessError(
        'INCOHERENT_RECEIPT',
        `Receipt with status "${payload.status}" must include artifactDigest`,
      );
    }
    const res = payload.result;
    if (res.attemptId !== payload.attemptId) {
      throw new HarnessError(
        'INCOHERENT_RECEIPT',
        'result.attemptId does not match receipt.attemptId',
      );
    }
    if (res.generation !== payload.generation) {
      throw new HarnessError(
        'INCOHERENT_RECEIPT',
        'result.generation does not match receipt.generation',
      );
    }
    if (canonicalJSON(res.binding) !== canonicalJSON(payload.binding)) {
      throw new HarnessError(
        'INCOHERENT_RECEIPT',
        'result.binding does not match receipt.binding',
      );
    }
    if (res.status !== payload.status) {
      throw new HarnessError(
        'INCOHERENT_RECEIPT',
        `Outer receipt status "${payload.status}" does not match nested result status "${res.status}"`,
      );
    }
    if (canonicalDigest(res) !== payload.resultDigest) {
      throw new HarnessError(
        'INCOHERENT_RECEIPT',
        'resultDigest does not match canonicalDigest(result)',
      );
    }
    if (
      payload.artifactDigest !== res.artifactDigest ||
      res.artifactDigest.trim().length === 0
    ) {
      throw new HarnessError(
        'INCOHERENT_RECEIPT',
        'artifactDigest does not match the nested result artifact digest',
      );
    }
    if (payload.terminationConfirmed !== true) {
      throw new HarnessError(
        'INCOHERENT_RECEIPT',
        'Terminal result receipts require authoritative termination confirmation',
      );
    }
  } else {
    if (payload.result) {
      throw new HarnessError(
        'INCOHERENT_RECEIPT',
        `Receipt status "${payload.status}" must not carry a result object`,
      );
    }
    if (payload.resultDigest) {
      throw new HarnessError(
        'INCOHERENT_RECEIPT',
        `Receipt status "${payload.status}" must not carry a resultDigest`,
      );
    }
    if (payload.status === 'terminated') {
      if (payload.terminationConfirmed !== true) {
        throw new HarnessError(
          'INCOHERENT_RECEIPT',
          'Terminated receipt must have terminationConfirmed=true',
        );
      }
    } else if (payload.terminationConfirmed === true) {
      throw new HarnessError(
        'INCOHERENT_RECEIPT',
        `Receipt status "${payload.status}" cannot assert confirmed termination`,
      );
    }
  }

  if (expectedCorrelation) {
    const {
      requestId,
      attemptId,
      generation,
      binding,
      bindingDigest,
      allowedStatuses,
    } = expectedCorrelation;

    if (requestId !== undefined && payload.requestId !== requestId) {
      throw new HarnessError(
        'RECEIPT_REQUEST_MISMATCH',
        `Receipt requestId "${payload.requestId}" does not match expected "${requestId}"`,
      );
    }

    if (attemptId !== undefined && payload.attemptId !== attemptId) {
      throw new HarnessError(
        'RECEIPT_ATTEMPT_MISMATCH',
        `Receipt attemptId "${payload.attemptId}" does not match expected "${attemptId}"`,
      );
    }

    if (generation !== undefined && payload.generation !== generation) {
      throw new HarnessError(
        'RECEIPT_GENERATION_MISMATCH',
        `Receipt generation ${payload.generation} does not match expected ${generation}`,
      );
    }

    if (binding !== undefined) {
      if (canonicalJSON(binding) !== canonicalJSON(payload.binding)) {
        throw new HarnessError(
          'RECEIPT_BINDING_MISMATCH',
          'Receipt execution binding does not match expected request binding',
        );
      }
    }

    if (
      bindingDigest !== undefined &&
      canonicalDigest(payload.binding) !== bindingDigest
    ) {
      throw new HarnessError(
        'RECEIPT_BINDING_MISMATCH',
        'Receipt execution binding digest does not match the expected attempt binding',
      );
    }

    if (
      allowedStatuses !== undefined &&
      !allowedStatuses.includes(payload.status)
    ) {
      throw new HarnessError(
        'RECEIPT_STATUS_UNEXPECTED',
        `Receipt status "${payload.status}" is not acceptable for this transport step`,
      );
    }
  }

  return receipt;
}
