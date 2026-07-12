# Using `NgOptimizedImage` for LCP

Import `NgOptimizedImage` from `@angular/common` (or include it in the standalone component's `imports`). Use `ngSrc` instead of `src`, provide intrinsic dimensions, and mark only the actual above-the-fold LCP image as `priority`:

```ts
import { NgOptimizedImage } from '@angular/common';

@Component({
  standalone: true,
  imports: [NgOptimizedImage],
  template: `
    <img
      ngSrc="/assets/hero.webp"
      width="1600"
      height="900"
      ngSrcset="640w, 960w, 1280w, 1600w"
      sizes="100vw"
      priority
      alt="A cyclist riding beside the coast"
    />
  `,
})
export class HomeHero {}
```

`priority` tells Angular to treat the image as important for initial rendering, including eager loading/fetch-priority behavior. It should generally be used for one or a small number of likely LCP images, not every image on the page. Other images should normally remain lazy-loaded.

The `width` and `height` preserve the image's aspect ratio and reserve layout space, which prevents cumulative layout shift. If the image fills a positioned container, use `fill` instead and size the container explicitly:

```html
<div class="hero-frame">
  <img ngSrc="/assets/hero.webp" fill priority alt="A cyclist riding beside the coast" />
</div>
```

```css
.hero-frame {
  position: relative;
  min-height: 420px;
}
```

Configure an image loader when images come from a CDN so Angular can generate appropriately sized URLs rather than downloading an unnecessarily large original. Choose `ngSrcset` and `sizes` based on the actual rendered widths: `sizes` tells the browser how much viewport space the image occupies, and the browser then selects a suitable candidate. Serve modern formats and compress the file, but keep enough quality for the LCP image.

The image must be in the initial document and visible early enough to be a plausible LCP candidate. Avoid hiding the critical image behind a late client-only condition or using a CSS background when the image directive can be used. Verify with a production build and a realistic throttled run: check the LCP element, image request priority, selected source width, response time, and whether render-blocking CSS or the server response is the actual bottleneck. `NgOptimizedImage` helps the image request, but it cannot compensate for a slow server, oversized CSS/JavaScript, or a wrong LCP candidate.

