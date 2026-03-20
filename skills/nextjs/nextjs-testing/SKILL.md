---
name: nextjs-testing
description: "Unit, Integration, and E2E testing standards for App Router. Use when writing unit, integration, or Playwright E2E tests for a Next.js App Router project. (triggers: **/*.test.{ts, tsx}, cypress/**, tests/**, vitest, playwright, msw, testing-library)"
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

- **Unit Testing**: Use **Vitest** for speed and React Testing Library for components.
- **E2E Testing**: Use **Playwright** for full-stack App Router validation.
- **MSW**: Mock API boundaries using **Mock Service Worker** (server + client).
- **RSC Testing**: Test Server Components via unit tests or full E2E flow.
- **Data Isolation**: Use isolation strategies for test databases/cache.
- **CI reporting**: Ensure JSON/JUnit output for automated analysis.

## Anti-Patterns

- **No real network usage in tests**: Always use MSW handlers or mocks.
- **No implementation testing**: Test user behavior, not internal methods.
- **No heavy E2E for unit logic**: Use Vitest for isolated logic tests.
- **No global state leakage**: Reset MSW handlers and mocks after each test.

## References

- [Next.js Test Patterns](references/implementation.md)
