Use `QueryContext` plus `defer rows.Close()` immediately after checking the query error, then always check `rows.Err()` after the loop.

```go
func ListUsers(ctx context.Context, db *sql.DB) ([]User, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, email
		FROM users
		ORDER BY id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}
```

Key points:

- `defer rows.Close()` prevents connection/row leaks on early returns.
- `rows.Err()` catches iteration errors that happen after `Next()`.
- Prefer `QueryContext` so cancellation/timeouts propagate.
- Don’t keep `rows` in a wider scope than the function that consumes it.

