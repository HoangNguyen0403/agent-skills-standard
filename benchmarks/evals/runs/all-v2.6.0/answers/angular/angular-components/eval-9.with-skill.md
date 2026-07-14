# Avoiding subscription memory leaks

Prefer `toSignal()` for an observable consumed by the template. It subscribes in the component's injection context and automatically unsubscribes when the component is destroyed.

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-user-feed',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (user of users(); track user.id) {
      <p>{{ user.name }}</p>
    } @empty {
      <p>No users.</p>
    }
  `,
})
export class UserFeedComponent {
  private readonly userService = inject(UserService);
  readonly users = toSignal(this.userService.users$, { initialValue: [] });
}
```

If an imperative side effect genuinely requires `subscribe()`, bind its lifetime with `takeUntilDestroyed()`:

```ts
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export class EventConsumerComponent {
  private readonly eventService = inject(EventService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.eventService.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.handleEvent(event));
  }

  private handleEvent(event: EventPayload): void {
    // Perform the required imperative side effect here.
  }
}
```

The `async` pipe is another safe template option. Do not leave a raw `subscribe()` unmanaged; use `toSignal()`, the `async` pipe, `takeUntilDestroyed()`, or an equivalent `DestroyRef` cleanup. Keep the component standalone and OnPush, and reserve `effect()` for intentional signal side effects rather than replacing ordinary derived state with subscriptions.

