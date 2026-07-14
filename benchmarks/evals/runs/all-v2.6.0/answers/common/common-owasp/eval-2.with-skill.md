This is a **P0 security misconfiguration** under OWASP **A05/API8**. `Access-Control-Allow-Origin: *` must not be used on authenticated routes.

Remediate by:

- Replacing `*` with an explicit origin allowlist, e.g. `https://app.example.com`.
- Enabling `Access-Control-Allow-Credentials: true` only when required, never alongside `*`.
- Keeping authentication and authorization enforced server-side; CORS is not an authorization control.
- Using an opaque session securely or JWTs with an `exp` claim.
- Applying rate limiting to authenticated and sensitive endpoints.
- Checking every resource query for IDOR/BOLA protection with `owner_id`/`tenantId`.
- Returning DTO projections rather than full ORM entities.

Assumption: these routes are browser-accessible APIs and may process cookies or bearer tokens.
