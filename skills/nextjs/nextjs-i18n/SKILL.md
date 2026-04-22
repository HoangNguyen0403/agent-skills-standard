---
name: nextjs-i18n
description: Best practices for multi-language handling, locale routing, and detection strategies across App and Pages Router. Use when adding i18n, locale routing, or language detection in Next.js.
metadata:
  triggers:
    files:
    - 'middleware.ts'
    - 'app/[lang]/**'
    - 'pages/[locale]/**'
    - 'messages/*.json'
    - 'next.config.js'
    keywords:
    - i18n
    - locale
    - translation
    - next-intl
    - react-intl
    - next-translate
---
# Internationalization (i18n)

## **Priority: P2 (MEDIUM)**

Maintain single source of truth for locales and ensure SEO-friendly sub-path routing.

## Workflow: Add i18n to Next.js App Router Project

1. Install `next-intl` and create `messages/en.json`, `messages/fr.json`, etc.
2. Add locale detection middleware in `middleware.ts`
3. Create `app/[lang]/layout.tsx` with locale param
4. Load translations server-side via `getMessages()`
5. Add `hreflang` tags in `generateMetadata`
6. Pre-render locales with `generateStaticParams`
7. Verify: run `next build` and confirm all locale paths render

## Middleware Example

See [implementation examples](references/implementation.md)

## Implementation Guidelines

- **Locale Routing**: Follow URL-first approach for SEO. Use dynamic segments in App Router (`app/[lang]/page.tsx`) and `i18n` configuration in `next.config.js` for Pages Router.
- **Library Selection**: Use `next-intl` for App Router (modern) or `react-intl` / `next-translate` for legacy apps.
- **Detection**: Implement middleware localization in `middleware.ts` to detect user language from `Accept-Language` headers or cookies and perform redirects.
- **Server-Side**: Load translation `messages/*.json` dictionaries in Server Components to keep client bundle small.
- **SEO**: Ensure `hreflang` tags generated correctly in `metadata` API for all translated routes.
- **Static Generation**: Use `generateStaticParams` to pre-render localized versions of static pages at build time.

### Library Specifics

For detailed setup with common libraries, refer to:

- [references/react-intl.md](references/react-intl.md)
- [references/next-intl.md](references/next-intl.md)

## Anti-Patterns

- **No hardcoded strings in JSX**: Use translation keys; never commit raw text.
- **No client-side translation bundles**: Load dictionaries server-side with `getMessages()`.
- **No mixed URL locale patterns**: Use sub-paths or domains consistently.