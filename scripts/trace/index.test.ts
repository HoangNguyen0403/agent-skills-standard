// scripts/trace/index.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ASSURANCE, UsageError, run } from "./index";

const FIXTURES = path.join(__dirname, "__fixtures__");

/** Writes a throwaway fixture tree and returns its root. */
function writeRoot(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trace-scope-"));
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return root;
}

function codes(payload: { issues: { code: string }[] }): string[] {
  return payload.issues.map((i) => i.code);
}

test("run() exits 0 with zero issues when docs/brd and docs/prd are both absent", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "trace-empty-"));
  const { exitCode, output } = run(["--root", tmp, "--json"]);
  assert.equal(exitCode, 0);
  assert.deepEqual(JSON.parse(output), {
    ok: true,
    assurance_kind: "document_links",
    execution_evidence: "not_evaluated",
    assurance: "document-links-only",
    requested_scope: null,
    required: false,
    slugs: [],
    issues: [],
  });
  const human = run(["--root", tmp]);
  assert.equal(human.exitCode, 0);
  assert.match(human.output, /not_applicable; no requirement sources; no release assurance/);
});

test("run() reports zero issues for the clean fixture", () => {
  const jsonResult = run(["--root", path.join(FIXTURES, "clean"), "--json"]);
  assert.equal(jsonResult.exitCode, 0);
  const parsed = JSON.parse(jsonResult.output);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.assurance_kind, "document_links");
  assert.equal(parsed.execution_evidence, "not_evaluated");
  assert.equal("execution" in parsed, false);
  assert.equal("fault" in parsed, false);
  assert.deepEqual(parsed.issues, []);
  assert.deepEqual(parsed.slugs, ["checkout"]);

  const humanResult = run(["--root", path.join(FIXTURES, "clean")]);
  assert.equal(humanResult.exitCode, 0);
});

test("requested absent scope cannot report success", () => {
  const result = run(["--root", path.join(FIXTURES, "clean"), "--slug", "absent", "--json"]);
  assert.equal(result.exitCode, 1);
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.requested_scope, "absent");
  assert.deepEqual(parsed.slugs, []);
  assert.deepEqual(codes(parsed), ["missing-scope"]);
});

test("an explicit --slug fails even when the root holds no requirement sources", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "trace-scope-empty-"));
  const result = run(["--root", tmp, "--slug", "absent", "--json"]);
  assert.equal(result.exitCode, 1);
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.ok, false);
  assert.deepEqual(codes(parsed), ["missing-scope"]);
});

test("--required passes a matching scope that declares REQ and AC", () => {
  const result = run(["--root", path.join(FIXTURES, "clean"), "--slug", "checkout", "--required", "--json"]);
  assert.equal(result.exitCode, 0);
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.required, true);
  assert.equal(parsed.requested_scope, "checkout");
  assert.equal(parsed.assurance, ASSURANCE);
  assert.deepEqual(parsed.issues, []);
});

test("--required rejects a filename-only scope that declares neither REQ nor AC", () => {
  const root = writeRoot({
    "docs/prd/prd-filenameonly.md": "# PRD: Filename Only\n\nProse only; no governed identifiers here.\n",
  });

  // Optional discovery keeps working: a filename alone is not an invented requirement.
  const optional = run(["--root", root, "--slug", "filenameonly", "--json"]);
  assert.equal(optional.exitCode, 0);
  assert.deepEqual(codes(JSON.parse(optional.output)), []);

  const required = run(["--root", root, "--slug", "filenameonly", "--required", "--json"]);
  assert.equal(required.exitCode, 1);
  const parsed = JSON.parse(required.output);
  assert.equal(parsed.ok, false);
  assert.deepEqual(codes(parsed), ["empty-scope"]);
});

test("--required rejects a scope that declares REQ but no AC", () => {
  const root = writeRoot({
    "docs/prd/prd-partial.md":
      "# PRD: Partial\n\n| Req ID | Requirement |\n| --- | --- |\n| REQ-001 | Requirement without an acceptance criterion |\n",
  });
  const result = run(["--root", root, "--slug", "partial", "--required", "--json"]);
  assert.equal(result.exitCode, 1);
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.ok, false);
  assert.ok(codes(parsed).includes("empty-scope"));
});

test("--required leaves graph checks in force for the selected scope", () => {
  const root = writeRoot({
    "docs/brd/brd-graph.md": "# BRD\n\n- **Objective ID**: BRD-OBJ-001\n",
    "docs/prd/prd-graph.md":
      "# PRD\n\n| Req ID | Requirement | BRD Objective Ref |\n| --- | --- | --- |\n| REQ-001 | Declared | BRD-OBJ-001 |\n\n| AC ID | Linked Req |\n| --- | --- |\n| AC-001 | REQ-001 |\n",
  });
  const result = run(["--root", root, "--slug", "graph", "--required", "--json"]);
  assert.equal(result.exitCode, 1);
  const reported = codes(JSON.parse(result.output));
  assert.ok(reported.includes("orphan-ac"), `expected orphan-ac, got ${reported.join(", ")}`);
  assert.ok(!reported.includes("empty-scope"), "a scope declaring REQ and AC is not empty");
});

test("--required without --slug is a usage error", () => {
  assert.throws(
    () => run(["--root", path.join(FIXTURES, "clean"), "--required"]),
    (error: unknown) => error instanceof UsageError && /--required requires a --slug/.test(error.message),
  );
});

test("--slug rejects empty, flag-shaped, and missing values", () => {
  const root = path.join(FIXTURES, "clean");
  for (const argv of [
    ["--root", root, "--slug"],
    ["--root", root, "--slug", ""],
  ]) {
    assert.throws(
      () => run(argv),
      (error: unknown) => error instanceof UsageError && /--slug requires a nonempty value/.test(error.message),
    );
  }
  assert.throws(
    () => run(["--root", root, "--slug", "--json"]),
    (error: unknown) => error instanceof UsageError && /--slug requires a value, got flag-shaped/.test(error.message),
  );
});

test("missing requested scope fails in the human format too", () => {
  const { exitCode } = run(["--root", path.join(FIXTURES, "clean"), "--slug", "absent"]);
  assert.equal(exitCode, 1);
});

test("run() reports every seeded issue code for the broken fixture and exits 1", () => {
  const { exitCode, output } = run(["--root", path.join(FIXTURES, "broken"), "--json"]);
  assert.equal(exitCode, 1);
  const parsed = JSON.parse(output);
  assert.equal(parsed.ok, false);
  const reported = new Set(codes(parsed));
  for (const expected of [
    "duplicate-id",
    "dangling-ref",
    "malformed-id",
    "orphan-req",
    "orphan-ac",
    "unlinked-req",
    "slug-file-mismatch",
  ]) {
    assert.ok(reported.has(expected), `missing issue code ${expected}`);
  }
});

test("--slug filters both the slug list and the issue list, but graph checks still see the whole repo", () => {
  const { exitCode, output } = run(["--root", path.join(FIXTURES, "broken"), "--slug", "mismatch-a", "--json"]);
  assert.equal(exitCode, 1);
  const parsed = JSON.parse(output);
  assert.deepEqual(parsed.slugs, ["mismatch-a"]);
  assert.ok(parsed.issues.length > 0);
  assert.ok(parsed.issues.every((i: { slug: string }) => i.slug === "mismatch-a"));
  assert.ok(parsed.issues.some((i: { code: string }) => i.code === "slug-file-mismatch"));
});

test("--strict turns a warn-only result into a failure; plain mode leaves it passing", () => {
  const warnRoot = path.join(FIXTURES, "warn-only");

  const plain = run(["--root", warnRoot, "--json"]);
  assert.equal(plain.exitCode, 0);
  const plainParsed = JSON.parse(plain.output);
  assert.equal(plainParsed.ok, true);
  assert.deepEqual(codes(plainParsed), ["unlinked-req"]);

  const strict = run(["--root", warnRoot, "--strict", "--json"]);
  assert.equal(strict.exitCode, 1);
  assert.equal(JSON.parse(strict.output).ok, false);
});

test("--root overrides the docs base path on the human-readable path too", () => {
  const { output } = run(["--root", path.join(FIXTURES, "clean")]);
  assert.match(output, /## checkout/);
  assert.match(output, /BRD-OBJ: 1  REQ: 1  AC: 1  SRS: 1/);
});

test("run() throws a descriptive error when a flag is given without its value", () => {
  assert.throws(() => run(["--root"]), /--root requires a value/);
});
