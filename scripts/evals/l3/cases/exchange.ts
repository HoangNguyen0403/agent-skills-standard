import type {
  Id,
  Positive,
  RequestEnvelope,
  ResponseEnvelope,
} from "../contracts.js";
import {
  parseRequestEnvelope,
  parseResponseEnvelope,
  SingleFlightSessionTracker,
  MAX_FRAME_BYTES,
} from "../contracts.js";
import type { CandidateTransport, TransportSideband } from "./contracts.js";

/**
 * scripts/evals/l3/cases/exchange.ts
 *
 * Shared strict exchange layer for all three case drivers (SRS LLD-SSE-003,
 * review F1). Responsibilities:
 *
 * - Build and byte-bound outbound envelopes; run D1 envelope parsing.
 * - Run the caller-supplied D1 operation payload validator before dispatch and
 *   the D1 operation result validator after receipt (codec output is text, not
 *   semantically validated messages).
 * - Enforce single-flight monotonic sequence correlation via the D1 tracker.
 * - Bound transport completion with a real timer that is always cleared, so a
 *   hanging transport cannot leak a timer or hang the attempt.
 * - Make the process/session boundary explicit: a restarted candidate process
 *   reopens at seq 1 through `beginProcessSession()`.
 * - Bound the number of exchanges per session.
 *
 * Any protocol, deadline or transport violation throws `ExchangeFailure`; the
 * drivers classify it as a failure. There is no silent retry.
 */

export type ExchangeFailureKind = "protocol" | "deadline" | "transport";

export class ExchangeFailure extends Error {
  public constructor(
    public readonly kind: ExchangeFailureKind,
    public readonly operation: Id,
    public readonly seq: Positive,
    message: string
  ) {
    super(message);
    this.name = "ExchangeFailure";
  }
}

export type PayloadValidator = (operation: Id, payload: Record<string, unknown>) => void;
export type ResultValidator = (operation: Id, result: Record<string, unknown>) => void;

/** Bounded, envelope-validated response returned by every exchange. */
export type ExchangeResponse = ResponseEnvelope<Record<string, unknown>>;

export interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}

/**
 * `Promise.withResolvers` equivalent. The helper exists because the repository
 * targets the ES2022 lib, which does not declare that method; the executor form
 * is required here to hand the resolvers to a timer callback.
 */
export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export interface ExchangeOptions {
  /** Default per-call deadline. SRS: 5 s, except `drain` at 10 s. */
  readonly defaultTimeoutMs?: number;
  /** Hard cap on exchanges in one process session. */
  readonly maxExchanges?: number;
}

export interface ExchangeCallOptions {
  readonly sideband?: TransportSideband;
  readonly timeoutMs?: number;
  readonly validatePayload?: PayloadValidator;
  readonly validateResult?: ResultValidator;
}

export const DEFAULT_EXCHANGE_TIMEOUT_MS = 5000;
export const MAX_EXCHANGES_PER_SESSION = 32768;

export class StrictExchangeSession {
  private readonly tracker = new SingleFlightSessionTracker();
  private readonly transport: CandidateTransport;
  private readonly defaultTimeoutMs: number;
  private readonly maxExchanges: number;

  private exchangeCount = 0;
  private sessionCount = 0;
  private poisoned = false;
  private poisonReason = "";

  public constructor(transport: CandidateTransport, options: ExchangeOptions = {}) {
    this.transport = transport;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_EXCHANGE_TIMEOUT_MS;
    this.maxExchanges = options.maxExchanges ?? MAX_EXCHANGES_PER_SESSION;
    if (!Number.isSafeInteger(this.defaultTimeoutMs) || this.defaultTimeoutMs <= 0) {
      throw new Error("StrictExchangeSession defaultTimeoutMs must be a positive integer");
    }
    if (!Number.isSafeInteger(this.maxExchanges) || this.maxExchanges <= 0) {
      throw new Error("StrictExchangeSession maxExchanges must be a positive integer");
    }
  }

  /**
   * Explicit process/session boundary. Every fault schedule starts a new
   * candidate process; the sequence expected from it starts at 1 again.
   */
  public beginProcessSession(): void {
    // A new candidate process owns no state from the previous one: any in-flight
    // request died with it, so the tracker is discarded rather than carried over.
    this.tracker.resetSession();
    this.exchangeCount = 0;
    this.sessionCount += 1;
    this.poisoned = false;
    this.poisonReason = "";
  }

  public get expectedSeq(): number {
    return this.tracker.getExpectedSeq();
  }

  public get exchanges(): number {
    return this.exchangeCount;
  }

  public get sessions(): number {
    return this.sessionCount;
  }

  public get isPoisoned(): boolean {
    return this.poisoned;
  }

  public async call(
    operation: Id,
    payload: Record<string, unknown>,
    options: ExchangeCallOptions = {}
  ): Promise<ExchangeResponse> {
    const seq = this.tracker.getExpectedSeq();

    if (this.poisoned) {
      throw new ExchangeFailure(
        "protocol",
        operation,
        seq,
        `session already failed: ${this.poisonReason}`
      );
    }
    if (this.exchangeCount >= this.maxExchanges) {
      throw new ExchangeFailure(
        "protocol",
        operation,
        seq,
        `exchange cap (${this.maxExchanges}) exhausted for this session`
      );
    }

    const request: RequestEnvelope = { version: 1, seq, operation, payload };

    try {
      parseRequestEnvelope(request);
    } catch (err) {
      throw this.fail("protocol", operation, seq, `outbound envelope rejected: ${(err as Error).message}`);
    }

    if (options.validatePayload) {
      try {
        options.validatePayload(operation, request.payload as Record<string, unknown>);
      } catch (err) {
        throw this.fail(
          "protocol",
          operation,
          seq,
          `outbound payload rejected: ${(err as Error).message}`
        );
      }
    }

    const wireJson = JSON.stringify(request);
    const outboundBytes = Buffer.byteLength(wireJson, "utf8");
    if (outboundBytes > MAX_FRAME_BYTES) {
      throw this.fail(
        "protocol",
        operation,
        seq,
        `outbound frame is ${outboundBytes} bytes (max ${MAX_FRAME_BYTES})`
      );
    }

    this.tracker.recordRequest(request as RequestEnvelope<unknown>);

    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
      throw this.fail("protocol", operation, seq, `invalid deadline ${String(timeoutMs)}`);
    }

    const { promise: deadline, reject: rejectDeadline } = deferred<never>();
    const timer = setTimeout(() => {
      rejectDeadline(
        new ExchangeFailure(
          "deadline",
          operation,
          seq,
          `no response for operation '${operation}' seq ${seq} within ${timeoutMs}ms`
        )
      );
    }, timeoutMs);

    let rawResponse: string;
    try {
      rawResponse = await Promise.race([
        this.transport.sendRawRequest(wireJson, options.sideband, timeoutMs),
        deadline,
      ]);
    } catch (err) {
      const failure =
        err instanceof ExchangeFailure
          ? err
          : new ExchangeFailure(
              "transport",
              operation,
              seq,
              `transport failed for operation '${operation}' seq ${seq}: ${(err as Error).message}`
            );
      throw this.fail(failure.kind, operation, seq, failure.message);
    } finally {
      clearTimeout(timer);
    }

    this.exchangeCount += 1;

    const inboundBytes = Buffer.byteLength(rawResponse, "utf8");
    if (inboundBytes > MAX_FRAME_BYTES) {
      throw this.fail(
        "protocol",
        operation,
        seq,
        `inbound frame is ${inboundBytes} bytes (max ${MAX_FRAME_BYTES})`
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      throw this.fail("protocol", operation, seq, "inbound response is not valid JSON");
    }

    let envelope: ResponseEnvelope<Record<string, unknown>>;
    try {
      envelope = parseResponseEnvelope<Record<string, unknown>>(parsed);
    } catch (err) {
      throw this.fail("protocol", operation, seq, `inbound envelope rejected: ${(err as Error).message}`);
    }

    try {
      this.tracker.recordResponse(envelope as ResponseEnvelope<unknown>);
    } catch (err) {
      throw this.fail("protocol", operation, seq, `sequence violation: ${(err as Error).message}`);
    }

    if (envelope.ok && options.validateResult) {
      try {
        options.validateResult(operation, envelope.result);
      } catch (err) {
        throw this.fail(
          "protocol",
          operation,
          seq,
          `result rejected for operation '${operation}': ${(err as Error).message}`
        );
      }
    }

    return envelope;
  }

  private fail(
    kind: ExchangeFailureKind,
    operation: Id,
    seq: Positive,
    message: string
  ): ExchangeFailure {
    this.poisoned = true;
    this.poisonReason = message;
    return new ExchangeFailure(kind, operation, seq, message);
  }
}
