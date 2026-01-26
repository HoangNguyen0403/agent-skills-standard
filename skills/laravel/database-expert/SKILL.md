---
name: Laravel Database Expert
description: Expert patterns for advanced queries, Redis caching, and database scalability.
metadata:
  labels: [laravel, database, redis, sql, performance]
  triggers:
    files: ['config/database.php', 'database/migrations/*.php']
    keywords: [join, aggregate, subquery, selectRaw, Cache]
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

- **Raw Concatenation**: **No String SQL**: Always use bindings or Query Builder.
- **Loop Queries**: **No queries in Loops**: Use subqueries or aggregates.
- **Global Cache Flush**: **No Cache::flush()**: Use tags to target specific groups.
- **Untracked Redis**: **No ungoverned Redis usage**: Use standard Laravel wrappers.

## References

- [Advanced SQL & Cache Patterns](references/implementation.md)
