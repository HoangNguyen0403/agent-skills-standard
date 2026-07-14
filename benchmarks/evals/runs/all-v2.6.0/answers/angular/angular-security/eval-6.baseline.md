# Securely storing auth tokens in Angular

For a browser Angular application, the preferred design is usually a server-managed session in a cookie marked `HttpOnly`, `Secure`, and an appropriate `SameSite` value. JavaScript cannot read an `HttpOnly` cookie, which reduces token theft through XSS. If the application is exposed to cross-site requests, add a deliberate CSRF defense, such as a synchronizer token or a properly implemented double-submit token, and configure CORS narrowly.

Avoid storing long-lived access or refresh tokens in `localStorage` or `sessionStorage`: any successful XSS can read them, and browser extensions or other client-side code may also expose them. If a bearer-token protocol is required, keep short-lived access tokens in memory where practical, use refresh-token rotation and server-side revocation, and consider a backend-for-frontend that keeps refresh credentials in an `HttpOnly` cookie. In-memory storage improves persistence risk but means a page reload may require reauthentication or a cookie-backed refresh.

Use HTTPS everywhere, never put tokens in URLs, HTML, logs, analytics events, error messages, or source control, and do not send an authorization header to arbitrary origins. An Angular HTTP interceptor should attach a token only to an explicit allowlist of API origins. Validate token issuer, audience, expiry, and permissions on the server; a JWT is not automatically encrypted and client-side decoding is not authorization.

On logout, clear the session cookie and revoke or invalidate refresh credentials on the server. Keep access-token lifetimes short, rotate signing keys and refresh tokens as appropriate, and combine the design with XSS defenses, CSP, dependency updates, and server-side authorization. The exact choice depends on the deployment and identity provider, but the browser should not be treated as a trusted secret store.

