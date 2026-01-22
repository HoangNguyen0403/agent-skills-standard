# Composition w/ HostDirectives

## Host Directives

Compose behaviors.

```typescript
@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective { ... }

@Component({
  selector: 'app-button',
  standalone: true,
  template: `<button><ng-content/></button>`,
  hostDirectives: [
    {
      directive: TooltipDirective,
      inputs: ['tooltip'], // Alias input
      outputs: ['tooltipShow']
    }
  ]
})
export class ButtonComponent {
  // Now <app-button> automatically has tooltip capability
}
```
