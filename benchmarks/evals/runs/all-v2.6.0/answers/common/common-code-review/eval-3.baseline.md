Assumption: the PR introduces read-through caching around database queries, with a TTL and invalidation on writes.

Review assessment: the approach can reduce database calls, but approval depends on these details:

- Cache keys must include every query parameter and tenant/user scope; otherwise data can leak or become incorrect.
- Write operations must invalidate or update affected keys. Otherwise stale records may persist for the full TTL.
- Concurrent cache misses need request coalescing or locking to prevent a cache stampede.
- Cache failures should fall back to the database rather than fail requests.
- TTL, maximum size, and eviction behavior must be explicit to prevent unbounded memory growth.
- Cached values must not expose mutable shared objects; clone or safely serialize them.
- The implementation should include hit/miss, bypass, fallback, and invalidation metrics.
- Tests should cover hits, misses, expiry, invalidation after create/update/delete, distinct query keys, cache outages, and concurrent misses.

Without the diff, I cannot verify whether the PR satisfies these requirements. The main approval blocker is correctness under writes and concurrent misses; reducing database calls alone is insufficient if it returns stale or cross-scope data.
