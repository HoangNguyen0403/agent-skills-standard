Use a functional guard with `CanActivateFn`:

```ts
// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login']);
};
```

Register it on the route:

```ts
// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./dashboard/dashboard.component')
        .then(m => m.DashboardComponent),
  },
  { path: 'login', component: LoginComponent },
];
```

Return `true` to allow navigation, `false` to cancel it, or a `UrlTree` to redirect. Returning a `UrlTree` is preferred over calling `router.navigate()` inside the guard.
