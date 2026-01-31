---
name: Next.js Data Fetching
description: Fetch API, Caching, and Revalidation strategies.
metadata:
  labels: [nextjs, data-fetching, caching]
  triggers:
    files: ['**/*.tsx', '**/service.ts']
    keywords: [fetch, revalidate, no-store, force-cache]
---

# Data Fetching (App Router)

## **Priority: P0 (CRITICAL)**

Fetch data directly in Server Components using `async/await`.

## Strategies

- **Static**: Build-time. `fetch(url, { cache: 'force-cache' })`.
- **Dynamic**: Request-time. `fetch(url, { cache: 'no-store' })` or `cookies()`.
- **Revalidated**: `fetch(url, { next: { revalidate: 60 } })`.

## Patterns

- **Direct Access**: Call DB/Service layer directly. **Do not fetch your own /api routes.**
- **Colocation**: Fetch exactly where data is needed.
- **Parallel**: Use `Promise.all()` to prevent waterfalls.
- **Client-Side**: Use SWR/React Query for live/per-user data (no SEO).

## Revalidation

- **Path**: `revalidatePath('/path')` - Purge cache for a route.
- **Tag**: `revalidateTag('key')` - Purge by tag.

## Anti-Patterns

- **No Root Awaits**: Avoid blocking the entire page. Use `<Suspense>`.
- **No useEffect**: Avoid manual fetching in client effects.
- **Internal API**: Never call `/api/...` from Server Components.

## Examples & References

- [Usage Examples](references/usage-examples.md)
- [Caching Documentation](https://nextjs.org/docs/app/building-your-application/caching)
