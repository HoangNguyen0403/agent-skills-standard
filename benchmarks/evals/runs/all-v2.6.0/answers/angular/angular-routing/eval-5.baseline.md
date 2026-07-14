Assuming Angular Router, use a `ResolveFn` in the route’s `resolve` configuration. Navigation waits for the resolver’s `Observable` or `Promise` to complete.

```ts
// user.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { UserService } from './user.service';
import { User } from './user';

export const userResolver: ResolveFn<User> = (route) => {
  const userService = inject(UserService);
  return userService.getUser(route.paramMap.get('id')!);
};
```

Register it on the route:

```ts
import { Routes } from '@angular/router';
import { userResolver } from './user.resolver';

export const routes: Routes = [
  {
    path: 'users/:id',
    component: UserDetailComponent,
    resolve: {
      user: userResolver,
    },
  },
];
```

Read the prefetched data from `ActivatedRoute`:

```ts
import { ActivatedRoute } from '@angular/router';

export class UserDetailComponent {
  readonly user = this.route.snapshot.data['user'];

  constructor(private route: ActivatedRoute) {}
}
```

The router fetches the user before creating `UserDetailComponent`. If the resolver errors, navigation is cancelled unless you catch and handle the error inside the resolver.
