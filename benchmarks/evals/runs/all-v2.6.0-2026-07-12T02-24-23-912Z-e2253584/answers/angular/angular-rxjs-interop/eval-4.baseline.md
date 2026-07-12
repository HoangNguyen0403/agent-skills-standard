# Properly unsubscribing from Observables in Angular

Choose the ownership pattern that matches how the Observable is consumed:

1. In a template, prefer the `async` pipe. It subscribes when the view is created, updates the view, and unsubscribes when the view is destroyed:

```html
<div>{{ user$ | async | json }}</div>
```

2. If the component uses Signals, convert the stream with `toSignal`. It owns the subscription and tears it down with the component's injection context:

```ts
readonly user = toSignal(this.userService.user$, {
  initialValue: null,
});
```

3. For an imperative subscription, use `takeUntilDestroyed`:

```ts
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

private readonly destroyRef = inject(DestroyRef);

ngOnInit() {
  this.notifications.events$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe((event) => this.handleEvent(event));
}
```

When the component is destroyed, the operator completes the chain and unsubscribes the subscription. If the subscription is created in a constructor or another Angular injection context, `takeUntilDestroyed()` may be called without an argument. Pass a `DestroyRef` when the code runs outside that context, such as a callback or utility function.

For work that is intentionally short-lived, operators such as `take(1)`, `first()`, or `timeout` can define the lifetime. Explicitly calling `subscription.unsubscribe()` is also appropriate when the subscription ends in response to a user action before component destruction. Avoid the old manual `Subject`/`ngOnDestroy` pattern unless there is a specific reason to share one notifier across multiple lifetimes. Also remember that `shareReplay` controls sharing and replay; it does not by itself guarantee that every consumer's subscription is cleaned up.


