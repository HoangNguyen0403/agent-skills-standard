# Using `provideAppInitializer` in Angular 19+

`provideAppInitializer` registers a function that Angular runs during application startup. Put it in the application's providers, and return a `Promise`, an `Observable`, or nothing. Angular waits for a returned promise to settle or for a returned observable to complete before finishing initialization.

```ts
// app.config.ts
import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideAppInitializer(() => {
      const runtimeConfig = inject(RuntimeConfigService);
      return firstValueFrom(runtimeConfig.load());
    }),
  ],
};
```

The callback executes in an injection context, so dependencies should be obtained with `inject()` inside the callback. `RuntimeConfigService.load()` might return an HTTP observable; converting it with `firstValueFrom` makes the startup contract explicit. An HTTP observable normally completes after its response, but an initializer observable that never completes will keep bootstrap waiting indefinitely.

For a synchronous initialization step, simply perform the work and return `void`:

```ts
provideAppInitializer(() => {
  const featureFlags = inject(FeatureFlagService);
  featureFlags.readCachedFlags();
});
```

If the returned promise or observable errors, application startup fails unless the initializer handles the error. Handle only errors that are genuinely recoverable, and establish a safe fallback if the application can start without remote configuration. `provideAppInitializer` is the functional replacement for the older `APP_INITIALIZER` provider style; it does not use the old `deps` array because dependencies are resolved with `inject()`.

