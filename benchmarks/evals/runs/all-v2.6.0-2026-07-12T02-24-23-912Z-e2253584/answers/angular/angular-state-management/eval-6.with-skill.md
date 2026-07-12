# computed() versus effect()

Use computed() to derive application state and effect() only to react with an external side effect.

computed() is synchronous, pure, read-only, cached, and tracks the signals it reads:

~~~ts
readonly subtotalCents = computed(() =>
  this.lines().reduce(
    (total, line) => total + line.unitPriceCents * line.quantity,
    0,
  ),
);
~~~

It should return a value and should not call .set() or .update() on another signal. If the value can be expressed as a function of existing state, prefer computed() rather than copying that value into a second writable signal.

effect() is for work outside the signal graph, such as logging, writing local storage, updating a third-party widget, or integrating with an imperative browser API:

~~~ts
private readonly persistEffect = effect(() => {
  const lines = this.lines();
  localStorage.setItem('cart-lines', JSON.stringify(lines));
});
~~~

The effect runs initially and again when lines() changes. Create it in an Angular injection context, such as an injectable service or component. Keep the effect's dependencies intentional; use untracked() when reading a signal should not make that signal a trigger.

Do not use an effect to keep one application signal synchronized with another, for example by reading items() and then setting total. That creates duplicated state and can create circular dependencies. Use computed() for total. Likewise, do not update signals inside an effect; put state transitions in an explicit service/store method, or use an appropriate async store pattern for an event-driven workflow. The short rule is: computed() calculates state; effect() performs external work because state changed.


