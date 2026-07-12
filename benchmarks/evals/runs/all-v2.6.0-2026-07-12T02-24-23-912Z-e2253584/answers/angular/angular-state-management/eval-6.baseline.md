# `effect()` versus `computed()` in Angular

Use `computed()` to derive a value from signals. Use `effect()` when a signal change must cause an external side effect. The key test is whether the result should itself be another reactive value or whether it is an operation outside Angular’s state graph.

```ts
import { computed, effect, signal } from '@angular/core';

const firstName = signal('Ada');
const lastName = signal('Lovelace');

const displayName = computed(() => `${firstName()} ${lastName()}`);

effect(() => {
  console.log('Name changed:', displayName());
});
```

`displayName` is lazy and memoized. Angular tracks the signals read during its computation and recalculates it when one of those dependencies changes. It is synchronous, deterministic, and should be free of side effects. Use it for filtered lists, totals, permissions, labels, and other derived state. A `computed()` does not make sense if you need to call it to perform an action or if it has to update another signal.

An `effect()` runs whenever one of the signals read during its last execution changes. Typical uses include synchronizing with systems outside the signal graph:

```ts
private readonly saveDraft = effect(() => {
  const draft = this.draft();
  localStorage.setItem('draft', JSON.stringify(draft));
});
```

Other appropriate uses include logging, analytics, updating a non-Angular widget, and integrating with browser APIs. Create effects in an injection context such as a component or service so Angular can manage their lifetime. If you create one manually, retain the `EffectRef` and destroy it when the owner is done; use cleanup for subscriptions, timers, or listeners tied to each run.

Do not use an effect merely to copy one signal into another or to calculate derived state. That creates an extra asynchronous propagation step and can cause stale values or change-detection problems. Prefer a `computed()` for derivation, or update the source state in the method that handles the event. Effects should also avoid writing to signals that feed the same effect; if a state write is genuinely required, make the ownership and termination condition explicit rather than using it as an implicit state pipeline.

