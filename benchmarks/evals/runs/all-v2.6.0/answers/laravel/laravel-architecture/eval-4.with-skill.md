Use Laravel's service container and type-hint dependencies instead of manually instantiating them:

```php
final class CreateOrder
{
    public function __construct(private OrderRepository $orders) {}
}
```

Bind an interface to its implementation in `AppServiceProvider`:

```php
$this->app->bind(OrderRepository::class, EloquentOrderRepository::class);
```

Then inject `CreateOrder` into the controller. Laravel resolves the dependency graph automatically, and the interface allows tests or deployments to swap implementations. Keep bindings centralized, use Form Requests for validation, and avoid `new EloquentOrderRepository()` or service-locator calls in application logic. If a dependency has no interface and no special construction, Laravel can autowire a concrete class directly.

