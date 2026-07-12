# Adversarial testing without ZAP or Nuclei

You can perform a bounded manual/API-focused DAST pass with `curl`, a browser automation tool, and small endpoint fuzzing tools if available. Use only a local or staging target—never production—and use authenticated staging headers for protected routes. Record the exact target and cap request count, concurrency, and duration.

Start by enumerating the OpenAPI document and known routes, then probe representative methods and roles. Examples (replace placeholders and keep the host in staging):

```bash
BASE=https://staging.example.test
TOKEN_A='staging-user-a-token'
TOKEN_B='staging-user-b-token'

# Authentication and authorization failures
curl -i "$BASE/api/admin/users"
curl -i -H 'Authorization: Bearer invalid' "$BASE/api/admin/users"
curl -i -H "Authorization: Bearer $TOKEN_A" "$BASE/api/users/USER_B_ID"

# Header/path guard checks
curl -i -H 'X-Forwarded-For: 127.0.0.1' "$BASE/admin"
curl -i -H 'X-Original-URL: /admin' "$BASE/anything"

# Accidental exposure checks
for path in /metrics /health /api-docs /.env /.git/config; do
  curl --fail-with-body --max-time 10 -i "$BASE$path"
done

# JWT and input handling
curl -i -H 'Authorization:' "$BASE/api/admin/users"
curl --max-time 10 -i -X POST "$BASE/api/search" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  --data '{"query":{"unexpected":"object"}}'
```

For each endpoint, vary IDs between two test users to detect BOLA/IDOR, omit or alter roles/claims, send oversized but bounded payloads, test content-type confusion, and verify consistent authorization on every HTTP method. For GraphQL, test introspection policy and enforce query-depth/complexity limits; for gRPC or WebSockets, use `grpcurl` or a small authenticated client to enumerate methods and validate message authorization.

Use ffuf with a small, approved wordlist and rate limit for endpoint/parameter discovery if installed. Use Playwright/Puppeteer to submit encoded XSS payloads in staging and observe DOM sinks/dialogs, while checking CSRF behavior and token leakage in network/console logs. Inspect response headers for CSP, HSTS, framing and content-type protections. Review application and gateway logs to distinguish rejected probes from actual impact.

Do not turn these checks into destructive exploitation. In particular, suggest sqlmap commands for human review rather than auto-running them. Confirm every suspected vulnerability with a minimal reproducible request, capture evidence, assign severity, remediate, and retest.


