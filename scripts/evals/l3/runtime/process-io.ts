/**
 * scripts/evals/l3/runtime/process-io.ts
 *
 * Concrete Node process IO: fixed argv (no shell), enforced stream and aggregate
 * byte caps, absolute wall-clock ceilings, process-tree termination and a bounded
 * line-oriented duplex channel.
 *
 * Every limit is enforced here rather than forwarded from caller options. Byte
 * counters stop consuming input once a cap is hit, so an unbounded producer
 * cannot grow memory or the observation counters.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { performance } from "node:perf_hooks";
import { JsonlFrameCodec } from "../contracts";
import {
  MAX_TRANSPORT_QUEUE_BYTES,
  MAX_TRANSPORT_QUEUE_FRAMES,
  SerialCaptureFailure,
  SerialCleanEOF,
  type ProcessIO,
  type ProcessIORequest,
  type ProcessIOResult,
  type RunnerStatusEvent,
  type SerialCapture,
  type SerialCaptureRequest,
  type SerialCaptureStats,
} from "./types";

/** Minimal environment: no host credentials, no proxy variables, no ssh agent. */
const MINIMAL_ENV: Readonly<Record<string, string>> = Object.freeze({
  PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
  LC_ALL: "C",
});

/** Grace period between SIGKILL of the process group and pipe teardown. */
const KILL_GRACE_MS = 250;

interface StreamSink {
  readonly chunks: Buffer[];
  retained: number;
  observed: number;
  truncated: boolean;
  stopped: boolean;
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
  readonly reject: (reason?: unknown) => void;
}

/**
 * Promise.withResolvers equivalent for the project's ES2022 lib target.
 * Kept local and typed so call sites stay linear.
 */
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeSink(limit: number, what: string): StreamSink {
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new Error(`${what} byte limit must be a positive safe integer, got ${String(limit)}`);
  }
  return { chunks: [], retained: 0, observed: 0, truncated: false, stopped: false };
}

/** Absorbs a chunk up to the retained cap; returns false once the cap is exceeded. */
function absorb(sink: StreamSink, chunk: Buffer, limit: number): boolean {
  if (sink.stopped) return false;
  sink.observed += chunk.length;
  const room = limit - sink.retained;
  if (room > 0) {
    const kept = chunk.length <= room ? chunk : chunk.subarray(0, room);
    sink.chunks.push(kept);
    sink.retained += kept.length;
  }
  if (sink.observed > limit) {
    sink.truncated = true;
    sink.stopped = true;
    return false;
  }
  return true;
}

function sinkText(sink: StreamSink): string {
  return Buffer.concat(sink.chunks).toString("utf8");
}

function childEnv(env: Readonly<Record<string, string>> | undefined): NodeJS.ProcessEnv {
  return env ? { ...env } : { ...MINIMAL_ENV };
}

/** Kills the whole process group so descendants cannot outlive the bound. */
function killTree(child: ChildProcess): void {
  const pid = child.pid;
  if (pid === undefined) return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
      // already gone
    }
  }
}

function destroyStreams(child: ChildProcess): void {
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.stdin?.destroy();
  const consoleStream = child.stdio[3];
  if (consoleStream instanceof Object && "destroy" in consoleStream) {
    (consoleStream as { destroy: () => void }).destroy();
  }
}

function assertDeadline(deadlineAtMs: number): void {
  if (!Number.isSafeInteger(deadlineAtMs) || deadlineAtMs <= 0) {
    throw new Error(`deadlineAtMs must be a positive epoch millisecond integer, got ${String(deadlineAtMs)}`);
  }
}

export class NodeProcessIO implements ProcessIO {
  async run(request: ProcessIORequest): Promise<ProcessIOResult> {
    if (request.argv.length === 0) throw new Error("ProcessIO.run requires a non-empty argv");
    if (!Number.isSafeInteger(request.timeoutMs) || request.timeoutMs <= 0) {
      throw new Error(`timeoutMs must be a positive safe integer, got ${String(request.timeoutMs)}`);
    }

    const stdout = makeSink(request.maxStdoutBytes, "stdout");
    const stderr = makeSink(request.maxStderrBytes, "stderr");
    const started = performance.now();
    const { promise, resolve, reject } = deferred<ProcessIOResult>();

    let child: ChildProcess;
    try {
      child = spawn(request.argv[0], request.argv.slice(1), {
        cwd: request.cwd,
        env: childEnv(request.env),
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
        detached: true,
        windowsHide: true,
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
      return promise;
    }

    let timedOut = false;
    let cancelled = false;
    let capBreached = false;
    let settled = false;
    let timer: NodeJS.Timeout | undefined;

    const breach = (): void => {
      capBreached = true;
      killTree(child);
    };

    const settle = (exitCode: number | null, signal: NodeJS.Signals | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", onAbort);
      setTimeout(() => destroyStreams(child), KILL_GRACE_MS).unref();
      resolve({
        exitCode: capBreached && exitCode === 0 ? null : exitCode,
        signal: capBreached && signal === null && exitCode === 0 ? "SIGKILL" : signal,
        stdout: sinkText(stdout),
        stderr: sinkText(stderr),
        stdoutTruncated: stdout.truncated,
        stderrTruncated: stderr.truncated,
        timedOut,
        cancelled,
        observedBytes: stdout.observed + stderr.observed,
        durationMs: Math.round(performance.now() - started),
      });
    };

    const onAbort = (): void => {
      cancelled = true;
      killTree(child);
    };

    timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, request.timeoutMs);

    if (request.signal) {
      if (request.signal.aborted) onAbort();
      else request.signal.addEventListener("abort", onAbort, { once: true });
    }

    child.stdout?.on("data", (chunk: Buffer) => {
      if (!absorb(stdout, chunk, request.maxStdoutBytes)) breach();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (!absorb(stderr, chunk, request.maxStderrBytes)) breach();
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", onAbort);
      destroyStreams(child);
      reject(error);
    });

    child.on("close", (exitCode, signal) => settle(exitCode, signal));

    return promise;
  }

  async openSerialCapture(request: SerialCaptureRequest): Promise<SerialCapture> {
    if (request.argv.length === 0) throw new Error("openSerialCapture requires a non-empty argv");
    if (!Number.isSafeInteger(request.maxFrames) || request.maxFrames <= 0) {
      throw new Error("maxFrames must be a positive safe integer");
    }
    if (!Number.isSafeInteger(request.maxTotalBytes) || request.maxTotalBytes <= 0) {
      throw new Error("maxTotalBytes must be a positive safe integer");
    }
    if (!Number.isSafeInteger(request.maxFrameBytes) || request.maxFrameBytes <= 0) {
      throw new Error("maxFrameBytes must be a positive safe integer");
    }

    const child = spawn(request.argv[0], request.argv.slice(1), {
      cwd: request.cwd,
      env: childEnv(request.env),
      // fd 3 is the guest console write end; the host only reads it.
      stdio: ["ignore", "pipe", "pipe", "pipe"],
      shell: false,
      detached: true,
      windowsHide: true,
    });

    const consoleStream = child.stdio[3];
    if (consoleStream === null || consoleStream === undefined) {
      killTree(child);
      throw new Error("Serial console pipe was not created");
    }

    const codec = new JsonlFrameCodec({ maxFrameBytes: request.maxFrameBytes });
    const stderrSink = makeSink(request.maxStderrBytes ?? 65_536, "stderr");
    const statusEvents: RunnerStatusEvent[] = [];
    let statusBuffer = "";
    const MAX_STATUS_EVENTS = 64;
    const MAX_STATUS_EVENT_BYTES = 4_096;

    child.stdout?.on("data", (chunk: Buffer) => {
      statusBuffer += chunk.toString("utf8");
      if (Buffer.byteLength(statusBuffer, "utf8") > MAX_STATUS_EVENT_BYTES) {
        statusBuffer = "";
        return;
      }
      let index = statusBuffer.indexOf("\n");
      while (index !== -1) {
        const line = statusBuffer.slice(0, index).trim();
        statusBuffer = statusBuffer.slice(index + 1);
        if (line.length > 0 && statusEvents.length < MAX_STATUS_EVENTS) {
          try {
            const parsed: unknown = JSON.parse(line);
            if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) && "event" in parsed) {
              const event = parsed.event;
              if (typeof event === "string") {
                const detail =
                  "detail" in parsed && typeof parsed.detail === "string" ? parsed.detail : undefined;
                statusEvents.push(detail === undefined ? { event } : { event, detail });
              }
            }
          } catch {
            // A non-JSON runner stdout line is not a lifecycle event.
          }
        }
        index = statusBuffer.indexOf("\n");
      }
    });
    let frames = 0;
    let bytes = 0;
    let truncated = false;
    let killed = false;
    let closed = false;
    let endError: Error | null = null;
    let exitInfo: { exitCode: number | null; signal: NodeJS.Signals | null } | null = null;

    const pending: string[] = [];
    let pendingBytes = 0;
    let waiter: { resolve: (frame: string) => void; reject: (error: Error) => void } | null = null;
    let exitWaiter: { resolve: (info: { exitCode: number | null; signal: NodeJS.Signals | null }) => void } | null = null;

    const fail = (error: Error): void => {
      if (closed) return;
      closed = true;
      endError = error;
      if (waiter !== null) {
        const w = waiter;
        waiter = null;
        w.reject(error);
      }
    };

    const enqueue = (frame: string): void => {
      frames += 1;
      if (frames > request.maxFrames) {
        truncated = true;
        killed = true;
        killTree(child);
        fail(new Error(`Serial frame count exceeded ${request.maxFrames}`));
        return;
      }
      if (waiter !== null) {
        const w = waiter;
        waiter = null;
        w.resolve(frame);
        return;
      }
      const size = Buffer.byteLength(frame, "utf8");
      if (pending.length >= MAX_TRANSPORT_QUEUE_FRAMES || pendingBytes + size > MAX_TRANSPORT_QUEUE_BYTES) {
        truncated = true;
        killed = true;
        killTree(child);
        fail(new Error("Serial frame queue exceeded its bounded frame/byte budget"));
        return;
      }
      pending.push(frame);
      pendingBytes += size;
    };

    consoleStream.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > request.maxTotalBytes) {
        truncated = true;
        killed = true;
        killTree(child);
        fail(new SerialCaptureFailure("process", `Serial output exceeded ${request.maxTotalBytes} bytes`));
        return;
      }
      try {
        for (const frame of codec.feed(chunk)) enqueue(frame);
      } catch (error) {
        truncated = true;
        killed = true;
        killTree(child);
        fail(new SerialCaptureFailure("malformed", error instanceof Error ? error.message : String(error)));
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      if (!absorb(stderrSink, chunk, request.maxStderrBytes ?? 65_536)) {
        killed = true;
        killTree(child);
        fail(new SerialCaptureFailure("process", "Runner stderr exceeded its ceiling"));
      }
    });

    child.on("error", (error) => fail(new SerialCaptureFailure("process", error.message)));
    child.on("close", (exitCode, signal) => {
      exitInfo = { exitCode, signal };
      closed = true;
      if (endError === null) {
        try {
          codec.finish();
          endError =
            exitCode === 0 && signal === null
              ? new SerialCleanEOF()
              : new SerialCaptureFailure("process", `runner exited nonzero (exitCode=${String(exitCode)}, signal=${String(signal)})`);
        } catch (error) {
          endError = new SerialCaptureFailure(
            "malformed",
            error instanceof Error ? error.message : String(error),
          );
        }
      }
      if (exitWaiter !== null) {
        const w = exitWaiter;
        exitWaiter = null;
        w.resolve(exitInfo);
      }
      if (waiter !== null) {
        const w = waiter;
        waiter = null;
        w.reject(endError);
      }
    });

    const timer = setTimeout(() => {
      killed = true;
      killTree(child);
      fail(new SerialCaptureFailure("deadline", `Runner exceeded its ${request.timeoutMs} ms wall ceiling`));
    }, request.timeoutMs);

    const abortHandler = (): void => {
      killed = true;
      killTree(child);
      fail(new SerialCaptureFailure("cancelled", "Runner cancelled by controller"));
    };
    if (request.signal) {
      if (request.signal.aborted) abortHandler();
      else request.signal.addEventListener("abort", abortHandler, { once: true });
    }

    return {
      async readFrame(deadlineAtMs: number): Promise<string> {
        const queued = pending.shift();
        if (queued !== undefined) {
          pendingBytes -= Buffer.byteLength(queued, "utf8");
          return queued;
        }
        if (endError !== null) throw endError;
        assertDeadline(deadlineAtMs);
        const remaining = deadlineAtMs - Date.now();
        if (remaining <= 0) throw new SerialCaptureFailure("deadline", "serial read deadline has already passed");

        const { promise, resolve, reject } = deferred<string>();
        const deadline = setTimeout(() => {
          if (waiter === null) return;
          waiter = null;
          killed = true;
          killTree(child);
          reject(new SerialCaptureFailure("deadline", `No serial frame before the absolute deadline (${deadlineAtMs})`));
        }, remaining);
        waiter = {
          resolve: (frame) => {
            clearTimeout(deadline);
            resolve(frame);
          },
          reject: (error) => {
            clearTimeout(deadline);
            reject(error);
          },
        };
        return promise;
      },
      isExited(): { exited: boolean; exitCode: number | null; signal: NodeJS.Signals | null } {
        return exitInfo !== null
          ? { exited: true, exitCode: exitInfo.exitCode, signal: exitInfo.signal }
          : { exited: false, exitCode: null, signal: null };
      },

      async wait(deadlineAtMs: number): Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }> {
        assertDeadline(deadlineAtMs);
        if (exitInfo !== null) return exitInfo;
        const { promise, resolve } = deferred<{ exitCode: number | null; signal: NodeJS.Signals | null }>();
        const remaining = deadlineAtMs - Date.now();
        if (remaining <= 0) {
          killed = true;
          killTree(child);
        }
        exitWaiter = { resolve };
        if (remaining > 0) {
          setTimeout(() => {
            if (exitWaiter === null) return;
            killed = true;
            killTree(child);
          }, remaining);
        }
        // A runner that never closes must not block the host forever: after the
        // kill grace the wait resolves as unknown, and callers quarantine.
        setTimeout(() => {
          if (exitWaiter === null) return;
          const waiter = exitWaiter;
          exitWaiter = null;
          killed = true;
          destroyStreams(child);
          waiter.resolve({ exitCode: null, signal: null });
        }, Math.max(0, remaining) + KILL_GRACE_MS + 5_000);
        return promise;
      },

      async kill(): Promise<void> {
        clearTimeout(timer);
        request.signal?.removeEventListener("abort", abortHandler);
        killed = true;
        killTree(child);
        if (exitInfo === null) {
          const { promise, resolve } = deferred<void>();
          const killTimeout = setTimeout(() => {
            if (exitWaiter !== null) {
              exitWaiter = null;
              resolve();
            }
          }, 5_000);
          exitWaiter = {
            resolve: () => {
              clearTimeout(killTimeout);
              resolve();
            },
          };
          await promise;
        }
        destroyStreams(child);
      },

      stats(): SerialCaptureStats {
        return { frames, bytes, truncated, killed };
      },

      statusEvents(): readonly RunnerStatusEvent[] {
        return Object.freeze([...statusEvents]);
      },

      runnerPid(): number | null {
        return child.pid ?? null;
      },
    };
  }
}
