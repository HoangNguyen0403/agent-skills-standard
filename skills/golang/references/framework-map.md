# Go Framework Map

Reviewed: 2026-06-17

Official sources:
- https://go.dev/doc/
- https://go.dev/doc/effective_go
- https://go.dev/doc/go1.21
- https://go.dev/doc/go1.25

## Default stance

- `golang-architecture`: layout, package boundaries, dependency direction.
- `golang-api-server`: handlers, middleware, shutdown, HTTP composition.
- `golang-database`: repository boundaries, pools, transactions, context use.
- `golang-error-handling`: wrapping and classification.
- `golang-testing`: table tests, integration seams, race-safe verification.

## Layout defaults

- `cmd/` for entrypoints.
- `internal/` for app-private packages.
- `pkg/` only for packages intentionally reusable outside the module.
- Package by domain or capability before package-by-layer sprawl.

## Runtime defaults

- Pass `context.Context` through request, DB, and outbound I/O paths.
- Prefer `log/slog` for structured logging in modern codebases.
- Build with standard tools first: `go test`, `go vet`, `staticcheck`, `govulncheck`, `pprof` when profiling.

## Smells that mean "load more skills"

- `main.go` owns too much wiring or business logic.
- Repositories ignore `context`.
- Transaction code spans handlers and services without a clear boundary.
- Global mutable state or package singletons control app behavior.
