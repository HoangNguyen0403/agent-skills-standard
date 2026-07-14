Pass it explicitly, not as a global.

The usual Go pattern is:

1. Create the base logger in `main()`
2. Inject it into top-level dependencies via constructors
3. Derive child loggers per layer with `With(...)`
4. Add request-scoped values like request ID / trace ID at the edge

Example with `log/slog`:

```go
package main

import (
	"context"
	"log/slog"
	"os"
)

type UserRepo struct {
	logger *slog.Logger
}

func NewUserRepo(logger *slog.Logger) *UserRepo {
	return &UserRepo{logger: logger}
}

func (r *UserRepo) Save(ctx context.Context, userID string) error {
	r.logger.InfoContext(ctx, "saving user", "user_id", userID)
	return nil
}

type UserService struct {
	logger *slog.Logger
	repo   *UserRepo
}

func NewUserService(logger *slog.Logger, repo *UserRepo) *UserService {
	return &UserService{
		logger: logger,
		repo:   repo,
	}
}

func (s *UserService) CreateUser(ctx context.Context, userID string) error {
	s.logger.InfoContext(ctx, "creating user", "user_id", userID)
	return s.repo.Save(ctx, userID)
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	repoLogger := logger.With("layer", "repo", "component", "user_repo")
	svcLogger := logger.With("layer", "service", "component", "user_service")

	repo := NewUserRepo(repoLogger)
	svc := NewUserService(svcLogger, repo)

	ctx := context.Background()
	_ = svc.CreateUser(ctx, "u_123")
}
```

For request-scoped fields, attach them once near the HTTP/gRPC boundary:

```go
func handler(baseLogger *slog.Logger, svc *UserService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqLogger := baseLogger.With(
			"request_id", r.Header.Get("X-Request-ID"),
			"trace_id", r.Header.Get("X-Trace-ID"),
		)

		ctx := context.WithValue(r.Context(), loggerKey{}, reqLogger)
		_ = svc.CreateUser(ctx, "u_123")
	}
}
```

If many deep functions need the logger, two clean options are:

- dependency injection for long-lived components (`service`, `repo`, `client`)
- context for request-scoped enrichment

Good rule of thumb:

- Put the logger on structs that own behavior
- Use `ctx` for per-request metadata
- Derive child loggers with `With(...)`
- Avoid `log.Fatal` in libraries/services; return errors instead

So the short answer is: create once in `main`, inject through constructors, and enrich per layer/request rather than reaching for a global logger.

