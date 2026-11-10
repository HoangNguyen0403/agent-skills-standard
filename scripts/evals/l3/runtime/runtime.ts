/**
 * scripts/evals/l3/runtime/runtime.ts
 *
 * Host orchestration for one attempt on the direct Apple VZ runner.
 *
 * There is no host/guest control channel at any point. The only host-visible
 * guest output is a one-way serial capture, and the only host authority over the
 * guest is process/hypervisor lifecycle. Evidence is recovered exclusively by
 * stopping the guest and collecting a read-only copy offline.
 */

import { createHash, randomBytes } from "node:crypto";
import { lstat, mkdir, readFile, truncate, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { deriveAttemptId, type AttemptInvocation, type AttemptPhase } from "./guest/invocation";
import { OfflineEvidenceCollector, verifyExport } from "./collector";
import { assertRequiredBundleEntries, buildBundleImage, readBundleImage, type BundleEntryInput } from "./bundle";
import {
  availableActions,
  buildRunConfig,
  parsePreparedImages,
  verifyPreparedImages,
  vzRunnerArgv,
  assertAbsolutePath,
  type VzRunConfig,
} from "./vz";
import { validateId, validateNat } from "../contracts";
import { forceStopOwnedRunner, type IdentityProbe } from "./process-identity";
import { buildFrozenSequence, DurableSessionLedger, frozenDescriptors, type SessionLimits } from "./session";
import {
  BUILD_WALL_MS,
  MAX_SESSION_ATTEMPTS,
  MAX_SESSION_DISK_BYTES,
  MAX_SESSION_DURATION_MS,
  RUNTIME_ADAPTER_VERSION,
  RUN_WALL_MS,
  SerialCleanEOF,
  SerialCaptureFailure,
  type AttemptDescriptor,
  type AttemptOutcome,
  type CapabilityExpectation,
  type CleanupReceipt,
  type CollectedArtifactBody,
  type CollectorOutcome,
  type CollectorReceipt,
  type DeletionApprovalVerifier,
  type GuestRecord,
  type HostCapabilityVerifier,
  type HostObservation,
  type PreparedImages,
  type PreparedImagesApprovalVerifier,
  type ProcessIO,
  type PrivilegedAction,
  type SerialCapture,
  type TrustedClock,
  type VerifiedExport,
} from "./types";

export class PreflightFailure extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(reason);
    this.name = "PreflightFailure";
    this.reason = reason;
  }
}

export class RuntimeTransitionError extends Error {
  readonly guest: GuestRecord;
  constructor(message: string, guest: GuestRecord) {
    super(message);
    this.name = "RuntimeTransitionError";
    this.guest = guest;
  }
}

export interface StagedArtifact {
  readonly name: string;
  readonly data: Buffer;
}

export function buildAttemptInvocation(
  manifest: import("../manifest").L3Manifest,
  manifestSha256: string,
  descriptor: AttemptDescriptor,
  phase: AttemptPhase,
): AttemptInvocation {
  if (phase !== "build" && phase !== "run") throw new Error(`invalid attempt phase: ${String(phase)}`);
  const frozen = buildFrozenSequence(manifest).find((entry) => entry.attempt_index === descriptor.attempt_index);
  if (
    frozen === undefined ||
    frozen.case_id !== descriptor.case_id ||
    frozen.arm_id !== descriptor.arm_id ||
    frozen.repetition !== descriptor.repetition
  ) {
    throw new Error("attempt descriptor is not the exact frozen sequence entry");
  }
  return {
    version: 1,
    protocol: "artifact-v1",
    run_id: validateId(manifest.run_id, "run_id"),
    manifest_sha256: manifestSha256,
    attempt_id: deriveAttemptId(manifestSha256, manifest.run_id, descriptor.attempt_index),
    attempt_index: validateNat(descriptor.attempt_index, "attempt_index"),
    case_id: descriptor.case_id as AttemptInvocation["case_id"],
    arm_id: descriptor.arm_id as AttemptInvocation["arm_id"],
    repetition: validateNat(descriptor.repetition, "repetition"),
    seed: validateNat(manifest.attempt_plan.seed, "attempt_plan.seed"),
    phase,
  };
}

export interface RuntimeLifecycleOptions {
  readonly manifest: import("../manifest").L3Manifest;
  readonly manifestSha256: string;
  readonly io: ProcessIO;
  readonly verifier: HostCapabilityVerifier;
  readonly clock: TrustedClock;
  readonly statePath: string;
  readonly workDir: string;
  readonly runnerPath: string;
  readonly images: PreparedImages;
  /** Independently signed approval of exactly these prepared images. */
  readonly imagesApprovalVerifier: PreparedImagesApprovalVerifier;
  readonly deletionVerifier?: DeletionApprovalVerifier;
  readonly limits?: Partial<SessionLimits>;
  /** Tests only: permit an unbounded host heap for small fixtures. */
  readonly allowUnboundedHeap?: boolean;
}

export interface PreflightReceipt {
  readonly images: PreparedImages;
  readonly adapter_version: string;
  readonly verified_at_ms: number;
}

const ATTEMPT_DEADLINE_MS = 120_000;
/** Bounded window for a classified force stop of a reconstructed runner. */
const RECOVERY_TEARDOWN_MS = 5_000;
const RECOVERY_POLL_MS = 50;

export class RuntimeLifecycleAdapter {
  private readonly options: RuntimeLifecycleOptions;
  private readonly ledger: DurableSessionLedger;
  private readonly guests = new Map<string, GuestRecord>();
  private readonly captures = new Map<string, SerialCapture>();
  private readonly observations: HostObservation[] = [];
  private readonly collector: OfflineEvidenceCollector;
  private preflightReceipt: PreflightReceipt | null = null;
  private ledgerOpen = false;

  constructor(options: RuntimeLifecycleOptions) {
    if (!/^[0-9a-f]{64}$/.test(options.manifestSha256)) {
      throw new Error("manifestSha256 must be 64 lowercase hex characters");
    }
    assertAbsolutePath("workDir", options.workDir);
    assertAbsolutePath("runnerPath", options.runnerPath);
    this.options = options;
    this.ledger = new DurableSessionLedger({
      manifest: options.manifest,
      manifestSha256: options.manifestSha256,
      clock: options.clock,
      statePath: options.statePath,
      limits: options.limits,
    });
    this.collector = new OfflineEvidenceCollector({
      io: options.io,
      verifier: options.verifier,
      clock: options.clock,
      runnerPath: options.runnerPath,
      images: options.images,
      exportRoot: path.join(options.workDir, "preserved-exports"),
      ...(options.allowUnboundedHeap === undefined ? {} : { allowUnboundedHeap: options.allowUnboundedHeap }),
    });
  }

  private expectation(descriptor: AttemptDescriptor, action: PrivilegedAction): CapabilityExpectation {
    return {
      run_id: this.options.manifest.run_id,
      manifest_sha256: this.options.manifestSha256,
      attempt_index: descriptor.attempt_index,
      case_id: descriptor.case_id,
      arm_id: descriptor.arm_id,
      action,
    };
  }

  private verifyCapability(token: unknown, descriptor: AttemptDescriptor, action: PrivilegedAction): void {
    const decision = this.options.verifier.verify(
      token,
      this.expectation(descriptor, action),
      this.options.clock.nowMs(),
    );
    if (!decision.valid) {
      throw new Error(`Privileged action '${action}' refused by host verifier: ${decision.reason ?? "denied"}`);
    }
  }

  private record(kind: HostObservation["kind"], subject: string, detail: HostObservation["detail"]): void {
    this.observations.push({ at_ms: this.options.clock.nowMs(), kind, subject, detail });
  }

  private assertPolicyBoundToAdapter(): void {
    const policy = this.options.manifest.runtime_policy;
    if (policy.runtime_adapter_version !== RUNTIME_ADAPTER_VERSION) {
      throw new PreflightFailure(
        `Manifest runtime_adapter_version ${policy.runtime_adapter_version} does not match adapter ${RUNTIME_ADAPTER_VERSION}`,
      );
    }
    if (policy.network_policy !== "none") throw new PreflightFailure("Manifest network_policy must be 'none'");
    const limits = policy.stage_limits;
    if (limits.build.wall_time_seconds * 1000 > BUILD_WALL_MS) {
      throw new PreflightFailure("Manifest build wall limit exceeds the 120 s build ceiling");
    }
    if (limits.run.wall_time_seconds * 1000 > RUN_WALL_MS) {
      throw new PreflightFailure("Manifest run wall limit exceeds the 90 s run ceiling");
    }
    if (limits.run.max_frame_bytes > 65_536) {
      throw new PreflightFailure("Manifest run max_frame_bytes exceeds the 65,536-byte protocol cap");
    }
  }

  private assertWithinPlanWindow(): void {
    const plan = this.options.manifest.attempt_plan;
    const now = this.options.clock.nowMs();
    const starts = Date.parse(plan.starts_at);
    const ends = Date.parse(plan.ends_at);
    if (!Number.isSafeInteger(starts) || !Number.isSafeInteger(ends)) {
      throw new PreflightFailure("Manifest attempt window is not parseable");
    }
    if (now < starts) throw new PreflightFailure("Attempt window has not opened yet");
    if (now >= ends) throw new PreflightFailure("Attempt window has closed");
  }

  private planWindowRemainingMs(): number {
    const ends = Date.parse(this.options.manifest.attempt_plan.ends_at);
    if (!Number.isSafeInteger(ends)) throw new PreflightFailure("Manifest attempt window is not parseable");
    return Math.max(0, ends - this.options.clock.nowMs());
  }

  async preflight(
    descriptor: AttemptDescriptor,
    token: unknown,
    approvalToken: unknown,
  ): Promise<PreflightReceipt> {
    this.verifyCapability(token, descriptor, "runtime_preflight");
    this.assertPolicyBoundToAdapter();
    this.assertWithinPlanWindow();
    const declaredImages = parsePreparedImages(this.options.images);
    const approval = this.options.imagesApprovalVerifier.verify(
      approvalToken,
      {
        run_id: this.options.manifest.run_id,
        manifest_sha256: this.options.manifestSha256,
        images: declaredImages,
      },
      this.options.clock.nowMs(),
    );
    if (!approval.valid) {
      throw new PreflightFailure(`prepared-images approval refused: ${approval.reason ?? "denied"}`);
    }
    const images = await verifyPreparedImages(this.options.io, declaredImages);
    const receipt: PreflightReceipt = Object.freeze({
      images,
      adapter_version: RUNTIME_ADAPTER_VERSION,
      verified_at_ms: this.options.clock.nowMs(),
    });
    this.preflightReceipt = receipt;
    this.record("lifecycle", "preflight", {
      topology: images.topology,
      node_version: images.runtime.node_version,
      docker_version: images.runtime.docker_version,
    });
    return receipt;
  }

  private requirePreflight(): PreflightReceipt {
    if (this.preflightReceipt === null) {
      throw new PreflightFailure("preflight has not completed; refusing to create host resources");
    }
    return this.preflightReceipt;
  }

  private async ensureLedgerOpen(): Promise<void> {
    if (this.ledgerOpen) return;
    await this.ledger.open();
    this.ledgerOpen = true;
  }

  async close(): Promise<void> {
    if (this.ledgerOpen) {
      await this.ledger.close();
      this.ledgerOpen = false;
    }
  }

  async stageAttempt(
    descriptor: AttemptDescriptor,
    token: unknown,
    artifacts: readonly StagedArtifact[],
    phase: AttemptPhase = "run",
  ): Promise<GuestRecord> {
    this.verifyCapability(token, descriptor, "guest_stage");
    const receipt = this.requirePreflight();
    this.assertWithinPlanWindow();
    if (artifacts.length === 0 || artifacts.length > 12) {
      throw new Error("stageAttempt requires between one and twelve frozen artifacts");
    }

    await this.ensureLedgerOpen();
    await this.ledger.reserveAttempt(descriptor);

    const startedAt = this.options.clock.nowMs();
    const guestId = `guest-${randomBytes(8).toString("hex")}`;
    const attemptDir = path.join(
      this.options.workDir,
      `attempt-${descriptor.attempt_index}-${randomBytes(4).toString("hex")}`,
    );
    const instanceName = `l3-${randomBytes(8).toString("hex")}`;

    await this.ledger.registerResource({
      kind: "guest",
      name: instanceName,
      run_id: this.options.manifest.run_id,
      attempt_index: descriptor.attempt_index,
      descriptor,
      created_at: new Date(this.options.clock.nowMs()).toISOString(),
    });

    const guest: GuestRecord = {
      guest_id: guestId,
      instance_name: instanceName,
      descriptor,
      created_at: new Date(this.options.clock.nowMs()).toISOString(),
      status: "staged",
      trust_revoked: false,
      channel_opened_at: null,
      post_exposure_interface: "none",
      attempt_directory: attemptDir,
      retained_disk_path: null,
      observed_write_bytes: 0,
    };
    this.guests.set(guestId, guest);

    try {
      await mkdir(attemptDir, { recursive: true, mode: 0o700 });

      if (artifacts.some((artifact) => artifact.name === "attempt.json")) {
        throw new Error("attempt.json is host-derived and cannot be supplied by the caller");
      }
      const manifestArtifact = artifacts.find((artifact) => artifact.name === "manifest.json");
      if (manifestArtifact === undefined) throw new Error("bundle must include the exact frozen manifest bytes");
      const observedManifestSha256 = createHash("sha256").update(manifestArtifact.data).digest("hex");
      if (observedManifestSha256 !== this.options.manifestSha256) {
        throw new Error("staged manifest bytes do not match the frozen manifest digest");
      }
      let stagedManifest: unknown;
      try {
        stagedManifest = JSON.parse(manifestArtifact.data.toString("utf8"));
      } catch {
        throw new Error("staged manifest is not valid JSON");
      }
      if (!isDeepStrictEqual(stagedManifest, this.options.manifest)) {
        throw new Error("staged manifest does not match the prevalidated frozen manifest");
      }
      const invocation = buildAttemptInvocation(
        this.options.manifest,
        this.options.manifestSha256,
        descriptor,
        phase,
      );
      const entries: BundleEntryInput[] = [
        { name: "attempt.json", data: Buffer.from(JSON.stringify(invocation), "utf8") },
        ...artifacts.map((artifact) => {
          if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,95}$/.test(artifact.name)) {
            throw new Error(`invalid artifact name: ${artifact.name}`);
          }
          return { name: artifact.name, data: artifact.data };
        }),
      ];
      const inputImage = buildBundleImage(entries);
      assertRequiredBundleEntries(readBundleImage(inputImage));
      const inputPath = path.join(attemptDir, "input.img");
      await writeFile(inputPath, inputImage, { mode: 0o600 });

      const rootPath = path.join(attemptDir, "root.img");
      const clone = await this.options.io.run({
        argv: ["/bin/cp", "-c", "-p", "--", receipt.images.rootfs.path, rootPath],
        timeoutMs: 900_000,
        maxStdoutBytes: 1024,
        maxStderrBytes: 16_384,
      });
      if (clone.exitCode !== 0) throw new Error(`root image clone failed: ${clone.stderr.slice(0, 300)}`);

      const statePath = path.join(attemptDir, "state.img");
      // The attempt state volume is capped by the frozen run policy, not by the
      // whole virtual disk size.
      const stateBytes = this.options.manifest.runtime_policy.stage_limits.run.attempt_state_disk_mib * 1024 * 1024;
      await writeFile(statePath, Buffer.alloc(0), { mode: 0o600 });
      await truncate(statePath, stateBytes);

      const attemptWallLimitMs = phase === "build" ? BUILD_WALL_MS : BUILD_WALL_MS + RUN_WALL_MS;
      const sessionRemainingMs = await this.ledger.remainingWindowMs();
      const planRemainingMs = this.planWindowRemainingMs();
      const grantExpiryMs = capabilityExpiryMs(token);
      const grantRemainingMs =
        grantExpiryMs === null ? Number.POSITIVE_INFINITY : Math.max(0, grantExpiryMs - this.options.clock.nowMs());
      const effectiveDeadlineMs = Math.min(
        attemptWallLimitMs,
        sessionRemainingMs,
        planRemainingMs,
        grantRemainingMs,
      );
      if (!Number.isSafeInteger(effectiveDeadlineMs) || effectiveDeadlineMs <= 0) {
        throw new Error("no remaining attempt window (session, plan or grant has expired)");
      }

      const config = buildRunConfig({
        mode: "start",
        deadline_ms: effectiveDeadlineMs,
        kernel: receipt.images.kernel.path,
        initrd: receipt.images.initrd.path,
        kernel_cmdline: "console=hvc0 root=/dev/vda rw init=/opt/l3/init-controller",
        disks: [
          { name: "root", path: rootPath, read_only: false },
          { name: "state", path: statePath, read_only: false },
          { name: "input", path: inputPath, read_only: true },
        ],
      });
      const configPath = path.join(attemptDir, "run.json");
      await writeFile(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
      const deadlineAtMs = this.options.clock.nowMs() + effectiveDeadlineMs;
      await writeFile(
        path.join(attemptDir, "deadline.json"),
        JSON.stringify({ deadline_at_ms: deadlineAtMs }),
        { mode: 0o600 },
      );

      const observed = await this.observeAttemptWrites([
        inputPath,
        rootPath,
        configPath,
        path.join(attemptDir, "deadline.json"),
        path.join(attemptDir, "state.img"),
      ]);
      await this.ledger.recordObservedWrites(observed);
      await this.ledger.recordPhase("stage", this.options.clock.nowMs() - startedAt);

      const updated = this.updateGuest(guestId, {
        observed_write_bytes: observed,
        deadline_at_ms: deadlineAtMs,
      });
      this.record("lifecycle", `staged:${instanceName}`, {
        disks: config.disks.length,
        read_only_disks: config.disks.filter((disk) => disk.read_only).length,
        observed_write_bytes: observed,
      });
      return updated;
    } catch (error) {
      const failed = this.updateGuest(guestId, {
        status: "failed",
        trust_revoked: true,
        last_error: reasonOf(error),
      });
      await this.ledger.releaseLease(descriptor);
      throw new RuntimeTransitionError(`Staging failed: ${reasonOf(error)}`, failed);
    }
  }

  /** Allocated bytes (512-byte blocks), never logical size: sparse images lie. */
  private async observeAttemptWrites(paths: readonly string[]): Promise<number> {
    let total = 0;
    for (const filePath of paths) {
      const measurement = await this.options.io.run({
        argv: ["/usr/bin/stat", "-f", "%b", filePath],
        timeoutMs: 30_000,
        maxStdoutBytes: 1024,
        maxStderrBytes: 1024,
      });
      const blocks = Number(measurement.stdout.trim());
      if (measurement.exitCode !== 0 || !Number.isSafeInteger(blocks) || blocks < 0) {
        throw new Error(`allocated-block measurement failed for ${filePath}; zero is forbidden`);
      }
      total += blocks * 512;
    }
    return total;
  }

  /**
   * Launches the frozen controller once. This is the pre-exposure boundary: the
   * only host-visible stream is one-way serial output.
   */
  async launchAttempt(guestId: string, token: unknown): Promise<GuestRecord> {
    const guest = this.requireGuest(guestId);
    this.verifyCapability(token, guest.descriptor, "guest_execute_run");
    this.assertWithinPlanWindow();
    this.assertPolicyBoundToAdapter();
    if (guest.status !== "staged") throw new Error(`Guest ${guestId} is not staged (${guest.status})`);
    const absoluteDeadline = await this.readDeadline(guest);
    await this.ledger.assertAttemptLive(guest.descriptor, absoluteDeadline);

    const configPath = path.join(guest.attempt_directory, "run.json");
    const staged = parseRunConfigSnapshot(await readFile(configPath, "utf8"));
    const launchExpiryMs = capabilityExpiryMs(token);
    const launchRemainingMs =
      launchExpiryMs === null ? Number.POSITIVE_INFINITY : Math.max(0, launchExpiryMs - this.options.clock.nowMs());
    const sessionRemainingMs = await this.ledger.remainingWindowMs();
    const planRemainingMs = this.planWindowRemainingMs();
    const remainingMs = Math.min(
      staged.deadline_ms,
      absoluteDeadline - this.options.clock.nowMs(),
      launchRemainingMs,
      sessionRemainingMs,
      planRemainingMs,
    );
    if (!Number.isSafeInteger(remainingMs) || remainingMs <= 0) {
      throw new Error("the persisted workflow deadline has already passed; refusing a delayed launch");
    }
    const config = { ...staged.raw, deadline_ms: remainingMs };
    await writeFile(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
    await this.ledger.updateResource(guest.instance_name, {
      status: "launching",
      attempt_directory: guest.attempt_directory,
    });
    const capture = await this.options.io.openSerialCapture({
      argv: vzRunnerArgv(this.options.runnerPath, "start", configPath),
      timeoutMs: remainingMs + 30_000,
      maxFrames: 4_096,
      maxFrameBytes: 65_536,
      maxTotalBytes: 4 * 1024 * 1024,
      maxStderrBytes: 65_536,
    });
    this.captures.set(guestId, capture);
    const runnerPid = capture.runnerPid();
    if (runnerPid === null) {
      await capture.kill();
      throw new Error("runner process id is unavailable; refusing an unowned privileged process");
    }
    const runnerStartedAt = await this.runnerStartIdentity(runnerPid);
    if (runnerStartedAt === null) {
      await capture.kill();
      throw new Error("runner start identity is unavailable; refusing an unowned privileged process");
    }
    await this.ledger.updateResource(guest.instance_name, {
      status: "running",
      pid: runnerPid,
      process_started_at: runnerStartedAt,
      attempt_directory: guest.attempt_directory,
    });
    const openedAt = new Date(this.options.clock.nowMs()).toISOString();
    const updated = this.updateGuest(guestId, {
      status: "running",
      trust_revoked: true,
      channel_opened_at: openedAt,
      runner_pid: runnerPid,
      runner_started_at: runnerStartedAt,
    });
    this.record("lifecycle", `launched:${guest.instance_name}`, { deadline_ms: remainingMs, runner_pid: runnerPid });
    return updated;
  }

  private async readDeadline(guest: GuestRecord): Promise<number> {
    let raw: string;
    try {
      raw = await readFile(path.join(guest.attempt_directory, "deadline.json"), "utf8");
    } catch {
      throw new Error("persisted workflow deadline is missing; refusing to launch");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("persisted workflow deadline is not JSON");
    }
    if (typeof parsed !== "object" || parsed === null || !("deadline_at_ms" in parsed)) {
      throw new Error("persisted workflow deadline is malformed");
    }
    const value = parsed.deadline_at_ms;
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
      throw new Error("persisted workflow deadline is not a positive safe integer");
    }
    return value;
  }

  private async runnerStartIdentity(pid: number): Promise<string | null> {
    const result = await this.options.io.run({
      argv: ["/bin/ps", "-p", String(pid), "-o", "lstart="],
      timeoutMs: 5_000,
      maxStdoutBytes: 4_096,
      maxStderrBytes: 4_096,
    });
    if (result.exitCode !== 0) return null;
    const identity = result.stdout.trim();
    return identity.length === 0 ? null : identity;
  }

  /**
   * Host-side completion wait. No guest message is required or trusted: the
   * deadline is absolute, output is drained under caps, and the runner process
   * is terminated by the host on overrun.
   */
  async awaitCompletion(
    guestId: string,
  ): Promise<{ exitCode: number | null; signal: NodeJS.Signals | null; frames: number; deadlineReached: boolean }> {
    const guest = this.requireGuest(guestId);
    const capture = this.requireCapture(guestId);
    const configPath = path.join(guest.attempt_directory, "run.json");
    const config = parseRunConfigSnapshot(await readFile(configPath, "utf8"));
    const launchedAtMs = Date.parse(guest.channel_opened_at ?? guest.created_at);
    const deadlineAtMs = Math.min(
      launchedAtMs + config.deadline_ms,
      guest.deadline_at_ms ?? Number.POSITIVE_INFINITY,
    );

    let frames = 0;
    let deadlineReached = false;
    const phaseArrivals = new Map<string, number>();
    for (;;) {
      let frame: string;
      try {
        frame = await capture.readFrame(deadlineAtMs);
      } catch (error) {
        deadlineReached = this.options.clock.nowMs() >= deadlineAtMs;
        if (error instanceof SerialCleanEOF) break;
        if (error instanceof SerialCaptureFailure && error.kind === "deadline") {
          deadlineReached = true;
          break;
        }
        throw error;
      }
      frames += 1;
      const phase = parsePhaseFrame(frame);
      if (phase !== null && !phaseArrivals.has(phase)) {
        phaseArrivals.set(phase, this.options.clock.nowMs());
      }
    }
    const exit = await capture.wait(this.options.clock.nowMs() + 10_000);

    const buildStart = phaseArrivals.get("build_started");
    const buildEnd = phaseArrivals.get("build_finished") ?? phaseArrivals.get("build_failed");
    if (buildStart !== undefined && buildEnd !== undefined) {
      await this.ledger.recordPhase("build", Math.max(0, buildEnd - buildStart));
    }
    const runStart = phaseArrivals.get("run_started");
    const runEnd = phaseArrivals.get("run_finished");
    if (runStart !== undefined && runEnd !== undefined) {
      await this.ledger.recordPhase("run", Math.max(0, runEnd - runStart));
    }

    this.record("lifecycle", `completion:${guest.instance_name}`, {
      exit_code: exit.exitCode ?? -1,
      frames,
      deadline_reached: deadlineReached,
      build_ms: buildStart !== undefined && buildEnd !== undefined ? buildEnd - buildStart : -1,
      run_ms: runStart !== undefined && runEnd !== undefined ? runEnd - runStart : -1,
    });
    return { exitCode: exit.exitCode, signal: exit.signal, frames, deadlineReached };
  }

  async stopGuest(guestId: string, token: unknown): Promise<CleanupReceipt> {
    const guest = this.requireGuest(guestId);
    this.verifyCapability(token, guest.descriptor, "guest_stop");
    this.updateGuest(guestId, { status: "stopping" });

    const capture = this.captures.get(guestId);
    let exit: { exitCode: number | null; signal: NodeJS.Signals | null } | null = null;

    if (capture !== undefined) {
      const livePid = capture.runnerPid();
      if (guest.runner_pid === undefined || livePid === null || livePid !== guest.runner_pid) {
        throw this.quarantine(guest, "runner identity changed since launch");
      }

      const exitStatus = typeof capture.isExited === "function" ? capture.isExited() : { exited: false, exitCode: null, signal: null };
      if (exitStatus.exited) {
        exit = { exitCode: exitStatus.exitCode, signal: exitStatus.signal };
      } else {
        if (guest.runner_started_at !== undefined) {
          const observed = await this.runnerStartIdentity(livePid);
          if (observed === null || observed !== guest.runner_started_at) {
            throw this.quarantine(guest, "runner start identity no longer matches the persisted owner");
          }
        }
        try {
          exit = await capture.wait(this.options.clock.nowMs() + 10_000);
        } catch (error) {
          throw this.quarantine(guest, `runner wait failed: ${reasonOf(error)}`);
        }
      }

      const stoppedEvent = capture.statusEvents().some((event) => event.event === "stopped");
      const cleanStop = exit.exitCode === 0 && exit.signal === null && stoppedEvent;
      if (!cleanStop) {
        await capture.kill();
        throw this.quarantine(
          guest,
          `runner did not report an orderly stop (exit=${String(exit?.exitCode)}, signal=${String(exit?.signal)}, stopped_event=${stoppedEvent})`,
        );
      }
      if (capture.stats().killed) {
        throw this.quarantine(guest, "serial capture was killed; VM teardown is not attributable");
      }
      this.captures.delete(guestId);
    } else {
      // Reconstructed guest without an active capture: a finite, classified,
      // identity-checked teardown. Every outcome is named; nothing is reported as
      // "gone" because a probe failed for an unrelated reason.
      const pid = guest.runner_pid;
      const startedAt = guest.runner_started_at;
      const classification =
        pid === undefined || startedAt === undefined
          ? ("unknown" as const)
          : await forceStopOwnedRunner(pid, startedAt, this.identityProbe());
      if (classification !== "confirmed_teardown" && classification !== "already_gone") {
        throw this.quarantine(
          guest,
          `reconstructed guest runner teardown is ${classification}; lease retained and disk preserved`,
        );
      }
      this.updateGuest(guestId, { teardown: classification });
      // No exit code is synthesised: the runner was killed or already gone, so the
      // real exit status is unknown and must stay unknown.
      exit = { exitCode: null, signal: null };
      this.record("lifecycle", `recovered-teardown:${guest.instance_name}`, {
        classification,
        exit_code: -1,
      });
    }

    const statePath = path.join(guest.attempt_directory, "state.img");
    const stateInfo = await lstat(statePath).catch(() => null);
    if (stateInfo === null || !stateInfo.isFile() || stateInfo.isSymbolicLink()) {
      throw this.quarantine(guest, "retained state disk is missing or invalid after host stop");
    }

    let diskBytes: number;
    try {
      diskBytes = await this.observeAttemptWrites([
        statePath,
        path.join(guest.attempt_directory, "root.img"),
        path.join(guest.attempt_directory, "input.img"),
      ]);
    } catch (error) {
      throw this.quarantine(guest, `post-stop allocated-byte measurement failed: ${reasonOf(error)}`);
    }
    await this.ledger.recordObservedWrites(diskBytes);
    await this.ledger.updateResource(guest.instance_name, { status: "stopped" });

    this.updateGuest(guestId, {
      status: "stopped",
      retained_disk_path: statePath,
      trust_revoked: true,
      observed_write_bytes: diskBytes,
    });
    await this.ledger.releaseLease(guest.descriptor);
    this.record("lifecycle", `stopped:${guest.instance_name}`, {
      retained_disk: statePath,
      observed_write_bytes: diskBytes,
    });
    return {
      stopped: true,
      retained_disk_path: statePath,
      detail: "runner exited 0 with its stopped status event; state disk retained",
    };
  }

  /** Probe used by the classified teardown; errors are named, never flattened. */
  private identityProbe(): IdentityProbe {
    return {
      signal: (pid, signal) => {
        try {
          process.kill(pid, signal);
          return { code: null };
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code ?? null;
          return { code };
        }
      },
      startIdentity: (pid) => this.runnerStartIdentity(pid),
      now: () => this.options.clock.nowMs(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      pollMs: RECOVERY_POLL_MS,
      budgetMs: RECOVERY_TEARDOWN_MS,
    };
  }

  /**
   * Uncertainty about VM teardown keeps the lease and forbids collection: the
   * durable counters are not refunded and the disk stays preserved untouchable.
   */
  private quarantine(guest: GuestRecord, detail: string): RuntimeTransitionError {
    this.captures.delete(guest.guest_id);
    const failed = this.updateGuest(guest.guest_id, {
      status: "failed",
      trust_revoked: true,
      last_error: detail,
    });
    this.record("lifecycle", `quarantined:${guest.instance_name}`, { detail });
    return new RuntimeTransitionError(`Host stop could not be proven; attempt quarantined: ${detail}`, failed);
  }

  async collect(
    guestId: string,
    tokens: { attach: unknown; drain: unknown } | unknown,
    collectionId: string,
  ): Promise<CollectorOutcome> {
    const guest = this.requireGuest(guestId);
    if (guest.status !== "stopped" || guest.retained_disk_path === null) {
      return {
        available: false,
        reason: "guest_not_stopped",
        detail: "collection requires a host-verified stopped guest with a retained disk",
        suspected_compromise: false,
      };
    }
    const attachToken = typeof tokens === "object" && tokens !== null && "attach" in tokens
      ? (tokens as { attach: unknown }).attach
      : tokens;
    const drainToken = typeof tokens === "object" && tokens !== null && "drain" in tokens
      ? (tokens as { drain: unknown }).drain
      : tokens;
    const outcome = await this.collector.collect({
      collection_id: collectionId,
      original_state_path: guest.retained_disk_path,
      attempt_directory: guest.attempt_directory,
      tokens: { attach: attachToken, drain: drainToken },
      expectation: this.expectation(guest.descriptor, "collector_attach"),
    });
    if (outcome.available) {
      const retainedBytes = outcome.bodies.reduce((total, body) => total + body.byte_length, 0);
      await this.ledger.recordObservedWrites(retainedBytes);
      this.record("lifecycle", `collected:${guest.instance_name}`, {
        artifacts: outcome.bodies.length,
        bytes: retainedBytes,
      });
    }
    return outcome;
  }

  async verifyExport(
    receipt: CollectorReceipt,
    bodies: readonly CollectedArtifactBody[],
  ): Promise<VerifiedExport> {
    return await verifyExport(receipt, bodies, this.options.clock.nowMs());
  }

  /** Removes approved scratch files only; the original retained disk is never deleted. */
  async disposeGuest(
    guestId: string,
    deletionToken: unknown,
    exportProof: VerifiedExport,
  ): Promise<void> {
    const guest = this.requireGuest(guestId);
    if (guest.status !== "stopped" || guest.retained_disk_path === null) {
      throw new Error("refusing deletion before host-confirmed stop and disk retention");
    }
    if (
      exportProof.run_id !== this.options.manifest.run_id ||
      exportProof.attempt_index !== guest.descriptor.attempt_index
    ) {
      throw new Error("verified export is not bound to this run and attempt");
    }
    const expectedCopy = path.join(
      this.options.workDir,
      "preserved-exports",
      exportProof.run_id,
      String(exportProof.attempt_index),
      exportProof.collection_id,
      "state.img",
    );
    if (path.resolve(exportProof.readonly_copy_path) !== path.resolve(expectedCopy)) {
      throw new Error("verified export path is not the preserved copy for this attempt");
    }
    const retainedDigest = await this.options.io.run({
      argv: ["/usr/bin/shasum", "-a", "256", guest.retained_disk_path],
      timeoutMs: 600_000,
      maxStdoutBytes: 1024,
      maxStderrBytes: 1024,
    });
    const observed = retainedDigest.stdout.trim().split(/\s+/)[0];
    if (retainedDigest.exitCode !== 0 || observed !== exportProof.readonly_copy_sha256) {
      throw new Error("retained disk no longer matches the verified export digest");
    }
    const copyDigest = await this.options.io.run({
      argv: ["/usr/bin/shasum", "-a", "256", expectedCopy],
      timeoutMs: 600_000,
      maxStdoutBytes: 1024,
      maxStderrBytes: 1024,
    });
    const observedCopy = copyDigest.stdout.trim().split(/\s+/)[0];
    if (copyDigest.exitCode !== 0 || observedCopy !== exportProof.readonly_copy_sha256) {
      throw new Error("preserved copy no longer matches the verified export digest at deletion time");
    }
    const deletionVerifier = this.options.deletionVerifier;
    if (deletionVerifier === undefined) throw new Error("separately scoped deletion approval verifier is unavailable");
    const decision = deletionVerifier.verify(
      deletionToken,
      {
        run_id: this.options.manifest.run_id,
        manifest_sha256: this.options.manifestSha256,
        attempt_index: guest.descriptor.attempt_index,
        collection_id: exportProof.collection_id,
        retained_disk_sha256: observed,
      },
      this.options.clock.nowMs(),
    );
    if (!decision.valid) throw new Error(`retention deletion refused: ${decision.reason ?? "denied"}`);

    for (const name of ["root.img", "input.img", "run.json"]) {
      const scratchPath = path.join(guest.attempt_directory, name);
      const info = await lstat(scratchPath).catch(() => null);
      if (info === null) continue;
      if (!info.isFile() || info.isSymbolicLink()) {
        throw new Error(`refusing to delete non-regular attempt scratch path: ${name}`);
      }
      await unlink(scratchPath);
    }
    this.record("lifecycle", `scratch-disposed:${guest.instance_name}`, { scoped: true });
  }

  /**
   * Recovery is ledger-driven: caller-supplied names prove nothing. Every owned
   * resource is re-identified by pid + process start time, and a live record
   * that is not in memory is reconstructed as a quarantined guest (no capture,
   * no collection) instead of being silently forgotten.
   */
  async reconcile(): Promise<{
    owned_live: readonly string[];
    reconstructed: readonly string[];
    unowned_observed: readonly string[];
    detail: string;
  }> {
    await this.ensureLedgerOpen();
    const snapshot = await this.ledger.snapshot();
    const ownedLive: string[] = [];
    const reconstructed: string[] = [];
    for (const resource of snapshot.state.resources) {
      if (resource.kind !== "guest") continue;
      if (resource.pid === undefined || resource.process_started_at === undefined) continue;
      const observed = await this.runnerStartIdentity(resource.pid);
      if (observed === null || observed !== resource.process_started_at) continue;
      ownedLive.push(resource.name);
      if (this.guests.has(resource.name)) continue;
      const guest: GuestRecord = {
        guest_id: resource.name,
        instance_name: resource.name,
        descriptor: resource.descriptor ?? {
          attempt_index: resource.attempt_index,
          case_id: "unknown",
          arm_id: "unknown",
          repetition: 0,
        },
        created_at: resource.created_at,
        status: "failed",
        trust_revoked: true,
        channel_opened_at: null,
        post_exposure_interface: "none",
        attempt_directory: resource.attempt_directory ?? this.options.workDir,
        runner_pid: resource.pid,
        runner_started_at: resource.process_started_at,
        retained_disk_path: null,
        observed_write_bytes: 0,
        last_error: "recovered from durable ownership; teardown not proven, lease retained",
      };
      this.guests.set(resource.name, guest);
      reconstructed.push(resource.name);
    }
    return {
      owned_live: ownedLive,
      reconstructed,
      unowned_observed: [],
      detail:
        reconstructed.length === 0
          ? `owned live resources: ${ownedLive.join(",") || "none"}`
          : `recovered quarantined guests: ${reconstructed.join(",")}`,
    };
  }

  finalize(guestId: string, state: AttemptOutcome["state"], reason: string): AttemptOutcome {
    const guest = this.requireGuest(guestId);
    return Object.freeze({
      state,
      reason,
      observations: Object.freeze([...this.observations]),
      cleanup: {
        stopped: guest.status === "stopped",
        retained_disk_path: guest.retained_disk_path,
        detail: guest.status === "stopped" ? "host stop observed" : "no host stop observed",
      },
    });
  }

  getGuest(guestId: string): GuestRecord {
    return Object.freeze({ ...this.requireGuest(guestId) });
  }

  async sessionSnapshot(): Promise<import("./session").SessionSnapshot> {
    await this.ensureLedgerOpen();
    return await this.ledger.snapshot();
  }

  observationLog(): readonly HostObservation[] {
    return Object.freeze([...this.observations]);
  }

  frozenSequence(): readonly AttemptDescriptor[] {
    return buildFrozenSequence(this.options.manifest);
  }

  frozenMembership(): ReadonlySet<string> {
    return frozenDescriptors(this.options.manifest);
  }

  availableActions(): readonly PrivilegedAction[] {
    return availableActions();
  }

  sessionCeilings(): { attempts: number; duration_ms: number; disk_bytes: number } {
    return {
      attempts: MAX_SESSION_ATTEMPTS,
      duration_ms: MAX_SESSION_DURATION_MS,
      disk_bytes: MAX_SESSION_DISK_BYTES,
    };
  }

  private requireGuest(guestId: string): GuestRecord {
    const guest = this.guests.get(guestId);
    if (guest === undefined) throw new Error(`Unknown guest ${guestId}`);
    return guest;
  }

  private requireCapture(guestId: string): SerialCapture {
    const capture = this.captures.get(guestId);
    if (capture === undefined) throw new Error(`No serial capture is open for ${guestId}`);
    return capture;
  }

  private updateGuest(guestId: string, updates: Partial<GuestRecord>): GuestRecord {
    const existing = this.requireGuest(guestId);
    const updated: GuestRecord = Object.freeze({ ...existing, ...updates });
    this.guests.set(guestId, updated);
    return updated;
  }
}

interface RunConfigSnapshot {
  readonly deadline_ms: number;
  readonly raw: Readonly<Record<string, unknown>>;
}

function parseRunConfigSnapshot(body: string): RunConfigSnapshot {
  const parsed: unknown = JSON.parse(body);
  if (typeof parsed !== "object" || parsed === null) throw new Error("run config is not an object");
  const deadline = (parsed as { deadline_ms?: unknown }).deadline_ms;
  if (typeof deadline !== "number" || !Number.isSafeInteger(deadline) || deadline <= 0) {
    throw new Error("run config deadline_ms is invalid");
  }
  return { deadline_ms: deadline, raw: { ...parsed } };
}

/** A controller console phase marker; anything else is not a phase event. */
function parsePhaseFrame(frame: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(frame);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  if (!("event" in parsed) || parsed.event !== "phase") return null;
  if (!("phase" in parsed) || typeof parsed.phase !== "string") return null;
  return parsed.phase;
}

/** Capability expiry is trusted host input (already signature-verified). */
function capabilityExpiryMs(token: unknown): number | null {
  if (typeof token !== "object" || token === null) return null;
  if (!("expires_at" in token) || typeof token.expires_at !== "string") return null;
  const parsed = Date.parse(token.expires_at);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type { VzRunConfig };
