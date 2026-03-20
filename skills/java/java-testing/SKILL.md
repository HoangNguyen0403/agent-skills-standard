---
name: java-testing
description: "Testing standards using JUnit 5, AssertJ, and Mockito for Java. Use when writing or reviewing Java unit tests, setting up parameterized tests, writing integration tests with Testcontainers, or working with Mockito mocks. (triggers: **/*Test.java, **/*IT.java, @Test, @ParameterizedTest, Mockito, AssertJ, assertThat, JUnit, Testcontainers)"
---

# Java Testing Standards

## **Priority: P0 (CRITICAL)**

High-reliability testing using JUnit 5 and fluent assertions.

## Implementation Guidelines

- **Framework**: Use JUnit 5 (Jupiter). Avoid JUnit 4.
- **Assertions**: Use AssertJ (`assertThat`) over JUnit `assertEquals` — more readable, better error messages.
- **Naming**: `MethodName_StateUnderTesting_ExpectedBehavior` or `@DisplayName("Should return X when Y")`.
- **Parameterized**: Use `@ParameterizedTest` with `@ValueSource` or `@MethodSource` for data-driven tests.
- **Mocking**: Use Mockito. Limit mocking to external dependencies (I/O). Never mock data objects.
- **Integration**: Use **Testcontainers** for real databases/brokers in integration tests (`*IT.java`).
- **Visibility**: Test classes and methods can be package-private in JUnit 5 (no `public` needed).

## Anti-Patterns

- **No Logic in Tests**: Keep tests declarative; no loops or if/else branching.
- **No System.out in Tests**: Use assertions; never print to stdout.
- **No Legacy Assertions**: Use `assertThat(a).isEqualTo(b)`, not `assertTrue(a == b)`.
- **No Shared State**: Tests must be isolated and order-independent.

## References

- [Full JUnit 5 + Mockito + AssertJ Template](references/junit-template.md)
