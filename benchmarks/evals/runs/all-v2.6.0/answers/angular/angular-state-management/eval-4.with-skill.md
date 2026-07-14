Assuming `cart.store.ts` owns cart state, use Angular Signals; use `@ngrx/signals` for a feature with multiple operations:

```ts
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  coupon: string | null;
};

export const CartStore = signalStore(
  { providedIn: 'root' },

  withState<CartState>({
    items: [],
    coupon: null,
  }),

  withComputed(({ items }) => ({
    subtotal: () =>
      items().reduce((total, item) => total + item.price * item.quantity, 0),
    itemCount: () =>
      items().reduce((count, item) => count + item.quantity, 0),
    isEmpty: () => items().length === 0,
  })),

  withMethods((store) => ({
    addItem(item: CartItem) {
      patchState(store, (state) => {
        const existing = state.items.find(
          (current) => current.productId === item.productId,
        );

        return {
          items: existing
            ? state.items.map((current) =>
                current.productId === item.productId
                  ? { ...current, quantity: current.quantity + item.quantity }
                  : current,
              )
            : [...state.items, item],
        };
      });
    },

    removeItem(productId: string) {
      patchState(store, (state) => ({
        items: state.items.filter((item) => item.productId !== productId),
      }));
    },

    setQuantity(productId: string, quantity: number) {
      patchState(store, (state) => ({
        items: state.items
          .map((item) =>
            item.productId === productId ? { ...item, quantity } : item,
          )
          .filter((item) => item.quantity > 0),
      }));
    },

    clear() {
      patchState(store, { items: [], coupon: null });
    },
  })),
);
```

Keep writable state private when using a service-based store and expose it publicly via `asReadonly()`. Derive totals, filtered lists, and other pure values with `computed()`.

Use `linkedSignal(() => source())` for dependent writable state that resets when source changes. Use `untracked()` only when a `computed()` or `effect()` must read a signal without creating a dependency.

Use `effect()` only for side effects such as localStorage synchronization or logging. Never update signals inside effect(). Treat signal values as immutable and update them with `.set()` or `.update(value => ...)`.

Keep state logic out of components, avoid `BehaviorSubject` for state, and use `withEntities()` if the cart grows into a larger entity collection.
