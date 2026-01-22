# Defer Usage

## Basic Syntax

Lazy load `app-heavy-chart` when it enters the viewport.

```html
@defer (on viewport) {
<app-heavy-chart [data]="data()" />
} @loading (minimum 500ms) {
<app-spinner />
} @placeholder {
<div>Chart will appear here</div>
} @error {
<p>Failed to load chart</p>
}
```

## Triggers

- `on viewport`: When element enters screen.
- `on idle`: When browser is idle (default).
- `on interaction`: When user clicks/interacts with placeholder.
- `on hover`: When user hovers placeholder.
- `on immediate`: Immediately (non-blocking).
- `when condition`: When a boolean expression is true.
