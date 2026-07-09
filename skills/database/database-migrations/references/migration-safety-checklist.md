# Migration Safety Checklist

## Expand → backfill → contract, step by step

1. **Expand**: add the new column/table/index alongside the old one. Nullable or defaulted so existing writes keep working unmodified.
2. **Dual-write** (if changing a column in place): application writes both old and new fields for a deploy cycle.
3. **Backfill**: populate the new shape for existing rows in resumable batches, off the request path.
4. **Verify**: confirm new and old data agree before cutting over reads.
5. **Cutover reads**: flip application reads to the new shape behind a flag if possible, so a bad backfill can be rolled back without a second migration.
6. **Contract**: once nothing reads the old shape, drop the old column/table/index in a separate, later migration.

## Backfill batching

- Batch by primary key range or cursor, not `OFFSET` (offset pagination degrades as the table grows and can skip/duplicate rows under concurrent writes).
- Cap batch size to keep individual transactions short — long-running backfill transactions hold locks and bloat WAL/redo logs.
- Add a sleep/throttle between batches on hot tables to leave headroom for production traffic.
- Make the backfill resumable: track the last processed key so a restart doesn't redo completed work.

## Rollback design

- Every migration needs a rollback path decided before it ships, not improvised after a failure.
- Additive migrations (new column/table) roll back trivially — just stop writing to the new shape.
- Destructive migrations (drop column/table) do not roll back — this is exactly why they're the last step (contract), after a full deploy cycle of confidence.

## Pre-flight checks

- [ ] Does this migration take a lock that blocks reads/writes on a hot table? (e.g. `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT` can rewrite the whole table on some engines/versions — check engine-specific behavior.)
- [ ] Is the backfill's expected duration and row count known ahead of time?
- [ ] Is there a dashboard/log to watch backfill progress and error rate?
- [ ] Does the deploy order (schema change vs. code change) avoid a window where old code hits the new shape or vice versa?
