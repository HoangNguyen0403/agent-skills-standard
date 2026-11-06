# Merchant order aggregates: memory and query impact of application-side counting

## Assumptions (design-shaping, stated explicitly)

Row width: 200 B for a narrow projection (`id, merchant_id, status, amount, created_at`); 400–500 B as hydrated ORM entities. Worst-case cardinality: 500,000 orders for one merchant, 100 merchants. Numbers below are estimates from those widths, not measurements.

## 1. Cost of "fetch all orders into memory"

- **Rows moved:** 100 × 500,000 = 50,000,000 worst case (range starts at 0).
- **Wire bytes:** 50M × 200 B ≈ **10 GB per dashboard render**.
- **Heap:** 50M × 400–500 B ≈ **20–25 GB**. The single-merchant case already breaks the design: 500k × 400 B ≈ **200 MB**, above a typical 256–512 MB request heap.
- **Latency:** 50M rows at 50k–200k rows/s of serialization ≈ **4–17 min**, plus GC pressure and unbounded response buffers.
- **Query count:** 1–2 statements, so amplification "improves" while payload explodes — the trade is memory and transport for round trips, and it loses badly.
- **Correctness exposure:** the two aggregates have different predicates (`status='completed'` for the count, all statuses for the amount); computing them in one app loop invites predicate drift, and money summed in application floats rather than SQL `NUMERIC` risks rounding error. Zero-order merchants need explicit `NULL→0` mapping.

## 2. Cost of the current shape

200 statements per render (100 merchants × 2 aggregates) — that is **per-record aggregate amplification**, evidence tier `design risk` (static code, no runtime trace yet). Payload is already tiny (200 single-column rows), but DB work is not: each aggregate walks that merchant's index range, worst case **~100M index-tuple visits per render** (≈1–3 s CPU estimate). The defect is repeated statements and repeated scans, not rows transferred.

## 3. Bounded database-level design

### Tier 1 — one batched aggregate (default)

```sql
SELECT merchant_id,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders,
       COALESCE(SUM(amount), 0)                     AS total_amount
FROM orders
WHERE merchant_id = ANY($1::bigint[])
GROUP BY merchant_id;
```

- Statement count becomes `Q_base + R·⌈N/B⌉ = 1 + 1·⌈100/100⌉ = 2` regardless of merchant count, with `B` = the merchant page bound (100). Same cost at 1 or 100 merchants.
- **Rows returned ≤ 100** (<100 KB) versus 50M; per-row attribute fetching is eliminated.
- Merchants with zero orders produce no `GROUP BY` row: the page query `LEFT JOIN`s the aggregate so they render `0`, never `null`/missing; ordering stays `ORDER BY merchant_id`.
- Merchant pagination is preserved — page the merchant table first (`LIMIT`/`OFFSET`), then aggregate by that key page. No giant `JOIN` multiplying 500k child rows per merchant.
- **Index owner:** `orders (merchant_id, status) INCLUDE (amount)` serves both aggregates as an index-only scan on one path; cost is one extra B-tree per order write. Do not also add `(merchant_id)` alone — choose from `EXPLAIN (ANALYZE)` of this exact statement on a 500k-order merchant, and record the plan.
- **Authorization:** `$1` must be the server-resolved set of merchant ids this admin may see, not client-supplied ids validated only by shape; `merchant_id` stays in the aggregate predicate.
- **Guardrail:** `statement_timeout` plus instrumented p95 on the render path. A plan alone does not prove rendering cost.

### Tier 2 — rollup, only after Tier 1 measures insufficient

`merchant_order_stats(merchant_id PK, completed_count, total_amount, updated_at, source_version)`, written in the same transaction as order insert/update/delete (or via outbox/CDC). Dashboard becomes one PK range read of ≤100 rows. Required: named owner, staleness bound, rebuild path from `orders`, and a parity job comparing rollup against the Tier 1 aggregate. Rejected as the default because it adds a derived copy and a second write path before any measurement justifies it.

### Rejected outright

Fetching child rows to count them (memory ceiling above); a blanket giant `JOIN` of merchants × orders (row multiplication, broken pagination, same 10 GB); cache-first (hides the loop instead of fixing the query shape).
