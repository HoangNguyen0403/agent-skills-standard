# Handling host bindings in `tooltip.directive.ts`

Bind state to the directive's host element, and let Angular add or remove attributes and classes. Returning `null` from an attribute binding removes the attribute, which is useful for `aria-describedby`: it should point to a tooltip only while that tooltip is actually present and visible.

```ts
import {
  Directive,
  HostBinding,
  HostListener,
  Input,
} from '@angular/core';

let nextTooltipId = 0;

@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class TooltipDirective {
  @Input({ alias: 'appTooltip', required: true })
  text = '';

  readonly tooltipId = `app-tooltip-${++nextTooltipId}`;

  @HostBinding('class.tooltip-open')
  isOpen = false;

  @HostBinding('attr.aria-describedby')
  get describedBy(): string | null {
    return this.isOpen ? this.tooltipId : null;
  }

  @HostBinding('attr.aria-expanded')
  get expanded(): 'true' | 'false' {
    return this.isOpen ? 'true' : 'false';
  }

  @HostListener('mouseenter')
  @HostListener('focusin')
  show(): void {
    this.isOpen = this.text.trim().length > 0;
  }

  @HostListener('mouseleave')
  @HostListener('focusout')
  hide(): void {
    this.isOpen = false;
  }
}
```

The popup rendered by the directive, an overlay service, or a companion component must use the same `tooltipId` and have `role="tooltip"`, for example `<div [id]="tooltipId" role="tooltip">...</div>`. Do not put `role="tooltip"` on the trigger itself. Also consider keyboard and touch behavior, and do not rely on hover alone for accessibility.

For newer Angular code, the equivalent `host` metadata is often preferable because the host contract is visible beside the selector:

```ts
@Directive({
  selector: '[appTooltip]',
  standalone: true,
  host: {
    '[class.tooltip-open]': 'isOpen',
    '[attr.aria-describedby]': 'isOpen ? tooltipId : null',
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
  },
})
export class TooltipDirective {}
```

Use either `host` metadata or `@HostBinding`/`@HostListener` for a given binding, not both. Avoid assigning `class` wholesale because that can overwrite classes supplied by the consumer; bind a specific class such as `class.tooltip-open` instead.

