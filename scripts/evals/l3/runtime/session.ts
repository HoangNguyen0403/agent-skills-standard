/**
 * scripts/evals/l3/runtime/session.ts
 *
 * Durable, exclusive session accounting.
 *
 * A lock file makes the session single-writer; counters, the attempt lease and
 * resource ownership are persisted to disk BEFORE the corresponding host action,
 * so a crash or restart cannot silently regain budget or forget a live resource.
 * Time and byte values come from the trusted clock and host observations only.
 */

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, open, readFile, rename, unlink, writeFile, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { buildAttemptSequence, type AttemptPlan, type L3Manifest } from "../manifest";
import {
  MAX_ATTEMPT_WALL_MS,
  MAX_SESSION_ATTEMPTS,
  MAX_SESSION_DISK_BYTES,
  MAX_SESSION_DURATION_MS,
  type AttemptDescriptor,
  type LeaseRecord,
  type PersistedResource,
  type SessionCounters,
  type TrustedClock,
} from "./types";

export interface SessionLimits {
  readonly maxAttempts: number;
  readonly maxDurationMs: number;
  readonly maxDiskBytes: number;
  readonly maxStageMs: number;
  readonly maxBuildMs: number;
  readonly maxRunMs: number;
}

export const DEFAULT_SESSION_LIMITS: SessionLimits = Object.freeze({
  maxAttempts: MAX_SESSION_ATTEMPTS,
  maxDurationMs: MAX_SESSION_DURATION_MS,
  maxDiskBytes: MAX_SESSION_DISK_BYTES,
  maxStageMs: 120_000,
  maxBuildMs: 120_000,
  maxRunMs: MAX_ATTEMPT_WALL_MS,
});

export type PhaseKind = "stage" | "build" | "run";

export interface SessionState {
  readonly schema_version: 1;
  readonly run_id: string;
  readonly manifest_sha256: string;
  readonly session_started_at_ms: number;
  readonly counters: SessionCounters;
  readonly lease: LeaseRecord | null;
  readonly resources: readonly PersistedResource[];
}

export interface AttemptLease {
  readonly descriptor: AttemptDescriptor;
  readonly acquired_at_ms: number;
  readonly wall_deadline_ms: number;
}

export interface SessionSnapshot {
  readonly state: SessionState;
  readonly elapsed_ms: number;
}

const PHASE_LIMIT: Record<PhaseKind, keyof SessionLimits> = {
  stage: "maxStageMs",
  build: "maxBuildMs",
  run: "maxRunMs",
};

const execFileAsync = promisify(execFile);

/**
 * Process start identity for a live host pid. A reused pid has a different start
 * time, so a stale lock is only recovered when both pid and start identity show
 * the recorded owner is gone. A pid that exists but cannot be identified is
 * treated as live (fail closed).
 */
async function processStartIdentity(pid: number): Promise<string | null> {
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;
  try {
    process.kill(pid, 0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return null;
  }
  try {
    const { stdout } = await execFileAsync("/bin/ps", ["-p", String(pid), "-o", "lstart="], {
      timeout: 5_000,
      maxBuffer: 4_096,
    });
    const identity = stdout.trim();
    return identity.length === 0 ? "unknown" : identity;
  } catch {
    try {
      process.kill(pid, 0);
      return "unknown";
    } catch {
      return null;
    }
  }
}

function safePositive(value: number, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${what} must be a positive safe integer, got ${String(value)}`);
  }
  return value;
}

function safeNonNegative(value: number, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${what} must be a non-negative safe integer, got ${String(value)}`);
  }
  return value;
}

function validateLimits(limits: SessionLimits): SessionLimits {
  const validated: SessionLimits = {
    maxAttempts: safePositive(limits.maxAttempts, "maxAttempts"),
    maxDurationMs: safePositive(limits.maxDurationMs, "maxDurationMs"),
    maxDiskBytes: safePositive(limits.maxDiskBytes, "maxDiskBytes"),
    maxStageMs: safePositive(limits.maxStageMs, "maxStageMs"),
    maxBuildMs: safePositive(limits.maxBuildMs, "maxBuildMs"),
    maxRunMs: safePositive(limits.maxRunMs, "maxRunMs"),
  };
  if (validated.maxAttempts > MAX_SESSION_ATTEMPTS) throw new Error("maxAttempts exceeds the SRS ceiling");
  if (validated.maxDurationMs > MAX_SESSION_DURATION_MS) throw new Error("maxDurationMs exceeds the SRS ceiling");
  if (validated.maxDiskBytes > MAX_SESSION_DISK_BYTES) throw new Error("maxDiskBytes exceeds the SRS ceiling");
  if (validated.maxStageMs > 120_000 || validated.maxBuildMs > 120_000 || validated.maxRunMs > MAX_ATTEMPT_WALL_MS) {
    throw new Error("phase ceilings exceed the SRS limits");
  }
  return validated;
}

type DescriptorLike = Pick<AttemptDescriptor, "attempt_index" | "case_id" | "arm_id" | "repetition">;

function descriptorKey(descriptor: DescriptorLike): string {
  return `${descriptor.attempt_index}/${descriptor.case_id}/${descriptor.arm_id}/${descriptor.repetition}`;
}

function fileDigest(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export class DurableSessionLedger {
  private readonly manifest: L3Manifest;
  private readonly manifestSha256: string;
  private readonly clock: TrustedClock;
  private readonly limits: SessionLimits;
  private readonly statePath: string;
  private readonly lockPath: string;
  private state: SessionState | null = null;
  private lockHeld = false;
  private lastClockReading = 0;

  constructor(options: {
    manifest: L3Manifest;
    manifestSha256: string;
    clock: TrustedClock;
    statePath: string;
    limits?: Partial<SessionLimits>;
  }) {
    if (!path.isAbsolute(options.statePath)) throw new Error("statePath must be absolute");
    this.manifest = options.manifest;
    this.manifestSha256 = options.manifestSha256;
    this.clock = options.clock;
    this.limits = validateLimits({ ...DEFAULT_SESSION_LIMITS, ...options.limits });
    this.statePath = options.statePath;
    this.lockPath = `${options.statePath}.lock`;
  }

  /** Acquires the exclusive writer lock; a second live writer fails closed. */
  async open(): Promise<void> {
    await mkdir(path.dirname(this.statePath), { recursive: true, mode: 0o700 });
    const identity = await processStartIdentity(process.pid);
    const lockBody = JSON.stringify({ pid: process.pid, started: identity ?? "unknown" });
    let handle: FileHandle | null = null;
    try {
      handle = await open(this.lockPath, "wx", 0o600);
    } catch (error) {
      // Recover only when the recorded owner is provably gone: same pid with a
      // different start identity is a reused pid and never proves liveness.
      let recordedPid: number | null = null;
      let recordedStart: string | null = null;
      try {
        const raw = await readFile(this.lockPath, "utf8");
        try {
          const parsed: unknown = JSON.parse(raw);
          if (typeof parsed === "object" && parsed !== null && "pid" in parsed) {
            const pid = parsed.pid;
            if (typeof pid === "number" && Number.isSafeInteger(pid) && pid > 0) recordedPid = pid;
            if ("started" in parsed && typeof parsed.started === "string") recordedStart = parsed.started;
          }
        } catch {
          const legacyPid = Number.parseInt(raw.trim(), 10);
          if (Number.isSafeInteger(legacyPid) && legacyPid > 0) recordedPid = legacyPid;
        }
      } catch {
        // An unreadable lock is never treated as stale.
      }

      let stale = false;
      if (recordedPid !== null) {
        if (recordedPid === process.pid) {
          // Same process: only a different start identity proves the recorded
          // owner is a previous incarnation, never the current writer.
          stale =
            recordedStart !== null &&
            recordedStart !== "unknown" &&
            identity !== null &&
            identity !== "unknown" &&
            recordedStart !== identity;
        } else {
          const observedStart = await processStartIdentity(recordedPid);
          if (observedStart === null) {
            stale = true;
          } else if (recordedStart !== null && recordedStart !== "unknown" && observedStart !== "unknown") {
            stale = observedStart !== recordedStart;
          }
        }
      }
      if (!stale) {
        throw new Error(
          `session ledger is already locked by another process (${(error as NodeJS.ErrnoException).code ?? "unknown"})`,
        );
      }
      await unlink(this.lockPath).catch(() => undefined);
      handle = await open(this.lockPath, "wx", 0o600);
    }
    await handle.writeFile(lockBody, "utf8");
    await handle.close();
    this.lockHeld = true;

    const now = safePositive(this.clock.nowMs(), "session clock reading");
    try {
      const body = await readFile(this.statePath, "utf8");
      const parsed: unknown = JSON.parse(body);
      const state = this.parseState(parsed);
      if (state.run_id !== this.manifest.run_id || state.manifest_sha256 !== this.manifestSha256) {
        throw new Error("persisted session state belongs to a different run or manifest");
      }
      this.state = state;
      this.lastClockReading = Math.max(now, state.session_started_at_ms);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        await this.releaseLock();
        throw error;
      }
      this.state = {
        schema_version: 1,
        run_id: this.manifest.run_id,
        manifest_sha256: this.manifestSha256,
        session_started_at_ms: now,
        counters: { attempts_started: 0, stage_ms: 0, build_ms: 0, run_ms: 0, observed_write_bytes: 0 },
        lease: null,
        resources: [],
      };
      this.lastClockReading = now;
      await this.persist();
    }
  }

  async close(): Promise<void> {
    await this.releaseLock();
  }

  private async releaseLock(): Promise<void> {
    if (!this.lockHeld) return;
    this.lockHeld = false;
    await unlink(this.lockPath).catch(() => undefined);
  }

  private parseState(raw: unknown): SessionState {
    if (typeof raw !== "object" || raw === null) throw new Error("persisted ledger is not an object");
    const record = raw as Record<string, unknown>;
    if (record.schema_version !== 1) throw new Error("persisted ledger schema_version must be 1");
    for (const key of ["run_id", "manifest_sha256"] as const) {
      if (typeof record[key] !== "string") throw new Error(`persisted ledger ${key} must be a string`);
    }
    const counters = record.counters;
    if (typeof counters !== "object" || counters === null) throw new Error("persisted ledger counters missing");
    const counterRecord = counters as Record<string, unknown>;
    const validated: SessionCounters = {
      attempts_started: safeNonNegative(counterRecord.attempts_started as number, "attempts_started"),
      stage_ms: safeNonNegative(counterRecord.stage_ms as number, "stage_ms"),
      build_ms: safeNonNegative(counterRecord.build_ms as number, "build_ms"),
      run_ms: safeNonNegative(counterRecord.run_ms as number, "run_ms"),
      observed_write_bytes: safeNonNegative(counterRecord.observed_write_bytes as number, "observed_write_bytes"),
    };
    if (!Array.isArray(record.resources)) throw new Error("persisted ledger resources must be an array");
    const resources = record.resources.map((entry, index) => {
      if (typeof entry !== "object" || entry === null) throw new Error(`resource ${index} is not an object`);
      const resource = entry as Record<string, unknown>;
      if (resource.kind !== "guest" && resource.kind !== "collector") throw new Error(`resource ${index} kind invalid`);
      for (const key of ["name", "run_id", "created_at"] as const) {
        if (typeof resource[key] !== "string") throw new Error(`resource ${index} ${key} invalid`);
      }
      return {
        kind: resource.kind as "guest" | "collector",
        name: resource.name as string,
        run_id: resource.run_id as string,
        attempt_index: safeNonNegative(resource.attempt_index as number, "resource.attempt_index"),
        created_at: resource.created_at as string,
        ...(typeof resource.pid === "number" && Number.isSafeInteger(resource.pid) && resource.pid > 0
          ? { pid: resource.pid }
          : {}),
        ...(typeof resource.process_started_at === "string" ? { process_started_at: resource.process_started_at } : {}),
        ...(typeof resource.attempt_directory === "string" ? { attempt_directory: resource.attempt_directory } : {}),
        ...(typeof resource.status === "string" ? { status: resource.status } : {}),
      };
    });

    let lease: LeaseRecord | null = null;
    if (record.lease !== null) {
      if (typeof record.lease !== "object" || record.lease === null) throw new Error("persisted lease invalid");
      const rawLease = record.lease as Record<string, unknown>;
      lease = {
        run_id: String(rawLease.run_id ?? ""),
        attempt_index: safeNonNegative(rawLease.attempt_index as number, "lease.attempt_index"),
        case_id: String(rawLease.case_id ?? ""),
        arm_id: String(rawLease.arm_id ?? ""),
        repetition: safeNonNegative(rawLease.repetition as number, "lease.repetition"),
        acquired_at_ms: safePositive(rawLease.acquired_at_ms as number, "lease.acquired_at_ms"),
        owner_pid: safePositive(rawLease.owner_pid as number, "lease.owner_pid"),
      };
    }

    return {
      schema_version: 1,
      run_id: record.run_id as string,
      manifest_sha256: record.manifest_sha256 as string,
      session_started_at_ms: safePositive(record.session_started_at_ms as number, "session_started_at_ms"),
      counters: validated,
      lease,
      resources,
    };
  }

  private requireState(): SessionState {
    if (this.state === null) throw new Error("session ledger is not open");
    return this.state;
  }

  private tick(): number {
    const now = safePositive(this.clock.nowMs(), "session clock reading");
    if (now < this.lastClockReading) {
      throw new Error(`trusted clock moved backwards (${now} < ${this.lastClockReading})`);
    }
    this.lastClockReading = now;
    return now;
  }

  private async persist(): Promise<void> {
    const state = this.requireState();
    const body = JSON.stringify(state, null, 2);
    const temporary = `${this.statePath}.${process.pid}.tmp`;
    await writeFile(temporary, body, { mode: 0o600 });
    await rename(temporary, this.statePath);
  }

  /**
   * Reserves an attempt and persists the lease + counters BEFORE any host
   * action. A failed start never refunds budget.
   */
  async reserveAttempt(descriptor: AttemptDescriptor): Promise<AttemptLease> {
    const state = this.requireState();
    const now = this.tick();
    if (state.lease !== null) {
      throw new Error(`active attempt lease held by ${descriptorKey(state.lease)}`);
    }
    if (now - state.session_started_at_ms > this.limits.maxDurationMs) {
      throw new Error("session wall ceiling reached");
    }
    if (state.counters.attempts_started >= this.limits.maxAttempts) {
      throw new Error("session attempt ceiling reached");
    }
    const sequence = buildFrozenSequence(this.manifest);
    const expected = sequence[state.counters.attempts_started];
    if (expected === undefined || descriptorKey(descriptor) !== descriptorKey(expected)) {
      throw new Error(`attempt ${descriptorKey(descriptor)} is not in the frozen plan or violates sequence order`);
    }

    const lease: LeaseRecord = {
      run_id: state.run_id,
      attempt_index: descriptor.attempt_index,
      case_id: descriptor.case_id,
      arm_id: descriptor.arm_id,
      repetition: descriptor.repetition,
      acquired_at_ms: now,
      owner_pid: process.pid,
    };
    this.state = {
      ...state,
      counters: { ...state.counters, attempts_started: state.counters.attempts_started + 1 },
      lease,
    };
    await this.persist();
    return {
      descriptor,
      acquired_at_ms: now,
      wall_deadline_ms: now + this.limits.maxRunMs,
    };
  }

  /**
   * Checks the durable lease itself (not a caller-rebuilt one): the same attempt
   * must still hold it, the absolute phase deadline must not have passed, and the
   * session wall ceiling must remain open.
   */
  async assertAttemptLive(descriptor: DescriptorLike, phaseDeadlineMs?: number): Promise<void> {
    const state = this.requireState();
    const now = this.tick();
    const lease = state.lease;
    if (lease === null || descriptorKey(lease) !== descriptorKey(descriptor)) {
      throw new Error("no durable lease is held for this attempt");
    }
    if (now > lease.acquired_at_ms + this.limits.maxRunMs + this.limits.maxBuildMs) {
      throw new Error("attempt wall ceiling reached");
    }
    if (phaseDeadlineMs !== undefined && Number.isSafeInteger(phaseDeadlineMs) && now > phaseDeadlineMs) {
      throw new Error("the attempt phase deadline has already passed");
    }
    if (now - state.session_started_at_ms > this.limits.maxDurationMs) {
      throw new Error("session wall ceiling reached");
    }
  }

  /** Remaining session wall budget in milliseconds (never negative). */
  async remainingWindowMs(): Promise<number> {
    const state = this.requireState();
    const now = this.tick();
    return Math.max(0, this.limits.maxDurationMs - (now - state.session_started_at_ms));
  }

  /** Records an observed phase duration under its own ceiling. */
  async recordPhase(kind: PhaseKind, durationMs: number): Promise<void> {
    const state = this.requireState();
    const value = safeNonNegative(durationMs, `${kind} duration`);
    const limit = this.limits[PHASE_LIMIT[kind]];
    const counters: SessionCounters = {
      ...state.counters,
      stage_ms: state.counters.stage_ms + (kind === "stage" ? value : 0),
      build_ms: state.counters.build_ms + (kind === "build" ? value : 0),
      run_ms: state.counters.run_ms + (kind === "run" ? value : 0),
    };
    this.state = { ...state, counters };
    await this.persist();
    if (value > limit) throw new Error(`${kind} phase exceeded its ${limit} ms ceiling`);
  }

  /** Host-observed write volume; unknown observations throw rather than guess. */
  async recordObservedWrites(bytes: number): Promise<void> {
    const state = this.requireState();
    const value = safeNonNegative(bytes, "observed writes");
    const total = state.counters.observed_write_bytes + value;
    this.state = {
      ...state,
      counters: { ...state.counters, observed_write_bytes: total },
    };
    await this.persist();
    if (total > this.limits.maxDiskBytes) {
      throw new Error(`session write ceiling reached (${total} > ${this.limits.maxDiskBytes})`);
    }
  }

  async registerResource(resource: PersistedResource): Promise<void> {
    const state = this.requireState();
    if (state.resources.some((entry) => entry.name === resource.name)) {
      throw new Error(`resource ${resource.name} is already owned by this session`);
    }
    this.state = { ...state, resources: [...state.resources, resource] };
    await this.persist();
  }

  async updateResource(
    name: string,
    updates: Partial<Omit<PersistedResource, "kind" | "name" | "run_id">>,
  ): Promise<void> {
    const state = this.requireState();
    const index = state.resources.findIndex((entry) => entry.name === name);
    if (index === -1) throw new Error(`resource ${name} is not owned by this session`);
    const resources = [...state.resources];
    resources[index] = { ...resources[index], ...updates };
    this.state = { ...state, resources };
    await this.persist();
  }

  async unregisterResource(name: string): Promise<void> {
    const state = this.requireState();
    this.state = { ...state, resources: state.resources.filter((entry) => entry.name !== name) };
    await this.persist();
  }

  async releaseLease(descriptor: AttemptDescriptor): Promise<void> {
    const state = this.requireState();
    if (state.lease === null) return;
    const held = state.lease;
    if (descriptorKey(held) !== descriptorKey(descriptor)) {
      throw new Error("cannot release a lease held by a different attempt");
    }
    this.state = { ...state, lease: null };
    await this.persist();
  }

  async snapshot(): Promise<SessionSnapshot> {
    const state = this.requireState();
    const now = this.tick();
    return {
      state,
      elapsed_ms: now - state.session_started_at_ms,
    };
  }

  /**
   * Reconciliation reports live adapter instances that this ledger does not own.
   * It never stops them: positive ownership is required to touch a resource.
   */
  async reconcile(
    liveNames: readonly string[],
  ): Promise<{ owned_live: readonly string[]; unowned_observed: readonly string[]; detail: string }> {
    const state = this.requireState();
    const owned = new Set(state.resources.map((entry) => entry.name));
    const live = liveNames.filter((name) => name.startsWith("l3-"));
    const ownedLive = live.filter((name) => owned.has(name));
    const unowned = live.filter((name) => !owned.has(name));
    return {
      owned_live: ownedLive,
      unowned_observed: unowned,
      detail:
        unowned.length === 0
          ? "no unowned adapter instances observed"
          : `unowned adapter instances observed (not stopped): ${unowned.join(",")}`,
    };
  }
}

/** Exact, deterministic descriptor set the manifest authorises. */
export function frozenDescriptors(manifest: L3Manifest): ReadonlySet<string> {
  const plan: AttemptPlan = manifest.attempt_plan;
  const set = new Set<string>();
  for (const descriptor of buildAttemptSequence(plan)) set.add(descriptorKey(descriptor));
  return set;
}

export function buildFrozenSequence(manifest: L3Manifest): readonly AttemptDescriptor[] {
  const plan: AttemptPlan = manifest.attempt_plan;
  return buildAttemptSequence(plan);
}

export function ledgerDigest(state: SessionState): string {
  return fileDigest(JSON.stringify(state));
}

/** Attempt outcome states that must never be reported as a pass. */
export const NON_PASS_STATES = Object.freeze([
  "failed",
  "artifact_unavailable",
  "artifact_invalid",
  "build_failed",
  "preflight_failed",
  "infrastructure_error",
  "cancelled",
  "interrupted",
] as const);
