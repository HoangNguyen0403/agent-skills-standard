---
name: nextjs-optimization
description: 'Image, Font, Script, and Metadata optimization strategies. Use when optimizing Next.js images, fonts, scripts, or page metadata for performance. (triggers: **/layout.tsx, **/page.tsx, next/image, next/font, metadata, generateMetadata)'
---

# Optimization

## **Priority: P1 (HIGH)**

Core optimization primitives provided by Next.js. **Monitor First, Optimize Later.**

## Monitoring (Core Web Vitals)

Before applying optimizations, identify bottlenecks using:

- **LCP (Largest Contentful Paint)**: Initial load speed. Target < 2.5s.
- **CLS (Cumulative Layout Shift)**: Visual stability. Target < 0.1.
- **INP (Interaction to Next Paint)**: Responsiveness. Target < 200ms.
- **Tools**: Chrome DevTools "Performance" tab, `next/speed-insights`, or `React Profiler`.

## Implementation Guidelines

- **Images**: Always use **`next/image`** to prevent **CLS (Cumulative Layout Shift)**. Set **`priority`** for above-the-fold images to improve **LCP (Largest Contentful Paint)**. Use **`sizes`** (e.g., `(max-width: 768px) 100vw, 33vw`) and **`placeholder="blur"`** for better UX.
- **Fonts**: use **`next/font`** (Google or Local) to optimize for **Zero Layout Shift**. This automatically host fonts locally and adds **`font-display: swap`**.
- **Scripts**: Use **`next/script`** with appropriate strategies: **`beforeInteractive`** (critical), **`afterInteractive`** (default/analytics), or **`lazyOnload`** (lower priority/social widgets/chat).
- **Metadata**: Define **`static metadata`** or use **`generateMetadata`** (async) for dynamic routes to improve SEO and social sharing. This replaces the legacy `Head` component.
- **Bundle**: Analyze bundle size with **`@next/bundle-analyzer`**. Prune heavy libraries; use **ESM-tree-shakable** dependencies.
- **Components**: Use **`dynamic`** imports (Next.js version of `React.lazy`) with **`Suspense`** for large components that are not needed during initial render.
- **Next.js 15+ Integration**: Enable **`ppr: true` (Partial Prerendering)** in `next.config.js` to combine static shell with dynamic islands.

- **Strategy**: Self-host Google Fonts or local files via `next/font`.
- **Optimization**: Zero layout shift, no network requests for font files at runtime. Apply classes to `<body>` or specific elements.

## Metadata (SEO)

- **Static**: Export `metadata` object from `layout.tsx` or `page.tsx`.

  ```tsx
  export const metadata: Metadata = {
    title: 'Dashboard',
    description: '...',
  };
  ```

- **Dynamic**: Export `generateMetadata({ params })` function.

  ```tsx
  export async function generateMetadata({ params }) {
    const product = await getProduct(params.id);
    return { title: product.name };
  }
  ```

- **Open Graph**: Use `openGraph` key for social cards.

## Scripts (`next/script`)

- **Loading Strategy**: Control when 3rd party scripts load.
  - `strategy="afterInteractive"` (Default): Google Analytics.
  - `strategy="lazyOnload"`: Chat widgets, low priority.

## Anti-Patterns

- **No `<img>` tag**: Use `next/image` to prevent CLS and enable automatic optimization.
- **No Google Fonts CDN link**: Use `next/font` to self-host and eliminate layout shift.
- **No metadata in `_document.tsx`**: Use `export const metadata` or `generateMetadata()`.
- **No 3rd-party scripts in `<head>`**: Use `next/script` with appropriate `strategy`.
