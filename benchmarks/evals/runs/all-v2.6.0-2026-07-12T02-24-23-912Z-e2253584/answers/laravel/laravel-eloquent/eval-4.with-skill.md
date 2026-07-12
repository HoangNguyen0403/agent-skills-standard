Use `chunk()` when processing many records in bounded batches:

```php
User::query()->where('active', true)->chunk(500, function ($users): void {
    foreach ($users as $user) {
        // process one user
    }
});
```

Use `cursor()` or `lazy()` when a streaming iteration is more appropriate. Avoid `get()` for an unbounded table because it materializes every model in memory. Choose stable ordering and be careful when mutating rows during iteration; `chunkById()` is safer for many update workflows. Eager-load only the relationships needed by each batch, and make processing restart-safe if a batch fails.

