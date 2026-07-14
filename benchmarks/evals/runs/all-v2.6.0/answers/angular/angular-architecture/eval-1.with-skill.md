# Structuring a new lazy-loaded Angular feature

Organize the feature by business capability, not by file type. For example:

```text
src/app/
├── app.routes.ts
└── features/
    └── orders/
        ├── orders.routes.ts
        ├── orders-page.component.ts
        ├── components/
        │   └── order-list.component.ts
        ├── services/
        │   └── orders-api.service.ts
        └── models/
            └── order.ts
```

Lazy-load the feature from the root route configuration:

```ts
// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'orders',
    loadChildren: () =>
      import('./features/orders/orders.routes').then((m) => m.ORDER_ROUTES),
  },
];
```

The feature route can lazy-load its page component as well:

```ts
// src/app/features/orders/orders.routes.ts
import { Routes } from '@angular/router';

export const ORDER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./orders-page.component').then((m) => m.OrdersPageComponent),
  },
];
```

Make new components standalone and import their direct dependencies locally:

```ts
@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [OrderListComponent],
  template: `<app-order-list [orders]="orders()" />`,
})
export class OrdersPageComponent {
  private readonly ordersApi = inject(OrdersApiService);
  readonly orders = signal<readonly Order[]>([]);

  // The container owns data access and feature state.
}
```

Keep feature-specific services, models, and presentational components inside the feature. Put application-wide singletons such as authentication services, guards, and interceptors in `core/`; put genuinely reusable UI, pipes, and pure utilities in `shared/`. Do not create an NgModule for new code. Keep the page component smart and pass data into dumb child components through inputs and user actions back through outputs.

Before considering the feature complete, check that its route is reached through `loadComponent` or `loadChildren`, every new component is standalone, global services are not in `shared/`, and local state uses Signals where appropriate.

