Use `inject()` from `@angular/core` to resolve a dependency from the current Angular injection context. The usual location is a class field initializer:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  getUser(id: string) {
    return this.http.get('/api/users/' + id);
  }
}
```

`inject()` is the constructor-equivalent style recommended for services, components, guards, resolvers, and factory functions. It returns the instance from the active injector, so the dependency still needs a provider. For application-wide services, use a tree-shakable provider such as `@Injectable({ providedIn: 'root' })`.

It also works directly in functional router APIs:

```ts
export const authGuard: CanActivateFn = () =>
  inject(AuthService).isAuthenticated();
```

Do not call `inject()` from an arbitrary method or asynchronous callback after the injection context has ended; that causes a “no injection context” error. For an optional dependency, use `inject(Token, { optional: true })`. If code genuinely needs to execute outside a class, guard, or factory, run it explicitly with `runInInjectionContext()` and an `EnvironmentInjector`.

