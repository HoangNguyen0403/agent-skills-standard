Assuming Angular standalone routing, structure `app.routes.ts` as a `Routes` array:

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
    // canActivate: [authGuard],
  },
  {
    path: 'users',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/users/users.component').then(m => m.UsersComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./pages/users/user-detail.component').then(
            m => m.UserDetailComponent,
          ),
      },
    ],
  },
  {
    path: '404',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then(
        m => m.NotFoundComponent,
      ),
  },
  { path: '**', redirectTo: '404' },
];
```

Register it in the application configuration:

```ts
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes)],
};
```

Keep specific routes before parameterized routes, redirects before the wildcard, and the `**` fallback last. Use `loadComponent` or `loadChildren` for lazy loading, and attach guards or resolvers at the route level where needed.
