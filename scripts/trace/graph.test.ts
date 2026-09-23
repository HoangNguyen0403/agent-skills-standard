// scripts/trace/graph.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { buildTraceGraph } from "./graph";
import { parseRepo } from "./parse";

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
