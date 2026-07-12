# Using NgRx Signal Store in Angular

NgRx Signal Store is a composable store built around Angular Signals. Define initial state with `withState()`, derived state with `withComputed()`, and public state transitions with `withMethods()`. Keep the state private to the store API and expose methods rather than letting components update fields directly.

Install the Signals package and, for RxJS-based effects, its RxJS interop package:

```bash
npm install @ngrx/signals
```

Here is a small root-provided store:

```ts
import { computed } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

interface Todo {
  id: string;
  title: string;
  done: boolean;
}

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'done';
}

const initialState: TodoState = {
  todos: [],
  filter: 'all',
};

export const TodoStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ todos, filter }) => ({
    visibleTodos: computed(() => {
      const currentFilter = filter();
      return todos().filter(todo =>
        currentFilter === 'all' ||
        (currentFilter === 'active' && !todo.done) ||
        (currentFilter === 'done' && todo.done),
      );
    }),
    remainingCount: computed(() => todos().filter(todo => !todo.done).length),
  })),
  withMethods(store => ({
    setFilter(filter: TodoState['filter']): void {
      patchState(store, { filter });
    },

    addTodo(todo: Todo): void {
      patchState(store, state => ({
        todos: [...state.todos, todo],
      }));
    },

    toggleTodo(id: string): void {
      patchState(store, state => ({
        todos: state.todos.map(todo =>
          todo.id === id ? { ...todo, done: !todo.done } : todo,
        ),
      }));
    },
  })),
);
```

Inject the store wherever it is needed:

```ts
export class TodoPage {
  readonly store = inject(TodoStore);

  add(title: string): void {
    this.store.addTodo({ id: crypto.randomUUID(), title, done: false });
  }
}
```

The store itself exposes signals such as `todos()`, `filter()`, `visibleTodos()`, and `remainingCount()`, plus the methods declared by `withMethods()`. Read signals in the template so Angular can track them. For a feature-local store, omit `providedIn: 'root'` and provide `TodoStore` in the route or component providers; that gives each injector its own instance.

For HTTP or other streams, use `rxMethod()` from `@ngrx/signals/rxjs-interop` inside `withMethods()` when the operation benefits from RxJS operators such as cancellation, debouncing, or error handling. Keep request status in state, handle errors deliberately, and avoid mutating arrays or objects in place. Signal Store is not automatically a global singleton: its lifetime and sharing behavior come from where the store is provided.

