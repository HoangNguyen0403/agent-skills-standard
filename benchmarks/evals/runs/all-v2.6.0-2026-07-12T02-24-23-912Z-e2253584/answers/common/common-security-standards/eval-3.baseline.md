This is vulnerable to SQL injection because `userName` is interpreted as SQL syntax rather than strictly as a value. It can let an attacker alter the predicate, read or modify unauthorized data, or exploit database privileges. It also has a quoting problem: a name containing a quote can break the query even without malicious intent.

Use a parameterized query or prepared statement provided by the database driver:

```text
SELECT * FROM users WHERE name = ?
```

Pass `userName` as the bound parameter through the driver’s parameter API; do not interpolate it into the SQL string. For a named-parameter API, the equivalent is:

```text
SELECT * FROM users WHERE name = :name
```

with a parameter map such as `{ name: userName }`. Parameterization must be applied to every user-controlled value, including values in `ORDER BY`, identifiers, and dynamic clauses. Identifiers and SQL keywords cannot usually be bound as values, so allowlist them from fixed server-side choices and reject everything else. Escaping or stripping quotes is not a reliable substitute for prepared statements.

Also validate input for business requirements, use a database account with only the required permissions, avoid returning unnecessary columns, and keep errors from exposing SQL details. Add tests using quotes, comment markers, boolean expressions, and other injection payloads, and verify that the driver actually uses bound parameters rather than a client-side string formatter.

