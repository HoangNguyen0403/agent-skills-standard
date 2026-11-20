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

## Core Rule Anchors

- **`[BE-TEST-01]` Table-Driven Subtests for Equivalent Cases**: Prefer table-driven tests (`[]struct{ name, input, want, wantErr }` with `t.Run`) when functions have multiple equivalent inputs, boundary permutations, or repetitive setup. Distinct scenarios or diverging setup may remain separate test functions; 2-3 distinct cases are fine. Ban duplicate identical table rows (`GUARD-GO-03`). Every field declared in table struct must be asserted in `t.Run` (`GUARD-GO-UNCHECKED-WANT`).
- **`[BE-TEST-02]` Ban on Brittle SQLMock String Matching**: Do not use `sqlmock.ExpectQuery` to regex-match raw SQL strings. Test pure domain calculations directly, or use `testcontainers-go` for PostgreSQL repository verification.
- **`[BE-TEST-03]` Ban on Shallow Assertions (`GUARD-GO-EXISTENCE-ONLY`)**: Multi-return `(T, error)` functions must assert at least one non-trivial payload field, slice length, status enum, or domain invariant on `T`. Bare `assert.NoError` and `assert.NotNil` alone is banned.
- **`[BE-TEST-04]` Ban on Pass-Through Interface Mocks**: Repositories and service handlers must test contract compliance and error mapping. Ban 1:1 pass-through mock echoing without contract assertions. In pure `domain/` package tests, prefer pure struct fixtures over mock controllers (`GUARD-GO-01`).
- **`[BE-TEST-05]` Bug-First Regression Lock**: Every PR fixing a bug ticket or with title `fix(...)` must introduce a test reproducing the defect prior to the fix.

## Implementation Workflow

1. **Write failing test first** — Follow Red-Green-Refactor TDD workflow (`[BE-TEST-05]`).
2. **Table-driven tests for equivalent inputs** — For parameterized cases sharing setup, define test cases as a slice of structs with `t.Run` (`[BE-TEST-01]`). Assert all declared `want`/`wantErr` fields (`GUARD-GO-UNCHECKED-WANT`).
3. **Compound Guard Branch Coverage** — For market checks or feature-flag compound conditions (`&&`/`||`), assert both allowed and denied branches independently flip outcomes.
4. **Zero Volatile Fields for Struct Comparison** — When asserting struct equality, zero out timestamps, dynamic IDs, or generated tokens before `assert.Equal` to prevent flaky assertions.
5. **No Swallowed Errors (`GUARD-GO-SWALLOWED-ERR`)** — Never use `if err != nil { return }` or continue past errors; always fail via `t.Fatalf("unexpected: %v", err)` or `require.NoError(t, err)`.
6. **Mock via interfaces** — Use DI and small, consumer-centric interfaces (1-3 methods) (`[BE-TEST-04]`). In `domain/`, prefer pure struct fixtures over mock controllers (`GUARD-GO-01`).
7. **Run parallel & clean up** — Use `t.Parallel()` for independent tests and `t.Cleanup()` to restore state or release resources.
8. **Check coverage** — Coverage is diagnostic and project-configured; verify risk-weighted critical paths rather than padding code for an arbitrary percentage.

## Tools & Naming

- **Stdlib**: `testing` package (`TestXxx(t *testing.T)`, `ExampleXxx()`).
- **Testify**: Assertions (`assert`, `require`) and mocks.
- **Mockery / GoMock**: Auto-generate mocks for interfaces.
- **Integration**: Prefer `testcontainers-go` over raw SQL mock strings (`[BE-TEST-02]`).

## Anti-Patterns

- **`[BE-TEST-01]` No stylistic rewrites & duplicate rows**: Do not demand table rewrites of passing tests unless 5+ repetitive blocks exist. Ban duplicate identical table rows (`GUARD-GO-03`) and unasserted want fields (`GUARD-GO-UNCHECKED-WANT`).
- **`[BE-TEST-02]` No raw SQL regex matching**: Do not match SQL strings in mocks.
- **`[BE-TEST-03]` No shallow assertions (`GUARD-GO-EXISTENCE-ONLY`)**: Never assert only `assert.NoError`/`NotNil` without payload inspection.
- **`[BE-TEST-04]` No pass-through mock echoing & domain mocks**: Ban 1:1 mock echoing without contract assertions. Ban mock controllers in pure `domain/` (`GUARD-GO-01`).
- **`[BE-TEST-05]` No bug fix without reproduction test**.
- **No swallowed errors (`GUARD-GO-SWALLOWED-ERR`)**: Ban `if err != nil { return }` in tests.
- **No assert in loops**: Use `t.Run` subtests to isolate failures.
- **No brittle assertions on volatile fields**: Normalize timestamps/dynamic IDs.
- **No global mock state**: Define mocks locally within test scope.
- **No skipping race detection**: Always run `go test -race` in CI.

## References

- [Table-Driven Tests](references/table-driven-tests.md)
- [Mocking Strategies](references/mocking-strategies.md)
