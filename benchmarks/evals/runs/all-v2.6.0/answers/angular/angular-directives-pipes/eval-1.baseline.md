# Creating a custom attribute directive

An attribute directive is a class that changes the behavior or appearance of an existing element. Give it an attribute-selector in the `@Directive` metadata, then use `@Input` for configurable values and `@HostListener` for events from the host element.

```ts
import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  Renderer2,
  inject,
} from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  standalone: true,
})
export class HighlightDirective {
  @Input() appHighlight = 'yellow';

  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.setBackground(this.appHighlight);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.setBackground(null);
  }

  private setBackground(color: string | null): void {
    this.renderer.setStyle(
      this.element.nativeElement,
      'background-color',
      color,
    );
  }
}
```

Use it as either a boolean attribute or a property binding:

```html
<p appHighlight>Hover for the default yellow highlight.</p>
<p [appHighlight]="'lightblue'">Hover for a blue highlight.</p>
```

If the consumer is a standalone component, import the directive in that component's `imports` array:

```ts
@Component({
  standalone: true,
  imports: [HighlightDirective],
  template: '<p appHighlight>Hover me</p>',
})
export class DemoComponent {}
```

`Renderer2` keeps the DOM update behind Angular's rendering abstraction. If the directive is not standalone, remove `standalone: true` and declare it once in an NgModule instead.

