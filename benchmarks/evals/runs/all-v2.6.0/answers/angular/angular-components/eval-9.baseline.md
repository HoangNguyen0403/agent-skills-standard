# Avoiding subscription memory leaks in Angular components

Prefer Angular-managed consumption when a component only needs to display a stream:

```html
<p>{{ user$ | async | json }}</p>
```

The `async` pipe subscribes when the view is created and unsubscribes when the view is destroyed. For signal-based code, `toSignal` also manages the subscription for the lifetime of the injection context:

```ts
readonly user = toSignal(this.userService.user$, { initialValue: null });
```

When imperative code is required, use `takeUntilDestroyed` with the component's `DestroyRef`:

```ts
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

private readonly destroyRef = inject(DestroyRef);

ngOnInit(): void {
  this.events.events$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(event => this.handleEvent(event));
}
```

`takeUntilDestroyed` completes the subscription when the component or directive is destroyed. It can also be called without an argument when used inside an injection context, such as a field initializer or constructor. For older Angular versions, the equivalent is a `Subject<void>` completed in `ngOnDestroy`, or storing the `Subscription` and explicitly calling `unsubscribe()`; the destroy hook must be reliable and cover every subscription.

Not every observable needs manual teardown: finite streams such as ordinary `HttpClient` requests complete by themselves, but adding lifecycle management is still useful if the code may later change to a long-lived stream. Template event bindings and Angular-created resources are cleaned up by Angular. Be especially careful with `interval`, WebSocket, DOM `fromEvent`, subjects, and service streams that never complete.

Avoid nested subscriptions when composition operators such as `switchMap`, `combineLatest`, or `forkJoin` express the relationship. If a shared observable is cached, configure sharing deliberately—for example, `shareReplay({ bufferSize: 1, refCount: true })` when the source should stop after the last consumer leaves. Also consider the lifetime of the service that owns a subscription: a root service intentionally lives for the application, while a component-scoped service can be destroyed with the component.

