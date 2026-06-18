---
name: database-query-performance
description: Diagnose database latency with explain plans, index ownership, and query-shape review. Use when a query is slow, an index is missing, or scans and N+1 patterns appear.
metadata:
  triggers:
    files:
    - '**/*.sql'
    - '**/*.entity.ts'
    - 'prisma/schema.prisma'
    keywords:
    - slow query
    - explain
    - index
    - scan
    - n+1
---
# Database Query Performance

## **Priority: P0 (FOUNDATIONAL)**

Slow query work starts with the query shape and evidence, not with random index creation.

## Rules

- Capture the exact query, parameters, and access path.
- Run explain or equivalent plan inspection before adding indexes.
- Match indexes to filter, join, sort, and coverage needs.
- Fix N+1 at the query pattern or loading strategy, not by caching first.

## Verify

- [ ] Explain plan was reviewed.
- [ ] Proposed index maps to a named query path.
- [ ] Write cost of the index is acceptable.
- [ ] Pagination or batch loading avoids deep scans or N+1 loops.

## Anti-Patterns

- **No blind indexes**: every index needs a query owner.
- **No cache-first latency fix**: fix query shape before hiding it.
- **No ORM opacity**: inspect generated SQL when the ORM is involved.

## References

- [Framework Map](../references/framework-map.md)
