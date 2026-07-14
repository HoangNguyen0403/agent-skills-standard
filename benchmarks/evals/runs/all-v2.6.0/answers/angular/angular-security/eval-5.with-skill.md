# Protecting routes with Angular auth guards

Use a functional `CanActivateFn` and return a `UrlTree` for unauthenticated users instead of imperatively navigating inside the guard:

```typescript
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

Apply it to every sensitive route, including lazy-loaded protected areas:

```typescript
{
  path: 'account',
  canActivate: [authGuard],
  loadComponent: () => import('./account.component').then(m => m.AccountComponent),
}
```

If authentication is asynchronous, return an `Observable<boolean | UrlTree>` or `Promise<boolean | UrlTree>` and fail closed while the session check is unresolved or fails. Add separate role/permission guards where appropriate, but keep authorization checks on the server for every protected API and operation; a browser guard can be bypassed. Do not treat client-side route protection as the security boundary. Use a secure server session, preferably via an `HttpOnly` cookie, and do not put auth tokens in `localStorage` or `sessionStorage`.

