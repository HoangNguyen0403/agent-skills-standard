Use Angular’s `@defer` block around the heavy component. Angular automatically places deferred dependencies in a separate lazy-loaded chunk.

```html
<!-- dashboard.component.html -->
@defer (on viewport) {
  <app-heavy-chart />
} @placeholder {
  <app-spinner />
}
```

Common trigger options:

```html
@defer (on interaction) {
  <app-heavy-editor />
} @placeholder {
  <p>Click to load the editor.</p>
}
```

```html
@defer (on idle) {
  <app-heavy-report />
} @placeholder {
  <app-spinner />
}
```

```html
@defer (when showDetails()) {
  <app-heavy-details />
} @placeholder {
  <p>Loading details…</p>
}
```

For best performance, make the components `ChangeDetectionStrategy.OnPush` and use Signals for state:

```ts
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  readonly showDetails = signal(false);
}
```

If derived state is needed, use a `computed()` signal; it caches until dependencies change. Avoid template calls such as `{{ calculate() }}`, which re-evaluates on every change detection cycle.
