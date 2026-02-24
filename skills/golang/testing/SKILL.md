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

## Guidelines

### TDD Workflow

1.  **Red**: Write a failing table-driven test case.
2.  **Green**: Implement logic to pass.
3.  **Refactor**: Simplify code.

## Verification Checklist (Mandatory)

- [ ] **Table-Driven**: Are multiple scenarios handled in a single test function via tables?
- [ ] **Coverage**: Does the test cover edge cases (nil, error, empty)?
- [ ] **No Side Effects**: Are global states reset or avoided?
- [ ] **Error Checking**: Are errors asserted for both existence (`assert.Error`) and content?
- [ ] **Subtests**: Are subtests named descriptively?

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
