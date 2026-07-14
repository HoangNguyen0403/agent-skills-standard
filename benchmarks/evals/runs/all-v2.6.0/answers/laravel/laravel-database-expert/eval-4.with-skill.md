Use cache tags to invalidate one related group without evicting unrelated application data:

```php
$value = Cache::tags(['posts', 'user:1'])
    ->remember('user:1.posts', 600, fn () => User::findOrFail(1)->posts()->latest()->get());
```

After a post write, flush the smallest relevant group:

```php
Cache::tags(['posts'])->flush();
```

Make keys tenant/user-specific where necessary, select a bounded TTL, and confirm the configured cache store supports tags (Redis and Memcached do; not every store does). Do not call `Cache::flush()` in production because it removes unrelated keys. Keep cache access behind Laravel's Cache facade rather than direct Redis commands.

