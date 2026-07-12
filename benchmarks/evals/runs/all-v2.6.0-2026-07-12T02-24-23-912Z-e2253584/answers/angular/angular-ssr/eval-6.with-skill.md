In `app.routes.server.ts`, export a `ServerRoute[]` and set `renderMode` for each route:

```ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'blog/:slug', renderMode: RenderMode.Prerender },
  { path: 'feed', renderMode: RenderMode.Server },
  { path: 'dashboard', renderMode: RenderMode.Client },
];
```

Choose the mode based on the route’s data and privacy needs:

- `RenderMode.Prerender`: generate static HTML at build time for public, cacheable pages such as marketing pages and blogs. Parameterized routes need their build-time parameters supplied by the SSR configuration.
- `RenderMode.Server`: render dynamically for every request when the HTML depends on current server-side data, such as a public feed or request-specific page.
- `RenderMode.Client`: skip SSR and let the browser bootstrap the page. This is the appropriate default for authenticated dashboards and other pages whose content must not be rendered into a server response.

The server route table does not replace the normal client `Routes` definition; it selects how the corresponding paths are rendered by the SSR server. Browser-only code still needs `afterNextRender()` or a `PLATFORM_ID`/`isPlatformBrowser()` guard.

