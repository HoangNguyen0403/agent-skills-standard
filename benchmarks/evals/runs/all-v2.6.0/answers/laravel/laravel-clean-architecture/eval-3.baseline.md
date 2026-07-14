Define a repository interface at the application/domain boundary and an Eloquent implementation in infrastructure:

```php
interface OrderRepository
{
    public function find(string $id): ?Order;
    public function save(Order $order): void;
}

final class EloquentOrderRepository implements OrderRepository
{
    public function find(string $id): ?Order { return Order::find($id); }
    public function save(Order $order): void { $order->save(); }
}
```

Bind the interface in a service provider with `$this->app->bind(OrderRepository::class, EloquentOrderRepository::class)`. Inject the interface into use cases. Do not add a repository solely to wrap every Eloquent call; use it when the boundary provides a meaningful domain abstraction, alternative persistence, or a stable test seam.

