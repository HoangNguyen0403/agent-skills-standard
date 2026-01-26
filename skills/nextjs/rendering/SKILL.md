---
name: Next.js Rendering Strategies
description: SSG, SSR, ISR, Streaming, and Partial Prerendering (PPR).
metadata:
  labels: [nextjs, rendering, isr, ssr, ssg]
  triggers:
    files: ['**/page.tsx', '**/layout.tsx']
    keywords: [generateStaticParams, dynamic, dynamicParams, PPR, streaming]
---

# Rendering Strategies (App Router)

## **Priority: P0 (CRITICAL)**

Choose rendering strategy based on data freshness and scaling needs. See [Strategy Matrix](references/strategy-matrix.md).

## Implementation Guidelines

### Static Rendering (SSG) - **Default**

- **Behavior**: Rendered at build time
- **Use**: Marketing, blogs, docs
- **Dynamic Routes**: Use `generateStaticParams` for `/blog/[slug]`

### Dynamic Rendering (SSR)

- **Behavior**: Rendered per request
- **Triggers**: `cookies()`, `headers()`, `searchParams`, `fetch(..., { cache: 'no-store' })`, `export const dynamic = 'force-dynamic'`

### Streaming (Suspense)

- **Problem**: SSR blocks entire page
- **Solution**: Wrap slow components in `<Suspense>` to stream progressively

```tsx
<Suspense fallback={<Skeleton />}>
  <SlowDashboard />
</Suspense>
```

### Incremental Static Regeneration (ISR)

- **Behavior**: Update static content post-build
- **Time-based**: `export const revalidate = 3600;` (layout/page)
- **On-Demand**: `revalidatePath('/posts')` (Server Actions/Webhooks)

### Partial Prerendering (PPR) - _Experimental_

- **Behavior**: Static shell + dynamic holes
- **Config**: `export const experimental_ppr = true`

## Scaling Best Practices

- **Static Shell Pattern**: Render layout as Static, wrap personalized parts in `<Suspense>`. See [Scaling Patterns](references/scaling-patterns.md).
- **Avoid SSR Waterfalls**: Push fetches down component tree, don't `await` all in root `page.tsx`.

## Runtime

- **Node.js (Default)**: Full API support
- **Edge**: `export const runtime = 'edge'` - Limited API, instant start, lower cost

## Anti-Patterns

- **No Root Awaits**: Don't `await` all fetches in `page.tsx` - causes waterfall delays.
- **No SSR for Static**: Don't use `force-dynamic` for content that rarely changes.

## References

- [Strategy Selection Matrix](references/strategy-matrix.md)
- [Scaling Patterns & Performance](references/scaling-patterns.md)
