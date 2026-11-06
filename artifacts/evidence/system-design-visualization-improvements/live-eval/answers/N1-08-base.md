# Audit: paginated organizations + members in one LEFT JOIN

## Verdict

Reject as written. The proposal is not an N+1 fix; it is the **blanket giant JOIN** anti-pattern. It breaks the two invariants that paginated 1:N retrieval must hold — parent pagination and determinism — and adds unbounded row multiplication on top. Two-query bounded batching is the correct remedy.

Evidence tier: `design risk`, not `observed`. No query plan, no statement trace, no row counts were supplied. Nothing here is a measured bottleneck; every finding below is a reasoned property of the SQL text, and each needs a trace before anyone calls it a performance defect.

## Findings

**P0 — Pagination is applied to joined rows, not organizations.**
`LIMIT 20 OFFSET 40` bounds the *result set* of the join, so each organization consumes as many rows as it has members (0–100). 20 output rows may be one org, or twenty orgs truncated mid-member-list. `OFFSET 40` then skips joined rows, not organizations, so "page 3" is not organizations 41–60. Member lists are silently incomplete. This is a correctness defect, not a tuning issue.

**P0 — No `ORDER BY`.**
`LIMIT`/`OFFSET` without a total ordering yields nondeterministic pages: rows duplicated across pages or skipped entirely, changing with plan or physical order. Any fix requires `ORDER BY o.id` (and ideally keyset `(o.id)` > last-seen rather than `OFFSET`, which still scans and discards 40 rows).

**P1 — Row explosion and payload inflation.**
Worst case 20 × 100 = 2,000 rows. `SELECT *` repeats every organization column once per member and ships columns no caller uses. Project the needed fields; if the UI only needs counts, use `GROUP BY o.id` / correlated aggregate and stop there.

**P1 — Tenant predicate is not enforced on the child.**
Only `o.tenant_id = 'T1'` is checked. Correctness silently depends on members being partitioned strictly by `org_id`, which no constraint shown guarantees, and RLS does not follow a join written this way. Add `AND m.tenant_id = 'T1'` as defense in depth and keep it in every child query, batch loader, and DataLoader. A shared loader must never be tenant-agnostic.

**P2 — Access path unevidenced.**
The parent page needs a composite index led by the filter and matching the sort — `organizations(tenant_id, id)` — and the child lookup needs `members(org_id, id)`. Neither is stated. Run `EXPLAIN (ANALYZE, BUFFERS)` before and after; do not use the plan as a request counter.

**P2 — LEFT JOIN semantics are right, serialization is not specified.**
Zero-member organizations must still appear, with `[]` and not `null` or a dropped key. Confirm the three-valued outer-join rows are collapsed into empty collections.

## Recommended remedy

Smallest justified fix, matching the "1:N with parent pagination" row of the remedy matrix:

1. Page parents alone: `SELECT id, name, … FROM organizations WHERE tenant_id = $1 ORDER BY id LIMIT 20 OFFSET $2` (or keyset on `id`).
2. Load children by bounded batch from the ordered parent ids: `SELECT org_id, id, … FROM members WHERE tenant_id = $1 AND org_id = ANY($ids) ORDER BY org_id, id`, chunked at B = 50–100.
3. Group in memory by `org_id`; missing keys become `[]`.

Cost: two queries, $Q_{base} + R \cdot \lceil N/B \rceil = 2$ at N = 20. Pagination, ordering, and tenant scope stay intact.

**If a single round trip is mandatory**, at minimum nest the parent page in a subquery so the limit applies to organizations, and aggregate children server-side:

```sql
SELECT o.*, COALESCE(json_agg(m.*) FILTER (WHERE m.id IS NOT NULL), '[]') AS members
FROM (SELECT * FROM organizations WHERE tenant_id = $1 ORDER BY id LIMIT 20 OFFSET $2) o
LEFT JOIN members m ON m.org_id = o.id AND m.tenant_id = $1
GROUP BY o.id ORDER BY o.id;
```

Measure the aggregate payload before adopting it; it still materializes up to 2,000 member rows per request, which batching avoids when a page's members are not all needed at once.

## Verification

- Page 1/2/3 with an org that has 100 members, an org with 0, and a mix: assert exactly 20 organizations per page, no duplicates, no gaps across pages, and `[]` for childless orgs.
- Re-run with a reordered physical heap or a different plan; pages must be identical.
- Two-tenant probe: tenant T2 rows with the same `org_id` naming never appear; omit the scope predicate and assert denial or empty, never a default tenant.
- Trace statement count per request: exactly 2 (or 1 for a count-only view). If the current code already loops over bounded `IN (...)` chunks, it is already batched — reject the N+1 label and look at index coverage instead.
