/**
 * scripts/evals/l3/runtime/authority.ts
 *
 * Independent host capability verification.
 *
 * The verifier holds public keys only and can therefore never mint a capability
 * it would accept; issuance belongs to host integration outside this module.
 * A capability is bound to one action, one attempt descriptor, one run and the
 * exact manifest digest, and is only valid inside its trusted-clock window.
 *
 * JSON fields and environment variables are inert data here. Nothing in this
 * module reads `process.env`, files, or manifest approval strings.
 */

import { verify as cryptoVerify, type KeyObject } from "node:crypto";
import { strictObject, validateId, validateNat } from "../contracts";
import {
  PRIVILEGED_ACTIONS,
  RUNTIME_TOPOLOGY,
  type CapabilityExpectation,
  type DeletionApprovalTarget,
  type DeletionApprovalVerifier,
  type HostCapabilityToken,
  type HostCapabilityVerifier,
  type PreparedImageFile,
  type PreparedImages,
  type PreparedImagesApprovalTarget,
  type PreparedImagesApprovalVerifier,
  type PrivilegedAction,
  type VerifyDecision,
} from "./types";

const SHA256_HEX = /^[0-9a-f]{64}$/;
const ED25519_SIGNATURE_HEX = /^[0-9a-f]{128}$/;
const CANONICAL_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const TOKEN_KEYS = [
  "run_id",
  "manifest_sha256",
  "attempt_index",
  "case_id",
  "arm_id",
  "action",
  "custodian",
  "issued_at",
  "expires_at",
  "topology",
  "signature",
] as const;

export interface CustodianPublicKey {
  readonly custodian: string;
  readonly publicKey: KeyObject;
}

/**
 * Canonical byte string both issuer and verifier sign.
 * Field order is fixed; no sorting or locale-dependent formatting is involved.
 */
export function capabilityPayload(token: Omit<HostCapabilityToken, "signature">): string {
  return [
    "l3-host-capability-v1",
    token.run_id,
    token.manifest_sha256,
    String(token.attempt_index),
    token.case_id,
    token.arm_id,
    token.action,
    token.custodian,
    token.issued_at,
    token.expires_at,
    token.topology,
  ].join("\n");
}

function parseCanonicalUtc(value: unknown, field: string): number {
  if (typeof value !== "string" || !CANONICAL_UTC.test(value)) {
    throw new Error(`${field} must be a canonical UTC timestamp`);
  }
  const millis = Date.parse(value);
  if (!Number.isSafeInteger(millis) || new Date(millis).toISOString() !== value) {
    throw new Error(`${field} is not a real calendar instant`);
  }
  return millis;
}

export class Ed25519CapabilityVerifier implements HostCapabilityVerifier {
  private readonly keys: ReadonlyMap<string, KeyObject>;

  constructor(custodians: readonly CustodianPublicKey[]) {
    if (custodians.length === 0) {
      throw new Error("At least one custodian public key is required");
    }
    const keys = new Map<string, KeyObject>();
    for (const entry of custodians) {
      if (entry.custodian.length === 0) throw new Error("Custodian name must be non-empty");
      if (keys.has(entry.custodian)) throw new Error(`Duplicate custodian public key: ${entry.custodian}`);
      keys.set(entry.custodian, entry.publicKey);
    }
    this.keys = keys;
  }

  verify(token: unknown, expected: CapabilityExpectation, nowMs: number): VerifyDecision {
    if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
      return { valid: false, reason: "Injected clock must be a positive safe integer" };
    }

    let t: Record<string, unknown>;
    try {
      t = strictObject(token, "HostCapabilityToken", TOKEN_KEYS);
    } catch (error) {
      return { valid: false, reason: `Malformed capability token: ${reasonOf(error)}` };
    }

    try {
      const runId = validateId(t.run_id, "run_id");
      if (typeof t.manifest_sha256 !== "string" || !SHA256_HEX.test(t.manifest_sha256)) {
        throw new Error("manifest_sha256 must be 64 lowercase hex characters");
      }
      const attemptIndex = validateNat(t.attempt_index, "attempt_index");
      const caseId = validateId(t.case_id, "case_id");
      const armId = validateId(t.arm_id, "arm_id");
      if (typeof t.action !== "string" || !(PRIVILEGED_ACTIONS as readonly string[]).includes(t.action)) {
        throw new Error(`Unknown privileged action: ${String(t.action)}`);
      }
      const action = t.action as PrivilegedAction;
      const custodian = validateId(t.custodian, "custodian");
      const issuedMs = parseCanonicalUtc(t.issued_at, "issued_at");
      const expiresMs = parseCanonicalUtc(t.expires_at, "expires_at");
      if (expiresMs <= issuedMs) throw new Error("expires_at must be after issued_at");
      if (t.topology !== RUNTIME_TOPOLOGY) throw new Error(`Unauthorized runtime topology: ${String(t.topology)}`);
      if (typeof t.signature !== "string" || !ED25519_SIGNATURE_HEX.test(t.signature)) {
        throw new Error("signature must be 128 lowercase hex characters");
      }

      if (runId !== expected.run_id) throw new Error("Token run_id does not match the expected run");
      if (t.manifest_sha256 !== expected.manifest_sha256) {
        throw new Error("Token manifest_sha256 does not match the expected manifest");
      }
      if (attemptIndex !== expected.attempt_index) throw new Error("Token attempt_index does not match");
      if (caseId !== expected.case_id) throw new Error("Token case_id does not match");
      if (armId !== expected.arm_id) throw new Error("Token arm_id does not match");
      if (action !== expected.action) throw new Error("Token action does not match the requested action");

      if (nowMs < issuedMs) throw new Error("Host capability is not yet valid");
      if (nowMs >= expiresMs) throw new Error("Host capability has expired");

      const publicKey = this.keys.get(custodian);
      if (publicKey === undefined) throw new Error(`Unknown or unauthenticated custodian: ${custodian}`);

      const payload = capabilityPayload({
        run_id: runId,
        manifest_sha256: t.manifest_sha256,
        attempt_index: attemptIndex,
        case_id: caseId,
        arm_id: armId,
        action,
        custodian,
        issued_at: t.issued_at as string,
        expires_at: t.expires_at as string,
        topology: RUNTIME_TOPOLOGY,
      });

      const signature = Buffer.from(t.signature, "hex");
      if (!cryptoVerify(null, Buffer.from(payload, "utf8"), publicKey, signature)) {
        throw new Error("Ed25519 signature verification failed");
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: reasonOf(error) };
    }
  }
}

export interface DeletionApprovalToken extends DeletionApprovalTarget {
  readonly custodian: string;
  readonly issued_at: string;
  readonly expires_at: string;
  readonly signature: string;
}

export function deletionApprovalPayload(token: Omit<DeletionApprovalToken, "signature">): string {
  return [
    "l3-deletion-approval-v1",
    token.run_id,
    token.manifest_sha256,
    String(token.attempt_index),
    token.collection_id,
    token.retained_disk_sha256,
    token.custodian,
    token.issued_at,
    token.expires_at,
  ].join("\n");
}

export class Ed25519DeletionApprovalVerifier implements DeletionApprovalVerifier {
  private readonly keys: ReadonlyMap<string, KeyObject>;

  constructor(custodians: readonly CustodianPublicKey[]) {
    const keys = new Map<string, KeyObject>();
    for (const entry of custodians) {
      if (entry.custodian.length === 0) throw new Error("Custodian name must be non-empty");
      if (keys.has(entry.custodian)) throw new Error(`Duplicate custodian public key: ${entry.custodian}`);
      keys.set(entry.custodian, entry.publicKey);
    }
    this.keys = keys;
  }

  verify(token: unknown, expected: DeletionApprovalTarget, nowMs: number): VerifyDecision {
    if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
      return { valid: false, reason: "Injected clock must be a positive safe integer" };
    }
    let t: Record<string, unknown>;
    try {
      t = strictObject(token, "DeletionApprovalToken", [
        "run_id",
        "manifest_sha256",
        "attempt_index",
        "collection_id",
        "retained_disk_sha256",
        "custodian",
        "issued_at",
        "expires_at",
        "signature",
      ]);
    } catch (error) {
      return { valid: false, reason: `Malformed deletion token: ${reasonOf(error)}` };
    }
    try {
      const runId = validateId(t.run_id, "run_id");
      if (typeof t.manifest_sha256 !== "string" || !SHA256_HEX.test(t.manifest_sha256)) {
        throw new Error("manifest_sha256 must be 64 lowercase hex characters");
      }
      const attemptIndex = validateNat(t.attempt_index, "attempt_index");
      const collectionId = validateId(t.collection_id, "collection_id");
      if (typeof t.retained_disk_sha256 !== "string" || !SHA256_HEX.test(t.retained_disk_sha256)) {
        throw new Error("retained_disk_sha256 must be 64 lowercase hex characters");
      }
      const custodian = validateId(t.custodian, "custodian");
      const issuedMs = parseCanonicalUtc(t.issued_at, "issued_at");
      const expiresMs = parseCanonicalUtc(t.expires_at, "expires_at");
      if (expiresMs <= issuedMs) throw new Error("expires_at must be after issued_at");
      if (typeof t.signature !== "string" || !ED25519_SIGNATURE_HEX.test(t.signature)) {
        throw new Error("signature must be 128 lowercase hex characters");
      }

      if (runId !== expected.run_id) throw new Error("Deletion token run_id does not match");
      if (t.manifest_sha256 !== expected.manifest_sha256) throw new Error("Deletion token manifest_sha256 does not match");
      if (attemptIndex !== expected.attempt_index) throw new Error("Deletion token attempt_index does not match");
      if (collectionId !== expected.collection_id) throw new Error("Deletion token collection_id does not match");
      if (t.retained_disk_sha256 !== expected.retained_disk_sha256) throw new Error("Deletion token retained_disk_sha256 does not match");

      if (nowMs < issuedMs) throw new Error("Deletion capability is not yet valid");
      if (nowMs >= expiresMs) throw new Error("Deletion capability has expired");

      const publicKey = this.keys.get(custodian);
      if (publicKey === undefined) throw new Error(`Unknown or unauthenticated custodian: ${custodian}`);

      const payload = deletionApprovalPayload({
        run_id: runId,
        manifest_sha256: t.manifest_sha256,
        attempt_index: attemptIndex,
        collection_id: collectionId,
        retained_disk_sha256: t.retained_disk_sha256,
        custodian,
        issued_at: t.issued_at as string,
        expires_at: t.expires_at as string,
      });

      const signature = Buffer.from(t.signature, "hex");
      if (!cryptoVerify(null, Buffer.from(payload, "utf8"), publicKey, signature)) {
        throw new Error("Ed25519 deletion approval signature verification failed");
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: reasonOf(error) };
    }
  }
}

export function preparedImagesApprovalPayload(
  images: PreparedImages,
  runId: string,
  manifestSha256: string,
  custodian: string,
  issuedAt: string,
  expiresAt: string,
): string {
  const files: readonly [string, PreparedImageFile][] = [
    ["kernel", images.kernel],
    ["initrd", images.initrd],
    ["rootfs", images.rootfs],
    ["guest_programs.controller", images.guest_programs.controller],
    ["guest_programs.collector", images.guest_programs.collector],
    ["driver_tree", images.driver_tree],
  ];
  const lines = [
    "l3-prepared-images-approval-v2",
    runId,
    manifestSha256,
    images.topology,
    images.arch ?? "aarch64",
  ];
  for (const [label, fact] of files) {
    lines.push(label, fact.sha256, String(fact.bytes));
  }
  lines.push(
    "docker_engine",
    images.docker.docker_engine_sha256,
    "node_image",
    images.docker.node_image_sha256,
    "offline_bundle",
    images.docker.offline_bundle_sha256,
    "node_version",
    images.runtime.node_version,
    "docker_version",
    images.runtime.docker_version,
    custodian,
    issuedAt,
    expiresAt,
  );
  return lines.join("\n");
}

export class Ed25519PreparedImagesApprovalVerifier implements PreparedImagesApprovalVerifier {
  private readonly keys: ReadonlyMap<string, KeyObject>;

  constructor(custodians: readonly CustodianPublicKey[]) {
    if (custodians.length === 0) {
      throw new Error("At least one custodian public key is required for image approval");
    }
    const keys = new Map<string, KeyObject>();
    for (const entry of custodians) {
      if (entry.custodian.length === 0) throw new Error("Custodian name must be non-empty");
      if (keys.has(entry.custodian)) throw new Error(`Duplicate custodian public key: ${entry.custodian}`);
      keys.set(entry.custodian, entry.publicKey);
    }
    this.keys = keys;
  }

  verify(token: unknown, expected: PreparedImagesApprovalTarget, nowMs: number): VerifyDecision {
    if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
      return { valid: false, reason: "Injected clock must be a positive safe integer" };
    }
    let t: Record<string, unknown>;
    try {
      t = strictObject(token, "PreparedImagesApproval", [
        "run_id",
        "manifest_sha256",
        "custodian",
        "issued_at",
        "expires_at",
        "signature",
      ]);
    } catch (error) {
      return { valid: false, reason: `Malformed prepared-images approval: ${reasonOf(error)}` };
    }
    try {
      const runId = validateId(t.run_id, "run_id");
      if (typeof t.manifest_sha256 !== "string" || !SHA256_HEX.test(t.manifest_sha256)) {
        throw new Error("manifest_sha256 must be 64 lowercase hex characters");
      }
      const custodian = validateId(t.custodian, "custodian");
      const issuedMs = parseCanonicalUtc(t.issued_at, "issued_at");
      const expiresMs = parseCanonicalUtc(t.expires_at, "expires_at");
      if (expiresMs <= issuedMs) throw new Error("expires_at must be after issued_at");
      if (typeof t.signature !== "string" || !ED25519_SIGNATURE_HEX.test(t.signature)) {
        throw new Error("signature must be 128 lowercase hex characters");
      }
      if (runId !== expected.run_id) throw new Error("Approval run_id does not match the run");
      if (t.manifest_sha256 !== expected.manifest_sha256) {
        throw new Error("Approval manifest_sha256 does not match the frozen manifest");
      }
      if (nowMs < issuedMs) throw new Error("Prepared-images approval is not yet valid");
      if (nowMs >= expiresMs) throw new Error("Prepared-images approval has expired");

      const publicKey = this.keys.get(custodian);
      if (publicKey === undefined) throw new Error(`Unknown or unauthenticated custodian: ${custodian}`);

      const payload = preparedImagesApprovalPayload(
        expected.images,
        runId,
        t.manifest_sha256,
        custodian,
        t.issued_at as string,
        t.expires_at as string,
      );
      const signature = Buffer.from(t.signature, "hex");
      if (!cryptoVerify(null, Buffer.from(payload, "utf8"), publicKey, signature)) {
        throw new Error("Ed25519 prepared-images approval signature verification failed");
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: reasonOf(error) };
    }
  }
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
