// scripts/skill-tests/testing-quality-improvement/test-fixtures.test.mjs
// Behavioural checks for the testing-quality-improvement synthetic fixtures.
// Every assertion consumes an observed response, observed ledger row or real browser
// result; no measurement is authored in this file. Mobile records are adjudicated per
// AC against approved expectations, and C6 record validity is never reported as native
// execution proof.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TestFixtureServer } from "./http-fixture-server.mjs";
import {
  evaluateSmokeReadiness,
  evaluateBusinessCalculation,
  evaluateContractCompatibility,
  evaluateIdempotency,
  evaluateRegressionSelection,
  evaluateAuthorizationAttempt,
  evaluateTenantAuthorization,
  evaluateFuzzCase,
  evaluateFuzzSequence,
  minimizeFailingInput,
  evaluateExecutionAuthorization,
  evaluatePerformanceRecovery,
  evaluatePerformanceTripwire,
  evaluateMobileEvidenceRecord,
  evaluateMobileScenarioRecord,
  evaluateTestCycleClosure
} from "./synthetic-oracles.mjs";
import { resolvePlaywrightDependency, runPlaywrightDelayedTextFixture } from "./playwright-fixture-runner.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_FIXTURES = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/api-fixtures.json"), "utf-8"));
const MOBILE_FIXTURES = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/mobile-scenarios.json"), "utf-8"));
const MOBILE_STACKS = ["ios", "android", "flutter", "react-native"];
const FINAL_BANNER_TEXT = "Order #12345 Confirmed";

const browserDependency = resolvePlaywrightDependency();
function selectionTest(id, lane, purpose, obligationIds = [], scope = "local") {
  return { id, lane, purpose, scope, obligationIds };
}

// ---------------------------------------------------------------------------
// Shared execution helpers: absolute deadlines and transport/body separation.
// ---------------------------------------------------------------------------
// The deadline is enforced, not just signalled: the scenario promise is raced against
// the abort so a stalled callback cannot outlive the bound.
async function withScenarioDeadline(ms, scenario) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`SCENARIO_DEADLINE_${ms}MS_EXCEEDED`)), ms);
  const expired = new Promise((_, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => reject(controller.signal.reason ?? new Error(`SCENARIO_DEADLINE_${ms}MS_EXCEEDED`)),
      { once: true }
    );
  });
  expired.catch(() => {});
  const work = Promise.resolve().then(() => scenario(controller.signal));
  work.catch(() => {});
  try {
    return await Promise.race([work, expired]);
  } finally {
    clearTimeout(timer);
  }
}

async function request(baseUrl, pathname, options = {}) {
  const controller = new AbortController();
  const deadlineMs = options.deadlineMs ?? 5000;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error("REQUEST_DEADLINE_EXCEEDED"));
  }, deadlineMs);
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method: options.method ?? "GET",
      headers: options.headers,
      body: options.body,
      signal: options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal
    });
    const text = await response.text();
    let body = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return {
      transport: { status: response.status },
      body,
      responseBytes: Buffer.byteLength(text),
      latencyMs: Date.now() - started,
      timedOut: false
    };
  } catch (error) {
    return {
      transport: { status: null, error: error?.cause?.code ?? error?.name ?? "TRANSPORT_ERROR" },
      body: null,
      responseBytes: 0,
      latencyMs: Date.now() - started,
      timedOut
    };
  } finally {
    clearTimeout(timer);
  }
}

function materializeCase(fuzzCase) {
  const { requestBody } = fuzzCase;
  if (requestBody.literal !== undefined) return requestBody.literal;
  const descriptor = requestBody.descriptor;
  return `${descriptor.prefix ?? ""}${descriptor.repeat.repeat(descriptor.totalBytes)}${descriptor.suffix ?? ""}`;
}

function scenarioCase(caseId) {
  return { id: caseId, ...API_FIXTURES.fuzz.cases[caseId] };
}

function idempotencyExpectation(kind) {
  const expected = API_FIXTURES.idempotency.expected;
  return {
    retryStatuses: expected.retryStatuses,
    bodyStatus: expected.bodyStatus,
    firstAttempt: { kind: expected.firstAttemptByKind[kind] }
  };
}

async function readLoadPhases(baseUrl, signal, workload) {
  const baseline = [];
  for (let index = 0; index < workload.baselineSamplesRequired; index += 1) {
    const sample = await request(baseUrl, "/api/perf/workload", { signal });
    baseline.push({ status: sample.transport.status, latencyMs: sample.latencyMs });
  }
  return baseline;
}

// ===========================================================================
// 1. Playwright: negative snapshot, sampled scalar fault, real retrying expect
// ===========================================================================
test(
  "AC-01 / AC-02: negative snapshot before mutation, real expect(locator).toHaveText after it",
  { skip: browserDependency.available ? false : `BLOCKED: ${browserDependency.missing.join("; ")}` },
  async () => {
    const server = new TestFixtureServer();
    const baseUrl = await server.start();
    try {
      await withScenarioDeadline(30000, async (signal) => {
        const outcome = await runPlaywrightDelayedTextFixture(baseUrl, { scenarioDeadlineMs: 20000, signal });
        assert.equal(outcome.status, "COMPLETED", outcome.reason);
        assert.equal(outcome.teardown, "CLOSED", "the owned browser must be disposed inside the bound");
        assert.ok(outcome.deadline.remainingMs > 0, "the scenario must finish inside its deadline");

        // The assertion under test is Playwright's own retrying expectation.
        assert.equal(outcome.dependency.assertionApi, "expect(locator).toHaveText");

        const { negativeSnapshot, sampledScalarFault, liveLocatorControl, domReplacementControl } = outcome.scenarios;

        assert.equal(negativeSnapshot.observedText, "Processing Order...");
        assert.equal(negativeSnapshot.triggerCount, 0, "negative snapshot taken before any mutation was scheduled");
        assert.equal(negativeSnapshot.preMutation, true);

        assert.equal(sampledScalarFault.pass, false);
        assert.equal(sampledScalarFault.observedText, "Processing Order...");
        assert.equal(sampledScalarFault.faultClass, "SAMPLED_STATE_RACE_CONDITION");

        assert.equal(liveLocatorControl.pass, true);
        assert.equal(liveLocatorControl.observedText, FINAL_BANNER_TEXT);
        assert.equal(liveLocatorControl.orderIdSnapshot, FINAL_BANNER_TEXT);
        assert.equal(liveLocatorControl.faultClass, null);

        assert.equal(domReplacementControl.pass, true);
        assert.equal(domReplacementControl.observedText, FINAL_BANNER_TEXT);
        assert.equal(domReplacementControl.negativeSnapshot, "Processing Order...");
        assert.equal(domReplacementControl.staleHandleDetached, true, "the handle captured before scheduling must be detached after replacement");
      });
    } finally {
      await server.stop();
    }
  }
);

test("AC-12 / AC-14: acquisition has one owner across cancellation, deadlines and cleanup", async () => {
  const dependency = {
    available: true,
    modulePath: "fixture-module",
    browserExecutable: null,
    version: "fixture",
    assertionApi: "expect(locator).toHaveText"
  };
  const preAborted = new AbortController();
  preAborted.abort(new Error("caller cancelled"));
  const cancelledBeforeLoad = await runPlaywrightDelayedTextFixture("http://127.0.0.1", {
    signal: preAborted.signal,
    resolveDependency: () => dependency
  });
  assert.equal(cancelledBeforeLoad.status, "CANCELLED");
  assert.equal(cancelledBeforeLoad.teardown, "NOT_STARTED");

  const timedOutImport = await runPlaywrightDelayedTextFixture("http://127.0.0.1", {
    scenarioDeadlineMs: 100,
    resolveDependency: () => dependency,
    loadPlaywright: () => new Promise(() => {})
  });
  assert.equal(timedOutImport.status, "DEADLINE_EXCEEDED");

  const importController = new AbortController();
  const cancelledImport = runPlaywrightDelayedTextFixture("http://127.0.0.1", {
    signal: importController.signal,
    resolveDependency: () => dependency,
    loadPlaywright: () => {
      setImmediate(() => importController.abort());
      return new Promise(() => {});
    }
  });
  assert.equal((await cancelledImport).status, "CANCELLED");

  const launchController = new AbortController();
  let resolveLateBrowser;
  let lateCloseCount = 0;
  const cancelledLaunch = runPlaywrightDelayedTextFixture("http://127.0.0.1", {
    signal: launchController.signal,
    resolveDependency: () => dependency,
    loadPlaywright: async () => ({}),
    launchBrowser: () => new Promise((resolve) => { resolveLateBrowser = resolve; })
  });
  await new Promise((resolve) => setImmediate(resolve));
  launchController.abort();
  assert.equal((await cancelledLaunch).status, "CANCELLED");
  resolveLateBrowser({ close: async () => { lateCloseCount += 1; } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(lateCloseCount, 1);

  const unavailableModule = await runPlaywrightDelayedTextFixture("http://127.0.0.1", {
    resolveDependency: () => dependency,
    loadPlaywright: async () => { throw Object.assign(new Error("module absent"), { code: "ERR_MODULE_NOT_FOUND" }); }
  });
  assert.equal(unavailableModule.status, "BLOCKED");

  const importFailure = await runPlaywrightDelayedTextFixture("http://127.0.0.1", {
    resolveDependency: () => dependency,
    loadPlaywright: async () => { throw new Error("module initialization failed"); }
  });
  assert.equal(importFailure.status, "FAILED");
  let closeCount = 0;
  const onTimeBrowser = { close: async () => { closeCount += 1; } };
  const onTime = await runPlaywrightDelayedTextFixture("http://127.0.0.1", {
    resolveDependency: () => dependency,
    loadPlaywright: async () => ({}),
    launchBrowser: async () => onTimeBrowser,
    executeScenario: async (browser) => {
      assert.equal(browser, onTimeBrowser);
      assert.equal(closeCount, 0);
      return { status: "COMPLETED", scenarios: {} };
    }
  });
  assert.equal(onTime.status, "COMPLETED");
  assert.equal(onTime.teardown, "CLOSED");
  assert.equal(closeCount, 1);

  const failedCleanup = await runPlaywrightDelayedTextFixture("http://127.0.0.1", {
    resolveDependency: () => dependency,
    loadPlaywright: async () => ({}),
    launchBrowser: async () => ({ close: async () => { throw new Error("close failed"); } }),
    executeScenario: async () => ({ status: "COMPLETED" })
  });
  assert.equal(failedCleanup.status, "TEARDOWN_FAILED");
  assert.equal(failedCleanup.teardown, "CLOSE_FAILED");
  const launchTimeout = await runPlaywrightDelayedTextFixture("http://127.0.0.1", {
    resolveDependency: () => dependency,
    loadPlaywright: async () => ({}),
    launchBrowser: async () => { throw Object.assign(new Error("launch timeout"), { name: "TimeoutError" }); }
  });
  assert.equal(launchTimeout.status, "DEADLINE_EXCEEDED");

  const unavailableBrowser = await runPlaywrightDelayedTextFixture("http://127.0.0.1", {
    resolveDependency: () => dependency,
    loadPlaywright: async () => ({}),
    launchBrowser: async () => { throw Object.assign(new Error("missing executable"), { code: "ENOENT" }); }
  });
  assert.equal(unavailableBrowser.status, "BLOCKED");

  const launchFailure = await runPlaywrightDelayedTextFixture("http://127.0.0.1", {
    resolveDependency: () => dependency,
    loadPlaywright: async () => ({}),
    launchBrowser: async () => { throw new Error("browser operation failed"); }
  });
  assert.equal(launchFailure.status, "FAILED");

  const expiredCleanup = await runPlaywrightDelayedTextFixture("http://127.0.0.1", {
    scenarioDeadlineMs: 100,
    resolveDependency: () => dependency,
    loadPlaywright: async () => ({}),
    launchBrowser: async () => ({ close: () => new Promise(() => {}) }),
    executeScenario: async () => ({ status: "COMPLETED" })
  });
  assert.equal(expiredCleanup.status, "TEARDOWN_FAILED");
  assert.equal(expiredCleanup.teardown, "CLOSE_BOUND_EXCEEDED");
});

// ===========================================================================
// 2. Smoke readiness (AC-06)
// ===========================================================================
test("AC-06: smoke rejects health status alone as business readiness", async () => {
  const server = new TestFixtureServer();
  const baseUrl = await server.start();
  try {
    await withScenarioDeadline(15000, async (signal) => {
      const health = await request(baseUrl, "/health", { signal });
      const operation = await request(baseUrl, "/api/orders", { method: "POST", signal });
      const control = evaluateSmokeReadiness(health.body, operation.transport);
      assert.equal(control.pass, true, control.detail);

      server.setMode("/api/orders", "fault-broken-op");
      const faultHealth = await request(baseUrl, "/health", { signal });
      const faultOperation = await request(baseUrl, "/api/orders", { method: "POST", signal });
      const fault = evaluateSmokeReadiness(faultHealth.body, faultOperation.transport);
      assert.equal(fault.pass, false);
      assert.equal(fault.faultClass, "HEALTH_STATUS_EQUATED_WITH_BUSINESS_READINESS");
      assert.equal(faultOperation.transport.status, 500);
    });
  } finally {
    await server.stop();
  }
});

// ===========================================================================
// 3. Functional business rule (AC-07)
// ===========================================================================
test("AC-07: functional invariant rejects a schema-valid wrong total", async () => {
  const server = new TestFixtureServer();
  const baseUrl = await server.start();
  try {
    await withScenarioDeadline(15000, async (signal) => {
      const payload = JSON.stringify({ subtotal: 100, discount: 20, tax: 8 });
      const headers = { "Content-Type": "application/json" };
      const control = await request(baseUrl, "/api/orders/calculate", { method: "POST", headers, body: payload, signal });
      assert.equal(evaluateBusinessCalculation(control.body).pass, true);

      server.setMode("/api/orders/calculate", "fault-business-total");
      const fault = await request(baseUrl, "/api/orders/calculate", { method: "POST", headers, body: payload, signal });
      const result = evaluateBusinessCalculation(fault.body);
      assert.equal(result.pass, false);
      assert.equal(result.faultClass, "BUSINESS_RULE_MATH_MISMATCH");
    });
  } finally {
    await server.stop();
  }
});

// ===========================================================================
// 4. Contract obligation (AC-08)
// ===========================================================================
test("AC-08: contract check flags the breaking rename and type change", async () => {
  const server = new TestFixtureServer();
  const baseUrl = await server.start();
  try {
    await withScenarioDeadline(15000, async (signal) => {
      const spec = API_FIXTURES.contract.spec;
      const control = await request(baseUrl, "/api/v1/orders/101", { signal });
      assert.equal(evaluateContractCompatibility(control.body, spec).pass, true);

      server.setMode("/api/v1/orders", "fault-breaking-schema");
      const fault = await request(baseUrl, "/api/v1/orders/101", { signal });
      const result = evaluateContractCompatibility(fault.body, spec);
      assert.equal(result.pass, false);
      assert.equal(result.faultClass, "BREAKING_CONTRACT_CHANGE");
      assert.match(result.detail, /order_id/);
      assert.match(result.detail, /amount/);
    });
  } finally {
    await server.stop();
  }
});

// ===========================================================================
// 5. Idempotency with observed ledgers (AC-09)
// ===========================================================================
test("AC-09: ambiguous transport drops are classified from observed local and gateway ledgers", async () => {
  const server = new TestFixtureServer();
  const baseUrl = await server.start();
  const keys = API_FIXTURES.idempotency.keys;
  try {
    await withScenarioDeadline(30000, async (signal) => {
      // 5a. Nominal retry: numeric success on both attempts, one local row, one gateway debit.
      const nominalKey = keys.nominal;
      const nominalExpected = idempotencyExpectation("nominal");
      const first = await request(baseUrl, "/api/payments/charge", {
        method: "POST",
        headers: { "Idempotency-Key": nominalKey },
        signal
      });
      const second = await request(baseUrl, "/api/payments/charge", {
        method: "POST",
        headers: { "Idempotency-Key": nominalKey },
        signal
      });
      assert.equal(first.transport.status, 201);
      assert.equal(second.transport.status, 200);
      assert.equal(first.body.status, "succeeded", "body status is intentionally different from transport status");
      const nominal = evaluateIdempotency({
        firstAttempt: first,
        retry: second,
        localLedger: server.getLocalLedger(),
        gatewayLedger: server.getGatewayLedger(),
        idempotencyKey: nominalKey,
        expected: nominalExpected
      });
      assert.equal(nominal.pass, true, nominal.detail);
      assert.deepEqual({ local: nominal.observed.localCount, gateway: nominal.observed.gatewayCount }, { local: 1, gateway: 1 });

      // 5b. Ledgers are mandatory: a status-only observation cannot pass.
      const unobserved = evaluateIdempotency({ firstAttempt: first, retry: second, expected: nominalExpected });
      assert.equal(unobserved.pass, false);
      assert.equal(unobserved.faultClass, "MISSING_LEDGER_OBSERVATION");

      // 5c. A failed retry HTTP response must never pass on stale dedup-shaped bodies.
      const failedRetry = evaluateIdempotency({
        firstAttempt: first,
        retry: { transport: { status: 500 }, body: { ...second.body }, responseBytes: 0 },
        localLedger: server.getLocalLedger(),
        gatewayLedger: server.getGatewayLedger(),
        idempotencyKey: nominalKey,
        expected: nominalExpected
      });
      assert.equal(failedRetry.pass, false);
      assert.equal(failedRetry.faultClass, "RETRY_OPERATION_FAILED");

      const unsuccessfulBody = evaluateIdempotency({
        firstAttempt: first,
        retry: { transport: { status: 200 }, body: { ...second.body, status: "pending" } },
        localLedger: server.getLocalLedger(),
        gatewayLedger: server.getGatewayLedger(),
        idempotencyKey: nominalKey,
        expected: nominalExpected
      });
      assert.equal(unsuccessfulBody.faultClass, "RETRY_BODY_NOT_SUCCESSFUL");

      // 5d. A declared first-attempt drop cannot be satisfied by a numeric success.
      const misdeclared = evaluateIdempotency({
        firstAttempt: first,
        retry: second,
        localLedger: server.getLocalLedger(),
        gatewayLedger: server.getGatewayLedger(),
        idempotencyKey: nominalKey,
        expected: idempotencyExpectation("lost_response")
      });
      assert.equal(misdeclared.faultClass, "FIRST_ATTEMPT_OUTCOME_MISMATCH");

      // 5e. Control: post-effect socket drop, then a clean replay.
      server.reset();
      const controlKey = keys.lost_response_control;
      const dropped = await request(baseUrl, "/api/payments/charge", {
        method: "POST",
        headers: { "Idempotency-Key": controlKey, "x-gateway-fault": "lost-response" },
        signal
      });
      assert.equal(dropped.transport.status, null, "first attempt has no transport status");
      assert.equal(dropped.body, null);
      const recovered = await request(baseUrl, "/api/payments/charge", {
        method: "POST",
        headers: { "Idempotency-Key": controlKey },
        signal
      });
      const control = evaluateIdempotency({
        firstAttempt: dropped,
        retry: recovered,
        localLedger: server.getLocalLedger(),
        gatewayLedger: server.getGatewayLedger(),
        idempotencyKey: controlKey,
        expected: idempotencyExpectation("lost_response")
      });
      assert.equal(control.pass, true, control.detail);
      assert.equal(control.observed.gatewayCount, 1);
      assert.equal(typeof control.observed.firstAttemptTransport, "string");
      assert.equal(typeof dropped.transport.error, "string");

      // 5f. Fault: local replay looks correct while the gateway keeps two debits.
      server.reset();
      const gatewayFaultKey = keys.lost_response_duplicate_fault;
      const faultDropped = await request(baseUrl, "/api/payments/charge", {
        method: "POST",
        headers: { "Idempotency-Key": gatewayFaultKey, "x-gateway-fault": "lost-response-duplicate" },
        signal
      });
      assert.equal(faultDropped.transport.status, null);
      const faultRetry = await request(baseUrl, "/api/payments/charge", {
        method: "POST",
        headers: { "Idempotency-Key": gatewayFaultKey, "x-gateway-fault": "lost-response-duplicate" },
        signal
      });
      const fault = evaluateIdempotency({
        firstAttempt: faultDropped,
        retry: faultRetry,
        localLedger: server.getLocalLedger(),
        gatewayLedger: server.getGatewayLedger(),
        idempotencyKey: gatewayFaultKey,
        expected: idempotencyExpectation("lost_response_duplicate")
      });
      assert.equal(fault.observed.localCount, 1, "local replay is correct");
      assert.equal(fault.observed.gatewayCount, 2, "gateway double-debited");
      assert.equal(fault.pass, false);
      assert.equal(fault.faultClass, "DUPLICATE_DOWNSTREAM_GATEWAY_CHARGE");

      // 5g. Fault: the server ignores the idempotency key and persists a second transaction.
      server.reset();
      const duplicateKey = keys.duplicate_effects_fault;
      server.setMode("/api/payments/charge", "fault-duplicate-effects");
      const dupFirst = await request(baseUrl, "/api/payments/charge", {
        method: "POST",
        headers: { "Idempotency-Key": duplicateKey },
        signal
      });
      const dupSecond = await request(baseUrl, "/api/payments/charge", {
        method: "POST",
        headers: { "Idempotency-Key": duplicateKey },
        signal
      });
      const duplicate = evaluateIdempotency({
        firstAttempt: dupFirst,
        retry: dupSecond,
        localLedger: server.getLocalLedger(),
        gatewayLedger: server.getGatewayLedger(),
        idempotencyKey: duplicateKey,
        expected: idempotencyExpectation("duplicate_effects")
      });
      assert.equal(duplicate.pass, false);
      assert.equal(duplicate.faultClass, "DUPLICATE_LOCAL_LEDGER_TRANSACTION");
    });
  } finally {
    await server.stop();
  }
});

// ===========================================================================
// 6. Regression selection (AC-10)
// ===========================================================================
test("AC-10: regression selection requires real obligation coverage and broadening", () => {
  const localControl = evaluateRegressionSelection({
    changedPaths: ["src/pricing/pricing.service.ts"],
    record: {
      impactScope: "local",
      affectedObligations: ["REQ-pricing-total"],
      selectedTests: [
        selectionTest("smoke:baseline", "smoke", "smoke-baseline"),
        selectionTest("pricing-unit:total", "unit", "obligation", ["REQ-pricing-total"])
      ],
      excludedLanes: [{ lane: "user-profile", reason: "no shared module or contract touched" }]
    }
  });
  assert.equal(localControl.pass, true, localControl.detail);
  assert.equal(localControl.disposition, "SELECTED");
  assert.equal(localControl.requiredScope, "local");

  const droppedSmoke = evaluateRegressionSelection({
    changedPaths: ["src/pricing/pricing.service.ts"],
    record: {
      impactScope: "local",
      affectedObligations: ["REQ-pricing-total"],
      selectedTests: [selectionTest("pricing-unit:total", "unit", "obligation", ["REQ-pricing-total"])]
    }
  });
  assert.equal(droppedSmoke.faultClass, "DROPPED_SMOKE_BASELINE");

  // Shared cross-cutting path cannot be declared a complete local selection.
  const sharedNarrow = evaluateRegressionSelection({
    changedPaths: ["src/database/pool.ts"],
    record: {
      impactScope: "local",
      affectedObligations: ["REQ-db-pooling"],
      selectedTests: [
        selectionTest("smoke:baseline", "smoke", "smoke-baseline"),
        selectionTest("pool-unit", "unit", "obligation", ["REQ-db-pooling"])
      ]
    }
  });
  assert.equal(sharedNarrow.pass, false);
  assert.equal(sharedNarrow.faultClass, "UNJUSTIFIED_NARROW_SELECTION_ON_SHARED_CHANGE");

  // A bare "global" label with no executable selection cannot pass.
  const emptyLabel = evaluateRegressionSelection({
    changedPaths: ["src/guards/auth.guard.ts"],
    record: {
      impactScope: "global",
      affectedObligations: ["REQ-auth-guard"],
      selectedTests: []
    }
  });
  assert.equal(emptyLabel.faultClass, "EMPTY_SELECTION");

  // A global label with an empty broadened test list cannot pass.
  const emptyBroadening = evaluateRegressionSelection({
    changedPaths: ["src/guards/auth.guard.ts"],
    record: {
      impactScope: "global",
      affectedObligations: ["REQ-auth-guard"],
      selectedTests: [
        selectionTest("smoke:baseline", "smoke", "smoke-baseline"),
        selectionTest("auth-unit", "unit", "obligation", ["REQ-auth-guard"])
      ],
      broadenedCoverage: { scope: "global", tests: [] }
    }
  });
  assert.equal(emptyBroadening.faultClass, "EMPTY_BROADENED_COVERAGE");

  // Detached full lane labels cannot disguise an obligation-only selection.
  const detachedLaneClaims = evaluateRegressionSelection({
    changedPaths: ["src/guards/auth.guard.ts"],
    record: {
      impactScope: "global",
      affectedObligations: ["REQ-auth-guard"],
      selectedTests: [
        selectionTest("smoke:baseline", "smoke", "smoke-baseline"),
        selectionTest("auth-unit", "unit", "obligation", ["REQ-auth-guard"])
      ],
      broadenedCoverage: { scope: "global", lanes: ["smoke", "api-integration", "security", "regression"], tests: ["auth-unit"] }
    }
  });
  assert.equal(detachedLaneClaims.faultClass, "INSUFFICIENT_BROADENING");
  const omittedSmokeBaseline = evaluateRegressionSelection({
    changedPaths: ["src/guards/auth.guard.ts"],
    record: {
      impactScope: "global",
      affectedObligations: ["REQ-auth-guard"],
      selectedTests: [
        selectionTest("smoke:baseline", "smoke", "smoke-baseline"),
        selectionTest("auth-unit", "unit", "obligation", ["REQ-auth-guard"]),
        selectionTest("api-integration:auth", "api-integration", "broadening", ["REQ-auth-guard"], "global")
      ],
      broadenedCoverage: { tests: ["api-integration:auth"] }
    }
  });
  assert.equal(omittedSmokeBaseline.faultClass, "INSUFFICIENT_BROADENING");


  const uncoveredObligation = evaluateRegressionSelection({
    changedPaths: ["src/pricing/pricing.service.ts"],
    record: {
      impactScope: "local",
      affectedObligations: ["REQ-pricing-total", "REQ-pricing-tax"],
      selectedTests: [
        selectionTest("smoke:baseline", "smoke", "smoke-baseline"),
        selectionTest("pricing-unit:total", "unit", "obligation", ["REQ-pricing-total"])
      ]
    }
  });
  assert.equal(uncoveredObligation.faultClass, "MISSING_OBLIGATION_COVERAGE");

  const missingReason = evaluateRegressionSelection({
    changedPaths: ["src/pricing/pricing.service.ts"],
    record: {
      impactScope: "local",
      affectedObligations: ["REQ-pricing-total"],
      selectedTests: [
        selectionTest("smoke:baseline", "smoke", "smoke-baseline"),
        selectionTest("pricing-unit:total", "unit", "obligation", ["REQ-pricing-total"])
      ],
      excludedLanes: ["user-profile"]
    }
  });
  assert.equal(missingReason.faultClass, "MISSING_EXCLUSION_REASON");

  const broadened = evaluateRegressionSelection({
    changedPaths: ["src/guards/auth.guard.ts"],
    record: {
      impactScope: "global",
      affectedObligations: [{ id: "REQ-auth-guard", critical: true }],
      selectedTests: [
        selectionTest("smoke:critical-paths", "smoke", "smoke-baseline", ["REQ-auth-guard"]),
        selectionTest("api-integration:auth", "api-integration", "broadening", ["REQ-auth-guard"], "global"),
        selectionTest("security:authz", "security", "broadening", ["REQ-auth-guard"], "global"),
        selectionTest("regression:full", "regression", "broadening", ["REQ-auth-guard"], "global")
      ],
      broadenedCoverage: {
        scope: "global",
        tests: ["smoke:critical-paths", "api-integration:auth", "security:authz", "regression:full"]
      }
    }
  });
  assert.equal(broadened.pass, true, broadened.detail);
  assert.equal(broadened.disposition, "BROADENED");

  const unknownImpact = evaluateRegressionSelection({
    changedPaths: ["infra/terraform/network.tf"],
    record: {
      impactScope: "local",
      affectedObligations: ["REQ-unknown"],
      selectedTests: [
        selectionTest("smoke:baseline", "smoke", "smoke-baseline"),
        selectionTest("smoke:critical-paths", "smoke", "obligation", ["REQ-unknown"])
      ]
    }
  });
  assert.equal(unknownImpact.faultClass, "UNKNOWN_IMPACT_CLAIMED_COMPLETE");

  const honestBlocker = evaluateRegressionSelection({
    changedPaths: ["infra/terraform/network.tf"],
    record: {
      impactScope: "unknown",
      affectedObligations: ["REQ-unknown"],
      selectedTests: [
        selectionTest("smoke:baseline", "smoke", "smoke-baseline"),
        selectionTest("smoke:critical-paths", "smoke", "obligation", ["REQ-unknown"])
      ],
      blockedReason: "impact map has no rule for terraform modules; broaden or obtain owner decision"
    }
  });
  assert.equal(honestBlocker.pass, true);
  assert.equal(honestBlocker.disposition, "BLOCKED");
});

// ===========================================================================
// 7. Bounded load, overload and recovery (AC-11, AC-12)
// ===========================================================================
test("AC-11 / AC-12: real in-flight work sheds under overload and recovers inside fixture budgets", async () => {
  const server = new TestFixtureServer();
  const baseUrl = await server.start();
  const workload = API_FIXTURES.performance.workloads.nominal;
  try {
    await withScenarioDeadline(60000, async (signal) => {
      const baseline = await readLoadPhases(baseUrl, signal, workload);
      assert.ok(baseline.every((sample) => sample.status === 200));

      const peak = await Promise.all(
        Array.from({ length: workload.concurrency }, async () => {
          const sample = await request(baseUrl, "/api/perf/workload", { signal });
          return { status: sample.transport.status, latencyMs: sample.latencyMs };
        })
      );
      const metrics = server.getMetrics();
      const occupancy = { peakInFlight: metrics.peakInFlight, peakAcceptedInFlight: metrics.peakAcceptedInFlight };
      assert.ok(occupancy.peakInFlight > metrics.capacity, `peak in-flight ${occupancy.peakInFlight} must exceed capacity ${metrics.capacity}`);
      assert.ok(occupancy.peakAcceptedInFlight <= metrics.capacity, "concurrently served requests must stay inside capacity");
      assert.ok(metrics.shedCount > 0, "the overload phase must be observed shedding");

      const loadStoppedAt = Date.now();
      const recovery = [];
      let timeToFirstSuccessMs = null;
      for (let index = 0; index < workload.recoverySamplesRequired; index += 1) {
        const sample = await request(baseUrl, "/api/perf/workload", { signal });
        if (sample.transport.status === 200 && timeToFirstSuccessMs === null) {
          timeToFirstSuccessMs = Date.now() - loadStoppedAt;
        }
        recovery.push({ status: sample.transport.status, latencyMs: sample.latencyMs });
      }

      const result = evaluatePerformanceRecovery({ workload, observations: { baseline, peak, recovery, occupancy, timeToFirstSuccessMs } });
      assert.equal(result.pass, true, result.detail);
      assert.equal(result.classification, "SYNTHETIC_FIXTURE");

      // Fixture observations never become capacity claims.
      const capacityClaim = evaluatePerformanceRecovery({
        workload,
        observations: { baseline, peak, recovery, occupancy, timeToFirstSuccessMs },
        classification: "CAPACITY_EVIDENCE"
      });
      assert.equal(capacityClaim.faultClass, "NON_SYNTHETIC_CLASSIFICATION_REJECTED");

      // A first success followed by persistent 503s must not pass recovery.
      const partialRecovery = evaluatePerformanceRecovery({
        workload,
        observations: {
          baseline,
          peak,
          recovery: [recovery[0], { status: 503, latencyMs: 400 }, { status: 503, latencyMs: 400 }],
          occupancy,
          timeToFirstSuccessMs
        }
      });
      assert.equal(partialRecovery.pass, false);
      assert.equal(partialRecovery.faultClass, "RECOVERY_FAILURE_POST_LOAD");

      // Missing phases are refused rather than inferred from another phase.
      const noBaseline = evaluatePerformanceRecovery({
        workload,
        observations: { baseline: [], peak, recovery, occupancy, timeToFirstSuccessMs }
      });
      assert.equal(noBaseline.faultClass, "INSUFFICIENT_BASELINE_OBSERVATION");

      const shortPeak = evaluatePerformanceRecovery({
        workload,
        observations: { baseline, peak: peak.slice(0, 1), recovery, occupancy, timeToFirstSuccessMs }
      });
      assert.equal(shortPeak.faultClass, "INSUFFICIENT_PEAK_OBSERVATION");

      const noOccupancy = evaluatePerformanceRecovery({
        workload,
        observations: { baseline, peak, recovery, timeToFirstSuccessMs }
      });
      assert.equal(noOccupancy.faultClass, "MISSING_OCCUPANCY_OBSERVATION");

      // Authored measurements are rejected rather than trusted.
      const fabricated = evaluatePerformanceRecovery({
        workload,
        observations: { baseline, peak, recovery: [{ status: 200 }], occupancy, timeToFirstSuccessMs }
      });
      assert.equal(fabricated.faultClass, "INCOMPLETE_OBSERVATION");
    });
  } finally {
    await server.stop();
  }
});

test("AC-11 / AC-12: tripwire aborts the client on an observed 500 burst", async () => {
  const server = new TestFixtureServer();
  const baseUrl = await server.start();
  const { threshold, maxRequests, expectedAbortIndex } = API_FIXTURES.performance.tripwire;
  try {
    await withScenarioDeadline(30000, async (signal) => {
      server.setMode("/api/perf/workload", "fault-burst-500");
      const results = [];
      let abortedAt = -1;
      for (let index = 0; index < maxRequests; index += 1) {
        const sample = await request(baseUrl, "/api/perf/workload", { signal });
        results.push({ status: sample.transport.status, error: sample.transport.error });
        if (evaluatePerformanceTripwire(results, threshold).tripped) {
          abortedAt = index;
          break;
        }
      }
      assert.equal(abortedAt, expectedAbortIndex);
      assert.equal(results.length, threshold, "no request may be sent after the tripwire fires");
      assert.ok(results.every((sample) => sample.status === 500));
    });
  } finally {
    await server.stop();
  }
});

test("AC-11 / AC-12: unrecoverable degradation is measured on a real baseline and load", async () => {
  const server = new TestFixtureServer();
  const baseUrl = await server.start();
  const workload = API_FIXTURES.performance.workloads.recoveryFailure;
  try {
    await withScenarioDeadline(40000, async (signal) => {
      // The baseline phase is executed before any fault mode is armed.
      const baseline = await readLoadPhases(baseUrl, signal, workload);
      assert.ok(baseline.every((sample) => sample.status === 200));
      assert.equal(baseline.length, workload.baselineSamplesRequired);

      server.setMode("/api/perf/workload", "fault-recovery-failure");
      const peak = await Promise.all(
        Array.from({ length: workload.concurrency }, async () => {
          const sample = await request(baseUrl, "/api/perf/workload", { signal });
          return { status: sample.transport.status, latencyMs: sample.latencyMs };
        })
      );
      const metrics = server.getMetrics();
      const occupancy = { peakInFlight: metrics.peakInFlight, peakAcceptedInFlight: metrics.peakAcceptedInFlight };
      assert.ok(metrics.shedCount > 0, "overload latch must be reached through real shedding");

      const recovery = [];
      for (let index = 0; index < workload.recoverySamplesRequired; index += 1) {
        const sample = await request(baseUrl, "/api/perf/workload", { signal });
        recovery.push({ status: sample.transport.status, latencyMs: sample.latencyMs });
      }
      const result = evaluatePerformanceRecovery({ workload, observations: { baseline, peak, recovery, occupancy } });
      assert.equal(result.pass, false);
      assert.equal(result.faultClass, "RECOVERY_FAILURE_POST_LOAD");
      assert.ok(recovery.every((sample) => sample.latencyMs >= 300), "degraded latency must be measured");
    });
  } finally {
    await server.stop();
  }
});

// ===========================================================================
// 8. Authorization with protected-state snapshots (AC-13)
// ===========================================================================
test("AC-13: guards are judged on status and on protected state before/after", async () => {
  const server = new TestFixtureServer();
  const baseUrl = await server.start();
  const { principals, protectedChecks, seededFaults, tenantChecks, tenantSeededFault } = API_FIXTURES.authorization;

  const sendCheck = async (checkId, mode, signal) => {
    server.reset();
    const check = protectedChecks[checkId];
    const [method, pathname] = check.endpoint.split(" ");
    if (mode) server.setMode(pathname, mode);
    const token = principals[check.principal];
    const before = server.snapshotProtectedState();
    const response = await request(baseUrl, pathname, {
      method,
      headers: {
        ...(token ? { Authorization: token } : {}),
        ...(check.request ? { "Content-Type": "application/json" } : {})
      },
      body: check.request ? JSON.stringify(check.request) : undefined,
      signal
    });
    const after = server.snapshotProtectedState();
    return { checkId, response, before, after, check };
  };

  try {
    await withScenarioDeadline(30000, async (signal) => {
      for (const checkId of Object.keys(protectedChecks)) {
        const observed = await sendCheck(checkId, null, signal);
        const result = evaluateAuthorizationAttempt({
          check: checkId,
          before: observed.before,
          after: observed.after,
          response: observed.response,
          expected: observed.check.expected
        });
        assert.equal(result.pass, true, `${checkId}: ${result.detail}`);
      }

      for (const [faultId, fault] of Object.entries(seededFaults)) {
        const observed = await sendCheck(fault.checkId, fault.mode, signal);
        const result = evaluateAuthorizationAttempt({
          check: fault.checkId,
          before: observed.before,
          after: observed.after,
          response: observed.response,
          expected: observed.check.expected
        });
        assert.equal(result.pass, false, `${faultId} must be detected`);
        assert.equal(result.faultClass, fault.expectedFaultClass, `${faultId}: ${result.detail}`);
      }

      // Tenant boundary reads keep real concealment semantics.
      server.reset();
      const headers = (principal) => (principals[principal] ? { Authorization: principals[principal] } : {});
      const own = await request(baseUrl, "/api/tenants/tenant-a/records/rec_own_123", { headers: headers("tenantA"), signal });
      assert.equal(evaluateTenantAuthorization("tenant-a", "tenant-a", own).pass, true);
      const cross = await request(baseUrl, "/api/tenants/tenant-b/records/rec_secret_999", { headers: headers("tenantA"), signal });
      assert.equal(cross.transport.status, tenantChecks.cross_tenant_read_denied.expectedStatus);
      assert.equal(evaluateTenantAuthorization("tenant-a", "tenant-b", cross).pass, true);
      const anonymous = await request(baseUrl, "/api/tenants/tenant-a/records/rec_own_123", { signal });
      assert.equal(evaluateTenantAuthorization(null, "tenant-a", anonymous, { checkType: "authentication" }).pass, true);

      server.setMode("/api/tenants", tenantSeededFault.mode);
      const leak = await request(baseUrl, "/api/tenants/tenant-b/records/rec_secret_999", { headers: headers("tenantA"), signal });
      const leakResult = evaluateTenantAuthorization("tenant-a", "tenant-b", leak);
      assert.equal(leakResult.pass, false);
      assert.equal(leakResult.faultClass, tenantSeededFault.expectedFaultClass);
    });
  } finally {
    await server.stop();
  }
});

// ===========================================================================
// 9. Fuzz obligations: contract, state, hang, resource, sequence, minimization
// ===========================================================================
test("AC-14: fuzz controls hold and every seeded invariant violation is detected", async () => {
  const server = new TestFixtureServer();
  const baseUrl = await server.start();
  const { bounds } = API_FIXTURES.fuzz;
  const sendCase = async (fuzzCase, signal, deadlineMs = 5000) =>
    request(baseUrl, "/api/fuzz/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: materializeCase(fuzzCase),
      deadlineMs,
      signal
    });

  try {
    await withScenarioDeadline(120000, async (signal) => {
      // Controls: every declared case meets its obligation.
      for (const caseId of Object.keys(API_FIXTURES.fuzz.cases)) {
        server.reset();
        const fuzzCase = scenarioCase(caseId);
        const before = server.snapshotProtectedState();
        const response = await sendCase(fuzzCase, signal);
        const after = server.snapshotProtectedState();
        const result = evaluateFuzzCase({ fuzzCase, before, after, response, bounds, responseBytes: response.responseBytes });
        assert.equal(result.pass, true, `${caseId}: ${result.detail}`);
      }

      // Streaming limit is enforced without buffering the oversized body.
      server.reset();
      const oversized = await sendCase(scenarioCase("oversized-40k"), signal);
      assert.equal(oversized.transport.status, 413);
      assert.ok(oversized.responseBytes < bounds.requestBytesMax);

      // Seeded faults: each maps to a distinct invariant violation.
      for (const [faultId, fault] of Object.entries(API_FIXTURES.fuzz.seededFaults)) {
        server.reset();
        server.setMode("/api/fuzz/parse", fault.mode);
        const fuzzCase = scenarioCase(fault.caseId);
        const before = server.snapshotProtectedState();
        const response = await sendCase(fuzzCase, signal, fault.requestDeadlineMs ?? 5000);
        const after = server.snapshotProtectedState();
        const result = evaluateFuzzCase({
          fuzzCase,
          before,
          after,
          response: response.timedOut ? null : response,
          bounds,
          responseBytes: response.responseBytes
        });
        assert.equal(result.pass, false, `${faultId} must be detected`);
        assert.equal(result.faultClass, fault.expectedFaultClass, `${faultId}: ${result.detail}`);
      }

      // A hung case is caught by the request deadline and replayed against a clean server.
      server.reset();
      const hangRecovery = await sendCase(scenarioCase("malformed-json"), signal);
      const hangRecoveryCheck = evaluateFuzzCase({
        fuzzCase: scenarioCase("malformed-json"),
        before: server.snapshotProtectedState(),
        after: server.snapshotProtectedState(),
        response: hangRecovery,
        bounds,
        responseBytes: hangRecovery.responseBytes
      });
      assert.equal(hangRecoveryCheck.pass, true, "the clean server must still satisfy the malformed contract after a hang");

      // Minimization shrinks against a real bounded HTTP predicate that keeps the
      // observed fault class, then the original and reduced inputs are replayed under
      // identical preconditions.
      const probe = API_FIXTURES.fuzz.minimizationProbe;
      let probesSent = 0;
      const replayInput = async (input) => {
        server.reset();
        server.setMode(probe.endpoint, probe.mode);
        const before = server.snapshotProtectedState();
        const response = await request(baseUrl, probe.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: input,
          deadlineMs: probe.requestDeadlineMs,
          signal
        });
        return evaluateFuzzCase({
          fuzzCase: { id: "minimized-replay", category: "malformed", valid: false, expectedStatuses: [400] },
          before,
          after: server.snapshotProtectedState(),
          response,
          bounds,
          responseBytes: response.responseBytes
        });
      };
      const predicate = async (candidate) => {
        if (probesSent >= probe.maxRequests) return false;
        probesSent += 1;
        return (await replayInput(candidate)).faultClass === probe.expectedFaultClass;
      };

      const originalFault = await replayInput(probe.input);
      assert.equal(originalFault.faultClass, probe.expectedFaultClass, originalFault.detail);

      const minimized = await minimizeFailingInput(probe.input, predicate, {
        maxIterations: Math.floor(probe.maxRequests / 2)
      });
      assert.equal(minimized.reproducible, true, "the reduced input must still reproduce the fault over HTTP");
      assert.ok(minimized.minimizedLength < minimized.originalLength, "minimization must shrink the input");
      assert.ok(probesSent < probe.maxRequests, "minimization must stay inside its request budget");

      const minimizedFault = await replayInput(minimized.minimized);
      assert.equal(minimizedFault.faultClass, originalFault.faultClass, "the reduced input must replay to the same fault class");
    });
  } finally {
    await server.stop();
  }
});

test("AC-14: ordered sequence requests observe a real precondition rather than a field name", async () => {
  const server = new TestFixtureServer();
  const baseUrl = await server.start();
  const sequence = API_FIXTURES.fuzz.sequence;
  const runSteps = async (steps, mode, signal) => {
    server.reset();
    if (mode) server.setMode(sequence.endpoint, mode);
    const observed = [];
    for (const step of steps) {
      const response = await request(baseUrl, sequence.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: step.phase }),
        signal
      });
      observed.push({ phase: step.phase, transport: response.transport, body: response.body });
    }
    return observed;
  };

  try {
    await withScenarioDeadline(20000, async (signal) => {
      const control = evaluateFuzzSequence({
        steps: await runSteps(sequence.control.steps, null, signal),
        expected: sequence.control
      });
      assert.equal(control.pass, true, control.detail);

      // On a clean server the out-of-order phase is genuinely rejected.
      const rejected = evaluateFuzzSequence({
        steps: await runSteps([{ phase: 2, expectedStatus: 409 }], null, signal),
        expected: { steps: [{ phase: 2, expectedStatus: 409 }] }
      });
      assert.equal(rejected.pass, true, rejected.detail);

      const fault = evaluateFuzzSequence({
        steps: await runSteps(sequence.seededFault.steps, sequence.seededFault.mode, signal),
        expected: sequence.seededFault
      });
      assert.equal(fault.pass, false);
      assert.equal(fault.faultClass, sequence.seededFault.expectedFaultClass);
    });
  } finally {
    await server.stop();
  }
});

test("AC-15: missing target authorization blocks active execution without sending requests", () => {
  const blocked = evaluateExecutionAuthorization({ authorized: false, target: "https://api.example.test" });
  assert.equal(blocked.disposition, "BLOCKED");
  assert.equal(blocked.requestsSent, 0);
  assert.equal(blocked.offlinePlanningAvailable, true);

  const noTarget = evaluateExecutionAuthorization({ authorized: true });
  assert.equal(noTarget.disposition, "BLOCKED");
  assert.equal(noTarget.faultClass, "MISSING_TARGET");

  const authorized = evaluateExecutionAuthorization({ authorized: true, target: "http://127.0.0.1:0" });
  assert.equal(authorized.disposition, "AUTHORIZED");
});

// ===========================================================================
// 10. Contract C6 evidence records (AC-21..AC-30)
// ===========================================================================
const COMPLETE_RECORD = {
  requirementId: "REQ-08",
  acId: "AC-22",
  platform: "ios",
  lane: "ios",
  framework: "swiftui",
  testLayer: "device-e2e",
  appArtifact: {
    digest: `sha256:${"a".repeat(64)}`,
    buildType: "debug",
    version: "1.1.0",
    path: "apps/ios/build/CheckoutApp.app"
  },
  environment: { type: "simulator", osVersion: "iOS 18.0", deviceModel: "iPhone 16 Pro" },
  driver: { name: "xcuitest", version: "7.2.0" },
  installation: { mode: "noReset", action: "install_over_prior_build" },
  identity: { synthetic: true, ref: "fixture-synthetic-user-1" },
  permissions: [{ name: "camera", state: "denied" }],
  network: "offline_then_online",
  lifecycle: "background_then_resume",
  forbiddenEffects: ["session_reset", "duplicate_submission"],
  actions: ["background the app", "resume the app"],
  expected: "in-flight form state preserved",
  observed: "in-flight form state preserved",
  cleanup: "uninstall the app and clear the synthetic account",
  outcome: "PASS",
  evidence: { type: "xcresult", artifact: "artifacts/lifecycle.xcresult" },
  reviewer: "fixture-oracle"
};

test("AC-21..AC-30: C6 record validation rejects mocks and incomplete context without becoming a PASS", () => {
  const valid = evaluateMobileEvidenceRecord(COMPLETE_RECORD);
  assert.equal(valid.recordValid, true, valid.detail);
  assert.equal(valid.disposition, "RECORD_VALID");
  assert.equal(valid.scenarioDisposition, "DECLARED_PASS_PENDING_NATIVE_EXECUTION");
  assert.equal(valid.nativeVerification, "NOT_ESTABLISHED");

  const empty = evaluateMobileEvidenceRecord({});
  assert.equal(empty.recordValid, false);
  assert.equal(empty.faultClass, "INVALID_RECORD");
  assert.ok(empty.missingFields.includes("acId"));

  const notAnObject = evaluateMobileEvidenceRecord(null);
  assert.equal(notAnObject.faultClass, "INVALID_RECORD");
  assert.equal(notAnObject.nativeVerification, "NOT_ESTABLISHED");

  const mockEvidence = evaluateMobileEvidenceRecord({
    ...COMPLETE_RECORD,
    evidence: { type: "mock", artifact: "artifacts/mocked-native-module.json" }
  });
  assert.equal(mockEvidence.recordValid, false);
  assert.equal(mockEvidence.faultClass, "DISALLOWED_SIMULATED_DEVICE_CLAIM");

  const missingOs = evaluateMobileEvidenceRecord({
    ...COMPLETE_RECORD,
    environment: { type: "simulator", deviceModel: "iPhone 16 Pro" }
  });
  assert.equal(missingOs.faultClass, "INVALID_RECORD");
  assert.ok(missingOs.missingFields.includes("environment.osVersion"));

  const unknownDriver = evaluateMobileEvidenceRecord({ ...COMPLETE_RECORD, driver: { name: "selenium", version: "4" } });
  assert.equal(unknownDriver.faultClass, "INVALID_RECORD");

  // Missing scenario context is a missing precondition, not an exemption.
  const noPermissions = evaluateMobileEvidenceRecord({ ...COMPLETE_RECORD, permissions: undefined });
  assert.equal(noPermissions.faultClass, "INVALID_RECORD");
  assert.ok(noPermissions.missingFields.includes("permissions"));

  const noLifecycle = evaluateMobileEvidenceRecord({ ...COMPLETE_RECORD, lifecycle: undefined });
  assert.equal(noLifecycle.faultClass, "INVALID_RECORD");
  assert.ok(noLifecycle.missingFields.includes("lifecycle"));

  const emptyForbiddenEffects = evaluateMobileEvidenceRecord({ ...COMPLETE_RECORD, forbiddenEffects: [] });
  assert.equal(emptyForbiddenEffects.faultClass, "INVALID_RECORD");

  const invalidPermissionState = evaluateMobileEvidenceRecord({
    ...COMPLETE_RECORD,
    permissions: [{ name: "camera", state: "maybe" }]
  });
  assert.equal(invalidPermissionState.faultClass, "INVALID_RECORD");

  const justifiedNotApplicable = evaluateMobileEvidenceRecord({
    ...COMPLETE_RECORD,
    permissions: { notApplicable: true, reason: "scenario touches no guarded platform capability" }
  });
  assert.equal(justifiedNotApplicable.recordValid, true);

  const unjustifiedNotApplicable = evaluateMobileEvidenceRecord({
    ...COMPLETE_RECORD,
    permissions: { notApplicable: true }
  });
  assert.equal(unjustifiedNotApplicable.faultClass, "INVALID_RECORD");

  // Native stack, lane, environment and driver must describe the same target.
  const wrongLane = evaluateMobileEvidenceRecord({ ...COMPLETE_RECORD, lane: "android" });
  assert.equal(wrongLane.faultClass, "INVALID_RECORD");
  assert.ok(wrongLane.missingFields.some((entry) => entry.startsWith("lane-incompatible")));

  const wrongCrossPlatformLane = evaluateMobileEvidenceRecord({
    ...COMPLETE_RECORD,
    platform: "react-native",
    framework: "react-native",
    lane: "android"
  });
  assert.equal(wrongCrossPlatformLane.faultClass, "INVALID_RECORD");
  assert.ok(wrongCrossPlatformLane.missingFields.includes("lane-environment-incompatible:android/simulator"));
  assert.ok(wrongCrossPlatformLane.missingFields.includes("lane-driver-incompatible:android/xcuitest"));

  const compatibleReactNativeAndroidRecord = {
    ...COMPLETE_RECORD,
    platform: "react-native",
    framework: "react-native",
    lane: "android",
    appArtifact: { ...COMPLETE_RECORD.appArtifact, path: "build/app/outputs/flutter-apk/app-release.apk" },
    environment: { type: "emulator", osVersion: "Android 15", deviceModel: "Pixel 9" },
    driver: { name: "uiautomator2", version: "3.2.0" }
  };
  const compatibleReactNativeAndroid = evaluateMobileEvidenceRecord(compatibleReactNativeAndroidRecord);
  assert.equal(compatibleReactNativeAndroid.recordValid, true, compatibleReactNativeAndroid.detail);
  assert.equal(compatibleReactNativeAndroid.nativeVerification, "NOT_ESTABLISHED");

  const reactNativeAppiumRecord = {
    ...compatibleReactNativeAndroidRecord,
    driver: { name: "appium", version: "9.0.0" }
  };
  const reactNativeAppium = evaluateMobileEvidenceRecord(reactNativeAppiumRecord);
  assert.equal(reactNativeAppium.recordValid, true, reactNativeAppium.detail);
  assert.equal(reactNativeAppium.nativeVerification, "NOT_ESTABLISHED");

  const flutterAndroidRecord = {
    ...compatibleReactNativeAndroidRecord,
    platform: "flutter",
    framework: "flutter",
    driver: { name: "patrol", version: "3.0.0" }
  };
  const flutterAndroid = evaluateMobileEvidenceRecord(flutterAndroidRecord);
  assert.equal(flutterAndroid.recordValid, true, flutterAndroid.detail);
  assert.equal(flutterAndroid.nativeVerification, "NOT_ESTABLISHED");

  const reactNativeDetoxAndroidRecord = {
    ...compatibleReactNativeAndroidRecord,
    driver: { name: "detox", version: "20.0.0" }
  };
  const reactNativeDetoxAndroid = evaluateMobileEvidenceRecord(reactNativeDetoxAndroidRecord);
  assert.equal(reactNativeDetoxAndroid.recordValid, true, reactNativeDetoxAndroid.detail);
  assert.equal(reactNativeDetoxAndroid.nativeVerification, "NOT_ESTABLISHED");

  const reactNativeDetoxIosRecord = {
    ...COMPLETE_RECORD,
    platform: "react-native",
    framework: "react-native",
    appArtifact: { ...COMPLETE_RECORD.appArtifact, path: "artifacts/Checkout.app" },
    driver: { name: "detox", version: "20.0.0" }
  };
  const reactNativeDetoxIos = evaluateMobileEvidenceRecord(reactNativeDetoxIosRecord);
  assert.equal(reactNativeDetoxIos.recordValid, true, reactNativeDetoxIos.detail);
  assert.equal(reactNativeDetoxIos.nativeVerification, "NOT_ESTABLISHED");

  const contradictoryArtifactTarget = evaluateMobileEvidenceRecord({
    ...COMPLETE_RECORD,
    platform: "flutter",
    framework: "flutter",
    appArtifact: { ...COMPLETE_RECORD.appArtifact, path: "artifacts/app-release.apk" },
    driver: { name: "patrol", version: "3.0.0" }
  });
  assert.equal(contradictoryArtifactTarget.faultClass, "INVALID_RECORD");
  assert.ok(contradictoryArtifactTarget.missingFields.includes("artifact-target-incompatible:ios/android"));

  const unavailableArtifactPass = evaluateMobileEvidenceRecord({
    ...COMPLETE_RECORD,
    appArtifact: { ...COMPLETE_RECORD.appArtifact, digest: "NOT_AVAILABLE" }
  });
  assert.equal(unavailableArtifactPass.recordValid, false);
  assert.equal(unavailableArtifactPass.faultClass, "MISSING_APP_ARTIFACT_DIGEST");

  const unavailableButBlocked = evaluateMobileEvidenceRecord({
    ...COMPLETE_RECORD,
    appArtifact: { ...COMPLETE_RECORD.appArtifact, digest: "NOT_AVAILABLE" },
    outcome: "BLOCKED"
  });
  assert.equal(unavailableButBlocked.recordValid, true);
  assert.equal(unavailableButBlocked.scenarioDisposition, "BLOCKED");

  const releaseWithoutProvenance = evaluateMobileEvidenceRecord({
    ...COMPLETE_RECORD,
    acId: "AC-30",
    appArtifact: { ...COMPLETE_RECORD.appArtifact, buildType: "debug" }
  });
  assert.equal(releaseWithoutProvenance.recordValid, false);
  assert.equal(releaseWithoutProvenance.faultClass, "MISSING_RELEASE_PROVENANCE");
});

test("AC-21..AC-30: every scenario adjudicates controls, faults and adversarial records", () => {
  const scenarios = MOBILE_FIXTURES.scenarios;
  const expectedAcIds = Array.from({ length: 10 }, (_, index) => `AC-${21 + index}`);
  assert.deepEqual(Object.keys(scenarios).sort(), [...expectedAcIds].sort());
  assert.equal(MOBILE_FIXTURES.syntheticExample, true);

  for (const [acId, scenario] of Object.entries(scenarios)) {
    const control = evaluateMobileScenarioRecord(scenario.controls.knownGood);
    assert.equal(control.pass, true, `${acId} control: ${control.detail}`);
    assert.equal(control.faultClass, null);
    assert.equal(control.nativeVerification, "NOT_ESTABLISHED");

    const fault = evaluateMobileScenarioRecord(scenario.controls.seededFault);
    assert.equal(fault.pass, false, `${acId} fault must be rejected`);
    assert.equal(fault.faultClass, scenario.controls.seededFault.expectedFaultClass, `${acId}: ${fault.detail}`);

    assert.ok(Array.isArray(scenario.controls.adversarialControls) && scenario.controls.adversarialControls.length > 0);
    for (const [index, adversarial] of scenario.controls.adversarialControls.entries()) {
      const result = evaluateMobileScenarioRecord(adversarial);
      assert.equal(result.pass, false, `${acId} adversarial ${index} must be rejected`);
      assert.equal(result.faultClass, adversarial.expectedFaultClass, `${acId} adversarial ${index}: ${result.detail}`);
    }
  }
});

test("AC-21..AC-30: handoff cells hand off honest illustrative commands, not runnable claims", () => {
  const scenarios = MOBILE_FIXTURES.scenarios;
  for (const [acId, scenario] of Object.entries(scenarios)) {
    assert.deepEqual(Object.keys(scenario.handoff).sort(), [...MOBILE_STACKS].sort(), `${acId} must hand off all four stacks`);
    for (const [stack, cell] of Object.entries(scenario.handoff)) {
      assert.ok(["BLOCKED", "NOT_RUN"].includes(cell.status), `${acId}/${stack} must not claim execution, saw ${cell.status}`);
      assert.equal(cell.manualStatus, "NOT_RUN", `${acId}/${stack} manual lane cannot be claimed`);
      assert.ok(cell.reason?.trim(), `${acId}/${stack} needs a gap reason`);
      assert.equal(cell.commandStatus, "ILLUSTRATIVE_NON_EXECUTABLE", `${acId}/${stack} must not market a template as runnable`);
      assert.ok(Array.isArray(cell.prerequisites) && cell.prerequisites.length > 0, `${acId}/${stack} needs its missing prerequisites`);
      assert.ok(cell.expectedOutcome?.trim(), `${acId}/${stack} needs an expected outcome`);
      assert.ok(cell.cleanup?.trim(), `${acId}/${stack} needs a cleanup step`);
      assert.ok(cell.manualLane?.trim(), `${acId}/${stack} needs a manual evidence lane`);
      assert.ok(["ios", "android"].includes(cell.lane), `${acId}/${stack} lane must stay ios/android`);
    }
  }


  // AC-specific rules stay bound to their own AC.
  const wrongAc = evaluateMobileScenarioRecord({ ...scenarios["AC-22"].controls.seededFault, acId: "AC-25" });
  assert.notEqual(wrongAc.faultClass, "RELAUNCH_EQUATED_WITH_RESUME");

  const unsupported = evaluateMobileScenarioRecord({ acId: "AC-99" });
  assert.equal(unsupported.faultClass, "UNSUPPORTED_AC");
});

// ===========================================================================
// 11. Test cycle closure governance (AC-05)
// ===========================================================================
test("AC-05: closure preserves blocked work, residual risk and human authority", () => {
  const control = evaluateTestCycleClosure({
    technicalSuitePassed: true,
    claimedReleaseApproved: true,
    humanAuthorizerProvided: "ReleaseOwner",
    blockedCount: 0,
    openDefectsCount: 0,
    residualRiskLedgerPresent: false,
    reportedPassRate: "100%"
  });
  assert.equal(control.valid, true);

  const impersonation = evaluateTestCycleClosure({
    technicalSuitePassed: true,
    claimedReleaseApproved: true,
    humanAuthorizerProvided: null,
    blockedCount: 0,
    openDefectsCount: 0,
    residualRiskLedgerPresent: false,
    reportedPassRate: "100%"
  });
  assert.equal(impersonation.faultClass, "TECHNICAL_PASS_IMPERSONATED_RELEASE_AUTHORITY");

  const suppressed = evaluateTestCycleClosure({
    technicalSuitePassed: false,
    claimedReleaseApproved: false,
    humanAuthorizerProvided: null,
    blockedCount: 2,
    openDefectsCount: 1,
    residualRiskLedgerPresent: false,
    reportedPassRate: "100%"
  });
  assert.equal(suppressed.faultClass, "SUPPRESSED_BLOCKED_TESTS_OR_DEFECTS");

  const missingLedger = evaluateTestCycleClosure({
    technicalSuitePassed: true,
    claimedReleaseApproved: false,
    humanAuthorizerProvided: null,
    blockedCount: 2,
    openDefectsCount: 0,
    residualRiskLedgerPresent: false,
    reportedPassRate: "2/4"
  });
  assert.equal(missingLedger.faultClass, "MISSING_RESIDUAL_RISK_LEDGER");
});
