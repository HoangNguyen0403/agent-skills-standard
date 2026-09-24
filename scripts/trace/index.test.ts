// scripts/trace/index.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { run } from "./index";

const FIXTURES = path.join(__dirname, "__fixtures__");

test("run() exits 0 with zero issues when docs/brd and docs/prd are both absent", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "trace-empty-"));
  const { exitCode, output } = run(["--root", tmp, "--json"]);
  assert.equal(exitCode, 0);
  assert.deepEqual(JSON.parse(output), { ok: true, slugs: [], issues: [] });
});

test("run() reports zero issues for the clean fixture and marks its AC covered", () => {
  const jsonResult = run(["--root", path.join(FIXTURES, "clean"), "--json"]);
  assert.equal(jsonResult.exitCode, 0);
  const parsed = JSON.parse(jsonResult.output);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.issues, []);
  assert.deepEqual(parsed.slugs, ["checkout"]);

  const humanResult = run(["--root", path.join(FIXTURES, "clean")]);
  assert.equal(humanResult.exitCode, 0);
  assert.match(humanResult.output, /AC-001\s+Covered/);
});

test("run() reports every seeded issue code for the broken fixture and exits 1", () => {
  const { exitCode, output } = run(["--root", path.join(FIXTURES, "broken"), "--json"]);
  assert.equal(exitCode, 1);
  const parsed = JSON.parse(output);
  assert.equal(parsed.ok, false);
  const codes = new Set(parsed.issues.map((i: { code: string }) => i.code));
  for (const expected of [
    "duplicate-id",
    "dangling-ref",
    "malformed-id",
    "orphan-req",
    "orphan-ac",
    "unlinked-req",
    "slug-file-mismatch",
  ]) {
    assert.ok(codes.has(expected), `missing issue code ${expected}`);
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
  assert.deepEqual(
    plainParsed.issues.map((i: { code: string }) => i.code),
    ["unlinked-req"],
  );

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
