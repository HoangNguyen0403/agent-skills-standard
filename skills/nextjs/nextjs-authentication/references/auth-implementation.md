# Authentication Implementation

## 1. Setting Tokens (Server Action)

```typescript
'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  // 1. Backend Call
  // const result = await api.login(formData);
  // Simulated result:
  const result = { accessToken: 'fake_enc_token' };

  // 2. Save Token Securely
  (await cookies()).set('session', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
    sameSite: 'lax',
  });

  redirect('/dashboard');
}

export async function logout() {
  (await cookies()).delete('session');
  redirect('/login');
}
```

## 2. Reading Tokens (DAL)

```typescript
// lib/auth.ts
import 'server-only';
import { cookies } from 'next/headers';

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  // return verifyJwt(session);
  return { user: 'simulated' };
}
```

## 3. Middleware Protection

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const currentUser = request.cookies.get('session')?.value;
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  if (!currentUser && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (currentUser && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'], // Exclude static files
};
```
