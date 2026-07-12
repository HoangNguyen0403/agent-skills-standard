Create the job with Laravel's generator and make it queueable:

```bash
php artisan make:job ProcessOrder
```

The class should implement `ShouldQueue`, put work in `handle()`, and receive only durable identifiers:

```php
final class ProcessOrder implements ShouldQueue
{
    public function __construct(public int $orderId) {}

    public function handle(): void
    {
        $order = Order::findOrFail($this->orderId);
        // process the order
    }
}
```

Dispatch it with `ProcessOrder::dispatch($order->id)`. Do not put the full Eloquent model in the payload, and move work that is expensive or external out of the request path. Configure retries and a failed-job store, and use Horizon for production queue monitoring.

