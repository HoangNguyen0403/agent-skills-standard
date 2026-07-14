To add a column to a production PostgreSQL table without downtime, treat it as an online schema change and avoid operations that rewrite the whole table or hold long `ACCESS EXCLUSIVE` locks.

The safest general pattern is:

1. Add the new column as nullable and without a volatile default.
2. Deploy application code that can handle both old rows and new rows.
3. Backfill existing rows in small batches.
4. Add constraints only after the data is ready.
5. Switch reads and writes fully to the new column.

Example:

```sql
ALTER TABLE orders ADD COLUMN customer_tier text;
```

Why this is usually safe:

- Adding a nullable column is metadata-only in PostgreSQL.
- The table is not rewritten.
- The lock is short if there is no competing long-running transaction.

What to avoid initially:

- `ADD COLUMN ... NOT NULL` on a populated large table
- a default that forces expensive validation behavior on old PostgreSQL versions
- combining many schema changes into one statement during peak traffic

Recommended rollout:

Application rollout first:

- Make the application tolerate `NULL` in the new column.
- If the column will eventually be required, derive a fallback in code for old rows during the transition.
- Start writing the column for new/updated rows as soon as the column exists.

Backfill in batches:

```sql
UPDATE orders
SET customer_tier = 'standard'
WHERE id > $start_id
  AND id <= $end_id
  AND customer_tier IS NULL;
```

Batching matters because it:

- reduces row lock duration
- limits WAL spikes
- lowers replication lag risk
- keeps autovacuum pressure manageable

Typical operational safeguards:

- run batches ordered by primary key
- keep transactions small
- pause between batches if replication lag grows
- monitor locks, CPU, I/O, and replica replay delay

If the column must have a default:

- add the column first
- backfill existing rows
- then set the default for future inserts

Example:

```sql
ALTER TABLE orders ALTER COLUMN customer_tier SET DEFAULT 'standard';
```

If the column must become required:

1. Backfill all rows.
2. Verify there are no `NULL`s.
3. Enforce the rule.

Example:

```sql
SELECT count(*) FROM orders WHERE customer_tier IS NULL;
```

If zero:

```sql
ALTER TABLE orders ALTER COLUMN customer_tier SET NOT NULL;
```

For very large tables, many teams first add a check constraint in a controlled way, validate it, then convert or keep it as the enforcement mechanism:

```sql
ALTER TABLE orders
ADD CONSTRAINT orders_customer_tier_nn
CHECK (customer_tier IS NOT NULL) NOT VALID;

ALTER TABLE orders
VALIDATE CONSTRAINT orders_customer_tier_nn;
```

That pattern can reduce risk because validation is separated from the initial schema change.

Practical zero-downtime checklist:

- ensure no long-running transactions are blocking DDL
- add the column as nullable
- deploy compatible code
- backfill gradually
- add default for future writes if needed
- enforce `NOT NULL` only after verification
- monitor replicas and lock waiters throughout

In short: add the column in a backward-compatible form first, migrate data asynchronously, and only enforce stricter rules after the application and data are already ready.

