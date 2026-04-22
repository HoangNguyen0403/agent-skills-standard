---
name: angular-testing
description: Write Angular component tests using TestBed, ComponentHarness, and HttpTestingController with proper signal input handling. Use when writing component tests, mocking HTTP calls, or testing signal inputs.
metadata:
  triggers:
    files:
    - '**/*.spec.ts'
    keywords:
    - TestBed
    - ComponentFixture
    - TestHarness
    - provideHttpClientTesting
---
# Testing

## **Priority: P1 (HIGH)**

## 1. Query via Component Harnesses

- Use `ComponentHarness` (e.g., `MatButtonHarness`) not CSS selectors — stable across DOM changes.
- `loader.getHarness(MatButtonHarness)` + `await button.click()`. Never query by CSS class.

See [harness pattern](references/harness-pattern.md) for ComponentHarness examples.

## 2. Mock HTTP with HttpTestingController

- `provideHttpClientTesting()` not manual HttpClient mocks.
- Call `expectOne`, `.flush(mockData)`, `verify()` in `afterEach`.

See [harness pattern](references/harness-pattern.md) for HttpTestingController examples.

## 3. Test Signal Inputs Correctly

- `fixture.componentRef.setInput('name', value)` — not direct assignment.
- `fixture.detectChanges()` after `setInput()`.
- Signals sync — no `fakeAsync` needed for most signal-driven tests.

## 4. Choose Your Test Runner

- Angular v20+: **Vitest** via `@angular/build:unit-test` — faster, native ESM, no Karma. Configure in `angular.json`.
- Jasmine/Karma still supported for existing projects.
- Standalone: import directly in `TestBed.configureTestingModule({ imports: [StandaloneComponent] })`.

## Anti-Patterns

- **No DOM CSS selectors**: Query via `ComponentHarness`, not CSS class strings.
- **No manual HttpClient mock**: Use `provideHttpClientTesting()` + `HttpTestingController`.
- **No direct @Input() assignment**: Use `fixture.componentRef.setInput()` for signal inputs.

## References

- [Harness Pattern](references/harness-pattern.md)
