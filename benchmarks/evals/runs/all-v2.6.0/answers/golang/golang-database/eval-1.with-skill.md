`var db *sql.DB` at package level creates hidden global state, which makes testing, lifecycle management, and transaction boundaries harder.

Main problems:

- It hides dependencies instead of injecting them.
- It encourages context-less calls from anywhere.
- It makes pool configuration and startup/shutdown ownership unclear.
- It couples unrelated code to one shared connection handle.
- It makes mocking or swapping the data layer awkward in tests.

Important nuance: `*sql.DB` is concurrency-safe and is meant to be shared, so the problem is not “one DB for the whole app.” The problem is exposing it as a global package variable.

Prefer constructor injection:

```go
type UserRepo struct {
    db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
    return &UserRepo{db: db}
}

func (r *UserRepo) FindByID(ctx context.Context, id int64) (*User, error) {
    row := r.db.QueryRowContext(ctx, `SELECT id, name FROM users WHERE id = $1`, id)
    var u User
    if err := row.Scan(&u.ID, &u.Name); err != nil {
        return nil, err
    }
    return &u, nil
}
```

Then initialize and tune the pool in one place at startup:

```go
db, err := sql.Open("postgres", dsn)
if err != nil {
    return err
}

db.SetMaxOpenConns(25)
db.SetMaxIdleConns(25)
db.SetConnMaxLifetime(30 * time.Minute)
db.SetConnMaxIdleTime(5 * time.Minute)
```

So: shared `*sql.DB` is good, but global `var db *sql.DB` is usually a design smell. Inject it, pass `context.Context` through query paths, and keep transaction ownership at the service/use-case boundary.

