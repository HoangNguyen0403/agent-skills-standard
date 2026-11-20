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

Universal anti-slop rules (naming, identity fixtures, tautologies, skip/focus, mock echoing, bug-first lock, sleeps,
shallow assertions, coverage): [anti-slop-rules.md](../../common/common-tdd/references/anti-slop-rules.md). Only Next.js
deltas follow.

## Core Rule Anchors

- **`[WEB-TEST-02..04]` Core Web Standards**: Accessible roles (`getByRole`), no prop/state inspection, and MSW network mocking
  are owned by the canonical web rules in `react-testing`; naming is canonical A11.
- **`[WEB-TEST-06]` Ban Static Artifact Pinning & Twin `.test.js` Suites**: Never assert static `print(GQL)` query text or
  `.loc.source.body` substrings (`GUARD-TS-STATIC-PINNING`); test the hook or query component. Never loop
  `Object.keys(locales/*.json)` or assert `typeof en[k] === 'string'`; assert rendered text via `findByText`/`getByRole`.
  Never keep `<stem>.test.ts(x)` beside a legacy `<stem>.test.js(x)` (`GUARD-TS-DUAL-EXT`); migrate it. Ban pass-through mock
  echoes (`expect(wrapper()).toBe(X)` without business transformations).

## Test Runner & Workflow

- **Existing projects (Pages Router / legacy)**: **Jest** (`jest@29` + `babel-jest` + `jest-environment-jsdom`).
- **New projects (App Router)**: **Vitest** for speed and native ESM.
- **E2E Testing**: **Playwright** for full user flows (login, checkout).

## Implementation Guidelines

- **Unit & Component**: Jest or Vitest with RTL, AAA; reuse existing companion test files.
- **Interactions & Selectors**: `userEvent` (async) for actions; `getByRole`/`findByRole` for accessibility; `data-testid` only
  as fallback.
- **Networking**: MSW handlers at API boundaries for deterministic component/unit tests; real network only in Playwright E2E.
- **TS Hygiene**: Apply canonical rule A6 (`GUARD-TS-FLOATING-ASSERT`, `GUARD-TS-CATCH-ONLY`,
  `GUARD-TS-CONDITIONAL-ASSERT`, `GUARD-TS-SELF-MOCK`).
- **No Hard Timeouts**: Ban `setTimeout` in unit tests (`GUARD-REACT-02`); ban `page.waitForTimeout` in Playwright
  (`GUARD-E2E-01`). Use web-first assertions (`await expect(locator).toBeVisible()`) or `findBy*`.
- **Reporting**: Generate JSON coverage reports for CI gates; verify risk-weighted behavioral paths, not percentage padding.

## Anti-Patterns

- **Static pinning & twin suites (`[WEB-TEST-06]`)**: `GUARD-TS-STATIC-PINNING` regex pinning, locale JSON key loops,
  `GUARD-TS-DUAL-EXT` sidecars, and pass-through mock echoes.
- **Hard sleep calls (`GUARD-REACT-02` / `GUARD-E2E-01`)**: `setTimeout` in unit tests, `page.waitForTimeout` in E2E.
- **Unisolated network in unit tests**: Use MSW handlers; no external network.
- **Implementation testing**: Test user behavior, not internal component methods.
- **Global state leakage**: Reset MSW handlers and mocks after each test.

## References

- [Next.js Test Patterns](references/implementation.md)
