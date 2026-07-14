Pass it explicitly via dependency injection, not as a global.

Typical pattern:

1. Create the logger at the app entrypoint.
2. Inject it into your top-level services/handlers.
3. Store either the logger or a narrow logging interface on each struct.
4. Pass derived child loggers downward when you want layer-specific context.

Example:

```go
type Logger interface {
    Info(msg string, keysAndValues ...any)
    Error(err error, msg string, keysAndValues ...any)
}

type UserRepo struct {
    log Logger
}

func NewUserRepo(log Logger) *UserRepo {
    return &UserRepo{log: log}
}

type UserService struct {
    log  Logger
    repo *UserRepo
}

func NewUserService(log Logger, repo *UserRepo) *UserService {
    return &UserService{log: log, repo: repo}
}
```

Then wire it up in `main`:

```go
repo := NewUserRepo(logger)
svc := NewUserService(logger, repo)
```

If your logger supports structured context, create scoped loggers per layer, for example adding `component=user_service`.

That keeps logging consistent, testable, and easy to replace in tests with a mock or no-op logger.

