---
name: php-security
description: PHP security standards for database access, password handling, and input validation. Use when securing PHP apps against SQL injection, XSS, or weak password storage.
metadata:
  triggers:
    files:
    - '**/*.php'
    keywords:
    - pdo
    - password_hash
    - htmlentities
    - filter_var
    - php security
    - sql injection
    - xss php
    - prepared statement
    - csrf
    - sanitize input
    - password storage
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

- **Prepared Statements**: Use PDO with Parameterized Queries: `$stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id'); $stmt->execute([':id' => $id]);`. NEVER concatenate user input into SQL strings.
- **Password Hashing**: ALWAYS use **`password_hash()`** with **`PASSWORD_ARGON2ID`** (PHP 7.4+) or **`PASSWORD_BCRYPT`**.
- **Auth Verification**: Use `password_verify()`. Use `password_needs_rehash()` to upgrade legacy hashes. Implement Rate Limiting and MFA where appropriate.
- **XSS Escaping**: Use `htmlentities($userInput, ENT_QUOTES | ENT_HTML5, 'UTF-8')` or `htmlspecialchars()` on all user output. Prefer Twig or Blade for auto-escaping.
- **CSRF Protection**: Mandate **`CSRF tokens`** for all state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Input Validation**: Use `filter_var($email, FILTER_VALIDATE_EMAIL)` or `filter_var($url, FILTER_VALIDATE_URL)`. Always Whitelist allowed values.
- **File Security**: RESTRICT file uploads by **MIME type** and **extension**. Store uploads **outside public root**.
- **Session Safety**: Configure **`session.cookie_httponly = 1`**, **`session.cookie_secure = 1`**, and **`session.samesite = "Lax"`**.
- **Header Security**: Enforce **`Content-Security-Policy (CSP)`**, **`X-Frame-Options: DENY`**, and **`X-Content-Type-Options: nosniff`**.

## Anti-Patterns

- **No SQL string concatenation**: Use PDO prepared statements only.
- **No MD5/SHA1 for passwords**: Use `password_hash($password, PASSWORD_ARGON2ID)`.
- **No raw `$_GET`/`$_POST`**: Validate all input with `filter_var()` first.
- **No production error display**: Log to file; never show to users.

## References

- [Secure Implementation Patterns](references/implementation.md)