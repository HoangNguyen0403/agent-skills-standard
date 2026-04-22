---
name: java-testing
description: Testing standards using JUnit 5, AssertJ, and Mockito for Java. Use when writing or reviewing Java unit tests, setting up parameterized tests, writing integration tests with Testcontainers, or working with Mockito mocks.
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


## Implementation Guidelines

- **JUnit 5 (Jupiter)**: Use **`@Test`**, **`@BeforeEach`**, and **`@AfterEach`**. Avoid JUnit 4 classes.
- **Fluent Assertions**: Use **`AssertJ (assertThat)`** over JUnit `assertEquals` — enhanced readability.
- **Naming**: Use **`MethodName_State_Result`** or **`@DisplayName("Check if X when Y")`**.
- **Parameterized Tests**: Use **`@ParameterizedTest`** with **`@ValueSource`**, **`@CsvSource`**, or **`@MethodSource`**.
- **Mocking Strategy**: Use **`Mockito`** with `@ExtendWith(MockitoExtension.class)` (JUnit 5). Use **`@Mock`**, **`@Spy`**, and **`@InjectMocks`**. NEVER mock data-only Records.
- **Integration Testing**: Use **`Testcontainers`** with `@Container` annotation for real databases (PostgreSQL/Redis) in integration tests (`*IT.java`).
- **Isolation**: Each test method MUST isolated and independent; use **`@DirtiesContext`** sparingly.
- **AssertJ Chaining**: Chain assertions for clarity: **`assertThat(result).isNotNull().hasSize(2).contains("X")`**.
- **Mocking verification**: Use **`verify(mock, times(1)).method()`** to audit side-effects.
- **Exceptions**: Use **`assertThatThrownBy(() -> ...)`** to verify specific Exception types and messages.

## Anti-Patterns

- **No Logic in Tests**: Keep tests declarative; no loops or if/else branching.
- **No System.out in Tests**: Use assertions; never print to stdout.
- **No Legacy Assertions**: Use `assertThat(a).isEqualTo(b)`, not `assertTrue(a == b)`.
- **No Shared State**: Tests must isolated and order-independent.

## References

- [Full JUnit 5 + Mockito + AssertJ Template](references/junit-template.md)