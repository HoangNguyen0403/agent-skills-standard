Keep `app.routes.ts` declarative: import `Routes`, guards, and resolvers, but do not eagerly import feature components. Lazy-load each feature with `loadComponent` or `loadChildren`, and keep redirects and the wildcard fallback in predictable positions.

```ts
import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { heroResolver } from './hero.resolver';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard],
    title: 'Dashboard',
  },
  {
    path: 'heroes/:id',
    loadComponent: () =>
      import('./features/heroes/hero.component').then(
        (m) => m.HeroComponent,
      ),
    resolve: { hero: heroResolver },
    title: 'Hero',
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: 'dashboard' },
];
```

Configure the router with component input binding if route data should be delivered directly to inputs:

```ts
provideRouter(routes, withComponentInputBinding());
```

Keep authorization in functional guards and pre-navigation data fetching in `ResolveFn` resolvers. Avoid putting conditional logic or service calls directly in the route array, and avoid `component: FeatureComponent` for feature routes because it creates an eager feature import.

