Process records in bounded chunks so the whole table is not loaded into memory:

```php
User::where('active', true)->chunk(500, function (Collection $users): void {
    foreach ($users as $user) {
        SendDigest::dispatch($user->id);
    }
});
```

`chunk()` orders by offset and can skip/duplicate rows if the query mutates while processing. For a stable large-table scan, prefer `chunkById()` or `lazyById()` and make the ordering/key explicit. Keep transactions and side effects scoped appropriately, handle a `false` return to stop processing, and avoid modifying the chunking predicate in ways that make progress unpredictable.

