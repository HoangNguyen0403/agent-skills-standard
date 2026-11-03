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

test("parseRepo captures complete hyphenated tokens and marks malformed longer IDs invalid", () => {
  const root = writeSlugTree({
    "docs/prd/prd-malformed.md": [
      "# PRD",
      "",
      "| Req ID | Statement |",
      "| --- | --- |",
      "| REQ-001-EXTRA | bad longer id |",
      "| REQ-1 | bad short id |",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const malformedSlug = slugs.find((s) => s.slug === "malformed");
  assert.ok(malformedSlug);
  const refTokens = malformedSlug!.references.map((r) => r.id);
  assert.ok(refTokens.includes("REQ-001-EXTRA"), "must capture complete token REQ-001-EXTRA, not prefix REQ-001");
  assert.ok(refTokens.includes("REQ-1"));
  const extraRef = malformedSlug!.references.find((r) => r.id === "REQ-001-EXTRA");
  assert.equal(extraRef?.valid, false, "malformed longer token must not be marked valid");
});

test("parseRepo resolves explicit source mappings and keeps source declarations distinct from formal counts", () => {
  const root = writeSlugTree({
    "docs/brd/brd-sourced.md": [
      "# BRD",
      "",
      "| Capability | Candidate requirement | Rationale | Out-of-scope pair |",
      "| --- | --- | --- | --- |",
      "| Setup feature | REQ-DISC-001 | clear setup | out of scope |",
      "",
      "- **AC-DISC-001 → REQ-DISC-001:** Acceptance criterion definition.",
      "",
    ].join("\n"),
    "docs/prd/prd-sourced.md": [
      "# PRD",
      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001 | REQ-DISC-001 | Explain setup |",
      "",
      "| AC ID | Source group | Req ID | Preconditions |",
      "| --- | --- | --- | --- |",
      "| AC-001 | AC-DISC-001 | REQ-001 | none |",
      "| AC-002 | AC-DISC-001 | REQ-001 | none |",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const sourced = slugs.find((s) => s.slug === "sourced");
  assert.ok(sourced);
  // Formal declared counts must strictly be 1 REQ and 2 ACs
  assert.equal(sourced!.declared.get("REQ")?.size, 1);
  assert.ok(sourced!.declared.get("REQ")?.has("REQ-001"));
  assert.equal(sourced!.declared.get("AC")?.size, 2);
  assert.ok(sourced!.declared.get("AC")?.has("AC-001"));
  assert.ok(sourced!.declared.get("AC")?.has("AC-002"));

  // Source declared IDs must be segregated
  assert.ok(sourced!.sourceDeclared?.get("REQ")?.has("REQ-DISC-001"));
  assert.ok(sourced!.sourceDeclared?.get("AC")?.has("AC-DISC-001"));

  // Source mappings must record one-to-many refinements
  assert.ok(sourced!.sourceMappings);
  const reqMapping = sourced!.sourceMappings!.find((m) => m.sourceId === "REQ-DISC-001");
  assert.ok(reqMapping);
  assert.equal(reqMapping!.formalId, "REQ-001");

  const acMappings = sourced!.sourceMappings!.filter((m) => m.sourceId === "AC-DISC-001");
  assert.equal(acMappings.length, 2, "AC-DISC-001 must map to both AC-001 and AC-002");
  assert.deepEqual(
    acMappings.map((m) => m.formalId).sort(),
    ["AC-001", "AC-002"],
  );
});

test("parseRepo marks qualified IDs with undersized, missing, or nonnumeric terminal suffix as invalid", () => {
  const root = writeSlugTree({
    "docs/brd/brd-suffixes.md": [
      "# BRD",
      "",
      "| Req ID | Requirement |",
      "| --- | --- |",
      "| REQ-PILOT-01 | undersized suffix |",
      "| REQ-PILOT | missing suffix |",
      "| REQ-PILOT-EXTRA | nonnumeric suffix |",
      "| REQ-PILOT-001 | valid terminal suffix |",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const slug = slugs.find((s) => s.slug === "suffixes");
  assert.ok(slug);
  const refsById = new Map(slug!.references.map((r) => [r.id, r]));
  assert.equal(refsById.get("REQ-PILOT-01")?.valid, false, "REQ-PILOT-01 must be invalid (undersized suffix)");
  assert.equal(refsById.get("REQ-PILOT")?.valid, false, "REQ-PILOT must be invalid (missing terminal suffix)");
  assert.equal(refsById.get("REQ-PILOT-EXTRA")?.valid, false, "REQ-PILOT-EXTRA must be invalid (nonnumeric terminal suffix)");
  assert.equal(refsById.get("REQ-PILOT-001")?.valid, true, "REQ-PILOT-001 must be valid (canonical >=3 digits)");
});

test("bold diagnostic prose mentioning id leaves later namespace tokens as references", () => {
  const root = writeSlugTree({
    "docs/brd/brd-prose.md": [
      "# BRD",
      "",
      "| Capability | Candidate requirement | Rationale | Out-of-scope pair |",
      "| --- | --- | --- | --- |",
      "| Setup | REQ-DISC-001 | clear setup | none |",
      "",
      "- **AC-DISC-001 → REQ-DISC-001:** Setup criterion.",
      "",
    ].join("\n"),
    "docs/prd/prd-prose.md": [
      "# PRD",
      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001 | REQ-DISC-001 | Explain setup |",
      "",
      "| AC ID | Source group | Req ID | Preconditions |",
      "| --- | --- | --- | --- |",
      "| AC-001 | AC-DISC-001 | REQ-001 | none |",
      "",
      "The snapshot reports **zero duplicate-id and zero orphan-ac errors**; preserved `REQ-DISC-*` / `AC-DISC-*` families stay references.",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const prose = slugs.find((s) => s.slug === "prose");
  assert.ok(prose);

  const familyRefs = prose!.references.filter((r) => r.id === "REQ-DISC" || r.id === "AC-DISC");
  assert.equal(familyRefs.length, 2, "prose must surface both family mentions");
  for (const ref of familyRefs) {
    assert.equal(ref.role, "reference", `${ref.id} must not be promoted to a declaration by bold prose`);
    assert.equal(ref.valid, true, `${ref.id} must stay a valid namespace reference`);
    assert.equal(ref.qualified, true);
  }
  assert.deepEqual([...(prose!.declared.get("REQ") ?? [])], ["REQ-001"]);
  assert.deepEqual([...(prose!.declared.get("AC") ?? [])], ["AC-001"]);
});

test("a bold ID field label declares its value while a non-ID label does not", () => {
  const root = writeSlugTree({
    "docs/brd/brd-field.md": "# BRD\n\n- **Objective ID**: BRD-OBJ-001\n",
    "docs/prd/prd-field.md": [
      "# PRD",
      "",
      "- **Req ID**: REQ-001",
      "- **AC ID:** AC-001",
      "- **Source**: REQ-001",
      "- **ID**: REQ-002",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const field = slugs.find((s) => s.slug === "field");
  assert.ok(field);
  assert.ok(field!.declared.get("BRD-OBJ")?.has("BRD-OBJ-001"));
  assert.ok(field!.declared.get("REQ")?.has("REQ-001"));
  assert.ok(field!.declared.get("AC")?.has("AC-001"));
  assert.ok(field!.declared.get("REQ")?.has("REQ-002"), "a bare `**ID**` label must still declare its immediate value");

  const sourceLine = field!.references.find((r) => r.line === 5 && r.id === "REQ-001");
  assert.equal(sourceLine?.role, "reference", "a non-ID field label must not declare its value");
});

test("a malformed value inside a genuine ID field is flagged invalid, not accepted", () => {
  const root = writeSlugTree({
    "docs/brd/brd-field-bad.md": "# BRD\n\n- **Objective ID**: BRD-OBJ-1\n",
    "docs/prd/prd-field-bad.md": "# PRD\n\n- **Requirements ID**: REQ-DISC\n",
  });

  const slugs = parseRepo(root);
  const bad = slugs.find((s) => s.slug === "field-bad");
  assert.ok(bad);

  const shortId = bad!.references.find((r) => r.id === "BRD-OBJ-1");
  assert.equal(shortId?.role, "declaration");
  assert.equal(shortId?.valid, false, "BRD-OBJ-1 must stay invalid even as a field value");

  const namespaceOnly = bad!.references.find((r) => r.id === "REQ-DISC");
  assert.equal(namespaceOnly?.role, "declaration");
  assert.equal(namespaceOnly?.valid, false, "a namespace-only token is not a valid formal field value");
  assert.equal(bad!.declared.get("BRD-OBJ")?.size ?? 0, 0, "malformed field value must not enter declared IDs");
  assert.equal(bad!.sourceDeclared?.get("REQ")?.size ?? 0, 0, "namespace-only field value must not declare a source ID");
});

test("bold id words in prose stay references unless a label is followed immediately by a value", () => {
  const root = writeSlugTree({
    "docs/brd/brd-prose-idword.md": [
      "# BRD",
      "",
      "| Capability | Candidate requirement | Rationale | Out-of-scope pair |",
      "| --- | --- | --- | --- |",
      "| Pilot | REQ-PILOT-001 | pilot requirement | none |",
      "",
      "- **AC-PILOT-001 → REQ-PILOT-001:** pilot criterion.",
      "",
    ].join("\n"),
    "docs/prd/prd-prose-idword.md": [
      "# PRD",
      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001 | REQ-PILOT-001 | Pilot requirement |",
      "",
      "| AC ID | Source group | Req ID | Preconditions |",
      "| --- | --- | --- | --- |",
      "| AC-001 | AC-PILOT-001 | REQ-001 | none |",
      "",
      "Diagnostic **duplicate-id** counts are clear for source families REQ-PILOT / AC-PILOT.",
      "",
      "The word **ID** describes a source family such as REQ-PILOT.",
      "",
      "In this plan the **ID** column holds REQ-PILOT for the family.",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const slug = slugs.find((s) => s.slug === "prose-idword");
  assert.ok(slug);

  const proseRefs = slug!.references.filter(
    (r) => r.fromFile.endsWith("prd-prose-idword.md") && (r.id === "REQ-PILOT" || r.id === "AC-PILOT"),
  );
  assert.equal(proseRefs.length, 4, "each prose mention must surface as an occurrence");
  for (const ref of proseRefs) {
    assert.equal(ref.role, "reference", `${ref.id} at line ${ref.line} must not be promoted to a declaration`);
    assert.equal(ref.valid, true, `${ref.id} must stay a valid namespace reference`);
  }
  assert.equal(slug!.sourceDeclared?.get("REQ")?.has("REQ-PILOT") ?? false, false);
  assert.ok(slug!.sourceDeclared?.get("REQ")?.has("REQ-PILOT-001"));
  assert.equal(slug!.declared.get("REQ")?.size, 1);
  assert.ok(slug!.declared.get("REQ")?.has("REQ-001"));
  assert.ok(slug!.declared.get("AC")?.has("AC-001"));
});
test("table roles belong to the token occurrence's exact column and span", () => {
  const root = writeSlugTree({
    "docs/brd/brd-columns.md": [
      "# BRD",
      "",
      "| Capability | Candidate requirement | Rationale |",
      "| --- | --- | --- |",
      "| Setup | REQ-PILOT-001 | ready |",
      "",
    ].join("\n"),
    "docs/prd/prd-columns.md": [
      "# PRD",
      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001 | REQ-PILOT-001 | REQ-001 repeats; REQ-0010 is only prose. |",
      "",
    ].join("\n"),
  });
  const slug = parseRepo(root).find((entry) => entry.slug === "columns");
  assert.ok(slug);
  assert.deepEqual([...(slug.declared.get("REQ") ?? [])], ["REQ-001"]);
  assert.equal(slug.sourceMappings?.length, 1);
  assert.equal(slug.sourceMappings?.[0].sourceId, "REQ-PILOT-001");
  const rowRefs = slug.references.filter((ref) => ref.fromFile.endsWith("prd-columns.md") && ref.line === 5);
  assert.deepEqual(
    rowRefs.map((ref) => [ref.id, ref.role]),
    [
      ["REQ-001", "declaration"],
      ["REQ-PILOT-001", "reference"],
      ["REQ-001", "reference"],
      ["REQ-0010", "reference"],
    ],
  );
});

test("complete malformed separator candidates stay invalid while namespace wildcard references remain valid", () => {
  const root = writeSlugTree({
    "docs/brd/brd-separators.md": [
      "# BRD",
      "",
      "| Req ID | Requirement |",
      "| --- | --- |",
      "| REQ-PILOT-001 | valid source |",
      "",
    ].join("\n"),
    "docs/prd/prd-separators.md": [
      "# PRD",
      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001--EXTRA | REQ-PILOT-001--EXTRA | malformed doubled separator |",
      "",
      "- **Req ID**: REQ--PILOT-001",
      "",
      "Family references remain `REQ-PILOT-*`.",
      "",
    ].join("\n"),
  });
  const slug = parseRepo(root).find((entry) => entry.slug === "separators");
  assert.ok(slug);
  for (const id of ["REQ-001--EXTRA", "REQ-PILOT-001--EXTRA", "REQ--PILOT-001"]) {
    const ref = slug.references.find((entry) => entry.id === id);
    assert.ok(ref, `must retain the complete candidate ${id}`);
    assert.equal(ref.valid, false, `${id} must be rejected rather than truncated`);
  }
  const family = slug.references.find((entry) => entry.id === "REQ-PILOT");
  assert.equal(family?.valid, true, "the explicit REQ-PILOT-* family notation remains a valid reference");
  assert.ok(!slug.declared.get("REQ")?.has("REQ-001"), "malformed REQ candidate must not register a phantom valid declaration");
});

test("numeric legacy source-column IDs remain references, not qualified alias declarations", () => {
  const root = writeSlugTree({
    "docs/brd/brd-legacy-source.md": "# BRD\n\n# BRD-OBJ-001 Objective\n",
    "docs/prd/prd-legacy-source.md": [
      "# PRD",
      "",
      "# REQ-002 Legacy upstream requirement",
      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001 | BRD-OBJ-001 | Legacy objective link |",
      "",
      "| AC ID | Source group | Req ID |",
      "| --- | --- | --- |",
      "| AC-001 | REQ-002 | REQ-001 |",
      "",
    ].join("\n"),
  });
  const slug = parseRepo(root).find((entry) => entry.slug === "legacy-source");
  assert.ok(slug);
  assert.deepEqual(slug.sourceMappings, []);
  assert.equal(
    slug.references.find(
      (ref) => ref.id === "BRD-OBJ-001" && ref.fromFile.endsWith("prd-legacy-source.md") && ref.line === 7,
    )?.role,
    "reference",
  );
  assert.equal(
    slug.references.find(
      (ref) => ref.id === "REQ-002" && ref.fromFile.endsWith("prd-legacy-source.md") && ref.line === 11,
    )?.role,
    "reference",
  );
  assert.equal(slug.declared.get("REQ")?.size, 2);
  assert.ok(slug.declared.get("REQ")?.has("REQ-001"));
  assert.ok(slug.declared.get("REQ")?.has("REQ-002"));
  assert.deepEqual([...(slug.declared.get("AC") ?? [])], ["AC-001"]);
});

test("unrelated Note|Status table does not declare REQ or AC, while exact first-cell IDs still declare", () => {
  const root = writeSlugTree({
    "docs/prd/prd-notes.md": [
      "# Notes",
      "",
      "| Note | Status |",
      "| --- | --- |",
      "| Mentions REQ-001 | pending |",
      "| Mentions AC-001 | pending |",
      "",
      "References REQ-001 and AC-001.",
      "",
    ].join("\n"),
    "docs/prd/prd-exact-cell.md": [
      "# Plan: Numeric smoke",
      "",
      "| Item | Description |",
      "| --- | --- |",
      "| REQ-001 | Preserve bytes. |",
      "",
      "| Item | Related | Acceptance |",
      "| --- | --- | --- |",
      "| AC-001 | REQ-001 | Accepted bytes are retained. |",
      "",
      "Coverage references: AC-001.",
      "",
    ].join("\n"),
  });
  const slugs = parseRepo(root);
  const notesSlug = slugs.find((s) => s.slug === "notes");
  assert.ok(notesSlug);
  assert.equal(notesSlug.declared.get("REQ")?.size ?? 0, 0);
  assert.equal(notesSlug.declared.get("AC")?.size ?? 0, 0);
  assert.equal(
    notesSlug.references.find((ref) => ref.id === "REQ-001" && ref.line === 5)?.role,
    "reference",
  );
  assert.equal(
    notesSlug.references.find((ref) => ref.id === "AC-001" && ref.line === 6)?.role,
    "reference",
  );

  const exactSlug = slugs.find((s) => s.slug === "exact-cell");
  assert.ok(exactSlug);
  assert.ok(exactSlug.declared.get("REQ")?.has("REQ-001"));
  assert.ok(exactSlug.declared.get("AC")?.has("AC-001"));
});
