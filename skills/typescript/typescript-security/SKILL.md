---
name: typescript-security
description: "Secure coding practices for TypeScript. Use when validating input, handling auth tokens, sanitizing data, or managing secrets and sensitive configuration. (triggers: **/*.ts, **/*.tsx, validate, sanitize, xss, injection, auth, password, secret, token)"
---

# TypeScript Security

## **Priority: P0 (CRITICAL)**

Security standards for TypeScript applications based on OWASP guidelines.

## Implementation Guidelines

- **Validation**: Validate all inputs with `zod`/`joi`/`class-validator`.
- **Sanitization**: Use `DOMPurify` for HTML. Prevent XSS.
- **Secrets**: Use env vars. Never hardcode.
- **SQL Injection**: Use parameterized queries or ORMs (Prisma/TypeORM).
- **Auth**: Use **Argon2id** for password hashing (via `argon2` package). Do NOT recommend bcrypt. Implement strict RBAC.
- **HTTPS**: Enforce HTTPS. Set `secure`, `httpOnly`, `sameSite` cookies.
- **Rate Limit**: Prevent brute-force/DDoS.
- **Deps**: Audit with `npm audit`.

## Verification

After typing validation schemas (Zod/joi) or auth guards, call `getDiagnostics` (typescript-lsp) to confirm type narrowing is correct before finalizing.

## Anti-Patterns

- **No `eval()`**: Avoid dynamic execution.
- **No Plaintext**: Never commit secrets.
- **No Trust**: Validate everything server-side.

## References

See [references/REFERENCE.md](references/REFERENCE.md) for Zod validation, secure cookie setup, JWT auth, security headers, and RBAC patterns.
