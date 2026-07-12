# Function calls in Angular templates

Do not treat every function call as forbidden, but avoid expensive or allocating functions in templates. Angular may evaluate a template expression whenever the component is checked, so a call such as `calculateTotals()` can run repeatedly even when its inputs have not changed. With default change detection this can happen more often than expected; `OnPush` reduces checks but does not make a function call free whenever the component is checked.

Avoid code like this for non-trivial work:

```html
<p>{{ formatCurrency(calculateTotal()) }}</p>
@for (item of getVisibleItems(); track item.id) {
  <item-row [item]="item" />
}
```

If those methods filter, sort, format, allocate arrays, or return new objects, they can create CPU and garbage-collection pressure. A method that returns a new object can also make an input appear changed on every check.

Prefer state that is computed when its dependencies change:

```ts
readonly items = signal<Item[]>([]);
readonly taxRate = signal(0.2);

readonly total = computed(() =>
  this.items().reduce((sum, item) => sum + item.price, 0) * (1 + this.taxRate()),
);

readonly visibleItems = computed(() =>
  this.items().filter(item => item.visible),
);
```

```html
<p>{{ total() | currency }}</p>
@for (item of visibleItems(); track item.id) {
  <item-row [item]="item" />
}
```

Pure pipes are also appropriate for deterministic transformations because Angular can reuse their result while the pipe inputs retain the same identity. For large or frequently changing datasets, move filtering/sorting to the data layer, memoize by stable inputs, paginate, or virtualize the list.

A cheap, side-effect-free lookup can be perfectly acceptable, especially when profiling shows no issue. Event-handler methods such as `(click)="save()"` run because of the event and are not the same concern as a method used to derive a value during every check. If a template function is necessary, keep it fast, deterministic, allocation-free, and independent of hidden mutable state. Profile the actual component before changing readable code solely to eliminate a function call.

