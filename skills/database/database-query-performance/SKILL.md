---
name: database-query-performance
description: Diagnose database latency with explain plans, index ownership, and query amplification review. Use when a query is slow, an index is missing, or scans, loops, and N+1 patterns appear.
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
    - query amplification
    - dataloader
---
# Database Query Performance

## **Priority: P0 (CRITICAL)**

Slow query work starts with the query shape and evidence, not with random index creation.

## Rules

- Capture the exact query, parameters, and access path; redact sensitive values.
- Run explain or equivalent plan inspection before adding indexes; do not use explain as a request counter.
- Match indexes to filter, join, sort, and coverage needs; evaluate index write cost.
- Classify amplification evidence: static loops/serializers are `suspected`, architectural proposals are `design risk`, and telemetry/statement logs are `observed`.
- Distinguish true query amplification (loops, serializer lazy loads, per-record aggregates, resolver fan-out) from constant-count queries and non-query redundancy.
- Fix N+1 amplification with the smallest justified remedy: push down aggregates (`GROUP BY`), use bounded batch key lookups ($Q_{base} + R \cdot \lceil N / B \rceil$), or use request-scoped DataLoaders.
- Preserve parent pagination (`LIMIT`/`OFFSET`), tenant/authorization scope, empty collections, and deterministic ordering across batch loading.
## Verify

- [ ] Explain plan was reviewed; query plan verified.
- [ ] Proposed index maps to a named query path with acceptable write cost.
- [ ] Amplification classified by evidence tier (suspected vs design risk vs observed).
- [ ] Remedy uses smallest justified loading strategy; preserves pagination and tenant scope.
- [ ] Negative controls verified: constant-count queries, already-batched queries, and spare-instance redundancy are rejected as N+1 defects.
## Anti-Patterns

- **No blind indexes**: every index needs a query owner; indexing does not fix $O(N)$ query loops.
- **No cache-first latency fix**: fix query shape before hiding it; never use a global cache for request-scoped DataLoaders.
- **No blanket giant JOIN**: joining 1:N relations multiplies rows, inflates memory, and breaks parent pagination.
- **No ORM opacity**: inspect generated SQL when the ORM is involved.
- **No conflation of redundancy**: high-availability N+1 spare compute nodes are not database query amplification.
## References

- [Framework Map](../references/framework-map.md)
- [Index Strategies](references/index-strategies.md)
- [N+1 Amplification Diagnosis & Remedies](references/nplus1-diagnosis.md)
