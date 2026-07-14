# Unsubscribing from Observables in Angular

For an Observable that is displayed in a template, prefer `toSignal`; it subscribes and automatically unsubscribes with the component:

```typescript
readonly users = toSignal(this.userService.users$, { initialValue: [] });
```

For a manual subscription, scope it with `takeUntilDestroyed`:

```typescript
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from './notification.service';

export class NotificationsComponent {
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.notifications.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.handle(event));
  }
}
```

`takeUntilDestroyed` completes the subscription when the component or service is destroyed. In a constructor or another injection context, `takeUntilDestroyed()` can infer the `DestroyRef`; pass an injected `DestroyRef` when subscribing from `ngOnInit` or from code outside that context.

Do not put manual `subscribe()` calls in templates, and avoid a global `Subject` used with `takeUntil`: if that subject is never completed or is shared across instances, subscriptions can leak. Also remember that finite HTTP Observables normally complete themselves, while long-lived streams such as events, intervals, and WebSockets need lifecycle cleanup.

