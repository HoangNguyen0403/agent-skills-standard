# Review: merchant dashboard aggregates

## Verdict

**Reject the "fetch all orders into memory" proposal.** It converts a query-amplification problem into a strictly worse one: unbounded row transfer, application-side aggregation, and no reduction in database work. The fix belongs in the query shape and index, not in the application tier.

## What the current code actually is

Two queries per merchant, in a loop over 100 merchants:

- `SELECT COUNT(*) ... WHERE merchant_id = ? AND status = 'completed'`
- `SELECT SUM(amount) ... WHERE merchant_id = ?`

That is **query amplification, pattern "per-record aggregate"**: $Q = 2N$, here 200 statements, growing linearly with the number of merchants on the page. It is not a constant-count routine. Statically this is `suspected`; classifying it `observed` requires statement logs or a profiler trace showing count scaling with N, which is the correct evidence bar before calling it the measured bottleneck. Startup latency of ~200 round trips is a `design risk` until traced.

Note the negative control: this is *not* a case where explain-plan inspection alone diagnoses the problem, and it is *not* fixed by a cache. Also, `EXPLAIN` is not a request counter — use the statement log to prove N+1.

## Why "fetch all orders into memory" fails

1. **Transfers $O(\text{rows})$, not $O(N)$.** 100 merchants with, say, 5k orders each pulls 500k rows and every column over the wire — orders of magnitude more data than 200 result rows, just relocated.
2. **Loses store-side selectivity.** `COUNT(*)`/`SUM()` can be answered by index-only access; materializing rows forces full row reads and heap access.
3. **Unbounded memory.** No projection, no `LIMIT`; dashboard memory scales with total order history, which grows without bound. This is the classic path to OOM under a page render.
4. **Correctness surface.** `SUM` must skip `NULL` and honor currency/decimal types; reimplementing it in application code invites float rounding and type-coercion bugs the database already handles. `COUNT(*)` vs `COUNT(amount)` semantics must be preserved explicitly.
5. **Does not remove the scan.** The unbatched `WHERE merchant_id IN (...)` over all orders still scans the same index ranges; you have paid transfer cost for identical I/O.

## Recommended remedy (smallest justified)

**Push the aggregate down with a single grouped query**, keeping the existing predicates:

```sql
SELECT merchant_id,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders,
       SUM(amount)                                  AS total_amount
FROM orders
WHERE merchant_id = ANY($1)
GROUP BY merchant_id;
```

One statement replaces 200. If the two aggregates must stay semantically separate (e.g. `SUM` over all statuses but `COUNT` only completed), a single statement with `FILTER` clauses still expresses both, as above. Then map rows back onto the 100 merchant records in the application, defaulting merchants with **zero** matching orders to `0` count and `NULL`/`0` total — a `GROUP BY` omits empty groups, and this is the most common regression of this refactor.

Indexes: one composite `(merchant_id, status)` supports the filtered count; a covering index `(merchant_id, status) INCLUDE (amount)` makes the aggregate index-only. Every index needs a named owning query and an accepted write cost on `orders`; do not add a third overlapping index.

**Do not** substitute a blanket `JOIN merchants LEFT JOIN orders` — it multiplies rows, inflates memory, and makes any future pagination on the merchant list incorrect.

## Scope and verification

- Tenant/authorization predicate `merchant_id = ANY(...)` must be built from the authorized merchant set, never from client input; the batch must not widen scope.
- Verify with the statement log: query count for the page should drop from 200 to 1 (or a bounded $Q_{base} + \lceil N/B \rceil$ if a chunk size is imposed), and remain flat as merchants are added to the filter.
- Confirm plan uses the new index, and check `EXPLAIN (ANALYZE)` row counts for the grouped query.
- Add a dashboard responsibility: alert if per-request statement count exceeds a threshold, so the loop cannot return unnoticed.
