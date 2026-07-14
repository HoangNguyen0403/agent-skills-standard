Use `computed()` when you need a derived value:

```ts
total = computed(() => this.items().reduce((sum, item) => sum + item.price, 0));
```

`computed()` is pure, cached, and should derive values such as totals, filtered lists, or status flags.

Use `effect()` only when a signal change must trigger an external side effect:

```ts
effect(() => {
  localStorage.setItem('theme', this.theme());
});
```

Typical uses include logging, `localStorage` synchronization, and DOM manipulation. Never update signals inside `effect()`; this can cause circular dependencies.

If you need dependent writable state that resets when its source changes, use `linkedSignal()` instead:

```ts
selectedItem = linkedSignal(() => this.items()[0] ?? null);
```

Rule of thumb: value transformation → `computed()`; interaction with something outside the signal graph → `effect()`.
