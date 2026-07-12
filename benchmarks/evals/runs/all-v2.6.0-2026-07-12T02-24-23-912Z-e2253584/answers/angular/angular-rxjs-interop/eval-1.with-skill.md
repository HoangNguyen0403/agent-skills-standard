# Converting an Observable to a Signal

Use `toSignal` from `@angular/core/rxjs-interop`:

```typescript
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService } from './user.service';

@Component({
  selector: 'app-user',
  template: `{{ user()?.name ?? 'Loading...' }}`,
})
export class UserComponent {
  private readonly userService = inject(UserService);

  readonly user = toSignal(this.userService.user$, {
    initialValue: null,
  });
}
```

The resulting `user` is a signal, so read its current value with `user()` in the class or template. `initialValue` gives the signal a defined value before the Observable emits; without it, the signal is `undefined` until the first emission. Create `toSignal` in an Angular injection context, such as a field initializer or constructor. Angular subscribes to the source and automatically unsubscribes when the component or service is destroyed.

For an Observable that is guaranteed to emit synchronously, an alternative is `{ requireSync: true }`, but `initialValue` is usually the safer choice for HTTP and other asynchronous streams.

