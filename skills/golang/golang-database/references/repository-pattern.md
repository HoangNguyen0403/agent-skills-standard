# Repository Pattern

Example using `sql.DB` or `pgx`.

## Interface

Defined in `internal/domain/repository.go` or `internal/port/repository.go`.

```go
type UserRepository interface {
    GetByID(ctx context.Context, id string) (*domain.User, error)
    Create(ctx context.Context, user *domain.User) error
}
```

## Implementation

Defined in `internal/adapter/repository/postgres/user_repo.go`.

```go
type PostgresUserRepository struct {
    db *sql.DB
}

func NewPostgresUserRepository(db *sql.DB) *PostgresUserRepository {
    return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
    query := `SELECT id, email FROM users WHERE id = $1`
    row := r.db.QueryRowContext(ctx, query, id)

    var u domain.User
    if err := row.Scan(&u.ID, &u.Email); err != nil {
        if err == sql.ErrNoRows {
            return nil, domain.ErrUserNotFound
        }
        return nil, err
    }
    return &u, nil
}
```

## pgx Repository with Pool

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

## Connection Pool Setup

```go
config, _ := pgxpool.ParseConfig(databaseURL)
config.MaxConns = 25
config.MinConns = 5
config.MaxConnLifetime = 30 * time.Minute

pool, err := pgxpool.NewWithConfig(ctx, config)
```
