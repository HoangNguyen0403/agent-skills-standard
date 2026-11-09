// scripts/trace/graph.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildTraceGraph } from "./graph";
import { parseRepo } from "./parse";
import type { IdKind, SlugTrace } from "./types";

const FIXTURES = path.join(__dirname, "__fixtures__");

test("buildTraceGraph reports no issues for a fully covered, clean slug tree", () => {
  const slugs = parseRepo(path.join(FIXTURES, "clean"));
  assert.deepEqual(buildTraceGraph(slugs), []);
});

test("buildTraceGraph reports every seeded issue code for the broken fixture", () => {
  const slugs = parseRepo(path.join(FIXTURES, "broken"));
  const issues = buildTraceGraph(slugs);
  const codes = new Set(issues.map((i) => i.code));
  for (const expected of [
    "duplicate-id",
    "dangling-ref",
    "malformed-id",
    "orphan-req",
    "orphan-ac",
    "unlinked-req",
    "slug-file-mismatch",
  ] as const) {
    assert.ok(codes.has(expected), `expected issue code ${expected} to be reported`);
  }
});

test("buildTraceGraph keeps slug-file-mismatch scoped to the file's own slug, pointing at the other slug", () => {
  const slugs = parseRepo(path.join(FIXTURES, "broken"));
  const issues = buildTraceGraph(slugs);
  const mismatch = issues.find((i) => i.code === "slug-file-mismatch");
  assert.ok(mismatch);
  assert.equal(mismatch!.slug, "mismatch-a");
  assert.match(mismatch!.message, /mismatch-b/);
});

test("buildTraceGraph runs slug-file-mismatch across the full slug set even when the caller only wants one slug's issues", () => {
  const allSlugs = parseRepo(path.join(FIXTURES, "broken"));
  const allIssues = buildTraceGraph(allSlugs);
  const filteredIssues = allIssues.filter((i) => i.slug === "mismatch-a");
  assert.ok(filteredIssues.some((i) => i.code === "slug-file-mismatch"));

  // Building the graph from a pre-filtered slug list (the wrong, buggy order
  // of operations) loses the sibling slug's references entirely, which
  // would instead misclassify REQ-500 as a dangling-ref inside mismatch-a.
  const onlyMismatchA = allSlugs.filter((s) => s.slug === "mismatch-a");
  const brokenGraphIssues = buildTraceGraph(onlyMismatchA);
  assert.ok(!brokenGraphIssues.some((i) => i.code === "slug-file-mismatch"));
});

function writeTempTree(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trace-graph-test-"));
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return root;
}

test("buildTraceGraph validates full-token source mappings and one-to-many refinements without errors", () => {
  const root = writeTempTree({
    "docs/brd/brd-valid-source.md": [
      "# BRD",
      "",
      "| Capability | Candidate requirement | Rationale | Out-of-scope pair |",
      "| --- | --- | --- | --- |",
      "| Core feature | REQ-DISC-001 | clear rationale | none |",
      "",
      "- **AC-DISC-001 → REQ-DISC-001:** First acceptance criterion.",
      "",
    ].join("\n"),
    "docs/prd/prd-valid-source.md": [
      "# PRD",
      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001 | REQ-DISC-001 | Implement core feature |",
      "",
      "| AC ID | Source group | Req ID | Preconditions |",
      "| --- | --- | --- | --- |",
      "| AC-001 | AC-DISC-001 | REQ-001 | none |",
      "| AC-002 | AC-DISC-001 | REQ-001 | none |",
      "",
      "Progress references AC-001 and AC-002 downstream.",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const issues = buildTraceGraph(slugs);
  const errors = issues.filter((i) => i.severity === "error");
  assert.deepEqual(errors, [], "must have zero errors for valid source-mapped slug");
});

test("buildTraceGraph reports dangling-ref when source mapping cites an undeclared source ID", () => {
  const root = writeTempTree({
    "docs/brd/brd-missing-src.md": "# BRD\n\n- **Objective ID**: BRD-OBJ-001\n",
    "docs/prd/prd-missing-src.md": [
      "# PRD",
      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001 | REQ-UNDECLARED-001 | Missing source ID in BRD |",
      "",
      "| AC ID | Linked Req |",
      "| --- | --- |",
      "| AC-001 | REQ-001 |",
      "",
      "Progress cites AC-001.",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const issues = buildTraceGraph(slugs);
  const dangling = issues.find((i) => i.code === "dangling-ref" && i.id === "REQ-UNDECLARED-001");
  assert.ok(dangling, "must report dangling-ref for undeclared source ID");
});

test("buildTraceGraph reports a missing mapping target independently of missing-source behavior", () => {
  const trace: SlugTrace = {
    slug: "missing-target",
    files: ["docs/prd/prd-missing-target.md"],
    declared: new Map<IdKind, Set<string>>([["REQ", new Set(["REQ-001"])]]),
    sourceDeclared: new Map<IdKind, Set<string>>([["REQ", new Set(["REQ-SOURCE-001"])]]),
    sourceMappings: [
      {
        sourceId: "REQ-SOURCE-001",
        sourceKind: "REQ",
        formalId: "REQ-999",
        formalKind: "REQ",
        fromFile: "docs/prd/prd-missing-target.md",
        line: 4,
      },
    ],
    references: [],
  };
  const issues = buildTraceGraph([trace]);
  const missingTarget = issues.filter((issue) => issue.code === "dangling-ref");
  assert.deepEqual(missingTarget.map((issue) => issue.id), ["REQ-999"]);
  const targetIssue = missingTarget[0];
  assert.ok(targetIssue);
  assert.match(targetIssue.message, /formal target REQ-999/);
});

test("buildTraceGraph reports mismatched-kind when source mapping crosses incompatible requirement kinds", () => {
  const root = writeTempTree({
    "docs/brd/brd-mismatched.md": [
      "# BRD",
      "",
      "- **AC-DISC-001 → REQ-001:** AC declared in BRD.",
      "",
    ].join("\n"),
    "docs/prd/prd-mismatched.md": [
      "# PRD",
      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001 | AC-DISC-001 | Mismatched AC mapped as REQ source |",
      "",
      "| AC ID | Linked Req |",
      "| --- | --- |",
      "| AC-001 | REQ-001 |",
      "",
      "Progress cites AC-001.",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const issues = buildTraceGraph(slugs);
  const mismatch = issues.find((i) => i.code === "mismatched-kind");
  assert.ok(mismatch, "must report mismatched-kind when REQ maps to AC source");
  assert.equal(mismatch!.id, "AC-DISC-001");
});

test("buildTraceGraph reports duplicate-id when source ID is declared more than once", () => {
  const root = writeTempTree({
    "docs/brd/brd-dup-source.md": [
      "# BRD",
      "",
      "| Capability | Candidate requirement | Rationale | Out-of-scope pair |",
      "| --- | --- | --- | --- |",
      "| First | REQ-DISC-001 | first rationale | none |",
      "| Second | REQ-DISC-001 | duplicate declaration | none |",
      "",
    ].join("\n"),
    "docs/prd/prd-dup-source.md": [
      "# PRD",
      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001 | REQ-DISC-001 | formal target |",
      "",
      "| AC ID | Linked Req |",
      "| --- | --- |",
      "| AC-001 | REQ-001 |",
      "",
      "Progress cites AC-001.",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const issues = buildTraceGraph(slugs);
  const dup = issues.find((i) => i.code === "duplicate-id" && i.id === "REQ-DISC-001");
  assert.ok(dup, "must report duplicate-id for duplicated source declaration");
});

test("buildTraceGraph reports malformed-id on malformed longer tokens", () => {
  const root = writeTempTree({
    "docs/prd/prd-longer-malformed.md": [
      "# PRD",
      "",
      "| Req ID | Statement |",
      "| --- | --- |",
      "| REQ-001-EXTRA | malformed longer id |",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const issues = buildTraceGraph(slugs);
  const malformed = issues.find((i) => i.code === "malformed-id" && i.id === "REQ-001-EXTRA");
  assert.ok(malformed, "must report malformed-id for REQ-001-EXTRA");
});

test("buildTraceGraph reports malformed-id on undersized, missing, or nonnumeric terminal suffix despite matching declaration+mapping", () => {
  const root = writeTempTree({
    "docs/brd/brd-bad-suffix.md": [
      "# BRD",
      "",
      "| Req ID | Requirement |",
      "| --- | --- |",
      "| REQ-PILOT-01 | undersized 2-digit suffix |",
      "| REQ-PILOT | missing terminal suffix |",
      "| REQ-PILOT-EXTRA | nonnumeric terminal suffix |",
      "| REQ-PILOT-001 | valid 3-digit suffix |",
      "",
      "- **AC-PILOT-001 → REQ-PILOT-001:** valid AC",
      "",
    ].join("\n"),
    "docs/prd/prd-bad-suffix.md": [
      "# PRD",
      "",
      "| Req ID | Source | Requirement |",
      "| --- | --- | --- |",
      "| REQ-001 | REQ-PILOT-01 | maps undersized source |",
      "| REQ-002 | REQ-PILOT | maps suffixless source |",
      "| REQ-003 | REQ-PILOT-EXTRA | maps nonnumeric source |",
      "| REQ-004 | REQ-PILOT-001 | maps valid source |",
      "",
      "| AC ID | Source group | Req ID | Preconditions |",
      "| --- | --- | --- | --- |",
      "| AC-001 | AC-PILOT-001 | REQ-004 | valid AC |",
      "",
      "Coverage references: AC-001.",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const issues = buildTraceGraph(slugs);
  const malformedIds = issues.filter((i) => i.code === "malformed-id").map((i) => i.id);
  assert.ok(malformedIds.includes("REQ-PILOT-01"), "REQ-PILOT-01 must be reported as malformed-id");
  assert.ok(malformedIds.includes("REQ-PILOT"), "REQ-PILOT must be reported as malformed-id");
  assert.ok(malformedIds.includes("REQ-PILOT-EXTRA"), "REQ-PILOT-EXTRA must be reported as malformed-id");
  assert.ok(!malformedIds.includes("REQ-PILOT-001"), "valid REQ-PILOT-001 must not be reported as malformed");
});

test("buildTraceGraph accepts bold diagnostic prose plus namespace family references without false errors", () => {
  const root = writeTempTree({
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

  const slugs = parseRepo(root);
  const issues = buildTraceGraph(slugs);
  assert.deepEqual(
    issues.filter((i) => i.severity === "error"),
    [],
    "bold diagnostic prose must not manufacture malformed, dangling, duplicate, or orphan errors",
  );
});

test("buildTraceGraph reports duplicate-id when a canonical formal ID is declared twice via ID fields", () => {
  const root = writeTempTree({
    "docs/brd/brd-dup-formal.md": "# BRD\n\n- **Objective ID**: BRD-OBJ-001\n",
    "docs/prd/prd-dup-formal.md": [
      "# PRD",
      "",
      "- **Req ID**: REQ-001",
      "- **Req ID**: REQ-001",
      "",
      "- **AC ID**: AC-001",
      "",
      "Coverage references: REQ-001, AC-001.",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const issues = buildTraceGraph(slugs);
  const dup = issues.find((i) => i.code === "duplicate-id" && i.id === "REQ-001");
  assert.ok(dup, "a canonical ID declared twice through ID fields must remain a duplicate-id error");
  assert.equal(dup!.severity, "error");
});

test("buildTraceGraph keeps hyphen-id and bare-ID prose next to namespace families free of errors", () => {
  const root = writeTempTree({
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

  const slugs = parseRepo(root);
  const issues = buildTraceGraph(slugs);
  assert.deepEqual(
    issues.filter((i) => i.severity === "error"),
    [],
    "bold id words in prose must not become declarations or malformed ids",
  );
});

test("buildTraceGraph keeps AC-01 and AC-001 as distinct declarations", () => {
  const root = writeTempTree({
    "docs/brd/brd-ac-width.md": "# BRD\n\n- **Objective ID**: BRD-OBJ-001\n",
    "docs/prd/prd-ac-width.md": [
      "# PRD",
      "",
      "| Req ID | Requirement | BRD Objective Ref |",
      "| --- | --- | --- |",
      "| REQ-001 | Two-digit AC support | BRD-OBJ-001 |",
      "",
      "| AC ID | Linked Req |",
      "| --- | --- |",
      "| AC-01 | REQ-001 |",
      "| AC-001 | REQ-001 |",
      "",
      "Coverage references AC-001 only.",
      "",
    ].join("\n"),
  });

  const issues = buildTraceGraph(parseRepo(root));
  assert.deepEqual(
    issues.filter((i) => i.code === "orphan-ac").map((i) => i.id),
    ["AC-01"],
    "a reference to AC-001 must not resolve the distinct AC-01 declaration",
  );
  assert.deepEqual(issues.filter((i) => i.code === "dangling-ref"), []);
  assert.deepEqual(issues.filter((i) => i.code === "malformed-id"), []);
});

test("buildTraceGraph leaves an AC-01 reference unresolved when only AC-001 is declared", () => {
  const root = writeTempTree({
    "docs/brd/brd-ac-padded.md": "# BRD\n\n- **Objective ID**: BRD-OBJ-001\n",
    "docs/prd/prd-ac-padded.md": [
      "# PRD",
      "",
      "| Req ID | Requirement | BRD Objective Ref |",
      "| --- | --- | --- |",
      "| REQ-001 | Padding-sensitive AC resolution | BRD-OBJ-001 |",
      "",
      "| AC ID | Linked Req |",
      "| --- | --- |",
      "| AC-001 | REQ-001 |",
      "",
      "Coverage references AC-01.",
      "",
    ].join("\n"),
  });

  const issues = buildTraceGraph(parseRepo(root));
  assert.deepEqual(
    issues.filter((i) => i.code === "dangling-ref").map((i) => i.id),
    ["AC-01"],
    "AC-01 must stay unresolved instead of aliasing AC-001",
  );
  assert.ok(!issues.some((i) => i.code === "malformed-id"), "AC-01 is well-formed, only unresolved");
});
