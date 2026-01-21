---
name: Ruby on Rails Security
description: Rails security standards (authn/authz, params, secrets, OWASP).
metadata:
  labels: [rails, security, owasp]
  triggers:
    files: ['config/initializers/*.rb', 'app/controllers/**/*.rb', 'Gemfile']
    keywords:
      [strong_parameters, permit, protect_from_forgery, CSRF, session, cookie]
---

# Rails Security

## **Priority: P0 (CRITICAL)**

Protect user data and reduce common Rails/OWASP risks.

## Rules

- **Strong Parameters**: Always use `params.require(...).permit(...)`; never mass-assign raw params.
- **Secrets**: Never commit secrets. Use `Rails.application.credentials` or environment variables.
- **AuthZ**: Enforce authorization in controller/service boundary (policy/ability layer).
- **CSRF**: Keep CSRF protection enabled for browser flows; treat API-only separately.
- **SQL Injection**: Use query APIs; avoid string interpolation in SQL.
- **XSS**: Escape output by default; be explicit when rendering HTML.

## Rails-Specific P0 Checklist

- **Filter sensitive logs**: Configure `config.filter_parameters` for passwords/tokens/authorization headers and any PII identifiers.
- **Host header**: Lock down `config.hosts` (and proxy headers) to prevent host-header based attacks.
- **Open redirects**: Never redirect to user-provided URLs without allow-listing; be careful with `redirect_to params[:return_to]`.
- **File/SSRF**:
  - Avoid `open-uri`/arbitrary URL fetching with user input.
  - Validate schemes/hosts and enforce timeouts if you must fetch URLs.
- **ActiveStorage**: Validate content type/size; avoid serving untrusted uploads inline.

## Transaction Safety (Security via Integrity)

Race conditions and partial writes can become security issues (double-spend, privilege escalation, inconsistent authorization).

- **Use transactions for invariants**: If a business rule requires multiple writes to stay consistent, wrap them in a transaction.
- **Do not authorize on stale data**: Re-check authorization and current state inside the transaction if the decision depends on DB state.

## Locking (`with_lock`) for Shared State

Use pessimistic locking to prevent concurrent updates from corrupting critical state.

- **When to use**:
  - Balances/credits/counters (double-spend prevention)
  - State machines / status transitions that must be linearized
  - “Read → decide → write” flows where the decision must be consistent
- **How to use**:
  - Lock the row you are about to mutate: `record.with_lock { ... }`
  - Combine with a transaction for multi-row invariants.
- **Avoid**:
  - Locking and then performing external IO (HTTP/email/file) while holding the lock
  - Locking many rows without consistent ordering (deadlock risk)


