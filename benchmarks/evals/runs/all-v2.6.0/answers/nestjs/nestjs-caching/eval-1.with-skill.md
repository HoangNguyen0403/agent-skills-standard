Use an L1/L2 design: an in-process `lru-cache` for small, mostly static values and Redis as the shared L2 cache across pods. Configure Nest cache-manager with `cache-manager-redis-yet`, and use a custom key that canonicalizes query parameters. Stale-while-revalidate lets requests serve a still-valid stale value while one worker refreshes it.

Add jitter to TTLs and use a lock/single-flight mechanism so only one process recomputes a missing or expired value. Memory-only storage is not sufficient for multi-pod state; Redis is the distributed source. Keep cache invalidation event-driven where possible.

