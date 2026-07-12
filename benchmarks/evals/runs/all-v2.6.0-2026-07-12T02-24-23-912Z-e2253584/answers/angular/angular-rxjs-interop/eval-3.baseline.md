# Applying RxJS operators to a Signal with `toObservable`

Convert the Signal to an Observable with `toObservable` from `@angular/core/rxjs-interop`, then use the normal RxJS pipeline:

```ts
import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { SearchApi } from './search-api';

@Component({
  selector: 'app-search',
  template: `
    <input
      [value]="query()"
      (input)="query.set($any($event.target).value)"
    />
    @for (item of results(); track item.id) {
      <div>{{ item.name }}</div>
    }
  `,
})
export class SearchComponent {
  private readonly api = inject(SearchApi);

  readonly query = signal('');

  readonly results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) =>
        query.trim() === ''
          ? of([])
          : this.api.search(query),
      ),
    ),
    { initialValue: [] },
  );
}
```

`toObservable` emits the Signal's current value when subscribed and emits later changes. Signal changes are observed asynchronously after Angular's stabilization, and multiple synchronous writes may be coalesced, so it should not be treated as a synchronous `valueChanges` replacement. Operators such as `debounceTime`, `distinctUntilChanged`, `filter`, `map`, and `switchMap` can then be used normally.

The conversion requires an Angular injection context by default and is automatically cleaned up with that context. If the Observable is consumed directly, use the `async` pipe or `takeUntilDestroyed` for its subscription. In the example, `toSignal` owns the subscription and also gives the template a Signal. `switchMap` is useful for search requests because a newer query unsubscribes the previous request; use a different flattening operator when cancellation is not desired.


