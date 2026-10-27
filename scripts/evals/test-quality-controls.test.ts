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
