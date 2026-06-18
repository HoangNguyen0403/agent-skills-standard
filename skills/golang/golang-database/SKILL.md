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
- Pass `context.Context` to every query path.
- Keep transaction ownership at the service/use-case boundary, not split across handlers.

## Recipe

1. **Choose the access layer**: `database/sql`, `pgx`, `sqlc`, or ORM only if the team already standardizes on it.
2. **Tune the pool**: max open, max idle, connection lifetime, and idle lifetime.
3. **Hide storage details behind repository methods** or query services.
4. **Close rows and inspect `rows.Err()`**.
5. **Wrap multi-step writes in one transaction** and propagate context/deadlines.

## Verify

- [ ] Query methods accept `context.Context`.
- [ ] Pool settings are explicit.
- [ ] Rows are closed and iteration errors checked.
- [ ] Transaction scope matches one business action.
- [ ] Retry/idempotency policy is clear for contested writes.

## Anti-Patterns

- **No global db var**: inject DB connection via constructor.
- **No context-less queries**: use `QueryContext`/`ExecContext`; bare queries ignore timeouts.
- **No leaked rows**: always `defer rows.Close()` and check `rows.Err()`.
- **No transaction split-brain**: handler, repo, and service cannot each open their own transaction for one unit of work.

## References

- [Framework Map](../references/framework-map.md)
- [Repository Pattern Implementation](references/repository-pattern.md)
- [Connection Tuning](references/connection-tuning.md)
