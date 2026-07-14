Use `Bus::chain()` when each job depends on the successful completion of the previous job:

```php
Bus::chain([
    new ProcessPayment($order->id),
    new SendReceipt($order->id),
    new UpdateFulfillment($order->id),
])->catch(function (Throwable $exception): void {
    // record or notify about the failed chain
})->dispatch();
```

Each job should implement `ShouldQueue`, do its work in `handle()`, and receive IDs rather than full models. A failure stops subsequent jobs and invokes the catch callback, so make the jobs idempotent and record the failure for retry or operator action. Use Horizon to monitor execution; do not hide deep dependent workflows in event listener chains.

