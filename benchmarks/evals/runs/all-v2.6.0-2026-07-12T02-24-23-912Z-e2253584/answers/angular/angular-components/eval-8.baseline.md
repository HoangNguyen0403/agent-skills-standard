# Computed signals versus functions in templates

Use a `computed` signal for a derived value that depends on other signals and has no parameters:

```ts
readonly query = signal('');
readonly products = signal<Product[]>([]);

readonly matchingProducts = computed(() => {
  const normalizedQuery = this.query().trim().toLowerCase();
  return this.products().filter(product =>
    product.name.toLowerCase().includes(normalizedQuery),
  );
});
```

Read it in the template as `matchingProducts()`. A computed signal is lazy and memoized: it runs when read, tracks the signals it reads, and is invalidated when those dependencies change. This is useful for filtering, totals, view-model data, and other derived state. It also makes the dependency explicit and can notify an `OnPush` view when the result is invalidated.

A normal method in a template is evaluated whenever Angular checks that view:

```html
<!-- This may run on every change-detection pass. -->
{{ formatProduct(product) }}
```

That is fine for a cheap, deterministic formatter, especially when the method needs an argument. Avoid expensive work, allocations, I/O, or side effects in template methods. A method such as `getFilteredProducts()` that creates a new array on every call can waste work and cause child inputs to appear changed on every check.

The choice is not simply “always use computed.” Use a function when the calculation is parameterized by a template value, is trivial, or represents an action/event handler. Use `computed` when the result is shared or nontrivial and its inputs are signals. For parameterized derived data, keep the stable base derivation in a computed signal and perform only the small per-item calculation in the template, or use a memoization strategy appropriate to the data size. Keep both approaches pure; neither should mutate state or trigger side effects.

