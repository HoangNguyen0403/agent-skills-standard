---
name: php-security
description: 'PHP security standards for database access, password handling, and input validation. Use when securing PHP apps against SQL injection, XSS, or weak password storage. (triggers: **/*.php, pdo, password_hash, htmlentities, filter_var)'
---

# PHP Security

## **Priority: P0 (CRITICAL)**

## Structure

```text
src/
└── Security/
    ├── Validators/
    └── Auth/
```

## Implementation Guidelines

- **Prepared Statements**: Use PDO exclusively. Never concatenate SQL.
- **Type Binding**: Apply `bindParam()` with PDO constants.
- **Password Hashing**: Use `password_hash()` with `PASSWORD_ARGON2ID`.
- **Verify Securely**: Use `password_verify()` for all authentication.
- **XSS Escaping**: Apply `htmlentities($data, ENT_QUOTES, 'UTF-8')` to all user output.
- **Input Filtering**: Use `filter_var()` for types (email, URL, int).
- **CSRF Protection**: Require tokens for all state-changing requests.

## Anti-Patterns

- **No SQL string concatenation**: Use PDO prepared statements only.
- **No MD5/SHA1 for passwords**: Use `password_hash($password, PASSWORD_ARGON2ID)`.
- **No raw `$_GET`/`$_POST`**: Validate all input with `filter_var()` first.
- **No production error display**: Log to file; never show to users.

## References

- [Secure Implementation Patterns](references/implementation.md)
