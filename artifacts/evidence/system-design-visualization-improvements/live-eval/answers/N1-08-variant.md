# Audit: one `LEFT JOIN` for paginated organizations with members

**Verdict: reject as proposed.** This is a blanket giant JOIN: it multiplies parent rows, corrupts `OFFSET` page boundaries, and weakens tenant enforcement. Evidence class is `design risk` (proposed query, no runtime trace) — not an observed bottleneck, and not a measured N+1 either.

## 1. Row multiplication

The page should contain 20 organizations, each with 0–100 members. The join emits one row per (org, member) pair, or one NULL-extended row for a childless org:

`rows = Σ_orgs max(1, member_count)` → between **20 and 2,000 rows** for a nominal 20-org page.

`LIMIT 20` therefore applies to *joined rows*, not organizations. One 100-member org consumes the entire page; a page holding two 100-member orgs returns 2 orgs instead of 20. `SELECT *` also repeats every organization column up to 100× (up to ~2,000 duplicated parent rows), inflating memory and payload while the client only needs 20 parent records. `DISTINCT`/`GROUP BY` cannot repair this: `LIMIT` runs before de-duplication, so page size is already wrong before the fix-up.

## 2. Offset corruption

`OFFSET 40` skips 40 *rows*, but the caller means 40 *organizations*. Because member counts vary per tenant (0 vs 100) and change over time, the row↔org mapping is unstable:

- An insert or delete of a member row shifts every later organization by an arbitrary row count → clients walking pages see duplicate organizations or silently skip whole ones.
- `OFFSET 40` can land mid-organization, splitting one org's members across two pages.
- No `ORDER BY` is given at all; deterministic ordering is required on the parent (with `o.id` as tiebreaker, since `created_at` alone is non-unique) and on children (`m.id`) for stable child order.

Even after deduplication, offset pagination stays O(offset) and drifts under concurrent inserts; keyset paging on `(created_at, id)` is the safer default.

## 3. Tenant isolation

`o.tenant_id = 'T1'` scopes the parent only; the join condition `o.id = m.org_id` inherits that scope **only if** organization IDs are globally unique and members carry no independent tenant dimension. No predicate is applied to `m`, so:

- If members are tenant-scoped (their own `tenant_id`, composite key `(tenant_id, org_id)`) or written by another path, the join can attach member rows the request is not authorized to read — and the database has no filter to enforce (row-level-security defense in depth is bypassed because the predicate is absent).
- `SELECT *` additionally projects `m.tenant_id` and any sensitive member columns the listing never needs: extraneous data exposure plus over-fetching.
- Required: tenant scope bound from the server-resolved session, applied on **both** parent and child access paths, never derived from request text or model output.

## 4. Zero-member organizations

`LEFT JOIN` is directionally right for childless orgs, but `SELECT *` yields NULL member columns; the serializer must emit `[]`, never `null` or a missing key. Deterministic child ordering must survive any rewrite.

## Recommended design — bounded two-query load

1. **Parent page:** `SELECT o.id, o.name, ... FROM organizations o WHERE o.tenant_id = $1 [AND (o.created_at, o.id) > ($2,$3)] ORDER BY o.created_at, o.id LIMIT 20` → exactly 20 organizations.
2. **Children:** `SELECT m.org_id, m.id, ... FROM members m WHERE m.tenant_id = $1 AND m.org_id = ANY($ids) ORDER BY m.org_id, m.id`. One batch (B = 100): `Q = 1 + ⌈20/100⌉ = 2` statements, independent of member count. Group in memory; missing orgs → `[]`.

Acceptable alternative: a materialized page CTE followed by `LEFT JOIN LATERAL` + JSON aggregation — one row per org, provided the page subquery is materialized so children cannot drive row count.

## Verification

- Fixture: orgs with 0, 1, and 100 members; page size 20, offset 40 → assert 20 org identities equal the non-join baseline and the childless org serializes `[]`.
- Two-tenant probe: T2 member rows shaped like T1's org IDs; assert nothing attaches and the request denies.
- Statement count per request: 2, not 21; `EXPLAIN` covers `(tenant_id, created_at, id)` and `(tenant_id, org_id, id)`.
- Concurrency: insert a member mid-walk; assert no duplicated or skipped organization.
