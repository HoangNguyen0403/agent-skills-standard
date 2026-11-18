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

Universal anti-slop rules (identity fixtures, tautologies, skip/focus, mock echoing, bug-first lock, sleeps, shallow
assertions, coverage): [anti-slop-rules.md](../../common/common-tdd/references/anti-slop-rules.md). Only PHP deltas follow.

## Stack Deltas

- **PHPUnit / Pest**: extend `TestCase`; organize into `Unit/`, `Integration/`, `Feature/`; Pest uses `it()` and
  `expect()`.
- **Strict assertions**: `assertSame` (`===`) over `assertEquals` to avoid type coercion; also `assertCount()` and
  `assertMatchesRegularExpression()`.
- **Data providers (`[BE-TEST-01]`)**: `#[DataProvider('statusProvider')]` (PHPUnit 10+) or `dataset` (Pest); providers
  are static methods returning test-case arrays; equivalent inputs only, distinct scenarios may stay separate.
- **Mocking (`[BE-TEST-04]`)**: `createMock()` for boundaries; tests independent and repeatable; DB tests use transactions
  or `SQLite :memory:`.
- **Coverage**: diagnostic and project-configured; verify risk-weighted critical paths.

## Anti-Patterns

- **No private-method tests**: test through the public interface only.
- **No over-mocking**: mock external boundaries, not internals.
- **No real network or DB in unit tests**: use in-memory databases or mocks.
- **No coverage chasing**: prioritize meaningful assertions over an arbitrary percentage.

## References

- [Testing Patterns & Mocks](references/implementation.md)
