# Structuring `cart.store.ts`

Make the cart store the owner of cart invariants and transitions. Keep the writable state private, expose read-only signals and derived totals, and provide intention-revealing methods such as `addItem`, `removeItem`, and `setQuantity`. Components should not edit cart lines directly.

For a small application, a signal-based injectable service is enough:

```ts
import { Injectable, computed, signal } from '@angular/core';

export interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CartState = {
  lines: [],
  isLoading: false,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _state = signal<CartState>(initialState);

  readonly lines = computed(() => this._state().lines);
  readonly isLoading = computed(() => this._state().isLoading);
  readonly error = computed(() => this._state().error);

  readonly itemCount = computed(() =>
    this.lines().reduce((count, line) => count + line.quantity, 0),
  );

  readonly subtotal = computed(() =>
    this.lines().reduce(
      (total, line) => total + line.unitPrice * line.quantity,
      0,
    ),
  );

  readonly isEmpty = computed(() => this.lines().length === 0);

  addItem(product: Omit<CartLine, 'quantity'>, quantity = 1): void {
    if (quantity <= 0) return;

    this._state.update(state => {
      const existing = state.lines.find(line => line.productId === product.productId);

      return {
        ...state,
        lines: existing
          ? state.lines.map(line =>
              line.productId === product.productId
                ? { ...line, quantity: line.quantity + quantity }
                : line,
            )
          : [...state.lines, { ...product, quantity }],
        error: null,
      };
    });
  }

  setQuantity(productId: string, quantity: number): void {
    this._state.update(state => ({
      ...state,
      lines: quantity <= 0
        ? state.lines.filter(line => line.productId !== productId)
        : state.lines.map(line =>
            line.productId === productId ? { ...line, quantity } : line,
          ),
    }));
  }

  removeItem(productId: string): void {
    this.setQuantity(productId, 0);
  }

  clear(): void {
    this._state.update(state => ({ ...state, lines: [] }));
  }
}
```

The state shape should contain source data and operational status, not values that can be derived. `itemCount`, `subtotal`, and `isEmpty` are therefore `computed()` values rather than duplicated fields that could become inconsistent. Decide where prices are authoritative: if the server owns pricing, revalidate the cart before checkout instead of trusting a client-only total.

If the cart has many entities or needs action history, devtools, effects, or normalized collections, use NgRx Store or NgRx Signal Store and keep the same boundaries: immutable updates, explicit transitions, derived selectors, and a clear data-access layer for persistence. Choose `providedIn: 'root'` for one cart across the application, or provide the store at a route/component level when each feature needs an independent cart.

