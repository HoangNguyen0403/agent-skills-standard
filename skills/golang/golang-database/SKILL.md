---
name: golang-database
description: Implement Go database access with context, pool tuning, transaction boundaries, and repository seams. Use when building repositories, tuning `sql.DB` or `pgx`, or reviewing DB transaction flow in Go.
metadata:
  triggers:
    files:
    - 'internal/adapter/repository/**'
    keywords:
    - database
    - sql
    - postgres
    - gorm
    - sqlc
    - pgx
---
# Golang Database

## **Priority: P0 (CRITICAL)**

## Rules

- Prefer explicit SQL or generated query layers when performance and shape matter.
- Configure the pool; defaults are rarely enough for real traffic.
- Pass `context.Context` as the first argument to every query path.
- **Strict Parameterization**: Always use parameterized placeholders (`?`, `$1`); never interpolate user strings into queries.
- **Dynamic IN Batching**: Generate safe placeholders (`strings.Repeat("?,", len(ids))`) or `sqlx.In` and partition lists into chunks ≤ 1,000 items to avoid driver parameter limits.
- **Explicit Column Aliasing**: Always alias duplicate column names in multi-table queries (e.g. `m.code AS code`); drivers map by name and silently collide on joins.
- **Transaction Boundaries**: Manage transactions at the service layer using `withTx(ctx, db, fn)` with mandatory `defer tx.Rollback()`. Keep transactions short and focused on writes.
- **Streaming & Keyset Pagination**: Stream large result sets using `rows.Next()` directly into models to prevent unbounded memory allocation.

## Recipe

1. **Choose the access layer**: `database/sql`, `pgx`, `sqlx`, `sqlc`, or ORM only if standardized.
2. **Tune the pool**: max open, max idle, connection lifetime, and idle lifetime.
3. **Hide storage details behind repository methods** or query services.
4. **Close rows and inspect `rows.Err()`**.
5. **Wrap multi-step writes in one transaction** using a `withTx` helper with `defer tx.Rollback()`.
6. **Chunk large slice lookups**: partition slices into batches of ≤ 1,000 before running `IN` queries.

## Verify

- [ ] Query methods accept `context.Context`.
- [ ] Pool settings are explicit.
- [ ] Rows are closed and iteration errors checked (`rows.Err()`).
- [ ] Large `IN (...)` queries chunk parameters into batches of ≤ 1,000.
- [ ] Joined queries use explicit column aliases without `SELECT *`.
- [ ] Transaction scope matches one business action and uses `defer tx.Rollback()`.
- [ ] Retry/idempotency policy is clear for contested writes.

## Anti-Patterns

- **No global db var**: inject DB connection via constructor.
- **No context-less queries**: use `QueryContext`/`ExecContext`; bare queries ignore timeouts.
- **No string concatenation in SQL**: never build dynamic clauses with `fmt.Sprintf` or `+`.
- **No unbounded IN lists**: avoid passing un-chunked slices with > 1,000 items into a single query.
- **No SELECT \* on Joins**: avoid unaliased duplicate column names across joined tables.
- **No leaked rows**: always `defer rows.Close()` and check `rows.Err()`.
- **No transaction split-brain**: handler, repo, and service cannot each open their own transaction for one unit of work.

## References

- [Framework Map](../references/framework-map.md)
- [Repository Pattern Implementation](references/repository-pattern.md)
- [Connection Tuning](references/connection-tuning.md)
