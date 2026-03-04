---
name: Golang Security
description: Security standards for Go backend services. Use when implementing input validation, crypto, or SQL injection prevention in Go.
metadata:
  labels: [golang, security, validation, crypto]
  triggers:
    files: ['**/*.go']
    keywords: [crypto/rand, sql, sanitize, jwt, bcrypt, validation]
---

# Golang Security Standards

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

### Input Validation

- **Validation**: Use `go-playground/validator` or `google/go-cmp` for struct validation.
- **Sanitization**: Sanitize user input before processing. Use `bluemonday` for HTML sanitization.

### Cryptography

- **Random**: ALWAYS use `crypto/rand`, NEVER `math/rand` for security-sensitive operations (tokens, keys, IVs).
- **Hashing**: Use **Argon2id** for password hashing (`golang.org/x/crypto/argon2`). Do NOT use bcrypt (weaker) or MD5/SHA1 (insecure). Recommended params: `time=1, memory=64MB, threads=4`.
- **Encryption**: Use `crypto/aes` with GCM mode for authenticated encryption.

### SQL Injection Prevention

- **Parameterized Queries**: ALWAYS use `$1, $2` placeholders with `database/sql` or ORM (GORM, sqlx).
- **No String Concatenation**: Never build queries with `fmt.Sprintf()`.

### Authentication

- **JWT**: Use `golang-jwt/jwt` v5+. Enforce `RS256` (preferred) or `HS256`. **Reject `none` and symmetric algorithms for multi-service auth**. Validate `alg`, `iss`, `aud`, `exp` claims.
- **Sessions**: Use secure, httpOnly cookies with `gorilla/sessions`.

### Secret Management

- **Environment Variables**: Load secrets via `godotenv` or Kubernetes secrets.
- **No Hardcoding**: Never commit API keys, passwords, or tokens to Git.

## Anti-Patterns

- **No `math/rand` for Security**: RNG is predictable. Use `crypto/rand`.
- **No `fmt.Sprintf()` for SQL**: Causes SQL injection. Use placeholders.
- **No bcrypt or MD5 for Passwords**: Use `argon2id` exclusively.
- **No Exposed Error Details**: Don't leak stack traces to clients in production.

## References

- [Implementation Examples](references/implementation.md)
