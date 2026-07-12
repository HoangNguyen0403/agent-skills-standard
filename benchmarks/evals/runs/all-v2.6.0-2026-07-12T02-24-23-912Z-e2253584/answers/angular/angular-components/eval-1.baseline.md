# Creating a standalone Angular component

A standalone component declares its own template dependencies and does not need to be declared in an `NgModule`. Use the Angular CLI when possible:

```bash
ng generate component greeting --standalone
```

The resulting component can look like this:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-greeting',
  standalone: true,
  imports: [DatePipe],
  template: `
    <h1>Hello, {{ name }}</h1>
    <p>Today is {{ today | date:'longDate' }}.</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GreetingComponent {
  name = 'Angular';
  today = new Date();
}
```

`standalone: true` makes the component usable without adding it to an NgModule. The `imports` array is the component's template dependency list: add standalone components, directives, and pipes used by its template. For example, a component using `RouterLink` imports `RouterLink`, and a component using another standalone component imports that component.

Use the component from another standalone component by importing it there and placing its selector in the template:

```ts
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [GreetingComponent],
  template: '<app-greeting />',
})
export class HomeComponent {}
```

The application can be bootstrapped directly with `bootstrapApplication`, typically from `main.ts`:

```ts
bootstrapApplication(AppComponent, appConfig)
  .catch(error => console.error(error));
```

Standalone components can still use dependency injection, inputs, outputs, lifecycle hooks, and `ChangeDetectionStrategy.OnPush` in the same way as module-declared components. The key difference is where template dependencies are declared: locally in each component rather than in an NgModule.

