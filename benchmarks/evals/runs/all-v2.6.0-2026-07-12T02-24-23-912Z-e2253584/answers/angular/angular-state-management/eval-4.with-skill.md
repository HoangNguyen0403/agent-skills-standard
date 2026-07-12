# Structuring cart.store.ts

Keep the cart's source state small and explicit, derive totals with computed(), and expose mutations as store methods. A simple cart can use an array in withState(); use withEntities() when the feature grows into a normalized entity collection.

~~~ts
import { computed } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

export interface CartLine {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

type CartState = {
  lines: CartLine[];
};

const initialState: CartState = { lines: [] };

export const CartStore = signalStore(
  { providedIn: 'root' },
  withState<CartState>(initialState),
  withComputed(({ lines }) => ({
    itemCount: computed(() =>
      lines().reduce((count, line) => count + line.quantity, 0),
    ),
    subtotalCents: computed(() =>
      lines().reduce(
        (total, line) => total + line.unitPriceCents * line.quantity,
        0,
      ),
    ),
    isEmpty: computed(() => lines().length === 0),
  })),
  withMethods(store => ({
    add(line: CartLine): void {
      if (line.quantity <= 0) return;

      patchState(store, state => {
        const existing = state.lines.find(
          current => current.productId === line.productId,
        );

        return {
          lines: existing
            ? state.lines.map(current =>
                current.productId === line.productId
                  ? { ...current, quantity: current.quantity + line.quantity }
                  : current,
              )
            : [...state.lines, { ...line }],
        };
      });
    },

    setQuantity(productId: string, quantity: number): void {
      const nextQuantity = Math.max(0, Math.floor(quantity));
      patchState(store, state => ({
        lines:
          nextQuantity === 0
            ? state.lines.filter(line => line.productId !== productId)
            : state.lines.map(line =>
                line.productId === productId
                  ? { ...line, quantity: nextQuantity }
                  : line,
              ),
      }));
    },

    remove(productId: string): void {
      patchState(store, state => ({
        lines: state.lines.filter(line => line.productId !== productId),
      }));
    },

    clear(): void {
      patchState(store, { lines: [] });
    },
  })),
);
~~~

A component can render cart.lines(), cart.itemCount(), and cart.subtotalCents() and call cart.add(), cart.setQuantity(), or cart.remove(). It should not contain the merge, quantity, or total logic. Store prices as integer cents (or another exact money representation) rather than relying on floating-point currency arithmetic. If the cart later needs loading/error status, coupons, or checkout state, add those as explicit state fields and keep their transitions in methods as well.


