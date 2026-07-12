# Preparing Angular for zoneless rendering

Make signals the source of truth for reactive state, use `OnPush` components, and opt into zoneless change detection at the application bootstrap:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [provideExperimentalZonelessChangeDetection()],
});
```

Then update UI state through signals rather than relying on Zone.js to notice arbitrary asynchronous work:

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>{{ count() }}</p>
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

Avoid `NgZone.runOutsideAngular` hacks whose purpose is to control rendering. They are tied to Zone.js behavior and do not replace an explicit reactive state update. Convert asynchronous results into signal writes (and use computed signals for derived values); use effects for external side effects rather than for ordinary derived state. Keep component inputs immutable and provide stable `@for` tracking keys. This makes the notifications that should render explicit and leaves the application ready for zoneless execution.

