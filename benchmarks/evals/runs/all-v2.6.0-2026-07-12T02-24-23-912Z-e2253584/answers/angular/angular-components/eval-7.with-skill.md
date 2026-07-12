# The Smart/Dumb component pattern

The pattern separates orchestration from presentation:

- A smart/container component injects services, owns loading/error/state decisions, and handles business actions.
- A dumb/presentational component has no service dependencies. It receives data through signal inputs and reports user intent through `output()` events.

For example, the presentational component can stay focused on rendering:

```ts
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

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
    @for (user of users(); track user.id) {
      <button type="button" (click)="selectUser(user)">
        {{ user.name }}
      </button>
    } @empty {
      <p>No users.</p>
    }
  `,
})
export class UserListComponent {
  readonly users = input.required<readonly User[]>();
  readonly selected = output<User>();

  selectUser(user: User): void {
    this.selected.emit(user);
  }
}
```

The smart parent owns the service and connects the child to it:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-user-page',
  standalone: true,
  imports: [UserListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-user-list
      [users]="users()"
      (selected)="selectUser($event)"
    />
  `,
})
export class UserPageComponent {
  private readonly usersApi = inject(UsersApi);
  readonly users = toSignal(this.usersApi.users$, { initialValue: [] });

  selectUser(user: User): void {
    this.usersApi.select(user.id);
  }
}
```

The parent example also requires `inject` and `toSignal` imports from `@angular/core` and `@angular/core/rxjs-interop`. This boundary makes the dumb component reusable and easy to test, while the smart component remains responsible for service interaction. Both components are standalone and use OnPush.

