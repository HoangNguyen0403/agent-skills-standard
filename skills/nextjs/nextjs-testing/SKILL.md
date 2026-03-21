---
name: nextjs-testing
description: 'Unit, Integration, and E2E testing standards for App Router. Use when writing unit, integration, or Playwright E2E tests for a Next.js App Router project. (triggers: **/*.test.{ts, tsx}, cypress/**, tests/**, vitest, playwright, msw, testing-library)'
---

# Next.js Testing

## **Priority: P1 (HIGH)**

## Structure

```text
tests/
├── unit/               # Vitest + RTL
├── e2e/                # Playwright
└── mocks/              # MSW Handlers
```

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
