/**
 * scripts/evals/l3/runtime/guest/channel.ts
 *
 * Bounded newline-framed duplex channel used inside the guest between the
 * controller and candidates, trusted stubs, and the trusted driver.
 *
 * Same discipline as the host boundary: per-frame cap, aggregate byte cap,
 * bounded pending queue, one absolute deadline per exchange.
 */

import type { Readable, Writable } from "node:stream";
import { JsonlFrameCodec } from "../../contracts.js";
import { MAX_TRANSPORT_QUEUE_BYTES, MAX_TRANSPORT_QUEUE_FRAMES } from "../types.js";

export interface DuplexStreams {
  readonly stdin: Writable;
  readonly stdout: Readable;
  readonly stderr?: Readable;
  readonly kill?: () => void;
}

export interface ChannelLimits {
  readonly maxFrameBytes: number;
  readonly maxTotalBytes: number;
  readonly maxPendingFrames?: number;
  readonly maxPendingBytes?: number;

  /** Invoked once when the combined raw ceiling is exceeded. */
  readonly onOverflow?: () => void;

  readonly nowMs?: () => number;
}

export interface ChannelStats {
  readonly frames_in: number;
  readonly frames_out: number;
  readonly bytes_in: number;
  readonly bytes_out: number;
  readonly truncated: boolean;
  /** Every raw byte observed on either stream, including bytes past the cap. */
  readonly observed_output_bytes: number;
  /** Permitted raw stdout prefix retained at the combined ceiling. */
  readonly stdout_raw_bytes: number;
  /** Permitted raw stderr prefix retained at the combined ceiling. */
  readonly stderr_raw_bytes: number;
}
export interface RawChannelOutput {
  readonly stream: "combined";
  readonly stream_offset: number;
  readonly capture_order: number;
  readonly process_session_id?: string;
  readonly bytes: Buffer;
  /** Prefix bitset: bit at absolute byte offset i is set for stderr. */
  readonly stream_mask: Buffer;
}



interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
  readonly reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export class BoundedJsonlChannel {
  private readonly streams: DuplexStreams;
  private readonly limits: Required<Omit<ChannelLimits, "nowMs" | "onOverflow">> & {
    readonly onOverflow?: () => void;
  };
  private readonly nowMs: () => number;
  private readonly codec: JsonlFrameCodec;
  private readonly pending: string[] = [];
  private pendingBytes = 0;
  private readonly pendingWrites = new Set<{ reject: (error: Error) => void; timer?: NodeJS.Timeout }>();
  private waiter: { resolve: (frame: string) => void; reject: (error: Error) => void } | null = null;
  private framesIn = 0;
  private framesOut = 0;
  private bytesIn = 0;
  private bytesOut = 0;
  private truncated = false;
  private overflowed = false;
  private closed = false;
  private failure: Error | null = null;
  private readonly rawOutput: Buffer;
  private readonly rawStderrMask: Buffer;
  private rawBytesCaptured = 0;
  private observedOutputBytes = 0;
  private rawStdoutBytes = 0;
  private rawStderrBytes = 0;
  private exportedRawBytes = 0;
  constructor(streams: DuplexStreams, limits: ChannelLimits) {
    this.streams = streams;
    this.nowMs = limits.nowMs ?? (() => Date.now());
    this.limits = {
      maxFrameBytes: limits.maxFrameBytes,
      maxTotalBytes: limits.maxTotalBytes,
      maxPendingFrames: limits.maxPendingFrames ?? MAX_TRANSPORT_QUEUE_FRAMES,
      maxPendingBytes: limits.maxPendingBytes ?? MAX_TRANSPORT_QUEUE_BYTES,
      ...(limits.onOverflow === undefined ? {} : { onOverflow: limits.onOverflow }),
    };
    if (!Number.isSafeInteger(this.limits.maxFrameBytes) || this.limits.maxFrameBytes <= 0) {
      throw new Error("maxFrameBytes must be a positive safe integer");
    }
    if (!Number.isSafeInteger(this.limits.maxTotalBytes) || this.limits.maxTotalBytes < 0) {
      throw new Error("maxTotalBytes must be a non-negative safe integer");
    }
    this.rawOutput = Buffer.allocUnsafe(this.limits.maxTotalBytes);
    this.rawStderrMask = Buffer.alloc(Math.ceil(this.limits.maxTotalBytes / 8));
    this.codec = new JsonlFrameCodec({ maxFrameBytes: this.limits.maxFrameBytes });
    streams.stdout.on("data", (chunk: Buffer) => {
      const captured = this.captureRaw("stdout", chunk);
      if (captured !== chunk.length) {
        this.truncated = true;
        this.fail(new Error(`peer exceeded combined ${this.limits.maxTotalBytes} raw output bytes`));
      }
      if (captured > 0) this.onData(chunk.subarray(0, captured));
    });
    streams.stdout.on("error", (error: Error) => this.fail(error));
    if (streams.stderr) {
      streams.stderr.on("data", (chunk: Buffer) => {
        if (this.captureRaw("stderr", chunk) !== chunk.length) {
          this.truncated = true;
          this.fail(new Error(`peer exceeded combined ${this.limits.maxTotalBytes} raw output bytes`));
        }
      });
    }
  }

  private captureRaw(stream: "stdout" | "stderr", chunk: Buffer): number {
    if (chunk.length === 0) return 0;
    // One combined run byte counter: stderr is subordinate to the same ceiling
    // as stdout, so neither stream can double the retained output budget.
    this.observedOutputBytes += chunk.length;
    const room = this.rawOutput.length - this.rawBytesCaptured;
    const captured = Math.min(room, chunk.length);
    if (captured < chunk.length && !this.overflowed) {
      this.overflowed = true;
      this.limits.onOverflow?.();
    }
    if (captured > 0) {
      const bufferOffset = this.rawBytesCaptured;
      chunk.copy(this.rawOutput, bufferOffset, 0, captured);
      if (stream === "stderr") {
        for (let index = bufferOffset; index < bufferOffset + captured; index += 1) {
          this.rawStderrMask[index >>> 3] |= 1 << (index & 7);
        }
        this.rawStderrBytes += captured;
      } else {
        this.rawStdoutBytes += captured;
      }
      this.rawBytesCaptured += captured;
    }
    return captured;
  }

  private onData(chunk: Buffer): void {
    // Preserve subsequent bytes after frame failure; only decoding is closed.
    this.bytesIn += chunk.length;
    if (this.bytesIn > this.limits.maxTotalBytes) {
      this.truncated = true;
      this.fail(new Error(`peer exceeded ${this.limits.maxTotalBytes} bytes`));
      return;
    }
    if (this.closed) return;
    let frames: string[];
    try {
      frames = this.codec.feed(chunk);
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    for (const frame of frames) this.deliver(frame);
  }


  private deliver(frame: string): void {
    this.framesIn += 1;
    if (this.waiter !== null) {
      const waiter = this.waiter;
      this.waiter = null;
      waiter.resolve(frame);
      return;
    }
    const bytes = Buffer.byteLength(frame, "utf8");
    if (this.pending.length >= this.limits.maxPendingFrames || this.pendingBytes + bytes > this.limits.maxPendingBytes) {
      this.truncated = true;
      this.fail(new Error("pending frame queue exceeded its budget"));
      return;
    }
    this.pending.push(frame);
    this.pendingBytes += bytes;
  }

  private fail(error: Error): void {
    if (this.closed) return;
    this.closed = true;
    this.failure = error;
    this.streams.kill?.();
    if (this.waiter !== null) {
      const waiter = this.waiter;
      this.waiter = null;
      waiter.reject(error);
    }
    for (const pending of this.pendingWrites) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pendingWrites.clear();
  }

  async write(frame: string, deadlineAtMs?: number): Promise<void> {
    if (this.closed) throw this.failure ?? new Error("channel is closed");
    if (!frame.endsWith("\n")) throw new Error("frames must be newline terminated");
    if (Buffer.byteLength(frame, "utf8") > this.limits.maxFrameBytes) {
      throw new Error(`frame exceeds ${this.limits.maxFrameBytes} bytes`);
    }
    let timer: NodeJS.Timeout | undefined;
    if (deadlineAtMs !== undefined) {
      const remaining = deadlineAtMs - this.nowMs();
      if (remaining <= 0) throw new Error("the absolute deadline has already passed");
    }
    const { promise, resolve, reject } = deferred<void>();
    const entry: { reject: (error: Error) => void; timer?: NodeJS.Timeout } = { reject };
    this.pendingWrites.add(entry);
    if (deadlineAtMs !== undefined) {
      const remaining = deadlineAtMs - this.nowMs();
      timer = setTimeout(() => {
        const err = new Error("write timed out before the absolute deadline");
        this.fail(err);
        reject(err);
      }, Math.max(1, remaining));
      entry.timer = timer;
    }
    this.framesOut += 1;
    this.bytesOut += Buffer.byteLength(frame, "utf8");
    this.streams.stdin.write(frame, (error) => {
      clearTimeout(timer);
      this.pendingWrites.delete(entry);
      if (error) {
        this.fail(error);
        reject(error);
      } else {
        resolve();
      }
    });
    await promise;
  }

  /** Reads the next frame under an absolute deadline and explicit cancellation. */
  async read(deadlineAtMs: number): Promise<string> {
    if (!Number.isSafeInteger(deadlineAtMs) || deadlineAtMs <= 0) {
      throw new Error("deadlineAtMs must be a positive integer");
    }
    if (this.failure !== null) throw this.failure;
    if (this.closed) throw new Error("channel is closed");
    const remaining = deadlineAtMs - this.nowMs();
    if (remaining <= 0) throw new Error("the absolute deadline has already passed");

    const queued = this.pending.shift();
    if (queued !== undefined) {
      this.pendingBytes -= Buffer.byteLength(queued, "utf8");
      return queued;
    }

    const { promise, resolve, reject } = deferred<string>();
    const timer = setTimeout(() => {
      if (this.waiter === null) return;
      this.waiter = null;
      this.fail(new Error("no response before the absolute deadline"));
      reject(new Error("no response before the absolute deadline"));
    }, remaining);
    this.waiter = {
      resolve: (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      },
    };
    return promise;
  }

  /** Writes one request and waits for the next frame under an absolute deadline. */
  async exchange(frame: string, deadlineAtMs: number): Promise<string> {
    if (!Number.isSafeInteger(deadlineAtMs) || deadlineAtMs <= 0) {
      throw new Error("deadlineAtMs must be a positive epoch millisecond integer");
    }
    // Arm the deadline and the waiter BEFORE the blocking write so a stalled
    // write cannot exceed the absolute budget.
    const remaining = deadlineAtMs - this.nowMs();
    if (remaining <= 0) throw new Error("the absolute deadline has already passed");
    const { promise, resolve, reject } = deferred<string>();
    const timer = setTimeout(() => {
      if (this.waiter === null) return;
      const waiter = this.waiter;
      this.waiter = null;
      this.fail(new Error("no response before the absolute deadline"));
      waiter.reject(new Error("no response before the absolute deadline"));
    }, remaining);
    this.waiter = {
      resolve: (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      },
    };
    try {
      await this.write(frame, deadlineAtMs);
    } catch (error) {
      this.waiter = null;
      clearTimeout(timer);
      throw error;
    }
    const queued = this.pending.shift();
    if (queued !== undefined) {
      this.pendingBytes -= Buffer.byteLength(queued, "utf8");
      this.waiter = null;
      clearTimeout(timer);
      return queued;
    }
    if (this.failure !== null) {
      this.waiter = null;
      clearTimeout(timer);
      throw this.failure;
    }
    return promise;
  }
  /** One bounded record per drain; the local bitset preserves exact stream order. */
  drainRawOutput(): readonly RawChannelOutput[] {
    const start = this.exportedRawBytes;
    const end = this.rawBytesCaptured;
    if (end === start) return Object.freeze([]);
    const bytes = this.rawOutput.subarray(start, end);
    const streamMask = Buffer.alloc(Math.ceil(bytes.length / 8));
    for (let index = 0; index < bytes.length; index += 1) {
      const absoluteIndex = start + index;
      if ((this.rawStderrMask[absoluteIndex >>> 3] & (1 << (absoluteIndex & 7))) !== 0) {
        streamMask[index >>> 3] |= 1 << (index & 7);
      }
    }
    const output = {
      stream: "combined" as const,
      stream_offset: start,
      capture_order: start + 1,
      bytes,
      stream_mask: streamMask,
    };
    this.exportedRawBytes = end;
    return Object.freeze([output]);
  }

  stats(): ChannelStats {
    return {
      frames_in: this.framesIn,
      frames_out: this.framesOut,
      bytes_in: this.bytesIn,
      bytes_out: this.bytesOut,
      truncated: this.truncated,
      observed_output_bytes: this.observedOutputBytes,
      stdout_raw_bytes: this.rawStdoutBytes,
      stderr_raw_bytes: this.rawStderrBytes,
    };
  }

  /** Bytes observed but not yet framed as a complete message on this connection. */
  bufferedBytes(): number {
    return this.pendingBytes + this.codec.bufferedBytes();
  }

  close(): void {
    if (this.closed) return;
    this.fail(new Error("channel is closed"));
  }
}
