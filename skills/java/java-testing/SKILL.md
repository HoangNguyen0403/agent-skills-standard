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

Universal anti-slop rules (identity fixtures, tautologies, skip/focus, mock echoing, bug-first lock, sleeps, shallow
assertions, coverage): [anti-slop-rules.md](../../common/common-tdd/references/anti-slop-rules.md). Only Java deltas follow.

## Stack Deltas

- **JUnit 5 (Jupiter)**: `@Test`, `@BeforeEach`, `@AfterEach`; avoid JUnit 4 classes.
- **AssertJ**: `assertThat(...)` over JUnit `assertEquals`; chain (`isNotNull().hasSize(2).contains("X")`);
  `assertThatThrownBy(() -> ...)` for exception type and message.
- **Naming**: `MethodName_State_Result` or `@DisplayName("Check if X when Y")`.
- **Parameterized (`[BE-TEST-01]`)**: `@ParameterizedTest` with `@ValueSource`, `@CsvSource`, or `@MethodSource` for
  equivalent inputs and boundary permutations; distinct scenarios or diverging setup may stay separate methods.
- **Mockito (`[BE-TEST-04]`)**: `@ExtendWith(MockitoExtension.class)`, `@Mock`, `@Spy`, `@InjectMocks`; never mock
  data-only records; assert observable contract outcomes, not call counts or invocation sequences.
- **Integration (`[BE-TEST-02]`)**: `Testcontainers` with `@Container` for real PostgreSQL/Redis in `*IT.java`; no raw SQL
  string mocks.
- **Isolation**: each method independent; use `@DirtiesContext` sparingly.
- **Coverage**: diagnostic and project-configured; verify risk-weighted critical paths.

## Anti-Patterns

- **No logic in tests**: keep tests declarative; no loops or if/else branching.
- **No `System.out`**: assert; never print.
- **No legacy assertions**: `assertTrue(a == b)` → `assertThat(a).isEqualTo(b)`.
- **No shared state**: tests must be isolated and order-independent.
- **No padded tests**: never add cases for an arbitrary coverage percentage.

## References

- [Full JUnit 5 + Mockito + AssertJ Template](references/junit-template.md)
