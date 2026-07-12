# Improving Angular change-detection performance

Use `ChangeDetectionStrategy.OnPush` for every component, keep reactive state in signals, and make template expressions cheap and predictable:

```ts
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

@Component({
  selector: 'app-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>{{ visibleResults().length }} results</p>
    @for (result of visibleResults(); track result.id) {
      <article>{{ result.title }}</article>
    }
  `,
})
export class ResultsComponent {
  readonly results = signal<Result[]>([]);
  readonly query = signal('');

  readonly visibleResults = computed(() => {
    const normalizedQuery = this.query().trim().toLowerCase();
    return this.results().filter((result) =>
      result.title.toLowerCase().includes(normalizedQuery),
    );
  });
}
```

`OnPush` limits checks to meaningful notifications such as changed inputs and signals read by the component. Update signal state with `set` or `update`, and treat input data immutably so input references change when the data changes. For loops, use a stable unique key such as `track result.id`; this lets Angular reuse existing DOM nodes instead of recreating them.

Do not call calculation methods from interpolation or property bindings, for example `{{ calculateTotal() }}`. Such calls can run on every change-detection cycle. Put derived values in a `computed()` signal or a pure pipe, which can reuse the result until its dependencies change.

For below-the-fold heavy UI, use `@defer` to split it into a lazy-loaded chunk. For new applications, also prepare for zoneless rendering by using signals for reactive state and opting into `provideExperimentalZonelessChangeDetection()` rather than relying on `NgZone.runOutsideAngular` workarounds. Profile before and after with Angular DevTools or browser performance traces so that optimizations target actual checks and rendering work.

---

`Result` represents the application’s result type and must expose a stable `id` and `title`.

