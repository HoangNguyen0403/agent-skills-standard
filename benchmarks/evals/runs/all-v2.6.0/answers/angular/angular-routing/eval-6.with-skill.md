Use the route’s `title` property. Angular’s default `TitleStrategy` updates `document.title` automatically.

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    title: 'Dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component')
        .then(m => m.DashboardComponent),
  },
];
```

Configure the router:

```ts
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
  ],
});
```

For dynamic titles, use a `ResolveFn<string>`:

```ts
export const userTitleResolver: ResolveFn<string> = route => {
  const users = inject(UserService);
  return users.get(route.paramMap.get('id')!).pipe(
    map(user => `User: ${user.name}`)
  );
};

export const routes: Routes = [
  {
    path: 'users/:id',
    title: userTitleResolver,
    resolve: { user: userResolver },
    loadComponent: () =>
      import('./user/user.component').then(m => m.UserComponent),
  },
];
```

Keep title logic out of the route config; place it in a resolver. For application-wide formatting, provide a custom `TitleStrategy` extending `DefaultTitleStrategy`. Avoid deprecated class-based guards when adding route protection.
