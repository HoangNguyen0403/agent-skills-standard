---
name: nextjs-rendering
description: "Select and implement SSG, SSR, ISR, Streaming, or Partial Prerendering strategies in Next.js App Router. Use when choosing a rendering mode for a page, configuring generateStaticParams, or enabling PPR. (triggers: **/page.tsx, **/layout.tsx, generateStaticParams, dynamic, dynamicParams, PPR, streaming)"
---

# Rendering Strategies (App Router)

## **Priority: P0 (CRITICAL)**

Choose rendering strategy based on data freshness and scaling needs. See [Strategy Matrix](references/strategy-matrix.md).

## Workflow: Choose a Rendering Strategy

1. **Determine data freshness** — Static content? Use SSG. Periodic updates? Use ISR. Personalized? Use SSR.
2. **Configure fetch** — `force-cache` for SSG, `revalidate: N` for ISR, `no-store` for SSR.
3. **Add Suspense for streaming** — Wrap slow components in `<Suspense>` with a fallback.
4. **Enable PPR if hybrid** — Set `ppr: true` in `next.config.js` for static shell + dynamic regions.

## ISR with generateStaticParams Example

See [implementation examples](references/implementation.md)

## Implementation Guidelines

- **SSG (Static Site Generation)**: Default for App Router. Use **`generateStaticParams`** to pre-render routes at build time. Triggered by **`fetch`** with **`cache: 'force-cache'`**.
- **SSR (Server-Side Rendering)**: Triggered by **`cookies()`**, **`headers()`**, or **`fetch`** with **`cache: 'no-store'`**. Use for personalized or high-freshness data.
- **ISR (Incremental Static Regeneration)**: Update static content after build. Use **`revalidate`** (time-based) or **`revalidatePath`** / **`revalidateTag`** (on-demand).
- **Streaming**: Use **`Suspense`** to wrap slow async components and prevent them from blocking the initial page load. Use **`loading.tsx`** for route-level skeletons.
- **PPR (Partial Prerendering)**: Combine static shell with dynamic regions in a single HTTP request. Enable **`ppr: true`** in `next.config.js`.
- **Strategies**: Choose rendering based on **SEO** (SSG/ISR) vs **Interactivity** (Client) vs **Personalization** (SSR). Utilize **`dynamicParams`** to control fallback behavior for uncached routes.
- **Hydration**: Avoid **Hydration Errors** by not using browser-only values (`window.innerWidth`, `Date.now()`) in the initial render. Use the **`mounted` useEffect pattern**.
- **Edge Runtime**: Use **`runtime: 'edge'`** for low-latency globally distributed execution where full Node.js APIs are not required.

## Anti-Patterns

- **No root awaits in `page.tsx`**: Wrap slow components in `<Suspense>` to stream.
- **No SSR for static content**: Use SSG or ISR; reserve SSR for truly dynamic data.
- **No `typeof window` in initial render**: Use `useEffect` to avoid hydration errors.

## References

- [Strategy Selection Matrix](references/strategy-matrix.md)
- [Implementation Details](references/implementation-details.md)
- [Scaling Patterns](references/scaling-patterns.md)
