# Route guards in Angular

For current standalone Angular applications, a functional guard is usually the simplest form. Return `true` to allow navigation, or return a `UrlTree`/`RedirectCommand` to redirect. Do not call `router.navigate()` inside the guard and then return `false`; return the redirect as the guard result instead.

```ts
// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
};
```

Attach it to a route:

```ts
export const routes: Routes = [
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./account/account.component').then(m => m.AccountComponent),
  },
];
```

The guard may also return a `Promise` or `Observable` of one of those values, which is useful when authentication state must be refreshed. Let the observable complete, and avoid manually subscribing in the guard:

```ts
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.user$.pipe(
    map(user => user?.isAdmin === true
      ? true
      : router.createUrlTree(['/forbidden']))
  );
};
```

Use `canActivate` when a matched route should be blocked before activation. Use `canMatch` on a lazy route when the route should not be selected for a user who lacks access; Angular can then try another matching route. Guards can also be applied to child routes with `canActivateChild`, and to lazy module loading with `canLoad` in older/module-based code.

A guard is a client-side navigation control, not an authorization boundary. Every protected API and server-side resource must independently authenticate the caller and enforce permissions.

