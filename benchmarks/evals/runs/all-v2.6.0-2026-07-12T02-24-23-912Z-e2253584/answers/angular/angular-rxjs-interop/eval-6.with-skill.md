# Debouncing a Signal value change

Signals do not provide RxJS operators directly. Convert the signal to an Observable, debounce that stream, and convert the result back to a signal when the result is used by the template:

```typescript
import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  of,
  switchMap,
} from 'rxjs';

@Component({
  selector: 'app-product-search',
  template: `
    <input
      [value]="query()"
      (input)="query.set($any($event.target).value)"
      placeholder="Search products"
    />
    @for (product of products(); track product.id) {
      <p>{{ product.name }}</p>
    }
  `,
})
export class ProductSearchComponent {
  private readonly api = inject(ProductApi);

  readonly query = signal('');
  readonly products = toSignal(
    toObservable(this.query).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter((query) => query.trim().length > 0),
      switchMap((query) => this.api.search(query.trim())),
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );
}
```

The API is called only after 300 ms without a new query. `distinctUntilChanged` skips identical consecutive values, and `switchMap` drops stale results when a newer search starts. `initialValue: []` makes `products()` safe before the first response; `catchError` prevents one failed request from terminating the displayed stream.

Both conversions are created in the component's injection context, and `toSignal` automatically cleans up the underlying subscription when the component is destroyed.

