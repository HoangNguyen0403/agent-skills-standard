Use `linkedSignal()` when state should be writable but reset or update when another signal changes.

```ts
import { Component, linkedSignal, signal } from '@angular/core';

@Component({
  selector: 'app-example',
  template: `
    <select [value]="selectedId()" (change)="selectedId.set($any($event.target).value)">
      @for (option of options(); track option.id) {
        <option [value]="option.id">{{ option.name }}</option>
      }
    </select>
  `
})
export class ExampleComponent {
  options = signal([
    { id: 'a', name: 'Option A' },
    { id: 'b', name: 'Option B' }
  ]);

  selectedId = linkedSignal(() => this.options()[0]?.id);
}
```

When `options()` changes, `selectedId()` is recomputed from the first option. You can still update it manually with `selectedId.set(...)`.

To preserve the current selection when possible:

```ts
selectedId = linkedSignal({
  source: this.options,
  computation: (options, previous) => {
    const previousId = previous?.value;

    return options.some(option => option.id === previousId)
      ? previousId
      : options[0]?.id;
  }
});
```

Here, `previous.value` contains the prior linked value. If it is still valid, it is preserved; otherwise, the first option becomes selected.

Use `computed()` for read-only derived state. Use `linkedSignal()` for writable dependent state whose value must react to changes in another signal.
