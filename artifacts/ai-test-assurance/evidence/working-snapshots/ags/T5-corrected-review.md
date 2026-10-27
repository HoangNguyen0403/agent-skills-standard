# Immutable review snapshot T5-corrected

Repository: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala
Base: 92d06c420f6a41f08e11579423e4e3eacdb7880d
Captured: 2026-10-26T22:44:04.250Z

## Tracked diff

diff --git a/scripts/trace/index.test.ts b/scripts/trace/index.test.ts
index 2a202ca5..96e6e680 100644
--- a/scripts/trace/index.test.ts
+++ b/scripts/trace/index.test.ts
@@ -12,20 +12,32 @@ test("run() exits 0 with zero issues when docs/brd and docs/prd are both absent"
   const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "trace-empty-"));
   const { exitCode, output } = run(["--root", tmp, "--json"]);
   assert.equal(exitCode, 0);
-  assert.deepEqual(JSON.parse(output), { ok: true, slugs: [], issues: [] });
+  assert.deepEqual(JSON.parse(output), {
+    ok: true,
+    assurance_kind: "document_links",
+    execution_evidence: "not_evaluated",
+    slugs: [],
+    issues: [],
+  });
+  const human = run(["--root", tmp]);
+  assert.equal(human.exitCode, 0);
+  assert.match(human.output, /not_applicable; no requirement sources; no release assurance/);
 });
 
-test("run() reports zero issues for the clean fixture and marks its AC covered", () => {
+test("run() reports zero issues for the clean fixture and marks its AC covered with document links", () => {
   const jsonResult = run(["--root", path.join(FIXTURES, "clean"), "--json"]);
   assert.equal(jsonResult.exitCode, 0);
   const parsed = JSON.parse(jsonResult.output);
   assert.equal(parsed.ok, true);
+  assert.equal(parsed.assurance_kind, "document_links");
+  assert.equal(parsed.execution_evidence, "not_evaluated");
+  assert.equal("execution" in parsed, false);
+  assert.equal("fault" in parsed, false);
   assert.deepEqual(parsed.issues, []);
   assert.deepEqual(parsed.slugs, ["checkout"]);
-
   const humanResult = run(["--root", path.join(FIXTURES, "clean")]);
   assert.equal(humanResult.exitCode, 0);
-  assert.match(humanResult.output, /AC-001\s+Covered/);
+  assert.match(humanResult.output, /AC-001\s+Linked \(document only\)/);
 });
 
 test("run() reports every seeded issue code for the broken fixture and exits 1", () => {
diff --git a/scripts/trace/index.ts b/scripts/trace/index.ts
index 5852f933..661d2398 100644
--- a/scripts/trace/index.ts
+++ b/scripts/trace/index.ts
@@ -16,15 +16,21 @@ function countByKind(trace: SlugTrace, kind: IdKind): number {
 }
 
 /** Per-AC status for the human coverage table: cheap, slug-scoped heuristic (not asserted by tests). */
-function acStatuses(trace: SlugTrace, issues: TraceIssue[]): Map<string, "Covered" | "Partial" | "Missing"> {
+function acStatuses(
+  trace: SlugTrace,
+  issues: TraceIssue[],
+): Map<string, "Linked (document only)" | "Partially linked (upstream gap)" | "Unlinked (missing link)"> {
   const missing = new Set(issues.filter((i) => i.code === "orphan-ac" && i.slug === trace.slug).map((i) => i.id));
   const slugHasUpstreamGap = issues.some(
     (i) => i.slug === trace.slug && (i.code === "orphan-req" || i.code === "unlinked-req"),
   );
-  const statuses = new Map<string, "Covered" | "Partial" | "Missing">();
+  const statuses = new Map<
+    string,
+    "Linked (document only)" | "Partially linked (upstream gap)" | "Unlinked (missing link)"
+  >();
   for (const id of trace.declared.get("AC") ?? []) {
-    if (missing.has(id)) statuses.set(id, "Missing");
-    else statuses.set(id, slugHasUpstreamGap ? "Partial" : "Covered");
+    if (missing.has(id)) statuses.set(id, "Unlinked (missing link)");
+    else statuses.set(id, slugHasUpstreamGap ? "Partially linked (upstream gap)" : "Linked (document only)");
   }
   return statuses;
 }
@@ -69,8 +75,17 @@ export function run(argv: string[] = process.argv.slice(2)): { exitCode: number;
   const strict = argv.includes("--strict");
 
   if (hasNoRequirementSources(root)) {
-    const message = "no requirement sources found: docs/brd/ and docs/prd/ are absent (nothing to mint or audit yet)";
-    const output = json ? JSON.stringify({ ok: true, slugs: [], issues: [] }) : message;
+    const message =
+      "no requirement sources found: docs/brd/ and docs/prd/ are absent (not_applicable; no requirement sources; no release assurance; nothing to mint or audit yet)";
+    const output = json
+      ? JSON.stringify({
+          ok: true,
+          assurance_kind: "document_links",
+          execution_evidence: "not_evaluated",
+          slugs: [],
+          issues: [],
+        })
+      : message;
     return { exitCode: 0, output };
   }
 
@@ -88,6 +103,8 @@ export function run(argv: string[] = process.argv.slice(2)): { exitCode: number;
       exitCode: ok ? 0 : 1,
       output: JSON.stringify({
         ok,
+        assurance_kind: "document_links",
+        execution_evidence: "not_evaluated",
         slugs: slugs.map((s) => s.slug),
         issues: issues.map((i) => ({
           code: i.code,


## Added scripts/test-assurance/__fixtures__/evidence/oracle.md
sha256=bd7b56d8c6b420d0cdcb0fe6d390d1e3f508555a348099037492bf7aab547d81

# Independent Oracle: Addition Specification
Approved requirement: add(a, b) returns algebraic sum of a and b.


## Added scripts/test-assurance/__fixtures__/evidence/output-failed.txt
sha256=4e16dfb88ae916d9684fc419b8ebc3dd5a338c569216e4a2bdf553a7e9ba92de

FAIL tests/calc.test.ts
AssertionError: expected 5, got 6
[ORACLE_MARKER:ADD_FAIL]


## Added scripts/test-assurance/__fixtures__/evidence/output-passed.txt
sha256=c40928e40f5935f6fd742a72e89be5701ac5a3585b8e2cb5e5c3ece8084c759b

PASS tests/calc.test.ts
Tests: 1 passed, 1 total


## Added scripts/test-assurance/__fixtures__/evidence/static-report.json
sha256=f9433de9fe40f280e54401bf9b3a07281e64a65677d371e1f3a773fb32138575

{
  "schema_version": 1,
  "tool": {
    "name": "testguard",
    "version": "0.2.0",
    "commit": null,
    "built_at": null
  },
  "scope": {
    "requested_paths": [
      "tests/calc.test.ts"
    ],
    "effective_mode": "full",
    "files": [
      "tests/calc.test.ts"
    ],
    "excluded": [],
    "unsupported": [],
    "config_applied": false
  },
  "analysis": {
    "status": "complete",
    "reason": "analyzed",
    "discovered_files": 1,
    "analyzed_files": 1,
    "analyzed_tests": 1,
    "failed_files": 0
  },
  "findings": [],
  "diagnostics": [],
  "policy": {
    "blocker_count": 0,
    "status": "no_blocker"
  },
  "exit_code": 0
}


## Added scripts/test-assurance/__fixtures__/fixture-helper.ts
sha256=dd4e426e4087cdb0fe4a06d4dc2a76f4afe938657e6d0d1fd2aa1f45f4547b08

// scripts/test-assurance/__fixtures__/fixture-helper.ts
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  Artifact,
  Bundle,
  Execution,
  InputGroup,
  Intent,
  ScanReport,
  Snapshot,
  VariantManifest,
} from "../types";

export function computeFileSha256(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function setupSampleRepo(repoRoot: string): {
  sourceFiles: Artifact[];
  testFiles: Artifact[];
  depFiles: Artifact[];
  configFiles: Artifact[];
} {
  fs.mkdirSync(path.join(repoRoot, "src"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "tests"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "dependencies"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "config"), { recursive: true });

  const calcPath = path.join(repoRoot, "src", "calc.ts");
  fs.writeFileSync(calcPath, "export function add(a: number, b: number): number {\n  return a + b;\n}\n", "utf8");

  const testPath = path.join(repoRoot, "tests", "calc.test.ts");
  fs.writeFileSync(testPath, 'import { add } from "../src/calc";\nexport function testAdd(): boolean {\n  return add(2, 3) === 5;\n}\n', "utf8");

  const depPath = path.join(repoRoot, "dependencies", "deps.json");
  fs.writeFileSync(depPath, '{\n  "dependencies": {}\n}\n', "utf8");

  const confPath = path.join(repoRoot, "config", "runner.json");
  fs.writeFileSync(confPath, '{\n  "timeout_ms": 5000\n}\n', "utf8");

  return {
    sourceFiles: [{ path: "src/calc.ts", sha256: computeFileSha256(calcPath) }],
    testFiles: [{ path: "tests/calc.test.ts", sha256: computeFileSha256(testPath) }],
    depFiles: [{ path: "dependencies/deps.json", sha256: computeFileSha256(depPath) }],
    configFiles: [{ path: "config/runner.json", sha256: computeFileSha256(confPath) }],
  };
}

export function createCurrentSnapshot(repoRoot: string): Snapshot {
  const files = setupSampleRepo(repoRoot);
  return {
    repository: "test-assurance-repo",
    commit: "0123456789abcdef0123456789abcdef01234567",
    dirty: false,
    inputs: {
      source: { roots: ["src"], files: files.sourceFiles },
      tests: { roots: ["tests"], files: files.testFiles },
      dependencies: { roots: ["dependencies"], files: files.depFiles },
      config: { roots: ["config"], files: files.configFiles },
    },
  };
}

export function setupEvidenceDir(evidenceRoot: string): {
  oracleArtifact: Artifact;
  passedOutputArtifact: Artifact;
  failedOutputArtifact: Artifact;
  variantArtifact: Artifact;
  staticReportArtifact: Artifact;
  marker: string;
} {
  fs.mkdirSync(evidenceRoot, { recursive: true });

  const oraclePath = path.join(evidenceRoot, "oracle.md");
  fs.writeFileSync(oraclePath, "# Independent Oracle: Addition Specification\nApproved requirement: add(a, b) returns algebraic sum of a and b.\n", "utf8");
  const oracleArtifact: Artifact = { path: "oracle.md", sha256: computeFileSha256(oraclePath) };

  const passedPath = path.join(evidenceRoot, "output-passed.txt");
  fs.writeFileSync(passedPath, "PASS tests/calc.test.ts\nTests: 1 passed, 1 total\n", "utf8");
  const passedOutputArtifact: Artifact = { path: "output-passed.txt", sha256: computeFileSha256(passedPath) };

  const marker = "[ORACLE_MARKER:ADD_FAIL]";
  const failedPath = path.join(evidenceRoot, "output-failed.txt");
  fs.writeFileSync(failedPath, `FAIL tests/calc.test.ts\nAssertionError: expected 5, got 6\n${marker}\n`, "utf8");
  const failedOutputArtifact: Artifact = { path: "output-failed.txt", sha256: computeFileSha256(failedPath) };

  const staticReportPath = path.join(evidenceRoot, "static-report.json");
  const reportObj: ScanReport = {
    schema_version: 1,
    tool: {
      name: "testguard",
      version: "0.2.0",
      commit: null,
      built_at: null,
    },
    scope: {
      requested_paths: ["tests/calc.test.ts"],
      effective_mode: "full",
      files: ["tests/calc.test.ts"],
      excluded: [],
      unsupported: [],
      config_applied: false,
    },
    analysis: {
      status: "complete",
      reason: "analyzed",
      discovered_files: 1,
      analyzed_files: 1,
      analyzed_tests: 1,
      failed_files: 0,
    },
    findings: [],
    diagnostics: [],
    policy: {
      blocker_count: 0,
      status: "no_blocker",
    },
    exit_code: 0,
  };
  fs.writeFileSync(staticReportPath, JSON.stringify(reportObj, null, 2) + "\n", "utf8");
  const staticReportArtifact: Artifact = { path: "static-report.json", sha256: computeFileSha256(staticReportPath) };

  return {
    oracleArtifact,
    passedOutputArtifact,
    failedOutputArtifact,
    variantArtifact: { path: "variant.json", sha256: "" }, // updated when variant is generated
    staticReportArtifact,
    marker,
  };
}

export function createValidDeclaredBundle(evidenceRoot: string, repoRoot: string): {
  bundle: Bundle;
  bundlePath: string;
  currentPath: string;
} {
  const snapshot = createCurrentSnapshot(repoRoot);
  const currentPath = path.join(evidenceRoot, "current.json");
  fs.writeFileSync(currentPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  const evidence = setupEvidenceDir(evidenceRoot);

  const intent: Intent = {
    id: "INTENT-001",
    requirements: ["REQ-001"],
    owner: "tester@example.com",
    contract: "add(a, b) returns sum",
    fault: "incorrect return in add",
    layer: "unit",
    cases: ["testAdd"],
    command: "node --test tests/calc.test.ts",
    oracle: {
      ref: evidence.oracleArtifact,
      basis: "approved_requirement",
      owner: "oracle-owner@example.com",
      rationale: "Addition specification approved in SRS §4.1",
    },
    boundaries: {
      real: ["calc.ts"],
      mocked: [],
      justification: "Pure logic unit without dependencies",
    },
  };

  const bundle: Bundle = {
    schema_version: 1,
    trust: "local-untrusted",
    intent,
    baseline: null,
    challenge: null,
    static_report: null,
    review: null,
  };

  const bundlePath = path.join(evidenceRoot, "bundle.json");
  fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n", "utf8");
  return { bundle, bundlePath, currentPath };
}

export function createValidExecutedBundle(evidenceRoot: string, repoRoot: string): {
  bundle: Bundle;
  bundlePath: string;
  currentPath: string;
} {
  const { bundle, bundlePath, currentPath } = createValidDeclaredBundle(evidenceRoot, repoRoot);
  const snapshot = createCurrentSnapshot(repoRoot);
  const evidence = setupEvidenceDir(evidenceRoot);

  const baseline: Execution = {
    id: "EXEC-001",
    intent_id: bundle.intent.id,
    snapshot,
    environment: {
      os: "darwin",
      arch: "arm64",
      runner: "node",
      runner_version: "v20.0.0",
    },
    command: bundle.intent.command,
    outcome: "passed",
    exit_code: 0,
    duration_ms: 120,
    artifacts: [evidence.passedOutputArtifact],
    failure: null,
  };

  bundle.baseline = baseline;
  bundle.static_report = evidence.staticReportArtifact;
  bundle.review = {
    reviewer: "reviewer@example.com",
    decision: "accepted",
    rationale: "Passed local baseline run",
  };

  fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n", "utf8");
  return { bundle, bundlePath, currentPath };
}

export function createValidFaultBundle(evidenceRoot: string, repoRoot: string): {
  bundle: Bundle;
  bundlePath: string;
  currentPath: string;
} {
  const { bundle, bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);
  const baseline = bundle.baseline!;
  const evidence = setupEvidenceDir(evidenceRoot);

  // Challenge snapshot has a mutated calc.ts
  const challengeCalcSha256 = "1111111111111111111111111111111111111111111111111111111111111111";
  const challengeSnapshot: Snapshot = {
    ...baseline.snapshot,
    inputs: {
      ...baseline.snapshot.inputs,
      source: {
        roots: ["src"],
        files: [{ path: "src/calc.ts", sha256: challengeCalcSha256 }],
      },
    },
  };

  const variantManifest: VariantManifest = {
    schema_version: 1,
    changes: [
      {
        path: "src/calc.ts",
        before_sha256: baseline.snapshot.inputs.source.files[0].sha256,
        after_sha256: challengeCalcSha256,
      },
    ],
  };

  const variantPath = path.join(evidenceRoot, "variant.json");
  fs.writeFileSync(variantPath, JSON.stringify(variantManifest, null, 2) + "\n", "utf8");
  const variantArtifact: Artifact = { path: "variant.json", sha256: computeFileSha256(variantPath) };

  const challengeExecution: Execution = {
    id: "EXEC-002",
    intent_id: bundle.intent.id,
    snapshot: challengeSnapshot,
    environment: baseline.environment,
    command: baseline.command,
    outcome: "assertion_failed",
    exit_code: 1,
    duration_ms: 135,
    artifacts: [evidence.failedOutputArtifact],
    failure: {
      test: "tests/calc.test.ts",
      oracle_ref: bundle.intent.oracle.ref.path,
      artifact_path: evidence.failedOutputArtifact.path,
      marker: evidence.marker,
    },
  };

  bundle.challenge = {
    fault_id: "FAULT-ADD-001",
    description: "Addition operator mutates to subtraction",
    variant: variantArtifact,
    execution: challengeExecution,
    adjudication: {
      reviewer: "reviewer@example.com",
      oracle_ref: bundle.intent.oracle.ref.path,
      artifact_path: evidence.failedOutputArtifact.path,
      marker: evidence.marker,
      classification: "intended_assertion",
    },
  };

  fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n", "utf8");
  return { bundle, bundlePath, currentPath };
}


## Added scripts/test-assurance/__fixtures__/repo/config/runner.json
sha256=30f2afbe5ce5c94b5dc44e710c07364b2eac05cababb4cdccb6b466fb901ff91

{
  "timeout_ms": 5000
}


## Added scripts/test-assurance/__fixtures__/repo/dependencies/deps.json
sha256=bfb62e6eafd1bf6db3ca8fa70b6712d62d1ba3562451585ece7bdb56ffcd2f73

{
  "dependencies": {}
}


## Added scripts/test-assurance/__fixtures__/repo/src/calc.ts
sha256=9a30ac96b5d5c1b67eca69e1e2cf0798817d9578c8d7d904a81a67b983b35cba

export function add(a: number, b: number): number {
  return a + b;
}


## Added scripts/test-assurance/__fixtures__/repo/tests/calc.test.ts
sha256=ffd81166e39bd6c6e67ccb9e0ffd48893156546767f31d602775c9040412ee2f

import { add } from "../src/calc";
export function testAdd(): boolean {
  return add(2, 3) === 5;
}


## Added scripts/test-assurance/index.test.ts
sha256=ec9ce1f743d0c32c4107e1977c343e69cdb702c2c37f1543279b76872a2a6d6d

// scripts/test-assurance/index.test.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createValidDeclaredBundle,
  createValidExecutedBundle,
  createValidFaultBundle,
} from "./__fixtures__/fixture-helper";
import { formatHumanOutput, run } from "./index";

function makeTempDirs(): { evidenceRoot: string; repoRoot: string; cleanup: () => void } {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "test-assurance-cli-"));
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

test("run() with --help displays usage and exits 0", () => {
  const { exitCode, output } = run(["--help"]);
  assert.equal(exitCode, 0);
  assert.match(output, /Usage: node --import tsx scripts\/test-assurance\/index\.ts/);
  assert.match(output, /Exit codes:/);
});

test("run() with missing required flags exits 2 and outputs error result", () => {
  const { exitCode, output } = run(["--require", "declared"]);
  assert.equal(exitCode, 2);
  assert.match(output, /INVALID_USAGE/);

  const jsonRun = run(["--require", "declared", "--json"]);
  assert.equal(jsonRun.exitCode, 2);
  const parsed = JSON.parse(jsonRun.output);
  assert.equal(parsed.exit_code, 2);
  assert.equal(parsed.satisfied, false);
  assert.ok(parsed.issues.some((i: { code: string }) => i.code === "INVALID_USAGE"));
});

test("run() on valid declared bundle with --json outputs valid JSON and exits 0", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidDeclaredBundle(evidenceRoot, repoRoot);

    const { exitCode, output } = run([
      "--bundle", bundlePath,
      "--evidence-root", evidenceRoot,
      "--repo-root", repoRoot,
      "--current", currentPath,
      "--require", "declared",
      "--json",
    ]);

    assert.equal(exitCode, 0);
    const parsed = JSON.parse(output);
    assert.equal(parsed.schema_version, 1);
    assert.equal(parsed.trust, "local-untrusted");
    assert.equal(parsed.requested, "declared");
    assert.equal(parsed.satisfied, true);
    assert.equal(parsed.declaration, "valid");
    assert.equal(parsed.freshness, "not_applicable");
    assert.equal(parsed.exit_code, 0);
  } finally {
    cleanup();
  }
});

test("run() on valid executed bundle human output formats dimensions correctly", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    const { exitCode, output } = run([
      "--bundle", bundlePath,
      "--evidence-root", evidenceRoot,
      "--repo-root", repoRoot,
      "--current", currentPath,
      "--require", "executed",
    ]);

    assert.equal(exitCode, 0);
    assert.match(output, /Trust:\s+local-untrusted/);
    assert.match(output, /Requested:\s+executed/);
    assert.match(output, /Satisfied:\s+yes/);
    assert.match(output, /Execution:\s+passed/);
    assert.match(output, /Freshness:\s+current/);
  } finally {
    cleanup();
  }
});

test("run() on stale inventory exits 1 under --json", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    // Cause staleness by editing source file
    fs.writeFileSync(path.join(repoRoot, "src", "calc.ts"), "export function add() { return 999; }\n");

    const { exitCode, output } = run([
      "--bundle", bundlePath,
      "--evidence-root", evidenceRoot,
      "--repo-root", repoRoot,
      "--current", currentPath,
      "--require", "executed",
      "--json",
    ]);

    assert.equal(exitCode, 1);
    const parsed = JSON.parse(output);
    assert.equal(parsed.exit_code, 1);
    assert.equal(parsed.satisfied, false);
    assert.equal(parsed.freshness, "stale");
  } finally {
    cleanup();
  }
});

test("run() on tampered artifact exits 2 under --json", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidExecutedBundle(evidenceRoot, repoRoot);

    // Tamper with output artifact
    fs.writeFileSync(path.join(evidenceRoot, "output-passed.txt"), "TAMPERED\n");

    const { exitCode, output } = run([
      "--bundle", bundlePath,
      "--evidence-root", evidenceRoot,
      "--repo-root", repoRoot,
      "--current", currentPath,
      "--require", "executed",
      "--json",
    ]);

    assert.equal(exitCode, 2);
    const parsed = JSON.parse(output);
    assert.equal(parsed.exit_code, 2);
    assert.equal(parsed.satisfied, false);
    assert.equal(parsed.execution, "invalid");
  } finally {
    cleanup();
  }
});

test("F7: run() with unknown CLI argument rejects with exit 2 and INVALID_USAGE under --json", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidDeclaredBundle(evidenceRoot, repoRoot);

    const { exitCode, output } = run([
      "--bundle", bundlePath,
      "--evidence-root", evidenceRoot,
      "--repo-root", repoRoot,
      "--current", currentPath,
      "--require", "declared",
      "--unsupported-policy", "strict",
      "--json",
    ]);

    assert.equal(exitCode, 2);
    const parsed = JSON.parse(output);
    assert.equal(parsed.exit_code, 2);
    assert.equal(parsed.satisfied, false);
    assert.ok(parsed.issues.some((i: { code: string }) => i.code === "INVALID_USAGE"));
  } finally {
    cleanup();
  }
});


## Added scripts/test-assurance/index.ts
sha256=86e5734eb5c13a22aa5faae6aa88a56587aa4a954db1b8f70fc1e83df658a41e

// scripts/test-assurance/index.ts
import fs from "node:fs";
import path from "node:path";
import { validate, type ValidateOptions } from "./validate";
import type { AssuranceRequirement, ValidationResult } from "./types";

type ParsedArgs = {
  bundle?: string;
  evidenceRoot?: string;
  repoRoot?: string;
  current?: string;
  require?: string;
  json: boolean;
  help: boolean;
  unknownTokens: string[];
  missingValueFlags: string[];
};

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    json: false,
    help: false,
    unknownTokens: [],
    missingValueFlags: [],
  };
  const VALUED_FLAGS: Record<string, true> = {
    "--bundle": true,
    "--evidence-root": true,
    "--repo-root": true,
    "--current": true,
    "--require": true,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      parsed.help = true;
    } else if (token === "--json") {
      parsed.json = true;
    } else if (token in VALUED_FLAGS) {
      if (i + 1 >= argv.length || argv[i + 1].startsWith("--")) {
        parsed.missingValueFlags.push(token);
      } else {
        const val = argv[++i];
        if (token === "--bundle") parsed.bundle = val;
        else if (token === "--evidence-root") parsed.evidenceRoot = val;
        else if (token === "--repo-root") parsed.repoRoot = val;
        else if (token === "--current") parsed.current = val;
        else if (token === "--require") parsed.require = val;
      }
    } else {
      parsed.unknownTokens.push(token);
    }
  }
  return parsed;
}

export function formatHumanOutput(result: ValidationResult): string {
  const lines: string[] = [
    "AI Test Assurance Validation Summary",
    "-----------------------------------",
    `Trust:       ${result.trust}`,
    `Requested:   ${result.requested}`,
    `Satisfied:   ${result.satisfied ? "yes" : "no"}`,
    `Declaration: ${result.declaration}`,
    `Static:      ${result.static}`,
    `Execution:   ${result.execution}`,
    `Fault:       ${result.fault}`,
    `Freshness:   ${result.freshness}`,
    `Review:      ${result.review}`,
    `Exit Code:   ${result.exit_code}`,
  ];

  if (result.issues.length > 0) {
    lines.push("\nIssues:");
    for (const iss of result.issues) {
      lines.push(`  [${iss.code}] ${iss.path}: ${iss.message}`);
    }
  }
  return lines.join("\n");
}

export function run(argv: string[] = process.argv.slice(2)): { exitCode: number; output: string } {
  const parsed = parseArgs(argv);

  if (parsed.help) {
    const help = [
      "Usage: node --import tsx scripts/test-assurance/index.ts [options]",
      "",
      "Options:",
      "  --bundle <path>         Path to bundle.json (required)",
      "  --evidence-root <path>  Directory root for evidence artifacts (required)",
      "  --repo-root <path>      Directory root of repository under test (required)",
      "  --current <path>        Path to current.json snapshot (required)",
      "  --require <level>       Required assurance level: declared | executed | fault (required)",
      "  --json                  Output result as JSON object with newline",
      "  --help, -h              Show this help message",
      "",
      "Exit codes:",
      "  0: Satisfied required assurance level without stale or invalid conditions",
      "  1: Stale input inventory, insufficient evidence for level, or rejected review",
      "  2: Invalid arguments, malformed schemas, unreadable inputs, missing artifacts",
    ].join("\n");
    return { exitCode: 0, output: help };
  }

  // F7: Reject unknown tokens or missing values
  if (parsed.unknownTokens.length > 0 || parsed.missingValueFlags.length > 0) {
    const issues = [
      ...parsed.unknownTokens.map(() => ({
        code: "INVALID_USAGE",
        path: "arguments",
        message: "Unknown command-line argument",
      })),
      ...parsed.missingValueFlags.map((flag) => ({
        code: "INVALID_USAGE",
        path: flag,
        message: `Missing required value for flag: ${flag}`,
      })),
    ];

    const errorResult: ValidationResult = {
      schema_version: 1,
      trust: "local-untrusted",
      requested: (parsed.require as AssuranceRequirement) ?? "declared",
      satisfied: false,
      declaration: "invalid",
      static: "invalid",
      execution: "invalid",
      fault: "invalid",
      freshness: "invalid",
      review: "absent",
      issues,
      exit_code: 2,
    };

    const output = parsed.json ? JSON.stringify(errorResult) : formatHumanOutput(errorResult);
    return { exitCode: 2, output };
  }

  const { bundle: bundlePath, evidenceRoot, repoRoot, current: currentPath, require: requireVal } = parsed;

  if (!bundlePath || !evidenceRoot || !repoRoot || !currentPath || !requireVal) {
    const missing: string[] = [];
    if (!bundlePath) missing.push("--bundle");
    if (!evidenceRoot) missing.push("--evidence-root");
    if (!repoRoot) missing.push("--repo-root");
    if (!currentPath) missing.push("--current");
    if (!requireVal) missing.push("--require");

    const issues = missing.map((flag) => ({
      code: "INVALID_USAGE",
      path: flag,
      message: `Missing required command-line flag: ${flag}`,
    }));

    const errorResult: ValidationResult = {
      schema_version: 1,
      trust: "local-untrusted",
      requested: (requireVal as AssuranceRequirement) ?? "declared",
      satisfied: false,
      declaration: "invalid",
      static: "invalid",
      execution: "invalid",
      fault: "invalid",
      freshness: "invalid",
      review: "absent",
      issues,
      exit_code: 2,
    };

    const output = parsed.json ? JSON.stringify(errorResult) : formatHumanOutput(errorResult);
    return { exitCode: 2, output };
  }

  const options: ValidateOptions = {
    bundlePath,
    evidenceRoot,
    repoRoot,
    currentPath,
    require: requireVal as AssuranceRequirement,
  };

  const result = validate(options);
  const output = parsed.json ? JSON.stringify(result) : formatHumanOutput(result);
  return { exitCode: result.exit_code, output };
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) return false;
  try {
    const resolvedArgv = fs.realpathSync(process.argv[1]);
    const resolvedSelf = fs.realpathSync(__filename);
    return resolvedArgv === resolvedSelf;
  } catch {
    try {
      return path.resolve(process.argv[1]) === path.resolve(__filename);
    } catch {
      return false;
    }
  }
}

if (isDirectExecution()) {
  const { exitCode, output } = run();
  try {
    process.stdout.write(output + "\n");
    process.exitCode = exitCode;
  } catch {
    process.stderr.write("Failed to write to stdout\n");
    process.exitCode = 2;
  }
}


## Added scripts/test-assurance/io.ts
sha256=b58782cc13cca4e378c9cad4365fb89321c0ed22b477ab0df0d7639dc77cc771

// scripts/test-assurance/io.ts
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Artifact, ValidationIssue } from "./types";

export const MAX_JSON_BYTES = 1024 * 1024; // 1 MiB
export const MAX_EVIDENCE_ARTIFACT_BYTES = 1024 * 1024; // 1 MiB
export const MAX_REPO_INPUT_BYTES = 16 * 1024 * 1024; // 16 MiB

// Per-snapshot bounds across all groups (SRS §6 Addendum)
export const MAX_SELECTED_ROOTS_PER_SNAPSHOT = 128;
export const MAX_INPUT_FILES_PER_SNAPSHOT = 10000;
export const MAX_VISITED_ENTRIES_PER_SNAPSHOT = 20000;
export const MAX_DIRECTORY_DEPTH = 64;

export const MAX_EXECUTION_ARTIFACTS = 32;

export type ReadResult =
  | { ok: true; buffer: Buffer; stat: fs.Stats }
  | { ok: false; code: "ENOENT" | "UNSAFE_PATH" | "INPUT_TOO_LARGE" | "IO_ERROR" };

export function compareLexicographical(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function computeSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function isSha256(val: unknown): val is string {
  return typeof val === "string" && /^[0-9a-f]{64}$/.test(val);
}

export function isCommitHex(val: unknown): val is string {
  return typeof val === "string" && (/^[0-9a-f]{40}$/.test(val) || /^[0-9a-f]{64}$/.test(val));
}

export function isEnoentError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "ENOENT";
}

export function sameFileIdentity(left: fs.BigIntStats, right: fs.BigIntStats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

export function validateRelativePathSecurity(relPath: string): { ok: true } | { ok: false; code: "UNSAFE_PATH" } {
  if (typeof relPath !== "string" || relPath.length === 0) {
    return { ok: false, code: "UNSAFE_PATH" };
  }
  // Reject NUL and control characters (newline, CR, ESC, tabs, C0/C1)
  if (
    /[\x00-\x1f\x7f-\x9f]/.test(relPath) ||
    relPath.includes("\\") ||
    relPath.startsWith("/") ||
    /^[A-Za-z]:/.test(relPath) ||
    relPath.includes("%") ||
    relPath.includes("?") ||
    relPath.includes("#")
  ) {
    return { ok: false, code: "UNSAFE_PATH" };
  }
  const segments = relPath.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return { ok: false, code: "UNSAFE_PATH" };
  }
  return { ok: true };
}

export function inspectContainedPath(
  authorityRoot: string,
  relPath: string,
  expectedKind: "file" | "dir" | "any" = "any",
): { ok: true; canonical: string; stat: fs.Stats } | { ok: false; code: "ENOENT" | "UNSAFE_PATH" | "IO_ERROR" } {
  const pathCheck = validateRelativePathSecurity(relPath);
  if (!pathCheck.ok) return { ok: false, code: "UNSAFE_PATH" };

  const segments = relPath.split("/");
  let current = path.resolve(authorityRoot);
  try {
    for (let i = 0; i < segments.length; i++) {
      current = path.join(current, segments[i]);
      let stat: fs.Stats;
      try {
        stat = fs.lstatSync(current);
      } catch (err: unknown) {
        if (isEnoentError(err)) return { ok: false, code: "ENOENT" };
        return { ok: false, code: "IO_ERROR" };
      }
      if (stat.isSymbolicLink()) {
        return { ok: false, code: "UNSAFE_PATH" };
      }
      // SEC-2: Reject special files (FIFOs, sockets, devices) without opening
      if (!stat.isFile() && !stat.isDirectory()) {
        return { ok: false, code: "UNSAFE_PATH" };
      }
      const isLeaf = i === segments.length - 1;
      if (!isLeaf && !stat.isDirectory()) {
        return { ok: false, code: "UNSAFE_PATH" };
      }
      if (isLeaf) {
        if (expectedKind === "file" && !stat.isFile()) return { ok: false, code: "UNSAFE_PATH" };
        if (expectedKind === "dir" && !stat.isDirectory()) return { ok: false, code: "UNSAFE_PATH" };
      }
    }
    const canonical = fs.realpathSync(current);
    const resolvedAuth = fs.realpathSync(authorityRoot);
    const relCheck = path.relative(resolvedAuth, canonical);
    if (relCheck.startsWith(`..${path.sep}`) || relCheck === ".." || path.isAbsolute(relCheck)) {
      return { ok: false, code: "UNSAFE_PATH" };
    }
    return { ok: true, canonical, stat: fs.lstatSync(current) };
  } catch (err: unknown) {
    if (isEnoentError(err)) return { ok: false, code: "ENOENT" };
    return { ok: false, code: "IO_ERROR" };
  }
}

export function readContainedRegularFile(
  authorityRoot: string,
  relPath: string,
  maxBytes: number,
): ReadResult {
  const inspected = inspectContainedPath(authorityRoot, relPath, "file");
  if (!inspected.ok) return inspected;

  const targetPath = inspected.canonical;
  let fd: number | undefined;
  try {
    const noFollow = fs.constants.O_NOFOLLOW;
    const nonBlocking = fs.constants.O_NONBLOCK;
    const beforeStat = fs.lstatSync(targetPath, { bigint: true });
    if (beforeStat.isSymbolicLink() || !beforeStat.isFile()) {
      return { ok: false, code: "UNSAFE_PATH" };
    }
    if (beforeStat.size > BigInt(maxBytes)) {
      return { ok: false, code: "INPUT_TOO_LARGE" };
    }

    fd = fs.openSync(targetPath, fs.constants.O_RDONLY | noFollow | nonBlocking);
    const openedStat = fs.fstatSync(fd, { bigint: true });
    if (!openedStat.isFile()) {
      return { ok: false, code: "UNSAFE_PATH" };
    }
    if (openedStat.size > BigInt(maxBytes)) {
      return { ok: false, code: "INPUT_TOO_LARGE" };
    }
    if (!sameFileIdentity(beforeStat, openedStat)) {
      return { ok: false, code: "IO_ERROR" };
    }

    const expectedSize = Number(openedStat.size);
    const buffer = Buffer.alloc(expectedSize + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const count = fs.readSync(fd, buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (count === 0) break;
      bytesRead += count;
    }
    if (bytesRead > maxBytes) {
      return { ok: false, code: "INPUT_TOO_LARGE" };
    }
    if (bytesRead !== expectedSize) {
      return { ok: false, code: "IO_ERROR" };
    }

    const afterDescriptor = fs.fstatSync(fd, { bigint: true });
    const afterStat = fs.lstatSync(targetPath, { bigint: true });
    if (!sameFileIdentity(openedStat, afterDescriptor) || !sameFileIdentity(openedStat, afterStat)) {
      return { ok: false, code: "IO_ERROR" };
    }

    return { ok: true, buffer: buffer.subarray(0, bytesRead), stat: fs.lstatSync(targetPath) };
  } catch (err: unknown) {
    if (isEnoentError(err)) return { ok: false, code: "ENOENT" };
    return { ok: false, code: "IO_ERROR" };
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // ignore
      }
    }
  }
}

// SEC-5: Caller-selected JSON read with pre- and post-read descriptor and path identity checks
export function readCallerRegularFile(filePath: string, maxBytes: number): ReadResult {
  const absPath = path.resolve(filePath);
  let fd: number | undefined;
  try {
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(absPath);
    } catch (err: unknown) {
      if (isEnoentError(err)) return { ok: false, code: "ENOENT" };
      return { ok: false, code: "IO_ERROR" };
    }
    if (stat.isSymbolicLink() || !stat.isFile()) {
      return { ok: false, code: "UNSAFE_PATH" };
    }
    if (stat.size > maxBytes) {
      return { ok: false, code: "INPUT_TOO_LARGE" };
    }

    const beforeStat = fs.lstatSync(absPath, { bigint: true });
    fd = fs.openSync(absPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const openedStat = fs.fstatSync(fd, { bigint: true });
    if (!openedStat.isFile() || !sameFileIdentity(beforeStat, openedStat)) {
      return { ok: false, code: "IO_ERROR" };
    }
    if (openedStat.size > BigInt(maxBytes)) {
      return { ok: false, code: "INPUT_TOO_LARGE" };
    }

    const expectedSize = Number(openedStat.size);
    const buffer = Buffer.alloc(expectedSize + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const count = fs.readSync(fd, buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (count === 0) break;
      bytesRead += count;
    }
    if (bytesRead > maxBytes) {
      return { ok: false, code: "INPUT_TOO_LARGE" };
    }
    if (bytesRead !== expectedSize) {
      return { ok: false, code: "IO_ERROR" };
    }

    // SEC-5 post-read identity checks
    const afterDescriptor = fs.fstatSync(fd, { bigint: true });
    let afterStat: fs.BigIntStats;
    try {
      afterStat = fs.lstatSync(absPath, { bigint: true });
    } catch {
      return { ok: false, code: "IO_ERROR" };
    }
    if (afterStat.isSymbolicLink() || !afterStat.isFile()) {
      return { ok: false, code: "UNSAFE_PATH" };
    }
    if (!sameFileIdentity(openedStat, afterDescriptor) || !sameFileIdentity(openedStat, afterStat)) {
      return { ok: false, code: "IO_ERROR" };
    }

    return { ok: true, buffer: buffer.subarray(0, bytesRead), stat };
  } catch (err: unknown) {
    if (isEnoentError(err)) return { ok: false, code: "ENOENT" };
    return { ok: false, code: "IO_ERROR" };
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // ignore
      }
    }
  }
}

export function hasOverlappingRoots(roots: string[]): boolean {
  if (roots.length <= 1) return false;
  const sorted = [...roots].sort(compareLexicographical);
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (current === next || next.startsWith(current + "/")) {
      return true;
    }
  }
  return false;
}

export type TraversalBudget = {
  visitedEntries: number;
  files: number;
};

export function recomputeRepositoryCategoryInventory(
  repoRoot: string,
  roots: string[],
  budget: TraversalBudget,
  issues: ValidationIssue[],
  visitedPaths: Set<string>,
): { ok: true; files: Artifact[] } | { ok: false; isStale: boolean; isInvalid: boolean } {
  const resultFiles: Artifact[] = [];

  for (const rootRel of roots) {
    const depth = rootRel.split("/").length;
    if (depth > MAX_DIRECTORY_DEPTH) {
      issues.push({ code: "INPUT_TOO_LARGE", path: "repository", message: "Directory depth exceeded bound" });
      return { ok: false, isStale: false, isInvalid: true };
    }

    budget.visitedEntries++;
    if (budget.visitedEntries > MAX_VISITED_ENTRIES_PER_SNAPSHOT) {
      issues.push({ code: "INPUT_TOO_LARGE", path: "repository", message: "Visited filesystem entries exceeded bound" });
      return { ok: false, isStale: false, isInvalid: true };
    }

    const inspected = inspectContainedPath(repoRoot, rootRel, "any");
    if (!inspected.ok) {
      if (inspected.code === "ENOENT") {
        return { ok: false, isStale: true, isInvalid: false };
      }
      issues.push({
        code: inspected.code === "UNSAFE_PATH" ? "UNSAFE_PATH" : "UNREADABLE_INPUT",
        path: rootRel,
        message: "Unsafe or unreadable root path in repository",
      });
      return { ok: false, isStale: false, isInvalid: true };
    }

    if (inspected.stat.isFile()) {
      if (!visitedPaths.has(rootRel)) {
        visitedPaths.add(rootRel);
        budget.files++;
        if (budget.files > MAX_INPUT_FILES_PER_SNAPSHOT) {
          issues.push({ code: "INPUT_TOO_LARGE", path: "repository", message: "Total input files exceeded bound" });
          return { ok: false, isStale: false, isInvalid: true };
        }
        const readRes = readContainedRegularFile(repoRoot, rootRel, MAX_REPO_INPUT_BYTES);
        if (!readRes.ok) {
          if (readRes.code === "ENOENT") return { ok: false, isStale: true, isInvalid: false };
          issues.push({
            code: readRes.code === "INPUT_TOO_LARGE" ? "INPUT_TOO_LARGE" : "UNREADABLE_INPUT",
            path: rootRel,
            message: "Cannot read repository input file",
          });
          return { ok: false, isStale: false, isInvalid: true };
        }
        resultFiles.push({ path: rootRel, sha256: computeSha256(readRes.buffer) });
      }
    } else if (inspected.stat.isDirectory()) {
      // Incremental directory enumeration using opendirSync
      const stack: { rel: string; depth: number }[] = [{ rel: rootRel, depth }];

      while (stack.length > 0) {
        const current = stack.pop()!;
        const dirInspected = inspectContainedPath(repoRoot, current.rel, "dir");
        if (!dirInspected.ok) {
          if (dirInspected.code === "ENOENT") return { ok: false, isStale: true, isInvalid: false };
          issues.push({ code: "UNREADABLE_INPUT", path: current.rel, message: "Directory traversal failed" });
          return { ok: false, isStale: false, isInvalid: true };
        }

        let dir: fs.Dir | null = null;
        try {
          dir = fs.opendirSync(dirInspected.canonical);
          let dirent: fs.Dirent | null = null;
          while ((dirent = dir.readSync()) !== null) {
            budget.visitedEntries++;
            if (budget.visitedEntries > MAX_VISITED_ENTRIES_PER_SNAPSHOT) {
              issues.push({ code: "INPUT_TOO_LARGE", path: "repository", message: "Visited filesystem entries exceeded bound" });
              return { ok: false, isStale: false, isInvalid: true };
            }

            const entryRel = `${current.rel}/${dirent.name}`;
            if (dirent.isSymbolicLink()) {
              issues.push({ code: "UNSAFE_PATH", path: entryRel, message: "Symlink encountered in repository tree" });
              return { ok: false, isStale: false, isInvalid: true };
            }

            // SEC-2: Reject special files (FIFOs, sockets, block/char devices)
            if (!dirent.isFile() && !dirent.isDirectory()) {
              issues.push({ code: "UNSAFE_PATH", path: entryRel, message: "Special file encountered in repository tree" });
              return { ok: false, isStale: false, isInvalid: true };
            }

            if (dirent.isDirectory()) {
              const childDepth = current.depth + 1;
              if (childDepth > MAX_DIRECTORY_DEPTH) {
                issues.push({ code: "INPUT_TOO_LARGE", path: "repository", message: "Directory depth exceeded bound" });
                return { ok: false, isStale: false, isInvalid: true };
              }
              stack.push({ rel: entryRel, depth: childDepth });
            } else if (dirent.isFile()) {
              if (!visitedPaths.has(entryRel)) {
                visitedPaths.add(entryRel);
                budget.files++;
                if (budget.files > MAX_INPUT_FILES_PER_SNAPSHOT) {
                  issues.push({ code: "INPUT_TOO_LARGE", path: "repository", message: "Total input files exceeded bound" });
                  return { ok: false, isStale: false, isInvalid: true };
                }
                const fileRead = readContainedRegularFile(repoRoot, entryRel, MAX_REPO_INPUT_BYTES);
                if (!fileRead.ok) {
                  if (fileRead.code === "ENOENT") return { ok: false, isStale: true, isInvalid: false };
                  issues.push({
                    code: fileRead.code === "INPUT_TOO_LARGE" ? "INPUT_TOO_LARGE" : "UNREADABLE_INPUT",
                    path: entryRel,
                    message: "Repository file read failed or exceeded limit",
                  });
                  return { ok: false, isStale: false, isInvalid: true };
                }
                resultFiles.push({ path: entryRel, sha256: computeSha256(fileRead.buffer) });
              }
            }
          }
        } catch {
          issues.push({ code: "UNREADABLE_INPUT", path: current.rel, message: "Directory enumeration failed" });
          return { ok: false, isStale: false, isInvalid: true };
        } finally {
          if (dir !== null) {
            try {
              dir.closeSync();
            } catch {
              // ignore
            }
          }
        }
      }
    }
  }

  resultFiles.sort((a, b) => compareLexicographical(a.path, b.path));
  return { ok: true, files: resultFiles };
}


## Added scripts/test-assurance/schema.ts
sha256=92e7b9ea26a9a502cbfdea34c82c62d16fb8c0eb9beec5b376df72bd2a72b71f

// scripts/test-assurance/schema.ts
import {
  compareLexicographical,
  hasOverlappingRoots,
  isCommitHex,
  isSha256,
  MAX_EXECUTION_ARTIFACTS,
  MAX_INPUT_FILES_PER_SNAPSHOT,
  MAX_SELECTED_ROOTS_PER_SNAPSHOT,
  validateRelativePathSecurity,
} from "./io";
import type {
  Artifact,
  ExcludedItem,
  Execution,
  ExecutionOutcome,
  Intent,
  OracleBasis,
  ScanDiagnostic,
  ScanReport,
  Snapshot,
  TestLayer,
  ValidationIssue,
  VariantManifest,
  Violation,
  ViolationSeverity,
} from "./types";

export function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

// SEC-4: checkExactKeys never reflects unknown property names in issue path or message
export function checkExactKeys(
  obj: unknown,
  allowedKeys: readonly string[],
  pathPrefix: string,
  issues: ValidationIssue[],
): obj is Record<string, unknown> {
  if (!isRecord(obj)) {
    issues.push({
      code: "INVALID_SCHEMA",
      path: pathPrefix,
      message: "Expected object at " + pathPrefix,
    });
    return false;
  }
  const keys = Object.keys(obj);
  const allowedSet = new Set(allowedKeys);
  let valid = true;
  for (const k of keys) {
    if (!allowedSet.has(k)) {
      issues.push({
        code: "UNKNOWN_PROPERTY",
        path: pathPrefix,
        message: "Unknown property at " + pathPrefix,
      });
      valid = false;
    }
  }
  return valid;
}

export function isPathInRoots(filePath: string, roots: string[]): boolean {
  for (const root of roots) {
    if (filePath === root || filePath.startsWith(root + "/")) {
      return true;
    }
  }
  return false;
}

export function validateArtifactObject(
  artifact: unknown,
  pathPrefix: string,
  issues: ValidationIssue[],
): artifact is Artifact {
  if (!checkExactKeys(artifact, ["path", "sha256"], pathPrefix, issues)) return false;
  let ok = true;
  if (typeof artifact.path !== "string" || !validateRelativePathSecurity(artifact.path).ok) {
    issues.push({
      code: typeof artifact.path === "string" && !validateRelativePathSecurity(artifact.path).ok ? "UNSAFE_PATH" : "INVALID_SCHEMA",
      path: pathPrefix + ".path",
      message: "Unsafe or invalid artifact path at " + pathPrefix + ".path",
    });
    ok = false;
  }
  if (!isSha256(artifact.sha256)) {
    issues.push({
      code: "INVALID_SCHEMA",
      path: pathPrefix + ".sha256",
      message: "Invalid artifact sha256 at " + pathPrefix + ".sha256",
    });
    ok = false;
  }
  return ok;
}

export function validateSnapshotObject(
  snapshot: unknown,
  pathPrefix: string,
  issues: ValidationIssue[],
): snapshot is Snapshot {
  if (!checkExactKeys(snapshot, ["repository", "commit", "dirty", "inputs"], pathPrefix, issues)) return false;
  let ok = true;
  if (typeof snapshot.repository !== "string" || snapshot.repository.trim() === "") {
    issues.push({
      code: "INVALID_SCHEMA",
      path: pathPrefix + ".repository",
      message: "Invalid repository at " + pathPrefix + ".repository",
    });
    ok = false;
  }
  if (!isCommitHex(snapshot.commit)) {
    issues.push({
      code: "INVALID_SCHEMA",
      path: pathPrefix + ".commit",
      message: "Invalid commit at " + pathPrefix + ".commit",
    });
    ok = false;
  }
  if (typeof snapshot.dirty !== "boolean") {
    issues.push({
      code: "INVALID_SCHEMA",
      path: pathPrefix + ".dirty",
      message: "Invalid dirty flag at " + pathPrefix + ".dirty",
    });
    ok = false;
  }
  if (!checkExactKeys(snapshot.inputs, ["source", "tests", "dependencies", "config"], pathPrefix + ".inputs", issues)) {
    return false;
  }

  const inputsObj = snapshot.inputs as Record<string, unknown>;
  let totalRoots = 0;
  let totalFiles = 0;

  // Pre-bound check (SEC-1)
  for (const cat of ["source", "tests", "dependencies", "config"] as const) {
    const group = inputsObj[cat];
    if (isRecord(group)) {
      if (Array.isArray(group.roots)) totalRoots += group.roots.length;
      if (Array.isArray(group.files)) totalFiles += group.files.length;
    }
  }

  if (totalRoots > MAX_SELECTED_ROOTS_PER_SNAPSHOT) {
    issues.push({
      code: "INPUT_TOO_LARGE",
      path: pathPrefix + ".inputs",
      message: "Total snapshot roots exceeded bound",
    });
    return false;
  }
  if (totalFiles > MAX_INPUT_FILES_PER_SNAPSHOT) {
    issues.push({
      code: "INPUT_TOO_LARGE",
      path: pathPrefix + ".inputs",
      message: "Total snapshot files exceeded bound",
    });
    return false;
  }

  const seenPaths = new Map<string, string>();
  for (const cat of ["source", "tests", "dependencies", "config"] as const) {
    const group = inputsObj[cat];
    const groupPath = pathPrefix + ".inputs." + cat;
    if (!checkExactKeys(group, ["roots", "files"], groupPath, issues) || !isRecord(group)) {
      ok = false;
      continue;
    }
    const roots = group.roots;
    const files = group.files;
    if (!Array.isArray(roots) || roots.length === 0) {
      issues.push({
        code: "INVALID_SCHEMA",
        path: groupPath + ".roots",
        message: "Roots must be non-empty array at " + groupPath + ".roots",
      });
      ok = false;
    } else {
      const validRoots: string[] = [];
      for (let i = 0; i < roots.length; i++) {
        const root = roots[i];
        if (typeof root !== "string" || !validateRelativePathSecurity(root).ok) {
          issues.push({
            code: "INVALID_SCHEMA",
            path: groupPath + ".roots",
            message: "Root path invalid in " + groupPath + ".roots",
          });
          ok = false;
        } else {
          validRoots.push(root);
        }
      }
      // SEC-1: Sorted prefix overlap check
      if (hasOverlappingRoots(validRoots)) {
        issues.push({
          code: "INVALID_SCHEMA",
          path: groupPath + ".roots",
          message: "Overlapping roots at " + groupPath + ".roots",
        });
        ok = false;
      }
    }

    if (!Array.isArray(files) || files.length === 0) {
      issues.push({
        code: "INVALID_SCHEMA",
        path: groupPath + ".files",
        message: "Files must be non-empty array at " + groupPath + ".files",
      });
      ok = false;
    } else {
      const rootStrings = Array.isArray(roots) ? roots.filter((r): r is string => typeof r === "string") : [];
      for (let i = 0; i < files.length; i++) {
        const fileObj = files[i];
        const filePathPrefix = groupPath + ".files[" + i + "]";
        if (!validateArtifactObject(fileObj, filePathPrefix, issues)) {
          ok = false;
          continue;
        }

        // F6: Deterministic comparator order
        if (i > 0) {
          const prevFile = files[i - 1];
          if (isRecord(prevFile) && typeof prevFile.path === "string") {
            if (compareLexicographical(prevFile.path, fileObj.path) >= 0) {
              issues.push({
                code: "INVALID_SCHEMA",
                path: groupPath + ".files",
                message: "Files must be uniquely sorted lexicographically at " + groupPath + ".files",
              });
              ok = false;
            }
          }
        }

        // F4: Check file membership in approved category roots
        if (!isPathInRoots(fileObj.path, rootStrings)) {
          issues.push({
            code: "INVALID_SCHEMA",
            path: filePathPrefix,
            message: "File does not belong to any category root at " + filePathPrefix,
          });
          ok = false;
        }

        if (seenPaths.has(fileObj.path)) {
          issues.push({
            code: "INVALID_SCHEMA",
            path: filePathPrefix,
            message: "Disjoint category violation: file exists in multiple categories",
          });
          ok = false;
        } else {
          seenPaths.set(fileObj.path, cat);
        }
      }
    }
  }
  return ok;
}

export function validateExecutionObject(
  exec: unknown,
  pathPrefix: string,
  issues: ValidationIssue[],
): exec is Execution {
  if (
    !checkExactKeys(
      exec,
      ["id", "intent_id", "snapshot", "environment", "command", "outcome", "exit_code", "duration_ms", "artifacts", "failure"],
      pathPrefix,
      issues,
    )
  ) {
    return false;
  }
  let ok = true;
  if (typeof exec.id !== "string" || exec.id.trim() === "") {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".id", message: "Invalid id at " + pathPrefix + ".id" });
    ok = false;
  }
  if (typeof exec.intent_id !== "string" || exec.intent_id.trim() === "") {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".intent_id", message: "Invalid intent_id at " + pathPrefix + ".intent_id" });
    ok = false;
  }
  if (!validateSnapshotObject(exec.snapshot, pathPrefix + ".snapshot", issues)) {
    ok = false;
  }
  if (!checkExactKeys(exec.environment, ["os", "arch", "runner", "runner_version"], pathPrefix + ".environment", issues)) {
    ok = false;
  } else {
    const env = exec.environment as Record<string, unknown>;
    for (const key of ["os", "arch", "runner", "runner_version"]) {
      if (typeof env[key] !== "string" || (env[key] as string).trim() === "") {
        issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".environment." + key, message: "Invalid field at " + pathPrefix + ".environment." + key });
        ok = false;
      }
    }
  }
  if (typeof exec.command !== "string" || exec.command.trim() === "") {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".command", message: "Invalid command at " + pathPrefix + ".command" });
    ok = false;
  }
  const validOutcomes: ExecutionOutcome[] = ["passed", "assertion_failed", "build_failed", "setup_failed", "timeout"];
  if (!validOutcomes.includes(exec.outcome as ExecutionOutcome)) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".outcome", message: "Invalid outcome at " + pathPrefix + ".outcome" });
    ok = false;
  }
  if (typeof exec.duration_ms !== "number" || !Number.isFinite(exec.duration_ms) || exec.duration_ms < 0) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".duration_ms", message: "Invalid duration_ms at " + pathPrefix + ".duration_ms" });
    ok = false;
  }

  // Outcome rules (§4.3)
  if (exec.outcome === "passed") {
    if (exec.exit_code !== 0 || exec.failure !== null) {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".exit_code", message: "Passed outcome requires exit_code 0 and failure null at " + pathPrefix });
      ok = false;
    }
  } else if (exec.outcome === "assertion_failed") {
    if (typeof exec.exit_code !== "number" || !Number.isInteger(exec.exit_code) || exec.exit_code === 0 || exec.failure === null) {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".exit_code", message: "assertion_failed requires non-zero integer exit and non-null failure at " + pathPrefix });
      ok = false;
    }
  } else if (exec.outcome === "build_failed" || exec.outcome === "setup_failed") {
    if (typeof exec.exit_code !== "number" || !Number.isInteger(exec.exit_code) || exec.exit_code === 0 || exec.failure !== null) {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".exit_code", message: "build_failed/setup_failed requires non-zero integer exit and failure null at " + pathPrefix });
      ok = false;
    }
  } else if (exec.outcome === "timeout") {
    if (exec.exit_code !== null || exec.failure !== null) {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".exit_code", message: "timeout requires exit_code null and failure null at " + pathPrefix });
      ok = false;
    }
  }

  if (!Array.isArray(exec.artifacts) || exec.artifacts.length === 0) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".artifacts", message: "artifacts must contain at least one output artifact at " + pathPrefix + ".artifacts" });
    ok = false;
  } else {
    if (exec.artifacts.length > MAX_EXECUTION_ARTIFACTS) {
      issues.push({ code: "INPUT_TOO_LARGE", path: pathPrefix + ".artifacts", message: "Too many execution artifacts at " + pathPrefix + ".artifacts" });
      ok = false;
    }
    for (let i = 0; i < exec.artifacts.length; i++) {
      if (!validateArtifactObject(exec.artifacts[i], pathPrefix + ".artifacts[" + i + "]", issues)) {
        ok = false;
      }
    }
  }

  if (exec.failure !== null) {
    if (!checkExactKeys(exec.failure, ["test", "oracle_ref", "artifact_path", "marker"], pathPrefix + ".failure", issues)) {
      ok = false;
    } else {
      const fail = exec.failure as Record<string, unknown>;
      for (const f of ["test", "oracle_ref", "artifact_path", "marker"]) {
        if (typeof fail[f] !== "string" || (fail[f] as string).trim() === "") {
          issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".failure." + f, message: "Invalid field at " + pathPrefix + ".failure." + f });
          ok = false;
        }
      }
      if (Array.isArray(exec.artifacts)) {
        const found = exec.artifacts.some((a) => isRecord(a) && a.path === fail.artifact_path);
        if (!found) {
          issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".failure.artifact_path", message: "failure.artifact_path must name a captured artifact" });
          ok = false;
        }
      }
    }
  }
  return ok;
}

export function validateVariantManifestObject(
  variant: unknown,
  pathPrefix: string,
  issues: ValidationIssue[],
): variant is VariantManifest {
  if (!checkExactKeys(variant, ["schema_version", "changes"], pathPrefix, issues)) return false;
  let ok = true;
  if (variant.schema_version !== 1) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".schema_version", message: "Unknown schema_version" });
    ok = false;
  }
  if (!Array.isArray(variant.changes) || variant.changes.length === 0) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".changes", message: "changes must be non-empty array" });
    ok = false;
  } else {
    for (let i = 0; i < variant.changes.length; i++) {
      const change = variant.changes[i];
      const changePath = pathPrefix + ".changes[" + i + "]";
      if (!checkExactKeys(change, ["path", "before_sha256", "after_sha256"], changePath, issues)) {
        ok = false;
        continue;
      }
      if (typeof change.path !== "string" || !validateRelativePathSecurity(change.path).ok) {
        issues.push({ code: "INVALID_SCHEMA", path: changePath + ".path", message: "Invalid path" });
        ok = false;
      } else if (i > 0) {
        const prevChange = variant.changes[i - 1];
        if (isRecord(prevChange) && typeof prevChange.path === "string") {
          if (compareLexicographical(prevChange.path, change.path) >= 0) {
            issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".changes", message: "changes must be sorted lexicographically by unique path" });
            ok = false;
          }
        }
      }
      const bSha = change.before_sha256;
      const aSha = change.after_sha256;
      if (bSha !== null && !isSha256(bSha)) {
        issues.push({ code: "INVALID_SCHEMA", path: changePath + ".before_sha256", message: "Invalid before_sha256" });
        ok = false;
      }
      if (aSha !== null && !isSha256(aSha)) {
        issues.push({ code: "INVALID_SCHEMA", path: changePath + ".after_sha256", message: "Invalid after_sha256" });
        ok = false;
      }
      if (bSha === null && aSha === null) {
        issues.push({ code: "INVALID_SCHEMA", path: changePath, message: "At least one digest must be non-null" });
        ok = false;
      }
      if (bSha === aSha) {
        issues.push({ code: "INVALID_SCHEMA", path: changePath, message: "before_sha256 and after_sha256 must differ" });
        ok = false;
      }
    }
  }
  return ok;
}

export function validateIntentObject(
  intent: unknown,
  pathPrefix: string,
  issues: ValidationIssue[],
): intent is Intent {
  if (
    !checkExactKeys(
      intent,
      ["id", "requirements", "owner", "contract", "fault", "layer", "cases", "command", "oracle", "boundaries"],
      pathPrefix,
      issues,
    )
  ) {
    return false;
  }
  let ok = true;
  for (const f of ["id", "owner", "contract", "fault", "command"]) {
    if (typeof intent[f] !== "string" || (intent[f] as string).trim() === "") {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + "." + f, message: "Invalid field at " + pathPrefix + "." + f });
      ok = false;
    }
  }
  const validLayers: TestLayer[] = ["unit", "integration", "contract", "e2e"];
  if (!validLayers.includes(intent.layer as TestLayer)) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".layer", message: "Invalid layer at " + pathPrefix + ".layer" });
    ok = false;
  }
  if (!Array.isArray(intent.requirements) || intent.requirements.length === 0 || !intent.requirements.every((r) => typeof r === "string" && r.trim() !== "")) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".requirements", message: "requirements must be non-empty array of strings" });
    ok = false;
  }
  if (!Array.isArray(intent.cases) || intent.cases.length === 0 || !intent.cases.every((c) => typeof c === "string" && c.trim() !== "")) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".cases", message: "cases must be non-empty array of strings" });
    ok = false;
  }
  if (!checkExactKeys(intent.oracle, ["ref", "basis", "owner", "rationale"], pathPrefix + ".oracle", issues)) {
    ok = false;
  } else {
    const ora = intent.oracle as Record<string, unknown>;
    if (!validateArtifactObject(ora.ref, pathPrefix + ".oracle.ref", issues)) ok = false;
    const validBases: OracleBasis[] = ["approved_requirement", "external_specification", "independently_reviewed_example"];
    if (!validBases.includes(ora.basis as OracleBasis)) {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".oracle.basis", message: "Invalid basis at " + pathPrefix + ".oracle.basis" });
      ok = false;
    }
    if (typeof ora.owner !== "string" || ora.owner.trim() === "") {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".oracle.owner", message: "Invalid owner at " + pathPrefix + ".oracle.owner" });
      ok = false;
    }
    if (typeof ora.rationale !== "string" || ora.rationale.trim() === "") {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".oracle.rationale", message: "Invalid rationale at " + pathPrefix + ".oracle.rationale" });
      ok = false;
    }
  }
  if (!checkExactKeys(intent.boundaries, ["real", "mocked", "justification"], pathPrefix + ".boundaries", issues)) {
    ok = false;
  } else {
    const bnd = intent.boundaries as Record<string, unknown>;
    if (!Array.isArray(bnd.real) || !bnd.real.every((r) => typeof r === "string")) {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".boundaries.real", message: "real must be array of strings" });
      ok = false;
    }
    if (!Array.isArray(bnd.mocked) || !bnd.mocked.every((m) => typeof m === "string")) {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".boundaries.mocked", message: "mocked must be array of strings" });
      ok = false;
    }
    if (typeof bnd.justification !== "string" || bnd.justification.trim() === "") {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".boundaries.justification", message: "Invalid justification" });
      ok = false;
    }
  }
  return ok;
}

// F1: Full strict nested validation of TestGuard v0.2 ScanReport (SRS §§3.1-3.2)
export function validateScanReportObject(
  report: unknown,
  issues: ValidationIssue[],
): report is ScanReport {
  if (
    !checkExactKeys(
      report,
      ["schema_version", "tool", "scope", "analysis", "findings", "diagnostics", "policy", "exit_code"],
      "static_report",
      issues,
    )
  ) {
    return false;
  }
  let ok = true;
  if (report.schema_version !== 1) {
    issues.push({ code: "INVALID_SCHEMA", path: "static_report.schema_version", message: "Unknown schema_version" });
    ok = false;
  }

  // 1. Tool validation
  if (!checkExactKeys(report.tool, ["name", "version", "commit", "built_at"], "static_report.tool", issues)) {
    ok = false;
  } else {
    const t = report.tool as Record<string, unknown>;
    if (t.name !== "testguard") {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.tool.name", message: "tool.name must be testguard" });
      ok = false;
    }
    if (typeof t.version !== "string" || t.version.trim() === "") {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.tool.version", message: "Invalid tool.version" });
      ok = false;
    }
    if (t.commit !== null && (typeof t.commit !== "string" || t.commit.trim() === "")) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.tool.commit", message: "Invalid tool.commit" });
      ok = false;
    }
    if (t.built_at !== null && (typeof t.built_at !== "string" || t.built_at.trim() === "")) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.tool.built_at", message: "Invalid tool.built_at" });
      ok = false;
    }
  }

  // 2. Scope validation
  if (
    !checkExactKeys(
      report.scope,
      ["requested_paths", "effective_mode", "files", "excluded", "unsupported", "config_applied"],
      "static_report.scope",
      issues,
    )
  ) {
    ok = false;
  } else {
    const s = report.scope as Record<string, unknown>;
    if (!Array.isArray(s.requested_paths) || s.requested_paths.length === 0 || !s.requested_paths.every((p) => typeof p === "string" && p.trim() !== "")) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.requested_paths", message: "requested_paths must be non-empty array of strings" });
      ok = false;
    }
    if (s.effective_mode !== "full") {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.effective_mode", message: "effective_mode must be full" });
      ok = false;
    }
    if (!Array.isArray(s.files) || !s.files.every((f) => typeof f === "string")) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.files", message: "files must be array of strings" });
      ok = false;
    } else {
      // Check sorted unique
      for (let i = 1; i < s.files.length; i++) {
        if (compareLexicographical(s.files[i - 1] as string, s.files[i] as string) >= 0) {
          issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.files", message: "files must be sorted unique" });
          ok = false;
          break;
        }
      }
    }
    if (!Array.isArray(s.excluded)) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.excluded", message: "excluded must be array" });
      ok = false;
    } else {
      const validReasons = ["default_directory", "generated", "non_test"];
      for (let i = 0; i < s.excluded.length; i++) {
        const item = s.excluded[i];
        if (!checkExactKeys(item, ["path", "reason"], "static_report.scope.excluded[" + i + "]", issues)) {
          ok = false;
          continue;
        }
        if (typeof (item as ExcludedItem).path !== "string" || !validReasons.includes((item as ExcludedItem).reason)) {
          issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.excluded[" + i + "]", message: "Invalid excluded item" });
          ok = false;
        }
      }
    }
    if (!Array.isArray(s.unsupported) || !s.unsupported.every((u) => typeof u === "string")) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.unsupported", message: "unsupported must be array of strings" });
      ok = false;
    } else {
      for (let i = 1; i < s.unsupported.length; i++) {
        if (compareLexicographical(s.unsupported[i - 1] as string, s.unsupported[i] as string) >= 0) {
          issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.unsupported", message: "unsupported must be sorted unique" });
          ok = false;
          break;
        }
      }
    }
    if (s.config_applied !== false) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.config_applied", message: "config_applied must be false" });
      ok = false;
    }
  }

  // 3. Analysis validation
  if (
    !checkExactKeys(
      report.analysis,
      ["status", "reason", "discovered_files", "analyzed_files", "analyzed_tests", "failed_files"],
      "static_report.analysis",
      issues,
    )
  ) {
    ok = false;
  } else {
    const a = report.analysis as Record<string, unknown>;
    const validStatuses = ["complete", "incomplete", "not_applicable", "error"];
    if (!validStatuses.includes(a.status as string)) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.status", message: "Invalid status" });
      ok = false;
    }
    const validReasons = [
      "analyzed",
      "input_failure",
      "empty_scope",
      "empty_allowed",
      "unsupported_scope",
      "invalid_usage",
      "output_failure",
    ];
    if (!validReasons.includes(a.reason as string)) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.reason", message: "Invalid reason" });
      ok = false;
    }
    for (const countKey of ["discovered_files", "analyzed_files", "analyzed_tests", "failed_files"] as const) {
      const val = a[countKey];
      if (typeof val !== "number" || !Number.isInteger(val) || val < 0) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis." + countKey, message: countKey + " must be non-negative integer" });
        ok = false;
      }
    }
  }

  // 4. Findings validation
  let computedBlockerCount = 0;
  if (!Array.isArray(report.findings)) {
    issues.push({ code: "INVALID_SCHEMA", path: "static_report.findings", message: "findings must be array" });
    ok = false;
  } else {
    const validSeverities: ViolationSeverity[] = ["blocker", "warning", "advisory", "info"];
    for (let i = 0; i < report.findings.length; i++) {
      const finding = report.findings[i];
      const findingPath = "static_report.findings[" + i + "]";
      if (!isRecord(finding)) {
        issues.push({ code: "INVALID_SCHEMA", path: findingPath, message: "finding must be object" });
        ok = false;
        continue;
      }
      if (
        typeof finding.rule_id !== "string" ||
        typeof finding.message !== "string" ||
        typeof finding.path !== "string" ||
        !validSeverities.includes(finding.severity as ViolationSeverity)
      ) {
        issues.push({ code: "INVALID_SCHEMA", path: findingPath, message: "Invalid violation properties" });
        ok = false;
      } else {
        if (finding.severity === "blocker") {
          computedBlockerCount++;
        }
      }
      if ("line" in finding && finding.line !== undefined) {
        if (typeof finding.line !== "number" || !Number.isInteger(finding.line) || finding.line < 0) {
          issues.push({ code: "INVALID_SCHEMA", path: findingPath + ".line", message: "line must be non-negative integer" });
          ok = false;
        }
      }
    }
  }

  // 5. Diagnostics validation
  if (!Array.isArray(report.diagnostics)) {
    issues.push({ code: "INVALID_SCHEMA", path: "static_report.diagnostics", message: "diagnostics must be array" });
    ok = false;
  } else {
    for (let i = 0; i < report.diagnostics.length; i++) {
      const diag = report.diagnostics[i];
      const diagPath = "static_report.diagnostics[" + i + "]";
      if (!checkExactKeys(diag, ["code", "path", "message"], diagPath, issues) || !isRecord(diag)) {
        ok = false;
        continue;
      }
      if (typeof diag.code !== "string" || diag.code.trim() === "" || typeof diag.message !== "string") {
        issues.push({ code: "INVALID_SCHEMA", path: diagPath, message: "Invalid diagnostic entry" });
        ok = false;
      }
      if (diag.path !== null && typeof diag.path !== "string") {
        issues.push({ code: "INVALID_SCHEMA", path: diagPath + ".path", message: "Diagnostic path must be string or null" });
        ok = false;
      }
    }
  }

  // 6. Policy validation
  if (!checkExactKeys(report.policy, ["blocker_count", "status"], "static_report.policy", issues)) {
    ok = false;
  } else {
    const p = report.policy as Record<string, unknown>;
    if (typeof p.blocker_count !== "number" || !Number.isInteger(p.blocker_count) || p.blocker_count < 0) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.policy.blocker_count", message: "blocker_count must be non-negative integer" });
      ok = false;
    }
    if (p.status !== "no_blocker" && p.status !== "blocker_found") {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.policy.status", message: "policy status must be no_blocker or blocker_found" });
      ok = false;
    }
  }

  // 7. Exit code validation
  const validExitCodes = [0, 1, 2, 3];
  if (!validExitCodes.includes(report.exit_code)) {
    issues.push({ code: "INVALID_SCHEMA", path: "static_report.exit_code", message: "exit_code must be 0, 1, 2, or 3" });
    ok = false;
  }

  // 8. Cross-field decision and exit precedence invariants (SRS §3.2)
  if (ok) {
    const analysis = report.analysis as ScanReport["analysis"];
    const policy = report.policy as ScanReport["policy"];
    const scope = report.scope as ScanReport["scope"];

    // analyzed_files === scope.files.length
    if (analysis.analyzed_files !== scope.files.length) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.analyzed_files", message: "analyzed_files must equal scope.files.length" });
      ok = false;
    }

    // Blocker count must equal actual count of blocker findings
    if (policy.blocker_count !== computedBlockerCount) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.policy.blocker_count", message: "blocker_count must match count of blocker findings" });
      ok = false;
    }

    // Policy status must match blocker_count
    if (policy.blocker_count > 0 && policy.status !== "blocker_found") {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.policy.status", message: "status must be blocker_found when blocker_count > 0" });
      ok = false;
    }
    if (policy.blocker_count === 0 && policy.status !== "no_blocker") {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.policy.status", message: "status must be no_blocker when blocker_count === 0" });
      ok = false;
    }

    if (analysis.status === "complete") {
      if (analysis.reason !== "analyzed") {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.reason", message: "Complete scan reason must be analyzed" });
        ok = false;
      }
      if (analysis.failed_files > 0) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.failed_files", message: "Complete scan cannot have failed_files > 0" });
        ok = false;
      }
      if (analysis.analyzed_tests === 0) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.analyzed_tests", message: "Complete scan cannot have 0 analyzed_tests" });
        ok = false;
      }
      if (scope.unsupported.length > 0) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.unsupported", message: "Complete scan cannot have unsupported files" });
        ok = false;
      }
      const expectedExit = policy.blocker_count > 0 ? 1 : 0;
      if (report.exit_code !== expectedExit) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.exit_code", message: "Complete scan exit_code must match policy blockers" });
        ok = false;
      }
    } else if (analysis.status === "incomplete") {
      const validIncompleteReasons = ["input_failure", "unsupported_scope", "empty_scope"];
      if (!validIncompleteReasons.includes(analysis.reason)) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.reason", message: "Invalid incomplete reason" });
        ok = false;
      }
      if (report.exit_code !== 2) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.exit_code", message: "incomplete scan must exit 2" });
        ok = false;
      }
    } else if (analysis.status === "not_applicable") {
      if (analysis.reason !== "empty_allowed") {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.reason", message: "not_applicable scan reason must be empty_allowed" });
        ok = false;
      }
      if (report.findings.length > 0 || scope.unsupported.length > 0 || analysis.failed_files > 0 || policy.blocker_count > 0) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.status", message: "not_applicable report cannot have findings, unsupported, or failed files" });
        ok = false;
      }
      if (report.exit_code !== 3) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.exit_code", message: "not_applicable scan must exit 3" });
        ok = false;
      }
    } else if (analysis.status === "error") {
      const validErrorReasons = ["invalid_usage", "output_failure"];
      if (!validErrorReasons.includes(analysis.reason)) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.reason", message: "Invalid error reason" });
        ok = false;
      }
      if (report.exit_code !== 2) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.exit_code", message: "error scan must exit 2" });
        ok = false;
      }
    }
  }
  return ok;
}


## Added scripts/test-assurance/types.ts
sha256=23d129887a4a90e2f7df9b0a41bc692730ee814f4738e8b274cfbb841c1694bc

// scripts/test-assurance/types.ts

export type Artifact = {
  path: string;
  sha256: string;
};

export type OracleBasis =
  | "approved_requirement"
  | "external_specification"
  | "independently_reviewed_example";

export type TestLayer = "unit" | "integration" | "contract" | "e2e";

export type Intent = {
  id: string;
  requirements: string[];
  owner: string;
  contract: string;
  fault: string;
  layer: TestLayer;
  cases: string[];
  command: string;
  oracle: {
    ref: Artifact;
    basis: OracleBasis;
    owner: string;
    rationale: string;
  };
  boundaries: {
    real: string[];
    mocked: string[];
    justification: string;
  };
};

export type InputGroup = {
  roots: string[];
  files: Artifact[];
};

export type Snapshot = {
  repository: string;
  commit: string;
  dirty: boolean;
  inputs: {
    source: InputGroup;
    tests: InputGroup;
    dependencies: InputGroup;
    config: InputGroup;
  };
};

export type ExecutionOutcome =
  | "passed"
  | "assertion_failed"
  | "build_failed"
  | "setup_failed"
  | "timeout";

export type ExecutionEnvironment = {
  os: string;
  arch: string;
  runner: string;
  runner_version: string;
};

export type ExecutionFailure = {
  test: string;
  oracle_ref: string;
  artifact_path: string;
  marker: string;
};

export type Execution = {
  id: string;
  intent_id: string;
  snapshot: Snapshot;
  environment: ExecutionEnvironment;
  command: string;
  outcome: ExecutionOutcome;
  exit_code: number | null;
  duration_ms: number;
  artifacts: Artifact[];
  failure: ExecutionFailure | null;
};

export type VariantChange = {
  path: string;
  before_sha256: string | null;
  after_sha256: string | null;
};

export type VariantManifest = {
  schema_version: 1;
  changes: VariantChange[];
};

export type AdjudicationClassification =
  | "intended_assertion"
  | "unrelated_failure"
  | "invalid_variant";

export type ChallengeAdjudication = {
  reviewer: string;
  oracle_ref: string;
  artifact_path: string;
  marker: string;
  classification: AdjudicationClassification;
};

export type Challenge = {
  fault_id: string;
  description: string;
  variant: Artifact;
  execution: Execution;
  adjudication: ChallengeAdjudication;
};

export type ReviewDecision = "accepted" | "rejected";

export type Review = {
  reviewer: string;
  decision: ReviewDecision;
  rationale: string;
};

export type Bundle = {
  schema_version: 1;
  trust: "local-untrusted";
  intent: Intent;
  baseline: Execution | null;
  challenge: Challenge | null;
  static_report: Artifact | null;
  review: Review | null;
};

export type ViolationSeverity = "blocker" | "warning" | "advisory" | "info";

export type Violation = {
  rule_id: string;
  severity: ViolationSeverity;
  message: string;
  path: string;
  line?: number;
};

export type ScanDiagnostic = {
  code: string;
  path: string | null;
  message: string;
};

export type ExcludedItem = {
  path: string;
  reason: "default_directory" | "generated" | "non_test";
};

export type ScanReportScope = {
  requested_paths: string[];
  effective_mode: "full";
  files: string[];
  excluded: ExcludedItem[];
  unsupported: string[];
  config_applied: false;
};

export type ScanReportAnalysis = {
  status: "complete" | "incomplete" | "not_applicable" | "error";
  reason:
    | "analyzed"
    | "input_failure"
    | "empty_scope"
    | "empty_allowed"
    | "unsupported_scope"
    | "invalid_usage"
    | "output_failure";
  discovered_files: number;
  analyzed_files: number;
  analyzed_tests: number;
  failed_files: number;
};

export type ScanReportPolicy = {
  blocker_count: number;
  status: "no_blocker" | "blocker_found";
};

export type ScanReport = {
  schema_version: 1;
  tool: {
    name: "testguard";
    version: string;
    commit: string | null;
    built_at: string | null;
  };
  scope: ScanReportScope;
  analysis: ScanReportAnalysis;
  findings: Violation[];
  diagnostics: ScanDiagnostic[];
  policy: ScanReportPolicy;
  exit_code: 0 | 1 | 2 | 3;
};

export type AssuranceRequirement = "declared" | "executed" | "fault";

export type ValidationIssue = {
  code: string;
  path: string;
  message: string;
};

export type ValidationResult = {
  schema_version: 1;
  trust: "local-untrusted";
  requested: AssuranceRequirement;
  satisfied: boolean;
  declaration: "valid" | "invalid";
  static: "absent" | "complete" | "incomplete" | "not_applicable" | "invalid";
  execution: "absent" | "passed" | "failed" | "invalid";
  fault: "absent" | "demonstrated" | "not_detected" | "invalid";
  freshness: "not_applicable" | "current" | "stale" | "invalid";
  review: "absent" | "accepted" | "rejected";
  issues: ValidationIssue[];
  exit_code: 0 | 1 | 2;
};


## Added scripts/test-assurance/validate.test.ts
sha256=6de54efc17fdb6cea6da2dadd9f4a20344f33314dc8f828c3eacf4d184f9a323

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

    // Negative analyzed_files
    const badReport1 = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    badReport1.analysis.analyzed_files = -1;
    fs.writeFileSync(reportPath, JSON.stringify(badReport1, null, 2) + "\n");
    bundle.static_report!.sha256 = crypto.createHash("sha256").update(fs.readFileSync(reportPath)).digest("hex");
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n");
    assert.equal(validate({ bundlePath, evidenceRoot, repoRoot, currentPath, require: "executed" }).exit_code, 2);

    // config_applied: true
    const badReport2 = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    badReport2.scope.config_applied = true;
    fs.writeFileSync(reportPath, JSON.stringify(badReport2, null, 2) + "\n");
    bundle.static_report!.sha256 = crypto.createHash("sha256").update(fs.readFileSync(reportPath)).digest("hex");
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n");
    assert.equal(validate({ bundlePath, evidenceRoot, repoRoot, currentPath, require: "executed" }).exit_code, 2);

    // Complete report with exit 3
    const badReport3 = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    badReport3.exit_code = 3;
    fs.writeFileSync(reportPath, JSON.stringify(badReport3, null, 2) + "\n");
    bundle.static_report!.sha256 = crypto.createHash("sha256").update(fs.readFileSync(reportPath)).digest("hex");
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2) + "\n");
    assert.equal(validate({ bundlePath, evidenceRoot, repoRoot, currentPath, require: "executed" }).exit_code, 2);
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


## Added scripts/test-assurance/validate.ts
sha256=bd7a6f01342b23f8a654f5073178b16732791b04c721fb6f50a97465de0a5b51

// scripts/test-assurance/validate.ts
import {
  compareLexicographical,
  computeSha256,
  MAX_EVIDENCE_ARTIFACT_BYTES,
  MAX_JSON_BYTES,
  readCallerRegularFile,
  readContainedRegularFile,
  recomputeRepositoryCategoryInventory,
  type TraversalBudget,
} from "./io";
import {
  checkExactKeys,
  isPathInRoots,
  isRecord,
  validateArtifactObject,
  validateExecutionObject,
  validateIntentObject,
  validateScanReportObject,
  validateSnapshotObject,
  validateVariantManifestObject,
} from "./schema";
import type {
  Artifact,
  AssuranceRequirement,
  Challenge,
  Execution,
  ExecutionEnvironment,
  InputGroup,
  Intent,
  Snapshot,
  ValidationIssue,
  ValidationResult,
  VariantManifest,
} from "./types";

export type ValidateOptions = {
  bundlePath: string;
  evidenceRoot: string;
  repoRoot: string;
  currentPath: string;
  require: AssuranceRequirement;
};

export function compareEnvironment(left: ExecutionEnvironment, right: ExecutionEnvironment): boolean {
  return (
    left.os === right.os &&
    left.arch === right.arch &&
    left.runner === right.runner &&
    left.runner_version === right.runner_version
  );
}

export function compareInputGroupEquality(left: InputGroup, right: InputGroup): boolean {
  if (left.roots.length !== right.roots.length) return false;
  const sortedLeftRoots = [...left.roots].sort(compareLexicographical);
  const sortedRightRoots = [...right.roots].sort(compareLexicographical);
  for (let i = 0; i < sortedLeftRoots.length; i++) {
    if (sortedLeftRoots[i] !== sortedRightRoots[i]) return false;
  }

  if (left.files.length !== right.files.length) return false;
  for (let i = 0; i < left.files.length; i++) {
    if (left.files[i].path !== right.files[i].path || left.files[i].sha256 !== right.files[i].sha256) {
      return false;
    }
  }
  return true;
}

export function compareSnapshotEquality(left: Snapshot, right: Snapshot): boolean {
  return (
    left.repository === right.repository &&
    left.commit === right.commit &&
    left.dirty === right.dirty &&
    compareInputGroupEquality(left.inputs.source, right.inputs.source) &&
    compareInputGroupEquality(left.inputs.tests, right.inputs.tests) &&
    compareInputGroupEquality(left.inputs.dependencies, right.inputs.dependencies) &&
    compareInputGroupEquality(left.inputs.config, right.inputs.config)
  );
}

export function verifyContainedEvidenceArtifact(
  evidenceRoot: string,
  artifact: Artifact,
  maxBytes: number,
  pathPrefix: string,
  issues: ValidationIssue[],
): { ok: true; buffer: Buffer } | { ok: false; code: string } {
  const readRes = readContainedRegularFile(evidenceRoot, artifact.path, maxBytes);
  if (!readRes.ok) {
    if (readRes.code === "ENOENT") {
      issues.push({
        code: "ARTIFACT_MISSING",
        path: pathPrefix + ".path",
        message: "Captured evidence artifact missing from evidence root",
      });
      return { ok: false, code: "ARTIFACT_MISSING" };
    }
    if (readRes.code === "INPUT_TOO_LARGE") {
      issues.push({
        code: "ARTIFACT_TOO_LARGE",
        path: pathPrefix + ".path",
        message: "Captured evidence artifact exceeds maximum size",
      });
      return { ok: false, code: "ARTIFACT_TOO_LARGE" };
    }
    issues.push({
      code: "UNSAFE_PATH",
      path: pathPrefix + ".path",
      message: "Unsafe path or unreadable artifact",
    });
    return { ok: false, code: "UNSAFE_PATH" };
  }

  const computed = computeSha256(readRes.buffer);
  if (computed !== artifact.sha256) {
    issues.push({
      code: "ARTIFACT_DIGEST_MISMATCH",
      path: pathPrefix + ".sha256",
      message: "Captured evidence artifact digest mismatch",
    });
    return { ok: false, code: "ARTIFACT_DIGEST_MISMATCH" };
  }
  return { ok: true, buffer: readRes.buffer };
}

export function validate(options: ValidateOptions): ValidationResult {
  const issues: ValidationIssue[] = [];
  const requested = options.require;
  let exitCodePrecedence: 0 | 1 | 2 = 0;

  let declarationVerdict: "valid" | "invalid" = "valid";
  let staticVerdict: "absent" | "complete" | "incomplete" | "not_applicable" | "invalid" = "absent";
  let executionVerdict: "absent" | "passed" | "failed" | "invalid" = "absent";
  let faultVerdict: "absent" | "demonstrated" | "not_detected" | "invalid" = "absent";
  let freshnessVerdict: "not_applicable" | "current" | "stale" | "invalid" = "not_applicable";
  let reviewVerdict: "absent" | "accepted" | "rejected" = "absent";

  try {
    // 1. Validate requested option
    const validRequires: AssuranceRequirement[] = ["declared", "executed", "fault"];
    if (!validRequires.includes(requested)) {
      issues.push({ code: "INVALID_USAGE", path: "require", message: "Invalid --require flag value" });
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested: requested ?? "declared",
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }

    // 2. Read caller current.json (SEC-5 post-read identity protected)
    const currentRead = readCallerRegularFile(options.currentPath, MAX_JSON_BYTES);
    if (!currentRead.ok) {
      issues.push({
        code: "INVALID_USAGE",
        path: "current",
        message: "Missing, unreadable, or invalid current.json file",
      });
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested,
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }

    let currentParsed: unknown;
    try {
      currentParsed = JSON.parse(currentRead.buffer.toString("utf8"));
    } catch {
      issues.push({ code: "INVALID_SCHEMA", path: "current", message: "current.json is not valid JSON" });
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested,
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }

    const currentIssues: ValidationIssue[] = [];
    if (!validateSnapshotObject(currentParsed, "current", currentIssues)) {
      issues.push(...currentIssues);
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested,
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }
    const currentSnapshot = currentParsed as Snapshot;

    // 3. Inspect repository root
    try {
      const repoStat = fs.lstatSync(options.repoRoot);
      if (repoStat.isSymbolicLink() || !repoStat.isDirectory()) {
        issues.push({ code: "INVALID_USAGE", path: "repo-root", message: "repo-root must be a directory and not a symlink" });
        return {
          schema_version: 1,
          trust: "local-untrusted",
          requested,
          satisfied: false,
          declaration: "invalid",
          static: "invalid",
          execution: "invalid",
          fault: "invalid",
          freshness: "invalid",
          review: "absent",
          issues,
          exit_code: 2,
        };
      }
    } catch {
      issues.push({ code: "INVALID_USAGE", path: "repo-root", message: "repo-root is inaccessible" });
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested,
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }

    // 4. Recompute repository tree against current.json with shared traversal budget (SEC-1)
    let repositoryCurrentTreeMatch = true;
    const traversalBudget: TraversalBudget = { visitedEntries: 0, files: 0 };
    const visitedPaths = new Set<string>();

    for (const cat of ["source", "tests", "dependencies", "config"] as const) {
      const group = currentSnapshot.inputs[cat];
      const recomputed = recomputeRepositoryCategoryInventory(
        options.repoRoot,
        group.roots,
        traversalBudget,
        issues,
        visitedPaths,
      );
      if (!recomputed.ok) {
        if (recomputed.isInvalid) {
          exitCodePrecedence = 2;
          freshnessVerdict = "invalid";
          repositoryCurrentTreeMatch = false;
          break;
        }
        if (recomputed.isStale) {
          repositoryCurrentTreeMatch = false;
        }
      } else {
        if (!compareInputGroupEquality({ roots: group.roots, files: recomputed.files }, group)) {
          repositoryCurrentTreeMatch = false;
        }
      }
    }

    // 5. Read bundle.json (SEC-5 post-read identity protected)
    const bundleRead = readCallerRegularFile(options.bundlePath, MAX_JSON_BYTES);
    if (!bundleRead.ok) {
      issues.push({ code: "INVALID_USAGE", path: "bundle", message: "Cannot read bundle.json" });
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested,
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }

    let bundleParsed: unknown;
    try {
      bundleParsed = JSON.parse(bundleRead.buffer.toString("utf8"));
    } catch {
      issues.push({ code: "INVALID_SCHEMA", path: "bundle", message: "bundle.json is not valid JSON" });
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested,
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }

    if (
      !checkExactKeys(
        bundleParsed,
        ["schema_version", "trust", "intent", "baseline", "challenge", "static_report", "review"],
        "bundle",
        issues,
      )
    ) {
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested,
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }

    const rawBundle = bundleParsed as Record<string, unknown>;
    if (rawBundle.schema_version !== 1) {
      issues.push({ code: "INVALID_SCHEMA", path: "bundle.schema_version", message: "Unknown schema_version" });
      declarationVerdict = "invalid";
      exitCodePrecedence = 2;
    }
    if (rawBundle.trust !== "local-untrusted") {
      issues.push({ code: "INVALID_SCHEMA", path: "bundle.trust", message: "trust must be local-untrusted" });
      declarationVerdict = "invalid";
      exitCodePrecedence = 2;
    }

    // 6. Validate Intent (F5 / SEC-3: validatedIntent is strictly typed and non-null on success)
    let validatedIntent: Intent | null = null;
    const intentIssues: ValidationIssue[] = [];
    if (!validateIntentObject(rawBundle.intent, "bundle.intent", intentIssues)) {
      issues.push(...intentIssues);
      declarationVerdict = "invalid";
      exitCodePrecedence = 2;
    } else {
      validatedIntent = rawBundle.intent;
      const oraArtifactRes = verifyContainedEvidenceArtifact(
        options.evidenceRoot,
        validatedIntent.oracle.ref,
        MAX_EVIDENCE_ARTIFACT_BYTES,
        "bundle.intent.oracle.ref",
        issues,
      );
      if (!oraArtifactRes.ok) {
        declarationVerdict = "invalid";
        exitCodePrecedence = 2;
      }
    }

    // 7. Validate Baseline Execution
    let baselineObj: Execution | null = null;
    if (rawBundle.baseline !== null) {
      const baseIssues: ValidationIssue[] = [];
      if (!validateExecutionObject(rawBundle.baseline, "bundle.baseline", baseIssues)) {
        issues.push(...baseIssues);
        executionVerdict = "invalid";
        exitCodePrecedence = 2;
      } else {
        baselineObj = rawBundle.baseline;
        if (validatedIntent !== null) {
          if (baselineObj.intent_id !== validatedIntent.id) {
            issues.push({ code: "INVALID_SCHEMA", path: "bundle.baseline.intent_id", message: "baseline intent_id does not match intent.id" });
            executionVerdict = "invalid";
            exitCodePrecedence = 2;
          }
          if (baselineObj.command !== validatedIntent.command) {
            issues.push({ code: "INVALID_SCHEMA", path: "bundle.baseline.command", message: "baseline command does not match intent.command" });
            executionVerdict = "invalid";
            exitCodePrecedence = 2;
          }
        }
        for (let i = 0; i < baselineObj.artifacts.length; i++) {
          const art = baselineObj.artifacts[i];
          const artRes = verifyContainedEvidenceArtifact(
            options.evidenceRoot,
            art,
            MAX_EVIDENCE_ARTIFACT_BYTES,
            "bundle.baseline.artifacts[" + i + "]",
            issues,
          );
          if (!artRes.ok) {
            executionVerdict = "invalid";
            exitCodePrecedence = 2;
          }
        }
        if (executionVerdict !== "invalid") {
          executionVerdict = baselineObj.outcome === "passed" ? "passed" : "failed";
        }
      }
    } else {
      executionVerdict = "absent";
    }

    // 8. Validate Challenge (F3, F4, F5/SEC-3)
    if (rawBundle.challenge !== null) {
      if (rawBundle.baseline === null) {
        issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge", message: "Challenge cannot exist without baseline" });
        faultVerdict = "invalid";
        exitCodePrecedence = 2;
      } else if (
        !checkExactKeys(
          rawBundle.challenge,
          ["fault_id", "description", "variant", "execution", "adjudication"],
          "bundle.challenge",
          issues,
        )
      ) {
        faultVerdict = "invalid";
        exitCodePrecedence = 2;
      } else {
        const ch = rawBundle.challenge as Record<string, unknown>;
        let chValid = true;
        if (typeof ch.fault_id !== "string" || ch.fault_id.trim() === "") {
          issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.fault_id", message: "Invalid fault_id" });
          chValid = false;
        }
        if (typeof ch.description !== "string" || ch.description.trim() === "") {
          issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.description", message: "Invalid description" });
          chValid = false;
        }
        if (!validateArtifactObject(ch.variant, "bundle.challenge.variant", issues)) {
          chValid = false;
        }
        if (!validateExecutionObject(ch.execution, "bundle.challenge.execution", issues)) {
          chValid = false;
        }
        if (
          !checkExactKeys(
            ch.adjudication,
            ["reviewer", "oracle_ref", "artifact_path", "marker", "classification"],
            "bundle.challenge.adjudication",
            issues,
          )
        ) {
          chValid = false;
        } else {
          const adj = ch.adjudication as Record<string, unknown>;
          const validClassifications = ["intended_assertion", "unrelated_failure", "invalid_variant"];
          if (!validClassifications.includes(adj.classification as string)) {
            issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.adjudication.classification", message: "Invalid classification" });
            chValid = false;
          }
          for (const k of ["reviewer", "oracle_ref", "artifact_path", "marker"]) {
            if (typeof adj[k] !== "string" || (adj[k] as string).trim() === "") {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.adjudication." + k, message: "Invalid " + k });
              chValid = false;
            }
          }
        }

        if (!chValid) {
          faultVerdict = "invalid";
          exitCodePrecedence = 2;
        } else {
          const challengeObj = ch as unknown as Challenge;
          const chExec = challengeObj.execution;

          // F3: Challenge execution MUST bind to intent.id
          if (validatedIntent !== null) {
            if (chExec.intent_id !== validatedIntent.id) {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.intent_id", message: "challenge intent_id does not match intent.id" });
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            }
          } else {
            faultVerdict = "invalid";
            exitCodePrecedence = 2;
          }

          // Challenge variant artifact read & parse
          const varRes = verifyContainedEvidenceArtifact(
            options.evidenceRoot,
            challengeObj.variant,
            MAX_EVIDENCE_ARTIFACT_BYTES,
            "bundle.challenge.variant",
            issues,
          );
          let variantManifest: VariantManifest | null = null;
          if (!varRes.ok) {
            faultVerdict = "invalid";
            exitCodePrecedence = 2;
          } else {
            try {
              const vParsed = JSON.parse(varRes.buffer.toString("utf8"));
              if (!validateVariantManifestObject(vParsed, "variant_manifest", issues)) {
                faultVerdict = "invalid";
                exitCodePrecedence = 2;
              } else {
                variantManifest = vParsed;
              }
            } catch {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.variant", message: "Variant manifest is not valid JSON" });
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            }
          }

          // Verify captured challenge execution artifacts
          const capturedMap = new Map<string, Buffer>();
          for (let i = 0; i < chExec.artifacts.length; i++) {
            const art = chExec.artifacts[i];
            const artRes = verifyContainedEvidenceArtifact(
              options.evidenceRoot,
              art,
              MAX_EVIDENCE_ARTIFACT_BYTES,
              "bundle.challenge.execution.artifacts[" + i + "]",
              issues,
            );
            if (!artRes.ok) {
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            } else {
              capturedMap.set(art.path, artRes.buffer);
            }
          }

          // Consistency against baseline (F6: property-order independent canonical comparisons)
          if (baselineObj) {
            if (chExec.command !== baselineObj.command) {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.command", message: "Challenge command must match baseline command" });
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            }
            if (!compareEnvironment(chExec.environment, baselineObj.environment)) {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.environment", message: "Challenge environment must match baseline environment" });
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            }
            if (chExec.snapshot.repository !== baselineObj.snapshot.repository) {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.snapshot.repository", message: "Challenge repository must match baseline repository" });
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            }
            if (chExec.snapshot.commit !== baselineObj.snapshot.commit) {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.snapshot.commit", message: "Challenge commit must match baseline commit" });
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            }
            for (const cat of ["tests", "dependencies", "config"] as const) {
              if (!compareInputGroupEquality(chExec.snapshot.inputs[cat], baselineObj.snapshot.inputs[cat])) {
                issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.snapshot.inputs." + cat, message: "Challenge " + cat + " must match baseline" });
                faultVerdict = "invalid";
                exitCodePrecedence = 2;
              }
            }

            // Source roots equality
            const baseSrcRoots = baselineObj.snapshot.inputs.source.roots;
            const chSrcRoots = chExec.snapshot.inputs.source.roots;
            if (
              baseSrcRoots.length !== chSrcRoots.length ||
              baseSrcRoots.some((r, idx) => r !== chSrcRoots[idx])
            ) {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.snapshot.inputs.source.roots", message: "Challenge source roots must match baseline source roots" });
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            }

            // F4: All challenge source files MUST belong to approved source roots
            for (const sf of chExec.snapshot.inputs.source.files) {
              if (!isPathInRoots(sf.path, baseSrcRoots)) {
                issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.snapshot.inputs.source.files", message: "Challenge source file outside approved source roots" });
                faultVerdict = "invalid";
                exitCodePrecedence = 2;
              }
            }

            // F4: Complete source inventory difference & manifest source-root membership
            if (variantManifest && faultVerdict !== "invalid") {
              const baseSrcMap = new Map<string, string>();
              for (const f of baselineObj.snapshot.inputs.source.files) baseSrcMap.set(f.path, f.sha256);
              const chSrcMap = new Map<string, string>();
              for (const f of chExec.snapshot.inputs.source.files) chSrcMap.set(f.path, f.sha256);

              const changedPathsInManifest = new Set<string>();
              for (const c of variantManifest.changes) {
                changedPathsInManifest.add(c.path);

                // F4: Manifest change path must belong to approved source roots
                if (!isPathInRoots(c.path, baseSrcRoots)) {
                  issues.push({ code: "INVALID_SCHEMA", path: "variant_manifest.changes", message: "Variant manifest change path outside approved source roots" });
                  faultVerdict = "invalid";
                  exitCodePrecedence = 2;
                }

                const baseExpected = baseSrcMap.get(c.path) ?? null;
                const chExpected = chSrcMap.get(c.path) ?? null;
                if (c.before_sha256 !== baseExpected) {
                  issues.push({ code: "INVALID_SCHEMA", path: "variant_manifest.changes", message: "before_sha256 does not match baseline source inventory" });
                  faultVerdict = "invalid";
                  exitCodePrecedence = 2;
                }
                if (c.after_sha256 !== chExpected) {
                  issues.push({ code: "INVALID_SCHEMA", path: "variant_manifest.changes", message: "after_sha256 does not match challenge source inventory" });
                  faultVerdict = "invalid";
                  exitCodePrecedence = 2;
                }
              }

              // Check no other differences exist between baseSrcMap and chSrcMap
              const allSrcPaths = new Set([...baseSrcMap.keys(), ...chSrcMap.keys()]);
              for (const p of allSrcPaths) {
                const bSha = baseSrcMap.get(p) ?? null;
                const cSha = chSrcMap.get(p) ?? null;
                if (bSha !== cSha) {
                  if (!changedPathsInManifest.has(p)) {
                    issues.push({ code: "INVALID_SCHEMA", path: "variant_manifest.changes", message: "changes list does not match complete source inventory difference" });
                    faultVerdict = "invalid";
                    exitCodePrecedence = 2;
                  }
                } else {
                  if (changedPathsInManifest.has(p)) {
                    issues.push({ code: "INVALID_SCHEMA", path: "variant_manifest.changes", message: "Identical path listed in variant manifest changes" });
                    faultVerdict = "invalid";
                    exitCodePrecedence = 2;
                  }
                }
              }
            }
          }

          // Fault demonstration judgment (F5/SEC-3: safe against malformed intent)
          if (faultVerdict !== "invalid") {
            if (validatedIntent === null) {
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            } else {
              const adj = challengeObj.adjudication;
              const markerBuf = capturedMap.get(adj.artifact_path);
              const markerFound = markerBuf !== undefined && markerBuf.toString("utf8").includes(adj.marker);

              const isDemonstrated =
                baselineObj !== null &&
                baselineObj.outcome === "passed" &&
                chExec.outcome === "assertion_failed" &&
                adj.classification === "intended_assertion" &&
                adj.reviewer.trim().length > 0 &&
                chExec.failure?.oracle_ref === validatedIntent.oracle.ref.path &&
                adj.oracle_ref === validatedIntent.oracle.ref.path &&
                adj.marker === chExec.failure?.marker &&
                adj.artifact_path === chExec.failure?.artifact_path &&
                markerFound;

              if (isDemonstrated) {
                faultVerdict = "demonstrated";
              } else {
                faultVerdict = "not_detected";
              }
            }
          }
        }
      }
    } else {
      faultVerdict = "absent";
    }

    // 9. Validate Static Report (F1: Full strict TestGuard adapter)
    if (rawBundle.static_report !== null) {
      if (!validateArtifactObject(rawBundle.static_report, "bundle.static_report", issues)) {
        staticVerdict = "invalid";
        exitCodePrecedence = 2;
      } else {
        const repRes = verifyContainedEvidenceArtifact(
          options.evidenceRoot,
          rawBundle.static_report as Artifact,
          MAX_EVIDENCE_ARTIFACT_BYTES,
          "bundle.static_report",
          issues,
        );
        if (!repRes.ok) {
          staticVerdict = "invalid";
          exitCodePrecedence = 2;
        } else {
          try {
            const repParsed = JSON.parse(repRes.buffer.toString("utf8"));
            if (!validateScanReportObject(repParsed, issues)) {
              staticVerdict = "invalid";
              exitCodePrecedence = 2;
            } else {
              if (repParsed.analysis.status === "complete") {
                staticVerdict = "complete";
              } else if (repParsed.analysis.status === "incomplete" || repParsed.analysis.status === "error") {
                staticVerdict = "incomplete";
              } else if (repParsed.analysis.status === "not_applicable") {
                staticVerdict = "not_applicable";
              } else {
                staticVerdict = "invalid";
                exitCodePrecedence = 2;
              }
            }
          } catch {
            issues.push({ code: "INVALID_SCHEMA", path: "bundle.static_report", message: "static_report is not valid JSON" });
            staticVerdict = "invalid";
            exitCodePrecedence = 2;
          }
        }
      }
    } else {
      staticVerdict = "absent";
    }

    // 10. Validate Review
    if (rawBundle.review !== null) {
      if (!checkExactKeys(rawBundle.review, ["reviewer", "decision", "rationale"], "bundle.review", issues)) {
        exitCodePrecedence = 2;
      } else {
        const rev = rawBundle.review as Record<string, unknown>;
        if (typeof rev.reviewer !== "string" || rev.reviewer.trim() === "") {
          issues.push({ code: "INVALID_SCHEMA", path: "bundle.review.reviewer", message: "Invalid reviewer" });
          exitCodePrecedence = 2;
        }
        if (rev.decision !== "accepted" && rev.decision !== "rejected") {
          issues.push({ code: "INVALID_SCHEMA", path: "bundle.review.decision", message: "Invalid decision" });
          exitCodePrecedence = 2;
        } else {
          reviewVerdict = rev.decision;
        }
        if (typeof rev.rationale !== "string") {
          issues.push({ code: "INVALID_SCHEMA", path: "bundle.review.rationale", message: "Invalid rationale" });
          exitCodePrecedence = 2;
        }
      }
    } else {
      reviewVerdict = "absent";
    }

    // 11. Freshness evaluation (F6: Canonical property-order independent snapshot comparison)
    if (freshnessVerdict !== "invalid") {
      if (!repositoryCurrentTreeMatch) {
        freshnessVerdict = "stale";
      } else if (baselineObj !== null) {
        const snapMatches = compareSnapshotEquality(baselineObj.snapshot, currentSnapshot);
        freshnessVerdict = snapMatches ? "current" : "stale";
      } else {
        freshnessVerdict = "not_applicable";
      }
    }
  } catch {
    // Defense-in-depth: any unexpected throw is caught as INVALID_SCHEMA
    issues.push({ code: "INVALID_SCHEMA", path: "validation", message: "Unexpected validation error" });
    exitCodePrecedence = 2;
    declarationVerdict = "invalid";
  }

  // 12. Satisfaction evaluation (F2: ANY invalid condition sets satisfied = false)
  const anyInvalidCondition =
    declarationVerdict === "invalid" ||
    staticVerdict === "invalid" ||
    executionVerdict === "invalid" ||
    faultVerdict === "invalid" ||
    freshnessVerdict === "invalid" ||
    exitCodePrecedence === 2;

  let satisfied = false;
  const isDeclValid = declarationVerdict === "valid";
  const isReviewAccepted = reviewVerdict !== "rejected";
  const isFresh = freshnessVerdict === "current";
  const isNotStale = freshnessVerdict !== "stale" && freshnessVerdict !== "invalid";

  if (!anyInvalidCondition) {
    if (requested === "declared") {
      satisfied = isDeclValid && isNotStale && isReviewAccepted;
    } else if (requested === "executed") {
      satisfied = isDeclValid && executionVerdict === "passed" && isFresh && isReviewAccepted;
    } else if (requested === "fault") {
      satisfied =
        isDeclValid &&
        executionVerdict === "passed" &&
        faultVerdict === "demonstrated" &&
        isFresh &&
        isReviewAccepted;
    }
  }

  // 13. Exit code computation (SRS §5 & F2)
  let exitCode: 0 | 1 | 2 = 0;
  if (anyInvalidCondition) {
    exitCode = 2;
    satisfied = false; // F2: Invariant: satisfied is always false on exit 2
  } else if (
    freshnessVerdict === "stale" ||
    !satisfied ||
    reviewVerdict === "rejected"
  ) {
    exitCode = 1;
    satisfied = false;
    if (!satisfied && !issues.some((i) => i.code === "INSUFFICIENT_EVIDENCE")) {
      issues.push({
        code: "INSUFFICIENT_EVIDENCE",
        path: "requirements",
        message: "Requested assurance level was not satisfied",
      });
    }
    if (reviewVerdict === "rejected" && !issues.some((i) => i.code === "REVIEW_REJECTED")) {
      issues.push({
        code: "REVIEW_REJECTED",
        path: "bundle.review",
        message: "Review record indicates rejection",
      });
    }
    if (freshnessVerdict === "stale" && !issues.some((i) => i.code === "INVENTORY_DRIFT")) {
      issues.push({
        code: "INVENTORY_DRIFT",
        path: "freshness",
        message: "Historical input inventory drift or tree mismatch detected",
      });
    }
  } else {
    exitCode = 0;
  }

  return {
    schema_version: 1,
    trust: "local-untrusted",
    requested,
    satisfied,
    declaration: declarationVerdict,
    static: staticVerdict,
    execution: executionVerdict,
    fault: faultVerdict,
    freshness: freshnessVerdict,
    review: reviewVerdict,
    issues,
    exit_code: exitCode,
  };
}

