/**
 * scripts/evals/l3/runtime/guest/auxiliary.ts
 *
 * Implements artifact-v1-auxiliary-contract.md (revision 364F).
 *
 * Guest-local Unix-domain stream socket for synthetic auxiliary byte delivery
 * and logical summary offers between the trusted driver/runtime adapter and the
 * candidate container.
 *
 * Delivery is only claimed when an independent guest helper authenticates the
 * connected peer through the very socket (`SO_PEERCRED` plus an exact cgroup
 * match against the recorded container identity) and the complete frame has
 * been written into that peer's receive queue. The helper receives the socket as
 * an inherited descriptor (stdio slot 3), never as a bare fd number, and stays
 * alive so every frame is re-checked on the same connection. On AF_UNIX the
 * kernel enqueues written bytes into the peer's receive queue; no
 * consumed-by-application signal (such as SIOCOUTQ) is used.
 *
 * Handshake: the helper prints `ready` exactly once after its initial identity
 * check; every frame then requires an explicit `ok` for a `check` request. A
 * frame that cannot obtain that explicit success is a delivery failure, never a
 * silent null.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import net from "node:net";
import path from "node:path";
import { chmod, chown, mkdir, unlink } from "node:fs/promises";
import type { Id, Nat, Positive } from "../../contracts.js";

export const AUXILIARY_SOCKET_PATH = "/run/l3/aux.sock" as const;
export const MAX_AUXILIARY_HEADER_BYTES = 4_096;
export const MAX_AUXILIARY_FRAME_BYTES = 65_536;
export const MAX_AUXILIARY_FRAMES = 14_400;
export const MAX_AUXILIARY_RAW_BYTES = 14_745_600;
export const MAX_AUXILIARY_OFFERS = 1_440;
export const MAX_AUXILIARY_OFFER_RECEIPT_BYTES = 1_048_576;
export const MAX_AUXILIARY_WIRE_BYTES = 76 * 1024 * 1024;
export const AUXILIARY_SEND_DEADLINE_MS = 5_000;
/** Candidate uid/gid inside the approved guest image. */
const CANDIDATE_UID = 1000;

export interface AuxiliaryHeader {
  readonly version: 1;
  readonly process_session_id: Id;
  readonly seq: Positive;
  readonly connection_id: Id;
  readonly message_id: Id;
  readonly byte_count: Positive;
  readonly requested_summary?: {
    readonly offer_id: Id;
    readonly window_index: Nat;
  };
}

export interface AuxiliaryOfferReceipt {
  readonly attempt_id: Id;
  readonly process_session_id: Id;
  readonly seq: Positive;
  readonly connection_id: Id;
  readonly message_id: Id;
  readonly offer_id: Id;
  readonly window_index: Nat;
  readonly observed_monotonic_ms: Nat;
  readonly byte_count: Positive;
  readonly sha256: string;
}

export interface AuxiliaryTransportObservation {
  readonly attempt_id: Id;
  readonly process_session_id: Id;
  readonly observation_id: Id;
  readonly observed_monotonic_ms: Nat;
  readonly offer_receipts: readonly AuxiliaryOfferReceipt[];
}

export interface AuxiliaryFrameInput {
  readonly seq: Positive;
  readonly connection_id: Id;
  readonly message_id: Id;
  readonly payload: Buffer;
  readonly requested_summary?: {
    readonly offer_id: Id;
    readonly window_index: Nat;
  };
}

export interface PeerIdentity {
  readonly pid: number;
  readonly cgroup: string;
}

export interface AuxiliaryServerOptions {
  readonly socketPath?: string;
  readonly attempt_id: Id;
  readonly processSessionId: () => Id;
  /** Recorded container identity; null while no candidate process exists. */
  readonly resolvePeer: () => Promise<PeerIdentity | null>;
  /** Compiled aux_peercred helper shipped in the approved image. */
  readonly peerHelperBinary: string;
  readonly nowMs: () => number;
}

/** A foreign, unauthenticated or unconfirmed frame is a hard transmission failure. */
export class AuxiliaryAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuxiliaryAuthenticationError";
  }
}

export class AuxiliaryDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuxiliaryDeliveryError";
  }
}

interface PeerVerifier {
  readonly child: ChildProcess;
  readonly ready: Promise<boolean>;
  check(deadlineAtMs: number): Promise<boolean>;
  close(): void;
}

interface LineReader {
  next(deadlineAtMs: number): Promise<string>;
  stop(): void;
}

function lineReader(stream: NodeJS.ReadableStream, now: () => number): LineReader {
  let buffer = "";
  const waiters: ((line: string) => void)[] = [];
  let stopped = false;
  stream.setEncoding("utf8");
  stream.on("data", (chunk: string) => {
    buffer += chunk;
    let index = buffer.indexOf("\n");
    while (index !== -1) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      const waiter = waiters.shift();
      if (waiter !== undefined) waiter(line);
      index = buffer.indexOf("\n");
    }
  });
  return {
    next(deadlineAtMs: number): Promise<string> {
      if (stopped) return Promise.resolve("fail helper-exited");
      return new Promise<string>((resolveLine) => {
        let settled = false;
        let timer: NodeJS.Timeout | undefined;
        const finish = (line: string): void => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolveLine(line);
        };
        const deliver = (line: string): void => finish(line);
        timer = setTimeout(() => {
          const index = waiters.indexOf(deliver);
          if (index !== -1) waiters.splice(index, 1);
          finish("fail deadline");
        }, Math.max(1, deadlineAtMs - now()));
        waiters.push(deliver);
      });
    },
    stop(): void {
      stopped = true;
      const pending = [...waiters];
      waiters.length = 0;
      for (const waiter of pending) waiter("fail helper-exited");
    },
  };
}

export class AuxiliaryChannel {
  private readonly options: AuxiliaryServerOptions;
  private readonly socketPath: string;
  private server: net.Server | null = null;
  private activeSocket: net.Socket | null = null;
  private verifier: PeerVerifier | null = null;
  private peerAuthenticated = false;
  private readiness: Promise<boolean> | null = null;
  private failure: string | null = null;

  private totalFrames = 0;
  private totalRawBytes = 0;
  private totalWireBytes = 0;
  private totalOfferReceiptBytes = 0;
  private readonly offerReceipts: AuxiliaryOfferReceipt[] = [];
  private readonly seenOfferIds = new Set<string>();
  private readonly authWaiters = new Set<{ resolve: () => void; reject: (err: Error) => void }>();
  constructor(options: AuxiliaryServerOptions) {
    this.options = options;
    this.socketPath = options.socketPath ?? AUXILIARY_SOCKET_PATH;
  }

  async listen(): Promise<void> {
    await mkdir(path.dirname(this.socketPath), { recursive: true, mode: 0o700 });
    await unlink(this.socketPath).catch(() => undefined);

    this.server = net.createServer((socket) => {
      void this.accept(socket);
    });

    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(this.socketPath, () => resolve());
    });
    // The candidate (UID 1000) owns its private runtime directory; the socket it
    // must connect to is handed to it without broadening anything else.
    await chown(this.socketPath, CANDIDATE_UID, CANDIDATE_UID).catch(() => undefined);
    await chmod(this.socketPath, 0o600).catch(() => undefined);
  }

  /**
   * The candidate can connect before `docker inspect` has reported its pid; poll
   * the recorded identity briefly instead of rejecting a legitimate early peer.
   */
  private async resolvePeerIdentity(): Promise<PeerIdentity | null> {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const peer = await this.options.resolvePeer();
      if (peer !== null) return peer;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    return null;
  }

  private async accept(socket: net.Socket): Promise<void> {
    if (this.activeSocket !== null) {
      socket.destroy();
      this.failure = "Auxiliary connection already active for this session";
      return;
    }
    this.activeSocket = socket;
    socket.on("error", () => socket.destroy());
    socket.on("close", () => {
      if (this.activeSocket === socket) {
        this.activeSocket = null;
        this.peerAuthenticated = false;
        this.verifier?.close();
        this.verifier = null;
        this.readiness = null;
      }
    });

    const peer = await this.resolvePeerIdentity();
    if (peer === null) {
      this.failure = "candidate identity is unavailable at auxiliary connection time";
      for (const waiter of this.authWaiters) {
        waiter.reject(new AuxiliaryAuthenticationError(this.failure));
      }
      this.authWaiters.clear();
      socket.destroy();
      return;
    }
    try {
      const verifier = this.startVerifier(socket, peer);
      this.verifier = verifier;
      this.readiness = verifier.ready;
      const ready = await verifier.ready;
      if (!ready) throw new AuxiliaryAuthenticationError("auxiliary peer failed SO_PEERCRED/cgroup authentication");
      this.peerAuthenticated = true;
      for (const waiter of this.authWaiters) waiter.resolve();
      this.authWaiters.clear();
    } catch (error) {
      this.failure =
        this.failure ?? (error instanceof Error ? error.message : String(error));
      this.peerAuthenticated = false;
      this.readiness = Promise.resolve(false);
      for (const waiter of this.authWaiters) {
        waiter.reject(new AuxiliaryAuthenticationError(this.failure));
      }
      this.authWaiters.clear();
      socket.destroy();
    }
  }
  /**
   * The helper inherits the live socket as descriptor 3, checks `SO_PEERCRED`
   * and an exact `/proc/<pid>/cgroup` match, and re-checks on demand so the
   * claim covers the same connection that received the frame.
   */
  private startVerifier(socket: net.Socket, peer: PeerIdentity): PeerVerifier {
    const child = spawn(this.options.peerHelperBinary, [String(peer.pid), peer.cgroup], {
      stdio: ["pipe", "pipe", "pipe", socket],
      shell: false,
    });
    const reader = lineReader(child.stdout ?? process.stdin, this.options.nowMs);
    child.on("close", () => reader.stop());
    child.on("error", () => reader.stop());
    const ready = (async (): Promise<boolean> => {
      const line = await reader.next(this.options.nowMs() + AUXILIARY_SEND_DEADLINE_MS);
      if (line !== "ready") {
        this.failure = `auxiliary helper rejected the peer: ${line.slice(0, 120)}`;
        return false;
      }
      return true;
    })();
    return {
      child,
      ready,
      check: async (deadlineAtMs: number): Promise<boolean> => {
        if (child.stdin === null) return false;
        child.stdin.write("check\n");
        const line = await reader.next(deadlineAtMs);
        if (line !== "ok") {
          this.failure = `auxiliary helper rejected the peer: ${line.slice(0, 120)}`;
          return false;
        }
        return true;
      },
      close: () => {
        reader.stop();
        child.kill("SIGKILL");
      },
    };
  }

  /**
   * Encodes and writes one auxiliary frame. Delivery is explicit: every frame
   * requires an authenticated peer on the same connection and an `ok` from the
   * helper inside the remaining deadline. A receipt is minted only for summary
   * offers; any failure throws instead of returning an ambiguous null.
   */
  async sendFrame(
    frame: AuxiliaryFrameInput,
    deadlineAtMs = this.options.nowMs() + AUXILIARY_SEND_DEADLINE_MS,
  ): Promise<AuxiliaryOfferReceipt | null> {
    const sessionId = this.options.processSessionId();
    if (this.totalFrames >= MAX_AUXILIARY_FRAMES) {
      throw new Error(`Auxiliary frame budget exceeded (cap: ${MAX_AUXILIARY_FRAMES})`);
    }
    if (frame.payload.length <= 0 || frame.payload.length > MAX_AUXILIARY_FRAME_BYTES) {
      throw new Error(`Auxiliary payload length must be 1..${MAX_AUXILIARY_FRAME_BYTES}`);
    }
    if (this.totalRawBytes + frame.payload.length > MAX_AUXILIARY_RAW_BYTES) {
      throw new Error(`Auxiliary raw byte budget exceeded (cap: ${MAX_AUXILIARY_RAW_BYTES})`);
    }
    if (frame.requested_summary !== undefined && this.seenOfferIds.has(frame.requested_summary.offer_id)) {
      throw new Error(`Duplicate summary offer ID: ${frame.requested_summary.offer_id}`);
    }

    const header: AuxiliaryHeader = {
      version: 1,
      process_session_id: sessionId,
      seq: frame.seq,
      connection_id: frame.connection_id,
      message_id: frame.message_id,
      byte_count: frame.payload.length,
      ...(frame.requested_summary === undefined
        ? {}
        : {
            requested_summary: {
              offer_id: frame.requested_summary.offer_id,
              window_index: frame.requested_summary.window_index,
            },
          }),
    };
    const headerBuffer = Buffer.from(JSON.stringify(header), "utf8");
    if (headerBuffer.length > MAX_AUXILIARY_HEADER_BYTES) {
      throw new Error(`Auxiliary header length ${headerBuffer.length} exceeds cap ${MAX_AUXILIARY_HEADER_BYTES}`);
    }
    const wireBytes = 4 + headerBuffer.length + frame.payload.length;
    if (this.totalWireBytes + wireBytes > MAX_AUXILIARY_WIRE_BYTES) {
      throw new Error(`Auxiliary wire byte budget exceeded (cap: ${MAX_AUXILIARY_WIRE_BYTES})`);
    }
    const wire = Buffer.allocUnsafe(wireBytes);
    wire.writeUInt32BE(headerBuffer.length, 0);
    headerBuffer.copy(wire, 4);
    frame.payload.copy(wire, 4 + headerBuffer.length);

    if (this.readiness !== null) {
      const remainingForReady = deadlineAtMs - this.options.nowMs();
      if (remainingForReady <= 0) {
        throw new AuxiliaryDeliveryError("auxiliary send deadline expired waiting for readiness");
      }
      let readyTimer: NodeJS.Timeout | undefined;
      const ready = await Promise.race([
        this.readiness,
        new Promise<boolean>((resolve) => {
          readyTimer = setTimeout(() => resolve(false), Math.max(1, remainingForReady));
        }),
      ]);
      clearTimeout(readyTimer);
      if (!ready) throw new AuxiliaryAuthenticationError(this.failure ?? "auxiliary peer is not authenticated");
    }
    if (!this.peerAuthenticated || this.activeSocket === null || this.verifier === null) {
      const remainingForAuth = deadlineAtMs - this.options.nowMs();
      if (remainingForAuth <= 0) {
        throw new AuxiliaryAuthenticationError("auxiliary peer identity is unauthenticated; connection deadline expired waiting for peer authentication");
      }
      let authTimer: NodeJS.Timeout | undefined;
      let resolve!: () => void;
      let reject!: (err: unknown) => void;
      const authPromise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      const waiter = { resolve, reject: (err: Error) => reject(err) };
      this.authWaiters.add(waiter);
      authTimer = setTimeout(() => {
        this.authWaiters.delete(waiter);
        reject(new AuxiliaryAuthenticationError("auxiliary peer identity is unauthenticated; connection deadline expired waiting for peer authentication"));
      }, Math.max(1, remainingForAuth));

      try {
        await authPromise;
      } finally {
        clearTimeout(authTimer);
        this.authWaiters.delete(waiter);
      }
    }

    const socket = this.activeSocket;
    const verifier = this.verifier;
    if (socket === null || socket.destroyed || verifier === null || !this.peerAuthenticated) {
      throw new AuxiliaryAuthenticationError(this.failure ?? "no authenticated auxiliary peer is connected");
    }

    const authenticated = await verifier.check(deadlineAtMs);
    if (!authenticated) throw new AuxiliaryAuthenticationError(this.failure ?? "auxiliary peer no longer authenticates");
    const remaining = deadlineAtMs - this.options.nowMs();
    if (remaining <= 0) throw new AuxiliaryDeliveryError("auxiliary send deadline expired before the write");
    const written = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, Math.max(1, deadlineAtMs - this.options.nowMs()));
      socket.write(wire, (error) => {
        clearTimeout(timer);
        if (error) {
          socket.destroy();
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
    if (!written) throw new AuxiliaryDeliveryError("auxiliary frame write was not accepted before the deadline");

    this.totalFrames += 1;
    this.totalRawBytes += frame.payload.length;
    this.totalWireBytes += wireBytes;

    if (frame.requested_summary === undefined) return null;
    const offerId = frame.requested_summary.offer_id;
    if (this.offerReceipts.length >= MAX_AUXILIARY_OFFERS) {
      throw new Error(`Auxiliary offer count exceeded (cap: ${MAX_AUXILIARY_OFFERS})`);
    }
    this.seenOfferIds.add(offerId);
    const receipt: AuxiliaryOfferReceipt = Object.freeze({
      attempt_id: this.options.attempt_id,
      process_session_id: sessionId,
      seq: frame.seq,
      connection_id: frame.connection_id,
      message_id: frame.message_id,
      offer_id: offerId,
      window_index: frame.requested_summary.window_index,
      observed_monotonic_ms: this.options.nowMs(),
      byte_count: frame.payload.length,
      sha256: createHash("sha256").update(frame.payload).digest("hex"),
    });
    const receiptBytes = Buffer.byteLength(JSON.stringify(receipt), "utf8");
    if (this.totalOfferReceiptBytes + receiptBytes > MAX_AUXILIARY_OFFER_RECEIPT_BYTES) {
      throw new Error("Auxiliary offer receipt byte ceiling exceeded");
    }
    this.totalOfferReceiptBytes += receiptBytes;
    this.offerReceipts.push(receipt);
    return receipt;
  }

  getObservation(): AuxiliaryTransportObservation | null {
    if (this.offerReceipts.length === 0) return null;
    const sessionId = this.options.processSessionId();
    const receipts = this.offerReceipts.filter((receipt) => receipt.process_session_id === sessionId);
    if (receipts.length === 0) return null;
    return Object.freeze({
      attempt_id: this.options.attempt_id,
      process_session_id: sessionId,
      observation_id: `obs-aux-${receipts.length}`,
      observed_monotonic_ms: this.options.nowMs(),
      offer_receipts: Object.freeze([...receipts]),
    });
  }

  getStats(): { frames: number; raw_bytes: number; wire_bytes: number; offers: number } {
    return {
      frames: this.totalFrames,
      raw_bytes: this.totalRawBytes,
      wire_bytes: this.totalWireBytes,
      offers: this.offerReceipts.length,
    };
  }

  getFailure(): string | null {
    return this.failure;
  }

  async close(): Promise<void> {
    for (const waiter of this.authWaiters) {
      waiter.reject(new AuxiliaryDeliveryError("auxiliary channel closed"));
    }
    this.authWaiters.clear();
    this.verifier?.close();
    this.verifier = null;
    if (this.activeSocket !== null) {
      this.activeSocket.destroy();
      this.activeSocket = null;
    }
    if (this.server !== null) {
      const server = this.server;
      this.server = null;
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await unlink(this.socketPath).catch(() => undefined);
  }
}
