---
name: NestJS Security
description: Authentication, RBAC, and Hardening standards.
metadata:
  labels: [nestjs, security, auth, jwt]
  triggers:
    files: ['**/*.guard.ts', '**/*.strategy.ts', '**/auth/**']
    keywords: [Passport, JWT, AuthGuard, CSRF, Helmet]
---

# NestJS Security Standards

## Authentication

- **Strategies**: Use `@nestjs/passport` with `passport-jwt`.
- **JWT Hardening**:
  - **Algorithm**: Enforce `algorithms: ['RS256']` (preferred) or `['HS256']`. **Reject `none`**.
  - **Claims**: Validate `iss` (Issuer) and `aud` (Audience).
  - **Secrets**: High entropy (> 256-bit) for HS256.
- **State**: Stateless. Short access tokens (15m), Long httponly refresh tokens (7d).
- **MFA**: Require 2FA for sensitive access (admin panels).

## Authorization (RBAC)

- **Strategy**: **Deny by default**.
  - **Implementation**: Bind `AuthGuard` globally (APP_GUARD).
  - **Bypass**: Create a `@Public()` decorator and allow access if present in the Guard.
- **Metadata**: Use `Reflector.createDecorator<string[]>()`.
- **Guards**: Use `Reflector` to merge Method/Class roles (`getAllAndOverride`).

## Cryptography & Hashing

- **Hashing**:
  - **Algorithm**: Use **Argon2id** (`argon2`) instead of Bcrypt (vulnerable to GPU/FPGA cracking).
  - **Implementation**: `await argon2.hash(password)`.
- **Encryption** (At Rest):
  - **Algorithm**: Use **AES-256-GCM** (Authenticated Encryption).
  - **Keys**: Never hardcode. Rotate keys using a KMS (Key Management Service).
  - **Native**: Use Node.js `crypto.createCipheriv`.

## CSRF (Cross-Site Request Forgery)

- **Context**: Mandatory if using **Cookie-based sessions** or **Cookie-based JWTs**.
- **Mitigation**:
  - **Synchronizer Token**: Use `csurf` via `@nest-middlewares/csurf` or similar wrapper.
  - **State**: Token must be cryptographically strong and verified on every state-changing request (POST/PUT/DELETE).
- **Note**: If using strictly `Authorization: Bearer` headers (localStorage), CSRF is less critical but `SameSite: Strict` cookies are still recommended for defense-in-depth.

## Hardening

1. **Helmet**: Mandatory. `app.use(helmet())`.
   - **HSTS**: Enable `Strict-Transport-Security` with `preload`.
   - **CSP**: Configure Content Security Policy specifically if serving any UI.
2. **Permissions-Policy**: Restrict browser permissions via `helmet.permissionsPolicy()`.
3. **CORS**: Explicit origins only. No `*`.
4. **Throttling**:
   - **Distributed**: Do not use in-memory rate limiting in production. Use `@nestjs/throttler` with **Redis storage** (`throttler-storage-redis`) to sync limits across instances.

## Audit Logging

- **Requirement**: Track critical mutations (Who, What, When).
- **Pattern**: Implement an `AuditInterceptor` that logs `POST/PUT/DELETE` actions to a secure, immutable log store (separate from app logs).

## Secrets & Config

- **CI/CD**: Run `npm audit` or `pnpm audit --prod` in pipelines.
- **Runtime**: Avoid `.env` files in production runtime. Inject secrets via environment variables from a vault (AWS Secret Manager / HashiCorp Vault) into the container environment.

## Data Sanitization

- **Transform**: Use `ClassSerializerInterceptor` + `@Exclude()` globally or per-controller to strip sensitive fields (passwords) from responses.
- **Validation**: `ValidationPipe({ whitelist: true })` prevents mass assignment attacks by stripping unknown properties from payloads.

## Improper Assets Management

- **Shadow APIs**: Audit routes regularly.
- **Deprecation**: Disable Swagger/OpenAPI endpoints (`/api`, `/docs`) in **production**.

## Server-Side Request Forgery (SSRF)

- **Validation**: Validate/Allowlist domains for **all** outgoing HTTP requests (`HttpService`).
- **Network**: Restrict egress traffic (e.g., block AWS metadata `169.254.169.254`) via infrastructure/firewall.

## Injection Prevention

- **SQLi**: Prefer ORM/ODM methods. **Avoid raw queries** (`query()`) with string concatenation. Use parameterized queries if raw SQL is strictly necessary.
- **XSS**: Input validation is not enough. Sanitize HTML input (e.g., `dompurify`) before storage or output.
