# `computed` signals versus functions in templates

Use `computed()` for derived values that depend on signals. A computed signal is memoized and recalculates when one of its tracked signal dependencies changes. Calling an arbitrary calculation from interpolation can repeat that work during change-detection checks.

```ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';

interface User {
  id: string;
  name: string;
}

@Component({
  selector: 'app-filtered-users',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      type="search"
      [value]="query()"
      (input)="query.set(($any($event.target)).value)"
    />

    @for (user of visibleUsers(); track user.id) {
      <p>{{ user.name }}</p>
    } @empty {
      <p>No matching users.</p>
    }
  `,
})
export class FilteredUsersComponent {
  readonly users = input.required<readonly User[]>();
  readonly query = signal('');
  readonly visibleUsers = computed(() => {
    const term = this.query().trim().toLowerCase();
    return this.users().filter((user) => user.name.toLowerCase().includes(term));
  });
}
```

The template reads `visibleUsers()`; it does not call a `filterUsers()` or `calculate()` method for interpolation. Event-handler methods are still appropriate for actions, but keep derived presentation state in `computed()` (or use a pipe for reusable formatting). The computed value remains compatible with standalone components and OnPush.

