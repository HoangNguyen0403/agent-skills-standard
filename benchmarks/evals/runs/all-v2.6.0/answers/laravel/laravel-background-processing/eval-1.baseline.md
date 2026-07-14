Generate a job with `php artisan make:job ProcessOrder`, make it queueable, and keep its payload serializable:

```php
final class ProcessOrder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $orderId) {}

    public function handle(OrderProcessor $processor): void
    {
        $processor->process(Order::findOrFail($this->orderId));
    }
}
```

Dispatch it with `ProcessOrder::dispatch($order->id)`. Configure the queue connection, run a worker with `php artisan queue:work`, set `tries`, `timeout`, `backoff`, and `failed()` as needed. Make the handler idempotent and do not serialize stale mutable models when an ID is sufficient.

