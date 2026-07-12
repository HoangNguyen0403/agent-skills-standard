# Improving Angular change-detection performance

Start by measuring before optimizing. Angular DevTools can show which components are checked, while the browser Performance panel can reveal long tasks, excessive scripting, and layout work. The goal is to reduce unnecessary checks and make each required check inexpensive.

## Use `OnPush` deliberately

For component trees that use inputs and events in a predictable way, prefer `ChangeDetectionStrategy.OnPush`:

```ts
@Component({
  selector: 'user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ user().name }}`,
})
export class UserCard {
  readonly user = input.required<User>();
}
```

An `OnPush` component is still checked when an input receives a new reference, a template event runs, a signal read by the template changes, or an observable is consumed with `AsyncPipe`. It is not a license to mutate an input object in place. Replace arrays and objects when their contents change, or use signals and update them through `set`/`update`.

## Make template evaluation cheap

- Keep expensive filtering, sorting, formatting, and aggregation out of the template. Compute them in component code, a `computed` signal, or a pure pipe.
- Avoid creating a new array, object, or callback during every check unless it is required. A new reference can also cause child inputs to look changed.
- Use stable keys with `@for` (`track item.id`) so Angular can reuse existing DOM nodes.
- Use `AsyncPipe` or signals for observable state rather than manually subscribing and forgetting to notify the view.
- Keep high-frequency work, such as pointer-move or scroll processing, outside the UI update path and throttle it before updating displayed state.

Example of a derived signal:

```ts
readonly query = signal('');
readonly products = signal<Product[]>([]);

readonly visibleProducts = computed(() => {
  const query = this.query().trim().toLowerCase();
  return this.products().filter(product =>
    product.name.toLowerCase().includes(query),
  );
});
```

```html
@for (product of visibleProducts(); track product.id) {
  <product-row [product]="product" />
}
```

## Handle special cases carefully

For a very large, independently updated widget, `ChangeDetectorRef.detach()` can prevent it from participating in normal checks; update it on a controlled schedule and call `detectChanges()` when appropriate. This is an advanced escape hatch, not a general replacement for `OnPush`.

Lazy-load routes and heavy features so their component trees are not created until needed. Also use virtual scrolling for large lists; reducing the number of DOM nodes often matters more than optimizing change detection itself.

Finally, check for accidental global work: timers, subscriptions, broad event listeners, and third-party libraries can trigger frequent application updates. Unsubscribe or use `takeUntilDestroyed`, coalesce/throttle noisy streams, and verify the result with profiling rather than relying on a micro-optimization.

