Apply hardening at the filter, token, browser, operations, and dependency layers:

- Define a `SecurityFilterChain` bean with the Spring Security 6 Lambda DSL and `requestMatchers`; do not use `WebSecurityConfigurerAdapter`, `.and()`, or `antMatchers`.
- Use stateless sessions for bearer-token REST APIs. Validate JWT signature, permitted algorithm (RS256/HS256), issuer, audience, and expiry; reject `none`.
- Separate authentication from authorization and enforce roles/scopes with `@PreAuthorize` where appropriate.
- Disable CSRF only for a genuinely token-based API; keep it enabled with cookie-based browser authentication. Configure CORS to explicit origins and never wildcard origins with credentials.
- Enable HSTS, content-type options, and frame protections, and apply rate limiting to login and expensive endpoints.
- Load keys and credentials from environment/Vault, never source or image layers; use short-lived access tokens and secure refresh tokens.
- Secure `/actuator/**` with an admin role and expose only necessary endpoints.
- Scan dependencies for CVEs and test unauthenticated, forbidden, token-validation, CORS, CSRF, and rate-limit behavior.

Also avoid leaking stack traces or security-sensitive claims in API errors and logs. Hardening is only complete when these rules are verified in the deployed configuration, not merely present in a local class.


