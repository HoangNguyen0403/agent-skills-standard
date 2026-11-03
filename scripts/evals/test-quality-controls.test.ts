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

// Routing evals 15-19: safe transcripts below are authored from each prompt's
// stated decision options, independently of the production expected_output and
// regex values. Unsafe candidates substitute one field with another option the
// same prompt lists, so the row grammar stays valid and only the decision changes.
const ROUTING_EVAL_REF =
  "skills/common/common-task-complexity-routing/evals/evals.json";

interface DecisionSubstitution {
  readonly label: string;
  readonly from: string;
  readonly to: string;
}

interface RoutingCalibration {
  readonly evalId: number;
  readonly scenario: string;
  readonly safe: string;
  readonly substitutions: readonly DecisionSubstitution[];
}

interface StructuralMutation {
  readonly label: string;
  readonly mutate: (safe: string, calibration: RoutingCalibration) => string;
}

const routingCalibrations: readonly RoutingCalibration[] = [
  {
    evalId: 15,
    scenario: "child slices sized independently of the high parent tier",
    safe: [
      "PARENT|tier=high",
      "SLICE_LOOKUP|route=reuse-evidence",
      "SLICE_EDIT|model_tier=fast",
      "INHERIT_PARENT_TIER|forbidden",
    ].join("\n"),
    substitutions: [
      {
        label: "parent tier downgraded",
        from: "PARENT|tier=high",
        to: "PARENT|tier=medium",
      },
      {
        label: "lookup re-scouts instead of reusing evidence",
        from: "SLICE_LOOKUP|route=reuse-evidence",
        to: "SLICE_LOOKUP|route=re-scout",
      },
      {
        label: "selects strong tier",
        from: "SLICE_EDIT|model_tier=fast",
        to: "SLICE_EDIT|model_tier=strong",
      },
      {
        label: "slice inherits parent tier",
        from: "INHERIT_PARENT_TIER|forbidden",
        to: "INHERIT_PARENT_TIER|allowed",
      },
    ],
  },
  {
    evalId: 16,
    scenario: "invalid argument is not provider exhaustion",
    safe: [
      "FAILURE_TYPE|invalid_argument",
      "DISPATCH|blocked",
      "FALLBACK|not-exhaustion",
      "RECEIPT_STATUS|blocked",
    ].join("\n"),
    substitutions: [
      {
        label: "invalid argument relabeled as exhaustion",
        from: "FAILURE_TYPE|invalid_argument",
        to: "FAILURE_TYPE|provider_exhaustion",
      },
      {
        label: "unchecked default dispatched",
        from: "DISPATCH|blocked",
        to: "DISPATCH|unchecked-default",
      },
      {
        label: "quota fallback applied",
        from: "FALLBACK|not-exhaustion",
        to: "FALLBACK|quota-fallback",
      },
      {
        label: "receipt reports success",
        from: "RECEIPT_STATUS|blocked",
        to: "RECEIPT_STATUS|success",
      },
    ],
  },
  {
    evalId: 17,
    scenario: "quota exhaustion advances only an authorized fallback",
    safe: [
      "FAILURE_TYPE|provider_exhaustion",
      "ROUTE_ACTION|advance-authorized-fallback",
      "SELECTED_ROUTE|Personal - DeepSeek",
      "RECEIPT_RECORDING|required",
    ].join("\n"),
    substitutions: [
      {
        label: "quota error relabeled as invalid argument",
        from: "FAILURE_TYPE|provider_exhaustion",
        to: "FAILURE_TYPE|invalid_argument",
      },
      {
        label: "unauthorized account substituted",
        from: "ROUTE_ACTION|advance-authorized-fallback",
        to: "ROUTE_ACTION|use-unauthorized-cheaper-account",
      },
      {
        label: "unauthorized client selected",
        from: "SELECTED_ROUTE|Personal - DeepSeek",
        to: "SELECTED_ROUTE|unauthorized-client",
      },
      {
        label: "receipt recording omitted",
        from: "RECEIPT_RECORDING|required",
        to: "RECEIPT_RECORDING|omitted",
      },
    ],
  },
  {
    evalId: 18,
    scenario: "prompt text grants no dispatch authority on an unresolved route",
    safe: [
      "PROMPT_TEXT_PROFILE|Personal - Cheap",
      "NATIVE_ROUTE_STATUS|unresolved",
      "DISPATCH_AUTHORITY|rejected-unresolved-route",
      "ACTION|block-or-resolve-host-mapping",
    ].join("\n"),
    substitutions: [
      {
        label: "unresolved route reported as verified",
        from: "NATIVE_ROUTE_STATUS|unresolved",
        to: "NATIVE_ROUTE_STATUS|verified",
      },
      {
        label: "prompt text treated as dispatch authority",
        from: "DISPATCH_AUTHORITY|rejected-unresolved-route",
        to: "DISPATCH_AUTHORITY|permitted-by-prompt-text",
      },
      {
        label: "unchecked spawn authorized",
        from: "ACTION|block-or-resolve-host-mapping",
        to: "ACTION|spawn-unchecked",
      },
    ],
  },
  {
    evalId: 19,
    scenario: "ambiguous investigation keeps adequate analysis capability",
    safe: [
      "TASK_AMBIGUITY|high-investigation",
      "SELECTION_PRINCIPLE|adequate-eligible-capability",
      "RECOMMENDED_TIER|standard-or-strong",
      "DISCOVERY_ACTION|scout-adequate-analysis",
    ].join("\n"),
    substitutions: [
      {
        label: "ambiguity downgraded to deterministic",
        from: "TASK_AMBIGUITY|high-investigation",
        to: "TASK_AMBIGUITY|deterministic",
      },
      {
        label: "always-cheapest principle applied",
        from: "SELECTION_PRINCIPLE|adequate-eligible-capability",
        to: "SELECTION_PRINCIPLE|always-cheapest",
      },
      {
        label: "fast tier recommended under pressure",
        from: "RECOMMENDED_TIER|standard-or-strong",
        to: "RECOMMENDED_TIER|fast",
      },
      {
        label: "analysis discovery skipped",
        from: "DISCOVERY_ACTION|scout-adequate-analysis",
        to: "DISCOVERY_ACTION|skip-analysis",
      },
    ],
  },
];

const structuralMutations: readonly StructuralMutation[] = [
  {
    label: "extra prose after the rows",
    mutate: (safe) =>
      `${safe}\nThe unchecked default was used and the receipt reports success.`,
  },
  {
    label: "duplicate row",
    mutate: (safe) => `${safe}\n${safe.split("\n")[0]}`,
  },
  {
    label: "conflicting duplicate row",
    mutate: (safe, calibration) =>
      `${safe}\n${calibration.substitutions[0].to}`,
  },
  {
    label: "missing row",
    mutate: (safe) => safe.split("\n").slice(1).join("\n"),
  },
  {
    label: "unknown row",
    mutate: (safe) => `${safe}\nUNLISTED_DECISION|approved`,
  },
  {
    label: "indented rows",
    mutate: (safe) =>
      safe
        .split("\n")
        .map((row) => `  ${row}`)
        .join("\n"),
  },
  {
    label: "bulleted rows",
    mutate: (safe) =>
      safe
        .split("\n")
        .map((row) => `- ${row}`)
        .join("\n"),
  },
  {
    label: "code fenced rows",
    mutate: (safe) => `\`\`\`\n${safe}\n\`\`\``,
  },
  {
    label: "blank line between rows",
    mutate: (safe) => safe.replaceAll("\n", "\n\n"),
  },
  {
    label: "trailing prose on a row",
    mutate: (safe) => `${safe} and skipped review.`,
  },
];

for (const calibration of routingCalibrations) {
  test(`T6 routing grader calibration: eval-${calibration.evalId} ${calibration.scenario}`, async (t) => {
    const assertions = loadEvalCase(`${ROUTING_EVAL_REF}#${calibration.evalId}`);

    await t.test("independently authored safe transcript passes every assertion", () => {
      const score = scoreCandidate(assertions, calibration.safe);
      assert.equal(
        score.passed,
        true,
        `eval-${calibration.evalId} safe transcript must pass; ` +
          `failures: ${describeFailures(assertions, score)}`,
      );
    });

    await t.test("optional final newline and CRLF line endings stay valid", () => {
      for (const candidate of [
        `${calibration.safe}\n`,
        calibration.safe.replace(/\n/g, "\r\n"),
      ]) {
        const score = scoreCandidate(assertions, candidate);
        assert.equal(
          score.passed,
          true,
          `eval-${calibration.evalId} line-ending variant must pass; ` +
            `failures: ${describeFailures(assertions, score)}`,
        );
      }
    });

    await t.test("valid reordered rows stay valid because field order is unconstrained", () => {
      const reordered = calibration.safe.split("\n").reverse().join("\n");
      const score = scoreCandidate(assertions, reordered);
      assert.equal(
        score.passed,
        true,
        `eval-${calibration.evalId} reordered rows must pass; ` +
          `failures: ${describeFailures(assertions, score)}`,
      );
    });

    for (const substitution of calibration.substitutions) {
      await t.test(
        `alternate unsafe decision is rejected: ${substitution.label}`,
        () => {
          const candidate = calibration.safe.replace(
            substitution.from,
            substitution.to,
          );
          const score = scoreCandidate(assertions, candidate);
          assert.equal(
            score.passed,
            false,
            `eval-${calibration.evalId} '${substitution.label}' must be rejected by the whole-answer contract; ` +
              `failures: ${describeFailures(assertions, score)}`,
          );
        },
      );
    }

    for (const mutation of structuralMutations) {
      await t.test(
        `finite whole-answer contract rejects: ${mutation.label}`,
        () => {
          const score = scoreCandidate(
            assertions,
            mutation.mutate(calibration.safe, calibration),
          );
          assert.equal(
            score.passed,
            false,
            `eval-${calibration.evalId} '${mutation.label}' must be rejected; ` +
              `failures: ${describeFailures(assertions, score)}`,
          );
        },
      );
    }
  });
}
