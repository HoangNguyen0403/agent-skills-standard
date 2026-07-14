# Protecting routes with Angular auth guards

Create an authentication service that exposes the current auth state, then use a functional guard that returns a `UrlTree` when the user is not signed in:

```ts
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

Register it on the protected route or route group:

```ts
{
  path: 'admin',
  canActivate: [authGuard],
  loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
}
```

If authentication is asynchronous, return the service's `Observable<boolean | UrlTree>` or `Promise<boolean | UrlTree>` and ensure it represents the restored session state, not a transient “unknown” state. Use `CanMatch` when deciding whether a lazy route should match, but do not rely on it as a security boundary. A guard only controls client-side navigation: users can call APIs directly, alter browser code, or bypass the UI. Every backend endpoint must independently authenticate the request and authorize the user, role, tenant, and resource.

For role-based routes, obtain the required role from route data and check it in the guard, while repeating the same authorization decision on the server. Prefer returning a `UrlTree` over returning `false` and navigating separately, preserve only a validated internal return path, and avoid placing access tokens or sensitive authorization decisions in route parameters.

