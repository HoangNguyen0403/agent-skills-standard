/**
 * scripts/evals/l3/runtime/guest/collector.ts
 *
 * Fresh-collector guest program.
 *
 * The evidence disk is attached read-only. This program is the only code allowed
 * to interpret the guest filesystem. It reads a fixed artifact allowlist from
 * fixed paths, emits strictly ordered frames over the one-way serial port, then
 * an explicit completion frame with declared totals, then exits. It never
 * accepts guest-chosen paths or commands and never mutates the evidence.
 */

import { createWriteStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const COLLECTOR_ARTIFACTS = ["events.jsonl", "output.log", "receipt.json"] as const;
/** The read-only evidence filesystem is mounted at this fixed path by init. */
export const COLLECTOR_EVIDENCE_ROOT = "/evidence" as const;
/**
 * Raw bytes are carried as canonical base64 so NUL bytes, invalid UTF-8 and
 * unbalanced quoting survive exactly. Chunks are sized from the *encoded* frame
 * budget, because a raw-byte chunk is not a frame-budget unit: base64 expands by
 * 4/3 and JSON escaping adds the container overhead.
 */
export const COLLECTOR_ENCODING = "base64" as const;
export const COLLECTOR_MAX_FRAME_BYTES = 65_536;
export const COLLECTOR_MAX_ARTIFACT_BYTES = 81_788_928;
export const COLLECTOR_MAX_TOTAL_BYTES = 117_440_512;
/** Worst-case JSON container around the base64 body, including a maximum seq. */
export const COLLECTOR_FRAME_OVERHEAD_BYTES = 128;

export interface CollectorLimits {
  readonly artifact_bytes: number;
  readonly total_bytes: number;
  readonly frame_bytes?: number;
}

export const DEFAULT_COLLECTOR_LIMITS: CollectorLimits = Object.freeze({
  artifact_bytes: COLLECTOR_MAX_ARTIFACT_BYTES,
  total_bytes: COLLECTOR_MAX_TOTAL_BYTES,
});

export interface CollectorPorts {
  readonly evidenceRoot: string;
  readonly writeFrame: (frame: string) => Promise<void>;
  /**
   * Ceilings used for this collection. Production uses the declared defaults;
   * a wider value is only ever supplied by an explicitly measured, reviewed
   * retention decision, never inferred here.
   */
  readonly limits?: CollectorLimits;
}

export interface CollectorRunResult {
  readonly frames: number;
  /** Wire bytes emitted, including framing and the completion frame. */
  readonly bytes: number;
  readonly artifacts: readonly string[];
}

/** Largest raw chunk whose base64 payload still fits one frame. */
export function collectorChunkBytes(frameBytes: number = COLLECTOR_MAX_FRAME_BYTES): number {
  const available = frameBytes - COLLECTOR_FRAME_OVERHEAD_BYTES;
  if (available <= 0) throw new Error("frame ceiling is smaller than the frame container overhead");
  return Math.floor(available / 4) * 3;
}

/**
 * Emits every artifact in a fixed order with contiguous per-artifact sequence
 * numbers. Completion is only written after the whole set was read.
 */
export async function runCollector(ports: CollectorPorts): Promise<CollectorRunResult> {
  let frames = 0;
  let bytes = 0;
  const emitted: string[] = [];
  const limits = ports.limits ?? DEFAULT_COLLECTOR_LIMITS;
  const chunkBytes = collectorChunkBytes(limits.frame_bytes);

  for (const artifact of COLLECTOR_ARTIFACTS) {
    const filePath = path.join(ports.evidenceRoot, artifact);
    const body = await readFile(filePath);
    if (body.length > limits.artifact_bytes) {
      throw new Error(`artifact ${artifact} exceeds the collector artifact ceiling`);
    }
    // An empty artifact is a valid artifact (no observations for a build-only
    // attempt): emit one empty frame so presence and ordering still hold.
    const offsets: number[] = [];
    for (let offset = 0; offset < body.length; offset += chunkBytes) offsets.push(offset);
    if (offsets.length === 0) offsets.push(0);
    for (let index = 0; index < offsets.length; index += 1) {
      const offset = offsets[index] ?? 0;
      const frame = `${JSON.stringify({
        version: 1,
        artifact,
        seq: index + 1,
        encoding: COLLECTOR_ENCODING,
        data: body.subarray(offset, offset + chunkBytes).toString("base64"),
      })}\n`;
      const frameBytes = Buffer.byteLength(frame, "utf8");
      if (frameBytes > (limits.frame_bytes ?? COLLECTOR_MAX_FRAME_BYTES)) {
        throw new Error(`artifact ${artifact} frame exceeds the frame ceiling`);
      }
      if (bytes + frameBytes > limits.total_bytes) {
        throw new Error("collector output exceeded its aggregate ceiling");
      }
      await ports.writeFrame(frame);
      frames += 1;
      bytes += frameBytes;
    }
    emitted.push(artifact);
  }

  const complete = `${JSON.stringify({
    version: 1,
    complete: true,
    artifacts: emitted,
    frames,
    bytes,
  })}\n`;
  const completeBytes = Buffer.byteLength(complete, "utf8");
  if (bytes + completeBytes > limits.total_bytes) {
    throw new Error("completion frame would exceed the collector aggregate ceiling");
  }
  await ports.writeFrame(complete);
  return { frames, bytes: bytes + completeBytes, artifacts: emitted };
}

export async function collectorMain(): Promise<void> {
  const consolePath = "/dev/hvc0";
  const outputStream = existsSync(consolePath)
    ? createWriteStream(consolePath, { flags: "w" })
    : process.stdout;

  await runCollector({
    evidenceRoot: COLLECTOR_EVIDENCE_ROOT,
    writeFrame: async (frame: string) => {
      outputStream.write(frame);
    },
  });
}
