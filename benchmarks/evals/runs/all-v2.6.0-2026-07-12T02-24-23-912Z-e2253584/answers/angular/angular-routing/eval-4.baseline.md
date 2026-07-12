# Structuring `app.routes.ts`

Keep the application route file as a readable top-level map: define redirects first, group feature routes under a meaningful prefix, lazy-load larger features, and put the wildcard fallback last.

```ts
// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'home',
    title: 'Home',
    loadComponent: () =>
      import('./home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'products',
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./products/product-list.component').then(m => m.ProductListComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./products/product-detail.component').then(m => m.ProductDetailComponent),
      },
    ],
  },
  {
    path: 'admin',
    canMatch: [authGuard],
    loadChildren: () =>
      import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: 'home' },
];
```

Provide it once at the application boundary:

```ts
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)],
});
```

The root component template needs a `RouterOutlet` (and the standalone component must import it):

```html
<router-outlet />
```

Use `loadComponent` for standalone pages and `loadChildren` for a feature route file or an NgModule. A feature route file should export a `Routes` value, for example `export const ADMIN_ROUTES: Routes = [...]`, and should own the routes below its prefix.

Important ordering and design details:

- Put specific static paths before parameter routes such as `:id`, and keep `**` last.
- Use `pathMatch: 'full'` for an empty-path redirect; without it, an empty prefix can match too broadly.
- Put guards, resolvers, and route metadata on the route that owns the behavior.
- Keep unrelated feature definitions out of this file as the application grows; split them into lazy feature route files.
- Use child routes only when the parent component renders a child `<router-outlet>`; otherwise prefer sibling routes.

