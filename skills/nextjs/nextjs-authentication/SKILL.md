---
name: nextjs-authentication
description: 'Secure token storage (HttpOnly Cookies) and Middleware patterns. Use when implementing authentication, secure session storage, or auth middleware in Next.js. (triggers: middleware.ts, **/auth.ts, **/login/page.tsx, cookie, jwt, session, localstorage, auth)'
---

# Authentication & Token Management

## **Priority: P0 (CRITICAL)**

Use **HttpOnly Cookies** for token storage. **Never** use LocalStorage or sessionStorage.

## Implementation Guidelines

- **Token Storage**: **Strictly use `HttpOnly`, `Secure` cookies** with **`SameSite: 'Lax'`** or **`'Strict'`**. Set reasonable **`maxAge`** (e.g., 86400). **Never** store access tokens in **`localStorage`** or `sessionStorage` (**XSS-vulnerable**). LocalStorage causes **hydration issues** in Server Components.
- **Access Management**: Read and verify tokens in **Next.js Middleware (`middleware.ts`)** for edge-side redirection and route protection. Use **`NextRequest`** to get cookies and **`NextResponse.redirect`** for unauthorized users. Use **`matcher`** in config for route protection.
- **Next.js 15+ Async**: Remember that **`cookies()` is a Promise** from **`next/headers`** and must be awaited: **`const cookieStore = await cookies();`**. Access values via **`(await cookies()).get('token')?.value`**. **Never pass raw token** to Client Components.
- **Library Selection**: Prefer **`next-auth` (Auth.js)** or **Clerck** for social logins and session management. Reach for **`getServerSession`** or **`auth()`** (Auth.js) to read an **encrypted session**.
- **Data Access**: Always use a **`DAL`** (Data Access Layer) to **validate** credentials and **verifies** cookie presence before **rendering**.
- **CSRF Protection**: Guard all **Server Actions** and **Route Handlers** by verifying the **Origin/Referer headers**.
- **User Verification**: Use **`await auth()`** (from Auth.js) or a custom **`getSession()`** helper in **Server Components**. Always **validate the session on the backend** even if requested via Client Component.

## References

- [Auth Implementation Examples](references/auth-implementation.md)
