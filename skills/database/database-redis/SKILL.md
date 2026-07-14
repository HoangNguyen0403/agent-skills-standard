---
name: database-redis
description: Optimize Redis as cache and coordination infrastructure with TTL, eviction, and latency-aware key design. Use when implementing Redis caching, key invalidation, or Redis performance work.
metadata:
  triggers:
    files:
    - '**/*.ts'
    - '**/*.js'
    - '**/redis.config.ts'
    keywords:
    - redis
    - cache
    - ttl
    - eviction
---
# Redis Best Practices

## **Priority: P0 (CRITICAL)**

Redis is fast only when key shape, TTL ownership, and command complexity are explicit.

## Rules

- Namespace keys by product/domain and entity.
- Give cache keys a TTL or a documented reason not to expire.
- Pick eviction policy to match workload: `allkeys-lru` for general caches, `volatile-lru` for mixed persistent/ephemeral data. Monitor hit rate and evictions.
- Avoid slow or unbounded commands in hot paths; prefer `SCAN` over `KEYS` and `UNLINK` over `DEL` for large-key deletion. `lazyfree` settings help background reclamation.

## Verify

- [ ] Key naming identifies owner and invalidation scope.
- [ ] TTL or eviction policy exists for non-durable data.
- [ ] Large reads use bounded range/scan patterns.
- [ ] Connection timeouts and pool settings are explicit.
- [ ] Critical state does not exist only in Redis.

## Anti-Patterns

- **No sole truth in Redis**: Always persist critical data to durable primary database.
- **No large blobs**: Split values > 100KB into smaller keys or use Hashes for field access.
- **No JSON for objects**: Use `HSET` for object fields to enable O(1) access without full decode.
- **No TTL-less keys**: Set TTL or eviction policy on all non-permanent keys to prevent unbounded growth.
- **No `KEYS` in app paths**: use `SCAN` or explicit index keys.

## References

- [Framework Map](../references/framework-map.md)
- [Best Practices Guide](references/best-practices.md)
- [Checklist](references/checklist.md)

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- lazyfree
