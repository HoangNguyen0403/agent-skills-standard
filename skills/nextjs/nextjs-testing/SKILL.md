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
2. **Mock APIs** — Set up MSW handlers for all fetch boundaries.
3. **Test interactions** — Use `userEvent` (async) for clicks, typing, form submissions.
4. **Add E2E tests** — Use Playwright for critical user flows (login, checkout).
5. **Verify coverage** — Aim for 80%+ on core libraries via JSON coverage reports.

## Component Test Example

See [implementation examples](references/implementation.md)

## Implementation Guidelines

- **Unit Testing**: Use **Jest** (existing projects) or **Vitest** (new projects) with **React Testing Library (RTL)**. Follow **Arrange-Act-Assert (AAA)** patterns.
- **E2E Testing**: Use **Playwright** for full user flow validation. Focus on critical flows (Login, Checkout).
- **Networking**: Mock all internal/external API boundaries using **Mock Service Worker (MSW)**. Ensure **`server` and `browser` handlers** correctly configured.
- **Interactions**: Use **`userEvent` (async)** to simulate user actions: `await user.click(button)`.
- **Selectors**: Favor **`getByRole`** / **`findByRole`** to test accessibility. Use **`data-testid`** only as fallback.
- **Environment**: For Jest, use `jest-environment-jsdom`. For Vitest, configure `vitest.config.ts` with `jsdom` or `happy-dom`.
- **Reporting**: Ensure tests generate **JSON coverage reports** for CI gates. Aim for **80%+ coverage** on core libraries.

## Anti-Patterns

- **No real network usage in tests**: Always use MSW handlers or mocks.
- **No implementation testing**: Test user behavior, not internal methods.
- **No heavy E2E for unit logic**: Use Jest/Vitest for isolated logic tests.
- **No global state leakage**: Reset MSW handlers and mocks after each test.

## References

- [Next.js Test Patterns](references/implementation.md)