---
name: nestjs-testing
description: "Unit and E2E testing with Jest, mocking strategies, and database isolation. Use when writing NestJS unit tests, E2E tests with supertest, or mock providers. (triggers: **/*.spec.ts, test/**/*.e2e-spec.ts, Test.createTestingModule, supertest, jest, beforeEach)"
---

# NestJS Testing

## **Priority: P2 (MAINTENANCE)**

## Structure

```
src/**/*.spec.ts      # Unit tests (isolated logic)
test/**/*.e2e-spec.ts # E2E tests (full app flows)
```

## Unit Testing

- **Setup**: Use `Test.createTestingModule()` with mocked providers
- **Mocks**: Mock all dependencies via `{ provide: X, useValue: mockX }`
- **Pattern**: AAA (Arrange-Act-Assert)
- **Cleanup**: Call `jest.clearAllMocks()` in `afterEach`

## E2E Testing

- **Database**: Use real test DB (Docker). Never mock DB in E2E.
- **Cleanup**: Mandatory. Use transaction rollback or `TRUNCATE` in `afterEach`.
- **App Init**: Create app in `beforeAll`, close in `afterAll`
- **Guards**: Override via `.overrideGuard(X).useValue({ canActivate: () => true })`

## Strict TypeScript (MANDATORY)

- **No `any`**: Use typed objects, `jest.Mocked<T>`, or `as unknown as T`. Never `as any`.
- **No `eslint-disable`**: Fix underlying type issue. No exceptions.
- **Verify DTO shapes**: Read actual DTO class before writing mock data.
- **Cast Jest matchers**: Nested `expect.anything()` → `expect.anything() as unknown`.
- **No unused vars**: Only declare variables if referenced in assertions or setup.

## Anti-Patterns

- **No Private Tests**: Test via public methods, not `service['privateMethod']`.
  When coverage requires it, use typed helper (see strict-typescript reference).
- **No DB Mocks in E2E**: Use real DB with cleanup. Mocks defeat E2E purpose.
- **No Shared State**: Call `jest.clearAllMocks()` in `afterEach`. Random failures otherwise.
- **No Resource Leaks**: Always close app and DB in `afterAll`.

## References

Setup examples, mocking patterns, E2E flows, test builders, coverage config:
[references/patterns.md](references/patterns.md)

Strict-TypeScript patterns (Jest matchers, mock typing, DTO verification):
[references/strict-typescript-testing.md](references/strict-typescript-testing.md)
