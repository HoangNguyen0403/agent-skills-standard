# Using `output()` instead of `EventEmitter`

In modern Angular, declare component events with the `output` function. It returns an `OutputEmitterRef<T>` whose `emit` method sends a value to the parent:

```ts
import { Component, output } from '@angular/core';

@Component({
  selector: 'app-save-button',
  standalone: true,
  template: '<button type="button" (click)="save()">Save</button>',
})
export class SaveButtonComponent {
  saved = output<{ id: string }>();

  save(): void {
    const id = crypto.randomUUID();
    this.saved.emit({ id });
  }
}
```

Listen to it using the normal event-binding syntax:

```html
<app-save-button (saved)="onSaved($event)" />
```

```ts
onSaved(event: { id: string }): void {
  console.log('Saved', event.id);
}
```

For a payload-less event, use `output<void>()` and call `emit()` with no argument:

```ts
closed = output<void>();
```

Use an alias when the public event name must differ from the property name:

```ts
itemSelected = output<Item>({ alias: 'selected' });
```

The parent binds `(selected)`, while the child calls `this.itemSelected.emit(item)`. Component outputs do not bubble through the DOM. Name them as semantic events and avoid collisions with native events such as `click`.

`output()` is a framework-aware alternative to `new EventEmitter()`: it is strongly typed, works naturally with Angular's output metadata, and supports Angular-managed programmatic subscriptions. A parent or dynamically created component can subscribe through the returned reference when needed; Angular cleans up template and framework-managed subscriptions with the component lifecycle. Existing `@Output() EventEmitter<T>` code remains valid, so migrate it when useful rather than mixing duplicate events for the same action. An output is for notifying the parent; the child should not use it as a general application event bus.

