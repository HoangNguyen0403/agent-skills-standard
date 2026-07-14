Configure retry behavior on the job and implement `failed()` for terminal cleanup/notification:

```php
public int $tries = 3;
public array $backoff = [10, 60, 300];

public function failed(?Throwable $exception): void
{
    Order::whereKey($this->orderId)->update(['processing_failed' => true]);
}
```

Run `php artisan queue:failed` to inspect failures, `queue:retry <id>` to retry selectively, and `queue:flush` only when intentionally discarding them. Use timeouts, retry-after settings, and backoff that do not cause duplicate concurrent attempts. Handle transient versus permanent exceptions deliberately, make work idempotent, and alert on sustained failure rates. In production, keep workers supervised and restart them after deploys.

