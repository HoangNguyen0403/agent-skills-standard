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
4. **Type Safety**: Use robust typing for translation keys to prevent broken text UI.

## Implementation Pattern

See [references/i18n_setup.md](references/i18n_setup.md) for Directory Structure, Middleware, and Server Component examples.

## Redirect Handling Strategy

When handling redirects (Authentication, Legacy URLs) in an i18n app:

- **Always preserve locale**: Use `redirect(`/${lang}/login`)` instead of just `/login`.
- **Server Actions**: Return `redirect(...)` from actions.
- **Next Config**: Use `next.config.js` for legacy SEO 301s (e.g., old-site `/about-us` -> `/en/about`).
