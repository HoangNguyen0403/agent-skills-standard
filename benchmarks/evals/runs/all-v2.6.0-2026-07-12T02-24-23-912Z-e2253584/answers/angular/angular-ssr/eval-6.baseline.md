# Setting render modes per route in `app.routes.server.ts`

Keep the normal navigation definitions in `app.routes.ts`, and add a server-route table for the rendering policy:

```ts
// app.routes.server.ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'about',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'products/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
```

Register those routes in the server application configuration:

```ts
// app.config.server.ts
import { ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';

export const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
  ],
};
```

`RenderMode.Server` performs SSR for each request. `RenderMode.Prerender` produces HTML during the build, so it is suitable only when the route and its parameter values are known during the build. `RenderMode.Client` skips SSR for that route and leaves rendering to the browser.

For a parameterized route that should be prerendered, provide the IDs to generate in Angular versions that support `getPrerenderParams`:

```ts
{
  path: 'docs/:slug',
  renderMode: RenderMode.Prerender,
  async getPrerenderParams() {
    const slugs = await loadDocumentationSlugs();
    return slugs.map(slug => ({ slug }));
  },
}
```

If parameters depend on the incoming request, cookies, or authentication, use `RenderMode.Server` instead. Keep the catch-all route last so it does not hide more specific policies. Also remember that this table controls server rendering only; it does not replace the browser router's route definitions. Verify the result with a production build for prerendered pages and with real HTTP requests for server-rendered pages.


