# Lazy-loading a heavy component with `@defer`

Put the heavy component inside a deferrable block and choose a trigger that matches when it is needed. For a chart below the fold, `on viewport` is a good default:

```html
@defer (on viewport) {
  <app-heavy-chart [data]="data()" />
} @loading (minimum 500ms) {
  <app-spinner />
} @placeholder {
  <div class="chart-placeholder">Chart will appear here</div>
} @error {
  <p>Unable to load the chart.</p>
}
```

Angular turns the deferred dependencies into a separate lazy-loaded chunk. The browser downloads and renders that chunk when the placeholder enters the viewport, so the initial page does not pay the cost of the chart. Keep the heavy component’s dependencies referenced only by the deferred block; importing or rendering them eagerly elsewhere can defeat the intended split.

Other useful triggers are:

- `on interaction` when the user must click or interact before the component is useful.
- `on idle` when it can load after the initial page becomes idle.
- `on hover` for hover-driven previews.
- `when condition` for an application condition, such as an expanded panel.
- `on immediate` when it should be split into a non-blocking chunk but loaded immediately.

Use `@placeholder` for the initial reserved space, `@loading` for the fetch/load interval, and `@error` for a failed deferred import. Keep the placeholder’s dimensions close to the final component’s dimensions to reduce layout shift.

