Enable Angular SSR and client hydration in two parts:

1. Add the SSR integration to the project:

```bash
ng add @angular/ssr
```

This adds the server entry point and the SSR build/serve configuration. In `app.config.ts`, register client hydration alongside the router and HTTP client:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideClientHydration(withEventReplay()),
  ],
};
```

SSR produces the initial HTML on the server. `provideClientHydration()` tells Angular to reuse that DOM and attach the client application instead of wiping it out and rendering the page again. `withEventReplay()` captures supported user events that happen before hydration finishes and replays them after the relevant handlers are available.

Keep the server and browser output structurally compatible. Browser-only work such as `window`, `document`, or `localStorage` access must be deferred with `afterNextRender()` (or guarded with `PLATFORM_ID`/`isPlatformBrowser()` for recurring work), because that code also runs during server rendering.

