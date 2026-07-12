Incremental hydration is available in Angular 19+. First enable normal hydration and event replay in `app.config.ts`:

```ts
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';

export const appConfig = {
  providers: [provideClientHydration(withEventReplay())],
};
```

Then defer hydration for non-critical content with a `hydrate` trigger:

```html
@defer (hydrate on viewport) {
  <heavy-report />
} @placeholder {
  <p>Report will load when it is visible.</p>
}
```

The server can still send the initial HTML, but Angular waits to attach client behavior for that block until its hydration trigger fires. Available triggers include `viewport`, `interaction`, `idle`, `timer(ms)`, `immediate`, and `never`. For example, an interactive control can use an interaction trigger, while below-the-fold analytics can use the viewport trigger.

`withEventReplay()` is important when a user interacts with server-rendered UI before a deferred block has hydrated: Angular records the supported event and replays it once the block’s handlers are active. Provide stable placeholders and keep browser-only APIs inside `afterNextRender()` or a suitable platform guard so the deferred content remains safe during SSR.

