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

## Implementation Workflow

1. **Write failing test first** — Follow Red-Green-Refactor TDD workflow.
2. **Use table-driven tests** — Define test cases as slice of structs; iterate with `t.Run()`.
3. **Mock via interfaces** — Use DI and interfaces. Prefer `mockery` for auto-generated mocks or manual mocks for simple cases.
4. **Run parallel** — Use `t.Parallel()` for non-sequential tests to speed up CI.
5. **Clean up resources** — Use `t.Cleanup()` to reset state or release DB/file resources.
6. **Check coverage** — Aim for >80% line coverage. Run `go test -cover` to audit.

See [table-driven test examples](references/table-driven-tests.md)

## Tools

- **Stdlib**: `testing` package usually enough.
- **Testify**: Assertions (`assert`, `require`) and mocks.
- **Mockery**: Auto-generate mocks for interfaces.
- **GoMock**: Popular mocking framework alternative.

## Naming

- Test file: `*_test.go`
- Test function: `func TestName(t *testing.T)`
- Example function: `func ExampleName()`

## Anti-Patterns

- **No assert in loops**: use `t.Run` subtests to isolate failures.
- **No global mock state**: define mocks locally within test scope.
- **No skipping race detection**: always run `go test -race` in CI.

## References

- [Table-Driven Tests](references/table-driven-tests.md)
- [Mocking Strategies](references/mocking-strategies.md)