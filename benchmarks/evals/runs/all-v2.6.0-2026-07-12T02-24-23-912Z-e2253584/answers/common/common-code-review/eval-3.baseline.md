The diff is needed for concrete findings, but a caching layer should be reviewed for these risks:

- Cache keys must include every dimension that affects the result, especially tenant and user authorization scope.
- Define TTL and invalidation behavior so writes cannot leave unsafe or materially stale data indefinitely.
- Handle cache misses, backend failures, serialization errors, and cache outages without changing authorization or breaking correctness.
- Prevent cache stampedes for hot keys and bound memory growth.
- Decide whether stale reads are acceptable and document consistency guarantees.
- Add tests for hit/miss behavior, invalidation, key isolation, expiry, failures, concurrent misses, and fallback to the database.
- Add hit-rate, latency, eviction, error, and stale-data observability before claiming the optimization works.
