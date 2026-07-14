# Setting up OnPush change detection

Set `changeDetection: ChangeDetectionStrategy.OnPush` in every component decorator. OnPush limits checks to relevant changes, including signal updates read by the template, changed input references, and events handled by the component.

```ts
import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>Count: {{ count() }}</p>
    <button type="button" (click)="increment()">Increment</button>
  `,
})
export class CounterComponent {
  readonly count = signal(0);

  increment(): void {
    this.count.update((value) => value + 1);
  }
}
```

Use signals for local state, `computed()` for derived state, and `input()`/`output()` for component boundaries. Treat input arrays and objects immutably: replace the reference instead of mutating an existing object in place, so an OnPush child can observe the change. Prefer signal updates, observable-to-signal conversion, or the `async` pipe over manually forcing change detection. Do not use the default change-detection strategy as a workaround.

