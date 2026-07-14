# Setting up `OnPush` change detection

Set the component's `changeDetection` metadata to `ChangeDetectionStrategy.OnPush`:

```ts
import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>Count: {{ count() }}</p>
    <button type="button" (click)="increment()">Increment</button>
  `,
})
export class CounterComponent {
  count = signal(0);

  increment(): void {
    this.count.update(value => value + 1);
  }
}
```

With `OnPush`, Angular checks the component when an input receives a new value/reference, an event handled in the component or its view occurs, an observable used by `async` emits, or a signal read by the template changes. It may also be checked when an ancestor explicitly marks it or during an application-wide change-detection pass. Signals are therefore a convenient way to update local state while retaining `OnPush`.

The most important rule is to update inputs immutably. Mutating a property on an object and passing the same reference does not change an `OnPush` input:

```ts
// Bad: same object reference.
this.user.name = 'New name';

// Good: new reference.
this.user = { ...this.user, name: 'New name' };
```

Prefer signals, immutable state, and the `async` pipe over manual subscriptions. If a value changes through an API that Angular cannot observe, inject `ChangeDetectorRef` and call `markForCheck()` after updating state:

```ts
constructor(private readonly cdr: ChangeDetectorRef) {}

refreshFromExternalCallback(value: string): void {
  this.status = value;
  this.cdr.markForCheck();
}
```

`markForCheck()` schedules the component to be checked in the next normal pass. `detectChanges()` runs a local check immediately and should be reserved for cases that truly require it. `OnPush` is a rendering optimization and a state-management contract, not a replacement for correct cleanup, immutable updates, or explicit handling of external callbacks.

