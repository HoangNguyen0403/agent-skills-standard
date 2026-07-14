Use `Bus::chain()` when each job depends on the previous job succeeding:

```php
Bus::chain([
    new ExportOrder($orderId),
    new UploadExport($orderId),
    new NotifyExportReady($orderId),
])->onQueue('exports')->catch(function (Throwable $e) use ($orderId) {
    ReportExportFailure::dispatch($orderId, $e->getMessage());
})->dispatch();
```

The next job is not dispatched if an earlier job fails. Keep jobs small and idempotent, pass IDs or serializable DTOs, configure retries/backoff, and make the catch handler safe to run more than once. A chain is not a transaction; compensate for already-completed side effects when later work fails.

