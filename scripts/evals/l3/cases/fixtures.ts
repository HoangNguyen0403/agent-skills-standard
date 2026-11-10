import type { Id, TenantDoc, TenantItem } from "../contracts.js";

/**
 * scripts/evals/l3/cases/fixtures.ts
 *
 * Trusted synthetic dataset and deterministic byte generation for the L3 case
 * drivers. Every document carries a unique content canary so that a leaked,
 * duplicated or resurrected item is detectable by content, not by a
 * candidate-supplied owner label.
 */

export const TENANT_A: Id = "tenant-alpha";
export const TENANT_B: Id = "tenant-beta";
export const TENANT_UNAUTHORIZED: Id = "tenant-unauthorized";

export const CANARY_A1: TenantDoc = {
  document_id: "doc-a1-canary",
  owner: TENANT_A,
  content: "ALPHA_SECRET_TOKEN_A1_77a90f3c834011ea",
};

export const CANARY_B1: TenantDoc = {
  document_id: "doc-b1-canary",
  owner: TENANT_B,
  content: "BETA_SECRET_TOKEN_B1_88b10f2d945122fb",
};

/** Trusted source dataset, keyed by document ID. */
export const TRUSTED_DOCUMENTS: ReadonlyMap<Id, TenantDoc> = new Map([
  [CANARY_A1.document_id, CANARY_A1],
  [CANARY_B1.document_id, CANARY_B1],
]);

/** Documents a correctly operating candidate must expose to tenant A before revocation. */
export const EXPECTED_ITEMS_A_PRE_REVOKE: readonly TenantItem[] = [CANARY_A1];

/** Documents a correctly operating candidate must expose to tenant B. */
export const EXPECTED_ITEMS_B: readonly TenantItem[] = [CANARY_B1];

/** Null-or-nothing expectation after the A1 revocation linearization boundary. */
export const EXPECTED_ITEMS_A_POST_REVOKE: readonly TenantItem[] = [];

/**
 * Deterministic synthetic message payload. The bytes are actually allocated by
 * the driver and cross the candidate boundary; only the byte count is on the
 * frozen wire schema.
 */
export function generateSyntheticMessageBytes(messageId: string, byteCount: number): Buffer {
  if (!Number.isSafeInteger(byteCount) || byteCount <= 0) {
    throw new Error(`synthetic byte count must be a positive integer, got ${byteCount}`);
  }
  const buf = Buffer.alloc(byteCount);
  const prefix = Buffer.from(`MSG:${messageId}:`, "utf8");
  prefix.copy(buf, 0, 0, Math.min(prefix.length, byteCount));
  for (let i = prefix.length; i < byteCount; i++) {
    buf[i] = (i ^ 0x5a) & 0xff;
  }
  return buf;
}
