# Binding host properties without `@HostBinding`

Use the component or directive `host` metadata to declare bindings on the host element. This keeps host behavior in the decorator and avoids the older `@HostBinding` decorator:

```ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  host: {
    '[class.is-active]': 'active()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[style.--badge-color]': 'color()',
    '(click)': 'handleClick()',
  },
  template: '<ng-content />',
})
export class StatusBadgeComponent {
  active = input(false);
  disabled = input(false);
  color = input('steelblue');

  handleClick(): void {
    if (!this.disabled()) {
      // Handle the host click.
    }
  }
}
```

The left side describes what is bound on the host:

- `[class.is-active]` toggles a CSS class.
- `[attr.aria-disabled]` writes an attribute. Returning `null` removes it.
- `[style.--badge-color]` binds a CSS custom property.
- `(click)` listens to a host event.

You can also bind DOM properties, for example `'[tabIndex]': 'disabled() ? -1 : 0'`. Use property bindings for behavior and attribute bindings for serialized/accessibility attributes. Prefer `null` for an absent attribute rather than the string `'null'`.

The same `host` syntax works in a directive, where it is useful for adding classes, ARIA state, or event behavior to the element that owns the directive. Keep expressions simple and reference component or directive members; put nontrivial calculations in a `computed` signal or method. Angular evaluates these bindings as component state changes, so direct DOM manipulation is generally unnecessary.

