---
name: laravel-database-expert
description: "Expert patterns for advanced queries, Redis caching, and database scalability. Use when optimizing Laravel queries, implementing Redis caching, or scaling databases. (triggers: config/database.php, database/migrations/*.php, join, aggregate, subquery, selectRaw, Cache)"
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

- **Advanced Query Builder**: Prefer `selectSub`, `joinSub`, and `whereExists` over raw SQL.
- **Aggregates**: Use `count()`, `sum()`, and `avg()` directly via Eloquent/Builder.
- **Cache-Aside Pattern**: Utilize `Cache::remember()` for frequently accessed data.
- **Redis Tagging**: Group related cache keys using `Cache::tags()` for atomic flushing.
- **Read/Write Splitting**: Configure master/slave connections in `config/database.php`.
- **Vertical Partitioning**: Decouple high-traffic tables to dedicated database instances.
- **Indices**: Ensure correct indexing for all aggregate and join columns.

## Anti-Patterns

- **No string SQL concatenation**: Use bindings or Query Builder.
- **No queries in loops**: Use subqueries, joins, or aggregates.
- **No `Cache::flush()`**: Use tags to target specific cache groups.
- **No direct Redis calls**: Use Laravel Cache wrappers consistently.

## References

- [Advanced SQL & Cache Patterns](references/implementation.md)
