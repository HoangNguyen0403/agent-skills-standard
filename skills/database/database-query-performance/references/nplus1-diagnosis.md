# N+1 Query Amplification Diagnosis and Remedies

## Evidence Tiers

Diagnose query amplification by evidence tier. Do not conflate static code inspection with observed runtime bottlenecks:

| Evidence Tier | Source | Classification | Action |
| --- | --- | --- | --- |
| **Code-only** | Static loops, serializer properties, ORM calls in templates | `suspected` | Identify entrypoint, child relation, and potential $O(N)$ growth. Require runtime trace before declaring a measured bottleneck. |
| **Proposed design** | Architectural docs, GraphQL resolver schemas without batching | `design risk` | Document amplification risk, identify parent/child cardinality, and mandate a verification plan before implementation. |
| **Runtime trace** | Query logs, statement listener, or profiler metrics | `observed` | Confirm statement count scales with parent count $N$. Record emitted queries, parameters, and execution timings. |

> ⚠️ **Warning**: Never use an `EXPLAIN` query plan as a request counter. `EXPLAIN` inspects index/scan access paths for a single query; statement counters and trace listeners measure request amplification.

## Amplification Patterns

1. **ORM Iteration Loops**: Iterating over parent models and calling a lazy-loaded relation method or navigation property inside the loop ($1 + N$ queries).
2. **Hidden Serializer/Template Lazy Loads**: An API serializer or view template traverses nested properties on each parent record, triggering lazy fetches during serialization.
3. **Per-Record Aggregate Queries**: Issuing a separate `COUNT(*)`, `SUM()`, or `MAX()` query for each parent row in an iteration loop.
4. **GraphQL Field Resolver Fan-Out**: A child-field resolver executing an individual backend query for each parent node returned in a list query.

## Negative Controls (Not N+1 Amplification)

Reject false positives during diagnosis:

- **Already-Batched Loading**: A repository or loop querying chunks of IDs using `WHERE id IN (...)` is already batched (conforming to the declared bounded batch bound $Q_{base} + R \cdot \lceil N / B \rceil$, executing fixed bounded chunks rather than issuing per-entity queries).
- **Constant-Count Routines**: An endpoint executing a fixed set of 2–4 queries regardless of dataset size ($O(1)$) is not amplified. If slow, diagnose index coverage or table scans via `EXPLAIN`.
- **N+1 Spare-Instance Redundancy**: Infrastructure featuring $N$ active nodes plus 1 hot standby spare instance is a high-availability compute pattern, not a database query defect.

## Remedy Selection Matrix

Select the smallest justified remedy matching the access pattern and invariants:

| Access Pattern | Recommended Remedy | Trade-off / Constraint | Avoid |
| --- | --- | --- | --- |
| **Aggregates only** (e.g. counts, totals) | Push down via `GROUP BY` or correlated subquery | Emits 1 query; avoids fetching child entity attributes into application memory | Fetching child rows to count them in application code |
| **1:N relation with parent pagination** | Two-query bounded batch lookup: parent page first, then child batch by parent IDs | Preserves parent `LIMIT`/`OFFSET` and ordering; prevents row multiplication | Blanket giant `LEFT JOIN`, which duplicates parent columns and breaks pagination offsets |
| **GraphQL field resolvers** | Request-scoped `DataLoader` batching keys across siblings | Batches child queries per tick; strictly request-scoped to prevent cross-tenant/cross-request data leakage | Global or singleton cache; concurrent per-row database calls |
| **1:1 or small bounded 1:N without pagination** | Bounded eager `JOIN` or prefetch | Single round-trip when row multiplication and memory footprint are negligible | Deep multi-table Cartesian product joins |

## Crucial Invariants to Preserve

1. **Tenant & Authorization Scope**: Child queries must retain all tenant, organization, or user-level predicates. A DataLoader or batch lookup must never cross tenant boundaries.
2. **Parent Pagination**: When paginating parent rows (`LIMIT`/`OFFSET` or keyset/cursor), fetching children via a multi-row JOIN can multiply returned rows and corrupt offset boundaries. Fetch parent keys first, then load children by bounded batch.
3. **Bounded Query Formula**: Bounded batch queries follow $Q_{base} + R \cdot \lceil N / B \rceil$, where $Q_{base}$ is the parent query, $R$ is relation count, $N$ is parent count, and $B$ is batch chunk size (e.g., 50 or 100).
4. **Empty Relations & Ordering**: Ensure zero-child parents serialize as empty collections `[]`, not `null` or missing keys. Retain deterministic ordering.
5. **No Blind Caching**: Do not wrap a slow $O(N)$ loop in a cache to hide the amplification. Fix the query shape at the database access layer.
