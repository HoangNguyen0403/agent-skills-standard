---
name: nextjs-authentication
description: "Secure token storage (HttpOnly Cookies) and Middleware patterns. Use when implementing authentication, secure session storage, or auth middleware in Next.js. (triggers: middleware.ts, **/auth.ts, **/login/page.tsx, cookie, jwt, session, localstorage, auth)"
---

# Authentication & Token Management

## **Priority: P0 (CRITICAL)**

Use HttpOnly Cookies for token storage. Never use LocalStorage or sessionStorage.

## Implementation Guidelines

- **Token Storage**: Strictly use `HttpOnly`, `Secure` cookies with `SameSite: 'Lax'` or `'Strict'`. Set reasonable `maxAge` (e.g., 86400). Never store access tokens in `localStorage` or `sessionStorage` (XSS-vulnerable). LocalStorage causes hydration issues in Server Components.
- **Access Management**: Read and verify tokens in Next.js Middleware (`middleware.ts`) for edge-side redirection and route protection.
- **Next.js 15+ Async**: `cookies()` is a Promise from `next/headers` and must be awaited.
- **Library Selection**: Prefer `next-auth` (Auth.js) or `Clerk` for social logins and session management.
- **Data Access**: Always use a DAL (Data Access Layer) to validate credentials and verify cookie presence before rendering.
- **CSRF Protection**: Guard all Server Actions and Route Handlers by verifying the Origin/Referer headers.
- **User Verification**: Use `await auth()` (Auth.js) or a custom `getSession()` helper in Server Components.

### Example: Auth Middleware

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session-token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};
```

### Example: HttpOnly Cookie Setup

```typescript
// app/api/login/route.ts
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const token = await authenticate(email, password);

  (await cookies()).set("session-token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 86400,
    path: "/",
  });

  return Response.json({ success: true });
}
```

## Anti-Patterns

- **No localStorage for tokens**: XSS-vulnerable and causes hydration issues.
- **No raw tokens in Client Components**: Pass session state, not tokens.
- **No unprotected Server Actions**: Always verify Origin/Referer headers.

## References

- [Auth Implementation Examples](references/auth-implementation.md)
