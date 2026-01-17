---
name: Next.js Optimization
description: Image, Font, Script, and Metadata optimization strategies.
metadata:
  labels: [nextjs, optimization, seo, performance]
  triggers:
    files: ['**/layout.tsx', '**/page.tsx']
    keywords: [next/image, next/font, metadata, generateMetadata]
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

## Images (`next/image`)

- **Component**: `<Image src="..." alt="..." width={500} height={300} />`.
- **Features**: Automatic resizing, lazy loading, format conversion (WebP/AVIF), and CLS prevention (placeholder sizing).
- **Remote**: Must configure `images.remotePatterns` in `next.config.js` for external URLs.

## Fonts (`next/font`)

- **Local**: `localFont({ src: ... })`.
- **Google**: `Inter({ subsets: ['latin'] })`.
- **Why**: Self-hosts fonts at build time. Zero Layout Shift.

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
