/**
 * scripts/evals/l3/runtime/guest/stubs-server.ts
 *
 * Guest-local trusted stub RPC servers.
 *
 * The provider and summarizer stubs own their ledgers in the controller process;
 * their sockets live in `/state/stubs`, which is never mounted into the
 * candidate. Each connection carries strict D1 request envelopes only, and the
 * response is the exact D1 result/error encoding.
 *
 * The relay is deliberately stricter than "read a line, call a handler":
 *
 * - **canonical errors only.** Every rejection uses a code from the frozen D1
 *   `ERROR_CODES` set; there is no out-of-band `CONCURRENCY_VIOLATION`. Overlapping
 *   requests and input over budget are `OVERLOADED`, malformed input is
 *   `INVALID_REQUEST`.
 * - **operation contracts.** The caller supplies the D1 payload/result validators
 *   for each operation, so a handler can neither receive an unvalidated payload
 *   nor return a result outside the frozen contract.
 * - **single flight with bounded input.** One in-flight request per connection,
 *   bounded connections, bounded queued bytes and bounded frame count; an overlap
 *   is rejected at ingress rather than silently reordered.
 * - **effect-aware cancellation.** A request carries an effect token bound to its
 *   session and sequence. Only `commit` may record an effect, and `commit` refuses
 *   once the request timed out, the socket closed, or a later request took over —
 *   so a timed-out handler can never commit late under a different request.
 *
 * A scheduled adverse "dropped" outcome closes the connection without a response:
 * a lost response is never turned into a success.
 */

import net from "node:net";
import path from "node:path";
import { chmod, chown, mkdir, unlink } from "node:fs/promises";
import { ERROR_CODES, parseRequestEnvelope, type ErrorCode } from "../../contracts.js";

export const MAX_FRAME_BYTES = 65_536;
export const MAX_FRAMES = 4_096;
export const MAX_CONNECTIONS = 8;
export const MAX_QUEUED_BYTES = 262_144;
export const STUB_REQUEST_TIMEOUT_MS = 5_000;

export type StubOutcome =
  | { readonly kind: "result"; readonly result: Record<string, unknown> }
  | { readonly kind: "error"; readonly error: { readonly code: ErrorCode; readonly message: string } }
  | { readonly kind: "dropped" };

/**
 * Effect token for one request. `commit` is the only way to record an effect, and
 * it refuses once the request can no longer be attributed to live work.
 */
export interface StubEffectContext {
  readonly session_id: string;
  readonly connection_id: string;
  readonly exchange_id: string;
  readonly seq: number;
  readonly signal: AbortSignal;
  /** True while this request is still the live, un-cancelled in-flight request. */
  isLive(): boolean;
  /** Runs `commit` exactly once, and only if the request is still live. */
  commit<T>(commit: () => T): T;
}

/** Frozen D1 payload/result validators for one operation. */
export interface StubOperationContract {
  readonly validate_payload: (payload: Record<string, unknown>) => Record<string, unknown>;
  readonly validate_result: (result: Record<string, unknown>) => Record<string, unknown>;
}

export type StubOperationContracts = Readonly<Record<string, StubOperationContract>>;

export interface StubRelayStats {
  readonly frames: number;
  readonly rejected: number;
  readonly succeeded: number;
  readonly errored: number;
  readonly dropped: number;
  /** Requests whose outcome arrived after cancellation and was discarded. */
  readonly cancelled: number;
}

export interface StubRpcServer {
  readonly socketPath: string;
  readonly frames: number;
  readonly rejected: number;
  stats(): StubRelayStats;
  close(): Promise<void>;
}

export type StubHandler = (
  operation: string,
  payload: Record<string, unknown>,
  context: StubEffectContext,
) => Promise<StubOutcome> | StubOutcome;

function errorLine(seq: number, code: ErrorCode, message: string): string {
  return `${JSON.stringify({ version: 1, seq, ok: false, error: { code, message } })}\n`;
}

export async function startStubServer(options: {
  readonly socketPath: string;
  readonly handler: StubHandler;
  readonly contracts: StubOperationContracts;
  readonly sessionId: string | (() => string);
  /** Stable relay identity so connection/exchange ids never collide across sockets. */
  readonly relayId: string;
}): Promise<StubRpcServer> {
  const socketPath = options.socketPath;
  await mkdir(path.dirname(socketPath), { recursive: true, mode: 0o700 });
  await unlink(socketPath).catch(() => undefined);
  let frames = 0;
  let rejected = 0;
  let succeeded = 0;
  let errored = 0;
  let dropped = 0;
  let cancelled = 0;
  let activeConnections = 0;
  let queuedBytes = 0;
  let connectionSequence = 0;
  const sockets = new Set<net.Socket>();
  const controllers = new Set<AbortController>();
  const pendingEffects = new Set<Promise<unknown>>();
  let closePromise: Promise<void> | null = null;


  const server = net.createServer((socket) => {
    if (activeConnections >= MAX_CONNECTIONS) {
      rejected += 1;
      socket.end(errorLine(1, "OVERLOADED", "connection ceiling reached"));
      socket.destroy();
      return;
    }
    activeConnections += 1;
    const connectionId = `${options.relayId}-conn-${++connectionSequence}`;
    sockets.add(socket);
    let buffer = "";
    let expectedSeq = 1;
    let inFlight = false;
    let closed = false;
    let activeSeq = 0;
    let requestCancelled = false;
    let cancelledCounted = false;
    const noteCancelled = (): void => {
      if (!cancelledCounted) {
        cancelled += 1;
        cancelledCounted = true;
      }
    };
    let activeController: AbortController | null = null;
    socket.setEncoding("utf8");
    const abortActive = (): void => {
      requestCancelled = true;
      activeController?.abort();
    };
    const rejectConnection = (seq: number, code: ErrorCode, message: string): void => {
      rejected += 1;
      closed = true;
      abortActive();
      socket.end(errorLine(seq, code, message));
    };
    socket.on("error", () => {
      closed = true;
      abortActive();
      socket.destroy();
    });
    socket.on("close", () => {
      closed = true;
      abortActive();
      sockets.delete(socket);
      activeConnections = Math.max(0, activeConnections - 1);
    });

    const contextFor = (seq: number, controller: AbortController): StubEffectContext => {
      let committed = false;
      return {
        // The live process session is resolved per request, so a connection that
        // outlived a process restart is attributed to the session that actually
        // owns this exchange, never the pre-launch/pre-restart session.
        session_id:
          typeof options.sessionId === "function" ? options.sessionId() : options.sessionId,
        connection_id: connectionId,
        exchange_id: `${connectionId}-seq-${seq}`,
        seq,
        signal: controller.signal,
        isLive: () => !closed && !requestCancelled && activeSeq === seq,
        commit<T>(commit: () => T): T {
          if (committed) throw new Error(`request ${seq} already committed an effect`);
          if (closed || requestCancelled || activeSeq !== seq) {
            throw new Error(`request ${seq} was cancelled before its effect could be committed`);
          }
          committed = true;
          return commit();
        },
      };
    };

    const handleSingleLine = async (line: string): Promise<void> => {
      if (closed) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        rejectConnection(expectedSeq, "INVALID_REQUEST", "malformed JSON request frame");
        return;
      }

      let operation: string;
      let seq: number;
      let rawPayload: Record<string, unknown>;
      try {
        const envelope = parseRequestEnvelope(parsed);
        operation = envelope.operation;
        seq = envelope.seq;
        rawPayload = envelope.payload;
      } catch (error) {
        rejectConnection(expectedSeq, "INVALID_REQUEST", error instanceof Error ? error.message : String(error));
        return;
      }

      if (seq !== expectedSeq) {
        rejectConnection(seq, "INVALID_REQUEST", `protocol sequence violation: expected ${expectedSeq}, got ${seq}`);
        return;
      }
      expectedSeq += 1;
      inFlight = true;
      activeSeq = seq;

      const contract = options.contracts[operation];
      if (contract === undefined) {
        inFlight = false;
        rejectConnection(seq, "INVALID_REQUEST", `unknown operation: ${operation}`);
        return;
      }
      let payload: Record<string, unknown>;
      try {
        payload = contract.validate_payload(rawPayload);
      } catch (error) {
        inFlight = false;
        rejectConnection(seq, "INVALID_REQUEST", error instanceof Error ? error.message : String(error));
        return;
      }

      const controller = new AbortController();
      activeController = controller;
      controllers.add(controller);
      let timeoutTimer: NodeJS.Timeout | undefined;
      try {
        const effectPromise = Promise.resolve().then(() =>
          options.handler(operation, payload, contextFor(seq, controller)),
        );
        pendingEffects.add(effectPromise);
        void effectPromise.then(
          () => {
            if (requestCancelled) noteCancelled();
            pendingEffects.delete(effectPromise);
          },
          () => {
            if (requestCancelled) noteCancelled();
            pendingEffects.delete(effectPromise);
          },
        );
        const outcome = await Promise.race([
          effectPromise,
          // ES2022 target: no Promise.withResolvers.
          new Promise<StubOutcome>((_resolve, reject) => {
            timeoutTimer = setTimeout(
              () => {
                requestCancelled = true;
                controller.abort();
                rejectConnection(seq, "UNAVAILABLE", "stub request timed out before deadline");
                reject(new Error("stub request timed out before deadline"));
              },
              STUB_REQUEST_TIMEOUT_MS,
            );
          }),
        ]);
        if (closed || requestCancelled || activeSeq !== seq) {
          noteCancelled();
          return;
        }
        inFlight = false;

        if (outcome.kind === "dropped") {
          dropped += 1;
          closed = true;
          abortActive();
          socket.destroy();
          return;
        }
        if (outcome.kind === "error") {
          errored += 1;
          if (!(ERROR_CODES as readonly string[]).includes(outcome.error.code)) {
            socket.write(errorLine(seq, "UNAVAILABLE", "stub returned a non-canonical error code"));
            return;
          }
          socket.write(`${JSON.stringify({ version: 1, seq, ok: false, error: outcome.error })}\n`);
          return;
        }
        let result: Record<string, unknown>;
        try {
          result = contract.validate_result(outcome.result);
        } catch (error) {
          socket.write(
            errorLine(seq, "UNAVAILABLE", `stub result failed contract validation: ${error instanceof Error ? error.message : String(error)}`),
          );
          return;
        }
        succeeded += 1;
        socket.write(`${JSON.stringify({ version: 1, seq, ok: true, result })}\n`);
      } catch (error) {
        if (closed || requestCancelled || activeSeq !== seq) return;
        inFlight = false;
        rejectConnection(
          seq,
          "UNAVAILABLE",
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        clearTimeout(timeoutTimer);
        controllers.delete(controller);
        if (activeController === controller) activeController = null;
      }
    };

    socket.on("data", (chunk: string) => {
      if (closed) return;
      buffer += chunk;
      const buffered = Buffer.byteLength(buffer, "utf8");
      queuedBytes += Buffer.byteLength(chunk, "utf8");
      if (buffered > MAX_FRAME_BYTES) {
        queuedBytes -= buffered;
        rejectConnection(expectedSeq, "INVALID_REQUEST", "request frame exceeds the frame ceiling");
        return;
      }
      if (queuedBytes > MAX_QUEUED_BYTES) {
        queuedBytes -= buffered;
        rejectConnection(expectedSeq, "OVERLOADED", "queued request bytes exceed the relay budget");
        return;
      }
      let index = buffer.indexOf("\n");
      while (index !== -1) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        queuedBytes -= Buffer.byteLength(line, "utf8") + 1;
        if (queuedBytes < 0) queuedBytes = 0;
        frames += 1;
        if (frames > MAX_FRAMES) {
          rejectConnection(expectedSeq, "OVERLOADED", "request frame ceiling reached");
          return;
        }
        // Ingress single-flight: an overlapping request is rejected here, not
        // queued behind the in-flight one.
        if (inFlight) {
          rejectConnection(expectedSeq, "OVERLOADED", "overlapping concurrent request rejected at ingress");
          return;
        }
        void handleSingleLine(line);
        index = buffer.indexOf("\n");
      }
    });
  });
  // ES2022 target: no Promise.withResolvers.
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => resolve());
  });
  // The candidate (UID 1000) must be able to connect to the relay socket; the
  // handler and the stub state stay in this trusted process.
  await chown(socketPath, 1000, 1000).catch(() => undefined);
  await chmod(socketPath, 0o600).catch(() => undefined);
  return {
    socketPath,
    get frames() {
      return frames;
    },
    get rejected() {
      return rejected;
    },
    stats(): StubRelayStats {
      return { frames, rejected, succeeded, errored, dropped, cancelled };
    },
    close: () => {
      if (closePromise !== null) return closePromise;
      closePromise = (async () => {
        for (const controller of controllers) controller.abort();
        for (const socket of sockets) socket.destroy();
        await new Promise<void>((resolve) => server.close(() => resolve()));
        let timeout: NodeJS.Timeout | undefined;
        try {
          await Promise.race([
            Promise.allSettled([...pendingEffects]),
            new Promise<never>((_resolve, reject) => {
              timeout = setTimeout(
                () => reject(new Error("cancelled stub effects did not settle before relay teardown")),
                STUB_REQUEST_TIMEOUT_MS,
              );
            }),
          ]);
        } finally {
          clearTimeout(timeout);
        }
        await unlink(socketPath).catch(() => undefined);
      })();
      return closePromise;
    },
  };
}

