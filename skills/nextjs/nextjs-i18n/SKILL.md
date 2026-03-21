---
name: nextjs-i18n
description: 'Best practices for multi-language handling, locale routing, and detection strategies across App and Pages Router. Use when adding i18n, locale routing, or language detection in Next.js. (triggers: middleware.ts, app/[lang]/**, pages/[locale]/**, messages/*.json, next.config.js, i18n, locale, translation, next-intl, react-intl, next-translate)'
---

# Internationalization (i18n)

## **Priority: P2 (MEDIUM)**

Maintain a single source of truth for locales and ensure SEO-friendly sub-path routing.

## Implementation Guidelines

- **Locale Routing**: Follow the **URL-first approach** for SEO. Use **dynamic segments** in the App Router (e.g., **`app/[lang]/page.tsx`**) and the **`i18n`** configuration in `next.config.js` for the Pages Router.
- **Library Selection**: Use **`next-intl`** for the App Router (modern) or **`react-intl`** / **`next-translate`** for legacy apps.
- **Detection**: Implement **Middleware localization** (in **`middleware.ts`**) to detect user language from **`Accept-Language`** headers or cookies and perform redirects.
- **Server-Side**: Load translation **`messages/*.json`** dictionaries in **Server Components** to keep the client bundle small. Use **`getMessages()`** or **`requestConfig`** patterns.
- **SEO**: Ensure **`hreflang`** tags are generated correctly in the **`metadata`** API for all translated routes.
- **Static Generation**: Use **`generateStaticParams`** to pre-render localized versions of static pages at build time.
  ```js
  module.exports = {
    i18n: {
      locales: ['en', 'fr', 'vi'],
      defaultLocale: 'en',
    },
  };
  ```

### 3. Library Specifics

For detailed setup with common libraries, refer to:

- [references/react-intl.md](references/react-intl.md)
- [references/next-intl.md](references/next-intl.md)

## Anti-Patterns

- **No hardcoded strings in JSX**: Use translation keys; never commit raw text.
- **No client-side translation bundles**: Load dictionaries server-side with `getMessages()`.
- **No mixed URL locale patterns**: Use sub-paths or domains consistently.
