Use Angular Router’s `loadChildren` or `loadComponent` so code loads only when its route is visited.

Standalone component:

```ts
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component')
        .then(m => m.DashboardComponent),
  },
];
```

Lazy-loaded route group:

```ts
export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () =>
      import('./admin/admin.routes')
        .then(m => m.ADMIN_ROUTES),
  },
];
```

```ts
// admin/admin.routes.ts
import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin.component').then(m => m.AdminComponent),
  },
];
```

For an NgModule-based application:

```ts
const routes: Routes = [
  {
    path: 'settings',
    loadChildren: () =>
      import('./settings/settings.module')
        .then(m => m.SettingsModule),
  },
];
```

Register the routes:

```ts
provideRouter(routes)
```

or, for NgModule applications:

```ts
RouterModule.forRoot(routes)
```

Ensure the root template contains:

```html
<router-outlet />
```

Optional preloading can load lazy routes after the initial application loads:

```ts
provideRouter(
  routes,
  withPreloading(PreloadAllModules)
)
```

Assumption: the examples use modern standalone Angular APIs; use `loadChildren` with an NgModule when the feature is module-based.
