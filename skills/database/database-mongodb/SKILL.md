---
name: database-mongodb
description: Apply MongoDB data-modeling, indexing, and query rules from access patterns. Use when designing schemas, choosing embed vs reference, or tuning MongoDB query behavior.
metadata:
  triggers:
    files:
    - '**/*.ts'
    - '**/*.js'
    - '**/*.json'
    keywords:
    - mongo
    - mongoose
    - objectid
    - schema
    - model
---
# MongoDB Best Practices

## **Priority: P0 (CRITICAL)**

## Rules

- Model from access patterns: data read together should usually live together.
- Embed for bounded one-to-few data; reference for unbounded growth or independent lifecycle.
- Build indexes for real queries, not theoretical flexibility. Use ESR ordering for equality -> sort -> range compound indexes.
- Use transactions only when single-document guarantees are insufficient.

## Verify

- [ ] Embed vs reference choice matches cardinality and lifecycle.
- [ ] Compound index order matches equality -> sort -> range access.
- [ ] Large pagination uses cursor patterns, not deep `skip()`.
- [ ] Explain output supports the chosen indexes; review `keysExamined` and `docsExamined`.
- [ ] Unbounded arrays and hot shard keys were reviewed.

## Anti-Patterns

- **No unbounded arrays**: Use `$push` with `$slice` or redesign using Bucket Pattern.
- **No client-side filtering**: Project only needed fields; never fetch full docs to filter in memory.
- **No deep nesting**: Keep nesting ≤4 levels; flatten paths that frequently queried.
- **No index cargo cult**: each index must map to a read path and write tradeoff.

## References

- [Framework Map](../references/framework-map.md)
- [Best Practices Guide](references/best-practices.md)
- [Anti-Patterns](references/anti-patterns.md)
- [Postgres vs Mongo Comparison](references/postgres-comparison.md)
