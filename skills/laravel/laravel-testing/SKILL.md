---
name: laravel-testing
description: "Automated testing standards with Pest and PHPUnit. Use when writing Pest or PHPUnit feature/unit tests in Laravel applications. (triggers: tests/**/*.php, phpunit.xml, feature, unit, mock, factory, sqlite)"
---

# Laravel Testing

## **Priority: P1 (HIGH)**

## Structure

```text
tests/
├── Feature/            # Integration/HTTP tests
├── Unit/               # Isolated logic tests
└── TestCase.php
```

## Implementation Guidelines

- **Framework**: Use **Pest** for modern DX or PHPUnit for legacy parity.
- **Fresh Context**: Use `RefreshDatabase` trait for data isolation.
- **Factories**: Create test data via **Eloquent Factories**.
- **Mockery**: Use `$this->mock()` for external service substitution.
- **In-Memory**: Use SQLite `:memory:` for high-speed unit tests.
- **HTTP Assertions**: Use `$response->assertStatus()` and `assertJson()`.

## Anti-Patterns

- **No real network calls**: Always mock or stub external services.
- **No state leakage between tests**: Use `RefreshDatabase` trait.
- **No `DB::table()->insert()`**: Use Eloquent Factories instead.
- **No heavy computations in unit tests**: Move to Feature layer.

## References

- [Testing & Mocking Guide](references/implementation.md)
