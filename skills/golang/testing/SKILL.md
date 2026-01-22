---
name: Testing
description: Standards for unit testing, table-driven tests, and mocking in Golang.
metadata:
  labels: [golang, testing, tdd, mocking, unit-tests]
  triggers:
    files: ['**/*_test.go']
    keywords: [testing, unit tests, go test, mocking, testify]
---

# Golang Testing Standards

## **Priority: P0 (CRITICAL)**

## Principles

- **Table-Driven Tests**: The idiomatic way to write tests in Go.
- **Subtests (`t.Run`)**: Run table entries as subtests for better reporting.
- **Parallel Usage**: Use `t.Parallel()` for independent tests to speed up execution.
- **Mock Interfaces**: Mock at the boundaries (interfaces).

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

- **Sleeping in tests**: Use channels/waitgroups or retry logic.
- **Testing implementation details**: Test public behavior/interface.

## References

- [Table-Driven Tests](references/table-driven-tests.md)
- [Mocking Strategies](references/mocking-strategies.md)
