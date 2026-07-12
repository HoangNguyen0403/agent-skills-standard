Apply a layered baseline: `app.use(helmet())` with an intentional CSP/HSTS policy, explicit CORS origins, a global auth guard with `@Public()` exceptions, Redis-backed throttling, and `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.

Use Passport JWT with RS256 (or a deliberately configured HS256), validate `iss`/`aud`, reject `none`, and keep access/refresh tokens short/HTTP-only as appropriate. Hash passwords with Argon2id, use CSRF protection for cookie auth, sanitize serialized responses with `ClassSerializerInterceptor`/`@Exclude()`, allowlist outbound domains to prevent SSRF, avoid concatenated raw SQL, and audit mutations. Run `npm audit --prod`; do not expose `/docs` or stack traces in production.

