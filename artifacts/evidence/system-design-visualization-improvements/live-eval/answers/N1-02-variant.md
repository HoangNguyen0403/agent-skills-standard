# Catalog Page: 101 Queries for 50 Products

## Diagnosis

The count is arithmetic evidence, not a guess: `1 + 50 + 50 = 101`. One parent query
(`Product.findAll()` with `LIMIT`/`OFFSET`) plus, per product row, one lazy load for
`product.category` (N:1) and one per-record aggregate for `product.reviews.count()` (1:N).
The serializer template is the amplification site: both properties are traversed during
serialization, after the parent page is already loaded, so the ORM issues statement N+1
and N+2 for every row. Evidence tier is `observed` — a profiler/statement counter, not
static inspection. Statement counters measure amplification; `EXPLAIN` does not.

Growth is `Q = Q_base + R · ⌈N/B⌉` with `B = 1` today, i.e. linear in page size. Raising
the page size, not traffic, is what degrades the endpoint.

## Remedy (smallest safe)

Keep the parent page query and ordering exactly as-is; replace the two per-row traversals
with bounded batch lookups keyed by the 50 parent IDs, and push the count down to SQL.

1. **Category (N:1)**: `LEFT JOIN category ON category.id = product.category_id` in the
   parent query, or a second `WHERE category.id IN (:categoryIds)` lookup. A many-to-one
   join multiplies no rows and cannot corrupt `OFFSET`, so it is safe here.
2. **Review counts**: one aggregate query, never fetched-then-counted in the application:
   `SELECT product_id, COUNT(*) FROM review WHERE tenant_id = :tenant AND product_id IN (:ids) GROUP BY product_id`.
   Missing keys serialize as `0`, not `null`.
3. **Bookmarks (new)**: one lookup for the whole page, not one existence check per product:
   `SELECT product_id FROM customer_bookmark WHERE tenant_id = :tenant AND customer_id = :customer AND product_id IN (:ids)`.
   Load into a set; map each product to `bookmarked: true|false`. Do **not** inner-join on
   bookmarks — that would silently drop unbookmarked products and change page size.

Result: `Q_base + 3` queries (4 total), constant for any page size up to batch bound `B`
(chunk at 50–100 IDs; still bounded above that). No global cache, no ORM-wide eager loading,
no giant 1:N join that multiplies review rows.

## Customer and Tenant Privacy

- `customer_id` and `tenant_id` come from the server-resolved authenticated session, never
  from a request body, query string, or model output. A caller-supplied `customer_id` is an
  IDOR: customer A reads B's bookmark flags.
- Every child query keeps the tenant predicate; the bookmark query keeps *both* tenant and
  customer predicates. Product IDs from the page are validated against that scope.
- Missing, ambiguous, or expired scope fails closed (403 / no bookmark data), never a
  default tenant or "all bookmarks are false" masquerading as truth.
- If a DataLoader-style request-scoped batcher is used, it must be per-request; a global or
  singleton cache keyed by product ID serves another customer's flags.
- Bookmark flags are per-request truth, so do not cache the response under a product-only key.
  Any result cache key includes tenant + customer + source version.

## Index Support

Each batch query needs an owner: `review (tenant_id, product_id)`, unique
`customer_bookmark (tenant_id, customer_id, product_id)`, `category (id)` (PK), and the
existing parent index for `product (tenant_id, sort_key, id)`. These serve the named
queries; they do not fix amplification by themselves.

## Verification

- Re-profile: `/catalog?page=1` on 10 vs 50 products issues the same statement count.
- Serializer golden output: unbookmarked → `false`, zero reviews → `0`, missing category → `null`,
  never omitted keys; ordering identical to before.
- Two-customer probe with overlapping products: A's response contains none of B's bookmarks;
  B's contains none of A's. Cross-tenant probe with identical product IDs asserts denial.
- Re-run with an empty page and with a full batch to prove no `IN ()` degenerate query.
