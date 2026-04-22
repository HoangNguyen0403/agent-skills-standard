---
name: laravel-database-expert
description: 'Optimize Laravel queries with subqueries, joinSub, Redis cache-aside patterns, and read/write connection splitting. Use when writing complex joins, implementing Cache::remember with tags, or configuring database read replicas.'
metadata:
  triggers:
    files:
    - 'config/database.php'
    - 'database/migrations/*.php'
    keywords:
    - join
    - aggregate
    - subquery
    - selectRaw
    - Cache
---
# Laravel Database Expert

## **Priority: P1 (HIGH)**

## Workflow: Optimize Slow Query

1. **Profile query** — Use `DB::enableQueryLog()` or Laravel Debugbar.
2. **Add missing indexes** — Create migration for join/where columns.
3. **Replace N+1** — Use `withCount()`, `withSum()`, or `addSelect` subqueries.
4. **Cache results** — Apply `Cache::remember()` with tags for frequently accessed data.
5. **Split reads/writes** — Configure `read`/`write` keys in `config/database.php`.

## Cache-Aside with Tags Example

See [implementation examples](references/implementation.md#cache-aside-with-tags) for cache-aside pattern with tag-based invalidation.

## Implementation Guidelines

### Advanced Query Builder

- **Complex Joins**: Prefer **`joinSub($subquery, 'alias', ...)`** and **`whereExists(fn($q) => $q->select(DB::raw(1))...)`** over raw SQL or `whereIn` for correlated subqueries.
- **Subqueries**: Use **`addSelect`** with **`DB::raw`** subquery to avoid N+1 issues.
- **Aggregates**: Use **`withCount()`**, **`withSum()`**, and **`withAvg()`** directly via Eloquent for optimized column-based aggregation.
- **Raw Expressions**: Always use **`selectRaw`** or **`whereRaw`** with bindings; **never use string concatenation** in raw queries.

### Caching Strategy (Redis/Memcached)

- **Cache-Aside**: Utilize **`Cache::remember('key', $ttl, $closure)`** for frequently accessed data (e.g., `posts.all`).
- **Redis Tagging**: Group related keys using **`Cache::tags(['posts', 'user:1'])`** for **grouped invalidation**.
- **Invalidation**: Call **`Cache::tags(['posts'])->flush()`** to clear specific subsets; **never use `Cache::flush()` globally** in production.

### Scalability & Infrastructure

- **Read/Write Splitting**: Configure **'read'** and **'write'** keys in **`config/database.php`** mysql/pgsql connections. Laravel automatically routes **SELECT** to read and **INSERT/UPDATE/DELETE** to write; **no code changes needed**.
- **Indices**: Ensure correct **database indexes** present on all join and aggregate columns.

## Anti-Patterns

- **No string SQL concatenation**: Use bindings or Query Builder.
- **No queries in loops**: Use subqueries, joins, or aggregates.
- **No `Cache::flush()`**: Use tags to target specific cache groups.
- **No direct Redis calls**: Use Laravel Cache wrappers consistently.

## References

- [Advanced SQL & Cache Patterns](references/implementation.md)