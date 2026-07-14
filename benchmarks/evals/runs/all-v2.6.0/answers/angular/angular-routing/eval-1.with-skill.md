Use Angular Router with lazy-loaded routes:

```ts
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component')
        .then(m => m.DashboardComponent),
    title: 'Dashboard',
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./admin/admin.routes')
        .then(m => m.ADMIN_ROUTES),
  },
];
```

Configure the router with component input binding:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
} from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
  ],
};
```

For a standalone component receiving route parameters:

```ts
import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  template: `<h1>Dashboard {{ id() }}</h1>`,
})
export class DashboardComponent {
  id = input.required<string>();
}
```

Use functional guards rather than deprecated class-based guards:

```ts
import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  return Boolean(localStorage.getItem('token'));
};
```

Attach it to the lazy route:

```ts
{
  path: 'admin',
  canActivate: [authGuard],
  loadChildren: () =>
    import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
}
```

For pre-navigation data loading, use a `ResolveFn<T>`:

```ts
import { ResolveFn } from '@angular/router';

export const userResolver: ResolveFn<User> = (route) =>
  inject(UserService).getUser(route.paramMap.get('id')!);
```

Keep route configuration free of business logic: put access control in guards and data fetching in resolvers. Ensure feature routes use `loadComponent` or `loadChildren` instead of eager feature imports.
