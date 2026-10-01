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

## Core Philosophy

- Coverage is diagnostic and project-configured; verify risk-weighted critical paths rather than padding code for an arbitrary percentage.

## Core Rule Anchors

- **`[WEB-TEST-01]` Tripartite Naming & AAA Cadence**: Test names must follow `Method_Scenario_ExpectedBehavior` and adhere strictly to Arrange-Act-Assert.
- **`[WEB-TEST-02]` Accessible Harnesses & User Actions**: Query UI components via `ComponentHarness` (e.g. `MatButtonHarness`) or accessible queries; strictly ban raw CSS class selectors or arbitrary DOM traversal.
- **`[WEB-TEST-03]` Ban on Component Private State & Property Inspection**: Never inspect component private state or internal properties directly. Assert on visible DOM state, output events, or harness query outcomes.
- **`[WEB-TEST-04]` HTTP Boundary Mocking**: Intercept HTTP requests at the boundary using `provideHttpClientTesting()` + `HttpTestingController` rather than mocking internal services or methods. Tests must verify true component data flow.
- **`[WEB-TEST-05]` Bug-First Regression Lock**: Every PR resolving a bug ticket or with title `fix(...)` must introduce a test reproducing the defect prior to the fix.

## Implementation Guidelines

- **Query via Component Harnesses (`[WEB-TEST-02]`)**: Use `ComponentHarness` (e.g. `MatButtonHarness`) not CSS selectors. `loader.getHarness(MatButtonHarness)` + `await button.click()`. Never query by CSS class. See [harness pattern](references/harness-pattern.md).
- **Mock HTTP (`[WEB-TEST-04]`)**: Intercept with `provideHttpClientTesting()` + `HttpTestingController` rather than manual mocks. Call `expectOne`, `.flush(mockData)`, and `verify()` in `afterEach`.
- **Signal Inputs (`[WEB-TEST-03]`)**: Use `fixture.componentRef.setInput('name', value)` + `fixture.detectChanges()`, not direct assignment. Signals sync — no `fakeAsync` needed for most signal-driven tests.
- **Test Runner**: Angular v20+ defaults to **Vitest** via `@angular/build:unit-test` (faster, native ESM, no Karma). Configure in `angular.json`. Jasmine/Karma still supported. Standalone: import directly in `TestBed.configureTestingModule({ imports: [StandaloneComponent] })`.

## Anti-Patterns

- **`[WEB-TEST-01]` Vague test names**: Banish non-descriptive names or mixed AAA phases; follow `Method_Scenario_ExpectedBehavior`.
- **`[WEB-TEST-02]` Raw CSS selectors / DOM traversal**: Query via `ComponentHarness` or accessible roles, not CSS class strings.
- **`[WEB-TEST-03]` Testing private state**: Never inspect internal properties or use direct `@Input()` assignment; use `setInput()`.
- **`[WEB-TEST-04]` Manual HttpClient mocks**: Always mock the network boundary with `provideHttpClientTesting()` + `HttpTestingController`.
- **`[WEB-TEST-05]` Bug fix without reproduction test**: Ban bug fix PRs lacking defect regression tests.
- **Coverage padding**: Never write low-value tests solely to meet an arbitrary percentage.

## References

- [Harness Pattern](references/harness-pattern.md)

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- Never query by CSS class
- native ESM

- Additional task-grounded exact anchors: ComponentHarness