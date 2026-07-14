Mock the external service at the container boundary:

```php
$payment = $this->mock(PaymentService::class);
$payment->shouldReceive('charge')
    ->once()
    ->with(100)
    ->andReturnTrue();

$response = $this->post('/checkout', ['amount' => 100]);
$response->assertSuccessful();
```

Use `$this->spy()` when you need behavior verification without strict interaction expectations. Tests must not make real network calls: bind a mock, fake the transport, or use a local stub. Assert both the HTTP outcome and the important interaction, and keep external-service tests deterministic and isolated with `RefreshDatabase` where persistence is involved.

