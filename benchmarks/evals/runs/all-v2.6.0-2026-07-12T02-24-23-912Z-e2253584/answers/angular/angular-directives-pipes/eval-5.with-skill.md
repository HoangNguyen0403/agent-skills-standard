# Making a directive standalone

Set `standalone: true` in the `@Directive` metadata. A standalone directive is not declared in an `NgModule`; import it directly into each standalone component (or directive) that uses it.

```ts
import { Directive, ElementRef, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appFocusRing]',
  standalone: true,
  host: {
    '(focusin)': 'setActive(true)',
    '(focusout)': 'setActive(false)',
  },
})
export class FocusRingDirective {
  constructor(
    private readonly element: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  setActive(active: boolean): void {
    const host = this.element.nativeElement;

    if (active) {
      this.renderer.addClass(host, 'focus-ring');
    } else {
      this.renderer.removeClass(host, 'focus-ring');
    }
  }
}
```

Import it directly at the point of use:

```ts
@Component({
  standalone: true,
  imports: [FocusRingDirective],
  template: `<button appFocusRing type="button">Continue</button>`,
})
export class FormActionsComponent {}
```

This keeps the directive reusable and makes its dependencies explicit. Put host event wiring in the decorator's `host` object, and use `ElementRef` with `Renderer2` for DOM behavior; there is no `NgModule` declaration and no need for `@HostBinding` or `@HostListener`.

