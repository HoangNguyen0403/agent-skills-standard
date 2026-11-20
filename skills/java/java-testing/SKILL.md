---
name: java-testing
description: Testing standards using JUnit 5, AssertJ, Mockito, Cucumber, and Spring Boot integration tests for Java. Use when writing or reviewing Java test behavior, including parallel execution and BDD; defer Kotlin-only tests, virtual-thread test infrastructure, and coverage-report/tooling configuration.
metadata:
  triggers:
    files:
    - '**/*Test.java'
    - '**/*IT.java'
    keywords:
    - "@Test"
    - "@ParameterizedTest"
    - Mockito
    - AssertJ
    - assertThat
    - JUnit
    - Testcontainers
---
# Java Testing Standards

## **Priority: P0 (CRITICAL)**

## Core Rule Anchors

- **`[BE-TEST-01]` Parameterized Tests for Equivalent Cases**: Prefer `@ParameterizedTest` (`@CsvSource`, `@MethodSource`) when methods have multiple equivalent inputs or boundary permutations. Distinct scenarios may stay separate test methods. Reviewers must not demand parameterized rewrites without a behavioral gap.
- **`[BE-TEST-02]` Ban on Brittle DB Mock String Matching**: Do not use string-matching mocks for raw SQL queries. Test pure domain calculations directly, or use `Testcontainers` for database repository verification.
- **`[BE-TEST-03]` Ban on Shallow Assertions**: Never assert only `assertThat(result).isNotNull()` without inspecting domain fields, status codes, and invariants.
- **`[BE-TEST-04]` Ban on Pass-Through Interface Mocks**: Repositories and service handlers must test contract compliance and error mapping. Ban 1:1 pass-through mock echoing without contract assertions.
- **`[BE-TEST-05]` Bug-First Regression Lock**: Every PR fixing a bug ticket or with title `fix(...)` must introduce a test reproducing the defect prior to the fix.

## Implementation Guidelines

- **JUnit 5 (Jupiter)**: Use **`@Test`**, **`@BeforeEach`**, and **`@AfterEach`**. Avoid JUnit 4 classes.
- **Fluent Assertions**: Use **`AssertJ (assertThat)`** over JUnit `assertEquals` — enhanced readability.
- **Naming**: Use **`MethodName_State_Result`** or **`@DisplayName("Check if X when Y")`**.
- **Parameterized Tests (`[BE-TEST-01]`)**: Use **`@ParameterizedTest`** with **`@ValueSource`**, **`@CsvSource`**, or **`@MethodSource`**.
- **Mocking Strategy (`[BE-TEST-04]`)**: Use **`Mockito`** with `@ExtendWith(MockitoExtension.class)`. Use **`@Mock`**, **`@Spy`**, and **`@InjectMocks`**. NEVER mock data-only Records.
- **Integration Testing (`[BE-TEST-02]`)**: Use **`Testcontainers`** with `@Container` for real databases (PostgreSQL/Redis) in integration tests (`*IT.java`).
- **Isolation**: Each test method MUST be isolated and independent; use **`@DirtiesContext`** sparingly.
- **AssertJ Chaining (`[BE-TEST-03]`)**: Chain assertions for clarity: **`assertThat(result).isNotNull().hasSize(2).contains("X")`**.
- **Mocking Verification**: Audit observable contract outcomes and state changes; do not assert mock call counts or invocation sequences as a proxy for correctness.
- **Exceptions**: Use **`assertThatThrownBy(() -> ...)`** to verify specific Exception types and messages.
- **Coverage**: Coverage is diagnostic and project-configured; verify risk-weighted critical paths rather than padding code for an arbitrary percentage.

## Anti-Patterns

- **`[BE-TEST-01]` Stylistic parameterized rewrites**: Do not demand parameterized refactoring of passing tests without a behavioral gap.
- **`[BE-TEST-02]` Brittle DB mock string matching**: Do not match raw SQL strings in mocks; use Testcontainers.
- **`[BE-TEST-03]` Shallow assertions**: Never assert only `assertThat(result).isNotNull()` without domain inspection.
- **`[BE-TEST-04]` Pass-through mock echoing**: Ban 1:1 mock echoing without contract verification.
- **`[BE-TEST-05]` Bug fix without reproduction test**: Ban bug fixes without a regression test.
- **No Logic in Tests**: Keep tests declarative; no loops or if/else branching.
- **No System.out in Tests**: Use assertions; never print to stdout.
- **No Legacy Assertions**: Use `assertThat(a).isEqualTo(b)`, not `assertTrue(a == b)`.
- **No Shared State**: Tests must be isolated and order-independent.
## References

- [Full JUnit 5 + Mockito + AssertJ Template](references/junit-template.md)
