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

## Test Runner

- **Existing projects (Pages Router / legacy stack)**: Use **Jest** (`jest@29` + `babel-jest` + `jest-environment-jsdom`).
- **New projects (App Router)**: Use **Vitest** for speed and native ESM support.

## Workflow: Test New Feature

1. **Write unit tests** — Use Jest (or Vitest for new projects) + RTL with Arrange-Act-Assert pattern.
2. **Mock APIs for unit/component tests** — Set up MSW handlers for fetch boundaries in isolated tests where network determinism is required.
3. **Test interactions** — Use `userEvent` (async) for clicks, typing, form submissions.
4. **Add E2E tests** — Use Playwright for critical user flows (login, checkout).
5. **Verify coverage** — Rely on risk-weighted behavioral verification and project-configured CI coverage gates; never write padding tests to hit an arbitrary percentage.

## Component Test Example

See [implementation examples](references/implementation.md)

## Implementation Guidelines

- **Unit Testing**: Use **Jest** (existing projects) or **Vitest** (new projects) with **React Testing Library (RTL)**. Follow **Arrange-Act-Assert (AAA)** patterns.
- **E2E Testing**: Use **Playwright** for full user flow validation. Focus on critical flows (Login, Checkout).
- **Networking**: Intercept API boundaries using **Mock Service Worker (MSW)** for isolated component/unit tests to guarantee deterministic fixtures; allow intentional real-network or staging coverage in dedicated Playwright E2E/contract suites. Ensure **`server` and `browser` handlers** are correctly configured.
- **Interactions**: Use **`userEvent` (async)** to simulate user actions: `await user.click(button)`.
- **Selectors**: Favor **`getByRole`** / **`findByRole`** to test accessibility. Use **`data-testid`** only as fallback.
- **Environment**: For Jest, use `jest-environment-jsdom`. For Vitest, configure `vitest.config.ts` with `jsdom` or `happy-dom`.
- **Reporting**: Ensure tests generate **JSON coverage reports** for CI gates. Verify risk-weighted behavioral paths rather than padding code to reach arbitrary percentage targets.

## Anti-Patterns

- **No unisolated network in unit tests**: Use MSW handlers or fakes for unit/component tests; do not perform uncontrolled external network calls outside dedicated E2E suites.
- **No implementation testing**: Test user behavior, not internal methods.
- **No heavy E2E for unit logic**: Use Jest/Vitest for isolated logic tests.
- **No global state leakage**: Reset MSW handlers and mocks after each test.

## References

- [Next.js Test Patterns](references/implementation.md)