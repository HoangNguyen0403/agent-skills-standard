---
name: nextjs-testing
description: Write Jest or Vitest unit tests with React Testing Library and Playwright E2E tests for Next.js projects. Use when testing components with RTL, mocking APIs with MSW, or creating Playwright user flow tests.
metadata:
  triggers:
    files:
    - '**/*.test.{ts,tsx}'
    - 'cypress/**'
    - 'tests/**'
    - 'jest.config.*'
    keywords:
    - vitest
    - playwright
    - msw
    - testing-library
---
# Next.js Testing

## **Priority: P1 (HIGH)**

## Core Rule Anchors

- **`[WEB-TEST-01..05]` Core Web Standards**: Tripartite naming (`Method_Scenario_ExpectedBehavior`), accessible roles (`getByRole`), no prop/state inspection, MSW network mocking, and bug-first regression reproduction.
- **`[WEB-TEST-06]` Ban on Static Artifact Pinning & Twin `.test.js` Suites**: Never assert on static `print(GQL)` query text or `.loc.source.body` substring matches (`GUARD-TS-STATIC-PINNING`); test the hook or query component. Never loop `Object.keys(locales/*.json)` or assert `typeof en[k] === 'string'`; assert user-visible rendered text via `findByText`/`getByRole`. Never create `<stem>.test.ts(x)` alongside legacy `<stem>.test.js(x)` (`GUARD-TS-DUAL-EXT`); migrate legacy files. Ban pass-through mock echoes (`expect(wrapper()).toBe(X)` without business transformations).

## Test Runner & Workflow

- **Existing projects (Pages Router / legacy)**: Use **Jest** (`jest@29` + `babel-jest` + `jest-environment-jsdom`).
- **New projects (App Router)**: Use **Vitest** for speed and native ESM support.
- **E2E Testing**: Use **Playwright** for full user flow validation (login, checkout).

## Implementation Guidelines

- **Unit & Component Testing**: Use **Jest** or **Vitest** with **React Testing Library (RTL)**. Follow Arrange-Act-Assert (AAA). Check for existing companion test files before creating new ones.
- **Interactions & Selectors**: Use `userEvent` (async) for user actions. Favor `getByRole` / `findByRole` to test accessibility; `data-testid` only as fallback.
- **Networking**: Intercept API boundaries using **MSW** handlers for isolated component/unit tests to guarantee deterministic fixtures; reserve real network for dedicated Playwright E2E suites.
- **TS Hygiene Invariants**: Always `await` promise assertions (`GUARD-TS-FLOATING-ASSERT`). Never assert only inside `catch` without an explicit failure guard in `try` (`GUARD-TS-CATCH-ONLY`). Never wrap assertions in unverified conditionals without `expect.hasAssertions()` (`GUARD-TS-CONDITIONAL-ASSERT`). Ban self-mocking and mocking the SUT (`GUARD-TS-SELF-MOCK`).
- **No Hard Timeouts**: Ban `setTimeout` in unit tests (`GUARD-REACT-02`); ban `page.waitForTimeout` hard sleeps in Playwright (`GUARD-E2E-01`). Use web-first assertions (`await expect(locator).toBeVisible()`) or `findBy*`.
- **Reporting**: Ensure tests generate JSON coverage reports for CI gates. Verify risk-weighted behavioral paths rather than padding code to reach arbitrary percentage targets.

## Anti-Patterns

- **`[WEB-TEST-06]` Static pinning & twin suites**: Ban `print(GQL)` regex pinning (`GUARD-TS-STATIC-PINNING`), locale JSON key loops, twin `.test.js` sidecars (`GUARD-TS-DUAL-EXT`), and pass-through mock echoes.
- **TS hygiene violations**: Ban floating promises (`GUARD-TS-FLOATING-ASSERT`), catch-only tests (`GUARD-TS-CATCH-ONLY`), unverified conditionals (`GUARD-TS-CONDITIONAL-ASSERT`), and self-mocking (`GUARD-TS-SELF-MOCK`).
- **Hard sleep calls (`GUARD-REACT-02` / `GUARD-E2E-01`)**: Ban `setTimeout` in unit tests and `page.waitForTimeout` in E2E.
- **No unisolated network in unit tests**: Use MSW handlers; do not call external network in unit suites.
- **No implementation testing**: Test user behavior, not internal component methods.
- **No global state leakage**: Reset MSW handlers and mocks after each test.

## References

- [Next.js Test Patterns](references/implementation.md)
