# Staging API DAST plan

Run the assessment only against a staging replica, with test accounts and seeded non-production data. Keep the scan bounded with a maximum duration or depth, and obtain authorization from the service owner.

Use a layered toolset:

1. Import the OpenAPI specification into ZAP, then run a bounded authenticated spider/active scan. This exercises routes and parameters for SQL injection, XSS, CSRF, session, and CORS issues. Supply an `Authorization: Bearer <staging-token>` header or configure ZAP's authenticated context so protected routes are tested.
2. Run Nuclei against the staging base URL with current technology/CVE and misconfiguration templates, initially filtering to `critical,high`, then review lower-severity results. Use rate limits and a duration cap.
3. Run Nikto for server configuration, version disclosure, and insecure-header checks.
4. Use ffuf or feroxbuster for bounded endpoint/content discovery, including expected `200`, `401`, and `403` responses. Do not use an uncapped wordlist or aggressive rate.
5. For API-specific surfaces, test GraphQL introspection and query-depth limits, gRPC methods with `grpcurl`, and WebSocket authentication/message validation where applicable.
6. Manually confirm findings with targeted requests. Test BOLA/IDOR using two staging users, JWT failure cases, parameter/type tampering, SSRF controls, and accidental exposure of `/metrics`, `/health`, `/api-docs`, `/.env`, or `.git` artifacts. Let a human confirm any sqlmap result; do not automatically run exploitation.

Capture request/response evidence, account/role, target commit, tool/template versions, timestamps, and server-side logs. Triage confirmed findings by impact: private-data access or successful SQLi/RCE is P0; mobile interception without certificate pinning or confirmed DOM XSS is P1; version/environment disclosure or missing CSP/HSTS is generally P1/P2 depending on exposure. Retest fixes before release and preserve a report with scope, limits, false positives, and residual risk.


