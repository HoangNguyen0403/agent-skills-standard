---
name: nestjs-caching
description: "Implement multi-level caching, invalidation patterns, and stampede protection in NestJS. Use when adding Redis caching layers, configuring cache-manager interceptors, implementing stale-while-revalidate, or preventing cache stampedes in NestJS services. (triggers: **/*.service.ts, **/*.interceptor.ts, CacheInterceptor, CacheTTL, Redis, stale-while-revalidate)"
---

# Caching & Redis Standards

## **Priority: P1 (OPERATIONAL)**

Caching strategies and Redis integration patterns for high-performance NestJS applications.

## Caching Strategy

- **Layering**: Use **Multi-Level Caching** for high-traffic read endpoints.
  - **L1 (Local)**: In-Memory (Node.js heap). Ultra-fast, no network. Use `lru-cache` for config/static data.
  - **L2 (Distributed)**: Redis. Shared across pods.
- **Pattern**: Implement **Stale-While-Revalidate** to avoid latency spikes during cache misses.

## NestJS Implementation

- **Library**: Use `cache-manager` with `cache-manager-redis-yet` (recommended over `cache-manager-redis-store` for V4 stability).
- **Interceptors**: Use `@UseInterceptors(CacheInterceptor)` for simple GET responses.
  - **Warning**: Default key is the URL. Ensure consistent query param ordering or use custom key generators.

See [implementation examples](references/example.md)

## Stampede Protection

- **Jitter**: Add random variance to TTLs to prevent simultaneous expiry across keys.
- **Locking**: One process recomputes while others wait or return stale data.

See [implementation examples](references/example.md)

## Redis Data Structures

- **Hash (`HSET`)**: Store objects (user profiles) with partial update support.
- **Set (`SADD`)**: Unique collections with O(1) membership checks.
- **Sorted Set (`ZADD`)**: Priority queues, leaderboards, rate-limiting windows.

## Invalidation Patterns

- **Tagging**: Use Sets to group cache keys (avoid `KEYS` which is O(N) in production).
  - _Create_: `SADD post:1:tags cache:post:1`
  - _Invalidate_: Fetch tags from Set, then `DEL` the grouped keys.
- **Event-Driven**: Listen to domain events (`UserUpdated`) to trigger invalidation asynchronously.

## Anti-Patterns

- **No KEYS in production**: Use SET-based tag grouping for cache invalidation; KEYS is O(N).
- **No fixed TTLs on grouped caches**: Add jitter (±10s) to prevent simultaneous stampede.
- **No MemoryStorage for multi-pod**: Use Redis store; in-memory cache is not shared across pods.
