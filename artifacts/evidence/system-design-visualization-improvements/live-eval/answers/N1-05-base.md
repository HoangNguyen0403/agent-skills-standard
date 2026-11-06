# Audit Verdict: Chunked `IN (...)` Loader Is Not N+1 — Scanner Finding Rejected

## Verdict

**False positive. The finding is rejected and no remediation is warranted.** The import job is already batched; the static scanner pattern-matched "loop containing a SQL call" without modeling the chunking.

## What the code actually does

- Reads 1,000 incoming item IDs.
- Splits them into 20 slices of 50.
- Emits one parameterized `SELECT * FROM items WHERE id IN (?, ...)` with 50 bind parameters per slice.
- Total statements: **20**, independent of per-row lazy loading.

## Classification by evidence tier

| Tier | Source | Applies here? |
| --- | --- | --- |
| Code-only | static scan, loop shapes | Yes — the only evidence available |
| Proposed design | architecture docs | No |
| Runtime trace | query logs, statement listener | No — none supplied |

Static inspection alone caps this at `suspected`. A measured bottleneck claim would require an instrumented trace. Here the code is inspectable enough to resolve the question without one.

## Why it is not amplification

N+1 amplification requires statement count to scale **linearly with parent row count at one statement per row** — lazy relation loads inside iteration loops, serializer property traversals, per-record `COUNT`/`SUM`, or GraphQL resolver fan-out. None of those patterns are present.

Chunked key lookup is the *declared remedy*, not the defect. It conforms to the bounded batch formula:

$$Q = Q_{base} + R \cdot \left\lceil \frac{N}{B} \right\rceil = 1 + 1 \cdot \left\lceil \frac{1000}{50} \right\rceil = 21 \text{ queries}$$

The code's 20 statements are the same shape minus a separate base query — page/chunk selection and retrieval merged. Growth is `O(N/B)` with a fixed `B = 50`, i.e. sub-linear in the row count with ~50x throughput per round trip. The unbounded per-row alternative would emit 1,000 statements; the observed design emits 20.

Negative controls satisfied:

- **Already-batched loading** — fixed-size `IN` chunks, not per-entity queries. Confirmed.
- **Constant-count routines** — not the case (it is bounded-growth, which is still acceptable), so this control is not needed.
- Not a spare-instance redundancy confusion.

## Residual risks worth checking (none are N+1)

1. **Batch size (50) tuning.** Not a defect, a throughput knob. Larger `B` reduces round trips until parameter-count limits, plan-cache churn, or lock/memory footprint on the `IN` list become binding. Validate `B` against the driver's bind-parameter cap and the `items.id` index's selectivity.
2. **Index ownership.** `WHERE id IN (...)` needs a real access path. Confirm `items.id` is indexed (primary key or unique) and inspect one `EXPLAIN` for the 50-parameter statement. Mandatory index anti-pattern: each index must own a named query path.
3. **`SELECT *`.** Fetching all columns for 50 rows widens network and deserialization cost and defeats index-only scans. If only a subset of columns is consumed, project them. This is a cost/efficiency note, not amplification.
4. **Missing IDs.** With `IN (...)` and no ordering guarantee, the caller must not assume result order matches input order, and must handle IDs that return no row rather than treating result count as progress.
5. **Tenant/authorization predicates.** If `items` is tenant-scoped, the batched query must retain the tenant predicate alongside the `IN` clause. Chunked loading must never widen scope.
6. **Transaction/snapshot behavior.** Twenty statements run at different times can observe different snapshots. If the import requires a consistent read, wrap in a single transaction or accept the relaxed guarantee explicitly.

## Scanner suppression guidance

Suppress the rule on this call site with a documented rationale ("chunked bounded batch lookup, `B = 50`, `O(N/B)`") so the false positive does not re-surface, and tighten the scanner rule to flag only loops issuing one statement per iteration element. Do not add caching to silence the alert — caching would hide nothing here and would introduce staleness on an import path.

## Summary

Statement count is 20 for 1,000 IDs by construction; the design is the bounded-batch pattern the diagnostic explicitly lists as a negative control. Reject the N+1 vulnerability. Follow-ups are performance tuning (batch size, column projection, index verification), not defect remediation.
