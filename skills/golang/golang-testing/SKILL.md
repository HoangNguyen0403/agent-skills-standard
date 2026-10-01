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

- **`[BE-TEST-01]` Table-Driven Subtests for Equivalent Cases**: Prefer table-driven tests (`[]struct{ name, input, expected, expectErr }` with `t.Run`) when functions have multiple equivalent inputs, boundary permutations, or repetitive setup. Distinct scenarios or diverging setup may remain separate test functions; 2-3 distinct cases are fine. Reviewers must not raise stylistic table-driven findings without a behavioral gap.
- **`[BE-TEST-02]` Ban on Brittle SQLMock String Matching**: Do not use `sqlmock.ExpectQuery` to regex-match raw SQL strings. Test pure domain business calculations directly, or use `testcontainers-go` for PostgreSQL repository verification.
- **`[BE-TEST-03]` Ban on Shallow Assertions**: Never assert only `assert.NoError(t, err)` or `assert.NotNil(t, result)` without inspecting returned domain struct fields, status codes, and invariants.
- **`[BE-TEST-04]` Ban on Pass-Through Interface Mocks**: Repositories and service handlers must test contract compliance and error mapping. Ban 1:1 pass-through mock echoing without contract assertions.
- **`[BE-TEST-05]` Bug-First Regression Lock**: Every PR fixing a bug ticket or with title `fix(...)` must introduce a test reproducing the defect prior to the fix.

## Implementation Workflow

1. **Write failing test first** — Follow Red-Green-Refactor TDD workflow (`[BE-TEST-05]`).
2. **Table-driven tests for equivalent inputs** — For parameterized cases sharing setup, define test cases as a slice of structs with `t.Run` (`[BE-TEST-01]`).
3. **Zero Volatile Fields for Struct Comparison** — When asserting struct equality, zero out timestamps, dynamic IDs, or generated tokens before `assert.Equal` to prevent flaky assertions.
4. **Mock via interfaces** — Use DI and small, consumer-centric interfaces (1-3 methods) (`[BE-TEST-04]`). Prefer `mockery` for auto-generated mocks or manual mocks for simple cases.
5. **Run parallel** — Use `t.Parallel()` for non-sequential tests to speed up CI.
6. **Clean up resources** — Use `t.Cleanup()` to restore state or release DB/file resources.
7. **Check coverage** — Coverage is diagnostic and project-configured; verify risk-weighted critical paths rather than padding code for an arbitrary percentage.

See [table-driven test examples](references/table-driven-tests.md)

## Tools & Naming

- **Stdlib**: `testing` package (`TestXxx(t *testing.T)`, `ExampleXxx()`).
- **Testify**: Assertions (`assert`, `require`) and mocks.
- **Mockery / GoMock**: Auto-generate mocks for interfaces.
- **Integration**: Prefer `testcontainers-go` over raw SQL mock strings (`[BE-TEST-02]`).

## Anti-Patterns

- **`[BE-TEST-01]` No stylistic rewrites**: Do not demand table-driven rewrites of passing tests unless 5+ repetitive blocks or a coverage gap exists.
- **`[BE-TEST-02]` No raw SQL regex matching**: Do not match SQL strings in mocks.
- **`[BE-TEST-03]` No shallow assertions**: Never assert only `assert.NoError`/`NotNil` without payload inspection.
- **`[BE-TEST-04]` No pass-through mock echoing**: Ban 1:1 mock echoing without contract assertions.
- **`[BE-TEST-05]` No bug fix without reproduction test**.
- **No assert in loops**: use `t.Run` subtests to isolate failures.
- **No brittle assertions on volatile fields**: normalize timestamps/dynamic IDs.
- **No global mock state**: define mocks locally within test scope.
- **No skipping race detection**: always run `go test -race` in CI.

## References

- [Table-Driven Tests](references/table-driven-tests.md)
- [Mocking Strategies](references/mocking-strategies.md)
