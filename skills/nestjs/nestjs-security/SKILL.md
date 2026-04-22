---
name: nestjs-security
description: Implement JWT authentication, RBAC guards, Helmet hardening, and Argon2 hashing in NestJS. Use when adding auth strategies, role-based access control, CSRF protection, or security headers.
metadata:
  triggers:
    files:
    - '**/*.guard.ts'
    - '**/*.strategy.ts'
    - '**/auth/**'
    keywords:
    - Passport
    - JWT
    - AuthGuard
    - CSRF
    - Helmet
---
# NestJS Security Standards

## **Priority: P0 (CRITICAL)**

## Workflow: Secure NestJS Application

1. **Add Helmet** — `app.use(helmet())` in `main.ts` for HSTS, CSP headers.
2. **Configure JWT strategy** — Use `passport-jwt` with RS256; validate `iss` and `aud` claims.
3. **Bind global AuthGuard** — Register as `APP_GUARD`; use `@Public()` for open routes.
4. **Add throttling** — Enable `@nestjs/throttler` with Redis store for rate limiting.
5. **Hash with Argon2id** — Replace bcrypt with `argon2.hash(password, { type: argon2.argon2id })`.
6. **Verify** — Run `npm audit --prod` and test that unauthenticated requests return 401.

## Global Auth Guard Example

See [implementation examples](references/implementation.md)

## Argon2id Hashing Example

See [implementation examples](references/implementation.md)

## Authentication (JWT)

- **Strategy**: Use `@nestjs/passport` with `passport-jwt`.
- **Algorithm**: Enforce `RS256` (preferred) or `HS256`. **Reject `none`**.
- **Claims**: Validate `iss` and `aud`.
- **Tokens**: Short access (15m), Long httponly refresh (7d).
- **MFA**: Require 2FA for admin panels.

## Authorization (RBAC)

- **Deny by default**: Bind `AuthGuard` globally (APP_GUARD).
- **Bypass**: Create `@Public()` decorator for open routes.
- **Roles**: Use `Reflector.getAllAndOverride` for Method/Class merge.

## Cryptography

- **Hashing**: Use **Argon2id**, not Bcrypt. See [implementation](references/implementation.md).
- **Encryption**: Use **AES-256-GCM** with KMS rotation. See [implementation](references/implementation.md).

## Hardening

- **Helmet**: Mandatory. Enable HSTS, CSP.
- **CORS**: Explicit origins only. No `*`.
- **Throttling**: Use Redis-backed `@nestjs/throttler` in production.
- **CSRF**: Required for cookie-based auth. See [implementation](references/implementation.md).

## Data Protection

- **Sanitization**: Use `ClassSerializerInterceptor` + `@Exclude()`.
- **Validation**: `ValidationPipe({ whitelist: true })` to prevent mass assignment.
- **Audit**: Log mutations (Who, What, When). See [implementation](references/implementation.md).

## Secrets Management

- **CI/CD**: Run `npm audit --prod` in pipelines.
- **Runtime**: Inject via vault (AWS Secrets Manager / HashiCorp Vault), not `.env`.

## Anti-Patterns

- **No Shadow APIs**: Audit routes regularly; disable `/docs` in production.
- **No SSRF**: Allowlist domains for all outgoing HTTP requests.
- **No SQLi**: Use ORM; avoid raw `query()` with string concatenation.
- **No XSS**: Sanitize HTML input with `dompurify`.

## References

- [Implementation Examples](references/implementation.md)
- [common/security-standards](../../common/common-security-standards/SKILL.md)