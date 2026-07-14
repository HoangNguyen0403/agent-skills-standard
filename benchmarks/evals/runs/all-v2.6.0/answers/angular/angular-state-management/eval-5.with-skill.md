Keep the writable signal private, then expose its readonly view:

```ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CounterService {
  private readonly countState = signal(0);

  readonly count = this.countState.asReadonly();

  increment(): void {
    this.countState.update(value => value + 1);
  }

  reset(): void {
    this.countState.set(0);
  }
}
```

Consume it in a component:

```ts
@Component({
  template: `
    <p>{{ counter.count() }}</p>
    <button (click)="counter.increment()">Increment</button>
  `,
})
export class CounterComponent {
  constructor(public readonly counter: CounterService) {}
}
```

`count()` can be read publicly, but callers cannot call `.set()` or `.update()` on it. Only the service changes the internal state. Avoid updating signals inside `effect()`; use effects only for side effects.
