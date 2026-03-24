---
name: nextjs-testing
description: "Write Vitest unit tests with React Testing Library and Playwright E2E tests for Next.js App Router projects. Use when testing components with RTL, mocking APIs with MSW, or creating Playwright user flow tests. (triggers: **/*.test.{ts,tsx}, cypress/**, tests/**, vitest, playwright, msw, testing-library)"
---

# Next.js Testing

## **Priority: P1 (HIGH)**

## Workflow: Test a New Feature

1. **Write unit tests** — Use Vitest + RTL with Arrange-Act-Assert pattern.
2. **Mock APIs** — Set up MSW handlers for all fetch boundaries.
3. **Test interactions** — Use `userEvent` (async) for clicks, typing, form submissions.
4. **Add E2E tests** — Use Playwright for critical user flows (login, checkout).
5. **Verify coverage** — Aim for 80%+ on core libraries via JSON coverage reports.

## Component Test Example

See [implementation examples](references/implementation.md)

## Structure

See [implementation examples](references/implementation.md)

## Implementation Guidelines

- **Unit Testing**: Use **Vitest** for speed and **React Testing Library (RTL)** for component behavior. Follow **Arrange-Act-Assert (AAA)** patterns.
- **E2E Testing**: Use **Playwright** for full-stack **App Router** validation. Focus on **User Flows** (e.g., Login, Checkout).
- **Networking**: Mock all internal/external API boundaries using **Mock Service Worker (MSW)**. Ensure **`server` and `browser` handlers** are correctly configured.
- **RSC Testing**: Test **React Server Components (RSC)** using the same patterns as libraries (SSR-compatible tests). Prefer **E2E tests** for complex async data-fetching logic.
- **Interactions**: Use **`userEvent` (async)** to simulate user actions: `await user.click(button)`.
- **Selectors**: Favor **`getByRole`** / **`findByRole`** to test accessibility. Use **`data-testid`** only as a fallback.
- **Environment**: Configure **`vitest.config.ts`** with **`jsdom`** or **`happy-dom`** for component tests.
- **Reporting**: Ensure tests generate **JSON coverage reports** for CI gates. Aim for **80%+ coverage** on core libraries.

## Anti-Patterns

- **No real network usage in tests**: Always use MSW handlers or mocks.
- **No implementation testing**: Test user behavior, not internal methods.
- **No heavy E2E for unit logic**: Use Vitest for isolated logic tests.
- **No global state leakage**: Reset MSW handlers and mocks after each test.

## References

- [Next.js Test Patterns](references/implementation.md)
