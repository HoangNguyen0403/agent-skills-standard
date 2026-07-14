Use a cache-aside hierarchy: check an in-process cache first, then a shared Redis cache, and finally the source of truth. On a miss, load the value, write it to Redis with a TTL, and populate the local cache with a shorter TTL. Invalidate or version both levels when data changes.

Nest provides `CacheModule`, and Redis can be used as its store, but a custom cache service is often clearer for two levels. Define key namespaces, serialization, TTLs, size limits, and metrics. Do not cache user-specific data under shared keys, and do not make Redis a hard dependency if stale/miss fallback to the database is safe. For multiple replicas, local caches are eventually consistent; use short TTLs, explicit invalidation through events, or skip the local layer for data requiring immediate consistency.

