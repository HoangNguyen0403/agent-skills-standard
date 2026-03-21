---
name: golang-testing
description: 'Standards for unit testing, table-driven tests, and mocking in Golang. Use when writing Go unit tests, table-driven tests, or using mock interfaces. (triggers: **/*_test.go, testing, unit tests, go test, mocking, testify)'
---

# Golang Testing Standards

## **Priority: P0 (CRITICAL)**

## Guidelines

### TDD & Table-Driven Tests

- **Pattern**: Use **`Table-Driven Tests`** for multi-input scenarios. Use **`t.Run()`** for each test case.
- **Workflow**: Follow **Red-Green-Refactor**. Write a failing test case before implementing logic.
- **Mocking**: Use **`Interfaces`** and **`Dependency Injection`**. Avoid complex mocking frameworks; prefer **`manual mocks`** or **`GoMock`**.
- **Coverage**: Aim for **`> 80%`** line coverage. Run `go test -cover` to audit.
- **Assertions**: Use **`testify/assert`** or **`testify/require`** for readable checks: `assert.NoError(t, err)`.
- **Parallelism**: Use **`t.Parallel()`** for non-sequential tests to speed up CI.
- **Cleanup**: Use **`t.Cleanup()`** to reset state or release resources (DB/Files).
- **Subtests**: Name each subtest case clearly (`"Valid input"`, `"Missing ID"`, `"Network timeout"`).

### Golden Snippet

See [Table-Driven Tests](references/table-driven-tests.md) for full template.

## Tools

- **Stdlib**: `testing` package is usually enough.
- **Testify (`stretchr/testify`)**: Assertions (`assert`, `require`) and Mocks.
- **Mockery**: Auto-generate mocks for interfaces.
- **GoMock**: Another popular mocking framework.

## Naming

- Test file: `*_test.go`
- Test function: `func TestName(t *testing.T)`
- Example function: `func ExampleName()`

## Anti-Patterns

- **No Manual Mocks**: Use `mockery` for boilerplate-heavy mocks.
- **No Assert in Loop**: Use `t.Run` to isolate failures within table-driven loops.
- **No Global Mocks**: Define mocks locally or within test scope to avoid state leakage.

## References

- [Table-Driven Tests](references/table-driven-tests.md)
- [Mocking Strategies](references/mocking-strategies.md)
