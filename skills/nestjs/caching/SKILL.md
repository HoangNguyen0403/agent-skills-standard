---
name: NestJS Caching & Redis
description: Multi-level caching, Invalidation patterns, and Stampede protection.
metadata:
  labels: [nestjs, caching, redis, performance]
  triggers:
    files: ['**/*.service.ts', '**/*.interceptor.ts']
    keywords: [CacheInterceptor, CacheTTL, Redis, stale-while-revalidate]
---

# Caching & Redis Standards

## Caching Strategy

- **Layering**: Use **Multi-Level Caching** for high-traffic read endpoints.
  - **L1 (Local)**: In-Memory (Node.js heap). Ultra-fast, no network. Ideal for config/static data. Use `lru-cache`.
  - **L2 (Distributed)**: Redis. Shared across pods.
- **Pattern**: Implement **Stale-While-Revalidate** where possible to avoid latency spikes during cache misses.

## NestJS Implementation

- **Library**: Use `cache-manager` with `cache-manager-redis-yet` (Recommended over `cache-manager-redis-store` for better V4 support and stability).
- **Interceptors**: Use `@UseInterceptors(CacheInterceptor)` for simple GET responses.
  - **Warning**: By default, this uses the URL as the key. Ensure consistent query param ordering or custom key generators.
- **Decorators**: Standardize custom cache keys.

  ```typescript
  @CacheKey('users_list')
  @CacheTTL(300) // 5 minutes
  findAll() { ... }
  ```

## Redis Data Structures (Expert)

- Don't just use `GET/SET`.
- **Hash (`HSET`)**: Storing objects (User profiles). Allows partial updates (`HSET user:1 lastLogin result`) without serialization overhead.
- **Set (`SADD`)**: Unique collections (e.g., "Online User IDs"). O(1) membership checks.
- **Sorted Set (`ZADD`)**: Priority queues, Leaderboards, or Rate Limiting windows.

## Invalidation Patterns

- **Problem**: "There are only two hard things in Computer Science: cache invalidation and naming things."
- **Tagging**: Since Redis doesn't support wildcards efficiently (`KEYS` is O(N) - bans in PROD), use **Sets** to group keys.
  - _Create_: `SADD post:1:tags cache:post:1`
  - _Invalidate_: Fetch tags from Set, then `DEL` usage keys.
- **Event-Driven**: Listen to Domain Events (`UserUpdated`) to trigger invalidation asynchronously.

## Stampede Protection

- **Jitter**: Add random variance to TTLs (e.g., 300s ± 10s) to prevent all keys expiring simultaneously.
- **Locking**: If a key is missing, **one** process computes it while others wait or return stale. (Complex, often handled by `swr` libraries).
