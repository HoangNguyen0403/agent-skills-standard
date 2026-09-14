// scripts/freshness/index.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { isStrictBlocking } from "./index";
import type { FreshnessIssue } from "./types";

const base = { category: "x", skillName: "", message: "" };

test("isStrictBlocking: missing-pin and non-low claim issues block; historical (low) claims do not", () => {
  const cases: [FreshnessIssue, boolean][] = [
    [{ ...base, type: "missing-pin", severity: "low" }, true],
    [{ ...base, type: "claim-behind-pin", severity: "med" }, true],
    [{ ...base, type: "claim-ahead-of-pin", severity: "med" }, true],
    [{ ...base, type: "claim-behind-pin", severity: "low" }, false],
    [{ ...base, type: "reviewed-stale", severity: "med" }, false],
    [{ ...base, type: "upstream-major-drift", severity: "high" }, false],
  ];
  for (const [issue, expected] of cases) assert.equal(isStrictBlocking(issue), expected, issue.type);
});
