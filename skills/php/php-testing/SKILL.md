---
name: php-testing
description: "Unit and integration testing standards for PHP applications. Use when writing PHPUnit unit tests or integration tests for PHP applications. (triggers: tests/**/*.php, phpunit.xml, phpunit, pest, mock, assert, tdd)"
---

# PHP Testing

## **Priority: P1 (HIGH)**

## Structure

```text
tests/
├── Unit/
├── Integration/
└── Feature/
```

## Implementation Guidelines

- **Pest/PHPUnit**: Use Pest for DX or PHPUnit for legacy parity.
- **TDD Flow**: Follow Red-Green-Refactor cycle for new logic.
- **Isolation**: Mock dependencies via **Mockery** or PHPUnit mocks.
- **Strict Assertions**: Favor `assertSame` over `assertTrue`.
- **Data Providers**: Run tests against multiple sets via `@dataProvider`.
- **Categorize**: Separate Unit (isolated) from Integration (DB/API).

## Anti-Patterns

- **No testing private methods**: Test through public interfaces only.
- **No over-mocking internals**: Mock only external boundaries.
- **No real network/DB in unit tests**: Use in-memory databases or mocks.
- **No coverage-metric chasing**: Prioritize meaningful assertions.

## References

- [Testing Patterns & Mocks](references/implementation.md)
