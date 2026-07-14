For an authentication service used across the application, make it a tree-shakable root singleton:

```ts
// auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem('access_token'));
  }

  refreshSession() {
    return this.http.get('/api/auth/session');
  }

  logout(): void {
    localStorage.removeItem('access_token');
  }
}
```

With `providedIn: 'root'`, Angular registers the service with the application root injector and tree-shakes it when unused. You normally do not need to add `AuthService` manually to a component or `app.config.ts` providers array. In a standalone application, provide its dependencies functionally, for example:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};
```

Avoid listing `AuthService` in a component’s `providers`; that would create a second instance and can split authentication state. Use route providers only if the service is deliberately route-scoped. Prefer root scope over `providedIn: 'platform'` for ordinary application authentication, and refactor dependency cycles instead of introducing `forwardRef`.

