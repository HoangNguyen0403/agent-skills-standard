# API Fuzzing & Security Testing Methodology

## 1. Structured Fuzzing vs Endpoint Discovery

| Dimension | Content Discovery (e.g. ffuf / feroxbuster) | Structured API Fuzzing |
|---|---|---|
| Primary Goal | Discover hidden/unlisted paths, files, or parameter names | Discover robustness failures, unhandled exceptions, and contract violations |
| Input Generator | Wordlists / dictionaries of common strings | Schema-aware mutations, boundary generators, type permutations |
| Target Surface | Unknown URLs and unadvertised endpoints | Known operations with declared schemas (OpenAPI / DTO) |
| Invariant Oracle | HTTP response code (200 vs 404 vs 403) | 4 Invariants: crash resilience, schema match, tenant isolation, resource limits |
| Repro Requirement | Static wordlist index | Deterministic PRNG seed, generator AST, and minimal counterexample |

Endpoint discovery identifies *what exists*; structured fuzz testing validates *how robustly it behaves* under adversarial and malformed inputs.

## 2. Payload Mutation Strategies & Finite Generation Bounds

Fuzz payload generators apply systematic transformations to OpenAPI/DTO schemas under finite serialized byte and depth caps:

1. **Finite Generation Ceilings (Contract C4)**:
   - Generators MUST enforce finite generation bounds before network dispatch: maximum serialized payload byte ceiling (e.g. 64KB default for JSON, or explicit fixture limit), maximum string length, and maximum recursion depth (default cap ≤ 10 levels).
   - Deep-nesting tests (> 10 levels) must be isolated with strict serialized byte limits to prevent client-side generator heap exhaustion.
   - **Circular References**: Note that circular JavaScript object graphs cannot be serialized by standard JSON encoders (`JSON.stringify` throws `TypeError: cyclic object value`). Fuzzing cyclic structures requires explicit wire encoding formats (e.g. JSON-LD graph nodes with `@id` references, YAML anchors, or multipart bodies).
2. **Type Confusion**: Swap declared scalar types (e.g. string for integer, boolean for array, object for string `{"id": {"$gt": ""}}`).
3. **Boundary & Extremes**:
   - Numeric: `0`, `-1`, `MAX_SAFE_INTEGER`, `MIN_SAFE_INTEGER`, `NaN`, `Infinity`, floating-point precision overflows.
   - String: Empty string `""`, whitespace-only `"   "`, bounded oversized strings (e.g. 10KB–64KB ceiling), format strings (`%s%s%s%n`), SQL control sequences, path traversal tokens (`../../etc/passwd`).
   - Unicode & Special Chars: Multi-byte UTF-8, bidirectional overrides (`\u202E`), zero-width spaces, null bytes (`\u0000`).
4. **Structure & Schema Mutation**:
   - Missing required fields, unexpected extra fields (mass-assignment probes), null/undefined injection in non-nullable schema properties.
5. **State & Sequence Permutations**:
   - Out-of-order state transitions (e.g. capture before authorization, refund before checkout).
   - Duplicate submissions within millisecond windows (idempotency race probes).

## 3. The Four Invariant Oracles

Every execution evaluates the response against four non-negotiable oracles derived from approved contracts (never invent arbitrary universal thresholds):

### Oracle 1: Crash Resilience (No 5xx)
- **PASS**:
  - Valid boundary inputs return the operation's contract-approved success status (e.g. 200 OK, 201 Created).
  - Malformed/invalid inputs return contract-approved client error status (e.g. 400 Bad Request, 422 Unprocessable Entity, 413 Payload Too Large) with standard JSON error formatting.
- **FAIL**: HTTP 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, unhandled process crash, or connection drop.

### Oracle 2: Contract Conformance
- **PASS**: The returned payload strictly validates against the operation's declared schema (success schema for valid cases, error schema for rejected cases); no internal stack traces, DB query dumps, or runtime source paths leaked.
- **FAIL**: Unformatted HTML error pages, unmasked exception traces, or non-schema JSON structures.

### Oracle 3: State & Tenant Isolation (AC-13)
- **PASS**: Real guards/policies execute. Requesters without valid tenant/role authorization receive approved denial (401 Unauthorized for missing/invalid auth; 403 Forbidden or intentional 404 concealment for cross-tenant / insufficient role). Database state remains immutable; zero unpermitted data returned.
- **FAIL**: 200 OK returning cross-tenant data (BOLA/IDOR), modification of unowned records, or acceptance of unauthenticated requests.

### Oracle 4: Resource & Latency Boundedness
- **PASS**:
  - *Product Latency*: Response latency meets the operation's contract-approved SLO. This document defines no default target; a missing SLO is recorded as unresolved, never invented.
  - *Client Containment*: Request completes or is actively aborted within the client containment ceiling (e.g. 1000ms runner timeout). This is an own-execution safety bound, not a product PASS criterion.
  - *Socket & Memory Health*: Process memory remains stable; sockets drain immediately on completion or abort.
- **FAIL**: Request hangs indefinitely, exceeds client containment deadline, process memory balloons, or socket pool starves.

## 4. Deterministic Seed Management & Minimization (AC-14)

### Seed Management
All random payload generators must accept and log a deterministic PRNG seed. Identifiers below (`BASE_URL`, `SYNTHETIC_CUSTOMER_TOKEN`, `resetOrdersFixture`, `isValidOrderPayload`, `orderSuccessSchema`, `orderErrorSchema`) are fixture placeholders: bind them to the harness's installed driver and seeded synthetic credentials before execution.

```ts
import * as fc from 'fast-check';

const seed = Number(process.env.FUZZ_SEED ?? 1729938101);
console.log(`[FUZZ] seed=${seed}`);

try {
  // endOnFailure: false (default) keeps shrinking enabled during discovery
  await fc.assert(
    fc.asyncProperty(orderPayloadArbitrary, async (payload) => {
      await resetOrdersFixture(); // per-evaluation precondition, not only afterEach
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // client containment ceiling

      try {
        const response = await fetch(`${BASE_URL}/api/v1/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SYNTHETIC_CUSTOMER_TOKEN}` },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const valid = isValidOrderPayload(payload);
        const body = await response.json();

        if (response.status >= 500) throw new Error(`Unhandled 5xx: ${response.status}`);
        expect(response.status).toBe(valid ? 201 : 400);
        expect(body).toMatchSchema(valid ? orderSuccessSchema : orderErrorSchema);
        return true;
      } finally {
        clearTimeout(timeoutId);
      }
    }),
    { seed, numRuns: 500 }
  );
} catch (error) {
  // fast-check's AssertionError reports { seed, path }, the shrunk counterexample and shrink count
  console.error(`[FUZZ] seed=${seed} minimized failure:\n${(error as Error).message}`);
  throw error;
}
```

### Minimization (Shrinking)
Shrinking must run during discovery — `endOnFailure: false` — because fast-check's `endOnFailure: true` stops at the first failure **without shrinking**. Rules:

1. **Reset before every evaluation and every shrink replay.** A shrunk candidate is re-sent to the target, so the fixture precondition (seed data, stock/inventory level, order/invoice state, write policy) must be re-established before each attempt. `afterEach`/`afterAll` run once per test file, not per evaluation or shrink attempt, and cannot preserve oracle validity.
2. **Shrink traffic is budgeted.** Discovery runs, fixture reset/seed calls and shrink replays are all counted against the finite duration/request/concurrency caps in §5. If the remaining budget cannot cover minimization, stop and report the unminimized input with its seed as `UNMINIMIZED`; never silently disable shrinking to stay inside the budget.
3. **`endOnFailure: true` is replay-only.** It is permitted only for re-running an already minimized seed + generator path/input recorded from a prior discovery run, where no further minimization is claimed. It must never be the discovery configuration while a report or test artifact claims minimization.
4. **Retain the full counterexample identity.** Log the seed, the generator path (counterexample path), the minimized input, the reproduction command, and the number of discovery/shrink requests consumed from the authorized budget.

Current field-level expectation: the minimized failing input, exact seed, generator path, and reproduction command are logged; the minimal reproduction payload is output as an isolated reproduction curl command or unit test fixture.

### Regression Promotion (Contract C1/C2)
Once minimized, the failing input MUST NOT remain only in ephemeral fuzz logs:
1. Add a deterministic test case in the regression test suite (`test/regression/`).
2. Tag with original defect ticket / AC reference and classification (`purpose: regression, lane: api`).
3. Lock the fix before closing the defect.

## 5. Execution Safety & Authorization Gate (AC-15, Contract C4)

Active security probes and fuzzing can cause data corruption, denial of service, or unintended alerting. Follow strict safety gates:

1. **Authorization Gate**:
   - Verify explicit operator authorization for target environment.
   - Target must be an isolated local or staging sandbox with synthetic seed data.
   - **Production and public targets are strictly prohibited.**
2. **Runtime & Generation Caps (Contract C4)**:
   - Maximum duration: e.g. 60 seconds per suite.
   - Maximum concurrency: e.g. 5 concurrent requests.
   - Request rate limit: e.g. 50 req/sec max.
   - Maximum serialized payload: 64KB per request ceiling (unless explicit parser test).
   - Maximum recursion depth: 10 levels.
   - Shrink & replay traffic: minimization replays and minimized-seed replays are charged against the same duration/request/concurrency budget; a budget that cannot cover them yields `UNMINIMIZED`, not an uncapped run.
   - Active cancellation & drain: on request timeout, client abort, or circuit-breaker trip, in-flight requests must be cancelled (`AbortController.abort()`) and socket streams drained.
   - Circuit breaker: abort run immediately if 5 consecutive connection drops or 5xx errors occur.
3. **Disposition when Blocked**:
   - If authorization or bounds cannot be confirmed:
     - Mark dependent execution status: `BLOCKED` (never `PASS`).
     - Safe offline harness and test scenario planning continues unblocked.
     - Agents must never grant themselves authorization or bypass safety guardrails.
