# Cache Components (Next.js 16+)

Cache Components enable Partial Prerendering (PPR) - mix static, cached, and dynamic content in a single route.

## **Priority: P0 (CRITICAL)**

## Enable Cache Components

```ts
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: true, // Replaces experimental.ppr
};
```

## Content Types & Boundaries

### 1. Static (Build-time)

Synchronous code, pure computations. Prerendered at build time for instant delivery.

### 2. Cached (`'use cache'`)

Async data that doesn't need fresh fetches every request. Use for expensive DB/API calls.

```tsx
async function BlogPosts() {
  'use cache';
  cacheLife('hours');
  const posts = await db.posts.findMany();
  return <PostList posts={posts} />;
}
```

### 3. Dynamic (Streaming)

Runtime data (Cookies, Headers, SearchParams). **Must** be wrapped in `<Suspense>`.

```tsx
<Suspense fallback={<p>Loading...</p>}>
  <UserPreferences />
</Suspense>
```

## The `'use cache'` Directive

### Cache Life Patterns

- `'default'`: 5m stale, 15m revalidate.
- `'hours'`, `'days'`, `'max'`: Common durations.
- **Inline Custom**:

```tsx
cacheLife({
  stale: 3600, // 1 hour
  revalidate: 7200, // 2 hours
  expire: 86400, // 1 day
});
```

### Invalidation Strategies

1. **`updateTag(tag)`**: Immediate invalidation within the same request. Use in Server Actions for instant UI reflect.
2. **`revalidateTag(tag)`**: Background revalidation (Stale-While-Revalidate). Next request gets fresh data.

## **Constraints**

- **No Runtime APIs**: Do not use `cookies()` or `headers()` inside `'use cache'`. Pass them as arguments (they become part of the cache key).
- **Node.js only**: Edge runtime not supported.
- **Explicit Determinacy**: Use `connection()` from `next/server` to force request-time execution for non-deterministic values (`Math.random`).
