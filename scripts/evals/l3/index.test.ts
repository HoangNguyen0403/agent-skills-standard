/**
 * scripts/evals/l3/index.test.ts
 *
 * Test suite for standalone L3 evaluator CLI entrypoint (scripts/evals/l3/index.ts).
 * Authoritative contracts: docs/srs/srs-skill-system-effectiveness.md (Revision 4).
 *
 * Covers:
 * - B1 & M1: Real lifecycle wiring for build & run, attempt directory creation, interrupted marker,
 *   atomic terminal receipt publication with terminal state (e.g. preflight_failed), structured output, and non-zero exit.
 * - B2: Independent host authority grant (--grant <path>) outside manifest; refusal of self-granting or missing grant.
 * - B3: Fail-closed isolation in validate without fallback unless --allow-trusted-staging is passed.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, symlink, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { describe } from "node:test";
import { runCli, parseCliArgs, loadManifestFile, loadIndependentHostGrant } from "./index.js";
import { createValidManifestFixture, FIXTURE_NOW_MS, EMPTY_SHA256 } from "./test-fixtures.js";
import { probeDescriptorAnchoredTraversal, type L3Manifest } from "./manifest.js";
import { RECEIPT_FILENAME, INTERRUPTED_MARKER_FILENAME, computeSha256 } from "./evidence.js";

describe("L3 Evaluator CLI (index.ts)", () => {
  async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
    const tmp = await mkdtemp(path.join(tmpdir(), "l3-cli-test-"));
    try {
      return await fn(tmp);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }

  function mockIo(): {
    stdout: (msg: string) => void;
    stderr: (msg: string) => void;
    outMsgs: string[];
    errMsgs: string[];
  } {
    const outMsgs: string[] = [];
    const errMsgs: string[] = [];
    return {
      stdout: (msg: string) => outMsgs.push(msg),
      stderr: (msg: string) => errMsgs.push(msg),
      outMsgs,
      errMsgs,
    };
  }

  async function createValidManifestBundle(dir: string, overrides: Partial<L3Manifest> = {}): Promise<string> {
    const manifest = createValidManifestFixture(overrides);

    await mkdir(path.join(dir, "artifacts", "A0"), { recursive: true });
    await mkdir(path.join(dir, "artifacts", "A1"), { recursive: true });
    await mkdir(path.join(dir, "artifacts", "A2"), { recursive: true });
    await mkdir(path.join(dir, "fixtures"), { recursive: true });

    await writeFile(path.join(dir, "artifacts", "A0", "service.tar"), Buffer.alloc(0));
    await writeFile(path.join(dir, "artifacts", "A1", "service.tar"), Buffer.alloc(0));
    await writeFile(path.join(dir, "artifacts", "A2", "service.tar"), Buffer.alloc(0));
    await writeFile(path.join(dir, "fixtures", "prompts.json"), Buffer.alloc(0));
    await writeFile(path.join(dir, "fixtures", "drivers.tar"), Buffer.alloc(0));

    const manifestPath = path.join(dir, "manifest.json");
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    return manifestPath;
  }

  async function createIndependentHostGrantFile(
    dir: string,
    manifestPath: string,
    overrides: Record<string, unknown> = {}
  ): Promise<string> {
    const { manifest, sha256 } = await loadManifestFile(manifestPath);
    const grant = {
      grant_id: "grant-host-authority-001",
      authority: "sec-ops-lead",
      manifest_sha256: sha256,
      run_id: manifest.run_id,
      issued_at: "2030-01-01T00:00:00.000Z",
      expires_at: "2030-01-02T00:00:00.000Z",
      ...overrides,
    };

    const grantPath = path.join(dir, "host-grant.json");
    await writeFile(grantPath, JSON.stringify(grant, null, 2), "utf8");
    return grantPath;
  }

  test("CLI argument parsing: handles subcommands, grant, allow-trusted-staging, and options", () => {
    const parsed = parseCliArgs([
      "validate",
      "--manifest",
      "foo.json",
      "--allow-trusted-staging",
      "--runs-dir",
      "./my-runs",
      "--grant",
      "grant.json",
    ]);
    assert.equal(parsed.subcommand, "validate");
    assert.equal(parsed.manifestPath, "foo.json");
    assert.equal(parsed.allowTrustedStaging, true);
    assert.equal(parsed.runsDir, "./my-runs");
    assert.equal(parsed.grantPath, "grant.json");
    assert.equal(parsed.unknownFlags.length, 0);

    const withUnknown = parseCliArgs(["build", "--manifest", "foo.json", "--bogus-flag"]);
    assert.equal(withUnknown.subcommand, "build");
    assert.ok(withUnknown.unknownFlags.includes("--bogus-flag"));
  });

  test("CLI without subcommand or with help exits non-zero", async () => {
    const io = mockIo();
    const code = await runCli([], io);
    assert.equal(code, 1);

    const helpCode = await runCli(["--help"], io);
    assert.equal(helpCode, 1);
  });

  test("CLI rejects unknown arguments and missing --manifest flag", async () => {
    const io1 = mockIo();
    const code1 = await runCli(["validate", "--unknown"], io1);
    assert.equal(code1, 1);
    assert.ok(io1.errMsgs.some((m) => m.includes("Unknown argument")));

    const io2 = mockIo();
    const code2 = await runCli(["validate"], io2);
    assert.equal(code2, 1);
    assert.ok(io2.errMsgs.some((m) => m.includes("Missing required argument")));
  });

  test("B3: validate subcommand enforces fail-closed isolation without silent fallback unless explicitly allowed", async () => {
    await withTempDir(async (tmp) => {
      const manifestPath = await createValidManifestBundle(tmp);
      const probe = probeDescriptorAnchoredTraversal();

      if (!probe.supported) {
        // Without --allow-trusted-staging, it must fail closed and exit 1
        const ioFail = mockIo();
        const codeFail = await runCli(["validate", "--manifest", manifestPath], ioFail);
        assert.equal(codeFail, 1);
        assert.ok(ioFail.errMsgs.some((m) => m.includes("Descriptor-anchored artifact traversal is unavailable")));

        // With explicit --allow-trusted-staging, operator authorizes fallback, exiting 0
        const ioAllowed = mockIo();
        const codeAllowed = await runCli(
          ["validate", "--manifest", manifestPath, "--allow-trusted-staging"],
          ioAllowed
        );
        assert.equal(codeAllowed, 0);
        const result = JSON.parse(ioAllowed.outMsgs[0]) as {
          success: boolean;
          command: string;
          data: { allowed_trusted_staging: boolean; filesystem_isolation: string };
        };
        assert.equal(result.success, true);
        assert.equal(result.data.allowed_trusted_staging, true);
        assert.equal(result.data.filesystem_isolation, "trusted-staging-boundary");
      } else {
        const io = mockIo();
        const code = await runCli(["validate", "--manifest", manifestPath], io);
        assert.equal(code, 0);
        const result = JSON.parse(io.outMsgs[0]) as {
          success: boolean;
          data: { filesystem_isolation: string };
        };
        assert.equal(result.data.filesystem_isolation, "descriptor-anchored");
      }
    });
  });

  test("SRS-001: validate refuses symlinks, malformed JSON, and schema violations", async () => {
    await withTempDir(async (tmp) => {
      // 1. Malformed JSON
      const malformedPath = path.join(tmp, "malformed.json");
      await writeFile(malformedPath, "{ invalid json", "utf8");
      const io1 = mockIo();
      const code1 = await runCli(["validate", "--manifest", malformedPath], io1);
      assert.equal(code1, 1);
      assert.ok(io1.errMsgs.some((m) => m.includes("Malformed JSON")));

      // 2. Schema violation
      const invalidPath = path.join(tmp, "invalid-schema.json");
      await writeFile(invalidPath, JSON.stringify({ schema_version: 99 }), "utf8");
      const io2 = mockIo();
      const code2 = await runCli(["validate", "--manifest", invalidPath], io2);
      assert.equal(code2, 1);
      assert.ok(io2.errMsgs.some((m) => m.includes("schema_version") || m.includes("Missing")));

      // 3. Symlink refusal
      const realManifest = await createValidManifestBundle(tmp);
      const symlinkPath = path.join(tmp, "symlink-manifest.json");
      await symlink(realManifest, symlinkPath);
      const io3 = mockIo();
      const code3 = await runCli(["validate", "--manifest", symlinkPath], io3);
      assert.equal(code3, 1);
      assert.ok(io3.errMsgs.some((m) => m.includes("Refusing symlink manifest")));
    });
  });

  test("B2: build and run reject missing, expired, or mismatching independent host grants", async () => {
    await withTempDir(async (tmp) => {
      const manifestPath = await createValidManifestBundle(tmp);

      // Missing grant flag entirely
      const ioNoGrant = mockIo();
      const codeNoGrant = await runCli(["build", "--manifest", manifestPath], ioNoGrant);
      assert.equal(codeNoGrant, 1);
      assert.ok(ioNoGrant.errMsgs.some((m) => m.includes("Missing required independent host grant")));

      // Expired grant
      const expiredGrantPath = await createIndependentHostGrantFile(tmp, manifestPath, {
        expires_at: "2020-01-01T00:00:00.000Z",
      });
      const ioExpired = mockIo();
      const codeExpired = await runCli(
        ["build", "--manifest", manifestPath, "--grant", expiredGrantPath],
        { ...ioExpired, now: () => FIXTURE_NOW_MS }
      );
      assert.equal(codeExpired, 1);
      assert.ok(ioExpired.errMsgs.some((m) => m.includes("expired")));

      // Mismatching manifest digest
      const mismatchGrantPath = path.join(tmp, "mismatch-grant.json");
      await writeFile(
        mismatchGrantPath,
        JSON.stringify(
          {
            grant_id: "grant-mismatch",
            authority: "sec-ops-lead",
            manifest_sha256: "0".repeat(64),
            run_id: "run-20300101-001",
            issued_at: "2030-01-01T00:00:00.000Z",
            expires_at: "2030-01-02T00:00:00.000Z",
          },
          null,
          2
        ),
        "utf8"
      );
      const ioMismatch = mockIo();
      const codeMismatch = await runCli(
        ["build", "--manifest", manifestPath, "--grant", mismatchGrantPath],
        { ...ioMismatch, now: () => FIXTURE_NOW_MS }
      );
      assert.equal(codeMismatch, 1);
      assert.ok(ioMismatch.errMsgs.some((m) => m.includes("mismatch")));
    });
  });

  test("B1 & M1: build stages build/ and run stages its own attempt directory without collision", async () => {
    await withTempDir(async (tmp) => {
      const manifestPath = await createValidManifestBundle(tmp);
      const grantPath = await createIndependentHostGrantFile(tmp, manifestPath);
      const runsDir = path.join(tmp, "runs");
      const workDir = path.join(tmp, "work");

      const ioBuild = mockIo();
      const buildCode = await runCli(
        ["build", "--manifest", manifestPath, "--grant", grantPath, "--runs-dir", runsDir, "--work-dir", workDir],
        { ...ioBuild, now: () => FIXTURE_NOW_MS }
      );

      // Must exit non-zero because D5 live execution is not run and preflight fails closed
      assert.equal(buildCode, 1);

      const buildOutput = JSON.parse(ioBuild.errMsgs[0]) as {
        success: boolean;
        command: string;
        terminal_state: string;
        run_id: string;
        attempt_id?: string;
      };
      assert.equal(buildOutput.success, false);
      assert.equal(buildOutput.command, "build");
      assert.equal(buildOutput.terminal_state, "preflight_failed");
      // build performs preflight only: it must not manufacture an attempt
      assert.equal(buildOutput.attempt_id, undefined);

      const buildReceiptPath = path.join(runsDir, buildOutput.run_id, "build", "build-receipt.json");
      const buildReceipt = JSON.parse(await readFile(buildReceiptPath, "utf8")) as {
        schema_version: number;
        state: string;
        manifest_sha256: string;
      };
      assert.equal(buildReceipt.schema_version, 1);
      assert.equal(buildReceipt.state, "preflight_failed");
      assert.equal(buildReceipt.manifest_sha256, computeSha256(await readFile(manifestPath, "utf8")));

      // run on the same manifest and runs directory must not collide with the build directory
      const ioRun = mockIo();
      const runCode = await runCli(
        ["run", "--manifest", manifestPath, "--grant", grantPath, "--runs-dir", runsDir, "--work-dir", workDir],
        { ...ioRun, now: () => FIXTURE_NOW_MS }
      );
      assert.equal(runCode, 1);

      const runOutput = JSON.parse(ioRun.errMsgs[0]) as {
        command: string;
        terminal_state: string;
        attempt_id: string;
        run_id: string;
      };
      assert.equal(runOutput.command, "run");
      assert.equal(runOutput.terminal_state, "preflight_failed");
      assert.ok(runOutput.attempt_id);
      assert.notEqual(runOutput.attempt_id, "build");

      // Verify exclusive attempt directory and receipt on disk
      const receiptPath = path.join(runsDir, runOutput.run_id, runOutput.attempt_id, RECEIPT_FILENAME);
      const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as {
        terminal_state: string;
        schema_version: number;
        reason: string;
      };
      assert.equal(receipt.schema_version, 1);
      assert.equal(receipt.terminal_state, "preflight_failed");

      // Verify interrupted marker was deleted once terminal receipt was published
      const markerPath = path.join(runsDir, runOutput.run_id, runOutput.attempt_id, INTERRUPTED_MARKER_FILENAME);
      await assert.rejects(() => readFile(markerPath, "utf8"), /ENOENT/);

      // The build receipt survives the run untouched
      const buildReceiptAfter = JSON.parse(await readFile(buildReceiptPath, "utf8")) as {
        state: string;
        manifest_sha256: string;
      };
      assert.equal(buildReceiptAfter.state, "preflight_failed");
      assert.equal(buildReceiptAfter.manifest_sha256, buildReceipt.manifest_sha256);
    });
  });

  test("SRS-002 / D2: collector accepts the launcher old-space ceiling and refuses unbounded or oversized heaps", () => {
    const collectorScript = `
      import { OfflineEvidenceCollector } from "./scripts/evals/l3/runtime/collector.js";
      const c = new OfflineEvidenceCollector({
        io: { spawn: () => {} },
        verifier: { verify: () => ({ valid: false, reason: "denied" }) },
        clock: { nowMs: () => 0 },
        runnerPath: "/dummy",
        images: {},
        exportRoot: "/dummy",
      });
      const outcome = await c.collect({
        tokens: { attach: {} },
        expectation: { run_id: "run-1", attempt_index: 0 },
        collection_id: "test",
        original_state_path: "/dummy/state",
        attempt_directory: "/dummy/attempt",
      });
      console.log(JSON.stringify(outcome));
    `;

    const collectUnder = (...nodeArgs: string[]): { available: boolean; reason: string; detail: string } =>
      JSON.parse(
        execFileSync(
          process.execPath,
          [...nodeArgs, "--input-type=module", "--import", "tsx", "-e", collectorScript],
          { encoding: "utf8" }
        )
      ) as { available: boolean; reason: string; detail: string };

    // 1. Without an old-space cap, the default Node heap exceeds the undeclared ceiling on 64-bit systems
    const unconstrainedRes = collectUnder();
    assert.equal(unconstrainedRes.available, false);
    assert.equal(unconstrainedRes.reason, "collector_launch_failed");
    assert.ok(unconstrainedRes.detail.includes("launch the verifier with --max-old-space-size=768"));

    // 2. The launcher's own 768 MiB old-space cap passes even though V8 reports ~864 MiB heap limit
    const acceptedRes = collectUnder("--max-old-space-size=768");
    assert.equal(acceptedRes.reason, "attachment_unavailable");

    // 3. A declared cap above the launcher ceiling fails closed
    const oversizedRes = collectUnder("--max-old-space-size=4096");
    assert.equal(oversizedRes.available, false);
    assert.equal(oversizedRes.reason, "collector_launch_failed");
    assert.ok(oversizedRes.detail.includes("declared old-space limit 4096 MiB > 768"));
  });
});
