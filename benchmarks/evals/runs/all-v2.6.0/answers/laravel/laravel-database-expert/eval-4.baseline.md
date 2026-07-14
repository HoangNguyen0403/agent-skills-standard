Cache tags allow related entries to be flushed together:

```php
Cache::tags(['users', "user:{$userId}"])->remember(
    "profile:{$userId}",
    now()->addHour(),
    fn () => User::findOrFail($userId)->profile,
);

Cache::tags(['users', "user:{$userId}"])->flush();
```

Tags are supported by stores such as Redis and Memcached, not file/database cache stores. Use stable, bounded tag names and include tenant boundaries where needed. Tag flushes can be broad and expensive, so prefer versioned keys or targeted deletes when the invalidation set is large or the backend does not support tags. Test cache behavior against the production store rather than the array store.

