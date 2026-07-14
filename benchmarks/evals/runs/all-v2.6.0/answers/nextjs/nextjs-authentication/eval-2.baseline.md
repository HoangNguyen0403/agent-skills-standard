Put middleware in `middleware.ts` (or `src/middleware.ts`) and use it as an early redirect, while still checking authorization in the page/action/API:

```ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  if (!token) {
    const login = new URL('/login', request.url);
    login.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };
```

Do not treat cookie presence as proof of a valid session. Verify a signed, expiry-checked token with an Edge-compatible library if verification runs in middleware, or use middleware only for a cheap check and verify fully in the server data layer. Avoid redirect loops, preserve only safe callback paths, and exclude static assets and public auth routes from the matcher.

