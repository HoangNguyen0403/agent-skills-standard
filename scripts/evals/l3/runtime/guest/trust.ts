/**
 * scripts/evals/l3/runtime/guest/trust.ts
 *
 * Trusted review custody for per-artifact observers and stage correspondence.
 *
 * A review is trusted only when it satisfies *all* of the following, evaluated
 * against facts the controller recomputes for itself:
 *
 * 1. the custodian's public key comes from the packaged read-only guest image,
 *    never from the candidate bundle or from the reviewed artifact itself;
 * 2. the signature verifies over a domain-separated payload that also covers the
 *    reviewer's approval statement, so a signature cannot be transplanted onto a
 *    different claim;
 * 3. the payload's `run_id`/`attempt_id` equal the staged invocation identity;
 * 4. the payload binds the *recomputed* digests of the candidate executable, the
 *    program whose behaviour is being vouched for, and the reviewed artifact
 *    bytes themselves;
 * 5. the custody window is bounded and contains the actual clock reading.
 *
 * Any missing field is a refusal. There is no unsigned path and no default.
 */

import { createHash, createPublicKey, verify as cryptoVerify, type KeyObject } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const MAX_REVIEW_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;
export const SHA256_HEX = /^[0-9a-f]{64}$/;
export const ED25519_SIG_HEX = /^[0-9a-f]{128}$/;

export interface ReviewCustody {
  readonly version: 1;
  readonly run_id: string;
  readonly attempt_id: string;
  readonly executable_sha256: string;
  readonly program_sha256: string;
  readonly artifact_sha256: string;
  readonly custodian: string;
  readonly issued_at: string;
  readonly expires_at: string;
  readonly signature: string;
}

/** Facts the controller trusts without consulting the reviewed artifact. */
export interface ReviewTrustAnchor {
  /** Domain tag, e.g. `l3-queue-observer-review-v2`. */
  readonly domain: string;
  readonly run_id: string;
  readonly attempt_id: string;
  readonly custodian_keys: ReadonlyMap<string, KeyObject>;
  readonly now_epoch_ms: () => number;
}

/** Digests the controller recomputed for itself, plus the signed approval text. */
export interface ReviewBindings {
  readonly executable_sha256: string;
  readonly program_sha256: string;
  readonly artifact_sha256: string;
  readonly approval_reason: string;
}

export interface ReviewVerification {
  readonly valid: boolean;
  readonly reason: string | null;
}

export function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function reviewPayload(
  domain: string,
  custody: Omit<ReviewCustody, "signature">,
  approvalReason: string,
): string {
  return [
    custody.version,
    domain,
    custody.run_id,
    custody.attempt_id,
    custody.executable_sha256,
    custody.program_sha256,
    custody.artifact_sha256,
    custody.custodian,
    custody.issued_at,
    custody.expires_at,
    approvalReason,
  ].join("\n");
}

export function verifyReviewCustody(
  custody: ReviewCustody,
  anchor: ReviewTrustAnchor,
  bindings: ReviewBindings,
): ReviewVerification {
  if (custody.version !== 1) return { valid: false, reason: "review custody version must be 1" };
  for (const [field, value] of [
    ["executable", custody.executable_sha256],
    ["program", custody.program_sha256],
    ["artifact", custody.artifact_sha256],
  ] as const) {
    if (typeof value !== "string" || !SHA256_HEX.test(value)) {
      return { valid: false, reason: `review custody ${field} digest is not canonical` };
    }
  }
  if (!ED25519_SIG_HEX.test(custody.signature)) {
    return { valid: false, reason: "review custody signature is not a canonical ed25519 signature" };
  }
  if (custody.run_id !== anchor.run_id) {
    return { valid: false, reason: `review custody run_id mismatch: reviewed ${custody.run_id}, actual ${anchor.run_id}` };
  }
  if (custody.attempt_id !== anchor.attempt_id) {
    return {
      valid: false,
      reason: `review custody attempt_id mismatch: reviewed ${custody.attempt_id}, actual ${anchor.attempt_id}`,
    };
  }
  if (custody.executable_sha256 !== bindings.executable_sha256) {
    return {
      valid: false,
      reason: `review custody executable digest mismatch: reviewed ${custody.executable_sha256}, actual ${bindings.executable_sha256}`,
    };
  }
  if (custody.program_sha256 !== bindings.program_sha256) {
    return {
      valid: false,
      reason: `review custody program digest mismatch: reviewed ${custody.program_sha256}, actual ${bindings.program_sha256}`,
    };
  }
  if (custody.artifact_sha256 !== bindings.artifact_sha256) {
    return {
      valid: false,
      reason: `review custody artifact digest mismatch: reviewed ${custody.artifact_sha256}, actual ${bindings.artifact_sha256}`,
    };
  }
  const key = anchor.custodian_keys.get(custody.custodian);
  if (key === undefined) {
    return { valid: false, reason: `no trusted public key for custodian '${custody.custodian}'` };
  }
  const issuedAt = Date.parse(custody.issued_at);
  const expiresAt = Date.parse(custody.expires_at);
  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt)) {
    return { valid: false, reason: "review custody window is not a pair of valid timestamps" };
  }
  if (expiresAt <= issuedAt) return { valid: false, reason: "review custody window is empty or inverted" };
  if (expiresAt - issuedAt > MAX_REVIEW_VALIDITY_MS) {
    return { valid: false, reason: "review custody window exceeds the maximum validity" };
  }
  const now = anchor.now_epoch_ms();
  if (now < issuedAt) return { valid: false, reason: "review custody was issued after the actual clock reading" };
  if (now > expiresAt) return { valid: false, reason: "review custody has expired" };
  const payload = reviewPayload(anchor.domain, custody, bindings.approval_reason);
  let verified = false;
  try {
    verified = cryptoVerify(null, Buffer.from(payload, "utf8"), key, Buffer.from(custody.signature, "hex"));
  } catch {
    return { valid: false, reason: "review custody signature could not be verified" };
  }
  return verified ? { valid: true, reason: null } : { valid: false, reason: "review custody signature verification failed" };
}

/**
 * Loads the custodian public keys shipped inside the packaged (read-only) guest
 * image. The candidate bundle cannot influence this directory.
 */
export async function loadCustodianKeys(directory: string): Promise<ReadonlyMap<string, KeyObject>> {
  const keys = new Map<string, KeyObject>();
  let names: string[];
  try {
    names = await readdir(directory);
  } catch {
    return keys;
  }
  for (const name of names.sort()) {
    if (!name.endsWith(".pub")) continue;
    const custodian = name.slice(0, -".pub".length);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(custodian)) continue;
    const pem = await readFile(path.join(directory, name), "utf8");
    try {
      const key = createPublicKey(pem);
      if (key.asymmetricKeyType !== "ed25519") continue;
      keys.set(custodian, key);
    } catch {
      // An unparsable key is not a trusted custodian; it is simply absent.
    }
  }
  return keys;
}

/** Digest of the actual program bytes whose behaviour a review vouches for. */
export async function programDigest(filePath: string): Promise<string | null> {
  try {
    return sha256Hex(await readFile(filePath));
  } catch {
    return null;
  }
}
