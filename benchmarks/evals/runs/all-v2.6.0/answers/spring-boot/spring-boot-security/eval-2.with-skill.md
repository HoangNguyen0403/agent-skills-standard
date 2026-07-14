Configure a resource server with a `JwtDecoder` (or an `AuthenticationManager`) and keep the filter chain stateless. Use the Spring Security 6 Lambda DSL and authorize with `requestMatchers` and method-level `@PreAuthorize`; do not use the legacy adapter or `.and()` style.

Validate more than the JWT signature. Permit only an expected signing algorithm (RS256 or HS256), reject `none`, and validate `iss`, `aud`, and `exp`. Keep access tokens short-lived (about 15 minutes is a common policy). If refresh tokens are needed, protect them as secure, `httpOnly` cookies or through an equivalent secure server-side design; never place signing keys or long-lived secrets in source control.

For a pure REST API, use `SessionCreationPolicy.STATELESS`; decide CSRF based on the credential transport rather than disabling it by habit. Configure CORS with explicit origins and no wildcard-plus-credentials combination. Enforce authorization separately from authentication with roles/scopes and `@PreAuthorize`. Test invalid signatures, wrong issuer/audience, expired tokens, unsupported algorithms, missing claims, insufficient roles, and key rotation. Do not log raw tokens.


