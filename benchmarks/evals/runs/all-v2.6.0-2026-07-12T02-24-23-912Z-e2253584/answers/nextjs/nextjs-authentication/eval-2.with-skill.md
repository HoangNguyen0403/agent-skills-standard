# Protect `/dashboard`

Use middleware to read and verify the session cookie, then redirect unauthenticated requests:

```ts
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value
  if (!session || !verifySession(session)) {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }
```

Use a real edge-compatible verifier in place of `verifySession`; do not rely on a layout-only check, and repeat authorization in each DAL function or mutation.

