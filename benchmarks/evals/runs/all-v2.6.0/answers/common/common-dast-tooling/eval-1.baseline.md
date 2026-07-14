Use a staged, authenticated scan with explicit authorization, a test account, and production-like data controls. Keep destructive checks disabled unless the team has approved them and can restore the environment.

1. Define scope: staging base URL, API routes and methods, authentication flows, rate limits, excluded endpoints, scan window, and emergency contact. Record the build and configuration being tested.
2. Use OWASP ZAP for broad API DAST. Import the OpenAPI specification, configure the staging context and authentication (for example, bearer token or scripted login), run a passive scan first, then a carefully rate-limited active scan. Use the API scan mode only after reviewing its generated targets and attack settings.
3. Use Nuclei with vetted, relevant templates for known web and API misconfigurations. Pin the template version, restrict targets to the approved staging host, begin with low-impact templates, and review template severity and request behavior before enabling intrusive checks.
4. Add complementary checks: TLS configuration and certificate validation, exposed documentation or debug endpoints, security headers, CORS behavior, authentication and authorization boundaries, SSRF/file-upload paths, and rate-limit behavior. Tools such as `curl` or a small test script are useful for deterministic API assertions; an intercepting proxy can help inspect authenticated flows.
5. Supply representative API requests and tokens, including valid, expired, missing, malformed, and cross-user credentials. Test object-level authorization by changing identifiers between two test users, while ensuring no real customer data is touched.
6. Triage findings manually. Confirm the request, response, affected route, preconditions, reproducibility, and business impact; remove scanner false positives and duplicate alerts. Capture sanitized evidence and correlate findings with application logs.
7. Fail the release on exploitable critical/high issues or agreed policy violations. Track medium/low findings with owners and deadlines. Re-scan after fixes and retain the exact tool, template, configuration, scope, and result artifact for auditability.

Do not scan third-party or production systems without written authorization, and do not use unrestricted fuzzing or destructive payloads against shared staging services.

