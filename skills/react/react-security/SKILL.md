---
name: react-security
description: "Prevent XSS, secure auth flows, and harden React client-side applications. Use when preventing XSS, securing auth flows, or auditing third-party dependencies in React. (triggers: **/*.tsx, **/*.jsx, dangerouslySetInnerHTML, token, auth, xss)"
---

# React Security

## **Priority: P0 (CRITICAL)**

Preventing vulnerabilities in client-side apps.

## Prevent XSS Attacks

- **Never use `dangerouslySetInnerHTML`** without sanitization. Use **`DOMPurify.sanitize(input)`** for all user-provided HTML.
- Avoid `javascript:` protocols in `href` or `src`.

```tsx
import DOMPurify from 'dompurify';

// Safe HTML rendering with DOMPurify
function SafeContent({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: ['b', 'i', 'a', 'p'] });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

## Secure Authentication

- Store **JWT/Sessions in `HttpOnly` and `Secure` cookies** to prevent theft via XSS. **Never store secrets in `localStorage`** or in the built JS bundle.
- **Data Flow**: **Escape all serialized state** if injecting into the HTML (e.g., in SSR). Use a **Content Security Policy (CSP)** to restrict script sources and prevent inline execution.

```tsx
// Secure cookie configuration (server-side)
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes
});
```

## Harden Application Boundaries

- **CSRF Protection**: Use **CSRF tokens** for state-changing requests (PUT/POST/DELETE). Implement **SameSite=Strict** cookies where applicable.
- **Input Sanitization**: Always **validate and sanitize** user inputs on the backend. Frontend validation is for UX only.
- **Dependency Management**: Run **`npm audit` / `pnpm audit`** regularly. Pin specific dependency versions and use **`npm-check-updates`**.
- **Security Headers**: Ensure the server sends **`X-Frame-Options: DENY`**, **`X-Content-Type-Options: nosniff`**, and **`Permissions-Policy`**.

## Anti-Patterns

- **No `eval()`**: RCE risk.
- **No Serialized State**: Don't inject JSON into DOM without escaping.
- **No Client Logic for Permissions**: Backend must validate.

## References

See [references/REFERENCE.md](references/REFERENCE.md) for DOMPurify usage, CSP headers, OAuth2/JWT auth patterns, and CSRF protection.
