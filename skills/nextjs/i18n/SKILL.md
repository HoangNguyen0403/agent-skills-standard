---
name: Next.js Internationalization (i18n)
description: Best practices for multi-language handling, locale routing, and detection strategies across App and Pages Router.
metadata:
  labels: [nextjs, i18n, routing, middleware]
  triggers:
    files:
      [
        'middleware.ts',
        'app/[lang]/**',
        'pages/[locale]/**',
        'messages/*.json',
        'next.config.js',
      ]
    keywords: [i18n, locale, translation, next-intl, react-intl, next-translate]
---

# Internationalization (i18n)

## **Priority: P2 (MEDIUM)**

Maintain a single source of truth for locales and ensure SEO-friendly sub-path routing.

## Principles

1.  **Uniform Locale Routing**: Always use URL segments (e.g., `/en/dashboard`) rather than cookies or localStorage for the primary locale state.
    - _Why_: Required for SEO, link sharing, and consistent SSR/RSC behavior.
2.  **Server-Side First**: Prefer loading translation dictionaries on the server.
    - _App Router_: Use `getMessages()` in RSCs.
    - _Pages Router_: Use `getStaticProps` or `getServerSideProps` to pass translations to the page.
3.  **Middleware detection**: Use `middleware.ts` (Modern) or `next.config.js` (Legacy) to handle automatic locale detection and redirection.

## Implementation Strategies

### 1. App Router (Modern)

- Use dynamic segments: `app/[lang]/layout.tsx`.
- Implement `middleware.ts` for language detection based on `Accept-Language` headers.

### 2. Pages Router (Legacy Next.js 13)

- Configure `next.config.js` with `i18n` field:
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

- **Hardcoded Strings**: Never commit raw text in JSX. Use translation keys.
- **Client-Only Translation**: Avoid loading multi-megabyte JSON translation files in the client bundle.
- **Locale Squatting**: Don't use a different URL structure for different languages (e.g. `domain.com/en` vs `domain.fr`). Stick to sub-paths or domains consistently.
