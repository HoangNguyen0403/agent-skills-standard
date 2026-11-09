/**
 * scripts/skill-tests/provider-neutral-security-depth/access-control.test.mjs
 *
 * Independent native behavior test suite for provider-neutral security depth.
 * Tests pure access control evaluation functions against the frozen independent oracle.
 *
 * Ingress: rtk node --test scripts/skill-tests/provider-neutral-security-depth/access-control.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  evaluateVulnerableAccess,
  evaluateFixedAccess
} from "../../../skills/cybersecurity/cyber-scoped-validation/scripts/offline-access-control-fixture.mjs";

// Exact 20 case IDs required by approved SRS LLD-POLICY / LLD-CHECK
export const REQUIRED_CASE_IDS = Object.freeze([
  "AV-rA-read",
  "AV-rA-update",
  "AV-rB-read",
  "AV-rB-update",
  "AE-rA-read",
  "AE-rA-update",
  "AE-rB-read",
  "AE-rB-update",
  "BV-rA-read",
  "BV-rA-update",
  "BV-rB-read",
  "BV-rB-update",
  "BE-rA-read",
  "BE-rA-update",
  "BE-rB-read",
  "BE-rB-update",
  "AV-rA-update-claimed-editor",
  "AV-rB-update-claimed-editor",
  "BV-rA-update-claimed-editor",
  "BV-rB-update-claimed-editor"
]);

// Independently accepted oracle SHA-256 digest (LF line endings). The acceptance record is in
// docs/srs/srs-walkthrough-provider-neutral-security-depth.md; any content change needs independent re-review.
export const EXPECTED_ORACLE_SHA256 =
  "ce9a50f534f6783e9a2d209cb7d55a67ff8171113f0d277c93e1586c5e28b5da";

// Load actual frozen independent oracle matrix via file URL
const matrixUrl = new URL(
  "../../../skills/cybersecurity/cyber-scoped-validation/assets/offline-access-control-matrix.json",
  import.meta.url
);
const rawMatrix = JSON.parse(readFileSync(matrixUrl, "utf8"));

/**
 * Validates corpus integrity, case uniqueness, exact inventory, cross-references,
 * caseId naming rules, and action/value constraints.
 * Throws descriptive Error on any malformed or incomplete corpus variant.
 */
export function validateCorpus(matrixData) {
  if (!matrixData || typeof matrixData !== "object") {
    throw new Error("Invalid corpus: matrixData must be an object");
  }
  if (!Array.isArray(matrixData.cases)) {
    throw new Error("Invalid corpus: cases property must be an array");
  }

  // Validate initialResources keys and self-consistent ids
  if (!matrixData.initialResources || typeof matrixData.initialResources !== "object") {
    throw new Error("Invalid corpus: initialResources must be an object");
  }
  for (const key of Object.keys(matrixData.initialResources)) {
    const res = matrixData.initialResources[key];
    if (!res || res.id !== key) {
      throw new Error(`Invalid corpus: initialResources[${key}].id must equal "${key}"`);
    }
  }

  const seenIds = new Set();
  const caseIds = [];

  for (const c of matrixData.cases) {
    if (!c.caseId || typeof c.caseId !== "string") {
      throw new Error(`Invalid corpus: case missing valid caseId: ${JSON.stringify(c)}`);
    }
    if (seenIds.has(c.caseId)) {
      throw new Error(`Invalid corpus: duplicate caseId "${c.caseId}"`);
    }
    seenIds.add(c.caseId);
    caseIds.push(c.caseId);

    // Validate principal reference using Object.hasOwn to prevent prototype pollution / inherited keys
    if (!matrixData.principals || !Object.hasOwn(matrixData.principals, c.principalId)) {
      throw new Error(`Invalid corpus: unresolved principalId "${c.principalId}" in case "${c.caseId}"`);
    }

    // Validate resource reference using Object.hasOwn
    if (!matrixData.initialResources || !Object.hasOwn(matrixData.initialResources, c.request?.resourceId)) {
      throw new Error(`Invalid corpus: unresolved resourceId "${c.request?.resourceId}" in case "${c.caseId}"`);
    }

    // Validate state references using Object.hasOwn
    const fixedStateRef = c.expectedFixed?.stateRef;
    if (!matrixData.expectedStates || !Object.hasOwn(matrixData.expectedStates, fixedStateRef)) {
      throw new Error(`Invalid corpus: unresolved expectedFixed.stateRef "${fixedStateRef}" in case "${c.caseId}"`);
    }

    const vulnStateRef = c.expectedVulnerable?.stateRef;
    if (!matrixData.expectedStates || !Object.hasOwn(matrixData.expectedStates, vulnStateRef)) {
      throw new Error(`Invalid corpus: unresolved expectedVulnerable.stateRef "${vulnStateRef}" in case "${c.caseId}"`);
    }

    // (1) caseId naming contract: must equal `${principalId}-${resourceId}-${action}` plus optional `-claimed-editor`
    const isClaimedEditor = c.request?.claimedRole === "editor";
    const suffix = isClaimedEditor ? "-claimed-editor" : "";
    const expectedCaseId = `${c.principalId}-${c.request?.resourceId}-${c.request?.action}${suffix}`;

    if (c.caseId !== expectedCaseId) {
      throw new Error(
        `Invalid corpus: caseId "${c.caseId}" does not match expected "${expectedCaseId}"`
      );
    }

    if (!isClaimedEditor && Object.hasOwn(c.request, "claimedRole")) {
      throw new Error(
        `Invalid corpus: claimedRole must be absent when not "editor" in case "${c.caseId}"`
      );
    }

    // (2) update value contract and read value prohibition
    const targetResource = matrixData.initialResources[c.request.resourceId];
    if (c.request.action === "update") {
      const expectedValue = `${targetResource.tenantId}1`;
      if (c.request.value !== expectedValue) {
        throw new Error(
          `Invalid corpus: update value "${c.request.value}" must equal "${expectedValue}" in case "${c.caseId}"`
        );
      }
    } else if (c.request.action === "read") {
      if (Object.hasOwn(c.request, "value") && c.request.value !== undefined) {
        throw new Error(
          `Invalid corpus: read request must carry no value in case "${c.caseId}"`
        );
      }
    }
  }

  // Exact set equality with REQUIRED_CASE_IDS
  const missing = REQUIRED_CASE_IDS.filter((id) => !seenIds.has(id));
  const unexpected = caseIds.filter((id) => !REQUIRED_CASE_IDS.includes(id));

  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Invalid corpus case inventory mismatch. Missing: [${missing.join(", ")}], Unexpected: [${unexpected.join(", ")}]`
    );
  }

  return true;
}

/**
 * Creates fresh, isolated clones of principal, request, and resources for a given case.
 */
function prepareFreshInputs(matrixData, testCase) {
  const principal = structuredClone(matrixData.principals[testCase.principalId]);
  const request = structuredClone(testCase.request);
  const resources = structuredClone(matrixData.initialResources);
  return { principal, request, resources };
}

/**
 * Executes one access evaluation with strict behavior, state, immutability, and alias assertions.
 */
function assertAccessEvaluation({ evaluateFn, matrixData, testCase, expected, fnName }) {
  const { principal, request, resources } = prepareFreshInputs(matrixData, testCase);

  const principalSnapshot = structuredClone(principal);
  const requestSnapshot = structuredClone(request);
  const resourcesSnapshot = structuredClone(resources);

  const result = evaluateFn({ principal, request, resources });

  // 1. Complete literal response comparison
  assert.deepStrictEqual(
    result.response,
    expected.response,
    `${fnName} response mismatch for case ${testCase.caseId}`
  );

  // 2. Complete literal internal nextResources state comparison
  const expectedState = matrixData.expectedStates[expected.stateRef];
  assert.deepStrictEqual(
    result.nextResources,
    expectedState,
    `${fnName} nextResources state mismatch for case ${testCase.caseId}`
  );

  // 3. Immutability verification: inputs must never be mutated
  assert.deepStrictEqual(
    principal,
    principalSnapshot,
    `${fnName} mutated input principal in case ${testCase.caseId}`
  );
  assert.deepStrictEqual(
    request,
    requestSnapshot,
    `${fnName} mutated input request in case ${testCase.caseId}`
  );
  assert.deepStrictEqual(
    resources,
    resourcesSnapshot,
    `${fnName} mutated input resources in case ${testCase.caseId}`
  );

  // 4. Detachment and alias verification
  assert.notEqual(
    result.nextResources,
    resources,
    `${fnName} nextResources must not alias input resources in case ${testCase.caseId}`
  );

  if (result.response.resource !== null) {
    assert.notEqual(
      result.response.resource,
      resources[testCase.request.resourceId],
      `${fnName} response.resource must not alias input resource in case ${testCase.caseId}`
    );
  } else {
    assert.strictEqual(
      result.response.resource,
      null,
      `${fnName} denial response must not disclose resource data in case ${testCase.caseId}`
    );
    assert.strictEqual(
      result.response.error,
      "access-denied",
      `${fnName} denial response error must be 'access-denied' in case ${testCase.caseId}`
    );
  }
}

// ---------------------------------------------------------------------------
// Suite 1: Oracle Identity Pinning & Corpus Integrity Validation (AC-005, AC-012)
// ---------------------------------------------------------------------------

test("AC-005: Oracle identity pinned to independently accepted SHA-256 digest", () => {
  // Normalize CRLF to LF so a Windows autocrlf checkout does not break the pin; content changes still fail.
  const fileText = readFileSync(matrixUrl, "utf8").replace(/\r\n/g, "\n");
  const actualHash = createHash("sha256").update(fileText, "utf8").digest("hex");
  assert.strictEqual(
    actualHash,
    EXPECTED_ORACLE_SHA256,
    "Oracle matrix digest mismatch: changed oracle needs independent re-review"
  );
});

test("AC-012: Actual frozen oracle matrix satisfies exact 20-case inventory and references", () => {
  assert.doesNotThrow(() => validateCorpus(rawMatrix));
  assert.strictEqual(rawMatrix.cases.length, 20);
});

test("AC-012: Corpus validation rejects missing case ID variant", () => {
  const mutatedMatrix = structuredClone(rawMatrix);
  mutatedMatrix.cases = mutatedMatrix.cases.filter((c) => c.caseId !== "AV-rA-read");
  assert.throws(
    () => validateCorpus(mutatedMatrix),
    /Missing: \[AV-rA-read\]/
  );
});

test("AC-012: Corpus validation rejects duplicate case ID variant", () => {
  const mutatedMatrix = structuredClone(rawMatrix);
  mutatedMatrix.cases.push(structuredClone(mutatedMatrix.cases[0]));
  assert.throws(
    () => validateCorpus(mutatedMatrix),
    /duplicate caseId "AV-rA-read"/
  );
});

test("AC-012: Corpus validation rejects unresolved expected state reference", () => {
  const mutatedMatrix = structuredClone(rawMatrix);
  mutatedMatrix.cases[0].expectedFixed.stateRef = "S_NONEXISTENT";
  assert.throws(
    () => validateCorpus(mutatedMatrix),
    /unresolved expectedFixed\.stateRef "S_NONEXISTENT"/
  );
});

test("AC-012: Corpus validation rejects unresolved principal reference", () => {
  const mutatedMatrix = structuredClone(rawMatrix);
  mutatedMatrix.cases[0].principalId = "UNKNOWN_PRINCIPAL";
  assert.throws(
    () => validateCorpus(mutatedMatrix),
    /unresolved principalId "UNKNOWN_PRINCIPAL"/
  );
});

test("AC-012: Corpus validation rejects unresolved resource reference", () => {
  const mutatedMatrix = structuredClone(rawMatrix);
  mutatedMatrix.cases[0].request.resourceId = "rUNKNOWN";
  assert.throws(
    () => validateCorpus(mutatedMatrix),
    /unresolved resourceId "rUNKNOWN"/
  );
});

test("AC-012: Corpus validation rejects inherited-key reference (prototype pollution resistance)", () => {
  const mutatedMatrix = structuredClone(rawMatrix);
  mutatedMatrix.cases[0].principalId = "constructor";
  assert.throws(
    () => validateCorpus(mutatedMatrix),
    /unresolved principalId "constructor"/
  );
});

test("AC-012: Corpus validation rejects caseId and request input disagreement", () => {
  const mutatedMatrix = structuredClone(rawMatrix);
  // Case ID says AV-rA-read but request points to rB
  const targetCase = mutatedMatrix.cases.find((c) => c.caseId === "AV-rA-read");
  targetCase.request.resourceId = "rB";
  assert.throws(
    () => validateCorpus(mutatedMatrix),
    /caseId "AV-rA-read" does not match expected "AV-rB-read"/
  );
});

test("AC-012: Corpus validation rejects update with incorrect target value", () => {
  const mutatedMatrix = structuredClone(rawMatrix);
  // Target rA belongs to tenant A; value must be A1, not B1
  const targetCase = mutatedMatrix.cases.find((c) => c.caseId === "AV-rA-update");
  targetCase.request.value = "B1";
  assert.throws(
    () => validateCorpus(mutatedMatrix),
    /update value "B1" must equal "A1"/
  );
});

test("AC-012: Corpus validation rejects claimedRole without -claimed-editor suffix", () => {
  const mutatedMatrix = structuredClone(rawMatrix);
  const targetCase = mutatedMatrix.cases.find((c) => c.caseId === "AV-rA-update");
  targetCase.request.claimedRole = "editor";
  assert.throws(
    () => validateCorpus(mutatedMatrix),
    /caseId "AV-rA-update" does not match expected "AV-rA-update-claimed-editor"/
  );
});

test("AC-012: Corpus validation rejects claimedRole present when not editor", () => {
  const mutatedMatrix = structuredClone(rawMatrix);
  const targetCase = mutatedMatrix.cases.find((c) => c.caseId === "AV-rA-update");
  targetCase.request.claimedRole = "viewer";
  assert.throws(
    () => validateCorpus(mutatedMatrix),
    /claimedRole must be absent when not "editor"/
  );
});

test("AC-012: Corpus validation rejects read request carrying a value", () => {
  const mutatedMatrix = structuredClone(rawMatrix);
  const targetCase = mutatedMatrix.cases.find((c) => c.caseId === "AV-rA-read");
  targetCase.request.value = "A0";
  assert.throws(
    () => validateCorpus(mutatedMatrix),
    /read request must carry no value/
  );
});

// ---------------------------------------------------------------------------
// Suite 2: Deliberately Vulnerable Access Evaluation (AC-006 / AC-007 / AC-008)
// ---------------------------------------------------------------------------

test("AC-006/007/008: Deliberately vulnerable access evaluation matches characterized oracle for all 20 cases", async (t) => {
  for (const testCase of rawMatrix.cases) {
    await t.test(`vulnerable: ${testCase.caseId} (policy: ${testCase.policyRow})`, () => {
      assertAccessEvaluation({
        evaluateFn: evaluateVulnerableAccess,
        matrixData: rawMatrix,
        testCase,
        expected: testCase.expectedVulnerable,
        fnName: "evaluateVulnerableAccess"
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 3: Normative Fixed Access Control Evaluation (AC-006 / AC-007 / AC-008)
// ---------------------------------------------------------------------------

test("AC-006/007/008: Normative fixed access control evaluation matches reviewed oracle for all 20 cases", async (t) => {
  for (const testCase of rawMatrix.cases) {
    await t.test(`fixed: ${testCase.caseId} (policy: ${testCase.policyRow})`, () => {
      assertAccessEvaluation({
        evaluateFn: evaluateFixedAccess,
        matrixData: rawMatrix,
        testCase,
        expected: testCase.expectedFixed,
        fnName: "evaluateFixedAccess"
      });
    });
  }
});
