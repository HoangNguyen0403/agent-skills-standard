---
name: Next.js Caching Architecture
description: The 4 layers of caching (Memoization, Data Cache, Full Route, Router Cache).
metadata:
  labels: [nextjs, caching, isr, revalidation]
  triggers:
    files: ['**/page.tsx', '**/layout.tsx', '**/action.ts']
    keywords: [unstable_cache, revalidateTag, Router Cache, Data Cache]
---

# Caching Architecture

## **Priority: P1 (HIGH)**

Next.js has 4 distinct caching layers. Understanding them prevents stale data bugs.

## The 4 Layers

| Layer                      | Where  | Duration       | Purpose                                              | Control            |
| :------------------------- | :----- | :------------- | :--------------------------------------------------- | :----------------- |
| **1. Request Memoization** | Server | Per Request    | Deduplicate same `fetch()` calls in one render pass. | `AbortController`  |
| **2. Data Cache**          | Server | Persistent     | Store data across user requests.                     | `revalidateTag`    |
| **3. Full Route Cache**    | Server | Persistent     | Store HTML/RSC payload. (Static Rendering).          | `revalidatePath`   |
| **4. Router Cache**        | Client | Session (< 5m) | Navigating back/forward without server hit.          | `router.refresh()` |

## 1. Request Memoization

- **Behavior**: Calling `getUser(1)` in `layout`, `page`, and `component` only triggers 1 network call.
- **Key**: Matches URL and Options exactly.
- **Non-Fetch**: For DB calls/Prisma, use React `cache()` manually.

  ```tsx
  import { cache } from 'react';
  const getItem = cache(async (id) => db.item.findUnique({ id }));
  ```

## 2. Data Cache (The "Server Persistence")

- **Default**: `fetch` tracks cache indefinitely (`force-cache`).
- **Scaling**:
  - **Vercel**: Shared globally via KV/Blob.
  - **Self-Hosted**: Stored in filesystem (Pod ephemeral storage). **Critical**: Must configure a shared `cacheHandler` (Redis) for multi-pod Kubernetes setups, otherwise pods have desynchronized caches.
- **Granular Control**: Use `unstable_cache` for DB queries caching.

  ```tsx
  import { unstable_cache } from 'next/cache';
  const getCachedUser = unstable_cache(
    async (id) => db.user.find(id),
    ['users-key'],
    { tags: ['users'], revalidate: 60 },
  );
  ```

## 3. Router Cache (The "Client Stale")

- **Problem**: User updates a listing, navigates back, and sees old data.
- **Cause**: Client-side Router Cache holds payload for 30s (dynamic) or 5m (static).
- **Fix**: Call `router.refresh()` in a Client Component or `revalidatePath()` in a Server Action (which automatically invalidates Router Cache).

## Strategies

- **Opt-Out (Real-Time)**:
  - Data: `fetch(..., { cache: 'no-store' })`
  - Route: `export const dynamic = 'force-dynamic'`
- **On-Demand (CMS/Admin)**:
  - Use `revalidateTag('collection')` for surgical updates. Better than `revalidatePath` (which nukes the whole URL).
