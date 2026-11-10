/**
 * scripts/evals/l3/cases/bounds.ts
 *
 * Fixed evidence bounds for D3 verdicts. These numbers are part of the D3
 * evidence contract (D3-runtime-contract.md): D2 derives its evidence size
 * algebra from them.
 *
 * Reason lists are candidate-influenced: driver failure text embeds candidate
 * error messages, ids and reply fields. A hostile candidate must not be able to
 * grow a verdict, so every reason list is capped and every reason string is
 * truncated by UTF-8 byte length, with an explicit marker and an exact count of
 * the true total.
 */
import type { Nat } from "../contracts.js";

/** Maximum reasons kept in a single verdict reason list. */
export const MAX_VERDICT_REASONS = 64;

/** Maximum UTF-8 byte length of one reason string, marker included. */
export const MAX_REASON_BYTES = 256;

/** Appended to a truncated reason so truncation is never silent. */
export const REASON_TRUNCATION_MARKER = "…[truncated]";

export interface BoundedReasons {
  /** At most `MAX_VERDICT_REASONS` reasons, each at most `MAX_REASON_BYTES` UTF-8 bytes. */
  readonly reasons: readonly string[];
  /** Exact total before capping. */
  readonly count: Nat;
}

const MARKER_BYTES = Buffer.byteLength(REASON_TRUNCATION_MARKER, "utf8");

/**
 * Truncate to `MAX_REASON_BYTES` UTF-8 bytes on a code-point boundary.
 * Never splits a multi-byte sequence, so the emitted string stays valid UTF-8.
 */
export function boundReason(reason: string): string {
  const bytes = Buffer.from(reason, "utf8");
  if (bytes.length <= MAX_REASON_BYTES) return reason;
  let end = MAX_REASON_BYTES - MARKER_BYTES;
  // Back off continuation bytes (10xxxxxx) to the start of a code point.
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) {
    end -= 1;
  }
  return `${bytes.subarray(0, end).toString("utf8")}${REASON_TRUNCATION_MARKER}`;
}

/** Cap a candidate-influenced reason list and keep the exact pre-cap total. */
export function boundReasons(reasons: readonly string[]): BoundedReasons {
  return {
    reasons: Object.freeze(reasons.slice(0, MAX_VERDICT_REASONS).map(boundReason)),
    count: reasons.length,
  };
}
