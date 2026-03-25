---
name: common-tdd
description: "Enforces Test-Driven Development (Red-Green-Refactor). Use when writing unit tests, implementing TDD, or improving test coverage for any feature. (triggers: **/*.test.ts, **/*.spec.ts, **/*_test.go, **/*Test.java, **/*_test.dart, **/*_spec.rb, tdd, unit test, write test, red green refactor, failing test, test coverage)"
---

# Test-Driven Development (TDD)

## **Priority: P1 (OPERATIONAL)**

## **The Iron Law**

> **NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**
> Code written before the test must be deleted. Start over.

## **The TDD Cycle**

1. **RED**: Write a minimal failing test. **Verify failure** (Expected error, not typo).
2. **GREEN**: Write simplest code to pass. **Verify pass**.
3. **REFACTOR**: Clean up code while staying green.

## **AAA Structure (Mandatory)**

Every test must follow Arrange-Act-Assert:

- **Arrange**: Set up inputs, stubs, mocks, and expected values.
- **Act**: Call the single unit under test.
- **Assert**: Verify output and side effects. One logical assertion per test.
  **(See [AAA Example](references/aaa_example.md) for code structure)**.

## **Coverage Thresholds**

- **Minimum**: 80% (Statements, Functions, Lines), 75% (Branches).
- **Target**: 90% (Statements, Functions, Lines), 85% (Branches).
- Configure in test runner config (e.g. `jest.config.ts`, `vitest.config.ts`). Coverage below minimum is a build-gate failure.

## **Test Runner Commands**

| Language      | Runner            | Watch Mode                  | Coverage                     |
| ------------- | ----------------- | --------------------------- | ---------------------------- |
| TypeScript/JS | `jest` / `vitest` | `vitest --watch`            | `vitest run --coverage`      |
| Go            | `go test`         | `go test -v ./... -count=1` | `go test -cover ./...`       |
| Java          | JUnit 5 + Maven   | `mvn test`                  | `mvn verify -P coverage`     |
| Kotlin        | JUnit 5 + Kotest  | `./gradlew test`            | `./gradlew jacocoTestReport` |
| Dart/Flutter  | `flutter test`    | `flutter test --watch`      | `flutter test --coverage`    |

## **Core Principles**

- **Watch it Fail**: Prove the test works.
- **Minimalism**: Don't add features/options beyond current test (YAGNI).
- **Real Over Mock**: Prefer real dependencies unless slow/flaky.
- **One Reason to Fail**: Test one behavior per test.
- **Descriptive Names**: e.g. `should_returnError_when_emailIsInvalid`.

## **When to Use Mocks vs Real Dependencies**

- **Database**: Real DB (test container) or in-memory; mock as last resort.
- **HTTP/External APIs**: Always mock.
- **Filesystem**: Use temp dir; mock for unit isolation.
- **Time/Dates**: Always mock/control.
- **Internal services**: Real if fast (<200ms); mock if cross-network.

## **Verification Checklist**

- [ ] Every new function/method has a failing test first?
- [ ] Failure message was expected?
- [ ] Minimal code implemented passed?
- [ ] AAA structure followed?
- [ ] Coverage thresholds met?

## **Expert References**

- [AAA Example](references/aaa_example.md)
- [TDD Patterns](references/tdd_patterns.md)
- [Testing Anti-Patterns](references/testing_anti_patterns.md)


## Anti-Patterns

- **No test-after**: Writing tests post-implementation defeats TDD. Delete and restart.
- **No assertion-free tests**: A test without an assert is not a test.
- **No testing implementation**: Test behavior and contracts, not internal calls.
