# Structuring a lazily loaded Angular feature

Treat the feature as a vertical slice with its own route boundary. Keep its page components, child components, data-access code, models, and tests together rather than scattering them into global `components`, `services`, and `models` folders.

For a standalone Angular application, a typical structure is:

```text
src/app/
  app.routes.ts
  core/                 # application-wide infrastructure
  shared/               # reusable UI and stateless helpers
  orders/
    orders.routes.ts
    pages/
      order-list-page.component.ts
      order-detail-page.component.ts
    ui/
      order-table.component.ts
    data-access/
      orders.api.ts
      orders.store.ts
    models/
    *.spec.ts
```

Expose the feature through a lazy route in the application shell:

```ts
// app.routes.ts
export const routes: Routes = [
  {
    path: 'orders',
    loadChildren: () =>
      import('./orders/orders.routes').then(m => m.ORDERS_ROUTES),
  },
];
```

Define the feature's page and child routes inside that feature:

```ts
// orders/orders.routes.ts
export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/order-list-page.component')
        .then(m => m.OrderListPageComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/order-detail-page.component')
        .then(m => m.OrderDetailPageComponent),
  },
];
```

The lazy boundary should not be defeated by eagerly importing those page components or their feature-only dependencies from the root application. Keep feature-specific services provided in the feature route when they should have one instance for that route tree:

```ts
{
  path: 'orders',
  providers: [OrdersStore],
  loadChildren: () => import('./orders/orders.routes').then(m => m.ORDERS_ROUTES),
}
```

Put authentication checks, `canMatch`/`canActivate` guards, resolvers, and route metadata at the route boundary when they control access or loading. Keep cross-cutting infrastructure in `core`, and only put genuinely reusable, feature-independent pieces in `shared`. This gives each feature a clear ownership boundary, improves initial-load performance, and makes the feature easier to test or remove later.


