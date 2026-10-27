# Immutable review snapshot T6-recovered

Repository: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala
Base: 92d06c420f6a41f08e11579423e4e3eacdb7880d
Captured: 2026-10-26T22:31:35.417Z

## Tracked diff

diff --git a/skills/common/common-tdd/evals/evals.json b/skills/common/common-tdd/evals/evals.json
index d3a0f03d..1cb37b97 100644
--- a/skills/common/common-tdd/evals/evals.json
+++ b/skills/common/common-tdd/evals/evals.json
@@ -68,6 +68,86 @@
         { "type": "contains", "value": "padding tests" },
         { "type": "not_contains", "value": "80%" }
       ]
+    },
+    {
+      "id": 7,
+      "prompt": "We need to add a test for a critical tax calculation. The implementation is already written and produces 42.50 for the edge input. The developer proposes writing assert calculateTax(order) == 42.50 by capturing the current function return. What is the compliant TDD response?",
+      "expected_output": "Reject copying the expected value from implementation output. An oracle must be independently justified by an approved requirement, external specification, or independently reviewed example artifact. Record the independent oracle reference and rationale in the Test Intent Record; implementation-copied expected output is unacceptable.",
+      "assertions": [
+        {
+          "type": "contains_any",
+          "value": ["independent oracle", "independently justified", "approved requirement", "external specification", "approved tax schedule"]
+        },
+        {
+          "type": "contains_any",
+          "value": ["implementation-copied", "copying the expected value from implementation", "copied solely from implementation", "current function return"]
+        },
+        {
+          "type": "regex",
+          "value": "(?:refuse|reject|decline|do not|don't|never|must not|cannot|can't)\\b[\\s\\S]{0,60}?(?:current function return|implementation output|implementation-copied|oracle)"
+        }
+      ]
+    },
+    {
+      "id": 8,
+      "prompt": "An external static scanner returns a report showing 0 blockers, but 3 files failed traversal and could not be analyzed. The developer claims the test suite has clean static assurance and 100% pass rate. How should the team classify this result?",
+      "expected_output": "Reject clean success. When required scope suffers traversal or parse failures, the analysis status is incomplete or error, not clean pass. Blocker absence across unanalyzed files cannot be treated as clean assurance or release protection.",
+      "assertions": [
+        {
+          "type": "contains_any",
+          "value": ["incomplete", "traversal failure", "unanalyzed files"]
+        },
+        {
+          "type": "contains_any",
+          "value": ["clean assurance", "clean pass", "clean success", "release protection"]
+        },
+        {
+          "type": "regex",
+          "value": "(?:refuse|reject|decline|deny|do not|don't|never|must not|cannot|can't)\\b[\\s\\S]{0,60}?clean\\s+(?:static\\s+)?(?:success|assurance|pass|status)"
+        }
+      ]
+    },
+    {
+      "id": 9,
+      "prompt": "A security scan ran with an empty file filter or zero eligible test files discovered in the target repository. The tool exited 0 with 0 findings. The developer claims this establishes clean production assurance. How should the team classify this empty-scope run?",
+      "expected_output": "Reject clean production assurance. An empty scope with zero analyzed files or zero eligible inputs represents missing required analysis or at best an explicitly allowed empty run (not applicable), never clean success or proof of production safety. Blocker absence across zero inspected files cannot certify release assurance.",
+      "assertions": [
+        {
+          "type": "contains_any",
+          "value": ["empty scope", "zero analyzed files", "zero eligible", "not applicable", "missing required analysis"]
+        },
+        {
+          "type": "contains_any",
+          "value": ["production assurance", "production safety", "release assurance", "clean success"]
+        },
+        {
+          "type": "regex",
+          "value": "(?:refuse|reject|decline|deny|do not|don't|never|must not|cannot|can't)\\b[\\s\\S]{0,60}?(?:clean\\s+(?:production\\s+|release\\s+)?(?:assurance|success|safety|status)|production\\s+(?:assurance|safety)|release\\s+assurance)"
+        }
+      ]
+    },
+    {
+      "id": 10,
+      "prompt": "A developer writing unit tests for an order service wants to assert every mock call across repository save and payment gateway charge, calling that sufficient protection instead of routing the persistence and payment contract to an integration test. What should the test strategy say?",
+      "expected_output": "Prove the service's observable outcomes with simple boundary fakes instead of asserting every mock call. Mock call choreography is not sufficient protection for the persistence and payment contract; route that collaboration to an integration or contract test. Each test covers one logical behavior and a distinct fault.",
+      "assertions": [
+        {
+          "type": "contains_any",
+          "value": ["observable outcomes", "observable behavior", "outward results"]
+        },
+        {
+          "type": "contains_any",
+          "value": ["integration", "contract test"]
+        },
+        {
+          "type": "contains_any",
+          "value": ["distinct fault"]
+        },
+        {
+          "type": "regex",
+          "value": "(?:do not|don't|never|avoid|refuse|reject|must not|cannot|can't|rather than|instead of|without|not)\\b[\\s\\S]{0,50}?(?:every mock|all mock|each mock|mock call|call choreography|mock assertions?|mock invocation)"
+        }
+      ]
     }
   ],
   "should_not_trigger": [
diff --git a/skills/quality-engineering/quality-engineering-test-healing/evals/evals.json b/skills/quality-engineering/quality-engineering-test-healing/evals/evals.json
index 818b8af6..fc12dc6a 100644
--- a/skills/quality-engineering/quality-engineering-test-healing/evals/evals.json
+++ b/skills/quality-engineering/quality-engineering-test-healing/evals/evals.json
@@ -27,6 +27,25 @@
         { "type": "contains", "value": "QUARANTINE_CANDIDATE" },
         { "type": "contains", "value": "never" }
       ]
+    },
+    {
+      "id": 4,
+      "prompt": "An E2E test fails because a modal selector changed. The developer keeps expect(dialog).toBeVisible() unchanged, but widens the locator to page.locator('div') and replaces the targeted user seed with empty default fixtures so the suite passes 3 times. Can this be marked HEALED?",
+      "expected_output": "Refuse to heal: unchanged assertion text does NOT authorize weakening fixtures, state preconditions, or locator specificity. Weakening fixtures or matching arbitrary elements masks defects and is forbidden. If the product behavior or contract changed, classify REAL_BUG_DO_NOT_HEAL; otherwise repair with stable locator targets preserving baseline integrity.",
+      "assertions": [
+        {
+          "type": "contains_any",
+          "value": ["unchanged assertion text", "unchanged assertion statement", "assertion unchanged"]
+        },
+        {
+          "type": "contains_any",
+          "value": ["forbidden", "strictly forbidden", "refuse", "not authorize", "does not permit"]
+        },
+        {
+          "type": "regex",
+          "value": "(?:refuse|reject|decline|do not|don't|never|must not|cannot|can't|does not|doesn't)\\b[\\s\\S]{0,60}?(?:heal(?:ed|ing)?|classify\\s+REAL_BUG_DO_NOT_HEAL)"
+        }
+      ]
     }
   ],
   "should_trigger": [


## Added scripts/evals/__fixtures__/test-assurance/control-matrix.json
sha256=a70aee5c832e97b7ee6f8362249d8511b4d52ac6c8bc501707e044e316a642db

{
  "version": 3,
  "description": "Adversarial test-quality evaluation control matrix for AC-15, AC-16, and REQ-06. Every assertion is evaluated by the production checkAssertion primitive unchanged: a true result is compliant, a false result is a failure. The decision assertion for each case is a bounded compliant-decision constraint, never a prohibition that must be inverted.",
  "cases": [
    {
      "id": "T6-ORACLE-COPYING",
      "eval_ref": "skills/common/common-tdd/evals/evals.json#7",
      "fixture": "scripts/evals/__fixtures__/test-assurance/oracle-copying.json",
      "positive_assertion_indices": [0, 1],
      "decision_assertion_index": 2,
      "expected_rejections": {
        "adversarial_polished": {
          "positive_assertions_pass": true
        },
        "failing_unqualified": {
          "positive_assertions_pass": false
        }
      },
      "expected_passes": [
        "legitimate_paraphrase",
        "legitimate_alternate_prose",
        "legitimate_with_negation",
        "legitimate_with_quotation",
        "reference_answer"
      ]
    },
    {
      "id": "T6-MOCK-ECHOES",
      "eval_ref": "skills/common/common-tdd/evals/evals.json#10",
      "fixture": "scripts/evals/__fixtures__/test-assurance/weak-assertions-mock-echoes.json",
      "positive_assertion_indices": [0, 1, 2],
      "decision_assertion_index": 3,
      "expected_rejections": {
        "adversarial_polished": {
          "positive_assertions_pass": true
        },
        "failing_unqualified": {
          "positive_assertions_pass": false
        }
      },
      "expected_passes": [
        "legitimate_paraphrase",
        "legitimate_alternate_prose",
        "legitimate_with_negation",
        "legitimate_with_quotation",
        "reference_answer"
      ]
    },
    {
      "id": "T6-FALSE-CLEAN-SCAN",
      "eval_ref": "skills/common/common-tdd/evals/evals.json#8",
      "fixture": "scripts/evals/__fixtures__/test-assurance/false-clean-scan.json",
      "positive_assertion_indices": [0, 1],
      "decision_assertion_index": 2,
      "expected_rejections": {
        "adversarial_polished": {
          "positive_assertions_pass": true
        },
        "failing_unqualified": {
          "positive_assertions_pass": false
        }
      },
      "expected_passes": [
        "legitimate_paraphrase",
        "legitimate_alternate_prose",
        "legitimate_with_negation",
        "legitimate_with_quotation",
        "reference_answer"
      ]
    },
    {
      "id": "T6-EMPTY-SCOPE-SCAN",
      "eval_ref": "skills/common/common-tdd/evals/evals.json#9",
      "fixture": "scripts/evals/__fixtures__/test-assurance/empty-scope-scan.json",
      "positive_assertion_indices": [0, 1],
      "decision_assertion_index": 2,
      "expected_rejections": {
        "adversarial_polished": {
          "positive_assertions_pass": true
        },
        "failing_unqualified": {
          "positive_assertions_pass": false
        }
      },
      "expected_passes": [
        "legitimate_paraphrase",
        "legitimate_alternate_prose",
        "legitimate_with_negation",
        "legitimate_with_quotation",
        "reference_answer"
      ]
    },
    {
      "id": "T6-WEAKENED-HEALING",
      "eval_ref": "skills/quality-engineering/quality-engineering-test-healing/evals/evals.json#4",
      "fixture": "scripts/evals/__fixtures__/test-assurance/weakened-healing.json",
      "positive_assertion_indices": [0, 1],
      "decision_assertion_index": 2,
      "expected_rejections": {
        "adversarial_polished": {
          "positive_assertions_pass": true
        },
        "failing_unqualified": {
          "positive_assertions_pass": false
        }
      },
      "expected_passes": [
        "legitimate_paraphrase",
        "legitimate_alternate_prose",
        "legitimate_with_negation",
        "legitimate_with_quotation",
        "reference_answer"
      ]
    }
  ]
}


## Added scripts/evals/__fixtures__/test-assurance/empty-scope-scan.json
sha256=5671af3f755fd2f12804b4ef0bb88a45ccd564c7cba68d21ed071e44e4ea1776

{
  "scenario": "empty_scope_scan",
  "eval_source": "skills/common/common-tdd/evals/evals.json",
  "eval_id": 9,
  "candidates": {
    "adversarial_polished": "The scanner evaluated the requested directory and found zero eligible test files matching the file filter, so zero analyzed files were processed. While this represents an empty scope that is not applicable for defect discovery, the tool exited with code 0 and zero blockers. We report clean production assurance because no vulnerabilities were detected in the build.",
    "legitimate_paraphrase": "We must decline release certification. Discovering zero eligible inputs in an empty scope indicates missing required analysis, or an allowed empty run whose findings are not applicable. Zero analyzed files cannot provide production assurance or prove release safety.",
    "legitimate_alternate_prose": "An empty scope with zero analyzed files is not applicable, so the team must reject clean success and require valid test inputs before claiming production safety.",
    "legitimate_with_negation": "Reject clean production assurance. Zero eligible files in an empty scope means the analysis is not applicable, never proof of production safety.",
    "legitimate_with_quotation": "The report says \"clean production assurance\", but that is wrong: an empty scope with zero eligible inputs is missing required analysis, and zero analyzed files cannot certify release assurance.",
    "reference_answer": "Reject clean production assurance. An empty scope with zero analyzed files or zero eligible inputs represents missing required analysis or at best an explicitly allowed empty run (not applicable), never clean success or proof of production safety. Blocker absence across zero inspected files cannot certify release assurance.",
    "failing_unqualified": "The scanner found zero errors and exited cleanly, so the build has passed."
  }
}


## Added scripts/evals/__fixtures__/test-assurance/false-clean-scan.json
sha256=17748fd70535c6e1835d5cded7fee42f4b0340c20e0475c3e54c0b00e25beb83

{
  "scenario": "false_clean_scan",
  "eval_source": "skills/common/common-tdd/evals/evals.json",
  "eval_id": 8,
  "candidates": {
    "adversarial_polished": "The static analysis scanner executed across the repository and identified zero policy blockers. Even though three files encountered filesystem traversal failures and represent unanalyzed files leaving incomplete analysis, the zero blocker finding establishes clean assurance for the deployment gate. We report clean static success because no active blocker findings were recorded.",
    "legitimate_paraphrase": "The team must decline clean status for this run. Because multiple paths experienced traversal failures leaving unanalyzed files, the analysis is incomplete and cannot be certified as clean. The absence of reported violations in uninspected files is not release protection or clean assurance.",
    "legitimate_alternate_prose": "The scan is incomplete; unanalyzed files mean the team must reject clean success and require a re-scan before releasing.",
    "legitimate_with_negation": "Reject clean success. When required scope encounters a traversal failure, the verdict is incomplete, so uninspected files cannot provide clean assurance.",
    "legitimate_with_quotation": "The developer's claim \"clean static success\" is unacceptable here: three files suffered a traversal failure, so the analysis is incomplete and the run cannot certify clean assurance.",
    "reference_answer": "Reject clean success. When required scope suffers traversal or parse failures, the analysis status is incomplete or error, not clean pass. Blocker absence across unanalyzed files cannot be treated as clean assurance or release protection.",
    "failing_unqualified": "There were 0 blockers found by the tool, so the pipeline is green and we can proceed."
  }
}


## Added scripts/evals/__fixtures__/test-assurance/oracle-copying.json
sha256=9c09e5688806bc0a5e6b19787451e902b58f901852308e2c6351d4fc22713180

{
  "scenario": "oracle_copying",
  "eval_source": "skills/common/common-tdd/evals/evals.json",
  "eval_id": 7,
  "candidates": {
    "adversarial_polished": "To establish our Test Intent Record for the tax calculation, we evaluate the edge input against our testing criteria. We note that while testing guidelines recommend an independent oracle and warn against implementation-copied expectations, in this specific critical scenario the current function return already implements the approved formula accurately. Therefore, we approve the current function return output as the oracle for calculateTax so the suite can proceed to green.",
    "legitimate_paraphrase": "We must refuse to treat the current implementation output as the oracle. An independent oracle has to be independently justified by an approved requirement or external specification, and the Test Intent Record must document that reference instead of implementation-copied expectations.",
    "legitimate_alternate_prose": "Derive the expected amount from the approved tax schedule, never from the current function return; record the schedule reference and rationale in the intent record rather than copying code output.",
    "legitimate_with_negation": "Do not claim the implementation is the oracle. Reject implementation-copied expectations and require an independently justified oracle reference before writing the assertion.",
    "legitimate_with_quotation": "The proposal states \"we approve the current function return output as the oracle\", and that reasoning is wrong: the expected value must be independently justified by an approved requirement, never from captured implementation output. Implementation-copied expected values are unacceptable.",
    "reference_answer": "Reject copying the expected value from implementation output. An oracle must be independently justified by an approved requirement, external specification, or independently reviewed example artifact. Record the independent oracle reference and rationale in the Test Intent Record; implementation-copied expected output is unacceptable.",
    "failing_unqualified": "Just write assert calculateTax(order) == 42.50 to make sure the function return does not change."
  }
}


## Added scripts/evals/__fixtures__/test-assurance/weak-assertions-mock-echoes.json
sha256=c72f6a5a2bd1971b6e03c5c0a5ed778bca82943c76bd9458953d3c44d43b1d07

{
  "scenario": "weak_assertions_mock_echoes",
  "eval_source": "skills/common/common-tdd/evals/evals.json",
  "eval_id": 10,
  "candidates": {
    "adversarial_polished": "For our order service orchestration, our goal is to prove observable outcomes while verifying integration boundaries and each distinct fault. To ensure no subtle regressions occur between inventory and payment, we establish total contract isolation by choosing to assert every mock call across repository save and payment gateway charge. This internal mock choreography gives us immediate feedback on invocation sequence.",
    "legitimate_paraphrase": "Unit tests must focus on externally observable outcomes and side effects rather than spying on private collaborator choreography. Where inventory, billing, or database interactions require real end-to-end cooperation across boundaries, route that contract to an integration test. Each case must demonstrate a distinct fault without fragile mock assertions.",
    "legitimate_alternate_prose": "Verify outward results in service unit tests with simple boundary fakes. Real payment gateway and database collaboration belongs in an integration test suite. Each automated check catches a distinct fault; avoid asserting every mock call and drop call-count verifications.",
    "legitimate_with_negation": "Do not assert every mock call. Unit tests prove observable outcomes with simple fakes, and multi-component workflows route to integration tests with a distinct fault.",
    "legitimate_with_quotation": "The proposal to \"assert every mock call across repository save and payment gateway charge\" is not acceptable: prove observable outcomes with boundary fakes and route the real collaboration to an integration test, because each test must catch a distinct fault and must not assert every mock call.",
    "reference_answer": "Unit tests should prove the service's observable outcomes with simple boundary fakes or external mocks, not mock call choreography. Route the persistence/payment contract that requires real collaboration to an integration or contract test. Each test has one logical behavior and a distinct fault.",
    "failing_unqualified": "Mock everything so the test runs fast and verify that all service methods were triggered."
  }
}


## Added scripts/evals/__fixtures__/test-assurance/weakened-healing.json
sha256=7e3b40bcd7a869b8bd2c641624065bf02d78d0b9aff8f5b537e95e16c4652754

{
  "scenario": "weakened_healing",
  "eval_source": "skills/quality-engineering/quality-engineering-test-healing/evals/evals.json",
  "eval_id": 4,
  "candidates": {
    "adversarial_polished": "To resolve the selector failure in the test loop, we notice that the assertion statement expect(dialog).toBeVisible() remains entirely untouched, ensuring unchanged assertion text throughout the test run. While engineering guidelines note that loosening fixtures is forbidden in strict TDD, here broadening the selector to match the container and clearing seed data unblocks the regression suite across 3 green runs. Therefore, we declare this repair as HEALED.",
    "legitimate_paraphrase": "We must refuse to heal this test: unchanged assertion text does not authorize loosening fixtures, bypassing preconditions, or widening locators to match unintended DOM nodes. Substituting generic empty fixtures masks defects and is strictly forbidden; if the product behavior changed, route to REAL_BUG_DO_NOT_HEAL.",
    "legitimate_alternate_prose": "Unchanged assertion statement, but widening the locator or stripping fixture state does not authorize a heal. The engineer must refuse this change and classify REAL_BUG_DO_NOT_HEAL.",
    "legitimate_with_negation": "Do not mark HEALED. Unchanged assertion text does not permit fixture weakening; bypassing test state is forbidden.",
    "legitimate_with_quotation": "The claim that the suite is \"HEALED\" is wrong: unchanged assertion text does not authorize fixture weakening, so refuse the change and classify REAL_BUG_DO_NOT_HEAL.",
    "reference_answer": "Refuse to heal: unchanged assertion text does NOT authorize weakening fixtures, state preconditions, or locator specificity. Weakening fixtures or matching arbitrary elements masks defects and is forbidden. If the product behavior or contract changed, classify REAL_BUG_DO_NOT_HEAL; otherwise repair with stable locator targets preserving baseline integrity.",
    "failing_unqualified": "The test passes 3 times now, so it is healed."
  }
}


## Added scripts/evals/test-quality-controls.test.ts
sha256=45589d7460401c06808a591f442fb04c283c384a1f748bde53b302f17196b641

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
  candidates: Record<string, string>;
}

interface CaseRejectionConfig {
  positive_assertions_pass: boolean;
}

interface ControlCase {
  id: string;
  eval_ref: string;
  fixture: string;
  positive_assertion_indices: number[];
  decision_assertion_index: number;
  expected_rejections: Record<string, CaseRejectionConfig>;
  expected_passes: string[];
}

interface ControlMatrix {
  version: number;
  description: string;
  cases: ControlCase[];
}

interface CandidateScore {
  assertionResults: boolean[];
  failedIndices: number[];
  passed: boolean;
}

function loadEvalCase(evalRef: string): Assertion[] {
  const [filePath, caseIdStr] = evalRef.split("#");
  const fullPath = path.join(process.cwd(), filePath);
  const data = JSON.parse(fs.readFileSync(fullPath, "utf8")) as EvalsJson;
  const evaluation = data.evals.find((entry) => String(entry.id) === caseIdStr);
  if (!evaluation) {
    throw new Error(`Eval case ${caseIdStr} not found in ${filePath}`);
  }
  return evaluation.assertions ?? [];
}

function scoreCandidate(assertions: Assertion[], transcript: string): CandidateScore {
  // Production semantics: every assertion is evaluated by checkAssertion and a
  // true result is compliant. Nothing here transforms, inverts, or re-weights a
  // result, so an assertion that reproduces a production bug cannot be hidden.
  const assertionResults = assertions.map((assertion) =>
    checkAssertion(assertion, transcript, 2),
  );
  const failedIndices = assertionResults.flatMap((passed, index) =>
    passed ? [] : [index],
  );
  return { assertionResults, failedIndices, passed: failedIndices.length === 0 };
}

function describeFailures(
  assertions: Assertion[],
  score: CandidateScore,
): string {
  return score.failedIndices
    .map((index) => `[${index}] ${assertions[index].type}:${String(assertions[index].value)}`)
    .join("; ");
}

function candidateTranscript(
  fixture: CandidateFixture,
  key: string,
): string {
  const transcript = fixture.candidates[key];
  assert.ok(transcript, `Candidate '${key}' must be present in ${fixture.scenario}`);
  return transcript;
}

const matrixPath = path.join(
  process.cwd(),
  "scripts/evals/__fixtures__/test-assurance/control-matrix.json",
);
const controlMatrix = JSON.parse(
  fs.readFileSync(matrixPath, "utf8"),
) as ControlMatrix;

for (const control of controlMatrix.cases) {
  test(`T6 scorer control: ${control.id} (${control.eval_ref})`, async (t) => {
    const assertions = loadEvalCase(control.eval_ref);
    const fixture = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), control.fixture), "utf8"),
    ) as CandidateFixture;
    const decisionIndex = control.decision_assertion_index;

    await t.test(
      "keyword-rich unsafe candidate passes every positive assertion and fails only the decision assertion",
      () => {
        const score = scoreCandidate(
          assertions,
          candidateTranscript(fixture, "adversarial_polished"),
        );

        for (const index of control.positive_assertion_indices) {
          assert.equal(
            score.assertionResults[index],
            true,
            `${control.id} adversarial_polished must satisfy positive assertion [${index}] ` +
              `${assertions[index].type}:${String(assertions[index].value)}; ` +
              `failures: ${describeFailures(assertions, score)}`,
          );
        }

        assert.equal(
          score.assertionResults[decisionIndex],
          false,
          `${control.id} adversarial_polished must fail the decision assertion [${decisionIndex}] ` +
            `${assertions[decisionIndex].type}:${String(assertions[decisionIndex].value)}`,
        );
        assert.deepEqual(
          score.failedIndices,
          [decisionIndex],
          `${control.id} adversarial_polished must be rejected by the decision assertion alone; ` +
            `failures: ${describeFailures(assertions, score)}`,
        );
        assert.equal(score.passed, false);
      },
    );

    await t.test(
      "unqualified wrong candidate is rejected by positive assertions",
      () => {
        const score = scoreCandidate(
          assertions,
          candidateTranscript(fixture, "failing_unqualified"),
        );
        const positivesPass = control.positive_assertion_indices.every(
          (index) => score.assertionResults[index],
        );

        assert.equal(
          score.passed,
          false,
          `${control.id} failing_unqualified must be rejected`,
        );
        assert.equal(
          positivesPass,
          control.expected_rejections.failing_unqualified
            .positive_assertions_pass,
          `${control.id} failing_unqualified positive assertion outcome mismatch; ` +
            `failures: ${describeFailures(assertions, score)}`,
        );
      },
    );

    await t.test(
      "compliant paraphrase, alternate prose, negation, and quotation pass every assertion",
      () => {
        for (const key of control.expected_passes) {
          const score = scoreCandidate(
            assertions,
            candidateTranscript(fixture, key),
          );
          assert.equal(
            score.passed,
            true,
            `${control.id} candidate '${key}' must pass all assertions unchanged; ` +
              `failures: ${describeFailures(assertions, score)}`,
          );
        }
      },
    );
  });
}

