---
name: golang-database
description: Implement database access with connection pooling and repository patterns in Go. Use when building database access, connection pools, or repositories in Go.
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

## Principles

- **Prefer Raw SQL/Builders over ORMs**: `sqlc` generates type-safe Go from SQL. ORMs (GORM) can obscure performance.
- **Repository Pattern**: Abstract DB access behind interfaces in `internal/port/`.
- **Connection Pooling**: Always configure pool settings.
- **Transactions**: ACID logic must use transactions. Pass `context.Context` everywhere.

## Implementation Workflow

1. **Choose driver** — PostgreSQL: `pgx/v5`; MySQL: `go-sql-driver/mysql`; SQLite: `modernc.org/sqlite`.
2. **Configure pool** — Set `MaxOpenConns`, `MaxIdleConns`, and `ConnMaxLifetime` on connection.
3. **Define repository interface** — Abstract DB access behind interface at consumer side.
4. **Use context-aware queries** — Always use `QueryContext`/`ExecContext`; bare queries ignore timeouts.
5. **Close rows** — Always `defer rows.Close()` and check `rows.Err()` after iteration.
6. **Wrap in transactions** — Use transactions for multi-step operations requiring atomicity.

See [repository pattern and connection pool examples](references/repository-pattern.md)

## Anti-Patterns

- **No global db var**: inject DB connection via constructor.
- **No context-less queries**: use `QueryContext`/`ExecContext`; bare queries ignore timeouts.
- **No leaked rows**: always `defer rows.Close()` and check `rows.Err()`.

## References

- [Repository Pattern Implementation](references/repository-pattern.md)
- [Connection Tuning](references/connection-tuning.md)