Prepare Angular for zoneless rendering by making components signal-driven and opting into zoneless change detection:

```ts
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection(),
  ],
});
```

Use `ChangeDetectionStrategy.OnPush` everywhere:

```ts
@Component({
  selector: 'app-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button (click)="increment()">Count: {{ count() }}</button>
  `,
})
export class CounterComponent {
  readonly count = signal(0);

  increment(): void {
    this.count.update(value => value + 1);
  }
}
```

Guidelines:

- Use Signals for state instead of manually triggering change detection.
- Avoid `Zone.runOutsideAngular` hacks; zoneless rendering does not rely on them.
- Replace template function calls such as `{{ calculate() }}` with a `computed()` signal. Function calls re-evaluate on every change detection; a `computed()` signal caches until dependencies change.
- Use stable tracking in loops:

  ```html
  @for (item of items(); track item.id) {
    <app-item [item]="item" />
  }
  ```

  The `track` expression replaces `trackBy` and should use a stable unique identifier.
- Keep heavy below-the-fold UI in `@defer (on viewport)` blocks, with `@placeholder` loading content where appropriate.
- Use `NgOptimizedImage` with `ngSrc`, explicit dimensions, and a `priority` attribute for LCP images; this enables responsive `srcset` and lazy loading.
