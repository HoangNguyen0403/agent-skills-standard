Enable component input binding when configuring the router:

```ts
import { provideRouter, withComponentInputBinding } from '@angular/router';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
  ],
});
```

Define a matching input in the component:

```ts
// routes.ts
export const routes: Routes = [
  {
    path: 'users/:id',
    loadComponent: () => import('./user.component')
      .then(m => m.UserComponent),
  },
];

// user.component.ts
import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  template: `User ID: {{ id() }}`,
})
export class UserComponent {
  id = input.required<string>();
}
```

Navigating to `/users/42` automatically binds `"42"` to `id`. With `withComponentInputBinding()`, Angular can also bind matching inputs from query params and resolver data.

Keep route configuration free of business logic (“No logic”); use dedicated resolvers or guards when needed. Class-based guards are deprecated—use functional guards such as `CanActivateFn`.
