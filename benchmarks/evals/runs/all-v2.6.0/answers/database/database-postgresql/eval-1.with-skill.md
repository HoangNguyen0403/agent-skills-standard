Use an expand -> backfill -> contract rollout. In PostgreSQL, the safe pattern is to make the schema change non-breaking first, deploy code that can handle both old and new states, backfill gradually, then remove the old path only after production traffic is fully moved.

Recommended sequence:

1. Expand the schema with a backward-compatible change.
   - Add the new column as nullable, or with a default that does not force a risky table rewrite on your PostgreSQL version and table shape.
   - Do not immediately add `NOT NULL` if existing rows are not ready.
   - Use an explicit migration; do not depend on ORM schema synchronization in production.

2. Deploy application code that can read and write both representations.
   - New writes should populate the new column.
   - Reads should tolerate rows where the new column is still null.
   - If the column changes meaning or format, keep translation logic in the application temporarily.

3. Backfill existing rows in controlled batches.
   - Avoid one giant `UPDATE` on a large hot table.
   - Batch by primary key or time range so you reduce lock time, WAL spikes, and replication lag.
   - If this is one business operation, keep each batch transaction scoped and explicit.

4. Add follow-up constraints and indexes after the data is ready.
   - Add indexes that match the real query shape: filters, joins, and sort order.
   - If the new column participates in tenant or RLS predicates, index it appropriately.
   - Only enforce `NOT NULL` after verifying backfill completeness.

5. Contract the old path.
   - Remove application fallback logic.
   - Drop the old column or old code path in a later migration after production verification.

Example:

```sql
-- expand
ALTER TABLE orders ADD COLUMN status_v2 text;

-- backfill (often done in batches outside one monolithic migration)
UPDATE orders
SET status_v2 = status
WHERE status_v2 IS NULL;

-- later, after app is writing status_v2 and all rows are backfilled
ALTER TABLE orders ALTER COLUMN status_v2 SET NOT NULL;

-- contract in a later release
ALTER TABLE orders DROP COLUMN status;
ALTER TABLE orders RENAME COLUMN status_v2 TO status;
```

Practical guardrails:

- Avoid destructive one-step changes in production.
- Match the transaction boundary to one business action, not an entire long-running migration campaign.
- Be explicit about pagination or batching strategy during backfill.
- Verify on production-like data before contract: row counts, null counts, write-path health, and query plans for any new index-backed reads.

