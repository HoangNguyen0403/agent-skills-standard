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

- **Testing Private**: **No Private Testing**: Validate public behavior only.
- **Over-Mocking**: **No Brittle Mocks**: Mock system boundaries only.
- **Blocking Tests**: **No Networking**: Use in-memory DBs and mocks.
- **Metric Chasing**: **No 100% Mania**: Prioritize quality over coverage.

## References

- [Testing Patterns & Mocks](references/implementation.md)
