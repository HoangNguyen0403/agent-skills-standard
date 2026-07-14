Define server rendering behavior in `app.routes.server.ts` with a `ServerRoute[]`. Import `RenderMode` from `@angular/ssr` and assign a mode to each path:

```ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Static HTML generated at build time.
  { path: 'blog/:slug', renderMode: RenderMode.Prerender },

  // HTML generated on every request.
  { path: 'feed', renderMode: RenderMode.Server },

  // No server rendering; the browser bootstraps the SPA.
  { path: 'dashboard', renderMode: RenderMode.Client },
];
```

Use `RenderMode.Prerender` for stable public content such as blogs, documentation, and marketing pages. Parameterized prerender routes also need a way to enumerate their build-time parameters when the project’s SSR setup requires it. Use `RenderMode.Server` for content that must be rendered per request, such as a public feed whose data changes frequently. Use `RenderMode.Client` for authenticated or otherwise browser-only pages, such as a user dashboard, so private request state is not rendered on the server.

The route file controls the server-side mode; the normal client route configuration still defines navigation. Keep browser-only code guarded even on server-rendered routes.

