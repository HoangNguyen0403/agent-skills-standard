`var db *sql.DB` at package scope is usually a bad idea because it creates hidden global state.

Problems:

- Hard to test: functions depend on global state instead of explicit dependencies.
- Tight coupling: any package code can reach the DB, which makes boundaries unclear.
- Lifecycle confusion: opening, closing, and replacing the connection becomes harder to control.
- Concurrency/config risk: globals make initialization order and shared mutation easier to get wrong.

Important nuance: `*sql.DB` is not a single raw connection; it is a concurrency-safe connection pool. So the issue is usually not "package-level because sql.DB is unsafe", but "package-level because global dependency management is poor."

Prefer dependency injection:

```go
type Store struct {
    db *sql.DB
}

func NewStore(db *sql.DB) *Store {
    return &Store{db: db}
}
```

Then pass `Store` or `*sql.DB` into the components that need it.

