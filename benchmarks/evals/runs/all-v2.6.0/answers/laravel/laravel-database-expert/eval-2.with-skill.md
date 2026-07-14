Use Laravel's cache-aside API around a stable query:

```php
$posts = Cache::remember('posts.all', now()->addMinutes(10), function () {
    return Post::query()->latest()->get();
});
```

For Redis or another tag-capable store, group related entries:

```php
$posts = Cache::tags(['posts'])->remember('posts.all', 600, fn () => Post::latest()->get());
```

Invalidate the targeted group after a write with `Cache::tags(['posts'])->flush()`. Choose keys that include tenant or user identity where data is scoped, set a bounded TTL, and avoid caching mutable authorization decisions accidentally. Use Laravel's Cache facade consistently; do not mix direct Redis calls or use global `Cache::flush()` in production.

