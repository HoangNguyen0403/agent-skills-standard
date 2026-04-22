---
name: nextjs-optimization
description: Optimize images, fonts, scripts, and metadata for Next.js performance and Core Web Vitals. Use when configuring next/image for LCP, next/font for zero layout shift, next/script loading strategies, or generateMetadata for SEO.
metadata:
  triggers:
    files:
      - '**/layout.tsx'
      - '**/page.tsx'
    keywords:
      - metadata
      - generateMetadata
      - 'next/image'
      - 'next/font'
---

# Optimization

## **Priority: P1 (HIGH)**

Core optimization primitives provided by Next.js. **Monitor First, Optimize Later.**

## Monitoring (Core Web Vitals)

- **LCP** (Largest Contentful Paint): Target < 2.5s.
- **CLS** (Cumulative Layout Shift): Target < 0.1.
- **INP** (Interaction to Next Paint): Target < 200ms.
- **Tools**: Chrome DevTools "Performance" tab, `next/speed-insights`, `React Profiler`.

## Images

Always use `next/image` to prevent CLS and enable automatic optimization:

See [implementation examples](references/example.md)

## Fonts

Use `next/font` for zero layout shift — self-hosts fonts and adds `font-display: swap`:

See [implementation examples](references/example.md)

## Metadata (SEO)

See [implementation examples](references/example.md)

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
