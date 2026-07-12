# Using `NgOptimizedImage` for LCP

Import `NgOptimizedImage` and replace a plain `src` binding with `ngSrc`. Give the image intrinsic dimensions so the browser can reserve space, and mark the above-the-fold LCP image as `priority`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      ngSrc="/assets/hero.webp"
      width="1600"
      height="900"
      priority
      alt="Product dashboard preview"
    />
  `,
})
export class HomeComponent {}
```

`NgOptimizedImage` can generate responsive `srcset` variants, apply appropriate lazy-loading behavior, and add preconnect hints. `priority` tells Angular and the browser that this image is likely the Largest Contentful Paint resource, so it should be fetched with high priority. Use it only for the actual LCP/hero image rather than every image on the page.

For images below the fold, omit `priority` so they can load lazily. Always provide accurate `width` and `height` (or use the supported fill-style layout when appropriate); this reserves layout space and prevents image loading from shifting the page. Configure an Angular image loader when the source is served by an image CDN, and keep the requested dimensions appropriate for the rendered size so LCP does not download an unnecessarily large asset.

