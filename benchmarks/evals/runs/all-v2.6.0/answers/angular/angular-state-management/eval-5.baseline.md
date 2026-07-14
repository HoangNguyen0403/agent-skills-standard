Use a writable signal privately, then expose its readonly view:

```ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CounterService {
  private readonly countSignal = signal(0);

  readonly count = this.countSignal.asReadonly();

  increment(): void {
    this.countSignal.update(value => value + 1);
  }
}
```

Consume it from a component:

```ts
export class CounterComponent {
  readonly count = this.counterService.count;

  constructor(private readonly counterService: CounterService) {}

  increment(): void {
    this.counterService.increment();
  }
}
```

In the template:

```html
<p>{{ count() }}</p>
<button (click)="increment()">Increment</button>
```

`asReadonly()` exposes the signal for reading while preventing consumers from calling `.set()` or `.update()`. The service retains control of mutations.
