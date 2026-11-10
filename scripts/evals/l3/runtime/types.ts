/**
 * scripts/evals/l3/runtime/types.ts
 *
 * Public types for the L3 runtime adapter (D2).
 * Authoritative source: docs/srs/srs-skill-system-effectiveness.md Revision 3.
 *
 * Every value that crosses a trust boundary is typed here; host-supplied
 * capabilities are separate interfaces so no JSON/env string can mint authority.
 */

import type { Id, Nat, Positive, TerminalState } from "../contracts";
import type { L3Manifest, RuntimePolicy, StageLimitsBuild, StageLimitsRun } from "../manifest";

export type { L3Manifest, RuntimePolicy, StageLimitsBuild, StageLimitsRun };

export const RUNTIME_TOPOLOGY = "apple-vz-direct-arm64" as const;
export type RuntimeTopology = typeof RUNTIME_TOPOLOGY;

/** Version of this adapter implementation, recorded in attempt receipts. */
export const RUNTIME_ADAPTER_VERSION = "2.0.0" as const;

/** Minimum macOS that ships the Virtualization.framework surface used here. */
export const MIN_MACOS_MAJOR = 14 as const;
/** Fixed VM ceilings from the SRS diagnostics profile. */
export const VM_CPU_COUNT = 4 as const;
export const VM_MEMORY_BYTES = 8 * 1024 * 1024 * 1024;
export const VM_DISK_GIB = 40 as const;

/** Ceiling: 32 attempts per qualification session (SRS 6.4). */
export const MAX_SESSION_ATTEMPTS = 32 as const;
/** Ceiling: 2 hours per qualification session (SRS 6.4). */
export const MAX_SESSION_DURATION_MS = 7_200_000 as const;
/** Ceiling: 8 GiB of host-observed writes per qualification session (SRS 6.4). */
export const MAX_SESSION_DISK_BYTES = 8 * 1024 * 1024 * 1024;
/** Ceiling: 90 s whole-attempt wall limit (SRS overload schedule). */
export const MAX_ATTEMPT_WALL_MS = 90_000;
/** SRS: maximum response delay 5 s; `drain` bounded at 10 s. */
export const RESPONSE_DEADLINE_MS = 5_000;
export const DRAIN_DEADLINE_MS = 10_000;

/**
 * Distinct stage ceilings. Staging (copy/pre-exposure verification) and the
 * offline build are not the same operation as a candidate run.
 */
export const STAGE_WALL_MS = 120_000;
export const BUILD_WALL_MS = 120_000;
export const RUN_WALL_MS = 90_000;
export const COLLECTOR_WALL_MS = 180_000;
/** Long controller operations need an absolute ceiling beyond the generic RPC one. */
export const LONG_OPERATION_WALL_MS = 120_000;

/** Bounded transport and observation budgets (host and guest). */
export const MAX_TRANSPORT_QUEUE_FRAMES = 64;
export const MAX_TRANSPORT_QUEUE_BYTES = 4 * 1024 * 1024;
export const MAX_OBSERVATIONS = 1_024;
export const MAX_OBSERVATION_LOG_BYTES = 512 * 1024;

// ---------------------------------------------------------------------------
// Lowest-level process IO
// ---------------------------------------------------------------------------

export interface ProcessIORequest {
  /** Fixed argv. Never a shell string; never candidate-controlled. */
  readonly argv: readonly string[];
  readonly cwd?: string;
  /** Explicit, minimal environment. No inherited host environment by default. */
  readonly env?: Readonly<Record<string, string>>;
  /** Hard wall-clock ceiling. The implementation must kill the child. */
  readonly timeoutMs: number;
  /** Per-stream retained-byte ceiling. Exceeding it terminates and flags truncation. */
  readonly maxStdoutBytes: number;
  readonly maxStderrBytes: number;
  readonly signal?: AbortSignal;
}

export interface ProcessIOResult {
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
  /** True when a stream cap was hit; the child was terminated for that reason. */
  readonly stdoutTruncated: boolean;
  readonly stderrTruncated: boolean;
  readonly timedOut: boolean;
  readonly cancelled: boolean;
  /** Total bytes observed on both streams, including bytes dropped past a cap. */
  readonly observedBytes: number;
  readonly durationMs: number;
}

/**
 * One-way host-visible serial capture.
 *
 * The runner passes its guest console write handle into an inherited pipe; the
 * host keeps only the read end. There is no write path to the guest, so this is
 * not a control channel. The host enforces frame/byte/time caps and terminates
 * the runner (and therefore the VM) when a cap is hit.
 */
export interface SerialCaptureRequest {
  readonly argv: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  /** Absolute wall ceiling for the whole runner process. */
  readonly timeoutMs: number;
  readonly maxFrames: number;
  readonly maxFrameBytes: number;
  readonly maxTotalBytes: number;
  readonly maxStderrBytes?: number;
  readonly signal?: AbortSignal;
}

export interface SerialCaptureStats {
  readonly frames: number;
  readonly bytes: number;
  readonly truncated: boolean;
  readonly killed: boolean;
}

export class SerialCleanEOF extends Error {
  constructor() {
    super("serial stream reached clean EOF");
    this.name = "SerialCleanEOF";
  }
}

export class SerialCaptureFailure extends Error {
  constructor(readonly kind: "deadline" | "cancelled" | "malformed" | "process", message: string) {
    super(message);
    this.name = "SerialCaptureFailure";
  }
}

/** A runner lifecycle event read from the runner's own stdout (never the guest). */
export interface RunnerStatusEvent {
  readonly event: string;
  readonly detail?: string;
  readonly [key: string]: unknown;
}

export interface SerialCapture {
  /** Returns each guest console frame; clean EOF is distinct from every transport failure. */
  readFrame(deadlineAtMs: number): Promise<string>;
  /** Non-destructive query to check if the runner has already completed and recorded exit status. */
  isExited(): { readonly exited: boolean; readonly exitCode: number | null; readonly signal: NodeJS.Signals | null };
  wait(deadlineAtMs: number): Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>;
  kill(): Promise<void>;
  stats(): SerialCaptureStats;
  /**
   * Runner-owned lifecycle events (`started`, `stopped`, `deadline_exceeded`,
   * `host_stop_requested`, `error`). These are host-observed process output, not
   * guest claims, and are the only accepted proof of an orderly VM stop.
   */
  statusEvents(): readonly RunnerStatusEvent[];
  /** Runner process id, recorded before its start is trusted. */
  runnerPid(): number | null;
}

export interface ProcessIO {
  run(request: ProcessIORequest): Promise<ProcessIOResult>;
  openSerialCapture(request: SerialCaptureRequest): Promise<SerialCapture>;
}

// ---------------------------------------------------------------------------
// Host authority (capability) — independent verification, per action binding
// ---------------------------------------------------------------------------

export const PRIVILEGED_ACTIONS = [
  "runtime_preflight",
  "guest_stage",
  "guest_execute_run",
  "guest_stop",
  "collector_attach",
  "collector_drain",
] as const;
export type PrivilegedAction = (typeof PRIVILEGED_ACTIONS)[number];

/** Exact scope a capability must be bound to. */
export interface CapabilityTarget {
  readonly run_id: Id;
  readonly manifest_sha256: string;
  readonly attempt_index: Nat;
  readonly case_id: Id;
  readonly arm_id: Id;
  readonly action: PrivilegedAction;
}

export type CapabilityExpectation = CapabilityTarget;

/**
 * Host capability presented by trusted host integration.
 *
 * `signature` is an Ed25519 signature over the canonical payload by a custodian
 * key this module never possesses. The verifier holds public keys only, so a
 * JSON/env value cannot self-authorize.
 */
export interface HostCapabilityToken extends CapabilityTarget {
  readonly custodian: string;
  readonly issued_at: string;
  readonly expires_at: string;
  readonly topology: RuntimeTopology;
  /** lowercase hex Ed25519 signature over {@link capabilityPayload}. */
  readonly signature: string;
}

export interface VerifyDecision {
  readonly valid: boolean;
  readonly reason?: string;
}

export interface HostCapabilityVerifier {
  verify(token: unknown, expected: CapabilityExpectation, nowMs: number): VerifyDecision;
}

// ---------------------------------------------------------------------------
// Host prerequisites (independently supplied, never manifest strings)
// ---------------------------------------------------------------------------

export interface TrustedClock {
  /** Monotonic non-decreasing wall clock in epoch milliseconds. */
  nowMs(): number;
}

/**
 * Receipt for the approved clean guest image, produced by host provisioning.
 * `lima_image_digest` uses Lima's own image-digest syntax (algorithm-prefixed).
 */
export interface HostImageReceipt {
  readonly location: string;
  readonly lima_image_digest: string;
  readonly manifest_image_digest: string;
  readonly arch: "aarch64";
  readonly os: "Linux";
  readonly verified_at: string;
  readonly verified_by: string;
}

/** Accepted prepared-image facts, produced by provisioning outside this task. */
export interface PreparedImageFile {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
}

/**
 * Offline Docker inputs the guest may execute. Digests are the accepted image
 * identities; a tag or a bare claim is never sufficient.
 */
export interface PreparedDockerInputs {
  readonly docker_engine_sha256: string;
  readonly node_image_sha256: string;
  readonly offline_bundle_sha256: string;
}

export interface PreparedImages {
  readonly schema_version: 1;
  readonly topology: RuntimeTopology;
  readonly kernel: PreparedImageFile;
  readonly initrd: PreparedImageFile;
  readonly rootfs: PreparedImageFile;
  readonly guest_programs: {
    readonly controller: PreparedImageFile;
    readonly collector: PreparedImageFile;
  };
  /** Emitted D3 driver tree packaged into the approved image. */
  readonly driver_tree: PreparedImageFile;
  readonly docker: PreparedDockerInputs;
  readonly runtime: {
    readonly node_version: string;
    readonly docker_version: string;
  };
  readonly arch?: "aarch64";
  readonly build_spec_sha256?: string;
  readonly verified_at: string;
  readonly verified_by: string;
}

/** Independently signed approval of the exact prepared images for one run. */
export interface PreparedImagesApprovalTarget {
  readonly run_id: Id;
  readonly manifest_sha256: string;
  readonly images: PreparedImages;
}

export interface PreparedImagesApprovalVerifier {
  verify(token: unknown, expected: PreparedImagesApprovalTarget, nowMs: number): VerifyDecision;
}

/** Persisted ownership of host resources so a restart cannot forget them. */
export interface HostStateStore {
  read(): Promise<readonly PersistedResource[]>;
  write(resources: readonly PersistedResource[]): Promise<void>;
}

export interface PersistedResource {
  readonly kind: "guest" | "collector";
  readonly name: string;
  readonly run_id: Id;
  readonly attempt_index: Nat;
  readonly created_at: string;
  readonly descriptor?: AttemptDescriptor;
  readonly pid?: number;
  readonly process_started_at?: string;
  readonly attempt_directory?: string;
  readonly status?: string;
}

// ---------------------------------------------------------------------------
// Guest lifecycle
// ---------------------------------------------------------------------------

export interface AttemptDescriptor {
  readonly attempt_index: Nat;
  readonly case_id: Id;
  readonly arm_id: Id;
  readonly repetition: Nat;
}

export type GuestStatus =
  | "staged"
  | "building"
  | "built"
  | "running"
  | "paused"
  | "stopping"
  | "stopped"
  | "failed"
  | "compromised";

export interface GuestIdentity {
  readonly guest_id: string;
  readonly instance_name: string;
  readonly descriptor: AttemptDescriptor;
  readonly created_at: string;
}

/**
 * Post-exposure host/guest interface.
 *
 * The SRS requires that no network, SSH or shared-filesystem connection exists
 * once untrusted bytes run. The adapter therefore supports exactly one value:
 * the controller is launched before exposure, detached inside the guest, and the
 * host keeps no channel for the rest of the attempt. Results are recovered only
 * by stopping the whole guest and collecting its disk offline.
 */
export type PostExposureInterface = "none";

export interface GuestRecord extends GuestIdentity {
  readonly status: GuestStatus;
  readonly trust_revoked: boolean;
  /** Set when the detached controller was launched (pre-exposure boundary). */
  readonly channel_opened_at: string | null;
  /** Host retains no guest channel after this point. */
  readonly post_exposure_interface: PostExposureInterface;
  readonly attempt_directory: string;
  /** Absolute host-clock workflow deadline fixed at staging. */
  readonly deadline_at_ms?: number;
  /** Runner process id recorded immediately after launch. */
  readonly runner_pid?: number;
  /** Runner process start identity, so a reused pid never proves ownership. */
  readonly runner_started_at?: string;
  readonly retained_disk_path: string | null;
  readonly observed_write_bytes: number;
  readonly last_error?: string;
  /** Classification of the last host-owned teardown attempt. */
  readonly teardown?: string;
}

/** Host observation recorded independently of candidate output. */
export interface HostObservation {
  readonly at_ms: number;
  readonly kind: "lifecycle" | "command" | "channel";
  readonly subject: string;
  readonly detail: Readonly<Record<string, string | number | boolean>>;
}

/** Classified outcome of a host-owned runner teardown. */
export type TeardownClass =
  | "confirmed_teardown"
  | "already_gone"
  | "identity_reused"
  | "permission_denied"
  | "unknown";

export interface TeardownRecord {
  readonly classification: TeardownClass;
  /** Real exit information only; never synthesised when the runner already exited. */
  readonly exit_code: number | null;
  readonly signal: string | null;
}

export interface CleanupReceipt {
  readonly stopped: boolean;
  readonly retained_disk_path: string | null;
  readonly detail: string;
  readonly teardown?: TeardownRecord;
}

/** Durable session counters, persisted before any resource action. */
export interface SessionCounters {
  readonly attempts_started: number;
  readonly stage_ms: number;
  readonly build_ms: number;
  readonly run_ms: number;
  readonly observed_write_bytes: number;
}

export interface LeaseRecord {
  readonly run_id: string;
  readonly attempt_index: number;
  readonly case_id: string;
  readonly arm_id: string;
  readonly repetition: number;
  readonly acquired_at_ms: number;
  readonly owner_pid: number;
}

export interface DeletionApprovalTarget {
  readonly run_id: string;
  readonly manifest_sha256: string;
  readonly attempt_index: number;
  readonly collection_id: string;
  readonly retained_disk_sha256: string;
}

/** Independent host verifier for separately scoped retention-deletion approval. */
export interface DeletionApprovalVerifier {
  verify(token: unknown, expected: DeletionApprovalTarget, nowMs: number): VerifyDecision;
}

/** Positive proof that an evidence copy was read back before deletion. */
export interface VerifiedExport {
  readonly collection_id: string;
  readonly run_id: string;
  readonly attempt_index: number;
  readonly readonly_copy_path: string;
  readonly readonly_copy_sha256: string;
  readonly verified_at_ms: number;
}

export interface AttemptOutcome {
  readonly state: TerminalState;
  readonly reason: string;
  readonly observations: readonly HostObservation[];
  readonly cleanup: CleanupReceipt;
}

// ---------------------------------------------------------------------------
// Collector
// ---------------------------------------------------------------------------

export interface CollectedArtifact {
  readonly name: string;
  readonly sha256: string;
  readonly byte_length: number;
  readonly frames: number;
}

/** Retained, hash-verified artifact body with a stable on-disk path. */
export interface CollectedArtifactBody {
  readonly name: string;
  readonly sha256: string;
  readonly byte_length: number;
  readonly retained_path: string;
  /** Exact retained bytes; console output is not required to be valid UTF-8. */
  readonly bytes: Buffer;
}

export interface CollectorReceipt {
  readonly schema_version: 1;
  readonly collection_id: string;
  readonly run_id: string;
  readonly attempt_index: number;
  readonly original_disk_path: string;
  readonly readonly_copy_path: string;
  readonly readonly_copy_sha256: string;
  readonly readonly_copy_bytes: number;
  readonly collector_instance: string;
  readonly collected_at: string;
  readonly artifacts: readonly CollectedArtifact[];
  readonly total_frames: number;
  readonly total_bytes: number;
  readonly coverage: {
    readonly required_artifacts_present: boolean;
    /** Full stream observed to termination, not an early `done` frame. */
    readonly stream_terminated: boolean;
    readonly duplicate_frames: number;
    readonly discarded_frames: number;
    readonly out_of_order_frames: number;
  };
  readonly log_sha256: string;
}

export type CollectorOutcome =
  | {
      readonly available: true;
      readonly receipt: CollectorReceipt;
      readonly bodies: readonly CollectedArtifactBody[];
    }
  | {
      readonly available: false;
      readonly reason:
        | "guest_not_stopped"
        | "host_copy_failed"
        | "attachment_unavailable"
        | "collector_launch_failed"
        | "collector_stream_failed"
        | "incomplete_artifacts"
        | "suspected_compromise"
        | "aggregate_overflow";
      readonly detail: string;
      readonly suspected_compromise: boolean;
    };

export const PRIVILEGED_ACTION_SET: ReadonlySet<string> = new Set(PRIVILEGED_ACTIONS);
export type { Positive };
