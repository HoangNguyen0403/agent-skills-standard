In Angular 17+, wrap the heavy component in a `@defer` block:

```html
@defer (on viewport) {
  <app-heavy-chart />
} @placeholder {
  <p>Chart will load when visible.</p>
} @loading {
  <app-spinner />
} @error {
  <p>Unable to load the chart.</p>
}
```

Angular splits the deferred component and its dependencies into a separate chunk, loading it only when the trigger fires.

Common triggers:

```html
@defer (on idle) { <app-heavy-chart /> }
@defer (on interaction) { <app-heavy-chart /> }
@defer (on hover) { <app-heavy-chart /> }
@defer (when isChartEnabled) { <app-heavy-chart /> }
```

You can also prefetch before rendering:

```html
@defer (on interaction; prefetch on idle) {
  <app-heavy-chart />
}
```

Ensure the heavy component is standalone and is not imported or referenced elsewhere in a way that causes it to load eagerly.
