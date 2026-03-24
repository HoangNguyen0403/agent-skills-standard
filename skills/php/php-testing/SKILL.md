---
name: php-testing
description: "Write unit and integration tests for PHP applications with PHPUnit and Pest. Use when writing PHPUnit unit tests or integration tests for PHP applications. (triggers: tests/**/*.php, phpunit.xml, phpunit, pest, mock, assert, tdd)"
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

## Write Tests with PHPUnit and Pest

- **Standards**: Use **`PHPUnit`** (9/10+) or **`Pest`**. Organize into **`Unit/`**, **`Integration/`**, and **`Feature/`**. Class names should extend **`TestCase`**.
- **TDD Workflow**: Follow **Red-Green-Refactor**. Write failing test first, implement minimal logic, then refactor.

```php
// PHPUnit: service test with mock
class OrderServiceTest extends TestCase
{
    public function test_creates_order_and_charges_payment(): void
    {
        $payment = $this->createMock(PaymentService::class);
        $payment->expects($this->once())
            ->method('charge')
            ->with(100)
            ->willReturn(true);

        $service = new OrderService($payment);
        $order = $service->createOrder('Widget', 100);

        $this->assertSame('Widget', $order->title);
        $this->assertTrue($order->isPaid());
    }
}
```

## Apply Assertions and Data Providers

- **Fluent Assertions**: Use **`assertSame`** (`===`) over `assertEquals` to avoid type coercion. Also use **`assertCount()`** and **`assertMatchesRegularExpression()`**.
- **Data Providers**: Use **`#[DataProvider('statusProvider')]`** (PHPUnit 10+) or **`dataset`** (Pest).

```php
// Pest: expressive syntax with datasets
it('validates order status transitions', function (string $from, string $to, bool $valid) {
    $order = new Order(status: $from);
    expect($order->canTransitionTo($to))->toBe($valid);
})->with([
    ['pending', 'confirmed', true],
    ['confirmed', 'pending', false],
    ['shipped', 'cancelled', false],
]);
```

## Isolate Test Dependencies

- **Mocking**: Use **`createMock()`** for dependencies. DO NOT mock simple Data Objects.
- **Isolation**: Ensure tests are **Independent** and **Repeatable**. DB tests must use **`Transactions`** or **`SQLite :memory:`**.
- **Coverage**: Aim for **`80%+`** line coverage. Use **`phpunit.xml`** to whitelist specific directories.
- **Automation**: Run tests on every PR using **GitHub Actions** or **GitLab CI**.

## Anti-Patterns

- **No testing private methods**: Test through public interfaces only.
- **No over-mocking internals**: Mock only external boundaries.
- **No real network/DB in unit tests**: Use in-memory databases or mocks.
- **No coverage-metric chasing**: Prioritize meaningful assertions.

## References

- [Testing Patterns & Mocks](references/implementation.md)
