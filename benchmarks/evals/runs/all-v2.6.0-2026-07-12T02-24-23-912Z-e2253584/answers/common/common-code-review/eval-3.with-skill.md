[MAJOR] [Cache layer] The caching change needs evidence for key isolation, freshness, and invalidation before it can be approved.
Why: An incorrect key can return one user's data to another, while missing TTL or invalidation can serve stale results; concurrent misses can also preserve the database-load problem through a cache stampede.
Fix: Verify scoped keys, TTL/invalidation rules, bounded memory, error fallback, concurrent-miss behavior, and tests for hit, miss, stale, invalidation, and failure paths.

