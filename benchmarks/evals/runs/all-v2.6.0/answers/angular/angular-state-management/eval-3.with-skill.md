Use `linkedSignal()` for writable state whose default value depends on another signal and should reset when the source changes.

```ts
import { Injectable, linkedSignal, signal } from '@angular/core';

@Injectable()
export class ProductState {
  private readonly products = signal([
    { id: 1, name: 'Keyboard' },
    { id: 2, name: 'Mouse' },
  ]);

  readonly selectedProduct = linkedSignal(
    () => this.products()[0] ?? null
  );

  setProducts(products: { id: number; name: string }[]): void {
    this.products.set(products);
  }
}
```

You can still override the dependent value:

```ts
state.selectedProduct.set({ id: 2, name: 'Mouse' });
```

When `products` changes, `selectedProduct` resets to the first product:

```ts
state.setProducts([
  { id: 3, name: 'Monitor' },
]);
// selectedProduct() is now the Monitor
```

For preserving the previous selection when it remains valid:

```ts
readonly selectedProduct = linkedSignal({
  source: this.products,
  computation: (products, previous) =>
    products.find(p => p.id === previous?.value?.id) ?? products[0] ?? null,
});
```

Use `computed()` for read-only derived state. Do not implement this with `effect()`—**Never update signals inside effect()**.
