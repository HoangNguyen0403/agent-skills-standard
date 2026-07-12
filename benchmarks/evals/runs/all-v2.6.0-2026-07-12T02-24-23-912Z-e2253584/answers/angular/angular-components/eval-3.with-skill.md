# Using signal inputs with `input.required()`

Declare a required signal input with `input.required<T>()`. Angular will require the parent to bind it, and the component reads the current value by calling the signal, for example `userId()` rather than `userId`.

```ts
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

@Component({
  selector: 'app-user-badge',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      [attr.data-user-id]="userId()"
      [attr.aria-disabled]="disabled()"
    >
      User {{ userId() }}
    </span>
  `,
})
export class UserBadgeComponent {
  readonly userId = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
}
```

The parent supplies the required value with normal property binding:

```html
<app-user-badge [userId]="selectedUserId" disabled />
```

Use `input<T>(defaultValue)` for optional inputs with a default. Input transforms such as `booleanAttribute` or `numberAttribute` normalize attribute values at the boundary. Signal inputs are read-only from the child; if the child needs to communicate a change, expose an `output()` or `model()` instead of mutating the input.

