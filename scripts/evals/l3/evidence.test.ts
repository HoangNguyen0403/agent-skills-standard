/**
 * scripts/evals/l3/evidence.test.ts
 *
 * Comprehensive tests for EvidenceManager:
 * - Exclusive attempt directory creation and duplicate refusal
 * - Interrupted marker lifecycle
 * - Atomic receipt publication and receipt overwrite refusal
 * - Delegation to D1 validateManifestFilesystem for manifest artifact reconciliation
 * - Sanitized reviewer bundle export: all-arm label blinding, structured field blinding, raw binary preservation
 */

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { describe } from "node:test";
import {
  BUILD_DIRNAME,
  BUILD_RECEIPT_FILENAME,
  EvidenceManager,
  INTERRUPTED_MARKER_FILENAME,
  RECEIPT_FILENAME,
  computeSha256,
  type TerminalReceipt,
} from "./evidence.js";
import { TERMINAL_STATES, type TerminalState } from "./contracts.js";
import { createValidManifestFixture, EMPTY_SHA256 } from "./test-fixtures.js";

describe("EvidenceManager", () => {
  async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
    const tmp = await mkdtemp(path.join(tmpdir(), "l3-evidence-test-"));
    try {
      return await fn(tmp);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }

  test("SRS-005: exclusive directory creation and duplicate refusal", async () => {
    await withTempDir(async (baseDir) => {
      const em = new EvidenceManager(baseDir);
      const identity = {
        run_id: "run-20300101-001",
        attempt_id: "attempt-001",
        case_id: "payment",
        arm_id: "A1",
        repetition: 0,
        attempt_index: 0,
      };

      const attemptDir = await em.prepareAttemptDirectory(identity);
      assert.equal(attemptDir, path.join(baseDir, "run-20300101-001", "attempt-001"));

      const marker = await em.readInterruptedMarker(identity.run_id, identity.attempt_id);
      assert.ok(marker !== null);
      assert.equal(marker?.schema_version, 1);
      assert.equal(marker?.run_id, identity.run_id);
      assert.equal(marker?.attempt_id, identity.attempt_id);

      // Attempting to prepare the exact same attempt directory must throw (exclusive)
      await assert.rejects(
        () => em.prepareAttemptDirectory(identity),
        /already exists/
      );
    });
  });

  test("SRS-005: atomic receipt publication, marker cleanup, and overwrite refusal", async () => {
    await withTempDir(async (baseDir) => {
      const em = new EvidenceManager(baseDir);
      const runId = "run-20300101-002";
      const attemptId = "attempt-002";

      await em.prepareAttemptDirectory({
        run_id: runId,
        attempt_id: attemptId,
        case_id: "tenant",
        arm_id: "A0",
      });

      const published = await em.publishTerminalReceipt(runId, attemptId, {
        case_id: "tenant",
        arm_id: "A0",
        repetition: 0,
        attempt_index: 0,
        protocol: "artifact-v1",
        terminal_state: "passed",
        started_at: "2030-01-01T00:00:00.000Z",
        completed_at: "2030-01-01T00:01:00.000Z",
        duration_ms: 60000,
        input_digests: {
          manifest_sha256: "a".repeat(64),
          artifacts: [],
        },
        output_artifacts: [
          { name: "output.log", sha256: "b".repeat(64), bytes: 120 },
        ],
        verdict: { ok: true },
        reason: "Tenant case passed all invariants",
      });

      assert.equal(published.schema_version, 1);
      assert.equal(published.terminal_state, "passed");

      // Verify receipt.json exists on disk
      const receiptPath = path.join(baseDir, runId, attemptId, RECEIPT_FILENAME);
      const onDisk = JSON.parse(await readFile(receiptPath, "utf8")) as TerminalReceipt;
      assert.equal(onDisk.terminal_state, "passed");

      // Verify interrupted marker was deleted
      const marker = await em.readInterruptedMarker(runId, attemptId);
      assert.equal(marker, null);

      // Publishing a second receipt over the existing one must fail closed
      await assert.rejects(
        () =>
          em.publishTerminalReceipt(runId, attemptId, {
            case_id: "tenant",
            arm_id: "A0",
            repetition: 0,
            attempt_index: 0,
            protocol: "artifact-v1",
            terminal_state: "failed",
            started_at: "2030-01-01T00:00:00.000Z",
            completed_at: "2030-01-01T00:01:00.000Z",
            duration_ms: 60000,
            input_digests: { manifest_sha256: "a".repeat(64), artifacts: [] },
            output_artifacts: [],
            verdict: null,
            reason: "Trying to overwrite",
          }),
        /Terminal receipt already exists/
      );
    });
  });

  test("SRS-004: supports all recognized terminal states and rejects invalid states", async () => {
    await withTempDir(async (baseDir) => {
      const em = new EvidenceManager(baseDir);
      const runId = "run-terminal-states";

      for (const [idx, state] of TERMINAL_STATES.entries()) {
        const attemptId = `attempt-${idx}`;
        await em.prepareAttemptDirectory({
          run_id: runId,
          attempt_id: attemptId,
          case_id: "payment",
        });

        const receipt = await em.publishTerminalReceipt(runId, attemptId, {
          case_id: "payment",
          arm_id: "A2",
          repetition: 0,
          attempt_index: idx,
          protocol: "artifact-v1",
          terminal_state: state,
          started_at: "2030-01-01T00:00:00.000Z",
          completed_at: "2030-01-01T00:00:10.000Z",
          duration_ms: 10000,
          input_digests: { manifest_sha256: "c".repeat(64), artifacts: [] },
          output_artifacts: [],
          verdict: null,
          reason: `Finished in terminal state ${state}`,
        });
        assert.equal(receipt.terminal_state, state);
      }

      await assert.rejects(
        () =>
          em.publishTerminalReceipt(runId, "attempt-invalid", {
            case_id: "payment",
            arm_id: "A0",
            repetition: 0,
            attempt_index: 99,
            protocol: "artifact-v1",
            terminal_state: "not_a_terminal_state" as unknown as TerminalState,
            started_at: "2030-01-01T00:00:00.000Z",
            completed_at: "2030-01-01T00:00:10.000Z",
            duration_ms: 10000,
            input_digests: { manifest_sha256: "c".repeat(64), artifacts: [] },
            output_artifacts: [],
            verdict: null,
            reason: "invalid",
          }),
        /Invalid terminal state/
      );
    });
  });

  test("SRS-001 / SRS-005: manifest artifact reconciliation delegates to D1 verification", async () => {
    await withTempDir(async (stageRoot) => {
      const em = new EvidenceManager(stageRoot);
      const manifest = createValidManifestFixture();

      // Create valid files matching manifest
      await mkdir(path.join(stageRoot, "artifacts", "A0"), { recursive: true });
      await mkdir(path.join(stageRoot, "artifacts", "A1"), { recursive: true });
      await mkdir(path.join(stageRoot, "artifacts", "A2"), { recursive: true });
      await mkdir(path.join(stageRoot, "fixtures"), { recursive: true });

      await writeFile(path.join(stageRoot, "artifacts", "A0", "service.tar"), Buffer.alloc(0));
      await writeFile(path.join(stageRoot, "artifacts", "A1", "service.tar"), Buffer.alloc(0));
      await writeFile(path.join(stageRoot, "artifacts", "A2", "service.tar"), Buffer.alloc(0));
      await writeFile(path.join(stageRoot, "fixtures", "prompts.json"), Buffer.alloc(0));
      await writeFile(path.join(stageRoot, "fixtures", "drivers.tar"), Buffer.alloc(0));

      const result = await em.reconcileManifestArtifacts(manifest, stageRoot, {
        kind: "trusted-staging-boundary",
        controller_assertion: "immutable-non-attacker-writable",
      });

      assert.equal(result.valid, true);
      assert.equal(result.verified_refs.length, 5);
    });
  });

  test("SRS-005: exportReviewerBundle scrubs all arm labels, paths, structured fields, and preserves binary integrity", async () => {
    await withTempDir(async (baseDir) => {
      const em = new EvidenceManager(baseDir);
      const receipt: TerminalReceipt = {
        schema_version: 1,
        run_id: "run-export-001",
        attempt_id: "attempt-export-001",
        case_id: "overload",
        arm_id: "A1",
        repetition: 1,
        attempt_index: 5,
        protocol: "artifact-v1",
        terminal_state: "failed",
        started_at: "2030-01-01T00:00:00.000Z",
        completed_at: "2030-01-01T00:01:30.000Z",
        duration_ms: 90000,
        input_digests: { manifest_sha256: "d".repeat(64), artifacts: [] },
        output_artifacts: [],
        verdict: { details: "Arm A0 and arm A1 compared with A2 at " + baseDir },
        reason: "Capacity failure in A1 observed at " + baseDir,
        failure_details: "Detailed trace mentions A2 and A0",
      };

      const rawLog = Buffer.from(
        `Execution log under ${baseDir}/runs/attempt-01 for A0, A1, and A2.\nStatus: A1 breached limit.`,
        "utf8"
      );
      // Binary artifact (e.g. tar or non-UTF8 binary stream)
      const rawBinary = Buffer.from([0x00, 0xff, 0xfe, 0x12, 0x34, 0x56, 0x78]);
      const expectedBinarySha = computeSha256(rawBinary);

      const exportResult = em.exportReviewerBundle(receipt, [
        { name: "output.log", content: rawLog, isText: true },
        { name: "artifact.bin", content: rawBinary, isText: false },
      ]);

      assert.equal(exportResult.bundle_version, 1);
      assert.equal(exportResult.run_id, receipt.run_id);
      assert.equal(exportResult.attempt_id, receipt.attempt_id);

      // The exported bundle must not carry any unblinded arm label or host path anywhere
      const serializedBundle = JSON.stringify(exportResult);
      for (const leaked of ["A0", "A1", "A2", baseDir]) {
        assert.equal(
          serializedBundle.includes(leaked),
          false,
          `reviewer bundle leaked ${leaked}: ${serializedBundle}`
        );
      }

      // Verify all arm labels are blinded in structured metadata
      assert.ok(!exportResult.reason.includes("A1"));
      assert.ok(exportResult.reason.includes("[REDACTED_ARM]"));
      assert.ok(!exportResult.reason.includes(baseDir));

      assert.ok(exportResult.verdict !== null && typeof exportResult.verdict === "object");
      const verdictObj = exportResult.verdict as Record<string, unknown>;
      const scrubbedVerdict = typeof verdictObj.details === "string" ? verdictObj.details : "";
      assert.ok(!scrubbedVerdict.includes("A0"));
      assert.ok(!scrubbedVerdict.includes("A1"));
      assert.ok(!scrubbedVerdict.includes("A2"));
      assert.ok(!scrubbedVerdict.includes(baseDir));
      const textArt = exportResult.scrubbed_artifacts.find((a) => a.name === "output.log");
      assert.ok(!textArt?.scrubbed_text?.includes("A0"));
      assert.ok(!textArt?.scrubbed_text?.includes("A1"));
      assert.ok(!textArt?.scrubbed_text?.includes("A2"));
      assert.ok(!textArt?.scrubbed_text?.includes(baseDir));

      // Verify binary artifact was preserved without lossy UTF-8 conversion
      const binArt = exportResult.scrubbed_artifacts.find((a) => a.name === "artifact.bin");
      assert.equal(binArt?.is_text, false);
      assert.equal(binArt?.bytes, rawBinary.byteLength);
      assert.equal(binArt?.sha256, expectedBinarySha);

      // No unscrubbed raw artifact bytes are returned at all
      assert.equal(Object.prototype.hasOwnProperty.call(exportResult, "rawFiles"), false);
    });
  });

  test("SRS-005: build staging is separate from attempt staging and publishes exclusively", async () => {
    await withTempDir(async (baseDir) => {
      const em = new EvidenceManager(baseDir);
      const runId = "run-build-001";

      const buildDir = await em.prepareBuildDirectory(runId);
      assert.equal(buildDir, path.join(baseDir, runId, BUILD_DIRNAME));

      const receipt = await em.publishBuildReceipt(runId, {
        manifest_sha256: "e".repeat(64),
        grant_id: "grant-host-authority-001",
        state: "preflight_failed",
        started_at: "2030-01-01T00:00:00.000Z",
        completed_at: "2030-01-01T00:00:05.000Z",
        duration_ms: 0,
        reason: "preflight refused",
        failure_details: null,
      });
      assert.equal(receipt.state, "preflight_failed");

      const onDisk = JSON.parse(
        await readFile(path.join(buildDir, BUILD_RECEIPT_FILENAME), "utf8")
      ) as { schema_version: number; state: string };
      assert.equal(onDisk.schema_version, 1);
      assert.equal(onDisk.state, "preflight_failed");

      // A second build for the same run must fail closed, exactly like an attempt directory
      await assert.rejects(() => em.prepareBuildDirectory(runId), /Build directory already exists/);

      // The attempt directory for the same run is a different path and remains available
      const attemptDir = await em.prepareAttemptDirectory({
        run_id: runId,
        attempt_id: "attempt-001",
        case_id: "payment",
      });
      assert.notEqual(attemptDir, buildDir);
      assert.notEqual(attemptDir, path.join(baseDir, runId, BUILD_DIRNAME));
    });
  });
});
