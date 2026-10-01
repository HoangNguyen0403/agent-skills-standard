---
name: spring-boot-testing
description: Write unit, integration, and slice tests for Spring Boot 3 applications. Use when writing unit tests, integration tests, or slice tests for Spring Boot 3 applications.
metadata:
  triggers:
    files:
    - '**/*Test.java'
    keywords:
    - webmvctest
    - datajpatest
    - testcontainers
    - assertj
---
# Spring Boot Testing Standards

## **Priority: P0 (CRITICAL)**

## Core Rule Anchors

- **`[BE-TEST-01]` Parameterized Tests for Equivalent Cases**: Prefer `@ParameterizedTest` (`@CsvSource`, `@MethodSource`) when methods have multiple equivalent inputs or boundary permutations. Distinct scenarios may stay separate test methods. Reviewers must not demand parameterized rewrites without a behavioral gap.
- **`[BE-TEST-02]` Ban on Brittle DB Mock String Matching**: Do not use string-matching mocks for raw SQL queries. Test pure domain calculations directly, or use `Testcontainers` for database repository verification.
- **`[BE-TEST-03]` Ban on Shallow Assertions**: Never assert only `assertThat(result).isNotNull()` without inspecting domain fields, status codes, and invariants.
- **`[BE-TEST-04]` Ban on Pass-Through Interface Mocks**: Repositories and service handlers must test contract compliance and error mapping. Ban 1:1 pass-through mock echoing without contract assertions.
- **`[BE-TEST-05]` Bug-First Regression Lock**: Every PR fixing a bug ticket or with title `fix(...)` must introduce a test reproducing the defect prior to the fix.

## Follow TDD Workflow

1. **Red**: Write failing test (e.g., `returns 404`) (`[BE-TEST-05]`).
2. **Green**: Implement minimal code to pass.
3. **Refactor**: Clean up while keeping tests green (`[BE-TEST-01]`).
4. **Coverage**: Diagnostic and project-configured; verify risk-weighted critical paths rather than padding code for an arbitrary percentage.

## Write Slice and Integration Tests

- **Real Infrastructure (`[BE-TEST-02]`)**: Use **Testcontainers** for DB/Queues. Avoid H2/Embedded.
- **Assertions (`[BE-TEST-03]`)**: Use **AssertJ** (`assertThat`) over JUnit assertions; avoid shallow checks.
- **Isolation (`[BE-TEST-04]`)**: Use `@MockBean` for downstream dependencies in Slice Tests; avoid pass-through mock echoing.

See [implementation examples](references/implementation.md) for WebMvcTest slice tests and Testcontainers integration tests.

## Anti-Patterns

- **`[BE-TEST-01]` Stylistic parameterized rewrites**: Do not demand parameterized refactoring of passing tests without a behavioral gap.
- **`[BE-TEST-02]` Brittle DB mock string matching**: Do not match raw SQL strings in mocks; use Testcontainers.
- **`[BE-TEST-03]` Shallow assertions**: Never assert only `assertThat(result).isNotNull()` without inspecting domain fields or status codes.
- **`[BE-TEST-04]` Pass-through mock echoing**: Ban 1:1 pass-through mock echoing without contract assertions.
- **`[BE-TEST-05]` Bug fix without reproduction test**: Ban bug fixes without a regression test.
- **No Dirty Contexts**: Avoid @MockBean in base classes; it reloads context per test.
- **No network I/O in tests**: Mock external calls with WireMock.
- **No System.out in tests**: Use AssertJ assertions instead.
## References

- [Implementation Examples](references/implementation.md)