Use `next/image`, which requires intrinsic dimensions for a normal image so the browser can reserve its aspect-ratio box:

```tsx
import Image from 'next/image';

<Image src="/photo.jpg" alt="Description" width={1200} height={800} />
```

For a responsive image that fills a container, use `fill` instead. Make the parent `position: relative`, give it an explicit height or `aspect-ratio`, and set an accurate `sizes` value:

```tsx
<div className="relative aspect-[3/2]">
  <Image src={src} alt="Description" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
</div>
```

Do not use `fill` without a sized containing block. Reserve space for any image implementation, choose an appropriate responsive source, and use `priority`/`preload` only for the actual above-the-fold LCP image. This prevents CLS while preserving optimized image loading.

