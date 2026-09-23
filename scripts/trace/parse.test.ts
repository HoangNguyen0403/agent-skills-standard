// scripts/trace/parse.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hasNoRequirementSources, parseRepo } from "./parse";

const FIXTURES = path.join(__dirname, "__fixtures__");

test("parseRepo ignores id-shaped tokens inside fenced code blocks", () => {
  const slugs = parseRepo(path.join(FIXTURES, "clean"));
  const checkout = slugs.find((s) => s.slug === "checkout");
  assert.ok(checkout, "expected a checkout slug from the clean fixture");
  const seenIds = checkout!.references.map((r) => r.id);
  // The clean SRS file embeds a fenced "### SRS-999 ... REQ-999, AC-999" template
  // example; none of those tokens may surface as real occurrences.
  assert.ok(!seenIds.includes("SRS-999"), "fenced SRS-999 leaked into references");
  assert.ok(!seenIds.includes("REQ-999"), "fenced REQ-999 leaked into references");
  assert.ok(!seenIds.includes("AC-999"), "fenced AC-999 leaked into references");
  assert.ok(!checkout!.declared.get("SRS")?.has("SRS-999"));
});

test("parseRepo scopes declared ids per slug, keeping identical ids in different slugs distinct", () => {
  const slugs = parseRepo(path.join(FIXTURES, "broken"));
  const broken = slugs.find((s) => s.slug === "broken");
  const mismatchA = slugs.find((s) => s.slug === "mismatch-a");
  assert.ok(broken && mismatchA);
  assert.ok(broken!.declared.get("BRD-OBJ")?.has("BRD-OBJ-001"));
  assert.ok(mismatchA!.declared.get("BRD-OBJ")?.has("BRD-OBJ-001"));
});

test("hasNoRequirementSources is fail-open only when both docs/brd and docs/prd are absent", () => {
  const onlySrs = fs.mkdtempSync(path.join(os.tmpdir(), "trace-only-srs-"));
  fs.mkdirSync(path.join(onlySrs, "docs/srs"), { recursive: true });
  fs.writeFileSync(path.join(onlySrs, "docs/srs/srs-x.md"), "# x\n");
  assert.equal(hasNoRequirementSources(onlySrs), true);

  const withPrd = fs.mkdtempSync(path.join(os.tmpdir(), "trace-with-prd-"));
  fs.mkdirSync(path.join(withPrd, "docs/prd"), { recursive: true });
  assert.equal(hasNoRequirementSources(withPrd), false);

  assert.equal(hasNoRequirementSources(path.join(FIXTURES, "clean")), false);
});

/** Writes a minimal slug tree under a fresh temp root and returns the root. */
function writeSlugTree(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trace-tree-"));
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return root;
}

test("a trace matrix restating a heading-declared id is a reference, not a second declaration", () => {
  // The shipped SRS template puts already-declared ids back into a table's
  // first cell (`| BRD-OBJ-001 | REQ-001 | AC-001 | SRS-001 |`). Following the
  // template literally must not raise duplicate-id.
  const root = writeSlugTree({
    "docs/brd/brd-demo.md": "# BRD\n\n- **Objective ID**: BRD-OBJ-001\n",
    "docs/prd/prd-demo.md": [
      "# PRD",
      "",
      "| ID | Statement | BRD |",
      "| --- | --- | --- |",
      "| REQ-001 | do the thing | BRD-OBJ-001 |",
      "",
      "| AC | REQ |",
      "| --- | --- |",
      "| AC-001 | REQ-001 |",
      "",
    ].join("\n"),
    "docs/srs/srs-demo.md": [
      "# SRS",
      "",
      "### SRS-001: the contract",
      "",
      "- **Source**: REQ-001, AC-001",
      "",
      "| BRD-OBJ | REQ | AC | SRS | Evidence |",
      "| --- | --- | --- | --- | --- |",
      "| BRD-OBJ-001 | REQ-001 | AC-001 | SRS-001 | test |",
      "",
      "| SRS | Method | Evidence |",
      "| --- | --- | --- |",
      "| SRS-001 | manual | test |",
      "",
    ].join("\n"),
  });

  const demo = parseRepo(root).find((s) => s.slug === "demo");
  assert.ok(demo, "expected a demo slug");
  const srsDeclarations = demo!.references.filter(
    (r) => r.kind === "SRS" && r.id === "SRS-001" && r.role === "declaration",
  );
  assert.equal(srsDeclarations.length, 1, "SRS-001 must be declared exactly once (the heading)");
  const brdDeclarations = demo!.references.filter(
    (r) => r.kind === "BRD-OBJ" && r.id === "BRD-OBJ-001" && r.role === "declaration",
  );
  assert.equal(brdDeclarations.length, 1, "BRD-OBJ-001 must be declared exactly once (the BRD)");
});

test("srs-task-list-<slug> and srs-walkthrough-<slug> join their feature slug", () => {
  const root = writeSlugTree({
    "docs/prd/prd-demo.md": "# PRD\n\n| ID | Statement |\n| --- | --- |\n| REQ-001 | do it |\n",
    "docs/srs/srs-demo.md": "# SRS\n\n### SRS-001: c\n\n- **Source**: REQ-001\n",
    "docs/srs/srs-task-list-demo.md": "# Tasks\n\nImplements SRS-001.\n",
    "docs/srs/srs-walkthrough-demo.md": "# Walkthrough\n\nProves SRS-001.\n",
  });

  const slugs = parseRepo(root);
  assert.deepEqual(
    slugs.map((s) => s.slug),
    ["demo"],
    "artifact-kind files must not mint phantom slugs",
  );
  assert.equal(slugs[0].files.length, 4);
});
