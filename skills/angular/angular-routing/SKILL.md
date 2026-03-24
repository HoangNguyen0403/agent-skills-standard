---
name: angular-routing
description: "Configure Angular Router with lazy-loaded routes, functional guards, and component input binding. Use when defining routes, lazy-loading features, creating route guards, or setting up resolvers. (triggers: *.routes.ts, angular router, loadComponent, canActivate, resolver)"
---

# Routing

## **Priority: P0 (CRITICAL)**

## 1. Lazy Load All Feature Routes

- Use `loadComponent` (standalone) or `loadChildren` (route file) for every feature route.

```typescript
export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(m => m.DashboardComponent),
    canActivate: [authGuard],
    title: 'Dashboard'
  }
];
```

## 2. Use Functional Guards

- Create function-based guards (`CanActivateFn`) instead of deprecated class-based guards.

```typescript
export const authGuard: CanActivateFn = () =>
  inject(AuthService).isAuthenticated()
    ? true
    : inject(Router).createUrlTree(['/login']);
```

## 3. Enable Component Input Binding

- Configure `withComponentInputBinding()` in `provideRouter(routes, withComponentInputBinding())`.
- Define `input.required<string>()` in components — Angular auto-maps route params, query params, and resolve data.

## 4. Configure Resolvers and Titles

- Create `ResolveFn<T>` to pre-fetch critical data before navigation.
- Provide a custom `TitleStrategy` or use `title: 'Dashboard'` in route data.

## Anti-Patterns

- **No logic in route config**: Move access control and data fetching to dedicated Guards and Resolvers.
- **No eager feature imports**: Use `loadComponent` or `loadChildren` for all feature routes.

## References

- [Routing Patterns](references/routing-patterns.md)
