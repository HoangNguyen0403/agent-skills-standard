Use a functional `CanActivateFn`. It can return `true` to allow navigation or a `UrlTree` to redirect; returning a redirect tree is preferable to imperatively calling `navigate` from the guard.

```ts
// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
};
```

Attach it to the lazy-loaded route:

```ts
import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard],
  },
];
```

For role checks, the same pattern can inject an authorization service and return a `UrlTree` such as `/forbidden`. Functional guards keep access-control logic out of the route record and avoid deprecated class-based guard implementations. If the authentication check is asynchronous, return its `Observable` or `Promise` of `boolean | UrlTree`.

