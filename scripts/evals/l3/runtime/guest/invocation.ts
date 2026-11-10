/**
 * scripts/evals/l3/runtime/guest/invocation.ts
 *
 * Strict guest-side verification of the frozen `attempt.json` invocation.
 *
 * The host validates the object before staging, but the guest never trusts that:
 * it re-validates the exact own-field schema, recomputes the derived
 * `attempt_id`, checks the manifest digest of the bytes actually staged, checks
 * the frozen seed and requires the descriptor to be the exact entry at
 * `attempt_index` in the deterministic frozen sequence.
 */

import { createHash } from "node:crypto";
import { strictObject, validateId, validateNat } from "../../contracts.js";
import {
  buildAttemptSequence,
  validateManifestStructure,
  type AttemptDescriptor as ManifestDescriptor,
  type L3Manifest,
} from "../../manifest.js";

export type AttemptPhase = "build" | "run";

export interface AttemptInvocation {
  readonly version: 1;
  readonly protocol: "artifact-v1";
  readonly run_id: string;
  readonly manifest_sha256: string;
  readonly attempt_id: string;
  readonly attempt_index: number;
  readonly case_id: "payment" | "tenant" | "overload";
  readonly arm_id: "A0" | "A1" | "A2";
  readonly repetition: number;
  readonly seed: number;
  readonly phase: AttemptPhase;
}

const SHA256_HEX = /^[0-9a-f]{64}$/;
const ATTEMPT_KEYS = [
  "version",
  "protocol",
  "run_id",
  "manifest_sha256",
  "attempt_id",
  "attempt_index",
  "case_id",
  "arm_id",
  "repetition",
  "seed",
  "phase",
] as const;

/** Deterministic D2-derived identity: it never aliases a D1 descriptor field. */
export function deriveAttemptId(manifestSha256: string, runId: string, attemptIndex: number): string {
  if (!SHA256_HEX.test(manifestSha256)) {
    throw new Error("manifest digest must be 64 lowercase hex characters");
  }
  const validatedRunId = validateId(runId, "run_id");
  const validatedAttemptIndex = validateNat(attemptIndex, "attempt_index");
  return createHash("sha256")
    .update(
      JSON.stringify(["artifact-v1-attempt", manifestSha256, validatedRunId, validatedAttemptIndex]),
      "utf8",
    )
    .digest("hex");
}

/** Parses the attempt object without trusting any inherited or extra field. */
export function parseAttemptJson(raw: unknown): AttemptInvocation {
  const record = strictObject(raw, "attempt.json", ATTEMPT_KEYS);
  if (record.version !== 1) throw new Error("attempt.json version must be 1");
  if (record.protocol !== "artifact-v1") throw new Error("attempt.json protocol must be artifact-v1");
  const runId = validateId(record.run_id, "run_id");
  if (typeof record.manifest_sha256 !== "string" || !SHA256_HEX.test(record.manifest_sha256)) {
    throw new Error("attempt.json manifest_sha256 must be 64 lowercase hex characters");
  }
  if (typeof record.attempt_id !== "string" || !SHA256_HEX.test(record.attempt_id)) {
    throw new Error("attempt.json attempt_id must be 64 lowercase hex characters");
  }
  const attemptIndex = validateNat(record.attempt_index, "attempt_index");
  const caseId = record.case_id;
  if (caseId !== "payment" && caseId !== "tenant" && caseId !== "overload") {
    throw new Error(`attempt.json case_id is not a frozen case: ${String(caseId)}`);
  }
  const armId = record.arm_id;
  if (armId !== "A0" && armId !== "A1" && armId !== "A2") {
    throw new Error(`attempt.json arm_id is not a frozen arm: ${String(armId)}`);
  }
  const repetition = validateNat(record.repetition, "repetition");
  const seed = validateNat(record.seed, "seed");
  const phase = record.phase;
  if (phase !== "build" && phase !== "run") throw new Error(`attempt.json phase is invalid: ${String(phase)}`);

  const derived = deriveAttemptId(record.manifest_sha256, runId, attemptIndex);
  if (derived !== record.attempt_id) {
    throw new Error("attempt.json attempt_id does not match its derived identity");
  }
  return Object.freeze({
    version: 1,
    protocol: "artifact-v1",
    run_id: runId,
    manifest_sha256: record.manifest_sha256,
    attempt_id: derived,
    attempt_index: attemptIndex,
    case_id: caseId,
    arm_id: armId,
    repetition,
    seed,
    phase,
  });
}

function descriptorKey(descriptor: Pick<ManifestDescriptor, "attempt_index" | "case_id" | "arm_id" | "repetition">): string {
  return `${descriptor.attempt_index}/${descriptor.case_id}/${descriptor.arm_id}/${descriptor.repetition}`;
}

export interface VerifiedInvocation {
  readonly invocation: AttemptInvocation;
  readonly manifest: L3Manifest;
}

/**
 * Bootstrap boundary used by the guest entrypoint: derives the observed manifest
 * digest from the staged bytes, then binds the staged attempt to it. Callers
 * never supply the digest that is checked.
 */
export function verifyStagedInvocation(
  entries: readonly { readonly name: string; readonly data: Buffer }[],
  nowMs: number,
): VerifiedInvocation {
  const attemptEntry = entries.find((entry) => entry.name === "attempt.json");
  const manifestEntry = entries.find((entry) => entry.name === "manifest.json");
  if (attemptEntry === undefined) throw new Error("input bundle is missing attempt.json");
  if (manifestEntry === undefined) throw new Error("input bundle is missing manifest.json");
  let attemptRaw: unknown;
  try {
    attemptRaw = JSON.parse(attemptEntry.data.toString("utf8"));
  } catch {
    throw new Error("attempt.json is not valid JSON");
  }
  const manifestSha256 = createHash("sha256").update(manifestEntry.data).digest("hex");
  return verifyInvocationBinding(attemptRaw, manifestEntry.data, manifestSha256, nowMs);
}

/**
 * Binds the staged attempt to the staged manifest bytes and the frozen plan:
 * digest match, exact descriptor membership and entry position, and frozen seed.
 */
export function verifyInvocationBinding(
  rawAttempt: unknown,
  manifestBytes: Buffer,
  observedManifestSha256: string,
  nowMs: number,
): VerifiedInvocation {
  const invocation = parseAttemptJson(rawAttempt);
  const manifestDigest = createHash("sha256").update(manifestBytes).digest("hex");
  if (manifestDigest !== observedManifestSha256) {
    throw new Error("staged manifest bytes do not match the declared manifest digest");
  }
  if (manifestDigest !== invocation.manifest_sha256) {
    throw new Error("attempt.json manifest_sha256 does not match the staged manifest");
  }
  let manifestRaw: unknown;
  try {
    manifestRaw = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    throw new Error("staged manifest is not valid JSON");
  }
  const manifest = validateManifestStructure(manifestRaw, { now: () => nowMs });
  if (manifest.run_id !== invocation.run_id) {
    throw new Error("attempt.json run_id does not match the frozen manifest");
  }
  if (manifest.attempt_plan.seed !== invocation.seed) {
    throw new Error("attempt.json seed does not match the frozen plan seed");
  }
  const frozen = buildAttemptSequence(manifest.attempt_plan);
  const entry = frozen[invocation.attempt_index];
  if (entry === undefined || descriptorKey(entry) !== descriptorKey(invocation)) {
    throw new Error("attempt.json descriptor is not the exact frozen sequence entry for its index");
  }
  return { invocation, manifest };
}
