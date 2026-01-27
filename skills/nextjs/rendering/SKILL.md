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
- **Config**: `cacheComponents: true` in `next.config.ts` (Next.js 16+) or `experimental: { ppr: 'incremental' }` (Next.js 15).

## Scaling Best Practices

- **Static Shell Pattern**: Render layout as Static, wrap personalized parts in `<Suspense>`. See [Scaling Patterns](references/scaling-patterns.md).
- **Avoid SSR Waterfalls**: Push fetches down component tree, don't `await` all in root `page.tsx`.

## Runtime

- **Node.js (Default)**: Full API support
- **Edge**: `export const runtime = 'edge'` - Limited API, instant start, lower cost

## Error Handling & Hydration

- **Error Boundaries**: Use `error.tsx` (Client Component) to catch runtime errors. Must include a `reset()` function.
- **Hydration Safety**: To prevent "Hydration failed" errors:
  - Avoid `typeof window` or `Date.now()` during initial render.
  - Use `useEffect` + `useState(false)` to defer client-only content.
  - Avoid invalid HTML nesting (e.g., `<p><div>...</div></p>`).

## Anti-Patterns

- **No Root Awaits**: Don't `await` all fetches in `page.tsx` - causes waterfall delays. Use Streaming.
- **Mixed Content**: Avoid passing non-serializable data from Server to Client (see [RSC Boundaries](../architecture/references/RSC_BOUNDARIES.md)).

## References

- [Strategy Selection Matrix](references/strategy-matrix.md)
- [Scaling Patterns & Performance](references/scaling-patterns.md)
- [**Suspense Bailout Rules**](references/SUSPENSE_BAILOUT.md)
