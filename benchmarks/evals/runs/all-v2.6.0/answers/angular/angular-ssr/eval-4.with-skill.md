Do not read `window`, `document`, or `localStorage` directly during component construction, field initialization, or ordinary code that can run on the server. For one-time browser-only work, use `afterNextRender()`:

```ts
import { Component, afterNextRender } from '@angular/core';

@Component({
  selector: 'app-chart',
  template: '<div id="chart"></div>',
})
export class ChartComponent {
  constructor() {
    afterNextRender(() => {
      const element = document.getElementById('chart');
      const width = window.innerWidth;
      // Initialize the browser-only chart here.
      console.log(element, width);
    });
  }
}
```

`afterNextRender()` runs after Angular renders in the browser and does not execute as part of server rendering, so DOM APIs are safe inside that callback.

For recurring checks or callbacks, inject `PLATFORM_ID` and test `isPlatformBrowser()` before touching browser APIs:

```ts
import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';

export class ViewportComponent {
  private readonly platformId = inject(PLATFORM_ID);

  checkViewport(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const width = window.innerWidth;
    // Recurring browser-only logic.
    console.log(width);
  }
}
```

Also clean up timers and event listeners when the component is destroyed. The important rule is that server-renderable component logic must not assume a browser global exists.

