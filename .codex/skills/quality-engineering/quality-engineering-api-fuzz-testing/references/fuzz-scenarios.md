# API Fuzz and Security Test Scenarios

Scenario specifications conforming to Shared Contract C2 (API Scenario Record), C3 (Evidence Record), and C4 (Execution Safety).

**Nothing in this file is an observation.** Every scenario is an authored specification. No scenario has executed in any environment, so dispositions are `SPECIFIED`, `NOT RUN` or `BLOCKED`; this file never states `PASS`.

## Synthetic Fixture & Adaptation Contract (applies to every scenario)

- **Invented interfaces.** The base URL/host, paths (`/api/v1/...`, `/test/seed-*`, `/test/reset-*`), synthetic bearer tokens, personas/roles/tenants, fixture IDs (`user-001`, `inv-101`, `ord-101`), schema helpers (`OrderSuccessSchema`, `toMatchSchema`), test file paths and Jest invocations below are *proposed fixture interfaces*. They were not probed, are not verified endpoints or drivers, and are not approved application policy. Implement or adapt them in the authorized harness before execution, then correct this record where the real contract differs.
- **Driver reuse, no downloads.** Commands must run on a runner already installed in the consuming project (`package.json`/lockfile, `npx --no-install`, or the project's own script). An implicit package fetch is prohibited; if the runner is absent the scenario is `BLOCKED (driver missing)`.
- **Policy from the approved contract.** Role names, allowed statuses, concealment policy (403 vs intentional 404) and success/error codes are placeholders. Where no approved authorization or error contract exists, record the expectation as `unresolved` rather than asserting these values.
- **Fixture contract precedes execution.** Fixture seeding, reset semantics and write permissions must be defined before a run. A scenario that cannot establish them is `BLOCKED`; it is never adapted mid-run to obtain a pass.

## C2 record: complete or justify N/A

Each executed record carries: requirement/AC; purpose(s) + `lane: api`; operation; method/path; principal/role/tenant; inputs + generator bounds; fixture seed/reset; dependency mode; expected status/body/headers; observable state + forbidden effects; execution command; environment; resource limits; evidence; disposition. Absent fields are written `N/A — <reason>`; a blank or silent omission is a record defect.

## C3 evidence capture template (fill at execution only)

```text
Source revision : <git rev-parse HEAD or artifact digest>
Command         : <exact command>
Environment     : <OS, runtime, driver + version, target instance>
Scenario / AC   : <ID> / <AC>
Observed result : <status + assertion outcome>
Artifact        : <path to log/report>
Limits          : <duration, requests, concurrency, bytes incl. shrink replays>
Reviewer        : <identity>
```

The `Source revision` values in the dispositions below read `NOT CAPTURED` because no execution occurred; a repository snapshot name is not a digest.

---

## Scenario FUZZ-01: Boundary & Type-Confusion Payload Fuzzing (AC-14)

- **ID**: `FUZZ-01`
- **Requirement / AC**: REQ-05 / AC-14
- **Operation**: `POST /api/v1/orders`
- **Purposes**: `fuzz` (`lane: api`)
- **Method & Path**: `POST /api/v1/orders`
- **Principal & Tenant**: Synthetic customer (`user_id: user-001`, `tenant_id: tenant-alpha`, role: `ROLE_CUSTOMER`)
- **Inputs & Generator**:
  - Generator: Schema property mutation engine (`fast-check` / `hypothesis`) with finite serialized payload ceiling: max 64KB per request, max array length 20, max depth 5.
  - Permutations: Boundary quantities (`0`, `1`, `MAX_INT`), type confusion (string in integer field, object in scalar field), missing non-nullable properties, null injection, oversized notes string (bounded to 10KB).
- **Fixture & Reset Procedure**:
  - Pre-test: Seed inventory item `productId: p1` with stock 100 via `POST /test/seed-inventory` (proposed fixture endpoint).
  - **Per-evaluation reset**: Re-seed inventory to stock 100 and clear created orders *inside each property evaluation, before the request*, and again before every shrink replay. `afterEach`/`afterAll` run once per test file and are insufficient: 500 generated requests plus shrink replay would exhaust stock 100 and contaminate later status decisions, oracles and shrink results.
  - **State-aware generation**: Quantity is bounded by the stock remaining for that evaluation (`quantity ≤ availableStock`), so a valid-case expectation is never derived from an exhausted fixture; oversize-quantity cases stay in the invalid-case branch by construction.
  - Cleanup: `POST /test/reset-orders` after the run, plus `N/A — no persistent state outside the isolated container` for anything else.
- **Dependency Mode**: Mocked payment gateway double; local isolated PostgreSQL container.
- **Expected Outcome (from the fixture/operation contract; confirm against the approved contract before execution)**:
  - *Contract-Valid Boundary Cases* (e.g. `quantity: 1`): Status `201 Created`; response matches `OrderSuccessSchema`; inventory decremented by 1.
  - *Invalid / Malformed Cases* (e.g. `quantity: -1` or `"quantity": "NaN"`): Status `400 Bad Request` or `422 Unprocessable Entity`; response matches `OrderErrorSchema`.
  - *Oracle 1 (Crash Resilience)*: 0 unhandled 5xx errors across all iterations.
  - *Oracle 2 (Contract Conformance)*: Responses strictly conform to declared JSON schema; zero unformatted HTML or stack trace leaks.
  - *Observable State & Forbidden Effects*: No orphan order records or phantom reservations created on rejected requests.
- **Resource Limits & Containment**:
  - Client containment deadline: 1000ms request timeout with active `AbortController.abort()` and socket drain — a client safety bound (own-execution), not a product latency verdict.
  - Product latency SLO: taken **only** from the approved operation contract; this document defines no default. If the operation has no approved SLO, record `SLO: unresolved` and do not gate PASS on latency.
  - Concurrency ceiling: 5 concurrent workers; max runs: 500 discovery requests, with fixture resets and shrink replays counted inside that same request budget.
- **Deterministic Seed & Replay Command**:
  - Configured Seed: `FUZZ_SEED=1729938101`
  - Replay Command: `FUZZ_SEED=1729938101 npx --no-install jest test/fuzz/orders.fuzz.spec.ts --runInBand` (runner must already be installed; absent runner ⇒ `BLOCKED (driver missing)`)
- **Hypothetical Minimization & Regression Template**:
  - *[Template Example - Hypothetical Minimized Failure (not an executed artifact)]*:
    - Minimized Input: `{"items": [{"productId": "p1", "quantity": 0}]}`
    - Root Cause Identified: Zero quantity bypassed DTO class-validator positive integer constraint.
    - Promoted Regression Target: `test/regression/orders-zero-quantity.spec.ts`
    - Replay Reproduction Command: `npx --no-install jest test/regression/orders-zero-quantity.spec.ts`
- **Evidence & Disposition**:
  - Source revision: `NOT CAPTURED` (no execution; fill the C3 template at run time)
  - Command / Environment: `NOT RUN` / `N/A — no authorized harness identified`
  - Execution Status: `NOT RUN` (specification authored only)
  - Disposition: `SPECIFIED`

---

## Scenario SEC-01: Multi-Faceted Dynamic Real-Guard Authorization & Isolation (AC-13)

- **ID**: `SEC-01`
- **Requirement / AC**: REQ-05 / AC-13
- **Operation**: `GET /api/v1/tenants/:tenantId/invoices/:id` and `PATCH /api/v1/orders/:id`
- **Purposes**: `security` (`lane: api`)
- **Policy Chain**: Real guard chain loaded in test module: `JwtAuthGuard` -> `RolesGuard` -> `TenantIsolationGuard`.
  - *Strict Rule*: Guard bypass via `.overrideGuard().useValue({ canActivate: () => true })` is strictly prohibited for this scenario.
- **Fixture & Reset Procedure**:
  - Seed synthetic Tenant Alpha: `user-alpha` (role: `ORDER_MANAGER`), `viewer-alpha` (role: `GUEST_VIEWER`), invoice `inv-101` with status `ISSUED`, and order `ord-101` owned by `tenant-alpha` with status `DRAFT` (the PATCH target in Negative Case D; without this seed the write assertion has no subject).
  - Seed synthetic Tenant Beta: `user-beta` (role: `ORDER_MANAGER`) and invoice `inv-999`.
  - **Write-policy precondition (unresolved until confirmed)**: this record assumes the fixture policy grants invoice `void` only to `ORDER_MANAGER` and permits `PATCH /orders/:id` status changes by the owning tenant while stripping/rejecting `role` and `tenantId`. Source that policy from the approved authorization contract; if it differs, adapt Negative Cases B/D expectations and record the policy source. If no such contract exists, mark those two cases `unresolved`, not `PASS`.
  - Reset: restore the fixture (database transaction rollback or `POST /test/reset-tenants`) **before each case**, so Negative Case B still observes `inv-101` as `ISSUED` and Negative Case D still observes `ord-101` as an existing owned order.
- **Dependency Mode**: Fully local authenticated test context; real in-memory authorization policies.
- **Test Matrix & Expected Outcomes**:
  1. *Positive Authorized Control*:
     - Request: `GET /api/v1/tenants/tenant-alpha/invoices/inv-101` with `user-alpha` token (`ORDER_MANAGER`).
     - Expected Status: `200 OK`.
     - Invariant: Returns full invoice payload for `inv-101`; tenant ownership matches `tenant-alpha`.
  2. *Negative Case A (Missing / Expired Authentication)*:
     - Request: `GET /api/v1/tenants/tenant-alpha/invoices/inv-101` with no token or expired synthetic JWT.
     - Expected Status: `401 Unauthorized`.
     - Invariant: Zero invoice data leaked; no database read executed past guard.
  3. *Negative Case B (Same-Tenant Insufficient Role)*:
     - Request: `POST /api/v1/tenants/tenant-alpha/invoices/inv-101/void` with `viewer-alpha` token (`GUEST_VIEWER`).
     - Expected Status: `403 Forbidden`.
     - Invariant: Void operation rejected; invoice status remains `ISSUED`.
  4. *Negative Case C (Cross-Tenant Access / BOLA)*:
     - Request: `GET /api/v1/tenants/tenant-beta/invoices/inv-999` with `user-alpha` token (`tenant-alpha`).
     - Expected Status: `403 Forbidden` or intentional `404 Not Found` (per approved contract concealment policy).
     - Invariant: Zero leakage of `tenant-beta` metadata, amounts, or line items; DB state unmodified.
  5. *Negative Case D (Protected-Field Mutation / Mass-Assignment)*:
     - Request: `PATCH /api/v1/orders/ord-101` with body `{"status": "CONFIRMED", "role": "ADMIN", "tenantId": "tenant-beta"}` as `user-alpha`.
     - Expected Status: `200 OK` (with protected fields stripped) or `400 Bad Request` (strict DTO whitelist rejection).
     - Observable State Oracle: Query database directly post-request; assert order's `tenantId` remains `tenant-alpha` and user's role remains unchanged.
- **Resource Limits & Containment**:
  - Client containment deadline: 1000ms timeout per request with `AbortController`.
  - Concurrency: 1 (sequential authorization verification).
- **Execution Command & Replay**:
  - Proposed Command: `npx --no-install jest test/security/real-guard-authorization.spec.ts --runInBand` (runner must already be installed; absent runner ⇒ `BLOCKED (driver missing)`)
- **Evidence & Disposition**:
  - Source revision: `NOT CAPTURED` (no execution; fill the C3 template at run time)
  - Command / Environment: `NOT RUN` / `N/A — no authorized harness identified`
  - Execution Status: `NOT RUN` (offline scenario specification only)
  - Disposition: `SPECIFIED` — authorization coverage is authored, not proven against a running guard chain

---

## Scenario FUZZ-02: Deep Nesting & Resource Exhaustion Containment (AC-14)

- **ID**: `FUZZ-02`
- **Requirement / AC**: REQ-05 / AC-14
- **Operation**: `POST /api/v1/search/filter`
- **Purposes**: `fuzz` (`lane: api`)
- **Method & Path**: `POST /api/v1/search/filter`
- **Principal & Tenant**: Synthetic anonymous user (`tenant_id: public`)
- **Inputs & Generator**:
  - Generator: Bounded recursive JSON generator at the methodology caps — max serialized payload 64KB, nesting depth ≤ 10.
  - Parser probes: one hand-constructed literal at depth 25 and one at 128KB, each dispatched once under the explicit parser-test exception (see Resource Limits).
  - Wire Format: Standard JSON string (no unencoded cyclic references).
- **Fixture & Reset Procedure**: Stateless read query; reset `N/A — a rejected filter request mutates no persisted state` (if the fixture caches or logs rejected filters, clear that cache per evaluation).
- **Dependency Mode**: Standalone search service instance with mocked downstream search engine.
- **Expected Outcome**:
  - Expected Status: `400 Bad Request` (filter depth limit exceeded) or `413 Payload Too Large`, per the fixture/operation contract.
  - Invariant 1 (No 5xx): Server parser rejects payload gracefully without uncaught recursion error or stack overflow.
  - **Fixture-only containment objectives (synthetic, must be adapted before execution)**: process RSS returns to baseline after the request and event-loop lag stays `< 50ms`; an immediate `GET /health` probe returns `200 OK` within `50ms`. These two numbers are **synthetic objectives of the reference harness**, not product SLOs. Before execution, replace them with the approved operation/environment objective and record its source; if none is approved, delete the numeric bound and record the criterion as `unresolved`. A harness whose approved health budget is 200ms must not be failed by the 50ms fixture default.
  - **PASS policy**: only the approved objectives decide PASS. Client containment ceilings below (1000ms timeout, 128KB body, depth 25) are own-execution safety bounds; tripping them aborts the request as `BLOCKED`/aborted, which is neither a product performance verdict nor evidence of server robustness.
- **Resource Limits & Containment**:
  - Client containment deadline: 1000ms client timeout with immediate `AbortController.abort()` and connection drain.
  - Payload bounds: the 128KB body and 25-level nesting are deliberate parser-test inputs above the generator caps in `fuzz-methodology.md` (§2: 64KB, 10 levels). Dispatch them as hand-constructed literals, once, under the explicit parser-test exception; never let a generator emit them.
  - Product latency SLO: taken **only** from the approved operation contract; this document defines no default. No approved SLO ⇒ `SLO: unresolved`, and latency does not gate PASS.
  - Rate ceiling: max 10 requests total (shrink replays included); concurrency: 1.
- **Deterministic Seed & Replay Command**:
  - Configured Seed: `FUZZ_SEED=99887766` (governs the generator output; the two parser-probe literals are fixed inputs)
  - Replay Command: `FUZZ_SEED=99887766 npx --no-install jest test/fuzz/search-filter-depth.fuzz.spec.ts` (runner must already be installed; absent runner ⇒ `BLOCKED (driver missing)`)
- **Hypothetical Minimization & Regression Template**:
  - *[Template Example - Hypothetical Minimized Failure (not an executed artifact)]*:
    - Failing Input: Nested filter depth of 15 causing parser recursion crash.
    - Minimized Input: `{"f":{"f":{"f":{"f":{"f":{"f":{"f":{"f":{"f":{"f":{"f":{"f":{"f":{"f":{"f":1}}}}}}}}}}}}}}}}`
    - Promoted Regression Target: `test/regression/search-filter-max-depth.spec.ts`
- **Evidence & Disposition**:
  - Source revision: `NOT CAPTURED` (no execution; fill the C3 template at run time)
  - Command / Environment: `NOT RUN` / `N/A — no authorized harness identified`
  - Execution Status: `NOT RUN` (specification authored only)
  - Disposition: `SPECIFIED`

---

## Scenario SEC-02: Target Authorization & Runtime Bounds Gate (AC-15, Contract C4)

- **ID**: `SEC-02`
- **Requirement / AC**: REQ-05 / AC-15
- **Operation**: Automated Dynamic Security and Fuzz Execution against Staging Environment
- **Purposes**: `security`, `fuzz` (`lane: api`)
- **Precondition & Context (hypothetical gate-failure case, not an observed incident)**:
  - Consuming agent receives task to execute active security probes and fuzz generators against staging endpoint `https://staging-api.example.internal` (example host, not a real target).
  - Safety preflight check reveals:
    1. Target authorization: Missing operator sign-off in authorized targets ledger.
    2. Runtime caps: No rate limiter, concurrency cap, or generation byte ceiling configured.
- **Required Behavior (Safety Gate Enforcement)**:
  - Agent evaluates Authorization & Safety Gate (`[API-FUZZ-06]`, `[DAST-AUTH-01]`, Contract C4).
  - **Active execution is immediately halted with `status: BLOCKED`.**
  - Self-authorization is strictly prohibited: agent does NOT attempt to sign its own approval or override the preflight check.
  - Safe offline planning continues:
    - Generate offline test specifications, scenario contracts, and property arbitraries.
    - Output clear report documenting missing prerequisites.
- **Missing Prerequisites Documented**:
  - Prerequisite 1: Explicit human operator authorization for active scanning on target `https://staging-api.example.internal`.
  - Prerequisite 2: Verified runtime bounds: max duration ≤ 60s, max concurrency ≤ 5, max serialized payload ≤ 64KB, and active request cancellation handlers.
- **Evidence & Disposition**:
  - Source revision: `NOT CAPTURED` (no execution; fill the C3 template at run time)
  - Command / Environment: `NOT RUN` / `N/A — no authorized target`
  - **Expected, not observed** — required behavior on the gate failure above: active probe execution stops at `status: BLOCKED` and **zero** requests are sent. Zero transmitted packets is the expected verdict for an execution that was never attempted; nothing here measured network traffic.
  - Offline specification: `SPECIFIED` (structurally authored). This is not `PASS`: PASS would require an observed check that the gate rejected the run.
  - Disposition: `BLOCKED (dependent execution, expected) / SPECIFIED (offline specification)`
