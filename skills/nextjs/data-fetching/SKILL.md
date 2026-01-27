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

- **Static (Build-time)**: `fetch('https://api.com')` -> `cache: 'force-cache'`. Use for external REST APIs.
- **Dynamic (Request-time)**: `fetch('...', { cache: 'no-store' })` or use `cookies()`.
- **Revalidated**: `fetch('...', { next: { revalidate: 60 } })`.

## **The Modern Pattern: Direct Data Access**

> [!IMPORTANT]
> Do NOT fetch your own API Routes from Server Components. Access the database or service layer directly.

```tsx
// Service layer function
export async function getPosts() {
  'use cache'; // Next.js 16 caching
  return db.posts.findMany();
}

// Server Component
export default async function Page() {
  const posts = await getPosts();
  return <PostList posts={posts} />;
}
```

## Patterns

- **Colocation**: Fetch data where it's used. Next.js automatically deduplicates requests for the same URL in the same render pass.
- **Parallel**: Use `Promise.all()` to prevent waterfalls.

  ```tsx
  const [user, posts] = await Promise.all([getUser(), getPosts()]);
  ```

- **Blocking**: To prevent UI blocking, wrap the component in `<Suspense>` and stream the result.

## Revalidation

- **Path**: `revalidatePath('/blog/[slug]')` - Purges cache for specific route.
- **Tag**: `revalidateTag('collection')` - Purges all fetches tagged with `next: { tags: ['collection'] }`.

## Client-Side Fetching (Live Data)

Server Components are the default, but for live/user-specific data that doesn't need SEO:

- **SWR / TanStack Query**: PREFERRED over `useEffect`. Handles caching, polling, and deduplication automatically.

  ```tsx
  'use client';
  import useSWR from 'swr';

  // Good: "Stale-While-Revalidate" - Fast UI, then updates
  const { data } = useSWR('/api/user', fetcher);
  ```

- **Anti-Pattern**: Do not use `useEffect` to fetch data if you can avoid it. It causes "Flash of Loading Content" and waterfalls.

## Anti-Patterns

- **API Routes**: Don't fetch your own API Routes (`/api/...`) from Server Components. Call the DB/Service function directly.
