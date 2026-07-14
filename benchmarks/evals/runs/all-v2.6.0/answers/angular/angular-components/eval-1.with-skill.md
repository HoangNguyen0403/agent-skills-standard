# Creating a standalone Angular component

Declare the component with `standalone: true`, import every directive or component it uses in the component's `imports` array, and use `OnPush` change detection. With Angular's built-in control flow, simple interpolation and event binding do not require `CommonModule`.

```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card">
      <h2>{{ name() }}</h2>
      <button type="button" (click)="selectUser()">Select</button>
    </article>
  `,
})
export class UserCardComponent {
  readonly name = input.required<string>();
  readonly selected = output<void>();

  selectUser(): void {
    this.selected.emit();
  }
}
```

The parent can use it without declaring it in an NgModule:

```html
<app-user-card [name]="userName" (selected)="onUserSelected()" />
```

For a component that uses another standalone component or directive, add that dependency to `imports`. Keep service injection and state orchestration in a smart/container component; a presentational component such as this one should receive inputs and emit outputs only.

