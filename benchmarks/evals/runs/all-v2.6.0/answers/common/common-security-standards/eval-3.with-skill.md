The code is vulnerable to SQL injection because untrusted `userName` is concatenated into a raw SQL string. It also omits quotes around the value.

Use a parameterized query or ORM instead:

```js
const result = await db.query(
  'SELECT * FROM users WHERE name = $1',
  [userName]
);
```

For drivers using `?` placeholders:

```js
const result = await db.query(
  'SELECT * FROM users WHERE name = ?',
  [userName]
);
```

Also:

- Treat `userName` as untrusted at the API/UI boundary; validate expected type, length, and format.
- Use least-privilege database credentials.
- Avoid logging the user’s name or other PII.
- Add SQL-injection tests and run SAST/DAST scanners in CI.
- If authentication is involved, store passwords with Argon2id; unrelated session protections should use HttpOnly Secure cookies and rate limiting where appropriate.
