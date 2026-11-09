/**
 * scripts/evals/l3/runtime/vz.ts
 *
 * Host-side contract for the direct Apple Virtualization.framework runner.
 *
 * The runner is driven only by a frozen JSON config written before boot. The
 * config cannot express network, socket, directory-sharing or USB devices, so
 * there is nothing to disable and nothing to attest. Host/guest communication is
 * a one-way serial capture whose caps are enforced here.
 */

import { createHash } from "node:crypto";
import { strictObject, validateId, validateNat, validatePositive } from "../contracts";
import {
  PRIVILEGED_ACTIONS,
  RUNTIME_TOPOLOGY,
  VM_CPU_COUNT,
  VM_MEMORY_BYTES,
  SerialCleanEOF,
  SerialCaptureFailure,
  type PreparedImageFile,
  type PreparedImages,
  type PrivilegedAction,
  type ProcessIO,
  type RuntimeTopology,
} from "./types";

export const VZ_RUNNER_BINARY = "l3vz" as const;

/** Privileged actions this backend exposes (no guest-control verbs exist). */
export function availableActions(): readonly PrivilegedAction[] {
  return PRIVILEGED_ACTIONS;
}
export const VZ_RUN_CONFIG_NAME = "run.json" as const;
export const MAX_VZ_DISKS = 4;
export const MAX_VZ_DEADLINE_MS = 600_000;
export const REQUIRED_EVIDENCE_ARTIFACTS = [
  "events.jsonl",
  "output.log",
  "receipt.json",
] as const;
export const MAX_EVIDENCE_FRAME_BYTES = 65_536;
export const MAX_EVIDENCE_TOTAL_BYTES = 117_440_512;
export const MAX_EVIDENCE_FRAMES = 4_096;
export const MAX_EVIDENCE_ARTIFACT_BYTES = 81_788_928;
/** Fixed host verifier V8 old-space ceiling (mirrors the guest init scripts). */
export const HOST_VERIFIER_MAX_OLD_SPACE_MIB = 768;

const SHA256_HEX = /^[0-9a-f]{64}$/;
const DOCKER_DIGEST = /^sha256:[0-9a-f]{64}$/;
const ABSOLUTE_PATH = /^\//;

export type VzMode = "start" | "collect";

export interface VzDiskSpec {
  readonly name: string;
  readonly path: string;
  readonly read_only: boolean;
}

export interface VzRunConfig {
  readonly schema_version: 1;
  readonly topology: RuntimeTopology;
  readonly mode: VzMode;
  readonly cpu_count: number;
  readonly memory_bytes: number;
  readonly deadline_ms: number;
  readonly boot: {
    readonly kernel: string;
    readonly initrd: string;
    readonly kernel_cmdline: string;
  };
  readonly disks: readonly VzDiskSpec[];
  readonly serial_fd: number;
}

export function assertAbsolutePath(what: string, value: string): string {
  if (!ABSOLUTE_PATH.test(value) || value.includes("\u0000") || value.includes("..")) {
    throw new Error(`${what} must be an absolute path without traversal: ${value}`);
  }
  return value;
}

/**
 * Validates and freezes a run config. `disks` is the only place a device can be
 * described, and only block storage is representable.
 */
export function buildRunConfig(input: {
  mode: VzMode;
  deadline_ms: number;
  kernel: string;
  initrd: string;
  kernel_cmdline: string;
  disks: readonly VzDiskSpec[];
}): VzRunConfig {
  if (input.mode !== "start" && input.mode !== "collect") throw new Error(`unsupported mode: ${input.mode}`);
  if (!Number.isSafeInteger(input.deadline_ms) || input.deadline_ms <= 0 || input.deadline_ms > MAX_VZ_DEADLINE_MS) {
    throw new Error(`deadline_ms must be a positive safe integer <= ${MAX_VZ_DEADLINE_MS}`);
  }
  if (input.disks.length === 0 || input.disks.length > MAX_VZ_DISKS) {
    throw new Error(`disks must contain 1..${MAX_VZ_DISKS} entries`);
  }
  const names = new Set<string>();
  const disks: VzDiskSpec[] = input.disks.map((disk) => {
    if (!/^[a-z][a-z0-9_-]{0,31}$/.test(disk.name)) throw new Error(`invalid disk name: ${disk.name}`);
    if (names.has(disk.name)) throw new Error(`duplicate disk name: ${disk.name}`);
    names.add(disk.name);
    return {
      name: disk.name,
      path: assertAbsolutePath(`disk ${disk.name} path`, disk.path),
      read_only: disk.read_only === true,
    };
  });
  if (input.mode === "collect" && !disks.some((disk) => disk.read_only)) {
    throw new Error("collector mode requires a read-only evidence disk");
  }
  if (input.mode === "collect" && disks.some((disk) => disk.name === "state" && !disk.read_only)) {
    throw new Error("collector evidence disk must be read-only");
  }

  return Object.freeze({
    schema_version: 1,
    topology: RUNTIME_TOPOLOGY,
    mode: input.mode,
    cpu_count: VM_CPU_COUNT,
    memory_bytes: VM_MEMORY_BYTES,
    deadline_ms: input.deadline_ms,
    boot: {
      kernel: assertAbsolutePath("boot.kernel", input.kernel),
      initrd: assertAbsolutePath("boot.initrd", input.initrd),
      kernel_cmdline: input.kernel_cmdline,
    },
    disks: Object.freeze(disks),
    serial_fd: 3,
  });
}

/** Fixed runner argv. `--config` is the only variable input. */
export function vzRunnerArgv(
  runnerPath: string,
  mode: VzMode,
  configPath: string,
): readonly [string, string, string, string] {
  assertAbsolutePath("runner path", runnerPath);
  assertAbsolutePath("run config path", configPath);
  return [runnerPath, mode, "--config", configPath];
}

function fileFact(raw: unknown, context: string): PreparedImageFile {
  const record = strictObject(raw, context, ["path", "sha256", "bytes"]);
  const path = assertAbsolutePath(`${context}.path`, String(record.path));
  if (typeof record.sha256 !== "string" || !SHA256_HEX.test(record.sha256)) {
    throw new Error(`${context}.sha256 must be 64 lowercase hex characters`);
  }
  return { path, sha256: record.sha256, bytes: validateNat(record.bytes, `${context}.bytes`) };
}

/**
 * Preflight for accepted prepared images. Only schema-valid, byte-verified facts
 * are accepted; nothing is built, downloaded or installed here.
 */
export function parsePreparedImages(raw: unknown): PreparedImages {
  const REQUIRED_KEYS = [
    "schema_version",
    "topology",
    "kernel",
    "initrd",
    "rootfs",
    "guest_programs",
    "driver_tree",
    "docker",
    "runtime",
    "verified_at",
    "verified_by",
  ] as const;
  const ALLOWED_KEYS = new Set<string>([...REQUIRED_KEYS, "arch", "build_spec_sha256"]);
  const record = strictObject(raw, "prepared-images", REQUIRED_KEYS) as Record<string, unknown>;
  const rawRecord = raw as Record<string, unknown>;
  for (const key of Object.keys(rawRecord)) {
    if (!ALLOWED_KEYS.has(key)) throw new Error(`Unknown field '${key}' in prepared-images`);
  }
  if (record.schema_version !== 1) throw new Error("prepared-images.schema_version must be 1");
  if (record.topology !== RUNTIME_TOPOLOGY) {
    throw new Error(`prepared-images.topology must be ${RUNTIME_TOPOLOGY}`);
  }
  const programs = strictObject(record.guest_programs, "prepared-images.guest_programs", [
    "controller",
    "collector",
  ]);
  const docker = strictObject(record.docker, "prepared-images.docker", [
    "docker_engine_sha256",
    "node_image_sha256",
    "offline_bundle_sha256",
  ]);
  for (const key of ["docker_engine_sha256", "node_image_sha256"] as const) {
    if (typeof docker[key] !== "string" || !DOCKER_DIGEST.test(docker[key] as string)) {
      throw new Error(`prepared-images.docker.${key} must be a sha256 image digest`);
    }
  }
  if (typeof docker.offline_bundle_sha256 !== "string" || !SHA256_HEX.test(docker.offline_bundle_sha256)) {
    throw new Error("prepared-images.docker.offline_bundle_sha256 must be 64 lowercase hex characters");
  }
  const runtime = strictObject(record.runtime, "prepared-images.runtime", [
    "node_version",
    "docker_version",
  ]);
  for (const key of ["node_version", "docker_version"] as const) {
    if (typeof runtime[key] !== "string" || !/^\d+\.\d+\.\d+/.test(runtime[key] as string)) {
      throw new Error(`prepared-images.runtime.${key} must be a concrete version`);
    }
  }
  if (typeof record.verified_at !== "string" || Number.isNaN(Date.parse(record.verified_at))) {
    throw new Error("prepared-images.verified_at must be an ISO timestamp");
  }
  if (typeof record.verified_by !== "string" || record.verified_by.length === 0) {
    throw new Error("prepared-images.verified_by must be non-empty");
  }

  return Object.freeze({
    schema_version: 1,
    topology: RUNTIME_TOPOLOGY,
    kernel: fileFact(record.kernel, "prepared-images.kernel"),
    initrd: fileFact(record.initrd, "prepared-images.initrd"),
    rootfs: fileFact(record.rootfs, "prepared-images.rootfs"),
    guest_programs: {
      controller: fileFact(programs.controller, "prepared-images.guest_programs.controller"),
      collector: fileFact(programs.collector, "prepared-images.guest_programs.collector"),
    },
    driver_tree: fileFact(record.driver_tree, "prepared-images.driver_tree"),
    docker: {
      docker_engine_sha256: docker.docker_engine_sha256 as string,
      node_image_sha256: docker.node_image_sha256 as string,
      offline_bundle_sha256: docker.offline_bundle_sha256 as string,
    },
    runtime: { node_version: runtime.node_version as string, docker_version: runtime.docker_version as string },
    arch: typeof record.arch === "string" && record.arch === "aarch64" ? "aarch64" : undefined,
    build_spec_sha256: typeof record.build_spec_sha256 === "string" ? record.build_spec_sha256 : undefined,
    verified_at: record.verified_at,
    verified_by: record.verified_by,
  });
}

/** Byte-verifies every prepared file before any VM is created. */
export async function verifyPreparedImages(io: ProcessIO, images: PreparedImages): Promise<PreparedImages> {
  const files: readonly [string, PreparedImageFile][] = [
    ["kernel", images.kernel],
    ["initrd", images.initrd],
    ["rootfs", images.rootfs],
    ["guest_programs.controller", images.guest_programs.controller],
    ["guest_programs.collector", images.guest_programs.collector],
    ["driver_tree", images.driver_tree],
  ];
  for (const [label, fact] of files) {
    const hash = await io.run({
      argv: ["/usr/bin/shasum", "-a", "256", fact.path],
      timeoutMs: 600_000,
      maxStdoutBytes: 1024,
      maxStderrBytes: 1024,
    });
    if (hash.exitCode !== 0) throw new Error(`unable to hash prepared ${label}`);
    const observed = hash.stdout.trim().split(/\s+/)[0];
    if (observed !== fact.sha256) {
      throw new Error(`prepared ${label} bytes do not match the accepted digest`);
    }
    const size = await io.run({
      argv: ["/usr/bin/stat", "-f", "%z", fact.path],
      timeoutMs: 15_000,
      maxStdoutBytes: 1024,
      maxStderrBytes: 1024,
    });
    if (size.exitCode !== 0 || Number(size.stdout.trim()) !== fact.bytes) {
      throw new Error(`prepared ${label} size does not match the accepted fact`);
    }
  }
  return images;
}

// ---------------------------------------------------------------------------
// One-way serial evidence
// ---------------------------------------------------------------------------

export interface SerialArtifact {
  readonly name: string;
  /**
   * Exact artifact bytes as retained. Console output may contain NUL bytes,
   * invalid UTF-8 or unbalanced quoting, so the transfer representation is
   * reversible base64 and the retained value is raw bytes.
   */
  readonly bytes: Buffer;
  readonly sha256: string;
  readonly byte_length: number;
  readonly frames: number;
}

export type SerialEvidenceOutcome =
  | {
      readonly available: true;
      readonly artifacts: readonly SerialArtifact[];
      readonly frames: number;
      readonly bytes: number;
    }
  | {
      readonly available: false;
      readonly reason:
        | "frame_schema"
        | "duplicate_sequence"
        | "out_of_order_sequence"
        | "missing_complete"
        | "incomplete_artifacts"
        | "aggregate_overflow"
        | "declared_mismatch"
        | "stream_truncated";
      readonly detail: string;
      readonly suspected_compromise: boolean;
    };

interface PendingArtifact {
  readonly chunks: Buffer[];
  readonly sequences: number[];
}

/** Strict canonical base64: rejects padding/length tricks and non-canonical tails. */
function decodeBase64(value: string): Buffer {
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error("evidence frame data is not canonical base64");
  }
  const body = Buffer.from(value, "base64");
  if (body.toString("base64") !== value) throw new Error("evidence frame data is not canonical base64");
  return body;
}

function dataFrame(raw: unknown): { artifact: string; seq: number; data: Buffer } {
  const record = strictObject(raw, "EvidenceFrame", ["version", "artifact", "seq", "encoding", "data"]);
  if (record.version !== 1) throw new Error("evidence frame version must be 1");
  const artifact = validateId(record.artifact, "artifact");
  if (!(REQUIRED_EVIDENCE_ARTIFACTS as readonly string[]).includes(artifact)) {
    throw new Error(`unexpected evidence artifact: ${artifact}`);
  }
  if (record.encoding !== "base64") throw new Error("evidence frame encoding must be base64");
  if (typeof record.data !== "string") throw new Error("evidence frame data must be a string");
  return { artifact, seq: validatePositive(record.seq, "seq"), data: decodeBase64(record.data) };
}

function completeFrame(raw: unknown): { artifacts: readonly string[]; frames: number; bytes: number } {
  const record = strictObject(raw, "EvidenceComplete", ["version", "complete", "artifacts", "frames", "bytes"]);
  if (record.version !== 1 || record.complete !== true) throw new Error("invalid completion frame");
  if (!Array.isArray(record.artifacts)) throw new Error("completion artifacts must be an array");
  const artifacts = record.artifacts.map((entry) => validateId(entry, "completion.artifact"));
  return {
    artifacts,
    frames: validateNat(record.frames, "completion.frames"),
    bytes: validateNat(record.bytes, "completion.bytes"),
  };
}

export function isCompleteFrame(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null) return false;
  const record = raw as Record<string, unknown>;
  return Object.prototype.hasOwnProperty.call(record, "complete");
}

/**
 * Consumes serial frames until EOF. Requires a final explicit completion frame,
 * monotonic per-artifact sequences, exact artifact coverage, and declared totals
 * matching observation; nothing is returned on any violation.
 */
/**
 * Ceilings used while parsing the serial evidence stream. Production uses the
 * declared defaults; a wider value is only supplied by an explicitly measured,
 * reviewed retention decision, never inferred here.
 */
export interface SerialEvidenceLimits {
  readonly frame_bytes: number;
  readonly artifact_bytes: number;
  readonly total_bytes: number;
  readonly frames: number;
}

export const DEFAULT_SERIAL_EVIDENCE_LIMITS: SerialEvidenceLimits = Object.freeze({
  frame_bytes: MAX_EVIDENCE_FRAME_BYTES,
  artifact_bytes: MAX_EVIDENCE_ARTIFACT_BYTES,
  total_bytes: MAX_EVIDENCE_TOTAL_BYTES,
  frames: MAX_EVIDENCE_FRAMES,
});

export async function parseSerialEvidence(
  readFrame: (deadlineAtMs: number) => Promise<string>,
  deadlineAtMs: number,
  limits: SerialEvidenceLimits = DEFAULT_SERIAL_EVIDENCE_LIMITS,
): Promise<SerialEvidenceOutcome> {
  const artifacts = new Map<string, PendingArtifact>();
  let frames = 0;
  let bytes = 0;
  let dataBytes = 0;
  let complete: { artifacts: readonly string[]; frames: number; bytes: number } | null = null;

  for (;;) {
    let frame: string;
    try {
      frame = await readFrame(deadlineAtMs);
    } catch (error) {
      if (!(error instanceof SerialCleanEOF)) {
        const isMalformed = error instanceof SerialCaptureFailure && error.kind === "malformed";
        return {
          available: false,
          reason: isMalformed ? "frame_schema" : "stream_truncated",
          detail: `serial stream did not reach clean EOF: ${reasonOf(error)}`,
          suspected_compromise: isMalformed,
        };
      }
      if (complete === null) {
        return {
          available: false,
          reason: "missing_complete",
          detail: "clean EOF before a completion frame",
          suspected_compromise: true,
        };
      }
      break;
    }

    const frameBytes = Buffer.byteLength(frame, "utf8");
    if (frameBytes > limits.frame_bytes) {
      return {
        available: false,
        reason: "frame_schema",
        detail: `frame exceeded ${limits.frame_bytes} bytes`,
        suspected_compromise: true,
      };
    }
    bytes += frameBytes;
    if (bytes > limits.total_bytes) {
      return {
        available: false,
        reason: "aggregate_overflow",
        detail: `serial evidence exceeded ${limits.total_bytes} bytes`,
        suspected_compromise: true,
      };
    }
    frames += 1;
    if (frames > limits.frames) {
      return {
        available: false,
        reason: "aggregate_overflow",
        detail: `serial evidence exceeded ${limits.frames} frames`,
        suspected_compromise: true,
      };
    }
    if (complete !== null) {
      return {
        available: false,
        reason: "frame_schema",
        detail: "data arrived after the completion frame",
        suspected_compromise: true,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(frame);
    } catch (error) {
      return {
        available: false,
        reason: "frame_schema",
        detail: `malformed evidence frame: ${reasonOf(error)}`,
        suspected_compromise: true,
      };
    }

    if (isCompleteFrame(parsed)) {
      try {
        complete = completeFrame(parsed);
      } catch (error) {
        return {
          available: false,
          reason: "frame_schema",
          detail: reasonOf(error),
          suspected_compromise: true,
        };
      }
      continue;
    }

    dataBytes += frameBytes;

    let entry: { artifact: string; seq: number; data: Buffer };
    try {
      entry = dataFrame(parsed);
    } catch (error) {
      return {
        available: false,
        reason: "frame_schema",
        detail: reasonOf(error),
        suspected_compromise: true,
      };
    }

    const pending = artifacts.get(entry.artifact) ?? { chunks: [], sequences: [] };
    const expected = pending.sequences.length + 1;
    if (pending.sequences.includes(entry.seq)) {
      return {
        available: false,
        reason: "duplicate_sequence",
        detail: `duplicate seq ${entry.seq} for ${entry.artifact}`,
        suspected_compromise: true,
      };
    }
    if (entry.seq !== expected) {
      return {
        available: false,
        reason: "out_of_order_sequence",
        detail: `expected seq ${expected} for ${entry.artifact}, received ${entry.seq}`,
        suspected_compromise: true,
      };
    }
    pending.sequences.push(entry.seq);
    pending.chunks.push(entry.data);
    artifacts.set(entry.artifact, pending);
  }

  if (complete === null) {
    return { available: false, reason: "missing_complete", detail: "no completion frame", suspected_compromise: true };
  }
  if (complete.frames !== frames - 1 || complete.bytes !== dataBytes) {
    return {
      available: false,
      reason: "declared_mismatch",
      detail: `completion declared frames=${complete.frames} bytes=${complete.bytes}, observed frames=${frames - 1} bytes=${dataBytes}`,
      suspected_compromise: true,
    };
  }

  const declared = [...complete.artifacts].sort();
  const expectedNames = [...REQUIRED_EVIDENCE_ARTIFACTS].sort();
  if (declared.length !== expectedNames.length || declared.some((name, index) => name !== expectedNames[index])) {
    return {
      available: false,
      reason: "incomplete_artifacts",
      detail: `completion declared artifacts ${declared.join(",")}`,
      suspected_compromise: false,
    };
  }

  const collected: SerialArtifact[] = [];
  for (const name of REQUIRED_EVIDENCE_ARTIFACTS) {
    const pending = artifacts.get(name);
    if (pending === undefined || pending.chunks.length === 0) {
      return {
        available: false,
        reason: "incomplete_artifacts",
        detail: `required evidence artifact missing: ${name}`,
        suspected_compromise: false,
      };
    }
    const body = Buffer.concat(pending.chunks);
    if (body.length > limits.artifact_bytes) {
      return {
        available: false,
        reason: "aggregate_overflow",
        detail: `artifact ${name} exceeded ${limits.artifact_bytes} bytes`,
        suspected_compromise: true,
      };
    }
    collected.push({
      name,
      bytes: body,
      sha256: createHash("sha256").update(body).digest("hex"),
      byte_length: body.length,
      frames: pending.chunks.length,
    });
  }

  return { available: true, artifacts: collected, frames: frames - 1, bytes };
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

