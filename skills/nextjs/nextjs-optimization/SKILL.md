---
name: nextjs-optimization
description: "Optimize images, fonts, scripts, and metadata for Next.js performance and Core Web Vitals. Use when configuring next/image for LCP, next/font for zero layout shift, next/script loading strategies, or generateMetadata for SEO. (triggers: **/layout.tsx, **/page.tsx, next/image, next/font, metadata, generateMetadata)"
---

# Optimization

## Priority: P1 (HIGH)

Core optimization primitives provided by Next.js. **Monitor First, Optimize Later.**

## Monitoring (Core Web Vitals)

- **LCP** (Largest Contentful Paint): Target < 2.5s.
- **CLS** (Cumulative Layout Shift): Target < 0.1.
- **INP** (Interaction to Next Paint): Target < 200ms.
- **Tools**: Chrome DevTools "Performance" tab, `next/speed-insights`, `React Profiler`.

## Images

Always use `next/image` to prevent CLS and enable automatic optimization:

```tsx
import Image from 'next/image';

// Above-the-fold hero — priority for LCP, sizes for responsive
<Image src="/hero.jpg" alt="Hero" width={1200} height={600}
  priority sizes="(max-width: 768px) 100vw, 50vw"
  placeholder="blur" blurDataURL={blurHash} />
```

## Fonts

Use `next/font` for zero layout shift — self-hosts fonts and adds `font-display: swap`:

```tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });

export default function Layout({ children }) {
  return <body className={inter.className}>{children}</body>;
}
```

## Metadata (SEO)

```tsx
// Static metadata
export const metadata: Metadata = { title: 'Dashboard', description: '...' };

// Dynamic metadata for parameterized routes
export async function generateMetadata({ params }) {
  const product = await getProduct(params.id);
  return { title: product.name, openGraph: { images: [product.image] } };
}
```

## Scripts

Use `next/script` with appropriate loading strategies:
- `beforeInteractive`: Critical scripts (polyfills).
- `afterInteractive`: Analytics (Google Analytics).
- `lazyOnload`: Chat widgets, social embeds.

## Bundle & Components

- Analyze with `@next/bundle-analyzer`. Prune heavy libraries; use ESM-tree-shakable dependencies.
- Use `dynamic` imports with `Suspense` for large components not needed at initial render.
- Enable `ppr: true` (Partial Prerendering) in Next.js 15+ for static shell + dynamic islands.

## Anti-Patterns

- **No `<img>` tag**: Use `next/image` to prevent CLS and enable automatic optimization.
- **No Google Fonts CDN link**: Use `next/font` to self-host and eliminate layout shift.
- **No metadata in `_document.tsx`**: Use `export const metadata` or `generateMetadata()`.
- **No 3rd-party scripts in `<head>`**: Use `next/script` with appropriate `strategy`.
