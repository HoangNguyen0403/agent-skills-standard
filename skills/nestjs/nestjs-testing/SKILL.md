---
name: nestjs-testing
description: Write Unit and E2E tests with Jest, mocking strategies, and database isolation in NestJS. Use when writing NestJS unit tests, E2E tests with supertest, or mock providers.
metadata:
  triggers:
    files:
    - '**/*.spec.ts'
    - 'test/**/*.e2e-spec.ts'
    - 'Test.createTestingModule'
    keywords:
    - supertest
    - jest
    - beforeEach
---
# NestJS Testing

## **Priority: P2 (MEDIUM)**
## Core Rule Anchors

- **`[BE-TEST-01]` Parameterized Tests for Equivalent Cases**: Prefer `test.each` when methods have multiple equivalent inputs or boundary permutations. Distinct scenarios may stay separate test functions. Reviewers must not demand parameterized rewrites without a behavioral gap.
- **`[BE-TEST-02]` Ban on Brittle DB Mock String Matching**: Do not use string-matching mocks for raw SQL queries. Test pure domain calculations directly, or use a real test DB for repository verification.
- **`[BE-TEST-03]` Ban on Shallow Assertions**: Never assert only `expect(res).toBeDefined()` without inspecting payload fields, status codes, and invariants.
- **`[BE-TEST-04]` Ban on Pass-Through Interface Mocks**: Repositories and service handlers must test contract compliance and error mapping. Ban 1:1 pass-through mock echoing without contract assertions.
- **`[BE-TEST-05]` Bug-First Regression Lock**: Every PR fixing a bug ticket or with title `fix(...)` must introduce a test reproducing the defect prior to the fix.

## Structure

```
src/**/*.spec.ts      # Unit tests (isolated logic)
test/**/*.e2e-spec.ts # E2E tests (full app flows)
```

## Unit Testing

- **Setup & Mocks (`[BE-TEST-04]`)**: Use `Test.createTestingModule()` with mocked providers. Ban 1:1 pass-through mock echoing.
- **Pattern & Cleanup**: AAA (Arrange-Act-Assert). Call `jest.clearAllMocks()` in `afterEach`.
- **Assertions (`[BE-TEST-03]`)**: Avoid shallow assertions like `expect(res).toBeDefined()`. Verify payload invariants.
- **Coverage**: Coverage is diagnostic and project-configured; verify risk-weighted critical paths rather than padding code for an arbitrary percentage.

## E2E Testing

- **Database (`[BE-TEST-02]`)**: Use real test DB (Docker). Never mock DB in E2E.
- **Cleanup**: Mandatory. Use transaction rollback or `TRUNCATE` in `afterEach`.
- **App Init**: Create app in `beforeAll`, close in `afterAll`.
- **Guards**: Override via `.overrideGuard(X).useValue({ canActivate: () => true })`.

## Strict TypeScript (MANDATORY)

- **No `any`**: Use typed objects, `jest.Mocked<T>`, or `as unknown as T`. Never `as any`.
- **No `eslint-disable`**: Fix underlying type issue. No exceptions.
- **Verify DTO shapes**: Read actual DTO class before writing mock data.
- **Cast Jest matchers**: Nested `expect.anything()` → `expect.anything() as unknown`.
- **No unused vars**: Only declare variables if referenced in assertions or setup.

## Anti-Patterns

- **`[BE-TEST-01]` Stylistic parameterized rewrites**: Do not demand `test.each` rewrites without a behavioral gap.
- **`[BE-TEST-02]` Brittle DB mock string matching**: Do not match SQL strings in mocks; use real DB.
- **`[BE-TEST-03]` Shallow assertions**: Ban shallow assertions like `expect(res).toBeDefined()`.
- **`[BE-TEST-04]` Pass-through mock echoing**: Ban 1:1 mock echoing without contract assertions.
- **`[BE-TEST-05]` Bug fix without reproduction test**: Ban bug fixes without a reproduction test.
- **No Private Tests**: Test via public methods, not service['privateMethod']. Never write tests for private methods solely to satisfy coverage targets.
- **No DB Mocks in E2E**: Use real DB with cleanup. Mocks defeat E2E purpose.
- **No Shared State**: Call `jest.clearAllMocks()` in `afterEach`. Random failures otherwise.
- **No Resource Leaks**: Always close app and DB in `afterAll`.
## References

Setup examples, mocking patterns, E2E flows, test builders, coverage config:
[references/patterns.md](references/patterns.md)

Strict-TypeScript patterns (Jest matchers, mock typing, DTO verification):
[references/strict-typescript-testing.md](references/strict-typescript-testing.md)