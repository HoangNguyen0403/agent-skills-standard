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

test("run() succeeds on a slug with full-token source mappings and --required", () => {
  const root = writeRoot({
    "docs/brd/brd-mapped.md": [
      "# BRD",
      "",
      "| Capability | Candidate requirement | Rationale | Out-of-scope pair |",
      "| --- | --- | --- | --- |",
      "| Setup | REQ-DISC-001 | clear rationale | none |",
      "",
      "- **AC-DISC-001 → REQ-DISC-001:** Setup AC.",
      "",
    ].join("\n"),
    "docs/prd/prd-mapped.md": [
      "# PRD",
      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001 | REQ-DISC-001 | Document setup |",
      "",
      "| AC ID | Source group | Req ID | Preconditions |",
      "| --- | --- | --- | --- |",
      "| AC-001 | AC-DISC-001 | REQ-001 | none |",
      "| AC-002 | AC-DISC-001 | REQ-001 | none |",
      "",
      "Progress cites AC-001 and AC-002.",
      "",
    ].join("\n"),
  });

  const res = run(["--root", root, "--slug", "mapped", "--required", "--json"]);
  assert.equal(res.exitCode, 0);
  const parsed = JSON.parse(res.output);
  assert.equal(parsed.ok, true);
  const errors = parsed.issues.filter((i: { severity: string }) => i.severity === "error");
  assert.deepEqual(errors, []);
});

test("run() fails on a slug with source mapping kind mismatch", () => {
  const root = writeRoot({
    "docs/brd/brd-bad-kind.md": [
      "# BRD",
      "",
      "- **AC-DISC-001 → REQ-001:** Criteria.",
      "",
    ].join("\n"),
    "docs/prd/prd-bad-kind.md": [
      "# PRD",
      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001 | AC-DISC-001 | Mismatched AC as REQ source |",
      "",
      "| AC ID | Linked Req |",
      "| --- | --- |",
      "| AC-001 | REQ-001 |",
      "",
      "Progress cites AC-001.",
      "",
    ].join("\n"),
  });

  const res = run(["--root", root, "--slug", "bad-kind", "--json"]);
  assert.equal(res.exitCode, 1);
  const parsed = JSON.parse(res.output);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.issues.some((i: { code: string }) => i.code === "mismatched-kind"));
});

test("run() fails on a slug when mapped source ID has an undersized numeric suffix", () => {
  const root = writeRoot({
    "docs/brd/brd-alias-smoke.md": [
      "# Brief: Alias smoke",
      "",
      "| Req ID | Requirement |",
      "| --- | --- |",
      "| REQ-PILOT-01 | Preserve bytes. |",
      "",
      "| AC ID | Acceptance group |",
      "| --- | --- |",
      "| AC-PILOT-001 | Preserve successful and rejected input behavior. |",
      "",
    ].join("\n"),
    "docs/prd/prd-alias-smoke.md": [
      "# Plan: Alias smoke",
      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001 | REQ-PILOT-01 | Preserve bytes. |",
      "",
      "| AC ID | Source group | Req ID | Acceptance |",
      "| --- | --- | --- | --- |",
      "| AC-001 | AC-PILOT-001 | REQ-001 | Accepted bytes are retained. |",
      "| AC-002 | AC-PILOT-001 | REQ-001 | Rejected bytes do not change storage. |",
      "",
      "Coverage references: AC-001, AC-002.",
      "",
    ].join("\n"),
  });

  const res = run(["--root", root, "--slug", "alias-smoke", "--json"]);
  assert.equal(res.exitCode, 1);
  const parsed = JSON.parse(res.output);
  assert.equal(parsed.ok, false);
  const malformed = parsed.issues.find((i: { code: string; id?: string }) => i.code === "malformed-id" && i.id === "REQ-PILOT-01");
  assert.ok(malformed, "must report malformed-id for REQ-PILOT-01");
});

test("run() exits 0 when bold diagnostic prose precedes namespace family references", () => {
  const root = writeRoot({
    "docs/brd/brd-prose-safe.md": [
      "# BRD",
      "",
      "| Capability | Candidate requirement | Rationale | Out-of-scope pair |",
      "| --- | --- | --- | --- |",
      "| Setup | REQ-DISC-001 | clear setup | none |",
      "",
      "- **AC-DISC-001 → REQ-DISC-001:** Setup criterion.",
      "",
    ].join("\n"),
    "docs/prd/prd-prose-safe.md": [
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
      "Coverage references: AC-001.",
      "",
    ].join("\n"),
  });

  const res = run(["--root", root, "--slug", "prose-safe", "--required", "--json"]);
  assert.equal(res.exitCode, 0);
  const parsed = JSON.parse(res.output);
  assert.equal(parsed.ok, true);
  const errors = parsed.issues.filter((i: { severity: string }) => i.severity === "error");
  assert.deepEqual(errors, []);
});

test("run() fails when a genuine ID field carries a malformed ID value", () => {
  const root = writeRoot({
    "docs/brd/brd-field-bad.md": "# BRD\n\n- **Objective ID**: BRD-OBJ-001\n",
    "docs/prd/prd-field-bad.md": [
      "# PRD",
      "",
      "| Req ID | Requirement |",
      "| --- | --- |",
      "| REQ-001 | Real requirement |",
      "",
      "| AC ID | Linked Req |",
      "| --- | --- |",
      "| AC-001 | REQ-001 |",
      "",
      "- **Req ID**: REQ-1",
      "",
      "Coverage references: AC-001.",
      "",
    ].join("\n"),
  });

  const res = run(["--root", root, "--slug", "field-bad", "--json"]);
  assert.equal(res.exitCode, 1);
  const parsed = JSON.parse(res.output);
  assert.equal(parsed.ok, false);
  assert.ok(
    parsed.issues.some((i: { code: string; id?: string }) => i.code === "malformed-id" && i.id === "REQ-1"),
    "a malformed value in a real ID field must still be rejected",
  );
});

test("run() exits 0 when bold id words in prose cite namespace families", () => {
  const root = writeRoot({
    "docs/brd/brd-idword.md": [
      "# BRD",
      "",
      "| Capability | Candidate requirement | Rationale | Out-of-scope pair |",
      "| --- | --- | --- | --- |",
      "| Pilot | REQ-PILOT-001 | pilot requirement | none |",
      "",
      "- **AC-PILOT-001 → REQ-PILOT-001:** pilot criterion.",
      "",
    ].join("\n"),
    "docs/prd/prd-idword.md": [
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
      "Coverage references: AC-001.",
      "",
    ].join("\n"),
  });

  const res = run(["--root", root, "--slug", "idword", "--required", "--json"]);
  assert.equal(res.exitCode, 0);
  const parsed = JSON.parse(res.output);
  assert.equal(parsed.ok, true);
  const errors = parsed.issues.filter((i: { severity: string }) => i.severity === "error");
  assert.deepEqual(errors, []);
});
test("run() distinguishes table references from declarations by exact token span", () => {
  const root = writeRoot({
    "docs/prd/prd-repeated-table-text.md": [
      "# PRD",
      "",
      "| Req ID | Requirement |",
      "| --- | --- |",
      "| REQ-001 | REQ-001 must retain the approved behavior. |",
      "",
    ].join("\n"),
    "docs/prd/prd-prefix-table-reference.md": [
      "# PRD",
      "",
      "| Req ID | Requirement |",
      "| --- | --- |",
      "| REQ-0010 | Supersedes REQ-001. |",
      "",
    ].join("\n"),
  });
  const repeated = run(["--root", root, "--slug", "repeated-table-text", "--json"]);
  assert.equal(repeated.exitCode, 0);
  const repeatedPayload = JSON.parse(repeated.output);
  assert.deepEqual(
    repeatedPayload.issues.filter((issue: { code: string }) => issue.code === "duplicate-id"),
    [],
  );

  const prefix = run(["--root", root, "--slug", "prefix-table-reference", "--json"]);
  assert.equal(prefix.exitCode, 1);
  const prefixPayload = JSON.parse(prefix.output);
  assert.ok(
    prefixPayload.issues.some(
      (issue: { code: string; id?: string }) => issue.code === "dangling-ref" && issue.id === "REQ-001",
    ),
    "REQ-001 in prose must remain an unresolved reference, not a prefix-created declaration",
  );
  assert.deepEqual(
    prefixPayload.issues.filter((issue: { code: string }) => issue.code === "duplicate-id"),
    [],
  );
});

test("run() rejects complete malformed separator candidates at field and source-column ingress", () => {
  const cases = [
    {
      slug: "bad-formal-separator",
      id: "REQ-001--EXTRA",
      prd: "| Req ID | Requirement |\n| --- | --- |\n| REQ-001--EXTRA | malformed formal |",
    },
    {
      slug: "bad-source-separator",
      id: "REQ-PILOT-001--EXTRA",
      prd: "| Req ID | Source | Requirement |\n| --- | --- | --- |\n| REQ-001 | REQ-PILOT-001--EXTRA | malformed source |",
    },
    {
      slug: "bad-empty-segment",
      id: "REQ--PILOT-001",
      prd: "- **Req ID**: REQ--PILOT-001",
    },
  ];
  for (const { slug, id, prd } of cases) {
    const root = writeRoot({
      [`docs/prd/prd-${slug}.md`]: `# PRD\n\n${prd}\n`,
    });
    const result = run(["--root", root, "--slug", slug, "--json"]);
    assert.equal(result.exitCode, 1, `${id} must cause a failing CLI result`);
    const parsed = JSON.parse(result.output);
    assert.ok(
      parsed.issues.some(
        (issue: { code: string; id?: string }) => issue.code === "malformed-id" && issue.id === id,
      ),
      `the complete malformed candidate ${id} must be reported`,
    );
  }
});

test("run() preserves canonical numeric IDs in legacy Source columns", () => {
  const root = writeRoot({
    "docs/brd/brd-legacy-source.md": "# BRD\n\n# BRD-OBJ-001 Objective\n",
    "docs/prd/prd-legacy-source.md": [
      "# PRD",
      "",
      "# REQ-002 Legacy upstream requirement",

      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001 | BRD-OBJ-001 | Existing objective link. |",
      "",
      "| AC ID | Source group | Req ID |",
      "| --- | --- | --- |",
      "| AC-001 | REQ-002 | REQ-001 |",
      "",
      "Progress references AC-001.",
      "",
    ].join("\n"),
  });
  const result = run(["--root", root, "--slug", "legacy-source", "--required", "--json"]);
  assert.equal(result.exitCode, 0);
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.issues.filter((issue: { severity: string }) => issue.severity === "error"), []);
});

test("run() fails --required on unrelated Note|Status table with first-cell mentions", () => {
  const root = writeRoot({
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
  });
  const result = run(["--root", root, "--slug", "notes", "--required", "--json"]);
  assert.equal(result.exitCode, 1);
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.ok, false);
  assert.ok(codes(parsed).includes("empty-scope"));
});

test("run() passes --required on unrecognized header Item|Description table with exact first-cell IDs", () => {
  const root = writeRoot({
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
  const result = run(["--root", root, "--slug", "exact-cell", "--required", "--json"]);
  assert.equal(result.exitCode, 0);
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.issues.filter((issue: { severity: string }) => issue.severity === "error"), []);
});
