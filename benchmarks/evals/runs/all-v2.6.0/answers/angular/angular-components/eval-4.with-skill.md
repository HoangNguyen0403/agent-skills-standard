# Binding host properties without `@HostBinding`

Put host bindings in the component decorator's `host` metadata. Bind to signal values by calling the signal in the binding expression. This keeps host behavior declared with the component and avoids `@HostBinding` and direct `ElementRef` mutation.

```ts
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.active]': 'isActive()',
    '[attr.aria-disabled]': 'disabled()',
    '[attr.data-status]': 'status()',
  },
  template: `<span>{{ status() }}</span>`,
})
export class StatusPillComponent {
  readonly isActive = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly status = input.required<string>();
}
```

When `isActive`, `disabled`, or `status` changes, Angular updates the corresponding host class or attribute. Use the same `host` object for supported host listeners when needed; keep DOM manipulation in a directive or use `Renderer2` rather than mutating an `ElementRef` directly.

