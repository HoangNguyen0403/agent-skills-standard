---
name: nextjs-authentication
description: "Secure token storage (HttpOnly Cookies) and Middleware patterns. Use when implementing authentication, secure session storage, or auth middleware in Next.js. (triggers: middleware.ts, **/auth.ts, **/login/page.tsx, cookie, jwt, session, localstorage, auth)"
---

# Authentication & Token Management

## **Priority: P0 (CRITICAL)**

Use **HttpOnly Cookies** for token storage. **Never** use LocalStorage.

## Key Rules

1. **Storage**: Use `cookies().set()` with `httpOnly: true`, `secure: true`, `sameSite: 'lax'`. (Reference: [Setting Tokens](references/auth-implementation.md))
2. **Access**: Read tokens in Server Components via `cookies().get()`. (Reference: [Reading Tokens](references/auth-implementation.md))
3. **Protection**: Guard routes in `middleware.ts` before rendering. (Reference: [Middleware Protection](references/auth-implementation.md))

## Anti-Patterns

- **No LocalStorage for tokens**: XSS-vulnerable; use HttpOnly cookies with `secure: true`.
- **No client-side session reads**: Read tokens in Server Components via `cookies().get()`.
- **No unprotected routes**: Guard all auth routes in `middleware.ts` before rendering.

## References

- [Auth Implementation Examples](references/auth-implementation.md)
