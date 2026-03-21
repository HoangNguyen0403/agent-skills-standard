---
name: laravel-database-expert
description: 'Expert patterns for advanced queries, Redis caching, and database scalability. Use when optimizing Laravel queries, implementing Redis caching, or scaling databases. (triggers: config/database.php, database/migrations/*.php, join, aggregate, subquery, selectRaw, Cache)'
---

# Laravel Database Expert

## **Priority: P1 (HIGH)**

## Structure

```text
config/
└── database.php        # Connection & Cluster config
app/
└── Http/
    └── Controllers/    # Query logic entry points
```

## Implementation Guidelines

### Advanced Query Builder

- **Complex Joins**: Prefer **`joinSub($subquery, 'alias', ...)`** and **`whereExists(fn($q) => $q->select(DB::raw(1))...)`** over raw SQL or `whereIn` for correlated subqueries.
- **Subqueries**: Use **`addSelect`** with a **`DB::raw`** subquery to avoid N+1 issues.
- **Aggregates**: Use **`withCount()`**, **`withSum()`**, and **`withAvg()`** directly via Eloquent for optimized column-based aggregation.
- **Raw Expressions**: Always use **`selectRaw`** or **`whereRaw`** with bindings; **never use string concatenation** in raw queries.

### Caching Strategy (Redis/Memcached)

- **Cache-Aside**: Utilize **`Cache::remember('key', $ttl, $closure)`** for frequently accessed data (e.g., `posts.all`).
- **Redis Tagging**: Group related keys using **`Cache::tags(['posts', 'user:1'])`** for **grouped invalidation**.
- **Invalidation**: Call **`Cache::tags(['posts'])->flush()`** to clear specific subsets; **never use `Cache::flush()` globally** in production.

### Scalability & Infrastructure

- **Read/Write Splitting**: Configure **'read'** and **'write'** keys in **`config/database.php`** mysql/pgsql connections. Laravel automatically routes **SELECT** to read and **INSERT/UPDATE/DELETE** to write; **no code changes needed**.
- **Indices**: Ensure correct **database indexes** are present on all join and aggregate columns.

## Anti-Patterns

- **No string SQL concatenation**: Use bindings or Query Builder.
- **No queries in loops**: Use subqueries, joins, or aggregates.
- **No `Cache::flush()`**: Use tags to target specific cache groups.
- **No direct Redis calls**: Use Laravel Cache wrappers consistently.

## References

- [Advanced SQL & Cache Patterns](references/implementation.md)
