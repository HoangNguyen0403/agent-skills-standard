---
name: react-security
description: Prevent XSS, secure auth flows, and harden React client-side applications. Use when preventing XSS, securing auth flows, or auditing third-party dependencies in React.
metadata:
  triggers:
    files:
    - '**/*.tsx'
    - '**/*.jsx'
    keywords:
    - dangerouslySetInnerHTML
    - token
    - auth
    - xss
    - react security
    - csp
    - content security policy
    - sanitize html
    - secure cookie
    - jwt react
    - oauth react
    - dompurify
---
# React Security

## **Priority: P0 (CRITICAL)**


## Prevent XSS Attacks

- **Never use `dangerouslySetInnerHTML`** without sanitization. Use **`DOMPurify.sanitize(input)`** for all user-provided HTML.
- Avoid `javascript:` protocols in `href` or `src`.

See [implementation examples](references/REFERENCE.md#xss-prevention-with-dompurify) for DOMPurify sanitization and secure cookie configuration.

## Secure Authentication

- Store **JWT/Sessions in `HttpOnly` and `Secure` cookies** to prevent theft via XSS. **Never store secrets in `localStorage`** or in built JS bundle.
- **Data Flow**: **Escape all serialized state** if injecting into HTML (e.g., in SSR). Use **Content Security Policy (CSP)** to restrict script sources and prevent inline execution.

## Harden Application Boundaries

- **CSRF Protection**: Use **CSRF tokens** for state-changing requests (PUT/POST/DELETE). Implement **SameSite=Strict** cookies where applicable.
- **Input Sanitization**: Always **validate and sanitize** user inputs on backend. Frontend validation for UX only.
- **Dependency Management**: Run **`npm audit` / `pnpm audit`** regularly. Pin specific dependency versions and use **`npm-check-updates`**.
- **Security Headers**: Ensure server sends **`X-Frame-Options: DENY`**, **`X-Content-Type-Options: nosniff`**, and **`Permissions-Policy`**.

## Anti-Patterns

- **No `eval()`**: RCE risk.
- **No Serialized State**: Don't inject JSON into DOM without escaping.
- **No Client Logic for Permissions**: Backend must validate.

## References

See [references/REFERENCE.md](references/REFERENCE.md) for DOMPurify usage, CSP headers, OAuth2/JWT auth patterns, and CSRF protection.