Use a service or Signal Store as the single source of truth. Keep writable signals private and expose read-only signals:

```ts
import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly items = signal<CartItem[]>([]);

  readonly cartItems = this.items.asReadonly();
  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  add(item: CartItem): void {
    this.items.update(items => [...items, item]);
  }

  clear(): void {
    this.items.set([]);
  }
}
```

Use `computed()` for pure, cached derived state such as totals, filtered lists, or counts. For dependent writable state that should reset when its source changes, use `linkedSignal()`:

```ts
readonly selectedId = linkedSignal(() => this.cartItems()[0]?.id ?? null);
```

Use `untracked()` when reading a signal inside `computed()` or `effect()` without making it a dependency.

Use `effect()` only for side effects such as logging, `localStorage` synchronization, or DOM updates:

```ts
effect(() => {
  localStorage.setItem('cart', JSON.stringify(this.cartItems()));
});
```

Never update signals inside `effect()`—this can create circular dependencies. Treat signal values as immutable and change them only with `.set()` or `.update()`.

For complex features, use NgRx Signal Store:

```ts
import {
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

export const CartStore = signalStore(
  withState({ items: [] as CartItem[] }),
  withComputed(({ items }) => ({
    total: computed(() =>
      items().reduce((sum, item) => sum + item.price * item.quantity, 0),
    ),
  })),
  withMethods(store => ({
    add(item: CartItem) {
      patchState(store, state => ({ items: [...state.items, item] }));
    },
  })),
);
```

Use `withEntities()` when managing collections of entities. Keep state logic out of components; delegate it to a Signal Store or service. Avoid `BehaviorSubject` for application state—use RxJS only where complex event streams are genuinely needed.
