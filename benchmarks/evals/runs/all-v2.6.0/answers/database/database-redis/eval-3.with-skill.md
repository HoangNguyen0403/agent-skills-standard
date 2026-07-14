For a general-purpose cache, the best default Redis eviction policy is `allkeys-lru`.

Why `allkeys-lru` is usually the right choice:

- It allows Redis to evict any key when memory is full.
- It matches cache-oriented workloads where all cached entries are disposable.
- It favors keeping recently used keys in memory, which usually improves hit rate for normal application traffic.

Use `allkeys-lru` when:

- Redis is being used mainly as a cache
- Cached data can be recomputed or reloaded from a durable database
- You want memory pressure handled automatically without relying on every key having a TTL

When not to use it:

- If Redis contains a mix of persistent keys and expiring cache keys, `volatile-lru` is often safer because only keys with TTLs are eligible for eviction.
- If critical state exists only in Redis, that is a design problem. Eviction policy should not be your protection for important data.

Practical guidance:

- Even with `allkeys-lru`, still set TTLs on ephemeral cache keys whenever practical.
- Add small TTL jitter for high-volume caches to avoid synchronized expiration bursts.
- Monitor cache hit ratio and eviction count after rollout. If hit rate is poor or evictions spike unexpectedly, revisit key size, TTL strategy, and memory sizing.

Operational reminder:

- Eviction policy is not a substitute for good key design.
- Keep values bounded in size.
- Avoid unbounded read patterns.
- Make sure Redis is supporting a durable primary database, not replacing it.

In short: choose `allkeys-lru` for a normal general cache, and choose `volatile-lru` instead only when Redis is serving a mixed workload with both persistent and expiring keys.

