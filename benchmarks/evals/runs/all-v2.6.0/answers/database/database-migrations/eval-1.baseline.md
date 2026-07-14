Renaming `status` to `lifecycle_status` on a busy `orders` table should be treated as a compatibility change, not just a schema edit.

Recommended baseline approach:

1. Add the new column first instead of doing an immediate destructive rename.
   - Create nullable `lifecycle_status`.
   - Backfill it from `status` in batches if the table is large.
   - Add any needed index after or during rollout, depending on the database and traffic profile.

2. Make application code tolerate both columns during the transition.
   - New writes should populate both `status` and `lifecycle_status`, or write the new column while reads fall back to the old one.
   - Reads should prefer `lifecycle_status` but fall back to `status` until backfill is complete.

3. Validate consistency before cleanup.
   - Confirm row counts match expectations.
   - Check for rows where `status != lifecycle_status`.
   - Watch query latency, lock behavior, replication lag, and error rates during rollout.

4. Only after all app instances use the new name, remove the old column.
   - Make `lifecycle_status` `NOT NULL` if appropriate.
   - Drop `status`.
   - Remove temporary dual-write or fallback logic.

Why this is safer on a busy table:

- Direct column rename can break old application versions, background jobs, ETL, dashboards, ad hoc SQL, and downstream consumers immediately.
- Large-table rewrites or locking DDL may cause production impact depending on the database engine.
- Expand/migrate/contract rollout supports zero-downtime deployments and rollback.

If the database supports metadata-only rename with minimal locking, a direct rename may be technically possible, but for a busy production table the safer default is:

expand -> backfill -> dual read/write -> cut over -> contract

That pattern minimizes downtime risk and application/schema skew.

