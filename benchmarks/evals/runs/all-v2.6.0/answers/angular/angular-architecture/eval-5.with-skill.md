# Configuring lazy loading with `loadComponent`

`loadComponent` is the route-level option for lazy-loading a standalone component. Put the route in the root route table (or a lazy feature route) and use a dynamic import:

```ts
// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
];
```

The target component must be standalone:

```ts
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DashboardSummaryComponent],
  template: `<app-dashboard-summary />`,
})
export class DashboardComponent {}
```

Do not add a top-level eager import of `DashboardComponent`; the dynamic import is what creates the lazy boundary. Declare the component's template dependencies in its own `imports` array. Use `loadChildren` when the feature has a group of child routes, and use `loadComponent` for a standalone leaf page or route entry.

Verify the route path, exported component name, and import path, then confirm every feature route uses `loadComponent` or `loadChildren`. Keep the page under a feature folder, keep application-wide services in `core/`, and avoid introducing an NgModule just to support this route.

