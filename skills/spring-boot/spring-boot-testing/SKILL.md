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

Universal anti-slop rules (identity fixtures, tautologies, skip/focus, mock echoing, bug-first lock, sleeps, shallow
assertions, coverage): [anti-slop-rules.md](../../common/common-tdd/references/anti-slop-rules.md). Only Spring deltas
follow.

## TDD Workflow

1. **Red**: write the failing test (e.g., `returns 404`).
2. **Green**: implement minimal code to pass.
3. **Refactor**: clean up while tests stay green.
4. **Coverage**: diagnostic and project-configured; verify risk-weighted critical paths.

## Slice And Integration Deltas

- **Web slice**: `@WebMvcTest` loads only the web layer; `MockMvc` for HTTP assertions; mock service dependencies with
  `@MockBean`.
- **Data slice**: `@DataJpaTest`; **full context**: `@SpringBootTest`.
- **Real infrastructure (`[BE-TEST-02]`)**: `Testcontainers` for DB and queues; avoid H2/embedded databases.
- **External HTTP**: `WireMock`; never make real network calls in tests.
- **Assertions (`[BE-TEST-03]`)**: AssertJ `assertThat` over JUnit assertions; assert domain fields and status codes, not
  mere existence.
- **Isolation (`[BE-TEST-04]`)**: don't put `@MockBean` in base classes; it reloads context per test.

## References

- [Implementation Examples](references/implementation.md)
