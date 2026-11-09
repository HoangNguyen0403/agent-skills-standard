/**
 * scripts/evals/l3/evidence.ts
 *
 * Evidence management and atomic lifecycle for L3 skill evaluator.
 * Authoritative contracts: docs/srs/srs-skill-system-effectiveness.md (Revision 4, SRS-004, SRS-005).
 *
 * Implements:
 * - Exclusive attempt directory lifecycle: runs/<run_id>/<attempt_id>/
 * - Interrupted marker lifecycle for unfinished attempts
 * - Atomic publication of receipt.json with strict terminal states and no overwrite
 * - Artifact digest reconciliation via D1's validateManifestFilesystem
 * - Sanitized reviewer bundle export:
 *   - Blinds all protocol arms (A0, A1, A2) and host machine paths
 *   - Blinds structured metadata (verdict, reason, failure_details)
 *   - Preserves binary artifacts without lossy UTF-8 decoding
 */

import { createHash, randomBytes } from "node:crypto";
import { link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  PROTOCOL_ARMS,
  TERMINAL_STATES,
  validateId,
  type Id,
  type TerminalState,
} from "./contracts.js";
import {
  validateManifestFilesystem,
  type FilesystemIsolation,
  type L3Manifest,
  type ManifestFilesystemVerificationResult,
} from "./manifest.js";

export const RECEIPT_SCHEMA_VERSION = 1 as const;
export const INTERRUPTED_MARKER_FILENAME = "interrupted.json" as const;
export const RECEIPT_FILENAME = "receipt.json" as const;
/** Build staging lives beside attempt directories, never inside one. */
export const BUILD_DIRNAME = "build" as const;
export const BUILD_RECEIPT_FILENAME = "build-receipt.json" as const;
export const BUILD_STATES = ["succeeded", "preflight_failed", "infrastructure_error"] as const;
export type BuildState = (typeof BUILD_STATES)[number];

export interface AttemptIdentity {
  readonly run_id: Id;
  readonly attempt_id: Id;
  readonly case_id: string;
  readonly arm_id?: string;
  readonly repetition?: number;
  readonly attempt_index?: number;
}

export interface InterruptedMarker {
  readonly schema_version: 1;
  readonly run_id: Id;
  readonly attempt_id: Id;
  readonly case_id: string;
  readonly arm_id?: string;
  readonly repetition?: number;
  readonly attempt_index?: number;
  readonly started_at: string;
  readonly interrupted_at: string;
  readonly reason: string;
}

export interface TerminalReceipt {
  readonly schema_version: 1;
  readonly run_id: Id;
  readonly attempt_id: Id;
  readonly case_id: string;
  readonly arm_id: string;
  readonly repetition: number;
  readonly attempt_index: number;
  readonly protocol: "artifact-v1";
  readonly terminal_state: TerminalState;
  readonly started_at: string;
  readonly completed_at: string;
  readonly duration_ms: number;
  readonly input_digests: {
    readonly manifest_sha256: string;
    readonly artifacts: readonly {
      readonly path: string;
      readonly expected_sha256: string;
      readonly actual_sha256: string;
      readonly verified: boolean;
    }[];
  };
  readonly output_artifacts: readonly {
    readonly name: string;
    readonly sha256: string;
    readonly bytes: number;
  }[];
  readonly verdict: Record<string, unknown> | null;
  readonly reason: string;
  readonly failure_details?: string | null;
  readonly observations_summary?: Record<string, unknown>;
}

export interface BuildReceipt {
  readonly schema_version: 1;
  readonly run_id: Id;
  readonly manifest_sha256: string;
  readonly grant_id: string;
  readonly state: BuildState;
  readonly started_at: string;
  readonly completed_at: string;
  readonly duration_ms: number;
  readonly reason: string;
  readonly failure_details: string | null;
}

export interface ReviewerScrubbedArtifact {
  readonly name: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly is_text: boolean;
  readonly scrubbed_text?: string;
}

export interface ReviewerBundleExport {
  readonly bundle_version: 1;
  readonly export_id: string;
  readonly run_id: Id;
  readonly attempt_id: Id;
  readonly case_id: string;
  readonly terminal_state: TerminalState;
  readonly duration_ms: number;
  readonly scrubbed_artifacts: readonly ReviewerScrubbedArtifact[];
  readonly verdict: Record<string, unknown> | null;
  readonly reason: string;
  readonly failure_details: string | null;
  readonly exported_at: string;
}

/**
 * Calculates raw sha256 hex digest of a Buffer or string.
 */
export function computeSha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Validates that a string is a valid terminal state per contracts.ts.
 */
export function assertTerminalState(state: unknown): asserts state is TerminalState {
  if (typeof state !== "string" || !(TERMINAL_STATES as readonly string[]).includes(state)) {
    throw new Error(`Invalid terminal state: ${String(state)}`);
  }
}

/**
 * Validates that a string is a valid build receipt state.
 */
export function assertBuildState(state: unknown): asserts state is BuildState {
  if (typeof state !== "string" || !(BUILD_STATES as readonly string[]).includes(state)) {
    throw new Error(`Invalid build state: ${String(state)}`);
  }
}

/**
 * Helper to escape regex special characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Scrubs arm identifiers and paths from strings.
 */
export function scrubText(text: string, pathsToScrub: readonly string[] = []): string {
  let result = text;
  for (const p of pathsToScrub) {
    if (p && p.trim().length > 0) {
      result = result.replace(new RegExp(escapeRegex(p), "g"), "[REDACTED_PATH]");
    }
  }

  // Scrub all protocol arm identifiers
  for (const arm of PROTOCOL_ARMS) {
    result = result.replace(new RegExp(`\\b${escapeRegex(arm)}\\b`, "g"), "[REDACTED_ARM]");
  }

  return result;
}

/**
 * Recursively scrubs structured values (objects, arrays, strings).
 */
export function scrubStructuredValue<T>(value: T, pathsToScrub: readonly string[] = []): T {
  if (typeof value === "string") {
    return scrubText(value, pathsToScrub) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubStructuredValue(item, pathsToScrub)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const copy: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      copy[k] = scrubStructuredValue(v, pathsToScrub);
    }
    return copy as T;
  }
  return value;
}

/**
 * Class managing attempt directory layout, markers, atomic publication,
 * and sanitized evidence export.
 */
export class EvidenceManager {
  readonly runsBaseDir: string;

  constructor(runsBaseDir: string) {
    if (!runsBaseDir || runsBaseDir.trim().length === 0) {
      throw new Error("runsBaseDir must be a non-empty string path");
    }
    this.runsBaseDir = path.resolve(runsBaseDir);
  }

  getRunDir(runId: string): string {
    const validId = validateId(runId, "runId");
    return path.join(this.runsBaseDir, validId);
  }

  getAttemptDir(runId: string, attemptId: string): string {
    const validRun = validateId(runId, "runId");
    const validAttempt = validateId(attemptId, "attemptId");
    return path.join(this.runsBaseDir, validRun, validAttempt);
  }

  /**
   * Returns `runs/<run_id>/build`, the build staging directory for a run.
   */
  getBuildDir(runId: string): string {
    return path.join(this.getRunDir(runId), BUILD_DIRNAME);
  }

  /**
   * Creates a directory atomically, failing closed if it already exists.
   * `mkdir` without `recursive` is itself the exclusivity primitive: there is
   * no stat-then-create window an interleaved writer could exploit.
   */
  private async createExclusiveDirectory(dir: string, label: string): Promise<void> {
    await mkdir(path.dirname(dir), { recursive: true, mode: 0o700 });
    try {
      await mkdir(dir, { mode: 0o700 });
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") {
        throw new Error(
          `${label} already exists: ${dir}. Overwriting or resuming existing work is forbidden.`
        );
      }
      throw err;
    }
  }

  /**
   * Initializes attempt directory exclusively under runs/<run_id>/<attempt_id>/.
   * Refuses if directory already exists or terminal receipt exists.
   * Creates initial interrupted.json marker.
   */
  async prepareAttemptDirectory(identity: AttemptIdentity): Promise<string> {
    const attemptDir = this.getAttemptDir(identity.run_id, identity.attempt_id);

    await this.createExclusiveDirectory(attemptDir, "Attempt directory");

    const marker: InterruptedMarker = {
      schema_version: 1,
      run_id: identity.run_id,
      attempt_id: identity.attempt_id,
      case_id: identity.case_id,
      arm_id: identity.arm_id,
      repetition: identity.repetition,
      attempt_index: identity.attempt_index,
      started_at: new Date().toISOString(),
      interrupted_at: new Date().toISOString(),
      reason: "Attempt initiated; awaiting terminal completion.",
    };

    const markerPath = path.join(attemptDir, INTERRUPTED_MARKER_FILENAME);
    // Write marker exclusively (O_EXCL via 'wx' flag)
    await writeFile(markerPath, JSON.stringify(marker, null, 2), {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    return attemptDir;
  }

  /**
   * Initializes the build staging directory exclusively under
   * runs/<run_id>/build/ so that `build` and `run` never share a directory.
   * Refuses if the directory already exists.
   */
  async prepareBuildDirectory(runId: string): Promise<string> {
    const buildDir = this.getBuildDir(runId);
    await this.createExclusiveDirectory(buildDir, "Build directory");
    return buildDir;
  }

  /**
   * Reads the interrupted marker if present.
   */
  async readInterruptedMarker(runId: string, attemptId: string): Promise<InterruptedMarker | null> {
    const attemptDir = this.getAttemptDir(runId, attemptId);
    const markerPath = path.join(attemptDir, INTERRUPTED_MARKER_FILENAME);
    try {
      const data = await readFile(markerPath, "utf8");
      return JSON.parse(data) as InterruptedMarker;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw err;
    }
  }

  /**
   * Publishes a JSON receipt without any overwrite window: the serialized
   * bytes are written to an exclusive temp file and then hard-linked onto the
   * final name. `link` fails atomically with EEXIST when the final name exists,
   * so concurrent publishers cannot clobber each other or overwrite prior
   * evidence.
   */
  private async publishExclusiveJson(
    dir: string,
    filename: string,
    value: unknown,
    label: string
  ): Promise<void> {
    const finalFile = path.join(dir, filename);
    const tmpFile = path.join(dir, `.${filename}.${randomBytes(8).toString("hex")}.tmp`);

    await writeFile(tmpFile, JSON.stringify(value, null, 2), {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });

    try {
      await link(tmpFile, finalFile);
    } catch (err: unknown) {
      // Best-effort temp cleanup; the publication error is authoritative.
      await unlink(tmpFile).catch(() => undefined);
      if ((err as NodeJS.ErrnoException).code === "EEXIST") {
        throw new Error(
          `${label} already exists at ${finalFile}. Overwrite is strictly forbidden.`
        );
      }
      throw err;
    }

    await unlink(tmpFile);
  }

  /**
   * Publishes receipt.json atomically by exclusive hard-link publication, and
   * removes the interrupted marker upon successful publication.
   * Refuses if receipt.json already exists (no overwrite).
   */
  async publishTerminalReceipt(
    runId: string,
    attemptId: string,
    receipt: Omit<TerminalReceipt, "schema_version" | "run_id" | "attempt_id">
  ): Promise<TerminalReceipt> {
    assertTerminalState(receipt.terminal_state);
    const attemptDir = this.getAttemptDir(runId, attemptId);

    const fullReceipt: TerminalReceipt = {
      schema_version: 1,
      run_id: validateId(runId, "runId"),
      attempt_id: validateId(attemptId, "attemptId"),
      ...receipt,
    };

    await this.publishExclusiveJson(attemptDir, RECEIPT_FILENAME, fullReceipt, "Terminal receipt");

    // Remove interrupted marker once terminal receipt is written
    const markerPath = path.join(attemptDir, INTERRUPTED_MARKER_FILENAME);
    try {
      await unlink(markerPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }

    return fullReceipt;
  }

  /**
   * Publishes build-receipt.json under runs/<run_id>/build/ with the same
   * exclusive, no-overwrite publication guarantees as terminal receipts.
   */
  async publishBuildReceipt(
    runId: string,
    receipt: Omit<BuildReceipt, "schema_version" | "run_id">
  ): Promise<BuildReceipt> {
    assertBuildState(receipt.state);
    const buildDir = this.getBuildDir(runId);

    const fullReceipt: BuildReceipt = {
      schema_version: 1,
      run_id: validateId(runId, "runId"),
      ...receipt,
    };

    await this.publishExclusiveJson(buildDir, BUILD_RECEIPT_FILENAME, fullReceipt, "Build receipt");
    return fullReceipt;
  }

  /**
   * Reconciles manifest artifact references by delegating to D1's validateManifestFilesystem.
   */
  async reconcileManifestArtifacts(
    manifest: L3Manifest,
    stageRoot: string,
    isolation?: FilesystemIsolation
  ): Promise<ManifestFilesystemVerificationResult> {
    return validateManifestFilesystem(manifest, {
      stage_root: stageRoot,
      isolation,
    });
  }

  /**
   * Exports an immutable reviewer bundle:
   * - Blinds all protocol arm labels (A0, A1, A2) and host machine paths across text and metadata
   * - Blinds structured metadata (verdict, reason, failure_details)
   * - Preserves binary artifacts without lossy string conversion (retaining exact sha256 bytes)
   * - Returns no unscrubbed original bytes: only scrubbed views and digests leave this method,
   *   so arm labels and host paths cannot leak through the export surface
   */
  exportReviewerBundle(
    receipt: TerminalReceipt,
    artifacts: readonly { name: string; content: Buffer; isText?: boolean }[]
  ): ReviewerBundleExport {
    const exportId = `export-${randomBytes(8).toString("hex")}`;
    const pathsToScrub = [this.runsBaseDir, this.getAttemptDir(receipt.run_id, receipt.attempt_id)];

    const scrubbedArtifacts: ReviewerScrubbedArtifact[] = [];

    for (const art of artifacts) {
      const sha256 = computeSha256(art.content);
      const bytes = art.content.byteLength;

      const isText = art.isText ?? (art.name.endsWith(".log") || art.name.endsWith(".json") || art.name.endsWith(".jsonl"));
      if (isText) {
        const textContent = art.content.toString("utf8");
        const scrubbed = scrubText(textContent, pathsToScrub);
        scrubbedArtifacts.push({
          name: scrubText(art.name, pathsToScrub),
          sha256,
          bytes,
          is_text: true,
          scrubbed_text: scrubbed,
        });
      } else {
        // Pure binary artifact: exact byte digest and length preserved without string corruption
        scrubbedArtifacts.push({
          name: scrubText(art.name, pathsToScrub),
          sha256,
          bytes,
          is_text: false,
        });
      }
    }

    return {
      bundle_version: 1,
      export_id: exportId,
      run_id: receipt.run_id,
      attempt_id: receipt.attempt_id,
      case_id: receipt.case_id,
      terminal_state: receipt.terminal_state,
      duration_ms: receipt.duration_ms,
      scrubbed_artifacts: scrubbedArtifacts,
      verdict: receipt.verdict ? scrubStructuredValue(receipt.verdict, pathsToScrub) : null,
      reason: scrubText(receipt.reason, pathsToScrub),
      failure_details: receipt.failure_details ? scrubText(receipt.failure_details, pathsToScrub) : null,
      exported_at: new Date().toISOString(),
    };
  }
}
