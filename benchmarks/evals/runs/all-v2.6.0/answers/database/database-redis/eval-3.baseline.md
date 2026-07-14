For a general-purpose cache, `allkeys-lru` is usually the safest default choice.

Why:

- It allows Redis to evict any key when memory is full, not only keys with TTLs.
- LRU-style behavior is a good fit for many caches because recently used items are more likely to be used again.
- It works well when your cache contains a mix of objects and not every key has an expiration time.

Good rule of thumb:

- Use `allkeys-lru` for a broad, conventional application cache.

Other policies and when they fit:

- `volatile-lru`: only evicts keys that have TTLs. Good if you intentionally mark cache entries with expiration and want non-expiring keys protected.
- `allkeys-lfu`: often better than LRU when access patterns are very skewed and frequently used keys should stay hot for longer. A strong option for mature systems with stable hot-key behavior.
- `volatile-ttl`: prefers evicting keys that will expire soon. Useful in narrower cases, but less common as a general default.
- `noeviction`: appropriate only if writes should fail instead of evicting data. Better for non-cache workloads than for caches.

Important caveat:

If Redis is being used as a pure cache, `allkeys-lru` is a strong baseline. If Redis also stores durable or semi-durable application data, eviction policy becomes more dangerous, and mixing cache data with important state in the same instance is usually a bad idea.

Practical recommendation:

1. Start with `allkeys-lru`.
2. Monitor hit rate, eviction count, and memory pressure.
3. Consider `allkeys-lfu` if your traffic has strong “hot key” patterns and LRU is not retaining the right items.

So the short answer is: choose `allkeys-lru` as the default general cache eviction policy unless you have measured reasons to prefer `allkeys-lfu` or need TTL-only eviction behavior.

