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
