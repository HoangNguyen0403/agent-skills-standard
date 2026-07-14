Configure a `title` on each route:

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'home', component: HomeComponent, title: 'Home' },
  { path: 'about', component: AboutComponent, title: 'About Us' },
];
```

Angular Router’s default `TitleStrategy` updates `document.title` when navigation completes. Ensure the router is configured normally:

```ts
provideRouter(routes)
```

For dynamic titles, use a route resolver:

```ts
{
  path: 'users/:id',
  component: UserComponent,
  resolve: { user: userResolver },
  title: userTitleResolver,
}
```

```ts
export const userTitleResolver: ResolveFn<string> = route => {
  const user = inject(UserService).getById(route.paramMap.get('id')!);
  return `${user.name} | Users`;
};
```

For a global format such as `Page | My App`, provide a custom `TitleStrategy` by extending Angular’s `TitleStrategy`.
