---
name: angular-testing
description: "Standards for Component Test Harnesses and TestBed. Use when writing Angular component tests with TestBed or Component Harnesses. (triggers: **/*.spec.ts, TestBed, ComponentFixture, TestHarness, provideHttpClientTesting)"
---

# Testing

## **Priority: P1 (HIGH)**

## Principles

- **Harnesses**: Always use `ComponentTestHarness` (Angular Material Harnesses) to interact with components. Avoid querying DOM/CSS selectors directly.
- **Provider Mocks**: Use `provideHttpClientTesting()` instead of mocking `HttpClient` manually.
- **Signal Testing**: Signals update synchronously. No need for `fakeAsync` usually.

## Guidelines

- **Avoid logic**: Tests should just assert inputs and outputs.
- **Spectator**: Consider using libraries like `@ngneat/spectator` for cleaner boilerplate if allowed.

## References

- [Harness Pattern](references/harness-pattern.md)


## 🚫 Anti-Patterns

- Do NOT use standard patterns if specific project rules exist.
- Do NOT ignore error handling or edge cases.
