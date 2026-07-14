Use parameter placeholders and pass values separately, instead of concatenating user input into the SQL string.

Example with `database/sql`:

```go
id := userInputID

row := db.QueryRow("SELECT name, email FROM users WHERE id = ?", id)
```

For PostgreSQL-style drivers, placeholders often look like `$1`, `$2`, etc.:

```go
row := db.QueryRow("SELECT name, email FROM users WHERE id = $1", id)
```

For inserts:

```go
_, err := db.Exec(
    "INSERT INTO users (name, email) VALUES (?, ?)",
    nameInput,
    emailInput,
)
```

Why this is safe:

- The SQL statement and the data are sent separately.
- The driver handles escaping and binding.
- User input is treated as data, not executable SQL.

Avoid this:

```go
query := "SELECT * FROM users WHERE name = '" + nameInput + "'"
```

That pattern is vulnerable to SQL injection.

