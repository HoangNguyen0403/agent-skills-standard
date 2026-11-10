/**
 * scripts/evals/l3/runtime/collector.ts
 *
 * Host-side offline evidence collection against the direct-VZ runner.
 *
 * The host only ever copies and hashes bytes. Guest filesystem interpretation
 * happens exclusively inside the fresh collector guest, which receives the copy
 * attached read-only and emits bounded, ordered frames over a one-way serial
 * port. The host retains the verified bodies and can later export them; deletion
 * of an attempt requires a verified export first.
 */

import { createReadStream } from "node:fs";

import { createHash } from "node:crypto";
import { getHeapStatistics } from "node:v8";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateId } from "../contracts";
import {
  buildRunConfig,
  parseSerialEvidence,
  vzRunnerArgv,
  HOST_VERIFIER_MAX_OLD_SPACE_MIB,
  MAX_EVIDENCE_FRAME_BYTES,
  MAX_EVIDENCE_FRAMES,
  MAX_EVIDENCE_TOTAL_BYTES,
} from "./vz";
import {
  COLLECTOR_WALL_MS,
  type CapabilityExpectation,
  type CollectedArtifact,
  type CollectedArtifactBody,
  type CollectorOutcome,
  type CollectorReceipt,
  type HostCapabilityVerifier,
  type PreparedImages,
  type ProcessIO,
  type SerialCapture,
  type TrustedClock,
  type VerifiedExport,
} from "./types";

export interface CollectorOptions {
  readonly io: ProcessIO;
  readonly verifier: HostCapabilityVerifier;
  readonly clock: TrustedClock;
  readonly runnerPath: string;
  readonly images: PreparedImages;
  readonly exportRoot: string;
  /** Tests only: permit an unbounded host heap for small fixtures. */
  readonly allowUnboundedHeap?: boolean;
}

export interface CollectionRequest {
  readonly collection_id: string;
  readonly original_state_path: string;
  readonly attempt_directory: string;
  readonly tokens: { readonly attach: unknown; readonly drain: unknown };
  readonly expectation: Omit<CapabilityExpectation, "action">;
}

/**
 * Untrusted-heap ceiling applied only when no explicit `--max-old-space-size`
 * was declared. Node adds young-generation space on top of the old-space cap,
 * so an old-space limit of 768 MiB yields a reported `heap_size_limit` of
 * roughly 864 MiB; the ceiling must therefore sit above that sum.
 */
export const MAX_UNDECLARED_HEAP_MIB = 950;

/**
 * Returns the declared V8 old-space cap in MiB, or null when the process was
 * not launched with `--max-old-space-size`.
 */
export function declaredOldSpaceLimitMb(execArgv: readonly string[]): number | null {
  for (const arg of execArgv) {
    const match = /^--max-old-space-size(?:=|\s+)(\d+)$/.exec(arg);
    if (match) return Number(match[1]);
  }
  return null;
}

function unavailable(
  reason: Extract<CollectorOutcome, { available: false }>["reason"],
  detail: string,
  suspectedCompromise = false,
): CollectorOutcome {
  return { available: false, reason, detail, suspected_compromise: suspectedCompromise };
}

type SerialFailureReason =
  | "frame_schema"
  | "duplicate_sequence"
  | "out_of_order_sequence"
  | "missing_complete"
  | "incomplete_artifacts"
  | "aggregate_overflow"
  | "declared_mismatch"
  | "stream_truncated";

function mapSerialFailure(reason: SerialFailureReason): {
  reason: Extract<CollectorOutcome, { available: false }>["reason"];
  compromise: boolean;
} {
  if (reason === "incomplete_artifacts") return { reason: "incomplete_artifacts", compromise: false };
  if (reason === "aggregate_overflow") return { reason: "aggregate_overflow", compromise: true };
  return { reason: "suspected_compromise", compromise: true };
}

function sha256Bytes(body: Buffer | string): string {
  return createHash("sha256").update(body).digest("hex");
}

export class OfflineEvidenceCollector {
  private readonly options: CollectorOptions;

  constructor(options: CollectorOptions) {
    this.options = options;
  }

  async collect(request: CollectionRequest): Promise<CollectorOutcome> {
    const heapLimitMb = Math.round(getHeapStatistics().heap_size_limit / (1024 * 1024));
    const declaredLimitMb = declaredOldSpaceLimitMb(process.execArgv);
    const overCeiling =
      declaredLimitMb === null
        ? heapLimitMb > MAX_UNDECLARED_HEAP_MIB
        : declaredLimitMb > HOST_VERIFIER_MAX_OLD_SPACE_MIB;
    if (overCeiling && this.options.allowUnboundedHeap !== true) {
      const declaredDetail =
        declaredLimitMb === null
          ? `V8 heap limit ${heapLimitMb} MiB > ${MAX_UNDECLARED_HEAP_MIB}`
          : `declared old-space limit ${declaredLimitMb} MiB > ${HOST_VERIFIER_MAX_OLD_SPACE_MIB}`;
      return unavailable(
        "collector_launch_failed",
        `host verifier is unconstrained (${declaredDetail}); launch the verifier with --max-old-space-size=${HOST_VERIFIER_MAX_OLD_SPACE_MIB}`,
      );
    }
    const { io, verifier, clock, runnerPath, images } = this.options;
    const now = clock.nowMs();

    const attachDecision = verifier.verify(
      request.tokens.attach,
      { ...request.expectation, action: "collector_attach" },
      now,
    );
    if (!attachDecision.valid) {
      return unavailable("attachment_unavailable", `collector_attach refused: ${attachDecision.reason ?? "denied"}`);
    }

    const collectionId = validateId(request.collection_id, "collection_id");
    if (!path.isAbsolute(request.original_state_path) || !path.isAbsolute(request.attempt_directory)) {
      return unavailable("host_copy_failed", "collector paths must be absolute");
    }

    const evidenceDir = path.join(
      this.options.exportRoot,
      request.expectation.run_id,
      String(request.expectation.attempt_index),
      collectionId,
    );
    const attemptRelative = path.relative(path.resolve(request.attempt_directory), path.resolve(evidenceDir));
    if (attemptRelative === "" || (!attemptRelative.startsWith(`..${path.sep}`) && attemptRelative !== ".." && !path.isAbsolute(attemptRelative))) {
      return unavailable("host_copy_failed", "preserved export must be outside the attempt deletion tree");
    }
    const copyPath = path.join(evidenceDir, "state.img");

    await mkdir(evidenceDir, { recursive: true });
    const copy = await io.run({
      argv: ["/bin/cp", "-c", "-p", "--", request.original_state_path, copyPath],
      timeoutMs: 900_000,
      maxStdoutBytes: 1024,
      maxStderrBytes: 16_384,
    });
    if (copy.exitCode !== 0 || copy.timedOut) {
      return unavailable("host_copy_failed", `read-only copy failed: ${copy.stderr.slice(0, 300)}`);
    }

    const hash = await io.run({
      argv: ["/usr/bin/shasum", "-a", "256", copyPath],
      timeoutMs: 600_000,
      maxStdoutBytes: 1024,
      maxStderrBytes: 1024,
    });
    if (hash.exitCode !== 0) return unavailable("host_copy_failed", "unable to hash the evidence copy");
    const copySha256 = hash.stdout.trim().split(/\s+/)[0] ?? "";
    if (!/^[0-9a-f]{64}$/.test(copySha256)) {
      return unavailable("host_copy_failed", "evidence copy digest was not canonical");
    }
    const size = await io.run({
      argv: ["/usr/bin/stat", "-f", "%z", copyPath],
      timeoutMs: 15_000,
      maxStdoutBytes: 1024,
      maxStderrBytes: 1024,
    });
    const copyBytes = Number(size.stdout.trim());
    if (!Number.isSafeInteger(copyBytes) || copyBytes <= 0) {
      return unavailable("host_copy_failed", "evidence copy size was not a positive integer");
    }

    const drainDecision = verifier.verify(
      request.tokens.drain,
      { ...request.expectation, action: "collector_drain" },
      clock.nowMs(),
    );
    if (!drainDecision.valid) {
      return unavailable("collector_stream_failed", `collector_drain refused: ${drainDecision.reason ?? "denied"}`);
    }

    const configPath = path.join(evidenceDir, "collector-run.json");
    const config = buildRunConfig({
      mode: "collect",
      deadline_ms: COLLECTOR_WALL_MS,
      kernel: images.kernel.path,
      initrd: images.initrd.path,
      kernel_cmdline: "console=hvc0 root=/dev/vda ro init=/opt/l3/init-collector",
      disks: [
        { name: "collector", path: path.join(evidenceDir, "collector.img"), read_only: false },
        { name: "state", path: copyPath, read_only: true },
      ],
    });
    await writeFile(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });

    const rootCopy = await io.run({
      argv: ["/bin/cp", "-c", "-p", "--", images.rootfs.path, config.disks[0].path],
      timeoutMs: 900_000,
      maxStdoutBytes: 1024,
      maxStderrBytes: 16_384,
    });
    if (rootCopy.exitCode !== 0) {
      return unavailable("collector_launch_failed", "collector root image copy failed");
    }

    let capture: SerialCapture;
    try {
      capture = await io.openSerialCapture({
        argv: vzRunnerArgv(runnerPath, "collect", configPath),
        timeoutMs: COLLECTOR_WALL_MS,
        maxFrames: MAX_EVIDENCE_FRAMES,
        maxFrameBytes: MAX_EVIDENCE_FRAME_BYTES,
        maxTotalBytes: MAX_EVIDENCE_TOTAL_BYTES,
        maxStderrBytes: 65_536,
      });
    } catch (error) {
      return unavailable("collector_launch_failed", reasonOf(error));
    }

    const deadlineAtMs = clock.nowMs() + COLLECTOR_WALL_MS;
    let evidence: Awaited<ReturnType<typeof parseSerialEvidence>>;
    try {
      evidence = await parseSerialEvidence((deadline) => capture.readFrame(deadline), deadlineAtMs);
    } catch (error) {
      await capture.kill();
      return unavailable("collector_stream_failed", reasonOf(error));
    }

    const stats = capture.stats();
    const exit = await capture.wait(clock.nowMs() + 10_000);
    if (!evidence.available) {
      const mapped = mapSerialFailure(evidence.reason);
      return unavailable(mapped.reason, `${evidence.detail} (runner exit=${String(exit.exitCode)})`, mapped.compromise);
    }
    if (stats.truncated) {
      return unavailable("aggregate_overflow", "serial capture reported truncation", true);
    }
    if (exit.exitCode !== 0) {
      return unavailable("collector_stream_failed", `collector runner exited ${String(exit.exitCode)}`);
    }

    const bodies: CollectedArtifactBody[] = [];
    const artifacts: CollectedArtifact[] = [];
    for (const artifact of evidence.artifacts) {
      const retainPath = path.join(evidenceDir, artifact.name);
      if (path.dirname(retainPath) !== evidenceDir) {
        return unavailable("suspected_compromise", `artifact escaped its directory: ${artifact.name}`, true);
      }
      await writeFile(retainPath, artifact.bytes, { mode: 0o600 });
      const readBack = await readFile(retainPath);
      if (sha256Bytes(readBack) !== artifact.sha256) {
        return unavailable("suspected_compromise", `retained body hash mismatch: ${artifact.name}`, true);
      }
      bodies.push({
        name: artifact.name,
        sha256: artifact.sha256,
        byte_length: artifact.byte_length,
        retained_path: retainPath,
        bytes: artifact.bytes,
      });
      artifacts.push({
        name: artifact.name,
        sha256: artifact.sha256,
        byte_length: artifact.byte_length,
        frames: artifact.frames,
      });
    }

    const receipt: CollectorReceipt = Object.freeze({
      schema_version: 1,
      collection_id: collectionId,
      run_id: request.expectation.run_id,
      attempt_index: request.expectation.attempt_index,
      original_disk_path: request.original_state_path,
      readonly_copy_path: copyPath,
      readonly_copy_sha256: copySha256,
      readonly_copy_bytes: copyBytes,
      collector_instance: config.disks[0].path,
      collected_at: new Date(clock.nowMs()).toISOString(),
      artifacts: Object.freeze(artifacts),
      total_frames: evidence.frames,
      total_bytes: evidence.bytes,
      coverage: Object.freeze({
        required_artifacts_present: true,
        stream_terminated: exit.exitCode === 0,
        duplicate_frames: 0,
        discarded_frames: 0,
        out_of_order_frames: 0,
      }),
      log_sha256: sha256Bytes(
        JSON.stringify({
          collection_id: collectionId,
          copy: copySha256,
          artifacts: artifacts.map((entry) => `${entry.name}:${entry.sha256}`),
        }),
      ),
    });

    return { available: true, receipt, bodies };
  }
}

/**
 * Positive proof that the retained bodies and the read-only copy still match, so
 * deletion of the attempt's own files can be scoped to that evidence.
 */
export async function verifyExport(
  receipt: CollectorReceipt,
  bodies: readonly CollectedArtifactBody[],
  nowMs?: number,
): Promise<VerifiedExport> {
  if (bodies.length !== receipt.artifacts.length || bodies.length === 0) {
    throw new Error("verified export requires every retained artifact body");
  }
  const seen = new Set<string>();
  for (const body of bodies) {
    if (seen.has(body.name)) throw new Error(`duplicate retained artifact ${body.name}`);
    seen.add(body.name);
    const readBack = await readFile(body.retained_path);
    if (sha256Bytes(readBack) !== body.sha256) {
      throw new Error(`retained artifact ${body.name} no longer matches its receipt digest`);
    }
    const declared = receipt.artifacts.find((entry) => entry.name === body.name);
    if (declared === undefined || declared.sha256 !== body.sha256 || declared.byte_length !== body.byte_length) {
      throw new Error(`artifact ${body.name} is not present in the receipt`);
    }
  }
  if (!receipt.coverage.stream_terminated) throw new Error("receipt does not record a terminated evidence stream");
  const copyHash = createHash("sha256");
  let copyBytes = 0;
  for await (const chunk of createReadStream(receipt.readonly_copy_path)) {
    const bytes = chunk as Buffer;
    copyHash.update(bytes);
    copyBytes += bytes.length;
  }
  if (copyBytes !== receipt.readonly_copy_bytes || copyHash.digest("hex") !== receipt.readonly_copy_sha256) {
    throw new Error("preserved readonly copy no longer matches its receipt digest");
  }
  return {
    collection_id: receipt.collection_id,
    run_id: receipt.run_id,
    attempt_index: receipt.attempt_index,
    readonly_copy_path: receipt.readonly_copy_path,
    readonly_copy_sha256: receipt.readonly_copy_sha256,
    verified_at_ms: nowMs ?? Date.now(),
  };
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
