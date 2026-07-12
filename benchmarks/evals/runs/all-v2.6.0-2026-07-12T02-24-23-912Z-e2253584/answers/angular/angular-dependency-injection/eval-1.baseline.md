# Using `inject()` in Angular

`inject()` asks Angular's dependency-injection system for a token and returns the matching instance. It is useful in standalone components, services, guards, interceptors, resolvers, provider factories, and other functions that run in an Angular injection context.

```ts
import { Component, inject } from '@angular/core';
import { UserService } from './user.service';

@Component({
  standalone: true,
  template: `{{ userService.currentUser()?.name }}`,
})
export class ProfileComponent {
  // The field initializer runs while Angular is constructing the component.
  protected readonly userService = inject(UserService);
}
```

It can also be used in a functional guard or provider factory:

```ts
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() || router.createUrlTree(['/login']);
};

export const apiUrlProvider = {
  provide: API_URL,
  useFactory: () => inject(EnvironmentConfig).apiUrl,
};
```

The call must happen synchronously while Angular has an active injection context—for example, during construction/field initialization, a provider factory, a functional guard, or inside `runInInjectionContext`. Calling it later from a click handler, timer, or ordinary utility function causes `NG0203: inject() must be called from an injection context`. Capture the dependency in a field or closure, or explicitly run the function with an `EnvironmentInjector` when deferred execution is required.

Optional lookup and injector-boundary behavior can be controlled with options:

```ts
const analytics = inject(AnalyticsService, { optional: true });
const parentConfig = inject(Config, { skipSelf: true });
```

Use `TestBed.runInInjectionContext()` in tests when testing a function that calls `inject()`. Prefer `inject()` for functional APIs and field-based dependencies; constructor injection remains equally valid and is often clearer when a class's dependencies are part of its public construction contract.

