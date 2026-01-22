# Routing Patterns

## Lazy Loading & Functional Guards

```typescript
export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [adminGuard],
  },
];
```

## Component Input Binding

Enable in `app.config.ts`:

```typescript
provideRouter(routes, withComponentInputBinding());
```

Usage in Component:

```typescript
@Component({...})
export class HeroComponent {
  // Automatically populated from route param :id
  id = input<string>();

  // From query param ?search=...
  search = input<string>();
}
```

## Functional Guard

```typescript
export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAdmin() ? true : router.createUrlTree(['/login']);
};
```
