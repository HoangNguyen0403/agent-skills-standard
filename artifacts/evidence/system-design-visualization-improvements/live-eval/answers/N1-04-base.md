# Execution Flow and Standard Resolution for `authors { books }`

## Execution flow as written

1. **Root field.** The client's query `{ authors { id name books { title } } }` reaches the root `authors` resolver. It issues one database call — typically `SELECT ... FROM authors [WHERE <scope>] [ORDER BY ...] [LIMIT/OFFSET]` — and returns 30 author nodes. Call this $Q_{base} = 1$.
2. **Child field scheduling.** GraphQL executes the selection set in breadth-first order: the executor iterates the 30 author nodes and invokes the `books` resolver once per node, passing that node as `parent`. GraphQL-JS collects all 30 resolver promises within the same execution tick; sibling resolvers are *concurrent*, not sequential.
3. **Per-node database work.** Each `books` resolver body calls `db.findBooksByAuthor(author.id)`. Because the resolver has no knowledge of its siblings, every node performs an independent round-trip: `SELECT ... FROM books WHERE author_id = $1` (plus any ordering/pagination predicate).
4. **Total.** $1 + 30 = 31$ statements, i.e. $O(N)$ in the number of parent rows. Latency becomes $t_{authors} + \max/\text{pool-bound}(30 \times t_{books})$ rather than $t_{authors} + t_{books}$: cost grows with row count, connection-pool concurrency caps parallelism, and a page of 500 authors would emit 501 statements.

**Evidence tier.** From schema/resolver source alone this is `suspected` amplification (GraphQL resolver fan-out is `design risk` until instrumented). It is `observed` only when a statement counter, query log, or trace shows statement count scaling with parent count. `EXPLAIN` is not a request counter and does not evidence amplification.

## Standard resolution pattern

Insert a **request-scoped DataLoader** between resolver and data access:

```js
function makeLoaders(db, ctx) {
  return {
    booksByAuthor: new DataLoader(async (authorIds) => {
      const rows = await db.findBooksByAuthorIds(authorIds, { tenantId: ctx.tenantId });
      const byAuthor = new Map(authorIds.map(id => [id, []]));
      for (const r of rows) byAuthor.get(r.author_id).push(r);
      return authorIds.map(id => byAuthor.get(id)); // one array per key, [] when empty
    }),
  };
}
// resolver
books: (author, _args, ctx) => ctx.loaders.booksByAuthor.load(author.id)
```

Mechanics and non-negotiables:

- **Tick batching.** The loader defers dispatch to the next microtask, coalescing all 30 `load(id)` calls from the sibling resolvers into one batch function invocation with `authorIds = [id1..id30]`. The batch resolver returns `SELECT ... FROM books WHERE author_id = ANY($1)` — one statement, chunked to a **bounded batch size** $B$ (e.g. 50–100) so the `IN` list never grows unbounded. Cost drops to $Q_{base} + R \cdot \lceil N/B \rceil$: with $N=30$, $B=50$, $R=1$ → **2 queries**.
- **Per-request lifecycle.** Instantiate loaders per request (attached to context/types), never as a module-level singleton or global cache. A shared cache serves stale data and can return another tenant's rows; the loader's memoization is a within-request dedup, not a cache tier.
- **Scope and authorization.** The batch query must carry every predicate the single-row query carried — tenant/org/user scope, soft-delete filter, visibility rules — applied inside the batch, and fail closed if scope is absent. Never "load by ID then filter in memory."
- **Parent pagination preserved.** Paginate parents first (`LIMIT`/keyset), then batch children by the returned parent IDs. A multi-row `LEFT JOIN` multiplies parent rows and corrupts offset boundaries; do not use it as the fix.
- **Result shape and ordering.** Return one array per requested key in the same order as `authorIds`; zero-child authors must serialize as `[]`, never `null` or a missing key. Apply child ordering (`ORDER BY published_at, id`) in SQL and group in insertion order so output is deterministic.
- **Projection.** Select only the columns the selection set needs; an aggregate-only `books` field (e.g. `count`) should be pushed down with `GROUP BY` instead of fetching rows.

## When not to batch

If the relation is small, bounded, and unpaginated, a single eager join/prefetch is acceptable. Always-batched or constantly-counted reads are not defects; diagnose those with plan/index inspection instead. Verify the fix with a statement counter: emitted query count must stay constant as $N$ grows, empty relations must return `[]`, and tenant scope must still appear in every batch predicate.
