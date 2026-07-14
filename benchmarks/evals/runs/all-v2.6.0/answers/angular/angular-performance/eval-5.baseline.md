To prepare an Angular app for zoneless rendering:

1. Enable zoneless change detection in `app.config.ts`:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
  ],
};
```

2. Remove `zone.js` from the `polyfills` section of `angular.json` and remove it from `package.json` if no dependency requires it.

3. Ensure state changes notify Angular. Zoneless change detection runs after supported notifications such as:

- Updating a signal read by a template
- Calling `ChangeDetectorRef.markForCheck()`
- Calling `ComponentRef.setInput()`
- Handling a bound template or host listener
- Using `AsyncPipe`

Example:

```ts
count = signal(0);

increment() {
  this.count.update(value => value + 1);
}
```

Prefer signals and `OnPush` components, and avoid relying on arbitrary asynchronous callbacks or direct object mutation to trigger rendering.

For older Angular versions, use the version-specific experimental provider:

```ts
provideExperimentalZonelessChangeDetection()
```

assuming that API is available in that Angular release.
