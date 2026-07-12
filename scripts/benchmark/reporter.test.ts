import assert from "node:assert/strict";
import test from "node:test";
import { formatLiveEvalCoverage } from "./reporter";

test("full-catalog eval history is displayed as full category coverage", () => {
  const note = formatLiveEvalCoverage(
    [
      {
        runId: "all-v2.6.0-current",
        category: "all",
        date: "2026-07-12T00:00:00.000Z",
        avgBaselinePassRate: 0.4,
        avgWithSkillPassRate: 0.66,
        avgDelta: 0.26,
      },
    ],
    ["android", "dart"],
  );

  assert.equal(
    note,
    "> Full-catalog live eval run covers all 2 categories; see the [Live Evals Report](evals-report.md) for the per-category breakdown.",
  );
});
