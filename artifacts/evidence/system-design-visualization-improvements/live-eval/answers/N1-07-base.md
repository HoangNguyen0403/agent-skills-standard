# Review: 3.5s order detail page — DataLoader is the wrong fix

**Verdict: the diagnosis is wrong. This is not an N+1 problem, and DataLoader would change nothing.**

## The measurement contradicts the diagnosis

Two queries, constant, independent of order size: the workload is $O(1)$ in query count, not $O(N)$. A
per-parent fan-out would show statement count growing with the number of orders (or line items) returned.
Here it does not. Per the standard negative controls, a fixed 2–4 query routine is **not** amplified; if it is
slow, the defect is in access path and row volume, not in round-trip count.

DataLoader's mechanism is key-collapsing: it merges $N$ sibling lookups into $\lceil N/B \rceil$ batches, i.e.
$Q = Q_{base} + R\cdot\lceil N/B \rceil$. With $N = 1$ there is nothing to collapse — a batch of one is the
original query. Also note the lookup by `order_id` is 5 ms; it is not a candidate for anything.

Confusing "queries per request" with "latency" is the error: the query count is already minimal. 3495 ms out of
3500 ms sits in a single statement.

## The real bottleneck: an unbounded range scan on `audit_logs`

`SELECT * FROM audit_logs WHERE action_type = 'order_placed' AND created_at > ?` at 3495 ms has the signature of
a missing/ineffective composite index plus an unbounded result set:

1. **Index shape.** The query has one equality and one range. A usable composite index is
   `(action_type, created_at)` — equality column first, ranged column last. Any index with `created_at` before
   `action_type` cannot use the range after the equality predicate; single-column indexes force a scan or a
   bitmap-and-filter. `audit_logs` is an append-only time-series table and is typically the largest table, so a
   sequential scan here is expensive and this is the classic case where filtering down and then scanning back to
   the heap dominates.
2. **Row cardinality, not query count.** `created_at > ?` with only a lower bound grows monotonically: every day
   of retention adds rows to the result. Even after an index fix, a page that pulls "all order-placed audit rows
   since some timestamp" gets slower every week. This is the amplification that actually matters — rows, not
   statements.
3. **`SELECT *` on a wide audit table.** It defeats covering indexes, pulls columns nobody renders, and inflates
   transfer and serialization. Project the columns the page shows.
4. **Scope check.** The predicate has no tenant or `order_id` restriction. For an *order detail* page that is
   suspicious twice over: the read is likely broader than the page needs, and if those rows are rendered, an
   unscoped audit query is a cross-tenant exposure risk, not just a performance issue.

## Fix ladder, smallest first

1. **Capture evidence.** `EXPLAIN (ANALYZE, BUFFERS)` the exact statement with the real parameter. Do not use the
   plan as a request counter; use it for the access path: seq scan vs index scan, estimated vs actual rows, heap
   fetches. Record rows returned — that is the cost driver.
2. **Add the index the query owns:** `(action_type, created_at)`. Write cost is acceptable on an append-only table
   and the index has a named consuming query. Do not also add speculative indexes.
3. **Bound the query:** explicit column list, an upper bound on `created_at`, and `LIMIT`/keyset pagination. Decide
   from the UI what window is actually shown; today the page pays for the full table's history.
4. **Scope the predicate** to the order/tenant being viewed, if that is what the page displays.
5. **Then** consider structural options: time-partition `audit_logs` by retention window, or pre-aggregate the audit
   summary. Both are later steps, justified by measured volume.
6. **Only after the query shape is fixed**, consider caching the rendered audit block — and never a global or
   singleton cache for request-scoped data. Better still: audit display is not on the critical read path; render the
   order from the 5 ms query and load the audit panel asynchronously.

## What to tell the developer

DataLoader is the right tool for GraphQL resolver fan-out with $N$ sibling parents. Applying it here would add a
dependency, a caching layer, and a tenant-leak surface, and would leave the 3495 ms statement untouched. Fix the
index, bound the result set, and measure again before adding any machinery.
