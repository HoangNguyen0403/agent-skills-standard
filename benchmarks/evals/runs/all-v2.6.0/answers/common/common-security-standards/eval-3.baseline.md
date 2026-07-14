The query is vulnerable to SQL injection because `userName` is concatenated directly into SQL.

Use a parameterized query:

```js
const result = await db.query(
  'SELECT * FROM users WHERE name = $1',
  [userName]
);
```

For MySQL-style APIs:

```js
const [rows] = await connection.execute(
  'SELECT * FROM users WHERE name = ?',
  [userName]
);
```

Assumption: `db.query` uses PostgreSQL-style `$1` parameters; use the placeholder syntax required by your database driver.
