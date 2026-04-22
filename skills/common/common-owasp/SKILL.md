---
name: common-owasp
description: OWASP Top 10 audit checklist for Web Applications (2021) and APIs (2023). Use when performing any security review, PR review, or codebase audit touching web, mobile backend, or API code.
metadata:
  triggers:
    keywords:
    - security review
    - OWASP
    - broken access control
    - IDOR
    - BOLA
    - injection
    - broken auth
    - API review
    - authorization
    - access control
---
# OWASP Top 10 Security Checklist

## **Priority: P0 (CRITICAL)**

## Always-Apply Rules

Apply these on **every code write**, not during dedicated security reviews:

- **No IDOR**: Filter every resource query by `owner_id` or `tenantId` alongside any user-supplied ID. `findById(params.id)` without owner filter immediate P0.
- **No wildcard CORS**: Restrict to explicit allowlisted origins — never `Access-Control-Allow-Origin: *` on authenticated routes.
- **No full entity return**: Always project to DTO — never serialize raw ORM output to API response.

## Context-Specific Checklist

Activate when: writing security-sensitive features, reviewing PRs, or doing codebase audits.

Mark each item: ✅ not affected | ⚠️ needs review | 🔴 confirmed finding.

**P0 finding caps Security score at 40/100.**

Apply framework-specific security skills alongside this checklist.
See [references/owasp-web.md](references/owasp-web.md) and [references/owasp-api.md](references/owasp-api.md) for full detection signals.

### OWASP Web Application Top 10 (2021)

| ID | Risk | Key Detection Signal |
| --- | ---- | -------------------- |
| A01 | Broken Access Control | `findById(params.id)` without owner filter. Route without `@authorize`. |
| A02 | Cryptographic Failures | Weak hash (MD5/SHA1) for passwords. HTTP URL hardcoded. No TLS. |
| A03 | Injection | String concat in DB queries. Unsanitized input to templates. XSS. |
| A04 | Insecure Design | No rate limiting on auth. Missing input validation at entry points. |
| A05 | Security Misconfiguration | CORS `*`. Debug mode in prod. Missing security headers (CSP, HSTS). |
| A06 | Vulnerable Components | CVE in dependency audit. Unreviewed new direct dependency. |
| A07 | Auth Failures | JWT without expiry. No session invalidation on logout. |
| A08 | Data Integrity Failures | Unverified JWT/cookie. Deserialization of untrusted input. |
| A09 | Logging & Monitoring | No audit log on: deletion, password change, privilege escalation. |
| A10 | SSRF | HTTP client with user-controlled URL and no allowlist. |

### OWASP API Security Top 10 (2023)

| ID | Risk | Key Detection Signal |
| ----- | ---- | -------------------- |
| API1 | Broken Object Level Auth (BOLA) | Resource by user-supplied ID without `AND owner_id = currentUser`. |
| API2 | Broken Authentication | JWT missing `exp`. Token not revoked on logout. Bearer in URL. |
| API3 | Broken Property Level Auth | Full ORM entity returned. No DTO projection. Mass assignment. |
| API4 | Unrestricted Resource Consumption | No server-enforced `limit`/`pageSize`. No throttle on heavy ops. |
| API5 | Broken Function Level Auth | Admin route reachable without role guard. |
| API6 | Unrestricted Business Flow | No verification on OTP/checkout/password-reset flows. |
| API8 | Security Misconfiguration | Stack trace in response. CORS `*` on authenticated routes. |
| API9 | Improper Inventory Management | Deprecated/undocumented endpoints still reachable. |
| API10 | Unsafe API Consumption | Third-party response used without schema validation. |

## References

- [OWASP Web App — Full Detection Signals](references/owasp-web.md)
- [OWASP API — Full Detection Signals](references/owasp-api.md)