Assuming Angular with `@ngrx/signals`, keep only canonical cart data in state and derive totals:

```ts
type CartItem = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error: string | null;
};
```

```ts
export const CartStore = signalStore(
  { providedIn: 'root' },

  withState<CartState>({
    items: [],
    status: 'idle',
    error: null,
  }),

  withComputed(({ items }) => ({
    itemCount: computed(() =>
      items().reduce((count, item) => count + item.quantity, 0),
    ),

    subtotal: computed(() =>
      items().reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0,
      ),
    ),

    isEmpty: computed(() => items().length === 0),
  })),

  withMethods((store) => ({
    addItem(item: CartItem) {
      patchState(store, (state) => {
        const existing = state.items.find(
          (entry) => entry.productId === item.productId,
        );

        return {
          items: existing
            ? state.items.map((entry) =>
                entry.productId === item.productId
                  ? { ...entry, quantity: entry.quantity + item.quantity }
                  : entry,
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
        items:
          quantity > 0
            ? state.items.map((item) =>
                item.productId === productId ? { ...item, quantity } : item,
              )
            : state.items.filter((item) => item.productId !== productId),
      }));
    },

    clear() {
      patchState(store, { items: [] });
    },
  })),
);
```

Do not store `subtotal`, `itemCount`, or `isEmpty` directly; derive them from `items` to avoid inconsistent state. Keep API loading/error state separate from cart data.
