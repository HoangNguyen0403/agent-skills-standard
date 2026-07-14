Use parameterized queries with placeholders and pass user input as separate arguments to `Query`, `QueryRow`, or `Exec`. Do not build SQL with string concatenation or `fmt.Sprintf`.

```go
package main

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

type User struct {
	ID    int
	Email string
}

func getUserByEmail(db *sql.DB, email string) (*User, error) {
	const q = `SELECT id, email FROM users WHERE email = $1`

	var u User
	if err := db.QueryRow(q, email).Scan(&u.ID, &u.Email); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func main() {
	db, err := sql.Open("postgres", "postgres://user:pass@localhost/dbname?sslmode=disable")
	if err != nil {
		panic(err)
	}
	defer db.Close()

	user, err := getUserByEmail(db, "alice@example.com")
	if err != nil {
		panic(err)
	}
	fmt.Println(user)
}
```

For inserts or updates, use the same pattern:

```go
_, err := db.Exec(
	`UPDATE users SET last_login = NOW() WHERE id = $1`,
	userID,
)
```

Why this is safe: the SQL statement and the data are sent separately, so the driver treats the input as a value, not executable SQL.

Avoid this:

```go
query := fmt.Sprintf("SELECT id, email FROM users WHERE email = '%s'", email)
```

That pattern is vulnerable to SQL injection.

