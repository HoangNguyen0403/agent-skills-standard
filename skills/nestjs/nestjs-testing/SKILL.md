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

Universal anti-slop rules (identity fixtures, tautologies, skip/focus, mock echoing, bug-first lock, sleeps, shallow
assertions, coverage): [anti-slop-rules.md](../../common/common-tdd/references/anti-slop-rules.md). Only NestJS deltas
follow.

## Core Rule Anchors

- **`[BE-TEST-01]` Parameterized Tests for Equivalent Cases**: Prefer `test.each` for equivalent inputs or boundary
  permutations; distinct scenarios may stay separate. Reviewers must not demand `test.each` rewrites without a behavioral gap.
- **`[BE-TEST-02]` Ban Brittle DB Mocking & Live DB in Unit Tests (`GUARD-NEST-02`)**: No string-matching mocks of raw SQL. In
  unit-test `Test.createTestingModule`, ban importing live `TypeOrmModule.forRoot`, `MongooseModule.forRoot`,
  `SequelizeModule.forRoot`, or `PrismaModule`. Use `getRepositoryToken()` or `.overrideProvider()`; reserve real databases
  for E2E.
- **`[BE-TEST-04]` Ban Pass-Through Mocks & Controller Echoes (`GUARD-NEST-01`)**: Repositories and services prove contract
  compliance and error mapping. In controller unit tests, ban 1:1 equality with mocked service returns; test validation
  pipes, guards, interceptors, or HTTP response shapes.
- **`[BE-TEST-06]` Real Guards for Authorization**: Never use `overrideGuard` to prove authorization, tenant isolation, or role
  security. Dynamic security tests execute real guard logic with synthetic test identities.

## Structure

```
src/**/*.spec.ts      # Unit tests (isolated logic)
test/**/*.e2e-spec.ts # E2E tests (full app flows)
```

## Unit Testing

- **Setup & Mocks (`[BE-TEST-04]`, `GUARD-NEST-02`)**: `Test.createTestingModule()` with mocked providers; `getRepositoryToken()`
  for repositories; never import live database modules.
- **No Controller Echoes (`GUARD-NEST-01`)**: Assert validation, guards, interceptors, or transformed response contracts.
- **Pattern & Cleanup**: AAA. Call `jest.clearAllMocks()` in `afterEach`. Reuse companion test files.
- **TS Hygiene**: Apply canonical rule A6 (`GUARD-TS-FLOATING-ASSERT`, `GUARD-TS-CATCH-ONLY`,
  `GUARD-TS-CONDITIONAL-ASSERT`, `GUARD-TS-SELF-MOCK`, `GUARD-TS-MOCKED-SUT`).

## E2E Testing

- **Database (`[BE-TEST-02]`)**: Real Docker test DB; never mock the DB in E2E.
- **Cleanup**: Mandatory — transaction rollback or `TRUNCATE` in `afterEach`.
- **App Init**: Create in `beforeAll`, close in `afterAll`.
- **Guards**: `.overrideGuard(X).useValue({ canActivate: () => true })` only for isolated business tests where authorization is
  out of scope; dynamic security tests exercise real guards (`[BE-TEST-06]`).

## Strict TypeScript (MANDATORY)

- **No any**: Use typed DTOs, `jest.Mocked<T>`, or `as unknown as T`. Never `as any`.
- **No eslint-disable**: Fix the underlying type; verify DTO shapes before writing mock data.
- **Cast Jest matchers**: Nested `expect.anything()` -> `expect.anything() as unknown`.

## Anti-Patterns

- **Stylistic rewrites (`[BE-TEST-01]`)**: No `test.each` demands without a behavioral gap.
- **Brittle DB mocks & live DB in unit tests (`[BE-TEST-02]`, `GUARD-NEST-02`)**.
- **Controller & mock echoing (`[BE-TEST-04]`, `GUARD-NEST-01`)**.
- **Bypassed guards as security proof (`[BE-TEST-06]`)**.
- **No Private Tests**: Test via public methods, not `service['privateMethod']`.
- **No DB Mocks in E2E**: Real DB with cleanup; mocks defeat E2E purpose.
- **No Shared State**: `jest.clearAllMocks()` in `afterEach`; close app and DB in `afterAll`.

## References

Setup examples, mocking patterns, E2E flows, test builders, coverage config:
[references/patterns.md](references/patterns.md)

Strict-TypeScript patterns (Jest matchers, mock typing, DTO verification):
[references/strict-typescript-testing.md](references/strict-typescript-testing.md)

Dynamic API security, fuzz testing, and authorization verification:
[../../quality-engineering/quality-engineering-api-fuzz-testing/SKILL.md](../../quality-engineering/quality-engineering-api-fuzz-testing/SKILL.md)
