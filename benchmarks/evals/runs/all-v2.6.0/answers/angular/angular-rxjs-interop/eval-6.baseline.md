# Debouncing changes to a Signal

Signals do not have an RxJS operator pipeline. Convert the Signal to an Observable, apply `debounceTime`, and optionally convert the result back to a Signal:

```ts
import { Component, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-filter',
  template: `
    <input
      [value]="filter()"
      (input)="filter.set($any($event.target).value)"
    />
    <p>Debounced filter: {{ debouncedFilter() }}</p>
  `,
})
export class FilterComponent {
  readonly filter = signal('');

  readonly debouncedFilter = toSignal(
    toObservable(this.filter).pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );
}
```

The source Signal changes immediately, while `debouncedFilter` updates only after 300 ms without another change. `distinctUntilChanged` is optional but prevents duplicate consecutive values from continuing through the pipeline.

For a debounced search, put the request in the same Observable pipeline and use `switchMap` so stale requests are canceled:

```ts
readonly results = toSignal(
  toObservable(this.filter).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((term) => term.trim() ? this.api.search(term) : of([])),
  ),
  { initialValue: [] },
);
```

Import `switchMap` and `of` from `rxjs`. Create these conversions once in an Angular injection context, not inside a template or event handler. `toObservable` and `toSignal` then manage their effects and subscriptions with the component lifecycle. If the debounced stream is only used for a side effect rather than template state, subscribe to it with `takeUntilDestroyed()` instead of manually leaving a long-lived subscription.


