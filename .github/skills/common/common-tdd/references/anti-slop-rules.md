# Anti-Slop Rules (Canonical)

Single source for generic test-slop rules. Stack skills link here and state only stack-specific deltas.
Cite a rule ID; never copy its body into another skill.

## A1 Companion-file reuse & twin extension migration (`GUARD-TS-DUAL-EXT`)

Check the folder for an existing test file first. Add cases to it; never create a sidecar with duplicated mocks.
Never leave `<stem>.test.js` beside `<stem>.test.ts`; migrate the legacy file in the same change.

## A2 Assertion integrity (`GUARD-UNIV-ZERO`, `GUARD-UNIV-TAUTOLOGY`)

Every test asserts an outward outcome; a test that only runs code is not a test.
`expect(x).toBe(x)`, `assert.Equal(t, x, x)`, and `expect(true).toBe(true)` pass regardless of implementation: banned.

```typescript
// BAD: tautology  |  GOOD: independent contract value
expect(result).toBe(result);
expect(result.status).toBe('OK');
```

## A3 Non-identity calculation fixtures (`GUARD-UNIV-IDENTITY-FIXTURE`)

Active operands (`discount`, `rebate`, `fee`, `tax`, `mov_threshold`) must not be `0`, `0.0`, `""`, or empty
unless the zero boundary is the behavior under test.

```typescript
// BAD: sign mutation survives (100 - 0 == 100 + 0)
const order = { subtotal: 100, discount: 0, tax: 0 };
// GOOD: non-zero operands expose sign and formula errors
const order = { subtotal: 100, discount: 15, deliveryFee: 10 }; // 100 - 15 + 10 = 95
```

## A4 Independent clause flipping for compound guards

For `if (a && b)` / `if (a || b)`, flip each clause independently; flipping both together tests one branch.

```typescript
test.each([
  { market: 'SG', flag: true, expected: true },
  { market: 'SG', flag: false, expected: false }, // flag flips alone
  { market: 'MY', flag: true, expected: false },  // market flips alone
])('canExpressShip($market, $flag) -> $expected', ({ market, flag, expected }) => {
  expect(canExpressShip({ market, flag })).toBe(expected);
});
```

## A5 Skipped and focused tests (`GUARD-UNIV-SKIP`, `GUARD-UNIV-FOCUS`)

Never commit `it.skip`, `describe.skip`, `it.only`, `describe.only`, `fit`, `fdescribe`, `@Ignore`, `@Disabled`,
`skip: true`, `solo: true`, or unconditional `t.Skip`.

## A6 TypeScript async and promise traps

- `GUARD-TS-FLOATING-ASSERT`: `await` every promise assertion; an unawaited `expect(...).resolves` can exit first.
- `GUARD-TS-CATCH-ONLY`: a bare `try { ... } catch { expect(...) }` passes when no error is thrown. Use `rejects`/`throws`.
- `GUARD-TS-CONDITIONAL-ASSERT`: assertions under `if` may never run. Assert the collection first, then elements.
- `GUARD-TS-SELF-MOCK`, `GUARD-TS-MOCKED-SUT`: invoking a mock to assert it was called tests the mock, not the code.

```typescript
// BAD                                        // GOOD
expect(fn()).resolves.toBe(user);             await expect(fn()).resolves.toBe(user);
try { await pay(-50); } catch (e) { ... }     await expect(pay(-50)).rejects.toThrow(/invalid/);
if (users.length) expect(users[0]).toBeDefined();  expect(users).toHaveLength(1); expect(users[0].id).toBe('u1');
```

## A7 Pass-through mocks and oracle independence

Ban 1:1 collaborator echoes (`mock returns x; expect(sut()).toBe(x)`) and mock-choreography assertions.
Mock real boundaries only; never copy expected output from the implementation. Route contract behavior to a
contract/integration test with a real boundary or a faithful fake.

## A8 Bug-first regression lock (`[BE-TEST-05]`, `[WEB-TEST-05]`, `[MOB-TEST-05]`)

Every bug-fix change reproduces the defect as a failing test before the fix. A frozen pre-repair snapshot is
valid evidence only when labeled `frozen_snapshot_red`; otherwise report `NOT RUN`, never a manufactured RED.

## A9 Deterministic timing (`GUARD-E2E-01`)

Ban wall-clock sleeps (`sleep`, `Thread.sleep`, `setTimeout`, `Future.delayed`, `page.waitForTimeout`).
Wait on the real condition: an idling resource, `waitUntil`, a web-first assertion, or `findBy*`.

## A10 Shallow and existence-only assertions (`[BE-TEST-03]`)

`NoError`, `NotNil`, `toBeDefined` alone prove nothing about behavior. For multi-return or payload-carrying
results, assert at least one non-trivial field, length, status, or domain invariant.

## A11 Naming, scope, and one logical contract (`[MOB-TEST-01]`, `[WEB-TEST-01]`)

Behavior-focused `Method_Scenario_ExpectedBehavior` names; no placeholders (`test 1`, `sample`), ticket IDs,
`TODO`, or `FIXME`. One logical contract per test; multiple assertions are fine for related aspects of it.
Assert observable state, not private methods, call counts, or mock existence.

## A12 Coverage and mutation targets are diagnostic

Keep only cases detecting a distinct fault, boundary, or contract rule; merge equivalent inputs. Use
repository-configured thresholds when they exist, otherwise report risk gaps. Never add padding tests for a
percentage or a blanket mutation quota.

## A13 Four Pillars are qualitative

Protection against Regressions, Resistance to Refactoring, Fast Feedback, and Maintainability guide a
qualitative judgment. Never invent static numeric scores such as $P \times R \times F \times M$ per test.

## A14 Backend data access and review restraint (`[BE-TEST-01]`, `[BE-TEST-02]`)

- **`[BE-TEST-02]` No brittle SQL string or regex matching**: never assert raw SQL text captured by a mock
  (`sqlmock.ExpectQuery` regexes, query-string equality). A matched query string proves the mock, not the query.
  Test pure domain logic directly, or exercise the repository against a real provisioned or container database
  (`testcontainers`, integration DB with transaction rollback or truncation).
- **`[BE-TEST-01]` Parameterize for equivalence, never as a style mandate**: data-driven cases exist for equivalent
  inputs and boundary permutations. A reviewer must not demand a parameterized rewrite of a passing test without a
  named behavioral gap (uncovered fault, boundary, or contract rule).
