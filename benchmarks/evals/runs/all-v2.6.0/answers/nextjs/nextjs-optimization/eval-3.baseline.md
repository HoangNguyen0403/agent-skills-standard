Export static metadata when it is constant, and use `generateMetadata` when it depends on route data:

```ts
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products | Example',
  description: 'Browse our products',
  openGraph: {
    title: 'Products | Example',
    description: 'Browse our products',
    images: [{ url: 'https://example.com/og/products.png', width: 1200, height: 630 }],
  },
};
```

For a dynamic route, have `generateMetadata({ params })` load the record and return a title, description, canonical URL, and Open Graph/Twitter image. Keep metadata generation on the server, use absolute URLs in production, and provide a fallback for missing/failed data. Set a sensible root default in `app/layout.tsx`, add `metadataBase`, and use `title.template` for consistent pages. Do not put secrets or untrusted unsanitized HTML in metadata. Confirm the rendered `<head>` and social preview using the actual deployed URL; metadata helps discoverability but does not replace semantic content, sitemap, robots, and performance work.

