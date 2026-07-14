# Placement of shared utilities and global services

Place code according to both reuse and lifetime. A useful default is:

```text
src/app/
  core/
    auth/
    http/
    config/
    logging/
  shared/
    ui/
    directives/
    pipes/
    utilities/
  features/
    orders/
```

Use `shared` for feature-independent presentation and stateless helpers: buttons, form controls, directives, pipes, date/formatting helpers, and pure functions. Shared code should not import a feature or hide application-specific state. If a utility is used by only one feature, keep it inside that feature; this prevents `shared` from becoming a miscellaneous dumping ground.

Use `core` for application-wide infrastructure and policies: authentication/session coordination, HTTP interceptors, logging, error handling, app configuration, and global navigation or layout services. A service intended to have one application-wide instance can commonly use:

```ts
@Injectable({ providedIn: 'root' })
export class AuthService {}
```

Register environment-specific providers in the application configuration, such as `app.config.ts`. For a service that should be isolated to a feature or route tree, prefer route-level `providers` or a feature component provider instead of making it global. That makes its lifetime and state ownership explicit.

Avoid putting stateful services in a shared module merely because many components import the module; that can create confusing provider scopes or duplicate instances. Also avoid making every helper global: global mutable state increases coupling and complicates tests. Keep dependencies flowing from the app shell and feature code toward shared primitives, and do not let `core` or `shared` depend on a concrete feature. This arrangement keeps singleton infrastructure discoverable while preserving lazy-loaded feature boundaries.


