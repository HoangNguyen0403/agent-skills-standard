Use a lazy route record instead of importing a feature component into the root route configuration. With standalone components, use `loadComponent`; for a feature that owns several child routes, use `loadChildren`.

```ts
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    title: 'Dashboard',
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
];
```

The feature route file can lazy-load each child as well:

```ts
// features/admin/admin.routes.ts
import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-page.component').then((m) => m.AdminPageComponent),
  },
];
```

Keep feature components standalone and do not eagerly import them merely to reference them in `component: ...`. Apply `loadComponent` or `loadChildren` to every feature route. Put access control in a functional guard and data fetching in a resolver rather than embedding that logic in the route configuration.

