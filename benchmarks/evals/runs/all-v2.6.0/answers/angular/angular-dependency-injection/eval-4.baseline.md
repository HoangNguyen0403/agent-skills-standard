# Providing an authentication service

An authentication service is normally application-wide state, so provide it as a tree-shakable root singleton:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  isLoggedIn(): boolean {
    // Read the current auth state or token from the chosen auth mechanism.
    return true;
  }
}
```

With this declaration, Angular registers the service in the root injector when it is used; it does not need to be added to a component's `providers` array or, in a standalone application, to `app.config.ts`. The root scope prevents separate auth state in each component and allows guards, interceptors, and unrelated components to share the same instance.

If the service is supplied by another class or implementation, register an explicit provider at the application boundary instead:

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: AuthService, useClass: BrowserAuthService },
  ],
};
```

Use a component or route `providers` array only when a deliberately isolated auth context is required. Adding `AuthService` there creates a new instance for that injector subtree and can cause surprising login/logout divergence. Similarly, avoid a lazy-route-only provider for auth state that must be shared by the entire application. In tests, configure the service through `TestBed` and replace it with a fake using `useValue`, `useClass`, or `TestBed.overrideProvider`.

