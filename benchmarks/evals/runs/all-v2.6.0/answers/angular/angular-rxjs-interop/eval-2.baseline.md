# Using `toSignal` with an HTTP response

`HttpClient` methods return cold Observables. Convert the request once in the component or service with `toSignal`:

```ts
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';

interface Product {
  id: number;
  name: string;
}

@Component({
  selector: 'app-products',
  template: `
    @if (products(); as items) {
      @for (product of items; track product.id) {
        <p>{{ product.name }}</p>
      }
    }
  `,
})
export class ProductsComponent {
  private readonly http = inject(HttpClient);

  readonly products = toSignal(
    this.http.get<Product[]>('/api/products'),
    { initialValue: [] },
  );
}
```

Creating the Signal subscribes to the HTTP Observable, which starts the request. The Signal initially contains `[]` and is replaced with the response when the request succeeds. It is automatically unsubscribed when the component is destroyed; for a normal one-shot HTTP request, the HTTP Observable also completes after its response.

If `undefined` or `null` is a more meaningful loading state, use that as the initial value and model the type accordingly:

```ts
readonly product = toSignal(
  this.http.get<Product>('/api/products/42'),
  { initialValue: null },
);
```

An HTTP error is not silently converted into an empty value: reading the Signal after the Observable errors throws that error. Handle errors in the stream when the UI needs an explicit fallback:

```ts
readonly products = toSignal(
  this.http.get<Product[]>('/api/products').pipe(
    catchError(() => of([])),
  ),
  { initialValue: [] },
);
```

Import `catchError` and `of` from `rxjs`. Keep the `toSignal` call in a field or setup method, rather than recreating it during change detection. Each separate `toSignal(http.get(...))` call creates another subscription and can issue another request; share the converted Signal or share the source when multiple consumers need the same response.


