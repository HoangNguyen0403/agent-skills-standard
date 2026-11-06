## Execution flow as written

1. Client sends `authors { books { … } }`. The root field issues one parent query: `SELECT … FROM authors` (optionally paged), returning 30 rows.
2. GraphQL completes each author object, then invokes the `books` field resolver once per author. Each invocation runs `db.findBooksByAuthor(author.id)` independently — one round trip per author.
3. Total: $1 + 30 = 31$ statements; growth is $O(N)$ in parent count. Evidence tier is `design risk` from the schema alone; confirming it as `observed` requires a statement counter or trace listener — not an `EXPLAIN` plan, which inspects one query's access path.

This is resolver fan-out, the GraphQL form of N+1. It is only a defect if it scales with N; a fixed 2–4 statement endpoint is not amplified.

## Standard resolution pattern

Request-scoped `DataLoader` over the `books` relation:

- Each resolver calls `loader.load(author.id)` and returns a promise; the loader defers.
- At the end of the tick, the loader coalesces all 30 keys into one bounded batch: `findBooksByAuthorIds(ids)` → `WHERE author_id IN (…)`, chunked at a batch bound $B$ (e.g. 50–100). Statement count becomes $Q_{base} + R \cdot \lceil N/B \rceil$: here 2 (parent + one child batch).
- The loader demultiplexes rows back to each author key, so sibling resolvers share one query.

Invariants to preserve:

- **Request scope**: a new loader per request, never a module singleton. Cross-request reuse is where tenant and authorization leakage enters.
- **Scope predicates**: every batch query carries the same tenant/organization predicates the single-key query had. Batching must not widen authority.
- **Pagination and ordering**: if `books(first: n)` is paged per author, a single global `LIMIT` is wrong — use per-parent bounded subqueries/`LATERAL`, or accept per-author limits inside the batch. Keep deterministic `ORDER BY`.
- **Empty collections**: parents with no books serialize `[]`, not `null`.
- **Aggregate-only fields** (e.g. `booksCount`) should be pushed down with `GROUP BY`, not loaded as rows.

## The global process-level cache proposal

Reject it as stated. Three independent reasons:

1. **Amplification is not a caching problem.** The defect is query shape. A global cache makes the warm path fast and leaves a cold cache, a cache flush, or a new tenant at 31 statements. Fix the shape first; caching afterwards is an optimization with its own contract.
2. **Cross-tenant leakage.** 50 tenants share the cluster. A process-level cache keyed by `author.id` is a cross-tenant read as soon as identifiers collide between tenants (per-tenant sequences, imported data, shared external IDs) — and a key that only adds tenant is still insufficient if authorization (role, entitlement, revocation) can change under it. Cache identity must be tenant/subject + authorization-relevant policy version + the full query shape, including filter and pagination arguments.
3. **Staleness and revocation.** A process cache outlives the request, the write, and the permission change. Deleted books, revoked access, and updated rows would keep being served. There is no invalidation story here: no owner, no trigger, no propagation bound, no revocation epoch. That is exactly the "cache outlives authority" failure.

Secondary risks: unbounded per-tenant growth in a shared process (no eviction ownership, no memory bound), and one tenant's key cardinality evicting others.

If a shared cache is still wanted, it becomes a named derived store: owner, key = tenant + authorization version + query shape, TTL, write/revocation invalidation, fail-closed on missing scope, and provable rebuild from the source. Verify with a two-tenant probe asserting no shared cache hit, plus a revoke-then-query probe asserting denial — not just a latency improvement.
