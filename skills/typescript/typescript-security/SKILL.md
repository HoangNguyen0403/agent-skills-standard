---
name: typescript-security
description: Validate input, secure auth tokens, and prevent injection attacks in TypeScript. Use when validating input, handling auth tokens, sanitizing data, or managing secrets and sensitive configuration.
metadata:
  triggers:
    files:
    - '**/*.ts'
    - '**/*.tsx'
    keywords:
    - validate
    - sanitize
    - xss
    - injection
    - auth
    - password
    - secret
    - token
---
# TypeScript Security

## **Priority: P0 (CRITICAL)**

## Validate Input at Boundaries

- Use **`Zod`**, **`Joi`**, or **`class-validator`** at **API boundary**. Always **`parse`** and validate **`user-controlled input`** before using. Use **`safeParse`** for error handling without throwing. Return **`400 with structured errors`** on failure.

See [references/REFERENCE.md](references/REFERENCE.md) for Zod validation schemas, secure cookie setup, and JWT auth patterns.

## Prevent Injection and XSS

- **Sanitization**: Use **`DOMPurify`** for HTML sanitization to prevent **Cross-Site Scripting (XSS)**.
- **SQL Injection**: Use **Parameterized Queries** (e.g., **`pool.query('... WHERE id = $1', [id])`**) or **Type-safe ORMs** (**`Prisma`**/`TypeORM`). Use **`Prisma.sql`** for raw queries.
- **Input Filtering**: Sanitize **`user-controlled input`** before using it in file paths or OS commands (Command Injection).

## Secure Authentication

- Use **`Argon2id`** for password hashing. Implement **`JWT`** (via **`jsonwebtoken`** or **`jose`**) with **`HttpOnly`** and **`Secure`** cookies. Use **`RS256`** for public/private key pairs and implement **`Refresh Token rotation`**.
- **Secrets**: Store secrets in **`.env`** (e.g., **`JWT_SECRET`**) or **Secret Managers**. NEVER commit them to Git.
- **CORS**: Configure **`CORS`** with **Strict Origin Whitelisting**. Avoid `origin: '*'`.
- **Encryption**: Use **`crypto`** (Node.js) or **`Web Crypto API`** for sensitive data. Avoid legacy algorithms like MD5/SHA1.

## Verification

After typing validation schemas (Zod/joi) or auth guards, call `getDiagnostics` (typescript-lsp) to confirm type narrowing correct before finalizing.

## Anti-Patterns

- **No dynamic execution**: Avoid `eval`, `Function` constructor, or string literals as timer callbacks — all execute runtime code and bypass TypeScript's type system.
- **No shell string interpolation**: Never use `execSync(\`cmd ${userInput}\`)`or interpolate environment variables / config values into`execSync`/`spawnSync`strings. Shell metacharacters cause **command injection (OWASP A03)**. Use`execFileSync('git', ['arg1', arg2])` with a static command + separate args array instead.
- **No unvalidated SSRF origins**: When a URL comes from env vars or config (e.g., `FEEDBACK_API_URL`), validate it against an allowed-origin allowlist before calling `fetch()` / `axios`.
- **No Plaintext**: Never commit secrets.
- **No Trust**: Validate everything server-side.

## References

See [references/REFERENCE.md](references/REFERENCE.md) for Zod validation, secure cookie setup, JWT auth, security headers, and RBAC patterns.
