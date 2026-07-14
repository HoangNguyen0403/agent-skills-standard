Assuming a recent Angular version with Signals support:

```bash
npm install @ngrx/signals
```

Create a feature store instead of putting state logic in components:

```ts
// cart.store.ts
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { computed } from '@angular/core';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
};

const initialState: CartState = {
  items: [],
};

export const CartStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed(({ items }) => ({
    total: computed(() =>
      items().reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
    ),

    itemCount: computed(() =>
      items().reduce((count, item) => count + item.quantity, 0),
    ),
  })),

  withMethods((store) => ({
    addItem(item: CartItem) {
      patchState(store, ({ items }) => ({
        items: [...items, item],
      }));
    },

    clear() {
      patchState(store, { items: [] });
    },
  })),
);
```

Use the store from a component:

```ts
import { Component, inject } from '@angular/core';
import { CartStore } from './cart.store';

@Component({
  selector: 'app-cart',
  template: `
    <p>Items: {{ cart.itemCount() }}</p>
    <p>Total: {{ cart.total() }}</p>

    @for (item of cart.items(); track item.id) {
      <div>{{ item.name }} — {{ item.price }}</div>
    }

    <button (click)="cart.clear()">Clear</button>
  `,
})
export class CartComponent {
  readonly cart = inject(CartStore);
}
```

Use `computed()` for pure, cached derived state such as totals and filtered lists. Use `linkedSignal(() => source())` for dependent writable state that resets when the source changes:

```ts
const selectedId = linkedSignal(() => products()[0]?.id ?? null);
```

Use `untracked()` when reading a signal inside `computed()` or `effect()` without creating a dependency.

Use `effect()` only for side effects such as logging or local-storage synchronization:

```ts
effect(() => {
  localStorage.setItem('cart', JSON.stringify(this.cart.items()));
});
```

Never update signals inside `effect()`; that can create circular dependencies. Treat signal values as immutable and update them with `.set()`, `.update()`, or `patchState()`.

For larger features, compose `signalStore` with `withState`, `withComputed`, `withMethods`, and `withEntities()`. For a simple service instead, keep internal signals private and expose them with `asReadonly()`:

```ts
private readonly _count = signal(0);
readonly count = this._count.asReadonly();
```

Avoid `BehaviorSubject` for application state and keep state logic out of components.
