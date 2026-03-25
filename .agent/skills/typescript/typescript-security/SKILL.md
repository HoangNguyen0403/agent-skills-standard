---
name: typescript-security
description: 'Secure coding practices for TypeScript. Use when validating input, handling auth tokens, sanitizing data, or managing secrets and sensitive configuration. (triggers: **/*.ts, **/*.tsx, validate, sanitize, xss, injection, auth, password, secret, token)'
---

# TypeScript Security

## **Priority: P0 (CRITICAL)**

Security standards for TypeScript applications based on OWASP guidelines.

## Implementation Guidelines

- **Validation**: Use **`Zod`**, **`Joi`**, or **`class-validator`** at the **API boundary**. Always **`parse`** and validate **`user-controlled input`** before using. Use **`safeParse`** for error handling without throwing. Return **`400 with structured errors`** on failure.
- **Sanitization**: Use **`DOMPurify`** for HTML sanitization to prevent **Cross-Site Scripting (XSS)**.
- **Secrets**: Store secrets in **`.env`** (e.g., **`JWT_SECRET`**) or **Secret Managers**. NEVER commit them to Git.
- **Vulnerabilities**: Prevent **SQL Injection** using **Parameterized Queries** (e.g., **`pool.query('... WHERE id = $1', [id])`**) or **Type-safe ORMs** (**`Prisma`**/`TypeORM`). Use **`Prisma.sql`** for raw queries.
- **Authentication**: Use **`Argon2id`** for password hashing. Implement **`JWT`** (via **`jsonwebtoken`** or **`jose`**) with **`HttpOnly`** and **`Secure`** cookies. Use **`RS256`** for public/private key pairs and implement **`Refresh Token rotation`**.
- **CORS**: Configure **`CORS`** with **Strict Origin Whitelisting**. Avoid `origin: '*'`.
- **Encryption**: Use **`crypto`** (Node.js) or **`Web Crypto API`** for sensitive data. Avoid legacy algorithms like MD5/SHA1.
- **Input Filtering**: Sanitize **`user-controlled input`** before using it in file paths or OS commands (Command Injection).

## Verification

After typing validation schemas (Zod/joi) or auth guards, call `getDiagnostics` (typescript-lsp) to confirm type narrowing is correct before finalizing.

## Anti-Patterns

- **No `eval()`**: Avoid dynamic execution.
- **No Plaintext**: Never commit secrets.
- **No Trust**: Validate everything server-side.

## References

See [references/REFERENCE.md](references/REFERENCE.md) for Zod validation, secure cookie setup, JWT auth, security headers, and RBAC patterns.
