---
name: common-tdd
description: 'Implements a strict Red-Green-Refactor loop to ensure zero production code is written without a prior failing test. Use when: creating new features, fixing bugs, or expanding test coverage.'
metadata:
  triggers:
    files:
    - '**/*.test.ts'
    - '**/*.spec.ts'
    - '**/*_test.go'
    - '**/*Test.java'
    - '**/*_test.dart'
    - '**/*_spec.rb'
    keywords:
    - tdd
    - unit test
    - write test
    - red green refactor
    - failing test
    - test coverage
---
# Test-Driven Development (TDD) Standard

## **Priority: P0 — Iron Law**

> **NO PRODUCTION CODE WITHOUT FAILING TEST FIRST.**
> Code written before test MUST deleted. Start over.

## **Step 1: RGR Loop (Red-Green-Refactor)**

1. **RED**: Write minimal failing test. **Verify failure** (Expected error, not typo).
2. **GREEN**: Write simplest code to pass. **Verify pass**.
3. **REFACTOR**: Clean up code while staying green.

## **AAA Structure (Mandatory)**

Every test must follow Arrange-Act-Assert:

- **Arrange**: Set up inputs, stubs, mocks, and expected values.
- **Act**: Call single unit under test.
- **Assert**: Verify output and side effects. One logical assertion per test.
 **(See [AAA Example](references/aaa_example.md) for code structure)**.

## **Step 3: Verification & Thresholds**

- **Minimum Coverage**: 80% (Stat/Func/Line), 75% (Branch).
- **Mocks**:
 - Always mock: HTTP, Time/Date, Filesystem.
 - Never mock: Fast internal services (<200ms), pure domain logic.
- See [Test Runner Reference](references/test_runners.md) for environment-specific commands.

## **Step 4: Principles & Mocks**

- **Watch it Fail**: Prove test works before writing code.
- **Minimalism**: Don't add features/options beyond current test (YAGNI).
- **Isolation**: Mock external APIs (HTTP) and Time.
- **Realism**: Prefer real DBs (test containers) and fast internal services (<200ms).

## **Verification Checklist**

- [ ] Every new function/method failing test first?
- [ ] Failure message expected?
- [ ] Minimal code implemented passed?
- [ ] AAA structure followed?
- [ ] Coverage thresholds met?

## **Expert References**

- [AAA Example](references/aaa_example.md)
- [AAA Methodology](references/aaa_methodology.md)
- [Test Runners](references/test_runners.md)
- [TDD Patterns](references/tdd_patterns.md)
- [Testing Anti-Patterns](references/testing_anti_patterns.md)

## Anti-Patterns

- **No test-after**: Writing tests post-implementation defeats TDD. Delete and restart.
- **No assertion-free tests**: test without assert not test.
- **No testing implementation**: Test behavior and contracts, not internal calls.