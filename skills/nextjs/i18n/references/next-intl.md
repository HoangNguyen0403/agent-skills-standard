# next-intl in Next.js

Best practices for using `next-intl` for type-safe internationalization in the App Router.

## Principles

1.  **Server-Side First**: Use `getMessages()` and `NextIntlClientProvider` to pass messages to the client.
2.  **Type Safety**: Define your message structure to get autocomplete for keys.
3.  **Middleware Routing**: Use the `next-intl` middleware for automatic locale detection and routing.

## Implementation Example

```tsx
// src/i18n.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../messages/${locale}.json`)).default,
}));
```

## Anti-Patterns

- **Direct JSON Imports**: Do not import translation JSONs directly into components. Use `useMessages()` or `useTranslations()`.
- **Client-Side Locale Detection**: Avoid manual cookie parsing for locale detection; rely on the middleware.
