/**
 * scripts/evals/l3/runtime/guest/runtime.ts
 *
 * GuestRuntime: the privileged operations the in-guest controller performs.
 *
 * The port exists so the controller's dispatch, effect-validation and deadline
 * logic can be tested without Docker. `DockerGuestRuntime` is the real
 * implementation: fixed argv, no shell, bounded output, container resource
 * flags from the frozen manifest, candidate/stub exchanges over bounded
 * channels, and observations taken from the container's own identity.
 *
 * Candidate-visible mounts are exactly: the per-attempt state volume at
 * `/workspace/attempt`, the read-only materialized input directory at
 * `/workspace/input`, and one private per-candidate directory at `/run/l3` that
 * contains only the auxiliary socket. Trusted stub sockets live in
 * `/state/stubs`, which is never mounted into the candidate.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { execFile } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { appendFile, chmod, chown, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { PassThrough } from "node:stream";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { BoundedJsonlChannel, type RawChannelOutput } from "./channel.js";
import { readRegularFileBeneath } from "./safe-fs.js";
import {
  BUILD_TOOLS_GUEST_PATH,
  PACKAGED_GUEST_ROOT,
  SUPERVISOR_CMDLINE,
  partitionScratch,
  CONTROL_GUEST_PATH,
  DEPS_GUEST_PATH,
  OUTPUT_GUEST_PATH,
  SOURCE_GUEST_PATH,
  SUPERVISOR_GUEST_PATH,
  WORK_GUEST_PATH,
  assertBuildContainerConfig,
  assertCgroupLimits,
  cgroupExpectations,
  verifyCompiledOutput,
  type BuildEnforcement,
} from "./build-policy.js";
const execFileAsync = promisify(execFile);

export interface CommandResult {
  readonly code: number | null;
  readonly timedOut: boolean;
  readonly stdout: string;
  readonly stderr: string;
  readonly stdoutBytes: number;
  readonly stderrBytes: number;
  readonly truncated: boolean;
  readonly durationMs: number;
  readonly stdoutRaw?: Buffer;
  readonly stderrRaw?: Buffer;
}

export interface StreamResult {
  readonly code: number | null;
  readonly observedBytes: number;
  readonly timedOut: boolean;
  readonly truncated: boolean;
  readonly durationMs: number;
  /** Combined raw bytes in observed order; stderr is encoded by streamMask. */
  readonly raw: Buffer;
  /** Bit i is set when raw byte i came from stderr; stdout is an unset bit. */
  readonly streamMask?: Buffer;
  readonly stdoutBytes?: number;
  readonly stderrBytes?: number;
  /** Separately preserved binary stdout prefix inside the combined ceiling. */
  readonly stdoutRaw?: Buffer;
  /** Separately preserved binary stderr prefix inside the combined ceiling. */
  readonly stderrRaw?: Buffer;
}

export interface CommandPort {
  run(
    argv: readonly string[],
    options: { timeoutMs: number; maxStdoutBytes: number; maxStderrBytes: number },
  ): Promise<CommandResult>;
  /**
   * Runs a command and streams its combined output under one byte bound, killing
   * it on overrun. This is what captures the build log *while* it is produced, so
   * no unbounded daemon-side log buffer stands between the compiler and the cap.
   */
  stream(
    argv: readonly string[],
    options: { timeoutMs: number; maxBytes: number },
  ): Promise<StreamResult>;
}

export type BuildFailureClass =
  | "normal"
  | "timeout"
  | "overflow"
  | "persistence"
  | "policy"
  | "infrastructure";

export interface BuildEffect {
  readonly image_id: string;
  readonly exit_code: number;
  readonly duration_ms: number;
  readonly stdout_bytes: number;
  readonly stderr_bytes: number;
  readonly timed_out: boolean;
  readonly output_truncated: boolean;
  /**
   * Explicit stage outcome. `normal` covers a compiler that ran and returned
   * its own status (including nonzero); the remaining classes distinguish
   * capture, persistence, policy and infrastructure failures from it.
   */
  readonly failure_class: BuildFailureClass;
  /** Bit i maps raw build byte i to stderr; stdout is an unset bit. */
  readonly stream_mask_base64: string;
  readonly stream_capture_bytes: number;
  readonly output_container_id: string;
  readonly output_container_pid: number;
  /** Digest of the actual compiled entrypoint packaged into the image. */
  readonly entrypoint_sha256: string;
  readonly artifact_count: number;
  /** Containers that could not be removed; zero means cleanup was confirmed. */
  readonly cleanup_failures: number;
}

export interface RunEffect {
  readonly container_id: string;
  readonly pid: number;
}

export interface ProcessObservation {
  readonly pid: number;
  readonly rss_bytes: number;
  readonly threads: number;
  readonly state: string;
  /** Cgroup v2 `memory.current` when readable; null when the host cannot observe it. */
  readonly memory_current_bytes: number | null;
  /** Cgroup v2 `memory.peak` when readable; null when unobservable. */
  readonly memory_peak_bytes: number | null;
}

export interface TerminationStatus {
  readonly container_state: string;
  readonly exit_code: number | null;
  readonly finished_at: string | null;
  readonly pid: number;
}

export interface StatusEffect extends TerminationStatus {
  readonly restart_count: number;
  readonly observed_write_bytes: number;
  readonly buffered_bytes: number;
}

export interface StopEffect {
  readonly terminated: boolean;
  readonly exit_code: number;
}

export interface GuestLimits {
  readonly build: {
    readonly cpu: number;
    readonly memory_mib: number;
    readonly max_processes: number;
    readonly workspace_disk_mib: number;
    readonly wall_time_seconds: number;
    readonly max_output_bytes: number;
    readonly builder_image_digest?: string;
  };
  readonly run: {
    readonly cpu: number;
    readonly memory_mib: number;
    readonly max_processes: number;
    readonly attempt_state_disk_mib: number;
    readonly wall_time_seconds: number;
    readonly max_output_bytes: number;
    readonly max_frame_bytes: number;
  };
}

export interface GuestRuntime {
  readonly clock: { nowMs(): number };
  /** Fresh identity for every candidate process, including named restarts. */
  processSessionId(): string;
  /** Materializes the per-attempt state volume and private auxiliary directory. */
  prepareStateVolume(stateVolume: string): Promise<{ volume_dir: string; aux_dir: string; aux_socket_path: string }>;
  build(context: BuildContext): Promise<BuildEffect>;
  run(entrypoint: string, stateVolume: string, imageId: string): Promise<RunEffect>;
  /** Writes one complete frame into the candidate boundary under an optional deadline. */
  writeCandidate(frame: string, deadlineAtMs?: number): Promise<{ observed_bytes: number }>;
  /** Reads the next candidate frame under an absolute deadline. */
  readCandidate(deadlineAtMs: number): Promise<{
    response_frame: string;
    observed_bytes: number;
    deadline_exceeded: boolean;
    raw_output?: readonly CandidateRawOutput[];
    raw_output_truncated?: boolean;
  }>;
  /** Drains raw candidate bytes emitted after the last response frame. */
  drainCandidateOutput?(): readonly CandidateRawOutput[];
  candidateOutputTruncated?(): boolean;
  /** Copies the frozen stage files out of the paused candidate state volume. */
  snapshotState(
    snapshotId: string,
    stateVolume: string,
    files: readonly { readonly stage: string; readonly path: string }[],
  ): Promise<readonly { readonly stage: string; readonly path: string; readonly sha256: string; readonly bytes: number }[] | null>;
  observeProcess(): Promise<ProcessObservation>;
  termination(): Promise<TerminationStatus>;
  containerIdentity(): Promise<{ pid: number; cgroup: string } | null>;
  bufferedBytes(): number;
  resetState(stateVolume: string): Promise<void>;
  restartCandidate(reason: string): Promise<{ restart_count: number }>;
  pauseCandidate(deadlineAtMs?: number): Promise<void>;
  resumeCandidate(deadlineAtMs?: number): Promise<void>;
  stopCandidate(): Promise<StopEffect>;
  status(): Promise<StatusEffect>;
  shutdownGuest(): Promise<void>;
}

export interface BuildContext {
  readonly workspace_ref: string;
  readonly offline_bundle_ref: string;
  readonly build_spec_sha256: string;
}

export interface DockerGuestRuntimeOptions {
  readonly command: CommandPort;
  readonly clock: { nowMs(): number };
  readonly dockerBinary?: string;
  readonly stateDir?: string;
  readonly limits: GuestLimits;
  /** Test seam for the policy boundary; production uses the real assertions. */
  readonly buildPolicyChecks?: {
    verifyConfig(inspected: Record<string, unknown>, enforcement: BuildEnforcement): void;
    verifyCgroup(pid: number, enforcement: BuildEnforcement): Promise<void>;
  };
  /** Test seam for output persistence; production appends to `output.log`. */
  readonly appendOutputFile?: (file: string, data: Buffer) => Promise<void>;
  /** Test seam for volume preparation; production creates and chowns the volume. */
  readonly prepareVolume?: (
    stateVolume: string,
  ) => Promise<{ volume_dir: string; aux_dir: string; aux_socket_path: string }>;
}

export interface CandidateRawOutput extends RawChannelOutput {
  readonly process_session_id: string;
}

interface CandidateChannel {
  readonly channel: BoundedJsonlChannel;
  readonly child: ChildProcess;
  readonly session_id: string;
  readonly closed: Promise<void>;
}


interface RunSpec {
  readonly entrypoint: string;
  readonly stateVolume: string;
  readonly imageId: string;
}

const DOCKER_ID = /^[0-9a-f]{12,64}$/;
const IMAGE_DIGEST = /^sha256:[0-9a-f]{64}$/;
/** Pinned BuildKit builder provisioned with the approved image. */
const BUILDX_BUILDER = "l3-offline" as const;
const MAX_SNAPSHOT_FILE_BYTES = 1_048_576;
const MAX_SNAPSHOT_TOTAL_BYTES = 4 * 1024 * 1024;

/** Internal tagged failure so the build stage can report an explicit class. */
class BuildStageError extends Error {
  constructor(readonly failureClass: BuildFailureClass, message: string) {
    super(message);
    this.name = "BuildStageError";
  }
}

function reasonOfBuild(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class DockerGuestRuntime implements GuestRuntime {
  readonly clock: { nowMs(): number };
  private readonly options: DockerGuestRuntimeOptions;
  private readonly docker: string;
  private readonly stateDir: string;
  private candidate: CandidateChannel | null = null;
  private restartCount = 0;
  private stoppedCandidateChannel: CandidateChannel | null = null;
  private sessionSequence = 0;
  private containerId: string | null = null;
  private containerPid = 0;
  private pendingRawOutput: CandidateRawOutput[] = [];
  private pendingRawOutputTruncated = false;
  private currentSpec: RunSpec | null = null;
  /** One run-stage output ceiling shared by every process session. */
  private runOutputBytes = 0;
  private readonly runOutputCap: number;
  private candidateContainerName: string | null = null;

  constructor(options: DockerGuestRuntimeOptions) {
    this.options = options;
    this.clock = options.clock;
    this.docker = options.dockerBinary ?? "/usr/bin/docker";
    this.stateDir = options.stateDir ?? "/state";
    this.runOutputCap = options.limits.run.max_output_bytes;
  }

  processSessionId(): string {
    return `ps-${this.sessionSequence}`;
  }

  private async dockerRun(
    argv: readonly string[],
    timeoutMs: number,
    maxBytes: number,
  ): Promise<CommandResult> {
    return await this.options.command.run([this.docker, ...argv], {
      timeoutMs,
      maxStdoutBytes: maxBytes,
      maxStderrBytes: maxBytes,
    });
  }

  async prepareStateVolume(
    stateVolume: string,
  ): Promise<{ volume_dir: string; aux_dir: string; aux_socket_path: string }> {
    if (this.options.prepareVolume !== undefined) return await this.options.prepareVolume(stateVolume);
    const volumeDir = path.join(this.stateDir, "volumes", stateVolume);
    const auxDir = path.join(this.stateDir, "candidate", stateVolume);
    await mkdir(volumeDir, { recursive: true, mode: 0o700 });
    await mkdir(auxDir, { recursive: true, mode: 0o700 });
    // The candidate runs as UID/GID 1000 and owns exactly its state volume and
    // private runtime directory; trusted state/build/stub paths stay root-only.
    await chown(volumeDir, 1000, 1000);
    await chmod(volumeDir, 0o700);
    await chown(auxDir, 1000, 1000);
    await chmod(auxDir, 0o700);
    const marker = path.join(volumeDir, ".state-volume");
    await writeFile(marker, `${stateVolume}\n`, { mode: 0o600 });
    await chown(marker, 1000, 1000);
    return { volume_dir: volumeDir, aux_dir: auxDir, aux_socket_path: path.join(auxDir, "aux.sock") };
  }

  /**
   * Builds inside the supported nonprivileged offline Node builder container.
   *
   * The approved builder image digest is a required preflight fact (the guest's
   * immutable bootstrap supplies it); there is no default image and no tag
   * fallback. The container is created with the trusted supervisor as its
   * entrypoint and started *paused on the control token*: its configuration and
   * its kernel cgroup limits are verified from the running container, and only
   * then is the token written so the fixed compiler can run over the untrusted
   * source. Every writable path is a bounded tmpfs; every step shares one
   * absolute whole-stage deadline; the whole container is removed on any path.
   */
  async build(context: BuildContext): Promise<BuildEffect> {
    const limits = this.options.limits.build;
    const tag = `l3-build-${context.build_spec_sha256.slice(0, 16)}`;
    const startedAt = this.clock.nowMs();
    const deadlineAtMs = startedAt + limits.wall_time_seconds * 1000;
    const builderDigest = limits.builder_image_digest;
    if (typeof builderDigest !== "string" || !IMAGE_DIGEST.test(builderDigest)) {
      throw new Error(
        `approved builder image digest is required; the frozen bootstrap supplied ${JSON.stringify(String(builderDigest).slice(0, 96))}`,
      );
    }

    // Every writable path comes out of the single manifest workspace allowance.
    const scratch = partitionScratch(Math.min(512, limits.workspace_disk_mib));
    const buildRoot = path.join(this.stateDir, "build");
    const outputDir = path.join(buildRoot, "output");
    const controlDir = path.join(buildRoot, "control");
    const outputLog = path.join(this.stateDir, "output.log");
    const containerName = `l3-builder-${context.build_spec_sha256.slice(0, 12)}`;
    const pkgContainer = `l3-pkg-${context.build_spec_sha256.slice(0, 12)}`;
    await rm(outputDir, { recursive: true, force: true }).catch(() => undefined);
    await rm(controlDir, { recursive: true, force: true }).catch(() => undefined);
    await mkdir(outputDir, { recursive: true, mode: 0o700 });
    await mkdir(controlDir, { recursive: true, mode: 0o755 });
    await writeFile(outputLog, "", { mode: 0o600 });

    const enforcement: BuildEnforcement = {
      builder_digest: builderDigest,
      memory_bytes: limits.memory_mib * 1024 * 1024,
      cpu: limits.cpu,
      max_processes: limits.max_processes,
      scratch_mib: scratch.work_mib,
      output_mib: scratch.output_mib,
      tmp_mib: scratch.tmp_mib,
      source_dir: context.workspace_ref,
      deps_dir: context.offline_bundle_ref,
      control_dir: controlDir,
    };

    let outputLogBytes = 0;
    let outputLogTruncated = false;
    const appendOutput = async (body: string | Buffer): Promise<void> => {
      const bytes = typeof body === "string" ? Buffer.from(body, "utf8") : body;
      const room = limits.max_output_bytes - outputLogBytes;
      if (room <= 0) {
        if (bytes.length > 0) outputLogTruncated = true;
        return;
      }
      const slice = bytes.length <= room ? bytes : bytes.subarray(0, room);
      const write = this.options.appendOutputFile;
      if (write === undefined) await appendFile(outputLog, slice, { flag: "a", mode: 0o600 });
      else await write(outputLog, slice);
      outputLogBytes += slice.length;
      if (slice.length < bytes.length) outputLogTruncated = true;
    };

    let cleanupAttempted = false;
    let controlCleanupAttempted = false;
    let captureAttempted = false;
    let attachedStream: Promise<StreamResult> | null = null;
    let attachedOutput: StreamResult | null = null;
    let outputContainerId = "";
    let outputContainerPid = 0;
    const cleanupControlDirectory = async (): Promise<number> => {
      if (controlCleanupAttempted) return 0;
      controlCleanupAttempted = true;
      try {
        await rm(controlDir, { recursive: true, force: true });
        return 0;
      } catch {
        return 1;
      }
    };
    const finalize = async (
      effect: Omit<
        BuildEffect,
        "cleanup_failures" | "stream_mask_base64" | "stream_capture_bytes" | "output_container_id" | "output_container_pid"
      >,
    ): Promise<BuildEffect> => {
      cleanupAttempted = true;
      const cleanup_failures =
        (await this.removeContainers([containerName, pkgContainer])) + (await cleanupControlDirectory());
      return {
        ...effect,
        stream_mask_base64: attachedOutput?.streamMask?.toString("base64") ?? "",
        stream_capture_bytes: attachedOutput?.raw.length ?? 0,
        output_container_id: outputContainerId,
        output_container_pid: outputContainerPid,
        cleanup_failures,
      };
    };

    const failure = async (
      exitCode: number,
      failureClass: BuildFailureClass,
      result?: CommandResult,
    ): Promise<BuildEffect> => {
      if (result !== undefined) {
        try {
          await appendOutput(result.stdoutRaw ?? Buffer.from(result.stdout, "utf8"));
          await appendOutput(result.stderrRaw ?? Buffer.from(result.stderr, "utf8"));
        } catch {
          failureClass = "persistence";
        }
      }
      return await finalize({
        image_id: tag,
        exit_code: exitCode,
        duration_ms: this.clock.nowMs() - startedAt,
        stdout_bytes: result?.stdoutBytes ?? 0,
        stderr_bytes: result?.stderrBytes ?? 0,
        timed_out: result?.timedOut ?? false,
        output_truncated: (result?.truncated ?? false) || outputLogTruncated,
        failure_class: failureClass,
        entrypoint_sha256: "",
        artifact_count: 0,
      });
    };

    const captureAttachedOutput = async (): Promise<StreamResult | null> => {
      if (attachedStream === null || captureAttempted) return attachedOutput;
      captureAttempted = true;
      const result = await attachedStream;
      attachedOutput = result;
      try {
        await appendOutput(result.raw);
      } catch (error) {
        throw new BuildStageError("persistence", reasonOfBuild(error));
      }
      return result;
    };

    try {
      if ((await this.removeContainers([containerName, pkgContainer])) > 0) {
        throw new Error("pre-build container cleanup failed");
      }
      const create = await this.dockerStep(
        [
          "create",
          "--name",
          containerName,
          "--network=none",
          "--pull=never",
          "--log-driver=none",
          `--memory=${limits.memory_mib}m`,
          `--memory-swap=${limits.memory_mib}m`,
          `--cpus=${limits.cpu}`,
          `--pids-limit=${limits.max_processes}`,
          "--read-only",
          "--user=1000:1000",
          "--cap-drop=ALL",
          "--security-opt=no-new-privileges",
          `--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=${scratch.tmp_mib}m,uid=1000,gid=1000`,
          `--tmpfs=${WORK_GUEST_PATH}:rw,nosuid,nodev,size=${scratch.work_mib}m,uid=1000,gid=1000`,
          `--tmpfs=${OUTPUT_GUEST_PATH}:rw,nosuid,nodev,size=${scratch.output_mib}m,uid=1000,gid=1000`,
          "--mount",
          `type=bind,source=${BUILD_TOOLS_GUEST_PATH},target=${BUILD_TOOLS_GUEST_PATH},readonly=true`,
          "--mount",
          `type=bind,source=${context.workspace_ref},target=${SOURCE_GUEST_PATH},readonly=true`,
          "--mount",
          `type=bind,source=${context.offline_bundle_ref},target=${DEPS_GUEST_PATH},readonly=true`,
          "--mount",
          `type=bind,source=${controlDir},target=${CONTROL_GUEST_PATH},readonly=true`,
          "--entrypoint",
          "node",
          builderDigest,
          ...SUPERVISOR_CMDLINE,
        ],
        deadlineAtMs,
        65_536,
        "container creation",
      );
      if (create.code !== 0) return await failure(create.code ?? 1, "infrastructure", create);

      // Attach before inspecting/releasing the supervisor. Log-driver=none
      // avoids daemon-side copies; this channel is the bounded raw evidence.
      attachedStream = this.options.command.stream(
        [this.docker, "start", "--attach", "--interactive", containerName],
        {
          timeoutMs: Math.max(1, deadlineAtMs - this.clock.nowMs()),
          maxBytes: Math.max(0, limits.max_output_bytes - outputLogBytes),
        },
      );

      // The attached start is asynchronous: poll the container until the kernel
      // reports the supervisor running, exactly like `run()` does, so a Pid=0
      // snapshot cannot fail a healthy build. Every observation shares the one
      // absolute stage deadline.
      let inspected: Record<string, unknown> | null = null;
      let pid = 0;
      for (;;) {
        if (this.clock.nowMs() >= deadlineAtMs) {
          throw new BuildStageError("timeout", "builder container did not start before the stage deadline");
        }
        const inspect = await this.dockerStep(
          ["inspect", "--type", "container", "--format", "{{json .}}", containerName],
          deadlineAtMs,
          65_536,
          "container inspection",
        );
        if (inspect.code !== 0) {
          throw new BuildStageError(
            "infrastructure",
            `failed to inspect the builder container: ${inspect.stderr.slice(0, 200)}`,
          );
        }
        const parsed = JSON.parse(inspect.stdout) as Record<string, unknown>;
        const state = parsed["State"];
        const observedPid =
          typeof state === "object" && state !== null ? Number((state as Record<string, unknown>)["Pid"]) : 0;
        if (Number.isSafeInteger(observedPid) && observedPid > 0) {
          inspected = parsed;
          pid = observedPid;
          break;
        }
        await delay(50);
      }
      try {
        const policy = this.options.buildPolicyChecks;
        if (policy === undefined) assertBuildContainerConfig(inspected, enforcement);
        else policy.verifyConfig(inspected, enforcement);
      } catch (error) {
        throw new BuildStageError("policy", reasonOfBuild(error));
      }
      const inspectedId = inspected["Id"];
      if (typeof inspectedId !== "string" || !/^[0-9a-f]{64}$/.test(inspectedId)) {
        throw new BuildStageError("infrastructure", "builder container inspect has no canonical container identity");
      }
      outputContainerId = inspectedId;
      outputContainerPid = pid;
      const policy = this.options.buildPolicyChecks;
      try {
        if (policy === undefined) {
          const cgroupDir = await this.cgroupDirectoryOf(pid);
          await assertCgroupLimits(cgroupDir, cgroupExpectations(enforcement), async (file) =>
            await readFile(file, "utf8").catch(() => null),
          );
        } else {
          await policy.verifyCgroup(pid, enforcement);
        }
      } catch (error) {
        throw new BuildStageError("policy", reasonOfBuild(error));
      }

      // Configuration and kernel limits are verified: release the supervisor.
      await writeFile(path.join(controlDir, "go"), `${context.build_spec_sha256}\n`, { mode: 0o644 });

      // The attached Docker client captures raw stdout/stderr before any
      // decoding. Its own exit status is informational: `docker start -a`
      // forwards the container status, so a failed compile must never be
      // mistaken for a transport failure. Container status comes from `wait`.
      const streamed = await captureAttachedOutput();
      if (streamed === null) {
        throw new BuildStageError("infrastructure", "builder output attachment did not settle");
      }
      const stdoutBytes = streamed.stdoutBytes ?? streamed.stdoutRaw?.length ?? streamed.observedBytes;
      const stderrBytes = streamed.stderrBytes ?? streamed.stderrRaw?.length ?? 0;
      if (streamed.timedOut) {
        return await finalize({
          image_id: tag,
          exit_code: 124,
          duration_ms: this.clock.nowMs() - startedAt,
          stdout_bytes: stdoutBytes,
          stderr_bytes: stderrBytes,
          timed_out: true,
          output_truncated: outputLogTruncated,
          failure_class: "timeout",
          entrypoint_sha256: "",
          artifact_count: 0,
        });
      }
      if (streamed.truncated) {
        return await finalize({
          image_id: tag,
          exit_code: 137,
          duration_ms: this.clock.nowMs() - startedAt,
          stdout_bytes: stdoutBytes,
          stderr_bytes: stderrBytes,
          timed_out: false,
          output_truncated: true,
          failure_class: "overflow",
          entrypoint_sha256: "",
          artifact_count: 0,
        });
      }
      const waited = await this.dockerStep(["wait", containerName], deadlineAtMs, 4_096, "container wait");
      if (waited.code === null) {
        throw new BuildStageError("infrastructure", "docker wait client exited without a client status");
      }
      if (waited.code !== 0) return await failure(waited.code, "infrastructure", waited);
      const statusText = waited.stdout.trim();
      if (!/^(0|[1-9][0-9]*)$/.test(statusText)) {
        throw new BuildStageError(
          "infrastructure",
          `docker wait returned a non-canonical container exit status: ${JSON.stringify(statusText)}`,
        );
      }
      const exitCode = Number(statusText);
      if (!Number.isSafeInteger(exitCode)) {
        throw new BuildStageError("infrastructure", "docker wait container exit status is outside safe integer range");
      }
      if (exitCode !== 0) {
        return await finalize({
          image_id: tag,
          exit_code: exitCode,
          duration_ms: this.clock.nowMs() - startedAt,
          stdout_bytes: stdoutBytes,
          stderr_bytes: stderrBytes,
          timed_out: false,
          output_truncated: outputLogTruncated,
          failure_class: "normal",
          entrypoint_sha256: "",
          artifact_count: 0,
        });
      }
      const copyOut = await this.dockerStep(
        ["cp", `${containerName}:${OUTPUT_GUEST_PATH}/.`, outputDir],
        deadlineAtMs,
        4_096,
        "copying compiled output",
      );
      if (copyOut.code !== 0) {
        throw new BuildStageError("infrastructure", "failed to copy compiled output from the builder container");
      }
      const verified = await verifyCompiledOutput(outputDir, scratch.output_mib * 1024 * 1024).catch(
        (error: unknown) => {
          throw new BuildStageError("infrastructure", reasonOfBuild(error));
        },
      );
      if ((await this.removeContainers([containerName])) > 0) {
        throw new BuildStageError("infrastructure", "compiler container cleanup failed before packaging");
      }
      const createPkg = await this.dockerStep(
        [
          "create",
          "--name",
          pkgContainer,
          "--network=none",
          "--pull=never",
          "--read-only",
          "--user=1000:1000",
          "--cap-drop=ALL",
          "--security-opt=no-new-privileges",
          builderDigest,
        ],
        deadlineAtMs,
        4_096,
        "packaging container creation",
      );
      if (createPkg.code !== 0) {
        throw new BuildStageError("infrastructure", "failed to create the packaging container");
      }
      const cpOutput = await this.dockerStep(
        ["cp", `${outputDir}/.`, `${pkgContainer}:${PACKAGED_GUEST_ROOT}`],
        deadlineAtMs,
        4_096,
        "packaging the compiled output",
      );
      if (cpOutput.code !== 0) {
        throw new BuildStageError("infrastructure", "failed to copy compiled output into the packaging container");
      }
      const committed = await this.dockerStep(["commit", pkgContainer, tag], deadlineAtMs, 4_096, "image commit");
      if (committed.code !== 0) return await failure(committed.code ?? 1, "infrastructure", committed);
      const imageInspect = await this.dockerStep(
        ["image", "inspect", "--format", "{{.Id}}", tag],
        deadlineAtMs,
        4_096,
        "image identification",
      );
      const imageId = imageInspect.stdout.trim();
      if (!IMAGE_DIGEST.test(imageId)) {
        throw new BuildStageError(
          "infrastructure",
          `build produced an unidentifiable image: ${JSON.stringify(imageId.slice(0, 80))}`,
        );
      }
      return await finalize({
        image_id: imageId,
        exit_code: 0,
        duration_ms: this.clock.nowMs() - startedAt,
        stdout_bytes: stdoutBytes,
        stderr_bytes: stderrBytes,
        timed_out: false,
        output_truncated: outputLogTruncated,
        failure_class: "normal",
        entrypoint_sha256: verified.entrypoint_sha256,
        artifact_count: verified.artifacts.length,
      });
    } catch (error) {
      // A tagged class is authoritative once set: persistence, policy and
      // infrastructure failures must not be relabelled as output overflow.
      const explicitClass = error instanceof BuildStageError ? error.failureClass : null;
      let explicit = explicitClass;
      let failureClass: BuildFailureClass = explicitClass ?? "infrastructure";
      let cleanupFailures = 0;
      if (!cleanupAttempted) {
        cleanupAttempted = true;
        cleanupFailures = await this.removeContainers([containerName, pkgContainer]);
      }
      cleanupFailures += await cleanupControlDirectory();
      let captureFailed = false;
      let captured: StreamResult | null = null;
      try {
        captured = await captureAttachedOutput();
      } catch (captureError) {
        captureFailed = true;
        if (captureError instanceof BuildStageError) {
          explicit = captureError.failureClass;
          failureClass = explicit;
        }
      }
      const timedOut =
        failureClass === "timeout" ||
        captured?.timedOut === true ||
        (explicit === null && this.clock.nowMs() >= deadlineAtMs);
      const inferredOverflow =
        explicit === null && !timedOut && (captured?.truncated === true || outputLogTruncated || captureFailed);
      if (timedOut) failureClass = "timeout";
      else if (inferredOverflow) failureClass = "overflow";
      const overflowed = failureClass === "overflow";
      return {
        image_id: tag,
        exit_code: timedOut ? 124 : overflowed ? 137 : 1,
        duration_ms: this.clock.nowMs() - startedAt,
        stdout_bytes: captured?.stdoutBytes ?? 0,
        stderr_bytes: captured?.stderrBytes ?? 0,
        stream_mask_base64: captured?.streamMask?.toString("base64") ?? "",
        stream_capture_bytes: captured?.raw.length ?? 0,
        output_container_id: outputContainerId,
        output_container_pid: outputContainerPid,
        timed_out: timedOut,
        output_truncated: overflowed || outputLogTruncated,
        failure_class: failureClass,
        entrypoint_sha256: "",
        artifact_count: 0,
        cleanup_failures: cleanupFailures,
      };
    } finally {
      if (!cleanupAttempted) {
        cleanupAttempted = true;
        const cleanupFailures =
          (await this.removeContainers([containerName, pkgContainer])) + (await cleanupControlDirectory());
        if (cleanupFailures > 0) {
          throw new Error(`build cleanup failed for ${cleanupFailures} resource(s)`);
        }
      }
      await captureAttachedOutput();
    }
  }

  /** One bounded docker invocation that shares the single whole-stage deadline. */
  private async dockerStep(
    argv: readonly string[],
    deadlineAtMs: number,
    maxBytes: number,
    what: string,
  ): Promise<CommandResult> {
    const remaining = deadlineAtMs - this.clock.nowMs();
    if (remaining <= 0) throw new BuildStageError("timeout", `build stage deadline exhausted before ${what}`);
    return await this.dockerRun(argv, remaining, maxBytes);
  }

  /** Bounded best-effort cleanup with one fixed ten-second wall-clock budget. */
  private async removeContainers(names: readonly string[]): Promise<number> {
    let failures = 0;
    const cleanupDeadline = this.clock.nowMs() + 10_000;
    for (let index = 0; index < names.length; index += 1) {
      const remainingMs = cleanupDeadline - this.clock.nowMs();
      if (remainingMs <= 0) {
        failures += names.length - index;
        break;
      }
      const removed = await this.dockerRun(["rm", "-f", names[index]], remainingMs, 1_024).catch(() => null);
      if (removed === null || removed.timedOut) {
        failures += 1;
        continue;
      }
      if (removed.code !== 0 && !/No such (?:container|object)/i.test(`${removed.stderr}\\n${removed.stdout}`)) {
        failures += 1;
      }
    }
    return failures;
  }

  /** Absolute cgroup v2 directory for a pid, as the kernel reports it. */
  private async cgroupDirectoryOf(pid: number): Promise<string> {
    const body = await readFile(`/proc/${pid}/cgroup`, "utf8");
    for (const line of body.split("\n")) {
      if (!line.startsWith("0::")) continue;
      const relative = line.slice(3).trim();
      if (relative.length > 1) return path.join("/sys/fs/cgroup", relative);
    }
    throw new Error("builder container has no cgroup v2 membership to verify");
  }

  /** Reads the live container identity and pid from Docker after a start/restart. */
  private async refreshContainerIdentity(): Promise<{ container_id: string; pid: number } | null> {
    if (this.containerId === null) return null;
    const inspect = await this.dockerRun(
      ["inspect", "--type", "container", "--format", "{{.Id}} {{.State.Pid}}", this.containerId],
      15_000,
      4_096,
    );
    if (inspect.code !== 0) return null;
    const [id, pidText] = inspect.stdout.trim().split(/\s+/);
    const pid = Number(pidText);
    if (!DOCKER_ID.test(id ?? "") || !Number.isSafeInteger(pid) || pid <= 0) return null;
    return { container_id: id ?? "", pid };
  }

  private hasCandidate(): boolean {
    return this.candidate !== null;
  }

  async run(entrypoint: string, stateVolume: string, imageId: string): Promise<RunEffect> {
    if (this.hasCandidate()) throw new Error("a candidate is already running");
    if (!IMAGE_DIGEST.test(imageId)) {
      throw new Error(`imageId must be a verified sha256 digest reference, got ${String(imageId)}`);
    }
    const limits = this.options.limits.run;
    const volume = await this.prepareStateVolume(stateVolume);
    const name = `l3-run-${Date.now().toString(36)}`;
    const argv = [
      this.docker,
      "run",
      "-i",
      "--name",
      name,
      "--log-driver=none",
      "--network=none",
      "--read-only",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--user",
      "1000:1000",
      `--cpus=${limits.cpu}`,
      `--memory=${limits.memory_mib}m`,
      `--memory-swap=${limits.memory_mib}m`,
      `--pids-limit=${limits.max_processes}`,
      "--tmpfs",
      "/tmp:rw,nosuid,nodev,size=64m",
      "--mount",
      `type=bind,source=${volume.volume_dir},target=/workspace/attempt,readonly=false`,
      "--mount",
      `type=bind,source=${path.join(this.stateDir, "input")},target=/workspace/input,readonly=true`,
      "--mount",
      `type=bind,source=${volume.aux_dir},target=/run/l3,readonly=false`,
      "--workdir",
      "/workspace",
      "--entrypoint",
      "node",
      imageId,
      entrypoint,
    ];
    const child = spawn(argv[0], argv.slice(1), {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      detached: true,
    });
    this.candidateContainerName = name;
    this.attachChannel(child, limits.max_frame_bytes, `ps-${this.sessionSequence + 1}`);

    let containerId: string | null = null;
    let pid = 0;
    const pollDeadline = this.clock.nowMs() + 10_000;
    while (this.clock.nowMs() < pollDeadline) {
      const inspect = await this.dockerRun(
        ["inspect", "--format", "{{.Id}} {{.State.Pid}}", name],
        15_000,
        4096,
      );
      if (inspect.code === 0) {
        const [cId, pidText] = inspect.stdout.trim().split(/\s+/);
        const observedPid = Number(pidText);
        if (DOCKER_ID.test(cId ?? "") && Number.isSafeInteger(observedPid) && observedPid > 0) {
          containerId = cId;
          pid = observedPid;
          break;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (containerId === null || pid <= 0) {
      const failed = this.candidate;
      if (failed !== null) {
        // Preserve whatever the failed start already wrote before closing.
        this.pendingRawOutputTruncated ||= failed.channel.stats().truncated;
        this.pendingRawOutput.push(...this.exportRaw(failed.channel, failed.session_id));
        failed.channel.close();
      }
      this.candidate = null;
      await this.removeContainers([name]);
      throw new Error("candidate container did not start within deadline");
    }
    this.containerId = containerId;
    this.containerPid = pid;
    this.sessionSequence += 1;
    this.currentSpec = { entrypoint, stateVolume, imageId };
    return { container_id: containerId, pid };
  }

  private attachChannel(
    child: ChildProcess,
    maxFrameBytes: number,
    sessionId: string,
  ): void {
    const stdout = child.stdout;
    if (stdout === null) throw new Error("candidate exec has no stdout pipe");
    let resolveClosed!: () => void;
    const closed = new Promise<void>((resolve) => {
      resolveClosed = resolve;
    });
    child.once("close", resolveClosed);
    child.once("error", resolveClosed);
    // Charge the stopped session's unexported bytes first: the next session may
    // only use what the single run-stage ceiling leaves.
    const stopped = this.stoppedCandidateChannel;
    if (stopped !== null) {
      this.pendingRawOutputTruncated ||= stopped.channel.stats().truncated;
      this.pendingRawOutput.push(...this.exportRaw(stopped.channel, stopped.session_id));
      this.stoppedCandidateChannel = null;
    }
    const remaining = Math.max(0, this.runOutputCap - this.runOutputBytes);
    const containerName = this.candidateContainerName;
    const channel = new BoundedJsonlChannel(
      {
        stdin: child.stdin ?? new PassThrough(),
        stdout,
        ...(child.stderr === null ? {} : { stderr: child.stderr }),
        kill: () => child.kill("SIGKILL"),
      },
      {
        maxFrameBytes,
        maxTotalBytes: remaining,
        nowMs: () => this.clock.nowMs(),
        onOverflow: () => {
          // Overflow must stop the owned container, not only its CLI client.
          if (containerName !== null) {
            void this.dockerRun(["kill", containerName], 5_000, 4_096).catch(() => null);
          }
        },
      },
    );
    this.candidate = { channel, child, session_id: sessionId, closed };
  }

  /** Exports one channel's new raw bytes and charges them to the run budget. */
  private exportRaw(channel: BoundedJsonlChannel, sessionId: string): CandidateRawOutput[] {
    const chunks = channel.drainRawOutput().map((chunk) => ({
      ...chunk,
      process_session_id: sessionId,
    }));
    for (const chunk of chunks) this.runOutputBytes += chunk.bytes.length;
    return chunks;
  }

  private requireCandidate(): CandidateChannel {
    if (this.candidate === null) throw new Error("no candidate channel is open");
    return this.candidate;
  }

  async writeCandidate(frame: string, deadlineAtMs?: number): Promise<{ observed_bytes: number }> {
    const candidate = this.requireCandidate();
    await candidate.channel.write(frame, deadlineAtMs);
    return { observed_bytes: Buffer.byteLength(frame, "utf8") };
  }

  async readCandidate(
    deadlineAtMs: number,
  ): Promise<{
    response_frame: string;
    observed_bytes: number;
    deadline_exceeded: boolean;
    raw_output: readonly CandidateRawOutput[];
    raw_output_truncated: boolean;
  }> {
    const candidate = this.requireCandidate();
    const before = candidate.channel.stats();
    try {
      const response = await candidate.channel.read(deadlineAtMs);
      const after = candidate.channel.stats();
      return {
        response_frame: response,
        observed_bytes: after.observed_output_bytes - before.observed_output_bytes,
        deadline_exceeded: false,
        raw_output: this.exportRaw(candidate.channel, candidate.session_id),
        raw_output_truncated: after.truncated,
      };
    } catch (error) {
      const after = candidate.channel.stats();
      const deadline = /absolute deadline|deadline has already passed/i.test(
        error instanceof Error ? error.message : String(error),
      );
      return {
        response_frame: "",
        observed_bytes: after.observed_output_bytes - before.observed_output_bytes,
        deadline_exceeded: deadline,
        raw_output: this.exportRaw(candidate.channel, candidate.session_id),
        raw_output_truncated: after.truncated,
      };
    }
  }
  drainCandidateOutput(): readonly CandidateRawOutput[] {
    const output = this.pendingRawOutput.splice(0);
    const candidate = this.candidate ?? this.stoppedCandidateChannel;
    if (candidate !== null) {
      output.push(...this.exportRaw(candidate.channel, candidate.session_id));
    }
    this.pendingRawOutputTruncated = false;
    if (this.candidate === null) this.stoppedCandidateChannel = null;
    return output;
  }
  candidateOutputTruncated(): boolean {
    return this.pendingRawOutputTruncated ||
      ((this.candidate ?? this.stoppedCandidateChannel)?.channel.stats().truncated ?? false);
  }

  async snapshotState(
    snapshotId: string,
    stateVolume: string,
    files: readonly { readonly stage: string; readonly path: string }[],
  ): Promise<readonly { readonly stage: string; readonly path: string; readonly sha256: string; readonly bytes: number }[] | null> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(snapshotId)) throw new Error("invalid snapshot id");
    const volumeDir = path.join(this.stateDir, "volumes", stateVolume);
    const targetDir = path.join(this.stateDir, "snapshots", snapshotId);
    await rm(targetDir, { recursive: true, force: true });
    await mkdir(targetDir, { recursive: true, mode: 0o700 });
    const manifest: { stage: string; path: string; sha256: string; bytes: number }[] = [];
    let total = 0;
    for (const file of files) {
      const resolved = path.resolve(volumeDir, file.path);
      const relative = path.relative(volumeDir, resolved);
      if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
      let body: Buffer;
      try {
        body = await readRegularFileBeneath(
          path.join(this.stateDir, "volumes"),
          [stateVolume, ...file.path.split(path.sep)],
          MAX_SNAPSHOT_FILE_BYTES,
        );
      } catch {
        return null;
      }
      total += body.length;
      if (total > MAX_SNAPSHOT_TOTAL_BYTES) return null;
      const digest = createHash("sha256").update(body).digest("hex");
      await writeFile(path.join(targetDir, `${file.stage}.json`), body, { mode: 0o600 });
      manifest.push({ stage: file.stage, path: file.path, sha256: digest, bytes: body.length });
    }
    return Object.freeze(manifest);
  }

  private async rawCgroupOf(pid: number): Promise<string | null> {
    try {
      const cgroup = await readFile(`/proc/${pid}/cgroup`, "utf8");
      for (const line of cgroup.split("\n")) {
        if (line.startsWith("0::")) {
          const relative = line.slice(3).trim();
          if (relative.length > 1) return relative;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /** One representation everywhere: the raw cgroup v2 path from /proc. */
  async containerIdentity(): Promise<{ pid: number; cgroup: string } | null> {
    if (this.containerPid <= 0) return null;
    const cgroup = await this.rawCgroupOf(this.containerPid);
    if (cgroup === null) return null;
    return { pid: this.containerPid, cgroup };
  }

  private cgroupSysPath(raw: string): string {
    return path.join("/sys/fs/cgroup", raw);
  }

  private async cgroupMemory(cgroupPath: string, file: string): Promise<number | null> {
    try {
      const body = await readFile(path.join(cgroupPath, file), "utf8");
      const value = Number(body.trim());
      return Number.isSafeInteger(value) && value >= 0 ? value : null;
    } catch {
      return null;
    }
  }

  async observeProcess(): Promise<ProcessObservation> {
    if (this.containerPid <= 0) throw new Error("candidate container pid is unknown");
    const pid = this.containerPid;
    let status = "";
    try {
      status = await readFile(`/proc/${pid}/status`, "utf8");
    } catch {
      return {
        pid: 0,
        rss_bytes: 0,
        threads: 0,
        state: "Z",
        memory_current_bytes: null,
        memory_peak_bytes: null,
      };
    }
    const rss = /VmRSS:\s+(\d+)\s+kB/.exec(status);
    const threads = /Threads:\s+(\d+)/.exec(status);
    const state = /State:\s+(\S+)/.exec(status);
    if (rss === null || threads === null || state === null) {
      throw new Error("candidate /proc status is incomplete");
    }
    const raw = await this.rawCgroupOf(pid);
    const cgroupPath = raw === null ? null : this.cgroupSysPath(raw);
    return {
      pid,
      rss_bytes: Number(rss[1]) * 1024,
      threads: Number(threads[1]),
      state: state[1],
      memory_current_bytes: cgroupPath === null ? null : await this.cgroupMemory(cgroupPath, "memory.current"),
      memory_peak_bytes: cgroupPath === null ? null : await this.cgroupMemory(cgroupPath, "memory.peak"),
    };
  }

  async termination(): Promise<TerminationStatus> {
    if (this.containerId === null) {
      return { container_state: "absent", exit_code: null, finished_at: null, pid: 0 };
    }
    const inspect = await this.dockerRun(
      ["inspect", "--format", "{{.State.Status}}|{{.State.ExitCode}}|{{.State.FinishedAt}}|{{.State.Pid}}", this.containerId],
      15_000,
      4096,
    );
    if (inspect.code !== 0) {
      return { container_state: "unknown", exit_code: null, finished_at: null, pid: 0 };
    }
    const [state, exitText, finishedAt, pidText] = inspect.stdout.trim().split("|");
    const exitCode = Number(exitText);
    const pid = Number(pidText);
    const ended = state === "exited" || state === "dead";
    return {
      container_state: state ?? "unknown",
      exit_code: Number.isSafeInteger(exitCode) ? exitCode : null,
      finished_at: finishedAt && finishedAt !== "0001-01-01T00:00:00Z" ? finishedAt : null,
      pid: Number.isSafeInteger(pid) && pid > 0 ? pid : 0,
    };
  }

  bufferedBytes(): number {
    return this.candidate?.channel.bufferedBytes() ?? 0;
  }

  async resetState(stateVolume: string): Promise<void> {
    const spec = this.currentSpec;
    if (this.containerId !== null) {
      await this.stopCandidate();
    }
    this.currentSpec = null;
    const volumeDir = path.join(this.stateDir, "volumes", stateVolume);
    await rm(volumeDir, { recursive: true, force: true });
    await mkdir(volumeDir, { recursive: true, mode: 0o700 });
    await writeFile(path.join(volumeDir, ".state-volume"), `${stateVolume}\n`, { mode: 0o600 });
    if (spec !== null && spec.stateVolume === stateVolume) {
      // A fresh schedule needs a live candidate again: relaunch the same verified
      // image with a new process session and an empty state volume.
      await this.run(spec.entrypoint, stateVolume, spec.imageId);
    }
  }

  async restartCandidate(reason: string): Promise<{ restart_count: number }> {
    if (this.containerId === null) throw new Error("no candidate container to restart");
    if (reason.length === 0) throw new Error("restart reason must be non-empty");
    const previous = this.candidate;
    const containerId = this.containerId;
    // Stop first and finalize the old channel before the new process starts, so
    // no byte can be written into the restart gap by the old or new process.
    const stop = await this.dockerRun(["stop", "--time", "5", containerId], 30_000, 65536);
    if (stop.code !== 0) throw new Error(`candidate restart stop failed: ${stop.stderr.slice(0, 200)}`);
    if (previous !== null) {
      let closeTimer: NodeJS.Timeout | undefined;
      const streamClosed = await Promise.race([
        previous.closed.then(() => true),
        new Promise<boolean>((resolve) => {
          closeTimer = setTimeout(() => resolve(false), 5_000);
        }),
      ]);
      clearTimeout(closeTimer);
      if (!streamClosed) {
        this.candidate = null;
        this.pendingRawOutputTruncated = true;
        previous.channel.close();
        this.pendingRawOutput.push(...this.exportRaw(previous.channel, previous.session_id));
        throw new Error("candidate raw output stream did not close before restart");
      }
      this.candidate = null;
      this.pendingRawOutputTruncated ||= previous.channel.stats().truncated;
      this.pendingRawOutput.push(...this.exportRaw(previous.channel, previous.session_id));
    }
    this.restartCount += 1;
    // A restarted process owns no state from the previous one: new session id,
    // assigned before the new channel so every byte is attributed to it.
    this.sessionSequence += 1;
    const sessionId = `ps-${this.sessionSequence}`;
    const attachChild = spawn(this.docker, ["start", "--attach", "--interactive", containerId], {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      detached: true,
    });
    this.attachChannel(attachChild, this.options.limits.run.max_frame_bytes, sessionId);

    // The restarted container is a different process: refresh both the container
    // identity and the live pid from the runtime, never from the stale cached one.
    let refreshed: { container_id: string; pid: number } | null = null;
    const deadline = this.clock.nowMs() + 10_000;
    while (this.clock.nowMs() < deadline) {
      refreshed = await this.refreshContainerIdentity();
      if (refreshed !== null) break;
      await delay(50);
    }
    if (refreshed === null) throw new Error("restarted candidate container has no live pid");
    this.containerId = refreshed.container_id;
    this.containerPid = refreshed.pid;
    return { restart_count: this.restartCount };
  }

  async pauseCandidate(deadlineAtMs?: number): Promise<void> {
    if (this.containerId === null) throw new Error("no candidate container to pause");
    const remainingMs = deadlineAtMs === undefined ? 15_000 : deadlineAtMs - this.clock.nowMs();
    if (remainingMs <= 0) throw new Error("candidate pause exceeded the absolute exchange deadline");
    const result = await this.dockerRun(["pause", this.containerId], remainingMs, 65536);
    if (result.code !== 0) throw new Error(`candidate pause failed: ${result.stderr.slice(0, 200)}`);
  }

  async resumeCandidate(deadlineAtMs?: number): Promise<void> {
    if (this.containerId === null) throw new Error("no candidate container to resume");
    const remainingMs = deadlineAtMs === undefined ? 15_000 : deadlineAtMs - this.clock.nowMs();
    // An expired exchange still gets one finite cleanup attempt to unpause.
    const timeoutMs = Math.max(remainingMs, 2_000);
    const result = await this.dockerRun(["unpause", this.containerId], timeoutMs, 65536);
    if (result.code !== 0) throw new Error(`candidate resume failed: ${result.stderr.slice(0, 200)}`);
  }

  async stopCandidate(): Promise<StopEffect> {
    if (this.containerId === null) return { terminated: true, exit_code: 0 };
    const stopped = await this.dockerRun(["stop", "--time", "5", this.containerId], 30_000, 65536);
    if (stopped.code !== 0) return { terminated: false, exit_code: 0 };
    const status = await this.termination();
    if (status.container_state !== "exited" && status.container_state !== "dead") {
      return { terminated: false, exit_code: 0 };
    }
    if (status.exit_code === null) return { terminated: false, exit_code: 0 };
    const candidate = this.candidate;
    if (candidate !== null) {
      let closeTimer: NodeJS.Timeout | undefined;
      const streamClosed = await Promise.race([
        candidate.closed.then(() => true),
        new Promise<boolean>((resolve) => {
          closeTimer = setTimeout(() => resolve(false), 5_000);
        }),
      ]);
      clearTimeout(closeTimer);
      if (!streamClosed) throw new Error("candidate raw output stream did not close after container exit");
      candidate.channel.close();
    }
    this.stoppedCandidateChannel = candidate;
    this.candidate = null;
    return { terminated: true, exit_code: status.exit_code };
  }

  async status(): Promise<StatusEffect> {
    const termination = await this.termination();
    return {
      container_state: termination.container_state,
      exit_code: termination.exit_code,
      finished_at: termination.finished_at,
      pid: termination.pid,
      restart_count: this.restartCount,
      observed_write_bytes: await this.stateAllocatedBytes(),
      buffered_bytes: this.bufferedBytes(),
    };
  }

  /** Allocated blocks, not logical size: sparse/overlay writes are the real cost. */
  private async stateAllocatedBytes(): Promise<number> {
    const result = await this.options.command.run(["/usr/bin/stat", "--format=%b", this.stateDir], {
      timeoutMs: 30_000,
      maxStdoutBytes: 1024,
      maxStderrBytes: 1024,
    });
    if (result.code !== 0) {
      throw new Error(
        `state disk allocation measurement failed (stat exit=${result.code}); zero is forbidden on measurement failure`,
      );
    }
    const blocks = Number(result.stdout.trim());
    if (!Number.isSafeInteger(blocks) || blocks < 0) {
      throw new Error("state disk allocation was not a valid safe integer");
    }
    return blocks * 512;
  }

  async shutdownGuest(): Promise<void> {
    if (this.containerId !== null) {
      await this.dockerRun(["stop", "--time", "5", this.containerId], 30_000, 65536).catch(() => null);
    }
    try {
      await execFileAsync("/sbin/poweroff", [], { timeout: 5_000 });
    } catch {
      // The VM is being torn down regardless; host-side stop is authoritative.
    }
  }
}
