# Synthetic Order Example & Scenario Records

> **Specification & Adaptation Notice**: The scenarios below are **specification templates, contract definitions, and adaptation sketches** for consuming projects. They are **NOT** executed runtime logs. All tests are marked `disposition: "NOT RUN"` pending integration in an authorized consumer environment with installed test runners, pinned drivers, schemas, and test doubles.
>
> **Fixture-Specific Business Rules**: All discount percentages, tax rates, status transitions, and error codes used below are specific to this synthetic order example, not universal product policy.

---

## 1. Domain Specification (Synthetic Order Fixture)

- **Base URL**: `/api/v1/orders`
- **Fixture-Specific Rules**:
  - `Subtotal` = $\sum (\text{item.quantity} \times \text{item.unit\_price})$
  - `Discount`: If subtotal > $100.00, apply 10% discount to items.
  - `Tax`: 8.00% applied to discounted subtotal.
  - `Total` = $(\text{Subtotal} - \text{Discount}) + \text{Tax}$ (rounded half-up to 2 decimals).
  - `Idempotency`: Mutating payment requests require `Idempotency-Key` header. Duplicate attempts must return the original transaction receipt without reprocessing.

---

## 2. Standardized Scenario Records (C2, C3, C4 Contracts)

### 2.1 Smoke Scenario: Business Readiness vs Health Probe (AC-06)

```yaml
scenario_id: "SMOKE-ORD-01"
requirement_id: "REQ-03"
acceptance_criteria: "AC-06"
operation: "Checkout Preflight Validation"
purposes: ["smoke"]
target_authorization: "authorized-staging-sandbox"
source:
  revision: "git-commit-placeholder"
driver:
  name: "@playwright/test"
  version: "1.48.0"
reviewer: "qa-reviewer"
evidence_kind: "executable_fixture"
resource_limits:
  timeout_ms: 5000
  max_payload_bytes: 1048576
safety_gates:
  synthetic_data_only: true
  credential_redaction: true
  no_unauthorized_downloads: true
  no_paid_calls: true
endpoint:
  method: "POST"
  path: "/api/v1/orders/preflight"
principal:
  role: "synthetic_shopper"
  tenant_id: "tenant-synth-alpha"
fixtures:
  setup_sketch: "Insert catalog SKU 'SKU-SYNTH-01' with stock=10 in sandbox database"
  reset_sketch: "Delete the reservation holds and session rows this scenario created for SKU-SYNTH-01 in tenant 'tenant-synth-alpha'; runs on success, failure, and cancellation"
  consumer_prerequisites:
    - "Installed and pinned @playwright/test in consumer project"
    - "Running sandbox API server at configured target endpoint"
    - "Accessible sandbox database with seeding/reset credentials"
dependency_mode: "real"
request:
  headers:
    Authorization: "Bearer [REDACTED_SYNTHETIC_TOKEN]"
    Content-Type: "application/json"
  body:
    items:
      - sku: "SKU-SYNTH-01"
        quantity: 1
expected_outcome:
  status: 200
  headers:
    Content-Type: "application/json"
  body_assertions:
    - "body.status == 'READY_FOR_CHECKOUT'"
    - "body.inventory_reserved == true"
  observable_state:
    downstream_ledger_assertions: []
    persisted_records:
      - "Database check: session_reservations table has exactly 1 active hold for SKU-SYNTH-01"
    forbidden_effects:
      - "NO unauthenticated guest session creation permitted"
      - "Smoke FAILS if GET /health is 200 OK but preflight returns 503 or DB error"
execution_evidence:
  disposition: "NOT RUN"
  command: null
  environment: null
  missing_prerequisites:
    - "Consumer test harness, running target sandbox instance, and database seed fixtures"
  observed_summary: null
  artifact_path: null
```

---

### 2.2 Functional Scenario: Business Math Oracle vs Schema Validity (AC-07)

```yaml
scenario_id: "FUNC-ORD-02"
requirement_id: "REQ-03"
acceptance_criteria: "AC-07"
operation: "Create Order with Tiered Discount"
purposes: ["functional"]
target_authorization: "authorized-local-container"
source:
  revision: "git-commit-placeholder"
driver:
  name: "vitest"
  version: "2.1.3"
reviewer: "qa-reviewer"
evidence_kind: "executable_fixture"
resource_limits:
  timeout_ms: 5000
  max_payload_bytes: 1048576
safety_gates:
  synthetic_data_only: true
  credential_redaction: true
  no_unauthorized_downloads: true
  no_paid_calls: true
endpoint:
  method: "POST"
  path: "/api/v1/orders"
principal:
  role: "synthetic_shopper"
  tenant_id: "tenant-synth-alpha"
fixtures:
  setup_sketch: "Seed catalog item SKU-SYNTH-PRO at price 120.00 and stock 5"
  reset_sketch: "Delete the orders and line_items rows this scenario created in tenant 'tenant-synth-alpha', identified by the returned order id; runs on success, failure, and cancellation"
  consumer_prerequisites:
    - "Installed and pinned vitest in consumer project"
    - "Local containerized test database"
dependency_mode: "controlled_mock"
request:
  headers:
    Authorization: "Bearer [REDACTED_SYNTHETIC_TOKEN]"
    Content-Type: "application/json"
  body:
    items:
      - sku: "SKU-SYNTH-PRO"
        quantity: 1
expected_outcome:
  status: 201
  headers:
    Content-Type: "application/json"
    Location: "/api/v1/orders/ord-synth-9901"
  body_assertions:
    - "body.subtotal == 120.00"
    - "body.discount == 12.00"   # 10% discount on $120.00
    - "body.tax == 8.64"         # 8% tax on ($120 - $12 = $108)
    - "body.total == 116.64"     # Must equal exactly 116.64
    - "body.status == 'PENDING_PAYMENT'"
  observable_state:
    downstream_ledger_assertions: []
    persisted_records:
      - "Database query: orders row for ord-synth-9901 shows total=116.64, discount=12.00, status='PENDING_PAYMENT'"
    forbidden_effects:
      - "FORBIDDEN: Schema-valid payload returning undiscounted total ($129.60) MUST FAIL"
      - "FORBIDDEN: Missing tax or incorrect rounding MUST FAIL"
execution_evidence:
  disposition: "NOT RUN"
  command: null
  environment: null
  missing_prerequisites:
    - "Consumer project vitest test suite, isolated database container, and data seeding scripts"
  observed_summary: null
  artifact_path: null
```

---

### 2.3 Contract Scenario: Schema Conformance, Compatibility & CDC (AC-08)

```yaml
scenario_id: "CONTRACT-ORD-03"
requirement_id: "REQ-03"
acceptance_criteria: "AC-08"
operation: "Order Details Retrieval Contract & Compatibility"
purposes: ["contract"]
target_authorization: "authorized-ci-contract-lane"
source:
  revision: "git-commit-placeholder"
driver:
  name: "@pact-foundation/pact"
  version: "13.1.4"
reviewer: "qa-reviewer"
evidence_kind: "executable_fixture"
resource_limits:
  timeout_ms: 10000
  max_payload_bytes: 1048576
safety_gates:
  synthetic_data_only: true
  credential_redaction: true
  no_unauthorized_downloads: true # Pre-installed pact binaries; no dynamic npx download
  no_paid_calls: true
endpoint:
  method: "GET"
  path: "/api/v1/orders/ord-synth-9901"
principal:
  role: "authenticated_consumer"
  tenant_id: "tenant-synth-alpha"
fixtures:
  setup_sketch: "Insert test order ord-synth-9901 with total=116.64, status='PENDING_PAYMENT'"
  reset_sketch: "Delete test order ord-synth-9901"
  consumer_prerequisites:
    - "Installed and pinned @pact-foundation/pact and schema diff tool (e.g. oasdiff)"
    - "Approved baseline OpenAPI schema (schemas/orders-v1.0.0.yaml)"
    - "Candidate OpenAPI schema (schemas/orders-v1.1.0.yaml)"
    - "Consumer pact files in pacts/checkout-frontend.json"
dependency_mode: "real"
request:
  headers:
    Authorization: "Bearer [REDACTED_CONSUMER_TOKEN]"
    Accept: "application/json"
  body: null
expected_outcome:
  status: 200
  headers:
    Content-Type: "application/json"
  contract_checks:
    tier1_provider_schema_conformance:
      oracle: "Candidate response validates 100% against candidate schema 'schemas/orders-v1.1.0.yaml'"
    tier2_baseline_compatibility:
      baseline_schema: "schemas/orders-v1.0.0.yaml"
      candidate_schema: "schemas/orders-v1.1.0.yaml"
      versions_and_direction: "Candidate provider v1.1.0 serves consumers built against v1.0.0"
      old_request_acceptance_oracle: "Every request valid under v1.0.0 remains accepted by v1.1.0. A newly required request property is BREAKING even when the schema declares a default; only demonstrated, approved provider omission behavior preserves acceptance."
      old_consumer_response_oracle: "v1.1.0 responses remain readable by v1.0.0 consumers: no removed or renamed properties, no altered types, no narrowed value sets, and no newly emitted enum/union value (e.g. a new order 'status') that an exhaustive baseline consumer rejects. Additive properties only if the approved consumer policy tolerates unknown fields."
      failure_rule: "Renaming 'order_id' to 'id', requiring a new request property without demonstrated omission acceptance, or emitting an unhandled new enum value triggers BREAKING_CHANGE_VIOLATION"
    tier3_consumer_driven_contract:
      pact_file: "pacts/checkout-frontend.json"
      consumer: "checkout-frontend"
      oracle: "Pact verifier confirms provider fulfills mandatory fields { order_id: string, total_amount: number }"
  observable_state:
    downstream_ledger_assertions: []
    persisted_records: []
    forbidden_effects:
      - "FORBIDDEN: Inferring compatibility when baseline schema or consumer pacts are missing (check must be BLOCKED)"
execution_evidence:
  disposition: "NOT RUN"
  command: null
  environment: null
  missing_prerequisites:
    - "Approved baseline OpenAPI artifact, candidate OpenAPI artifact, and consumer pact JSON files"
  observed_summary: null
  artifact_path: null
```

---

### 2.4 Integration Scenario: Post-Effect Lost-Response Retry & Dual Oracles (AC-09)

```yaml
scenario_id: "INT-ORD-04"
requirement_id: "REQ-03"
acceptance_criteria: "AC-09"
operation: "Order Payment with Post-Effect Lost-Response Timeout"
purposes: ["integration"]
target_authorization: "authorized-local-container"
source:
  revision: "git-commit-placeholder"
driver:
  name: "vitest"
  version: "2.1.3"
reviewer: "qa-reviewer"
evidence_kind: "executable_fixture"
resource_limits:
  timeout_ms: 15000
  max_payload_bytes: 1048576
safety_gates:
  synthetic_data_only: true
  credential_redaction: true
  no_unauthorized_downloads: true
  no_paid_calls: true
endpoint:
  method: "POST"
  path: "/api/v1/orders/ord-synth-9901/pay"
principal:
  role: "synthetic_shopper"
  tenant_id: "tenant-synth-alpha"
fixtures:
  setup_sketch: |
    1. Insert order 'ord-synth-9901' with total=116.64, status='PENDING_PAYMENT'.
    2. Configure mock payment gateway to inject a post-effect fault:
       - On first call with idempotency key: process charge of $116.64, commit to gateway journal, then drop socket before returning response.
       - On retry call with same idempotency key: recognize key, return original success receipt without re-charging.
  reset_sketch: |
    1. Delete the inserted order 'ord-synth-9901' and its local payment_transactions rows, leaving no
       PENDING_PAYMENT or PAID residue for the next run.
    2. Clear every simulated gateway journal entry written under idempotency key 'idemp-ord-9901-attempt-1'.
    3. Run on success, failure, and cancellation; capture sanitized failure evidence before this teardown,
       and scope deletion to this scenario's synthetic records only.
  consumer_prerequisites:
    - "Installed and pinned vitest and controlled mock gateway service with journal API"
    - "Application configured with retry mechanism using Idempotency-Key"
dependency_mode: "controlled_mock"
request:
  headers:
    Authorization: "Bearer [REDACTED_SYNTHETIC_TOKEN]"
    Content-Type: "application/json"
    Idempotency-Key: "idemp-ord-9901-attempt-1"
  body:
    payment_method: "synthetic_card_visa"
    amount: 116.64
expected_outcome:
  status: 200
  headers:
    Content-Type: "application/json"
  body_assertions:
    - "body.order_status == 'PAID'"
    - "body.transaction_id == 'txn-synth-1004'"
  observable_state:
    downstream_ledger_assertions:
      - "Query mock gateway journal: count(charges where idempotency_key='idemp-ord-9901-attempt-1') == 1"
      - "Query mock gateway journal: total amount debited == 116.64 (NOT 233.28)"
    persisted_records:
      - "Database check: count(payment_transactions where order_id='ord-synth-9901') == 1"
      - "Database check: orders row shows status='PAID'"
    forbidden_effects:
      - "FORBIDDEN: Duplicate charge in external gateway ledger (count MUST NOT be 2)"
      - "FORBIDDEN: Inconsistent local state (order cannot remain PENDING_PAYMENT if gateway captured funds)"
      - "LIMITATION: Simulated mock verifies contract compliance under modeled fault; real gateway behavior requires authorized staging evidence"
execution_evidence:
  disposition: "NOT RUN"
  command: null
  environment: null
  missing_prerequisites:
    - "Controlled mock gateway with journal inspection API and application retry client"
  observed_summary: null
  artifact_path: null
```

---

### 2.5 Regression Selection Record: Delta Impact & Complete Accounting (AC-10)

```yaml
change_context:
  pr_id: "PR-402"
  title: "Update tiered discount threshold logic in PricingEngine"
  changed_files:
    - "src/pricing/pricing.service.ts"
    - "src/orders/orders.service.ts"
affected_obligations:
  - "Discount calculation above $100.00"
  - "Order total calculation and rounding"
  - "Order persistence with discounts"
selected_test_suites:
  - suite: "tests/api/smoke/preflight.spec.ts"
    purpose: "smoke"
    reason: "Mandatory baseline smoke retention (always run regardless of delta)."
  - suite: "tests/api/functional/order-math.spec.ts"
    purpose: "functional"
    reason: "Directly covers PricingEngine calculation formulas and totals."
  - suite: "tests/api/functional/discounts.spec.ts"
    purpose: "functional"
    reason: "Directly covers tiered discount boundary conditions."
  - suite: "tests/contracts/orders-schema.spec.ts"
    purpose: "contract"
    reason: "Verifies response envelope compatibility after pricing changes."
  - suite: "tests/api/functional/tax-calculation.spec.ts"
    purpose: "functional"
    reason: "Included per uncertainty resolution: tax engine relies on intermediate totals."
excluded_suites_complete_accounting:
  total_excluded_count: 22
  functional_area_breakdown:
    - area: "Catalog Browsing & Search (4 suites)"
      suites:
        - "tests/api/catalog/search.spec.ts"
        - "tests/api/catalog/categories.spec.ts"
        - "tests/api/catalog/filters.spec.ts"
        - "tests/api/catalog/recommendations.spec.ts"
      exclusion_rationale: "Catalog read-only endpoints do not execute pricing engine or discount calculation logic."
    - area: "User Profile & Authentication (5 suites)"
      suites:
        - "tests/api/auth/login.spec.ts"
        - "tests/api/auth/token-refresh.spec.ts"
        - "tests/api/users/profile.spec.ts"
        - "tests/api/users/addresses.spec.ts"
        - "tests/api/users/preferences.spec.ts"
      exclusion_rationale: "Identity and profile services are decoupled from checkout pricing algorithms."
    - area: "Shipping & Fulfillment (4 suites)"
      suites:
        - "tests/api/shipping/rates.spec.ts"
        - "tests/api/shipping/labels.spec.ts"
        - "tests/api/shipping/tracking.spec.ts"
        - "tests/api/fulfillment/pick-pack.spec.ts"
      exclusion_rationale: "Shipping rate tables and post-order fulfillment workflows are independent of item discount thresholds."
    - area: "Customer Reviews & Ratings (3 suites)"
      suites:
        - "tests/api/reviews/submit.spec.ts"
        - "tests/api/reviews/list.spec.ts"
        - "tests/api/reviews/moderation.spec.ts"
      exclusion_rationale: "Reviews subsystem has zero data or code coupling with checkout order totals."
    - area: "Notifications & Webhooks (3 suites)"
      suites:
        - "tests/api/notifications/email-dispatch.spec.ts"
        - "tests/api/notifications/sms.spec.ts"
        - "tests/api/webhooks/consumer-events.spec.ts"
      exclusion_rationale: "Notification formatting triggers after order completion; event payloads unchanged."
    - area: "Analytics & Reporting (3 suites)"
      suites:
        - "tests/api/analytics/sales-summary.spec.ts"
        - "tests/api/analytics/daily-aggregate.spec.ts"
        - "tests/api/analytics/export-csv.spec.ts"
      exclusion_rationale: "Batch reporting queries finalized historical orders; decoupled from live PricingEngine."
uncertainty_resolution:
  risk: "Pricing changes may alter tax calculations if tax engine relies on intermediate discounted totals."
  decision: "Broadened selection to include tests/api/functional/tax-calculation.spec.ts rather than assuming zero side effects."
execution_evidence:
  disposition: "NOT RUN"
  command: null
  environment: null
  missing_prerequisites:
    - "Automated regression runner pipeline and target test environment"
  total_selected: 5
  total_excluded: 22
```
