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

test("F7: run() rejects a bare token that collides with an inherited object property", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidDeclaredBundle(evidenceRoot, repoRoot);

    // "constructor" resolves through Object.prototype; it must not be treated as a
    // valued flag that silently swallows the following token.
    const { exitCode, output } = run([
      "--bundle", bundlePath,
      "--evidence-root", evidenceRoot,
      "--repo-root", repoRoot,
      "--current", currentPath,
      "--require", "declared",
      "--json",
      "constructor", "value",
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

test("SEC-4: an invalid --require value is rejected without being echoed in JSON or human output", () => {
  const { evidenceRoot, repoRoot, cleanup } = makeTempDirs();
  try {
    const { bundlePath, currentPath } = createValidDeclaredBundle(evidenceRoot, repoRoot);
    const supplied = "bogus\nSENTINEL\u001b[2J";
    const baseArgs = [
      "--bundle", bundlePath,
      "--evidence-root", evidenceRoot,
      "--repo-root", repoRoot,
      "--current", currentPath,
      "--require", supplied,
    ];

    const jsonRun = run([...baseArgs, "--json"]);
    assert.equal(jsonRun.exitCode, 2);
    const parsed = JSON.parse(jsonRun.output);
    assert.equal(parsed.exit_code, 2);
    assert.equal(parsed.requested, "declared");
    assert.ok(parsed.issues.some((i: { code: string }) => i.code === "INVALID_USAGE"));
    assert.equal(jsonRun.output.includes("SENTINEL"), false);

    const humanRun = run(baseArgs);
    assert.equal(humanRun.exitCode, 2);
    assert.equal(humanRun.output.includes("SENTINEL"), false);
  } finally {
    cleanup();
  }
});
