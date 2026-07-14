# Using `@if` and `@for` in Angular templates

Use Angular's built-in control-flow blocks (Angular 17+) instead of the structural directives `*ngIf` and `*ngFor`. Always give `@for` a stable tracking expression, normally a unique item id, and provide an `@empty` state when an empty collection needs a useful UI.

```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

interface User {
  id: string;
  name: string;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <p>Loading users...</p>
    } @else {
      @for (user of users(); track user.id) {
        <article>
          <h2>{{ user.name }}</h2>
        </article>
      } @empty {
        <p>No users found.</p>
      }
    }
  `,
})
export class UserListComponent {
  readonly loading = input(false);
  readonly users = input.required<readonly User[]>();
}
```

`@if` can have `@else if` and `@else` branches. A `@for` block can use `let` aliases and an `@empty` block; `track user.id` lets Angular reuse DOM nodes correctly when the array changes. Read signal inputs with `users()` and `loading()`, rather than treating them as ordinary properties. The component remains standalone and uses `OnPush`.

