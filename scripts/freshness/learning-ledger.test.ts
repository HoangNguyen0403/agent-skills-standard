// scripts/freshness/learning-ledger.test.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildLearningLedger, checkLearningLedger, run } from "./learning-ledger";
import { parseLearningLog } from "./signals/learning-log";

const known = new Set(["common/common-tdd", "common/common-learning-log"]);

test("buildLearningLedger deduplicates candidates, adopts latest iteration status, lists all occurrences, and computes age", () => {
  const log = `
## Agent Learning Log: Iteration #1
**Date**: 2026-09-01 | **Task**: Legacy entry.
**Signal**: User correction

---

## Agent Learning Log: Iteration #5
**Date**: 2026-10-20 | **Task**: Second occurrence first in text.
**Signal**: Session retrospective
**Candidate**: repeat-candidate | **Status**: evaluating
**Improvement**: IMP-1 | **Prevention**: regression-test
**Verification**: scripts/freshness/learning-ledger.test.ts
**Evaluation**: 5 passed
**Review**: reviewer-ref-1

---

## Agent Learning Log: Iteration #2
**Date**: 2026-10-01 | **Task**: First occurrence.
**Signal**: Session retrospective
**Candidate**: repeat-candidate | **Status**: proposed
**Evaluation**: not-run; awaiting harness
**Review**: pending; no maintainer approval
`;

  const entries = parseLearningLog(log, known);
  const ledger = buildLearningLedger(entries, { today: new Date("2026-10-25T00:00:00Z") });

  assert.equal(ledger.summary.totalEntries, 3);
  assert.equal(ledger.summary.legacyEntries, 1);
  assert.equal(ledger.summary.candidateEntries, 2);
  assert.equal(ledger.summary.candidateCount, 1);
  assert.deepEqual(ledger.summary.byStatus, { evaluating: 1 });
  assert.equal(ledger.summary.lackingMechanism, 0);
  assert.equal(ledger.summary.noEvaluation, 0);

  const [row] = ledger.rows;
  assert.equal(row.candidate, "repeat-candidate");
  assert.equal(row.status, "evaluating");
  assert.equal(row.firstDate, "2026-10-01");
  assert.equal(row.latestDate, "2026-10-20");
  assert.equal(row.ageDays, 24);
  assert.deepEqual(
    row.occurrences.map((o) => [o.iteration, o.status]),
    [
      [2, "proposed"],
      [5, "evaluating"],
    ],
  );
});

test("checkLearningLedger rejects promoted/advanced candidates missing Prevention, non-pending Verification, or non-pending Review", () => {
  const cases: Array<{ name: string; block: string; expectedReason: RegExp }> = [
    {
      name: "promoted with Verification: pending",
      block: `
**Candidate**: cand-verify-pending | **Status**: promoted
**Improvement**: IMP-1 | **Prevention**: regression-test
**Verification**: pending; waiting CI
**Review**: maintainer-pr-99`,
      expectedReason: /Verification/,
    },
    {
      name: "promoted with Review: pending",
      block: `
**Candidate**: cand-review-pending | **Status**: promoted
**Improvement**: IMP-2 | **Prevention**: lint
**Verification**: test:freshness
**Review**: pending; self-review only`,
      expectedReason: /Review/,
    },
    {
      name: "promoted without Prevention",
      block: `
**Candidate**: cand-no-prevention | **Status**: promoted
**Verification**: test:freshness
**Review**: maintainer-pr-99`,
      expectedReason: /Prevention/,
    },
    {
      name: "evaluating with empty Prevention and none Review",
      block: `
**Candidate**: cand-evaluating-empty | **Status**: evaluating
**Improvement**: none | **Prevention**:
**Verification**: test:freshness
**Review**: none`,
      expectedReason: /Prevention|Review/,
    },
  ];

  for (const tc of cases) {
    const log = `## Agent Learning Log: Iteration #3\n**Date**: 2026-10-10 | **Task**: Case.\n**Signal**: User correction\n${tc.block}\n`;
    const result = checkLearningLedger(parseLearningLog(log, known));
    assert.equal(result.ok, false, tc.name);
    assert.ok(result.issues.length >= 1, tc.name);
    assert.match(result.issues[0].candidate, /^cand-/);
    assert.ok(result.issues.some((i) => tc.expectedReason.test(i.reason)), tc.name);
  }
});

test("checkLearningLedger fails on unknown or missing status words and passes on valid proposed, rejected, legacy, or fully referenced promoted entries", () => {
  const badStatusLog = `
## Agent Learning Log: Iteration #4
**Date**: 2026-10-10 | **Task**: Bad status.
**Signal**: User correction
**Candidate**: cand-bad-status | **Status**: approved
**Prevention**: lint
**Verification**: check-1
**Review**: reviewer-1
`;
  const badResult = checkLearningLedger(parseLearningLog(badStatusLog, known));
  assert.equal(badResult.ok, false);
  assert.equal(badResult.issues[0].candidate, "cand-bad-status");
  assert.match(badResult.issues[0].reason, /unknown status "approved"/);

  const validLog = `
## Agent Learning Log: Iteration #1
**Date**: 2026-05-08 | **Task**: Legacy without candidate.
**Signal**: User correction

---

## Agent Learning Log: Iteration #2
**Date**: 2026-10-10 | **Task**: Proposed without proof.
**Signal**: Session retrospective
**Candidate**: cand-proposed | **Status**: proposed
**Evaluation**: not-run; baseline pending
**Review**: pending

---

## Agent Learning Log: Iteration #3
**Date**: 2026-10-11 | **Task**: Rejected without proof.
**Signal**: Session retrospective
**Candidate**: cand-rejected | **Status**: rejected
**Evaluation**: not-run
**Review**: pending

---

## Agent Learning Log: Iteration #4
**Date**: 2026-10-12 | **Task**: Promoted with concrete structural refs.
**Signal**: Session retrospective
**Candidate**: cand-promoted | **Status**: promoted
**Improvement**: IMP-10 | **Prevention**: regression-test
**Verification**: scripts/freshness/learning-ledger.test.ts
**Evaluation**: 10 passed
**Review**: maintainer-review-ref
`;
  const okResult = checkLearningLedger(parseLearningLog(validLog, known), {
    today: new Date("2026-10-20T00:00:00Z"),
  });
  assert.equal(okResult.ok, true);
  assert.equal(okResult.issues.length, 0);
  assert.equal(okResult.ledger.summary.legacyEntries, 1);
  assert.equal(okResult.ledger.summary.candidateCount, 3);
  assert.equal(okResult.ledger.summary.lackingMechanism, 2);
  assert.equal(okResult.ledger.summary.noEvaluation, 2);
});

test("CLI run() prints ledger JSON/table and enforces exit code 1 with candidate name on check failure", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ags-learning-ledger-"));
  try {
    fs.writeFileSync(
      path.join(tempRoot, "AGENTS_LEARNING.md"),
      `# Agent Learning Log

## Agent Learning Log: Iteration #1
**Date**: 2026-10-01 | **Task**: Bad promotion.
**Signal**: User correction
**Candidate**: cli-broken-candidate | **Status**: promoted
**Prevention**: regression-test
**Verification**: pending
**Review**: pending
`,
      "utf8",
    );

    const jsonRes = run(["--root", tempRoot, "--json"], new Date("2026-10-11T00:00:00Z"));
    assert.equal(jsonRes.exitCode, 0);
    const parsed = JSON.parse(jsonRes.output);
    assert.equal(parsed.summary.candidateCount, 1);
    assert.equal(parsed.rows[0].candidate, "cli-broken-candidate");
    assert.equal(parsed.rows[0].ageDays, 10);

    const tableRes = run(["--root", tempRoot], new Date("2026-10-11T00:00:00Z"));
    assert.equal(tableRes.exitCode, 0);
    assert.match(tableRes.output, /cli-broken-candidate/);

    const checkRes = run(["--root", tempRoot, "--check"], new Date("2026-10-11T00:00:00Z"));
    assert.equal(checkRes.exitCode, 1);
    assert.match(checkRes.output, /cli-broken-candidate/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("checkLearningLedger fails when an earlier promoted occurrence lacked proof even if a later occurrence returns to proposed", () => {
  const log = `
## Agent Learning Log: Iteration #2
**Date**: 2026-10-05 | **Task**: Premature promotion.
**Signal**: Session retrospective
**Candidate**: regressed-candidate | **Status**: promoted
**Verification**: pending
**Review**: pending

---

## Agent Learning Log: Iteration #4
**Date**: 2026-10-12 | **Task**: Later recurrence resets to proposed.
**Signal**: Session retrospective
**Candidate**: regressed-candidate | **Status**: proposed
**Evaluation**: not-run
**Review**: pending
`;
  const entries = parseLearningLog(log, known);
  const result = checkLearningLedger(entries, { today: new Date("2026-10-20T00:00:00Z") });

  assert.equal(result.ledger.rows.length, 1);
  assert.equal(result.ledger.rows[0].status, "proposed");
  assert.deepEqual(
    result.ledger.rows[0].occurrences.map((o) => [o.iteration, o.status]),
    [
      [2, "promoted"],
      [4, "proposed"],
    ],
  );
  assert.equal(result.ok, false);
  assert.equal(result.issues.length, 3);
  assert.ok(result.issues.every((i) => i.candidate === "regressed-candidate" && i.iteration === 2));
});

test("checkLearningLedger rejects promoted candidate even when fenced example contains Status: proposed before ###", () => {
  const log = `
## Agent Learning Log: Iteration #1
**Date**: 2026-10-10 | **Task**: Promoted with fenced template example.
**Signal**: User correction
**Candidate**: fenced-override-check | **Status**: promoted
**Verification**: pending
**Review**: pending

\`\`\`markdown
**Status**: proposed
\`\`\`

~~~markdown
**Status**: proposed
~~~
`;
  const result = checkLearningLedger(parseLearningLog(log, known));
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.candidate === "fenced-override-check"));
});
