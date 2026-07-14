Assuming Angular 16+ and NgRx Signals installed:

```bash
npm install @ngrx/signals
```

Create a Signal Store:

```ts
// counter.store.ts
import { computed } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

type CounterState = {
  count: number;
};

export const CounterStore = signalStore(
  { providedIn: 'root' },

  withState<CounterState>({ count: 0 }),

  withComputed(({ count }) => ({
    doubled: computed(() => count() * 2),
  })),

  withMethods((store) => ({
    increment(): void {
      patchState(store, (state) => ({
        count: state.count + 1,
      }));
    },

    decrement(): void {
      patchState(store, (state) => ({
        count: state.count - 1,
      }));
    },
  })),
);
```

Inject and use it in a component:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CounterStore } from './counter.store';

@Component({
  selector: 'app-counter',
  standalone: true,
  template: `
    <p>Count: {{ store.count() }}</p>
    <p>Doubled: {{ store.doubled() }}</p>

    <button (click)="store.decrement()">−</button>
    <button (click)="store.increment()">+</button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterComponent {
  readonly store = inject(CounterStore);
}
```

Signals are read by calling them:

```ts
store.count()
store.doubled()
```

Common building blocks are:

- `withState()` — state signals
- `withComputed()` — derived read-only signals
- `withMethods()` — state mutations and business logic
- `patchState()` — immutable state updates
- `withHooks()` — initialization and cleanup
- `rxMethod()` — RxJS-based effects for HTTP or asynchronous workflows

Example with an asynchronous method:

```ts
import { inject } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { UserService } from './user.service';

export const UserStore = signalStore(
  { providedIn: 'root' },

  withState({
    users: [] as User[],
    loading: false,
  }),

  withMethods((store, userService = inject(UserService)) => ({
    loadUsers: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() => userService.getUsers()),
        tap((users) =>
          patchState(store, {
            users,
            loading: false,
          }),
        ),
      ),
    ),
  })),
);
```

Call it from the component:

```ts
store.loadUsers();
```

Use `{ providedIn: 'root' }` for a singleton store, or provide the store at a component level when each component instance needs isolated state.
