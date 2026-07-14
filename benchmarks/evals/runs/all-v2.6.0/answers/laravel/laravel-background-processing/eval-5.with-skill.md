Use `Bus::batch()` for independent jobs whose collective progress and completion matter:

```php
$batch = Bus::batch([
    new ImportRow(1),
    new ImportRow(2),
    new ImportRow(3),
])->then(fn (Batch $batch) => finalizeImport($batch))
  ->catch(fn (Batch $batch, Throwable $e) => recordImportFailure($batch, $e))
  ->dispatch();
```

Inside a batch-aware job, call `$this->batch()->cancel()` when a domain condition requires cancellation, and expose `$batch->progress()` to operators or a UI. Keep each job small, retryable, and idempotent. Use Horizon to monitor the workers and persist batch/failure state so partial completion is not mistaken for success.

