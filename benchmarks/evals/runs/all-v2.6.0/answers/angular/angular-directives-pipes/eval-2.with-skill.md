# Composing behavior with `hostDirectives`

`hostDirectives` applies a standalone directive to a component or another directive, so the host gets the behavior without inheritance. Inputs and outputs are private to the host by default; expose the ones that should be part of the host component's API.

```ts
import { Component, Directive, input, output } from '@angular/core';

@Directive({
  selector: '[appTooltip]',
  standalone: true,
  host: {
    '[attr.title]': 'text()',
    '[attr.aria-label]': 'text()',
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(focusin)': 'show()',
    '(focusout)': 'hide()',
  },
})
export class TooltipDirective {
  readonly text = input('');
  readonly shown = output<void>();
  readonly hidden = output<void>();

  show(): void {
    this.shown.emit();
  }

  hide(): void {
    this.hidden.emit();
  }
}

@Component({
  selector: 'app-button',
  standalone: true,
  template: `<button type="button"><ng-content /></button>`,
  hostDirectives: [
    {
      directive: TooltipDirective,
      inputs: ['text'],
      outputs: ['shown', 'hidden'],
    },
  ],
})
export class ButtonComponent {}
```

Consumers can now use the exposed directive API on the component host:

```html
<app-button
  text="Save changes"
  (shown)="announceTooltip()"
  (hidden)="clearAnnouncement()"
>
  Save
</app-button>
```

The tooltip directive remains reusable, while `ButtonComponent` composes it declaratively. If the host's public property should have a different name, expose an alias in the `inputs` mapping supported by the Angular version in use; keep the directive itself independent of that component API.

