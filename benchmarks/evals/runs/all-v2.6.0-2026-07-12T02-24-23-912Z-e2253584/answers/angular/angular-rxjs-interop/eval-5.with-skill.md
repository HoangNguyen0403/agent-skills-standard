# Using `takeUntilDestroyed`

Import `takeUntilDestroyed` from `@angular/core/rxjs-interop` and place it in the Observable pipeline before subscribing:

```typescript
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClockService } from './clock.service';

@Component({
  selector: 'app-clock',
  template: `{{ latestTime }}`,
})
export class ClockComponent {
  private readonly destroyRef = inject(DestroyRef);
  latestTime = '';

  constructor(private readonly clock: ClockService) {
    this.clock.time$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((time) => {
        this.latestTime = time;
      });
  }
}
```

The injected `DestroyRef` ties the subscription to this component's lifecycle. If the operator is used directly in a constructor or field initializer, Angular can infer the injection context and you can write `.pipe(takeUntilDestroyed())`. Pass the `DestroyRef` explicitly from `ngOnInit`, a helper, or any function that is not itself running in an injection context.

Use this for manual subscriptions to long-lived streams. For template data, `toSignal(observable$, { initialValue: ... })` is usually simpler and already performs the corresponding cleanup. Avoid using one global destroy `Subject`; lifecycle cleanup should be scoped to the individual Angular instance.

