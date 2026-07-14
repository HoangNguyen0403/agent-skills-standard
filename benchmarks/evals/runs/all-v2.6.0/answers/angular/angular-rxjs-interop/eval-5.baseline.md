# Using `takeUntilDestroyed`

`takeUntilDestroyed` is an RxJS operator from `@angular/core/rxjs-interop` that completes an Observable when the associated Angular `DestroyRef` is destroyed:

```ts
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-dashboard',
  template: `{{ latestMessage }}`,
})
export class DashboardComponent {
  private readonly destroyRef = inject(DestroyRef);
  latestMessage = '';

  constructor(private readonly messages: MessageService) {
    this.messages.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        this.latestMessage = message.text;
      });
  }
}
```

When called inside a constructor, field initializer, directive, component, or service injection context, the shorter form is sufficient:

```ts
readonly data$ = this.api.data$.pipe(takeUntilDestroyed());
```

Use the explicit form when the operator is assembled in a function that has no current injection context:

```ts
function watchEvents(events$: Observable<Event>, destroyRef: DestroyRef) {
  return events$.pipe(takeUntilDestroyed(destroyRef));
}
```

The destruction lifetime belongs to the injected context. A component-bound `DestroyRef` ends with that component; a root-provided service may live for the entire application, so its subscriptions may intentionally live that long. Put `takeUntilDestroyed` after operators such as `switchMap` when the whole resulting chain, including active inner subscriptions, must be torn down with the context. It is still important to avoid unnecessary imperative subscriptions: use the `async` pipe or `toSignal` when those better express the ownership of the data.


