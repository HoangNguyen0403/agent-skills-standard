---
name: quality-engineering-api-testing
description: Specify and execute API correctness testing across smoke, functional, contract, integration, and regression selection. Use when writing API test suites, validating API schemas/contracts, asserting business state, or selecting regression tests.
metadata:
  triggers:
    files:
      - "tests/api/**/*.spec.ts"
      - "tests/api/**/*.test.ts"
      - "tests/contracts/**/*.spec.ts"
    keywords:
      - api testing
      - api correctness
      - api contract test
      - api integration test
      - api smoke test
      - api regression selection
---

# Quality Engineering: API Testing & Correctness

## **Priority: P1 (HIGH)**

## Scope & Purpose

Standardizes API correctness verification across five distinct purposes (lane: `api` per C1):
1. **Smoke**: Business readiness beyond shallow health endpoints.
2. **Functional**: Business rules, state changes, calculations, and error invariants.
3. **Contract**: Schema conformance and consumer-driven expectations.
4. **Integration**: Multi-service coordination, real vs mocked dependencies, retries, and idempotency.
5. **Regression Selection**: Evidence-based test selection with explicit baseline and uncertainty handling.

## Core Rules

1. **Smoke Readiness (AC-06)**: A 200 OK on `GET /health` proves process liveness, not business readiness. Smoke suites must exercise at least one end-to-end critical business operation (e.g., authenticated preflight, read core entity).
2. **Functional Oracles (AC-07)**: Schema-valid payloads with 200 OK do not prove correctness. Every functional test must assert on computed values, database state, business invariants, and specific error payloads.
3. **Contract Verification (AC-08)**: Do not equate OpenAPI schema validation with version compatibility or consumer contract testing. Schema checks prove candidate syntax conformance; baseline-to-candidate diffs prove what baseline clients and consumers still get. Record producer versions and the protected consumer version, then verify both directions: baseline-valid requests remain accepted (a schema `default` never exempts a newly required property unless the provider's actual omission behavior is demonstrated), and candidate responses stay readable by baseline consumers, including new enum/union values an exhaustive consumer rejects. Consumer-driven contracts (e.g., Pact) verify consumer-needed fields and semantics. Missing baseline or consumer artifacts are BLOCKED, never inferred compatible.
4. **Integration & Idempotency (AC-09)**: Firing network requests without verifying resulting persistence or side effects is invalid. When testing retries (including post-effect lost-response timeouts), verify final state and assert zero duplicate side effects across both local database records and an independent downstream gateway ledger oracle. Simulated mocks do not replace authorized real-dependency evidence.
5. **Regression Selection (AC-10)**: Map code/contract deltas to affected obligations. Always retain the critical smoke baseline. If delta impact is ambiguous, broaden coverage or log a blocker—never claim unverified completeness.

## Workflow

1. **Obligation Mapping**: Identify target endpoints, schemas, business invariants, and consumer dependencies.
2. **Scenario Authoring**: Record scenarios using the shared C2 API scenario record (purpose, method/path, principal, inputs/reset, dependency mode, expected state, forbidden effects).
3. **Execution & Isolation**: Execute against isolated synthetic data. Clean up scenario-owned fixtures on success, failure and cancellation; on failure, capture sanitized evidence before teardown destroys state. Reset only what the scenario created, including inserted entities, their lifecycle state and simulated downstream journals.
4. **Evidence & Provenance Capture (C3/C4)**: Record source revision/digest, exact executed command, executed environment/target identity, pinned driver version, reviewer, evidence category, and target authorization. Enforce strictly synthetic data, mandatory secret redaction, and no unauthorized package downloads or paid calls. Evidence acceptance requires populated command and environment; missing values block PASS and acceptance. If execution occurred, retain a known outcome (including FAIL), record the provenance gap as a separate retention defect, and block acceptance until values are recovered. Use NOT RUN only when nothing was executed; use BLOCKED for an executed run only when its outcome is genuinely unresolved, with an explicit note. Never fabricate observations or artifacts.

## Anti-Patterns

- **Health check as smoke**: Treating `GET /health` 200 as deployment or business pass.
- **Schema validation as functional proof**: Skipping business calculation or persistence assertions because the schema parsed.
- **Conflating schema with compatibility or consumer contract**: Breaking backward compatibility or consumer expectations while passing standalone OpenAPI syntax checks.
- **Default-as-compatibility**: Treating a schema `default` on a newly required request property, or an unhandled new response enum value, as non-breaking without evidence of the approved provider/consumer behavior.
- **Blind call-firing**: Firing requests while omitting verification of database state, compensations, or duplicate effects on retry.
- **Cleanup only on success**: Skipping teardown after failure or cancellation, or resetting only part of the scenario's state so the next run starts from stale rows or gateway entries.
- **Evidence-destroying teardown**: Destroying the failing state before capturing sanitized request/response/log/ledger evidence. The observed `FAIL` still stands with an explicit missing-evidence limitation; record the retention failure separately and block acceptance until evidence is recaptured. Never reclassify an executed failure as `NOT RUN`.
- **False regression completeness**: Silently excluding tests or claiming complete regression coverage without impact analysis.
- **Invented execution evidence**: Recording unexecuted test templates or adaptation sketches as PASS instead of NOT RUN or BLOCKED.

## References

- [API Testing Methodology & Purpose Standards](references/api-testing-methodology.md) — Detailed standards for smoke, functional, contract, integration, and regression selection.
- [Synthetic Order Example & Scenario Records](references/synthetic-order-example.md) — Coherent end-to-end order fixture covering all five purposes with C2 scenario templates.
