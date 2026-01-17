---
name: Next.js Internationalization (i18n)
description: Best practices for multi-language handling, locale routing, and detection middleware.
metadata:
  labels: [nextjs, i18n, middleware, routing]
  triggers:
    files: ['middleware.ts', 'app/[lang]/**', 'messages/*.json']
    keywords: [i18n, locale, translation, next-intl, redirect]
---

# Internationalization (i18n)

## **Priority: P2 (MEDIUM)**

Use Sub-path Routing (`/en`, `/de`) and Server Components for translations.

## Principles

1. **Sub-path Routing**: Use URL segments (e.g., `app/[lang]/page.tsx`) to manage locales.
   - _Why_: SEO friendly, sharable, and cacheable.
2. **Server-Side Translation**: Load dictionary files (`en.json`) in Server Components.
   - _Why_: Reduces client bundle size. No huge JSON blobs sent to browser.
3. **Middleware Detection**: Use `middleware.ts` to detect `Accept-Language` headers and redirect users to their preferred locale.
4. **Type Safety**: Use robust typing for translation keys to prevents broken text UI.

## Implementation Pattern

### 1. Directory Structure

```text
app/
├── [lang]/             # Dynamic Locale Segment
│   ├── layout.tsx      # <html lang={params.lang}>
│   └── page.tsx
└── api/
messages/               # Translation Dictionaries
├── en.json
└── es.json
middleware.ts           # Locale Redirection
```

### 2. Middleware (`middleware.ts`)

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

### 3. Server Component Usage

```typescript
// app/[lang]/page.tsx

// 1. Dynamic Params ensure static generation works for each language
export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'es' }];
}

export default async function Page({ params: { lang } }) {
  // 2. Load Dictionary On Demand
  const dict = await getDictionary(lang);

  return <h1>{dict.home.title}</h1>;
}
```

## Redirect Handling Strategy

When handling redirects (Authentication, Legacy URLs) in an i18n app:

- **Always preserve locale**: Use `redirect(`/${lang}/login`)` instead of just `/login`.
- **Server Actions**: Return `redirect(...)` from actions.
- **Next Config**: Use `next.config.js` for legacy SEO 301s (e.g., old-site `/about-us` -> `/en/about`).
