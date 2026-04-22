---
name: nextjs-caching
description: 'Configure the 4 caching layers in Next.js: request memoization, data cache, full-route cache, and router cache. Use when setting revalidation strategies, invalidating cached data with tags, or diagnosing stale data bugs.'
metadata:
  triggers:
    files:
    - '**/page.tsx'
    - '**/layout.tsx'
    - '**/action.ts'
    keywords:
    - unstable_cache
    - revalidateTag
    - Router Cache
    - Data Cache
---
# Caching Architecture

## **Priority: P1 (HIGH)**

Next.js 4 distinct caching layers. Understanding them prevents stale data bugs.

## Workflow: Configure Caching for Feature

1. **Choose cache strategy** — SSG (`force-cache`), ISR (`revalidate: N`), or SSR (`no-store`).
2. **Tag cacheable fetches** — Add `next: { tags: ['posts'] }` to fetch options.
3. **Invalidate on mutation** — Call `revalidateTag('posts')` in Server Actions.
4. **Deduplicate requests** — Wrap shared data fetches with React `cache()`.
5. **Clear client cache** — Use `router.refresh()` after client-side mutations.

## Cache Invalidation Example

See [implementation examples](references/implementation.md)

## Implementation Guidelines

- **Next.js 15+ Standard**: Use **`fetch`** with **`revalidate: number`** or **`cache: 'force-cache'`** for API calls. Use **`unstable_cache`** or new **`'use cache'`** (experimental) for custom data stores.
- **Layers**: Distinguish between **Data Cache** (persistent across requests) and **Request Memoization** (React's lifecycle specific). Use **`cache()`** from React to deduplicate fetches within single render.
- **Invalidation**: Use **`revalidatePath('/')`** after mutations or **`revalidateTag('tag-name')`** for granular cache purging.
- **Client Cache**: Understand **Router Cache** (in-memory on client) and its 30s-min lifespan. Clear it using **`router.refresh()`**.
- **Static Assets**: Leverage **`generateStaticParams`** for pre-rendering static routes at build time. Use **ISR (Incremental Static Regeneration)** for content that updates periodically.
- **Streaming**: Combine **`Suspense`** with **`fetch`** triggers to prevent slow data from blocking entire page render.
- **Next.js 16+**: Favor **`'use cache'`** and **`cacheLife()`** over `revalidate: number` where available for deterministic caching.

| Layer | Where | Control |
| :---------------------- | :----- | :----------------------------- |
| **Request Memoization** | Server | React `cache()` |
| **Data Cache** | Server | `'use cache'`, `revalidateTag` |
| **Full Route Cache** | Server | Static Prerendering |
| **Router Cache** | Client | `router.refresh()` |

## **Implementation Details**

See [Cache Components & PPR](references/CACHE_COMPONENTS.md) for detailed key generation, closure constraints, and invalidation strategies.

## Anti-Patterns

- **No `unstable_cache` in Next.js 16+**: Use `'use cache'` directive with `cacheLife()` instead.
- **No `router.refresh()` for server data**: Prefer `revalidateTag()` for targeted cache busting.
- **No caching user-specific data at route level**: Wrap personal data in `<Suspense>` with `'use cache'`.
- **No long-lived cache without tags**: Assign `cacheTag()` for fine-grained invalidation control.