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

## Test Runner

Angular v20+ supports **Vitest natively** via `@angular/build:unit-test`. Vitest is recommended for new projects (faster, native ESM). Jasmine/Karma still supported.

## Signal Input Testing

Use `fixture.componentRef.setInput('name', value)` to set signal inputs in tests — do NOT assign `@Input()` directly.

## Guidelines

- **Avoid logic**: Tests should just assert inputs and outputs.
- **Spectator**: Consider using libraries like `@ngneat/spectator` for cleaner boilerplate if allowed.

## Anti-Patterns

- **No DOM CSS selectors**: Query via `ComponentHarness`, not CSS class strings.
- **No manual HttpClient mock**: Use `provideHttpClientTesting()` + `HttpTestingController`.
- **No @Input() in tests**: Use `fixture.componentRef.setInput()` for signal inputs.

## References

- [Harness Pattern](references/harness-pattern.md)
