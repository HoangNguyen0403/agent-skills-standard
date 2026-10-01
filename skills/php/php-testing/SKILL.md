---
name: php-testing
description: Write unit and integration tests for PHP applications with PHPUnit and Pest. Use when writing PHPUnit unit tests or integration tests for PHP applications.
metadata:
  triggers:
    files:
    - 'tests/**/*.php'
    - 'phpunit.xml'
    keywords:
    - phpunit
    - pest
    - mock
    - assert
    - tdd
---
# PHP Testing

## **Priority: P1 (HIGH)**

## Core Rule Anchors

- **`[BE-TEST-01]` Parameterized Tests for Equivalent Cases**: Prefer `#[DataProvider]` (PHPUnit) or `dataset` (Pest) when methods have multiple equivalent inputs or boundary permutations. Distinct scenarios may stay separate test methods. Reviewers must not demand parameterized rewrites without a behavioral gap.
- **`[BE-TEST-02]` Ban on Brittle DB Mock String Matching**: Do not use string-matching mocks for raw SQL queries. Test pure domain calculations directly, or use SQLite in-memory / real DB for database repository verification.
- **`[BE-TEST-03]` Ban on Shallow Assertions**: Never assert only `assertNotNull($result)` without inspecting domain fields, status codes, and invariants.
- **`[BE-TEST-04]` Ban on Pass-Through Interface Mocks**: Repositories and service handlers must test contract compliance and error mapping. Ban 1:1 pass-through mock echoing without contract assertions.
- **`[BE-TEST-05]` Bug-First Regression Lock**: Every PR fixing a bug ticket or with title `fix(...)` must introduce a test reproducing the defect prior to the fix.

## Write Tests with PHPUnit and Pest

- **Standards**: Use **`PHPUnit`** (9/10+) or **`Pest`**. Organize into **`Unit/`**, **`Integration/`**, and **`Feature/`**. Class names should extend **`TestCase`**.
- **TDD Workflow (`[BE-TEST-05]`)**: Follow **Red-Green-Refactor**. Write failing test first, implement minimal logic, then refactor.
- **Fluent Assertions (`[BE-TEST-03]`)**: Use **`assertSame`** (`===`) over `assertEquals` to avoid type coercion. Also use **`assertCount()`** and **`assertMatchesRegularExpression()`**. Avoid shallow assertions.
- **Data Providers (`[BE-TEST-01]`)**: Use **`#[DataProvider('statusProvider')]`** (PHPUnit 10+) or **`dataset`** (Pest).
- **Mocking & Isolation (`[BE-TEST-02]`, `[BE-TEST-04]`)**: Use **`createMock()`** for dependencies; ban 1:1 pass-through mock echoing. Ensure tests are independent and repeatable. DB tests must use **`Transactions`** or **`SQLite :memory:`**.
- **Coverage**: Coverage is diagnostic and project-configured; verify risk-weighted critical paths rather than padding code for an arbitrary percentage.

## Anti-Patterns

- **`[BE-TEST-01]` Stylistic parameterized rewrites**: Do not demand data provider rewrites without a behavioral gap.
- **`[BE-TEST-02]` Brittle DB mock string matching**: Do not match SQL strings in mocks.
- **`[BE-TEST-03]` Shallow assertions**: Never assert only `assertNotNull` without domain payload checks.
- **`[BE-TEST-04]` Pass-through mock echoing**: Ban 1:1 mock echoing without contract assertions.
- **`[BE-TEST-05]` Bug fix without reproduction test**: Ban bug fixes without a reproduction test.
- **No testing private methods**: Test through public interfaces only.
- **No over-mocking internals**: Mock only external boundaries.
- **No real network/DB in unit tests**: Use in-memory databases or mocks.
- **No coverage-metric chasing**: Prioritize meaningful assertions over arbitrary percentage metrics.
## References

- [Testing Patterns & Mocks](references/implementation.md)

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- Define a static method returning test cases as arrays,method
- independent
- type coercion
