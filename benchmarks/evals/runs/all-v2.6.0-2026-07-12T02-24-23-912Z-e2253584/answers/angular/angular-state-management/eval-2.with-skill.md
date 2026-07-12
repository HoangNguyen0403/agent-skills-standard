# Using NgRx Signal Store

NgRx Signal Store composes a feature store from state, computed selectors, and methods. withState() owns the source state, withComputed() derives read-only values, and withMethods() is the controlled write/API surface. Use patchState() for immutable updates.

~~~ts
import { computed, inject } from '@angular/core';
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

type TodoState = {
  items: Todo[];
  filter: 'all' | 'pending' | 'done';
  loading: boolean;
  error: string | null;
};

const initialState: TodoState = {
  items: [],
  filter: 'all',
  loading: false,
  error: null,
};

export const TodoStore = signalStore(
  { providedIn: 'root' },
  withState<TodoState>(initialState),
  withComputed(({ items, filter }) => ({
    filteredItems: computed(() => {
      const currentFilter = filter();
      return items().filter(todo =>
        currentFilter === 'all'
          ? true
          : currentFilter === 'done'
            ? todo.done
            : !todo.done,
      );
    }),
    remainingCount: computed(() => items().filter(todo => !todo.done).length),
  })),
  withMethods(store => ({
    setFilter(filter: TodoState['filter']): void {
      patchState(store, { filter });
    },

    toggle(id: string): void {
      patchState(store, state => ({
        items: state.items.map(todo =>
          todo.id === id ? { ...todo, done: !todo.done } : todo,
        ),
      }));
    },

    async load(service = inject(TodoApi)): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const items = await service.getAll();
        patchState(store, { items });
      } catch (error) {
        patchState(store, {
          error: error instanceof Error ? error.message : 'Unable to load todos',
        });
      } finally {
        patchState(store, { loading: false });
      }
    },
  })),
);
~~~

Inject TodoStore into a component and read signals such as store.filteredItems() or store.loading(). The component calls methods like store.toggle(id) but does not splice arrays, calculate derived values, or coordinate loading state itself.

For more involved reactive HTTP flows, NgRx Signal Store also supports patterns such as rxMethod; the important boundary remains the same: source state is updated immutably in store methods, derived state is computed with computed(), and side effects are kept in the appropriate method or effect integration. Use withEntities() when a feature needs normalized entity collections rather than hand-managed arrays.


