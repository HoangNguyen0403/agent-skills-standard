Create a batch with `Bus::batch()` and dispatch it:

```php
$batch = Bus::batch([
    new ImportChunk($path, 1),
    new ImportChunk($path, 2),
])->then(fn (Batch $batch) => FinalizeImport::dispatch($batch->id))
  ->catch(fn (Batch $batch, Throwable $e) => ReportImportFailure::dispatch($batch->id))
  ->finally(fn (Batch $batch) => Log::info('Import finished', ['id' => $batch->id]))
  ->name('Import products')
  ->dispatch();
```

Jobs should use `Batchable` when they need to inspect cancellation or batch state. Store batch metadata in the configured batches table, check `$this->batch()?->cancelled()`, and make progress/failure callbacks idempotent. A batch tracks independent jobs; use a chain inside a batch when ordering is required.

