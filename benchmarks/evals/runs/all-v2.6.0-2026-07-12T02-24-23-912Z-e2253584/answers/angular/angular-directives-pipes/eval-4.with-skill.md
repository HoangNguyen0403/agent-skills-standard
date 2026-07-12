# Handling host bindings in `tooltip.directive.ts`

Put host property bindings and host event listeners in the directive decorator's `host` object. This is the preferred declaration style here; do not use `@HostBinding` or `@HostListener` for the same behavior.

```ts
import { Directive, input, signal } from '@angular/core';

@Directive({
  selector: '[appTooltip]',
  standalone: true,
  host: {
    '[attr.aria-label]': 'text()',
    '[attr.data-tooltip-visible]': 'visible() ? "true" : "false"',
    '[class.tooltip-visible]': 'visible()',
    '(mouseenter)': 'open()',
    '(mouseleave)': 'close()',
    '(focusin)': 'open()',
    '(focusout)': 'close()',
  },
})
export class TooltipDirective {
  readonly text = input.required<string>();
  readonly visible = signal(false);

  open(): void {
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
  }
}
```

The expressions in `host` are strings evaluated in the directive context: `text()` and `visible()` read signal values, while `open()` and `close()` handle host events. Use the directive normally in a template:

```html
<button appTooltip="Open settings">Settings</button>
```

The CSS class can control the visual treatment, while `aria-label` supplies an accessible name. For a richer tooltip, render a separate tooltip element and connect it with `aria-describedby`; do not rely on a host binding alone to make a visual tooltip accessible.

