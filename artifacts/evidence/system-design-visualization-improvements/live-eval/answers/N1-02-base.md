# Catalog page: 101 queries per page — cause and smallest safe remedy

## Evidence classification

**Observed**, not suspected: a profiler statement count of 101 for a single page request with `N = 50` parents. This is runtime trace evidence, so the amplification is a measured defect, not a static-code hypothesis.

## Arithmetic of the defect

$$Q = \underbrace{1}_{\texttt{Product.findAll()}} + \underbrace{50}_{\texttt{category}} + \underbrace{50}_{\texttt{reviews.count()}} = 1 + 2N = 101$$

The controller issues one parent query, then the serializer template traverses `product.category.name` (one lazy `SELECT` per product) and calls `product.reviews.count()` (one `COUNT(*)` per product). Growth is $O(N)$ in page size: 100 products yields 201 statements. Both traversals are hidden lazy loads inside serialization — pattern "hidden serializer/template lazy loads" plus "per-record aggregate queries".

There is a **second, independent defect** behind the first: `findAll()` has no `LIMIT`/`OFFSET`. The 50 is a response-shaping cap, not a DB predicate. Even at 3 queries, cost still scales with total catalog size, and no amplification fix repairs that.

## Why not the obvious alternatives

- **Blanket `LEFT JOIN reviews`**: 1:N join multiplies parent rows, inflates memory, and corrupts `LIMIT`/`OFFSET` boundaries.
- **Cache**: hides the shape, serves stale counts, and invites cross-tenant key collisions. Fix query shape first.
- **New indexes**: no query owns a plan yet; indexing does not fix an $O(N)$ loop.
- **Denormalized `review_count` column**: correct end state for a hot count, but it is a design change with write-path invalidation, backfill, and drift reconciliation — larger than the reported defect. Do not default to it.

## Remedy: three bounded changes

1. **Page at the database.** Replace `findAll()` with a paged access path: `Product.findPage({ limit, offset })` with deterministic ordering (`ORDER BY id` or `(created_at, id)`). The response cap and the DB predicate become one contract.
2. **Category via one bounded batch key lookup.** Collect the page's distinct non-null `category_id`s, then `Category.findByIds(ids)` → a single `WHERE id IN (...)` query. Bound the chunk at $B$ (e.g. 500) if page size can grow past driver parameter limits.
3. **Review counts pushed down.** One aggregate: `SELECT product_id, COUNT(*) FROM reviews WHERE product_id IN (...) GROUP BY product_id`, mapped into `Map<productId, count>`. Never fetch review rows to count them in application code.

Resulting count, constant in $N$:

$$Q = Q_{\text{base}} + R\cdot\lceil N/B \rceil = 1 + 1 + 1 = 3$$

## Invariants that must survive

- **Tenant/authorization scope**: both child queries retain the tenant predicate; authorizing parent IDs does not authorize joining children without that filter.
- **Parent pagination preserved**: fetch parents first, then children by batch. No join.
- **Ordering**: build lookup maps; never re-sort the parent page.
- **Empty relations**: zero reviews serializes as `0` (or `[]` if a list is exposed), never `null`/missing; missing category stays explicit `null` and must not raise.
- **Null FK**: strip null `category_id` values before `IN (...)`; `IN (NULL)` silently never matches.
- **Stable page boundary**: if the catalog mutates during pagination, offsets drift (duplicates/skips) — prefer keyset pagination if that is in scope.

## Verification

- Assert the statement count is **3** at page size 50 *and* 500 (statement listener or query log) — constant-count is the proof, not a faster wall clock.
- `EXPLAIN` each of the three queries: parent ordering/limit path uses an index; `reviews(product_id)` supports the `GROUP BY`. Profile before adding any index, and weigh write cost.
- Contract test: response equivalent to baseline field-by-field, plus explicit cases for a product with zero reviews, and one with a null category.
- Negative control: assert no residual per-row `SELECT` in the serializer — every traversal reads from a prefetched map.
