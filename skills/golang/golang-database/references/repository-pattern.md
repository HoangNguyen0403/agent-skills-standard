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
