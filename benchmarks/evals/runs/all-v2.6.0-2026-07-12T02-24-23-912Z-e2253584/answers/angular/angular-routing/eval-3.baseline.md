# Binding route parameters to component inputs

Enable Angular Router's component input binding feature when the application provides the router:

```ts
// main.ts
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes, withComponentInputBinding())],
});
```

Then make the input name match the route parameter name:

```ts
// app.routes.ts
export const routes: Routes = [
  {
    path: 'users/:id',
    loadComponent: () =>
      import('./user-detail.component').then(m => m.UserDetailComponent),
  },
];

// user-detail.component.ts
import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  template: '<h1>User {{ id() }}</h1>',
})
export class UserDetailComponent {
  readonly id = input.required<string>();
}
```

`id` is supplied from `users/:id` whenever the route is activated. Route parameters are strings, so convert them explicitly when a numeric or other domain type is required. In versions using decorator inputs, the component can instead declare `@Input() id!: string;`.

The same mechanism can bind query parameters, matrix parameters, and static route data when their names match inputs. For example, a route with `data: { section: 'overview' }` can bind to an input named `section`. Resolved data can also bind to an input with the resolver key's name.

Without this feature, read the parameter through `ActivatedRoute`:

```ts
readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
```

Use the observable `paramMap` instead of `snapshot` when the same component instance can remain active while only the route parameter changes. Input binding is often cleaner because Angular updates the input as navigation state changes and avoids coupling the component to the router service.

