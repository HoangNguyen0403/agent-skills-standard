Define a repository contract in the domain and provide an Eloquent adapter:

```php
interface OrderRepository
{
    public function save(OrderData $data): Order;
}

final class EloquentOrderRepository implements OrderRepository
{
    public function save(OrderData $data): Order
    {
        return Order::create($data->toArray());
    }
}
```

Bind it in `AppServiceProvider` with `$this->app->bind(OrderRepository::class, EloquentOrderRepository::class)`, then inject `OrderRepository` into the Action. Keep the contract under the domain's `Contracts/` directory and the Eloquent implementation in an adapter/infrastructure location. Controllers depend on the Action, not the concrete persistence class.

