import { DEFAULT_LIMITS, type EvidenceLimits } from "./contracts";

export class EvidenceLimitError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "EvidenceLimitError";
  }
}

export function byteSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

export class EvidenceBudget {
  private readonly limits: EvidenceLimits;
  private readonly signal: AbortSignal;
  private readonly startedAt: number;
  private acceptedEvents = 0;
  private acceptedNodes = 0;
  private sourceBytes = 0;
  private outputBytes = 0;
  private outputReserveBytes = 0;

  constructor(
    signal: AbortSignal,
    limits: EvidenceLimits = DEFAULT_LIMITS,
    startedAt: number = Date.now(),
  ) {
    this.signal = signal;
    this.limits = limits;
    this.startedAt = startedAt;
  }

  checkpoint(): void {
    this.signal.throwIfAborted();
    if (Date.now() - this.startedAt >= this.limits.elapsedMs)
      throw new EvidenceLimitError("deadline");
  }

  takeNode(depth: number): void {
    this.checkpoint();
    if (depth > this.limits.depth) throw new EvidenceLimitError("depth-limit");
    if (this.acceptedNodes >= this.limits.nodes)
      throw new EvidenceLimitError("node-limit");
    this.acceptedNodes += 1;
  }

  takeEvent(event: unknown, separators = 0): void {
    if (this.acceptedEvents >= this.limits.events)
      throw new EvidenceLimitError("event-limit");
    this.takeOutputBytes(byteSize(event) + separators);
    this.acceptedEvents += 1;
  }

  takeSourceBytes(bytes: number): void {
    if (!Number.isSafeInteger(bytes) || bytes < 0)
      throw new RangeError("Source byte count must be a nonnegative integer.");
    this.sourceBytes += bytes;
    if (this.sourceBytes > this.limits.sourceBytes)
      throw new EvidenceLimitError("source-byte-limit");
  }

  takeOutputBytes(bytes: number, terminal = false): void {
    if (!Number.isSafeInteger(bytes) || bytes < 0)
      throw new RangeError("Output byte count must be a nonnegative integer.");
    const ceiling =
      this.limits.outputBytes - (terminal ? 0 : this.outputReserveBytes);
    if (this.outputBytes + bytes > ceiling)
      throw new EvidenceLimitError("output-limit");
    this.outputBytes += bytes;
  }

  reserveTerminalOutput(bytes: number): void {
    this.outputReserveBytes = Math.max(0, bytes);
  }

  get deadlineAt(): number {
    return this.startedAt + this.limits.elapsedMs;
  }

  get nodeCount(): number {
    return this.acceptedNodes;
  }

  get eventCount(): number {
    return this.acceptedEvents;
  }

  get consumedSourceBytes(): number {
    return this.sourceBytes;
  }
}
