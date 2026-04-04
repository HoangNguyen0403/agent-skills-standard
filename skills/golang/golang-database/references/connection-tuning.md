# Connection Pool Tuning

## Recommended Settings

```go
db, err := sql.Open("pgx", dsn)
if err != nil {
    log.Fatal(err)
}

db.SetMaxOpenConns(25)          // max concurrent connections
db.SetMaxIdleConns(10)          // keep-alive pool size (≤ MaxOpenConns)
db.SetConnMaxLifetime(5 * time.Minute)  // recycle before server timeout
db.SetConnMaxIdleTime(2 * time.Minute)  // evict long-idle connections
```

## Guidelines

| Setting           | Typical Value       | Rule                                                       |
| ----------------- | ------------------- | ---------------------------------------------------------- |
| `MaxOpenConns`    | 10–50               | Match DB server's `max_connections / num_app_instances`    |
| `MaxIdleConns`    | 50% of MaxOpenConns | Too high wastes memory; too low causes churn               |
| `ConnMaxLifetime` | 5–10 min            | Less than PostgreSQL `idle_in_transaction_session_timeout` |
| `ConnMaxIdleTime` | 1–3 min             | Reclaim idle connections under low traffic                 |

## Ping on Startup

Always verify connectivity before accepting traffic:

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
if err := db.PingContext(ctx); err != nil {
    log.Fatalf("database unreachable: %v", err)
}
```

## Anti-Patterns

- **No unlimited pool**: Default `MaxOpenConns` is unlimited — always cap it.
- **No MaxIdleConns > MaxOpenConns**: Idle pool can't exceed open pool; Go silently ignores excess.
- **No zero lifetime**: Without `ConnMaxLifetime`, stale connections to restarted DBs cause errors.
