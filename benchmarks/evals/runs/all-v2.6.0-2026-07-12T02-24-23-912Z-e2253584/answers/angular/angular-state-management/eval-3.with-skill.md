# Using linkedSignal() for dependent state

Use linkedSignal() for writable state whose default value is derived from another signal and should reset when that source changes. This is useful for a user selection that depends on the currently available options.

~~~ts
import { Injectable, linkedSignal, signal } from '@angular/core';

type Product = {
  id: string;
  name: string;
};

@Injectable({ providedIn: 'root' })
export class ProductPickerState {
  private readonly _products = signal<Product[]>([]);
  readonly products = this._products.asReadonly();

  // The first available product is the default selection.
  // It is still writable when the user chooses another product.
  private readonly _selectedProduct = linkedSignal(
    () => this.products()[0] ?? null,
  );
  readonly selectedProduct = this._selectedProduct.asReadonly();

  replaceProducts(products: Product[]): void {
    this._products.set(products);
  }

  selectProduct(product: Product | null): void {
    this._selectedProduct.set(product);
  }
}
~~~

When products changes, selectedProduct is recalculated from the new source and becomes the first product, or null when the list is empty. Between source changes, a call to selectProduct() can set a different value.

Choose the primitive based on the ownership of the value:

- Use computed() when the value is always derived and must not be written independently.
- Use linkedSignal() when the value has a source-derived default but the user or another command may override it.
- Use a normal signal() when the value should not reset when the source changes.

The source should be updated immutably. If the dependent value needs to remain selected only while it is still valid, make that validity rule explicit in a store method or use the more advanced linkedSignal source/computation form; do not add an effect() merely to reset another signal, because effects should be reserved for external side effects and should not update application state.

