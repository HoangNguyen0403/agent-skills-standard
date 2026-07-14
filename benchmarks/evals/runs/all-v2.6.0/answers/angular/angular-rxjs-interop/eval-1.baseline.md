# Converting an Observable to a Signal

Use `toSignal` from `@angular/core/rxjs-interop`:

```ts
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService } from './user.service';

@Component({
  selector: 'app-users',
  template: `
    @for (user of users(); track user.id) {
      <div>{{ user.name }}</div>
    }
  `,
})
export class UsersComponent {
  private readonly userService = inject(UserService);

  readonly users = toSignal(this.userService.users$, {
    initialValue: [],
  });
}
```

`toSignal` subscribes to the Observable immediately, updates the Signal whenever the Observable emits, and automatically unsubscribes when the component's injection context is destroyed. The returned value is read like any other Signal: call `users()` in TypeScript or the template.

If no `initialValue` is supplied, the Signal is `undefined` until the first emission, so its type is typically `Signal<T | undefined>`. Use an initial value when the template needs a usable value immediately. For a synchronously emitting source such as a `BehaviorSubject`, `requireSync: true` can express that contract and produce a non-undefined type:

```ts
readonly currentUser = toSignal(this.userService.currentUser$, {
  requireSync: true,
});
```

Do not call `toSignal` repeatedly in a template or in a method; create it once and reuse it. By default, it must be created in an Angular injection context, such as a component, directive, or service. If that is not available, pass an explicitly injected `Injector` through the options. Observable errors are surfaced when the Signal is read, and completion simply leaves the Signal at its last value.


