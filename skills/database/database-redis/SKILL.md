---
name: database-redis
description: Optimize Redis caching, key management, and performance. Use when implementing Redis caching strategies, managing key namespaces, or optimizing Redis performance.
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

- **Security**:
 - **Access Control**: Use Redis 6.0+ ACLs (`ACL SETUSER`) to restrict commands by user/role.
 - **Encryption**: Always enable TLS for data-in-transit (standard in managed Redis like Azure/AWS).
 - **Dangerous Commands**: Disable or rename `FLUSHALL`, `KEYS`, `CONFIG`, and `SHUTDOWN` in production.
- **Connection Resilience**:
 - **Pooling**: Use connection pooling with tuned high/low watermarks to avoid connection churn.
 - **Timeouts**: Set strict `read_timeout` and `connect_retries` to handle transient network saturation.

## Guidelines

- **Key Design**:
 - **Namespacing**: Use colons to namespace keys (e.g., `app:user:123`, `rate:limit:ip:1.1.1.1`).
 - **Readability vs Size**: Keep keys descriptive but compact; avoid keys > 512 bytes.
- **Commands & Performance**:
 - **O(N) Avoidance**: Use `SCAN` instead of `KEYS`. Use `UNLINK` instead of `DEL` for background reclamation of large keys.
 - **Lua Scripting**: Prioritize `EVALSHA` for atomic logic; ensure scripts pre-loaded to save bandwidth.
 - **Massive Range**: Limit `ZRANGE`, `HGETALL`, and `LRANGE` results with offsets/limits.
- **Memory Management**:
 - **Eviction Strategy**: Use `allkeys-lru` for general caches and `volatile-lru` for mixed persistent/ephemeral data.
 - **Lazy Freeing**: Enable `lazyfree-lazy-eviction` and `lazyfree-lazy-expire` (Redis 4.0+) to offload cleanup from main thread.
 - **Monitoring**: Watch `Used Memory RSS` vs `Used Memory Dataset`. Large fragmentation suggests need for `MEMORY PURGE` or scaling.

## Anti-Patterns

- **No sole truth in Redis**: Always persist critical data to durable primary database.
- **No large blobs**: Split values > 100KB into smaller keys or use Hashes for field access.
- **No JSON for objects**: Use `HSET` for object fields to enable O(1) access without full decode.
- **No TTL-less keys**: Set TTL or eviction policy on all non-permanent keys to prevent unbounded growth.

## References

- [Best Practices Guide](references/best-practices.md)
- [Checklist](references/checklist.md)