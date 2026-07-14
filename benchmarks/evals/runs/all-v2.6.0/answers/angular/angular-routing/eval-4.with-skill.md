Assuming a standalone Angular app, keep `app.routes.ts` declarative and lazy-load every feature:

```ts
// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { dashboardResolver } from './core/resolvers/dashboard.resolver';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard], // functional CanActivateFn
    resolve: {
      data: dashboardResolver, // ResolveFn<T>
    },
    title: 'Dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component')
        .then(m => m.DashboardComponent),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/settings/settings.routes')
        .then(m => m.SETTINGS_ROUTES),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/not-found/not-found.component')
        .then(m => m.NotFoundComponent),
  },
];
```

Enable automatic route-parameter, query-parameter, and resolver-data binding:

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

Components can receive route values directly:

```ts
import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  template: `<h1>{{ id() }}</h1>`,
})
export class UserComponent {
  readonly id = input.required<string>();
}
```

Use function-based guards (`CanActivateFn`) and resolvers (`ResolveFn<T>`); class-based guards are deprecated. Keep route configuration free of business logic—move access control to guards and data fetching to resolvers.
