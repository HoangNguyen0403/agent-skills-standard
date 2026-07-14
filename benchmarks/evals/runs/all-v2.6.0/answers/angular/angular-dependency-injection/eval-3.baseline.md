# Scoping a service to a route

Provide the service on the route itself using the route's `providers` property:

```ts
import { Routes } from '@angular/router';
import { AdminSession } from './admin-session.service';

export const routes: Routes = [
  {
    path: 'admin',
    providers: [AdminSession],
    loadComponent: () => import('./admin.component').then(m => m.AdminComponent),
    children: [
      {
        path: 'users',
        loadComponent: () => import('./users.component').then(m => m.UsersComponent),
      },
    ],
  },
];
```

Angular creates an environment injector for that route. `AdminSession` and its dependencies are available to the route component, lazy children, guards, resolvers, and other descendants that resolve through that injector. The same service is not automatically available to unrelated routes. When the route is deactivated, Angular destroys the route injector and the service instance, so `DestroyRef` or `ngOnDestroy` cleanup can be used for route-owned resources.

Do not also mark this service `providedIn: 'root'` if the intent is one instance per route. A root provider would make the root instance available everywhere and could defeat the intended route boundary. It is fine to leave the class decorated with `@Injectable()` and provide it only on the route:

```ts
@Injectable()
export class AdminSession {
  // route-specific state
}
```

If the service is declared with `providedIn: 'root'`, the route provider still creates a route-level override for consumers below that route, but using one ownership model is clearer. A component-level `providers` array is different: it creates an instance per component subtree, not one shared instance for the whole activated route. Also account for a custom `RouteReuseStrategy`; a reused route can keep its injector and service alive longer than a normal deactivation.

