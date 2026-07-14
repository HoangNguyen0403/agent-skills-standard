Use a functional `ResolveFn<T>` and attach it to the route’s `resolve` property. Angular completes the resolver before activating the component.

```ts
// dashboard.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Dashboard } from './dashboard.model';
import { DashboardService } from './dashboard.service';

export const dashboardResolver: ResolveFn<Dashboard> = () =>
  inject(DashboardService).getDashboard();
```

```ts
// app.routes.ts
import { Routes } from '@angular/router';
import { dashboardResolver } from './dashboard.resolver';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard.component').then(m => m.DashboardComponent),
    resolve: {
      dashboard: dashboardResolver,
    },
    title: 'Dashboard',
  },
];
```

Enable component input binding:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
  ],
};
```

Receive the resolved data directly in the component:

```ts
import { Component, input } from '@angular/core';
import { Dashboard } from './dashboard.model';

@Component({
  standalone: true,
  template: `<h1>{{ dashboard().title }}</h1>`,
})
export class DashboardComponent {
  dashboard = input.required<Dashboard>();
}
```

Keep fetching logic in the resolver—there should be no logic in the route config itself. Use `CanActivateFn` for access control; class-based guards are deprecated.
