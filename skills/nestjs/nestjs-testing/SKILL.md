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
- **`[BE-TEST-02]` Ban on Brittle DB Mocking & Live DB in Unit Tests (`GUARD-NEST-02`)**: Do not use string-matching mocks for raw SQL queries. In unit-test `Test.createTestingModule`, ban importing live `TypeOrmModule.forRoot`, `MongooseModule.forRoot`, `SequelizeModule.forRoot`, or `PrismaModule`. Require `getRepositoryToken()` or `.overrideProvider()` mocks for unit tests and reserve real databases for E2E.
- **`[BE-TEST-03]` Ban on Shallow Assertions**: Never assert only `expect(res).toBeDefined()` without inspecting payload fields, status codes, and invariants.
- **`[BE-TEST-04]` Ban on Pass-Through Interface Mocks & Controller Echoes (`GUARD-NEST-01`)**: Repositories and service handlers must test contract compliance and error mapping. Ban 1:1 pass-through mock echoing. In controller unit tests, ban asserting 1:1 equality with mocked service returns; test validation pipes, guards, interceptors, or HTTP response shapes.
- **`[BE-TEST-05]` Bug-First Regression Lock**: Every PR fixing a bug ticket or with title `fix(...)` must introduce a test reproducing the defect prior to the fix.
- **`[BE-TEST-06]` Real Guards for Authorization Verification**: Never use bypassed guards (`overrideGuard`) to prove authorization, tenant isolation, or role security. Dynamic security tests must execute real guard logic with synthetic test identities.

## Structure

```
src/**/*.spec.ts      # Unit tests (isolated logic)
test/**/*.e2e-spec.ts # E2E tests (full app flows)
```

## Unit Testing

- **Setup & Mocks (`[BE-TEST-04]`, `GUARD-NEST-02`)**: Use `Test.createTestingModule()` with mocked providers. Mock repositories with `getRepositoryToken()`; never import live database modules (`GUARD-NEST-02`).
- **No Controller Echoes (`GUARD-NEST-01`)**: Test validation pipes, guards, interceptors, or transformed response contracts rather than asserting identical mocked service returns.
- **Pattern & Cleanup**: AAA (Arrange-Act-Assert). Call `jest.clearAllMocks()` in `afterEach`. Check companion files before creating new ones.
- **TS Hygiene**: Always `await` promise assertions (`GUARD-TS-FLOATING-ASSERT`). Never assert only inside `catch` without an explicit failure guard in `try` (`GUARD-TS-CATCH-ONLY`). Never wrap assertions in unverified conditionals without `expect.hasAssertions()` (`GUARD-TS-CONDITIONAL-ASSERT`). Ban self-mocking and mocking SUT (`GUARD-TS-SELF-MOCK`, `GUARD-TS-MOCKED-SUT`).

## E2E Testing

- **Database (`[BE-TEST-02]`)**: Use real test DB (Docker). Never mock DB in E2E.
- **Cleanup**: Mandatory. Use transaction rollback or `TRUNCATE` in `afterEach`.
- **App Init**: Create app in `beforeAll`, close in `afterAll`.
- **Guards**: Override via `.overrideGuard(X).useValue({ canActivate: () => true })` ONLY for isolated business tests where authorization is out of scope. Dynamic security tests must exercise real guards (`[BE-TEST-06]`).

## Strict TypeScript (MANDATORY)

- **No any**: Use typed DTOs, `jest.Mocked<T>`, or `as unknown as T`. Never `as any`.
- **No eslint-disable**: Fix underlying type issue. Verify DTO shapes before writing mock data.
- **Cast Jest matchers**: Nested `expect.anything()` -> `expect.anything() as unknown`.

## Anti-Patterns

- **`[BE-TEST-01]` Stylistic rewrites**: Do not demand `test.each` rewrites without a behavioral gap.
- **`[BE-TEST-02]` Brittle DB mocks & live DB in unit (`GUARD-NEST-02`)**: Ban SQL string matching in mocks. Ban live DB module imports in unit tests.
- **`[BE-TEST-03]` Shallow assertions**: Ban shallow assertions like `expect(res).toBeDefined()`.
- **`[BE-TEST-04]` Controller & mock echoing (`GUARD-NEST-01`)**: Ban 1:1 mock echoing and controller pass-through echoes.
- **`[BE-TEST-05]` Bug fix without reproduction test**: Ban bug fixes without a reproduction test.
- **`[BE-TEST-06]` Bypassed guards for security proof**: Ban overridden guards as security verification.
- **TS hygiene violations**: Ban floating promises (`GUARD-TS-FLOATING-ASSERT`), catch-only tests (`GUARD-TS-CATCH-ONLY`), unverified conditionals (`GUARD-TS-CONDITIONAL-ASSERT`), and self-mocking (`GUARD-TS-SELF-MOCK`, `GUARD-TS-MOCKED-SUT`).
- **No Private Tests**: Test via public methods, not `service['privateMethod']`.
- **No DB Mocks in E2E**: Use real DB with cleanup. Mocks defeat E2E purpose.
- **No Shared State**: Call `jest.clearAllMocks()` in `afterEach`. Always close app and DB in `afterAll`.

## References

Setup examples, mocking patterns, E2E flows, test builders, coverage config:
[references/patterns.md](references/patterns.md)

Strict-TypeScript patterns (Jest matchers, mock typing, DTO verification):
[references/strict-typescript-testing.md](references/strict-typescript-testing.md)

Dynamic API security, fuzz testing, and authorization verification:
[../../quality-engineering/quality-engineering-api-fuzz-testing/SKILL.md](../../quality-engineering/quality-engineering-api-fuzz-testing/SKILL.md)
