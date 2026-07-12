Laravel's service container resolves concrete classes automatically and resolves interfaces through bindings. Define an interface and implementation, then bind it in a service provider:

```php
// AppServiceProvider::register()
$this->app->bind(PaymentGateway::class, StripePaymentGateway::class);

final class Checkout
{
    public function __construct(private PaymentGateway $payments) {}
}
```

Use `singleton` only for genuinely shared stateless/state-safe services; use `scoped` where the lifetime should be one request/job. Constructor injection is preferable to calling `app()` throughout business code. Contextual bindings handle different implementations for different consumers, and `bind`/`instance` can replace dependencies in tests.

