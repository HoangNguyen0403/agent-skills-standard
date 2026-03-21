---
name: php-testing
description: 'Unit and integration testing standards for PHP applications. Use when writing PHPUnit unit tests or integration tests for PHP applications. (triggers: tests/**/*.php, phpunit.xml, phpunit, pest, mock, assert, tdd)'
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

- **Standards**: Use **`PHPUnit`** (9/10+) or **`Pest`**. Organize into **`Unit/`**, **`Integration/`**, and **`Feature/`**. Class names should extend **`TestCase`** (e.g., **`class OrderServiceTest extends TestCase`**).
- **TDD Workflow**: Follow **Red-Green-Refactor**. **Red: write failing test** first for `createOrder()`, then **Green: implement minimal** logic to pass, then **Refactor**.
- **Mocking**: Use **`createMock(PaymentService::class)`** for dependencies. Define behavior with **`expects($this->once())`** and **`method('charge')`** with `with(100)->willReturn(true)`. DO NOT mock simple Data Objects.
- **Fluent Assertions**: **`assertSame checks type + value`** (`===`) — use **`assertSame('Test', $result->title)`** over `assertEquals` to avoid type coercion surprises. Also use **`assertCount()`** and **`assertMatchesRegularExpression()`**.
- **Data Providers**: Use **`#[DataProvider('statusProvider')]`** (PHPUnit 10+) with a **`public static function statusProvider(): array`** or **`dataset`** (Pest).
- **Isolation**: Ensure tests are **Independent** and **Repeatable**. DB tests must use **`Transactions`** or **`SQLite :memory:`**.
- **Pest syntax**: Use **`it('creates an order', function() { ... })`** and **`expect($result->title)->toBe('Test')`** for cleaner, more readable tests.
- **Coverage**: Aim for **`80%+`** line coverage. Use **`phpunit.xml`** to whitelist specific directories.
- **Automation**: Run tests on every PR using **GitHub Actions** or **GitLab CI**.

## Anti-Patterns

- **No testing private methods**: Test through public interfaces only.
- **No over-mocking internals**: Mock only external boundaries.
- **No real network/DB in unit tests**: Use in-memory databases or mocks.
- **No coverage-metric chasing**: Prioritize meaningful assertions.

## References

- [Testing Patterns & Mocks](references/implementation.md)
