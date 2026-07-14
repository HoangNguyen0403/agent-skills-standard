Use `computed()` for derived state; use `effect()` for side effects.

- `computed(() => ...)`
  - Returns a memoized, read-only `Signal`.
  - Recalculates when its dependencies change.
  - Should be pure: no HTTP calls, DOM updates, logging, or signal writes.

```ts
readonly fullName = computed(() =>
  `${this.firstName()} ${this.lastName()}`
);
```

- `effect(() => ...)`
  - Runs whenever signals read inside it change.
  - Use it for side effects such as logging, analytics, `localStorage`, imperative APIs, or third-party libraries.

```ts
effect(() => {
  localStorage.setItem('theme', this.theme());
});
```

Rule of thumb: if you need a value, use `computed()`; if you need an external action, use `effect()`. Don’t use `effect()` to propagate or synchronize derived state—model that relationship with `computed()` instead.
