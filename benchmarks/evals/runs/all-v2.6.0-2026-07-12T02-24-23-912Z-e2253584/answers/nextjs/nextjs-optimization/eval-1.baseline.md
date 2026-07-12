Use `next/image` and reserve the image's space before it loads. For a known-size hero:

```tsx
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="..."
  width={1600}
  height={900}
  priority
  sizes="100vw"
  style={{ width: '100%', height: 'auto' }}
/>
```

Use `priority` (or the version's `preload` option) only for the above-the-fold LCP image; do not preload every image. For a responsive image filling a fixed aspect-ratio container, use `fill`, make the parent `position: relative`, reserve its aspect ratio/height, and provide an accurate `sizes` value. Configure remote image domains/patterns explicitly, serve an appropriately compressed format, and avoid a huge source image when a smaller breakpoint asset is sufficient. Verify the result with real viewport sizes and measure LCP/CLS after the layout is stable.

