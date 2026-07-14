Use Angular’s `withComponentInputBinding()` router feature, then name component inputs after the route parameters.

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding())
  ]
};
```

```ts
// app.routes.ts
export const routes: Routes = [
  { path: 'users/:id', component: UserComponent }
];
```

```ts
// user.component.ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-user',
  template: `User ID: {{ id() }}`
})
export class UserComponent {
  id = input.required<string>();
}
```

Navigating to `/users/42` binds `id` to `"42"`.

You can also use the traditional decorator:

```ts
@Input() id!: string;
```

Input names can bind values from route path parameters, query parameters, static route data, and resolved route data. The input name must match the source key, unless you configure an input alias. This assumes a standalone Angular application; in an NgModule app, add the same router feature through the module’s `RouterModule` configuration.
