---
name: golang-testing
description: Write unit tests with table-driven patterns and interface mocking in Go. Use when writing Go unit tests, table-driven tests, or using mock interfaces.
metadata:
  triggers:
    files:
    - '**/*_test.go'
    keywords:
    - testing
    - unit tests
    - go test
    - mocking
    - testify
---
# Golang Testing

## **Priority: P0 (CRITICAL)**

Universal anti-slop rules (identity fixtures, tautologies, skip/focus, mock echoing, bug-first lock, sleeps, shallow
assertions, coverage): [anti-slop-rules.md](../../common/common-tdd/references/anti-slop-rules.md). Only Go deltas follow.

## Core Rule Anchors

- **`[BE-TEST-01]` Table-Driven Subtests for Equivalent Cases**: Prefer `[]struct{ name, input, want, wantErr }` with `t.Run`
  when inputs are equivalent or setup is repetitive. Distinct scenarios or diverging setup may stay separate functions. Ban
  duplicate identical rows (`GUARD-GO-03`); every declared field must be asserted in `t.Run` (`GUARD-GO-UNCHECKED-WANT`).
- **`[BE-TEST-02]` Ban Brittle SQLMock String Matching**: Do not regex-match raw SQL via `sqlmock.ExpectQuery`. Test pure domain
  calculations directly, or use `testcontainers-go` for PostgreSQL repository verification.
- **`[BE-TEST-03]` Ban Shallow Assertions (`GUARD-GO-EXISTENCE-ONLY`)**: Multi-return `(T, error)` functions must assert at
  least one non-trivial payload field, slice length, status enum, or domain invariant on `T`. Bare `assert.NoError` +
  `assert.NotNil` is banned.
- **`[BE-TEST-04]` Ban Pass-Through Interface Mocks**: Repositories and service handlers prove contract compliance and error
  mapping; ban 1:1 mock echoing. In pure `domain/` tests prefer struct fixtures over mock controllers (`GUARD-GO-01`).

## Implementation Workflow

1. **Failing test first** — RED before production code.
2. **Table-driven for equivalent inputs** — `t.Run` per case (`[BE-TEST-01]`); assert all `want`/`wantErr` fields
   (`GUARD-GO-UNCHECKED-WANT`).
3. **Compound guard branches** — for `&&`/`||` market or feature-flag conditions, assert each clause independently flips.
4. **Zero volatile fields** — clear timestamps, dynamic IDs, and generated tokens before `assert.Equal`.
5. **No swallowed errors (`GUARD-GO-SWALLOWED-ERR`)** — never `if err != nil { return }`; fail via `t.Fatalf` or
   `require.NoError`.
6. **Mock via interfaces** — DI with small consumer-centric interfaces (1–3 methods) (`[BE-TEST-04]`).
7. **Parallel & cleanup** — `t.Parallel()` for independent tests; `t.Cleanup()` to restore state and release resources.
8. **Coverage** — diagnostic and project-configured; verify risk-weighted critical paths.

## Tools & Naming

- **Stdlib**: `testing` (`TestXxx(t *testing.T)`, `ExampleXxx()`).
- **Testify**: `assert` / `require`; **Mockery / GoMock**: generated interface mocks.
- **Integration**: `testcontainers-go` over raw SQL string mocks (`[BE-TEST-02]`).

## Anti-Patterns

- **Stylistic rewrites & duplicate rows (`[BE-TEST-01]`)**: Do not demand table rewrites of passing tests without a behavioral
  gap. Ban duplicate rows (`GUARD-GO-03`) and unasserted fields (`GUARD-GO-UNCHECKED-WANT`).
- **Raw SQL regex matching (`[BE-TEST-02]`)**.
- **Shallow assertions (`[BE-TEST-03]`, `GUARD-GO-EXISTENCE-ONLY`)**.
- **Pass-through mocks & domain mocks (`[BE-TEST-04]`, `GUARD-GO-01`)**.
- **Swallowed errors (`GUARD-GO-SWALLOWED-ERR`)**.
- **Asserts in a bare loop**: Use `t.Run` for each iteration so failures are isolated and the case name is clear.
- **Brittle assertions on volatile fields**; **global mock state**; **skipping `go test -race` in CI**.

## References

- [Table-Driven Tests](references/table-driven-tests.md)
- [Mocking Strategies](references/mocking-strategies.md)
