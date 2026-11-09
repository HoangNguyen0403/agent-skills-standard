/**
 * scripts/evals/l3/manifest.ts
 *
 * Strict frozen manifest validation and filesystem-integrity checks.
 * Authoritative source: docs/srs/srs-skill-system-effectiveness.md Revision 3.
 *
 * Implements SRS-001, SRS-002, and SRS-006.
 *
 * Boundary notes (read before extending):
 * - Validation never executes, spawns or imports candidate code.
 * - Every required field is checked as an *own* field of a plain object; inherited
 *   or prototype-backed members never satisfy a requirement.
 * - Approval identity inside the manifest is data, never host authority.
 * - Descriptor-anchored traversal is used when the platform supports it; the
 *   reviewed alternative is an explicit controller-supplied trusted staging
 *   boundary. There is no silent path-based fallback.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  strictObject,
  validateId,
  validateNat,
  validatePositive,
  validateStringBound,
  D1_PROTOCOL_NAME,
  isProtocolArmId,
  PROTOCOL_ARMS,
  type Id,
  type Nat,
  type Positive,
  type ProtocolArmId,
} from "./contracts";

export const MANIFEST_SCHEMA_VERSION = 1 as const;

export const SUPPORTED_CASE_IDS = ["payment", "tenant", "overload"] as const;
export type SupportedCaseId = (typeof SUPPORTED_CASE_IDS)[number];

/** VM local write ceiling: maximum attempts per qualification session. */
export const MAX_SESSION_ATTEMPTS = 32;
/** VM local write ceiling: maximum session duration (2 hours). */
export const MAX_SESSION_DURATION_MS = 7_200_000;

/**
 * Accepted diagnostic policy ceilings (SRS revision 3, "Local VM profile and
 * resource policy"). A manifest may declare smaller finite limits; it may never
 * self-expand beyond these.
 */
export const STAGE_LIMIT_CEILINGS = {
  build: {
    cpu: 1,
    memory_mib: 1024,
    max_processes: 128,
    workspace_disk_mib: 512,
    wall_time_seconds: 120,
    max_output_bytes: 4_194_304,
  },
  run: {
    cpu: 1,
    memory_mib: 512,
    max_processes: 64,
    attempt_state_disk_mib: 128,
    wall_time_seconds: 90,
    max_output_bytes: 4_194_304,
    max_frame_bytes: 65_536,
  },
} as const;

/** Accepted mount identities for the diagnostic profile: controller-owned VM workspace only. */
export const APPROVED_PERMISSIBLE_MOUNTS = ["/workspace/attempt"] as const;

export const MAX_RUNTIME_DEADLINE_SECONDS = 7_200;

export const ATTEMPT_ORDER_ALGORITHM = "artifact-v1-seeded-shuffle-bounded-runs-v1" as const;
export const MAX_CONSECUTIVE_SAME_CASE = 2;
export const MAX_CONSECUTIVE_SAME_ARM = 2;
const MAX_ORDERING_ATTEMPTS = 64;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArtifactRef {
  readonly path: string;
  readonly sha256: string;
  readonly size: Nat;
}

export interface ArmSource {
  readonly artifact_ref: ArtifactRef;
}

export interface AttemptPlan {
  readonly cases: readonly SupportedCaseId[];
  readonly arms: readonly ProtocolArmId[];
  readonly repetitions: Positive;
  readonly seed: Nat;
  readonly max_attempts_per_arm_case: Positive;
  readonly starts_at: string;
  readonly ends_at: string;
}

export interface AttemptDescriptor {
  readonly attempt_index: Nat;
  readonly case_id: SupportedCaseId;
  readonly arm_id: ProtocolArmId;
  readonly repetition: Nat;
}

export interface GenerationContract {
  readonly prompts_ref: ArtifactRef;
  readonly model: string;
  readonly effort: string;
  readonly context_delivery_mode: string;
  readonly tool_policy: string;
}

export interface StageLimitsBuild {
  readonly cpu: Positive;
  readonly memory_mib: Positive;
  readonly max_processes: Positive;
  readonly workspace_disk_mib: Positive;
  readonly wall_time_seconds: Positive;
  readonly max_output_bytes: Positive;
}

export interface StageLimitsRun {
  readonly cpu: Positive;
  readonly memory_mib: Positive;
  readonly max_processes: Positive;
  readonly attempt_state_disk_mib: Positive;
  readonly wall_time_seconds: Positive;
  readonly max_output_bytes: Positive;
  readonly max_frame_bytes: Positive;
}

export interface RuntimePolicy {
  readonly image_digest: string;
  readonly node_version: string;
  readonly runtime_adapter_version: string;
  readonly stage_limits: {
    readonly build: StageLimitsBuild;
    readonly run: StageLimitsRun;
  };
  readonly permissible_mounts: readonly string[];
  readonly network_policy: "none";
  readonly deadline_seconds: Positive;
}

export interface DriverBundle {
  readonly bundle_ref: ArtifactRef;
  readonly version: string;
}

export interface ApprovalBinding {
  readonly grant_id: Id;
  readonly authority: string;
  readonly scope: string;
  readonly expiry: string;
}

export interface RetentionPolicy {
  readonly custodian: string;
  readonly access: "local-restricted";
  readonly retention_days: Positive;
  readonly delete_requires_review: boolean;
}

export interface L3Manifest {
  readonly schema_version: 1;
  readonly protocol: "artifact-v1";
  readonly run_id: Id;
  readonly case_ids: readonly Id[];
  readonly arm_sources: Record<ProtocolArmId, ArmSource>;
  readonly attempt_plan: AttemptPlan;
  readonly generation_contract: GenerationContract;
  readonly runtime_policy: RuntimePolicy;
  readonly driver_bundle: DriverBundle;
  readonly approval_binding: ApprovalBinding;
  readonly retention_policy: RetentionPolicy;
}

export interface ManifestValidationOptions {
  /**
   * Trusted clock, injected by the controller for deterministic and testable
   * expiry checks. Defaults to the system clock.
   */
  readonly now?: () => Date | number;
}

// ---------------------------------------------------------------------------
// Primitive strictness helpers
// ---------------------------------------------------------------------------

const ARTIFACT_PATH_SEGMENT = /^[A-Za-z0-9._-]+$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const IMAGE_DIGEST = /^sha256:[0-9a-f]{64}$/;
const VERSION_STRING = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/;
const CANONICAL_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function validateNonEmptyString(value: unknown, field: string, maxBytes = 4096): string {
  const text = validateStringBound(value, field, maxBytes);
  if (text.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return text;
}

function validateVersionString(value: unknown, field: string): string {
  if (typeof value !== "string" || !VERSION_STRING.test(value)) {
    throw new Error(`${field} must be a supported version string (major.minor.patch), got ${String(value)}`);
  }
  return value;
}

function assertAtMost(value: unknown, ceiling: number, field: string): Positive {
  const numeric = validatePositive(value, field);
  if (numeric > ceiling) {
    throw new Error(`${field} (${numeric}) exceeds accepted SRS diagnostic ceiling (${ceiling})`);
  }
  return numeric;
}

/**
 * Canonical UTC instant: exact `YYYY-MM-DDTHH:mm:ss.sssZ` form and a calendar
 * roundtrip, so out-of-range components such as 2026-02-30 are rejected instead
 * of silently normalised.
 */
function parseCanonicalUtcTimestamp(value: unknown, field: string): number {
  if (typeof value !== "string" || !CANONICAL_UTC_TIMESTAMP.test(value)) {
    throw new Error(
      `${field} must be a canonical UTC timestamp string (YYYY-MM-DDTHH:mm:ss.sssZ), got ${String(value)}`
    );
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    throw new Error(`${field} is not a parsable instant: ${value}`);
  }
  if (new Date(ms).toISOString() !== value) {
    throw new Error(`${field} is not a real calendar instant (roundtrip mismatch): ${value}`);
  }
  return ms;
}

function resolveNowMs(options: ManifestValidationOptions | undefined): number {
  const nowFn = options?.now;
  if (nowFn === undefined) {
    return Date.now();
  }
  const value = nowFn();
  const ms = value instanceof Date ? value.getTime() : value;
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    throw new Error("Injected trusted clock must return a finite Date or epoch milliseconds");
  }
  return ms;
}

function validateContainedRelativePath(value: unknown, context: string): string {
  if (typeof value !== "string") {
    throw new Error(`${context} must be a string, got ${typeof value}`);
  }
  if (value.length === 0) {
    throw new Error(`${context} must be a non-empty relative path`);
  }
  if (value.length > 1024) {
    throw new Error(`${context} exceeds maximum path length bound`);
  }
  if (value.includes("\0")) {
    throw new Error(`${context} must not contain NUL bytes`);
  }
  if (value.includes("\\")) {
    throw new Error(`${context} must not contain backslashes: ${value}`);
  }
  if (value.startsWith("/")) {
    throw new Error(`${context} must be a contained relative path, got absolute path: ${value}`);
  }
  const segments = value.split("/");
  for (const segment of segments) {
    if (segment.length === 0) {
      throw new Error(`${context} must not contain empty path segments (duplicate slash): ${value}`);
    }
    if (segment === "." || segment === "..") {
      throw new Error(`${context} must not contain traversal segments: ${value}`);
    }
    if (!ARTIFACT_PATH_SEGMENT.test(segment)) {
      throw new Error(`${context} contains an unsupported path segment '${segment}': ${value}`);
    }
  }
  return segments.join("/");
}

function validateArtifactRef(raw: unknown, context: string): ArtifactRef {
  const obj = strictObject(raw, context, ["path", "sha256", "size"]);
  const containedPath = validateContainedRelativePath(obj.path, `${context}.path`);
  const sha256 = obj.sha256;
  if (typeof sha256 !== "string" || !SHA256_HEX.test(sha256)) {
    throw new Error(`${context}.sha256 must be a 64-char lowercase hex sha256 string, got ${String(sha256)}`);
  }
  const size = validateNat(obj.size, `${context}.size`);
  return { path: containedPath, sha256, size };
}

// ---------------------------------------------------------------------------
// Manifest structure validation
// ---------------------------------------------------------------------------

const MANIFEST_KEYS = [
  "schema_version",
  "protocol",
  "run_id",
  "case_ids",
  "arm_sources",
  "attempt_plan",
  "generation_contract",
  "runtime_policy",
  "driver_bundle",
  "approval_binding",
  "retention_policy",
] as const;

export function validateManifestStructure(
  raw: unknown,
  options?: ManifestValidationOptions
): L3Manifest {
  const obj = strictObject(raw, "Manifest", MANIFEST_KEYS);

  if (obj.schema_version !== MANIFEST_SCHEMA_VERSION) {
    throw new Error(
      `Invalid schema_version: expected ${MANIFEST_SCHEMA_VERSION}, got ${String(obj.schema_version)}`
    );
  }
  if (obj.protocol !== D1_PROTOCOL_NAME) {
    throw new Error(`Invalid protocol: expected '${D1_PROTOCOL_NAME}', got '${String(obj.protocol)}'`);
  }

  const run_id = validateId(obj.run_id, "run_id");

  // ---- case_ids -----------------------------------------------------------
  if (!Array.isArray(obj.case_ids) || obj.case_ids.length === 0) {
    throw new Error("case_ids must be a non-empty array");
  }
  const seenCaseIds = new Set<string>();
  const case_ids: Id[] = [];
  for (let i = 0; i < obj.case_ids.length; i += 1) {
    const caseId = validateId(obj.case_ids[i], `case_ids[${i}]`);
    if (!(SUPPORTED_CASE_IDS as readonly string[]).includes(caseId)) {
      throw new Error(`Unsupported case ID in case_ids: ${caseId}`);
    }
    if (seenCaseIds.has(caseId)) {
      throw new Error(`Duplicate case ID in case_ids: ${caseId}`);
    }
    seenCaseIds.add(caseId);
    case_ids.push(caseId);
  }

  // ---- arm_sources --------------------------------------------------------
  const armSourcesObj = strictObject(obj.arm_sources, "arm_sources", PROTOCOL_ARMS);
  const arm_sources = {} as Record<ProtocolArmId, ArmSource>;
  for (const arm of PROTOCOL_ARMS) {
    const armEntry = strictObject(armSourcesObj[arm], `arm_sources.${arm}`, ["artifact_ref"]);
    arm_sources[arm] = {
      artifact_ref: validateArtifactRef(armEntry.artifact_ref, `arm_sources.${arm}.artifact_ref`),
    };
  }

  // ---- attempt_plan -------------------------------------------------------
  const ap = strictObject(obj.attempt_plan, "attempt_plan", [
    "cases",
    "arms",
    "repetitions",
    "seed",
    "max_attempts_per_arm_case",
    "starts_at",
    "ends_at",
  ]);

  if (!Array.isArray(ap.cases) || ap.cases.length === 0) {
    throw new Error("attempt_plan.cases must be a non-empty array");
  }
  if (!Array.isArray(ap.arms) || ap.arms.length === 0) {
    throw new Error("attempt_plan.arms must be a non-empty array");
  }

  const seenPlanCases = new Set<string>();
  const validatedCases: SupportedCaseId[] = [];
  for (const candidateCase of ap.cases) {
    if (
      typeof candidateCase !== "string" ||
      !(SUPPORTED_CASE_IDS as readonly string[]).includes(candidateCase)
    ) {
      throw new Error(`Unsupported or invalid case ID in attempt_plan.cases: ${String(candidateCase)}`);
    }
    if (seenPlanCases.has(candidateCase)) {
      throw new Error(`Duplicate case ID in attempt_plan.cases: ${candidateCase}`);
    }
    seenPlanCases.add(candidateCase);
    validatedCases.push(candidateCase as SupportedCaseId);
  }

  const seenPlanArms = new Set<string>();
  const validatedArms: ProtocolArmId[] = [];
  for (const candidateArm of ap.arms) {
    if (!isProtocolArmId(candidateArm)) {
      throw new Error(`attempt_plan.arms contains an invalid arm ID: ${String(candidateArm)}`);
    }
    if (seenPlanArms.has(candidateArm)) {
      throw new Error(`Duplicate arm ID in attempt_plan.arms: ${candidateArm}`);
    }
    seenPlanArms.add(candidateArm);
    validatedArms.push(candidateArm);
  }

  // case_ids must name exactly the planned case population.
  if (case_ids.length !== validatedCases.length || !case_ids.every((id) => seenPlanCases.has(id))) {
    throw new Error(
      `case_ids must exactly match attempt_plan.cases (case_ids: ${case_ids.join(", ")}; plan: ${validatedCases.join(", ")})`
    );
  }

  const repetitions = validatePositive(ap.repetitions, "attempt_plan.repetitions");
  const seed = validateNat(ap.seed, "attempt_plan.seed");
  const max_attempts_per_arm_case = validatePositive(
    ap.max_attempts_per_arm_case,
    "attempt_plan.max_attempts_per_arm_case"
  );

  if (repetitions > max_attempts_per_arm_case) {
    throw new Error(
      `attempt_plan.repetitions (${repetitions}) exceeds max_attempts_per_arm_case (${max_attempts_per_arm_case}): the plan would require hidden retries`
    );
  }
  const plannedStarts = validatedCases.length * validatedArms.length * repetitions;
  const permittedStarts = validatedCases.length * validatedArms.length * max_attempts_per_arm_case;
  if (plannedStarts > MAX_SESSION_ATTEMPTS || permittedStarts > MAX_SESSION_ATTEMPTS) {
    throw new Error(
      `Session attempt ceiling exceeded: planned starts (${plannedStarts}) / permitted starts (${permittedStarts}) exceed maximum ${MAX_SESSION_ATTEMPTS}`
    );
  }

  const startsAtMs = parseCanonicalUtcTimestamp(ap.starts_at, "attempt_plan.starts_at");
  const endsAtMs = parseCanonicalUtcTimestamp(ap.ends_at, "attempt_plan.ends_at");
  if (endsAtMs <= startsAtMs) {
    throw new Error("attempt_plan.ends_at must be strictly after attempt_plan.starts_at");
  }
  if (endsAtMs - startsAtMs > MAX_SESSION_DURATION_MS) {
    throw new Error(
      `attempt_plan window (${(endsAtMs - startsAtMs) / 1000}s) exceeds the maximum 2-hour session ceiling`
    );
  }
  // The frozen attempt window must still be open under the trusted clock. A
  // current grant does not revive an ended window; the boundary instant itself
  // is closed. A future starts_at is structurally acceptable — D2 enforces the
  // start/end instants at execution time.
  const nowMs = resolveNowMs(options);
  if (endsAtMs <= nowMs) {
    throw new Error(
      `attempt_plan.ends_at (${String(ap.ends_at)}) is not in the future under the trusted clock; an ended window is rejected even when the grant is current`
    );
  }

  const attempt_plan: AttemptPlan = {
    cases: validatedCases,
    arms: validatedArms,
    repetitions,
    seed,
    max_attempts_per_arm_case,
    starts_at: ap.starts_at as string,
    ends_at: ap.ends_at as string,
  };

  // ---- generation_contract ------------------------------------------------
  const gc = strictObject(obj.generation_contract, "generation_contract", [
    "prompts_ref",
    "model",
    "effort",
    "context_delivery_mode",
    "tool_policy",
  ]);
  const generation_contract: GenerationContract = {
    prompts_ref: validateArtifactRef(gc.prompts_ref, "generation_contract.prompts_ref"),
    model: validateNonEmptyString(gc.model, "generation_contract.model"),
    effort: validateNonEmptyString(gc.effort, "generation_contract.effort"),
    context_delivery_mode: validateNonEmptyString(
      gc.context_delivery_mode,
      "generation_contract.context_delivery_mode"
    ),
    tool_policy: validateNonEmptyString(gc.tool_policy, "generation_contract.tool_policy"),
  };

  // ---- runtime_policy -----------------------------------------------------
  const rp = strictObject(obj.runtime_policy, "runtime_policy", [
    "image_digest",
    "node_version",
    "runtime_adapter_version",
    "stage_limits",
    "permissible_mounts",
    "network_policy",
    "deadline_seconds",
  ]);

  if (typeof rp.image_digest !== "string" || !IMAGE_DIGEST.test(rp.image_digest)) {
    throw new Error("runtime_policy.image_digest must be a pinned sha256:<64 lowercase hex> digest");
  }
  const node_version = validateVersionString(rp.node_version, "runtime_policy.node_version");
  const runtime_adapter_version = validateVersionString(
    rp.runtime_adapter_version,
    "runtime_policy.runtime_adapter_version"
  );
  if (rp.network_policy !== "none") {
    throw new Error("runtime_policy.network_policy must be 'none'");
  }

  if (!Array.isArray(rp.permissible_mounts)) {
    throw new Error("runtime_policy.permissible_mounts must be an array");
  }
  const seenMounts = new Set<string>();
  const permissible_mounts: string[] = [];
  for (const mount of rp.permissible_mounts) {
    if (typeof mount !== "string") {
      throw new Error("runtime_policy.permissible_mounts entries must be strings");
    }
    if (!(APPROVED_PERMISSIBLE_MOUNTS as readonly string[]).includes(mount)) {
      throw new Error(
        `Forbidden mount identity in runtime_policy.permissible_mounts: ${mount} (accepted: ${APPROVED_PERMISSIBLE_MOUNTS.join(", ")})`
      );
    }
    if (seenMounts.has(mount)) {
      throw new Error(`Duplicate mount identity in runtime_policy.permissible_mounts: ${mount}`);
    }
    seenMounts.add(mount);
    permissible_mounts.push(mount);
  }

  const sl = strictObject(rp.stage_limits, "runtime_policy.stage_limits", ["build", "run"]);
  const buildSl = strictObject(sl.build, "stage_limits.build", [
    "cpu",
    "memory_mib",
    "max_processes",
    "workspace_disk_mib",
    "wall_time_seconds",
    "max_output_bytes",
  ]);
  const runSl = strictObject(sl.run, "stage_limits.run", [
    "cpu",
    "memory_mib",
    "max_processes",
    "attempt_state_disk_mib",
    "wall_time_seconds",
    "max_output_bytes",
    "max_frame_bytes",
  ]);

  const build: StageLimitsBuild = {
    cpu: assertAtMost(buildSl.cpu, STAGE_LIMIT_CEILINGS.build.cpu, "stage_limits.build.cpu"),
    memory_mib: assertAtMost(
      buildSl.memory_mib,
      STAGE_LIMIT_CEILINGS.build.memory_mib,
      "stage_limits.build.memory_mib"
    ),
    max_processes: assertAtMost(
      buildSl.max_processes,
      STAGE_LIMIT_CEILINGS.build.max_processes,
      "stage_limits.build.max_processes"
    ),
    workspace_disk_mib: assertAtMost(
      buildSl.workspace_disk_mib,
      STAGE_LIMIT_CEILINGS.build.workspace_disk_mib,
      "stage_limits.build.workspace_disk_mib"
    ),
    wall_time_seconds: assertAtMost(
      buildSl.wall_time_seconds,
      STAGE_LIMIT_CEILINGS.build.wall_time_seconds,
      "stage_limits.build.wall_time_seconds"
    ),
    max_output_bytes: assertAtMost(
      buildSl.max_output_bytes,
      STAGE_LIMIT_CEILINGS.build.max_output_bytes,
      "stage_limits.build.max_output_bytes"
    ),
  };
  const run: StageLimitsRun = {
    cpu: assertAtMost(runSl.cpu, STAGE_LIMIT_CEILINGS.run.cpu, "stage_limits.run.cpu"),
    memory_mib: assertAtMost(
      runSl.memory_mib,
      STAGE_LIMIT_CEILINGS.run.memory_mib,
      "stage_limits.run.memory_mib"
    ),
    max_processes: assertAtMost(
      runSl.max_processes,
      STAGE_LIMIT_CEILINGS.run.max_processes,
      "stage_limits.run.max_processes"
    ),
    attempt_state_disk_mib: assertAtMost(
      runSl.attempt_state_disk_mib,
      STAGE_LIMIT_CEILINGS.run.attempt_state_disk_mib,
      "stage_limits.run.attempt_state_disk_mib"
    ),
    wall_time_seconds: assertAtMost(
      runSl.wall_time_seconds,
      STAGE_LIMIT_CEILINGS.run.wall_time_seconds,
      "stage_limits.run.wall_time_seconds"
    ),
    max_output_bytes: assertAtMost(
      runSl.max_output_bytes,
      STAGE_LIMIT_CEILINGS.run.max_output_bytes,
      "stage_limits.run.max_output_bytes"
    ),
    max_frame_bytes: assertAtMost(
      runSl.max_frame_bytes,
      STAGE_LIMIT_CEILINGS.run.max_frame_bytes,
      "stage_limits.run.max_frame_bytes"
    ),
  };

  const runtime_policy: RuntimePolicy = {
    image_digest: rp.image_digest,
    node_version,
    runtime_adapter_version,
    stage_limits: { build, run },
    permissible_mounts,
    network_policy: "none",
    deadline_seconds: assertAtMost(
      rp.deadline_seconds,
      MAX_RUNTIME_DEADLINE_SECONDS,
      "runtime_policy.deadline_seconds"
    ),
  };

  // ---- driver_bundle ------------------------------------------------------
  const db = strictObject(obj.driver_bundle, "driver_bundle", ["bundle_ref", "version"]);
  const driver_bundle: DriverBundle = {
    bundle_ref: validateArtifactRef(db.bundle_ref, "driver_bundle.bundle_ref"),
    version: validateNonEmptyString(db.version, "driver_bundle.version", 128),
  };

  // ---- approval_binding ---------------------------------------------------
  const ab = strictObject(obj.approval_binding, "approval_binding", [
    "grant_id",
    "authority",
    "scope",
    "expiry",
  ]);
  const expiryMs = parseCanonicalUtcTimestamp(ab.expiry, "approval_binding.expiry");
  // The grant must cover the whole frozen window. Combined with the window
  // check above (`ends_at > now`), this implies `expiry > now`, so an expired
  // grant cannot admit a run; no separate redundant expiry-vs-clock branch.
  if (expiryMs < endsAtMs) {
    throw new Error(
      `approval_binding.expiry (${String(ab.expiry)}) cannot be before attempt_plan.ends_at (${attempt_plan.ends_at})`
    );
  }
  const approval_binding: ApprovalBinding = {
    grant_id: validateId(ab.grant_id, "approval_binding.grant_id"),
    authority: validateNonEmptyString(ab.authority, "approval_binding.authority", 256),
    scope: validateNonEmptyString(ab.scope, "approval_binding.scope", 256),
    expiry: ab.expiry as string,
  };

  // ---- retention_policy ---------------------------------------------------
  const ret = strictObject(obj.retention_policy, "retention_policy", [
    "custodian",
    "access",
    "retention_days",
    "delete_requires_review",
  ]);
  if (ret.access !== "local-restricted") {
    throw new Error("retention_policy.access must be 'local-restricted'");
  }
  if (ret.delete_requires_review !== true) {
    throw new Error("retention_policy.delete_requires_review must be true");
  }
  const retention_policy: RetentionPolicy = {
    custodian: validateNonEmptyString(ret.custodian, "retention_policy.custodian", 256),
    access: "local-restricted",
    retention_days: validatePositive(ret.retention_days, "retention_policy.retention_days"),
    delete_requires_review: true,
  };

  return {
    schema_version: 1,
    protocol: "artifact-v1",
    run_id,
    case_ids,
    arm_sources,
    attempt_plan,
    generation_contract,
    runtime_policy,
    driver_bundle,
    approval_binding,
    retention_policy,
  };
}

// ---------------------------------------------------------------------------
// Deterministic attempt ordering
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: readonly T[], seed: number, round: number): T[] {
  const shuffled = items.slice();
  const random = mulberry32((seed ^ Math.imul(round + 1, 0x9e3779b1)) >>> 0);
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }
  return shuffled;
}

function respectsRunLimits(sequence: readonly Omit<AttemptDescriptor, "attempt_index">[]): boolean {
  const distinctCases = new Set(sequence.map((entry) => entry.case_id)).size;
  const distinctArms = new Set(sequence.map((entry) => entry.arm_id)).size;
  let sameCaseRun = 1;
  let sameArmRun = 1;
  for (let i = 1; i < sequence.length; i += 1) {
    sameCaseRun = sequence[i].case_id === sequence[i - 1].case_id ? sameCaseRun + 1 : 1;
    sameArmRun = sequence[i].arm_id === sequence[i - 1].arm_id ? sameArmRun + 1 : 1;
    if (distinctCases > 1 && sameCaseRun > MAX_CONSECUTIVE_SAME_CASE) {
      return false;
    }
    if (distinctArms > 1 && sameArmRun > MAX_CONSECUTIVE_SAME_ARM) {
      return false;
    }
  }
  return true;
}

/**
 * Derive the frozen, reproducible attempt order for a validated plan.
 *
 * Algorithm (frozen as `ATTEMPT_ORDER_ALGORITHM`): build the full case x arm x
 * repetition population in plan order, shuffle it with a seeded mulberry32
 * Fisher-Yates permutation, and accept the first derivation that honours the
 * bounded-run rules (at most 2 consecutive equal case IDs and at most 2
 * consecutive equal arm IDs). Rounds are derived only from the frozen seed, so
 * the same plan always yields byte-identical descriptors. This is the new
 * artifact-v1 rule; it is not the original prose pilot's randomisation and no
 * equivalence with that pilot is claimed.
 */
export function buildAttemptSequence(plan: AttemptPlan): readonly AttemptDescriptor[] {
  const population: Omit<AttemptDescriptor, "attempt_index">[] = [];
  for (let repetition = 0; repetition < plan.repetitions; repetition += 1) {
    for (const caseId of plan.cases) {
      for (const armId of plan.arms) {
        population.push({ case_id: caseId, arm_id: armId, repetition });
      }
    }
  }
  if (population.length === 0) {
    throw new Error("Attempt plan population is empty");
  }
  if (population.length > MAX_SESSION_ATTEMPTS) {
    throw new Error(
      `Attempt population (${population.length}) exceeds maximum session ceiling ${MAX_SESSION_ATTEMPTS}`
    );
  }
  for (let round = 0; round < MAX_ORDERING_ATTEMPTS; round += 1) {
    const candidate = seededShuffle(population, plan.seed, round);
    if (!respectsRunLimits(candidate)) {
      continue;
    }
    return candidate.map((entry, index) => ({
      attempt_index: index,
      case_id: entry.case_id,
      arm_id: entry.arm_id,
      repetition: entry.repetition,
    }));
  }
  throw new Error(
    `Unable to derive an attempt order honouring bounded-run rules for seed ${plan.seed} and population ${population.length}`
  );
}

// ---------------------------------------------------------------------------
// Filesystem isolation
// ---------------------------------------------------------------------------

export type DescriptorAnchorMechanism = "proc-self-fd" | "dev-fd";

export interface DescriptorAnchoredProbeResult {
  readonly supported: boolean;
  readonly mechanism: DescriptorAnchorMechanism | null;
  readonly detail: string;
}

export type FilesystemIsolation =
  | { readonly kind: "descriptor-anchored" }
  | {
      readonly kind: "trusted-staging-boundary";
      /**
       * Controller-owned assertion that the stage root is, for the duration of
       * validation, neither writable nor link-attackable by untrusted parties.
       * Must be supplied by independent controller context; never by manifest
       * JSON, environment variables or candidate output.
       */
      readonly controller_assertion: "immutable-non-attacker-writable";
    };

export interface ManifestFilesystemOptions {
  readonly stage_root: string;
  /** Defaults to descriptor-anchored, which fails closed on unsupported platforms. */
  readonly isolation?: FilesystemIsolation;
}

export interface VerifiedArtifactRef {
  readonly ref: ArtifactRef;
  readonly resolved_path: string;
  readonly actual_size: number;
  readonly actual_sha256: string;
}

export interface ManifestFilesystemVerificationResult {
  readonly valid: true;
  readonly isolation_kind: FilesystemIsolation["kind"];
  readonly verified_refs: readonly VerifiedArtifactRef[];
}

const DIRECTORY_OPEN_FLAGS =
  fs.constants.O_RDONLY |
  fs.constants.O_NOFOLLOW |
  fs.constants.O_NONBLOCK |
  (fs.constants.O_DIRECTORY ?? 0);
const FILE_OPEN_FLAGS = fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK;
const HASH_CHUNK_BYTES = 64 * 1024;

let cachedProbe: DescriptorAnchoredProbeResult | null = null;

function probeAnchor(anchor: string): { ok: true } | { ok: false; detail: string } {
  let probeRoot: string | null = null;
  try {
    probeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "l3-anchor-probe-"));
    fs.mkdirSync(path.join(probeRoot, "child"));
    const rootFd = fs.openSync(probeRoot, DIRECTORY_OPEN_FLAGS);
    try {
      const childFd = fs.openSync(path.join(anchor, String(rootFd), "child"), DIRECTORY_OPEN_FLAGS);
      try {
        return fs.fstatSync(childFd).isDirectory()
          ? { ok: true }
          : { ok: false, detail: "anchored child is not a directory" };
      } finally {
        fs.closeSync(childFd);
      }
    } finally {
      fs.closeSync(rootFd);
    }
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  } finally {
    if (probeRoot !== null) {
      fs.rmSync(probeRoot, { recursive: true, force: true });
    }
  }
}

/**
 * Probe whether this platform can resolve a child through an open directory
 * descriptor. Verified empirically at runtime; the result is cached because
 * platform semantics do not change within a process.
 */
export function probeDescriptorAnchoredTraversal(): DescriptorAnchoredProbeResult {
  if (cachedProbe !== null) {
    return cachedProbe;
  }
  const candidates: { mechanism: DescriptorAnchorMechanism; anchor: string }[] =
    process.platform === "linux"
      ? [{ mechanism: "proc-self-fd", anchor: "/proc/self/fd" }]
      : [{ mechanism: "dev-fd", anchor: "/dev/fd" }];
  let detail = "no descriptor anchor directory is available on this platform";

  for (const candidate of candidates) {
    const outcome = probeAnchor(candidate.anchor);
    if (outcome.ok) {
      cachedProbe = {
        supported: true,
        mechanism: candidate.mechanism,
        detail: `descriptor-anchored traversal verified through ${candidate.anchor}`,
      };
      return cachedProbe;
    }
    detail = `${candidate.anchor}: ${outcome.detail}`;
  }
  cachedProbe = { supported: false, mechanism: null, detail };
  return cachedProbe;
}

function openNoFollow(openPath: string, flags: number, context: string): number {
  try {
    return fs.openSync(openPath, flags);
  } catch (error) {
    const errno = error as NodeJS.ErrnoException;
    switch (errno.code) {
      case "ELOOP":
        throw new Error(`Symbolic link rejected for ${context} (O_NOFOLLOW): ${openPath}`);
      case "ENOENT":
        throw new Error(`Missing referenced path component for ${context}: ${openPath}`);
      case "ENOTDIR":
        throw new Error(`Referenced path component is not a directory for ${context}: ${openPath}`);
      default:
        throw new Error(
          `Failed to open ${context}: ${errno.code ?? (error instanceof Error ? error.message : String(error))}`
        );
    }
  }
}

function closeQuietly(fd: number): void {
  try {
    fs.closeSync(fd);
  } catch {
    // Already closed; nothing to release.
  }
}

function openAnchoredArtifact(
  anchor: string,
  stageRoot: string,
  segments: readonly string[]
): number {
  let directoryFd = openNoFollow(stageRoot, DIRECTORY_OPEN_FLAGS, "trusted stage root");
  for (let i = 0; i < segments.length - 1; i += 1) {
    let nextFd: number;
    try {
      nextFd = openNoFollow(
        `${anchor}/${directoryFd}/${segments[i]}`,
        DIRECTORY_OPEN_FLAGS,
        `path component '${segments[i]}'`
      );
    } catch (error) {
      closeQuietly(directoryFd);
      throw error;
    }
    closeQuietly(directoryFd);
    directoryFd = nextFd;
  }
  try {
    return openNoFollow(
      `${anchor}/${directoryFd}/${segments[segments.length - 1]}`,
      FILE_OPEN_FLAGS,
      `artifact '${segments.join("/")}'`
    );
  } finally {
    closeQuietly(directoryFd);
  }
}

interface PathIdentity {
  readonly resolvedPath: string;
  readonly dev: number;
  readonly ino: number;
}

/**
 * Path-based walk that is only used with an explicit controller-asserted
 * staging boundary. Every component is lstat'ed without following links, the
 * final file is opened with O_NOFOLLOW|O_NONBLOCK and its descriptor identity is
 * compared with the pre-open lstat, and the whole ancestor chain is re-checked
 * after hashing so a mid-flight substitution is detected rather than trusted.
 */
function walkTrustedStaging(canonicalRoot: string, segments: readonly string[]): PathIdentity[] {
  const rootStat = fs.lstatSync(canonicalRoot);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error(`Trusted stage root must be a real directory: ${canonicalRoot}`);
  }
  const chain: PathIdentity[] = [
    { resolvedPath: canonicalRoot, dev: rootStat.dev, ino: rootStat.ino },
  ];
  let currentPath = canonicalRoot;
  for (let i = 0; i < segments.length; i += 1) {
    currentPath = path.join(currentPath, segments[i]);
    if (currentPath !== canonicalRoot && !currentPath.startsWith(canonicalRoot + path.sep)) {
      throw new Error(`Contained path escape detected: ${segments.join("/")}`);
    }
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(currentPath);
    } catch (error) {
      const errno = error as NodeJS.ErrnoException;
      throw new Error(
        `Missing referenced path component '${segments[i]}' (${errno.code ?? "unknown"}): ${currentPath}`
      );
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`Symbolic link rejected in path component '${segments[i]}': ${currentPath}`);
    }
    const isLast = i === segments.length - 1;
    if (!isLast && !stat.isDirectory()) {
      throw new Error(`Intermediate path component '${segments[i]}' is not a directory`);
    }
    chain.push({ resolvedPath: currentPath, dev: stat.dev, ino: stat.ino });
  }
  return chain;
}

function recheckTrustedStaging(chain: readonly PathIdentity[]): void {
  for (const entry of chain) {
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(entry.resolvedPath);
    } catch {
      throw new Error(`Staging path disappeared during verification: ${entry.resolvedPath}`);
    }
    if (stat.isSymbolicLink() || stat.dev !== entry.dev || stat.ino !== entry.ino) {
      throw new Error(`Staging path identity changed during verification: ${entry.resolvedPath}`);
    }
  }
}

function hashOpenArtifact(
  fd: number,
  ref: ArtifactRef,
  name: string
): { actual_size: number; actual_sha256: string } {
  const before = fs.fstatSync(fd);
  if (!before.isFile()) {
    throw new Error(`Artifact in ${name} must be a regular file: ${ref.path}`);
  }
  if (before.nlink !== 1) {
    throw new Error(`Hardlink rejected for ${name} at ${ref.path}: link count is ${before.nlink} (expected 1)`);
  }
  if (before.size !== ref.size) {
    throw new Error(
      `File size mismatch for ${name} at ${ref.path}: expected ${ref.size} bytes, got ${before.size} bytes`
    );
  }

  const hash = crypto.createHash("sha256");
  const buffer = Buffer.allocUnsafe(HASH_CHUNK_BYTES);
  let totalRead = 0;
  for (;;) {
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
    if (bytesRead === 0) {
      break;
    }
    totalRead += bytesRead;
    if (totalRead > ref.size) {
      throw new Error(
        `Artifact in ${name} at ${ref.path} grew beyond the frozen size ${ref.size} while hashing`
      );
    }
    hash.update(buffer.subarray(0, bytesRead));
  }
  if (totalRead !== ref.size) {
    throw new Error(
      `Read byte count ${totalRead} did not match frozen size ${ref.size} for ${name} at ${ref.path}`
    );
  }

  const actual_sha256 = hash.digest("hex");
  if (actual_sha256 !== ref.sha256) {
    throw new Error(
      `File integrity hash mismatch for ${name} at ${ref.path}: expected ${ref.sha256}, got ${actual_sha256}`
    );
  }

  const after = fs.fstatSync(fd);
  if (after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size) {
    throw new Error(`Artifact identity changed while hashing for ${name} at ${ref.path}`);
  }

  return { actual_size: before.size, actual_sha256 };
}

/**
 * Verify every referenced artifact against the frozen manifest, binding actual
 * bytes, sizes and containment. Never executes or imports an artifact.
 */
export function validateManifestFilesystem(
  manifest: L3Manifest,
  options: ManifestFilesystemOptions
): ManifestFilesystemVerificationResult {
  if (typeof options?.stage_root !== "string" || options.stage_root.length === 0) {
    throw new Error("validateManifestFilesystem requires a stage_root from controller context");
  }
  const isolation: FilesystemIsolation = options.isolation ?? { kind: "descriptor-anchored" };

  const refsToVerify: { name: string; ref: ArtifactRef }[] = [];
  for (const arm of PROTOCOL_ARMS) {
    const armSource = manifest.arm_sources?.[arm];
    if (armSource === undefined) {
      throw new Error(`Manifest is missing arm source '${arm}'`);
    }
    refsToVerify.push({ name: `arm_sources.${arm}.artifact_ref`, ref: armSource.artifact_ref });
  }
  refsToVerify.push({
    name: "generation_contract.prompts_ref",
    ref: manifest.generation_contract.prompts_ref,
  });
  refsToVerify.push({ name: "driver_bundle.bundle_ref", ref: manifest.driver_bundle.bundle_ref });

  const canonicalRoot = fs.realpathSync(options.stage_root);
  const verifiedRefs: VerifiedArtifactRef[] = [];
  const memo = new Map<string, { actual_size: number; actual_sha256: string }>();

  let anchor: string | null = null;
  if (isolation.kind === "descriptor-anchored") {
    const probe = probeDescriptorAnchoredTraversal();
    if (!probe.supported || probe.mechanism === null) {
      throw new Error(
        `Descriptor-anchored artifact traversal is unavailable on this platform (${probe.detail}). Refusing a path-based fallback; supply an explicit controller-asserted 'trusted-staging-boundary' isolation instead.`
      );
    }
    anchor = probe.mechanism === "proc-self-fd" ? "/proc/self/fd" : "/dev/fd";
  } else if (isolation.controller_assertion !== "immutable-non-attacker-writable") {
    throw new Error(
      "trusted-staging-boundary isolation requires the explicit 'immutable-non-attacker-writable' controller assertion"
    );
  }

  for (const item of refsToVerify) {
    const segments = validateContainedRelativePath(item.ref.path, item.name).split("/");
    const memoKey = `${item.ref.path}\u0000${item.ref.sha256}\u0000${item.ref.size}`;
    const cached = memo.get(memoKey);
    if (cached !== undefined) {
      verifiedRefs.push({
        ref: item.ref,
        resolved_path: path.join(canonicalRoot, ...segments),
        actual_size: cached.actual_size,
        actual_sha256: cached.actual_sha256,
      });
      continue;
    }

    let result: { actual_size: number; actual_sha256: string };

    if (anchor !== null) {
      const fd = openAnchoredArtifact(anchor, canonicalRoot, segments);
      try {
        result = hashOpenArtifact(fd, item.ref, item.name);
      } finally {
        closeQuietly(fd);
      }
    } else {
      const chain = walkTrustedStaging(canonicalRoot, segments);
      const resolvedPath = path.join(canonicalRoot, ...segments);
      const fd = openNoFollow(resolvedPath, FILE_OPEN_FLAGS, item.name);
      try {
        const opened = fs.fstatSync(fd);
        const expected = chain[chain.length - 1];
        if (opened.dev !== expected.dev || opened.ino !== expected.ino) {
          throw new Error(`Staging path was substituted between check and open for ${item.name}: ${resolvedPath}`);
        }
        result = hashOpenArtifact(fd, item.ref, item.name);
      } finally {
        closeQuietly(fd);
      }
      recheckTrustedStaging(chain);
    }

    memo.set(memoKey, result);
    verifiedRefs.push({
      ref: item.ref,
      resolved_path: path.join(canonicalRoot, ...segments),
      actual_size: result.actual_size,
      actual_sha256: result.actual_sha256,
    });
  }

  return { valid: true, isolation_kind: isolation.kind, verified_refs: verifiedRefs };
}
