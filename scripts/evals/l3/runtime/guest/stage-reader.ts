/**
 * scripts/evals/l3/runtime/guest/stage-reader.ts
 *
 * Isolated tenant stage reader.
 *
 * Two separate facts are established here and never conflated:
 *
 * 1. **Reviewed correspondence** — the externally reviewed `stages.json` bundle
 *    entry declares, per stage, the candidate-relative location that stage is
 *    allowed to occupy. A list of paths is not a review: acceptance additionally
 *    requires signed custody that binds the *actual* `stages.json` bytes, the
 *    built executable image and the packaged stage-reader program to an
 *    independent custodian key. Unsigned correspondence is refused, not assumed.
 * 2. **Observed contents** — the controller pauses the candidate, copies those
 *    exact locations out of the state volume into a frozen snapshot, and this
 *    module hashes and parses the copied bytes. The digest is the observation,
 *    not something the candidate or the bundle author can self-assert.
 */

import { createHash } from "node:crypto";
import { strictObject, validateId, validateNat } from "../../contracts.js";
import type { BundleEntry } from "../bundle.js";
import { readRegularFileBeneath } from "./safe-fs.js";
import { sha256Hex, verifyReviewCustody, type ReviewCustody, type ReviewTrustAnchor } from "./trust.js";

/** Domain separation for reviewed stage correspondence. */
export const STAGE_CORRESPONDENCE_DOMAIN = "l3-stage-correspondence-review-v1";

export interface StageCorrespondenceTrust {
  readonly anchor: ReviewTrustAnchor;
  readonly executable_sha256: string;
  readonly program_sha256: string;
}

export const TENANT_STAGE_NAMES = ["retrieval", "rerank", "cache"] as const;
export type TenantStageName = (typeof TENANT_STAGE_NAMES)[number];

export interface TenantFrozenStage {
  readonly stage: TenantStageName;
  readonly sequence: number;
  readonly records: readonly Readonly<Record<string, unknown>>[];
  readonly source_document_ids: readonly string[];
}

export interface ReviewedStageLocation {
  readonly stage: TenantStageName;
  readonly path: string;
}

export interface FrozenStageManifestEntry {
  readonly stage: string;
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
}

const MAX_STAGE_BYTES = 65_536;
const MAX_RECORDS = 256;
const MAX_SOURCE_IDS = 256;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const RELATIVE_PATH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;

function stageName(value: unknown): TenantStageName {
  const id = validateId(value, "stage");
  if (!(TENANT_STAGE_NAMES as readonly string[]).includes(id)) {
    throw new Error(`unknown tenant stage: ${id}`);
  }
  return id as TenantStageName;
}

interface StageCorrespondence {
  readonly locations: readonly ReviewedStageLocation[];
  readonly approval_reason: string;
  readonly artifact_sha256: string;
}

function parseReviewedLocations(entry: BundleEntry | undefined): StageCorrespondence | null {
  if (entry === undefined) return null;
  if (entry.data.length > MAX_STAGE_BYTES) throw new Error("stages.json exceeds its byte ceiling");
  let raw: unknown;
  try {
    raw = JSON.parse(entry.data.toString("utf8"));
  } catch {
    throw new Error("stages.json is not valid JSON");
  }
  const record = strictObject(raw, "stages.json", ["version", "reviewed_locations", "approval_reason"]);
  if (record.version !== 2) throw new Error("stages.json version must be 2 (signed correspondence)");
  if (!Array.isArray(record.reviewed_locations) || record.reviewed_locations.length === 0) {
    throw new Error("stages.json reviewed_locations must be a non-empty array");
  }
  const approval_reason = validateId(record.approval_reason, "approval_reason");
  const seen = new Set<string>();
  const locations = Object.freeze(
    record.reviewed_locations.map((item, index) => {
      const location = strictObject(item, `stages.reviewed_locations[${index}]`, ["stage", "path"]);
      const stage = stageName(location.stage);
      const locationPath = location.path;
      if (
        typeof locationPath !== "string" ||
        !RELATIVE_PATH.test(locationPath) ||
        locationPath.startsWith("/") ||
        locationPath.includes("..")
      ) {
        throw new Error("stages.reviewed_locations.path must be a safe candidate-relative path");
      }
      if (seen.has(stage)) throw new Error(`duplicate reviewed stage location: ${stage}`);
      seen.add(stage);
      return { stage, path: locationPath };
    }),
  );
  return { locations, approval_reason, artifact_sha256: sha256Hex(entry.data) };
}

/** Strict parse of the custody entry that signs `stages.json` bytes. */
function parseStageCustody(entry: BundleEntry | undefined): ReviewCustody | null {
  if (entry === undefined) return null;
  try {
    const raw = strictObject(JSON.parse(entry.data.toString("utf8")), "stages_review.json", [
      "version",
      "run_id",
      "attempt_id",
      "executable_sha256",
      "program_sha256",
      "artifact_sha256",
      "custodian",
      "issued_at",
      "expires_at",
      "signature",
    ]);
    if (raw.version !== 1) return null;
    return {
      version: 1,
      run_id: String(raw.run_id ?? ""),
      attempt_id: String(raw.attempt_id ?? ""),
      executable_sha256: String(raw.executable_sha256 ?? ""),
      program_sha256: String(raw.program_sha256 ?? ""),
      artifact_sha256: String(raw.artifact_sha256 ?? ""),
      custodian: String(raw.custodian ?? ""),
      issued_at: String(raw.issued_at ?? ""),
      expires_at: String(raw.expires_at ?? ""),
      signature: String(raw.signature ?? ""),
    };
  } catch {
    return null;
  }
}

function parseStageBody(stage: TenantStageName, body: Buffer): TenantFrozenStage {
  let raw: unknown;
  try {
    raw = JSON.parse(body.toString("utf8"));
  } catch {
    throw new Error(`stage ${stage} snapshot is not valid JSON`);
  }
  const record = strictObject(raw, `stage.${stage}`, ["stage", "sequence", "records", "source_document_ids"]);
  if (stageName(record.stage) !== stage) throw new Error(`stage ${stage} snapshot names a different stage`);
  if (!Array.isArray(record.records) || record.records.length > MAX_RECORDS) {
    throw new Error(`stage ${stage} records must be a bounded array`);
  }
  if (!Array.isArray(record.source_document_ids) || record.source_document_ids.length > MAX_SOURCE_IDS) {
    throw new Error(`stage ${stage} source_document_ids must be a bounded array`);
  }
  const records = record.records.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`stage ${stage} record ${index} must be an object`);
    }
    return Object.freeze({ ...item });
  });
  return Object.freeze({
    stage,
    sequence: validateNat(record.sequence, "sequence"),
    records: Object.freeze(records),
    source_document_ids: Object.freeze(
      record.source_document_ids.map((id) => validateId(id, "source_document_id")),
    ),
  });
}

export interface BundleStageReader {
  /** True only for signed, custody-verified location correspondence. */
  isStageCorrespondenceAccepted(stage: TenantStageName): boolean;
  reviewedLocations(): readonly ReviewedStageLocation[];
  /** Why correspondence was refused, or null when it is accepted. */
  correspondenceRefusalReason(): string | null;
  /**
   * Reads the frozen snapshot copy and verifies every file against the digest
   * manifest taken when the candidate was paused. `null` means the observation
   * could not be established (missing, mutated, or unparsable).
   */
  readFrozenStages(
    snapshotId: string,
    manifest: readonly FrozenStageManifestEntry[],
  ): Promise<readonly TenantFrozenStage[] | null>;
}

export function createBundleStageReader(
  entries: readonly BundleEntry[],
  snapshotRoot: string,
  trust: StageCorrespondenceTrust,
): BundleStageReader {
  let correspondence: StageCorrespondence | null = null;
  let refusalReason: string | null = null;
  try {
    correspondence = parseReviewedLocations(entries.find((entry) => entry.name === "stages.json"));
  } catch (error) {
    refusalReason = error instanceof Error ? error.message : String(error);
  }
  const custody = parseStageCustody(entries.find((entry) => entry.name === "stages_review.json"));
  if (correspondence === null) {
    refusalReason ??= "no reviewed stage correspondence in bundle";
  } else if (custody === null) {
    refusalReason = "no signed custody entry accompanies the stage correspondence";
    correspondence = null;
  } else {
    const verification = verifyReviewCustody(custody, trust.anchor, {
      executable_sha256: trust.executable_sha256,
      program_sha256: trust.program_sha256,
      artifact_sha256: correspondence.artifact_sha256,
      approval_reason: correspondence.approval_reason,
    });
    if (!verification.valid) {
      refusalReason = verification.reason ?? "stage correspondence custody was refused";
      correspondence = null;
    }
  }
  const reviewed = correspondence?.locations ?? Object.freeze([] as ReviewedStageLocation[]);
  const reviewedStages = new Set(reviewed.map((location) => location.stage));
  return {
    isStageCorrespondenceAccepted(stage: TenantStageName): boolean {
      return reviewedStages.has(stage);
    },
    reviewedLocations(): readonly ReviewedStageLocation[] {
      return reviewed;
    },
    correspondenceRefusalReason(): string | null {
      return refusalReason;
    },
    async readFrozenStages(
      snapshotId: string,
      manifest: readonly FrozenStageManifestEntry[],
    ): Promise<readonly TenantFrozenStage[] | null> {
      validateId(snapshotId, "snapshot_id");
      if (manifest.length === 0) return null;
      const stages: TenantFrozenStage[] = [];
      for (const entry of manifest) {
        const stage = stageName(entry.stage);
        if (!reviewedStages.has(stage)) return null;
        const location = reviewed.find((candidate) => candidate.stage === stage);
        if (location === undefined || location.path !== entry.path) return null;
        if (!SHA256_HEX.test(entry.sha256)) return null;
        let body: Buffer;
        try {
          body = await readRegularFileBeneath(
            snapshotRoot,
            [snapshotId, `${stage}.json`],
            MAX_STAGE_BYTES,
          );
        } catch {
          return null;
        }
        const digest = createHash("sha256").update(body).digest("hex");
        if (digest !== entry.sha256 || body.length !== entry.bytes) return null;
        try {
          stages.push(parseStageBody(stage, body));
        } catch {
          return null;
        }
      }
      return Object.freeze(stages);
    },
  };
}
