# SQL query review

The query is vulnerable to SQL injection because untrusted `userName` is concatenated directly into SQL. An attacker can supply quotes and SQL syntax to alter the `WHERE` clause, disclose other users, or perform destructive actions depending on the database account's permissions. It also mishandles ordinary names containing quotes and makes input validation and auditing harder.

Use a parameterized query or ORM so the driver treats `userName` strictly as data:

```typescript
const sql = 'SELECT * FROM users WHERE name = $1';
const result = await db.query(sql, [userName]);
```

For a driver using positional `?` placeholders, use:

```typescript
const result = await db.execute(
  'SELECT * FROM users WHERE name = ?',
  [userName],
);
```

Do not try to fix this by manually escaping quotes, filtering a few keywords, or interpolating a supposedly sanitized string. Validate the input at the trust boundary with an appropriate type, length limit, and application-specific character/normalization rules, but retain parameterization as the injection control. If the query later accepts a sort column or direction, those cannot normally be bound as values; select them from a fixed allowlist rather than concatenating user input.

Use a least-privilege database role that cannot perform unrelated writes or administrative operations, and avoid returning raw database errors or stack traces to the client. Log the security-relevant event without logging the full name or other PII. Add SQL-injection, quote-containing-name, empty/oversized-input, authorization, and error-path tests, then run SAST/DAST and dependency scans in CI before merge.

