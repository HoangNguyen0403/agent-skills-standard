# Lazy-loading a heavy component with `@defer`

`@defer` creates a deferrable view. Angular places the component and its standalone dependencies in a separate chunk and loads that chunk when the selected trigger occurs. The deferred dependencies must not also be referenced eagerly elsewhere in the same application path, or they may be included in the initial bundle.

For example, load an analytics panel only when the user opens it:

```ts
// analytics-panel.component.ts
@Component({
  selector: 'analytics-panel',
  standalone: true,
  templateUrl: './analytics-panel.html',
})
export class AnalyticsPanel {}
```

```html
<button #analyticsButton type="button" aria-controls="analytics-panel">
  Show analytics
</button>

@defer (on interaction(analyticsButton)) {
  <analytics-panel id="analytics-panel" />
} @placeholder {
  <p>Analytics are available on demand.</p>
} @loading (after 100ms; minimum 500ms) {
  <p aria-live="polite">Loading analytics…</p>
} @error {
  <p role="alert">Analytics could not be loaded.</p>
}
```

Other useful triggers include `on idle`, `on viewport`, `on hover`, and `when condition`. A viewport example is suitable for content below the fold:

```html
@defer (on viewport; prefetch on idle) {
  <recommendations-panel />
} @placeholder {
  <div style="min-height: 240px">Recommendations will appear here.</div>
}
```

The placeholder should reserve approximately the final layout size to avoid layout shift. Use a loading block for a meaningful delay, and an error block for failed dynamic imports. `prefetch on idle` can download the chunk early while still waiting to instantiate the component until the real trigger fires.

Use `on interaction` for user-requested content, `on viewport` for below-the-fold content, and `on idle` for non-critical content that can load after the initial work. Do not defer content required for the initial layout or the page's primary interaction; it can make the experience feel slower. Confirm the result in a production build by inspecting the generated chunks and the network waterfall. Server-side rendering can render the placeholder, while the deferred content is loaded and activated on the client according to its trigger, so test the SSR/hydration behavior for the chosen trigger.

