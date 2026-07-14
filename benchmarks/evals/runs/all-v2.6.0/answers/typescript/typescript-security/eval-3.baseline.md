String concatenation makes the query vulnerable to SQL injection. Use a parameterized query or the database driver's prepared-statement API so user input remains data:

```ts
const result = await db.query(
  "SELECT id, email FROM users WHERE email = $1",
  [email],
);
```

If the query builder or ORM uses named parameters, use its parameter-binding API rather than interpolating values. Allow-list structural inputs such as column names or sort directions because placeholders generally cannot represent SQL identifiers:

```ts
const sortColumn = sort === "created" ? "created_at" : "email";
const result = await db.query(
  `SELECT id, email FROM users ORDER BY ${sortColumn}`,
);
```

Validate request data at the boundary, use a least-privileged database account, and test the data-access layer with injection payloads. Escaping strings manually is not a substitute for parameterization.
