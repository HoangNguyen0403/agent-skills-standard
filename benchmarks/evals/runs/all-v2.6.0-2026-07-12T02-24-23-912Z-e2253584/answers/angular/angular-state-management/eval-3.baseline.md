# Using `linkedSignal()` for dependent state

Use `linkedSignal()` when a value is writable by the user but should be reset or reconciled when another signal changes. It is useful for dependent selections such as “selected shipping method for the current delivery options.” A plain `computed()` is read-only, while a plain writable `signal()` does not automatically respond when its source changes.

```ts
import { linkedSignal, signal } from '@angular/core';

interface ShippingOption {
  id: string;
  label: string;
}

const shippingOptions = signal<ShippingOption[]>([
  { id: 'standard', label: 'Standard' },
  { id: 'express', label: 'Express' },
]);

const selectedShipping = linkedSignal<ShippingOption | null>(
  () => shippingOptions()[0] ?? null,
);

function chooseShipping(option: ShippingOption): void {
  selectedShipping.set(option);
}
```

The user can call `selectedShipping.set(...)`. If `shippingOptions` changes, the linked signal is recomputed from the new options. For example, when the current product or destination changes, the selection returns to the first valid option.

Often you want to preserve the previous selection when it remains valid, and otherwise choose a fallback. Use the source/computation form for that:

```ts
const selectedShipping = linkedSignal({
  source: shippingOptions,
  computation: (options, previous) => {
    const previousId = previous?.value?.id;
    return options.find(option => option.id === previousId) ?? options[0] ?? null;
  },
});
```

This keeps the user’s choice across an options refresh when the same option still exists, but prevents a stale choice from surviving when it has been removed. The computation should return a value consistent with the new source; it should not perform side effects.

Use `linkedSignal()` for writable state with a source-dependent default. Use `computed()` when the value can always be derived and never needs to be set independently—for example, `computed(() => options().filter(...))`. If the source is asynchronous, represent loading, empty, and error states explicitly and ensure the linked computation handles an empty source. Also avoid mutating the source array in place; replace it with a new array so Angular can observe the change.

