# i18n Setup Patterns

## Directory Structure

```text
app/
├── [lang]/             # Dynamic Locale Segment
│   ├── layout.tsx      # <html lang={params.lang}>
│   └── page.tsx
└── messages/           # Translation Dictionaries
    ├── en.json
    └── es.json
```

## Middleware (`middleware.ts`)

Redirect root traffic (`/`) to localized traffic (`/en`).

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const LOCALES = ['en', 'es', 'fr'];
const DEFAULT = 'en';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check if path already has locale
  const pathnameHasLocale = LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );
  if (pathnameHasLocale) return;

  // 2. Detect locale (Header matching)
  const headers = {
    'accept-language': request.headers.get('accept-language') || '',
  };
  const languages = new Negotiator({ headers }).languages();
  const locale = match(languages, LOCALES, DEFAULT);

  // 3. Redirect
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ['/((?!_next|api|static|favicon.ico).*)'],
};
```

## Server Component Usage

```typescript
// app/[lang]/page.tsx

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'es' }];
}

export default async function Page({ params: { lang } }) {
  const dict = await getDictionary(lang); // Load JSON
  return <h1>{dict.home.title}</h1>;
}
```
