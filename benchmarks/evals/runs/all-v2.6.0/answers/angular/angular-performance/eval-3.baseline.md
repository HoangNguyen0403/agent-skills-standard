Use `NgOptimizedImage` on the image that is likely to become your Largest Contentful Paint (LCP) element.

```ts
// app.component.ts
import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgOptimizedImage],
  template: `
    <img
      ngSrc="/assets/hero.webp"
      width="1440"
      height="640"
      priority
      alt="Product dashboard"
    />
  `,
})
export class HomeComponent {}
```

For an NgModule-based application:

```ts
import { NgOptimizedImage } from '@angular/common';

@NgModule({
  imports: [NgOptimizedImage],
})
export class AppModule {}
```

`priority` tells Angular that the image is critical. It applies eager loading, requests high fetch priority, and can generate a preload hint. Use it only for the primary above-the-fold image—typically one image per page.

Important practices:

- Always provide accurate `width` and `height` to preserve aspect ratio and prevent layout shift.
- Use `fill` instead when the image must fill a positioned container:

  ```html
  <div class="hero">
    <img
      ngSrc="/assets/hero.webp"
      fill
      priority
      sizes="100vw"
      alt="Product dashboard"
    />
  </div>
  ```

- Add `sizes` for responsive or `fill` images so the browser chooses an appropriate resource:

  ```html
  <img
    ngSrc="/assets/hero.webp"
    width="1440"
    height="640"
    priority
    sizes="(max-width: 768px) 100vw, 50vw"
    alt="Product dashboard"
  />
  ```

- Configure an image loader when images come from a CDN, so Angular can generate optimized URLs and responsive `srcset` values.
- Do not mark below-the-fold images as `priority`; they should remain lazy-loaded.
- Use a properly compressed format such as WebP or AVIF and avoid rendering the LCP image only after client-side JavaScript executes.
- Make sure the image is not blocked by slow CSS, delayed API data, or an oversized download.

In short: import `NgOptimizedImage`, use `ngSrc`, provide dimensions or `fill`, add `sizes` where appropriate, and apply `priority` only to the actual above-the-fold LCP candidate.
