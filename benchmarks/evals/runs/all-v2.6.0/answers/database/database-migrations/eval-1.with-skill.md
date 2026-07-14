Do not do a one-shot `RENAME COLUMN` on a busy `orders` table. Use an expand -> backfill -> contract rollout so old and new code paths can safely coexist.

Recommended plan:

1. Expand
   - Add a new nullable column: `lifecycle_status`.
   - If queries filter on status, add the matching index for `lifecycle_status` before cutover.
   - Deploy this schema change first so nothing breaks while application code is still using `status`.

2. Dual-write
   - Update application writes so any create/update of an order writes both `status` and `lifecycle_status`.
   - Keep reads on `status` initially.
   - If possible, guard future read cutover behind a feature flag.

3. Backfill existing rows
   - Run an out-of-band backfill that copies `status -> lifecycle_status` in small resumable batches.
   - Batch by primary key or cursor, not `OFFSET`, to avoid skipped or duplicated work under concurrent traffic.
   - Keep transactions short, throttle between batches if needed, and record progress so the job can resume after interruption.
   - Emit visibility for rows processed, lag remaining, and errors.

4. Verify
   - Check that all rows now have `lifecycle_status` populated.
   - Compare old/new values on a sample and ideally with a mismatch query (`status != lifecycle_status`) to confirm parity.
   - Confirm dual-write keeps both columns in sync for newly updated rows during the rollout window.

5. Cut over reads
   - Switch application reads from `status` to `lifecycle_status` only after backfill verification passes.
   - Continue dual-write for at least one deploy cycle so rollback remains easy.

6. Contract later
   - Once no code reads `status` and monitoring stays clean, remove dual-write.
   - Drop the old `status` column in a separate later migration, not in the same release.

Rollback / pause strategy:

- If the backfill misbehaves, pause the job and keep reads on `status`.
- If the new code causes issues after read cutover, flip reads back to `status`; dual-write preserves compatibility.
- Avoid dropping `status` until the system has run stably on `lifecycle_status` long enough that rollback is no longer needed.

Why this is the safe approach:

- It avoids a destructive rename on a hot table.
- It keeps the app online during schema rollout.
- It makes the backfill observable and resumable.
- It preserves compatibility between old and new application versions during deployment.

