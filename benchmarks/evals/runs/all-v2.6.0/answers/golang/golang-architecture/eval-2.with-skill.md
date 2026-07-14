No. The domain layer should not import the DB package directly.

Keep the domain/service code focused on business rules and define a small repository interface on the consumer side instead. Then wire the concrete database implementation at startup, typically from `cmd/<app>/main.go` through constructors in `internal/...`.

Example shape:

```go
type UserRepository interface {
    FindByID(ctx context.Context, id string) (User, error)
}

type UserService struct {
    repo UserRepository
}

func NewUserService(repo UserRepository) *UserService {
    return &UserService{repo: repo}
}
```

Then the DB-backed repo lives in a storage package, and `main` composes it:

```go
repo := postgres.NewUserRepository(db)
svc := service.NewUserService(repo)
```

That keeps imports flowing inward, avoids coupling domain logic to a specific database, and makes testing easier.

