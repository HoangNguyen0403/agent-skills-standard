Yes—avoid function calls in Angular template bindings such as:

```html
{{ calculate() }}
```

They re-evaluate on every change detection cycle. Use Signals for state with a `computed()` signal instead:

```ts
total = computed(() => this.price() * this.quantity());
```

```html
{{ total() }}
```

A `computed()` signal caches until dependencies change. Pure pipes are another suitable option. Event handlers such as `(click)="save()"` are normal and aren’t the same performance concern.
