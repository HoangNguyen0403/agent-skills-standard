import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { checkAssertion } from "./scorer";
import type { Assertion } from "./types";

type EvalCase = {
  id: number | string;
  assertions?: Assertion[];
};

type EvalDefinition = {
  evals?: EvalCase[];
};

function loadCases(relativePath: string): EvalCase[] {
  const filePath = path.join(process.cwd(), relativePath);
  const definition = JSON.parse(
    fs.readFileSync(filePath, "utf8"),
  ) as EvalDefinition;
  return definition.evals ?? [];
}

function caseAssertions(cases: EvalCase[], id: string): Assertion[] {
  const currentCase = cases.find((candidate) => String(candidate.id) === id);
  if (!currentCase?.assertions) {
    throw new Error(`Missing assertions for eval case ${id}`);
  }
  return currentCase.assertions;
}

function passesAll(assertions: Assertion[], transcript: string): boolean {
  return assertions.every((assertion) =>
    checkAssertion(assertion, transcript, 2),
  );
}

const methodologyCases = loadCases(
  "skills/system-design/system-design-methodology/evals/evals.json",
);
const estimationCases = loadCases(
  "skills/system-design/system-design-estimation/evals/evals.json",
);
const diagrammingCases = loadCases(
  "skills/common/common-architecture-diagramming/evals/evals.json",
);

test("methodology case 1 rejects a vocabulary-only answer", () => {
  const phraseOnly = "Intake. QPS. constraint -> component.";

  assert.equal(
    passesAll(caseAssertions(methodologyCases, "1"), phraseOnly),
    false,
  );
});

test("methodology case 1 accepts equivalent concrete design evidence", () => {
  const concreteEquivalent =
    "Ask the blocking intake questions first. Calculation: 200,000 buyers x 25% x 2 retries / 10 seconds = 10,000 inventory requests/s. Use an atomic reservation and an idempotency key so duplicate requests return the original result. The invariant is never allocating more than available stock; each component is tied to a constraint and cost.";

  assert.equal(
    passesAll(caseAssertions(methodologyCases, "1"), concreteEquivalent),
    true,
  );
});

test("paired methodology case requires re-evaluation, not an architecture change", () => {
  const staleAnswer =
    "Keep the strict no-oversell invariant and the original reservation flow.";
  const changedConstraintAnswer =
    "The changed constraint allows 0.1% bounded oversell and 30 seconds to settle. Use a bounded-oversell invariant with eventual consistency, then reconcile or compensate failed reservations. 0.1% is within the 30 second recovery window.";
  const retainedStricterAnswer =
    "Recompute the changed constraint: it allows 0.1% oversell and 30 seconds to settle. Retain strict no-oversell with atomic reservation because that is simpler and safer; the strict reservation recovery path still completes within 30 seconds.";

  assert.equal(
    passesAll(caseAssertions(methodologyCases, "4"), staleAnswer),
    false,
  );
  assert.equal(
    passesAll(caseAssertions(methodologyCases, "4"), changedConstraintAnswer),
    true,
  );
  assert.equal(
    passesAll(caseAssertions(methodologyCases, "4"), retainedStricterAnswer),
    true,
  );
});

test("paired estimation case accepts equivalent units and changed peak", () => {
  const concreteEquivalent =
    "Average traffic remains about 2,300 QPS. The changed peak factor is 20x, so peak is about 46,000 QPS. At 4 kilobytes per request this is about 184 MB per second egress, which changes the shaping quantity and first scaling step.";

  assert.equal(
    passesAll(caseAssertions(estimationCases, "4"), concreteEquivalent),
    true,
  );
});

// Contract: line wrapping and ordinary rounding cannot turn a correct estimate
// into a lexical failure. Fault: single-line, fixed-rounding numeric patterns.
test("quantitative smoke accepts multiline calculations and ordinary rounding", () => {
  const estimate = [
    "Average QPS = 10M x 20 / 86,400 = 2.3148k.",
    "The changed peak factor is 20x.",
    "Peak traffic is 46.296k QPS.",
    "At 4 KB per response,",
    "bandwidth is about 185.184 MB/s.",
    "The changed peak is the shaping quantity for the first scaling step.",
  ].join("\n");

  assert.equal(passesAll(caseAssertions(estimationCases, "4"), estimate), true);
});

test("diagram routing cases distinguish HLD and LLD without requiring source wording", () => {
  const correctRouting =
    "Use a context diagram for the executive HLD boundary decision. Give developers separate views: a component view or ERD for inventory relationships. Keep separate views and one C4 level per diagram.";
  const mixedLevelShortcut =
    "Use one HLD diagram containing the executive boundary, SQL columns, retry states, and Kubernetes pods.";

  assert.equal(
    passesAll(caseAssertions(diagrammingCases, "9"), correctRouting),
    true,
  );
  assert.equal(
    passesAll(caseAssertions(diagrammingCases, "10"), mixedLevelShortcut),
    false,
  );
});

test("diagram provenance keeps documented confidence separate from runtime deployment", () => {
  const documentedEdge =
    "The proposed fraud-check and implemented checkout lifecycles are separate. The edge has provenance and evidence_kind=document, evidence_confidence=documented. The deployment/runtime claim unproven; target, measured, and estimated metrics remain distinct.";

  assert.equal(
    passesAll(caseAssertions(diagrammingCases, "11"), documentedEdge),
    true,
  );
  assert.equal(
    passesAll(
      caseAssertions(diagrammingCases, "11"),
      documentedEdge.replace("evidence_kind=document, ", ""),
    ),
    false,
  );
});
