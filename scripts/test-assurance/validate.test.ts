// scripts/test-assurance/validate.test.ts
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createCurrentSnapshot,
  createValidDeclaredBundle,
  createValidExecutedBundle,
  createValidFaultBundle,
  setupEvidenceDir,
  setupSampleRepo,
} from "./__fixtures__/fixture-helper";
import { validate } from "./validate";

function makeTempDirs(): { evidenceRoot: string; repoRoot: string; cleanup: () => void } {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "test-assurance-"));
  const evidenceRoot = path.join(base, "evidence");
  const repoRoot = path.join(base, "repo");
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.mkdirSync(repoRoot, { recursive: true });
  return {
    evidenceRoot,
    repoRoot,
    cleanup: () => {
      try {
        fs.rmSync(base, { recursive: true, force: true });
      } catch {
        // ignore
      }
    },
  };
}

test("minimal valid declared-only bundle passes --require declared with exit code 0", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidDeclaredBundle(evidenceRoot, repoRoot);
    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "declared",
    });

    assert.equal(result.exit_code, 0);
    assert.equal(result.satisfied, true);
    assert.equal(result.declaration, "valid");
    assert.equal(result.static, "absent");
    assert.equal(result.execution, "absent");
    assert.equal(result.fault, "absent");
    assert.equal(result.freshness, "not_applicable");
    assert.equal(result.review, "absent");
    assert.deepEqual(result.issues, []);
  } finally {
    cleanup();
  }
});

test("AC-10: declared-only bundle fails --require executed and --require fault with exit code 1", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidDeclaredBundle(evidenceRoot, repoRoot);

    const execRes = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });
    assert.equal(execRes.exit_code, 1);
    assert.equal(execRes.satisfied, false);
    assert.equal(execRes.declaration, "valid");
    assert.equal(execRes.execution, "absent");
    assert.ok(execRes.issues.some((i) => i.code === "INSUFFICIENT_EVIDENCE"));

    const faultRes = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "fault",
    });
    assert.equal(faultRes.exit_code, 1);
    assert.equal(faultRes.satisfied, false);
    assert.equal(faultRes.fault, "absent");
    assert.ok(faultRes.issues.some((i) => i.code === "INSUFFICIENT_EVIDENCE"));
  } finally {
    cleanup();
  }
});

test("valid executed bundle passes --require executed with exit code 0 and freshness current", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });

    assert.equal(result.exit_code, 0);
    assert.equal(result.satisfied, true);
    assert.equal(result.declaration, "valid");
    assert.equal(result.execution, "passed");
    assert.equal(result.freshness, "current");
    assert.equal(result.static, "complete");
    assert.equal(result.review, "accepted");
    assert.deepEqual(result.issues, []);
  } finally {
    cleanup();
  }
});

test("AC-12: valid fault bundle passes --require fault with exit code 0 and demonstrates named fault", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidFaultBundle(evidenceRoot, repoRoot);

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "fault",
    });

    assert.equal(result.exit_code, 0);
    assert.equal(result.satisfied, true);
    assert.equal(result.declaration, "valid");
    assert.equal(result.execution, "passed");
    assert.equal(result.fault, "demonstrated");
    assert.equal(result.freshness, "current");
    assert.deepEqual(result.issues, []);
  } finally {
    cleanup();
  }
});

test("AC-11: source drift in repository makes evidence stale (exit code 1)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    fs.writeFileSync(path.join(repoRoot, "src", "calc.ts"), "export function add(a: number, b: number): number { return a - b; }\n");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });

    assert.equal(result.exit_code, 1);
    assert.equal(result.satisfied, false);
    assert.equal(result.freshness, "stale");
    assert.ok(result.issues.some((i) => i.code === "INVENTORY_DRIFT"));
  } finally {
    cleanup();
  }
});

test("AC-11: test drift makes evidence stale (exit code 1)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    fs.writeFileSync(path.join(repoRoot, "tests", "calc.test.ts"), "export function testAdd() { return false; }\n");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });

    assert.equal(result.exit_code, 1);
    assert.equal(result.satisfied, false);
    assert.equal(result.freshness, "stale");
    assert.ok(result.issues.some((i) => i.code === "INVENTORY_DRIFT"));
  } finally {
    cleanup();
  }
});

test("AC-11: dependency config drift makes evidence stale (exit code 1)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    fs.writeFileSync(path.join(repoRoot, "config", "runner.json"), '{\n  "timeout_ms": 10000\n}\n');

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });

    assert.equal(result.exit_code, 1);
    assert.equal(result.satisfied, false);
    assert.equal(result.freshness, "stale");
    assert.ok(result.issues.some((i) => i.code === "INVENTORY_DRIFT"));
  } finally {
    cleanup();
  }
});

test("disappearing historical root makes evidence stale (exit code 1)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    fs.rmSync(path.join(repoRoot, "src"), { recursive: true, force: true });

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });

    assert.equal(result.exit_code, 1);
    assert.equal(result.satisfied, false);
    assert.equal(result.freshness, "stale");
  } finally {
    cleanup();
  }
});

test("AC-13: build_failed challenge outcome is not demonstrated and fails --require fault with exit 1", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidFaultBundle(evidenceRoot, repoRoot);

    bundle.challenge!.execution.outcome = "build_failed";
    bundle.challenge!.execution.exit_code = 2;
    bundle.challenge!.execution.failure = null;
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n", "utf8");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "fault",
    });

    assert.equal(result.exit_code, 1);
    assert.equal(result.satisfied, false);
    assert.equal(result.fault, "not_detected");
  } finally {
    cleanup();
  }
});

test("AC-13: timeout challenge outcome is not demonstrated and fails --require fault with exit 1", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidFaultBundle(evidenceRoot, repoRoot);

    bundle.challenge!.execution.outcome = "timeout";
    bundle.challenge!.execution.exit_code = null;
    bundle.challenge!.execution.failure = null;
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n", "utf8");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "fault",
    });

    assert.equal(result.exit_code, 1);
    assert.equal(result.satisfied, false);
    assert.equal(result.fault, "not_detected");
  } finally {
    cleanup();
  }
});

test("challenge with unrelated failure classification is not demonstrated (exit 1)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidFaultBundle(evidenceRoot, repoRoot);

    bundle.challenge!.adjudication.classification = "unrelated_failure";
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n", "utf8");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "fault",
    });

    assert.equal(result.exit_code, 1);
    assert.equal(result.satisfied, false);
    assert.equal(result.fault, "not_detected");
  } finally {
    cleanup();
  }
});

test("challenge with marker missing from captured artifact is not demonstrated (exit 1)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidFaultBundle(evidenceRoot, repoRoot);

    bundle.challenge!.adjudication.marker = "[DIFFERENT_MARKER]";
    bundle.challenge!.execution.failure!.marker = "[DIFFERENT_MARKER]";
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n", "utf8");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "fault",
    });

    assert.equal(result.exit_code, 1);
    assert.equal(result.satisfied, false);
    assert.equal(result.fault, "not_detected");
  } finally {
    cleanup();
  }
});

test("tampered captured output artifact fails with exit code 2 (invalid)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    fs.writeFileSync(path.join(evidenceRoot, "output-passed.txt"), "TAMPERED OUTPUT CONTENT\n");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });

    assert.equal(result.exit_code, 2);
    assert.equal(result.satisfied, false);
    assert.equal(result.execution, "invalid");
    assert.ok(result.issues.some((i) => i.code === "ARTIFACT_DIGEST_MISMATCH"));
  } finally {
    cleanup();
  }
});

test("missing captured output artifact fails with exit code 2 (invalid)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    fs.rmSync(path.join(evidenceRoot, "output-passed.txt"));

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });

    assert.equal(result.exit_code, 2);
    assert.equal(result.satisfied, false);
    assert.equal(result.execution, "invalid");
    assert.ok(result.issues.some((i) => i.code === "ARTIFACT_MISSING"));
  } finally {
    cleanup();
  }
});

test("null baseline with challenge present is invalid (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidFaultBundle(evidenceRoot, repoRoot);

    bundle.baseline = null;
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n", "utf8");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "fault",
    });

    assert.equal(result.exit_code, 2);
    assert.equal(result.satisfied, false);
    assert.equal(result.fault, "invalid");
  } finally {
    cleanup();
  }
});

test("trust label changed to trusted is invalid (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidDeclaredBundle(evidenceRoot, repoRoot);

    (bundle as unknown as Record<string, unknown>).trust = "trusted";
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n", "utf8");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "declared",
    });

    assert.equal(result.exit_code, 2);
    assert.equal(result.satisfied, false);
    assert.equal(result.declaration, "invalid");
  } finally {
    cleanup();
  }
});

test("rejected review makes satisfied false and yields exit code 1", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    bundle.review = {
      reviewer: "reviewer@example.com",
      decision: "rejected",
      rationale: "Behavioral verification rejected during manual review",
    };
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n", "utf8");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });

    assert.equal(result.exit_code, 1);
    assert.equal(result.satisfied, false);
    assert.equal(result.review, "rejected");
    assert.ok(result.issues.some((i) => i.code === "REVIEW_REJECTED"));
  } finally {
    cleanup();
  }
});

test("invalid precedence: invalid condition takes precedence over staleness (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    fs.writeFileSync(path.join(repoRoot, "src", "calc.ts"), "export function add() { return 0; }\n");
    fs.rmSync(path.join(evidenceRoot, "output-passed.txt"));

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });

    assert.equal(result.exit_code, 2);
    assert.equal(result.freshness, "stale");
    assert.equal(result.execution, "invalid");
    assert.equal(result.satisfied, false);
  } finally {
    cleanup();
  }
});

test("path containment forbids traversal and emits UNSAFE_PATH (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidDeclaredBundle(evidenceRoot, repoRoot);

    bundle.intent.oracle.ref.path = "../escape.md";
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "declared",
    });

    assert.equal(result.exit_code, 2);
    assert.equal(result.declaration, "invalid");
    assert.ok(result.issues.some((i) => i.code === "UNSAFE_PATH"));
  } finally {
    cleanup();
  }
});

// F1: Static report adapter enforces full strict TestGuard v0.2 invariants
test("F1: static report adapter accepts valid complete and incomplete reports with correct exit codes", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    // 1. Complete report passes
    const resComplete = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });
    assert.equal(resComplete.static, "complete");

    // 2. Incomplete report with input_failure and exit 2 is recognized as incomplete
    const reportPath = path.join(evidenceRoot, "static-report.json");
    const incompleteReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    incompleteReport.analysis.status = "incomplete";
    incompleteReport.analysis.reason = "input_failure";
    incompleteReport.exit_code = 2; // Incomplete is exit 2 per SRS §3.2
    fs.writeFileSync(reportPath, JSON.stringify(incompleteReport, null, 2) + "\n");

    bundle.static_report!.sha256 = crypto.createHash("sha256").update(fs.readFileSync(reportPath)).digest("hex");
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n");

    const resIncomplete = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });
    assert.equal(resIncomplete.static, "incomplete");
    assert.equal(resIncomplete.exit_code, 0); // static report does not prevent separate execution level
  } finally {
    cleanup();
  }
});

test("F1: static report with negative counts, missing commit, config_applied true, or exit mismatch is invalid (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);
    const reportPath = path.join(evidenceRoot, "static-report.json");
    const pristineReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));

    // Each malformed report is derived from the pristine valid report, so no case
    // passes because a previous mutation already made the report invalid.
    const malformedReports: Array<[string, (report: Record<string, any>) => void]> = [
      ["negative analyzed_files", (report) => { report.analysis.analyzed_files = -1; }],
      ["missing tool.commit", (report) => { delete report.tool.commit; }],
      ["config_applied true", (report) => { report.scope.config_applied = true; }],
      ["empty finding object", (report) => { report.findings = [{}]; }],
      ["complete report exiting 3", (report) => { report.exit_code = 3; }],
    ];

    for (const [label, mutate] of malformedReports) {
      const badReport = JSON.parse(JSON.stringify(pristineReport));
      mutate(badReport);
      fs.writeFileSync(reportPath, JSON.stringify(badReport, null, 2) + "\n");
      bundle.static_report!.sha256 = crypto.createHash("sha256").update(fs.readFileSync(reportPath)).digest("hex");
      fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n");

      const result = validate({ bundlePath, evidenceRoot, repoRoot, currentPath, require: "executed" });
      assert.equal(result.exit_code, 2, `expected exit 2 for ${label}`);
      assert.equal(result.static, "invalid", `expected static invalid for ${label}`);
      assert.equal(result.satisfied, false, `expected unsatisfied for ${label}`);
    }
  } finally {
    cleanup();
  }
});

// F2: Invalid ancillary evidence makes satisfied false
test("F2: invalid ancillary evidence makes satisfied false and exits 2", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    // Remove static report: ancillary static report is missing
    fs.rmSync(path.join(evidenceRoot, "static-report.json"));

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });

    assert.equal(result.exit_code, 2);
    assert.equal(result.satisfied, false); // F2: Must be false even though execution passed!
    assert.equal(result.static, "invalid");
  } finally {
    cleanup();
  }
});

// F3: Challenge execution intent_id binding
test("F3: challenge execution intent_id mismatch yields invalid fault (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidFaultBundle(evidenceRoot, repoRoot);

    bundle.challenge!.execution.intent_id = "DIFFERENT-INTENT-ID";
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "fault",
    });

    assert.equal(result.exit_code, 2);
    assert.equal(result.satisfied, false);
    assert.equal(result.fault, "invalid");
  } finally {
    cleanup();
  }
});

// F4: Variant source inventory membership & approved roots
test("F4: variant source inventory outside approved source roots yields invalid fault (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidFaultBundle(evidenceRoot, repoRoot);

    // Add extra source file outside "src" root
    bundle.challenge!.execution.snapshot.inputs.source.files.push({
      path: "outside/extra.ts",
      sha256: "2222222222222222222222222222222222222222222222222222222222222222",
    });
    bundle.challenge!.execution.snapshot.inputs.source.files.sort((a, b) => a.path.localeCompare(b.path));

    const variantPath = path.join(evidenceRoot, "variant.json");
    const variant = JSON.parse(fs.readFileSync(variantPath, "utf8"));
    variant.changes.push({
      path: "outside/extra.ts",
      before_sha256: null,
      after_sha256: "2222222222222222222222222222222222222222222222222222222222222222",
    });
    variant.changes.sort((a: { path: string }, b: { path: string }) => a.path.localeCompare(b.path));
    fs.writeFileSync(variantPath, JSON.stringify(variant, null, 2) + "\n");
    bundle.challenge!.variant.sha256 = crypto.createHash("sha256").update(fs.readFileSync(variantPath)).digest("hex");

    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "fault",
    });

    assert.equal(result.exit_code, 2);
    assert.equal(result.satisfied, false);
    assert.equal(result.fault, "invalid");
  } finally {
    cleanup();
  }
});

// F5 / SEC-3: Null intent or missing oracle returns structured exit 2 without throwing
test("F5 / SEC-3: null intent or missing oracle returns structured exit 2 without throwing", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidFaultBundle(evidenceRoot, repoRoot);

    // Null intent
    (bundle as unknown as Record<string, unknown>).intent = null;
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "fault",
    });

    assert.equal(result.exit_code, 2);
    assert.equal(result.satisfied, false);
    assert.equal(result.declaration, "invalid");
  } finally {
    cleanup();
  }
});

// F6: Canonical property-order independent snapshot comparison
test("F6: property insertion order in current.json and environment does not alter validity", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidFaultBundle(evidenceRoot, repoRoot);

    // Reorder current.json keys
    const currentSnap = JSON.parse(fs.readFileSync(currentPath, "utf8"));
    const reorderedCurrent = {
      dirty: currentSnap.dirty,
      inputs: {
        config: currentSnap.inputs.config,
        dependencies: currentSnap.inputs.dependencies,
        tests: currentSnap.inputs.tests,
        source: currentSnap.inputs.source,
      },
      repository: currentSnap.repository,
      commit: currentSnap.commit,
    };
    fs.writeFileSync(currentPath, JSON.stringify(reorderedCurrent) + "\n");

    // Reorder challenge environment keys
    const chEnv = bundle.challenge!.execution.environment;
    const reorderedEnv = {
      runner_version: chEnv.runner_version,
      runner: chEnv.runner,
      arch: chEnv.arch,
      os: chEnv.os,
    };
    (bundle.challenge!.execution as unknown as Record<string, unknown>).environment = reorderedEnv;
    fs.writeFileSync(bundlePath, JSON.stringify(bundle) + "\n");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "fault",
    });

    assert.equal(result.exit_code, 0);
    assert.equal(result.satisfied, true);
    assert.equal(result.freshness, "current");
    assert.equal(result.fault, "demonstrated");
  } finally {
    cleanup();
  }
});

// SEC-1: Bound roots count
test("SEC-1: snapshot with >128 roots is rejected before traversal (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidDeclaredBundle(evidenceRoot, repoRoot);

    const snapshot = JSON.parse(fs.readFileSync(currentPath, "utf8"));
    const dummyRoots: string[] = [];
    for (let i = 0; i < 130; i++) {
      dummyRoots.push("root" + i);
    }
    snapshot.inputs.source.roots = dummyRoots;
    fs.writeFileSync(currentPath, JSON.stringify(snapshot, null, 2) + "\n");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "declared",
    });

    assert.equal(result.exit_code, 2);
    assert.ok(result.issues.some((i) => i.code === "INPUT_TOO_LARGE"));
  } finally {
    cleanup();
  }
});

// SEC-2: Symlink rejection
test("SEC-2: real symlink inside repository tree is rejected as UNSAFE_PATH (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    // Create a real symlink inside repoRoot/src
    const symlinkTarget = path.join(repoRoot, "src", "calc.ts");
    const symlinkPath = path.join(repoRoot, "src", "calc-link.ts");
    fs.symlinkSync(symlinkTarget, symlinkPath);

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });

    assert.equal(result.exit_code, 2);
    assert.ok(result.issues.some((i) => i.code === "UNSAFE_PATH"));
  } finally {
    cleanup();
  }
});

// SEC-4: No diagnostic reflection of unknown keys or control characters
test("SEC-4: unknown property with control characters is not reflected in diagnostics", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidDeclaredBundle(evidenceRoot, repoRoot);

    (bundle as unknown as Record<string, unknown>)["\nSENTINEL\u001b[2J"] = true;
    fs.writeFileSync(bundlePath, JSON.stringify(bundle) + "\n");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "declared",
    });

    assert.equal(result.exit_code, 2);
    for (const iss of result.issues) {
      assert.equal(iss.path.includes("SENTINEL"), false);
      assert.equal(iss.message.includes("SENTINEL"), false);
      assert.equal(iss.path.includes("\u001b"), false);
      assert.equal(iss.message.includes("\u001b"), false);
    }
  } finally {
    cleanup();
  }
});

// F1: The adapter accepts the actual TestGuard violation.go finding shape
// (rule_id, severity Blocker|Warning|Advisory, file_path, line_number, column,
// message, suggestion) instead of an invented producer contract.
test("F1: static adapter accepts the actual TestGuard producer finding shape", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);
    const reportPath = path.join(evidenceRoot, "static-report.json");
    const producerReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    producerReport.findings = [
      {
        rule_id: "GUARD-GO-TEST-01",
        severity: "Blocker",
        file_path: "tests/calc.test.ts",
        line_number: 2,
        column: 1,
        message: "test declares no assertion",
        suggestion: "assert on the computed value",
      },
    ];
    producerReport.policy = { blocker_count: 1, status: "blocker_found" };
    producerReport.exit_code = 1;
    fs.writeFileSync(reportPath, JSON.stringify(producerReport, null, 2) + "\n");
    bundle.static_report!.sha256 = crypto.createHash("sha256").update(fs.readFileSync(reportPath)).digest("hex");
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });

    assert.equal(result.static, "complete");
    assert.equal(result.exit_code, 0);
    assert.deepEqual(result.issues, []);
  } finally {
    cleanup();
  }
});

// F1: An invented finding contract (path/line, lowercase severity) must be rejected,
// not silently accepted as documented evidence.
test("F1: static adapter rejects invented finding fields and severity casing (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);
    const reportPath = path.join(evidenceRoot, "static-report.json");
    const producerReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    producerReport.findings = [
      {
        rule_id: "GUARD-GO-TEST-01",
        severity: "blocker",
        message: "test declares no assertion",
        path: "tests/calc.test.ts",
        line: 2,
      },
    ];
    fs.writeFileSync(reportPath, JSON.stringify(producerReport, null, 2) + "\n");
    bundle.static_report!.sha256 = crypto.createHash("sha256").update(fs.readFileSync(reportPath)).digest("hex");
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });

    assert.equal(result.exit_code, 2);
    assert.equal(result.satisfied, false);
    assert.equal(result.static, "invalid");
    assert.ok(result.issues.some((i) => i.code === "UNKNOWN_PROPERTY" || i.code === "INVALID_SCHEMA"));
  } finally {
    cleanup();
  }
});

// F1: blocker_count is computed from findings whose severity is exactly "Blocker".
test("F1: static adapter rejects blocker_count that no Blocker finding supports (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);
    const reportPath = path.join(evidenceRoot, "static-report.json");
    const producerReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    producerReport.findings = [
      {
        rule_id: "GUARD-GO-TEST-02",
        severity: "Warning",
        file_path: "tests/calc.test.ts",
        line_number: 2,
        column: 1,
        message: "weak assertion",
        suggestion: "assert on the computed value",
      },
    ];
    producerReport.policy = { blocker_count: 1, status: "blocker_found" };
    producerReport.exit_code = 1;
    fs.writeFileSync(reportPath, JSON.stringify(producerReport, null, 2) + "\n");
    bundle.static_report!.sha256 = crypto.createHash("sha256").update(fs.readFileSync(reportPath)).digest("hex");
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n");

    const result = validate({
      bundlePath,
      evidenceRoot,
      repoRoot,
      currentPath,
      require: "executed",
    });

    assert.equal(result.exit_code, 2);
    assert.equal(result.static, "invalid");
  } finally {
    cleanup();
  }
});

// Shared helper: mutate the evidence static report, re-bind its digest in the bundle,
// and persist both so each case starts from an otherwise valid fixture.
function rewriteStaticReport(
  evidenceRoot: string,
  bundle: { static_report: { sha256: string } | null },
  bundlePath: string,
  mutate: (report: Record<string, any>) => void,
): void {
  const reportPath = path.join(evidenceRoot, "static-report.json");
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  mutate(report);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  bundle.static_report!.sha256 = crypto.createHash("sha256").update(fs.readFileSync(reportPath)).digest("hex");
  fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n");
}

// F1-R1 (SRS §3.1): discovery counts the supported candidate population, so its
// successfully analyzed and failed members cannot exceed it.
test("F1-R1: discovered_files below analyzed_files + failed_files is invalid (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);
    rewriteStaticReport(evidenceRoot, bundle, bundlePath, (report) => {
      report.analysis.discovered_files = 0; // analyzed 1 + failed 0 > discovered 0
    });

    const result = validate({ bundlePath, evidenceRoot, repoRoot, currentPath, require: "executed" });

    assert.equal(result.exit_code, 2);
    assert.equal(result.satisfied, false);
    assert.equal(result.static, "invalid");
  } finally {
    cleanup();
  }
});

// F1-R1 control: a generated-exclusion remainder and a partial-analysis failure are
// both authentic, so the invariant is a cover (<=), not equality.
test("F1-R1: exclusion remainder with a partial-analysis failure stays valid (not over-rejected)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);
    rewriteStaticReport(evidenceRoot, bundle, bundlePath, (report) => {
      report.analysis.status = "incomplete";
      report.analysis.reason = "input_failure";
      report.analysis.discovered_files = 3; // 1 analyzed + 1 failed + 1 generated exclusion
      report.analysis.analyzed_files = 1;
      report.analysis.analyzed_tests = 1;
      report.analysis.failed_files = 1;
      report.diagnostics = [{ code: "parse_failed", path: "tests/calc.test.ts", message: "parse failed" }];
      report.exit_code = 2;
    });

    const result = validate({ bundlePath, evidenceRoot, repoRoot, currentPath, require: "executed" });

    assert.equal(result.static, "incomplete");
    assert.equal(result.exit_code, 0);
    assert.deepEqual(result.issues, []);
  } finally {
    cleanup();
  }
});

// F1-R2 (SRS §3.2): the diagnostics channel is failure-only; a complete scan cannot
// carry one, and unknown codes must stay failures rather than becoming success.
test("F1-R2: complete report carrying a known failure diagnostic is invalid (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);
    rewriteStaticReport(evidenceRoot, bundle, bundlePath, (report) => {
      report.diagnostics = [{ code: "parse_failed", path: "tests/calc.test.ts", message: "parse failed" }];
    });

    const result = validate({ bundlePath, evidenceRoot, repoRoot, currentPath, require: "executed" });

    assert.equal(result.exit_code, 2);
    assert.equal(result.satisfied, false);
    assert.equal(result.static, "invalid");
  } finally {
    cleanup();
  }
});

test("F1-R2: complete report carrying an unknown diagnostic code is invalid (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);
    rewriteStaticReport(evidenceRoot, bundle, bundlePath, (report) => {
      report.diagnostics = [{ code: "brand_new_failure_code", path: null, message: "unclassified failure" }];
    });

    const result = validate({ bundlePath, evidenceRoot, repoRoot, currentPath, require: "executed" });

    assert.equal(result.exit_code, 2);
    assert.equal(result.static, "invalid");
  } finally {
    cleanup();
  }
});

// F1-R2 control: authentic authorized emptiness has no diagnostic and remains
// not_applicable; any diagnostic contradicts the producer's empty_allowed result.
test("F1-R2: authentic allowed-empty report has no diagnostics", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);
    rewriteStaticReport(evidenceRoot, bundle, bundlePath, (report) => {
      report.scope.files = [];
      report.analysis.status = "not_applicable";
      report.analysis.reason = "empty_allowed";
      report.analysis.discovered_files = 0;
      report.analysis.analyzed_files = 0;
      report.analysis.analyzed_tests = 0;
      report.analysis.failed_files = 0;
      report.diagnostics = [];
      report.exit_code = 3;
    });

    const result = validate({ bundlePath, evidenceRoot, repoRoot, currentPath, require: "executed" });

    assert.equal(result.static, "not_applicable");
    assert.equal(result.exit_code, 0);
    assert.deepEqual(result.issues, []);
  } finally {
    cleanup();
  }
});

test("F1-R2: not_applicable reports with any diagnostic are invalid (exit code 2)", () => {
  for (const diagnostic of [
    { code: "empty_scope", path: null, message: "no analyzable test declarations found" },
    { code: "parse_failed", path: "tests/calc.test.ts", message: "parse failed" },
    { code: "brand_new_failure_code", path: null, message: "unclassified failure" },
  ]) {
    const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
    try {
      const { bundle, bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);
      rewriteStaticReport(evidenceRoot, bundle, bundlePath, (report) => {
        report.scope.files = [];
        report.analysis.status = "not_applicable";
        report.analysis.reason = "empty_allowed";
        report.analysis.discovered_files = 0;
        report.analysis.analyzed_files = 0;
        report.analysis.analyzed_tests = 0;
        report.analysis.failed_files = 0;
        report.diagnostics = [diagnostic];
        report.exit_code = 3;
      });

      const result = validate({ bundlePath, evidenceRoot, repoRoot, currentPath, require: "executed" });

      assert.equal(result.static, "invalid", diagnostic.code);
      assert.equal(result.satisfied, false, diagnostic.code);
      assert.equal(result.exit_code, 2, diagnostic.code);
    } finally {
      cleanup();
    }
  }
});

// SEC-1-R1: an over-budget artifact array is rejected before any dependent traversal,
// including the failure -> captured-artifact lookup.
test("SEC-1-R1: oversized artifact array is rejected without dependent element traversal", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundle, bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);
    const oversizedArtifacts = Array.from({ length: 33 }, (_unused, index) => ({
      path: "../escape-" + index + ".md",
      sha256: "a".repeat(64),
    }));
    bundle.baseline!.outcome = "assertion_failed";
    bundle.baseline!.exit_code = 1;
    bundle.baseline!.artifacts = oversizedArtifacts;
    bundle.baseline!.failure = {
      test: "tests/calc.test.ts",
      oracle_ref: "oracle.md",
      artifact_path: "not-captured-anywhere.txt",
      marker: "[ORACLE_MARKER:ADD_FAIL]",
    };
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n");

    const result = validate({ bundlePath, evidenceRoot, repoRoot, currentPath, require: "executed" });

    assert.equal(result.exit_code, 2);
    assert.equal(result.satisfied, false);
    assert.equal(result.execution, "invalid");
    assert.ok(result.issues.some((i) => i.code === "INPUT_TOO_LARGE"));
    // No element was validated (no UNSAFE_PATH per entry) and the failure membership
    // lookup never ran (it would have reported an uncaptured artifact_path).
    assert.equal(result.issues.some((i) => i.code === "UNSAFE_PATH"), false);
    assert.equal(result.issues.some((i) => i.path.startsWith("bundle.baseline.artifacts[")), false);
    assert.equal(
      result.issues.some((i) => i.message.includes("failure.artifact_path must name a captured artifact")),
      false,
    );
    // No evidence artifact was read for the rejected execution.
    assert.equal(result.issues.some((i) => i.code === "ARTIFACT_MISSING"), false);
    assert.equal(result.issues.some((i) => i.code === "ARTIFACT_DIGEST_MISMATCH"), false);
  } finally {
    cleanup();
  }
});

// SEC-1-R2: a lexically interleaved sibling must not hide an ancestor/descendant root.
test("SEC-1-R2: interleaved sibling cannot hide an overlapping source root (exit code 2)", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidDeclaredBundle(evidenceRoot, repoRoot);
    const snapshot = JSON.parse(fs.readFileSync(currentPath, "utf8"));
    snapshot.inputs.source.roots = ["src", "src-aux", "src/nested"];
    fs.writeFileSync(currentPath, JSON.stringify(snapshot, null, 2) + "\n");

    const result = validate({ bundlePath, evidenceRoot, repoRoot, currentPath, require: "declared" });

    assert.equal(result.exit_code, 2);
    assert.equal(result.declaration, "invalid");
    assert.ok(result.issues.some((i) => i.path.endsWith("inputs.source.roots")));
  } finally {
    cleanup();
  }
});

// SEC-1-R2 control: distinct components sharing a name prefix are not overlapping.
test("SEC-1-R2: distinct sibling roots sharing a name prefix remain valid", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidDeclaredBundle(evidenceRoot, repoRoot);
    fs.mkdirSync(path.join(repoRoot, "src-aux"), { recursive: true });
    const siblingPath = path.join(repoRoot, "src-aux", "extra.ts");
    fs.writeFileSync(siblingPath, "export function helper(): number {\n  return 1;\n}\n", "utf8");

    const snapshot = JSON.parse(fs.readFileSync(currentPath, "utf8"));
    snapshot.inputs.source.roots = ["src", "src-aux"];
    snapshot.inputs.source.files = [
      { path: "src-aux/extra.ts", sha256: crypto.createHash("sha256").update(fs.readFileSync(siblingPath)).digest("hex") },
      snapshot.inputs.source.files[0],
    ];
    fs.writeFileSync(currentPath, JSON.stringify(snapshot, null, 2) + "\n");

    const result = validate({ bundlePath, evidenceRoot, repoRoot, currentPath, require: "declared" });

    assert.equal(result.exit_code, 0);
    assert.equal(result.satisfied, true);
    assert.deepEqual(result.issues, []);
  } finally {
    cleanup();
  }
});
