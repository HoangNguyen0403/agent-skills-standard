# Node.js backend pre-launch security audit

Treat this as a release gate, not just a grep exercise. The audit should produce evidence, owners, and remediation status for every finding.

## P0 checks

- Scan tracked source, configuration, build output, and history for passwords, API keys, private keys, tokens, and connection strings. Exclude dependency/vendor directories and distinguish test fixtures from live credentials. Any real credential is P0: rotate it immediately, remove it from the repository and history, then move secret delivery to environment variables or a secret manager.
- Inspect logs and error paths for passwords, tokens, secrets, authorization headers, PII, request bodies, and stack traces. Add structured redaction before serialization and return sanitized production errors.
- Enumerate every route, including mounted routers and health/admin endpoints. Verify authentication and authorization at the route or router boundary; authentication alone is insufficient for tenant/owner checks. If more than 20% of routes are unguarded, the skill treats that as P0.

## Injection and entry-point checks

Search for raw SQL concatenation/interpolation, shell execution (`child_process`, `exec`, `spawn`), unsafe template/HTML sinks, path joins using user input, outbound HTTP requests (SSRF), unsafe deserialization, and file upload handling. Confirm parameterized queries, strict command allowlists, canonicalized paths constrained to an intended directory, URL scheme/host allowlists, safe parsers, and size/type limits. Review Dockerfiles and deployment manifests for `latest`, root/privileged execution, host networking, `curl | sh`, and untrusted remote `ADD`.

## Business logic and platform checks

- For every `findById`/`findOne`/`findByPk`, prove the query also enforces tenant, owner, or subject authorization; otherwise treat it as a possible BOLA/IDOR.
- Validate JWT signature, algorithm, issuer/audience, expiry, key rotation, and rejection of weak/default keys.
- Reject uncontrolled property spreading from request bodies (mass assignment); use allowlisted DTOs and server-owned fields.
- Add rate limits, CSRF protection where cookie-authenticated, secure cookie flags, CORS allowlists, security headers, request size limits, and production-safe debug settings.
- Run `npm audit --audit-level=high` and review whether high/critical advisories are reachable and fixed or explicitly risk-accepted.

## Evidence and release criteria

Record commands, commit/version, route inventory, findings with severity and exploitability, and retest results. Do not go live with any P0, exploitable P1, unrotated secret, unverified authorization boundary, or high/critical dependency with an available fix. A clean result requires both automated scans and targeted manual tests using separate users/tenants, malformed inputs, unauthorized object IDs, and production-like configuration.

