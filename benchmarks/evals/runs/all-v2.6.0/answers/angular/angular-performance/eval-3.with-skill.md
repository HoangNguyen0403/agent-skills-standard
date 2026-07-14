Use `NgOptimizedImage` and mark the above-the-fold hero image—the likely LCP element—with the `priority` attribute.

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgOptimizedImage],
  template: `
    <img
      ngSrc="https://cdn.example.com/hero.jpg"
      width="1600"
      height="900"
      priority
      alt="Product dashboard"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
```

Key points:

- Replace `src` with `ngSrc`.
- Always provide accurate `width` and `height` to prevent layout shifts.
- Add `priority` only to the LCP image. Angular can then add preload and preconnect hints.
- `NgOptimizedImage` enables lazy loading for non-priority images and generates responsive `srcset` values.
- Use appropriately sized, compressed image assets and a CDN when possible.
- Keep component state reactive with Signals for state; avoid `Zone.runOutsideAngular` hacks when preparing for zoneless Angular.
- For below-the-fold heavy content, use `@defer (on viewport)` separately; image optimization does not replace component deferral.

Avoid template expressions such as `{{ calculate() }}` because they re-evaluate on every change detection cycle. Use a `computed()` signal, which caches until dependencies change. In `@for` loops, use a stable unique identifier: `@for (item of items; track item.id)`—the `track` expression replaces `trackBy`.
