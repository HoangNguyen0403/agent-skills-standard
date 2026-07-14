# Safely accessing `window` in an Angular SSR application

`window` does not exist in the Node.js process that performs SSR. Never read it at module scope, in a field initializer, in a constructor, or while computing the initial template state. Guard browser-only work with Angular's platform check and run DOM-dependent work after rendering:

```ts
import {
  afterNextRender,
  inject,
  Injectable,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly platformId = inject(PLATFORM_ID);
  private width = 0;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    afterNextRender(() => {
      this.width = window.innerWidth;
    });
  }

  get currentWidth(): number {
    return this.width;
  }
}
```

For a component, the same guard can be used around an event listener or a signal update. `afterNextRender` is useful for code that requires the rendered browser DOM because it runs only after Angular has rendered in the browser. For APIs such as `localStorage`, `navigator`, `matchMedia`, and `document`, apply the same rule. Injecting `DOCUMENT` is preferable to importing a global when DOM access is required, but it still needs a browser guard for APIs that are not available or meaningful on the server:

```ts
const document = inject(DOCUMENT);
const platformId = inject(PLATFORM_ID);

if (isPlatformBrowser(platformId)) {
  document.documentElement.classList.add('ready');
}
```

Do not use a browser-only value to produce different initial HTML on the server and browser. That creates hydration mismatches. Render a stable server-compatible default first, then update it after hydration, or use a client-only route/deferred block when the content genuinely cannot be rendered on the server. A `typeof window !== 'undefined'` check is a safe low-level fallback, but Angular's `isPlatformBrowser` makes the intent explicit and works well with dependency injection and tests.


