# Creating a custom attribute directive

An attribute directive adds behavior to an existing element. Declare it with a selector in brackets, make it standalone, and put reusable DOM behavior in the directive class.

```ts
import { Directive, ElementRef, Renderer2, input } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  standalone: true,
  host: {
    '(mouseenter)': 'highlight()',
    '(mouseleave)': 'clearHighlight()',
  },
})
export class HighlightDirective {
  readonly appHighlight = input('yellow');

  constructor(
    private readonly element: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  highlight(): void {
    this.renderer.setStyle(
      this.element.nativeElement,
      'background-color',
      this.appHighlight(),
    );
  }

  clearHighlight(): void {
    this.renderer.removeStyle(this.element.nativeElement, 'background-color');
  }
}
```

Import the directive directly into a standalone component and use its selector as an attribute:

```ts
@Component({
  standalone: true,
  imports: [HighlightDirective],
  template: `
    <p appHighlight>Hover for the default highlight.</p>
    <p [appHighlight]="'lightblue'">Hover for a custom color.</p>
  `,
})
export class ExampleComponent {}
```

The `host` object wires host events to directive methods. This keeps the directive standalone and avoids deprecated-style `@HostBinding` and `@HostListener` decorators. Use `Renderer2` for DOM writes rather than manipulating the element directly.

