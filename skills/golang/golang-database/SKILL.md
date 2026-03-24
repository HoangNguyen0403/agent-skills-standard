---
name: golang-database
description: "Implement database access with connection pooling and repository patterns in Go. Use when building database access, connection pools, or repositories in Go. (triggers: internal/adapter/repository/**, database, sql, postgres, gorm, sqlc, pgx)"
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
2. **Configure pool** — Set `MaxOpenConns`, `MaxIdleConns`, and `ConnMaxLifetime` on the connection.
3. **Define repository interface** — Abstract DB access behind an interface at the consumer side.
4. **Use context-aware queries** — Always use `QueryContext`/`ExecContext`; bare queries ignore timeouts.
5. **Close rows** — Always `defer rows.Close()` and check `rows.Err()` after iteration.
6. **Wrap in transactions** — Use transactions for multi-step operations requiring atomicity.

### Repository Pattern Example

```go
type OrderRepository interface {
    GetByID(ctx context.Context, id string) (*Order, error)
    Create(ctx context.Context, order *Order) error
}

type pgOrderRepository struct {
    db *pgxpool.Pool
}

func (r *pgOrderRepository) GetByID(ctx context.Context, id string) (*Order, error) {
    row := r.db.QueryRow(ctx,
        "SELECT id, status, created_at FROM orders WHERE id = $1", id)
    var o Order
    if err := row.Scan(&o.ID, &o.Status, &o.CreatedAt); err != nil {
        return nil, fmt.Errorf("get order %s: %w", id, err)
    }
    return &o, nil
}
```

### Connection Pool Setup

```go
config, _ := pgxpool.ParseConfig(databaseURL)
config.MaxConns = 25
config.MinConns = 5
config.MaxConnLifetime = 30 * time.Minute

pool, err := pgxpool.NewWithConfig(ctx, config)
```

## Anti-Patterns

- ❌ Global `var db *sql.DB` — inject DB connection via constructor
- ❌ Bare `Query()`/`Exec()` without context — use `QueryContext`/`ExecContext`
- ❌ Leaked rows — always `defer rows.Close()` and check `rows.Err()`

## References

- [Repository Pattern Implementation](references/repository-pattern.md)
- [Connection Tuning](references/connection-tuning.md)
