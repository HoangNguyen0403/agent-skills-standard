# Configuring incremental hydration with `@defer`

Incremental hydration lets the server send HTML for deferred sections while the browser delays attaching Angular behavior to those sections until a trigger occurs. Enable it in the shared application configuration:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import {
  provideClientHydration,
  withIncrementalHydration,
} from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withIncrementalHydration()),
  ],
};
```

Then use a deferrable view in a template. The dependencies in the block should be standalone and are loaded as a separate chunk:

```html
@defer (on viewport; prefetch on idle) {
  <analytics-panel />
} @placeholder (minimum 300ms) {
  <p>Loading analytics…</p>
} @loading (after 100ms; minimum 500ms) {
  <app-spinner />
} @error {
  <p>Analytics could not be loaded.</p>
}
```

With incremental hydration, the server can render the block's main content into the initial HTML, while the client waits to hydrate it. Common hydration triggers are `on viewport`, `on interaction`, `on hover`, `on idle`, and `on timer`; `when` can use a boolean expression. `prefetch on ...` controls when the deferred JavaScript is downloaded and is independent of the event that actually hydrates the block. For example, prefetching on idle can reduce interaction latency while still hydrating on viewport.

The application must already have SSR/server rendering configured. Put `provideClientHydration(withIncrementalHydration())` in the shared providers so the browser and server agree on the hydration setup. Angular's incremental hydration support also preserves early user interactions through event replay, so an interaction that occurs before the deferred code is ready can be replayed after hydration.

Use this for below-the-fold or interaction-heavy sections, not for content needed immediately for the page's primary task. Keep the placeholder stable and accessible, and ensure the server-rendered block does not read `window` or other browser-only APIs during its initial render. If a dependency truly cannot execute on the server, guard it or choose a client-only strategy rather than assuming `@defer` alone makes arbitrary browser code SSR-safe.


