# Preparing Angular for zoneless rendering

Zoneless rendering means Angular does not rely on Zone.js patching every timer, promise, and browser event to decide when to run change detection. The application must make UI-affecting state changes visible through Angular's supported notification paths.

In a standalone bootstrap, enable Angular's zoneless change-detection provider:

```ts
import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});
```

Then remove `zone.js` from the application's polyfills only after the app and its dependencies have been audited. The exact CLI configuration depends on the project version, so update the relevant build configuration and test configuration together.

## Make state changes explicit

Signals are a natural fit because Angular tracks signals read by a template and schedules rendering when they change:

```ts
readonly count = signal(0);

increment(): void {
  this.count.update(value => value + 1);
}
```

Other supported notification paths include `AsyncPipe`, `toSignal`, `ChangeDetectorRef.markForCheck()`, `ComponentRef.setInput()`, template event listeners, and attaching or changing views. For observable state, prefer `| async` or convert it with `toSignal` rather than assigning a field in an arbitrary callback and expecting Angular to notice it.

This is not sufficient in a zoneless app:

```ts
setTimeout(() => {
  this.status = 'ready'; // plain field mutation; no reliable render notification
}, 0);
```

Use a signal, an `AsyncPipe`, or explicitly mark the component for check:

```ts
readonly status = signal<'loading' | 'ready'>('loading');

load(): void {
  this.api.load().subscribe(() => this.status.set('ready'));
}
```

For callbacks from third-party widgets, WebSocket wrappers, or other external event sources, bridge the result into a signal/observable consumed by the view, or call `markForCheck()` after updating component state. `NgZone.run()` by itself is not a substitute for a rendering notification when the application is zoneless. Keep callbacks lifecycle-safe with `takeUntilDestroyed` or equivalent cleanup.

Audit direct field mutations, manual subscriptions, imperative DOM updates, global listeners, timers, and libraries that assume Zone.js exists. Update tests to use Angular's stability APIs such as `fixture.whenStable()` and run the suite with the same zoneless provider. Check SSR/hydration, error handling, and third-party integrations in a production-like build; zoneless rendering improves scheduling only when every UI state transition has a clear Angular notification path.

