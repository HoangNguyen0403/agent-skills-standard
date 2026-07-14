# Composing behavior with `hostDirectives`

`hostDirectives` attaches one or more standalone directives to the host element of another directive or component. This is useful when a component should always have reusable behavior without requiring callers to add another attribute. The host directive's inputs and outputs are private by default, so explicitly re-export the ones that should be part of the component's public API.

```ts
import {
  Directive,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
} from '@angular/core';

@Directive({
  selector: '[focusRing]',
  standalone: true,
})
export class FocusRingDirective {
  @Input() enabled = true;
  @Output() focusedChange = new EventEmitter<boolean>();

  @HostBinding('class.focus-ring-active')
  focused = false;

  @HostListener('focusin')
  onFocus(): void {
    if (!this.enabled) return;
    this.focused = true;
    this.focusedChange.emit(true);
  }

  @HostListener('focusout')
  onBlur(): void {
    this.focused = false;
    this.focusedChange.emit(false);
  }
}
```

Compose it into a standalone component and expose the selected input/output:

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-search-box',
  standalone: true,
  template: '<input type="search" placeholder="Search">',
  hostDirectives: [
    {
      directive: FocusRingDirective,
      inputs: ['enabled'],
      outputs: ['focusedChange'],
    },
  ],
})
export class SearchBoxComponent {}
```

Now focus events from the component's host (including bubbling `focusin`/`focusout` events from its input) toggle the class on `<app-search-box>`, and consumers can write:

```html
<app-search-box
  [enabled]="true"
  (focusedChange)="onFocusChanged($event)"
></app-search-box>
```

The host directive does not become a directive on arbitrary descendants, and it does not automatically expose every input or output. Keep the behavior directive standalone and list only the API that the composed component intends to support.

