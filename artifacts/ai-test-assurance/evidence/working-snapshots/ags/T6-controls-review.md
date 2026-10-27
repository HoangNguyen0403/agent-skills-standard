# Immutable review snapshot T6-controls

Repository: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala
Base: 92d06c420f6a41f08e11579423e4e3eacdb7880d
Captured: 2026-10-26T16:49:24.113Z

## Tracked diff

diff --git a/skills/common/common-tdd/evals/evals.json b/skills/common/common-tdd/evals/evals.json
index d3a0f03d..6cd8ff58 100644
--- a/skills/common/common-tdd/evals/evals.json
+++ b/skills/common/common-tdd/evals/evals.json
@@ -68,6 +68,26 @@
         { "type": "contains", "value": "padding tests" },
         { "type": "not_contains", "value": "80%" }
       ]
+    },
+    {
+      "id": 7,
+      "prompt": "We need to add a test for a critical tax calculation. The implementation is already written and produces 42.50 for the edge input. The developer proposes writing assert calculateTax(order) == 42.50 by capturing the current function return. What is the compliant TDD response?",
+      "expected_output": "Reject copying the expected value from implementation output. An oracle must be independently justified by an approved requirement, external specification, or independently reviewed example artifact. Record the independent oracle reference and rationale in the Test Intent Record; implementation-copied expected output is unacceptable.",
+      "assertions": [
+        { "type": "contains", "value": "independent oracle" },
+        { "type": "contains", "value": "implementation-copied" },
+        { "type": "not_contains", "value": "implementation is the oracle" }
+      ]
+    },
+    {
+      "id": 8,
+      "prompt": "An external static scanner returns a report showing 0 blockers, but 3 files failed traversal and could not be analyzed. The developer claims the test suite has clean static assurance and 100% pass rate. How should the team classify this result?",
+      "expected_output": "Reject clean success. When required scope suffers traversal or parse failures, the analysis status is incomplete or error, not clean pass. Blocker absence across unanalyzed files cannot be treated as clean assurance or release protection.",
+      "assertions": [
+        { "type": "contains", "value": "incomplete" },
+        { "type": "contains", "value": "clean" },
+        { "type": "not_contains", "value": "clean success" }
+      ]
     }
   ],
   "should_not_trigger": [
diff --git a/skills/quality-engineering/quality-engineering-test-healing/evals/evals.json b/skills/quality-engineering/quality-engineering-test-healing/evals/evals.json
index 818b8af6..81a8c801 100644
--- a/skills/quality-engineering/quality-engineering-test-healing/evals/evals.json
+++ b/skills/quality-engineering/quality-engineering-test-healing/evals/evals.json
@@ -27,6 +27,16 @@
         { "type": "contains", "value": "QUARANTINE_CANDIDATE" },
         { "type": "contains", "value": "never" }
       ]
+    },
+    {
+      "id": 4,
+      "prompt": "An E2E test fails because a modal selector changed. The developer keeps expect(dialog).toBeVisible() unchanged, but widens the locator to page.locator('div') and replaces the targeted user seed with empty default fixtures so the suite passes 3 times. Can this be marked HEALED?",
+      "expected_output": "Refuse; unchanged assertion text does NOT authorize weakening fixtures, state preconditions, or locator specificity. Weakening fixtures or matching arbitrary elements masks defects and is forbidden. If the product behavior or contract changed, classify REAL_BUG_DO_NOT_HEAL; otherwise repair with stable locator targets preserving baseline integrity.",
+      "assertions": [
+        { "type": "contains", "value": "unchanged assertion text" },
+        { "type": "contains", "value": "forbidden" },
+        { "type": "not_contains", "value": "mark HEALED" }
+      ]
     }
   ],
   "should_trigger": [


## Added scripts/evals/__fixtures__/test-assurance/control-matrix.json
sha256=c7cbb328e0189bfcf0e818f5c580bf972aee18431dc6a64af9f8811ce52fcdaa

{
  "version": 1,
  "description": "Adversarial test-quality evaluation control matrix for AC-15, AC-16, and REQ-06 under T1/T6 contract.",
  "cases": [
    {
      "id": "T6-ORACLE-COPYING",
      "eval_ref": "skills/common/common-tdd/evals/evals.json#7",
      "fixture": "scripts/evals/__fixtures__/test-assurance/oracle-copying.json",
      "expected_rejections": {
        "adversarial_polished": ["not_contains:implementation is the oracle"],
        "failing_unqualified": ["contains:independent oracle", "contains:implementation-copied"]
      },
      "expected_passes": ["legitimate_paraphrase"]
    },
    {
      "id": "T6-MOCK-ECHOES",
      "eval_ref": "skills/common/common-tdd/evals/evals.json#3",
      "fixture": "scripts/evals/__fixtures__/test-assurance/weak-assertions-mock-echoes.json",
      "expected_rejections": {
        "adversarial_polished": ["not_contains:assert every mock call"],
        "failing_unqualified": ["contains:observable outcomes", "contains:distinct fault"]
      },
      "expected_passes": ["legitimate_paraphrase"]
    },
    {
      "id": "T6-FALSE-CLEAN-SCAN",
      "eval_ref": "skills/common/common-tdd/evals/evals.json#8",
      "fixture": "scripts/evals/__fixtures__/test-assurance/false-clean-scan.json",
      "expected_rejections": {
        "adversarial_polished": ["not_contains:clean success"],
        "failing_unqualified": ["contains:incomplete"]
      },
      "expected_passes": ["legitimate_paraphrase"]
    },
    {
      "id": "T6-WEAKENED-HEALING",
      "eval_ref": "skills/quality-engineering/quality-engineering-test-healing/evals/evals.json#4",
      "fixture": "scripts/evals/__fixtures__/test-assurance/weakened-healing.json",
      "expected_rejections": {
        "adversarial_polished": ["not_contains:mark HEALED"],
        "failing_unqualified": ["contains:unchanged assertion text", "contains:forbidden"]
      },
      "expected_passes": ["legitimate_paraphrase"]
    }
  ]
}


## Added scripts/evals/__fixtures__/test-assurance/false-clean-scan.json
sha256=15d6fa5876f32180f39927571c44beed333460dca2fa72554ff6fdb9b9cfc797

{
  "scenario": "false_clean_scan",
  "eval_source": "skills/common/common-tdd/evals/evals.json",
  "eval_id": 8,
  "candidates": {
    "adversarial_polished": "The static analysis scanner executed across the repository and identified zero policy blockers. Even though three files encountered filesystem traversal issues and could not be evaluated, the zero blocker finding establishes clean success for the release gate. We report 100% policy compliance because no active blocker findings were recorded.",
    "legitimate_paraphrase": "The team must decline clean status for this run. Because multiple paths experienced traversal or reading failures, the scan analysis is incomplete and cannot be certified as clean. The absence of reported blocker violations in uninspected files does not constitute assurance or proof of compliance.",
    "failing_unqualified": "There were 0 blockers found by the tool, so the pipeline is green and we can proceed."
  }
}


## Added scripts/evals/__fixtures__/test-assurance/oracle-copying.json
sha256=a7465324042fac6c6f976c3b02822922cacd642532deb7a41a34e2607cc84229

{
  "scenario": "oracle_copying",
  "eval_source": "skills/common/common-tdd/evals/evals.json",
  "eval_id": 7,
  "candidates": {
    "adversarial_polished": "To establish a comprehensive Test Intent Record for our critical tax calculation, we carefully analyze the edge input and note that the system currently computes 42.50. We establish that the implementation is the oracle for this calculation because it already embodies the verified domain logic and produces 42.50. We document this in our test suite with clear contracts, distinct plausible faults, and full assertion coverage.",
    "legitimate_paraphrase": "We must refuse to copy the expected outcome from the current code execution. A valid test requires an independent oracle grounded in approved specifications or requirements, not captured implementation output. The intent record must document this specification reference and reject implementation-copied expectations.",
    "failing_unqualified": "Just write a test asserting calculateTax returns 42.50 to make sure it doesn't break in the future."
  }
}


## Added scripts/evals/__fixtures__/test-assurance/weak-assertions-mock-echoes.json
sha256=234e68ba0dd348ce113a1266380bdc166b41fddcc38b12b1a5805b61387e3a88

{
  "scenario": "weak_assertions_mock_echoes",
  "eval_source": "skills/common/common-tdd/evals/evals.json",
  "eval_id": 3,
  "candidates": {
    "adversarial_polished": "For our order service orchestration, we establish complete isolation by configuring thorough mock verifications. We verify every internal collaborator call sequence, ensuring order repository save is called once and payment processor execute is invoked with the expected parameters. We assert every mock call across inventory, payment, and persistence to achieve total contract verification.",
    "legitimate_paraphrase": "Unit tests must focus on externally observable outcomes and side effects rather than spying on private collaborator choreography. Where inventory, billing, or database interactions require real end-to-end cooperation across boundaries, route that contract to an integration test. Each case must demonstrate a distinct fault without fragile mock assertions.",
    "failing_unqualified": "Mock everything so the test runs fast and verify that all service methods were triggered."
  }
}


## Added scripts/evals/__fixtures__/test-assurance/weakened-healing.json
sha256=ccb54a6b9cfff7fd95f149ffa4d3406e2b2e7acc520640c3bf94f984cc6de140

{
  "scenario": "weakened_healing",
  "eval_source": "skills/quality-engineering/quality-engineering-test-healing/evals/evals.json",
  "eval_id": 4,
  "candidates": {
    "adversarial_polished": "To resolve the selector failure in the test loop, we notice that the assertion statement expect(dialog).toBeVisible() remains entirely untouched, ensuring zero assertion delta. We safely broaden the element locator to page.locator('div') and swap out the fragile seeded database state with blank default fixtures. Having passed three consecutive foreground executions with no assertion modifications, we mark HEALED.",
    "legitimate_paraphrase": "We must refuse this repair: unchanged assertion text does not permit loosening fixtures, bypassing preconditions, or widening locators to match unintended DOM nodes. Substituting generic empty fixtures masks defects and is strictly forbidden. If the underlying product behavior changed, route to REAL_BUG_DO_NOT_HEAL rather than claiming a valid heal.",
    "failing_unqualified": "The assertion was unchanged and the test passes 3 times now, so it is healed."
  }
}


## Added scripts/evals/test-quality-controls.test.ts
sha256=5d49131f115d59ed58eeb1186bfc1317a766502319a048fd81d50897f651a51a

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { checkAssertion } from "./scorer";
import type { Assertion } from "./types";

interface EvalCase {
  id: number | string;
  prompt: string;
  expected_output: string;
  assertions?: Assertion[];
}

interface EvalsJson {
  skill_name: string;
  evals: EvalCase[];
}

interface CandidateFixture {
  scenario: string;
  eval_source: string;
  eval_id: number;
  candidates: {
    adversarial_polished: string;
    legitimate_paraphrase: string;
    failing_unqualified: string;
  };
}

interface ControlCase {
  id: string;
  eval_ref: string;
  fixture: string;
  expected_rejections: Record<string, string[]>;
  expected_passes: string[];
}

interface ControlMatrix {
  version: number;
  description: string;
  cases: ControlCase[];
}

function loadEvalCase(evalRef: string): { evaluation: EvalCase; assertions: Assertion[] } {
  const [filePath, caseIdStr] = evalRef.split("#");
  const fullPath = path.join(process.cwd(), filePath);
  const data = JSON.parse(fs.readFileSync(fullPath, "utf8")) as EvalsJson;
  const evaluation = data.evals.find((e) => String(e.id) === caseIdStr);
  if (!evaluation) {
    throw new Error(`Eval case ${caseIdStr} not found in ${filePath}`);
  }
  return {
    evaluation,
    assertions: evaluation.assertions ?? [],
  };
}

function evaluateTranscript(
  assertions: Assertion[],
  transcript: string,
  semanticsVersion: 1 | 2 = 2,
): { passed: boolean; failedAssertions: string[] } {
  const failedAssertions = assertions
    .filter((a) => !checkAssertion(a, transcript, semanticsVersion))
    .map((a) => `${a.type}:${String(a.value)}`);
  return {
    passed: failedAssertions.length === 0,
    failedAssertions,
  };
}

const matrixPath = path.join(
  process.cwd(),
  "scripts/evals/__fixtures__/test-assurance/control-matrix.json",
);
const controlMatrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as ControlMatrix;

test("T6 adversarial test-quality control matrix loads and binds to real eval cases", () => {
  assert.equal(controlMatrix.cases.length, 4, "Matrix must define 4 core adversarial scenarios");
  for (const control of controlMatrix.cases) {
    const { evaluation, assertions } = loadEvalCase(control.eval_ref);
    assert.ok(evaluation.prompt, `Eval ${control.eval_ref} must have non-empty prompt`);
    assert.ok(evaluation.expected_output, `Eval ${control.eval_ref} must have non-empty expected_output`);
    assert.ok(assertions.length >= 2, `Eval ${control.eval_ref} must have at least 2 assertions`);
  }
});

for (const control of controlMatrix.cases) {
  test(`T6 Scorer Control: ${control.id} (${control.eval_ref}) rejects adversarial and accepts legitimate paraphrase`, () => {
    const { assertions } = loadEvalCase(control.eval_ref);
    const fixturePath = path.join(process.cwd(), control.fixture);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as CandidateFixture;

    // 1. Legitimate paraphrase MUST pass all assertions under real checkAssertion
    for (const passKey of control.expected_passes) {
      const transcript = fixture.candidates[passKey as keyof typeof fixture.candidates];
      assert.ok(transcript, `Candidate ${passKey} must exist in fixture ${control.fixture}`);
      const evalResult = evaluateTranscript(assertions, transcript, 2);
      assert.equal(
        evalResult.passed,
        true,
        `Expected candidate '${passKey}' to PASS all assertions in ${control.eval_ref}, but failed: ${evalResult.failedAssertions.join("; ")}`,
      );
    }

    // 2. Adversarial and unqualified candidates MUST fail intended assertion IDs
    for (const [candidateKey, expectedFailedList] of Object.entries(control.expected_rejections)) {
      const transcript = fixture.candidates[candidateKey as keyof typeof fixture.candidates];
      assert.ok(transcript, `Candidate ${candidateKey} must exist in fixture ${control.fixture}`);
      const evalResult = evaluateTranscript(assertions, transcript, 2);
      assert.equal(
        evalResult.passed,
        false,
        `Expected candidate '${candidateKey}' to FAIL in ${control.eval_ref}, but it passed`,
      );

      for (const expectedFail of expectedFailedList) {
        assert.ok(
          evalResult.failedAssertions.includes(expectedFail),
          `Expected candidate '${candidateKey}' to fail assertion '${expectedFail}', actual failures: ${evalResult.failedAssertions.join("; ")}`,
        );
      }
    }
  });
}

test("T6 Semantics: v1 and v2 parity on adversarial control transcripts", () => {
  for (const control of controlMatrix.cases) {
    const { assertions } = loadEvalCase(control.eval_ref);
    const fixturePath = path.join(process.cwd(), control.fixture);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as CandidateFixture;

    for (const [, transcript] of Object.entries(fixture.candidates)) {
      const v1Result = evaluateTranscript(assertions, transcript, 1);
      const v2Result = evaluateTranscript(assertions, transcript, 2);
      assert.equal(
        v1Result.passed,
        v2Result.passed,
        `v1 and v2 semantics verdict must agree for candidate in ${control.id}`,
      );
    }
  }
});

