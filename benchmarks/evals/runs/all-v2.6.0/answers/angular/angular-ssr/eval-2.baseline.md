# Using `RenderMode` with Angular server routes

Angular's server-route configuration is separate from the browser `Routes` array. It describes how each URL is rendered on the server. Import `RenderMode` and `ServerRoute` from `@angular/ssr`:

```ts
// app.routes.server.ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'dashboard', renderMode: RenderMode.Server },
  { path: 'settings/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
```

The modes mean:

- `RenderMode.Prerender`: generate static HTML at build time. This is useful for public, mostly stable pages and does not require a request-time server for those URLs.
- `RenderMode.Server`: render on every request. Use it for request-dependent or frequently changing pages.
- `RenderMode.Client`: do not server-render that route; let the browser render it as a client-side application. This is useful for browser-only pages, though the page gives up SSR for that route.

Register the table with the server renderer:

```ts
// app.config.server.ts
import { ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';

export const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes))],
};
```

Keep the normal navigation routes in `app.routes.ts`; `app.routes.server.ts` controls their server behavior rather than replacing client routing. Put specific entries before a catch-all entry so the intended route policy is selected. A catch-all such as `{ path: '**', renderMode: RenderMode.Server }` is a reasonable default, but it must not precede more specific policies.

Parameterized routes can be prerendered only for a known set of parameter values. In Angular versions that support it, add `getPrerenderParams` to a `ServerRoute` and return the parameter objects to generate. If the IDs are not known at build time, use `RenderMode.Server` instead:

```ts
{
  path: 'products/:id',
  renderMode: RenderMode.Prerender,
  async getPrerenderParams() {
    const ids = await loadProductIds();
    return ids.map(id => ({ id }));
  },
}
```

Choose `Server` for per-request data, `Prerender` for build-time content, and `Client` only when the route cannot or should not be rendered on the server. Test both a production build (for prerender output) and a request to a server-rendered route.


