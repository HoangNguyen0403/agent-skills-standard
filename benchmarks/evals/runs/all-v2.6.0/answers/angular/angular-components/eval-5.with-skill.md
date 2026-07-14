# Using `output()` instead of `EventEmitter`

Declare a component output with `output<T>()` and emit values through its `.emit()` method. This replaces the decorator-based `@Output() EventEmitter<T>` pattern.

```ts
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

interface SaveResult {
  id: string;
}

@Component({
  selector: 'app-save-button',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="save()">
      Save
    </button>
  `,
})
export class SaveButtonComponent {
  readonly id = input.required<string>();
  readonly saved = output<SaveResult>();

  save(): void {
    this.saved.emit({ id: this.id() });
  }
}
```

A parent listens to the output and receives the typed payload:

```html
<app-save-button [id]="documentId" (saved)="handleSaved($event)" />
```

Use `output<void>()` for an event with no payload. For two-way component state, use `model()` where appropriate. Outputs are for child-to-parent communication; the presentational child should not inject the service that persists the document.

