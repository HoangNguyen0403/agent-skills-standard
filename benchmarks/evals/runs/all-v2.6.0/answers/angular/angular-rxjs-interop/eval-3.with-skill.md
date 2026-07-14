# Applying RxJS operators to a Signal

Convert the signal to an Observable with `toObservable`, apply the RxJS pipeline, and convert the result back to a signal when the result is rendered by the template:

```typescript
import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { SearchService } from './search.service';

@Component({
  selector: 'app-search',
  template: `
    <input [value]="query()" (input)="query.set($any($event.target).value)" />
    @for (item of results(); track item.id) {
      <p>{{ item.name }}</p>
    }
  `,
})
export class SearchComponent {
  private readonly searchService = inject(SearchService);

  readonly query = signal('');
  readonly results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) => this.searchService.search(query)),
    ),
    { initialValue: [] },
  );
}
```

`toObservable(this.query)` emits whenever the signal changes, allowing operators such as `debounceTime`, `distinctUntilChanged`, and `switchMap`. `switchMap` is useful for searches because a newer query replaces an older in-flight request. If another RxJS consumer needs the stream itself, keep the pipeline as an Observable (`results$`) rather than wrapping it in `toSignal`.

Create the interop functions in an injection context, such as the component field initializers above. `toSignal` also manages subscription cleanup when the component is destroyed.

