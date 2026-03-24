# nextjs-authentication Implementation Examples

## Inline Examples

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
