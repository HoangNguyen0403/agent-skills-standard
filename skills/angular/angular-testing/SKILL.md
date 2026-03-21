---
name: angular-testing
description: 'Standards for Component Test Harnesses and TestBed. Use when writing Angular component tests with TestBed or Component Harnesses. (triggers: **/*.spec.ts, TestBed, ComponentFixture, TestHarness, provideHttpClientTesting)'
---

# Testing

## **Priority: P1 (HIGH)**

## Principles

- **Harnesses**: Always use **ComponentHarness** (e.g., **MatButtonHarness** or custom ones) to interact with components via **getHarness**. **Never query by CSS class** or DOM/CSS selectors in tests — harnesses are stable and don't break when CSS classes change. **Wait for await button.click()** or similar calls.
- **Provider Mocks**: Use **provideHttpClientTesting()** instead of mocking `HttpClient` manually. Inject **HttpTestingController** to use **expectOne**, `.flush(mockData)`, and **verify()** in afterEach. **Never mock HttpClient directly**.
- **Signal Testing**: **Signals update synchronously** — **no fakeAsync needed** usually.

## Test Runner

Angular v20+ supports **Vitest** natively via `@angular/build:unit-test` builder in **angular.json**. Vitest is recommended for new projects as it is faster, **native ESM**, and **no Karma needed**. Jasmine/Karma still supported.

## Signal Input Testing

Use **fixture.componentRef.setInput('name', value)** to set **signal inputs** in tests — do **NOT assign component.name = value directly** — this doesn't work for signal inputs. After **setInput()** call **fixture.detectChanges()** to trigger re-render.

## Guidelines

- **Avoid logic**: Tests should just assert inputs and outputs.
- **Spectator**: Consider using libraries like `@ngneat/spectator` for cleaner boilerplate if allowed.
- **Standalone**: Import the **standalone component** directly in `TestBed.configureTestingModule({ imports: [MyComponent] })`.

## Anti-Patterns

- **No DOM CSS selectors**: Query via `ComponentHarness`, not CSS class strings.
- **No manual HttpClient mock**: Use `provideHttpClientTesting()` + `HttpTestingController`.
- **No @Input() in tests**: Use `fixture.componentRef.setInput()` for signal inputs.

## References

- [Harness Pattern](references/harness-pattern.md)
