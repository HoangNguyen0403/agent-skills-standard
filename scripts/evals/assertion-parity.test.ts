/**
 * The assertion matcher exists in three places: this directory's `scorer.ts`,
 * the published CLI verifier, and the published MCP verifier. They cannot share
 * one module — `mcp/tsconfig.json` pins `rootDir: src` and each package bundles
 * independently — so this test is what keeps them honest.
 *
 * The CLI and MCP copies previously implemented v1 semantics only while runs
 * were scored with v2, so `ags evals verify` reported diffs that were artefacts
 * of the verifier rather than real drift. This test fails the moment the three
 * disagree again.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { checkAssertion as rootCheck } from "./scorer";
import { checkAssertion as cliCheck } from "../../cli/src/services/assertion-semantics";
import { checkAssertion as mcpCheck } from "../../mcp/src/services/assertion-semantics";

type Case = {
  name: string;
  assertion: { type: string; value: string | string[] };
  transcript: string;
};

const CASES: Case[] = [
  {
    name: "contains, literal hit",
    assertion: { type: "contains", value: "peak QPS" },
    transcript: "We computed the peak QPS before drawing anything.",
  },
  {
    name: "contains, miss",
    assertion: { type: "contains", value: "peak QPS" },
    transcript: "We drew the architecture first.",
  },
  {
    name: "contains, markdown emphasis stripped (v2 only)",
    assertion: { type: "contains", value: "transactional outbox" },
    transcript: "Use a **transactional  outbox** in the same transaction.",
  },
  {
    name: "contains, stemmed token bag (v2 only)",
    assertion: { type: "contains", value: "replicating the record" },
    transcript: "We replicate the records onto a second node.",
  },
  {
    name: "contains with a digit stays exact under v2",
    assertion: { type: "contains", value: "99.9% availability" },
    transcript: "Availability is roughly 99.95 percent.",
  },
  {
    name: "contains_any, second value hits",
    assertion: { type: "contains_any", value: ["saga", "compensation"] },
    transcript: "Each step needs a compensation defined up front.",
  },
  {
    name: "contains_any, none hit",
    assertion: { type: "contains_any", value: ["saga", "outbox"] },
    transcript: "We used a plain synchronous call.",
  },
  {
    name: "not_contains, absent so passes",
    assertion: { type: "not_contains", value: "multi-region" },
    transcript: "A single region with multi-AZ fits this profile.",
  },
  {
    name: "not_contains, present so fails",
    assertion: { type: "not_contains", value: "multi-region" },
    transcript: "Go multi-region active-active.",
  },
  {
    name: "regex, matches case-insensitively",
    assertion: { type: "regex", value: "RPO\\s*and\\s*RTO" },
    transcript: "State rpo and rto before picking a topology.",
  },
  {
    name: "regex, invalid pattern fails closed",
    assertion: { type: "regex", value: "([unclosed" },
    transcript: "anything",
  },
  {
    name: "file_reference, basename hit",
    assertion: { type: "file_reference", value: "references/scorecard.md" },
    transcript: "See scorecard.md for the rubric.",
  },
  {
    name: "unknown type fails closed",
    assertion: { type: "matches_regex", value: "anything" },
    transcript: "anything",
  },
];

for (const semanticsVersion of [1, 2] as const) {
  test(`assertion semantics parity across scorer, CLI, and MCP (v${semanticsVersion})`, () => {
    for (const testCase of CASES) {
      const args = [
        testCase.assertion as never,
        testCase.transcript,
        semanticsVersion,
      ] as const;
      const root = rootCheck(...(args as Parameters<typeof rootCheck>));
      const cli = cliCheck(...(args as Parameters<typeof cliCheck>));
      const mcp = mcpCheck(...(args as Parameters<typeof mcpCheck>));

      assert.equal(
        cli,
        root,
        `CLI diverges from scorer on "${testCase.name}" (v${semanticsVersion}): cli=${cli} scorer=${root}`,
      );
      assert.equal(
        mcp,
        root,
        `MCP diverges from scorer on "${testCase.name}" (v${semanticsVersion}): mcp=${mcp} scorer=${root}`,
      );
    }
  });
}

test("v2 semantics are actually looser than v1 for prose assertions", () => {
  const assertion = {
    type: "contains",
    value: "replicating the record",
  } as never;
  const transcript = "We replicate the records onto a second node.";
  assert.equal(
    rootCheck(assertion as Parameters<typeof rootCheck>[0], transcript, 1),
    false,
    "v1 should be a literal match and miss this",
  );
  assert.equal(
    rootCheck(assertion as Parameters<typeof rootCheck>[0], transcript, 2),
    true,
    "v2 should match via stemmed tokens",
  );
});
