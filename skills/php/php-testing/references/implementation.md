# PHP Testing Reference

## Framework Patterns (Pest & PHPUnit)

### Pest (Modern DX)

```php
test('user can be created', function () {
    $repo = mock(UserRepository::class);
    $repo->shouldReceive('save')->once()->andReturn(true);

    $service = new UserService($repo);
    expect($service->create(['name' => 'Hoang']))->toBeTrue();
});
```

### PHPUnit (Standard Persistence)

```php
public function test_math_logic(): void
{
    $this->assertSame(4, 2 + 2);
}
```

## Directory Structure

```text
tests/
├── Unit/
├── Integration/
└── Feature/
```

## PHPUnit Service Test

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

## Pest Dataset Example

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
