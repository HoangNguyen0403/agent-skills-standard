---
name: Next.js Authentication
description: Secure token storage (HttpOnly Cookies) and Middleware patterns.
metadata:
  labels: [nextjs, auth, security, cookies]
  triggers:
    files: ['middleware.ts', '**/auth.ts', '**/login/page.tsx']
    keywords: [cookie, jwt, session, localstorage, auth]
---

# Authentication & Token Management

## **Priority: P0 (CRITICAL)**

Use **HttpOnly Cookies** for token storage. **Never** use LocalStorage.

## Key Rules

1. **Storage**: Use `cookies().set()` with `httpOnly: true`, `secure: true`, `sameSite: 'lax'`. (Reference: [Setting Tokens](references/auth-implementation.md))
2. **Access**: Read tokens in Server Components via `cookies().get()`. (Reference: [Reading Tokens](references/auth-implementation.md))
3. **Protection**: Guard routes in `middleware.ts` before rendering. (Reference: [Middleware Protection](references/auth-implementation.md))

## Anti-Pattern: LocalStorage

- **Security Risk**: Vulnerable to XSS.
- **Performance Hit**: Incompatible with Server Components (RSC). Forces client hydration and causes layout shift.

## Related Topics

common/security-standards | server-components | app-router
