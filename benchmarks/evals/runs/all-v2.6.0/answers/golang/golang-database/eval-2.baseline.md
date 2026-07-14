Always close the `*sql.Rows`, even on early returns.

Use:

```go
rows, err := db.QueryContext(ctx, q, args...)
if err != nil {
    return err
}
defer rows.Close()

for rows.Next() {
    // scan row
}

if err := rows.Err(); err != nil {
    return err
}
```

Why:
- `Query`/`QueryContext` holds a connection until `rows.Close()` or iteration fully completes.
- If you exit early without closing, the connection can stay busy and appear as a leak.

Rules of thumb:
- Call `defer rows.Close()` immediately after a successful query.
- Still call `rows.Err()` after the loop.
- If you break out of the loop early, `defer` ensures cleanup.
- For a single row, prefer `QueryRowContext` so there is no `Rows` to manage.

