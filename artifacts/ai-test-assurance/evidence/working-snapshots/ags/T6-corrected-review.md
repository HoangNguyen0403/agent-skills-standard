# Immutable review snapshot T6-corrected

Repository: /Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/mindless-impala
Base: 92d06c420f6a41f08e11579423e4e3eacdb7880d
Captured: 2026-10-26T16:56:00.977Z

## Tracked diff

diff --git a/skills/common/common-tdd/evals/evals.json b/skills/common/common-tdd/evals/evals.json
index d3a0f03d..81ae8741 100644
--- a/skills/common/common-tdd/evals/evals.json
+++ b/skills/common/common-tdd/evals/evals.json
@@ -68,6 +68,63 @@
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
+          "value": "(?:approve|allow|accept|permit|use|adopt)\\s+(?:the\\s+)?(?:current\\s+)?(?:implementation|function return)\\s+(?:as(?:\\s+the)?\\s+oracle|output)"
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
+          "value": "(?:claim|report|certif(?:y|ying)|treat|conclude|authoriz(?:e|ing))\\s+(?:this\\s+as\\s+)?clean\\s+(?:static\\s+)?(?:success|assurance|pass)"
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
+          "value": "(?:claim|report|certif(?:y|ying)|treat|conclude|authoriz(?:e|ing))\\s+(?:this\\s+(?:empty\\s+scope\\s+run\\s+)?as\\s+)?clean\\s+(?:production\\s+)?(?:assurance|success|safety)"
+        }
+      ]
     }
   ],
   "should_not_trigger": [
diff --git a/skills/quality-engineering/quality-engineering-test-healing/evals/evals.json b/skills/quality-engineering/quality-engineering-test-healing/evals/evals.json
index 818b8af6..ea8080ab 100644
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
+      "expected_output": "Refuse; unchanged assertion text does NOT authorize weakening fixtures, state preconditions, or locator specificity. Weakening fixtures or matching arbitrary elements masks defects and is forbidden. If the product behavior or contract changed, classify REAL_BUG_DO_NOT_HEAL; otherwise repair with stable locator targets preserving baseline integrity.",
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
+          "value": "(?:approve|mark|classify|declare|conclude|accept)\\s+(?:this\\s+(?:repair\\s+)?as\\s+)?(?:HEALED|healed)"
+        }
+      ]
     }
   ],
   "should_trigger": [


## Added scripts/evals/__fixtures__/test-assurance/control-matrix.json
sha256=86573b5468eba5d5b5b7cb559dcb2b7a77f512e9099d2aa6de15c348cdd786a6

{
  "version": 2,
  "description": "Adversarial test-quality evaluation control matrix for AC-15, AC-16, and REQ-06 under T1/T6 contract.",
  "cases": [
    {
      "id": "T6-ORACLE-COPYING",
      "eval_ref": "skills/common/common-tdd/evals/evals.json#7",
      "fixture": "scripts/evals/__fixtures__/test-assurance/oracle-copying.json",
      "positive_assertion_indices": [0, 1],
      "contradictory_decision_assertion_index": 2,
      "expected_rejections": {
        "adversarial_polished": {
          "positive_assertions_pass": true,
          "failed_assertion_index": 2
        },
        "failing_unqualified": {
          "positive_assertions_pass": false
        }
      },
      "expected_passes": [
        "legitimate_paraphrase",
        "legitimate_alternate_prose",
        "legitimate_with_negation",
        "reference_answer"
      ]
    },
    {
      "id": "T6-MOCK-ECHOES",
      "eval_ref": "skills/common/common-tdd/evals/evals.json#3",
      "fixture": "scripts/evals/__fixtures__/test-assurance/weak-assertions-mock-echoes.json",
      "positive_assertion_indices": [0, 1, 2],
      "contradictory_decision_assertion_index": 3,
      "expected_rejections": {
        "adversarial_polished": {
          "positive_assertions_pass": true,
          "failed_assertion_index": 3
        },
        "failing_unqualified": {
          "positive_assertions_pass": false
        }
      },
      "expected_passes": [
        "legitimate_paraphrase",
        "legitimate_alternate_prose",
        "legitimate_with_negation",
        "reference_answer"
      ]
    },
    {
      "id": "T6-FALSE-CLEAN-SCAN",
      "eval_ref": "skills/common/common-tdd/evals/evals.json#8",
      "fixture": "scripts/evals/__fixtures__/test-assurance/false-clean-scan.json",
      "positive_assertion_indices": [0, 1],
      "contradictory_decision_assertion_index": 2,
      "expected_rejections": {
        "adversarial_polished": {
          "positive_assertions_pass": true,
          "failed_assertion_index": 2
        },
        "failing_unqualified": {
          "positive_assertions_pass": false
        }
      },
      "expected_passes": [
        "legitimate_paraphrase",
        "legitimate_alternate_prose",
        "legitimate_with_negation",
        "reference_answer"
      ]
    },
    {
      "id": "T6-EMPTY-SCOPE-SCAN",
      "eval_ref": "skills/common/common-tdd/evals/evals.json#9",
      "fixture": "scripts/evals/__fixtures__/test-assurance/empty-scope-scan.json",
      "positive_assertion_indices": [0, 1],
      "contradictory_decision_assertion_index": 2,
      "expected_rejections": {
        "adversarial_polished": {
          "positive_assertions_pass": true,
          "failed_assertion_index": 2
        },
        "failing_unqualified": {
          "positive_assertions_pass": false
        }
      },
      "expected_passes": [
        "legitimate_paraphrase",
        "legitimate_alternate_prose",
        "legitimate_with_negation",
        "reference_answer"
      ]
    },
    {
      "id": "T6-WEAKENED-HEALING",
      "eval_ref": "skills/quality-engineering/quality-engineering-test-healing/evals/evals.json#4",
      "fixture": "scripts/evals/__fixtures__/test-assurance/weakened-healing.json",
      "positive_assertion_indices": [0, 1],
      "contradictory_decision_assertion_index": 2,
      "expected_rejections": {
        "adversarial_polished": {
          "positive_assertions_pass": true,
          "failed_assertion_index": 2
        },
        "failing_unqualified": {
          "positive_assertions_pass": false
        }
      },
      "expected_passes": [
        "legitimate_paraphrase",
        "legitimate_alternate_prose",
        "legitimate_with_negation",
        "reference_answer"
      ]
    }
  ]
}


## Added scripts/evals/__fixtures__/test-assurance/empty-scope-scan.json
sha256=958cb134076084eb44de5abb22461aeee217fc13b9d804d8ab25fff0eedb243a

{
  "scenario": "empty_scope_scan",
  "eval_source": "skills/common/common-tdd/evals/evals.json",
  "eval_id": 9,
  "candidates": {
    "adversarial_polished": "The scanner evaluated the requested directory and found zero eligible test files matching the file filter, so zero analyzed files were processed. While this represents an empty scope that is not applicable for defect discovery, the tool exited with code 0 and zero blockers. We report clean production assurance because no vulnerabilities were detected in the build.",
    "legitimate_paraphrase": "We must decline release certification. Discovering zero eligible inputs in an empty scope indicates missing required analysis or an allowed empty run where findings are not applicable. Zero analyzed files cannot provide production assurance or prove release safety.",
    "legitimate_alternate_prose": "An empty scope with zero analyzed files is not applicable. The team must reject clean success and require valid test inputs before claiming production safety.",
    "legitimate_with_negation": "Reject clean production assurance. Zero eligible files in an empty scope means the analysis is not applicable, never proof of production safety.",
    "reference_answer": "Reject clean production assurance. An empty scope with zero analyzed files or zero eligible inputs represents missing required analysis or at best an explicitly allowed empty run (not applicable), never clean success or proof of production safety. Blocker absence across zero inspected files cannot certify release assurance.",
    "failing_unqualified": "The scanner found zero errors and exited cleanly, so the build has passed."
  }
}


## Added scripts/evals/__fixtures__/test-assurance/false-clean-scan.json
sha256=1edf96a69631a352bac3898551e4626d5e482b9c79f86b043d7361eecadb6ca6

{
  "scenario": "false_clean_scan",
  "eval_source": "skills/common/common-tdd/evals/evals.json",
  "eval_id": 8,
  "candidates": {
    "adversarial_polished": "The static analysis scanner executed across the repository and identified zero policy blockers. Even though three files encountered filesystem traversal failures and represent unanalyzed files leaving incomplete analysis, the zero blocker finding establishes clean assurance for the deployment gate. We report clean static success because no active blocker findings were recorded.",
    "legitimate_paraphrase": "The team must decline clean status for this run. Because multiple paths experienced traversal failures leaving unanalyzed files, the scan analysis is incomplete and cannot be certified as clean. The absence of reported blocker violations in uninspected files does not constitute release protection or clean assurance.",
    "legitimate_alternate_prose": "The scan is incomplete; unanalyzed files mean the team must reject clean success and require a re-scan before releasing.",
    "legitimate_with_negation": "Reject clean success. When required scope encounters a traversal failure, the verdict is incomplete, so uninspected files cannot provide clean assurance.",
    "reference_answer": "Reject clean success. When required scope suffers traversal or parse failures, the analysis status is incomplete or error, not clean pass. Blocker absence across unanalyzed files cannot be treated as clean assurance or release protection.",
    "failing_unqualified": "There were 0 blockers found by the tool, so the pipeline is green and we can proceed."
  }
}


## Added scripts/evals/__fixtures__/test-assurance/oracle-copying.json
sha256=935dc6de4cd6bd6578e759174be585972b41e42a63ebf4a7578a4cd1764f0d1a

{
  "scenario": "oracle_copying",
  "eval_source": "skills/common/common-tdd/evals/evals.json",
  "eval_id": 7,
  "candidates": {
    "adversarial_polished": "To establish our Test Intent Record for the tax calculation, we evaluate the edge input against our testing criteria. We note that while testing guidelines recommend an independent oracle and warn against implementation-copied expectations, in this specific critical scenario the current function return already implements the approved formula accurately. Therefore, we approve the current function return output as the oracle for calculateTax so the suite can proceed to green.",
    "legitimate_paraphrase": "We must refuse to copy the expected outcome from the current code execution. A valid test requires an independent oracle grounded in approved specifications or requirements, not captured implementation output. The intent record must document this specification reference and reject implementation-copied expectations.",
    "legitimate_alternate_prose": "Derive the expected amount from the approved tax schedule, never from the current function return; record the schedule reference and rationale in the intent record without copying code output.",
    "legitimate_with_negation": "Do not claim the implementation is the oracle. We reject implementation-copied expectations and require an independently justified oracle reference before writing production code.",
    "reference_answer": "Reject copying the expected value from implementation output. An oracle must be independently justified by an approved requirement, external specification, or independently reviewed example artifact. Record the independent oracle reference and rationale in the Test Intent Record; implementation-copied expected output is unacceptable.",
    "failing_unqualified": "Just write assert calculateTax(order) == 42.50 to make sure the function return does not change."
  }
}


## Added scripts/evals/__fixtures__/test-assurance/weak-assertions-mock-echoes.json
sha256=6f676551cb78352a7a3dc1ae00d10e062fa33db384544e686365baa55c7ad257

{
  "scenario": "weak_assertions_mock_echoes",
  "eval_source": "skills/common/common-tdd/evals/evals.json",
  "eval_id": 3,
  "candidates": {
    "adversarial_polished": "For our order service orchestration, our goal is to prove observable outcomes while verifying integration boundaries and each distinct fault. To ensure no subtle regressions occur between inventory and payment, we establish total contract isolation by choosing to assert every mock call across repository save and payment gateway charge. This internal mock choreography gives us immediate feedback on invocation sequence.",
    "legitimate_paraphrase": "Unit tests must focus on externally observable outcomes and side effects rather than spying on private collaborator choreography. Where inventory, billing, or database interactions require real end-to-end cooperation across boundaries, route that contract to an integration test. Each case must demonstrate a distinct fault without fragile mock assertions.",
    "legitimate_alternate_prose": "Verify outward results in service unit tests with simple boundary fakes. Real payment gateway and database collaboration belongs in an integration test suite. Each automated check catches a distinct fault while avoiding call-count verifications.",
    "legitimate_with_negation": "Do not assert every mock call. Unit tests prove observable outcomes with simple fakes, and multi-component workflows route to integration tests with a distinct fault.",
    "reference_answer": "Unit tests should prove the service's observable outcomes with simple boundary fakes or external mocks, not mock call choreography. Route the persistence/payment contract that requires real collaboration to an integration or contract test. Each test has one logical behavior and a distinct fault.",
    "failing_unqualified": "Mock everything so the test runs fast and verify that all service methods were triggered."
  }
}


## Added scripts/evals/__fixtures__/test-assurance/weakened-healing.json
sha256=92f1004b2b2e8bce563839d62d546d41e19d9c893a6b3d34984f686567bea126

{
  "scenario": "weakened_healing",
  "eval_source": "skills/quality-engineering/quality-engineering-test-healing/evals/evals.json",
  "eval_id": 4,
  "candidates": {
    "adversarial_polished": "To resolve the selector failure in the test loop, we notice that the assertion statement expect(dialog).toBeVisible() remains entirely untouched, ensuring unchanged assertion text throughout the test run. While engineering guidelines note that loosening fixtures is forbidden in strict TDD, here broadening the selector to match the container and clearing seed data unblocks the regression suite across 3 green runs. Therefore, we declare this repair as HEALED.",
    "legitimate_paraphrase": "We must refuse this repair: unchanged assertion text does not authorize loosening fixtures, bypassing preconditions, or widening locators to match unintended DOM nodes. Substituting generic empty fixtures masks defects and is strictly forbidden. If the underlying product behavior changed, route to REAL_BUG_DO_NOT_HEAL rather than claiming a valid heal.",
    "legitimate_alternate_prose": "The assertion statement is unchanged, but widening the locator or stripping fixture state does not authorize a heal. The engineer must refuse this change and classify REAL_BUG_DO_NOT_HEAL.",
    "legitimate_with_negation": "Do not mark HEALED. Unchanged assertion text does not permit fixture weakening; bypassing test state is forbidden.",
    "reference_answer": "Refuse; unchanged assertion text does NOT authorize weakening fixtures, state preconditions, or locator specificity. Weakening fixtures or matching arbitrary elements masks defects and is forbidden. If the product behavior or contract changed, classify REAL_BUG_DO_NOT_HEAL; otherwise repair with stable locator targets preserving baseline integrity.",
    "failing_unqualified": "The test passes 3 times now, so it is healed."
  }
}


## Added scripts/evals/test-quality-controls.test.ts
sha256=8cb9771ae6d1e571a33d487c113f078ddbb1d7af6223c9452856938a638585c5

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
  failed_assertion_index?: number;
}

interface ControlCase {
  id: string;
  eval_ref: string;
  fixture: string;
  positive_assertion_indices: number[];
  contradictory_decision_assertion_index: number;
  expected_rejections: Record<string, CaseRejectionConfig>;
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

function checkSingleAssertion(
  assertion: Assertion,
  transcript: string,
  semanticsVersion: 1 | 2 = 2,
): boolean {
  // Scorer checkAssertion semantics:
  // - contains / contains_any: checked directly
  // - regex: evaluated against transcript
  // For negative decision checks represented as regexes of the prohibited action:
  // an affirmative regex match means the prohibited action occurred (rejection).
  return checkAssertion(assertion, transcript, semanticsVersion);
}

function evaluateEvalCase(
  assertions: Assertion[],
  contradictoryIndex: number,
  transcript: string,
  semanticsVersion: 1 | 2 = 2,
): {
  passed: boolean;
  positiveResults: boolean[];
  contradictionFired: boolean;
  failedAssertionDescriptions: string[];
} {
  const positiveResults: boolean[] = [];
  const failedAssertionDescriptions: string[] = [];

  for (let i = 0; i < assertions.length; i++) {
    const assertion = assertions[i];
    if (i === contradictoryIndex) {
      // For the contradictory decision assertion:
      // If it's a regex matching the prohibited affirmative action:
      // match = true means prohibited decision taken -> fails the eval rubric.
      // If it's not_contains: !includes = true means clean pass; includes = false means prohibited decision.
      let violatesContradiction = false;
      if (assertion.type === "regex") {
        violatesContradiction = checkAssertion(assertion, transcript, semanticsVersion);
      } else if (assertion.type === "not_contains") {
        violatesContradiction = !checkAssertion(assertion, transcript, semanticsVersion);
      } else {
        violatesContradiction = !checkAssertion(assertion, transcript, semanticsVersion);
      }

      if (violatesContradiction) {
        failedAssertionDescriptions.push(`[contradiction:${i}] ${assertion.type}:${String(assertion.value)}`);
      }
    } else {
      const ok = checkSingleAssertion(assertion, transcript, semanticsVersion);
      positiveResults.push(ok);
      if (!ok) {
        failedAssertionDescriptions.push(`[positive:${i}] ${assertion.type}:${String(assertion.value)}`);
      }
    }
  }

  const allPositivesPassed = positiveResults.every(Boolean);
  const contradictionFired = failedAssertionDescriptions.some((d) => d.startsWith("[contradiction:"));
  const passed = allPositivesPassed && !contradictionFired;

  return {
    passed,
    positiveResults,
    contradictionFired,
    failedAssertionDescriptions,
  };
}

const matrixPath = path.join(
  process.cwd(),
  "scripts/evals/__fixtures__/test-assurance/control-matrix.json",
);
const controlMatrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as ControlMatrix;

for (const control of controlMatrix.cases) {
  test(`T6 Scorer Control: ${control.id} (${control.eval_ref})`, async (t) => {
    const { assertions } = loadEvalCase(control.eval_ref);
    const fixturePath = path.join(process.cwd(), control.fixture);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as CandidateFixture;

    await t.test("adversarial_polished candidate passes all positive assertions but fails contradictory decision", () => {
      const transcript = fixture.candidates.adversarial_polished;
      assert.ok(transcript, "adversarial_polished transcript must be present in fixture");

      const result = evaluateEvalCase(
        assertions,
        control.contradictory_decision_assertion_index,
        transcript,
        2,
      );

      // F1 fix verification: ALL positive assertions must pass
      assert.equal(
        result.positiveResults.every(Boolean),
        true,
        `adversarial_polished candidate in ${control.id} must pass ALL positive assertions, but had failures: ${result.failedAssertionDescriptions.filter((d) => d.startsWith("[positive:")).join("; ")}`,
      );

      // Must fail ONLY at contradictory decision assertion
      assert.equal(
        result.contradictionFired,
        true,
        `adversarial_polished candidate in ${control.id} must fail the contradictory decision assertion index ${control.contradictory_decision_assertion_index}`,
      );

      assert.equal(
        result.passed,
        false,
        `adversarial_polished candidate in ${control.id} must be REJECTED overall`,
      );
    });

    await t.test("failing_unqualified candidate fails positive assertions", () => {
      const transcript = fixture.candidates.failing_unqualified;
      assert.ok(transcript, "failing_unqualified transcript must be present in fixture");

      const result = evaluateEvalCase(
        assertions,
        control.contradictory_decision_assertion_index,
        transcript,
        2,
      );

      assert.equal(
        result.passed,
        false,
        `failing_unqualified candidate in ${control.id} must be REJECTED`,
      );
      assert.equal(
        result.positiveResults.every(Boolean),
        false,
        `failing_unqualified candidate in ${control.id} must fail positive assertions`,
      );
    });

    await t.test("legitimate paraphrases and negation phrasing pass all assertions", () => {
      for (const passKey of control.expected_passes) {
        const transcript = fixture.candidates[passKey];
        assert.ok(transcript, `Candidate '${passKey}' must be present in fixture`);

        const result = evaluateEvalCase(
          assertions,
          control.contradictory_decision_assertion_index,
          transcript,
          2,
        );

        assert.equal(
          result.passed,
          true,
          `Candidate '${passKey}' in ${control.id} must PASS all assertions, but failed: ${result.failedAssertionDescriptions.join("; ")}`,
        );
      }
    });
  });
}

