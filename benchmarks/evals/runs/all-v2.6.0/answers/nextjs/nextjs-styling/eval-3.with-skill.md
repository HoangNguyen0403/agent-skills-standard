Use `next/image` and always provide `width` and `height`, or use the `fill` prop:

```tsx
import Image from "next/image";

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={675}
/>
```

For a responsive container:

```tsx
<div className="relative aspect-video">
  <Image src="/hero.jpg" alt="Hero" fill className="object-cover" />
</div>
```

This reserves space before the image loads and prevents layout shift.
