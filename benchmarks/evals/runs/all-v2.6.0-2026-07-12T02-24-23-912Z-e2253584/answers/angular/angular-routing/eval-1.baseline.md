# Lazy loading in Angular

With standalone Angular applications, put a lazy boundary in the route configuration. Use `loadComponent` for one standalone page and `loadChildren` for a feature route configuration.

```ts
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: 'home' },
];
```

The feature can define its own child routes in a separate file:

```ts
// admin/admin.routes.ts
import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      {
        path: 'users',
        loadComponent: () =>
          import('./users.component').then(m => m.UsersComponent),
      },
    ],
  },
];
```

Register the routes at bootstrap:

```ts
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)],
});
```

For a module-based application, the equivalent is `loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)`. The imported module should contain the feature's child route configuration; do not eagerly import the feature module elsewhere, or its code may no longer be split out.

Lazy loading defers the feature bundle until the URL is activated. If you want the split bundles fetched after the initial application is stable, add preloading deliberately:

```ts
provideRouter(routes, withPreloading(PreloadAllModules))
```

Keep the wildcard route last, and put authentication or entitlement checks on the lazy route (often with `canMatch`) so unauthorized feature code is not selected merely because the URL matches.

