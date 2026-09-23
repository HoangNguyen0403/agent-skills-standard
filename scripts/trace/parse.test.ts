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
