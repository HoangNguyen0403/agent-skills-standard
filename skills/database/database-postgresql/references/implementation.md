# Implementation Examples

## Expand-Contract Migration

```sql
-- Step 1: Add new column (non-breaking)
ALTER TABLE orders ADD COLUMN status_v2 VARCHAR(50);

-- Step 2: Backfill
UPDATE orders SET status_v2 = status;

-- Step 3: Drop old column (after code deploys)
ALTER TABLE orders DROP COLUMN status;
ALTER TABLE orders RENAME COLUMN status_v2 TO status;
```
