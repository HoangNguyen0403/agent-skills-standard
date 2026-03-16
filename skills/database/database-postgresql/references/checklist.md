# PostgreSQL Review Checklist

Use this checklist before finalizing any schema migration or complex query.

## Schema Design

- [ ] **PKs Usage**: Every table has a Primary Key? (BigInt or UUID).
- [ ] **Data Types**:
  - [ ] No `char(n)`, `varchar(n)`, `money`, `float` (for money).
  - [ ] Timestamps are `timestamptz`.
- [ ] **Foreign Keys**: Index all Foreign Keys manually? (Check joins/cascades).
- [ ] **constraints**: Use `NOT NULL`, `CHECK`, and `UNIQUE` to enforce integrity at DB level.
- [ ] **Normalization**: roughly 3NF? (Avoid JSONB for relational data unless schema is truly dynamic).

## Performance (Query/Index)

- [ ] **Index Usage**: `EXPLAIN ANALYZE` shows Index Scan, not Seq Scan (for large tables)?
- [ ] **SARGable**: Queries use Index-friendly operators (`=`, `>`, `<`)? No `LIKE '%term'`.
- [ ] **No `SELECT *`**: Explicit column selection.
- [ ] **Pagination**: Using Key-set/Cursor pagination for infinite scrolls?

## Security

- [ ] **RLS Enabled**: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` run?
- [ ] **Policies**: Policies created for SELECT, INSERT, UPDATE, DELETE?
- [ ] **Least Privilege**: Application user cannot `DROP TABLE` or `TRUNCATE`?

## Migrations

- [ ] **Locking**: Does the migration take heavy locks (`ACCESS EXCLUSIVE`)?
  - Alert: `ALTER TABLE ... ADD COLUMN ... DEFAULT ...` (Postgres 11+ is safe-ish, older is not).
  - Alert: `CREATE INDEX CONCURRENTLY` used for live tables?
- [ ] **Revertible**: Is there a down-migration?

## Concurrency & Monitoring

- [ ] **Transaction Size**: Are transactions kept short to avoid locking issues?
- [ ] **Deadlock Safety**: Do multi-row updates follow a consistent order (e.g., by ID)?
- [ ] **Logging**: Is `log_min_duration_statement` enabled in prod?
- [ ] **Analysis**: usage of `pg_stat_statements` checked for query tuning?
