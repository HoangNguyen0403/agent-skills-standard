# Enabling SSR and hydration in Angular

For a new Angular application, the simplest setup is:

```bash
ng new my-app --ssr
```

For an existing application, add the SSR integration instead:

```bash
ng add @angular/ssr
```

The CLI command adds the server entry point and server configuration, and configures the project to produce a browser bundle and a server bundle. In a standalone application, the shared application configuration should provide client hydration:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [provideClientHydration()],
};
```

Put `provideClientHydration()` in the shared configuration used by both the browser and server bootstraps. The server renders the initial HTML, and the browser reuses that DOM and attaches Angular behavior instead of rendering the application from scratch. If the server configuration is separate, it normally enables server rendering as well:

```ts
// app.config.server.ts
import { ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/ssr';

export const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering()],
};
```

The exact generated entry-point names vary slightly by Angular version, but the important pieces are the `@angular/ssr` server integration and `provideClientHydration()` in the application providers. Older NgModule applications can add `provideClientHydration()` to the module providers; do not mix it with obsolete, hand-written server-transition setup unless the application still requires that legacy API.

Check that the application is hydration-compatible. Code that reads `window`, `document`, `localStorage`, or other browser-only globals during server rendering must be guarded or moved to a browser-only render callback. The server and browser must also produce equivalent initial markup; otherwise Angular reports hydration mismatches and may discard and recreate DOM subtrees.

Typical commands after setup are:

```bash
ng build
ng serve
```

For a production-like check, build the application and run the generated server entry point using the command/output layout shown by the generated project. Then request a page with JavaScript disabled to confirm that SSR returns useful HTML, and enable JavaScript to confirm that hydration attaches interactivity without a second full render.


