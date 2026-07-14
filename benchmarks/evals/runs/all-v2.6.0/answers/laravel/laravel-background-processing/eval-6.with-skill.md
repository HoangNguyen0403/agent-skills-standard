Make failures explicit and retryable on the job:

```php
final class ProcessOrder implements ShouldQueue
{
    public int $tries = 3;
    public int $backoff = 60;

    public function failed(Throwable $exception): void
    {
        // mark the order failed and notify an operator
    }
}
```

Run the failed-job-table migration (`php artisan queue:failed-table` followed by `php artisan migrate`) so exhausted jobs are retained for inspection and retry. Configure Horizon rather than relying on an unmonitored `queue:work` process in production. Keep payloads small, pass model IDs, and make `handle()` idempotent because a job may execute more than once before failure is finalized. Monitor retry counts and alerts so a failed job is not reported as completed.

