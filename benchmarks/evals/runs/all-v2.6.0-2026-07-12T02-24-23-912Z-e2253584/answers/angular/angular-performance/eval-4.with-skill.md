# Function calls in Angular templates

Avoid calling calculation or lookup functions from interpolation and property bindings, such as:

```html
<!-- Avoid: this may run on every change-detection cycle. -->
<p>{{ calculateTotal() }}</p>
```

Angular may reevaluate that expression whenever the component is checked, even when the underlying values have not changed. Use a `computed()` signal for derived state instead:

```ts
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

@Component({
  selector: 'app-cart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>Total: {{ total() }}</p>`,
})
export class CartComponent {
  readonly items = signal<CartItem[]>([]);
  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
}
```

The computed signal caches its value and recalculates when a signal it read changes. A pure pipe is another suitable option when the transformation is reusable in templates; it recalculates only when its inputs change. Keep event-handler calls such as `(click)="addItem()"` separate from this rule: those run because the user performed an event, while a calculation in interpolation can run repeatedly during change detection.

