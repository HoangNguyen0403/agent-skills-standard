// scripts/skill-tests/testing-quality-improvement/synthetic-oracles.mjs
// Independent oracles for the testing-quality-improvement synthetic fixtures.
// Every oracle consumes observed fixture evidence. None invents measurements, and
// none accepts record schema validity as proof of native/device or capacity behavior.

const SYNTHETIC_CLASSIFICATION = "SYNTHETIC_FIXTURE";

// ---------------------------------------------------------------------------
// 1. Smoke readiness vs infrastructure health (AC-06)
// ---------------------------------------------------------------------------
export function evaluateSmokeReadiness(health, operation) {
  const healthUp = health?.status === "UP";
  const operationOk = operation?.status === 200 || operation?.status === 201;

  if (!healthUp) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "INFRASTRUCTURE_UNAVAILABLE",
      detail: `Health probe not UP (status ${health?.status ?? "MISSING"}).`
    };
  }
  if (!operationOk) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "HEALTH_STATUS_EQUATED_WITH_BUSINESS_READINESS",
      detail: `Health UP but critical operation failed with transport status ${operation?.status ?? "NO_RESPONSE"}.`
    };
  }
  return {
    pass: true,
    disposition: "PASS",
    faultClass: null,
    detail: "Health probe and critical business operation both succeeded."
  };
}

// ---------------------------------------------------------------------------
// 2. Functional business rule vs schema validity (AC-07)
// ---------------------------------------------------------------------------
export function evaluateBusinessCalculation(payload) {
  if (typeof payload !== "object" || payload === null) {
    return { pass: false, disposition: "FAIL", faultClass: "INVALID_PAYLOAD_STRUCTURE" };
  }
  const { subtotal, discount, tax, total } = payload;
  if ([subtotal, discount, tax, total].some((v) => typeof v !== "number")) {
    return { pass: false, disposition: "FAIL", faultClass: "SCHEMA_TYPE_VIOLATION" };
  }
  const expectedTotal = Number((subtotal - discount + tax).toFixed(2));
  const actualTotal = Number(total.toFixed(2));
  if (Math.abs(expectedTotal - actualTotal) > 0.001) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "BUSINESS_RULE_MATH_MISMATCH",
      detail: `Schema-valid response violates business rule: total ${actualTotal} != ${expectedTotal}.`
    };
  }
  return {
    pass: true,
    disposition: "PASS",
    faultClass: null,
    detail: `Total ${actualTotal} satisfies ${subtotal} - ${discount} + ${tax}.`
  };
}

// ---------------------------------------------------------------------------
// 3. Contract obligation vs schema validity (AC-08)
// ---------------------------------------------------------------------------
export function evaluateContractCompatibility(payload, contractSpec) {
  if (typeof payload !== "object" || payload === null) {
    return { pass: false, disposition: "FAIL", faultClass: "NON_OBJECT_RESPONSE" };
  }
  const missingFields = [];
  const typeMismatches = [];
  for (const [field, expectedType] of Object.entries(contractSpec.requiredFields || {})) {
    if (!(field in payload)) missingFields.push(field);
    else if (typeof payload[field] !== expectedType) {
      typeMismatches.push(`${field}: expected ${expectedType}, got ${typeof payload[field]}`);
    }
  }
  if (missingFields.length || typeMismatches.length) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "BREAKING_CONTRACT_CHANGE",
      detail: `Missing [${missingFields.join(", ")}]; type mismatches [${typeMismatches.join(", ")}].`,
      note: "Schema validation only; consumer-driven verification remains a separate selected obligation."
    };
  }
  return {
    pass: true,
    disposition: "PASS",
    faultClass: null,
    detail: "Response fulfils the recorded provider-consumer field obligations."
  };
}

// ---------------------------------------------------------------------------
// 4. Integration idempotency with independently observed ledgers (AC-09)
// ---------------------------------------------------------------------------
// Both ledgers are mandatory: a passing verdict requires observing local state and
// downstream gateway state. Transport status is kept apart from body status so an
// ambiguous socket drop is never rewritten as a successful first attempt.
export function evaluateIdempotency({
  firstAttempt,
  retry,
  localLedger,
  gatewayLedger,
  idempotencyKey,
  expected = {}
} = {}) {
  if (!Array.isArray(localLedger) || !Array.isArray(gatewayLedger)) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "MISSING_LEDGER_OBSERVATION",
      detail: "Local and downstream gateway ledgers must both be observed; neither is optional."
    };
  }
  const keyFilter = (row) => idempotencyKey === undefined || row.idempotencyKey === idempotencyKey;
  const localRows = localLedger.filter(keyFilter);
  const gatewayRows = gatewayLedger.filter(keyFilter);
  const retryStatuses = expected.retryStatuses ?? [200, 201];
  const bodyStatus = expected.bodyStatus ?? "succeeded";
  const observed = {
    localCount: localRows.length,
    gatewayCount: gatewayRows.length,
    firstAttemptTransport: firstAttempt?.transport?.status ?? firstAttempt?.transport?.error ?? "MISSING",
    retryTransport: retry?.transport?.status ?? retry?.transport?.error ?? "MISSING",
    retryBodyStatus: retry?.body?.status ?? null
  };

  if (localRows.length > 1) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "DUPLICATE_LOCAL_LEDGER_TRANSACTION",
      observed,
      detail: `Retry persisted ${localRows.length} local transactions for one idempotency key.`
    };
  }
  // Checked before local replay semantics: a locally deduplicated retry can still
  // produce a second downstream debit, which is the forbidden effect.
  if (gatewayRows.length > 1) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "DUPLICATE_DOWNSTREAM_GATEWAY_CHARGE",
      observed,
      detail: `Downstream gateway recorded ${gatewayRows.length} charges for one idempotency key (local replay looked correct with ${localRows.length} row).`
    };
  }
  if (localRows.length !== 1) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "MISSING_LOCAL_LEDGER_TRANSACTION",
      observed,
      detail: `Expected exactly one committed local transaction, observed ${localRows.length}.`
    };
  }
  if (gatewayRows.length !== 1) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "MISSING_DOWNSTREAM_GATEWAY_CHARGE",
      observed,
      detail: `Expected exactly one downstream gateway charge, observed ${gatewayRows.length}.`
    };
  }

  // The ambiguous case must stay ambiguous: a dropped first attempt is classified
  // from transport evidence, never rewritten into a numeric success.
  if (!firstAttempt || !firstAttempt.transport) {
    return { pass: false, disposition: "FAIL", faultClass: "MISSING_FIRST_ATTEMPT_OBSERVATION", observed };
  }
  const firstStatus = firstAttempt.transport.status;
  const firstError = firstAttempt.transport.error;
  const firstDropped = (firstStatus === null || firstStatus === undefined) && Boolean(firstError);
  const firstNumeric = typeof firstStatus === "number" && firstStatus >= 200 && firstStatus < 300;
  if (!firstDropped && !firstNumeric) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "UNDECLARED_FIRST_ATTEMPT_OUTCOME",
      observed,
      detail: `First attempt outcome ${firstStatus ?? "none"}/${firstError ?? "no error"} is neither a success nor an observed drop.`
    };
  }
  if (expected.firstAttempt?.kind === "transport_drop" && !firstDropped) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "FIRST_ATTEMPT_OUTCOME_MISMATCH",
      observed,
      detail: `Scenario declares a post-effect drop but the first attempt returned ${firstStatus}.`
    };
  }
  if (expected.firstAttempt?.kind === "numeric_success" && !firstNumeric) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "FIRST_ATTEMPT_OUTCOME_MISMATCH",
      observed,
      detail: `Scenario declares a successful first attempt but observed ${firstStatus ?? firstError}.`
    };
  }

  if (!retry || !retry.transport) {
    return { pass: false, disposition: "FAIL", faultClass: "MISSING_RETRY_OBSERVATION", observed };
  }
  if (retry.transport.error) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "RETRY_TRANSPORT_FAILED",
      observed,
      detail: `Retry did not complete: ${retry.transport.error}.`
    };
  }
  if (typeof retry.transport.status !== "number" || !retryStatuses.includes(retry.transport.status)) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "RETRY_OPERATION_FAILED",
      observed,
      detail: `Retry observed HTTP ${retry.transport.status ?? "none"}, outside the agreed ${retryStatuses.join("/")}.`
    };
  }
  if (retry.body?.status !== bodyStatus) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "RETRY_BODY_NOT_SUCCESSFUL",
      observed,
      detail: `Retry body status ${retry.body?.status ?? "none"} is not the agreed "${bodyStatus}".`
    };
  }
  if (retry.body?.isDuplicate !== true) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "MISSING_DUPLICATE_INDICATOR",
      observed,
      detail: "Retry replayed the effect without signalling deduplication."
    };
  }
  if (retry.body?.chargeId !== localRows[0].chargeId) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "RETRY_DID_NOT_REPLAY_RECORDED_EFFECT",
      observed,
      detail: `Retry returned ${retry.body?.chargeId} but the local ledger holds ${localRows[0].chargeId}.`
    };
  }
  if (retry.body?.gatewayChargeId !== gatewayRows[0].gatewayChargeId) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "UNREPORTED_GATEWAY_CHARGE",
      observed,
      detail: `Retry reported gateway charge ${retry.body?.gatewayChargeId}; ledger holds ${gatewayRows[0].gatewayChargeId}.`
    };
  }
  return {
    pass: true,
    disposition: "PASS",
    faultClass: null,
    observed,
    detail: `Retry completed with HTTP ${retry.transport.status} and one local plus one downstream gateway effect for key ${idempotencyKey}.`
  };
}

// ---------------------------------------------------------------------------
// 5. Regression selection: impact, exclusions, honest incompleteness (AC-10)
// ---------------------------------------------------------------------------
// Scope is decided from the changed paths, never from the record's own label.
// Shared/global changes must show the actual broadened coverage or a blocker.
const IMPACT_RULES = [
  { id: "auth-guard", scope: "global", pattern: /(^|\/)guards?\// },
  { id: "interceptor", scope: "global", pattern: /(^|\/)interceptors?\// },
  { id: "module-wiring", scope: "global", pattern: /(^|\/)app\.module\.ts$/ },
  { id: "auth-core", scope: "global", pattern: /(^|\/)auth\// },
  { id: "shared-contract", scope: "global", pattern: /^(contracts|openapi|schemas)\// },
  { id: "dependency-manifest", scope: "global", pattern: /(^|\/)package\.json$/ },
  { id: "migration", scope: "global", pattern: /(^|\/)migrations?\// },
  { id: "shared-database", scope: "shared", pattern: /(^|\/)(database|db)\// },
  { id: "shared-pool", scope: "shared", pattern: /(^|\/)pool\.(ts|js|mjs)$/ },
  { id: "shared-config", scope: "shared", pattern: /(^|\/)config\// },
  { id: "shared-plumbing", scope: "shared", pattern: /(^|\/)(middleware|serializers?|cache|queue|http-client|shared)\// },
  { id: "local-module", scope: "local", pattern: /^src\// },
  { id: "tests", scope: "local", pattern: /^(tests?|__tests__)\// }
];
const SCOPE_RANK = { local: 0, shared: 1, global: 2, unknown: -1 };

export function classifyChangeImpact(changedPaths) {
  const matchedRules = [];
  const unclassifiedPaths = [];
  let scope = "local";
  for (const changedPath of changedPaths) {
    const matches = IMPACT_RULES.filter((rule) => rule.pattern.test(changedPath));
    if (matches.length === 0) {
      unclassifiedPaths.push(changedPath);
      continue;
    }
    for (const match of matches) {
      if (!matchedRules.includes(match.id)) matchedRules.push(match.id);
      if (SCOPE_RANK[match.scope] > SCOPE_RANK[scope]) scope = match.scope;
    }
  }
  return {
    scope: changedPaths.length === 0 || unclassifiedPaths.length ? "unknown" : scope,
    matchedRules,
    unclassifiedPaths
  };
}

function normalizeObligations(affectedObligations) {
  if (!Array.isArray(affectedObligations)) return [];
  return affectedObligations
    .map((entry) => (typeof entry === "string" ? { id: entry, critical: true } : entry))
    .filter((entry) => entry && typeof entry.id === "string" && entry.id.trim().length > 0);
}

function normalizeSelectedTests(selectedTests) {
  if (!Array.isArray(selectedTests)) return [];
  return selectedTests.filter((test) => test && typeof test.id === "string" && test.id.trim().length > 0);
}

export function evaluateRegressionSelection({ changedPaths = [], record = {} } = {}) {
  const impact = classifyChangeImpact(changedPaths);
  const base = { requiredScope: impact.scope, matchedRules: impact.matchedRules, unclassifiedPaths: impact.unclassifiedPaths };

  const declaredScope = record.impactScope;
  if (!["local", "shared", "global", "unknown"].includes(declaredScope)) {
    return { pass: false, disposition: "FAIL", faultClass: "INVALID_IMPACT_SCOPE", ...base, detail: `impactScope ${declaredScope} is not a declared scope.` };
  }

  const obligations = normalizeObligations(record.affectedObligations);
  if (obligations.length === 0) {
    return { pass: false, disposition: "FAIL", faultClass: "MISSING_AFFECTED_OBLIGATION", ...base };
  }
  const selectedTests = normalizeSelectedTests(record.selectedTests);
  if (selectedTests.length === 0) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "EMPTY_SELECTION",
      ...base,
      detail: "A selection with no executable test cannot claim completeness, whatever its scope label says."
    };
  }
  const invalidMetadata = selectedTests.find((test) =>
    typeof test.lane !== "string" ||
    !test.lane.trim() ||
    typeof test.purpose !== "string" ||
    !test.purpose.trim() ||
    !Object.hasOwn(SCOPE_RANK, test.scope) ||
    !Array.isArray(test.obligationIds)
  );
  if (invalidMetadata) {
    return { pass: false, disposition: "FAIL", faultClass: "INVALID_SELECTED_TEST_METADATA", ...base };
  }
  const smokeBaseline = selectedTests.find((test) => test.purpose === "smoke-baseline" && test.lane === "smoke");
  if (!smokeBaseline) {
    return { pass: false, disposition: "FAIL", faultClass: "DROPPED_SMOKE_BASELINE", ...base };
  }
  const testIds = new Set(selectedTests.map((test) => test.id));
  if (testIds.size !== selectedTests.length) {
    return { pass: false, disposition: "FAIL", faultClass: "DUPLICATE_SELECTED_TEST", ...base };
  }
  const obligationIds = new Set(obligations.map((obligation) => obligation.id));
  const unknownReferences = selectedTests.flatMap((test) =>
    (test.obligationIds ?? []).filter((id) => !obligationIds.has(id))
  );
  if (unknownReferences.length) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "UNKNOWN_OBLIGATION_REFERENCE",
      ...base,
      detail: `Selected tests reference obligations outside the affected set: ${[...new Set(unknownReferences)].join(", ")}.`
    };
  }
  const covered = new Set(selectedTests.flatMap((test) => test.obligationIds ?? []));
  const uncovered = obligations.filter((obligation) => !covered.has(obligation.id)).map((obligation) => obligation.id);
  if (uncovered.length) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "MISSING_OBLIGATION_COVERAGE",
      ...base,
      detail: `Affected obligations without a selected test: ${uncovered.join(", ")}.`
    };
  }
  const excluded = Array.isArray(record.excludedLanes) ? record.excludedLanes : [];
  const reasonless = excluded.filter((entry) => typeof entry === "string" || !entry?.reason?.trim());
  if (reasonless.length) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "MISSING_EXCLUSION_REASON",
      ...base,
      detail: `${reasonless.length} excluded lane(s) record no exclusion reason.`
    };
  }

  const blocked = typeof record.blockedReason === "string" && record.blockedReason.trim().length > 0;
  if (blocked) {
    return {
      pass: true,
      disposition: "BLOCKED",
      faultClass: null,
      ...base,
      detail: `Selection recorded a blocker instead of claiming completeness: ${record.blockedReason}`
    };
  }

  const coverage = record.broadenedCoverage ?? null;
  const coverageIds = Array.isArray(coverage?.tests) ? coverage.tests : [];
  const coverageTests = coverageIds.map((id) => selectedTests.find((test) => test.id === id));
  const coverageScope = coverageTests
    .filter((test) => test?.purpose === "broadening")
    .reduce((scope, test) => SCOPE_RANK[test.scope] > SCOPE_RANK[scope] ? test.scope : scope, "local");
  const coverageMatches = (scope) =>
    SCOPE_RANK[coverageScope] >= SCOPE_RANK[scope] &&
    coverageTests.length > 0 &&
    coverageTests.every(Boolean) &&
    coverageTests.includes(smokeBaseline);

  if (impact.scope === "unknown") {
    if (coverageMatches("global")) {
      const lanes = [...new Set(coverageTests.map((test) => test.lane))];
      return { pass: true, disposition: "BROADENED", faultClass: null, ...base, detail: `Unclassified change broadened through selected tests in ${lanes.join(", ")}.` };
    }
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "UNKNOWN_IMPACT_CLAIMED_COMPLETE",
      ...base,
      detail: "Unclassified changed paths need a broadened suite with real tests or an explicit blocker."
    };
  }

  if (impact.scope === "shared" || impact.scope === "global") {
    if (!coverage && declaredScope === "local") {
      return {
        pass: false,
        disposition: "FAIL",
        faultClass: impact.scope === "global"
          ? "UNJUSTIFIED_NARROW_SELECTION_ON_GLOBAL_CHANGE"
          : "UNJUSTIFIED_NARROW_SELECTION_ON_SHARED_CHANGE",
        ...base,
        detail: `${impact.scope}-impact change (${impact.matchedRules.join(", ")}) claims local scope with no broadened coverage.`
      };
    }
    if (coverage && coverageIds.length === 0) {
      return {
        pass: false,
        disposition: "FAIL",
        faultClass: "EMPTY_BROADENED_COVERAGE",
        ...base,
        detail: "Broadened coverage claims a scope but lists no selected test IDs."
      };
    }
    if (!coverageMatches(impact.scope)) {
      return {
        pass: false,
        disposition: "FAIL",
        faultClass: "INSUFFICIENT_BROADENING",
        ...base,
        detail: `Broadened selection does not contain the retained baseline and a selected ${impact.scope}-scope broadening test.`
      };
    }
    const criticalUncovered = obligations
      .filter((obligation) => obligation.critical)
      .filter((obligation) => !coverageTests.some((test) => test.obligationIds.includes(obligation.id)))
      .map((obligation) => obligation.id);
    if (criticalUncovered.length) {
      return {
        pass: false,
        disposition: "FAIL",
        faultClass: "CRITICAL_OBLIGATION_NOT_BROADENED",
        ...base,
        detail: `Broadened run omits critical obligations: ${criticalUncovered.join(", ")}.`
      };
    }
    const lanes = [...new Set(coverageTests.map((test) => test.lane))];
    return { pass: true, disposition: "BROADENED", faultClass: null, ...base, detail: `${impact.scope}-impact change broadened through selected tests in ${lanes.join(", ")}.` };
  }

  if (declaredScope === "unknown") {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "IMPACT_SCOPE_UNRESOLVED",
      ...base,
      detail: "Local-impact change declared an unresolved scope instead of recording the impact assessment."
    };
  }
  return {
    pass: true,
    disposition: "SELECTED",
    faultClass: null,
    ...base,
    detail: `Local impact with ${selectedTests.length} selected test(s) covering ${obligations.length} obligation(s).`
  };
}

// ---------------------------------------------------------------------------
// 6. Authorization: status plus protected-state before/after (AC-13)
// ---------------------------------------------------------------------------
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function readPath(source, dottedPath) {
  return dottedPath.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), source);
}

export function evaluateAuthorizationAttempt({ check, before, after, response, expected } = {}) {
  if (!expected || typeof expected.allowed !== "boolean") {
    return { pass: false, disposition: "INVALID", faultClass: "MISSING_EXPECTATION", check };
  }
  const deniedStatuses = expected.deniedStatuses ?? [401, 403, 404];
  const stateChanged = stableStringify(before) !== stableStringify(after);
  const transportStatus = response?.transport?.status ?? null;
  const observed = { check, transportStatus, stateChanged };

  if (expected.allowed === false) {
    // State is checked first: a protected field mutated before a correct 403 is a
    // silent breach that status-only assertions cannot see.
    if (stateChanged) {
      return {
        pass: false,
        disposition: "FAIL",
        faultClass: "PROTECTED_STATE_MUTATED_ON_DENIED_REQUEST",
        observed,
        detail: `Denied request mutated protected state: ${stableStringify(before)} -> ${stableStringify(after)}.`
      };
    }
    if (!deniedStatuses.includes(transportStatus)) {
      return {
        pass: false,
        disposition: "FAIL",
        faultClass: "ACCESS_NOT_DENIED",
        observed,
        detail: `Expected one of ${deniedStatuses.join("/")} for ${check}, observed ${transportStatus ?? "NO_RESPONSE"}.`
      };
    }
    return { pass: true, disposition: "PASS", faultClass: null, observed, detail: `${check} denied with ${transportStatus}; protected state unchanged.` };
  }

  if (transportStatus === null || transportStatus >= 300) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "EXPECTED_ALLOWED_REQUEST_REJECTED",
      observed,
      detail: `Expected allowed ${check}, observed ${transportStatus ?? "NO_RESPONSE"}.`
    };
  }
  if (expected.mutation) {
    for (const [field, value] of Object.entries(expected.mutation)) {
      if (stableStringify(readPath(after, field)) !== stableStringify(value)) {
        return {
          pass: false,
          disposition: "FAIL",
          faultClass: "MUTATION_NOT_APPLIED",
          observed,
          detail: `Allowed ${check} did not produce ${field} = ${stableStringify(value)}.`
        };
      }
    }
  }
  return { pass: true, disposition: "PASS", faultClass: null, observed, detail: `Allowed ${check} returned ${transportStatus} with the expected state.` };
}

// ---------------------------------------------------------------------------
// 7. Read-only tenant boundary (AC-13 BOLA/IDOR)
// ---------------------------------------------------------------------------
export function evaluateTenantAuthorization(requestingTenant, targetTenant, response, context = {}) {
  const transportStatus = response?.transport?.status ?? response?.status ?? null;
  const { checkType = "tenant_isolation", userRole = "USER", requestedAction = "read" } = context;

  if (checkType === "authentication") {
    return transportStatus === 401
      ? { pass: true, disposition: "PASS", faultClass: null, detail: "Unauthenticated request rejected with 401." }
      : { pass: false, disposition: "FAIL", faultClass: "UNAUTHENTICATED_ACCESS_ALLOWED", detail: `Expected 401, observed ${transportStatus}.` };
  }
  if (checkType === "role_authorization") {
    if (userRole !== "ADMIN" && requestedAction === "admin") {
      return transportStatus === 403
        ? { pass: true, disposition: "PASS", faultClass: null, detail: "Low-privilege principal denied admin action with 403." }
        : { pass: false, disposition: "FAIL", faultClass: "INSUFFICIENT_ROLE_ACCESS_ALLOWED", detail: `${userRole} reached admin action with ${transportStatus}.` };
    }
    if (userRole === "ADMIN") {
      return transportStatus === 200
        ? { pass: true, disposition: "PASS", faultClass: null, detail: "Admin principal authorized." }
        : { pass: false, disposition: "FAIL", faultClass: "ADMIN_ACTION_REJECTED", detail: `Admin observed ${transportStatus}.` };
    }
  }
  if (requestingTenant !== targetTenant) {
    if (transportStatus === 200) {
      return {
        pass: false,
        disposition: "FAIL",
        faultClass: "CROSS_TENANT_AUTHORIZATION_BYPASS",
        detail: `Tenant ${requestingTenant} read a resource owned by ${targetTenant}.`
      };
    }
    if (transportStatus === 404 || transportStatus === 403) {
      return { pass: true, disposition: "PASS", faultClass: null, detail: `Cross-tenant read denied with ${transportStatus}.` };
    }
  } else if (transportStatus === 200) {
    return { pass: true, disposition: "PASS", faultClass: null, detail: "Authorized same-tenant read succeeded." };
  }
  return {
    pass: false,
    disposition: "FAIL",
    faultClass: "UNEXPECTED_AUTHORIZATION_STATUS",
    detail: `Unexpected ${transportStatus} for tenant ${requestingTenant}.`
  };
}

// ---------------------------------------------------------------------------
// 8. Fuzz obligations per case: contract, state, hang, resource (AC-14)
// ---------------------------------------------------------------------------
const STACK_TRACE_PATTERN = /\bat [\w$.<>]+\([^)]*\)|\b\w+(Exception|Error)\b.*\n\s+at /;

export function evaluateFuzzCase({ fuzzCase, before, after, response, bounds, responseBytes } = {}) {
  const caseId = fuzzCase?.id ?? "unknown";
  const base = { caseId, category: fuzzCase?.category ?? null, minimizedInput: fuzzCase?.minimizedInput ?? null };

  if (!response) {
    return { pass: false, disposition: "FAIL", faultClass: "HANG_EXCEEDED_REQUEST_DEADLINE", ...base, detail: "No response inside the request deadline." };
  }
  const stateChanged = stableStringify(before) !== stableStringify(after);
  if (stateChanged) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "UNAUTHORIZED_STATE_CHANGE",
      ...base,
      detail: `Case ${caseId} mutated observable state: ${stableStringify(before)} -> ${stableStringify(after)}.`
    };
  }
  const status = response.transport?.status ?? null;
  const bodyText = typeof response.body === "string" ? response.body : JSON.stringify(response.body);
  const observed = { status, responseBytes, expectedStatuses: fuzzCase?.expectedStatuses ?? null };

  if (status === null) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "TRANSPORT_FAILURE_UNEXPECTED",
      ...base,
      observed,
      detail: `Case ${caseId} produced transport failure ${response.transport?.error}.`
    };
  }

  if (fuzzCase?.valid === true) {
    if (status >= 500) {
      return { pass: false, disposition: "FAIL", faultClass: "UNHANDLED_EXCEPTION_CRASH", ...base, observed, detail: `Valid input crashed with ${status}.` };
    }
    if (status !== 200) {
      return { pass: false, disposition: "FAIL", faultClass: "VALID_INPUT_REJECTED", ...base, observed, detail: `Valid input rejected with ${status}.` };
    }
    const shapeOk = response.body && typeof response.body === "object" && response.body.status === "ACCEPTED" && typeof response.body.parsedFields === "number";
    if (!shapeOk) {
      return { pass: false, disposition: "FAIL", faultClass: "CONTRACT_VIOLATION", ...base, observed, detail: "Accepted response did not match the declared response contract." };
    }
    if (typeof responseBytes === "number" && bounds?.responseBytesMax && responseBytes > bounds.responseBytesMax) {
      return {
        pass: false,
        disposition: "FAIL",
        faultClass: "RESOURCE_BOUND_VIOLATION",
        ...base,
        observed,
        detail: `Response of ${responseBytes} bytes exceeded the fixture bound of ${bounds.responseBytesMax}.`
      };
    }
    return { pass: true, disposition: "PASS", faultClass: null, ...base, observed, detail: `Valid case ${caseId} accepted within declared bounds.` };
  }

  if (status >= 500) {
    return { pass: false, disposition: "FAIL", faultClass: "UNHANDLED_EXCEPTION_CRASH", ...base, observed, detail: `Invalid input produced ${status}.` };
  }
  if (STACK_TRACE_PATTERN.test(bodyText)) {
    return { pass: false, disposition: "FAIL", faultClass: "STACK_TRACE_LEAK", ...base, observed, detail: "Response body leaked a stack trace." };
  }
  const expectedStatuses = fuzzCase?.expectedStatuses ?? [];
  if (status >= 200 && status < 300) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: fuzzCase?.category === "oversized" ? "PAYLOAD_BOUND_NOT_ENFORCED" : "CONTRACT_VIOLATION_ACCEPTED",
      ...base,
      observed,
      detail: `Invalid ${fuzzCase?.category} input accepted with ${status} instead of ${expectedStatuses.join("/")}.`
    };
  }
  if (!expectedStatuses.includes(status)) {
    return { pass: false, disposition: "FAIL", faultClass: "UNEXPECTED_REJECTION_STATUS", ...base, observed, detail: `Observed ${status}, expected ${expectedStatuses.join("/")}.` };
  }
  return { pass: true, disposition: "PASS", faultClass: null, ...base, observed, detail: `Invalid ${fuzzCase?.category} input rejected with ${status}.` };
}

// Minimal real sequence obligation (AC-14): ordered requests against a fixture that
// enforces a precondition, so the check exercises transition state instead of a field name.
export function evaluateFuzzSequence({ steps, expected } = {}) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return { pass: false, disposition: "INVALID", faultClass: "MISSING_SEQUENCE_OBSERVATION", detail: "No ordered requests were observed." };
  }
  if (!Array.isArray(expected?.steps) || expected.steps.length !== steps.length) {
    return { pass: false, disposition: "INVALID", faultClass: "SEQUENCE_EXPECTATION_MISMATCH", detail: "Observed steps and declared sequence disagree on length." };
  }
  const observations = [];
  let lastAcceptedPhase = null;
  for (let index = 0; index < steps.length; index += 1) {
    const observed = steps[index];
    const declared = expected.steps[index];
    const status = observed.transport?.status ?? null;
    observations.push({ phase: observed.phase, status, expectedStatus: declared.expectedStatus });
    if (status === null) {
      return {
        pass: false,
        disposition: "FAIL",
        faultClass: "SEQUENCE_TRANSPORT_FAILURE",
        observations,
        detail: `Step ${index + 1} produced no HTTP response (${observed.transport?.error ?? "unknown"}).`
      };
    }
    if (status !== declared.expectedStatus) {
      return {
        pass: false,
        disposition: "FAIL",
        faultClass:
          status === 200 && declared.expectedStatus === 409
            ? "PRECONDITION_NOT_ENFORCED"
            : status === 409 && declared.expectedStatus === 200
              ? "SEQUENCE_STEP_REJECTED"
              : "SEQUENCE_STATUS_MISMATCH",
        observations,
        detail: `Step ${index + 1} (phase ${observed.phase}) returned ${status}, expected ${declared.expectedStatus}.`
      };
    }
    if (status === 200) {
      if (observed.body?.preconditionEnforced === false) {
        return {
          pass: false,
          disposition: "FAIL",
          faultClass: "PRECONDITION_NOT_ENFORCED",
          observations,
          detail: `Step ${index + 1} was accepted without honouring the declared precondition.`
        };
      }
      if (lastAcceptedPhase !== null && observed.phase !== lastAcceptedPhase + 1) {
        return {
          pass: false,
          disposition: "FAIL",
          faultClass: "SEQUENCE_OUT_OF_ORDER",
          observations,
          detail: `Accepted phase ${observed.phase} does not follow ${lastAcceptedPhase}.`
        };
      }
      lastAcceptedPhase = observed.phase;
    }
  }
  return {
    pass: true,
    disposition: "PASS",
    faultClass: null,
    observations,
    detail: `Sequence ${steps.map((step) => step.phase).join(" -> ")} respected the fixture precondition and ordering.`
  };
}

// Bounded delta-debugging over the raw fuzz input. Returns a reduced input that
// still reproduces the failure, so the reported case is replayable and minimal.
export async function minimizeFailingInput(input, isStillFailing, { maxIterations = 200 } = {}) {
  let current = input;
  let iterations = 0;
  let chunk = Math.max(1, Math.floor(current.length / 2));
  while (chunk >= 1 && iterations < maxIterations && current.length > 1) {
    let reduced = false;
    for (let index = 0; index + chunk <= current.length && iterations < maxIterations; index += chunk) {
      const candidate = current.slice(0, index) + current.slice(index + chunk);
      if (!candidate) continue;
      iterations += 1;
      if (await isStillFailing(candidate)) {
        current = candidate;
        reduced = true;
        break;
      }
    }
    if (!reduced) chunk = Math.floor(chunk / 2);
  }
  return {
    minimized: current,
    originalLength: input.length,
    minimizedLength: current.length,
    iterations,
    reproducible: await isStillFailing(current)
  };
}

// AC-15: absent target authorization blocks dependent execution and sends nothing.
export function evaluateExecutionAuthorization({ authorized, target, offlinePlanningAvailable = true } = {}) {
  if (!target) {
    return { disposition: "BLOCKED", faultClass: "MISSING_TARGET", requestsSent: 0, detail: "No target identified." };
  }
  if (authorized === true) {
    return { disposition: "AUTHORIZED", faultClass: null, requestsSent: 0, detail: `Execution authorized for ${target}.` };
  }
  return {
    disposition: "BLOCKED",
    faultClass: null,
    requestsSent: 0,
    offlinePlanningAvailable,
    detail: `Active execution against ${target} blocked: no authorization recorded. Offline planning continues.`
  };
}

// ---------------------------------------------------------------------------
// 9. Load/recovery over phase observations (AC-11, AC-12, C3, C4)
// ---------------------------------------------------------------------------
function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

function observationComplete(sample) {
  return sample && typeof sample.status === "number" && typeof sample.latencyMs === "number";
}

export function evaluatePerformanceRecovery({ workload, observations, classification = SYNTHETIC_CLASSIFICATION } = {}) {
  if (classification !== SYNTHETIC_CLASSIFICATION) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "NON_SYNTHETIC_CLASSIFICATION_REJECTED",
      classification,
      detail: "Fixture observations cannot be reported as capacity or candidate evidence."
    };
  }
  if (!workload || !observations) {
    return { pass: false, disposition: "INVALID", faultClass: "MISSING_WORKLOAD_OR_OBSERVATIONS", classification };
  }
  const { baseline = [], peak = [], recovery = [], timeToFirstSuccessMs = null } = observations;
  const all = [...baseline, ...peak, ...recovery];
  if (all.length === 0 || all.some((sample) => !observationComplete(sample))) {
    return {
      pass: false,
      disposition: "INVALID",
      faultClass: "INCOMPLETE_OBSERVATION",
      classification,
      detail: "Every observed sample needs a numeric transport status and measured latency; nothing may be substituted."
    };
  }

  const baselineLatencies = baseline.map((s) => s.latencyMs);

  // Workload obligations come from the fixture contract, not from what was supplied.
  if (workload.shape !== "single_wave") {
    return {
      pass: false,
      disposition: "INVALID",
      faultClass: "UNSUPPORTED_WORKLOAD_SHAPE",
      classification,
      detail: "This bounded fixture models a single-wave closed workload only; other shapes need their own driver and contract."
    };
  }
  const requiredBaselineSamples = workload.baselineSamplesRequired ?? 0;
  if (baseline.length < requiredBaselineSamples) {
    return {
      pass: false,
      disposition: "INVALID",
      faultClass: "INSUFFICIENT_BASELINE_OBSERVATION",
      classification,
      observed: { baselineSamples: baseline.length, required: requiredBaselineSamples },
      detail: `Baseline needs ${requiredBaselineSamples} pre-load sample(s), observed ${baseline.length}; a peak sample cannot stand in for baseline.`
    };
  }
  const requiredPeakSamples = workload.peakSamplesRequired ?? 0;
  if (peak.length < requiredPeakSamples) {
    return {
      pass: false,
      disposition: "INVALID",
      faultClass: "INSUFFICIENT_PEAK_OBSERVATION",
      classification,
      observed: { peakSamples: peak.length, required: requiredPeakSamples },
      detail: `Declared workload needs ${requiredPeakSamples} peak sample(s), observed ${peak.length}.`
    };
  }
  const occupancy = observations.occupancy ?? null;
  if (
    !occupancy ||
    typeof occupancy.peakInFlight !== "number" ||
    typeof occupancy.peakAcceptedInFlight !== "number"
  ) {
    return {
      pass: false,
      disposition: "INVALID",
      faultClass: "MISSING_OCCUPANCY_OBSERVATION",
      classification,
      detail: "Concurrent occupancy must be observed separately from total phase completions."
    };
  }
  if (typeof workload.capacity === "number" && occupancy.peakAcceptedInFlight > workload.capacity) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "OCCUPANCY_LIMIT_EXCEEDED",
      classification,
      observed: { ...occupancy, capacity: workload.capacity },
      detail: `Peak concurrently served requests ${occupancy.peakAcceptedInFlight} exceeded declared capacity ${workload.capacity}.`
    };
  }
  if (workload.requiredShedding && occupancy.peakInFlight <= workload.capacity) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "NO_OVERLOAD_OCCUPANCY_OBSERVED",
      classification,
      observed: { ...occupancy, capacity: workload.capacity },
      detail: `Peak in-flight ${occupancy.peakInFlight} never exceeded capacity ${workload.capacity}, so no overload occurred.`
    };
  }

  if (baseline.some((s) => s.status !== 200)) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "BASELINE_PHASE_FAILURE",
      classification,
      detail: `Baseline phase observed statuses ${baseline.map((s) => s.status).join(",")}.`
    };
  }
  const baselineP95 = percentile(baselineLatencies, 95);
  if (baselineP95 > workload.successLatencyBudgetMs) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "BASELINE_LATENCY_BUDGET_EXCEEDED",
      classification,
      observed: { baselineP95, budget: workload.successLatencyBudgetMs },
      detail: `Baseline p95 ${baselineP95}ms exceeded approved fixture budget ${workload.successLatencyBudgetMs}ms.`
    };
  }

  const shedCount = peak.filter((s) => s.status === 503).length;
  const peakAccepted = peak.filter((s) => s.status === 200).length;
  if (workload.requiredShedding && shedCount === 0) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "NO_SHEDDING_OBSERVED_UNDER_OVERLOAD",
      classification,
      observed: { shedCount, peakAccepted },
      detail: "Overload phase accepted every request; no degradation was observed."
    };
  }
  const peakSuccessLatencies = peak.filter((s) => s.status === 200).map((s) => s.latencyMs);
  const peakP95 = percentile(peakSuccessLatencies, 95);
  if (peakP95 !== null && peakP95 > workload.successLatencyBudgetMs) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "PEAK_LATENCY_BUDGET_EXCEEDED",
      classification,
      observed: { peakP95, budget: workload.successLatencyBudgetMs },
      detail: `Peak success p95 ${peakP95}ms exceeded fixture budget ${workload.successLatencyBudgetMs}ms.`
    };
  }
  const unexpectedErrors = all.filter((s) => s.status >= 500 && !(s.status === 503 && workload.requiredShedding)).length;
  const errorRatio = unexpectedErrors / all.length;
  if (errorRatio > (workload.errorBudgetRatio ?? 0)) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "ERROR_BUDGET_EXCEEDED",
      classification,
      observed: { unexpectedErrors, total: all.length, errorRatio },
      detail: `Unexpected error ratio ${errorRatio.toFixed(3)} exceeded fixture budget ${workload.errorBudgetRatio}.`
    };
  }

  const requiredRecoverySamples = workload.recoverySamplesRequired ?? 1;
  if (recovery.length < requiredRecoverySamples) {
    return {
      pass: false,
      disposition: "INVALID",
      faultClass: "INSUFFICIENT_RECOVERY_OBSERVATION",
      classification,
      observed: { recoverySamples: recovery.length, required: requiredRecoverySamples },
      detail: "Recovery must be observed across every required post-load sample."
    };
  }
  const failedRecovery = recovery.filter((s) => s.status !== 200);
  if (failedRecovery.length) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "RECOVERY_FAILURE_POST_LOAD",
      classification,
      observed: { recoveryStatuses: recovery.map((s) => s.status), recoveryLatencies: recovery.map((s) => s.latencyMs) },
      detail: `Post-load recovery degraded on ${failedRecovery.length}/${recovery.length} samples (statuses ${recovery.map((s) => s.status).join(",")}).`
    };
  }
  const slowRecovery = recovery.filter((s) => s.latencyMs > workload.recoveryLatencyBudgetMs);
  if (slowRecovery.length) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "RECOVERY_LATENCY_BUDGET_EXCEEDED",
      classification,
      observed: { recoveryLatencies: recovery.map((s) => s.latencyMs), budget: workload.recoveryLatencyBudgetMs },
      detail: `Recovery latencies exceeded ${workload.recoveryLatencyBudgetMs}ms on ${slowRecovery.length} sample(s).`
    };
  }
  if (workload.recoveryDeadlineMs && (timeToFirstSuccessMs === null || timeToFirstSuccessMs > workload.recoveryDeadlineMs)) {
    return {
      pass: false,
      disposition: "FAIL",
      faultClass: "RECOVERY_DEADLINE_EXCEEDED",
      classification,
      observed: { timeToFirstSuccessMs, deadline: workload.recoveryDeadlineMs },
      detail: `First post-load success at ${timeToFirstSuccessMs ?? "unmeasured"}ms exceeded recovery deadline ${workload.recoveryDeadlineMs}ms.`
    };
  }

  return {
    pass: true,
    disposition: "PASS",
    faultClass: null,
    classification,
    observed: { baselineP95, peakP95, shedCount, peakAccepted, occupancy, errorRatio, recoveryLatencies: recovery.map((s) => s.latencyMs), timeToFirstSuccessMs },
    detail: `Workload ${workload.id} met fixture budgets with ${shedCount} shed and full recovery.`
  };
}

export function evaluatePerformanceTripwire(requestResults, tripwireThreshold = 5) {
  let consecutiveErrors = 0;
  for (let index = 0; index < requestResults.length; index += 1) {
    const result = requestResults[index];
    if (result.status >= 500 || result.error) {
      consecutiveErrors += 1;
      if (consecutiveErrors >= tripwireThreshold) {
        return {
          tripped: true,
          disposition: "ABORTED",
          faultClass: "PERFORMANCE_TRIPWIRE_ERROR_BURST",
          abortedAtIndex: index,
          detail: `Tripwire fired at request ${index + 1} after ${consecutiveErrors} consecutive server errors.`
        };
      }
    } else {
      consecutiveErrors = 0;
    }
  }
  return { tripped: false, disposition: "COMPLETED", faultClass: null, detail: "Workload completed inside the error tripwire." };
}

// ---------------------------------------------------------------------------
// 10. Mobile Contract C6 evidence record (AC-21..AC-30)
// ---------------------------------------------------------------------------
const PLATFORMS = ["ios", "android", "flutter", "react-native"];
const LANES = ["ios", "android"];
const LANES_BY_PLATFORM = {
  ios: ["ios"],
  android: ["android"],
  flutter: ["ios", "android"],
  "react-native": ["ios", "android"]
};
const ENVIRONMENTS_BY_LANE = {
  ios: ["physical", "simulator"],
  android: ["physical", "emulator"]
};
const DRIVERS_BY_LANE = {
  ios: ["xcuitest", "appium", "detox", "flutter-driver", "patrol", "manual"],
  android: ["uiautomator2", "espresso", "appium", "detox", "flutter-driver", "patrol", "manual"]
};
const DRIVERS_BY_PLATFORM = {
  ios: ["xcuitest", "appium", "manual"],
  android: ["uiautomator2", "espresso", "appium", "manual"],
  flutter: ["flutter-driver", "patrol", "appium", "manual"],
  "react-native": ["detox", "patrol", "appium", "xcuitest", "uiautomator2", "manual"]
};
const LIFECYCLE_STATES = ["foreground", "background_then_resume", "relaunch", "interruption"];
const NETWORK_STATES = ["online", "offline", "offline_then_online"];
const PERMISSION_STATES = ["granted", "denied", "revoked"];
const FRAMEWORKS = {
  ios: ["uikit", "swiftui"],
  android: ["views", "compose"],
  flutter: ["flutter"],
  "react-native": ["react-native"]
};
const TEST_LAYERS = ["unit", "component", "widget", "integration", "device-e2e"];
const ENV_TYPES = ["physical", "emulator", "simulator"];
const DRIVERS = ["xcuitest", "uiautomator2", "espresso", "appium", "flutter-driver", "patrol", "detox", "manual"];
const EVIDENCE_TYPES = ["xcresult", "device-log", "uiautomator-xml", "video", "screenshot", "manual-attestation", "browser-emulation", "mock", "component-test"];
const NON_NATIVE_EVIDENCE = ["browser-emulation", "mock", "component-test"];
const OUTCOMES = ["PASS", "FAIL", "BLOCKED", "NOT_RUN"];
const INSTALL_MODES = ["reset", "noReset"];
const AC_IDS = Array.from({ length: 10 }, (_, index) => `AC-${21 + index}`);
const ARTIFACT_DIGEST = /^sha256:[0-9a-f]{64}$/;
// Package extensions identify a target only when the artifact format is explicit.
// Ordinary bundle/archive paths without a recognized package extension stay unknown.
function artifactTargetFromPath(artifactPath) {
  if (typeof artifactPath !== "string") return null;
  const filename = artifactPath.split(/[\\/]/).at(-1)?.toLowerCase();
  if (filename?.endsWith(".apk")) return "android";
  if (filename?.endsWith(".ipa")) return "ios";
  return null;
}

function requiredFields(record, fields) {
  return fields.filter((field) => readPath(record, field) === undefined || readPath(record, field) === null || readPath(record, field) === "");
}

// A C6 context field is either an explicit enum value or a justified not-applicable
// declaration; silence is a missing precondition, not an exemption.
function contextViolation(value, field, allowed) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value.notApplicable === true && typeof value.reason === "string" && value.reason.trim().length > 0
      ? null
      : `${field}:invalid-not-applicable`;
  }
  return allowed.includes(value) ? null : `${field}:${value}`;
}

function permissionsViolation(permissions) {
  if (permissions && typeof permissions === "object" && !Array.isArray(permissions)) {
    return permissions.notApplicable === true && typeof permissions.reason === "string" && permissions.reason.trim().length > 0
      ? null
      : "permissions:invalid-not-applicable";
  }
  if (!Array.isArray(permissions) || permissions.length === 0) return "permissions:missing";
  const invalid = permissions.find(
    (entry) => !entry || typeof entry.name !== "string" || !entry.name.trim() || !PERMISSION_STATES.includes(entry.state)
  );
  return invalid ? `permissions:${invalid?.name ?? "unnamed"}:${invalid?.state ?? "no-state"}` : null;
}

function forbiddenEffectsViolation(forbiddenEffects) {
  if (forbiddenEffects && typeof forbiddenEffects === "object" && !Array.isArray(forbiddenEffects)) {
    return forbiddenEffects.notApplicable === true &&
      typeof forbiddenEffects.reason === "string" &&
      forbiddenEffects.reason.trim().length > 0
      ? null
      : "forbiddenEffects:invalid-not-applicable";
  }
  return Array.isArray(forbiddenEffects) && forbiddenEffects.length > 0
    ? null
    : "forbiddenEffects:missing";
}

// Validates a C6 record. Record validity is never native proof: a complete record
// yields nativeVerification = NOT_ESTABLISHED and a declared-PASS disposition that
// still requires native execution evidence.
export function evaluateMobileEvidenceRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return {
      recordValid: false,
      disposition: "REJECTED",
      faultClass: "INVALID_RECORD",
      nativeVerification: "NOT_ESTABLISHED",
      missingFields: ["record"],
      detail: "Evidence record must be a non-empty object."
    };
  }
  const missing = requiredFields(record, [
    "requirementId", "acId", "platform", "lane", "framework", "testLayer",
    "appArtifact.digest", "appArtifact.buildType", "appArtifact.version", "appArtifact.path",
    "environment.type", "environment.osVersion", "environment.deviceModel",
    "driver.name", "driver.version",
    "installation.mode", "installation.action",
    "identity.synthetic", "identity.ref",
    "permissions", "network", "lifecycle", "forbiddenEffects",
    "actions", "expected", "observed", "cleanup", "outcome",
    "evidence.type", "evidence.artifact", "reviewer"
  ]);
  const enumViolations = [];
  if (!AC_IDS.includes(record.acId)) enumViolations.push(`acId:${record.acId}`);
  if (!PLATFORMS.includes(record.platform)) enumViolations.push(`platform:${record.platform}`);
  if (!LANES.includes(record.lane)) enumViolations.push(`lane:${record.lane}`);
  if (!(FRAMEWORKS[record.platform] ?? []).includes(record.framework)) enumViolations.push(`framework:${record.framework}`);
  if (!TEST_LAYERS.includes(record.testLayer)) enumViolations.push(`testLayer:${record.testLayer}`);
  if (!ENV_TYPES.includes(record.environment?.type)) enumViolations.push(`environment.type:${record.environment?.type}`);
  if (!DRIVERS.includes(record.driver?.name)) enumViolations.push(`driver.name:${record.driver?.name}`);
  if (!EVIDENCE_TYPES.includes(record.evidence?.type)) enumViolations.push(`evidence.type:${record.evidence?.type}`);
  if (!OUTCOMES.includes(record.outcome)) enumViolations.push(`outcome:${record.outcome}`);
  if (!INSTALL_MODES.includes(record.installation?.mode)) enumViolations.push(`installation.mode:${record.installation?.mode}`);
  if (!Array.isArray(record.actions) || record.actions.length === 0) enumViolations.push("actions:empty");
  if (record.identity?.synthetic !== true) enumViolations.push("identity.synthetic:false");

  // Framework support and the selected native lane describe one target.
  if (PLATFORMS.includes(record.platform) && LANES.includes(record.lane) && !(LANES_BY_PLATFORM[record.platform] ?? []).includes(record.lane)) {
    enumViolations.push(`lane-incompatible:${record.platform}/${record.lane}`);
  }
  if (LANES.includes(record.lane)) {
    if (ENV_TYPES.includes(record.environment?.type) && !(ENVIRONMENTS_BY_LANE[record.lane] ?? []).includes(record.environment.type)) {
      enumViolations.push(`lane-environment-incompatible:${record.lane}/${record.environment.type}`);
    }
    if (DRIVERS.includes(record.driver?.name) &&
      (!(DRIVERS_BY_LANE[record.lane] ?? []).includes(record.driver.name) ||
        !(DRIVERS_BY_PLATFORM[record.platform] ?? []).includes(record.driver.name))) {
      enumViolations.push(`lane-driver-incompatible:${record.lane}/${record.driver.name}`);
    }
    const artifactTarget = artifactTargetFromPath(record.appArtifact?.path);
    if (artifactTarget && artifactTarget !== record.lane) {
      enumViolations.push(`artifact-target-incompatible:${record.lane}/${artifactTarget}`);
    }
  }
  for (const violation of [
    contextViolation(record.lifecycle, "lifecycle", LIFECYCLE_STATES),
    contextViolation(record.network, "network", NETWORK_STATES),
    permissionsViolation(record.permissions),
    forbiddenEffectsViolation(record.forbiddenEffects)
  ]) {
    if (violation) enumViolations.push(violation);
  }

  if (missing.length || enumViolations.length) {
    return {
      recordValid: false,
      disposition: "REJECTED",
      faultClass: "INVALID_RECORD",
      nativeVerification: "NOT_ESTABLISHED",
      missingFields: [...missing, ...enumViolations],
      detail: `Record incomplete or outside C6 enums (${[...missing, ...enumViolations].join(", ")}).`
    };
  }

  const artifact = record.appArtifact;
  const digestPresent = ARTIFACT_DIGEST.test(artifact.digest);
  const digestUnavailable = artifact.digest === "NOT_AVAILABLE";
  if (!digestPresent && !digestUnavailable) {
    return {
      recordValid: false,
      disposition: "REJECTED",
      faultClass: "MISSING_APP_ARTIFACT_DIGEST",
      nativeVerification: "NOT_ESTABLISHED",
      detail: `Artifact digest must be a sha256 hex digest or NOT_AVAILABLE, received ${artifact.digest}.`
    };
  }

  if (record.testLayer === "device-e2e" && NON_NATIVE_EVIDENCE.includes(record.evidence.type)) {
    return {
      recordValid: false,
      disposition: "REJECTED",
      faultClass: "DISALLOWED_SIMULATED_DEVICE_CLAIM",
      nativeVerification: "NOT_ESTABLISHED",
      detail: `${record.evidence.type} evidence cannot support ${record.platform} device-e2e verification.`
    };
  }

  if (record.outcome === "PASS" && record.testLayer === "device-e2e") {
    if (digestUnavailable) {
      return {
        recordValid: false,
        disposition: "REJECTED",
        faultClass: "MISSING_APP_ARTIFACT_DIGEST",
        nativeVerification: "NOT_ESTABLISHED",
        detail: "A device-e2e PASS needs the installed artifact digest."
      };
    }
    if (!record.driver.version || record.driver.name === "manual") {
      return {
        recordValid: false,
        disposition: "REJECTED",
        faultClass: "MISSING_DEVICE_DRIVER_PROVENANCE",
        nativeVerification: "NOT_ESTABLISHED",
        detail: "A device-e2e PASS needs an identified driver with a version."
      };
    }
    if (!record.environment.osVersion || !record.environment.deviceModel) {
      return {
        recordValid: false,
        disposition: "REJECTED",
        faultClass: "MISSING_DEVICE_ENVIRONMENT_METADATA",
        nativeVerification: "NOT_ESTABLISHED",
        detail: "OS version and device model are mandatory for a device PASS."
      };
    }
  }

  if (record.acId === "AC-30" && record.outcome === "PASS") {
    if (artifact.buildType !== "release" || !record.release?.signing || !record.release?.distribution) {
      return {
        recordValid: false,
        disposition: "REJECTED",
        faultClass: "MISSING_RELEASE_PROVENANCE",
        nativeVerification: "NOT_ESTABLISHED",
        detail: "Release smoke PASS needs a release artifact, signing identity and distribution context."
      };
    }
  }

  const scenarioDisposition =
    record.outcome === "PASS" ? "DECLARED_PASS_PENDING_NATIVE_EXECUTION" : record.outcome;

  return {
    recordValid: true,
    disposition: "RECORD_VALID",
    faultClass: null,
    declaredOutcome: record.outcome,
    scenarioDisposition,
    nativeVerification: "NOT_ESTABLISHED",
    detail: `C6 record for ${record.acId} (${record.platform}/${record.framework}/${record.testLayer}) is well formed; native execution remains unproven by the record.`
  };
}

// ---------------------------------------------------------------------------
// 11. Per-AC mobile fault/control adjudication (AC-21..AC-30)
// ---------------------------------------------------------------------------
const MOBILE_RULES = {
  "AC-21": (r) => {
    if (r.claimsNativeDeviceProof && (r.testLayer !== "device-e2e" || NON_NATIVE_EVIDENCE.includes(r.evidenceType))) {
      return fail("DISALLOWED_SIMULATED_DEVICE_CLAIM", `${r.evidenceType} at layer ${r.testLayer} cannot prove native device verification.`);
    }
    if (!["accessibility-id", "test-id", "resource-id", "semantics-label"].includes(r.selector?.strategy)) {
      return fail("UNSTABLE_SELECTOR_STRATEGY", `Selector strategy ${r.selector?.strategy} is not a stable native selector strategy.`);
    }
    return ok();
  },
  "AC-22": (r) => {
    const relaunch = /kill|relaunch|terminat/i.test(r.transition ?? "");
    if (!r.claim) {
      return fail("MISSING_LIFECYCLE_CLAIM", "Lifecycle record must state whether resume or relaunch restoration is claimed.");
    }
    if (relaunch && r.claim === "resume_recovery") {
      return fail("RELAUNCH_EQUATED_WITH_RESUME", `Transition ${r.transition} was reported as foreground resume recovery.`);
    }
    if (r.claim === "relaunch_recovery" && !relaunch) {
      return fail("RELAUNCH_CLAIM_WITHOUT_RELAUNCH", "Relaunch recovery claimed without a termination/relaunch transition.");
    }
    if (!r.expected || typeof r.expected !== "object") {
      return fail("MISSING_RESTORATION_OBLIGATION", "No approved restoration expectation was recorded for this transition.");
    }
    if (r.claim === "resume_recovery") {
      if (r.expected.inputRestored !== true) {
        return fail("MISSING_RESTORATION_OBLIGATION", "Resume expectation must state that in-flight input is restored.");
      }
      if (r.observed?.sessionPreserved !== true || r.observed?.inputRestored !== r.expected.inputRestored) {
        return fail(
          "RESUME_STATE_NOT_RESTORED",
          `Observed ${JSON.stringify(r.observed)} does not meet the approved resume expectation ${JSON.stringify(r.expected)}.`
        );
      }
    }
    if (r.claim === "relaunch_recovery") {
      if (typeof r.expected.persistedStateRestored !== "boolean") {
        return fail("MISSING_RESTORATION_OBLIGATION", "Relaunch expectation must state the approved persisted-state restoration.");
      }
      if (r.observed?.sessionPreserved !== false) {
        return fail("RELAUNCH_MEMORY_SESSION_FALSELY_PRESERVED", "A cold relaunch claims the in-memory session survived.");
      }
      if (r.observed?.persistedStateRestored !== r.expected.persistedStateRestored) {
        return fail(
          "RELAUNCH_STATE_NOT_RESTORED",
          `Observed persistedStateRestored ${r.observed?.persistedStateRestored} does not meet the approved ${r.expected.persistedStateRestored}.`
        );
      }
    }
    return ok();
  },
  "AC-23": (r) => {
    const cells = r.cells ?? [];
    const missingPlatforms = PLATFORMS.filter((platform) => !cells.some((cell) => cell.platform === platform));
    if (missingPlatforms.length) {
      return fail("MISSING_PLATFORM_CELL", `Matrix omits ${missingPlatforms.join(", ")}; exclusions need an explicit cell and reason.`);
    }
    const invalidCell = cells.find((cell) => !["PASS", "BLOCKED", "NOT_RUN"].includes(cell.status));
    if (invalidCell) return fail("INVALID_MATRIX_CELL_STATUS", `Cell ${invalidCell.platform} has status ${invalidCell.status}.`);
    const reasonlessBlocked = cells.find((cell) => cell.status !== "PASS" && !cell.reason);
    if (reasonlessBlocked) return fail("MISSING_CELL_EXCLUSION_REASON", `Cell ${reasonlessBlocked.platform} has no gap/exclusion reason.`);
    const passingPlatforms = new Set(cells.filter((cell) => cell.status === "PASS").map((cell) => cell.platform));
    if (r.claim === "all_platforms_pass" && passingPlatforms.size < PLATFORMS.length) {
      return fail("FALSE_GENERALIZATION_ACROSS_PLATFORMS", `Claimed all-platform PASS from ${[...passingPlatforms].join(", ") || "no"} device result(s).`);
    }
    return ok();
  },
  "AC-24": (r) => {
    if (r.autoGranted === true || r.interruptionDismissed === true) {
      return fail("TEST_SUPPRESSED_INTERRUPTION_UNDER_TEST", "Permission/interruption under test was auto-granted or dismissed by the test harness.");
    }
    const permissions = Array.isArray(r.permissions) ? r.permissions : [];
    if (permissions.length === 0) {
      return fail("MISSING_PERMISSION_OBSERVATION", "No permission outcome was recorded.");
    }
    const applicability = r.requiredPaths;
    if (applicability && typeof applicability === "object" && !Array.isArray(applicability)) {
      if (applicability.notApplicable !== true || !applicability.reason?.trim()) {
        return fail("MISSING_APPLICABILITY_REASON", "A not-applicable permission set needs a written risk reason.");
      }
    } else {
      const required = Array.isArray(applicability) ? applicability : ["allow", "deny"];
      const decisions = new Set(permissions.map((entry) => entry.decision));
      const missingPaths = required.filter((decision) => !decisions.has(decision));
      if (missingPaths.length) {
        return fail("MISSING_PERMISSION_PATH", `Required permission decisions not exercised: ${missingPaths.join(", ")}.`);
      }
    }
    for (const permission of permissions) {
      if (!permission.expectedOutcome || !permission.appOutcome) {
        return fail("MISSING_PERMISSION_OBSERVATION", `Permission ${permission.name} lacks an approved or observed outcome.`);
      }
      if (permission.expectedOutcome !== permission.appOutcome) {
        return fail(
          "PERMISSION_OUTCOME_MISMATCH",
          `Permission ${permission.name} (${permission.decision}) observed ${permission.appOutcome}, approved ${permission.expectedOutcome}.`
        );
      }
    }
    return ok();
  },
  "AC-25": (r) => {
    if (r.duplicateCount > 0) {
      return fail("FORBIDDEN_DUPLICATE_SIDE_EFFECT", `Reconnect produced ${r.duplicateCount} duplicate effect(s).`);
    }
    if (r.conflictPolicySource !== "requirements") {
      return fail("INVENTED_CONFLICT_POLICY", `Conflict policy taken from ${r.conflictPolicySource}; requirements are the only source.`);
    }
    if (typeof r.offlineMutations !== "number" || typeof r.syncedMutations !== "number") {
      return fail("INCOMPLETE_SYNC_OBSERVATION", "Offline and synced mutation counts must be observed.");
    }
    if (!r.expected || typeof r.expected.syncedMutations !== "number") {
      return fail("MISSING_SYNC_OBLIGATION", "No approved synchronization result was recorded.");
    }
    if (r.syncedMutations !== r.expected.syncedMutations) {
      return fail(
        "SYNC_RESULT_MISMATCH",
        `Reconnect synchronized ${r.syncedMutations} mutation(s); the approved result is ${r.expected.syncedMutations}.`
      );
    }
    if (typeof r.expected.offlineMutations === "number" && r.offlineMutations !== r.expected.offlineMutations) {
      return fail(
        "SYNC_RESULT_MISMATCH",
        `Queued ${r.offlineMutations} offline mutation(s); the approved workload is ${r.expected.offlineMutations}.`
      );
    }
    return ok();
  },
  "AC-26": (r) => {
    if (r.installMode !== "reset" && r.installMode !== "noReset") {
      return fail("IMPLICIT_RESET_MODE", "Reset/noReset must be explicit so the test precondition cannot drift.");
    }
    if (r.installMode === "reset" && r.claimedUpgradeMigration === true) {
      return fail("SEMANTIC_INSTALL_RESET_VIOLATION", "Full reset was reported as an upgrade migration.");
    }
    if (r.claimedUpgradeMigration === true) {
      if (!r.priorBuild || !r.targetBuild) {
        return fail("MISSING_PRIOR_BUILD", "Upgrade migration claim without the supported prior and target builds.");
      }
      if (r.priorBuild === r.targetBuild) {
        return fail("UPGRADE_WITHOUT_BUILD_CHANGE", "Upgrade claim compares a build with itself.");
      }
      if (!r.binaryArtifacts?.prior || !r.binaryArtifacts?.target) {
        return fail("MISSING_BINARY_ARTIFACT_PROVENANCE", "Both installed binaries must be identified for an upgrade claim.");
      }
      if (r.binaryArtifacts.prior === r.binaryArtifacts.target) {
        return fail("NO_BINARY_UPGRADE_PROOF", "Identical binary identities prove reinstall, not upgrade.");
      }
      if (r.seededPriorData !== true) {
        return fail("MISSING_SEEDED_PRIOR_DATA", "Prior-build user data must be seeded before the upgrade.");
      }
      if (r.installationObserved !== true) {
        return fail("MISSING_INSTALLATION_OBSERVATION", "The install-over-install step must be observed.");
      }
      if (!r.migrationPrecondition?.trim()) {
        return fail("MISSING_MIGRATION_PRECONDITION", "The migration precondition must be recorded before asserting restored data.");
      }
      if (!r.expected || typeof r.expected.migratedUserDataPreserved !== "boolean") {
        return fail("MISSING_MIGRATION_OBLIGATION", "No approved migration result was recorded.");
      }
      if (r.observed?.migratedUserDataPreserved !== r.expected.migratedUserDataPreserved) {
        return fail(
          "MIGRATION_OUTCOME_MISMATCH",
          `Observed migratedUserDataPreserved ${r.observed?.migratedUserDataPreserved}; approved ${r.expected.migratedUserDataPreserved}.`
        );
      }
    }
    return ok();
  },
  "AC-27": (r) => {
    const proof = r.proof ?? [];
    const nativeProof = proof.filter((entry) => ["native-voiceover", "native-talkback", "native-focus-order", "manual-attestation"].includes(entry));
    if (nativeProof.length === 0) {
      return fail("WEB_AUDIT_SUBSTITUTED_FOR_NATIVE_ACCESSIBILITY", `Accessibility proof rests on ${proof.join(", ") || "nothing"}; native semantics, focus and manual checks are absent.`);
    }
    const missingAreas = ["voiceOver", "textScaling", "orientation", "keyboard", "safeArea"].filter((area) => !r[area]);
    if (missingAreas.length) {
      return fail("INCOMPLETE_ACCESSIBILITY_COVERAGE", `Missing accessibility areas: ${missingAreas.join(", ")}.`);
    }
    return ok();
  },
  "AC-28": (r) => {
    const missingMetrics = ["coldStartMs", "warmStartMs", "peakMemoryMb", "anrCount"].filter((field) => typeof r[field] !== "number");
    if (missingMetrics.length) {
      return fail("INCOMPLETE_PERFORMANCE_OBSERVATION", `Missing measured metrics: ${missingMetrics.join(", ")}.`);
    }
    if (r.claim === "physical_device_performance" && r.deviceClass !== "physical") {
      return fail("HOST_HARDWARE_CONFUSED_WITH_DEVICE_PERFORMANCE", `${r.deviceClass} measurements claimed as physical-device performance.`);
    }
    return ok();
  },
  "AC-29": (r) => {
    if (r.tokenInSystemLog === true || r.tokenInPlainPreferences === true || r.credentialsCollected === true) {
      return fail("SENSITIVE_CREDENTIAL_EXPOSURE", "Token material reached a system log, plaintext store, or the test collected real credentials.");
    }
    if (r.logoutInvalidatesSession !== true) {
      return fail("SESSION_NOT_INVALIDATED_ON_LOGOUT", "Logout did not invalidate the local session/vault.");
    }
    return ok();
  },
  "AC-30": (r) => {
    if (r.outcome === "PASS") {
      const missing = ["artifact.digest", "artifact.signing", "artifact.distribution", "device.model", "device.osVersion", "device.type"]
        .filter((field) => !readPath(r, field));
      if (missing.length) {
        return fail("FALSE_PASS_WITHOUT_RUNTIME", `Release smoke PASS missing ${missing.join(", ")}.`);
      }
    }
    return ok();
  }
};

function ok() {
  return { pass: true, faultClass: null, detail: "Record satisfies its AC invariants." };
}
function fail(faultClass, detail) {
  return { pass: false, faultClass, detail };
}

// Adjudicates one AC-specific scenario record (known-good control or seeded fault).
// Records describe synthetic examples; they never assert device execution.
export function evaluateMobileScenarioRecord(record) {
  const rule = MOBILE_RULES[record?.acId];
  if (!rule) {
    return { pass: false, acId: record?.acId ?? null, faultClass: "UNSUPPORTED_AC", detail: `No adjudication rule for ${record?.acId}.` };
  }
  const outcome = rule(record);
  return {
    pass: outcome.pass,
    acId: record.acId,
    faultClass: outcome.faultClass,
    detail: outcome.detail,
    evidenceClass: record.evidenceClass ?? "SYNTHETIC_EXAMPLE",
    nativeVerification: "NOT_ESTABLISHED",
    declaredOutcome: record.outcome ?? null
  };
}

// ---------------------------------------------------------------------------
// 12. STLC closure governance (AC-05)
// ---------------------------------------------------------------------------
export function evaluateTestCycleClosure(closureReport) {
  if (!closureReport || typeof closureReport !== "object") {
    return { valid: false, disposition: "INVALID", faultClass: "INVALID_REPORT", detail: "Closure report must be an object." };
  }
  const { technicalSuitePassed, claimedReleaseApproved, humanAuthorizerProvided, blockedCount = 0, openDefectsCount = 0, residualRiskLedgerPresent, reportedPassRate } = closureReport;

  if (technicalSuitePassed && claimedReleaseApproved && !humanAuthorizerProvided) {
    return {
      valid: false,
      disposition: "REJECTED",
      faultClass: "TECHNICAL_PASS_IMPERSONATED_RELEASE_AUTHORITY",
      detail: "Technical PASS cannot authorize release; named human signoff is required."
    };
  }
  if ((blockedCount > 0 || openDefectsCount > 0) && (reportedPassRate === 1 || reportedPassRate === "100%")) {
    return {
      valid: false,
      disposition: "REJECTED",
      faultClass: "SUPPRESSED_BLOCKED_TESTS_OR_DEFECTS",
      detail: "Closure reported a 100% pass rate while blocked tests or open defects remain."
    };
  }
  if ((blockedCount > 0 || openDefectsCount > 0) && !residualRiskLedgerPresent) {
    return {
      valid: false,
      disposition: "REJECTED",
      faultClass: "MISSING_RESIDUAL_RISK_LEDGER",
      detail: "Blocked tests and open defects require a residual-risk ledger with an owner."
    };
  }
  return {
    valid: true,
    disposition: "ACCEPTED",
    faultClass: null,
    detail: "Closure dispositions are honest and governance boundaries are observed."
  };
}
