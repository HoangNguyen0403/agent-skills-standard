---
name: nextjs-authentication
description: Secure token storage (HttpOnly Cookies) and Middleware patterns. Use when implementing authentication, secure session storage, or auth middleware in Next.js.
metadata:
  triggers:
    files:
    - 'middleware.ts'
    - '**/auth.ts'
    - '**/login/page.tsx'
    keywords:
    - cookie
    - jwt
    - session
    - localstorage
    - auth
---
# Authentication & Token Management

## **Priority: P0 (CRITICAL)**

Use HttpOnly Cookies for token storage. Never use LocalStorage or sessionStorage.

## Implementation Guidelines

- **Token Storage**: Strictly use `HttpOnly`, `Secure` cookies with `SameSite: 'Lax'` or `'Strict'`. Set reasonable `maxAge` (e.g., 86400). Never store access tokens in `localStorage` or `sessionStorage` (XSS-vulnerable). LocalStorage causes hydration issues in Server Components.
- **Access Management**: Read and verify tokens in Next.js Middleware (`middleware.ts`) for edge-side redirection and route protection.
- **Next.js 15+ Async**: `cookies()` Promise from `next/headers` and must awaited.
- **Library Selection**: Prefer `next-auth` (Auth.js) or `Clerk` for social logins and session management.
- **Data Access**: Always use DAL (Data Access Layer) to validate credentials and verify cookie presence before rendering.
- **CSRF Protection**: Guard all Server Actions and Route Handlers by verifying Origin/Referer headers.
- **User Verification**: Use `await auth()` (Auth.js) or custom `getSession()` helper in Server Components.

### Example: Auth Middleware

See [implementation examples](references/implementation.md)

### Example: HttpOnly Cookie Setup

See [implementation examples](references/implementation.md)

## Anti-Patterns

- **No localStorage for tokens**: XSS-vulnerable and causes hydration issues.
- **No raw tokens in Client Components**: Pass session state, not tokens.
- **No unprotected Server Actions**: Always verify Origin/Referer headers.

## References

- [Auth Implementation Examples](references/auth-implementation.md)