# API Testing Methodology & Purpose Standards

## 1. Overview & Classification (C1 Contract)

API testing operates under the frozen lane `lane: api`. A single test scenario may satisfy multiple purposes, but each purpose imposes distinct obligations and verification oracles.

| Purpose | Primary Objective | Verification Oracle | Invalid Shortcut (Anti-Pattern) |
|---|---|---|---|
| **Smoke** | Verify runtime environment readiness & core business paths | Authenticated critical transaction succeeds | Treating `GET /health` 200 OK as business readiness |
| **Functional** | Validate business logic, math, state transitions, & errors | Computed values, status changes, & persisted records | Asserting status 200 and schema validity only |
| **Contract** | Guarantee syntax conformance, version compatibility, & CDC | Schema conformance + Baseline diff + Consumer Pact | Equating candidate OpenAPI syntax validation with backward compatibility |
| **Integration** | Validate multi-service workflows & failure compensations | Dual oracles: downstream ledger + local persistence | Firing network requests without checking resulting state or downstream effects |
| **Regression** | Ensure unchanged functionality remains intact after edits | Targeted affected suites + retained critical smoke baseline | Guessing zero impact or excluding tests without stated rationale |

---

## 2. Detailed Purpose Specifications

### 2.1 Smoke Testing (AC-06)
- **Principle**: Process liveness (`GET /health`) confirms process execution and socket binding, but does not prove downstream database connectivity, authentication subsystem readiness, message broker availability, or business rule execution.
- **Requirement**: Smoke suites must exercise at least one synthetic, non-destructive critical business operation:
  1. Authenticate with synthetic service credentials.
  2. Perform a read or preflight operation exercising core business logic (e.g., `POST /orders/preflight` or `GET /catalog/items/summary`).
  3. Validate database read/write roundtrip via a synthetic sandbox entity.
- **Failure Handling**: If `/health` returns `200 OK` but the critical preflight fails, the smoke suite MUST report **FAIL / NOT READY**.

### 2.2 Functional Testing & Business Invariants (AC-07)
- **Principle**: A response may be 100% compliant with its OpenAPI schema while delivering mathematically incorrect or corrupt business results.
- **Requirement**: Functional tests must validate:
  1. **Calculations & Totals**: Verify item sums, tax calculations, discounts, currency rounding, and balance deductions against the authorized specification.
  2. **Lifecycle Transitions**: Verify explicit entity state changes (e.g., `DRAFT` -> `SUBMITTED` -> `APPROVED`).
  3. **Data Persistence**: Confirm that the request resulted in the expected persisted state in the underlying datastore.
  4. **Error Contracts**: Verify that invalid business conditions return the specified business error code (e.g., HTTP 422 with `{ code: "INSUFFICIENT_STOCK", field: "items[0].quantity" }`) rather than generic 400 or 500 errors.
- **Failure Handling**: A schema-valid payload with an incorrect total or unpersisted state MUST be rejected as a **FAIL**.

### 2.3 Contract Verification: Schema Conformance, Compatibility & CDC (AC-08)
Contract verification encompasses three distinct, non-substitutable verification tiers:

1. **Tier 1 — Provider Schema Conformance**:
   - Validates candidate request and response payloads against the candidate OpenAPI 3.1 / JSON Schema definition.
   - Ensures correct data types, required properties, regex patterns, and status code declarations.
2. **Tier 2 — Baseline-to-Candidate Version Compatibility**:
   - Compares the candidate contract against the approved **baseline contract** (e.g., git tag `v1.0.0` or released schema artifact).
   - **Record versions and direction explicitly**: producer baseline version, producer candidate version, and the consumer build/version each check protects. Obligations follow the approved consumer/version policy, not the position of a payload as "request" or "response".
   - **Old-request acceptance (candidate provider must accept baseline-valid requests)**: every request accepted under the baseline contract MUST remain accepted. No default-based exemption: a newly required request property is a breaking change even when the schema declares a `default`; that keyword alone does not prove the provider accepts an omitted property. Treat such a change as compatible only after the approved provider's actual omission behavior is demonstrated to accept the request and apply the value.
   - **Old-consumer readability (candidate responses must stay readable by baseline consumers)**: no removed or renamed response properties, no altered types, no narrowed value sets, and no newly emitted enum/union values that an exhaustive baseline consumer cannot handle. Additive response properties are permitted only when the approved consumer policy tolerates unknown properties; do not assume tolerance.
   - Uses automated schema diffing tools (e.g., `oasdiff` or JSON Schema breaking-change analyzers) plus explicit enum/union value-set diffs; a type-level diff alone misses newly emitted values.
   - **Disposition Rule**: If an approved baseline schema artifact is missing or unavailable, the compatibility check MUST be marked **BLOCKED**, never inferred compatible.
3. **Tier 3 — Consumer-Driven Contract Testing (CDC / Pact)**:
   - Evaluates provider interactions against verified consumer contract files generated by downstream consumers.
   - Ensures that consumer-needed fields and workflows remain satisfied regardless of provider schema extensions.
   - **Disposition Rule**: When consumer contracts are required by architecture policy, missing pact files MUST be marked **BLOCKED**, not passed.

### 2.4 Integration Testing, Idempotency & Downstream Oracles (AC-09)
- **Dependency Modes & Scope**:
  - **Controlled Mocks / Stubs**: Used to simulate deterministic failure modes, network latency, and service crashes.
  - **Real Dependencies**: Authorized isolated staging/sandbox environments to test real network transport and third-party behavior.
  - **Limitation**: Verification against a simulated mock verifies correctness only against the *modeled contract*; it does NOT substitute for real external gateway verification, which requires explicitly authorized staging evidence.
- **Post-Effect Lost-Response Fault Model**:
  - Testing network retry loops must explicitly model **lost responses** (the external gateway receives the request, charges the account, but drops the network connection before the client receives the 200 OK).
  - Retry behavior: Client resends request with identical `Idempotency-Key` and business identifiers.
- **Dual-Oracle Verification**:
  1. **Independent Downstream Gateway Ledger Oracle**: Query the controlled mock gateway's external transaction journal directly to verify that exactly ONE charge was captured for that idempotency key.
  2. **Local Application State Oracle**: Query the local application database (`payment_transactions` and `orders`) to verify a single local transaction record and proper order status transition (`PAID`).
  - **Failure Handling**: If the local database shows 1 transaction but the downstream gateway journal shows 2 debits, the test MUST report **FAIL (Duplicate Downstream Effect)**.

### 2.5 Regression Suite Selection & Impact Analysis (AC-10)
- **Delta Analysis Protocol**:
  1. Inspect the code/schema delta (git diff, OpenAPI diff, database migration).
  2. Identify all affected API operations, shared models, utility functions, and database entities.
  3. Select test suites directly mapping to affected obligations.
  4. **Retain Baseline**: ALWAYS include the critical smoke suite in every regression run, regardless of delta scope.
  5. **Complete Inventory Accounting**: Explicitly record all selected suites and provide a complete accounting of excluded suites with rationale.
- **Handling Uncertainty**:
  - If a change touches core middleware (e.g., authentication filter, logging handler, global exception filter, or base entity), impact is indeterminate.
  - In indeterminate cases, the suite MUST be broadened to full API coverage, or an explicit blocker MUST be logged.
  - Never guess zero impact to reduce run times.

---

## 3. Shared Scenario Record Structure (C2, C3, C4 Contracts)

Every API scenario must record these standardized fields:

```yaml
scenario_id: string             # e.g., "API-ORD-01"
requirement_id: string          # e.g., "REQ-03"
acceptance_criteria: string     # e.g., "AC-06"
operation: string               # e.g., "Order Preflight Check"
purposes: [smoke | functional | contract | integration | regression]
target_authorization: string    # Explicit authorized target (e.g. "auth-isolated-sandbox"; never production)
source:
  revision: string              # git commit SHA or snapshot digest
driver:
  name: string                  # e.g., "@playwright/test" or "vitest"
  version: string               # Pinned version (e.g., "1.48.0")
reviewer: string                # Accountable reviewer role or handle
evidence_kind: "structural" | "router" | "transcript" | "executable_fixture" | "generated_candidate"
resource_limits:
  timeout_ms: number            # e.g., 5000
  max_payload_bytes: number     # e.g., 1048576
safety_gates:
  synthetic_data_only: true
  credential_redaction: true    # All secrets/PII redacted in stored artifacts
  no_unauthorized_downloads: true # No dynamic npx/package downloads
  no_paid_calls: true
endpoint:
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string                  # e.g., "/api/v1/orders/preflight"
principal:
  role: string                  # e.g., "synthetic_shopper"
  tenant_id: string             # e.g., "tenant-synthetic-01"
fixtures:
  setup_sketch: string          # Required fixture setup sketch
  reset_sketch: string          # Required fixture teardown/reset sketch
  consumer_prerequisites: string[] # Consumer project prerequisites needed
dependency_mode: "real" | "controlled_mock"
request:
  headers: Record<string, string>
  body: object | null
expected_outcome:
  status: number
  headers: Record<string, string>
  body_assertions: string[]     # Specific field or calculation checks
  observable_state:
    downstream_ledger_assertions: string[] # Downstream gateway or service journal checks
    persisted_records: string[] # Database rows or state checked
    forbidden_effects: string[] # Actions that MUST NOT occur
execution_evidence:
  disposition: "NOT RUN" | "BLOCKED" | "PASS" | "FAIL"
  command: null                 # Exact executed command line; null until real execution
  environment: null             # Executed target identity: base URL/profile, container image or host, OS/runtime, driver version in use; null until real execution
  missing_prerequisites: string[] # If NOT RUN or BLOCKED, detail missing environment/drivers
  observed_summary: null        # String only populated upon real execution
  artifact_path: null           # Path only populated upon real execution
```

---

## 4. Evidence & Execution Safety (C3 & C4 Contracts)

- **Execution Preconditions**:
  - No active API requests, tests, or probes may be run without explicit target authorization.
  - Active execution MUST target isolated sandboxes or local mock containers. Production systems and production credentials are strictly forbidden.
- **Tooling & Dependency Discipline**:
  - Automated package downloaders (such as unpinned `npx <package>`) are strictly prohibited.
  - All test runners and drivers must be pinned and pre-installed in the consumer project.
- **Artifact Credential Redaction**:
  - All retained test outputs, error responses, HTTP traces, request headers, and database snapshots MUST redact authorization tokens, passwords, cookies, and customer identifiers prior to persistence.
- **Reporting Integrity (F1 / F2)**:
  - Any scenario, adaptation sketch, or test template that has not been executed on a verified, authorized target MUST record `disposition: "NOT RUN"` or `disposition: "BLOCKED"`.
  - Stating hypothetical execution results as `PASS` or inventing fictional artifact paths is a direct violation of evidence standards.
- **Reproducibility Minimum for Executed Evidence**:
  - `execution_evidence.command` and `execution_evidence.environment` MUST hold the exact executed command and executed target identity before a record may claim `PASS` or `FAIL`. Driver version and an authorization label do not substitute for them.
  - Null or placeholder command/environment values block `PASS`. If nothing was executed, the record is `NOT RUN`; if a run did execute, keep its observed outcome, flag the provenance gap as a retention defect, and do not accept the record until the values are recovered.
- **Self-Cleaning Isolation (AC-09 repeatability)**:
  - Every scenario owns its fixture data and MUST restore the pre-scenario state on success, on failure, and on cancellation (e.g. `afterEach`/`finally`, not only the success path).
  - Reset is scoped to scenario-owned synthetic records only. Never truncate shared tables, unrelated tenants, or another scenario's data. Repeating a scenario with the same idempotency key MUST start from its intended precondition, not the previous run's leftovers.
  - Integration scenarios reset every artifact they create: inserted orders and their lifecycle state (e.g. `PENDING_PAYMENT`/`PAID` rows), local transaction rows, and simulated downstream gateway journal entries.
- **Failure Evidence Retention**:
  - On failure, capture sanitized evidence BEFORE teardown destroys state: redacted request/response, status and headers, relevant log excerpt, downstream journal entries, and the persisted rows/state that contradict the oracle.
  - Losing diagnostics does not undo execution. When the runner observed an assertion failure, keep `disposition: "FAIL"` with the sanitized runner evidence that survives (assertion message, exit status, captured summary) and state the missing-evidence limitation explicitly.
  - Record the retention/teardown failure as its own defect and block acceptance of that record until the required evidence is recaptured. Missing diagnostics never downgrade a known failure to `NOT RUN` and never upgrade an unknown result to `FAIL`.
  - If no reliable outcome survives, record the attempt as executed with the outcome unresolved: `disposition: "BLOCKED"` plus an explicit "executed; outcome/evidence unresolved" note, never `NOT RUN`.
  - Teardown failures are recorded separately; a failed cleanup does not convert a passing scenario into `PASS` and does not exempt the next run from a fresh precondition check.
