/**
 * scripts/evals/l3/contracts.ts
 *
 * Immutable data & wire contracts for L3 artifact-v1 evaluation protocol.
 * Authoritative source: docs/srs/srs-skill-system-effectiveness.md Revision 3.
 *
 * Implements SRS-001, SRS-003, and SRS-006.
 */

// Protocol and Arm Constants
export const D1_PROTOCOL_NAME = "artifact-v1" as const;
export const PROTOCOL_VERSION = 1 as const;
export const PROTOCOL_ARMS = ["A0", "A1", "A2"] as const;
export type ProtocolArmId = (typeof PROTOCOL_ARMS)[number];

export function isProtocolArmId(arm: unknown): arm is ProtocolArmId {
  return typeof arm === "string" && (PROTOCOL_ARMS as readonly string[]).includes(arm);
}

// Global Framing Limits
export const MAX_FRAME_BYTES = 65536; // 64 KiB
export const MAX_STRING_BYTES = 4096; // 4 KiB
export const MAX_LIST_ENTRIES = 256;
export const MAX_IDENTIFIER_LENGTH = 64;

/**
 * Accepted diagnostic policy ceilings for candidate-declared overload limits
 * (SRS revision 3, "Overload operation schemas"). A candidate may declare
 * smaller finite values; it may never self-expand beyond these.
 */
export const OVERLOAD_LIMIT_CEILINGS = {
  max_connections: 32,
  max_buffer_bytes_per_connection: MAX_FRAME_BYTES,
  drain_deadline_ms: 5000,
  max_retries_per_request: 1,
} as const;

// Standard Error Codes
export const ERROR_CODES = [
  "INVALID_REQUEST",
  "NOT_FOUND",
  "FORBIDDEN",
  "OVERLOADED",
  "DRAINING",
  "UNAVAILABLE",
  "CONFLICT",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

// Standard L3 Terminal States
export const TERMINAL_STATES = [
  "passed",
  "failed",
  "artifact_unavailable",
  "artifact_invalid",
  "build_failed",
  "preflight_failed",
  "infrastructure_error",
  "cancelled",
  "interrupted",
] as const;
export type TerminalState = (typeof TERMINAL_STATES)[number];

// Base Types
export type Id = string;
export type Nat = number;
export type Positive = number;

const ID_REGEX = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export function validateId(value: unknown, fieldName: string): Id {
  if (typeof value !== "string" || !ID_REGEX.test(value)) {
    throw new Error(
      `Invalid ${fieldName}: must match ^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$, got ${JSON.stringify(
        value
      )}`
    );
  }
  return value;
}

export function validateNat(value: unknown, fieldName: string): Nat {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid ${fieldName}: must be a non-negative safe integer, got ${value}`);
  }
  return value;
}

export function validatePositive(value: unknown, fieldName: string): Positive {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Invalid ${fieldName}: must be a positive safe integer, got ${value}`);
  }
  return value;
}

export function validateStringBound(
  value: unknown,
  fieldName: string,
  maxBytes: number = MAX_STRING_BYTES
): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid ${fieldName}: must be a string, got ${typeof value}`);
  }
  const byteLen = Buffer.byteLength(value, "utf8");
  if (byteLen > maxBytes) {
    throw new Error(
      `Invalid ${fieldName}: string length in bytes (${byteLen}) exceeds maximum bound (${maxBytes})`
    );
  }
  return value;
}

export function assertPlainObject(raw: unknown, context: string): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${context} must be a plain object`);
  }
  const proto = Object.getPrototypeOf(raw);
  if (proto !== null && proto !== Object.prototype) {
    throw new Error(`${context} must be a plain object without prototype inheritance`);
  }
  return raw as Record<string, unknown>;
}

export function assertNoExtraKeys(
  raw: unknown,
  allowedKeys: readonly string[],
  context: string
): Record<string, unknown> {
  const obj = assertPlainObject(raw, context);
  const keys = Object.keys(obj);
  for (const k of keys) {
    if (!allowedKeys.includes(k)) {
      throw new Error(`Unknown extra field '${k}' in ${context}`);
    }
  }
  return obj;
}

/**
 * Snapshot the own enumerable keys of a strict object once, so a required-field
 * check can never be satisfied by a prototype-inherited member.
 */
export function ownFieldSnapshot(raw: unknown, context: string): Record<string, unknown> {
  const obj = assertPlainObject(raw, context);
  const snapshot: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    Object.defineProperty(snapshot, key, {
      value: obj[key],
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  return snapshot;
}

export function requireField(
  snapshot: Record<string, unknown>,
  key: string,
  context: string
): unknown {
  if (!Object.hasOwn(snapshot, key)) {
    throw new Error(`Missing required own field '${key}' in ${context}`);
  }
  return snapshot[key];
}

/**
 * The only accepted way to read an untrusted object.
 *
 * Returns a null-prototype snapshot of the *own* enumerable fields, so every
 * later read observes own data only: an inherited substitute (for example
 * `Object.prototype.currency = "USD"`) can never satisfy a required field, and
 * unknown own fields are rejected in the same pass.
 */
export function strictObject(
  raw: unknown,
  context: string,
  allowedKeys: readonly string[]
): Record<string, unknown> {
  const snapshot = ownFieldSnapshot(raw, context);
  for (const key of allowedKeys) {
    requireField(snapshot, key, context);
  }
  assertNoExtraKeys(snapshot, allowedKeys, context);
  return snapshot;
}

// Request / Response Wire Envelopes
export interface RequestEnvelope<T = Record<string, unknown>> {
  readonly version: 1;
  readonly seq: Positive;
  readonly operation: Id;
  readonly payload: T;
}

export interface ResponseSuccessEnvelope<T = Record<string, unknown>> {
  readonly version: 1;
  readonly seq: Positive;
  readonly ok: true;
  readonly result: T;
}

export interface ResponseErrorEnvelope {
  readonly version: 1;
  readonly seq: Positive;
  readonly ok: false;
  readonly error: {
    readonly code: ErrorCode;
    readonly message: string;
  };
}

export type ResponseEnvelope<T = Record<string, unknown>> =
  | ResponseSuccessEnvelope<T>
  | ResponseErrorEnvelope;

export function parseRequestEnvelope<T = Record<string, unknown>>(raw: unknown): RequestEnvelope<T> {
  const obj = ownFieldSnapshot(raw, "RequestEnvelope");
  for (const key of ["version", "seq", "operation", "payload"] as const) {
    requireField(obj, key, "RequestEnvelope");
  }
  assertNoExtraKeys(obj, ["version", "seq", "operation", "payload"], "RequestEnvelope");

  if (obj.version !== 1) {
    throw new Error(`Invalid request version: expected 1, got ${String(obj.version)}`);
  }
  const seq = validatePositive(obj.seq, "seq");
  const operation = validateId(obj.operation, "operation");
  const payload = assertPlainObject(obj.payload, "RequestEnvelope.payload");

  return {
    version: 1,
    seq,
    operation,
    payload: payload as T,
  };
}

export function parseResponseEnvelope<T = Record<string, unknown>>(raw: unknown): ResponseEnvelope<T> {
  const obj = ownFieldSnapshot(raw, "ResponseEnvelope");
  for (const key of ["version", "seq", "ok"] as const) {
    requireField(obj, key, "ResponseEnvelope");
  }
  if (obj.version !== 1) {
    throw new Error(`Invalid response version: expected 1, got ${String(obj.version)}`);
  }
  const seq = validatePositive(obj.seq, "seq");
  if (typeof obj.ok !== "boolean") {
    throw new Error("Response envelope 'ok' must be boolean");
  }

  if (obj.ok) {
    requireField(obj, "result", "ResponseSuccessEnvelope");
    assertNoExtraKeys(obj, ["version", "seq", "ok", "result"], "ResponseSuccessEnvelope");
    const result = assertPlainObject(obj.result, "ResponseSuccessEnvelope.result");
    return {
      version: 1,
      seq,
      ok: true,
      result: result as T,
    };
  }

  requireField(obj, "error", "ResponseErrorEnvelope");
  assertNoExtraKeys(obj, ["version", "seq", "ok", "error"], "ResponseErrorEnvelope");
  const errSnapshot = ownFieldSnapshot(obj.error, "ResponseError");
  requireField(errSnapshot, "code", "ResponseError");
  requireField(errSnapshot, "message", "ResponseError");
  assertNoExtraKeys(errSnapshot, ["code", "message"], "ResponseError");

  const code = errSnapshot.code;
  if (typeof code !== "string" || !(ERROR_CODES as readonly string[]).includes(code)) {
    throw new Error(`Invalid error code: ${String(code)}`);
  }
  const message = validateStringBound(errSnapshot.message, "error.message", MAX_STRING_BYTES);

  return {
    version: 1,
    seq,
    ok: false,
    error: {
      code: code as ErrorCode,
      message,
    },
  };
}

// Wire functions alias for Provider socket protocols (same framing per SRS)
export const parseProviderRequestEnvelope = parseRequestEnvelope;
export const parseProviderResponseEnvelope = parseResponseEnvelope;

/**
 * Byte-bounded JSONL frame codec.
 *
 * Per-frame byte budget is charged before any accumulation, so a single chunk may
 * legitimately carry several bounded frames or be larger than one frame in total.
 * Fails closed on: oversized frame, blank frame, malformed UTF-8, and an
 * unterminated remainder at end of stream. Multibyte characters split across
 * chunks are preserved because decoding happens only on complete frames.
 */
export class JsonlFrameCodec {
  private readonly maxFrameBytes: number;
  private readonly decoder = new TextDecoder("utf-8", { fatal: true });
  private buffer: Buffer = Buffer.alloc(0);

  constructor(options: { maxFrameBytes?: number } = {}) {
    const max = options.maxFrameBytes ?? MAX_FRAME_BYTES;
    if (typeof max !== "number" || !Number.isSafeInteger(max) || max <= 0 || max > MAX_FRAME_BYTES) {
      throw new Error(
        `Invalid maxFrameBytes: must be a positive safe integer <= ${MAX_FRAME_BYTES}, got ${String(max)}`
      );
    }
    this.maxFrameBytes = max;
  }

  public get maxFrameSize(): number {
    return this.maxFrameBytes;
  }

  public bufferedBytes(): number {
    return this.buffer.length;
  }

  public feed(chunk: Buffer | Uint8Array): string[] {
    if (!(chunk instanceof Uint8Array)) {
      throw new Error("JsonlFrameCodec.feed requires Buffer or Uint8Array bytes");
    }
    const frames: string[] = [];
    let offset = 0;

    while (offset <= chunk.length) {
      const newlineIndex = chunk.indexOf(0x0a, offset);
      const segmentEnd = newlineIndex === -1 ? chunk.length : newlineIndex;
      const segmentLength = segmentEnd - offset;

      if (this.buffer.length + segmentLength > this.maxFrameBytes) {
        throw new Error(
          `Frame size (${this.buffer.length + segmentLength} bytes) exceeds maximum limit (${this.maxFrameBytes} bytes)`
        );
      }
      if (segmentLength > 0) {
        const segment = Buffer.from(chunk.subarray(offset, segmentEnd));
        this.buffer = this.buffer.length === 0 ? segment : Buffer.concat([this.buffer, segment]);
      }
      if (newlineIndex === -1) {
        return frames;
      }

      frames.push(this.decodeFrame(this.buffer));
      this.buffer = Buffer.alloc(0);
      offset = newlineIndex + 1;
    }

    return frames;
  }

  /**
   * End of input. Any remaining bytes are an unterminated frame and fail closed.
   */
  public finish(): void {
    if (this.buffer.length !== 0) {
      throw new Error(
        `Unterminated frame at end of stream: ${this.buffer.length} byte(s) without a newline terminator`
      );
    }
  }

  private decodeFrame(frameBytes: Buffer): string {
    const body =
      frameBytes.length > 0 && frameBytes[frameBytes.length - 1] === 0x0d
        ? frameBytes.subarray(0, frameBytes.length - 1)
        : frameBytes;

    if (body.length === 0) {
      throw new Error("Blank frame rejected: every line must carry exactly one JSON object");
    }

    let text: string;
    try {
      text = this.decoder.decode(body);
    } catch {
      throw new Error("Frame contains malformed UTF-8 bytes");
    }

    if (text.trim().length === 0) {
      throw new Error("Blank frame rejected: every line must carry exactly one JSON object");
    }
    return text;
  }
}

/**
 * Single-flight session state tracker.
 * Enforces seq 1 starting sequence, monotonic increments, strictly one in-flight request,
 * correlated responses, and resets only on new-process session boundary.
 */
export class SingleFlightSessionTracker {
  private expectedRequestSeq = 1;
  private inFlightRequest: { seq: number; operation: string } | null = null;

  public recordRequest(req: RequestEnvelope<unknown>): void {
    if (this.inFlightRequest !== null) {
      throw new Error(
        `Cannot send request with seq ${req.seq} while previous request (${this.inFlightRequest.operation} seq ${this.inFlightRequest.seq}) is in-flight`
      );
    }
    if (req.seq !== this.expectedRequestSeq) {
      throw new Error(
        `Invalid request sequence: expected seq ${this.expectedRequestSeq}, got ${req.seq}`
      );
    }
    this.inFlightRequest = { seq: req.seq, operation: req.operation };
  }

  public recordResponse(res: ResponseEnvelope<unknown>): void {
    if (this.inFlightRequest === null) {
      throw new Error(`Received unexpected response for seq ${res.seq} with no request in-flight`);
    }
    if (res.seq !== this.inFlightRequest.seq) {
      throw new Error(
        `Response sequence mismatch: expected response for in-flight seq ${this.inFlightRequest.seq}, got seq ${res.seq}`
      );
    }
    // Request settled
    this.inFlightRequest = null;
    this.expectedRequestSeq += 1;
  }

  public resetSession(): void {
    this.expectedRequestSeq = 1;
    this.inFlightRequest = null;
  }

  public hasInFlight(): boolean {
    return this.inFlightRequest !== null;
  }

  public getExpectedSeq(): number {
    return this.expectedRequestSeq;
  }
}

// ==========================================
// 1. Payment Schemas
// ==========================================
export type PaymentState = "unknown" | "succeeded" | "failed";

export interface PaymentView {
  readonly instruction_id: Id;
  readonly state: PaymentState;
  readonly evidence_ids: readonly Id[];
}

export interface PaymentSubmitPayload {
  readonly instruction_id: Id;
  readonly amount_minor: Positive;
  readonly currency: "USD";
}

export interface PaymentInspectPayload {
  readonly instruction_id: Id;
}

export interface PaymentRecoverPayload {
  readonly instruction_id: Id;
}

export interface ProviderDebitPayload {
  readonly instruction_id: Id;
  readonly operation_ref: Id;
  readonly amount_minor: Positive;
  readonly currency: "USD";
}

export interface ProviderDebitResult {
  readonly evidence_id: Id;
  readonly outcome: "succeeded" | "failed";
}

export interface ProviderLookupPayload {
  readonly operation_ref: Id;
}

export interface ProviderLookupResult {
  readonly evidence_id: Id;
  readonly outcome: "pending" | "succeeded" | "failed" | "not_found";
}

export interface ProviderSettlementPayload {
  readonly instruction_id: Id;
}

export interface ProviderSettlementResult {
  readonly evidence_id: Id;
  readonly final: boolean;
  readonly outcome: "succeeded" | "failed" | "absent";
}

export type ProviderPayload =
  | ProviderDebitPayload
  | ProviderLookupPayload
  | ProviderSettlementPayload;

export type ProviderResult =
  | ProviderDebitResult
  | ProviderLookupResult
  | ProviderSettlementResult;

export function validateProviderPayload(
  op: "debit" | "lookup" | "settlement",
  payload: Record<string, unknown>
): ProviderPayload {
  switch (op) {
    case "debit": {
      const p = strictObject(payload, "ProviderDebitPayload", [
        "instruction_id",
        "operation_ref",
        "amount_minor",
        "currency",
      ]);
      const instruction_id = validateId(p.instruction_id, "instruction_id");
      const operation_ref = validateId(p.operation_ref, "operation_ref");
      const amount_minor = validatePositive(p.amount_minor, "amount_minor");
      if (p.currency !== "USD") {
        throw new Error(`Invalid currency: expected 'USD', got ${String(p.currency)}`);
      }
      return { instruction_id, operation_ref, amount_minor, currency: "USD" };
    }
    case "lookup": {
      const p = strictObject(payload, "ProviderLookupPayload", ["operation_ref"]);
      return { operation_ref: validateId(p.operation_ref, "operation_ref") };
    }
    case "settlement": {
      const p = strictObject(payload, "ProviderSettlementPayload", ["instruction_id"]);
      return { instruction_id: validateId(p.instruction_id, "instruction_id") };
    }
    default:
      throw new Error(`Unknown provider operation: ${op}`);
  }
}

export function validateProviderResult(
  op: "debit" | "lookup" | "settlement",
  result: Record<string, unknown>
): ProviderResult {
  switch (op) {
    case "debit": {
      const r = strictObject(result, "ProviderDebitResult", ["evidence_id", "outcome"]);
      const evidence_id = validateId(r.evidence_id, "evidence_id");
      const outcome = r.outcome;
      if (outcome !== "succeeded" && outcome !== "failed") {
        throw new Error(`Invalid debit outcome: expected succeeded|failed, got ${String(outcome)}`);
      }
      return { evidence_id, outcome };
    }
    case "lookup": {
      const r = strictObject(result, "ProviderLookupResult", ["evidence_id", "outcome"]);
      const evidence_id = validateId(r.evidence_id, "evidence_id");
      const outcome = r.outcome;
      if (outcome !== "pending" && outcome !== "succeeded" && outcome !== "failed" && outcome !== "not_found") {
        throw new Error(`Invalid lookup outcome: expected pending|succeeded|failed|not_found, got ${String(outcome)}`);
      }
      return { evidence_id, outcome };
    }
    case "settlement": {
      const r = strictObject(result, "ProviderSettlementResult", ["evidence_id", "final", "outcome"]);
      const evidence_id = validateId(r.evidence_id, "evidence_id");
      if (typeof r.final !== "boolean") {
        throw new Error("settlement result 'final' must be a boolean");
      }
      const outcome = r.outcome;
      if (outcome !== "succeeded" && outcome !== "failed" && outcome !== "absent") {
        throw new Error(`Invalid settlement outcome: expected succeeded|failed|absent, got ${String(outcome)}`);
      }
      return { evidence_id, final: r.final, outcome };
    }
    default:
      throw new Error(`Unknown provider operation: ${op}`);
  }
}

export interface SummarizerPayload {
  readonly request_id: Id;
  readonly connection_id: Id;
  readonly message_ids: readonly Id[];
}

export interface SummarizerResult {
  readonly request_id: Id;
  readonly status: "completed";
}

export function validateSummarizerPayload(
  op: "summarize",
  payload: Record<string, unknown>
): SummarizerPayload {
  if (op !== "summarize") {
    throw new Error(`Unknown summarizer operation: ${op}`);
  }
  const p = strictObject(payload, "SummarizerPayload", [
    "request_id",
    "connection_id",
    "message_ids",
  ]);
  const request_id = validateId(p.request_id, "request_id");
  const connection_id = validateId(p.connection_id, "connection_id");
  if (!Array.isArray(p.message_ids)) {
    throw new Error("Summarizer payload message_ids must be an array");
  }
  if (p.message_ids.length > MAX_LIST_ENTRIES) {
    throw new Error(`message_ids length exceeds limit of ${MAX_LIST_ENTRIES}`);
  }
  const seen = new Set<string>();
  const message_ids: Id[] = [];
  for (const item of p.message_ids) {
    const id = validateId(item, "message_id");
    if (seen.has(id)) {
      throw new Error(`Duplicate message_id in summarizer request: ${id}`);
    }
    seen.add(id);
    message_ids.push(id);
  }
  return { request_id, connection_id, message_ids };
}

export function validateSummarizerResult(
  op: "summarize",
  result: Record<string, unknown>
): SummarizerResult {
  if (op !== "summarize") {
    throw new Error(`Unknown summarizer operation: ${op}`);
  }
  const r = strictObject(result, "SummarizerResult", ["request_id", "status"]);
  const request_id = validateId(r.request_id, "request_id");
  if (r.status !== "completed") {
    throw new Error(`Invalid summarizer result status: expected completed, got ${String(r.status)}`);
  }
  return { request_id, status: "completed" };
}

export function validatePaymentPayload(
  op: "submit" | "inspect" | "recover",
  payload: Record<string, unknown>
): PaymentSubmitPayload | PaymentInspectPayload | PaymentRecoverPayload {
  if (op === "submit") {
    const p = strictObject(payload, "PaymentSubmitPayload", [
      "instruction_id",
      "amount_minor",
      "currency",
    ]);
    const instruction_id = validateId(p.instruction_id, "instruction_id");
    const amount_minor = validatePositive(p.amount_minor, "amount_minor");
    if (p.currency !== "USD") {
      throw new Error(`Invalid currency: expected 'USD', got ${String(p.currency)}`);
    }
    return { instruction_id, amount_minor, currency: "USD" };
  } else if (op === "inspect" || op === "recover") {
    const p = strictObject(payload, `Payment${op}Payload`, ["instruction_id"]);
    return { instruction_id: validateId(p.instruction_id, "instruction_id") };
  }
  throw new Error(`Unknown payment operation: ${op}`);
}

export function validatePaymentResult(
  _op: "submit" | "inspect" | "recover",
  result: Record<string, unknown>
): PaymentView {
  const r = strictObject(result, "PaymentView", ["instruction_id", "state", "evidence_ids"]);
  const instruction_id = validateId(r.instruction_id, "instruction_id");
  const state = r.state;
  if (state !== "unknown" && state !== "succeeded" && state !== "failed") {
    throw new Error(`Invalid payment state: expected 'unknown'|'succeeded'|'failed', got ${String(state)}`);
  }
  if (!Array.isArray(r.evidence_ids)) {
    throw new Error("evidence_ids must be an array");
  }
  if (r.evidence_ids.length > MAX_LIST_ENTRIES) {
    throw new Error(`evidence_ids length exceeds maximum bound ${MAX_LIST_ENTRIES}`);
  }
  const seen = new Set<string>();
  const evidence_ids: Id[] = [];
  for (const item of r.evidence_ids) {
    const id = validateId(item, "evidence_id");
    if (seen.has(id)) {
      throw new Error(`Duplicate evidence_id detected: ${id}`);
    }
    seen.add(id);
    evidence_ids.push(id);
  }
  return { instruction_id, state, evidence_ids };
}

// ==========================================
// 2. Tenant Schemas
// ==========================================
export interface TenantDoc {
  readonly document_id: Id;
  readonly owner: Id;
  readonly content: string;
}

export interface TenantItem {
  readonly document_id: Id;
  readonly owner: Id;
  readonly content: string;
}

export interface TenantTrace {
  readonly retrieved: readonly TenantItem[];
  readonly reranked: readonly TenantItem[];
  readonly cached: readonly TenantItem[];
}

function validateDoc(raw: unknown, context: string): TenantDoc {
  const obj = strictObject(raw, context, ["document_id", "owner", "content"]);
  const document_id = validateId(obj.document_id, `${context}.document_id`);
  const owner = validateId(obj.owner, `${context}.owner`);
  const content = validateStringBound(obj.content, `${context}.content`, MAX_STRING_BYTES);
  return { document_id, owner, content };
}

function validateItemList(items: unknown, context: string): TenantItem[] {
  if (!Array.isArray(items)) {
    throw new Error(`${context} must be an array`);
  }
  if (items.length > MAX_LIST_ENTRIES) {
    throw new Error(`${context} length exceeds max ${MAX_LIST_ENTRIES}`);
  }
  const seenIds = new Set<string>();
  const res: TenantItem[] = [];
  for (const it of items) {
    const item = validateDoc(it, `${context}.item`);
    if (seenIds.has(item.document_id)) {
      throw new Error(`Duplicate document_id in ${context}: ${item.document_id}`);
    }
    seenIds.add(item.document_id);
    res.push(item);
  }
  return res;
}

function validateTrace(raw: unknown): TenantTrace {
  const obj = strictObject(raw, "TenantTrace", ["retrieved", "reranked", "cached"]);
  return {
    retrieved: validateItemList(obj.retrieved, "trace.retrieved"),
    reranked: validateItemList(obj.reranked, "trace.reranked"),
    cached: validateItemList(obj.cached, "trace.cached"),
  };
}

export type TenantPayload =
  | { readonly document: TenantDoc }
  | { readonly tenant: Id; readonly query: string }
  | { readonly document_id: Id; readonly derived_owner: Id }
  | { readonly tenant: Id; readonly document_id: Id }
  | { readonly tenant: Id }
  | { readonly tenant: Id; readonly snapshot_id: Id };

export function validateTenantPayload(
  op: "ingest" | "query" | "reindex" | "revoke" | "export" | "restore",
  payload: Record<string, unknown>
): TenantPayload {
  switch (op) {
    case "ingest": {
      const p = strictObject(payload, "TenantIngestPayload", ["document"]);
      return { document: validateDoc(p.document, "document") };
    }
    case "query": {
      const p = strictObject(payload, "TenantQueryPayload", ["tenant", "query"]);
      return {
        tenant: validateId(p.tenant, "tenant"),
        query: validateStringBound(p.query, "query"),
      };
    }
    case "reindex": {
      const p = strictObject(payload, "TenantReindexPayload", ["document_id", "derived_owner"]);
      return {
        document_id: validateId(p.document_id, "document_id"),
        derived_owner: validateId(p.derived_owner, "derived_owner"),
      };
    }
    case "revoke": {
      const p = strictObject(payload, "TenantRevokePayload", ["tenant", "document_id"]);
      return {
        tenant: validateId(p.tenant, "tenant"),
        document_id: validateId(p.document_id, "document_id"),
      };
    }
    case "export": {
      const p = strictObject(payload, "TenantExportPayload", ["tenant"]);
      return { tenant: validateId(p.tenant, "tenant") };
    }
    case "restore": {
      const p = strictObject(payload, "TenantRestorePayload", ["tenant", "snapshot_id"]);
      return {
        tenant: validateId(p.tenant, "tenant"),
        snapshot_id: validateId(p.snapshot_id, "snapshot_id"),
      };
    }
    default:
      throw new Error(`Unknown tenant operation: ${op}`);
  }
}

export type TenantResult =
  | { readonly document_id: Id }
  | { readonly items: readonly TenantItem[]; readonly trace: TenantTrace }
  | { readonly document_id: Id; readonly status: "applied" | "quarantined" }
  | { readonly document_id: Id; readonly revocation_id: Id }
  | { readonly items: readonly TenantItem[]; readonly snapshot_id: Id }
  | { readonly items: readonly TenantItem[]; readonly trace: TenantTrace };

export function validateTenantResult(
  op: "ingest" | "query" | "reindex" | "revoke" | "export" | "restore",
  result: Record<string, unknown>
): TenantResult {
  switch (op) {
    case "ingest": {
      const r = strictObject(result, "TenantIngestResult", ["document_id"]);
      return { document_id: validateId(r.document_id, "document_id") };
    }
    case "query": {
      const r = strictObject(result, "TenantQueryResult", ["items", "trace"]);
      return {
        items: validateItemList(r.items, "query.items"),
        trace: validateTrace(r.trace),
      };
    }
    case "reindex": {
      const r = strictObject(result, "TenantReindexResult", ["document_id", "status"]);
      const status = r.status;
      if (status !== "applied" && status !== "quarantined") {
        throw new Error(`Invalid reindex status: expected applied|quarantined, got ${String(status)}`);
      }
      return {
        document_id: validateId(r.document_id, "document_id"),
        status,
      };
    }
    case "revoke": {
      const r = strictObject(result, "TenantRevokeResult", ["document_id", "revocation_id"]);
      return {
        document_id: validateId(r.document_id, "document_id"),
        revocation_id: validateId(r.revocation_id, "revocation_id"),
      };
    }
    case "export": {
      const r = strictObject(result, "TenantExportResult", ["items", "snapshot_id"]);
      return {
        items: validateItemList(r.items, "export.items"),
        snapshot_id: validateId(r.snapshot_id, "snapshot_id"),
      };
    }
    case "restore": {
      const r = strictObject(result, "TenantRestoreResult", ["items", "trace"]);
      return {
        items: validateItemList(r.items, "restore.items"),
        trace: validateTrace(r.trace),
      };
    }
    default:
      throw new Error(`Unknown tenant operation: ${op}`);
  }
}

// ==========================================
// 3. Overload Schemas
// ==========================================
export interface OverloadLimits {
  readonly max_connections: Positive;
  readonly max_buffer_bytes_per_connection: Positive;
  readonly drain_deadline_ms: Positive;
  readonly max_retries_per_request: Nat;
}

export function validateOverloadLimits(raw: unknown): OverloadLimits {
  const obj = strictObject(raw, "OverloadLimits", [
    "max_connections",
    "max_buffer_bytes_per_connection",
    "drain_deadline_ms",
    "max_retries_per_request",
  ]);
  const limits: OverloadLimits = {
    max_connections: validatePositive(obj.max_connections, "max_connections"),
    max_buffer_bytes_per_connection: validatePositive(
      obj.max_buffer_bytes_per_connection,
      "max_buffer_bytes_per_connection"
    ),
    drain_deadline_ms: validatePositive(obj.drain_deadline_ms, "drain_deadline_ms"),
    max_retries_per_request: validateNat(obj.max_retries_per_request, "max_retries_per_request"),
  };

  for (const key of [
    "max_connections",
    "max_buffer_bytes_per_connection",
    "drain_deadline_ms",
    "max_retries_per_request",
  ] as const) {
    const ceiling = OVERLOAD_LIMIT_CEILINGS[key];
    if (limits[key] > ceiling) {
      throw new Error(
        `Overload limit '${key}' (${limits[key]}) exceeds accepted diagnostic policy ceiling (${ceiling})`
      );
    }
  }
  return limits;
}

export type OverloadPayload =
  | { readonly connection_id: Id }
  | { readonly connection_id: Id; readonly message_id: Id; readonly bytes: Positive }
  | { readonly connection_id: Id; readonly max_bytes: Positive }
  | Record<string, never>;

export function validateOverloadPayload(
  op: "open" | "send" | "read" | "close" | "drain" | "status",
  payload: Record<string, unknown>
): OverloadPayload {
  switch (op) {
    case "open": {
      const p = strictObject(payload, "OverloadOpenPayload", ["connection_id"]);
      return { connection_id: validateId(p.connection_id, "connection_id") };
    }
    case "send": {
      const p = strictObject(payload, "OverloadSendPayload", [
        "connection_id",
        "message_id",
        "bytes",
      ]);
      const connection_id = validateId(p.connection_id, "connection_id");
      const message_id = validateId(p.message_id, "message_id");
      const bytes = validatePositive(p.bytes, "bytes");
      if (bytes > MAX_FRAME_BYTES) {
        throw new Error(`send bytes (${bytes}) exceeds maximum allowed (${MAX_FRAME_BYTES})`);
      }
      return { connection_id, message_id, bytes };
    }
    case "read": {
      const p = strictObject(payload, "OverloadReadPayload", ["connection_id", "max_bytes"]);
      const connection_id = validateId(p.connection_id, "connection_id");
      const max_bytes = validatePositive(p.max_bytes, "max_bytes");
      if (max_bytes > MAX_FRAME_BYTES) {
        throw new Error(`read max_bytes (${max_bytes}) exceeds maximum allowed (${MAX_FRAME_BYTES})`);
      }
      return { connection_id, max_bytes };
    }
    case "close": {
      const p = strictObject(payload, "OverloadClosePayload", ["connection_id"]);
      return { connection_id: validateId(p.connection_id, "connection_id") };
    }
    case "drain": {
      strictObject(payload, "OverloadDrainPayload", []);
      return {};
    }
    case "status": {
      strictObject(payload, "OverloadStatusPayload", []);
      return {};
    }
    default:
      throw new Error(`Unknown overload operation: ${op}`);
  }
}

export type OverloadResult =
  | { readonly connection_id: Id; readonly admitted: boolean; readonly limits: OverloadLimits }
  | { readonly message_id: Id; readonly status: "accepted" | "rejected" }
  | { readonly delivered: readonly { readonly message_id: Id; readonly bytes: Positive }[]; readonly closed: boolean }
  | { readonly connection_id: Id; readonly closed: true }
  | { readonly terminated: boolean; readonly undelivered_count: Nat }
  | {
      readonly limits: OverloadLimits;
      readonly active_connections: Nat;
      readonly buffered_bytes: Nat;
      readonly dropped_count: Nat;
      readonly capacity_rps: Nat;
    };

export function validateOverloadResult(
  op: "open" | "send" | "read" | "close" | "drain" | "status",
  result: Record<string, unknown>
): OverloadResult {
  switch (op) {
    case "open": {
      const r = strictObject(result, "OverloadOpenResult", ["connection_id", "admitted", "limits"]);
      if (typeof r.admitted !== "boolean") {
        throw new Error("admitted must be boolean");
      }
      return {
        connection_id: validateId(r.connection_id, "connection_id"),
        admitted: r.admitted,
        limits: validateOverloadLimits(r.limits),
      };
    }
    case "send": {
      const r = strictObject(result, "OverloadSendResult", ["message_id", "status"]);
      const status = r.status;
      if (status !== "accepted" && status !== "rejected") {
        throw new Error(`Invalid status: expected accepted|rejected, got ${String(status)}`);
      }
      return {
        message_id: validateId(r.message_id, "message_id"),
        status,
      };
    }
    case "read": {
      const r = strictObject(result, "OverloadReadResult", ["delivered", "closed"]);
      if (typeof r.closed !== "boolean") {
        throw new Error("closed must be boolean");
      }
      if (!Array.isArray(r.delivered)) {
        throw new Error("delivered must be array");
      }
      if (r.delivered.length > MAX_LIST_ENTRIES) {
        throw new Error(`delivered entries exceed limit ${MAX_LIST_ENTRIES}`);
      }
      const seenMsgIds = new Set<string>();
      const delivered = r.delivered.map((entry: unknown, idx: number) => {
        const o = strictObject(entry, `delivered[${idx}]`, ["message_id", "bytes"]);
        const message_id = validateId(o.message_id, `delivered[${idx}].message_id`);
        if (seenMsgIds.has(message_id)) {
          throw new Error(`Duplicate message_id in delivered: ${message_id}`);
        }
        seenMsgIds.add(message_id);
        const bytes = validatePositive(o.bytes, `delivered[${idx}].bytes`);
        if (bytes > MAX_FRAME_BYTES) {
          throw new Error(
            `delivered[${idx}].bytes (${bytes}) exceeds maximum frame size ${MAX_FRAME_BYTES}`
          );
        }
        return { message_id, bytes };
      });
      return { delivered, closed: r.closed };
    }
    case "close": {
      const r = strictObject(result, "OverloadCloseResult", ["connection_id", "closed"]);
      if (r.closed !== true) {
        throw new Error("close result 'closed' must be true");
      }
      return {
        connection_id: validateId(r.connection_id, "connection_id"),
        closed: true as const,
      };
    }
    case "drain": {
      const r = strictObject(result, "OverloadDrainResult", ["terminated", "undelivered_count"]);
      if (typeof r.terminated !== "boolean") {
        throw new Error("terminated must be boolean");
      }
      return {
        terminated: r.terminated,
        undelivered_count: validateNat(r.undelivered_count, "undelivered_count"),
      };
    }
    case "status": {
      const r = strictObject(result, "OverloadStatusResult", [
        "limits",
        "active_connections",
        "buffered_bytes",
        "dropped_count",
        "capacity_rps",
      ]);
      return {
        limits: validateOverloadLimits(r.limits),
        active_connections: validateNat(r.active_connections, "active_connections"),
        buffered_bytes: validateNat(r.buffered_bytes, "buffered_bytes"),
        dropped_count: validateNat(r.dropped_count, "dropped_count"),
        capacity_rps: validateNat(r.capacity_rps, "capacity_rps"),
      };
    }
    default:
      throw new Error(`Unknown overload operation: ${op}`);
  }
}
