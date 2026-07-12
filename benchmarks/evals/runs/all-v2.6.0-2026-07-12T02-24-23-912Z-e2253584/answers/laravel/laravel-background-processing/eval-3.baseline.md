Create an event and listener, register the listener if discovery is disabled, then dispatch the event:

```bash
php artisan make:event OrderPlaced
php artisan make:listener SendOrderReceipt --event=OrderPlaced
```

```php
final class OrderPlaced
{
    use Dispatchable;
    public function __construct(public Order $order) {}
}

final class SendOrderReceipt
{
    public function handle(OrderPlaced $event): void
    {
        Mail::to($event->order->user)->send(new OrderReceipt($event->order));
    }
}
```

Use `implements ShouldQueue` on the listener for asynchronous handling, or dispatch `OrderPlaced::dispatch($order)` synchronously. If the event is emitted inside a transaction, consider after-commit dispatching so listeners do not observe uncommitted data.

