# Review: "N+1 causes the 3.5s order detail page"

## Verdict

The diagnosis is **wrong**. This is not N+1 and DataLoader would not fix it.

## Evidence: the page is O(1) in query count

| Fact | Meaning |
| --- | --- |
| Exactly 2 queries, independent of order size | Constant-count routine (2–4 fixed queries), not amplification |
| `order_id` lookup = 5ms | Same access path a batched/prefetched query would use |
| `audit_logs` query = 3495ms | One query, ~99.86% of latency |

Query amplification means statement count grows with parent count `N`: `1 + N`, or bounded batches `Q_base + R·⌈N/B⌉`. Here the count is `2` for every order. That is the negative-control case the diagnosis skips: **constant-count queries are not N+1; if slow, diagnose index coverage and table scans via the plan.** DataLoader batches sibling key lookups within a request tick; with one order detail there are no siblings, so it would collapse one query into one query — zero change.

The timing split confirms it: a 5ms lookup beside a 3495ms scan is an access-path signature; fan-out shows many small statements, not one large one.

## Actual root cause

1. **Full scan.** `audit_logs` has 20M rows and no index on `(action_type, created_at)`. The predicate cannot be resolved by index, so the engine scans/reads the table and filters. Cost scales with table size, not order size — which is exactly why latency is flat across orders.
2. **Wrong query shape (independent defect).** The predicate is `action_type = 'order_placed' AND created_at > ?` with **no correlation key to the order**. Either this is a global activity feed misfiled onto the detail page, or the app filters down to this order in memory after fetching a wide time slice. In the second case the 3495ms buys almost nothing.

## Fix, smallest first

**1. Add the missing predicate.** Audit rows must be correlated to the entity:

```sql
SELECT id, action_type, actor_id, created_at
FROM audit_logs
WHERE order_id = ? AND action_type = 'order_placed' AND created_at > ?
ORDER BY created_at DESC
LIMIT 200;
```

Also replace `SELECT *` with an explicit column list: projection lowers I/O and makes covering indexes possible. Bound the result with `LIMIT`/cursor — audit detail on a page should never be unbounded.

**2. Index the query the code actually runs.** Composite, equality columns first, range column last:

```sql
CREATE INDEX CONCURRENTLY idx_audit_logs_order_placed
  ON audit_logs (order_id, action_type, created_at);
```

Column order is dictated by the predicate: equality on `order_id` and `action_type`, range on `created_at` last. Anything after the ranged column is unusable for the scan. If the order predicate truly cannot exist and the query must stay global, the correct index is `(action_type, created_at)` — but then the page is querying the wrong data and the index only hides a design error.

**3. Verify with the plan, not with intuition.**

```sql
EXPLAIN (ANALYZE, BUFFERS) <query>;
```

Expect `Seq Scan` on ~20M rows before, `Index Scan` returning a handful of rows after; target well under 50ms. Confirm statement count stays at 2 — it must, and that is the proof the DataLoader proposal was addressing nothing.

## Operational notes

- **Write cost.** `audit_logs` is append-mostly; one additional index is acceptable write amplification, but measure insert p99 during a concurrent build. Do not add further indexes without a named query owner.
- **Growth.** 20M rows and unbounded `created_at > ?` ranges are a retention problem. Define retention/archival and range-partition by `created_at` so scans and deletes stay bounded; partitioning is not a substitute for the index — apply it after.
- **Optional, only after the query is fast.** Audit entries are secondary content; if the SLO still requires it, load them asynchronously or via a separate endpoint. Never cache over an unindexed scan.

## Ruling on the proposal

Reject the DataLoader change: it adds request-scoped batching machinery to a path with cardinality 1 and addresses a pattern the telemetry contradicts. It also invites the classic misuse — a shared/global cache in front of an unoptimized query. Correct order of work: fix the predicate, add the owned composite index, verify the plan, then decide whether the audit block belongs on the critical path at all.
