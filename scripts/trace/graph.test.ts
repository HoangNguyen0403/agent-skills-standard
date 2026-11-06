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

test("buildTraceGraph builds clean graph with single uppercase namespace formal IDs and 2-digit ACs", () => {
  const root = writeTempTree({
    "docs/brd/brd-aligned-graph.md": [
      "# BRD",
      "",
      "- **Objective ID**: BRD-OBJ-VIS-001",
      "- **Objective ID**: BRD-OBJ-PERF-001",
      "",
    ].join("\n"),
    "docs/prd/prd-aligned-graph.md": [
      "# PRD",
      "",
      "| Req ID | Requirement | BRD Objective Ref |",
      "| --- | --- | --- |",
      "| REQ-VIS-001 | Visual requirement | BRD-OBJ-VIS-001 |",
      "| REQ-PERF-001 | Performance requirement | BRD-OBJ-PERF-001 |",
      "",
      "| AC ID | Req ID | Given | When | Then |",
      "| --- | --- | --- | --- | --- |",
      "| AC-01 | REQ-VIS-001 | given | when | then |",
      "| AC-02 | REQ-PERF-001 | given | when | then |",
      "",
    ].join("\n"),
    "docs/srs/srs-aligned-graph.md": [
      "# SRS",
      "",
      "### SRS-001: First SRS",
      "- Source: REQ-VIS-001, AC-01",
      "",
      "### SRS-002: Second SRS",
      "- Source: REQ-PERF-001, AC-02",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const issues = buildTraceGraph(slugs);
  assert.deepEqual(issues, [], "aligned graph must report zero issues");
});

test("buildTraceGraph reports malformed-id on AC-1 but accepts AC-01 and AC-001", () => {
  const root = writeTempTree({
    "docs/prd/prd-ac-test.md": [
      "# PRD",
      "",
      "| AC ID | Req ID | Given | When | Then |",
      "| --- | --- | --- | --- | --- |",
      "| AC-1 | REQ-001 | given | when | then |",
      "| AC-01 | REQ-001 | given | when | then |",
      "| AC-001 | REQ-001 | given | when | then |",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const issues = buildTraceGraph(slugs);
  const malformed = issues.filter((i) => i.code === "malformed-id").map((i) => i.id);
  assert.ok(malformed.includes("AC-1"), "AC-1 must be reported as malformed-id");
  assert.ok(!malformed.includes("AC-01"), "AC-01 must be valid");
  assert.ok(!malformed.includes("AC-001"), "AC-001 must be valid");
});

test("buildTraceGraph reports malformed-id for a multi-namespace token in an explicit formal column, leaving the rest of the graph clean", () => {
  const root = writeTempTree({
    "docs/brd/brd-formal-column.md": "# BRD\n\n- **Objective ID**: BRD-OBJ-001\n",
    "docs/prd/prd-formal-column.md": [
      "# PRD",
      "",
      "| Req ID | Requirement | BRD Objective Ref |",
      "| --- | --- | --- |",
      "| REQ-001 | Valid formal requirement | BRD-OBJ-001 |",
      "",
      "| AC ID | Req ID |",
      "| --- | --- |",
      "| AC-01 | REQ-001 |",
      "",
      "| Req ID | Requirement |",
      "| --- | --- |",
      "| REQ-SUB-MOD-001 | Multi-namespace formal row |",
      "",
    ].join("\n"),
    "docs/srs/srs-formal-column.md": "# SRS\n\n### SRS-001: contract\n\n- Source: REQ-001, AC-01\n",
  });

  const issues = buildTraceGraph(parseRepo(root));
  assert.deepEqual(
    issues.filter((i) => i.severity === "error").map((i) => [i.code, i.id]),
    [["malformed-id", "REQ-SUB-MOD-001"]],
    "the multi-namespace formal row must be the only error; valid formal links stay clean",
  );
});

test("buildTraceGraph resolves a formal-column link only against formal declarations", () => {
  const root = writeTempTree({
    "docs/brd/brd-authority.md": [
      "# BRD",
      "",
      "| Capability | Candidate requirement | Rationale |",
      "| --- | --- | --- |",
      "| Visual theme | REQ-VIS-001 | historical candidate |",
      "",
    ].join("\n"),
    "docs/prd/prd-authority.md": [
      "# PRD",
      "",
      "| Req ID | Requirement |",
      "| --- | --- |",
      "| REQ-001 | Formal requirement |",
      "",
      "| AC ID | Req ID |",
      "| --- | --- |",
      "| AC-01 | REQ-VIS-001 |",
      "| AC-02 | REQ-001 |",
      "",
      "Coverage references: AC-01, AC-02.",
      "",
    ].join("\n"),
  });

  const slugs = parseRepo(root);
  const slug = slugs.find((s) => s.slug === "authority");
  assert.ok(slug);
  assert.ok(slug!.sourceDeclared?.get("REQ")?.has("REQ-VIS-001"), "the historical candidate stays declared as a source");
  assert.ok(!slug!.declared.get("REQ")?.has("REQ-VIS-001"), "a historical candidate is not a formal declaration");

  const errors = buildTraceGraph(slugs).filter((i) => i.severity === "error");
  assert.deepEqual(
    errors.map((i) => [i.code, i.id]),
    [["dangling-ref", "REQ-VIS-001"]],
    "the AC row's Req ID column points at a missing formal declaration; other valid REQ/AC links must not mask it",
  );
  assert.match(errors[0].message, /never declared/);
});

const COEXISTING_AUTHORITIES = {
  "docs/brd/brd-coexist.md": [
    "# BRD",
    "",
    "| Capability | Candidate requirement | Rationale |",
    "| --- | --- | --- |",
    "| Visual theme | REQ-VIS-001 | historical candidate |",
    "",
  ].join("\n"),
  "docs/prd/prd-coexist.md": [
    "# PRD",
    "",
    "### REQ-VIS-001: formal heading declaration",
    "",
    "| Req ID | Source | Requirement |",
    "| --- | --- | --- |",
    "| REQ-VIS-001 | REQ-VIS-001 | explicit source mapping |",
    "",
    "| AC ID | Req ID |",
    "| --- | --- |",
    "| AC-01 | REQ-VIS-001 |",
    "",
  ].join("\n"),
  "docs/srs/srs-coexist.md": "# SRS\n\n### SRS-001: contract\n\n- Source: AC-01\n",
};

test("buildTraceGraph keeps a formal heading and a same-spelling historical candidate as separate declarations", () => {
  const slugs = parseRepo(writeTempTree(COEXISTING_AUTHORITIES));
  const slug = slugs.find((s) => s.slug === "coexist");
  assert.ok(slug);
  assert.ok(slug!.declared.get("REQ")?.has("REQ-VIS-001"), "the strong formal heading must stay a formal declaration");
  assert.ok(
    slug!.sourceDeclared?.get("REQ")?.has("REQ-VIS-001"),
    "the explicit historical candidate must not be demoted away by the formal restatement",
  );
  assert.equal(slug!.sourceMappings?.length, 1);
  assert.equal(slug!.sourceMappings?.[0].sourceId, "REQ-VIS-001");
  assert.equal(slug!.sourceMappings?.[0].formalId, "REQ-VIS-001");

  const issues = buildTraceGraph(slugs);
  assert.deepEqual(issues.filter((i) => i.severity === "error"), []);
  assert.deepEqual(issues.filter((i) => i.code === "duplicate-id"), [], "coexisting authorities are not a duplicate");
});

test("buildTraceGraph reports ambiguity for untyped prose when both authorities declare the same ID", () => {
  const slugs = parseRepo(
    writeTempTree({
      ...COEXISTING_AUTHORITIES,
      "docs/prd/prd-coexist.md": `${COEXISTING_AUTHORITIES["docs/prd/prd-coexist.md"]}\nSee REQ-VIS-001 for the shared contract.\n`,
    }),
  );

  const ambiguous = buildTraceGraph(slugs).filter(
    (i) => i.code === "dangling-ref" && i.id === "REQ-VIS-001",
  );
  assert.equal(ambiguous.length, 1, "untyped prose must report the ambiguity exactly once");
  assert.match(ambiguous[0].message, /ambiguous authority/);
});
test("buildTraceGraph does not count a historical source-column link as formal requirement coverage", () => {
  const slugs = parseRepo(
    writeTempTree({
      "docs/brd/brd-orphan-authority.md": [
        "# BRD",
        "",
        "| Capability | Candidate requirement | Rationale |",
        "| --- | --- | --- |",
        "| Visual theme | REQ-VIS-001 | historical candidate |",
        "",
      ].join("\n"),
      "docs/prd/prd-orphan-authority.md": [
        "# PRD",
        "",
        "### REQ-VIS-001: formal requirement",
        "",
        "| Req ID | Source | Requirement |",
        "| --- | --- | --- |",
        "| REQ-001 | REQ-VIS-001 | mapped formal requirement |",
        "",
        "| AC ID | Req ID |",
        "| --- | --- |",
        "| AC-01 | REQ-001 |",
        "",
      ].join("\n"),
      "docs/srs/srs-orphan-authority.md": "# SRS\n\n### SRS-001: contract\n\n- Source: AC-01\n",
    }),
  );

  const errors = buildTraceGraph(slugs).filter((i) => i.severity === "error");
  assert.deepEqual(
    errors.map((i) => [i.code, i.id]),
    [["orphan-req", "REQ-VIS-001"]],
    "historical source coverage must not hide the unreferenced formal declaration or make the mapping invalid",
  );
});
