# Vibe Security Scan

Use this compact lens for AI-generated, fast-scaffolded, or weakly reviewed changes. Treat hits as candidates until reachability is proven.

## Checklist

| Risk | Probe | Severity |
| --- | --- | --- |
| Hardcoded Secret | API key, token, password, private key in source/config | P0 |
| SQL Injection | Raw SQL/string query built from user input | P0 |
| XSS | User content rendered as HTML without sanitization | P0 |
| IDOR/BOLA | Object id access lacks owner/tenant check | P0 |
| Slopsquatting | New dependency name looks invented or unverified | P1 |
| Brute Force | Login, OTP, reset, or expensive route lacks rate limit | P1 |
| Mass Assignment | Request body maps directly to privileged fields | P1 |
| Insecure Deserialization | Pickle/YAML/native deserialize on untrusted data | P0 |
| SSRF | Server fetches user-controlled URL | P0 |
| Path Traversal | File path joins user input without containment check | P0 |
| CSRF | Cookie-auth mutation lacks CSRF/SameSite strategy | P1 |
| Broken Access Control | UI hides action but backend misses authorization | P0 |
| Weak Password Hashing | Plain, MD5, SHA1, or unsalted password hash | P0 |
| JWT None/Weak Secret | Accepts `none`, weak secret, or unchecked alg | P0 |
| CORS Wildcard | `Access-Control-Allow-Origin: *` with credentials/auth | P1 |
| Unrestricted Upload | Extension/content type/storage execution unchecked | P0 |
| Verbose Errors | Stack traces, paths, versions, or SQL leak to client | P2 |
| Missing Rate Limit | Heavy, auth, payment, search, or AI route unbounded | P1 |
| Race Condition | Money, inventory, quota, or order mutation lacks lock/idempotency | P1 |
| Outdated Dependency | Known CVE or abandoned package in runtime path | P1 |

## Verification

1. Map source -> route -> sink.
2. Prove exploitability or downgrade as hardening.
3. Recommend framework-native fix.
4. Add eval when an active skill should have prevented it.
