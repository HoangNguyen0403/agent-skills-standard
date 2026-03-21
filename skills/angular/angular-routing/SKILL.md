---
name: angular-routing
description: 'Standards for Angular Router, Lazy Loading, and Guards. Use when configuring Angular routes, lazy-loaded modules, route guards, or resolvers. (triggers: *.routes.ts, angular router, loadComponent, canActivate, resolver)'
---

# Routing

## **Priority: P0 (CRITICAL)**

## Principles

- **Lazy Loading**: All feature routes MUST be **Lazy load all features** with **loadComponent** (standalone) or **loadChildren** (route file).
  - Example: `{ path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) }`.
- **Functional Guards**: Use function-based guards (**CanActivateFn**) instead of class-based guards (**guards are deprecated**).
  - Example: `export const authGuard: CanActivateFn = () => inject(AuthService).isAuthenticated() ? true : inject(Router).createUrlTree(['/login'])`. Register in routes: `{ canActivate: [authGuard] }`.
- **Component Inputs**: Enable **withComponentInputBinding()** in **provideRouter(routes, withComponentInputBinding())** to define **input.required<string>()** in components. Angular **auto-maps route params**, query params, and resolve data to matching inputs.

## Guidelines

- **Title Strategy**: Provide a custom **TitleStrategy** service (extending `TitleStrategy` and overriding **updateTitle(snapshot)**) or use simple **title: 'Dashboard'** in route data.
- **Resolvers**: Create a **ResolveFn<User>** (e.g., **inject(UserService).getUser(route.paramMap.get('id'))**) to pre-fetch critical data before navigation completes (**resolve: { user: userResolver }**). Avoid blocking UI too long.

## Anti-Patterns

- **No logic in route config**: **no logic inside route config**. Move **guards for access control** and data fetching to dedicated Guards and Resolvers.
- **No eager feature imports**: Use `loadComponent` or `loadChildren` for all feature routes.

## References

- [Routing Patterns](references/routing-patterns.md)
