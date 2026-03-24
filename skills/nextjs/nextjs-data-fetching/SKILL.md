---
name: nextjs-data-fetching
description: "Implement Fetch API, Caching, and Revalidation strategies in Next.js. Use when fetching data, configuring cache behavior, or implementing revalidation in Next.js. (triggers: **/*.tsx, **/service.ts, fetch, revalidate, no-store, force-cache)"
---

# Data Fetching (App Router)

## **Priority: P0 (CRITICAL)**

> [!WARNING]
> This skill covers **App Router** data fetching (`fetch`). If the project uses the `pages/` directory, you MUST use `getServerSideProps` or `getStaticProps` instead. Ignore this file's native `fetch` caching advice.

Fetch data directly in Server Components using `async/await`.

## Strategies

- **Static**: Build-time. `fetch(url, { cache: 'force-cache' })`.
- **Dynamic**: Request-time. `fetch(url, { cache: 'no-store' })` or `cookies()`.
- **Revalidated**: `fetch(url, { next: { revalidate: 60 } })`.

## Patterns

- **Direct Access**: Call DB/Service layer directly. **Do not fetch your own /api routes.** Example: `export default async function Page() { const user = await db.user.findUnique({ where: { id }, select: { id: true, name: true } }); }`
- **Colocation**: Fetch exactly where data is needed.
- **Parallel**: Use `Promise.all()` to prevent waterfalls.
- **Client-Side**: Use SWR/React Query for live/per-user data (no SEO).

## Revalidation

- **Path**: `revalidatePath('/path')` - Purge cache for a route.
- **Tag**: `revalidateTag('key')` - Purge by tag.

## Anti-Patterns

- **No root-level awaits**: Wrap slow fetches in `<Suspense>` to avoid blocking.
- **No `useEffect` for data fetching**: Use SWR or React Query for client-side data.
- **No internal API calls from RSC**: Fetch from DB/service layer directly.

## Examples & References

- [Usage Examples](references/usage-examples.md)
- [Caching Documentation](https://nextjs.org/docs/app/building-your-application/caching)
