# Making a directive standalone

Add `standalone: true` to the directive metadata. A standalone directive is not declared in an NgModule; a standalone component or another standalone directive imports it directly.

```ts
import {
  Directive,
  ElementRef,
  AfterViewInit,
  inject,
} from '@angular/core';

@Directive({
  selector: '[appAutoFocus]',
  standalone: true,
})
export class AutoFocusDirective implements AfterViewInit {
  private readonly element = inject(ElementRef<HTMLInputElement>);

  ngAfterViewInit(): void {
    queueMicrotask(() => this.element.nativeElement.focus());
  }
}
```

Import and use it from a standalone component:

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [AutoFocusDirective],
  template: '<input appAutoFocus type="email" aria-label="Email">',
})
export class LoginComponent {}
```

The directive's selector still controls how it is applied; `standalone` changes how Angular discovers it. If the application uses an NgModule, import the standalone directive in the module's `imports` array rather than putting it in `declarations`:

```ts
@NgModule({
  imports: [AutoFocusDirective],
})
export class FormsModule {}
```

For a reusable directive, also consider whether focusing is appropriate for every consumer and whether it should be gated by an input. Code that may run during server-side rendering should avoid assuming that browser-only DOM APIs are available.

