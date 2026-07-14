Assuming a modern Angular app:

- Use `ChangeDetectionStrategy.OnPush` on every component. Components then update primarily when Inputs change or Signals for state change.

```ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (item of items(); track item.id) {
      <app-row [item]="item" />
    }
  `
})
export class ListComponent {
  items = signal<Item[]>([]);
}
```

Use a stable unique identifier with `@for (item of items; track item.id)`. The `track` expression replaces `trackBy` and prevents unnecessary DOM destruction and recreation.

- Keep derived values in `computed()` signals or pure pipes:

```ts
total = computed(() =>
  this.items().reduce((sum, item) => sum + item.price, 0)
);
```

Avoid `{{ calculate() }}` in templates: it re-evaluates on every change detection cycle. A `computed()` signal caches until dependencies change.

- Defer heavy, below-the-fold components:

```html
@defer (on viewport) {
  <app-heavy-chart />
} @placeholder {
  <Spinner />
}
```

Also consider `on interaction`, `on idle`, or `when condition`. `@defer` automatically creates a separate lazy-loaded chunk.

- Optimize images with `NgOptimizedImage`:

```ts
imports: [NgOptimizedImage]
```

```html
<img
  ngSrc="/hero.jpg"
  width="800"
  height="600"
  priority
  alt="Hero"
/>
```

This enables lazy loading, responsive `srcset`, and preconnect hints. Use `priority` for LCP images.

- Prepare for zoneless Angular by using Signals for all reactive state and avoiding `Zone.runOutsideAngular` hacks. Where appropriate, opt into:

```ts
provideExperimentalZonelessChangeDetection()
```

- Initialize state in `ngOnInit` or signal effects rather than putting logic in constructors.
